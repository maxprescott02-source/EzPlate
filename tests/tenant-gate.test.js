/*
 * tenant-gate.test.js — 185. The signed-in account that belongs to no café.
 *
 * THE DEFECT THIS PREVENTS, measured on staging over PostgREST rather than reasoned about:
 * as `c@example.com` — a real account, a member of nothing — `GET /ingredients` answers `[]` with
 * HTTP 200 and `rpc/current_business_id` answers `null` with HTTP 200. Every RLS policy compares
 * `business_id` against NULL, which is false for every row, and PostgREST reports "no rows you may
 * see" and "no rows exist" identically. So the app boots clean, throws nothing, and paints every
 * screen at zero — which to the person holding the phone looks exactly like their café having been
 * deleted.
 *
 * THE DIRECTION OF THE RISK IS THE WHOLE DESIGN. This is a MESSAGE, not a gate on data: RLS is
 * already enforcing the boundary server-side, so failing to show the message costs the empty screen
 * we had before, while showing it wrongly locks a legitimate user out of a working app. Hence:
 * ONLY an unambiguous null with no error. Every "could not tell" reads as 'ok'. The tests below
 * pin both halves, because a mutant that drops either the error check or the strict null check is
 * exactly how this becomes a false alarm.
 *
 * ⚠️ Fixtures deliberately DISAGREE. `data` and `error` are never both meaningful in the same
 * fixture in a way that lets one be read off the other — CLAUDE.md's 184(b): a fixture whose fields
 * agree cannot tell you which one the code read.
 *
 * Real functions, extracted. No stubs.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

// eslint-disable-next-line no-new-func
const api = new Function(`
  "use strict";
  ${extractFn(SRC, 'tenantGateState')}
  ${extractFn(SRC, 'nonMemberMessage')}
  ${extractFn(SRC, 'sessionUser')}
  ${extractVar(SRC, 'SIGNIN_MSG')}
  return { tenantGateState: tenantGateState, nonMemberMessage: nonMemberMessage,
           sessionUser: sessionUser, SIGNIN_MSG: SIGNIN_MSG };
`)();

const { tenantGateState, nonMemberMessage, sessionUser, SIGNIN_MSG } = api;

/* ── The one case that gates ─────────────────────────────────────────────────────────────────── */

test('a null business with no error IS the signed-in non-member', () => {
  // The exact shape supabase-js resolves with for the measured response body `null`.
  assert.strictEqual(tenantGateState({ data: null, error: null }), 'nomember');
});

/* ── Everything else must NOT gate. Each of these is a way a real caller reaches this code. ──── */

test('anon resolves to the seeded café and is never gated', () => {
  // Measured: as `anon` the rpc returns this uuid, which is the whole reason no session read is
  // needed to interpret the answer — only a signed-in non-member can produce null.
  assert.strictEqual(
    tenantGateState({ data: '00000000-0000-0000-0000-000000000001', error: null }), 'ok');
});

test('a member resolves to their own café and is never gated', () => {
  assert.strictEqual(tenantGateState({ data: '000000b2-0000-0000-0000-0000000000b2', error: null }), 'ok');
});

/* ── "Could not tell" is its OWN answer, and that is the correction the review forced. ────────
   It used to return 'ok', collapsing "you have a cafe" into "I could not reach the question". Fine
   on a first boot, where falling open beats a false lockout. NOT fine as a recheck: for a caller
   already known to have no cafe, falling open shows an app with nothing in it — the very defect.
   So these assert 'unknown', and the CALLER resolves it against `_bootNoMember`. */

test('an ERROR is not an answer — it is explicitly unknown, never a clean bill of health', () => {
  // ⚠️ `data` is null here TOO. If the error check were dropped, the null check alone would say
  // 'nomember' and this would be a false alarm on every network blip. The two fields disagree about
  // the verdict on purpose, so neither can be read off the other.
  assert.strictEqual(
    tenantGateState({ data: null, error: { message: 'network' } }), 'unknown',
    'a lookup that failed says nothing about membership, in either direction');
});

test('a missing function on an older project is unknown, not a lockout', () => {
  assert.strictEqual(
    tenantGateState({ data: null, error: { code: '42883', message: 'function does not exist' } }), 'unknown');
});

test('undefined is not null — an absent body means could-not-tell, not no-membership', () => {
  assert.strictEqual(tenantGateState({ data: undefined, error: null }), 'unknown');
  assert.strictEqual(tenantGateState({}), 'unknown');
});

test('no result at all is unknown, never a lockout and never an all-clear', () => {
  assert.strictEqual(tenantGateState(null), 'unknown');
  assert.strictEqual(tenantGateState(undefined), 'unknown');
});

test('only a real uuid says ok — the three answers are genuinely distinct', () => {
  /* The shape of the bug that was here: two of these three collapsed into one. Asserting they are
     pairwise different is what stops that happening again by a "simplification". */
  const ok = tenantGateState({ data: '00000000-0000-0000-0000-000000000001', error: null });
  const no = tenantGateState({ data: null, error: null });
  const unk = tenantGateState({ data: null, error: { message: 'boom' } });
  assert.strictEqual(new Set([ok, no, unk]).size, 3,
    `all three must differ, got ${ok}/${no}/${unk} — collapsing any pair reopens a real defect`);
});

/* ── The wording. It is the entire deliverable of this state, so it is pinned. ───────────────── */

test('the message names the account, because which account you are in IS the diagnosis', () => {
  const m = nonMemberMessage('c@example.com');
  assert.ok(m.includes('c@example.com'), 'the email must appear verbatim: ' + m);
});

test('the message still works with no email, and does not print an empty one', () => {
  const m = nonMemberMessage('');
  assert.ok(!/signed in as\s*,/.test(m), 'must not render "signed in as ," — got: ' + m);
  assert.ok(/this account/.test(m), 'falls back to naming no account at all: ' + m);
});

test('the message says nothing has been lost, and points at an action the screen offers', () => {
  /* ⚠️ THE SECOND HALF OF THIS USED TO BE `/sign out/i`, and 209 changed what it should say rather
     than merely how it says it. While a café could only be created BY HAND in the Supabase
     dashboard, the honest advice to a memberless account was "ask the owner, or sign out" — and the
     assertion was really pinning "this is not a dead end". It is not a dead end for a better reason
     now: the screen carries a form that makes a café, so the message points at that.
     The dead-end property is still what is being pinned; it has simply moved from the wording to
     the markup, so BOTH halves are asserted — the sentence names the action, and the two controls
     that perform it are still on the screen. Pinning only the sentence would let a batch delete the
     form and leave copy pointing at nothing, which is the shape 208's review found in the privacy
     notice's own promise. */
  const m = nonMemberMessage('a@b.com');
  assert.ok(/No data has been lost/i.test(m),
    'the failure it is replacing is indistinguishable from data loss — saying so is the point');
  assert.ok(/name your caf/i.test(m), 'it names the action this screen offers: ' + m);

  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /id="bgCafeForm"/, 'and the form it points at is really there');
  assert.match(html, /id="bootGateOut"/, 'with sign out still available as the other way out');
});

test('the message never invents a fifth object noun', () => {
  // CLAUDE.md Tier 2: Product / Ingredient / Plate / Menu, and "dish"/"recipe" are forbidden.
  const m = nonMemberMessage('a@b.com');
  assert.ok(!/\bdish(es)?\b|\brecipe(s)?\b|\bkitchen (word|name)/i.test(m), m);
});

test('the caller resolves unknown against what it already knows', () => {
  /* THE REVIEW'S FINDING, pinned at the level it actually lives. bootstrapSync gates when the answer
     is 'nomember', OR when it is 'unknown' AND the latch is already set. It clears the latch only on
     a definite 'ok'. Scenario that was broken: gate showing, `online` fires, the tenant RPC alone
     times out while the four required reads return `[]` (RLS filters rows, it does not error), so
     nothing throws — and the app rendered empty with no message. */
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const i = src.indexOf('async function bootstrapSync');
  const boot = src.slice(i, i + 6000);
  assert.match(boot, /_tg==='nomember'\s*\|\|\s*\(_tg==='unknown'\s*&&\s*_bootNoMember\)/,
    'an unknown answer must not discard a known non-member state');
  assert.match(boot, /_tg==='ok'\)\s*_bootNoMember=false/,
    'and only a DEFINITE answer may clear the latch');
});

/* ── 186: the SAME null tenant, two screens ───────────────────────────────────────────────────
   Dropping the `auth.uid() is null` branch from current_business_id() makes a SIGNED-OUT caller
   answer null too — measured on staging over PostgREST, the same 200-with-null a signed-in
   non-member gets. Everything above still decides WHETHER to gate; these decide WHICH screen, and
   the whole distinction is the session. */

test('a real session yields its user, which is what makes the screen a message and not a form', () => {
  const u = { id: 'u-1', email: 'max@example.com' };
  assert.deepStrictEqual(sessionUser({ data: { session: { user: u } }, error: null }), u);
});

test('a definite NO session is null — that visitor gets the sign-in form', () => {
  // The exact shape supabase-js resolves getSession with when nobody is signed in.
  assert.strictEqual(sessionUser({ data: { session: null }, error: null }), null);
});

test('a session that could not be READ is null too, and that is the decision', () => {
  /* ⚠️ The fixture DISAGREES with itself on purpose (CLAUDE.md 184(b)): there IS a user in `data`,
     and the error is what must win. Reading the user off a failed call would make the screen depend
     on a value the client had no right to trust — and this is the one place the two fields can be
     told apart, so a fixture where they agreed would prove nothing.
     WHY null rather than a third state: the form is the action that helps under BOTH readings — a
     non-member can sign in as someone else — while Sign out helps under only one. Unlike the tenant
     answer above, neither branch here is unsafe; it is a choice of copy. */
  assert.strictEqual(
    sessionUser({ data: { session: { user: { id: 'u-1' } } }, error: { message: 'network' } }), null);
  assert.strictEqual(sessionUser({ error: { message: 'boom' } }), null);
  assert.strictEqual(sessionUser({}), null, 'an absent body is not a signed-in user');
  assert.strictEqual(sessionUser(null), null, 'and neither is nothing at all');
  assert.strictEqual(sessionUser(undefined), null);
});

test('the shim case — no auth API at all — reaches the sign-in screen, not a crash', () => {
  /* softCall answers `{error}` when `SUPA.auth` is missing entirely, which is a real client: the
     Playwright fake, and any boot where the auth module failed to construct. */
  assert.strictEqual(sessionUser({ error: new TypeError('SUPA.auth is undefined') }), null);
});

test('the sign-in message says what signing in BUYS, and never that something failed', () => {
  assert.match(SIGNIN_MSG, /sign in/i, 'it has to name the action: ' + SIGNIN_MSG);
  assert.ok(!/error|failed|denied|not allowed|couldn|can’t|cannot/i.test(SIGNIN_MSG),
    'nothing has gone wrong — a device that has not been signed in yet is the ordinary state: ' + SIGNIN_MSG);
  // CLAUDE.md Tier 2: the four object nouns, and "dish"/"recipe" are forbidden.
  assert.ok(!/\bdish(es)?\b|\brecipe(s)?\b|\bkitchen (word|name)/i.test(SIGNIN_MSG), SIGNIN_MSG);
});

test('the two screens are different screens — the copy may never be shared', () => {
  /* If these ever collapse, one of two real failures is back: a stranger told to "ask the café
     owner to add this account" when they have not signed in at all, or a signed-in non-member
     handed a form that will not change their answer without saying why. */
  assert.notStrictEqual(SIGNIN_MSG, nonMemberMessage(''));
  assert.ok(!/No data has been lost/i.test(SIGNIN_MSG),
    'nobody signed out has lost anything — saying so invents an alarm');
});

/* ── The early return. ────────────────────────────────────────────────────────────────────────
   ⚠️ THIS ONE IS STRUCTURAL AND SAYS SO. Everything above pins a condition, which is what this
   repo prefers; this pins a control-flow fact, because there is no cheaper way to reach it — the
   statement it protects sits 150 lines into bootstrapSync, past thirty globals it assigns.

   It is here because the mutation was MEASURED to survive: deleting that `return` left all 1138
   tests green while bootstrapSync carried on, loaded empty stores and reached its own
   `bootReady('ok')`. The `_bootNoMember` latch in bootGate now stops that call hiding the gate, so
   the consequence is no longer a silent empty app — but wasted work and a `setSync('ok')` that
   contradicts the screen is still a defect, and a known survivor with no assertion is the thing
   CLAUDE.md's gate rule forbids. */
const fs = require('fs');
const path = require('path');

test('the non-member branch RETURNS — it must never fall through into the paint', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const i = src.indexOf("bootReady('nomember'");
  assert.ok(i > 0, 'bootstrapSync must raise the non-member gate at all');
  const after = src.slice(i, i + 200);
  assert.match(after, /bootReady\('nomember'[^;]*\);\s*return\s*;/,
    'the gate must be the last thing this path does — anything after it paints an app with no data in it');
});

test('186: and so does the sign-in branch, which is now the FIRST one a stranger reaches', () => {
  /* Structural for the same reason as its twin above, and stated as such. The two live one line
     apart and the second is the one a mutant would find easier to drop: the non-member path had a
     latch behind it from 185, and a fall-through here would paint an empty app for every
     signed-out visitor — which, once the anon fallback is gone, is every first open on a device. */
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const i = src.indexOf("bootReady('signin'");
  assert.ok(i > 0, 'bootstrapSync must raise the sign-in gate at all');
  assert.match(src.slice(i, i + 200), /bootReady\('signin'[^;]*\);\s*return\s*;/);
  // and the choice between the two must be made on the session, not on anything the client believes
  const branch = src.slice(src.indexOf("_tg==='nomember' ||"), i);
  assert.match(branch, /sessionUser\(\s*_ses\s*\)/,
    'which screen is a question about the SESSION; which gate is a question about the tenant');

  /* ⚠️ AND THE POLARITY, which is not pedantry: this assertion was ADDED after hand-mutating
     `if(_u)` to `if(!_u)` and watching every unit test stay green. Only the browser specs caught it,
     and they do not run in `npm test`. Inverted, a stranger who has never signed in is told "you're
     signed in as , but that account isn't linked to a café" and offered Sign out, while a real
     non-member gets a form that cannot change their answer. Both screens exist and both are wrong,
     which is precisely the failure a count-the-states test cannot see. */
  assert.match(branch, /if\(_u\)\s*\{\s*bootReady\('nomember'/,
    'a SESSION means the non-member message; no session means the sign-in form. Inverting this ships two wrong screens');
});

/* ── The sync pill. Found by DRIVING it, not by a test. ───────────────────────────────────────── */

test('the non-member state does not also claim the server is unreachable', () => {
  /* The first build wore setSync('error') here, which prints "Can't reach server — working offline"
     — both halves false: the request was a clean HTTP 200 and the answer was unambiguous. It sat one
     pill's width from a full-screen message saying no data has been lost, so the app told the user
     two different stories and the alarming one was the wrong one. */
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  const i = src.indexOf("bootReady('nomember'");
  const branch = src.slice(Math.max(0, i - 400), i);
  assert.ok(!/setSync\('error'\)/.test(branch),
    'nothing failed on this path, and the error pill says the opposite of the gate');
  assert.match(branch, /setSync\('none'\)/, 'the pill must have nothing to say');
});

test("'none' hides the pill rather than showing an empty one", () => {
  // An unmapped state would leave `textContent=''` with `hidden=false` — a blank pill sitting there.
  const el = { hidden: false, textContent: 'Loading latest data…', __t: 0, setAttribute() {} };
  // eslint-disable-next-line no-new-func
  const setSync = new Function('E', `
    "use strict";
    var document={getElementById:function(){ return E; }};
    var clearTimeout=function(){}, setTimeout=function(){ return 1; };
    ${extractFn(SRC, 'setSync')}
    return setSync;
  `)(el);
  setSync('none');
  assert.strictEqual(el.hidden, true, 'hidden, not blank-but-visible');
  setSync('loading');
  assert.strictEqual(el.hidden, false, 'and every other state still behaves');
  assert.match(el.textContent, /Loading/);
});
