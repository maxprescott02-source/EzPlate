/*
 * layout-consistency.spec.js — v49: the panel skeleton is MEASURED, not eyeballed.
 *
 * Cross-tab consistency kept regressing because every "design pass" nudged five
 * hand-written headers toward each other by eye. v49 put all five tabs on one
 * skeleton (.panel > h2 > optional .panel-actions > controls > body); this spec
 * is what makes that stick: at 380px and 1280px it visits every tab and asserts
 * the panel top, title y, divider y, actions-row y, and the shared left edge are
 * IDENTICAL within 1px across tabs. Any future per-tab nudge fails here instead
 * of reaching Max's phone.
 *
 * v55: the "builder" tab is now the PLATES LIBRARY (data-tab unchanged) — a plain
 * .panel > h2 > .panel-actions card grid; the builder itself moved to #builderModal.
 * So the old "Publish/Save/Print/Clear at the bottom of the docket" exception is GONE;
 * the panel/title/divider assertions below cover it like any other tab.
 *
 * Known, intentional exceptions (do not "fix" by loosening the tolerance):
 * - Dashboard simply has no .panel-actions row; the actions-row assertions run
 *   on the tabs that have one (pantry + ingredients/Products + analysis/Menu —
 *   Menu joined the skeleton in v52).
 *
 * ⚠ F2 (v138) — WHY THIS SPEC IS SHRINKING, AND WHY THAT IS NOT A LOOSENING.
 * The v3 fold-in replaces the shared panel skeleton one screen at a time: a
 * CONVERTED screen renders the mock's `.scr-head` bar (title + subtitle + action
 * on ONE row) and an unconverted one keeps `.panel > h2 > .panel-actions`. Those
 * two shapes are deliberately different heights, so asserting them identical
 * would assert the fold-in had not happened. The honest version of this spec is
 * therefore "the tabs that have NOT been converted still agree with each other",
 * which is exactly the regression it was written to catch — a per-tab nudge among
 * the old screens — and it keeps its teeth until the set empties.
 *
 * ⚠ F4 (v140) — THE CROSS-TAB COMPARISON IS RETIRED, on the schedule this file set itself.
 * Its own note said "when Products converts (F4) only Menu remains and the whole cross-tab
 * comparison retires with it", and that is now true: of the five tabs, Plates (F2), Ingredients (F3)
 * and Products (F4) render `.scr-head`, Dashboard has never had a `.panel-actions` row, and Menu is
 * the last screen wearing `.panel > h2 > .panel-actions`. One screen cannot be compared with itself,
 * and comparing it with Dashboard would assert nothing the fold-in has not already changed.
 * It is deleted rather than loosened: the regression it caught was a per-tab nudge among the OLD
 * screens, and there is no longer a set of them.
 *
 * WHAT REPLACES IT is the test below, which was always the durable half — a converted screen may
 * have its own header shape, but not its own left edge. Products has moved from being that test's
 * unconverted BASELINE to being one of the screens measured against it; Menu is the baseline now.
 * A converted screen's own spec owns its header (v138-plates, v140-products, fresh-states for F3).
 * When Menu converts (F5) the baseline goes with it and this file should be re-read, not patched:
 * with every screen on `.scr-head` the honest test is "all five agree", which is the ORIGINAL
 * assertion coming back around.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];
/* 700 is the band between the app's two gutter steps (sp-4 at/below 560, sp-5 above) and below
 * the v3 desktop breakpoint (768). Nothing measured it until F2, whose first cut was misaligned
 * by 4px there and nowhere else — so the left-edge test below runs at this width too.
 * It is NOT in SIZES because the full cross-tab comparison used to fail there on a PRE-EXISTING
 * Dashboard defect: `#dashBody` opens the tab with `padding-top:16px` while every other tab's
 * panel uses `margin-top:var(--sp-5)` = 20px, so Dashboard sits 4px high at every width where
 * sp-5 is 20px. That comparison is gone as of F4, but the defect is not — it is queued with F6
 * (Dashboard), whose item still owns adding this size to SIZES.
 */
const EDGE_SIZES = SIZES.concat([{ name: 'narrow-desktop', width: 700, height: 900 }]);
const TOL = 1;

/*
 * The half of the old assertion that SURVIVES the fold-in. A converted screen is allowed a
 * different header shape; it is not allowed a different left edge — the v3 mock gives every
 * screen the same content gutter, and "one left edge" is the thing four batches kept nudging.
 * This is what stops the removal above from being a quiet loss of coverage.
 */
for (const size of EDGE_SIZES) {
  test(`converted screens keep the app's left edge @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);

    const edge = async (tab, titleSel) => {
      await page.locator(`.navbtn[data-tab="${tab}"]`).click();
      await page.waitForTimeout(300);
      return page.evaluate((sel) => {
        window.scrollTo(0, 0);
        const panel = Array.from(document.querySelectorAll('#appMain .panel'))
          .find((p) => p.getBoundingClientRect().width > 0);
        const title = panel.querySelector(sel);
        const cs = getComputedStyle(title.parentElement.matches('.scr-head') ? title.parentElement : title);
        return {
          panelLeft: panel.getBoundingClientRect().left,
          textLeft: (title.parentElement.matches('.scr-head') ? title.parentElement : title)
            .getBoundingClientRect().left + parseFloat(cs.paddingLeft),
        };
      }, titleSel);
    };

    // Menu is the last screen on the OLD skeleton, so it is the app's left edge for now (F4: it
    // took over from Products, which has joined the converted set below).
    const old = await edge('analysis', ':scope > h2');
    for (const [tab, listId, label] of [['builder', 'plateList', 'Plates'], ['pantry', 'kingList', 'Ingredients'], ['ingredients', 'ingList', 'Products']]) {
      const conv = await edge(tab, ':scope > .scr-head > h2');
      expect(Math.abs(conv.panelLeft - old.panelLeft), `${label} panel shares the page edge`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(conv.textLeft - old.textLeft), `${label} title text shares the ONE left edge`).toBeLessThanOrEqual(TOL);
      // and the screen's own body sits on it too — the gap layout-consistency never measured
      // (its comment claimed "the shared left edge" but it stopped at the actions row)
      const bodyLeft = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().left, listId);
      expect(Math.abs(bodyLeft - conv.textLeft), `the ${label} list body sits on the title edge`).toBeLessThanOrEqual(TOL);
    }
  });
}
