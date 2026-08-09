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

/* ---- Q3 (v122), reworked 9 Aug 2026: the Food-cost cell states % vs target ONLY --------------
   The dollar shortfall it used to append ("+90c") read as a price-rise instruction and was
   dropped on Max's call (v3 spec §8 agrees: no dollar deltas in menu verdict cells). The word
   after the % now carries the amber/red discrimination — "over" vs "well over" — because hue was
   otherwise the only difference. The LIGHT always equals analyze()'s — the one place the
   green/amber/red rule lives — so the publish preview, the chips and the row can never disagree.
   (The preview rounds its % to a whole number and this cell shows one decimal: same cost/price
   ratio, different display precision, deliberately untested against each other.)
   The aria-label is pinned too: on phones the thead is display:none, so it is the cell's only
   announced meaning — same wording as the visible cell. */
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
  assert.equal(out, '<span class="vbadge vgood" aria-label="food cost 27.2% — at or under your target">27.2% ✓</span>');
});

test('Margin cell, amber: the % plus the word "over" — no dollar figure', () => {
  const { analyze, vbadge } = withVbadge(40);
  const out = vbadge(analyze(6.96, 16.5));                      // price 5% below suggested → amber
  assert.equal(out, '<span class="vbadge vwarn" aria-label="food cost 42.2% — over your target">42.2% · over</span>');
});

test('Margin cell, amber even with a dollars-scale shortfall: still just "over"', () => {
  const { analyze, vbadge } = withVbadge(40);
  // suggested 21.05, price 18.5 = 12% below → AMBER (the light is analyze()'s price-shortfall
  // rule, not the food-cost %; the mock painted this row red and the app's law wins)
  const out = vbadge(analyze(8.42, 18.5));
  assert.equal(out, '<span class="vbadge vwarn" aria-label="food cost 45.5% — over your target">45.5% · over</span>');
});

test('Margin cell, more than 15% below suggested: red, and the word escalates to "well over"', () => {
  const { analyze, vbadge } = withVbadge(40);
  const out = vbadge(analyze(8.42, 15));                        // price 29% below suggested → red
  // the visible phrase holds together with an nbsp (narrow cells wrap at the ·, never mid-phrase);
  // the aria-label uses a plain space — screen readers need no wrap control
  assert.equal(out, '<span class="vbadge vbad" aria-label="food cost 56.1% — well over your target">56.1% · well over</span>');
});

test('no dollar delta ever renders in the cell — the shortfall really is gone (v3 §8)', () => {
  const { analyze, vbadge } = withVbadge(40);
  // a sweep across greens, ambers and reds at cent and dollar shortfall scales
  [[2.31, 8.5], [6.96, 16.5], [8.42, 18.5], [8.42, 15], [3, 4], [0.5, 1]].forEach(([cost, price]) => {
    const out = vbadge(analyze(cost, price));
    assert.ok(!/\+\$?\d/.test(out) && !/\d+c\b/.test(out) && !out.includes('suggested'),
      `no shortfall figure or suggested-price wording for cost ${cost} @ $${price}: ${out}`);
  });
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

test('Margin cell under by a rounding hair: still an honest "over", never a fabricated figure', () => {
  const { vbadge } = withVbadge(30);
  // hand-built analysis: under by a whisker — the wording no longer depends on the gap's size
  const out = vbadge({ state: 'under', light: 'amber', cost: 3, menuPrice: 10, suggested: 10.004 });
  assert.equal(out, '<span class="vbadge vwarn" aria-label="food cost 30.0% — over your target">30.0% · over</span>');
});

/* ---- Q3 review findings: pins the first cut lacked ------------------------------------------ */

test('uncosted row: 5 tds, "· not costed yet" on the name, an honest dash — never "cost it →"', () => {
  // the row tap opens the price/category editor, which has no route to the builder (v55) — an
  // arrow inviting "cost it" would promise navigation that does not exist
  const menu = (() => {
    const sig = 'function renderAnalysis(';
    const i = SRC.indexOf(sig); const start = SRC.indexOf('{', i);
    let d = 0;
    for (let n = start; n < SRC.length; n++) { if (SRC[n] === '{') d++; else if (SRC[n] === '}' && --d === 0) return SRC.slice(i, n + 1); }
  })();
  const row = menu.match(/<tr class="muted mi-row lt-none"[^]*?<\/tr>/);
  assert.ok(row, 'the uncosted row branch exists');
  assert.ok(row[0].includes('mi-uncosted'), 'the name carries the not-costed note');
  assert.ok(row[0].includes('not costed yet'), 'in those words');
  assert.equal((row[0].match(/<td/g) || []).length, 5, 'same 5-td shape as aRow — the mobile grid depends on it');
  assert.ok(/muted-dash/.test(row[0].split('<td').pop()), 'the verdict cell is a muted dash');
  assert.ok(!row[0].includes('cost it'), 'no "cost it" call to action in the emitted row (a code comment may still explain why)');
});

test('Menu tab headers: Plate / Cost / Suggested / Menu price / Food cost — never "Margin"', () => {
  // "Margin" over a food-cost % misreads badly (27.2% food cost is a 72.8% margin); the honest
  // header matches the Dashboard's own word for the same figure
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const thead = html.match(/<thead><tr><th>Plate<\/th>[^]*?<\/thead>/);
  assert.ok(thead, 'the Menu tab thead is findable by its first column');
  assert.ok(thead[0].includes('<th>Cost</th>'), 'Cost column');
  assert.ok(thead[0].includes('<th>Menu price</th>'), 'Menu price column');
  assert.ok(thead[0].includes('<th>Food cost</th>'), 'the verdict column is named for the number it shows');
  assert.ok(!thead[0].includes('Margin'), 'not called Margin');
  assert.ok(!thead[0].includes('Variance'), 'the old Variance header is gone');
});
