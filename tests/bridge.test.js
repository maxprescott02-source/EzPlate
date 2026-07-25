/*
 * bridge.test.js — v82 item 1. The product→recipe BRIDGE.
 *
 * The #1 new-user stall: a product can't go on a plate until a "kitchen word" (ingredient) links to
 * it, and nothing on the Products side offered that step. These pure helpers are the missing path:
 *   - kingForProduct(pid)  — the linked kitchen word, or null (the visible-state lookup)
 *   - bridgeKingName(p)     — a clash-safe name so a one-tap create never collides
 *   - bridgeCreateKing(pid) — IDEMPOTENT create-or-reuse through the normal write path
 *
 * proposeKingName is stubbed here (it's tested in king-propose.test.js); this file locks the
 * bridge's own logic: state lookup, disambiguation, and no-duplicate idempotency.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`bridge: function not found -> ${name}. app.js changed; update tests/bridge.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`bridge: unbalanced braces for ${name}`);
}

// A sandbox with controllable products/words. proposeKingName returns PROPOSE so the clash-safe
// namer can be exercised deterministically.
function makeBridge(products, words, propose) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('PRODUCTS_IN', 'WORDS_IN', 'PROPOSE', `
    "use strict";
    var kitchenIngredients = WORDS_IN;
    var byId = {}; PRODUCTS_IN.forEach(function(p){ byId[p.id]=p; });
    var _kid = 1, saves = 0;
    function nextKid(){ return 'K' + (_kid++); }
    function saveKitchenIngredients(){ saves++; }
    function proposeKingName(p){ return PROPOSE; }
    ${extractFn(SRC, 'kingNameExists')}
    ${extractFn(SRC, 'kingForProduct')}
    ${extractFn(SRC, 'bridgeKingName')}
    ${extractFn(SRC, 'bridgeCreateKing')}
    return {
      kingForProduct: kingForProduct,
      bridgeKingName: bridgeKingName,
      bridgeCreateKing: bridgeCreateKing,
      words: function(){ return kitchenIngredients; },
      saves: function(){ return saves; }
    };
  `);
  return factory(products, words, propose);
}

test('kingForProduct: returns the linked word, or null when the product has none', () => {
  const b = makeBridge(
    [{ id: 'P1', description: 'Bacon Rashers', brand: 'Primo' }, { id: 'P2', description: 'Eggs' }],
    [{ id: 'K1', name: 'Bacon', pid: 'P1' }], 'Bacon');
  assert.equal(b.kingForProduct('P1').id, 'K1', 'P1 is linked to K1');
  assert.equal(b.kingForProduct('P2'), null, 'P2 has no kitchen word yet');
  assert.equal(b.kingForProduct(null), null, 'a null pid is a safe null');
});

test('bridgeCreateKing: an unlinked product gets one correctly-linked word, created through the write path', () => {
  const b = makeBridge([{ id: 'P2', description: 'Eggs', brand: 'Sunny' }], [], 'Eggs');
  const before = b.words().length;
  const k = b.bridgeCreateKing('P2');
  assert.ok(k, 'a word is returned');
  assert.equal(k.pid, 'P2', 'linked to the product');
  assert.equal(k.name, 'Eggs', 'named from proposeKingName');
  assert.equal(b.words().length, before + 1, 'exactly one word added');
  assert.equal(b.saves(), 1, 'persisted once');
});

test('bridgeCreateKing: IDEMPOTENT — a product that already has a word returns it, creates no duplicate', () => {
  const b = makeBridge([{ id: 'P1', description: 'Bacon' }], [{ id: 'K1', name: 'Bacon', pid: 'P1' }], 'Bacon');
  const before = b.words().length;
  const k = b.bridgeCreateKing('P1');
  assert.equal(k.id, 'K1', 'the existing word is returned');
  assert.equal(b.words().length, before, 'no new word');
  assert.equal(b.saves(), 0, 'no write for a no-op');
});

test('bridgeCreateKing: an unknown product id is a safe null (no crash, no write)', () => {
  const b = makeBridge([{ id: 'P1', description: 'Bacon' }], [], 'Bacon');
  assert.equal(b.bridgeCreateKing('NOPE'), null);
  assert.equal(b.words().length, 0);
});

test('bridgeKingName: no clash keeps the proposed name', () => {
  const b = makeBridge([], [], 'Bacon');
  assert.equal(b.bridgeKingName({ description: 'Bacon Rashers', brand: 'Primo' }), 'Bacon');
});

test('bridgeKingName: a name already taken by another product disambiguates by brand, then a number', () => {
  const b = makeBridge([], [{ id: 'K1', name: 'Bacon', pid: 'P0' }], 'Bacon');
  assert.equal(b.bridgeKingName({ description: 'Bacon Rashers', brand: 'Primo' }), 'Bacon Primo',
    'first fallback: append the brand');

  const b2 = makeBridge([], [{ id: 'K1', name: 'Bacon', pid: 'P0' }, { id: 'K2', name: 'Bacon Primo', pid: 'P9' }], 'Bacon');
  assert.equal(b2.bridgeKingName({ description: 'Bacon Rashers', brand: 'Primo' }), 'Bacon 2',
    'brand also taken → numeric suffix');

  const b3 = makeBridge([], [{ id: 'K1', name: 'Bacon', pid: 'P0' }], 'Bacon');
  assert.equal(b3.bridgeKingName({ description: 'Bacon Rashers' }), 'Bacon 2',
    'no brand to disambiguate with → numeric suffix');
});
