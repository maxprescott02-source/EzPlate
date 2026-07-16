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

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

// viewport-only (not fullPage) header shots — the review artifact for the header/button work
for (const tab of ['pantry', 'ingredients', 'builder']) {
  test(`fresh ${tab} header @ mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 780 });
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator(`.navbtn[data-tab="${tab}"]`).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/visual/__shots__/fresh-${tab}-mobile.png` });
    await expect(page.locator('body')).toBeVisible();
  });
}

test('v44 item 8: builder lines render as name row + costs row @ 380px', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  // drive the real add paths (global fns): one product line + one misc line
  await page.evaluate(() => {
    window.addProduct('P0108'); window.addMiscCost();
    const ml = document.querySelector('.misc-label'); if (ml) ml.value = 'Packaging + napkins';
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.waitForTimeout(300);
  await page.locator('#lines').screenshot({ path: 'tests/visual/__shots__/builder-lines-mobile.png' });
  // the misc label must get real width at 380px — the standing complaint
  const w = await page.evaluate(() => document.querySelector('.misc-label').getBoundingClientRect().width);
  expect(w, 'misc label width at 380px').toBeGreaterThan(240);
  // and the line total must not be pushed off the card by the costs row
  const lc = await page.evaluate(() => {
    const el = document.querySelector('.line .costs .lc');
    return el ? { right: el.getBoundingClientRect().right, w: el.getBoundingClientRect().width } : null;
  });
  expect(lc, 'line total must render in the costs row').not.toBeNull();
  expect(lc.w, 'line total must have real width').toBeGreaterThan(10);
  expect(lc.right, 'line total must fit inside the 380px viewport').toBeLessThanOrEqual(380);
});

test('v44 items 1+3: unified pack control (both moods) + pills on the title baseline', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { document.documentElement.setAttribute('data-theme', 'dark'); });
  await page.locator('.navbtn[data-tab="builder"]').click();
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

test('v44 item 9: Save draft parks the plate under "Unassigned dishes" in the menu selector', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.evaluate(() => window.addProduct('P0108'));
  await page.fill('#plateName', 'WIP Winter Special');
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(400);
  // the selector now offers the holding menu, and the draft is really on it
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  const opt = page.locator('#menuSelect option[value="MENU_UNASSIGNED"]');
  await expect(opt).toHaveCount(1);
  await expect(opt).toContainText('Unassigned dishes');
  await page.selectOption('#menuSelect', 'MENU_UNASSIGNED');
  await page.waitForTimeout(300);
  await expect(page.locator('#tab-analysis')).toContainText('WIP Winter Special');
  await expect(page.locator('#menuDelBtn')).toBeHidden();            // the holding menu is never deletable
  await page.screenshot({ path: 'tests/visual/__shots__/save-draft-unassigned.png' });
});

test('v44 item 6: a confirm dialog stacks ABOVE the Settings panel', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    document.getElementById('settingsPanel').classList.add('open');
    window.askConfirm('Clear cached data?', 'This signs you out of nothing and deletes nothing shared.', 'Clear', function(){});
  });
  await page.waitForTimeout(300);
  // whichever overlay owns the centre pixel is the one the user can tap
  const topOwner = await page.evaluate(() => {
    const el = document.elementFromPoint(190, 390);
    return el && el.closest('#confirmModal') ? 'confirm'
         : el && el.closest('#settingsPanel') ? 'settings' : (el ? el.id || el.className : 'none');
  });
  await page.screenshot({ path: 'tests/visual/__shots__/confirm-over-settings.png' });
  expect(topOwner, 'the confirm must be tappable above Settings').toBe('confirm');
});

for (const size of SIZES) {
  test(`fresh analysis empty state @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort()); // offline: no Supabase, no CDN
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator('.navbtn[data-tab="analysis"]').click();
    await page.waitForTimeout(400);
    // force the an-empty card by driving the REAL UI: a search that matches nothing
    // renders the same .an-empty td/.an-empty-box geometry as "No menu items yet"
    await page.fill('#menuSearch', 'zzz-no-such-dish');
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/visual/__shots__/fresh-analysis-${size.name}.png`, fullPage: true });
    // the real check is the image, but pin the fix structurally too:
    // the empty cell must have symmetric horizontal padding (the 28px-right bug)
    const pad = await page.evaluate(() => {
      const td = document.querySelector('.an-empty td');
      if (!td) return null;
      const cs = getComputedStyle(td);
      return { left: cs.paddingLeft, right: cs.paddingRight };
    });
    expect(pad, 'an-empty td must exist').not.toBeNull();
    expect(pad.left, 'empty-state cell must not be padded asymmetrically').toBe(pad.right);
  });
}
