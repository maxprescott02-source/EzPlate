/*
 * parser-corpus.test.js — THE REGRESSION NET FOR THE INVOICE PARSER, and the thing that replaced
 * CLAUDE.md's "never edit anything inside the parser region" rule when Max lifted it on 10 Sep 2026.
 *
 * WHY IT EXISTS, which is the part that matters more than what it asserts.
 * The protection was written because the parser had no way to be checked except by hand, on one
 * invoice. It did its job — four batches wanted to edit the region and solved outside it instead —
 * and the bill arrived on 8 Sep 2026: the region had been tuned to ONE supplier's layout for months
 * while the cafe's OTHER weekly supplier's invoices were coming out wrong on **every line**, and
 * nothing could notice, because nothing measured it. A rule that stops edits does not measure
 * anything. This file does.
 *
 * WHAT IT DOES. `tests/parser-corpus/run.js` slices the REAL parser out of `js/app.js` (the same
 * cutting `tests/_extract.js` uses — no stubs of parser logic, ever) and runs it over fourteen
 * synthetic invoice layouts with hand-written truth: a foodservice distributor in each of the two
 * common shapes, fruit and veg, catch-weight smallgoods, Xero, MYOB, Square, a supermarket receipt,
 * a credit note, a page break mid-table, freight and rounding lines, quantity-first cartons,
 * trailing net-weight columns, and a CSV paste.
 *
 * ⚠️ THE TWO NUMBERS BELOW ARE THE ONLY ONES WORTH ASSERTING, and they are not "how many did we get
 * right". They are:
 *
 *   SILENT-WRONG — a wrong price the app would STORE with no flag, so nothing on any screen can
 *                  notice. This is the entire defect class this corpus was built for. Zero.
 *   UNFLAGGED LEAK — a line the truth says is not a product (a fuel levy, a credit line, a totals
 *                  row) that became a priced row nobody is asked about. Zero.
 *
 * A wrong-but-FLAGGED line is not a failure here. It is a human being asked, which is the correct
 * behaviour when the parser cannot add the line up — and pushing that number to zero by guessing is
 * exactly how the defect this file exists for was created.
 *
 * ⚠️ IF YOU EDIT THE PARSER AND THIS GOES RED, THE PARSER IS WRONG — not this file. Run
 * `node tests/parser-corpus/run.js --verbose` to see which line, and
 * `node tests/parser-corpus/run.js --products tests/fixtures/base-products.json` for what the
 * review screen would have pre-ticked against the cafe's own catalogue. Put both numbers in the
 * handover of any batch that touches the region: that is the third of the three mechanisms the
 * audit put in place of the rule (this corpus, the mutation gate, the per-batch numbers).
 *
 * ⚠️ AND THE HONEST LIMIT: these fourteen are INVENTED. The REAL corpus — six real invoices whose
 * truth is committed at `spike/parser-audit/real-truth/` and whose extracted text deliberately is
 * NOT, because it carries the cafe's own details and this repository is public — cannot run from
 * inside the repo. Consolidated item 37 is where that lives. So a green run here means "no layout
 * in the synthetic set regressed", never "the real invoices are right".
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { buildSandbox, scoreCase, findCases } = require('./parser-corpus/run.js');

const CASES = findCases(path.join(__dirname, 'parser-corpus', 'fixtures'));

/* The residuals, allowed BY NAME AND BY LINE — never by case, because allowing a whole case would
   let a NEW silent-wrong line hide behind an old one. Both are recorded in PARSER-AUDIT §9 with the
   decision each needs; neither is a bug this batch declined to fix out of laziness.

   fake-04  Units versus weight with no unit word: "1.5kg 2 3.00 9.80 29.40" — the 3.00 is kilograms
            and the 2 is packs, and only the COLUMN HEADER says so. Fixing it properly means a
            header-driven column model, which is the next thing this harness should be used to build.
   fake-11  A container capacity beside a bare count ("TAKEAWAY CONTAINER 750ML 500S"): the weight
            wins. Making the bare NNNs count beat the weight fixes this one and BREAKS the reading
            tests/inv-chain.test.js pins for "CHEESE SLICES TASTY 105S 1.5KG". That is a decision
            about which real case wins, not a defect with an obvious fix; both are in the fixtures. */
const ALLOWED_SILENT_WRONG = [
  ['fake-04-smallgoods-catch-weight', 'PORK SAUSAGES 1.5kg x2 = 3.00kg, 9.80/kg'],
  ['fake-11-freight-rounding', 'CONTAINER 750ML 500S x1 at 88.00']
].map(([c, d]) => c + ' :: ' + d);

test('the corpus itself loaded — fourteen cases, or this whole file proves nothing', () => {
  // Roster 205: a suite that scores an EMPTY case list reports zero silent-wrong and passes forever.
  assert.equal(CASES.length, 14, 'a missing .txt or .truth.json silently drops a case from findCases');
});

test('NO SILENT-WRONG PRICE on any synthetic layout, bar the two named residuals', () => {
  const sb = buildSandbox();
  const unexpected = [];
  const allowedSeen = [];
  for (const cs of CASES) {
    const r = scoreCase(sb, cs, { products: null });
    for (const l of r.lines) {
      if (l.verdict !== 'silent-wrong') continue;
      const key = r.name + ' :: ' + l.desc;
      (ALLOWED_SILENT_WRONG.includes(key) ? allowedSeen : unexpected).push(
        `${key}  want ${(l.expect || []).map(a => a.price.toFixed(4) + '/' + a.unit).join(' | ') || 'manual'}` +
        `  got ${l.got && l.got.unitPrice != null ? l.got.unitPrice.toFixed(4) : 'null'}/${l.got && l.got.unit}`);
    }
  }
  assert.deepEqual(unexpected, [],
    'a price the app would STORE with no flag — the defect class this corpus exists for');
  // An allowance that has stopped firing is a stale allowance, and a stale allowance is a hole
  // somebody will one day fall through. The gate's own rule (tests/mutation/targets.js) is the same.
  assert.equal(allowedSeen.length, ALLOWED_SILENT_WRONG.length,
    'a named residual no longer reproduces: delete it from ALLOWED_SILENT_WRONG in this file');
});

test('NO UNFLAGGED LEAK: a levy, a credit line or a totals row never becomes a silent priced row', () => {
  const sb = buildSandbox();
  const leaked = [];
  for (const cs of CASES) {
    const r = scoreCase(sb, cs, { products: null });
    r.leaks.filter(l => !l.flagged).forEach(l => leaked.push(`${r.name} :: ${l.needle} -> ${l.unitPrice}/${l.unit}`));
  }
  assert.deepEqual(leaked, [],
    'a non-product line priced with nothing raised — the credit note that read as a purchase');
});

test('the corpus is mostly RIGHT, not merely mostly flagged', () => {
  /* Without this, the two assertions above are trivially satisfiable by making every row manual —
     which is safe, useless, and would read as a pass. The floor is a floor: it is deliberately
     below today's score so an ordinary honest trade-off does not go red, and far above the 30 the
     shipped parser managed, so the defect cannot come back wholesale. */
  const sb = buildSandbox();
  let right = 0, total = 0;
  for (const cs of CASES) {
    const t = scoreCase(sb, cs, { products: null }).tally;
    right += t.right; total += t.total;
  }
  assert.equal(total, 66, 'the truth files hold 66 scored lines');
  assert.ok(right >= 60, `only ${right} of ${total} lines priced right and unflagged (was 30 before batch 256)`);
});
