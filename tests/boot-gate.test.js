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

/* 243 — the one node in this file that is more than a bag of properties, because the renderer
   WRITES markup to it and then reads the buttons back out to bind them.
   ⚠️ TWO TRAPS, BOTH HIT WHILE WRITING IT, BOTH RECORDED BECAUSE THEY MAKE A TEST VACUOUS RATHER
   THAN RED:
     1. The buttons must be the SAME OBJECTS across calls. A `querySelectorAll` that rebuilds them
        each time sends the renderer's `onclick` to a throwaway, so "is every row bound?" can never
        pass — a real element persists between the write and the read, and that persistence is the
        whole question. Roster 195: a fake DOM must not collapse two steps the real one keeps apart.
     2. `Object.assign` COPIES A GETTER'S VALUE, NOT THE ACCESSOR. Defining `innerHTML` as a
        get/set pair inside an object literal handed to `Object.assign` silently produced a plain
        data property holding `''`, so the setter never ran, `_btns` stayed empty, and the repaint
        test failed for a reason that had nothing to do with the app. Built with the accessor on the
        object itself instead. */
function mkInviteList() {
  const node = mkNode('bgInviteList');
  let html = '';
  let btns = [];
  Object.defineProperty(node, 'innerHTML', {
    get() { return html; },
    set(v) {
      html = String(v);
      btns = [...html.matchAll(/data-invite="([^"]*)"/g)].map((m) => ({
        onclick: null, disabled: false,
        getAttribute: (a) => (a === 'data-invite' ? m[1] : null),
      }));
    },
  });
  node.querySelectorAll = () => btns;
  return node;
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
        bgCafeName: Object.assign(mkNode('bgCafeName'), { focuses: 0, focus() { this.focuses++; } }),
        /* ⚠️ 243 ADDED THESE THREE AS REAL NODES FOR THE REASON THE 209 NOTE ABOVE RECORDS: an
           absent node makes every `if(el)` guard pass vacuously, so the chooser would be exercised
           for "does not throw" and nothing else — which is how 209's café branch shipped a live
           defect no test here could have caught.
           `bgInviteList` needs `innerHTML` and `querySelectorAll` because the renderer writes
           markup and then binds the buttons it wrote; a stub that accepted the write and returned
           nothing to bind would hide a chooser that paints and cannot be clicked. It parses the
           `data-invite` attributes back out of the HTML it was given, which is crude but is the
           one property the binding depends on. */
        bgInvites: mkNode('bgInvites'), bgInvitesNote: mkNode('bgInvitesNote'),
        bgInviteList: mkInviteList(),
        /* ⚠️ 243 ADDED THESE FOUR TOO, AND THEIR ABSENCE WAS THE SAME HOLE A THIRD TIME. `hideForms`
           and the 'signin' branch both reach for `bgSignUpForm` and `bgDone`, and neither existed
           here — so 192's guard, `if((su && !su.hidden) || (dn && !dn.hidden)) return;`, was reading
           two nulls in every test in this file and could not fire. The one thing it protects (a
           half-typed sign-up, and the "check your email" line, surviving a re-sync) was therefore
           pinned by nothing at all. Found while adding a fix two lines above it. */
        bgSignUpForm: mkNode('bgSignUpForm'), bgDone: mkNode('bgDone'),
        bgAltIn: mkNode('bgAltIn'), bgAltUp: mkNode('bgAltUp') }
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
    /* 238: the verdict read out of the URL at load. Injected as a VALUE rather than extracted with
       its initialiser, because the shipped line calls captureAuthUrlError(location, history) and
       this harness has neither — and faking those two here would put a stub between the test and
       the decision it is checking. The parse and the wording are pinned against the real functions
       in auth-url-error.test.js; what belongs HERE is the one thing only bootGate can answer:
       whether reaching the sign-in state paints it, and whether reaching it again repaints it. */
    var AUTH_URL_ERR = ${JSON.stringify((opts && opts.urlErr) || '')};
    ${extractVar(SRC, 'SIGNIN_MSG')}
    ${extractFn(SRC, 'gateErr')}
    ${extractVar(SRC, '_authUrlErrShown')}
    ${extractFn(SRC, 'paintAuthUrlError')}
    /* 243: the chooser the 'nomember' branch paints. Real, not stubbed — a stub would be written
       from the same belief as the code, which is this repo's most recorded defect. */
    ${extractFn(SRC, 'esc')}
    ${extractFn(SRC, 'invitesOf')}
    ${extractVar(SRC, '_pendingInvites')}
    ${extractFn(SRC, 'applyPendingInvites')}
    ${extractFn(SRC, 'renderInviteChoices')}
    ${extractFn(SRC, 'bootGate')}
    return { bootGate: bootGate, gateErr: gateErr, SIGNIN_MSG: SIGNIN_MSG,
             shown: function(){ return _authUrlErrShown; },
             setInvites: function(rows){ return applyPendingInvites(rows); },
             invites: function(){ return _pendingInvites; } };
  `)(nodes, calls, signOutResult);
  return { gate: nodes.bootGate, msg: nodes.bootGateMsg, retry: nodes.bootGateRetry,
           out: nodes.bootGateOut, form: nodes.bgSignForm, err: nodes.bgErr, email: nodes.bgEmail,
           brand: nodes.bootGateBrand,
           cafeForm: nodes.bgCafeForm, cafeNote: nodes.bgCafeNote, cafeName: nodes.bgCafeName,
           signUp: nodes.bgSignUpForm, done: nodes.bgDone,
           invites: nodes.bgInvites, invitesNote: nodes.bgInvitesNote, inviteList: nodes.bgInviteList,
           setInvites: api.setInvites, heldInvites: api.invites,
           run: api.bootGate, gateErr: api.gateErr, SIGNIN_MSG: api.SIGNIN_MSG,
           urlErrShown: api.shown, calls };
}

/* ---------------------------------------------------------------------------------------------
   246 / QUEUE item 20 — WHICH READS ARE FATAL.

   ⚠️ THESE ARE COUPLING CHECKS AND ARE LABELLED AS ONE, because CLAUDE.md's roster is largely tests
   that grep source and prove nothing. The BEHAVIOUR is pinned in `tests/visual/246-menus-read.spec.js`,
   which fails the real `menus` request in a real browser and asserts the gate appears — the only
   harness that can, since the read list lives inside a 400-line async `bootstrapSync` that cannot be
   brace-extracted and driven.
   What these add is the thing a browser spec cannot: they fail by NAME when someone re-softens the
   read or drops it from the throw, instead of failing as a timeout in a spec about something else.
   --------------------------------------------------------------------------------------------- */

const bootCode = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
  .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');   // 183(a): the prose here names both spellings

test('246: the menus read is REQUIRED — not soft-wrapped, and in the fatal check', () => {
  /* THE FATAL CHECK IS THE MECHANISM and is asserted first, because the two look like a pair and
     are not. Measured by mutating each separately: re-softening the read alone leaves the browser's
     behaviour correct (a soft `{error}` still reaches this check); dropping `mres.error` from the
     check alone restores the bug in full. The soft assertion below is about legibility — this read
     belongs with the four it is now one of — and is kept for that, not as a second guard. */
  const fatal = /if\(ing\.error\|\|men\.error\|\|pla\.error\|\|setg\.error\|\|mres\.error\)/;
  assert.match(bootCode, fatal, 'mres joins the four reads whose failure raises the boot gate');
  assert.match(bootCode, /\n\s*SUPA\.from\('menus'\)\.select\('\*'\),/,
    'and the read is issued bare, alongside the other four required ones');
  assert.doesNotMatch(bootCode, /soft\(SUPA\.from\('menus'\)/,
    'not back inside soft(), where it read as optional');
});

test('246: nothing seeds a menu into memory any more — the list means menus the server has', () => {
  /* The invariant the deletion bought, and the reason it is asserted HERE rather than only in
     menu-default: `withPublishMenu` reads `menusList.length` to decide whether a menu needs
     creating, so a writer that does not wait for the server puts a hole straight through the
     publish path. Three writers survive and every one of them waits. */
  assert.doesNotMatch(bootCode, /ensureDefaultMenu/,
    'the boot seeder is deleted, definition and call site');
  assert.doesNotMatch(bootCode, /menusList\.unshift/,
    'and nothing else unshifts an unwritten menu in its place');
  const writers = (bootCode.match(/menusList\s*=\s*[^=]|menusList\.push/g) || []).length;
  assert.ok(writers > 0, 'sanity: the writers are still findable, or the two assertions above are vacuous');
});

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

/* ---- 238: the verdict from a confirmation link, painted onto the screen that can act on it ----
 *
 * `captureAuthUrlError` reads GoTrue's answer out of the URL at load; its parse and its wording are
 * pinned in auth-url-error.test.js. What only bootGate can answer is the timing, and the timing is
 * where 209 was bitten on this exact branch: the sign-in state is re-entered on every re-sync that
 * reaches it, so anything painted here has to be a ONE-SHOT or it walks over live state.
 */

test('238: a dead confirmation link is explained on the sign-in screen', () => {
  const g = makeGate(true, { urlErr: 'That link has already been used.' });
  assert.strictEqual(g.err.hidden, true, 'nothing is said before the gate exists');
  g.run('signin');
  assert.strictEqual(g.err.hidden, false, 'a bare form with no explanation is the defect');
  assert.strictEqual(g.err.textContent, 'That link has already been used.');
});

test('238: an ordinary boot is never accused of a broken link', () => {
  /* The overwhelmingly common case, and the one a careless painter breaks: every signed-out visitor
     who has clicked nothing at all reaches this same state. */
  const g = makeGate(true, { urlErr: '' });
  g.run('signin');
  assert.strictEqual(g.err.hidden, true);
  assert.strictEqual(g.err.textContent, '');
  assert.strictEqual(g.urlErrShown(), false, 'and the one-shot is not spent by a boot with nothing to say');
});

test('238: ⚠️ ONE SHOT — a re-sync must not repaint it over a live sign-in error', () => {
  /* THE DEFECT THIS PINS, and it is 209's on the branch next door rather than a hypothetical.
     bootGate('signin') runs again on every `online` blip and every pull-to-refresh. Someone who has
     read the link message, typed their password and got it wrong is now looking at "Invalid login
     credentials" — and a repaint would replace that with a stale complaint about a link they have
     already dealt with, at the exact moment they need the other message. */
  const g = makeGate(true, { urlErr: 'That link has already been used.' });
  g.run('signin');
  assert.strictEqual(g.urlErrShown(), true, 'said once');
  g.gateErr('Invalid login credentials');
  g.run('signin');                          // an online blip, mid-typing
  assert.strictEqual(g.err.textContent, 'Invalid login credentials',
    'the live error survives; the spent one does not come back');
});

test('238: it is not painted onto screens that cannot act on it', () => {
  /* 'nomember' and 'error' call hideForms() and have their own message. A link complaint there
     would be an answer to a question the user is no longer asking. */
  const g = makeGate(true, { urlErr: 'That link has already been used.' });
  g.run('loading');
  assert.strictEqual(g.err.hidden, true);
  g.run('nomember', 'x');
  assert.strictEqual(g.err.hidden, true);
  assert.strictEqual(g.urlErrShown(), false, 'and the one shot is still in hand for the sign-in screen');
  g.run('signin');
  assert.strictEqual(g.err.hidden, false, 'which is where it is spent');
});

test('238: a cached index.html with no bgErr degrades to silence, not a throw', () => {
  /* The network-first service worker fetches index.html and js/app.js as two requests, so a newer
     app.js against an older cached page is a real state. gateErr already no-ops on a missing
     element; this pins that paintAuthUrlError does not reach past it. */
  const g = makeGate(true, { urlErr: 'That link has already been used.', omit: ['bgErr'] });
  assert.doesNotThrow(() => { g.run('signin'); g.run('signin'); });
});

/* ============================================================================================
 * 243 — THE INVITATION CHOOSER.
 *
 * `claim_business_invite` used to take `limit 1` over `order by created_at` when one address held
 * two pending invitations, so it silently joined the OLDER café and took that invitation's ROLE.
 * The migration makes it refuse instead. Refusing without asking would turn "joined the wrong café"
 * into "joined nothing", so the non-member gate now offers the choice — and these pin that half.
 *
 * The functions are the real ones, brace-extracted, and the list node parses back the markup the
 * renderer actually wrote, so a chooser that paints but binds nothing fails here.
 * ========================================================================================== */

const INV_TWO = { data: [
  { invite_id: 'inv-a', business_id: 'biz-a', business_name: "Kelly's", role: 'owner' },
  { invite_id: 'inv-b', business_id: 'biz-b', business_name: 'The Beach Shack', role: 'staff' },
], error: null };

test('243: two invitations are offered by NAME, with the role each one carries', () => {
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember', 'This account isn’t part of a café yet.');

  assert.strictEqual(g.invites.hidden, false, 'the chooser must be on screen');
  assert.match(g.invitesNote.textContent, /More than one café has invited this address/);
  /* The NAME is what a person chooses between, and the ROLE is the consequence they are agreeing
     to. The old function decided both silently, so both have to be visible here. */
  assert.match(g.inviteList.innerHTML, /Kelly&#39;s|Kelly's/, 'the café name is the choice');
  assert.match(g.inviteList.innerHTML, /The Beach Shack/);
  assert.match(g.inviteList.innerHTML, /Join as owner/);
  assert.match(g.inviteList.innerHTML, /Join as staff/);
  assert.match(g.inviteList.innerHTML, /data-invite="inv-a"/);
  assert.match(g.inviteList.innerHTML, /data-invite="inv-b"/);
});

test('243: every offered row is BOUND, not just drawn', () => {
  /* A chooser that paints and cannot be clicked is the same silence 185 exists to end, and it is
     invisible to an assertion that only reads the markup. */
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember');
  const bound = g.inviteList.querySelectorAll('[data-invite]');
  assert.strictEqual(bound.length, 2);
  bound.forEach((b) => assert.strictEqual(typeof b.onclick, 'function', 'each row must act'));
});

test('243: the café name comes off the wire and is ESCAPED', () => {
  /* The one string in this app written by one user and rendered to another: the café's name is
     typed by whoever sent the invitation, and read by whoever is deciding whether to accept it. */
  const g = makeGate(true);
  g.setInvites({ data: [{ invite_id: 'x', business_name: '<img src=x onerror=alert(1)>', role: 'staff' }], error: null });
  g.run('nomember');
  assert.ok(!/<img/.test(g.inviteList.innerHTML), 'no raw tag may reach the gate');
  assert.match(g.inviteList.innerHTML, /&lt;img/);
});

test('243: with NO invitations the screen is byte-for-byte the one 209 shipped', () => {
  /* The fail-safe, and the property that makes the extra round trip safe to add: [] is what an
     error, an older project and a genuine "nobody invited you" all produce. */
  const g = makeGate(true);
  g.run('nomember', 'This account isn’t part of a café yet.');
  assert.strictEqual(g.invites.hidden, true, 'nothing offered means nothing shown');
  assert.strictEqual(g.cafeForm.hidden, false, 'and creating a café is still the way forward');
  assert.strictEqual(g.out.hidden, false);
});

test('243: an unreadable answer CHANGES NOTHING — it must not empty a standing offer', () => {
  /*
   * ⚠️ THIS TEST ASSERTED THE OPPOSITE UNTIL THE PRE-PUSH REVIEW, AND THE CODE AGREED WITH IT.
   * `invitesOf` returned [] for BOTH "you have no invitations" and "I could not tell", so a recheck
   * on a flaky connection — which is exactly when a join fails and a recheck happens — emptied a
   * chooser somebody was reading and left them facing "Create my café" alone. 187 makes membership
   * one café per person with no way to leave, so acting on that is IRREVERSIBLE.
   *
   * Same family as `_bootNoMember`: only a DEFINITE answer may move a standing verdict.
   */
  const g = makeGate(true);
  assert.strictEqual(g.setInvites(INV_TWO), true, 'a real list is a definite answer');
  g.run('nomember');
  assert.strictEqual(g.invites.hidden, false);

  [{ error: { message: 'boom' } }, { data: null, error: null }, { data: 'nonsense', error: null }, null]
    .forEach((res) => {
      assert.strictEqual(g.setInvites(res), false, 'not a definite answer: ' + JSON.stringify(res));
      g.run('nomember');
      assert.strictEqual(g.invites.hidden, false, 'the offer must survive an unreadable recheck');
      assert.strictEqual(g.heldInvites().length, 2, 'and survive intact');
    });
});

test('243: a DEFINITE empty answer does clear the offer', () => {
  /* The other half, and the reason the third value is `null` rather than "always keep": an
     invitation genuinely cancelled while somebody looked at it must stop being offered, or the
     button they press cannot work. */
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember');
  assert.strictEqual(g.invites.hidden, false);

  assert.strictEqual(g.setInvites({ data: [], error: null }), true, 'zero rows IS an answer');
  g.run('nomember');
  assert.strictEqual(g.invites.hidden, true, 'a cancelled invitation stops being offered');
  assert.deepStrictEqual(g.heldInvites(), []);
});

test('243: a row with no id is DROPPED, never drawn as a button that cannot work', () => {
  const g = makeGate(true);
  g.setInvites({ data: [
    { invite_id: '', business_name: 'Broken' },
    { business_name: 'Also broken' },
    { invite_id: 'ok', business_name: 'Real' },
  ], error: null });
  g.run('nomember');
  assert.strictEqual(g.heldInvites().length, 1, 'only the row that can be claimed survives');
  assert.ok(!/Broken/.test(g.inviteList.innerHTML));
  assert.match(g.inviteList.innerHTML, /Real/);
});

test('243: a nameless café still gets a usable label, whatever shape the blank arrives in', () => {
  /* ⚠️ `null` ALONE DOES NOT PIN THIS, which the mutation gate caught. The guard is
     `typeof x === 'string' && x`, and flipping it to `||` still yields the fallback for null — so a
     test using only null passes against the broken guard. The cases that separate them are the
     EMPTY STRING (a café row saved with a blank name) and a NON-STRING, both of which the `||`
     version would render verbatim: an empty button, or a number, neither of which is a choice. */
  [null, undefined, '', 0, 7, {}].forEach((name) => {
    const g = makeGate(true);
    g.setInvites({ data: [{ invite_id: 'i1', business_name: name, role: 'staff' }], error: null });
    g.run('nomember');
    assert.match(g.inviteList.innerHTML, /A café/, 'a blank button is not a choice: ' + JSON.stringify(name));
    assert.match(g.inviteList.innerHTML, /data-invite="i1"/, 'and it is still claimable');
  });
});

test('243: ONE invitation still reaching this screen is offered, with different copy', () => {
  /* The claim takes a lone invitation automatically, so arriving here with one means it did not
     settle — an unreadable answer. Offering it is still right; calling it "more than one" is not. */
  const g = makeGate(true);
  g.setInvites({ data: [{ invite_id: 'i1', business_name: 'Solo', role: 'staff' }], error: null });
  g.run('nomember');
  assert.strictEqual(g.invites.hidden, false);
  assert.match(g.invitesNote.textContent, /A café has invited this address/);
  assert.ok(!/More than one/.test(g.invitesNote.textContent));
});

test('243: hideForms covers the fourth block — an error must not sit under a stale offer', () => {
  /* hideForms' whole job. 209's note says adding the café form meant adding two lines there and
     nothing else; this is the check that the fourth one was not forgotten. */
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember');
  assert.strictEqual(g.invites.hidden, false, 'offered first');
  g.run('error', 'Couldn’t load your data: boom');
  assert.strictEqual(g.invites.hidden, true, 'an error screen must not carry a stale offer');
});

test('243: a re-sync does NOT tear the offer down — 185’s early return, and it is deliberate', () => {
  /* ⚠️ WRITTEN THE OTHER WAY ROUND FIRST, ASSERTING THAT 'loading' HID IT, AND THE CODE WAS RIGHT.
     185 returns early from 'loading' whenever the non-member latch is set and this is not an
     explicit retry, precisely so an `online` blip cannot swap this screen for a spinner. The
     chooser is part of that screen and inherits the protection: a person reading two café names is
     mid-decision, and a background re-sync must not take the choice away and put it back.
     Kept as a test rather than deleted, because the next reader will have the same instinct. */
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember');
  g.run('loading');
  assert.strictEqual(g.invites.hidden, false, 'a background re-sync leaves the choice on screen');

  /* An EXPLICIT retry is the exception 185 already carves out — the tap must visibly respond. */
  const g2 = makeGate(true);
  g2.setInvites(INV_TWO);
  g2.run('nomember');
  g2.run('error', 'boom');
  g2.retry.onclick();
  assert.strictEqual(g2.invites.hidden, true, 'a tapped Try again does respond');
});

test('243: a re-sync REPAINTS the offer rather than leaving a cancelled one up', () => {
  /* Unlike the café field, which is "shown, never reset" because a person may be halfway through
     typing it. There is nothing to type here, and an invitation cancelled between two re-syncs
     must stop being offered. */
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember');
  assert.strictEqual(g.inviteList.querySelectorAll('[data-invite]').length, 2);

  g.setInvites({ data: [{ invite_id: 'inv-b', business_name: 'The Beach Shack', role: 'staff' }], error: null });
  g.run('nomember');
  assert.strictEqual(g.inviteList.querySelectorAll('[data-invite]').length, 1, 'the cancelled one is gone');
  assert.ok(!/inv-a/.test(g.inviteList.innerHTML));
});

test('243: a cached index.html with no chooser markup degrades to silence, not a throw', () => {
  /* ⚠️ EACH ELEMENT IS OMITTED ON ITS OWN AS WELL AS ALL THREE TOGETHER, and the gate caught why:
     the guard is `if(!box || !list) return;`, and flipping it to `&&` still returns when BOTH are
     missing — so a test that only omits everything passes against the broken guard. A PARTIAL cached
     page is also the more realistic failure: index.html and js/app.js are separate requests with
     separate cache entries, so "new script, older markup" is a state this app genuinely reaches. */
  [['bgInvites', 'bgInvitesNote', 'bgInviteList'], ['bgInvites'], ['bgInviteList'], ['bgInvitesNote']]
    .forEach((omit) => {
      const g = makeGate(true, { omit });
      g.setInvites(INV_TWO);
      assert.doesNotThrow(() => { g.run('nomember'); g.run('nomember'); },
        'missing ' + omit.join(',') + ' must be a no-op, not a throw');
      assert.strictEqual(g.cafeForm.hidden, false, 'and the rest of the screen still paints');
      assert.strictEqual(g.out.hidden, false, 'including the way out');
    });
});

test('243: a session that expires on the non-member screen does not leave its offers up', () => {
  /* nomember -> signin is reachable: `getSession` failing, or a session expiring, while that screen
     is up flips `sessionUser` to null and bootstrapSync paints 'signin' instead.
     PRE-EXISTING since 209 for the café form — "Create my café" sat above a sign-in form, offering
     an action the server refuses for having no session — and this batch would have made the
     invitation chooser a third stale block. Fixed here rather than filed, because the batch that
     adds a block to a screen owns whether it comes down. */
  const g = makeGate(true);
  g.setInvites(INV_TWO);
  g.run('nomember');
  assert.strictEqual(g.cafeForm.hidden, false);
  assert.strictEqual(g.invites.hidden, false);

  g.run('signin');
  assert.strictEqual(g.invites.hidden, true, 'no invitation offer over a sign-in form');
  assert.strictEqual(g.cafeForm.hidden, true, 'and no café form either');
  assert.strictEqual(g.cafeNote.hidden, true);
  assert.strictEqual(g.form.hidden, false, 'the sign-in form is what this screen is for');
});

test('243: ...and it does NOT use hideForms, which would tear down a half-typed sign-up', () => {
  /* The reason the fix above is three NAMED lines rather than one `hideForms()` call. 192's guard
     protects an in-progress sign-up, and the "check your email" line, from being reset by a
     re-sync; reaching for hideForms() to tidy the café form away would have fixed a stale offer by
     reintroducing exactly that defect.
     ⚠️ This assertion was vacuous when first written — `bgSignUpForm` and `bgDone` were not in the
     stub, so 192's guard read two nulls and could not fire. They are real nodes now. */
  const g = makeGate(true);
  g.run('signin');
  g.signUp.hidden = false;                 // the person is part-way through signing up
  g.done.textContent = 'Check your email to confirm.';
  g.done.hidden = false;

  g.run('signin');                         // an `online` blip re-enters the same state
  assert.strictEqual(g.signUp.hidden, false, '192: a half-typed sign-up survives a re-sync');
  assert.strictEqual(g.done.textContent, 'Check your email to confirm.', 'and so does its message');
});

test('243: 192’s guard actually fires — the sign-in form is not repainted over a sign-up', () => {
  /* The other half of the same guard, and the one that proves it is reached at all: with the
     sign-up side up, the 'signin' branch must RETURN before it touches the sign-in form or the
     message. With the stub's two missing nodes this could never have failed. */
  const g = makeGate(true);
  g.run('signin');
  assert.strictEqual(g.form.hidden, false, 'the sign-in form is up to begin with');
  g.form.hidden = true;                    // the sign-up swap hid it
  g.signUp.hidden = false;
  g.msg.textContent = 'Create your account.';

  g.run('signin');
  assert.strictEqual(g.form.hidden, true, 'the guard returned before re-showing the sign-in form');
  assert.strictEqual(g.msg.textContent, 'Create your account.', 'and before overwriting the wording');
});
