/*
 * terminology.test.js (v86) — the app has FOUR object nouns in user-facing copy:
 *   Product · Ingredient · Plate · Menu
 *
 * "Recipe" names nothing in this app, and "kitchen word" / "kitchen name" is internal
 * vocabulary for what the UI calls an Ingredient. Both had leaked into shipped copy twice
 * before (v83 removed one batch and flagged three survivors; v86 is the third sighting), so
 * they are pinned here rather than left to the next reviewer's eye.
 *
 * The second half of this file is the mirror-image guard: the deliberate naming INVERSION
 * (CLAUDE.md) means the internal identifiers must NOT be "tidied" to match the labels. A
 * terminology pass is exactly when someone is tempted to rename them, so the identifiers are
 * pinned too — renaming any of them is a rollback-grade mistake, not a cleanup.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

// app.js keeps "recipe"/"kitchen word" in explanatory COMMENTS, which is fine — they are not
// copy. Strip whole-line comments so the assertions below look only at shippable code.
const appCode = app
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))   // block comments -> blanks (line numbers preserved)
  .split('\n')
  .map(l => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1'))             // line comments, but not the // in a URL
  .join('\n');

test('index.html contains no "recipe" anywhere — it names no object in this app', () => {
  const hits = html.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => /recipe/i.test(o.l));
  assert.deepEqual(hits.map(o => `${o.n}: ${o.l.trim()}`), [], 'index.html must not mention recipes');
});

test('the Ingredients strapline explains without naming a forbidden object', () => {
  /* F3 (v139): the sentence MOVED, and the test follows it rather than pinning a location. The v3
     header bar (§2) is title + one computed subtitle + actions, with no room for a strapline, so
     R3 re-housed this one into the screen's empty state — where a café that does not yet know what
     an Ingredient is will actually read it, instead of above a list that already answers it.
     What matters is that the app still explains Ingredient -> Product SOMEWHERE, in the four-noun
     vocabulary, so the assertion spans both files. */
  const anywhere = html + appCode;
  assert.match(anywhere, /Each one links to a product you buy/,
    'the Ingredient -> Product explanation still ships somewhere in the app');
  assert.match(anywhere, /the names you cook with/i,
    'and still describes an Ingredient without naming a fifth object');
  assert.ok(!/Kitchen words for recipes/i.test(anywhere), 'the old strapline named two non-objects');
});

test('the link-a-product hint costs from PLATES, not recipes', () => {
  assert.match(html, /Plates cost from this product\. Switch it later and every plate follows/);
});

test('the invoice add-new form labels the object it creates: an Ingredient', () => {
  assert.match(appCode, /niLab\('Ingredient name \(optional\)'/, 'the field creates/links an Ingredient');
  assert.ok(!/Kitchen name \(optional\)/.test(appCode), '"Kitchen name" is internal vocabulary');
});

test('its placeholder still EXPLAINS the field (explanatory phrasing is allowed)', () => {
  assert.match(appCode, /placeholder="the name you\\u2019ll use when building plates"/);
});

test('no "kitchen word" / "kitchen name" survives in shippable code', () => {
  const bad = appCode.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => /kitchen (word|name)/i.test(o.l));
  assert.deepEqual(bad.map(o => `${o.n}: ${o.l.trim().slice(0, 120)}`), []);
});

test('no "recipe" survives in shippable code', () => {
  const bad = appCode.split('\n')
    .map((l, i) => ({ n: i + 1, l }))
    .filter(o => /recipe/i.test(o.l));
  assert.deepEqual(bad.map(o => `${o.n}: ${o.l.trim().slice(0, 120)}`), []);
});

test('v86: "dish" is no longer a UI noun — the object is a Plate (Max, 25 Jul 2026)', () => {
  // Inspect each STRING LITERAL on its own, not the whole line: a line may legitimately mention
  // dishesOfPlate/data-dish and ALSO carry user-facing copy, and exempting the line would hide it.
  const IDENTIFIERS = /dishesOfPlate|dishDriver|dishCount|dishNamesByPid|data-dish|addDishModal|menuAddDishBtn|dishesOf\b/g;
  const re = /(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  const bad = [];
  let m;
  while ((m = re.exec(appCode)) !== null) {
    const literal = m[2];
    if (!/\bdish(es)?\b/i.test(literal.replace(IDENTIFIERS, ''))) continue;
    bad.push(`${appCode.slice(0, m.index).split('\n').length}: ${literal.slice(0, 110)}`);
  }
  assert.deepEqual(bad, []);
});

/* ---- the naming inversion: these must NEVER be renamed to match the labels ---- */

test('INVERSION GUARD: the internal identifiers are untouched by the copy pass', () => {
  for (const id of ['kitchenIngredients', 'renderKitchenPanel', 'addKitchenLine',
                    'saveKitchenIngredients', 'kitchenSearchMatches']) {
    assert.ok(app.includes(id), `${id} must still exist — renaming identifiers has caused rollbacks`);
  }
  /* v108: KINGKEY and the `cafeDB_kitchenIngredients` literal were dropped from this list because the
     local mirror they named is GONE — kitchen words live in app_settings.kitchen_ingredients now. The
     guard itself is unweakened: it lost a localStorage key and kept the SERVER key, which is the
     stronger contract of the two and the one a rename would actually corrupt. Deleting a store is not
     the failure this guard exists to catch; renaming `kitchenIngredients` to match the UI label is,
     and that is still pinned above. */
  assert.match(app, /'kitchen_ingredients'/, 'the Supabase app_settings key is a data contract');
});

test('INVERSION GUARD: the crossed data-tab values still say pantry/ingredients', () => {
  assert.match(html, /data-tab="pantry"/, 'the tab LABELLED "Ingredients"');
  assert.match(html, /data-tab="ingredients"/, 'the tab LABELLED "Products"');
});

/* v126 (audit T1): the guard above proves both attributes EXIST — it cannot catch the label SWAP,
   which is the exact "fix" Tier 1 forbids. This one pins the CROSSING itself, both halves of it:
   the nav button carries the internal name and the crossed human label on the same element, and
   the PANEL each tab opens carries the same crossed heading (showTab binds data-tab straight to
   tab-<name>, so the h2 is the label a user reads once inside — the review found the first cut
   pinned only the nav half). Swapping either half goes red while both attributes still exist.
   The exact-label positives make "never says the other word" negatives redundant — a swap flips
   the positives — and a whole-button negative false-positived on legitimate attribute text. */
test('INVERSION GUARD: the CROSSING itself — nav buttons AND panel headings carry the crossed labels', () => {
  const nav = (tab) => {
    const m = html.match(new RegExp(`<button[^>]*data-tab="${tab}"[^>]*>[\\s\\S]*?</button>`));
    assert.ok(m, `nav button with data-tab="${tab}" exists`);
    return m[0];
  };
  const label = (name) => new RegExp(`<span class="nl(?: [^"]*)?">${name}</span>`);   // tolerant of added classes, not of a different label

  const pantry = nav('pantry');
  assert.match(pantry, /aria-label="Ingredients"/, 'pantry announces as Ingredients');
  assert.match(pantry, label('Ingredients'), 'pantry is LABELLED Ingredients');

  const ingredients = nav('ingredients');
  assert.match(ingredients, /aria-label="Products"/, 'ingredients announces as Products');
  assert.match(ingredients, label('Products'), 'ingredients is LABELLED Products');

  const builder = nav('builder');
  assert.match(builder, /aria-label="Plates"/, 'builder announces as Plates');
  assert.match(builder, label('Plates'), 'builder is LABELLED Plates');

  // the other half: the panel a tab opens says the same crossed word in its h2
  const panel = (id) => {
    const m = html.match(new RegExp(`<div id="tab-${id}"[\\s\\S]*?<h2>([^<]*)</h2>`));
    assert.ok(m, `#tab-${id} exists with a leading h2`);
    return m[1];
  };
  assert.equal(panel('pantry'), 'Ingredients', 'the pantry PANEL is headed Ingredients');
  assert.equal(panel('ingredients'), 'Products', 'the ingredients PANEL is headed Products');
});
