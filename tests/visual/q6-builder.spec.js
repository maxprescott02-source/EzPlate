/*
 * q6-builder.spec.js — the builder's Cost card + phone summary bar, behaviourally.
 * Locks: the card's total moves with a live qty edit; the per-menu verdict renders with
 * analyze()'s light and the composed wording; the summary leads with the WORST menu; + New plate
 * resets the card (menus hidden, empty bar). Console must stay clean throughout.
 *
 * REWRITTEN BY F7 (v146), not re-pointed selector-by-selector. Q6 (v125) wrote it against the
 * MODAL's docket: it opened through the action chooser's #paEdit, and its central assertion was
 * that #bTotal mirrored the docket's #total. Both are gone — the row opens the builder directly,
 * and #total went with the docket because the Cost card is now the one on-screen total (§7).
 * The DECISIONS Q6 made all survive and are still pinned here; only the shapes they live in moved.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }, { id: 'MENU_SUMMER', name: 'Summer' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: 1 }] }
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 2, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' },
    // a second, HEALTHY menu — the footer must lead with the worst (rank.red is 0: the ||-falsy
    // trap the v125 review caught buried red at the bottom of the sort)
    { id: 'MI2', name: 'Fish & Chips', section: 'Mains', price: 9, custom: true, menuId: 'MENU_SUMMER', plateId: 'PL1' }
  ]));
};
test('cost panel tracks edits live; new plate resets it', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .plib-row').first().click();   // F7: the row opens the builder itself
  await page.waitForTimeout(500);
  await expect(page.locator('#builderPage')).toBeVisible();
  // Winter at $2: 13% under suggested 2.30 → amber, 46% food cost; Summer at $9 → green
  const v1 = await page.evaluate(() => document.getElementById('bMenus').innerHTML);
  expect(v1).toContain('bv-amber');
  expect(v1).toContain('% food cost');
  expect(v1).toContain('under suggested');
  expect(v1).toContain('bv-green');
  // the footer summary leads with the WORST menu (amber Winter), never the healthy one
  const foot = await page.evaluate(() => document.getElementById('bFootSum').textContent);
  expect(foot).toContain('Winter Menu');
  expect(foot).not.toContain('Summer');
  /* ≥768 the mock's five columns: every cell of a row shares ONE band, and the tracks line up
     down the table. Q6's version of this asserted the same premise against the docket's grid; the
     premise is what is pinned, not the class names it used to be written in. */
  const cols = await page.evaluate(() => {
    const l = document.querySelector('#lines .bld-row:not(.is-misc)');
    const band = el => { const r = el.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
    const nm = l.querySelector('.bld-ing'), qty = l.querySelector('.bld-qty'), lc = l.querySelector('.bld-lc');
    const nr = nm.getBoundingClientRect();
    return {
      grid: getComputedStyle(l).display === 'grid',
      qtyRightOfNm: qty.getBoundingClientRect().left >= nr.right,
      lcInNmBand: band(lc) >= nr.top && band(lc) <= nr.bottom,
      bandLabelsUnitCost: /Unit cost/.test(document.querySelector('.bld-band').textContent),
    };
  });
  expect(cols.grid, 'builder rows are grids').toBe(true);
  expect(cols.qtyRightOfNm, 'qty column sits right of the name').toBe(true);
  expect(cols.lcInNmBand, 'the line cost shares the name row — the columned premise').toBe(true);
  /* The mock heads this column "Unit"; it carries the editable UNIT COST here, because .pchip has
     no other home. If the band ever says "Unit" again the column is lying about its own contents. */
  expect(cols.bandLabelsUnitCost, 'the third column is headed for what it holds').toBe(true);

  // qty edit → total + suggested move, and there is exactly ONE total on the screen
  const before = await page.evaluate(() => document.getElementById('bTotal').textContent);
  await page.locator('#lines .bld-row input[type="number"]').first().fill('700');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({
    t: document.getElementById('bTotal').textContent,
    docketTotalGone: !document.getElementById('total'),
  }));
  expect(after.t).not.toBe(before);
  expect(after.docketTotalGone, 'the docket total is gone — the Cost card is the one total (§7)').toBe(true);
  // leave, then + New plate: card resets, menus hidden
  await page.locator('#builderClose').click();
  await page.waitForTimeout(300);
  await page.locator('#newPlateBtn').click();
  await page.waitForTimeout(400);
  // the unfinished-plate guard may interpose — resume/discard: discard
  const confirmVisible = await page.evaluate(() => {
    const m = document.querySelector('#confirmModal.open, .modal-overlay.open .confirm-modal');
    return !!m;
  });
  if (confirmVisible) {
    await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.modal-overlay.open button')];
      const d = btns.find(b => /Discard/i.test(b.textContent)); if (d) d.click();
    });
    await page.waitForTimeout(400);
  }
  const fresh = await page.evaluate(() => ({
    total: document.getElementById('bTotal').textContent,
    menusHidden: document.getElementById('bMenus').style.display === 'none',
    foot: document.getElementById('bFootSum').innerHTML,
    pillHidden: document.getElementById('bldPill').hidden,
    pubNote: document.getElementById('bPublish').textContent,
  }));
  expect(fresh.total).toBe('$0.00');
  expect(fresh.menusHidden).toBe(true);
  expect(fresh.foot).toBe('');
  // F7: an unpublished plate has no price anywhere, so the header pill is ABSENT, not zeroed
  expect(fresh.pillHidden, 'no food-cost pill on a plate that is not on a menu').toBe(true);
  expect(fresh.pubNote, 'and the Publishing card says why it cannot publish yet').toMatch(/Save the plate first/);
  expect(errs, errs.join('|')).toHaveLength(0);
});
