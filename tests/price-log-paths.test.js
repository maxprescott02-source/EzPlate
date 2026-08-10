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
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* A sandbox holding the real price-log chain. Everything the chain touches that is NOT under test is
   stubbed at its own boundary: saveProductCache/rebuild are no-ops (v108 left the first one empty
   anyway), dbPushIngredient records the product push, dbPushIngPrice records the history push. The
   pushes matter as much as the array: a point that lands in memory and never flushes is precisely the
   v91 failure, and only the push list shows it. */
function sandbox(seed) {
  const pushedProducts = [];
  const pushedPoints = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('SEED', 'PUSHED_P', 'PUSHED_H', `
    "use strict";
    var productsById = JSON.parse(JSON.stringify(SEED || {}));
    var ingPriceLog = {};
    var _ingLogPending = [];
    function saveProductCache(){}
    function rebuild(){}
    function dbPushIngredient(id){ PUSHED_P.push(id); }
    function dbPushIngPrice(pid, t, v){ PUSHED_H.push({pid:pid, t:t, v:v}); }
    ${extractFn(SRC, 'setProduct')}
    ${extractFn(SRC, 'samePrice')}
    ${extractFn(SRC, 'logIngPrice')}
    ${extractFn(SRC, 'saveIngLog')}
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'ingPriceAt')}
    ${extractFn(SRC, 'newProductRecord')}
    ${extractFn(SRC, 'invUnitToBase')}
    ${extractFn(SRC, 'unitToBaseFields')}
    ${extractFn(SRC, 'packToUnitCost')}
    return {
      setProduct: setProduct,
      newProductRecord: newProductRecord,
      invUnitToBase: invUnitToBase,
      unitToBaseFields: unitToBaseFields,
      packToUnitCost: packToUnitCost,
      ingPriceAt: ingPriceAt,
      points: function(pid){ return (ingPriceLog[pid] || []).slice(); },
      product: function(pid){ return productsById[pid]; },
      pending: function(){ return _ingLogPending.slice(); }
    };
  `);
  const api = factory(seed, pushedProducts, pushedPoints);
  api.pushedProducts = pushedProducts;
  api.pushedPoints = pushedPoints;
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

test('PATH 1 (builder hand-edit, commitPrice): a changed price writes exactly one point', () => {
  const s = sandbox(SEEDED);
  const base = 15.5 / 1000;                                    // commitPrice: $/kg entered -> $/g stored
  s.setProduct('P0004', { cost_per_base_unit: base });
  const pts = s.points('P0004');
  assert.equal(pts.length, 1, 'one point, not zero and not two');
  assert.equal(pts[0].v, base, 'at the committed price in base units');
  assert.equal(s.pushedPoints.length, 1, 'and it was flushed to the server, not stranded in memory');
  assert.equal(s.pushedPoints[0].pid, 'P0004');
});

test('PATH 2 (invoice confirm, matched line): a changed price writes exactly one point', () => {
  const s = sandbox(SEEDED);
  const ub = s.unitToBaseFields('kg');
  const newC = 18.4 / ub.div;
  s.setProduct('P0004', { cost_per_base_unit: newC, base_unit: ub.base_unit, cost_basis: ub.cost_basis });
  const pts = s.points('P0004');
  assert.equal(pts.length, 1);
  assert.equal(pts[0].v, newC);
  assert.equal(s.pushedPoints.length, 1);
});

test('PATH 3 (Products tab EDIT form, saveIngEdit): the reported defect — a changed price writes one point', () => {
  const s = sandbox(SEEDED);
  const ub = s.invUnitToBase('kg');                            // saveIngEdit derives the unit from the stored product
  const price = 14.0;
  s.setProduct('P0004', { description: 'Chips 10mm', brand: null, category: 'Frozen', supplier: null,
                          base_unit: ub.base_unit, cost_basis: ub.cost_basis, cost_per_base_unit: price / ub.div,
                          pack_qty: null, pack_unit: null });
  const pts = s.points('P0004');
  assert.equal(pts.length, 1, 'the Products tab logged nothing at all before v109');
  assert.equal(pts[0].v, price / ub.div);
  assert.equal(s.pushedPoints.length, 1);
});

test('PATH 4 (Products tab CREATE form, submitNew): a new product records its first price', () => {
  const s = sandbox(SEEDED);
  const calc = s.packToUnitCost('2', 'kg', '9.00');            // the create form's own calculator
  const rec = s.newProductRecord({ id: 'U1abc', desc: 'Barramundi', brand: 'Ocean', supplier: 'Bidfood',
    category: 'Seafood', base_unit: calc.base_unit, cost_per_base_unit: calc.cost_per_base_unit,
    cost_basis: calc.cost_basis, isFood: true, packSize: '2', packUnit: 'kg', packPrice: '9.00' });
  s.setProduct('U1abc', rec);
  const pts = s.points('U1abc');
  assert.equal(pts.length, 1, 'a first observation, not nothing — ingPriceAt returns null before it');
  assert.equal(pts[0].v, calc.cost_per_base_unit);
  assert.equal(s.pushedPoints.length, 1);
});

test('PATH 5 (invoice confirm, ADD-NEW line): a new product records its first price', () => {
  const s = sandbox(SEEDED);
  const ub = s.invUnitToBase('kg');
  const cpbu = 22.5 / ub.div;                                  // collectNewItem: price / ub.div
  s.setProduct('CXzz1', { id: 'CXzz1', description: 'Squid tubes', brand: null, category: 'Seafood',
    sub_category: null, item_type: null, search_aliases: [], base_unit: ub.base_unit,
    cost_per_base_unit: cpbu, cost_basis: ub.cost_basis, is_food: true, pack_size_raw: '1kg',
    sold_by: null, current_price_exgst: null, supplier: 'Bidfood' });
  const pts = s.points('CXzz1');
  assert.equal(pts.length, 1);
  assert.equal(pts[0].v, cpbu);
  assert.equal(s.pushedPoints.length, 1);
});

/* --------------------------------------------------------------------------
 * [2] No path writes a point when the price is unchanged.
 * ------------------------------------------------------------------------ */

test('saving the edit form without touching the price writes nothing', () => {
  const s = sandbox(SEEDED);
  const ub = s.invUnitToBase('kg');
  // a rename only: same price, re-derived exactly as saveIngEdit re-derives it
  s.setProduct('P0004', { description: 'Chips 10mm Straight Cut', category: 'Frozen',
                          base_unit: ub.base_unit, cost_basis: ub.cost_basis,
                          cost_per_base_unit: 12.2 / ub.div });
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

test('the invoice pack-teach write fabricates NO point — on a product whose log is EMPTY', () => {
  /* THE ONE THAT MATTERS MOST. applyInvoice teaches a pack with setProduct(id,{pack_qty,pack_unit}),
     which changes no price (pack fields feed invoice DERIVATION only; cost_per_base_unit is stored).
     If the "did it change" question were asked of the LAST LOGGED POINT instead of the previous
     stored price, this would sail past — nearly every product's log is empty (33 points across 412
     products), so there is no last point to be equal to, and a pack teach would have invented a
     price observation for a change that never happened. */
  const s = sandbox(SEEDED);
  assert.equal(s.points('P0004').length, 0, 'precondition: this product has no history at all');
  s.setProduct('P0004', { pack_qty: 105, pack_unit: 'ea' });
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

test('a price of 0 IS a price and writes a point', () => {
  const s = sandbox(SEEDED);                                   // P0277 currently 0.5
  s.setProduct('P0277', { cost_per_base_unit: 0 });
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

test('null writes no point', () => {
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: null });
  assert.equal(s.points('P0004').length, 0);
  assert.equal(s.pushedPoints.length, 0);
});

test("'' writes no point — isFinite('') is TRUE, which would have fabricated a $0.00 observation", () => {
  // The same trap rowToPoint was corrected for in v108: Number('') is 0, so an isFinite-only guard
  // admits a blank field as a real-looking free product.
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: '' });
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

test('every point that lands in memory is also flushed — none is stranded', () => {
  const s = sandbox(SEEDED);
  s.setProduct('P0004', { cost_per_base_unit: 0.013 });
  s.setProduct('P0004', { cost_per_base_unit: 0.014 });
  s.setProduct('P0277', { cost_per_base_unit: 0.6 });
  assert.equal(s.pushedPoints.length, 3, 'three points, three server inserts');
  assert.deepEqual(s.pending(), [], 'the pending queue is empty — nothing waiting on a later flush');
  assert.deepEqual(s.pushedPoints.map((p) => p.v), [0.013, 0.014, 0.6]);
});
