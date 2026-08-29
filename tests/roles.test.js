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

/* ⚠️ 219 — THE RESTORE GUARD IS NO LONGER READ OUT OF THE FILE ABOVE, AND THIS IS THE FINDING THAT
   MADE THAT NECESSARY RATHER THAN TIDY.
   `20260814_roles_part1.sql` is a historical record: it says what batch 187 did on the day it ran,
   and it will contain the owner guard forever whatever the database holds. Batch 219 then replaced
   `restore_backup` again, built its body from `20260813_semantic_keys.sql` (the migration the queue
   item named) rather than from 187 (the migration that actually came last) — and **dropped the owner
   guard entirely**. Every assertion below stayed GREEN, because they were reading a superseded file.
   The function that shipped let any staff member wipe and replace the whole catalogue.
   Caught by the pre-push review, not by this suite.
   **A pin against a NAMED migration is a pin against a name.** The two restore tests now read
   whichever migration LAST defines the function, so the next batch to replace it gets the check for
   free — the same fix `tests/restore.test.js` and `tests/semantic-keys.test.js` already carry, which
   is exactly why the gap here is worth a paragraph: two files had learned this lesson and the third,
   holding the only security-critical assertion of the three, had not. */
const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const RESTORE_SIG = 'create or replace function public.restore_backup(payload jsonb)';
function newestRestoreMigration() {
  // Filenames are datestamped, so a plain sort is oldest-first.
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
    .sort().filter((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8').includes(RESTORE_SIG));
  assert.ok(files.length >= 2, 'the function has been replaced more than once; that history is the point');
  return files[files.length - 1];
}
const NEWEST_RESTORE = newestRestoreMigration();
const RESTORE_MIGRATION = fs.readFileSync(path.join(MIGRATIONS_DIR, NEWEST_RESTORE), 'utf8');

/* Both files state their reasoning in comments, and the reasoning names the very things these
   assertions look for — "as restrictive", "food_cost_target", "owner". CLAUDE.md 183(a): an
   assertion that greps a file is searching PROSE as well as code, and the prose is written by the
   same person in the same hour saying the same words. So: executable text only. */
const code = (sql) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const MIG = code(MIGRATION);
const MIR = code(MIRROR);
const RESTORE = code(RESTORE_MIGRATION);   // 219: the newest definition, not 187's record of one

const RESTRICTED = [
  { policy: 'plates owner-only delete', table: 'plates', cmd: 'delete' },
  { policy: 'menus owner-only delete', table: 'menus', cmd: 'delete' },
  { policy: 'app_settings owner-only target insert', table: 'app_settings', cmd: 'insert' },
  { policy: 'app_settings owner-only target update', table: 'app_settings', cmd: 'update' },
  { policy: 'app_settings owner-only target delete', table: 'app_settings', cmd: 'delete' },
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

test('a VALUE-keyed restriction covers EVERY command that can change that value', () => {
  /* ⚠️ THIS TEST REPLACED ONE CALLED "the target restriction covers BOTH halves of the upsert",
     WHICH PASSED WHILE THE RESTRICTION WAS BROKEN. `dbSetSetting` upserts, so I checked INSERT and
     UPDATE, found both, and stopped — the frame was "an upsert has two halves" and DELETE is not
     part of an upsert.
     The pre-push review found it and it was REPRODUCED as a real staff account on staging:
     `DELETE /app_settings?key=eq.food_cost_target` returned HTTP 200 with the row, and the target
     was gone. The client then boots on its hardcoded default with nothing raised anywhere, which
     moves every suggested price in the app.
     THE GENERAL SHAPE, which is why this test is written as an enumeration rather than a third
     assertion: the other three restrictions name a COMMAND on a table, so "restrict delete" is the
     whole of it. This one names a VALUE — `key = 'food_cost_target'` — and a value can be written,
     rewritten OR REMOVED. Enumerating the commands is the only form of this test that cannot miss
     the next one. */
  const commands = ['insert', 'update', 'delete'];
  for (const cmd of commands) {
    const name = `app_settings owner-only target ${cmd}`;
    const i = MIG.indexOf(`create policy "${name}"`);
    assert.ok(i > -1,
      `no restrictive ${cmd.toUpperCase()} policy on app_settings — a staff account can reach the target through it`);
    const head = MIG.slice(i, MIG.indexOf(';', i));
    assert.match(head, /\bas restrictive\b/, `"${name}" must be restrictive`);
    assert.match(head, /key <> 'food_cost_target' or /, `"${name}" must let every other setting through`);
    assert.ok(MIR.includes(`create policy "${name}"`), `the mirror is missing "${name}"`);
  }
  // and the update half needs both sides: USING judges the old row, WITH CHECK the new one — which
  // is what stops a staff account RENAMING another key to food_cost_target.
  const update = MIG.indexOf('create policy "app_settings owner-only target update"');
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
     first statement is a guard on an already-emptied database.
     219: read from the NEWEST definition — see the note at RESTORE_MIGRATION. Measured on staging
     the day the guard was put back: a signed-in `staff` account was refused P0001 on BOTH a populated
     payload AND an empty-groups one (the shape that would otherwise reach the deletes), while the
     owner's restore still returned 200. */
  const body = RESTORE.slice(RESTORE.indexOf('as $fn$', RESTORE.indexOf('function public.restore_backup')));
  const guard = body.indexOf('only an owner may restore a backup');
  const firstDelete = body.indexOf('delete from');
  const formatCheck = body.indexOf('unsupported payload format');
  assert.ok(guard > -1, 'the restore must check the role at all');
  assert.ok(guard < firstDelete, 'the guard must precede every delete');
  assert.ok(guard < formatCheck, 'and be the first thing the function does');
});

test('219: the restore tests read the NEWEST definition, and the MIRROR carries the guard too', () => {
  /* The guard on the guard, and each half failed independently in batch 219's first draft.
     - NEWEST: if this file ever again names a superseded migration, the two tests around it go quiet
       rather than red. Quiet is what let a staff account wipe a catalogue.
     - MIRROR: `supabase/staging/01-schema.sql` is what a rebuilt staging is restored from, so a
       mirror without the guard would rehearse a permission model production does not have — and
       every rehearsal after that would agree with the wrong answer. */
  const defs = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'))
    .sort().filter((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8').includes(RESTORE_SIG));
  assert.strictEqual(NEWEST_RESTORE, defs[defs.length - 1],
    'the restore role tests must read the newest migration that defines restore_backup');
  const mirrorBody = MIR.slice(MIR.indexOf('as $fn$', MIR.indexOf('function public.restore_backup')));
  const mGuard = mirrorBody.indexOf('only an owner may restore a backup');
  assert.ok(mGuard > -1, 'the mirror must carry the owner guard');
  assert.ok(mGuard < mirrorBody.indexOf('delete from'), 'and it must precede every delete there too');
});

test('the restore guard treats NULL as not-an-owner', () => {
  /* `<> 'owner'` against a NULL role yields NULL, the `if` does not fire, and a caller with no
     membership at all would fall straight through into the deletes. `is distinct from` is the
     difference between a guard and a decoration. */
  const body = RESTORE.slice(RESTORE.indexOf('as $fn$', RESTORE.indexOf('function public.restore_backup')));
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
