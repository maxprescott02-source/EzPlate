/*
 * plates-independence.test.js — v55 contract: plates are an independent, MANY-TO-MANY library.
 *
 * A plate carries no menu link. A menu_items dish links to its plate via dish.plateId (source_plate_id is a
 * legacy fallback; a stale local plate.menuId is the last resort). One plate can back many dishes — one per
 * menu it's published to. Pinned against the REAL shipped helpers (brace-extracted from js/app.js):
 *   - plateIdOf resolves plateId > sourcePlateId > legacy plate.menuId
 *   - dishesOfPlate / menusOfPlate enumerate every menu a plate is on
 *   - saving a plate stores NO menuId (just id/name/lines[/category])
 *   - deleting a menu removes only THAT menu's dishes; the plate and its entries on other menus survive
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`plates-independence: function not found -> ${name}. app.js changed; update this test`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`plates-independence: unbalanced braces for ${name}`);
}

/* ---- 1. resolution helpers (plate <-> dish, many-to-many) ---- */
function makeResolver(menusList, savedPlates, dishes) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('MENUS', 'PLATES', 'DISHES', `
    "use strict";
    var menusList=MENUS, savedPlates=PLATES, MENU=DISHES;
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'dishesOfPlate')}
    ${extractFn(SRC, 'menusOfPlate')}
    return { plateIdOf, plateForMenuItem, dishesOfPlate, menusOfPlate };
  `);
  return factory(menusList, savedPlates, dishes);
}

test('v55: plateIdOf resolves plateId first, then legacy source_plate_id, then a stale local plate.menuId', () => {
  const plates = [{ id: 'SP_legacy', menuId: 'D3', lines: [] }];
  const r = makeResolver([], plates, []);
  assert.strictEqual(r.plateIdOf({ id: 'D1', plateId: 'SPx', sourcePlateId: 'SPy' }), 'SPx', 'plateId wins');
  assert.strictEqual(r.plateIdOf({ id: 'D2', sourcePlateId: 'SPy' }), 'SPy', 'source_plate_id is the fallback');
  assert.strictEqual(r.plateIdOf({ id: 'D3' }), 'SP_legacy', 'a stale local plate.menuId is the last resort');
  assert.strictEqual(r.plateIdOf({ id: 'D9' }), null, 'nothing to resolve -> null');
});

test('v55: a plate can be on MANY menus — menusOfPlate lists them all with per-menu price', () => {
  const menusList = [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MW', name: 'Winter' }];
  const plates = [{ id: 'SP1', name: 'Fish & Chips', lines: [] }];
  const dishes = [
    { id: 'D1', name: 'F&C', price: 18, section: 'Mains', menuId: 'MENU_ORIGINAL', plateId: 'SP1' },
    { id: 'D2', name: 'F&C winter', price: 21, section: 'Mains', menuId: 'MW', plateId: 'SP1' },
    { id: 'D3', name: 'Other', price: 9, menuId: 'MW', plateId: 'SP_other' },
  ];
  const r = makeResolver(menusList, plates, dishes);
  const on = r.menusOfPlate(plates[0]);
  assert.deepStrictEqual(on.map(o => o.name).sort(), ['Original', 'Winter'], 'both menus, once each');
  assert.deepStrictEqual(on.map(o => o.price).sort(), [18, 21], 'each entry keeps its own price');
  assert.strictEqual(r.dishesOfPlate(plates[0]).length, 2, 'two dishes back this plate');
  assert.strictEqual(r.plateForMenuItem(dishes[0]).id, 'SP1', 'the dish resolves to its plate');
});

/* ---- 2. saving a plate stores NO menu link ---- */
function makeSaveHarness(opts) {
  const state = { calls: [], savedPlates: opts.savedPlates || [], plateName: opts.plateName, plate: opts.plate || [{ kid: 'K1', qty: 100 }] };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var plate=S.plate;
    var savedPlates=S.savedPlates;
    var loadedPlateId=null;
    var document={getElementById:function(id){
      if(id==='plateName') return {value:S.plateName, focus:function(){}};
      if(id==='plateNameErr') return {style:{}, textContent:''};
      return {value:'', style:{}, textContent:''};
    }, querySelector:function(){ return {focus:function(){}}; }};   // v60: the empty-qty guard focuses the offending line
    function toast(m){ S.calls.push('toast:'+m); }
    function savePlatesLS(){}
    function updateEditTag(){}
    function renderAnalysis(){}
    function renderPlatesTab(){}
    function dbPushPlate(sp){ S.calls.push('push:'+sp.id); }
    function clearPlateDraft(){ S.calls.push('cleardraft'); }   // v82 D1: a saved plate is no longer a draft
    function logHistory(){}   // v60 item 1a: saveCurrentPlate now refreshes the dashboard on re-cost
    ${extractFn(SRC, 'saveCurrentPlate')}
    return function(){ var ok=saveCurrentPlate(false); return { ok:ok, savedPlates: savedPlates, calls:S.calls }; };
  `);
  return factory(state);
}

test('v55: saving a plate stores id/name/lines and NO menuId (a plate carries no menu link)', () => {
  const run = makeSaveHarness({ plateName: 'Big Breakfast' });
  const { savedPlates } = run();
  assert.strictEqual(savedPlates.length, 1);
  assert.strictEqual(savedPlates[0].name, 'Big Breakfast');
  assert.ok(!('menuId' in savedPlates[0]), 'the saved plate has no menuId field');
  assert.ok(Array.isArray(savedPlates[0].lines), 'it stores its ingredient lines');
});

test('v60: a line with an EMPTY quantity blocks the save (must enter a value)', () => {
  const run = makeSaveHarness({ plateName: 'Half Built', plate: [{ kid: 'K1', qty: null }] });
  const { ok, savedPlates, calls } = run();
  assert.strictEqual(ok, false, 'save is refused');
  assert.strictEqual(savedPlates.length, 0, 'nothing was written');
  assert.ok(calls.some(c => /Enter a quantity/.test(c)), 'the user is told to enter a quantity');
});

test('v60: a 0 quantity is treated as no value and also blocks the save', () => {
  const run = makeSaveHarness({ plateName: 'Zero', plate: [{ kid: 'K1', qty: 0 }] });
  assert.strictEqual(run().ok, false, '0 is not a valid quantity');
});

test('v60: a positive quantity on every line lets the save through', () => {
  const run = makeSaveHarness({ plateName: 'Done', plate: [{ kid: 'K1', qty: 150 }] });
  const { ok, savedPlates } = run();
  assert.strictEqual(ok, true, 'save proceeds');
  assert.strictEqual(savedPlates.length, 1);
});

test('v60: an empty ingredient qty blocks even when a misc line is present', () => {
  const run = makeSaveHarness({ plateName: 'Mixed', plate: [{ misc: true, label: '', cost: 2 }, { kid: 'K1', qty: null }] });
  assert.strictEqual(run().ok, false, 'the misc line is fine but the empty ingredient qty still blocks');
});

/* ---- 2b. v61 item 1: a 4-digit quantity round-trips into the stored line (the "1100 shows as 110" report was VISUAL clipping, not truncation — this pins that the STORED value is intact) ---- */
function makeQtyHarness(plate) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('plate', `
    "use strict";
    function updateLine(){}
    function updateTotals(){}
    ${extractFn(SRC, 'setQty')}
    return function(uid,v){ setQty(uid,v); return plate; };
  `);
  return factory(plate);
}

test('v61: a 4-digit quantity typed into a line is stored in full (1100, not 110)', () => {
  const plate = [{ uid: 1, kid: 'K1', qty: null }];
  const setQty = makeQtyHarness(plate);
  setQty(1, '1100');
  assert.strictEqual(plate[0].qty, 1100, 'the STORED qty keeps all four digits — costings are not silently wrong');
});

test('v61: a 5-digit quantity also round-trips intact', () => {
  const plate = [{ uid: 1, kid: 'K1', qty: null }];
  const setQty = makeQtyHarness(plate);
  setQty(1, '10000');
  assert.strictEqual(plate[0].qty, 10000);
});

/* ---- 3. deleting a menu removes only that menu's dishes; plates + other menus survive ---- */
function makeDeleteHarness(opts) {
  const S = { menusList: opts.menusList, savedPlates: opts.savedPlates, customMenu: opts.customMenu, currentMenuId: opts.currentMenuId, calls: [] };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var menusList=S.menusList, savedPlates=S.savedPlates, customMenu=S.customMenu, currentMenuId=S.currentMenuId;
    var MENU=[], menuById={};
    function rebuildMenu(){ MENU=customMenu.slice(); menuById={}; MENU.forEach(function(m){menuById[m.id]=m;}); }
    function removeMenuItem(id){ customMenu=customMenu.filter(function(c){return c.id!==id;}); rebuildMenu(); }
    function saveMenus(){}
    function dbDeleteMenuRecord(){}
    function setCurrentMenuId(v){ currentMenuId=v; }
    function buildMenuSelector(){}
    function renderAnalysis(){}
    function updateMenuDelBtn(){}
    function renderPlatesTab(){}
    function toast(){}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'doDeleteMenu')}
    rebuildMenu();
    return function(id,name){ doDeleteMenu(id,name); return { menusList: menusList, savedPlates: savedPlates, customMenu: customMenu, currentMenuId: currentMenuId }; };
  `);
  return factory(S);
}

test('v55: deleting a menu removes only that menu\'s dishes; the plate and its entries on other menus survive', () => {
  const run = makeDeleteHarness({
    menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MW', name: 'Winter' }],
    customMenu: [
      { id: 'D1', menuId: 'MENU_ORIGINAL', plateId: 'SP1', custom: true },
      { id: 'D2', menuId: 'MW', plateId: 'SP1', custom: true },   // SAME plate, other menu
      { id: 'D3', menuId: 'MW', plateId: 'SP2', custom: true },
    ],
    savedPlates: [{ id: 'SP1', name: 'Shared', lines: [] }, { id: 'SP2', name: 'Winter-only', lines: [] }],
    currentMenuId: 'MW',
  });
  const { menusList, savedPlates, customMenu } = run('MW', 'Winter');
  assert.ok(!menusList.some(m => m.id === 'MW'), 'the menu is gone');
  assert.strictEqual(savedPlates.length, 2, 'NO plate is deleted');
  assert.ok(customMenu.some(d => d.id === 'D1'), 'the dish on the OTHER menu survives');
  assert.ok(!customMenu.some(d => d.id === 'D2' || d.id === 'D3'), 'only the deleted menu\'s dishes are removed');
});

/* ---- 4. §B: every dish owns a plate (ensurePlateForDish) ---- */
function makeEnsureHarness() {
  const S = { savedPlates: [], customMenu: [{ id: 'D1', name: 'Soup', menuId: 'MO' }], calls: [] };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var savedPlates=S.savedPlates, customMenu=S.customMenu, MENU=customMenu;
    function savePlatesLS(){}
    function saveCustomMenu(){}
    function dbPushMenuAfterPlate(item, sp){ S.calls.push('pushAfterPlate:'+(sp&&sp.id)); return Promise.resolve(null); }
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'ensurePlateForDish')}
    return function(dishId){ var m=customMenu.find(function(c){return c.id===dishId;}); var sp=ensurePlateForDish(m); return { sp: sp, plateId: m.plateId, savedPlates: savedPlates, calls: S.calls }; };
  `);
  return factory(S);
}

test('v55 §B: ensurePlateForDish gives a plateless dish an EMPTY plate and links it', () => {
  const run = makeEnsureHarness();
  const { sp, plateId, savedPlates } = run('D1');
  assert.ok(sp && sp.id, 'a plate is created');
  assert.strictEqual(plateId, sp.id, 'the dish is linked to it via plateId');
  assert.deepStrictEqual(sp.lines, [], 'the new plate is empty — "not costed yet"');
  assert.strictEqual(savedPlates.length, 1);
});

test('v55 §B: ensurePlateForDish is idempotent — a dish that already has a plate keeps it', () => {
  const run = makeEnsureHarness();
  const first = run('D1');
  const again = run('D1');
  assert.strictEqual(again.sp.id, first.sp.id, 'no second plate is created');
  assert.strictEqual(again.savedPlates.length, 1);
});

test('v55: deleting the last menu is allowed; plates survive with no dishes', () => {
  const run = makeDeleteHarness({
    menusList: [{ id: 'MW', name: 'Winter' }],
    customMenu: [{ id: 'D1', menuId: 'MW', plateId: 'SP1', custom: true }],
    savedPlates: [{ id: 'SP1', name: 'Plate', lines: [] }],
    currentMenuId: 'MW',
  });
  const { menusList, savedPlates, customMenu } = run('MW', 'Winter');
  assert.strictEqual(menusList.length, 0, 'the last menu can be deleted');
  assert.strictEqual(savedPlates.length, 1, 'the plate survives, now unpublished');
  assert.strictEqual(customMenu.length, 0, 'its dish is gone');
});
