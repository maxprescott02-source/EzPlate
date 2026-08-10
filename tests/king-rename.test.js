/*
 * king-rename.test.js — locks in the v35 Item 2 rename rules.
 *
 * v34 deliberately set `nameEl.disabled=isEdit` ("name locked when changing
 * product"). v35 unlocks it. That is only safe because plates persist
 * {kid, qty} and resolve the label live through kById — verified by grep before
 * the change — so a rename is display-only and cannot disturb a saved recipe.
 *
 * The rules pinned here:
 *   - renaming onto ANOTHER word's name is refused (case-insensitive)
 *   - re-saving a word under its OWN current name is fine (it is not a clash)
 *   - a rename is never a copy: one word in, one word out, same id
 *   - blank names are refused
 *
 * kingRenameCheck is brace-extracted from the REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
// eslint-disable-next-line no-new-func
const kingRenameCheck = new Function(`"use strict"; ${extractFn(SRC, 'kingRenameCheck')} return kingRenameCheck;`)();

const WORDS = () => ([
  { id: 'K0001', name: 'Chips', pid: 'P0108' },
  { id: 'K0002', name: 'Fish', pid: 'P0010' },
  { id: 'K0003', name: 'Tartare', pid: 'P0298' }
]);

test('ITEM 2: a plain rename is accepted', () => {
  const r = kingRenameCheck('K0001', 'Straight Cut Chips', WORDS());
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Straight Cut Chips');
});

test('ITEM 2: renaming onto another word\u2019s name is refused, case-insensitively', () => {
  const exact = kingRenameCheck('K0001', 'Fish', WORDS());
  assert.equal(exact.ok, false);
  assert.equal(exact.reason, 'duplicate');

  const cased = kingRenameCheck('K0001', 'fIsH', WORDS());
  assert.equal(cased.ok, false, 'case must not be an escape hatch for duplicates');
  assert.equal(cased.reason, 'duplicate');

  const spaced = kingRenameCheck('K0001', '  Fish  ', WORDS());
  assert.equal(spaced.ok, false, 'neither is padding');
});

test('ITEM 2: a word\u2019s OWN current name is not a clash \u2014 saving an unchanged name is allowed', () => {
  const same = kingRenameCheck('K0002', 'Fish', WORDS());
  assert.equal(same.ok, true, 'kingNameExists alone would wrongly reject this');
  assert.equal(same.name, 'Fish');

  // and a pure case-change of its own name is a legitimate rename, not a duplicate
  const recase = kingRenameCheck('K0002', 'FISH', WORDS());
  assert.equal(recase.ok, true);
  assert.equal(recase.name, 'FISH');
});

test('ITEM 2: a blank or whitespace-only name is refused', () => {
  assert.equal(kingRenameCheck('K0001', '', WORDS()).ok, false);
  assert.equal(kingRenameCheck('K0001', '   ', WORDS()).reason, 'empty');
  assert.equal(kingRenameCheck('K0001', null, WORDS()).ok, false);
});

test('ITEM 2: a rename is never a copy \u2014 the decision is trimmed and singular', () => {
  const r = kingRenameCheck('K0001', '  Hot Chips  ', WORDS());
  assert.equal(r.ok, true);
  assert.equal(r.name, 'Hot Chips', 'the name is trimmed before it lands');
  // the check yields ONE name for ONE id; there is no path here that mints a second word
  assert.deepEqual(Object.keys(r).sort(), ['name', 'ok']);
});
