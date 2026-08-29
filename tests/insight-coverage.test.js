/*
 * insight-coverage.test.js — v93. ONE synthetic fixture per insight family, driven through the REAL
 * pipeline: computeInsights() over seeded app state, exactly as the Dashboard calls it.
 *
 * THE PROBLEM THIS EXISTS TO SOLVE
 * `insights.test.js` tests each family as a pure function, with its primitives handed to it
 * ready-made (`insCostBase(MV)` where MV is already computed). That proves a family formats and
 * gates correctly. It proves NOTHING about `computeInsights`, the impure builder that turns live app
 * state — MENU, savedPlates, PRODUCTS, ingPriceLog, menuPriceLog — into those primitives. So a
 * family could be perfectly correct while the code that FEEDS it was broken, and on real data those
 * two look identical: both present as "this family had nothing to say".
 *
 * Each family therefore gets:
 *   TRIGGER  — state deliberately built to make it fire, asserting the family appears AND that its
 *              numbers are right. A family that fails its own trigger fixture is BROKEN, not quiet.
 *   SILENCE  — state where it must say nothing, asserting it doesn't. Without this a family that
 *              fires on everything would pass its trigger test and still be useless.
 *
 * Numbers below are worked out by hand in the comments, so a failure tells you which arithmetic
 * moved rather than just that a string changed.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { setAppState, computeInsights, DASH_ALL } = require('./_extract.js');

const DAY = 86400000;
const ago = (d) => Date.now() - d * DAY;

/* ---- fixture builders. Deliberately explicit: a fixture you have to read is a fixture you can
   trust. Plate names are DIGIT-FREE so the money-law scanner in insights.test.js stays meaningful
   for the same copy (a digit in a name reads as an uncomputed figure). ---- */
const prod = (id, over) => Object.assign(
  { id, description: id, category: 'GEN', supplier: '', base_unit: 'g', cost_per_base_unit: 0.01 }, over || {});
const king = (id, pid, name) => ({ id, pid, name: name || id });
const plate = (id, name, lines) => ({ id, name, lines });
const dish = (id, name, plateId, price, over) => Object.assign(
  { id, name, plateId, price, menuId: 'MENU_ORIGINAL', section: '' }, over || {});
const line = (kid, qty) => ({ kid, qty });
const misc = (cost) => ({ misc: true, label: 'misc', cost });

// run the real pipeline; seed fixed so selection rotation can never make a test flaky
const run = (state, scope) => { setAppState(state); return computeInsights(scope == null ? DASH_ALL : scope, 0); };
const kinds = (out) => out.map((x) => x.kind);
const find = (out, kind) => out.find((x) => x.kind === kind);
// the assertion that carries the whole point of this file
const fires = (out, kind) => {
  const c = find(out, kind);
  assert.ok(c, `family "${kind}" did NOT fire on a fixture built to trigger it — it is broken, not quiet. Got: [${kinds(out).join(', ') || 'nothing'}]`);
  return c;
};
const silent = (out, kind) =>
  assert.equal(find(out, kind), undefined, `family "${kind}" fired on a fixture where it must stay silent: ${JSON.stringify(find(out, kind))}`);

/* ================================================================ F1 — cost-base movement
   TRIGGER: one ingredient up 15%, logged so the 30-day window can reconstruct.
     Beef 0.01 → 0.0115 $/g (+15%); Cheese flat at 0.02.
     Toastie  = 100g Beef + 50g Cheese → now 1.15+1.00 = 2.15, then 1.00+1.00 = 2.00, sells 10
     Melt     = 300g Beef             → now 3.45,             then 3.00,             sells 10
     sumNow = .215 + .345 = .560 · sumThen = .200 + .300 = .500 · pts = (.560-.500)/2*100 = 3.0
     culprit Beef: 15% across 2 plates.
     (Melt is 300g, not 200g, on purpose: at 200g the answer is exactly 2.25 pts, and 0.0115-0.01 is
     0.00149999… in binary floating point, so pts1 rounds it to 2.2 rather than 2.3. A fixture parked
     on a rounding boundary tests the float representation, not the engine.) */
const MOVEMENT = () => ({
  cogsPct: 30,
  PRODUCTS: [prod('P_BEEF', { cost_per_base_unit: 0.0115 }), prod('P_CHEESE', { cost_per_base_unit: 0.02 })],
  kitchenIngredients: [king('K_BEEF', 'P_BEEF', 'Beef'), king('K_CHEESE', 'P_CHEESE', 'Cheese')],
  savedPlates: [
    plate('PL1', 'Toastie', [line('K_BEEF', 100), line('K_CHEESE', 50)]),
    plate('PL2', 'Melt', [line('K_BEEF', 300)]),
  ],
  MENU: [dish('MI1', 'Toastie', 'PL1', 10), dish('MI2', 'Melt', 'PL2', 10)],
  ingPriceLog: {
    P_BEEF: [{ t: ago(60), v: 0.01 }, { t: ago(20), v: 0.0115 }],
    P_CHEESE: [{ t: ago(60), v: 0.02 }],
  },
});

test('F1 costbase TRIGGER: a 15% ingredient spike is detected, sized and attributed', () => {
  const c = fires(run(MOVEMENT()), 'costbase');
  assert.equal(c.facts.pts, 3, 'the average moved 3.0 pts');
  assert.equal(c.facts.ingPct, 15, 'the culprit rose 15%');
  assert.equal(c.facts.plates, 2, 'across both plates that use it');
  assert.match(c.text, /3 pts higher/);
  assert.match(c.text, /Beef, up 15% across 2 plates/);
});

test('F1 costbase SILENCE: no logged history reaching back = nothing to compare, so nothing said', () => {
  const s = MOVEMENT();
  s.ingPriceLog = { P_BEEF: [{ t: ago(3), v: 0.01 }] };   // starts AFTER every window
  silent(run(s), 'costbase');
});

test('F1 costbase SILENCE: a move under the 0.3pt noise floor is not news', () => {
  const s = MOVEMENT();
  s.PRODUCTS[0].cost_per_base_unit = 0.01005;             // +0.5%: real, but 0.075 pts
  s.ingPriceLog.P_BEEF = [{ t: ago(60), v: 0.01 }, { t: ago(20), v: 0.01005 }];
  silent(run(s), 'costbase');
});

/* ================================================================ F2 — plate drift
   TRIGGER: ONE plate's ingredients up sharply, the rest flat, so the worst mover is unambiguous.
     Barra 0.02 → 0.030 $/g. Barra Basket = 100g → then 2.00, now 3.00, sells 10 → 20% → 30%.
     Flatbread = 100g of a flat product, so it cannot out-drift it. */
const DRIFT = () => ({
  cogsPct: 30,
  PRODUCTS: [prod('P_BARRA', { cost_per_base_unit: 0.03 }), prod('P_FLOUR', { cost_per_base_unit: 0.01 })],
  kitchenIngredients: [king('K_BARRA', 'P_BARRA', 'Barra'), king('K_FLOUR', 'P_FLOUR', 'Flour')],
  savedPlates: [
    plate('PL1', 'Barra Basket', [line('K_BARRA', 100)]),
    plate('PL2', 'Flatbread', [line('K_FLOUR', 100)]),
  ],
  MENU: [dish('MI1', 'Barra Basket', 'PL1', 10), dish('MI2', 'Flatbread', 'PL2', 10)],
  ingPriceLog: {
    P_BARRA: [{ t: ago(60), v: 0.02 }, { t: ago(20), v: 0.03 }],
    P_FLOUR: [{ t: ago(60), v: 0.01 }],
  },
});

test('F2 drift TRIGGER: the worst-moving plate is named, with its before/after food cost %', () => {
  const c = fires(run(DRIFT()), 'drift');
  assert.equal(c.facts.name, 'Barra Basket', 'the plate that actually moved, not the flat one');
  assert.equal(c.facts.up, 1, 'ingredients cost $1.00 more');
  assert.equal(c.facts.fromPct, 20);
  assert.equal(c.facts.toPct, 30);
  assert.match(c.text, /Barra Basket.+\$1\.00 more/);
});

test('F2 drift SILENCE: a plate whose ingredients did not move does not drift', () => {
  const s = DRIFT();
  s.PRODUCTS[0].cost_per_base_unit = 0.02;                          // put it back where it was
  s.ingPriceLog.P_BARRA = [{ t: ago(60), v: 0.02 }];
  silent(run(s), 'drift');
});

/* ================================================================ F3 — category imbalance
   TRIGGER: Breakfast averages 15 pts worse than Lunch. Misc-cost lines only, so no price history
   exists and no movement family can fire — the fixture isolates the one thing under test. */
const CATEGORY = () => ({
  cogsPct: 30,
  PRODUCTS: [], kitchenIngredients: [],
  savedPlates: [
    plate('PL1', 'Big Brekky', [misc(4)]), plate('PL2', 'Eggs Ben', [misc(4)]),
    plate('PL3', 'Caesar', [misc(2.5)]), plate('PL4', 'Club', [misc(2.5)]),
  ],
  MENU: [
    dish('MI1', 'Big Brekky', 'PL1', 10, { section: 'Breakfast' }),
    dish('MI2', 'Eggs Ben', 'PL2', 10, { section: 'Breakfast' }),
    dish('MI3', 'Caesar', 'PL3', 10, { section: 'Lunch' }),
    dish('MI4', 'Club', 'PL4', 10, { section: 'Lunch' }),
  ],
});

test('F3 category TRIGGER: the two section averages and the gap between them are right', () => {
  const c = fires(run(CATEGORY()), 'category');
  assert.equal(c.facts.loName, 'Lunch');
  assert.equal(c.facts.loPct, 25);
  assert.equal(c.facts.hiName, 'Breakfast');
  assert.equal(c.facts.hiPct, 40);
  assert.match(c.text, /Lunch plates average 25% food cost, Breakfast sits at 40%/);
});

test('F3 category SILENCE: one section cannot be an imbalance', () => {
  const s = CATEGORY();
  s.MENU.forEach((m) => { m.section = 'All day'; });
  silent(run(s), 'category');
});

test('F3 category SILENCE: sections that sit level say nothing', () => {
  const s = CATEGORY();
  s.savedPlates.forEach((p) => { p.lines = [misc(3)]; });
  silent(run(s), 'category');
});

/* ================================================================ F4 — volatility
   TRIGGER: an ingredient with a LOGGED price band, which is what ingPriceBand/costRangeForLines read.
     Squid logged at 0.008 and 0.012, currently 0.010. Calamari = 200g → band $1.60–$2.40 on a $10
     plate → 16%–24%, a 8-pt swing. Both log points are recent, so no window can reconstruct and the
     movement families stay out of the way. */
const VOLATILITY = () => ({
  cogsPct: 30,
  PRODUCTS: [prod('P_SQUID', { cost_per_base_unit: 0.01 }), prod('P_OIL', { cost_per_base_unit: 0.01 })],
  kitchenIngredients: [king('K_SQUID', 'P_SQUID', 'squid'), king('K_OIL', 'P_OIL', 'oil')],
  savedPlates: [
    plate('PL1', 'Calamari', [line('K_SQUID', 200)]),
    plate('PL2', 'Chips', [line('K_OIL', 100)]),
  ],
  MENU: [dish('MI1', 'Calamari', 'PL1', 10), dish('MI2', 'Chips', 'PL2', 10)],
  ingPriceLog: { P_SQUID: [{ t: ago(10), v: 0.008 }, { t: ago(5), v: 0.012 }] },
});

test('F4 volatility TRIGGER: the widest-swinging plate, its band, and the ingredient behind it', () => {
  const c = fires(run(VOLATILITY()), 'volatility');
  assert.equal(c.facts.name, 'Calamari');
  assert.equal(c.facts.loPct, 16);
  assert.equal(c.facts.hiPct, 24);
  assert.match(c.text, /Calamari swings 16–24% with squid prices/);
});

test('F4 volatility SILENCE: a price that has only ever been one value has no band', () => {
  const s = VOLATILITY();
  s.ingPriceLog = { P_SQUID: [{ t: ago(10), v: 0.01 }] };
  silent(run(s), 'volatility');
});

/* ================================================================ F5 — long-standing problem
   TRIGGER: a plate over target through every reconstructable month. One flat, long-logged
   ingredient: Slow Roast = 200g at 0.02 = $4.00 on a $10 plate = 40%, over a 30% target, and the
   log reaches back 400 days so all 12 monthly probes reconstruct. Nothing MOVED, so families 1 and
   2 stay silent and this fixture tests exactly one thing. */
const LONGSTANDING = () => ({
  cogsPct: 30,
  PRODUCTS: [prod('P_LAMB', { cost_per_base_unit: 0.02 })],
  kitchenIngredients: [king('K_LAMB', 'P_LAMB', 'Lamb')],
  savedPlates: [plate('PL1', 'Slow Roast', [line('K_LAMB', 200)]), plate('PL2', 'Side Salad', [misc(2)])],
  MENU: [dish('MI1', 'Slow Roast', 'PL1', 10), dish('MI2', 'Side Salad', 'PL2', 10)],
  ingPriceLog: { P_LAMB: [{ t: ago(400), v: 0.02 }] },
});

test('F5 longstanding TRIGGER: a run of consecutive over-target months is found and counted', () => {
  const c = fires(run(LONGSTANDING()), 'longstanding');
  assert.equal(c.facts.name, 'Slow Roast');
  assert.equal(c.facts.months, 12, 'the log reaches back 400 days, so all 12 monthly probes hold');
  assert.match(c.text, /Slow Roast has been over target through every cost change/);
  assert.match(c.text, /12 months/);
});

test('F5 longstanding SILENCE: under three months is not a run — two points is not "always"', () => {
  const s = LONGSTANDING();
  s.ingPriceLog.P_LAMB = [{ t: ago(70), v: 0.02 }];    // probes at 30 and 60 days hold; 90 breaks
  silent(run(s), 'longstanding');
});

test('F5 longstanding SILENCE: a plate UNDER target has no run at all', () => {
  const s = LONGSTANDING();
  s.MENU[0].price = 20;                                 // $4.00 on $20 = 20%, under a 30% target
  silent(run(s), 'longstanding');
});

/* ================================================================ F6 — near-miss cluster
   TRIGGER: two plates sitting exactly on a 30% target, one well clear of it. */
const NEARMISS = () => ({
  cogsPct: 30,
  PRODUCTS: [], kitchenIngredients: [],
  savedPlates: [
    plate('PL1', 'Barra & Chips', [misc(3)]),
    plate('PL2', 'Cheeseburger', [misc(3)]),
    plate('PL3', 'Garden Salad', [misc(1)]),
  ],
  MENU: [
    dish('MI1', 'Barra & Chips', 'PL1', 10), dish('MI2', 'Cheeseburger', 'PL2', 10),
    dish('MI3', 'Garden Salad', 'PL3', 10),
  ],
});

test('F6 nearcluster TRIGGER: the plates are NAMED, not counted (v93)', () => {
  const c = fires(run(NEARMISS()), 'nearcluster');
  assert.equal(c.facts.count, 2);
  assert.equal(c.facts.targetPct, 30);
  assert.equal(c.text, 'Barra & Chips and Cheeseburger sit within half a point of your 30% target.');
  assert.doesNotMatch(c.text, /closest|marking|on your menu/i, 'the trailing filler clause is gone');
});

test('F6 nearcluster TRIGGER: beyond two, the rest become a counted remainder that is in facts', () => {
  const s = NEARMISS();
  s.savedPlates.push(plate('PL4', 'Steak Sandwich', [misc(3)]), plate('PL5', 'Fish Burger', [misc(3)]));
  s.MENU.push(dish('MI4', 'Steak Sandwich', 'PL4', 10), dish('MI5', 'Fish Burger', 'PL5', 10));
  const c = fires(run(s), 'nearcluster');
  assert.equal(c.facts.count, 4);
  assert.equal(c.facts.others, 2, 'the remainder is a figure, so the money law requires it in facts');
  assert.match(c.text, /^Barra & Chips, Cheeseburger and 2 others sit within half a point/);
});

test('F6 nearcluster SILENCE: one plate near target is not a cluster', () => {
  const s = NEARMISS();
  s.savedPlates[1].lines = [misc(5)];                   // move Cheeseburger to 50%
  silent(run(s), 'nearcluster');
});

/* ================================================================ F7 — supplier concentration (GLOBAL)
   TRIGGER: Fresh Co in 3 of 4 priced plates, both suppliers named on every used product (100%
   coverage), exposure $1.00 per plate → a 10% rise adds 1.00·0.10/10·100 = 1.0 pt on each of 3
   plates = 3.0, over 4 plates = 0.75 → 0.8 pts. */
const CONCENTRATION = () => ({
  cogsPct: 30,
  PRODUCTS: [
    prod('P_A', { supplier: 'Fresh Co', cost_per_base_unit: 0.01 }),
    prod('P_B', { supplier: 'Dry Goods', cost_per_base_unit: 0.01 }),
  ],
  kitchenIngredients: [king('K_A', 'P_A', 'Greens'), king('K_B', 'P_B', 'Rice')],
  savedPlates: [
    plate('PL1', 'Salad One', [line('K_A', 100)]),
    plate('PL2', 'Salad Two', [line('K_A', 100)]),
    plate('PL3', 'Salad Three', [line('K_A', 100)]),
    plate('PL4', 'Rice Bowl', [line('K_B', 100)]),
  ],
  MENU: [
    dish('MI1', 'Salad One', 'PL1', 10), dish('MI2', 'Salad Two', 'PL2', 10),
    dish('MI3', 'Salad Three', 'PL3', 10), dish('MI4', 'Rice Bowl', 'PL4', 10),
  ],
});

test('F7 concentration TRIGGER: reach AND the consequence of a 10% rise are both correct', () => {
  const c = fires(run(CONCENTRATION()), 'concentration');
  assert.equal(c.facts.plates, 3);
  assert.equal(c.facts.total, 4);
  assert.equal(c.facts.rise, 10);
  assert.equal(c.facts.pts, 0.8, '3 plates × 1.0 pt, averaged over 4 = 0.75 → 0.8');
  assert.match(c.text, /Fresh Co is in 3 of your 4 costed plates/);
  assert.match(c.text, /10% rise there would add 0\.8 pts/);
});

/* This fixture is built so that ONLY the coverage gate can silence the family: two distinct
   suppliers (so the "trivially all of them" gate passes), Fresh Co in 3 of 4 plates at 75% reach
   (so the reach gates pass), and a 3.0-pt consequence (so the consequence gate passes) — but just
   two of the five used products carry a supplier, i.e. 40% coverage.
   It is written this way because the first version was NOT: it emptied a supplier and thereby left
   only one distinct supplier, so it passed on the wrong gate entirely and a mutation that forced
   coverage to 100% still went green. Caught by mutation-testing this file; see HANDOVER-v93.md. */
test('F7 concentration SILENCE: a mostly-empty supplier field would measure data entry, not reach', () => {
  const s = CONCENTRATION();
  ['P_C', 'P_D', 'P_E'].forEach((id, i) => {
    s.PRODUCTS.push(prod(id, { supplier: '' }));
    s.kitchenIngredients.push(king('K_' + id, id, 'extra' + i));
  });
  s.savedPlates[3].lines = [line('K_B', 100), line('K_P_C', 100), line('K_P_D', 100), line('K_P_E', 100)];
  silent(run(s), 'concentration');
});

test('F7 concentration SILENCE: one supplier makes the answer trivially "all of them"', () => {
  const s = CONCENTRATION();
  s.PRODUCTS[1].supplier = 'Fresh Co';
  silent(run(s), 'concentration');
});

/* ================================================================ F8 — price anomaly (GLOBAL)
   TRIGGER: four used products in the per-kg group at $55, $13, $10 and $8 → 55/13 = 4.23 → 4.2x. */
const ANOMALY = () => ({
  cogsPct: 30,
  PRODUCTS: [
    prod('P_SAFF', { description: 'Saffron', cost_per_base_unit: 0.055 }),
    prod('P_BEEF', { description: 'Beef', cost_per_base_unit: 0.013 }),
    prod('P_CHEESE', { description: 'Cheese', cost_per_base_unit: 0.010 }),
    prod('P_ONION', { description: 'Onion', cost_per_base_unit: 0.008 }),
  ],
  kitchenIngredients: [
    king('K_SAFF', 'P_SAFF', 'Saffron'), king('K_BEEF', 'P_BEEF', 'Beef'),
    king('K_CHEESE', 'P_CHEESE', 'Cheese'), king('K_ONION', 'P_ONION', 'Onion'),
  ],
  savedPlates: [
    plate('PL1', 'Paella', [line('K_SAFF', 5), line('K_BEEF', 100)]),
    plate('PL2', 'Burger', [line('K_CHEESE', 50), line('K_ONION', 50)]),
  ],
  MENU: [dish('MI1', 'Paella', 'PL1', 10), dish('MI2', 'Burger', 'PL2', 10)],
});

test('F8 anomaly TRIGGER: the outlier is named and sized against the NEXT dearest', () => {
  const c = fires(run(ANOMALY()), 'anomaly');
  assert.equal(c.facts.top, 55, '$0.055/g displays as $55.00/kg');
  assert.equal(c.facts.mult, 4.2, '55 / 13 = 4.23');
  assert.match(c.text, /Saffron at \$55\.00\/kg is 4\.2x your next dearest ingredient/);
});

test('F8 anomaly SILENCE: being the dearest is not an anomaly if the runner-up is close', () => {
  const s = ANOMALY();
  s.PRODUCTS[1].cost_per_base_unit = 0.030;             // 55 / 30 = 1.8x
  silent(run(s), 'anomaly');
});

test('F8 anomaly SILENCE: too small a group for "next dearest" to mean anything', () => {
  const s = ANOMALY();
  s.savedPlates = [plate('PL1', 'Paella', [line('K_SAFF', 5), line('K_BEEF', 100)])];
  s.MENU = [dish('MI1', 'Paella', 'PL1', 10)];
  silent(run(s), 'anomaly');
});

/* ================================================================ F9 — complexity
   TRIGGER: 6-ingredient plates at 35%, 2-ingredient plates at 25% → a 10-pt gap. */
const COMPLEXITY = () => {
  const PRODUCTS = [], kitchenIngredients = [];
  for (let i = 0; i < 6; i++) {
    PRODUCTS.push(prod('P' + i, { cost_per_base_unit: 0.01 }));
    kitchenIngredients.push(king('K' + i, 'P' + i, 'ing' + i));
  }
  const many = [0, 1, 2, 3, 4, 5].map((i) => line('K' + i, 58.3333));   // 6 × 58.3333g × 0.01 ≈ $3.50
  const few = [line('K0', 125), line('K1', 125)];                       // 2 × 125g × 0.01 = $2.50
  return {
    cogsPct: 30, PRODUCTS, kitchenIngredients,
    savedPlates: [
      plate('PL1', 'Loaded Fries', many), plate('PL2', 'Big Board', many),
      plate('PL3', 'Toastie', few), plate('PL4', 'Wrap', few),
    ],
    MENU: [
      dish('MI1', 'Loaded Fries', 'PL1', 10), dish('MI2', 'Big Board', 'PL2', 10),
      dish('MI3', 'Toastie', 'PL3', 10), dish('MI4', 'Wrap', 'PL4', 10),
    ],
  };
};

test('F9 complexity TRIGGER: the many- vs few-ingredient averages and their gap are right', () => {
  const c = fires(run(COMPLEXITY()), 'complexity');
  assert.equal(c.facts.manyPct, 35);
  assert.equal(c.facts.fewPct, 25);
  assert.equal(c.facts.gap, 10);
  assert.equal(c.facts.minIng, 6);
});

test('F9 complexity SILENCE: a gap inside café noise is not a pattern', () => {
  const s = COMPLEXITY();
  s.savedPlates[2].lines = s.savedPlates[3].lines = [line('K0', 165), line('K1', 165)];   // $3.30 = 33%
  silent(run(s), 'complexity');                                                            // 35 − 33 = 2 pts
});

test('F9 complexity SILENCE: one plate on a side of the split is not a group', () => {
  const s = COMPLEXITY();
  s.MENU = s.MENU.slice(0, 3);                          // 2 complex, 1 simple
  silent(run(s), 'complexity');
});

/* ================================================================ the all-healthy line */

test('healthy TRIGGER: everything under target and nothing to report → the warm line, alone', () => {
  const out = run({
    cogsPct: 30, PRODUCTS: [], kitchenIngredients: [],
    savedPlates: [plate('PL1', 'Soup', [misc(2)]), plate('PL2', 'Toast', [misc(2)])],
    MENU: [dish('MI1', 'Soup', 'PL1', 10), dish('MI2', 'Toast', 'PL2', 10)],
  });
  assert.deepEqual(kinds(out), ['allgood']);
});

test('healthy SILENCE: it must not fire while another family has something to say', () => {
  silent(run(CATEGORY()), 'allgood');
  silent(run(MOVEMENT()), 'allgood');
});

/* ================================================================ 3 — RANKING
   Both a strong candidate (cost-base movement: time × aggregation × breadth, names the culprit) and
   a weak one (near-miss cluster: a count) are genuinely available. With five costed plates the cap
   is 2, so the engine has to choose — and the choice must go on value, not on availability. */
const STRONG_AND_WEAK = () => {
  const s = MOVEMENT();
  // three more plates sitting exactly on target, so nearcluster is a real, qualifying candidate
  s.savedPlates.push(plate('PL3', 'Soup', [misc(3)]), plate('PL4', 'Toast', [misc(3)]), plate('PL5', 'Scone', [misc(3)]));
  s.MENU.push(dish('MI3', 'Soup', 'PL3', 10), dish('MI4', 'Toast', 'PL4', 10), dish('MI5', 'Scone', 'PL5', 10));
  return s;
};

test('RANKING: both candidates qualify — the fixture is only meaningful if the weak one really fires', () => {
  const s = STRONG_AND_WEAK();
  // prove nearcluster is available by removing the strong family's history and watching it appear
  const withoutStrong = Object.assign({}, s, { ingPriceLog: {} });
  fires(run(withoutStrong), 'nearcluster');
});

test('RANKING: with both available, the strong candidate is selected and the weak one is dropped', () => {
  const out = run(STRONG_AND_WEAK());
  assert.equal(out.length, 2, 'five costed plates caps the panel at 2');
  fires(out, 'costbase');
  silent(out, 'nearcluster');
  assert.equal(kinds(out)[0], 'costbase', 'and the strongest leads');
});

/* ================================================================ 4 — SCOPE
   The SAME state read at all-menus and at one menu. Five priced plates:
     MENU_ORIGINAL — Big Brekky 40%, Eggs Ben 40% (Breakfast) · Caesar 25%, Club 25% (Lunch)
     MENU_WINTER   — Roast 40% (Lunch)
   So Lunch averages 25% on Original but (25+25+40)/3 = 30% across all menus, while Breakfast is 40%
   either way. The section comparison therefore EXISTS at both scopes and reports different numbers —
   which is the point: each scope recomputes from its own plates rather than filtering one answer.
   Concentration is a fact about the PRODUCT LIST, so it is global-only by declaration (scopeAllows)
   and must drop at menu scope. */
const SCOPED = () => ({
  cogsPct: 30,
  PRODUCTS: [
    prod('P_A', { supplier: 'Fresh Co', cost_per_base_unit: 0.01 }),
    prod('P_B', { supplier: 'Dry Goods', cost_per_base_unit: 0.01 }),
  ],
  kitchenIngredients: [king('K_A', 'P_A', 'Greens'), king('K_B', 'P_B', 'Rice')],
  savedPlates: [
    plate('PL1', 'Big Brekky', [line('K_A', 400)]),   // $4.00 → 40%
    plate('PL2', 'Eggs Ben', [line('K_A', 400)]),     // $4.00 → 40%
    plate('PL3', 'Caesar', [line('K_A', 250)]),       // $2.50 → 25%
    plate('PL4', 'Club', [line('K_B', 250)]),         // $2.50 → 25%
    plate('PL5', 'Roast', [line('K_B', 400)]),        // $4.00 → 40%
  ],
  MENU: [
    dish('MI1', 'Big Brekky', 'PL1', 10, { section: 'Breakfast' }),
    dish('MI2', 'Eggs Ben', 'PL2', 10, { section: 'Breakfast' }),
    dish('MI3', 'Caesar', 'PL3', 10, { section: 'Lunch' }),
    dish('MI4', 'Club', 'PL4', 10, { section: 'Lunch' }),
    dish('MI5', 'Roast', 'PL5', 10, { section: 'Lunch', menuId: 'MENU_WINTER' }),
  ],
});

test('SCOPE: global-only families appear at all-menus and DROP at menu scope, by declaration', () => {
  const all = kinds(run(SCOPED(), DASH_ALL));
  const menu = kinds(run(SCOPED(), 'MENU_ORIGINAL'));
  assert.ok(all.indexOf('concentration') >= 0, 'concentration is a fact about the product list');
  assert.equal(menu.indexOf('concentration'), -1,
    'WHY it drops: reach across the whole plate LIBRARY answers a different question than a menu selector implies');
});

test('SCOPE: category runs at BOTH scopes (v92) and recomputes — it is not one answer filtered', () => {
  const all = fires(run(SCOPED(), DASH_ALL), 'category');
  const menu = fires(run(SCOPED(), 'MENU_ORIGINAL'), 'category');
  assert.equal(all.facts.hiName, 'Breakfast');
  assert.equal(all.facts.hiPct, 40, 'Breakfast is 40% at either scope');
  assert.equal(menu.facts.hiPct, 40);
  assert.equal(all.facts.loPct, 30, 'all menus: Lunch is (25+25+40)/3 = 30');
  assert.equal(menu.facts.loPct, 25, 'MENU_ORIGINAL: Lunch is (25+25)/2 = 25 — the Winter plate is not its problem');
  assert.notEqual(all.facts.loPct, menu.facts.loPct, 'the two scopes must not agree by accident');
});

test('SCOPE: a section that loses its second plate at menu scope drops out of the comparison', () => {
  const s = SCOPED();
  s.MENU[3].menuId = 'MENU_WINTER';                   // Club moves, leaving Lunch with one plate on Original
  const menu = run(s, 'MENU_ORIGINAL');
  assert.equal(find(menu, 'category'), undefined,
    'WHY it drops: one plate is not a section average, so there is nothing left to compare Breakfast with');
  fires(run(s, DASH_ALL), 'category');                // …while all-menus still has both sections
});

test('SCOPE: a menu with too little on it says less, rather than reporting the all-menus figure', () => {
  const out = kinds(run(SCOPED(), 'MENU_WINTER'));
  assert.equal(out.indexOf('category'), -1, 'one dish cannot carry a section comparison');
  assert.equal(out.indexOf('concentration'), -1, 'and global families are suppressed here too');
});

/* ================================================================ the pipeline itself
   These would have caught a broken BUILDER while every family stayed correct — the exact failure
   mode this file exists for. */

test('PIPELINE: an unpriced or uncosted dish never reaches a family', () => {
  const s = CATEGORY();
  s.MENU[0].price = 0;                                  // priced at nothing
  s.savedPlates[1].lines = [];                          // costed at nothing
  const c = find(run(s), 'category');
  assert.equal(c, undefined, 'Breakfast is left with no qualifying plates, so there is no comparison');
});

test('PIPELINE: a dish whose plate is missing is skipped, not counted at zero', () => {
  const s = NEARMISS();
  s.MENU.push(dish('MI9', 'Ghost', 'PL_MISSING', 10));
  const c = fires(run(s), 'nearcluster');
  assert.equal(c.facts.count, 2, 'the dangling dish must not join the cluster at 0%');
});

test('PIPELINE: computeInsights survives malformed state instead of taking the Dashboard down', () => {
  assert.doesNotThrow(() => run({ cogsPct: 30, MENU: [null, undefined], savedPlates: [null] }));
  assert.doesNotThrow(() => run({ cogsPct: 30 }));
  assert.deepEqual(run({ cogsPct: 30 }), []);
});

/* ================================================================================================
 * QUEUE 0c, batch 205 — THE BUILDER'S OWN GUARDS.
 *
 * Everything above this line tests a FAMILY: hand it the right shape and check what it says. This
 * section tests the two hundred lines that decide what the families are handed — which dishes reach
 * the reconstruction, which plates count towards a supplier's reach, which products can be compared
 * on price. The gate measured 39 surviving mutants in `computeInsights` against the whole file
 * above, and every one of them was in that decision layer rather than in any family.
 *
 * WHY THAT LAYER IS THE DANGEROUS ONE, and it is the same argument v93 made when it first extracted
 * this function: a family can be perfectly correct while the code that FEEDS it is broken, and on
 * real data the two are indistinguishable — both look like "this family had nothing to say". A
 * silent Dashboard is the app's most plausible-looking failure.
 *
 * THE SHAPE OF THESE TESTS. Almost all of them add ONE bad row to a fixture that already works and
 * assert the numbers do not move. That is deliberate: every guard here exists to EXCLUDE something,
 * so the only way to see it working is to offer it the thing it must refuse and check the answer is
 * unchanged. A test that merely asserts the good fixture still works cannot see a guard at all.
 * ============================================================================================== */

/* Compare ONE fact between two runs, refusing to compare a key that is not there.
   ⚠️ `assert.equal(a.facts.x, b.facts.x)` where neither object carries `x` is `undefined === undefined`
   and passes forever, and the TWO-SIDED form is what hides it — the same assertion written against a
   literal fails immediately and obviously. It bit three times while this section was being written
   (`facts.ptsPer10`, which is the builder's internal name for what insConcentration publishes as
   `pts`; and `facts.name` and `facts.count` on an anomaly, whose facts were then only `{top, mult}`),
   and all three were found by the mutation gate or the pre-push review rather than by reading.
   ⚠️ TWO OF THOSE THREE KEYS NOW EXIST - 220 gave the anomaly a `facts.name`, so an assertion about it
   is no longer vacuous. `facts.count` and `facts.ptsPer10` still do not exist and still would be. That
   is the argument for this helper rather than against it: which keys a builder publishes CHANGES, and
   a guard that asks the object instead of trusting a comment is the only form that survives it. */
const sameFact = (a, b, key, why) => {
  assert.ok(a.facts && key in a.facts, `facts.${key} does not exist, so comparing it proves nothing`);
  assert.equal(a.facts[key], b.facts[key], why);
};

/* --- the reconstruction passes: which dishes are in scope at all --- */

test('BUILDER: a dish with no sell price is not averaged into the cost base at infinity', () => {
  /* Every figure in families 1, 2 and 5 is a food-cost PERCENTAGE — cost divided by the sell price —
     so a dish priced at zero does not merely contribute nothing, it contributes Infinity and takes
     the average with it. The guard is `!(m.price>0)`, and `>` rather than `>=` is what makes a zero
     price a non-price. An unpriced dish is ordinary: it is a plate published to a menu before
     anybody has decided what to charge for it. */
  const s = MOVEMENT();
  s.savedPlates.push(plate('PL3', 'Freebie', [line('K_BEEF', 100)]));
  s.MENU.push(dish('MI3', 'Freebie', 'PL3', 0));

  const c = fires(run(s), 'costbase');
  assert.equal(c.facts.pts, 3, 'the average is still over the two PRICED plates');
  assert.equal(c.facts.plates, 2, 'and the culprit still reaches two of them');
});

test('BUILDER: a dish whose plate costs nothing NOW is not averaged in at zero', () => {
  /* The mirror of the test above, on the other side of the division. A plate whose ingredients all
     price at zero today is a real state — it is what a $0.00 invoice line produces — and it is not
     a plate with a food cost of 0%, it is a plate nobody can cost. Including it drags the average
     down and would report an improvement that did not happen.
     The fixture gives the zeroed product a REAL logged history, so the reconstruction can price it
     in the past: without that the row would be excluded further down for a different reason and the
     test would pass without exercising this guard. */
  const s = MOVEMENT();
  s.PRODUCTS.push(prod('P_ZERO', { cost_per_base_unit: 0 }));
  s.kitchenIngredients.push(king('K_ZERO', 'P_ZERO', 'Zeroed'));
  s.savedPlates.push(plate('PL3', 'Zero Plate', [line('K_ZERO', 100)]));
  s.MENU.push(dish('MI3', 'Zero Plate', 'PL3', 10));
  s.ingPriceLog.P_ZERO = [{ t: ago(60), v: 0.01 }, { t: ago(20), v: 0 }];

  const c = fires(run(s), 'costbase');
  assert.equal(c.facts.pts, 3, 'a plate that cannot be costed today is not a plate at 0%');
  assert.equal(c.facts.plates, 2);
});

test('BUILDER: a malformed line does not take the whole Dashboard down', () => {
  /* `if(!l || l.misc) return` — and the FIRST half is what stops `l.misc` being read off null. The
     builder is wrapped in try/catch and returns [] on a throw, so getting this wrong does not crash
     the page: it silently empties the insight block, which is the failure this file exists to catch.
     A null line is not hypothetical — it is what a half-written plate draft or a restore from an
     older format can leave behind. Asserted on both loops that walk lines: the per-dish scan here,
     and the supplier pass below.

     ⚠️ 222 CHANGED WHAT "SURVIVES" MEANS HERE, and the assertion is rewritten rather than relaxed.
     This used to push a null line onto PL1 and assert costbase still fired with `pts:3` — which was
     only true because the plate was included at its PARTIAL cost, missing an ingredient. That is the
     defect item 9 fixed: an understated total makes a plate look cheaper, and every % built on it
     reads healthier than the kitchen is. A plate carrying a line the app cannot cost is now excluded
     from the walk entirely.
     So the ROBUSTNESS claim this test exists for is unchanged and still asserted — no throw, the
     block does not empty, and the OTHER plates are still read — while the specific figure moved,
     because the population deliberately did. */
  const s = MOVEMENT();
  /* a THIRD plate, so excluding the broken one still leaves a population that can report — otherwise
     this would be asserting the family's minimum inputs rather than its robustness to a null line. */
  s.savedPlates.push(plate('PL3', 'Sandwich', [line('K_BEEF', 200)]));
  s.MENU.push(dish('MI3', 'Sandwich', 'PL3', 10));
  const clean = fires(run(s), 'costbase');
  assert.equal(clean.facts.plates, 3, 'precondition: all three plates are read while they are intact');

  s.savedPlates[0].lines.push(null);                                 // PL1 (Toastie) can no longer be costed
  const out = run(s);
  assert.ok(Array.isArray(out), 'no throw: the builder returned a list rather than falling into its catch');
  const c = fires(out, 'costbase');
  assert.equal(c.facts.plates, 2, 'the other two are still read; PL1 is excluded, not counted understated');

  const g = CONCENTRATION();
  g.savedPlates[0].lines.push(null);
  const sup = fires(run(g), 'concentration');
  /* ⚠️ STILL 3, and that is not an oversight in the exclusion above. The supplier pass walks
     savedPlates for REACH — how many plates a supplier appears on — which is a fact about the product
     list rather than a costed figure, so a plate carrying one uncostable line still legitimately
     counts. 222's exclusion applies where a COST or a percentage is computed; this number is neither.
     Measured, not assumed: the first draft of this line guessed 2 and was wrong. */
  assert.equal(sup.facts.plates, 3, 'the supplier pass survives it too, and is not narrowed by it');
});

/* --- family 5: the run of consecutive over-target months --- */

test('BUILDER: a run needs the plate to be over target NOW, and every month behind it', () => {
  /* Three guards in six lines, each ending the walk for a different reason, and all three have to
     hold or "always over target" is a claim about months nobody checked. The fixture starts from
     the working LONGSTANDING case and breaks it one way at a time. */
  const base = fires(run(LONGSTANDING()), 'longstanding');
  assert.ok(base.facts.months >= 3, 'the fixture must produce a real run first');

  const under = LONGSTANDING();
  under.MENU.forEach((m) => { m.price = 1000; });      // far under target now
  silent(run(under), 'longstanding');
});

/* --- family 7: supplier reach, and the one population all three of its figures share --- */

test('BUILDER: an unpriced plate counts towards neither the reach nor its consequence', () => {
  /* The comment at the guard says why: the what-if needs a sell price to express its effect in
     points, so an unpriced plate cannot take part in the consequence — and if it cannot take part
     in the consequence it must not swell the reach denominator either, or "3 of 4" and the points
     figure would describe different sets of plates while sitting in the same sentence.
     So the assertion is on BOTH numbers, not on the total alone. */
  const s = CONCENTRATION();
  s.savedPlates.push(plate('PL5', 'Unpriced Salad', [line('K_A', 100)]));
  s.MENU.push(dish('MI5', 'Unpriced Salad', 'PL5', 0));

  const c = fires(run(s), 'concentration');
  assert.equal(c.facts.total, 4, 'the denominator counts PRICED plates');
  assert.equal(c.facts.plates, 3, 'and so does the reach');
});

test('BUILDER: a plate with no priced products at all is not part of the population', () => {
  /* `any` is set only by a line that resolves to a real product, and a plate of pure misc lines sets
     nothing. It is a legitimate plate — a bought-in dessert costed as a single figure — and it has
     no supplier, so including it in the denominator would report a supplier's reach as smaller than
     it is by counting plates no supplier could ever appear on. */
  const s = CONCENTRATION();
  s.savedPlates.push(plate('PL5', 'Bought In', [misc(4)]));
  s.MENU.push(dish('MI5', 'Bought In', 'PL5', 10));

  const c = fires(run(s), 'concentration');
  assert.equal(c.facts.total, 4, 'the misc-only plate is not in the population');
  assert.equal(c.facts.plates, 3);
});

/* --- family 8: the price anomaly, and which products are even comparable --- */

test('BUILDER: only products actually USED on a plate can be the price anomaly', () => {
  /* `usedPids` is built by walking every saved plate, and it is what stops the anomaly family
     reporting on a catalogue row nobody cooks with. A café's product list carries hundreds of lines
     it has never put on a plate, and the dearest thing in the whole catalogue is almost always one
     of them — so without this the family would say the same useless thing forever.
     The intruder below is priced far above the real group, so if it were admitted it would win. */
  const s = ANOMALY();
  s.PRODUCTS.push(prod('P_UNUSED', { cost_per_base_unit: 99 }));

  const c = fires(run(s), 'anomaly');
  /* ⚠️ On the POSITIVE, not the negative — `not.toBe`-shaped assertions are roster entry 190:
     "not the wrong value" is a guess about every wrong value there could be, while "is the right
     value" is a fact about this app. The intruder is priced at $99/g, so if it were admitted it
     would win outright and every assertion below would fail.
     Since 220 the subject is in FACTS as well as the text, so this asserts the published fact rather
     than only the rendered sentence — the text is what a person reads, the fact is what the phrasing
     validator defends. */
  assert.match(c.text, /^Saffron at \$55\.00\/kg/, 'the outlier is the dearest USED product');
  assert.equal(c.facts.name, 'Saffron', 'and it is PUBLISHED, not just rendered');
  assert.equal(c.facts.top, 55, 'a product on no plate cannot displace it');
});

test('BUILDER: both routes to a product — a kitchen ingredient and a bare pid — mark it used', () => {
  /* Plate lines come in two live shapes and the walk handles them in two different branches:
     `{kid, qty}` resolves through the kitchen ingredient to its product, `{pid, qty}` names one
     directly. Legacy pid lines are real data, not history, so a walk that only understood kid lines
     would drop every product used by an older plate — and silently, because the family would simply
     have a smaller group to talk about. */
  const s = ANOMALY();
  const viaKid = fires(run(s), 'anomaly');

  const t = ANOMALY();
  t.savedPlates.forEach((p) => {
    p.lines = p.lines.map((l) => (l.kid ? { pid: (t.kitchenIngredients.find((k) => k.id === l.kid) || {}).pid, qty: l.qty } : l));
  });
  const viaPid = fires(run(t), 'anomaly');
  /* ⚠️ `facts.count` STILL DOES NOT EXIST — the group size is not published, so comparing it here
     would be `undefined === undefined` and could not fail; found by the pre-push review, and `sameFact`
     is what now refuses it. `mult` is the figure that moves if the group loses a member, so it is the
     one worth comparing. `facts.name` DOES exist since 220, so that comparison is real. */
  assert.match(viaPid.text, /Saffron/, 'both line shapes reach the same product');
  sameFact(viaPid, viaKid, 'name', 'both line shapes reach the same product in FACTS too');
  sameFact(viaPid, viaKid, 'top', 'and price it the same');
  sameFact(viaPid, viaKid, 'mult', 'and against the same runner-up, so the group is the same size');
});

/* --- the window walk: which reference moment families 1 and 2 speak from --- */

test('BUILDER: a move too small at 30 days does NOT end the search — 60 days still gets its turn', () => {
  /* The loop runs `while !movement`, so setting `movement` is what stops it. The 0.3pt floor is
     therefore two decisions in one line: whether to SAY anything, and whether to keep looking.
     Treating a sub-floor move as a result would stop the walk at the most recent window and report
     nothing, when a real move was visible one window further back — a Dashboard that goes quiet
     precisely because a little happened recently. Beef is flat over 30 days and up 15% over 60. */
  const s = MOVEMENT();
  s.ingPriceLog.P_BEEF = [{ t: ago(80), v: 0.01 }, { t: ago(45), v: 0.0115 }];

  const c = fires(run(s), 'costbase');
  assert.equal(c.facts.pts, 3, 'the 60-day window carries the same 3.0 pts');
  assert.equal(c.facts.ingPct, 15);
});

test('BUILDER: EXACTLY 0.3 pts is worth saying — the floor is `>=`', () => {
  /* The noise floor decides whether a real, measured move reaches the owner at all, and one
     character moves the boundary. The fixture lands on it exactly by construction rather than by
     luck: 60g of a product that rose from $0.005 to $0.006 per gram is $0.06 on a $10 plate,
     halved across two plates and expressed in points, which is 0.30 with no rounding anywhere.
     ⚠️ `insCostBase` carries the SAME `>=0.3` floor, deliberately, so this fixture also proves the
     two agree. If either is ever changed alone, this goes red. */
  const s = {
    cogsPct: 30,
    PRODUCTS: [prod('P_SPICE', { cost_per_base_unit: 0.005 }), prod('P_FLOUR', { cost_per_base_unit: 0.01 })],
    kitchenIngredients: [king('K_SPICE', 'P_SPICE', 'Spice'), king('K_FLOUR', 'P_FLOUR', 'Flour')],
    savedPlates: [plate('PL1', 'Spiced Bowl', [line('K_SPICE', 20)]), plate('PL2', 'Flatbread', [line('K_FLOUR', 10)])],
    MENU: [dish('MI1', 'Spiced Bowl', 'PL1', 10), dish('MI2', 'Flatbread', 'PL2', 10)],
    ingPriceLog: {
      P_SPICE: [{ t: ago(60), v: 0.002 }, { t: ago(20), v: 0.005 }],
      P_FLOUR: [{ t: ago(60), v: 0.01 }],
    },
  };
  /* ⚠️ THE FIXTURE MUST LAND ON 0.3 RAW, NOT MERELY ROUND TO IT, AND THE CHECK BELOW HAS TO USE THE
     APP'S OWN ORDER OF OPERATIONS. `facts.pts` has been through pts1(), which rounds to one decimal,
     so a fixture at 0.30000000000000027 asserts 0.3 and passes while being > 0.3 under both
     operators — which is what the first draft of this test did.
     The second draft then added a raw check that computed `(newCost - oldCost)/price/2*100`, and
     that was WRONG IN THE SAME WAY: the builder sums BOTH plates' ratios first and subtracts the
     sums, so the flat plate's 0.1 is added and then taken away, and the float that survives is not
     the one a two-term expression produces. A check that re-implements the code's arithmetic in a
     different order is a stub of it (CLAUDE.md's roster), and this one agreed with the wrong answer.
     Both drafts were found by the mutation gate. The expression below mirrors the builder line for
     line: sumNow and sumThen, each a sum of cost/price, then the difference. */
  const sumNow = (0.005 * 20) / 10 + (0.01 * 10) / 10;
  const sumThen = (0.002 * 20) / 10 + (0.01 * 10) / 10;
  assert.equal((sumNow - sumThen) / 2 * 100, 0.3, 'the fixture must land on the floor EXACTLY');

  const c = fires(run(s), 'costbase');
  assert.equal(c.facts.pts, 0.3, 'exactly on the floor is INSIDE it');
  assert.equal(c.facts.ingPct, 150);
});

test('BUILDER: drift keeps the MOST RECENT window it was found at, never a later one', () => {
  /* The guard is `worst && !drift`, and the `!drift` half is the whole of it — without it, a scope
     that produced drift at 30 days but no movement would have that drift silently REPLACED by the
     60- and then 90-day version, so the sentence would name a different era depending on whether an
     unrelated family happened to fire. (The comment at the guard credits CodeRabbit, v90.)
     The fixture makes the two windows disagree about the SIZE of the drift, which is the only way to
     see which one was kept: Barra rose in two steps, so the 30-day view is a smaller move than the
     60-day view, and no window produces enough movement to stop the loop. */
  /* The fixture has to do two things at once, and neither is optional. The loop must REACH a later
     window, so the 30-day move must be under the 0.3pt floor — which is why there are nine plates:
     the movement figure is an average and the drift is one plate, so the only way to keep one small
     while the other is large is to dilute it. And the two windows must DISAGREE about the drift, so
     Truffle rose in two equal steps: $0.25 over 30 days and $0.50 over 60.
     What then happens is the exact sequence the guard is for — no movement at 30 days, drift
     recorded; movement at 60 days, which stops the loop; and the 60-day drift must not overwrite the
     30-day one on the way past. */
  const P = [prod('P_DRIFT', { cost_per_base_unit: 0.75, base_unit: 'ea' }),
             prod('P_FLAT', { cost_per_base_unit: 0.5, base_unit: 'ea' })];
  const K = [king('K_DRIFT', 'P_DRIFT', 'Truffle'), king('K_FLAT', 'P_FLAT', 'Bread')];
  const plates = [plate('PL0', 'Drifter', [line('K_DRIFT', 1)])];
  const menu = [dish('MI0', 'Drifter', 'PL0', 10)];
  for (let i = 1; i < 9; i++) {
    plates.push(plate('PL' + i, 'Flat ' + i, [line('K_FLAT', 1)]));
    menu.push(dish('MI' + i, 'Flat ' + i, 'PL' + i, 10));
  }
  const s = {
    cogsPct: 30, PRODUCTS: P, kitchenIngredients: K, savedPlates: plates, MENU: menu,
    ingPriceLog: {
      P_DRIFT: [{ t: ago(80), v: 0.25 }, { t: ago(45), v: 0.5 }, { t: ago(15), v: 0.75 }],
      P_FLAT: [{ t: ago(200), v: 0.5 }],
    },
  };
  const out = run(s);
  const mv = find(out, 'costbase');
  assert.ok(mv, 'the fixture is only meaningful if a LATER window did produce movement');
  assert.equal(mv.facts.pts, 0.6, 'and that movement is the 60-day one');

  const c = fires(out, 'drift');
  assert.equal(c.facts.up, 0.25, 'the 30-day rise, not the $0.50 the 60-day window would report');
  assert.equal(c.facts.fromPct, 5, 'and the 30-day starting point');
});

test('BUILDER: with two plates drifting equally, the FIRST is reported, not the last', () => {
  /* `(toPct-fromPct)>(worst.toPct-worst.fromPct)` — a tie must not move the answer, or which plate
     the Dashboard names would depend on the order rows came back from the database. */
  const s = {
    cogsPct: 30,
    PRODUCTS: [prod('P_X', { cost_per_base_unit: 0.03 })],
    kitchenIngredients: [king('K_X', 'P_X', 'Fish')],
    savedPlates: [plate('PL1', 'Alpha Plate', [line('K_X', 100)]), plate('PL2', 'Beta Plate', [line('K_X', 100)])],
    MENU: [dish('MI1', 'Alpha Plate', 'PL1', 10), dish('MI2', 'Beta Plate', 'PL2', 10)],
    ingPriceLog: { P_X: [{ t: ago(60), v: 0.02 }, { t: ago(20), v: 0.03 }] },
  };
  const c = fires(run(s), 'drift');
  assert.equal(c.facts.name, 'Alpha Plate', 'identical drift is a tie, and a tie keeps the incumbent');
});

test('BUILDER: a plate whose reconstructed cost is ZERO is not a comparable past', () => {
  /* `then.cost>0`. A month where every logged price was zero reconstructs to a cost of nothing, and
     that is not a cheaper plate — it is a plate with no usable history. Averaging it in reports a
     rise from zero, which is the largest rise there is. */
  const s = MOVEMENT();
  s.PRODUCTS.push(prod('P_FREE', { cost_per_base_unit: 0.01 }));
  s.kitchenIngredients.push(king('K_FREE', 'P_FREE', 'Freebie'));
  s.savedPlates.push(plate('PL3', 'Free Plate', [line('K_FREE', 100)]));
  s.MENU.push(dish('MI3', 'Free Plate', 'PL3', 10));
  s.ingPriceLog.P_FREE = [{ t: ago(60), v: 0 }, { t: ago(20), v: 0.01 }];

  const c = fires(run(s), 'costbase');
  assert.equal(c.facts.pts, 3, 'the two plates with a real past are the whole average');
  assert.equal(c.facts.plates, 2);
});

test('BUILDER: the volatile ingredient named is the WIDEST swinger, and a tie keeps the first', () => {
  /* `if(s>volSpread)` picks which ingredient the volatility sentence blames, and the spread is the
     price band times the quantity used — so the biggest band does not always win. A tie must keep
     the incumbent for the same reason as the drift tie above. Both lines below use the same product
     band at the same quantity, so their spreads are identical to the last bit. */
  const s = VOLATILITY();
  s.savedPlates[0].lines = [line('K_SQUID', 200), line('K_SQUID2', 200)];
  s.PRODUCTS.push(prod('P_SQUID2', { cost_per_base_unit: 0.01 }));
  s.kitchenIngredients.push(king('K_SQUID2', 'P_SQUID2', 'second squid'));
  s.ingPriceLog.P_SQUID2 = [{ t: ago(10), v: 0.008 }, { t: ago(5), v: 0.012 }];

  const c = fires(run(s), 'volatility');
  assert.match(c.text, /with squid prices/, 'an equal spread is a tie, and a tie keeps the first');
});

/* --- family 5: what ends a run of over-target months --- */

test('BUILDER: a plate sitting EXACTLY on target has no run — over means over', () => {
  /* `d.cost/d.price > tf`, and `>=` here would report every plate that has hit its target exactly as
     a long-standing problem. The fixture is exact rather than near: $3.00 of lamb on a $10 plate is
     30.0% against a 30% target, with both sides landing on the same double. */
  const s = LONGSTANDING();
  s.savedPlates[0].lines = [line('K_LAMB', 150)];       // 150g x $0.02 = $3.00 on $10 = exactly 30%
  s.ingPriceLog.P_LAMB = [{ t: ago(400), v: 0.025 }];   // and it WAS over target, every month behind
  /* The history matters: without it the walk would end at the first month anyway and the test would
     pass whatever this guard did. A plate that has just come back to target is precisely the one a
     `>=` here would keep reporting as a standing problem. */
  silent(run(s), 'longstanding');

  const over = LONGSTANDING();
  over.savedPlates[0].lines = [line('K_LAMB', 151)];    // one gram over is over
  over.ingPriceLog.P_LAMB = [{ t: ago(400), v: 0.02 }];
  assert.ok(fires(run(over), 'longstanding').facts.months >= 3, 'and just over target still counts');
});

test('BUILDER: a month back AT target ends the run, and the count stops there', () => {
  /* The second `> tf`, inside the walk. A month that met the target is not part of "over target
     through every cost change", so the run has to end — and the number reported is the whole of what
     the sentence claims. Lamb was exactly on target until 150 days ago and over it since. */
  const s = LONGSTANDING();
  s.PRODUCTS[0].cost_per_base_unit = 0.021;             // $3.15 now: over
  s.savedPlates[0].lines = [line('K_LAMB', 150)];
  s.ingPriceLog.P_LAMB = [{ t: ago(400), v: 0.02 }, { t: ago(130), v: 0.021 }];

  const c = fires(run(s), 'longstanding');
  assert.equal(c.facts.months, 4, 'four monthly probes are over target; the fifth is exactly on it');
});

test('BUILDER: a plate costed only from misc lines has no logged history, so it has no run', () => {
  /* `!(c.priced>0)` — `complete` is true for a misc-only plate (nothing failed to price) and its
     cost is a real number, so `priced` is the only guard that can tell "reconstructed" from "carried
     along". Without it, a plate costed as a single hand-typed figure would be reported as having
     been over target through every cost change, having been through none. */
  const s = LONGSTANDING();
  s.savedPlates[0] = plate('PL1', 'Bought In', [misc(4)]);   // $4.00 on $10 = 40%, over target forever
  silent(run(s), 'longstanding');
});

test('BUILDER: a month the plate cannot be fully reconstructed at ends the run', () => {
  /* `!c.complete` — one ingredient with no price that far back means the cost that month is a
     partial sum, and a partial sum compared against a target is a smaller number than the truth.
     The run must stop rather than continue on the half of the plate that does have history.
     Mint's log starts 100 days ago, so probes past that are incomplete while Lamb's still resolve. */
  const s = LONGSTANDING();
  s.PRODUCTS.push(prod('P_MINT', { cost_per_base_unit: 0.02 }));
  s.kitchenIngredients.push(king('K_MINT', 'P_MINT', 'Mint'));
  s.savedPlates[0].lines = [line('K_LAMB', 150), line('K_MINT', 50)];
  s.ingPriceLog.P_MINT = [{ t: ago(100), v: 0.02 }];

  const c = fires(run(s), 'longstanding');
  assert.equal(c.facts.months, 3, 'three probes are complete; the fourth reaches past Mint’s history');
});

test('BUILDER: EXACTLY three months is a run — under that, "always" would mean "twice"', () => {
  /* The `>=3` is the whole of what makes the sentence honest, and this is its boundary. The existing
     SILENCE test above covers two months; this covers three, and the pair is what pins the operator. */
  const s = LONGSTANDING();
  s.ingPriceLog.P_LAMB = [{ t: ago(100), v: 0.02 }];    // probes at 30/60/90 hold, 120 reaches past it
  const c = fires(run(s), 'longstanding');
  assert.equal(c.facts.months, 3);
});

test('BUILDER: with two equally long runs, the FIRST plate is reported', () => {
  /* `months>bestRun.months` — a tie keeps the incumbent, for the same reason as the drift tie. */
  const s = LONGSTANDING();
  s.savedPlates = [
    plate('PL1', 'Alpha Roast', [line('K_LAMB', 200)]),
    plate('PL2', 'Beta Roast', [line('K_LAMB', 200)]),
  ];
  s.MENU = [dish('MI1', 'Alpha Roast', 'PL1', 10), dish('MI2', 'Beta Roast', 'PL2', 10)];
  const c = fires(run(s), 'longstanding');
  assert.equal(c.facts.name, 'Alpha Roast');
});

/* --- family 7: the one price per plate --- */

test('BUILDER: an unpriced publication of a plate does not hide its real price', () => {
  /* `!(m.price>0)` in the supplier pass, and it runs BEFORE the first-price-wins rule below — so a
     zero-priced publication listed first would otherwise claim the slot and take the plate out of
     the population entirely. The fixture puts it first on purpose; a plate published twice, once
     without a price, is ordinary. */
  const s = CONCENTRATION();
  s.MENU.unshift(dish('MI0', 'Salad One Draft', 'PL1', 0));

  const c = fires(run(s), 'concentration');
  assert.equal(c.facts.total, 4, 'the plate keeps its real price and stays in the population');
  assert.equal(c.facts.plates, 3);
});

test('BUILDER: a plate published twice is counted ONCE, at the FIRST price found', () => {
  /* `priceByPlate[id]==null` is what makes it the first. The figure is about a plate's cost
     exposure, so counting it twice would weight it by how often it was published — and which
     publication wins changes the consequence figure, because it is the divisor.
     ⚠️ ALL THREE FIGURES ARE ASSERTED HERE, in one test, and that is a correction rather than
     thoroughness. This was two tests: one claiming "counted once, at the first price found" while
     asserting only `total` and `plates`, and one asserting `pts`. The first could not check its own
     title — `total` and `plates` are counted by walking `savedPlates`, so a duplicate MENU row
     cannot move them whichever price wins, and inverting the guard to last-wins left it green.
     Found by the pre-push review. A test whose title names a property its assertions cannot see is
     worse than no test, because the title is what the next reader trusts. */
  const s = CONCENTRATION();
  const first = fires(run(s), 'concentration');
  s.MENU.push(dish('MI9', 'Salad One Again', 'PL1', 100));
  const c = fires(run(s), 'concentration');

  assert.equal(c.facts.total, 4, 'four plates, not five');
  assert.equal(c.facts.plates, 3, 'and the same reach');
  sameFact(c, first, 'pts', 'and the same consequence — the SECOND price at $100 must not become the divisor');
});

test('BUILDER: a line pointing at a deleted kitchen ingredient is skipped, not fatal', () => {
  /* `k&&k.pid!=null` — the first half. A plate line can outlive the kitchen ingredient it names, and
     reading `.pid` off the missing one throws inside the try/catch, which does not crash the page:
     it silently drops families 7 and 8 for the whole café. */
  const s = CONCENTRATION();
  s.savedPlates[0].lines.push(line('K_GONE', 50));
  const c = fires(run(s), 'concentration');
  assert.equal(c.facts.plates, 3, 'the real lines are still read');
});

/* --- family 8: which products are comparable, and which of them is the outlier --- */

test('BUILDER: the anomaly compares the dearest against the NEXT dearest, whatever order they arrive in', () => {
  /* The group is sorted before top and next are read. Product order is whatever the database
     returned, so without the sort the "dearest" is simply the first row that happened to load — and
     the ratio would then be computed between two arbitrary products. The fixture puts the real
     outlier LAST, which is the only arrangement that can tell a sort from no sort. */
  const s = ANOMALY();
  s.PRODUCTS.reverse();
  const c = fires(run(s), 'anomaly');
  assert.match(c.text, /Saffron/, 'the dearest is found by value, not by position');
  assert.equal(c.facts.top, 55, '$0.055/g still displays as $55.00/kg');
  assert.equal(c.facts.mult, 4.2, 'and is still compared against the SECOND dearest, 55 / 13');
});

test('BUILDER: a product priced at zero is not comparable, and must not PAD a group to quorum', () => {
  /* `!(v>0)` on the per-display value. A zero is what a $0.00 invoice line leaves behind, and the
     damage it does is not to the ratio — the sort puts it last — but to the COUNT. The anomaly
     family needs four comparable products before "next dearest" means anything, and a zero admitted
     into the group is a fourth member that cannot be compared with anything. The group below has
     three real products and is deliberately one short: with the zero counted it reaches quorum and
     the family speaks about a group of three. */
  const s = {
    cogsPct: 30,
    PRODUCTS: [
      prod('P_SAFF', { description: 'Saffron', cost_per_base_unit: 0.055 }),
      prod('P_BEEF', { description: 'Beef', cost_per_base_unit: 0.013 }),
      prod('P_ONION', { description: 'Onion', cost_per_base_unit: 0.008 }),
      prod('P_ZERO', { description: 'Zeroed', cost_per_base_unit: 0 }),
    ],
    kitchenIngredients: ['P_SAFF', 'P_BEEF', 'P_ONION', 'P_ZERO'].map((p) => king('K_' + p, p, p)),
    savedPlates: [plate('PL1', 'Everything', ['P_SAFF', 'P_BEEF', 'P_ONION', 'P_ZERO'].map((p) => line('K_' + p, 10)))],
    MENU: [dish('MI1', 'Everything', 'PL1', 10)],
  };
  silent(run(s), 'anomaly');

  /* And the same group with a real fourth price DOES speak — otherwise the silence above could be
     coming from anywhere, and the test would prove nothing about the zero. */
  const t = JSON.parse(JSON.stringify(s));
  t.PRODUCTS[3].cost_per_base_unit = 0.009;
  assert.equal(fires(run(t), 'anomaly').facts.top, 55);
});

test('BUILDER: with two unit groups tied on ratio, the FIRST is reported', () => {
  /* `ratio>bestAnom.ratio` across the by-unit groups. Grams and millilitres are compared on the same
     scale, so a tie is reachable, and it must not depend on key order. */
  const ids = ['P_G1', 'P_G2', 'P_G3', 'P_G4', 'P_M1', 'P_M2', 'P_M3', 'P_M4'];
  const s = {
    cogsPct: 30,
    PRODUCTS: [
      prod('P_G1', { description: 'Gram Outlier', base_unit: 'g', cost_per_base_unit: 0.05 }),
      prod('P_G2', { description: 'Gram Two', base_unit: 'g', cost_per_base_unit: 0.01 }),
      prod('P_G3', { description: 'Gram Three', base_unit: 'g', cost_per_base_unit: 0.009 }),
      prod('P_G4', { description: 'Gram Four', base_unit: 'g', cost_per_base_unit: 0.008 }),
      prod('P_M1', { description: 'Milli Outlier', base_unit: 'ml', cost_per_base_unit: 0.05 }),
      prod('P_M2', { description: 'Milli Two', base_unit: 'ml', cost_per_base_unit: 0.01 }),
      prod('P_M3', { description: 'Milli Three', base_unit: 'ml', cost_per_base_unit: 0.009 }),
      prod('P_M4', { description: 'Milli Four', base_unit: 'ml', cost_per_base_unit: 0.008 }),
    ],
    kitchenIngredients: ids.map((p) => king('K_' + p, p, p)),
    savedPlates: [plate('PL1', 'Everything', ids.map((p) => line('K_' + p, 10)))],
    MENU: [dish('MI1', 'Everything', 'PL1', 10)],
  };
  const c = fires(run(s), 'anomaly');
  assert.match(c.text, /Gram Outlier/, 'identical ratios are a tie, and a tie keeps the first');
});

test('BUILDER: an ingredient with no name is not COUNTED as an ingredient', () => {
  /* `nm && !seen[nm]` — the first half. `seen` is keyed by name, so a nameless line would key the
     empty string and count as an ingredient nobody can see. The count it feeds is the 6+ threshold
     that splits complex plates from simple ones, and a plate pushed over that line by a blank moves
     from one average to the other and takes both figures with it.
     The fixture's Toastie and Wrap carry SIX lines and FIVE names, which is the only arrangement
     that can tell a line count from a name count.
     ⚠️ The nameless ingredient is built as a raw object rather than through king(), because that
     helper falls back to the id when the name is blank — an earlier draft used it and the fixture
     silently had six names, so the test passed and proved nothing. */
  const PRODUCTS = [], kitchenIngredients = [];
  for (let i = 0; i < 6; i++) {
    PRODUCTS.push(prod('P' + i, { cost_per_base_unit: 0.01 }));
    kitchenIngredients.push(king('K' + i, 'P' + i, 'ing' + i));
  }
  PRODUCTS.push(prod('PN', { description: '', cost_per_base_unit: 0.01 }));
  kitchenIngredients.push({ id: 'KN', pid: 'PN', name: '' });

  const many = [0, 1, 2, 3, 4, 5].map((i) => line('K' + i, 58.3333));      // 6 names → the complex side
  const five = [0, 1, 2, 3, 4].map((i) => line('K' + i, 25)).concat([line('KN', 125)]);   // 6 lines, 5 names
  const s = {
    cogsPct: 30, PRODUCTS, kitchenIngredients,
    savedPlates: [plate('PL1', 'Loaded Fries', many), plate('PL2', 'Big Board', many),
                  plate('PL3', 'Toastie', five), plate('PL4', 'Wrap', five)],
    MENU: [dish('MI1', 'Loaded Fries', 'PL1', 10), dish('MI2', 'Big Board', 'PL2', 10),
           dish('MI3', 'Toastie', 'PL3', 10), dish('MI4', 'Wrap', 'PL4', 10)],
  };
  const c = fires(run(s), 'complexity');
  assert.equal(c.facts.fewPct, 25, 'the five-name plates are the SIMPLE side');
  assert.equal(c.facts.manyPct, 35);
  assert.equal(c.facts.gap, 10, 'a blank name must not push a plate across the 6-ingredient line');
});

test('BUILDER: with two suppliers on equally many plates, the FIRST is reported', () => {
  /* `platesBySup[s]>platesBySup[topSup]` — the reach figure names ONE supplier, and a tie must not
     make the name depend on which order the plates happened to be walked in. Six plates, three each,
     so the two are exactly level and both clear the family's own 3-plate and 40%-share gates. */
  const PRODUCTS = [prod('P_A', { supplier: 'Alpha Foods', cost_per_base_unit: 0.01 }),
                    prod('P_B', { supplier: 'Beta Supply', cost_per_base_unit: 0.01 })];
  const kitchenIngredients = [king('K_A', 'P_A', 'Greens'), king('K_B', 'P_B', 'Rice')];
  const savedPlates = [], MENU = [];
  for (let i = 0; i < 3; i++) {
    savedPlates.push(plate('PA' + i, 'Alpha Plate ' + i, [line('K_A', 100)]));
    MENU.push(dish('MA' + i, 'Alpha Plate ' + i, 'PA' + i, 10));
  }
  for (let i = 0; i < 3; i++) {
    savedPlates.push(plate('PB' + i, 'Beta Plate ' + i, [line('K_B', 100)]));
    MENU.push(dish('MB' + i, 'Beta Plate ' + i, 'PB' + i, 10));
  }
  const c = fires(run({ cogsPct: 30, PRODUCTS, kitchenIngredients, savedPlates, MENU }), 'concentration');
  assert.match(c.text, /^Alpha Foods is in 3 of your 6 costed plates/, 'a tie keeps the incumbent');
});

test('BUILDER: an explicit seed is HONOURED, and is not quietly replaced by the derived one', () => {
  /* `seed==null ? insightSeedFor(scope) : seed`. The seed picks which wording of an insight the
     owner sees, and it exists so a render is stable rather than reshuffling on every repaint. The
     caller passing one explicitly is the whole of how these tests stay deterministic — every `run`
     in this file passes 0 — so a builder that ignored it would make the entire suite depend on a
     hash of the fixture's menu, and the failures would look like flakiness rather than a bug.
     Two different seeds must therefore produce two different wordings of the same fact. */
  const healthy = {
    cogsPct: 30, PRODUCTS: [], kitchenIngredients: [],
    savedPlates: [plate('PL1', 'Soup', [misc(2)]), plate('PL2', 'Toast', [misc(2)])],
    MENU: [dish('MI1', 'Soup', 'PL1', 10), dish('MI2', 'Toast', 'PL2', 10)],
  };
  setAppState(healthy);
  const one = computeInsights(DASH_ALL, 1);
  const two = computeInsights(DASH_ALL, 2);
  assert.equal(one[0].kind, 'allgood');
  assert.equal(two[0].kind, 'allgood');
  assert.notEqual(one[0].text, two[0].text, 'two seeds, two wordings — the seed reached the phrasing');
  assert.equal(computeInsights(DASH_ALL, 1)[0].text, one[0].text, 'and the same seed is stable');
});
