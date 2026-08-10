/*
 * dash-dropdown.test.js (v129) — the dashboard scope DROPDOWN.
 *
 * The v120 scope chips were REVERSED by Max on 9 Aug 2026: one button right of the verdict
 * ("All menus 41.2 ▾") opening the ranked list. This file replaces dash-chips.test.js — the
 * chips' collapse rule (≤5 enumerate / 6+ promote the worst two) died with the chips, so its
 * pins died with it, on purpose. What is pinned now:
 *
 *   1. the button carries the CURRENT scope's name and its food-cost %, whatever the scope,
 *   2. the popover leads with a selectable All-menus row, then every costed menu worst-first —
 *      no collapse at any count (that was the chips' rule, not the dropdown's),
 *   3. uncosted menus never appear,
 *   4. the % figures carry the v115 anchor-to-target colour pair (good at-or-under, bad over) —
 *      binary, matching the chart/sparklines/headline; the mock's third amber tier is deliberately
 *      not taken (one control does not fork the dashboard's colour language),
 *   5. the honesty note lives INSIDE the popover — the ranking it qualifies is entirely behind
 *      the button now, so the note sits with the ranking,
 *   6. closed dropdown renders no list; fewer than two costed menus render no control at all
 *      (the scope-collapse invariants riding on that are in dash-scope.test.js).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const APP = loadApp();

/* `pcts` maps menu name -> average food cost %, or null for an uncosted menu. */
function harness(pcts, opts = {}) {
  const factory = new Function('FIX', `
    "use strict";
    var DASH_ALL='all';
    var cogsPct=FIX.target;
    var menusList=FIX.menus, PCT=FIX.pcts;
    var dashMenusOpen=FIX.open;
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
    function avgFoodCostForScope(id){ var v=PCT[id]; return v==null?null:v; }
    function computeAvgFoodCost(){ return FIX.all; }
    function menuNameById(id){ var m=menusList.find(function(x){return x.id===id;}); return m?m.name:''; }
    function mcmpSparkHtml(){ return '<svg class="mcmp-spark"></svg>'; }
    function renderDashboard(){}
    ${extractFn(APP, 'menuComparisonRows')}
    ${extractFn(APP, 'dashPctClass')}
    ${extractFn(APP, 'menuCompareHtml')}
    ${extractFn(APP, 'dashScopeHtml')}
    return { dashScopeHtml:dashScopeHtml };
  `);
  const menus = Object.keys(pcts).map((n) => ({ id: 'M_' + n, name: n }));
  const byId = {};
  menus.forEach((m) => { byId[m.id] = pcts[m.name]; });
  return factory({ menus, pcts: byId, all: opts.all == null ? 41.2 : opts.all,
    open: !!opts.open, target: opts.target == null ? 40 : opts.target });
}

const SIX = { A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2, F: 28.9 };

const btnOf = (html) => {
  const m = html.match(/<button type="button" class="dash-scope-btn"[\s\S]*?<\/button>/);
  return m ? m[0] : '';
};
const popNames = (html) => {
  const i = html.indexOf('dash-menus-pop');
  if (i < 0) return [];
  return [...html.slice(i).matchAll(/class="mcmp-name">([^<]*)</g)].map((m) => m[1]);
};

test('the button carries the current scope name and its figure — all-menus scope', () => {
  const html = harness(SIX).dashScopeHtml('all');
  const btn = btnOf(html);
  assert.match(btn, /dsb-name">All menus</, 'the scope name');
  assert.match(btn, /mcmp-pct[^"]*">41\.2</, 'the all-menus average');
  assert.match(btn, /aria-expanded="false"/);
  assert.doesNotMatch(btn, /aria-haspopup/,
    'the layer is a group of plain buttons, not a menu — aria-expanded alone is the honest signal');
  assert.match(btn, /aria-label="Dashboard scope: All menus, 41\.2% food cost"/,
    'the label carries the figure the colour encodes — a screen reader hears what the tint shows');
});

test('the button follows a narrowed scope — name and that menu\'s own figure', () => {
  const btn = btnOf(harness(SIX).dashScopeHtml('M_C'));
  assert.match(btn, /dsb-name">C</);
  assert.match(btn, /mcmp-pct[^"]*">40\.6</, 'the menu\'s figure, not the all-menus average');
});

test('the popover leads with a selectable All-menus row, then every costed menu worst-first', () => {
  const html = harness(SIX, { open: true }).dashScopeHtml('all');
  assert.deepEqual(popNames(html), ['All menus', 'A', 'B', 'C', 'D', 'E', 'F'],
    'no collapse at any count — the ≤5/6+ rule died with the chips');
  const pop = html.slice(html.indexOf('dash-menus-pop'));
  assert.match(pop, /data-scope="all"[^>]*aria-current="true"/, 'All menus is selectable and marked current');
});

test('uncosted menus never appear — not in the popover, never as the button', () => {
  const html = harness({ A: 44.1, B: 42.7, Ghost: null }, { open: true }).dashScopeHtml('all');
  assert.ok(!/Ghost/.test(html), 'an uncosted menu has no cost efficiency to rank');
});

test('every figure carries the anchor-to-target pair: good at-or-under, bad over', () => {
  // target 40: A/B/C over -> bad; D/E/F under -> good; all-menus 41.2 -> bad
  const html = harness(SIX, { open: true }).dashScopeHtml('all');
  assert.match(btnOf(html), /mcmp-pct bad">41\.2</, 'the button figure is coloured too');
  const pop = html.slice(html.indexOf('dash-menus-pop'));
  for (const [pct, cls] of [['44.1', 'bad'], ['42.7', 'bad'], ['40.6', 'bad'],
                            ['39.8', 'good'], ['31.2', 'good'], ['28.9', 'good']]) {
    assert.match(pop, new RegExp('mcmp-pct ' + cls + '">' + pct.replace('.', '\\.') + '%'),
      pct + ' should be ' + cls + ' against a 40% target');
  }
  assert.ok(!/mcmp-pct warn/.test(html), 'binary on purpose — no third tier');
});

test('the honesty note lives inside the popover, with the ranking it qualifies', () => {
  const open = harness(SIX, { open: true }).dashScopeHtml('all');
  const pop = open.slice(open.indexOf('dash-menus-pop'));
  assert.match(pop, /Ranked by average food cost %/, 'the basis is explicit');
  assert.match(pop, /no sales figures/, 'the Rule C statement');
  assert.doesNotMatch(pop, /profit|earns the most|makes the most|revenue/i,
    'EzPlate has no volume data — it can never rank menus by what they earn');
  const closed = harness(SIX, { open: false }).dashScopeHtml('all');
  assert.ok(!/mcmp-note/.test(closed),
    'closed, the note is absent WITH the ranking — a note beside a button that ranks nothing');
});

test('closed dropdown renders the button and no list', () => {
  const html = harness(SIX, { open: false }).dashScopeHtml('all');
  assert.match(html, /dash-scope-btn/);
  assert.ok(!/dash-menus-pop/.test(html));
});

test('open dropdown says so on the button', () => {
  assert.match(btnOf(harness(SIX, { open: true }).dashScopeHtml('all')), /aria-expanded="true"/);
});

test('one costed menu renders no control — the headline already says it', () => {
  assert.strictEqual(harness({ A: 44.1 }).dashScopeHtml('all'), '');
});

test('the selected scope is the only row marked current', () => {
  const html = harness(SIX, { open: true }).dashScopeHtml('M_A');
  assert.strictEqual((html.match(/aria-current="true"/g) || []).length, 1);
  assert.match(html, /data-scope="M_A"[^>]*aria-current="true"/);
});

test('dashPctClass: the epsilon holds at the boundary, and a missing figure is NEUTRAL', () => {
  const factory = new Function('COGS', `
    "use strict";
    var cogsPct=COGS;
    ${extractFn(APP, 'dashPctClass')}
    return dashPctClass;
  `);
  const cls = factory(40);
  assert.strictEqual(cls(40.0), 'good', 'bang on target is good');
  // the +0.05 epsilon is the SAME one verdictHtml and the sparklines use — the three must agree,
  // and this is the only pin that fails if the epsilon is dropped from this one
  assert.strictEqual(cls(40.05), 'good', 'inside the epsilon is still good');
  assert.strictEqual(cls(40.1), 'bad', 'past the epsilon is bad');
  assert.strictEqual(cls(null), '', "a missing figure gets NO verdict class — the isFinite('') shape");
});

test('the chips are gone from the shipped source, not merely unrendered', () => {
  assert.doesNotMatch(APP, /function dashChipHtml|function dashChipsHtml/,
    'the chip renderers must be deleted');
  assert.doesNotMatch(APP, /dashChipsHtml\s*\(|dashChipHtml\s*\(/, 'and nothing may still call them');
});
