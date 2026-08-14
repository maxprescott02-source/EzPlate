/*
 * history-paths.test.js — v115.
 *
 * v114 found that `logHistory` — the writer of the food-cost trend line — fired on only six of the
 * twelve change paths, so an ingredient repoint (the cheapest real intervention in the app) put no
 * point on the very line the dashboard draws. v115 closes the six gaps. This file pins them.
 *
 * Two things make this file necessary rather than nice:
 *   - EVERY other sandbox in the suite stubs `logHistory` as an empty function, so before this file
 *     nothing could catch a missing or misplaced call — and nothing would break if one were removed.
 *   - Two of the six sites have ordering traps: paths 10/12 must log AFTER rebuildMenu() (the average
 *     reads MENU, which is stale until then), and path 11 must log in the server-success branch (the
 *     in-memory delete precedes the await, so an optimistic point would survive the rollback as a
 *     phantom drop).
 *
 * Per the house doctrine (change-log.test.js, v111): nothing here asserts that a call happened. Every
 * test asserts THE POINT THAT LANDS in `priceHistory` — its presence, its absence, and its value,
 * which is what makes the stale-MENU mutation and the optimistic-vs-gated mutation both fail loudly.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

function kindsFromSource() {
  const m = SRC.match(/var CHANGE_KINDS\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error('history-paths: CHANGE_KINDS not found in app.js');
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/* ---------------------------------------------------------------------------------------------
 * The sandbox — change-log.test.js's harness with the HISTORY writers real instead of stubbed.
 * `logHistory`, `logMenuHistory`, `logAllMenuPrices`, `logMenuPrice` and `ptMs` are the shipped
 * bodies; what they push into `priceHistory` is what the tests read.
 * ------------------------------------------------------------------------------------------- */
function harness(opts) {
  opts = opts || {};
  const S = {
    histPushes: [],             // values that reached dbPushHistory — the SERVER's view of the line
    writes: [],
    toasts: [],
    fail: opts.fail || {},
    fields: opts.fields || {},
    confirmFn: null,
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var byId=${JSON.stringify(opts.byId || {})};
    var kById=${JSON.stringify(opts.kById || {})};
    var kitchenIngredients=${JSON.stringify(opts.kitchenIngredients || [])};
    var savedPlates=${JSON.stringify(opts.savedPlates || [])};
    var customMenu=${JSON.stringify(opts.customMenu || [])};
    var menusList=${JSON.stringify(opts.menusList || [{ id: 'MENU_ORIGINAL', name: 'Original' }])};
    var loadedPlateId=${JSON.stringify(opts.loadedPlateId || null)};
    var currentMenuId='MENU_ORIGINAL', delChoiceId=${JSON.stringify(opts.delChoiceId || null)};
    var kingEditId=${JSON.stringify(opts.kingEditId || null)}, kingChosenPid=${JSON.stringify(opts.kingChosenPid || null)};
    var kingAddToPlateOnSave=false, kingWizSkip={};
    var MENU=[], menuById={};
    var changeLog=[], changeLogSupported=true, _changeSeq=0, _changeTok='t';
    var priceHistory=[], menuHistory={}, menuPriceLog={};
    var menuHistSupported=true, menuPriceHistSupported=true;

    /* --- the network --- */
    function res(kind){ return Promise.resolve(S.fail[kind] ? {error:{message:kind+' write failed'}} : {ok:true}); }
    function dbDeleteMenu(id){ S.writes.push('delmenu:'+id); return res('menu'); }
    function dbDeletePlate(id){ S.writes.push('delplate:'+id); return res('plate'); }
    function dbDeleteMenuRecord(id){ S.writes.push('delmenurec:'+id); return res('menurec'); }
    function dbSetSetting(k,v){ S.writes.push('setting:'+k); return res('setting'); }
    function dbPushChange(e){ return res('changelog'); }
    function dbPushHistory(iso, v){ S.histPushes.push(v); }
    function dbPushMenuHistory(){} function dbPushMenuPrice(){}
    function pushWrite(){ throw new Error('pushWrite must not be reached'); }

    /* --- the DOM, and nothing else --- */
    function el(id){
      var f=S.fields[id];
      return { value:(f===undefined?'':String(f)), style:{}, textContent:'', focus:function(){},
               classList:{contains:function(){return false;}}, querySelectorAll:function(){return [];} };
    }
    var document={ getElementById:el, querySelector:function(){ return {focus:function(){}}; },
                   querySelectorAll:function(){ return []; } };
    function toast(m){ S.toasts.push(m); }
    function askConfirm(t,msg,label,fn){ S.confirmFn=fn; }
    function show(){} function hide(){} function esc(s){ return String(s); } function fmt2(n){ return String(n); }
    function renderPlate(){} function renderAnalysis(){} function renderPlatesTab(){} function renderKitchenPanel(){}
    function renderManageMenus(){} function rerenderCurrentTab(){} function renderDashboard(){}
    function buildMenuOptions(){} function buildMenuSelector(){}
    function updateEditTag(){} function updateMenuDelBtn(){}
    function closeDelChoice(){} function closeKingModal(){}
    function parkRepointedProduct(){} function unitCatWord(){ return 'weight'; }
    function cpbu(p){ return p.cost_per_base_unit; }
    function setCurrentMenuId(id){ currentMenuId=id; }
    function rebuildMenu(){ MENU=customMenu.slice(); menuById={}; MENU.forEach(function(m){ menuById[m.id]=m; }); }
    function rebuildKById(){ kById={}; kitchenIngredients.forEach(function(k){ if(k&&k.id) kById[k.id]=k; }); }

    /* --- real bodies, from the shipped file --- */
    /* 173: uid() is a shared dependency of every id-minting path below. Extracted, not stubbed:
       a hand-rolled counter here would agree with a broken generator and hide exactly the
       collision it exists to prevent (CLAUDE.md, "a stub that mirrors a real function must
       mirror its CONTRACT"). No backticks in this comment - it sits inside a template literal. */
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    var businessRole='owner';   // 188: the standing role these paths assume — see isOwner/ownerOnly below
    ${[
      'rowToChange', 'changeToRow', 'nextChangeId', 'changeEntry', 'logChange', 'logChangeIfSaved',
      'menuIdOf', 'dishOnMenu',
      'lineProduct', 'lineCost', 'costFromLines', 'plateIdOf', 'plateForMenuItem', 'dishesOfPlate', 'menusOfPlate',
      'platesUsingKid', 'menuIdsForPlates', 'fallbackMenuId',
      'avgFoodCostForScope', 'computeAvgFoodCost',
      'ptMs', 'logHistory', 'logMenuHistory', 'logAllMenuPrices', 'logMenuPrice', 'repaintDashboardIfVisible',
      'saveKitchenIngredients',
      'forgetMenuItems', 'removeMenuItem', 'mmRemove', 'doDeleteMenuOnly', 'doDeleteMenu',
      // 188: isOwner/ownerOnly are dependencies of deletePlate and doDeleteEverything now — EXTRACTED,
      // not stubbed, because a hand-rolled `return true` here would pass against a guard that was
      // silently inverted. businessRole defaults to 'owner', which is the role these paths assume.
      'isOwner', 'ownerOnly',
      'dbDeletePlateAfterDishes', 'rollbackPlateDelete', 'deletePlate', 'doDeleteEverything',
      'confirmGuardedRepoints', 'kingRepointGuard',
      'deleteKitchenIngredient', 'saveKingModal',
      'kingValid', 'kingRenameCheck', 'kingNameExists',
      // READ, never edited — CLAUDE.md hard rule 2 forbids changing unitCatCategory, not slicing it in.
      'unitCatCategory',
    ].map((n) => extractFn(SRC, n)).join('\n')}

    var CHANGE_KINDS=${JSON.stringify(kindsFromSource())};
    var DASH_ALL='all';
    rebuildMenu(); rebuildKById();
    return {
      priceHistory:function(){ return priceHistory; },
      menuHistory:function(){ return menuHistory; },
      avg:function(){ return computeAvgFoodCost(); },
      mmRemove:mmRemove, doDeleteMenuOnly:doDeleteMenuOnly, doDeleteMenu:doDeleteMenu,
      doDeleteEverything:doDeleteEverything,
      deletePlate:function(id){ deletePlate(id); if(S.confirmFn) S.confirmFn(); },
      confirmGuardedRepoints:function(l){ confirmGuardedRepoints(l); if(S.confirmFn) S.confirmFn(); },
      deleteKitchenIngredient:function(kid){ deleteKitchenIngredient(kid); if(S.confirmFn) S.confirmFn(); },
      saveKingModal:function(){ saveKingModal(); if(S.confirmFn) S.confirmFn(); },
    };
  `);
  return { S, api: factory(S) };
}

/* Two costed plates across two menus, so every delete path leaves SOMETHING costed — an average that
   collapses to null logs nothing, which would let a missing call hide behind an empty fixture. */
const threeDishes = () => ({
  byId: { P1: { id: 'P1', description: 'Chips', base_unit: 'g', cost_per_base_unit: 0.004 },
          P2: { id: 'P2', description: 'Chips (cheap)', base_unit: 'g', cost_per_base_unit: 0.002 },
          P3: { id: 'P3', description: 'Sauce', base_unit: 'g', cost_per_base_unit: 0.01 } },
  kById: { K1: { id: 'K1', name: 'Chips', pid: 'P1' }, K2: { id: 'K2', name: 'Sauce', pid: 'P3' } },
  kitchenIngredients: [{ id: 'K1', name: 'Chips', pid: 'P1' }, { id: 'K2', name: 'Sauce', pid: 'P3' }],
  savedPlates: [
    { id: 'SP1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 200 }] },   // $0.80
    { id: 'SP2', name: 'Burger', category: 'Mains', lines: [{ kid: 'K2', qty: 100 }] },          // $1.00
  ],
  customMenu: [
    { id: 'D1', name: 'F&C', price: 20, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: 'SP1', custom: true },   // 4%
    { id: 'D2', name: 'F&C winter', price: 24, section: 'Mains', menuId: 'MW', plateId: 'SP1', custom: true },       // 3.33%
    { id: 'D3', name: 'Burger', price: 25, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: 'SP2', custom: true },// 4%
  ],
  menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MW', name: 'Winter' }],
});
// starting average: (4 + 3.3333 + 4) / 3 = 3.7778 → logs as 3.8

/* =============================================================================================
 * Path 2 — ingredient repoint from the Ingredients tab
 * ========================================================================================== */

test('path 2: a repoint puts a point on the line, and the point is the NEW average', async () => {
  const { api } = harness(Object.assign(threeDishes(), {
    kingEditId: 'K1', kingChosenPid: 'P2', fields: { king_name: 'Chips' },
  }));
  api.saveKingModal();
  await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1, 'the cheapest real intervention in the app must move the trend line');
  assert.strictEqual(pts[0].v, 2.6, 'SP1 re-costs at $0.40: (2 + 1.67 + 4)/3 = 2.56 → 2.6 — the AFTER average, not the before');
});

test('path 2: a pure rename logs NOTHING — display-only, no cost can move', async () => {
  const { api } = harness(Object.assign(threeDishes(), {
    kingEditId: 'K1', kingChosenPid: 'P1', fields: { king_name: 'Chips (fries)' },
  }));
  api.saveKingModal();
  await flush();
  assert.deepStrictEqual(api.priceHistory(), [], 'a rename must not stipple the line with flat points');
});

/* =============================================================================================
 * Path 3 — the unit-type confirm (invoice repoint batch)
 * ========================================================================================== */

test('path 3: a confirmed batch of repoints logs ONE point, after EVERY repoint has landed', async () => {
  const { api } = harness(threeDishes());
  api.confirmGuardedRepoints([
    { kid: 'K1', pid: 'P2', name: 'Chips' },
    { kid: 'K2', pid: 'P2', name: 'Sauce' },
  ]);
  await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1, 'one confirm is one point — N points would stipple the line for one decision');
  assert.strictEqual(pts[0].v, 1.5, 'both repoints applied first: (2 + 1.67 + 0.8)/3 = 1.49 → 1.5');
});

/* =============================================================================================
 * Path 5 — ingredient deleted
 * ========================================================================================== */

test('path 5: deleting an ingredient logs the (lower) average its loss produces', async () => {
  const { api } = harness(threeDishes());
  api.deleteKitchenIngredient('K2');
  await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1);
  // SP2's only line stops costing, so D3 drops OUT of the average (c>0 filter) rather than counting $0.
  assert.strictEqual(pts[0].v, 3.7, '(4 + 3.33)/2 = 3.67 → 3.7 — a real fall with no saving behind it; the change-log entry explains it');
});

/* =============================================================================================
 * Path 10 — a plate taken off one menu (both doors). THE STALE-MENU TRAP.
 * The mutation is removeMenuItem + rebuildMenu; computeAvgFoodCost reads MENU. A call placed beside
 * the logChangeIfSaved (before rebuildMenu) computes 3.8 — the PRE-delete average — and only the
 * point's VALUE catches it.
 * ========================================================================================== */

test('path 10 (manage-menus): the point is the post-removal average, not the stale one', async () => {
  const { api } = harness(threeDishes());
  api.mmRemove('D2');
  await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1);
  assert.strictEqual(pts[0].v, 4, 'D2 gone: (4 + 4)/2 = 4 — a 3.8 here means logHistory ran before rebuildMenu()');
});

test('path 10 (menu tab): same contract through the other door', async () => {
  const { api } = harness(Object.assign(threeDishes(), { delChoiceId: 'D2' }));
  api.doDeleteMenuOnly();
  await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1);
  assert.strictEqual(pts[0].v, 4, 'a 3.8 here means logHistory ran before rebuildMenu()');
});

/* =============================================================================================
 * Path 11 — plate deleted. THE ONLY SUCCESS-GATED PATH.
 * The in-memory delete happens before the await, so the average is already the AFTER figure when the
 * server answers — but a point pushed before the answer would survive rollbackPlateDelete as a
 * phantom drop describing a delete that did not happen.
 * ========================================================================================== */

test('path 11: a clean plate delete logs the post-delete average', async () => {
  const { api } = harness(threeDishes());
  api.deletePlate('SP1');
  await flush(); await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1);
  assert.strictEqual(pts[0].v, 4, 'D1 and D2 went with the plate; only the Burger remains');
});

test('path 11: a FAILED plate delete logs NO point — the rollback restored the state the point would deny', async () => {
  const { api } = harness(Object.assign(threeDishes(), { fail: { plate: true } }));
  api.deletePlate('SP1');
  await flush(); await flush();
  assert.deepStrictEqual(api.priceHistory(), [],
    'the screen shows the plate back; a phantom drop on the chart would contradict it forever');
});

test('path 11 (delete-everything, linked): success logs, failure does not', async () => {
  const ok = harness(Object.assign(threeDishes(), { delChoiceId: 'D1' }));
  ok.api.doDeleteEverything();
  await flush(); await flush();
  assert.strictEqual(ok.api.priceHistory().length, 1);
  assert.strictEqual(ok.api.priceHistory()[0].v, 4);

  const bad = harness(Object.assign(threeDishes(), { delChoiceId: 'D1', fail: { plate: true } }));
  bad.api.doDeleteEverything();
  await flush(); await flush();
  assert.deepStrictEqual(bad.api.priceHistory(), []);
});

test('path 11 (delete-everything, unlinked row): gated on the dish delete', async () => {
  const st = threeDishes();
  st.customMenu.push({ id: 'D4', name: 'Mystery', price: 9, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: null, custom: true });
  const ok = harness(Object.assign(st, { delChoiceId: 'D4' }));
  ok.api.doDeleteEverything();
  await flush(); await flush();
  assert.strictEqual(ok.api.priceHistory().length, 1, 'an unlinked row is not in the average, but the delete is still an intervention that logs');

  const st2 = threeDishes();
  st2.customMenu.push({ id: 'D4', name: 'Mystery', price: 9, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: null, custom: true });
  const bad = harness(Object.assign(st2, { delChoiceId: 'D4', fail: { menu: true } }));
  bad.api.doDeleteEverything();
  await flush(); await flush();
  assert.deepStrictEqual(bad.api.priceHistory(), [], 'the row came back; no point may say otherwise');
});

/* =============================================================================================
 * Path 12 — menu deleted (same stale-MENU trap as path 10)
 * ========================================================================================== */

test('path 12: deleting a menu logs the average WITHOUT its dishes', async () => {
  const { api } = harness(threeDishes());
  api.doDeleteMenu('MW', 'Winter');
  await flush();
  const pts = api.priceHistory();
  assert.strictEqual(pts.length, 1);
  assert.strictEqual(pts[0].v, 4, 'D2 came off with the menu: (4 + 4)/2 = 4 — a 3.8 means the call ran before rebuildMenu()');
});

/* =============================================================================================
 * The pushes reach the server view too — a point that lands only in memory is lost at next boot,
 * because bootstrapSync REPLACES priceHistory wholesale (documented asymmetry).
 * ========================================================================================== */

test('every landed point was also pushed to the server', async () => {
  const { S, api } = harness(threeDishes());
  api.mmRemove('D2');
  await flush();
  assert.deepStrictEqual(S.histPushes, api.priceHistory().map((p) => p.v),
    'memory and dbPushHistory must carry the same values — the local copy does not survive a sync');
});
