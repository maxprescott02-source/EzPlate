/*
 * v134-menu-pills.spec.js — the Menu tab's switcher pills (V4a), driven at desktop.
 *
 * This is the click path's ONLY executable coverage: the unit harness stubs the DOM and
 * binds nothing, so without this spec the whole onclick body could be deleted green
 * (the first cut's comment claimed Playwright coverage that did not exist — review finding).
 *
 * Run: npx playwright test tests/visual/v134-menu-pills.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

function seed() {
  return () => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify([
      { id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENU_W', name: 'Winter' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify([
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
      { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 3 }] }]));
    localStorage.setItem('cafeDB_menu', JSON.stringify([
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI3', name: 'Roast', section: 'Dinner', price: 7, custom: true, menuId: 'MENU_W', plateId: 'PL3' }]));
    localStorage.setItem('cafeDB_lastTab', 'analysis');
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), {});
  await page.goto('/');
  await page.waitForTimeout(1500);
}

test('a pill click switches the menu, mirrors the select, and moves the active state', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.menu-pill')).toHaveCount(2);
  await expect(page.locator('#menuSelect')).not.toBeVisible();               // pills are THE switcher at desktop
  await expect(page.locator('.menu-pill.act')).toHaveAttribute('data-menu', 'MENU_ORIGINAL');
  // Toastie: 2/10 = 20% under target → the good pair; Roast: 3/7 = 42.9% → bad. Both branches
  // of dashPctClass are exercised (the unit fixture's all-over-target menus could not).
  await expect(page.locator('.menu-pill[data-menu="MENU_ORIGINAL"] .mp-pct')).toHaveClass(/good/);
  await expect(page.locator('.menu-pill[data-menu="MENU_W"] .mp-pct')).toHaveClass(/bad/);

  await page.click('.menu-pill[data-menu="MENU_W"]');
  await page.waitForTimeout(300);
  await expect(page.locator('.menu-pill.act')).toHaveAttribute('data-menu', 'MENU_W');
  await expect(page.locator('#aBody .mi-name')).toHaveText(['Roast']);       // the rows really switched
  const sel = await page.evaluate(() => document.getElementById('menuSelect').value);
  expect(sel, 'the hidden select mirrors, so mobile and desktop can never disagree').toBe('MENU_W');
  const stored = await page.evaluate(() => localStorage.getItem('cafeDB_currentMenuId'));
  expect(stored).toBe('MENU_W');
});

test('keyboard: focus survives the switch — the re-render must hand it to the new active pill', async ({ page }) => {
  await boot(page);
  await page.focus('.menu-pill[data-menu="MENU_W"]');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const focused = await page.evaluate(() => ({
    tag: document.activeElement.tagName,
    menu: document.activeElement.getAttribute && document.activeElement.getAttribute('data-menu'),
  }));
  expect(focused.tag, 'focus must NOT fall to <body> — the pills are the only switcher here').toBe('BUTTON');
  expect(focused.menu).toBe('MENU_W');
});

test('the pills row shares the panel left edge, and Delete keeps the right edge', async ({ page }) => {
  await boot(page);
  const L = async (s) => (await page.locator(s).first().boundingBox()).x;
  expect(Math.abs(await L('.menu-pill') - await L('.an-head .btn')),
    'pills sit on the v52 shared left edge (the select used to hold this line)').toBeLessThanOrEqual(1.5);
  const del = await page.locator('#menuDelBtn').boundingBox();
  const row = await page.locator('.menu-picker-row').boundingBox();
  expect(row.x + row.width - (del.x + del.width),
    'Delete stays on the row\'s right edge, not against the most-clicked control').toBeLessThanOrEqual(2);
});
