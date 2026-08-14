/*
 * 188-roles.spec.js — owner vs staff, in a real browser, at both widths and both themes.
 *
 * WHY THIS EXISTS ON TOP OF tests/roles-client.test.js. That file runs the real functions against a
 * DOM stub, so it proves the JS sets `hidden` and `readOnly`. It cannot prove the element is
 * actually GONE from the screen — and in this codebase that gap is not theoretical:
 *
 *   ⚠️ an author `display` rule beats the UA's `[hidden]{display:none}`, because ORIGIN is compared
 *   before specificity. `.stg-row{display:flex}` would have left the Restore row sitting there
 *   with `hidden` set on it and every unit test green. CLAUDE.md records ten previous instances of
 *   exactly that; this batch is the eleventh, and this spec is what would have caught it.
 *
 * So every assertion here is `toBeVisible` / `toBeHidden` — computed, in Chromium, with the real
 * stylesheet — rather than an attribute read.
 *
 * The four are the four the server refuses (187): delete a plate, delete a menu, change the food
 * cost target, restore a backup. The seed publishes one plate onto one menu so all four are
 * reachable for an owner; a control that is missing for BOTH roles proves nothing, which is why
 * each case asserts the owner sees it first.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 6, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' },
  ]));
};

async function boot(page, { width, height, theme, role }) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width, height });
  await installBoot(page, { role });
  await page.addInitScript(SEED);
  await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
    const b = document.querySelector('.install-banner, #installBanner'); if (b) b.remove();
  });
  return errs;
}

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

for (const size of SIZES) {
  for (const theme of ['light', 'dark']) {
    test(`an OWNER is offered all four @ ${size.name} ${theme}`, async ({ page }) => {
      const errs = await boot(page, { ...size, theme, role: 'owner' });

      await page.locator('.navbtn[data-tab="builder"]').click();
      await page.waitForTimeout(300);
      await page.locator('#plateList .plib-row').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('#bldDelete')).toBeVisible();

      await page.locator('.navbtn[data-tab="analysis"]').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#menuDelBtn')).toBeVisible();

      await gotoTab(page, 'settings');
      await expect(page.locator('#setRestoreRow')).toBeVisible();
      await expect(page.locator('#setRestore')).toBeVisible();
      await expect(page.locator('#setCogsInput')).toBeVisible();
      /* The whole point of the owner case: the field is EDITABLE, so the staff case below is
         measuring a change rather than a constant. */
      await expect(page.locator('#setCogsInput')).not.toHaveAttribute('readonly', /.*/);

      await gotoTab(page, 'account');
      await expect(page.locator('#teamRole')).toContainText('owner of this caf');

      expect(errs).toEqual([]);
    });

    test(`STAFF are offered none of the four, and still see the target @ ${size.name} ${theme}`, async ({ page }) => {
      const errs = await boot(page, { ...size, theme, role: 'staff' });

      await page.locator('.navbtn[data-tab="builder"]').click();
      await page.waitForTimeout(300);
      await page.locator('#plateList .plib-row').first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('#bldDelete')).toBeHidden();
      /* Duplicate is the control BESIDE it and is untouched — staff create plates freely. Asserted
         so a future "hide the plate actions for staff" cannot quietly take it too. */
      await expect(page.locator('#bldDuplicate')).toBeVisible();

      await page.locator('.navbtn[data-tab="analysis"]').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#menuDelBtn')).toBeHidden();

      await gotoTab(page, 'settings');
      /* ⚠️ THE ASSERTION THE CSS GUARD EXISTS FOR. `hidden` is set by applyRoleUi; whether the row
         DISAPPEARS depends on `.stg-row:not([hidden])`, and without it this is the only check in
         the repo that would have gone red. */
      await expect(page.locator('#setRestoreRow')).toBeHidden();
      await expect(page.locator('#setRestore')).toBeHidden();
      /* And the deliberate asymmetry: the target is NOT hidden. It is the number that drives every
         suggested price and every good/bad colour staff read all day, so it stays legible and
         stops being editable. A batch that "makes this consistent" by hiding it fails here. */
      await expect(page.locator('#setCogsInput')).toBeVisible();
      await expect(page.locator('#setCogsInput')).toHaveAttribute('readonly', /.*/);
      await expect(page.locator('#setCogsHelp')).toContainText('Only the caf');
      /* Legibility is the reason read-only was chosen over disabled, so it is measured rather than
         asserted in a comment: the figure must still be drawn in the body text colour, not the
         greyed-out treatment a disabled control gets. */
      const contrast = await page.evaluate(() => {
        const el = document.getElementById('setCogsInput');
        const cs = getComputedStyle(el);
        return { color: cs.color, body: getComputedStyle(document.body).color };
      });
      expect(contrast.color).toBe(contrast.body);

      await gotoTab(page, 'account');
      await expect(page.locator('#teamRole')).toContainText('signed in as staff');

      expect(errs).toEqual([]);
    });
  }
}

test('an unreadable role reads as OWNER — the fail-open default, in the browser', async ({ page }) => {
  /* CLAUDE.md's law is that a fail-open default is a decision about CONSEQUENCE. Here the server
     refuses a non-owner regardless, so guessing "owner" costs a toast and guessing "staff" hides
     four controls from the person who owns the café. The tenant lookup still answers normally here
     — only the ROLE comes back as something app.js does not recognise, which is the one case that
     separates this default from the tenant gate's opposite one. */
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page, { role: 'MALFORMED' });   // an answer app.js does not recognise
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#menuDelBtn')).toBeVisible();
  await gotoTab(page, 'settings');
  await expect(page.locator('#setRestoreRow')).toBeVisible();
});
