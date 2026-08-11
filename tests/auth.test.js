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
  const S = { reloads: 0, purges: 0, rendered: 0, store: {} };
  const code = `(function(S){
    "use strict";
    var ENV_STAMP_KEY=${JSON.stringify('cafeCost_env')};
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
    ${extractFn(SRC, 'authSwitchUser')}
    ${extractFn(SRC, 'authApply')}
    var authUser=${JSON.stringify(initialUser || null)};
    return {
      apply:function(session, isInitial){ authApply(session, isInitial); },
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

test('SIGNING IN purges and reloads', () => {
  const { S, api } = harness(null);
  S.store = populated();
  api.apply({ user: ALICE }, false);
  assert.strictEqual(S.store.cafeDB_plateDraft, undefined, 'the previous user\'s draft must not survive');
  assert.strictEqual(S.store.cafeDB_lastTab, undefined);
  assert.strictEqual(S.store.cafeCost_theme, undefined);
  assert.strictEqual(S.store.cafeCost_env, 'izrnptxhdylllodvglla', 'the environment stamp is kept');
  assert.strictEqual(S.reloads, 1, 'in-memory state was read from the store at boot, so it must reload');
});

test('SIGNING OUT purges and reloads too — it is symmetric', () => {
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.apply(null, false);
  assert.strictEqual(S.store.cafeDB_plateDraft, undefined);
  assert.strictEqual(S.reloads, 1);
  assert.strictEqual(api.user(), null);
});

test('SWITCHING user purges', () => {
  const { S, api } = harness(ALICE);
  S.store = populated();
  api.apply({ user: BOB }, false);
  assert.strictEqual(S.store.cafeDB_plateDraft, undefined);
  assert.strictEqual(S.reloads, 1);
  assert.deepStrictEqual(api.user(), BOB);
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

test('AUTH GATES NOTHING — no boot path or render path consults authUser', () => {
  /* The design decision, pinned because it is the one a later batch is most likely to "fix"
     accidentally. Every RLS policy is still `using (true)`, so a signed-in session sees exactly
     what a signed-out one sees; gating the app before isolation exists would lock Max out of his
     own data for no benefit. Enforcement belongs with the business_id + RLS item.
     If that item makes auth mandatory, this test SHOULD be rewritten, deliberately, not deleted. */
  const gated = /if\s*\(\s*!\s*authUser\s*\)/.test(SRC)
    || /authUser\s*\?[^:]*:\s*return/.test(SRC)
    || /bootGate\([^)]*authUser/.test(SRC);
  assert.ok(!gated, 'nothing may refuse to run because there is no signed-in user');
  const boot = SRC.slice(SRC.indexOf('async function bootstrapSync'), SRC.indexOf('async function bootstrapSync') + 4000);
  assert.ok(!boot.includes('authUser'), 'bootstrapSync must not consult the session');
});

test('there is NO sign-up path — the anon key already grants what an account would', () => {
  assert.ok(!/signUp\s*\(/.test(SRC), 'no signUp call may ship while RLS is still using(true)');
  assert.ok(!/id="acctSignUp"/.test(HTML), 'and no sign-up control');
  assert.ok(/signInWithPassword/.test(SRC), 'sign-in itself must be real');
  assert.ok(/auth\.signOut/.test(SRC), 'and so must sign-out');
});

test('the sign-in error surfaces the REAL server message', () => {
  // A friendly generic message on a login is how someone spends ten minutes on a typo'd email.
  const wire = SRC.slice(SRC.indexOf('function wireAccount'), SRC.indexOf('function renderSettingsTab'));
  assert.ok(wire.includes('authErr(errText(r.error))'), 'the real error must reach the user');
  assert.ok(!/authErr\('Something went wrong/.test(wire), 'no generic swallow');
});

test('the password field is cleared after a successful attempt', () => {
  const wire = SRC.slice(SRC.indexOf('function wireAccount'), SRC.indexOf('function renderSettingsTab'));
  assert.ok(/pw\.value=''/.test(wire), 'a password must not sit in the DOM after use');
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
