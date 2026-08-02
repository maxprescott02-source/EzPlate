/*
 * product-delete-guard.test.js — v108 decision D3.
 *
 * THE PROPERTY THAT WAS ACCIDENTAL, AND IS NOW DELIBERATE.
 * Until v108, `deleted_prod_ids` filtered products at RENDER time and the row stayed in the table.
 * A consequence nobody designed: "deleting" a product could not break a plate that costed from it,
 * because every reference still resolved. The tombstone lists are gone now and a delete is a real
 * DELETE — so that protection has to be built on purpose or it simply disappears.
 *
 * WHY IT MATTERS MORE THAN IT SOUNDS. The chain is plate -> ingredient -> product, so the damage
 * lands on plate COSTS. A dangling pid makes a line cost nothing and the plate quietly gets cheaper.
 * In a costing app that is the worst shape of bug available: the number still looks like a number,
 * the margin still shows green, and the menu price built on it is wrong.
 *
 * BOTH reference paths are pinned, because both are live on Max's real data (verified against
 * production 1 Aug 2026 — of 179 plate lines, 81 reach a product through a kitchen ingredient's pid
 * and 84 name a product directly). A guard that checked only the first would miss half of them and
 * would look correct in every test written against the other half.
 *
 * Runs the REAL shipped productRefs, brace-extracted from js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(name) {
  const sig = `function ${name}(`;
  const i = SRC.indexOf(sig);
  if (i < 0) throw new Error(`product-delete-guard: function not found -> ${name}. app.js changed; update this test`);
  const start = SRC.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < SRC.length; n++) {
    if (SRC[n] === '{') depth++;
    else if (SRC[n] === '}' && --depth === 0) return SRC.slice(i, n + 1);
  }
  throw new Error(`product-delete-guard: unbalanced braces for ${name}`);
}

function refsWith(kitchenIngredients, savedPlates) {
  // eslint-disable-next-line no-new-func
  return new Function('K', 'P', `
    "use strict";
    var kitchenIngredients = K, savedPlates = P;
    ${extractFn('productRefs')}
    return productRefs;
  `)(kitchenIngredients, savedPlates);
}

const KING = [
  { id: 'K1', name: 'Chips', pid: 'P0108' },
  { id: 'K2', name: 'Fish', pid: 'P0010' },
];
const PLATES = [
  { id: 'SP1', name: 'Cod & Chips', lines: [{ kid: 'K1', qty: 250 }, { kid: 'K2', qty: 180 }] },
  { id: 'SP2', name: 'Chip Butty', lines: [{ kid: 'K1', qty: 200 }] },
  { id: 'SP3', name: 'Direct Line Plate', lines: [{ pid: 'P0389', qty: 10 }] },   // the pid path
];

test('a product nothing uses reports no references', () => {
  const r = refsWith(KING, PLATES)('P9999');
  assert.deepStrictEqual(r.ingredients, []);
  assert.deepStrictEqual(r.plates, []);
});

test('the kid path: a product behind a kitchen ingredient names the ingredient AND every plate', () => {
  const r = refsWith(KING, PLATES)('P0108');
  assert.deepStrictEqual(r.ingredients, ['Chips']);
  assert.deepStrictEqual(r.plates.sort(), ['Chip Butty', 'Cod & Chips']);
});

test('the pid path: a plate line naming a product directly is found too', () => {
  // 84 of Max's 179 plate lines take this route. A guard that only walked kitchen ingredients
  // would report "nothing uses it" and let the delete through.
  const r = refsWith(KING, PLATES)('P0389');
  assert.deepStrictEqual(r.ingredients, [], 'no kitchen ingredient points at it');
  assert.deepStrictEqual(r.plates, ['Direct Line Plate'], 'but a plate line does — that still breaks');
});

test('a plate is named once even when it uses the product on several lines', () => {
  const plates = [{ id: 'SP1', name: 'Double Chips', lines: [{ kid: 'K1', qty: 100 }, { kid: 'K1', qty: 50 }] }];
  assert.deepStrictEqual(refsWith(KING, plates)('P0108').plates, ['Double Chips']);
});

test('an ingredient with no plate still counts — the link is what breaks, not the usage', () => {
  const r = refsWith(KING, [])('P0108');
  assert.deepStrictEqual(r.ingredients, ['Chips']);
  assert.deepStrictEqual(r.plates, [], 'nothing costs from it yet, but the ingredient would dangle');
});

test('empty and malformed inputs are safe, not throwing', () => {
  assert.doesNotThrow(() => refsWith(null, null)('P1'));
  assert.doesNotThrow(() => refsWith([null, { id: 'K9' }], [null, { id: 'S', lines: null }])('P1'));
  const r = refsWith([{ id: 'K1', name: 'X', pid: 'P1' }], [{ id: 'S', name: 'S', lines: [null, {}] }])('P1');
  assert.deepStrictEqual(r.ingredients, ['X']);
  assert.deepStrictEqual(r.plates, [], 'a null line must not be read as a match');
});

test('THE BUG CODERABBIT CAUGHT: a DIRECT plate-line reference must block the delete too', () => {
  /* productRefs found the pid path correctly and deleteIngredient then gated on refs.ingredients
     ALONE, so a product used only by a direct plate line — 84 of Max's 179 lines, the LARGER half —
     would have been deleted and the plate would quietly get cheaper. The guard above pinned
     productRefs thoroughly and pinned deleteIngredient only structurally, which is exactly the gap
     that let this through. This asserts the refusal CONDITION, not just that a check happens. */
  const del = extractFn('deleteIngredient');
  const cond = /if\(\s*refs\.ingredients\.length\s*\|\|\s*refs\.plates\.length\s*\)/.test(del);
  assert.ok(cond, 'the refusal must trigger on EITHER reference kind, not on ingredients alone');
});

test('THE REGRESSION THIS LOCKS: the delete path consults the guard before deleting', () => {
  // Cheap structural check, but it is the one that matters — productRefs could be perfect and
  // unreferenced, and the delete would silently break plates again.
  const del = extractFn('deleteIngredient');
  assert.match(del, /productRefs\(/, 'deleteIngredient must ask what references the product');
  assert.ok(del.indexOf('productRefs(') < del.indexOf('dbDeleteIngredient('),
    'and it must ask BEFORE it deletes');
  assert.ok(!/deletedProdIds/.test(del), 'the tombstone list is gone — a delete is a real delete now');
});
