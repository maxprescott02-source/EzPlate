/*
 * invites.test.js — 191. Invitations, the SERVER half.
 *
 * WHAT THESE CAN AND CANNOT SEE. They read SQL text, so they cannot prove a policy behaves or a
 * function refuses — that needs a database, and it was done: real accounts signed in over PostgREST
 * on staging, an owner, a staff member, a second café's owner, anon, and a member of nothing who
 * claimed an invitation end to end. Those measurements live in the migration's header, which is the
 * only place they can live.
 *
 * What text CAN pin is the handful of one-word edits that would silently undo the whole thing, and
 * that is what each test below is. Two are sharp enough to name up front:
 *
 *   ⚠️ `as restrictive` — a permissive policy with the same body GRANTS instead of restricting and
 *   reads identically. This table carries a permissive `for all` tenant policy, so dropping those
 *   two words from any of the four below would be OR'd with it and take away NOTHING: staff would
 *   read, write and revoke invitations, the SQL would still say 'owner', the policy list would still
 *   show a policy with the right name, and nothing would raise. That is 187's lesson.
 *
 *   ⚠️ `claim_business_invite()` TAKES NO ARGUMENT, and that is the whole of its security. It
 *   derives the address from `auth.uid()`, so there is nothing to point at somebody else's
 *   invitation. Adding a `p_email text` parameter "for testing" would turn a SECURITY DEFINER
 *   function that joins accounts to cafés into one anybody could aim, and it would still pass every
 *   assertion about policies, grants and search_path.
 *
 * ⚠️ AND THE PROSE PROBLEM (CLAUDE.md 183a). Both files EXPLAIN themselves in comments, and the
 * explanations use the very words these assertions look for — "as restrictive", "owner",
 * "email_confirmed_at". A grep over the raw file would fire on the paragraph above rather than on
 * the statement, and the positive half of every such assertion would pass on prose alone. Every
 * assertion here runs over comment-stripped text.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const MIGRATION_FILE = '20260814_invitations.sql';
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const MIGRATION = fs.readFileSync(path.join(MIGRATIONS_DIR, MIGRATION_FILE), 'utf8');
const MIRROR = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'staging', '01-schema.sql'), 'utf8');

/* The quote-aware stripper from tests/semantic-keys.test.js, and it is quote-aware for that file's
   reason: the naive `l.replace(/--.*$/,'')` ate a real line of code in the very migration it was
   pointed at. Nothing here contains a `--` inside a string literal today; copying the safe version
   costs nothing and the unsafe one fails silently. */
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

const MIG = code(MIGRATION);
const MIR = code(MIRROR);
const BOTH = [['the migration', MIG], ['the mirror', MIR]];

/** The `create policy "name" …` statement, up to its terminating semicolon. */
function policyStmt(sql, name) {
  const i = sql.indexOf(`create policy "${name}" on public.business_invites`);
  if (i < 0) return null;
  const j = sql.indexOf(';', i);
  return j > i ? sql.slice(i, j) : null;
}

/**
 * A whole `create or replace function public.<name>(…) … $tag$;` block.
 * The dollar tag is READ rather than assumed — semantic-keys.test.js learned that the hard way when
 * an older migration quoted its body `$$` and the extractor silently returned nothing.
 */
function fnBlock(sql, name) {
  const a = sql.indexOf(`create or replace function public.${name}(`);
  if (a < 0) return null;
  const tag = /\bas\s+(\$[A-Za-z_]*\$)/.exec(sql.slice(a));
  if (!tag) return null;
  const b = sql.indexOf(tag[1] + ';', a + tag.index + tag[0].length);
  if (b < a) return null;
  return sql.slice(a, b + tag[1].length + 1);
}

const RESTRICTED = ['select', 'insert', 'update', 'delete'];

/* ── 1. THE POLICIES ──────────────────────────────────────────────────────────────────────────── */

test('every owner-only policy is RESTRICTIVE — permissive would grant, and read the same', () => {
  for (const cmd of RESTRICTED) {
    for (const [label, sql] of BOTH) {
      const stmt = policyStmt(sql, `business_invites owner-only ${cmd}`);
      assert.ok(stmt, `${label} does not create "business_invites owner-only ${cmd}"`);
      assert.match(stmt, /\bas restrictive\b/,
        `"business_invites owner-only ${cmd}" in ${label} is not RESTRICTIVE — it would be OR'd `
        + 'with the tenant policy and restrict nothing');
    }
  }
});

test('the four restrictions cover EVERY command, which is 187\'s second lesson', () => {
  /* 187 restricted the food cost target across an upsert's two halves and stopped, because the
     frame was "what does my client send" rather than "what are ALL the ways this can change" —
     staff could then DELETE the row outright. The client half of this item will only ever INSERT
     and DELETE invitations, so SELECT and UPDATE are here for the caller nobody wrote.
     Asserted as an EQUALITY on the set, not as four separate presence checks: a fifth command
     cannot be invented, but a fourth can be dropped, and only the set can notice. */
  for (const [label, sql] of BOTH) {
    const found = [...sql.matchAll(/create policy "business_invites owner-only (\w+)"/g)]
      .map((m) => m[1]).sort();
    assert.deepEqual(found, [...RESTRICTED].sort(),
      `${label} restricts ${found.join('/')} — every command a caller can send must be named`);
  }
});

/* ⚠️ THESE TWO CHECKED THE MIGRATION ONLY UNTIL THE PRE-PUSH REVIEW OF THIS BATCH, while every
   other policy test in this file looped over BOTH. That is not a style inconsistency: staging is
   REBUILT from the mirror, so a hand-edit there turning `for insert` into `for all`, or `= 'owner'`
   into `<> 'staff'`, would have left the whole suite green — and the byte-identity test below
   covers the four FUNCTION bodies, not the five policies, so nothing else here would have noticed
   either. Found by reading which variable each assertion closed over. */
test('each restriction names its ONE command, and none of them says `for all`', () => {
  /* `as restrictive for all` is not "restrict everything", it is "require this to READ" — which on
     a tenant table means staff open the app to an empty café. CLAUDE.md names it as the first of
     187's two corollaries. */
  for (const cmd of RESTRICTED) {
    for (const [label, sql] of BOTH) {
      const stmt = policyStmt(sql, `business_invites owner-only ${cmd}`);
      assert.ok(stmt, `${label} does not create the ${cmd} restriction`);
      assert.match(stmt, new RegExp(`for ${cmd}\\b`), `${label}: the ${cmd} restriction must restrict ${cmd}`);
      assert.ok(!/for all\b/.test(stmt),
        `${label}: the ${cmd} restriction covers every command — staff could not even READ, which is not the design`);
    }
  }
});

test('the restrictions are keyed to OWNER, and NULL — no membership — refuses', () => {
  /* `current_business_role() = 'owner'` is NULL for a caller with no membership, and a policy
     evaluating to NULL denies. That is the server's correct default and the exact opposite of the
     client's, which must not lock anyone out when it cannot tell. Pinned because `<> 'staff'` is
     the tempting rewrite and it would let a non-member through. */
  for (const cmd of RESTRICTED) {
    for (const [label, sql] of BOTH) {
      const stmt = policyStmt(sql, `business_invites owner-only ${cmd}`);
      assert.match(stmt, /current_business_role\(\)\) = 'owner'/,
        `${label}: the ${cmd} restriction must require owner outright, not merely "not staff"`);
      assert.ok(!/<>\s*'staff'/.test(stmt),
        `${label}: the ${cmd} restriction reads "not staff", which a caller with NO role also satisfies`);
    }
  }
});

test('the tenant policy is PERMISSIVE — making it restrictive would deny everything', () => {
  /* The mirror image of the test above, and the reason both are here: these two policies sit four
     lines apart, say almost the same words, and need OPPOSITE keywords. The tenant policy is the
     only thing GRANTING access to this table; `as restrictive` on it would AND with the four
     below and leave nobody — not even an owner — able to read a row. */
  for (const [label, sql] of BOTH) {
    const stmt = policyStmt(sql, 'business_invites tenant access');
    assert.ok(stmt, `${label} does not create the tenant policy`);
    assert.ok(!/\bas restrictive\b/.test(stmt),
      `the tenant policy in ${label} is RESTRICTIVE — nothing would grant access to this table at all`);
    assert.match(stmt, /for all to public/);
    assert.match(stmt, /using \(business_id = \(select public\.current_business_id\(\)\)\)/);
    assert.match(stmt, /with check \(business_id = \(select public\.current_business_id\(\)\)\)/);
  }
});

test('RLS is enabled BEFORE every policy on the new table, not merely somewhere in the file', () => {
  /* The opposite order to 20260808_menus_rls.sql, and deliberately: that table was already serving
     rows, so the policy had to exist first. This one is NEW and EMPTY, so the dangerous
     intermediate is "granted but unprotected" and RLS-with-no-policies is the harmless state.
     ⚠️ Compared against EVERY policy create, not the first one — 182(b) was an ordering test that
     compared one named statement against one other and survived a DIFFERENT statement moving
     across the line. */
  const rls = MIG.indexOf('alter table public.business_invites enable row level security');
  assert.ok(rls > 0, 'the migration must enable RLS on business_invites');
  const creates = [...MIG.matchAll(/create policy "business_invites [^"]+"/g)].map((m) => m.index);
  assert.ok(creates.length === 5, 'one tenant policy and four restrictions');
  for (const i of creates) {
    assert.ok(rls < i, 'every policy on business_invites must be created AFTER RLS is enabled');
  }
  /* And the grant comes last of all, for the same reason: a granted table with RLS off is readable
     by anyone holding the anon key, which is everyone — it ships in index.html. */
  const grant = MIG.indexOf('grant select, insert, delete on table public.business_invites');
  assert.ok(grant > rls, 'the table must not be granted to the API roles before RLS protects it');
});

test('no client role may UPDATE an invitation — a policy cannot say that, only a grant can', () => {
  /* ⚠️ FOUND BY THE PRE-PUSH REVIEW. With `grant all`, an owner could PATCH `accepted_at` and
     `accepted_by` on a still-pending invitation and mark it accepted with no membership behind it.
     The restrictive UPDATE policy cannot stop that — a policy decides WHICH ROWS, never which
     columns — and `business_invites_accepted_check` cannot either, because it only sees the row.
     Nothing legitimately edits an invitation: it is created, then claimed by the server or revoked.
     `claim_business_invite` is SECURITY DEFINER, so withholding UPDATE costs it nothing. */
  for (const [label, sql] of BOTH) {
    assert.match(sql, /grant select, insert, delete on table public\.business_invites to anon, authenticated, service_role/,
      `${label} must grant this table exactly select/insert/delete`);
    assert.ok(!/grant all on table public\.business_invites/.test(sql),
      `${label} grants ALL on business_invites — an owner could then mark an invitation accepted by hand`);
  }
  /* And the mirror must not sneak it back via the blanket loop, which is where it used to live. */
  const arr = MIR.slice(MIR.indexOf("foreach t in array array['app_settings'"));
  assert.ok(!arr.slice(0, arr.indexOf('end loop')).includes("'business_invites'"),
    'business_invites is back in the grant-all loop, which re-grants UPDATE');
});

/* ── 2. THE TABLE ─────────────────────────────────────────────────────────────────────────────── */

test('the email is normalised by a trigger and PROVED normalised by a constraint', () => {
  /* The pairing is the design. A BEFORE trigger fires ahead of constraint checking, so the trigger
     is the mechanism and the check is the evidence — and neither can silently stop working while
     the other still does. Losing the trigger makes every insert fail loudly; losing the check
     means a mixed-case address is stored, matches nothing at claim time, and the invitation simply
     never works with no error anywhere. */
  for (const [label, sql] of BOTH) {
    assert.match(sql, /email = lower\(btrim\(email\)\)/,
      `${label} lost the constraint that proves the address was normalised`);
    const trig = sql.indexOf('create trigger stamp_invite');
    assert.ok(trig > 0, `${label} lost the stamping trigger`);
    assert.match(sql.slice(trig, sql.indexOf(';', trig)), /before insert or update on public\.business_invites/,
      `${label}'s stamper must cover UPDATE as well — an address can be edited into the wrong case`);
    assert.match(fnBlock(sql, 'stamp_invite'), /new\.email := lower\(btrim\(coalesce\(new\.email, ''\)\)\)/,
      `${label}'s stamper must be the thing that normalises`);
  }
  /* The claim looks the address up already-lowered, so the two halves have to agree about what
     "normalised" means. One definition, used in three places. */
  assert.match(fnBlock(MIG, 'claim_business_invite'), /lower\(btrim\(u\.email\)\)/);
  assert.match(fnBlock(MIG, 'invite_pending'), /lower\(btrim\(coalesce\(p_email, ''\)\)\)/);
});

test('the pending-invite key is PARTIAL, or an accepted invitation blocks re-inviting forever', () => {
  for (const [label, sql] of BOTH) {
    const i = sql.indexOf('business_invites_pending_uk');
    assert.ok(i > 0, `${label} lost the pending-invite unique index`);
    const stmt = sql.slice(i, sql.indexOf(';', i));
    assert.match(stmt, /\(business_id, email\)/);
    assert.match(stmt, /where accepted_at is null/,
      `${label}'s pending key is not partial — an owner could never re-invite someone who had left`);
  }
});

test('business_id is decided by the SERVER, by one function reached two ways', () => {
  /* CLAUDE.md: a DEFAULT and a BEFORE trigger on one column are one mechanism with two entry
     points and must compute the SAME value. 182 measured what happens when they disagree — the
     column carried a literal naming the legacy café, the trigger filled only nulls and correctly
     did nothing, and every other tenant was refused 42501 on its own insert. So the assertion is
     not "there is a default" but "the default is the FUNCTION". */
  for (const [label, sql] of BOTH) {
    assert.match(sql, /business_id {2}uuid not null default public\.current_business_id\(\)/,
      `${label}'s business_id default must be the function, never a literal uuid`);
    const trig = sql.indexOf('create trigger set_business_id\n  before insert or update on public.business_invites');
    assert.ok(trig > 0, `${label} lost the set_business_id trigger on business_invites`);
  }
  /* And nothing in the migration hands the tenant to the client to supply. */
  assert.ok(!/business_id.*:=.*'[0-9a-f]{8}-/.test(MIG), 'no literal tenant uuid may appear');
});

test('who SENT an invitation is stamped by the server, and a DEFAULT alone would not do it', () => {
  /* ⚠️ BOTH HALVES, AND THE SECOND ONE WAS FOUND BY MEASURING RATHER THAN READING. The first cut
     left the column bare and every invite created over PostgREST came back `invited_by: null`. The
     second added the DEFAULT — and an owner posting an explicit `"invited_by":"<somebody else>"`
     had it stored verbatim, because a DEFAULT only fires when the column is ABSENT from the
     INSERT. That is CLAUDE.md's law read in the other direction, and its stated remedy is a BEFORE
     trigger, with the two entry points computing the SAME value.
     So the assertion is not "there is a default" — that is the half that passed while the column
     was spoofable. */
  for (const [label, sql] of BOTH) {
    assert.match(sql, /invited_by {3}uuid default auth\.uid\(\)/,
      `${label}: invited_by must default to the session`);
    const body = fnBlock(sql, 'stamp_invite');
    assert.match(body, /new\.invited_by := auth\.uid\(\)/,
      `${label}: a DEFAULT does not fire when the caller SENDS the column — the trigger must overwrite it`);
    assert.match(body, /new\.invited_by := old\.invited_by/,
      `${label}: an UPDATE must not be able to rewrite who handed out a key`);
    assert.match(body, /if tg_op = 'INSERT' then/,
      `${label}: the two branches are what make insert stamp and update freeze`);
  }
});

/* ── 3. THE FUNCTIONS ─────────────────────────────────────────────────────────────────────────── */

test('claim_business_invite takes NO argument — that is the whole of its security', () => {
  /* It is SECURITY DEFINER and inserts into `business_members`, a table no client may write. What
     stops it being aimed at somebody else is that there is nothing to aim: the address comes from
     `auth.uid()`. A `p_email` parameter would leave every other assertion in this file green. */
  for (const [label, sql] of BOTH) {
    assert.match(sql, /create or replace function public\.claim_business_invite\(\)/,
      `${label}'s claim function takes a parameter — it can now be pointed at another person's invitation`);
  }
  const body = fnBlock(MIG, 'claim_business_invite');
  assert.match(body, /uid uuid := auth\.uid\(\)/, 'the caller is auth.uid(), never an argument');
  assert.match(body, /from auth\.users u\s+where u\.id = uid/,
    'the address is read from the caller\'s own auth.users row');
});

test('the claim refuses on an UNCONFIRMED address, a SECOND café, and no session', () => {
  const body = fnBlock(MIG, 'claim_business_invite');
  /* Confirmation is a dashboard SETTING, not a property of this schema. Today an unconfirmed
     account cannot hold a session at all, which makes this look redundant; the day somebody turns
     Auto Confirm on, an invitation becomes claimable by anyone who can type the address. */
  assert.match(body, /u\.email_confirmed_at is not null/,
    'an unconfirmed address must not be able to claim an invitation');
  /* One café per person is 187's decision and its unique constraint. Returning early rather than
     letting that constraint raise is what makes "you already have a café" answer nothing-to-claim
     instead of an error the client would have to decode. */
  assert.match(body, /if exists \(select 1 from public\.business_members m where m\.user_id = uid\) then\s+return null;/,
    'an account that already has a café must return early, not fall through to the insert');
  assert.match(body, /if uid is null then\s+return null;/, 'no session, nothing to claim');
  /* And the invitation it consumes must still be pending, or an accepted one could be replayed. */
  assert.match(body, /i\.accepted_at is null/);
  assert.match(body, /set accepted_at = now\(\), accepted_by = uid/,
    'a claimed invitation must be marked, or it stays claimable');
});

test('the claim LOCKS the invitation it is about to consume', () => {
  /* ⚠️ FOUND BY THE PRE-PUSH REVIEW, and it is the sharpest thing in this file. Without `for
     update` the SELECT and the UPDATE are two statements with two snapshots. Under READ COMMITTED
     a revoke committing between them leaves the UPDATE matching ZERO rows — while the membership
     INSERT has already run and the function still returns the café's id. A revoke landing mid-claim
     would not have stopped the join; it would have produced a member with no invitation behind
     them, on the SUCCESS path, silently. And the client half calls this from the tenant gate on
     every boot of a memberless account, so the window is on an ordinary path.
     The lock also settles the concurrent double-claim: the second caller waits, re-reads under the
     lock, sees `accepted_at` is no longer null, and returns null instead of raising 23505. */
  for (const [label, sql] of BOTH) {
    const body = fnBlock(sql, 'claim_business_invite');
    assert.match(body, /limit 1\s+for update;/,
      `${label}: the invitation must be locked between being read and being marked accepted`);
  }
});

test('the claim REFUSES to leave a membership with no invitation behind it', () => {
  /* The companion to the lock, and deliberately unreachable while the lock is there. Its job is
     that a later edit removing `for update` fails LOUDLY — the raise rolls the membership insert
     back — rather than going quiet again. CLAUDE.md's standing complaint is that a successful
     write which touched nothing is the failure signal nobody checks; this checks it. */
  for (const [label, sql] of BOTH) {
    const body = fnBlock(sql, 'claim_business_invite');
    assert.match(body, /get diagnostics n = row_count;/,
      `${label}: the accept UPDATE must report how many rows it touched`);
    assert.match(body, /if n <> 1 then\s+raise exception/,
      `${label}: anything other than exactly one row must abort the claim, not return success`);
  }
});

test('the claim writes nothing the CALLER chose', () => {
  /* Every column of the new membership comes from the matched invitation or from auth.uid(). If
     the role ever came from anywhere else, an invited staff member could arrive as an owner. */
  const body = fnBlock(MIG, 'claim_business_invite');
  assert.match(body, /values \(inv\.business_id, uid, inv\.role\)/,
    'the membership is derived entirely from the invitation and the session');
});

test('every SECURITY DEFINER function pins its search_path', () => {
  /* A mutable search_path on a definer function is an escalation path, and the Supabase linter
     flags it. Every object each of them touches is schema-qualified for the same reason. */
  for (const name of ['invite_pending', 'claim_business_invite', 'business_team']) {
    for (const [label, sql] of BOTH) {
      const body = fnBlock(sql, name);
      assert.ok(body, `${label} does not define ${name}`);
      assert.match(body, /security definer/, `${name} in ${label} must be SECURITY DEFINER`);
      assert.match(body, /set search_path = ''/, `${name} in ${label} must pin search_path`);
    }
  }
});

test('business_team is owner-only AND tenant-scoped — both, not either', () => {
  /* Dropping the role half leaks every colleague's email address to a staff account; dropping the
     tenant half leaks another café's members to an owner. They are separate failures and the
     function needs both clauses. */
  const body = fnBlock(MIG, 'business_team');
  assert.match(body, /m\.business_id = \(select public\.current_business_id\(\)\)/,
    'business_team must be scoped to the caller\'s own café');
  assert.match(body, /\(select public\.current_business_role\(\)\) = 'owner'/,
    'business_team must be owner-only');
});

test('the grants match what each function is FOR', () => {
  /* `invite_pending` is asked by a signed-OUT visitor at the sign-up form, so anon must have it.
     The other two act on `auth.uid()`, which anon does not have — granting them to anon would add
     a callable surface that can only ever answer null. */
  for (const [label, sql] of BOTH) {
    assert.match(sql, /grant execute on function public\.invite_pending\(text\) to anon, authenticated, service_role/,
      `${label}: the sign-up gate is asked before anyone is signed in`);
    for (const name of ['claim_business_invite()', 'business_team()']) {
      const i = sql.indexOf(`grant execute on function public.${name} to`);
      assert.ok(i > 0, `${label} does not grant ${name}`);
      const stmt = sql.slice(i, sql.indexOf(';', i));
      assert.ok(!/\banon\b/.test(stmt), `${label}: ${name} must not be granted to anon`);
      assert.match(stmt, /\bauthenticated\b/);
    }
  }
});

/* ── 4. THE MIRROR ────────────────────────────────────────────────────────────────────────────── */

test('the mirror\'s four function bodies are BYTE-IDENTICAL to the migration\'s', () => {
  /* `functions_fp` — the mirror's only drift detector — hashes `pg_get_functiondef`, which returns
     the stored source INCLUDING comments. So a body that differs by one explanatory line makes
     re-running 01-schema.sql (step 2 of docs/STAGING.md's procedure, and described there as
     idempotent) turn that detector red for a reason that is not drift. Nothing else can notice,
     because the deployed function on both projects comes from the migration rather than from the
     mirror. This is the check 183 had to invent after two days of exactly that. */
  for (const name of ['stamp_invite', 'invite_pending', 'claim_business_invite', 'business_team']) {
    const mig = fnBlock(MIGRATION, name);
    const mir = fnBlock(MIRROR, name);
    assert.ok(mig, `the migration must define ${name}`);
    assert.ok(mir, `the mirror must carry ${name}`);
    assert.equal(mir, mig,
      `${name} differs between the mirror and the migration — copy the whole block, never hand-edit a line`);
  }
});

test('the mirror is re-runnable — every new object is idempotent', () => {
  /* docs/STAGING.md calls 01-schema.sql idempotent and step 2 of the migration procedure re-runs it
     before every rehearsal. A bare `create table` or `create policy` here would raise on the second
     run and abort the rest of the file, which is a broken mirror rather than a broken test. The
     MIGRATION is deliberately NOT idempotent — it runs once, against a database that does not have
     this table, and a bare create is how it says so. */
  assert.match(MIR, /create table if not exists public\.business_invites/);
  assert.match(MIR, /create unique index if not exists business_invites_pending_uk/);
  assert.match(MIR, /create index if not exists business_invites_email_idx/);
  for (const name of ['business_invites tenant access', 'business_invites owner-only select',
    'business_invites owner-only insert', 'business_invites owner-only update',
    'business_invites owner-only delete']) {
    assert.ok(MIR.includes(`drop policy if exists "${name}" on public.business_invites`),
      `the mirror must drop "${name}" before creating it, or a re-run raises`);
  }
  for (const t of ['stamp_invite', 'set_business_id']) {
    assert.ok(MIR.includes(`drop trigger if exists ${t} on public.business_invites`),
      `the mirror must drop the ${t} trigger before creating it`);
  }
  assert.match(MIR, /grant select, insert, delete on table public\.business_invites/,
    'the mirror must grant the table to the API roles, or PostgREST cannot see it at all');
});

/* ── 5. THE BOUNDARY — invitations are not café CONTENT ───────────────────────────────────────── */

test('restore_backup writes exactly the eight tables it always did — invites are not one', () => {
  /* An invitation is membership state, the same class as `business_members` and `businesses`,
     neither of which is in a backup either. Restoring last week's file must not revoke an
     invitation sent yesterday nor resurrect one that was revoked.
     ⚠️ Asserted as an EQUALITY on the set of tables the function writes, not as "business_invites
     does not appear". 190's lesson: a denylist assertion is a guess about every wrong value there
     could be, and this one would also pass if the whole function were deleted. */
  const body = fnBlock(MIR, 'restore_backup');
  assert.ok(body, 'the mirror must carry restore_backup');
  const touched = new Set([...body.matchAll(/(?:delete from|insert into)\s+(\w+)/g)].map((m) => m[1]));
  assert.deepEqual([...touched].sort(), [
    'app_settings', 'ing_price_history', 'ingredients', 'menu_change_log',
    'menu_items', 'menus', 'plates', 'supplier_phrases',
  ], 'restore_backup writes a different set of tables than it did — is that deliberate?');
});
