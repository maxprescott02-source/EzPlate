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
    failMenuRec: !!opts.failMenuRec,           // 254: the menus-row delete, the menu path's second write
    rejectMenuRec: !!opts.rejectMenuRec,       // 254: and its REJECTION arm — see the tests at the end
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
    var MENU=[], menuById={}, delChoiceId=null, currentMenuId=(S.menusList[0]&&S.menusList[0].id)||null;
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
    /* 254 - the menu path's own deciding write. Held pending like the dish deletes so "the menus row
       has not been deleted yet" is an observable fact rather than a guess about timing. */
    function dbDeleteMenuRecord(id){
      S.log.push('menurec:'+id);
      if(S.rejectMenuRec) return Promise.reject(new Error('connection reset'));
      return Promise.resolve(S.failMenuRec?{error:{message:'menu delete failed'}}:{error:null});
    }
    function setCurrentMenuId(v){ currentMenuId=v; }
    function updateMenuDelBtn(){}
    function repaintDashboardIfVisible(){}
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
    /* 188: the role guard both of these now open with. Extracted rather than stubbed — see
       CLAUDE.md on a stub written from the same belief as the code. */
    var businessRole='owner';
    ${extractFn(SRC, 'isOwner')}
    ${extractFn(SRC, 'ownerOnly')}
    ${extractFn(SRC, 'deletePlate')}
    ${extractFn(SRC, 'doDeleteEverything')}
    /* 254 - the MENU delete path. Same shape as the plate path above and extracted for the same
       reason: what changed is WHEN the second write is issued, so a stub would be deciding the very
       thing under test. */
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'dbDeleteMenuAfterDishes')}
    ${extractFn(SRC, 'rollbackMenuDelete')}
    ${extractFn(SRC, 'doDeleteMenu')}
    rebuildMenu();
    return {
      deletePlate: function(id){ deletePlate(id); if(S.confirmFn) S.confirmFn(); },
      doDeleteEverything: function(dishId){ delChoiceId=dishId; doDeleteEverything(); },
      sequence: function(dishIds, plateId){ return dbDeletePlateAfterDishes(dishIds, plateId); },   // 180: the status object itself
      doDeleteMenu: function(id, name){ return doDeleteMenu(id, name); },                            // 254
      menuSequence: function(dishIds, menuId){ return dbDeleteMenuAfterDishes(dishIds, menuId); },   // 254: the status object itself
      state: function(){ return { savedPlates:savedPlates, customMenu:customMenu, loadedPlateId:loadedPlateId,
                                  menusList:menusList, currentMenuId:currentMenuId }; },
      /* 254: what the SCREEN is showing. rebuildMenu is what turns customMenu into the rendered MENU,
         so a rollback that restores the arrays and forgets to repaint leaves the user looking at a
         menu the server still holds - state correct, screen lying. Without this the repaint was a
         gate survivor: every assertion above reads the arrays, which a missing repaint does not touch. */
      menuView: function(){ return MENU.map(function(m){ return m.id; }); }
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

/* =============================================================================================
 * 254 — THE MENU DELETE PATH, which until this batch had the defect v112 fixed for plates.
 *
 * `doDeleteMenu` fired one `removeMenuItem` per dish and then the menus-row delete, awaiting none of
 * them. The dispatch order was already dishes-first, which is exactly why this needed the harness
 * above rather than an order-recording test: CLAUDE.md's rule is that dispatching in the right order
 * is NOT sequencing, and a test that records call ORDER passes against the broken code.
 *
 * ⚠️ AND THE HAZARD IS NOT THE PLATE PATH'S. `menu_items.plate_id -> plates.id` is NO ACTION, so the
 * plate case fails LOUDLY with 23503. `menu_items.menu_id -> menus.id` is ON DELETE SET NULL (checked
 * against production: confdeltype 'n'), so the menu case fails SILENTLY — delete the menus row while a
 * dish delete is in flight and Postgres sets that dish's menu_id to NULL for you. If the dish's own
 * delete then fails, the row survives attached to no menu, on no screen, with no error raised.
 * Measured on production while writing this: 90 menu_items rows, 0 orphaned. Latent, not yet bitten.
 * ========================================================================================== */

const twoDishOneMenu = () => ({
  savedPlates: [{ id: 'SP1', name: 'Fish & Chips', lines: [] }, { id: 'SP2', name: 'Pie', lines: [] }],
  customMenu: [
    { id: 'D1', name: 'F&C', price: 18, menuId: 'MW', plateId: 'SP1', custom: true },
    { id: 'D2', name: 'Pie', price: 14, menuId: 'MW', plateId: 'SP2', custom: true },
    { id: 'D3', name: 'F&C', price: 18, menuId: 'MENU_ORIGINAL', plateId: 'SP1', custom: true },
  ],
  menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MW', name: 'Winter' }],
});

test('254: doDeleteMenu does NOT issue the menus-row delete until every dish delete has resolved', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { holdDishes: true }));
  api.doDeleteMenu('MW', 'Winter');
  await flush();
  assert.deepEqual(S.log, ['dish:D1', 'dish:D2'], 'both dish deletes are in flight');
  assert.ok(!S.log.some(c => c.startsWith('menurec:')),
    'the MENUS row delete has not been issued — this is the whole fix, and it is what stops SET NULL orphaning a dish');
  S.pendingDish.forEach(fn => fn());
  await flush();
  assert.deepEqual(S.log, ['dish:D1', 'dish:D2', 'menurec:MW'], 'only once the dishes are gone does the menu go');
});

test('254: a dish delete that FAILS means the menus row is never deleted at all', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { failDish: ['D2'] }));
  await api.doDeleteMenu('MW', 'Winter');
  assert.ok(!S.log.some(c => c.startsWith('menurec:')),
    'deleting the menu here is what would set the surviving dish menu_id to NULL — so it is not deleted');
  const st = api.state();
  assert.ok(st.menusList.some(m => m.id === 'MW'), 'the menu is back');
  assert.ok(st.customMenu.some(d => d.id === 'D2'), 'the dish whose delete FAILED is back');
  assert.ok(api.menuView().includes('D2'),
    'and the SCREEN was repainted to show it — restoring the array without redrawing leaves the user looking at a menu that is still there');
  assert.ok(!st.customMenu.some(d => d.id === 'D1'),
    'the dish whose delete SUCCEEDED is NOT resurrected — a delete that landed is never undone because a sibling failed');
  assert.deepEqual(S.changes, [], 'and nothing is written to the append-only change log');
});

test('254: a failed dish delete says so, and names how many plates did come off', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { failDish: ['D2'] }));
  await api.doDeleteMenu('MW', 'Winter');
  const last = S.toasts[S.toasts.length - 1];
  assert.match(last, /has NOT been deleted/, 'the menu survived and the words say so');
  assert.match(last, /1 plate did come off it/, 'and the one that DID go is named rather than glossed');
});

test('254: a failed MENUS-row delete puts the menu back, and does not resurrect its dishes', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { failMenuRec: true }));
  await api.doDeleteMenu('MW', 'Winter');
  assert.deepEqual(S.log, ['dish:D1', 'dish:D2', 'menurec:MW'], 'the dishes went first and did land');
  const st = api.state();
  assert.ok(st.menusList.some(m => m.id === 'MW'), 'the menu is back, because the server still holds it');
  assert.ok(!st.customMenu.some(d => d.id === 'D1' || d.id === 'D2'),
    'its dishes stay deleted — the server kept those deletes, so putting them back would be the lie');
  assert.ok(st.customMenu.some(d => d.id === 'D3'), 'the other menu is untouched throughout');
  assert.match(S.toasts[S.toasts.length - 1], /is empty now/, 'and the wording says which half failed');
  assert.deepEqual(S.changes, [], 'no menu_deleted entry for a menu that is still there');
});

test('254: the rolled-back menu returns to its ORIGINAL position, not the end of the list', async () => {
  const st0 = twoDishOneMenu();
  st0.menusList = [{ id: 'MW', name: 'Winter' }, { id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MS', name: 'Summer' }];
  const { api } = makeHarness(Object.assign(st0, { failMenuRec: true }));
  await api.doDeleteMenu('MW', 'Winter');
  assert.deepEqual(api.state().menusList.map(m => m.id), ['MW', 'MENU_ORIGINAL', 'MS'],
    'menusList is the order of the menu selector, so a rollback that reorders it is a second silent change on top of the failure');
});

test('254: the happy path writes ONE menu_deleted, and only after both writes landed', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { holdDishes: true }));
  api.doDeleteMenu('MW', 'Winter');
  await flush();
  assert.deepEqual(S.changes, [], 'nothing is logged while the writes are still in flight');
  S.pendingDish.forEach(fn => fn());
  await flush(); await flush();
  assert.deepEqual(S.changes, ['menu_deleted'], 'one decision, one entry');
  assert.ok(!api.state().menusList.some(m => m.id === 'MW'), 'and the menu stays gone');
});

test('254: a menu with NO dishes still sequences, and still deletes', async () => {
  const st0 = twoDishOneMenu();
  st0.customMenu = [{ id: 'D3', name: 'F&C', price: 18, menuId: 'MENU_ORIGINAL', plateId: 'SP1', custom: true }];
  const { S, api } = makeHarness(st0);
  await api.doDeleteMenu('MW', 'Winter');
  assert.deepEqual(S.log, ['menurec:MW'], 'no dish deletes to wait for, so the menu delete goes straight out');
  assert.deepEqual(S.changes, ['menu_deleted']);
});

/* ---- 254: the REJECTION arms, which the mutation gate found unpinned ----
   `pushWrite` RESOLVES with `{error}` rather than rejecting, so nothing in the app reaches these
   handlers today — which is exactly why they were unasserted, and exactly the trap roster 184(a)
   records: a promise has two settle paths, and a test that only takes the common one has pinned half
   a contract. In this codebase the uncommon path is the one that fires when the café has no signal.
   The plate path's own rejection arms are pinned two tests above for the same reason (180). */

test('254: a dish delete that REJECTS is a failure, not a success — the menu is not deleted', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { rejectDish: ['D2'] }));
  await api.doDeleteMenu('MW', 'Winter');
  assert.ok(!S.log.some(c => c.startsWith('menurec:')),
    'a thrown request must count as a failed dish, or a lost connection silently detaches the surviving dish');
  assert.ok(api.state().menusList.some(m => m.id === 'MW'), 'the menu is back');
  assert.deepEqual(S.changes, [], 'and nothing is logged');
});

test('254: a menus-row delete that REJECTS rolls back, and does not resurrect the dishes', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { rejectMenuRec: true }));
  await api.doDeleteMenu('MW', 'Winter');
  const st = api.state();
  assert.ok(st.menusList.some(m => m.id === 'MW'), 'a thrown menus-row delete is a FAILED delete, so the menu comes back');
  assert.ok(!st.customMenu.some(d => d.id === 'D1' || d.id === 'D2'),
    'its dishes stay gone — those deletes did land, and the rejection arm must not claim otherwise');
  /* The rejection arm reports dishesOk:TRUE, and that is the half a status object gets wrong most
     easily: the dishes DID succeed, only the menus row threw. Saying otherwise sends the user the
     other toast — "it has NOT been deleted, 2 plates did come off it" — which is false in both
     clauses. Asserting the words is what pins the field, because nothing else reads it. */
  assert.match(S.toasts[S.toasts.length - 1], /is empty now/,
    'the dishes landed, so the words must say the MENU failed rather than the whole delete');
  assert.deepEqual(S.changes, [], 'no menu_deleted for a menu that is still on the server');
});

/* ---- 254: the status object itself, mirroring 180's block above ----
   The object is the CONTRACT between the sequencer and its caller, and two of its three fields are
   unreadable from the caller on any given path — `doDeleteMenu`'s `r.dishesOk && r.menuOk`
   short-circuits, and `rollbackMenuDelete` reads only `dishesOk`. So a field can be wrong forever
   without any behavioural test noticing, which is precisely what the mutation gate reported. These
   assert the whole object, exactly as 180 does for the plate twin. */

test('254: the whole status object — everything landed', async () => {
  const { api } = makeHarness(twoDishOneMenu());
  assert.deepEqual(await api.menuSequence(['D1', 'D2'], 'MW'),
    { dishesOk: true, failedDishIds: [], menuOk: true });
});

test('254: the whole status object — a failed dish names itself, and menuOk is FALSE because the menu was never touched', async () => {
  const { S, api } = makeHarness(Object.assign(twoDishOneMenu(), { failDish: ['D2'] }));
  assert.deepEqual(await api.menuSequence(['D1', 'D2'], 'MW'),
    { dishesOk: false, failedDishIds: ['D2'], menuOk: false });
  assert.ok(!S.log.some(c => c.startsWith('menurec:')),
    'menuOk:false is a statement about a delete that was never ISSUED, not about one that failed');
});

test('254: the whole status object — the dishes went and the menus row did not', async () => {
  const { api } = makeHarness(Object.assign(twoDishOneMenu(), { failMenuRec: true }));
  assert.deepEqual(await api.menuSequence(['D1', 'D2'], 'MW'),
    { dishesOk: true, failedDishIds: [], menuOk: false });
});

test('254: the whole status object — no dishes to wait for', async () => {
  const { api } = makeHarness(twoDishOneMenu());
  assert.deepEqual(await api.menuSequence([], 'MW'), { dishesOk: true, failedDishIds: [], menuOk: true });
});
