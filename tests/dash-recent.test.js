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
const { loadApp, extractFn, dateKit } = require('./_extractfn');

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
    /* 270: this was a bare object with a now() on it, which was enough while the only thing the
       sandbox asked the clock was Date.now(). fmtDate also constructs a Date to reach the local
       calendar day, and a bare object is not constructible — so the shim delegates to the real
       constructor and overrides only the reading of "now". Kept as a shim rather than removed
       because the frozen clock is what makes every threshold assertion below deterministic.
       NO BACKTICKS IN THIS COMMENT — see the esc note below; one ends the template literal. */
    /* ⚠️ globalThis.Date, NOT Date. The var below hoists to the top of this sandbox as undefined,
       so capturing plain Date here captures undefined and every construction throws — the same
       hoisting rule app-guards.md records for duplicate top-level vars, met from the other side. */
    var _RealDate=globalThis.Date;
    /* ⚠️ EVERY argument is forwarded, and that is not defensive padding. fmtDate reaches the local
       calendar day with the THREE-argument form; a shim taking only the first turned
       new Date(2026, 8, 14) into the epoch plus 2026 milliseconds, both midnights collapsed to the
       same instant, and "yesterday" came back "today" — a stub that mirrors a real function has to
       mirror its contract, tests.md's oldest rule, and an arity IS the contract. */
    var Date=class extends _RealDate {
      constructor(){ if(arguments.length) super(...arguments); else super(_now); }
      static now(){ return _now; }
    };
    function money(n){ return '$'+Number(n).toFixed(2); }
    function sinceLineHtml(){ return '<p class="since"></p>'; }
    /* esc is EXTRACTED, not stubbed. The first draft of this file stubbed it as String(s) and the
       escaping test below proved nothing — which is the v113/v141 incident exactly: a hand-rolled
       esc that disagreed with the shipped one, twice, once missing the closing angle bracket
       entirely. CLAUDE.md's remedy is this line.
       NO BACKTICKS IN THIS COMMENT - it sits inside a template literal, and one would end it. */
    ${dateKit(APP)}
    ${['esc', 'dashRangeCutoff', 'changeName', 'changeKindWord', 'recentChangeRows', 'recentChangesHtml']
      .map((n) => extractFn(APP, n)).join('\n')}
    return { rows:recentChangeRows, html:recentChangesHtml, rel:fmtDate, name:changeName,
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

/* ⚠️ REWRITTEN AT BATCH 270, NOT DELETED TO GO GREEN, AND THE OLD ASSERTIONS ARE WORTH READING.
   This pinned relDayLabel, which counted "3 weeks ago" and "4 months ago" out to any age. Item 60
   folded every date in the app into fmtDate: relative under seven days, then the date itself. So
   "21 days ago" and "4 months ago" are gone and a real date stands in their place — the row still
   answers "how stale is this", it just stops being the only screen that answers it in weeks.
   The clock is frozen at NOW, and the fixtures are built BACKWARD FROM LOCAL MIDNIGHT rather than
   from a raw offset, because fmtDate counts calendar days: 1e12 is 11:46am in this repo's timezone
   and an offset of exactly 2*DAY from a different local time of day would land on a different
   answer in a different timezone. Same fragility docs/MAINTENANCE.md records against
   tests/trend-reframe.test.js, avoided at the point of writing rather than found at midnight. */
test('under seven days it is relative; from seven it is the date (item 60)', () => {
  const { rel } = harness({});
  const NOON = new Date(2026, 8, 15, 12, 0, 0).getTime();       // 15 Sep 2026, local noon
  const at = (daysBack, hour) => new Date(2026, 8, 15 - daysBack, hour == null ? 12 : hour, 0, 0).getTime();
  const ago = (daysBack, hour) => rel(at(daysBack, hour), NOON);

  assert.strictEqual(ago(0), 'today');
  assert.strictEqual(ago(0, 1), 'today', 'still today at 1am — the boundary is the calendar day');
  assert.strictEqual(ago(1, 23), 'yesterday', 'eleven hours ago is YESTERDAY, which elapsed hours got wrong');
  assert.strictEqual(ago(2), '2 days ago');
  assert.strictEqual(ago(6), '6 days ago', 'the last relative day');
  assert.strictEqual(ago(7), '8 Sep 2026', 'seven is the switch, and it is the date rather than a week');
  assert.strictEqual(ago(21), '25 Aug 2026', 'no more "3 weeks ago"');
  assert.strictEqual(ago(400), '11 Aug 2025', 'and the year is always there, so two Augusts differ');

  // The device must not get a vote: this is the string on every phone, not the locale's idea of one.
  assert.strictEqual(rel(new Date(2026, 8, 8, 12).getTime(), NOON), '8 Sep 2026',
    'Sep, never the four-letter "Sept" en-AU and en-GB render — that is the defect item 60 names');
  assert.ok(!/NaN|Infinity|undefined/.test([1, 8, 15, 40, 90, 400].map((d) => ago(d)).join(' ')));
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


/* =============================================================================================
 * 251 / QUEUE item 55.
 *
 * ⚠️ THE ITEM'S MAIN CLAIM DOES NOT REPRODUCE, AND ITS OWN INSTRUCTION IS WHAT PROVES IT.
 * It says a sell-price rise Max made "shows +$5.00 red and a price cut green, the opposite of its
 * effect on food cost", and then says: *"Unmeasured which field the row reads for a `dish_price`
 * entry; grep `costBefore` in `logChange`'s writers first."* Measured:
 *
 *   `recentChangeRows` requires BOTH costBefore and costAfter to be finite numbers.
 *   All three `dish_price` writers pass NEITHER, or only costAfter.
 *
 * So a sell-price change can never appear in this card at all, and can never be coloured. The
 * colouring is correct for every entry that CAN render — a plate cost rise is red, which the
 * target-anchored test above already pins.
 *
 * What was real is the item's second clause: the card never said WHAT changed. These pin that.
 * ========================================================================================== */

test('251: a sell-price change cannot reach this card, so it cannot be mis-coloured', () => {
  /* The item's defect, driven: a `dish_price` entry exactly as `saveMenuEdit` writes one — a price
     RISE, with no cost figures, because a sell-price move changes no cost. */
  const api = harness({ log: [entry({
    id: 'C1', kind: 'dish_price', costBefore: null, costAfter: null,
    detail: { name: 'Fish & Chips', priceFrom: 18, priceTo: 23 },
  })] });
  assert.deepEqual(api.rows(null), [],
    'no row, so no red plus — the item describes something the filter makes unreachable');
});

test('251: …and the entries that DO render still colour by effect on food cost', () => {
  /* The counterweight, or the test above would pass against a card that renders nothing at all. */
  const api = harness({ log: [entry({ costBefore: 3, costAfter: 5 })] });
  const r = api.rows(null);
  assert.equal(r.length, 1);
  assert.ok(r[0].delta > 0, 'a plate cost RISE is a positive delta, which the renderer paints as danger');
});

test('251: the row says what kind of change it was, read from detail and not from kind alone', () => {
  /* ⚠️ TWO EVENTS, NOT THREE, AND THE FIRST DRAFT OF THIS TEST HAD A THIRD THAT CANNOT EXIST.
     It asserted a 'New plate' word using a `plate_created` entry with `costBefore: 0` — a shape no
     writer can produce. `saveCurrentPlate` picks that kind with `_isNew=(_costBefore==null)`, so a
     `plate_created` entry ALWAYS carries a null costBefore, and the filter drops it. The fixture
     violated the writer's own invariant, so the test was green about something unreachable, and it
     contradicted the "only ONE cost figure is dropped" test in this same file without saying so.
     Found by the pre-push review. The invariant is now pinned below rather than assumed. */
  const api = harness({ log: [
    entry({ id: 'B', t: 1e12 - 2 * DAY, kind: 'plate_edited', plateId: 'P2',
            costBefore: 3, costAfter: 5, detail: { name: 'Edited one' } }),
    /* ⚠️ THE SAME KIND, A DIFFERENT EVENT — 249's orphan link writes `plate_edited` too, and
       `detail.via` is the only thing that tells them apart. CLAUDE.md's "read `detail`, never
       `kind` alone" as a live case rather than a rule. */
    entry({ id: 'C', t: 1e12 - 3 * DAY, kind: 'plate_edited', plateId: 'P3',
            costBefore: 2, costAfter: 6, detail: { name: 'Linked one', via: 'orphan-link' } }),
  ] });
  assert.deepEqual(api.rows(null).map((r) => r.kindWord), ['Ingredients', 'Line linked'],
    'two events sharing one kind, still told apart');
});

test('251: a NEW plate cannot reach this card, which is why there is no word for it', () => {
  /* The reason the branch was removed, asserted rather than remembered — as the entry a real writer
     produces, not as a fixture invented to make a label appear. */
  const api = harness({ log: [entry({
    kind: 'plate_created', costBefore: null, costAfter: 4, detail: { name: 'Brand new' },
  })] });
  assert.deepEqual(api.rows(null), [], 'no costBefore, so no delta, so no row');
});

test('251: and the WRITER is what makes that true, so the day it changes something says so', () => {
  /* ⚠️ THE UNREACHABILITY IS A PROPERTY OF ANOTHER FUNCTION, and properties change. `changeKindWord`
     has no branch for `plate_created` because `saveCurrentPlate` chooses that kind exactly when
     costBefore is null. If that link is ever broken — someone defaulting `_costBefore` to 0, say —
     new plates start reaching the card UNLABELLED, which is quiet. This is the coupling check that
     names it. A source assertion, and labelled as one; the behaviour is pinned by the test above. */
  const src = extractFn(APP, 'saveCurrentPlate').replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  assert.match(src, /_isNew\s*=\s*\(_costBefore\s*==\s*null\)/,
    'plate_created is chosen exactly when there is no costBefore');
  assert.match(src, /_isNew\s*\?\s*'plate_created'\s*:\s*'plate_edited'/,
    'and that is still what picks the kind');
  assert.match(src, /costBefore\s*:\s*_costBefore/,
    'and the SAME variable is what gets logged — otherwise the two could say different things');
  /* ⚠️ AND IT IS ASSIGNED EXACTLY ONCE. The three assertions above all survive a REASSIGNMENT
     between the choice and the write (`_costBefore = _costBefore || 0`), which is precisely the
     change that would start sending new plates to the card unlabelled — I tried it, and the first
     draft of this test stayed green. Counting the assignments is what closes that. */
  const assigns = (src.match(/_costBefore\s*=(?!=)/g) || []).length;
  assert.strictEqual(assigns, 1,
    '_costBefore is set once, at the top; a second assignment can break the invariant silently');
});

test('251: a kind this cannot name says NOTHING rather than guessing', () => {
  const api = harness({ log: [entry({ kind: 'menu_deleted', costBefore: 3, costAfter: 5 })] });
  const r = api.rows(null);
  assert.equal(r.length, 1, 'the row still renders — the word is an addition, not a filter');
  assert.equal(r[0].kindWord, '',
    'and an unnamed kind is blank, so a future one cannot arrive mislabelled');
});

test('251: a malformed detail is a blank word, not a throw', () => {
  /* The guard the mutation gate found unexercised. `changeEntry` and `rowToChange` both normalise
     `detail` to an object, so a null one should be unreachable — but `changeKindWord` reads
     `d.via` and `typeof null === 'object'`, so the wrong guard here throws inside the dashboard's
     render rather than returning nothing. One line to prove it holds is cheaper than an allowance
     arguing it cannot happen. */
  /* ⚠️ THE NAME HAS TO COME FROM SOMEWHERE ELSE, or this test cannot reach the code it is about.
     `recentChangeRows` calls `changeName` FIRST and drops the row when it resolves to nothing — and
     a null `detail` loses `detail.name` too, so the row never gets as far as the word. The first
     draft did exactly that and the mutant survived it. `savedPlates` is the other name source. */
  for (const bad of [null, undefined, 'a string', 42]) {
    const api = harness({
      log: [entry({ plateId: 'SP1', kind: 'plate_edited', costBefore: 3, costAfter: 5, detail: bad })],
      plates: [{ id: 'SP1', name: 'Fish & Chips' }],
    });
    const r = api.rows(null);
    assert.equal(r.length, 1, JSON.stringify(bad) + ' must still render — the name came from the plate');
    assert.equal(r[0].kindWord, 'Ingredients', 'and the kind still names itself without a usable detail');
  }
});

test('251: the word reaches the markup, before the relative day', () => {
  const api = harness({ log: [entry({ kind: 'plate_edited', costBefore: 0, costAfter: 4 })] });
  const html = api.html(null, 30);
  assert.match(html, /Ingredients/, 'the word is on screen, not just in the row object');
  assert.match(html, /Ingredients\s*·/, 'and sits before the relative day, separated');
});
