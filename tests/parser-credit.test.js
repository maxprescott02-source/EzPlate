/*
 * parser-credit.test.js — D5 of PARSER-AUDIT-2026-09-08.
 *
 * `moneyMatches` had no sign. "-2.00" matched as 2.00 and "$-59.00" as 59.00, so the credit page
 * stapled to the back of a real 25/08 invoice — two cartons of chips returned — was read as a
 * PURCHASE, and priced at $0.17/kg with no flag. A credit is not a purchase at a strange price; it
 * is not a purchase at all, and on a credit note the unit-price column is usually not what it looks
 * like either. So the row refuses, loudly, and a human decides.
 *
 * ⚠️ THE SIGN HAS TO BE GLUED TO THE NUMBER, and that is the whole subtlety. A dash is the commonest
 * character in this cafe's invoice descriptions — "BACON - RINDLESS MIDDLE", "FZ CHIPS - S/CUT" —
 * so a rule that read any preceding dash as a minus would flag every line of every invoice as a
 * credit and the import would become useless. The last test below is that case.
 */
const test = require('node:test');
const assert = require('node:assert');
const { moneyMatches, parsePdfLine } = require('./_extract');

test('D5: a minus glued to the digits or to the $ is negative', () => {
  assert.equal(moneyMatches('-2.00')[0].neg, true, 'a returned quantity');
  assert.equal(moneyMatches('$-59.00')[0].neg, true, 'a credited extension');
  assert.equal(moneyMatches('-$59.00')[0].neg, true, 'and the other way round');
});

test('⚠️ a dash in a DESCRIPTION is not a minus sign', () => {
  assert.equal(moneyMatches('BACON - RINDLESS MIDDLE 2.5KG 12.20')[0].neg, false,
    'if this were true, every line of every invoice from this supplier would refuse');
  assert.equal(moneyMatches('Bread - 4.50')[0].neg, false);
  assert.equal(moneyMatches('FZ CHIPS - S/CUT 10MM GF 6X2KG 29.50')[0].neg, false);
});

test('the amount, its position and its $ are unchanged for every existing caller', () => {
  const m = moneyMatches('BUNS 4 52.12 208.48');
  assert.equal(m.length, 2);
  assert.equal(m[0].val, 52.12);
  assert.equal(m[1].val, 208.48);
  assert.equal(m[0].dollar, false);
  assert.equal(moneyMatches('$29.50')[0].dollar, true, 'the $ is what marks a price column in lineColumns');
  assert.equal(moneyMatches('1,234.50')[0].val, 1234.50, 'thousands separators still parse');
});

test('D5: the real credit line refuses instead of pricing', () => {
  const r = parsePdfLine('13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN LAND -2.00 -2.00 CTN $29.50 $-59.00');
  assert.equal(r.needManual, true, 'flagged for a human');
  assert.equal(r.unitPrice, null, 'and NOT stored at $0.17/kg, which is what shipped');
  assert.equal(r.basis.kind, 'credit', 'the row says why it refused');
});

test('D5: one negative amount is enough — the whole line is suspect', () => {
  // The all-zero second row of a real credit page, and a reversal written the other way about.
  const r = parsePdfLine('90210 RETURN - DAMAGED STOCK 1.00 1.00 CTN $18.40 $-18.40');
  assert.equal(r.needManual, true);
  assert.equal(r.unitPrice, null);
});

test('an ordinary purchase on the same layout is untouched', () => {
  const r = parsePdfLine('13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50');
  assert.equal(r.needManual, false);
  assert.ok(r.unitPrice > 0);
});
