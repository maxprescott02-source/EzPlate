/*
 * 272-modal-footers.spec.js — consolidated item 47, the modal half.
 *
 * `tests/modal-footers.test.js` pins the MARKUP CONTRACT: which button is written first, which
 * classes it wears, that one CSS rule exists. None of that is the thing the item is about, which is
 * where the buttons END UP. A source test cannot tell `margin-right:auto` from a rule that was
 * discarded by a syntax error twenty lines earlier (`.claude/rules/css.md`: a CSS syntax error is
 * silent and takes every rule after it), or from one out-ranked by something else.
 *
 * So every assertion here is a MEASURED RECT from a real Chromium, at both widths and both themes.
 * The three edit forms must put their destructive button hard left while Cancel and Save stay right,
 * and the confirm dialog must NOT — its destructive action is its primary and belongs on the right.
 * That second assertion is the one that matters most: it is what a later "finish the pattern" batch
 * would break, and only a browser can show that the rule declines to match it.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: 1 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 9, menuId: 'M1', plateId: 'PL1' },
  ]));
};

async function boot(page, w, theme) {
  await page.setViewportSize({ width: w, height: 820 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById(); window.renderKitchenPanel();
  });
}

/* The footer's own content box, and the three buttons' rects, measured together so "left" and
   "right" are relative to the footer rather than to the viewport. */
async function footRects(page, modalId, ids) {
  return page.evaluate(([mid, wanted]) => {
    const foot = document.querySelector('#' + mid + ' .mfoot');
    const cs = getComputedStyle(foot);
    const fr = foot.getBoundingClientRect();
    const out = { padLeft: parseFloat(cs.paddingLeft), padRight: parseFloat(cs.paddingRight), foot: { l: fr.left, r: fr.right }, btns: {} };
    for (const id of wanted) {
      const el = document.getElementById(id);
      const r = el.getBoundingClientRect();
      out.btns[id] = { l: r.left, r: r.right, w: r.width, shown: r.width > 0 };
    }
    return out;
  }, [modalId, ids]);
}

for (const w of [380, 1280]) {
  for (const theme of ['light', 'dark']) {
    test(`272: the Edit-product footer puts Delete left and the pair right @ ${w} ${theme}`, async ({ page }) => {
      await boot(page, w, theme);
      await page.locator('.navbtn[data-tab="ingredients"], .sidebtn[data-tab="ingredients"]').first()
        .click({ timeout: 5000 }).catch(async () => {
          await page.evaluate(() => window.showTab('ingredients'));
        });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.openIngEdit('P0108'));
      await page.waitForTimeout(400);
      await expect(page.locator('#ingModal')).toHaveClass(/open/);

      const m = await footRects(page, 'ingModal', ['ingDelete', 'ingCancel', 'ingSave']);
      expect(Math.round(m.btns.ingDelete.l - m.foot.l), 'Delete sits at the footer\'s left padding edge')
        .toBe(Math.round(m.padLeft));
      expect(Math.round(m.foot.r - m.btns.ingSave.r), 'Save sits at the right padding edge')
        .toBe(Math.round(m.padRight));
      expect(m.btns.ingCancel.l - m.btns.ingDelete.r,
        'and there is real space between the destructive action and the pair — that gap IS the pattern')
        .toBeGreaterThan(20);
      await page.locator('#ingModal .modal').screenshot({ path: `tests/visual/__shots__/272-ing-foot-${w}-${theme}.png` });
    });

    test(`272: the Edit-ingredient footer matches it, and is EMPTY of Delete when creating @ ${w} ${theme}`, async ({ page }) => {
      await boot(page, w, theme);
      await page.evaluate(() => window.showTab('pantry'));
      await page.waitForTimeout(400);

      /* Create mode first: the destructive button is display:none, so it leaves the flex line and
         Cancel and Save must still sit right. That is the half a `margin-right:auto` on a hidden
         element could silently get wrong. */
      await page.evaluate(() => window.openKingModal());
      await page.waitForTimeout(300);
      const create = await footRects(page, 'kingModal', ['kingModalRemove', 'kingModalCancel', 'kingModalSave']);
      expect(create.btns.kingModalRemove.shown, 'no Delete while creating').toBe(false);
      expect(Math.round(create.foot.r - create.btns.kingModalSave.r)).toBe(Math.round(create.padRight));
      await page.evaluate(() => window.closeKingModal());
      await page.waitForTimeout(250);

      // edit mode: same shape as Edit product
      await page.locator('.king-row[data-kid="K1"]').click();
      await page.waitForTimeout(400);
      await expect(page.locator('#kingModal')).toHaveClass(/open/);
      const m = await footRects(page, 'kingModal', ['kingModalRemove', 'kingModalCancel', 'kingModalSave']);
      expect(m.btns.kingModalRemove.shown, 'Delete ingredient shows in edit mode').toBe(true);
      expect(Math.round(m.btns.kingModalRemove.l - m.foot.l)).toBe(Math.round(m.padLeft));
      expect(Math.round(m.foot.r - m.btns.kingModalSave.r)).toBe(Math.round(m.padRight));
      expect(m.btns.kingModalCancel.l - m.btns.kingModalRemove.r).toBeGreaterThan(20);
      await page.locator('#kingModal .modal').screenshot({ path: `tests/visual/__shots__/272-king-foot-${w}-${theme}.png` });
    });

    test(`272: the Edit-menu-item footer holds Delete, with no second row under it @ ${w} ${theme}`, async ({ page }) => {
      await boot(page, w, theme);
      await page.evaluate(() => window.showTab('menu'));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.openMenuEdit('MI1'));
      await page.waitForTimeout(400);
      await expect(page.locator('#editModal')).toHaveClass(/open/);

      expect(await page.locator('#ed_deleteRow').count(), 'the extra strip below the footer is gone').toBe(0);
      const m = await footRects(page, 'editModal', ['ed_delete', 'editCancel', 'editSave']);
      expect(Math.round(m.btns.ed_delete.l - m.foot.l)).toBe(Math.round(m.padLeft));
      expect(Math.round(m.foot.r - m.btns.editSave.r)).toBe(Math.round(m.padRight));
      expect(m.btns.editCancel.l - m.btns.ed_delete.r).toBeGreaterThan(20);

      /* It was an <a role="button"> with a click handler only. Space is the key that never worked. */
      await page.locator('#ed_delete').focus();
      await page.keyboard.press(' ');
      await page.waitForTimeout(400);
      await expect(page.locator('#delChoiceModal'), 'Space reaches it now, because it is a button')
        .toHaveClass(/open/);
      await page.locator('#delChoiceModal .modal').screenshot({ path: `tests/visual/__shots__/272-delchoice-${w}-${theme}.png` });

      /* THE CARVE-OUT, measured: a confirm dialog's destructive action is its primary and stays
         right. If the placement rule is ever widened to `.mfoot .btn.danger`, this is what breaks. */
      const d = await footRects(page, 'delChoiceModal', ['delChoiceCancel', 'delChoiceMenuOnly', 'delChoiceAll']);
      expect(d.btns.delChoiceAll.r, '"Delete everything" is the rightmost control in its footer')
        .toBeGreaterThan(d.btns.delChoiceCancel.r);
      expect(Math.round(d.foot.r - d.btns.delChoiceAll.r)).toBe(Math.round(d.padRight));
    });
  }
}
