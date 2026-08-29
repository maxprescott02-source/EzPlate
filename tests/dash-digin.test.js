/*
 * dash-digin.test.js — v90. Two things the insight tests can't reach because they aren't pure:
 *
 *   1. digData — the four "Dig in" drill-downs. Every card must be sorted correctly and scoped
 *      correctly, and the two GLOBAL cards (movers, dearest per unit) must IGNORE the menu selector,
 *      because they rank products and a product belongs to no menu. Getting that backwards would
 *      silently answer a different question than the selector implies.
 *   2. The sell-price log helpers — value dedup, the price in force at a moment, and the
 *      priceHeldSince proof that gates the "its price hasn't moved" clause. That clause is the one
 *      place the engine makes a claim about the past, so its guard is worth pinning hard.
 *
 * Both are extracted from js/app.js and run against stubbed globals — the REAL shipped functions,
 * with no DOM and no Supabase.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const APP = loadApp();
/* ---------------------------------------------------------------- the fixture café
   Two menus. "Chips" is published to BOTH (one plate, two dishes) so the plate card's dedup is
   exercised. Prices are chosen so each card has an unambiguous order. */
const PLATES = [
  { id: 'p1', name: 'Barra & Chips', lines: [{ pid: 1, qty: 100 }] },   // cost 8.00
  { id: 'p2', name: 'Toastie',       lines: [{ pid: 2, qty: 100 }] },   // cost 2.00
  { id: 'p3', name: 'Steak',         lines: [{ pid: 3, qty: 100 }] },   // cost 12.00
  { id: 'p4', name: 'Chips',         lines: [{ pid: 4, qty: 100 }] },   // cost 1.00
];
const COST = { p1: 8, p2: 2, p3: 12, p4: 1 };
const MENU = [
  { id: 'd1', name: 'Barra & Chips', price: 20, menuId: 'M1', plateId: 'p1' },   // 40%
  { id: 'd2', name: 'Toastie',       price: 10, menuId: 'M1', plateId: 'p2' },   // 20%
  { id: 'd3', name: 'Steak',         price: 30, menuId: 'M2', plateId: 'p3' },   // 40%
  { id: 'd4', name: 'Chips (M1)',    price: 5,  menuId: 'M1', plateId: 'p4' },   // 20%
  { id: 'd5', name: 'Chips (M2)',    price: 4,  menuId: 'M2', plateId: 'p4' },   // 25%
];
const PRODUCTS = [
  { id: 1, description: 'Barramundi', brand: 'Ocean', base_unit: 'g',  cost_per_base_unit: 0.08 },
  { id: 2, description: 'Cheese',     brand: '',      base_unit: 'g',  cost_per_base_unit: 0.02 },
  { id: 3, description: 'Sirloin',    brand: '',      base_unit: 'g',  cost_per_base_unit: 0.12 },
  { id: 4, description: 'Potato',     brand: '',      base_unit: 'g',  cost_per_base_unit: 0.01 },
  { id: 5, description: 'Unused',     brand: '',      base_unit: 'g',  cost_per_base_unit: 9.99 },  // in no plate → excluded
];
const DAY = 86400000;
const ING_LOG = {
  1: [{ t: Date.now() - 30 * DAY, v: 0.05 }, { t: Date.now() - 2 * DAY, v: 0.08 }],   // +60%
  2: [{ t: Date.now() - 10 * DAY, v: 0.021 }, { t: Date.now() - 1 * DAY, v: 0.02 }],  // -4.8%
  3: [{ t: Date.now() - 5 * DAY, v: 0.1199 }, { t: Date.now() - 1 * DAY, v: 0.12 }],  // +0.08% → noise, excluded
};

function digHarness() {
  // eslint-disable-next-line no-new-func
  const factory = new Function('FIX', `
    "use strict";
    var DASH_ALL='all';
    var MENU=FIX.MENU, PRODUCTS=FIX.PRODUCTS, savedPlates=FIX.PLATES, ingPriceLog=FIX.ING_LOG;
    var byId={}; PRODUCTS.forEach(function(p){ byId[p.id]=p; });
    var kById={};
    var COST=FIX.COST;
    function plateForMenuItem(m){ for(var i=0;i<savedPlates.length;i++){ if(savedPlates[i].id===m.plateId) return savedPlates[i]; } return null; }
    function costFromLines(lines){ for(var k in COST){ if(savedPlates.filter(function(s){return s.id===k;})[0] && savedPlates.filter(function(s){return s.id===k;})[0].lines===lines) return COST[k]; } return 0; }
    /* 222: costDetail is the real walk now and costFromLines is its cost accessor. DERIVED from the
       stub above so the two cannot drift; this fixture looks costs up in a table and has no notion of
       a line it could not cost, so miss is 0 throughout. A plate that cannot be fully costed is
       covered where that is the subject: tests/plate-cost.test.js. */
    function costDetail(lines){ return {cost:costFromLines(lines), miss:0}; }
    function foodTarget(){ return 0.3; }
    function fmt2(x){ return '$'+Number(x).toFixed(2); }
    function cpbu(p){ return p.cost_per_base_unit; }
    function dashScopeLabel(scope){ return (scope===DASH_ALL)?'across all menus':('on '+scope); }
    function esc(s){ return String(s==null?'':s); }
    function emptyStateHtml(){ return '<div class="empty-state es-built">empty</div>'; }
    var ICON_MENU_BIG='';
    ${extractFn(APP, 'menuIdOf')}
    ${extractFn(APP, 'dishOnMenu')}
    ${extractFn(APP, 'analyze')}
    ${extractFn(APP, 'perDisplayValue')}
    ${extractFn(APP, 'dispPrice')}
    ${extractFn(APP, 'ptMs')}
    ${extractFn(APP, 'monthLabel')}
    /* v120: digData's movers rows gained a two-dimension sub-line (size of the move + how many
       plates carry it). Both helpers are extracted rather than stubbed so the real breadth count
       runs here — productRefs is the one that must check BOTH reference paths, and a stub would
       have hidden it if that ever collapsed to one. kitchenIngredients is empty in this fixture,
       so the count exercises the plate-line->pid path. */
    var kitchenIngredients=[];
    ${extractFn(APP, 'productRefs')}
    ${extractFn(APP, 'moverWhen')}
    ${extractFn(APP, 'digData')}
    ${extractFn(APP, 'digInHtml')}
    var DIG_CARDS=[
      {kind:'foodcost', label:'Highest food cost %',   scoped:true},
      {kind:'plate',    label:'Highest cost per plate', scoped:true},
      {kind:'movers',   label:'Biggest movers',        scoped:false},
      {kind:'stock',    label:'Dearest per unit',      scoped:false}
    ];
    var digOpen=null;
    ${extractFn(APP, 'digCardHtml')}
    return { digData:digData, digInHtml:digInHtml, digCardHtml:digCardHtml, setOpen:function(k){ digOpen=k; } };
  `);
  return factory({ MENU, PRODUCTS, PLATES, ING_LOG, COST });
}

const H = digHarness();
const names = (rows) => rows.map((r) => r.name);

/* ---------------------------------------------------------------- sorting */

test('foodcost: sorted by food cost %, highest first, across all menus', () => {
  const d = H.digData('foodcost', 'all');
  assert.deepEqual(names(d.rows), ['Barra & Chips', 'Steak', 'Chips (M2)', 'Chips (M1)', 'Toastie']);
  assert.equal(d.rows[0].disp, '40.0%');
});

test('foodcost: every row carries its margin light so a long list stays scannable', () => {
  const d = H.digData('foodcost', 'all');
  d.rows.forEach((r) => assert.ok(['green', 'amber', 'red'].indexOf(r.light) >= 0, r.name + ' has no light'));
  assert.equal(d.rows[0].light, 'red', '40% against a 30% target is a rework');
  assert.equal(d.rows[d.rows.length - 1].light, 'green', '20% is healthy');
});

test('plate: sorted by cost per plate, highest first, and DEDUPED — one plate on two menus is one row', () => {
  const d = H.digData('plate', 'all');
  assert.deepEqual(names(d.rows), ['Steak', 'Barra & Chips', 'Toastie', 'Chips']);
  assert.equal(d.rows.filter((r) => r.name === 'Chips').length, 1, 'Chips is published twice but is ONE plate');
  assert.equal(d.rows[0].disp, '$12.00');
});

test('movers: sorted by the SIZE of the move, direction preserved, sub-1% noise dropped', () => {
  const d = H.digData('movers', 'all');
  assert.deepEqual(names(d.rows), ['Barramundi — Ocean', 'Cheese']);
  assert.equal(d.rows[0].dir, 'up');
  assert.match(d.rows[0].disp, /^\+60\.0%$/);
  assert.equal(d.rows[1].dir, 'down');
  assert.equal(names(d.rows).indexOf('Sirloin'), -1, 'a 0.08% move is rounding noise, not a mover');
});

test('stock: dearest per unit first, and only products actually used in a plate', () => {
  const d = H.digData('stock', 'all');
  assert.deepEqual(names(d.rows), ['Sirloin', 'Barramundi — Ocean', 'Cheese', 'Potato']);
  assert.equal(names(d.rows).indexOf('Unused'), -1, 'a product in no plate is not "your" stock');
  assert.equal(d.rows[0].disp, '$120.00/kg');
});

/* ---------------------------------------------------------------- scoping */

test('SCOPED cards narrow to the selected menu', () => {
  assert.deepEqual(names(H.digData('foodcost', 'M1').rows), ['Barra & Chips', 'Chips (M1)', 'Toastie']);
  assert.deepEqual(names(H.digData('foodcost', 'M2').rows), ['Steak', 'Chips (M2)']);
  assert.deepEqual(names(H.digData('plate', 'M2').rows), ['Steak', 'Chips']);
});

test('GLOBAL cards IGNORE the selector — they rank products, which belong to no menu', () => {
  const allMovers = names(H.digData('movers', 'all').rows);
  const allStock = names(H.digData('stock', 'all').rows);
  assert.deepEqual(names(H.digData('movers', 'M1').rows), allMovers);
  assert.deepEqual(names(H.digData('movers', 'M2').rows), allMovers);
  assert.deepEqual(names(H.digData('stock', 'M1').rows), allStock);
  assert.deepEqual(names(H.digData('stock', 'M2').rows), allStock);
});

test('every card states the BASIS of its ranking, and the global ones say they are not menu-scoped', () => {
  assert.equal(H.digData('foodcost', 'M1').title, 'Highest food cost %');
  assert.equal(H.digData('plate', 'M1').title, 'Highest cost per plate');
  assert.equal(H.digData('foodcost', 'M1').sub, 'on M1', 'a scoped card names its scope');
  assert.match(H.digData('stock', 'M1').sub, /all products/, 'a global card says so even when a menu is selected');
  assert.match(H.digData('movers', 'M1').sub, /price changes since|all products/);
});

test('Rule C: no card label or subtitle implies sales volume or profit', () => {
  ['foodcost', 'plate', 'movers', 'stock'].forEach((k) => {
    const d = H.digData(k, 'all');
    assert.doesNotMatch(d.title + ' ' + d.sub, /profit|revenue|sales|earn|money|lost/i);
  });
});

/* ---------------------------------------------------------------- rendering */

test('the grid renders four cards, each with its top item; the detail view renders every row', () => {
  H.setOpen(null);
  const grid = H.digInHtml('all');
  assert.equal((grid.match(/class="dig-card"/g) || []).length, 4);
  assert.match(grid, /Highest food cost %/);
  assert.match(grid, /Dearest per unit/);
  assert.equal(grid.indexOf('dig-list'), -1, 'the grid shows no list');

  H.setOpen('foodcost');
  const detail = H.digInHtml('all');
  assert.equal((detail.match(/class="dig-row"/g) || []).length, 5, 'EVERY item, not a top-N');
  assert.match(detail, /id="digBack"/, 'a back arrow returns to the grid');
  assert.match(detail, /detail-open/);
  assert.equal(detail.indexOf('dig-card'), -1, 'the detail view replaces the grid, it does not stack on it');
  H.setOpen(null);
});

test('an empty drill-down routes through the SHARED empty-state helper — no bespoke markup', () => {
  const empty = digHarness();
  empty.setOpen('foodcost');
  // a scope with no dishes at all
  const html = empty.digInHtml('MISSING');
  assert.match(html, /es-built/, 'must carry the shared helper marker class');
  assert.equal(html.indexOf('dig-row'), -1);
});

/* ---------------------------------------------------------------- the sell-price log */

function logHarness(seed) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('SEED', `
    "use strict";
    var menuPriceLog=SEED;
    function saveMenuPriceLog(){}
    ${extractFn(APP, 'ptMs')}
    ${extractFn(APP, 'logMenuPrice')}
    ${extractFn(APP, 'priceAtOrBefore')}
    ${extractFn(APP, 'priceHeldSince')}
    return { log:menuPriceLog, logMenuPrice:logMenuPrice, priceAtOrBefore:priceAtOrBefore, priceHeldSince:priceHeldSince };
  `);
  return factory(seed);
}

test('logMenuPrice: dedupes on VALUE, not on time — every change is a point, a repeat is not', () => {
  const h = logHarness({});
  assert.equal(h.logMenuPrice('d1', 20), true);
  assert.equal(h.logMenuPrice('d1', 20), false, 'the same price to the cent adds nothing');
  assert.equal(h.logMenuPrice('d1', 20.004), false, 'sub-cent noise is the same price');
  assert.equal(h.logMenuPrice('d1', 21), true, 'a real change is always recorded, however soon after');
  assert.equal(h.log.d1.length, 2);
});

test('logMenuPrice: ignores a missing id or a non-positive price rather than logging a zero', () => {
  const h = logHarness({});
  assert.equal(h.logMenuPrice(null, 20), false);
  assert.equal(h.logMenuPrice('d1', 0), false);
  assert.equal(h.logMenuPrice('d1', -5), false);
  assert.deepEqual(h.log, {});
});

const T = (days) => Date.now() - days * DAY;

test('priceAtOrBefore: the price in force at a moment, null when the log does not reach back', () => {
  const h = logHarness({ d1: [{ t: T(90), v: 18 }, { t: T(30), v: 20 }] });
  assert.equal(h.priceAtOrBefore('d1', T(60)), 18);
  assert.equal(h.priceAtOrBefore('d1', T(10)), 20);
  assert.equal(h.priceAtOrBefore('d1', T(120)), null, 'before the log starts, we cannot know');
  assert.equal(h.priceAtOrBefore('nope', T(10)), null);
});

/* ---------------------------------------------------------------- reading the past honestly
   Found in the browser, not by a unit test: a plate built entirely from fixed MISC cost lines
   reconstructs perfectly at every moment in the past, because its cost is a constant. That made
   costAtLines report complete=true with no logged history behind it at all, and the long-standing
   family read a 12-month "over target through every cost change" run out of a plate whose cost had
   never been observed changing. `priced` is the guard: reconstruction is only meaningful when at
   least one line actually came from the price log. */

function costHarness() {
  /* 0c: lineProduct is EXTRACTED now, and kById/byId are real. It used to be a two-line stub
     (`l.pid != null ? {id:l.pid} : null`) which could not represent a kitchen-ingredient line at
     all — so every `l.kid` branch in costAtLines was unreachable from this file, and two mutants
     lived there undisturbed. A stub that cannot express one of the two line shapes the app stores
     is not a simplification, it is a hole shaped like the thing it replaced.
     NEW plate lines are `{kid, qty}`; legacy `{pid, qty}` and `{misc,...}` lines are live data that
     every reader still has to resolve, so all three shapes belong in this fixture. */
  // eslint-disable-next-line no-new-func
  const factory = new Function('LOG', 'FIX', `
    "use strict";
    var ingPriceLog=LOG;
    var byId={}; FIX.PRODUCTS.forEach(function(p){ byId[p.id]=p; });
    var kById={ k1:{ id:'k1', name:'Barramundi fillet', pid:1 },
                kDangling:{ id:'kDangling', name:'Points at a deleted product', pid:999 } };
    ${extractFn(APP, 'lineProduct')}
    ${extractFn(APP, 'ptMs')}
    ${extractFn(APP, 'ingPriceAt')}
    ${extractFn(APP, 'costAtLines')}
    return { costAtLines:costAtLines, ingPriceAt:ingPriceAt, lineProduct:lineProduct };
  `);
  return factory(ING_LOG, { PRODUCTS });
}

test('costAtLines: a MISC-only plate reconstructs but is never treated as observed history', () => {
  const h = costHarness();
  const r = h.costAtLines([{ misc: true, name: 'x', cost: 6 }], Date.now() - 200 * DAY);
  assert.equal(r.cost, 6, 'the arithmetic still works — a misc line is a fixed cost');
  assert.equal(r.complete, true);
  assert.equal(r.priced, 0, 'but NOTHING came from the price log, so callers must skip it');
});

test('costAtLines: a real ingredient line counts as priced when the log reaches back', () => {
  const h = costHarness();
  const r = h.costAtLines([{ pid: 1, qty: 100 }], Date.now() - 20 * DAY);
  assert.equal(r.complete, true);
  assert.equal(r.priced, 1);
  assert.equal(Math.round(r.cost * 100) / 100, 5, 'priced at the 0.05 in force 20 days ago, not today’s 0.08');
});

test('costAtLines: incomplete when a line’s log does not reach back that far — never mix eras', () => {
  const h = costHarness();
  const r = h.costAtLines([{ pid: 1, qty: 100 }], Date.now() - 400 * DAY);
  assert.equal(r.complete, false, 'before the log starts we cannot price this plate at all');
  const mixed = h.costAtLines([{ pid: 1, qty: 100 }, { pid: 99, qty: 10 }], Date.now() - 20 * DAY);
  assert.equal(mixed.complete, false, 'one unknown line invalidates the whole reconstruction');
});

test('0c: a line naming NO product makes the reconstruction incomplete', () => {
  /* `if(!p){ complete=false; return; }` with the literal flipped to `true`. The case above looks
     like it covers this and does not: `{pid:99}` resolves to a product-shaped thing and then fails
     at the price lookup, which is a DIFFERENT branch setting the same flag. This is the line that
     has no product at all — a plate line whose product was deleted.
     It matters because `complete` is what stops the long-standing family reading a 12-month run out
     of a plate it cannot actually price. A stuck `true` does not lose data; it invents history. */
  const h = costHarness();
  assert.equal(h.lineProduct({ qty: 10 }), null, 'sanity: this line really does resolve to nothing');
  const r = h.costAtLines([{ qty: 10 }], Date.now() - 20 * DAY);
  assert.equal(r.complete, false, 'a line we cannot identify means we cannot price the plate');
  assert.equal(r.priced, 0);
  assert.equal(r.cost, 0);
});

test('0c: a kitchen-ingredient line resolves through kById, and a DANGLING one does not throw', () => {
  /* `l.kid ? (kById[l.kid] && kById[l.kid].pid) : l.pid` with the `&&` flipped to `||`, which reads
     the property off `undefined` and throws — turning a costable dashboard into a blank one.
     The `&&` is a guard, not a shortcut, and nothing here could reach it while the harness had no
     kitchen ingredients. Both directions are asserted: a healthy kid line must PRICE (or the guard
     could be satisfied by never taking the branch), and a kid pointing at a product that no longer
     exists must come back incomplete rather than blowing up. */
  const h = costHarness();
  const ok = h.costAtLines([{ kid: 'k1', qty: 100 }], Date.now() - 20 * DAY);
  assert.equal(ok.complete, true, 'a kid line is a real line — it must price like any other');
  assert.equal(ok.priced, 1);
  assert.equal(Math.round(ok.cost * 100) / 100, 5, 'the same 0.05 the pid form gets, through the kid');

  const dangling = h.costAtLines([{ kid: 'kDangling', qty: 100 }], Date.now() - 20 * DAY);
  assert.equal(dangling.complete, false, 'an ingredient pointing at a deleted product cannot be priced');
  assert.equal(dangling.priced, 0);

  const missingKid = h.costAtLines([{ kid: 'kNope', qty: 100 }], Date.now() - 20 * DAY);
  assert.equal(missingKid.complete, false, 'and neither can one whose ingredient is gone entirely');
});

/* ---------------------------------------------------------------- the named culprit
   movementCulprit produces the two numbers in "Beef, up 18% across 5 plates" — the family the whole
   brief leads with. The money law makes both worth pinning, and `plates` in particular: it counts
   PLATES, not LINES, so an ingredient used twice on one plate is still one plate. */

function culpritHarness() {
  // eslint-disable-next-line no-new-func
  const factory = new Function('LOG', 'BYID', `
    "use strict";
    var ingPriceLog=LOG, byId=BYID, kById={};
    function lineProduct(l){ return (l && l.pid!=null) ? byId[l.pid] : null; }
    function cpbu(p){ return p.cost_per_base_unit; }
    ${extractFn(APP, 'ptMs')}
    ${extractFn(APP, 'ingPriceAt')}
    ${extractFn(APP, 'movementCulprit')}
    return movementCulprit;
  `);
  const byId = {}; PRODUCTS.forEach((p) => { byId[p.id] = p; });
  return factory(ING_LOG, byId);
}

// two plates, both containing product 1 (0.05 → 0.08 over the window)
const okPair = () => ([
  { d: { m: { id: 'd1' }, sp: { lines: [{ pid: 1, qty: 100 }] }, cost: 8, price: 20 }, then: 5 },
  { d: { m: { id: 'd2' }, sp: { lines: [{ pid: 1, qty: 100 }] }, cost: 8, price: 20 }, then: 5 },
]);

test('movementCulprit: names the ingredient that moved the average furthest', () => {
  const top = culpritHarness()(okPair(), Date.now() - 20 * DAY);
  assert.equal(top.name, 'Barramundi');
  assert.equal(top.was, 0.05);
  assert.equal(top.now, 0.08);
  assert.equal(top.plates, 2);
});

test('movementCulprit: "across N plates" counts PLATES, not lines', () => {
  const twoLines = [
    { d: { m: { id: 'd1' }, sp: { lines: [{ pid: 1, qty: 60 }, { pid: 1, qty: 40 }] }, cost: 8, price: 20 }, then: 5 },
  ];
  const top = culpritHarness()(twoLines, Date.now() - 20 * DAY);
  assert.equal(top.plates, 1, 'one ingredient on two lines of ONE plate is still one plate');
  // both lines still contribute cost: 100g total, same as the single-line case
  const single = culpritHarness()([
    { d: { m: { id: 'd1' }, sp: { lines: [{ pid: 1, qty: 100 }] }, cost: 8, price: 20 }, then: 5 }
  ], Date.now() - 20 * DAY);
  assert.ok(Math.abs(top.pts - single.pts) < 1e-9, 'every line contributes to the points figure');
});

test('movementCulprit: the biggest mover wins, not the first seen', () => {
  const mixed = [
    { d: { m: { id: 'd1' }, sp: { lines: [{ pid: 2, qty: 100 }, { pid: 1, qty: 100 }] }, cost: 8, price: 20 }, then: 5 },
  ];
  assert.equal(culpritHarness()(mixed, Date.now() - 20 * DAY).name, 'Barramundi',
    'Barramundi moved +0.03/g; Cheese barely moved');
});

test('movementCulprit: skips misc lines, unknown products and ingredients with no history that far back', () => {
  const h = culpritHarness();
  assert.equal(h([{ d: { m: { id: 'd1' }, sp: { lines: [{ misc: true, cost: 5 }] }, cost: 5, price: 20 }, then: 5 }], Date.now() - 20 * DAY), null);
  assert.equal(h([{ d: { m: { id: 'd1' }, sp: { lines: [{ pid: 99, qty: 1 }] }, cost: 5, price: 20 }, then: 5 }], Date.now() - 20 * DAY), null);
  assert.equal(h(okPair(), Date.now() - 400 * DAY), null, 'before the log starts there is no culprit to name');
  assert.equal(h([], Date.now()), null);
});

test('ingPriceAt: the price in force at a moment, null before the log begins', () => {
  const h = costHarness();
  assert.equal(h.ingPriceAt(1, Date.now() - 20 * DAY), 0.05);
  assert.equal(h.ingPriceAt(1, Date.now()), 0.08);
  assert.equal(h.ingPriceAt(1, Date.now() - 400 * DAY), null);
  assert.equal(h.ingPriceAt(999, Date.now()), null);
});

test('priceHeldSince: true ONLY when the log reaches back AND nothing changed since', () => {
  const held = logHarness({ d1: [{ t: T(90), v: 20 }] });
  assert.equal(held.priceHeldSince('d1', T(60)), true);

  const moved = logHarness({ d1: [{ t: T(90), v: 18 }, { t: T(30), v: 20 }] });
  assert.equal(moved.priceHeldSince('d1', T(60)), false, 'a change inside the window is not "held"');

  const shallow = logHarness({ d1: [{ t: T(10), v: 20 }] });
  assert.equal(shallow.priceHeldSince('d1', T(60)), false, 'a log starting after the moment cannot prove it');

  const none = logHarness({});
  assert.equal(none.priceHeldSince('d1', T(60)), false, 'no log at all never claims the price held');
});
