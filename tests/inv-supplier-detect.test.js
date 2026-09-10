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

/* ---------- D10 (PARSER-AUDIT-2026-09-08): the SECOND supplier's letterhead ---------- */
/*
 * v107 above fixed this for one supplier's layout. The cafe's other weekly supplier prints its
 * trading name ON THE SAME LINE as the heading, and the whole line is 45 characters — so:
 *
 *   the stop loop finds "TAX INVOICE" at index 0, `stop` is 0, and `header` falls back to the first
 *   eight lines (which is why the trading name is a candidate at all);
 *   the trading name is then rejected by the <=42 character test, because the heading is in it;
 *   the guesser walks on and accepts "Credit Terms: 7 Days" — a LABEL WITH ITS VALUE, which the
 *   v107 rule could not see because that rule matches a whole line of nothing but labels.
 *
 * Every pack the user teaches for this supplier is then keyed to "Credit Terms: 7 Days", which is
 * the exact shape of the v107 defect it was written to end. Two changes: strip the heading words
 * before MEASURING the candidate, and skip a `Label: value` line.
 *
 * The letterhead below is INVENTED, with the real one's shape and length. The repository is public.
 */
const SECOND_SUPPLIER = [
  'COASTAL POULTRY DISTRIBUTORS QLD TAX INVOICE',   // 44 chars: the trading name and the heading
  '17 Cannery Rd, Yandina QLD 4561',
  'A.B.N. 41 123 456 789',
  'Credit Terms: 7 Days',
  'Invoice No 884120',
  '13612 FZ CHIPS - S/CUT 10MM GF 6X2KG 3.00 3.00 CTN $29.50 $0.00 $88.50'
].join('\n');

test('D10: a trading name sharing its line with the heading is read, not measured with it', () => {
  const detect = detectWith([]);          // unknown supplier: the guesser is the only path
  assert.equal(detect(SECOND_SUPPLIER), 'COASTAL POULTRY DISTRIBUTORS QLD',
    'the heading is stripped before the length test — with it, the line is 44 characters and rejected');
});

test('D10: "Credit Terms: 7 Days" is never the supplier', () => {
  const detect = detectWith([]);
  assert.notEqual(detect(SECOND_SUPPLIER), 'Credit Terms: 7 Days',
    'this is the key every taught pack for this supplier was stored under');
});

test('D10: a label WITH its value is skipped even when nothing else is readable', () => {
  const detect = detectWith([]);
  ['Credit Terms: 7 Days', 'Payment Terms: Net 30', 'Our Ref: AB', 'Delivery Run: North'].forEach(l => {
    assert.equal(detect(l), '', `"${l}" is a field and its value, not a business name`);
  });
});

test('⚠️ D10: "TAX INVOICE" alone never becomes a supplier', () => {
  // The strip could only be dangerous in one direction: a line that is ONLY the heading strips to
  // empty, and empty has to fail the [A-Za-z]{3,} test rather than fall through as a name.
  const detect = detectWith([]);
  assert.equal(detect('TAX INVOICE\nA.B.N. 41 123 456 789'), '');
  assert.equal(detect('INVOICE\n17 Cannery Rd'), '');
});

test('⚠️ D10: a known supplier still outranks the guesser on the same layout', () => {
  const detect = detectWith([{ id: 'P1', supplier: 'Coastal Poultry' }]);
  assert.equal(detect(SECOND_SUPPLIER), 'Coastal Poultry',
    'the known-name pass runs first and returns the name as the user spells it');
});

test('D10: a business name that legitimately ends in a word like "Invoice" is not over-trimmed', () => {
  // The strip is anchored to the END and takes the heading wording only, so an ordinary name that
  // merely CONTAINS one of those letters is untouched.
  const detect = detectWith([]);
  assert.equal(detect('Invoicing Solutions Group\n17 Cannery Rd\nTAX INVOICE\nitems'), 'Invoicing Solutions Group');
});

test('v107: a bare "Supplier:" whose value wrapped is not itself returned as the supplier', () => {
  const detect = detectWith([]);
  assert.equal(detect('Supplier:\nX88123456.ZZZ\nTAX INVOICE'), '',
    'strategy 1 needs label AND value on one line; the bare label falls through to the guesser');
  ['Vendor:', 'Sold By', 'Distributed By', 'Ship To:', 'Bill To:'].forEach(l => {
    assert.equal(detect(l + '\nX88123456.ZZZ'), '', `"${l}" is a label, not a business name`);
  });
});
