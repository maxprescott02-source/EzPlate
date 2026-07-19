/*
 * menu-plate-order.test.js — the sequenced-write contract (data integrity).
 *
 * v55 FLIPPED the FK: a menu_items dish now references its plate via menu_items.plate_id ->
 * plates.id (was plates.menu_id -> menu_items.id). So the DISH write must land AFTER the plate
 * is on the server — the reverse of the v40 ordering. dbPushMenuAfterPlate encodes it.
 *
 * THE CONTRACT (against the REAL shipped dbPushMenuAfterPlate, brace-extracted from js/app.js):
 *   - with a plate dependency, the dish push happens AFTER the plate push resolves
 *   - if the plate push resolved to an error/null (not confirmed), the dish is NEVER pushed
 *     (no orphan dish referencing a missing plate)
 *   - with no plate dependency, the dish pushes immediately
 * The reconcileLocalOnly heal contract (below) is unchanged from v42.
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

// Build the real dbPushMenuAfterPlate with dbPushPlate + dbPushMenu stubbed to record calls. The plate
// push resolves to `platePushResult` so we can simulate confirmed / rejected / offline-skipped.
function makeHarness(platePushResult) {
  const calls = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('CALLS', 'PLATERES', `
    "use strict";
    var calls = CALLS;
    function dbPushPlate(sp){ calls.push('plate:' + (sp && sp.id)); return Promise.resolve(PLATERES); }
    function dbPushMenu(item){ calls.push('menu:' + (item && item.id)); return Promise.resolve({ ok: true }); }
    ${extractFn(SRC, 'dbPushMenuAfterPlate')}
    return dbPushMenuAfterPlate;
  `);
  return { fn: factory(calls, platePushResult), calls };
}

const ITEM = { id: 'umNEW', name: 'Bacon & Egg Roll', menuId: 'MENU_ORIGINAL', plateId: 'SP1' };
const SP = { id: 'SP1', name: 'Bacon & Egg Roll', lines: [] };

test('v55: the dish push waits for the plate push to be CONFIRMED first', async () => {
  const { fn, calls } = makeHarness({ data: [{ id: 'SP1' }] });   // plate confirmed on the server
  await fn(ITEM, SP);
  assert.deepStrictEqual(calls, ['plate:SP1', 'menu:umNEW'], 'plate insert must precede the dish insert');
});

test('v55: a failed plate push aborts the dish write (no dish orphaned against a missing plate)', async () => {
  const { fn, calls } = makeHarness({ error: { message: 'insert violates ...' } });
  const res = await fn(ITEM, SP);
  assert.strictEqual(calls.indexOf('menu:umNEW'), -1, 'the dish must NOT be pushed when the plate failed');
  assert.strictEqual(res, null, 'the sequencing resolves to null on abort');
});

test('v55: a SKIPPED plate push (null — offline/no client) must NOT push the dish', async () => {
  const { fn, calls } = makeHarness(null);   // pushWrite returns null when it did not actually write
  await fn(ITEM, SP);
  assert.strictEqual(calls.indexOf('menu:umNEW'), -1, 'the dish must not be pushed when the plate was not confirmed');
});

test('v55: with no plate dependency the dish pushes immediately (plate already on the server)', async () => {
  const { fn, calls } = makeHarness({ ok: true });
  await fn(ITEM, null);
  assert.deepStrictEqual(calls, ['menu:umNEW'], 'no plate dependency -> straight to the dish push');
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
