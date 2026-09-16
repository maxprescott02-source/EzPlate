/*
 * add-dish-picker.test.js — 278 (queue item 54, U2).
 *
 * THE MODAL EXISTS TO ADD WHAT IS MISSING, AND IT WAS MAKING YOU READ PAST WHAT IS ALREADY THERE.
 * `renderDishPicker` listed every costed plate alphabetically, so the plates already on the current
 * menu sat interleaved among the ones you came to add. Measured on four plates with two of them
 * already on the current menu: they landed at positions 1 and 3.
 *
 * ⚠️ AND THE SUBTITLE COULD NOT BE READ AT A GLANCE. Every row said "On <menu name>", so "already
 * here" and "on some OTHER menu" were the same shape, and telling them apart meant comparing the
 * name against the menu selected in the row behind the modal.
 *
 * WHY EACH TEST IS A REGRESSION RATHER THAN A DESCRIPTION:
 *  1. The PARTITION is asserted, not just the sort: every not-on-this-menu plate precedes every
 *     on-this-menu one, whatever their names. A fixture whose names happen to sort the right way
 *     would pass against the old alphabetical-only code, so the names here are chosen to sort
 *     AGAINST the required order ("Apple" and "Chowder" are already on, "Bacon" and "Danish" are
 *     not) — with plain alphabetical sorting the answer is A,B,C,D and the expected answer is
 *     B,D,A,C. The two cannot be confused.
 *  2. The LABEL is asserted as an equality, not as "contains On" — roster 190.
 *  3. `menusOfPlate` is asked directly rather than `plateMenuSummary` being parsed, and the
 *     two-menus fixture is what proves it: a plate on BOTH menus summarises as "2 menus", which
 *     names neither, so any implementation reading the summary string cannot answer "is it on THIS
 *     one" and this test catches it.
 *  4. Rows already on the menu stay SELECTABLE and keep their data-pid — dimming is ranking, not
 *     disabling, because selecting one updates its existing entry rather than duplicating it.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* Four plates. Apple Tart and Chowder are on the CURRENT menu (M1); Bacon Roll is on another menu
   (M2); Danish is on none. Alphabetically that is A,B,C,D — and the required answer is B,D,A,C, so
   the fixture cannot be satisfied by the sort that was there before. */
const PLATES = [
  { id: 'PA', name: 'Apple Tart', lines: [{ misc: true, cost: 2 }] },
  { id: 'PB', name: 'Bacon Roll', lines: [{ misc: true, cost: 3 }] },
  { id: 'PC', name: 'Chowder', lines: [{ misc: true, cost: 4 }] },
  { id: 'PD', name: 'Danish', lines: [{ misc: true, cost: 5 }] },
];
const ON = { PA: [{ menuId: 'M1', name: 'Winter Menu' }],
             PB: [{ menuId: 'M2', name: 'Summer Menu' }],
             PC: [{ menuId: 'M1', name: 'Winter Menu' }],
             PD: [] };
const SUMMARY = { PA: 'Winter Menu', PB: 'Summer Menu', PC: 'Winter Menu', PD: null };

function picker(opts) {
  const o = Object.assign({ current: 'M1', plates: PLATES, on: ON, summary: SUMMARY, selected: null, filter: '' }, opts);
  const box = { innerHTML: '', querySelectorAll: () => [] };
  // eslint-disable-next-line no-new-func
  const factory = new Function('BOX', 'O', `
    var document={ getElementById:function(id){ return id==='ad_list'?BOX:{ value:'' }; } };
    var currentMenuId = O.current;
    var adSelectedPlateId = O.selected;
    function eligibleDishes(){ return O.plates; }
    function menuNameForPlate(sp){ return (O.summary[sp.id]||''); }
    function menusOfPlate(sp){ return O.on[sp.id]||[]; }
    function plateMenuSummary(sp){ return O.summary[sp.id]; }
    function costFromLines(lines){ return (lines||[]).reduce(function(a,l){ return a+(l.cost||0); },0); }
    function fmt2(x){ return '$'+Number(x).toFixed(2); }
    function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
    function renderAddDishUnlinked(){}
    ${extractFn(SRC, 'renderDishPicker')}
    return renderDishPicker;
  `);
  factory(box, o)(o.filter);
  /* Parse the rendered rows back out, in order. Deliberately reading the SHIPPED markup rather than
     re-deriving it: what the user sees is the order of these buttons and the text in .ad-meta. */
  const rows = [...box.innerHTML.matchAll(/<button[^>]*class="(ad-item[^"]*)"[^>]*data-pid="([^"]*)"[^>]*><span class="ad-nm">([^<]*)<\/span><span class="ad-meta">([^<]*)<\/span>/g)]
    .map((m) => ({ cls: m[1], pid: m[2], name: m[3], meta: m[4] }));
  return { rows, html: box.innerHTML };
}

test('278: plates NOT on this menu come first, whatever their names sort like', () => {
  const { rows } = picker();
  assert.deepStrictEqual(rows.map((r) => r.name), ['Bacon Roll', 'Danish', 'Apple Tart', 'Chowder'],
    'alphabetical alone gives A,B,C,D — the partition is what makes it B,D,A,C');
  /* The property, stated separately from the fixture's exact answer: no on-menu row may precede an
     off-menu one. This is what survives someone renaming a plate in the fixture. */
  const flags = rows.map((r) => r.cls.includes('is-on'));
  assert.deepStrictEqual(flags, [false, false, true, true]);
  assert.strictEqual(flags.indexOf(true) > flags.lastIndexOf(false), true, 'the two groups never interleave');
});

test('278: each group is alphabetical within itself', () => {
  const { rows } = picker();
  const off = rows.filter((r) => !r.cls.includes('is-on')).map((r) => r.name);
  const on = rows.filter((r) => r.cls.includes('is-on')).map((r) => r.name);
  assert.deepStrictEqual(off, [...off].sort());
  assert.deepStrictEqual(on, [...on].sort());
});

/* ⚠️ THE FIXTURE ABOVE CANNOT SEE A BROKEN COMPARATOR AND THE GATE PROVED IT. Its groups hold TWO
   plates each, already in alphabetical order, and **V8 leaves a two-element array untouched when
   the comparator always returns a positive number** — measured, `['Bacon Roll','Danish'].sort(()=>1)`
   comes back unchanged. So collapsing one side of the comparison survived every test here.
   The fix is a group of THREE whose input order is not the answer: three off-menu plates fed in
   reverse, where a comparator that has stopped reading one of its operands cannot land on Z,M,A by
   accident. Roster 184(b) in a new costume — a fixture that agrees with itself measures a
   coincidence, and here the coincidence was the array's length. */
test('278: the list is SORTED, not merely partitioned — three plates fed in reverse', () => {
  const plates = [
    { id: 'PZ', name: 'Zabaglione', lines: [{ misc: true, cost: 1 }] },
    { id: 'PM', name: 'Mango Sorbet', lines: [{ misc: true, cost: 2 }] },
    { id: 'PAA', name: 'Affogato', lines: [{ misc: true, cost: 3 }] },
  ];
  const { rows } = picker({
    plates,
    on: { PZ: [], PM: [], PAA: [] },
    summary: { PZ: null, PM: null, PAA: null },
  });
  assert.deepStrictEqual(rows.map((r) => r.name), ['Affogato', 'Mango Sorbet', 'Zabaglione'],
    'fed Z,M,A and the answer is A,M,Z — a comparator ignoring either operand cannot produce that');
});

test('278: the row says "Already on this menu" in words, not a menu name to compare', () => {
  const { rows } = picker();
  const by = Object.fromEntries(rows.map((r) => [r.name, r.meta]));
  assert.strictEqual(by['Apple Tart'], 'Already on this menu · cost $2.00');
  assert.strictEqual(by.Chowder, 'Already on this menu · cost $4.00');
  assert.strictEqual(by['Bacon Roll'], 'On Summer Menu · cost $3.00', 'another menu still names itself');
  assert.strictEqual(by.Danish, 'Library · cost $5.00', 'and an unpublished plate is unchanged');
});

/* ⚠️ THE FIXTURE THAT PROVES THE QUESTION IS ASKED OF `menusOfPlate` AND NOT OF THE SUMMARY STRING.
   `plateMenuSummary` collapses to "2 menus" the moment a plate is on two, which names NEITHER — so
   an implementation that reads the summary to decide "is this on the current menu" gets no answer
   at all here, and this is the one shape where that is visible. */
test('278: a plate on TWO menus, one of them this one, is correctly "already on this menu"', () => {
  const { rows } = picker({
    on: { ...ON, PD: [{ menuId: 'M1', name: 'Winter Menu' }, { menuId: 'M2', name: 'Summer Menu' }] },
    summary: { ...SUMMARY, PD: '2 menus' },
  });
  const danish = rows.find((r) => r.name === 'Danish');
  assert.ok(danish.cls.includes('is-on'), 'on this menu AND another one is still on this menu');
  assert.strictEqual(danish.meta, 'Already on this menu · cost $5.00',
    'and it must not fall back to the summary, which says "2 menus" and names neither');
  assert.deepStrictEqual(rows.map((r) => r.name), ['Bacon Roll', 'Apple Tart', 'Chowder', 'Danish']);
});

test('278: dimming is RANKING, not disabling — every row keeps its pid and stays a button', () => {
  const { rows, html } = picker();
  rows.forEach((r) => assert.ok(r.pid, `${r.name} must keep its data-pid`));
  assert.ok(!/disabled/.test(html), 'selecting an on-menu plate UPDATES its entry; it is not a dead row');
});

test('278: the selected row keeps its selected class alongside is-on', () => {
  const { rows } = picker({ selected: 'PA' });
  const apple = rows.find((r) => r.name === 'Apple Tart');
  assert.ok(apple.cls.includes('sel'));
  assert.ok(apple.cls.includes('is-on'));
});

test('278: with no menu selected at all, nothing is marked as already-on', () => {
  const { rows } = picker({ current: null });
  assert.deepStrictEqual(rows.map((r) => r.cls.includes('is-on')), [false, false, false, false]);
  assert.deepStrictEqual(rows.map((r) => r.name), ['Apple Tart', 'Bacon Roll', 'Chowder', 'Danish'],
    'and it falls back to plain alphabetical rather than an arbitrary order');
});

test('278: the empty state is unchanged', () => {
  const { html } = picker({ plates: [] });
  assert.match(html, /No costed plates found/);
});

/* ------------------------------------------------------------------ the search box
   ⚠️ THESE EXIST BECAUSE THE MUTATION GATE ASKED A QUESTION THIS FILE HAD NOT. Pointing it at
   `renderDishPicker` for the first time returned SIX survivors, and most of them were in the search
   filter — which this modal has had all along and which no test here touched, because every case
   above passes an empty filter. The ordering work is what the queue item is about; the filter is
   what the gate found was never pinned at all. `.claude/rules/tests.md`: a function that is not a
   target has never been asked the question, and neither has a branch inside one. */

test('278: the search filter narrows by plate name, case-insensitively', () => {
  assert.deepStrictEqual(picker({ filter: 'bacon' }).rows.map((r) => r.name), ['Bacon Roll']);
  assert.deepStrictEqual(picker({ filter: 'BACON' }).rows.map((r) => r.name), ['Bacon Roll']);
  assert.deepStrictEqual(picker({ filter: '  bacon  ' }).rows.map((r) => r.name), ['Bacon Roll'],
    'the query is trimmed');
});

test('278: it also matches the MENU a plate is on, which is why the menu name is in the haystack', () => {
  const rows = picker({ filter: 'summer' }).rows;
  assert.deepStrictEqual(rows.map((r) => r.name), ['Bacon Roll'],
    'searching a menu name finds the plates published to it');
});

test('278: an empty filter shows everything, and a filter matching nothing shows the empty state', () => {
  assert.strictEqual(picker({ filter: '' }).rows.length, 4);
  assert.strictEqual(picker({ filter: '   ' }).rows.length, 4, 'whitespace is not a query');
  assert.match(picker({ filter: 'zzzz' }).html, /No costed plates found/);
});

test('278: the partition still holds inside a filtered list', () => {
  /* "a" matches all four (Apple, Bacon, Danish, and Chowder via "Winter Menu"… no — via its own
     name? no. This asserts the property rather than a hand-counted set. */
  const rows = picker({ filter: 'a' }).rows;
  const flags = rows.map((r) => r.cls.includes('is-on'));
  assert.ok(rows.length > 1, 'the filter must leave more than one row, or the property is vacuous');
  assert.strictEqual(flags.indexOf(true) === -1 || flags.indexOf(true) > flags.lastIndexOf(false), true,
    'filtering must not re-interleave the two groups');
});

test('278: a plate with no name is rendered and sorted rather than crashing', () => {
  const rows = picker({
    plates: [{ id: 'PX', name: '', lines: [{ misc: true, cost: 1 }] }, ...PLATES],
    on: { ...ON, PX: [] },
    summary: { ...SUMMARY, PX: null },
  }).rows;
  /* ⚠️ THE WHOLE ORDER, NOT JUST THE FIRST ROW. Asserting `rows[0]` alone left the `||` on the
     comparator's B side alive: mutating it collapses every right-hand name to '', which happens to
     leave the nameless plate first while scrambling everything after it. The gate found that, and
     it is roster 205's shape — an assertion that cannot see the property it is named for. */
  assert.deepStrictEqual(rows.map((r) => r.name), ['Plate', 'Bacon Roll', 'Danish', 'Apple Tart', 'Chowder'],
    'a nameless plate sorts first within its group, and the groups still hold');
  assert.strictEqual(rows[0].meta, 'Library · cost $1.00');
});
