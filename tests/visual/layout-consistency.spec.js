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
 * Known, intentional exceptions (do not "fix" by loosening the tolerance):
 * - Builder's Publish/Save/Print/Clear live at the BOTTOM of the docket — they
 *   commit the assembled plate (form-submit semantics), not header actions.
 * - Dashboard simply has no .panel-actions row; the actions-row assertions run
 *   on the tabs that have one (pantry + ingredients/Products + analysis/Menu —
 *   Menu joined the skeleton in v52, its old picker-embedded-buttons exception
 *   is gone).
 */
const { test, expect } = require('@playwright/test');

const TABS = ['dashboard', 'builder', 'pantry', 'ingredients', 'analysis'];
const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];
const TOL = 1;

for (const size of SIZES) {
  test(`panel skeleton identical across all five tabs @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
