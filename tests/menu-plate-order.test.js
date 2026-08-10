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
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

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
 * v42 Item 1 — reconcileLocalOnly: THESE FOUR PINS DIED IN v108, deliberately.
 *
 * They pinned the bootstrap orphan-heal: local rows the server lacked were kept, merged and
 * re-pushed, because a dish or plate created while offline had its push DROPPED SILENTLY and would
 * otherwise be destroyed on reload.
 *
 * v108 removes the cause rather than the symptom. A failed write is now loud and is never treated as
 * success, so a local row the server has never seen is no longer evidence of a dropped write — and
 * localStorage is no longer a data store, so it is not evidence of anything. Keeping the heal would
 * have been actively harmful: against the empty-but-successful read an RLS fault produces, it would
 * resurrect every local row and re-push it, turning a permissions problem into a data-integrity one.
 *
 * What SURVIVES is the ordering contract above — a dish write must still follow the plate it
 * references (menu_items.plate_id -> plates.id), which dbPushMenuAfterPlate still enforces on every
 * real publish. That is the part that was about the FK, not about offline.
 */
