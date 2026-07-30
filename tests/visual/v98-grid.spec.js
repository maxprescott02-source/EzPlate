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
    // 30, 60, 8.5 (single-digit width — the alignment pin needs a narrow figure), 45, 38, ... % at $10
    var costs = [3, 6, 0.85, 4.5, 3.8, 5.2, 4.1, 3.5];
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
    // per-menu history for the first two menus, so their rows draw sparklines (>=2 points each)
    // — the selection-additive pin needs sparked rows to select
    localStorage.setItem('cafeDB_menuHistory', JSON.stringify({
      M1: [{ t: now - 10*day, v: 31.0 }, { t: now - day, v: 30.0 }],
      M2: [{ t: now - 10*day, v: 58.0 }, { t: now - day, v: 60.0 }]
    }));
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
  // v98 revision: the selector card is CONTENT-SIZED, capped at the chart card's floor — it may
  // end above the panel's bottom (short list) but never below it (the cap; long lists scroll).
  expect(geo.cmp.bottom, 'the selector card never outgrows the chart card').toBeLessThanOrEqual(geo.panel.bottom + 2);
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

// ---- the sparse floor: 2 menus. v98 revision (Max's call on seeing the void): the selector
// card SIZES TO ITS CONTENT — it ends where its rows end, and the space below it is page
// background, not card interior asserting content that doesn't exist ----
test('sparse state: 2 menus — the selector card ends at its content @ 1280', async ({ page }) => {
  await boot(page, 1280, 2, 'light');
  const geo = await gridGeo(page);
  expectGridContract(geo);
  expect(geo.cmp.bottom, 'a three-row list does not stretch to the chart card\'s floor')
    .toBeLessThan(geo.panel.bottom - 8);
  const scroll = await page.evaluate(() => {
    const pad = document.querySelector('#dashBody .dash-compare .pad');
    return { sh: pad.scrollHeight, ch: pad.clientHeight };
  });
  expect(scroll.sh, 'nothing scrolls when everything fits').toBeLessThanOrEqual(scroll.ch + 1);
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
  // content-sized BUT capped: a long list fills the row exactly and scrolls, never stretches it
  expect(Math.abs(geo.cmp.bottom - geo.panel.bottom), 'a long list hits the cap at the chart card\'s floor')
    .toBeLessThanOrEqual(2);
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

// ---- v98 revision: SELECTION IS ADDITIVE — a selected row keeps its sparkline. Diagnosed on
// Max's report of a selected row "losing" its spark: no code path ties sparks to selection (the
// marking is font-weight alone); what he saw is the v89 honesty rule — a menu with <2 points of
// its OWN history draws no spark, selected or not, and on production data only All menus
// qualifies today. This pin makes the additive property permanent: with per-menu history seeded,
// selecting a sparked row must not remove its spark (or anyone else's). ----
test('selecting a row keeps every sparkline, including its own @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const sparksBefore = await page.locator('.mcmp-row .mcmp-spark').count();
  expect(sparksBefore, 'the seed puts sparks on All menus + M1 + M2').toBeGreaterThanOrEqual(3);
  await expect(page.locator('.mcmp-row[data-scope="M2"] .mcmp-spark')).toHaveCount(1);
  await page.locator('.mcmp-row[data-scope="M2"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('.mcmp-row[data-scope="M2"].act .mcmp-spark'),
    'the now-selected row still draws its spark').toHaveCount(1);
  expect(await page.locator('.mcmp-row .mcmp-spark').count(),
    'no other row lost one either').toBe(sparksBefore);
});

// ---- v98 revision: the figure column is a shared axis. Percentages sit in a fixed-width,
// right-aligned column, so figures AND the sparklines beside them align across every row —
// including All menus, and including a narrow "8.5%" beside a wide "30.0%". ----
test('percentages and sparklines share axes across all rows @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const cols = await page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    return {
      pctL: [...document.querySelectorAll('.mcmp-pct')].map(e => r(e).left),
      pctR: [...document.querySelectorAll('.mcmp-pct')].map(e => r(e).right),
      sparkR: [...document.querySelectorAll('.mcmp-spark')].map(e => r(e).right)
    };
  });
  const spread = a => Math.max(...a) - Math.min(...a);
  expect(cols.pctL.length, 'seven rows render a figure').toBe(7);
  expect(spread(cols.pctL), 'figure column left edges align').toBeLessThanOrEqual(1);
  expect(spread(cols.pctR), 'figure column right edges align').toBeLessThanOrEqual(1);
  expect(spread(cols.sparkR), 'sparklines align against the figure column').toBeLessThanOrEqual(1);
});

// ---- v98 revision: ONE elevation, two modes. Every dashboard card draws the same --elev token
// — cast shadow in light; none in dark, where the surface-lightness step carries depth. Pinned
// by computed style so a per-card override or a murky dark shadow cannot creep back. ----
test('one elevation token: cards share it in light, and it is none in dark @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const light = await page.evaluate(() => ({
    panel: getComputedStyle(document.querySelector('#dashBody .dash-panel')).boxShadow,
    cmp: getComputedStyle(document.querySelector('#dashBody .dash-compare')).boxShadow,
    ins: getComputedStyle(document.querySelector('#dashBody .dash-ins')).boxShadow,
    dig: getComputedStyle(document.querySelector('#dashBody .dig-card')).boxShadow
  }));
  expect(light.panel, 'light mode casts a real shadow').not.toBe('none');
  expect(new Set(Object.values(light)).size, 'every card shares ONE shadow value in light').toBe(1);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  // the dark half sweeps the same four card types as the light half (CodeRabbit)
  const dark = await page.evaluate(() => ({
    panel: getComputedStyle(document.querySelector('#dashBody .dash-panel')).boxShadow,
    cmp: getComputedStyle(document.querySelector('#dashBody .dash-compare')).boxShadow,
    ins: getComputedStyle(document.querySelector('#dashBody .dash-ins')).boxShadow,
    dig: getComputedStyle(document.querySelector('#dashBody .dig-card')).boxShadow
  }));
  expect(dark.panel, 'dark mode draws no cast shadow — the surface step is the depth').toBe('none');
  expect(dark.cmp, 'selector included').toBe('none');
  expect(dark.ins, 'insights included').toBe('none');
  expect(dark.dig, 'dig tiles included').toBe('none');
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
