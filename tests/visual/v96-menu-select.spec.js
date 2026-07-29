/*
 * v96-menu-select.spec.js — the regression list from the "menu selection moves onto the By Menu list"
 * brief, driven in a real browser.
 *
 * v96 merged two controls into one: the picker chip that sat in the headline block is deleted, and the
 * By-menu rows (already buttons since v89) are now the only thing that sets dashScope. "All menus" is
 * a real first row rather than an implicit fallback.
 *
 * What this pins that the unit tests can't: the round trip through a real re-render (does returning to
 * All menus reproduce the all-menus dashboard EXACTLY), reload behaviour, thin-history copy, and the
 * measured 44px touch floor on rows that are now controls.
 *
 * Run: npx playwright test tests/visual/v96-menu-select.spec.js
 */
const { test, expect } = require('@playwright/test');

const MENUS = [
  { id: 'MENU_ORIGINAL', name: 'Original' },
  { id: 'MENU_WINTER', name: 'Winter', season: 'Jun–Aug' }
];
const PLATES = [
  { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] }
];
const DISHES = [
  { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
  { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
  { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
];

// history is a PARAMETER here: the thin-history case is one of the things under test.
function seed(history) {
  return (args) => {
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify(args.MENUS));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify(args.PLATES));
    localStorage.setItem('cafeDB_menu', JSON.stringify(args.DISHES));
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify(args.history));
    localStorage.setItem('cafeDB_dashRange', '3m');
  };
}

const FULL_HISTORY = (() => {
  const day = 86400000, now = Date.now();
  return [{ t: now - 20 * day, v: 42.0 }, { t: now - 10 * day, v: 38.5 }, { t: now - day, v: 36.0 }];
})();

async function boot(page, { width = 380, history = FULL_HISTORY } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  // same-origin /api/* would reach the static dev server and 501 on POST — block it so the insight
  // phrasing takes its offline template path rather than logging an error that masks a real one.
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(seed(history), { MENUS, PLATES, DISHES, history });
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);
}

/* ---- 1. one selection drives every dependent, together ----
   The brief named three regions. Two of them (the comparison block, the trend chart) are all-menus by
   the v89 scope-honesty rule and do NOT follow the selection — per-menu history has only existed since
   v89 and drawing the aggregate under a menu's name would be a figure this app can't stand behind. So
   what is pinned here is what the scope ACTUALLY drives — headline, insights, drill-downs — plus the
   fact that the chart says so in words when narrowed. Descoped with Max, 29 Jul; the menu-aware chart
   remains CLAUDE.md's outstanding item 5, blocked on per-menu points. */
test('one tap moves every scope-following region at once, with no partial update', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.verdict-num')).toHaveText('40.0%');
  const insAll = await page.locator('#dashBody .ins-line').allTextContents();

  await page.locator('.mcmp-row[data-scope="MENU_WINTER"]').click();
  await page.waitForTimeout(300);

  // headline, its target line, and the row marking all moved together
  await expect(page.locator('.verdict-num')).toHaveText('60.0%');
  await expect(page.locator('.verdict-cap')).toHaveText('on Winter');
  await expect(page.locator('.verdict-line')).toContainText('30.0 pts over your 30% target');
  await expect(page.locator('.mcmp-row.act')).toHaveCount(1);
  await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'MENU_WINTER');

  // the chart is honest that it did NOT narrow, rather than silently redrawing as the menu
  await expect(page.locator('.chart-title')).toHaveText('Food cost trend — all menus');
  await expect(page.locator('.scope-note')).toBeVisible();

  // and the insight set is genuinely different, not a stale panel left behind. On this seed the
  // narrowed panel is ABSENT rather than repopulated — one thin-data menu has nothing that clears
  // the v92 value floor, and CLAUDE.md's rule is that a panel with nothing to say does not render.
  // Asserting insAll is non-empty first keeps the comparison from being satisfied by both sides
  // being empty, i.e. by the panel never having rendered at all.
  expect(insAll.length, 'the all-menus panel has something to say on this seed').toBeGreaterThan(0);
  const insWinter = await page.locator('#dashBody .ins-line').allTextContents();
  expect(insWinter.join('|')).not.toEqual(insAll.join('|'));
});

/* ---- 2. returning to All menus reproduces the all-menus dashboard EXACTLY ----
   The strongest available form of "reproduces the current rendering": capture the whole rendered
   dashboard, go away, come back, and require it byte-identical. A partial restore (marking moves but
   a caption or a drill-down keeps the menu's numbers) fails this. */
test('selecting All menus reproduces the all-menus rendering exactly', async ({ page }) => {
  await boot(page);
  const before = await page.locator('#dashBody').innerHTML();

  await page.locator('.mcmp-row[data-scope="MENU_WINTER"]').click();
  await page.waitForTimeout(300);
  await page.locator('.mcmp-row[data-scope="MENU_ORIGINAL"]').click();
  await page.waitForTimeout(300);
  await page.locator('.mcmp-row[data-scope="all"]').click();
  await page.waitForTimeout(300);

  const after = await page.locator('#dashBody').innerHTML();
  expect(after, 'the all-menus dashboard is restored intact').toEqual(before);
});

/* ---- 3. thin history: the existing copy, never a blank or a NaN ---- */
test('a scope with insufficient history shows the not-enough-history copy, not NaN', async ({ page }) => {
  await boot(page, { history: [] });

  await page.locator('.mcmp-row[data-scope="MENU_WINTER"]').click();
  await page.waitForTimeout(300);

  // the headline still computes from live costing — only the HISTORY is missing
  await expect(page.locator('.verdict-num')).toHaveText('60.0%');
  // the comparison cards say so in the existing words
  const subs = await page.locator('#dashBody .stat-line .stat-sub, #dashBody .stat-line').allTextContents();
  expect(subs.join(' ')).toMatch(/not enough history\s*yet/);
  // the chart takes its empty-state card, not a broken plot
  await expect(page.locator('.dash-chart.empty')).toHaveCount(1);
  await expect(page.locator('.chart-hint')).toContainText('at least two logged points');

  const body = await page.locator('#dashBody').innerText();
  expect(body, 'no NaN anywhere on the dashboard').not.toMatch(/NaN/);
  expect(body, 'no undefined leaking into copy').not.toMatch(/undefined/);
});

/* ---- 4. reload behaviour matches what the picker did: session-only, back to All menus ----
   dashScope is a module var that is never written to localStorage. The brief is explicit that the new
   selector INHERITS that behaviour and that persistence is not added in this batch. */
test('the selection does not survive a reload — session-only, exactly as the picker was', async ({ page }) => {
  await boot(page);
  await page.locator('.mcmp-row[data-scope="MENU_WINTER"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('.verdict-cap')).toHaveText('on Winter');

  await page.reload();
  await page.waitForTimeout(1600);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);

  await expect(page.locator('.verdict-cap')).toHaveText('across all menus');
  await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'all');
  // the chart RANGE, which IS persisted, is untouched by the same reload — the two are independent
  await expect(page.locator('.range-btn.act')).toHaveAttribute('data-rg', '3m');
});

/* ---- 5. the rows are controls now, so the 44px floor applies to them ----
   The v94 density pass lowered the DIG-row floor to 32px on the grounds that those are display rows.
   That reasoning is correct and stands; it does not extend here. By-menu rows are buttons that set the
   dashboard's scope, so they are held to the app's touch-target floor — measured, at phone width. */
test('every By-menu row, including All menus, clears the 44px touch floor @ 380px', async ({ page }) => {
  await boot(page);
  const rows = await page.locator('.mcmp-row').all();
  expect(rows.length, 'All menus + two costed menus').toBe(3);
  for (const r of rows) {
    const id = await r.getAttribute('data-scope');
    const box = await r.boundingBox();
    expect(box.height, `row ${id} is at least 44px tall`).toBeGreaterThanOrEqual(44);
  }
  // the dig rows keep their v94/v95 32px pin — this batch does not read the row change as a licence
  await page.locator('#dashBody .dig-card').first().click();
  await page.waitForTimeout(300);
  const digs = await page.locator('#dashBody .dig-row').all();
  for (const d of digs) {
    const box = await d.boundingBox();
    expect(box.height, 'dig rows stay display rows at 32px').toBeGreaterThanOrEqual(32);
  }
});
