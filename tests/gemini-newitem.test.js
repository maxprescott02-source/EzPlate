/*
 * gemini-newitem.test.js — v73: the Gemini reader now also fills the invoice add-new-item form's
 * DESCRIPTIVE fields (cleanName / brand / category / supplier). Two halves, both against CANNED
 * data with no live API:
 *   - SERVER (api/_gemini.js): the widened schema/validation/prompt — new fields kept, bounded,
 *     coerced; the category list is folded into the prompt so the model reuses one.
 *   - CLIENT (gemCleanFields, sliced from js/app.js): the pure distiller that turns a validated
 *     Gemini line + the invoice header supplier into the form's clean candidates.
 *
 * Money/pack fields are untouched here — this batch is descriptive-only (see CLAUDE.md money law).
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const G = require('../api/_gemini.js');
const { gemCleanFields } = require('./_extract.js');

/* ---------------- server: validateLine keeps + bounds the descriptive fields ---------------- */

test('validateLine keeps clean descriptive fields alongside the price reading', () => {
  const v = G.validateLine({
    rawText: 'CTN 140201 #MUFFINS ENGLISH TRADITIONAL TIP TOP 6x400gr 1',
    description: 'Muffins English', derivedUnitPrice: 1.2, unitType: 'ea',
    cleanName: 'English Muffins', brand: 'Tip Top', category: 'Bakery', supplier: 'Bidfood'
  });
  assert.ok(v);
  assert.equal(v.cleanName, 'English Muffins');
  assert.equal(v.brand, 'Tip Top');
  assert.equal(v.category, 'Bakery');
  assert.equal(v.supplier, 'Bidfood');
  // and the money reading is unchanged
  assert.equal(v.derivedUnitPrice, 1.2);
});

test('validateLine nulls a missing descriptive field, never fatal', () => {
  const v = G.validateLine({ rawText: 'X', derivedUnitPrice: 2, cleanName: 'Milk' });
  assert.ok(v);
  assert.equal(v.cleanName, 'Milk');
  assert.equal(v.brand, null);       // absent → null (form falls back to deterministic)
  assert.equal(v.category, null);
});

test('validateLine rejects OVER-CAP descriptive strings (garbage, not a value)', () => {
  const v = G.validateLine({
    rawText: 'X', derivedUnitPrice: 2,
    cleanName: 'n'.repeat(121),   // > 120 cap
    brand: 'b'.repeat(61),        // > 60 cap
    category: 'c'.repeat(61)      // > 60 cap
  });
  assert.ok(v);
  assert.equal(v.cleanName, null);
  assert.equal(v.brand, null);
  assert.equal(v.category, null);
  // a value AT the cap is kept
  const ok = G.validateLine({ rawText: 'X', derivedUnitPrice: 2, brand: 'b'.repeat(60) });
  assert.equal(ok.brand.length, 60);
});

test('validateLine trims whitespace and drops empties on the descriptive fields', () => {
  const v = G.validateLine({ rawText: 'X', derivedUnitPrice: 2, cleanName: '  Tip Top Bread  ', brand: '   ' });
  assert.equal(v.cleanName, 'Tip Top Bread');
  assert.equal(v.brand, null);
});

test('validatePayload passes the descriptive fields through on surviving lines', () => {
  const out = G.validatePayload({
    supplier: 'Bidfood',
    lines: [{ rawText: 'A', derivedUnitPrice: 3, unitType: 'kg', cleanName: 'Beef Mince', category: 'Meat' }]
  });
  assert.equal(out.status, 'ok');
  assert.equal(out.lines[0].cleanName, 'Beef Mince');
  assert.equal(out.lines[0].category, 'Meat');
});

/* ---------------- server: the prompt folds in the existing category list ---------------- */

test('buildPrompt declares the new descriptive keys', () => {
  const p = G.buildPrompt('SOME INVOICE TEXT');
  assert.match(p, /cleanName/);
  assert.match(p, /"brand"/);
  assert.match(p, /"category"/);
});

test('buildPrompt folds the existing category list in and asks to PREFER one', () => {
  const p = G.buildPrompt('LINE', { categories: ['Bakery', 'Dairy', 'Meat'] });
  assert.match(p, /PREFER/);
  assert.match(p, /Bakery/);
  assert.match(p, /Dairy/);
  // no list passed → no "PREFER existing" block, but the field is still declared
  const p2 = G.buildPrompt('LINE');
  assert.ok(p2.indexOf('EXISTING categories') < 0);
  assert.match(p2, /"category"/);
});

test('buildPrompt bounds a runaway category list, drops blanks + over-long values', () => {
  const many = [];
  for (let n = 0; n < 500; n++) many.push('Cat' + n);
  const p = G.buildPrompt('LINE', { categories: many.concat(['', '  ', null, 'x'.repeat(61)]) });
  assert.match(p, /Cat0/);
  assert.ok(p.indexOf('Cat250') < 0);        // capped at 200 items
  assert.ok(p.indexOf('x'.repeat(61)) < 0);  // an over-60-char category is dropped, not embedded
});

test('buildPrompt frames the category list as untrusted label data', () => {
  const p = G.buildPrompt('LINE', { categories: ['Bakery'] });
  assert.match(p, /never instructions/);
});

test('responseSchema declares the three descriptive string fields', () => {
  const s = G.responseSchema();
  const props = s.properties.lines.items.properties;
  assert.equal(props.cleanName.type, 'STRING');
  assert.equal(props.brand.type, 'STRING');
  assert.equal(props.category.type, 'STRING');
});

/* ---------------- client: gemCleanFields (pure) ---------------- */

test('gemCleanFields maps cleanName→name and keeps brand/category', () => {
  const c = gemCleanFields(
    { cleanName: 'English Muffins', brand: 'Tip Top', category: 'Bakery', supplier: null },
    'Bidfood');
  assert.equal(c.name, 'English Muffins');
  assert.equal(c.brand, 'Tip Top');
  assert.equal(c.category, 'Bakery');
});

test('gemCleanFields prefers the per-line supplier, else the invoice header', () => {
  assert.equal(gemCleanFields({ supplier: 'PFD' }, 'Bidfood').supplier, 'PFD');   // per-line wins
  assert.equal(gemCleanFields({ supplier: null }, 'Bidfood').supplier, 'Bidfood'); // fall back to header
  assert.equal(gemCleanFields({}, null).supplier, null);                           // neither → null
});

test('gemCleanFields nulls absent/blank fields (form falls back to deterministic)', () => {
  const c = gemCleanFields({ cleanName: '   ', brand: '', category: null }, null);
  assert.equal(c.name, null);
  assert.equal(c.brand, null);
  assert.equal(c.category, null);
});

test('gemCleanFields never invents a name from the messy description (cleanName only)', () => {
  // description is deliberately NOT used for the name — it can be the raw code string
  const c = gemCleanFields({ description: 'CTN 140201 #MUFFINS', cleanName: null }, 'Bidfood');
  assert.equal(c.name, null);   // no cleanName → deterministic name stands in the form (with its plain mark)
});

test('gemCleanFields is null-safe on a missing line', () => {
  assert.equal(gemCleanFields(null, 'Bidfood'), null);
});
