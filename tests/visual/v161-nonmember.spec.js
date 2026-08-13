/*
 * v161-nonmember.spec.js — 185. The boot gate for a signed-in account that belongs to no café.
 *
 * WHY THIS NEEDS A BROWSER AT ALL. The unit tests pin the decision and the button wiring against
 * the real functions; what they cannot see is whether the thing is READABLE — a full-screen message
 * six lines long inside a `max-width:34ch` box on a 380px phone, with a button under it. The three
 * defects this project keeps finding in exactly this gap (a rule that loses the cascade, a rule that
 * was discarded by a syntax error, a control that renders off-screen) are all invisible to a green
 * suite and obvious here.
 *
 * The state is unreachable without the shim's `nonMember` flag: every table read SUCCEEDS with zero
 * rows, so there is no error to inject and no seed that produces it. See _boot.js.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const WIDTHS = [
  { w: 380, h: 820, name: 'phone' },
  { w: 1360, h: 900, name: 'desktop' },
];

for (const { w, h, name } of WIDTHS) {
  for (const theme of ['light', 'dark']) {
    test(`the non-member gate is legible and complete @ ${w} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await installBoot(page, { nonMember: true });
      /* ⚠️ `cafeCost_theme`, NOT `cafeDB_theme`. The first cut of this spec guessed the app's usual
         prefix, both themes booted identically, and the light/dark axis was two copies of one test
         — the vacuous-assertion shape this repo has now hit nineteen times. v142-menu.spec.js
         records the same mistake on the same key, which is why the assertion below exists: the axis
         must PROVE it took, not assume it. */
      await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
      await page.goto('/');

      const gate = page.locator('#bootGate');
      await expect(gate).toBeVisible();

      const bg = await gate.evaluate((el) => getComputedStyle(el).backgroundColor);
      const lum = (bg.match(/\d+/g) || []).slice(0, 3).reduce((a, n) => a + Number(n), 0) / 3;
      if (theme === 'dark') expect(lum, `dark gate background was ${bg}`).toBeLessThan(110);
      else expect(lum, `light gate background was ${bg}`).toBeGreaterThan(160);
      await expect(page.locator('#bootGateMsg')).toContainText('isn’t linked to a café');
      await expect(page.locator('#bootGateMsg')).toContainText('No data has been lost');

      // The one action, and the one that must NOT be offered.
      await expect(page.locator('#bootGateOut')).toBeVisible();
      await expect(page.locator('#bootGateRetry')).toBeHidden();

      /* The message and the button must both be ON SCREEN — not merely in the DOM. A `max-width`
         box centred in a fixed overlay is exactly the shape that overflows a short viewport once
         the copy grows, and the button is the part that goes first because it is last in flow. */
      const box = await page.locator('#bootGateOut').boundingBox();
      expect(box).not.toBeNull();
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(h);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(w);
      // A tap target on a phone, not a link-sized one.
      expect(box.height).toBeGreaterThanOrEqual(40);

      /* The message must not be clipped by its own container. `.bg-inner` has no overflow rule, so
         a scrollHeight past clientHeight means the copy is being cut off rather than wrapped. */
      const clipped = await page.locator('#bootGate .bg-inner').evaluate(
        (el) => el.scrollHeight > el.clientHeight + 1);
      expect(clipped, 'the explanation is clipped — it is the only thing on this screen').toBe(false);

      /* The sync pill must not be simultaneously claiming the server is unreachable. Nothing failed;
         it was a clean 200 with a clear answer, and two contradictory messages is worse than one.
         (This is the defect that driving it in a browser found — the first build wore setSync
         'error' here, which prints "Can't reach server — working offline".) */
      await expect(page.locator('#syncBanner')).toBeHidden();
    });
  }
}

test('the gate does NOT fire for an ordinary café — the no-alarm direction', async ({ page }) => {
  /* The mirror, and the more important of the two: a false alarm locks a legitimate user out of a
     working app, which is strictly worse than the empty screen this replaces. Same shim, same boot,
     only the tenant answer differs. */
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page);                     // the seeded café, i.e. anon or a member
  await page.goto('/');
  await expect(page.locator('#bootGate')).toBeHidden();
  await expect(page.locator('#bootGateOut')).toBeHidden();
});
