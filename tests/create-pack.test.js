/*
 * create-pack.test.js — v82 D2. The manual "New product" form dropped the pack size on reopen.
 *
 * MAX'S REPRO: create a product with pack size 4 / L / pack price $20. The per-unit price saves
 * correctly ($5.00/L), but reopen the product to edit and the Pack size field is BLANK.
 *
 * ROOT CAUSE (not guessed): submitNew built the product record inline and stored pack_size_raw
 * ("4 l" — a display string) but NEVER the structured pack_qty/pack_unit fields. The edit form
 * (openIngEdit) reads p.pack_qty / p.pack_unit — which were undefined — so the field reopened empty.
 * The invoice teach path (pack-survives.test.js) always wrote pack_qty; this manual path was untested.
 *
 * The record is now built by the pure newProductRecord(), extracted and tested here so the round-trip
 * (create → the fields the edit form reads) is locked. Same shape the edit path writes/reads.
 */
const test = require('node:test');
const assert = require('node:assert');
const { newProductRecord } = require('./_extract.js');

test('D2: a product created with pack size 4 / L stores structured pack_qty + pack_unit', () => {
  const p = newProductRecord({ id: 'U1', desc: 'Olive Oil', brand: 'Cobram', supplier: 'Bidfood',
    category: 'Oils', base_unit: 'ml', cost_per_base_unit: 0.005, cost_basis: 'per_ml',
    isFood: true, packSize: '4', packUnit: 'l', packPrice: '20' });
  assert.equal(p.pack_qty, 4, 'the pack size the edit form reads back');
  assert.equal(p.pack_unit, 'l', 'the pack unit the edit form reads back');
  assert.equal(p.current_price_exgst, 20, 'pack price preserved');
  assert.equal(p.description, 'Olive Oil');
});

test('D2: openIngEdit round-trip — the exact values the edit form would display are non-empty', () => {
  const p = newProductRecord({ id: 'U2', desc: 'Eggs', brand: '', supplier: '', category: 'Dairy',
    base_unit: 'ea', cost_per_base_unit: 0.2778, cost_basis: 'per_ea',
    isFood: true, packSize: '180', packUnit: 'ea', packPrice: '50' });
  // openIngEdit sets ig_packQty = (p.pack_qty==null?'':p.pack_qty) and ig_packUnit = (p.pack_unit||'')
  assert.equal((p.pack_qty == null ? '' : p.pack_qty), 180, 'pack qty field would show 180, not blank');
  assert.equal((p.pack_unit || ''), 'ea', 'pack unit field would show ea');
});

test('D2: a blank pack size yields null pack_qty (no NaN written)', () => {
  const p = newProductRecord({ id: 'U3', desc: 'Salt', category: 'Dry', base_unit: 'kg',
    cost_per_base_unit: 1, cost_basis: 'per_kg', isFood: true, packSize: '', packUnit: '', packPrice: '3' });
  assert.equal(p.pack_qty, null, 'no pack size → null, never NaN');
  assert.equal(p.pack_unit, null);
});

test('D2: brand/supplier empty strings normalise to null (unchanged record contract)', () => {
  const p = newProductRecord({ id: 'U4', desc: 'Flour', brand: '', supplier: '', category: 'Dry',
    base_unit: 'kg', cost_per_base_unit: 1.2, cost_basis: 'per_kg', isFood: true,
    packSize: '10', packUnit: 'kg', packPrice: '12' });
  assert.strictEqual(p.brand, null);
  assert.strictEqual(p.supplier, null);
  assert.equal(p.is_food, true);
});
