/*
 * inv-unit-rebase-apply.test.js — QUEUE 0b, the half that is a GATE rather than a signal.
 *
 * invRowState makes a re-basing row 'review', so it is never pre-ticked and it renders red with an
 * explanation. THAT IS NOT A GATE. `userTick` is honoured over the state on purpose — a user may
 * tick any row by hand — so the flag alone leaves the write reachable, which is this repo's own
 * "gating the last committing action is not a gate" trap pointing the other way.
 *
 * So this file EXECUTES applyInvoice's row loop, sliced out of the real js/app.js, against a ticked
 * re-basing row and asserts that setProduct is never called — not for the price, and not for the
 * pack. The pack half matters as much: a cross-category pack_unit written onto the product is the
 * same defect deferred to the NEXT import, where derivePackPrice hands it straight back as row.unit.
 *
 * A source-shaped assertion would not do here. Roster entries 167(a) and 167(b) are both tests that
 * matched the right substrings in the right order against code that did the wrong thing, and an
 * "the refusal appears before the write" check is exactly that shape.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* Slice the SECOND `…forEach(function(tr){…})` inside applyInvoice — the writing loop. (The first is
   the atomic new-item validation pass.) Balanced-brace scan, so a body change cannot silently
   truncate it; a missing anchor throws by name rather than testing nothing. */
function sliceRowLoop() {
  const ANCHOR = "document.querySelectorAll('#invReview tbody tr.inv-data').forEach(function(tr){";
  const start = SRC.indexOf('function applyInvoice(){');
  assert.ok(start >= 0, 'applyInvoice not found — update this anchor');
  const first = SRC.indexOf(ANCHOR, start);
  const second = SRC.indexOf(ANCHOR, first + ANCHOR.length);
  assert.ok(second > first && first > 0, 'applyInvoice no longer has two review-row loops — re-read it before touching this file');
  const open = SRC.indexOf('{', second + ANCHOR.length - 1);
  let depth = 0;
  for (let n = open; n < SRC.length; n++) {
    if (SRC[n] === '{') depth++;
    else if (SRC[n] === '}' && --depth === 0) return SRC.slice(SRC.indexOf('function(tr){', second), n + 1);
  }
  throw new Error('unbalanced braces in applyInvoice’s row loop');
}

const DEPS = ['unitCatCategory', 'unitToBaseFields', 'kingRepointGuard', 'invPriceUnit',
              'invUnitRebase', 'invDerivePackQty', 'memKey', 'normSupplier']
  .map(f => extractFn(SRC, f)).join('\n');

/* Run one review row through the REAL loop. Everything the loop reaches for is stubbed at the
   boundary — DOM, writers, id mint — and nothing that makes a DECISION is stubbed. */
function runRow({ product, row, typedPrice, typedQty, typedUnit, supplier }) {
  const calls = { setProduct: [], remembered: [], synced: [] };
  const fakeTr = {
    dataset: { i: '0' },
    querySelector(sel) {
      if (sel === '.invAppr') return { checked: true };              // the user ticked it by hand
      if (sel === '.invPrice') return { value: typedPrice };
      if (sel === '.pack-teach') {
        return { querySelector(s) {
          if (s === '.invPackQty') return { value: typedQty };
          if (s === '.invPackUnit') return { value: typedUnit };
          return null;
        } };
      }
      return null;
    },
  };
  const byId = {}; byId[product.id] = product;

  // eslint-disable-next-line no-new-func
  const factory = new Function('CTX', `"use strict";
    var calls = CTX.calls, byId = CTX.byId, invRows = CTX.invRows;
    var invSupplier = CTX.supplier, supplierMem = {}, specs = {};
    var n = 0, added = 0, learned = [], priceChanges = [], kingsMade = 0, kingRepoints = [], rebased = [];
    var kitchenIngredients = [];
    function cpbu(p){ return p.cost_per_base_unit; }
    function uid(pfx){ return pfx + '1'; }
    function nextKid(){ return 'K1'; }
    function kingNameAction(){ return { action:'none' }; }
    function collectNewItem(){ return null; }
    function normalizePhrase(s){ return String(s||'').toLowerCase().trim(); }
    function packPriceOf(){ return CTX.packPrice; }
    function invGstAdjust(v){ return v; }
    function setProduct(id, patch){ calls.setProduct.push({ id:id, patch:patch }); }
    function rememberSupplierPhrase(sup, phrase, q, u){ calls.remembered.push({ q:q, u:u }); }
    function syncMemoryToProduct(pid, q, u){ calls.synced.push({ pid:pid, q:q, u:u }); }
    ${DEPS}
    var loop = ${sliceRowLoop()};
    return function(tr){ loop(tr); return { n:n, added:added, rebased:rebased, priceChanges:priceChanges }; };`);

  const out = factory({ calls, byId, invRows: [row], supplier: supplier || 'Bidfood',
                        packPrice: 12 })(fakeTr);
  return { ...out, calls };
}

/* Max's line, in the shape that shipped: Flour Plain is stored per gram, and a pack taught as
   "6 ea" resolves cleanly — needManual false, unitMismatch false. */
const FLOUR = { id: 'P1', description: 'Flour Plain', base_unit: 'g', cost_per_base_unit: 0.0065,
                pack_qty: 6, pack_unit: 'ea' };
const flourRow = () => ({ name: 'FLOUR PLAIN 10KG', raw: 'FLOUR PLAIN 10KG 12.00 12.00',
  bestId: 'P1', addNew: false, unit: 'ea', unitPrice: 2, needManual: false, unitMismatch: false,
  packTaught: true, taughtQty: 6, taughtUnit: 'ea', remembered: false, tier: 'hi' });

test('0b: a re-basing row the user TICKED writes nothing at all', () => {
  const r = runRow({ product: FLOUR, row: flourRow(), typedPrice: '2.00',
                     typedQty: '6', typedUnit: 'ea' });
  assert.deepEqual(r.calls.setProduct, [],
    'not the price, and NOT the pack — a cross-category pack_unit is the same bug next import');
  assert.deepEqual(r.calls.remembered, [], 'supplier memory must not learn it either');
  assert.deepEqual(r.calls.synced, []);
  assert.equal(r.n, 0, 'the row is not counted as applied');
  assert.deepEqual(r.rebased, ['FLOUR PLAIN 10KG'], 'and it is NAMED, so the refusal can be said out loud');
});

test('0b: THE QUIET ONE — an ml product taught a kg pack writes nothing', () => {
  const oil = { id: 'P1', description: 'Oil Canola', base_unit: 'ml', cost_per_base_unit: 0.004 };
  const row = { name: 'CANOLA OIL 20L', raw: 'CANOLA OIL 20L 44.00 44.00', bestId: 'P1',
                addNew: false, unit: 'kg', unitPrice: 2.2, needManual: false, unitMismatch: false,
                packTaught: true, taughtQty: 20, taughtUnit: 'kg', tier: 'hi' };
  const r = runRow({ product: oil, row, typedPrice: '2.20', typedQty: '20', typedUnit: 'kg' });
  assert.deepEqual(r.calls.setProduct, [], 'ml → g keeps the magnitude plausible; nothing downstream can notice');
  assert.deepEqual(r.rebased, ['CANOLA OIL 20L']);
});

test('0b BASELINE: the SAME row in the product’s own category still applies in full', () => {
  /* Without this the test above passes against a loop that refuses everything, which is the failure
     mode a one-sided assertion cannot see. Same product, same price, one field different. */
  const row = { ...flourRow(), unit: 'kg', taughtUnit: 'kg' };
  const r = runRow({ product: FLOUR, row, typedPrice: '1.20', typedQty: '10', typedUnit: 'kg' });
  assert.deepEqual(r.rebased, [], 'nothing refused');
  assert.equal(r.n, 1, 'the price is applied');
  const price = r.calls.setProduct.filter(c => c.patch.cost_per_base_unit != null)[0];
  assert.ok(price, 'the price write must still happen');
  assert.equal(price.patch.base_unit, 'g');
  assert.equal(price.patch.cost_per_base_unit, 1.2 / 1000);
  const pack = r.calls.setProduct.filter(c => c.patch.pack_qty != null)[0];
  assert.ok(pack, 'the pack teach must still happen');
  assert.deepEqual([pack.patch.pack_qty, pack.patch.pack_unit], [10, 'kg']);
  assert.deepEqual(r.calls.remembered, [{ q: 10, u: 'kg' }]);
});

test('0b: an UNTICKED re-basing row is skipped by the tick check, not by the guard', () => {
  // The two exits must stay distinguishable: `rebased` names lines the user asked for and did not
  // get. Filling it with rows nobody ticked would toast about lines they never chose.
  const SRC_LOOP = sliceRowLoop();
  assert.ok(SRC_LOOP.indexOf('!appr.checked') < SRC_LOOP.indexOf('invUnitRebase'),
    'the tick check must come first, or the toast names rows the user never ticked');
});
