/*
 * plate-cost.test.js — QUEUE 0c. `costFromLines` is the plate cost, and nothing ran it.
 *
 * THE FINDING THAT CREATED THIS FILE. The mutation gate reported five survivors against
 * `costFromLines` — every mutant it has. It should have: **all four test files that claimed to pin
 * it replace it with a stub.** `kpi-strip` returns `lines[0].cost`, `builder-page` returns 1,
 * `publish-guard` returns 0, `dash-digin` looks the answer up in a table. Four files whose names
 * appear in `tests/mutation/targets.js` under `tests:`, none of which executes a line of it.
 *
 * That is the stub roster in CLAUDE.md operating one level up: the roster is about a stub hiding a
 * defect inside a test, and this is a stub hiding the ABSENCE of a test, behind a list that reads as
 * coverage. Those stubs are all legitimate where they are — none of those files is about plate
 * costing — so the fix is not to unpick them. It is that the function needed a file of its own and
 * never had one.
 *
 * Everything here runs the REAL `costFromLines`, `lineProduct`, `lineCost` and `cpbu`, sliced out of
 * js/app.js. All three line shapes the app stores are represented, because two of them are legacy
 * data that every reader still has to resolve: NEW lines are `{kid, qty}`; `{pid, qty}` and
 * `{misc, label, cost}` are live.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const APP = loadApp();

const PRODUCTS = [
  { id: 1, description: 'Barramundi', base_unit: 'g', cost_per_base_unit: 0.08 },
  { id: 2, description: 'Potato',     base_unit: 'g', cost_per_base_unit: 0.01 },
  { id: 3, description: 'Lemon',      base_unit: 'ea', cost_per_base_unit: 0.40 },
  { id: 4, description: 'Uncosted',   base_unit: 'g', cost_per_base_unit: null },   // exists, has no price
];

function harness() {
  // eslint-disable-next-line no-new-func
  return new Function('FIX', `
    "use strict";
    var byId={}; FIX.PRODUCTS.forEach(function(p){ byId[p.id]=p; });
    var kById={ k1:{ id:'k1', name:'Fish', pid:1 }, kGone:{ id:'kGone', name:'Deleted product', pid:99 } };
    ${extractFn(APP, 'cpbu')}
    ${extractFn(APP, 'lineCost')}
    ${extractFn(APP, 'lineProduct')}
    ${extractFn(APP, 'costFromLines')}
    return costFromLines;
  `)({ PRODUCTS });
}
const costFromLines = harness();

test('0c: the ordinary case — a plate is the sum of its lines', () => {
  // 100g barramundi at $0.08/g = $8.00, 200g potato at $0.01/g = $2.00
  assert.equal(costFromLines([{ pid: 1, qty: 100 }, { pid: 2, qty: 200 }]), 10);
});

test('0c: all three line shapes cost together — kid, pid and misc', () => {
  /* The `{kid, qty}` form is what the builder writes today and the other two are live legacy data.
     A cost function that handled only the current shape would under-cost every plate written before
     the change, silently, which is why the three are asserted in one sum rather than separately. */
  const lines = [
    { kid: 'k1', qty: 100 },                        // 8.00 through the ingredient
    { pid: 2, qty: 200 },                           // 2.00 direct
    { misc: true, label: 'Packaging', cost: 0.5 },  // 0.50 flat
  ];
  assert.equal(costFromLines(lines), 10.5);
});

test('0c: a MISC line rides at its fixed cost, and a junk one is skipped rather than poisoning the sum', () => {
  /* `if(!isNaN(mc)) c+=mc` — dropping the `!` adds NaN, and NaN + anything is NaN, so ONE bad misc
     line turns the whole plate cost into NaN. That renders as "$NaN" on the builder and silently
     drops the plate out of every average. Skipping is the right answer and it has to be asserted,
     because the wrong answer is not a wrong number, it is no number. */
  assert.equal(costFromLines([{ misc: true, label: 'Box', cost: 2.5 }]), 2.5);
  assert.equal(costFromLines([{ misc: true, label: 'Box', cost: '3.25' }]), 3.25, 'a numeric string is a number');
  const withJunk = costFromLines([{ pid: 2, qty: 200 }, { misc: true, label: 'Bad', cost: 'free' }]);
  assert.equal(withJunk, 2, 'the junk line contributes nothing and does NOT make the total NaN');
  assert.ok(!isNaN(withJunk));
});

test('0c: a line the app cannot price contributes ZERO — it never guesses and never throws', () => {
  /* Three separate ways a line stops being costable, and all three must behave the same: contribute
     nothing, leave the rest of the plate intact. `if(!p){miss++;return;}` with the `!` deleted
     inverts this into skipping every line that CAN be priced, which returns 0 for a healthy plate. */
  const base = { pid: 1, qty: 100 };                                   // 8.00
  assert.equal(costFromLines([base, { pid: 999, qty: 50 }]), 8, 'a product that does not exist');
  assert.equal(costFromLines([base, { kid: 'kGone', qty: 50 }]), 8, 'an ingredient pointing at a deleted product');
  assert.equal(costFromLines([base, { pid: 4, qty: 50 }]), 8, 'a product that exists but has no price');
  assert.equal(costFromLines([base, null]), 8, 'a null line');
  assert.equal(costFromLines([base, {}]), 8, 'an empty line');
});

test('0c: an uncosted line is skipped, NOT counted as zero-cost — the distinction is the whole guard', () => {
  /* `if(lc==null) miss++; else c+=lc;` flipped to `!=` adds every unpriceable line and skips every
     priceable one. The tell is that a healthy plate costs 0, which looks like an empty plate rather
     than like a bug — this is the assertion that tells them apart. */
  assert.equal(costFromLines([{ pid: 4, qty: 1000 }]), 0, 'nothing priceable, so nothing counted');
  assert.equal(costFromLines([{ pid: 3, qty: 2 }]), 0.8, 'and a priceable line IS counted');
});

test('0c: no lines at all is zero, whatever shape "no lines" arrives in', () => {
  // `(lines||[])` with the `||` flipped to `&&` yields `[]` for a REAL array, so every plate in the
  // app costs 0 — the loudest possible break, and nothing was running the function to see it.
  assert.equal(costFromLines([]), 0);
  assert.equal(costFromLines(null), 0);
  assert.equal(costFromLines(undefined), 0);
});

test('0c: a fractional quantity is not rounded — stored costs stay exact', () => {
  // CLAUDE.md: currency DISPLAYS round to the cent; stored costs stay exact. This function feeds the
  // stored side, so a tidy-looking rounding here would be a money bug wearing a formatting hat.
  assert.equal(costFromLines([{ pid: 1, qty: 12.5 }]), 1);
  const odd = costFromLines([{ pid: 2, qty: 33 }]);
  assert.ok(Math.abs(odd - 0.33) < 1e-12, `expected exactly 33*0.01, got ${odd}`);
});
