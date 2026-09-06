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
  // T=60 could mean the pair is the whole-line total (truth $5/kg) or a mis-scan (truth $10/kg).
  // Guessing either way is the silent-wrong-number class; the row asks instead.
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00 60.00');
  assert.equal(r.needManual, true, 'unconfirmed arithmetic flags the row');
  assertClose(r.unitPrice, 5, 'the price is left as parsed, for the reviewer to see');
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

test('a pair with NO line total is unconfirmable — flagged, not silently kept', () => {
  // monies = [60.00, 60.00]: the pair exists but the total column did not scan, so T falls back
  // to the pair itself and k*P can never equal it. The mutation gate found the first draft's
  // length guard let exactly this two-money shape return untouched.
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00');
  assert.equal(r.needManual, true, 'no total to confirm against flags the row');
  assertClose(r.unitPrice, 5, 'price left as parsed for the reviewer');
});

test('one cent of total rounding still confirms — the tolerance is <= a cent, not < it', () => {
  // GST-rounded totals land a cent off k*P; the boundary is inclusive on purpose, and the
  // mutation gate watches it (<= -> < survived until this fixture).
  const r = parse('2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.01');
  assertClose(r.unitPrice, 10, 'a cent off is still the confirmed shape');
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
