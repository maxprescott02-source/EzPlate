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
