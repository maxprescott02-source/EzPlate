/*
 * king-search.test.js — locks in the v35 Item 3 pantry filter.
 *
 * The point of the filter is that a kitchen word is a thin label over a supplier
 * product, and staff think in BOTH. "Chips" is the word; "Safries" is what's on
 * the invoice. Searching either has to land on the same row.
 *
 * kingSearchFilter + the shared token matcher are brace-extracted from the REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`king-search: function not found -> ${name}. app.js changed; update tests/king-search.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`king-search: unbalanced braces for ${name}`);
}

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
// v59: kingSearchFilter routes through the shared token matcher (searchTokens/matchTokens).
// eslint-disable-next-line no-new-func
const kingSearchFilter = new Function(`
  "use strict";
  ${extractFn(SRC, 'searchTokens')}
  ${extractFn(SRC, 'matchTokens')}
  ${extractFn(SRC, 'kingSearchFilter')}
  return kingSearchFilter;
`)();

const PRODS = {
  P0108: { id: 'P0108', description: 'Chips 10Mm Straight Cut', brand: 'Safries', category: 'Frozen' },
  P0010: { id: 'P0010', description: 'Barramundi Flt 100/200 S/Less', brand: 'Seacrest', category: 'Seafood' },
  P0298: { id: 'P0298', description: 'Sauce Tartare Pouch Gluten Free', brand: 'Edlyn', category: 'Sauces', supplier: 'Bidfood' }
};
const WORDS = [
  { id: 'K0001', name: 'Chips', pid: 'P0108' },
  { id: 'K0002', name: 'Fish', pid: 'P0010' },
  { id: 'K0003', name: 'Tartare', pid: 'P0298' },
  { id: 'K0004', name: 'Orphan', pid: 'P9999' }   // linked product deleted — must not throw
];
const names = rows => rows.map(r => r.name);

test('ITEM 3: an empty query returns every word, and does not hand back the live array', () => {
  const out = kingSearchFilter('', WORDS, PRODS);
  assert.equal(out.length, WORDS.length);
  assert.notStrictEqual(out, WORDS, 'renderKitchenPanel sorts the result — it must not sort kitchenIngredients in place');

  assert.equal(kingSearchFilter('   ', WORDS, PRODS).length, WORDS.length, 'whitespace is not a query');
});

test('ITEM 3: matches the kitchen word by name, case-insensitively', () => {
  assert.deepEqual(names(kingSearchFilter('chips', WORDS, PRODS)), ['Chips']);
  assert.deepEqual(names(kingSearchFilter('CHIPS', WORDS, PRODS)), ['Chips']);
  assert.deepEqual(names(kingSearchFilter('tart', WORDS, PRODS)), ['Tartare']);
});

test('ITEM 3: matches the LINKED PRODUCT\u2019s description and brand \u2014 searching \u201csafries\u201d finds \u201cChips\u201d', () => {
  assert.deepEqual(names(kingSearchFilter('safries', WORDS, PRODS)), ['Chips'], 'brand of the linked product');
  assert.deepEqual(names(kingSearchFilter('barramundi', WORDS, PRODS)), ['Fish'], 'description of the linked product');
  assert.deepEqual(names(kingSearchFilter('seacrest', WORDS, PRODS)), ['Fish']);
  assert.deepEqual(names(kingSearchFilter('pouch', WORDS, PRODS)), ['Tartare']);
});

test('v59: token order does not matter \u2014 every token must appear, in any order', () => {
  assert.deepEqual(names(kingSearchFilter('gluten free', WORDS, PRODS)), ['Tartare']);
  assert.deepEqual(names(kingSearchFilter('free gluten', WORDS, PRODS)), ['Tartare'], 'reversed order still matches');
  assert.deepEqual(names(kingSearchFilter('glut fr', WORDS, PRODS)), ['Tartare'], 'partial tokens (substring) match');
  assert.deepEqual(names(kingSearchFilter('gluten chips', WORDS, PRODS)), [], 'a token absent from the haystack fails the whole query');
});

test('v59: ingredients match by their DERIVED category (the linked product\u2019s category)', () => {
  assert.deepEqual(names(kingSearchFilter('sauces', WORDS, PRODS)), ['Tartare'], 'category of the linked product');
  assert.deepEqual(names(kingSearchFilter('seafood barramundi', WORDS, PRODS)), ['Fish'], 'category token + description token');
});

test('ITEM 3: a query matching nothing returns nothing (the caller shows \u201cNo ingredients match\u201d)', () => {
  assert.deepEqual(kingSearchFilter('zzzzzz', WORDS, PRODS), []);
});

test('ITEM 3: a word whose product is missing never throws \u2014 it just cannot match on product text', () => {
  assert.deepEqual(names(kingSearchFilter('orphan', WORDS, PRODS)), ['Orphan'], 'still findable by its own name');
  assert.deepEqual(kingSearchFilter('safries', WORDS, {}), [], 'no product table at all is survivable');
  assert.deepEqual(kingSearchFilter('chips', WORDS, null), [{ id: 'K0001', name: 'Chips', pid: 'P0108' }]);
});

test('Q5 (v124): the SUPPLIER matches too — the row shows it now, so the search above it must find it', () => {
  assert.deepEqual(names(kingSearchFilter('bidfood', WORDS, PRODS)), ['Tartare']);
  assert.deepEqual(names(kingSearchFilter('bidfood gluten', WORDS, PRODS)), ['Tartare'], 'supplier token + description token');
});
