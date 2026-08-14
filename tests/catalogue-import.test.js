/*
 * catalogue-import.test.js — 193. The catalogue CSV importer's decision layer.
 *
 * Everything here is the REAL shipped code, sliced out of js/app.js. The importer was written so
 * that the part that decides (`catImportPlan`) is pure and the part that writes (`catImportApply`)
 * is four lines of DOM — which is what makes the plan the screen shows and the plan these tests
 * drive the same object rather than two things that have to agree.
 *
 * The cases are chosen from what a real supplier export actually contains rather than from what is
 * easy to assert: quoted descriptions with commas in them, a BOM, CRLF, a "previous purchases"
 * report listing the same product once per order, blank cells everywhere, and a price whose meaning
 * (per pack or per carton) was NEVER MEASURED because the file was read in the portal and never
 * downloaded. That last one is why `priceCovers` is an input and not a constant.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

// eslint-disable-next-line no-new-func
const A = new Function(`
  "use strict";
  ${extractFn(SRC, 'csvSniffDelim')}
  ${extractFn(SRC, 'parseCsvTable')}
  ${extractFn(SRC, 'catNormHead')}
  ${extractVar(SRC, 'CAT_FIELDS')}
  ${extractVar(SRC, 'CAT_PRESETS')}
  ${extractFn(SRC, 'catPresetFor')}
  ${extractVar(SRC, 'CAT_GUESS')}
  ${extractFn(SRC, 'catGuessMap')}
  ${extractFn(SRC, 'catNum')}
  ${extractVar(SRC, 'CAT_UNITS')}
  ${extractFn(SRC, 'catUnit')}
  ${extractFn(SRC, 'catPackSize')}
  ${extractFn(SRC, 'packToUnitCost')}
  ${extractFn(SRC, 'normSupplier')}
  ${extractFn(SRC, 'catImportPlan')}
  return { parseCsvTable, csvSniffDelim, catPresetFor, catGuessMap, catNum, catUnit,
           catPackSize, catImportPlan, CAT_FIELDS, CAT_PRESETS };
`)();

/* ===========================================================================
 * 1. THE FILE READER
 * ======================================================================== */

test('a quoted field containing commas is ONE field — which the invoice CSV reader cannot do', () => {
  const t = A.parseCsvTable('code,description,price\n1001,"CHIPS, STRAIGHT CUT, 10MM",42.50\n');
  assert.deepStrictEqual(t.headers, ['code', 'description', 'price']);
  assert.strictEqual(t.rows.length, 1);
  assert.deepStrictEqual(t.rows[0], ['1001', 'CHIPS, STRAIGHT CUT, 10MM', '42.50']);
});

test('a doubled quote inside a quoted field is one literal quote', () => {
  const t = A.parseCsvTable('a,b\n1,"6"" pizza base"\n');
  assert.deepStrictEqual(t.rows[0], ['1', '6" pizza base']);
});

test('a newline INSIDE a quoted field does not end the row', () => {
  const t = A.parseCsvTable('a,b\n1,"line one\nline two"\n');
  assert.strictEqual(t.rows.length, 1, 'still one product, not two');
  assert.strictEqual(t.rows[0][1], 'line one\nline two');
});

test('CRLF, bare LF and a lone CR all end a row — with the CELLS intact, not just the count', () => {
  // Counting rows is not enough and that is not a stylistic preference: a \r handler that consumed
  // one character too many still produces two rows, of shifted rubbish. The gate proved it by
  // leaving that mutant alive against the count-only version of this test.
  const want = [['1', '2'], ['3', '4']];
  assert.deepStrictEqual(A.parseCsvTable('a,b\r\n1,2\r\n3,4\r\n').rows, want, 'CRLF');
  assert.deepStrictEqual(A.parseCsvTable('a,b\n1,2\n3,4\n').rows, want, 'LF');
  assert.deepStrictEqual(A.parseCsvTable('a,b\r1,2\r3,4\r').rows, want, 'lone CR');
});

test('a file with NO trailing newline still yields its last row', () => {
  // Plenty of exports end without one, and the whole last product would simply be absent — with a
  // count on screen that looks entirely reasonable.
  const t = A.parseCsvTable('a,b\n1,2\n3,4');
  assert.deepStrictEqual(t.rows, [['1', '2'], ['3', '4']]);
});

test("a BOM is stripped, so the first header is matchable rather than merely LOOKING right", () => {
  const t = A.parseCsvTable('﻿PRODUCT CODE,DESCRIPTION\n1,x\n');
  assert.strictEqual(t.headers[0], 'PRODUCT CODE',
    'Excel writes a BOM on every Save-as-CSV; left in place it makes the first column unmappable while printing identically');
});

test('blank lines anywhere are dropped, including a trailing newline', () => {
  const t = A.parseCsvTable('a,b\n1,2\n\n\n3,4\n\n');
  assert.strictEqual(t.rows.length, 2);
});

test('a semicolon-separated export is read, because half of Europe exports one', () => {
  const t = A.parseCsvTable('code;description;price\n1001;Chips;42,50\n');
  assert.deepStrictEqual(t.headers, ['code', 'description', 'price']);
  assert.deepStrictEqual(t.rows[0], ['1001', 'Chips', '42,50']);
});

test('the delimiter sniff ignores separators that only appear INSIDE quotes', () => {
  assert.strictEqual(A.csvSniffDelim('code,"a;b;c;d;e",price'), ',',
    'five semicolons inside one quoted header must not beat two real commas');
});

test('a TIE goes to the comma — it is the C in CSV, and the tie-break is a real choice', () => {
  // "a,b;c" has one of each. Preferring whichever came last in the candidate list would read a
  // comma-separated file as semicolon-separated and hand back one column containing everything.
  assert.strictEqual(A.csvSniffDelim('a,b;c'), ',');
  assert.strictEqual(A.csvSniffDelim('a\tb,c'), ',');
  assert.strictEqual(A.csvSniffDelim('no separators at all'), ',', 'and a header with none still parses as CSV');
});

test('an empty or whitespace-only file returns nothing rather than a header row of one blank', () => {
  assert.deepStrictEqual(A.parseCsvTable('').headers, []);
  assert.deepStrictEqual(A.parseCsvTable('   \n\n').headers, []);
  assert.deepStrictEqual(A.parseCsvTable(null).rows, []);
});

/* ===========================================================================
 * 2. NUMBERS AND UNITS — where isFinite('') lives
 * ======================================================================== */

test("a blank, dashed or non-numeric cell is NULL and never 0 — isFinite('') is TRUE", () => {
  for (const v of ['', '   ', null, undefined, '-', '.', 'N/A', 'POA', '$']) {
    assert.strictEqual(A.catNum(v), null, `${JSON.stringify(v)} must not become a number`);
  }
});

test('a cell parseFloat cannot read returns NULL, never NaN', () => {
  // '--5' and '.-' survive the strip above as non-empty strings, so they are the inputs that reach
  // parseFloat and beat it. NaN out of here is worse than a wrong number: every caller tests
  // `== null`, which NaN passes, so it travels as if it were a price.
  for (const v of ['--5', '.-', '-.-']) {
    assert.strictEqual(A.catNum(v), null, `${JSON.stringify(v)} must be null and not NaN`);
  }
});

test('money formatting is read through: $, commas and spaces', () => {
  assert.strictEqual(A.catNum('$1,234.56'), 1234.56);
  assert.strictEqual(A.catNum(' 42.50 '), 42.5);
  assert.strictEqual(A.catNum('0'), 0, 'zero is a real price, not an absence');
  assert.strictEqual(A.catNum('-3.10'), -3.1, 'read it; the plan is what refuses it');
});

test('the pack-size cell yields a quantity and, when it carries one, a unit', () => {
  assert.deepStrictEqual(A.catPackSize('2.5KG'), { qty: 2.5, unit: 'kg' });
  assert.deepStrictEqual(A.catPackSize('500 g'), { qty: 500, unit: 'g' });
  assert.deepStrictEqual(A.catPackSize('1L'), { qty: 1, unit: 'l' });
  assert.deepStrictEqual(A.catPackSize('20'), { qty: 20, unit: null }, 'no unit in the cell — the UOM column answers');
  assert.strictEqual(A.catPackSize(''), null);
  assert.strictEqual(A.catPackSize('each'), null, 'no leading number is not a pack size');
});

test('"6X2.5KG" is FIFTEEN kilos, not six and not two and a half', () => {
  assert.deepStrictEqual(A.catPackSize('6X2.5KG'), { qty: 15, unit: 'kg' });
  assert.deepStrictEqual(A.catPackSize('12 x 375ml'), { qty: 4500, unit: 'ml' });
  // Getting this backwards is a 6x error in every cost the café sees, silently.
});

test('a zero anywhere in the pack size is NOT a pack size', () => {
  // Each of these is one comparison away from returning a qty of 0, which packToUnitCost refuses —
  // so the row would be SKIPPED rather than falling back to "one unit" as it should.
  assert.strictEqual(A.catPackSize('0'), null, 'a bare zero');
  assert.strictEqual(A.catPackSize('0X2.5KG'), null, 'a zero multiplier');
  assert.deepStrictEqual(A.catPackSize('6X0KG'), { qty: 6, unit: null },
    'a zero SECOND number is not a multiplier pack at all — it falls back to the leading number');
});

test('unit words are normalised to the four the app actually stores', () => {
  assert.strictEqual(A.catUnit('KG'), 'kg');
  assert.strictEqual(A.catUnit('Kilograms'), 'kg');
  assert.strictEqual(A.catUnit('LTR'), 'l');
  assert.strictEqual(A.catUnit('EACH'), 'ea');
  assert.strictEqual(A.catUnit('PCS'), 'ea');
  assert.strictEqual(A.catUnit('CTN'), null, 'a carton is not a unit of measure — it is a count of them');
  assert.strictEqual(A.catUnit(''), null);
});

/* ===========================================================================
 * 3. PRESET AND GUESS
 * ======================================================================== */

const SUPPLIER_HEADERS = ['PRODUCT CODE', 'BRAND', 'DESCRIPTION', 'PACK SIZE', 'CTN QTY', 'UOM',
  'QTY', 'LAST PRICE PAID', 'TOTAL EX GST', 'GST', 'TOTAL INCL GST', 'ACCOUNT'];

test('the supplier export is recognised, and maps onto the app\'s own fields', () => {
  const p = A.catPresetFor(SUPPLIER_HEADERS);
  assert.ok(p, 'the signature must match the columns read from the live portal, 14 Aug 2026');
  assert.strictEqual(p.map.name, 'DESCRIPTION');
  assert.strictEqual(p.map.code, 'PRODUCT CODE');
  assert.strictEqual(p.map.price, 'LAST PRICE PAID');
  assert.strictEqual(p.map.packSize, 'PACK SIZE');
  assert.strictEqual(p.map.packUnit, 'UOM');
  assert.strictEqual(p.map.unitsPerPack, 'CTN QTY');
  assert.strictEqual(p.map.category, '', 'the Standard export has no category column, and the preset says so rather than inventing one');
});

test('the preset survives the supplier adding a column, and survives re-casing', () => {
  assert.ok(A.catPresetFor(SUPPLIER_HEADERS.concat(['NEW COLUMN'])), 'an extra column must not un-recognise the file');
  assert.ok(A.catPresetFor(SUPPLIER_HEADERS.map((h) => h.toLowerCase())), 'case must not matter');
  assert.ok(A.catPresetFor(['Product Code', 'Description', 'Pack Size', 'Last Price Paid']), 'punctuation and spacing are normalised');
});

test('an unrelated file matches NO preset — a false positive would map the wrong columns silently', () => {
  assert.strictEqual(A.catPresetFor(['name', 'price']), null);
  assert.strictEqual(A.catPresetFor(['PRODUCT CODE', 'DESCRIPTION']), null, 'half a signature is not a signature');
  assert.strictEqual(A.catPresetFor([]), null);
});

test('an unrecognised file is GUESSED from its header words, and each column is used once', () => {
  const m = A.catGuessMap(['SKU', 'Item Name', 'Category', 'Unit Price', 'Brand']);
  assert.strictEqual(m.code, 'SKU');
  assert.strictEqual(m.name, 'Item Name');
  assert.strictEqual(m.category, 'Category');
  assert.strictEqual(m.price, 'Unit Price');
  assert.strictEqual(m.brand, 'Brand');
  assert.strictEqual(m.packSize, '', 'nothing to guess from means blank, never a wrong column');
});

test('the guess never assigns one column to two fields', () => {
  const m = A.catGuessMap(['price', 'cost']);
  const used = Object.keys(m).map((k) => m[k]).filter(Boolean);
  assert.strictEqual(new Set(used).size, used.length, 'a column claimed twice would import one number as two different things');
});

/* ===========================================================================
 * 4. THE PLAN
 * ======================================================================== */

const MAP = { name: 'DESCRIPTION', code: 'PRODUCT CODE', brand: 'BRAND', category: '',
  packSize: 'PACK SIZE', packUnit: 'UOM', unitsPerPack: 'CTN QTY', price: 'LAST PRICE PAID' };

function plan(csv, over) {
  const t = A.parseCsvTable(csv);
  return A.catImportPlan(Object.assign({
    headers: t.headers, rows: t.rows, map: MAP, supplier: 'Test Supplier',
    priceCovers: 'pack', existing: [],
  }, over || {}));
}

const HEAD = 'PRODUCT CODE,BRAND,DESCRIPTION,PACK SIZE,CTN QTY,UOM,LAST PRICE PAID\n';

test('a plain row becomes a costed product, with the unit cost the app would store', () => {
  const p = plan(HEAD + '1001,Edgell,"CHIPS, STRAIGHT CUT",10KG,1,KG,65.00\n');
  assert.strictEqual(p.items.length, 1);
  assert.strictEqual(p.created, 1);
  assert.strictEqual(p.updated, 0);
  const i = p.items[0];
  assert.strictEqual(i.name, 'CHIPS, STRAIGHT CUT');
  assert.strictEqual(i.code, '1001');
  assert.strictEqual(i.patch.base_unit, 'g');
  assert.ok(Math.abs(i.patch.cost_per_base_unit - 0.0065) < 1e-9, '$65 for 10kg is $0.0065/g');
  assert.ok(Math.abs(i.dispPer - 6.5) < 1e-9, 'shown as $6.50/kg — THE tomatoes case, restated on this path');
  assert.strictEqual(i.dispUnit, 'kg');
  assert.strictEqual(i.patch.supplier_code, '1001', 'the identity that makes a re-import an update');
  assert.strictEqual(i.patch.current_price_exgst, 65);
});

test('"the price is for the carton" multiplies by units per carton — and the two answers differ', () => {
  const csv = HEAD + '1001,Edgell,Chips,2.5KG,6,KG,65.00\n';
  const perPack = plan(csv, { priceCovers: 'pack' }).items[0];
  const perCarton = plan(csv, { priceCovers: 'carton' }).items[0];
  assert.ok(Math.abs(perPack.dispPer - 26) < 1e-9, '$65 for one 2.5kg bag is $26.00/kg');
  assert.ok(Math.abs(perCarton.dispPer - (65 / 15)) < 1e-9, '$65 for six of them is $4.33/kg');
  assert.notStrictEqual(perPack.patch.cost_per_base_unit, perCarton.patch.cost_per_base_unit,
    'the whole reason this is ASKED rather than guessed: the file was never downloaded, and the two answers are 6x apart');
});

test('the UOM column supplies the unit when the pack-size cell carries none', () => {
  const p = plan(HEAD + '1001,,Milk,2,1,L,3.20\n');
  assert.strictEqual(p.items[0].patch.base_unit, 'ml');
  assert.ok(Math.abs(p.items[0].dispPer - 1.6) < 1e-9, '$3.20 for 2L is $1.60/L');
});

test('no pack size at all falls back to one unit, not to a crash and not to zero', () => {
  const p = plan(HEAD + '1001,,Whole cake,,,,,\n'.replace(',,,,,\n', ',,,,24.00\n'));
  assert.strictEqual(p.items.length, 1);
  assert.strictEqual(p.items[0].patch.base_unit, 'ea');
  assert.strictEqual(p.items[0].patch.cost_per_base_unit, 24);
});

/* --- the fields a NEW product is born with. Nothing on screen shows most of these, which is
       exactly why they need pinning: every one of them is silent when wrong. --- */

test('a new product is born food, branded, supplier-stamped and code-stamped', () => {
  const p = plan(HEAD + '1001,Edgell,Chips,10KG,1,KG,65.00\n');
  const patch = p.items[0].patch;
  assert.strictEqual(patch.is_food, true,
    'a non-food product is excluded from the food-cost maths — an imported catalogue landing as non-food would empty every plate cost');
  assert.strictEqual(patch.brand, 'Edgell', 'the brand cell was read, not blanked');
  assert.strictEqual(patch.supplier, 'Test Supplier', 'without this the product belongs to nobody and can never be re-matched');
  assert.strictEqual(patch.supplier_code, '1001');
  assert.strictEqual(patch.pack_qty, 10);
  assert.strictEqual(patch.pack_unit, 'kg');
});

test('a new product with NO brand cell gets null, not an empty string', () => {
  const p = plan(HEAD + '1001,,Chips,10KG,1,KG,65.00\n');
  assert.strictEqual(p.items[0].patch.brand, null);
  assert.strictEqual(p.items[0].patch.category, null);
});

test('a field mapped to a BLANK header name stays unmapped', () => {
  // A trailing comma in the header row gives a real column whose name is ''. An unmapped field is
  // also '', and matching one against the other reads that stray column as, say, the category.
  const t = A.parseCsvTable('PRODUCT CODE,DESCRIPTION,LAST PRICE PAID,\n1001,Chips,65.00,STRAY\n');
  const p = A.catImportPlan({ headers: t.headers, rows: t.rows, supplier: 'Test Supplier',
    priceCovers: 'pack', existing: [],
    map: { name: 'DESCRIPTION', code: 'PRODUCT CODE', price: 'LAST PRICE PAID',
           brand: '', category: '', packSize: '', packUnit: '', unitsPerPack: '' } });
  assert.strictEqual(p.items.length, 1);
  assert.strictEqual(p.items[0].patch.category, null, 'the stray column must not arrive as a category');
  assert.strictEqual(p.items[0].patch.brand, null);
});

test('a row SHORTER than the header does not import the word "undefined"', () => {
  // Exports do this: a trailing empty column is simply omitted on some rows.
  const t = A.parseCsvTable('PRODUCT CODE,DESCRIPTION,LAST PRICE PAID,BRAND\n1001,Chips,65.00\n');
  const p = A.catImportPlan({ headers: t.headers, rows: t.rows, supplier: 'Test Supplier',
    priceCovers: 'pack', existing: [],
    map: { name: 'DESCRIPTION', code: 'PRODUCT CODE', price: 'LAST PRICE PAID', brand: 'BRAND',
           category: '', packSize: '', packUnit: '', unitsPerPack: '' } });
  assert.strictEqual(p.items.length, 1);
  assert.strictEqual(p.items[0].patch.brand, null, 'a missing cell is absent, never the string "undefined"');
});

test('carton mode with a BLANK units-per-carton REFUSES the row rather than guessing ×1', () => {
  /* ⚠️ THIS TEST ASSERTED THE OPPOSITE UNTIL THE PRE-PUSH REVIEW READ IT, and the inversion is the
     point of keeping the note. It required the row to import "at the pack size, exactly as per-pack
     would" — i.e. it pinned a SILENT ×1 as intended behaviour. But the user has just said the price
     covers a carton; a row that does not say how big the carton is has an UNKNOWN multiplier, and
     costing it as though the carton held one pack is wrong by exactly the carton size, on a screen
     showing an entirely plausible number. That is this repo's most expensive failure shape, and a
     test had been written to protect it.
     Refusing is visible and self-correcting: the preview lists the skipped line with this reason,
     and the user either maps the units-per-carton column or switches the radio back. */
  const p = plan(HEAD + '1001,,Chips,2.5KG,,KG,65.00\n', { priceCovers: 'carton' });
  assert.strictEqual(p.items.length, 0, 'no guessed cost may reach the catalogue');
  assert.match(p.skipped[0].reason, /^the price is for a carton/, 'and the reason names what is missing');
});

test('carton mode with a REAL units-per-carton still multiplies', () => {
  const p = plan(HEAD + '1001,,Chips,2.5KG,6,KG,65.00\n', { priceCovers: 'carton' });
  assert.strictEqual(p.items.length, 1);
  assert.ok(Math.abs(p.items[0].dispPer - (65 / 15)) < 1e-9);
});

test('per-pack mode ignores units-per-carton entirely, blank or not', () => {
  const blank = plan(HEAD + '1001,,Chips,2.5KG,,KG,65.00\n', { priceCovers: 'pack' });
  const six = plan(HEAD + '1001,,Chips,2.5KG,6,KG,65.00\n', { priceCovers: 'pack' });
  assert.ok(Math.abs(blank.items[0].dispPer - 26) < 1e-9);
  assert.ok(Math.abs(six.items[0].dispPer - 26) < 1e-9, 'the column is only consulted in carton mode');
});

/* --- a row with a PRICE and NO PACK, which is what a generic three-column price list is --- */

test('updating a product from a row with no pack size uses the PRODUCT\'s own pack, not "1 each"', () => {
  /* The reviewer's case, and it is silent data corruption rather than a bad default: EXISTING[0] is
     10 kg at $6.50/kg, and pricing $65 as "1 each" would rewrite base_unit to 'ea' and the cost to
     $65 — a 10x error, reported as a successful update. */
  const noPack = Object.assign({}, MAP, { packSize: '', packUnit: '', unitsPerPack: '' });
  const p = plan(HEAD + '1001,,Chips Straight Cut,,,,65.00\n', { existing: EXISTING, map: noPack });
  assert.strictEqual(p.updated, 1);
  const patch = p.items[0].patch;
  assert.strictEqual(patch.base_unit, 'g', 'it stays a weight product');
  assert.ok(Math.abs(patch.cost_per_base_unit - 0.0065) < 1e-9, '$65 against the stored 10 kg is $6.50/kg');
  assert.strictEqual(patch.pack_qty, 10, 'and the pack it borrowed is written back unchanged');
});

test('updating a product that has NO pack either is REFUSED, not guessed', () => {
  // IMPbbb is priced per gram and has no stored pack, so nothing in the app knows what $20 covers.
  // "1 each" would rewrite a weight product into a unit product and be reported as a success.
  const noPack = Object.assign({}, MAP, { packSize: '', packUnit: '', unitsPerPack: '' });
  const p = plan(HEAD + '1002,,Peas Frozen,,,,20.00\n', { existing: EXISTING, map: noPack });
  assert.strictEqual(p.items.length, 0);
  /* ⚠️ /pack/ ALONE IS NOT ENOUGH HERE and the mutation gate proved it: the other refusal on this
     path reads "couldn't work out a unit cost from the PACK SIZE and price", so a loose match is
     green whichever branch fired. Anchor it to the message this case actually produces. */
  assert.match(p.skipped[0].reason, /^no pack size/, 'and it says which piece is missing');
});

test('a UOM with no pack size means the price is PER that unit', () => {
  // PACK SIZE blank, UOM "KG" — the file is saying $65 per kilo, and that is a pack of 1 kg.
  // Without this branch the row falls through to the borrow-or-refuse path and is refused or,
  // worse, silently priced against the product's stored pack instead of against the file.
  const p = plan(HEAD + '1001,,Chips Straight Cut,,,KG,65.00\n', { existing: EXISTING });
  assert.strictEqual(p.items.length, 1);
  assert.strictEqual(p.items[0].patch.base_unit, 'g');
  assert.ok(Math.abs(p.items[0].dispPer - 65) < 1e-9, '$65.00/kg, not $6.50/kg from the stored 10 kg pack');
});

test('a stored pack that is HALF a pack cannot be borrowed — both halves are required', () => {
  /* The borrow needs a quantity AND a unit; either alone prices the row against nonsense. A stored
     pack_qty of 0 would multiply out to a zero-size pack, and a pack_qty with no pack_unit falls
     through packToUnitCost's weight/volume tests into the COUNT branch, quietly turning a per-kilo
     product into a per-unit one. Both are refusals. */
  const noPack = Object.assign({}, MAP, { packSize: '', packUnit: '', unitsPerPack: '' });
  const zeroQty = [{ id: 'IMPzz', description: 'Zero pack', supplier: 'Test Supplier', supplier_code: '1001',
    cost_per_base_unit: 0.0065, base_unit: 'g', pack_qty: 0, pack_unit: 'kg' }];
  const noUnit = [{ id: 'IMPnu', description: 'Unitless pack', supplier: 'Test Supplier', supplier_code: '1001',
    cost_per_base_unit: 0.0065, base_unit: 'g', pack_qty: 10 }];

  const a = plan(HEAD + '1001,,Zero pack,,,,65.00\n', { existing: zeroQty, map: noPack });
  assert.strictEqual(a.items.length, 0, 'a zero-size stored pack is not a pack');
  assert.match(a.skipped[0].reason, /^no pack size/, 'refused for the RIGHT reason — see the note above');

  const b = plan(HEAD + '1001,,Unitless pack,,,,65.00\n', { existing: noUnit, map: noPack });
  assert.strictEqual(b.items.length, 0, 'a quantity with no unit is not a pack either');
  assert.match(b.skipped[0].reason, /^no pack size/);
});

test('CREATING a product from a row with no pack size is still one unit — there is nothing to borrow', () => {
  const noPack = Object.assign({}, MAP, { packSize: '', packUnit: '', unitsPerPack: '' });
  const p = plan(HEAD + '1009,,Brand New Thing,,,,24.00\n', { existing: EXISTING, map: noPack });
  assert.strictEqual(p.created, 1);
  assert.strictEqual(p.items[0].patch.base_unit, 'ea');
  assert.strictEqual(p.items[0].patch.cost_per_base_unit, 24);
});

test('a row that DOES carry a pack size overrides the stored one — the file is newer', () => {
  const p = plan(HEAD + '1001,,Chips Straight Cut,5KG,1,KG,40.00\n', { existing: EXISTING });
  assert.strictEqual(p.items[0].patch.pack_qty, 5, 'the supplier repacked it and said so');
  assert.ok(Math.abs(p.items[0].patch.cost_per_base_unit - 0.008) < 1e-9);
});

/* --- the refusals. Each is a row that must NOT become a product. --- */

test('a row with no name is skipped by name rather than imported blank', () => {
  const p = plan(HEAD + '1001,Edgell,,10KG,1,KG,65.00\n');
  assert.strictEqual(p.items.length, 0);
  assert.deepStrictEqual(p.skipped.map((s) => s.reason), ['no product name']);
  assert.strictEqual(p.skipped[0].line, 2, 'the line number is what a spreadsheet shows, header included');
});

test("a blank price is skipped — it must never become a $0.00 product and a $0.00 observation", () => {
  const p = plan(HEAD + '1001,Edgell,Chips,10KG,1,KG,\n1002,Edgell,Peas,5KG,1,KG,POA\n');
  assert.strictEqual(p.items.length, 0);
  assert.deepStrictEqual(p.skipped.map((s) => s.reason), ['no usable price', 'no usable price']);
});

test('a negative price is refused rather than stored', () => {
  const p = plan(HEAD + '1001,Edgell,Credit note,10KG,1,KG,-65.00\n');
  assert.strictEqual(p.items.length, 0);
  assert.strictEqual(p.skipped[0].reason, 'the price is negative');
});

test('a zero price IS imported — 0 is a legitimate cost in this catalogue', () => {
  const p = plan(HEAD + '1001,,Comped item,1,1,EA,0\n');
  assert.strictEqual(p.items.length, 1);
  assert.strictEqual(p.items[0].patch.cost_per_base_unit, 0);
});

test('a row with no product code is skipped when a code column IS mapped', () => {
  const p = plan(HEAD + ',Edgell,Chips,10KG,1,KG,65.00\n');
  assert.strictEqual(p.items.length, 0);
  assert.strictEqual(p.skipped[0].reason, 'no product code');
});

/* --- re-import: the requirement the whole `supplier_code` column exists for --- */

/* ⚠️ THE TWO ROWS DIFFER IN WHETHER THEY CARRY A PACK, and that is the fixture doing work rather
   than decoration. A product created by the invoice importer has a base_unit and often NO
   pack_qty/pack_unit at all, while one created by this importer always has both — and the
   no-pack-in-the-file branch answers them differently. A fixture where both rows agreed could not
   tell the two apart, which is CLAUDE.md's 184(b) lesson: a fixture whose fields agree cannot tell
   you which one the code read. */
const EXISTING = [
  { id: 'IMPaaa', description: 'Chips Straight Cut', supplier: 'Test Supplier', supplier_code: '1001',
    cost_per_base_unit: 0.0065, base_unit: 'g', pack_qty: 10, pack_unit: 'kg' },
  { id: 'IMPbbb', description: 'Peas Frozen', supplier: 'Test Supplier', supplier_code: '1002',
    cost_per_base_unit: 0.004, base_unit: 'g' },          // no pack — the invoice-created shape
];

test('re-importing UPDATES on product code — it does not create a second copy', () => {
  const p = plan(HEAD + '1001,Edgell,Chips Straight Cut,10KG,1,KG,72.00\n', { existing: EXISTING });
  assert.strictEqual(p.created, 0, 'nothing new');
  assert.strictEqual(p.updated, 1);
  assert.strictEqual(p.items[0].existingId, 'IMPaaa', 'and it is THAT product, resolved by code');
  assert.ok(Math.abs(p.items[0].patch.cost_per_base_unit - 0.0072) < 1e-9, 'carrying the new price');
});

test('an UPDATE never rewrites the product\'s name — once it exists, the name is the café\'s', () => {
  const p = plan(HEAD + '1001,Edgell,SUPPLIER RENAMED THIS LINE,10KG,1,KG,72.00\n', { existing: EXISTING });
  assert.strictEqual(p.updated, 1);
  assert.ok(!('description' in p.items[0].patch),
    'a supplier renaming its own line item must not silently rename a product somebody cooks from');
});

test('a NEW product does carry its name', () => {
  const p = plan(HEAD + '1009,Edgell,Corn Kernels,5KG,1,KG,30.00\n', { existing: EXISTING });
  assert.strictEqual(p.created, 1);
  assert.strictEqual(p.items[0].patch.description, 'Corn Kernels');
});

test('an unmapped column never BLANKS a value the user set by hand', () => {
  const p = plan(HEAD + '1001,,Chips Straight Cut,10KG,1,KG,72.00\n', { existing: EXISTING });
  assert.ok(!('brand' in p.items[0].patch), 'the brand cell was empty, so the patch does not mention brand');
  assert.ok(!('category' in p.items[0].patch), 'and no category column is mapped at all');
});

test('the same code under a DIFFERENT supplier is a different product', () => {
  const p = plan(HEAD + '1001,Edgell,Chips Straight Cut,10KG,1,KG,72.00\n',
    { existing: EXISTING, supplier: 'Someone Else' });
  assert.strictEqual(p.created, 1, 'a product code is only unique WITHIN a supplier');
  assert.strictEqual(p.updated, 0);
});

test('with no code column mapped, products are matched by NAME and the plan says so', () => {
  const noCode = Object.assign({}, MAP, { code: '' });
  const p = plan(HEAD + '1001,Edgell,Chips Straight Cut,10KG,1,KG,72.00\n',
    { existing: EXISTING, map: noCode });
  assert.strictEqual(p.matchedOn, 'name', 'so the screen can warn that a re-import is less safe');
  assert.strictEqual(p.updated, 1, 'and it still updates rather than guaranteeing a duplicate');
  assert.strictEqual(p.items[0].existingId, 'IMPaaa');
});

test('name matching ignores case and runs of whitespace, because a re-export will differ in both', () => {
  const noCode = Object.assign({}, MAP, { code: '' });
  const p = plan(HEAD + '1001,,"  chips   STRAIGHT cut ",10KG,1,KG,72.00\n',
    { existing: EXISTING, map: noCode });
  assert.strictEqual(p.updated, 1);
});

/* --- a "previous purchases" report lists the same product once per ORDER --- */

test('a repeated product folds to ONE item at the LAST price, and the fold is counted not hidden', () => {
  const p = plan(HEAD
    + '1001,Edgell,Chips,10KG,1,KG,65.00\n'
    + '1001,Edgell,Chips,10KG,1,KG,68.00\n'
    + '1001,Edgell,Chips,10KG,1,KG,72.00\n');
  assert.strictEqual(p.items.length, 1, 'one product, not three');
  assert.strictEqual(p.folded, 2, 'and the user is told two lines were folded');
  assert.ok(Math.abs(p.items[0].patch.cost_per_base_unit - 0.0072) < 1e-9,
    'the LAST price wins — these reports run oldest to newest, so the last one is the current one');
  assert.strictEqual(p.created, 1, 'the counts describe products, never lines');
});

test('a repeat is not an ERROR — refusing it would refuse the commonest real file', () => {
  const p = plan(HEAD + '1001,,Chips,10KG,1,KG,65.00\n1001,,Chips,10KG,1,KG,72.00\n');
  assert.deepStrictEqual(p.skipped, [], 'a purchase-history export is a list of ORDERS, not of products');
});

/* --- the plan is pure --- */

test('the plan is pure: same inputs, deep-equal output, no ids and no clock', () => {
  const csv = HEAD + '1001,Edgell,Chips,10KG,1,KG,65.00\n1002,,Peas,5KG,1,KG,20.00\n';
  const a = plan(csv);
  const b = plan(csv);
  assert.deepStrictEqual(a, b, 'nothing random and nothing time-dependent may leak into it');
  assert.ok(a.items.every((i) => !('id' in i.patch)),
    'ids are minted in catImportApply, so the plan a test drives is the plan the screen showed');
});

test('an empty file plans nothing rather than throwing', () => {
  const p = A.catImportPlan({});
  assert.deepStrictEqual(p.items, []);
  assert.strictEqual(p.created, 0);
  assert.strictEqual(p.updated, 0);
});

test('a mapping pointing at a column that is not in the file is treated as unmapped', () => {
  const p = plan(HEAD + '1001,Edgell,Chips,10KG,1,KG,65.00\n',
    { map: Object.assign({}, MAP, { category: 'A COLUMN THAT IS NOT THERE' }) });
  assert.strictEqual(p.items.length, 1, 'it must not read column -1 and import "undefined" as a category');
  assert.strictEqual(p.items[0].patch.category, null);
});
