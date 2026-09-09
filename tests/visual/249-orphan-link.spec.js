/*
 * 249-orphan-link.spec.js — QUEUE item 88, in a real browser at both widths.
 *
 * The item builds a SCREEN, and the thing it must get right is a sentence: the heal one row above
 * promises "nothing costs a different amount afterwards", and this picker cannot make that promise
 * because no ingredient owns the product — so every candidate re-costs every line. A unit test can
 * prove the arithmetic; only this can prove the arithmetic reaches the reader.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

/* Two plates costing off P0108, and one ingredient owning a DIFFERENT product — the production
   shape: the ingredient was repointed away and the lines stayed behind. */
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Bacon Bene', category: 'Mains', lines: [{ pid: 'P0108', qty: 100 }] },
    { id: 'PL2', name: "Scoopy's Breakfast", category: 'Mains', lines: [{ pid: 'P0108', qty: 50 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
};

async function boot(page, width) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width, height: width < 500 ? 780 : 900 });
  await installBoot(page, { role: 'owner' });
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    // an ingredient pointing at a DIFFERENT product, so nothing owns P0108
    window.kitchenIngredients.push({ id: 'K1', name: 'Streaky bacon', pid: 'P0109' });
    window.rebuildKById();
    const b = document.querySelector('.install-banner, #installBanner'); if (b) b.remove();
  });
  return errs;
}

for (const [name, width] of [['mobile', 380], ['desktop', 1280]]) {
  test(`the ask is offered, states the cost movement, and applies @ ${name}`, async ({ page }) => {
    const errs = await boot(page, width);

    await gotoTab(page, 'settings');
    await page.waitForTimeout(300);

    /* 1. The row is offered, and the heal row above it is NOT — two rows about the same lines, one
       of which can only list them, is what 249 removed. */
    await expect(page.locator('#setOrphanRow')).toBeVisible();
    await expect(page.locator('#setHealRow')).toBeHidden();

    await page.locator('#setLinkOrphans').click();
    await page.waitForTimeout(400);
    await expect(page.locator('#orphanLinkModal')).toBeVisible();

    /* 2. It names the product, the lines, and both plates — the reader has to know what they are
       answering about before they can answer. */
    const msg = await page.locator('#orphanLinkMsg').textContent();
    expect(msg).toContain('2 lines in 2 plates');
    expect(msg).toContain('Bacon Bene');
    expect(msg).toContain("Scoopy's Breakfast");

    /* 3. THE SENTENCE THIS SCREEN EXISTS TO GET RIGHT. It must not borrow the heal's promise. */
    expect(msg).toContain('re-costs every line');
    expect(msg).not.toContain('Nothing costs a different amount');

    /* 4. The candidate states what those plates would cost, as money, before anything is committed. */
    const row = page.locator('#orphanLinkList .ad-item').first();
    await expect(row).toBeVisible();
    const meta = await row.locator('.ad-meta').textContent();
    expect(meta).toMatch(/\$\d+\.\d\d\s*→\s*\$\d+\.\d\d/);

    /* 5. Choosing applies to EVERY line pointing at that product — one choice per product, which is
       the item's requirement — and both plates end up on the ingredient. */
    await row.click();
    await page.waitForTimeout(900);
    /* `savedPlates` is a top-level `let`, so it is NOT on `window` — the trap tests/smoke.js records.
       `barePidLinesFor` is a function, is on `window`, and reads the real array from module scope,
       so it answers the question this test is actually asking: are any bare lines left on it. */
    const left = await page.evaluate(() => window.barePidLinesFor('P0108'));
    expect(left).toEqual({ lines: 0, plates: 0 });

    /* 6. And the ask stops being offered, because there is nothing left to ask. */
    await expect(page.locator('#orphanLinkModal')).toBeHidden();
    await gotoTab(page, 'settings');
    await page.waitForTimeout(300);
    await expect(page.locator('#setOrphanRow')).toBeHidden();

    expect(errs).toEqual([]);
  });
}

test('"Leave these alone" writes nothing and keeps the row', async ({ page }) => {
  /* Refusing is a legitimate answer and must stay one — item 88 says so, because a plate line may
     genuinely be meant to cost off a product no ingredient owns. */
  const errs = await boot(page, 1280);
  await gotoTab(page, 'settings');
  await page.locator('#setLinkOrphans').click();
  await page.waitForTimeout(400);

  await page.locator('#orphanLinkSkip').click();
  await page.waitForTimeout(400);

  const left = await page.evaluate(() => window.barePidLinesFor('P0108'));
  expect(left).toEqual({ lines: 2, plates: 2 }, 'nothing was written');
  await expect(page.locator('#orphanLinkModal')).toBeHidden();
  await gotoTab(page, 'settings');
  await page.waitForTimeout(300);
  await expect(page.locator('#setOrphanRow')).toBeVisible('the lines are still findable');
  expect(errs).toEqual([]);
});
