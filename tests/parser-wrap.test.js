/*
 * parser-wrap.test.js — D4 of PARSER-AUDIT-2026-09-08.
 *
 * One supplier prints the second half of a description on its own money-less line, and the PACK
 * SIZE is often on that half ("60*120G ANGEL BAY 72361", "UNITS/CTN TIP TOP 9323"). `pdfTextToRows`
 * parsed each extracted line alone, so the continuation was discarded and the row lost its pack:
 * the patties went manual on every invoice, and both bread lines were wrong on all five.
 *
 * The splice puts the continuation into the name AHEAD of the money columns and re-parses. Two
 * details are load-bearing and each has a test below:
 *
 *   `raw` STAYS THE FIRST LINE. It is the supplier-memory key (memKey normalises `raw`), so joining
 *   it would orphan every pack the user has already taught — CLAUDE.md's own orphaned-taught-pack
 *   trap. `cont` records the join instead.
 *
 *   ONE continuation, and only directly under a row. `last` is cleared after any line that is not a
 *   row, so a banner, a summary block or a page marker cannot walk down a page gluing junk onto the
 *   last product it saw.
 *
 * ⚠️ EVERY NEGATIVE CASE HERE IS A LINE THAT REALLY APPEARS ON A REAL INVOICE, not an invented
 * hostile input: the chiller banner, the summary heading, "Page 2 of 3", and a second money-less
 * line under one that was already joined.
 */
const test = require('node:test');
const assert = require('node:assert');
const { pdfTextToRows } = require('./_extract');

function assertClose(a, b, msg) {
  assert.ok(Math.abs(a - b) < 0.001, `${msg} — expected ~${b}, got ${a}`);
}

const PATTIES = '12828 FZ BEEF BURGER PATTIES PART COOKED 2.00 2.00 CTN 2.00 CTN $99.10 $0.00 $198.20';
const PATTIES_CONT = '60*120G ANGEL BAY 72361';

test('D4: a wrapped description is spliced back and the row is re-priced from it', () => {
  const rows = pdfTextToRows([PATTIES, PATTIES_CONT].join('\n'));
  assert.equal(rows.length, 1, 'ONE row, not a row plus a fragment and not a dropped continuation');
  assertClose(rows[0].unitPrice, 13.7639, '$99.10 a carton of 60 x 120g = 7.2kg');
  assert.equal(rows[0].unit, 'kg');
  assert.equal(rows[0].needManual, false, 'before the splice this row had no pack and went manual');
});

test('⚠️ `raw` stays the FIRST line — it is the supplier-memory key', () => {
  const rows = pdfTextToRows([PATTIES, PATTIES_CONT].join('\n'));
  assert.equal(rows[0].raw, PATTIES,
    'joining raw would re-key every pack the user has already taught for this supplier');
  assert.equal(rows[0].cont, PATTIES_CONT, 'the join is recorded separately so it is not invisible');
});

test('the bread line needs BOTH the splice and the suffix multiplier to come out right', () => {
  // "700G/UNIT 6" is on the row and "UNITS/CTN" on the continuation: the 6 is unreadable as a
  // multiplier until the two are one string. This is why D3 and D4 ship together.
  const rows = pdfTextToRows([
    '19011 FZ BREAD - WHITE SLICED 700G/UNIT 6 1.00 1.00 CTN 1.00 CTN $25.00 $0.00 $25.00',
    'UNITS/CTN TIP TOP 9323'
  ].join('\n'));
  assert.equal(rows.length, 1);
  assertClose(rows[0].unitPrice, 5.952, '$25.00 for six 700g loaves = 4.2kg');
});

test('a banner, a summary line and a page marker are never joined', () => {
  for (const junk of ['***** CHILLER *****', 'Summary of Supplies', 'Page 2 of 3', 'Carried Forward']) {
    const rows = pdfTextToRows([PATTIES, junk].join('\n'));
    assert.equal(rows.length, 1, `"${junk}" must not become part of a product name`);
    assert.equal(rows[0].cont, undefined, `"${junk}" was joined and should not have been`);
  }
});

test('a line that carries money is a row of its own, never a continuation', () => {
  const rows = pdfTextToRows([PATTIES, '20110 FLOUR - PLAIN FLOUR 12.5KG 1.00 1.00 BAG 1.00 BAG $12.50 $0.00 $12.50'].join('\n'));
  assert.equal(rows.length, 2, 'two products, two rows');
  assert.equal(rows[0].cont, undefined);
});

test('only ONE continuation joins, and only directly under a row', () => {
  // `last` is cleared once a line has been consumed as a continuation, so the second money-less
  // line has nothing to attach to. Without that clear, an address block would walk down the page.
  const rows = pdfTextToRows([PATTIES, PATTIES_CONT, 'ANOTHER STRAY FRAGMENT'].join('\n'));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].cont, PATTIES_CONT, 'the first joined; the second did not');
  assert.ok(!/ANOTHER STRAY/.test(rows[0].name), 'the second fragment is not in the name');
});

test('a continuation never joins a row that did not parse', () => {
  const rows = pdfTextToRows(['Balance owing as at 07/09/2026', PATTIES_CONT].join('\n'));
  assert.equal(rows.length, 0, 'nothing parsed, so there is nothing to continue');
});

test('a lone continuation-shaped line on its own produces no row', () => {
  assert.equal(pdfTextToRows(PATTIES_CONT).length, 0);
});

test('⚠️ the 60-character bound on a continuation is a bound, and 60 is inside it', () => {
  /* The cap is what stops an address block or a paragraph of terms being read as the tail of a
     product name. It is asserted at the boundary in both directions because an off-by-one here is
     invisible: the real continuations on this cafe's invoices are around twenty characters, so
     nothing that ships would ever notice the line moving. */
  const PATTIES_60 = 'ANGEL BAY SIXTY BY ONE TWENTY GRAM PATTY CARTON PART COOKED.';
  assert.equal(PATTIES_60.length, 60, 'the fixture must sit exactly on the bound');
  assert.equal(pdfTextToRows([PATTIES, PATTIES_60].join('\n'))[0].cont, PATTIES_60, '60 joins');
  assert.equal(pdfTextToRows([PATTIES, PATTIES_60 + 'X'].join('\n'))[0].cont, undefined, '61 does not');
});
