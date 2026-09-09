/*
 * 245-negative-misc.spec.js — QUEUE item 19, in a real browser at both widths.
 *
 * WHY THIS EXISTS ON TOP OF tests/misc-cost-sign.test.js. That file runs the real `setMiscCost`
 * against a stub and proves the value is clamped. It cannot prove the two things that made this a
 * defect rather than a theory:
 *
 *   1. that the field REALLY DOES hand a negative to the handler. `min="0"` is on the element, and
 *      the browser sets `validity.rangeUnderflow` on that keystroke — the attribute looks like the
 *      guard and is not one, because the field is in no form and is read on `oninput`. This is the
 *      only harness that can measure that, and it is measured here rather than asserted from memory.
 *   2. that the plate cost a person READS never goes below zero. The defect's symptom was a figure
 *      on a screen: `$-1.08` in the builder, and "plate cost $-1.08" in the Plates library.
 *
 * Both widths because the builder's cost total and its warning flag are separate elements in the
 * two layouts, and a fix that holds on the desktop card and not in the mobile footer is the shape
 * CLAUDE.md's `@media` section is entirely about.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 6, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' },
  ]));
};

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

for (const size of SIZES) {
  test(`a negative misc cost cannot reach the plate total @ ${size.name}`, async ({ page }) => {
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page, { role: 'owner' });
    await page.addInitScript(SEED);
    await page.goto('/');
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
      window.rebuildKById();
      const b = document.querySelector('.install-banner, #installBanner'); if (b) b.remove();
    });

    await gotoTab(page, 'builder');
    await page.locator('#plateList .plib-row').first().click();
    await page.waitForTimeout(600);
    const clean = await page.locator('#bTotal').textContent();
    expect(clean).toBe('$0.92');                       // the ingredients alone, and the baseline for below

    await page.evaluate(() => window.addMiscCost());
    await page.waitForTimeout(200);
    const box = page.locator('.misc-costbox input').first();

    /* The precondition, and it is the finding rather than the setup: the browser knows this value is
       out of range and hands it over anyway. If this ever reports false, the field has gained a real
       constraint and the rest of this test is measuring something else. */
    await box.fill('-2');
    await box.dispatchEvent('input');
    await page.waitForTimeout(200);
    expect(await box.evaluate((el) => el.validity.rangeUnderflow)).toBe(true);
    expect(await box.evaluate((el) => el.min)).toBe('0');

    expect(await page.locator('#bTotal').textContent()).toBe('$0.92');
    expect(await page.locator('.misc-costbox input').first().inputValue()).toBe('-2');   // the typing is not fought

    /* And it saves at the honest number rather than at a negative one. The Plates row is where the
       old defect was visible from outside the builder. */
    /* Two save buttons, one per layout: #saveBtn on the desktop card and #bldSaveBar in the mobile
       footer bar. Whichever is VISIBLE at this width is the one a person can press, which is the
       only thing that makes the assertion below about the app rather than about the DOM. */
    const save = page.locator('#saveBtn:visible, #bldSaveBar:visible').first();
    await expect(save).toBeVisible();
    await save.click();
    await page.waitForTimeout(800);
    const row = (await page.locator('#plateList .plib-row').first().textContent()).replace(/\s+/g, ' ');
    expect(row).toContain('$0.92');
    expect(row).not.toContain('-$');
    expect(row).not.toContain('$-');

    expect(errs).toEqual([]);
  });
}
