/*
 * v155-products.spec.js — the two halves of the Products item that only a browser can settle.
 *
 * The casing is unit-tested in tests/cat-label.test.js and the column count in v140-products.spec.js.
 * What is here is what needed measuring:
 *
 *  - THE CLEAR × IS SEVEN BUTTONS, NOT ONE. `.plib-x` dresses four (#plateSearchClear,
 *    #menuSearchClear, #kingSearchClear, #ingSearchClear) and `.ms-clear` three more in modals
 *    (#qClear, #ad_searchClear, #king_prodClear). Before this they were plain markup with a click
 *    handler and no show/hide anywhere, so every × sat there permanently offering to clear nothing.
 *    Fixing the Products field alone was the named trap, so the assertion sweeps the CLASSES rather
 *    than an id list — a new search box wearing either class is covered the day it is added.
 *    ⚠ The CSS half is `:not([hidden])` on both classes. Without it this test fails even with the JS
 *    correct, because `.plib-x{display:flex}` is an AUTHOR rule and beats the UA's
 *    `[hidden]{display:none}` on ORIGIN — decided before specificity is compared. That is why the
 *    assertions read COMPUTED DISPLAY and not the `hidden` property: `hidden` was true the whole
 *    time in the broken state, and only the paint disagreed.
 *  - WHICH LABEL YIELDS. Both `.ing-name` and `.ing-brand` were `flex:0 1 auto`, so a long row
 *    truncated BOTH and neither could be read. The name is the identifier, so it stays whole and the
 *    brand gives up its width. Asserted by comparing scrollWidth against clientWidth on the real
 *    catalogue's longest names — reading the flex shorthand proves nothing, because the shrink
 *    outcome depends on the basis widths, not on the factor alone.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function boot(page, w) {
  await page.setViewportSize({ width: w || 1360, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

test('every clear × is hidden while its field is empty — all seven, swept by class', async ({ page }) => {
  await boot(page);
  const found = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.plib-x,.ms-clear').forEach((btn) => {
      const inp = btn.parentElement && btn.parentElement.querySelector('input,textarea');
      out.push({
        id: btn.id,
        hasInput: !!inp,
        value: inp ? inp.value : null,
        display: getComputedStyle(btn).display,
      });
    });
    return out;
  });
  expect(found.length, 'the sweep found the clear buttons at all').toBeGreaterThanOrEqual(7);
  for (const b of found) {
    expect(b.hasInput, `${b.id} has its input as a sibling — the delegation depends on it`).toBe(true);
    if (!b.value) {
      expect(b.display, `${b.id} is on an empty field and must not be painted`).toBe('none');
    }
  }
});

test('typing reveals the ×, and clicking it clears the field and hides it again', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.showTab('ingredients'));
  await page.waitForTimeout(300);

  const display = () => page.evaluate(() => getComputedStyle(document.getElementById('ingSearchClear')).display);
  expect(await display(), 'empty to start').toBe('none');

  await page.fill('#ingSearch', 'bak');
  await page.waitForTimeout(200);
  expect(await display(), 'a value paints the ×').not.toBe('none');

  await page.click('#ingSearchClear');
  await page.waitForTimeout(200);
  expect(await page.inputValue('#ingSearch'), 'the click still clears the field — the original job is intact').toBe('');
  expect(await display(), 'and the × goes away with the value it was offering to clear').toBe('none');
});

test('a programmatic clear hides the × too — not only a typed one', async ({ page }) => {
  /* `clearProductFilters()` sets `.value=''` directly, which fires no `input` event, so the
     delegated listener never sees it. This is the path the "Clear filters" button uses. */
  await boot(page);
  await page.evaluate(() => window.showTab('ingredients'));
  await page.fill('#ingSearch', 'bak');
  await page.waitForTimeout(200);
  await page.evaluate(() => window.clearProductFilters());
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => getComputedStyle(document.getElementById('ingSearchClear')).display)).toBe('none');
});

test('a long product name stays whole and the brand yields its width instead', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => window.showTab('ingredients'));
  await page.waitForTimeout(300);
  // the longest names in the real catalogue; the fixture carries them
  await page.fill('#ingSearch', 'cake p/c');
  await page.waitForTimeout(300);

  const rows = await page.evaluate(() => [...document.querySelectorAll('#ingList > .ing-card')].map((r) => {
    const n = r.querySelector('.ing-name');
    const b = r.querySelector('.ing-brand');
    return {
      name: n.textContent,
      nameClipped: n.scrollWidth > n.clientWidth + 1,
      brandClipped: !!b && b.scrollWidth > b.clientWidth + 1,
      hasBrand: !!b,
    };
  }));
  expect(rows.length, 'the filter matched the long-name rows').toBeGreaterThan(0);
  const clippedBrands = rows.filter((r) => r.brandClipped);
  expect(clippedBrands.length, 'these rows are genuinely tight — otherwise the test proves nothing').toBeGreaterThan(0);
  for (const r of rows) {
    expect(r.nameClipped, `the name is the identifier and stays whole: "${r.name}"`).toBe(false);
  }
});

test('the filter selects are sized to content, not to a share of the row', async ({ page }) => {
  /* `max-width:48%` is a MOBILE rule for two selects sharing a wrapped row. At desktop it resolved
     against the whole row, which is how the category select measured 329px to hold "All categories".
     The mock's own Products row is `<input style="flex:1">` beside a select with no width at all. */
  await boot(page);
  await page.evaluate(() => window.showTab('ingredients'));
  await page.waitForTimeout(300);
  const w = await page.evaluate(() => {
    const box = (id) => Math.round(document.getElementById(id).closest('.plib-selwrap').getBoundingClientRect().width);
    // scoped to the Products pane: a bare `.plib-search` finds the Plates screen's box first, which
    // is display:none and measures 0 — a green-looking selector that proves nothing
    const search = document.querySelector('#tab-ingredients .plib-search');
    return { cat: box('ingCatFilter'), sup: box('ingSupFilter'), search: Math.round(search.getBoundingClientRect().width) };
  });
  expect(w.cat, 'the category select is content-sized, not ~330px').toBeLessThanOrEqual(200);
  expect(w.sup, 'and so is the supplier select').toBeLessThanOrEqual(200);
  expect(w.search, 'the search takes what is left — it is the control that grows').toBeGreaterThan(w.cat);
});
