/*
 * v135-plates.spec.js — the Plates library's v3 column band (V4b, spec §3.3).
 *
 * Also pins the DEFERRED behavior: a row click opens the action chooser, NOT the builder.
 * The queue's "row click opens the builder" bullet is V5-coupled — doing it now would orphan
 * Publish/Print/Delete, which live in the chooser until V5's builder page owns publishing.
 * V5 changes this test consciously, or it has not done its job.
 *
 * Run: npx playwright test tests/visual/v135-plates.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

function seed(withPlates) {
  return (a) => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify(a.withPlates ? [
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
      { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3.6 }] }] : []));
    localStorage.setItem('cafeDB_menu', JSON.stringify(a.withPlates ? [
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 12, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' }] : []));
    localStorage.setItem('cafeDB_lastTab', 'builder');
    localStorage.setItem('__spec_seeded', '1');
  };
}

test('the column band renders above the rows at desktop, labels the three columns, and is not a hairline peer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), { withPlates: true });
  await page.goto('/');
  await page.waitForTimeout(1500);
  const band = page.locator('#plateList > .ing-colhead');
  await expect(band).toBeVisible();
  await expect(band).toHaveText('PlatePublishedPlate cost');
  // the band must not be an .ing-card — the `+` combinator carries the row hairlines (§26 trap)
  const firstRowBorder = await page.evaluate(() =>
    getComputedStyle(document.querySelector('#plateList > .ing-card')).borderTopWidth);
  expect(firstRowBorder, 'the first row draws no top hairline — the band has its own bottom border').toBe('0px');
  // published-when-live reads in the accent
  const pubOn = await page.evaluate(() =>
    getComputedStyle(document.querySelector('#plateList .ing-tag.pub-on')).color);
  expect(pubOn, 'On <menu> is the accent (v3 §3.3)').toBe('rgb(184, 78, 12)');
});

test('a row click opens the ACTION CHOOSER — the builder handoff is V5\'s, not this batch\'s', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), { withPlates: true });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.click('#plateList .ing-card >> nth=0');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateActionsModal')).toBeVisible();
  await expect(page.locator('#paPublish')).toHaveText('Add to a menu');
  await expect(page.locator('#builderModal')).not.toBeVisible();
});

test('no band on the empty states — a column header over nothing labels nothing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), { withPlates: false });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await expect(page.locator('#plateList .empty-state')).toBeVisible();
  await expect(page.locator('#plateList > .ing-colhead')).toHaveCount(0);
});
