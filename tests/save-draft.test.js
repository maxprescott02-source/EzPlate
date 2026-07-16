/*
 * save-draft.test.js — locks in the v44 Item 9 contract (Max's design change).
 *
 * "Save to Library" became "Save draft": an UNLINKED plate gets a dish created for it in the
 * "Unassigned dishes" holding menu (MENU_UNASSIGNED), so drafts are visible in the menu
 * selector instead of living in an invisible library.
 *
 * THE CONTRACT (against the REAL shipped saveDraft, brace-extracted from js/app.js):
 *   - an unlinked plate creates a dish with menuId === MENU_UNASSIGNED (price 0, custom)
 *     and the holding menu is ensured BEFORE the dish exists
 *   - the plate save receives the dish push promise (sequenced write — the v42 FK contract)
 *   - a plate already linked to a live dish does a PLAIN save: no new dish, no holding menu
 *   - a nameless plate refuses (no dish created) — same rule as the old save
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`save-draft: function not found -> ${name}. app.js changed; update tests/save-draft.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`save-draft: unbalanced braces for ${name}`);
}

function makeHarness(opts) {
  const state = {
    calls: [],
    customMenu: [],
    plateName: opts.plateName,
    linkValue: opts.linkValue || '',
    menuById: opts.menuById || {},
  };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', `
    "use strict";
    var MENU_UNASSIGNED='MENU_UNASSIGNED';
    var plate=[{uid:1,kid:'K1',qty:100}];
    var customMenu=S.customMenu;
    var menuById=S.menuById;
    var menuTouched=false;
    var menuLinkEl={value:S.linkValue};
    var document={getElementById:function(id){
      if(id==='plateName') return {value:S.plateName, focus:function(){}};
      if(id==='plateNameErr') return {style:{}, textContent:''};
      return {value:'', style:{}, textContent:''};
    }};
    function toast(m){ S.calls.push('toast:'+m); }
    function ensureUnassignedMenu(){ S.calls.push('ensureUnassigned'); return null; }
    function saveCustomMenu(){ S.calls.push('saveCustomMenu'); }
    function dbPushMenu(item){ S.calls.push('dbPushMenu:'+item.menuId); return Promise.resolve({data:[item]}); }
    function rebuildMenu(){} function buildMenuOptions(){} function buildMenuSelector(){}
    function updatePublishLabel(){}
    function saveCurrentPlate(asNew, menuPushPromise){ S.calls.push('savePlate:'+(menuPushPromise?'sequenced':'plain')); }
    ${extractFn(SRC, 'saveDraft')}
    return saveDraft;
  `);
  return { fn: factory(state), state };
}

test('v44 item 9: an unlinked named plate becomes a draft dish in the holding menu, writes sequenced', () => {
  const { fn, state } = makeHarness({ plateName: 'Big Breakfast' });
  fn();
  const dish = state.customMenu[0];
  assert.ok(dish, 'a draft dish is created');
  assert.strictEqual(dish.menuId, 'MENU_UNASSIGNED', 'the draft lives in the holding menu');
  assert.strictEqual(dish.price, 0, 'a draft has no real price yet');
  assert.ok(dish.custom, 'draft dishes are custom rows');
  const c = state.calls;
  assert.ok(c.indexOf('ensureUnassigned') >= 0 && c.indexOf('ensureUnassigned') < c.indexOf('dbPushMenu:MENU_UNASSIGNED'),
    'the holding menu is ensured BEFORE the dish is pushed');
  assert.ok(c.indexOf('savePlate:sequenced') >= 0, 'the plate save carries the dish push promise (v42 FK contract)');
});

test('v44 item 9: a plate already linked to a live dish is a plain save — no new dish, no holding menu', () => {
  const { fn, state } = makeHarness({ plateName: 'Big Breakfast', linkValue: 'um1', menuById: { um1: { id: 'um1' } } });
  fn();
  assert.strictEqual(state.customMenu.length, 0, 'no draft dish is created');
  assert.deepStrictEqual(state.calls, ['savePlate:plain'], 'exactly the old save path, nothing else');
});

test('v44 item 9: a nameless plate refuses — no dish, no writes', () => {
  const { fn, state } = makeHarness({ plateName: '   ' });
  fn();
  assert.strictEqual(state.customMenu.length, 0, 'no dish for a nameless plate');
  assert.ok(state.calls.every(c => c.indexOf('dbPushMenu') < 0 && c.indexOf('savePlate') < 0), 'nothing was written');
});
