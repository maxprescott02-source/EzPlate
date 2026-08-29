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
    ${extractFn(APP, 'costDetail')}
    ${extractFn(APP, 'costFromLines')}
    return { costFromLines:costFromLines, costDetail:costDetail };
  `)({ PRODUCTS });
}
const H = harness();
const costFromLines = H.costFromLines;
const costDetail = H.costDetail;

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

test('0c: a sub-cent plate cost is NOT rounded — stored costs stay exact', () => {
  /* CLAUDE.md: currency DISPLAYS round to the cent; stored costs stay exact. This function feeds the
     stored side, so a tidy-looking rounding here would be a money bug wearing a formatting hat.

     ⚠️ THE FIRST DRAFT OF THIS TEST COULD NOT FAIL, and the fixtures are chosen the way they are
     because of it. It asserted 12.5 x $0.08 = 1 and 33 x $0.01 = 0.33 — and BOTH are unchanged by
     rounding to the cent, so `Math.round(c*100)/100` around the return value left it green. A test
     named for a rule, unable to see the rule broken. Caught by the pre-push review, which injected
     exactly that regression rather than reading the code.
     A fixture only proves this if the exact answer has a THIRD decimal place: 2.5g of potato at
     $0.01/g is $0.025, which cent-rounding turns into $0.03. Sub-cent line costs are ordinary here —
     a gram of anything cheap is one — so this is the real case, not a contrived one. */
  const exact = costFromLines([{ pid: 2, qty: 2.5 }]);
  assert.equal(exact, 0.025, 'two and a half cents, not three');
  assert.notEqual(exact, Math.round(exact * 100) / 100,
    'sanity: this fixture MUST be one that cent-rounding would change, or the test proves nothing');

  // Several sub-cent lines must not each be rounded on the way in either.
  assert.equal(costFromLines([{ pid: 2, qty: 2.5 }, { pid: 2, qty: 2.5 }]), 0.05);
  // And an ordinary whole-cent case still comes out clean rather than carrying float dust.
  assert.equal(costFromLines([{ pid: 1, qty: 12.5 }]), 1);
});

/* ============================================================================================
 * 222 (docs/QUEUE.md item 9) — THE MISS COUNT WAS COMPUTED AND THROWN AWAY.
 *
 * `costFromLines` counted the lines it could not cost into `miss` and returned only the partial sum,
 * so a plate with a deleted product rendered as fully costed and HEALTHIER THAN IT IS: a smaller cost
 * is a better food cost, so the verdict pill went GREEN. The builder counted its own missing lines and
 * raised #flag, which meant the only screen that warned was the one you had to already be on.
 *
 * `costDetail` is the single implementation now and `costFromLines` is its cost accessor, so these
 * tests are about the SAME walk the whole app uses rather than a second one written to agree with it.
 * ========================================================================================= */

test('222: the miss count is REPORTED, not just computed — the number and the doubt travel together', () => {
  const base = { pid: 1, qty: 100 };                                   // 8.00
  assert.deepEqual(costDetail([base]), { cost: 8, miss: 0 }, 'a clean plate says so');
  assert.deepEqual(costDetail([base, { pid: 999, qty: 50 }]), { cost: 8, miss: 1 },
    'the cost is unchanged — what is new is that the caller can now SEE it is incomplete');
  assert.deepEqual(costDetail([base, { pid: 999, qty: 50 }, { kid: 'kGone', qty: 1 }]), { cost: 8, miss: 2 },
    'and it counts them, so a caller can say how many');
});

test('222: costFromLines is the ACCESSOR, not a second implementation', () => {
  /* If these ever disagree there are two walks again, which is what let the builder's flag and the
     Menu row's verdict describe the same plate differently. */
  const cases = [
    [{ pid: 1, qty: 100 }],
    [{ pid: 1, qty: 100 }, { pid: 999, qty: 50 }],
    [{ misc: true, label: 'Box', cost: 2.5 }],
    [],
  ];
  cases.forEach((lines) => assert.equal(costFromLines(lines), costDetail(lines).cost));
});

test('222: a line with NO QUANTITY is uncostable, not free — null * cost is 0 in JavaScript', () => {
  /* THE SECOND WAY IN, and the nastier one: `lineCost` returned `qty*c` outright, and `null*c` is 0
     rather than null. So a line whose quantity was never entered was a real ingredient costing
     nothing, and `miss` stayed at zero because 0 is a number — even the builder's own flag stayed
     down. Reachable from a restore, and from any plate saved before the v60 quantity rule.
     `!(qty>0)` refuses null, undefined, 0, NaN and '' in one expression, which is CLAUDE.md's rule
     that Number('') and Number(null) are both 0 and both sail through an isFinite guard. */
  const base = { pid: 1, qty: 100 };                                   // 8.00
  [null, undefined, 0, NaN, ''].forEach((q) => {
    const d = costDetail([base, { pid: 2, qty: q }]);
    assert.equal(d.cost, 8, 'the bad line adds nothing: ' + JSON.stringify(q));
    assert.equal(d.miss, 1, 'and is COUNTED as uncostable rather than silently costing zero: ' + JSON.stringify(q));
  });
});

test('222: a real quantity still costs, including a numeric string — the guard is not a blanket refusal', () => {
  /* The counterweight. `!(qty>0)` must not start refusing live data: legacy lines carry whatever the
     old inputs produced, and '100' > 0 is true while '100' * 0.08 is 8. */
  assert.deepEqual(costDetail([{ pid: 1, qty: 100 }]), { cost: 8, miss: 0 });
  assert.deepEqual(costDetail([{ pid: 1, qty: '100' }]), { cost: 8, miss: 0 }, 'a numeric string is a quantity');
  assert.deepEqual(costDetail([{ pid: 1, qty: 0.5 }]), { cost: 0.04, miss: 0 }, 'half a gram at $0.08/g');
});

test('222: a MISC line never counts as missing — it carries its own cost and needs no product', () => {
  /* Misc lines are handled before the product lookup, so they can neither be missed nor made
     uncostable by the quantity rule (they have no quantity at all). Asserting it because the
     quantity guard sits one branch away from them. */
  assert.deepEqual(costDetail([{ misc: true, label: 'Box', cost: 2.5 }]), { cost: 2.5, miss: 0 });
  assert.deepEqual(costDetail([{ misc: true, label: 'Bad', cost: 'free' }]), { cost: 0, miss: 0 },
    'a junk misc cost still is not a MISSING line — it is a line worth nothing, which is what it says');
});

/* ============================================================================================
 * 222 — WHAT THE CALLERS DO WITH IT. The miss count is only worth computing if something acts on it,
 * and the item's whole complaint is that the figures OUTSIDE the builder were confident and wrong.
 *
 * This harness runs the REAL aggregators over REAL products, because the dashboard's own test files
 * stub the cost to inject values (correctly — they are about scoping, not costing) and therefore can
 * never set a miss count. That is the stub roster one level up again: a file whose name is on a
 * target list is not the same as a file that can see the defect.
 * ========================================================================================= */
function menuHarness(MENU) {
  // eslint-disable-next-line no-new-func
  return new Function('P', 'M', `
    "use strict";
    var PRODUCTS=P, MENU=M, cogsPct=30, DASH_ALL='all';
    var byId={}; PRODUCTS.forEach(function(p){ byId[p.id]=p; });
    var kById={ k1:{ id:'k1', name:'Fish', pid:1 }, kGone:{ id:'kGone', name:'Deleted product', pid:99 } };
    function plateForMenuItem(m){ return m.plate || null; }
    function dishOnMenu(){ return true; }
    ${extractFn(APP, 'cpbu')}
    ${extractFn(APP, 'lineCost')}
    ${extractFn(APP, 'lineProduct')}
    ${extractFn(APP, 'costDetail')}
    ${extractFn(APP, 'costFromLines')}
    ${extractFn(APP, 'plateFullyCosted')}
    ${extractFn(APP, 'foodTarget')}
    ${extractFn(APP, 'analyze')}
    ${extractFn(APP, 'avgFoodCostForScope')}
    ${extractFn(APP, 'dishesOverTarget')}
    return { avg:function(){ return avgFoodCostForScope('all'); }, over:dishesOverTarget,
             fully:plateFullyCosted };
  `)(PRODUCTS, MENU);
}

const good = { plate: { id: 'A', lines: [{ pid: 1, qty: 100 }] }, price: 20 };          // 8.00 -> 40%
const broken = { plate: { id: 'B', lines: [{ pid: 1, qty: 100 }, { pid: 999, qty: 500 }] }, price: 20 };

test('222: a partially-costed plate is EXCLUDED from the average, not averaged in understated', () => {
  /* The direction is what makes this a [B] rather than a nit. The missing line can only make the cost
     too LOW, so the ratio is too low, so the average reads HEALTHIER than the menu is — the direction
     that never prompts anyone to look. Both dishes below cost $8.00 as far as the old code could tell,
     so including the broken one changed nothing about the number and everything about its truth. */
  const onlyGood = menuHarness([good]);
  const both = menuHarness([good, broken]);
  assert.equal(onlyGood.avg(), 40, 'the honest dish alone: 8.00 / 20.00');
  assert.equal(both.avg(), 40,
    'and the broken one does not join it — if it did, this would still be 40 and would be a LIE, ' +
    'because that plate has an ingredient nobody has priced');
  assert.equal(menuHarness([broken]).avg(), null,
    'with nothing costable the answer is "no figure", never a confident partial one');
});

test('222: a partially-costed plate is not counted as healthy by dishesOverTarget', () => {
  /* $8.00 against a $20.00 price is 40% food cost, well over the 30% target, so the BROKEN plate
     would be counted as over-target here — the one place its understatement happens to be harmless.
     Priced so its partial cost reads UNDER target instead: that is the case where excluding it
     matters, because a plate that looks fine only because a line is missing is exactly what the
     item is about. */
  const cheapLooking = { plate: { id: 'C', lines: [{ pid: 1, qty: 100 }, { pid: 999, qty: 5000 }] }, price: 40 };
  assert.equal(menuHarness([cheapLooking]).over(), 0, 'it is not counted as over target...');
  assert.equal(menuHarness([cheapLooking]).fully(cheapLooking.plate), false,
    '...but only because it is not counted at ALL, which is the honest answer while a line has no price');
  const honest = { plate: { id: 'D', lines: [{ pid: 1, qty: 100 }] }, price: 10 };      // 8.00/10.00 = 80%
  assert.equal(menuHarness([honest]).over(), 1, 'a genuinely over-target dish is still counted');
});

test('222: plateFullyCosted is the one question the screens ask, and an EMPTY plate is not costed either', () => {
  const h = menuHarness([]);
  assert.equal(h.fully({ id: 'A', lines: [{ pid: 1, qty: 100 }] }), true);
  assert.equal(h.fully({ id: 'B', lines: [{ pid: 1, qty: 100 }, { pid: 999, qty: 1 }] }), false, 'a missing product');
  assert.equal(h.fully({ id: 'C', lines: [{ pid: 1, qty: null }] }), false, 'a missing quantity');
  assert.equal(h.fully({ id: 'D', lines: [] }), false, 'an empty plate was never costed');
  assert.equal(h.fully(null), false, 'and no plate at all is not a crash');
});
