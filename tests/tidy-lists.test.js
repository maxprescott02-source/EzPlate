/*
 * tidy-lists.test.js — locks in the v40 Item 3 pure core (Tidy lists).
 *
 * Categories/brands/suppliers are values on products, not their own tables. Rename,
 * merge and clear therefore all mean "edit that value across every product carrying
 * it". These tests pin the value inventory (counts) and the patch planner against the
 * REAL shipped functions, brace-extracted from js/app.js.
 *
 * Contract:
 *   - tidyFieldValues: distinct non-empty values with correct counts, most-used first
 *   - rename: exactly N patches (one per product carrying the old value), each -> new value
 *   - merge: identical patch semantics to rename, but flagged isMerge
 *   - rename ONTO an existing value is itself flagged isMerge (it's a merge in disguise)
 *   - clear: nulls the value on every product carrying it
 *   - a value nobody uses plans zero patches
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`tidy-lists: function not found -> ${name}. app.js changed; update tests/tidy-lists.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`tidy-lists: unbalanced braces for ${name}`);
}

// Extract TIDY_FIELDS + the four pure functions and run them in isolation.
const TIDY_FIELDS_LINE = (SRC.match(/var TIDY_FIELDS=\{[^}]*\};/) || [])[0];
if (!TIDY_FIELDS_LINE) throw new Error('tidy-lists: TIDY_FIELDS declaration not found; update tests/tidy-lists.test.js');
// eslint-disable-next-line no-new-func
const T = new Function(`
  "use strict";
  ${extractFn(SRC, 'normSupplier')}
  ${TIDY_FIELDS_LINE}
  ${extractFn(SRC, 'tidyFieldCol')}
  ${extractFn(SRC, 'tidyFieldValues')}
  ${extractFn(SRC, 'tidyValueExists')}
  ${extractFn(SRC, 'tidyPlan')}
  ${extractFn(SRC, 'tidyValuesCombined')}
  ${extractFn(SRC, 'tidyPlanAll')}
  ${extractFn(SRC, 'tidySupplierMemMigration')}
  return { tidyFieldValues, tidyValueExists, tidyPlan, tidyValuesCombined, tidyPlanAll, tidySupplierMemMigration };
`)();

// A little product set. UI "Products" = PRODUCTS internally (the naming inversion).
const PRODUCTS = [
  { id: 'P1', category: 'BAKERY', brand: 'Tip Top', supplier: 'Bidfood' },
  { id: 'P2', category: 'BAKERY', brand: 'Tip Top', supplier: 'Bidfood' },
  { id: 'P3', category: 'Bakery', brand: 'Golden', supplier: 'PFD' },      // note: different case, counts as its own value
  { id: 'P4', category: 'DAIRY', brand: '', supplier: null },              // empty/null are ignored by the inventory
  { id: 'P5', category: 'DAIRY', brand: 'Mainland', supplier: 'Bidfood' },
];

test('v40 item 3: inventory counts distinct non-empty values, most-used first', () => {
  const cats = T.tidyFieldValues(PRODUCTS, 'category');
  assert.deepStrictEqual(cats, [
    { value: 'BAKERY', count: 2 },
    { value: 'DAIRY', count: 2 },
    { value: 'Bakery', count: 1 },
  ], 'BAKERY(2) and DAIRY(2) before Bakery(1); ties broken A-Z');
  const sup = T.tidyFieldValues(PRODUCTS, 'supplier');
  assert.deepStrictEqual(sup, [
    { value: 'Bidfood', count: 3 },
    { value: 'PFD', count: 1 },
  ], 'null/empty suppliers are not counted');
});

test('v40 item 3: rename produces exactly one patch per product carrying the old value', () => {
  const plan = T.tidyPlan(PRODUCTS, 'category', 'rename', 'BAKERY', 'Bread');
  assert.strictEqual(plan.patches.length, 2, 'two products carry BAKERY');
  assert.deepStrictEqual(plan.patches.map(p => p.id).sort(), ['P1', 'P2']);
  assert.ok(plan.patches.every(p => p.value === 'Bread' && p.field === 'category'));
  assert.strictEqual(plan.isMerge, false, '"Bread" does not exist yet -> a plain rename');
});

test('v40 item 3: rename ONTO an existing value is flagged as a merge', () => {
  // rename "Bakery" (P3) onto the existing "BAKERY"
  const plan = T.tidyPlan(PRODUCTS, 'category', 'rename', 'Bakery', 'BAKERY');
  assert.strictEqual(plan.isMerge, true, 'target already exists -> merge');
  assert.deepStrictEqual(plan.patches.map(p => p.id), ['P3']);
  assert.strictEqual(plan.patches[0].value, 'BAKERY');
});

test('v40 item 3: merge has identical patch semantics to rename and is always a merge', () => {
  const rename = T.tidyPlan(PRODUCTS, 'supplier', 'rename', 'PFD', 'Bidfood');
  const merge = T.tidyPlan(PRODUCTS, 'supplier', 'merge', 'PFD', 'Bidfood');
  assert.deepStrictEqual(merge.patches, rename.patches, 'merge patches == rename patches');
  assert.strictEqual(merge.isMerge, true);
  assert.strictEqual(merge.patches.length, 1);
  assert.strictEqual(merge.patches[0].value, 'Bidfood');
});

test('v40 item 3: clear nulls the value on every product carrying it', () => {
  const plan = T.tidyPlan(PRODUCTS, 'supplier', 'clear', 'Bidfood');
  assert.strictEqual(plan.patches.length, 3, 'three products supplied by Bidfood');
  assert.ok(plan.patches.every(p => p.value === null), 'clear sets the field to null');
  assert.strictEqual(plan.to, null);
  assert.strictEqual(plan.isMerge, false);
});

test('v40 item 3: a value nobody uses plans zero patches', () => {
  const plan = T.tidyPlan(PRODUCTS, 'brand', 'rename', 'Nonexistent', 'Whatever');
  assert.strictEqual(plan.patches.length, 0);
});

test('v40 item 3: tidyValueExists distinguishes present vs absent (case-sensitive, matches the stored value)', () => {
  assert.strictEqual(T.tidyValueExists(PRODUCTS, 'brand', 'Tip Top'), true);
  assert.strictEqual(T.tidyValueExists(PRODUCTS, 'brand', 'tip top'), false, 'values are matched exactly, not case-folded');
  assert.strictEqual(T.tidyValueExists(PRODUCTS, 'brand', ''), false);
});

// supplier memory (taught packs) must follow a supplier rename, or the packs are orphaned
const MEM = {
  'bidfood|chips straight': { id: 'bidfood|chips straight', supplier: 'Bidfood', phrase_norm: 'chips straight', qty: 2.5, unit: 'kg', pid: 'P0108' },
  'bidfood|cheese slices':  { id: 'bidfood|cheese slices',  supplier: 'Bidfood', phrase_norm: 'cheese slices',  qty: 105,  unit: 'ea', pid: 'P0200' },
  'pfd|bread white':        { id: 'pfd|bread white',        supplier: 'PFD',     phrase_norm: 'bread white',    qty: 1,    unit: 'ea', pid: 'P0300' },
};

test('v40 item 3: renaming a supplier re-keys its taught packs onto the new name (nothing orphaned)', () => {
  const moves = T.tidySupplierMemMigration(MEM, 'Bidfood', 'Bidfood Foodservice');
  assert.strictEqual(moves.length, 2, 'both Bidfood memories move; PFD untouched');
  const chips = moves.find(m => m.oldId === 'bidfood|chips straight');
  assert.strictEqual(chips.newId, 'bidfood foodservice|chips straight', 'new id = memKey(newName, phrase)');
  assert.strictEqual(chips.supplier, 'Bidfood Foodservice');
  assert.strictEqual(chips.qty, 2.5);
  assert.strictEqual(chips.unit, 'kg');
  assert.strictEqual(chips.pid, 'P0108');
  assert.ok(!moves.some(m => m.oldId.startsWith('pfd')), 'a different supplier is not touched');
});

test('v40 item 3: merging a supplier into an existing one re-keys onto that supplier', () => {
  const moves = T.tidySupplierMemMigration(MEM, 'PFD', 'Bidfood');
  assert.strictEqual(moves.length, 1);
  assert.strictEqual(moves[0].newId, 'bidfood|bread white');
  assert.strictEqual(moves[0].supplier, 'Bidfood');
});

test('v40 item 3: clearing a supplier drops its taught packs (no home to key them under)', () => {
  const moves = T.tidySupplierMemMigration(MEM, 'Bidfood', null);
  assert.strictEqual(moves.length, 2);
  assert.ok(moves.every(m => m.drop === true && m.newId === null), 'cleared supplier memories are dropped');
});

/* v59 item 6b: the Category picker spans products AND plate categories (Max's call). */
const PLATES = [
  { id: 'SP1', name: 'Ham Toastie', category: 'BAKERY' },
  { id: 'SP2', name: 'Cheese Toastie', category: 'BAKERY' },
  { id: 'SP3', name: 'Milkshake', category: 'DRINKS' },
];

test('v59: tidyValuesCombined merges product + plate counts for Category', () => {
  const cats = T.tidyValuesCombined(PRODUCTS, PLATES, 'category');
  const bakery = cats.find(c => c.value === 'BAKERY');
  assert.deepStrictEqual({ products: bakery.products, plates: bakery.plates, count: bakery.count }, { products: 2, plates: 2, count: 4 });
  const drinks = cats.find(c => c.value === 'DRINKS');
  assert.deepStrictEqual({ products: drinks.products, plates: drinks.plates, count: drinks.count }, { products: 0, plates: 1, count: 1 }, 'a plate-only category still appears');
});

test('v59: Brand/Supplier stay product-only (plates carry neither)', () => {
  const brands = T.tidyValuesCombined(PRODUCTS, PLATES, 'brand');
  assert.ok(brands.every(b => b.plates === 0), 'no plate side for brand');
});

test('v59: tidyPlanAll renames a Category across BOTH products and plates in one plan', () => {
  const plan = T.tidyPlanAll(PRODUCTS, PLATES, 'category', 'rename', 'BAKERY', 'Bakery & Bread');
  assert.strictEqual(plan.productPatches.length, 2, 'both BAKERY products patched');
  assert.strictEqual(plan.platePatches.length, 2, 'both BAKERY plates patched');
  assert.strictEqual(plan.count, 4);
  assert.ok(plan.productPatches.every(p => p.value === 'Bakery & Bread'));
  assert.ok(plan.platePatches.every(p => p.value === 'Bakery & Bread'));
});

test('v59: tidyPlanAll clear nulls the Category on products and plates', () => {
  const plan = T.tidyPlanAll(PRODUCTS, PLATES, 'category', 'clear', 'DRINKS', null);
  assert.strictEqual(plan.productPatches.length, 0, 'no product carries DRINKS');
  assert.strictEqual(plan.platePatches.length, 1);
  assert.strictEqual(plan.platePatches[0].value, null);
});

test('v59: tidyPlanAll leaves plates untouched for Brand/Supplier', () => {
  const plan = T.tidyPlanAll(PRODUCTS, PLATES, 'supplier', 'rename', 'Bidfood', 'Bidfood AU');
  assert.strictEqual(plan.platePatches.length, 0, 'plates have no supplier');
  assert.ok(plan.productPatches.length > 0);
});
