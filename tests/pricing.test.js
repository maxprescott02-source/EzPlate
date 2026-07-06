/*
 * pricing.test.js — locks in the ingredient pack-price -> unit-cost maths.
 * This is the calc behind the "tomatoes 10kg for $65 showed as $65/kg instead
 * of $6.50/kg" bug. If it ever regresses, this fails immediately.
 *
 * Run:  npm test        (or:  node --test)
 */
const test = require('node:test');
const assert = require('node:assert');
const { packToUnitCost } = require('./_extract.js');

function assertClose(actual, expected, msg) {
  assert.ok(Math.abs(actual - expected) < 0.001, `${msg}: expected ~${expected}, got ${actual}`);
}

test('THE tomatoes case: 10 kg pack for $65 -> $6.50/kg (not $65/kg)', () => {
  const r = packToUnitCost(10, 'kg', 65);
  assert.equal(r.dispUnit, 'kg');
  assertClose(r.dispPer, 6.50, 'display per kg');
  assert.equal(r.base_unit, 'g');
  assertClose(r.cost_per_base_unit, 0.0065, 'cost per gram'); // 65 / 10000 g
});

test('grams pack: 100 g for $5.18 -> $51.80/kg', () => {
  const r = packToUnitCost(100, 'g', 5.18);
  assert.equal(r.dispUnit, 'kg');
  assertClose(r.dispPer, 51.80, 'display per kg');
});

test('volume: 2 L for $3.20 -> $1.60/L, cost per ml correct', () => {
  const r = packToUnitCost(2, 'l', 3.20);
  assert.equal(r.dispUnit, 'L');
  assertClose(r.dispPer, 1.60, 'display per L');
  assert.equal(r.base_unit, 'ml');
  assertClose(r.cost_per_base_unit, 0.0016, 'cost per ml');
});

test('count: 500 units for $19.64 -> ~$0.0393/unit', () => {
  const r = packToUnitCost(500, 'ea', 19.64);
  assert.equal(r.dispUnit, 'unit');
  assertClose(r.dispPer, 19.64 / 500, 'per unit');
  assert.equal(r.base_unit, 'ea');
});

test('invalid input returns null (blocks a bad save rather than guessing)', () => {
  assert.equal(packToUnitCost(0, 'kg', 65), null);   // zero size
  assert.equal(packToUnitCost(10, 'kg', ''), null);  // no price
  assert.equal(packToUnitCost('', 'kg', 65), null);  // no size
});
