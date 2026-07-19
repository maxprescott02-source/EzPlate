/*
 * builder-search.test.js — v55 §G: the Builder ingredient search (#q) matches the linked product's
 * description/brand as well as the kitchen word's own name (parity with the pantry search, v35).
 *
 * Against the REAL shipped kitchenSearchMatches (brace-extracted from js/app.js).
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`builder-search: function not found -> ${name}`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`builder-search: unbalanced braces for ${name}`);
}

function makeSearch(kitchen, byId) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('KI', 'BYID', `
    "use strict";
    var kitchenIngredients = KI, byId = BYID;
    ${extractFn(SRC, 'subseq')}
    ${extractFn(SRC, 'kingSearchFilter')}
    ${extractFn(SRC, 'kitchenSearchMatches')}
    return kitchenSearchMatches;
  `);
  return factory(kitchen, byId);
}

const KITCHEN = [{ id: 'K1', name: 'Bread', pid: 'P1' }, { id: 'K2', name: 'Chips', pid: 'P2' }];
const BYID = {
  P1: { description: 'Bread GF Loaf Sliced', brand: 'TipTop' },
  P2: { description: 'Chips 10mm Straight Cut', brand: 'Safries' },
};

test('v55 §G: a term in the linked product BRAND finds the ingredient', () => {
  const search = makeSearch(KITCHEN, BYID);
  const ids = search('tiptop').map(x => x.id);
  assert.deepStrictEqual(ids, ['K1'], '"tiptop" -> Bread (via its product brand)');
});

test('v55 §G: a term in the linked product DESCRIPTION finds the ingredient', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('safries').map(x => x.id), ['K2'], '"safries" -> Chips (via product description/brand)');
  assert.deepStrictEqual(search('straight').map(x => x.id), ['K2'], '"straight" -> Chips (via product description)');
});

test('v55 §G: the kitchen word name still matches', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('bread').map(x => x.id), ['K1']);
});

test('v55 §G: a term in NEITHER name nor product text does not match (correct)', () => {
  const search = makeSearch(KITCHEN, BYID);
  assert.deepStrictEqual(search('zzznope').map(x => x.id), [], 'no phantom matches');
});
