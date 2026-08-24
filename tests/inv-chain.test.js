/*
 * inv-chain.test.js — QUEUE 0c. THE SEAM, not the parts.
 *
 * The finding that commissioned this file: every function in the invoice pricing chain is
 * individually correct and individually tested, and the wrong numbers were arriving anyway.
 * `derivePackPrice` is correct. `resolveMatchedPrice` is correct. `invGstDetect` is correct. The
 * defect 197 shipped lived in the twenty lines that call them in order, and nothing ran those
 * twenty lines — `grep -rn buildInvRows tests/` returned one hit and it was a comment.
 *
 * So this file runs the WHOLE chain: raw invoice text -> pdfTextToRows -> buildInvRows -> a review
 * row, against a known product set, and asserts the row a human would actually see. Everything is
 * the real shipped code, sliced by tests/_extract.js. There is no stub anywhere in it, which
 * matters more here than usual: a stub of any one link would be a second implementation of the
 * exact composition under test.
 *
 * WHAT THIS PINS THAT NOTHING ELSE DID: candidate ranking feeding the confidence tier, the tier
 * feeding the add-new threshold, the threshold deciding bestId, and bestId deciding whether
 * resolveMatchedPrice runs at all. Four decisions in a row where each one's output is the next
 * one's input, which is the shape a single-function test cannot see.
 */
const test = require('node:test');
const assert = require('node:assert');
const H = require('./_extract.js');

const EX = { mode: 'ex', note: '' };
const INC = { mode: 'inc', note: '' };

/* A small, REAL-shaped catalogue. The three base units are all represented on purpose: the unit
   guard is a comparison between the row's unit and the product's, so a fixture where they all agree
   cannot tell you which side the code read (roster 184(b)). */
const CATALOGUE = [
  { id: 'P1', description: 'Chips Straight Cut 10Mm', brand: 'Safries', base_unit: 'g',  cost_per_base_unit: 0.0050 },
  { id: 'P2', description: 'Tomato Diced Italian Tinned Peeled', brand: 'Ardmona', base_unit: 'g', cost_per_base_unit: 0.0030 },
  { id: 'P3', description: 'Eggs Free Range 700G', brand: 'Sunny', base_unit: 'ea', cost_per_base_unit: 0.50 },
  { id: 'P4', description: 'Cheese Slices Tasty', brand: 'Yarde Farm', base_unit: 'ea', cost_per_base_unit: 0.20 },
];

/** Drive the real chain over one invoice line and hand back the row the review screen would build. */
function chain(line, opts) {
  opts = opts || {};
  H.setInvState({
    PRODUCTS: opts.products || CATALOGUE,
    invGst: opts.gst || EX,
    invSupplier: opts.supplier || '',
    supplierMem: opts.mem || {},
  });
  H.buildInvRows(H.pdfTextToRows(line));
  const rows = H.getInvRows();
  assert.strictEqual(rows.length, 1, `the fixture line must yield exactly one row, got ${rows.length}: ${line}`);
  return rows[0];
}

/* ---------------------------------------------------------------------------
 * 1. RANK -> TIER -> ADD-NEW -> bestId. Four decisions, each one's output the next one's input.
 * ------------------------------------------------------------------------- */

test('0c: a confident match resolves all the way to a priced, matched row', () => {
  const r = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00');
  assert.strictEqual(r.bestId, 'P1');
  assert.strictEqual(r.addNew, false);
  assert.strictEqual(r.tier, 'hi');
  assert.strictEqual(r.unit, 'kg');
  assert.strictEqual(r.unitPrice, 5.5, '$55 over a 10kg line is $5.50/kg');
  assert.strictEqual(r.needManual, false);
  assert.strictEqual(r.unitMismatch, false, 'kg against a per-gram product is the SAME category');
  assert.strictEqual(r.priceSource, 'parser');
});

test('0c: the three confidence tiers are the thresholds the code states, driven from real names', () => {
  // hi >= 0.6, mid 0.3-0.59, lo < 0.3. Measured against the real ranker rather than asserted from
  // the comment: these three lines were chosen BY running them, which is the only way to be sure a
  // fixture lands in the band its test claims.
  assert.strictEqual(chain('BULK PEELED CARTON 6X2.5KG  30.00  30.00').tier, 'hi');
  const mid = chain('ARDMONA PEELED 6X2.5KG  30.00  30.00');
  assert.strictEqual(mid.tier, 'mid');
  assert.ok(mid.conf >= 0.3 && mid.conf < 0.6, `mid must sit in the band, got ${mid.conf}`);
  assert.strictEqual(mid.bestId, 'P2', 'a mid row still carries its match — it is a tick it waits for, not a name');
  assert.strictEqual(mid.addNew, false);
});

test('0c: EXACTLY 0.6 is hi — the boundary is `>=`, and one character decides the auto-tick', () => {
  /* The tier boundary is the highest-consequence number in this function and the hardest to test by
     accident: `top>=0.6?'hi':...`, and only a 'hi' row can ever reach 'matched', which is the only
     state that PRE-TICKS. Flip that `>=` to `>` and every row sitting exactly on the line stops
     auto-ticking; flip the add-new `<` the other way and a row stops being matched at all.
     0.6 is reachable exactly, and not by contrivance: rankCandidates floors the score at 0.6
     whenever the first content word matches and is four characters or more ("one strong content
     word is enough"), so this is the value the FLOOR produces, on the boundary it is set to. A
     fixture at 0.5 or 0.65 cannot see either flip. */
  const r = chain('TOMATO BULK CARTON PALLET STOCK 6X2.5KG  30.00  30.00');
  assert.strictEqual(r.conf, 0.6, 'the fixture must land ON the boundary, or this test is about nothing');
  assert.strictEqual(r.tier, 'hi', '>= 0.6 is hi — exactly 0.6 is INSIDE');
  assert.strictEqual(r.addNew, false);
  assert.strictEqual(r.bestId, 'P2');
});

test('0c: below the add-new threshold there is NO match, and the two facts move together', () => {
  /* addNew and bestId are computed from the same `top`, one line apart, and the row is unusable if
     they disagree: an add-new row with a bestId would offer to create a product AND overwrite one. */
  const r = chain('FRESH PRODUCE MIXED 6X2.5KG  30.00  30.00');
  assert.strictEqual(r.addNew, true);
  assert.strictEqual(r.bestId, null, 'an add-new row must carry no match at all');
  assert.strictEqual(r.tier, 'lo');
  assert.ok(r.conf < 0.3, `below the threshold, got ${r.conf}`);
  assert.strictEqual(r.unitPrice, 2, '$30 over 15kg — the parser price survives; the row is new, not unreadable');
});

/* ---------------------------------------------------------------------------
 * 2. THE UNIT GUARD, reached through the chain rather than called directly.
 * ------------------------------------------------------------------------- */

test('0c: a parser price in the wrong category is BLOCKED, and blocked means needManual', () => {
  // Eggs are stored per unit; the line prices them per kg. resolveMatchedPrice sets both flags and
  // the review screen reads both — one without the other is a red row nobody can resolve, or a
  // resolvable row with no warning.
  const r = chain('EGGS FREE RANGE 700G 1DOZ  8.40  8.40');
  assert.strictEqual(r.bestId, 'P3');
  assert.strictEqual(r.unitMismatch, true);
  assert.strictEqual(r.needManual, true, 'the mismatch must also force the manual path');
});

test('0c: same category, no block — or every ordinary weighted line would flag', () => {
  const r = chain('TOMATO DICED TINNED 6X2.5KG  30.00  30.00');
  assert.strictEqual(r.unitMismatch, false);
  assert.strictEqual(r.needManual, false);
  assert.strictEqual(r.unitPrice, 2, '$30 over 15kg');
});

/* ---------------------------------------------------------------------------
 * 3. PRECEDENCE: product pack > supplier memory > parser. Max's real repro.
 * ------------------------------------------------------------------------- */

const SLICES = "CHEESE SLICES TASTY 105S 1.5KG  21.00  21.00";

test('0c: MAX’S REPRO — the parser reads 1.5kg and gets the unit wrong; the taught pack fixes it', () => {
  /* The invoice never says how many slices, so the parser derives $14.00/kg from the 1.5kg it CAN
     see — against a product stored per unit, which is why the guard fires. Teaching 105 units turns
     the same line into $0.20/slice with nothing flagged. This is one line resolving two completely
     different ways depending on state the parser cannot see, which is exactly the seam. */
  const raw = chain(SLICES);
  assert.strictEqual(raw.priceSource, 'parser');
  assert.strictEqual(raw.unitPrice, 14, '$21 over 1.5kg');
  assert.strictEqual(raw.unitMismatch, true, 'per kg against a per-unit product');

  const taught = chain(SLICES, {
    products: CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p)),
  });
  assert.strictEqual(taught.priceSource, 'product-pack');
  assert.strictEqual(taught.unitPrice, 0.2, '$21 over 105 slices');
  assert.strictEqual(taught.unit, 'ea');
  assert.strictEqual(taught.unitMismatch, false);
  assert.strictEqual(taught.needManual, false);
});

test('0c: supplier memory prices the line when the product has NO pack of its own', () => {
  const key = 'bidfood|' + H.normalizePhrase('CHEESE SLICES TASTY 105S 1.5KG');
  const mem = {}; mem[key] = { qty: 105, unit: 'ea' };
  const r = chain(SLICES, { supplier: 'Bidfood', mem });
  assert.strictEqual(r.priceSource, 'memory');
  assert.strictEqual(r.unitPrice, 0.2);
  assert.strictEqual(r.unit, 'ea');
});

test('0c: the product’s OWN pack outranks supplier memory when they disagree', () => {
  /* The precedence is only observable when the two say DIFFERENT things — a fixture where they agree
     cannot tell you which one the code read (roster 184(b)). 105 against 21 is a five-fold gap, so
     the wrong winner is unmistakable rather than a rounding argument. */
  const key = 'bidfood|' + H.normalizePhrase('CHEESE SLICES TASTY 105S 1.5KG');
  const mem = {}; mem[key] = { qty: 21, unit: 'ea' };
  const r = chain(SLICES, {
    products: CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p)),
    supplier: 'Bidfood', mem,
  });
  assert.strictEqual(r.priceSource, 'product-pack');
  assert.strictEqual(r.unitPrice, 0.2, 'the PACK’s 105, not memory’s 21 (which would be $1.00)');
});

/* ---------------------------------------------------------------------------
 * 4. GST: converted ONCE, on the price that gets stored. 197's defect, pinned through the chain.
 * ------------------------------------------------------------------------- */

test('0c: the GST conversion lands on the RESOLVED price, not the parser’s candidate', () => {
  /* 197's defect in one assertion. The conversion used to run on the parser's price inside
     buildInvRows, and a taught pack then REPLACED that price by re-reading the raw line — which is
     still GST-inclusive — so the one path that got divided was the one that loses the precedence
     contest. The two rows below take different precedence branches and must both come back ex-GST. */
  const packed = CATALOGUE.map(p => (p.id === 'P4' ? { ...p, pack_qty: 105, pack_unit: 'ea' } : p));
  const inc = chain(SLICES, { products: packed, gst: INC });
  const ex  = chain(SLICES, { products: packed, gst: EX });
  assert.strictEqual(ex.unitPrice, 0.2);
  assert.ok(Math.abs(inc.unitPrice - 0.2 / 1.1) < 1e-9,
    `a taught pack on a GST-inclusive invoice must be divided too, got ${inc.unitPrice}`);

  const parserInc = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00', { gst: INC });
  assert.ok(Math.abs(parserInc.unitPrice - 5.5 / 1.1) < 1e-9, 'and so must a parser-priced row');
});

test('0c: an EXCLUSIVE invoice is not divided — the conversion is a decision, not a habit', () => {
  const r = chain('CHIPS STRAIGHT CUT 10MM 10KG  55.00  55.00', { gst: EX });
  assert.strictEqual(r.unitPrice, 5.5);
});
