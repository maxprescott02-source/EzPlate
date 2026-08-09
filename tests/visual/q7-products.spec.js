/*
 * q7-products.spec.js — Q7 (v126). The Products list redesign, behaviourally.
 * Locks: one-surface rows at both widths; the Change column renders a seeded drift and "—" for an
 * untouched product; the floating add shows only under 640px and opens the product modal. Console
 * stays clean.
 * v130: the density-toggle pins are RETIRED ON PURPOSE — Max reversed the toggle on 9 Aug 2026, so
 * what is pinned now is its ABSENCE: no control, no density-compact class, and a stale
 * cafeDB_prodDensity key is actively removed at boot.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function boot(page, width, errs) {
  await page.setViewportSize({ width, height: width < 640 ? 780 : 900 });
  await installBoot(page);
  if (errs) {
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });   // renderIngredients failures surface via console.error, not pageerror
  }
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const b = document.querySelector('.install-banner'); if (b) b.remove();
    // a rise on P0108 (+12.0%), a DROP on P0002 (−8.0%), a supplier on P0108 (the fixture has none),
    // and an unknown-basis product — the four row states the assertions below need
    window.ingPriceLog['P0108'] = [{ t: Date.now() - 86400000, v: 0.01 }, { t: Date.now(), v: 0.0112 }];
    window.ingPriceLog['P0002'] = [{ t: Date.now() - 86400000, v: 0.02 }, { t: Date.now(), v: 0.0184 }];
    // PRODUCTS/byId are `let`, not window props — go through the real writer (offline: pushWrite no-ops)
    window.setProduct('P0108', { supplier: 'Bidfood' });
    window.setProduct('P0002', { base_unit: 'unknown' });
  });
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => window.renderIngredients());
  await page.waitForTimeout(200);
}

test('rows on one surface, drift renders, the density toggle is gone @ 1280', async ({ page }) => {
  const errs = [];
  await boot(page, 1280, errs);
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
      down: document.querySelector('.ing-card[data-id="P0002"] .ing-drift')?.textContent,
      downCls: document.querySelector('.ing-card[data-id="P0002"] .ing-drift')?.classList.contains('down'),
      dashCls: untouched ? untouched.classList.contains('none') : null,
      dash: untouched ? untouched.textContent : null,
      supShown: !!document.querySelector('.ing-card[data-id="P0108"] .ing-tag.sup'),
      basisFlag: document.querySelector('.ing-card[data-id="P0002"] .ing-per')?.textContent || null,
      fabHidden: getComputedStyle(document.getElementById('prodFab')).display === 'none',
    };
  });
  expect(d.surface, 'one bordered clipped surface').toBe(true);
  expect(d.oneEdge, 'rows share one left edge').toBe(true);
  expect(d.drift, 'the logged move renders in Change').toBe('+12.0%');
  expect(d.driftUp, 'a rise is classed up (bad)').toBe(true);
  expect(d.dash, 'untouched products read as a dash').toBe('—');
  expect(d.dashCls, 'and carry the .none class').toBe(true);
  expect(d.down, 'a price DROP renders with the true minus sign').toBe('−8.0%');
  expect(d.downCls, 'and is classed down (good)').toBe(true);
  expect(d.supShown, 'the supplier column renders when a product has one').toBe(true);
  expect(d.basisFlag, 'an unknown base_unit keeps its v99 correctness flag beside the figure').toBeTruthy();
  expect(d.fabHidden, 'no floating add at desktop').toBe(true);

  // v130: the toggle is GONE — no control, one row height, and a stale key from a device that had
  // the toggle is removed at boot rather than left as dead storage
  await expect(page.locator('.seg-density, .segd'), 'no density control anywhere').toHaveCount(0);
  const gone = await page.evaluate(() => ({
    cls: document.getElementById('ingList').classList.contains('density-compact'),
    key: localStorage.getItem('cafeDB_prodDensity'),
  }));
  expect(gone.cls, 'no density-compact class survives').toBe(false);
  expect(gone.key, 'the retired key is not written').toBe(null);
  await page.evaluate(() => localStorage.setItem('cafeDB_prodDensity', 'compact'));
  await page.reload();
  await page.waitForTimeout(1500);
  const cleaned = await page.evaluate(() => localStorage.getItem('cafeDB_prodDensity'));
  expect(cleaned, 'a stale key from the toggle era is actively removed at boot').toBe(null);
  expect(errs.filter(e => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'console clean').toHaveLength(0);
});

test('mobile: sub-line rows, stacked price+drift, floating add opens the modal @ 380', async ({ page }) => {
  const errs = [];
  await boot(page, 380, errs);
  const d = await page.evaluate(() => {
    const list = document.getElementById('ingList');
    const card = document.querySelector('.ing-card[data-id="P0108"]');
    const price = card.querySelector('.ing-price'), drift = card.querySelector('.ing-drift');
    return {
      surface: getComputedStyle(list).overflow === 'hidden' && getComputedStyle(list).borderTopWidth === '1px',
      driftBelowPrice: drift.getBoundingClientRect().top >= price.getBoundingClientRect().bottom - 4,
      fabVisible: getComputedStyle(document.getElementById('prodFab')).display !== 'none',
      fabRect: document.getElementById('prodFab').getBoundingClientRect().bottom <= innerHeight,
    };
  });
  expect(d.surface, 'one bordered clipped surface at phone width too').toBe(true);
  expect(d.driftBelowPrice, 'drift stacks under the price on the right').toBe(true);
  expect(d.fabVisible, 'the floating add shows on the phone').toBe(true);
  expect(d.fabRect, 'and sits inside the viewport (not parked in the animated tab)').toBe(true);
  // v130: no density control on mobile either; the sub-line always renders
  await expect(page.locator('.seg-density, .segd'), 'no density control at phone width').toHaveCount(0);
  const meta = await page.evaluate(() => getComputedStyle(document.querySelector('#ingList .ing-meta')).display);
  expect(meta, 'the sub-line renders at the one row height').not.toBe('none');
  await page.locator('#prodFab').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#modal'), 'the floating add opens the new-product modal (#modal — #ingModal is the EDIT modal)').toHaveClass(/open/);
  expect(errs.filter(e => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'console clean').toHaveLength(0);
});
