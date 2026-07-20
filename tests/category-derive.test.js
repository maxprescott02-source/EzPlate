/*
 * category-derive.test.js — v59 item 6a: an ingredient's category is DERIVED (live) from its linked
 * product, never stored on the ingredient. Repointing the link or editing the product's category
 * changes the ingredient's effective category automatically.
 *
 * kingCategory + kingCategories are brace-extracted from the REAL shipped js/app.js and run against
 * a mutable byId / kitchenIngredients, so we can prove the derivation follows edits.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`category-derive: function not found -> ${name}`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`category-derive: unbalanced braces for ${name}`);
}

// A sandbox with mutable byId + kitchenIngredients that the extracted functions close over.
function makeEnv(byId, kitchen) {
  return new Function('BYID', 'KI', `
    "use strict";
    var byId = BYID, kitchenIngredients = KI;
    ${extractFn(SRC, 'kingCategory')}
    ${extractFn(SRC, 'kingCategories')}
    return { kingCategory: kingCategory, kingCategories: function(){ return kingCategories(); },
             set kid(v){ kitchenIngredients = v; }, get kid(){ return kitchenIngredients; } };
  `)(byId, kitchen);
}

test('an ingredient inherits its linked product’s category', () => {
  const byId = { P1: { id: 'P1', category: 'Seafood' }, P2: { id: 'P2', category: 'Frozen' } };
  const env = makeEnv(byId, []);
  assert.strictEqual(env.kingCategory({ id: 'K1', name: 'Fish', pid: 'P1' }), 'Seafood');
  assert.strictEqual(env.kingCategory({ id: 'K2', name: 'Chips', pid: 'P2' }), 'Frozen');
});

test('repointing the link changes the ingredient’s effective category', () => {
  const byId = { P1: { id: 'P1', category: 'Seafood' }, P2: { id: 'P2', category: 'Frozen' } };
  const env = makeEnv(byId, []);
  const k = { id: 'K1', name: 'Fish', pid: 'P1' };
  assert.strictEqual(env.kingCategory(k), 'Seafood');
  k.pid = 'P2';                                  // repoint to a different product
  assert.strictEqual(env.kingCategory(k), 'Frozen', 'category follows the new link, live');
});

test('editing the product’s category reflects on the ingredient with no ingredient write', () => {
  const byId = { P1: { id: 'P1', category: 'Seafood' } };
  const env = makeEnv(byId, []);
  const k = { id: 'K1', name: 'Fish', pid: 'P1' };
  assert.strictEqual(env.kingCategory(k), 'Seafood');
  byId.P1.category = 'Fresh Fish';               // Products tab / Tidy lists edit
  assert.strictEqual(env.kingCategory(k), 'Fresh Fish');
});

test('a missing / unlinked product yields an empty category and never throws', () => {
  const env = makeEnv({}, []);
  assert.strictEqual(env.kingCategory({ id: 'K1', name: 'Orphan', pid: 'P9' }), '');
  assert.strictEqual(env.kingCategory(null), '');
});

test('kingCategories lists the distinct derived categories, sorted, ignoring blanks', () => {
  const byId = { P1: { category: 'Seafood' }, P2: { category: 'Frozen' }, P3: { category: 'Seafood' }, P4: { category: '' } };
  const kitchen = [
    { id: 'K1', pid: 'P1' }, { id: 'K2', pid: 'P2' }, { id: 'K3', pid: 'P3' },
    { id: 'K4', pid: 'P4' },   // blank category -> excluded
    { id: 'K5', pid: 'PX' },   // missing product -> excluded
  ];
  const env = makeEnv(byId, kitchen);
  assert.deepStrictEqual(env.kingCategories(), ['Frozen', 'Seafood']);
});
