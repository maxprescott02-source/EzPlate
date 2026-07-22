/*
 * insights.test.js — the PURE deterministic insight engine (v63 item 3a, BROADENED v67 item 5b).
 *
 * v67 turned the single-shape engine (over-target → reprice) into one pure function PER insight
 * TYPE plus a pure selector. The app computes EVERY number; the optional Gemini phrasing only
 * rewrites the text (see api-insight.test.js). Every function here is extracted from js/app.js via
 * _extract (no DOM, no globals) — dishes/shared/mover are passed in as plain data.
 *
 * Contract note (deliberate change from v63): deriveInsights' input is now a bundle
 * {dishes, shared, mover} (a bare dishes array is still accepted as {dishes}), and its selection is
 * "most-relevant 2–3 with type variety + rotation" — NOT the old fixed "worst-two-over + count".
 */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const {
  insTargetPrice, insReprice, insNearMiss, insVolatility, insShared, insMover, insBest, insSummary,
  insPortion, insSub, insCut, selectInsights, deriveInsights,
} = require('./_extract.js');

const dish = (name, cost, menuPrice, extra) => Object.assign({ name, cost, menuPrice }, extra || {});

/* ---------------------------------------------------------------- target price helper */
test('insTargetPrice rounds UP to the nearest $0.50', () => {
  assert.equal(insTargetPrice(6, 0.3), 20);      // 6/0.3 = 20 exactly
  assert.equal(insTargetPrice(5, 0.3), 17);      // 16.66… → 17.00
});

/* ---------------------------------------------------------------- reprice type */
test('insReprice: over-target dishes, worst first, with points + target price', () => {
  const out = insReprice([dish('Barra & Chips', 6, 15), dish('Roll', 5, 14), dish('Salad', 3, 12)], 0.3);
  assert.equal(out.length, 2);                   // Barra 40% (10 pts), Roll ~36% (6 pts); Salad 25% under → excluded
  assert.equal(out[0].facts.name, 'Barra & Chips');
  assert.equal(out[0].kind, 'reprice');
  assert.equal(out[0].facts.pts, 10);
  assert.equal(out[0].facts.targetPrice, 20);
  assert.ok(out[0].score > out[1].score);        // worse dish scores higher
  assert.match(out[0].text, /Barra & Chips/);
  assert.match(out[0].text, /10 pts over/);
  assert.match(out[0].text, /\$20\.00/);
});

test('insReprice: a dish < 1 pt over is not flagged', () => {
  assert.deepEqual(insReprice([dish('Edge', 3.02, 10)], 0.3), []);   // 30.2% → 0 pts rounded
});

/* ---------------------------------------------------------------- near-miss type */
test('insNearMiss: fires only for a dish exactly ~1 pt over', () => {
  assert.equal(insNearMiss([dish('Edge', 3.1, 10)], 0.3).length, 1);   // 31% → 1 pt
  assert.equal(insNearMiss([dish('Way', 6, 15)], 0.3).length, 0);      // 40% → 10 pts, not a near-miss
  const only = insNearMiss([dish('Edge', 3.1, 10)], 0.3)[0];
  assert.equal(only.kind, 'nearmiss');
  assert.equal(only.facts.pts, 1);
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
  const kinds = out.map((x) => x.kind);
  assert.equal(new Set(kinds).size, 3);          // three distinct kinds, not two reprice lines
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
  assert.notEqual(lead0, lead1);                 // seed advances the lead within the similarly-notable group
  assert.equal(new Set([lead0, lead1, lead2]).size, 3);
});

test('selectInsights: a far-below candidate never rotates above the top group', () => {
  const cands = [
    { kind: 'reprice', score: 90, facts: {}, text: 'r' },
    { kind: 'count', score: 22, facts: {}, text: 'c' },
  ];
  // band is 12, so count (22) is NOT near the top (90) — it can't lead regardless of seed.
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

test('deriveInsights: accepts a bare dishes array and returns ≤3 {kind,facts,text}', () => {
  const out = deriveInsights([dish('A', 6, 15), dish('B', 5, 15), dish('C', 3, 15)], 0.3, 0);
  assert.ok(out.length >= 1 && out.length <= 3);
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
  const kinds = new Set(out.map((x) => x.kind));
  assert.ok(kinds.size >= 2);                     // genuinely varied, not all 'reprice'
});

test('deriveInsights: all-healthy menu → a positive/summary line, never empty when there is data', () => {
  const out = deriveInsights([dish('Salad', 3, 15), dish('Soup', 2, 9)], 0.3, 0);
  assert.ok(out.length >= 1);
  assert.ok(out.some((x) => x.kind === 'allgood' || x.kind === 'best'));
});

test('deriveInsights: pure — does not mutate its input', () => {
  const data = { dishes: [dish('A', 6, 15), dish('B', 3, 15)], shared: [{ name: 'X', dishCount: 2 }] };
  const snap = JSON.stringify(data);
  deriveInsights(data, 0.3, 0);
  assert.equal(JSON.stringify(data), snap);
});

/* ---------------------------------------------------------------- v69: portion / spec type */
test('insPortion: a dish dominated by one ingredient → trim-the-portion advice, no price change', () => {
  const out = insPortion([dish('Barra & Chips', 6, 15, { top: { name: 'Fish', share: 0.6, trimPct: 15, saving: 0.54 } })]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'portion');
  assert.equal(out[0].facts.sharePct, 60);
  assert.equal(out[0].facts.trimPct, 15);
  assert.equal(out[0].facts.saving, 0.54);
  assert.match(out[0].text, /Fish is 60% of Barra & Chips/);
  assert.match(out[0].text, /15% smaller portion/);
  assert.match(out[0].text, /\$0\.54/);
  assert.match(out[0].text, /no price change/);
});

test('insPortion: no single ingredient dominates (share < 45%) → nothing', () => {
  assert.deepEqual(insPortion([dish('Even', 6, 15, { top: { name: 'A', share: 0.3, trimPct: 15, saving: 0.3 } })]), []);
  assert.deepEqual(insPortion([dish('NoTop', 6, 15)]), []);
});

test('insPortion: picks the MOST lopsided plate across the menu', () => {
  const out = insPortion([
    dish('X', 6, 15, { top: { name: 'A', share: 0.5, trimPct: 15, saving: 0.4 } }),
    dish('Y', 6, 15, { top: { name: 'B', share: 0.7, trimPct: 15, saving: 0.6 } }),
  ]);
  assert.equal(out[0].facts.name, 'Y');
  assert.equal(out[0].facts.sharePct, 70);
});

/* ---------------------------------------------------------------- v69: substitution type */
test('insSub: a cheaper same-category product → swap advice with per-unit prices + plate count', () => {
  const out = insSub([{ ing: 'Cheese', altName: 'Cheese Block Alfa', curPer: 12.20, altPer: 9.80, unit: 'kg', plateCount: 8, saving: 3.2 }]);
  assert.equal(out.length, 1);
  assert.equal(out[0].kind, 'sub');
  assert.equal(out[0].facts.plateCount, 8);
  assert.equal(out[0].facts.saving, 3.2);
  assert.match(out[0].text, /You buy Cheese at \$12\.20\/kg/);
  assert.match(out[0].text, /Cheese Block Alfa is \$9\.80\/kg/);
  assert.match(out[0].text, /across 8 plates/);
});

test('insSub: no cheaper product available → nothing', () => {
  assert.deepEqual(insSub([]), []);
  assert.deepEqual(insSub(null), []);
});

test('insSub: picks the biggest saving when several exist', () => {
  const out = insSub([
    { ing: 'Cheese', altName: 'Alfa', curPer: 12, altPer: 11, unit: 'kg', plateCount: 2, saving: 1.0 },
    { ing: 'Oil', altName: 'Beta', curPer: 8, altPer: 5, unit: 'L', plateCount: 4, saving: 5.0 },
  ]);
  assert.equal(out[0].facts.ing, 'Oil');
});

/* ---------------------------------------------------------------- v69: cut type + reprice hand-off */
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

/* ---------------------------------------------------------------- v69: reprice is now the LAST-resort lever */
test('deriveInsights: cheaper levers (portion/substitution) lead over reprice', () => {
  const out = deriveInsights({
    dishes: [dish('Barra & Chips', 6, 15, { top: { name: 'Fish', share: 0.6, trimPct: 15, saving: 0.9 } })],
    subs: [{ ing: 'Cheese', altName: 'Alfa', curPer: 12, altPer: 9, unit: 'kg', plateCount: 5, saving: 4 }],
  }, 0.3, 0);
  assert.notEqual(out[0].kind, 'reprice');                    // reprice never leads when a cheaper lever applies
  assert.ok(out.some((x) => x.kind === 'portion' || x.kind === 'sub'));
});
