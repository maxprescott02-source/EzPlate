/*
 * auth-url-error.test.js — 238. The two halves of a confirmation link that lands somewhere useful.
 *
 * THE DEFECT THIS EXISTS FOR, measured on production on 8 Sep 2026 rather than reasoned about.
 * A stranger signed up, clicked the confirmation email, and was dropped on
 * `http://localhost:3000/#error=access_denied&error_code=otp_expired&…`. Two separate faults, and
 * the suite could not see either:
 *
 *   1. `signUp` sent no `emailRedirectTo`, so the link inherited the PROJECT'S Site URL — a
 *      dashboard field, still GoTrue's factory `http://localhost:3000` on the day self-service
 *      sign-up shipped. Nothing in this repo could state it, so nothing could check it.
 *   2. Nothing read the fragment GoTrue sends back, so even once the link landed on the right
 *      origin a dead one produced a bare sign-in form and no explanation at all.
 *
 * ⚠️ AND `otp_expired` DID NOT MEAN WHAT IT SAYS, which is why the wording is pinned here rather
 * than left to a reader's judgement. `auth.users` showed that account created at 06:50:05 and
 * `email_confirmed_at` 06:50:23 — the FIRST click worked. A confirmation token is single-use, so
 * the error came from the second click. GoTrue returns the one code for "used" and "expired" and
 * cannot tell them apart either; a message naming only expiry would be a confident guess at the
 * less likely half, and would send someone to sign up again when they already have an account.
 *
 * Real functions throughout, extracted from js/app.js. No stub of anything shipped.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/** The real parse + wording + capture, over a fake location/history passed in as arguments. */
function urlApi() {
  // eslint-disable-next-line no-new-func
  return new Function(`
    "use strict";
    ${extractFn(SRC, 'authUrlParams')}
    ${extractFn(SRC, 'authUrlErrorMessage')}
    ${extractFn(SRC, 'captureAuthUrlError')}
    ${extractFn(SRC, 'authRedirectTo')}
    return { params: authUrlParams, message: authUrlErrorMessage,
             capture: captureAuthUrlError, redirect: authRedirectTo };
  `)();
}

/** A location that records what replaceState was handed, so the cleanup is OBSERVED not assumed. */
function mkLoc(over) {
  const calls = [];
  const loc = Object.assign(
    { protocol: 'https:', origin: 'https://scoopyscosting.vercel.app', pathname: '/', search: '', hash: '' },
    over || {});
  return { loc, hist: { replaceState: (a, b, url) => calls.push(url) }, calls };
}

const DEAD = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

/* ---- the parse ------------------------------------------------------------------------------ */

test('238: the fragment GoTrue actually sends is parsed key by key', () => {
  const A = urlApi();
  const p = A.params(DEAD);
  assert.equal(p.error, 'access_denied');
  assert.equal(p.error_code, 'otp_expired');
  /* ⚠️ THE `+` IS A SPACE AND `decodeURIComponent` DOES NOT KNOW THAT. This is form encoding, not
     percent encoding. Without the replace the user is shown "Email+link+is+invalid+or+has+expired",
     which is the app looking broken while quoting the server correctly. Asserted as the whole
     decoded sentence rather than `!/\+/` — a denylist assertion is weaker than an equality one
     (CLAUDE.md roster, 190), and "contains no plus sign" is also true of the empty string. */
  assert.equal(p.error_description, 'Email link is invalid or has expired');
});

test('238: percent escapes decode, and a malformed one does not throw the boot away', () => {
  const A = urlApi();
  assert.equal(A.params('#error_description=Nope%2C+sorry').error_description, 'Nope, sorry');
  /* A lone `%` is not valid percent encoding and decodeURIComponent throws on it. This function
     runs at module load, ABOVE the Supabase client — a throw here is a blank app, not a bad
     message — so the catch keeps the raw value and carries on. */
  const p = A.params('#error=access_denied&error_description=100%+broken');
  assert.equal(p.error, 'access_denied', 'the keys either side of a bad escape still parse');
  assert.equal(typeof p.error_description, 'string');
});

test('238: an empty or absent fragment parses to nothing at all', () => {
  const A = urlApi();
  for (const v of ['', '#', null, undefined, '#&&']) {
    assert.deepEqual(A.params(v), {}, JSON.stringify(v) + ' is not an error');
  }
});

test('238: a pair with no key on the left of the = is dropped, not stored under "="', () => {
  const A = urlApi();
  /* Found by the mutation gate: widening `i<0` to `i<=0` on the KEY makes `=foo` parse as the key
     `"=foo"`, which is a junk entry that then sits in the object every real lookup walks past. It
     matters more than it looks — `authUrlErrorMessage` decides "was there a verdict here at all"
     by whether these keys are present, so anything that invents a key is a step toward accusing an
     ordinary boot of a broken link. */
  assert.deepEqual(A.params('#=nokey&error=access_denied'), { error: 'access_denied' });
  assert.deepEqual(A.params('#=nokey'), {}, 'and on its own it is nothing at all');
});

/* ---- the wording ---------------------------------------------------------------------------- */

test('238: a used-or-expired link names BOTH causes and leads with the action', () => {
  const A = urlApi();
  const msg = A.message(A.params(DEAD));
  /* Both halves, because the server cannot distinguish them and the measured case was the one a
     naive message would have got wrong. */
  assert.match(msg, /already been used/i, 'the measured case: the first click worked');
  assert.match(msg, /expired/i, 'and the case the error code literally names');
  /* The action is the whole value of this message. Someone whose account is already confirmed must
     be sent to sign in, not around the sign-up loop again for a second single-use link. */
  assert.match(msg, /sign in/i, 'and what to do about it');
});

test('238: an error code we have never seen quotes the SERVER rather than guessing', () => {
  const A = urlApi();
  const msg = A.message(A.params('#error=server_error&error_code=unexpected_failure&error_description=Database+error+saving+new+user'));
  assert.equal(msg, 'Database error saving new user',
    "authSubmit's rule: the real message, because a friendly guess is how someone spends ten minutes on a problem the server had already named");
});

test('238: a verdict with no DESCRIPTION still says something, and never shows the raw enum', () => {
  const A = urlApi();
  /* ⚠️ THIS IS THE ARM THE MUTATION GATE FOUND, and it changed the code rather than only the test.
     The chain was `desc || err || fallback`, which put `access_denied` — a log token — in front of
     a café owner as if it were a sentence, and was unreachable besides, so two mutants on that line
     were equivalent. `err` now answers only "was there a verdict at all", which is the one question
     it can answer honestly. */
  const msg = A.message(A.params('#error=access_denied'));
  assert.match(msg, /sign in/i, 'there WAS a verdict here and the user is told what to do about it');
  assert.doesNotMatch(msg, /access_denied/, 'but never in the words the server logs it in');
  assert.equal(msg, A.message(A.params('#error=server_error')),
    'and any bare enum reaches the same sentence — the wording does not depend on which one');
});

test('238: /expired/ in the description reaches the used-or-expired wording without the code', () => {
  const A = urlApi();
  /* GoTrue has not always sent `error_code`, and a cached older client is not the only way to meet
     an older shape. The description is the second route to the same answer. */
  const msg = A.message(A.params('#error=access_denied&error_description=Email+link+is+invalid+or+has+expired'));
  assert.match(msg, /already been used/i);
});

test('238: no error keys means NO message — silence is the correct output here', () => {
  const A = urlApi();
  /* The failure this rules out is a gate that accuses every ordinary boot of a broken link.
     `authUrlErrorMessage` runs on every single load, and the overwhelmingly common input is {}. */
  assert.equal(A.message({}), '');
  assert.equal(A.message(null), '');
  assert.equal(A.message({ access_token: 'abc', token_type: 'bearer' }), '',
    'a SUCCESSFUL confirmation is not an error either');
});

/* ---- the capture, and what it is allowed to rewrite ------------------------------------------ */

test('238: the hash is cleaned so a refresh does not re-accuse the link', () => {
  const A = urlApi();
  const { loc, hist, calls } = mkLoc({ hash: DEAD });
  const msg = A.capture(loc, hist);
  assert.match(msg, /already been used/i, 'the message survives the cleanup');
  assert.deepEqual(calls, ['/'], 'and the fragment is gone');
});

test('238: ⚠️ THE SEARCH IS NEVER TOUCHED — ?env=staging picks the PROJECT', () => {
  const A = urlApi();
  /* This is the assertion with real money behind it. index.html reads `?env=staging` out of
     location.search to choose which Supabase project the app talks to, in the head, above the
     theme resolver and long before js/app.js is fetched. A cleanup that rewrote the URL to a bare
     pathname would silently return a staging session to PRODUCTION on its next boot — Max's real
     café — which is the exact accident the staging item exists to prevent. */
  const { loc, hist, calls } = mkLoc({ hash: DEAD, search: '?env=staging' });
  A.capture(loc, hist);
  assert.deepEqual(calls, ['/?env=staging'], 'the query survives verbatim; only the fragment goes');
});

test('238: ANY ONE of the three error keys is enough to recognise a fragment as ours', () => {
  const A = urlApi();
  /* The mutation gate's question, and it is a real shape rather than a hypothetical: GoTrue has not
     always sent all three keys, and `error_code` was the later addition. A recognition test that
     needs them TOGETHER stops recognising anything the day one is dropped — and the failure is
     silent, because an unrecognised fragment produces no message and no cleanup, which looks
     exactly like an ordinary boot. Each key is therefore proved to carry the recognition alone. */
  for (const only of ['#error=access_denied', '#error_code=otp_expired', '#error_description=Email+link+has+expired']) {
    const { loc, hist, calls } = mkLoc({ hash: only });
    assert.ok(A.capture(loc, hist), only + ' is recognised on its own');
    assert.deepEqual(calls, ['/'], 'and the fragment is cleaned on its own too');
  }
});

test('238: a fragment carrying a session is left completely alone', () => {
  const A = urlApi();
  /* Belt and braces on the ordering rule: this reader runs ABOVE createClient, so if it ever
     rewrote a URL that still held tokens it would destroy a confirmation that had just succeeded.
     It returns no message for one, and must not call replaceState either. */
  const { loc, hist, calls } = mkLoc({ hash: '#access_token=abc&refresh_token=def&token_type=bearer' });
  assert.equal(A.capture(loc, hist), '');
  assert.deepEqual(calls, [], 'nothing was rewritten out from under supabase-js');
});

test('238: an error in the QUERY is reported and the URL is left exactly as it came', () => {
  const A = urlApi();
  /* The PKCE shape, which this app does not use today. Reporting it costs nothing; rewriting it
     would mean guessing which of a URL's query keys are ours, and the assertion above is what
     that guess would have cost. */
  const { loc, hist, calls } = mkLoc({ search: '?error=access_denied&error_code=otp_expired' });
  assert.match(A.capture(loc, hist), /already been used/i);
  assert.deepEqual(calls, [], 'no query is ever rewritten, not even one that is all ours');
});

test('238: no location, or a history that throws, is a no-op rather than a dead boot', () => {
  const A = urlApi();
  assert.equal(A.capture(null, null), '');
  const { loc } = mkLoc({ hash: DEAD });
  const angry = { replaceState: () => { throw new Error('SecurityError'); } };
  /* A sandboxed iframe throws on replaceState. The message is the point of the function; the
     tidy-up is a courtesy, and a courtesy may not take the app down with it. */
  assert.match(A.capture(loc, angry), /already been used/i);
  assert.equal(A.capture(loc, undefined), A.capture(loc, angry), 'and a missing history is the same');
});

/* ---- where the confirmation email points ----------------------------------------------------- */

test('238: the redirect names this origin and the DIRECTORY, not the file', () => {
  const A = urlApi();
  assert.equal(A.redirect({ protocol: 'https:', origin: 'https://scoopyscosting.vercel.app', pathname: '/' }),
    'https://scoopyscosting.vercel.app/');
  /* `/index.html` and `/` are one place, and the Supabase allow-list is matched as a string. If
     this returned the file, the dashboard would need two entries spelling one destination — and
     the day somebody added only one, the fallback is silent. */
  assert.equal(A.redirect({ protocol: 'https:', origin: 'https://scoopyscosting.vercel.app', pathname: '/index.html' }),
    'https://scoopyscosting.vercel.app/');
  /* The TRAILING SLASH is not cosmetic and this is the mutant that finds it: the Supabase
     allow-list is matched as a string, so an origin with no path is a different entry from the same
     origin with `/`. A location that reports no pathname at all must still produce the directory
     form, or the fallback fires silently on whatever build hit that case. */
  assert.equal(A.redirect({ protocol: 'https:', origin: 'https://scoopyscosting.vercel.app', pathname: '' }),
    'https://scoopyscosting.vercel.app/', 'an absent pathname is the root, not nothing');
  assert.equal(A.redirect({ protocol: 'https:', origin: 'https://scoopyscosting.vercel.app' }),
    'https://scoopyscosting.vercel.app/');
});

test('238: a non-http origin sends NO redirect, so the call degrades to what shipped before', () => {
  const A = urlApi();
  /* `file:` reports the STRING "null" as its origin, which is truthy — sending it verbatim would
     put the literal text null in a confirmation email. Returning null omits the option entirely
     and GoTrue falls back to the Site URL, which is the pre-238 behaviour and is why this change
     was safe to ship ahead of the dashboard being corrected. */
  assert.equal(A.redirect({ protocol: 'file:', origin: 'null', pathname: '/x/index.html' }), null);
  assert.equal(A.redirect({ protocol: 'https:', origin: '', pathname: '/' }), null);
  assert.equal(A.redirect(null), null);
});

test('238: a local or preview build points at ITSELF, never at production', () => {
  const A = urlApi();
  /* A hardcoded production URL would have been shorter and would send every rehearsal's
     confirmation email to Max's real café. An origin that is not on the allow-list degrades to the
     Site URL; an origin that is WRONG does not degrade at all. */
  assert.equal(A.redirect({ protocol: 'http:', origin: 'http://localhost:8080', pathname: '/' }),
    'http://localhost:8080/');
  assert.equal(A.redirect({ protocol: 'https:', origin: 'https://scoopys-costing-git-x.vercel.app', pathname: '/' }),
    'https://scoopys-costing-git-x.vercel.app/');
});

test('238: authSignUp SENDS it — the real function, against a recording client', () => {
  const S = { calls: [] };
  // eslint-disable-next-line no-new-func
  const signUp = new Function('S', `
    "use strict";
    var location = { protocol: 'https:', origin: 'https://scoopyscosting.vercel.app', pathname: '/' };
    var SUPA = { auth: { signUp: function(a){ S.calls.push(a); return Promise.resolve({ data: { user: {} }, error: null }); } } };
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authRedirectTo')}
    ${extractFn(SRC, 'authSignUp')}
    return authSignUp;
  `)(S);
  return signUp('stranger@example.com', 'pw123456').then((r) => {
    assert.ok(!r.error, 'sign-up still succeeds');
    /* The whole argument, not a substring of it — 183(b)'s lesson: a substring match survives the
       key being glued onto something else. This is the ALLOWED arm; auth.test.js pins the degraded
       one, where there is no origin and the options key must be absent entirely. */
    assert.deepEqual(S.calls, [{
      email: 'stranger@example.com',
      password: 'pw123456',
      options: { emailRedirectTo: 'https://scoopyscosting.vercel.app/' },
    }]);
  });
});
