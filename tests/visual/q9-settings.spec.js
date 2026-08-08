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

// 640 is the LOWER EDGE of the two-pane layout (the mobile media is max-width:639) — testing it as
// well as 1280 pins that the hide-title rule shares the layout's boundary; a drifted breakpoint
// (say min-width:900) would show sidebar + duplicate title at 640–899 and fail here.
for (const width of [640, 1280]) {
  test(`desktop ${width}px: section title is in the DOM for AT but takes no visible space`, async ({ page }) => {
    await boot(page, width);
    await page.click('#settingsBtn');
    await page.waitForTimeout(400);
    const title = page.locator('#setSec-general .set-sec-title');
    await expect(title).toHaveText('General');
    const box = await title.boundingBox();
    expect(box, 'title must stay rendered (sr-only clip), not display:none — AT still announces it').not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(1);
    // and the first row starts the pane: its top is at the content pane's padding edge, not below a heading
    const row = await page.locator('#setSec-general .set-item').first().boundingBox();
    const pane = await page.locator('.set-content').boundingBox();
    expect(row.y - pane.y).toBeLessThan(40);
  });
}

test('mobile list after back: no persistent selection — all nav items render identically', async ({ page }) => {
  // The v128 review caught the desktop active styling (weight 800 / accent colour) leaking into the
  // mobile list: settingsBack removes .detail-open but leaves aria-current, so anything the mobile
  // override fails to neutralise marks the last-visited section as "selected" in a list documented
  // to have no persistent selection.
  await boot(page, 380);
  await page.click('#settingsBtn');
  await page.waitForTimeout(300);
  await page.click('.set-navitem[data-goto="data"]');
  await page.waitForTimeout(300);
  await page.click('#settingsBack');
  await page.waitForTimeout(300);
  const styles = await page.evaluate(() =>
    [...document.querySelectorAll('#settingsPanel .set-navitem')].map(b => {
      const s = getComputedStyle(b);
      return s.fontWeight + '|' + s.color + '|' + s.backgroundColor;
    }));
  expect(new Set(styles).size).toBe(1);
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
