/*
 * v166-catalogue-import.spec.js — batch 193. The catalogue CSV importer, driven end to end.
 *
 * WHY A BROWSER AND NOT ONLY tests/catalogue-import.test.js. That file pins every DECISION the
 * importer makes and can say nothing about whether the decision reaches a screen. Three of this
 * batch's failure modes are cascade or wiring failures that a green unit suite cannot see:
 *   - the modal's three panels are switched by `hidden`, and an author `display` rule beats the UA's
 *     [hidden] on ORIGIN before specificity is compared (CLAUDE.md, ten selector guards deep);
 *   - the mapping grid changes to one column at 380 through a @media block, and a multi-class
 *     selector written outside one beats a single-class rule written inside it;
 *   - the whole flow only exists if the file input, the preset, the preview and the write are
 *     actually connected to each other.
 *
 * THE STATE IS GENUINE ZERO, because that is the state this feature exists for: `noProducts:true`
 * plus clean storage is a café that has just signed up and has nothing. Production has never been
 * in it, and no other route out of it works — an invoice import against an empty catalogue
 * pre-ticks nothing, which is the measurement that produced this item.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const THEMES = ['light', 'dark'];
const WIDTHS = [380, 1280];

/* The supplier export's own header row, in the order read from the live portal on 14 Aug 2026, with
   invented products underneath it. ⚠️ NOT ONE ROW OF A REAL EXPORT IS IN THIS FILE and none may
   ever be: the repository is public, and a real one names a real café's supplier and its real
   prices. The COLUMN NAMES are the measured part; the values are made up. */
const CSV = [
  'PRODUCT CODE,BRAND,DESCRIPTION,PACK SIZE,CTN QTY,UOM,QTY,LAST PRICE PAID,TOTAL EX GST,GST,TOTAL INCL GST,ACCOUNT',
  '55001,Fictional Foods,"CHIPS, STRAIGHT CUT 10MM",10KG,1,KG,2,65.00,130.00,13.00,143.00,ACCT1',
  '55002,Fictional Foods,CHEESE BLOCK TASTY,2KG,6,KG,1,19.60,19.60,1.96,21.56,ACCT1',
  '55003,,MILK FULL CREAM,2,6,L,4,3.20,12.80,1.28,14.08,ACCT1',
  '55004,Fictional Foods,BURGER BUN SEEDED,48,1,EA,1,24.00,24.00,2.40,26.40,ACCT1',
  '55005,,MYSTERY ITEM NO PRICE,5KG,1,KG,1,,,,,ACCT1',
  '',
].join('\n');

async function bootZero(page, theme, width) {
  await page.setViewportSize({ width, height: 820 });
  await installBoot(page, { noProducts: true });
  await page.addInitScript((t) => { localStorage.setItem('cafeCost_theme', t); }, theme);
  await page.goto('/');
  await page.waitForTimeout(1200);
}

async function loadCsv(page, body) {
  await page.locator('#catFile').setInputFiles({
    name: 'purchases.csv', mimeType: 'text/csv', buffer: Buffer.from(body || CSV, 'utf8'),
  });
  await page.waitForTimeout(400);
}

/* The supplier combo refuses an unconfirmed new name on purpose — `resolveCombo` is shared with the
   New Product form. On a brand-new café the supplier list is EMPTY, so every name is new and the
   "Create new" two-step is the only path that exists. Driving it here is what proves the importer is
   reachable by a café with nothing in it, rather than only by one that already has suppliers.
   ⚠️ THE SECOND IMPORT TAKES THE OTHER BRANCH, and the first draft of this helper assumed it did
   not — it looked only for `.cat-create` and timed out on the re-import test. That was the app being
   right: once the first import has run, the supplier EXISTS, so the dropdown offers it as an
   existing option instead. Which is the point of choosing it from a list rather than retyping it —
   the dedup key is (supplier, code), and "Fictional Supplier Co" drifting to "FICTIONAL SUPPLIER CO"
   on the second file would silently duplicate the whole catalogue. So the helper takes whichever
   branch the app is really in, and the fact that there are two is the mechanism, not a nuisance. */
async function pickSupplier(page, name) {
  await page.locator('#cat_sup').click();
  await page.locator('#cat_sup').fill(name);
  await page.waitForTimeout(250);
  const existing = page.locator(`#cat_supDrop .cat-opt[data-v="${name}"]`);
  if (await existing.count()) await existing.first().click();
  else await page.locator('#cat_supDrop .cat-create').click();
  await page.waitForTimeout(300);
}

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test(`193: a café with NO products imports a catalogue end to end — ${theme}, ${width}px`, async ({ page }) => {
      await bootZero(page, theme, width);
      await gotoTab(page, 'ingredients');

      // 1. The empty state offers the route that works from nothing, as its PRIMARY.
      const primary = page.locator('#ingList .empty-state .btn.primary');
      await expect(primary).toHaveText('Import catalogue');
      await primary.click();
      await page.waitForTimeout(300);
      await expect(page.locator('#catModal')).toHaveClass(/open/);

      // 2. Exactly ONE step is on screen. This is the [hidden]-vs-author-rule question, and it can
      //    only be answered by measuring: all three panels visible at once is what a stray
      //    `display:block` on .inv-step would produce, and the file would still read correctly.
      await expect(page.locator('#catStepChoose')).toBeVisible();
      await expect(page.locator('#catStepMap')).toBeHidden();
      await expect(page.locator('#catStepDone')).toBeHidden();

      // 3. The file is read, the preset is recognised, and the mapping arrives filled in.
      await loadCsv(page);
      await expect(page.locator('#catStepChoose')).toBeHidden();
      await expect(page.locator('#catStepMap')).toBeVisible();
      await expect(page.locator('.cat-lead.ok')).toContainText('Recognised this as a');
      await expect(page.locator('.cat-mapsel[data-field="name"]')).toHaveValue('DESCRIPTION');
      await expect(page.locator('.cat-mapsel[data-field="price"]')).toHaveValue('LAST PRICE PAID');
      await expect(page.locator('.cat-mapsel[data-field="code"]')).toHaveValue('PRODUCT CODE');

      // 4. The preview is the gate, so it must be showing the real computed unit cost — not a
      //    promise that one will be computed. $65.00 for 10KG is $6.50/kg.
      const firstCost = page.locator('.cat-pv tbody tr').first().locator('.cat-pv-c');
      await expect(firstCost).toHaveText('$6.50/kg');
      await expect(page.locator('.cat-count')).toContainText('4 new products');
      // The row with no price is refused, and says so rather than arriving at $0.00.
      await expect(page.locator('.cat-skips summary')).toContainText('1 line will be skipped');

      // 5. The Import button is disabled until there is something to import, and names the count.
      await expect(page.locator('#catGo')).toHaveText('Import 4 products');
      await expect(page.locator('#catGo')).toBeEnabled();

      // 6. Without a supplier the write is refused — the dedup key is (supplier, code), so an
      //    import with no supplier is one that can never be updated by a later file.
      await page.locator('#catGo').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#catErr')).toBeVisible();
      await expect(page.locator('#catStepDone')).toBeHidden();

      await pickSupplier(page, 'Fictional Supplier Co');
      await page.locator('#catGo').click();
      await page.waitForTimeout(700);

      // 7. It landed, and the screen says what happened in products rather than in lines.
      await expect(page.locator('#catStepDone')).toBeVisible();
      await expect(page.locator('.cat-done-lead')).toContainText('4 products added');
      await expect(page.locator('#catGo')).toBeHidden();

      // 8. And the catalogue is real: closing the modal reveals a Products screen that is no longer
      //    empty. This is the assertion the whole item is about.
      await page.locator('#catCancel').click();
      await page.waitForTimeout(400);
      await expect(page.locator('#ingList .empty-state')).toHaveCount(0);
      await expect(page.locator('#ingHeadSub')).toContainText('4 products');
    });
  }
}

/* The layout question, asked at the two widths where it differs. A mapping row is a label above a
   <select>; two of those side by side at 380 is the "looks right in the file, does nothing on
   screen" failure, so the columns are MEASURED rather than inferred from the rule. */
for (const width of WIDTHS) {
  test(`193: the mapping grid is ${width < 768 ? 'ONE column' : 'TWO columns'} at ${width}px`, async ({ page }) => {
    await bootZero(page, 'light', width);
    await gotoTab(page, 'ingredients');
    await page.locator('#ingList .empty-state .btn.primary').click();
    await page.waitForTimeout(300);
    await loadCsv(page);

    const cols = await page.locator('.cat-maprows').evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
    );
    expect(cols).toBe(width < 768 ? 1 : 2);

    // Nothing may overflow the page sideways at either width — the standing shell rule.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

/* THE ONE THAT MATTERS MOST AFTER THE FIRST IMPORT: re-importing must UPDATE, never duplicate. It
   is the requirement the `supplier_code` column was added for, and the only way to see it is to run
   two imports in one browser and count what is left. */
test('193: importing the SAME file again updates the products and does not duplicate them', async ({ page }) => {
  await bootZero(page, 'light', 1280);
  await gotoTab(page, 'ingredients');
  await page.locator('#ingList .empty-state .btn.primary').click();
  await page.waitForTimeout(300);
  await loadCsv(page);
  await pickSupplier(page, 'Fictional Supplier Co');
  await page.locator('#catGo').click();
  await page.waitForTimeout(700);
  await page.locator('#catCancel').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#ingHeadSub')).toContainText('4 products');

  // The same file, with the chips re-priced. A second copy of every product is what the absence of
  // a stable identity would produce, and it would look exactly like a successful import.
  const dearer = CSV.replace('10KG,1,KG,2,65.00', '10KG,1,KG,2,72.00');
  await page.locator('#catImportBtn').waitFor({ state: 'attached' });
  await page.evaluate(() => { document.getElementById('catImportBtn').click(); });
  await page.waitForTimeout(300);
  await loadCsv(page, dearer);
  await pickSupplier(page, 'Fictional Supplier Co');

  await expect(page.locator('.cat-count')).toContainText('0 new products');
  await expect(page.locator('.cat-count')).toContainText('4 to update');
  await page.locator('#catGo').click();
  await page.waitForTimeout(700);

  await page.locator('#catCancel').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#ingHeadSub')).toContainText('4 products');

  // …and the new price is the one showing, so "update" meant it rather than merely saying it.
  await expect(page.locator('#ingList')).toContainText('$7.20');
});

/* ⚠️ THE DEFECT THIS SPEC WAS EXTENDED FOR, found by reasoning about the combo rather than by any
   test going red — which is why it gets a driven one. `makeInlineCombo` sets the input's value
   PROGRAMMATICALLY when an option is clicked, and a programmatic assignment fires neither `input`
   nor `change`. Typing a PREFIX and then picking the existing supplier off the list therefore left
   the plan computed against the prefix, which matches no product: the screen said "new" for
   everything and the import would have created a second copy of the whole catalogue. That is the
   exact duplication `supplier_code` exists to prevent, reached through the control that exists to
   prevent it.

   ⚠️ THIS COMMENT ONCE DESCRIBED A TWO-PART FIX AND CLAIMED EITHER PART ALONE WOULD LET THIS TEST
   PASS. Both halves of that were checked rather than believed, and both were wrong — which is why
   the note survives the code it described. Removing the mousedown listener turns this test RED, and
   the second half (a re-plan at apply time) turned out to be a line no test could make fail, so it
   was deleted rather than allowed. The fix is the listener, and this is what pins it: the preview
   counts AND the product count left behind afterwards, so a stale plan is caught whether it shows
   on screen or only in the data. */
test('193: picking the supplier off the list re-decides new-vs-update, even when only a PREFIX was typed', async ({ page }) => {
  await bootZero(page, 'light', 1280);
  await gotoTab(page, 'ingredients');
  await page.locator('#ingList .empty-state .btn.primary').click();
  await page.waitForTimeout(300);
  await loadCsv(page);
  await pickSupplier(page, 'Fictional Supplier Co');
  await page.locator('#catGo').click();
  await page.waitForTimeout(700);
  await page.locator('#catCancel').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#ingHeadSub')).toContainText('4 products');

  // Second import. This time type only "Fict" and take the existing supplier from the dropdown —
  // the value arrives without an input event.
  await page.evaluate(() => { document.getElementById('catImportBtn').click(); });
  await page.waitForTimeout(300);
  await loadCsv(page);
  await page.locator('#cat_sup').click();
  await page.locator('#cat_sup').fill('Fict');
  await page.waitForTimeout(250);
  await page.locator('#cat_supDrop .cat-opt[data-v="Fictional Supplier Co"]').first().click();
  await page.waitForTimeout(400);

  // The preview must have re-decided. "4 new products" here is the defect.
  await expect(page.locator('.cat-count')).toContainText('0 new products');
  await expect(page.locator('.cat-count')).toContainText('4 to update');

  await page.locator('#catGo').click();
  await page.waitForTimeout(700);
  await expect(page.locator('.cat-done-lead')).toContainText('4 updated');
  await page.locator('#catCancel').click();
  await page.waitForTimeout(400);
  // Eight products is a catalogue duplicated in one tap, and it is what the stale plan produced.
  await expect(page.locator('#ingHeadSub'), 'eight products is the failure this exists to catch').toContainText('4 products');
  await expect(page.locator('#ingHeadSub'), 'and still ONE supplier, not two spellings of one').toContainText('1 supplier');
});

/* CSV ONLY, AND IT SAYS SO. Max declined a third third-party script (14 Aug 2026), so a workbook
   cannot be read here — and "nothing happened" is the worst possible first minute of a new café's
   life. The refusal has to name the file and say what to do instead. */
test('193: a spreadsheet is refused BY NAME, with the fix in the message', async ({ page }) => {
  await bootZero(page, 'light', 1280);
  await gotoTab(page, 'ingredients');
  await page.locator('#ingList .empty-state .btn.primary').click();
  await page.waitForTimeout(300);

  await page.locator('#catFile').setInputFiles({
    name: 'purchases.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('PK not really a workbook', 'utf8'),
  });
  await page.waitForTimeout(400);

  const err = page.locator('#catErr');
  await expect(err).toBeVisible();
  await expect(err).toContainText('purchases.xlsx');
  await expect(err).toContainText('CSV');
  // It must stay on step 1, beside the control that can recover it.
  await expect(page.locator('#catStepChoose')).toBeVisible();
  await expect(page.locator('#catStepMap')).toBeHidden();
});
