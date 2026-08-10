/*
 * _segv-probe-control.spec.js — TEMPORARY EXPERIMENT. Delete before merge.
 *
 * The control arm for `_segv-probe-tight.spec.js`. Read that file first; it carries the hypothesis,
 * the arithmetic and the reason this is an amplification rather than an absence test.
 *
 * Identical in every respect except the wait: each test sits for 1500ms after the app is up, so the
 * service worker registration started on window load has completed long before the context is torn
 * down. Same count, same viewport, same boot, same file-level parallelism.
 *
 * WHAT EACH OUTCOME MEANS, written down BEFORE the run so the result cannot be read to taste:
 *   tight crashes, control does not  → the predecessor pattern is real and the cause is the tight
 *                                      teardown. The bump then has a reproducer to be judged on.
 *   both crash at a similar rate     → the tight cycle is NOT the trigger; the census's four-of-six
 *                                      pattern was coincidence, and the item's own probes would
 *                                      have "confirmed" a fix that fixed nothing.
 *   neither crashes                  → the experiment is underpowered, not a negative result. 60
 *                                      cycles at the estimated 4.5% should crash; if it does not,
 *                                      the estimate is wrong and that is itself worth knowing.
 */
const { test } = require('@playwright/test');
const { installBoot } = require('./_boot');

const CYCLES = 60;

for (let i = 0; i < CYCLES; i++) {
  test(`padded cycle ${i}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await installBoot(page);
    await page.goto('/');
    await page.waitForFunction(() => typeof window.showTab === 'function');
    await page.waitForTimeout(1500);   // the only difference from the tight arm
  });
}
