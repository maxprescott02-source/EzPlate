/*
 * 244-target-rollback.spec.js — QUEUE item 15, in a real browser at both widths and both themes.
 *
 * WHY THIS EXISTS ON TOP OF tests/cogs-rollback.test.js. That file runs the real `setCogs` against a
 * DOM stub and proves the variable goes back. What it cannot prove is the thing the item is about:
 * that the NUMBERS A USER READS go back with it. The target is divided into every suggested price
 * in the app, so the defect's whole symptom was a figure on a screen, and a stub has no figures.
 *
 * The flow is the item's own repro, driven end to end:
 *   1. an owner sets the target and the app agrees to it — the precondition, or step 3 proves nothing;
 *   2. the server then REFUSES the next change (187's three owner-only policies on this one
 *      `app_settings` key, injected here as the 42501 PostgREST answers with);
 *   3. the field, the Suggested column header and the suggested PRICE are all back to the target the
 *      server still holds.
 *
 * ⚠️ EVERY ASSERTION IS AN EQUALITY, NOT A "NOT THE WRONG VALUE" — CLAUDE.md roster 190: a denylist
 * assertion is a guess about every wrong value there could be, and the gap is invisible until the
 * environment varies. So the suggested price is READ OFF THE ROW at the confirmed target and then
 * asserted to be that same money string after the refusal, rather than asserted not to have moved.
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

async function boot(page, { width, height, theme }) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width, height });
  await installBoot(page, { role: 'owner' });
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

/* Type into the target the way a person does, then wait past the 500ms persist debounce AND the
   write's own settle. The debounce is part of what is under test: without it every keystroke was a
   separate write, so which of them the server accepted decided the café's target. */
async function setTarget(page, value) {
  await page.locator('#setCogsInput').fill(String(value));
  await page.locator('#setCogsInput').dispatchEvent('input');
  await page.waitForTimeout(900);
}

/* The server's refusal, injected at the client boundary rather than faked inside the app: this is
   the exact shape PostgREST returns when a restrictive policy refuses the write. */
async function refuseSettings(page) {
  await page.evaluate(() => {
    const orig = window.SUPA.from.bind(window.SUPA);
    window.SUPA.from = (table) => (table === 'app_settings'
      ? { upsert: () => Promise.resolve({ data: null, error: { message: 'permission denied for table app_settings', code: '42501' } }) }
      : orig(table));
  });
}

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

for (const size of SIZES) {
  for (const theme of ['light', 'dark']) {
    test(`a refused target change puts the number back on screen @ ${size.name} ${theme}`, async ({ page }) => {
      const errs = await boot(page, { ...size, theme });

      /* Settings is two taps below 1024 (the More screen, batch 171) and one above it. `gotoTab`
         drives the real route at the real width rather than calling showTab, so the screen has to
         actually be reachable — which is the point of running this in a browser at all. */
      await gotoTab(page, 'settings');
      await expect(page.locator('#setCogsInput')).toBeVisible();

      /* 1. A target the server accepts. 32.5 is deliberately fractional — before this batch the
         field rounded it to 33 while the boot read and the formatter both handled the decimal. */
      await setTarget(page, 32.5);
      expect(await page.locator('#setCogsInput').inputValue()).toBe('32.5');
      const confirmed = await page.evaluate(() => window.cogsPct);
      expect(confirmed).toBe(32.5);

      /* The suggested PRICE is the number this item is about, and it is read off the row rather
         than recomputed — a test that recomputes it is a second copy of the arithmetic, which is
         the defect class CLAUDE.md's roster is entirely about. `srLabel` puts the column's name in
         an sr-only span inside the cell, so the money is pulled out of the text. */
      const money = async () => (await page.locator('#aBody .mnu-sug').first().textContent()).match(/\$[\d.]+/)[0];
      await gotoTab(page, 'analysis');
      await page.waitForTimeout(400);
      await expect(page.locator('#aSuggestedTh')).toHaveText('Suggested at 32.5%');
      const atConfirmed = await money();

      /* 2. The server refuses the next one. */
      await refuseSettings(page);
      await gotoTab(page, 'settings');
      await setTarget(page, 30);

      /* 3. Everything the user can read is back on the target the server still holds. */
      expect(await page.evaluate(() => window.cogsPct)).toBe(32.5);
      expect(await page.locator('#setCogsInput').inputValue()).toBe('32.5');

      await gotoTab(page, 'analysis');
      await page.waitForTimeout(400);
      await expect(page.locator('#aSuggestedTh')).toHaveText('Suggested at 32.5%');
      await expect(page.locator('#menuListNote')).toContainText('your 32.5% target');
      expect(await money()).toBe(atConfirmed);

      expect(errs).toEqual([]);
    });
  }
}

/* One width and one theme, because this is about TIMING rather than layout. The persist is
   debounced by 500ms, and a debounce is a window in which the tab can be closed — so leaving the
   field has to flush it. Asserted by counting the writes rather than by waiting, or the test would
   pass on the timer it is supposed to be bypassing. */
test('leaving the target field saves it without waiting for the debounce', async ({ page }) => {
  await boot(page, { width: 1280, height: 900, theme: 'light' });
  await gotoTab(page, 'settings');

  await page.evaluate(() => {
    window.__upserts = [];
    const orig = window.SUPA.from.bind(window.SUPA);
    window.SUPA.from = (table) => (table === 'app_settings'
      ? { upsert: (row) => { window.__upserts.push(row); return Promise.resolve({ data: [row], error: null }); } }
      : orig(table));
  });

  await page.locator('#setCogsInput').fill('28');
  await page.locator('#setCogsInput').dispatchEvent('input');
  await page.locator('#setCogsInput').dispatchEvent('change');   // blur, or Enter
  await page.waitForTimeout(150);                                // well inside the 500ms debounce
  expect(await page.evaluate(() => window.__upserts)).toEqual([{ key: 'food_cost_target', value: 28 }]);

  /* And the flushed timer does not fire a second time behind it. */
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => window.__upserts.length)).toBe(1);
});
