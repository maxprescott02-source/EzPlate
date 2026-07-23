/*
 * insights.test.js — the PURE deterministic insight engine (v63 item 3a; broadened v67; refined v71; DEPTH
 * pass v74).
 *
 * v74 (brief): two root fixes. (Rule 1) the NON-OBVIOUS guard — an insight must add something not already in
 * the menu table (cross-plate reach, cost composition, price movement, or menu-wide standing); a line that
 * only restates "over target" is dropped. (Rule 2) DEPTH = specific numbers, not prescriptions — over-target
 * insights carry the gap in BOTH points and $/serve PLUS the cost driver (dominant input + share, + movement
 * where history exists). Single-ingredient dishes never produce a composition insight (no "Chips is 100%…"
 * tautology). The count scales 1/2/3/4/5 with menu size. The app still computes EVERY number; the optional
 * Gemini layer only rephrases and is now word-capped (see api-insight.test.js). Extracted from js/app.js.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  nonObvious, dishDriver, driverClause, overServeFmt,
  insReprice, insNearMiss, insVolatility, insShared, insMover, insSummary,
  insCut, insCategory, insSpread, insAggregate, insSpend, insComplexity,
  insRecentChange, insData, insBest, healthyLine, selectInsights, deriveInsights,
} = require('./_extract.js');

const dish = (name, cost, menuPrice, extra) => Object.assign({ name, cost, menuPrice }, extra || {});
// a dominant-ingredient driver: ≥2 ingredients, `share` of cost, optional recent move %
const top = (name, share, count, movePct) => ({ name, share, count: count == null ? 2 : count, movePct: movePct == null ? null : movePct });
// MONEY LAW / non-restating proxy: every number shown in an insight's text must be present in its facts
// (the client + server phrasing validators depend on exactly this). Pins that no type invents a figure.
const numbersInFactsOnly = (c) => {
  const allowed = Object.values(c.facts).filter((v) => typeof v === 'number');
  return (c.text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number)
    .every((n) => allowed.some((a) => Math.abs(a - n) < 0.005));
};

/* ================================================================ shared helpers */

test('overServeFmt: cents under $1, dollars at/over $1 — the DISPLAYED number is what lands in facts', () => {
  assert.deepEqual(overServeFmt(0.15), { str: '15¢', num: 15 });
  assert.deepEqual(overServeFmt(0.30), { str: '30¢', num: 30 });
  assert.deepEqual(overServeFmt(1.5), { str: '$1.50', num: 1.5 });
});

test('dishDriver: fires only for ≥2 ingredients with a 40–90% dominant share', () => {
  assert.deepEqual(dishDriver({ top: top('Fish', 0.6, 2) }), { name: 'Fish', sharePct: 60, movePct: null });
  assert.equal(dishDriver({ top: top('Chips', 1.0, 1) }), null);   // single ingredient → tautology, excluded
  assert.equal(dishDriver({ top: top('Chips', 0.95, 2) }), null);  // ~total share says nothing
  assert.equal(dishDriver({ top: top('A', 0.40, 2) }), null);      // 40% is not dominant (strict >40)
  assert.equal(dishDriver({ top: top('A', 0.35, 2) }), null);
  assert.equal(dishDriver({}), null);
});

test('dishDriver: attaches a ≥3% ingredient move, ignores noise', () => {
  assert.equal(dishDriver({ top: top('Fish', 0.6, 2, 8) }).movePct, 8);
  assert.equal(dishDriver({ top: top('Fish', 0.6, 2, -8) }).movePct, -8);
  assert.equal(dishDriver({ top: top('Fish', 0.6, 2, 1) }).movePct, null);   // <3% is noise
});

test('nonObvious: only cross/composition/movement/comparative pass the guard', () => {
  ['cross', 'composition', 'movement', 'comparative'].forEach((d) => assert.ok(nonObvious({ dim: d })));
  assert.equal(nonObvious({ dim: 'obvious' }), false);
  assert.equal(nonObvious({}), false);
  assert.equal(nonObvious(null), false);
});

/* ================================================================ over-target (reprice): pts + $/serve + driver */

test('insReprice: worst first, carries points AND $/serve AND the cost driver — no prescription', () => {
  const out = insReprice([
    dish('Barra & Chips', 6, 15, { top: top('Fish', 0.6, 2) }),   // 40% → 10 pts, over = $1.50
    dish('Roll', 5, 14, { top: top('Beef', 0.55, 2) }),           // ~36% → 6 pts
    dish('Salad', 3, 12, { top: top('Leaf', 0.5, 2) }),           // 25% under → excluded
  ], 0.3);
  assert.equal(out.length, 2);
  assert.equal(out[0].facts.name, 'Barra & Chips');
  assert.equal(out[0].kind, 'reprice');
  assert.equal(out[0].dim, 'composition');
  assert.equal(out[0].facts.pts, 10);
  assert.equal(out[0].facts.overServe, 1.5);       // $/serve over target
  assert.equal(out[0].facts.sharePct, 60);         // the driver's share
  assert.ok(out[0].score > out[1].score);
  assert.match(out[0].text, /10 pts over/);
  assert.match(out[0].text, /\$1\.50 a plate/);
  assert.match(out[0].text, /Fish is 60% of its cost/);
  assert.doesNotMatch(out[0].text, /rework|worth a look|small tweak/i);   // no filler / no prescription
});

test('insReprice: an over-target dish with NO non-obvious driver is NOT emitted (Rule 1)', () => {
  assert.deepEqual(insReprice([dish('Plain', 6, 15)], 0.3), []);                       // no top at all
  assert.deepEqual(insReprice([dish('Solo', 6, 15, { top: top('Only', 1.0, 1) })], 0.3), []);   // single ingredient → tautology
});

test('insReprice: cents shown for a sub-$1 gap', () => {
  const out = insReprice([dish('Wrap', 3.3, 10, { top: top('Chx', 0.6, 2) })], 0.3);   // 33% → 3 pts, over = 30¢
  assert.equal(out[0].facts.overServe, 30);
  assert.match(out[0].text, /30¢ a plate/);
});

test('insReprice: 1-pt → near-miss owns it; <1 pt not flagged', () => {
  assert.deepEqual(insReprice([dish('Edge', 3.1, 10, { top: top('X', 0.6, 2) })], 0.3), []);
  assert.deepEqual(insReprice([dish('Flat', 3.02, 10, { top: top('X', 0.6, 2) })], 0.3), []);
});

/* ================================================================ near-miss: 1 pt, specific, driver-gated */

test('insNearMiss: ~1 pt over with $/serve + driver, no prescription', () => {
  const out = insNearMiss([dish('Edge', 3.1, 10, { top: top('Chx', 0.6, 2) })], 0.3);   // 31% → 1 pt, over = 10¢
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'nearmiss');
  assert.equal(out[0].facts.pts, 1);
  assert.equal(out[0].facts.overServe, 10);
  assert.equal(out[0].facts.sharePct, 60);
  assert.match(out[0].text, /just 1 pt over/);
  assert.match(out[0].text, /10¢ a plate/);
  assert.match(out[0].text, /Chx is 60% of its cost/);
  assert.doesNotMatch(out[0].text, /small tweak|bring it home|whisker/i);
});

test('insNearMiss: no driver → nothing (a bare "1 pt over" is already in the table)', () => {
  assert.deepEqual(insNearMiss([dish('Edge', 3.1, 10)], 0.3), []);
  assert.equal(insNearMiss([dish('Way', 6, 15, { top: top('X', 0.6, 2) })], 0.3).length, 0);   // 10 pts, not a near-miss
});

/* ================================================================ movement types */

test('insVolatility: widest cost range, names the ingredient (movement dim)', () => {
  const out = insVolatility([
    dish('Barra & Chips', 5, 15, { hasRange: true, costMin: 4.1, costMax: 5.6, volatileIng: 'Barramundi' }),
    dish('Toastie', 3, 9, { hasRange: true, costMin: 2.9, costMax: 3.1, volatileIng: 'Cheese' }),
  ]);
  assert.equal(out[0].kind, 'volatility');
  assert.equal(out[0].dim, 'movement');
  assert.equal(out[0].facts.name, 'Barra & Chips');
  assert.match(out[0].text, /Barramundi/);
  assert.match(out[0].text, /\$4\.10–\$5\.60/);
});

test('insVolatility: no range → nothing', () => {
  assert.deepEqual(insVolatility([dish('Flat', 5, 15, { hasRange: false, costMin: 5, costMax: 5 })]), []);
});

test('insMover: move %, direction, dish count (movement dim)', () => {
  const out = insMover({ name: 'Barramundi', pct: 18.4, dishes: ['Barra & Chips', 'Fish Burger'] });
  assert.equal(out[0].kind, 'mover');
  assert.equal(out[0].dim, 'movement');
  assert.equal(out[0].facts.pct, 18);
  assert.equal(out[0].facts.dishCount, 2);
  assert.match(out[0].text, /rose 18%/);
  assert.match(out[0].text, /2 dishes/);
});

test('insMover: a move under 3% is noise → nothing', () => {
  assert.deepEqual(insMover({ name: 'Salt', pct: 1.2, dishes: ['X'] }), []);
  assert.deepEqual(insMover(null), []);
});

/* ================================================================ cross-plate leverage (the benchmark) */

test('insShared: leads with the most-shared ingredient (cross dim)', () => {
  const out = insShared([{ name: 'Cheese', dishCount: 8 }, { name: 'Onion', dishCount: 3 }]);
  assert.equal(out[0].kind, 'shared');
  assert.equal(out[0].dim, 'cross');
  assert.equal(out[0].facts.dishCount, 8);
  assert.match(out[0].text, /Cheese feeds 8 dishes/);
  assert.match(out[0].text, /beats any single reprice/);
});

test('insShared: an ingredient in only one dish is not leverage', () => {
  assert.deepEqual(insShared([{ name: 'Truffle', dishCount: 1 }]), []);
  assert.deepEqual(insShared([]), []);
});

/* ================================================================ comparative type */

test('insSummary: aggregate over-count carries the comparative dim', () => {
  const over = insSummary([dish('A', 6, 15), dish('B', 3, 15)], 0.3);
  assert.equal(over[0].kind, 'count');
  assert.equal(over[0].dim, 'comparative');
  assert.match(over[0].text, /1 of 2 costed dishes sit over your 30% target/);
  assert.equal(insSummary([dish('A', 3, 15)], 0.3)[0].kind, 'allgood');
});

/* ================================================================ composition is a supporting clause, not its own line */

test('v74 (Max): a healthy plate leaning on one ingredient produces NO standalone composition insight', () => {
  // "Fish is 60% of Fish & Chips's cost" is a fact, not something to act on — the engine no longer emits it.
  const out = deriveInsights([dish('Fish & Chips', 4, 15, { top: top('Fish', 0.6, 2) })], 0.3, 0);
  out.forEach((x) => assert.notEqual(x.kind, 'portion'));
  assert.equal(out[0].kind, 'allgood');   // an under-target menu with only a lopsided plate is "practically perfect"
});

test('v74: composition survives ONLY as the driver clause on an over-target line', () => {
  const out = insReprice([dish('Fish & Chips', 6, 15, { top: top('Fish', 0.6, 2) })], 0.3);
  assert.match(out[0].text, /Fish is 60% of its cost/);   // attached to a real "10 pts over" problem
});

/* ================================================================ cut: far over → magnitude + $/serve */

test('insCut: ≥12 pts over → magnitude + $/serve, and insReprice leaves it alone', () => {
  const cut = insCut([dish('Steak Works', 6.3, 15)], 0.3);   // 42% = 12 pts, over = $1.80
  assert.equal(cut[0].kind, 'cut');
  assert.equal(cut[0].dim, 'comparative');
  assert.equal(cut[0].facts.pts, 12);
  assert.equal(cut[0].facts.overServe, 1.8);
  assert.match(cut[0].text, /12 pts over/);
  assert.match(cut[0].text, /\$1\.80 a plate/);
  assert.match(cut[0].text, /too far for a price tweak/);
  assert.deepEqual(insReprice([dish('Steak Works', 6.3, 15, { top: top('Steak', 0.7, 2) })], 0.3), []);   // handed to insCut
});

test('insCut: a merely-over dish (< 12 pts) is not a cut candidate', () => {
  assert.deepEqual(insCut([dish('Roll', 5, 14)], 0.3), []);
});

/* ================================================================ warm all-healthy line */

test('healthyLine: one warm line carrying only the count + target %, varied by seed', () => {
  const a = healthyLine(5, 30, 0);
  assert.equal(a.kind, 'allgood');
  assert.equal(a.facts.total, 5);
  assert.match(a.text, /5/);
  assert.match(a.text, /30%/);
  assert.notEqual(healthyLine(5, 30, 0).text, healthyLine(5, 30, 1).text);
});

/* ================================================================ selector: variety + rotation */

test('selectInsights: caps to max and keeps type variety (≤1 per kind)', () => {
  const cands = [
    { kind: 'reprice', score: 80, facts: {}, text: 'r1' },
    { kind: 'reprice', score: 78, facts: {}, text: 'r2' },
    { kind: 'volatility', score: 70, facts: {}, text: 'v1' },
    { kind: 'shared', score: 60, facts: {}, text: 's1' },
  ];
  const out = selectInsights(cands, 0, 3);
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map((x) => x.kind)).size, 3);
});

test('selectInsights: rotates the near-top group by seed so the lead varies', () => {
  const cands = [
    { kind: 'reprice', score: 80, facts: {}, text: 'r' },
    { kind: 'volatility', score: 78, facts: {}, text: 'v' },
    { kind: 'shared', score: 76, facts: {}, text: 's' },
  ];
  const lead0 = selectInsights(cands, 0, 3)[0].kind;
  const lead1 = selectInsights(cands, 1, 3)[0].kind;
  const lead2 = selectInsights(cands, 2, 3)[0].kind;
  assert.notEqual(lead0, lead1);
  assert.equal(new Set([lead0, lead1, lead2]).size, 3);
});

test('selectInsights: a far-below candidate never rotates above the top group', () => {
  const cands = [
    { kind: 'reprice', score: 90, facts: {}, text: 'r' },
    { kind: 'count', score: 22, facts: {}, text: 'c' },
  ];
  for (let s = 0; s < 5; s++) assert.equal(selectInsights(cands, s, 3)[0].kind, 'reprice');
});

/* ================================================================ deriveInsights orchestration */

test('deriveInsights: no costed+priced dishes → empty (the panel hides)', () => {
  assert.deepEqual(deriveInsights({ dishes: [] }, 0.3), []);
  assert.deepEqual(deriveInsights([dish('X', 0, 10), dish('Y', 5, 0)], 0.3), []);
});

test('deriveInsights: invalid target fraction → empty', () => {
  assert.deepEqual(deriveInsights([dish('A', 6, 15)], 0), []);
  assert.deepEqual(deriveInsights([dish('A', 6, 15)], -1), []);
});

test('deriveInsights: returns {kind,facts,text} with score+dim stripped', () => {
  const out = deriveInsights([
    dish('A', 6, 15, { top: top('Fish', 0.6, 2) }), dish('B', 5, 15, { top: top('Beef', 0.6, 2) }), dish('C', 3, 15),
  ], 0.3, 0);
  assert.ok(out.length >= 1);
  out.forEach((x) => { assert.ok(x.kind && x.facts && typeof x.text === 'string'); assert.equal(x.score, undefined); assert.equal(x.dim, undefined); });
});

test('Rule 1 non-obvious guard: a single-ingredient over-target dish yields NO composition insight', () => {
  const out = deriveInsights([dish('Medium Chips', 4, 9, { top: top('Chips', 1.0, 1) })], 0.3, 0);   // 44% over, one ingredient
  out.forEach((x) => assert.notEqual(x.kind, 'reprice'));
  out.forEach((x) => assert.notEqual(x.kind, 'portion'));
  // the only thing worth saying is the aggregate standing (a count), never "Chips is 100% of Medium Chips"
  out.forEach((x) => assert.doesNotMatch(x.text, /100%/));
});

test('Rule 1: a 2-ingredient 60/40 over-target dish DOES get a driver-bearing reprice', () => {
  const out = deriveInsights([dish('Fish & Chips', 6, 15, { top: top('Fish', 0.6, 2) })], 0.3, 0);
  assert.equal(out[0].kind, 'reprice');
  assert.match(out[0].text, /Fish is 60% of its cost/);
});

test('deriveInsights: mixes TYPES, not repeated repricing', () => {
  const out = deriveInsights({
    dishes: [
      dish('Barra & Chips', 6, 15, { top: top('Barramundi', 0.6, 2), hasRange: true, costMin: 4.1, costMax: 5.6, volatileIng: 'Barramundi' }),
      dish('Fish Burger', 5.5, 15, { top: top('Fish', 0.55, 2) }),
      dish('Toastie', 5.2, 15, { top: top('Cheese', 0.5, 2) }),
    ],
    shared: [{ name: 'Cheese', dishCount: 3 }],
    mover: { name: 'Barramundi', pct: 18, dishes: ['Barra & Chips'] },
  }, 0.3, 0);
  assert.ok(new Set(out.map((x) => x.kind)).size >= 2);
});

/* ---------------- scaling curve: 1/2/3/4/5 by menu size, never padded ---------------- */

// build a costed menu of N dishes, each over target with its own driver → many reprice-eligible dishes
const bigMenu = (n) => { const a = []; for (let i = 0; i < n; i++) a.push(dish('D' + i, 6, 15, { top: top('Ing' + i, 0.6, 2) })); return a; };

test('scaling: 1 dish → ≤1', () => { assert.ok(deriveInsights(bigMenu(1), 0.3, 0).length <= 1); });
test('scaling: 5 dishes → ≤2', () => { assert.ok(deriveInsights(bigMenu(5), 0.3, 0).length <= 2); });
test('scaling: 15 dishes → ≤3', () => { assert.ok(deriveInsights(bigMenu(15), 0.3, 0).length <= 3); });
test('scaling: 29 dishes → ≤4', () => { assert.ok(deriveInsights(bigMenu(29), 0.3, 0).length <= 4); });
test('scaling: 30+ dishes → ≤5', () => { assert.ok(deriveInsights(bigMenu(40), 0.3, 0).length <= 5); });

test('scaling: a big, VARIED menu can reach 5 across different CRITICAL types (curve raised the cap)', () => {
  const dishes = bigMenu(32);                                            // reprice-eligible over-target dishes
  dishes[0] = dish('Volatile', 5, 15, { top: top('Fish', 0.6, 2), hasRange: true, costMin: 3.5, costMax: 6.5, volatileIng: 'Fish' });  // volatility
  dishes[1] = dish('Blowout', 7, 15, { top: top('Wagyu', 0.6, 2) });     // ~47% = 17 pts over → cut
  const out = deriveInsights({ dishes, shared: [{ name: 'Chips', dishCount: 6 }], mover: { name: 'Oil', pct: 12, dishes: ['a', 'b'] } }, 0.3, 0);
  // available distinct kinds: reprice, cut, volatility, shared, mover → up to 5
  assert.ok(out.length >= 4 && out.length <= 5, 'expected 4–5, got ' + out.length);
  assert.ok(new Set(out.map((x) => x.kind)).size >= 4, 'expected varied types');
});

test('scaling: never padded — a mostly-healthy big menu shows fewer than the cap', () => {
  const dishes = [];
  for (let i = 0; i < 20; i++) dishes.push(dish('Healthy' + i, 3, 15));   // all under target, no drivers, no history
  const out = deriveInsights(dishes, 0.3, 0);
  assert.ok(out.length <= 2, 'a healthy menu is not padded to its size cap, got ' + out.length);
});

/* ---------------- all-healthy → one warm line ---------------- */

test('deriveInsights: all-healthy menu → exactly ONE warm line', () => {
  const out = deriveInsights([dish('Salad', 3, 15), dish('Soup', 2, 9), dish('Toast', 1.5, 8)], 0.3, 0);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'allgood');
  assert.match(out[0].text, /good shape|healthy|clear|nothing/i);
});

/* ---------------- point, don't prescribe (whole engine) ---------------- */

test('point-not-prescribe: nothing swaps a product, sets a portion, or dictates a price; every number is a fact', () => {
  const out = deriveInsights({
    dishes: [
      dish('Barra & Chips', 6, 15, { top: top('Fish', 0.6, 2, 8), hasRange: true, costMin: 4.1, costMax: 5.6, volatileIng: 'Barramundi' }),
      dish('Roll', 5, 14, { top: top('Beef', 0.55, 2) }),
      dish('Steak Works', 6.3, 15),
      dish('Toastie', 5.4, 15, { top: top('Cheese', 0.5, 2) }),
      dish('Wrap', 5.2, 15, { top: top('Chx', 0.5, 2) }),
      dish('Bowl', 5.1, 15, { top: top('Rice', 0.5, 2) }),
    ],
    shared: [{ name: 'Cheese', dishCount: 2 }],
    mover: { name: 'Barramundi', pct: 12, dishes: ['Barra & Chips'] },
  }, 0.3, 0);
  out.forEach((x) => {
    assert.doesNotMatch(x.text, /\bswap\b|\breplace\b/i);
    assert.doesNotMatch(x.text, /smaller portion|% smaller/i);
    assert.doesNotMatch(x.text, /\braise (it|the price)? ?to \$|nudge from \$.*to \$/i);
    assert.doesNotMatch(x.text, /worth a look to see if|a small tweak would/i);   // v74: no wind-up filler
    assert.equal(x.facts.targetPrice, undefined);
  });
});

test('deriveInsights: pure — does not mutate its input', () => {
  const data = { dishes: [dish('A', 6, 15, { top: top('Fish', 0.6, 2) }), dish('B', 3, 15)], shared: [{ name: 'X', dishCount: 2 }] };
  const snap = JSON.stringify(data);
  deriveInsights(data, 0.3, 0);
  assert.equal(JSON.stringify(data), snap);
});

/* ================================================================ v75: the WIDENED pool (brief §1)
   Each new type is non-obvious (invisible in the per-dish menu table), states a FACT + figures only
   (point, don't prescribe), and puts every DISPLAYED number in facts (numbersInFactsOnly). */

test('v75: the coverage dim also clears the non-obvious guard', () => {
  assert.ok(nonObvious({ dim: 'coverage' }));
});

/* ---------------- category performance ---------------- */
test('insCategory: compares section averages when a real gap exists', () => {
  const out = insCategory([
    dish('Eggs', 2.4, 10, { section: 'Breakfast' }), dish('Pancakes', 2.5, 10, { section: 'Breakfast' }),  // ~24-25%
    dish('Burger', 5, 15, { section: 'Lunch' }), dish('Parma', 5.2, 15, { section: 'Lunch' }),             // ~33-35%
  ], 0.3);
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'comparative');
  assert.equal(out[0].facts.loName, 'Breakfast');
  assert.equal(out[0].facts.hiName, 'Lunch');
  assert.ok(nonObvious(out[0]));
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insCategory: needs ≥2 sections (≥2 dishes each) and a ≥3-pt gap', () => {
  assert.deepEqual(insCategory([dish('A', 2.4, 10, { section: 'X' }), dish('B', 2.5, 10, { section: 'X' })], 0.3), []);   // one section
  // a section with only ONE dish is ignored (needs ≥2), so this collapses to a single qualifying section → nothing
  assert.deepEqual(insCategory([
    dish('A', 2.4, 10, { section: 'X' }), dish('B', 2.4, 10, { section: 'X' }), dish('C', 3.0, 10, { section: 'Y' }),
  ], 0.3), []);
  // exactly a 3-pt gap FIRES (guard is `< 3`): X = 24%, Y = 27%
  const at3 = insCategory([
    dish('A', 2.4, 10, { section: 'X' }), dish('B', 2.4, 10, { section: 'X' }),
    dish('C', 2.7, 10, { section: 'Y' }), dish('D', 2.7, 10, { section: 'Y' }),
  ], 0.3);
  assert.equal(at3.length, 1);
  assert.deepEqual([at3[0].facts.loPct, at3[0].facts.hiPct], [24, 27]);
  // just BELOW 3 pts (X = 24%, Y = 26%) → nothing
  assert.deepEqual(insCategory([
    dish('A', 2.4, 10, { section: 'X' }), dish('B', 2.4, 10, { section: 'X' }),
    dish('C', 2.6, 10, { section: 'Y' }), dish('D', 2.6, 10, { section: 'Y' }),
  ], 0.3), []);
});

/* ---------------- spread / outliers ---------------- */
test('insSpread: the menu-wide food-cost range (needs ≥4 dishes, ≥10-pt span)', () => {
  const out = insSpread([dish('A', 3, 15), dish('B', 4.5, 15), dish('C', 5, 15), dish('D', 6, 15)]);   // 20,30,33,40
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'comparative');
  assert.equal(out[0].facts.loPct, 20);
  assert.equal(out[0].facts.hiPct, 40);
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insSpread: a tight menu (<10-pt span) or <4 dishes says nothing', () => {
  assert.deepEqual(insSpread([dish('A', 4.5, 15), dish('B', 4.6, 15), dish('C', 4.7, 15), dish('D', 4.8, 15)]), []);
  assert.deepEqual(insSpread([dish('A', 3, 15), dish('B', 6, 15)]), []);
});

/* ---------------- aggregate opportunity ---------------- */
test('insAggregate: sums the over-target gap across dishes, per 100 serves', () => {
  const out = insAggregate([dish('A', 6, 15), dish('B', 5, 14), dish('C', 3, 15)], 0.3);   // over: 1.5 + 0.8; C under
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'comparative');
  assert.equal(out[0].facts.count, 2);
  assert.equal(out[0].facts.per100, 230);   // (1.5 + 0.8) * 100
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insAggregate: fewer than 2 over-target dishes → nothing', () => {
  assert.deepEqual(insAggregate([dish('A', 6, 15), dish('B', 3, 15)], 0.3), []);
});

/* ---------------- ingredient-spend concentration ---------------- */
test('insSpend: the biggest-spend ingredient across the menu (cross), at ≥25% share', () => {
  const out = insSpend([{ name: 'Cheese', total: 40, pct: 40 }, { name: 'Bread', total: 20, pct: 20 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'cross');
  assert.equal(out[0].facts.name, 'Cheese');
  assert.equal(out[0].facts.pct, 40);
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insSpend: a diffuse spend (<25%) is not a lever', () => {
  assert.deepEqual(insSpend([{ name: 'A', total: 10, pct: 12 }, { name: 'B', total: 9, pct: 11 }]), []);
  assert.deepEqual(insSpend([]), []);
});

/* ---------------- complexity pattern ---------------- */
test('insComplexity: many-ingredient vs simpler dishes when the gap holds', () => {
  const out = insComplexity([
    dish('Big1', 6, 15, { nIng: 7 }), dish('Big2', 6.3, 15, { nIng: 6 }),   // ~40,42%
    dish('Small1', 3, 15, { nIng: 2 }), dish('Small2', 3.3, 15, { nIng: 3 }),   // 20,22%
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'comparative');
  assert.ok(out[0].facts.manyPct > out[0].facts.fewPct);
  assert.equal(out[0].facts.minIng, 6);            // the "6+" figure is backed by facts
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insComplexity: needs ≥2 in each group and a ≥3-pt gap', () => {
  assert.deepEqual(insComplexity([dish('A', 6, 15, { nIng: 7 }), dish('B', 3, 15, { nIng: 2 })]), []);   // one each
  assert.deepEqual(insComplexity([   // no gap between the groups
    dish('A', 5, 15, { nIng: 7 }), dish('B', 5, 15, { nIng: 6 }), dish('C', 5, 15, { nIng: 2 }), dish('D', 5, 15, { nIng: 3 }),
  ]), []);
});

/* ---------------- recent change ---------------- */
test('insRecentChange: counts dishes that cost more since the last update (movement)', () => {
  const out = insRecentChange({ up: 4 });
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'movement');
  assert.equal(out[0].facts.up, 4);
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insRecentChange: fewer than 2 → nothing', () => {
  assert.deepEqual(insRecentChange({ up: 1 }), []);
  assert.deepEqual(insRecentChange(null), []);
});

/* ---------------- data completeness (coverage) ---------------- */
test('insData: uncosted dishes are a gentle, non-obvious coverage note', () => {
  const out = insData({ uncosted: 3 });
  assert.equal(out.length, 1);
  assert.equal(out[0].dim, 'coverage');
  assert.equal(out[0].facts.uncosted, 3);
  assert.ok(nonObvious(out[0]));
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insData: singular grammar; nothing when everything is costed', () => {
  assert.match(insData({ uncosted: 1 })[0].text, /1 dish isn't costed/);
  assert.deepEqual(insData({ uncosted: 0 }), []);
});

/* ---------------- best performer (the one positive line, re-added v75) ---------------- */
test('insBest: the standout dish comfortably under target (positive, low score)', () => {
  const out = insBest([dish('Salad', 3, 15), dish('Burger', 6, 15)], 0.3);   // Salad 20% = 10 under; Burger over
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'best');
  assert.equal(out[0].dim, 'comparative');
  assert.equal(out[0].facts.name, 'Salad');
  assert.equal(out[0].facts.pts, 10);
  assert.ok(out[0].score <= 30);   // low priority — never crowds out a real problem
  assert.ok(numbersInFactsOnly(out[0]));
});
test('insBest: only when COMFORTABLY under (≥5 pts)', () => {
  assert.deepEqual(insBest([dish('A', 4.2, 15)], 0.3), []);   // 28% = 2 under, not comfortable
});

/* ---------------- the deliverable: a 30+ item menu yields 5 VARIED, non-obvious insights ---------------- */
test('v75 (brief §1): a 30+ item menu yields 5 insights across ≥4 distinct types, none table-restating', () => {
  const dishes = [];
  for (let i = 0; i < 15; i++) dishes.push(dish('Bfast' + i, 2.4, 10, { section: 'Breakfast', nIng: 3, top: top('Egg', 0.5, 3) }));   // ~24%
  for (let i = 0; i < 15; i++) dishes.push(dish('Lunch' + i, 5.1, 15, { section: 'Lunch', nIng: 7, top: top('Beef', 0.6, 7) }));       // 34% over
  dishes.push(dish('Blowout', 7, 15, { section: 'Lunch', nIng: 8, top: top('Wagyu', 0.6, 8) }));   // 47% → cut
  dishes.push(dish('Volatile', 5, 15, { section: 'Lunch', nIng: 4, top: top('Fish', 0.6, 4), hasRange: true, costMin: 3.5, costMax: 6.5, volatileIng: 'Fish' }));
  dishes.push(dish('Star', 2, 15, { section: 'Breakfast', nIng: 2, top: top('Toast', 0.5, 2) }));   // 13% → best
  const out = deriveInsights({
    dishes,
    shared: [{ name: 'Cheese', dishCount: 8 }],
    mover: { name: 'Beef', pct: 12, dishes: ['Lunch0', 'Lunch1'] },
    spend: [{ name: 'Beef', total: 60, pct: 45 }, { name: 'Egg', total: 20, pct: 15 }],
    recent: { up: 5 },
    coverage: { uncosted: 3 },
  }, 0.3, 0);
  assert.equal(out.length, 5, 'a 30+ item menu fills the cap');
  assert.ok(new Set(out.map((x) => x.kind)).size >= 4, 'across ≥4 distinct types: ' + out.map((x) => x.kind).join(','));
  out.forEach((x) => assert.ok(numbersInFactsOnly(x), 'every number shown is a computed fact: ' + x.text));   // money law across the whole pipeline
});

test('v75: a large HEALTHY menu still surfaces a few neutral facts, led by the warm line', () => {
  const dishes = [];
  for (let i = 0; i < 10; i++) dishes.push(dish('B' + i, 2, 10, { section: 'Breakfast', nIng: 2 }));    // 20%
  for (let i = 0; i < 10; i++) dishes.push(dish('L' + i, 3.9, 15, { section: 'Lunch', nIng: 7 }));       // 26% (still under 30%)
  const out = deriveInsights({ dishes, spend: [{ name: 'Cheese', total: 50, pct: 40 }] }, 0.3, 0);   // nothing over target
  assert.ok(out.length >= 2 && out.length <= 4, 'warm line + a few neutral facts, got ' + out.length);
  assert.equal(out[0].kind, 'allgood', 'leads with the warm all-healthy line');
  assert.ok(out.slice(1).every((x) => x.kind !== 'reprice' && x.kind !== 'cut'), 'no manufactured concern on a healthy menu');
});
