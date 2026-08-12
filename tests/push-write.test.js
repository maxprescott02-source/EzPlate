/*
 * push-write.test.js — the REAL pushWrite, run rather than described.
 *
 * WHY IT EXISTS (batch 180). `pushWrite` is the single funnel every Supabase write goes through, and
 * CLAUDE.md states its contract twice over: it **always resolves**, to the result or to `{error}`,
 * and **never to `null`** — the distinction decides real code, because a caller that treats only
 * `null` as failure sequences its dependent write straight after an error. AUDIT-v135 had to correct
 * CLAUDE.md on exactly this point, which is a documentation fix where a test was wanted.
 *
 * Six test files named `pushWrite` before this one and not one of them ran it. Two — change-log and
 * history-paths — STUB it to throw (`'pushWrite must not be reached'`), which is correct for what
 * those files are testing and is the opposite of pinning it. delete-sequencing asserts that two
 * callers contain the string `return pushWrite(`, which pins the call site, not the function.
 *
 * That was not visible by reading. The mutation gate found it: every mutant of pushWrite survived
 * against the files that claimed it, including deleting the `!` from `if(!SUPA)` — which inverts the
 * no-connection branch so that every write with a live client takes the failure path.
 *
 * The stubs here are inputs, not mirrors of anything: setSync/toast/errText record what they were
 * called with. Nothing re-implements pushWrite.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/** The real pushWrite bound to recording stubs. `supa` false simulates no client. */
function harness(opts) {
  const o = opts || {};
  const log = { sync: [], toasts: [], errors: [] };
  // eslint-disable-next-line no-new-func
  const factory = new Function('SUPA', 'ONLINE', 'LOG', `
    "use strict";
    var console = { error: function(){ LOG.errors.push(Array.prototype.slice.call(arguments)); } };
    var navigator = { onLine: ONLINE };
    function setSync(s){ LOG.sync.push(s); }
    function toast(m){ LOG.toasts.push(m); }
    function errText(e){ return (e && e.message) || String(e); }
    ${extractFn(SRC, 'pushWrite')}
    return pushWrite;
  `);
  return { pushWrite: factory(o.supa === undefined ? {} : o.supa, o.online !== false, log), log };
}

test('a successful write resolves to the builder result and reports ok', async () => {
  const h = harness();
  const res = await h.pushWrite(() => ({ data: [{ id: 'SP1' }] }), 'plate');
  assert.deepStrictEqual(res, { data: [{ id: 'SP1' }] });
  assert.deepStrictEqual(h.log.sync, ['saving', 'ok']);
  assert.deepStrictEqual(h.log.toasts, [], 'a successful write says nothing to the user');
});

test('a builder that returns {error} resolves to {error} — never null, never a rejection', async () => {
  const h = harness();
  const boom = { message: 'duplicate key' };
  const res = await h.pushWrite(() => ({ error: boom }), 'dish');
  assert.notStrictEqual(res, null, 'null is dbPushMenuAfterPlate’s contract, NOT pushWrite’s');
  assert.deepStrictEqual(res, { error: boom });
  assert.deepStrictEqual(h.log.sync, ['saving', 'error']);
  assert.match(h.log.toasts[0], /duplicate key/, 'the REAL error reaches the user, not a generic word');
});

test('a builder that THROWS still resolves to {error} — the promise never rejects', async () => {
  const h = harness();
  const res = await h.pushWrite(() => { throw new Error('network down'); }, 'menu');
  assert.ok(res && res.error, 'resolved with an error, not rejected');
  assert.strictEqual(res.error.message, 'network down');
  assert.deepStrictEqual(h.log.sync, ['saving', 'error']);
});

test('a builder that REJECTS resolves to {error} too', async () => {
  const h = harness();
  const res = await h.pushWrite(() => Promise.reject(new Error('timeout')), 'ingredient');
  assert.ok(res && res.error);
  assert.strictEqual(res.error.message, 'timeout');
});

test('no client: resolves to an error object and tells the user, and never reaches the builder', async () => {
  const h = harness({ supa: null });
  let built = false;
  const res = await h.pushWrite(() => { built = true; return { data: 1 }; }, 'plate');
  assert.strictEqual(built, false, 'with no client the write is not attempted');
  assert.ok(res && res.error, 'still an object with .error — a caller checking only for null would believe it saved');
  assert.deepStrictEqual(h.log.sync, ['error'], 'no "saving" state for a write that never starts');
  assert.match(h.log.toasts[0], /no database connection/i);
});

test('offline changes the WORDING only — the user is told either way', async () => {
  const on = harness({ online: true });
  await on.pushWrite(() => ({ error: { message: 'boom' } }), 'plate');
  const off = harness({ online: false });
  await off.pushWrite(() => ({ error: { message: 'boom' } }), 'plate');

  assert.strictEqual(on.log.toasts.length, 1);
  assert.strictEqual(off.log.toasts.length, 1, 'offline is not silent — CLAUDE.md: the wording changes, never whether the user is told');
  assert.match(off.log.toasts[0], /NOT been saved/, 'the offline wording is explicit that nothing was written');
  assert.notStrictEqual(on.log.toasts[0], off.log.toasts[0]);
  assert.doesNotMatch(on.log.toasts[0], /offline/i);
});

test('the sync state is set BEFORE the builder runs, so a slow write shows as saving', async () => {
  const h = harness();
  let syncAtBuildTime = null;
  await h.pushWrite(() => { syncAtBuildTime = h.log.sync.slice(); return {}; }, 'plate');
  assert.deepStrictEqual(syncAtBuildTime, ['saving']);
});
