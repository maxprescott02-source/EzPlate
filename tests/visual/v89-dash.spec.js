/*
 * v89-dash.spec.js — browser regression cover for the v89 Dashboard rework.
 *
 * Drives the real app in Chromium with seeded local data (all off-origin requests blocked, so
 * Supabase never overwrites the seed). Deliberately asserts BEHAVIOUR — rendered text, scope
 * switching, grid placement, overflow — and pins no screenshot baselines, so unlike the v72-era
 * shots in fresh-states.spec.js it can't go stale from an unrelated visual tweak. The shots it
 * writes to __shots__/ are review artefacts, not assertions.
 *
 * Run: npx playwright test tests/visual/v89-dash.spec.js
 */
const { test, expect } = require('@playwright/test');

// Two menus, three costed+priced dishes: Original at 20%/40% (avg 30), Winter at 60%.
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original' },
    { id: 'MENU_WINTER', name: 'Winter', season: 'Jun–Aug' }
  ]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  const plates = [
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
    { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4 }] },
    { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] }
  ];
  localStorage.setItem('cafeDB_plates', JSON.stringify(plates));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
  ]));
  // two aggregate history points so the trend line draws (NULL menu_id = all menus)
  const day = 86400000, now = Date.now();
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 20 * day, v: 42.0 }, { t: now - 10 * day, v: 38.5 }, { t: now - day, v: 36.0 }
  ]));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

async function boot(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1600);
  if (theme) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(() => {
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);
}

for (const [label, width] of [['mobile', 380], ['desktop', 1280]]) {
  for (const theme of ['light', 'dark']) {
    test(`v89 dashboard @ ${label} ${theme}`, async ({ page }) => {
      // net::ERR_FAILED is THIS SPEC blocking off-origin (supabase-js, the webfont) on purpose —
      // filtered out so it can't mask a real one. Uncaught exceptions are collected separately.
      const errs = [], crashes = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => crashes.push(String(e)));
      await boot(page, width, theme);

      // the verdict header shows the ALL-MENUS figure: mean of 20/40/60 = 40.0%
      await expect(page.locator('.verdict-num')).toHaveText('40.0%');
      await expect(page.locator('.verdict-cap')).toHaveText('across all menus');
      await expect(page.locator('.verdict-line')).toContainText('10.0 pts over your 30% target');

      // the selector exists, defaults to All menus, and is the Menu tab's control
      await expect(page.locator('#dashScopeSelect')).toHaveValue('all');
      await expect(page.locator('.dash-scope')).toHaveClass(/menu-picker-row/);

      // the By-menu list is ranked best-first
      const names = await page.locator('.mcmp-name').allTextContents();
      const pcts = await page.locator('.mcmp-pct').allTextContents();
      expect(names).toEqual(['Original', 'Winter']);
      expect(pcts).toEqual(['30.0%', '60.0%']);

      await page.screenshot({ path: `tests/visual/__shots__/v89-dash-all-${label}-${theme}.png`, fullPage: true });

      // switching scope via the selector drives the header
      await page.selectOption('#dashScopeSelect', 'MENU_WINTER');
      await page.waitForTimeout(300);
      await expect(page.locator('.verdict-num')).toHaveText('60.0%');
      await expect(page.locator('.verdict-cap')).toHaveText('on Winter');
      await expect(page.locator('.chart-title')).toHaveText('Food cost trend — all menus');
      await expect(page.locator('.scope-note')).toBeVisible();
      await page.screenshot({ path: `tests/visual/__shots__/v89-dash-winter-${label}-${theme}.png`, fullPage: true });

      // tapping a By-menu row drives the header too, and the selector follows it
      await page.locator('.mcmp-row[data-scope="MENU_ORIGINAL"]').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.verdict-num')).toHaveText('30.0%');
      await expect(page.locator('#dashScopeSelect')).toHaveValue('MENU_ORIGINAL');

      // the Menu tab's own selection is UNTOUCHED by dashboard scoping
      const cur = await page.evaluate(() => window.currentMenuId);
      expect(cur).toBe('MENU_ORIGINAL');

      // desktop: adding a third panel must not push the highlight cards out of the top row
      if (width >= 1024) {
        const tops = await page.evaluate(() => ({
          panel: document.querySelector('#dashBody .dash-panel').getBoundingClientRect().top,
          hl: document.querySelector('#dashBody .hl-row').getBoundingClientRect().top
        }));
        expect(Math.abs(tops.hl - tops.panel), 'highlight cards stay beside the chart, not below it')
          .toBeLessThanOrEqual(24);
      }

      // nothing overflows horizontally
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);

      expect(crashes, 'no uncaught exceptions').toEqual([]);
      expect(errs.filter(e => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'no console errors').toEqual([]);
    });
  }
}

test('every chart range still renders with the selector present @ 380px', async ({ page }) => {
  await boot(page, 380, 'light');
  for (const rg of ['1w', '1m', '3m', '6m', '1y', 'all']) {
    await page.locator(`.range-btn[data-rg="${rg}"]`).click();
    await page.waitForTimeout(200);
    await expect(page.locator('.dash-chart')).toBeVisible();
    await expect(page.locator('#dashScopeSelect')).toBeVisible();
    const of = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(of, `range ${rg} overflows`).toBeLessThanOrEqual(0);
  }
});

test('the selector is hidden when only one menu exists', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.addInitScript(SEED);
  await page.addInitScript(() => {
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
  });
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#dashScopeSelect')).toHaveCount(0);
  await expect(page.locator('.dash-compare')).toHaveCount(0);
  await expect(page.locator('.verdict-num')).toBeVisible();
});

/* ===== Priorities the flow-tester could not run against Max's real café data =====
   Safe here: Playwright uses a throwaway browser profile and every off-origin request is aborted, so
   Supabase is never contacted and nothing real is touched. */

// Boot with an arbitrary menus/dishes seed rather than the shared SEED above.
async function bootWith(page, menus, dishes, plates) {
  await page.setViewportSize({ width: 380, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.addInitScript(([m, d, p]) => {
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify(m));
    localStorage.setItem('cafeDB_menu', JSON.stringify(d));
    localStorage.setItem('cafeDB_plates', JSON.stringify(p));
    localStorage.setItem('cafeDB_cogsPct', '30');
  }, [menus, dishes, plates]);
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
}

const PLATES3 = [
  { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
  { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4 }] },
  { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] }
];

test('deleting the OTHER menu while scoped leaves no trapped scope', async ({ page }) => {
  await boot(page, 380, 'light');
  // scope the dashboard to Winter, then delete Original from the Menu tab
  await page.selectOption('#dashScopeSelect', 'MENU_WINTER');
  await page.waitForTimeout(250);
  await expect(page.locator('.verdict-cap')).toHaveText('on Winter');

  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  await page.selectOption('#menuSelect', 'MENU_ORIGINAL');
  await page.waitForTimeout(200);
  await page.locator('#menuDelBtn').click();
  await page.waitForTimeout(300);
  await page.locator('#confirmOk').click();
  await page.waitForTimeout(400);

  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  // one menu left -> the selector is gone, so the scope must have collapsed to all-menus with it
  await expect(page.locator('#dashScopeSelect')).toHaveCount(0);
  await expect(page.locator('.verdict-cap')).toHaveText('across all menus');
  await expect(page.locator('.dash-compare')).toHaveCount(0);
  // and the figure is the surviving menu's own, not a stale cached one
  await expect(page.locator('.verdict-num')).toHaveText('60.0%');
});

test('deleting the menu the dashboard is scoped TO recovers cleanly', async ({ page }) => {
  await boot(page, 380, 'light');
  await page.selectOption('#dashScopeSelect', 'MENU_WINTER');
  await page.waitForTimeout(250);

  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  await page.selectOption('#menuSelect', 'MENU_WINTER');
  await page.waitForTimeout(200);
  await page.locator('#menuDelBtn').click();
  await page.waitForTimeout(300);
  await page.locator('#confirmOk').click();
  await page.waitForTimeout(400);

  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.verdict-cap')).toHaveText('across all menus');
  await expect(page.locator('.verdict-num')).toHaveText('30.0%', { timeout: 3000 });   // only Original's dishes remain
  await expect(page.locator('#dashScopeSelect')).toHaveCount(0);
});

test('zero menus is a legitimate state, not a broken dashboard', async ({ page }) => {
  await bootWith(page, [], [], PLATES3);
  await expect(page.locator('#dashScopeSelect')).toHaveCount(0);
  await expect(page.locator('.dash-compare')).toHaveCount(0);
  await expect(page.locator('.verdict-num')).toHaveText('—');
  await expect(page.locator('.verdict-line')).toContainText('Nothing costed and priced yet');
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(of, 'no overflow with nothing to show').toBeLessThanOrEqual(0);
});

test('a menu whose plates have no sell price shows the empty verdict, not 0%', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }],
    [{ id: 'MI1', name: 'Toastie', section: 'Lunch', price: 0, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' }],
    PLATES3);
  await expect(page.locator('.verdict-num')).toHaveText('—');
  await expect(page.locator('.verdict-line')).toContainText('Nothing costed and priced yet');
});

test('a menu with prices but no costed plates shows the empty verdict, not 0%', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }],
    [{ id: 'MI1', name: 'Ghost', section: 'Lunch', price: 12, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'NOPE' }],
    PLATES3);
  await expect(page.locator('.verdict-num')).toHaveText('—');
});

test('an uncosted menu is excluded from By-menu rather than ranked at 0%', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENU_WINTER', name: 'Winter' }],
    [
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI2', name: 'Roast', section: 'Dinner', price: 0, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
    ],
    PLATES3);
  // two menus -> the selector shows; only one is costed -> no comparison list at all
  await expect(page.locator('#dashScopeSelect')).toHaveCount(1);
  await expect(page.locator('.dash-compare')).toHaveCount(0);
  // and scoping to the uncosted menu is honest about it
  await page.selectOption('#dashScopeSelect', 'MENU_WINTER');
  await page.waitForTimeout(250);
  await expect(page.locator('.verdict-num')).toHaveText('—');
  await expect(page.locator('.verdict-line')).toContainText('on this menu yet');
});
