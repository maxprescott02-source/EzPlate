/*
 * inv-packnorm.test.js — v55 §I: compound pack notation "N x M's" is normalised to "(N*M)'s" BEFORE the
 * protected parser runs, so packCount reads e.g. "6x8's" as 48 units per pack (not just the "6x" = 6).
 *
 * The fix lives OUTSIDE the protected region (normPackNotation, applied to the raw invoice text); packCount
 * itself (inside the region) is untouched. Both are brace-extracted from the REAL js/app.js.
 *
 * KNOWN LIMITATION (see HANDOVER-v55 §I): this fixes the per-pack COUNT. It does NOT add purchased-quantity
 * (invoice "qty" column) capture — that column isn't parsed anywhere — so a line priced at its TOTAL for
 * several packs still needs the taught-pack flow. Documented, not silently ignored.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

const helpers = new Function(`
  "use strict";
  ${extractFn(SRC, 'normPackNotation')}
  ${extractFn(SRC, 'packCount')}
  return { normPackNotation: normPackNotation, packCount: packCount };
`)();
const { normPackNotation, packCount } = helpers;

test('v55 I: 6x8-apostrophe-s normalises so packCount reads 48 (was 6)', () => {
  assert.strictEqual(packCount("6x8's"), 6, 'baseline: the protected parser alone reads only the 6x');
  const norm = normPackNotation("BACON MIDDLE 6x8's 50.00 50.00");
  assert.ok(/48's/.test(norm), 'the raw line is rewritten to 48-apostrophe-s: ' + norm);
  assert.strictEqual(packCount(norm), 48, 'now the parser reads 48 units per pack');
});

test('v55 I: spaced and case variants compose too', () => {
  assert.ok(/72's/.test(normPackNotation("EGGS 12 x 6's")), '12 x 6s -> 72s');
  assert.ok(/48's/.test(normPackNotation("6 X 8'S RASHERS")), 'uppercase X and S');
});

test('v55 §I: non-compound / weight packs are left ALONE', () => {
  assert.strictEqual(normPackNotation("OIL 6 x 2.5kg 40.00"), "OIL 6 x 2.5kg 40.00", 'weight pack untouched (no apostrophe-s)');
  assert.strictEqual(normPackNotation("TRAY 6x8 24.00"), "TRAY 6x8 24.00", 'bare 6x8 (no s) left ambiguous, untouched');
  assert.strictEqual(normPackNotation("SLICES 400's 12.00"), "SLICES 400's 12.00", 'a plain count is unchanged');
  assert.strictEqual(packCount("SLICES 400's 12.00"), 400, 'and still reads 400');
});
