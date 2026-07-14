/*
 * king-search.test.js — locks in the v35 Item 3 pantry filter.
 *
 * The point of the filter is that a kitchen word is a thin label over a supplier
 * product, and staff think in BOTH. "Chips" is the word; "Safries" is what's on
 * the invoice. Searching either has to land on the same row.
 *
 * kingSearchFilter + subseq are brace-extracted from the REAL shipped js/app.js.
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
// eslint-disable-next-line no-new-func
const kingSearchFilter = new Function(`
  "use strict";
  ${extractFn(SRC, 'subseq')}
  ${extractFn(SRC, 'kingSearchFilter')}
  return kingSearchFilter;
`)();

const PRODS = {
  P0108: { id: 'P0108', description: 'Chips 10Mm Straight Cut', brand: 'Safries' },
  P0010: { id: 'P0010', description: 'Barramundi Flt 100/200 S/Less', brand: 'Seacrest' },
  P0298: { id: 'P0298', description: 'Sauce Tartare Pouch Gluten Free', brand: 'Edlyn' }
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

test('ITEM 3: the Builder\u2019s subseq fallback applies to the word name, so a typo still lands', () => {
  assert.deepEqual(names(kingSearchFilter('chps', WORDS, PRODS)), ['Chips']);
  assert.deepEqual(names(kingSearchFilter('trtr', WORDS, PRODS)), ['Tartare']);
});

test('ITEM 3: a query matching nothing returns nothing (the caller shows \u201cNo ingredients match\u201d)', () => {
  assert.deepEqual(kingSearchFilter('zzzzzz', WORDS, PRODS), []);
});

test('ITEM 3: a word whose product is missing never throws \u2014 it just cannot match on product text', () => {
  assert.deepEqual(names(kingSearchFilter('orphan', WORDS, PRODS)), ['Orphan'], 'still findable by its own name');
  assert.deepEqual(kingSearchFilter('safries', WORDS, {}), [], 'no product table at all is survivable');
  assert.deepEqual(kingSearchFilter('chips', WORDS, null), [{ id: 'K0001', name: 'Chips', pid: 'P0108' }]);
});
