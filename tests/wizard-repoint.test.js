/*
 * wizard-repoint.test.js — v55 §H: repointing an ingredient away from product P parks P in the setup
 * wizard's "Skipped (N)" list instead of re-proposing it as an unlinked product to nag about.
 *
 * Against the REAL shipped parkRepointedProduct (brace-extracted from js/app.js). The `proposable` /
 * `unskip` helpers mirror the app's own wizard filter (`!kingWizSkip[id]`) and Unskip (`delete …`).
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

function makeWizard() {
  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    var kingWizSkip = {};
    var saved = 0;
    function saveKingWizSkips(){ saved++; }
    ${extractFn(SRC, 'parkRepointedProduct')}
    return {
      park: parkRepointedProduct,
      proposable: function(id){ return !kingWizSkip[id]; },   // the wizard's unlinked-proposal filter
      unskip: function(id){ delete kingWizSkip[id]; },        // the Unskip action
      skips: function(){ return Object.keys(kingWizSkip); },
      saves: function(){ return saved; },
    };
  `);
  return factory();
}

test('v55 §H: repointing away parks the old product and stops it being proposed', () => {
  const w = makeWizard();
  w.park('P_old');
  assert.deepStrictEqual(w.skips(), ['P_old'], 'the old product is now in Skipped');
  assert.strictEqual(w.proposable('P_old'), false, 'and is no longer proposed as unlinked');
  assert.strictEqual(w.proposable('P_other'), true, 'other unlinked products are unaffected');
  assert.ok(w.saves() >= 1, 'the change is persisted');
});

test('v55 §H: Unskip recovers a parked product', () => {
  const w = makeWizard();
  w.park('P_old');
  w.unskip('P_old');
  assert.strictEqual(w.proposable('P_old'), true, 'Unskip brings it back into the proposal list');
  assert.deepStrictEqual(w.skips(), []);
});

test('v55 §H: a falsy pid is a safe no-op', () => {
  const w = makeWizard();
  w.park(null);
  w.park('');
  assert.deepStrictEqual(w.skips(), [], 'nothing parked for a missing pid');
});
