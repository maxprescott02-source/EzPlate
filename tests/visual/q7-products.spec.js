/*
 * q7-products.spec.js — Q7 (v126). The Products list redesign, behaviourally.
 * Locks: one-surface rows at both widths; the Change column renders a seeded drift and "—" for an
 * untouched product; the density toggle drops sub-lines only (never the figure), writes the ONE
 * legal localStorage key, and survives a reload; the floating add shows only under 640px and opens
 * the product modal. Console stays clean.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function boot(page, width) {
  await page.setViewportSize({ width, height: width < 640 ? 780 : 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const b = document.querySelector('.install-banner'); if (b) b.remove();
    // a real logged move on P0108: the Change column must show +12.0%
    window.ingPriceLog['P0108'] = [{ t: Date.now() - 86400000, v: 0.01 }, { t: Date.now(), v: 0.0112 }];
  });
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.renderIngredients());
  await page.waitForTimeout(200);
}

test('rows on one surface, drift renders, density persists @ 1280', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await boot(page, 1280);
  const d = await page.evaluate(() => {
    const list = document.getElementById('ingList');
    const cards = [...document.querySelectorAll('#ingList .ing-card')];
    const drifted = document.querySelector('.ing-card[data-id="P0108"] .ing-drift');
    const untouched = cards.find(c => c.getAttribute('data-id') !== 'P0108')?.querySelector('.ing-drift');
    return {
      surface: getComputedStyle(list).overflow === 'hidden' && getComputedStyle(list).borderTopWidth === '1px',
      oneEdge: new Set(cards.slice(0, 20).map(c => Math.round(c.getBoundingClientRect().left))).size === 1,
      drift: drifted ? drifted.textContent : null,
      driftUp: drifted ? drifted.classList.contains('up') : null,
      dash: untouched ? untouched.textContent : null,
      fabHidden: getComputedStyle(document.getElementById('prodFab')).display === 'none',
    };
  });
  expect(d.surface, 'one bordered clipped surface').toBe(true);
  expect(d.oneEdge, 'rows share one left edge').toBe(true);
  expect(d.drift, 'the logged move renders in Change').toBe('+12.0%');
  expect(d.driftUp, 'a rise is classed up (bad)').toBe(true);
  expect(d.dash, 'untouched products read as a dash').toBe('—');
  expect(d.fabHidden, 'no floating add at desktop').toBe(true);

  // density: compact drops sub-lines only, writes the key, survives reload
  await page.locator('#tab-ingredients .segd[data-density="compact"]').click();
  await page.waitForTimeout(200);
  const compact = await page.evaluate(() => ({
    cls: document.getElementById('ingList').classList.contains('density-compact'),
    key: localStorage.getItem('cafeDB_prodDensity'),
    priceVisible: getComputedStyle(document.querySelector('#ingList .ing-price')).display !== 'none',
  }));
  expect(compact.cls).toBe(true);
  expect(compact.key, 'the ONE legal new localStorage key, holding a preference').toBe('compact');
  expect(compact.priceVisible, 'the figure column never hides').toBe(true);
  await page.reload();
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await page.waitForTimeout(400);
  const persisted = await page.evaluate(() => document.getElementById('ingList').classList.contains('density-compact'));
  expect(persisted, 'the preference survives a reload').toBe(true);
  expect(errs, errs.join('|')).toHaveLength(0);
});

test('mobile: sub-line rows, stacked price+drift, floating add opens the modal @ 380', async ({ page }) => {
  await boot(page, 380);
  const d = await page.evaluate(() => {
    const card = document.querySelector('.ing-card[data-id="P0108"]');
    const price = card.querySelector('.ing-price'), drift = card.querySelector('.ing-drift');
    const compactRowH = null;
    return {
      driftBelowPrice: drift.getBoundingClientRect().top >= price.getBoundingClientRect().bottom - 4,
      fabVisible: getComputedStyle(document.getElementById('prodFab')).display !== 'none',
    };
  });
  expect(d.driftBelowPrice, 'drift stacks under the price on the right').toBe(true);
  expect(d.fabVisible, 'the floating add shows on the phone').toBe(true);
  // compact on mobile: the sub-line hides, the row gets shorter, the price stays
  const before = await page.evaluate(() => document.querySelector('#ingList .ing-card').getBoundingClientRect().height);
  await page.locator('#tab-ingredients .segd[data-density="compact"]').click();
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    h: document.querySelector('#ingList .ing-card').getBoundingClientRect().height,
    meta: getComputedStyle(document.querySelector('#ingList .ing-meta')).display,
    price: getComputedStyle(document.querySelector('#ingList .ing-price')).display,
  }));
  expect(after.h, 'compact rows are shorter').toBeLessThan(before);
  expect(after.meta, 'sub-lines drop').toBe('none');
  expect(after.price, 'the figure column never hides').not.toBe('none');
  await page.locator('#prodFab').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#modal'), 'the floating add opens the new-product modal (#modal — #ingModal is the EDIT modal)').toHaveClass(/open/);
});
