/*
 * 239-bare-pid-heal.spec.js — queue item 16, driven in a browser.
 *
 * The unit file (tests/bare-pid-heal.test.js) pins the plan, the copy and the write. What only a
 * browser can answer is whether the thing is REACHABLE: the row ships `hidden`, so every part of
 * this feature is one missing call away from being present in the markup and invisible on screen —
 * which is the failure this repo has recorded more than once, and which a source grep cannot see.
 *
 * Both widths, because `.stg-row` is a flex row at ≥768 and a stacked column below it, and the
 * `hidden` guard is written twice in the CSS (once per breakpoint) for the specificity reason
 * CLAUDE.md records: a single-class `display` rule beats the UA's [hidden] rule, so an element told
 * to hide stays visible unless the selector says `:not([hidden])`. That is exactly a rule you
 * cannot check by reading.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* One ingredient owning P0001, and three plates: a kid line (already fine), a bare line that the
   heal CAN move, and a bare line pointing at a product no ingredient owns, which it must refuse.
   The product ids are real fixture ids from tests/fixtures/base-products.json — a bare pid naming
   nothing at all would be reported for the wrong reason. */
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
  localStorage.setItem('cafeDB_king', JSON.stringify([{ id: 'K1', name: 'Chips', pid: 'P0001' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'By ingredient', category: 'Mains', lines: [{ kid: 'K1', qty: 100 }] },
    { id: 'PL2', name: 'By product', category: 'Mains', lines: [{ pid: 'P0001', qty: 100 }] },
    { id: 'PL3', name: 'Orphaned', category: 'Mains', lines: [{ pid: 'P0002', qty: 50 }] },
  ]));
};

const NOTHING_TO_FIX = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
  localStorage.setItem('cafeDB_king', JSON.stringify([{ id: 'K1', name: 'Chips', pid: 'P0001' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'By ingredient', category: 'Mains', lines: [{ kid: 'K1', qty: 100 }] },
  ]));
};

async function openSettings(page, w, seed) {
  await page.setViewportSize({ width: w, height: 900 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(seed);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.showTab('settings'));
  await page.waitForTimeout(200);
}

for (const w of [380, 1280]) {
  test(`${w}: the row is on screen — not merely in the markup — while there is work`, async ({ page }) => {
    await openSettings(page, w, SEED);
    const row = page.locator('#setHealRow');
    await expect(row).toBeVisible();
    const box = await row.boundingBox();
    expect(box.width).toBeGreaterThan(100);            // a zero-size "visible" row is not visible
    await expect(page.locator('#setHealLines')).toHaveText('Fix');
  });

  test(`${w}: with nothing to fix the row is not there at all`, async ({ page }) => {
    await openSettings(page, w, NOTHING_TO_FIX);
    await expect(page.locator('#setHealRow')).toBeHidden();
  });
}

test('the confirm states the size of the fix AND names what it will not touch', async ({ page }) => {
  await openSettings(page, 1280, SEED);
  await page.click('#setHealLines');
  await expect(page.locator('#confirmModal')).toBeVisible();
  const msg = await page.locator('#confirmMsg').innerText();
  expect(msg).toMatch(/^1 line in 1 plate /);
  expect(msg).toMatch(/Nothing costs a different amount afterwards\./);
  expect(msg).toMatch(/1 line will be left alone/);
  expect(msg).toMatch(/no ingredient uses it: Orphaned/);
  await expect(page.locator('#confirmOk')).toHaveText('Fix 1 line');
  /* The message is multi-line and the modal has to SHOW the lines: .confirm-msg carries
     white-space:pre-line, and without it the whole left-alone list collapses into one paragraph
     with the bullets run together. Measured rather than asserted from the CSS file. */
  const ws = await page.locator('#confirmMsg').evaluate((el) => getComputedStyle(el).whiteSpace);
  expect(ws).toBe('pre-line');
});

test('confirming rewrites the line, leaves the cost alone, and retires the fixable half', async ({ page }) => {
  await openSettings(page, 1280, SEED);
  /* ⚠️ `savedPlates` and `kById` are read as BARE IDENTIFIERS, never `window.x`: they are top-level
     `let`, which puts them in the global LEXICAL environment rather than on `window`, so
     `window.savedPlates` is undefined and every assertion built on it THROWS rather than failing.
     `changeLog` is a `var` and does land on `window`; the difference is the keyword, not the file.
     (Same note as tests/visual/228-plate-heal.spec.js, which cost that batch the same half hour.) */
  // eslint-disable-next-line no-undef
  const costBefore = await page.evaluate(() => savedPlates.map((p) => costFromLines(p.lines)));
  await page.click('#setHealLines');
  await page.click('#confirmOk');
  await page.waitForTimeout(400);
  // eslint-disable-next-line no-undef
  const after = await page.evaluate(() => ({
    lines: savedPlates.map((p) => p.lines),
    costs: savedPlates.map((p) => costFromLines(p.lines)),
    log: changeLog.map((e) => e.kind),
  }));
  expect(after.lines[1]).toEqual([{ kid: 'K1', qty: 100 }]);
  expect(after.lines[2]).toEqual([{ pid: 'P0002', qty: 50 }]);   // refused, and left exactly as it was
  expect(after.costs).toEqual(costBefore);                        // the whole safety argument
  expect(after.log).toEqual(['plate_relinked']);
  /* The row survives as the report of the one line nothing can decide, and stops saying "Fix".
     Checked BEFORE the relink below, because relinking K1 onto the orphaned product makes that
     line decidable again — correctly, and it would read here as the heal not having run. */
  await page.evaluate(() => window.showTab('settings'));
  await expect(page.locator('#setHealRow')).toBeVisible();
  await expect(page.locator('#setHealLines')).toHaveText('Show');
  /* And the point of the item: a relink now reaches the line that it could not reach before. */
  // eslint-disable-next-line no-undef
  const moved = await page.evaluate(() => {
    kById.K1.pid = 'P0002';
    return savedPlates.map((p) => costFromLines(p.lines));
  });
  expect(moved[0]).not.toBe(costBefore[0]);
  expect(moved[1]).not.toBe(costBefore[1]);
  expect(moved[1]).toBe(moved[0]);   // both arms, same product, same answer
});

test('the ingredient modal admits to the lines a relink will not reach', async ({ page }) => {
  await openSettings(page, 1280, SEED);
  const txt = await page.evaluate(() => {
    window.openKingModal('K1');
    return document.getElementById('king_used').textContent;
  });
  expect(txt).toMatch(/^Used in 1 saved plate — changing the product updates all of them\./);
  expect(txt).toMatch(/1 older line points straight at this product and won’t follow/);
});
