/*
 * 200-pack-unit.spec.js — QUEUE 0b, driven in a real browser at both widths and both themes.
 *
 * The unit tests prove the guard's DECISION. This proves the user can act on it: that the control
 * genuinely cannot offer a re-basing unit, that the row is tinted, badged and explained rather than
 * silently pre-ticked, and that the explanation is legible in dark mode — the app's own
 * `.flag-review` / `.pt-explain` pair, which no unit test measures.
 *
 * Why a browser is the only place this settles: the pack-unit <select> is built from a live product
 * lookup at render time, the tint comes from an `st-*` class resolved against CSS custom properties,
 * and the pre-tick is set by the renderer AND re-set by the pack-teach handler. Three mechanisms in
 * three languages have to agree, and only the rendered page can be asked whether they did.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* P0001 is stored per GRAM. The row asks to be taught a pack, which is the flow the defect lived in. */
const SEED = () => {
  window.invRows = [
    { name: 'APPLE PIE GRANNYS 16S', raw: 'APPLE PIE GRANNYS 16S 1-003 55.00', bestId: 'P0001',
      unitPrice: null, unit: 'auto', conf: 0.9, tier: 'hi', cands: [{ id: 'P0001', coverage: 0.9 }],
      addNew: false, manualPick: false, needManual: true, unitMismatch: false, uncertain: false,
      remembered: false },
  ];
  window.renderInvReview();
  document.getElementById('invModal').classList.add('open');
};

/* A row that already carries a cross-category pack, as data taught before the guard existed would. */
const SEED_STALE = () => {
  /* PRODUCTS/byId are `let` at top level, so they are not on `window` — setProduct is the app's own
     writer and is a hoisted function declaration, which is the honest way in anyway. */
  window.setProduct('P0001', { pack_qty: 16, pack_unit: 'ea' });
  window.invRows = [
    { name: 'APPLE PIE GRANNYS 16S', raw: 'APPLE PIE GRANNYS 16S 1-003 55.00', bestId: 'P0001',
      unitPrice: 3.44, unit: 'ea', conf: 0.9, tier: 'hi', cands: [{ id: 'P0001', coverage: 0.9 }],
      addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false,
      remembered: false, fromProductPack: true, packTaught: true, taughtQty: 16, taughtUnit: 'ea' },
  ];
  window.renderInvReview();
  document.getElementById('invModal').classList.add('open');
};

async function boot(page, width, theme, seed) {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.route('**/api/**', r => r.abort());
  if (theme) await page.addInitScript(t => { try { localStorage.setItem('cafeCost_theme', t); } catch (e) {} }, theme);
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.evaluate(seed);
  await page.waitForTimeout(250);
  return errs;
}

for (const width of [380, 1280]) {
  test(`0b @ ${width}: the pack-unit control cannot offer a re-basing unit`, async ({ page }) => {
    const errs = await boot(page, width, null, SEED);
    const opts = await page.locator('.invPackUnit option').evaluateAll(
      os => os.map(o => ({ value: o.value, label: o.textContent })));
    // The product is stored per gram, so units and litres are the two ways to corrupt it.
    expect(opts.map(o => o.value), 'weights only, on a weighted product').toEqual(['kg', 'g']);
    expect(await page.locator('.invPackUnit').inputValue(),
      'and it opens on the product’s own category, not the parser’s pack-count guess').toBe('kg');
    expect(errs).toEqual([]);
  });
}

for (const theme of ['light', 'dark']) {
  test(`0b @ ${theme}: a re-basing row is tinted, badged and EXPLAINED on screen`, async ({ page }) => {
    const errs = await boot(page, 380, theme, SEED_STALE);
    const row = page.locator('#invReview tr.inv-data').first();
    await expect(row).toHaveClass(/st-review/);
    await expect(row.locator('.invAppr')).not.toBeChecked();     // the whole point: never pre-ticked
    await expect(row.locator('.flag-mismatch')).toBeVisible();
    const explain = row.locator('.pt-explain').last();
    await expect(explain).toBeVisible();
    await expect(explain).toContainText('measured per kg');
    await expect(explain).toContainText('to per unit');
    await expect(explain).toContainText('Products screen');
    /* The message is the whole remedy, so it has to be READABLE in both themes. Not a denylist
       against one wrong colour — roster entry 190 is exactly that mistake — but a contrast floor
       measured against the surface it is actually painted on.
       ⚠️ THE FLOOR HERE IS 3.0, NOT 4.5, AND THAT IS A RECORDED SHORTFALL RATHER THAN THE STANDARD.
       Measured on this branch: 4.17 light, 4.32 dark. `.flag-review` is the app's own review-flag
       colour, worn by every explain line on this screen and shipped for many versions, so raising it
       is an app-wide palette change and `CLAUDE.md` requires those to be surgical and one screen at a
       time — it is filed in docs/MAINTENANCE.md with these numbers. Asserting 4.5 here would leave a
       red test that says nothing new every run; asserting 4.17 would pin the shortfall as intended.
       3.0 is the AA floor for large text and UI components, so this still catches a real regression
       (someone painting it at 2:1) without either lying. */
    const cr = await explain.evaluate((el) => {
      const rgb = s => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
      const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      let bg = null;
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = rgb(c); break; }
      }
      const fg = rgb(getComputedStyle(el).color);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    });
    expect(cr, `the explanation must stay legible in ${theme} — see the note above about the 4.5 shortfall`).toBeGreaterThanOrEqual(3.0);
    expect(errs).toEqual([]);
  });
}

test('0b: the stale pack is still SHOWN by the control — it must not read back a value nobody chose', async ({ page }) => {
  await boot(page, 1280, null, SEED_STALE);
  const opts = await page.locator('.invPackUnit option').evaluateAll(os => os.map(o => o.value));
  expect(opts, 'the product’s own two, plus the stale one that is actually stored').toEqual(['kg', 'g', 'ea']);
  expect(await page.locator('.invPackUnit').inputValue()).toBe('ea');
});

test('0b: choosing a unit in the product’s own category clears the flag and re-ticks the row', async ({ page }) => {
  /* The recovery path. A guard that flags and cannot be satisfied is a dead end, and the pack-teach
     handler patches cells rather than re-rendering — so the badge, the explanation and the tick all
     have to come right through a path that was never built to change a row's STATE. */
  const errs = await boot(page, 1280, null, SEED_STALE);
  const row = page.locator('#invReview tr.inv-data').first();
  /* 2.22 kg, not 16 — the stored price is $24.78/kg and $55 over 16 of anything is a >12% move, so
     a round number would leave the row flagged for a PRICE jump and the assertion would be reading
     the wrong guard. The point of this test is that the UNIT flag clears. */
  await row.locator('.invPackQty').fill('2.22');
  await row.locator('.invPackUnit').selectOption('kg');
  await page.waitForTimeout(200);
  await expect(row).toHaveClass(/st-matched/);
  await expect(row.locator('.invAppr')).toBeChecked();
  await expect(row.locator('.flag-mismatch')).toHaveCount(0);
  await expect(row.locator('.pt-explain'), 'the explanation is GONE, not merely reworded').toHaveCount(0);
  expect(errs).toEqual([]);
});
