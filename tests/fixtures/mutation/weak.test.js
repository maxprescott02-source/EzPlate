/*
 * A test file of exactly the kind this project has shipped ten times: green, plausible, and unable
 * to fail. It calls the function, asserts something true of every possible implementation, and pins
 * nothing at all. The mutation gate must report survivors against it.
 *
 * Driven by tests/mutation-gate.test.js; not part of `npm test`.
 */
const test = require('node:test');
const assert = require('node:assert');
const { priceMoved } = require('./app.js');

test('priceMoved answers with a boolean', () => {
  assert.strictEqual(typeof priceMoved(1, 2), 'boolean');
  assert.strictEqual(typeof priceMoved(1, 1), 'boolean');
});

test('priceMoved does not throw on the shapes the app passes it', () => {
  assert.doesNotThrow(() => priceMoved(null, 2.5));
  assert.doesNotThrow(() => priceMoved(2.5, ''));
});
