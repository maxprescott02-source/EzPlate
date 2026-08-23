/*
 * 0e — the catalogue importer's GST question, at both breakpoints and in both themes.
 *
 * The unit suite proves catImportPlan converts. It cannot prove the SCREEN asks, that the answer
 * reaches the plan, or that the figure a café reads before pressing Import is the converted one —
 * which is the whole defect: a plausible per-kg number with nothing on any later screen revisiting
 * it. So this drives the real control and reads the real table cell.
 *
 * ⚠️ EVERY ASSERTION HERE IS AN EQUALITY, deliberately (CLAUDE.md roster entry 190): "$5.91/kg" is
 * a fact about this app, while "not $6.50" is a guess about every wrong value there could be.
 * The before/after pair is what makes it a test of the CONTROL rather than of the initial render.
 */
const { test, expect } = require('@playwright/test');

const CSV = 'PRODUCT CODE,BRAND,DESCRIPTION,PACK SIZE,CTN QTY,UOM,LAST PRICE PAID\n'
  + '1001,Edgell,"CHIPS, STRAIGHT CUT",10KG,1,KG,65.00\n'
  + '1002,,PEAS FROZEN,5KG,1,KG,20.00\n';

async function openMap(page, theme) {
  await page.goto('/index.html');
  await page.waitForFunction(() => typeof window.renderCatMap === 'function');
  await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
  await page.evaluate((csv) => {
    const tbl = parseCsvTable(csv);
    catState.headers = tbl.headers; catState.rows = tbl.rows; catState.fileName = 'p.csv';
    catState.preset = catPresetFor(tbl.headers);
    catState.map = catState.preset ? catState.preset.map : catGuessMap(tbl.headers);
    const ov = document.getElementById('catModal');
    ov.classList.add('open'); ov.setAttribute('aria-hidden', 'false'); ov.style.display = 'flex';
    renderCatMap(); catStep('map');
  }, CSV);
}

for (const theme of ['dark', 'light']) {
  for (const [w, h, name] of [[380, 820, 'phone'], [1360, 900, 'desktop']]) {
    test(`GST control ${theme} ${name}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await openMap(page, theme);

      const inc = page.locator('input[name="catGst"][value="inc"]');
      const ex = page.locator('input[name="catGst"][value="ex"]');
      await expect(ex).toBeVisible();
      await expect(inc).toBeVisible();
      await expect(ex).toBeChecked();          // gstDefault is 'ex' with no settings loaded

      // The control must not push the modal into a horizontal scroll.
      const over = await page.evaluate(() => {
        const b = document.querySelector('#catModal .mbody') || document.querySelector('#catModal');
        return { scrollW: b.scrollWidth, clientW: b.clientWidth,
                 docScrollW: document.documentElement.scrollWidth,
                 docClientW: document.documentElement.clientWidth };
      });
      expect(over.scrollW, `modal body overflows at ${w}px`).toBeLessThanOrEqual(over.clientW + 1);
      expect(over.docScrollW, `page overflows at ${w}px`).toBeLessThanOrEqual(over.docClientW + 1);

      // The radio and its label are a real touch target on a phone.
      const box = await inc.evaluate((el) => {
        const r = el.closest('label').getBoundingClientRect();
        return { h: r.height, w: r.width };
      });
      expect(box.h, 'label height').toBeGreaterThanOrEqual(36);

      // Live: choosing inclusive moves the previewed figure AND the note.
      const before = await page.locator('.cat-pv-c').first().innerText();
      await inc.check();
      const after = await page.locator('.cat-pv-c').first().innerText();
      expect(before).toBe('$6.50/kg');
      expect(after).toBe('$5.91/kg');
      await expect(page.locator('.cat-pv-note')).toContainText('Converted to ex-GST');

    });
  }
}
