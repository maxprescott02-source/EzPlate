/*
 * bulk-product-writes.test.js — 193.
 *
 * `setProduct` became the N=1 case of `setProducts`, and `dbPushIngredient` the N=1 case of
 * `dbPushIngredients`, so that the catalogue CSV importer can create or re-price a whole supplier
 * catalogue without one HTTP request per product. This file pins the plural side.
 *
 * WHY IT IS ITS OWN FILE. The three files that already declared `setProduct` in the mutation gate
 * all stub the thing this change is about: price-log-paths and change-log stub `rebuild()` to a
 * no-op and pack-survives stubs `setProduct` outright. They are right to — none of them is about
 * persistence ordering. But it means NONE of them can notice `rebuild()` being deleted from the
 * middle of setProducts, and the gate said so by leaving that mutant alive. The remedy this repo
 * has settled on is to test the real function rather than to widen an allowance, so the real
 * `rebuild`, the real `PRODUCTS`/`byId` and the real chunking run here.
 *
 * The ordering assertion is the one that matters most and is the least obvious: `dbPushIngredients`
 * resolves its rows through `byId`, so a `rebuild()` that has not run yet means a brand-new product
 * is pushed as NOTHING — the write succeeds, the row never exists, and no error is raised anywhere.
 * That is why the stub below records what `byId` could see at the moment it was called rather than
 * merely recording the ids.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* The real chain, with only the two network writers stubbed — at the PLURAL boundary, which is where
   the chain now ends. `rebuild` is the real one, so PRODUCTS/byId are really rebuilt. */
/* 224: the history flush is GATED on the product write, so it lands one macrotask later than the
   memory point. A real timer boundary rather than a count of awaits — the chain's length is an
   implementation detail, and a test that counted ticks would go vacuous the day one moved. */
const settle = () => new Promise((r) => setTimeout(r, 0));

function sandbox(seed) {
  const productPushes = [];   // one entry per dbPushIngredients CALL, not per product
  const pointPushes = [];     // one entry per dbPushIngPrices CALL
  // eslint-disable-next-line no-new-func
  const factory = new Function('SEED', 'PP', 'HP', `
    "use strict";
    var productsById = JSON.parse(JSON.stringify(SEED || {}));
    var PRODUCTS, byId;
    var ingPriceLog = {};
    var _ingLogPending = [];
    var _priceSeen = {};
    ${extractFn(SRC, 'rebuild')}
    /* Records what byId could resolve AT CALL TIME. A deleted rebuild() shows up here as a null
       description for a product that certainly has one. */
    function dbPushIngredients(ids){
      PP.push((ids||[]).map(function(id){ return byId[id] ? (byId[id].description || '(no description)') : null; }));
      // 224: the manifest is part of this function's resolved shape, so the stub carries it. Section
      // 8 below runs the REAL one against the REAL chunking, which is what proves the shape here.
      return Promise.resolve({error:null, saved:(ids||[]).slice()});
    }
    function dbPushIngPrices(pts){ HP.push((pts||[]).slice()); return Promise.resolve({error:null}); }
    ${extractFn(SRC, 'samePrice')}
    ${extractFn(SRC, 'logIngPrice')}
    ${extractFn(SRC, 'unlogIngPrices')}
    ${extractFn(SRC, 'writeSaved')}
    ${extractFn(SRC, 'saveIngLog')}
    ${extractFn(SRC, 'confirmedPrice')}
    ${extractFn(SRC, 'confirmPrices')}
    ${extractVar(SRC, '_priceSeq')}
    ${extractFn(SRC, 'setProducts')}
    ${extractFn(SRC, 'setProduct')}
    rebuild();
    return {
      setProducts: setProducts,
      setProduct: setProduct,
      product: function(id){ return productsById[id]; },
      byId: function(id){ return byId[id]; },
      count: function(){ return PRODUCTS.length; },
      points: function(id){ return (ingPriceLog[id] || []).slice(); },
      pending: function(){ return _ingLogPending.slice(); }
    };
  `);
  const api = factory(seed, productPushes, pointPushes);
  api.productPushes = productPushes;
  api.pointPushes = pointPushes;
  return api;
}

// Two products, priced, with the fields a partial patch must not destroy.
const SEED = {
  P0004: { id: 'P0004', description: 'Chips 10mm', brand: 'Edgell', category: 'Frozen',
           supplier: 'Bidfood', base_unit: 'g', cost_per_base_unit: 0.0122, cost_basis: '$/g',
           pack_qty: 5, pack_unit: 'kg', is_food: true },
  P0009: { id: 'P0009', description: 'Tasty Cheese Block', brand: 'Perfect Italiano', category: 'Dairy',
           supplier: 'Bidfood', base_unit: 'g', cost_per_base_unit: 0.0098, cost_basis: '$/g',
           is_food: true },
};

/* ---------------------------------------------------------------------------
 * 1. THE EXTRACTION PRESERVED THE SINGLE CASE.
 * This is the "assert the copy against the real function" discipline pointed the other way: there is
 * no copy, and this is what says so. Drive both entry points with the same patch and require the
 * resulting state to be indistinguishable.
 * ------------------------------------------------------------------------- */
test('setProduct(id, patch) and setProducts([{id, patch}]) are the same operation', async () => {
  const patch = { cost_per_base_unit: 0.0130, base_unit: 'g', cost_basis: '$/g' };

  const single = sandbox(SEED);
  single.setProduct('P0004', patch);

  const plural = sandbox(SEED);
  plural.setProducts([{ id: 'P0004', patch: patch }]);

  /* 224: the settle is what keeps the two flush assertions below from comparing 0 against 0 — the
     shape CLAUDE.md's roster records at 205, where "these two agree about X" is silently satisfied
     when neither has an X. The literal on the next line is the other half of that remedy. */
  await settle();
  assert.strictEqual(plural.pointPushes.length, 1, 'a flush really happened, so the comparison below has something to compare');

  assert.deepStrictEqual(plural.product('P0004'), single.product('P0004'), 'the stored product must be identical');
  assert.deepStrictEqual(plural.points('P0004'), single.points('P0004').map((p, i) => ({ ...p, t: plural.points('P0004')[i].t })),
    'the same price point must be logged (timestamps aside)');
  assert.strictEqual(plural.productPushes.length, single.productPushes.length, 'the same number of product writes');
  assert.deepStrictEqual(plural.productPushes, single.productPushes, 'the same products written, seen through the same rebuilt byId');
  assert.strictEqual(plural.pointPushes.length, single.pointPushes.length, 'the same number of history flushes');
});

/* ---------------------------------------------------------------------------
 * 2. A PARTIAL PATCH MERGES. It is one word — `productsById[e.id]||{}` — and getting it wrong wipes
 * every field the patch does not mention, on every product, on the ordinary invoice path.
 * ------------------------------------------------------------------------- */
test('a price-only patch leaves every other field of the product standing', () => {
  const s = sandbox(SEED);
  s.setProducts([{ id: 'P0004', patch: { cost_per_base_unit: 0.0130 } }]);
  const p = s.product('P0004');
  assert.strictEqual(p.cost_per_base_unit, 0.0130, 'the patched field changed');
  assert.strictEqual(p.description, 'Chips 10mm', 'description survived');
  assert.strictEqual(p.supplier, 'Bidfood', 'supplier survived');
  assert.strictEqual(p.pack_qty, 5, 'the taught pack survived — v38 is the bug this restates');
  assert.strictEqual(p.category, 'Frozen', 'category survived');
});

/* ---------------------------------------------------------------------------
 * 3. THE ORDERING. rebuild() sits between the memory write and the server write BECAUSE the server
 * write resolves through byId. Delete it and a new product is pushed as nothing at all.
 * ------------------------------------------------------------------------- */
test('rebuild() runs BEFORE the push, so a brand-new product is visible to the writer', () => {
  const s = sandbox(SEED);
  s.setProducts([{ id: 'IMPnew1', patch: { id: 'IMPnew1', description: 'Barramundi Fillet', base_unit: 'g', cost_per_base_unit: 0.0169 } }]);
  assert.strictEqual(s.productPushes.length, 1, 'one write');
  assert.deepStrictEqual(s.productPushes[0], ['Barramundi Fillet'],
    'the writer must have been able to resolve the new product through byId — a null here means rebuild() did not run first, which pushes an empty row set and raises nothing');
  assert.ok(s.byId('IMPnew1'), 'and byId holds it afterwards');
  assert.strictEqual(s.count(), 3, 'PRODUCTS grew');
});

/* ---------------------------------------------------------------------------
 * 4. N PRODUCTS ARE ONE WRITE AND ONE FLUSH. This is the whole reason the plural exists: a 412-row
 * catalogue import must not be 412 requests.
 * ------------------------------------------------------------------------- */
test('three products with three price changes are ONE product write and ONE history flush', async () => {
  const s = sandbox(SEED);
  s.setProducts([
    { id: 'P0004', patch: { cost_per_base_unit: 0.0130 } },
    { id: 'P0009', patch: { cost_per_base_unit: 0.0105 } },
    { id: 'IMPnew2', patch: { id: 'IMPnew2', description: 'Squid Tubes', base_unit: 'g', cost_per_base_unit: 0.021 } },
  ]);
  await settle();
  assert.strictEqual(s.productPushes.length, 1, 'ONE product write, not three');
  assert.strictEqual(s.productPushes[0].length, 3, 'carrying all three products');
  assert.strictEqual(s.pointPushes.length, 1, 'ONE history flush, not three');
  assert.strictEqual(s.pointPushes[0].length, 3, 'carrying all three points');
  assert.deepStrictEqual(s.pending(), [], 'nothing is left pending — a point that never flushes is the v91 failure');
});

test('only the products whose price actually MOVED contribute a point', async () => {
  const s = sandbox(SEED);
  s.setProducts([
    { id: 'P0004', patch: { cost_per_base_unit: 0.0122 } },          // unchanged
    { id: 'P0009', patch: { cost_per_base_unit: 0.0105 } },          // moved
    { id: 'P0004', patch: { category: 'Frozen Goods' } },            // not a price patch at all
  ]);
  await settle();
  assert.strictEqual(s.pointPushes.length, 1, 'one flush');
  assert.deepStrictEqual(s.pointPushes[0].map((p) => p.pid), ['P0009'], 'only the mover');
  assert.deepStrictEqual(s.points('P0004'), [], 'the unchanged product logged nothing');
});

test('a batch in which NOTHING moved flushes no history at all', async () => {
  const s = sandbox(SEED);
  s.setProducts([
    { id: 'P0004', patch: { category: 'Frozen Goods' } },
    { id: 'P0009', patch: { brand: 'Bega' } },
  ]);
  await settle();
  assert.strictEqual(s.productPushes.length, 1, 'the products still save');
  assert.strictEqual(s.pointPushes.length, 0, 'and saveIngLog, called unconditionally, pushed nothing');
});

/* ---------------------------------------------------------------------------
 * 5. THE GUARDS. Both are one word, and both fail by THROWING rather than by writing something
 * wrong — which in an import loop means the batch dies partway with the toast already showing.
 * ------------------------------------------------------------------------- */
test('a null or id-less entry is skipped, not thrown on', () => {
  const s = sandbox(SEED);
  assert.doesNotThrow(() => {
    s.setProducts([null, undefined, { patch: { cost_per_base_unit: 1 } }, { id: 'P0004', patch: { cost_per_base_unit: 0.0130 } }]);
  });
  assert.strictEqual(s.productPushes.length, 1);
  assert.deepStrictEqual(s.productPushes[0], ['Chips 10mm'], 'only the one real entry was written');
});

test('an entry with no patch at all is a no-op rather than a crash', () => {
  const s = sandbox(SEED);
  assert.doesNotThrow(() => { s.setProducts([{ id: 'P0004' }]); });
  assert.deepStrictEqual(s.product('P0004'), SEED.P0004, 'nothing changed');
  assert.strictEqual(s.pointPushes.length, 0, 'and no price point was invented');
});

test('an empty batch touches nothing and still resolves', async () => {
  const s = sandbox(SEED);
  const r = await s.setProducts([]);
  assert.strictEqual(r.error, null, 'it resolves to a result shape, never to null — pushWrite\'s contract');
  assert.strictEqual(s.productPushes.length, 0);
});

/* ---------------------------------------------------------------------------
 * 6. THE PRICE GUARDS SURVIVE THE MOVE. isFinite('') is TRUE, and a catalogue CSV is full of blank
 * cells, so this is not a restatement for its own sake — it is the same trap on a new path.
 * ------------------------------------------------------------------------- */
test("a blank or null price in a BATCH fabricates no point — isFinite('') is TRUE", () => {
  const s = sandbox(SEED);
  s.setProducts([
    { id: 'P0004', patch: { cost_per_base_unit: '' } },
    { id: 'P0009', patch: { cost_per_base_unit: null } },
    { id: 'IMPnew3', patch: { id: 'IMPnew3', description: 'No price', base_unit: 'g', cost_per_base_unit: undefined } },
  ]);
  assert.strictEqual(s.pointPushes.length, 0, 'not one $0.00 observation was invented');
  assert.deepStrictEqual(s.points('P0004'), []);
  assert.deepStrictEqual(s.points('P0009'), []);
});

test('zero IS a price in a batch, and it is logged', async () => {
  const s = sandbox(SEED);
  s.setProducts([{ id: 'IMPzero', patch: { id: 'IMPzero', description: 'Comped item', base_unit: 'ea', cost_per_base_unit: 0 } }]);
  await settle();
  assert.strictEqual(s.pointPushes.length, 1);
  assert.strictEqual(s.pointPushes[0][0].v, 0);
});

/* ---------------------------------------------------------------------------
 * 7. CHUNKING. dbPushIngredients is what actually talks to the network, and a catalogue is not
 * bounded by anything — so the request must be.
 * ------------------------------------------------------------------------- */
function writerSandbox(rowCount, failAtCall) {
  const calls = [];
  const labels = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('N', 'CALLS', 'FAIL_AT', 'LABELS', `
    "use strict";
    var byId = {};
    for (var i = 0; i < N; i++) byId['IMP' + i] = { id: 'IMP' + i, description: 'p' + i };
    function ingredientToRow(p){ return { id: p.id, description: p.description }; }
    var SUPA = { from: function(){ return { upsert: function(rows){
      CALLS.push(rows.length);
      return Promise.resolve(CALLS.length === FAIL_AT ? { error: { message: 'boom' } } : { data: rows, error: null });
    } }; } };
    function pushWrite(builder, label){
      LABELS.push(label);
      return Promise.resolve().then(builder).then(function(res){ return (res && res.error) ? { error: res.error } : res; });
    }
    ${extractVar(SRC, 'ING_PUSH_CHUNK')}
    ${extractFn(SRC, 'dbPushIngredients')}
    ${extractFn(SRC, 'dbPushIngredient')}
    return { dbPushIngredients: dbPushIngredients, dbPushIngredient: dbPushIngredient,
             ids: Object.keys(byId) };
  `);
  const api = factory(rowCount, calls, failAtCall || 0, labels);
  api.calls = calls;
  api.labels = labels;
  return api;
}

test('a 412-product catalogue is chunked, not sent as one request and not as 412', async () => {
  const w = writerSandbox(412);
  await w.dbPushIngredients(w.ids);
  assert.deepStrictEqual(w.calls, [200, 200, 12], 'three requests of at most ING_PUSH_CHUNK rows');
});

test('one product is still exactly one request', async () => {
  const w = writerSandbox(1);
  await w.dbPushIngredient('IMP0');
  assert.deepStrictEqual(w.calls, [1]);
});

test('an exact multiple of the chunk size sends no trailing EMPTY request', async () => {
  const w = writerSandbox(400);
  await w.dbPushIngredients(w.ids);
  assert.deepStrictEqual(w.calls, [200, 200], 'two full chunks and nothing after them');
});

/* The label is the word in the failure toast, and it is the only thing the user ever reads about
   this function. "Couldn't save ingredient" for a 412-row catalogue, or "Couldn't save products"
   for one hand-edited price, are both wrong in a way nothing else would catch. */
test('the failure toast says "ingredient" for one and "products" for many', async () => {
  const one = writerSandbox(1);
  await one.dbPushIngredient('IMP0');
  assert.deepStrictEqual(one.labels, ['ingredient']);

  const many = writerSandbox(3);
  await many.dbPushIngredients(many.ids);
  assert.deepStrictEqual(many.labels, ['products']);
});

test('a failed chunk STOPS the rest, and the failure is what resolves', async () => {
  const w = writerSandbox(412, 2);
  const res = await w.dbPushIngredients(w.ids);
  assert.deepStrictEqual(w.calls, [200, 200], 'the third chunk was never sent');
  assert.ok(res && res.error, 'and the caller is told, rather than being handed the last success');
  assert.strictEqual(res.error.message, 'boom');
});

test('ids that resolve to nothing are dropped before the request, never sent as holes', async () => {
  const w = writerSandbox(3);
  await w.dbPushIngredients(['IMP0', 'GHOST', 'IMP2']);
  assert.deepStrictEqual(w.calls, [2], 'two real rows went; the unknown id did not become an undefined row');
});

test('an empty id list makes no request at all and still resolves to a result shape', async () => {
  const w = writerSandbox(3);
  const res = await w.dbPushIngredients([]);
  assert.deepStrictEqual(w.calls, []);
  assert.strictEqual(res.error, null);
});

/* ---------------------------------------------------------------------------
 * 8. THE CHUNK BOUNDARY MEETS THE PRICE LOG (224). The two halves of this file were independent
 * until the price log's flush was gated on the product write: chunking was tested with no price
 * log, and the gate was tested with a write that was one atomic call. Between them sat the case
 * that is neither, and the pre-push review found it by running exactly this combination.
 *
 * `dbPushIngredients` stops at the first failing chunk, so a refusal means the chunks BEFORE it
 * reached the server. Judging the whole call on that one error deleted the real price history of
 * every product in the landed chunks — on the 412-product catalogue import, 200 of them — while
 * `catImportApply` told the user "Nothing is lost". This runs the REAL chunking, the REAL fold and
 * the REAL price-log chain together, because a stub for either end agrees with whichever belief
 * built it.
 * ------------------------------------------------------------------------- */
function chunkedSandbox(failAtCall) {
  const upserts = [];         // the row-id arrays that actually reached the "server"
  const pointPushes = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('UPS', 'HP', 'FAIL_AT', `
    "use strict";
    var productsById = {};
    for (var i = 0; i < 5; i++) productsById['IMP' + i] = { id:'IMP' + i, description:'p' + i,
      base_unit:'g', cost_basis:'$/g', cost_per_base_unit:0.01, is_food:true };
    var PRODUCTS, byId;
    var ingPriceLog = {}, _ingLogPending = [], _priceSeen = {};
    ${extractFn(SRC, 'rebuild')}
    ${extractFn(SRC, 'ingredientToRow')}
    var SUPA = { from: function(){ return { upsert: function(rows){
      UPS.push(rows.map(function(r){ return r.id; }));
      return Promise.resolve(UPS.length === FAIL_AT ? { error:{ message:'boom' } } : { data:rows, error:null });
    } }; } };
    function pushWrite(builder, label){
      return Promise.resolve().then(builder).then(function(res){ return (res && res.error) ? { error:res.error } : res; });
    }
    function dbPushIngPrices(pts){ HP.push((pts||[]).slice()); return Promise.resolve({error:null}); }
    /* ING_PUSH_CHUNK is deliberately overridden to 2 AFTER the real declaration is sliced in, so the
       chunking under test is the shipped fold and only the boundary is moved. Five products at a
       chunk of 2 is three chunks, which is the catalogue import's shape without 412 rows of setup. */
    ${extractVar(SRC, 'ING_PUSH_CHUNK')}
    ING_PUSH_CHUNK = 2;
    ${extractFn(SRC, 'dbPushIngredients')}
    ${extractFn(SRC, 'samePrice')}
    ${extractFn(SRC, 'logIngPrice')}
    ${extractFn(SRC, 'unlogIngPrices')}
    ${extractFn(SRC, 'writeSaved')}
    ${extractFn(SRC, 'saveIngLog')}
    ${extractFn(SRC, 'confirmedPrice')}
    ${extractFn(SRC, 'confirmPrices')}
    ${extractVar(SRC, '_priceSeq')}
    ${extractFn(SRC, 'setProducts')}
    rebuild();
    return {
      setProducts: setProducts,
      confirmedPrice: confirmedPrice,
      points: function(id){ return (ingPriceLog[id] || []).slice(); },
      pending: function(){ return _ingLogPending.slice(); }
    };
  `);
  const api = factory(upserts, pointPushes, failAtCall || 0);
  api.upserts = upserts;
  api.pointPushes = pointPushes;
  return api;
}

const REPRICE = ['IMP0', 'IMP1', 'IMP2', 'IMP3', 'IMP4']
  .map((id, i) => ({ id: id, patch: { cost_per_base_unit: 0.02 + i / 1000 } }));

test('all chunks land: every point is flushed, in one insert', async () => {
  const s = chunkedSandbox();
  await s.setProducts(REPRICE);
  await settle();
  assert.deepStrictEqual(s.upserts, [['IMP0', 'IMP1'], ['IMP2', 'IMP3'], ['IMP4']], 'three real chunks');
  assert.strictEqual(s.pointPushes.length, 1, 'one history insert for the whole call');
  assert.deepStrictEqual(s.pointPushes[0].map((p) => p.pid), REPRICE.map((e) => e.id));
});

test('the SECOND chunk fails: the first chunk keeps its price history, the rest is rolled back', async () => {
  const s = chunkedSandbox(2);                                  // upsert call 2 of 3 errors
  const res = await s.setProducts(REPRICE);
  await settle();

  assert.ok(res && res.error, 'the caller is still told the import did not finish');
  assert.deepStrictEqual(s.upserts, [['IMP0', 'IMP1'], ['IMP2', 'IMP3']], 'chunk 3 was never sent');

  assert.strictEqual(s.pointPushes.length, 1, 'the landed chunk still writes its history');
  assert.deepStrictEqual(s.pointPushes[0].map((p) => p.pid), ['IMP0', 'IMP1'],
    'exactly the products the server stored — no more, and crucially no fewer');

  assert.deepStrictEqual(s.points('IMP0').map((p) => p.v), [0.02], 'and they keep their memory series');
  assert.deepStrictEqual(s.points('IMP2'), [], 'while a product in the failed chunk has none');
  assert.deepStrictEqual(s.points('IMP4'), [], 'nor does one whose chunk was never sent');
  assert.deepStrictEqual(s.pending(), [], 'nothing is stranded for a later caller to flush');

  assert.strictEqual(s.confirmedPrice('IMP0'), 0.02, 'the landed price is what the server holds');
  assert.strictEqual(s.confirmedPrice('IMP2'), 0.01, 'and the refused ones still name the old one');
  assert.strictEqual(s.confirmedPrice('IMP4'), 0.01);
});

test('the FIRST chunk fails: nothing landed, so nothing is logged', async () => {
  const s = chunkedSandbox(1);
  await s.setProducts(REPRICE);
  await settle();
  assert.deepStrictEqual(s.upserts, [['IMP0', 'IMP1']], 'it stopped immediately');
  assert.strictEqual(s.pointPushes.length, 0, 'and no history insert was attempted at all');
  assert.deepStrictEqual(s.points('IMP0'), []);
});
