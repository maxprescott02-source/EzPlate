/*
 * 246-menus-read.spec.js — QUEUE item 20, in a real browser.
 *
 * THE DEFECT, driven end to end before it was fixed and kept here as the regression. `menus` was the
 * one read in `bootstrapSync`'s batch of thirteen that was `soft`-wrapped while the app depended on
 * it, so a single failed request fell through to a seeder that unshifted an in-memory menu with a
 * fresh `uid('MENU')` — a menu the server has never seen. Measured, deterministically:
 *
 *     boot gate visible: false
 *     menusList        : [{"id":"MENUmttz2qz2-1-uyhz2oci","name":"Original menu","season":null}]
 *     currentMenuId    : MENUmttz2qz2-1-uyhz2oci
 *     MENU (via rebuild): [{"id":"MI1","menuId":"MENU_WINTER"}]      <- the dish is fine
 *     menu screen      : "Nothing on this menu yet. Publish a plate from the Plates tab to see it here."
 *
 * The café's data was all there. The app reported a clean boot, repointed `currentMenuId` at a menu
 * nobody had ever written, and then INVITED the user to publish again — which is the second half of
 * the chain, because `withPublishMenu` reads `menusList.length` and would have let that dish through
 * against an id no `menus` row answers to.
 *
 * ⚠️ WHY THIS IS A BROWSER TEST AND NOT A UNIT ONE. The read list is inside `bootstrapSync`, a
 * 400-line async function that cannot be brace-extracted and driven. The only harness that can ask
 * "what does the app DO when this one request fails" is one that runs the real boot, so the failure
 * is injected at the Supabase client — the same place a network fault would land — rather than
 * simulated inside a stub of the thing under test.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_currentMenuId', 'MENU_WINTER');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 6, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' },
  ]));
};

/* ONE request out of the thirteen fails. Injected by wrapping `createClient` after `installBoot`'s
   init script has defined it, so everything else in the boot batch answers normally — which is the
   whole premise: this is a flaky request, not a broken database. */
const BREAK_MENUS = () => {
  const orig = window.supabase.createClient;
  window.supabase.createClient = function (...a) {
    const c = orig.apply(this, a);
    const from = c.from.bind(c);
    c.from = (t) => (t === 'menus'
      ? { select: () => Promise.resolve({ data: null, error: { message: 'network error' } }) }
      : from(t));
    return c;
  };
};

async function boot(page, { breakMenus }) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page, { role: 'owner' });
  await page.addInitScript(SEED);
  if (breakMenus) await page.addInitScript(BREAK_MENUS);
  await page.goto('/');
  await page.waitForTimeout(1500);
  return errs;
}

test('a failed menus read is a failed boot, not a menu the server never had', async ({ page }) => {
  const errs = await boot(page, { breakMenus: true });

  /* 1. The boot says so, rather than reporting success. This is the assertion the old behaviour
     could not pass: it hid the failure behind a working-looking app. */
  await expect(page.locator('#bootGate')).toBeVisible();

  /* 2. And nothing was invented. An empty list here is honest — the read failed, so the app knows
     of no menus — where the defect was a list of exactly one menu that did not exist. */
  expect(await page.evaluate(() => window.menusList)).toEqual([]);

  /* 3. `currentMenuId` is not repointed at a fabricated id. Asserted as an equality against the
     seeded value rather than as "not a MENU… string" — CLAUDE.md roster 190. */
  expect(await page.evaluate(() => window.currentMenuId)).toBe('MENU_WINTER');

  expect(errs).toEqual([]);
});

test('the ordinary boot is untouched — the read succeeding still loads the menu', async ({ page }) => {
  /* The counterweight, and it is not ceremony: making a read fatal is exactly the change that can
     turn a working boot into a gated one, and the four reads that were already fatal are proof that
     the gate fires easily. A test that only proves the failure path would not notice. */
  const errs = await boot(page, { breakMenus: false });

  await expect(page.locator('#bootGate')).toBeHidden();
  expect(await page.evaluate(() => window.menusList.map((m) => m.id))).toEqual(['MENU_WINTER']);
  expect(await page.evaluate(() => window.currentMenuId)).toBe('MENU_WINTER');

  await gotoTab(page, 'analysis');
  await page.waitForTimeout(400);
  await expect(page.locator('#menuHeadSub')).toHaveText('Winter Menu');
  expect(await page.locator('#aBody button').count()).toBeGreaterThan(0);   // the dish is on screen

  expect(errs).toEqual([]);
});
