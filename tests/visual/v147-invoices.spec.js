/*
 * v147-invoices.spec.js — F8. The measured half of the Invoices conversion.
 *
 * tests/inv-upload.test.js pins the source facts (which function owns the steps, which markup was
 * deleted, which decision was taken). This file pins the things only a browser can settle, and each
 * one is here because reading the file would have given the wrong answer:
 *
 *  - THE 44px APPLY TARGET. The rule is `min-width/min-height` on a <label> wrapping the checkbox.
 *    Whether that resolves to 44 depends on the flex context it lands in, and the whole point of
 *    choosing a label over a ::after was that a spec could read its boundingBox. Measuring is also
 *    what revealed that the box is 24px and never was the 26px its own rule asked for.
 *  - EXACTLY ONE STEP VISIBLE. The [hidden] corollary is an ORIGIN fight, and origin is not visible
 *    in a stylesheet — it is only visible in a computed style.
 *  - NO HOVER WASH on a review row. Hovering is a real event; asserting on the CSS text alone would
 *    miss a wash arriving from a shared ancestor rule.
 *  - NO HORIZONTAL OVERFLOW at 380. The modal became a bottom sheet with a full-bleed footer band
 *    pulled out by negative margins, which is exactly the shape that overflows if the pull-out and
 *    the body padding ever disagree.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* Two matched rows and one add-new row with NO form open — the shape the tick fix is about. */
const SEED = () => {
  window.invRows = [
    { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108',
      unitPrice: 2.68, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
      addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
    { name: 'CHEESE TASTY SHRED 2KG', raw: 'CHEESE TASTY SHRED 2KG', bestId: 'P0031',
      unitPrice: 4.1, unit: 'kg', conf: 0.5, tier: 'mid', cands: [{ id: 'P0031', coverage: 0.5 }],
      addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
    { name: 'MYSTERY WIDGET 12PK', raw: 'MYSTERY WIDGET 12PK', bestId: null, unitPrice: 4.1, unit: 'ea',
      conf: 0.1, tier: 'lo', cands: [], addNew: true, newItem: null, manualPick: false,
      needManual: false, unitMismatch: false, uncertain: false, remembered: false },
  ];
  window.invRows.forEach(window.flagNeedsAttention);
  window.renderInvReview();
  window.show('invModal');
};

async function boot(page, w, h, theme) {
  await page.setViewportSize({ width: w, height: h });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  if (theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
}

test('the Invoices screen renders, lights its nav item, and offers exactly one primary', async ({ page }) => {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await boot(page, 1360, 900);
  await page.evaluate(() => window.showTab('invoices'));
  await page.waitForTimeout(300);

  await expect(page.locator('#tab-invoices')).toBeVisible();
  await expect(page.locator('#invDropZone')).toBeVisible();
  // §7: one primary action per screen region. The header's Upload invoice is it; the dropzone is
  // the same intent in its dashed form, and must NOT also be a filled orange button.
  const primaries = await page.locator('#tab-invoices .btn.primary').count();
  expect(primaries, 'one primary on the screen').toBe(1);
  await expect(page.locator('#sideInvoices')).toHaveClass(/active/);
  // the other five panes are down
  const open = await page.evaluate(() => ['builder', 'ingredients', 'analysis', 'dashboard', 'pantry']
    .filter((n) => { const el = document.getElementById('tab-' + n); return el && getComputedStyle(el).display !== 'none'; }));
  expect(open, 'no other pane may stay up under the new one').toEqual([]);
  expect(errs, errs.join('|')).toHaveLength(0);
});

test('exactly one upload step is ever visible, through the whole flow', async ({ page }) => {
  await boot(page, 1360, 900);
  const visible = () => page.evaluate(() => ['invStepChoose', 'invStepScan', 'invStepReview']
    .filter((id) => getComputedStyle(document.getElementById(id)).display !== 'none'));

  await page.evaluate(() => window.openInv());
  await page.waitForTimeout(200);
  expect(await visible(), 'opening lands on choose').toEqual(['invStepChoose']);

  await page.evaluate(() => window.invStep('scan'));
  expect(await visible(), 'scanning is alone').toEqual(['invStepScan']);

  await page.evaluate(SEED);
  await page.waitForTimeout(300);
  expect(await visible(), 'a rendered review is alone').toEqual(['invStepReview']);

  // and a failure walks it back to where the recovery controls are
  await page.evaluate(() => window.invFileFailed('boom', false));
  await page.waitForTimeout(200);
  expect(await visible(), 'a failure returns to choose').toEqual(['invStepChoose']);
  await expect(page.locator('#invFileErr')).toBeVisible();
});

test('the Apply tick is a 44px target while the box stays its app-wide size', async ({ page }) => {
  await boot(page, 1360, 900);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);
  const hit = await page.locator('.appr-hit').first().boundingBox();
  const box = await page.locator('.invAppr').first().boundingBox();
  expect(hit.width, 'the label the thumb hits').toBeGreaterThanOrEqual(44);
  expect(hit.height).toBeGreaterThanOrEqual(44);
  /* 24, not the 26 the deleted `.invAppr` rule claimed — `input[type=checkbox]` (0-1-1) has always
     outranked it (0-1-0). Measured on the branch point before any of this landed, so this asserts
     that the hit-area fix changed the TARGET and left the PAINT alone. */
  expect(Math.round(box.width), 'the checkbox itself is visually unchanged at the app-wide 24px').toBe(24);
  expect(hit.width, 'and the target is meaningfully bigger than the box').toBeGreaterThan(box.width + 15);
  // and pressing the label toggles the box — a label that does not is just decoration
  const before = await page.locator('.invAppr').first().isChecked();
  await page.locator('.appr-hit').first().click({ position: { x: 3, y: 3 } });   // the CORNER, i.e. outside the box itself
  await page.waitForTimeout(150);
  expect(await page.locator('.invAppr').first().isChecked(), 'a press in the corner of the target still toggles').toBe(!before);
});

test('a review row carries its warn tint and gains no hover wash', async ({ page }) => {
  await boot(page, 1360, 900);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);
  const row = page.locator('tr.st-review').first();
  const idle = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  await row.hover();
  await page.waitForTimeout(250);
  const hovered = await row.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(hovered, 'the tint is the row background, hover or not — a wash here masks the one signal on the rows being scanned').toBe(idle);
  expect(idle, 'and it is still --warn-bg, not the old red').toBe('rgb(253, 243, 224)');
});

test('ticking an add-new row that has no form opens the form, and the tick survives a rebuild', async ({ page }) => {
  await boot(page, 1360, 900);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.invRows[2].newItem), 'the row starts with no form').toBeNull();
  expect(await page.locator('#ni_name2').count()).toBe(0);

  await page.locator('tr[data-i="2"] .invAppr').check();
  await page.waitForTimeout(300);
  await expect(page.locator('#ni_name2'), 'the form opened on the tick').toBeVisible();
  expect(await page.evaluate(() => !!(window.invRows[2].newItem && window.invRows[2].newItem.approved)),
    'and the tick landed on the one place that stores it').toBe(true);

  // now force a full re-render from a DIFFERENT row — the path that used to drop it
  await page.locator('tr[data-i="0"] .invPrice').fill('3.10');
  await page.locator('tr[data-i="0"] .invPrice').dispatchEvent('change');
  await page.waitForTimeout(400);
  expect(await page.locator('tr[data-i="2"] .invAppr').isChecked(), 'the tick survived the rebuild').toBe(true);
});

for (const theme of ['light', 'dark']) {
  test(`nothing overflows sideways at 380px — ${theme}`, async ({ page }) => {
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await boot(page, 380, 780, theme);

    await page.evaluate(() => window.showTab('invoices'));
    await page.waitForTimeout(300);
    let over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, 'the Invoices screen').toBeLessThanOrEqual(0);

    await page.evaluate(SEED);
    await page.waitForTimeout(400);
    over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, 'the review sheet').toBeLessThanOrEqual(0);

    /* The footer band is pulled out of .mbody's padding with negative margins to reach the sheet's
       edges. If the pull-out and the padding ever disagree it either insets (reads as one more card)
       or overhangs (a sideways scroll). Measured against the SHEET, not the viewport: CLAUDE.md's
       geometry rule is about not naming a reference you did not measure. */
    const [bar, sheet] = await page.evaluate(() => {
      const b = document.querySelector('.inv-actions').getBoundingClientRect();
      const s = document.querySelector('#invModal > .modal').getBoundingClientRect();
      return [{ l: b.left, r: b.right }, { l: s.left, r: s.right }];
    });
    expect(Math.abs(bar.l - sheet.l), 'the footer reaches the sheet’s left edge').toBeLessThanOrEqual(1);
    expect(Math.abs(bar.r - sheet.r), 'and its right edge').toBeLessThanOrEqual(1);
    expect(errs, errs.join('|')).toHaveLength(0);
  });
}

/* The whole flow, driven the way a person drives it: a real file through the real <input>, starting
   from the SCREEN with the modal shut. Everything above pokes one part; this is the only test that
   proves the parts connect, and it is the one that catches "the modal never opened itself" and "the
   previous invoice was still in the paste box".
   `aiInvoiceCheck = false` because the harness aborts every off-origin request: with it on, the
   referee gate holds the review at the waiting panel forever and the test would be measuring the
   harness. The gate itself is pinned by tests/invoice-gate.test.js against the real function. */
for (const [label, w, h] of [['desktop', 1360, 900], ['phone', 380, 780]]) {
  test(`a real file imported from the screen walks choose -> scanning -> review @ ${label}`, async ({ page }) => {
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await boot(page, w, h);
    await page.evaluate(() => { window.aiInvoiceCheck = false; });
    await page.evaluate(() => window.showTab('invoices'));
    await page.waitForTimeout(300);
    const visible = () => page.evaluate(() => ['invStepChoose', 'invStepScan', 'invStepReview']
      .filter((id) => getComputedStyle(document.getElementById(id)).display !== 'none'));

    await page.setInputFiles('#invFile', {
      name: 'bidfood.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('Chips Straight Cut, 2.68\nTasty Cheese Block, 9.80\nMystery Widget, 4.10\n'),
    });
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => document.getElementById('invModal').classList.contains('open')),
      'a file dropped on the screen opens the modal it needs — the three steps live there').toBe(true);
    expect(await visible()).toEqual(['invStepReview']);
    expect(await page.locator('#invReview tr.inv-data').count(), 'every line became a row').toBe(3);

    /* Now a file with nothing parseable, started from the screen again with the modal shut. Before
       the reset this landed on step 1 beside a paste box holding the PREVIOUS invoice's text and an
       #invReview still full of its rows — one "Match products" from silently re-importing it. */
    await page.evaluate(() => window.closeInv());
    await page.waitForTimeout(300);
    await page.setInputFiles('#invFile', { name: 'junk.csv', mimeType: 'text/csv', buffer: Buffer.from('nothing here\n') });
    await page.waitForTimeout(900);
    expect(await visible(), 'an unparseable file returns to the panel with the controls on it').toEqual(['invStepChoose']);
    expect(await page.locator('#invCsv').inputValue(), 'and the paste box holds THIS file, not the last import').toBe('nothing here\n');
    expect(await page.evaluate(() => document.getElementById('invReview').innerHTML.length),
      'and the previous review is gone, not merely hidden behind a panel').toBe(0);
    expect(errs, errs.join('|')).toHaveLength(0);
  });
}
