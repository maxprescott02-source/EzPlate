/*
 * king-rows.test.js — Q5 (v124). The Ingredients (pantry) row redesign.
 *
 * Three pieces of logic got their first UI surface here and each is pinned:
 * - ingLastMovePct: the inline drift %, THE SAME RULE as digData('movers') — two points minimum,
 *   prev>0, finite last, sub-1% is rounding noise — so the row and the Dashboard's What-moved
 *   panel can never disagree about whether a price moved.
 * - kingMissingImpact: how many plates lose costing while a link is broken, counted through BOTH
 *   line shapes (kid lines AND legacy/restored bare-pid lines) — the absence of a back-pointer is
 *   not evidence nothing was lost (CLAUDE.md).
 * - the row markup: a broken link is LOUD ("⚠ product missing — relink…", "no cost"), and the v67
 *   category chip row is gone from the row on purpose.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`king-rows: function not found -> ${name}. app.js changed; update tests/king-rows.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`king-rows: unbalanced braces for ${name}`);
}

function driftWith(log) {
  // eslint-disable-next-line no-new-func
  return new Function('LOG', `"use strict"; var ingPriceLog=LOG; ${extractFn(SRC, 'ingLastMovePct')} return ingLastMovePct;`)(log);
}

test('drift: fewer than two points is silence, not zero', () => {
  const f = driftWith({ P1: [{ t: 1, v: 2 }] });
  assert.equal(f('P1'), null);
  assert.equal(f('P_ABSENT'), null);
});

test('drift: sub-1% is rounding noise — the same floor as the What-moved panel', () => {
  const f = driftWith({ P1: [{ t: 1, v: 100 }, { t: 2, v: 100.9 }] });
  assert.equal(f('P1'), null);
});

test('drift: a real move reports signed %, from the LAST two points only', () => {
  const f = driftWith({ P1: [{ t: 1, v: 5 }, { t: 2, v: 0.01 }, { t: 3, v: 0.0112 }] });
  assert.ok(Math.abs(f('P1') - 12) < 1e-9, 'last step +12%, the old points ignored');
  const down = driftWith({ P1: [{ t: 1, v: 0.02 }, { t: 2, v: 0.017 }] });
  assert.ok(down('P1') < 0, 'a price drop is negative');
});

test('drift: a zero or garbage previous point cannot fabricate a percentage', () => {
  assert.equal(driftWith({ P1: [{ t: 1, v: 0 }, { t: 2, v: 5 }] })('P1'), null);
  assert.equal(driftWith({ P1: [{ t: 1, v: 2 }, { t: 2, v: NaN }] })('P1'), null);
});

function impactWith(plates) {
  // eslint-disable-next-line no-new-func
  return new Function('SP', `"use strict"; var savedPlates=SP; ${extractFn(SRC, 'kingMissingImpact')} return kingMissingImpact;`)(plates);
}

test('missing-link impact counts BOTH line shapes — kid lines and legacy bare-pid lines', () => {
  const f = impactWith([
    { id: 'A', lines: [{ kid: 'K4', qty: 20 }] },                    // normal shape
    { id: 'B', lines: [{ pid: 'P_GONE', qty: 30 }] },                // legacy/restored shape
    { id: 'C', lines: [{ kid: 'K1', qty: 5 }] },                     // unrelated
    { id: 'D', lines: [{ misc: true, name: 'x', cost: 1 }] },        // misc never counts
  ]);
  assert.equal(f({ id: 'K4', pid: 'P_GONE' }), 2, 'one plate per side, both found');
  assert.equal(f({ id: 'K4', pid: null }), 1, 'no pid to chase → only the kid side can match');
});

test('missing-link impact counts plates, not lines', () => {
  const f = impactWith([{ id: 'A', lines: [{ kid: 'K4', qty: 1 }, { kid: 'K4', qty: 2 }] }]);
  assert.equal(f({ id: 'K4', pid: null }), 1);
});

test('the row markup: broken links are loud, drift is classed, the category chip row is gone', () => {
  const body = extractFn(SRC, 'renderKitchenPanel');
  assert.ok(body.includes('product missing'), 'the warning copy exists');
  assert.ok(body.includes('king-missing'), 'and carries the .king-missing class');
  assert.ok(body.includes('no cost'), 'the price cell says "no cost" rather than vanishing');
  assert.ok(body.includes('kingMissingImpact'), 'the plates-at-risk count comes from the both-sides counter');
  assert.ok(body.includes('king-drift'), 'drift renders through .king-drift');
  assert.ok(body.includes('ingLastMovePct'), 'and its % comes from the shared movers rule');
  assert.ok(!body.includes('king-meta'), 'the v67 category chip row is no longer emitted (Q5 design)');
});

test('kingProductLabel carries description — brand · supplier, in that order', () => {
  // eslint-disable-next-line no-new-func
  const f = new Function('BYID', `"use strict"; var byId=BYID; ${extractFn(SRC, 'kingProductLabel')} return kingProductLabel;`)(
    { P1: { description: 'Tartare Sauce 2.4L', brand: 'Masterfoods', supplier: 'Bidfood' }, P2: { description: 'Eggs' } });
  assert.equal(f({ pid: 'P1' }), 'Tartare Sauce 2.4L — Masterfoods · Bidfood');
  assert.equal(f({ pid: 'P2' }), 'Eggs', 'no brand, no supplier — no dangling separators');
  assert.equal(f({ pid: 'P_GONE' }), '(product missing)');
});
