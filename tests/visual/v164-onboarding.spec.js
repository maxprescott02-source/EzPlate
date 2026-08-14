/*
 * v164-onboarding.spec.js — batch 190. The first two things a brand-new cafe meets.
 *
 * WHY THESE ARE HERE AND NOT IN A UNIT TEST. Both are cascade questions, and this repo's standing
 * rule is that a rule which "looks right in the file" is never proof — a @media block does not win
 * by being later, an author rule beats [hidden] on ORIGIN before specificity is compared, and a CSS
 * syntax error silently discards every rule after it with a green suite and a clean `node -c`.
 * tests/onboarding-zero.test.js asserts the rule EXISTS and is token-based; only a browser can say
 * what the pixel actually is. The diagnostic order that cost batch 176 a cycle — check the rule
 * exists before reasoning about why it loses — is why there are two tests and not one.
 *
 * THE STATE. Genuine zero: no products, no kitchen ingredients, no plates, no menus, no dishes, no
 * app_settings. `noProducts:true` plus clean storage is that state; production has never been in it.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const THEMES = ['light', 'dark'];

/* The UA's default link colour. Chromium renders an unvisited href as exactly this, and it is what
   #bhGo painted in BOTH themes before the base rule existed — legible-but-wrong on the cream
   surface, near-invisible violet on the dark one. Asserted against by VALUE rather than by "is it
   the accent", so the test still means something if the accent token is ever retuned. */
const UA_BLUE = 'rgb(0, 0, 238)';

/* ⚠️ `not.toBe(UA_BLUE)` IS NOT ENOUGH ON ITS OWN, and the mutation run proved it rather than the
   reasoning: with the base rule deleted, three of these four went red and the DARK "other home" one
   stayed green, because Chromium picks a lighter default link colour under a dark color-scheme and
   the constant above only names the light one. A denylist of UA defaults is a guess about the
   browser; what the pixel SHOULD be is a fact about this app. So every case below compares against
   the resolved --accent-ink, and the UA_BLUE assertion is kept only because it names the defect in
   the failure message. */
async function accentColour(page) {
  return page.evaluate(() => {
    const d = document.createElement('span');
    d.style.color = 'var(--accent-ink)';
    document.body.appendChild(d);
    const out = getComputedStyle(d).color;
    d.remove();
    return out;
  });
}

async function bootZero(page, theme, width) {
  await page.setViewportSize({ width, height: 780 });
  await installBoot(page, { noProducts: true });
  await page.addInitScript((t) => { localStorage.setItem('cafeCost_theme', t); }, theme);
  await page.goto('/');
  await page.waitForTimeout(1200);
}

for (const theme of THEMES) {
  /* HOME 1 of 2 — the empty plate. renderPlate puts the hint INSIDE #lines' .bld-empty when the
     plate has no lines. The two homes are never both filled at once, and 170's comment says the
     link's missing colour rule "belongs to the Onboarding item" — this is that item. */
  test(`190: the first-ingredient link is the app's colour, not the browser's — empty plate, ${theme}`, async ({ page }) => {
    await bootZero(page, theme, 380);
    await gotoTab(page, 'builder');
    await page.locator('#newPlateBtn').click();
    await page.waitForTimeout(400);

    const link = page.locator('#lines .bld-empty a#bhGo');
    await expect(link).toBeVisible();

    const colour = await link.evaluate((el) => getComputedStyle(el).color);
    expect(colour, 'the UA blue is the defect this batch fixed').not.toBe(UA_BLUE);
    // It must be the app's own link colour, in this theme. See accentColour's note for why the
    // negative assertion above cannot carry this on its own.
    expect(colour).toBe(await accentColour(page));
  });

  /* HOME 2 of 2 — a plate that HAS lines while there are no KITCHEN INGREDIENTS. This is the case
     v102's CodeRabbit fix was about (legacy {pid} lines with an empty kitchenIngredients array), it
     renders in #builderHint instead, and styling one home and not the other is the failure mode the
     queue item warns about by name.

     ⚠️ IT BOOTS WITH PRODUCTS ON PURPOSE, and the first draft of this test did not — which made it
     a test of nothing. `loadPlateState` keeps a legacy {pid} line only `else if(byId[l.pid])`, so
     with an empty catalogue the line is DROPPED, the plate loads empty, and the hint's other home
     renders instead. The two homes are chosen by `noCatalogue && plate.length`, and `noCatalogue`
     asks about kitchen ingredients, not products — which is precisely the distinction the naming
     inversion makes easy to get backwards. */
  test(`190: …and in its OTHER home, the hint under a plate with lines, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 780 });
    await installBoot(page);                                  // products present; app_settings empty, so no kitchen ingredients
    await page.addInitScript((t) => {
      localStorage.setItem('cafeCost_theme', t);
      localStorage.setItem('cafeDB_plates', JSON.stringify([
        { id: 'P-legacy', name: 'Legacy plate', lines: [{ uid: 1, pid: 'P0001', qty: 2 }], category: null },
      ]));
    }, theme);
    await page.goto('/');
    await page.waitForTimeout(1200);
    await gotoTab(page, 'builder');
    await page.locator('[data-pid="P-legacy"]').click();
    await page.waitForTimeout(400);

    // The precondition this test rests on, asserted rather than assumed: 176 is the incident where a
    // truncation test went vacuous once the fix removed the pressure its own precondition assumed.
    await expect(page.locator('#lines .bld-row, #lines .bld-line').first())
      .toBeVisible({ timeout: 3000 });

    const hint = page.locator('#builderHint');
    await expect(hint).toBeVisible();
    const link = hint.locator('a#bhGo');
    await expect(link).toBeVisible();
    const colour = await link.evaluate((el) => getComputedStyle(el).color);
    expect(colour, 'the second home must be styled too, or the fix works on one screen only').not.toBe(UA_BLUE);
    expect(colour).toBe(await accentColour(page));
  });
}

/* ---------------------------------------------------------------------------
   The zero-menus branch of Manage menus, driven rather than reasoned about.

   Reaching it needs a SAVED PLATE and NO MENUS — the state a new cafe is in for exactly as long as
   it takes to save its first plate, because the menu is not created until something is published.
   --------------------------------------------------------------------------- */
test('190: with a plate saved and no menus, Add to a menu offers a way forward', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cafeDB_plates', JSON.stringify([
      { id: 'P-first', name: 'First plate', lines: [], category: null },
    ]));
    localStorage.setItem('cafeDB_menus', JSON.stringify([]));   // the point of the test
  });
  await bootZero(page, 'light', 1280);
  await gotoTab(page, 'builder');
  await page.waitForTimeout(300);

  await page.evaluate(() => window.openManageMenus('P-first'));
  await page.waitForTimeout(300);

  const modal = page.locator('#manageMenusModal');
  await expect(modal).toBeVisible();

  // The defect was a sentence and a `return` — no control at all.
  const btn = modal.locator('.mm-first');
  await expect(btn).toBeVisible();
  await expect(btn).toBeEnabled();
  await expect(modal.locator('.mm-empty')).not.toContainText('create one on the Menu tab first');

  // The failure line must be present-but-hidden before anything has failed. An author `display`
  // rule beats the UA's [hidden] on ORIGIN, which is the ten-rule `:not([hidden])` idiom in this
  // sheet — so this assertion is about the guard, not about the attribute.
  await expect(modal.locator('.mm-empty-err')).toBeHidden();
});
