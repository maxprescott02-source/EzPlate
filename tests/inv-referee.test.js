/*
 * inv-referee.test.js — QUEUE 0c2. `gemApplyReadings`, the AI second reader's merge ORCHESTRATOR.
 *
 * WHAT IT IS. Gemini reads the same invoice the deterministic parser read, and this function decides
 * what, if anything, its readings are allowed to do to a review row a human is about to confirm. It
 * is the referee, not a reader: it never produces a figure of its own, it converts every AI price to
 * ex-GST at one boundary, it refuses to touch a row the user has already ruled on, and where the two
 * readers disagree it mostly FLAGS rather than adopts, because money stays deterministic.
 *
 * WHY IT HAD 45 SURVIVING MUTANTS. Its one declared test file, `tests/invoice-gate.test.js`, pins
 * exactly one property — a row the user has ruled on is skipped whole — and that file is about the
 * confirm GATE rather than about the referee. It reaches this function through a hand-built sandbox
 * that stubs `rankCandidates` to a fixed answer and `packCount` to null, which is correct there and
 * useless here: two of the referee's decisions are made BY those two functions.
 *
 * SO THIS FILE USES THE SHARED HARNESS INSTEAD, with the real ranker, the real pack counter, the
 * real `byId`, and a real `gemDiag` writing into a captured console. `tests/_extract.js` says at its
 * own site why gemDiag is extracted rather than stubbed: it swallows a missing window in its own
 * try/catch, so a no-op stub of it and a DELETED call to it are the same program.
 *
 * ⚠️ THE RULES ARE NOT DUPLICATED HERE. `gemMergeLine`'s seven rules and `gemMatchSuspect`'s
 * thresholds have their own files (`inv-gemini-merge.test.js`, `inv-gemini-match.test.js`) and are
 * pure. What this file pins is the ORCHESTRATION: which rows are offered to those functions, what is
 * done with the answer, and what is written onto the row afterwards.
 */
const test = require('node:test');
const assert = require('node:assert');
const H = require('./_extract.js');

const CATALOGUE = [
  { id: 'P1', description: 'Chips Straight Cut 10Mm', brand: 'Safries', base_unit: 'g', cost_per_base_unit: 0.005 },
  { id: 'P2', description: 'Wedges Seasoned Skin On', brand: 'Safries', base_unit: 'g', cost_per_base_unit: 0.006 },
  { id: 'P3', description: 'Eggs Free Range 700G', brand: 'Sunny', base_unit: 'ea', cost_per_base_unit: 0.5 },
];

/** A parser row as buildInvRows leaves one: matched, priced, nothing taught, nobody has ruled. */
function row(over) {
  return Object.assign({
    name: 'CHIPS STRAIGHT CUT 10MM',
    raw: 'CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00',
    unitPrice: 5.5, unit: 'kg', rawUnit: 'kg',
    needManual: false, uncertain: false,
    cands: [{ id: 'P1', coverage: 1 }], bestId: 'P1', conf: 1, tier: 'hi',
    addNew: false, newItem: null, remembered: false,
  }, over || {});
}

/** One Gemini line. Defaults agree with the parser row above, so a test opts INTO a disagreement. */
function gline(over) {
  return Object.assign({
    rawText: 'CHIPS STRAIGHT CUT 10MM 10KG', description: 'Chips Straight Cut 10mm',
    derivedUnitPrice: 5.5, unitType: 'kg', packCount: null,
  }, over || {});
}

/** Run the real referee over a row set and hand back everything it touched. */
function referee(rows, lines, opts) {
  opts = opts || {};
  H.setRefereeState({ PRODUCTS: opts.products || CATALOGUE, invRows: rows, invGst: opts.gst || { mode: 'ex', note: '' } });
  H.gemApplyReadings(opts.payload || { status: 'ok', supplier: opts.supplier || 'Bidfood', lines });
  return H.gemState();
}

/* ---------------------------------------------------------------------------
 * 0. gemHist's refusals — pinned HERE because a written mutation allowance rests on them.
 * ------------------------------------------------------------------------- */

test('0c2: gemHist refuses a missing or unpriced product rather than returning a shape', () => {
  /* This test exists for one reason and it is worth stating, because otherwise it reads as an odd
     place to test a helper. `tests/mutation/targets.js` allows a surviving mutant in gemApplyReadings
     — `(r.bestId && byId[r.bestId])` becoming `||` — on the grounds that the mutant's extra call,
     `gemHist(undefined)`, returns null by gemHist's own first line, which is the same answer the
     false arm gives. That allowance is only as good as the guard it leans on.
     ⚠️ ITS FIRST DRAFT NAMED A FILE THAT DOES NOT TOUCH gemHist. `tests/inv-gemini-merge.test.js`
     imports gemMergeLine, gemCanon and gemPackEq and never mentions it; nothing anywhere called
     gemHist directly. So the tripwire the allowance advertised did not exist, and removing the guard
     would have turned a written allowance into a crash with nothing going red. Found by the pre-push
     review — the same class the roster tracks, a proof citing coverage a grep shows is not there.
     The fix is this test rather than a softer sentence, because the allowance is CORRECT; what was
     missing was the thing that keeps it correct. */
  assert.equal(H.gemHist(null), null, 'no product at all');
  assert.equal(H.gemHist(undefined), null, 'and the value the allowance actually depends on');
  assert.equal(H.gemHist({ id: 'X', base_unit: 'g' }), null, 'a product with no cost recorded');
  assert.equal(H.gemHist({ id: 'X', base_unit: 'g', cost_per_base_unit: 0 }), null, 'or a cost of zero');
  assert.equal(H.gemHist({ id: 'X', base_unit: 'g', cost_per_base_unit: -1 }), null, 'or a negative one');

  /* And it does answer for a real product, or every assertion above is satisfied by a function that
     refuses everything. The three base units all scale differently and all three are checked. */
  assert.deepEqual(H.gemHist({ id: 'X', base_unit: 'g', cost_per_base_unit: 0.005 }), { cat: 'kg', per: 5 });
  assert.deepEqual(H.gemHist({ id: 'X', base_unit: 'ml', cost_per_base_unit: 0.002 }), { cat: 'l', per: 2 });
  assert.deepEqual(H.gemHist({ id: 'X', base_unit: 'ea', cost_per_base_unit: 0.5 }), { cat: 'ea', per: 0.5 });
});

/* ---------------------------------------------------------------------------
 * 1. THE PAYLOAD GUARD. Three ways a response is unusable, and they are OR'd.
 * ------------------------------------------------------------------------- */

test('0c2: an unusable payload is declared UNAVAILABLE and changes no row', () => {
  /* Three independent refusals on one line, and the `||` between them is what makes each of them
     sufficient on its own. The one that matters most is the middle: a response that arrived, parsed,
     and carries `status:'error'` still has a `lines` array — so an `&&` here would merge an error
     payload as though the reader had succeeded.
     `gemStatus` is the whole visible consequence: the review screen reads it to say whether the
     second reader is still checking, has checked, or could not be reached. Marking an error as
     "checked" tells the user their invoice was double-read when it was not. */
  for (const bad of [
    null,
    undefined,
    { status: 'error', lines: [gline()] },
    { status: 'ok', lines: null },
    { status: 'ok' },
    { status: 'ok', lines: 'CHIPS' },
  ]) {
    const r = row();
    const st = referee([r], null, { payload: bad });
    assert.equal(st.status, 'unavailable', `payload ${JSON.stringify(bad)} must be unavailable`);
    assert.equal(r.aiClean, undefined, 'and no row is touched at all');
    assert.equal(st.paints, 1, 'but the screen is still repainted, or the note never clears');
  }

  /* And the good payload really does get through — otherwise every assertion above is satisfied by
     a function that refuses everything. */
  const ok = row();
  assert.equal(referee([ok], [gline()]).status, 'checked');
});

test('0c2: EVERY AI price is converted to ex-GST once, at the boundary', () => {
  /* 197's defect, pinned at the orchestrator. There are three consumers of `derivedUnitPrice` and an
     earlier draft converted at two of them, so the merge compared a GST-inclusive G against a P and
     a price history that were both ex-GST — "do these two readings agree?" asked across two tax
     bases, on every inclusive invoice.
     The row below has NO parser price, so rule 4 adopts Gemini's, which makes the stored number the
     AI's own and therefore the one the conversion has to have reached. */
  const inc = row({ unitPrice: null, unit: 'auto', needManual: true });
  referee([inc], [gline({ derivedUnitPrice: 11, unitType: 'kg' })], { gst: { mode: 'inc', note: '' } });
  assert.ok(Math.abs(inc.unitPrice - 10) < 1e-9, `$11.00 inclusive is $10.00 ex-GST, got ${inc.unitPrice}`);

  const ex = row({ unitPrice: null, unit: 'auto', needManual: true });
  referee([ex], [gline({ derivedUnitPrice: 11, unitType: 'kg' })], { gst: { mode: 'ex', note: '' } });
  assert.equal(ex.unitPrice, 11, 'an exclusive invoice is not divided — the conversion is a decision');
});

/* ---------------------------------------------------------------------------
 * 2. KEYING: which Gemini line, if any, belongs to which parser row.
 * ------------------------------------------------------------------------- */

test('0c2: a row is keyed by its RAW line first and its name second', () => {
  /* `gemNormKey(r.raw||r.name)` then `gemNormKey(r.name)`, in that order, and the two are different
     strings whenever the invoice printed anything after the price — which columnar invoices do.
     Both routes are exercised, because each is a separate ternary arm and a fixture that matches on
     both cannot tell you either one works. */
  const byRaw = row({ name: 'CHIPS', raw: 'CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00' });
  referee([byRaw], [gline({ rawText: 'CHIPS STRAIGHT CUT 10MM 10KG', description: 'x' })]);
  assert.ok(byRaw.aiClean, 'the raw line matched');

  const byName = row({ name: 'CHIPS STRAIGHT CUT 10MM 10KG', raw: 'TOTALLY DIFFERENT TEXT' });
  const byNameSt = referee([byName], [gline({ rawText: 'CHIPS STRAIGHT CUT 10MM 10KG', description: 'x' })]);
  assert.ok(byName.aiClean, 'and the name is the fallback when the raw line does not');
  /* ⚠️ The row count is asserted HERE rather than only in the consumed-line test below, and the
     difference is what makes it able to fail. `usedG[gi]=true` marks a reading as spent so rule 5
     does not also append it — but rule 5 has a second net, the `already` scan, which compares the
     reading against each row's RAW line. On a row keyed by its raw line that net covers for a broken
     usedG entirely, so the obvious fixture cannot see it. This row was keyed by its NAME and its raw
     line is unrelated, so the net misses and usedG is the only thing left. */
  assert.equal(byNameSt.rows.length, 1, 'a merged reading is spent — it must not ALSO arrive as a new card');

  const neither = row({ name: 'NOTHING LIKE IT', raw: 'NOTHING LIKE IT EITHER' });
  referee([neither], [gline()]);
  assert.equal(neither.aiClean, undefined, 'a row Gemini did not read is left entirely alone');
});

test('0c2: a Gemini line is consumed by the row it matched, and not appended again', () => {
  /* `usedG[gi]=true` is the only thing standing between "this line was merged into a row" and rule
     5's "Gemini found a line the parser missed". Set it to false and every merged line ALSO arrives
     as an unticked add-new card — the user sees the same product twice, once priced and once as a
     new item to create. */
  const r = row();
  const st = referee([r], [gline()]);
  assert.equal(st.rows.length, 1, 'one invoice line is one row');
  assert.ok(r.aiClean, 'and it was merged rather than ignored');
});

test('0c2: when two Gemini lines key the same, the FIRST claims the row', () => {
  /* `if(n && gmap[n]==null) gmap[n]=gi` — the null check is what makes it first-wins. The two lines
     below carry different prices so the winner is visible, and the row has no parser price so the
     winner's price is the one adopted. */
  const r = row({ unitPrice: null, unit: 'auto', needManual: true });
  referee([r], [gline({ derivedUnitPrice: 4 }), gline({ derivedUnitPrice: 9 })]);
  assert.equal(r.unitPrice, 4, 'the first reading of that line, not the last');
});

test('0c2: a line whose text normalises to NOTHING is not a key', () => {
  /* `if(n && ...)` — the first half. normalizePhrase strips digits and punctuation, so a line that
     is nothing but a price and a code normalises to the empty string. Without the guard the empty
     key is indexed, and then any other row that also normalises to nothing collides with it — two
     unrelated lines merged because neither had words. */
  const nameless = row({ name: '### 12.00 ###', raw: '### 12.00 ###', bestId: null, cands: [] });
  assert.equal(H.gemNormKey('### 12.00 ###'), '', 'the fixture must actually normalise to nothing');
  assert.equal(H.gemNormKey('$$$ 999 $$$'), '', 'on both sides, or they could not collide');

  const st = referee([nameless], [gline({ rawText: '$$$ 999 $$$', description: '' })]);
  assert.equal(nameless.aiClean, undefined, 'two textless lines are not the same line');
  /* The reading is then appended by rule 5 instead, which is right — it matched no row, and its raw
     text is a usable name even though it normalises to nothing. Asserted because the alternative
     outcome is the one the guard prevents: with the empty key indexed, the reading would be MERGED
     into the row above and consumed, so it would neither flag nor appear. */
  assert.equal(st.rows.length, 2, 'it arrives as its own row rather than merging into an unrelated one');
});

/* ---------------------------------------------------------------------------
 * 3. WHAT IS TAUGHT IS NOT REFEREED. Four independent signals, OR'd.
 * ------------------------------------------------------------------------- */

test('0c2: ANY ONE of the four taught signals takes a row out of the referee', () => {
  /* `T = !!(remembered || fromProductPack || packTaught || taughtQty!=null)`, and each is a separate
     way the user has already told the app what this line is. T does two things: it skips the
     wrong-match check outright, and it makes gemMergeLine return rule 1, keep.
     Each flag is set ALONE below, because that is the only arrangement that can see an `||` become
     an `&&` — a fixture with two of them set satisfies both operators.
     The Gemini line names a different product at a different price, so a row that was refereed would
     be visibly marked. */
  const wrong = gline({ description: 'Wedges Seasoned Skin On', rawText: 'CHIPS STRAIGHT CUT 10MM 10KG', derivedUnitPrice: 6 });
  for (const taught of [{ remembered: true }, { fromProductPack: true }, { packTaught: true }, { taughtQty: 105 }]) {
    const r = row(taught);
    referee([r], [wrong]);
    assert.equal(r.gemMatchReview, undefined, `${Object.keys(taught)[0]} alone must skip the wrong-match check`);
    assert.equal(r.gemPriceReview, undefined, 'and the price check');
    assert.equal(r.unitPrice, 5.5, 'and leave the taught price exactly as it was');
    assert.ok(r.aiClean, 'the descriptive prefill still lands — that part is not a referee decision');
  }

  /* The same row with NOTHING taught is refereed, which is what proves the four above are the
     reason and not the fixture. */
  const open = row();
  referee([open], [wrong]);
  assert.equal(open.gemMatchReview, true, 'an untaught row DOES get the wrong-match check');
});

test('0c2: a row the human has ruled on is skipped whole, taught or not', () => {
  /* gemRowLocked. The gate's own test pins this too; it is repeated here because it is the first
     branch of the loop and everything below it depends on the row having got past it. */
  const picked = row({ manualPick: true });
  referee([picked], [gline({ description: 'Wedges Seasoned Skin On', derivedUnitPrice: 6 })]);
  assert.equal(picked.aiClean, undefined, 'not even the descriptive prefill');
  assert.equal(picked.gemMatchReview, undefined);

  const approved = row({ newItem: { approved: true } });
  referee([approved], [gline({ description: 'Wedges Seasoned Skin On', derivedUnitPrice: 6 })]);
  assert.equal(approved.aiClean, undefined);
});

test('0c2: an add-new row gets the descriptive prefill and NO price referee', () => {
  /* `if(r.addNew) return` sits between the prefill and everything else, and the split is the point:
     an add-new line has no product to be wrong about and no stored price to compare against, so the
     referee has nothing to adjudicate — but the AI's clean name and supplier are exactly what the
     new-item form wants. */
  const r = row({ addNew: true, bestId: null, unitPrice: null, needManual: true });
  referee([r], [gline({ derivedUnitPrice: 9 })]);
  assert.ok(r.aiClean, 'the prefill lands');
  assert.equal(r.unitPrice, null, 'and the price is NOT adopted');
  assert.equal(r.gemPriceReview, undefined);
});

/* ---------------------------------------------------------------------------
 * 4. THE WRONG-MATCH CHECK, and what it writes on the row.
 * ------------------------------------------------------------------------- */

/** A row the AI thinks is a different product: parser says chips, Gemini's text says wedges. */
const MISMATCH = () => gline({ description: 'Wedges Seasoned Skin On', rawText: 'CHIPS STRAIGHT CUT 10MM 10KG' });

test('0c2: a suspected wrong match flags the row and ranks the AI product FIRST', () => {
  /* Four writes, and they are one decision: the flag the review screen renders, the id it offers,
     whether price history backed the swap, and the candidate list with the AI product at the top and
     marked so the chip can say where it came from.
     The existing candidate must SURVIVE the reordering — the user may still want it — which is why
     the row starts with a real candidate list rather than an empty one. */
  const r = row({ cands: [{ id: 'P1', coverage: 1 }, { id: 'P3', coverage: 0.4 }] });
  referee([r], [MISMATCH()]);

  assert.equal(r.gemMatchReview, true, 'the row asks the user to check the match');
  assert.equal(r.gemSuggestId, 'P2', 'and names the product the AI read');
  assert.equal(r.cands[0].id, 'P2', 'ranked first');
  assert.equal(r.cands[0].ai, true, 'and marked as the AI’s, or the chip cannot say so');
  assert.ok(r.cands.some((c) => c.id === 'P1'), 'the parser’s own match is still offered');
  assert.ok(r.cands.length <= 3, 'and the list stays at three');
});

test('0c2: a suspected wrong match SKIPS the price merge — the mis-match explains the gap', () => {
  /* The `return` at the end of the suspect branch, and it is the substantive half of the decision.
     If the parser matched the wrong product, the price "jump" is not a price rise, it is two
     different products being compared — so raising a price flag as well would tell the user a second
     thing that is not true. */
  const r = row({ unitPrice: 99, unit: 'kg' });
  referee([r], [MISMATCH()]);
  assert.equal(r.gemMatchReview, true);
  assert.equal(r.gemPriceReview, undefined, 'no price flag on a row whose MATCH is in doubt');
  assert.equal(r.unitPrice, 99, 'and the price is untouched');
});

test('0c2: the wrong-match check reads the AI DESCRIPTION, falling back to its raw text', () => {
  /* `rankCandidates(g.description||g.rawText)`. The description is the AI's cleaned reading and the
     raw text is the invoice line it came from; they routinely disagree, which is the whole value of
     the second reader. The two fixtures below rank to DIFFERENT products, so the fallback order is
     visible rather than assumed. */
  const fromDesc = row();
  referee([fromDesc], [gline({ description: 'Wedges Seasoned Skin On', rawText: 'CHIPS STRAIGHT CUT 10MM 10KG' })]);
  assert.equal(fromDesc.gemSuggestId, 'P2', 'the description is read first');

  const fromRaw = row({ name: 'EGGS FREE RANGE 700G', raw: 'EGGS FREE RANGE 700G 1DOZ  8.40  8.40', bestId: 'P3', cands: [{ id: 'P3', coverage: 1 }] });
  referee([fromRaw], [gline({ description: '', rawText: 'EGGS FREE RANGE 700G 1DOZ' })]);
  assert.equal(fromRaw.gemMatchReview, undefined, 'and with no description the raw text keys and ranks the same product');
});

test('0c2: an AI reading that ranks NOTHING is not a suspected mis-match', () => {
  /* `aiCands[0] && byId[aiCands[0].id]` guards the history lookup for a candidate list that can be
     empty — Gemini's description may name something no product resembles. Reading `.id` off an
     absent first candidate throws, and gemApplyReadings has no try/catch of its own, so the whole
     merge would die and the review screen would keep whatever it had. */
  const r = row();
  referee([r], [gline({ description: 'SOMETHING ELSE ENTIRELY', rawText: 'CHIPS STRAIGHT CUT 10MM 10KG' })]);
  assert.equal(r.gemMatchReview, undefined, 'nothing to suggest, so nothing is flagged');
  assert.ok(r.aiClean, 'and the merge completed rather than throwing');
});

test('0c2: the check-match diagnostic names the ROW, so a log line can be traced to it', () => {
  /* Diagnostics for Max, invisible to users — and pinned because the alternative is a line that
     prints an empty name and cannot be matched to anything on screen. */
  const r = row();
  const st = referee([r], [MISMATCH()]);
  const line = st.debug.find((d) => d.indexOf('check-match') >= 0);
  assert.ok(line, 'the diagnostic fired');
  assert.match(line, /CHIPS STRAIGHT CUT 10MM/, 'and it names the row it is about');
  assert.match(line, /P2/, 'and the product it suggests');
});

/* ---------------------------------------------------------------------------
 * 5. THE PRICE MERGE, and the three things it can write.
 * ------------------------------------------------------------------------- */

test('0c2: with no parser price, the AI reading is ADOPTED and flagged for review', () => {
  /* Rule 4 — filling a blank, never overruling a reading. Four fields move together and the row is
     incoherent if they come apart: a price with `needManual` still true is a number the user is
     being asked to supply, and a mismatch left set is a warning about a price that no longer exists.
     `gemReview` and `aiSuggested` are what keep the row UNTICKED with an "AI suggested" chip — an
     adopted price the user never saw is the one thing this whole design exists to prevent. */
  const r = row({ unitPrice: null, unit: 'auto', needManual: true, unitMismatch: true });
  referee([r], [gline({ derivedUnitPrice: 4.2, unitType: 'kg' })]);

  assert.equal(r.unitPrice, 4.2);
  assert.equal(r.unit, 'kg');
  assert.equal(r.needManual, false, 'the row stops asking');
  assert.equal(r.unitMismatch, false, 'and the stale mismatch is cleared with it');
  assert.equal(r.gemReview, true, 'flagged for review');
  assert.equal(r.aiSuggested, true, 'and marked as the AI’s suggestion');
});

test('0c2: with a parser price, the AI NEVER overrules it', () => {
  /* The rule this file's subject exists to enforce, and it was learned the hard way: before v66 the
     referee adopted Gemini's price, which overruled correct parser readings once the API went live.
     Money stays deterministic. */
  const r = row({ unitPrice: 5.5 });
  referee([r], [gline({ derivedUnitPrice: 99, unitType: 'kg' })]);
  assert.equal(r.unitPrice, 5.5, 'the parser stands');
  assert.equal(r.gemReview, undefined, 'and nothing was adopted');
});

test('0c2: history saying the parser looks wrong raises a FLAG and moves no money', () => {
  /* Rule 3. P1 is stored at $5.00/kg, so the band is $2.50 to $7.50. The parser's $20 is outside it
     and Gemini's $5.20 is inside — the one case where the app will say "check this price", and it
     still does not change the price. */
  const r = row({ unitPrice: 20, unit: 'kg' });
  referee([r], [gline({ derivedUnitPrice: 5.2, unitType: 'kg' })]);
  assert.equal(r.gemPriceReview, true, 'the row asks the user to check the price');
  assert.equal(r.unitPrice, 20, 'and the price is NOT changed');
  assert.equal(r.gemReview, undefined, 'this is a flag, not an adoption');
});

test('0c2: when the two readers agree, the row is left silent', () => {
  /* Rule 2, and it is the common case: the second reader confirms the first and says nothing. A
     referee that marked agreement would flag every line of every invoice. */
  const r = row();
  referee([r], [gline()]);
  assert.equal(r.gemPriceReview, undefined);
  assert.equal(r.gemReview, undefined);
  assert.equal(r.unitPrice, 5.5);
});

test('0c2: the pack count compared against Gemini is read off the RAW line', () => {
  /* `packCount(r.raw||r.name)` feeds rule 2's "and the packs agree" clause, so it decides whether a
     matching price is a silent confirmation or an unadjudicated disagreement. The fixture's NAME
     carries no pack notation and its RAW line does, which is the ordinary shape of an invoice row. */
  const r = row({ name: 'CHIPS STRAIGHT CUT', raw: 'CHIPS STRAIGHT CUT 6X2KG  55.00  55.00' });
  const st = referee([r], [gline({ rawText: 'CHIPS STRAIGHT CUT 6X2KG', description: 'Chips Straight Cut 10mm', packCount: 6 })]);
  assert.equal(r.gemPriceReview, undefined, 'packs agree at 6, so the readers agree and it is silent');
  /* ⚠️ THE RULE NUMBER IS THE ASSERTION, not the silence, and that is the whole point of this test.
     Reading the pack count off the NAME instead gives null, gemPackEq(null, 6) is false, and rule 2
     no longer applies — so the merge falls through to rule 7, "cannot adjudicate". Both are silent
     and both leave the price alone, so every user-visible field is identical. The difference is
     between "the two readers agreed and I checked" and "I could not tell", and the diagnostic is the
     only place it exists. */
  const line = st.debug.find((d) => d.indexOf('rule') >= 0);
  assert.match(line, /rule 2\b/, 'rule 2 — verified against the second reader, not merely unadjudicated');

  const disagree = row({ name: 'CHIPS STRAIGHT CUT', raw: 'CHIPS STRAIGHT CUT 6X2KG  55.00  55.00', unitPrice: 20 });
  referee([disagree], [gline({ rawText: 'CHIPS STRAIGHT CUT 6X2KG', description: 'Chips Straight Cut 10mm', derivedUnitPrice: 5.2, packCount: 6 })]);
  assert.equal(disagree.gemPriceReview, true, 'and a real disagreement still reaches the history rule');
});

test('0c2: every refereed row leaves a diagnostic naming the rule that decided it', () => {
  /* `gemDiag(r, dec, H)`. It is invisible to users and it is the only record of WHY a row came out
     the way it did — the thing Max reads when a line looks wrong. Deleting the call is silent. */
  const r = row();
  const st = referee([r], [gline()]);
  const line = st.debug.find((d) => d.indexOf('rule') >= 0);
  assert.ok(line, 'the merge decision was logged');
  assert.match(line, /CHIPS STRAIGHT CUT 10MM/, 'against the row it decided');
});

/* ---------------------------------------------------------------------------
 * 6. RULE 5 — lines Gemini found that the parser dropped entirely.
 * ------------------------------------------------------------------------- */

test('0c2: a line only Gemini read is APPENDED as an unticked add-new card', () => {
  /* The parser drops lines it cannot make sense of, and this is the only path that gets them back.
     Every field on the appended row is asserted, because the row is built here in one literal and
     nothing downstream re-derives any of it: `addNew` and `bestId` decide it offers to create a
     product rather than overwrite one, `gemNew`/`aiSource` are what make the chips say the AI found
     it, `remembered` false is its provenance, and `uncertain` false says it is not a summary line. */
  const known = row();
  const st = referee([known], [gline(), gline({ rawText: 'WEDGES SEASONED SKIN ON 5KG', description: 'Wedges Seasoned Skin On', derivedUnitPrice: 6, unitType: 'kg' })]);

  assert.equal(st.rows.length, 2, 'the unmatched reading became a row');
  const added = st.rows[1];
  assert.equal(added.name, 'Wedges Seasoned Skin On', 'named from the DESCRIPTION, not the raw text');
  assert.equal(added.raw, 'WEDGES SEASONED SKIN ON 5KG', 'and keeps the raw line beside it');
  assert.equal(added.unitPrice, 6);
  assert.equal(added.unit, 'kg');
  assert.equal(added.needManual, false, 'it has a price, so it is not asking');
  assert.equal(added.uncertain, false);
  assert.equal(added.addNew, true, 'it offers to CREATE a product');
  assert.equal(added.bestId, null, 'and matches none');
  assert.equal(added.remembered, false);
  assert.equal(added.gemNew, true);
  assert.equal(added.aiSource, true, 'or the chips cannot say where it came from');
  assert.ok(added.aiClean, 'and it carries the descriptive prefill');
});

test('0c2: an appended line with NO usable price still arrives, asking', () => {
  /* `needManual:(gc==null)` — a reading Gemini could not canonicalise is still worth showing, as a
     row the user prices by hand. Dropping it would lose the line entirely, which is the failure rule
     5 exists to fix. */
  const st = referee([], [gline({ rawText: 'MYSTERY WIDGET CARTON', description: 'Mystery Widget', derivedUnitPrice: null, unitType: null })]);
  assert.equal(st.rows.length, 1);
  assert.equal(st.rows[0].unitPrice, null);
  assert.equal(st.rows[0].needManual, true, 'no price means the row asks');
  assert.equal(st.rows[0].unit, 'auto');
});

test('0c2: a nameless reading is dropped rather than appended blank', () => {
  /* `if(!name) return`. A row with no name is unusable on the review screen and uncreatable as a
     product — it would render as an empty card the user cannot act on. */
  const st = referee([], [gline({ rawText: '', description: '' })]);
  assert.equal(st.rows.length, 0);
});

test('0c2: the duplicate net compares the row’s RAW line against the reading’s RAW text', () => {
  /* Both sides of the `already` scan fall back — the row from raw to name, the reading from rawText
     to description — and each fallback is a separate `||`. The fixture makes the two sides of each
     pair disagree, which is the only arrangement that can tell which was read.
     The second reading below is the one rule 5 considers: it keys to the same text as the first, and
     the key map is first-wins, so it is never consumed. Its raw text matches the row, so it is a
     duplicate and must be dropped — but its DESCRIPTION names a different product entirely, and the
     row's NAME is a shortened form that matches neither. Read either fallback instead of the raw
     text on either side and the same product arrives twice, once priced and once as a new item. */
  const r = row({ name: 'CHIPS', raw: 'CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00' });
  const st = referee([r], [
    gline({ rawText: 'CHIPS STRAIGHT CUT 10MM 10KG', description: 'Chips Straight Cut 10mm' }),
    gline({ rawText: 'CHIPS STRAIGHT CUT 10MM 10KG', description: 'Wedges Seasoned Skin On' }),
  ]);
  assert.ok(r.aiClean, 'the row was merged by the FIRST reading');
  assert.equal(st.rows.length, 1, 'and the second, a duplicate of the same line, appends nothing');
});

test('0c2: a reading matching a row we could not KEY is not appended twice', () => {
  /* The `already` guard, and it is a second, weaker net behind the key map: if the row and the
     reading normalise to the same text but the key lookup missed for any reason, appending would
     show the user the same product twice. Both sides fall back — the row from raw to name, the
     reading from rawText to description — so the fixture leaves each side only one of the two. */
  const r = row({ raw: '', name: 'CHIPS STRAIGHT CUT 10MM 10KG' });
  const st = referee([r], [gline({ rawText: '', description: 'CHIPS STRAIGHT CUT 10MM 10KG' })]);
  assert.equal(st.rows.length, 1, 'one product, one row');
});

test('0c2: an appended line is tiered by the same thresholds as a parsed one', () => {
  /* `top>=0.6 ? hi : top>=0.3 ? mid : lo`, duplicated here from buildInvRows because the row is
     built in a different place. The two must agree or the same confidence renders differently
     depending on which reader found the line. Both boundaries are exercised. */
  const hi = referee([], [gline({ rawText: 'WEDGES SEASONED SKIN ON 5KG', description: 'Wedges Seasoned Skin On', derivedUnitPrice: 6, unitType: 'kg' })]);
  assert.equal(hi.rows[0].conf, 1);
  assert.equal(hi.rows[0].tier, 'hi');

  const lo = referee([], [gline({ rawText: 'SOMETHING ELSE ENTIRELY', description: 'Something Else Entirely', derivedUnitPrice: 6, unitType: 'kg' })]);
  assert.equal(lo.rows[0].conf, 0);
  assert.equal(lo.rows[0].tier, 'lo');
});

test('0c2: an appended line lands ON both tier boundaries the same way a parsed one does', () => {
  /* The two `>=` in `top>=0.6 ? hi : top>=0.3 ? mid : lo`, and only a fixture sitting EXACTLY on a
     boundary can see either one move. Both values are produced by the real ranker rather than
     asserted from the comment, and both are reachable without contrivance:
     0.6 is the FLOOR the ranker applies whenever the first content word matches exactly and is four
     characters or more ("one strong content word is enough"), and 0.3 is three shared tokens out of
     ten. The assertions on `conf` come first because a fixture that drifts off the boundary would
     otherwise make this test quietly meaningless.
     This is the same pair `tests/inv-chain.test.js` pins for buildInvRows, and it is duplicated here
     because the thresholds are duplicated in the code — the two row builders must agree, or the same
     confidence renders differently depending on which reader found the line. */
  const LONG = { id: 'P5', base_unit: 'ea', cost_per_base_unit: 1, brand: '',
                 description: 'Chicken Breast Fillet Skinless Boneless Marinated Peri Lemon Herb Crumbed' };
  const products = CATALOGUE.concat([LONG]);

  const six = referee([], [gline({ rawText: 'CHIPS SEALED SMOKED LOIN RIBS WINGS', description: 'CHIPS SEALED SMOKED LOIN RIBS WINGS', derivedUnitPrice: 6, unitType: 'kg' })], { products });
  assert.equal(six.rows[0].conf, 0.6, 'the fixture must land ON the boundary');
  assert.equal(six.rows[0].tier, 'hi', '>= 0.6 is hi — exactly 0.6 is INSIDE');

  const three = referee([], [gline({ rawText: 'BEEF RUMP SKINLESS BONELESS CRUMBED SEALED SMOKED LOIN RIBS WINGS', description: 'BEEF RUMP SKINLESS BONELESS CRUMBED SEALED SMOKED LOIN RIBS WINGS', derivedUnitPrice: 6, unitType: 'kg' })], { products });
  assert.equal(three.rows[0].conf, 0.3, 'and so must this one');
  assert.equal(three.rows[0].tier, 'mid', '>= 0.3 is mid — exactly 0.3 is INSIDE');
});

test('0c2: the screen is repainted once the verdict is in, and the verdict is CHECKED', () => {
  /* The last two statements. `gemStatus` is what turns "AI double-checking…" into a result, and the
     repaint is what puts any of this on screen — without it the referee's whole output is invisible
     until something else happens to render. */
  const st = referee([row()], [gline()]);
  assert.equal(st.status, 'checked');
  assert.equal(st.paints, 1);
});
