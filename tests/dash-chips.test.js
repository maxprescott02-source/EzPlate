/*
 * dash-chips.test.js (v120, Q2 dashboard redesign) — the scope chips.
 *
 * The chips REPLACE the By-menu card as the dashboard's scope control. They are the same control:
 * same `.mcmp-row` class, same `data-scope`, same delegate. What is new and therefore pinned here:
 *
 *   1. the collapse rule — up to five costed menus enumerate; six or more show All + two + "N more",
 *   2. the promoted two are the WORST performers, not the design's "two most-used" (EzPlate has no
 *      sales volume — Rule C — so a usage proxy would imply exactly the profit impact that rule
 *      forbids; worst-first is what the panel's own honesty note already claims),
 *   3. uncosted menus never appear, at any size,
 *   4. the honesty note rides with the chips at every size — with the full list behind a disclosure
 *      it would otherwise vanish for anyone who never opens it,
 *   5. the disclosure lists exactly the menus that did NOT get a chip, and no All-menus row.
 *
 * Plus a CASCADE GUARD. `.mcmp-row` is defined LATER in style.css than the v120 chip block, so a
 * bare `.dash-chip` selector ties on specificity and LOSES on source order — which is exactly what
 * happened first time and shipped full-width borderless rows through a green suite. Same trap as
 * v119's builder takeover, one screen over, which is why it is pinned rather than remembered.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

function extractFn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('function not found -> ' + name + '. app.js changed; update tests/dash-chips.test.js');
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error('unbalanced braces for ' + name);
}

/* `pcts` maps menu name -> average food cost %, or null for an uncosted menu. */
function harness(pcts, opts = {}) {
  const factory = new Function('FIX', `
    "use strict";
    var DASH_ALL='all';
    var menusList=FIX.menus, PCT=FIX.pcts;
    var dashMenusOpen=FIX.open;
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
    function avgFoodCostForScope(id){ var v=PCT[id]; return v==null?null:v; }
    function computeAvgFoodCost(){ return FIX.all; }
    function mcmpSparkHtml(){ return '<svg class="mcmp-spark"></svg>'; }
    function renderDashboard(){}
    ${extractFn(APP, 'menuComparisonRows')}
    ${extractFn(APP, 'dashChipHtml')}
    ${extractFn(APP, 'menuCompareHtml')}
    ${extractFn(APP, 'dashChipsHtml')}
    return { dashChipsHtml:dashChipsHtml };
  `);
  const menus = Object.keys(pcts).map((n) => ({ id: 'M_' + n, name: n }));
  const byId = {};
  menus.forEach((m) => { byId[m.id] = pcts[m.name]; });
  return factory({ menus, pcts: byId, all: opts.all == null ? 41.2 : opts.all, open: !!opts.open });
}

const chipNames = (html) => [...html.matchAll(/class="mcmp-row dash-chip[^"]*"[^>]*>\s*<span class="mcmp-name">([^<]*)</g)]
  .map((m) => m[1]);
const popNames = (html) => {
  const i = html.indexOf('dash-menus-pop');
  if (i < 0) return [];
  return [...html.slice(i).matchAll(/class="mcmp-name">([^<]*)</g)].map((m) => m[1]);
};

test('five costed menus enumerate — every one gets a chip, no disclosure', () => {
  const H = harness({ A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2 });
  const html = H.dashChipsHtml('all');
  assert.deepEqual(chipNames(html), ['All menus', 'A', 'B', 'C', 'D', 'E']);
  assert.ok(!/dash-more/.test(html), 'five or fewer must not collapse');
});

test('six costed menus collapse to All + the two WORST + an "N more" disclosure', () => {
  const H = harness({ A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2, F: 28.9 });
  const html = H.dashChipsHtml('all');
  assert.deepEqual(chipNames(html), ['All menus', 'A', 'B'],
    'the promoted pair is the two highest food cost %, matching the ranking the note claims');
  assert.match(html, /dash-more[^>]*>4 more/, 'four menus are left behind the disclosure');
});

test('uncosted menus are unreachable as a scope, at either size', () => {
  const small = harness({ A: 44.1, B: 42.7, Ghost: null });
  assert.deepEqual(chipNames(small.dashChipsHtml('all')), ['All menus', 'A', 'B']);
  const big = harness({ A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2, F: 28.9, Ghost: null });
  const html = big.dashChipsHtml('all');
  assert.ok(!/Ghost/.test(html), 'an uncosted menu has no cost efficiency to rank and must not appear');
  assert.match(html, /dash-more[^>]*>4 more/, 'and it must not be counted in the "N more" total either');
});

test('the honesty note rides with the chips whether or not the list is open', () => {
  for (const open of [false, true]) {
    const H = harness({ A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2, F: 28.9 }, { open });
    const html = H.dashChipsHtml('all');
    assert.match(html, /Ranked by average food cost %/, 'open=' + open);
    assert.match(html, /no sales figures/, 'Rule C statement, open=' + open);
  }
});

test('the disclosure lists exactly the menus that did NOT get a chip, and leads with no All row', () => {
  const H = harness({ A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2, F: 28.9 }, { open: true });
  const html = H.dashChipsHtml('all');
  assert.deepEqual(popNames(html), ['C', 'D', 'E', 'F'],
    'the two promoted menus must not appear twice, and the list stays worst-first');
  /* The popover's HEADING reads "All menus · ranked by food cost %" — that is the design's wording
     for the list, not a row. What must not exist is a selectable All-menus ROW: it is already a
     chip, and offering it twice is the two-controls-one-value problem v96 removed. */
  const pop = html.slice(html.indexOf('dash-menus-pop'));
  assert.ok(!/data-scope="all"/.test(pop), 'no selectable All-menus row inside the disclosure');
  assert.match(html, /dmp-head">All menus · ranked by food cost %/, 'the heading itself is expected');
});

test('closed disclosure renders no list at all', () => {
  const H = harness({ A: 44.1, B: 42.7, C: 40.6, D: 39.8, E: 31.2, F: 28.9 }, { open: false });
  assert.ok(!/dash-menus-pop/.test(H.dashChipsHtml('all')));
});

test('one costed menu shows no chip row — the headline already says it', () => {
  assert.strictEqual(harness({ A: 44.1 }).dashChipsHtml('all'), '');
});

test('the selected scope is the only chip marked current', () => {
  const H = harness({ A: 44.1, B: 42.7 });
  const html = H.dashChipsHtml('M_A');
  assert.strictEqual((html.match(/aria-current="true"/g) || []).length, 1);
  assert.match(html, /data-scope="M_A"[^>]*aria-current="true"/);
});

/* ------------------------------------------------------------------ cascade guard */

test('the chip rules out-specify .mcmp-row, which is defined later in the sheet', () => {
  const stripped = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const chip = stripped.indexOf('.dash-chips .dash-chip{');
  const row = stripped.search(/(^|[},])\s*\.mcmp-row\{/m);
  assert.ok(chip > -1, 'expected the descendant-form chip rule `.dash-chips .dash-chip{`');
  assert.ok(row > -1, 'expected the base `.mcmp-row{` rule');
  assert.ok(row > chip,
    '.mcmp-row now comes BEFORE the chip block, so the extra specificity may no longer be needed — ' +
    're-check rather than leaving it as cargo');
  /* The chip selector carries two classes to .mcmp-row's one. A bare `.dash-chip` would tie and,
     coming first, lose every shared property (width, border, background, padding, font). */
  assert.ok(!/(^|[},])\s*\.dash-chip\{/m.test(stripped),
    'a bare `.dash-chip{...}` rule is the losing form — keep the descendant selector');
});
