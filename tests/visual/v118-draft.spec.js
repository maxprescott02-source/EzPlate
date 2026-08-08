/*
 * v118-draft.spec.js — looking at a plate must not plant a draft.
 *
 * WHY THIS EXISTS ALONGSIDE tests/plate-draft.test.js. The unit test pins the DECISION
 * (savePlateDraft asks isBuilderDirty before writing). This pins the SEQUENCE that made the
 * decision wrong in the first place, and only a real browser has it:
 *
 *   loadPlate() renders BEFORE openBuilder() arms draft saves, so the FIRST builder open of a
 *   session never wrote anything and the bug looked absent. _draftArmed then stays true for the
 *   rest of the session, so the SECOND look-only visit scheduled a save and planted a draft of a
 *   plate nobody had touched — "a look-only visit arms the prompt for the next one".
 *
 * A one-visit version of this test PASSES against the broken code. Verified both ways before it
 * was committed: reverted to the pre-fix condition, this file fails at both widths with a stored
 * draft and wouldPrompt=true; with the fix it is null and false.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const PLATES = [
  { id: 'SP7', name: 'Big Breakfast', lines: [{ kid: 'K0001', qty: 100 }], category: 'Mains' },
  { id: 'SP8', name: 'Ham Toastie',   lines: [{ kid: 'K0002', qty: 60  }], category: 'Mains' },
];
const KEY = 'cafeDB_plateDraft';

for (const [label, w, h] of [['mobile', 380, 780], ['desktop', 1280, 800]]) {
  test(`two look-only visits leave no draft @ ${label}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await installBoot(page);
    await page.addInitScript((p) => localStorage.setItem('cafeDB_plates', JSON.stringify(p)), PLATES);
    await page.goto('/');
    await expect(page.locator('#bootGate')).toBeHidden();

    // FIRST visit arms draft saves (openBuilder runs after loadPlateState's render, so this one
    // was always safe). The SECOND is the one that used to plant a draft of an untouched plate.
    await page.evaluate(() => window.editPlateFromCard('SP7'));
    await expect(page.locator('#builderModal')).toBeVisible();
    await page.evaluate(() => closeBuilder());
    await page.evaluate(() => window.editPlateFromCard('SP8'));
    await expect(page.locator('#builderModal')).toBeVisible();
    await page.waitForTimeout(700);                       // well past the 250ms debounce

    const draft = await page.evaluate((k) => localStorage.getItem(k), KEY);
    await page.evaluate(() => closeBuilder());
    const wouldPrompt = await page.evaluate(() => window.unfinishedPlateWaiting());
    console.log(`RESULT_${label} lookDraft=${draft} wouldPrompt=${wouldPrompt}`);
    expect(draft, 'a second look-only visit must leave no draft').toBeNull();
    expect(wouldPrompt, 'and must not arm the Unfinished plate prompt').toBe(false);

    // a REAL edit must still be protected
    await page.evaluate(() => window.editPlateFromCard('SP8'));
    await page.evaluate(() => { document.getElementById('plateName').value = 'Ham Toastie XL'; renderPlate(); });
    await page.waitForTimeout(700);
    const afterEdit = await page.evaluate((k) => localStorage.getItem(k), KEY);
    console.log(`RESULT_${label} editDraft=${afterEdit ? 'written' : 'MISSING'}`);
    expect(afterEdit, 'a real edit must still be protected').not.toBeNull();
  });
}
