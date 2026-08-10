/*
 * prod-rows.test.js — F4 (v140). The Products row, rebuilt from the v3 mock (§3.5).
 *
 * What is pinned here is what the REBUILD could quietly lose, not the mock's look:
 *
 * - **v99's price-basis law.** `.ing-per` renders EXACTLY when `dispPrice`'s figure does not carry
 *   the basis itself. The v20 eggs bug made that a correctness flag rather than a decoration, and
 *   v126 kept it by DEDUPING (render the label only when it adds information) rather than by
 *   hiding it. A restyle is exactly when a "redundant-looking" label gets dropped, so the boundary
 *   is asserted against the real `dispPrice` on all four base units.
 * - **The change column reads the shared movers rule.** `ingLastMovePct` is the same function the
 *   Ingredients row and the dashboard's What-moved panel call, which is why the three can never
 *   disagree; `king-rows.test.js` already pins its arithmetic, so this file pins the WIRING.
 * - **The placeholder classes.** A desktop column needs a cell, so an absent category or supplier
 *   renders a dash marked `is-nil`; the phone's rules key off that class to hide it. F3 shipped the
 *   first cut of this pattern with only ONE of two emission sites marked and a bare "—" reached a
 *   phone, so both sites are pinned here, as is `no-cat` on the row, which is what lets the meta
 *   separator be chosen in CSS instead of by a sibling chain.
 *
 * These are SOURCE greps and a source grep cannot tell markup from a comment — F3 turned a pin red
 * with nothing but a comment mentioning a class. Comments are stripped before every grep below.
 * The rendered DOM is asserted in tests/visual/v140-products.spec.js, not here.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
/* the REAL dispPrice + the renderer's own basisKnown expression, so the two cannot drift apart in
   this file the way they could if the condition were retyped here */
const RENDER = code(extractFn(SRC, 'renderIngredients'));
const basisExpr = /var basisKnown=(.+?);\n/.exec(RENDER);

test('v99: the basis label renders EXACTLY when the figure does not carry the basis', () => {
  assert.ok(basisExpr, 'renderIngredients still computes basisKnown as a single expression');
  // eslint-disable-next-line no-new-func
  const f = new Function('P', `"use strict";
    ${extractFn(SRC, 'cpbu')}
    ${extractFn(SRC, 'dispPrice')}
    var p=P;
    var basisKnown=${basisExpr[1]};
    return { price: dispPrice(p), basisKnown: basisKnown };`);

  for (const [label, p, wantBasisInFigure] of [
    ['grams', { base_unit: 'g', cost_per_base_unit: 0.00345 }, true],
    ['millilitres', { base_unit: 'ml', cost_per_base_unit: 0.002 }, true],
    ['each', { base_unit: 'ea', cost_per_base_unit: 1.2 }, true],
  ]) {
    const r = f(p);
    assert.ok(/\/(kg|L|unit)$/.test(r.price), `${label}: the figure itself states the basis (${r.price})`);
    assert.equal(r.basisKnown, wantBasisInFigure, `${label}: so the separate label is redundant and must NOT render`);
  }

  // the two rows where the label IS the correctness flag and must render loud
  const unknown = f({ base_unit: 'unknown', cost_per_base_unit: 3 });
  assert.equal(unknown.basisKnown, false,
    'an unrecognised base_unit gets "$3.00/unit" from dispPrice — a figure whose stated basis is a GUESS, so the real one is shown beside it');
  const noCost = f({ base_unit: 'g', cost_per_base_unit: null });
  assert.equal(noCost.price, '—', 'no cost renders an em dash');
  assert.equal(noCost.basisKnown, false, 'and a dash carries no basis, so the label renders');
});

test('the change column is wired to the SHARED movers rule, and reads as "steady" when nothing moved', () => {
  assert.ok(RENDER.includes('ingLastMovePct'),
    'the drift % comes from the same function the Ingredients row and What-moved use — that shared call is the whole reason the three cannot disagree');
  assert.ok(RENDER.includes('ing-drift'), 'it renders through .ing-drift');
  assert.ok(/ing-drift none[^]*?steady/.test(RENDER),
    'no logged move reads as the muted word "steady" (mock §3.5), not as a bare dash');
  assert.ok(/aria-label="no recent price change"/.test(RENDER),
    '"steady" says what it means to a screen reader — it is "no move worth reporting", not "no change"');
  assert.ok(/pct>0\?'up':'down'/.test(RENDER), 'a rise is classed up and a fall down — semantic colour, price up = worse');
});

test('placeholder cells: BOTH the category and the supplier mark an absent value as is-nil', () => {
  /* A desktop column needs a cell and a phone row does not, so the dash is a placeholder the phone
     hides via `.is-nil`. Marking only one of the two sites is the shape of F3's shipped defect —
     a bare "—" on the meta line — and neither state is reachable from the test fixtures, so it is
     pinned at the source. */
  assert.ok(!/class="ing-tag">/.test(RENDER),
    'no category cell is emitted without the conditional is-nil class');
  assert.ok(!/class="ing-tag sup">/.test(RENDER),
    'no supplier cell is emitted without the conditional is-nil class');
  assert.ok(/ing-tag'\+\(p\.category\?''/.test(RENDER), 'the category decides is-nil from its own value');
  assert.ok(/ing-tag sup'\+\(p\.supplier\?''/.test(RENDER), 'and the supplier from its own');
});

test('`no-cat` rides the ROW, so the meta separator never needs a sibling chain', () => {
  /* The middot before the supplier is CSS. Deciding "is there a category to separate from?" with a
     sibling selector costs specificity, and on F3 a four-class chain out-ranked a desktop column
     rule across a media query and threw a cell into the wrong column. A class on the row is (0,1,0)
     wherever it is read. */
  assert.ok(/ing-card'\+\(p\.category\?''/.test(RENDER),
    'the row carries no-cat when the product has no category');
  assert.ok(!/ing-tag.*\+.*ing-tag/.test(code(fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8'))),
    'and no adjacent-sibling `.ing-tag + .ing-tag` selector survives in the stylesheet');
});

test('the header subtitle counts the library, and answers the filter when one is on', () => {
  // eslint-disable-next-line no-new-func
  const f = new Function('SUPS', `"use strict"; function prodSuppliers(){return SUPS;} ${extractFn(SRC, 'prodHeadSummary')} return prodHeadSummary;`)(['Bidfood', 'PFD']);
  assert.equal(f(412, 412, false), '412 products, 2 suppliers', 'unfiltered: what you HAVE, not what you searched');
  assert.equal(f(412, 12, true), '12 of 412 products',
    'filtered: the count #ingCount used to carry, without losing the library total');
  assert.equal(f(1, 1, false), '1 product, 2 suppliers', 'singular');
  assert.equal(f(0, 0, false), '', 'an empty library says nothing — the empty state is speaking');
});
