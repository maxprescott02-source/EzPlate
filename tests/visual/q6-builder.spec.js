/*
 * q6-builder.spec.js — Q6 (v125). The builder cost panel + footer summary, behaviourally.
 * Locks: the panel total mirrors the docket total after a live edit; the per-menu verdict
 * renders with analyze()'s light and the composed wording; + New plate resets the panel
 * (menus hidden, empty footer). Console must stay clean throughout.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: 1 }] }
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 2, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' }
  ]));
};
test('cost panel tracks edits live; new plate resets it', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .ing-card').first().click();
  await page.waitForTimeout(300);
  await page.locator('#paEdit').click();
  await page.waitForTimeout(500);
  // price 2 vs suggested 2.30 → 13% under → amber, 46% food cost
  const v1 = await page.evaluate(() => document.getElementById('bMenus').innerHTML);
  expect(v1).toContain("bv-amber");
  // qty edit → totals + suggested move
  const before = await page.evaluate(() => document.getElementById('bTotal').textContent);
  await page.locator('#lines .line input[type="number"]').first().fill('700');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    t: document.getElementById('bTotal').textContent,
    docket: document.getElementById('total').textContent,
  }));
  expect(after.t).not.toBe(before);
  expect(after.t, 'panel total mirrors the docket total').toBe(after.docket);
  // close, then + New plate: panel resets, menus hidden
  await page.locator('#builderClose').click();
  await page.waitForTimeout(300);
  await page.locator('#newPlateBtn').click();
  await page.waitForTimeout(400);
  // the unfinished-plate guard may interpose — resume/discard: discard
  const confirmVisible = await page.evaluate(() => {
    const m = document.querySelector('#confirmModal.open, .modal-overlay.open .confirm-modal');
    return !!m;
  });
  if (confirmVisible) {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.modal-overlay.open button')];
      const d = btns.find(b => /Discard/i.test(b.textContent)); if (d) d.click();
    });
    await page.waitForTimeout(400);
  }
  const fresh = await page.evaluate(() => ({
    total: document.getElementById('bTotal').textContent,
    menusHidden: document.getElementById('bMenus').style.display === 'none',
    foot: document.getElementById('bFootSum').innerHTML,
  }));
  expect(fresh.total).toBe('$0.00');
  expect(fresh.menusHidden).toBe(true);
  expect(fresh.foot).toBe('');
  expect(errs, errs.join('|')).toHaveLength(0);
});
