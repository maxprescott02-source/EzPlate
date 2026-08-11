/*
 * cat-label.test.js — queue item "Products table polish", the category-casing half.
 *
 * WHY THIS EXISTS AT ALL. Product categories are supplier-supplied strings stored verbatim, so the
 * live catalogue mixes `DESSERTS`, `CLEANING & JANITORIAL` and `HERBS  SPICES & SEASONINGS` (a real
 * double space) with sentence-case `Fish` and `Squid and Octopus`. The MIXTURE is in the data.
 *
 * THE ONE THING THAT MUST NOT BREAK is that this is display-only. The stored value is what the
 * invoice parser and the category derivation both MATCH AGAINST, so a pass that normalised at rest
 * would silently stop matching invoices — a data migration wearing a rendering fix's clothes. The
 * `fillFilter` assertions below are the ones that guard it: the option VALUE stays raw and only the
 * LABEL is cased. Get that backwards and every category filter silently selects nothing, which is a
 * failure that looks like "the filter is broken" and reads nowhere near this function.
 *
 * The real values are used as fixtures rather than invented ones, counted against the live
 * `ingredients` table on 12 Aug 2026 (412 products).
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const src = loadApp();
const sandbox = {};
// CAT_SMALL is a top-level var catLabel closes over — extracted with it, not re-declared here, so a
// change to the small-word list cannot pass a test that carries its own copy.
new Function(extractVar(src, 'CAT_SMALL') + '\n' + extractFn(src, 'catLabel') + '\nthis.catLabel=catLabel;this.CAT_SMALL=CAT_SMALL;').call(sandbox);
const { catLabel } = sandbox;

test('the all-caps values from real invoices become sentence-cased', () => {
  assert.equal(catLabel('DESSERTS'), 'Desserts');
  assert.equal(catLabel('BAKING SUPPLIES'), 'Baking Supplies');
  assert.equal(catLabel('CLEANING & JANITORIAL'), 'Cleaning & Janitorial');
  assert.equal(catLabel('POULTRY FURTHER PROCESSED'), 'Poultry Further Processed');
  assert.equal(catLabel('BEEF PORTIONED'), 'Beef Portioned');
});

test('the ampersand is left alone — it carries no case', () => {
  assert.equal(catLabel('SAUSAGES & PATTIES'), 'Sausages & Patties');
  assert.equal(catLabel('FINGER & SNACK FOODS'), 'Finger & Snack Foods');
});

test('a double space collapses — the longest real category has one, and it is a quirk not information', () => {
  // "SAUCES  CONDIMENTS & DRESSINGS" is the longest value in the catalogue (32 rows) and the double
  // space is what made it 30 characters. Collapsing is what lets it fit its column without truncating.
  assert.equal(catLabel('SAUCES  CONDIMENTS & DRESSINGS'), 'Sauces Condiments & Dressings');
  assert.equal(catLabel('HERBS  SPICES & SEASONINGS'), 'Herbs Spices & Seasonings');
  assert.equal(catLabel('  Fish  '), 'Fish', 'and it trims');
});

test('small words stay lowercase after the first word — but never AS the first word', () => {
  assert.equal(catLabel('Squid and Octopus'), 'Squid and Octopus',
    'a value already cased the way a human would write it survives the pass unchanged');
  assert.equal(catLabel('SQUID AND OCTOPUS'), 'Squid and Octopus');
  assert.equal(catLabel('OF THE DAY'), 'Of the Day',
    'the first word is capitalised even when it is a small word, and later small words are not');
  assert.equal(catLabel('SOUP OF THE DAY'), 'Soup of the Day');
  // only the words actually in CAT_SMALL are lowered — "so" is not one of them, and this pins that
  // the list is the whole rule rather than a guess about what reads as a small word
  assert.equal(catLabel('AND SO ON'), 'And So on');
});

test('already-correct values are left exactly as they are', () => {
  for (const v of ['Fish', 'Vegetables', 'Packaging', 'Bread & Pastry', 'Ready Meals']) {
    assert.equal(catLabel(v), v, `${v} is untouched`);
  }
});

test('it never throws on the empty and absent cases the renderer can hand it', () => {
  assert.equal(catLabel(''), '');
  assert.equal(catLabel(null), '');
  assert.equal(catLabel(undefined), '');
  assert.equal(catLabel('   '), '');
});

/* ============================================================================
   THE DISPLAY-ONLY GUARD — the half that stops this becoming a data migration.
   ============================================================================ */

test('fillFilter cases the option LABEL and leaves the option VALUE raw', () => {
  const fill = new Function('esc', 'TIDY_DOOR', 'catLabel',
    extractFn(src, 'fillFilter') + '\nreturn fillFilter;')((s) => String(s), '__TIDY__', catLabel);
  const sel = { value: '', dataset: {}, innerHTML: '' };
  fill(sel, ['DESSERTS', 'CLEANING & JANITORIAL'], 'All categories', catLabel);

  assert.ok(sel.innerHTML.includes('value="DESSERTS"'),
    'the VALUE is the stored string — this is what every comparison in the app comes back to');
  assert.ok(sel.innerHTML.includes('>Desserts<'), 'and the LABEL is what the user reads');
  assert.ok(!sel.innerHTML.includes('value="Desserts"'),
    'the cased form must never become a value: nothing in Supabase is spelled that way, so the filter would select nothing');
  assert.ok(sel.innerHTML.includes('value="CLEANING &amp; JANITORIAL"') || sel.innerHTML.includes('value="CLEANING & JANITORIAL"'),
    'and the same for a value with an ampersand');
});

test('fillFilter without a formatter is unchanged — suppliers and menu sections are Max-authored', () => {
  const fill = new Function('esc', 'TIDY_DOOR',
    extractFn(src, 'fillFilter') + '\nreturn fillFilter;')((s) => String(s), '__TIDY__');
  const sel = { value: '', dataset: {}, innerHTML: '' };
  fill(sel, ['Bidfood', 'PFD'], 'All suppliers');
  assert.ok(sel.innerHTML.includes('>Bidfood<'), 'a supplier name is rendered exactly as stored');
  assert.ok(!sel.innerHTML.includes('>bidfood<'));
});

test('SCOPE GUARD: catLabel is called at render time only, never on a write path', () => {
  /* The renderers may call it; setProduct, the invoice apply path and the row writers may not.
     Written as a source assertion because the failure it guards against is silent: a catLabel that
     reached storage would rewrite the strings the parser matches on, and every later invoice would
     stop matching a category that used to work. */
  const writers = ['function setProduct', 'function dbPushIngredient'];
  for (const w of writers) {
    const at = src.indexOf(w);
    assert.ok(at > 0, `${w} still exists — update this guard if it was renamed`);
    const body = src.slice(at, src.indexOf('\nfunction ', at + 10));
    assert.ok(!body.includes('catLabel('), `${w} must not case a category on its way to storage`);
  }
});
