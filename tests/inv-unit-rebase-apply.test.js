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
function runRow(opts) {
  const { product, row, typedPrice, typedQty, typedUnit, supplier, ticked } = opts;
  const calls = { setProduct: [], remembered: [], synced: [] };
  const fakeTr = {
    dataset: { i: '0' },
    querySelector(sel) {
      // the tick is a PARAMETER, not a constant. It defaults to ticked — the case the guard exists
      // for — but the untick case has to be RUN, not inferred from where a substring sits.
      if (sel === '.invAppr') return { checked: ticked !== false };
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
    /* 253: the loop now COLLECTS each price write so the completion message can count what the
       server kept rather than what the screen attempted. Declared here because the slice under test
       is the loop body, not the function around it. */
    var priceWrites = [];
    var kitchenIngredients = [];
    function cpbu(p){ return p.cost_per_base_unit; }
    function uid(pfx){ return pfx + '1'; }
    function nextKid(){ return 'K1'; }
    function kingNameAction(){ return { action:'none' }; }
    function collectNewItem(){ return null; }
    function normalizePhrase(s){ return String(s||'').toLowerCase().trim(); }
    function packPriceOf(){ return CTX.packPrice; }
    function invGstAdjust(v){ return v; }
    /* 253: returns a resolved write carrying the saved manifest, which is setProducts' real shape.
       A stub returning undefined would let the collection look fine while the thing the completion
       message reads was never there. CTX.savedIds decides which ids the server kept.
       (No backticks in this block - it is inside a template literal. Fourth time; see the note in
       docs/MAINTENANCE.md for why that is still not a rule.) */
    function setProduct(id, patch){
      calls.setProduct.push({ id:id, patch:patch });
      var keep = CTX.savedIds === undefined ? [id] : CTX.savedIds;
      return Promise.resolve({ data:[], error:null, saved:keep });
    }
    function rememberSupplierPhrase(sup, phrase, q, u){ calls.remembered.push({ q:q, u:u }); }
    function syncMemoryToProduct(pid, q, u){ calls.synced.push({ pid:pid, q:q, u:u }); }
    ${DEPS}
    var loop = ${sliceRowLoop()};
    return function(tr){ loop(tr); return { n:n, added:added, rebased:rebased, priceChanges:priceChanges, priceWrites:priceWrites }; };`);

  const out = factory({ calls, byId, invRows: [row], supplier: supplier || 'Bidfood',
                        packPrice: 12, savedIds: opts.savedIds })(fakeTr);
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

test('0b: an UNTICKED re-basing row is skipped by the tick check, not named by the guard', () => {
  /* The two exits must stay distinguishable: `rebased` names lines the user ASKED for and did not
     get, and the toast reads them out. Filling it with rows nobody ticked would announce a refusal
     of work the user never requested, on every import with one stale pack in it.

     ⚠️ THIS TEST WAS AN ORDER-ONLY SUBSTRING CHECK — `indexOf('!appr.checked') < indexOf('invUnitRebase')`
     — and the pre-push review killed it on sight as roster 167(a)/(b): it measures where two strings
     sit in the source, not what the loop does. Moving the tick check into a helper, or a refactor
     that merely put the literal earlier, would have left it green while the behaviour regressed.
     It now RUNS the loop with the box unticked, which is the only version that can go red. */
  const r = runRow({ product: FLOUR, row: flourRow(), typedPrice: '2.00',
                     typedQty: '6', typedUnit: 'ea', ticked: false });
  assert.deepEqual(r.rebased, [], 'a row nobody ticked is not a refusal — it was never requested');
  assert.deepEqual(r.calls.setProduct, [], 'and of course nothing is written');
  assert.equal(r.n, 0);
});


/* =============================================================================================
 * 253 / QUEUE item 90 — the completion message counts what the SERVER kept.
 *
 * Until this batch the summary fired synchronously off `n`, the count of rows the UI attempted, so
 * an import whose product upserts were all refused still said "Invoice imported · 36 prices".
 * `pushWrite` toasted each failure underneath it — so the user was told twice, once truthfully and
 * once not, which is a false completion rather than silent loss.
 *
 * `setProducts` resolves with a `saved` manifest, and these pin that the loop now KEEPS it. The
 * summary's own arithmetic is asserted separately below, because the two are different questions:
 * whether the verdict is collected, and whether the sentence reads it.
 * ========================================================================================== */

test('253: an applied row keeps its write, and the manifest names the product', async () => {
  /* The same shape as the BASELINE case above — a row in the product's own category, which applies
     in full. Reusing it means this test measures the manifest and not the rebase guard. */
  const row = { ...flourRow(), unit: 'kg', taughtUnit: 'kg' };
  const r = runRow({ product: FLOUR, row, typedPrice: '1.20', typedQty: '10', typedUnit: 'kg' });
  assert.strictEqual(r.n, 1, 'precondition: the row applied');
  assert.strictEqual(r.priceWrites.length, 1, 'and its write was collected, not discarded');
  assert.strictEqual(r.priceWrites[0].pid, 'P1');
  const saved = await r.priceWrites[0].write;
  assert.deepStrictEqual(saved.saved, ['P1'], 'the manifest is what the completion message counts');
});

test('253: a REFUSED write is collected too, and reports itself as not kept', async () => {
  /* The case the item asks for: writes that reject after Apply. The row still applied optimistically
     — that is the app's standing pattern and is not what changed — but the verdict now exists, so
     the sentence that claims success can wait for it. */
  const row = { ...flourRow(), unit: 'kg', taughtUnit: 'kg' };
  const r = runRow({ product: FLOUR, row, typedPrice: '1.20', typedQty: '10', typedUnit: 'kg', savedIds: [] });
  assert.strictEqual(r.n, 1, 'the screen still counts it as applied — the repaint stays optimistic');
  assert.strictEqual(r.priceWrites.length, 1);
  const saved = await r.priceWrites[0].write;
  assert.deepStrictEqual(saved.saved, [], 'and the server kept nothing, which the summary must say');
});

test('253: an UNAPPLIED row collects no write, so it cannot be counted either way', () => {
  /* The counterweight. If every row collected a write regardless, `kept` would be measured against
     a denominator that includes rows nobody applied — which reads as a partial failure on an import
     that did exactly what it was told. */
  const row = { ...flourRow(), unit: 'kg', taughtUnit: 'kg' };
  const r = runRow({ product: FLOUR, row, typedPrice: '1.20', typedQty: '10', typedUnit: 'kg', ticked: false });
  assert.strictEqual(r.n, 0);
  assert.deepStrictEqual(r.priceWrites, [], 'nothing applied, nothing to have a verdict about');
});
