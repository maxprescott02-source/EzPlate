/*
 * menu-plate-order.test.js — locks in the v40 Item 1 fix (data integrity).
 *
 * THE BUG: publishing a plate to a brand-new menu item fired two independent,
 * unordered Supabase writes — dbPushMenu (the new menu_items row) and dbPushPlate
 * (the plate whose menu_id references it). With no ordering, the plate insert
 * could reach Supabase first and violate plates_menu_id_fkey. Only NEW items hit
 * it; updating an existing item references a row already on the server.
 *
 * THE CONTRACT these tests pin (against the REAL shipped dbPushPlateAfterMenu,
 * brace-extracted from js/app.js so there is no second copy to drift):
 *   - with a menu-item push dependency, the plate push happens AFTER it resolves
 *   - if the menu-item push resolved to an error, the plate is NEVER pushed
 *     (no orphan plate) and the user is told
 *   - with no dependency, the plate pushes immediately (unchanged old path)
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`menu-plate-order: function not found -> ${name}. app.js changed; update tests/menu-plate-order.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`menu-plate-order: unbalanced braces for ${name}`);
}

// Build the real dbPushPlateAfterMenu with dbPushPlate + toast stubbed to record calls.
function makeHarness() {
  const calls = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('CALLS', `
    "use strict";
    var calls = CALLS;
    function dbPushPlate(sp){ calls.push('plate:' + (sp && sp.id)); return Promise.resolve({ ok: true }); }
    function toast(msg){ calls.push('toast'); }
    ${extractFn(SRC, 'dbPushPlateAfterMenu')}
    return dbPushPlateAfterMenu;
  `);
  return { fn: factory(calls), calls };
}

const SP = { id: 'SP1', name: 'Bacon & Egg Roll', menuId: 'umNEW', lines: [] };

test('v40 item 1: the plate push waits for the menu-item push to resolve first', async () => {
  const { fn, calls } = makeHarness();
  // a menu-item push that resolves on a later microtask, recording its own landing
  const menuPush = Promise.resolve().then(() => { calls.push('menu:umNEW'); return { data: [{ id: 'umNEW' }] }; });
  await fn(SP, menuPush);
  assert.deepStrictEqual(calls, ['menu:umNEW', 'plate:SP1'], 'menu insert must precede the plate insert');
});

test('v40 item 1: a failed menu-item push aborts the plate write (no orphan plate) and warns', async () => {
  const { fn, calls } = makeHarness();
  const menuPush = Promise.resolve({ error: { message: 'insert violates ...' } });
  const res = await fn(SP, menuPush);
  assert.strictEqual(calls.indexOf('plate:SP1'), -1, 'the plate must NOT be pushed when the menu item failed');
  assert.ok(calls.indexOf('toast') >= 0, 'the user must be told the plate was not saved');
  assert.strictEqual(res, null, 'the sequencing resolves to null on abort');
});

test('v40 item 1: a SKIPPED menu push (null result — offline/no client) must NOT push the plate', async () => {
  const { fn, calls } = makeHarness();
  const menuPush = Promise.resolve(null);   // pushWrite returns null when it did not actually write
  await fn(SP, menuPush);
  assert.strictEqual(calls.indexOf('plate:SP1'), -1, 'the plate must not be pushed when the menu item was not confirmed');
});

test('v40 item 1: with no dependency the plate pushes immediately (unchanged path)', async () => {
  const { fn, calls } = makeHarness();
  await fn(SP, null);
  assert.deepStrictEqual(calls, ['plate:SP1'], 'no menu dependency -> straight to the plate push');
});

test('v40 item 1: a null plate is a safe no-op', async () => {
  const { fn, calls } = makeHarness();
  await fn(null, Promise.resolve({ ok: true }));
  assert.strictEqual(calls.length, 0, 'nothing is pushed for a missing plate');
});
