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

  // ⚠️ MEASURE THE REFERENCE, DO NOT NAME IT. Two earlier attempts asserted against a number the
  // test chose - page.viewportSize() (the WINDOW) and then documentElement.clientWidth (the ROOT
  // BOX) - and the second one is why the scrollbar theory looked disproved when it was right.
  // MEASURED on the CI runner, not inferred: innerWidth 1280, documentElement.clientWidth 1280,
  // and a full-bleed fixed element 1270. Both candidate references report 1280 on Linux exactly as
  // they do on a Mac, so swapping one for the other could never have helped. The 10px is the app's
  // own scrollbar (`*::-webkit-scrollbar{width:10px}`, css/style.css) - macOS draws overlay
  // scrollbars that cost no layout width, Linux draws a classic one that does, and it comes out of
  // the fixed-positioning containing block WITHOUT being subtracted from either of those numbers.
  //
  // The only portable way to name that area is to measure something that lives in it. This probe
  // is a full-bleed fixed element and nothing else, so its rect IS the fixed-positioning
  // containing block on whatever platform is running - 1280 on a Mac, 1270 on CI, correct on both.
  //
  // What this therefore pins is the APP's property (the gate spans its whole containing block -
  // it is not absolutely positioned, not inset by padding, not capped by a max-width) and not the
  // browser's (that inset:0 covers the viewport), which was never ours to test.
  const ref = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return { width: r.width, height: r.height };
  });
  expect(box.width).toBeGreaterThanOrEqual(ref.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(ref.height - 1);
});
