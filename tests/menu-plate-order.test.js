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

test('v43: a failed menu-item push aborts the plate write (no orphan plate) WITHOUT a masking toast', async () => {
  // v43: messaging is pushWrite's job. dbPushPlateAfterMenu used to fire its own "isn't online yet"
  // toast, which overwrote pushWrite's real "Couldn't save menu item: <reason>" (single-element toast,
  // last wins) and mislabeled a genuine server rejection as "offline" — this masked a missing DB column
  // for days. The abort must still happen; it just must not add a second, misleading toast.
  const { fn, calls } = makeHarness();
  const menuPush = Promise.resolve({ error: { message: 'insert violates ...' } });
  const res = await fn(SP, menuPush);
  assert.strictEqual(calls.indexOf('plate:SP1'), -1, 'the plate must NOT be pushed when the menu item failed');
  assert.strictEqual(calls.indexOf('toast'), -1, 'no second toast here — it would overwrite pushWrite\'s real error');
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

/*
 * v42 Item 1 — reconcileLocalOnly (the bootstrap orphan-heal).
 *
 * THE DEEPER BUG: bootstrapSync used to REPLACE local with the server snapshot, so a dish/plate
 * created while offline (whose push was dropped) was DESTROYED on reload — and any plate referencing
 * such a dish FK-failed forever. The fix keeps local-only rows, merges them, and re-pushes them.
 *
 * CONTRACT (against the REAL shipped pure reconcileLocalOnly, brace-extracted so there is no copy):
 *   - local rows the server lacks are surfaced as localOnly (to re-push) AND kept in merged
 *   - tombstoned (deliberately deleted) ids are never resurfaced
 *   - idempotent: once the re-push has landed, the next server snapshot yields no localOnly and no dupes
 */
const reconcile = new Function(`
  "use strict";
  ${extractFn(SRC, 'reconcileLocalOnly')}
  return reconcileLocalOnly;
`)();

test('v42 item 1: a local dish the server lacks is surfaced for re-push and kept in merged (not clobbered)', () => {
  const local = [{ id: 'A', custom: true }, { id: 'B', custom: true }];
  const server = [{ id: 'A', custom: true }];
  const r = reconcile(local, server, []);
  assert.deepStrictEqual(r.localOnly.map(x => x.id), ['B'], 'B is local-only -> must be re-pushed');
  assert.deepStrictEqual(r.merged.map(x => x.id).sort(), ['A', 'B'], 'B survives the merge instead of being destroyed');
});

test('v42 item 1: a tombstoned (deliberately deleted) local id is NOT resurrected', () => {
  const local = [{ id: 'DEAD', custom: true }];
  const server = [];
  const r = reconcile(local, server, ['DEAD']);
  assert.deepStrictEqual(r.localOnly, [], 'a deleted dish must not be re-pushed');
  assert.deepStrictEqual(r.merged, [], 'a deleted dish must not reappear in the merged list');
});

test('v42 item 1: idempotent — once the row is on the server, no re-push and no duplicate', () => {
  const local = [{ id: 'A' }, { id: 'B' }];
  const server = [{ id: 'A' }, { id: 'B' }];   // the earlier re-push has now landed
  const r = reconcile(local, server, []);
  assert.deepStrictEqual(r.localOnly, [], 'nothing left to re-push');
  assert.deepStrictEqual(r.merged.map(x => x.id), ['A', 'B'], 'no duplicate rows');
});

test('v42 item 1: empty/missing inputs are safe', () => {
  assert.deepStrictEqual(reconcile(null, null, null), { merged: [], localOnly: [] });
  assert.deepStrictEqual(reconcile([{ id: 'X' }], null, null).localOnly.map(x => x.id), ['X']);
});
