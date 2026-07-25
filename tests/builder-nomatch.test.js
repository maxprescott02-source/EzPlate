/*
 * builder-nomatch.test.js — v83 item 7.
 *
 * The builder's ingredient search used to dead-end unhelpfully: Max's chef searches for a dressing he
 * has just bought, finds nothing, doesn't know why or what to do, and closes the plate to go fix it —
 * losing the work in progress.
 *
 * The fix is NOT a creation path. Creating an ingredient from the builder search was deliberately
 * removed in v59 and stays removed: the fuzzy matcher can't match abbreviations ("bread gf" does not
 * find "Gluten Free Bread"), so "no match" is not a reliable enough signal to offer creation — it
 * produced duplicate ingredients. These tests lock BOTH halves of that: the message is informative and
 * names the term, and no creation affordance exists.
 *
 * The one action offered (Save plate & add ingredients) appears only when there are lines worth losing,
 * and is routed through saveCurrentPlate in the app so it obeys the same name/quantity rules as Save.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { builderNoMatchHtml } = require('./_extract.js');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

test('item 7: the no-match message names the term the user actually searched', () => {
  const html = builderNoMatchHtml('dressing', true);
  assert.match(html, /No ingredient called .dressing. yet/, 'the searched term is quoted back');
  assert.match(html, /Ingredients tab/, 'it says where an ingredient is made');
});

test('item 7: with lines on the plate, ONE action is offered and the copy reassures', () => {
  const html = builderNoMatchHtml('dressing', true);
  const buttons = html.match(/<button/g) || [];
  assert.strictEqual(buttons.length, 1, 'exactly one action — no forms, no second button');
  assert.match(html, /nomatch-go/);
  assert.match(html, /Save plate/, 'the action says it saves the plate');
  assert.match(html, /waiting in Plates/, 'the copy tells the user the plate is not lost');
});

test('item 7: an EMPTY plate gets the message but no action (nothing to save, so no dead button)', () => {
  const html = builderNoMatchHtml('dressing', false);
  assert.match(html, /No ingredient called .dressing. yet/);
  assert.ok(!/<button/.test(html), 'no action when there is no work to preserve');
});

test('item 7: an empty search term is guidance, not a "no match" claim', () => {
  const html = builderNoMatchHtml('', true);
  assert.match(html, /Type to find an ingredient/);
  assert.ok(!/No ingredient called/.test(html), 'an empty box has not "found nothing"');
  assert.ok(!/<button/.test(html), 'nothing to act on before a search');
});

test('item 7: the searched term is HTML-escaped (it is user input, rendered via innerHTML)', () => {
  const html = builderNoMatchHtml('<img src=x onerror=alert(1)>', true);
  assert.ok(!/<img/.test(html), 'no raw tag survives into the dropdown markup');
  assert.match(html, /&lt;img/);
});

test('item 7: NO creation affordance exists anywhere in the builder search (v59 removal holds)', () => {
  ['dressing', '', 'anything at all'].forEach(term => {
    [true, false].forEach(hasLines => {
      const html = builderNoMatchHtml(term, hasLines);
      assert.ok(!/opt-create/.test(html), `no create option for "${term}"`);
      assert.ok(!/Create |Add “|New ingredient/.test(html),
        `no create-this-ingredient wording for "${term}"`);
    });
  });
  // and the picker itself still has no create branch (the v59 contract, pinned at the source)
  assert.match(SRC, /function pickListItem\(it\)\{[^}]*if\(it\.__kid\) addKitchenLine/,
    'pickListItem adds a kitchen line and nothing else — no create branch');
});

test('item 7: copy uses the app\'s real nouns — never "recipes"', () => {
  ['dressing', ''].forEach(term => {
    [true, false].forEach(hasLines => {
      assert.ok(!/recipe/i.test(builderNoMatchHtml(term, hasLines)),
        `"recipes" is not one of the app's UI nouns (term "${term}", hasLines ${hasLines})`);
    });
  });
});

test('item 7: the action routes through saveCurrentPlate and only then navigates', () => {
  const fn = SRC.match(/function saveAndAddIngredients\(\)\{[\s\S]*?\n\}/);
  assert.ok(fn, 'saveAndAddIngredients exists');
  assert.match(fn[0], /if\(!saveCurrentPlate\(false\)\) return;/,
    'a refused save (no name / missing qty) must NOT navigate away from the unsaved plate');
  assert.match(fn[0], /showTab\('pantry'\)/,
    "and a successful save lands on the Ingredients tab (data-tab=\"pantry\" — the naming inversion)");
});
