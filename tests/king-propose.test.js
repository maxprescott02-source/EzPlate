/*
 * king-propose.test.js — locks the v34 Item 2 kitchen-name proposer.
 *
 * proposeKingName turns a supplier product description into a friendly kitchen word:
 * numbers, unit/packaging/filler words, and the brand are dropped (via the same
 * INV_STOP/coreTokens the invoice matcher uses), duplicates collapse, and the first
 * three remaining words are title-cased. The wizard, the Builder create flow, and the
 * invoice "Kitchen name (optional)" field all pre-fill from this — a regression here
 * silently degrades all three.
 *
 * Extracted from the REAL shipped js/app.js (no second copy to drift).
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

function build() {
  const src = loadApp();
  const stopLine = src.split('\n').find((l) => l.startsWith('var INV_STOP='));
  if (!stopLine) throw new Error('king-propose: INV_STOP line not found. app.js changed.');
  const code = [stopLine, extractFn(src, 'inorm'), extractFn(src, 'coreTokens'), extractFn(src, 'proposeKingName')].join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(`"use strict"; ${code}\n return proposeKingName;`)();
}

const propose = build();

test('strips pack sizes, units, and packaging words', () => {
  assert.equal(propose({ description: 'Eggs Large Bulk (180 Eggs)' }), 'Eggs Large');   // 'bulk' is a filler word; '180' is pack size
  assert.equal(propose({ description: 'Chips Straight Cut 6 x 2.5kg Ctn' }), 'Chips Straight');
});

test('drops the supplier brand from the kitchen word', () => {
  assert.equal(propose({ description: 'Birds Eye Chips Straight', brand: 'Birds Eye' }), 'Chips Straight');
});

test('caps at three words and title-cases', () => {
  const out = propose({ description: 'smoked salmon trim offcuts skin off premium' });
  assert.ok(out.split(' ').length <= 3, `got "${out}"`);
  out.split(' ').forEach((w) => assert.match(w, /^[A-Z]/));
});

test('never returns an empty name, even for junk descriptions', () => {
  assert.ok(propose({ description: '6 x 2.5kg' }).length > 0);
  assert.ok(propose({ description: '' }).length > 0);
});
