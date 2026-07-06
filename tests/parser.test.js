/*
 * parser.test.js — locks in the invoice-parsing behaviour we've verified against
 * real Fruit Wagon + Bidfood invoices. If a future change breaks any of these,
 * `npm test` fails BEFORE it reaches your café.
 *
 * Run:  npm test        (or:  node --test)
 */
const test = require('node:test');
const assert = require('node:assert');
const { parsePdfLine } = require('./_extract.js');

// tiny helpers so each case reads like plain English
function perUnit(line) {
  const r = parsePdfLine(line);
  assert.ok(r, `expected a result for: ${line}`);
  return r;
}
function assertClose(actual, expected, line) {
  assert.ok(Math.abs(actual - expected) < 0.01, `expected ~${expected}, got ${actual}\n  line: ${line}`);
}

test('qty-1 weight lines price per kg', () => {
  const l = '77735 #BARRAMUNDI FLT 100/200 S/LESS (I) SEACREST 5kg CTN 1 82.83 82.83 82.83 0.00 82.83';
  const r = perUnit(l);
  assert.equal(r.unit, 'kg');
  assertClose(r.unitPrice, 82.83 / 5, l);
});

test('qty>1 lines use the pack price, NOT the quantity-inflated line total', async (t) => {
  await t.test('CHIPS 6x2.5kg carton x8 -> ~$2.68/kg (was $21.42 before the v17 fix)', () => {
    const l = '212966 #CHIPS 10MM STRAIGHT CUT SAFRIES 6x2.5kg CTN 8 40.17 40.17 321.36 0.00 321.36';
    const r = perUnit(l);
    assert.equal(r.unit, 'kg');
    assertClose(r.unitPrice, 40.17 / 15, l);
  });
  await t.test('BREAD BUNS 48x85gr carton x2 -> ~$12.77/kg (was $25.55)', () => {
    const l = '223576 #BREAD BUNS MILK 4.5" TIP TOP 48x85gr CTN 2 52.12 52.12 104.24 0.00 104.24';
    const r = perUnit(l);
    assert.equal(r.unit, 'kg');
    assertClose(r.unitPrice, 52.12 / (48 * 0.085), l);
  });
  await t.test('BEETROOT 3kg can x2 -> ~$3.11/kg', () => {
    const l = '214875 #BEETROOT SLICED DEWFRESH 3kg CAN 2 9.32 9.32 18.64 0.00 18.64';
    const r = perUnit(l);
    assertClose(r.unitPrice, 9.32 / 3, l);
  });
});

test('apostrophe-s pack counts price per unit', () => {
  // "105'S" = 105 slices per pack -> per-slice cost
  const l = "218662 #CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg PKT 1 21.29 21.29 21.29 0.00 21.29";
  const r = perUnit(l);
  assert.equal(r.unit, 'ea');
  assertClose(r.unitPrice, 21.29 / 105, l);
});

test('bare "Ns" shorthand on a weightless line prices per unit', () => {
  const l = 'Serviettes 400s 12.50';
  const r = perUnit(l);
  assert.equal(r.unit, 'ea');
  assertClose(r.unitPrice, 12.50 / 400, l);
});

test('non-product surcharge lines are excluded (return null)', async (t) => {
  await t.test('Fuel Levy', () => {
    assert.equal(parsePdfLine('1 92 Fuel Levy $3.30 $3.30'), null);
  });
});

test('simple 2-column invoice lines still parse', () => {
  const l = '1 190 Spinach BABY 1.5kg $20.00 $20.00';
  const r = perUnit(l);
  assert.equal(r.unit, 'kg');
  assertClose(r.unitPrice, 20 / 1.5, l);
});

test('genuinely ambiguous lines fall through to manual entry (not a wrong number)', () => {
  const r = parsePdfLine('1 405 Avocado - tray $34.00 $34.00');
  assert.ok(r && r.needManual === true, 'a tray with no size/count should need manual entry');
});
