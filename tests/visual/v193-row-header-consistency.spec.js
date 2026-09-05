/*
 * v193-row-header-consistency.spec.js — ui-audit R17 + R18 (batch 235, step 6 of Max's plan).
 *
 * R18: the three sibling data tables disagreed 3-4px on desktop row height (Plates 40.5,
 * Menu 43.5-44.5, Products 43.5 — same 10px padding, the drift was content height). One token,
 * `--lrow-min`, is the floor all three consume. The assertion measures RENDERED row rects and
 * compares them to the token, cross-table, so a per-table regression fails by name whichever
 * table drifts. 45 rather than 44 because a Menu verdict-pill row is 44.5 by content and a 44
 * floor leaves the Menu table unequal within itself — the token comment carries the arithmetic.
 *
 * R17: at ≤767 a header's height is set by its tallest child; seven screens carry a 44px button,
 * so their titles centred at y~84 while More and Dashboard (bare h2) sat 11px higher. The fix
 * puts min-height:44 on the ≤767 h2 itself. The assertion compares the More and Dashboard title
 * positions against a .scr-back sibling screen at 390 — the CROSS-SCREEN claim, not a literal y.
 * Plus the back chevron: below 639 the .btn-noun collapse leaves a 22px-wide "‹", widened to
 * ~44 effective by an ::after — asserted with elementFromPoint at the extended edges, the same
 * real-hit method as v192-touch-targets.spec.js, because a boundingBox cannot see an ::after.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

function seedMenu() {
  return () => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Winter Menu' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify([
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
      { id: 'PL2', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 3 }] },
      { id: 'PL3', name: 'Pumpkin Soup', category: 'Lunch', lines: [] },
    ]));
    // Toastie 20% = a GOOD verdict pill on the first row: the pill is the tallest routine row
    // content (23.5px), so this seed exercises the exact case that decided the token's value.
    localStorage.setItem('cafeDB_menu', JSON.stringify([
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI2', name: 'Roast', section: 'Dinner', price: 7, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
      { id: 'MI3', name: 'Pumpkin Soup', section: 'Lunch', price: 9, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL3' },
    ]));
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.addInitScript(seedMenu(), {});
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

test('R18: all three tables render every row at exactly the --lrow-min floor (1024)', async ({ page }) => {
  await boot(page, 1024);
  const token = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--lrow-min')));
  expect(token, 'the token exists and is a real length').toBeGreaterThanOrEqual(44);
  const tables = [
    ['builder', '#plateList .plib-row'],
    ['analysis', '#aBody .mnu-row'],
    ['ingredients', '#ingList .ing-card'],
  ];
  for (const [tab, sel] of tables) {
    await gotoTab(page, tab);
    await page.waitForTimeout(400);
    const heights = await page.evaluate((s) => [...document.querySelectorAll(s)].slice(0, 6)
      .map(r => Math.round(r.getBoundingClientRect().height * 2) / 2), sel);
    expect(heights.length, `${sel} rendered rows`).toBeGreaterThan(0);
    for (const h of heights) {
      // exactly the floor: under it means the token stopped being consumed, over it means some
      // row content outgrew the floor and the tables have started disagreeing again.
      expect(h, `${sel} row height sits on the shared floor`).toBe(token);
    }
  }
});

test('R17: More and Dashboard titles centre at the same y as a back-chevron screen (390)', async ({ page }) => {
  await boot(page, 390);
  const titleCentre = async (tab) => {
    await gotoTab(page, tab);
    await page.waitForTimeout(300);
    return page.evaluate((t) => {
      const h = document.querySelector('#tab-' + t + ' .scr-head h2');
      const r = h.getBoundingClientRect();
      // the TEXT line centre — the h2 box grew to 44, so the box centre and the text centre
      // coincide only while align-items:center holds; range() reads the rendered text itself.
      const range = document.createRange();
      range.selectNodeContents(h);
      const tr = range.getBoundingClientRect();
      return { box: r.top + r.height / 2, text: tr.top + tr.height / 2, boxH: r.height };
    }, tab);
  };
  const settings = await titleCentre('settings');   // has .scr-back, was always at the shared y
  const more = await titleCentre('more');
  const dash = await titleCentre('dashboard');
  expect(Math.abs(more.text - settings.text), 'More title text centre matches a sibling').toBeLessThanOrEqual(1);
  expect(Math.abs(dash.text - settings.text), 'Dashboard title text centre matches a sibling').toBeLessThanOrEqual(1);
  // the mechanism, so a same-y-by-coincidence cannot satisfy this test while the rule is deleted
  expect(more.boxH, 'the bare h2 carries the 44px row itself').toBeGreaterThanOrEqual(44);
});

test('R17: the collapsed back chevron hits at ~44px wide (390)', async ({ page }) => {
  await boot(page, 390);
  await gotoTab(page, 'settings');
  await page.waitForTimeout(300);
  const probe = await page.evaluate(() => {
    const b = document.querySelector('#tab-settings .scr-back');
    const r = b.getBoundingClientRect();
    const cy = r.top + r.height / 2;
    const hits = (x) => {
      const el = document.elementFromPoint(x, cy);
      return !!el && (el === b || b.contains(el));
    };
    // the visual box is ~22 wide; the ::after buys 11 per side. Probe 9px OUTSIDE each visual
    // edge — inside the extension, outside the box — so a deleted ::after fails both.
    return { w: r.width, left: hits(r.left - 9), right: hits(r.right + 9), centre: hits(r.left + r.width / 2) };
  });
  expect(probe.centre, 'the glyph itself hits').toBe(true);
  expect(probe.left, '9px left of the visual box still hits the control').toBe(true);
  expect(probe.right, '9px right of the visual box still hits the control').toBe(true);
  expect(probe.w, 'the VISUAL box did not grow — the widening is hit-area only').toBeLessThan(30);
});
