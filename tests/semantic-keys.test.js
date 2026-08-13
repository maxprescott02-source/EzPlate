/*
 * semantic-keys.test.js — 183. The two CONTENT-derived keys are per-tenant.
 *
 * WHAT THIS FILE CAN AND CANNOT DO, stated up front because the limit decides what is worth
 * asserting. It reads .sql files and js/app.js as TEXT. It cannot connect to a database, so it does
 * NOT prove that a second café can now save a setting — that was measured over PostgREST as three
 * real accounts on staging and is recorded in the migration header and the handover.
 *
 * What it proves is the part that ROTS. Three things, each of which a future edit can break silently:
 *
 *   1. THE ORDER inside the migration. Uniqueness must never lapse and the deployed restore function
 *      must never name a dead arbiter. Both are properties of where the statements SIT, and both look
 *      completely fine in a diff that moves one line.
 *   2. THE MIRROR. `supabase/staging/01-schema.sql` is what a fresh staging is rebuilt from. If it
 *      keeps declaring the narrow key, the next rehearsal happens against the schema this batch
 *      replaced — and it would pass, because nothing else compares the two files.
 *   3. THE CLIENT'S SILENCE. `dbSetSetting` works only because it does NOT name a conflict target.
 *      That is invisible at the call site; "specifying it for clarity" would restore the defect.
 *
 * ⚠️ EVERY ASSERTION BELOW WAS CHECKED BY BREAKING THE THING IT NAMES AND WATCHING IT GO RED, per
 * CLAUDE.md's fourteen-incident rule. The one that mattered: the FIRST version of the conflict-target
 * assertion searched the raw SQL, which contains both spellings in PROSE — so it passed on a comment
 * and would have passed whatever the statement said. The same mistake fired for real inside the
 * migration's own SQL assertion on the first staging run. Hence `code()` everywhere.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const ROOT = path.join(__dirname, '..');
const MIGRATION = fs.readFileSync(
  path.join(ROOT, 'supabase', 'migrations', '20260813_semantic_keys.sql'), 'utf8');
const MIRROR = fs.readFileSync(
  path.join(ROOT, 'supabase', 'staging', '01-schema.sql'), 'utf8');
const SRC = loadApp();

/** Strip `--` comments so a spelling in prose is never mistaken for a statement. */
function code(sql) {
  return sql.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
}

/** Every index of `re` in `s`. Used for all-before-all ordering, never one pair. */
function positions(s, re) {
  const out = [];
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  let m;
  while ((m = rx.exec(s)) !== null) out.push(m.index);
  return out;
}

/* ─────────────────────────── the migration says what it means ─────────────────────────── */

test('the migration widens BOTH primary keys to include the tenant', () => {
  const sql = code(MIGRATION);
  assert.match(sql, /alter table public\.app_settings\s+add constraint app_settings_pkey primary key using index app_settings_business_key_uk/,
    'app_settings must take the composite key');
  assert.match(sql, /alter table public\.supplier_phrases\s+add constraint supplier_phrases_pkey primary key using index supplier_phrases_business_id_uk/,
    'supplier_phrases must take the composite key');
  assert.match(sql, /create unique index app_settings_business_key_uk\s+on public\.app_settings \(business_id, key\)/);
  assert.match(sql, /create unique index supplier_phrases_business_id_uk\s+on public\.supplier_phrases \(business_id, id\)/);
});

test('EVERY unique index is created before EVERY constraint is dropped — uniqueness never lapses', () => {
  /* ⚠️ All-before-all, deliberately, and this is the 182(b) lesson written into a test rather than
     into a comment: an assertion that compares ONE named create against ONE named drop survives a
     DIFFERENT drop being moved above the creates, which is the same hole with the same green tick. */
  const sql = code(MIGRATION);
  const creates = positions(sql, /create unique index/g);
  const drops = positions(sql, /drop constraint/g);
  assert.equal(creates.length, 2, 'two composite indexes, or this test is measuring something else');
  assert.equal(drops.length, 2, 'two primary keys are dropped, or this test is measuring something else');
  assert.ok(Math.max(...creates) < Math.min(...drops),
    'a drop precedes a create — there is a window with no uniqueness on a primary key');
});

test('restore_backup is replaced BEFORE any primary key is dropped', () => {
  /* Not cosmetic. Between the drop and the function replace, the DEPLOYED function would name an
     arbiter that no longer exists — 42P10, raised at RUNTIME on the next restore rather than here. */
  const sql = code(MIGRATION);
  const fn = sql.indexOf('create or replace function public.restore_backup');
  const firstDrop = Math.min(...positions(sql, /drop constraint/g));
  assert.ok(fn > -1, 'the migration must carry the function');
  assert.ok(fn < firstDrop, 'the primary key is dropped while the old function body is still deployed');
});

test('the migration\'s restore_backup uses the composite conflict target and never the bare key', () => {
  /* ⚠️ THE `\s+do` IS THE ASSERTION, and it is here because the first version of this test failed on
     the migration for the wrong reason. An ON CONFLICT CLAUSE is always followed by DO; the migration
     also carries the bare spelling as a STRING LITERAL inside its own SQL assertion, which executes
     but is not a clause. Matching the bare string alone reported a defect that was not there — and a
     test that cries wolf gets relaxed by the next person, which is how the real one gets through. */
  const sql = code(MIGRATION);
  assert.ok(sql.includes('on conflict (business_id, key) do update'),
    'the app_settings upsert must resolve against (business_id, key)');
  assert.ok(!/on conflict \(key\)\s+do/.test(sql),
    'a bare-key conflict target is 42P10 once the primary key is composite');
  // menu_change_log's key is NOT widened — its ids come from uid() and are collision-proof already.
  assert.ok(sql.includes('on conflict (id) do nothing'),
    'the change-log merge must be left alone; widening it was never the job');
});

test('the restore still lets the SERVER decide the tenant', () => {
  const sql = code(MIGRATION);
  assert.match(sql, /insert into app_settings \(key, value, updated_at\)/,
    'business_id must not join the insert column list — the trigger and DEFAULT fill it');
  assert.ok(/security invoker/.test(sql),
    'SECURITY DEFINER would let a restore cross tenants');
});

/* ─────────────────────────── the staging mirror matches production ─────────────────────────── */

test('the staging mirror declares the same two composite keys', () => {
  const sql = code(MIRROR);
  assert.ok(sql.includes("spec text[][] := array[['app_settings','key'], ['supplier_phrases','id']]"),
    '01-schema.sql must swap both keys, or a rebuilt staging silently carries the narrow ones');
  assert.match(sql, /primary key using index/,
    'the mirror must swap the key, not merely create an index beside it');
});

test('the mirror swaps the keys AFTER business_id exists, and is a no-op on a re-run', () => {
  const sql = code(MIRROR);
  const addsColumn = sql.indexOf('add column if not exists business_id');
  const swaps = sql.indexOf("spec text[][] := array[['app_settings','key']");
  assert.ok(addsColumn > -1 && swaps > addsColumn,
    'the key cannot name a column that does not exist yet');
  assert.ok(sql.includes('is distinct from format(\'PRIMARY KEY (business_id, %I)\', col)'),
    're-mirroring must be idempotent — an unguarded drop would take the composite key away');
});

test('the mirror\'s restore_backup carries the composite conflict target too', () => {
  const sql = code(MIRROR);
  assert.ok(sql.includes('on conflict (business_id, key) do update'));
  assert.ok(!/on conflict \(key\)\s+do/.test(sql),
    'the mirror would rehearse a restore that production no longer performs');
});

/* ─────────────────────────── the client names no conflict target ─────────────────────────── */

test('dbSetSetting names no conflict target — PostgREST must derive it from the primary key', () => {
  const fn = extractFn(SRC, 'dbSetSetting');
  assert.ok(/\.upsert\(\{key:key, value:val\}\)/.test(fn),
    'the upsert must send the key and value and nothing else');
  assert.ok(!/onConflict/.test(fn),
    "naming a conflict target here re-globalises the key: with onConflict:'key' a second café's "
    + 'first save is refused 42501 against a row it cannot see');
  assert.ok(!/business_id/.test(fn),
    'the client must never send the tenant — the trigger and the DEFAULT decide it');
});

test('dbPushSupplierPhrase names no conflict target either', () => {
  const fn = extractFn(SRC, 'dbPushSupplierPhrase');
  assert.ok(/\.upsert\(supplierPhraseToRow\(e\)\)/.test(fn),
    'one argument: the mapped row, and no options object');
  assert.ok(!/onConflict/.test(fn));
});

test('memKey stays content-derived — the composite key exists so it can', () => {
  /* The whole point of widening the key rather than prefixing the id: re-teaching the same pack must
     still UPDATE one row. If memKey ever gained a tenant, taught-pack dedupe would be keyed off
     something the client guesses rather than something the server knows. */
  /* ⚠️ THE WHOLE BODY, NOT A SUBSTRING — this assertion SURVIVED its own mutation on the first run.
     It matched `normSupplier(supplier)+'|'+normalizePhrase(phrase)`, which is still present after a
     tenant is glued on either end, so `BIZ+'|'+normSupplier(...)...` sailed through it green. Exactly
     CLAUDE.md's class: not a stub, just an assertion that could not tell right from wrong. */
  const fn = extractFn(SRC, 'memKey').replace(/\s+/g, ' ').trim();
  assert.equal(fn,
    "function memKey(supplier, phrase){ return normSupplier(supplier)+'|'+normalizePhrase(phrase); }",
    'memKey must remain exactly supplier|phrase — a tenant at EITHER end breaks taught-pack dedupe');
});
