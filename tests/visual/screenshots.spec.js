/*
 * screenshots.spec.js — captures each main screen at mobile + desktop widths.
 *
 * These are for the layout bugs unit tests can't see: card overflow, cramped
 * dropdowns, the desktop layout looking like stretched mobile, clipped icons.
 * Screenshots are written to tests/visual/__shots__/ — open them and LOOK.
 *
 * Run:  npm run shots
 *
 * Note: the app talks to your live Supabase, so screenshots show real (or empty)
 * data — that's fine for checking layout. The deeper flows that need setup (the
 * invoice-review modal, the print docket) aren't scripted here yet; add them when
 * you're working on those specific screens.
 */
const { test, expect } = require('@playwright/test');

const TABS = ['dashboard', 'builder', 'pantry', 'ingredients', 'analysis'];
const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

for (const size of SIZES) {
  for (const tab of TABS) {
    test(`${tab} @ ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/');
      // let the splash clear and the shell settle
      await page.waitForTimeout(1500);
      const btn = page.locator(`.navbtn[data-tab="${tab}"]`);
      if (await btn.count()) {
        await btn.click();
        await page.waitForTimeout(600);
      }
      await page.screenshot({
        path: `tests/visual/__shots__/${tab}-${size.name}.png`,
        fullPage: true,
      });
      // a trivial assertion so the run reports pass/fail; the real value is the images
      await expect(page.locator('body')).toBeVisible();
    });
  }
}
