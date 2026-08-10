/*
 * inv-attention.test.js — locks in the "needs attention" price-jump flag (v32 Item 7).
 *
 * Regression guard for the bug where a matched invoice line with a clearly
 * different unit price failed to turn red. The flag itself (flagNeedsAttention)
 * was arithmetically correct; the real bug was that editing the price inline never
 * re-ran it (fixed in renderInvReview's .invPrice change handler). These tests pin
 * the flag's logic so a future refactor can't silently break the >12% rule, the
 * unit-category scaling, or the mismatch / needManual conditions.
 *
 * flagNeedsAttention is extracted from the REAL shipped js/app.js (brace-matched),
 * then run with injected byId / cpbu / PRICE_JUMP — no second copy to drift.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

// build flagNeedsAttention with injectable dependencies
function buildFlag(products) {
  const src = loadApp();
  const fn = extractFn(src, 'flagNeedsAttention');
  // eslint-disable-next-line no-new-func
  const factory = new Function('BYID', `
    "use strict";
    var PRICE_JUMP = 0.12;
    var byId = BYID;
    function cpbu(p){ return p.cost_per_base_unit; }
    ${fn}
    return flagNeedsAttention;
  `);
  const byId = {};
  products.forEach(p => { byId[p.id] = p; });
  return factory(byId);
}

// a product whose stored price, expressed in the row's unit, is `perRow`
function prod(id, base_unit, perRow) {
  const cpbu = (base_unit === 'g' || base_unit === 'ml') ? perRow / 1000 : perRow;
  return { id, base_unit, cost_per_base_unit: cpbu };
}

test('a >12% price difference flags for g / ml / ea products', () => {
  const products = [prod('G', 'g', 24.78), prod('M', 'ml', 9.99), prod('E', 'ea', 0.20)];
  const flag = buildFlag(products);
  for (const [id, unit, perRow] of [['G', 'kg', 24.78], ['M', 'l', 9.99], ['E', 'ea', 0.20]]) {
    const row = { bestId: id, unitPrice: perRow * 1.30, unit, needManual: false, unitMismatch: false, remembered: false };
    flag(row);
    assert.equal(row.needsAttention, true, `${unit}: +30% should flag`);
  }
});

test('a price within 12% does NOT flag (small fluctuations must not nag)', () => {
  const products = [prod('G', 'g', 20.00)];
  const flag = buildFlag(products);
  const row = { bestId: 'G', unitPrice: 20.00 * 1.05, unit: 'kg', needManual: false, unitMismatch: false, remembered: false };
  flag(row);
  assert.equal(row.needsAttention, false, '+5% should stay quiet');
});

test('a unit mismatch always flags', () => {
  const flag = buildFlag([prod('G', 'g', 20)]);
  const row = { bestId: 'G', unitPrice: 20, unit: 'kg', needManual: false, unitMismatch: true, remembered: false };
  flag(row);
  assert.equal(row.needsAttention, true);
});

test('needManual flags unless the pack is remembered', () => {
  const flag = buildFlag([prod('G', 'g', 20)]);
  const unresolved = { bestId: 'G', unitPrice: 20, unit: 'kg', needManual: true, unitMismatch: false, remembered: false };
  flag(unresolved);
  assert.equal(unresolved.needsAttention, true, 'needManual + not remembered -> flag');
  const remembered = { bestId: 'G', unitPrice: 20, unit: 'kg', needManual: true, unitMismatch: false, remembered: true };
  flag(remembered);
  assert.equal(remembered.needsAttention, false, 'needManual + remembered -> quiet');
});

test('a matched product with no stored price does not crash and does not flag on price alone', () => {
  const flag = buildFlag([{ id: 'N', base_unit: 'unknown', cost_per_base_unit: null }]);
  const row = { bestId: 'N', unitPrice: 9.99, unit: 'kg', needManual: false, unitMismatch: false, remembered: false };
  assert.doesNotThrow(() => flag(row));
  assert.equal(row.needsAttention, false, 'no baseline to compare -> no false red');
});
