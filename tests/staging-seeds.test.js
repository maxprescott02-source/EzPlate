/*
 * staging-seeds.test.js — 172. The staging SQL cannot be run against production by accident.
 *
 * WHAT THIS FILE CAN AND CANNOT DO, stated up front because the limit matters:
 * it reads the .sql files as TEXT. It cannot connect to a database, so it does not prove the guards
 * FIRE — that was demonstrated by running them against both projects (production raised, staging
 * passed; recorded in the handover and in docs/STAGING.md).
 *
 * What it does prove is the part that ROTS: that every destructive statement in these files still
 * sits behind a guard. The guard firing is a property of the SQL that was true the day it was
 * written; the guard still being FIRST is a property of the file that any future edit can break,
 * silently, with nothing else to notice. That is the one worth a test.
 *
 * The seeds are deliberately not tested for their CONTENT. They are fixtures, not logic, and their
 * counts are asserted inside 04-seed-scale.sql itself where a real database can check them — which
 * is the honest place, because a count asserted here would only be checking that I typed the same
 * number twice.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'supabase', 'staging');
const read = (f) => fs.readFileSync(path.join(DIR, f), 'utf8');

const SEEDS = ['02-seed-empty.sql', '03-seed-realistic.sql', '04-seed-scale.sql'];
const ALL = ['01-schema.sql'].concat(SEEDS);

/** Strip -- comments so a word in prose is never mistaken for a statement. */
function code(sql) {
  return sql.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
}

test('every staging file exists', () => {
  for (const f of ALL) assert.ok(fs.existsSync(path.join(DIR, f)), `${f} is missing`);
});

for (const f of SEEDS) {
  test(`${f}: the guard is present and names the marker table`, () => {
    const sql = code(read(f));
    assert.ok(sql.includes('__ezplate_staging'), 'must guard on the marker table');
    assert.ok(/raise exception/i.test(sql), 'must RAISE, not merely notice');
  });

  test(`${f}: NO destructive statement precedes the guard`, () => {
    // The whole safety argument is ordering: Postgres aborts the rest of the batch when the guard
    // raises, so anything ABOVE it would already have run. Demonstrated live against production
    // (the DELETE after a failed guard did not execute); pinned here against future edits.
    const sql = code(read(f));
    const guard = sql.indexOf('__ezplate_staging');
    assert.ok(guard > 0, 'guard must be present');
    const before = sql.slice(0, guard);
    const destructive = /\b(delete|truncate|drop|update|insert|alter)\b/i;
    const hit = before.match(destructive);
    assert.strictEqual(hit, null, `"${hit && hit[0]}" appears before the guard in ${f}`);
  });

  test(`${f}: deletes dishes before plates — the FK order that raises 23503 the other way`, () => {
    const sql = code(read(f));
    const dishes = sql.indexOf('delete from public.menu_items');
    const plates = sql.indexOf('delete from public.plates');
    assert.ok(dishes > 0 && plates > 0, 'both deletes must be present');
    assert.ok(dishes < plates,
      'menu_items.plate_id -> plates.id is NO ACTION, so plates-first raises 23503');
  });
}

test('01-schema.sql refuses to create the marker in a database that holds a catalogue', () => {
  // Without this the file is a foot-gun rather than a safeguard: creating the marker on production
  // would DISARM all three seed guards, and the next seed run would wipe the cafe while looking
  // entirely normal. Demonstrated live: production raised, staging re-ran as a no-op.
  const sql = code(read('01-schema.sql'));
  const create = sql.indexOf('create table public.__ezplate_staging');
  const guard = sql.search(/exists\s*\(\s*select\s+1\s+from\s+public\.ingredients\s*\)/i);
  assert.ok(create > 0, 'the marker must be created somewhere');
  assert.ok(guard > 0, 'the catalogue check must be present');
  assert.ok(guard < create, 'the catalogue check must come BEFORE the create');
  assert.ok(/raise exception/i.test(sql), 'and it must raise');
});

test('01-schema.sql keeps restore_backup SECURITY INVOKER', () => {
  // Queue item "Gate review before public signup" requires it, and `security definer` here would
  // hand anon the owner's rights over a function whose first act is to delete five tables.
  //
  // ⚠️ SCOPED TO restore_backup's OWN BODY since batch 182, and the widening matters. This used to
  // grep the WHOLE FILE for `security definer`, which is a different and much broader claim than the
  // one its name makes — it passed only because restore_backup was the file's single function. Part 2
  // added `current_business_id()`, which is DELIBERATELY definer (as invoker, the membership lookup
  // would depend on business_members keeping a select policy forever, and losing one would empty
  // every café's app with no error), so the old assertion failed on a correct change. A test that
  // fires on something other than the thing it names is the failure this repo keeps finding; the fix
  // is to make it pin what it says, not to delete it.
  //
  // Note the mirrored copy carries no `security invoker` clause at all — it is verbatim from
  // pg_get_functiondef, which omits the default. So the absence of `definer` IS the assertion, and
  // requiring the word `invoker` here would go red against a faithful copy.
  const sql = code(read('01-schema.sql'));
  const start = sql.indexOf('create or replace function public.restore_backup');
  assert.ok(start > 0, 'the RPC must be mirrored');
  const end = sql.indexOf('$function$;', start);
  assert.ok(end > start, 'restore_backup\'s body is no longer terminated by $function$; — re-scope this test');
  const body = sql.slice(start, end);
  assert.ok(!/security\s+definer/i.test(body), 'restore_backup must not become SECURITY DEFINER');
});

test('01-schema.sql keeps the load-bearing `where true` on the restore deletes', () => {
  // `safeupdate` rejects a WHERE-less DELETE for `authenticator` but not for `postgres`, so
  // removing these breaks the client while still passing through the MCP. Staging preloads the same
  // library (verified: both projects carry session_preload_libraries=supautils, safeupdate).
  const sql = code(read('01-schema.sql'));
  for (const t of ['menu_items', 'plates', 'menus', 'ingredients', 'supplier_phrases']) {
    assert.ok(sql.includes(`delete from ${t} where true;`), `restore_backup's delete of ${t} lost its "where true"`);
  }
});

test('the marker table is granted to nobody — the client must not see it', () => {
  const sql = code(read('01-schema.sql'));
  const grants = sql.slice(sql.indexOf('grant all on table'));
  assert.ok(!grants.includes('__ezplate_staging'),
    'granting the marker to anon would expose it to PostgREST and to the app');
});

test('no staging file names the PRODUCTION project', () => {
  // A copy-paste of a connection string or ref into this directory is the one way a reader could be
  // led to run any of it against the cafe.
  for (const f of ALL) {
    assert.ok(!read(f).includes('izrnptxhdylllodvglla'), `${f} names the production project ref`);
  }
});

test('supabase/ is kept off the public origin', () => {
  // Vercel serves the repo root, so these files would otherwise be fetchable. The seeds are
  // harmless to read, but the schema is a free map of every table and policy.
  const ignore = fs.readFileSync(path.join(__dirname, '..', '.vercelignore'), 'utf8');
  assert.ok(/^supabase\/$/m.test(ignore), '.vercelignore must exclude supabase/');
});
