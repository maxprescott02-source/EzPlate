/*
 * pack-survives.test.js — v38. One bug: a taught pack must survive to the next invoice.
 *
 * MAX'S REPRO: cheese slices ("CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg"). The invoice
 * never says how many slices, so the parser derives $14.19/kg from the 1.5kg it CAN see.
 * Max used the unit-mismatch pack-teach flow to teach 105 units -> $0.200/slice. Next
 * invoice, same line: back to $14.19/kg, pack chip reading "1.50 kg", mismatch flag. The
 * teach had vanished.
 *
 * ROOT CAUSE (proved headlessly, not guessed): the product-pack write sat INSIDE the
 * supplier-memory block in applyInvoice, gated on `normSupplier(invSupplier)`:
 *
 *     if(normSupplier(invSupplier) && (r.needManual || r.remembered || r.packTaught)){
 *        ... setProduct(r.bestId, {pack_qty:q, pack_unit:u}) ...
 *     }
 *
 * invSupplierDetect returns '' by design when it can't read the letterhead ("no guess").
 * So on any invoice with an unrecognised supplier the whole block was skipped and the
 * teach was silently dropped — while the PRICE write, which sits above and is ungated,
 * still saved. That is exactly the reported symptom: old price survives as $0.200/unit,
 * pack gone. A pack belongs to the PRODUCT: 105 slices in a bag is 105 slices whoever
 * invoiced it. Supplier memory legitimately needs a supplier (it is keyed supplier+phrase);
 * the product pack never did.
 *
 * NOT the cause: resolveMatchedPrice already consults the product pack and lets it win.
 * That half was always correct — which is why this is a persistence bug, not a pricing one.
 *
 * All code under test is sliced/extracted from the REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// Slice a balanced `if(...){...}` block starting at a given source anchor.
function sliceBlock(src, anchor) {
  const i = src.indexOf(anchor);
  if (i < 0) throw new Error(`pack-survives: anchor not found -> "${anchor}". applyInvoice changed; update tests/pack-survives.test.js`);
  const start = src.indexOf('{', i + anchor.length - 1);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error('pack-survives: unbalanced braces in the teach block');
}

const TEACH_ANCHOR = 'if(r.needManual || r.remembered || r.packTaught){';

/* ---------------------------------------------------------------------------
 * 1. TEACH PERSISTS — the write path, with the supplier present and absent.
 * ------------------------------------------------------------------------- */

function runTeachBlock({ supplier, typedQty, typedUnit, product, row }) {
  const patches = [];      // every setProduct(id, patch)
  const memWrites = [];    // every rememberSupplierPhrase

  // a fake <tr> exposing only what the block reaches for
  const fakeTr = {
    querySelector(sel) {
      if (sel === '.pack-teach') {
        return { querySelector(s) {
          if (s === '.invPackQty') return { value: typedQty };
          if (s === '.invPackUnit') return { value: typedUnit };
          return null;
        } };
      }
      if (sel === '.invPrice') return { value: '' };
      return null;
    }
  };

  // eslint-disable-next-line no-new-func
  const factory = new Function('PATCHES', 'MEMW', 'PRODUCT', 'ROW', 'TR', 'SUPPLIER', `
    "use strict";
    var byId = {}; byId[PRODUCT.id] = PRODUCT;
    var invSupplier = SUPPLIER;
    var supplierMem = {};
    var learned = [];
    var r = ROW, tr = TR;
    function setProduct(id, patch){ PATCHES.push({id:id, patch:patch}); Object.assign(byId[id], patch); }
    function rememberSupplierPhrase(s, p, q, u, id){ MEMW.push({supplier:s, qty:q, unit:u}); }
    function syncMemoryToProduct(){}
    ${extractFn(SRC, 'normSupplier')}
    ${extractFn(SRC, 'normalizePhrase')}
    ${extractFn(SRC, 'memKey')}
    ${extractFn(SRC, 'moneyMatches')}
    ${extractFn(SRC, 'firstPairPrice')}
    ${extractFn(SRC, 'packPriceOf')}
    ${sliceBlock(SRC, TEACH_ANCHOR)}
    return { learned: learned };
  `);
  const res = factory(patches, memWrites, product, row, fakeTr, supplier);
  return { patches, memWrites, learned: res.learned };
}

// the cheese, mid-teach: product already flipped to per-unit by the price write
const cheese = () => ({ id: 'P0079', description: "Cheese Slices Tasty 105'S", brand: 'Yarde Farm',
                        base_unit: 'ea', cost_per_base_unit: 0.200 });
const taughtRow = () => ({ name: "CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg",
                           raw: "PKT 218662 #CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg 2 21.29 42.58",
                           bestId: 'P0079', unit: 'ea', unitPrice: 0.2028,
                           packTaught: true, taughtQty: 105, taughtUnit: 'ea',
                           needManual: false, remembered: false });

test('v38 THE BUG: the taught pack reaches the product even when the supplier is unknown', () => {
  const { patches } = runTeachBlock({ supplier: '', typedQty: '105', typedUnit: 'ea',
                                      product: cheese(), row: taughtRow() });
  const packPatch = patches.filter(p => p.patch.pack_qty !== undefined)[0];
  assert.ok(packPatch, 'no pack was written at all — this is the v37 bug: an unreadable letterhead threw the teach away');
  assert.equal(packPatch.id, 'P0079');
  assert.equal(packPatch.patch.pack_qty, 105);
  assert.equal(packPatch.patch.pack_unit, 'ea');
});

test('v38: the taught pack still reaches the product when the supplier IS known', () => {
  const { patches } = runTeachBlock({ supplier: 'Yarde Farm', typedQty: '105', typedUnit: 'ea',
                                      product: cheese(), row: taughtRow() });
  const packPatch = patches.filter(p => p.patch.pack_qty !== undefined)[0];
  assert.ok(packPatch, 'the path that always worked must keep working');
  assert.equal(packPatch.patch.pack_qty, 105);
  assert.equal(packPatch.patch.pack_unit, 'ea');
});

test('v38: supplier memory keeps its supplier gate — it is keyed supplier+phrase and cannot be stored without one', () => {
  const known = runTeachBlock({ supplier: 'Yarde Farm', typedQty: '105', typedUnit: 'ea',
                               product: cheese(), row: taughtRow() });
  assert.equal(known.memWrites.length, 1, 'a known supplier still learns the phrase');
  assert.equal(known.memWrites[0].qty, 105);

  const unknown = runTeachBlock({ supplier: '', typedQty: '105', typedUnit: 'ea',
                                 product: cheese(), row: taughtRow() });
  assert.equal(unknown.memWrites.length, 0, 'an unknown supplier writes no memory — there is no key to write it under');
  assert.deepEqual(unknown.learned, [], 'and claims nothing was learned for a supplier');
});

test('v38: the product pack is not re-written when it already matches (no pointless writes)', () => {
  const already = Object.assign(cheese(), { pack_qty: 105, pack_unit: 'ea' });
  const { patches } = runTeachBlock({ supplier: '', typedQty: '105', typedUnit: 'ea',
                                      product: already, row: taughtRow() });
  assert.equal(patches.filter(p => p.patch.pack_qty !== undefined).length, 0, 're-confirming an unchanged pack is a no-op');
});

test('v38: a row with no taught pack and no typed qty writes nothing', () => {
  const row = Object.assign(taughtRow(), { packTaught: false, needManual: false, remembered: false });
  const { patches, memWrites } = runTeachBlock({ supplier: 'Yarde Farm', typedQty: '', typedUnit: '',
                                                product: cheese(), row: row });
  assert.deepEqual(patches, [], 'nothing taught, nothing written');
  assert.deepEqual(memWrites, []);
});

/* ---------------------------------------------------------------------------
 * 2. REUSE — the next invoice must price off the taught pack. (The eggs-case
 *    analogue, pinned with the real cheese line.) resolveMatchedPrice is
 *    protected: read and tested here, never edited.
 * ------------------------------------------------------------------------- */

// eslint-disable-next-line no-new-func
const pricing = new Function(`
  "use strict";
  function invDbg(){}
  ${extractFn(SRC, 'moneyMatches')}
  ${extractFn(SRC, 'firstPairPrice')}
  ${extractFn(SRC, 'packPriceOf')}
  ${extractFn(SRC, 'unitCatCategory')}
  ${extractFn(SRC, 'derivePackPrice')}
  ${extractFn(SRC, 'resolveMatchedPrice')}
  return { resolveMatchedPrice: resolveMatchedPrice, derivePackPrice: derivePackPrice, packPriceOf: packPriceOf };
`)();

const CHEESE_LINE = "PKT 218662 #CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg 2 21.29 42.58";

test('v38 REUSE: a matched line prices off the product\u2019s taught pack, per unit, with no mismatch', () => {
  // what the parser derived on its own: $14.19/kg from the "1.5kg" it can see. It cannot
  // know "105'S" — and per the brief it must never be taught to.
  const row = { name: "CHEESE SLICES TASTY 105'S", raw: CHEESE_LINE, unitPrice: 14.19, unit: 'kg', needManual: false };
  pricing.resolveMatchedPrice(row, { pack_qty: 105, pack_unit: 'ea', base_unit: 'ea' }, null);

  assert.equal(row.priceSource, 'product-pack', 'the taught pack outranks the parser derivation');
  assert.equal(row.unit, 'ea', 'priced per slice, not per kg');
  // the contract is packPrice/105, where packPrice is whatever packPriceOf reads off the
  // line — packPriceOf is inside the protected region and is not this brief's business.
  const packPrice = pricing.packPriceOf(CHEESE_LINE);
  assert.ok(packPrice > 0, 'the line must yield a pack price at all');
  assert.ok(Math.abs(row.unitPrice - packPrice / 105) < 1e-9, `expected packPrice/105 (${packPrice}/105), got ${row.unitPrice}`);
  assert.equal(!!row.unitMismatch, false, 'and raises NO unit mismatch — the pack IS the answer to that question');
  assert.equal(row.needManual, false, 'nothing left for a human to do');
});

test('v38 REUSE: the row carries the product\u2019s pack forward, so the chip reads 105 units not 1.50 kg', () => {
  const row = { name: "CHEESE SLICES TASTY 105'S", raw: CHEESE_LINE, unitPrice: 14.19, unit: 'kg', needManual: false };
  pricing.resolveMatchedPrice(row, { pack_qty: 105, pack_unit: 'ea', base_unit: 'ea' }, null);
  assert.equal(row.fromProductPack, true);
  assert.equal(row.taughtQty, 105);
  assert.equal(row.taughtUnit, 'ea');
});

test('v38 REUSE: precedence holds — the product pack outranks supplier memory', () => {
  const mem = { qty: 1.5, unit: 'kg' };                       // a stale/wrong memory
  const row = { name: "CHEESE SLICES TASTY 105'S", raw: CHEESE_LINE, unitPrice: 14.19, unit: 'kg', needManual: false };
  pricing.resolveMatchedPrice(row, { pack_qty: 105, pack_unit: 'ea', base_unit: 'ea' }, mem);
  assert.equal(row.priceSource, 'product-pack', 'documented order: product pack > supplier memory > parser > manual');
  assert.equal(row.taughtQty, 105);
});

test('v38 REUSE: with NO product pack the parser derivation stands and the mismatch fires \u2014 the v37 behaviour Max saw', () => {
  const row = { name: "CHEESE SLICES TASTY 105'S", raw: CHEESE_LINE, unitPrice: 14.19, unit: 'kg', needManual: false };
  pricing.resolveMatchedPrice(row, { pack_qty: null, pack_unit: null, base_unit: 'ea' }, null);
  assert.equal(row.priceSource, 'parser');
  assert.equal(row.unitMismatch, true, 'per-kg guess against a per-unit product: correctly blocked');
  assert.equal(row.needManual, true, 'which is what opens the pack-teach flow in the first place');
});

/* ---------------------------------------------------------------------------
 * 3. PREFILL — the pack-teach must offer the PRODUCT's taught pack, never the
 *    parser's guess. Re-confirming a wrong prefill is how a good pack dies.
 * ------------------------------------------------------------------------- */

const PREFILL_ANCHOR = 'var bprod=(r.bestId&&byId[r.bestId])?byId[r.bestId]:null;';

function prefillFor(row, product, mem) {
  const i = SRC.indexOf(PREFILL_ANCHOR);
  if (i < 0) throw new Error(`pack-survives: prefill anchor not found. renderInvReview changed; update tests/pack-survives.test.js`);
  const end = SRC.indexOf('\n', SRC.indexOf('var puNow=', i));
  const slice = SRC.slice(i, end);

  // eslint-disable-next-line no-new-func
  const factory = new Function('ROW', 'PRODUCT', 'MEM', `
    "use strict";
    var r = ROW, mem = MEM;
    var byId = {}; if(PRODUCT) byId[PRODUCT.id] = PRODUCT;
    var baseCat0 = PRODUCT ? unitCatCategory(PRODUCT.base_unit) : null;
    function invDbg(){}
    ${extractFn(SRC, 'unitCatCategory')}
    ${extractFn(SRC, 'packCount')}
    ${slice}
    return { qty: pq, unit: puNow };
  `);
  return factory(row, product, mem);
}

test('v38 PREFILL: a product with a taught pack prefills 105 / ea, not the parser\u2019s 1.5 kg', () => {
  // the nasty case: the product HAS a taught pack, but resolveMatchedPrice could not apply
  // it to this line (no pack price found), so r.taughtQty is null. v37 fell straight to the
  // parser's guess — and re-confirming that guess overwrites the taught pack with it.
  const row = { bestId: 'P0079', raw: CHEESE_LINE, name: "CHEESE SLICES TASTY 105'S",
                taughtQty: null, taughtUnit: null, unit: 'kg' };
  const product = { id: 'P0079', base_unit: 'ea', pack_qty: 105, pack_unit: 'ea' };
  const out = prefillFor(row, product, null);
  assert.equal(out.qty, 105, 'the pack Max taught must be what he sees');
  assert.equal(out.unit, 'ea');
});

test('v38 PREFILL: the product\u2019s pack outranks supplier memory, matching the pricing precedence', () => {
  const row = { bestId: 'P0079', raw: CHEESE_LINE, name: "CHEESE SLICES TASTY 105'S",
                taughtQty: null, taughtUnit: null, unit: 'kg' };
  const product = { id: 'P0079', base_unit: 'ea', pack_qty: 105, pack_unit: 'ea' };
  const out = prefillFor(row, product, { qty: 1.5, unit: 'kg' });
  assert.equal(out.qty, 105, 'a stale memory must not shadow the product');
  assert.equal(out.unit, 'ea');
});

test('v38 PREFILL: a row already priced off the product pack still shows it', () => {
  const row = { bestId: 'P0079', raw: CHEESE_LINE, name: "CHEESE SLICES TASTY 105'S",
                taughtQty: 105, taughtUnit: 'ea', unit: 'ea' };
  const product = { id: 'P0079', base_unit: 'ea', pack_qty: 105, pack_unit: 'ea' };
  const out = prefillFor(row, product, null);
  assert.equal(out.qty, 105);
  assert.equal(out.unit, 'ea');
});

test('v38 PREFILL: with no product pack, supplier memory still fills, then the parser guess \u2014 unchanged from v37', () => {
  const row = { bestId: 'P0079', raw: CHEESE_LINE, name: "CHEESE SLICES TASTY 105'S",
                taughtQty: null, taughtUnit: null, unit: 'kg' };
  const bare = { id: 'P0079', base_unit: 'ea' };

  const fromMem = prefillFor(row, bare, { qty: 90, unit: 'ea' });
  assert.equal(fromMem.qty, 90, 'memory is still the second source');

  const fromGuess = prefillFor(row, bare, null);
  assert.equal(fromGuess.qty, '', 'nothing to prefill the qty with');
  assert.equal(fromGuess.unit, 'ea', "packCount sees \"105'S\" and guesses per-unit \u2014 the existing fallback");
});
