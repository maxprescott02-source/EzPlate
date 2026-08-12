/*
 * fresh-states.spec.js — screenshots of FRESH-INSTALL states (v44).
 *
 * The stock screenshots.spec.js talks to live Supabase, so on real data the
 * empty states never render. This spec blocks all off-origin requests and
 * starts with clean storage, so we can verify layouts that only exist on a
 * fresh install — e.g. the Menu tab's "No menu items yet" empty card, whose
 * mobile centring regressed repeatedly (root-caused in v44: the atable
 * card-collapse td:first-child padding beat .an-empty's reset on specificity).
 *
 * Run: npm run shots  (writes to tests/visual/__shots__/)
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

// v54: the Builder tab became the Plates library. F7 (v146): the builder is the full page #builderPage
// (it was the #builderModal popup from v54 to v145). Tests that drive #lines must OPEN
// that popup first (openBuilder resets the plate, so open BEFORE adding lines). This helper navigates to
// the Plates tab and opens a fresh builder.
async function openFreshBuilder(page) {
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(200);
  await page.locator('#newPlateBtn').click();
  await page.waitForTimeout(300);
}

/* viewport-only (not fullPage) header shots — the review artifact for the header/button work.
   171: `more` joins the set, because its header is a new one and the shots are what get LOOKED at.
   gotoTab drives Products through More at this width, which is now its only route. */
for (const tab of ['pantry', 'ingredients', 'builder', 'more']) {
  test(`fresh ${tab} header @ mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 780 });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await gotoTab(page, tab);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/visual/__shots__/fresh-${tab}-mobile.png` });
    await expect(page.locator('body')).toBeVisible();
  });
}

test('v44 item 8: builder lines render as name row + costs row @ 380px', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await openFreshBuilder(page);
  // drive the real add paths (global fns): one product line + one misc line
  await page.evaluate(() => {
    window.addProduct('P0108'); window.addMiscCost();
    const ml = document.querySelector('.misc-name'); if (ml) { ml.value = 'Packaging + napkins'; ml.dispatchEvent(new Event('input', { bubbles: true })); }
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.waitForTimeout(300);
  await page.locator('#lines').screenshot({ path: 'tests/visual/__shots__/builder-lines-mobile.png' });
  /* F7 (v146): the v44 two-row `.top`/`.costs` split is gone with the docket. §6's phone row
     stacks name / qty / unit cost down the left with the line cost right, so the line total is
     still on the row and still has to fit — that is what these two assertions were for, and they
     are re-pointed rather than dropped. */
  const lc = await page.evaluate(() => {
    const el = document.querySelector('.bld-row .bld-lc');
    return el ? { right: el.getBoundingClientRect().right, w: el.getBoundingClientRect().width } : null;
  });
  expect(lc, 'line total must render on the row').not.toBeNull();
  expect(lc.w, 'line total must have real width').toBeGreaterThan(10);
  expect(lc.right, 'line total must fit inside the 380px viewport').toBeLessThanOrEqual(380);
  /* v69 (Max, reverses v60's "no name field"): the misc line's name is EDITABLE and must read
     without truncation at 380px. F7 keeps the v67 principle — a misc line is a SIBLING of an
     ingredient row, same skeleton — and the assertions follow it into the new one: the name field
     shares its band with the $ input, and the $ input IS the line total (there is no second one). */
  const misc = await page.evaluate(() => {
    const line = document.querySelector('.bld-row.is-misc');
    const mid = el => { const r = el.getBoundingClientRect(); return (r.top + r.bottom) / 2; };
    const name = line.querySelector('.misc-name'), box = line.querySelector('.misc-costbox'),
          rm = line.querySelector('.bld-rm');
    return {
      totals: line.querySelectorAll('.bld-lc').length,     // the $ input's cell is the only total
      qtyCells: line.querySelectorAll('.bld-qty').length,  // a misc line has no quantity
      nameW: name.getBoundingClientRect().width,
      nameBoxRow: Math.abs(mid(name) - mid(box)),          // name field and $ share a band
      boxRight: box.getBoundingClientRect().right, rmRight: rm.getBoundingClientRect().right,
      lineRight: line.getBoundingClientRect().right,
    };
  });
  expect(misc.totals, 'no duplicate total — the $ input is the total').toBe(1);
  expect(misc.qtyCells, 'a misc line offers no quantity control').toBe(0);
  expect(misc.nameW, 'restored name field keeps usable width at 380px (no truncation)').toBeGreaterThan(120);
  expect(misc.nameBoxRow, 'name field and $ input share a band').toBeLessThanOrEqual(3);
  expect(misc.boxRight, '$ input sits inside the row edge').toBeLessThanOrEqual(misc.lineRight);
  expect(misc.rmRight, 'nothing clips the row').toBeLessThanOrEqual(misc.lineRight);
});

test('v44 items 1+3: unified pack control (both moods) + pills on the title baseline', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    // three moods: taught/matched pack row, unit-mismatch (required), price-change pill row
    window.invRows = [
      { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108',
        unitPrice: 2.68, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
        addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false,
        remembered: true, taughtQty: 15, taughtUnit: 'kg' },
      { name: 'CHEESE TASTY SHRED 2KG', raw: 'CHEESE TASTY SHRED 2KG', bestId: 'P0031',
        unitPrice: null, unit: null, conf: 0.7, tier: 'mid', cands: [{ id: 'P0031', coverage: 0.7 }],
        addNew: false, manualPick: false, needManual: true, unitMismatch: true, uncertain: false, remembered: false },
      { name: 'MILK FULL CREAM 2L', raw: 'MILK FULL CREAM 2L', bestId: 'P0201',
        unitPrice: 9.99, unit: 'l', conf: 0.9, tier: 'hi', cands: [{ id: 'P0201', coverage: 0.9 }],
        addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
    ];
    window.invRows.forEach(window.flagNeedsAttention);
    window.renderInvReview();
    document.getElementById('invModal').classList.add('open');
  });
  await page.waitForTimeout(400);
  const rows = page.locator('#invReview tr.inv-data');
  // ONE control, no chip, ✓ always present, both moods
  await expect(page.locator('.remembered-chip')).toHaveCount(0);
  await expect(rows.nth(0).locator('.pack-teach:not(.hidden)')).toHaveCount(1);
  await expect(rows.nth(0).locator('.pt-done')).toBeVisible();
  await expect(rows.nth(0).locator('.invPackQty')).toHaveValue('15');       // prefilled with the taught pack
  await expect(rows.nth(1).locator('.pack-teach.pt-required')).toHaveCount(1); // mismatch = same control, red mood
  await expect(rows.nth(1).locator('.pt-done')).toBeVisible();
  await page.screenshot({ path: 'tests/visual/__shots__/inv-pack-unified.png', fullPage: true });
  await rows.nth(1).screenshot({ path: 'tests/visual/__shots__/inv-pack-mismatch.png' });
  await rows.nth(2).screenshot({ path: 'tests/visual/__shots__/inv-pill-row.png' });
});

test('v44 item 6b: tapping an ingredient card opens Edit; Remove lives in the modal and confirms on top', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  // seed one kitchen word against a base product, then paint the pantry
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById(); window.renderKitchenPanel();
  });
  await page.locator('.navbtn[data-tab="pantry"]').click();
  await page.waitForTimeout(300);
  const card = page.locator('.king-row[data-kid="K1"]');
  await expect(card).toHaveAttribute('role', 'button');
  await expect(card.locator('.king-acts')).toHaveCount(0);          // no visible Edit/Remove links
  await card.click();                                               // tap anywhere on the card
  await expect(page.locator('#kingModal')).toHaveClass(/open/);
  await expect(page.locator('#kingModalTitle')).toHaveText('Edit ingredient');
  const remove = page.locator('#kingModalRemove');
  await expect(remove).toBeVisible();
  await page.screenshot({ path: 'tests/visual/__shots__/king-edit-modal.png' });
  await remove.click();                                             // modal closes, the used-in-N confirm opens on top
  await expect(page.locator('#kingModal')).not.toHaveClass(/open/);
  await expect(page.locator('#confirmModal')).toHaveClass(/open/);
  await page.locator('#confirmOk').click();
  await expect(page.locator('.king-row[data-kid="K1"]')).toHaveCount(0);   // really removed via the existing flow
});

test('v44 dark theme: builder lines + pack control still read correctly', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await openFreshBuilder(page);
  await page.evaluate(() => { window.addProduct('P0108'); window.addMiscCost(); });
  await page.waitForTimeout(300);
  await page.locator('#lines').screenshot({ path: 'tests/visual/__shots__/builder-lines-dark.png' });
  await page.evaluate(() => {
    window.invRows = [
      { name: 'CHEESE TASTY SHRED 2KG', raw: 'CHEESE TASTY SHRED 2KG', bestId: 'P0031',
        unitPrice: null, unit: null, conf: 0.7, tier: 'mid', cands: [{ id: 'P0031', coverage: 0.7 }],
        addNew: false, manualPick: false, needManual: true, unitMismatch: true, uncertain: false, remembered: false },
    ];
    window.invRows.forEach(window.flagNeedsAttention);
    window.renderInvReview();
    document.getElementById('invModal').classList.add('open');
  });
  await page.waitForTimeout(300);
  await page.locator('#invReview tr.inv-data').first().screenshot({ path: 'tests/visual/__shots__/inv-pack-mismatch-dark.png' });
  await expect(page.locator('body')).toBeVisible();
});

// REMOVED (v70): "v44 item 9: Save draft parks the plate under Unassigned dishes" tested the holding-area
// (MENU_UNASSIGNED) machinery, which v54 deleted entirely ("no holding area; zero menus is a legitimate
// state"). There is no Save-draft button and no MENU_UNASSIGNED option anymore — the test asserted a feature
// that no longer exists, so it is dropped rather than rewritten.

/* F9 (v148) rewrote this test, and the rewrite is stricter than the original in two ways.
   The v44 finding was that the clear-cache confirm opened UNDER the Settings modal; Settings is a
   SCREEN now, so the confirm opens over ordinary page content and the z-index race it lost cannot
   happen the same way. What still has to be true is that the confirm reached from this screen is
   the thing the user can tap.
   Stricter, because the original added `.open` BY HAND — a state the app itself was never driven
   into, which is the "a test that asserts against a state no user can reach" defect this repo has
   recorded before. This drives the real button, and the real button is on the real screen. */
test('v44 item 6: the clear-cache confirm reached from Settings is what the user can tap', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  await gotoTab(page, 'settings');   // 171: the gear is deleted — More → Settings is the phone's route now
  await page.waitForTimeout(400);
  await expect(page.locator('#tab-settings')).toBeVisible();
  await page.locator('#setClearCache').click();        // the real control, not a hand-set class
  await page.waitForTimeout(400);
  // whichever layer owns the centre pixel is the one the user can tap
  const topOwner = await page.evaluate(() => {
    const el = document.elementFromPoint(190, 390);
    return el && el.closest('#confirmModal') ? 'confirm'
         : el && el.closest('#tab-settings') ? 'settings-screen' : (el ? el.id || el.className : 'none');
  });
  await page.screenshot({ path: 'tests/visual/__shots__/confirm-over-settings.png' });
  expect(topOwner, 'the confirm must be tappable above the Settings screen').toBe('confirm');
  // and it must NOT be confirmed here — Clear reloads the app
  await page.keyboard.press('Escape');
});

/* ===== v45 finishing touches ===== */

const V45_INV_ROWS = `window.invRows = [
  { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG 45.60', bestId: 'P0108',
    unitPrice: 3.04, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
    addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false,
    remembered: true, taughtQty: 15, taughtUnit: 'kg' },
  { name: 'CHEESE TASTY SHRED 2KG', raw: 'CHEESE TASTY SHRED 2KG 28.90', bestId: 'P0031',
    unitPrice: null, unit: null, conf: 0.7, tier: 'mid', cands: [{ id: 'P0031', coverage: 0.7 }],
    addNew: false, manualPick: false, needManual: true, unitMismatch: true, uncertain: false, remembered: false },
];
window.invRows.forEach(window.flagNeedsAttention);
window.renderInvReview();
document.getElementById('invModal').classList.add('open');`;

for (const size of SIZES) {
  test(`v45 item 1: pack control ${size.name} — ${size.name === 'desktop' ? 'one line' : 'two centred lines'} + preview line beneath`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(V45_INV_ROWS);
    await page.waitForTimeout(300);
    const row = page.locator('#invReview tr.inv-data').first();
    const geo = await row.evaluate(tr => {
      const price = tr.querySelector('.uprice-edit').getBoundingClientRect();
      const pack = tr.querySelector('.pack-teach').getBoundingClientRect();
      const pv = tr.querySelector('.pt-preview');
      const pvr = pv ? pv.getBoundingClientRect() : null;
      return { price, pack, pvText: pv ? pv.textContent : null, pvTop: pvr ? pvr.top : null,
               priceBottom: price.bottom, packTop: pack.top };
    });
    if (size.name === 'desktop') {
      // one line: price field and pack row vertically overlap
      expect(geo.pack.top, 'pack row shares the price line on desktop').toBeLessThan(geo.price.bottom);
    } else {
      // two lines: pack row starts below the price field
      expect(geo.pack.top, 'pack row stacks under the price on mobile').toBeGreaterThanOrEqual(geo.priceBottom - 1);
    }
    // the derive preview is its own line under BOTH layouts, prefilled before any typing
    expect(geo.pvText, 'preview line exists').not.toBeNull();
    expect(geo.pvText, 'preview prefilled from the taught pack').toContain('will be $3.04/kg');
    expect(geo.pvTop, 'preview sits beneath the pack row').toBeGreaterThanOrEqual(geo.pack.bottom - 1);
    // no chip remains anywhere
    await expect(page.locator('.pack-teach .pt-preview')).toHaveCount(0);
    // item 2: the reworded mismatch banner on the second row
    await expect(page.locator('#invReview tr.inv-data').nth(1).locator('.pt-explain'))
      .toContainText('edit the pack size to determine price per unit');
    await page.screenshot({ path: `tests/visual/__shots__/v45-pack-${size.name}.png`, fullPage: true });
  });
}

test('v45 items 6+7: builder decluttered and fits 380px with a multi-ingredient plate', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await openFreshBuilder(page);
  await page.evaluate(() => {
    // the exact case that broke: several real lines — kid line, direct products, misc
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
    window.addKitchenLine('K1');
    window.addProduct('P0004');   // branded product (subtitle = supplier only now)
    window.addProduct('P0005');   // per-unit priced
    window.addMiscCost();
    const ml = document.querySelector('.misc-name'); if (ml) { ml.value = 'Packaging + napkins'; ml.dispatchEvent(new Event('input', { bubbles: true })); }
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.waitForTimeout(300);
  // declutter: no badges, no ingredient pill, subtitle has no category tail
  await expect(page.locator('#lines .edited')).toHaveCount(0);
  await expect(page.locator('#lines .king-tag')).toHaveCount(0);
  await expect(page.locator('#lines .row2')).toHaveCount(0);
  const directSub = await page.locator('.bld-row:not(.is-misc):not([data-uid="1"]) .bld-sub').nth(0).textContent();
  expect(directSub, 'direct-product subtitle is supplier only').not.toContain('·');
  /* overflow regression: every total fits inside its ROW's content box. A viewport-only check
     lets a total sit on the row's border and still "pass", which is what let it escape once.
     F7: the dotted leader half of this went with the docket — there is no connector to keep. */
  const fit = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#lines .bld-row').forEach(line => {
      const lr = line.getBoundingClientRect(), cs = getComputedStyle(line);
      const lc = line.querySelector('.bld-lc');
      if (lc) out.push({ overflow: lc.getBoundingClientRect().right - (lr.right - parseFloat(cs.paddingRight)) });
    });
    return { rows: out, scrollW: document.scrollingElement.scrollWidth };
  });
  expect(fit.rows.length, 'rows rendered to measure').toBeGreaterThan(0);
  for (const r of fit.rows) {
    expect(r.overflow, 'line total stays inside the row content box').toBeLessThanOrEqual(0.5);
  }
  expect(fit.scrollW, 'no horizontal scroll at 380px').toBeLessThanOrEqual(380);
  /* the misc "$" hugs its input. v45's version reached for `.misc-costbox .u`, the 32px unit
     gutter the ingredient row lent it; F7 (v146) gives the $ its own class rather than borrowing
     a width that then has to be un-set (`.bld-dollar`). Same assertion, same reason. */
  const gap = await page.evaluate(() => {
    const u = document.querySelector('.misc-costbox .bld-dollar').getBoundingClientRect();
    const inp = document.querySelector('.misc-costbox input').getBoundingClientRect();
    return inp.left - u.right;
  });
  expect(gap, 'misc $ sits close to its field').toBeLessThanOrEqual(6);
  await page.locator('#lines').screenshot({ path: 'tests/visual/__shots__/v45-builder-380.png' });
});

/* v45 item 3 REPLACED by F3 (v139). Its premise — title, then a divider, then a buttons row, then
   a strapline BELOW them — was the old panel skeleton, and the v3 header bar (§2) is one row: title,
   muted subtitle, actions right, hairline on the bar itself. Asserting the old stacking order would
   now assert the conversion had not happened. What survives is the part that was ever load-bearing:
   the header is ONE row and it carries the divider. */
/* 179: 360 joins 380 here (Max, 12 Aug 2026 — "yes it should be"). It is the width at which this
   screen's header was measured WRAPPED on `main`, so it is the one that would have caught it had
   anything ever measured it. The wizard is forced visible in the loop for the same reason
   v158-header-actions.spec.js does it: the fixture seeds no unlinked-product state, Scoopy's
   catalogue always has one, and that gap is why a green suite never saw the defect. */
for (const mw of [360, 380]) {
test(`F3 at ${mw}: the Ingredients header is the v3 one-row bar, not a stacked skeleton`, async ({ page }) => {
  await page.setViewportSize({ width: mw, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="pantry"]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => { const w = document.getElementById('kingWizBtn'); if (w) w.style.display = ''; });
  await page.waitForTimeout(100);
  const head = await page.evaluate(() => {
    const bar = document.querySelector('#tab-pantry .scr-head');
    const r = (el) => el.getBoundingClientRect();
    const title = bar.querySelector('h2'), btn = document.getElementById('kingNew');
    return {
      divider: getComputedStyle(bar).borderBottomWidth,
      titleDivider: getComputedStyle(title).borderBottomWidth,
      sameRow: Math.abs(r(title).top - r(btn).top) < r(btn).height,
      subShown: getComputedStyle(bar.querySelector('.scr-sub')).display,
      strapline: document.querySelectorAll('#tab-pantry .king-sub').length,
      /* 179: §6's "one action max" is now literally true here, and the wizard is one line lower
         rather than gone — the half of the pair that a height check alone would not distinguish. */
      actions: [...bar.querySelectorAll('button')].filter((b) => !b.classList.contains('scr-back')).length,
      wizHome: document.getElementById('kingWizBtn').parentElement.id,
      wizShown: getComputedStyle(document.getElementById('kingWizBtn')).display !== 'none',
    };
  });
  expect(head.divider, 'the hairline belongs to the bar').toBe('1px');
  expect(head.titleDivider, 'and no longer to the title').toBe('0px');
  expect(head.sameRow, 'title and action share one row').toBe(true);
  expect(head.subShown, 'no subtitle on the phone — title plus one action (§6)').toBe('none');
  expect(head.strapline, 'the strapline moved into the empty state (R3), it is not a second header line').toBe(0);
  expect(head.actions, `§6: one action in the bar at ${mw}`).toBe(1);
  expect(head.wizHome, 'the wizard is rehomed, not dropped').toBe('kingControls');
  expect(head.wizShown, 'and it is still on screen — this screen is at zero ingredients, which is exactly when it matters').toBe(true);
});
}

/* THE DESKTOP PAIR, which 179 leaves alone on purpose: the mock allows a desktop header to carry
   both, so above 767 syncHeaderActions puts the wizard back beside the primary and this measures
   that it lands as a PAIR at the right, not stranded beside the title.
   The original rule right-aligned `.btn` only, and "Set up from products" is a `.plib-btn2` — it
   stayed beside the title with 393px of dead space before the primary. Neither direction had a
   test. Measured at desktop, where the gap exists — and now also the assertion that would catch a
   restore that appended to the wrong place. */
test('F3: the two Ingredients actions are a right-hand pair at desktop', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="pantry"]').click();
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.waitForTimeout(300);
  const pair = await page.evaluate(() => {
    const r = (el) => el.getBoundingClientRect();
    const wiz = document.getElementById('kingWizBtn'), nw = document.getElementById('kingNew');
    if (getComputedStyle(wiz).display === 'none') return null;
    return {
      between: r(nw).left - r(wiz).right,
      fromTitle: r(wiz).left - r(document.querySelector('#tab-pantry .scr-head h2')).right,
      sameRow: Math.abs(r(wiz).top - r(nw).top) < r(nw).height,
    };
  });
  expect(pair, 'the fixture has unlinked products, so the wizard button is showing').not.toBeNull();
  expect(pair.sameRow, 'both actions share the bar').toBe(true);
  expect(pair.between, 'the two actions sit together as a pair, not at opposite ends').toBeLessThan(24);
  expect(pair.fromTitle, 'and the pair is pushed to the right, away from the title').toBeGreaterThan(100);
  await page.screenshot({ path: 'tests/visual/__shots__/v139-pantry-header.png' });
});

/* F4 (v140) HONEST REWRITE. This pinned v45's shortening idiom on the Products primary: `+ New` on
   a phone, `+ New product` at desktop, via `.btn-noun`. The v3 header supersedes BOTH halves for a
   converted screen's primary — §7 allows one label per intent, so "New product" reads the same at
   every width, exactly as Plates says "New plate" and Ingredients says "New ingredient". The idiom
   is NOT dead: it still shortens SECONDARY actions, which is what the new middle assertion covers,
   and the unconverted Menu tab's full-label-on-mobile pin is untouched. */
test('v45 item 4 / F4: primaries say one thing at every width; secondaries still shorten', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await gotoTab(page, 'ingredients');   // 171: Products is under More below 1024 — drive the real route at the real width
  await page.waitForTimeout(300);
  expect((await page.locator('#newBtn').innerText()).trim(), 'the converted primary does not shorten').toBe('New product');
  expect((await page.locator('#importBtn').innerText()).trim(), 'the SECONDARY still shortens — the idiom survives where the room is tight').toBe('Import');
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  // v100: reconciled with the v86 dish→plate terminology pass — the app has said "Existing plate"
  // since then; this pin was stale (red on unmodified main from v86 to v99).
  // F5 (v142): Menu is converted, so the "+" goes the way it went on every other converted screen
  // (the mock's buttons carry no plus). The WORDS stay put at both widths, which is the assertion
  // that matters here: the mock's own "Add existing plate" wrapped the 380px header onto two lines,
  // and a label that changes between breakpoints is exactly what §7 forbids.
  expect((await page.locator('#menuAddDishBtn').innerText()).trim(), 'the converted secondary does not shorten either — it already fits').toBe('Existing plate');
  await page.setViewportSize({ width: 1280, height: 900 });
  await gotoTab(page, 'ingredients');   // 171: Products is under More below 1024 — drive the real route at the real width
  await page.waitForTimeout(300);
  expect((await page.locator('#newBtn').innerText()).trim(), 'and the same words at desktop').toBe('New product');
  expect((await page.locator('#importBtn').innerText()).trim(), 'desktop gives the secondary its noun back').toBe('Import invoice');
});

// REMOVED (v70): "v45 item 5: dashboard target line keeps consistent headroom on every range" asserted the
// OLD always-draw-the-target rule (target is the topmost line with headroom on every range). v60 SUPERSEDED
// this — the y-domain now FITS THE DATA and the target line shows only when it's in view (else v61 draws
// nothing). Its whole premise (data forced below the target, target still drawn) is now invalid. The current
// domain/target contract is pinned by the node suite (trend-domain.test.js + trend-ticks), so this stale
// Playwright test is dropped rather than rewritten to duplicate them.

/* ===== v46 Fable UX polish ===== */

const V46_INV_ROWS = `window.invRows = [
  { name: 'MILK 2L', raw: 'MILK 2L 9.99', bestId: 'P0201',
    unitPrice: 9.99, unit: 'l', conf: 0.9, tier: 'hi', cands: [{ id: 'P0201', coverage: 0.9 }],
    addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
  { name: 'BACON MIDDLE RINDLESS GAS FLUSHED QLD CATERERS CHOICE PREMIUM SELECT 2.5KG', raw: 'BACON 2.5KG 28.90', bestId: 'P0031',
    unitPrice: null, unit: null, conf: 0.7, tier: 'mid', cands: [{ id: 'P0031', coverage: 0.7 }],
    addNew: false, manualPick: false, needManual: true, unitMismatch: true, uncertain: false, remembered: false },
];
window.invRows.forEach(window.flagNeedsAttention);
window.renderInvReview();
document.getElementById('invModal').classList.add('open');`;

for (const size of SIZES) {
  /* Q5 (v124): REWRITTEN — this spec used to pin the v46/v103 shared card GRID (3-up at desktop),
     which the Q5 redesign deliberately replaced with one surface of stacked rows. The premise
     changed; the checks still worth keeping (the clamp on the linked-product line, and keyboard
     access through the role="button" row) carry over. The focus ring is INSET (outline-offset:-2px)
     because the surface's overflow:hidden clips an outward ring — the defect the Q4 review caught
     on #plateList.
     F3 (v139) REWROTE this test for the rebuilt five-column row. The Q5 shape it used to assert is
     gone, so asserting it would assert the conversion had not happened; every rendered-state check
     it carried survives here, plus the states the rebuild added (no-move dash, category, usage). */
  test(`F3: the Ingredients row is five facts, reflowed by width @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.kitchenIngredients.push(
        { id: 'K1', name: 'Chips', pid: 'P0108' }, { id: 'K2', name: 'Bacon', pid: 'P0004' },
        { id: 'K3', name: 'Milk', pid: 'P0201' }, { id: 'K4', name: 'Lemon', pid: 'P_GONE' },
      );
      // a real logged move on Bacon: the drift pill must RENDER, not merely exist in source —
      // the Q5 review showed the first cut's source-grep pins passing with the branches inverted
      window.ingPriceLog['P0004'] = [{ t: Date.now() - 86400000, v: 0.01 }, { t: Date.now(), v: 0.0112 }];
      window.rebuildKById(); window.renderKitchenPanel();
    });
    await page.locator('.navbtn[data-tab="pantry"]').click();
    await page.waitForTimeout(300);

    const wide = size.width >= 768;
    const grid = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#kingList .king-row')];
      const list = document.getElementById('kingList');
      const cs = getComputedStyle(list);
      const link = document.querySelector('.king-row[data-kid="K2"] .king-link');
      // script focus() on a div does not match :focus-visible, so resolve the rule from the CSSOM
      const insetRule = [...document.styleSheets].flatMap((sh) => { try { return [...sh.cssRules]; } catch (e) { return []; } })
        .some((r) => r.selectorText === '.king-row:focus-visible' && r.style.outlineOffset === '-2px');
      return {
        kingCols: new Set(rows.map((r) => Math.round(r.getBoundingClientRect().left))).size,
        clipped: cs.overflow === 'hidden',
        bordered: cs.borderTopWidth === '1px',
        clamp: link ? getComputedStyle(link).webkitLineClamp : null,
        band: getComputedStyle(document.querySelector('#kingList .king-band')).display,
        insetRule,
      };
    });
    expect(grid.kingCols, 'rows stack — one shared left edge at every width').toBe(1);
    expect(grid.insetRule, 'the inset-outline rule exists in the CSSOM (existence, not cascade victory)').toBe(true);
    // the container is the mock's desktop affordance only; on the phone the rows sit on the page
    expect(grid.clipped, 'container clips only at >=768').toBe(wide);
    expect(grid.bordered, 'container is bordered only at >=768').toBe(wide);
    expect(grid.band, 'the column band labels the desktop table and nothing on the phone')
      .toBe(wide ? 'grid' : 'none');
    expect(grid.clamp, 'the linked-product line clamps — 1 line in its column, 2 stacked')
      .toBe(wide ? '1' : '2');

    // every state, asserted on the RENDERED rows rather than on a source grep
    const states = await page.evaluate(() => {
      const row = (kid) => document.querySelector(`.king-row[data-kid="${kid}"]`);
      const txt = (kid, sel) => (row(kid).querySelector(sel) || {}).textContent || null;
      const badge = row('K2').querySelector('.king-drift');
      const steady = row('K1').querySelector('.king-drift');
      return {
        warn: txt('K4', '.king-link.king-missing') || '',
        noCost: txt('K4', '.king-price.notcosted'),
        brokenCat: txt('K4', '.king-cat'),
        drift: badge.textContent,
        driftUp: badge.classList.contains('up'),
        driftVisible: badge.getBoundingClientRect().width > 0,
        driftPill: getComputedStyle(badge).backgroundColor,
        steady: steady.textContent,
        steadyPlain: getComputedStyle(steady).backgroundColor,
        cat: txt('K1', '.king-cat'),
        used: txt('K1', '.king-used-n'),
        mono: getComputedStyle(row('K1').querySelector('.king-price')).fontFamily,
        numeric: getComputedStyle(row('K1').querySelector('.king-price')).fontVariantNumeric,
      };
    });
    expect(states.warn, 'broken link is loud').toContain('product missing');
    expect(states.noCost, 'broken link prices as "no cost"').toBe('no cost');
    expect(states.brokenCat, 'a broken link has no category to derive').toBe('—');
    expect(states.drift, 'the logged +12% move renders').toBe('+12.0%');
    expect(states.driftUp, 'a rise is classed up (bad)').toBe(true);
    expect(states.driftVisible, 'and the pill has real geometry — not clamped away').toBe(true);
    expect(states.driftPill, 'a real move is a TINTED pill (mock §3.4)').not.toBe('rgba(0, 0, 0, 0)');
    // tinting "no news" would put a semantic colour on a non-event
    /* ⚠ REWRITTEN 12 Aug 2026: "steady" became a dash on BOTH screens in one change, because the two
       share this wording and this figure — deciding it per screen is what the queue item forbade.
       Still deliberately NOT a pill: the absence of news carries no tint. */
    expect(states.steady, 'no logged move reads as a dash, not blank and not "steady"').toBe('—');
    expect(states.steadyPlain, 'and the dash carries no tint').toBe('rgba(0, 0, 0, 0)');
    // R1's flip: the category is back on the row, derived from the linked product
    expect(states.cat, 'the derived category renders as its own cell').toBeTruthy();
    expect(states.cat).not.toBe('—');
    expect(states.used, 'usage counts the kid arm and says so in plates').toMatch(/plates?$|^—$/);
    /* `textContent` cannot see generated content, so the assertion above passed while the desktop
       cell actually READ ", in —" under a column headed "Used in" (a review finding). The mobile
       meta line needs the prefix; the desktop column must not have it. Assert the rendered string,
       which is textContent PLUS ::before. */
    const usedRendered = await page.evaluate(() => {
      const el = document.querySelector('.king-row[data-kid="K1"] .king-used-n');
      return getComputedStyle(el, '::before').content + '|' + el.textContent;
    });
    if (wide) {
      expect(usedRendered, 'the desktop column carries no "in " prefix — its header already says "Used in"')
        .toMatch(/^(none|"")\|/);
    } else {
      expect(usedRendered, 'the phone meta line reads "…, in N plates"').toMatch(/in/);
    }
    expect(states.mono, '§4: Geist Mono on every figure').toMatch(/Geist Mono/);
    expect(states.numeric).toBe('tabular-nums');

    /* The two defects the F3 browser pass found, both invisible to a textContent assertion:
       a placeholder that is present in the DOM but display:none reads identically to one that
       renders. Assert the GEOMETRY. Desktop needs the dashes (a column wants a cell); the phone
       has no columns, so an absent value is absent rather than a row of dashes. */
    const geom = await page.evaluate(() => {
      const row = (kid) => document.querySelector(`.king-row[data-kid="${kid}"]`);
      const shown = (el) => !!(el && el.getBoundingClientRect().width > 0);
      const broken = row('K4'), healthy = row('K1');
      return {
        brokenCatShown: shown(broken.querySelector('.king-cat')),
        brokenUsedShown: shown(broken.querySelector('.king-used-n')),
        healthyUsedShown: shown(healthy.querySelector('.king-used-n')),
        // the leak: a 4-class sibling chain out-ranked the desktop column rule and threw this
        // cell to the far left of the row on broken rows only
        brokenUsedRight: broken.querySelector('.king-used-n').getBoundingClientRect().right,
        healthyUsedRight: healthy.querySelector('.king-used-n').getBoundingClientRect().right,
        rowRight: broken.getBoundingClientRect().right,
        // and the dead grid row: a healthy mobile row must not reserve space for the hidden
        // linked-product line
        healthyH: healthy.getBoundingClientRect().height,
      };
    });
    /* The OTHER empty-category state — a product that is linked but carries no category — cannot
       be staged here: `byId` is a module-scoped `let`, not a window global, and every product in
       the 393-row fixture has a category. Its markup is pinned in tests/king-rows.test.js instead;
       the CSS it depends on is proven end-to-end by the broken-link row below, which renders the
       same `.king-cat.is-nil`. */
    if (wide) {
      expect(geom.brokenCatShown, 'desktop: a broken row still fills its Category cell').toBe(true);
      expect(geom.brokenUsedShown, 'desktop: and its Used-in cell').toBe(true);
      expect(Math.abs(geom.brokenUsedRight - geom.healthyUsedRight),
        'Used-in ends on the same right edge on EVERY row — it does not jump columns when the link breaks')
        .toBeLessThanOrEqual(1.5);
      expect(geom.rowRight - geom.brokenUsedRight, 'and it is the last column, not the first')
        .toBeLessThan(60);
    } else {
      expect(geom.brokenCatShown, 'phone: no dash placeholders — an absent value is absent').toBe(false);
      expect(geom.brokenUsedShown, 'phone: the warning already states the plate count').toBe(false);
      expect(geom.healthyH, 'no dead grid row under a healthy name (the hidden product line)')
        .toBeLessThan(80);
    }

    // keyboard access survives the rebuild
    await page.evaluate(() => document.querySelector('.king-row[data-kid="K1"]').focus());
    await page.keyboard.press('Enter');
    await expect(page.locator('#kingModal')).toHaveClass(/open/);
    await page.locator('#kingModalCancel').click();
    await page.locator('#kingList').screenshot({ path: `tests/visual/__shots__/v139-king-rows-${size.name}.png` });
  });

  test(`v46 item 5: flag pill centres on the title line @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(V46_INV_ROWS);
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('#invReview tr.inv-data').forEach(tr => {
        const td = tr.querySelector('td');
        const pill = td.querySelector('.flag-review, .flag-mismatch, .flag-new');
        const tn = Array.from(td.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
        if (!pill || !tn) { out.push(null); return; }
        const r = document.createRange(); r.selectNodeContents(tn);
        const lines = Array.from(r.getClientRects());
        const p = pill.getBoundingClientRect();
        const shared = lines.find(l => p.top < l.bottom && p.bottom > l.top);
        out.push({
          off: shared ? ((p.top + p.bottom) / 2 - (shared.top + shared.bottom) / 2) : null,
          pillLeft: p.left, textLeft: lines[0].left,
        });
      });
      return out;
    });
    // short title: pill shares the line and is vertically centred on it (the v44 baseline-pin
    // could never do better than ~2px low — the root-cause fix must hold at ≤1px)
    expect(rows[0].off, 'pill shares the short title line').not.toBeNull();
    expect(Math.abs(rows[0].off), 'pill centre on the title line centre').toBeLessThanOrEqual(1);
    // wrapped title: pill either shares a line (centred) or starts at the text's left edge below
    if (rows[1].off !== null) expect(Math.abs(rows[1].off)).toBeLessThanOrEqual(1);
    else expect(rows[1].pillLeft - rows[1].textLeft, 'wrapped pill hugs the left edge').toBeLessThanOrEqual(8);
    const trs = page.locator('#invReview tr.inv-data');
    await trs.nth(0).screenshot({ path: `tests/visual/__shots__/v46-pill-short-${size.name}.png` });
    await trs.nth(1).screenshot({ path: `tests/visual/__shots__/v46-pill-wrapped-${size.name}.png` });
  });

  /* F7 (v146) — RETIRED, and the honest replacement is a different assertion, not a re-pointed one.
     v46 item 6's subject was the DOTTED LEADER sitting on the line total's text baseline, the
     docket's signature detail. The docket is gone and so is the leader, so there is no baseline
     relationship left to measure and re-pointing this at the v3 row would have been a test written
     to keep a file alive rather than to catch anything.
     What replaces it is the thing the v3 row can get wrong: the mock's five columns must line up
     DOWN the table, not per row. Q6 (v125) recorded exactly that risk when it moved to fixed
     tracks ("each row is its own grid, so auto tracks would size per-row and the columns would not
     line up"), and the v3 table has the same shape and the same exposure. */
  test(`the builder's columns line up down the table @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await openFreshBuilder(page);
    await page.evaluate(() => {
      window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
      window.rebuildKById();
      window.addKitchenLine('K1');
      window.addProduct('P0004');
      window.addMiscCost();
      const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
    });
    await page.waitForTimeout(300);
    const geom = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#lines .bld-row')];
      return {
        n: rows.length,
        // the right edge of the cost column, per row — one shared column means one shared edge
        costRights: rows.map(r => { const c = r.querySelector('.bld-lc'); return c ? Math.round(c.getBoundingClientRect().right) : null; }),
        // and every row's own right edge stays inside the table
        overflow: rows.map(r => Math.round(r.getBoundingClientRect().right - r.parentElement.getBoundingClientRect().right)),
      };
    });
    expect(geom.n, 'builder rows rendered').toBeGreaterThanOrEqual(2);
    const rights = geom.costRights.filter(v => v !== null);
    const spread = Math.max(...rights) - Math.min(...rights);
    expect(spread, 'the cost column has ONE right edge down the whole table').toBeLessThanOrEqual(1);
    for (const o of geom.overflow) expect(o, 'no row escapes the table').toBeLessThanOrEqual(0);
    await page.locator('#lines').screenshot({ path: `tests/visual/__shots__/v146-builder-columns-${size.name}.png` });
  });
}

/* v46 item 1 (the pantry strapline centred with the buttons row) is RETIRED by F3: there is no
   strapline on this header any more — R3 re-housed the sentence into the empty state, and the v3
   header's subtitle is a computed count. Item 4 below is a DASHBOARD assertion that only happened
   to share a test body with it, so it keeps running unchanged. */
test('v46 item 4: the target line labels itself (no pill, big number stays)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  // seed history so the chart draws, then check the pill is gone and the line is labelled
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 40; d += 3) pts.push({ t: now - d * day, v: 31 + (d % 7) * 0.6 });
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
    window.cogsPct = 30;
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.ref-pill')).toHaveCount(0);
  // v48 update: the "Target" word is gone too (Max's call) — the dashed line explains itself
  // because it always sits exactly ON the y-axis tick labelled with the user's own target number
  await expect(page.locator('.ref-lbl')).toHaveCount(0);
  const lbl = await page.evaluate(() => {
    const line = document.querySelector('.ref-line').getBoundingClientRect();
    const tick = Array.from(document.querySelectorAll('#trendWrap text.ax'))
      .find(t => t.textContent === '30%');           // the seeded target
    if (!tick) return null;
    const r = tick.getBoundingClientRect();
    return { tickCentre: (r.top + r.bottom) / 2, lineY: line.top };
  });
  expect(lbl, 'a y-axis tick reads exactly the target number').not.toBeNull();
  expect(Math.abs(lbl.tickCentre - lbl.lineY), 'the target tick label is centred ON the dashed rule').toBeLessThanOrEqual(3);
  await page.locator('.dash-chart').screenshot({ path: 'tests/visual/__shots__/v46-dash-label.png' });
});

/* ===== v47: dashboard trend-chart rebuild ===== */

const V47_SEED = `(() => {
  const day = 86400000, now = Date.now(), pts = [];
  for (let d = 1; d <= 360; d += 4) pts.push({ t: now - d * day, v: 24 + 6 * Math.sin(d / 20) + (d % 5) });
  window.priceHistory = pts.sort((a, b) => a.t - b.t);
  window.cogsPct = 30;
})()`;

for (const size of SIZES) {
  test(`v47: chart statics — smooth curve, dotted fill, real axes, sparse/dense dots @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(V47_SEED);
    await page.locator('.navbtn[data-tab="dashboard"]').click();
    await page.waitForTimeout(400);
    const perRange = [];
    for (const rg of ['1w', '1m', '3m', '6m', '1y', 'all']) {
      await page.evaluate(r => window.setDashRange(r), rg);
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => {
        const svg = document.querySelector('#trendWrap svg');
        const texts = Array.from(svg.querySelectorAll('text.ax'));
        const yLbls = texts.filter(t => /%$/.test(t.textContent));
        // v143: the trend's heading is the section's own h2 now (`.chart-title` went with the
        // `.chart-controls` row it lived in). Same element, same job — the label's left edge is
        // still measured against it below.
        const title = document.querySelector('.dash-trend .ds-head h2').getBoundingClientRect();
        return {
          pts: window.dashRangePts().length,
          yTicks: yLbls.length,
          xLbls: texts.length - yLbls.length,
          targetTick: yLbls.some(t => parseFloat(t.textContent) === window.cogsPct),
          // v48 stability pins: rendered label height (font size), label left edge vs the
          // title's, and the plot gutter must all be IDENTICAL for every range
          lblH: +yLbls[0].getBoundingClientRect().height.toFixed(2),
          lblLeft: +Math.min(...yLbls.map(t => t.getBoundingClientRect().left)).toFixed(1),
          maxLblRight: Math.max(...yLbls.map(t => t.getBoundingClientRect().right)),
          lblRightSpread: +(Math.max(...yLbls.map(t => t.getBoundingClientRect().right))
                          - Math.min(...yLbls.map(t => t.getBoundingClientRect().right))).toFixed(1),
          plotLeftPx: (() => {
            const s = svg.getBoundingClientRect();
            return s.left + (window.TREND_GEO.padL / window.TREND_GEO.W) * s.width;
          })(),
          // v60: the target line only draws when it's in the data-fit domain, so it may be absent on a tight
          // range where the data all sits below the target — guard against a null .ref-line.
          refLine: !!svg.querySelector('.ref-line'),
          // leftmost RENDERED pixel of any plot element (fill+curve+dots group, and the target line if drawn)
          drawnLeft: (() => {
            const clipLeft = svg.querySelector('g[clip-path]').getBoundingClientRect().left;
            const ref = svg.querySelector('.ref-line');
            return +(ref ? Math.min(clipLeft, ref.getBoundingClientRect().left) : clipLeft).toFixed(1);
          })(),
          titleLeft: +title.left.toFixed(1),
          padL: window.TREND_GEO.padL,
          bezier: svg.querySelector('g[clip-path] path[stroke]').getAttribute('d').includes('C'),
          dots: svg.querySelector('g[clip-path]').querySelectorAll('.tc-pt').length,
          // v94 polish: the dotted pattern is replaced by a translucent area gradient (#tcarea) —
          // assert the def AND that the area path actually fills with it (CodeRabbit, accepted)
          grad: !!svg.querySelector('linearGradient#tcarea')
             && !!svg.querySelector('g[clip-path] path[fill="url(#tcarea)"]'),
          clipGroups: svg.querySelectorAll('g[clip-path]').length,
          caption: document.querySelector('.chart-hint').textContent,
          focusable: svg.getAttribute('tabindex') === '0',
        };
      });
      /* ⚠️ v145 LOOSENED THIS AND THEN PUT IT BACK, which is worth recording because the loosening
         was the mistake. The first cut of that batch's y-domain fix generated ticks over a padded
         domain and then FILTERED out the ones that fell outside it — and for ordinary data like
         [28,30,32] against a 30% target, tcTicks widens to step 5 and returns [25,30,35], so the
         filter left ONE label on the whole axis. This assertion was rewritten to permit that,
         which is fitting the spec to the regression instead of closing it; the pre-push review
         caught both halves. The domain is now the TICK EXTENT plus a hair, so tcTicks' own
         guarantees hold end to end: at least three ticks (it pads outward below three) and never
         more than four (it widens the step above four). Restored verbatim. */
      expect(st.yTicks, `${rg}: 3–4 y ticks`).toBeGreaterThanOrEqual(3);
      expect(st.yTicks, `${rg}: 3–4 y ticks`).toBeLessThanOrEqual(4);
      /* ⚠ REVERSES v48, deliberately and with its argument answered. v48 removed the x-axis date
         labels as "declutter", on the grounds that "the range buttons state the window; the scrub
         tooltip gives exact dates". The queue item that restored them rebuts both: the range buttons
         name a WINDOW but never say which dates it covers, so 3M and 1Y draw the same picture with
         no way to tell them apart; and the scrub tooltip is a HOVER, which is nothing at all on the
         phone Max actually works on. The assertion is inverted rather than deleted, so a future
         "declutter" has to argue with a failing test. Bounds not an exact count: trendXTicks scales
         2..5 labels to the plot width and drops duplicates on a sparse series. */
      expect(st.xLbls, `${rg}: the x-axis is labelled (reverses v48)`).toBeGreaterThanOrEqual(2);
      expect(st.xLbls, `${rg}: and stays sparse — an axis, not a data dump`).toBeLessThanOrEqual(5);
      // v60: when the target line is drawn (in view), it sits ON a labelled tick (trend-ticks contract).
      // On a tight range where the data is all below the target it isn't drawn — then it isn't a tick, which
      // is correct, so only assert the tick when the line is actually shown.
      if (st.refLine) expect(st.targetTick, `${rg}: a shown target line sits on a labelled tick`).toBe(true);
      // v52 gutter contract (replaces v51's "no gutter" pin, which drew the plot UNDER the labels):
      // labels live inside a gutter sized to the widest label, right-aligned so digits sit flush;
      // the widest label's LEFT edge = the title's left edge; ZERO plot pixels left of the label
      // column's right edge on ANY range.
      expect(st.lblLeft - st.titleLeft, `${rg}: widest y label starts at the title's left edge`).toBeLessThanOrEqual(2);
      expect(st.lblLeft - st.titleLeft, `${rg}: widest y label starts at the title's left edge`).toBeGreaterThanOrEqual(-1.5);
      expect(st.lblRightSpread, `${rg}: y labels right-aligned — digits flush as a column`).toBeLessThanOrEqual(1);
      expect(st.plotLeftPx - st.maxLblRight, `${rg}: the plot begins right of the label column (gutter gap)`).toBeGreaterThanOrEqual(3);
      expect(st.drawnLeft - st.maxLblRight, `${rg}: no rendered plot pixel left of the label column`).toBeGreaterThanOrEqual(0);
      expect(st.bezier, `${rg}: smooth curve (cubic segments)`).toBe(true);
      expect(st.grad, `${rg}: translucent gradient area fill (v94 — replaced the dotted pattern)`).toBe(true);
      expect(st.clipGroups, `${rg}: bright + dim groups`).toBe(2);
      expect(st.caption.includes('Tap a point'), `${rg}: tap hint dropped`).toBe(false);
      expect(st.focusable, `${rg}: plot is focusable`).toBe(true);
      // v94 polish (Max): per-point reading dots removed on every range — the scrub dot is the
      // way to read a value. This deliberately supersedes v47's sparse-range dots.
      expect(st.dots, `${rg}: no per-point dots (v94)`).toBe(0);
      perRange.push({ rg, lblH: st.lblH, lblLeft: st.lblLeft, padL: st.padL });
      await page.locator('.dash-chart').screenshot({ path: `tests/visual/__shots__/v47-${rg}-${size.name}.png` });
    }
    // v48 root-cause pin: switching ranges must change ONLY the trendline — the rendered label
    // size, the label edge, and the gutter are the same for every range (they used to shift when
    // a decimal tick label clipped at the svg edge)
    for (const r of perRange.slice(1)) {
      expect(r.lblH, `${r.rg}: label font size identical across ranges`).toBe(perRange[0].lblH);
      expect(r.lblLeft, `${r.rg}: label left edge identical across ranges`).toBe(perRange[0].lblLeft);
      expect(r.padL, `${r.rg}: plot gutter identical across ranges`).toBe(perRange[0].padL);
    }
  });

  test(`v47: scrubbing — crosshair, curve-riding dot, snapping tooltip, dim-ahead, rest @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(V47_SEED);
    await page.locator('.navbtn[data-tab="dashboard"]').click();
    await page.evaluate(() => window.setDashRange('3m'));
    await page.waitForTimeout(300);
    const box = await page.locator('#trendWrap svg').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.waitForTimeout(150);
    const mid = await page.evaluate(() => ({
      cross: document.querySelector('#tcCross').getAttribute('visibility'),
      crossX: parseFloat(document.querySelector('#tcCross').getAttribute('x1')),
      dotOnCurve: (() => {
        const g = window.TREND_GEO;
        const cx = parseFloat(document.querySelector('#tcDot').getAttribute('cx'));
        const cy = parseFloat(document.querySelector('#tcDot').getAttribute('cy'));
        return Math.abs(window.tcYAt(g.xs, g.ys, g.tan, cx) - cy) < 0.2;
      })(),
      brightW: parseFloat(document.querySelector('#tcRectB').getAttribute('width')),
      dimX: parseFloat(document.querySelector('#tcRectD').getAttribute('x')),
      tip: document.getElementById('trendTip').textContent,
      tipShown: document.getElementById('trendTip').classList.contains('show'),
    }));
    expect(mid.cross, 'crosshair visible while scrubbing').toBe('visible');
    expect(mid.dotOnCurve, 'the active dot rides the rendered curve').toBe(true);
    expect(mid.brightW, 'bright clip ends at the cursor').toBeCloseTo(mid.crossX, 0);
    expect(mid.dimX, 'dim clip starts at the cursor').toBeCloseTo(mid.crossX, 0);
    expect(mid.tipShown, 'tooltip shown').toBe(true);
    expect(mid.tip, 'tooltip reports a % value').toMatch(/%/);
    await page.locator('.dash-chart').screenshot({ path: `tests/visual/__shots__/v47-scrub-${size.name}.png` });
    // slides continuously
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
    await page.waitForTimeout(150);
    const at80 = await page.evaluate(() => parseFloat(document.querySelector('#tcCross').getAttribute('x1')));
    expect(at80, 'crosshair tracks the pointer').toBeGreaterThan(mid.crossX);
    // tooltip never overflows the chart at the far edge
    await page.mouse.move(box.x + box.width - 2, box.y + box.height * 0.5);
    await page.waitForTimeout(150);
    const edge = await page.evaluate(() => {
      const t = document.getElementById('trendTip').getBoundingClientRect();
      const w = document.getElementById('trendWrap').getBoundingClientRect();
      return { overR: t.right - w.right, overL: w.left - t.left };
    });
    expect(edge.overR, 'tooltip stays inside at the right edge').toBeLessThanOrEqual(1);
    expect(edge.overL, 'tooltip stays inside at the left edge').toBeLessThanOrEqual(1);
    // pointer-leave rests: no crosshair, full brightness
    await page.mouse.move(box.x - 40, box.y + box.height * 0.5);
    await page.waitForTimeout(150);
    const rest = await page.evaluate(() => ({
      cross: document.querySelector('#tcCross').getAttribute('visibility'),
      brightW: parseFloat(document.querySelector('#tcRectB').getAttribute('width')),
      vbW: parseFloat(document.querySelector('#trendWrap svg').getAttribute('viewBox').split(/\s+/)[2]),
      tipShown: document.getElementById('trendTip').classList.contains('show'),
    }));
    expect(rest.cross, 'crosshair hidden at rest').toBe('hidden');
    /* v143: the plot is sized in RENDERED PIXELS, so the viewBox is the column width rather than
       the old fixed 320. `rest()` sets the bright clip rect to the FULL viewBox width, whatever it
       is — so the pin reads that width from the chart rather than hardcoding a constant that was
       only ever right at one breakpoint. Hardcoding 320 here would now pass on a phone and fail on
       a desktop for a chart behaving identically. */
    expect(rest.brightW, 'full brightness at rest').toBe(rest.vbW);
    expect(rest.tipShown, 'tooltip hidden at rest').toBe(false);
    // keyboard: the plot is one focusable control; arrows step readings
    await page.evaluate(() => document.querySelector('#trendWrap svg').focus());
    await page.keyboard.press('End');
    await page.waitForTimeout(100);
    const kEnd = await page.evaluate(() => document.getElementById('trendTip').textContent);
    expect(kEnd, 'End jumps to the last reading').toMatch(/%/);
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const kPrev = await page.evaluate(() => document.getElementById('trendTip').textContent);
    expect(kPrev, 'ArrowLeft steps to the previous reading').not.toBe(kEnd);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => document.getElementById('trendTip').classList.contains('show')),
      'Escape rests the chart').toBe(false);
  });
}

test('v47: degenerate data (0/1/2 points) and dark theme render sane', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(300);
  for (const n of [0, 1]) {
    const deg = await page.evaluate((k) => {
      const day = 86400000, now = Date.now();
      window.priceHistory = Array.from({ length: k }, (_, i) => ({ t: now - (k - i) * day, v: 25 + i * 3 }));
      window.setDashRange('1m');
      return {
        empty: !!document.querySelector('.dash-chart.empty'),
        hint: document.querySelector('.chart-hint').textContent.length > 0,
      };
    }, n);
    expect(deg.empty, `${n} points → empty-state card`).toBe(true);
    expect(deg.hint, `${n} points → a real hint`).toBe(true);
  }
  const two = await page.evaluate(() => {
    const day = 86400000, now = Date.now();
    window.priceHistory = [{ t: now - 2 * day, v: 25 }, { t: now - day, v: 28 }];
    window.setDashRange('1m');
    const path = document.querySelector('#trendWrap svg g[clip-path] path[stroke]').getAttribute('d');
    const nonPct = Array.from(document.querySelectorAll('#trendWrap text.ax'))
      .filter(t => !/%$/.test(t.textContent)).length;
    return { ok: /^M[\d. ]+ C/.test(path), nonPct };
  });
  expect(two.ok, '2 points → a single valid cubic segment').toBe(true);
  /* ⚠ REVERSES HALF of v48's pin, and keeps the other half. Date labels are BACK (see the note on
     the range loop above), so non-% text is expected now — but the "Target" WORD stays gone, which
     was the other thing this counted and is still Max's call from v48. Counting non-% text can no
     longer distinguish the two, so the assertion names what it actually forbids. */
  expect(two.nonPct, 'the x-axis is labelled on a 2-point series too').toBeGreaterThan(0);
  const targetWord = await page.evaluate(() => Array.from(document.querySelectorAll('#trendWrap text'))
    .some((t) => /target/i.test(t.textContent)));
  expect(targetWord, 'v48: the "Target" word on the dashed line stays gone — the tick label explains it').toBe(false);
  await page.locator('.dash-chart').screenshot({ path: 'tests/visual/__shots__/v47-2pts.png' });
  // dark theme render. v115: colour is anchored to the TARGET now, not direction — this rising
  // series tops out at 30.9% against the fixture's 40% target, so it is GREEN (the old semantic
  // called any rise red; that is the condition this batch removed). The over-target red case is
  // pinned in tests/trend-reframe.test.js.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 90; d += 3) pts.push({ t: now - d * day, v: 31 - d / 10 });   // d = days AGO: older readings lower → cost RISES toward today
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
    window.setDashRange('3m');
  });
  await page.waitForTimeout(300);
  const box = await page.locator('#trendWrap svg').boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
  await page.waitForTimeout(150);
  const darkStroke = await page.evaluate(() =>
    document.querySelector('#trendWrap svg g[clip-path] path[stroke]').getAttribute('stroke'));
  expect(darkStroke, 'target-anchored colour survives dark: under target = green (--good)').toBe('var(--good)');
  await page.locator('.dash-chart').screenshot({ path: 'tests/visual/__shots__/v47-dark-scrub.png' });
});

/* ===== v48: final chart declutter + stability ===== */

test('v48: NON-ROUND target (32%) still lands exactly on a labelled tick — the unlabelled-line guarantee', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 60; d += 3) pts.push({ t: now - d * day, v: 26 + (d % 9) });
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
    window.cogsPct = 32;                       // the sanity check the patch asks for
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  for (const rg of ['1w', '1m', '3m']) {
    await page.evaluate(r => window.setDashRange(r), rg);
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => {
      const tick = Array.from(document.querySelectorAll('#trendWrap text.ax'))
        .find(t => parseFloat(t.textContent) === 32);
      if (!tick) return null;
      const r = tick.getBoundingClientRect();
      const line = document.querySelector('#trendWrap .ref-line').getBoundingClientRect();
      const mono = getComputedStyle(tick).fontFamily;
      return { centre: (r.top + r.bottom) / 2, lineY: line.top, mono };
    });
    expect(st, `${rg}: a tick reads exactly 32%`).not.toBeNull();
    expect(Math.abs(st.centre - st.lineY), `${rg}: the 32% label sits ON the dashed line`).toBeLessThanOrEqual(3);
    expect(st.mono, `${rg}: axis labels use the app's mono stack`).toMatch(/mono|Menlo|Consolas/i);
  }
  await page.locator('.dash-chart').screenshot({ path: 'tests/visual/__shots__/v48-target32-mobile.png' });
});

test('v48: tap highlight killed, keyboard focus ring kept', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 30; d += 2) pts.push({ t: now - d * day, v: 27 + (d % 5) });
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  const svg = page.locator('#trendWrap svg');
  // ⚠️ WAIT ON THE CHART, NOT ON A CLOCK. This was `waitForTimeout(400)` and it timed out in CI
  // after 30s on the click below: the runner is slower than any developer machine, the chart had
  // not been drawn yet, and the click then waited for an element that was not there. A fixed sleep
  // that is long enough locally is not evidence it is long enough anywhere.
  await expect(svg).toBeVisible({ timeout: 15000 });
  // pointer focus: no ring, no tap flash
  // ⚠️ NO `position:` HERE, AND THE OMISSION IS THE FIX. This was `{ x: 150, y: 100 }`, which timed
  // out in CI after 30s - not because the svg was missing (the trace shows the locator resolving to
  // it) but because the click point landed OUTSIDE it and #trendWrap swallowed the pointer, 53
  // retries deep. The chart is sized by its viewBox aspect ratio off the wrapper's width, so at 380px
  // it measures 314x102.0 on a Mac and 304x98.8 on CI, where the app's scrollbar takes real layout
  // width (`*::-webkit-scrollbar{width:10px}` at css/style.css:1490, reserved on every page by
  // `html{scrollbar-gutter:stable}` at :2693 - overlay-scrollbar platforms reserve nothing).
  // y=100 therefore sits 2px inside the element on one and just outside it on the other, and
  // elementFromPoint at that spot returns DIV#trendWrap on CI - the same words the trace used.
  // Nothing here needs a specific point - this asserts what a pointer press does to focus and tap
  // highlight - so click the centre and let Playwright find it on any layout.
  await svg.click();
  const afterTap = await page.evaluate(() => {
    const el = document.querySelector('#trendWrap svg');
    const cs = getComputedStyle(el);
    return {
      tapColor: cs.webkitTapHighlightColor || 'unsupported',
      outline: cs.outlineStyle,
      focusVisible: el.matches(':focus-visible'),
    };
  });
  if (afterTap.tapColor !== 'unsupported') {
    expect(afterTap.tapColor, 'tap highlight is transparent').toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  }
  expect(afterTap.focusVisible, 'pointer focus is not :focus-visible').toBe(false);
  expect(afterTap.outline, 'no outline after a tap/click').toBe('none');
  // keyboard focus: the ring comes back and arrows still scrub
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.querySelector('#trendWrap svg').blur());
  await page.keyboard.press('Tab');   // walk focus forward until the plot has it
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => document.activeElement === document.querySelector('#trendWrap svg'))) break;
    await page.keyboard.press('Tab');
  }
  const kb = await page.evaluate(() => {
    const el = document.querySelector('#trendWrap svg');
    return { has: document.activeElement === el, ring: el.matches(':focus-visible') ? getComputedStyle(el).outlineStyle : 'no-ring' };
  });
  expect(kb.has, 'the plot is reachable by keyboard').toBe(true);
  expect(kb.ring, 'keyboard focus keeps a visible ring').toBe('solid');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(120);
  expect(await page.evaluate(() => document.getElementById('trendTip').classList.contains('show')),
    'arrow keys still scrub after the focus rework').toBe(true);
});

/* F5 (v142) rewrote both Menu tests below. The screen is the mock's §3.2 now — `.scr-head`,
 * a switcher row, a filter row, a grid list — so `.an-head` / `.an-controls` / `.atable-wrap`
 * no longer exist and a pin phrased in them could only pass by NOT converting the screen.
 *
 * ⚠ THE SECOND ONE ALSO HAD A FALSE PREMISE, and F5 is what exposed it. This file seeds NO menus,
 * so it was driving "search matches nothing" (variant A) on a screen that has no menus to search —
 * the old code rendered a search box and a bare table over zero menus regardless. F5 gives zero
 * menus their own honest state ("No menus yet", with the one action that resolves it) and stands
 * the switcher and filter rows down, because an option-less select beside a hidden Delete is a
 * control that does nothing. So the fresh-install test now pins THAT state, and variant A gets a
 * menu seeded so it is reachable at all. Two states, each tested where it actually occurs.
 */
for (const size of SIZES) {
  test(`v142: menu header structure — skeleton order, one left edge, live target @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.addInitScript(() => {
      if (localStorage.getItem('__f5_seeded')) return;
      localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original menu' }]));
      localStorage.setItem('__f5_seeded', '1');
    }, {});
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator('.navbtn[data-tab="analysis"]').click();
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => {
      // ⚠ SCOPED to #tab-analysis. Four screens carry `.scr-head` now and the others are
      // display:none, so a bare `.scr-head` selector returns the Plates header with a zero rect —
      // which reads as a 822px edge mismatch, not as "you selected the wrong element".
      const L = s => document.querySelector(s).getBoundingClientRect().left;
      const T = s => document.querySelector(s).getBoundingClientRect().top;
      const head = document.querySelector('#tab-analysis .scr-head');
      const cs = getComputedStyle(head);
      return {
        order: [head.getBoundingClientRect().top, T('#menuSwitchRow'), T('#aList')],
        // the header's text edge is its padding edge; the switcher and rows sit on the same gutter.
        // The SEARCH is deliberately not measured — the mock puts it at the RIGHT of that row.
        // `.menu-picker-row`, not `#menuPills` — the pills are a ≥1024 control and measure 0 on a
        // phone, which reads as a 28px edge break rather than "that element is not here".
        edges: [head.getBoundingClientRect().left + parseFloat(cs.paddingLeft), L('#tab-analysis .menu-picker-row'), L('#aList')],
        // ONE row, at both widths: two actions in a mobile header is a known, queued deviation, but
        /* a header that WRAPS is a defect — the mock's own "Add existing plate" caused one at 380.
           ⚠ THE METRIC CHANGED 12 Aug 2026, because the previous one stopped being true. It counted
           distinct child CENTRE LINES, on the stated reasoning that "the centre is the only y shared
           by everything on one row". That held while `.scr-head` centred every child — and the title
           and its meta line now carry `align-self:baseline` (they were floating at the title's
           mid-height instead of sitting on its line), so two children legitimately share a BASELINE
           and not a centre. The old metric read 3 rows on a header that had not wrapped at all.
           Two earlier metrics were wrong too, both recorded because both looked right: dividing the
           height by a line height reads 2 on a one-row header (44px button + 24px padding = 69px),
           and grouping by TOP reads 4 because the bar centres children of four different heights.
           This one asks the question directly and is alignment-agnostic: a wrap is a child that
           begins BELOW another child ends. Nothing about how items align within a row can produce
           that, and nothing that wraps can avoid it. */
        headRows: (() => {
          const boxes = [...head.children]
            .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().height > 0)
            .map((el) => el.getBoundingClientRect());
          let rows = 1;
          for (const a of boxes) for (const b of boxes) {
            if (a.top >= b.bottom - 0.5) { rows = 2; break; }
          }
          return rows;
        })(),
        suggestedTh: document.getElementById('aSuggestedTh').textContent,
        sub: document.getElementById('menuHeadSub').textContent,
        note: document.getElementById('menuListNote').textContent,
        // v115 (Max): the suggested-prices meta line stays deleted
        meta: !!document.querySelector('.cogs-meta'),
      };
    });
    for (let k = 1; k < st.order.length; k++)
      expect(st.order[k], `block ${k} sits below block ${k - 1}`).toBeGreaterThan(st.order[k - 1]);
    for (const e of st.edges.slice(1))
      expect(Math.abs(e - st.edges[0]), 'header, controls and list share ONE left edge').toBeLessThanOrEqual(1.5);
    expect(st.meta, 'v115: the suggested-prices meta line stays deleted').toBe(false);
    // the column band is the app's only statement of the target outside Settings, in the mock's words
    expect(st.suggestedTh, 'the Suggested column carries the live target').toMatch(/^Suggested at \d+(\.\d+)?%$/);
    expect(st.note, 'the footnote states the same target, live').toMatch(/measured against your \d+(\.\d+)?% target/);
    expect(st.headRows, 'the header stays ONE row — its actions must not wrap').toBe(1);
    expect(st.sub, 'the header sub-line names the current menu (mock §3.2)').toBe('Original menu');
    await page.locator('#tab-analysis .panel').screenshot({ path: `tests/visual/__shots__/v142-menu-header-${size.name}.png` });
  });
}

for (const size of SIZES) {
  test(`v142: a fresh install has NO menus — its own state, and no dead controls @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator('.navbtn[data-tab="analysis"]').click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/visual/__shots__/v142-menu-nomenus-${size.name}.png`, fullPage: true });
    const st = await page.evaluate(() => {
      const vis = s => { const e = document.querySelector(s); return !!(e && e.offsetParent !== null); };
      const box = document.querySelector('.es-row .empty-state.es-built');
      return {
        built: !!box,
        copy: box ? box.textContent : '',
        /* 179: the SWITCHER, not the row that holds it — see the rewritten assertion below. */
        switcher: vis('#menuSelect'),
        switcherSearch: vis('#menuSwitchRow .plib-search'),
        switcherPct: vis('#menuScopePct'),
        switchRowH: Math.round(document.getElementById('menuSwitchRow').getBoundingClientRect().height),
        rehomed: document.getElementById('menuAddDishBtn').parentElement.id,
        filters: vis('#menuFilterRow'),
        band: vis('.mnu-band'),
        del: vis('#menuDelBtn'),
        note: vis('#menuListNote'),
      };
    });
    expect(st.built, 'zero menus routes through the shared empty-state helper').toBe(true);
    expect(st.copy, 'and says so in its own words, not "this menu"').toContain('No menus yet');
    expect(st.copy, 'with the one action that resolves it').toContain('New menu');
    /* every control that would do nothing here is stood down — F2's true-empty defect, which was
       an option-less <select> left rendering beside an empty list.
       179 CONSCIOUS REWRITE. This used to assert `#menuSwitchRow` itself was not rendered, which
       was a fair proxy while the row held nothing but controls: renderAnalysis set `hidden` on it.
       Below 768 that row now HOSTS #menuAddDishBtn, so hiding it wholesale would have taken a real
       action off the phone with it — and on the Ingredients screen the identical change would have
       taken the setup wizard away at first run, which is the regression this batch came closest to
       shipping. The row therefore keeps rendering and hides its FILTERS (`.is-nofilters`).
       So the assertion moves onto the thing the comment above always named — the option-less
       `<select>` and its companions — plus the two facts that make "the row is still there" honest
       rather than a hole: at desktop it collapses to nothing, and at mobile the only thing in it is
       the rehomed action, which was visible in the header here before this batch and is unchanged
       in behaviour by being one line lower. */
    expect(st.switcher, 'no option-less switcher over zero menus').toBe(false);
    expect(st.switcherSearch, 'and nothing to search either').toBe(false);
    expect(st.switcherPct, 'and no food-cost pill for a menu that does not exist').toBe(false);
    if (size.width < 768) {
      expect(st.rehomed, 'the rehomed action is in the row').toBe('menuSwitchRow');
    } else {
      expect(st.rehomed, 'at desktop the action is back in the header…').toBe('');
      /* Zero HEIGHT, which is the part of the old `hidden` that was ever observable. The row keeps
         its horizontal padding and is not literally absent — nothing paints in it, so the
         difference is unobservable, and the assertion says height rather than implying more. */
      expect(st.switchRowH, '…so the emptied row measures zero height').toBe(0);
    }
    expect(st.filters, 'no filter row over zero rows').toBe(false);
    expect(st.band, 'no column band over zero rows').toBe(false);
    expect(st.del, 'no Delete when there is no menu to delete').toBe(false);
    expect(st.note, 'no footnote about a target no row is measured against').toBe(false);
  });
}

for (const size of SIZES) {
  test(`v142: menu search-empty (variant A) @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await installBoot(page);
    // a menu and one dish, so "search matches nothing" is REACHABLE. Without a seed this drove
    // variant A against zero menus, which is a different state with different copy (above).
    await page.addInitScript(() => {
      if (localStorage.getItem('__f5_seeded')) return;
      localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original menu' }]));
      localStorage.setItem('cafeDB_plates', JSON.stringify([
        { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] }]));
      localStorage.setItem('cafeDB_menu', JSON.stringify([
        { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' }]));
      localStorage.setItem('__f5_seeded', '1');
    }, {});
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator('.navbtn[data-tab="analysis"]').click();
    await page.waitForTimeout(400);
    await page.fill('#menuSearch', 'zzz-no-such-dish');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/visual/__shots__/v142-menu-searchempty-${size.name}.png`, fullPage: true });
    const es = await page.evaluate(() => {
      const box = document.querySelector('.es-row .empty-state.es-built');
      if (!box) return null;
      const r = box.getBoundingClientRect();
      const p = document.querySelector('#aBody').getBoundingClientRect();
      return {
        // centred: the old pin measured the td's padding symmetry, a proxy for this. .es-row is a
        // plain div now with nothing to out-specify it, so measure the thing itself.
        leftGap: r.left - p.left,
        rightGap: p.right - r.right,
        // the filter row STAYS up here — a filter is active and Clear filters is the way out.
        // That is the difference from the zero-menus state, and the reason both are tested.
        filters: !!document.querySelector('#menuFilterRow').offsetParent,
        clear: getComputedStyle(document.getElementById('menuClearFilters')).display !== 'none',
      };
    });
    expect(es, 'an es-built empty-state must exist').not.toBeNull();
    expect(Math.abs(es.leftGap - es.rightGap), 'the empty state is centred in the list').toBeLessThanOrEqual(1.5);
    expect(es.filters, 'the filter row stays up while a filter is on — it is the way out').toBe(true);
    expect(es.clear, 'and Clear filters is showing').toBe(true);
  });
}
