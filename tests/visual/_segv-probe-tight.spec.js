/*
 * _segv-probe-tight.spec.js — TEMPORARY EXPERIMENT. Delete before merge.
 *
 * THE HYPOTHESIS (docs/handovers/HANDOVER-163-browser-segv.md): four of the six CI segfaults are
 * the context creation immediately after `v141-sync-corner.spec.js:105`, the suite's shortest test
 * at ~600-1000ms, which does a full goto — registering a service worker on window load — and is
 * then torn down. The crash register `rcx` held the ASCII `ocalhost`.
 *
 * WHY THIS SHAPE, rather than the two probes the queue item named. Both of those LENGTHEN the short
 * test and ask whether the crash goes away, and the item says itself that a green run cannot settle
 * it: at 6 occurrences in 44 runs, a handful of passes proves nothing. So this does the opposite —
 * it AMPLIFIES. If the tight cycle is the cause, many tight cycles should crash on demand, and a
 * hypothesis that predicts a reproducer is worth far more than one that predicts an absence:
 *   - it can be CONFIRMED in one run rather than argued from silence, and
 *   - it gives the Chromium bump something to be verified AGAINST, which the item records as the
 *     thing it could not otherwise have ("the bump cannot be shown to have WORKED").
 *
 * THE ARITHMETIC THAT SIZED IT. `:105` runs twice per CI run (widths 1280 and 1440), so the four
 * attributed occurrences sit on roughly 88 tight context creations across 44 runs — about 4.5%
 * each. The other two occurrences sit on the remaining ~9000 creations, about 0.02%. If that
 * contrast is real, 60 tight cycles should crash two or three times and the control file should
 * not crash at all. If both arms crash at the same rate, the predecessor pattern was coincidence
 * and the census's central claim is wrong.
 *
 * ITS PAIR IS `_segv-probe-control.spec.js`, which is identical except that each test waits before
 * ending, so teardown is not racing the registration. Playwright parallelises by FILE, so with two
 * workers the two arms run in separate browser processes and cannot contaminate each other.
 *
 * A crash presents as a failed context setup in the test AFTER the short one, so a crash here is
 * reported by this batch's own `Did the browser crash?` step. That is the instrument.
 */
const { test } = require('@playwright/test');
const { installBoot } = require('./_boot');

const CYCLES = 150;

for (let i = 0; i < CYCLES; i++) {
  test(`tight cycle ${i}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await installBoot(page);
    await page.goto('/');
    // exactly what :105 waits for, and nothing after it — the context is torn down while the
    // service worker registration kicked off by the load event is still in flight.
    await page.waitForFunction(() => typeof window.showTab === 'function');
  });
}
