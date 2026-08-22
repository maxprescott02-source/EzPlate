/*
 * invoice-gst.test.js — THE COMPOSITION TEST, and it exists because of what its absence cost.
 *
 * A GST-inclusive invoice must store ex-GST prices. The divisor was written out inline on ONE of
 * the four paths that can set a row's price, and the other three re-read the price off the raw
 * invoice text AFTER it — so the one path that was converted was the one that LOST the precedence
 * contest, and a taught pack stored 10% high while the review screen printed
 * "GST-inclusive prices detected — converted to ex-GST" directly above it.
 *
 * ⚠️ WHY THIS FILE CALLS buildInvRows AND NOT ITS PARTS. Every function in that chain was already
 * extractable and individually tested — tests/product-pack.test.js pins resolveMatchedPrice's
 * precedence and its unit guard, and it is a good file. The defect was in none of them.
 * derivePackPrice was correct. resolveMatchedPrice was correct. invGstDetect was correct. The wrong
 * number came from the twenty lines that call them in order, and nothing in this repo ran those
 * twenty lines. A blind code audit found it (docs/audits/BLIND-AUDIT-2026-08-22-code.md, finding 1)
 * from the code alone, and an independent process audit predicted it the same day from the shape of
 * the gates — neither had seen the other.
 *
 * So: assert through the ASSEMBLY. Testing the parts again would have re-proved that each part is
 * right, which was never in doubt and is exactly how this shipped.
 */
const test = require('node:test');
const assert = require('node:assert');
const { setInvState, getInvRows, invPaints, buildInvRows, pdfTextToRows, invGstDetect, invGstAdjust } = require('./_extract.js');

const near = (a, b, m) => assert.ok(a != null && Math.abs(a - b) < 0.005, `${m}: expected ~${b}, got ${a}`);

// A real-shaped line: pack price printed twice, which is the "unit price column" firstPairPrice reads.
const CHIPS = 'CHIPS STRAIGHT CUT 10KG  55.00  55.00';
const INC = { mode: 'inc', note: 'GST-inclusive prices detected — converted to ex-GST (÷1.10) for storage.' };
const EX = { mode: 'ex', note: 'GST-exclusive prices detected.' };

// Stored per GRAM, with a taught pack of 10 kg — the shape that was wrong.
const TAUGHT = [{ id: 'P1', description: 'Chips Straight Cut', base_unit: 'g', cost_basis: '$/g', pack_qty: 10, pack_unit: 'kg' }];
const UNTAUGHT = [{ id: 'P1', description: 'Chips Straight Cut', base_unit: 'g', cost_basis: '$/g', pack_qty: null, pack_unit: null }];

function priceFor(products, gst, extra) {
  setInvState(Object.assign({ PRODUCTS: products, invGst: gst }, extra || {}));
  buildInvRows(pdfTextToRows(CHIPS));
  const rows = getInvRows();
  assert.equal(rows.length, 1, 'fixture must produce exactly one row');
  return rows[0];
}

test('THE DEFECT: a taught pack and the bare parser must agree on a GST-inclusive invoice', () => {
  const taught = priceFor(TAUGHT, INC);
  const parser = priceFor(UNTAUGHT, INC);

  // The precedence must still be doing its job, or this test proves nothing about the taught path.
  assert.equal(taught.priceSource, 'product-pack', 'fixture must exercise the taught-pack path');
  assert.notEqual(parser.priceSource, 'product-pack', 'control must NOT take the taught path');

  near(taught.unitPrice, 5.0, 'taught pack, GST-inclusive');
  near(parser.unitPrice, 5.0, 'parser, GST-inclusive');
  // ⚠️ The equality is the load-bearing half. Before the fix these were 5.50 and 5.00 — both
  // plausible, neither erroring, and only the DISAGREEMENT gives the defect away.
  near(taught.unitPrice, parser.unitPrice, 'the two paths must not disagree');
});

test('the same invoice read as GST-exclusive is NOT divided', () => {
  const taught = priceFor(TAUGHT, EX);
  const parser = priceFor(UNTAUGHT, EX);
  near(taught.unitPrice, 5.5, 'taught pack, GST-exclusive');
  near(parser.unitPrice, 5.5, 'parser, GST-exclusive');
});

test('supplier memory is the third path and it is converted too', () => {
  // needManual rows take applySupplierMemory; matched rows take resolveMatchedPrice's memory branch.
  // Both re-derive from the raw line, so both were 10% high.
  const row = priceFor(UNTAUGHT, INC, {
    invSupplier: 'Bidfood',
    supplierMem: { 'bidfood|chips straight cut kg': { qty: 10, unit: 'kg' } },
  });
  near(row.unitPrice, 5.0, 'remembered pack, GST-inclusive');
});

test('a row with no price is left alone rather than coerced to zero', () => {
  // isFinite('') and isFinite(null) are both true (CLAUDE.md), so a naive guard fabricates $0.00.
  assert.equal(invGstAdjust(null), null);
  assert.equal(invGstAdjust(undefined), undefined);
  assert.equal(invGstAdjust(''), '');
});

test('invGstAdjust divides once and only when the invoice is inclusive', () => {
  setInvState({ invGst: INC });
  near(invGstAdjust(11), 10, 'inclusive → divided');
  setInvState({ invGst: EX });
  assert.equal(invGstAdjust(11), 11, 'exclusive → untouched');
  setInvState({ invGst: { mode: 'unknown', note: '' } });
  assert.equal(invGstAdjust(11), 11, 'unknown → untouched (invGstDetect resolves this before we get here)');
});

test('invGstDetect still routes an unclear invoice through the Settings default', () => {
  // Guards the entry condition the three tests above depend on: if detection stopped returning
  // 'inc' for an inclusive invoice, every assertion here would pass for the wrong reason.
  assert.equal(invGstDetect('Prices include GST').mode, 'inc');
  assert.equal(invGstDetect('All prices ex GST').mode, 'ex');
});

test('buildInvRows repaints the review after it has priced the rows', () => {
  // Its contract is not only "compute" — it ends by rendering, and without that an import leaves
  // the review screen showing the PREVIOUS invoice. Pinned here because the mutation gate found
  // deleting the call survived: this file stubs the DOM, so nothing else could notice.
  setInvState({ PRODUCTS: TAUGHT, invGst: INC });
  assert.equal(invPaints(), 0, 'nothing painted before the call');
  buildInvRows(pdfTextToRows(CHIPS));
  assert.equal(invPaints(), 1, 'buildInvRows must request exactly one repaint');
});
