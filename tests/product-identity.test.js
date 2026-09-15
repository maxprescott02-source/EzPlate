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

/* The migrated set. Named here rather than inline because two assertions below walk it. */
const MIGRATED = ['renderDrop', 'renderPlate', 'kingProductLabel', 'renderKingCreateSuggest',
  'renderKingProdDrop', 'openKingModal', 'kingWizRowHtml', 'kingWizSkippedHtml'];

/* Comments quote the old hand-rolled form while explaining it, so they come off before any of these
   look at a body. Roster 183(a): a grep over source searches PROSE as well as code. */
const bodyOf = (fn) => extractFn(src, fn)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n');

test('no migrated surface hand-rolls the identity line, at ANY of its call sites', () => {
  /* ⚠️ THIS IS AN ABSENCE ASSERTION AND THE PRESENCE ONE BELOW IS NOT ENOUGH ON ITS OWN. The first
     draft of this test asserted only that `productIdentity(` APPEARS somewhere in each function, and
     the pre-push review killed it: `renderKingProdDrop` has TWO call sites — one building the list,
     one filling the input on click — so reverting the click handler alone would reintroduce the exact
     "two typographic voices, one click apart" bug this batch exists to fix, and the regex would still
     match the other site. A presence check cannot see a partial revert.
     `openKingModal` is in this list because a partial revert is not hypothetical: it was the real
     state of the branch when the review ran, and it is the THIRD writer of one field. */
  const HANDROLLED = /description\s*\)?\s*\+\s*\([^)]*\bbrand\b/;
  const offenders = MIGRATED.filter((fn) => HANDROLLED.test(bodyOf(fn)));
  assert.deepEqual(offenders, [],
    'these build a product line by hand instead of calling productIdentity/productIdentityMeta');
});

test('and each of them really does call the shared builder', () => {
  /* The positive half. On its own it is weak (see above); together with the absence assertion it
     pins both directions — you cannot delete the call and you cannot add a second voice beside it. */
  for (const fn of MIGRATED) {
    assert.match(bodyOf(fn), /productIdentity(Meta)?\(/,
      `${fn} must build its product line from the shared helper`);
  }
});

test('the guard can SEE a hand-rolled line — it is not a regex that matches nothing', () => {
  /* Roster 205: an assertion that scans source for a pattern goes vacuous the moment the pattern
     stops matching, and "found nothing" is indistinguishable from "found nothing wrong". So the
     regex is run against the exact strings this batch deleted. */
  const HANDROLLED = /description\s*\)?\s*\+\s*\([^)]*\bbrand\b/;
  for (const old of [
    "p.description+(p.brand?' \\u2014 '+p.brand:'')",
    "esc(p.description)+(p.brand?' \\u00b7 '+esc(p.brand):'')",
    "byId[k.pid].description+(byId[k.pid].brand?' \\u2014 '+byId[k.pid].brand:'')",
  ]) {
    assert.ok(HANDROLLED.test(old), `the guard must match the real deleted form: ${old}`);
  }
  assert.ok(!HANDROLLED.test('return productIdentity(p);'), 'and must not match the shared call');
});

test('renderPlate pins BOTH arms — the kid line and the legacy pid line', () => {
  /* They print different things (the full line vs the metadata alone) and a fix that moved only one
     would leave a saved pre-v31 plate reading in the old voice, which nothing else would notice. */
  const body = bodyOf('renderPlate');
  assert.match(body, /productIdentity\(p\)/, 'the kid arm prints the full identity line');
  assert.match(body, /productIdentityMeta\(p\)/, 'the legacy arm prints the metadata under the name');
});

test('the deliberate refusals stay refused, and are not "missed" call sites', () => {
  /* Four surfaces are NOT migrated, each for a reason written at the helper's own site: the Products
     card is a column table (mock §3.5); the print docket is a kitchen prep sheet; the invoice review's
     match options are the densest control on the highest-stakes screen and need a corpus run; the
     Dig-in row names reach `api/insight` as FACTS, where the money/number law applies.
     This pins that a later "consistency" pass cannot quietly collapse any of them — which is the
     direction a reader of the MIGRATED list above is most likely to push. */
  for (const fn of ['renderIngredients', 'printDocketFor', 'prodOptions', 'invMatchOptions']) {
    assert.ok(!/productIdentity/.test(extractFn(src, fn)),
      `${fn} is a stated refusal — see the NOT MIGRATED list at productIdentityMeta`);
  }
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
