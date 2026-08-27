/*
 * cafe-create.test.js — 209. Naming your own café: the client decisions and the SQL that backs them.
 *
 * WHAT THIS FILE CAN AND CANNOT SEE, stated up front because half of it reads SQL text and text
 * cannot prove a function refuses. That needed a database and it was done — the rehearsal record
 * lives in `supabase/migrations/20260827_cafe_creation.sql`'s header, which is the only place it
 * can live. What text CAN pin is the handful of one-word edits that would silently undo the whole
 * thing, and that is what every SQL assertion below is.
 *
 * ⚠️ THE PROSE PROBLEM (CLAUDE.md roster 183a). The migration EXPLAINS itself at length and uses
 * the very words these assertions look for — "security definer", "owner", "advisory". A grep over
 * the raw file would fire on the paragraph rather than on the statement, and the positive half of
 * every such assertion would pass on prose alone. Every SQL assertion here runs over
 * comment-stripped text.
 *
 * ⚠️ AND THE ONE THAT IS NOT A GREP AT ALL. The client and the server BOTH decide whether a café
 * name is acceptable, and across a wire they cannot call one function — so they are genuinely two
 * definitions of one rule, which is the shape CLAUDE.md names as a defect everywhere it can be
 * avoided. It cannot be avoided here. The mitigation is that the number lives in exactly one place
 * on each side and the test below reads BOTH and asserts they agree, so a drift fails by name
 * rather than by a stranger being told 60 and refused at 60.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();
const MIGRATION = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260827_cafe_creation.sql'), 'utf8');
const MIRROR = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'staging', '01-schema.sql'), 'utf8');

/* The quote-aware stripper from tests/invites.test.js and tests/semantic-keys.test.js. Quote-aware
   for that file's reason: the naive `l.replace(/--.*$/,'')` ate a real line of code in the very
   migration it was pointed at. */
function code(sql) {
  return sql.split('\n').map((line) => {
    let inQuote = false;
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === "'") inQuote = !inQuote;
      else if (!inQuote && line[i] === '-' && line[i + 1] === '-') return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

/** A whole `create or replace function public.<name>(…) … $tag$;` block. The dollar tag is READ
 *  rather than assumed — semantic-keys.test.js learned that when an older migration quoted `$$`. */
function fnBlock(sql, name) {
  const a = sql.indexOf(`create or replace function public.${name}(`);
  if (a < 0) return null;
  const tag = /\bas\s+(\$[A-Za-z_]*\$)/.exec(sql.slice(a));
  if (!tag) return null;
  const b = sql.indexOf(tag[1] + ';', a + tag.index + tag[0].length);
  if (b < a) return null;
  return sql.slice(a, b + tag[1].length + 1);
}

const MIG = code(MIGRATION);
const MIR = code(MIRROR);
const BOTH = [['the migration', MIG], ['the mirror', MIR]];

/* The three real client functions, run rather than described. */
const api = new Function(`
  "use strict";
  ${extractVar(SRC, 'CAFE_NAME_MAX')}
  ${extractFn(SRC, 'cafeNameClean')}
  ${extractFn(SRC, 'cafeNameProblem')}
  ${extractFn(SRC, 'createBusinessState')}
  return { CAFE_NAME_MAX: CAFE_NAME_MAX, cafeNameClean: cafeNameClean,
           cafeNameProblem: cafeNameProblem, createBusinessState: createBusinessState };
`)();

/* ── 1. THE NAME ──────────────────────────────────────────────────────────────────────────────── */

test('a name is cleaned the same way the server cleans it, so "   " is a blank', () => {
  /* The normalisation is not cosmetic. Without it "   " is a three-character name that passes a
     length check, reaches the server, is trimmed there and refused — a round trip to be told
     something the field already knew. And a name pasted with a trailing newline would be a
     DIFFERENT string from the one typed, stored verbatim, and never match what the person believes
     their café is called. */
  assert.equal(api.cafeNameClean('  Scoopy’s  '), 'Scoopy’s');
  assert.equal(api.cafeNameClean('Scoopy’s\n Family   Cafe'), 'Scoopy’s Family Cafe',
    'every run of whitespace collapses to one space, newlines and tabs included');
  assert.equal(api.cafeNameClean('   '), '', 'so whitespace alone is a blank');
  assert.equal(api.cafeNameClean('\t\n '), '');
  /* Null and undefined are not "no name typed" by accident — they are what a missing element
     yields, and `String(null)` is the string "null", which would create a café called null. */
  assert.equal(api.cafeNameClean(null), '');
  assert.equal(api.cafeNameClean(undefined), '');
});

test('the refusals are the two the server has, in words a person can act on', () => {
  assert.match(api.cafeNameProblem(''), /enter a name/i);
  assert.match(api.cafeNameProblem('   '), /enter a name/i, 'whitespace is a blank, not a name');
  assert.match(api.cafeNameProblem('x'.repeat(61)), /too long/i);
  assert.equal(api.cafeNameProblem('x'.repeat(60)), '', 'exactly the maximum is allowed');
  assert.equal(api.cafeNameProblem('Scoopy’s Family Cafe'), '', 'and an ordinary name has no problem');
  /* ⚠️ THE BOUNDARY IS TESTED FROM BOTH SIDES ON PURPOSE. A guard written `>=` instead of `>` reads
     identically and refuses a name the server would have accepted, which is the worse direction:
     the person is told 60 and cannot type 60. */
  assert.equal(api.cafeNameProblem('x'.repeat(59)), '');

  /* The whitespace collapse happens BEFORE the length check, or a name padded with spaces is
     refused as too long while the string that would have been sent is fine. */
  assert.equal(api.cafeNameProblem('  ' + 'x'.repeat(60) + '  '), '');
});

test('the client and the server agree on the maximum — read from both, not restated', () => {
  /* ⚠️ THIS IS THE ONLY THING STANDING BETWEEN TWO DEFINITIONS OF ONE RULE. The client cannot call
     the server's guard, so the number exists twice; what keeps them honest is that this reads the
     migration's own statement rather than a number written down in a test.
     A test asserting `CAFE_NAME_MAX === 60` would pass forever while the migration said 40. */
  const body = fnBlock(MIG, 'create_business');
  assert.ok(body, 'the migration must define create_business');
  const m = /length\(nm\) > (\d+)/.exec(body);
  assert.ok(m, 'the migration must bound the name length in its body');
  assert.equal(api.CAFE_NAME_MAX, Number(m[1]),
    `the client allows ${api.CAFE_NAME_MAX} and the server allows ${m[1]} — one of them is lying to somebody`);
});

/* ── 2. THE ANSWER ────────────────────────────────────────────────────────────────────────────── */

test('only a uuid STRING means the café exists — everything else is "could not tell"', () => {
  /* Same discipline as `claimState` and `tenantGateState`, with one fewer answer: `create_business`
     either returns the id or raises, so there is no "nothing to create". The reason this is written
     the long way rather than as `res.data ? 'made' : 'unknown'` is claimState's recorded one — any
     truthy non-string would otherwise trigger a boot on a café that does not exist. */
  assert.equal(api.createBusinessState({ data: '00000000-0000-0000-0000-000000000001' }), 'made');
  assert.equal(api.createBusinessState({ data: null, error: { message: 'nope' } }), 'unknown',
    'an error is not an answer');
  assert.equal(api.createBusinessState({ data: null }), 'unknown');
  assert.equal(api.createBusinessState({}), 'unknown', 'an absent body is not a café');
  assert.equal(api.createBusinessState(undefined), 'unknown');
  assert.equal(api.createBusinessState(null), 'unknown');
  for (const truthy of [1, true, {}, [], { id: 'x' }]) {
    assert.equal(api.createBusinessState({ data: truthy }), 'unknown',
      `${JSON.stringify(truthy)} is not a uuid and must not boot the app`);
  }
  assert.equal(api.createBusinessState({ data: '' }), 'unknown', 'and neither is an empty string');
});

test('the RPC is asked by name, with the cleaned name as its one argument', async () => {
  const S = { calls: [] };
  const fn = new Function('S', `
    "use strict";
    var SUPA = { rpc: function(name, args){ S.calls.push([name, args]); return Promise.resolve({ data: 'B1', error: null }); } };
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authCreateBusiness')}
    return authCreateBusiness;
  `)(S);
  const r = await fn('Scoopy’s Family Cafe');
  assert.deepEqual(S.calls, [['create_business', { p_name: 'Scoopy’s Family Cafe' }]]);
  assert.equal(r.data, 'B1');

  /* NO CLIENT AT ALL must RETURN an error, never throw. Inherited from the deleted
     `authInvitePending` test, where the mutation gate found exactly this: flipping the guard's `||`
     to `&&` makes a null SUPA raise a TypeError BEFORE the try block, and nothing above catches it
     — so the button stays disabled forever on a device that cannot reach the database. */
  const noClient = new Function(`
    "use strict";
    var SUPA = null;
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authCreateBusiness')}
    return authCreateBusiness;
  `)();
  const rNone = await noClient('x');
  assert.ok(rNone.error, 'no client is an error, not a crash');
  assert.match(rNone.error.message, /connection/i);
  /* And a client with no `rpc` — the Playwright shim's shape, and an older deployment's. */
  const noRpc = new Function(`
    "use strict";
    var SUPA = {};
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authCreateBusiness')}
    return authCreateBusiness;
  `)();
  assert.ok((await noRpc('x')).error, 'a client with no rpc is an error too');

  /* A REJECTED promise is the other settle path, and roster entry 184(a) is that a test taking only
     the common one has pinned half a contract. supabase-js resolves with `{error}`; a genuine
     network throw rejects, and in this café that is the one that fires when there is no signal. */
  const throws = new Function(`
    "use strict";
    var SUPA = { rpc: function(){ return Promise.reject(new Error('offline')); } };
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'authCreateBusiness')}
    return authCreateBusiness;
  `)();
  const rT = await throws('x');
  assert.ok(rT.error, 'a rejected promise is an error, not an unhandled rejection');
  assert.match(rT.error.message, /offline/);
});

/* ── 3. THE MIGRATION ─────────────────────────────────────────────────────────────────────────── */

test('it is SECURITY DEFINER with a pinned search_path — both, in both files', () => {
  /* `security definer` is what lets it write two tables no client may write. A mutable search_path
     on a definer function is an escalation path and the Supabase linter flags it, which is why
     every object it touches is schema-qualified. */
  for (const [label, sql] of BOTH) {
    const body = fnBlock(sql, 'create_business');
    assert.ok(body, `${label} does not define create_business`);
    assert.match(body, /security definer/, `${label}: must be SECURITY DEFINER`);
    assert.match(body, /set search_path = ''/, `${label}: must pin search_path`);
  }
});

test('the founding membership is derived from the session, never from an argument', () => {
  /* ⚠️ THE SIGNATURE IS THE SECURITY. It takes a NAME and nothing else: there is no business id and
     no user id to point at somebody else's café. A `p_user uuid` parameter added "for testing"
     would turn the one function that can mint a membership into one anybody could aim, and it would
     still pass every assertion about definer, search_path and grants. */
  const body = fnBlock(MIG, 'create_business');
  assert.match(body, /create or replace function public\.create_business\(p_name text\)\s*\nreturns uuid/,
    'exactly one parameter, and it is the name');
  assert.match(body, /uid uuid := auth\.uid\(\)/, 'the caller is read from the session');
  assert.match(body, /values \(bid, uid\)/,
    'and the membership names the business it just made and the caller — nothing chosen by the request');
});

test('an account that already has a café gets THAT café, and no second one is made', () => {
  /* The contract is "ensure", not "create" — which is what makes a double-tapped button, a retried
     request and a second tab all land on one café instead of raising 23505 from 187's
     one-café-per-person constraint and showing a real person a constraint name.
     The early return has to sit ABOVE both inserts or the constraint is what enforces it. */
  const body = fnBlock(MIG, 'create_business');
  const guard = body.indexOf('if bid is not null then');
  const insert = body.indexOf('insert into public.businesses');
  assert.ok(guard > 0, 'the existing-membership check must exist');
  assert.ok(insert > guard, 'and it must return BEFORE anything is created');
  assert.match(body.slice(guard, insert), /return bid;/, 'returning the café they already have');
});

test('the lock is taken BEFORE the membership is read, or it protects nothing', () => {
  /* ⚠️ THIS IS 191's `for update` LESSON IN THE ONLY FORM AVAILABLE HERE. Two concurrent calls from
     one account both see no membership, both insert a business, and one loses the membership insert
     to the unique constraint — the loser rolls back, so there is no orphan, but the caller gets
     23505 instead of their café on the ordinary double-tap path.
     A lock taken AFTER the read is decoration: both callers have already decided. */
  const body = fnBlock(MIG, 'create_business');
  const lock = body.indexOf('pg_advisory_xact_lock');
  const read = body.indexOf('select m.business_id into bid');
  assert.ok(lock > 0, 'the advisory lock must be taken');
  assert.ok(read > lock, 'and it must be taken before the membership is read');
  assert.match(body, /hashtextextended\('ezplate:create_business:' \|\| uid::text, 0\)/,
    'keyed to the CALLER, so it serialises one account rather than every signup at once');
});

test('an unconfirmed address cannot mint a café', () => {
  /* Email confirmation is on, so an unconfirmed account cannot hold a session and this looks
     redundant. It is here for `claim_business_invite`'s reason: that is a DASHBOARD SETTING, and the
     day somebody turns it off, anyone who can type an address could mint a café with it. A guard
     whose premise lives in a web console is a guard worth writing down. */
  const body = fnBlock(MIG, 'create_business');
  assert.match(body, /u\.email_confirmed_at is not null/);
  const check = body.indexOf('email_confirmed_at');
  assert.ok(check < body.indexOf('insert into public.businesses'),
    'and it refuses before anything is created');
});

test('the founder is asserted to be the OWNER, with `is distinct from`', () => {
  /* ⚠️ NOT `<> 'owner'`. CLAUDE.md: in PL/pgSQL a NULL role makes `if role <> 'owner' then raise`
     never fire, so a guard written that way lets exactly the caller it was written for straight
     through — and a NULL role is precisely what a missing `set_member_role` trigger would produce.
     What the assertion costs if it fires is a rollback and "try again"; what it prevents is a café
     whose creator cannot delete a plate, change the food cost target or invite anybody, with no way
     back except the Supabase dashboard — the exact thing this whole item exists to delete. */
  const body = fnBlock(MIG, 'create_business');
  assert.match(body, /if rl is distinct from 'owner' then\s+raise exception/,
    'the founder assertion must use `is distinct from`, or a NULL role walks past it');
  const assertion = body.indexOf('is distinct from');
  assert.ok(assertion > body.indexOf('insert into public.business_members'),
    'and it must read the row back AFTER the insert, or it is checking nothing');
});

test('anon is not granted execute — in both files', () => {
  /* A caller with no session has no uuid to own a café with, and the body refuses anyway. Granting
     it to anon would add a callable surface that can only ever raise. */
  for (const [label, sql] of BOTH) {
    const i = sql.indexOf('grant execute on function public.create_business(text) to');
    assert.ok(i > 0, `${label} does not grant create_business`);
    const stmt = sql.slice(i, sql.indexOf(';', i));
    assert.ok(!/\banon\b/.test(stmt), `${label}: create_business must not be granted to anon`);
    assert.match(stmt, /\bauthenticated\b/, `${label}: but authenticated must have it`);
    assert.match(sql, /revoke all on function public\.create_business\(text\) from public/,
      `${label}: the default PUBLIC execute must be revoked first`);
  }
});

test('the migration is PURELY ADDITIVE — it creates one function and touches nothing else', () => {
  /* ⚠️ THIS IS THE ASSERTION THAT KEEPS THE ROLLBACK ONE STATEMENT, and it is the property the
     queue item asked for in terms: "do NOT open this by widening the policies on
     businesses/business_members". A plain INSERT policy on `business_members` would let any
     signed-in account write itself a membership row for any business id it can name, which is every
     tenant policy 181-187 undone by one statement — and it would read as a smaller change than this
     function, which is why the temptation is worth a test rather than a sentence. */
  for (const forbidden of [/\bcreate policy\b/, /\balter policy\b/, /\bdrop policy\b/,
    /\balter table\b/, /\bcreate table\b/, /\bdrop table\b/, /\bcreate trigger\b/,
    /\bgrant\s+\w+\s+on\s+table\b/, /\bcreate index\b/]) {
    assert.ok(!forbidden.test(MIG),
      `the migration must not ${forbidden} — it is additive by design and its rollback says so`);
  }
  /* And the rollback it states really is the one statement, named in the header where the only
     audit trail this project has can find it (`list_migrations` is empty). */
  assert.match(MIGRATION, /drop function if exists public\.create_business\(text\);/,
    'the header must state the rollback');
});

/* ── 4. THE MIRROR ────────────────────────────────────────────────────────────────────────────── */

test('the mirror\'s body is BYTE-IDENTICAL to the migration\'s', () => {
  /* `functions_fp` — the mirror's only drift detector — hashes `pg_get_functiondef`, which returns
     the stored source INCLUDING comments. So a body that differs by one explanatory line makes
     re-running 01-schema.sql (step 2 of docs/STAGING.md's procedure, described there as idempotent)
     turn that detector red for a reason that is not drift. Nothing else can notice, because the
     deployed function on both projects comes from the migration rather than from the mirror. This
     is the check 183 had to invent after two days of exactly that. */
  const mig = fnBlock(MIGRATION, 'create_business');
  const mir = fnBlock(MIRROR, 'create_business');
  assert.ok(mig, 'the migration must define create_business');
  assert.ok(mir, 'the mirror must carry create_business');
  assert.equal(mir, mig,
    'create_business differs between the mirror and the migration — copy the whole block, never hand-edit a line');
});

test('the mirror is re-runnable', () => {
  /* docs/STAGING.md re-runs 01-schema.sql before every rehearsal. `create or replace function` is
     idempotent on its own, so there is nothing to guard here — but the GRANT must be present in the
     mirror too, or a fresh staging would have the function and no way to call it, and the
     `grants_fp` half of the fingerprint would disagree with production while `functions_fp` agreed. */
  assert.match(MIR, /create or replace function public\.create_business\(p_name text\)/);
  assert.match(MIR, /grant execute on function public\.create_business\(text\) to authenticated, service_role/);
});

/* ── 5. THE SCREEN IT LIVES ON ────────────────────────────────────────────────────────────────── */

test('the form is on the gate, hidden by default, and hidden by hideForms', () => {
  /* ⚠️ HIDDEN BY DEFAULT IS THE DISCIPLINE OF THIS WHOLE OVERLAY and the first cut of 192's alt link
     left it off — caught by the pre-push review. A toggled element starts hidden and JS decides
     when it does not; the alternative is a claim about the ORDER of two other functions.
     And `hideForms` is the mechanism that keeps every OTHER state of this gate clean: without the
     two lines it gained, a café form would sit over the sign-in screen and over the error screen. */
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /<form class="acct-form" id="bgCafeForm" hidden/, 'the form starts hidden');
  assert.match(html, /<p class="bg-note" id="bgCafeNote" hidden/, 'and so does its warning');
  assert.match(html, /id="bgCafeName"[^>]*maxlength="60"/,
    'the field carries the same maximum the guard does, so the browser stops the 61st character');

  const app = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const hf = app.indexOf('var hideForms=function()');
  const body = app.slice(hf, app.indexOf('};', hf));
  assert.match(body, /cf\.hidden=true/, 'hideForms hides the café form');
  assert.match(body, /cn\.hidden=true/, 'and its warning');
});

test('the warning about one café per account is really on the screen', () => {
  /* ⚠️ IT NAMES A TRAP THE SERVER CANNOT UNDO. 187 made membership one café per person and enforces
     it with a unique constraint; there is no "leave a café" anywhere in this app. So somebody who
     creates one here can never afterwards accept an invitation to somebody else's, and the only
     thing standing between a person and that is this sentence.
     Pinned because copy is the easiest thing in a repo to lose in a redesign, and losing this
     particular sentence costs somebody their access to the café they were invited to. */
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const i = html.indexOf('id="bgCafeNote"');
  const note = html.slice(i, html.indexOf('</p>', i));
  assert.match(note, /one caf/i, 'it says an account belongs to one café');
  assert.match(note, /invited/i, 'and tells an invited person what to do instead');
});

test('the handler cleans ONCE, then checks and sends the same string', () => {
  /* ⚠️ CHECKING `inp.value` AND SENDING `inp.value` WOULD BE TWO READS of a field the user can still
     be editing, so the check would be about a string that is no longer the one going out. This is
     CLAUDE.md's `invUnitRebase` rule at client scale: the guard and the write must resolve the same
     value, and the way to guarantee it is to compute it once.
     Source-level and weak on its own (roster 183a), which is why the behavioural half is
     tests/visual/209-cafe.spec.js — it types a padded name and reads what reached the server. */
  const app = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const i = app.indexOf('function wireGateCreateCafe');
  const fn = app.slice(i, app.indexOf('\nfunction ', i + 10));
  assert.equal((fn.match(/cafeNameClean\(/g) || []).length, 1, 'cleaned exactly once');
  assert.match(fn, /cafeNameProblem\(nm\)/, 'the CLEANED string is what is checked');
  assert.match(fn, /authCreateBusiness\(nm\)/, 'and the cleaned string is what is sent');
  const bad = fn.indexOf('cafeNameProblem(nm)');
  const send = fn.indexOf('authCreateBusiness(nm)');
  assert.ok(bad > 0 && send > bad, 'and it is checked before it is sent');
});
