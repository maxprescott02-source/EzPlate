/*
 * A test file that really does pin every condition in the fixture. The mutation gate must report
 * ZERO survivors against it. Driven by tests/mutation-gate.test.js; not part of `npm test`.
 */
const test = require('node:test');
const assert = require('node:assert');
const { priceMoved } = require('./app.js');

test('a non-number is refused, however finite it looks', () => {
  assert.strictEqual(priceMoved(1, ''), false);      // isFinite('') is TRUE — the type check is the guard
  assert.strictEqual(priceMoved(1, null), false);
  assert.strictEqual(priceMoved(1, Infinity), false);
});

test('the same price twice has not moved', () => {
  assert.strictEqual(priceMoved(2.5, 2.5), false);
});

test('a different price has moved, and a first observation counts as a move', () => {
  assert.strictEqual(priceMoved(2.5, 2.6), true);
  assert.strictEqual(priceMoved(null, 2.5), true);
  assert.strictEqual(priceMoved(undefined, 0), true);   // zero is a real price
});
