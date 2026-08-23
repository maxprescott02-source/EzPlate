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
const { gotoTab } = require('./_boot');

/* SKIPPED SINCE 186 (`ezplate-v162`), and the skip is the DECISION rather than a workaround.
   This is the one spec that does not call installBoot: it drives the real app against the café's
   live production database, which is also why CI filters it out. 186 made sign-in mandatory and
   removed the anon fallback from current_business_id(), so an unauthenticated load resolves to no
   tenant and every screen this photographs is the sign-in door. There is no bug in the app — the
   spec's premise expired.
   It was left FAILING for ten deploy versions, and that is the part worth fixing: CI never runs it,
   so nothing anywhere went red, and `npm run shots` reported thirteen familiar failures at the
   bottom of an otherwise green suite. A spec that cannot pass and cannot report is worse than a
   deleted one, because it trains every batch to skim past a block of red — which is the exact state
   a real regression would arrive in.
   NOT deleted, deliberately: this is the only artefact recording that the app was once screenshot
   against a real signed-in café, and 186 added `auth` to _boot.js so the capability comes back the
   moment there is a test account. Do NOT give the harness a real password — the repo is public. */
test.skip(true, 'needs a signed-in session; 186 made sign-in mandatory and removed the anon fallback. Restore with a test account, never a committed password.');

/* 171: 'more' joins the set. `ingredients` (Products) is a More sub-screen below 1024 now, so its
   nav button is display:none at mobile width — the `if (await btn.count())` guard below would NOT
   have caught that, because the button is still in the DOM and only its visibility changed. The
   walk goes through gotoTab instead, which takes the real route at whatever width it is given. */
const TABS = ['dashboard', 'builder', 'pantry', 'ingredients', 'analysis', 'more'];
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
      /* 'more' has no desktop counterpart — at >=1024 its four routes ARE the sidebar's bottom
         group and showTab redirects it — so there is nothing to shoot there and the walk skips it. */
      if (!(tab === 'more' && size.width >= 1024)) {
        await gotoTab(page, tab);
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

// v55: the builder is now a POPUP opened from the Plates tab (publishing is a separate many-to-many
// flow via the "Add to a menu" modal — v82 rename of "Manage menus" — NOT captured by this test).
// This captures the Plates card grid + the builder popup at each width (proves §C — the grid is
// full-width, not a narrow mobile column).
for (const size of SIZES) {
  test(`plates + builder popup @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator('.navbtn[data-tab="builder"]').click();   // the Plates library
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/visual/__shots__/plates-${size.name}.png`, fullPage: true });
    // open the builder PAGE on a new plate (F7 / v146 — it was a popup to v145)
    await page.locator('#newPlateBtn').click();
    await page.waitForTimeout(400);
    if (await page.locator('#builderPage:not([hidden])').count()) {
      await page.screenshot({ path: `tests/visual/__shots__/builder-page-${size.name}.png`, fullPage: true });
    }
    await expect(page.locator('body')).toBeVisible();
  });
}
