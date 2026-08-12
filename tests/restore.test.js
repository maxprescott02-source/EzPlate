/*
 * restore.test.js — v110: the backup RESTORE path, the counterpart to exportBackup.
 *
 * WHY THIS FILE EXISTS. Every failure this path can have is SILENT. Hard rule 8's is the model:
 * the export dumps in-memory objects, so a dish carries `menuId`/`plateId` while the columns are
 * `menu_id`/`plate_id`, and a restore written from the schema inserts every row with a null plate
 * link — every row present, nothing connected, no error raised, 76 of 77 dishes on the 1 Aug file.
 * Nothing throws, nothing looks wrong, and the plates quietly cost nothing.
 *
 * The contracts pinned here:
 *   1. A format-1 file is REFUSED, and the refusal names commit aa16387 — the only place the
 *      built-in product list still exists.
 *   2. A missing / malformed / unknown stamp is a refusal, never a guess.
 *   3. A format-2 file maps EVERY group, and the assertions are on RESOLVED REFERENCES rather than
 *      row counts: counts pass just as happily when every link is null.
 *   4. No camelCase key can reach the payload. Structural guard, same shape as row-boundary's.
 *   5. THE CONDITIONS THE DATABASE ENFORCES, pinned client-side so the pre-flight check cannot
 *      drift from what the server actually requires. See the block comment above test 5 — this is
 *      the group written against the CONDITION rather than the structure, because v108's critical
 *      bug survived a thorough suite by being pinned structurally.
 *
 * Runs the REAL shipped functions, brace-extracted from js/app.js — no second copy to drift.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// The restore builders plus every xToRow writer they cross the boundary through. Pulling the REAL
// mappers in is the point: if ingredientToRow or menuToRow changes shape, this file must notice.
const NAMES = [
  'parseBackupFile', 'backupRefCheck', 'backupToPayload', 'backupSummary',
  'ingredientToRow', 'menuToRow', 'plateToRow', 'menuRecordToRow', 'supplierPhraseToRow', 'pointToRow',
  'changeToRow',   // v114
];
// eslint-disable-next-line no-new-func
const API = new Function(`"use strict";
  ${NAMES.map((n) => extractFn(SRC, n)).join('\n')}
  return { ${NAMES.join(', ')} };
`)();

const { parseBackupFile, backupRefCheck, backupToPayload, backupSummary } = API;

/* A minimal but COMPLETE format-2 file: two products, two ingredients (one linked by kid, one by
   pid at the line level — the 81/84 split CLAUDE.md records on Max's real data), one plate whose
   lines exercise all three line kinds, one menu, one plate published to it. */
function fixture(over) {
  const b = {
    app: 'EzPlate', version: 'v110', exported_at: '2026-08-03T00:00:00.000Z',
    stamp: { format: 2, app_version: 'v110' },
    products: {
      P0001: { id: 'P0001', description: 'Chips', base_unit: 'g', cost_per_base_unit: 0.0247, is_food: true, is_custom: false, search_aliases: [] },
      P0002: { id: 'P0002', description: 'Oil', base_unit: 'ml', cost_per_base_unit: 0.004, is_food: true, is_custom: true, search_aliases: [] },
    },
    kitchen_ingredients: [{ id: 'K0001', name: 'Chips', pid: 'P0001' }],
    plates: [{ id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [
      { kid: 'K0001', qty: 200 },
      { pid: 'P0002', qty: 10 },
      { cost: 1.5, misc: true, label: 'Packaging' },
    ] }],
    menu_items: [{ id: 'D1', section: 'Mains', name: 'Fish & Chips', price: 22, notes: '',
                   custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1', sourcePlateId: 'PL1' }],
    ing_price_log: { P0001: [{ t: 1754179200000, v: 0.0247 }] },
    supplier_mem: { S1: { id: 'S1', supplier: 'Bidfood', phrase_norm: 'chips 5kg', qty: 5, unit: 'kg' } },
    settings: {
      food_cost_target: 30, gst_default: 'ex', king_wiz_skips: ['P0003'],
      menus: [{ id: 'MENU_ORIGINAL', name: 'Original menu', season: null }],
      current_menu_id: 'MENU_ORIGINAL',
    },
  };
  return Object.assign(b, over || {});
}
const json = (o) => JSON.stringify(o);

/* ---- 1. format 1 is refused, and the refusal names aa16387 ---------------------------------- */

test('a format-1 file is REFUSED and the reason names commit aa16387', () => {
  const f = fixture({ stamp: { format: 1, app_version: 'v107', base_products_count: 393, base_products_hash: 'be5e0fbe' } });
  const r = parseBackupFile(json(f));
  assert.strictEqual(r.ok, false, 'a format-1 file must never be restored');
  assert.match(r.reason, /aa16387/, 'the refusal must name the commit that still holds the product list');
  assert.match(r.reason, /295/, 'the refusal must say how many products are at stake');
});

test('format 1 is refused even when it CONTAINS every product — the app can no longer tell', () => {
  // Max's 2 Aug file is format 1 and holds all 412, because it was taken after the backfill. It is
  // still refused: rule 9's per-id test needs the built-in list, and v108 deleted it. Refusing a
  // restorable file is the cheap error; accepting an unrestorable one is the expensive one.
  const f = fixture({ stamp: { format: 1, app_version: 'v107' } });
  assert.strictEqual(parseBackupFile(json(f)).ok, false);
});

/* ---- 2. an absent or unrecognised stamp is a refusal, not a guess --------------------------- */

test('a file with NO stamp is refused (pre-v106: a delta with no record of which build)', () => {
  const f = fixture(); delete f.stamp;
  const r = parseBackupFile(json(f));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /backup format/i);
});

test('a malformed stamp is refused', () => {
  for (const bad of [null, 'format2', 42, []]) {
    assert.strictEqual(parseBackupFile(json(fixture({ stamp: bad }))).ok, false, `stamp ${json(bad)} must be refused`);
  }
});

// v114: format 3 became REAL (it is what this version exports), so the unknown-format case moved to 4.
test('an unknown format is refused and quotes what it saw', () => {
  const r = parseBackupFile(json(fixture({ stamp: { format: 4 } })));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /4/);
});

/* v114 — BOTH live formats restore, and this is the pin that matters most in this file.
   Refusing format 2 would have made ~/Downloads/ezplate-PRE-STEP2.json unrestorable: it is the newest
   backup in existence and the only recovery path there is. A format-2 file simply predates the change
   log, which is a true statement about the file rather than a guess about it. */
test('v114: a format-3 file is accepted, and format 2 still is', () => {
  const three = fixture({ stamp: { format: 3, app_version: 'v114' }, change_log: [
    { id: 'CL1', t: 1754179200000, kind: 'plate_edited', plateId: 'PL1', dishId: null,
      menuIds: ['MENU_ORIGINAL'], avgBefore: 34, avgAfter: 31, costBefore: 5, costAfter: 4.5, detail: {} },
  ] });
  assert.strictEqual(parseBackupFile(json(three)).ok, true, 'the format this version writes must restore');
  assert.strictEqual(parseBackupFile(json(fixture())).ok, true, 'the newest REAL backup Max holds is format 2');
});

/* The change log is the ONE group the restore never deletes, so a missing one cannot destroy anything —
   which is exactly why it is exempt from the "missing group = damaged file" rule the other seven carry.
   A present-but-wrong-typed one is still a damaged file and must be named as such. */
test('v114: an ABSENT change log is fine; a malformed one is refused', () => {
  const noLog = fixture({ stamp: { format: 3, app_version: 'v114' } });
  assert.strictEqual(parseBackupFile(json(noLog)).ok, true, 'absent means "no log existed then", not "damaged"');
  for (const bad of [{}, 'nope', 7]) {
    assert.strictEqual(parseBackupFile(json(fixture({ change_log: bad }))).ok, false,
      `change_log ${json(bad)} is present and wrong — that IS damage`);
  }
});

test('a file that is not JSON at all is refused without throwing', () => {
  const r = parseBackupFile('{"products": ');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /JSON/);
});

test('a format-2 file MISSING a group is refused — a damaged file is not an empty dataset', () => {
  // This is the guard that protects against the worst outcome available here: a payload with no
  // `products` would otherwise replace a 412-product catalogue with nothing.
  for (const k of ['products', 'kitchen_ingredients', 'plates', 'menu_items', 'ing_price_log', 'supplier_mem', 'settings']) {
    const f = fixture(); delete f[k];
    assert.strictEqual(parseBackupFile(json(f)).ok, false, `a file missing "${k}" must be refused`);
  }
  const noMenus = fixture(); delete noMenus.settings.menus;
  assert.strictEqual(parseBackupFile(json(noMenus)).ok, false, 'a file with no menus list must be refused');
});

test('a group of the WRONG TYPE is refused (an array where an object belongs and back)', () => {
  assert.strictEqual(parseBackupFile(json(fixture({ products: [] }))).ok, false);
  assert.strictEqual(parseBackupFile(json(fixture({ plates: {} }))).ok, false);
});

test('a clean format-2 file is ACCEPTED', () => {
  const r = parseBackupFile(json(fixture()));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.data.stamp.format, 2);
});

/* ---- 3. every group maps, asserted on RESOLVED REFERENCES ----------------------------------- */

test('a format-2 file maps every group into the payload', () => {
  const p = backupToPayload(fixture());
  for (const g of ['ingredients', 'menus', 'plates', 'menu_items', 'supplier_phrases', 'ing_price_history',
                   'menu_change_log', 'app_settings']) {
    assert.ok(Array.isArray(p[g]), `group ${g} must reach the payload as an array`);
  }
  assert.deepStrictEqual(p.menu_change_log, [], 'a format-2 file maps to an empty log, not to a missing key');
});

/* v114 — THE WIRE FORMAT DECLARES WHAT THE PAYLOAD CONTAINS, NOT WHICH VERSION BUILT IT, and this is
   the pin that stops disaster recovery breaking during a rollout. The deployed function is whatever was
   last applied by hand; v110's refuses format 3 outright. Sending 3 unconditionally would mean that
   between this code reaching Vercel and the v3 migration being run, EVERY restore fails — including a
   restore of the format-2 file that is the only recovery path there is. A payload with no change log
   genuinely IS a format-2 payload, so it says so and the old function takes it. */
test('v114: a payload with no change log declares format 2; one WITH entries declares 3', () => {
  assert.strictEqual(backupToPayload(fixture()).format, 2,
    'nothing in this payload needs a format-3 reader — an old deployed function must still restore it');
  const withLog = backupToPayload(fixture({ change_log: [
    { id: 'CL1', t: 1754179200000, kind: 'plate_edited', plateId: 'PL1', dishId: null,
      menuIds: ['MENU_ORIGINAL'], avgBefore: 34, avgAfter: 31, costBefore: 5, costAfter: 4.5, detail: {} },
  ] }));
  assert.strictEqual(withLog.format, 3, 'once there IS a log to carry, only a format-3 reader will do');
  assert.strictEqual(withLog.menu_change_log.length, 1);
});

/* v114 — hard rule 8 read forwards: the log crosses the row boundary through changeToRow like every
   other group, so the camelCase trap that silently unlinked 76 of 77 dishes has nowhere to happen here. */
test('v114: change-log entries cross the boundary as ROWS, not as in-memory objects', () => {
  const p = backupToPayload(fixture({ change_log: [
    { id: 'CL1', t: 1754179200000, kind: 'dish_price', plateId: 'PL1', dishId: 'D1',
      menuIds: ['MENU_ORIGINAL'], avgBefore: 34, avgAfter: 31, costBefore: null, costAfter: null,
      detail: { name: 'Fish & Chips' } },
  ] }));
  const row = p.menu_change_log[0];
  assert.strictEqual(row.recorded_at, new Date(1754179200000).toISOString(),
    'epoch ms becomes an ISO timestamptz at the boundary — the one conversion changeToRow owns');
  assert.strictEqual(row.plate_id, 'PL1');
  assert.strictEqual(row.dish_id, 'D1');
  assert.deepStrictEqual(row.menu_ids, ['MENU_ORIGINAL']);
  assert.strictEqual(row.avg_before, 34);
  for (const k of ['plateId', 'dishId', 'menuIds', 'avgBefore', 'costAfter', 't']) {
    assert.strictEqual(row[k], undefined, `camelCase ${k} must not survive into a row`);
  }
  // It must RESOLVE inside the payload it travels in — the same test the dish rows get, for the same
  // reason: row counts pass happily with every reference pointing at nothing.
  assert.ok(new Set(p.plates.map((x) => x.id)).has(row.plate_id), 'the entry names a plate in this payload');
});

test('THE camelCase TRAP: a restored dish resolves to its plate AND its menu through snake_case', () => {
  // The v106 audit's failure, pinned. Row counts would pass with every link null; these do not.
  const p = backupToPayload(fixture());
  const dish = p.menu_items[0];
  const plateIds = new Set(p.plates.map((x) => x.id));
  const menuIds = new Set(p.menus.map((x) => x.id));

  assert.ok(plateIds.has(dish.plate_id), 'the dish must RESOLVE to a plate in the same payload');
  assert.ok(menuIds.has(dish.menu_id), 'the dish must RESOLVE to a menu in the same payload');
  assert.strictEqual(dish.menuId, undefined, 'camelCase menuId must not survive into a row');
  assert.strictEqual(dish.plateId, undefined, 'camelCase plateId must not survive into a row');
  assert.strictEqual(dish.custom, undefined, 'camelCase custom must not survive — the column is is_custom');
  assert.strictEqual(dish.is_custom, true);
});

test('NO camelCase key reaches ANY row in the payload (structural inversion guard)', () => {
  const p = backupToPayload(fixture());
  const rows = [].concat(p.ingredients, p.menus, p.plates, p.menu_items, p.supplier_phrases, p.ing_price_history);
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      assert.ok(!/[a-z][A-Z]/.test(k), `camelCase key "${k}" reached a row — the column is snake_case`);
    }
  }
});

test('the price log flattens to keyed points, and a null value is dropped not restored as $0.00', () => {
  const f = fixture();
  f.ing_price_log = { P0001: [{ t: 1754179200000, v: 0.0247 }, { t: 1754265600000, v: null }], P0002: [{ t: 1754179200000, v: 0 }] };
  const p = backupToPayload(f);
  assert.strictEqual(p.ing_price_history.length, 2, 'the null-valued point must be dropped');
  // 0 is a LEGITIMATE cost (P0277 costs 0 on Max's data) and must survive — the same distinction
  // rowToPoint draws. A `!pt.v` guard here would silently delete it.
  assert.ok(p.ing_price_history.some((r) => r.cost_per_base_unit === 0 && r.product_id === 'P0002'));
  const pt = p.ing_price_history.find((r) => r.product_id === 'P0001');
  assert.strictEqual(typeof pt.recorded_at, 'string', 'epoch ms must become an ISO timestamptz');
  assert.strictEqual(new Date(pt.recorded_at).getTime(), 1754179200000);
});

test('the two groups with NO row mapper become app_settings key/value pairs', () => {
  // kitchen_ingredients and settings.* are app_settings JSON blobs, not table rows. Their boundary
  // is the setting KEY, and these are the exact keys bootstrapSync reads back.
  const p = backupToPayload(fixture());
  const byKey = Object.fromEntries(p.app_settings.map((s) => [s.key, s.value]));
  assert.deepStrictEqual(byKey.kitchen_ingredients, [{ id: 'K0001', name: 'Chips', pid: 'P0001' }]);
  assert.strictEqual(byKey.food_cost_target, 30);
  assert.strictEqual(byKey.gst_default, 'ex');
  assert.deepStrictEqual(byKey.king_wiz_skips, ['P0003']);
  // current_menu_id is NOT a server setting — it is one of the localStorage view preferences v108
  // kept, and is applied client-side after the restore.
  assert.ok(!('current_menu_id' in byKey), 'current_menu_id must not be written to app_settings');
});

test('an absent optional setting is omitted rather than written as null', () => {
  const f = fixture();
  delete f.settings.gst_default; delete f.settings.king_wiz_skips;
  const keys = backupToPayload(f).app_settings.map((s) => s.key);
  assert.ok(!keys.includes('gst_default'));
  assert.ok(!keys.includes('king_wiz_skips'));
  assert.ok(keys.includes('kitchen_ingredients'), 'kitchen words are always written');
});

/* ---- 4. hard vs soft broken references ------------------------------------------------------ */

test('a dish pointing at a missing plate is HARD — the FK would reject the whole restore', () => {
  const f = fixture();
  f.menu_items[0].plateId = 'GONE'; f.menu_items[0].sourcePlateId = 'GONE';
  const r = backupRefCheck(f);
  assert.strictEqual(r.hard.length, 1);
  assert.match(r.hard[0], /^1 entry on your menus points to a plate that isn’t in this backup$/,
    'singular must read naturally — the count and the verb have to agree');
});

test('the broken-reference wording agrees in number for one and for many', () => {
  // A count spliced into a sentence is exactly where subject/verb agreement rots unnoticed, and this
  // copy appears in the one dialog that precedes replacing a café's pricing. Caught here already.
  const one = fixture();
  one.plates[0].lines[0].kid = 'K_GONE';
  assert.match(backupRefCheck(one).soft[0], /^1 plate line uses an ingredient/);

  const many = fixture();
  many.plates[0].lines[0].kid = 'K_GONE';
  many.plates.push({ id: 'PL2', name: 'Second', lines: [{ kid: 'K_ALSO_GONE', qty: 1 }] });
  assert.match(backupRefCheck(many).soft[0], /^2 plate lines use an ingredient/);

  const twoDish = fixture();
  twoDish.menu_items[0].plateId = 'GONE'; twoDish.menu_items[0].sourcePlateId = 'GONE';
  twoDish.menu_items.push({ id: 'D2', name: 'Other', menuId: 'MENU_ORIGINAL', plateId: 'ALSO_GONE' });
  assert.match(backupRefCheck(twoDish).hard[0], /^2 entries on your menus point to a plate/);
});

test('the broken-reference copy invents no fifth object noun', () => {
  const f = fixture();
  f.menu_items[0].plateId = 'GONE'; f.menu_items[0].sourcePlateId = 'GONE';
  f.kitchen_ingredients[0].pid = 'P_GONE';
  const all = backupRefCheck(f).hard.concat(backupRefCheck(f).soft).join(' | ');
  for (const banned of ['recipe', 'kitchen word', 'dish', 'menu item']) {
    assert.ok(!new RegExp(banned, 'i').test(all), `"${banned}" must not appear in user-facing copy`);
  }
});

test('a dish pointing at a missing menu is HARD for the same reason', () => {
  const f = fixture();
  f.menu_items[0].menuId = 'MENU_GONE';
  assert.ok(backupRefCheck(f).hard.some((h) => /menu that isn’t in this backup/.test(h)));
});

test('a dangling pid or kid is SOFT — it restores, and the user is told it will cost nothing', () => {
  const f = fixture();
  f.kitchen_ingredients[0].pid = 'P_GONE';
  f.plates[0].lines[1].pid = 'P_ALSO_GONE';
  const r = backupRefCheck(f);
  assert.strictEqual(r.hard.length, 0, 'a dangling pid must NOT block the restore — a flawed lifeboat beats none');
  assert.strictEqual(r.soft.length, 2);
});

test('a misc cost line carries no kid BY DESIGN and is never counted as dangling', () => {
  // {cost, misc, label} lines are legitimate — the backup audit called this out explicitly.
  const r = backupRefCheck(fixture());
  assert.deepStrictEqual(r.hard, []);
  assert.deepStrictEqual(r.soft, []);
});

test('a plate line with a kid that no ingredient defines is soft, and counted once', () => {
  const f = fixture();
  f.plates[0].lines[0].kid = 'K_GONE';
  const r = backupRefCheck(f);
  assert.strictEqual(r.hard.length, 0);
  assert.strictEqual(r.soft.length, 1);
  assert.match(r.soft[0], /1 plate line uses an ingredient/);
});

/* ---- 5. THE CONDITIONS THE DATABASE ENFORCES ------------------------------------------------
   Written against the condition, not the structure. v108's critical bug survived a thorough suite
   because its guard was pinned structurally, so these assert the PROPERTY Postgres requires rather
   than the shape of the code that currently satisfies it. Each one, if it broke, would abort a real
   restore part-way — which the migration then rolls back, so the user loses nothing but also gets
   nothing, with an opaque foreign-key error instead of a sentence. -------------------------------- */

test('CONDITION: a restored plate carries NO menu_id — the plates/menu_items FK is CIRCULAR', () => {
  // plates.menu_id -> menu_items.id is still live as a CONSTRAINT. The 20-of-78 plates that carried a
  // value on 3 Aug 2026 are now 0 (checked through the MCP, 4 Aug): v110's own restore nulled them,
  // because plateToRow omits the column and the restore reinserts every plate. Nothing resolved
  // through those values — the one dish with no plate link had no plate pointing back at it — so no
  // link was lost. The FK is what matters here, not the data: plates insert BEFORE dishes, so a plate
  // carrying a dish reference cannot be inserted at all. This pins that plateToRow keeps omitting it.
  const p = backupToPayload(fixture());
  for (const plate of p.plates) {
    assert.ok(!('menu_id' in plate), 'a restored plate must not reference a dish that does not exist yet');
  }
});

test('CONDITION: every dish reference in the payload resolves WITHIN the payload', () => {
  // Exactly what menu_items_plate_id_fkey and menu_items_menu_id_fkey check at insert time. If the
  // pre-flight check drifts from this, the user gets a rollback and a Postgres error string.
  const p = backupToPayload(fixture());
  const plateIds = new Set(p.plates.map((x) => x.id));
  const menuIds = new Set(p.menus.map((x) => x.id));
  for (const d of p.menu_items) {
    if (d.plate_id != null) assert.ok(plateIds.has(d.plate_id), `dish ${d.id} references a plate not in the payload`);
    if (d.menu_id != null) assert.ok(menuIds.has(d.menu_id), `dish ${d.id} references a menu not in the payload`);
  }
});

test('CONDITION: backupRefCheck agrees with the FK — whatever it passes, the payload resolves', () => {
  // The two must not drift: refCheck reads the FILE (camelCase), the FK sees the PAYLOAD
  // (snake_case). A file that refCheck clears must produce a payload the database will accept.
  const f = fixture();
  assert.deepStrictEqual(backupRefCheck(f).hard, []);
  const p = backupToPayload(f);
  const plateIds = new Set(p.plates.map((x) => x.id));
  assert.ok(p.menu_items.every((d) => d.plate_id == null || plateIds.has(d.plate_id)));

  // ...and the converse: a file refCheck REJECTS must be one that would have failed the FK.
  const bad = fixture();
  bad.menu_items[0].plateId = 'GONE'; bad.menu_items[0].sourcePlateId = 'GONE';
  assert.ok(backupRefCheck(bad).hard.length > 0);
  const bp = backupToPayload(bad);
  assert.ok(!new Set(bp.plates.map((x) => x.id)).has(bp.menu_items[0].plate_id), 'refCheck rejected a payload the FK would also reject');
});

test('CONDITION: the restore is ONE payload — nothing may split it into separate writes', () => {
  // Atomicity is the whole promise: a partial restore leaves plates costing from products that are
  // not there, margins still green. That promise holds only while every group travels in a single
  // rpc. If a future change fans these out into per-table calls, this fails.
  const p = backupToPayload(fixture());
  const groups = ['ingredients', 'menus', 'plates', 'menu_items', 'supplier_phrases', 'ing_price_history',
                  'menu_change_log', 'app_settings'];
  assert.deepStrictEqual(Object.keys(p).sort(), ['format'].concat(groups).sort());
  assert.ok(SRC.includes("SUPA.rpc('restore_backup'"), 'the restore must go through the single rpc');
  assert.strictEqual((SRC.match(/rpc\('restore_backup'/g) || []).length, 1, 'exactly one call site');
});

test('CONDITION: the restore repaints from the SERVER, never from the file', () => {
  // Rendering the file's own objects would show a screen that agrees with the backup whether or not
  // the write landed — the two-sources-of-truth ambiguity v108 removed.
  const fn = extractFn(SRC, 'restoreFromBackupFile');
  assert.ok(fn.includes('bootstrapSync()'), 'a successful restore must re-read from the server');
});

/* ---- 6. the migration's load-bearing details ------------------------------------------------
   These pin SQL, which the rest of this suite cannot execute. They exist because both facts are
   invisible to every test that runs as a privileged role, and both were found the hard way. ---- */

/* v114: this reads the CURRENT definition, not v110's. 20260806_restore_backup_v3.sql replaces the
   function 20260803_restore_backup_fn.sql created; the older file stays in the repo as the record of
   what ran that day, but pinning conditions against a superseded definition would assert facts about
   SQL nobody executes any more. If a later batch replaces the function again, move this path with it. */
const MIGRATION_RAW = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260806_restore_backup_v3.sql'), 'utf8');
// Strip `--` comments before matching. The comments in that file discuss both "DELETE" and
// "SECURITY DEFINER" at length — explaining why the latter is NOT used — so matching raw text
// asserts against prose rather than SQL. (My first version of these three tests did exactly that
// and failed on its own documentation.)
const MIGRATION = MIGRATION_RAW.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');

test('CONDITION: every DELETE carries a WHERE clause — safeupdate rejects bare ones', () => {
  // Supabase preloads `safeupdate` for the `authenticator` role, so a bare DELETE fails with
  // "DELETE requires a WHERE clause" — but ONLY on the client path. The `postgres` role does not
  // load it, so bare DELETEs pass in the SQL editor and through the MCP. This shipped green
  // through every SQL test and failed on the first real browser call (3 Aug 2026). `where true`
  // is load-bearing, not redundant; measured from the anon path, bare is blocked and `where true`
  // passes, so safeupdate reads the parse tree rather than the plan.
  const deletes = MIGRATION.match(/delete\s+from\s+\w+[^;]*/gi) || [];
  assert.ok(deletes.length >= 5, `expected the five replaced tables to be deleted, found ${deletes.length}`);
  for (const d of deletes) {
    assert.match(d, /\bwhere\b/i, `bare DELETE would be rejected on the client path: "${d.trim()}"`);
  }
});

test('CONDITION: ing_price_history is never deleted — the additive exception', () => {
  // A replace could only ever LOSE observations: the export caps each product at 60 points.
  const deletedTables = (MIGRATION.match(/delete\s+from\s+(\w+)/gi) || [])
    .map((d) => d.split(/\s+/).pop().toLowerCase());
  assert.ok(!deletedTables.includes('ing_price_history'), 'the price log must never be deleted');
  assert.match(MIGRATION, /not exists\s*\(select 1 from ing_price_history/i, 'inserted only where absent');
  assert.match(MIGRATION, /distinct on \(p\.product_id, p\.recorded_at\)/i,
    'DISTINCT ON guards duplicates WITHIN the payload — not-exists only sees the table');
});

/* v114 — the change log is the SECOND additive exception, and for a sharper reason than the first.
   A replace here would mean that restoring last month's backup ERASES every intervention made since:
   the silent loss of the record of what was done, while the trend line it annotates survives. That is
   the exact failure that ruled out plates.updated_at and made this table necessary at all. */
test('CONDITION: menu_change_log is never deleted, and re-restoring the same file adds nothing', () => {
  const deletedTables = (MIGRATION.match(/delete\s+from\s+(\w+)/gi) || [])
    .map((d) => d.split(/\s+/).pop().toLowerCase());
  assert.ok(!deletedTables.includes('menu_change_log'), 'the change log must never be deleted by a restore');
  assert.match(MIGRATION, /insert into menu_change_log/i);
  assert.match(MIGRATION, /on conflict \(id\) do nothing/i,
    'the client-generated id is what makes a repeated restore idempotent');
  // Absent is not an error for this group precisely BECAUSE nothing is deleted — a format-2 file has no
  // such group, and the `required` list must not have grown to include it.
  assert.ok(!/'menu_change_log'/.test((MIGRATION.match(/required\s+text\[\]\s*:=[^;]*/i) || [''])[0]),
    'menu_change_log must stay OUT of the required list — it is never deleted, so it cannot destroy anything');
  assert.match(MIGRATION, /coalesce\(payload->'menu_change_log'/i, 'an absent group restores as empty, not as a failure');
});

test('CONDITION: both live backup formats are accepted by the server, not just the newest', () => {
  // The client refuses a bad file with an explanation; the server refuses anything that reaches it
  // without one. Both must agree on WHICH formats are live, or Max's newest real backup is unrestorable.
  assert.match(MIGRATION, /not in \('2','3'\)/, 'formats 2 and 3 both restore');
});

test('CONDITION: the function stays SECURITY INVOKER — it must grant no new privilege', () => {
  // The anon key is public in index.html. A SECURITY DEFINER function here would hand every reader
  // of the page a one-call database wipe that RLS would otherwise refuse.
  assert.match(MIGRATION, /security invoker/i);
  assert.ok(!/security definer/i.test(MIGRATION), 'must never become SECURITY DEFINER');
});

/* ---- 7. the confirm copy obeys the four-noun rule ------------------------------------------- */

test('the confirm summary names only the four object nouns', () => {
  const line = backupSummary(fixture()).join(' | ');
  for (const banned of ['recipe', 'kitchen word', 'kitchen name', 'dish']) {
    assert.ok(!new RegExp(banned, 'i').test(line), `"${banned}" is forbidden as an object noun in user copy`);
  }
  for (const noun of ['product', 'ingredient', 'plate', 'menu']) assert.match(line, new RegExp(noun));
});

test('the summary counts what the file holds and agrees in number throughout', () => {
  // The confirm is the last thing read before a café's pricing is replaced. Every count in it is
  // spliced into a sentence, which is exactly where agreement rots unnoticed.
  const one = backupSummary(fixture());
  assert.ok(one.includes('2 products'), '2 products');
  assert.ok(one.includes('1 ingredient'), 'singular ingredient, not "1 ingredients"');
  assert.ok(one.includes('1 plate'), 'singular plate');
  assert.ok(one.includes('1 menu, with 1 plate on it'), 'one menu takes "it", not "them"');
  assert.ok(one.includes('1 remembered item'), 'singular remembered item');

  const f = fixture();
  f.settings.menus.push({ id: 'M2', name: 'Specials', season: null });
  f.menu_items.push({ id: 'D2', name: 'Other', menuId: 'M2', plateId: 'PL1' });
  assert.ok(backupSummary(f).includes('2 menus, with 2 plates on them'), 'plural takes "them"');
});

/* ---- 9. what a file has to LOOK like, and what the payload has to CARRY (180) ----

   Two gaps the mutation gate found in this file, both of the same shape: a refusal was pinned by its
   `ok:false` and never by WHICH refusal, and a payload group was pinned by the groups around it.

   The reason matters more than it sounds. `parseBackupFile` has five distinct refusals and each one
   tells the user something different about the file in their hand. A guard that stops working does
   not produce an error — it produces the WRONG explanation, or falls through to a TypeError in the
   middle of a restore, which is the failure mode this whole file exists to prevent. */

test('180: anything that is not a JSON OBJECT is refused as "not an EzPlate backup"', () => {
  for (const text of ['null', '42', '"a string"', '[]', '[{"stamp":{"format":2}}]', 'true']) {
    const r = parseBackupFile(text);
    assert.strictEqual(r.ok, false, `${text} must be refused`);
    assert.match(r.reason, /isn.t an EzPlate backup/, `${text} must be refused by the SHAPE check, naming what it is`);
  }
});

test('180: each stamp refusal gives the stamp reason, not some later one', () => {
  // Reaching the format check with a junk stamp means the user is told about formats when the real
  // problem is that the file predates formats entirely.
  for (const bad of [null, 'format2', 42, [], ['format', 2]]) {
    const r = parseBackupFile(json(fixture({ stamp: bad })));
    assert.strictEqual(r.ok, false, `stamp ${json(bad)} must be refused`);
    assert.match(r.reason, /backup format/i, `stamp ${json(bad)} must be refused by the STAMP check`);
  }
});

test('180: taught supplier packs are carried into the payload', () => {
  // supplier_mem is a real group with a real cost: CLAUDE.md lists taught packs as a fragile area,
  // and losing them on restore silently un-teaches every pack the user ever corrected.
  const p = backupToPayload(fixture());
  assert.equal(p.supplier_phrases.length, 1, 'the fixture has one taught pack and the payload must hold it');
  assert.equal(p.supplier_phrases[0].id, 'S1');
  assert.equal(p.supplier_phrases[0].supplier, 'Bidfood');
});

test('180: a price point missing its time or its value is DROPPED, not restored as $0.00', () => {
  const p = backupToPayload(fixture({ ing_price_log: { P0001: [
    { t: 1754179200000, v: 0.0247 },   // the only good one
    { t: null, v: 0.0247 },
    { t: 1754179200000, v: null },
    null,
  ] } }));
  assert.equal(p.ing_price_history.length, 1,
    'a null t or v would restore as a real-looking observation — the comment at that guard says so');
  assert.equal(p.ing_price_history[0].cost_per_base_unit, 0.0247);
});
