/*
 * inv-qty-first.test.js — queue item 12 (the 5 Sep blind audit's finding 1, REPRODUCED before
 * any fix was written): a quantity-first carton line silently halves an ingredient's unit cost.
 *
 * The defect: packWeight's multiplier chain accepts "N <pack-noun>", so a LEADING purchased
 * quantity ("2 CTN ...") is folded into the pack weight while firstPairPrice picks the
 * PER-CARTON price — $60 / 12kg = $5/kg for a $10/kg product, needManual:false, pre-ticked.
 *
 * The fix is invQtyFirstRebase, OUTSIDE the protected region, gated on the line's own
 * arithmetic (pair P × leading k = total T). These tests run the REAL parser and the REAL
 * rebase in one sandbox (tests/_extract.js) — no stubs, per the roster.
 *
 * ⚠️ Every fixture here puts the purchased quantity BEFORE the pack composition. That ordering
 * is the whole defect, and the reviewer's stated reason the existing parser fixtures stay green
 * against it: they are all composition-first. Do not "tidy" a fixture into the Bidfood order.
 */
const test = require('node:test');
const assert = require('node:assert');
const { parsePdfLine, invQtyFirstRebase } = require('./_extract.js');

const parse = (line) => invQtyFirstRebase(parsePdfLine(line));

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

test('a trailing net-weight column: the rebase REFUSES rather than compounding a parser error', () => {
  // ⚠️ The parser alone is ALREADY WRONG here — it takes the trailing "12.0kg" as the pack unit
  // weight and returns $0.42/kg where the truth is $10/kg, silently and pre-ticked. That is a
  // separate defect inside the protected region (filed, not fixed here). What this pins is that
  // invQtyFirstRebase does not MULTIPLY that wrong number: an earlier draft asked packWeight for
  // the NAME's weight while the price came from the RAW line's, so it "verified" a fold that had
  // nothing to do with the price it was about to double.
  const l = '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg';
  const bare = parsePdfLine(l);
  const r = invQtyFirstRebase({ ...bare });
  assert.equal(r.unitPrice, bare.unitPrice, 'the rebase leaves a line it cannot reason about alone');
});

test('a weight that exists ONLY outside the name is refused, not crashed on', () => {
  // name = "2 CTN Beef Mince" (no weight token at all) while the raw line's trailing column has
  // one, so packWeight answers null for the name and a real object for the line. The two-sided
  // guard has to survive that asymmetry: the mutation gate found that flipping its first || turns
  // this row into a TypeError — a thrown exception inside .map() would break the whole import.
  const l = '2 CTN Beef Mince 60.00 60.00 120.00 12.0kg';
  const bare = parsePdfLine(l);
  assert.equal(bare.unit, 'kg', 'precondition: the parser did derive a weight price here');
  const r = invQtyFirstRebase({ ...bare });
  assert.equal(r.unitPrice, bare.unitPrice, 'left exactly as parsed');
  assert.equal(r.needManual, false, 'and not flagged');
});

test('a total EQUAL to the pair is already whole-weight, even with a total column present', () => {
  // three amounts, all the same: the total column agrees with the pair, so the price covers the
  // whole folded weight and $5/kg is right. Without the P===T gate this rebases to $10 — the
  // mirror image of the defect this file exists for, in the direction nothing would flag.
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00 60.00');
  assertClose(r.unitPrice, 5, 'the pair already covers the whole weight');
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

test('no rebase when packWeight did not actually fold k — the undo must match the fold', () => {
  // name and raw can diverge (parsePdfLine slices the name; the referee can clean it). If the
  // NAME the weight was computed from carries no leading qty, there is nothing to undo, and
  // multiplying anyway would double a correct price — the exact defect in the other direction.
  const row = { unitPrice: 10, unit: 'kg', needManual: false, name: 'Beef Mince 6 x 1kg', raw: '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00' };
  const r = invQtyFirstRebase({ ...row });
  assertClose(r.unitPrice, 10, 'an unfolded price is not multiplied');
  assert.equal(r.needManual, false);
});

test('a row with NO price is returned untouched — null must never become $0.00', () => {
  // null * k is 0, and a fabricated $0.00 that nothing flags is this repo's oldest defect family
  // (the isFinite('') rule). Found by the mutation gate: flipping only the FIRST || in the entry
  // guard leaves the needManual arm working and opens exactly this one.
  const row = { unitPrice: null, unit: 'kg', needManual: false, name: '2 CTN Beef Mince 6 x 1kg', raw: '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00' };
  const r = invQtyFirstRebase({ ...row });
  assert.strictEqual(r.unitPrice, null, 'a priceless row stays priceless');
});

test('rows the parser already flagged are not touched', () => {
  const flagged = { unitPrice: 5, unit: 'kg', needManual: true, raw: '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00', name: '2 CTN Beef Mince 6 x 1kg' };
  const r = invQtyFirstRebase({ ...flagged });
  assert.equal(r.unitPrice, 5, 'a needManual row is the reviewer’s, not the rebase’s');
});
