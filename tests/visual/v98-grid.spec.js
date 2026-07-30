/*
 * v98-grid.spec.js — the desktop dashboard grid, asserted at the CONTENT LEVELS the brief names.
 *
 * The v95 bento was tuned against the sparsest data the app will ever hold and gapped as content
 * grew; this spec seeds the LOADED state first (6 menus), then checks the sparse floor (2 menus)
 * and the full ceiling (8 menus) — the two ends where a grid tuned to "today" breaks.
 *
 * Geometry contract (one desktop composition, every width ≥1024):
 *   row 1  chart card | selector card — top-aligned, floors matched, the CHART sets the height;
 *          past what fits, the selector list scrolls INSIDE the card. The ranking is WORST-first
 *          (flipped with this grid on Max's yes — dash-scope.test.js pins it), so overflow hides
 *          the healthiest menus: the right thing to lose.
 *   row 2  insights, full width.  row 3  Dig in, full width.
 *
 * Run: npx playwright test tests/visual/v98-grid.spec.js
 */
const { test, expect } = require('@playwright/test');

// n menus, each with one costed+priced dish (menu 1 gets two on-target dishes so the insight
// engine earns its panel — the placement checks must not pass vacuously on an absent region).
const seedFor = (n) => `
  localStorage.clear();
  (function(){
    var costs = [3, 6, 3.2, 4.5, 3.8, 5.2, 4.1, 3.5];  // 30,60,32,45,38,52,41,35 % at $10
    var menus = [], plates = [], dishes = [];
    for (var i = 0; i < ${n}; i++){
      menus.push({ id: 'M' + (i+1), name: 'Menu ' + (i+1) });
      plates.push({ id: 'PL' + (i+1), name: 'Plate ' + (i+1), category: 'Lunch',
        lines: [{ misc: true, name: 'x', cost: costs[i % costs.length] }] });
      dishes.push({ id: 'MI' + (i+1), name: 'Plate ' + (i+1), section: 'Lunch', price: 10,
        custom: true, menuId: 'M' + (i+1), plateId: 'PL' + (i+1) });
    }
    plates.push({ id: 'PL0', name: 'Plate 0', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] });
    dishes.push({ id: 'MI0', name: 'Plate 0', section: 'Lunch', price: 10, custom: true, menuId: 'M1', plateId: 'PL0' });
    localStorage.setItem('cafeDB_menus', JSON.stringify(menus));
    localStorage.setItem('cafeDB_plates', JSON.stringify(plates));
    localStorage.setItem('cafeDB_menu', JSON.stringify(dishes));
    localStorage.setItem('cafeDB_cogsPct', '30');
    var day = 86400000, now = Date.now();
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
      { t: now - 20*day, v: 42.0 }, { t: now - 10*day, v: 38.5 }, { t: now - day, v: 36.0 }
    ]));
    localStorage.setItem('cafeDB_dashRange', '3m');
  })();
`;

async function boot(page, width, menus, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.route('**/api/**', r => r.abort());   // offline template path, like v89/v90-dash
  await page.addInitScript(seedFor(menus));
  await page.goto('/');
  await page.waitForTimeout(1600);
  if (theme) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(() => {
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);
}

async function gridGeo(page) {
  return page.evaluate(() => {
    const r = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
    return {
      panel: r('#dashBody .dash-panel'), cmp: r('#dashBody .dash-compare'),
      ins: r('#dashBody .dash-ins'), dig: r('#dashBody .dash-dig')
    };
  });
}

function expectGridContract(geo) {
  expect(geo.cmp, 'the selector card renders').not.toBeNull();
  expect(geo.ins, 'the insights panel renders (non-vacuous placement check)').not.toBeNull();
  expect(Math.abs(geo.cmp.top - geo.panel.top), 'row-1 cards top-aligned').toBeLessThanOrEqual(2);
  expect(geo.cmp.left, 'the selector is the right-hand card').toBeGreaterThanOrEqual(geo.panel.right - 1);
  expect(Math.abs(geo.cmp.bottom - geo.panel.bottom), 'row-1 floors match — the chart card sets the height').toBeLessThanOrEqual(2);
  expect(geo.ins.top, 'insights: full-width row below row 1').toBeGreaterThanOrEqual(geo.panel.bottom - 1);
  // edge pins, not a width comparison (CodeRabbit on the v89 twin of this check): width could pass offset
  expect(geo.ins.left, 'insights start at the chart card edge').toBeLessThanOrEqual(geo.panel.left + 1);
  expect(geo.ins.right, 'insights span through the selector card edge').toBeGreaterThanOrEqual(geo.cmp.right - 1);
  expect(geo.dig.top, 'Dig in below the insights row').toBeGreaterThanOrEqual(geo.ins.bottom - 1);
}

async function noHorizontalOverflow(page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);
}

// ---- the LOADED state first (the brief's rule: design against 6 menus / 3 insights, not
// today's near-empty production data), judged at both target widths, both themes ----
for (const width of [1280, 1600]) {
  for (const theme of ['light', 'dark']) {
    test(`loaded state: 6 menus hold the grid @ ${width} ${theme}`, async ({ page }) => {
      await boot(page, width, 6, theme);
      expectGridContract(await gridGeo(page));
      await noHorizontalOverflow(page);
      await page.screenshot({ path: `tests/visual/__shots__/v98-grid-6menus-${width}-${theme}.png`, fullPage: true });
    });
  }
}

// ---- the sparse floor: 2 menus. The selector card keeps row-1 height (quiet space below the
// rows is the DECIDED trade — it self-corrects as menus are added; a content-sized card would
// hand row 1 a ragged floor against the full-width row beneath) ----
test('sparse state: 2 menus do not collapse the grid @ 1280', async ({ page }) => {
  await boot(page, 1280, 2, 'light');
  expectGridContract(await gridGeo(page));
  await noHorizontalOverflow(page);
  await page.screenshot({ path: 'tests/visual/__shots__/v98-grid-2menus-1280-light.png', fullPage: true });
});

// ---- the full ceiling: a list taller than the chart card scrolls INSIDE the selector card;
// the page is not pushed. 12 menus, not 8: at 1280 the chart card holds nine rows outright
// (measured — 8 menus fit with room to spare), so 8 would pass without exercising the scroll. ----
test('full state: 12 menus scroll inside the selector card @ 1280', async ({ page }) => {
  await boot(page, 1280, 12, 'light');
  const geo = await gridGeo(page);
  expectGridContract(geo);
  const scroll = await page.evaluate(() => {
    const pad = document.querySelector('#dashBody .dash-compare .pad');
    return { sh: pad.scrollHeight, ch: pad.clientHeight };
  });
  expect(scroll.sh, 'the list overflows its card and scrolls internally').toBeGreaterThan(scroll.ch + 2);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: 'tests/visual/__shots__/v98-grid-12menus-1280-light.png', fullPage: true });
});

// ---- nothing jumps in ROW 1 on scope change (kept from v95): the scope caption's line is
// RESERVED at the chart card's floor, so narrowing the scope cannot move either row-1 card.
// Rows 2–3 are deliberately NOT pinned here: the insight SET is scope-dependent by design
// (v90), so scoping can legitimately unrender the panel and close its row up (the :has()
// fallback) — this run's own failure taught that pinning them asserts app behaviour, not grid. ----
test('scope change moves zero row-1 geometry @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const before = await gridGeo(page);
  await page.locator('.mcmp-row[data-scope="M2"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('.scope-note')).toBeVisible();
  const after = await gridGeo(page);
  for (const k of ['panel', 'cmp']) {
    expect(Math.abs(after[k].top - before[k].top), `${k}.top unmoved by scope`).toBeLessThanOrEqual(1);
    expect(Math.abs(after[k].bottom - before[k].bottom), `${k}.bottom unmoved by scope`).toBeLessThanOrEqual(1);
  }
});

// ---- v98: an empty Dig-in tile is QUIETER than a populated one — same card, quieter content.
// This seed writes no per-product price points, so "Biggest movers" renders its empty state. ----
test('an empty Dig-in tile reads quieter than a populated one @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const empty = page.locator('#dashBody .dig-card.is-empty').first();
  await expect(empty, 'the movers tile is empty under this seed').toHaveCount(1);
  await expect(empty.locator('.dig-n')).toHaveText('Nothing yet');
  const weights = await page.evaluate(() => ({
    empty: getComputedStyle(document.querySelector('#dashBody .dig-card.is-empty .dig-n')).fontWeight,
    full: getComputedStyle(document.querySelector('#dashBody .dig-card:not(.is-empty) .dig-n')).fontWeight
  }));
  expect(Number(weights.empty), 'empty name is not bold').toBeLessThan(Number(weights.full));
});

// ---- v98: the sparkle keeps Gemini's hues (it marks AI provenance, beside the earned credit)
// but LIGHT mode draws the deeper-luminance variant — the stock stops washed out on cream.
// Computed fill, not source: what matters is which gradient actually wins in each theme. ----
test('the sparkle draws the deep gradient in light mode and the stock one in dark', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const lightFill = await page.evaluate(() => getComputedStyle(document.querySelector('.ins-spark path')).fill);
  expect(lightFill, 'light mode uses the deepened stops').toContain('ezSparkGradDeep');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const darkFill = await page.evaluate(() => getComputedStyle(document.querySelector('.ins-spark path')).fill);
  expect(darkFill, 'dark mode keeps the stock Gemini stops').toContain('ezSparkGrad');
  expect(darkFill, 'dark mode does NOT deepen').not.toContain('ezSparkGradDeep');
});
