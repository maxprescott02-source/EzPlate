/*
 * price-log-paths.test.js — v109. One bug: a product's price could change without being observed.
 *
 * THE DEFECT. `logIngPrice` was called from TWO places — the builder hand-edit (commitPrice) and
 * invoice-confirm's matched branch. Editing a price on the PRODUCTS TAB (saveIngEdit) wrote the new
 * price and logged nothing. Max edited two prices on 31 Jul 2026; the v106 export showed 33 points,
 * newest 15 Jul, with neither of them present.
 *
 * Enumerating every writer of `cost_per_base_unit` before patching turned up two MORE silent paths,
 * both product CREATION: submitNew (Products tab) and applyInvoice's add-new branch. Those matter
 * more than they look — `ingPriceAt` returns null before a product's first point, so a product
 * created today and re-priced next month has no "was" to have moved from, and the movers card and
 * insight family 1 can say nothing about it at all.
 *
 * WHY IT IS A CORRECTNESS BUG AND NOT A MISSING FEATURE: `ing_price_log` is what `ingPriceAt` reads,
 * which is what historical plate costs are reconstructed from. So the dashboard's history was
 * incomplete depending on WHICH SCREEN the user happened to use, and the gap is invisible — the card
 * shows fewer movers, never an error.
 *
 * THE FIX, and what this file pins: ONE writer, inside `setProduct`, which every price path already
 * funnels through. The condition is the PREVIOUS STORED PRICE, not the last logged point — that
 * distinction is the whole safety of it, and test [6] is the one that would catch losing it.
 *
 * These tests assert THE POINT THAT LANDS, never "did it call the guard". v108's critical bug
 * survived a thorough suite because deleteIngredient was pinned structurally, which cannot catch a
 * wrong condition. Each case here drives the real setProduct with the real patch shape the path
 * produces (built through the app's own newProductRecord / invUnitToBase / unitToBaseFields) and
 * looks at ingPriceLog and the flushed pushes afterwards.
 *
 * All code under test is sliced from the REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* A sandbox holding the real price-log chain. Everything the chain touches that is NOT under test is
   stubbed at its own boundary: saveProductCache/rebuild are no-ops (v108 left the first one empty
   anyway), dbPushIngredient records the product push, dbPushIngPrices records the history push. The
   pushes matter as much as the array: a point that lands in memory and never flushes is precisely the
   v91 failure, and only the push list shows it. */
/* 224: the flush is GATED on the product write, so it lands one microtask later than the memory
   point does. `settle` is a real macrotask boundary rather than a fixed number of `await`s — the
   chain's length is an implementation detail and a test that counted ticks would go quietly vacuous
   the day one moved. Every assertion about `pushedPoints` or `pending()` comes after one. */
const settle = () => new Promise((r) => setTimeout(r, 0));

function sandbox(seed) {
  const pushedProducts = [];
  const pushedPoints = [];
  /* 224: how the PRODUCT write settles, so the gate can be driven both ways. BOTH refusal shapes are
     here on purpose — supabase-js resolves with {error} rather than rejecting, so 'error' is the one
     a real timeout takes and 'throw' is the arm CLAUDE.md roster 184(a) is about: a promise has two
     settle paths and a test that only takes the common one has pinned half a contract. */
  const ctl = { mode: 'ok', held: [], landed: null };
  // eslint-disable-next-line no-new-func
  const factory = new Function('SEED', 'PUSHED_P', 'PUSHED_H', 'CTL', `
    "use strict";
    var productsById = JSON.parse(JSON.stringify(SEED || {}));
    var ingPriceLog = {};
    var _ingLogPending = [];
    var _priceSeen = {};
    function saveProductCache(){}
    function rebuild(){}
    /* 193: the stubs moved DOWN to the plural boundary, because that is where the real chain now
       ends — setProducts calls dbPushIngredients/dbPushIngPrices, and stubbing the singular ones
       would have left two functions nothing calls while the real writers ran for real. They flatten
       back to one entry per product and per point, so every assertion below still means exactly what
       it meant: this product was pushed, and this point was flushed rather than stranded. */
    /* Stubbed at the NETWORK boundary and nowhere further in: it resolves the "saved" manifest the
       real dbPushIngredients resolves, because that manifest is the whole subject of the gate. A
       stub answering only with an error would have agreed with the gate about a question the real
       chunked function cannot answer, which is CLAUDE.md's oldest defect class. CTL.landed, when
       set, names the ids a PARTIAL write got through: what a failing second chunk looks like.
       (No backticks in this comment - it sits inside a template literal.) */
    function dbPushIngredients(ids){
      ids=(ids||[]); ids.forEach(function(id){ PUSHED_P.push(id); });
      if(CTL.mode==='error') return Promise.resolve({error:{message:'timeout'}, saved:(CTL.landed||[])});
      if(CTL.mode==='throw') return Promise.reject(new Error('network'));
      // 'hold' parks the write so a LATER save for the same product can land while it is in flight —
      // the only way to reach the case the rollback's (t, v) pair exists for.
      if(CTL.mode==='hold') return new Promise(function(res){ CTL.held.push({res:res, ids:ids.slice()}); });
      return Promise.resolve({error:null, saved:ids.slice()});
    }
    function dbPushIngPrices(pts){ (pts||[]).forEach(function(p){ PUSHED_H.push({pid:p.pid, t:p.t, v:p.v}); }); return Promise.resolve({error:null}); }
    ${extractFn(SRC, 'setProducts')}
    ${extractFn(SRC, 'setProduct')}
    ${extractFn(SRC, 'samePrice')}
    ${extractFn(SRC, 'logIngPrice')}
    ${extractFn(SRC, 'saveIngLog')}
    ${extractFn(SRC, 'confirmedPrice')}
    ${extractFn(SRC, 'confirmPrices')}
    ${extractFn(SRC, 'unlogIngPrices')}
    ${extractFn(SRC, 'writeSaved')}
    ${extractVar(SRC, '_priceSeq')}
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'ingPriceAt')}
    ${extractFn(SRC, 'ingLastMovePct')}
    ${extractFn(SRC, 'newProductRecord')}
    ${extractFn(SRC, 'invUnitToBase')}
    ${extractFn(SRC, 'unitToBaseFields')}
    ${extractFn(SRC, 'packToUnitCost')}
    return {
      setProduct: setProduct,
      setProducts: setProducts,                                 // 224: the partial-chunk case needs a multi-id call
      logIngPrice: logIngPrice,                                 // 180: exposed so the SECOND guard can be driven directly — see [7]
      newProductRecord: newProductRecord,
      invUnitToBase: invUnitToBase,
      unitToBaseFields: unitToBaseFields,
      packToUnitCost: packToUnitCost,
      ingPriceAt: ingPriceAt,
      ingLastMovePct: ingLastMovePct,
      confirmedPrice: confirmedPrice,
      writeSaved: writeSaved,
      points: function(pid){ return (ingPriceLog[pid] || []).slice(); },
      logged: function(pid){ return Object.prototype.hasOwnProperty.call(ingPriceLog, pid); },
      product: function(pid){ return productsById[pid]; },
      pending: function(){ return _ingLogPending.slice(); }
    };
  `);
  const api = factory(seed, pushedProducts, pushedPoints, ctl);
  api.pushedProducts = pushedProducts;
  api.pushedPoints = pushedPoints;
  api.fail = (mode, landed) => { ctl.mode = mode; ctl.landed = landed || null; };   // 'error' | 'throw' | 'hold' | 'ok'
  api.release = (i, ok) => {
    const h = ctl.held[i];
    h.res(ok ? { error: null, saved: h.ids } : { error: { message: 'timeout' }, saved: [] });
  };
  return api;
}

// A product priced at $12.20/kg, i.e. 0.0122 per base unit — the shape rowToProduct produces.
const SEEDED = {
  P0004: { id: 'P0004', description: 'Chips 10mm', base_unit: 'g', cost_basis: '$/g',
           cost_per_base_unit: 0.0122, pack_qty: null, pack_unit: null, is_food: true },
  P0277: { id: 'P0277', description: 'Tap water', base_unit: 'ml', cost_basis: '$/ml',
           cost_per_base_unit: 0.5, is_food: true },
};

/* --------------------------------------------------------------------------
 * [1] Each enumerated path writes exactly one point on a real price change.
 *     One test per path, driven with that path's own patch shape.
 * ------------------------------------------------------------------------ */

test('PATH 1 (builder hand-edit, commitPrice): a changed price writes exactly one point', async () => {
  const s = sandbox(SEEDED);
  const base = 15.5 / 1000;                                    // commitPrice: $/kg entered -> $/g stored
  s.setProduct('P0004', { cost_per_base_unit: base });
  await settle();
  const pts = s.points('P0004');
  assert.equal(pts.length, 1, 'one point, not zero and not two');
  assert.equal(pts[0].v, base, 'at the committed price in base units');
  assert.equal(s.pushedPoints.length, 1, 'and it was flushed to the server, not stranded in memory');
  assert.equal(s.pushedPoints[0].pid, 'P0004');
});

test('PATH 2 (invoice confirm, matched line): a changed price writes exactly one point', async () => {
  const s = sandbox(SEEDED);
  const ub = s.unitToBaseFields('kg');
  const newC = 18.4 / ub.div;
  s.setProduct('P0004', { cost_per_base_unit: newC, base_unit: ub.base_unit, cost_basis: ub.cost_basis });
  await settle();
  const pts = s.points('P0004');
  assert.equal(pts.length, 1);
  assert.equal(pts[0].v, newC);
  assert.equal(s.pushedPoints.length, 1);
});

test('PATH 3 (Products tab EDIT form, saveIngEdit): the reported defect — a changed price writes one point', async () => {
  const s = sandbox(SEEDED);
  const ub = s.invUnitToBase('kg');                            // saveIngEdit derives the unit from the stored product
  const price = 14.0;
  s.setProduct('P0004', { description: 'Chips 10mm', brand: null, category: 'Frozen', supplier: null,
                          base_unit: ub.base_unit, cost_basis: ub.cost_basis, cost_per_base_unit: price / ub.div,
                          pack_qty: null, pack_unit: null });
  await settle();
  const pts = s.points('P0004');
  assert.equal(pts.length, 1, 'the Products tab logged nothing at all before v109');
  assert.equal(pts[0].v, price / ub.div);
  assert.equal(s.pushedPoints.length, 1);
});

test('PATH 4 (Products tab CREATE form, submitNew): a new product records its first price', async () => {
  const s = sandbox(SEEDED);
  const calc = s.packToUnitCost('2', 'kg', '9.00');            // the create form's own calculator
  const rec = s.newProductRecord({ id: 'U1abc', desc: 'Barramundi', brand: 'Ocean', supplier: 'Bidfood',
    category: 'Seafood', base_unit: calc.base_unit, cost_per_base_unit: calc.cost_per_base_unit,
    cost_basis: calc.cost_basis, isFood: true, packSize: '2', packUnit: 'kg', packPrice: '9.00' });
  s.setProduct('U1abc', rec);
  await settle();
  const pts = s.points('U1abc');
  assert.equal(pts.length, 1, 'a first observation, not nothing — ingPriceAt returns null before it');
  assert.equal(pts[0].v, calc.cost_per_base_unit);
  assert.equal(s.pushedPoints.length, 1);
});

test('PATH 5 (invoice confirm, ADD-NEW line): a new product records its first price', async () => {
  const s = sandbox(SEEDED);
  const ub = s.invUnitToBase('kg');
  const cpbu = 22.5 / ub.div;                                  // collectNewItem: price / ub.div
  s.setProduct('CXzz1', { id: 'CXzz1', description: 'Squid tubes', brand: null, category: 'Seafood',
    sub_category: null, item_type: null, search_aliases: [], base_unit: ub.base_unit,
    cost_per_base_unit: cpbu, cost_basis: ub.cost_basis, is_food: true, pack_size_raw: '1kg',
    sold_by: null, current_price_exgst: null, supplier: 'Bidfood' });
  await settle();
  const pts = s.points('CXzz1');
  assert.equal(pts.length, 1);
  assert.equal(pts[0].v, cpbu);
  assert.equal(s.pushedPoints.length, 1);
});

/* --------------------------------------------------------------------------
 * [2] No path writes a point when the price is unchanged.
 * ------------------------------------------------------------------------ */

test('saving the edit form without touching the price writes nothing', async () => {
  const s = sandbox(SEEDED);
  const ub = s.invUnitToBase('kg');
  // a rename only: same price, re-derived exactly as saveIngEdit re-derives it
  s.setProduct('P0004', { description: 'Chips 10mm Straight Cut', category: 'Frozen',
                          base_unit: ub.base_unit, cost_basis: ub.cost_basis,
                          cost_per_base_unit: 12.2 / ub.div });
  await settle();
  assert.equal(s.points('P0004').length, 0, 'the log records changes, not saves');
  assert.equal(s.pushedPoints.length, 0, 'and nothing was pushed');
  assert.equal(s.pushedProducts.length, 1, 'the product itself still saved — only the point is skipped');
});

test('re-committing a price shown to 2dp writes nothing (display rounding is a keystroke, not an observation)', () => {
  // The chip renders cost*1000 at toFixed(2); the stored value is exact. Re-committing what is on
  // screen therefore hands back a value differing in the 18th decimal.
  const s = sandbox({ P0004: Object.assign({}, SEEDED.P0004, { cost_per_base_unit: 0.012199999999999999 }) });
  s.setProduct('P0004', { cost_per_base_unit: 12.20 / 1000 });
  assert.equal(s.points('P0004').length, 0, JSON.stringify(s.points('P0004')));
});

test('the invoice pack-teach write fabricates NO point — on a product whose log is EMPTY', async () => {
  /* THE ONE THAT MATTERS MOST. applyInvoice teaches a pack with setProduct(id,{pack_qty,pack_unit}),
     which changes no price (pack fields feed invoice DERIVATION only; cost_per_base_unit is stored).
     If the "did it change" question were asked of the LAST LOGGED POINT instead of the previous
     stored price, this would sail past — nearly every product's log is empty (33 points across 412
     products), so there is no last point to be equal to, and a pack teach would have invented a
     price observation for a change that never happened. */
  const s = sandbox(SEEDED);
  assert.equal(s.points('P0004').length, 0, 'precondition: this product has no history at all');
  s.setProduct('P0004', { pack_qty: 105, pack_unit: 'ea' });
  await settle();
  assert.equal(s.points('P0004').length, 0, 'a pack is not a price');
  assert.equal(s.pushedPoints.length, 0);
  assert.equal(s.product('P0004').pack_qty, 105, 'the pack itself still wrote');
});

test('a tidy-style write of category/brand/supplier writes no point', () => {
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { category: 'Frozen Goods' });
  assert.equal(s.points('P0004').length, 0);
});

/* --------------------------------------------------------------------------
 * [3] A price of 0 writes a point; null and '' do not.
 * ------------------------------------------------------------------------ */

test('a price of 0 IS a price and writes a point', async () => {
  const s = sandbox(SEEDED);                                   // P0277 currently 0.5
  s.setProduct('P0277', { cost_per_base_unit: 0 });
  await settle();
  const pts = s.points('P0277');
  assert.equal(pts.length, 1, '0 is legitimate — P0277 costs 0');
  assert.equal(pts[0].v, 0);
  assert.equal(s.pushedPoints.length, 1);
});

test('0 -> 0 is still a no-op (the tolerance collapses at zero, so equality must carry it)', () => {
  const s = sandbox({ P0277: Object.assign({}, SEEDED.P0277, { cost_per_base_unit: 0 }) });
  s.setProduct('P0277', { cost_per_base_unit: 0 });
  assert.equal(s.points('P0277').length, 0);
});

test('null writes no point', async () => {
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: null });
  await settle();
  assert.equal(s.points('P0004').length, 0);
  assert.equal(s.pushedPoints.length, 0);
});

test("'' writes no point — isFinite('') is TRUE, which would have fabricated a $0.00 observation", async () => {
  // The same trap rowToPoint was corrected for in v108: Number('') is 0, so an isFinite-only guard
  // admits a blank field as a real-looking free product.
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: '' });
  await settle();
  assert.equal(s.points('P0004').length, 0, JSON.stringify(s.points('P0004')));
  assert.equal(s.pushedPoints.length, 0);
});

test('a new product created with no price at all writes no point', () => {
  const s = sandbox(SEEDED);
  s.setProduct('NEW1', { id: 'NEW1', description: 'Unpriced', cost_per_base_unit: null });
  assert.equal(s.points('NEW1').length, 0, 'nothing was observed, so nothing is recorded');
});

/* --------------------------------------------------------------------------
 * [4] Points from different paths are indistinguishable to ingPriceAt.
 * ------------------------------------------------------------------------ */

test('ingPriceAt cannot tell which path produced a point', async () => {
  const s = sandbox(SEEDED);
  // The waits are real and necessary: `t` is Date.now(), so three writes in the same tick share one
  // timestamp and ingPriceAt (which walks `<= ms`) cannot separate them. That is true of every
  // writer and always has been; a human cannot re-price one product three times inside a
  // millisecond, and applyInvoice's loop touches a DIFFERENT product each pass.
  const tick = () => new Promise((r) => setTimeout(r, 2));
  const created = 9.0 / 1000;
  s.setProduct('U2abc', { id: 'U2abc', description: 'Beef', base_unit: 'g',      // PATH 4: creation
                          cost_basis: '$/g', cost_per_base_unit: created, is_food: true });
  const t0 = s.points('U2abc')[0].t;
  await tick();
  const edited = 11.0 / 1000;
  s.setProduct('U2abc', { description: 'Beef Rump', cost_per_base_unit: edited });  // PATH 3: form edit
  await tick();
  const invoiced = 12.5 / 1000;
  s.setProduct('U2abc', { cost_per_base_unit: invoiced, base_unit: 'g', cost_basis: '$/g' });  // PATH 2

  const pts = s.points('U2abc');
  assert.equal(pts.length, 3, 'three real changes, three points');
  pts.forEach((p, i) => {
    assert.equal(typeof p.t, 'number', `point ${i}: t is epoch millis, as every other writer produces`);
    assert.equal(typeof p.v, 'number', `point ${i}: v is the exact cost per base unit`);
    assert.deepEqual(Object.keys(p).sort(), ['t', 'v'], `point ${i}: no extra field marks its origin`);
  });
  const last = pts[pts.length - 1].t;
  assert.equal(s.ingPriceAt('U2abc', last), invoiced, 'reads the latest through the same accessor');
  assert.equal(s.ingPriceAt('U2abc', t0), created,
    'and reads the CREATION point as the price in force then — which is the whole reason to log it');
  assert.equal(s.ingPriceAt('U2abc', t0 - 1), null, 'before the first observation there is honestly nothing');
});

test('every point that lands in memory is also flushed — none is stranded', async () => {
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: 0.013 });
  s.setProduct('P0004', { cost_per_base_unit: 0.014 });
  s.setProduct('P0277', { cost_per_base_unit: 0.6 });
  await settle();
  assert.equal(s.pushedPoints.length, 3, 'three points, three server inserts');
  assert.deepEqual(s.pending(), [], 'the pending queue is empty — nothing waiting on a later flush');
  assert.deepEqual(s.pushedPoints.map((p) => p.v), [0.013, 0.014, 0.6]);
});

/* --------------------------------------------------------------------------
 * [7] logIngPrice's OWN guard, driven directly (180).
 *
 * CLAUDE.md: "Its condition is the PREVIOUS STORED price, not the last logged point — two separate
 * guards, deliberately not merged." Everything above drives the FIRST guard, through setProduct.
 * The second one is unreachable that way: setProduct short-circuits before calling logIngPrice
 * whenever the stored price has not moved, so the dedupe inside logIngPrice never runs in those
 * tests. The mutation gate proved it — flipping `return false` to `return true` there, and `!=` to
 * `==`, changed nothing any assertion in this file could see.
 *
 * The RETURN VALUE is the thing to assert, not just the array: setProduct spends it
 * (`… && logIngPrice(id, now)) saveIngLog()`), so a wrong `true` strands a point by flushing the log
 * when nothing was added, and a wrong `false` leaves a real point unflushed — the v91 failure.
 * ------------------------------------------------------------------------ */

test('[7] a blank field is refused and returns false — isFinite(\'\') is TRUE, so the type check is the guard', () => {
  const s = sandbox(SEEDED);
  assert.strictEqual(s.logIngPrice('P0004', ''), false, 'refused, and it must SAY so — the caller flushes on true');
  assert.strictEqual(s.logIngPrice('P0004', null), false);
  assert.strictEqual(s.logIngPrice('P0004', undefined), false);
  assert.strictEqual(s.logIngPrice('P0004', '12.20'), false, 'a numeric STRING is still not a number');
  assert.strictEqual(s.logIngPrice(null, 0.0122), false, 'and a missing product id is refused too');
  assert.deepEqual(s.points('P0004'), [], 'nothing was fabricated at $0.00');
});

test('[7] zero is a legitimate price and IS logged — the guard is on the type, not on truthiness', () => {
  const s = sandbox(SEEDED);
  assert.strictEqual(s.logIngPrice('P0277', 0), true);
  assert.deepEqual(s.points('P0277').map((p) => p.v), [0], 'P0277 really does cost 0');
});

test('[7] the same observation twice adds ONE point, and the second call returns false', () => {
  const s = sandbox(SEEDED);
  assert.strictEqual(s.logIngPrice('P0004', 0.0122), true, 'first observation lands');
  assert.strictEqual(s.logIngPrice('P0004', 0.0122), false, 'the repeat is not a new observation');
  assert.equal(s.points('P0004').length, 1, 'and no second point was written');
  assert.strictEqual(s.logIngPrice('P0004', 0.0130), true, 'a real move still lands');
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0122, 0.0130]);
});

/* --------------------------------------------------------------------------
 * [8] THE GATE (224). A price point is written only if the write that CARRIES it succeeded.
 *
 * THE DEFECT. `setProducts` fired `dbPushIngredients` and then, without awaiting it, logged the
 * point and flushed it. Café phone, one bar, invoice import: the product upsert times out, the
 * smaller history insert lands. pushWrite honestly toasts the product failure — and the next boot
 * reads back a point for a price the server never stored. `ingPriceBand` (the builder's recent
 * range and the Menu cost band), `ingLastMovePct` (the Ingredients drift chip) and `ingPriceAt`
 * (the Dashboard's "N pts higher than at June prices") then all describe a movement that did not
 * happen. `logChangeIfSaved` applies exactly this discipline to the change log; the price log did
 * not.
 *
 * These drive the REAL setProducts with the REAL refusal shapes, and look at what is left in
 * memory and what reached the server — never at whether a guard was called.
 * ------------------------------------------------------------------------ */

test('[8] a REFUSED product write pushes no price point', async () => {
  const s = sandbox(SEEDED);
  s.fail('error');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  await settle();
  assert.equal(s.pushedProducts.length, 1, 'the product write was attempted — this is a refusal, not a skip');
  assert.deepEqual(s.pushedPoints, [], 'and NOTHING reached ing_price_history');
  assert.deepEqual(s.pending(), [], 'nor is it waiting to be flushed by the next caller');
});

test('[8] a REJECTED product write pushes no price point either — the uncommon settle path', async () => {
  /* CLAUDE.md roster 184(a): a promise has two settle paths and a test that only takes the common one
     has pinned half a contract. supabase-js resolves with {error} rather than rejecting and pushWrite
     catches on top of that, so today only the resolved arm fires in the app — which is exactly why
     deleting the rejection arm would leave every assertion above green while a single future helper
     that rejects strands a phantom point in memory forever. The caller's own await rejects (setProducts
     returns the product write verbatim, unchanged by this batch); the LOG must still be rolled back. */
  const s = sandbox(SEEDED);
  s.fail('throw');
  await assert.rejects(() => s.setProduct('P0004', { cost_per_base_unit: 0.0130 }), /network/);
  await settle();
  assert.deepEqual(s.pushedPoints, [], 'a rejection is a refusal too');
  assert.deepEqual(s.pending(), [], 'nothing stranded for a later caller to flush');
  assert.equal(s.logged('P0004'), false, 'and the memory point went with it');
  assert.equal(s.confirmedPrice('P0004'), 0.0122, 'the baseline records what the server still holds');
});

test('[8] the MEMORY point is rolled back too — the drift chip must not show a refused movement', async () => {
  /* Gating the queue alone would leave the session claiming a move that did not happen:
     ingLastMovePct and ingPriceBand read ingPriceLog, not the table. Driven through the real
     ingLastMovePct rather than by counting array entries, because the chip is the thing that lies. */
  const s = sandbox(SEEDED);
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });   // a real, saved move
  await settle();
  assert.equal(s.points('P0004').length, 1);

  s.fail('error');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0260 });   // +100%, refused
  await settle();
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0130], 'the refused point is gone from memory');
  assert.equal(s.ingLastMovePct('P0004'), null, 'and the drift chip reports no movement at all');
});

test('[8] a product whose ONLY point was refused is indistinguishable from one never logged', async () => {
  const s = sandbox(SEEDED);
  s.fail('error');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  await settle();
  assert.equal(s.logged('P0004'), false, 'not an empty array left behind — no series at all');
  assert.equal(s.ingPriceAt('P0004', Date.now()), null, 'so ingPriceAt honestly has nothing to say');
});

test('[8] a REFUSED write does not roll back a point some OTHER product legitimately logged', async () => {
  // The batch is drained synchronously, so one call's verdict can only ever reach its own points.
  const s = sandbox(SEEDED);
  await s.setProduct('P0277', { cost_per_base_unit: 0.6 });
  await settle();
  s.fail('error');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  await settle();
  assert.deepEqual(s.points('P0277').map((p) => p.v), [0.6], 'the saved product keeps its point');
  assert.deepEqual(s.pushedPoints.map((p) => p.pid), ['P0277'], 'and only it ever reached the server');
});

test('[8] THE RETRY. Re-saving the refused price still logs it — the guard reads the CONFIRMED price', async () => {
  /* THE HOLE THE GATE OPENS IF `_unconfirmedPrice` IS NOT THERE, and it is the INVISIBLE one.
     setProducts asks "did the STORED price move" against productsById, which is patched
     OPTIMISTICALLY. After a refusal memory says 0.0130 while the server still says 0.0122, so the
     obvious retry (the same 0.0130) compares equal, skips the log — and lands a stored price with
     NO point behind it. A fabricated point at least asserts something checkable; a missing one
     looks exactly like a price that never moved. */
  const s = sandbox(SEEDED);
  s.fail('error');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  await settle();
  assert.deepEqual(s.pushedPoints, [], 'precondition: the first attempt logged nothing');
  assert.equal(s.confirmedPrice('P0004'), 0.0122, 'and the server is known to still hold the old price');

  s.fail('ok');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });   // the user presses save again
  await settle();
  assert.deepEqual(s.pushedPoints.map((p) => p.v), [0.0130], 'the retry logs the point it now really stored');
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0130]);
  assert.equal(s.confirmedPrice('P0004'), 0.0130, 'and the baseline is back to reading memory');
});

test('[8] a CONFIRMED write clears the baseline even when its own patch carried no price', async () => {
  /* dbPushIngredients upserts the WHOLE row through ingredientToRow, not the patch — so an invoice
     pack teach landing after that product's price write was refused stores the optimistic price
     anyway. Clearing only the priced ids would leave a baseline naming a figure the server no
     longer holds, and the NEXT real move would then be measured against it. */
  const s = sandbox(SEEDED);
  s.fail('error');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  await settle();
  assert.equal(s.confirmedPrice('P0004'), 0.0122);

  s.fail('ok');
  await s.setProduct('P0004', { pack_qty: 105, pack_unit: 'ea' });   // no price in the patch at all
  await settle();
  assert.equal(s.confirmedPrice('P0004'), 0.0130,
    'the row that landed carried the optimistic price, so that price is now confirmed');
  assert.deepEqual(s.pushedPoints, [], 'and a pack teach still fabricates no point');
});

test('[8] two refusals OVERLAPPING keep the OLDEST baseline — the server never moved', async () => {
  /* Both are held before either settles, so B is ISSUED while A is still in flight and reads the
     OPTIMISTIC 0.0130 as its own starting point. That is what makes the two candidate baselines
     different figures and the test able to tell them apart: a version that lets the later refusal
     win records 0.0130, a price the server refused twice and never held. Settling them in order
     first would make B read 0.0122 from A's own record and the assertion could not fail. */
  const s = sandbox(SEEDED);
  s.fail('hold');
  s.setProduct('P0004', { cost_per_base_unit: 0.0130 });        // A
  s.setProduct('P0004', { cost_per_base_unit: 0.0140 });        // B, issued before A has an answer
  s.release(0, false);
  s.release(1, false);
  await settle();
  assert.equal(s.confirmedPrice('P0004'), 0.0122,
    'not 0.0130 — that was A’s optimistic value, which the server refused');

  s.fail('ok');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0140 });
  await settle();
  assert.deepEqual(s.pushedPoints.map((p) => p.v), [0.0140], 'one point, for the price that landed');
});

test('[8] the SAME product patched twice in ONE refused call keeps the FIRST baseline', async () => {
  /* The second entry's `had` is read AFTER the first has patched memory, so it is already an
     optimistic figure. Only the first names what the server holds. */
  const s = sandbox(SEEDED);
  s.fail('error');
  await s.setProducts([
    { id: 'P0004', patch: { cost_per_base_unit: 0.0130 } },
    { id: 'P0004', patch: { cost_per_base_unit: 0.0140 } },
  ]);
  await settle();
  assert.equal(s.confirmedPrice('P0004'), 0.0122, 'not 0.0130, which was never stored either');
});

test('[8] a result carrying no manifest confirms NOTHING, and does not throw', async () => {
  /* writeSaved's whole contract. dbPushIngredients attaches a manifest on every exit it has, so a
     result without one never reached it — the rejection arm — and that is not evidence of a save.
     Asserted directly because the sandbox stubs all carry a manifest, so nothing else can reach it. */
  const s = sandbox(SEEDED);
  assert.deepEqual(s.writeSaved({ data: [], error: null }), [], 'a clean result with no manifest confirms nothing');
  assert.deepEqual(s.writeSaved(null), [], 'and neither does no result at all');
  assert.deepEqual(s.writeSaved({ saved: ['P0004'] }), ['P0004'], 'a manifest is passed through as itself');
  assert.deepEqual(s.writeSaved({ saved: 'P0004' }), [], 'a non-array is not a manifest');
});

test('[8] the happy path is UNCHANGED: the memory point is there synchronously', async () => {
  /* The gate must not cost the ordinary case. logIngPrice still runs before anything is awaited, so
     a render that follows a save in the same tick — the invoice apply's renderIngredients — sees the
     new point. Only the SERVER push waits. */
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0130], 'in memory immediately, no await');
  assert.deepEqual(s.pushedPoints, [], 'and not yet on the server');
  await settle();
  assert.deepEqual(s.pushedPoints.map((p) => p.v), [0.0130], 'which it reaches once the write lands');
});

test('[8] setProducts still resolves to the PRODUCT write result, not to the flush', async () => {
  // Callers await this to know whether the products saved — catImportApply reads res.error to decide
  // whether to claim a count. Gating the log must not change what they are told.
  const ok = sandbox(SEEDED);
  const r1 = await ok.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  assert.equal(r1.error, null, 'a landed write resolves clean');

  const bad = sandbox(SEEDED);
  bad.fail('error');
  const r2 = await bad.setProduct('P0004', { cost_per_base_unit: 0.0130 });
  assert.ok(r2 && r2.error, 'and a refused one still surfaces the error to its caller');
});

test('[8] a refusal removes ITS OWN point, not whichever point happens to be last', async () => {
  /* WHY THE ROLLBACK MATCHES THE (t, v) PAIR AND NOT JUST ONE OF THEM. A write held in flight while
     later saves for the same product land is not exotic — it is a phone on one bar, which is the
     whole setting of this defect. Three points, the first one refused, and the THIRD deliberately
     repeats the first's value: matching on the value alone (or on the timestamp alone) removes the
     newest match and deletes a point that really was stored, leaving a series in the wrong order
     with the right length. Only the pair identifies the point that was actually rolled back.
     The waits are real: `t` is Date.now(), so three writes in one tick share a timestamp. */
  const tick = () => new Promise((r) => setTimeout(r, 2));
  const s = sandbox(SEEDED);

  s.fail('hold');
  s.setProduct('P0004', { cost_per_base_unit: 0.0130 });        // A — in flight, verdict unknown
  await tick();

  s.fail('ok');
  await s.setProduct('P0004', { cost_per_base_unit: 0.0140 });  // B — lands
  await tick();
  await s.setProduct('P0004', { cost_per_base_unit: 0.0130 });  // C — lands, back to A's value
  await settle();
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0130, 0.0140, 0.0130], 'precondition: three points');

  s.release(0, false);                                          // A is refused, long after the fact
  await settle();
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0140, 0.0130],
    'A’s point is gone and C’s — same value, different moment — is untouched');
  assert.deepEqual(s.pushedPoints.map((p) => p.v), [0.0140, 0.0130], 'and only B and C ever reached the server');
  /* AND THE BASELINE MUST NOT MOVE, which this test did not check when it was written and which the
     pre-push review reproduced as a live defect. A's refusal arrives after B and C have both landed,
     so it knows nothing they have not already superseded: the server holds C's price. Recording A's
     `had` here would name a figure two confirmed writes ago, and every later "did the price move"
     question for this product would be asked against it. */
  assert.equal(s.confirmedPrice('P0004'), 0.0130,
    'the server holds C’s price, not the value A was refused from');
});

test('[8] a PARTIAL write keeps the points for the products that landed', async () => {
  /* FOUND BY THE PRE-PUSH REVIEW AND REPRODUCED: the first cut of this gate read the write's single
     ERROR, and dbPushIngredients chunks at 200 and stops at the first failing chunk — so a refusal
     means the chunks before it LANDED. On Scoopy's ~400-product catalogue import that is three
     chunks, and condemning the whole call deleted 200 products' real price history for prices the
     server had genuinely stored, while telling the user "nothing is lost". Worse than the defect
     this batch set out to fix, because a missing point is invisible and a phantom one is not. */
  const s = sandbox(SEEDED);
  s.fail('error', ['P0004']);                                   // P0004's chunk landed; P0277's did not
  await s.setProducts([
    { id: 'P0004', patch: { cost_per_base_unit: 0.0130 } },
    { id: 'P0277', patch: { cost_per_base_unit: 0.6 } },
  ]);
  await settle();
  assert.deepEqual(s.pushedPoints.map((p) => p.pid), ['P0004'], 'the landed product keeps its point');
  assert.deepEqual(s.points('P0004').map((p) => p.v), [0.0130], 'in memory too');
  assert.equal(s.logged('P0277'), false, 'and the refused one has no series at all');
  assert.equal(s.confirmedPrice('P0004'), 0.0130, 'the landed price is confirmed');
  assert.equal(s.confirmedPrice('P0277'), 0.5, 'and only the refused one keeps a baseline');
});
