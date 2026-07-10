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

/* ===== v24: the taught-pack chain rebuild (screenshot-2 bug) ===== */
const { unitToBaseFields } = require('./_extract.js');

test("cheesecake 16'S: a taught count pack on a kg-seeded product resolves per-unit with NO mismatch", () => {
  // this was the reported bug: taught pack applied but row stayed /kg + mismatch-flagged
  const raw = "CHEESECAKE LIME SWIRL PRE CUT 16'S 1-281 PRIESTLEYS 2.16kg 1 21.30 21.30 21.30 0.00 21.30";
  const row = require('./_extract.js').parsePdfLine(raw);
  resolveMatchedPrice(row, { pack_qty: 16, pack_unit: 'ea', base_unit: 'g' }, null);   // stale base_unit: 'g'
  assert.equal(row.unit, 'ea', 'must resolve per unit');
  near(row.unitPrice, 21.30 / 16, 'per slice');
  assert.equal(row.unitMismatch, false, 'a taught pack is authoritative — never flagged against a stale base unit');
  assert.equal(row.needManual, false);
  assert.equal(row.taughtQty, 16);
  assert.equal(row.taughtUnit, 'ea');
});

test('the mismatch guard still blocks PARSER guesses in the wrong unit (eggs case intact)', () => {
  const row = require('./_extract.js').parsePdfLine('1 130 Eggs - Ctn 600g $50.00 $50.00');   // parser: $/kg
  resolveMatchedPrice(row, { pack_qty: null, pack_unit: null, base_unit: 'ea' }, null);
  assert.equal(row.unitMismatch, true, 'parser-derived kg vs ea product must still flag');
  assert.equal(row.needManual, true);
});

test('unitToBaseFields: the unit a price is entered in decides how it is stored', () => {
  assert.deepEqual(unitToBaseFields('ea'), { base_unit: 'ea', cost_basis: '$/unit', div: 1 });
  assert.deepEqual(unitToBaseFields('kg'), { base_unit: 'g', cost_basis: '$/g', div: 1000 });
  assert.deepEqual(unitToBaseFields('l'),  { base_unit: 'ml', cost_basis: '$/ml', div: 1000 });
});
