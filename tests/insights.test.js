/*
 * insights.test.js — the PURE deterministic insight engine (v63 item 3a; broadened v67; refined v71;
 * depth pass v74; REWRITTEN v90).
 *
 * v90's bar (Max): "Eggs are in 8 plates" is useless — the owner already knows what is in their own
 * plates. The previous bar ("not visible in the menu table") was too weak. So:
 *   RULE A — an insight combines at least TWO dimensions, or is a single aggregate across the whole
 *            dataset. Pinned directly by ruleA, and again through deriveInsights.
 *   RULE B — it points at a decision and never prescribes the fix (no swaps, portions or prices).
 *   RULE C — EzPlate has NO sales volume, so every ranking is by COST EFFICIENCY and nothing may
 *            imply profit impact or money earned/lost.
 * Six v75 families were deleted for failing A or C; the tests that pinned them went with them, which
 * is deliberate (see the "REMOVED" note in js/app.js). Extracted from js/app.js — the real shipped
 * code, no second copy to drift.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  ruleA, scopeAllows, pts1,
  insCostBase, insDrift, insCategory, insVolatility, insLongStanding, insNearCluster,
  insConcentration, insPriceAnomaly, insComplexity,
  healthyLine, selectInsights, deriveInsights, insightScore, INSIGHT_FLOOR,
} = require('./_extract.js');

const dish = (name, cost, menuPrice, extra) => Object.assign({ name, cost, menuPrice }, extra || {});

// MONEY LAW: every number shown in an insight's text must be present in its facts (the client + server
// phrasing validators depend on exactly this). Pins that no family invents a figure.
const numbersInFactsOnly = (c) => {
  const allowed = Object.values(c.facts).filter((v) => typeof v === 'number');
  return (c.text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
    .every((n) => allowed.some((a) => Math.abs(a - n) < 0.005));
};
// RULE C: the forbidden register. Cost efficiency is fine; money made or lost is not.
const VOLUME_CLAIMS = /profit|revenue|sales|earn|earns|earned|makes you|costing you|lost|losing|per 100 serves|money/i;

/* ================================================================ Rule A itself */

test('Rule A: one dimension is rejected — the "in N plates" shape never emits on its own', () => {
  assert.equal(ruleA({ dims: ['breadth'] }), false);
  assert.equal(ruleA({ dims: ['time'] }), false);
  assert.equal(ruleA({ dims: ['comparison'] }), false);
  assert.equal(ruleA({ dims: ['composition'] }), false);
  assert.equal(ruleA({ dims: ['distribution'] }), false);
});

test('Rule A: two dimensions pass — the same fact paired with a second one does emit', () => {
  assert.ok(ruleA({ dims: ['breadth', 'time'] }));
  assert.ok(ruleA({ dims: ['breadth', 'aggregation'] }));
  assert.ok(ruleA({ dims: ['distribution', 'comparison'] }));
});

test('Rule A: a whole-dataset AGGREGATE is the one dimension allowed to stand alone', () => {
  assert.ok(ruleA({ dims: ['aggregation'] }));
});

test('Rule A: duplicates do not count twice, and unknown dimensions do not count at all', () => {
  assert.equal(ruleA({ dims: ['time', 'time'] }), false);
  assert.equal(ruleA({ dims: ['time', 'vibes'] }), false);
  assert.equal(ruleA({ dims: [] }), false);
  assert.equal(ruleA({}), false);
  assert.equal(ruleA(null), false);
});

test('scopeAllows: menu-only types are suppressed at all-menus, global-only at menu scope', () => {
  assert.equal(scopeAllows({ scope: 'menu' }, true), false);
  assert.ok(scopeAllows({ scope: 'menu' }, false));
  assert.equal(scopeAllows({ scope: 'global' }, false), false);
  assert.ok(scopeAllows({ scope: 'global' }, true));
  assert.ok(scopeAllows({}, true));                                  // no scope declared = meaningful at both
  assert.ok(scopeAllows({}, false));
});

test('pts1: points are reported to one decimal', () => {
  assert.equal(pts1(1.24), 1.2);
  assert.equal(pts1(1.26), 1.3);
});

/* ================================================================ F1 — cost-base movement */

const MV = { pts: 1.2, name: 'Beef', ingPct: 18, plates: 5, sinceLabel: 'April' };

test('F1: the average moved, the culprit is named, and its reach is stated (time × aggregation × breadth)', () => {
  const [c] = insCostBase(MV);
  assert.equal(c.kind, 'costbase');
  assert.ok(ruleA(c));
  assert.match(c.text, /1\.2 pts higher/);
  assert.match(c.text, /Beef, up 18% across 5 plates/);
  /* `name` is in facts, not only in the text. The phrasing validator sequences the STRING values in
     facts, so a subject that lives only in the text has nothing to sequence and a rewording may blame
     a different ingredient with every figure intact — measured and accepted before this key existed.
     The whole object is compared rather than the one key: a deepEqual is what makes a DROPPED key red,
     and dropping it is the regression this pins. */
  assert.deepEqual(c.facts, { name: 'Beef', pts: 1.2, ingPct: 18, plates: 5 });
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F1: a falling cost base reads as lower/down, not as a problem', () => {
  const [c] = insCostBase(Object.assign({}, MV, { pts: -0.9, ingPct: -12 }));
  assert.match(c.text, /0\.9 pts lower/);
  assert.match(c.text, /down 12%/);
  assert.ok(numbersInFactsOnly(c));
});

test('F1: silent when the move is noise, the ingredient barely moved, or there is no reference month', () => {
  assert.deepEqual(insCostBase(Object.assign({}, MV, { pts: 0.2 })), []);      // <0.3 pts
  assert.deepEqual(insCostBase(Object.assign({}, MV, { ingPct: 1 })), []);     // <3% ingredient move
  assert.deepEqual(insCostBase(Object.assign({}, MV, { sinceLabel: null })), []);
  assert.deepEqual(insCostBase(Object.assign({}, MV, { name: null })), []);
  assert.deepEqual(insCostBase(null), []);
});

/* ================================================================ F2 — plate drift */

const DR = { name: 'Breakky Burger', up: 1.2, fromPct: 28, toPct: 34, sinceLabel: 'June', priceHeld: false };

test('F2: without price history it states COST drift only, and says the comparison uses today’s price', () => {
  const [c] = insDrift(DR);
  assert.equal(c.kind, 'drift');
  assert.ok(ruleA(c));
  assert.match(c.text, /cost \$1\.20 more than in June/);
  assert.match(c.text, /at today’s price/);
  assert.doesNotMatch(c.text, /price (hasn|did)/i, 'must not claim the price held without proof');
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F2: the "its price hasn’t moved" clause appears ONLY when the sell-price log proves it', () => {
  const [c] = insDrift(Object.assign({}, DR, { priceHeld: true }));
  assert.match(c.text, /its price hasn’t moved/);
  assert.ok(numbersInFactsOnly(c));
});

test('F2: silent below a real move in both money and points', () => {
  assert.deepEqual(insDrift(Object.assign({}, DR, { up: 0.05 })), []);          // pennies
  assert.deepEqual(insDrift(Object.assign({}, DR, { toPct: 29 })), []);         // <2 pts
  assert.deepEqual(insDrift(Object.assign({}, DR, { sinceLabel: null })), []);  // no reference month
  assert.deepEqual(insDrift(null), []);
});

/* ================================================================ F3 — category imbalance */

// v92: category is no longer menu-only. It was the strongest family needing NO price history, and
// suppressing it at all-menus meant the DEFAULT scope could only ever show snapshot-only families —
// which is exactly how the panel filled up with weak lines. A section average across every menu is
// still an aggregate over a real group of plates.
test('F3: section averages, available at BOTH scopes (v92)', () => {
  const [c] = insCategory([
    dish('A', 3, 15, { section: 'Breakfast' }), dish('B', 3.3, 15, { section: 'Breakfast' }),
    dish('C', 5, 15, { section: 'Lunch' }), dish('D', 5.2, 15, { section: 'Lunch' }),
  ], 0.3);
  assert.equal(c.kind, 'category');
  assert.ok(ruleA(c));
  assert.ok(scopeAllows(c, true), 'v92: category must now run at all-menus scope too');
  assert.ok(scopeAllows(c, false));
  assert.match(c.text, /Breakfast plates average \d+% food cost, Lunch sits at \d+%/);
  assert.ok(numbersInFactsOnly(c));
});

test('F3: needs ≥2 sections of ≥2 plates and a ≥3-pt gap', () => {
  assert.deepEqual(insCategory([dish('A', 3, 15, { section: 'Breakfast' }), dish('B', 3, 15, { section: 'Breakfast' })], 0.3), []);
  assert.deepEqual(insCategory([
    dish('A', 4.5, 15, { section: 'Breakfast' }), dish('B', 4.5, 15, { section: 'Breakfast' }),
    dish('C', 4.6, 15, { section: 'Lunch' }), dish('D', 4.6, 15, { section: 'Lunch' }),
  ], 0.3), [], 'a sub-3-pt gap is not an imbalance');
});

/* ================================================================ F4 — volatility */

test('F4: the widest swing as a food-cost % band, plus its standing (distribution × comparison)', () => {
  const [c] = insVolatility([
    dish('Barra & Chips', 5, 15, { hasRange: true, costMin: 3.9, costMax: 5.7, volatileIng: 'fish' }),
    dish('Toastie', 4, 15, { hasRange: true, costMin: 3.9, costMax: 4.1, volatileIng: 'cheese' }),
  ]);
  assert.equal(c.kind, 'volatility');
  assert.ok(ruleA(c));
  assert.match(c.text, /Barra & Chips swings 26–38% with fish prices/);
  assert.match(c.text, /least predictable plate/);
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F4: no logged range, or a swing under 4 pts, says nothing', () => {
  assert.deepEqual(insVolatility([dish('A', 5, 15)]), []);
  assert.deepEqual(insVolatility([dish('A', 5, 15, { hasRange: true, costMin: 4.9, costMax: 5.1 })]), []);
});

/* ================================================================ F5 — long-standing problem */

const LS = { name: 'Barra & Chips', months: 4, sinceLabel: 'April', priceHeld: false };

test('F5: a run through every recorded cost change, not a one-off (time × comparison)', () => {
  const [c] = insLongStanding(LS);
  assert.equal(c.kind, 'longstanding');
  assert.ok(ruleA(c));
  assert.match(c.text, /over target through every cost change since April/);
  assert.match(c.text, /4 months/);
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F5: the no-price-move clause appears only when the sell-price log proves it', () => {
  assert.doesNotMatch(insLongStanding(LS)[0].text, /price/i);
  assert.match(insLongStanding(Object.assign({}, LS, { priceHeld: true }))[0].text, /no price move/);
});

test('F5: HISTORY DEPTH — under 3 months it stays silent rather than call two points a run', () => {
  assert.deepEqual(insLongStanding(Object.assign({}, LS, { months: 2 })), []);
  assert.deepEqual(insLongStanding(Object.assign({}, LS, { sinceLabel: null })), []);
  assert.deepEqual(insLongStanding(null), []);
});

/* ================================================================ F6 — near-miss cluster */

// v93 (Max): NAME the plates. "3 plates" sends you hunting for which three; the names are the
// insight. Beyond two the names stop being scannable, so the rest become a counted remainder —
// which is a figure, so the money law puts it in facts.
test('F6: the plates are NAMED, and the remainder beyond two is counted', () => {
  const [c] = insNearCluster([
    dish('Barra & Chips', 4.5, 15), dish('Cheeseburger', 4.52, 15), dish('Toastie', 4.48, 15), dish('D', 7, 15),
  ], 0.3);
  assert.equal(c.kind, 'nearcluster');
  assert.ok(ruleA(c));
  assert.equal(c.facts.count, 3);
  assert.equal(c.facts.others, 1);
  assert.match(c.text, /^Barra & Chips, Cheeseburger and 1 other sit within half a point of your 30% target\.$/);
  assert.ok(numbersInFactsOnly(c));
});

// The remainder is counted off the CLUSTER, not off the names we happen to have: a qualifying plate
// with a blank name still sits in it, and counting from the names would print "A and B" over a
// facts.count of 4. (CodeRabbit, v93.)
test('F6: an unnamed plate in the cluster still counts toward the remainder', () => {
  const [c] = insNearCluster([
    dish('Barra & Chips', 4.5, 15), dish('Cheeseburger', 4.52, 15),
    dish('', 4.48, 15), dish(undefined, 4.51, 15),
  ], 0.3);
  assert.equal(c.facts.count, 4);
  assert.equal(c.facts.others, 2, 'the two nameless plates are not silently dropped from the sentence');
  assert.match(c.text, /^Barra & Chips, Cheeseburger and 2 others sit within/);
});

test('F6: exactly two are named outright, with no remainder clause and no leftover count', () => {
  const [c] = insNearCluster([dish('Barra & Chips', 4.5, 15), dish('Cheeseburger', 4.52, 15)], 0.3);
  assert.equal(c.text, 'Barra & Chips and Cheeseburger sit within half a point of your 30% target.');
  assert.equal(c.facts.others, undefined, 'no remainder, so no remainder figure');
  assert.ok(numbersInFactsOnly(c));
});

// v92 (Max): near-miss is an OPPORTUNITY, not a shortfall. v93 also dropped the trailing
// "— the closest on your menu": it restated the first half in more words.
test('F6: framed as an opportunity, never as a deficit, and with no trailing filler', () => {
  const [c] = insNearCluster([dish('Barra & Chips', 4.5, 15), dish('Cheeseburger', 4.52, 15)], 0.3);
  // Unambiguous deficit register only. "under"/"below" are deliberately NOT banned: in this app
  // sitting UNDER the food-cost target is the good outcome, so forbidding the words would rule out
  // correct copy rather than wrong framing. (CodeRabbit suggested the wider list, v93.)
  assert.doesNotMatch(c.text,
    /\bonly\b|\bjust\b|fall(s|ing)? short|short of|shortfall|deficit|miss(es|ing)?\b|fail|less than your/i);
  assert.doesNotMatch(c.text, /closest|marking|on your menu/i, 'the restating clause is gone');
  assert.ok(c.text.split(/\s+/).length <= 24, 'still inside the scannability cap');
});

test('F6: one plate near target is not a cluster', () => {
  assert.deepEqual(insNearCluster([dish('A', 4.5, 15), dish('B', 7, 15)], 0.3), []);
});

/* ================================================================ F7 — supplier concentration
   v92 (Max): "supplies 20 of 42 plates" is a bare count and must not emit. Reach only means
   something with its CONSEQUENCE attached, and only when the supplier field is filled in enough
   for the reach figure to be about procurement rather than about data entry. */

const SUP = { name: 'Barker’s', plates: 11, total: 14, suppliers: 3, coverage: 0.8, ptsPer10: 1.4 };

test('F7: reach is emitted ONLY with its consequence — breadth × aggregate × comparison, GLOBAL', () => {
  const [c] = insConcentration(SUP);
  assert.equal(c.kind, 'concentration');
  assert.equal(c.scope, 'global');
  assert.ok(ruleA(c));
  assert.equal(scopeAllows(c, false), false, 'concentration must not run at menu scope');
  assert.match(c.text, /is in 11 of your 14 costed plates/);
  assert.match(c.text, /10% rise there would add 1\.4 pts to their average food cost/);
  assert.doesNotMatch(c.text, /spend/i, 'Rule C: concentration is breadth-based, never spend-based');
  // the SUPPLIER is the subject, and it is in facts so the validator can sequence it (see F1)
  assert.deepEqual(c.facts, { name: 'Barker\u2019s', plates: 11, total: 14, rise: 10, pts: 1.4 });
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F7: a BARE COUNT never emits — no consequence, no line', () => {
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { ptsPer10: 0 })), []);
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { ptsPer10: 0.2 })), [], 'below CONC_MIN_PTS');
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { ptsPer10: undefined })), []);
});

test('F7: too little of the supplier field filled in → it would be measuring data entry, so silence', () => {
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { coverage: 0.18 })), [],
    'Max’s real data: 8 of 44 used products carry a supplier');
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { coverage: 0 })), []);
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { coverage: undefined })), []);
});

test('F7: silent with one supplier (trivially "all of them"), thin reach, or too few plates', () => {
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { suppliers: 1 })), []);
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { plates: 4, total: 14 })), []);   // 29% reach
  assert.deepEqual(insConcentration(Object.assign({}, SUP, { plates: 2, total: 3 })), []);    // under 3 plates
  assert.deepEqual(insConcentration(null), []);
});

/* ================================================================ F8 — price ANOMALY
   v92 (Max): the SPREAD version was invalid. It grouped by CATEGORY, which here is a supplier
   catalogue heading and not a substitutability class — on Max's real data it fired "your 6
   VEGETABLES products run $2.10–$13.33 per kg", i.e. brown onions against spinach. An anomaly test
   needs no substitutability claim: it says one number looks out of place next to every other number
   of the same KIND. Grouped by base unit only, compared against the NEXT DEAREST. */

const ANOM = { name: 'Saffron', unit: 'kg', top: 55.2, next: 13.1, count: 9 };

test('F8: names ONE product and asks the owner to check it, rather than claiming a swap', () => {
  const [c] = insPriceAnomaly(ANOM);
  assert.equal(c.kind, 'anomaly');
  assert.equal(c.scope, 'global');
  assert.ok(ruleA(c));
  assert.match(c.text, /Saffron at \$55\.20\/kg is 4\.2x your next dearest ingredient/);
  assert.match(c.text, /worth checking/);
  assert.doesNotMatch(c.text, /swap|switch|instead|cheaper option|use the/i);
  /* the PRODUCT is the subject and is in facts (see F1). The UNIT deliberately is NOT: every string in
     facts is matched against the text as a name, and "kg"/"ea"/"g" hit inside ordinary words —
     "ea" is inside "dearest" in this very template — which would reject faithful rewordings. */
  assert.deepEqual(c.facts, { name: 'Saffron', top: 55.2, mult: 4.2 });
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F8: compares against the NEXT dearest, not the cheapest — being dearest is not an anomaly', () => {
  // a group that spans 4x from top to BOTTOM but only 1.2x from top to runner-up is not an anomaly
  assert.deepEqual(insPriceAnomaly({ name: 'Beef', unit: 'kg', top: 28, next: 23, count: 9 }), []);
});

test('F8: needs a big enough group and a ≥3x ratio', () => {
  assert.deepEqual(insPriceAnomaly(Object.assign({}, ANOM, { count: 3 })), [], 'under ANOM_MIN_GROUP');
  assert.deepEqual(insPriceAnomaly(Object.assign({}, ANOM, { next: 20 })), []);   // 2.8x
  assert.deepEqual(insPriceAnomaly(Object.assign({}, ANOM, { unit: '' })), []);
  assert.deepEqual(insPriceAnomaly(null), []);
});

/* ================================================================ kept families */

test('insComplexity: many-ingredient vs simpler plates, when the pattern holds', () => {
  const [c] = insComplexity([
    dish('A', 6, 15, { nIng: 8 }), dish('B', 6.2, 15, { nIng: 7 }),
    dish('C', 4, 15, { nIng: 3 }), dish('D', 4.1, 15, { nIng: 2 }),
  ]);
  assert.ok(ruleA(c));
  assert.match(c.text, /Plates with 6\+ ingredients average \d+% food cost, simpler ones \d+%/);
  assert.ok(numbersInFactsOnly(c));
});

// v92: the gap gate is 5 pts, not 3. At 3 the candidate scored under INSIGHT_FLOOR and was dropped
// after passing its own gate — see the minimum-gate test above.
test('insComplexity: a gap inside café noise (under 5 pts) is not a pattern', () => {
  assert.deepEqual(insComplexity([
    dish('A', 5.1, 15, { nIng: 8 }), dish('B', 5.1, 15, { nIng: 7 }),
    dish('C', 4.5, 15, { nIng: 3 }), dish('D', 4.5, 15, { nIng: 2 }),
  ]), [], 'a 4-pt gap says nothing');
});

/* ================================================================ the VALUE layer (v92)
   Families used to emit and the panel displayed, capped only by menu size — so five weak lines could
   fill it whenever the strong families were starved of price history. Value is now declared on two
   axes and a hard FLOOR drops anything not worth the owner's attention, however empty the panel. */

test('value: score rises with non-obviousness, actionability and the size of THIS instance', () => {
  assert.ok(insightScore('drift', 1) > insightScore('nearcluster', 1), 'a named plate beats a count');
  assert.ok(insightScore('costbase', 1) > insightScore('complexity', 1));
  assert.ok(insightScore('drift', 1) > insightScore('drift', 0.5), 'a bigger move is worth more');
});

test('value: magnitude is clamped, so no instance can be scored out of its family’s band', () => {
  assert.equal(insightScore('drift', 5), insightScore('drift', 1));
  assert.equal(insightScore('drift', -3), insightScore('drift', 0.5));
  assert.equal(insightScore('nosuchfamily', 1), 0, 'an unrated kind is worth nothing, not a default');
});

test('value: every emitting family can clear the floor at full magnitude — no dead families', () => {
  ['drift', 'costbase', 'longstanding', 'volatility', 'anomaly', 'category', 'complexity',
    'concentration', 'nearcluster'].forEach((k) => {
    assert.ok(insightScore(k, 1) >= INSIGHT_FLOOR, `${k} can never display: ${insightScore(k, 1)}`);
  });
});

/* A family's own emit gate and INSIGHT_FLOOR must AGREE. If a family admits an instance the floor
   then refuses, the gate means nothing and the instance vanishes silently between the two — which is
   worse than either bar alone, because the thresholds documented on the family are no longer the
   thresholds in force. This caught anomaly (42.3 at its 3x gate) and complexity (42.6 at its old
   3-pt gap) against a floor of 45. (CodeRabbit, v92.) Every family, at the WEAKEST input it accepts. */
test('value: a family that emits at its minimum gate always clears the floor — no silent dead zone', () => {
  const atMinimum = {
    costbase: () => insCostBase(Object.assign({}, MV, { pts: 0.3, ingPct: 3, plates: 1 })),
    drift: () => insDrift(Object.assign({}, DR, { up: 0.2, fromPct: 28, toPct: 30 })),
    longstanding: () => insLongStanding(Object.assign({}, LS, { months: 3 })),
    volatility: () => insVolatility([dish('A', 5, 15, { hasRange: true, costMin: 4.85, costMax: 5.45 })]),
    anomaly: () => insPriceAnomaly({ name: 'X', unit: 'kg', top: 30, next: 10, count: 4 }),
    category: () => insCategory([
      dish('A', 4.5, 15, { section: 'S1' }), dish('B', 4.5, 15, { section: 'S1' }),
      dish('C', 4.95, 15, { section: 'S2' }), dish('D', 4.95, 15, { section: 'S2' }),
    ], 0.3),
    complexity: () => insComplexity([
      dish('A', 5.25, 15, { nIng: 8 }), dish('B', 5.25, 15, { nIng: 7 }),
      dish('C', 4.5, 15, { nIng: 3 }), dish('D', 4.5, 15, { nIng: 2 }),
    ]),
    concentration: () => insConcentration(Object.assign({}, SUP, { ptsPer10: 0.5 })),
    nearcluster: () => insNearCluster([dish('A', 4.5, 15), dish('B', 4.5, 15)], 0.3),
  };
  Object.keys(atMinimum).forEach((k) => {
    const [c] = atMinimum[k]();
    assert.ok(c, `${k}: fixture no longer emits — retune the fixture, not the assertion`);
    assert.ok(c.score >= INSIGHT_FLOOR,
      `${k} emits at its own gate but scores ${c.score.toFixed(1)}, under the floor of ${INSIGHT_FLOOR}`);
  });
});

test('healthyLine: one warm line carrying only the count + target %, varied by seed', () => {
  const a = healthyLine(6, 30, 0), b = healthyLine(6, 30, 1);
  assert.equal(a.kind, 'allgood');
  assert.deepEqual(a.facts, { total: 6, targetPct: 30 });
  assert.notEqual(a.text, b.text);
  [a, b].forEach((x) => assert.ok(numbersInFactsOnly(x)));
});

/* ================================================================ selection */

test('selectInsights: caps to max and keeps type variety (≤1 per kind)', () => {
  const c = (kind, score) => ({ kind, score, facts: {}, text: kind + score });
  const out = selectInsights([c('drift', 90), c('drift', 85), c('volatility', 80), c('category', 60)], 0, 3);
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map((x) => x.kind)).size, 3);
});

// v92: the floor is applied HERE, before ranking, so a weak candidate cannot reach the panel by
// being the only thing left. This is the difference between ranking and a quality bar.
test('selectInsights: a sub-floor candidate is dropped, not merely out-ranked', () => {
  const c = (kind, score) => ({ kind, score, facts: {}, text: kind + score });
  assert.deepEqual(selectInsights([c('weak', INSIGHT_FLOOR - 1)], 0, 3), [],
    'nothing better fired, and it still must not display');
  const out = selectInsights([c('drift', 90), c('weak', INSIGHT_FLOOR - 1)], 0, 5);
  assert.deepEqual(out.map((x) => x.kind), ['drift'], 'a free slot is no reason to pad');
});

test('ranking: the higher-scoring candidate wins when both are available', () => {
  const c = (kind, score) => ({ kind, score, facts: {}, text: kind + score });
  assert.equal(selectInsights([c('nearcluster', 47), c('drift', 95)], 0, 1)[0].kind, 'drift');
  assert.equal(selectInsights([c('drift', 95), c('nearcluster', 47)], 0, 1)[0].kind, 'drift',
    'input order must not decide it');
});

test('selectInsights: rotates the near-top group by seed so the lead varies', () => {
  const c = (kind, score) => ({ kind, score, facts: {}, text: kind });
  const pool = [c('a', 90), c('b', 88), c('c', 86)];
  assert.notEqual(selectInsights(pool, 0, 1)[0].kind, selectInsights(pool, 1, 1)[0].kind);
});

test('selectInsights: a far-below candidate never rotates above the top group', () => {
  const c = (kind, score) => ({ kind, score, facts: {}, text: kind });
  const pool = [c('a', 90), c('b', 88), c('low', 20)];
  for (let s = 0; s < 6; s++) assert.notEqual(selectInsights(pool, s, 1)[0].kind, 'low');
});

/* ================================================================ deriveInsights */

// Names are deliberately DIGIT-FREE. The money-law scanner (and the shipped phrasing validators it
// mirrors) treat any digit in the text as a figure that must appear in facts, so a plate named
// "Pizza 4 Cheese" makes a Gemini rephrasing fail validation and the deterministic template stand.
// That is safe degradation, not a wrong number — but it would make these fixtures assert the wrong thing.
const NAMES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const plateName = (i) => 'Plate ' + NAMES[i % 26] + NAMES[Math.floor(i / 26) % 26];
const over = (n, extra) => { const a = []; for (let i = 0; i < n; i++) a.push(dish(plateName(i), 6, 15, extra)); return a; };

test('deriveInsights: no costed+priced plates → empty (the panel is absent)', () => {
  assert.deepEqual(deriveInsights([], 0.3, 0), []);
  assert.deepEqual(deriveInsights([dish('A', 0, 15), dish('B', 5, 0)], 0.3, 0), []);
});

test('deriveInsights: an invalid target fraction → empty', () => {
  assert.deepEqual(deriveInsights([dish('A', 5, 15)], 0, 0), []);
});

test('deriveInsights: returns {kind,facts,text} only — score, dims and scope are stripped', () => {
  const out = deriveInsights({ dishes: over(6), drift: DR }, 0.3, 0);
  assert.ok(out.length);
  out.forEach((o) => {
    assert.deepEqual(Object.keys(o).sort(), ['facts', 'kind', 'text']);
  });
});

test('deriveInsights: every emitted line clears Rule A — no single-dimension fact survives', () => {
  const out = deriveInsights({
    dishes: over(20, { hasRange: true, costMin: 4, costMax: 7, volatileIng: 'beef', nIng: 8 }),
    movement: MV, drift: DR, longStanding: LS,
    supplier: SUP, anomaly: ANOM, isAll: true,
  }, 0.3, 0);
  assert.ok(out.length);
  // every kind emitted must be one the engine declares with ≥2 dims (or a lone aggregate) — proven by
  // the family tests above; here we assert none of the DELETED single-dimension kinds can appear.
  const gone = ['reprice', 'cut', 'count', 'spread', 'spend', 'aggregate', 'shared', 'nearmiss', 'mover'];
  out.forEach((o) => assert.ok(gone.indexOf(o.kind) < 0, 'deleted family resurfaced: ' + o.kind));
});

/* ---------------- scope suppression, both directions ---------------- */

const SCOPED = {
  dishes: [
    dish('A', 6, 15, { section: 'Breakfast' }), dish('B', 6.1, 15, { section: 'Breakfast' }),
    dish('C', 7, 15, { section: 'Lunch' }), dish('D', 7.2, 15, { section: 'Lunch' }),
  ],
  supplier: SUP, anomaly: ANOM,
};

test('scope: global-only families are suppressed at MENU scope', () => {
  const kinds = deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, 0).map((x) => x.kind);
  assert.equal(kinds.indexOf('supplier'), -1);
  assert.equal(kinds.indexOf('pricegap'), -1);
});

test('scope: global-only families are the ONLY ones suppressed by scope now (v92)', () => {
  const kinds = deriveInsights(Object.assign({}, SCOPED, { isAll: true }), 0.3, 0).map((x) => x.kind);
  assert.ok(kinds.indexOf('category') >= 0, 'v92: category is available at all-menus, where the owner looks');
});

test('scope: switching scope changes the insight SET for the same plates', () => {
  const menu = deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, 0).map((x) => x.kind).sort();
  const all = deriveInsights(Object.assign({}, SCOPED, { isAll: true }), 0.3, 0).map((x) => x.kind).sort();
  assert.notDeepEqual(menu, all, 'the two scopes must not produce an identical set');
});

/* ---------------- scaling curve: 1/2/3/4/5 by menu size, never padded ---------------- */

const rich = (n) => ({
  dishes: over(n, { hasRange: true, costMin: 4, costMax: 7, volatileIng: 'beef', nIng: 8 }),
  movement: MV, drift: DR, longStanding: LS,
  supplier: SUP, anomaly: ANOM, isAll: true,
});

test('scaling: 1 plate → ≤1', () => { assert.ok(deriveInsights(rich(1), 0.3, 0).length <= 1); });
test('scaling: 5 plates → ≤2', () => { assert.ok(deriveInsights(rich(5), 0.3, 0).length <= 2); });
test('scaling: 15 plates → ≤3', () => { assert.ok(deriveInsights(rich(15), 0.3, 0).length <= 3); });
test('scaling: 29 plates → ≤4', () => { assert.ok(deriveInsights(rich(29), 0.3, 0).length <= 4); });
test('scaling: 30+ plates → ≤5', () => { assert.ok(deriveInsights(rich(40), 0.3, 0).length <= 5); });

test('scaling: a big, data-rich menu reaches the cap across DIFFERENT families', () => {
  const out = deriveInsights(rich(32), 0.3, 0);
  assert.equal(out.length, 5, 'expected the 30+ cap, got ' + out.length);
  assert.equal(new Set(out.map((x) => x.kind)).size, 5, 'all five must be different families');
});

test('scaling: NEVER padded — a big menu with little history says less than its cap allows', () => {
  const dishes = [];
  for (let i = 0; i < 32; i++) dishes.push(dish(plateName(i), 6, 15));     // over target, but no history, no sections
  const out = deriveInsights({ dishes, isAll: true }, 0.3, 0);
  assert.ok(out.length < 5, 'nothing may be invented to reach the cap, got ' + out.length);
});

test('scaling: a mostly-healthy big menu shows fewer than the cap', () => {
  const dishes = [];
  for (let i = 0; i < 20; i++) dishes.push(dish('Healthy ' + NAMES[i], 3, 15));
  assert.ok(deriveInsights({ dishes, isAll: true }, 0.3, 0).length <= 2);
});

/* ---------------- RULE D (v91): every family runs on every render ----------------
   The v90 contract pinned here was the INVERSE of these: "a healthy menu never emits a CONCERN
   family, however much history exists". It was written to stop the panel manufacturing worry, but it
   made the over-target count a GATE on the whole engine, and that shipped the 28 Jul bug — the panel
   said "nothing needs attention" while the comparison bar under it reported costs creeping up, because
   the movement families were either dropped (drift) or squeezed out of the one slot the warm line left.
   Being under target is not the same as not having moved, so the gate is gone and these pin its absence.
   Deliberate contract change, replacing the v90 test in the same commit. */

test('Rule D: no plate over target BUT a measurable cost-base movement → the movement is reported and the all-healthy line does NOT fire', () => {
  const dishes = [];
  for (let i = 0; i < 4; i++) dishes.push(dish('Healthy ' + NAMES[i], 3, 15));   // every plate at 20% against a 30% target
  const out = deriveInsights({ dishes, movement: MV, isAll: true }, 0.3, 0);
  const kinds = out.map((x) => x.kind);
  assert.ok(kinds.indexOf('costbase') >= 0, 'family 1 must report: ' + kinds.join(','));
  assert.equal(kinds.indexOf('allgood'), -1, 'the all-healthy line may not fire alongside an insight');
});

test('Rule D: drift under target is still drift — a plate whose cost moved is reported even though nothing is over target', () => {
  const dishes = [];
  for (let i = 0; i < 20; i++) dishes.push(dish('Healthy ' + NAMES[i], 3, 15));
  const kinds = deriveInsights({ dishes, drift: DR, isAll: true }, 0.3, 0).map((x) => x.kind);
  assert.ok(kinds.indexOf('drift') >= 0);
  assert.equal(kinds.indexOf('allgood'), -1);
});

test('Rule D: the all-healthy line fires ONLY when every family returns nothing', () => {
  const out = deriveInsights([dish('Salad', 3, 15), dish('Soup', 2, 9), dish('Toast', 1.5, 8)], 0.3, 0);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'allgood');
  assert.match(out[0].text, /good shape|healthy|clear|nothing/i);
  // and it says so — the claim covers both halves, not target compliance alone
  assert.match(out[0].text, /nothing else|no other|out of line/i);
});

test('Rule D: a family with insufficient history returns nothing WITHOUT suppressing the others', () => {
  const dishes = [];
  for (let i = 0; i < 8; i++) dishes.push(dish('Healthy ' + NAMES[i], 3, 15));
  // movement is below every threshold (0.2 pts, 1% ingredient move) so family 1 is silent; the rest must still run
  const thin = { pts: 0.2, name: 'Beef', ingPct: 1, plates: 5, sinceLabel: 'April' };
  const kinds = deriveInsights({ dishes, movement: thin, drift: DR, supplier: SUP, isAll: true }, 0.3, 0)
    .map((x) => x.kind);
  assert.equal(kinds.indexOf('costbase'), -1, 'the thin family stays silent');
  assert.ok(kinds.indexOf('drift') >= 0, 'and does not take the others down with it');
  assert.ok(kinds.indexOf('concentration') >= 0);
});

test('Rule D: over target with NO family able to speak stays silent — it does not reassure wrongly', () => {
  const dishes = [];
  for (let i = 0; i < 4; i++) dishes.push(dish(plateName(i), 6, 15));            // 40% against a 30% target, no history
  const out = deriveInsights({ dishes, isAll: true }, 0.3, 0);
  assert.deepEqual(out.map((x) => x.kind), [], 'no family has the data to speak — the panel is absent');
});

test('Rule D: a healthy menu with nothing above the floor still gets its warm line, not a compliment', () => {
  // v92: insBest ("X is your strongest margin") was the padding line and is gone, so a quiet healthy
  // menu resolves to the all-healthy line rather than a low-value positive.
  const out = deriveInsights([dish('Toastie', 3, 15), dish('Soup', 2.4, 9)], 0.3, 0);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'allgood');
});

/* ---------------- the FLOOR, end to end (v92) ---------------- */

test('FLOOR: a bare count never emits, whatever the data — no family, no fallback, no padding', () => {
  // The three v92-removed families were all bare counts or padding. Feed the engine everything they
  // used to consume and assert none of them can come back through any path.
  const dishes = [];
  for (let i = 0; i < 32; i++) dishes.push(dish(plateName(i), 6, 15));
  const out = deriveInsights({
    dishes, isAll: true, recent: { up: 12 }, coverage: { uncosted: 9 },
    supplier: { name: 'S', plates: 30, total: 32, suppliers: 4 },   // reach with NO consequence attached
  }, 0.3, 0).map((x) => x.kind);
  ['recent', 'data', 'best', 'supplier', 'pricegap'].forEach((k) => {
    assert.equal(out.indexOf(k), -1, `bare-count family resurfaced: ${k}`);
  });
  assert.equal(out.indexOf('concentration'), -1, 'reach without its consequence is still a bare count');
});

test('FLOOR: fewer real insights beat more padded ones — the cap is a ceiling, never a quota', () => {
  // 32 plates allows 5. Only two families have anything above the floor, so exactly two must show.
  const dishes = [];
  for (let i = 0; i < 32; i++) dishes.push(dish(plateName(i), 6, 15, { section: i % 2 ? 'Lunch' : 'Breakfast', nIng: i % 2 ? 2 : 8 }));
  dishes.forEach((d, i) => { if (i % 2) { d.cost = 4.5; } });          // give the two sections a real gap
  const out = deriveInsights({ dishes, isAll: true, recent: { up: 12 }, coverage: { uncosted: 9 } }, 0.3, 0);
  assert.deepEqual(out.map((x) => x.kind).sort(), ['category', 'complexity', 'nearcluster'],
    'exactly the families with something above the floor — the cap of 5 is not a quota to fill');
});

/* ---------------- Rules B and C across the whole engine ---------------- */

test('Rule B: no emitted line prescribes a fix — no swap, portion or price directive', () => {
  const seen = [];
  [0, 1, 2, 3].forEach((seed) => {
    seen.push(...deriveInsights(rich(32), 0.3, seed));
    seen.push(...deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, seed));
    seen.push(...deriveInsights([dish('Salad', 3, 15), dish('Soup', 2, 9)], 0.3, seed));
  });
  assert.ok(seen.length);
  seen.forEach((o) => {
    assert.doesNotMatch(o.text, /\b(swap|substitute|replace|raise the price|lift the price|reprice|charge|set the price|reduce the portion|cut the portion|use less|should)\b/i,
      'prescriptive directive in: ' + o.text);
  });
});

test('Rule C: no emitted line implies sales volume, profit or money lost', () => {
  const seen = [];
  [0, 1, 2, 3].forEach((seed) => {
    seen.push(...deriveInsights(rich(32), 0.3, seed));
    seen.push(...deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, seed));
  });
  assert.ok(seen.length);
  seen.forEach((o) => assert.doesNotMatch(o.text, VOLUME_CLAIMS, 'volume/profit claim in: ' + o.text));
});

test('MONEY LAW: every number shown by every emitted line is present in its facts', () => {
  const seen = [];
  [0, 1, 2, 3].forEach((seed) => {
    seen.push(...deriveInsights(rich(32), 0.3, seed));
    seen.push(...deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, seed));
    seen.push(...deriveInsights([dish('Salad', 3, 15)], 0.3, seed));
  });
  assert.ok(seen.length);
  seen.forEach((o) => assert.ok(numbersInFactsOnly(o), 'number not in facts: ' + o.text));
});

test('phrasing: one sentence, front-loaded, inside the ~24-word scannability cap', () => {
  const seen = deriveInsights(rich(32), 0.3, 0).concat(deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, 0));
  seen.forEach((o) => {
    assert.ok(o.text.trim().split(/\s+/).length <= 24, 'over the word cap: ' + o.text);
    assert.doesNotMatch(o.text, /[.!?]\s+\S/, 'more than one sentence: ' + o.text);
  });
});

test('terminology: the engine says "plate", never "dish" (CLAUDE.md’s four object nouns)', () => {
  const seen = deriveInsights(rich(32), 0.3, 0)
    .concat(deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, 0))
    .concat(deriveInsights([dish('Salad', 3, 15)], 0.3, 0));
  seen.forEach((o) => assert.doesNotMatch(o.text, /\bdish(es)?\b/i, '"dish" is not one of the four nouns: ' + o.text));
});

test('deriveInsights: pure — it does not mutate its input', () => {
  const data = rich(8);
  const snapshot = JSON.stringify(data);
  deriveInsights(data, 0.3, 0);
  assert.equal(JSON.stringify(data), snapshot);
});
