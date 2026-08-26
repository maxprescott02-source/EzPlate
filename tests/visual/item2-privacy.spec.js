/*
 * item2-privacy.spec.js — QUEUE item 2, the privacy gate, in a real browser.
 *
 * WHY A VISUAL SPEC AND NOT ONLY UNIT TESTS. `tests/privacy-disclosure.test.js` pins the COPY — that
 * the notice names Google, says the free tier may train on the data, and says humans may read it.
 * It cannot see any of the three things that decide whether a user is actually told:
 *
 *   1. that the sign-up REFUSES without the acceptance, and says why, rather than warning and
 *      proceeding — the item's "shown and accepted at signup, before an account exists";
 *   2. that the notice opens OVER the boot gate, which is the only screen a signed-out browser can
 *      reach. The gate is z-index 60 and the modal overlay is 80, and that is the whole of what
 *      makes the notice readable without an account. A number, in a file neither one opens;
 *   3. that none of it overflows a 380px phone, which is what the café owner is holding.
 *
 * Both themes and both sizes, because the copy is long and the acceptance row wraps — and the
 * left-alignment of that wrap was a real defect found here rather than by reading the rule.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot.js');

const SIZES = [{ name: 'mobile', width: 380, height: 800 }, { name: 'desktop', width: 1280, height: 900 }];

async function boot(page, { width, height, theme }) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width, height });
  await installBoot(page, { role: 'owner' });
  await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('.install-banner, #installBanner'); if (b) b.remove(); });
  return errs;
}

const noSideScroll = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const size of SIZES) for (const theme of ['light', 'dark']) {
  test(`privacy notice @ ${size.name} ${theme}`, async ({ page }) => {
    const errs = await boot(page, { ...size, theme });
    await page.evaluate(() => show('privacyModal'));
    await page.waitForTimeout(300);
    await expect(page.locator('#privacyModal')).toHaveClass(/open/);
    await expect(page.locator('#privacyTitle')).toBeVisible();
    const box = await page.locator('#privacyModal .modal').boundingBox();
    expect(box.width).toBeLessThanOrEqual(size.width);
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `/tmp/ezm/notice-${size.name}-${theme}.png` });
    // the material claims are on screen, not merely in the markup
    const txt = await page.locator('#privacyModal .mbody').innerText();
    expect(txt).toContain('Google');
    expect(txt.toLowerCase()).toContain('training');
    expect(txt).toContain('Human reviewers');
    await page.evaluate(() => hide('privacyModal'));
    expect(errs).toEqual([]);
  });

  test(`sign-up acceptance @ ${size.name} ${theme}`, async ({ page }) => {
    const errs = await boot(page, { ...size, theme });
    await page.evaluate(() => { document.getElementById('bootGate').hidden = false; gateMode(true); });
    await page.waitForTimeout(300);
    await expect(page.locator('#bgUpAccept')).toBeVisible();
    const b = await page.locator('.acct-accept').boundingBox();
    expect(b.width).toBeLessThanOrEqual(size.width);
    expect(b.height).toBeGreaterThan(18);
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `/tmp/ezm/signup-${size.name}-${theme}.png` });

    // the gate REFUSES without the tick, and says why
    await page.locator('#bgUpEmail').fill('someone@example.com');
    await page.locator('#bgUpPass').fill('a-password-123');
    await page.locator('#bgUpBtn').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#bgErr')).toBeVisible();
    expect(await page.locator('#bgErr').innerText()).toContain('privacy notice');
    await page.screenshot({ path: `/tmp/ezm/refused-${size.name}-${theme}.png` });

    // the link in the label opens the notice, over the gate
    await page.locator('#bgUpPrivacyLink').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#privacyModal')).toHaveClass(/open/);
    await expect(page.locator('#privacyTitle')).toBeVisible();
    await page.screenshot({ path: `/tmp/ezm/notice-over-gate-${size.name}-${theme}.png` });
    expect(errs).toEqual([]);
  });

  test(`invoice restatement @ ${size.name} ${theme}`, async ({ page }) => {
    const errs = await boot(page, { ...size, theme });
    await page.evaluate(() => showTab('invoices'));
    await page.waitForTimeout(400);
    const line = page.locator('#tab-invoices .inv-privacy');
    await expect(line).toBeVisible();
    expect(await line.innerText()).toContain('Google');
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `/tmp/ezm/invoice-${size.name}-${theme}.png` });
    expect(errs).toEqual([]);
  });
}
