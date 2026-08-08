/*
 * q9-settings.spec.js — Q9 (v128). The Settings restyle's one load-bearing invariant, behaviourally.
 * The section title (.set-sec-title) is sr-only'd on desktop, where it duplicates the highlighted
 * nav item — but on mobile detail it is the ONLY visible section label (the modal header still says
 * "Settings"). So: present in the DOM at both widths for AT, visually hidden ONLY ≥640px.
 * Deleting the h4 outright ("it's hidden anyway") would strip mobile of its section label —
 * this spec is what fails first.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function boot(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

test('desktop: section title is in the DOM for AT but takes no visible space', async ({ page }) => {
  await boot(page, 1280);
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  const title = page.locator('#setSec-general .set-sec-title');
  await expect(title).toHaveText('General');
  const box = await title.boundingBox();
  expect(box.width).toBeLessThanOrEqual(1);   // sr-only clip, not display:none — AT still announces it
  // and the first row starts the pane: its top is at the content pane's padding edge, not below a heading
  const row = await page.locator('#setSec-general .set-item').first().boundingBox();
  const pane = await page.locator('.set-content').boundingBox();
  expect(row.y - pane.y).toBeLessThan(40);
});

test('mobile detail: section title is the visible section label', async ({ page }) => {
  await boot(page, 380);
  await page.click('#settingsBtn');
  await page.waitForTimeout(400);
  await page.click('.set-navitem[data-goto="general"]');
  await page.waitForTimeout(400);
  const title = page.locator('#setSec-general .set-sec-title');
  await expect(title).toBeVisible();
  const box = await title.boundingBox();
  expect(box.width).toBeGreaterThan(40);   // genuinely rendered, not clipped
});
