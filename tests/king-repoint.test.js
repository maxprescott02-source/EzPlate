/*
 * king-repoint.test.js — locks in the v35 Item 5 kitchen-name contract.
 *
 * v34's invoice add-as-new had a free-text "Kitchen name" field, and applyInvoice read
 * it as:
 *     if(s.kingName && !kingNameExists(s.kingName)){ ...create... }
 * — so typing a name that already existed did NOTHING, with no message. That silently
 * discarded the single most useful case: the café changes chip supplier, adds the new
 * product from the invoice, types "Chips", and expects "Chips" to now mean the new bag.
 *
 * v35: a name that already exists — typed or picked from the combobox, same intent —
 * RE-POINTS that word at the new product. A new name still creates. Empty still does
 * nothing. Every outcome reaches the summary toast.
 *
 * kingNameAction + kingRepointGuard + unitCatCategory are brace-extracted from the
 * REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// eslint-disable-next-line no-new-func
const api = new Function(`
  "use strict";
  ${extractFn(SRC, 'unitCatCategory')}
  ${extractFn(SRC, 'kingNameAction')}
  ${extractFn(SRC, 'kingRepointGuard')}
  ${extractFn(SRC, 'unitCatWord')}
  return { kingNameAction: kingNameAction, kingRepointGuard: kingRepointGuard, unitCatWord: unitCatWord };
`)();
const { kingNameAction, kingRepointGuard, unitCatWord } = api;

const WORDS = () => ([
  { id: 'K0001', name: 'Chips', pid: 'P0108' },
  { id: 'K0002', name: 'Fish', pid: 'P0010' }
]);

test('ITEM 5: an empty kitchen name is a no-op', () => {
  assert.equal(kingNameAction('', WORDS()).action, 'none');
  assert.equal(kingNameAction('   ', WORDS()).action, 'none');
  assert.equal(kingNameAction(null, WORDS()).action, 'none');
  assert.equal(kingNameAction(undefined, WORDS()).action, 'none');
});

test('ITEM 5: a name that does not exist yet creates a new linked word (unchanged from v34)', () => {
  const a = kingNameAction('Calamari', WORDS());
  assert.equal(a.action, 'create');
  assert.equal(a.name, 'Calamari');

  assert.equal(kingNameAction('  Calamari  ', WORDS()).name, 'Calamari', 'trimmed on the way in');
});

test('ITEM 5 THE BUG: an existing name re-points instead of silently doing nothing', () => {
  const a = kingNameAction('Chips', WORDS());
  assert.equal(a.action, 'repoint', 'v34 returned here having done nothing at all');
  assert.equal(a.kid, 'K0001', 'and it names WHICH word to move');
});

test('ITEM 5: matching an existing word is case- and padding-insensitive, and keeps the STORED name', () => {
  const a = kingNameAction('  cHiPs ', WORDS());
  assert.equal(a.action, 'repoint');
  assert.equal(a.kid, 'K0001');
  assert.equal(a.name, 'Chips', 'a re-link must not quietly re-case the word the café already uses');
});

test('ITEM 5: a clean re-link (same unit category) needs no confirm', () => {
  // Chips: old product per g, new product per g -> both 'kg' category
  const g = kingRepointGuard('g', 'g');
  assert.equal(g.needsConfirm, false);
  assert.equal(g.oldCat, 'kg');
  assert.equal(g.newCat, 'kg');

  assert.equal(kingRepointGuard('g', 'kg').needsConfirm, false, 'g and kg are the same category');
  assert.equal(kingRepointGuard('ml', 'l').needsConfirm, false, 'so are ml and l');
});

test('ITEM 5: a re-link across unit categories goes through the guard', () => {
  const g = kingRepointGuard('g', 'ea');    // per-kg ingredient re-linked to a per-unit product
  assert.equal(g.needsConfirm, true);
  assert.equal(g.oldCat, 'kg');
  assert.equal(g.newCat, 'ea');
  assert.equal(unitCatWord(g.oldCat), 'kg');
  assert.equal(unitCatWord(g.newCat), 'unit');

  assert.equal(kingRepointGuard('ml', 'g').needsConfirm, true, 'litres to kilos is a real change of meaning');
});

test('ITEM 5: the guard cannot fire on incomplete data \u2014 an unknown unit never triggers a confirm', () => {
  assert.equal(kingRepointGuard(null, 'g').needsConfirm, false, 'missing old product: nothing to compare');
  assert.equal(kingRepointGuard('g', null).needsConfirm, false, 'missing new product: nothing to compare');
  assert.equal(kingRepointGuard(null, null).needsConfirm, false);
});

test('ITEM 5: the modal and the invoice path share ONE guard, so they cannot drift', () => {
  // saveKingModal and applyInvoice both call kingRepointGuard — assert there is exactly
  // one definition of the decision, and that both call sites reach for it.
  const defs = SRC.split('function kingRepointGuard(').length - 1;
  assert.equal(defs, 1, 'exactly one definition of the guard');
  const calls = SRC.split('kingRepointGuard(').length - 1;
  assert.ok(calls >= 3, `expected the definition plus a call from each path, found ${calls}`);
});
