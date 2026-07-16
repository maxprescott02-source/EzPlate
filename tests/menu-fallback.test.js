/*
 * menu-fallback.test.js — locks in the v40 Item 2 guards (deletable Original menu).
 *
 * Once the Original menu can be deleted, two invariants must hold or data breaks:
 *   - the current-menu FALLBACK must never resolve to a deleted id (it prefers
 *     MENU_ORIGINAL only while it still exists, else the first surviving menu)
 *   - the LAST remaining menu is never deletable
 *
 * fallbackMenuId() and canDeleteMenu() are brace-extracted from the REAL shipped
 * js/app.js and run against an injected menusList, so there is no second copy.
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

// Build fallbackMenuId + canDeleteMenu bound to an injected menusList.
function withMenus(list) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('LIST', `
    "use strict";
    var menusList = LIST;
    ${extractFn(SRC, 'fallbackMenuId')}
    ${extractFn(SRC, 'canDeleteMenu')}
    return { fallbackMenuId: fallbackMenuId, canDeleteMenu: canDeleteMenu };
  `);
  return factory(list);
}

test('v40 item 2: fallback prefers Original while it exists', () => {
  const { fallbackMenuId } = withMenus([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENUx', name: 'Winter' },
  ]);
  assert.strictEqual(fallbackMenuId(), 'MENU_ORIGINAL');
});

test('v40 item 2: after Original is deleted, fallback returns a SURVIVING id — never the deleted MENU_ORIGINAL', () => {
  const survivors = [{ id: 'MENUx', name: 'Winter' }, { id: 'MENUy', name: 'Summer' }];
  const { fallbackMenuId } = withMenus(survivors);
  const got = fallbackMenuId();
  assert.notStrictEqual(got, 'MENU_ORIGINAL', 'must not resurrect the deleted Original id');
  assert.ok(survivors.some(m => m.id === got), 'fallback must be one of the surviving menus');
  assert.strictEqual(got, 'MENUx', 'specifically the first surviving menu');
});

test('v40 item 2: an empty list falls back to the safe seed id', () => {
  const { fallbackMenuId } = withMenus([]);
  assert.strictEqual(fallbackMenuId(), 'MENU_ORIGINAL');
});

test('v40 item 2: the last remaining menu is never deletable', () => {
  const only = withMenus([{ id: 'MENU_ORIGINAL', name: 'Original menu' }]);
  assert.strictEqual(only.canDeleteMenu('MENU_ORIGINAL'), false, 'last menu (Original) not deletable');
  const oneCustom = withMenus([{ id: 'MENUx', name: 'Winter' }]);
  assert.strictEqual(oneCustom.canDeleteMenu('MENUx'), false, 'last menu (custom) not deletable either');
});

test('v40 item 2: with >1 menu, Original becomes deletable and unknown ids do not', () => {
  const { canDeleteMenu } = withMenus([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENUx', name: 'Winter' },
  ]);
  assert.strictEqual(canDeleteMenu('MENU_ORIGINAL'), true, 'Original is deletable when another menu exists');
  assert.strictEqual(canDeleteMenu('MENUx'), true, 'a custom menu is deletable too');
  assert.strictEqual(canDeleteMenu('MENU_missing'), false, 'a menu not in the list is not deletable');
});
