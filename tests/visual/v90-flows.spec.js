/*
 * v90-flows.spec.js — end-to-end flow cover for the v90 batch.
 *
 * Written because the flow-tester subagent could not be made to drive a browser (it spent its run
 * delegating rather than testing), so this covers the same ground the brief asked it to: that the
 * Menu tab still WORKS after its suggestions UI was deleted, that the Dashboard's new surfaces
 * survive real navigation rather than a single render, and that the console stays clean throughout.
 *
 * Safe against Max's real data by construction: Playwright uses a throwaway profile, every
 * off-origin request is aborted so Supabase is never contacted, and nothing here writes or deletes.
 * That is the same reasoning v89 used when its subagent correctly refused to touch real café data.
 *
 * Run: npx playwright test tests/visual/v90-flows.spec.js
 */
const { test, expect } = require('@playwright/test');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original' },
    { id: 'MENU_WINTER', name: 'Winter', season: 'Jun–Aug' }
  ]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
    { id: 'PL2', name: 'Breakky Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4.4 }] },
    { id: 'PL3', name: 'Roast of the day', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] },
    { id: 'PL4', name: 'Soup', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3.1 }] }
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Breakky Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI4', name: 'Soup', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL4' },
    { id: 'MI3', name: 'Roast of the day', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
  ]));
  const day = 86400000, now = Date.now();
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 20 * day, v: 42.0 }, { t: now - 10 * day, v: 38.5 }, { t: now - day, v: 36.0 }
  ]));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

function watch(page) {
  const errs = [], crashes = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => crashes.push(String(e)));
  return { errs, crashes };
}
const clean = (errs) => errs.filter(e => !/favicon|manifest|net::ERR_FAILED/i.test(e));

async function boot(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1600);
  // both are fixed-position overlays that intercept clicks in this harness: the sync banner is
  // permanently "Offline" because Supabase is blocked on purpose, and the install banner is chrome.
  await page.evaluate(() => {
    ['.install-banner', '#syncBanner', '.sync-banner'].forEach(sel => {
      const el = document.querySelector(sel); if (el) el.remove();
    });
  });
}

test('the Menu tab still WORKS with its suggestions UI removed', async ({ page }) => {
  const w = watch(page);
  await boot(page, 380);
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(400);

  // counts are RELATIVE, not absolute: the app ships a base demo menu on top of the seed, so the
  // absolute row count is not something this spec should pin.
  const rows = () => page.locator('#aBody tr.mi-row').count();
  const all = await rows();
  expect(all, 'the menu table renders').toBeGreaterThan(0);

  // search still filters, and clearing restores
  await page.locator('#menuSearch').fill('toast');
  await page.waitForTimeout(300);
  const searched = await rows();
  expect(searched, 'search narrows the table').toBeLessThan(all);
  expect(searched, 'and still matches something').toBeGreaterThan(0);
  await page.locator('#menuSearchClear').click();
  await page.waitForTimeout(300);
  expect(await rows(), 'clearing search restores every row').toBe(all);

  // the margin-light chips still filter and fold into Clear filters
  await page.locator('.mlf-chip[data-light="red"]').click();
  await page.waitForTimeout(300);
  expect(await rows(), 'the red chip narrows the table').toBeLessThan(all);
  await page.locator('#menuClearFilters').click();
  await page.waitForTimeout(300);
  expect(await rows(), 'Clear filters restores every row').toBe(all);

  // switching menus still repaints the table
  await page.selectOption('#menuSelect', 'MENU_WINTER');
  await page.waitForTimeout(400);
  expect(await rows(), 'the Winter menu shows its own, smaller set').toBeLessThan(all);

  // the actions row has not been left with a hole where the pill was
  const gap = await page.evaluate(() => {
    const row = document.querySelector('#tab-analysis .an-head');
    const kids = [...row.children].filter(el => el.offsetParent !== null);
    return { count: kids.length, empties: kids.filter(el => !el.textContent.trim() && !el.querySelector('svg')).length };
  });
  expect(gap.empties, 'no empty leftover element in the actions row').toBe(0);
  expect(gap.count).toBeGreaterThan(0);

  expect(w.crashes, 'no uncaught exceptions on the Menu tab').toEqual([]);
  expect(clean(w.errs), 'no console errors on the Menu tab').toEqual([]);
});

test('navigating between every tab leaves the console clean and the Dashboard intact', async ({ page }) => {
  const w = watch(page);
  await boot(page, 380);
  for (const tab of ['dashboard', 'analysis', 'ingredients', 'pantry', 'builder', 'dashboard']) {
    await page.locator(`.navbtn[data-tab="${tab}"]`).click();
    await page.waitForTimeout(350);
  }
  await expect(page.locator('#dashBody .dash-ins')).toHaveCount(1);
  await expect(page.locator('#dashBody .dig-card')).toHaveCount(4);
  expect(w.crashes).toEqual([]);
  expect(clean(w.errs)).toEqual([]);
});

test('a drill-down survives leaving and returning to the Dashboard', async ({ page }) => {
  const w = watch(page);
  await boot(page, 380);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await page.locator('#dashBody .dig-card').first().click();
  await expect(page.locator('#digBack')).toBeVisible();

  // leave mid-drill-down and come back — must not be stuck in a broken half-state
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  const stuck = await page.locator('#digBack').count();
  const grid = await page.locator('#dashBody .dig-card').count();
  expect(stuck + (grid > 0 ? 0 : 1), 'either the grid or a working detail view is showing').toBeGreaterThan(0);
  if (stuck) { await page.locator('#digBack').click(); }
  await expect(page.locator('#dashBody .dig-card')).toHaveCount(4);
  expect(w.crashes).toEqual([]);
  expect(clean(w.errs)).toEqual([]);
});

test('changing the AI suggestions toggle adds and removes the insights panel', async ({ page }) => {
  const w = watch(page);
  await boot(page, 1280);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#dashBody .dash-ins')).toHaveCount(1);

  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(300);
  // the switch is a visually-hidden <input> behind a decorative .switch-track — correct a11y, and it
  // means the LABEL is the real tap target. Click what a thumb would click.
  await page.locator('label.switch:has(#setAiSuggestChk)').click();
  await expect(page.locator('#setAiSuggestChk')).not.toBeChecked();
  await page.waitForTimeout(300);
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#dashBody .dash-ins'), 'suggestions off → no insights panel').toHaveCount(0);
  // the rest of the Dashboard is untouched by the toggle
  await expect(page.locator('#dashBody .dig-card')).toHaveCount(4);
  await expect(page.locator('#dashBody .dash-panel')).toHaveCount(1);

  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(300);
  await page.locator('label.switch:has(#setAiSuggestChk)').click();
  await expect(page.locator('#setAiSuggestChk')).toBeChecked();
  await page.waitForTimeout(300);
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#dashBody .dash-ins'), 'suggestions back on → the panel returns').toHaveCount(1);

  expect(w.crashes).toEqual([]);
  expect(clean(w.errs)).toEqual([]);
});

test('every chart range still renders with the new panels present', async ({ page }) => {
  const w = watch(page);
  await boot(page, 380);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  for (const rg of ['1w', '1m', '3m', '6m', '1y', 'all']) {
    await page.locator(`.range-btn[data-rg="${rg}"]`).click();
    await page.waitForTimeout(250);
    await expect(page.locator('#dashBody .dash-ins'), `insights survive the ${rg} range`).toHaveCount(1);
    await expect(page.locator('#dashBody .dig-card'), `Dig in survives the ${rg} range`).toHaveCount(4);
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `no horizontal overflow at ${rg}`).toBeLessThanOrEqual(0);
  }
  expect(w.crashes).toEqual([]);
  expect(clean(w.errs)).toEqual([]);
});

test('touch targets on the new controls clear the 44px floor', async ({ page }) => {
  await boot(page, 380);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  const cards = await page.locator('#dashBody .dig-card').evaluateAll(
    els => els.map(e => e.getBoundingClientRect().height));
  cards.forEach((h, i) => expect(h, `dig-card ${i} is at least 44px tall`).toBeGreaterThanOrEqual(44));
  await page.locator('#dashBody .dig-card').first().click();
  const back = await page.locator('#digBack').evaluate(e => e.getBoundingClientRect());
  expect(back.height, 'back arrow clears the 44px floor').toBeGreaterThanOrEqual(44);
  expect(back.width, 'back arrow clears the 44px floor').toBeGreaterThanOrEqual(44);
  // v94 (density brief): dig rows are DISPLAY rows, not controls — no handler, nothing to tap —
  // so the 44px touch floor doesn't apply to them and the approved mockup draws them slim.
  // 32px is a readability floor, not a touch one. The card and the back arrow above keep 44.
  const rows = await page.locator('#dashBody .dig-row').evaluateAll(
    els => els.map(e => e.getBoundingClientRect().height));
  rows.forEach((h, i) => expect(h, `dig-row ${i} height`).toBeGreaterThanOrEqual(32));
});
