/*
 * dash-recent.test.js — 177. The Dashboard's "Recent changes" card, which names what the trend
 * chart's dots come from.
 *
 * WHY THIS FILE EXISTS. The card shipped with no coverage of any kind — the pre-push review found
 * that `recentChangeRows` had six chained guards deciding which of Max's real cost interventions
 * surface on the Dashboard, and nothing anywhere would have gone red if one of them were inverted.
 * Not a weak test: no test. The Playwright dashboard fixtures seed no `menu_change_log` at all, so
 * even the geometry specs only ever render this card's EMPTY branch.
 *
 * The functions are EXTRACTED from js/app.js and run against stubbed globals — the real shipped
 * bodies, no DOM, no Supabase. A re-implementation here would be written from the same belief as the
 * code and would agree with it about exactly the case worth catching (CLAUDE.md).
 *
 * WHAT EACH GUARD IS FOR, since none of them is decoration:
 *  · the range cutoff — the card and the chart share one range control and must not disagree about
 *    what it means, which is why both read `dashRangeCutoff` rather than each holding a day table.
 *  · `typeof` BEFORE `isFinite` — `isFinite('')` is TRUE and `Number(null)` is 0, so a null
 *    costBefore would otherwise fabricate a delta equal to the entire plate cost. This is CLAUDE.md
 *    Tier 1 and it has already cost this repo a $0.00 observation in the price history.
 *  · the 0.005 threshold — re-saving an unchanged plate hands back a value differing in the
 *    eighteenth decimal. That is a keystroke, not a decision.
 *  · the name — `plate_deleted` entries resolve to no plate, and a row that cannot say WHICH plate
 *    moved is not a row. The movement was still real; the chart's dot still draws.
 *  · the scope filter — the avg figures are all-menus (sinceLineHtml refuses to narrow them), but a
 *    COST delta is a plate's own cost and carries no scope, so `menuIds` is a real filter here and
 *    not the arithmetic the since-line declines to do.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const APP = loadApp();
const DAY = 86400000;

/* The sandbox. `now` is injected so the relative-date tests are not clock-dependent, and
   `dashRange` is a real module var the extracted cutoff reads. */
function harness(opts) {
  opts = opts || {};
  // eslint-disable-next-line no-new-func
  return new Function('NOW', 'LOG', 'PLATES', 'RANGE', `
    "use strict";
    var DASH_ALL='__all__';
    var dashRange=RANGE;
    var changeLog=LOG;
    var savedPlates=PLATES;
    var _now=NOW;
    var Date={ now:function(){ return _now; } };
    function money(n){ return '$'+Number(n).toFixed(2); }
    function sinceLineHtml(){ return '<p class="since"></p>'; }
    /* esc is EXTRACTED, not stubbed. The first draft of this file stubbed it as String(s) and the
       escaping test below proved nothing — which is the v113/v141 incident exactly: a hand-rolled
       esc that disagreed with the shipped one, twice, once missing the closing angle bracket
       entirely. CLAUDE.md's remedy is this line.
       NO BACKTICKS IN THIS COMMENT - it sits inside a template literal, and one would end it. */
    ${['esc', 'dashRangeCutoff', 'changeName', 'recentChangeRows', 'relDayLabel', 'recentChangesHtml']
      .map((n) => extractFn(APP, n)).join('\n')}
    return { rows:recentChangeRows, html:recentChangesHtml, rel:relDayLabel, name:changeName,
             cutoff:dashRangeCutoff };
  `)(opts.now || 1e12, opts.log || [], opts.plates || [], opts.range || '3m');
}

const entry = (o) => Object.assign({
  id: 'CL1', t: 1e12 - 2 * DAY, kind: 'plate_edited', plateId: 'SP1', menuIds: ['MW'],
  avgBefore: 40, avgAfter: 39, costBefore: 7.2, costAfter: 6.96, detail: { name: 'Fish & Chips' },
}, o);

/* ------------------------------------------------------------------ which entries qualify */

test('a plate whose cost moved becomes a row, signed the way the cost moved', () => {
  const app = harness({ log: [entry({}), entry({ id: 'CL2', costBefore: 6.8, costAfter: 7.2 })] });
  const rows = app.rows(null);
  assert.strictEqual(rows.length, 2);
  assert.ok(rows[0].delta < 0, 'a cost that FELL is a negative delta');
  assert.ok(rows[1].delta > 0, 'and one that rose is positive');
  assert.strictEqual(rows[0].name, 'Fish & Chips');
});

test('an entry with only ONE cost figure is dropped, not treated as a move from zero', () => {
  // dish_added / dish_price carry costAfter and no costBefore, because a sell-price change moves no
  // cost. `Number(null)` is 0, so a missing costBefore would read as "the plate went from $0.00".
  for (const missing of [{ costBefore: null }, { costAfter: null },
                         { costBefore: undefined }, { costBefore: '7.20' }, { costAfter: NaN }]) {
    const app = harness({ log: [entry(missing)] });
    assert.deepStrictEqual(app.rows(null), [], `dropped: ${JSON.stringify(missing)}`);
  }
});

test('isFinite("") is TRUE, so the empty string must be refused by the typeof guard', () => {
  // The exact Tier 1 trap, asserted directly rather than trusted: a blank reaching either figure
  // would pass an isFinite-only guard and fabricate a delta.
  assert.strictEqual(isFinite(''), true, 'the premise — if this ever changes, so can the guard');
  const app = harness({ log: [entry({ costBefore: '' })] });
  assert.deepStrictEqual(app.rows(null), [], 'and the row does not appear');
});

test('a move smaller than a cent is a keystroke, not a decision', () => {
  const app = harness({ log: [entry({ costBefore: 7.2, costAfter: 7.2039 })] });
  assert.deepStrictEqual(app.rows(null), []);
  const moved = harness({ log: [entry({ costBefore: 7.2, costAfter: 7.21 })] });
  assert.strictEqual(moved.rows(null).length, 1, 'a full cent does appear');
});

test('a row with no resolvable name is dropped — the chart still marks it, this card cannot', () => {
  const anon = entry({ detail: {}, plateId: 'GONE' });
  assert.deepStrictEqual(harness({ log: [anon] }).rows(null), [],
    'a deleted plate resolves to neither detail.name nor savedPlates');
  // …and savedPlates IS the fallback when detail.name was never written
  const viaPlate = harness({ log: [anon], plates: [{ id: 'GONE', name: 'Pumpkin Soup' }] });
  assert.strictEqual(viaPlate.rows(null)[0].name, 'Pumpkin Soup');
  assert.strictEqual(harness({ log: [entry({ detail: { name: '   ' } })] }).rows(null).length, 0,
    'a whitespace-only name is not a name');
});

/* ------------------------------------------------------------------ range and scope */

test('the card and the chart cannot disagree about what the range control means', () => {
  const log = [entry({ t: 1e12 - 2 * DAY }), entry({ id: 'CL2', t: 1e12 - 40 * DAY })];
  assert.strictEqual(harness({ log, range: '1w' }).rows(null).length, 1, 'a week excludes the older');
  assert.strictEqual(harness({ log, range: '3m' }).rows(null).length, 2, 'three months holds both');
  assert.strictEqual(harness({ range: 'all' }).cutoff(), null, "'all' is no bound, not a bound of zero");
  assert.strictEqual(harness({ log, range: 'all' }).rows(null).length, 2);
});

test('a narrowed dashboard filters on the menus the change actually touched', () => {
  const log = [entry({ menuIds: ['MW'] }), entry({ id: 'CL2', menuIds: ['MB'], detail: { name: 'Muffin' } })];
  assert.strictEqual(harness({ log }).rows('__all__').length, 2, 'all menus: both');
  const winter = harness({ log }).rows('MW');
  assert.strictEqual(winter.length, 1);
  assert.strictEqual(winter[0].name, 'Fish & Chips');
  assert.deepStrictEqual(harness({ log }).rows('MX').map((r) => r.name), [],
    'a menu nothing touched shows nothing, rather than everything');
});

test('newest first, and capped at five so the card cannot outgrow the chart beside it', () => {
  const log = Array.from({ length: 9 }, (_, i) => entry({
    id: 'CL' + i, t: 1e12 - i * DAY, detail: { name: 'P' + i },
  }));
  const rows = harness({ log }).rows(null);
  assert.strictEqual(rows.length, 5);
  assert.deepStrictEqual(rows.map((r) => r.name), ['P0', 'P1', 'P2', 'P3', 'P4']);
});

test('an entry with an unusable timestamp is dropped rather than sorted unpredictably', () => {
  assert.deepStrictEqual(harness({ log: [entry({ t: NaN })] }).rows(null), []);
  assert.deepStrictEqual(harness({ log: [null, undefined] }).rows(null), []);
});

/* ------------------------------------------------------------------ how it reads */

test('relative dates, because the row answers "how stale is this"', () => {
  const { rel } = harness({});
  const ago = (ms) => rel(1e12 - ms);
  assert.strictEqual(ago(2 * 3600000), 'today');
  assert.strictEqual(ago(1.2 * DAY), 'yesterday');
  assert.strictEqual(ago(5 * DAY), '5 days ago');
  assert.strictEqual(ago(21 * DAY), '3 weeks ago');
  assert.strictEqual(ago(7 * DAY), '7 days ago', 'a week still reads in days until the fortnight');
  assert.strictEqual(ago(120 * DAY), '4 months ago', 'and months once weeks stop being readable');
  assert.ok(!/NaN|Infinity|undefined/.test([1, 8, 15, 40, 90, 400].map((d) => ago(d * DAY)).join(' ')));
});

test('the empty state names the week only at the range where that is true', () => {
  assert.match(harness({ range: '1w' }).html(null, 40), /No changes this week/);
  assert.match(harness({ range: '3m' }).html(null, 40), /No changes in this range/,
    'at three months "this week" would name a window the card is not showing');
});

test('a cost RISE is danger and a FALL is good — the target-anchored reading, not "positive"', () => {
  // CLAUDE.md: colour on a figure is a target reading. A cost going up is bad news whatever its sign.
  const up = harness({ log: [entry({ costBefore: 6.8, costAfter: 7.2 })] }).html(null, 40);
  const down = harness({ log: [entry({})] }).html(null, 40);
  assert.match(up, /dig-v up/);
  assert.match(up, /\+\$0\.40/, 'and it is signed, so the direction reads without the colour');
  assert.match(down, /dig-v down/);
  assert.match(down, /−\$0\.24/, 'a real minus sign, not a hyphen');
});

test('the row escapes its plate name', () => {
  const app = harness({ log: [entry({ detail: { name: '<img src=x onerror=alert(1)>' } })] });
  const html = app.html(null, 40);
  assert.ok(!html.includes('<img'), 'the name goes through esc() like every other rendered string');
});
