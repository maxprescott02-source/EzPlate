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
const { parsePdfLine, invFixRow } = require('./_extract.js');

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

test('12b: a trailing net-weight column is RE-BASED onto the pack, not divided by a total', () => {
  // The headline 12b case. packWeight takes the LAST weight token in the raw line, so "12.0kg"
  // (a net-weight column) became the pack unit weight: 2 x 6 x 12.0 = 144kg, $0.42/kg. The pack
  // says 6 x 1kg and two cartons were bought, so the truth is $10.00/kg — and BOTH corrections
  // have to run, in order, to get there: re-base 0.42 -> 5.00, then undo the fold 5.00 -> 10.00.
  const l = '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg';
  assertClose(parsePdfLine(l).unitPrice, 0.4167, 'precondition: the parser alone is an order of magnitude out');
  const r = parse(l);
  assertClose(r.unitPrice, 10, 'the pack\'s own weight prices the row');
  assert.equal(r.needManual, false);
});

test('12b alone: a trailing weight with no leading quantity is still re-based', () => {
  // No "k CTN" prefix, so only the basis correction applies: 6 x 1kg = 6kg for $60 = $10/kg,
  // where the trailing "6.0kg" had made it 36kg and $1.67.
  const l = 'Beef Mince 6 x 1kg 60.00 60.00 60.00 6.0kg';
  assertClose(parsePdfLine(l).unitPrice, 1.6667, 'precondition: wrong before');
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
  const bare = parsePdfLine(l);
  assert.equal(bare.unit, 'kg', 'precondition: the parser did derive a weight price here');
  const r = parse(l);
  assert.equal(r.needManual, true, 'flagged for a human');
  assert.equal(r.unitPrice, bare.unitPrice, 'and its price is left as parsed, not invented');
});

test('a DIFFERENT weight category is flagged, and never silently switches the unit', () => {
  // name says 6 x 500ml, the trailing column says 3.0kg. The parser priced per kg off the wrong
  // token. Correcting the number while leaving the unit would be an ml->g style basis flip, which
  // CLAUDE.md records as impossible to notice on any screen — so this one goes to a human.
  const l = 'Sauce 6 x 500ml 30.00 30.00 60.00 3.0kg';
  const bare = parsePdfLine(l);
  const r = parse(l);
  assert.equal(r.needManual, true, 'flagged');
  assert.equal(r.unit, bare.unit, 'the unit is NOT rewritten');
  assert.equal(r.unitPrice, bare.unitPrice, 'and neither is the price');
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
  const r = parse('Beef Mince 2 x 6 x 1kg 60.00 60.00 120.00');
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
