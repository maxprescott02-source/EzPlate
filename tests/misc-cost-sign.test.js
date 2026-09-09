/*
 * misc-cost-sign.test.js — 245, QUEUE item 19. A misc cost cannot be negative.
 *
 * THE DEFECT, measured in Chromium before it was fixed rather than reasoned about: `setMiscCost` was
 * `parseFloat(v)||0` with no sign guard, so typing "-2" into the builder's misc line put a $0.92
 * plate at **$-1.08**, saved it there, and left "plate cost $-1.08" sitting in the Plates library.
 *
 * ⚠️ THE INPUT ALREADY CARRIED `min="0"` AND THE BROWSER ALREADY KNEW, which is the part worth
 * keeping. `validity.rangeUnderflow` was TRUE on that keystroke — `min` constrains the spinner and
 * form validation, the field is in no form, and the handler runs on `oninput`, so nothing asked.
 * A validity flag nobody reads is not a guard, and markup stating a constraint the code does not
 * enforce is worse than markup stating nothing, because it reads like the check. Both halves are
 * asserted here: the attribute is still on the element AND the function refuses independently of it.
 *
 * WHAT IS NOT HERE. The walk's half — that a negative line arriving from a restore is counted as
 * MISSING rather than summed — is in `tests/plate-cost.test.js`, beside the rest of `costDetail`,
 * because that is the file `tests/mutation/targets.js` names for it and a target's tests must be
 * where the gate looks. One defect, two guards, two files, and each file says so.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* The real `setMiscCost` against a plate array and a DOM stub. `updateTotals` and `money` are
   observed collaborators, not decisions re-implemented — what is under test is the value that ends
   up on the line. */
function harness(lines) {
  const C = { totals: 0, painted: [] };
  // eslint-disable-next-line no-new-func
  const api = new Function('C', 'LINES', `
    "use strict";
    var plate = LINES;
    var cell = { innerHTML: '' };
    var document = { getElementById: function(id){ return id.indexOf('lc-')===0 ? cell : null; } };
    function money(n){ C.painted.push(n); return '$' + Number(n).toFixed(2); }
    function updateTotals(){ C.totals++; }
    ${extractFn(SRC, 'setMiscCost')}
    return { setMiscCost: setMiscCost, cell: cell, plate: plate };
  `);
  const A = api(C, lines);
  A.calls = C;
  return A;
}

const line = () => [{ uid: 7, misc: true, label: 'Packaging', cost: 0.5 }];

test('245: a typed negative misc cost lands as zero, not as a discount', () => {
  const A = harness(line());
  A.setMiscCost(7, '-2');
  assert.strictEqual(A.plate[0].cost, 0, 'this was -2, and it went into the plate total');
  assert.strictEqual(A.cell.innerHTML, '$0.00', 'and the line repaints as what was actually kept');
  assert.strictEqual(A.calls.totals, 1, 'the total is still recomputed — the clamp is not an early return');
});

test('245: the values either side of the boundary are untouched', () => {
  const A = harness(line());
  A.setMiscCost(7, '0');
  assert.strictEqual(A.plate[0].cost, 0, 'zero is a legitimate misc cost — addMiscCost seeds a line at it');
  A.setMiscCost(7, '2.5');
  assert.strictEqual(A.plate[0].cost, 2.5, 'a positive cost is stored exactly');
  A.setMiscCost(7, '0.01');
  assert.strictEqual(A.plate[0].cost, 0.01, 'and so is the smallest one the step allows');
});

test('245: a cleared or junk field is still zero, and never NaN', () => {
  /* `Math.max(0, parseFloat(v)||0)` — the `||0` is what was already there and is what stops a NaN
     reaching the plate. `Math.max(0, NaN)` is NaN, so removing it would put "$NaN" on the builder
     and drop the plate out of every average: the clamp had to go OUTSIDE it, not instead of it. */
  const A = harness(line());
  ['', 'free', null, undefined, '-'].forEach((v) => {
    A.setMiscCost(7, v);
    assert.strictEqual(A.plate[0].cost, 0, JSON.stringify(v) + ' must be 0');
    assert.ok(!isNaN(A.plate[0].cost));
  });
});

test('245: a negative typed at a line that is not there is a no-op, not a throw', () => {
  const A = harness(line());
  A.setMiscCost(999, '-2');
  assert.strictEqual(A.plate[0].cost, 0.5, 'the real line is untouched');
  assert.strictEqual(A.calls.totals, 0, 'and nothing was recomputed');
});

test('245: the markup still states the constraint the function now enforces', () => {
  /* Both, deliberately. The attribute is what a person sees the spinner obey and what a paste into
     a form would be validated against; the function is what actually holds. Deleting either while
     keeping the other is how this defect existed in the first place. */
  assert.match(extractFn(SRC, 'miscRowHtml'), /misc-costbox[\s\S]*?<input type="number" min="0" step="0\.01"/,
    'the misc cost input still declares min="0"');
  assert.match(extractFn(SRC, 'setMiscCost'), /Math\.max\(0,/,
    'and the handler clamps rather than trusting it');
});

test('245: its two numeric siblings on the same screen still guard, so this is one rule and not one patch', () => {
  /* The clamp shape was chosen to match `setQty`, one screen up, rather than invented. If either of
     these three ever stops guarding, the screen has an unguarded number again — which is exactly the
     state item 19 described, and it was one of three rather than a lone oversight. */
  assert.match(extractFn(SRC, 'setQty'), /Math\.max\(0,/, 'setQty clamps a quantity');
  assert.match(extractFn(SRC, 'commitPrice'), /v>=0/, 'commitPrice refuses a negative unit price');
  assert.match(extractFn(SRC, 'setMiscCost'), /Math\.max\(0,/, 'and setMiscCost now clamps a misc cost');
});
