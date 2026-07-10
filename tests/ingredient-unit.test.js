/*
 * ingredient-unit.test.js — item 7 regression: when a product's pack is taught as a
 * COUNT (e.g. Cheese Slices Tasty 105'S -> 105 units), the invoice-side derivation and
 * the unit category must resolve to per-unit, not per-kg. Locks in derivePackPrice +
 * unitCatCategory behaviour that the ingredient-edit "pack drives unit" fix relies on.
 */
const test = require('node:test');
const assert = require('node:assert');
const { derivePackPrice, resolveMatchedPrice, unitCatCategory } = require('./_extract.js');
const near = (a, b, m) => assert.ok(Math.abs(a - b) < 0.01, `${m}: expected ~${b}, got ${a}`);

test('cheese 105 units: a count pack derives a per-UNIT price, not per-kg', () => {
  // invoice pack price $21.29; taught pack = 105 units
  const d = derivePackPrice('218662 #CHEESE SLICES TASTY 105\'S YARDE FARM 1.5kg PKT 1 21.29 21.29 21.29 0.00 21.29', 105, 'ea');
  assert.equal(d.unit, 'ea', 'must be per unit');
  near(d.unitPrice, 21.29 / 105, 'per slice ~$0.2028');
});

test('a taught ea pack against a kg-seeded product resolves to ea (no false mismatch when both are ea)', () => {
  const row = { name: 'Cheese', raw: 'CHEESE SLICES TASTY 105\'S 1 21.29 21.29', unit: 'kg', unitPrice: 14.19, needManual: false };
  // once the product's own pack is ea, base_unit should be ea too (the edit-modal fix) -> consistent, no mismatch
  resolveMatchedPrice(row, { pack_qty: 105, pack_unit: 'ea', base_unit: 'ea' }, null);
  assert.equal(row.unit, 'ea');
  assert.equal(row.unitMismatch, false);
  near(row.unitPrice, 21.29 / 105, 'per slice');
});

test('unitCatCategory: g/kg -> kg, ml/l -> l, ea -> ea', () => {
  assert.equal(unitCatCategory('g'), 'kg');
  assert.equal(unitCatCategory('ea'), 'ea');
  assert.equal(unitCatCategory('ml'), 'l');
});
