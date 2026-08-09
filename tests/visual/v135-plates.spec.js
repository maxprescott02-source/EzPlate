/*
 * v135-plates.spec.js — the Plates library's v3 column band (V4b, spec §3.3).
 *
 * Also pins the DEFERRED behavior: a row click opens the action chooser, NOT the builder.
 * The queue's "row click opens the builder" bullet is V5-coupled — doing it now would orphan
 * Publish/Print/Delete, which live in the chooser until V5's builder page owns publishing.
 * V5 changes this test consciously, or it has not done its job. (The deferral is also
 * recorded on V5's queue item.)
 *
 * Run: npx playwright test tests/visual/v135-plates.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

function seed() {
  return (a) => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify(a.withPlates ? [
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, label: 'x', cost: 3 }] },
      { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, label: 'x', cost: 3.6 }] },
      { id: 'PL3', name: 'Soup', category: 'Dinner', lines: [] }] : []));   // an UNCOSTED plate rides along — its wide "not costed yet" caption is what drifted the columns
    localStorage.setItem('cafeDB_menu', JSON.stringify(a.withPlates ? [
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 12, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' }] : []));
    localStorage.setItem('cafeDB_lastTab', 'builder');
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page, withPlates) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), { withPlates });
  await page.goto('/');
  await page.waitForTimeout(1500);
}

test('the band renders above the rows and its columns genuinely align with EVERY row, uncosted included', async ({ page }) => {
  await boot(page, true);
  const band = page.locator('#plateList > .ing-colhead');
  await expect(band).toBeVisible();
  await expect(band).toHaveText('PlatePublishedPlate cost');
  // the band and rows are separate grid containers — a max-content third track resolved
  // per-container and drifted the middle column by up to 22px (the v135 review measured it);
  // both templates are fixed now, and this asserts the alignment the band exists to provide
  const geo = await page.evaluate(() => ({
    bandPub: document.querySelector('#plateList > .ing-colhead > span:nth-child(2)').getBoundingClientRect().left,
    rowMetas: [...document.querySelectorAll('#plateList > .ing-card .ing-meta')].map(e => e.getBoundingClientRect().left),
    cards: document.querySelectorAll('#plateList > .ing-card').length,
    secondRowTop: getComputedStyle(document.querySelectorAll('#plateList > .ing-card')[1]).borderTopWidth,
    bandTop: getComputedStyle(document.querySelector('#plateList > .ing-colhead')).borderTopWidth,
  }));
  expect(geo.cards, 'exactly the three seeded plates render as cards — the band is NOT one of them').toBe(3);
  expect(geo.rowMetas.length).toBe(3);
  for (const left of geo.rowMetas) {
    expect(Math.abs(left - geo.bandPub), 'the Published header sits on the same left edge as every row value').toBeLessThanOrEqual(1.5);
  }
  // the hairline law: rows separate from EACH OTHER (second row has the + combinator border);
  // the band contributes no top border of its own
  expect(geo.secondRowTop, 'row-to-row hairline survives').toBe('1px');
  expect(geo.bandTop).toBe('0px');
  // published-when-live is the accent — v55's shipped colour, confirmed (not changed) by §3.3
  const pubOn = await page.evaluate(() =>
    getComputedStyle(document.querySelector('#plateList .ing-tag.pub-on')).color);
  expect(pubOn).toBe('rgb(184, 78, 12)');
});

test('a row click opens the ACTION CHOOSER — the builder handoff is V5\'s, not this batch\'s', async ({ page }) => {
  await boot(page, true);
  await page.click('#plateList .ing-card >> nth=0');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateActionsModal')).toBeVisible();
  await expect(page.locator('#builderModal')).not.toBeVisible();
});

test('no band on either empty state — true-empty and filtered-empty both label nothing', async ({ page }) => {
  await boot(page, true);
  // filtered-empty: the branch that sits immediately above the colhead line in the source
  await page.fill('#plateSearch', 'zzz-no-such-plate');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateList .empty-state')).toBeVisible();
  await expect(page.locator('#plateList > .ing-colhead')).toHaveCount(0);
  await page.click('#plateList .es-clear');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateList > .ing-colhead')).toHaveCount(1);
});

test('true-empty: the getting-started state, no band', async ({ page }) => {
  await boot(page, false);
  await expect(page.locator('#plateList .empty-state')).toBeVisible();
  await expect(page.locator('#plateList > .ing-colhead')).toHaveCount(0);
});
