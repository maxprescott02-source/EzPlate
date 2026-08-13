/*
 * boot-gate.test.js — v108: the honest loading state.
 *
 * THE DEFECT THIS PREVENTS. Before v108 the app hydrated synchronously from localStorage and painted
 * before a single server byte arrived. With Supabase as the source of truth that is no longer
 * possible, and the tempting shortcut — paint whatever is cached, swap it when the fetch lands — is
 * exactly what the brief forbids: it reintroduces two sources of truth in miniature, and the user
 * cannot tell a week-old price from a current one.
 *
 * So the contracts here are about what the user is TOLD:
 *   1. Loading shows a loading state, with no Try again button (there is nothing to retry yet).
 *   2. Success hides the gate completely.
 *   3. Failure shows an error, keeps the message, and offers exactly one action.
 *   4. Offline and misconfigured are DIFFERENT messages — "you're offline" and "this device can't
 *      reach your database" send the user to different places.
 *   5. Once the app is up, a later re-sync NEVER re-gates it. Pull-to-refresh runs the same
 *      bootstrapSync, and throwing a full-screen overlay over a working app on every refresh would
 *      be worse than the problem. An ERROR may still surface.
 *   6. The gate never blocks on its own absence — a missing element is a no-op, not a throw.
 *
 * Runs the REAL shipped bootGate, brace-extracted from js/app.js, against a minimal DOM stub.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* A DOM stub small enough to read, with just the surface bootGate touches. */
function mkNode(id) {
  const cls = new Set();
  return {
    id, hidden: true, textContent: '', onclick: null,
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
  };
}

function makeGate(present, opts) {
  const nodes = present
    ? { bootGate: mkNode('bootGate'), bootGateMsg: mkNode('bootGateMsg'), bootGateRetry: mkNode('bootGateRetry'),
        bootGateOut: mkNode('bootGateOut') }
    : {};
  const calls = { bootstrapSync: 0, signOut: 0, switched: [] };
  /* 185: authSignOut and authSwitchUser are COLLABORATORS observed here, not shipped decisions
     re-implemented — the thing under test is which of them the gate calls and in what order, and
     neither has a return value the gate reasons about beyond `{error}`. Their own contracts are
     pinned in auth.test.js against the real functions. */
  const signOutResult = (opts && opts.signOutResult) || { data: true };
  // eslint-disable-next-line no-new-func
  const api = new Function('D', 'C', 'SO', `
    "use strict";
    var document = { getElementById: function(id){ return D[id] || null; } };
    var bootstrapSync = function(){ C.bootstrapSync++; };
    var authSignOut = async function(){ C.signOut++; return SO; };
    var authSwitchUser = function(asked){ C.switched.push(asked); };
    var errText = function(e){ return (e && e.message) || String(e); };
    var _bootGateDone = false, _bootRetrying = false, _bootSlowTimer = null;
    var _bootNoMember = false;
    // v115: the patient-message timer. Captured rather than run — these tests are about gate STATES;
    // the 4s swap itself is exercised in the browser (it needs real elapsed time to mean anything).
    var setTimeout = function(fn, ms){ C.slowTimerMs = ms; return 1; };
    var clearTimeout = function(){ C.slowTimerCleared = (C.slowTimerCleared||0)+1; };
    ${extractFn(SRC, 'bootGate')}
    return { bootGate: bootGate };
  `)(nodes, calls, signOutResult);
  return { gate: nodes.bootGate, msg: nodes.bootGateMsg, retry: nodes.bootGateRetry,
           out: nodes.bootGateOut, run: api.bootGate, calls };
}

test('loading shows the gate, with no retry offered yet', () => {
  const g = makeGate(true);
  g.run('loading');
  assert.strictEqual(g.gate.hidden, false, 'the gate is what stands in for the data that has not arrived');
  assert.strictEqual(g.retry.hidden, true, 'nothing to retry while it is still trying');
  assert.strictEqual(g.msg.textContent, 'Loading your data…');
});

test('success hides the gate entirely', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, true, 'a hidden gate is the only acceptable success state');
  assert.strictEqual(g.gate.classList.contains('is-error'), false);
});

test('failure shows the message and exactly one action', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('error', 'Couldn’t load your data: boom');
  assert.strictEqual(g.gate.hidden, false);
  assert.ok(g.gate.classList.contains('is-error'), 'the error class is what drops the spinner');
  assert.match(g.msg.textContent, /Couldn’t load your data: boom/);
  assert.strictEqual(g.retry.hidden, false, 'the user must be given a way forward');
  assert.strictEqual(typeof g.retry.onclick, 'function');
});

test('Try again re-runs the sync and returns to the loading state', () => {
  const g = makeGate(true);
  g.run('error', 'nope');
  g.retry.onclick();
  assert.strictEqual(g.calls.bootstrapSync, 1, 'the button must actually retry, not just clear itself');
  assert.strictEqual(g.retry.hidden, true, 'and it goes back to looking like work in progress');
  assert.match(g.msg.textContent, /Trying again/);
});

test('a working app is NEVER re-gated by a later re-sync', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');                            // first boot succeeded — app is usable
  g.run('loading');                       // pull-to-refresh runs the same bootstrapSync
  assert.strictEqual(g.gate.hidden, true,
    'a full-screen overlay over a working app on every refresh is worse than the problem it solves');
});

test('…but a later FAILURE can still surface', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');
  g.run('error', 'lost it');
  assert.strictEqual(g.gate.hidden, false, 'silence is the failure mode this batch exists to remove');
  assert.match(g.msg.textContent, /lost it/);
});

test('Try again works after a LATER failure, not just a first-boot one', () => {
  /* CodeRabbit found this: the "never re-gate a working app" guard also swallowed the retry's own
     'loading', so once the app had booted successfully, hitting Try again on a later failure reran
     the sync while the screen still said it had failed. The button looked dead. */
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');                             // app booted fine
  g.run('error', 'lost the connection');   // a later sync failed
  g.retry.onclick();
  assert.strictEqual(g.calls.bootstrapSync, 1);
  assert.match(g.msg.textContent, /Trying again/, 'the screen must visibly respond to the tap');
  assert.strictEqual(g.gate.classList.contains('is-error'), false, 'and stop claiming it failed');
});

test('a second tap on Try again does not launch a second boot', () => {
  const g = makeGate(true);
  g.run('error', 'nope');
  g.retry.onclick();
  g.retry.onclick();
  assert.strictEqual(g.calls.bootstrapSync, 1, 'concurrent bootstrapSync calls would race each other');
});

test('offline and misconfigured are different messages, not one generic failure', () => {
  // Pulled from the real call sites so the two cannot silently converge on a shared string.
  const offline = SRC.match(/bootReady\('error','([^']*offline[^']*)'\)/i);
  const noClient = SRC.match(/bootReady\('error','(This device[^']*)'\)/);
  assert.ok(offline, "the offline branch must name being offline");
  assert.ok(noClient, 'the no-client branch must name the configuration, not the network');
  assert.notStrictEqual(offline[1], noClient[1],
    'one generic message would send the user to the wrong fix');
  assert.match(offline[1], /connection/i);
});

test('a missing gate element is a no-op, never a throw', () => {
  const g = makeGate(false);
  assert.doesNotThrow(() => { g.run('loading'); g.run('error', 'x'); g.run('ok'); },
    'a JS failure must not be able to trap the app behind an overlay it cannot clear');
});

/* v115: the patient message. Week-long idle gaps are the NORMAL case here, and the first request
   after one pays Supabase's cold start (~1.1s measured) — so 'loading' arms a 4s message swap that
   a warm boot never sees. The swap's wording is exercised in the browser; what is pinned here is
   the CONDITION: loading arms it, success disarms it. */
test('loading arms the 4s patient-message timer; ok clears it', () => {
  const g = makeGate(true);
  g.run('loading');
  assert.strictEqual(g.calls.slowTimerMs, 4000, 'armed at 4s — late enough that a warm boot (≤333ms) never sees it');
  g.run('ok');
  assert.ok(g.calls.slowTimerCleared >= 1, 'a finished boot must kill the pending swap');
});

/* ── 185: the signed-in NON-MEMBER ────────────────────────────────────────────────────────────
   An account with no `business_members` row reads every table successfully and gets zero rows, so
   the gate is the only thing that can tell the difference between "nothing to show you" and "your
   café has been deleted". What is pinned here is that it says so, that it does not offer an action
   that cannot help, and that its one action actually leaves. */

test('the non-member state shows the gate and its message', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('nomember', 'You’re signed in as c@example.com, but that account isn’t linked to a café yet.');
  assert.strictEqual(g.gate.hidden, false, 'an empty app with no explanation is the failure being fixed');
  assert.ok(g.gate.classList.contains('is-error'), 'the spinner must stop — nothing is still loading');
  assert.match(g.msg.textContent, /c@example.com/);
});

test('Try again is HIDDEN for a non-member, and Sign out is offered instead', () => {
  const g = makeGate(true);
  g.run('nomember', 'no café');
  assert.strictEqual(g.retry.hidden, true,
    'retrying asks the same question and gets the same answer — a button that cannot help invites tapping');
  assert.strictEqual(g.out.hidden, false, 'being someone else is the only thing that changes the outcome');
  assert.strictEqual(typeof g.out.onclick, 'function');
});

test('Sign out signs out AND leaves — it never relies on the auth listener to reload', async () => {
  /* ⚠️ THE REASON THIS IS ASSERTED SEPARATELY FROM THE SIGN-OUT ITSELF. authApply only switches
     when the user id CHANGES, and `authUser` is filled in by authInit, which is not awaited before
     bootstrapSync. On a boot where it lost that race prevId and nextId are both null, authApply
     does nothing, and a gate that trusted it would sit on screen with the session already gone. */
  const g = makeGate(true);
  g.run('nomember', 'no café');
  await g.out.onclick();
  assert.strictEqual(g.calls.signOut, 1, 'the session must actually end');
  assert.deepStrictEqual(g.calls.switched, [false],
    'and the app must purge and reload itself rather than waiting to be told');
});

test('signing out from the gate KEEPS the plate draft', async () => {
  /* `false` is the documented meaning of the flag — it records whether the unfinished-plate
     question has been PUT to the user, and this screen never puts it. Passing true here would
     discard unsaved authored work nobody was warned about. */
  const g = makeGate(true);
  g.run('nomember', 'no café');
  await g.out.onclick();
  assert.strictEqual(g.calls.switched[0], false,
    'true would destroy an unsaved plate the user was never warned about');
});

test('a FAILED sign-out says so and does not pretend to have left', async () => {
  const g = makeGate(true, { signOutResult: { error: { message: 'no connection' } } });
  g.run('nomember', 'no café');
  await g.out.onclick();
  assert.strictEqual(g.calls.signOut, 1);
  assert.deepStrictEqual(g.calls.switched, [],
    'purging and reloading on a failed sign-out returns to the same gate with the state thrown away');
  assert.match(g.msg.textContent, /Could not sign out: no connection/);
});

test('a second tap while the sign-out is in flight does not fire twice', async () => {
  const g = makeGate(true);
  g.run('nomember', 'no café');
  const first = g.out.onclick();
  g.out.onclick();                       // the button is disabled by now
  await first;
  assert.strictEqual(g.calls.signOut, 1);
});

test('membership revoked MID-SESSION still surfaces, exactly like a later failure', () => {
  /* The `_bootGateDone` guard exists to stop a working app being re-gated by pull-to-refresh. If
     'nomember' were caught by it, bootstrapSync's early return would leave stale data on screen
     with no message — the silent failure this state exists to end, in a new place. */
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');                            // app booted fine as a member
  g.run('nomember', 'removed from the café');
  assert.strictEqual(g.gate.hidden, false);
  assert.match(g.msg.textContent, /removed from the café/);
  assert.strictEqual(g.out.hidden, false);
});

test('the non-member button is not left behind on any other state', () => {
  const g = makeGate(true);
  g.run('nomember', 'no café');
  g.run('loading');
  assert.strictEqual(g.out.hidden, true, 'a Sign out button over a loading spinner is nonsense');
  g.run('nomember', 'no café');
  g.run('error', 'lost the connection');
  assert.strictEqual(g.out.hidden, true, 'signing out does not fix a dropped connection');
  assert.strictEqual(g.retry.hidden, false, 'and Try again must come back');
});

test('185: once the gate says non-member, a later ok CANNOT clear it', () => {
  /* ⚠️ THIS IS THE ONE THAT CAUGHT A REAL HOLE. The gate depends on bootstrapSync RETURNING before
     it paints, and deleting that `return` left the entire 1138-test suite green — measured, not
     supposed. Without the latch the run would carry on, load empty stores, reach its own
     `bootReady('ok')` and HIDE this message, putting the silent empty app straight back with the
     explanation flashing past for one frame.
     Nothing a client can do turns a non-member into a member, so there is no legitimate 'ok' after
     this state; the only way out is the sign-out below, which reloads. */
  const g = makeGate(true);
  g.run('nomember', 'no café');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, false,
    'a success reported after the tenant gate refused is the defect being reported as fixed');
  assert.match(g.msg.textContent, /no café/, 'and the explanation must still be the thing on screen');
});

test('185: the latch does not gate an ordinary boot', () => {
  // The mirror. A latch that fired without cause would be a permanent lockout, which is strictly
  // worse than the empty screen it replaces — so the no-alarm direction is pinned too.
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, true);
  g.run('loading');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, true, 'pull-to-refresh must keep working forever');
});
