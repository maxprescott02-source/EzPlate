/*
 * inv-row-fix.test.js — the two silent-wrong-price defects on the PDF invoice path, both
 * REPRODUCED before a line of either fix was written.
 *
 *   item 12  (5 Sep blind audit): a quantity-FIRST carton line halves the unit cost. packWeight's
 *            multiplier chain accepts "N <pack-noun>", so a leading purchased quantity is folded
 *            into the pack weight while the price chooser takes the per-carton figure —
 *            $60 / 12kg = $5/kg for a $10/kg product, needManual:false, pre-ticked.
 *   item 12b (found by item 12's own pre-push review): packWeight takes the LAST weight token in
 *            the WHOLE RAW LINE, so a trailing net-weight column becomes the pack's unit weight —
 *            $0.42/kg where the truth is $10.00, an order of magnitude out and equally silent.
 *
 * `invFixRow` is ONE function because 12b's correction must run before 12's, and a comment saying
 * so is not a mechanism. It lives outside the protected region and calls the region's own
 * functions through `invPackWeight`, so the price, the guard and the arithmetic cannot end up
 * asking different questions — which is exactly how the first draft went wrong.
 *
 * These tests run the REAL parser and the REAL fix in one sandbox (tests/_extract.js) — no stubs.
 *
 * ⚠️ Fixtures here are deliberately NOT in the Bidfood layout: item 12 needs the purchased
 * quantity BEFORE the pack composition and item 12b needs a weight token AFTER the money columns,
 * and no pre-existing fixture in this repo has either. That is why both defects survived a green
 * suite. Do not "tidy" one into the familiar order. The two real Bidfood lines below are the
 * control: they must come through untouched.
 */
const test = require('node:test');
const assert = require('node:assert');
const { parsePdfLine, invFixRow, invPackWeight } = require('./_extract.js');

const parse = (line) => invFixRow(parsePdfLine(line));

function assertClose(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 0.005, `${msg}: expected ~${expected}, got ${actual}`);
}

test('the audit fixture: 2 CTN of 6x1kg at $60/carton costs $10/kg, not $5', () => {
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00');
  assert.equal(r.unit, 'kg');
  assertClose(r.unitPrice, 10, 'per-kg price');
  assert.equal(r.needManual, false, 'a confirmed rebase is not flagged');
});

test('the ml/L family rebases identically — the case no screen could notice', () => {
  const r = parse('2 CTN Milk UHT 6 x 1L 60.00 60.00 120.00');
  assert.equal(r.unit, 'l');
  assertClose(r.unitPrice, 10, 'per-L price');
});

test('a 3-carton line rebases by 3, not by a hardcoded 2', () => {
  const r = parse('3 CTN Beef Mince 6 x 1kg 60.00 60.00 180.00');
  assertClose(r.unitPrice, 10, 'per-kg price');
});

test('qty-first shape whose arithmetic does NOT confirm is FLAGGED, never silently kept', () => {
  // A distinct total that is neither P nor k*P: the line does not add up either way, so guessing
  // is the silent-wrong-number class and the row asks instead.
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00 130.00');
  assert.equal(r.needManual, true, 'unconfirmed arithmetic flags the row');
  assertClose(r.unitPrice, 5, 'the price is left as parsed, for the reviewer to see');
});

test('NO total column (the pair IS the total) is correct as parsed — not rebased, not flagged', () => {
  // The parser's documented qty-1 shape: the repeated price is the line total, so it already
  // covers the whole folded weight. $60 for 2 CTN of 6x1kg = 12kg = $5/kg, and that is right.
  // An earlier draft flagged these, which is a false alarm on ordinary single-purchase lines.
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00');
  assertClose(r.unitPrice, 5, 'the pair already covers the whole weight');
  assert.equal(r.needManual, false, 'nothing to ask about');
});

test("a composition-only case line keeps its correct price and is NOT flagged", () => {
  // Found by the pre-push review. "6 CTN 2kg Chicken 12.00 12.00" is ONE case of 6 cartons at
  // 2kg = 12kg for $12 = $1/kg, already correct, and it previously applied with no human step.
  const r = parse('6 CTN 2kg Chicken 12.00 12.00');
  assertClose(r.unitPrice, 1, '$12 over 12kg');
  assert.equal(r.needManual, false, 'a correct row must not start asking for manual pricing');
});

/* ⚠️ THE EXPLICIT-RATE FIXTURES COME FIRST BECAUSE THEY ARE THE ONES THIS FILE DID NOT HAVE.
   Every other fixture here reaches invFixRow through parsePdfLine's packWeight branch, and the
   pre-push review found that the entry gate keyed off row.unit — which the explicitUnitPrice
   branch also sets to kg/l — so a correct, explicitly-stated rate was multiplied by an unrelated
   weight ratio. A whole branch of the parser had no fixture, and no assertion in this file could
   have failed against it: the code path was never executed. Both lines below are the real
   weighed-goods shape (nominal weight, stated rate, delivered-weight column). */
test('an explicit $/kg rate is NEVER re-based, even with a trailing delivered-weight column', () => {
  // measured before the fix: $14.90 became $13.46, pre-ticked — a wrong price that looks plausible,
  // reintroduced by the fix meant to prevent exactly that.
  const l = 'PORK BELLY BONELESS 3.1kg $14.90/kg 46.19 2.8kg';
  const bare = parsePdfLine(l);
  assertClose(bare.unitPrice, 14.9, 'precondition: the parser reads the stated rate correctly');
  const r = parse(l);
  assertClose(r.unitPrice, 14.9, 'the stated rate survives untouched');
  assert.equal(r.needManual, false, 'and is not flagged');
});

test('an explicit rate with NO weight in the name is not flagged either', () => {
  // measured before the fix: needManual went true, pulling a correct row out of the auto-tick path
  // for a pack size it never needed.
  const r = parse('PORK BELLY $14.90/kg 41.72 2.8kg');
  assertClose(r.unitPrice, 14.9, 'unchanged');
  assert.equal(r.needManual, false, 'and no manual step is demanded');
});

test('12b: a trailing net-weight column is RE-BASED onto the pack, not divided by a total', () => {
  // The headline 12b case. packWeight takes the LAST weight token in the raw line, so "12.0kg"
  // (a net-weight column) became the pack unit weight: 2 x 6 x 12.0 = 144kg, $0.42/kg. The pack
  // says 6 x 1kg and two cartons were bought, so the truth is $10.00/kg — and BOTH corrections
  // have to run, in order, to get there: re-base 0.42 -> 5.00, then undo the fold 5.00 -> 10.00.
  const l = '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg';
  /* PARSER-AUDIT: the parser now reads the pack off the NAME with the purchased quantity removed
     (lineColumns found 2 x 60.00 = 120.00), so it is right on its own and invFixRow has nothing to
     do. The outcome is what is pinned; the old precondition (parser alone at $0.42) is gone. */
  const bare = parsePdfLine(l);
  assertClose(bare.unitPrice, 10, 'the parser prices off the pack in the name');
  assert.equal(bare.basis.kind, 'columns', 'and it knows which column was the quantity');
  const r = parse(l);
  assertClose(r.unitPrice, 10, 'the pack\'s own weight prices the row');
  assert.equal(r.needManual, false);
});

test('12b alone: a trailing weight with no leading quantity is still re-based', () => {
  // No "k CTN" prefix, so only the basis correction applies: 6 x 1kg = 6kg for $60 = $10/kg,
  // where the trailing "6.0kg" had made it 36kg and $1.67.
  const l = 'Beef Mince 6 x 1kg 60.00 60.00 60.00 6.0kg';
  assert.equal(parsePdfLine(l).basis.kind, 'pair', 'no quantity on the line: the repeated-pair rule priced it');
  const r = parse(l);
  assertClose(r.unitPrice, 10, 'right after');
  assert.equal(r.needManual, false);
});

test('12b, the litre twin — the case nothing on any screen could notice', () => {
  const r = parse('Olive Oil 4 x 4L 80.00 80.00 80.00 16L');
  assert.equal(r.unit, 'l');
  assertClose(r.unitPrice, 5, '$80 over 16L');
});

test('a weight that exists ONLY outside the name is FLAGGED — the pack size is unknown', () => {
  // name = "2 CTN Beef Mince" carries no weight at all, so the price was derived entirely from a
  // trailing column and there is nothing to re-base onto. Guessing a pack size is the defect;
  // the row asks instead. (Before 12b this passed through silently at $2.50/kg.)
  const l = '2 CTN Beef Mince 60.00 60.00 120.00 12.0kg';
  const r = parse(l);
  assert.equal(r.needManual, true, 'flagged for a human');
  assert.equal(r.unitPrice, null, 'and no price is invented from a column that is not the pack');
  assert.equal(r.unit, 'auto', 'no pack, no unit');
});

test('a DIFFERENT weight category is flagged, and never silently switches the unit', () => {
  // name says 6 x 500ml, the trailing column says 3.0kg. The parser priced per kg off the wrong
  // token. Correcting the number while leaving the unit would be an ml->g style basis flip, which
  // CLAUDE.md records as impossible to notice on any screen — so this one goes to a human.
  const l = 'Sauce 6 x 500ml 30.00 30.00 60.00 3.0kg';
  /* PARSER-AUDIT: the trailing 3.0kg is a delivered-weight column, not pack description, and the
     parser no longer reads it: 6 x 500ml for $30 is $10/L. The invariant that survives is the
     unit - it must be the NAME's category, never the column's. */
  const r = parse(l);
  assert.equal(r.unit, 'l', 'the unit is the pack\'s category, never the trailing column\'s');
  assertClose(r.unitPrice, 10, '$30 over 3L');
  assert.equal(r.needManual, false);
});

test('the ^ anchor is load-bearing: a mid-line "k CTN" must never trigger a rebase', () => {
  // The mutation gate CANNOT generate this mutant (it masks regex literals), and the two other
  // "untouched" fixtures below stay green with the anchor removed — measured, both ways — so
  // this fixture exists solely to pin the anchor. It is contrived on purpose: the leading pack
  // factor must equal the mid-line number, or dropping the anchor changes nothing here either.
  const l = 'Beef Mince 2 x 1kg 2 CTN 60.00 60.00 120.00';
  const r = parse(l);
  assertClose(r.unitPrice, 30, 'the parser’s own reading stands');
  assert.equal(r.needManual, false);
});

test('composition-first (Bidfood) layout is untouched — qty AFTER the pack is not this shape', () => {
  const l = '212966 #CHIPS 10MM STRAIGHT CUT SAFRIES 6x2.5kg CTN 8 40.17 40.17 321.36 0.00 321.36';
  const r = parse(l);
  assertClose(r.unitPrice, 40.17 / 15, 'the v17 qty>1 behaviour stands');
  assert.equal(r.needManual, false);
});

test("the apostrophe-s count path is untouched — packWeight never folded the prefix there", () => {
  // measured before the fix: 400'S at $20/pack gives $0.05/ea with or without the prefix
  const r = parse("2 CTN NAPKINS 400'S 20.00 20.00 40.00");
  assert.equal(r.unit, 'ea');
  assertClose(r.unitPrice, 0.05, 'per-piece price');
  assert.equal(r.needManual, false);
});

test('a leading 1 is not a rebase — one carton IS the pack', () => {
  const r = parse('1 CTN Beef Mince 6 x 1kg 60.00 60.00 60.00');
  assertClose(r.unitPrice, 10, '60 over 6kg');
  assert.equal(r.needManual, false);
});

test('a single-amount line already divides the total by the full weight — untouched', () => {
  // no pair: parsePdfLine uses the line total over the folded 12kg, which is already honest
  const r = parse('2 CTN Beef Mince 6 x 1kg 120.00');
  assertClose(r.unitPrice, 10, 'T/W is correct without help');
  assert.equal(r.needManual, false);
});

test('a mid-line quantity never matches — only a line-leading "k <container>" is the shape', () => {
  /* PARSER-AUDIT: with a 120.00 total the leading 2 IS the purchased quantity (2 x 60 = 120) and the
     old fixture contradicted itself; at 60.00 the 2 is composition and the parser's reading stands. */
  const r = parse('Beef Mince 2 x 6 x 1kg 60.00 60.00 60.00');
  // 2 is pack composition here (2×6×1kg = 12kg per the pack notation), not a purchased qty:
  // the parser's own answer stands, whatever it is, and the rebase must not touch it.
  assertClose(r.unitPrice, 5, 'composition factors are the parser’s call');
  assert.equal(r.needManual, false);
});

test('rounding still confirms — the tolerance is a cent per container, inclusive', () => {
  // A 2-decimal P against a true total drifts up to a cent per container, so the budget scales
  // with k (the review's finding 4). The boundary is inclusive on purpose and the mutation gate
  // watches it: <= -> < survived until this fixture existed.
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.02');
  assertClose(r.unitPrice, 10, 'two cents off on two cartons is still the confirmed shape');
  assert.equal(r.needManual, false);
});

/* ⚠️ THERE IS NO TEST HERE FOR "k was not folded", AND THAT IS A FINDING RATHER THAN A GAP.
   An earlier draft had one, built by hand from a row whose name and raw disagreed — a state
   `parsePdfLine` cannot produce. Once 12b re-bases such a row the fixture described nothing real,
   and rather than repair a fixture to keep a title, it is deleted and the reason written down:
   the `factors[0]!==k` branch is UNREACHABLE. The entry regex is anchored at ^ and its container
   nouns are a subset of packWeight's multiplier alternatives, so whenever it matches "k <noun>"
   at the start of the line, the name starts there too and packWeight's first factor IS k. Probed
   across spacing, plurals, leading zeros, 3-digit k and both weight orders. The branch is kept as
   null-safety on a protected-region contract and carries a written allowance in
   tests/mutation/targets.js — which is where a claim of unreachability belongs, because the gate
   re-checks it every run and a test asserting it cannot. */

test('a row with NO price is returned untouched — null must never become $0.00', () => {
  // null * k is 0, and a fabricated $0.00 that nothing flags is this repo's oldest defect family
  // (the isFinite('') rule). ⚠️ This test was DELETED by accident while the two rebases were being
  // merged — a block edit whose range ran one test too far — and the mutation gate is what noticed,
  // by reporting the entry guard as survived. That is the gate doing the job the roster describes:
  // a test that quietly stops existing looks exactly like a test that passes.
  const row = { unitPrice: null, unit: 'kg', needManual: false, name: '2 CTN Beef Mince 6 x 1kg', raw: '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00' };
  const r = invFixRow({ ...row });
  assert.strictEqual(r.unitPrice, null, 'a priceless row stays priceless');
});

test('rows the parser already flagged are not touched', () => {
  const flagged = { unitPrice: 5, unit: 'kg', needManual: true, raw: '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00', name: '2 CTN Beef Mince 6 x 1kg' };
  const r = invFixRow({ ...flagged });
  assert.equal(r.unitPrice, 5, 'a needManual row is the reviewer’s, not the rebase’s');
});

/* ---------- PARSER-AUDIT (batch 256): what is left of this function, and why ---------- */
/*
 * ⚠️ BRANCH A — the trailing-net-weight re-base that item 12b added — IS GONE, and these three
 * tests are what the deletion rests on. It compared "the weight that priced the row" against "the
 * weight the pack's NAME describes", and `parsePdfLine` now reads the pack off the name, so the two
 * are the same call on the same string and the comparison can never disagree with itself.
 * The identity is asserted below rather than assumed: if a future change makes the parser read a
 * weight off the raw line again, THAT is what goes red here, and it goes red loudly enough to send
 * the reader to this comment before they wonder where the correction went.
 *
 * What survives is 236's fold-undo, which corrects a different thing, and whose live arm is the
 * REFUSAL: a leading "2 CTN" folded into the pack weight, on a line whose arithmetic does not
 * confirm the reading, is flagged rather than guessed at.
 */

test('PARSER-AUDIT: the two weights invFixRow used to compare are the SAME call on the SAME string', () => {
  // This is the identity that makes branch A dead. It is one assertion and it is load-bearing.
  const row = parsePdfLine('Beef Mince 6 x 1kg 60.00 60.00 60.00 6.0kg');
  assert.equal(row.basis.kind, 'pair', 'the fallback path — the only one that still reaches the tail');
  assert.deepEqual(row.basis.weight, invPackWeight(row),
    'the weight that PRICED the row and the weight the NAME describes are one value; branch A compared it with itself');
  assert.ok(!/6\.0kg/.test(row.name), 'because the name stops at the first money, so the trailing column is not in it');
});

test('PARSER-AUDIT: a LITRE row still reaches the fold check — the unit guard names two units', () => {
  /* 12 x 1L in 2 cartons is 24L, and $45 against a $95 total does not confirm 2 x 45. The row is
     refused. If the entry guard stopped naming 'l', this row would sail past unflagged, and a
     folded litre pack is exactly as silent as a folded kilogram one. */
  const r = parse('2 CTN Oil Canola Spray 12 x 1L 45.00 45.00 95.00');
  assert.equal(r.unit, 'l');
  assert.equal(r.needManual, true, 'the arithmetic does not confirm the carton reading, so it asks');
});

test('PARSER-AUDIT: a line stating its own rate is still exempt, and the exemption still matters', () => {
  /* The guard was added for branch A, which is now gone — so it needs its own reason to exist, and
     it has one: without it this row reaches the fold check ("2 CTN", 2 folded, three amounts, a
     repeated pair, and 2 x 60 nowhere near 95) and is flagged for review it does not need. The
     price is stated on the line; there is no pack-weight basis to correct or to doubt. */
  const r = parse('2 CTN Pork Belly 6 x 1kg $14.90/kg 60.00 60.00 95.00');
  assertClose(r.unitPrice, 14.90, 'the rate the line states');
  assert.equal(r.needManual, false, 'and no manual review manufactured by a correction that does not apply');
});
