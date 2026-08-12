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

module.exports = { priceMoved };
