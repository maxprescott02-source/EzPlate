/*
 * dash-persist.test.js — v97: dashboard scope persistence, the all-menus figure's definition,
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
 *   5. ⚠️ A plate published to several menus counts ONCE PER PUBLICATION, and that is a DECISION.
 *      It buys the invariant that matters more: All menus is a dish-count-weighted blend of the
 *      per-menu figures, so it cannot sit outside the range of the By-menu rows (given every counted
 *      dish has a row — an orphaned menuId is the known exception). v97 briefly
 *      counted distinct plates instead; on Max's real data that put the headline at 21.4% against
 *      rows of 21.6% and 21.7% (one plate at ~29.4% on both menus), and he reverted it. The known
 *      cost — republishing a plate moves the headline — is pinned too, so it reads as a choice.
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
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

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
    ${extractFn(SRC, 'menuIdOf')}
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

/* Food-cost percentages are floating-point means. Compare to the cent, not to the bit, exactly as
   dash-scope.test.js does. Nothing downstream sees those bits: logHistory rounds to 1dp before logging
   and every display path is toFixed(1). */
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
    var menuHistory = {}, priceHistory = [], cogsPct = 30;   // v115: sparklines colour by target now
    ${extractFn(SRC, 'menuIdOf')}
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'computeAvgFoodCost')}
    ${extractFn(SRC, 'menuComparisonRows')}
    ${extractFn(SRC, 'mcmpSparkHtml')}
    ${extractFn(SRC, 'mcmpSparkSeries')}
    ${extractFn(SRC, 'menuCompareHtml')}
    /* v129: the All-menus figure lives on the dropdown BUTTON and its popover row now. Asserting
       through dashScopeHtml keeps this pointed at the live path — dashScopeHtml is what builds the
       All-menus row and hands it to menuCompareHtml. Open, so the row is in the markup. */
    ${extractFn(SRC, 'dashPctClass')}
    ${extractFn(SRC, 'dashScopeHtml')}
    function menuNameById(id){ var m=menusList.find(function(x){return x.id===id;}); return m?m.name:''; }
    var dashMenusOpen=true;
    function esc(s){ return String(s==null?'':s); }
    function renderDashboard(){}
    return {
      computeAvgFoodCost: computeAvgFoodCost,
      avgFoodCostForScope: avgFoodCostForScope,
      menuComparisonRows: menuComparisonRows,
      menuCompareHtml: menuCompareHtml,
      dashScopeHtml: dashScopeHtml
    };
  `);
  return factory(MENU, menusList);
}

/* The figure shown in the All-menus popover row, read back off the rendered markup. The VALUE is
   what these tests are about: that the row and the chart are built from the same number. v129: the
   pct span carries a semantic colour class, so the class match is a prefix, not an exact string. */
function allMenusRowPct(html) {
  const m = html.match(/data-scope="all"[\s\S]*?<span class="mcmp-pct[^"]*">([^<]*)<\/span>/);
  assert.ok(m, 'the All-menus row renders a percentage cell');
  return m[1];
}

test('v97: the All-menus row shows the same figure the chart’s all-menus line is built from', () => {
  const app = withRows(TWO_COSTED(), MENUS);
  const chartFigure = app.computeAvgFoodCost();                // == what logHistory pushes into priceHistory
  assert.strictEqual(allMenusRowPct(app.dashScopeHtml('all')), chartFigure.toFixed(1) + '%',
    'one all-menus number on the screen, to the displayed precision');
});

test('v97: a plate on two menus counts ONCE PER PUBLICATION — deliberate, not an oversight', () => {
  /* This looks exactly like a double-counting bug and it is NOT. v97 briefly changed it to count
     distinct plates, which is arguably the truer statement about food cost — and Max reverted it on
     real data, because it broke something worth more (see the invariant test below). Anyone "fixing"
     this will make the headline contradict every By-menu row again. Read js/app.js at
     avgFoodCostForScope before touching it. */
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10, 'PL1'),   // 20%
    dish('MENU_WINTER', 2, 10, 'PL1'),     // 20% — the SAME plate, second publication
    dish('MENU_ORIGINAL', 5, 10, 'PL2')    // 50%
  ];
  const app = withRows(MENU, MENUS);
  near(app.computeAvgFoodCost(), 30, 'three publications: (20+20+50)/3 — NOT 35, which counts PL1 once');
  assert.strictEqual(allMenusRowPct(app.dashScopeHtml('all')), '30.0%', 'and the row agrees');
});

test('v97 INVARIANT: All menus always sits within the range of the By-menu rows', () => {
  /* THIS is what per-publication counting buys, and why Max chose it (29 Jul, on his own data: the
     distinct-plate figure read 21.4% against rows of 21.6% and 21.7%, because one plate at ~29.4% sat
     on both menus and lost its second copy). Counting per publication makes the headline a
     dish-count-WEIGHTED BLEND of the per-menu figures, so it cannot fall outside them — PROVIDED every
     counted dish has a row, i.e. its menuId is in menusList. A dish on a menu that no longer exists is
     the one exception; Max has none today, and it is recorded as a follow-up rather than fixed here. A headline that contradicts every row underneath it costs more trust than the
     0.19pt correction bought. Hold this invariant or the trade was for nothing. */
  const shapes = [
    // the real-data shape: one DEAR plate shared across both menus
    [dish('MENU_ORIGINAL', 4, 10, 'PL_SHARED'), dish('MENU_WINTER', 4, 10, 'PL_SHARED'),
     dish('MENU_ORIGINAL', 1, 10, 'PL_O'), dish('MENU_WINTER', 1, 10, 'PL_S')],
    // a CHEAP plate shared across both menus — the mirror case
    [dish('MENU_ORIGINAL', 1, 10, 'PL_SHARED'), dish('MENU_WINTER', 1, 10, 'PL_SHARED'),
     dish('MENU_ORIGINAL', 4, 10, 'PL_O'), dish('MENU_WINTER', 4, 10, 'PL_S')],
    // lopsided menus: many plates on one, few on the other
    [dish('MENU_ORIGINAL', 1, 10, 'A'), dish('MENU_ORIGINAL', 2, 10, 'B'),
     dish('MENU_ORIGINAL', 3, 10, 'C'), dish('MENU_WINTER', 9, 10, 'D')],
    // same plate at DIFFERENT sell prices on each menu
    [dish('MENU_ORIGINAL', 2, 10, 'PL1'), dish('MENU_WINTER', 2, 5, 'PL1'),
     dish('MENU_ORIGINAL', 5, 10, 'PL2')]
  ];
  shapes.forEach((MENU, i) => {
    const app = withRows(MENU, MENUS);
    const all = app.computeAvgFoodCost();
    const pcts = app.menuComparisonRows().map(r => r.pct);
    const lo = Math.min.apply(null, pcts), hi = Math.max.apply(null, pcts);
    assert.ok(all >= lo - 1e-9 && all <= hi + 1e-9,
      `shape ${i}: All menus ${all.toFixed(2)}% escaped the rows' range ${lo.toFixed(2)}–${hi.toFixed(2)}%`);
  });
});

test('v97 KNOWN COST: publishing an existing plate to another menu DOES move the figure', () => {
  /* The accepted price of the invariant above (Max, 29 Jul, eyes open). Republishing changes nothing
     about what anything costs, yet the headline moves. Pinned so it reads as a decision rather than a
     regression the next time someone notices it. */
  const base = [dish('MENU_ORIGINAL', 2, 10, 'PL1'), dish('MENU_ORIGINAL', 5, 10, 'PL2')];
  const before = withRows(base, MENUS).computeAvgFoodCost();
  const after = withRows(base.concat([dish('MENU_WINTER', 2, 10, 'PL1')]), MENUS).computeAvgFoodCost();
  near(before, 35, '(20+50)/2');
  near(after, 30, '(20+50+20)/3 — the second publication is a third term');
  assert.notStrictEqual(after, before, 'it moves, and that is the known, accepted cost');
});

test('v97: per-menu figures are a plain mean of that menu\'s dishes', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10, 'PL1'),
    dish('MENU_WINTER', 2, 10, 'PL1'),
    dish('MENU_ORIGINAL', 5, 10, 'PL2')
  ];
  const app = withRows(MENU, MENUS);
  near(app.avgFoodCostForScope('MENU_ORIGINAL'), 35, 'Original: (20+50)/2');
  near(app.avgFoodCostForScope('MENU_WINTER'), 20, 'Winter: the one dish on it');
});

test('v97: the figure is NOT mean-of-menu-averages — a three-plate menu must not outweigh a forty-plate one', () => {
  // The one aggregation the brief ruled out and this batch never adopted: weighting menus equally
  // measures how the menus have been SPLIT, not the food cost.
  const MENU = [
    dish('MENU_ORIGINAL', 1, 10, 'A'), dish('MENU_ORIGINAL', 1, 10, 'B'),
    dish('MENU_ORIGINAL', 1, 10, 'C'), dish('MENU_WINTER', 9, 10, 'D')
  ];
  const app = withRows(MENU, MENUS);
  near(app.computeAvgFoodCost(), (10 + 10 + 10 + 90) / 4, 'every dish is one term');
  const rows = app.menuComparisonRows().map(r => r.pct);
  assert.notStrictEqual(app.computeAvgFoodCost(), (rows[0] + rows[1]) / 2,
    'and that is NOT the mean of the two menu averages');
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
    ${extractFn(SRC, 'menuIdOf')}
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'computeAvgFoodCost')}
    ${extractFn(SRC, 'avgOf')}
    ${extractFn(SRC, 'histInRange')}
    ${extractFn(SRC, 'dashComparisons')}
    ${extractFn(SRC, 'fmtTargetPct')}
    ${extractFn(SRC, 'dashScopeLabel')}
    ${extractFn(SRC, 'verdictHtml')}
    return {
      dashComparisons: dashComparisons,
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
  /* F6 (v143): the surface changed, the contract did not. verdictHtml used to render "—" in a
     `.verdict-num`; §5's first-run state replaces that with a composed path card (bold one-liner,
     how, one primary CTA). What is under test here is unchanged and is what actually mattered:
     NO FIGURE at all, and specifically not the stale one from priceHistory. The assertions are
     rewritten to the new markup rather than deleted — a pin that only knew the old class name
     would have gone green against a card that printed 31.7%. */
  assert.match(html, /class="dash-path"/, 'the first-run path card renders in the hero\'s place');
  assert.doesNotMatch(html, /dash-hero|dh-num/, 'and the figure surface is absent, not blanked');
  assert.doesNotMatch(html, /31\.7|\d+\.\d%/, 'no figure of any kind leaks into the empty state');
  assert.match(html, /Nothing is costed and priced yet/,
    'the copy that explains it is reachable at all-menus scope');
  assert.match(html, /id="dashPathCta"/, 'and §5 asks for one primary CTA, not a dead end');
});

/* v98 revision: the "stat cards recover too" test is GONE WITH ITS SUBJECT — statCard and the
   compares block were deleted from the dashboard (Max, 31 Jul; see HANDOVER-v98). The root-cause
   half of that pin — cmp.current propagating null instead of ghosting the last logged point —
   is the surviving contract, held by the headline tests around this tombstone. A v98 pin below
   guards the deletion itself so the block cannot quietly return. */
test('v98: the compares block stays deleted from the shipped source', () => {
  assert.doesNotMatch(SRC, /function statCard/,
    'statCard must be deleted, not merely unrendered (the tombstone comment naming it is expected)');
  assert.doesNotMatch(SRC, /statCard\s*\(/,
    'and nothing may still call it');
  assert.doesNotMatch(SRC, /stat-attach|stat-lead|stat-line|stat-bit/,
    'no markup may still emit the compares block\'s classes');
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
  assert.match(app.verdictHtml('all', cmp), /dh-num[^>]*">30\.0%</);   // F6 (v143): .verdict-num → the §6 hero's .dh-num
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
