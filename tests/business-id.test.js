/* business_id — PART 1, the additive half (batch 181).
 *
 * WHAT THIS FILE IS FOR, because it is not obvious from the name.
 *
 * Part 1 added a `business_id` column to all ten public tables. Its whole claim is that it changes
 * NOTHING the client can see, and that claim rests on exactly two properties of js/app.js:
 *
 *   1. Every read crosses a boundary mapper that names its fields, so a column the client does not
 *      know about cannot reach memory. That is what makes it true that `stamp.format` stays 3 —
 *      CLAUDE.md hard rule 9 says any change to what bootstrapSync puts in memory IS a change to the
 *      backup format, and `buildBackup` dumps live objects verbatim. If a mapper ever started
 *      spreading the row, 412 products would silently gain a `business_id` key in every export and
 *      the format would have changed without the exporter being touched.
 *
 *   2. Every write names its columns, so the client never sends `business_id` and can never clear it.
 *      The server decides the tenant — which is the whole point, and is what Part 2's policies will
 *      rely on.
 *
 * Both are pinned here against the REAL extracted functions rather than copies, per CLAUDE.md's
 * twelve-incident rule: a stub written from the same belief as the code passes against the defect it
 * was written to catch.
 *
 * Every assertion below was checked by BREAKING the thing it names and watching it go red.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// The read boundary: every mapper standing between a Supabase row and memory.
const READERS = [
  'rowToIngredient', 'rowToPlate', 'rowToMenu', 'rowToMenuRecord',
  'rowToChange', 'rowToSupplierPhrase', 'rowToPoint', 'rowsToSeries',
];
// The write boundary: every mapper standing between memory and a Supabase row.
const WRITERS = [
  'ingredientToRow', 'plateToRow', 'menuToRow', 'menuRecordToRow',
  'changeToRow', 'supplierPhraseToRow', 'pointToRow',
];

// eslint-disable-next-line no-new-func
const API = new Function(`"use strict";
  ${READERS.concat(WRITERS).map((n) => extractFn(SRC, n)).join('\n')}
  return { ${READERS.concat(WRITERS).join(', ')} };
`)();

const BIZ = '00000000-0000-0000-0000-000000000001';

/* A row of each shape, carrying business_id exactly as PostgREST now returns it. Fields are the real
   column names, so a mapper that reads them gets sensible values and the only surprise is the tenant
   column — which is the point. */
const ROWS = {
  rowToIngredient: { id: 'P0001', description: 'Flour', base_unit: 'g', cost_per_base_unit: 1.5, business_id: BIZ },
  rowToPlate: { id: 'SP1', name: 'Toastie', lines: [], category: 'Lunch', business_id: BIZ },
  rowToMenu: { id: 'um1', name: 'Toastie', price: 12, menu_id: 'MENU_ORIGINAL', plate_id: 'SP1', business_id: BIZ },
  rowToMenuRecord: { id: 'MENU_ORIGINAL', name: 'Original menu', season: null, business_id: BIZ },
  rowToChange: { id: 'CL1', recorded_at: '2026-08-13T00:00:00Z', kind: 'dish_price', menu_ids: [], business_id: BIZ },
  rowToSupplierPhrase: { id: 'k', supplier: 'Bidfood', phrase_norm: 'p', qty: 1, unit: 'kg', business_id: BIZ },
};

test('READ BOUNDARY: no mapper carries business_id into memory', () => {
  Object.keys(ROWS).forEach((name) => {
    const out = API[name](ROWS[name]);
    assert.ok(out, `${name} returned nothing for a valid row`);
    assert.ok(!('business_id' in out),
      `${name} let business_id through into memory — buildBackup dumps these objects verbatim, so ` +
      'every export would silently gain the column and stamp.format would be a lie');
    // ...and it did not smuggle it in under a camelCase alias either.
    assert.ok(!('businessId' in out), `${name} carried businessId into memory`);
  });
});

test('READ BOUNDARY: the point mappers ignore it too', () => {
  const pt = API.rowToPoint({ recorded_at: '2026-08-13T00:00:00Z', price: 12, business_id: BIZ }, 'price');
  assert.deepStrictEqual(pt, { t: Date.parse('2026-08-13T00:00:00Z'), v: 12 },
    'rowToPoint must yield exactly {t,v} — a third key would reach menuPriceLog and then the backup');

  const series = API.rowsToSeries(
    [{ recorded_at: '2026-08-13T00:00:00Z', price: 12, menu_item_id: 'um1', business_id: BIZ }],
    'price', 'menu_item_id');
  assert.deepStrictEqual(Object.keys(series), ['um1']);
  assert.deepStrictEqual(series.um1, [{ t: Date.parse('2026-08-13T00:00:00Z'), v: 12 }]);
});

test('WRITE BOUNDARY: no writer sends business_id, so the client can never clear it', () => {
  /* Each writer is fed a model object that HAS a business_id, which is the hostile case: if a future
     read boundary regressed and let the column into memory, the write side must still not echo it
     back. The server owns this column. */
  const withBiz = (o) => Object.assign({ business_id: BIZ, businessId: BIZ }, o);
  const outs = {
    ingredientToRow: API.ingredientToRow(withBiz({ id: 'P0001', description: 'Flour', search_aliases: [] })),
    plateToRow: API.plateToRow(withBiz({ id: 'SP1', name: 'Toastie', lines: [] })),
    menuToRow: API.menuToRow(withBiz({ id: 'um1', name: 'Toastie', price: 12, menuId: 'MENU_ORIGINAL', plateId: 'SP1' })),
    menuRecordToRow: API.menuRecordToRow(withBiz({ id: 'MENU_ORIGINAL', name: 'Original menu' })),
    supplierPhraseToRow: API.supplierPhraseToRow(withBiz({ id: 'k', supplier: 'B', phrase_norm: 'p', qty: 1, unit: 'kg' })),
    changeToRow: API.changeToRow(withBiz({ id: 'CL1', t: Date.now(), kind: 'dish_price', menuIds: [] })),
    pointToRow: API.pointToRow(Date.now(), 1, 'price', 'menu_item_id', 'um1'),
  };
  Object.keys(outs).forEach((name) => {
    assert.ok(!('business_id' in outs[name]),
      `${name} would send business_id to the server — an upsert naming it can overwrite the tenant, ` +
      'and under Part 2 that is a row the café can no longer see');
  });
});

/* ---------------------------------------------------------------------------
   The SQL half. The mirror and the migration must name the same ten tables, or
   a re-mirrored staging rehearses a different schema from the one production
   runs — which is the exact failure docs/STAGING.md's fingerprint exists to
   catch, caught here one step earlier and for free.
   --------------------------------------------------------------------------- */
const ROOT = path.join(__dirname, '..');
const MIGRATION = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260813_business_id_part1.sql'), 'utf8');
const PART2 = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20260813_business_id_part2.sql'), 'utf8');
const MIRROR = fs.readFileSync(path.join(ROOT, 'supabase/staging/01-schema.sql'), 'utf8');

/* Both migration files carry their rollback IN THE HEADER, as commented-out SQL — and Part 2's
   rollback necessarily contains `using (true)`, the very thing its executable half must not. So
   every assertion about what a file DOES runs against the comment-stripped text; assertions about
   what a file SAYS run against the whole thing. Getting that backwards would make the central
   "nothing permissive survives" test pass on a file that never swapped anything. */
const stripComments = (sql) => sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const PART2_EXEC = stripComments(PART2);
const MIRROR_EXEC = stripComments(MIRROR);

// The ten public tables that carry the tenant column, read off the code rather than written down:
// the array literal each file loops over.
function tableList(sql, label) {
  const m = sql.match(/tables text\[\] := array\[([\s\S]*?)\]/);
  assert.ok(m, `${label} has no tenant table array — the loop that adds business_id is gone`);
  return m[1].match(/'([a-z_]+)'/g).map((s) => s.replace(/'/g, '')).sort();
}

test('SQL: the migration and the staging mirror carry the same ten tables', () => {
  const mig = tableList(MIGRATION, 'the migration');
  const mir = tableList(MIRROR, 'the staging mirror');
  assert.strictEqual(mig.length, 10, 'the tenant column must cover all ten public tables');
  assert.deepStrictEqual(mir, mig,
    'staging would rehearse a different set of tables from production — re-mirroring would then ' +
    'produce a schema the fingerprint diff reports as drift');
});

test('SQL: the trigger covers UPDATE as well as INSERT', () => {
  /* The pre-push review found the first draft guarded only INSERT, so nothing stopped an
     `update ... set business_id = null` — and under Part 2 a nulled row is one the café can no
     longer see, returned as 200 and an empty array rather than an error. Reproduced on staging
     before the fix and repaired by it after. Dropping back to `before insert` must go red. */
  assert.match(MIGRATION, /create trigger set_business_id before insert or update/,
    'the trigger no longer covers UPDATE — a row can be blanked without an error anywhere');
  assert.match(MIRROR, /create trigger set_business_id before insert or update/,
    'the staging mirror lost the UPDATE half, so a rehearsal would not reproduce the guard');
});

test('SQL: business_id is NOT NULL, and the constraint is added AFTER the trigger', () => {
  /* NOT NULL is only safe BECAUSE a BEFORE trigger fills the value first — the restore's explicit
     NULL is repaired before the constraint is checked. Add the constraint before the trigger
     exists and every restore breaks with 23502 instead. This pins the ORDER, not just the
     presence, because the order is the part that is silently wrong. */
  assert.match(MIGRATION, /alter column business_id set not null/,
    'business_id went back to nullable — the trigger only guards paths that run triggers');

  const trig = MIGRATION.indexOf('create trigger set_business_id');
  const notNull = MIGRATION.indexOf('alter column business_id set not null');
  assert.ok(trig !== -1 && notNull !== -1);
  assert.ok(trig < notNull,
    'NOT NULL is applied before the trigger is created, so there is a moment where the column is ' +
    'constrained with nothing filling it — order these the other way round');
});

test('SQL: the rollback stays re-runnable', () => {
  /* `drop policy IF EXISTS ... ON t` still needs `t` to exist, so without the to_regclass guard a
     SECOND run of the rollback errors instead of doing nothing. A rollback is reached when
     something has already gone wrong, which is exactly when it gets retried. (Pre-push review.) */
  assert.match(MIGRATION, /if to_regclass\('public\.businesses'\) is not null then/,
    'the rollback dropped its to_regclass guard and is no longer safe to run twice');
  const guard = MIGRATION.indexOf("if to_regclass('public.businesses') is not null then");
  const drop = MIGRATION.indexOf('drop policy if exists "members read their business"');
  assert.ok(guard !== -1 && drop !== -1 && guard < drop,
    'the guard must come BEFORE the policy drop it protects');
});

test('SQL: the trigger exists as well as the DEFAULT, and says why', () => {
  /* This is the finding the queue item did not have: restore_backup inserts five tables with
     `select *` and no column list, so an absent JSON key arrives as an EXPLICIT NULL that overrides
     the column DEFAULT. Demonstrated on staging — trigger dropped, 412 restored products landed
     null; trigger intact, zero. If someone deletes the trigger as redundant, this goes red. */
  assert.match(MIGRATION, /create trigger set_business_id before insert/,
    'the BEFORE INSERT trigger is gone — the DEFAULT alone does not survive restore_backup');
  assert.match(MIRROR, /create trigger set_business_id before insert/,
    'the staging mirror lost the trigger, so a rehearsal would not reproduce the restore path');
  assert.match(MIGRATION, /restore_backup/,
    'the migration must keep stating WHY the trigger exists, or it reads as belt-and-braces and gets deleted');
});

test('SQL: the trigger function pins its search_path', () => {
  // Supabase's security linter flagged this on first apply. Pinned so a later rewrite of the function
  // does not quietly reintroduce a WARN that nobody re-runs the advisor to notice.
  assert.match(MIGRATION, /language plpgsql\s*\nset search_path = ''/,
    'set_default_business_id lost its empty search_path');
  assert.match(MIRROR, /language plpgsql\s*\nset search_path = ''/,
    'the staging mirror lost the search_path pin');
});

/* ---------------------------------------------------------------------------
   PART 2 — the policy swap (batch 182).

   Part 1's claim was that nothing changes. Part 2's is the opposite: thirteen
   permissive policies become tenant-scoped ones, and the app must carry on
   working. Everything below pins a property whose failure is SILENT — an app
   that returns 200 and an empty array, or a tenant that can read its rows and
   not write any. None of it can be caught by reading the SQL, which is why the
   rehearsal in the migration header is a client call and not a query.
   --------------------------------------------------------------------------- */

test('PART 2: nothing permissive survives in the executable SQL', () => {
  /* The whole swap. A `using (true)` left in the executable half would sit
     ALONGSIDE the scoped policy, and permissive policies are OR'd — so every
     tenant would see everything and every check in this file would still pass.
     The rollback in the header legitimately contains these strings, which is
     why this runs on the stripped text. */
  assert.ok(!/using\s*\(true\)/.test(PART2_EXEC),
    'the migration still creates a `using (true)` policy — OR\'d with the scoped one, that is no swap at all');
  assert.ok(!/with check\s*\(true\)/.test(PART2_EXEC),
    'the migration still creates a `with check (true)` policy');
  assert.ok(!/using\s*\(true\)/.test(MIRROR_EXEC) && !/with check\s*\(true\)/.test(MIRROR_EXEC),
    'the staging mirror still creates permissive policies, so a re-mirror would rehearse a database production does not have');
});

test('PART 2: every old policy name is dropped, by name', () => {
  /* Renaming is what makes create-before-drop possible, and it is also what
     makes a FORGOTTEN drop invisible: the new policy works, the old one still
     grants everything, and no test that only looks at the new policies would
     ever notice. All thirteen old names must appear in a drop. */
  const OLD = [
    ['app_settings', 'staff full access'], ['ingredients', 'staff full access'],
    ['menu_items', 'staff full access'], ['menus', 'staff full access'],
    ['plates', 'staff full access'],
    ['price_history', 'price_history all'],
    ['supplier_phrases', 'open access (single-tenant, pre-login)'],
    ['ing_price_history', 'anon select'], ['ing_price_history', 'anon insert'],
    ['menu_change_log', 'anon select'], ['menu_change_log', 'anon insert'],
    ['menu_price_history', 'anon select'], ['menu_price_history', 'anon insert'],
  ];
  /* Asserted LINE BY LINE: the old name must appear on a line that also drops a policy. Merely
     appearing somewhere in the file is not evidence of anything — the header quotes all thirteen
     names in the rollback — and an assertion that cannot tell those two cases apart is the
     tautology this repo has now shipped twelve times. */
  const dropLines = PART2_EXEC.split('\n').filter((l) => l.includes('drop policy'));
  const NAMES = ['staff full access', 'price_history all',
    'open access (single-tenant, pre-login)', ' anon select', ' anon insert'];
  NAMES.forEach((name) => {
    assert.ok(dropLines.some((l) => l.includes(name)),
      `the permissive policy "${name}" is never dropped — it would sit alongside the scoped one and keep granting everything`);
  });

  // The five identical "staff full access" tables are dropped by one loop over an array literal;
  // a table missing from THAT array keeps its permissive policy while everything else looks right.
  const dropLoop = PART2_EXEC.slice(PART2_EXEC.indexOf("foreach t in array array['app_settings'"));
  const arr = dropLoop.slice(0, dropLoop.indexOf(']'));
  ['app_settings', 'ingredients', 'menu_items', 'menus', 'plates'].forEach((t) => {
    assert.ok(arr.includes(`'${t}'`),
      `${t} is missing from the array its "staff full access" policy is dropped by, so that policy survives`);
  });
  assert.ok(dropLoop.slice(0, dropLoop.indexOf(';') + 1).includes('drop policy'),
    'the array found is not the one the drop loop iterates — re-anchor this test');
});

test('PART 2: the scoped policy is CREATED before the permissive one is DROPPED', () => {
  /* The reason the policies are renamed at all. Both are permissive, so during
     the overlap access is exactly what it is today and a failure at any
     statement leaves a working app. Reverse these and there is a moment with
     RLS on and no policy, which is an empty app — and on production that is
     indistinguishable from data loss. */
  /* EVERY create before EVERY drop, not just the two this batch happened to think of. The first
     version of this test compared one named create against one named drop, and survived a mutation
     that moved a DIFFERENT drop above the creates — caught by running the mutation, which is the
     only way this class of hole is ever found. */
  const creates = [...PART2_EXEC.matchAll(/create policy/g)].map((m) => m.index);
  const drops = [...PART2_EXEC.matchAll(/drop policy/g)].map((m) => m.index);
  assert.ok(creates.length >= 3, 'the scoped policies are gone');
  assert.ok(drops.length >= 3, 'the permissive policies are never dropped');
  assert.ok(Math.max(...creates) < Math.min(...drops),
    'a policy is dropped before the last scoped policy is created — that ordering has a window where ' +
    'a table has RLS on and no policy, and the symptom is an app with no data and no error');
});

test('PART 2: the trigger and the column DEFAULT read the same function as the policy', () => {
  /* THE FINDING OF THE BATCH, and it was found only by rehearsing as a real
     second tenant. Part 1's DEFAULT is the legacy café's id as a literal, and a
     DEFAULT is applied when the column is ABSENT — which is every write the
     client makes. So the column is already non-NULL when the BEFORE trigger
     runs, the trigger correctly leaves it, and `with check` then refuses the
     row: every tenant but the seeded one could read and not write, with reads
     looking perfect. Restore the literal and this goes red. */
  assert.match(PART2_EXEC, /alter column business_id set default public\.current_business_id\(\)/,
    'the column DEFAULT is not the function — a literal names the legacy café and every other tenant is refused 42501 on its own writes');
  assert.match(PART2_EXEC, /new\.business_id := public\.current_business_id\(\)/,
    'the trigger no longer reads current_business_id() — the DEFAULT and the trigger would disagree');
  assert.ok(!/alter column business_id set default '00000000/.test(PART2_EXEC),
    'a literal DEFAULT is being set somewhere in the executable SQL');
  assert.ok(!/add column if not exists business_id uuid '\s*\|\| 'default '/.test(MIRROR_EXEC)
    && /alter column business_id set default public\.current_business_id\(\)/.test(MIRROR_EXEC),
    'the staging mirror still gives the column a literal default, so a rehearsal would not reproduce the bug this batch fixed');
});

test('PART 2: the mirror builds the tenant machinery BEFORE the policies', () => {
  /* Newly load-bearing. The policies now reference both the business_id column
     and current_business_id(), so a mirror that creates them first fails
     outright — and the tempting repair (enable RLS up there, add policies down
     here) is the locked-out window that section's own rule forbids. */
  const fn = MIRROR_EXEC.indexOf('create or replace function public.current_business_id');
  const col = MIRROR_EXEC.indexOf('add column if not exists business_id');
  const pol = MIRROR_EXEC.indexOf("' tenant access'");
  assert.ok(fn !== -1 && col !== -1 && pol !== -1, 'the mirror lost one of the three');
  assert.ok(fn < pol, 'the mirror creates a policy that calls current_business_id() before defining it');
  assert.ok(col < pol, 'the mirror creates a policy on business_id before the column exists');
});

test('PART 2: current_business_id is security definer with a pinned search_path', () => {
  /* A mutable search_path on a SECURITY DEFINER function is a privilege
     escalation path, not just a linter warning. And DEFINER itself is load
     bearing: as INVOKER the membership lookup would depend on business_members
     keeping a select policy forever, and if one were dropped every member would
     silently resolve to NULL — an empty app for every café at once. */
  const fn = PART2_EXEC.slice(PART2_EXEC.indexOf('create or replace function public.current_business_id'));
  assert.match(fn.slice(0, 300), /security definer/, 'current_business_id is no longer security definer');
  assert.match(fn.slice(0, 300), /set search_path = ''/, 'current_business_id lost its pinned search_path');
  const mfn = MIRROR_EXEC.slice(MIRROR_EXEC.indexOf('create or replace function public.current_business_id'));
  assert.match(mfn.slice(0, 300), /security definer/, 'the mirror\'s copy is not security definer');
  assert.match(mfn.slice(0, 300), /set search_path = ''/, 'the mirror\'s copy lost its pinned search_path');
});

test('PART 2: the anon branch names the seeded business, and both files agree', () => {
  /* The anon fallback IS today's behaviour: production has zero auth users, so
     every request the app makes is anon. Point it at any other uuid — or delete
     the branch — and Max's app is empty on the next boot, with no error. The
     literal must also match the row `businesses` is seeded with, in both files,
     or the fallback resolves to a business that does not exist. */
  const SEED = '00000000-0000-0000-0000-000000000001';
  [['the migration', PART2_EXEC], ['the mirror', MIRROR_EXEC]].forEach(([label, sql]) => {
    const fn = sql.slice(sql.indexOf('create or replace function public.current_business_id'));
    const body = fn.slice(0, fn.indexOf('$fn$;') > -1 ? fn.indexOf('$fn$;') : 600);
    assert.match(body, /when auth\.uid\(\) is null/,
      `${label} dropped the anon branch — every request this app makes today is anon, so that is an empty app`);
    assert.ok(body.includes(SEED),
      `${label}'s anon branch does not name the seeded business ${SEED}`);
  });
  assert.ok(MIRROR_EXEC.includes(`values ('${SEED}'`),
    'the mirror no longer seeds the business the anon branch falls back to');
});

test('PART 2: the append-only tables keep exactly select and insert', () => {
  /* ing_price_history, menu_change_log and menu_price_history have no update or
     delete policy, and that absence is a real constraint rather than an
     oversight — CLAUDE.md calls them the supplier-side series that must never be
     rewritten. A `for all` policy here would quietly grant both. */
  /* ⚠️ The table names never appear as literals next to these statements — the policies are built
     in a loop from a variable — so an assertion written around `'ing_price_history'` matches
     NOTHING and passes whatever the SQL says. That is what the first version did, and a mutation
     turning the log tables' `for select` into `for all` sailed straight through it.
     The checkable claim is about the whole file: the ONLY `for all` here is the one granted to
     `public` on the seven full-access tables. The log loop grants to `anon, authenticated`, so a
     `for all` reaching it is visible as a second entry. */
  const forAll = [...PART2_EXEC.matchAll(/for all to \w+/g)].map((m) => m[0]);
  assert.deepStrictEqual(forAll, ['for all to public'],
    'the only "for all" policy in this migration must be the one on the seven full-access tables — ' +
    `found ${JSON.stringify(forAll)}, and a "for all" on a history table grants update and delete on an append-only log`);
  assert.match(PART2_EXEC, /' tenant select'/, 'the append-only select policies are gone');
  assert.match(PART2_EXEC, /' tenant insert'/, 'the append-only insert policies are gone');
});

test('PART 2: the migration asserts its own result rather than reporting success', () => {
  /* Every failure this migration can cause is silent from the client's side, so
     the file raises instead of finishing quietly. These four are the ones whose
     absence would let a broken swap report success. */
  assert.match(PART2_EXEC, /raise exception '% permissive policy expressions still stand/,
    'the migration no longer refuses a leftover permissive policy');
  assert.match(PART2_EXEC, /expected 13 tenant-scoped policies/,
    'the migration no longer counts the thirteen scoped policies');
  assert.match(PART2_EXEC, /has RLS on and no policy at all/,
    'the migration no longer refuses a table left with no policy — that table is an empty app');
  assert.match(PART2_EXEC, /business_id defaults are not current_business_id\(\)/,
    'the migration no longer checks the defaults, which is the one thing that passed every other check while a tenant could not write');
});
