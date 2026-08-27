/*
 * api/_auth.js — the caller gate on the two AI endpoints.
 *
 * Underscore-prefixed, so Vercel ignores it as a route: pure, `require()`-able, unit-tested logic,
 * exactly as `_gemini.js` and `_insight.js` are.
 *
 * WHY THIS EXISTS. `api/parse-invoice` and `api/insight` shipped with no caller restriction of any
 * kind — no auth, no rate limit, no origin check — and the client sent no credential. Measured on
 * production 27 Aug 2026: both answer `?health=1` unauthenticated with `keyPresent:true`, and a
 * plain POST from anywhere on the internet spends Max's Gemini key. Found by the queue's
 * "Gate review before public signup" item, which exists to read exactly this class of thing before
 * a stranger can make an account.
 *
 * WHAT IT IS AND IS NOT. It turns "anybody" into "somebody with a live, confirmed account on this
 * project". That is the half that needs no storage. It is NOT a rate limit: a signed-in caller can
 * still loop, and bounding that needs a per-account counter, which needs a table, which needs a
 * migration. That half is recorded as the residual in docs/GATE-REVIEW.md rather than half-built
 * here.
 *
 * HOW IT VERIFIES. One `GET /auth/v1/user` against Supabase with the caller's bearer token. That is
 * deliberately a network call rather than local signature maths: it proves the session is LIVE, so a
 * revoked or expired token cannot spend the key, and it needs no JWT secret to be introduced to this
 * repo. It costs ~100ms against a Gemini budget of 12–15s.
 *
 * ⚠️ IT FAILS CLOSED, ON PURPOSE, AND THAT IS A DECISION ABOUT CONSEQUENCE RATHER THAN EPISTEMICS —
 * CLAUDE.md's rule, applied here. If the token is missing, rejected, or unreadable because the
 * verification call itself failed, the endpoint refuses. The cost of refusing a legitimate caller is
 * that the AI second-reader degrades to "unavailable" and the app works exactly as it does with the
 * toggle off — visible, recoverable, no data lost. The cost of admitting an illegitimate one is
 * somebody else's quota today and somebody else's money once the paid tier lands. Those are not
 * symmetrical, so "could not tell" refuses.
 */
'use strict';

/*
 * The project's PUBLISHABLE config, with an env override.
 *
 * ⚠️ These two values are hard-coded on purpose and it is not a leak: both already ship, in clear,
 * in `index.html`, which Vercel serves to the world. The alternative was requiring new Vercel env
 * vars, and that has a failure mode this does not — an absent env var would either fail open (a gate
 * that is decoration) or take the live invoice reader down the moment this deploys, before anyone
 * could set them. CLAUDE.md's "API keys live ONLY in Vercel env vars" is about the GEMINI key, which
 * is secret; a publishable key is not one.
 *
 * The duplication is the real cost, so `tests/api-auth.test.js` asserts these still match
 * `index.html`'s production entry. Two definitions of the same thing is the defect; a test that
 * fails when they diverge is the answer.
 */
var FALLBACK_URL = 'https://izrnptxhdylllodvglla.supabase.co';
var FALLBACK_KEY = 'sb_publishable_0Wm1rq48d7-7suBoXl4Dtw_EHpEFRZF';

function projectUrl() {
  var v = process.env.SUPABASE_URL && String(process.env.SUPABASE_URL).trim();
  return (v || FALLBACK_URL).replace(/\/+$/, '');
}

function projectKey() {
  var v = process.env.SUPABASE_ANON_KEY && String(process.env.SUPABASE_ANON_KEY).trim();
  return v || FALLBACK_KEY;
}

/*
 * Pull the bearer token out of a request. Pure, so it is the half that is tested without a network.
 *
 * Header names are case-insensitive per RFC 9110 and Node lower-cases them, but a hand-built test
 * double or another runtime need not, so both spellings are read. The scheme match is deliberately
 * case-insensitive too ("bearer" is as legal as "Bearer"), and everything after the single space is
 * the token — a token is never split on further whitespace, because that would silently accept a
 * truncated one.
 */
function bearerToken(req) {
  var h = (req && req.headers) || {};
  var raw = h.authorization || h.Authorization || '';
  if (typeof raw !== 'string') return '';
  var m = /^\s*bearer\s+(\S+)\s*$/i.exec(raw);
  return m ? m[1] : '';
}

/*
 * Is this user object one we will spend the key for?
 *
 * A live access token already implies a confirmed address on this project — with
 * `mailer_autoconfirm:false`, Supabase issues no session until the address is proven — so this is a
 * second layer rather than the first. It refuses only when the object is present and says
 * explicitly that neither confirmation timestamp exists, so a shape we have not seen cannot produce
 * a false refusal on the strength of a missing field alone.
 */
function userIsUsable(user) {
  if (!user || typeof user !== 'object') return false;
  if (!user.id || typeof user.id !== 'string') return false;
  var hasConfirmed = ('email_confirmed_at' in user) || ('confirmed_at' in user);
  if (hasConfirmed && !user.email_confirmed_at && !user.confirmed_at) return false;
  return true;
}

/*
 * Verify the caller. Resolves {ok:true, userId} or {ok:false, reason} — never throws, never rejects,
 * because the handler's whole contract is that a failure is an ordinary "unavailable" rather than
 * something it has to special-case.
 *
 * `fetchImpl` is injected so the tests exercise THIS function rather than a copy of it. CLAUDE.md's
 * longest roster is tests that re-implemented the thing they were pinning; there is no second copy
 * of this logic anywhere.
 */
async function verifyCaller(req, fetchImpl) {
  var token = bearerToken(req);
  if (!token) return { ok: false, reason: 'no-token' };

  var doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return { ok: false, reason: 'no-fetch' };

  var resp;
  try {
    resp = await doFetch(projectUrl() + '/auth/v1/user', {
      method: 'GET',
      headers: { apikey: projectKey(), Authorization: 'Bearer ' + token }
    });
  } catch (e) {
    return { ok: false, reason: 'verify-failed' };      // fails CLOSED — see the header
  }

  if (!resp || !resp.ok) return { ok: false, reason: 'bad-token' };

  var user;
  try { user = await resp.json(); } catch (e) { return { ok: false, reason: 'bad-json' }; }

  if (!userIsUsable(user)) return { ok: false, reason: 'unconfirmed' };
  return { ok: true, userId: user.id };
}

module.exports = {
  bearerToken: bearerToken,
  userIsUsable: userIsUsable,
  verifyCaller: verifyCaller,
  projectUrl: projectUrl,
  projectKey: projectKey,
  FALLBACK_URL: FALLBACK_URL,
  FALLBACK_KEY: FALLBACK_KEY
};
