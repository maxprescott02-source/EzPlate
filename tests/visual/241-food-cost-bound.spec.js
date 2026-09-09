/*
 * 241-food-cost-bound.spec.js — queue item 18, on screen.
 *
 * The unit file pins the arithmetic and the copy. What only a browser can answer is whether the
 * "Check the price" card RENDERS — it is a whole new dashboard section built from `.dash-sec`,
 * `.ds-head` and `.mv-list`, none of which it owns, so it inherits every rule those families carry
 * and any one of them could leave it invisible, unpadded or the wrong shape at one width.
 *
 * The fixture is the production defect: one plate priced at $0.01 among sane ones. Both widths,
 * because the dashboard's top region swaps between the mobile hero and the desktop KPI strip and
 * this card sits directly under whichever is showing.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* costs 0.01/g. Fish 300g = $3.00 at $12 is 25%; the fritter is the same $3.00 at $0.01. */
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, label: 'food', cost: 3 }] },
    { id: 'PL2', name: 'Pineapple Fritter', category: 'Sweets', lines: [{ misc: true, label: 'food', cost: 3 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 12, custom: true, menuId: 'M1', plateId: 'PL1' },
    { id: 'MI2', name: 'Pineapple Fritter', section: 'Sweets', price: 0.01, custom: true, menuId: 'M1', plateId: 'PL2' },
  ]));
  try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {}
};

const CLEAN = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, label: 'food', cost: 3 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 12, custom: true, menuId: 'M1', plateId: 'PL1' },
  ]));
  try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {}
};

async function dash(page, w, seed, theme) {
  await page.setViewportSize({ width: w, height: 1000 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(seed);
  if (theme) await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.showTab('dashboard'));
  await page.waitForTimeout(400);
}

for (const w of [380, 1280]) {
  test(`${w}: the headline is the sane plate's figure, not an average with a typo in it`, async ({ page }) => {
    await dash(page, w, SEED);
    // 25% from Fish & Chips alone. Unbounded it would be (25 + 30000) / 2 = 15012.5.
    const shown = await page.locator('.dash-top').innerText();
    expect(shown).toMatch(/25\.0%/);
    expect(shown).not.toMatch(/15012|30000/);
  });

  test(`${w}: the excluded plate is named on screen, with both its figures`, async ({ page }) => {
    await dash(page, w, SEED);
    const card = page.locator('.dash-mispriced');
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box.width).toBeGreaterThan(200);          // a zero-size "visible" card is not visible
    const txt = await card.innerText();
    expect(txt).toMatch(/Check the price/);
    expect(txt).toMatch(/Pineapple Fritter/);
    expect(txt).toMatch(/costs \$3\.00, sells for \$0\.01/);
    expect(txt).not.toMatch(/Fish & Chips/);          // the sane plate is not accused of anything
  });

  test(`${w}: with nothing mispriced the card is absent, not an empty state`, async ({ page }) => {
    await dash(page, w, CLEAN);
    await expect(page.locator('.dash-mispriced')).toHaveCount(0);
  });

  test(`${w}: the tile says WHICH average it is`, async ({ page }) => {
    await dash(page, w, CLEAN);
    // The hero shows below 1024 and the KPI strip at/above it; one of them is on screen at each width.
    const top = await page.locator('.dash-top').innerText();
    expect(top).toMatch(/Average of plate food costs/);
    expect(top).not.toMatch(/dish/i);                // the forbidden noun, in the copy this batch wrote
  });
}

for (const theme of ['light', 'dark']) {
  test(`${theme}: the card reads, and carries no verdict tint`, async ({ page }) => {
    await dash(page, 1280, SEED, theme);
    const card = page.locator('.dash-mispriced');
    await expect(card).toBeVisible();
    /* Colour in this app means "against target" (CLAUDE.md Tier 1), and an excluded plate has no
       honest position against target — measured rather than asserted from the class list, because
       a tint can arrive from any ancestor rule. */
    const bg = await card.evaluate((el) => getComputedStyle(el).backgroundColor);
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bg === surface || bg === 'rgba(0, 0, 0, 0)').toBeTruthy();
    /* And it has to be READABLE, which is the one thing a source grep cannot tell you. */
    const why = page.locator('.mp-why');
    const size = await why.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(12);
  });
}

test('the trend axis does not chase a stored bad point', async ({ page }) => {
  /* The bound stops a bad point being written; it cannot remove one already stored, and production
     carries a 354.4. Seeded directly into the history the chart reads. */
  await page.setViewportSize({ width: 1280, height: 1000 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(CLEAN);
  await page.addInitScript(() => {
    const day = 86400000, now = Date.now();
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
      { t: now - day * 5, v: 22 }, { t: now - day * 4, v: 24 },
      { t: now - day * 3, v: 354.4 }, { t: now - day * 1, v: 26 },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.showTab('dashboard'));
  await page.waitForTimeout(500);
  /* textContent, not innerText: these are SVG <text> nodes and innerText returns null for every one
     of them — which reads as "no labels" and would have passed the cap check vacuously. */
  const labels = await page.locator('.dash-trend svg text').evaluateAll((ns) => ns.map((n) => n.textContent));
  const nums = labels.map((t) => parseFloat(t)).filter((n) => !isNaN(n));
  expect(nums.length).toBeGreaterThan(0);   // an empty axis would pass the cap check vacuously
  expect(Math.max.apply(null, nums)).toBeLessThanOrEqual(100);
  /* And the point is still IN the data — clipped, not deleted. This is the half that makes the cap
     honest rather than a quiet edit of the café's history. */
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('cafeDB_priceHistory') || '[]').map((p) => p.v));
  expect(kept).toContain(354.4);
});

/* ⚠️ BOTH OF THE TESTS BELOW EXIST BECAUSE OF WHAT A SCREENSHOT SHOWED, not because a unit test
   failed. The suite was green and the mutation gate was clean when the first was found. */

test('a clipped reading is MARKED, or the chart quietly understates it by three hundred points', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(CLEAN);
  await page.addInitScript(() => {
    const day = 86400000, now = Date.now();
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
      { t: now - day * 5, v: 22 }, { t: now - day * 4, v: 24 },
      { t: now - day * 3, v: 354.4 }, { t: now - day * 1, v: 26 },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.showTab('dashboard'));
  await page.waitForTimeout(500);
  /* The defect the screenshot showed: with the axis rebuilt from the in-range readings, the 354.4
     draws hard against the top edge and reads as a gentle hump peaking around 31%. Clipping without
     saying so is a smaller lie than the 380% axis it replaced, and the same kind. */
  const hint = await page.locator('.dash-trend .chart-hint').innerText();
  expect(hint).toMatch(/above 100% and is drawn at the top of the scale/);
});

test('...and the note is ABSENT when nothing was clipped', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(CLEAN);
  await page.addInitScript(() => {
    const day = 86400000, now = Date.now();
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
      { t: now - day * 5, v: 22 }, { t: now - day * 3, v: 24 }, { t: now - day * 1, v: 26 },
    ]));
  });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.showTab('dashboard'));
  await page.waitForTimeout(500);
  const hint = await page.locator('.dash-trend .chart-hint').innerText();
  expect(hint).not.toMatch(/top of the scale/);
});

test('"Dig in" ranks real plates: a typo does not take the top of the list', async ({ page }) => {
  await dash(page, 1280, SEED);
  /* Measured, not reasoned: before the bound reached this card it read "Highest food cost %:
     Pineapple Fritter 30000.0%" — true, useless, and it pushed the genuinely worst real plate off
     the row. The plate is not hidden; the "Check the price" card above is where it belongs. */
  const dig = await page.locator('.dash-row2').innerText();
  expect(dig).toMatch(/Highest food cost %/);
  expect(dig).not.toMatch(/30000/);
  expect(dig).toMatch(/Fish & Chips/);       // 3.00/12.00 = 25%, the real (and only) ranked plate
});
