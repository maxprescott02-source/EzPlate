/*
 * 230-nav-height.spec.js — `--bottomnav-h` is published by the bar that has it.
 *
 * WHAT WAS WRONG, and it is the failure mode a fallback is designed to hide. `css/style.css` docks
 * the builder's summary bar with `var(--bottomnav-h, 64px)`, and its own comment two rules below
 * said the offset "is measured against .bottomnav rather than assumed". Nothing anywhere defined the
 * variable, so the 64px fallback had been the live value since the rule was written — a mechanism
 * with one half, describing a measurement that never happened. Found by AUDIT-v186 (X1), and filed
 * twice before that without being fixed.
 *
 * AND THE FALLBACK WAS WRONG, which is why the remedy is to publish rather than to hard-code 64 with
 * an honest comment. Measured 2 Sep 2026: the tab bar is 65px tall at 380 and 67px at 600, so the
 * summary bar — which holds SAVE since 177 — had been docking 1-3px INTO it at every phone width.
 *
 * WHY THE ASSERTION IS AN EQUALITY AND NOT A RANGE. "Is not 64" would pass against any other wrong
 * number, which is roster entry 190. What must hold is that the variable EQUALS the bar's measured
 * height, so a future padding change moves both together or fails here.
 *
 * Run: npx playwright test tests/visual/230-nav-height.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function read(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const n = document.querySelector('.bottomnav');
    const r = n.getBoundingClientRect();
    return {
      h: r.height, w: r.width, isRail: r.height > r.width,
      published: getComputedStyle(document.documentElement).getPropertyValue('--bottomnav-h').trim(),
      barBottom: getComputedStyle(document.getElementById('bFootSum')).bottom,
    };
  });
}

/* Below 640 the tab bar is a real bottom bar and `.bld-bar` docks above it. These are the widths
   where the variable is actually read. */
for (const width of [380, 600]) {
  test(`${width}px: the published height IS the bar's height, and the summary bar clears it`, async ({ page }) => {
    const g = await read(page, width);
    const raw = JSON.stringify(g);

    expect(g.isRail, raw).toBe(false);
    expect(g.published, `published must equal the measured bar :: ${raw}`).toBe(Math.ceil(g.h) + 'px');

    /* The whole point: the bar no longer sits inside the tab bar. `.bld-bar`'s dock is the variable
       plus the safe-area inset, which is 0 in a desktop browser. */
    expect(parseFloat(g.barBottom), `the summary bar clears the tab bar :: ${raw}`)
      .toBeGreaterThanOrEqual(g.h);
  });
}

/* THE NO-ResizeObserver PATH, and it exists because a hand-mutation found the hole. Deleting the
   bare `publishNavH()` call left every test above green: Chromium's ResizeObserver fires once on
   `observe()`, so the observer alone publishes the value and the direct call looks redundant. It is
   not — it is the ONLY publisher in a browser without ResizeObserver, and without this test that
   line could be deleted as dead with nothing going red. The constructor is removed before app.js
   runs, so the IIFE takes its `if(window.ResizeObserver)` false branch for real. */
test('380px: the value is published even with no ResizeObserver', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  await installBoot(page);
  await page.addInitScript(() => { delete window.ResizeObserver; });
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');
  await page.waitForTimeout(200);
  const g = await page.evaluate(() => ({
    hasRO: typeof window.ResizeObserver !== 'undefined',
    h: document.querySelector('.bottomnav').getBoundingClientRect().height,
    published: getComputedStyle(document.documentElement).getPropertyValue('--bottomnav-h').trim(),
  }));
  expect(g.hasRO, 'the constructor really is gone').toBe(false);
  expect(g.published, JSON.stringify(g)).toBe(Math.ceil(g.h) + 'px');

  /* …AND IT KEEPS UP. Without ResizeObserver the only thing that can notice the bar changing size is
     the `resize` listener, and the bar really does change: 65px at 380, 67px at 600. Without this
     assertion that listener is a line no test has ever watched run, which a hand-mutation confirmed
     — deleting it left every other case green. */
  await page.setViewportSize({ width: 600, height: 800 });
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => ({
    h: document.querySelector('.bottomnav').getBoundingClientRect().height,
    published: getComputedStyle(document.documentElement).getPropertyValue('--bottomnav-h').trim(),
  }));
  expect(after.h, 'the bar really is a different height here').not.toBe(g.h);
  expect(after.published, JSON.stringify(after)).toBe(Math.ceil(after.h) + 'px');
});

/* ⚠️ THE RAIL IS THE SAME ELEMENT, RE-LAID-OUT — not a second one. At >=640 `.bottomnav` is a left
   rail whose height is the whole viewport, and publishing 800px as a "bar height" would push the
   summary bar off the screen entirely. The publisher discriminates on ORIENTATION, which is the
   discriminator v141-sync-corner.spec.js already uses and for the same reason. Without this test the
   guard is a line nobody has watched hold. */
for (const width of [700, 1280]) {
  test(`${width}px: the rail is not mistaken for a bar`, async ({ page }) => {
    const g = await read(page, width);
    const raw = JSON.stringify(g);
    expect(g.isRail, 'at this width .bottomnav is a left rail').toBe(true);
    expect(g.published, `a rail's height must never be published :: ${raw}`).not.toBe(Math.ceil(g.h) + 'px');
  });
}
