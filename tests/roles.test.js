/*
 * roles.test.js — 187. Owner vs staff, enforced in the database.
 *
 * WHAT THESE CAN AND CANNOT SEE. They read SQL text, so they cannot prove a policy behaves — that
 * needs a database, and it was done: a real staff account signed in over PostgREST on staging was
 * refused all four restricted operations and allowed everything else, with the owner unaffected.
 * The measurements are in the migration's header, which is the only place they can live.
 *
 * What text CAN pin is the handful of one-word edits that would silently undo the whole thing, and
 * that is what each test below is. The sharpest is `as restrictive`:
 *
 *   ⚠️ A PERMISSIVE POLICY WITH THE SAME BODY GRANTS INSTEAD OF RESTRICTING, AND READS IDENTICALLY.
 *   Permissive policies are OR'd together. Each of these tables already carries a permissive `for
 *   all` tenant policy, so `create policy … for delete using (role = 'owner')` — the same words with
 *   one dropped — would be OR'd with it and change NOTHING: staff would delete plates again, the SQL
 *   would still say "owner", and no test that only greps for the condition could tell.
 *   Two words, no error, no visible difference. That is the defect this file exists for.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const MIGRATION = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260814_roles_part1.sql'), 'utf8');
const MIRROR = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'staging', '01-schema.sql'), 'utf8');

/* Both files state their reasoning in comments, and the reasoning names the very things these
   assertions look for — "as restrictive", "food_cost_target", "owner". CLAUDE.md 183(a): an
   assertion that greps a file is searching PROSE as well as code, and the prose is written by the
   same person in the same hour saying the same words. So: executable text only. */
const code = (sql) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const MIG = code(MIGRATION);
const MIR = code(MIRROR);

const RESTRICTED = [
  { policy: 'plates owner-only delete', table: 'plates', cmd: 'delete' },
  { policy: 'menus owner-only delete', table: 'menus', cmd: 'delete' },
  { policy: 'app_settings owner-only target insert', table: 'app_settings', cmd: 'insert' },
  { policy: 'app_settings owner-only target update', table: 'app_settings', cmd: 'update' },
];

/* ── The one-word edits ───────────────────────────────────────────────────────────────────────── */

test('every restriction is RESTRICTIVE — permissive would grant, and read the same', () => {
  for (const { policy } of RESTRICTED) {
    for (const [label, sql] of [['the migration', MIG], ['the mirror', MIR]]) {
      const i = sql.indexOf(`create policy "${policy}"`);
      assert.ok(i > -1, `${label} does not create "${policy}"`);
      // the clause sits between the policy name and its `using`/`with check`
      const head = sql.slice(i, sql.indexOf(';', i));
      assert.match(head, /\bas restrictive\b/,
        `"${policy}" in ${label} is not RESTRICTIVE — it would be OR'd with the tenant policy and restrict nothing`);
    }
  }
});

test('each restriction names the command it restricts, and only that one', () => {
  /* `for all` here would be a different bug in the same family: a restrictive policy over ALL
     commands would require ownership to READ, so staff would open the app to an empty café. */
  for (const { policy, cmd } of RESTRICTED) {
    const i = MIG.indexOf(`create policy "${policy}"`);
    const head = MIG.slice(i, MIG.indexOf(';', i));
    assert.match(head, new RegExp(`for ${cmd}\\b`), `"${policy}" must restrict ${cmd}`);
    assert.ok(!/for all\b/.test(head),
      `"${policy}" restricts every command — staff could not even READ, which is not the decision`);
  }
});

test('the role is compared for equality with owner, never merely for existence', () => {
  /* `is not null` instead of `= 'owner'` is the third one-word inversion: it reads as a role check
     and admits every member of the café, which is exactly who it is meant to exclude. */
  for (const { policy } of RESTRICTED) {
    const i = MIG.indexOf(`create policy "${policy}"`);
    const head = MIG.slice(i, MIG.indexOf(';', i));
    assert.match(head, /current_business_role\(\)\) = 'owner'/,
      `"${policy}" must compare the role to 'owner'`);
    assert.ok(!/current_business_role\(\)\)? is not null/.test(head),
      `"${policy}" admits any member, not only an owner`);
  }
});

test('the target restriction covers BOTH halves of the upsert', () => {
  /* `dbSetSetting` upserts, so the write is an INSERT that may become an UPDATE. Whichever half the
     row's existence selects is the half that must refuse — covering one leaves the restriction
     reachable on a database where that row happens to exist, or happens not to. */
  const insert = MIG.indexOf('create policy "app_settings owner-only target insert"');
  const update = MIG.indexOf('create policy "app_settings owner-only target update"');
  assert.ok(insert > -1 && update > -1, 'both halves must exist');
  const upd = MIG.slice(update, MIG.indexOf(';', update));
  assert.match(upd, /using \(/, 'the update policy needs a USING — it decides which rows may be touched');
  assert.match(upd, /with check \(/, 'and a WITH CHECK — it decides what they may become');
});

test('the target policies name the key, so nothing else in app_settings is restricted', () => {
  // kitchen words, the AI toggles and the GST default live in the same table and stay staff-writable.
  for (const policy of ['app_settings owner-only target insert', 'app_settings owner-only target update']) {
    const i = MIG.indexOf(`create policy "${policy}"`);
    const head = MIG.slice(i, MIG.indexOf(';', i));
    assert.match(head, /key <> 'food_cost_target' or /,
      `"${policy}" must let every OTHER setting through, or staff cannot save a kitchen word`);
  }
});

/* ── The column, and the one mechanism that fills it ──────────────────────────────────────────── */

test('the role column has NO default — the trigger is the only entry point', () => {
  /* CLAUDE.md's law, and this is the case that proves why it is a law rather than a preference: a
     DEFAULT fires when the column is ABSENT, so it would make the value non-null before the trigger
     ever ran, and `set_member_role`'s "if new.role is null" would correctly do nothing. Every new
     member would then get the default — and no default can answer "is this the first member of this
     business?", because a DEFAULT cannot see the row. */
  const add = MIG.slice(MIG.indexOf('add column if not exists role'), MIG.indexOf('add column if not exists role') + 120);
  assert.ok(!/default/i.test(add), 'the role column must not carry a DEFAULT: ' + add);
  assert.ok(!/alter column role set default/i.test(MIG), 'and none may be added afterwards');
});

test('the first member of a business is its OWNER, and everyone after is staff', () => {
  const fn = MIG.slice(MIG.indexOf('function public.set_member_role'), MIG.indexOf('drop trigger if exists set_member_role'));
  // the existence check decides, and the branches must not be the wrong way round
  const exists = fn.indexOf('if exists (select 1 from public.business_members');
  const staff = fn.indexOf("new.role := 'staff'");
  const owner = fn.indexOf("new.role := 'owner'");
  assert.ok(exists > -1 && staff > exists && owner > staff,
    'the business-already-has-members branch must yield staff, and the else branch owner');
  assert.match(fn, /if new\.role is null then/,
    'an explicitly supplied role must win — this fills a gap, it does not overrule a caller');
});

test('the trigger is BEFORE INSERT and SECURITY DEFINER', () => {
  const fn = MIG.slice(MIG.indexOf('function public.set_member_role'), MIG.indexOf('current_business_role'));
  assert.match(fn, /security definer/,
    'as INVOKER the existence check reads a table with RLS, so a caller who cannot see the other members would be made an owner');
  assert.match(fn, /set search_path = ''/,
    'a mutable search_path on a definer function is an escalation path, not a linter warning');
  assert.match(MIG, /before insert on public\.business_members/,
    'AFTER INSERT would be too late — the row is already written, and the NOT NULL would have refused it');
});

/* ── Which role am I ──────────────────────────────────────────────────────────────────────────── */

test('current_business_role reads the row current_business_id already picked', () => {
  /* Two functions each choosing "your membership" independently is two definitions of one thing —
     the defect 182 spent an afternoon on. If this one grew its own `order by`, a person with two
     memberships could get one café's id and the other café's role. The unique constraint below
     makes that unreachable today; this makes it wrong to write. */
  const fn = MIG.slice(MIG.indexOf('function public.current_business_role'), MIG.indexOf('revoke all on function'));
  assert.match(fn, /m\.business_id = \(select public\.current_business_id\(\)\)/,
    'it must defer to current_business_id, not re-derive which membership is yours');
  assert.ok(!/order by/.test(fn), 'a second ordering here is a second definition of the same choice');
  assert.match(fn, /security definer/);
  assert.match(fn, /set search_path = ''/);
});

test('one café per person, and the constraint is what says so', () => {
  assert.match(MIG, /add constraint business_members_one_business_per_user\s*\n?\s*unique \(user_id\)/,
    'the delegated decision is enforced by a constraint, not by a convention');
  assert.match(MIR, /business_members_one_business_per_user/, 'and the mirror carries it too');
});

test('the role column is constrained to the two roles that were decided', () => {
  assert.match(MIG, /check \(role in \('owner','staff'\)\)/,
    "Max decided TWO roles; a third would arrive as data with nothing to stop it");
});

/* ── The restore ──────────────────────────────────────────────────────────────────────────────── */

test('the restore refuses a non-owner BEFORE it deletes anything', () => {
  /* Everything in that function deletes five tables before inserting, so a guard anywhere below the
     first statement is a guard on an already-emptied database. */
  const body = MIG.slice(MIG.indexOf('as $fn$', MIG.indexOf('function public.restore_backup')));
  const guard = body.indexOf('only an owner may restore a backup');
  const firstDelete = body.indexOf('delete from');
  const formatCheck = body.indexOf('unsupported payload format');
  assert.ok(guard > -1, 'the restore must check the role at all');
  assert.ok(guard < firstDelete, 'the guard must precede every delete');
  assert.ok(guard < formatCheck, 'and be the first thing the function does');
});

test('the restore guard treats NULL as not-an-owner', () => {
  /* `<> 'owner'` against a NULL role yields NULL, the `if` does not fire, and a caller with no
     membership at all would fall straight through into the deletes. `is distinct from` is the
     difference between a guard and a decoration. */
  const body = MIG.slice(MIG.indexOf('as $fn$', MIG.indexOf('function public.restore_backup')));
  const line = body.slice(body.indexOf('if (select public.current_business_role())'), body.indexOf('only an owner may restore'));
  assert.match(line, /is distinct from 'owner'/, 'got: ' + line);
  assert.ok(!/<>\s*'owner'/.test(line), "`<> 'owner'` lets a NULL role through");
});

/* ── The mirror ───────────────────────────────────────────────────────────────────────────────── */

test('the mirror carries every piece, so a rebuilt staging is not silently permissive', () => {
  /* A staging rebuilt without these would rehearse a database production does not have — and the
     thing it would rehearse is staff being able to do everything, which is the failure this batch
     exists to prevent. */
  for (const piece of ['set_member_role', 'current_business_role', 'business_members_role_check']) {
    assert.ok(MIR.includes(piece), `the mirror is missing ${piece}`);
  }
  for (const { policy } of RESTRICTED) {
    assert.ok(MIR.includes(`create policy "${policy}"`), `the mirror is missing "${policy}"`);
  }
});

test('the mirror adds the role column the way it adds business_id, not in the create table', () => {
  /* `create table if not exists` SKIPS an existing table, so a column declared inside it never
     reaches a staging that already exists — the mirror would look right and be short of a column.
     The ten business_id columns are added this way for the same reason. */
  assert.match(MIR, /alter table public\.business_members add column if not exists role text/);
  const create = MIR.slice(MIR.indexOf('create table if not exists public.business_members'),
    MIR.indexOf('create index if not exists business_members_user_id_idx'));
  assert.ok(!/\brole\b/.test(create),
    'the column must not be declared inside the create table — an existing staging would never get it');
});
