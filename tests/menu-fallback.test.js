/*
 * menu-fallback.test.js — v54 contract (REWRITTEN from the v40/v42 holding-area version).
 *
 * v54 made plates an independent library and REMOVED the "Unassigned dishes" holding area, so the
 * old invariants about it are gone. The new, simpler invariants:
 *   - fallbackMenuId() prefers MENU_ORIGINAL, else the first menu in the list, else NULL
 *     (zero menus is a legitimate state now that plates can stand alone)
 *   - canDeleteMenu(id) is true for ANY menu that exists — including the last one — and false for
 *     an id that isn't in the list. There is no un-deletable "holding" menu and no last-menu guard.
 *
 * fallbackMenuId/canDeleteMenu are brace-extracted from the REAL shipped js/app.js and run against
 * injected state, so there is no second copy to drift.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// Build the real menu functions bound to an injected menusList + customMenu.
function withState(menusList, customMenu) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('LIST', 'DISHES', `
    "use strict";
    var menusList = LIST;
    var customMenu = DISHES || [];
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'canDeleteMenu')}
    return { fallbackMenuId: fallbackMenuId, canDeleteMenu: canDeleteMenu, menusList: menusList };
  `);
  return factory(menusList, customMenu);
}

/* ---- fallback ---- */

test('v54: fallback prefers Original while it exists', () => {
  const s = withState([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENUx', name: 'Winter' },
  ]);
  assert.strictEqual(s.fallbackMenuId(), 'MENU_ORIGINAL');
});

test('v54: after Original is deleted, fallback returns the first surviving menu — never the deleted id', () => {
  const s = withState([
    { id: 'MENUx', name: 'Winter' },
    { id: 'MENUy', name: 'Summer' },
  ]);
  const got = s.fallbackMenuId();
  assert.notStrictEqual(got, 'MENU_ORIGINAL', 'must not resurrect the deleted Original id');
  assert.strictEqual(got, 'MENUx', 'specifically the first surviving menu');
});

test('v54: an empty list falls back to NULL — zero menus is legitimate', () => {
  const s = withState([]);
  assert.strictEqual(s.fallbackMenuId(), null);
});

/* ---- deletability ---- */

test('v54: any existing menu is deletable — including the last one', () => {
  const only = withState([{ id: 'MENU_ORIGINAL', name: 'Original menu' }], []);
  assert.strictEqual(only.canDeleteMenu('MENU_ORIGINAL'), true, 'the last menu may be deleted now (plates survive independently)');
  const oneCustom = withState([{ id: 'MENUx', name: 'Winter' }], [{ id: 'um1', name: 'Soup', menuId: 'MENUx' }]);
  assert.strictEqual(oneCustom.canDeleteMenu('MENUx'), true, 'a menu with dishes is deletable; its plates just unlink');
});

test('v54: with >1 menu, any is deletable and unknown ids are not', () => {
  const s = withState([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENUx', name: 'Winter' },
  ], []);
  assert.strictEqual(s.canDeleteMenu('MENU_ORIGINAL'), true);
  assert.strictEqual(s.canDeleteMenu('MENUx'), true);
  assert.strictEqual(s.canDeleteMenu('MENU_missing'), false, 'a menu not in the list is not deletable');
});
