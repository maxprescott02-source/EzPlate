/*
 * A declared test file that HANGS before any mutation is applied — a bug in the TEST, not a finding
 * about the code. Driven only by tests/mutation-gate.test.js's baseline-timeout case; not part of
 * `npm test`, and not listed as a target's test file anywhere in tests/mutation/targets.js.
 *
 * It exists because the first draft of the gate's timeout bounded every MUTANT and left the baseline
 * run — which happens first, every time — with no bound at all. The pre-push review reproduced the
 * hang against the shipped function. This is that reproduction, kept.
 */
const test = require('node:test');

test('this test never finishes, on purpose', () => {
  const until = Date.now() + 600000;
  while (Date.now() < until) { /* spin: a real hang, not a sleep the runner could skip */ }
});
