/*
 * parser-count.test.js — D6 and D7 of PARSER-AUDIT-2026-09-08.
 *
 * D6. `packCount`'s multiplier accepted "N x", "N *" or "N of" with NOTHING required after the
 * symbol, so a supermarket receipt's taxable marker — the bare "*" that follows the line amount —
 * read as a multiplication: "9.00 *" became "nine times", and a $1.36 roll of paper towel was
 * stored at $0.91. The symbol now has to be followed by a digit, which is what a multiplication is.
 *
 * D6 also: "pack", "pk" and "pkt" are counts. "48 pack" and "6PK" name how many are in the pack as
 * plainly as "48 units" does, and both appear on real dockets.
 *
 * D7. A dozen or a pack count printed alongside a weight lost to the weight, because `parsePdfLine`
 * asked packWeight first. "EGGS - 600G 15X1 DOZEN" is 180 eggs; the 600g is the egg GRADE, not the
 * pack. The count is now tried first when the pack text spells one out.
 *
 * ⚠️ THE BARE "105S" FORM DELIBERATELY KEEPS THE OLD PRECEDENCE (weight first). tests/inv-chain.test.js
 * pins that reading for "CHEESE SLICES TASTY 105S 1.5KG" — per kg, with a taught pack correcting it
 * — and the audit records the choice as an open residual rather than settling it here. Changing it
 * is a separate decision about which of two real cases wins; both are in the corpus fixtures.
 */
const test = require('node:test');
const assert = require('node:assert');
const { packCount, parsePdfLine } = require('./_extract');

function assertClose(a, b, msg) {
  assert.ok(Math.abs(a - b) < 0.001, `${msg} — expected ~${b}, got ${a}`);
}

test('D6: a multiplier must be followed by a number', () => {
  assert.equal(packCount('PAPER TOWEL 1 @ $9.00 9.00 *'), null,
    'the trailing * is a receipt\'s taxable marker, not "nine times"');
  assert.equal(packCount('9.00 *'), null);
  assert.equal(packCount('CARTONS 6 x 2 dozen'), 144, 'a real multiplication still folds: 6 x 24');
});

test('D6: "pack", "pk" and "pkt" name a count', () => {
  assert.equal(packCount('PAPER TOWEL 6PK'), 6);
  assert.equal(packCount('Croissant butter 48 pack'), 48);
  assert.equal(packCount('SERVIETTES 200 PKT'), 200);
});

test('the pre-existing count words are untouched', () => {
  /* ⚠️ 8 is what this returns and 48 is what the pack means, and that is NOT a regression from this
     batch — it is the shipped answer, unchanged. The apostrophe-s shorthand needs TWO digits
     ("105'S", "400'S"), so "6's" falls through and only the leading multiplier survives. It is
     recorded here rather than fixed because the real invoice this pack comes from cannot be run
     from inside this repo: the extracted text lives outside it (the corpus item, 37), and the one
     assertion nobody should write is a claim about a real line nobody can execute. */
  assert.equal(packCount('PANCAKES HOTCAKES PLAIN 8x6\'s'), 8, 'the multiplier, and the 6 is lost');
  assert.equal(packCount('EGGS 1 DOZEN'), 12);
  assert.equal(packCount('CONTAINERS 500S'), 500, 'the bare shorthand count');
  // A pure weight pack has no count word, so only the multiplier chain answers — 8, meaning eight
  // loaves. parsePdfLine asks packWeight FIRST for a line like this, so the 8 is never the divisor.
  assert.equal(packCount('BREAD SOURDOUGH 8x1.2kg'), 8);
  assert.equal(packCount('FLOUR - PLAIN FLOUR 12.5KG'), null, 'no count and no multiplier: nothing to say');
});

test('D7: a dozen beats a weight on the same line', () => {
  // 15 x 1 dozen = 180 eggs for $58.50. Shipped stored $5.00/kg off the 600g grade; with the
  // column fix alone it would have been $97.50/kg.
  const r = parsePdfLine('18599 EGGS - 600G 15X1 DOZEN 3.00 3.00 CTN 3.00 CTN $58.50 $0.00 $175.50');
  assertClose(r.unitPrice, 0.325, '$58.50 over 180 eggs');
  assert.equal(r.unit, 'ea');
});

test('D7: a spelled-out pack count beats a weight too', () => {
  const r = parsePdfLine('Croissant butter 48 pack 2.00 62.40 GST Free 124.80');
  assertClose(r.unitPrice, 1.30, '$62.40 over 48');
  assert.equal(r.unit, 'ea');
});

test('⚠️ the bare NNNs form still lets the weight win — the residual, pinned on purpose', () => {
  // Not an endorsement: tests/inv-chain.test.js pins this reading, the taught pack corrects it, and
  // the opposite case (a 750ML container in a 500S sleeve) is wrong the other way. Whichever way
  // this goes is a decision, and a silent flip of it is what this assertion exists to prevent.
  const r = parsePdfLine('CHEESE SLICES TASTY 105S 1.5KG 2 24.00 24.00 48.00');
  assert.equal(r.unit, 'kg', 'the weight still wins for the bare form; see the audit residuals');
});

test('a weight with no count anywhere still prices per kilogram', () => {
  const r = parsePdfLine('20110 FLOUR - PLAIN FLOUR 12.5KG 1.00 1.00 BAG 1.00 BAG $12.50 $0.00 $12.50');
  assert.equal(r.unit, 'kg');
  assertClose(r.unitPrice, 1.00, '$12.50 for 12.5kg');
});
