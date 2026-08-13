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

test('a re-sync whose tenant lookup fails does NOT reopen the silent empty app', async ({ page }) => {
  /* ⚠️ THE PRE-PUSH REVIEW'S FINDING, reproduced at the level it actually lives. The first cut of
     this batch cleared the non-member latch at the top of every boot run. From an existing gate, the
     `online` listener re-runs bootstrapSync, and if the tenant lookup ALONE fails — one flaky request
     out of twelve — `tenantGateState` fell open to 'ok'. The four required reads still succeeded with
     `[]`, because RLS filters rows rather than erroring, so nothing threw, every store was emptied,
     and `bootReady('ok')` hid the gate.

     Result: the full app with zero products, zero plates and zero menus, and no message — exactly
     the state this batch exists to end, restored by a network blip.

     `unknown` is now its own answer and resolves against what is already known: only a definite uuid
     clears the latch. */
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page, { nonMember: true, rpcFailsAfter: 1 });
  await page.goto('/');

  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bootGateMsg')).toContainText('isn’t linked to a café');

  // The blip: the browser comes back online, the app re-syncs, and this time the tenant lookup fails.
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(600);

  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bootGateMsg')).toContainText('isn’t linked to a café');
  await expect(page.locator('#bootGateOut')).toBeVisible();
  // and the app underneath must not have been repainted as an empty café
  const counts = await page.evaluate(() => ({
    gateHidden: document.getElementById('bootGate').hidden,
    rpcCalls: window.__rpcCalls,
  }));
  expect(counts.gateHidden).toBe(false);
  expect(counts.rpcCalls, 'the re-sync must actually have run, or this test proves nothing')
    .toBeGreaterThan(1);
});
