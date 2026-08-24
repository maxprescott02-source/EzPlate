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
const { setInvState, getInvRows, invPaints, invPackPreviewText, invDerivePackQty, invReResolve, buildInvRows, pdfTextToRows, invGstDetect, invGstAdjust } = require('./_extract.js');

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

test('0c: an invoice that says NOTHING follows the Settings default — in BOTH directions', () => {
  /* The surviving mutant was `return (gstDefault==='inc')` flipped to `!==`, and it survived because
     this file only ever exercised invoices that STATE their tax basis. The fallback is the whole
     point of the line: it is what runs on an invoice whose letterhead the parser could not read,
     which is the common case, and getting it backwards prices every line 10% wrong in whichever
     direction the owner did not choose.
     Both directions are asserted from one unstated text, so the test cannot pass by the default
     being ignored: the SAME input has to give opposite answers as the setting moves. */
  const SILENT = 'CHIPS STRAIGHT CUT 10KG  55.00  55.00';
  assert.doesNotMatch(SILENT.toLowerCase(), /gst/, 'the fixture must genuinely say nothing about GST');

  setInvState({ gstDefault: 'inc' });
  assert.equal(invGstDetect(SILENT).mode, 'inc', 'the owner set inclusive, so an unstated invoice is inclusive');
  setInvState({ gstDefault: 'ex' });
  assert.equal(invGstDetect(SILENT).mode, 'ex', 'and the other way round');

  // An EXPLICIT statement still outranks the default, or the setting would silently override the
  // supplier — which is the opposite failure and just as expensive.
  setInvState({ gstDefault: 'ex' });
  assert.equal(invGstDetect('Prices include GST').mode, 'inc', 'the invoice wins over the default');
  setInvState({ gstDefault: 'inc' });
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

/* ─────────────────────────────────────────────────────────────────────────────
   THE SECOND HALF, and it exists because the first half's comment was WRONG.
   That comment enumerated "four producers" and said a fifth would be covered too. The pre-push
   review found two more, and a mechanical sweep for every packPriceOf call and every `.unitPrice=`
   assignment then found a fourth problem the review had not reached. Six sites, not four - which is
   this project's standing lesson that every enumeration comes back different from the guess.
   ⚠️ COVERAGE STATED HONESTLY: two of the four newly-fixed sites are DOM-bound event handlers
   (invSelChanged, and the .invPackQty/.invPackUnit recompute closure) and are NOT executed here.
   What IS pinned below is the shared formula they are required to agree with. That is a real
   invariant and it is not the same as driving the handlers; saying so is the point.
   ───────────────────────────────────────────────────────────────────────────── */

test('the derive-preview promises the price that will actually be STORED', () => {
  // invPackPreviewText's own comment: "the render prefill and the live recompute must never
  // disagree, so both read this". Before the fix it previewed $5.50 while storage took $5.00.
  const stored = priceFor(TAUGHT, INC).unitPrice;
  setInvState({ PRODUCTS: TAUGHT, invGst: INC });
  buildInvRows(pdfTextToRows(CHIPS));
  const preview = invPackPreviewText(getInvRows()[0], 10, 'kg');

  assert.match(preview, /will be \$/, 'fixture must produce a real preview string');
  const shown = parseFloat(preview.match(/will be \$([\d.]+)/)[1]);
  near(shown, 5.0, 'preview on a GST-inclusive invoice');
  near(shown, stored, 'the preview and the stored price must be the same number');
});

test('0b: the preview stops PROMISING a price the write will refuse', () => {
  /* "will be" is a promise, and applyInvoice now refuses a pack whose unit would re-base the
     product — so on that row the preview contradicted the explanation printed directly beneath it.
     The FIGURE is deliberately kept: seeing that their pack computes to $5.50 per UNIT is how a user
     recognises they picked the wrong unit. Only the promise goes.
     Read off the PROSPECTIVE unit, not the row's, because this line is what the live control shows
     while the user is still choosing — the row has not been changed yet. */
  setInvState({ PRODUCTS: TAUGHT, invGst: EX });
  buildInvRows(pdfTextToRows(CHIPS));
  const row = getInvRows()[0];
  const bad = invPackPreviewText(row, 10, 'ea');            // Chips is stored per gram
  assert.match(bad, /which won.t be applied/, 'the refusal has to be on the line making the claim');
  assert.doesNotMatch(bad, /will be/, 'and the promise must be gone, not merely qualified');
  assert.match(bad, /\$5\.50\/unit/, 'the computed figure stays — it is what tells the user the unit is wrong');
  // the SAME call in the product's own category is unchanged, or this becomes a warning on every row
  assert.match(invPackPreviewText(row, 10, 'kg'), /will be \$5\.50\/kg/);
});

test('the preview is NOT divided when the invoice is GST-exclusive', () => {
  setInvState({ PRODUCTS: TAUGHT, invGst: EX });
  buildInvRows(pdfTextToRows(CHIPS));
  const preview = invPackPreviewText(getInvRows()[0], 10, 'kg');
  near(parseFloat(preview.match(/will be \$([\d.]+)/)[1]), 5.5, 'exclusive invoice, undivided');
});

test('a pack size derived from the entered price divides two figures on the SAME tax basis', () => {
  // Runs the REAL invDerivePackQty that applyInvoice now calls. The earlier version of this test
  // re-typed the formula in the test file, which the second review correctly called out: it would
  // have passed with the shipped line reverted.
  setInvState({ invGst: INC });
  const entered = 5.0;                                    // the price field, ex-GST, for a 10kg pack
  assert.equal(invDerivePackQty(CHIPS, entered), 10, 'must derive 10, not 11');
  // and the neat-integer snap is why the wrong answer HIDES rather than showing as an odd fraction:
  setInvState({ invGst: EX });
  assert.equal(invDerivePackQty(CHIPS, entered), 11, 'un-adjusted the same figures snap clean to 11');
});

test('THE DOUBLE-APPLICATION: re-resolving an already-converted row must not divide it twice', () => {
  // The match dropdown re-resolves against a different product. resolveMatchedPrice's third branch
  // passes row.unitPrice straight through — and by then it has ALREADY been converted once by
  // buildInvRows. Converting again lands 9.09% low, which is UNDER the 12% PRICE_JUMP threshold,
  // so the app's own guard stays silent. This drives the real invReResolve.
  const row = priceFor(UNTAUGHT, INC);
  const once = row.unitPrice;
  near(once, 5.0, 'precondition: buildInvRows converted it exactly once');

  // re-pick a product with NO taught pack and no supplier memory -> the pass-through branch
  invReResolve(row, { pack_qty: null, pack_unit: null, base_unit: 'g' }, null);
  assert.equal(row.priceSource, 'parser', 'fixture must exercise the PASS-THROUGH branch');
  near(row.unitPrice, once, 'a pass-through must not be re-converted');

  // and it must COMPOUND-proof: repeating the action changes nothing further
  invReResolve(row, { pack_qty: null, pack_unit: null, base_unit: 'g' }, null);
  near(row.unitPrice, once, 'repeated dropdown changes must not drift');
});

test('re-resolving onto a product that DOES have a taught pack still converts exactly once', () => {
  // The other side of the same condition — proving the guard did not simply disable the conversion.
  const row = priceFor(UNTAUGHT, INC);
  invReResolve(row, { pack_qty: 10, pack_unit: 'kg', base_unit: 'g' }, null);
  assert.equal(row.priceSource, 'product-pack', 'fixture must exercise the RE-DERIVING branch');
  near(row.unitPrice, 5.0, 're-derived from raw text, converted once');
});

test('invDerivePackQty refuses every input that is not a real pack size', () => {
  // Its guards, exercised individually. The mutation gate found all four unpinned when this
  // function was first extracted — an extracted function inherits responsibility for its own
  // edges, and "it was inline before" does not carry any of it across.
  setInvState({ invGst: EX });
  assert.equal(invDerivePackQty('no money on this line at all', 5), null, 'unparseable line → null');
  assert.equal(invDerivePackQty(CHIPS, 0), null, 'zero price → null, never a division by zero');
  assert.equal(invDerivePackQty(CHIPS, -5), null, 'negative price → null');
  assert.equal(invDerivePackQty(CHIPS, NaN), null, 'NaN price → null');
  assert.equal(invDerivePackQty(CHIPS, null), null, 'null price → null');
  assert.equal(invDerivePackQty(CHIPS, '5'), null, 'a STRING is not a price — typeof before isFinite');
});

test('invDerivePackQty snaps to a whole pack only inside the 0.02 tolerance', () => {
  // The snap is what makes a wrong tax basis invisible, so its boundary is worth pinning both ways.
  setInvState({ invGst: EX });
  // 55 / 5.5 = 10 exactly → 10
  assert.equal(invDerivePackQty(CHIPS, 5.5), 10, 'exact → whole number');
  // 55 / 5.4945... ≈ 10.01, inside tolerance → snaps
  assert.equal(invDerivePackQty(CHIPS, 55 / 10.01), 10, 'within 0.02 → snaps to 10');
  // 55 / 9.5 ≈ 5.789, well outside → must NOT snap, and must keep the fraction
  const loose = invDerivePackQty(CHIPS, 55 / 5.79);
  assert.ok(Math.abs(loose - 5.79) < 0.001, `outside tolerance keeps its fraction, got ${loose}`);
});

test('a zero-priced invoice line derives no pack size rather than a pack of zero', () => {
  // A $0.00 line is real (a freebie, a credit, a promo). packPriceOf reads 0, so derived is 0 —
  // and `derived > 0` is what turns that into null instead of a pack size of zero being written
  // onto the product. applyInvoice's own `if(q>0)` would also reject it, but this function is
  // extracted and callable, so it owns its own answer rather than borrowing its caller's.
  setInvState({ invGst: EX });
  assert.equal(invDerivePackQty('FREEBIE ITEM $0.00 $0.00', 5), null, 'zero pack price → null, not 0');
});

/* ─────────────────────────────────────────────────────────────────────────────
   THE AI READER'S BOUNDARY. gemApplyReadings converts every AI-read price ONCE
   on entry, so all three downstream consumers — the corroboration check, the
   P-vs-G merge comparison, and the appended row — see one tax basis.
   ───────────────────────────────────────────────────────────────────────────── */
const { extractFn, loadApp } = require('./_extractfn.js');
const SRC = loadApp();

function runGem(gstMode, derivedUnitPrice) {
  // eslint-disable-next-line no-new-func
  return new Function('S', `
    "use strict";
    var gemStatus=null, GEM_BAND=0.5, invRows=[], byId={};
    var invGst={mode:${JSON.stringify(gstMode)}, note:''};
    function renderInvReview(){}
    function rankCandidates(){ return []; }
    function packCount(){ return null; }
    function cpbu(p){ return p&&p.cost_per_base_unit; }
    function normalizePhrase(s){ return String(s||'').toLowerCase().trim(); }
    function gemDiag(){}
    ${extractFn(SRC, 'invGstAdjust')}
    ${extractFn(SRC, 'gemCanon')}
    ${extractFn(SRC, 'gemHist')}
    ${extractFn(SRC, 'gemPackEq')}
    ${extractFn(SRC, 'gemMergeLine')}
    ${extractFn(SRC, 'gemMatchSuspect')}
    ${extractFn(SRC, 'gemRowLocked')}
    ${extractFn(SRC, 'gemNormKey')}
    ${extractFn(SRC, 'gemCleanFields')}
    ${extractFn(SRC, 'gemApplyReadings')}
    gemApplyReadings({status:'ok', lines:[{rawText:'CHIPS 10KG 55.00 55.00',
      description:'Chips', derivedUnitPrice:${derivedUnitPrice}, unitType:'kg', packCount:null}]});
    return invRows;
  `)({});
}

test('rule 5: a product the AI found and the parser missed is appended EX-GST', () => {
  // This row becomes a NEW product at this price, so an unconverted figure here is a permanently
  // 10%-high product created without anyone typing a number.
  const rows = runGem('inc', 5.5);
  assert.equal(rows.length, 1, 'the AI-only line must be appended');
  near(rows[0].unitPrice, 5.0, 'appended at the converted price');
});

test('rule 5 on a GST-exclusive invoice appends the price unchanged', () => {
  const rows = runGem('ex', 5.5);
  near(rows[0].unitPrice, 5.5, 'no conversion when the invoice is exclusive');
});
