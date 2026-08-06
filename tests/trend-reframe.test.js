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
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(name) {
  const sig = `function ${name}(`;
  const i = SRC.indexOf(sig);
  if (i < 0) throw new Error(`trend-reframe: function not found -> ${name}. app.js changed; update this test`);
  const start = SRC.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < SRC.length; n++) {
    if (SRC[n] === '{') depth++;
    else if (SRC[n] === '}' && --depth === 0) {
      const out = SRC.slice(i, n + 1);
      try { new Function(`return (${out})`); }
      catch (e) { throw new Error(`trend-reframe: extracted ${name} does not parse (${e.message})`); }
      return out;
    }
  }
  throw new Error(`trend-reframe: unbalanced braces for ${name}`);
}

/* The chart sandbox: real geometry, real markers, real caption. Only the DOM measurers are stubbed
   (axCharW's canvas has a documented 6.6 fallback — the stub IS the fallback). */
function chart(opts) {
  opts = opts || {};
  // eslint-disable-next-line no-new-func
  const factory = new Function('PTS', 'LOG', 'TARGET', `
    "use strict";
    var priceHistory=PTS.slice(), changeLog=LOG, cogsPct=TARGET, TREND_GEO=null, AX_CHW=6.6;
    var DASH_ALL='all', TICK_STEPS=[1,2,5,10,20,50];
    function axCharW(){ return 6.6; }
    function dashRangePts(){ return PTS; }
    function esc(s){ return (s==null?'':String(s)); }
    ${extractFn('ptMs')}
    ${extractFn('fmtTargetPct')}
    ${extractFn('tcTangents')}
    ${extractFn('tcPath')}
    ${extractFn('tcYAt')}
    ${extractFn('tcTicks')}
    ${extractFn('niceStep')}
    ${extractFn('niceTicks')}
    ${extractFn('targetInView')}
    ${extractFn('trendMarkers')}
    ${extractFn('lastChangeEntry')}
    ${extractFn('sinceLineHtml')}
    ${extractFn('trendChart')}
    return { trendChart: trendChart, trendMarkers: trendMarkers, sinceLineHtml: sinceLineHtml,
             geo: function(){ return TREND_GEO; } };
  `);
  return factory(opts.pts || [], opts.log || [], opts.target == null ? 30 : opts.target);
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
    ${extractFn('mcmpSparkSeries')}
    return mcmpSparkSeries;
  `);
  const spark = mk(30);
  const risingUnder = spark([{ t: 1, v: 20 }, { t: 2, v: 22 }, { t: 3, v: 24 }]);
  assert.match(risingUnder, /mcmp-spark good/, 'rising under target must NOT be red — same failure as the old chart');
  const fallingOver = spark([{ t: 1, v: 40 }, { t: 2, v: 38 }, { t: 3, v: 36 }]);
  assert.match(fallingOver, /mcmp-spark bad/, 'improving-but-over is still over');
});
