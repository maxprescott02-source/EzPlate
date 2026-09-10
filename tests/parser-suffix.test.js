/*
 * parser-suffix.test.js — D3 of PARSER-AUDIT-2026-09-08.
 *
 * `packWeight` multiplies every "N x" chain that comes BEFORE the weight ("6 x 2kg"), because that
 * is how one supplier writes a pack. The other writes the multiplier AFTER it — "2.26KG X 6",
 * "700G/UNIT 6 UNITS/CTN" — and every one of those was dropped, so a carton of six was costed as
 * one: $32.23/kg for a $5.37 product, $35.71 for $5.95, $63.33 for $10.56. Silent, all of them.
 *
 * ⚠️ THE HARD PART IS NOT MATCHING THE MULTIPLIER, IT IS NOT MATCHING A QUANTITY COLUMN. A bare
 * number after the weight is the commonest thing on an invoice line — it is the qty column — so the
 * suffix only counts when it is spelled as a multiplication ("x 6") or names what it counts
 * ("6 UNITS"). The third case below is the one that would silently divide every line of the OTHER
 * supplier's invoices by its order quantity, which is the defect this whole batch is about.
 */
const test = require('node:test');
const assert = require('node:assert');
const { packWeight } = require('./_extract');

function assertClose(a, b, msg) {
  assert.ok(Math.abs(a - b) < 0.001, `${msg} — expected ~${b}, got ${a}`);
}

test('D3: "2.26KG X 6" is a carton of six, not one 2.26kg patty tray', () => {
  const w = packWeight('11201 FZ HASH BROWN TRI PATTIES 2.26KG X 6');
  assertClose(w.qtyInCat, 13.56, 'six trays of 2.26kg');
  assert.equal(w.cat, 'kg');
});

test('D3: "700G/UNIT 6 UNITS/CTN" is 4.2kg, with the count spelled out after the weight', () => {
  const w = packWeight('19011 FZ BREAD - WHITE SLICED 700G/UNIT 6 UNITS/CTN TIP TOP');
  assertClose(w.qtyInCat, 4.2, 'six 700g loaves');
});

test('D3: the compact form with no space is the same pack', () => {
  const w = packWeight('19012 FZ BREAD - RAISIN THICK 600G/UNIT 6UNITS/CTN');
  assertClose(w.qtyInCat, 3.6, 'six 600g loaves');
});

test('⚠️ a BARE number after the weight is a quantity column and must NOT multiply', () => {
  // "HASH BROWNS ... 1kg 10 5.62 5.62 56.20" — the 10 is ten packets ordered. Reading it as a
  // multiplier would make the pack 10kg and the price a tenth of the truth, on every line of the
  // repeated-price layout that the rest of this parser has always got right.
  const w = packWeight('HASH BROWNS TRIANGLES CHUNKY 1kg 10 5.62 5.62 56.20');
  assertClose(w.qtyInCat, 1, 'one kilogram, and the 10 is left where it belongs');
  assert.deepEqual(w.factors, [], 'nothing was folded in');
});

test('the pre-existing PREFIX chain is untouched', () => {
  assertClose(packWeight('BREAD SOURDOUGH SLICED CAFE STYLE 8x1.2kg').qtyInCat, 9.6, 'eight 1.2kg loaves');
  assertClose(packWeight('BUTTER P/C 100x8g').qtyInCat, 0.8, 'a hundred 8g portions');
  assertClose(packWeight('Sauce 6 x (22 x 120g)').qtyInCat, 15.84, 'a nested pack still folds');
});

test('a line with no weight at all still has no weight', () => {
  assert.equal(packWeight('CANNED - PINEAPPLE SLICES IN SYRUP 60-70 RINGS A10 (3)'), null);
});

/* ---------- the positivity guards, which is where a $0.00 price comes from ---------- */

test('⚠️ a ZERO multiplier is ignored, in the prefix chain and in the suffix', () => {
  /* A short-supplied or cancelled line really does print a 0 where a count belongs. Folding it in
     makes the pack weigh nothing, and a pack that weighs nothing divides a real price by zero — or,
     once the caller's `w.qtyInCat>0` test rejects it, drops the row onto a path that was never
     asked about. Both guards are `>0` for that reason, and both are asserted, because they are
     separate lines and only one of them existed before this batch. */
  assert.equal(packWeight('SHORT SUPPLY 0 x 1kg').qtyInCat, 1, 'the prefix chain skips a zero');
  assert.deepEqual(packWeight('SHORT SUPPLY 0 x 1kg').factors, [], 'and does not record it as a factor');
  assert.equal(packWeight('SHORT SUPPLY 1kg x 0').qtyInCat, 1, 'the suffix multiplier skips a zero too');
  assert.deepEqual(packWeight('SHORT SUPPLY 1kg x 0').factors, []);
});
