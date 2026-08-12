/*
 * trend-reframe.test.js — v115.
 *
 * The chart's colour is anchored to the TARGET, not to direction. The old condition coloured by
 * slope, which made the chart permanently red: ingredient prices drift up during ordinary trading
 * and only fall when Max intervenes. These tests pin CONDITIONS, not structure — and the first two
 * are the pair that catches the old condition, because a direction-coloured chart passes any test
 * that only checks "over target is red".
 *
 * Markers are drawn from the change log by its PRIMITIVES (avgBefore/avgAfter), never by `kind` —
 * a combined price-and-menu edit logs `dish_price` (v114), so any kind-keyed filter silently drops
 * real interventions. That trap is pinned here too.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* The chart sandbox: real geometry, real markers, real caption. Only the DOM measurers are stubbed
   (axCharW's canvas has a documented 6.6 fallback — the stub IS the fallback).
   F6 (v143): trendPlotSize is the second DOM measurer, and it is EXTRACTED rather than stubbed —
   it decides the plot's whole size, so a hand-rolled copy here would agree with whatever this file
   believed rather than with the shipped arithmetic (CLAUDE.md's stub-mirrors-contract rule). It
   needs no stub at all: `document` is absent in the sandbox, its try/catch turns that into the
   documented no-layout case, and the tests below drive the width cases directly. */
function chart(opts) {
  opts = opts || {};
  // eslint-disable-next-line no-new-func
  const factory = new Function('PTS', 'LOG', 'TARGET', 'MH', `
    "use strict";
    var priceHistory=PTS.slice(), changeLog=LOG, cogsPct=TARGET, TREND_GEO=null, AX_CHW=6.6;
    var menuHistory=MH||{};
    var DASH_ALL='all', TICK_STEPS=[1,2,5,10,20,50];
    function axCharW(){ return 6.6; }
    function dashRangePts(series){ return series ? series.slice() : PTS; }   // v115: the scoped chart passes the menu's own series
    function esc(s){ return (s==null?'':String(s)); }
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'fmtTargetPct')}
    ${extractFn(SRC, 'tcTangents')}
    ${extractFn(SRC, 'tcPath')}
    ${extractFn(SRC, 'tcYAt')}
    ${extractFn(SRC, 'tcTicks')}
    ${extractFn(SRC, 'niceStep')}
    ${extractFn(SRC, 'niceTicks')}
    ${extractFn(SRC, 'targetInView')}
    ${extractFn(SRC, 'trendMarkers')}
    ${extractFn(SRC, 'lastChangeEntry')}
    ${extractFn(SRC, 'sinceLineHtml')}
    ${extractFn(SRC, 'trendPlotSize')}
    /* The x-axis, EXTRACTED not stubbed, for the same reason trendPlotSize is: it decides real
       geometry (which readings carry a label, and the anchor that keeps the end labels inside the
       viewBox), so a hand-rolled copy would agree with whatever this file believed rather than with
       the shipped arithmetic. */
    ${extractFn(SRC, 'trendFmtDate')}
    ${extractFn(SRC, 'trendXTicks')}
    ${extractFn(SRC, 'trendChart')}
    return { trendChart: trendChart, trendMarkers: trendMarkers, sinceLineHtml: sinceLineHtml,
             geo: function(){ return TREND_GEO; } };
  `);
  return factory(opts.pts || [], opts.log || [], opts.target == null ? 30 : opts.target, opts.menuHistory || {});
}

const DAY = 86400000;
const now = Date.now();
// Ten daily readings ending today. `make(vals)` spaces them a day apart.
function series(vals) {
  return vals.map((v, i) => ({ t: now - (vals.length - 1 - i) * DAY, v }));
}
function entry(o) {
  return Object.assign({ id: 'CL' + Math.random().toString(36).slice(2), kind: 'plate_edited',
    plateId: 'SP1', dishId: null, menuIds: ['MENU_ORIGINAL'], detail: {} }, o);
}

/* =============================================================================================
 * 1. Colour — the pair that catches the old condition
 * ========================================================================================== */

test('a RISING line UNDER target stays green', () => {
  const app = chart({ pts: series([20, 21, 22, 23, 24]), target: 30 });
  const html = app.trendChart();
  assert.match(html, /stroke="var\(--good\)"/, 'rising is ordinary trading; under target is the achievement');
  assert.doesNotMatch(html, /stroke="var\(--bad\)"/, 'no red anywhere on a line that never crosses the target');
});

test('a FALLING line OVER target stays red', () => {
  const app = chart({ pts: series([40, 39, 38, 37, 36]), target: 30 });
  const html = app.trendChart();
  assert.match(html, /stroke="var\(--bad\)"/, 'improving-but-over is still over — same meaning as Menu Analysis');
});

test('the caption states position against target, never a direction verdict', () => {
  const under = chart({ pts: series([20, 21, 22]), target: 30 }).trendChart();
  assert.match(under, /under your 30% target/);
  assert.doesNotMatch(under, /trending|improving|worsening/, 'direction words are gone from the caption');
  const over = chart({ pts: series([35, 36, 37]), target: 30 }).trendChart();
  assert.match(over, /over your 30% target/);
});

test('the over-target band draws only when the target is in view', () => {
  const inView = chart({ pts: series([28, 29, 31, 32]), target: 30 }).trendChart();
  assert.match(inView, /class="over-band"/, 'the judgement lives in the band, not the slope');
  const farAway = chart({ pts: series([20, 21, 22]), target: 60 }).trendChart();
  assert.doesNotMatch(farAway, /over-band/, 'no target in the domain, nothing to shade (v61 rule kept)');
});

/* =============================================================================================
 * 2. Markers — primitives, never kind
 * ========================================================================================== */

test('a cost-reducing entry gets a marker; a cost-raising one stays off the chart', () => {
  const pts = series([24, 23.5, 21, 21.5, 22]);
  const drop = entry({ t: now - 2.5 * DAY, avgBefore: 23.5, avgAfter: 21 });
  const raise = entry({ t: now - 1 * DAY, avgBefore: 21.5, avgAfter: 22 });
  const html = chart({ pts, log: [drop, raise] }).trendChart();
  const dots = (html.match(/class="mk-pt"/g) || []).length;
  assert.strictEqual(dots, 1, 'the display filter is a FALL in the primitives — raises stay in the data, off the chart');
});

test('a combined price-and-menu entry (kind dish_price, detail carries the move) still gets its marker', () => {
  // The v114 trap: filtering on kind would treat this as "just a price edit" or miss the move
  // entirely. The marker filter must read avgBefore/avgAfter and nothing else.
  const pts = series([24, 23, 21, 21, 21]);
  const combined = entry({ t: now - 2 * DAY, kind: 'dish_price', avgBefore: 23, avgAfter: 21,
    menuIds: ['MENU_ORIGINAL', 'MW'], detail: { menuFrom: 'MENU_ORIGINAL', menuTo: 'MW', priceFrom: 20, priceTo: 25 } });
  const html = chart({ pts, log: [combined] }).trendChart();
  assert.strictEqual((html.match(/class="mk-pt"/g) || []).length, 1);
});

test('an entry naming a plate that no longer exists renders like any other — no throw, marker drawn', () => {
  const pts = series([24, 23, 21, 21, 21]);
  const orphan = entry({ t: now - 2 * DAY, plateId: 'PLATE_THAT_WAS_DELETED', kind: 'plate_deleted',
    avgBefore: 23, avgAfter: 21 });
  const html = chart({ pts, log: [orphan] }).trendChart();
  assert.strictEqual((html.match(/class="mk-pt"/g) || []).length, 1,
    'the movement was real; markers aggregate by day and never name plates, so a dead reference costs nothing');
});

test('several entries on one day cluster into ONE marker with the summed fall', () => {
  // The invoice repoint loop writes one entry per ingredient in a single confirm; a picket fence of
  // markers under one decision would misreport it as many.
  const pts = series([25, 24, 21, 21, 21]);
  const t = now - 2 * DAY;
  const log = [
    entry({ t, avgBefore: 24, avgAfter: 22.5 }),
    entry({ t: t + 60000, avgBefore: 22.5, avgAfter: 21 }),
  ];
  const app = chart({ pts, log });
  const html = app.trendChart();
  assert.strictEqual((html.match(/class="mk-pt"/g) || []).length, 1, 'one day, one marker');
  const marks = app.geo().marks;
  assert.strictEqual(marks.length, 1);
  assert.ok(Math.abs(marks[0].drop - 3) < 1e-9, 'the day\'s magnitude is the summed fall (1.5 + 1.5)');
  assert.match(html, /−3/, 'and the label carries it');
});

test('an empty log draws no markers, no marker caption, and does not throw', () => {
  const html = chart({ pts: series([22, 23, 24]), log: [] }).trendChart();
  assert.doesNotMatch(html, /mk-pt|mk-dot/, 'menu_change_log holds 0 rows in production today — this IS the shipped state');
});

test('entries outside the visible range draw nothing', () => {
  const pts = series([22, 23, 24]);
  const old = entry({ t: now - 40 * DAY, avgBefore: 25, avgAfter: 22 });
  const html = chart({ pts, log: [old] }).trendChart();
  assert.doesNotMatch(html, /mk-pt/);
});

/* =============================================================================================
 * 3. The since-line — the achievement, then the gap; silent when there is nothing to say
 * ========================================================================================== */

test('since-line: empty log renders nothing (production ships this state)', () => {
  const app = chart({ log: [] });
  assert.strictEqual(app.sinceLineHtml('all', 22.4), '');
});

test('since-line: a recent cut leads with the achievement, then the drift', () => {
  const e = entry({ t: now - 3 * DAY, avgBefore: 23.5, avgAfter: 22.1 });
  const html = chart({ log: [e] }).sinceLineHtml('all', 24.2);
  assert.match(html, /Your last change cut 1\.4 pts\./);
  assert.match(html, /Costs up 2\.1 pts since\./);
  assert.doesNotMatch(html, /portion|supplier|reprice|swap|drop an item/i,
    'the line never prescribes the fix — that decision is the chef\'s');
});

test('since-line: an old entry reads as "no changes for N weeks"', () => {
  const e = entry({ t: now - 42 * DAY, avgBefore: 23.5, avgAfter: 22.1 });
  const html = chart({ log: [e] }).sinceLineHtml('all', 24.2);
  assert.match(html, /No changes for 6 weeks\./);
  assert.match(html, /Costs up 2\.1 pts since\./);
});

test('since-line: a NARROWED scope renders nothing — its figures are the all-menus series', () => {
  /* Pre-push review, v115: every entry's avgBefore/avgAfter IS computeAvgFoodCost() (all menus).
     Subtracting that from a per-menu current fabricates drift out of the gap between two series —
     all-menus 30, Winter 45 would read "up 15 pts" for a change that moved nothing. The honest
     scoped since-line needs per-menu figures the log does not carry, so a narrowed dashboard shows
     none (the v89 rule: a figure the app can't stand behind isn't shown). */
  const e = entry({ t: now - 2 * DAY, avgBefore: 25, avgAfter: 23, menuIds: ['MW'] });
  const app = chart({ log: [e] });
  assert.strictEqual(app.sinceLineHtml('MW', 45), '', 'narrowed: no line, however tempting the arithmetic');
  assert.match(app.sinceLineHtml('all', 25.1), /cut 2\.0 pts/, 'all-menus: same series, honest drift');
});

test('the marker for the change JUST made draws — an entry newer than every trend point clamps to the line\'s end', () => {
  /* Pre-push review, v115: the entry is written when its server write settles, a beat AFTER
     logHistory pushed the trend point — so an upper time bound excluded exactly the marker the
     feature exists to show, until a future point arrived (typically the next session). */
  const pts = series([24, 23, 21.5]);
  const fresh = entry({ t: now + 900, avgBefore: 23, avgAfter: 21.5 });   // write settled ~1s after the last point
  const app = chart({ pts, log: [fresh] });
  const html = app.trendChart();
  assert.strictEqual((html.match(/class="mk-pt"/g) || []).length, 1, 'the headline moment must mark immediately');
  const g = app.geo();
  assert.ok(Math.abs(g.marks[0].x - g.xs[g.xs.length - 1]) < 0.6, 'clamped to the newest reading');
});

test('since-line: no drift clause when costs have not moved since', () => {
  const e = entry({ t: now - 3 * DAY, avgBefore: 23.5, avgAfter: 22.1 });
  const html = chart({ log: [e] }).sinceLineHtml('all', 22.1);
  assert.doesNotMatch(html, /Costs up|Costs down/);
  assert.match(html, /class="since calm"/, 'no drift, no warm tint');
});

/* =============================================================================================
 * 4. The By-menu sparklines follow the chart's colour semantics
 * ========================================================================================== */

test('sparkline colour is target-anchored: rising-but-under is good, falling-but-over is bad', () => {
  // eslint-disable-next-line no-new-func
  const mk = new Function('COGS', `
    "use strict";
    var cogsPct=COGS;
    ${extractFn(SRC, 'mcmpSparkSeries')}
    return mcmpSparkSeries;
  `);
  const spark = mk(30);
  const risingUnder = spark([{ t: 1, v: 20 }, { t: 2, v: 22 }, { t: 3, v: 24 }]);
  assert.match(risingUnder, /mcmp-spark good/, 'rising under target must NOT be red — same failure as the old chart');
  const fallingOver = spark([{ t: 1, v: 40 }, { t: 2, v: 38 }, { t: 3, v: 36 }]);
  assert.match(fallingOver, /mcmp-spark bad/, 'improving-but-over is still over');
});

/* =============================================================================================
 * 5. The scoped chart — the v89 "stage 2" promise, kept in v115
 * ========================================================================================== */

test('a narrowed scope with enough per-menu history draws the MENU\'S OWN line', () => {
  // All-menus runs under target; the menu runs OVER it. Only the scoped series being drawn can
  // produce a red stroke here — an all-menus draw would be green, which is exactly the silent
  // wrong-series failure this pins against.
  const app = chart({
    pts: series([20, 21, 22]), target: 30,
    menuHistory: { MW: series([34, 35, 36]) },
  });
  const html = app.trendChart('MW');
  assert.match(html, /stroke="var\(--bad\)"/, 'the menu is over target — its own line must say so');
  assert.match(html, /This menu · over your 30% target/);
  assert.doesNotMatch(html, /All menus/, 'the all-menus prefix belongs to the all-menus series alone');
  assert.doesNotMatch(html, /scope-note/, 'no correction needed — the line IS the menu');
});

test('a narrowed scope whose history is still building falls back to all-menus WITH the scope-note', () => {
  const app = chart({
    pts: series([20, 21, 22]), target: 30,
    menuHistory: { MW: [{ t: now, v: 34 }] },   // one point — not a line yet
  });
  const html = app.trendChart('MW');
  assert.match(html, /stroke="var\(--good\)"/, 'the drawn line is the all-menus series');
  assert.match(html, /All menus · under your 30% target/);
  assert.match(html, /scope-note/, 'the v89 honesty correction: the line under a menu\'s name covers every menu');
});

test('a scoped draw shows NO markers, however droppy the log — their figures are the all-menus series', () => {
  const mh = { MW: series([24, 23, 21, 21, 21]) };
  const drop = entry({ t: now - 2 * DAY, avgBefore: 23, avgAfter: 21, menuIds: ['MW'] });
  const app = chart({ pts: series([24, 23, 21, 21, 21]), log: [drop], menuHistory: mh });
  assert.doesNotMatch(app.trendChart('MW'), /mk-pt/,
    'an all-menus magnitude on a per-menu line would mix two series — same rule that scoped the since-line');
  assert.match(app.trendChart('all'), /mk-pt/, 'the same log marks normally on the all-menus line');
});

test('the all-menus chart is byte-identical whether called with no scope or DASH_ALL', () => {
  const opts = { pts: series([20, 21, 22]), target: 30 };
  assert.strictEqual(chart(opts).trendChart(), chart(opts).trendChart('all'));
});

/* ===== F6 (v143): the plot is sized in RENDERED PIXELS ======================================
 * Everything inside the SVG — the axis type (`font-size:11px` in CSS is 11 USER UNITS on an SVG
 * <text>, not 11 device px), the 2.5 stroke, the marker radii — is in viewBox units and scales
 * with the rendered width. The old fixed 320-unit box therefore enlarged the whole chart 2.7× on
 * an 872px desktop column: the axis labels measured ~30px against the mock's 10.5. Sizing the
 * viewBox to the column keeps the scale at 1 and is what lets the chart fill the mock's width.
 *
 * These drive the REAL trendPlotSize (the same one trendChart calls) against a stubbed element,
 * rather than re-deriving its arithmetic here — a copy would agree with this file's belief instead
 * of with the shipped function, which is the failure mode CLAUDE.md names for stubs.
 */
function plotSize(clientWidth) {
  // eslint-disable-next-line no-new-func
  return new Function('W', `
    "use strict";
    var document = { getElementById: function(){ return W == null ? null : { clientWidth: W }; } };
    ${extractFn(SRC, 'trendPlotSize')}
    return trendPlotSize();
  `)(clientWidth);
}

test('F6: the plot sizes itself to the column, so its type renders at 1:1', () => {
  const desk = plotSize(872);
  assert.strictEqual(desk.W, 872, 'the viewBox is the column width — scale 1, so 11 units render as 11px');
  assert.strictEqual(desk.H, Math.round(872 * (190 / 900)),
    "and the height is the desktop mock's own 190/900 ratio");
});

test('F6: a phone column keeps the mock\'s taller ratio', () => {
  const phone = plotSize(340);
  assert.strictEqual(phone.W, 340);
  assert.strictEqual(phone.H, Math.round(340 * (110 / 350)),
    "the mobile mock is 350x110 — a desktop ratio would leave a 71px-tall chart on a phone");
});

test('F6: no layout (hidden tab at boot) falls back to the phone-sized box, never zero', () => {
  // A zero-width viewBox is not a smaller chart, it is an SVG that cannot draw: every x/y below
  // divides by (W - padL - padR). showTab re-renders once the pane is visible.
  [null, 0].forEach((w) => {
    const s = plotSize(w);
    assert.strictEqual(s.W, 320, `clientWidth ${w} falls back`);
    assert.ok(s.H > 0, 'and the height with it');
  });
});

test('F6: the width is clamped at both ends', () => {
  assert.strictEqual(plotSize(80).W, 300, 'a hair-thin column still has a drawable gutter');
  assert.strictEqual(plotSize(4000).W, 960, 'and an ultrawide monitor does not stretch the line to nothing');
});

test('F6: the ratio switches on CONTENT width, not viewport — 559 is still a phone column', () => {
  // Below 1024 there is no sidebar, so a 600px viewport is already a ~560px column. The threshold
  // is measured on what this function actually reads.
  assert.strictEqual(plotSize(559).H, Math.round(559 * (110 / 350)));
  assert.strictEqual(plotSize(560).H, Math.round(560 * (190 / 900)));
});

test('F6: the chart really consumes it — the viewBox follows the column, not a constant', () => {
  // The pin that would have caught a trendPlotSize wired up but never read: this drives the whole
  // chart, not the sizer, and fails if trendChart goes back to a literal.
  const app = chart({ pts: series([20, 21, 22]), target: 30 });
  assert.match(app.trendChart('all'), /viewBox="0 0 320 \d+"/,
    'the sandbox has no document, so the chart takes the documented fallback size');
  const g = app.geo();
  assert.strictEqual(g.W, 320, 'and TREND_GEO carries the same W the scrub maps against');
});

/* ===== v145: THE Y-DOMAIN, and the two rules that were compounding ==========================
 * Reported as "the series is pinned to the top with ~60% dead space below". Measured before
 * fixing, target 30 with data 31.0-32.5: the series occupied 10% of the plot height.
 *
 * Two defensible rules were being applied to the same range. v60's minimum ~5-pt window stops a
 * FLAT series magnifying 0.x-pt noise; v48's hard requirement is that the target sit on a LABELLED
 * TICK, so tcTicks builds outward from the target and widens the step until it has <=4 ticks —
 * which, on a 5-pt window, lands on step 5. The domain was then `firstTick - step/2 .. lastTick +
 * step/2`, so a step of 5 spent 15 points of axis on 1.5 points of data.
 *
 * The split: when the target is DRAWN it already guarantees the span, so the minimum window is not
 * applied on top of it. When the target is absent, v60's behaviour is kept verbatim — these tests
 * assert that half too, because "fixed it by deleting the anti-noise rule" would pass any test
 * that only looked at the reported case.
 */
function plotFrac(app) {
  const g = app.geo();
  const lo = Math.min(...g.ys), hi = Math.max(...g.ys);
  return (hi - lo) / ((g.H - g.padB) - g.padT);
}
function tickValues(html) {
  return (html.match(/class="ax"[^>]*>([\d.]+)%/g) || []).map((m) => parseFloat(m.match(/>([\d.]+)%/)[1]));
}

test('v145: a target just under the readings no longer collapses the series', () => {
  const app = chart({ pts: series([31, 31.6, 32.2, 31.9, 32.5]), target: 30 });
  const html = app.trendChart('all');
  assert.ok(plotFrac(app) > 0.4,
    `the series must use most of the plot, not a band: got ${(plotFrac(app) * 100).toFixed(0)}%`);
  assert.match(html, /class="ref-line"/, 'and the target line is still drawn — that is the point of including it');
  assert.ok(tickValues(html).includes(30), 'v48 holds: the target still sits on a labelled tick');
});

test('v145: no axis label is drawn outside the plot', () => {
  // tcTicks rounds OUTWARD, so it can return values the curve never reaches. Drawing them is how
  // an axis lies about its own extent — and they land off the plot floor, over the marker strip.
  const app = chart({ pts: series([31, 31.6, 32.2, 31.9, 32.5]), target: 30 });
  const html = app.trendChart('all');   // TREND_GEO is set BY the render, so geo() must follow it
  const g = app.geo();
  const ys = (html.match(/class="ax"[^>]*y="([\d.]+)"/g) || []).map((m) => parseFloat(m.match(/y="([\d.]+)"/)[1]));
  assert.ok(ys.length > 0, 'there are labels to check');
  ys.forEach((y) => {
    assert.ok(y >= g.padT - 6 && y <= (g.H - g.padB) + 6, `a label at y=${y} is outside the plot`);
  });
});

test('v145: v60\'s minimum window still protects a FLAT series (the target-absent branch)', () => {
  // 0.05 pts of movement, target far away. Without the minimum window this would fill the plot and
  // report rounding noise as a trend — which is the defect v60 exists to prevent.
  const app = chart({ pts: series([41.0, 41.05, 41.02, 41.04, 41.03]), target: 30 });
  const html = app.trendChart('all');
  assert.ok(plotFrac(app) < 0.15, 'a flat series stays flat');
  const ts = tickValues(html);
  assert.ok(ts[ts.length - 1] - ts[0] >= 5, 'the axis still spans at least the ~5-pt minimum window');
  assert.doesNotMatch(html, /class="ref-line"/, 'and a target 11 points away is not drawn');
});

test('v145: a healthy spread is unchanged — the fix touches only the target-in-view case', () => {
  const app = chart({ pts: series([36, 38, 40, 41, 42]), target: 30 });
  const html = app.trendChart('all');   // render first: TREND_GEO does not exist until it runs
  assert.ok(plotFrac(app) > 0.6, 'data that already filled the plot still does');
  assert.doesNotMatch(html, /class="ref-line"/, 'target out of view, as before');
});

test('v145: the marker label carries its unit', () => {
  // It read as a bare "−0.2", a magnitude of nothing in particular. The SUBJECT stays in the
  // caption ("marks changes you made") so the label stays short enough for the phone's strip.
  const pts = series([24, 23, 21, 21, 21]);
  const drop = entry({ t: now - 2 * DAY, avgBefore: 23, avgAfter: 21 });
  const html = chart({ pts, log: [drop] }).trendChart('all');
  assert.match(html, /class="mk-lbl"[^>]*>−2 pts</, 'the magnitude states what it is measured in');
  assert.match(html, /marks changes you made/, 'and the caption still carries the subject');
});

/* The pre-push review's two cases, kept verbatim. The first cut of the v145 domain fix generated
 * ticks over a padded domain and then filtered them to it, and for these — ordinary café shapes,
 * squarely inside the case the batch set out to improve — tcTicks widens to step 5, returns
 * [25,30,35], and the filter left ONE label on the whole axis. Filtering is gone: the domain is the
 * tick extent plus a hair, so every tick is inside it by construction. */
[
  { vals: [28, 30, 32], target: 30, label: '[28,30,32] against a 30% target' },
  { vals: [27, 29, 31, 33], target: 30, label: '[27,29,31,33] against a 30% target' },
].forEach(({ vals, target, label }) => {
  test(`v145 REGRESSION: ${label} keeps a readable axis`, () => {
    const app = chart({ pts: series(vals), target });
    const html = app.trendChart('all');
    const ticks = tickValues(html);
    assert.ok(ticks.length >= 3, `the axis collapsed to ${ticks.length} label(s): ${JSON.stringify(ticks)}`);
    assert.ok(ticks.length <= 4, 'and tcTicks\' upper bound still holds');
    assert.ok(ticks.includes(target), 'the target still sits on a labelled tick');
    assert.ok(plotFrac(app) > 0.4, 'and the series still uses the plot');
  });
});

test('v145: every tick is inside the domain BY CONSTRUCTION, so none can render off-plot', () => {
  // Structural, not a cleanup: the domain is derived FROM the ticks, so there is nothing to filter.
  [[28, 30, 32], [27, 29, 31, 33], [31, 31.6, 32.5], [29.6, 30.1, 30.4], [30, 30, 30]].forEach((vals) => {
    const app = chart({ pts: series(vals), target: 30 });
    const html = app.trendChart('all');
    const g = app.geo();
    const ys = (html.match(/class="ax"[^>]*y="([\d.]+)"/g) || [])
      .map((m) => parseFloat(m.match(/y="([\d.]+)"/)[1]) - 3.5);   // undo the baseline nudge
    assert.ok(ys.length >= 3, `${JSON.stringify(vals)}: labels exist`);
    ys.forEach((y) => assert.ok(y >= g.padT - 0.5 && y <= (g.H - g.padB) + 0.5,
      `${JSON.stringify(vals)}: a tick line at y=${y} is outside the plot`));
  });
});

/* The domain must contain the READINGS, which deriving it from the ticks does not guarantee.
 * `tcTicks` ends with `while(lo<0) lo+=step` — a guard keeping tick LABELS non-negative on a
 * percent axis, which it does by raising the whole sequence. Near the zero floor `ticks[0]` can
 * therefore sit ABOVE a reading, and `y(v)` is unclamped, so the curve draws below the plot floor
 * into the marker-label strip. Found by the pre-push review, and NOT introduced by v145 — `main`
 * fails the same way at a 3.5% target with readings at 0 — which is why the guard sits after both
 * domain branches and why this test sweeps rather than pinning one case.
 * Reachable rather than likely: it needs a food cost at or near 0%. But `cogsPct` is only clamped
 * to [1,99], so the input range the app states for itself allows it, and no other test goes near
 * this region — every fixture uses ~30% against readings well above 10.
 */
test('v145: no reading is ever drawn outside the plot, across the whole target range', () => {
  const cases = [];
  for (let t = 1; t <= 99; t += 0.5) for (const base of [0, 0.5, 1, 2]) cases.push([t, [base, base, base]]);
  // the review's four reproducing cases, kept explicitly so they cannot be swept away by a step change
  [[1.5, [0, 0, 0]], [2.5, [0, 0, 0]], [3.5, [0, 0, 0]], [5.5, [1, 1, 1]]].forEach((c) => cases.push(c));
  const offenders = [];
  cases.forEach(([target, vals]) => {
    const app = chart({ pts: series(vals), target });
    app.trendChart('all');
    const g = app.geo();
    const floor = g.H - g.padB;
    if (g.ys.some((y) => y < g.padT - 0.51 || y > floor + 0.51)) offenders.push({ target, vals });
  });
  assert.deepStrictEqual(offenders, [],
    `readings drawn outside the plot for: ${JSON.stringify(offenders.slice(0, 5))}`);
});
