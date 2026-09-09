/*
 * food-cost-bound.test.js — 241 (queue items 18 and 23). The sanity bound on a plate's food-cost
 * ratio, and the label that says which average the headline is.
 *
 * THE DEFECT, measured on production 8 Sep 2026 and reproduced here before any of this was written:
 * `avgFoodCostForScope` is the MEAN OF PER-PLATE RATIOS with no bound, so one plate priced at $0.01
 * contributes 30000% on its own. A single typo took the headline to 354.4%, "324.4 pts over your
 * target", a trend axis scaled to 380% that flattened every real week into the floor, a
 * `price_history` row nothing can delete, and AI copy reporting "swings 20000-30000%" — every figure
 * deterministically computed, correctly phrased, and about a typo.
 *
 * WHAT THIS FILE IS REALLY PINNING, and it is one sentence: a plate over the bound is excluded from
 * every figure AND is named on screen. Half of that is a fix and half of it is a different defect —
 * a number that silently drops a plate is exactly as unreconcilable as one that silently includes it.
 * So every exclusion test here has a matching "and it is listed" test, deliberately.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn, extractVar } = require('./_extractfn');

const SRC = loadApp();

/* The walk and its two readers, with the real cost path underneath — never a stubbed cost, because
 * the bound is a claim ABOUT a cost and a stub would agree with whatever I believed while writing it.
 */
function dash(dishes, opts) {
  const o = opts || {};
  const byId = { P1: { id: 'P1', base_unit: 'g', cost_per_base_unit: 0.01 } };
  const plates = dishes.map((d, i) => ({ id: 'S' + i, lines: [{ pid: 'P1', qty: d.qty }] }));
  const MENU = dishes.map((d, i) => ({
    id: 'D' + i, name: d.name || ('Plate ' + i), plateId: 'S' + i, price: d.price, menuId: d.menu || 'M1',
  }));
  // eslint-disable-next-line no-new-func
  return new Function('MENU', 'SP', 'BYID', 'COGS', `"use strict";
    var MENU=MENU, savedPlates=SP, byId=BYID, kById={}, DASH_ALL='all', cogsPct=COGS;
    function dishOnMenu(m, id){ return m.menuId===id; }
    function esc(s){ return String(s); }
    function money(n){ return '$'+Number(n).toFixed(2); }
    function fmtTargetPct(){ return COGS+'%'; }
    function dashPctClass(){ return ''; }
    ${extractVar(SRC, 'FOOD_COST_SANE_MAX')}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'lineCost')}
    ${extractFn(SRC, 'lineProduct')}
    ${extractFn(SRC, 'costDetail')}
    ${extractFn(SRC, 'dishRatios')}
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'mispricedDishes')}
    ${extractFn(SRC, 'mispricedHtml')}
    ${extractFn(SRC, 'kpiStripHtml')}
    return {
      avg:avgFoodCostForScope, mispriced:mispricedDishes, html:mispricedHtml,
      kpi:function(scope){ return kpiStripHtml(scope, {current:avgFoodCostForScope(scope)}); },
      bound:FOOD_COST_SANE_MAX
    };`)(MENU, plates, byId, o.cogs == null ? 30 : o.cogs);
}

/* costs 0.01/g. qty 300 => $3.00. At $12 that is 25%; at $0.01 it is 30000%. */
const SANE = { qty: 300, price: 12, name: 'Fish & Chips' };
const TYPO = { qty: 300, price: 0.01, name: 'Pineapple Fritter' };

/* =============================================================================================
 * 1. The defect, and the bound
 * ========================================================================================== */

test('THE DEFECT: without the bound, one $0.01 plate moves the average by thousands of points', () => {
  // The mean is computed here from the same inputs the app uses, WITHOUT the bound, so the number
  // this file exists to prevent is a measurement rather than a story in a comment.
  const unbounded = (300 * 0.01) / 0.01 * 100;
  assert.equal(unbounded, 30000, 'one plate contributes 30000% on its own');
  assert.equal((25 + 30000) / 2, 15012.5, 'and a two-plate menu averages 15012.5%');
});

test('the bound excludes it: the headline is the figure the sane plates give', () => {
  const clean = dash([SANE]);
  const dirty = dash([SANE, TYPO]);
  assert.ok(Math.abs(clean.avg('all') - 25) < 1e-9);
  assert.ok(Math.abs(dirty.avg('all') - clean.avg('all')) < 0.5,
    'within half a point of the average without the typo — the item’s own acceptance');
});

test('...and it is NAMED, which is the other half of the fix', () => {
  const d = dash([SANE, TYPO]);
  const bad = d.mispriced('all');
  assert.equal(bad.length, 1);
  assert.equal(bad[0].name, 'Pineapple Fritter');
  assert.equal(bad[0].price, 0.01);
  assert.ok(Math.abs(bad[0].cost - 3) < 1e-9);
  assert.ok(bad[0].pct > 29000, 'the real ratio is carried, not clamped — the row shows what is wrong');
});

test('the bound is a TYPO DETECTOR, not an opinion about margin: 299% still counts', () => {
  const d = dash([{ qty: 299, price: 1, name: 'Dear but real' }]);   // $2.99 sold at $1.00 = 299%
  assert.ok(Math.abs(d.avg('all') - 299) < 1e-9, 'a genuinely terrible margin is still the café’s problem to see');
  assert.deepStrictEqual(d.mispriced('all'), []);
});

test('the boundary is EXCLUSIVE at exactly the bound — 300 is in, 301 is out', () => {
  const at = dash([{ qty: 300, price: 1 }]);
  assert.ok(Math.abs(at.avg('all') - 300) < 1e-9, 'exactly at the bound is kept');
  assert.deepStrictEqual(at.mispriced('all'), []);
  const over = dash([{ qty: 301, price: 1 }]);
  assert.equal(over.avg('all'), null, 'one plate, excluded, leaves nothing to average');
  assert.equal(over.mispriced('all').length, 1);
});

test('a scope with NOTHING left after the bound answers null, never 0', () => {
  const d = dash([TYPO]);
  assert.equal(d.avg('all'), null,
    'zero would render as a perfect 0.0% food cost, which is the quiet-wrong-number failure this app must never produce');
});

test('the excluded list is scope-aware, exactly as the average is', () => {
  const d = dash([{ ...SANE, menu: 'M1' }, { ...TYPO, menu: 'M2' }]);
  assert.deepStrictEqual(d.mispriced('M1'), []);
  assert.equal(d.mispriced('M2').length, 1);
  assert.equal(d.mispriced('all').length, 1);
});

test('ONE WALK: every plate the average leaves out is in the list, and none of them is in both', () => {
  // The property, not an instance — a second copy of the loop is the defect this shape prevents.
  const d = dash([SANE, TYPO, { qty: 900, price: 1, name: 'Also wrong' }, { qty: 300, price: 20 }]);
  const bad = d.mispriced('all');
  assert.equal(bad.length, 2);
  const avgOfSane = (25 + 15) / 2;
  assert.ok(Math.abs(d.avg('all') - avgOfSane) < 1e-9,
    'the average is exactly the plates the list does NOT name');
});

/* =============================================================================================
 * 2. The KPI strip — an excluded plate is not "over target"
 * ========================================================================================== */

const cellsOf = (html) => html.split('kpi-cell').slice(1);

test('a mispriced plate is not counted as over target — it is unready', () => {
  // Two sane plates, one over target; plus the typo. The typo is over target on any reading, and
  // counting it there would put a wrong sell price in the same sentence as the real margin work.
  const d = dash([{ qty: 200, price: 10 }, { qty: 350, price: 10 }, TYPO]);
  const [, over, unready] = cellsOf(d.kpi('all'));
  assert.match(over, />1<\/span>/, 'exactly the one genuinely over-target plate');
  assert.match(over, /of 2 costed/, 'and the typo is not in the costed denominator either');
  assert.match(unready, />1<\/span>/, 'it lands where a plate the app cannot judge has always landed');
});

test('the strip and the average agree about which plates count', () => {
  const d = dash([SANE, TYPO]);
  const [c1] = cellsOf(d.kpi('all'));
  assert.match(c1, /25\.0%/, 'the headline cell is the sane plate alone');
});

/* =============================================================================================
 * 3. The row on screen — item 18's other half
 * ========================================================================================== */

test('nothing to say, nothing rendered', () => {
  assert.equal(dash([SANE]).html('all'), '', 'the card is absent, not an empty state');
});

test('the row names the plate, both figures, and why it is not in the numbers above', () => {
  const h = dash([SANE, TYPO]).html('all');
  assert.match(h, /Check the price/);
  assert.match(h, /Pineapple Fritter/);
  assert.match(h, /costs \$3\.00, sells for \$0\.01/, 'both sides of the ratio, so the typo is visible without opening anything');
  assert.match(h, /over 300%/, 'the bound is stated rather than left as a mystery');
  assert.match(h, /left out of every figure above/, 'the row explains what it did to the numbers');
});

test('singular and plural both read as English', () => {
  assert.match(dash([SANE, TYPO]).html('all'), /This plate is left out/);
  assert.match(dash([SANE, TYPO, { qty: 900, price: 1 }]).html('all'), /2 plates are left out/);
});

test('worst first', () => {
  const h = dash([{ qty: 400, price: 1, name: 'Bad' }, { qty: 900, price: 1, name: 'Worse' }]).html('all');
  assert.ok(h.indexOf('Worse') < h.indexOf('Bad'), 'the biggest number is the likeliest typo');
});

test('the card carries NO verdict colour, because colour in this app means "against target"', () => {
  const h = dash([SANE, TYPO]).html('all');
  assert.ok(!/\bbad\b|\bgood\b|st-over|st-under/.test(h),
    'an excluded plate has no honest position against target — that is why it was excluded');
});

/* =============================================================================================
 * 4. Item 23 — the headline says WHICH average it is
 * ========================================================================================== */

test('both tiles name the method, and neither uses the forbidden noun', () => {
  const hero = extractFn(SRC, 'verdictHtml');
  const strip = extractFn(SRC, 'kpiStripHtml');
  assert.match(hero, /Average of plate food costs/, 'the mobile hero');
  assert.match(strip, /Average of plate food costs/, 'and the desktop KPI strip');
  // The item suggested "average of DISH food costs". "dish" is not a UI noun in this app (Max,
  // 25 Jul 2026) and tests/terminology.test.js enforces it — the object is a Plate.
  assert.ok(!/Average of dish food costs/.test(hero + strip));
});

test('the label is the METHOD, and the method itself did not change', () => {
  // 25.0 mean-of-ratios against 26.4 ratio-of-sums on the audit's data: the label exists because the
  // two are 1.4 pts apart and nothing on screen said which one you were reading.
  const d = dash([{ qty: 200, price: 10 }, { qty: 800, price: 40 }]);
  assert.ok(Math.abs(d.avg('all') - 20) < 1e-9, 'mean of 20% and 20%');
  const uneven = dash([{ qty: 100, price: 2 }, { qty: 800, price: 40 }]);
  assert.ok(Math.abs(uneven.avg('all') - 35) < 1e-9,
    'mean of ratios (50 and 20), NOT the ratio of sums (9/42 = 21.4) — the choice this label names');
});

/* =============================================================================================
 * 5. The chart's axis — a stored bad point must not cost the reader every good one
 * ========================================================================================== */

test('the trend axis is built from the readings ON the scale, and a point above it is clamped', () => {
  const body = extractFn(SRC, 'trendChart');
  assert.match(body, /var CAP=100;/, 'the cap is a named constant in the function that uses it');
  assert.match(body, /inRange=dvals\.filter/, 'the domain is built from the in-range readings');
  assert.match(body, /basis=inRange\.length\?inRange:\[CAP\]/,
    'and all-out-of-range falls back to the cap rather than to an empty Math.max (which is -Infinity)');
  assert.match(body, /v>mx\?mx:/, 'y clamps, so an off-scale point draws at the top edge instead of outside the viewBox');
  /* ⚠️ CAPPING ONLY THE MAXIMUM WAS NOT ENOUGH and this assertion is why the earlier version of it
     is gone: with data at 22-26 and a stored 354.4, `dmx=100` still generated ticks to 130 and left
     the real week in the bottom fifth of the plot. Measured in a browser, not reasoned — the source
     grep above would have passed either way, which is exactly what
     tests/visual/241-food-cost-bound.spec.js is for. */
  assert.ok(!/Math\.min\(Math\.max\.apply\(null,dvals\)/.test(body),
    'the max-only cap is gone: it still let the tick generator pad above the cap');
});

test('why the cap is needed even with the bound in place', () => {
  // The bound stops a bad point being WRITTEN. It cannot remove one already stored, and nothing in
  // the app can: production carries a 354.4 that takes the axis to 380%, flattening 20-35% into the
  // floor. This is the assertion that says the two fixes are not redundant.
  const stored = [22, 24, 354.4, 26];
  const uncapped = Math.max.apply(null, stored);
  assert.equal(uncapped, 354.4);
  assert.equal(Math.min(uncapped, 100), 100, 'with the cap, the real readings keep three quarters of the plot');
});

/* =============================================================================================
 * 6. The boundaries, because adding a function to the mutation gate is asking it a question
 *
 * `kpiStripHtml` and `avgFoodCostForScope` were listed as targets for the first time this batch —
 * "a function that is not a target has never been asked the question" — and the gate immediately
 * found eight edges nothing pinned. None was broken; all eight are now stated.
 * ========================================================================================== */

test('a plate priced at ZERO is not a plate priced at nothing — it is excluded from both', () => {
  const d = dash([SANE, { qty: 300, price: 0, name: 'Free' }]);
  assert.ok(Math.abs(d.avg('all') - 25) < 1e-9, 'a zero price has no ratio, so it has no vote');
  assert.deepStrictEqual(d.mispriced('all'), [], 'and it is not a typo either — it is unpriced');
  const [, over, unready] = cellsOf(d.kpi('all'));
  assert.match(over, /of 1 costed/, 'the strip agrees: one costed plate, not two');
  assert.match(unready, />1<\/span>/);
});

test('"its" for one plate, "their" for several', () => {
  assert.match(dash([SANE, TYPO]).html('all'), /its food cost is over/);
  assert.match(dash([SANE, TYPO, { qty: 900, price: 1 }]).html('all'), /their food cost is over/);
});

test('a null or undefined scope means all menus, in the strip as in the average', () => {
  const d = dash([{ ...SANE, menu: 'M1' }, { qty: 200, price: 10, menu: 'M2' }]);
  const all = d.kpi('all'), nul = d.kpi(null);
  assert.match(all, /of 2 costed/);
  assert.match(nul, /of 2 costed/, 'null is all menus — not "a menu whose id is null"');
});

test('a narrowed scope counts only that menu', () => {
  const d = dash([{ ...SANE, menu: 'M1' }, { qty: 350, price: 10, menu: 'M2' }]);
  assert.match(d.kpi('M1'), /of 1 costed/);
  assert.ok(d.kpi('M1').includes('Plates over target</div><div class="kpi-row"><span class="kpi-num">0</span>'),
    'the 35% plate is on the other menu and must not be counted here');
});

test('the strip uses the SAME bound as the average, at the same edge', () => {
  const at = dash([{ qty: 300, price: 1 }, { qty: 200, price: 10 }]);
  assert.match(at.kpi('all'), /of 2 costed/, 'exactly 300% is still a costed plate');
  const over = dash([{ qty: 301, price: 1 }, { qty: 200, price: 10 }]);
  assert.match(over.kpi('all'), /of 1 costed/, 'a hair over and it is unready, not costed');
});

test('the over-target count uses the display epsilon, so the two cells cannot contradict a rounding hair', () => {
  // target 30. 30.04% must NOT read as over: it displays as 30.0 and the headline would say "at target".
  const hair = dash([{ qty: 3004, price: 100 }], { cogs: 30 });
  assert.ok(hair.kpi('all').includes('Plates over target</div><div class="kpi-row"><span class="kpi-num">0</span>'));
  const real = dash([{ qty: 3100, price: 100 }], { cogs: 30 });
  assert.match(real.kpi('all'), />1<\/span>/);
});

test('the sub-line says over, under, or at — and "at" is a real state, not a rounding accident', () => {
  assert.match(dash([{ qty: 3000, price: 100 }], { cogs: 30 }).kpi('all'), /at your 30% target/);
  assert.match(dash([{ qty: 3500, price: 100 }], { cogs: 30 }).kpi('all'), /5\.0 pts over your 30% target/);
  assert.match(dash([{ qty: 2500, price: 100 }], { cogs: 30 }).kpi('all'), /5\.0 pts under your 30% target/);
});

test('the over-target figure is only tinted when there IS one', () => {
  assert.ok(!/kpi-num bad/.test(dash([{ qty: 200, price: 10 }], { cogs: 30 }).kpi('all')),
    'zero over target is not bad news wearing a bad-news colour');
  assert.match(dash([{ qty: 350, price: 10 }], { cogs: 30 }).kpi('all'), /kpi-num bad/);
});

/* =============================================================================================
 * 7. The three the pre-push review found — every one a place the bound did not reach
 *
 * The first cut bounded the four sites the item named plus the two measuring found, and missed
 * three more. Two of them matter and one is a colour. They are grouped here rather than filed by
 * subject because what they have in common IS the finding: a threshold is only as good as its least
 * thorough application, and "I applied it where the item said" is not a census.
 * ========================================================================================== */

function overCounter(dishes) {
  const byId = { P1: { id: 'P1', base_unit: 'g', cost_per_base_unit: 0.01 } };
  const plates = dishes.map((d, i) => ({ id: 'S' + i, lines: [{ pid: 'P1', qty: d.qty }] }));
  const MENU = dishes.map((d, i) => ({ id: 'D' + i, name: d.name || ('P' + i), plateId: 'S' + i, price: d.price }));
  // eslint-disable-next-line no-new-func
  return new Function('MENU', 'SP', 'BYID', `"use strict";
    var MENU=MENU, savedPlates=SP, byId=BYID, kById={}, cogsPct=30;
    function foodTarget(){ return 0.30; }
    ${extractVar(SRC, 'FOOD_COST_SANE_MAX')}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'lineCost')}
    ${extractFn(SRC, 'lineProduct')}
    ${extractFn(SRC, 'costDetail')}
    ${extractFn(SRC, 'analyze')}
    ${extractFn(SRC, 'dishesOverTarget')}
    return dishesOverTarget;`)(MENU, plates, byId);
}

test('THE SECOND over-target counter is bounded too — and it is the one an IMPORT reads', () => {
  /* `dishesOverTarget` feeds showImportSummary's "N plates now over your target" toast, fired
     straight after an invoice import — which is precisely how a bad cost arrives in this app. Of the
     two counters, the first cut bounded the calm one and missed the one standing where the danger
     comes from. Found by the pre-push review. */
  const real = overCounter([{ qty: 350, price: 10 }]);
  assert.equal(real(), 1, 'a genuinely over-target plate still counts');
  const withTypo = overCounter([{ qty: 350, price: 10 }, { qty: 300, price: 0.01 }]);
  assert.equal(withTypo(), 1, 'the typo does not become a second "plate over target" in the import toast');
});

test('the two over-target counters agree about the bound, whatever they do about the epsilon', () => {
  // They differ on the display epsilon deliberately (the comment at kpiStripHtml says so). That
  // exemption was about the epsilon and said nothing about the bound — an exemption is scoped to the
  // claim that justified it, and reading it as covering both is what produced the gap above.
  const dishes = [{ qty: 350, price: 10 }, { qty: 300, price: 0.01 }];
  assert.equal(overCounter(dishes)(), 1);
  const [, over] = cellsOf(dash(dishes).kpi('all'));
  assert.match(over, />1<\/span>/, 'the strip says the same 1');
});

function sparkOf(values) {
  // eslint-disable-next-line no-new-func
  return new Function('VS', `"use strict";
    var cogsPct=30;
    ${extractFn(SRC, 'mcmpSparkSeries')}
    return mcmpSparkSeries(VS.map(function(v,i){ return {t:i, v:v}; }));`)(values);
}
const yOf = (svg) => svg.match(/points="([^"]+)"/)[1].split(' ').map((p) => parseFloat(p.split(',')[1]));

test('a sparkline does not flatten eleven good readings to draw one bad one', () => {
  /* The identical defect the chart had, in a 54px glyph reading the same append-only series. The
     By-menu rows sit beside the chart and CLAUDE.md's rule is that they match it — which has to be
     true of the SCALE, not only of the colour. Found by the pre-push review. */
  const spread = yOf(sparkOf([22, 26, 24, 28]));
  const withBad = yOf(sparkOf([22, 26, 24, 354.4]));
  const range = (ys) => Math.max.apply(null, ys) - Math.min.apply(null, ys);
  assert.ok(range(spread) > 8, 'a normal series uses the height it has');
  assert.ok(range(withBad.slice(0, 3)) > 8,
    'and the three real readings keep it — unbounded, they collapsed into a flat line at the bottom');
});

test('...and the off-scale point is drawn at the top, not outside the box', () => {
  const ys = yOf(sparkOf([22, 26, 24, 354.4]));
  assert.ok(ys[3] >= 0 && ys[3] <= 16, 'inside the 16px viewBox');
  assert.equal(ys[3], Math.min.apply(null, ys), 'and it is the topmost point, which is what "off the scale" looks like');
});

test('every reading over the cap: the sparkline still draws rather than dividing by zero', () => {
  const ys = yOf(sparkOf([354.4, 400, 500]));
  assert.ok(ys.every((y) => isFinite(y)), 'no NaN reaches the points attribute');
});

test('a mispriced plate keeps its row in the cost ranking and loses its LIGHT', () => {
  /* Its cost is real — that is what the card ranks — but colour here is a reading against target,
     and a plate the rest of the Dashboard excludes for having no honest position against target must
     not wear a red dot saying it has one. The third review finding, and the smallest. */
  // eslint-disable-next-line no-new-func
  const dig = new Function('MENU', 'SP', 'BYID', `"use strict";
    var MENU=MENU, savedPlates=SP, byId=BYID, kById={}, DASH_ALL='all', cogsPct=30;
    function dishOnMenu(){ return true; }
    function foodTarget(){ return 0.30; }
    function fmt2(n){ return Number(n).toFixed(2); }
    function dashScopeLabel(){ return ''; }
    function ingPriceBand(){ return null; }
    ${extractVar(SRC, 'FOOD_COST_SANE_MAX')}
    ${extractFn(SRC, 'plateIdOf')}
    ${extractFn(SRC, 'plateForMenuItem')}
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'lineCost')}
    ${extractFn(SRC, 'lineProduct')}
    ${extractFn(SRC, 'costDetail')}
    ${extractFn(SRC, 'analyze')}
    ${extractFn(SRC, 'digData')}
    return digData;`)(
    [{ id: 'D0', name: 'Fish', plateId: 'S0', price: 12 }, { id: 'D1', name: 'Fritter', plateId: 'S1', price: 0.01 }],
    [{ id: 'S0', name: 'Fish', lines: [{ pid: 'P1', qty: 300 }] }, { id: 'S1', name: 'Fritter', lines: [{ pid: 'P1', qty: 900 }] }],
    { P1: { id: 'P1', base_unit: 'g', cost_per_base_unit: 0.01 } },
  );
  const byCost = dig('plate', 'all').rows;
  const fritter = byCost.find((r) => r.name === 'Fritter');
  assert.ok(fritter, 'it is still ranked — $9.00 of food is $9.00 of food');
  assert.equal(fritter.light, null, 'and it carries no verdict colour');
  assert.equal(byCost.find((r) => r.name === 'Fish').light, 'green', 'a real plate still gets its light');
  // and the % card excludes it outright, because there the number IS the ranking
  assert.deepStrictEqual(dig('foodcost', 'all').rows.map((r) => r.name), ['Fish']);
});

/* The edges on the two functions the review added to the gate. Both were listed for the first time
   this batch, so every one of these is a question nobody had asked either of them. */

test('dishesOverTarget: a plate with no price, no cost, or a partial cost is not "over target"', () => {
  assert.equal(overCounter([{ qty: 350, price: 0 }])(), 0, 'a zero price is not a price');
  assert.equal(overCounter([{ qty: 0, price: 10 }])(), 0, 'a zero cost is not a cost');
  assert.equal(overCounter([{ qty: 350, price: 10 }, { qty: 0, price: 10 }])(), 1,
    'and neither drags the real one out of the count');
});

test('dishesOverTarget: a partially-costed plate is excluded, not counted as healthy', () => {
  // A line pointing at a product that is not in byId: costDetail reports miss>0 and a cost of 0 for
  // it, so the plate's total is understated — which reads HEALTHIER than the plate is, the direction
  // that never prompts anyone to look.
  const byId = { P1: { id: 'P1', base_unit: 'g', cost_per_base_unit: 0.01 } };
  // eslint-disable-next-line no-new-func
  const f = new Function('MENU', 'SP', 'BYID', `"use strict";
    var MENU=MENU, savedPlates=SP, byId=BYID, kById={}, cogsPct=30;
    function foodTarget(){ return 0.30; }
    ${extractVar(SRC, 'FOOD_COST_SANE_MAX')}
    ${['plateIdOf', 'plateForMenuItem', 'cpbu', 'lineCost', 'lineProduct', 'costDetail', 'analyze', 'dishesOverTarget']
      .map((n) => extractFn(SRC, n)).join('\n')}
    return dishesOverTarget;`)(
    [{ id: 'D0', name: 'Partial', plateId: 'S0', price: 10 }],
    [{ id: 'S0', lines: [{ pid: 'P1', qty: 350 }, { pid: 'P_GONE', qty: 100 }] }],
    byId,
  );
  assert.equal(f(), 0, 'its total is missing an ingredient, so it has no honest verdict at all');
});

test('dishesOverTarget: exactly at the bound still counts, a hair over does not', () => {
  assert.equal(overCounter([{ qty: 300, price: 1 }])(), 1, '300% is a catastrophic margin, and it is real');
  assert.equal(overCounter([{ qty: 301, price: 1 }])(), 0, 'past the bound it is a typo, not a margin');
});

test('a sparkline needs two points to be a line', () => {
  assert.equal(sparkOf([]), '');
  assert.equal(sparkOf([25]), '', 'one reading is a dot, and a dot is not a trend');
  assert.ok(sparkOf([25, 26]).length > 0);
});

test('the cap boundary in the sparkline is the same one everywhere else: 100 is ON the scale', () => {
  /* The distinction that matters, and it is not visible from the top of the line: if 100 counted as
     off-scale, the basis would be [20] alone, the flat-series branch would widen it to a 0.2 window,
     and the 20 would draw in the MIDDLE of the box with the 100 clamped above it. With 100 on the
     scale the 20 is the minimum and sits at the bottom. So the reading to assert is the LOW point. */
  const ys = yOf(sparkOf([20, 100]));
  assert.ok(ys[0] > 12, 'the 20 sits at the bottom of the 16px box — it is the domain minimum');
  assert.equal(Math.min.apply(null, ys), ys[1], 'and the 100 is the top');
  const clampedRun = yOf(sparkOf([20, 100, 101]));
  assert.equal(clampedRun[1], clampedRun[2], '101 clamps onto exactly where 100 sits — the cap is the ceiling');
});

test('a flat series draws centred rather than glued to an edge', () => {
  const ys = yOf(sparkOf([25, 25, 25]));
  assert.ok(ys.every((y) => Math.abs(y - ys[0]) < 1e-9), 'flat is flat');
  assert.ok(ys[0] > 2 && ys[0] < 14, 'and it sits in the middle of the 16px box, not on a border');
  const nearlyFlat = yOf(sparkOf([25, 25.1]));
  assert.ok(Math.abs(nearlyFlat[0] - nearlyFlat[1]) < 14, 'a 0.1pt wobble is not a cliff');
});

test('a value BELOW the domain clamps too, not just above', () => {
  // Reachable when every reading is over the cap: the basis becomes [CAP] and mn===mx===100, so a
  // genuine 20 in the same window would otherwise plot above the top of the box.
  const ys = yOf(sparkOf([354, 400, 20]));
  assert.ok(ys.every((y) => y >= 0 && y <= 16), 'every point stays inside the viewBox');
});

test('the sparkline colour is anchored to TARGET, and the bound did not disturb it', () => {
  assert.match(sparkOf([40, 25]), /mcmp-spark good/, 'the LATEST reading at or under target is green, however it got there');
  assert.match(sparkOf([25, 40]), /mcmp-spark bad/);
  assert.match(sparkOf([25, 30]), /mcmp-spark good/, 'exactly at the 30% target is good, on the display epsilon');
});
