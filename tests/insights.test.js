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
  insSupplierReach, insPriceGap, insComplexity, insRecentChange, insData, insBest,
  healthyLine, selectInsights, deriveInsights,
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
  assert.deepEqual(c.facts, { pts: 1.2, ingPct: 18, plates: 5 });
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

test('F3: section averages, and it is MENU-scoped (suppressed on all-menus)', () => {
  const [c] = insCategory([
    dish('A', 3, 15, { section: 'Breakfast' }), dish('B', 3.3, 15, { section: 'Breakfast' }),
    dish('C', 5, 15, { section: 'Lunch' }), dish('D', 5.2, 15, { section: 'Lunch' }),
  ], 0.3);
  assert.equal(c.kind, 'category');
  assert.equal(c.scope, 'menu');
  assert.ok(ruleA(c));
  assert.equal(scopeAllows(c, true), false, 'category imbalance must not run at all-menus scope');
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

test('F6: the cluster is an AGGREGATE, so it clears Rule A on its own', () => {
  const [c] = insNearCluster([
    dish('A', 4.5, 15), dish('B', 4.52, 15), dish('C', 4.48, 15), dish('D', 7, 15),
  ], 0.3);
  assert.equal(c.kind, 'nearcluster');
  assert.ok(ruleA(c));
  assert.equal(c.facts.count, 3);
  assert.match(c.text, /3 plates sit within half a point of your 30% target/);
  assert.ok(numbersInFactsOnly(c));
});

test('F6: one plate near target is not a cluster', () => {
  assert.deepEqual(insNearCluster([dish('A', 4.5, 15), dish('B', 7, 15)], 0.3), []);
});

/* ================================================================ F7 — supplier concentration */

const SUP = { name: 'Barker’s', plates: 11, total: 14, suppliers: 3 };

test('F7: BREADTH paired with an aggregate share — never spend, and GLOBAL only', () => {
  const [c] = insSupplierReach(SUP);
  assert.equal(c.kind, 'supplier');
  assert.equal(c.scope, 'global');
  assert.ok(ruleA(c));
  assert.equal(scopeAllows(c, false), false, 'supplier reach must not run at menu scope');
  assert.match(c.text, /supplies at least one ingredient in 11 of your 14 costed plates/);
  assert.doesNotMatch(c.text, /spend/i, 'Rule C: concentration is breadth-based, never spend-based');
  assert.ok(numbersInFactsOnly(c));
  assert.doesNotMatch(c.text, VOLUME_CLAIMS);
});

test('F7: silent with one supplier (trivially "all of them"), thin reach, or too few plates', () => {
  assert.deepEqual(insSupplierReach(Object.assign({}, SUP, { suppliers: 1 })), []);
  assert.deepEqual(insSupplierReach(Object.assign({}, SUP, { plates: 4, total: 14 })), []);   // 29% reach
  assert.deepEqual(insSupplierReach(Object.assign({}, SUP, { plates: 2, total: 3 })), []);    // under 3 plates
  assert.deepEqual(insSupplierReach(null), []);
});

/* ================================================================ F8 — price gap */

const GAP = { category: 'Cheese', unit: 'kg', lo: 9.5, hi: 28, count: 6 };

test('F8: states the spread as a FACT and never suggests a swap', () => {
  const [c] = insPriceGap(GAP);
  assert.equal(c.kind, 'pricegap');
  assert.equal(c.scope, 'global');
  assert.ok(ruleA(c));
  assert.match(c.text, /6 Cheese products run \$9\.50–\$28\.00 per kg/);
  assert.match(c.text, /2\.9x spread/);
  assert.doesNotMatch(c.text, /swap|switch|instead|cheaper option|use the/i);
  assert.ok(numbersInFactsOnly(c));
});

test('F8: needs ≥3 products and a ≥2.5x ratio', () => {
  assert.deepEqual(insPriceGap(Object.assign({}, GAP, { count: 2 })), []);
  assert.deepEqual(insPriceGap(Object.assign({}, GAP, { hi: 20, lo: 10 })), []);   // 2.0x
  assert.deepEqual(insPriceGap(Object.assign({}, GAP, { unit: '' })), []);
  assert.deepEqual(insPriceGap(null), []);
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

test('insRecentChange: an aggregate over time, ≥2 plates to be a pattern', () => {
  const [c] = insRecentChange({ up: 4 });
  assert.ok(ruleA(c));
  assert.match(c.text, /4 plates cost more now than at your last price update/);
  assert.deepEqual(insRecentChange({ up: 1 }), []);
  assert.ok(numbersInFactsOnly(c));
});

test('insData: uncosted plates are a dataset-wide count, with singular grammar', () => {
  const [c] = insData({ uncosted: 3 });
  assert.ok(ruleA(c));
  assert.match(c.text, /3 plates aren't costed yet/);
  assert.match(insData({ uncosted: 1 })[0].text, /1 plate isn't costed yet/);
  assert.deepEqual(insData({ uncosted: 0 }), []);
});

test('insBest: the one positive line, only when comfortably under target', () => {
  const [c] = insBest([dish('Toastie', 3, 15), dish('Barra', 6, 15)], 0.3);
  assert.ok(ruleA(c));
  assert.match(c.text, /Toastie is your strongest margin — 10 points under target/);
  assert.deepEqual(insBest([dish('A', 4.2, 15)], 0.3), [], 'only when ≥5 pts under');
  assert.ok(numbersInFactsOnly(c));
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
  const out = selectInsights([c('drift', 90), c('drift', 85), c('volatility', 80), c('data', 20)], 0, 3);
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map((x) => x.kind)).size, 3);
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
  const out = deriveInsights({ dishes: over(6), recent: { up: 3 } }, 0.3, 0);
  assert.ok(out.length);
  out.forEach((o) => {
    assert.deepEqual(Object.keys(o).sort(), ['facts', 'kind', 'text']);
  });
});

test('deriveInsights: every emitted line clears Rule A — no single-dimension fact survives', () => {
  const out = deriveInsights({
    dishes: over(20, { hasRange: true, costMin: 4, costMax: 7, volatileIng: 'beef', nIng: 8 }),
    movement: MV, drift: DR, longStanding: LS, recent: { up: 5 }, coverage: { uncosted: 2 },
    supplier: SUP, priceGap: GAP, isAll: true,
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
  supplier: SUP, priceGap: GAP,
};

test('scope: global-only families are suppressed at MENU scope', () => {
  const kinds = deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, 0).map((x) => x.kind);
  assert.equal(kinds.indexOf('supplier'), -1);
  assert.equal(kinds.indexOf('pricegap'), -1);
});

test('scope: menu-only families are suppressed at ALL-MENUS scope', () => {
  const kinds = deriveInsights(Object.assign({}, SCOPED, { isAll: true }), 0.3, 0).map((x) => x.kind);
  assert.equal(kinds.indexOf('category'), -1);
});

test('scope: switching scope changes the insight SET for the same plates', () => {
  const menu = deriveInsights(Object.assign({}, SCOPED, { isAll: false }), 0.3, 0).map((x) => x.kind).sort();
  const all = deriveInsights(Object.assign({}, SCOPED, { isAll: true }), 0.3, 0).map((x) => x.kind).sort();
  assert.notDeepEqual(menu, all, 'the two scopes must not produce an identical set');
});

/* ---------------- scaling curve: 1/2/3/4/5 by menu size, never padded ---------------- */

const rich = (n) => ({
  dishes: over(n, { hasRange: true, costMin: 4, costMax: 7, volatileIng: 'beef', nIng: 8 }),
  movement: MV, drift: DR, longStanding: LS, recent: { up: 5 }, coverage: { uncosted: 2 },
  supplier: SUP, priceGap: GAP, isAll: true,
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

/* ---------------- all-healthy → one warm line ---------------- */

test('deriveInsights: all-healthy menu → exactly ONE warm line', () => {
  const out = deriveInsights([dish('Salad', 3, 15), dish('Soup', 2, 9), dish('Toast', 1.5, 8)], 0.3, 0);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'allgood');
  assert.match(out[0].text, /good shape|healthy|clear|nothing/i);
});

test('deriveInsights: a healthy menu never emits a CONCERN family, however much history exists', () => {
  const dishes = [];
  for (let i = 0; i < 20; i++) dishes.push(dish('Healthy ' + NAMES[i], 3, 15));
  const kinds = deriveInsights({ dishes, drift: DR, longStanding: LS, isAll: true }, 0.3, 0).map((x) => x.kind);
  assert.equal(kinds.indexOf('drift'), -1);
  assert.equal(kinds.indexOf('longstanding'), -1);
  assert.equal(kinds[0], 'allgood', 'the warm line leads');
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
