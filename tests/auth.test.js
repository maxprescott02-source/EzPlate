/*
 * auth.test.js — 174. Supabase email/password sign-in on the Account screen.
 *
 * The one behaviour worth guarding hardest is the one that can DESTROY something:
 * `authApply` purges local state on a change of user, and local state includes the plate draft,
 * which is unsaved authored work. Purging when it should not is data loss; not purging when it
 * should is one account seeing another's preferences. Both directions are pinned.
 *
 * ⚠️ THE INITIAL EVENT IS THE DANGEROUS ONE. `onAuthStateChange` fires INITIAL_SESSION on EVERY
 * load, so treating it as a change of user would wipe the draft on every single boot — a bug that
 * would look exactly like "the app keeps forgetting my plate" and would never point at auth.
 *
 * Real functions, extracted. No stubs of anything shipped.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/** Build authApply + its real purge, with observable side effects. */
function harness(initialUser) {
  const S = { reloads: 0, purges: 0, rendered: 0, store: {}, kept: null };
  const code = `(function(S){
    "use strict";
    var ENV_STAMP_KEY=${JSON.stringify('cafeCost_env')};
    var DRAFTKEY=${JSON.stringify('cafeDB_plateDraft')};
    var localStorage={
      get length(){ return Object.keys(S.store).length; },
      key:function(i){ return Object.keys(S.store)[i]; },
      getItem:function(k){ return k in S.store ? S.store[k] : null; },
      setItem:function(k,v){ S.store[k]=String(v); },
      removeItem:function(k){ delete S.store[k]; }
    };
    var window={localStorage:localStorage};
    var location={reload:function(){ S.reloads++; }};
    function renderAccountTab(){ S.rendered++; }
    ${extractFn(SRC, 'purgeLocalState')}
    // wrap the REAL purge so the harness can COUNT it and see what it was told to keep.
    // (The previous harness read S.purges without anything ever incrementing it — an assertion
    // that could not fail, which the pre-push review caught.)
    var _realPurge=purgeLocalState;
    purgeLocalState=function(store, keep){ S.purges++; S.kept=keep; return _realPurge(store, keep); };
    ${extractVar(SRC, 'authUserInitiated')}
    ${extractFn(SRC, 'authSwitchUser')}
    ${extractFn(SRC, 'authApply')}
    var authUser=${JSON.stringify(initialUser || null)};
    return {
      apply:function(session, isInitial){ authApply(session, isInitial); },
      setInitiated:function(v){ authUserInitiated=v; },
      user:function(){ return authUser; }
    };
  })`;
  const api = eval(code)(S);   // eslint-disable-line no-eval
  return { S, api };
}

const ALICE = { id: 'u-alice', email: 'alice@example.com' };
const BOB = { id: 'u-bob', email: 'bob@example.com' };

function populated() {
  return {
    cafeCost_env: 'izrnptxhdylllodvglla',
    cafeDB_plateDraft: '{"name":"half-built plate","lines":[{"kid":"K0004","qty":30}]}',
    cafeDB_lastTab: 'analysis',
    cafeDB_dashRange: '6m',
    cafeCost_theme: 'dark',
  };
}

test('THE INITIAL EVENT NEVER PURGES — it fires on every single load', () => {
  const { S, api } = harness(null);
  S.store = populated();
  api.apply({ user: ALICE }, true);
  assert.strictEqual(S.purges, 0, 'no purge helper should have been reached');
  assert.ok(S.store.cafeDB_plateDraft, 'the plate draft must survive a normal boot');
  assert.strictEqual(S.reloads, 0, 'and a boot must not reload itself');
  assert.deepStrictEqual(api.user(), ALICE, 'but the session is still adopted');
});

test('a signed-in boot with the SAME user does not purge', () => {
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.apply({ user: ALICE }, true);
  assert.ok(S.store.cafeDB_plateDraft);
  assert.strictEqual(S.reloads, 0);
});

test('SIGNING IN, having been asked, purges everything and reloads', () => {
  const { S, api } = harness(null);
  S.store = populated();
  api.setInitiated(true);                                   // the button set this after the confirm
  api.apply({ user: ALICE }, false);
  assert.strictEqual(S.purges, 1, 'the purge must actually have run');
  assert.strictEqual(S.store.cafeDB_plateDraft, undefined, 'the draft goes, because they were told it would');
  assert.strictEqual(S.store.cafeDB_lastTab, undefined);
  assert.strictEqual(S.store.cafeCost_theme, undefined);
  assert.strictEqual(S.store.cafeCost_env, 'izrnptxhdylllodvglla', 'the environment stamp is kept');
  assert.strictEqual(S.reloads, 1, 'in-memory state was read from the store at boot, so it must reload');
});

test('AN INVOLUNTARY SIGN-OUT KEEPS THE PLATE DRAFT — nothing was consented to', () => {
  /* THE finding from the pre-push review, and the one that could have destroyed real work: a
     refresh token failing emits SIGNED_OUT with no user action at all. Everything else in local
     storage is a preference and can go; `cafeDB_plateDraft` is unsaved AUTHORED work, which
     CLAUDE.md names as the standing exception to "preferences and caches only". Discarding it
     because a token expired is data loss with nobody to blame it on. */
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.apply(null, false);                                   // no setInitiated: Supabase did this
  assert.strictEqual(S.purges, 1);
  assert.strictEqual(S.store.cafeDB_plateDraft, populated().cafeDB_plateDraft,
    'an unfinished plate must survive a session the user did not end');
  assert.ok(S.kept.includes('cafeDB_plateDraft'), 'the draft key must be passed as kept, not removed by luck');
  assert.strictEqual(S.store.cafeDB_lastTab, undefined, 'but the view preferences still go');
  assert.strictEqual(S.store.cafeCost_theme, undefined);
  assert.strictEqual(S.reloads, 1);
});

test('SIGNING OUT deliberately purges the draft too — it is symmetric with signing in', () => {
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.setInitiated(true);
  api.apply(null, false);
  assert.strictEqual(S.store.cafeDB_plateDraft, undefined);
  assert.strictEqual(S.reloads, 1);
  assert.strictEqual(api.user(), null);
});

test('the initiated flag is CONSUMED, so the next involuntary event is not treated as consented', () => {
  // A stuck flag would silently re-arm the destructive path for every later session expiry.
  const { S, api } = harness(null);
  S.store = populated();
  api.setInitiated(true);
  api.apply({ user: ALICE }, false);                        // consumes it
  S.store = populated();
  api.apply(null, false);                                   // involuntary
  assert.strictEqual(S.store.cafeDB_plateDraft, populated().cafeDB_plateDraft,
    'the flag must not survive the switch it authorised');
});

test('SWITCHING user purges', () => {
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.setInitiated(true);
  api.apply({ user: BOB }, false);
  assert.strictEqual(S.store.cafeDB_plateDraft, undefined);
  assert.strictEqual(S.reloads, 1);
  assert.deepStrictEqual(api.user(), BOB);
});

test('the sign-in and sign-out buttons ASK before discarding an unfinished plate', () => {
  /* The gate is on the button, not on the purge. CLAUDE.md: "Gating the last committing action is
     not a gate" — by the time authApply runs the session has already changed, and the only way to
     honour a "no" would be to undo it. Declining at the button means nothing happened at all. */
  const wire = SRC.slice(SRC.indexOf('function wireAccount'), SRC.indexOf('function renderSettingsTab'));
  assert.ok(/authGuardUnfinished\('Signing in'/.test(wire), 'sign-in must go through the guard');
  assert.ok(/authGuardUnfinished\('Signing out'/.test(wire), 'sign-out must go through the guard');
  const guard = extractFn(SRC, 'authGuardUnfinished');
  assert.ok(guard.includes('unfinishedPlateWaiting()'), 'it must use the app\'s own dirty check, not a new one');
  assert.ok(guard.includes('askConfirm('), 'and the app\'s own confirm');
  // the flag is only set INSIDE the guarded callback, never before the user has answered
  assert.ok(!/authUserInitiated=true;[\s\S]{0,80}authGuardUnfinished/.test(wire),
    'the initiated flag must not be set before the confirm is answered');
});

test('a token refresh for the SAME user changes nothing', () => {
  // Supabase re-emits the session on refresh. The user has not changed, so neither has their data,
  // and purging here would throw away a draft mid-edit roughly once an hour.
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.apply({ user: { id: 'u-alice', email: 'alice@example.com' } }, false);
  assert.ok(S.store.cafeDB_plateDraft, 'a refresh is not a change of user');
  assert.strictEqual(S.reloads, 0);
});

test('the Supabase session token is NOT purged — it is how the session survives a reload', () => {
  // The purge is prefix-scoped, so this holds by construction rather than by an exception list.
  // If it did not, signing in would immediately sign you back out on the reload it triggers.
  const { S, api } = harness(null);
  S.store = Object.assign(populated(), { 'sb-izrnptxhdylllodvglla-auth-token': '{"access_token":"x"}' });
  api.apply({ user: ALICE }, false);
  assert.strictEqual(S.store['sb-izrnptxhdylllodvglla-auth-token'], '{"access_token":"x"}',
    'purging the auth token would undo the sign-in that triggered the purge');
});

test('THE SERVER DECIDES WHETHER THERE IS A CAFÉ — the client never refuses on its own idea of who you are', () => {
  /* ⚠️ REWRITTEN AGAIN IN 186, deliberately, and the TITLE changed because the old one is now false.
     It read "BEING SIGNED OUT STILL RUNS THE WHOLE APP", on this reasoning:

       being signed OUT must keep working, because `current_business_id()` still answers the seeded
       café for `anon`. Closing that is the auth item's one-function change, and until it lands a
       client-side sign-in wall would lock Max out of his own café for no gain.

     `20260814_mandatory_sign_in.sql` IS that one-function change, and Max has an account and a
     membership (measured on production before it was applied), so the "for no gain" no longer holds
     either. Being signed out now reaches a sign-in screen and nothing else.

     THE HALF THAT SURVIVES IS THE ONE THAT ALWAYS MATTERED, and it is not weaker for the rewrite:
     the app may only refuse on the SERVER's answer to which tenant this is. A client-side
     `if(!authUser)` wall would be a second definition of that decision — the defect CLAUDE.md names
     — and it would fire on a race, because `authInit` is not awaited before bootstrapSync runs. The
     sign-in gate is raised by a null coming back from `rpc('current_business_id')`; the session is
     read only to choose which of two SCREENS explains it.

     ⚠️ COMMENTS ARE STRIPPED FIRST. 185's own explanation of why bootstrapSync reads the session
     from its Promise.all *rather than off `authUser`* contains the word `authUser`, and the naive
     scan below failed on that prose — a test going red at its own documentation. Third time this
     shape has bitten (172, then the CSS test forty lines down), so it is applied here too. */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const gated = /if\s*\(\s*!\s*authUser\s*\)/.test(code)
    || /authUser\s*\?[^:]*:\s*return/.test(code)
    || /bootGate\([^)]*authUser/.test(code);
  assert.ok(!gated, 'nothing may refuse to run because there is no signed-in user');
  const i = code.indexOf('async function bootstrapSync');
  const boot = code.slice(i, i + 5000);
  assert.ok(!boot.includes('authUser'),
    'the boot DECISION is the server’s answer to which tenant this is, never the client’s idea of who is signed in');
});

test('185: the tenant gate reads the SERVER, and refuses only on an unambiguous null', () => {
  /* The companion to the test above, and the reason it could be narrowed rather than deleted.
     The app may now stop at boot — but never on the client's own opinion of the session. It stops
     because `current_business_id()` answered null, which is a fact only the server holds.
     tenant-gate.test.js pins the decision itself; what is pinned HERE is that bootstrapSync asks. */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  assert.ok(/rpc\(\s*'current_business_id'\s*\)/.test(code),
    'the tenant must be asked of the server, not inferred');
  const i = code.indexOf('async function bootstrapSync');
  const boot = code.slice(i, i + 5000);
  assert.ok(/tenantGateState\(/.test(boot), 'and bootstrapSync must act on the answer');
  assert.ok(/bootReady\('nomember'/.test(boot),
    'a signed-in account with no café is TOLD; an empty app with no message is the defect');
});

test('209: sign-up is SELF-SERVICE — no invitation gate anywhere on the path', async () => {
  /* ⚠️ THIS ASSERTION HAS NOW BEEN REWRITTEN TWICE AND THE HISTORY IS THE POINT, because a reader
     who finds only the current version will read it as the rule having been weakened twice.
       * until 192 it was `!/signUp\s*\(/` — no sign-up call may ship AT ALL, "while an account
         cannot join a café". 191 built the join and spent that reason.
       * 192 replaced it with an invitation gate: `invite_pending` had to answer TRUE before
         `signUp` could run, because "a self-service sign-up form is still NO (Max, 14 Aug 2026)".
       * ⚠️ MAX REVERSED THAT ON THE SAME DAY, in writing, choosing shape B — a stranger creates an
         account and names their own café, unattended (`docs/decisions/2026-08-14-cafe-creation.md`
         q1). He was told it reversed his morning's call and chose it anyway, so it is a decision
         and may not be re-litigated. 209 is that reversal arriving in the code.
     What is left worth pinning is NOT "is sign-up allowed" — it is, and a test asserting so would
     be pinning the absence of code. It is the two properties that keep the open door survivable:
     there is exactly ONE door, and the thing behind it consults nothing that could be turned back
     into a gate by accident.
     ⚠️ The privacy acceptance is NOT in this file and that is deliberate — it is the one thing that
     still runs before `signUp`, and `tests/privacy-disclosure.test.js` runs the real decision.
     Splitting it there rather than restating it here keeps one definition of that rule. */

  /* 1. BEHAVIOURAL, and it is the half a grep cannot do. The REAL `authSignUp` runs against a fake
     client whose `rpc` THROWS if anything touches it — so an invitation lookup reintroduced inside
     this function fails loudly rather than passing a source check. An address nobody has ever
     invited reaches `auth.signUp` and comes back clean. */
  const S = { signUps: [], rpcs: 0 };
  // eslint-disable-next-line no-new-func
  const signUp = new Function('S', `
    "use strict";
    var SUPA = {
      auth: { signUp: function(a){ S.signUps.push(a); return Promise.resolve({ data: { user: { id: 'u1' } }, error: null }); } },
      rpc: function(){ S.rpcs++; throw new Error('fixture: nothing on the sign-up path may ask the server a question first'); }
    };
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authSignUp')}
    return authSignUp;
  `)(S);
  const r = await signUp('stranger@example.com', 'pw123456');
  assert.ok(!r.error && r.data, 'an uninvited address signs up: ' + JSON.stringify(r.error || {}));
  assert.deepEqual(S.signUps, [{ email: 'stranger@example.com', password: 'pw123456' }],
    'with the address and password it was given, unchanged');
  assert.equal(S.rpcs, 0, 'and nothing on this path asks the server anything first');

  /* 2. NO CLIENT AT ALL must RETURN an error, never throw. Inherited from the deleted
     `authInvitePending` test, where the mutation gate found it: flipping the guard's `||` to `&&`
     made a null SUPA raise a TypeError BEFORE the try block, which `authSubmit` does not catch — so
     the button stayed disabled forever on a misconfigured device, on the one screen a new user
     ever sees. The guard has to short-circuit, and this is what says so. */
  // eslint-disable-next-line no-new-func
  const noClient = new Function(`
    "use strict";
    var SUPA = null;
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authSignUp')}
    return authSignUp;
  `)();
  const rNone = await noClient('a@b.co', 'pw123456');
  assert.ok(rNone.error, 'no client is an error, not a crash');
  assert.match(rNone.error.message, /connection/i, 'and it says so in words');
  /* And a client that exists but has no `signUp` — an older supabase-js, and the shape the guard's
     third clause is for. Same requirement, different half of the same expression. */
  // eslint-disable-next-line no-new-func
  const noFn = new Function(`
    "use strict";
    var SUPA = { auth: {} };
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authSignUp')}
    return authSignUp;
  `)();
  assert.ok((await noFn('a@b.co', 'pw123456')).error, 'a client with no signUp is an error too');

  /* 3. ONE DOOR. A grep is the right tool for "there is no other way in" and the wrong tool for
     "this way in is locked" — which is why case 1 above is behavioural and this is not. */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  /* ⚠️ THE LOOKBEHIND IS LOAD-BEARING: without it the DECLARATION matches too and the count is
     always one higher than the number of references, so the assertion would be measuring "does this
     function exist" while reading as "is there exactly one door". Caught by it going red at 2.
     ⚠️ AND `\\s*\\(` CAME OFF IT IN 209, WHICH IS NOT A LOOSENING. 192 called `authSignUp(…)` from
     inside `authSignUpGated`, so a call-shaped pattern found every reference there was. 209 deleted
     that wrapper and the one remaining reference is `authSubmit(…, authSignUp)` — a function PASSED,
     never called by name — so the old pattern matched ZERO and the count read 0-instead-of-1 rather
     than going quietly vacuous. Matching the identifier counts a reference however it is used,
     which is what "exactly one door" always meant. */
  assert.equal((code.match(/(?<!function\s)\bauthSignUp\b/g) || []).length, 1,
    'authSignUp is reached from exactly one place — the gate\'s sign-up handler');
  assert.equal((code.match(/auth\.signUp\s*\(/g) || []).length, 1,
    'and the raw supabase signUp is called only from authSignUp');
  /* The one call site is the HANDLER, passing the real function to `authSubmit` rather than a
     wrapper — stated positively, because roster entry 190 is that "not the wrong value" is a guess
     about every wrong value there could be while "is the right value" is a fact about this app.
     A gate reintroduced as `authSubmit(…, authSignUpGated)` turns this red by name. */
  assert.match(code, /authSubmit\(email, pass, btn, gateErr, authSignUp\)/,
    'the sign-up handler hands authSubmit the real authSignUp, not a gated wrapper');

  assert.ok(!/id="acctSignUp"/.test(HTML),
    'and there is still no sign-up on the Account screen — it sits behind a screen 186 made unreachable');
  assert.ok(/signInWithPassword/.test(SRC), 'sign-in itself must be real');
  assert.ok(/auth\.signOut/.test(SRC), 'and so must sign-out');
});

/* ⚠️ A TEST WAS DELETED HERE, NOT MOVED, AND THIS NOTE IS WHY.
   `192: only a real TRUE is an invitation — the narrowing at the wire boundary` ran the real
   `authInvitePending` against a dozen truthy shapes, and 209 deleted that function: with sign-up
   self-service there is nothing left for it to gate, so it and its RPC wrapper both went.
   ⚠️ THE SERVER FUNCTION `invite_pending(text)` IS STILL DEPLOYED and is still callable by `anon`.
   It is deliberately not dropped in the same batch — an old client still cached on a phone calls it
   and REFUSES sign-up on an unreadable answer, so a drop has to FOLLOW the client that stopped
   calling it, never lead it (186's ordering law). `tests/invites.test.js` still pins its SQL, and
   the queue's "Gate review before public signup" item owns the decision to drop it.
   The one assertion in it that was about something else — that a missing client RETURNS an error
   rather than throwing, which the mutation gate found — is kept, in case 2 of the test above. */

/* ── 186: authSubmit, the ONE sign-in sequence both forms wear ────────────────────────────────
   These used to be substring greps of wireAccount's body. They are behavioural now, for two
   reasons: the sequence moved out of that function (a grep would have gone quietly vacuous rather
   than red — CLAUDE.md's whole roster), and there are two callers, so "it says the right words in
   one of them" stopped being the question. The REAL authSubmit and the REAL errText run below;
   only `authSignIn` — the network boundary — is a fixture, and it is a fixture rather than a
   re-implementation: it returns the two shapes the real one is defined to resolve with. */
function submitHarness(result) {
  const S = { calls: 0, args: null, errs: [], btnStates: [] };
  const btn = { set disabled(v) { S.btnStates.push(v); this._d = v; }, get disabled() { return this._d; }, _d: false };
  // eslint-disable-next-line no-new-func
  const authSubmit = new Function('S', 'R', `
    "use strict";
    var authSignIn = async function(email, pass){ S.calls++; S.args=[email,pass]; return R; };
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authSubmit')}
    return authSubmit;
  `)(S, result);
  const showErr = (m) => S.errs.push(m);
  return { S, btn, showErr, run: (e, p) => authSubmit(e, p, btn, showErr) };
}

test('the sign-in error surfaces the REAL server message', async () => {
  // A friendly generic message on a login is how someone spends ten minutes on a typo'd email.
  const h = submitHarness({ error: { message: 'Invalid login credentials' } });
  const ok = await h.run('a@b.com', 'hunter2');
  assert.strictEqual(ok, false, 'a failed sign-in must report failure to its caller');
  assert.ok(h.S.errs.includes('Invalid login credentials'),
    'the server’s own words must reach the user, got: ' + JSON.stringify(h.S.errs));
});

test('an unconfirmed account says so, rather than looking like a wrong password', async () => {
  /* Measured while rehearsing the real account: Supabase answers "Email not confirmed", and a
     generic swallow here is what would send someone to reset a password that was never wrong. */
  const h = submitHarness({ error: { message: 'Email not confirmed' } });
  await h.run('a@b.com', 'hunter2');
  assert.ok(h.S.errs.includes('Email not confirmed'), JSON.stringify(h.S.errs));
});

test('a blank field never reaches the network', async () => {
  for (const [e, p] of [['', 'pw'], ['a@b.com', ''], ['', '']]) {
    const h = submitHarness({ data: {} });
    const ok = await h.run(e, p);
    assert.strictEqual(ok, false);
    assert.strictEqual(h.S.calls, 0, `"${e}"/"${p}" must not be sent anywhere`);
    assert.ok(/Enter your email and password/.test(h.S.errs.join(' ')), h.S.errs.join(' '));
  }
});

test('the button is re-enabled on BOTH settle paths, not just the happy one', async () => {
  /* CLAUDE.md 184(a): a promise has two settle paths, and the uncommon one here is the one that
     fires when the café has no signal. A button left disabled is a screen the user cannot leave —
     and on the boot gate there is nothing else on the screen at all. */
  const good = submitHarness({ data: { user: { id: 'u1' } } });
  assert.strictEqual(await good.run('a@b.com', 'pw'), true);
  assert.deepStrictEqual(good.S.btnStates, [true, false], 'disabled while in flight, then released');

  const bad = submitHarness({ error: { message: 'network' } });
  assert.strictEqual(await bad.run('a@b.com', 'pw'), false);
  assert.deepStrictEqual(bad.S.btnStates, [true, false], 'released on the failure path too');
});

test('a stale error is cleared before a new attempt, not left contradicting it', async () => {
  const h = submitHarness({ data: {} });
  await h.run('a@b.com', 'pw');
  assert.strictEqual(h.S.errs[0], '', 'the first thing it does is clear the previous message');
});

test('BOTH sign-in forms ask before an unfinished plate can be discarded, and both record that they asked', () => {
  /* ⚠️ THIS TEST ASSERTED THE OPPOSITE ONE COMMIT AGO, and the reversal is the point of writing it
     out. It pinned that the boot gate's form must NOT set `authUserInitiated`, so `authSwitchUser`
     would KEEP the plate draft — on the reasoning that the gate has put no question to the user and
     may therefore not destroy their work.
     THE PRE-PUSH REVIEW FOUND THE CASE THAT REASONING IGNORES. The gate's form is the only sign-in a
     signed-out browser can reach, so it is also how a DIFFERENT account signs in on this device, and
     `cafeDB_plateDraft` is a single global key with no tenant in it. Keeping it carries one café's
     unsaved plate into another café's session, where it is offered BY NAME and its `{kid,qty}` lines
     point at ids that mean something else.
     Both readings agree on the underlying rule — nothing is destroyed without the user being told —
     and they disagree about which side of it this screen sits on. Asking satisfies it directly.
     STRUCTURAL, and it says so: the flag is read two functions away inside a reload path, so there
     is no behavioural seam short of driving a whole boot. Comments are stripped first; this file has
     been bitten by its own prose three times. */
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const gateForm = strip(SRC.slice(SRC.indexOf('function wireGateSignIn'), SRC.indexOf('function wireAccount')));
  const acctForm = strip(SRC.slice(SRC.indexOf('function wireAccount'), SRC.indexOf('function renderSettingsTab')));

  for (const [label, form] of [['the boot gate', gateForm], ['the Account card', acctForm]]) {
    assert.match(form, /authGuardUnfinished\(/,
      `${label}'s sign-in must put the unfinished-plate question BEFORE the session changes — CLAUDE.md: gating the last committing action is not a gate`);
    assert.match(form, /authUserInitiated\s*=\s*true/,
      `${label} must record that the question WAS asked, or the purge keeps a draft the user agreed to lose`);
    assert.match(form, /authUserInitiated\s*=\s*false/,
      `${label} must take it back when the sign-in fails, or the next involuntary event purges a draft for nothing`);
  }
});

test('a signed-out or non-member boot is NEVER offered somebody else\'s plate draft', () => {
  /* The other half of the same finding, and the sharper half, because it needs no account switch at
     all. `offerPlateDraftResume`'s own comment states that the confirm modal outranks the boot gate
     in z-index, so Resume is tappable while the gate is up — harmless while the only gate was a
     failed boot on the owner's device, and not harmless now that the gate is the front door.
     Without the guard, a stranger who opens the URL on a device that once held a session is shown a
     dialog naming a plate, and can load its lines. */
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const fn = strip(SRC.slice(SRC.indexOf('function offerPlateDraftResume'), SRC.indexOf('function saveCurrentPlate')));
  const guard = fn.indexOf('_bootNoMember');
  const ask = fn.indexOf('askConfirm');
  assert.ok(guard > -1, 'the resume offer must consult the gate at all');
  assert.ok(ask > -1, 'and must still ask on a normal boot');
  assert.ok(guard < ask,
    'the guard must come BEFORE the dialog — after it, the plate name has already been shown');
  assert.match(fn.slice(Math.max(0, guard - 6), ask), /if\s*\(\s*_bootNoMember\s*\)\s*return/,
    'and it must RETURN, not merely branch: falling through is the whole defect');
});

test('the password field is cleared after a successful attempt — in BOTH forms', () => {
  /* THREE callers as of 192 — the gate's sign-in, the gate's sign-up and the Account form — and the
     clear lives in each handler rather than in authSubmit, because the field element is the
     caller's and not the sequence's. So this counts, rather than matching once and calling it
     proved.
     ⚠️ THE COUNT IS THE ASSERTION, and it is the shape CLAUDE.md warns about (188: a counter coupled
     to every future caller). It is kept deliberately, and made safe by being a count of the
     handlers themselves rather than of a shared fixture: adding a fourth form that handles a
     password and forgetting to clear it must go RED here, which is the only thing that would catch
     it. If you add one, the number changes in the same commit as the handler. */
  const wire = SRC.slice(SRC.indexOf('function wireGateSignIn'), SRC.indexOf('function renderSettingsTab'))
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const hits = wire.match(/pw\.value=''/g) || [];
  assert.strictEqual(hits.length, 3,
    'a password must not sit in the DOM after use, on any of the three forms — found ' + hits.length);
});

test('the account markup toggles with [hidden] and carries no display rule that would beat it', () => {
  /* CLAUDE.md's `[hidden]` trap: an author `display` rule beats the UA's `[hidden]{display:none}`
     on ORIGIN, before specificity is compared, so an element told to hide stays visible. The fix
     is either no rule at all (what this does) or a `:not([hidden])` guard. */
  // ⚠️ Comments are STRIPPED first. The CSS comment explaining why these ids carry no display rule
  // names them and then uses the word "display", which the naive regex read as the rule it was
  // looking for — a test failing on its own documentation. Second time this shape has bitten in two
  // batches (172 had a comment containing a literal body tag), so: a source-scanning assertion
  // strips comments before it matches, always.
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  for (const id of ['acctOut', 'acctIn2', 'acctErr']) {
    const rule = new RegExp(`#${id}[^{]*\\{[^}]*display\\s*:`, 'i');
    assert.ok(!rule.test(css), `#${id} has a display rule, which would defeat its hidden attribute`);
  }
  assert.ok(/id="acctIn2" hidden/.test(HTML), 'the signed-in block starts hidden');
  assert.ok(/id="acctErr" hidden/.test(HTML), 'the error starts hidden');
});
