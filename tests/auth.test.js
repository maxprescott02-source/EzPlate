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

test('a sign-up exists, and it CANNOT be reached without a pending invitation', async () => {
  /* ⚠️ THIS ASSERTION USED TO BE `!/signUp\s*\(/` — no sign-up call may ship at all — with the
     stated reason "while an account cannot join a café". 191 built the join, so that reason is
     spent, and the queue item was explicit that the line be REWRITTEN TO PIN THE CONDITION rather
     than deleted. The condition is what was ever worth having and it survives 191 intact:
     SELF-SERVICE sign-up is still NO (Max, 14 Aug 2026). Shape B is a refinement of that call, not
     a reversal — under B the sign-up cannot be reached unless an owner created an invite for that
     exact address first.
     So this is BEHAVIOURAL, not a grep. A grep for "invite_pending appears above signUp" would pass
     against a version that called the gate and ignored its answer, which is the whole
     assertion-that-cannot-fail roster in CLAUDE.md. The REAL `authSignUpGated` runs below; only the
     two network boundaries it calls are fixtures, and each returns the shape the real one is
     defined to resolve with.
     ⚠️ Supabase sign-ups remain open at the API LEVEL regardless — that is the gate-review item's,
     and this assertion does not and cannot cover it. What makes that survivable is 186 and 182, not
     this function: an uninvited account joins no café and sees 185's screen. */
  function gateHarness(pendingResult) {
    const S = { pendingCalls: [], signUpCalls: [] };
    // eslint-disable-next-line no-new-func
    const fn = new Function('S', 'P', `
      "use strict";
      var authInvitePending = async function(e){ S.pendingCalls.push(e); return P; };
      var authSignUp = async function(e,p){ S.signUpCalls.push([e,p]); return {data:{user:{id:'u1'}}}; };
      ${extractFn(SRC, 'authSignUpGated')}
      return authSignUpGated;
    `)(S, pendingResult);
    return { S, run: (e, p) => fn(e, p) };
  }

  /* 1. NO INVITATION. The refusal is the point, and `signUp` must never have been reached — an
     account created here is an unrecoverable row in auth.users and a burnt confirmation send. */
  const no = gateHarness({ data: false });
  const rNo = await no.run('stranger@example.com', 'pw123456');
  assert.deepEqual(no.S.signUpCalls, [], 'an uninvited address must not reach signUp');
  assert.ok(rNo.error, 'and is refused');
  assert.match(rNo.error.message, /invitation/i, 'in words that say what is missing');

  /* 2. THE GATE ITSELF FAILING refuses too, which is the OPPOSITE of this client's usual fail-open
     and is deliberate. CLAUDE.md: a fail-open default is a decision about CONSEQUENCE. Guessing
     "probably invited" creates the account; guessing the other way costs "try again in a moment". */
  const err = gateHarness({ error: { message: 'network' } });
  const rErr = await err.run('someone@example.com', 'pw123456');
  assert.deepEqual(err.S.signUpCalls, [], 'an unreadable gate must not create an account');
  assert.ok(rErr.error, 'and says so');

  /* 3. AND AN INVITED ADDRESS GETS THROUGH — or the gate is just a wall and nobody can ever join. */
  const yes = gateHarness({ data: true });
  const rYes = await yes.run('invited@example.com', 'pw123456');
  assert.deepEqual(yes.S.pendingCalls, ['invited@example.com'], 'the gate is asked about the address being signed up');
  assert.deepEqual(yes.S.signUpCalls, [['invited@example.com', 'pw123456']], 'and only then is the account created');
  assert.ok(!rYes.error && rYes.data, 'which succeeds');

  /* The ORDER, which the four cases above already prove, stated once more where a reader of the
     shipped code will look: the gate cannot be moved below `signUp` without cases 1-3 going red,
     because by then the account exists whatever the gate answers. */
  assert.ok(!/id="acctSignUp"/.test(HTML),
    'and there is still no sign-up on the Account screen — it sits behind a screen 186 made unreachable');
  assert.ok(/signInWithPassword/.test(SRC), 'sign-in itself must be real');
  assert.ok(/auth\.signOut/.test(SRC), 'and so must sign-out');
  /* The ONE call site. A second `authSignUp(` anywhere would be a path around the gate, which is
     exactly the shape this test exists to forbid — and a grep is the right tool for "there is no
     other door", where it is the wrong tool for "this door is locked". */
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  /* ⚠️ THE LOOKBEHIND IS LOAD-BEARING: without it the DECLARATION matches too and the count is
     always one higher than the number of call sites, so the assertion would be measuring "does this
     function exist" while reading as "is there exactly one door". Caught by it going red at 2. */
  assert.equal((code.match(/(?<!function\s)\bauthSignUp\s*\(/g) || []).length, 1,
    'authSignUp is called from authSignUpGated and nowhere else');
  assert.equal((code.match(/auth\.signUp\s*\(/g) || []).length, 1,
    'and the raw supabase signUp is called only from authSignUp');
});

test('192: only a real TRUE is an invitation — the narrowing at the wire boundary', async () => {
  /* ⚠️ THIS IS SPLIT OUT OF THE TEST ABOVE ON PURPOSE, and the reason is worth writing down because
     the first cut got it wrong. That test stubs `authInvitePending`, so it exercises the ORDER and
     cannot see the narrowing at all — a case asserting "the string 'true' is not a yes" passed a
     value straight past the code that decides it and failed for the right reason on the wrong
     function. CLAUDE.md's whole roster is tests that measure something other than what they name.
     So the narrowing is tested where it lives: at the boundary that reads the wire.
     What it buys: `invite_pending` returns a boolean today, but PostgREST shape changes and an
     older deployed function returning a row object would both arrive TRUTHY, and truthy would
     open a sign-up for an address nobody invited. `=== true` is the only reading that cannot. */
  function pendingHarness(rpcResult) {
    const S = { calls: [] };
    // eslint-disable-next-line no-new-func
    const fn = new Function('S', 'R', `
      "use strict";
      var SUPA = { rpc: function(name, args){ S.calls.push([name, args]); return Promise.resolve(R); } };
      ${extractFn(SRC, 'errText')}
      ${extractFn(SRC, 'authInvitePending')}
      return authInvitePending;
    `)(S, rpcResult);
    return { S, run: (e) => fn(e) };
  }

  const yes = pendingHarness({ data: true, error: null });
  assert.deepEqual((await yes.run('a@b.co')).data, true, 'a real yes is a yes');
  assert.deepEqual(yes.S.calls, [['invite_pending', { p_email: 'a@b.co' }]],
    'and the server is asked by name, with the address as its one argument');

  for (const odd of ['true', 1, {}, [], 'yes']) {
    const h = pendingHarness({ data: odd, error: null });
    assert.strictEqual((await h.run('a@b.co')).data, false,
      `${JSON.stringify(odd)} is not an invitation`);
  }
  const no = pendingHarness({ data: false, error: null });
  assert.strictEqual((await no.run('a@b.co')).data, false, 'and false is plainly not one');

  /* An error is an ERROR, never a false — the two mean different things to authSignUpGated, which
     refuses on both but only says "no invitation" for one. Telling somebody they were not invited
     when the truth is that the lookup timed out sends them back to the café owner for nothing. */
  const err = pendingHarness({ data: null, error: { message: 'timeout' } });
  const rErr = await err.run('a@b.co');
  assert.ok(rErr.error && !('data' in rErr), 'an unreadable answer is an error, not a no');

  /* ⚠️ NO CLIENT AT ALL must RETURN an error, never throw — and this assertion exists because the
     mutation gate found it. Flipping the guard's `||` to `&&` made a null SUPA evaluate
     `!SUPA.rpc` and raise a TypeError BEFORE the try block, which `authSubmit` does not catch: the
     button would stay disabled forever on a device with no configuration, on the one screen a new
     staff member ever sees. The guard has to short-circuit, and this is what says so. */
  // eslint-disable-next-line no-new-func
  const noClient = new Function(`
    "use strict";
    var SUPA = null;
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authInvitePending')}
    return authInvitePending;
  `)();
  const rNone = await noClient('a@b.co');
  assert.ok(rNone.error, 'no client is an error');
  assert.match(rNone.error.message, /connection/i, 'and it says so in words');
  /* And a client that exists but predates the RPC — the Playwright shim's shape, and an older
     deployment's. Same requirement, different half of the same guard. */
  // eslint-disable-next-line no-new-func
  const noRpc = new Function(`
    "use strict";
    var SUPA = {};
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authInvitePending')}
    return authInvitePending;
  `)();
  assert.ok((await noRpc('a@b.co')).error, 'a client with no rpc is an error too, not a crash');
});

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
