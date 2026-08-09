/*
 * kpi-strip.test.js — v133 (V3): the §3.1 KPI strip + the sidebar Dashboard badge.
 *
 * The strip's three figures are deterministic app arithmetic on the same data the rest of the
 * dashboard reads, counted PER PUBLICATION (the decided headline law). The delta pill is
 * all-menus only — dashComparisons' month figure IS the all-menus series, and subtracting it
 * from a narrowed current would fabricate movement across two series (the change-log law).
 * The badge shows the all-menus average ONLY when over target, with the shared epsilon.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('function not found -> ' + name + '. app.js changed; update tests/kpi-strip.test.js');
  const start = src.indexOf('{', i);
  let d = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') d++;
    else if (src[n] === '}' && --d === 0) return src.slice(i, n + 1);
  }
  throw new Error('unbalanced braces for ' + name);
}

/* dishes: [{menuId, price, cost}] — cost null = no plate/uncosted */
function harness(dishes, opts = {}) {
  const factory = new Function('FIX', `
    "use strict";
    var DASH_ALL='all';
    var cogsPct=FIX.target;
    var MENU=FIX.dishes.map(function(d,i){ return {id:'MI'+i, name:'Dish '+i, price:d.price, menuId:d.menuId||'MENU_ORIGINAL', plateId:'PL'+i}; });
    var plateCosts=FIX.dishes.map(function(d){ return d.cost; });
    function plateForMenuItem(m){ var ix=Number(m.id.slice(2)); return plateCosts[ix]==null?null:{id:'PL'+ix, lines:[{misc:true,cost:plateCosts[ix]}]}; }
    function costFromLines(lines){ return (lines&&lines[0])?lines[0].cost:0; }
    function foodTarget(){ return cogsPct/100; }
    function fmtTargetPct(){ return String(cogsPct)+'%'; }   // mirrors the real return shape — it INCLUDES the % (the stub without it hid a "30%%" bug the browser drive caught)
    ${extractFn(APP, 'analyze')}
    ${extractFn(APP, 'avgFoodCostForScope')}
    ${extractFn(APP, 'dashPctClass')}
    ${extractFn(APP, 'kpiStripHtml')}
    return { kpiStripHtml:kpiStripHtml, avgFoodCostForScope:avgFoodCostForScope };
  `);
  return factory({ dishes, target: opts.target == null ? 30 : opts.target });
}

const CMP_FLAT = { current: 33.5, lastMonth: 33.5, lastWeek: null, ytd: null };

test('three cells, counted per publication: over-target, costed, and not-costed', () => {
  // costs at price 10, target 30%: 2.0 → 20% ok · 3.5 → 35% over · 3.5 → over · null → uncosted
  const h = harness([
    { price: 10, cost: 2.0 }, { price: 10, cost: 3.5 }, { price: 10, cost: 3.5 }, { price: 10, cost: null },
  ]);
  const html = h.kpiStripHtml('all', { current: h.avgFoodCostForScope('all'), lastMonth: null });
  assert.ok(/Average food cost/.test(html) && /Plates over target/.test(html) && /Not costed/.test(html), 'the three labels');
  assert.ok(/>2<\/span>/.test(html), 'two plates over target');
  assert.ok(/of 3 costed/.test(html), 'three costed publications');
  assert.ok(/>1<\/span>/.test(html), 'one not costed');
  assert.ok(/vs your 30% target/.test(html) && !/%%/.test(html), 'the target reads once — fmtTargetPct already carries the %');
});

test('a plate published to two menus counts twice — per publication, never distinct-plate', () => {
  const h = harness([
    { menuId: 'M_A', price: 10, cost: 3.5 }, { menuId: 'M_B', price: 10, cost: 3.5 },
  ]);
  const html = h.kpiStripHtml('all', CMP_FLAT);
  assert.ok(/>2<\/span>/.test(html) && /of 2 costed/.test(html), 'both publications counted');
});

test('the delta pill renders at ALL-MENUS scope only — never against a narrowed current', () => {
  const dishes = [{ menuId: 'M_A', price: 10, cost: 3.5 }, { menuId: 'M_B', price: 10, cost: 2.0 }];
  const h = harness(dishes);
  const all = h.kpiStripHtml('all', { current: 27.5, lastMonth: 25.0 });
  assert.ok(/pill pill-bad/.test(all) && /\+2\.5 pts/.test(all), 'all-menus shows the rise as a bad pill');
  const scoped = h.kpiStripHtml('M_A', { current: 27.5, lastMonth: 25.0 });
  assert.ok(!/pill/.test(scoped), 'a narrowed scope shows NO delta — the month figure is an all-menus number');
});

test('a fall reads as a good pill; a sub-0.05pt drift shows nothing', () => {
  const h = harness([{ price: 10, cost: 2.0 }]);
  const down = h.kpiStripHtml('all', { current: 30.0, lastMonth: 32.5 });
  assert.ok(/pill pill-good/.test(down) && /2\.5 pts/.test(down), 'a fall is good');
  const flat = h.kpiStripHtml('all', { current: 30.0, lastMonth: 30.02 });
  assert.ok(!/pill/.test(flat), 'display-rounding drift is not movement');
});

test('nothing costed and priced: an honest dash, no fabricated zero', () => {
  const h = harness([{ price: 10, cost: null }]);
  const html = h.kpiStripHtml('all', { current: null, lastMonth: null });
  assert.ok(/muted-dash/.test(html), 'the % cell is a dash');
  assert.ok(/nothing costed and priced yet/.test(html), 'and says why');
  assert.ok(!/pill/.test(html), 'no delta pill without a current figure');
});

test('the % cell colour follows dashPctClass — the anchor-to-target law, same epsilon', () => {
  const over = harness([{ price: 10, cost: 3.5 }]);           // 35% vs 30 target
  assert.ok(/kpi-num bad/.test(over.kpiStripHtml('all', { current: 35, lastMonth: null })), 'over target is bad');
  const under = harness([{ price: 10, cost: 2.0 }]);          // 20%
  assert.ok(/kpi-num good/.test(under.kpiStripHtml('all', { current: 20, lastMonth: null })), 'under target is good');
});

/* ---- the sidebar badge ---- */

function badgeHarness(pct, target) {
  const factory = new Function('FIX', `
    "use strict";
    var cogsPct=FIX.target;
    var el={hidden:true, textContent:''};
    var document={ getElementById:function(id){ return id==='dashNavBadge'?el:null; } };
    function computeAvgFoodCost(){ return FIX.pct; }
    ${extractFn(APP, 'updateDashNavBadge')}
    updateDashNavBadge();
    return el;
  `);
  return factory({ pct, target });
}

test('the badge shows the all-menus % only when over target, and hides at/under it', () => {
  assert.deepEqual({ hidden: badgeHarness(33.5, 30).hidden, text: badgeHarness(33.5, 30).textContent },
    { hidden: false, text: '33.5%' }, 'over target: shown with the figure');
  assert.equal(badgeHarness(30.0, 30).hidden, true, 'at target: hidden (the epsilon covers display rounding)');
  assert.equal(badgeHarness(28.0, 30).hidden, true, 'under target: hidden');
  assert.equal(badgeHarness(null, 30).hidden, true, 'nothing costed: hidden, never a fabricated figure');
});
