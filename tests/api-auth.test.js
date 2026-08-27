/*
 * api-auth.test.js — batch 210. The caller gate on the two AI endpoints.
 *
 * Both `api/parse-invoice` and `api/insight` shipped with no caller restriction at all: no auth, no
 * rate limit, no origin check, and a client that sent no credential. Anyone on the internet could
 * spend Max's Gemini key. `api/_auth.js` closes that; this file is what makes the closing checkable.
 *
 * ⚠️ EVERY ASSERTION HERE RUNS THE REAL THING. `verifyCaller` is called with an injected fetch, the
 * two handlers are require()'d and invoked against fake req/res, and `apiAuthHeaders` is CUT OUT of
 * the shipped js/app.js rather than re-typed. CLAUDE.md's longest roster is tests that mirrored the
 * function they were pinning and passed against the very defect they existed to catch; there is no
 * second copy of any of this logic in this file.
 *
 * The one source-level assertion is at the bottom and says so about itself.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const A = require('../api/_auth.js');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const req = (headers) => ({ headers: headers || {} });

/* ---------------- bearerToken: the pure half ---------------- */

test('bearerToken reads the token from either header spelling, any scheme case', () => {
  assert.equal(A.bearerToken(req({ authorization: 'Bearer abc.def.ghi' })), 'abc.def.ghi');
  assert.equal(A.bearerToken(req({ Authorization: 'Bearer abc.def.ghi' })), 'abc.def.ghi');
  assert.equal(A.bearerToken(req({ authorization: 'bearer abc.def.ghi' })), 'abc.def.ghi');
  assert.equal(A.bearerToken(req({ authorization: '  Bearer   abc.def.ghi  ' })), 'abc.def.ghi');
});

test('bearerToken yields nothing when there is no usable credential', () => {
  assert.equal(A.bearerToken(req({})), '');
  assert.equal(A.bearerToken(undefined), '');
  assert.equal(A.bearerToken(req({ authorization: '' })), '');
  assert.equal(A.bearerToken(req({ authorization: 'Basic abc' })), '');
  assert.equal(A.bearerToken(req({ authorization: 'Bearer' })), '');
  assert.equal(A.bearerToken(req({ authorization: 'Bearer ' })), '');
  assert.equal(A.bearerToken(req({ authorization: ['Bearer x'] })), '');   // not a string
});

/* ⚠️ A token is never split on internal whitespace, and this is the assertion that says why: taking
   the first word of "Bearer abc def" would hand a TRUNCATED token to the verifier, which then fails
   for a reason nobody could read off the wire. Refusing outright is the honest answer. */
test('bearerToken refuses rather than truncating a token containing whitespace', () => {
  assert.equal(A.bearerToken(req({ authorization: 'Bearer abc def' })), '');
});

/* ---------------- userIsUsable ---------------- */

test('userIsUsable requires a real id', () => {
  assert.equal(A.userIsUsable(null), false);
  assert.equal(A.userIsUsable({}), false);
  assert.equal(A.userIsUsable({ id: 123 }), false);
  assert.equal(A.userIsUsable('u1'), false);
  assert.equal(A.userIsUsable({ id: 'u1' }), true);
});

test('userIsUsable refuses an account that says outright it is unconfirmed', () => {
  assert.equal(A.userIsUsable({ id: 'u1', email_confirmed_at: null, confirmed_at: null }), false);
  assert.equal(A.userIsUsable({ id: 'u1', email_confirmed_at: '2026-08-27T00:00:00Z' }), true);
  assert.equal(A.userIsUsable({ id: 'u1', confirmed_at: '2026-08-27T00:00:00Z' }), true);
});

/* ---------------- verifyCaller: with an injected fetch ---------------- */

const okUser = { id: 'user-1', email_confirmed_at: '2026-08-27T00:00:00Z' };
const fetchOk = (captured) => async (url, opts) => {
  if (captured) { captured.url = url; captured.opts = opts; }
  return { ok: true, json: async () => okUser };
};

test('verifyCaller accepts a live confirmed session and reports who it was', async () => {
  const seen = {};
  const r = await A.verifyCaller(req({ authorization: 'Bearer tok-1' }), fetchOk(seen));
  assert.deepEqual(r, { ok: true, userId: 'user-1' });
  assert.match(seen.url, /\/auth\/v1\/user$/);
  assert.equal(seen.opts.headers.Authorization, 'Bearer tok-1');
  assert.ok(seen.opts.headers.apikey, 'the project key must ride along or Supabase 401s everything');
});

test('verifyCaller refuses with no credential, and does not call out at all', async () => {
  let called = false;
  const r = await A.verifyCaller(req({}), async () => { called = true; return { ok: true, json: async () => okUser }; });
  assert.deepEqual(r, { ok: false, reason: 'no-token' });
  assert.equal(called, false, 'a credential-less request must cost us no round trip');
});

test('verifyCaller refuses a token Supabase rejects', async () => {
  const r = await A.verifyCaller(req({ authorization: 'Bearer nope' }), async () => ({ ok: false, status: 401 }));
  assert.deepEqual(r, { ok: false, reason: 'bad-token' });
});

test('verifyCaller refuses an unreadable answer', async () => {
  const r = await A.verifyCaller(req({ authorization: 'Bearer x' }),
    async () => ({ ok: true, json: async () => { throw new Error('not json'); } }));
  assert.deepEqual(r, { ok: false, reason: 'bad-json' });
});

test('verifyCaller refuses an unconfirmed account even when the token is live', async () => {
  const r = await A.verifyCaller(req({ authorization: 'Bearer x' }),
    async () => ({ ok: true, json: async () => ({ id: 'u9', email_confirmed_at: null, confirmed_at: null }) }));
  assert.deepEqual(r, { ok: false, reason: 'unconfirmed' });
});

/* ⚠️ THE ONE THAT MATTERS MOST, because it is the branch that decides whether this gate is a gate.
   When the verification call ITSELF fails — Supabase unreachable from Vercel, DNS, a timeout — we
   know nothing about the caller. CLAUDE.md's rule is that such a default is a decision about
   CONSEQUENCE: refusing costs a legitimate user the AI second-reader, which the app already renders
   as "unavailable"; admitting costs somebody else's quota and, once the paid tier lands, money.
   Flip this to `{ok:true}` and every gate in the file is decoration, so it is pinned by name. */
test('verifyCaller FAILS CLOSED when the verification call itself throws', async () => {
  const r = await A.verifyCaller(req({ authorization: 'Bearer x' }),
    async () => { throw new Error('network'); });
  assert.deepEqual(r, { ok: false, reason: 'verify-failed' });
});

/* Finding 1 of the pre-push review, as two tests: the first draft bounded nothing here, so a
   Supabase that HUNG rather than errored would have held the serverless function open.

   ⚠️ IT IS TWO TESTS BECAUSE THE FIRST VERSION WAS ONE AND COULD NOT FAIL. It asserted only the
   OUTCOME — `verify-failed` — from a fake fetch that read `opts.signal.addEventListener`. Delete the
   signal and that read throws, the throw is caught by the same try/catch, and the result is
   `verify-failed` again: green, for the opposite reason. Roster 205's shape exactly, in a test
   written to close a review finding. The mechanism now has an assertion of its own. */
test('verifyCaller hands an abort signal to the verification call', async () => {
  const seen = {};
  await A.verifyCaller(req({ authorization: 'Bearer tok' }), fetchOk(seen));
  assert.ok(seen.opts.signal, 'the verification fetch must be abortable, or nothing can bound it');
  assert.equal(typeof seen.opts.signal.addEventListener, 'function');
  assert.equal(seen.opts.signal.aborted, false, 'and not already aborted before it is even sent');
});

test('verifyCaller settles when the verification call hangs, rather than waiting forever',
  { timeout: 4000 }, async () => {
  let signal = null;
  /* Honours the signal exactly as a real fetch does. With no signal to honour it never settles at
     all, which is the defect itself — and the explicit {timeout} is what turns that into a red
     rather than a hung suite. */
  const hangs = (url, opts) => new Promise((_res, rej) => {
    signal = opts && opts.signal;
    if (signal) signal.addEventListener('abort', () => rej(new Error('aborted')));
  });
  const r = await A.verifyCaller(req({ authorization: 'Bearer x' }), hangs);
  assert.deepEqual(r, { ok: false, reason: 'verify-failed' });
  assert.equal(signal && signal.aborted, true, 'the bound must have fired, not merely elapsed');
});

test('verifyCaller refuses when there is no fetch to verify with', async () => {
  const saved = global.fetch;
  delete global.fetch;
  try {
    const r = await A.verifyCaller(req({ authorization: 'Bearer x' }));
    assert.deepEqual(r, { ok: false, reason: 'no-fetch' });
  } finally { if (saved) global.fetch = saved; }
});

/* ---------------- the handlers, invoked for real ---------------- */

function fakeRes() {
  const out = { statusCode: 0, headers: {}, body: null };
  return {
    out,
    setHeader(k, v) { out.headers[k] = v; },
    end(s) { out.body = s; },
    set statusCode(n) { out.statusCode = n; },
    get statusCode() { return out.statusCode; }
  };
}

for (const route of ['parse-invoice', 'insight']) {
  test('api/' + route + ' refuses a POST carrying no credential', { timeout: 4000 }, async () => {
    const handler = require('../api/' + route + '.js');
    const res = fakeRes();
    await handler({ method: 'POST', headers: {}, body: { text: 'x', insights: [{ facts: {}, text: 'y' }] } }, res);
    assert.equal(res.out.statusCode, 401, 'an uncredentialled POST must not reach Gemini');
    assert.deepEqual(JSON.parse(res.out.body), { status: 'unavailable', reason: 'auth' });
  });

  /* ⚠️ BOTH HANDLER TESTS CARRY AN EXPLICIT {timeout}, AND IT WAS ADDED BECAUSE THE MUTATION HUNG
     RATHER THAN GOING RED. Deleting the gate lets the handler fall through to `readBody`, which on a
     fake req whose `on()` does nothing never resolves — so the test that exists to catch a removed
     gate would have reported neither pass nor fail, and in CI a hung job is not a red one. That is
     roster entry 195 arriving inside the file written to close a different hole. Found by running
     the mutation, which is the only thing that could have found it. */

  /* The gate is placed ABOVE the body read, and the comment at both sites says so. This is that
     claim as an assertion rather than as prose: if the gate moved below `readBody`, an anonymous
     caller would get us to buffer up to 2MB before being told no, and `req.on` would have been
     wired. A stream listener attached here is the tell. */
  test('api/' + route + ' refuses BEFORE reading the request body', { timeout: 4000 }, async () => {
    const handler = require('../api/' + route + '.js');
    const res = fakeRes();
    let listened = false;
    await handler({ method: 'POST', headers: {}, on() { listened = true; } }, res);
    assert.equal(res.out.statusCode, 401);
    assert.equal(listened, false, 'the body must not be buffered for a caller we are about to refuse');
  });
}

/* ---------------- the duplication guard ---------------- */

/* api/_auth.js hard-codes the project's PUBLISHABLE url and key, with a stated reason: requiring new
   Vercel env vars would either fail open or take the live invoice reader down on deploy. The cost of
   that choice is a second copy of two values index.html already carries, and "two definitions of the
   same thing is the defect" is this repo's rule. So they are compared, not trusted. */
test('the api fallback project config still matches the one index.html ships', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const line = (html.match(/production:\s*\{[^}]*\}/) || [])[0];
  assert.ok(line, 'the production entry could not be found in index.html');
  assert.ok(line.includes('"' + A.FALLBACK_URL + '"'),
    'api/_auth.js FALLBACK_URL has drifted from index.html\'s production url');
  assert.ok(line.includes('"' + A.FALLBACK_KEY + '"'),
    'api/_auth.js FALLBACK_KEY has drifted from index.html\'s production key');
});

/* ---------------- the client half ---------------- */

/* The REAL apiAuthHeaders, cut from the shipped file. `setTimeout` is shadowed so the 5s bound is
   both ASSERTED and fired instantly — the alternative is a test that really waits five seconds, and
   a slow test is one somebody eventually deletes. */
function buildApiAuthHeaders(supa, onDelay) {
  const app = loadApp();
  // the REAL bound, cut from the shipped file — a literal here could drift from it silently
  const src = extractVar(app, 'AUTH_HDR_TIMEOUT_MS') + '\n' + extractFn(app, 'apiAuthHeaders');
  const realSetTimeout = setTimeout;
  const fakeSetTimeout = (fn, ms) => { if (onDelay) onDelay(ms); return realSetTimeout(fn, 0); };
  // eslint-disable-next-line no-eval
  return eval('(function(SUPA, setTimeout){ ' + src + ' return apiAuthHeaders; })')(supa, fakeSetTimeout);
}

const supaWith = (session) => ({ auth: { getSession: async () => ({ data: { session } }) } });

test('apiAuthHeaders attaches the live access token', async () => {
  const h = await buildApiAuthHeaders(supaWith({ access_token: 'tok-9' }))();
  assert.equal(h.Authorization, 'Bearer tok-9');
  assert.equal(h['Content-Type'], 'application/json');
});

test('apiAuthHeaders sends no credential when there is no session, rather than inventing one', async () => {
  const h = await buildApiAuthHeaders(supaWith(null))();
  assert.equal(h.Authorization, undefined);
  assert.equal(h['Content-Type'], 'application/json');
});

test('apiAuthHeaders survives a getSession that errors or throws', async () => {
  const errored = await buildApiAuthHeaders({ auth: { getSession: async () => ({ error: { message: 'x' }, data: null }) } })();
  assert.equal(errored.Authorization, undefined);
  const threw = await buildApiAuthHeaders({ auth: { getSession: async () => { throw new Error('boom'); } } })();
  assert.equal(threw.Authorization, undefined);
});

/* ⚠️ All three clauses of the guard are exercised, and the third and fourth cases below exist
   because the mutation gate found them missing: flipping the second `||` to `&&` survived, and it
   survived because every test here handed the function either a null client or a complete one.
   The shapes in between are REAL rather than defensive — CLAUDE.md records that `getSession` "can be
   absent entirely (the Playwright shim)", and `authInit` guards the same three ways for the same
   reason. Under the mutant, a client with no `auth` reads `typeof SUPA.auth.getSession` and throws
   synchronously out of a function every AI call awaits. */
test('apiAuthHeaders copes with no Supabase client at all', async () => {
  const h = await buildApiAuthHeaders(null)();
  assert.deepEqual(h, { 'Content-Type': 'application/json' });
});

test('apiAuthHeaders copes with a client that has no auth namespace', async () => {
  const h = await buildApiAuthHeaders({})();
  assert.deepEqual(h, { 'Content-Type': 'application/json' });
});

test('apiAuthHeaders copes with an auth namespace that has no getSession', async () => {
  const h = await buildApiAuthHeaders({ auth: {} })();
  assert.deepEqual(h, { 'Content-Type': 'application/json' });
});

/* ⚠️ Roster entry 195: a promise that never settles is a THIRD outcome, and node:test calls it
   neither pass nor fail — it HANGS. The insight caller frees its in-flight key in a `.catch` a hang
   never reaches, so this bound is what stops one wedged getSession from disabling phrasing until the
   scope changes. The explicit {timeout} is here because a regression in it presents as a hung suite
   rather than a red one. */
test('apiAuthHeaders always settles, on a bounded wait', { timeout: 5000 }, async () => {
  let delay = null;
  const hangs = { auth: { getSession: () => new Promise(() => {}) } };
  const h = await buildApiAuthHeaders(hangs, (ms) => { if (delay === null) delay = ms; })();
  assert.equal(delay, 3000, 'the bound must stay a real wait, not shrink to nothing');
  assert.deepEqual(h, { 'Content-Type': 'application/json' });
});

/* ⚠️ THE BUDGET, ASSERTED. Three ceilings have to fit inside a fourth, and until batch 210 they did
   not: the client aborted at 20s while the server could legitimately spend 3+3+15. The failure that
   causes is invisible in the worst way — a reading the server DID produce is thrown away by the
   caller a moment before it lands, and the user sees the ordinary "unavailable". Nothing in either
   file could notice, because each number is correct on its own. So the arithmetic is pinned here,
   reading every constant from the shipped source rather than restating any of them. */
test('the AI call budget contains the server-side work it has to wait for', () => {
  const app = loadApp();
  const num = (src, name) => Number((extractVar(src, name).match(/=\s*(\d+)/) || [])[1]);
  const clientBudget = num(app, 'AI_CALL_BUDGET_MS');
  const tokenBound = num(app, 'AUTH_HDR_TIMEOUT_MS');
  const gemini = Number((fs.readFileSync(path.join(__dirname, '..', 'api', 'parse-invoice.js'), 'utf8')
    .match(/var GEMINI_TIMEOUT_MS\s*=\s*(\d+)/) || [])[1]);
  for (const [n, v] of [['AI_CALL_BUDGET_MS', clientBudget], ['AUTH_HDR_TIMEOUT_MS', tokenBound],
                        ['GEMINI_TIMEOUT_MS', gemini], ['VERIFY_TIMEOUT_MS', A.VERIFY_TIMEOUT_MS]]) {
    assert.ok(Number.isFinite(v) && v > 0, n + ' could not be read as a positive number: ' + v);
  }
  assert.ok(tokenBound + A.VERIFY_TIMEOUT_MS + gemini <= clientBudget,
    'the worst-case server path (' + (tokenBound + A.VERIFY_TIMEOUT_MS + gemini) + 'ms) must fit inside '
    + 'the client abort (' + clientBudget + 'ms), or the caller discards answers the server produced');
});

/* ---------------- the wiring, and what this assertion is worth ---------------- */

/* ⚠️ This one greps source, which CLAUDE.md rightly calls the weak form — it proves the call sites
   are SHAPED right, never that they run. The real proof of the wiring is the browser drive recorded
   in the handover. It earns its place anyway by being a rule about the FUTURE rather than about
   today's two sites: a third `api/` endpoint added without the credential fails here, which is
   exactly how this gap arose in the first place. */
test('every client call to our own api/ endpoints carries the credential', () => {
  const src = loadApp();
  const calls = src.match(/fetch\('\/api\/[^']*'/g) || [];
  assert.ok(calls.length >= 2, 'expected the invoice and insight calls; found ' + calls.length);
  for (const c of calls) {
    const at = src.indexOf(c);
    const before = src.slice(Math.max(0, at - 60), at);
    assert.match(before, /apiAuthHeaders\(\)\.then\(function\(hdrs\)\{ return $/,
      'an api/ fetch is not wrapped in apiAuthHeaders: ' + c);
  }
  assert.ok(!/fetch\('\/api\/[^']*',\{[^}]*'Content-Type'/.test(src),
    'an api/ fetch still builds its own literal headers instead of taking them from apiAuthHeaders');
});
