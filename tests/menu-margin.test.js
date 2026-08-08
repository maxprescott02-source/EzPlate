/*
 * menu-margin.test.js — v82 item 3. Live margin preview in the Add-to-menu dialog.
 *
 * The dialog demanded a sell price while showing NO resulting cost %, margin or light until the dish
 * was committed and the Menu tab opened — the user priced blind. menuMarginPreview REUSES analyze()
 * (the exact cost/target/light logic the Menu table uses), so the preview and the resulting Menu row
 * can never disagree. This locks that reuse: the preview's light ALWAYS equals analyze()'s light, and
 * the food-cost % is cost/price*100.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`menu-margin: function not found -> ${name}. app.js changed; update tests/menu-margin.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`menu-margin: unbalanced braces for ${name}`);
}
function withCogs(cogs) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('COGS', `
    "use strict";
    var cogsPct = COGS;
    ${extractFn(SRC, 'foodTarget')}
    ${extractFn(SRC, 'analyze')}
    ${extractFn(SRC, 'menuMarginPreview')}
    return { analyze: analyze, menuMarginPreview: menuMarginPreview };
  `);
  return factory(cogs);
}

test("the brief's example: cost 0.15 at $5.00 with a 30% target → 3% food cost, green", () => {
  const { menuMarginPreview } = withCogs(30);
  const mp = menuMarginPreview(0.15, 5);
  assert.equal(mp.pct, 3, 'food cost % = cost/price*100');
  assert.equal(mp.light, 'green', 'well under the suggested price → healthy');
  assert.ok(Math.abs(mp.suggested - 0.5) < 1e-9, 'suggested = cost / target = 0.15/0.30');
});

test('the preview light ALWAYS equals the Menu row (analyze) light — same logic, no reimplementation', () => {
  const { analyze, menuMarginPreview } = withCogs(35);
  const cases = [[3, 20], [3, 9], [3, 7], [1.2, 3], [5, 5], [0.5, 100], [4, 4.2]];
  cases.forEach(([cost, price]) => {
    assert.equal(menuMarginPreview(cost, price).light, analyze(cost, price).light,
      `light must match analyze() for cost ${cost} @ $${price}`);
  });
});

test('amber vs red boundary follows analyze (≤15% under = amber, more = red)', () => {
  const { menuMarginPreview } = withCogs(30);        // suggested = cost/0.30
  // cost 3 → suggested 10. price 9 is 10% under → amber; price 7 is 30% under → red.
  assert.equal(menuMarginPreview(3, 9).light, 'amber');
  assert.equal(menuMarginPreview(3, 7).light, 'red');
  assert.equal(menuMarginPreview(3, 10).light, 'green', 'at the suggested price → green');
});

test('no price entered yet: pct is null but the cost-based suggestion is still available', () => {
  const { menuMarginPreview } = withCogs(30);
  const mp = menuMarginPreview(2, 0);
  assert.equal(mp.pct, null, 'nothing to show as a food-cost % without a price');
  assert.ok(Math.abs(mp.suggested - (2 / 0.3)) < 1e-9, 'suggested price is shown even before a price is typed');
  assert.equal(mp.price, null);
});

test('an uncosted plate (cost 0) yields no light and no pct', () => {
  const { menuMarginPreview } = withCogs(30);
  const mp = menuMarginPreview(0, 5);
  assert.equal(mp.pct, null);
  assert.equal(mp.light, 'none');
});

/* ---- Q3 (v122): the Menu row's Margin cell (vbadge) composes food-cost % + shortfall ---------
   Same maths as menuMarginPreview (cost/price*100), same light as analyze() — the three surfaces
   can never disagree. The dollar figure is what the price is short of SUGGESTED, in cents under
   a dollar ("+90c") and dollars from there ("+$2.60"). */
function withVbadge(cogs) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('COGS', `
    "use strict";
    var cogsPct = COGS;
    ${extractFn(SRC, 'foodTarget')}
    ${extractFn(SRC, 'analyze')}
    ${extractFn(SRC, 'vbadge')}
    return { analyze: analyze, vbadge: vbadge };
  `);
  return factory(cogs);
}

test('Margin cell, healthy: food-cost % to one decimal + tick, green', () => {
  const { analyze, vbadge } = withVbadge(40);
  const out = vbadge(analyze(2.31, 8.5));                       // the design's own example row
  assert.equal(out, '<span class="vbadge vgood">27.2% ✓</span>');
});

test('Margin cell, under by less than a dollar: shortfall reads in cents', () => {
  const { analyze, vbadge } = withVbadge(40);
  const out = vbadge(analyze(6.96, 16.5));                      // suggested 17.40 → 90c short, amber
  assert.equal(out, '<span class="vbadge vwarn">42.2% · +90c</span>');
});

test('Margin cell, under by a dollar or more: shortfall reads in dollars', () => {
  const { analyze, vbadge } = withVbadge(40);
  // suggested 21.05 → $2.55 short = 12% below suggested → AMBER (the light is analyze()'s
  // price-shortfall rule, not the food-cost %; the mock painted this row red and the app's law wins)
  const out = vbadge(analyze(8.42, 18.5));
  assert.equal(out, '<span class="vbadge vwarn">45.5% · +$2.55</span>');
});

test('Margin cell, more than 15% below suggested: red', () => {
  const { analyze, vbadge } = withVbadge(40);
  const out = vbadge(analyze(8.42, 15));                        // suggested 21.05 → $6.05 short, 29% below
  assert.equal(out, '<span class="vbadge vbad">56.1% · +$6.05</span>');
});

test('Margin cell light ALWAYS equals analyze() — colour anchored to the target, not direction', () => {
  const { analyze, vbadge } = withVbadge(35);
  [[3, 20], [3, 9], [3, 7], [1.2, 3], [5, 5], [0.5, 100], [4, 4.2]].forEach(([cost, price]) => {
    const a = analyze(cost, price);
    const cls = a.light === 'green' ? 'vgood' : a.light === 'red' ? 'vbad' : 'vwarn';
    assert.ok(vbadge(a).indexOf(cls) >= 0, `class follows analyze light for cost ${cost} @ $${price}`);
  });
});

test('Margin cell with no menu price: an em-dash, no figure fabricated', () => {
  const { analyze, vbadge } = withVbadge(30);
  assert.equal(vbadge(analyze(2, null)), '<span class="muted-dash">—</span>');
  assert.equal(vbadge(analyze(2, 0)), '<span class="muted-dash">—</span>');
});

test('Margin cell under by a rounding hair (<0.5c): the % stands alone, never "+0c"', () => {
  const { vbadge } = withVbadge(30);
  // hand-built analysis: under, but the gap rounds to 0 cents
  const out = vbadge({ state: 'under', light: 'amber', cost: 3, menuPrice: 10, suggested: 10.004 });
  assert.equal(out, '<span class="vbadge vwarn">30.0%</span>');
});
