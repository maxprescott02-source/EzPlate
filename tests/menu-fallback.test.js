/*
 * menu-fallback.test.js — locks in the v40 Item 2 guards AND the v42 "Unassigned dishes"
 * holding-area rework.
 *
 * Invariants once a menu can be deleted:
 *   - the current-menu FALLBACK never resolves to a deleted id, and NEVER to the holding
 *     area while any real menu still exists (prefers MENU_ORIGINAL, else first surviving real)
 *   - the holding area (MENU_UNASSIGNED) is NEVER deletable
 *   - the holding area does NOT count as a real menu: deleting the LAST real menu is allowed
 *     when a holding area will stand afterwards (already exists, or this menu's dishes spawn it)
 *   - a real menu with no dishes and nothing to fall back to is NOT deletable (never leave
 *     zero selectable menus)
 *   - ensureUnassignedMenu is idempotent (creating the holding area twice is a no-op)
 *
 * realMenus/fallbackMenuId/canDeleteMenu/ensureUnassignedMenu are brace-extracted from the REAL
 * shipped js/app.js and run against injected state, so there is no second copy to drift.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`menu-fallback: function not found -> ${name}. app.js changed; update tests/menu-fallback.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`menu-fallback: unbalanced braces for ${name}`);
}

// Build the real menu functions bound to an injected menusList + customMenu, with the two DB/persist
// side-effects stubbed so we can observe them without a browser or Supabase.
function withState(menusList, customMenu) {
  const upserts = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('LIST', 'DISHES', 'UPSERTS', `
    "use strict";
    var menusList = LIST;
    var customMenu = DISHES || [];
    var MENU_UNASSIGNED = 'MENU_UNASSIGNED';
    var UNASSIGNED_NAME = 'Unassigned dishes';
    function saveMenus(){ /* persist stub */ }
    function dbUpsertMenuRecord(m){ UPSERTS.push(m.id); return Promise.resolve({ data: [m] }); }
    ${extractFn(SRC, 'realMenus')}
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'canDeleteMenu')}
    ${extractFn(SRC, 'ensureUnassignedMenu')}
    return {
      realMenus: realMenus,
      fallbackMenuId: fallbackMenuId,
      canDeleteMenu: canDeleteMenu,
      ensureUnassignedMenu: ensureUnassignedMenu,
      menusList: menusList,
    };
  `);
  return Object.assign(factory(menusList, customMenu, upserts), { upserts });
}

const HOLDING = 'MENU_UNASSIGNED';

/* ---- fallback ---- */

test('v42: fallback prefers Original while it exists (holding area present or not)', () => {
  const s = withState([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENUx', name: 'Winter' },
    { id: HOLDING, name: 'Unassigned dishes' },
  ]);
  assert.strictEqual(s.fallbackMenuId(), 'MENU_ORIGINAL');
});

test('v42: after Original is deleted, fallback returns the first surviving REAL menu — never the deleted id, never holding', () => {
  const s = withState([
    { id: 'MENUx', name: 'Winter' },
    { id: 'MENUy', name: 'Summer' },
    { id: HOLDING, name: 'Unassigned dishes' },
  ]);
  const got = s.fallbackMenuId();
  assert.notStrictEqual(got, 'MENU_ORIGINAL', 'must not resurrect the deleted Original id');
  assert.notStrictEqual(got, HOLDING, 'must never fall back to the holding area while a real menu exists');
  assert.strictEqual(got, 'MENUx', 'specifically the first surviving real menu');
});

test('v42: fallback returns the holding area ONLY when no real menu remains', () => {
  const s = withState([{ id: HOLDING, name: 'Unassigned dishes' }]);
  assert.strictEqual(s.fallbackMenuId(), HOLDING);
});

test('v42: an empty list falls back to the safe seed id', () => {
  const s = withState([]);
  assert.strictEqual(s.fallbackMenuId(), 'MENU_ORIGINAL');
});

/* ---- deletability ---- */

test('v42: the holding area is NEVER deletable', () => {
  const s = withState([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: HOLDING, name: 'Unassigned dishes' },
  ]);
  assert.strictEqual(s.canDeleteMenu(HOLDING), false);
});

test('v42: the last real menu is NOT deletable when it has no dishes and no holding area exists', () => {
  const only = withState([{ id: 'MENU_ORIGINAL', name: 'Original menu' }], []);
  assert.strictEqual(only.canDeleteMenu('MENU_ORIGINAL'), false, 'nothing would remain to select');
  const oneCustom = withState([{ id: 'MENUx', name: 'Winter' }], []);
  assert.strictEqual(oneCustom.canDeleteMenu('MENUx'), false);
});

test('v42: the last real menu IS deletable when its dishes will spawn the holding area', () => {
  const s = withState(
    [{ id: 'MENUx', name: 'Winter' }],
    [{ id: 'um1', name: 'Soup', menuId: 'MENUx' }],
  );
  assert.strictEqual(s.canDeleteMenu('MENUx'), true, 'its dish moves to the holding area, which then stands');
});

test('v42: the last real menu IS deletable when a holding area already stands (holding excluded from the count)', () => {
  const s = withState(
    [{ id: 'MENUx', name: 'Winter' }, { id: HOLDING, name: 'Unassigned dishes' }],
    [{ id: 'um1', name: 'Old', menuId: HOLDING }],
  );
  assert.strictEqual(s.canDeleteMenu('MENUx'), true, 'holding area does not count as the "other" real menu, but its presence keeps a selectable menu');
});

test('v42: with >1 real menu, any real menu is deletable and unknown ids are not', () => {
  const s = withState([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENUx', name: 'Winter' },
  ], []);
  assert.strictEqual(s.canDeleteMenu('MENU_ORIGINAL'), true, 'Original is deletable when another real menu exists');
  assert.strictEqual(s.canDeleteMenu('MENUx'), true);
  assert.strictEqual(s.canDeleteMenu('MENU_missing'), false, 'a menu not in the list is not deletable');
});

/* ---- on-demand holding-area creation ---- */

test('v42: ensureUnassignedMenu creates the holding area once and pushes its record', () => {
  const s = withState([{ id: 'MENU_ORIGINAL', name: 'Original menu' }], []);
  const p = s.ensureUnassignedMenu();
  assert.ok(p && typeof p.then === 'function', 'first creation returns the push promise');
  assert.ok(s.menusList.some(m => m.id === HOLDING), 'holding area added to the list');
  assert.deepStrictEqual(s.upserts, [HOLDING], 'its menus row is pushed exactly once');
});

test('v42: ensureUnassignedMenu is idempotent — a second call is a no-op (no duplicate, no extra push)', () => {
  const s = withState([{ id: 'MENU_ORIGINAL', name: 'Original menu' }], []);
  s.ensureUnassignedMenu();
  const second = s.ensureUnassignedMenu();
  assert.strictEqual(second, null, 'second call returns null (already present)');
  assert.strictEqual(s.menusList.filter(m => m.id === HOLDING).length, 1, 'no duplicate holding row');
  assert.deepStrictEqual(s.upserts, [HOLDING], 'no second push');
});
