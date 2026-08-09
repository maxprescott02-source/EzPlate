/*
 * king-rows.test.js — Q5 (v124). The Ingredients (pantry) row redesign.
 *
 * Three pieces of logic got their first UI surface here and each is pinned:
 * - ingLastMovePct: the inline drift %, THE SAME RULE as digData('movers') — two points minimum,
 *   prev>0, finite last, sub-1% is rounding noise — so the row and the Dashboard's What-moved
 *   panel can never disagree about whether a price moved.
 * - the broken-link N: platesUsingKid's KID arm only, because the copy promises "relink to keep N
 *   plates costed" and relinking mutates k.pid — a legacy bare-pid line resolves through byId and a
 *   relink cannot heal it, so counting it would make the sentence false (the v124 review's finding).
 * - the row markup: a broken link is LOUD ("⚠ product missing — relink…", "no cost").
 *
 * F3 (v139) CONSCIOUS FLIP. Q5 removed the category from the row and this file pinned its absence.
 * The v3 mock (§3.4) puts Category back as a real column, and protocol rule R1 says the mock wins
 * on a presentational difference, so the pin is REVERSED here rather than worked around: the row
 * must now emit the DERIVED category. What made Q5's removal safe still holds and is what the new
 * assertion protects — the category is computed from the linked product by `kingCategory` and is
 * never stored on the ingredient, so repointing the link changes it automatically.
 *
 * Also F3: these are SOURCE greps, and a source grep cannot tell markup from a comment. The old
 * `!includes('king-meta')` assertion went red because a CODE COMMENT in the renderer mentioned the
 * class by name while emitting nothing. Comments are stripped before every grep below now, which
 * fixes the whole class rather than the one instance. (The contract's trap 6 warns about the other
 * direction — a source grep passing while the render is wrong — which is why the rendered DOM is
 * asserted in tests/visual/fresh-states.spec.js and the F3 spec, not here.)
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
/* strip block and line comments so a source grep can never be satisfied — or broken — by prose.
   Deliberately crude: it runs over one already-parsed file, not arbitrary input. */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
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
  const just = driftWith({ P1: [{ t: 1, v: 100 }, { t: 2, v: 101.05 }] });
  assert.ok(just('P1') != null, '1.05% is over the floor — pins the boundary at 1, not somewhere higher');
});

test('drift: a real move reports signed %, from the LAST two points only', () => {
  const f = driftWith({ P1: [{ t: 1, v: 5 }, { t: 2, v: 0.01 }, { t: 3, v: 0.0112 }] });
  assert.ok(Math.abs(f('P1') - 12) < 1e-9, 'last step +12%, the old points ignored');
  const down = driftWith({ P1: [{ t: 1, v: 0.02 }, { t: 2, v: 0.017 }] });
  assert.ok(down('P1') < 0, 'a price drop is negative');
});

test('drift: zero, garbage or STRING points cannot fabricate a percentage', () => {
  assert.equal(driftWith({ P1: [{ t: 1, v: 0 }, { t: 2, v: 5 }] })('P1'), null);
  assert.equal(driftWith({ P1: [{ t: 1, v: 2 }, { t: 2, v: NaN }] })('P1'), null);
  // isFinite('') is TRUE (CLAUDE.md) — without the typeof guard this renders a confident −100.0%
  assert.equal(driftWith({ P1: [{ t: 1, v: 2 }, { t: 2, v: '' }] })('P1'), null);
  assert.equal(driftWith({ P1: [{ t: 1, v: 2 }, { t: 2, v: null }] })('P1'), null);
});

test('the broken-link N counts ONLY plates a relink would heal — the kid arm, never bare-pid lines', () => {
  // eslint-disable-next-line no-new-func
  const f = new Function('SP', `"use strict"; var savedPlates=SP; ${extractFn(SRC, 'platesUsingKid')} return platesUsingKid;`)([
    { id: 'A', lines: [{ kid: 'K4', qty: 20 }] },                    // healed by a relink
    { id: 'B', lines: [{ pid: 'P_GONE', qty: 30 }] },                // a relink CANNOT heal this (lineProduct resolves it via byId)
    { id: 'C', lines: [{ kid: 'K1', qty: 5 }] },                     // unrelated
    { id: 'D', lines: [{ kid: 'K4', qty: 1 }, { kid: 'K4', qty: 2 }] }, // plates, not lines
  ]);
  assert.equal(f('K4').length, 2, 'A and D — the bare-pid plate is not promised a fix it cannot get');
});

test('the row markup: broken links are loud, drift is classed, category is DERIVED', () => {
  const body = code(extractFn(SRC, 'renderKitchenPanel'));
  assert.ok(body.includes('product missing'), 'the warning copy exists');
  assert.ok(body.includes('king-missing'), 'and carries the .king-missing class');
  assert.ok(body.includes('no cost'), 'the price cell says "no cost" rather than vanishing');
  assert.ok(body.includes('platesUsingKid'), 'the plates-at-risk count is the kid arm — what a relink actually heals');
  assert.ok(body.includes('king-drift'), 'drift renders through .king-drift');
  assert.ok(body.includes('ingLastMovePct'), 'and its % comes from the shared movers rule');
  // F3's flip: the column is back, and it is back as the DERIVED value. Storing a category on the
  // ingredient would be the actual regression Q5's removal was protecting against.
  assert.ok(body.includes('king-cat'), 'the category renders as its own cell (v3 §3.4, rule R1)');
  assert.ok(body.includes('kingCategory('), 'and it is DERIVED from the linked product, never stored');
  assert.ok(!body.includes('k.category'), 'nothing reads a stored category off the ingredient');
  assert.ok(!body.includes('king-meta'), 'the v67 category CHIP ROW is still not emitted — a column is not a chip row');
  /* BOTH category emission sites must mark an empty value as a placeholder, not just the
     broken-link one. `.is-nil` is what the phone's rules key off to hide a bare dash, and the first
     cut marked only the broken path — so a LINKED product with no category of its own printed "—"
     on the meta line, the exact thing the design forbids. A render test cannot stage that state
     (byId is module-scoped and every fixture product has a category), so it is pinned here: an
     unconditional `class="king-cat">` is the shape of the bug. */
  assert.ok(!body.includes('class="king-cat">'),
    'no category cell is emitted without the conditional is-nil placeholder class');
  assert.ok(/king-cat'\+\(\w+\?''/.test(body), 'the healthy path decides is-nil from the derived value');
});

test('kingProductLabel carries description — brand · supplier, in that order', () => {
  // eslint-disable-next-line no-new-func
  const f = new Function('BYID', `"use strict"; var byId=BYID; ${extractFn(SRC, 'kingProductLabel')} return kingProductLabel;`)(
    { P1: { description: 'Tartare Sauce 2.4L', brand: 'Masterfoods', supplier: 'Bidfood' }, P2: { description: 'Eggs' } });
  assert.equal(f({ pid: 'P1' }), 'Tartare Sauce 2.4L — Masterfoods · Bidfood');
  assert.equal(f({ pid: 'P2' }), 'Eggs', 'no brand, no supplier — no dangling separators');
  // defensive fallback only — renderKitchenPanel's missing branch never calls this; pinned so a
  // future caller that does cannot crash on a broken link
  assert.equal(f({ pid: 'P_GONE' }), '(product missing)');
});
