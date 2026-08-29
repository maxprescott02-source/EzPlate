/*
 * change-log.test.js — v114.
 *
 * The change log records what MAX DID. Every other price-ish log in this app records what a SUPPLIER
 * did. Getting that boundary wrong in either direction destroys the feature:
 *
 *   - a supplier price movement leaking IN resets the "how long since you last acted" clock on exactly
 *     the event the drift counter exists to accumulate, which is self-defeating;
 *   - an intervention leaking OUT means a chart marker that never appears, and nobody notices a thing
 *     that is silently absent.
 *
 * So the conditions pinned here are the CONDITIONS, not the structure. Two shapes of test do the work:
 * behavioural ones that run the real shipped function bodies in a sandbox and read what landed in the
 * log, and a source census for the claims no sandbox can make ("no OTHER path writes this").
 *
 * v111 found a test asserting a function was called where that function's body was empty — it could not
 * have failed if the logic under it were wrong. Nothing here asserts that a call happened; every
 * behavioural test asserts the ENTRY, and the entry's kind, menus and figures.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

const flush = () => new Promise((r) => setTimeout(r, 0));

/* ---------------------------------------------------------------------------------------------
 * The sandbox. Real bodies for everything the log touches; stubs only for the DOM and the network.
 * `S.fail` decides what the server says, which is what makes the honesty rule testable at all.
 * ------------------------------------------------------------------------------------------- */
function harness(opts) {
  opts = opts || {};
  const S = {
    pushed: [],                 // rows that reached dbPushChange — the SERVER's view of the log
    writes: [],                 // every other write, in order
    toasts: [],
    fail: opts.fail || {},      // { plate:true, menu:true, setting:true } — make a write fail
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
    var plate=${JSON.stringify(opts.plate || [])};
    var loadedPlateId=${JSON.stringify(opts.loadedPlateId || null)};
    var currentMenuId='MENU_ORIGINAL', adSelectedPlateId=${JSON.stringify(opts.adSelectedPlateId || null)};
    var pubPlateId=${JSON.stringify(opts.pubPlateId || null)};
    var editTargetId=${JSON.stringify(opts.editTargetId || null)}, delChoiceId=${JSON.stringify(opts.delChoiceId || null)};
    var catState={chosen:null,chosenIsNew:false}, edCatState={chosen:null,chosenIsNew:false}, edCat=null;
    var kingEditId=${JSON.stringify(opts.kingEditId || null)}, kingChosenPid=${JSON.stringify(opts.kingChosenPid || null)};
    var kingAddToPlateOnSave=false, kingWizSkip={};
    var MENU=[], menuById={};
    var changeLog=[], changeLogSupported=true, _changeSeq=0, _changeTok='t';

    /* --- the network. pushWrite's real contract: it ALWAYS resolves, to the result or to {error}. --- */
    function res(kind){ return Promise.resolve(S.fail[kind] ? {error:{message:kind+' write failed'}} : {ok:true}); }
    function dbPushPlate(sp){ S.writes.push('plate:'+sp.id); return res('plate'); }
    function dbPushMenu(item){ S.writes.push('menu:'+item.id); return res('menu'); }
    function dbDeleteMenu(id){ S.writes.push('delmenu:'+id); return res('menu'); }
    function dbDeletePlate(id){ S.writes.push('delplate:'+id); return res('plate'); }
    function dbDeleteMenuRecord(id){ S.writes.push('delmenurec:'+id); return res('menurec'); }
    function dbSetSetting(k,v){ S.writes.push('setting:'+k); return res('setting'); }
    /* 193: the plural boundary, because setProducts is the implementation now and calls this. It
       records one write per product exactly as the singular stub did, so every assertion below still
       counts what it counted. */
    function dbPushIngredients(ids){ (ids||[]).forEach(function(id){ S.writes.push('ingredient:'+id); }); return res('ingredient'); }
    function dbPushChange(e){ S.pushed.push(changeToRow(e));
      return Promise.resolve(S.fail.changelog ? {error:{message:'42501'}} : {ok:true})
        .then(function(r){ if(!r || r.error) changeLogSupported=false; return r; }); }
    function pushWrite(){ throw new Error('pushWrite must not be reached — every db* helper is stubbed'); }

    /* --- the DOM, and nothing else. --- */
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
    function renderManageMenus(){} function renderIngredients(){} function rerenderCurrentTab(){}
    function buildMenuOptions(){} function buildMenuSelector(){} function buildMenuPickers(){}
    function updateEditTag(){} function updateMenuDelBtn(){} function clearPlateDraft(){}
    function closeMenuModal(){} function closeAddDishModal(){} function closeEdit(){} function closeDelChoice(){}
    function closeKingModal(){} function renderDishPicker(){} function renderCatDrop(){}
    function logHistory(){} function menuNameById(){ return 'Original'; } function updateLine(){}
    function repaintDashboardIfVisible(){}   // v115: the dashboard renders the log now; logChange repaints through this helper (the DOM census below stays honest — the helper owns the DOM touch)
    function updateTotals(){} function scheduleDraftSave(){} function parkRepointedProduct(){}
    function setBuilderSaved(){} function renderBuilderCost(){}   // F7 (v146): the builder page's own paint
    var _builderEdits=0;   // F7 (v146): the builder's edit counter — real state, the logic that moves it is extracted
    var _platePushPending=0;   // 221: saveCurrentPlate keeps the recovery draft alive across the write
    function syncBuilderPlateActions(){}
    function saveKingWizSkips(){} function unitCatWord(){ return 'weight'; }
    function menuCats(){ return ['Mains']; } function setCurrentMenuId(id){ currentMenuId=id; }
    function rebuild(){}
    function rebuildMenu(){ MENU=customMenu.slice(); menuById={}; MENU.forEach(function(m){ menuById[m.id]=m; }); }
    function rebuildKById(){ kById={}; kitchenIngredients.forEach(function(k){ if(k&&k.id) kById[k.id]=k; }); }
    function builderCategoryValue(){ return ''; }
    function menuMarginPreview(){ return {}; } function marginLightWord(){ return ''; }
    function dbPushIngPrices(pts){ (pts||[]).forEach(function(){ S.writes.push('ingprice'); }); return res('ingprice'); }   // the OTHER log — proving it fires while this one does not
    function cpbu(p){ return p.cost_per_base_unit; }

    /* --- real bodies, from the shipped file --- */
    /* 173: uid() is a shared dependency of every id-minting path below. Extracted, not stubbed:
       a hand-rolled counter here would agree with a broken generator and hide exactly the
       collision it exists to prevent (CLAUDE.md, "a stub that mirrors a real function must
       mirror its CONTRACT"). No backticks in this comment - it sits inside a template literal. */
    ${extractVar(SRC, '_uidSeq')}
    ${extractFn(SRC, 'uidRandom')}
    ${extractFn(SRC, 'uid')}
    var businessRole='owner';   // 188: the standing role these paths assume
    ${[
      'rowToChange', 'changeToRow', 'nextChangeId', 'changeEntry', 'logChange', 'logChangeIfSaved',
      'menuIdOf', 'dishOnMenu',
      // 221: saveCurrentPlate asks isBuilderDirty() whether the recovery draft still has anything to
      // recover. Extracted with its two signature helpers rather than stubbed.
      'lineSig', 'currentLinesSig', 'isBuilderDirty',
      'lineProduct', 'lineCost', 'costFromLines', 'plateIdOf', 'plateForMenuItem', 'dishesOfPlate', 'menusOfPlate',
      'unlinkedDishesOn', 'publishPlan', 'platesUsingKid', 'menuIdsForPlates', 'fallbackMenuId',
      'dbPushMenuAfterPlate',
      'analyze', 'avgFoodCostForScope', 'computeAvgFoodCost',
      'saveKitchenIngredients', 'saveCurrentPlate', 'upsertCustomMenu',
      'submitAddDish', 'submitMenuItem', 'saveMenuEdit', 'resolveEditCat', 'setDishSellPrice',
      'forgetMenuItems', 'removeMenuItem', 'mmRemove', 'doDeleteMenuOnly', 'doDeleteMenu',
      // 188: deletePlate and doDeleteEverything open with a role guard now. EXTRACTED, not stubbed.
      'isOwner', 'ownerOnly',
      'dbDeletePlateAfterDishes', 'rollbackPlateDelete', 'deletePlate', 'doDeleteEverything',
      'setProducts', 'setProduct', 'logIngPrice', 'samePrice', 'saveIngLog', 'confirmGuardedRepoints', 'kingRepointGuard',
      'mergeChangeLog', 'linkDishToPlate', 'deleteKitchenIngredient', 'saveKingModal',
      'kingValid', 'kingRenameCheck', 'kingNameExists', 'nextKid',
      // READ, never edited — CLAUDE.md hard rule 2 forbids changing unitCatCategory, not slicing it in.
      'unitCatCategory',
    ].map((n) => extractFn(SRC, n)).join('\n')}

    var CHANGE_KINDS=${JSON.stringify(kindsFromSource())};
    var ingPriceLog={}, _ingLogPending=[], productsById=byId, DASH_ALL='__all__', cogsPct=30;
    rebuildMenu(); rebuildKById();
    return {
      changeLog:function(){ return changeLog; },
      saveCurrentPlate:saveCurrentPlate, submitAddDish:submitAddDish, submitMenuItem:submitMenuItem,
      saveMenuEdit:saveMenuEdit, setDishSellPrice:setDishSellPrice,
      mmRemove:mmRemove, doDeleteMenuOnly:doDeleteMenuOnly,
      doDeleteMenu:doDeleteMenu, doDeleteEverything:doDeleteEverything,
      deletePlate:function(id){ deletePlate(id); if(S.confirmFn) S.confirmFn(); },
      confirmGuardedRepoints:function(l){ confirmGuardedRepoints(l); if(S.confirmFn) S.confirmFn(); },
      setProduct:setProduct, changeEntry:changeEntry, rowToChange:rowToChange, changeToRow:changeToRow,
      mergeChangeLog:mergeChangeLog, supported:function(){ return changeLogSupported; },
      linkDishToPlate:function(dishId, plateId){
        return linkDishToPlate(menuById[dishId], savedPlates.filter(function(s){return s.id===plateId;})[0]);
      },
      deleteKitchenIngredient:function(kid){ deleteKitchenIngredient(kid); if(S.confirmFn) S.confirmFn(); },
      saveKingModal:function(){ saveKingModal(); if(S.confirmFn) S.confirmFn(); },
      state:function(){ return {savedPlates:savedPlates, customMenu:customMenu, kitchenIngredients:kitchenIngredients}; }
    };
  `);
  return { S, api: factory(S) };
}

// CHANGE_KINDS is a `var` array literal, not a function, so it is lifted by pattern rather than by the
// brace extractor. Reading it from source (instead of restating it here) is what makes the census tests
// below fail when a call site invents a kind that the app itself does not know about.
function kindsFromSource() {
  const m = SRC.match(/var CHANGE_KINDS\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error('change-log: CHANGE_KINDS not found in app.js');
  return m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
}

/* A plate on TWO menus, so "one action, every menu it touched" is exercised rather than assumed. */
const twoMenus = () => ({
  byId: { P1: { id: 'P1', description: 'Chips', base_unit: 'g', cost_per_base_unit: 0.004 },
          P2: { id: 'P2', description: 'Chips (cheap)', base_unit: 'g', cost_per_base_unit: 0.002 } },
  kById: { K1: { id: 'K1', name: 'Chips', pid: 'P1' } },
  kitchenIngredients: [{ id: 'K1', name: 'Chips', pid: 'P1' }],
  savedPlates: [{ id: 'SP1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 200 }] }],
  customMenu: [
    { id: 'D1', name: 'F&C', price: 20, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: 'SP1', custom: true },
    { id: 'D2', name: 'F&C winter', price: 24, section: 'Mains', menuId: 'MW', plateId: 'SP1', custom: true },
  ],
  menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MW', name: 'Winter' }],
});

/* =============================================================================================
 * 1. changeEntry — pure, total, and closed over a known set of kinds
 * ========================================================================================== */

test('changeEntry refuses a kind the app does not know about', () => {
  const { api } = harness({});
  assert.strictEqual(api.changeEntry('plate_repriced', { id: 'CL1', t: 1 }), null,
    'a typo at a call site must produce NOTHING, not a twelfth category nobody draws');
  assert.ok(api.changeEntry('plate_edited', { id: 'CL1', t: 1 }), 'a known kind is accepted');
});

test('changeEntry normalises: menuIds is always a de-duplicated array, figures are finite or null', () => {
  const { api } = harness({});
  const e = api.changeEntry('dish_price', {
    id: 'CL1', t: 5, menuIds: ['MW', 'MW', '', null, 'MENU_ORIGINAL'],
    avgBefore: NaN, avgAfter: 31.5, costBefore: '4.20', costAfter: 4.2, detail: ['not', 'an', 'object'],
  });
  assert.deepStrictEqual(e.menuIds, ['MW', 'MENU_ORIGINAL'], 'duplicates and blanks are dropped');
  assert.strictEqual(e.avgBefore, null, 'NaN must never reach the row — it sorts unpredictably and poisons a chart');
  assert.strictEqual(e.avgAfter, 31.5);
  assert.strictEqual(e.costBefore, null, 'a numeric STRING is not a number the app computed');
  assert.deepStrictEqual(e.detail, {}, 'detail is an object or it is nothing');
});

test('changeEntry is pure — same input, identical entry, no clock and no globals', () => {
  const { api } = harness({});
  const o = { id: 'CL9', t: 1754179200000, menuIds: ['MW'], avgBefore: 1, avgAfter: 2 };
  assert.deepStrictEqual(api.changeEntry('plate_deleted', o), api.changeEntry('plate_deleted', o));
});

/* =============================================================================================
 * 2. THE CONDITION THAT MATTERS MOST — a supplier price change writes NOTHING
 * ========================================================================================== */

test('a supplier price change writes NOTHING to the change log', async () => {
  // setProduct is the sole writer of ing_price_history and the funnel every price path in the app goes
  // through: the builder hand-edit, both invoice branches, and both Products-tab forms. If drift can
  // reach this log at all, it reaches it here.
  const { api } = harness(twoMenus());
  api.setProduct('P1', { cost_per_base_unit: 0.009 });
  await flush();
  assert.deepStrictEqual(api.changeLog(), [],
    'a price movement is the thing being MEASURED — logging it would reset the clock on every supplier rise');
});

test('CENSUS: no product-price path names the change log at all', () => {
  // The behavioural test above proves setProduct itself is clean. This proves nothing ELSE on the five
  // price paths writes an entry — the class of gap v109 exists because of, where a rule was stated and
  // the Products tab was missed anyway.
  for (const fn of ['setProduct', 'commitPrice', 'saveIngEdit', 'submitNew', 'logIngPrice', 'applyTidy']) {
    const body = extractFn(SRC, fn);
    assert.ok(!/logChange/.test(body), `${fn} must not write the change log — it is a supplier-price path`);
  }
  // applyInvoice DOES write, and every entry it writes must be a repoint. A price it applied is drift.
  const inv = extractFn(SRC, 'applyInvoice');
  const kinds = [...inv.matchAll(/logChange(?:IfSaved)?\([^,]*,\s*'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(kinds.length > 0, 'the invoice DOES relink ingredients — that path must log');
  assert.deepStrictEqual([...new Set(kinds)], ['ingredient_repointed'],
    'the only intervention inside an invoice import is a re-link; every price it wrote is supplier drift');
});

/* =============================================================================================
 * 3. Each enumerated path writes exactly one entry, of the right kind, naming the right menus
 * ========================================================================================== */

test('a plate re-save writes ONE entry naming EVERY menu it is on, with the real cost either side', async () => {
  const st = twoMenus();
  const { api } = harness(Object.assign(st, {
    loadedPlateId: 'SP1',
    plate: [{ uid: 1, kid: 'K1', qty: 100 }],          // re-portioned from 200g down to 100g
    fields: { plateName: 'Fish & Chips' },
  }));
  assert.strictEqual(api.saveCurrentPlate(false), true);
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1, 'one user action is one entry');
  assert.strictEqual(log[0].kind, 'plate_edited');
  assert.strictEqual(log[0].plateId, 'SP1');
  assert.deepStrictEqual(log[0].menuIds.sort(), ['MENU_ORIGINAL', 'MW'],
    'a plate published to two menus is ONE entry listing two — N entries would inflate any count of interventions');
  assert.strictEqual(log[0].costBefore, 0.8, '200g at $0.004/g');
  assert.strictEqual(log[0].costAfter, 0.4, '100g at $0.004/g — the saving this intervention actually made');
});

test('a brand-new plate is `plate_created`, and carries no cost to compare against', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    loadedPlateId: null, plate: [{ uid: 1, kid: 'K1', qty: 50 }], fields: { plateName: 'New thing' },
  }));
  api.saveCurrentPlate(false);
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].kind, 'plate_created');
  assert.strictEqual(log[0].costBefore, null, 'there is no "before" for a plate that did not exist');
  assert.deepStrictEqual(log[0].menuIds, [], 'a new plate is on no menu — empty is the honest answer, not a gap');
});

test('adding a plate to a menu writes `dish_added` against that menu only', async () => {
  const st = twoMenus();
  st.customMenu = [st.customMenu[1]];                 // SP1 is on Winter, not on Original
  const { api } = harness(Object.assign(st, { adSelectedPlateId: 'SP1', fields: { ad_price: '19.50' } }));
  api.submitAddDish();
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].kind, 'dish_added');
  assert.deepStrictEqual(log[0].menuIds, ['MENU_ORIGINAL'], 'the menu it was added to, not every menu the plate is on');
  assert.strictEqual(log[0].detail.price, 19.5);
});

test('a sell-price edit is `dish_price` and records both prices', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    editTargetId: 'D1', fields: { ed_name: 'F&C', ed_price: '23', ed_cat: 'Mains', ed_menu: 'MENU_ORIGINAL' },
  }));
  api.saveMenuEdit();
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].kind, 'dish_price');
  assert.strictEqual(log[0].detail.priceFrom, 20);
  assert.strictEqual(log[0].detail.priceTo, 23);
});

test('moving a plate to another menu at the SAME price is `dish_moved`, and names both menus', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    editTargetId: 'D1', fields: { ed_name: 'F&C', ed_price: '20', ed_cat: 'Mains', ed_menu: 'MW' },
  }));
  api.saveMenuEdit();
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].kind, 'dish_moved');
  // The OTHER half of the "written on both kinds" promise. Without these two, suppressing menuFrom/
  // menuTo on dish_moved entries is invisible to the whole suite — the combined-case test below has
  // _priceMoved true, so it would not notice. (PR review, #61.)
  assert.strictEqual(log[0].detail.menuFrom, 'MENU_ORIGINAL');
  assert.strictEqual(log[0].detail.menuTo, 'MW');
  assert.deepStrictEqual(log[0].menuIds.sort(), ['MENU_ORIGINAL', 'MW'], 'it left one menu and joined another');
});

/* ⚠️ THE COMBINED CASE, AND THE ONLY THING STANDING BEHIND A PROMISE CLAUDE.md NOW MAKES.
   One action is one entry, so a save that moves the price AND the menu resolves to `dish_price` —
   the menu movement survives only in `detail`. CLAUDE.md tells the chart batch to read `detail` rather
   than `kind` for "did this move menus", on the strength of menuFrom/menuTo being written on BOTH kinds.
   Nothing pinned that. The two tests above pass with only one of the pair changing, so making
   menuFrom/menuTo conditional on `_menuMoved` would break the documented promise silently, with every
   existing test still green. Found by the PR review on #59; this is the loop closed. */
test('price AND menu in one save: kind is `dish_price`, and the move survives in detail', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    editTargetId: 'D1', fields: { ed_name: 'F&C', ed_price: '25', ed_cat: 'Mains', ed_menu: 'MW' },
  }));
  api.saveMenuEdit();
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1, 'one action, one entry — never one per thing that moved');
  assert.strictEqual(log[0].kind, 'dish_price', 'price wins the kind');
  assert.strictEqual(log[0].detail.menuFrom, 'MENU_ORIGINAL',
    'a query filtering kind===dish_moved misses this edit, so detail is the ONLY record that it moved');
  assert.strictEqual(log[0].detail.menuTo, 'MW');
  assert.strictEqual(log[0].detail.priceFrom, 20);
  assert.strictEqual(log[0].detail.priceTo, 25);
  assert.deepStrictEqual(log[0].menuIds.sort(), ['MENU_ORIGINAL', 'MW'], 'both menus are named, as on a plain move');
});

test('renaming a menu row changes no number and writes NOTHING', async () => {
  // The log answers "what did you last do about food cost". A typo correction is not an answer, and an
  // entry for one would push the real last intervention off the top of the chart.
  const { api } = harness(Object.assign(twoMenus(), {
    editTargetId: 'D1', fields: { ed_name: 'Fish and Chips', ed_price: '20', ed_cat: 'Mains', ed_menu: 'MENU_ORIGINAL' },
  }));
  api.saveMenuEdit();
  await flush();
  assert.deepStrictEqual(api.changeLog(), []);
});

test('taking a plate off a menu is `dish_removed`, from either door', async () => {
  const a = harness(twoMenus());
  a.api.mmRemove('D1');
  await flush();
  assert.deepStrictEqual(a.api.changeLog().map((e) => e.kind), ['dish_removed']);
  assert.deepStrictEqual(a.api.changeLog()[0].menuIds, ['MENU_ORIGINAL']);

  const b = harness(Object.assign(twoMenus(), { delChoiceId: 'D1' }));
  b.api.doDeleteMenuOnly();
  await flush();
  assert.deepStrictEqual(b.api.changeLog().map((e) => e.kind), ['dish_removed']);
});

test('deleting a MENU is ONE entry, not one per plate that came off it', async () => {
  // doDeleteMenu calls removeMenuItem once per dish. Logging inside removeMenuItem would turn one
  // decision into N+1 entries and report a burst of interventions that never happened.
  const st = twoMenus();
  st.customMenu.push({ id: 'D3', name: 'Other', price: 9, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: null, custom: true });
  const { api } = harness(st);
  api.doDeleteMenu('MENU_ORIGINAL', 'Original');
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1, 'one menu deleted, one entry');
  assert.strictEqual(log[0].kind, 'menu_deleted');
  assert.strictEqual(log[0].detail.dishes, 2, 'the count of what came off it belongs in detail, not in extra rows');
});

/* The one path whose failure branch had no test, found by the PR review. The MECHANISM is the same
   logChangeIfSaved every other path uses, and it was right — but "the mechanism is used elsewhere and
   works" is an argument, not coverage, and this file exists because arguments have been wrong here
   before. `menu_deleted` chains off the MENUS row delete specifically, so this is the only path where
   dbDeleteMenuRecord is the deciding write. */
test('a failed menu-row delete logs NOTHING', async () => {
  const { api } = harness(Object.assign(twoMenus(), { fail: { menurec: true } }));
  api.doDeleteMenu('MENU_ORIGINAL', 'Original');
  await flush();
  assert.deepStrictEqual(api.changeLog(), [],
    'the menu is still on the server — an append-only entry saying otherwise could never be retracted');
});

test('deleting a plate is ONE `plate_deleted` naming every menu it was on', async () => {
  const { api } = harness(twoMenus());
  api.deletePlate('SP1');
  await flush(); await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].kind, 'plate_deleted');
  assert.deepStrictEqual(log[0].menuIds.sort(), ['MENU_ORIGINAL', 'MW']);
  assert.strictEqual(log[0].detail.dishes, 2);
});

test('an ingredient re-pointed to another product is `ingredient_repointed`, naming the menus it reached', async () => {
  const { api } = harness(twoMenus());
  api.confirmGuardedRepoints([{ kid: 'K1', pid: 'P2', name: 'Chips' }]);
  await flush();
  const log = api.changeLog();
  assert.strictEqual(log.length, 1, 'one ingredient, one entry');
  assert.strictEqual(log[0].kind, 'ingredient_repointed');
  assert.deepStrictEqual(log[0].menuIds.sort(), ['MENU_ORIGINAL', 'MW'],
    'the swap re-costs every plate that cooks with it, on every menu those plates are on');
  assert.strictEqual(log[0].detail.from, 'Chips');
  assert.strictEqual(log[0].detail.to, 'Chips (cheap)');
  assert.ok(log[0].avgBefore > log[0].avgAfter, 'a cheaper product lowers the food-cost average — the whole point');
});

/* =============================================================================================
 * 4. NO ENTRY FOR A CHANGE THE SERVER DID NOT TAKE
 * ========================================================================================== */

test('a failed plate write logs NOTHING — the log is append-only and cannot be retracted', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    loadedPlateId: 'SP1', plate: [{ uid: 1, kid: 'K1', qty: 100 }],
    fields: { plateName: 'Fish & Chips' }, fail: { plate: true },
  }));
  api.saveCurrentPlate(false);
  await flush();
  assert.deepStrictEqual(api.changeLog(), [],
    'an entry written optimistically could never be corrected — there is no update and no delete');
});

test('a rolled-back plate delete logs NOTHING', async () => {
  // v112: if a dish delete fails the plate is never touched and everything is restored. An entry here
  // would permanently record a deletion that did not happen.
  const { api } = harness(Object.assign(twoMenus(), { fail: { menu: true } }));
  api.deletePlate('SP1');
  await flush(); await flush();
  assert.deepStrictEqual(api.changeLog(), []);
});

test('a failed menu-row edit logs NOTHING', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    editTargetId: 'D1', fields: { ed_name: 'F&C', ed_price: '23', ed_cat: 'Mains', ed_menu: 'MENU_ORIGINAL' },
    fail: { menu: true },
  }));
  api.saveMenuEdit();
  await flush();
  assert.deepStrictEqual(api.changeLog(), []);
});

/* =============================================================================================
 * 5. The round trip — an entry survives the boundary and comes back the same
 * ========================================================================================== */

test('an entry survives changeToRow -> rowToChange unchanged', () => {
  const { api } = harness({});
  const e = api.changeEntry('dish_linked', {
    id: 'CL42', t: 1754179200000, plateId: 'SP1', dishId: 'D1', menuIds: ['MENU_ORIGINAL'],
    avgBefore: 34.25, avgAfter: 31.5, costBefore: null, costAfter: 4.2, detail: { name: 'Toastie' },
  });
  assert.deepStrictEqual(api.rowToChange(api.changeToRow(e)), e,
    'a restore reads rows back through this pair — anything lost here is lost from the backup');
});

test('rowToChange drops a row whose timestamp will not parse, rather than admitting NaN', () => {
  const { api } = harness({});
  assert.strictEqual(api.rowToChange({ id: 'CL1', recorded_at: 'not a date', kind: 'plate_edited' }), null);
  assert.strictEqual(api.rowToChange({ recorded_at: '2026-08-06T00:00:00Z', kind: 'plate_edited' }), null,
    'an entry with no id cannot be de-duplicated on restore, so it is not an entry');
});

/* =============================================================================================
 * 6. Source census — the claims no sandbox can make
 * ========================================================================================== */

test('CENSUS: every kind used at a call site is one the app declares', () => {
  const kinds = kindsFromSource();
  const used = [...SRC.matchAll(/logChange(?:IfSaved)?\([^;]*?'([a-z_]+)'/g)].map((m) => m[1]);
  assert.ok(used.length >= 11, `expected the enumerated paths to log, found ${used.length}`);
  for (const k of new Set(used)) {
    assert.ok(kinds.includes(k), `call site uses "${k}", which is not in CHANGE_KINDS`);
  }
});

test('CENSUS: removeMenuItem still has exactly the three callers the log accounts for', () => {
  // The log is written by this function's CALLERS, because doDeleteMenu's N calls are ONE decision.
  // A fourth caller would silently log nothing, so it must break this test and name itself.
  const callers = ['mmRemove', 'doDeleteMenuOnly', 'doDeleteMenu']
    .filter((n) => /removeMenuItem\(/.test(extractFn(SRC, n)));
  assert.deepStrictEqual(callers, ['mmRemove', 'doDeleteMenuOnly', 'doDeleteMenu']);
  // Count CALLS, not the declaration — `function removeMenuItem(` matches a naive search too.
  const total = (SRC.match(/(?<!function\s)\bremoveMenuItem\(/g) || []).length;
  assert.strictEqual(total, 3, 'removeMenuItem gained a caller — decide whether it is one decision or many, then update this');
});

/* A source census of "the logChange sits after a success check" was written here first and DELETED.
   It asserted that a gate appeared somewhere EARLIER IN THE TEXT of the function, which is not the same
   as the call being lexically inside it: in doDeleteEverything the first branch's `if(ok)` comes first,
   so the second logChange could be moved out of its `.then` entirely and the census would still pass.
   A test that cannot fail for the mutation it guards against is worse than no test (v111). The four
   behavioural rollback tests in section 4 do the real work, and both branches of both delete paths are
   exercised there. */

/* =============================================================================================
 * 6b. The kinds the first draft of this file left to a regex — every one now runs the real path
 * ========================================================================================== */

/* =============================================================================================
 * 6c. 177 — the builder rail's menu-price input, and the function behind it
 *
 * `setDishSellPrice` is a SECOND path to a write `saveMenuEdit` already performs. CLAUDE.md's rule
 * about copies is the reason these tests exist and the reason of their shape: a hand-written second
 * implementation agrees with whatever the author believed, so the tests assert it against the REAL
 * function rather than against that belief. Both are driven through the same sandbox, on the same
 * fixture, and their log entries are compared field for field.
 * ========================================================================================== */

test('177: setting the price from the builder logs the SAME entry saveMenuEdit would', async () => {
  const viaBuilder = harness(twoMenus());
  viaBuilder.api.setDishSellPrice('D1', 26);
  await flush();

  const viaModal = harness(Object.assign(twoMenus(), {
    editTargetId: 'D1',
    fields: { ed_name: 'F&C', ed_price: '26', ed_cat: 'Mains', ed_menu: 'MENU_ORIGINAL' },
  }));
  viaModal.api.saveMenuEdit();
  await flush();

  const strip = (e) => ({ kind: e.kind, plateId: e.plateId, dishId: e.dishId, menuIds: e.menuIds,
    avgBefore: e.avgBefore, avgAfter: e.avgAfter, costBefore: e.costBefore, costAfter: e.costAfter,
    detail: e.detail });
  assert.deepStrictEqual(viaBuilder.api.changeLog().map(strip), viaModal.api.changeLog().map(strip),
    'the builder input and the Menu screen modal must record one user action one way');
  // and the price actually moved on the row, not just in the log
  assert.strictEqual(viaBuilder.api.state().customMenu.find((m) => m.id === 'D1').price, 26);
});

test('177: the builder price input writes nothing when the price has not moved to the cent', async () => {
  const { api, S } = harness(twoMenus());
  assert.strictEqual(api.setDishSellPrice('D1', 20.001), false, 'a sub-cent difference is a keystroke');
  await flush();
  assert.deepStrictEqual(api.changeLog(), []);
  assert.deepStrictEqual(S.writes, [], 'and it does not touch the server either');
});

test('177: the builder price input refuses a blank, a zero and a NaN rather than storing one', async () => {
  const { api, S } = harness(twoMenus());
  // typeof-first, then isFinite: Number('') is 0 and isFinite('') is TRUE, so a blank field that
  // reached this as a string would otherwise store a $0.00 sell price and log it as a decision.
  for (const bad of ['', null, undefined, NaN, 0, -5, '26']) {
    assert.strictEqual(api.setDishSellPrice('D1', bad), false, `refused: ${String(bad)}`);
  }
  await flush();
  assert.deepStrictEqual(api.changeLog(), []);
  assert.deepStrictEqual(S.writes, []);
  assert.strictEqual(api.state().customMenu.find((m) => m.id === 'D1').price, 20, 'the stored price stands');
});

test('177: a rejected server write records no intervention, exactly as every other path', async () => {
  const { api } = harness(Object.assign(twoMenus(), { fail: { menu: true } }));
  api.setDishSellPrice('D1', 26);
  await flush();
  assert.deepStrictEqual(api.changeLog(), [],
    'logChangeIfSaved gates this like the other twelve callers — a failed write is not a decision');
});

test('re-publishing a plate to a menu it is already on is `dish_price`, not a second `dish_added`', async () => {
  // submitMenuItem does TWO things behind one button. publishPlan's `update` means same plate, same
  // menu, so the only thing that can have moved is the sell price.
  const { api } = harness(Object.assign(twoMenus(), {
    pubPlateId: 'SP1',
    fields: { mi_name: 'F&C', mi_cat: 'Mains', mi_price: '26', mi_notes: '', mi_menu: 'MENU_ORIGINAL' },
  }));
  api.submitMenuItem();
  await flush();
  const log = api.changeLog();
  assert.deepStrictEqual(log.map((e) => e.kind), ['dish_price']);
  assert.strictEqual(log[0].detail.priceFrom, 20);
  assert.strictEqual(log[0].detail.priceTo, 26);
});

test('re-publishing at the SAME price writes nothing — a save that moved no number is not an intervention', async () => {
  const { api } = harness(Object.assign(twoMenus(), {
    pubPlateId: 'SP1',
    fields: { mi_name: 'F&C', mi_cat: 'Mains', mi_price: '20', mi_notes: '', mi_menu: 'MENU_ORIGINAL' },
  }));
  api.submitMenuItem();
  await flush();
  assert.deepStrictEqual(api.changeLog(), []);
});

test('publishing to a menu it is NOT on is `dish_added` against that menu', async () => {
  const st = twoMenus();
  st.customMenu = [st.customMenu[0]];                  // on Original only
  const { api } = harness(Object.assign(st, {
    pubPlateId: 'SP1',
    fields: { mi_name: 'F&C winter', mi_cat: 'Mains', mi_price: '24', mi_notes: '', mi_menu: 'MW' },
  }));
  api.submitMenuItem();
  await flush();
  const log = api.changeLog();
  assert.deepStrictEqual(log.map((e) => e.kind), ['dish_added']);
  assert.deepStrictEqual(log[0].menuIds, ['MW']);
});

test('"delete everything" on a plate-backed row is `plate_deleted`; on an UNLINKED row it is `dish_removed`', async () => {
  // Deliberate: an unlinked row has no plate to delete, so what happened is a removal from the menu.
  // Naming it after the button pressed would put a plate deletion in the log with no plate.
  const a = harness(Object.assign(twoMenus(), { delChoiceId: 'D1' }));
  a.api.doDeleteEverything();
  await flush(); await flush();
  assert.deepStrictEqual(a.api.changeLog().map((e) => e.kind), ['plate_deleted']);

  const st = twoMenus();
  st.customMenu.push({ id: 'D9', name: 'Uncosted', price: 7, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: null, custom: true });
  const b = harness(Object.assign(st, { delChoiceId: 'D9' }));
  b.api.doDeleteEverything();
  await flush(); await flush();
  const log = b.api.changeLog();
  assert.deepStrictEqual(log.map((e) => e.kind), ['dish_removed']);
  assert.strictEqual(log[0].detail.unlinked, true);
});

test('linking an unlinked row to a plate is `dish_linked` — it is not a plate arriving on the menu', async () => {
  // The row was already there and already priced; a chart reading this as `dish_added` would show a
  // plate joining a menu it had been on for months. It is also the largest one-step move the average
  // can make, since the row goes from costing nothing to costing something.
  const st = twoMenus();
  st.customMenu.push({ id: 'D9', name: 'Toastie', price: 8, section: 'Sandwiches', menuId: 'MENU_ORIGINAL', plateId: null, custom: true });
  const { api } = harness(st);
  api.linkDishToPlate('D9', 'SP1');
  await flush();
  const log = api.changeLog();
  assert.deepStrictEqual(log.map((e) => e.kind), ['dish_linked']);
  assert.strictEqual(log[0].dishId, 'D9');
  assert.deepStrictEqual(log[0].menuIds, ['MENU_ORIGINAL']);
  assert.ok(log[0].avgAfter > log[0].avgBefore, 'a row that starts costing raises the food-cost average');
});

test('deleting an ingredient is `ingredient_deleted`, naming the menus whose plates it broke', async () => {
  const { api } = harness(twoMenus());
  api.deleteKitchenIngredient('K1');
  await flush();
  const log = api.changeLog();
  assert.deepStrictEqual(log.map((e) => e.kind), ['ingredient_deleted']);
  assert.deepStrictEqual(log[0].menuIds.sort(), ['MENU_ORIGINAL', 'MW']);
  assert.strictEqual(log[0].detail.plates, 1);
  assert.ok(log[0].avgAfter < log[0].avgBefore,
    'the plate stops costing — a fall in the number with no saving behind it, which is why it must be recorded');
});

test('renaming an ingredient writes NOTHING; re-pointing the same one writes an entry', async () => {
  // saveKingModal's `if(moved)` gate. This is the "guard that runs but tests the wrong thing" shape:
  // invert it and every other test in this file stays green.
  const rename = harness(Object.assign(twoMenus(), {
    kingEditId: 'K1', kingChosenPid: 'P1', fields: { king_name: 'Chips (fries)' },
  }));
  rename.api.saveKingModal();
  await flush();
  assert.deepStrictEqual(rename.api.changeLog(), [],
    'plates persist {kid, qty}, so a rename cannot change one cost — logging it would reset the clock for nothing');

  const moved = harness(Object.assign(twoMenus(), {
    kingEditId: 'K1', kingChosenPid: 'P2', fields: { king_name: 'Chips' },
  }));
  moved.api.saveKingModal();
  await flush();
  const log = moved.api.changeLog();
  assert.deepStrictEqual(log.map((e) => e.kind), ['ingredient_repointed']);
  assert.strictEqual(log[0].detail.to, 'Chips (cheap)');
});

/* =============================================================================================
 * 7. Nothing user-facing changed
 * ========================================================================================== */

test('the change log renders nothing: none of its own functions touch the DOM', () => {
  // NB this deliberately no longer claims "…or says anything". An earlier version of this test also
  // grepped for `toast(` and read as a guarantee of silence, which it could not be: every write in the
  // app goes through pushWrite, and the toast lives THERE. A body that delegates could not contain a
  // toast even if the feature shouted. What silence there is is enforced by the latch below, not here.
  // v115: the dashboard now RENDERS the log (markers + since-line), so "invisible to the user"
  // expired — what survives is the boundary: the log's own functions still hold no DOM code.
  // logChange repaints via repaintDashboardIfVisible, the same helper logHistory uses; the DOM
  // touch lives there, on the rendering side of the line.
  for (const fn of ['changeEntry', 'logChange', 'logChangeIfSaved', 'dbPushChange', 'rowToChange',
                    'changeToRow', 'nextChangeId', 'mergeChangeLog', 'platesUsingKid', 'menuIdsForPlates']) {
    const body = extractFn(SRC, fn);
    for (const bad of ['document.', 'innerHTML', 'textContent']) {
      assert.ok(!body.includes(bad), `${fn} touches "${bad}" — this batch must be invisible to the user`);
    }
  }
});

test('a REFUSED insert stops the app trying again — one toast, not one per action forever', async () => {
  // The boot probe is a SELECT and what it authorises is an INSERT; they fail independently. A
  // half-applied migration (grants + RLS + the select policy, no insert policy) reads 200-with-no-rows
  // and refuses every write with 42501 — the shape v90's menu_price_history came up in. Without the
  // latch, every plate save would fire a doomed insert and a red toast for a feature the user does not
  // know exists.
  const { S, api } = harness(Object.assign(twoMenus(), {
    loadedPlateId: 'SP1', plate: [{ uid: 1, kid: 'K1', qty: 100 }],
    fields: { plateName: 'Fish & Chips' }, fail: { changelog: true },
  }));
  api.saveCurrentPlate(false);
  await flush(); await flush();
  assert.strictEqual(S.pushed.length, 1, 'it tried once');
  assert.strictEqual(api.supported(), false, 'and latched off');
  api.saveCurrentPlate(false);
  await flush(); await flush();
  assert.strictEqual(S.pushed.length, 1, 'the second action does not try again');
});

test('an entry whose insert FAILED survives the next boot — it is a real change, not a phantom', async () => {
  // logChangeIfSaved confirms the write that CARRIES the change, never the log's own insert. So a
  // local-only entry is one for something that DID happen. Replacing the log from the server on boot
  // would delete exactly the entries worth keeping, silently, at the next reload.
  const { api } = harness({});
  const local = api.changeEntry('plate_edited', { id: 'CL_local', t: 2000, menuIds: ['MENU_ORIGINAL'] });
  const server = api.changeEntry('dish_price', { id: 'CL_server', t: 1000, menuIds: ['MENU_ORIGINAL'] });
  const merged = api.mergeChangeLog([server], [local]);
  assert.deepStrictEqual(merged.map((e) => e.id), ['CL_server', 'CL_local'], 'both survive, in time order');
  assert.strictEqual(api.mergeChangeLog([], [local])[0].id, 'CL_local',
    'an empty server read must not wipe a local entry — the v107 lesson, applied here');
});

test('the log is INSERT-only in the client too — no update and no delete helper exists', () => {
  // The table grants neither to the app's role, so a helper for either could only ever fail. Their
  // absence is the contract; a future "tidy the log" feature has to change the migration first.
  assert.ok(/from\('menu_change_log'\)\.insert\(/.test(SRC), 'the one write is an insert');
  assert.ok(!/from\('menu_change_log'\)\.(update|delete|upsert)\(/.test(SRC),
    'an intervention that later proved wrong is still an intervention that happened');
});
