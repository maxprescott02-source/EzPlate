/*
 * kpi-strip.test.js — v133 (V3): the §3.1 KPI strip + the sidebar Dashboard badge.
 *
 * The strip's three figures are deterministic app arithmetic on the same data the rest of the
 * dashboard reads, counted PER PUBLICATION (the decided headline law). The over-target count
 * shares the 0.05 display epsilon with dashPctClass/the badge/verdictHtml so the first two
 * cells can never contradict each other on a rounding hair. There is deliberately NO delta
 * pill: "vs last month" is the stat class Max deleted in v98 — reviving it is queued as his
 * call. When nothing is costed and priced the strip renders NOTHING, so the hero's actionable
 * empty copy stays on screen at every width.
 *
 * Assertions are scoped PER CELL (split on kpi-cell) — the first cut's whole-string regexes
 * passed with the counters swapped, which the review caught.
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
    ${extractFn(APP, 'fmtTargetPct')}
    ${extractFn(APP, 'analyze')}
    ${extractFn(APP, 'avgFoodCostForScope')}
    ${extractFn(APP, 'dashPctClass')}
    ${extractFn(APP, 'kpiStripHtml')}
    return { kpiStripHtml:kpiStripHtml, avgFoodCostForScope:avgFoodCostForScope };
  `);
  return factory({ dishes, target: opts.target == null ? 30 : opts.target });
}

/* the three cells, in order, as separate strings — position-aware on purpose */
function cells(html) {
  const parts = html.split('kpi-cell').slice(1);
  assert.equal(parts.length, 3, 'three cells');
  return parts;
}

test('three cells, counted per publication: %, over-target, and not-costed-or-priced', () => {
  // costs at price 10, target 30: 2.0 → 20% ok · 3.5 → 35% over · 3.5 → over · null → unready
  const h = harness([
    { price: 10, cost: 2.0 }, { price: 10, cost: 3.5 }, { price: 10, cost: 3.5 }, { price: 10, cost: null },
  ]);
  const [c1, c2, c3] = cells(h.kpiStripHtml('all', { current: h.avgFoodCostForScope('all'), lastMonth: null }));
  assert.ok(/Average food cost/.test(c1) && /30\.0%/.test(c1), 'cell 1: the average (20+35+35)/3');
  assert.ok(/vs your/.test(c1) === false, 'cell 1 sub states the pts gap, not a bare "vs target"');
  assert.ok(/Plates over target/.test(c2) && />2<\/span>/.test(c2), 'cell 2: exactly the two over-target publications');
  assert.ok(/of 3 costed/.test(c2), 'cell 2 sub: three costed publications');
  assert.ok(/Not costed or priced/.test(c3) && />1<\/span>/.test(c3), 'cell 3: the one unready publication');
  assert.ok(/missing a cost or a sell price/.test(c3), 'cell 3 sub names BOTH ways a plate can be unready');
});

test('a fully costed plate with NO sell price counts as unready — the label must not lie about why', () => {
  const h = harness([{ price: 0, cost: 3.5 }, { price: 10, cost: 2.0 }]);
  const [, c2, c3] = cells(h.kpiStripHtml('all', { current: 20, lastMonth: null }));
  assert.ok(/of 1 costed/.test(c2), 'only the priced dish is costed');
  assert.ok(/>1<\/span>/.test(c3), 'the price-less dish lands in cell 3');
});

test('a plate published to two menus counts twice — per publication, never distinct-plate', () => {
  const h = harness([
    { menuId: 'M_A', price: 10, cost: 3.5 }, { menuId: 'M_B', price: 10, cost: 3.5 },
  ]);
  const [, c2] = cells(h.kpiStripHtml('all', { current: 35, lastMonth: null }));
  assert.ok(/>2<\/span>/.test(c2) && /of 2 costed/.test(c2), 'both publications counted');
});

test('the two cells share the 0.05 epsilon — a rounding hair cannot make them contradict', () => {
  // 3.004 at $10 = 30.04%: inside the epsilon. Cell 1 must be green AND cell 2 must count 0.
  const h = harness([{ price: 10, cost: 3.004 }]);
  const [c1, c2] = cells(h.kpiStripHtml('all', { current: 30.04, lastMonth: null }));
  assert.ok(/kpi-num good/.test(c1), 'cell 1 green at 30.04 vs 30 (display epsilon)');
  assert.ok(/>0<\/span>/.test(c2), 'cell 2 counts zero — same epsilon, no contradiction in one container');
  // and just past it, both flip together
  const h2 = harness([{ price: 10, cost: 3.01 }]);
  const [d1, d2] = cells(h2.kpiStripHtml('all', { current: 30.1, lastMonth: null }));
  assert.ok(/kpi-num bad/.test(d1) && />1<\/span>/.test(d2), 'past the epsilon both cells agree the other way');
});

test('no delta pill, anywhere, at any scope — the v98 deletion stands until Max reopens it', () => {
  const dishes = [{ menuId: 'M_A', price: 10, cost: 3.5 }, { menuId: 'M_B', price: 10, cost: 2.0 }];
  const h = harness(dishes);
  assert.ok(!/pill/.test(h.kpiStripHtml('all', { current: 27.5, lastMonth: 25.0 })), 'not at all-menus, even with a month figure');
  assert.ok(!/pill/.test(h.kpiStripHtml('M_A', { current: 27.5, lastMonth: 25.0 })), 'not narrowed either');
});

test('cell 1 sub carries the pts gap the hidden hero used to state', () => {
  const over = harness([{ price: 10, cost: 3.57 }]);
  assert.ok(/5\.7 pts over your 30% target/.test(over.kpiStripHtml('all', { current: 35.7, lastMonth: null })), 'over');
  const under = harness([{ price: 10, cost: 2.43 }]);
  assert.ok(/5\.7 pts under your 30% target/.test(under.kpiStripHtml('all', { current: 24.3, lastMonth: null })), 'under');
  const at = harness([{ price: 10, cost: 3.0 }]);
  assert.ok(/at your 30% target/.test(at.kpiStripHtml('all', { current: 30.0, lastMonth: null })), 'at');
  assert.ok(!/%%/.test(over.kpiStripHtml('all', { current: 35.7, lastMonth: null })), 'fmtTargetPct already carries the %');
});

/* A FRACTIONAL target, which is the case the hand-written stub this harness used to carry got
   wrong. It returned String(cogsPct)+'%' — the right SHAPE (it carried the %, the "30%%" fix)
   and the wrong CONTRACT: the real fmtTargetPct rounds to one decimal, so 32.53 renders "32.5%"
   and the stub rendered "32.53%". The stub could not see it because every other test here runs
   at the default 30, where cogsPct%1 is 0 and both branches agree.
   Reachable, and the audit's first pass had the path WRONG — it is NOT the Settings input, which
   routes through setCogs and rounds. It is the BOOT READ (js/app.js:514, cogsPct=pv straight from
   parseFloat), so a food_cost_target of 32.53 out of a restore or an older file loads fractional
   and stays that way until Settings is next touched. The real function's %1 branch exists for it.
   This test FAILS against the stub, which is the point of it. */
test('a fractional target renders to ONE decimal — the contract the stub used to get wrong', () => {
  const h = harness([{ price: 10, cost: 4.0 }], { target: 32.53 });
  const html = h.kpiStripHtml('all', { current: 40.0, lastMonth: null });
  assert.ok(/7\.5 pts over your 32\.5% target/.test(html), 'one decimal: 32.53 renders "32.5%"');
  assert.ok(!/32\.53%/.test(html), 'the raw two-decimal value never reaches the screen');
  // and a whole target still drops the decimal entirely — the other branch, in the same test
  const whole = harness([{ price: 10, cost: 4.0 }], { target: 33 });
  assert.ok(/7\.0 pts over your 33% target/.test(whole.kpiStripHtml('all', { current: 40.0, lastMonth: null })), 'whole target stays "33%", not "33.0%"');
});

test('nothing costed and priced: the strip renders NOTHING — the hero keeps the empty state', () => {
  const h = harness([{ price: 10, cost: null }]);
  assert.equal(h.kpiStripHtml('all', { current: null, lastMonth: null }), '', 'empty string, so .has-kpis is absent and the hero stays');
});

/* ---- the sidebar badge ---- */

function badgeHarness(pct, target) {
  const factory = new Function('FIX', `
    "use strict";
    var cogsPct=FIX.target;
    var btn={attrs:{}, setAttribute:function(k,v){ this.attrs[k]=v; }};
    var el={hidden:true, textContent:'', closest:function(){ return btn; }};
    var document={ getElementById:function(id){ return id==='dashNavBadge'?el:null; } };
    function computeAvgFoodCost(){ return FIX.pct; }
    ${extractFn(APP, 'updateDashNavBadge')}
    updateDashNavBadge();
    return { el:el, label:btn.attrs['aria-label'] };
  `);
  return factory({ pct, target });
}

test('the badge shows the all-menus % only when over target, with the shared epsilon exercised', () => {
  const over = badgeHarness(33.5, 30);
  assert.deepEqual({ hidden: over.el.hidden, text: over.el.textContent }, { hidden: false, text: '33.5%' }, 'over target: shown');
  assert.equal(badgeHarness(30.0, 30).el.hidden, true, 'at target: hidden');
  assert.equal(badgeHarness(30.03, 30).el.hidden, true, 'INSIDE the epsilon (30.03 vs 30): hidden — this is the case a bare > would already pass, so the next one is the real pin');
  assert.equal(badgeHarness(30.06, 30).el.hidden, false, 'just past the epsilon: shown');
  assert.equal(badgeHarness(28.0, 30).el.hidden, true, 'under target: hidden');
  assert.equal(badgeHarness(null, 30).el.hidden, true, 'nothing costed: hidden, never a fabricated figure');
});

test('the badge is announced: the nav button aria-label carries the figure AND its meaning', () => {
  assert.equal(badgeHarness(33.5, 30).label, 'Dashboard — average food cost 33.5%, over target', 'over: the label says what the number means — colour is not the carrier');
  assert.equal(badgeHarness(28.0, 30).label, 'Dashboard', 'under: back to the plain name');
});
