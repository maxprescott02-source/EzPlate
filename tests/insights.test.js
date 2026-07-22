/*
 * insights.test.js — the PURE deterministic insight engine (v63 item 3a, broadened v67, REFINED v71).
 *
 * v71 (Max): "point, don't prescribe." The engine now names a cost problem and its size and STOPS — it never
 * dictates a fix. Removed entirely: the substitution insight (insSub) and its matcher (subCandidate) — the
 * cost engine can't know two products are culinarily interchangeable. The reprice / near-miss / portion types
 * no longer state a target price or a prescribed portion trim. The suggestion COUNT now scales with menu size,
 * and an all-healthy menu returns ONE warm line. The app still computes EVERY number; the optional Gemini
 * layer only rephrases (see api-insight.test.js). Each function is extracted from js/app.js via _extract.
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  insReprice, insNearMiss, insVolatility, insShared, insMover, insBest, insSummary,
  insPortion, insCut, healthyLine, selectInsights, deriveInsights,
} = require('./_extract.js');

const dish = (name, cost, menuPrice, extra) => Object.assign({ name, cost, menuPrice }, extra || {});

/* ---------------------------------------------------------------- over-target (reprice) type: POINT, no $-target */
test('insReprice: over-target dishes, worst first, with points — but no prescribed target price', () => {
  const out = insReprice([dish('Barra & Chips', 6, 15), dish('Roll', 5, 14), dish('Salad', 3, 12)], 0.3);
  assert.equal(out.length, 2);                   // Barra 40% (10 pts), Roll ~36% (6 pts); Salad 25% under → excluded
  assert.equal(out[0].facts.name, 'Barra & Chips');
  assert.equal(out[0].kind, 'reprice');
  assert.equal(out[0].facts.pts, 10);
  assert.equal(out[0].facts.targetPrice, undefined);   // v71: never prescribes a new price
  assert.ok(out[0].score > out[1].score);        // worse dish scores higher
  assert.match(out[0].text, /Barra & Chips/);
  assert.match(out[0].text, /10 pts over/);
  assert.match(out[0].text, /rework/);
  assert.doesNotMatch(out[0].text, /\braise\b|\bto \$\d/);   // no "raise to $X"
});

test('insReprice: a 1-pt dish is left to insNearMiss (no double-flagging), and < 1 pt is not flagged', () => {
  assert.deepEqual(insReprice([dish('Edge', 3.1, 10)], 0.3), []);    // 31% → 1 pt → near-miss owns it
  assert.deepEqual(insReprice([dish('Flat', 3.02, 10)], 0.3), []);   // 30.2% → 0 pts
});

/* ---------------------------------------------------------------- near-miss type: POINT, no $-nudge */
test('insNearMiss: fires only for a dish ~1 pt over, with no prescribed price', () => {
  const out = insNearMiss([dish('Edge', 3.1, 10)], 0.3);
  assert.equal(out.length, 1);
  assert.equal(insNearMiss([dish('Way', 6, 15)], 0.3).length, 0);   // 40% → 10 pts, not a near-miss
  assert.equal(out[0].kind, 'nearmiss');
  assert.equal(out[0].facts.pts, 1);
  assert.equal(out[0].facts.targetPrice, undefined);
  assert.match(out[0].text, /whisker over/);
  assert.match(out[0].text, /small tweak/);
  assert.doesNotMatch(out[0].text, /nudge from \$.*to \$/);   // v71: the old "$X to $Y" directive is gone
});

/* ---------------------------------------------------------------- volatility type */
test('insVolatility: picks the dish with the widest cost range and names the ingredient', () => {
  const out = insVolatility([
    dish('Barra & Chips', 5, 15, { hasRange: true, costMin: 4.1, costMax: 5.6, volatileIng: 'Barramundi' }),
    dish('Toastie', 3, 9, { hasRange: true, costMin: 2.9, costMax: 3.1, volatileIng: 'Cheese' }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'volatility');
  assert.equal(out[0].facts.name, 'Barra & Chips');
  assert.equal(out[0].facts.costMin, 4.1);
  assert.equal(out[0].facts.costMax, 5.6);
  assert.match(out[0].text, /Barramundi/);
  assert.match(out[0].text, /\$4\.10–\$5\.60/);
});

test('insVolatility: no range → nothing', () => {
  assert.deepEqual(insVolatility([dish('Flat', 5, 15, { hasRange: false, costMin: 5, costMax: 5 })]), []);
});

/* ---------------------------------------------------------------- shared-ingredient type */
test('insShared: leads with the most-shared ingredient', () => {
  const out = insShared([{ name: 'Cheese', dishCount: 8 }, { name: 'Onion', dishCount: 3 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'shared');
  assert.equal(out[0].facts.name, 'Cheese');
  assert.equal(out[0].facts.dishCount, 8);
  assert.match(out[0].text, /Cheese is in 8 dishes/);
});

test('insShared: an ingredient in only one dish is not leverage', () => {
  assert.deepEqual(insShared([{ name: 'Truffle', dishCount: 1 }]), []);
  assert.deepEqual(insShared([]), []);
});

/* ---------------------------------------------------------------- biggest-mover type */
test('insMover: reports the move %, direction and dish count', () => {
  const out = insMover({ name: 'Barramundi', pct: 18.4, dishes: ['Barra & Chips', 'Fish Burger'] });
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'mover');
  assert.equal(out[0].facts.pct, 18);            // absolute, rounded
  assert.equal(out[0].facts.dishCount, 2);
  assert.match(out[0].text, /rose 18%/);
  assert.match(out[0].text, /2 dishes/);
});

test('insMover: a move under 3% is noise → nothing', () => {
  assert.deepEqual(insMover({ name: 'Salt', pct: 1.2, dishes: ['X'] }), []);
  assert.deepEqual(insMover(null), []);
});

/* ---------------------------------------------------------------- best-performer type */
test('insBest: calls out a dish comfortably under target (positive)', () => {
  const out = insBest([dish('Salad', 3, 15), dish('Barra', 6, 15)], 0.3);   // Salad 20% = 10 under
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'best');
  assert.equal(out[0].facts.name, 'Salad');
  assert.match(out[0].text, /under your 30% target/);
});

test('insBest: nothing meaningfully under target → nothing', () => {
  assert.deepEqual(insBest([dish('Barra', 6, 15)], 0.3), []);   // 40% over → no positive
});

/* ---------------------------------------------------------------- summary type */
test('insSummary: count line when some are over, positive line when none are', () => {
  const over = insSummary([dish('A', 6, 15), dish('B', 3, 15)], 0.3);
  assert.equal(over[0].kind, 'count');
  assert.match(over[0].text, /1 of 2 costed dishes sit over your 30% target/);
  const good = insSummary([dish('A', 3, 15)], 0.3);
  assert.equal(good[0].kind, 'allgood');
  assert.match(good[0].text, /healthy/);
});

/* ---------------------------------------------------------------- costly dominant ingredient (portion) type */
test('insPortion: a dish dominated by one ingredient → flags the lever, no prescribed trim or saving', () => {
  const out = insPortion([dish('Barra & Chips', 6, 15, { top: { name: 'Fish', share: 0.6 } })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'portion');
  assert.equal(out[0].facts.sharePct, 60);
  assert.equal(out[0].facts.trimPct, undefined);   // v71: no prescribed portion size
  assert.equal(out[0].facts.saving, undefined);    // v71: no prescribed saving
  assert.match(out[0].text, /Fish is 60% of Barra & Chips/);
  assert.match(out[0].text, /biggest lever/);
  assert.doesNotMatch(out[0].text, /smaller portion|% smaller/);
});

test('insPortion: no single ingredient dominates (share < 45%) → nothing', () => {
  assert.deepEqual(insPortion([dish('Even', 6, 15, { top: { name: 'A', share: 0.3 } })]), []);
  assert.deepEqual(insPortion([dish('NoTop', 6, 15)]), []);
});

test('insPortion: picks the MOST lopsided plate across the menu', () => {
  const out = insPortion([
    dish('X', 6, 15, { top: { name: 'A', share: 0.5 } }),
    dish('Y', 6, 15, { top: { name: 'B', share: 0.7 } }),
  ]);
  assert.equal(out[0].facts.name, 'Y');
  assert.equal(out[0].facts.sharePct, 70);
});

/* ---------------------------------------------------------------- cut type + reprice hand-off */
test('insCut: a dish far over target (>= 12 pts) → rework/drop, and insReprice leaves it alone', () => {
  const cut = insCut([dish('Steak Works', 6.3, 15)], 0.3);   // 42% = 12 pts over
  assert.equal(cut.length, 1);
  assert.equal(cut[0].kind, 'cut');
  assert.equal(cut[0].facts.pts, 12);
  assert.match(cut[0].text, /12 pts over/);
  assert.match(cut[0].text, /dropping it/);
  assert.deepEqual(insReprice([dish('Steak Works', 6.3, 15)], 0.3), []);   // handed off to insCut, not repriced
});

test('insCut: a merely-over dish (< 12 pts) is not a cut candidate', () => {
  assert.deepEqual(insCut([dish('Roll', 5, 14)], 0.3), []);   // ~6 pts over → reprice territory, not cut
});

/* ---------------------------------------------------------------- warm all-healthy line (item 4) */
test('healthyLine: one warm line carrying only the count + target %, varied by seed', () => {
  const a = healthyLine(5, 30, 0);
  assert.equal(a.kind, 'allgood');
  assert.equal(a.facts.total, 5);
  assert.equal(a.facts.targetPct, 30);
  assert.match(a.text, /5/);
  assert.match(a.text, /30%/);
  assert.notEqual(healthyLine(5, 30, 0).text, healthyLine(5, 30, 1).text);   // seed changes the wording
});

/* ---------------------------------------------------------------- selector: variety + rotation */
test('selectInsights: caps to max and keeps type variety (≤1 per kind)', () => {
  const cands = [
    { kind: 'reprice', score: 80, facts: {}, text: 'r1' },
    { kind: 'reprice', score: 78, facts: {}, text: 'r2' },
    { kind: 'volatility', score: 70, facts: {}, text: 'v1' },
    { kind: 'shared', score: 60, facts: {}, text: 's1' },
  ];
  const out = selectInsights(cands, 0, 3);
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map((x) => x.kind)).size, 3);   // three distinct kinds, not two reprice lines
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

/* ---------------------------------------------------------------- deriveInsights orchestration */
test('deriveInsights: no costed+priced dishes → empty (the panel hides)', () => {
  assert.deepEqual(deriveInsights({ dishes: [] }, 0.3), []);
  assert.deepEqual(deriveInsights([dish('X', 0, 10), dish('Y', 5, 0)], 0.3), []);
});

test('deriveInsights: invalid target fraction → empty', () => {
  assert.deepEqual(deriveInsights([dish('A', 6, 15)], 0), []);
  assert.deepEqual(deriveInsights([dish('A', 6, 15)], -1), []);
});

test('deriveInsights: returns {kind,facts,text} with score stripped', () => {
  const out = deriveInsights([dish('A', 6, 15), dish('B', 5, 15), dish('C', 3, 15)], 0.3, 0);
  assert.ok(out.length >= 1);
  out.forEach((x) => { assert.ok(x.kind && x.facts && typeof x.text === 'string'); assert.equal(x.score, undefined); });
});

test('deriveInsights: mixes TYPES — over-target + volatility + shared, not three reprice lines', () => {
  const out = deriveInsights({
    dishes: [
      dish('Barra & Chips', 6, 15, { hasRange: true, costMin: 4.1, costMax: 5.6, volatileIng: 'Barramundi' }),
      dish('Fish Burger', 5.5, 15),
      dish('Toastie', 5.2, 15),
    ],
    shared: [{ name: 'Cheese', dishCount: 3 }],
    mover: { name: 'Barramundi', pct: 18, dishes: ['Barra & Chips'] },
  }, 0.3, 0);
  assert.ok(new Set(out.map((x) => x.kind)).size >= 2);   // genuinely varied, not all 'reprice'
});

/* ---------------------------------------------------------------- item 3: count scales with menu size */
test('deriveInsights: 1 costed dish → at most 1 insight', () => {
  assert.ok(deriveInsights([dish('Solo', 6, 15)], 0.3, 0).length <= 1);
});

test('deriveInsights: a few dishes (2–5) → at most 2', () => {
  const dishes = [dish('A', 6, 15), dish('B', 5.5, 15), dish('C', 5.2, 15), dish('D', 5.1, 15)];
  assert.ok(deriveInsights(dishes, 0.3, 0).length <= 2);
});

test('deriveInsights: a fuller menu (6+) → at most 3, never padded past real candidates', () => {
  const dishes = [];
  for (let i = 0; i < 8; i++) dishes.push(dish('D' + i, 6, 15));
  const out = deriveInsights(dishes, 0.3, 0);
  assert.ok(out.length >= 1 && out.length <= 3);
});

/* ---------------------------------------------------------------- item 4: all-healthy → one warm line */
test('deriveInsights: all-healthy menu → exactly ONE warm, genuine line (never a stack of positives)', () => {
  const out = deriveInsights([dish('Salad', 3, 15), dish('Soup', 2, 9), dish('Toast', 1.5, 8)], 0.3, 0);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'allgood');
  assert.match(out[0].text, /good shape|healthy|clear|nothing/i);
});

/* ---------------------------------------------------------------- item 1: point, don't prescribe (whole engine) */
test('point-not-prescribe: no suggestion swaps a product, prescribes a portion size, or dictates a price', () => {
  const out = deriveInsights({
    dishes: [
      dish('Barra & Chips', 6, 15, { top: { name: 'Fish', share: 0.6 }, hasRange: true, costMin: 4.1, costMax: 5.6, volatileIng: 'Barramundi' }),
      dish('Roll', 5, 14),
      dish('Steak Works', 6.3, 15),
      dish('Toastie', 5.4, 15),
      dish('Wrap', 5.2, 15),
      dish('Bowl', 5.1, 15),
    ],
    shared: [{ name: 'Cheese', dishCount: 2 }],
    mover: { name: 'Barramundi', pct: 12, dishes: ['Barra & Chips'] },
  }, 0.3, 0);
  out.forEach((x) => {
    assert.doesNotMatch(x.text, /\bswap\b|\breplace\b/i);
    assert.doesNotMatch(x.text, /smaller portion|% smaller/i);
    assert.doesNotMatch(x.text, /\braise (it|the price)? ?to \$|nudge from \$.*to \$/i);
    assert.equal(x.facts.targetPrice, undefined);
  });
});

test('deriveInsights: a cheaper lever (costly ingredient) leads over a plain reprice', () => {
  const out = deriveInsights({
    dishes: [dish('Barra & Chips', 6, 15, { top: { name: 'Fish', share: 0.6 } })],
  }, 0.3, 0);
  assert.notEqual(out[0].kind, 'reprice');   // reprice never leads when a cheaper lever applies
  assert.equal(out[0].kind, 'portion');
});

test('deriveInsights: pure — does not mutate its input', () => {
  const data = { dishes: [dish('A', 6, 15), dish('B', 3, 15)], shared: [{ name: 'X', dishCount: 2 }] };
  const snap = JSON.stringify(data);
  deriveInsights(data, 0.3, 0);
  assert.equal(JSON.stringify(data), snap);
});
