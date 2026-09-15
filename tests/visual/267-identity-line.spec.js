/*
 * 267-identity-line.spec.js — queue item 57 made the product identity line LONGER, and this is the
 * measurement that says the figure beside it survived.
 *
 * WHAT CHANGED AND WHY IT NEEDS A BROWSER. The builder's ingredient search used to print the linked
 * product's DESCRIPTION alone; it now prints `Product — Brand · Supplier` through `productIdentity`.
 * On the real catalogue that is 50 characters becoming 67 — and 392 of the 393 fixture products
 * carry a brand, so this is the ordinary row, not an edge case. The row is a flex line whose last
 * cell is the unit cost, and **`.opt .uc` has `white-space:nowrap` and no `flex-shrink:0`**, so a
 * longer name can squash it below its own content and push the figure out of its box. Nothing in
 * `npm test` can see that: it is layout, and layout is only true when it is measured.
 *
 * ⚠️ THE ASSERTION IS ABOUT THE FIGURE, NOT ABOUT THE TEXT. A costing app may wrap a product name to
 * three lines and lose nothing; it may not clip the number beside it. So this pins `.uc`'s rendered
 * width against its own `scrollWidth`, and its right edge against the dropdown's — and it checks the
 * row really did render the long line first, or the whole thing measures an empty box and passes
 * forever (roster 167/205).
 *
 * 380 because that is Max's phone; 1280 because the same flex row has to hold at the width where
 * `.uc` has room to spare and a regression would therefore be invisible.
 *
 * The browser drive for this batch could not hold a true 380 viewport (it clamped to ~606), which is
 * exactly the gap a spec closes: a width a person cannot reliably reproduce is a width that wants
 * pinning rather than re-driving.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* P0061 is the LONGEST identity line the real fixture can produce — "Cake P/C Choc Brownie With
   Raspberry Frosting G/Fr — Scottish Baker", 67 characters against the 50 it printed before 267.
   The supplier is added in memory rather than to the fixture: the committed catalogue carries none
   (0 of 393), while production has 19, so the worst case a real café reaches is brand AND supplier
   and no fixture row expresses it. Editing the fixture to say otherwise would be a lie about the
   catalogue; setting it here is a stated worst case. */
const PID = 'P0061';
const SUPPLIER = 'Bidfood Toowoomba';

async function openBuilderSearch(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await installBoot(page, { productPatch: { [PID]: { supplier: SUPPLIER } } });
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('cafeDB_cogsPct', '40');
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
    localStorage.setItem('cafeDB_plates', JSON.stringify([]));
    localStorage.setItem('cafeDB_menu', JSON.stringify([]));
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  /* `kitchenIngredients` is a `var` and therefore reachable; the SUPPLIER is not, which is why it
     comes in through installBoot's productPatch. See the note at that option. */
  await page.evaluate((pid) => {
    window.kitchenIngredients.push({ id: 'K9001', name: 'Brownie', pid });
    window.rebuildKById();
  }, PID);
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#newPlateBtn').click();
  await page.waitForTimeout(400);
  await page.locator('#q').fill('Brownie');
  await page.waitForTimeout(400);
}

for (const width of [380, 1280]) {
  test(`the longest identity line does not squash the unit cost beside it @${width}`, async ({ page }) => {
    await openBuilderSearch(page, width);

    const m = await page.evaluate(() => {
      const drop = document.getElementById('drop');
      const row = drop.querySelector('.opt.king-opt');
      if (!row) return { rendered: false };
      const uc = row.querySelector('.uc');
      const ca = row.querySelector('.ca');
      const d = drop.getBoundingClientRect();
      const u = uc.getBoundingClientRect();
      return {
        rendered: true,
        caText: ca.textContent,
        ucText: uc.textContent.trim(),
        ucWidth: u.width,
        ucScrollWidth: uc.scrollWidth,
        ucRight: u.right,
        dropRight: d.right,
        dropLeft: d.left,
        viewportW: document.documentElement.clientWidth,
        // the transform is the other half of the item, and it is only true in the CSSOM
        caTransform: getComputedStyle(ca).textTransform,
      };
    });

    // THE PRECONDITION. Without it every assertion below is about a row that was never drawn.
    expect(m.rendered, 'the search really did produce an option').toBe(true);
    expect(m.caText, 'and it really is printing the long identity line, brand and supplier included')
      .toContain(`Scottish Baker · ${SUPPLIER}`);
    expect(m.ucText, 'and the unit cost cell really has a figure in it').toMatch(/\$/);

    // THE ASSERTION. A name may wrap; a number may not be clipped.
    expect(m.ucWidth, 'the unit cost is not squashed below its own content')
      .toBeGreaterThanOrEqual(m.ucScrollWidth - 0.5);
    expect(m.ucRight, 'and it stays inside the dropdown rather than spilling out of it')
      .toBeLessThanOrEqual(m.dropRight + 0.5);
    expect(m.dropLeft, 'and the dropdown itself is on screen').toBeGreaterThanOrEqual(-0.5);
    expect(m.dropRight, 'at both edges').toBeLessThanOrEqual(m.viewportW + 0.5);

    // and the casing half, measured rather than grepped
    expect(m.caTransform, 'the secondary text is not forced to capitals').toBe('none');
  });
}
