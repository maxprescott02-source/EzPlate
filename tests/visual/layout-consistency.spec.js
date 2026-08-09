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
 * CONVERTED, and removed from TABS with their F-item: builder (Plates, F2).
 * A converted screen's own spec owns its header (tests/visual/v138-plates.spec.js).
 * When TABS is down to one entry, this spec has nothing left to compare and goes.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const TABS = ['dashboard', 'pantry', 'ingredients', 'analysis'];
const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];
/* 700 is the band between the app's two gutter steps (sp-4 at/below 560, sp-5 above) and below
 * the v3 desktop breakpoint (768). Nothing measured it until F2, whose first cut was misaligned
 * by 4px there and nowhere else — so the left-edge test below runs at this width too.
 * It is NOT in SIZES because the full cross-tab comparison fails there on a PRE-EXISTING
 * Dashboard defect: `#dashBody` opens the tab with `padding-top:16px` while every other tab's
 * panel uses `margin-top:var(--sp-5)` = 20px, so Dashboard sits 4px high at every width where
 * sp-5 is 20px. The two coincide at <=560, which is why 380 and 1280 never caught it.
 * Queued for F6 (Dashboard); adding this size to SIZES is part of that item. */
const EDGE_SIZES = SIZES.concat([{ name: 'narrow-desktop', width: 700, height: 900 }]);
const TOL = 1;

for (const size of SIZES) {
  test(`panel skeleton identical across all five tabs @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);

    const metrics = {};
    for (const tab of TABS) {
      await page.locator(`.navbtn[data-tab="${tab}"]`).click();
      await page.waitForTimeout(300);
      metrics[tab] = await page.evaluate(() => {
        window.scrollTo(0, 0);
        const panel = Array.from(document.querySelectorAll('#appMain .panel'))
          .find(p => p.getBoundingClientRect().width > 0);   // the visible tab's first panel
        const h2 = panel.querySelector(':scope > h2');
        const cs = getComputedStyle(h2);
        const pr = panel.getBoundingClientRect();
        const hr = h2.getBoundingClientRect();
        const actions = panel.querySelector(':scope > .panel-actions');
        const ar = actions ? actions.getBoundingClientRect() : null;
        const btn = actions ? actions.querySelector('.btn') : null;
        return {
          panelTop: pr.top, panelLeft: pr.left,
          titleTop: hr.top, titleBottom: hr.bottom, titleLeft: hr.left,
          titleTextLeft: hr.left + parseFloat(cs.paddingLeft),
          titleFont: cs.fontSize + '/' + cs.fontWeight + '/' + cs.textTransform,
          dividerW: cs.borderBottomWidth,
          actionsTop: ar ? ar.top : null,
          btnLeft: btn ? btn.getBoundingClientRect().left : null,
        };
      });
    }

    const base = metrics[TABS[0]];
    for (const tab of TABS.slice(1)) {
      const m = metrics[tab];
      expect(Math.abs(m.panelTop - base.panelTop), `${tab}: panel top offset matches ${TABS[0]}`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(m.panelLeft - base.panelLeft), `${tab}: panel left matches`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(m.titleTop - base.titleTop), `${tab}: title y matches`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(m.titleBottom - base.titleBottom), `${tab}: divider y matches`).toBeLessThanOrEqual(TOL);
      expect(Math.abs(m.titleTextLeft - base.titleTextLeft), `${tab}: title text left edge matches`).toBeLessThanOrEqual(TOL);
      expect(m.titleFont, `${tab}: ONE title type (size/weight/case)`).toBe(base.titleFont);
      expect(m.dividerW, `${tab}: divider on the title`).toBe(base.dividerW);
    }

    // actions rows (the three tabs that have one): same y, same button left edge,
    // and the buttons share the title's left edge — ONE left edge, structurally
    const p = metrics.pantry, i = metrics.ingredients, a = metrics.analysis;
    expect(p.actionsTop, 'pantry has an actions row').not.toBeNull();
    expect(i.actionsTop, 'Products has an actions row').not.toBeNull();
    expect(a.actionsTop, 'Menu has an actions row (v52)').not.toBeNull();
    expect(Math.abs(p.actionsTop - i.actionsTop), 'actions row y identical across tabs').toBeLessThanOrEqual(TOL);
    expect(Math.abs(p.actionsTop - a.actionsTop), 'Menu actions row y matches').toBeLessThanOrEqual(TOL);
    expect(Math.abs(p.btnLeft - i.btnLeft), 'primary button left edge identical').toBeLessThanOrEqual(TOL);
    expect(Math.abs(p.btnLeft - a.btnLeft), 'Menu primary button left edge identical').toBeLessThanOrEqual(TOL);
    expect(Math.abs(p.btnLeft - p.titleTextLeft), 'buttons sit on the title text edge (pantry)').toBeLessThanOrEqual(TOL);
    expect(Math.abs(i.btnLeft - i.titleTextLeft), 'buttons sit on the title text edge (Products)').toBeLessThanOrEqual(TOL);
    expect(Math.abs(a.btnLeft - a.titleTextLeft), 'buttons sit on the title text edge (Menu)').toBeLessThanOrEqual(TOL);

    // header meta lines share the same edge (Products' were inline styles pre-v49)
    await page.locator('.navbtn[data-tab="ingredients"]').click();
    await page.waitForTimeout(200);
    const metaLeft = await page.evaluate(() => document.getElementById('lastImport').getBoundingClientRect().left);
    expect(Math.abs(metaLeft - i.titleTextLeft), 'meta hint sits on the title text edge').toBeLessThanOrEqual(TOL);
  });
}

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

    const old = await edge('pantry', ':scope > h2');
    const plates = await edge('builder', ':scope > .scr-head > h2');   // F2-converted
    expect(Math.abs(plates.panelLeft - old.panelLeft), 'Plates panel shares the page edge').toBeLessThanOrEqual(TOL);
    expect(Math.abs(plates.textLeft - old.textLeft), 'Plates title text shares the ONE left edge').toBeLessThanOrEqual(TOL);

    // and the screen's own body sits on it too — the gap layout-consistency never measured
    // (its comment claimed "the shared left edge" but it stopped at the actions row)
    const bodyLeft = await page.evaluate(() =>
      document.getElementById('plateList').getBoundingClientRect().left);
    expect(Math.abs(bodyLeft - plates.textLeft), 'the Plates list body sits on the title edge').toBeLessThanOrEqual(TOL);
  });
}
