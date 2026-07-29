/*
 * dash-persist.test.js — v97: dashboard scope persistence, the distinct-plate all-menus figure,
 * and the stale-headline regression.
 *
 * The contracts this pins:
 *   1. The selected scope survives a reload, through the SAME mechanism the chart timeframe uses
 *      (localStorage, cafeDB_ namespace, written on selection only). Device-local — no Supabase.
 *   2. A stored id whose menu no longer exists falls back to All menus SILENTLY. Nothing is surfaced,
 *      nothing computes against a menu that isn't there.
 *   3. Scope and timeframe persist INDEPENDENTLY — setting one never resets the other, in either
 *      direction. They are orthogonal and share only a storage namespace.
 *   4. The All-menus row shows the same figure the chart's all-menus line is built from, to the
 *      displayed precision. Two different all-menus numbers on one screen is worse than no number.
 *   5. A plate published to several menus is counted ONCE in that figure (v97). Since v55 one plate
 *      backs one dish per menu it is published to, and counting per publication measured how the
 *      menus had been split rather than anything about food cost.
 *   6. The headline cannot go stale: when nothing is costed and priced, the figure is "—", not the
 *      last logged history point. Pinned for the headline AND the stat cards, because both read the
 *      one value — a symptom fixed in one place would mean the root cause was never found.
 *
 * Every assertion runs the REAL shipped code, sliced out of js/app.js, so there is no second copy
 * to drift. "Reload" is modelled by re-evaluating the module-init expression against the same
 * storage — which is exactly what a page load does.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`dash-persist: function not found -> ${name}. app.js changed; update tests/dash-persist.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`dash-persist: unbalanced braces for ${name}`);
}

/* The module-init one-liners (`var dashScope=(function(){...})();`). These ARE the persistence read —
   extracting them rather than restating them is the whole point: a test that hardcoded the key would
   still pass if the shipped read were deleted. */
function extractInitVar(src, name) {
  const re = new RegExp(`var\\s+${name}\\s*=\\s*\\(function\\(\\)\\{[\\s\\S]*?\\}\\)\\(\\);`);
  const m = src.match(re);
  if (!m) throw new Error(`dash-persist: init expression not found -> ${name}. app.js changed; update tests/dash-persist.test.js`);
  return m[0];
}

/* A storage that behaves like localStorage and records every write, so "written on selection only"
   is checkable rather than assumed. */
function makeStore(seed) {
  const data = Object.assign(Object.create(null), seed || {});
  const writes = [];
  return {
    getItem(k) { return k in data ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); writes.push(k); },
    removeItem(k) { delete data[k]; },
    writes,
    raw: data
  };
}

/* One page load. Fresh module scope, the same storage the previous load left behind — which is what
   makes the reload assertions real rather than a restatement of the setter. */
function boot(store, MENU, menusList) {
  const renders = [];
  const surfaced = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('localStorage', 'MENU', 'LIST', 'RENDERS', 'SURFACED', `
    "use strict";
    var menusList = LIST;
    function plateForMenuItem(m){ return m.plate || null; }
    function costFromLines(lines){ return Number(lines) || 0; }
    function esc(s){ return (s==null?'':String(s)); }
    function renderDashboard(){ RENDERS.push(1); }
    function toast(m){ SURFACED.push(m); }            // anything user-visible lands here
    function console_error(){ SURFACED.push('error'); }
    var DASH_ALL='all';
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'computeAvgFoodCost')}
    ${extractFn(SRC, 'menuComparisonRows')}
    ${extractInitVar(SRC, 'dashScope')}
    ${extractInitVar(SRC, 'dashRange')}
    ${extractFn(SRC, 'dashScopeValid')}
    ${extractFn(SRC, 'setDashScope')}
    ${extractFn(SRC, 'setDashRange')}
    ${extractFn(SRC, 'dashRangePts')}
    return {
      rawScope: function(){ return dashScope; },
      scope: dashScopeValid,
      setScope: setDashScope,
      range: function(){ return dashRange; },
      setRange: setDashRange
    };
  `);
  const app = factory(store, MENU, menusList, renders, surfaced);
  app.renders = renders;
  app.surfaced = surfaced;
  return app;
}

/* Food-cost percentages are floating-point means, and v97 makes them a mean OF means — one more
   rounding step than v96 had. Compare to the cent, not to the bit, exactly as dash-scope.test.js does.
   Nothing downstream sees those bits: logHistory rounds to 1dp before logging and every display path
   is toFixed(1). */
function near(actual, expected, msg) {
  assert.ok(actual != null && Math.abs(actual - expected) < 1e-9,
    (msg || 'value') + ': expected ~' + expected + ', got ' + actual);
}

// A dish costing `cost`, selling for `price`, on menu `menuId`, backed by plate `plateId`.
function dish(menuId, cost, price, plateId) {
  return { menuId, price, plate: { id: plateId, lines: cost } };
}

const MENUS = [
  { id: 'MENU_ORIGINAL', name: 'Original' },
  { id: 'MENU_WINTER', name: 'Winter' }
];
// Two costed menus, so the By-menu list renders and a narrowed scope is legal.
const TWO_COSTED = () => [
  dish('MENU_ORIGINAL', 2, 10, 'PL1'),   // 20%
  dish('MENU_ORIGINAL', 4, 10, 'PL2'),   // 40%
  dish('MENU_WINTER', 3, 10, 'PL3')      // 30%
];

/* ============================================================ 1 — persistence */

test('v97: the selected scope survives a reload and restores the same menu', () => {
  const store = makeStore();
  const first = boot(store, TWO_COSTED(), MENUS);
  assert.strictEqual(first.scope(), 'all', 'a fresh install starts at All menus');

  first.setScope('MENU_WINTER');
  assert.strictEqual(first.scope(), 'MENU_WINTER');

  const reloaded = boot(store, TWO_COSTED(), MENUS);          // <- the reload
  assert.strictEqual(reloaded.scope(), 'MENU_WINTER', 'the scope came back, it did not reset to All menus');
});

test('v97: the scope is stored device-local, under the timeframe’s own key namespace', () => {
  const store = makeStore();
  boot(store, TWO_COSTED(), MENUS).setScope('MENU_WINTER');
  const keys = Object.keys(store.raw);
  assert.deepStrictEqual(keys, ['cafeDB_dashScope'], 'exactly one key, in the cafeDB_ namespace');
  assert.strictEqual(store.raw.cafeDB_dashScope, 'MENU_WINTER',
    'the menu IDENTIFIER is stored, never its list position — the ranking moves when prices move');
});

test('v97: the scope is written on SELECTION only — not on render, not on a scope-dependent recompute', () => {
  const store = makeStore();
  const app = boot(store, TWO_COSTED(), MENUS);
  assert.deepStrictEqual(store.writes, [], 'booting and reading wrote nothing');

  app.scope(); app.scope();                                    // validation + recompute
  assert.deepStrictEqual(store.writes, [], 'validating the scope is a READ, not a write');

  app.setScope('MENU_WINTER');
  assert.deepStrictEqual(store.writes, ['cafeDB_dashScope'], 'one selection, one write');
});

test('v97: a stored id for a deleted menu falls back to All menus, with nothing surfaced', () => {
  const store = makeStore({ cafeDB_dashScope: 'MENU_GONE' });
  const app = boot(store, TWO_COSTED(), MENUS);

  assert.strictEqual(app.scope(), 'all', 'the missing menu collapses to All menus');
  assert.deepStrictEqual(app.surfaced, [], 'silently — no toast, no error');
  // The selector visibly shows All menus highlighted, which is the whole explanation the user needs.
});

test('v97: the stored id is validated at RENDER, not discarded at boot', () => {
  // menusList loads AFTER the module var initialises (Supabase bootstrap). A boot-time check would
  // throw away a perfectly valid scope while sync was still in flight, so the raw value is kept and
  // dashScopeValid() decides per render. This models exactly that: empty list first, then loaded.
  const store = makeStore({ cafeDB_dashScope: 'MENU_WINTER' });
  const stillSyncing = boot(store, [], []);
  assert.strictEqual(stillSyncing.rawScope(), 'MENU_WINTER', 'the stored id is retained…');
  assert.strictEqual(stillSyncing.scope(), 'all', '…while displaying All menus, because no row exists yet');

  const loaded = boot(store, TWO_COSTED(), MENUS);
  assert.strictEqual(loaded.scope(), 'MENU_WINTER', 'and once the menus arrive, the scope is honoured');
});

test('v97: a deleted-menu scope never computes a figure against a menu that is not there', () => {
  const store = makeStore({ cafeDB_dashScope: 'MENU_GONE' });
  const app = boot(store, TWO_COSTED(), MENUS);
  assert.strictEqual(app.scope(), 'all');
  // Guard the shape of the bug, not just its symptom: whatever scope survives validation must be
  // one the list can actually undo.
  assert.ok(app.scope() === 'all' || MENUS.some(m => m.id === app.scope()));
});

/* ============================================================ 2 — independence */

test('v97: scope and timeframe persist independently — changing one does not reset the other', () => {
  const store = makeStore();
  const a = boot(store, TWO_COSTED(), MENUS);
  a.setScope('MENU_WINTER');
  a.setRange('1y');
  assert.strictEqual(a.scope(), 'MENU_WINTER', 'setting the range left the scope alone');
  assert.strictEqual(a.range(), '1y');

  const b = boot(store, TWO_COSTED(), MENUS);
  assert.strictEqual(b.scope(), 'MENU_WINTER', 'both survived the reload…');
  assert.strictEqual(b.range(), '1y', '…independently');

  b.setScope('MENU_ORIGINAL');                                 // and the other direction
  assert.strictEqual(b.range(), '1y', 'setting the scope left the range alone');
  const c = boot(store, TWO_COSTED(), MENUS);
  assert.strictEqual(c.range(), '1y');
  assert.strictEqual(c.scope(), 'MENU_ORIGINAL');
});

test('v97: a stored range is untouched by a scope that fails validation', () => {
  const store = makeStore({ cafeDB_dashScope: 'MENU_GONE', cafeDB_dashRange: '6m' });
  const app = boot(store, TWO_COSTED(), MENUS);
  assert.strictEqual(app.scope(), 'all');
  assert.strictEqual(app.range(), '6m', 'the fallback is scoped to the scope');
});

/* ============================================================ 3 — the all-menus figure */

/* menuCompareHtml renders the row; computeAvgFoodCost is what logHistory pushes into priceHistory,
   i.e. the series the chart's all-menus line is drawn from. Same call, asserted as the same number. */
function withRows(MENU, menusList) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('MENU', 'LIST', `
    "use strict";
    var menusList = LIST;
    function plateForMenuItem(m){ return m.plate || null; }
    function costFromLines(lines){ return Number(lines) || 0; }
    function esc(s){ return (s==null?'':String(s)); }
    var DASH_ALL='all';
    var menuHistory = {}, priceHistory = [];
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'computeAvgFoodCost')}
    ${extractFn(SRC, 'menuComparisonRows')}
    ${extractFn(SRC, 'mcmpSparkHtml')}
    ${extractFn(SRC, 'mcmpSparkSeries')}
    ${extractFn(SRC, 'menuCompareHtml')}
    return {
      computeAvgFoodCost: computeAvgFoodCost,
      avgFoodCostForScope: avgFoodCostForScope,
      menuComparisonRows: menuComparisonRows,
      menuCompareHtml: menuCompareHtml
    };
  `);
  return factory(MENU, menusList);
}

// The figure shown in the All-menus row, read back off the rendered markup.
function allMenusRowPct(html) {
  const m = html.match(/data-scope="all"[\s\S]*?<span class="mcmp-pct">([^<]*)<\/span>/);
  assert.ok(m, 'the All-menus row renders a percentage cell');
  return m[1];
}

test('v97: the All-menus row shows the same figure the chart’s all-menus line is built from', () => {
  const app = withRows(TWO_COSTED(), MENUS);
  const chartFigure = app.computeAvgFoodCost();                // == what logHistory pushes into priceHistory
  assert.strictEqual(allMenusRowPct(app.menuCompareHtml('all')), chartFigure.toFixed(1) + '%',
    'one all-menus number on the screen, to the displayed precision');
});

test('v97: a plate published to two menus is counted ONCE in the all-menus figure', () => {
  // PL1 is published to BOTH menus at the same price; PL2 sits on Original alone.
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10, 'PL1'),   // 20%
    dish('MENU_WINTER', 2, 10, 'PL1'),     // 20% — the SAME plate, second publication
    dish('MENU_ORIGINAL', 5, 10, 'PL2')    // 50%
  ];
  const app = withRows(MENU, MENUS);
  assert.strictEqual(app.computeAvgFoodCost(), 35,
    'two distinct plates at 20% and 50% average 35% — not 30%, which counts PL1 twice');
  assert.strictEqual(allMenusRowPct(app.menuCompareHtml('all')), '35.0%', 'and the row agrees');
});

test('v97: publishing an existing plate to another menu does not move the all-menus figure', () => {
  // The sharpest statement of the bug: republishing changes nothing about cost, so the headline
  // must not move. Under the old per-publication mean it moved every time.
  const base = [dish('MENU_ORIGINAL', 2, 10, 'PL1'), dish('MENU_ORIGINAL', 5, 10, 'PL2')];
  const before = withRows(base, MENUS).computeAvgFoodCost();
  const after = withRows(base.concat([dish('MENU_WINTER', 2, 10, 'PL1')]), MENUS).computeAvgFoodCost();
  assert.strictEqual(after, before, 'republishing PL1 is not a food-cost event');
});

test('v97: a plate on two menus at DIFFERENT prices contributes its own mean, once', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10, 'PL1'),   // 20%
    dish('MENU_WINTER', 2, 5, 'PL1'),      // 40% — same plate, cheaper menu price
    dish('MENU_ORIGINAL', 5, 10, 'PL2')    // 50%
  ];
  const app = withRows(MENU, MENUS);
  assert.strictEqual(app.computeAvgFoodCost(), 40,
    'PL1 counts once at (20+40)/2 = 30, so the figure is (30+50)/2 = 40');
});

test('v97: per-menu figures are unchanged — a plate appears at most once on a menu', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10, 'PL1'),
    dish('MENU_WINTER', 2, 10, 'PL1'),
    dish('MENU_ORIGINAL', 5, 10, 'PL2')
  ];
  const app = withRows(MENU, MENUS);
  assert.strictEqual(app.avgFoodCostForScope('MENU_ORIGINAL'), 35, 'Original: (20+50)/2');
  assert.strictEqual(app.avgFoodCostForScope('MENU_WINTER'), 20, 'Winter: the one dish on it');
  // The grouping is one code path for both scopes precisely so these can never drift apart again.
});

test('v97: the figure is NOT mean-of-menu-averages — splitting menus must not move it', () => {
  // A three-plate specials menu weighted equally with a forty-plate main menu measures the split,
  // not the food cost. Two plates on one menu vs the same two plates on two menus: same figure.
  const together = [dish('MENU_ORIGINAL', 2, 10, 'PL1'), dish('MENU_ORIGINAL', 6, 10, 'PL2')];
  const split = [dish('MENU_ORIGINAL', 2, 10, 'PL1'), dish('MENU_WINTER', 6, 10, 'PL2')];
  assert.strictEqual(withRows(together, MENUS).computeAvgFoodCost(), 40, '(20+60)/2');
  assert.strictEqual(withRows(split, MENUS).computeAvgFoodCost(), 40, 'and reorganising the menus changes nothing');
});

test('v97: an unidentifiable plate stands alone rather than merging with every other one', () => {
  // Defensive: no id means we cannot PROVE two dishes share a plate, and collapsing them would
  // silently erase real plates from the average.
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10, undefined),
    dish('MENU_ORIGINAL', 6, 10, undefined),
    dish('MENU_WINTER', 3, 10, undefined)
  ];
  near(withRows(MENU, MENUS).computeAvgFoodCost(), (20 + 60 + 30) / 3,
    'three unidentified plates are three terms, not one');
});

/* ============================================================ 4 — stale headline */

/* The reported case: nothing costed and priced right now, but priceHistory holds points from when
   there was. dashComparisons used to substitute the last logged point for `current`. */
function withComparisons(MENU, priceHistory) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('MENU', 'HIST', `
    "use strict";
    var priceHistory = HIST, menuHistory = {}, cogsPct = 30;
    function plateForMenuItem(m){ return m.plate || null; }
    function costFromLines(lines){ return Number(lines) || 0; }
    function esc(s){ return (s==null?'':String(s)); }
    function menuNameById(id){ return 'Winter'; }
    function ptMs(h){ return new Date(h.t).getTime(); }
    var DASH_ALL='all';
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'computeAvgFoodCost')}
    ${extractFn(SRC, 'avgOf')}
    ${extractFn(SRC, 'histInRange')}
    ${extractFn(SRC, 'dashComparisons')}
    ${extractFn(SRC, 'statCard')}
    ${extractFn(SRC, 'fmtTargetPct')}
    ${extractFn(SRC, 'scopeHistory')}
    ${extractFn(SRC, 'scopeTrend')}
    ${extractFn(SRC, 'dashScopeLabel')}
    ${extractFn(SRC, 'verdictHtml')}
    return {
      dashComparisons: dashComparisons,
      statCard: statCard,
      verdictHtml: verdictHtml,
      histLength: function(){ return priceHistory.length; },
      histInRange: histInRange
    };
  `);
  return factory(MENU, priceHistory);
}

const HOUR = 3600000;
const RECENT_HISTORY = () => [
  { t: new Date(Date.now() - 72 * HOUR).toISOString(), v: 28.4 },
  { t: new Date(Date.now() - 48 * HOUR).toISOString(), v: 29.1 },
  { t: new Date(Date.now() - 24 * HOUR).toISOString(), v: 31.7 }    // the figure that used to leak through
];

test('v97 REGRESSION: nothing costed + existing history shows “—”, not the last logged figure', () => {
  const app = withComparisons([], RECENT_HISTORY());
  const cmp = app.dashComparisons();

  assert.strictEqual(cmp.current, null,
    'the headline figure is absent, not inherited from a state that no longer exists');

  const html = app.verdictHtml('all', cmp);
  assert.match(html, /verdict-num">—</, 'the headline renders an em dash');
  assert.doesNotMatch(html, /31\.7/, 'the last logged point does not leak into the headline');
  assert.match(html, /Nothing costed and priced yet/,
    'and the copy that explains it is reachable again at all-menus scope');
});

test('v97 REGRESSION: the stat cards recover too — one root cause, not one symptom', () => {
  // cmp.current is the ONE value the headline and all three cards read. A fix that only moved the
  // headline would leave the cards comparing a ghost against real history.
  const app = withComparisons([], RECENT_HISTORY());
  const cmp = app.dashComparisons();

  ['Last week', 'Last month', 'This year'].forEach(label => {
    const card = app.statCard(label, cmp.current, cmp[label === 'Last week' ? 'lastWeek' : label === 'Last month' ? 'lastMonth' : 'ytd']);
    assert.match(card, /not enough history yet/, label + ': falls to its honest empty state');
    assert.doesNotMatch(card, /31\.7|holding steady|creeping up|improving/,
      label + ': claims no comparison it cannot make');
  });
});

test('v97 REGRESSION: ytd does not baseline the missing figure against itself', () => {
  // `if(ytd==null) ytd=current` used to re-inject the ghost as its own comparison point, so
  // "vs this year" reported "holding steady" against nothing.
  const app = withComparisons([], []);
  const cmp = app.dashComparisons();
  assert.strictEqual(cmp.current, null);
  assert.strictEqual(cmp.ytd, null, 'no self-comparison');
});

test('v97: the CHART is untouched — priceHistory is a log of what WAS true', () => {
  const hist = RECENT_HISTORY();
  const app = withComparisons([], hist);
  app.dashComparisons();
  assert.strictEqual(app.histLength(), 3, 'the series still holds every point it held');
  assert.strictEqual(app.histInRange(Date.now() - 7 * 24 * HOUR, Date.now() + 1).length, 3,
    'and still draws them — drawing history is not a claim about now');
});

test('v97: with plates costed and priced, the headline is the live figure, not history', () => {
  // The other half of the contract: removing the fallback must not suppress a real figure.
  const app = withComparisons(TWO_COSTED(), RECENT_HISTORY());
  const cmp = app.dashComparisons();
  near(cmp.current, 30, '(20+40+30)/3, computed live');
  assert.match(app.verdictHtml('all', cmp), /verdict-num[^>]*">30\.0%</);
});

test('v97: the scope caption is gone from beside the headline number', () => {
  // Scope is stated once, in the card heading. dashScopeLabel itself stays alive for the Dig-in cards.
  const app = withComparisons(TWO_COSTED(), RECENT_HISTORY());
  const cmp = app.dashComparisons();
  ['all', 'MENU_WINTER'].forEach(scope => {
    const html = app.verdictHtml(scope, cmp);
    assert.doesNotMatch(html, /verdict-cap/, scope + ': no scope caption beside the number');
    assert.doesNotMatch(html, /across all menus|on Winter/, scope + ': and no scope wording either');
  });
});
