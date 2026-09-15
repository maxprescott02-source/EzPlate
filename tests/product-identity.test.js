/*
 * product-identity.test.js (267, queue item 57) — ONE product identity line, and one casing system.
 *
 * THE DEFECT: a product was written four ways within one click of itself. You picked
 * `→ CHEDDAR CHEESE BLOCK 2KG` out of the builder's ingredient search, and the row that search
 * produced said `→ Cheddar Cheese Block 2kg · Bega`. Same object, two typographic voices, one click
 * apart — plus a third on the Ingredients screen (`Product — Brand · Supplier`) and a fourth in the
 * link picker, where the brand AND the unit cost were both in capitals.
 *
 * `productIdentity` / `productIdentityMeta` are the one definition of the format. They are pure, so
 * they are EXTRACTED and executed here rather than mirrored — a stub written from the same belief as
 * the code passes against the defect it was written to catch.
 *
 * ⚠️ THE FIXTURE'S FIELDS ALL DIFFER, deliberately (roster 184(b)): a fixture whose fields agree
 * cannot tell you which one the code read, so a `p.brand` accidentally printed where `p.supplier`
 * belongs would be invisible against `{brand:'X', supplier:'X'}`.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const root = path.join(__dirname, '..');
const src = loadApp();
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

// eslint-disable-next-line no-new-func
const identity = new Function(`"use strict";
  ${extractFn(src, 'productIdentityMeta')}
  ${extractFn(src, 'productIdentity')}
  return { productIdentity: productIdentity, productIdentityMeta: productIdentityMeta };`)();
const { productIdentity, productIdentityMeta } = identity;

const FULL = { description: 'Chips 10mm Straight Cut', brand: 'Safries', supplier: 'Bidfood' };

test('all three parts, in order, with the em dash before the metadata and the dot inside it', () => {
  assert.equal(productIdentity(FULL), 'Chips 10mm Straight Cut — Safries · Bidfood');
  assert.equal(productIdentityMeta(FULL), 'Safries · Bidfood');
});

test('brand but no supplier — no dangling middle dot', () => {
  assert.equal(productIdentity({ description: 'Eggs 600g', brand: 'Sunny Queen' }), 'Eggs 600g — Sunny Queen');
  assert.equal(productIdentityMeta({ description: 'Eggs 600g', brand: 'Sunny Queen' }), 'Sunny Queen');
});

test('supplier but no brand — the supplier takes the metadata slot, not a second separator', () => {
  /* 411 of 412 products carry a brand and 19 carry a supplier, so this combination is rare and is
     exactly the one a hand-written concatenation gets wrong. The old kingProductLabel produced
     "Eggs · Bidfood" here — a middle dot with nothing on its left inside the metadata. */
  assert.equal(productIdentity({ description: 'Eggs', supplier: 'Bidfood' }), 'Eggs — Bidfood');
  assert.equal(productIdentityMeta({ description: 'Eggs', supplier: 'Bidfood' }), 'Bidfood');
});

test('neither — the product name alone, with no trailing separator', () => {
  assert.equal(productIdentity({ description: 'Eggs' }), 'Eggs');
  assert.equal(productIdentityMeta({ description: 'Eggs' }), '');
});

test('empty strings are absent, not printable — a blank brand must not earn a separator', () => {
  assert.equal(productIdentity({ description: 'Eggs', brand: '', supplier: '' }), 'Eggs');
  assert.equal(productIdentityMeta({ description: 'Eggs', brand: '', supplier: '' }), '');
});

test('a missing product is the empty string, never "undefined" on screen', () => {
  assert.equal(productIdentity(null), '');
  assert.equal(productIdentity(undefined), '');
  assert.equal(productIdentityMeta(null), '');
});

test('a product with no description falls back to its metadata rather than a leading separator', () => {
  assert.equal(productIdentity({ brand: 'Safries', supplier: 'Bidfood' }), 'Safries · Bidfood');
});

/* ============================================================================
   The call sites — the half that makes the helper worth having.
   ============================================================================ */

test('every surface that prints a product BESIDE another one goes through the shared builder', () => {
  /* Source assertions, and they are honest about what they can see: these six sites are where the
     four voices lived. A site that hand-rolls `p.description + ' — ' + p.brand` again is what this
     catches, because that is precisely how the four voices arose in the first place — each was
     correct when it was written, and none knew about the others. */
  for (const fn of ['renderDrop', 'kingProductLabel', 'renderKingCreateSuggest', 'renderKingProdDrop']) {
    assert.match(extractFn(src, fn), /productIdentity(Meta)?\(/,
      `${fn} must build its product line from the shared helper`);
  }
  assert.match(extractFn(src, 'renderPlate'), /productIdentity\(p\)/,
    'the builder row prints the SAME line the search dropdown offered a click earlier');
});

test('the two deliberate refusals stay refused, and are not "missed" call sites', () => {
  /* renderIngredients is a COLUMN TABLE (mock §3.5): brand, category and supplier are separate cells
     because the columns are the design. printDocketFor is a kitchen prep sheet: a chef wants the name
     they cook with, not the distributor's. Both are recorded at the helper's own site; this pins that
     a later "consistency" pass cannot quietly collapse either into a sentence. */
  assert.ok(!/productIdentity/.test(extractFn(src, 'renderIngredients')),
    'the Products card keeps its cells — see the note at productIdentityMeta');
  assert.ok(!/productIdentity/.test(extractFn(src, 'printDocketFor')),
    'the print docket keeps the kitchen name alone — see the note at productIdentityMeta');
});

/* ============================================================================
   The casing half. `.ca` under `.opt` is not a label class, whatever its name says.
   ============================================================================ */

test('.opt .ca does not shout — it carries names, figures and whole phrases, not labels', () => {
  /* Comments are stripped first: the rule above `.opt .ca` explains the defect in prose and mentions
     `text-transform:uppercase` while doing it, so an unstripped grep would match its own explanation.
     That is roster entry 183(a), and it bit inside the sentence warning about it once already. */
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = code.match(/^\.opt \.ca\{[^}]*\}/m);
  assert.ok(rule, '.opt .ca must still exist — it is what mutes the secondary text');
  assert.ok(!/text-transform/.test(rule[0]),
    '.opt .ca prints a product description in renderDrop; forcing capitals is the two-voices defect');

  const sug = code.match(/^\.suggest-drop \.sug-opt \.ca\{[^}]*\}/m);
  assert.ok(sug, '.suggest-drop .sug-opt .ca must still exist');
  assert.ok(!/text-transform/.test(sug[0]),
    'this one holds a sentence — "menu item · no plate yet · Uncategorised" — and a sentence in capitals is not a label');
});
