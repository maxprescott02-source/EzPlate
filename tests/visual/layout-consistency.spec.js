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
 * .panel > h2 > .panel-actions card grid; the builder itself is the full page #builderPage (F7/v146; it was #builderModal from v54 to v145).
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
 * ⚠ F4 (v140) — THE CROSS-TAB COMPARISON WAS RETIRED, on the schedule this file set itself.
 * Of the five tabs, Plates (F2), Ingredients (F3) and Products (F4) rendered `.scr-head`,
 * Dashboard has never had a `.panel-actions` row, and Menu was the last screen wearing
 * `.panel > h2 > .panel-actions`. One screen cannot be compared with itself, so the comparison
 * went rather than being loosened.
 *
 * ✅ F5 (v142) — AND NOW IT COMES BACK, which is what this file predicted in writing: "when Menu
 * converts (F5) the baseline goes with it and this file should be re-read, not patched: with every
 * screen on `.scr-head` the honest test is 'all agree', which is the ORIGINAL assertion coming back
 * around." Menu is converted, so there are FOUR screens on one header shape and comparing them is
 * meaningful again. This is a restoration of teeth, not an addition: the regression it caught for
 * five years was a per-tab nudge among screens that were supposed to be identical, and there is a
 * set of them again.
 *
 * ✅ F6 (v143) — DASHBOARD JOINS, AND 700 IS PROMOTED. Both halves of the queued "Dashboard panel
 * sits 4px high" item land here. Dashboard now renders `.scr-head` like the other four, and the
 * two owners of its top gap are one: `.plib-panel` zeroes the panel margin for every converted
 * screen, and `#dashBody`'s own margin is the content inset below the header bar — the same job
 * `#ingList` / `#plateList` / `#aList` do. So 700 moves out of EDGE_SIZES and into SIZES: the width
 * that only ever sat apart because of that defect is now an ordinary size, and the separate
 * EDGE_SIZES list is gone rather than left as a satisfied exception.
 * The reason 700 earns a place at all is unchanged and still worth stating: it is the band between
 * the app's two gutter steps (sp-4 at/below 560, sp-5 above) and below the v3 desktop breakpoint
 * (768). F2's first cut was misaligned by 4px there and nowhere else, and 380/1280 both miss it.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'narrow-desktop', width: 700, height: 900 },
  { name: 'desktop', width: 1280, height: 900 },
];
const TOL = 1;

/*
 * The assertion, restored. A converted screen may have its own CONTENT; it may not have its own
 * left edge — the v3 mock gives every screen the same content gutter, and "one left edge" is the
 * thing four batches kept nudging. Header, title text and list body are all measured, because the
 * old spec's comment claimed "the shared left edge" while it stopped at the actions row, and a
 * surface sitting 4px proud of its own title shipped past it once already (v123, caught by review).
 */
const SCREENS = [
  ['builder', 'plateList', 'Plates'],
  ['pantry', 'kingList', 'Ingredients'],
  ['ingredients', 'ingList', 'Products'],
  ['analysis', 'aList', 'Menu'],
  ['dashboard', 'dashBody', 'Dashboard'],
];

for (const size of SIZES) {
  test(`every converted screen shares ONE left edge @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);

    const edge = async (tab, listId) => {
      await gotoTab(page, tab);   // 171: width-aware — Products sits under More below 1024
      await page.waitForTimeout(300);
      return page.evaluate((id) => {
        window.scrollTo(0, 0);
        const panel = Array.from(document.querySelectorAll('#appMain .panel'))
          .find((p) => p.getBoundingClientRect().width > 0);
        const head = panel.querySelector(':scope > .scr-head');
        if (!head) throw new Error('no .scr-head — this screen is not converted');
        const cs = getComputedStyle(head);
        return {
          panelLeft: panel.getBoundingClientRect().left,
          textLeft: head.getBoundingClientRect().left + parseFloat(cs.paddingLeft),
          bodyLeft: document.getElementById(id).getBoundingClientRect().left,
        };
      }, listId);
    };

    const first = await edge(SCREENS[0][0], SCREENS[0][1]);
    expect(Math.abs(first.bodyLeft - first.textLeft),
      `the ${SCREENS[0][2]} list body sits on its own title edge`).toBeLessThanOrEqual(TOL);
    for (const [tab, listId, label] of SCREENS.slice(1)) {
      const s = await edge(tab, listId);
      expect(Math.abs(s.panelLeft - first.panelLeft), `${label} panel shares the page edge`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(s.textLeft - first.textLeft), `${label} title text shares the ONE left edge`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(s.bodyLeft - s.textLeft), `the ${label} list body sits on the title edge`).toBeLessThanOrEqual(TOL);
    }
  });
}
