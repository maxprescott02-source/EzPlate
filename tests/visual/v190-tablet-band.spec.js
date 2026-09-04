/*
 * v190-tablet-band.spec.js — audit rows R1, R2, R3 (docs/ui-audit-2026-09-02.md): the 768-1023
 * tablet band on the three data tables.
 *
 * WHY THIS BAND GETS ITS OWN SPEC: every existing table spec runs at 380 or 1280/1360, so the
 * band between them was measured by NOTHING — which is exactly how three tables shipped desktop
 * column tracks that only fit at ≥1024 (a 34px name column on Menu, 203px-tall rows on
 * Ingredients, and Products' "Last change" column clipped clean off the screen with no scroll
 * and no hint). The audit called the band "broken on all three data tables"; this file is the
 * regression net.
 *
 * Every assertion measures rendered boxes at 768 (the band's worst width) or compares the
 * resolved 1024 template against the desktop tracks — no viewport arithmetic.
 *
 * Broken-and-watched-red before merge — ALL THREE measured, not asserted (R3's revert was
 * hand-run by the batch; the pre-push review then reverted the other two and measured every
 * assertion): reverted at 768, .mnu-id measures 32px (vs >=120), .king-id 62px (vs >=150) with
 * a 129.5px row (vs <=80), and #ingList hides 76px of overflow (vs <=1). Each table's revert
 * reddens its own test.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MW', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Southern Fried Chicken Burger', category: 'Burgers', lines: [{ kid: 'K1', qty: 350 }] },
    { id: 'PL2', name: 'Kids Calamari & Chips', category: 'Kids Meals', lines: [{ kid: 'K1', qty: 120 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Southern Fried Chicken Burger', section: 'Burgers', price: 17, custom: true, menuId: 'MW', plateId: 'PL1' },
    { id: 'MI2', name: 'Kids Calamari & Chips', section: 'Kids Meals', price: 12, custom: true, menuId: 'MW', plateId: 'PL2' },
  ]));
};

async function boot(page, width) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1200);
  // the shim serves products, not kitchen ingredients (228-plate-heal does the same push);
  // P0108 is a fixture product, so the "→ product — supplier" sentence renders for real
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chicken Breast Strips', pid: 'P0108' });
    window.rebuildKById();
  });
  return errs;
}

const box = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, w: b.width, h: b.height }; };

test('R1 at 768: the Menu table gives its name column real width and clips nothing', async ({ page }) => {
  await boot(page, 768);
  const r = await page.evaluate(() => {
    window.showTab('analysis'); window.scrollTo(0, 0);
    const c = document.getElementById('aList');
    const row = c.querySelector('.mnu-row');
    const id = row.querySelector('.mnu-id');
    const verdict = row.querySelector('.mnu-verdict');
    return {
      overflow: c.scrollWidth - c.clientWidth,
      idW: id.getBoundingClientRect().width,
      verdictInside: verdict.getBoundingClientRect().right <= c.getBoundingClientRect().right + 1,
      rows: c.querySelectorAll('.mnu-row').length,
    };
  });
  expect(r.rows, 'the seeded dishes must render or nothing here means anything').toBeGreaterThanOrEqual(2);
  expect(r.overflow, 'no hidden horizontal overflow inside the table container').toBeLessThanOrEqual(1);
  // NOT independent coverage (pre-push review, measured): the verdict is the last track, so its
  // right edge exceeds the container only when the whole grid overflows — the assertion above.
  // Kept for its failure message, which names the visible symptom; idW below carries this test.
  expect(r.verdictInside, 'the last column ends inside the container').toBe(true);
  // the defect measured 34px here; the band tracks hand the name ~150 at 768
  expect(r.idW, 'the name column must be readable, not 34px').toBeGreaterThanOrEqual(120);
});

test('R2 at 768: an Ingredients row holds its product sentence without ballooning', async ({ page }) => {
  await boot(page, 768);
  const r = await page.evaluate(() => {
    window.showTab('pantry'); window.scrollTo(0, 0);
    const c = document.getElementById('kingList');
    const row = c.querySelector('.king-row');
    if (!row) return { rows: 0 };
    const id = row.querySelector('.king-id');
    const used = row.querySelector('.king-used-n');
    return {
      rows: c.querySelectorAll('.king-row').length,
      overflow: c.scrollWidth - c.clientWidth,
      idW: id.getBoundingClientRect().width,
      rowH: row.getBoundingClientRect().height,
      usedInside: used ? used.getBoundingClientRect().right <= c.getBoundingClientRect().right + 1 : null,
    };
  });
  expect(r.rows, 'the pushed kitchen ingredient must render as a row').toBeGreaterThanOrEqual(1);
  expect(r.overflow, 'no hidden horizontal overflow').toBeLessThanOrEqual(1);
  expect(r.usedInside, 'the Used-in column ends inside the container').toBe(true); // same non-independence note as R1's verdictInside
  // the defect: a 64px identity cell wrapped the product sentence one word per line — 203px rows
  // on real data, 129.5px with THIS fixture (measured on the reverted CSS). The bound is 80, not
  // 120: this fixture's passing row measures 57.5, so 80 keeps ~50px of margin to the reverted
  // case where 120 left 9.5 — less than one line box, one CI font wobble from vacuous.
  expect(r.idW, 'the identity cell must hold a sentence, not 64px').toBeGreaterThanOrEqual(150);
  expect(r.rowH, 'a row is a row, not a tower (57.5 passing vs 129.5 reverted, this fixture)').toBeLessThanOrEqual(80);
});

test('R3 at 768: Products shows its Last-change column instead of clipping it offscreen', async ({ page }) => {
  await boot(page, 768);
  const r = await page.evaluate(() => {
    window.showTab('ingredients'); window.scrollTo(0, 0);
    const c = document.getElementById('ingList');
    const cards = Array.from(c.querySelectorAll('.ing-card')).slice(0, 30);
    const cRight = c.getBoundingClientRect().right;
    const drifts = cards.map((card) => card.querySelector('.ing-drift')).filter(Boolean);
    return {
      rows: cards.length,
      overflow: c.scrollWidth - c.clientWidth,
      driftCount: drifts.length,
      // the R3 defect: these cells rendered PAST the container's right edge, invisibly —
      // "data silently hidden, no scroll, no hint"
      allInside: drifts.every((d) => d.getBoundingClientRect().right <= cRight + 1),
      nameW: cards[0] ? cards[0].querySelector('.ing-main').getBoundingClientRect().width : 0,
    };
  });
  expect(r.rows, 'the fixture catalogue must render — it needs no seeding').toBeGreaterThanOrEqual(30);
  // a precondition guard, not coverage: today the renderer emits a drift span on every card (the
  // dash branch included), so this cannot fail against current code — it exists so a future
  // renderer that stops emitting them turns allInside vacuous LOUDLY instead of silently.
  expect(r.driftCount, 'the drift cells must exist for the inside-check to mean anything').toBeGreaterThanOrEqual(30);
  expect(r.overflow, 'THE defect: hidden horizontal overflow clipping the last column').toBeLessThanOrEqual(1);
  expect(r.allInside, 'every Last-change cell ends inside the container').toBe(true);
  expect(r.nameW, 'and the name column still gets the width the freed tracks hand it').toBeGreaterThanOrEqual(200);
});

test('at 1024 the desktop templates stand exactly as shipped — the band overrides must not leak up', async ({ page }) => {
  await boot(page, 1024);
  const r = await page.evaluate(() => {
    const fixed = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      // resolved value: a px list; the flexing name track is index 0, the fixed tracks follow
      return getComputedStyle(el).gridTemplateColumns.split(' ').slice(1).map((v) => Math.round(parseFloat(v)));
    };
    window.showTab('analysis');
    const mnu = fixed('.mnu-band');
    window.showTab('pantry');
    const king = fixed('.king-band');
    window.showTab('ingredients');
    const ing = fixed('.ing-band');
    return { mnu, king, ing };
  });
  // the desktop literals from css/style.css — an equality, so a band override bleeding past 1023
  // (or anyone "tidying" the desktop tracks) fails by name
  expect(r.mnu, 'Menu desktop tracks').toEqual([90, 130, 100, 160]);
  expect(r.king, 'Ingredients desktop tracks').toEqual([130, 110, 110, 100]);
  expect(r.ing, 'Products desktop tracks').toEqual([190, 110, 100]);
});
