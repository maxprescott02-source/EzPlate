/*
 * inv-supplier-detect.test.js — v107. Two defects in invSupplierDetect, one symptom.
 *
 * MAX'S DATA: six of his seven taught packs were keyed to a supplier called
 * "Document No:". Surfaced by the v106 backup audit, once supplier memory was
 * finally IN the export and could be read.
 *
 * ROOT CAUSE (proved against his four real Bidfood PDFs, not guessed). extractPdfText
 * groups items by y-position, top to bottom, and Bidfood's letterhead comes out as:
 *
 *     0: "Document No:"
 *     1: "I71088300.SUN"
 *     2: "TAX INVOICE"                              <- the header slice STOPPED here
 *     3: "BIDFOOD SUNSHINE COAST a division of"     <- the supplier is BELOW it
 *
 *   1. The heading is not a reliable end-of-letterhead. `header` was everything
 *      ABOVE the first "Invoice"/"Tax Invoice"/"Statement" line, which on this very
 *      common layout is just the document number — the one line naming the supplier
 *      is excluded, so the known-name pass could never see "Bidfood" even though
 *      "Bidfood" is a supplier on Max's own products.
 *   2. With the known-name pass starved, the fallback GUESSER ran and returned
 *      "Document No:". A bare field label carries no digits, no address word and no
 *      punctuation any of its skip filters look for, so it passed all of them.
 *      ("Document No: 47821" was already caught by the \d{3,} rule — it is the label
 *      ALONE, its value wrapped to the next line by PDF extraction, that leaked.)
 *
 * THE FIX: widen the window for the KNOWN-NAME pass only. It can match nothing that
 * is not already a supplier/brand on the user's own products, so a wider window can
 * only find a supplier it would have missed — never invent one. The guesser keeps the
 * narrow letterhead and gains a field-label skip, so an unidentified supplier comes
 * back BLANK. Blank is safe by design: rememberSupplierPhrase refuses to store
 * without a supplier, so no wrong key is ever written.
 *
 * WHY IT MATTERS: memKey() keys taught packs off the supplier NAME. A wrong-but-stable
 * name works by coincidence until the parser changes, then every taught pack orphans
 * silently — the same failure tidySupplierMemMigration exists to prevent for renames.
 *
 * The header fixtures below are the REAL extracted text from Max's invoices.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// the real detector, with only its debug logger stubbed
function detectWith(products) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('PRODUCTS', `
    "use strict";
    function invDbg(){}
    ${extractFn(SRC, 'invSupplierDetect')}
    return invSupplierDetect;
  `);
  return factory(products);
}

// Max's three real suppliers, plus a brand, so the known-name pass has something to find
const PRODUCTS = [
  { id: 'P1', supplier: 'Bidfood', brand: 'Tip Top' },
  { id: 'P2', supplier: 'The Fruit Wagon', brand: 'Priestleys' },
  { id: 'P3', supplier: 'Lactalis', brand: 'Pauls' }
];

// verbatim from I71088300.SUN — the first lines extractPdfText produces
const BIDFOOD_HEADER = [
  'Document No:',
  'I71088300.SUN',
  'TAX INVOICE',
  'BIDFOOD SUNSHINE COAST a division of',
  'Page 1 of 2',
  'Burleigh Marr Distributio',
  'Invoice Date 31/07/2026',
  'A.B.N. 88 009 966 465 - 403',
  '* REPRINT *',
  'Our Order No O69583382',
  '14 HOOPERS ROAD',
  'KUNDA PARK QLD 4556'
].join('\n');

test('v107: the real Bidfood invoice resolves to the known supplier, not the document label', () => {
  const detect = detectWith(PRODUCTS);
  assert.equal(detect(BIDFOOD_HEADER), 'Bidfood',
    'the trading name sits BELOW "TAX INVOICE" on this layout — the known-name window must span the heading');
});

test('v107: "Document No:" is never returned as a supplier', () => {
  const detect = detectWith(PRODUCTS);
  assert.notEqual(detect(BIDFOOD_HEADER), 'Document No:', 'this is the exact key six of Max’s taught packs were stored under');
});

test('v107: an UNKNOWN supplier behind a field label comes back blank, not the label', () => {
  const detect = detectWith(PRODUCTS);
  const txt = ['Document No:', 'X99123456.ABC', 'TAX INVOICE', 'ACME PROVEDORES PTY LTD'].join('\n');
  assert.equal(detect(txt), '',
    'blank is safe — rememberSupplierPhrase refuses to store without a supplier, so no wrong key is written');
});

test('v107: every common bare field label is skipped by the guesser', () => {
  const detect = detectWith([]);            // no known suppliers: the guesser is the only path
  ['Document No:', 'Invoice No.', 'Order Number', 'Customer No:', 'Account #', 'Delivery Docket',
   'Reference:', 'Page', 'Date', 'Our Order No', 'Route No:', 'Consignment No:'].forEach(label => {
    assert.equal(detect(label + '\nX88123456.ZZZ'), '', `"${label}" is a field label, not a business name`);
  });
});

/* ---------- the paths that already worked must not move ---------- */

test('v107: an explicit "Supplier:" label still wins over everything', () => {
  const detect = detectWith(PRODUCTS);
  assert.equal(detect('Peak Provedores Pty Ltd\nSupplier: Coastal Wholesale\nTAX INVOICE'), 'Coastal Wholesale');
});

test('v107: a plain letterhead above the heading still resolves, Pty Ltd trimmed', () => {
  const detect = detectWith([]);
  assert.equal(detect('Harbour Foods Pty Ltd\n12 Wharf Rd\nTAX INVOICE\nline items'), 'Harbour Foods');
});

test('v107: a genuinely unreadable letterhead still returns blank rather than guessing', () => {
  const detect = detectWith([]);
  assert.equal(detect('A.B.N. 88 009 966 465\nPhone: (07) 5409 1000\nTAX INVOICE'), '');
});

test('v107: the widened window matches a known supplier, never an arbitrary line', () => {
  const detect = detectWith(PRODUCTS);
  // "Lactalis" appears below the heading; nothing above it is a known name
  assert.equal(detect('Document No:\nD44100200.XYZ\nTAX INVOICE\nLACTALIS AUSTRALIA\n99 Dairy Rd'), 'Lactalis');
  // and with no known name anywhere, the widened window must NOT start guessing down the page
  assert.equal(detect('Document No:\nD44100200.XYZ\nTAX INVOICE\nUNRELATED TRADING CO\n99 Some Rd'), '',
    'the guesser keeps the narrow letterhead — widening applies ONLY to the known-name pass');
});

test('v107: the longest known supplier wins when several appear', () => {
  const detect = detectWith([{ id: 'P1', supplier: 'Bidfood' }, { id: 'P2', supplier: 'Bidfood Direct Supply' }]);
  assert.equal(detect('Document No:\nTAX INVOICE\nBIDFOOD DIRECT SUPPLY PTY LTD'), 'Bidfood Direct Supply');
});

/* ---------- the widened window must not reach into the item rows (CodeRabbit) ---------- */

test('v107: a known BRAND in an item row is never mistaken for the supplier', () => {
  const detect = detectWith(PRODUCTS);          // 'Tip Top' is a brand, not a supplier
  const compact = [
    'Document No:', 'D44100200.XYZ', 'TAX INVOICE', 'UNRELATED TRADING CO', '99 Some Rd',
    'BREAD ROLLS HOT DOG TIP TOP 54S    28.40',   // an item row, inside the widened window
    'MILK FULL CREAM PAULS 2LT          3.63'
  ].join('\n');
  assert.equal(detect(compact), '',
    'brands are circumstantial — confining them to the letterhead is what stops an item row naming the supplier');
});

test('v107: a known brand in the LETTERHEAD still resolves, as it did before v107', () => {
  const detect = detectWith(PRODUCTS);
  assert.equal(detect('Priestleys\n14 Baker St\nTAX INVOICE\nitem rows'), 'Priestleys');
});

test('v107: a supplier below the heading beats a brand in the letterhead', () => {
  const detect = detectWith(PRODUCTS);
  assert.equal(detect('Priestleys\nTAX INVOICE\nBIDFOOD SUNSHINE COAST'), 'Bidfood',
    'a supplier value answers "who invoiced this"; a brand only hints at it');
});

test('v107: a bare "Supplier:" whose value wrapped is not itself returned as the supplier', () => {
  const detect = detectWith([]);
  assert.equal(detect('Supplier:\nX88123456.ZZZ\nTAX INVOICE'), '',
    'strategy 1 needs label AND value on one line; the bare label falls through to the guesser');
  ['Vendor:', 'Sold By', 'Distributed By', 'Ship To:', 'Bill To:'].forEach(l => {
    assert.equal(detect(l + '\nX88123456.ZZZ'), '', `"${l}" is a label, not a business name`);
  });
});
