/*
 * v98-grid.spec.js — the desktop dashboard grid, asserted at the CONTENT LEVELS the brief names.
 *
 * The v95 bento was tuned against the sparsest data the app will ever hold and gapped as content
 * grew; this spec seeds the LOADED state first (6 menus), then checks the sparse floor (2 menus)
 * and the full ceiling (12 menus) — the two ends where a grid tuned to "today" breaks.
 *
 * REWRITTEN v120 (Q2 dashboard redesign), re-pointed v129: the chips were reversed (Max, 9 Aug
 * 2026) for ONE dropdown button in the verdict card, opening the ranked list. Geometry pins whose
 * subject is gone are retired, NOT because they were failing.
 *
 * What was worth keeping was kept, re-pointed at the new markup:
 *   - the grid holds at 2 / 6 / 12 menus with no horizontal overflow (the whole point of the spec),
 *   - a list too long for its space scrolls INSIDE its own layer and never pushes the page
 *     (was the selector card; is now the disclosure popover — same failure it was protecting from),
 *   - scope change moves nothing above it,
 *   - selection is ADDITIVE: a selected row keeps its sparkline,
 *   - the figure column is a shared axis,
 *   - one elevation token, two modes,
 *   - the sparkle's light/dark gradients,
 *   - an empty Dig-in tile reads quieter than a populated one.
 *
 * Geometry contract (one desktop composition, every width >=1024) — v121, after Max called the
 * v120 two-full-width-cards cut janky from a production screenshot:
 *   row 1  .dash-panel (1/8: verdict + scope dropdown + since + chart, ONE surface) | .dash-moved (8/13,
 *          top-aligned, ends at its content — the column the By-menu selector card used to earn)
 *   row 2  .dash-ins  — full width
 *   row 3  .dash-dig  — full width, four tiles (.dash-row2 dissolves at this width)
 *
 * Run: npx playwright test tests/visual/v98-grid.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

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
    var now = Date.now(), DAY = 86400000, hist = [], mh = {};
    for (var d = 20; d >= 0; d--) hist.push({ t: now - d*DAY, v: 30 + (d % 5) });
    mh['M1'] = hist.slice(-6); mh['M2'] = hist.slice(-4);
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify(hist));
    localStorage.setItem('cafeDB_menuHistory', JSON.stringify(mh));
  })();
`;

async function boot(page, width, menus, theme) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
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

/* v129: open the dropdown when it isn't already; picking a scope closes it. */
async function openScope(page) {
  const closed = page.locator('#dashScopeBtn[aria-expanded="false"]');
  if (await closed.count()) { await closed.click(); await page.waitForTimeout(300); }
}

async function gridGeo(page) {
  return page.evaluate(() => {
    const r = (sel) => { const el = document.querySelector(sel); return el ? el.getBoundingClientRect() : null; };
    return {
      panel: r('#dashBody .dash-panel'), chartSvg: r('#trendWrap svg'),
      ins: r('#dashBody .dash-ins'),
      moved: r('#dashBody .dash-moved'), dig: r('#dashBody .dash-dig')
    };
  });
}

function expectGridContract(geo) {
  for (const k of ['panel', 'chartSvg', 'ins', 'moved', 'dig']) {
    expect(geo[k], `${k} renders (non-vacuous placement check)`).not.toBeNull();
  }
  // row 1: What moved is the right-hand card, top-aligned with the top card, ending at its content
  expect(geo.moved.left, 'What moved is the right-hand card').toBeGreaterThanOrEqual(geo.panel.right - 1);
  expect(Math.abs(geo.moved.top - geo.panel.top), 'row-1 cards top-aligned').toBeLessThanOrEqual(2);
  expect(geo.moved.bottom, 'What moved ends at its content, never below the top card')
    .toBeLessThanOrEqual(geo.panel.bottom + 2);
  // the chart FILLS the top card rather than swimming in a full-width one — this is the exact
  // jank Max reported on v120: a 540px-capped chart centred in a 1000px card, a ~460px gap.
  // Tolerance 200, not 90: above ~1352px viewport .wrap's max-width caps the panel at 622px while
  // the chart caps at 540px, leaving a fixed 82px of chrome — a 90px tolerance passed that by only
  // 8px, close enough for a one-token padding change to flip it (v121 review). 200 still fails the
  // real regression by hundreds of pixels while never tripping on spacing drift.
  expect(geo.chartSvg.width, 'the chart fills most of its card')
    .toBeGreaterThanOrEqual((geo.panel.width - 200));
  // full-width rows below, edge-pinned (a width check could pass offset)
  expect(geo.ins.top, 'insights are a full-width row below row 1').toBeGreaterThanOrEqual(geo.panel.bottom - 1);
  expect(geo.ins.left, 'insights start at the top card edge').toBeLessThanOrEqual(geo.panel.left + 1);
  expect(geo.ins.right, 'insights span through the What-moved edge').toBeGreaterThanOrEqual(geo.moved.right - 1);
  expect(geo.dig.top, 'Dig in below the insights row').toBeGreaterThanOrEqual(geo.ins.bottom - 1);
  expect(geo.dig.left, 'Dig in full width — left').toBeLessThanOrEqual(geo.panel.left + 1);
  expect(geo.dig.right, 'Dig in full width — right').toBeGreaterThanOrEqual(geo.moved.right - 1);
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

// ---- the sparse floor: 2 menus. v129: one dropdown button whatever the count — the chips' ≤5/6+
// collapse rule died with the chips. Closed, the list is not in the DOM at all. ----
test('sparse state: 2 menus — one dropdown button, list closed until opened @ 1280', async ({ page }) => {
  await boot(page, 1280, 2, 'light');
  expectGridContract(await gridGeo(page));
  await expect(page.locator('.dash-scope-btn'), 'one scope control').toHaveCount(1);
  await expect(page.locator('.dash-menus-pop'), 'closed means absent, not hidden').toHaveCount(0);
  await openScope(page);
  await expect(page.locator('.dash-menus-pop .mcmp-row'), 'All menus + both menus').toHaveCount(3);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: 'tests/visual/__shots__/v98-grid-2menus-1280-light.png', fullPage: true });
});

// ---- the full ceiling: 12 menus. The ranked list opens in a layer that SCROLLS INTERNALLY
// rather than pushing the page — the same failure the old selector card's internal scroll was
// protecting against, at the same content level. ----
test('full state: 12 menus — the list scrolls inside its own layer @ 1280', async ({ page }) => {
  await boot(page, 1280, 12, 'light');
  expectGridContract(await gridGeo(page));
  await expect(page.locator('.dash-scope-btn'), 'still one button at twelve menus').toHaveCount(1);

  const pageHeightBefore = await page.evaluate(() => document.documentElement.scrollHeight);
  await openScope(page);
  const pop = await page.evaluate(() => {
    const el = document.querySelector('.dash-menus-pop');
    return el ? { sh: el.scrollHeight, ch: el.clientHeight } : null;
  });
  expect(pop, 'the dropdown opens').not.toBeNull();
  expect(pop.sh, 'a thirteen-row list overflows its layer and scrolls internally').toBeGreaterThan(pop.ch + 2);
  expect(await page.evaluate(() => document.documentElement.scrollHeight),
    'and the page is NOT pushed taller by it').toBeLessThanOrEqual(pageHeightBefore + 1);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: 'tests/visual/__shots__/v98-grid-12menus-1280-light.png', fullPage: true });
});

// ---- nothing above the dropdown moves on scope change. Rows below are deliberately NOT pinned:
// the insight SET is scope-dependent by design (v90), so scoping can legitimately unrender the
// panel and close its row up — pinning them asserts app behaviour, not grid. ----
test('scope change moves zero verdict/chart geometry @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const before = await gridGeo(page);   // captured with the dropdown closed; picking closes it again
  await openScope(page);
  await page.locator('.mcmp-row[data-scope="M2"]').click();
  await page.waitForTimeout(300);
  // v115: M2 has >=2 per-menu points, so the chart draws the MENU'S OWN line — the scope-note (the
  // "still covers all menus" correction) is correctly ABSENT, and the caption says so instead.
  await expect(page.locator('.scope-note')).toHaveCount(0);
  await expect(page.locator('.chart-hint')).toContainText('This menu');
  const after = await gridGeo(page);
  /* v121: the card under test is the single top panel. The chart svg is inside it, so pinning the
     panel pins the chart; the svg's own rect is not compared because scoping to a menu with its
     own history legitimately redraws the line (same geometry, new path). */
  expect(Math.abs(after.panel.top - before.panel.top), 'panel.top unmoved by scope').toBeLessThanOrEqual(1);
  expect(Math.abs(after.panel.bottom - before.panel.bottom), 'panel.bottom unmoved by scope').toBeLessThanOrEqual(1);
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

// ---- v98 revision, carried to the disclosure list: SELECTION IS ADDITIVE — a selected row keeps
// its sparkline. Diagnosed on Max's report of a selected row "losing" its spark: no code path ties
// sparks to selection (the marking is font-weight alone); what he saw is the v89 honesty rule — a
// menu with <2 points of its OWN history draws no spark, selected or not. This pin makes the
// additive property permanent, and also pins that the redesign did not quietly drop sparklines. ----
test('selecting a row keeps every sparkline, including its own @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  await openScope(page);
  const sparksBefore = await page.locator('.dash-menus-pop .mcmp-spark').count();
  // the seed gives per-menu history to M1 and M2, and priceHistory feeds the All-menus row
  expect(sparksBefore, 'the seed puts sparks in the list').toBeGreaterThanOrEqual(1);
  await expect(page.locator('.dash-menus-pop .mcmp-row[data-scope="M1"] .mcmp-spark')).toHaveCount(1);
  await page.locator('.dash-menus-pop .mcmp-row[data-scope="M1"]').click();
  await page.waitForTimeout(300);
  // v129: picking CLOSES the dropdown; re-open to read the marked row — selection stays additive
  await openScope(page);
  await expect(page.locator('.dash-menus-pop .mcmp-row[data-scope="M1"].act .mcmp-spark'),
    'the now-selected row still draws its spark').toHaveCount(1);
  expect(await page.locator('.dash-menus-pop .mcmp-spark').count(),
    'no other row lost one either').toBe(sparksBefore);
});

// ---- v98 revision: the figure column is a shared axis. Percentages sit in a fixed-width,
// right-aligned column, so figures AND the sparklines beside them align across every row —
// including a narrow "8.5%" beside a wide "30.0%". v129: the whole selectable set lives in the
// dropdown list now, All menus included. ----
test('percentages and sparklines share axes across the ranked list @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  await openScope(page);
  const cols = await page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const q = (s) => [...document.querySelectorAll('.dash-menus-pop ' + s)];
    return {
      pctL: q('.mcmp-pct').map(e => r(e).left),
      pctR: q('.mcmp-pct').map(e => r(e).right),
      sparkR: q('.mcmp-spark').map(e => r(e).right)
    };
  });
  const spread = a => Math.max(...a) - Math.min(...a);
  expect(cols.pctL.length, 'All menus + six menus each render a figure').toBe(7);
  expect(spread(cols.pctL), 'figure column left edges align').toBeLessThanOrEqual(1);
  expect(spread(cols.pctR), 'figure column right edges align').toBeLessThanOrEqual(1);
  if (cols.sparkR.length > 1) {
    expect(spread(cols.sparkR), 'sparklines align against the figure column').toBeLessThanOrEqual(1);
  }
});

// ---- v98 revision: ONE elevation, two modes. Every dashboard card draws the same --elev token
// — cast shadow in light; none in dark, where the surface-lightness step carries depth. Pinned
// by computed style so a per-card override or a murky dark shadow cannot creep back.
// v120: .dash-compare is no longer a standing card; .dash-moved is the new one, and both halves
// sweep the same card types so the dark check cannot go vacuous. ----
test('one elevation token: cards share it in light, and it is none in dark @ 1280', async ({ page }) => {
  const read = () => ({
    panel: getComputedStyle(document.querySelector('#dashBody .dash-panel')).boxShadow,
    moved: getComputedStyle(document.querySelector('#dashBody .dash-moved')).boxShadow,
    ins: getComputedStyle(document.querySelector('#dashBody .dash-ins')).boxShadow,
    dig: getComputedStyle(document.querySelector('#dashBody .dig-card')).boxShadow
  });
  await boot(page, 1280, 6, 'light');
  const light = await page.evaluate(read);
  expect(light.panel, 'light mode casts a real shadow').not.toBe('none');
  expect(new Set(Object.values(light)).size, 'every card shares ONE shadow value in light').toBe(1);
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await page.evaluate(read);
  expect(dark.panel, 'dark mode draws no cast shadow — the surface step is the depth').toBe('none');
  expect(dark.moved, 'What moved included').toBe('none');
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
