/*
 * v192-touch-targets.spec.js — step 4 of Max's Phase 2 plan (R5+R6): ≤767 touch targets.
 *
 * The mechanism under test is INVISIBLE by design (padding+negative-margin, and ::after
 * extensions), so every assertion here is a REAL HIT TEST — document.elementFromPoint at a
 * point OUTSIDE the visual box — never a computed-style read. A computed-style probe proves a
 * declaration reached the element, not that it does anything (batch 232's clamp lesson).
 *
 * Two deliberate shapes:
 *  - `.pchip`'s boundingBox is asserted SMALL (≤32px): the ::after extension must not show up
 *    in layout. If someone "simplifies" it to padding, the box grows, this goes red, and the
 *    failure names the rule: the chip paints a dashed border, so padding is a visual change.
 *  - `.range-btn` keeps its 32px visual box (Max's deferred taste call, MAINTENANCE 31 Jul
 *    2026); only the item-7 ::after deepens at ≤767 (±6 → ±8), because the nominal ±6 measured
 *    ~±4.6 once the pseudo's box was pixel-snapped against the row's sub-pixel y. The hit test
 *    here is at 700px — the 640-767 band the audit read as a bare 32px.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: 1 }] }
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 9, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' }
  ]));
};

/* hit(page, x, y, selector): does the topmost element at (x,y) sit inside selector? */
async function hit(page, x, y, selector) {
  return page.evaluate(([px, py, sel]) => {
    const el = document.elementFromPoint(px, py);
    return !!(el && el.closest(sel));
  }, [x, y, selector]);
}

/* clientBox: scroll the element into view, then return its VIEWPORT-relative rect —
   elementFromPoint answers in viewport coordinates and returns null off-screen, so probing
   a boundingBox that was measured while the element sat below the fold hits nothing. */
async function clientBox(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  return locator.evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
}

test('builder row: the remove × and the pack chip reach 44px effective, and the chip edit still takes caret taps', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width: 390, height: 844 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
    const b = document.querySelector('.install-banner'); if (b) b.remove();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .plib-row').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('#builderPage')).toBeVisible();

  const rm = page.locator('#lines .bld-row:not(.is-misc) .bld-rm').first();
  const rmBB = await rm.boundingBox();
  // padding participates in the border box, so the padded × MUST measure ≥42×44 here —
  // this is the half boundingBox CAN see, and the audit measured 15.5×36. (42, not 44:
  // fresh-states pins the × inside the row edge and the pchip owns the column gap's far
  // side, so 42.5 is every pixel the row geometry has to give.)
  expect(rmBB.width).toBeGreaterThanOrEqual(42);
  expect(rmBB.height).toBeGreaterThanOrEqual(44);
  // …and the padded corners really take the tap (nothing overlays them)
  expect(await hit(page, rmBB.x + 2, rmBB.y + 2, '.bld-rm')).toBe(true);
  expect(await hit(page, rmBB.x + 2, rmBB.y + rmBB.height - 2, '.bld-rm')).toBe(true);

  const chip = page.locator('#lines .pchip').first();
  const chipBB = await chip.boundingBox();
  // the chip's VISUAL box is unchanged — the extension is an ::after, invisible to layout.
  // If this grows past 32, the fix became a visual change and the rule's comment says why not.
  expect(chipBB.height).toBeLessThanOrEqual(32);
  // effective hit: 6px above and below the visual box still lands on the chip
  const cx = chipBB.x + chipBB.width / 2;
  expect(await hit(page, cx, chipBB.y - 6, '.pchip')).toBe(true);
  expect(await hit(page, cx, chipBB.y + chipBB.height + 6, '.pchip')).toBe(true);
  // the × must NOT have annexed the chip: the chip's own right edge still belongs to it
  expect(await hit(page, chipBB.x + chipBB.width - 2, chipBB.y + chipBB.height / 2, '.pchip')).toBe(true);

  // open the inline price edit: the ::after stands down (:focus-within), so a tap INSIDE the
  // .pin input reaches the input — a positioned ::after would otherwise paint above it,
  // eat the caret tap, blur the input and commit the edit early.
  await chip.click();
  await page.waitForTimeout(200);
  const pin = page.locator('#lines .pchip .pin').first();
  await expect(pin).toBeFocused();
  const pinBB = await pin.boundingBox();
  expect(await hit(page, pinBB.x + pinBB.width / 2, pinBB.y + pinBB.height / 2, '.pin')).toBe(true);

  expect(errs).toEqual([]);
});

test('range buttons: 44px effective in the 640-767 band the audit read as 32px', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const now = Date.now(), d = 86400000;
    const vals = [38.2, 39.1, 40.4, 41.2, 40.8, 39.6];
    window.priceHistory = vals.map((v, i) => ({ t: new Date(now - (vals.length - 1 - i) * 7 * d).toISOString(), v }));
    window.showTab('dashboard');
    const b = document.querySelector('.install-banner'); if (b) b.remove();
  });
  await page.waitForTimeout(600);
  const btn = page.locator('.range-btn:not(.act)').first();
  const bb = await btn.boundingBox();
  // visual size is Max's deferred taste call (MAINTENANCE, 31 Jul 2026) — pinned unchanged…
  expect(bb.height).toBeLessThanOrEqual(34);
  // …while the deepened ::after makes 5px beyond either edge still hit the button.
  // 5, not 8: pixel snapping eats ~1.4px per edge (measured), and the assertion pins
  // "44 effective", not the CSS number that produces it.
  const cx = bb.x + bb.width / 2;
  expect(await hit(page, cx, bb.y - 5, '.range-btn')).toBe(true);
  expect(await hit(page, cx, bb.y + bb.height + 5, '.range-btn')).toBe(true);
});

test('text links: the linklike family and the prose privacy links take taps well beyond their line', async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const b = document.querySelector('.install-banner'); if (b) b.remove();
  });

  // The BUTTON members of .linklike (wizard Skip, Clear search & filters, tidy's row
  // actions) already clear 44 via the base `button{min-height:44px}` floor — a first cut
  // of this test probed `.es-clear` and the hand-run mutation proved that assertion could
  // not fail. What this batch changes is the ANCHORS, so the probes are all anchors.

  // a.linklike — the tel: contact link on Settings → About
  await page.evaluate(() => window.showTab('settings'));
  await page.waitForTimeout(400);
  const tel = page.locator('a.linklike[href^="tel:"]');
  const tb = await clientBox(page, tel);
  // padding is in the border box: the measured box itself must now clear 44
  expect(tb.height).toBeGreaterThanOrEqual(44);
  expect(await hit(page, tb.x + tb.width / 2, tb.y + 2, 'a.linklike')).toBe(true);
  expect(await hit(page, tb.x + tb.width / 2, tb.y + tb.height - 2, 'a.linklike')).toBe(true);

  // the prose privacy link ("What is sent" on the Invoices dropzone) — inline anchor,
  // vertical padding only, so its box grows without moving a line of text
  await page.evaluate(() => window.showTab('invoices'));
  await page.waitForTimeout(400);
  const link = page.locator('#invzPrivacyLink');
  const lb = await clientBox(page, link);
  expect(lb.height).toBeGreaterThanOrEqual(44);
  expect(await hit(page, lb.x + lb.width / 2, lb.y + 2, '#invzPrivacyLink')).toBe(true);
  expect(await hit(page, lb.x + lb.width / 2, lb.y + lb.height - 2, '#invzPrivacyLink')).toBe(true);
});
