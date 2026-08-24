/*
 * The declared test file for the fixture's `countDown`. It pins the value, and it deliberately does
 * NOT set a per-test timeout — because the point of the gate's own bound is that it holds even when
 * the test file has no defence of its own, which is the state every test file in this repo is in.
 * Driven by tests/mutation-gate.test.js; not part of `npm test`.
 */
const test = require('node:test');
const assert = require('node:assert');
const { countDown } = require('./app.js');

test('countDown takes one step per unit', () => {
  assert.strictEqual(countDown(4), 4);
  assert.strictEqual(countDown(1), 1);
  assert.strictEqual(countDown(0), 0);
});
