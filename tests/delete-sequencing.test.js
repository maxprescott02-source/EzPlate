/*
 * delete-sequencing.test.js — v112.
 *
 * `menu_items.plate_id -> plates.id` carries NO delete action, so Postgres rejects (23503) any attempt to
 * remove a plates row while a dish still references it. Verified against the real database, not assumed:
 *
 *   ERROR: 23503: update or delete on table "plates" violates foreign key constraint
 *   "menu_items_plate_id_fkey" on table "menu_items"
 *
 * Until v112 `deletePlate` and `doDeleteEverything` fired the dish deletes and the plate delete as
 * unawaited pushWrites in one synchronous burst. The DISPATCH order was already right, so a test that
 * merely records call order passes against the broken code too — that is the trap this file avoids.
 * What actually changed is that the plate delete is no longer ISSUED until the dish deletes have
 * RESOLVED, so every ordering test below holds the dish deletes pending and asserts the plate delete has
 * not happened yet. Each of those fails against the pre-v112 code.
 *
 * The rest pins the honest-failure contract: after any failure the in-memory state matches what the
 * SERVER still holds, and the user is told in words that are true.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

const flush = () => new Promise(r => setTimeout(r, 0));

/* Dish deletes resolve only when the test says so, so "the plate delete has not been issued yet" is an
   observable fact rather than a guess about timing. */
function makeHarness(opts) {
  const S = {
    log: [],                                   // every server call, in the order it was ISSUED
    pendingDish: [],                           // resolvers for the in-flight dish deletes
    failDish: opts.failDish || [],
    failPlate: !!opts.failPlate,
    rejectDish: opts.rejectDish || [],
    rejectPlate: !!opts.rejectPlate,
    holdDishes: !!opts.holdDishes,
    toasts: [],
    changes: [],                               // v114: change-log kinds actually written
    savedPlates: opts.savedPlates,
    customMenu: opts.customMenu,
    menusList: opts.menusList || [{ id: 'MENU_ORIGINAL', name: 'Original' }],
    loadedPlateId: opts.loadedPlateId || null,
    confirmFn: null,
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var savedPlates=S.savedPlates, customMenu=S.customMenu, menusList=S.menusList, loadedPlateId=S.loadedPlateId;
    var MENU=[], menuById={}, delChoiceId=null;
    function rebuildMenu(){ MENU=customMenu.slice(); menuById={}; MENU.forEach(function(m){menuById[m.id]=m;}); }
    function toast(m){ S.toasts.push(m); }
    function askConfirm(t,msg,label,fn){ S.confirmFn=fn; }
    function esc(s){ return String(s); }
    function fmt2(n){ return String(n); }
    function buildMenuOptions(){} function buildMenuSelector(){} function updateEditTag(){}
    function renderPlate(){} function renderAnalysis(){} function renderPlatesTab(){}
    function closeDelChoice(){ S.log.push('closeDelChoice'); }
    /* v114: the change log rides these paths. Stubbed rather than extracted — this file is about the
       ORDER of the server calls, not about the log's own shape (tests/change-log.test.js owns that) —
       but recorded, because "a rolled-back delete writes NO entry" is an honest-failure contract and
       this is the only file that can exercise every failure shape. */
    function computeAvgFoodCost(){ return 30; }
    function logHistory(){}   // v115: path 11 logs a trend point in the success branch — stubbed silent here because these tests compare S.log EXACTLY; the point that lands is owned by tests/history-paths.test.js
    function logChange(kind,o){ S.changes.push(kind); return o; }
    function logChangeIfSaved(w,kind,o){
      return Promise.resolve(w).then(function(r){ if(!r||r.error) return null; return logChange(kind,o); }, function(){ return null; });
    }
    function dbDeleteMenu(id){
      S.log.push('dish:'+id);
      if(S.rejectDish.indexOf(id)>=0) return Promise.reject(new Error('connection reset'));   // 180: same, for the dish handler
      var bad=S.failDish.indexOf(id)>=0;
      var res=bad?{error:{message:'dish delete failed'}}:{error:null};
      if(!S.holdDishes) return Promise.resolve(res);
      return new Promise(function(resolve){ S.pendingDish.push(function(){ resolve(res); }); });
    }
    function dbDeletePlate(id){
      S.log.push('plate:'+id);
      // 180: rejectPlate drives the belt-and-braces REJECTION handler. pushWrite always resolves, so
      // nothing in the app can reach it today — which is exactly why it was unpinned, and why its
      // status object could be mutated to claim the plate was deleted with no test noticing.
      if(S.rejectPlate) return Promise.reject(new Error('connection reset'));
      return Promise.resolve(S.failPlate?{error:{message:'violates foreign key constraint'}}:{error:null});
    }
    ${extractFn(SRC, 'menuIdOf')}
    ${extractFn(SRC, 'dishOnMenu')}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'dishesOfPlate')}
    ${extractFn(SRC, 'menusOfPlate')}
    ${extractFn(SRC, 'forgetMenuItems')}
    ${extractFn(SRC, 'removeMenuItem')}
    ${extractFn(SRC, 'dbDeletePlateAfterDishes')}
    ${extractFn(SRC, 'rollbackPlateDelete')}
    ${extractFn(SRC, 'deletePlate')}
    ${extractFn(SRC, 'doDeleteEverything')}
    rebuildMenu();
    return {
      deletePlate: function(id){ deletePlate(id); if(S.confirmFn) S.confirmFn(); },
      doDeleteEverything: function(dishId){ delChoiceId=dishId; doDeleteEverything(); },
      sequence: function(dishIds, plateId){ return dbDeletePlateAfterDishes(dishIds, plateId); },   // 180: the status object itself
      state: function(){ return { savedPlates:savedPlates, customMenu:customMenu, loadedPlateId:loadedPlateId }; }
    };
  `);
  return { S, api: factory(S) };
}

const twoDishOnePlate = () => ({
  savedPlates: [{ id: 'SP1', name: 'Fish & Chips', lines: [{ kid: 'K1', qty: 100 }] }],
  customMenu: [
    { id: 'D1', name: 'F&C', price: 18, menuId: 'MENU_ORIGINAL', plateId: 'SP1', custom: true },
    { id: 'D2', name: 'F&C winter', price: 21, menuId: 'MW', plateId: 'SP1', custom: true },
  ],
  menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MW', name: 'Winter' }],
});

/* ---- 1. the ordering itself (each of these fails against pre-v112 fire-and-forget) ---- */

test('v112: deletePlate does NOT issue the plate delete until every dish delete has resolved', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { holdDishes: true }));
  api.deletePlate('SP1');
  await flush();
  assert.deepEqual(S.log, ['dish:D1', 'dish:D2'], 'both dish deletes are in flight');
  assert.ok(!S.log.some(c => c.startsWith('plate:')), 'the PLATE delete has not been issued — this is the whole fix');
  S.pendingDish.forEach(fn => fn());
  await flush();
  assert.deepEqual(S.log, ['dish:D1', 'dish:D2', 'plate:SP1'], 'only once the dishes are gone does the plate go');
});

test('v112: doDeleteEverything sequences the same way', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { holdDishes: true }));
  api.doDeleteEverything('D1');
  await flush();
  assert.ok(!S.log.some(c => c.startsWith('plate:')), 'the plate delete waits for the dishes');
  S.pendingDish.forEach(fn => fn());
  await flush();
  assert.strictEqual(S.log[S.log.length - 1], 'plate:SP1', 'the plate is deleted LAST');
});

test('v112: a plate on no menu still deletes — with no dishes there is nothing to wait for', async () => {
  const { S, api } = makeHarness({ savedPlates: [{ id: 'SP9', name: 'Unpublished', lines: [] }], customMenu: [] });
  api.deletePlate('SP9');
  await flush();
  assert.deepEqual(S.log, ['plate:SP9']);
  assert.deepEqual(api.state().savedPlates, [], 'the plate is gone');
});

/* ---- 2. the happy path still ends up empty, and says so ---- */

test('v112: a clean delete removes every dish and the plate, and the toast confirms it', async () => {
  const { S, api } = makeHarness(twoDishOnePlate());
  api.deletePlate('SP1');
  await flush();
  const st = api.state();
  assert.deepEqual(st.savedPlates, [], 'the plate is gone');
  assert.deepEqual(st.customMenu, [], 'both dishes are gone');
  // /deleted/ alone would also match "has NOT been deleted" — the failure wording must be excluded, or
  // this assertion passes on exactly the outcome it exists to rule out.
  assert.ok(S.toasts.some(t => /deleted/.test(t) && !/NOT been deleted/.test(t)),
    'the user is told it WAS deleted, not that it was not');
});

/* ---- 3. honest failure: what is on screen matches what is on the server ---- */

test('v112: if a dish delete fails, the plate is never touched and NOTHING is left deleted', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { failDish: ['D1', 'D2'] }));
  api.deletePlate('SP1');
  await flush();
  assert.ok(!S.log.some(c => c.startsWith('plate:')), 'the plate delete is never issued — it would have 23503d');
  const st = api.state();
  assert.deepEqual(st.savedPlates.map(p => p.id), ['SP1'], 'the plate is back in the library');
  assert.deepEqual(st.customMenu.map(d => d.id).sort(), ['D1', 'D2'], 'both dishes are back');
  assert.ok(S.toasts.some(t => /NOT been deleted/.test(t)), 'the user is told it was NOT deleted');
});

test('v112: if only ONE dish delete fails, only that dish comes back — the one that succeeded stays gone', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { failDish: ['D2'] }));
  api.deletePlate('SP1');
  await flush();
  const st = api.state();
  assert.deepEqual(st.customMenu.map(d => d.id), ['D2'], 'the FAILED dish is restored; the deleted one is not resurrected');
  assert.deepEqual(st.savedPlates.map(p => p.id), ['SP1'], 'the plate survives, because it was never deleted');
  assert.ok(!S.log.some(c => c.startsWith('plate:')));
});

test('v112: dishes deleted but the plate delete fails — the dishes stay gone and the plate comes back', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { failPlate: true }));
  api.deletePlate('SP1');
  await flush();
  const st = api.state();
  assert.deepEqual(st.customMenu, [], 'the menu entries really were removed — do not claim otherwise');
  assert.deepEqual(st.savedPlates.map(p => p.id), ['SP1'], 'the plate is back, because the server still has it');
  assert.ok(S.toasts.some(t => /still in your Plates library/.test(t)), 'the toast names the half that did not happen');
});

test('v112: a rolled-back plate that was open in the builder is re-selected, not left dangling', async () => {
  const { api } = makeHarness(Object.assign(twoDishOnePlate(), { failPlate: true, loadedPlateId: 'SP1' }));
  api.deletePlate('SP1');
  await flush();
  assert.strictEqual(api.state().loadedPlateId, 'SP1', 'loadedPlateId follows the plate back');
});

test('v112: doDeleteEverything reports honestly too', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { failPlate: true }));
  api.doDeleteEverything('D1');
  await flush();
  assert.deepEqual(api.state().savedPlates.map(p => p.id), ['SP1']);
  assert.ok(S.toasts.some(t => /still in your Plates library/.test(t)));
});

test('v112: a dish with no plate is deleted directly — no sequencing, no plate call', async () => {
  const { S, api } = makeHarness({
    savedPlates: [],
    customMenu: [{ id: 'D7', name: 'Uncosted', price: 5, menuId: 'MENU_ORIGINAL', custom: true }],
  });
  api.doDeleteEverything('D7');
  await flush();
  assert.deepEqual(S.log.filter(c => c !== 'closeDelChoice'), ['dish:D7'], 'one dish delete, no plate delete');
  assert.deepEqual(api.state().customMenu, []);
});

test('v112: a plateless dish whose delete FAILS is put back, and the toast says so', async () => {
  const { S, api } = makeHarness({
    savedPlates: [],
    customMenu: [{ id: 'D7', name: 'Uncosted', price: 5, menuId: 'MENU_ORIGINAL', custom: true }],
    failDish: ['D7'],
  });
  api.doDeleteEverything('D7');
  await flush();
  assert.deepEqual(api.state().customMenu.map(d => d.id), ['D7'], 'the dish is back — the server still has it');
  assert.ok(S.toasts.some(t => /NOT been deleted/.test(t)), 'and the user is told');
  assert.ok(!S.toasts.some(t => /deleted/.test(t) && !/NOT been deleted/.test(t)), 'it never claims success');
});

/* ---- 4. the helpers keep the property the callers depend on ---- */

test('v112: dbDeleteMenu and dbDeletePlate both RETURN their pushWrite promise', () => {
  // Without this there is nothing to chain, which is precisely why the pre-v112 code could not sequence.
  assert.match(extractFn(SRC, 'dbDeleteMenu'), /return pushWrite\(/, 'dbDeleteMenu returns its write');
  assert.match(extractFn(SRC, 'dbDeletePlate'), /return pushWrite\(/, 'dbDeletePlate returns its write');
});

test('v112: removeMenuItem still drops the row locally AND deletes it server-side', () => {
  const S = { menu: [{ id: 'D1' }, { id: 'D2' }], deleted: [] };
  // eslint-disable-next-line no-new-func
  const run = new Function('S', `
    "use strict";
    var customMenu=S.menu;
    function dbDeleteMenu(id){ S.deleted.push(id); return Promise.resolve({error:null}); }
    ${extractFn(SRC, 'forgetMenuItems')}
    ${extractFn(SRC, 'removeMenuItem')}
    removeMenuItem('D1');
    return customMenu;
  `);
  const left = run(S);
  assert.deepEqual(left.map(d => d.id), ['D2'], 'splitting out forgetMenuItems did not change what it removes');
  assert.deepEqual(S.deleted, ['D1'], 'and the server row is still deleted');
});

/* ---- 6. the STATUS OBJECT dbDeletePlateAfterDishes resolves to (180) ----

   Everything above pins the order of the calls. What comes BACK from them was unpinned: the mutation
   gate flipped `dishesOk`, `plateOk` and each dish's `ok` to their opposites in three of the four
   exit paths and this file stayed green, because every test reads S.log and none reads the result.

   That object is not bookkeeping. `deletePlate` spends it: `rollbackPlateDelete` puts back exactly
   what the server kept, and a delete that SUCCEEDED is never resurrected because a sibling failed.
   A wrong `plateOk:true` therefore drops a plate from the library that is still in the database, and
   a wrong `dishesOk:true` skips the rollback for dishes that were never deleted.

   Two of the four paths are the rejection handlers, which nothing in the app can reach today —
   pushWrite always resolves. They exist because if one ever DID reject, the caller's .then would
   never run and the UI would sit in the optimistic deleted state with no rollback and no word to the
   user. Unreachable is why they were untested; it is not a reason to let them be wrong. */

test('180: every dish deleted, plate deleted — the all-clear', async () => {
  const { api } = makeHarness(twoDishOnePlate());
  assert.deepEqual(await api.sequence(['D1', 'D2'], 'SP1'),
    { dishesOk: true, failedDishIds: [], plateOk: true });
});

test('180: a failed dish names itself, and the plate is NOT touched', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOnePlate(), { failDish: ['D2'] }));
  assert.deepEqual(await api.sequence(['D1', 'D2'], 'SP1'),
    { dishesOk: false, failedDishIds: ['D2'], plateOk: false });
  assert.ok(!S.log.some(c => c.startsWith('plate:')), 'and the FK-protected plate delete was never issued');
});

test('180: a REJECTED dish delete counts as failed, not as done', async () => {
  const { api } = makeHarness(Object.assign(twoDishOnePlate(), { rejectDish: ['D1'] }));
  assert.deepEqual(await api.sequence(['D1', 'D2'], 'SP1'),
    { dishesOk: false, failedDishIds: ['D1'], plateOk: false });
});

test('180: a REJECTED plate delete reports plateOk false while keeping the dishes gone', async () => {
  const { api } = makeHarness(Object.assign(twoDishOnePlate(), { rejectPlate: true }));
  assert.deepEqual(await api.sequence(['D1', 'D2'], 'SP1'),
    { dishesOk: true, failedDishIds: [], plateOk: false },
    'the dishes really were deleted — resurrecting them because the plate failed would be the wrong rollback');
});

test('180: a plate with no dishes goes straight to the plate delete', async () => {
  const { S, api } = makeHarness(twoDishOnePlate());
  assert.deepEqual(await api.sequence([], 'SP1'), { dishesOk: true, failedDishIds: [], plateOk: true });
  assert.deepEqual(S.log, ['plate:SP1']);
});
