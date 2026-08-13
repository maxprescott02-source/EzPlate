/*
 * row-boundary.test.js — v108: the ONE layer where a Supabase row becomes an in-memory object.
 *
 * WHY THIS FILE EXISTS. Before v108 the row/model translation ran on sync only, at a handful of
 * sites. With the server as the source of truth every read crosses it, and the failure mode is
 * uniquely nasty: a missed field does not throw, it arrives `undefined`, and the damage presents as
 * a missing RELATIONSHIP rather than a naming bug. That is exactly how the v106 backup audit found
 * `menu_items` being exported camelCase against snake_case columns — silently, on 76 of 77 dishes,
 * with every row present and nothing connected.
 *
 * The contracts pinned here:
 *   1. menu_items round-trips. row -> model -> row preserves menu_id / plate_id / is_custom. This is
 *      the one that was actually broken in the export.
 *   2. NO camelCase key can reach a row. A structural guard over every *ToRow mapper, so a future
 *      leak fails here instead of in production. This is the inversion guard for the data layer.
 *   3. v55 plate linking survives: rowToMenu prefers plate_id and falls back to source_plate_id;
 *      menuToRow mirrors plate_id into source_plate_id for the rollout.
 *   4. A history point that cannot be parsed is DROPPED, never admitted as NaN. A NaN `t` sorts
 *      unpredictably and would poison every chart and band downstream.
 *   5. Numeric and jsonb columns normalise: numbers stay numbers, a null search_aliases becomes [].
 *
 * All of it runs the REAL shipped mappers, brace-extracted from js/app.js — no second copy.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

const MAPPERS = [
  'ingredientToRow', 'rowToIngredient',
  'rowToMenu', 'menuToRow',
  'rowToPlate', 'plateToRow',
  'rowToMenuRecord', 'menuRecordToRow',
  'rowToSupplierPhrase', 'supplierPhraseToRow',
  'rowToPoint', 'pointToRow', 'rowsToSeries',
];

// eslint-disable-next-line no-new-func
const B = new Function(`
  "use strict";
  /* BASE_IDS is the app's set of built-in product ids; ingredientToRow derives is_custom from it.
     Declared here rather than mirrored from the literal — the tests below only care that the
     DERIVATION is right, not which ids happen to be built in. */
  var BASE_IDS = new Set(['P0001', 'P0007']);
  ${MAPPERS.map((n) => extractFn(SRC, n)).join('\n  ')}
  return { ${MAPPERS.join(', ')}, BASE_IDS };
`)();

/* ---------- 1. the crossing that was actually broken ---------- */

test('menu_items round-trips row -> model -> row with every link intact', () => {
  const row = {
    id: 'MI7', section: 'Mains', name: 'Cod & Chips', price: 24.5, notes: 'gf',
    is_custom: true, menu_id: 'MENU_WINTER', plate_id: 'PL3', source_plate_id: 'PL3',
  };
  const model = B.rowToMenu(row);
  // the model side is camelCase — this is the boundary, so both spellings are correct in their place
  assert.strictEqual(model.menuId, 'MENU_WINTER');
  assert.strictEqual(model.plateId, 'PL3');
  assert.strictEqual(model.custom, true);

  const back = B.menuToRow(model);
  assert.strictEqual(back.menu_id, 'MENU_WINTER', 'menu_id must survive the round trip');
  assert.strictEqual(back.plate_id, 'PL3', 'plate_id must survive — this is the link the audit found broken');
  assert.strictEqual(back.is_custom, true);
  assert.strictEqual(back.name, 'Cod & Chips');
  assert.strictEqual(back.notes, 'gf', 'notes survive too — see the note below on why this line is here');
});

/* 184 added the two assertions below, and they are here because the MUTATION GATE found the gaps, not
   because anyone read the code and spotted them. `menuToRow` became a gate target the day its menu_id
   fallback was fixed, and its first run reported two survivors — two lines that could be broken with
   row-boundary.test.js, the file named as pinning them, staying green:

   - `pid=(item.plateId||item.sourcePlateId||null)` flipped to `&&` yields null whenever a dish carries
     the canonical plateId and no legacy sourcePlateId, which is EVERY dish written since v55. That is
     the write side of the exact failure that once cost 76 of 77 dishes: every row present, no plate
     link, no error raised.
   - `notes:item.notes||null` flipped to `&&` silently drops every note.

   The round trip above used only rows where plateId and sourcePlateId were the SAME value, so the
   fallback could not be distinguished from the primary. That is the shape to watch for: a fixture
   whose fields agree cannot tell you which one the code read. */
test('184: the plate link survives when only the CANONICAL plateId is set (v55 shape)', () => {
  const modern = B.menuToRow({ id: 'MI8', name: 'x', price: 1, menuId: 'MENU-w', plateId: 'PL9' });
  assert.strictEqual(modern.plate_id, 'PL9', 'a dish with no legacy sourcePlateId must still keep its link');
  assert.strictEqual(modern.source_plate_id, 'PL9', 'and the legacy column mirrors it, as v55 rolled out');

  const legacyOnly = B.menuToRow({ id: 'MI9', name: 'x', price: 1, menuId: 'MENU-w', sourcePlateId: 'PL7' });
  assert.strictEqual(legacyOnly.plate_id, 'PL7', 'the legacy field is the FALLBACK, and must still resolve');

  const unlinked = B.menuToRow({ id: 'MI10', name: 'x', price: 1, menuId: 'MENU-w' });
  assert.strictEqual(unlinked.plate_id, null, 'an unlinked row is null, never undefined');
});

test('184: notes survive the write, and their absence is null rather than undefined', () => {
  assert.strictEqual(B.menuToRow({ id: 'M', name: 'x', price: 1, notes: 'no onion' }).notes, 'no onion');
  assert.strictEqual(B.menuToRow({ id: 'M', name: 'x', price: 1 }).notes, null);
  assert.strictEqual(B.menuToRow({ id: 'M', name: 'x', price: 1, notes: '' }).notes, null, 'blank is not a note');
});

/* 184: this pinned the OPPOSITE — "falls back to MENU_ORIGINAL, not undefined" — and the write half of
   that fallback was a foreign key violation waiting for a second cafe. menu_items.menu_id references
   menus(id); 'MENU_ORIGINAL' is a row only Scoopy's has, so the round trip below used to MINT a
   reference to another tenant's menu out of a null. The boundary's job is to translate, not to invent:
   null in, null out, in both directions. `undefined` is still forbidden — a row must never carry it. */
test('184: a dish with no menu_id maps to null in BOTH directions, and never undefined', () => {
  const model = B.rowToMenu({ id: 'MI1', name: 'x', price: 1, menu_id: null, plate_id: null });
  assert.strictEqual(model.menuId, null);
  assert.strictEqual(B.menuToRow(model).menu_id, null);
  assert.ok('menu_id' in B.menuToRow(model), 'the column is still named — null is a value, not an omission');
});

/* ---------- 2. the structural guard: no camelCase may reach a row ---------- */

test('no *ToRow mapper can emit a camelCase key', () => {
  const rows = [
    B.ingredientToRow({ id: 'P0001', description: 'd', search_aliases: [] }),
    B.menuToRow({ id: 'MI1', name: 'n', price: 1, menuId: 'M1', plateId: 'PL1' }),
    B.plateToRow({ id: 'PL1', name: 'n', lines: [] }),
    B.menuRecordToRow({ id: 'M1', name: 'n' }),
    B.supplierPhraseToRow({ id: 'S1', supplier: 'Bidfood', phrase_norm: 'p', qty: 1, unit: 'kg' }),
    B.pointToRow(0, 1, 'price', 'menu_item_id', 'MI1'),
  ];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      assert.ok(!/[A-Z]/.test(key),
        `column "${key}" carries a capital — a camelCase model field leaked into a row write`);
    }
  }
});

test('every model field that changes name is covered in BOTH directions', () => {
  // The enumerated crossings, from the boundary section's own comment. If a pair is added to the
  // app and not here, this list is what tells the next reader it was considered.
  const crossings = [
    ['menu_items', 'is_custom', 'custom'],
    ['menu_items', 'menu_id', 'menuId'],
    ['menu_items', 'plate_id', 'plateId'],
    ['menu_items', 'source_plate_id', 'sourcePlateId'],
  ];
  const row = { id: 'MI1', name: 'n', price: 1, is_custom: true, menu_id: 'M1', plate_id: 'PL1', source_plate_id: 'PL1' };
  const model = B.rowToMenu(row);
  const back = B.menuToRow(model);
  for (const [, col, field] of crossings) {
    assert.ok(field in model, `model is missing "${field}" — the read direction dropped it`);
    assert.ok(col in back, `row is missing "${col}" — the write direction dropped it`);
  }
});

/* ---------- 3. v55 plate linking ---------- */

test('rowToMenu prefers plate_id but falls back to source_plate_id (v55 unmigrated rows)', () => {
  const canonical = B.rowToMenu({ id: 'A', plate_id: 'NEW', source_plate_id: 'OLD' });
  assert.strictEqual(canonical.plateId, 'NEW', 'plate_id is canonical and must win');
  const legacy = B.rowToMenu({ id: 'B', plate_id: null, source_plate_id: 'OLD' });
  assert.strictEqual(legacy.plateId, 'OLD', 'a row not yet migrated still resolves through the fallback');
});

test('menuToRow mirrors plate_id into source_plate_id (v55 rollout)', () => {
  const row = B.menuToRow({ id: 'A', name: 'n', price: 1, plateId: 'PL9' });
  assert.strictEqual(row.plate_id, 'PL9');
  assert.strictEqual(row.source_plate_id, 'PL9', 'the mirror keeps a v54 device resolving the plate');
});

/* ---------- 4. history points: drop, never NaN ---------- */

test('rowToPoint converts recorded_at to epoch ms and names the value column', () => {
  const pt = B.rowToPoint({ recorded_at: '2026-07-15T01:31:16.608Z', avg_food_cost_pct: 31.5 }, 'avg_food_cost_pct');
  assert.strictEqual(pt.t, Date.parse('2026-07-15T01:31:16.608Z'));
  assert.strictEqual(pt.v, 31.5);
});

test('an unparseable point is DROPPED, not admitted as NaN', () => {
  assert.strictEqual(B.rowToPoint({ recorded_at: 'not-a-date', price: 5 }, 'price'), null);
  assert.strictEqual(B.rowToPoint({ recorded_at: '2026-07-15T00:00:00Z', price: null }, 'price'), null);
  assert.strictEqual(B.rowToPoint({ recorded_at: '2026-07-15T00:00:00Z', price: 'abc' }, 'price'), null);
});

test('rowsToSeries groups by key, and a dropped point never reaches the series', () => {
  const rows = [
    { menu_item_id: 'A', recorded_at: '2026-07-15T00:00:00Z', price: 10 },
    { menu_item_id: 'A', recorded_at: '2026-07-16T00:00:00Z', price: 11 },
    { menu_item_id: 'B', recorded_at: '2026-07-15T00:00:00Z', price: 20 },
    { menu_item_id: 'B', recorded_at: 'garbage', price: 21 },
    { menu_item_id: null, recorded_at: '2026-07-15T00:00:00Z', price: 30 },
  ];
  const series = B.rowsToSeries(rows, 'price', 'menu_item_id');
  assert.strictEqual(series.A.length, 2);
  assert.strictEqual(series.B.length, 1, 'the unparseable point is gone, the good one stays');
  assert.ok(!('null' in series) && !(null in series), 'a null key must not become a series');
  assert.ok(series.A.every((p) => isFinite(p.t) && isFinite(p.v)));
});

test('rowsToSeries with no key column returns a flat array (the all-menus series)', () => {
  const flat = B.rowsToSeries(
    [{ recorded_at: '2026-07-15T00:00:00Z', avg_food_cost_pct: 30 }], 'avg_food_cost_pct', null,
  );
  assert.ok(Array.isArray(flat));
  assert.strictEqual(flat[0].v, 30);
});

test('pointToRow accepts epoch ms OR an ISO string and always writes ISO', () => {
  const ms = Date.parse('2026-07-15T01:31:16.608Z');
  assert.strictEqual(B.pointToRow(ms, 1, 'price').recorded_at, '2026-07-15T01:31:16.608Z');
  assert.strictEqual(B.pointToRow('2026-07-15T01:31:16.608Z', 1, 'price').recorded_at, '2026-07-15T01:31:16.608Z');
});

test('pointToRow puts the value under the named column and omits the key when there is none', () => {
  const withKey = B.pointToRow(0, 9, 'cost_per_base_unit', 'product_id', 'P0004');
  assert.strictEqual(withKey.cost_per_base_unit, 9);
  assert.strictEqual(withKey.product_id, 'P0004');
  const noKey = B.pointToRow(0, 9, 'avg_food_cost_pct');
  assert.strictEqual(noKey.avg_food_cost_pct, 9);
  assert.strictEqual(Object.keys(noKey).length, 2, 'no stray null key column on the all-menus series');
});

/* ---------- 5. column normalisation ---------- */

test('rowToIngredient keeps numbers numeric and defaults a null search_aliases to []', () => {
  const p = B.rowToIngredient({
    id: 'P0004', description: 'Bacon', cost_per_base_unit: 0.0122,
    current_price_exgst: 30.5, pack_qty: null, search_aliases: null, is_food: true,
  });
  assert.strictEqual(typeof p.cost_per_base_unit, 'number');
  assert.strictEqual(p.cost_per_base_unit, 0.0122, 'the stored cost must stay EXACT — never rounded');
  assert.deepStrictEqual(p.search_aliases, [], 'a null jsonb must not reach the search index as null');
  assert.strictEqual(p.pack_qty, null, 'null pack_qty stays null — it is inert, not zero (v106)');
});

test('rowToIngredient treats a missing is_food as true, matching ingredientToRow', () => {
  assert.strictEqual(B.rowToIngredient({ id: 'X', description: 'd' }).is_food, true);
  assert.strictEqual(B.rowToIngredient({ id: 'X', description: 'd', is_food: false }).is_food, false);
});

/* v108 phase 2 REPLACED this pin. It used to assert that ingredientToRow derived is_custom from
   BASE_IDS and that rowToIngredient did NOT carry it back. Both halves died with the literal:
   there is no BASE_IDS to derive from, so the flag can only survive by round-tripping. It is the
   only remaining record of which rows the user made, and nothing renders it. */
test('is_custom round-trips unchanged now that BASE_IDS is gone', () => {
  const baseRow = { id: 'P0001', description: 'Apple Pie', is_custom: false };
  assert.strictEqual(B.rowToIngredient(baseRow).is_custom, false);
  assert.strictEqual(B.ingredientToRow(B.rowToIngredient(baseRow)).is_custom, false,
    'a base product must not be relabelled custom by a read/write cycle');

  const customRow = { id: 'CX99', description: 'Mine', is_custom: true };
  assert.strictEqual(B.ingredientToRow(B.rowToIngredient(customRow)).is_custom, true);
});

test('a product the app is CREATING defaults to custom', () => {
  // newProductRecord output has no is_custom — it has never been to the server. Defaulting the other
  // way would file a user's own product as part of the built-in catalogue.
  assert.strictEqual(B.ingredientToRow({ id: 'CXnew', description: 'Just made' }).is_custom, true);
});

test('plates and menus cross with no case change at all', () => {
  const plate = { id: 'PL1', name: 'Cod & Chips', lines: [{ kid: 'K1', qty: 20 }], category: 'Mains' };
  assert.deepStrictEqual(B.rowToPlate(B.plateToRow(plate)), plate);
  const menu = { id: 'MENU_ORIGINAL', name: 'Original', season: null };
  assert.deepStrictEqual(B.rowToMenuRecord(B.menuRecordToRow(menu)), menu);
});

test('a plate row with a null lines column becomes [], never null', () => {
  assert.deepStrictEqual(B.rowToPlate({ id: 'PL1', name: 'n', lines: null }).lines, []);
});

test('supplier phrases round-trip, and qty comes back numeric', () => {
  const e = { id: 'S1', supplier: 'Bidfood', phrase_norm: 'cheese slices', qty: 105, unit: 'ea' };
  const back = B.rowToSupplierPhrase(B.supplierPhraseToRow(e));
  assert.strictEqual(back.qty, 105);
  assert.strictEqual(typeof back.qty, 'number');
  assert.strictEqual(back.supplier, 'Bidfood', 'the supplier is the memory key — it must not drift (v107)');
});

/* ---------- 6. the fields the round-trip tests do not look at (180) ----------

   rowToMenu is five fallbacks on one line, and two of them were unpinned: the mutation gate turned
   `r.notes||''` and `r.source_plate_id||null` into `&&`, which discards the value in both cases, and
   nothing here failed. Both are load-bearing at the boundary CLAUDE.md calls out — `buildBackup`
   dumps these in-memory objects verbatim, so a field this mapper drops is a field the backup file
   does not contain and a restore cannot put back. */

test('180: notes survive the boundary, and a null one arrives as an empty string', () => {
  const withNotes = B.rowToMenu({ id: 'MI1', name: 'Fish & Chips', price: 22, notes: 'no lemon' });
  assert.strictEqual(withNotes.notes, 'no lemon', 'a dish note is user-authored content, not decoration');

  const without = B.rowToMenu({ id: 'MI2', name: 'Chips', price: 6, notes: null });
  assert.strictEqual(without.notes, '', 'null becomes the empty string the editor can render');
});

test('180: sourcePlateId is carried through in its OWN right, not only as a plateId fallback', () => {
  // plateId falls back to source_plate_id, so a test that reads only plateId cannot tell whether
  // sourcePlateId itself survived. It has to: it is the legacy link, and dropping it here would
  // rewrite it out of the next backup with every row still apparently present.
  const m = B.rowToMenu({ id: 'MI3', plate_id: 'NEW', source_plate_id: 'OLD' });
  assert.strictEqual(m.plateId, 'NEW');
  assert.strictEqual(m.sourcePlateId, 'OLD', 'both links are preserved, not collapsed into one');

  assert.strictEqual(B.rowToMenu({ id: 'MI4', plate_id: null, source_plate_id: null }).sourcePlateId, null);
});
