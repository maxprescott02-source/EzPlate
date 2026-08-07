/*
 * v108-boot.spec.js — the boot gate, in a real browser.
 *
 * boot-gate.test.js pins the STATE MACHINE against a DOM stub. This pins the two things only a
 * browser can answer: that the gate actually covers the app when the data cannot load, and that it
 * actually gets out of the way when it can. Those are the two ways this feature fails badly —
 * an app trapped behind an overlay it cannot clear, or an empty app pretending to be a real one.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

test('data loads: the gate gets out of the way and the app renders', async ({ page }) => {
  await installBoot(page);
  await page.goto('/');

  // expect() auto-waits, so the boot fetch is awaited by the assertion itself — no fixed sleeps,
  // which are both slower when the app is ready and flakier when a loaded box is slow.
  await expect(page.locator('#bootGate')).toBeHidden();
  // the catalogue is on screen, from the fetch — not from a literal, which no longer exists
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await expect(page.locator('#ingList .ing-card').first()).toBeVisible();
});

test('data cannot load: the gate says so, in words, with one way forward', async ({ page }) => {
  await installBoot(page, { noClient: true });      // no Supabase client — the real failure path
  await page.goto('/');

  const gate = page.locator('#bootGate');
  await expect(gate).toBeVisible();
  await expect(gate).toHaveClass(/is-error/);

  // It must READ like an explanation, not a spinner that gave up.
  const msg = (await page.locator('#bootGateMsg').textContent()).trim();
  expect(msg.length).toBeGreaterThan(20);
  expect(msg).toMatch(/database|connection|offline/i);

  await expect(page.locator('#bootGateRetry')).toBeVisible();

  // The chrome stays usable — the app must never look crashed, and Settings stays reachable.
  await expect(page.locator('.bottomnav')).toBeVisible();
});

test('the gate never paints an empty app underneath itself', async ({ page }) => {
  // The failure this batch exists to remove: rendering zeroes that look like real data.
  await installBoot(page, { noClient: true });
  await page.goto('/');

  const gate = page.locator('#bootGate');
  await expect(gate).toBeVisible();      // boundingBox() returns null on a hidden node, which would
                                         // throw on .width and read as a crash rather than a failure
  const box = await gate.boundingBox();
  // ⚠️ NOT page.viewportSize(). That is the WINDOW size and includes the scrollbar; a full-bleed
  // fixed element only ever covers the LAYOUT viewport. macOS draws overlay scrollbars at 0px so
  // the two agree locally, but CI's Linux Chromium draws a classic one and they differ by ~10px -
  // this assertion failed in CI at 1270 vs 1280 while passing on every developer machine.
  // clientWidth/clientHeight is the area the gate is actually supposed to cover, on both.
  const vp = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }));
  expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(vp.height - 1);
});
