/*
 * empty-states.test.js — v58: ONE empty-state system for every tab.
 *
 * Two checks:
 *   1. The shared builders (emptyStateHtml = variant B true-empty, emptySearchState = variant A
 *      search/filter-empty) are the ONLY thing that emits the `es-built` marker, and variant A
 *      never carries getting-started guidance.
 *   2. Source pins: every tab's render path routes through the shared helpers, no inline empty-state
 *      variant survives, and the per-tab copy names the right action (real shipped source).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

// occ=1 is the first definition; occ=2 the second. renderAnalysis (and aRow) are defined TWICE —
// the FIRST is dead, the SECOND is live (CLAUDE.md hard rule 3), so the live one must be occ=2.
function extractFn(src, name, occ = 1) {
  const sig = `function ${name}(`;
  let i = -1;
  for (let k = 0; k < occ; k++) { i = src.indexOf(sig, i + 1); if (i < 0) throw new Error(`empty-states: function #${occ} not found -> ${name}`); }
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`empty-states: unbalanced braces for ${name}`);
}
const LIVE_OCC = { renderAnalysis: 2 };   // second definition is the live one

// Run the real shipped builders in a sandbox (esc + the two helpers, nothing DOM-bound).
const factory = new Function(`
  "use strict";
  ${extractFn(SRC, 'esc')}
  ${extractFn(SRC, 'emptyStateHtml')}
  ${extractFn(SRC, 'emptySearchState')}
  return { esc, emptyStateHtml, emptySearchState };
`);
const { emptyStateHtml, emptySearchState } = factory();

const ICON = '<svg class="es-icon"></svg>';

test('emptyStateHtml (variant B) emits the es-built marker, a headline and guidance', () => {
  const h = emptyStateHtml(ICON, 'No plates yet.', 'Tap it to start.', '<button>go</button>');
  assert.match(h, /class="empty-state es-built"/, 'marker class present');
  assert.match(h, /<h3>No plates yet\.<\/h3>/);
  assert.match(h, /<p>Tap it to start\.<\/p>/, 'body renders when given');
  assert.match(h, /es-actions/, 'actions render when given');
});

test('emptyStateHtml omits the <p> when there is no body', () => {
  const h = emptyStateHtml(ICON, 'No plates match.', '', '<button>clear</button>');
  assert.ok(!/<p>/.test(h), 'no empty <p> element');
});

test('emptySearchState (variant A) is es-built, "No X match.", one clear action, NO guidance', () => {
  const h = emptySearchState(ICON, 'plates', 'clearPlateFilters');
  assert.match(h, /class="empty-state es-built"/, 'routes through the same builder -> marker present');
  assert.match(h, /<h3>No plates match\.<\/h3>/, 'standard search-empty headline');
  assert.match(h, /Clear search &amp; filters/, 'the ONE shared action label');
  assert.match(h, /onclick="clearPlateFilters\(\)"/, 'wired to the tab clear fn');
  assert.ok(!/<p>/.test(h), 'variant A carries NO getting-started guidance');
});

test('the same clear label is used verbatim on every tab (menu items too)', () => {
  for (const noun of ['products', 'ingredients', 'plates', 'menu items']) {
    assert.match(emptySearchState(ICON, noun, 'x'), /Clear search &amp; filters/);
    assert.match(emptySearchState(ICON, noun, 'x'), new RegExp(`No ${noun} match\\.`));
  }
});

// ---- source pins: route-through + copy + no survivors ----------------------------------------

test('every tab render path routes through the shared helpers', () => {
  for (const fn of ['renderIngredients', 'renderKitchenPanel', 'renderPlatesTab', 'renderAnalysis']) {
    const body = extractFn(SRC, fn, LIVE_OCC[fn] || 1);
    assert.ok(/emptyStateHtml\(|emptySearchState\(/.test(body), `${fn} builds its empty state via the shared helper`);
  }
});

test('no inline empty-state variant survives anywhere in app.js', () => {
  assert.ok(!/an-empty ing-empty/.test(SRC), 'old Products/Plates search-empty div gone');
  assert.ok(!/plate-noresult/.test(SRC), 'v56 plate-noresult gone');
  assert.ok(!/an-empty-box/.test(SRC), 'old Menu empty box gone');
  assert.ok(!/anClearSearch/.test(SRC), 'old Menu clear-search id gone');
  assert.ok(!/No ingredients match<\/div>/.test(SRC), 'old bare Ingredients search-empty gone');
});

test('copy pins: each true-empty names its OWN tab\'s primary action', () => {
  const prod = extractFn(SRC, 'renderIngredients');
  assert.ok(/\+ New product/.test(prod), 'Products true-empty references "+ New product"');
  assert.ok(!/\+ New ingredient/.test(prod), 'Products true-empty must NOT reference "+ New ingredient"');

  const menu = extractFn(SRC, 'renderAnalysis', 2);   // live definition
  assert.ok(/Publish a plate from the Plates tab/.test(menu), 'Menu true-empty points at the Plates tab (not the removed Builder)');
  assert.ok(!/in the Builder/.test(menu), 'stale "Builder" copy gone');
});
