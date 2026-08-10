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
 * ⚠ REWRITTEN BY F6 (v143). The 12-track desktop grid this file was named for is DELETED — the v3
 * screen is a document stack in ONE order at every width, with a single two-up (What moved | Dig
 * in) at >=768. Asserting the old row map would assert that the fold-in had not happened.
 * The file KEEPS ITS NAME and its reason for existing, which was never the grid: it is the only
 * spec that seeds the dashboard at three CONTENT LEVELS — 2, 6 and 12 menus — and the failures it
 * was written to catch are all content-level failures that a single-seed spec cannot see. Every one
 * of them survives the rebuild verbatim:
 *   - the layout holds at 2 / 6 / 12 menus with no horizontal overflow,
 *   - a list too long for its space scrolls INSIDE its own layer and never pushes the page,
 *   - scope change moves nothing above it,
 *   - selection is ADDITIVE: a selected row keeps its sparkline,
 *   - the figure column is a shared axis,
 *   - the sparkle's light/dark gradients,
 *   - an empty Dig-in row reads quieter than a populated one.
 *
 * Geometry contract (ONE composition, every width):
 *   .dash-top  →  .dash-trend  →  .dash-ins  →  .dash-row2 (.dash-moved | .dash-dig)
 * stacked in that reading order, each spanning the column; the two-up splits at >=768 only.
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
      body: r('#dashBody'), top: r('#dashBody .dash-top'), chartSvg: r('#trendWrap svg'),
      trend: r('#dashBody .dash-trend'), ins: r('#dashBody .dash-ins'),
      moved: r('#dashBody .dash-moved'), dig: r('#dashBody .dash-dig')
    };
  });
}

function expectGridContract(geo) {
  for (const k of ['body', 'top', 'chartSvg', 'trend', 'ins', 'moved', 'dig']) {
    expect(geo[k], `${k} renders (non-vacuous placement check)`).not.toBeNull();
  }
  // the §6.1 reading order, top to bottom — one composition, no width-dependent reordering left
  expect(geo.trend.top, 'the trend reads under the verdict').toBeGreaterThanOrEqual(geo.top.bottom - 1);
  expect(geo.ins.top, 'insights read under the trend').toBeGreaterThanOrEqual(geo.trend.bottom - 1);
  expect(geo.moved.top, 'What moved reads under the insights').toBeGreaterThanOrEqual(geo.ins.bottom - 1);
  // the two-up: Dig in beside What moved, top-aligned, each ending at its own content
  expect(geo.dig.left, 'Dig in is the right-hand half').toBeGreaterThanOrEqual(geo.moved.right - 1);
  expect(Math.abs(geo.dig.top - geo.moved.top), 'the two-up is top-aligned').toBeLessThanOrEqual(2);
  /* The chart FILLS the column. This is the v120 jank Max reported — a 540px-capped chart centred
     in a ~1000px card — and F6's fix is at the source: the viewBox is sized in rendered pixels, so
     there is no cap left to swim inside. Tolerance 2, not the old 200: the chart is now exactly the
     column, and a generous tolerance here would hide the very regression the pin exists for. */
  expect(geo.chartSvg.width, 'the chart fills the column').toBeGreaterThanOrEqual(geo.body.width - 2);
  // every region shares the column's edges (edge pins, not width comparisons — a width check
  // could pass while offset)
  for (const [k, label] of [['top', 'the verdict zone'], ['trend', 'the trend'], ['ins', 'insights']]) {
    expect(geo[k].left, `${label} starts at the column edge`).toBeLessThanOrEqual(geo.body.left + 1);
    expect(geo[k].right, `${label} spans the column`).toBeGreaterThanOrEqual(geo.body.right - 1);
  }
  expect(geo.moved.left, 'the two-up starts at the column edge').toBeLessThanOrEqual(geo.body.left + 1);
  expect(geo.dig.right, 'and ends at it').toBeGreaterThanOrEqual(geo.body.right - 1);
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
  /* v143: the single top card is gone, so the two regions it contained are pinned directly. The
     chart svg's own rect is still not compared — scoping to a menu with its own history
     legitimately redraws the line (same geometry, new path). */
  expect(Math.abs(after.top.top - before.top.top), 'the verdict zone is unmoved by scope').toBeLessThanOrEqual(1);
  expect(Math.abs(after.top.bottom - before.top.bottom), 'and does not change height').toBeLessThanOrEqual(1);
  expect(Math.abs(after.trend.top - before.trend.top), 'the trend is unmoved by scope').toBeLessThanOrEqual(1);
});

// ---- v98: an empty Dig-in tile is QUIETER than a populated one — same card, quieter content.
// This seed writes no per-product price points, so "Biggest movers" renders its empty state. ----
test('an empty Dig-in tile reads quieter than a populated one @ 1280', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const empty = page.locator('#dashBody .dig-card.is-empty').first();
  await expect(empty, 'the movers tile is empty under this seed').toHaveCount(1);
  await expect(empty.locator('.dig-n')).toHaveText('Nothing yet');
  /* v143: the property that carries "quieter" CHANGED, and this is the pin catching it rather
     than a class left doing nothing. In the old tile the subject was bold `--text` and the empty
     one dropped to muted 400. In the mock's row grammar the subject is muted for EVERY row, so a
     weight comparison would now read 400 against 400 and could never fail. The row recedes through
     its LABEL and its figure instead, which is what is measured. */
  const tone = await page.evaluate(() => ({
    emptyLabel: getComputedStyle(document.querySelector('#dashBody .dig-card.is-empty .dig-k')).color,
    fullLabel: getComputedStyle(document.querySelector('#dashBody .dig-card:not(.is-empty) .dig-k')).color,
    emptyValue: getComputedStyle(document.querySelector('#dashBody .dig-card.is-empty .dig-v')).color,
    fullValue: getComputedStyle(document.querySelector('#dashBody .dig-card:not(.is-empty) .dig-v')).color
  }));
  expect(tone.emptyLabel, 'an empty row\'s label is quieter than a populated one\'s').not.toBe(tone.fullLabel);
  expect(tone.emptyValue, 'and so is its figure').not.toBe(tone.fullValue);
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

// ---- v98 revision, re-pinned v132: ONE elevation. v3 §1.3 kills card shadows outright —
// shadows exist only on floating layers (dropdown, modal, toast) — so every dashboard card
// must draw NO cast shadow, and all four must agree. Pinned by computed style so a per-card
// shadow cannot creep back. (The two-mode light/dark split died with dark mode, v132.) ----
test('one elevation token: every card is flat — v3 draws no card shadows @ 1280', async ({ page }) => {
  // v143: `.dash-panel` is gone with the card; the four surfaces are the trend, the two-up pair
  // and the insights section. The rule is unchanged and so is what would break it.
  const read = () => ({
    trend: getComputedStyle(document.querySelector('#dashBody .dash-trend')).boxShadow,
    moved: getComputedStyle(document.querySelector('#dashBody .dash-moved')).boxShadow,
    ins: getComputedStyle(document.querySelector('#dashBody .dash-ins')).boxShadow,
    dig: getComputedStyle(document.querySelector('#dashBody .dash-dig')).boxShadow
  });
  await boot(page, 1280, 6, 'light');
  const got = await page.evaluate(read);
  // all four agree AND match the resolved token — so deleting box-shadow:var(--elev) from one
  // card, or retiring the token, still fails here when --elev later becomes a real shadow
  // (plain `'none'` × 4 could never fail again — review finding on the first rewrite)
  const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--elev').trim());
  expect(token, 'the one elevation token is none in v3').toBe('none');
  expect(new Set(Object.values(got)).size, 'every card shares the ONE token value').toBe(1);
  expect(got.trend, 'v3: sections sit flat on their border').toBe('none');
});

// ---- v98, re-pinned v132: the sparkle keeps Gemini's hues (it marks AI provenance, beside
// the earned credit) and always draws the deeper-luminance variant — the stock stops washed
// out at 16px. Computed fill, not source: what matters is which gradient actually wins.
// (The dark half of this pin died with dark mode, v132.) ----
/* v136: dark returned, so this pins the PAIR rather than the light half. The deepened stops
   exist because the light page is pale; on the dark canvas they are the ones that vanish.
   Asserting both directions is what makes this fail if a future batch collapses the pair back
   to one gradient — asserting light alone passed happily through all of v132-v135, when the
   dark selector had in fact been deleted. */
test('the sparkle pairs its gradient to the theme: deep on light, stock on dark', async ({ page }) => {
  await boot(page, 1280, 6, 'light');
  const light = await page.evaluate(() => getComputedStyle(document.querySelector('.ins-spark path')).fill);
  expect(light, 'the deepened stops win on the pale page').toContain('ezSparkGradDeep');

  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  const dark = await page.evaluate(() => getComputedStyle(document.querySelector('.ins-spark path')).fill);
  // NB 'ezSparkGradDeep' also contains 'ezSparkGrad', so a toContain here would pass against
  // the very code this is meant to catch. Match the id terminated by its closing paren.
  expect(dark, 'dark takes the stock brighter stops').toMatch(/ezSparkGrad["')]/);
  expect(dark, 'and specifically NOT the deep variant, which disappears on a dark canvas').not.toContain('Deep');
});
