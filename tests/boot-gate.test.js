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
const { loadApp, extractFn, extractVar } = require('./_extractfn');

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
  /* 186: the sign-in form and its error line are gate elements now, and they are REAL nodes here
     rather than absent ones — a stub DOM that omits them would let every `if(f)` guard pass
     vacuously, which is the "assertion that cannot fail" shape this repo keeps finding. bgEmail
     carries a focus() so the transition can be observed rather than merely not-thrown-on. */
  const nodes = present
    ? { bootGate: mkNode('bootGate'), bootGateMsg: mkNode('bootGateMsg'), bootGateRetry: mkNode('bootGateRetry'),
        bootGateOut: mkNode('bootGateOut'), bgSignForm: mkNode('bgSignForm'), bgErr: mkNode('bgErr'),
        bootGateBrand: mkNode('bootGateBrand'),
        bgEmail: Object.assign(mkNode('bgEmail'), { focuses: 0, focus() { this.focuses++; } }),
        /* ⚠️ 209 ADDED THESE THREE AND THEIR ABSENCE WAS A REAL HOLE, not a gap in coverage. Until
           this batch the stub had no `bgCafeForm`, `bgCafeNote` or `bgCafeName`, so `cf` and `cn`
           were null in every test in this file and the whole café branch was exercised for "does
           not throw" and nothing else — the vacuous-guard shape the comment above warns about,
           reached by adding elements to the markup and not to the stub. The pre-push review found a
           live defect in that branch and no test here could have gone red for it.
           `bgCafeName` carries a focus() counter for `bgEmail`'s reason: the transition has to be
           OBSERVED, not merely survived. */
        bgCafeForm: mkNode('bgCafeForm'), bgCafeNote: mkNode('bgCafeNote'),
        bgCafeName: Object.assign(mkNode('bgCafeName'), { focuses: 0, focus() { this.focuses++; } }) }
    : {};
  // `omit` models the real mixed-version case: a cached index.html without the newer elements.
  (opts && opts.omit || []).forEach((id) => { delete nodes[id]; });
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
    ${extractVar(SRC, 'SIGNIN_MSG')}
    ${extractFn(SRC, 'gateErr')}
    ${extractFn(SRC, 'bootGate')}
    return { bootGate: bootGate, gateErr: gateErr, SIGNIN_MSG: SIGNIN_MSG };
  `)(nodes, calls, signOutResult);
  return { gate: nodes.bootGate, msg: nodes.bootGateMsg, retry: nodes.bootGateRetry,
           out: nodes.bootGateOut, form: nodes.bgSignForm, err: nodes.bgErr, email: nodes.bgEmail,
           brand: nodes.bootGateBrand,
           cafeForm: nodes.bgCafeForm, cafeNote: nodes.bgCafeNote, cafeName: nodes.bgCafeName,
           run: api.bootGate, gateErr: api.gateErr, SIGNIN_MSG: api.SIGNIN_MSG, calls };
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
  g.run('nomember', 'You’re signed in as c@example.com, but that account isn’t part of a café yet.');
  assert.strictEqual(g.gate.hidden, false, 'an empty app with no explanation is the failure being fixed');
  assert.ok(g.gate.classList.contains('is-error'), 'the spinner must stop — nothing is still loading');
  assert.match(g.msg.textContent, /c@example.com/);
});

test('209: the non-member state offers the café form and its warning', () => {
  /* The screen 185 built could only say "ask the owner"; there was nothing else it could honestly
     say, because a café could not be created from inside the app at all. This is that sentence
     becoming an action. */
  const g = makeGate(true);
  g.run('loading');
  g.run('nomember', 'no café');
  assert.strictEqual(g.cafeForm.hidden, false, 'the form is what makes this screen not a dead end');
  assert.strictEqual(g.cafeNote.hidden, false, 'and the one-café-per-account warning comes with it');
  assert.strictEqual(g.out.hidden, false, 'with sign out still there as the other way out');
});

test('209: a RE-SYNC does not steal the caret or wipe a standing error', () => {
  /* ⚠️ THIS IS THE PRE-PUSH REVIEW'S FINDING, PINNED AT THE LEVEL IT LIVES, and the defect it
     caught is worth stating because the code read correctly. The first cut asked
     `if(cf && cf.hidden)` as its "first time through" test — five lines BELOW the same branch's
     `hideForms()` call, which had just set `cf.hidden=true`. So the guard was true on EVERY
     invocation: every `online` blip and every pull-to-refresh cleared the error explaining why the
     last attempt was refused and yanked focus back into the field, mid-word.
     It is invisible by reading because the identical-looking guard three states up IS correct —
     the 'signin' branch does not call `hideForms` first, so its flag still means what it says.
     ⚠️ AND NOTHING COULD HAVE CAUGHT IT: this file's DOM stub had no café elements at all, so the
     branch ran with `cf === null` in every test; and the Playwright case titled "a re-sync does NOT
     empty a half-typed café name" asserted only that the field still held its VALUE, which
     `.focus()` does not touch — green whichever way the guard went. Roster 205's shape exactly: a
     title naming a property the assertions cannot see. */
  const g = makeGate(true);
  g.run('loading');
  g.run('nomember', 'no café');
  assert.strictEqual(g.cafeName.focuses, 1, 'the transition gives the field the caret, once');

  // the user is refused, so a message is standing on screen
  g.gateErr('That name is too long — 60 characters at most.');
  assert.strictEqual(g.err.hidden, false);

  // …and the browser comes back online, so bootstrapSync re-runs and lands here again
  g.run('nomember', 'no café');
  assert.strictEqual(g.cafeForm.hidden, false, 'the form is still up');
  assert.strictEqual(g.cafeName.focuses, 1,
    'and the caret was NOT taken a second time — a re-focus on a timer interrupts a word');
  assert.strictEqual(g.err.hidden, false,
    'the refusal must outlive the blip that followed it, or the user is told nothing');
  assert.match(g.err.textContent, /too long/);
});

test('209: leaving the non-member state and coming back DOES focus again', () => {
  /* The other half, and the reason the guard is a TRANSITION test rather than a one-way latch:
     arriving at this screen with no caret in its only field is worse than the interruption the test
     above forbids. A latch would have passed that test and failed this one, which is why both are
     here — "never focus twice" and "focus on arrival" are different rules and only one of them is
     satisfied by doing nothing.
     ⚠️ THE PATH MATTERS AND THE FIRST DRAFT OF THIS TEST GOT IT WRONG. It went nomember → loading →
     nomember and asserted a second focus, on the assumption that 'loading' repaints. It does not:
     185's latch makes an automatic 'loading' return early while `_bootNoMember` is set, precisely so
     an `online` blip cannot swap this screen for a spinner — so `hideForms` never runs and nothing
     has left. The real re-entry is through the ERROR gate, which does hide the forms: a boot that
     fails, Try again, and a re-sync that this time answers "no café". */
  const g = makeGate(true);
  g.run('nomember', 'no café');
  assert.strictEqual(g.cafeName.focuses, 1);
  g.run('error', 'Couldn’t load your data');
  assert.strictEqual(g.cafeForm.hidden, true, 'the error screen must not leave a café form on it');
  g.run('nomember', 'no café');
  assert.strictEqual(g.cafeName.focuses, 2, 'a genuine re-entry is a transition and gets the caret');
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

test('a real connection failure still takes over from the non-member gate', () => {
  /* The one state that MAY replace it, and should. If a later run genuinely throws, the user has a
     connection problem now, and Try again is the action that can help; signing out is not. It is
     self-correcting — the retry re-runs the sync and lands back on the non-member gate if that is
     still the answer. (A re-sync that merely STARTS is different and leaves the screen alone;
     that is the test above.) */
  const g = makeGate(true);
  g.run('nomember', 'no café');
  g.run('error', 'lost the connection');
  assert.strictEqual(g.out.hidden, true, 'signing out does not fix a dropped connection');
  assert.strictEqual(g.retry.hidden, false, 'and Try again must come back');
  assert.match(g.msg.textContent, /lost the connection/);
});

test('the sign-out button never appears on a state that has not earned it', () => {
  const g = makeGate(true);
  g.run('loading');
  assert.strictEqual(g.out.hidden, true, 'a Sign out button over a loading spinner is nonsense');
  g.run('error', 'boom');
  assert.strictEqual(g.out.hidden, true);
  g.run('ok');
  assert.strictEqual(g.out.hidden, true);
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

test('185: a re-sync does NOT disturb the non-member gate', () => {
  /* ⚠️ REWRITTEN AFTER THE PRE-PUSH REVIEW. This test used to drive loading → nomember → loading →
     ok and assert the gate HIDES, on the reading "membership was granted between two runs". At the
     bootGate level that call sequence is indistinguishable from the dangerous one — a re-sync whose
     tenant lookup failed while every table read returned `[]` — and the old code hid the gate for
     both. The latch is no longer cleared here at all; only a DEFINITE uuid clears it, in
     bootstrapSync, which is the only place that can tell the two apart.
     What bootGate owes the user is therefore narrower and testable: a re-sync leaves this screen
     exactly as it was. */
  const g = makeGate(true);
  g.run('loading');
  g.run('nomember', 'no café');
  g.run('loading');                        // the `online` listener fires after a blip
  assert.strictEqual(g.gate.hidden, false, 'the gate must not blink out mid-explanation');
  assert.match(g.msg.textContent, /no café/,
    'the explanation must not be replaced by a spinner on every network flap');
  assert.strictEqual(g.out.hidden, false,
    'and the one way out must not disappear for the duration of a re-sync');
});

test('185: an ok still cannot clear the gate on its own — only a cleared latch can', () => {
  // The missing-return case, and the review's case, are now the SAME case, which is the point of
  // moving the decision to where the tenant answer is read.
  const g = makeGate(true);
  g.run('loading');
  g.run('nomember', 'no café');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, false);
  assert.match(g.msg.textContent, /no café/);
});

test('185: Try again still visibly responds when a failure has taken over the non-member gate', () => {
  /* ⚠️ THE SAME BUG v115 ALREADY FIXED ONCE, nearly reintroduced by 185's early return. A real
     connection failure MAY replace this screen — Try again is the action that helps then, signing
     out is not — and an unconditional `if(_bootNoMember) return` in the 'loading' branch would have
     swallowed the tap's own 'loading', leaving the button looking dead for a whole round trip.
     An explicit tap always responds; an automatic re-sync does not disturb the screen. */
  const g = makeGate(true);
  g.run('loading');
  g.run('nomember', 'no café');
  g.run('error', 'lost the connection');   // a later run genuinely threw
  g.retry.onclick();
  assert.strictEqual(g.calls.bootstrapSync, 1, 'the retry must actually re-run the sync');
  assert.match(g.msg.textContent, /Trying again/, 'and the screen must visibly respond to the tap');
  assert.strictEqual(g.gate.classList.contains('is-error'), false, 'and stop claiming it failed');
});

/* ── 186: the SIGN-IN state ──────────────────────────────────────────────────────────────────
   The last permissive read in the database comes out in this batch, so a signed-out browser now
   answers a null tenant exactly as a signed-in non-member does. Same gate, different screen: this
   one is a way IN, and it is not an error — nobody has failed at anything by opening the app on a
   device that has never been signed in. */

test('186: the sign-in state shows the form and says why, without claiming a failure', () => {
  const g = makeGate(true);
  g.run('loading');
  g.run('signin');
  assert.strictEqual(g.gate.hidden, false);
  assert.strictEqual(g.form.hidden, false, 'the form IS the content of this screen');
  assert.strictEqual(g.msg.textContent, g.SIGNIN_MSG, 'the message comes from one place');
  assert.strictEqual(g.gate.classList.contains('is-signin'), true, 'the class the CSS hangs the layout on');
  assert.strictEqual(g.gate.classList.contains('is-error'), false,
    'an unsigned-in device is the ordinary state of a new phone, not a fault');
});

test('186: neither dead button is offered — there is nothing to retry and nothing to sign out of', () => {
  const g = makeGate(true);
  g.run('signin');
  assert.strictEqual(g.retry.hidden, true, 'retrying asks the same question and gets the same answer');
  assert.strictEqual(g.out.hidden, true, 'and you cannot sign out of nothing');
});

test('186: the email field is focused ONCE, on the transition, never on a repaint', () => {
  /* Re-focusing on every re-sync would steal the caret mid-word — and this screen is one a user is
     typing a password into, so the cost is not cosmetic. */
  const g = makeGate(true);
  g.run('signin');
  assert.strictEqual(g.email.focuses, 1, 'the caret starts where the user must type');
  g.run('signin');
  assert.strictEqual(g.email.focuses, 1, 'and is not taken back on a second paint');
});

test('186: a re-sync does NOT repaint the sign-in screen — a typed password must survive a blip', () => {
  /* The `online` listener re-runs bootstrapSync, which calls bootGate('loading') first. Without the
     latch that would swap this screen for a spinner and take the form away mid-typing. Same
     mechanism 185 needed for its explanation; the consequence here is losing the user's input. */
  const g = makeGate(true);
  g.run('signin');
  g.run('loading');
  assert.strictEqual(g.form.hidden, false, 'the form must still be there');
  assert.strictEqual(g.msg.textContent, g.SIGNIN_MSG, 'and still say what it said');
});

test('186: an ok cannot clear the sign-in gate either — the latch covers both screens', () => {
  const g = makeGate(true);
  g.run('signin');
  g.run('ok');
  assert.strictEqual(g.gate.hidden, false, 'a success that reached here would paint an empty app');
  assert.strictEqual(g.form.hidden, false);
});

test('186: a real connection failure still takes over from the sign-in screen', () => {
  /* Same shape as the non-member case: the error is the newer, truer fact, and Try again is the
     action that helps. The form must go with it — a sign-in box under "couldn't reach the server"
     is two contradictory instructions on one screen. */
  const g = makeGate(true);
  g.run('signin');
  g.run('error', 'Couldn’t load your data');
  assert.ok(g.gate.classList.contains('is-error'));
  assert.strictEqual(g.gate.classList.contains('is-signin'), false, 'the sign-in layout must not persist');
  assert.strictEqual(g.form.hidden, true);
  assert.strictEqual(g.retry.hidden, false);
  assert.match(g.msg.textContent, /Couldn’t load/);
});

test('186: signing in and being told there is no café are different screens, and swap cleanly', () => {
  /* Reachable in one session: sign in from the gate on an account with no membership, and the
     reload lands on 'nomember'. Nothing of the first screen may be left behind — a form under
     "ask the café owner to add this account" invites a second attempt that cannot work. */
  const g = makeGate(true);
  g.run('signin');
  g.run('nomember', 'no café for you@example.com');
  assert.strictEqual(g.form.hidden, true, 'the form must not survive into the message screen');
  assert.strictEqual(g.gate.classList.contains('is-signin'), false);
  assert.strictEqual(g.out.hidden, false, 'and THAT screen’s one action is offered');
  assert.match(g.msg.textContent, /no café for you@example.com/);
});

test('186: a stale sign-in error does not follow the user onto another screen', () => {
  const g = makeGate(true);
  g.run('signin');
  g.gateErr('Invalid login credentials');
  assert.strictEqual(g.err.hidden, false, 'the error shows while it is true');
  g.run('error', 'boom');
  assert.strictEqual(g.err.hidden, true, 'and is cleared by the screen that replaces it');
  assert.strictEqual(g.err.textContent, '');
});

test('186: the gate still never throws when the sign-in elements are absent', () => {
  /* An older cached index.html against a newer app.js is exactly this case — the service worker is
     network-first, but the two files are two requests and one can be served from cache. It must
     degrade to the message alone rather than dying before it paints anything at all. */
  const g = makeGate(true, { omit: ['bgSignForm', 'bgEmail', 'bgErr'] });
  assert.doesNotThrow(() => { g.run('signin'); g.run('loading'); g.run('nomember', 'x'); g.run('error', 'y'); });
  assert.strictEqual(g.gate.hidden, false, 'and it still paints');
});

test('186: the two "you cannot use this app" screens cover the chrome; the ERROR state does not', () => {
  /* v108 chose z-index 60 so a failed boot leaves the nav and Settings reachable — Try again is the
     action that helps and the app never looks crashed. Neither reason survives behind a sign-in
     screen or a non-member message: every tab is a café this caller cannot read, so a lit nav bar
     is five dead controls (ten on the desktop rail). The class is what the CSS hangs that on, so
     it is pinned here and its z-index is pinned in css-syntax's sibling — see the rule itself. */
  const g = makeGate(true);
  g.run('signin');
  assert.strictEqual(g.gate.classList.contains('is-signin'), true);
  assert.strictEqual(g.gate.classList.contains('is-nomember'), false);

  g.run('nomember', 'no café');
  assert.strictEqual(g.gate.classList.contains('is-nomember'), true, 'the message screen covers it too');
  assert.strictEqual(g.gate.classList.contains('is-signin'), false, 'and never both at once');

  g.run('error', 'boom');
  assert.strictEqual(g.gate.classList.contains('is-nomember'), false,
    'an error must NOT swallow the chrome — Settings and the nav stay reachable while data is missing');
  assert.strictEqual(g.gate.classList.contains('is-signin'), false);

  // and a success leaves nothing behind
  const h = makeGate(true);
  h.run('nomember', 'x');
  assert.strictEqual(h.gate.classList.contains('is-nomember'), true);
});

test('186: a cleared latch lets ok drop both classes, so the app is not left under a dead overlay', () => {
  const g = makeGate(true);
  g.run('signin');
  // only a definite tenant clears the latch; bootstrapSync owns that, so reach in the way it does
  g.run('nomember', 'x');
  g.run('error', 'y');            // an error may take over, and it clears is-nomember
  assert.strictEqual(g.gate.classList.contains('is-nomember'), false);
});

test('186: the wordmark answers a stranger on the sign-in screen, and nowhere else', () => {
  /* The sign-in state covers the header and the rail, which are the only two places that say what
     this app is — so without it the public URL answers an unlabelled login box. Every other gate
     state is reached from INSIDE the app, where the name is already on screen. */
  const g = makeGate(true);
  g.run('loading');
  assert.strictEqual(g.brand.hidden, true, 'a spinner does not need a masthead');
  g.run('signin');
  assert.strictEqual(g.brand.hidden, false);
  g.run('nomember', 'x');
  assert.strictEqual(g.brand.hidden, true);
  g.run('signin');
  g.run('error', 'boom');
  assert.strictEqual(g.brand.hidden, true, 'and it must not survive onto the error screen');
});

test('186: signing out ELSEWHERE mid-session still surfaces, exactly like a revoked membership', () => {
  /* Reachable in one session: the token expires, or the account is signed out in another tab, and
     the `online` listener re-syncs. Without 'signin' in the never-re-gate exemption at the top of
     bootGate, the app would keep showing whatever was on screen — real prices, from a session that
     no longer exists, with no way to sign back in. */
  const g = makeGate(true);
  g.run('loading');
  g.run('ok');                              // the app booted fine and is in use
  g.run('signin');                          // …and a later re-sync finds nobody signed in
  assert.strictEqual(g.gate.hidden, false, 'a working-looking app on a dead session is the silent failure');
  assert.strictEqual(g.form.hidden, false, 'and the way back in must be offered');
  assert.strictEqual(g.msg.textContent, g.SIGNIN_MSG);
});
