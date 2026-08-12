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
const MIRROR = fs.readFileSync(path.join(ROOT, 'supabase/staging/01-schema.sql'), 'utf8');

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
