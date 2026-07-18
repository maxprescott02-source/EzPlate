/*
 * plates-independence.test.js — locks the v54 contract: plates are an independent library.
 *
 * Reverses the v40/v42 holding-area design. The two data-integrity claims pinned here (against the
 * REAL shipped doDeleteMenu + saveCurrentPlate + fallbackMenuId, brace-extracted from js/app.js so
 * there is no second copy to drift):
 *
 *   1. Saving a plate that isn't linked to a dish writes it with menuId === null — a "draft" is just
 *      an unpublished library plate now. It never invents a holding-area dish.
 *   2. Deleting a menu DELETES its dishes (menu_items rows) and UNLINKS their plates (menuId → null);
 *      every plate survives in savedPlates. Dishes NOT on that menu, and already-unlinked plates, are
 *      untouched. Deleting the last menu leaves zero menus (currentMenuId falls back to null).
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

/* ---- 1. Save writes an unpublished (null-menu) plate ---- */

function makeSaveHarness(opts) {
  const state = { calls: [], savedPlates: opts.savedPlates || [], plateName: opts.plateName, linkValue: opts.linkValue || '' };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var plate=[{kid:'K1',qty:100}];
    var savedPlates=S.savedPlates;
    var loadedPlateId=null;
    var menuLinkEl={value:S.linkValue};
    var document={getElementById:function(id){
      if(id==='plateName') return {value:S.plateName, focus:function(){}};
      if(id==='plateNameErr') return {style:{}, textContent:''};
      return {value:'', style:{}, textContent:''};
    }};
    function toast(m){ S.calls.push('toast'); }
    function savePlatesLS(){ S.calls.push('savePlatesLS'); }
    function updateEditTag(){}
    function renderAnalysis(){}
    function dbPushPlateAfterMenu(sp, promise){ S.calls.push('push:'+(promise?'sequenced':'plain')); return Promise.resolve(null); }
    ${extractFn(SRC, 'saveCurrentPlate')}
    return function(){ saveCurrentPlate(false); return { savedPlates: savedPlates }; };
  `);
  return factory(state);
}

test('v54: saving an unlinked plate stores it with menuId === null (an unpublished library plate)', () => {
  const run = makeSaveHarness({ plateName: 'Big Breakfast' });
  const { savedPlates } = run();
  assert.strictEqual(savedPlates.length, 1, 'the plate is saved to the library');
  assert.strictEqual(savedPlates[0].menuId, null, 'no menu link — it is an unpublished draft, not a holding-area dish');
  assert.strictEqual(savedPlates[0].name, 'Big Breakfast');
});

test('v54: saving a plate whose builder still points at a live dish keeps that link (editing a published plate)', () => {
  const run = makeSaveHarness({ plateName: 'Big Breakfast', linkValue: 'D1' });
  const { savedPlates } = run();
  assert.strictEqual(savedPlates[0].menuId, 'D1', 'an already-linked plate stays published');
});

/* ---- 2. Menu delete unlinks plates + deletes dishes, plates survive ---- */

function makeDeleteHarness(opts) {
  const state = {
    calls: [],
    menusList: opts.menusList,
    customMenu: opts.customMenu,
    savedPlates: opts.savedPlates,
    currentMenuId: opts.currentMenuId,
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var menusList=S.menusList;
    var customMenu=S.customMenu;
    var savedPlates=S.savedPlates;
    var currentMenuId=S.currentMenuId;
    function dbPushPlate(sp){ S.calls.push('unlinkPush:'+sp.id); return Promise.resolve(null); }
    function removeMenuItem(mid){ S.calls.push('removeMenuItem:'+mid); customMenu=customMenu.filter(function(c){return c.id!==mid;}); }
    function savePlatesLS(){ S.calls.push('savePlatesLS'); }
    function saveMenus(){}
    function dbDeleteMenuRecord(id){ S.calls.push('dbDeleteMenuRecord:'+id); }
    function setCurrentMenuId(v){ currentMenuId=v; }
    function rebuildMenu(){}
    function buildMenuSelector(){}
    function renderAnalysis(){}
    function updateMenuDelBtn(){}
    function renderPlate(){}
    function toast(m){ S.calls.push('toast'); }
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'doDeleteMenu')}
    return function(id,name){ doDeleteMenu(id,name); return { menusList: menusList, savedPlates: savedPlates, currentMenuId: currentMenuId }; };
  `);
  return factory(state);
}

test('v54: deleting a menu unlinks its plates (menuId → null) and KEEPS every plate in the library', () => {
  const run = makeDeleteHarness({
    menusList: [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENUx', name: 'Winter' }],
    customMenu: [{ id: 'D1', menuId: 'MENUx' }, { id: 'D2', menuId: 'MENU_ORIGINAL' }],
    savedPlates: [
      { id: 'SP1', menuId: 'D1', lines: [] },   // published to a dish on the deleted menu
      { id: 'SP2', menuId: 'D2', lines: [] },   // published to a dish on a DIFFERENT menu
      { id: 'SP3', menuId: null, lines: [] },   // already an unpublished library plate
    ],
    currentMenuId: 'MENUx',
  });
  const { menusList, savedPlates, currentMenuId } = run('MENUx', 'Winter');

  assert.ok(!menusList.some(m => m.id === 'MENUx'), 'the menu is gone');
  assert.strictEqual(savedPlates.length, 3, 'NO plate is deleted — all survive in the library');
  assert.strictEqual(savedPlates.find(p => p.id === 'SP1').menuId, null, 'the deleted menu\'s plate is unlinked, not destroyed');
  assert.strictEqual(savedPlates.find(p => p.id === 'SP2').menuId, 'D2', 'a plate on another menu is untouched');
  assert.strictEqual(savedPlates.find(p => p.id === 'SP3').menuId, null, 'an already-unlinked plate is untouched');
  assert.strictEqual(currentMenuId, 'MENU_ORIGINAL', 'the view lands on the surviving menu');
});

test('v54: deleting the LAST menu leaves zero menus and a null current menu (legitimate now)', () => {
  const run = makeDeleteHarness({
    menusList: [{ id: 'MENUx', name: 'Winter' }],
    customMenu: [{ id: 'D1', menuId: 'MENUx' }],
    savedPlates: [{ id: 'SP1', menuId: 'D1', lines: [] }],
    currentMenuId: 'MENUx',
  });
  const { menusList, savedPlates, currentMenuId } = run('MENUx', 'Winter');
  assert.strictEqual(menusList.length, 0, 'the last menu can be deleted');
  assert.strictEqual(currentMenuId, null, 'no menu selected — the Menu tab shows its empty state');
  assert.strictEqual(savedPlates[0].menuId, null, 'the plate still survives, now unpublished');
});
