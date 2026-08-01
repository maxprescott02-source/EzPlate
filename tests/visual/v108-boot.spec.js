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
  await page.waitForTimeout(1200);

  await expect(page.locator('#bootGate')).toBeHidden();
  // the catalogue is on screen, from the fetch — not from a literal, which no longer exists
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#ingList .ing-card').first()).toBeVisible();
});

test('data cannot load: the gate says so, in words, with one way forward', async ({ page }) => {
  await installBoot(page, { noClient: true });      // no Supabase client — the real failure path
  await page.goto('/');
  await page.waitForTimeout(1200);

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
  await page.waitForTimeout(1200);

  const gate = page.locator('#bootGate');
  const box = await gate.boundingBox();
  const vp = page.viewportSize();
  expect(box.width).toBeGreaterThanOrEqual(vp.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(vp.height - 1);
});
