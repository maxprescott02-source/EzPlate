/*
 * parser-columns.test.js — D1 and D2 of PARSER-AUDIT-2026-09-08, the defect that made this batch.
 *
 * WHAT WAS WRONG. The price of one pack was chosen by REPETITION ("the first adjacent pair of equal
 * amounts") and, failing that, by POSITION ("the last amount on the line"). Neither ever consulted
 * the quantity. On any layout that prints Ordered and Shipped as two-decimal numbers — which is one
 * of the cafe's two weekly suppliers, on every line of every invoice — the QUANTITY is the first
 * equal adjacent pair, so the quantity became the price: chips at $0.25/kg for a $2.46/kg product,
 * and the stored price then tracked the order size (3 cartons $0.25, 6 cartons $0.50, 11 $0.92).
 * On every layout with a quantity column and no repeated price column (Xero, MYOB, Square, a
 * supermarket receipt, a market docket) the second half of the rule priced the row from the LINE
 * TOTAL, which is the unit price times the quantity.
 * Measured 8 Sep 2026 against six real invoices: 36 of 41 lines wrong with NO flag raised.
 *
 * WHAT IS RIGHT. `lineColumns` finds the three columns by their ARITHMETIC — q x P = T, with q to
 * the left of P and T to its right — so the parser knows which number was the quantity and which
 * was the price. Nothing adds up, and it returns null so the caller can refuse to guess.
 *
 * ⚠️ THE FIXTURES BELOW CARRY THE ARITHMETIC IN PLAIN SIGHT, on purpose: every one can be checked
 * by multiplying two numbers in the line. A fixture whose columns agree cannot tell you which one
 * the code read (CLAUDE.md roster 184(b)), so no fixture here has a quantity equal to its price.
 *
 * Supplier names are roles. The line SHAPES are real; the invoices are not in this repo.
 */
const test = require('node:test');
const assert = require('node:assert');
const { lineColumns, parsePdfLine } = require('./_extract');

function assertClose(a, b, msg) {
  assert.ok(Math.abs(a - b) < 0.001, `${msg} — expected ~${b}, got ${a}`);
}

/* ---------- the columns themselves ---------- */

test('D1: the quantity column is not the price, however many times it repeats', () => {
  // Ordered 3.00, Shipped 3.00, UOM CTN, Ship Doc 3.00 CTN, then $29.50 a carton, extension $88.50.
  // The old rule took "3.00 3.00" as a repeated price column and stored $3.00 a carton.
  const c = lineColumns('13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50');
  assert.ok(c, 'the line does add up: 3 x 29.50 = 88.50');
  assert.equal(c.price, 29.50, 'the price is the column that MULTIPLIES to the extension');
  assert.equal(c.qty, 3, 'and the quantity is the one it multiplies by');
  assert.equal(c.qtyUnit, 'ctn');
});

test('D2: a kilogram quantity column is a quantity, never the pack weight', () => {
  // 25.00 KG shipped, in 5 cartons of 2 x 2.5kg, at $12.20 PER KILOGRAM, extension $305.00.
  // Shipped read the 25.00 as the pack's weight and stored $10.00/kg; with D1 alone it would have
  // divided $12.20 by the 2.5kg in the name and stored $4.88.
  const c = lineColumns('70675 BACON - RINDLESS MIDDLE 2.5KG(2) # 35350 25.00 25.00 KG 5.00 CTN $12.20 $0.00 $305.00');
  assert.ok(c);
  assert.equal(c.price, 12.20);
  assert.equal(c.qty, 25, 'the quantity is 25 kilograms — NOT the 25.00 read as a pack size');
  assert.equal(c.qtyUnit, 'kg', 'and the unit word beside it is what makes the price per kilogram');
});

test('D1: a repeated-price layout still resolves, and to the same answer as before', () => {
  // The other supplier repeats the unit price column, which is why this defect stayed hidden for
  // months: the old rule was right here, and this is the layout every existing parser test used.
  const c = lineColumns('CTN 223576 #BREAD BUNS MILK 4.5" 48x85gr 4 52.12 208.48 208.48 0.00 208.48');
  assert.ok(c);
  assert.equal(c.price, 52.12, '4 x 52.12 = 208.48');
  assert.equal(c.qty, 4);
});

test('a $ marks the price column, and is preferred over a bare amount that also fits', () => {
  const withD = lineColumns('19011 FZ BREAD - WHITE SLICED 700G 1.00 1.00 CTN 1.00 CTN $25.00 $0.00 $25.00');
  assert.ok(withD);
  assert.equal(withD.price, 25.00);
  assert.equal(withD.dollar, true, 'the $ is what tells a price column from a quantity column');
});

test('the degenerate 1 x 1.00 = 1.00 triple says nothing and is skipped', () => {
  // Every amount on a qty-1 line satisfies 1 x N = N, so without the skip the FIRST amount wins and
  // a "1.00 1.00 CTN" prefix reads as a $1.00 pack. The same line with no $ must still answer 25.00.
  const bare = lineColumns('19011 FZ BREAD - WHITE SLICED 700G 1.00 1.00 CTN 1.00 CTN 25.00 0.00 25.00');
  assert.ok(bare);
  assert.equal(bare.price, 25.00, 'not 1.00 — a candidate whose three amounts are all equal is skipped');
  assert.equal(bare.qty, 1);
});

test('a line whose amounts do not add up returns null rather than a guess', () => {
  // A 5% line discount sits between the rate and the extension: 6 x 7.90 is 47.40, not 45.03.
  assert.equal(lineColumns('6 YOG1KG Yoghurt Greek 1kg $7.90 5.00% $45.03'), null,
    'null is the whole point — it is what lets parsePdfLine refuse instead of pricing from the total');
});

test('fewer than two amounts is not a column layout at all', () => {
  assert.equal(lineColumns('BREAD SOURDOUGH 8x1.2kg 45.70'), null);
  assert.equal(lineColumns(''), null);
});

/* ---------- end to end: the four real prices this batch exists to fix ---------- */

test('D1/D2 end to end: four real lines, each priced from its own arithmetic', () => {
  const cases = [
    ['13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50',
     2.4583, 'kg', '$29.50 a carton of 6 x 2kg'],
    ['70675 BACON - RINDLESS MIDDLE 2.5KG(2) # 35350 25.00 25.00 KG 5.00 CTN $12.20 $0.00 $305.00',
     12.20, 'kg', 'priced per kilogram by its own quantity column'],
    ['19022 CHICKEN 1/2 BREAST (F) S/OFF 5KG BAG 5.00 5.00 KG 1.00 BAG $8.90 $0.00 $44.50',
     8.90, 'kg', 'per kilogram again, and the 5KG in the name is not the divisor'],
    ['20110 FLOUR - PLAIN FLOUR 12.5KG 1.00 1.00 BAG 1.00 BAG $12.50 $0.00 $12.50',
     1.00, 'kg', '$12.50 for a 12.5kg bag']
  ];
  for (const [line, price, unit, why] of cases) {
    const r = parsePdfLine(line);
    assertClose(r.unitPrice, price, why);
    assert.equal(r.unit, unit, why);
    assert.equal(r.needManual, false, why);
    assert.equal(r.basis.kind, 'columns', 'and the row records WHICH rule priced it, so invFixRow can step aside');
  }
});

test('D1 fallback: several amounts, no pair and no arithmetic, is needManual — never the total', () => {
  // $152.00 is four times $38.00 but nothing on the line says four. Storing 152 was the old answer.
  const r = parsePdfLine('Espresso Blend 1kg $38.00 $152.00');
  assert.equal(r.needManual, true, 'the row asks rather than guessing');
  assert.equal(r.unitPrice, null, 'and no price is invented from the line total');
  assert.equal(r.basis.kind, 'unbalanced');
});

test('the repeated-pair rule survives as the fallback for lines with no quantity', () => {
  // Nothing here multiplies to anything, so lineColumns returns null and the old rule prices it.
  // Keeping this path is what stops the fix regressing every hand-built and pair-only row.
  const r = parsePdfLine('Beef Mince 6 x 1kg 60.00 60.00 60.00 6.0kg');
  assert.equal(r.basis.kind, 'pair', 'the pre-existing chooser, still there and still reachable');
  assert.equal(r.needManual, false);
});

test('⚠️ the repeated-pair fallback never returns a price of ZERO', () => {
  /* Two adjacent 0.00s are ordinary on an invoice — a GST column beside a zero-rated line, a levy
     with no tax — and "the first adjacent pair of equal amounts" is happy to call them the price.
     A $0.00 that nothing flags is this repo's oldest defect family (`isFinite('')` is TRUE), and
     the `>0` on that loop is the whole of what prevents it. */
  const { firstPairPrice, moneyMatches } = require('./_extract');
  assert.equal(firstPairPrice(moneyMatches('S77 FUEL LEVY 1.00 EA 0.00 0.00 88.50')), null,
    'a pair of zeros is not a price');
  assert.equal(firstPairPrice(moneyMatches('BUNS 4 52.12 52.12 208.48')), 52.12, 'a real pair still is');
});
