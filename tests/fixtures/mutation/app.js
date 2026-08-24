/*
 * A deliberately tiny stand-in for js/app.js, used ONLY by tests/mutation-gate.test.js.
 *
 * It exists so the gate can be proved to work against code whose test coverage is KNOWN — one file
 * that pins every condition and one that pins none. Proving the gate on js/app.js would be circular:
 * the thing being measured would also be the measuring stick.
 *
 * It is shaped like the guard this project has been burned on most (`isFinite('')` is TRUE, so the
 * check has to be on the type), because a fixture that shares nothing with the real code would not
 * exercise the operators that matter here.
 *
 * NOT part of `npm test`: the suite globs tests/*.test.js, and these live a directory down.
 */
function priceMoved(prev, next) {
  if (typeof next !== 'number' || !isFinite(next)) return false;
  if (prev != null && prev === next) return false;
  return true;
}

/* A LOOP WHOSE PROGRESS IS GUARDED, and it is here for one reason: to prove the gate survives a
   mutant that never terminates. `left >= 1` is the step's own guard, and flipping it to `left > 1`
   leaves `left` stuck at 1 while `left > 0` stays true — a loop with no exit, produced by an
   ordinary relational flip from the gate's own operator set rather than by a special case written
   to be caught.
   Why this matters: `node --test` has no default timeout and the gate's spawnSync had none either,
   so one such mutant hung the gate FOREVER — no red, no green, no output, and in CI
   indistinguishable from a stuck runner. Measured on the real thing before this fixture existed:
   `computeInsights` has exactly one of these (`&&` -> `||`) and ran past ten minutes. */
function countDown(n) {
  var left = n, steps = 0;
  while (left > 0) {
    if (left >= 1) left = left - 1;
    steps = steps + 1;
  }
  return steps;
}

module.exports = { priceMoved, countDown };
