/*
 * dash-scope.test.js — v89 Dashboard stage 1: scope-aware aggregation + the By-menu list.
 *
 * The contracts this pins:
 *   1. avgFoodCostForScope('all') reproduces the pre-v89 all-menus figure EXACTLY. This is the one
 *      that matters most — the trend line, the stat cards and every logged history point are still
 *      computed through this path, so a regression here silently rewrites the app's headline number.
 *   2. Selecting a menu narrows to THAT menu's dishes, not all of them.
 *   3. menuComparisonRows() ranks by average food cost %, lowest (best) first, and EXCLUDES menus
 *      with no costed plates rather than showing them as 0%.
 *   4. The By-menu list is not rendered when fewer than two menus have costed plates, and a narrowed
 *      scope cannot outlive it (v96 — the list is now the ONLY control that can undo the narrowing).
 *   5. v96: the list IS the selector. "All menus" leads it as a real row, the separate picker is gone,
 *      and selecting never reorders the ranking.
 *
 * All of them run the REAL shipped functions, brace-extracted from js/app.js against injected state,
 * so there is no second copy to drift.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`dash-scope: function not found -> ${name}. app.js changed; update tests/dash-scope.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`dash-scope: unbalanced braces for ${name}`);
}

/* The real functions, bound to injected data. plateForMenuItem/costFromLines are stubbed to the
   simplest honest thing — a dish carries its plate's line cost — because what's under test is the
   SCOPING and the RANKING, not the costing maths (pricing.test.js owns that). */
function withState(MENU, menusList, cogsPct) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('MENU', 'LIST', 'COGS', `
    "use strict";
    var menusList = LIST;
    var cogsPct = COGS;
    function plateForMenuItem(m){ return m.plate || null; }
    function costFromLines(lines){ return Number(lines) || 0; }
    function esc(s){ return (s==null?'':String(s)); }
    function menuNameById(id){ var m=menusList.find(function(x){return x.id===(id||'MENU_ORIGINAL');}); return m?m.name:'Original menu'; }
    ${extractFn(SRC, 'avgFoodCostForScope')}
    ${extractFn(SRC, 'computeAvgFoodCost')}
    ${extractFn(SRC, 'menuComparisonRows')}
    var menuHistory = {};   // v95: the sparkline helper reads per-menu history; empty here — sparklines are not under test
    var priceHistory = [];  // v96: and the All-menus row's spark reads this one. Also empty, same reason.
    ${extractFn(SRC, 'mcmpSparkHtml')}
    ${extractFn(SRC, 'mcmpSparkSeries')}
    ${extractFn(SRC, 'menuCompareHtml')}
    ${extractFn(SRC, 'dashScopeValid')}
    var DASH_ALL='all';
    var dashScope=DASH_ALL;
    function setScope(s){ dashScope=s; }
    return {
      avgFoodCostForScope: avgFoodCostForScope,
      computeAvgFoodCost: computeAvgFoodCost,
      menuComparisonRows: menuComparisonRows,
      menuCompareHtml: menuCompareHtml,
      dashScopeValid: dashScopeValid,
      setScope: setScope
    };
  `);
  return factory(MENU, menusList, cogsPct == null ? 30 : cogsPct);
}

// Food-cost percentages are floating-point means; compare to the cent, not to the bit.
function near(actual, expected, msg) {
  assert.ok(actual != null && Math.abs(actual - expected) < 1e-9,
    (msg || 'value') + ': expected ~' + expected + ', got ' + actual);
}

// A dish costing `cost` and selling for `price` on menu `menuId`. 4/10 = a 40% food cost.
function dish(menuId, cost, price) {
  return { menuId: menuId, price: price, plate: { lines: cost } };
}

const MENUS = [
  { id: 'MENU_ORIGINAL', name: 'Original' },
  { id: 'MENU_WINTER', name: 'Winter' }
];

test('all-menus scope reproduces the pre-v89 figure exactly', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10),   // 20%
    dish('MENU_ORIGINAL', 4, 10),   // 40%
    dish('MENU_WINTER', 6, 10)      // 60%
  ];
  const app = withState(MENU, MENUS);
  // the old maths: mean of every costed, priced dish's cost/price, regardless of menu
  near(app.avgFoodCostForScope('all'), 40, 'all-menus mean of 20/40/60');
  near(app.computeAvgFoodCost(), 40, 'computeAvgFoodCost must still be the all-menus figure');
});

test('a falsy scope is treated as all menus (defensive: never silently returns one menu)', () => {
  const MENU = [dish('MENU_ORIGINAL', 2, 10), dish('MENU_WINTER', 6, 10)];
  const app = withState(MENU, MENUS);
  near(app.avgFoodCostForScope(null), 40, 'null scope');
  near(app.avgFoodCostForScope(undefined), 40, 'undefined scope');
});

test('selecting a menu narrows to that menu only', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 2, 10),   // 20%
    dish('MENU_ORIGINAL', 4, 10),   // 40%
    dish('MENU_WINTER', 6, 10)      // 60%
  ];
  const app = withState(MENU, MENUS);
  near(app.avgFoodCostForScope('MENU_ORIGINAL'), 30, 'mean of 20 and 40');
  near(app.avgFoodCostForScope('MENU_WINTER'), 60, 'the single Winter dish');
  assert.notStrictEqual(app.avgFoodCostForScope('MENU_WINTER'), app.avgFoodCostForScope('all'));
});

test('a dish with no menuId counts as MENU_ORIGINAL (the app-wide default)', () => {
  const MENU = [{ menuId: null, price: 10, plate: { lines: 3 } }];
  const app = withState(MENU, MENUS);
  near(app.avgFoodCostForScope('MENU_ORIGINAL'), 30, 'a dish with no menuId');
});

test('unpriced and uncosted dishes are excluded from every scope', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 4, 10),        // 40% — counts
    dish('MENU_ORIGINAL', 4, 0),         // no sell price
    { menuId: 'MENU_ORIGINAL', price: 10, plate: null },   // no plate
    dish('MENU_ORIGINAL', 0, 10)         // zero cost
  ];
  const app = withState(MENU, MENUS);
  near(app.avgFoodCostForScope('MENU_ORIGINAL'), 40, 'only the costed, priced dish counts');
});

test('a scope with nothing costed returns null, never zero', () => {
  const app = withState([dish('MENU_ORIGINAL', 4, 10)], MENUS);
  assert.strictEqual(app.avgFoodCostForScope('MENU_WINTER'), null);
});

test('comparison list is ordered best (lowest food cost %) first', () => {
  const MENU = [
    dish('MENU_ORIGINAL', 4, 10),   // Original 40%
    dish('MENU_WINTER', 2, 10)      // Winter 20%
  ];
  const rows = withState(MENU, MENUS).menuComparisonRows();
  assert.deepStrictEqual(rows.map(r => r.id), ['MENU_WINTER', 'MENU_ORIGINAL']);
  near(rows[0].pct, 20, 'Winter'); near(rows[1].pct, 40, 'Original');
});

test('comparison list excludes menus with no costed plates', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10)];     // nothing on Winter
  const rows = withState(MENU, MENUS).menuComparisonRows();
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].id, 'MENU_ORIGINAL');
});

test('ties break on name, so the order cannot jitter between renders', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 4, 10)];
  const rows = withState(MENU, MENUS).menuComparisonRows();
  assert.deepStrictEqual(rows.map(r => r.name), ['Original', 'Winter']);
});

/* ---- v96: the list IS the selector ----
   The separate picker chip is deleted. These pin what replaced it: one control, "All menus" as a real
   first row, and rows that are genuine buttons rather than divs with click handlers. */
test('v96: the separate scope picker is gone from the shipped source', () => {
  // Matches a DEFINITION or a CALL, not a mention: the tombstone comment naming the deleted function
  // is deliberate — it is what someone grepping the old name should find.
  assert.doesNotMatch(SRC, /function dashScopeSelectorHtml/,
    'the picker function must be deleted, not merely unrendered');
  assert.doesNotMatch(SRC, /dashScopeSelectorHtml\s*\(/,
    'and nothing may still call it');
  assert.doesNotMatch(SRC, /dashScopeSelect\b/,
    'nothing may still wire or query the old <select> by id');
});

test('v96: All menus is the FIRST row of the list, and is a selectable scope', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const html = withState(MENU, MENUS).menuCompareHtml('all');
  assert.match(html, /data-scope="all"/, 'All menus is a row, not an implicit fallback');
  const first = html.indexOf('data-scope="all"');
  const others = [html.indexOf('data-scope="MENU_ORIGINAL"'), html.indexOf('data-scope="MENU_WINTER"')];
  others.forEach(i => assert.ok(first < i, 'All menus leads the list'));
  assert.match(html, /data-scope="all" aria-current="true"/, 'and marks itself when it is the scope');
});

test('v96: All menus carries the all-menus average, not a blank or a menu figure', () => {
  // Original: cost 4 / price 10 = 40%. Winter: 2 / 10 = 20%. Across both dishes: 30%.
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const html = withState(MENU, MENUS).menuCompareHtml('all');
  const allRow = html.slice(html.indexOf('data-scope="all"'), html.indexOf('data-scope="MENU_'));
  assert.match(allRow, /30\.0%/, 'the All-menus row shows the whole-business average');
});

test('v96: rows are real buttons, not divs with click handlers', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const html = withState(MENU, MENUS).menuCompareHtml('all');
  const rows = html.match(/<button type="button" class="mcmp-row/g) || [];
  assert.strictEqual(rows.length, 3, 'All menus + two costed menus, every one a <button>');
  assert.doesNotMatch(html, /<div[^>]*class="mcmp-row/, 'no div masquerading as a control');
});

test('v96: selecting a menu does not reorder the list', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const order = h => (h.match(/data-scope="([^"]+)"/g) || []);
  const onAll = order(withState(MENU, MENUS).menuCompareHtml('all'));
  const onWinter = order(withState(MENU, MENUS).menuCompareHtml('MENU_WINTER'));
  const onOriginal = order(withState(MENU, MENUS).menuCompareHtml('MENU_ORIGINAL'));
  assert.deepStrictEqual(onWinter, onAll, 'ranking is independent of the selection');
  assert.deepStrictEqual(onOriginal, onAll);
  // and the ranking itself is unchanged by v96: lowest food cost % first, All menus excluded from it
  assert.deepStrictEqual(onAll, ['data-scope="all"', 'data-scope="MENU_WINTER"', 'data-scope="MENU_ORIGINAL"']);
});

test('v96: a menu with nothing costed is not a row, so it is not a reachable scope', () => {
  // Three menus, two costed. The third was selectable in the old picker; it never had a row here.
  const THREE = MENUS.concat({ id: 'MENU_EMPTY', name: 'Empty' });
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const app = withState(MENU, THREE);
  assert.doesNotMatch(app.menuCompareHtml('all'), /MENU_EMPTY/);
  app.setScope('MENU_EMPTY');
  assert.strictEqual(app.dashScopeValid(), 'all', 'and a scope with no row collapses to all-menus');
});

test('the By-menu list needs two costed menus, not merely two menus', () => {
  const app = withState([dish('MENU_ORIGINAL', 4, 10)], MENUS);   // two menus, one costed
  assert.strictEqual(app.menuCompareHtml('all'), '');
});

test('the By-menu list marks the selected menu for assistive tech', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const html = withState(MENU, MENUS).menuCompareHtml('MENU_WINTER');
  assert.match(html, /data-scope="MENU_WINTER" aria-current="true"/);
  assert.strictEqual((html.match(/aria-current/g) || []).length, 1, 'exactly one current row');
});

test('the By-menu list states the basis of its ranking and claims no profit knowledge', () => {
  const MENU = [dish('MENU_ORIGINAL', 4, 10), dish('MENU_WINTER', 2, 10)];
  const html = withState(MENU, MENUS).menuCompareHtml('all');
  assert.match(html, /Ranked by average food cost %/, 'the basis is explicit');
  assert.match(html, /no sales figures/, 'the volume limitation is stated, not implied');
  assert.doesNotMatch(html, /profit|earns the most|makes the most|revenue/i,
    'EzPlate has no volume data — it can never rank menus by what they earn');
});

/* ---- CodeRabbit v89: the narrowed-scope trap ----
   The selector is hidden below two menus. If a scope could stay narrowed in that state there would be
   no visible way back to "All menus" — reachable by deleting one of two menus while the dashboard was
   scoped to the survivor. The invariant pinned here: a narrowed scope exists only while the control does. */
test('a narrowed scope collapses to all-menus once fewer than two menus remain', () => {
  const one = [{ id: 'MENU_WINTER', name: 'Winter' }];
  const app = withState([dish('MENU_WINTER', 4, 10)], one);
  app.setScope('MENU_WINTER');
  assert.strictEqual(app.dashScopeValid(), 'all', 'no control on screen -> no narrowed scope');
  assert.strictEqual(app.menuCompareHtml(app.dashScopeValid()), '', 'and still no dead control');
});

/* v96 sharpens the same invariant. The control moved from the picker (rendered per MENU) to the list
   (rendered per COSTED menu), so the trap now has a third shape the picker never had: two menus exist,
   the scope is one of them, and the other's last costed plate goes away. The list stops rendering —
   and so the scope must stop being narrowed, or it is stranded with nothing to press. */
test('v96: a narrowed scope collapses when the LIST stops rendering, not merely when a menu is deleted', () => {
  const app = withState([dish('MENU_WINTER', 4, 10)], MENUS);   // two menus exist, only one is costed
  app.setScope('MENU_WINTER');
  assert.strictEqual(app.menuCompareHtml('MENU_WINTER'), '', 'one costed menu -> no list');
  assert.strictEqual(app.dashScopeValid(), 'all', '-> and therefore no narrowed scope');
});

test('a scope whose menu was deleted collapses to all-menus', () => {
  const app = withState([dish('MENU_ORIGINAL', 4, 10)], MENUS.concat({ id: 'MENU_X', name: 'Extra' }));
  app.setScope('MENU_GONE');
  assert.strictEqual(app.dashScopeValid(), 'all');
});

test('a live scope survives while two or more menus are costed', () => {
  const app = withState([dish('MENU_WINTER', 4, 10), dish('MENU_ORIGINAL', 2, 10)], MENUS);
  app.setScope('MENU_WINTER');
  assert.strictEqual(app.dashScopeValid(), 'MENU_WINTER');
});

/* ---- CodeRabbit v89: per-menu points logged offline must survive the next sync ----
   pushWrite drops writes silently when fully offline (CLAUDE.md, known gap), so a point can exist only
   in localStorage. The bootstrap merge is what stops the next sync deleting it. */
test('bootstrap merge keeps local-only points and de-dupes on timestamp', () => {
  // the REAL shipped merge, brace-extracted — no second copy to drift
  // eslint-disable-next-line no-new-func
  const merge = new Function(`
    "use strict";
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'mergeMenuHistory')}
    return mergeMenuHistory;
  `)();

  const shared = '2026-07-20T00:00:00.000Z';
  // the server has the shared point (a number — the shape Supabase rows arrive in) plus one of its own
  const server = { M1: [{ t: new Date(shared).getTime(), v: 30 }, { t: new Date('2026-07-25T00:00:00.000Z').getTime(), v: 31 }] };
  // local has the same shared point (an ISO string — the shape this device writes) plus one that never landed
  const local = { M1: [{ t: shared, v: 30 }, { t: '2026-07-26T00:00:00.000Z', v: 33 }] };

  const out = merge(server, local);
  assert.strictEqual(out.M1.length, 3, 'the shared point is not duplicated across the two time formats');
  assert.deepStrictEqual(out.M1.map(p => p.v), [30, 31, 33], 'the offline-only point survives, in time order');
});

test('bootstrap merge keeps a whole series the server has never seen', () => {
  // eslint-disable-next-line no-new-func
  const merge = new Function(`
    "use strict";
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'mergeMenuHistory')}
    return mergeMenuHistory;
  `)();
  const out = merge({}, { M9: [{ t: '2026-07-26T00:00:00.000Z', v: 44 }] });
  assert.deepStrictEqual(out.M9.map(p => p.v), [44]);
});

test('bootstrap merge does not mutate the arrays it was given', () => {
  // eslint-disable-next-line no-new-func
  const merge = new Function(`
    "use strict";
    ${extractFn(SRC, 'ptMs')}
    ${extractFn(SRC, 'mergeMenuHistory')}
    return mergeMenuHistory;
  `)();
  const server = { M1: [{ t: 1000, v: 30 }] };
  merge(server, { M1: [{ t: 2000, v: 31 }] });
  assert.strictEqual(server.M1.length, 1, 'the caller\'s server array is untouched');
});
