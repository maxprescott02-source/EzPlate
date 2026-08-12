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

/* ---------------------------------------------------------------------------
 * 180 — the guard, not just the arithmetic.
 *
 * Everything above drives the >12% rule through rows that reach it. The mutation gate showed the
 * five-clause guard in front of it was almost entirely unpinned: `&&` could be `||` at any of four
 * positions, and `unitPrice>0` could be `>=`, without a single test changing. All five let a row
 * INTO the comparison that the guard exists to keep out, and the comparison then divides by a stored
 * price it was never allowed to assume — so the failure is not "a missing flag", it is a red row on
 * a line nothing is wrong with, or a crash in the middle of rendering the review.
 * --------------------------------------------------------------------------- */

test('180: a bestId that names no product is skipped, not dereferenced', () => {
  // A dangling match id is the shape a deleted product leaves behind. `byId[row.bestId]` is undefined,
  // so anything past the guard reads cost_per_base_unit off nothing and throws mid-render.
  const flag = buildFlag([prod('G', 'g', 20.00)]);
  const row = { bestId: 'GONE', unitPrice: 99.00, unit: 'kg', needManual: false, unitMismatch: false, remembered: false };
  assert.doesNotThrow(() => flag(row), 'a dangling product id must not take down the invoice review');
  assert.equal(row.needsAttention, false, 'and with nothing to compare against there is no price jump to report');
});

test('180: a zero invoice price is not a price jump, and a zero STORED price is not divided by', () => {
  const flag = buildFlag([prod('G', 'g', 20.00), prod('Z', 'ea', 0)]);

  const free = { bestId: 'G', unitPrice: 0, unit: 'kg', needManual: false, unitMismatch: false, remembered: false };
  flag(free);
  assert.equal(free.needsAttention, false, 'a zero on the invoice is a line to read, not a -100% move');

  // cur === 0 is the divide-by-zero: |x-0|/0 is Infinity, which is greater than any threshold, so
  // every line against a zero-priced product would flag forever.
  const cheap = { bestId: 'Z', unitPrice: 1.50, unit: 'ea', needManual: false, unitMismatch: false, remembered: false };
  flag(cheap);
  assert.equal(cheap.needsAttention, false, 'a product stored at 0 gives nothing to measure a jump against');
});

test('180: exactly +12% does NOT flag — the rule is MORE than 12%', () => {
  const flag = buildFlag([prod('E', 'ea', 100)]);
  const onTheLine = { bestId: 'E', unitPrice: 112, unit: 'ea', needManual: false, unitMismatch: false, remembered: false };
  flag(onTheLine);
  assert.equal(onTheLine.needsAttention, false, '12.0% is the threshold, not a jump past it');

  const over = { bestId: 'E', unitPrice: 112.01, unit: 'ea', needManual: false, unitMismatch: false, remembered: false };
  flag(over);
  assert.equal(over.needsAttention, true, 'and a hair over it does flag — the boundary is pinned from both sides');
});

test('180: a per-unit product is compared per unit, not scaled like a weight', () => {
  // The scaling ternary reads base_unit twice. Getting the SECOND branch wrong multiplies an `ea`
  // price by 1000, which flags every line for every per-unit product in the catalogue.
  const flag = buildFlag([prod('E', 'ea', 0.20)]);
  const row = { bestId: 'E', unitPrice: 0.21, unit: 'ea', needManual: false, unitMismatch: false, remembered: false };
  flag(row);
  assert.equal(row.needsAttention, false, '$0.20 -> $0.21 on an each-priced product is a 5% move, not a 1000x one');
});
