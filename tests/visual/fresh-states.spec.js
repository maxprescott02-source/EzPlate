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
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.evaluate(() => {
    // the exact case that broke: several real lines — kid line, direct products, misc
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
    window.addKitchenLine('K1');
    window.addProduct('P0004');   // branded product (subtitle = supplier only now)
    window.addProduct('P0005');   // per-unit priced
    window.addMiscCost();
    const ml = document.querySelector('.misc-label'); if (ml) ml.value = 'Packaging + napkins';
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.waitForTimeout(300);
  // declutter: no badges, no ingredient pill, subtitle has no category tail
  await expect(page.locator('#lines .edited')).toHaveCount(0);
  await expect(page.locator('#lines .king-tag')).toHaveCount(0);
  await expect(page.locator('#lines .row2')).toHaveCount(0);
  const directSub = await page.locator('.line:not(.misc-line):not([data-uid="1"]) .sub').nth(0).textContent();
  expect(directSub, 'direct-product subtitle is supplier only').not.toContain('·');
  // overflow regression: every total fits inside its CARD's content box (viewport-only checks
  // let a 78px-min-width total sit on the card border and still "pass"), and the dotted leader
  // keeps real width so the docket connector survives at 380px
  const fit = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('#lines .line').forEach(line => {
      const lr = line.getBoundingClientRect(), cs = getComputedStyle(line);
      const lc = line.querySelector('.costs .lc'), ld = line.querySelector('.costs .leader');
      if (lc) out.push({
        overflow: lc.getBoundingClientRect().right - (lr.right - parseFloat(cs.paddingRight)),
        leaderW: ld ? ld.getBoundingClientRect().width : null,
      });
    });
    return { rows: out, scrollW: document.scrollingElement.scrollWidth };
  });
  for (const r of fit.rows) {
    expect(r.overflow, 'line total stays inside the card content box').toBeLessThanOrEqual(0.5);
    if (r.leaderW != null) expect(r.leaderW, 'dotted leader keeps visible width').toBeGreaterThanOrEqual(10);
  }
  expect(fit.scrollW, 'no horizontal scroll at 380px').toBeLessThanOrEqual(380);
  // misc $ hugs its input
  const gap = await page.evaluate(() => {
    const u = document.querySelector('.misc-costbox .u').getBoundingClientRect();
    const inp = document.querySelector('.misc-costbox input').getBoundingClientRect();
    return inp.left - u.right;
  });
  expect(gap, 'misc $ sits close to its field').toBeLessThanOrEqual(6);
  await page.locator('#lines').screenshot({ path: 'tests/visual/__shots__/v45-builder-380.png' });
});

test('v45 item 3: Ingredients header order — title, divider, buttons, strapline', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="pantry"]').click();
  await page.waitForTimeout(300);
  // v49 update: the pantry title is a REAL .panel h2 now (was an h3 styled to match)
  const order = await page.evaluate(() => {
    const y = sel => document.querySelector(sel).getBoundingClientRect().top;
    return {
      title: y('.king-panel > h2'), btn: y('#kingNew'), sub: y('.king-head .king-sub'),
      divider: getComputedStyle(document.querySelector('.king-panel > h2')).borderBottomWidth,
    };
  });
  expect(order.divider, 'divider sits under the title').toBe('1px');
  expect(order.btn, 'buttons below the title').toBeGreaterThan(order.title);
  expect(order.sub, 'strapline below the buttons').toBeGreaterThan(order.btn);
  await page.screenshot({ path: 'tests/visual/__shots__/v45-pantry-header.png' });
});

test('v45 item 4: button copy at both breakpoints', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await page.waitForTimeout(300);
  expect((await page.locator('#newBtn').innerText()).trim(), 'mobile shortens to + New').toBe('+ New');
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  expect((await page.locator('#menuAddDishBtn').innerText()).trim(), 'full label survives mobile').toBe('+ Existing dish');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator('.navbtn[data-tab="ingredients"]').click();
  await page.waitForTimeout(300);
  expect((await page.locator('#newBtn').innerText()).trim(), 'desktop says + New product').toBe('+ New product');
});

test('v45 item 5: dashboard target line keeps consistent headroom on every range', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    // worst case everywhere: all data BELOW the target so the target is the topmost line.
    // recent points tight (the old <4 branch), older points spread wide (the old flat ±1).
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 6; d++) pts.push({ t: now - d * day, v: 27 + (d % 2) * 0.5 });      // 7d: tight
    for (let d = 10; d <= 360; d += 14) pts.push({ t: now - d * day, v: 20 + (d % 10) });     // long: wide
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
    window.cogsPct = 30;
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  const headrooms = {};
  for (const rg of ['1w', '1m', '3m', '6m', '1y', 'all']) {
    await page.evaluate(r => window.setDashRange(r), rg);
    await page.waitForTimeout(250);
    const y1 = await page.evaluate(() => {
      const l = document.querySelector('.ref-line');
      return l ? parseFloat(l.getAttribute('y1')) : null;
    });
    expect(y1, `range ${rg} renders the target line`).not.toBeNull();
    headrooms[rg] = y1;
    // proportional padding guarantees ≥ ~18% of plot height above the target (≈45 viewBox units incl. padT)
    expect(y1, `range ${rg}: target line must not hug the range bar`).toBeGreaterThanOrEqual(40);
    await page.locator('.dash-chart').screenshot({ path: `tests/visual/__shots__/v45-dash-${rg}.png` });
  }
  console.log('[v45 item 5] ref-line y per range:', headrooms);
});

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
  test(`v46 item 3: ingredient cards share the Products grid @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      window.kitchenIngredients.push(
        { id: 'K1', name: 'Chips', pid: 'P0108' }, { id: 'K2', name: 'Bacon', pid: 'P0004' },
        { id: 'K3', name: 'Milk', pid: 'P0201' }, { id: 'K4', name: 'Cheese', pid: 'P0031' },
      );
      window.rebuildKById(); window.renderKitchenPanel();
    });
    await page.locator('.navbtn[data-tab="pantry"]').click();
    await page.waitForTimeout(300);
    const grid = await page.evaluate(() => {
      const king = Array.from(document.querySelectorAll('#kingList .king-row')).map(r => Math.round(r.getBoundingClientRect().left));
      const link = document.querySelector('.king-row[data-kid="K2"] .king-link');
      return {
        kingCols: new Set(king).size,
        ingCols: getComputedStyle(document.querySelector('#kingList')).gridTemplateColumns.split(' ').length,
        clamp: link ? getComputedStyle(link).webkitLineClamp : null,
      };
    });
    // the SAME column story as .ing-list: 1 col at 380, 3 at 1280
    expect(grid.kingCols, 'ingredient card columns').toBe(size.name === 'desktop' ? 3 : 1);
    expect(grid.clamp, 'linked-product line clamps to 2 lines').toBe('2');
    // keyboard access survives the restyle
    await page.evaluate(() => document.querySelector('.king-row[data-kid="K1"]').focus());
    await page.keyboard.press('Enter');
    await expect(page.locator('#kingModal')).toHaveClass(/open/);
    await page.locator('#kingModalCancel').click();
    await page.locator('#kingList').screenshot({ path: `tests/visual/__shots__/v46-king-grid-${size.name}.png` });
  });

  test(`v46 item 5: flag pill centres on the title line @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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

  test(`v46 item 6: builder dots sit on the shared text baseline @ ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.locator('.navbtn[data-tab="builder"]').click();
    await page.evaluate(() => {
      window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
      window.rebuildKById();
      window.addKitchenLine('K1');
      window.addProduct('P0004');
      window.addMiscCost();
      const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
    });
    await page.waitForTimeout(300);
    const rows = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('#lines .line .costs').forEach(costs => {
        const leader = costs.querySelector('.leader'), lc = costs.querySelector('.lc');
        if (!leader || !lc) return;
        const r = document.createRange(); r.selectNodeContents(lc);
        const t = r.getClientRects()[0];
        out.push({ rule: leader.getBoundingClientRect().bottom, textTop: t.top, textBottom: t.bottom });
      });
      return out;
    });
    expect(rows.length, 'builder lines rendered').toBeGreaterThanOrEqual(3);
    for (const row of rows) {
      // the dotted rule sits at the total's BASELINE: below the text's vertical centre
      // (never strikethrough) and above its descender bottom
      const centre = (row.textTop + row.textBottom) / 2;
      expect(row.rule, 'rule below the text centre').toBeGreaterThan(centre);
      expect(row.textBottom - row.rule, 'rule within the descent band').toBeGreaterThanOrEqual(2);
      expect(row.textBottom - row.rule, 'rule not sunk under the text').toBeLessThanOrEqual(6);
    }
    await page.locator('#lines').screenshot({ path: `tests/visual/__shots__/v46-builder-baseline-${size.name}.png` });
  });
}

test('v46 items 1+4: strapline inline on desktop; target line labels itself (no pill, big number stays)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="pantry"]').click();
  await page.waitForTimeout(300);
  const head = await page.evaluate(() => {
    const c = s => { const r = document.querySelector(s).getBoundingClientRect(); return (r.top + r.bottom) / 2; };
    return { sub: c('.king-head .king-sub'), btn: c('#kingNew') };
  });
  expect(Math.abs(head.sub - head.btn), 'strapline vertically centred with the buttons row').toBeLessThanOrEqual(2);
  // item 4: seed history so the chart draws, then check the pill is gone and the line is labelled
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
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
        const title = document.querySelector('.chart-title').getBoundingClientRect();
        return {
          pts: window.dashRangePts().length,
          yTicks: yLbls.length,
          xLbls: texts.length - yLbls.length,
          targetTick: yLbls.some(t => parseFloat(t.textContent) === window.cogsPct),
          // v48 stability pins: rendered label height (font size), label left edge vs the
          // title's, and the plot gutter must all be IDENTICAL for every range
          lblH: +yLbls[0].getBoundingClientRect().height.toFixed(2),
          lblLeft: +yLbls[0].getBoundingClientRect().left.toFixed(1),
          maxLblRight: Math.max(...yLbls.map(t => t.getBoundingClientRect().right)),
          plotLeftPx: (() => {
            const s = svg.getBoundingClientRect();
            return s.left + (window.TREND_GEO.padL / window.TREND_GEO.W) * s.width;
          })(),
          titleLeft: +title.left.toFixed(1),
          padL: window.TREND_GEO.padL,
          bezier: svg.querySelector('g[clip-path] path[stroke]').getAttribute('d').includes('C'),
          dots: svg.querySelector('g[clip-path]').querySelectorAll('.tc-pt').length,
          pattern: !!svg.querySelector('pattern#tcdots'),
          clipGroups: svg.querySelectorAll('g[clip-path]').length,
          caption: document.querySelector('.chart-hint').textContent,
          focusable: svg.getAttribute('tabindex') === '0',
        };
      });
      expect(st.yTicks, `${rg}: 3–4 y ticks`).toBeGreaterThanOrEqual(3);
      expect(st.yTicks, `${rg}: 3–4 y ticks`).toBeLessThanOrEqual(4);
      expect(st.xLbls, `${rg}: x-axis date labels removed (v48)`).toBe(0);
      expect(st.targetTick, `${rg}: the target value IS one of the labelled ticks`).toBe(true);
      expect(st.lblLeft - st.titleLeft, `${rg}: y labels share the title's left edge`).toBeLessThanOrEqual(1.5);
      expect(st.lblLeft - st.titleLeft, `${rg}: y labels share the title's left edge`).toBeGreaterThanOrEqual(-1.5);
      // v51 (replaces the v48 "labels end before the plot gutter" pin): the y labels now OVERLAY the
      // plot (start-anchored at x=0, white halo keeps them legible) so there is NO left gutter — the
      // plotted curve begins at the card's text column instead of ~44px right of it (Max's on-phone
      // "graph not inline with the card" report). Pin the plot's left edge hugging the title/label edge.
      expect(st.plotLeftPx - st.titleLeft, `${rg}: the plot starts at the card's text column (no y-axis gutter)`).toBeLessThanOrEqual(10);
      expect(st.plotLeftPx - st.titleLeft, `${rg}: the plot does not overshoot left of the text column`).toBeGreaterThanOrEqual(-1.5);
      expect(st.bezier, `${rg}: smooth curve (cubic segments)`).toBe(true);
      expect(st.pattern, `${rg}: dotted area fill`).toBe(true);
      expect(st.clipGroups, `${rg}: bright + dim groups`).toBe(2);
      expect(st.caption.includes('Tap a point'), `${rg}: tap hint dropped`).toBe(false);
      expect(st.focusable, `${rg}: plot is focusable`).toBe(true);
      if (st.pts <= 32) expect(st.dots, `${rg}: sparse range shows reading dots`).toBe(st.pts);
      else expect(st.dots, `${rg}: dense range drops reading dots`).toBe(0);
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
    await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
      tipShown: document.getElementById('trendTip').classList.contains('show'),
    }));
    expect(rest.cross, 'crosshair hidden at rest').toBe('hidden');
    expect(rest.brightW, 'full brightness at rest').toBe(320);
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
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
  expect(two.nonPct, 'v48: no date labels, no Target word — % ticks are the only text').toBe(0);
  await page.locator('.dash-chart').screenshot({ path: 'tests/visual/__shots__/v47-2pts.png' });
  // dark theme with the red (worsening) line
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
  expect(darkStroke, 'semantic colour survives: rising cost = red (--bad)').toBe('var(--bad)');
  await page.locator('.dash-chart').screenshot({ path: 'tests/visual/__shots__/v47-dark-scrub.png' });
});

/* ===== v48: final chart declutter + stability ===== */

test('v48: NON-ROUND target (32%) still lands exactly on a labelled tick — the unlabelled-line guarantee', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
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
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 30; d += 2) pts.push({ t: now - d * day, v: 27 + (d % 5) });
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  const svg = page.locator('#trendWrap svg');
  // pointer focus: no ring, no tap flash
  await svg.click({ position: { x: 150, y: 100 } });
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

test('v48: menu header rhythm — label, value line, colour key on one spacing token', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(400);
  const gaps = await page.evaluate(() => {
    const lbl = document.querySelector('.cogs-set > .cogs-lbl').getBoundingClientRect();
    const val = document.querySelector('.cogs-help').getBoundingClientRect();
    const key = document.querySelector('.akey span').getBoundingClientRect();   // the key's content — .akey carries its gap as padding-top
    return { lblToVal: val.top - lbl.bottom, valToKey: key.top - val.bottom };
  });
  expect(Math.abs(gaps.lblToVal - gaps.valToKey), 'the two gaps are equal (even rhythm)').toBeLessThanOrEqual(2);
  await page.locator('.an-controls').screenshot({ path: 'tests/visual/__shots__/v48-menu-rhythm.png' });
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
