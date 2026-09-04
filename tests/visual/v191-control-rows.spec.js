/*
 * v191-control-rows.spec.js — ui-audit-2026-09-02 step 3 (R4 + R7, batch 232), Max's own plan.
 *
 * R4: the Menu screen's search was the ONE list control that moved between pages — top-right at
 * 200x40 while Plates / Products / Ingredients put it top-left at 320-400x40. It now takes the
 * same left slot and the same shared sizing on all four screens.
 *
 * R7 (≤767): one control-stack rhythm — the search is a full-width line of its own, the filters
 * are the line under it, and a rehomed secondary action ("Existing plate", "Import") JOINS that
 * group instead of floating alone right-aligned on an orphan row.
 *
 * What is deliberately NOT pinned: exact y positions (the header above these rows is someone
 * else's contract — v190-sticky-header owns it) and the picker's exact width (it is content).
 *
 * Every assertion here was watched FAIL against a hand-reverted stylesheet before merge
 * (CLAUDE.md's roster rule); the reverts and which assertion each turned red are in the batch
 * handover. The 390 case cannot see the `flex:1 1 100%` mobile rule (three screens' searches
 * already wrap to full width there arithmetically), which is why the 767 case exists — at 767
 * the base `1 1 200px` would put the search and a select on ONE shared line.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, label: 'Chips', cost: 6.5 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'D1', menuId: 'M1', plateId: 'PL1', name: 'Fish & Chips', section: 'Mains', price: 18 },
  ]));
};

/* tab id → that screen's search field and control row. The naming inversion is the identifiers'
   law: data-tab "builder" is LABELLED Plates, "ingredients" is Products, "pantry" is Ingredients. */
const SCREENS = [
  { tab: 'analysis', search: '#menuSearch', row: '#menuSwitchRow' },
  { tab: 'builder', search: '#plateSearch', row: '#plateControls' },
  { tab: 'ingredients', search: '#ingSearch', row: '#ingControls' },
  { tab: 'pantry', search: '#kingSearch', row: '#kingControls' },
];

async function boot(page, w) {
  await page.setViewportSize({ width: w, height: 900 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const b = document.querySelector('.install-banner');
    if (b) b.remove();
    // one kitchen word so the Ingredients pane shows its controls (empty pantry is is-nofilters)
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById(); window.renderKitchenPanel();
  });
}

const rect = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
}, sel);

test('R4 @1440: all four screens put the search in ONE left slot at ONE width', async ({ page }) => {
  await boot(page, 1440);
  const got = {};
  for (const s of SCREENS) {
    await page.evaluate((t) => window.showTab(t), s.tab);
    await page.waitForTimeout(250);
    /* the wrap is measured, and the table's id is ASSERTED to live inside it — without this the
       `search` key was decoration a rename would leave stale while the spec stayed green (review
       finding: a mapping the assertions cannot see is the roster's "title names a property the
       assertions cannot see", one level down). */
    const hasField = await page.evaluate(
      ({ row, search }) => !!document.querySelector(`${row} .plib-search ${search}`), s);
    expect(hasField, `${s.tab}: ${s.search} is the field inside the measured wrap`).toBe(true);
    got[s.tab] = await rect(page, `${s.row} .plib-search`);
    expect(got[s.tab], `${s.tab}: the search field renders`).toBeTruthy();
    /* the POSITIVE width first (roster 190: a denylist assertion is weaker than an equality one).
       400 is §26's shared ≥768 cap, and at 1440 every row has the room to reach it. */
    expect(got[s.tab].w, `${s.tab}: search at the shared 400px cap`).toBeCloseTo(400, 0);
  }
  /* one LEFT slot: every screen's search starts where Plates' does. Plates is the reference
     because it has carried this slot since F2 — so it is EXCLUDED from the loop (comparing it
     against itself is a comparison that cannot fail, roster 205's shape) — and the three real
     comparisons cannot go vacuous: each rect was asserted truthy above, and the width literal
     already proved each side is real. */
  for (const s of SCREENS.filter((x) => x.tab !== 'builder')) {
    expect(Math.abs(got[s.tab].x - got.builder.x), `${s.tab}: search shares Plates' left edge`)
      .toBeLessThanOrEqual(1.5);
  }
  /* and the Menu row did not become two lines to achieve it: the switcher sits ON the search's
     line, at its right. Overlap in y, not equality — the two boxes differ in height.
     Re-activate the tab first: the loop above left "pantry" showing, and a hidden pane's
     children all measure a zero rect that reads as "the picker moved", not as "wrong tab". */
  await page.evaluate((t) => window.showTab(t), 'analysis');
  await page.waitForTimeout(250);
  const picker = await rect(page, '#menuSwitchRow .menu-picker-row');
  const search = got.analysis;
  expect(picker.y, 'the picker starts above the search line’s end').toBeLessThan(search.bottom);
  expect(picker.bottom, 'and ends below its start — same line').toBeGreaterThan(search.y);
  expect(picker.x, 'picker right of the search, not under it').toBeGreaterThan(search.right - 1);
});

for (const w of [390, 767]) {
  test(`R7 @${w}: search is a full-width first line on every screen`, async ({ page }) => {
    await boot(page, w);
    for (const s of SCREENS) {
      await page.evaluate((t) => window.showTab(t), s.tab);
      await page.waitForTimeout(250);
      const row = await rect(page, s.row);
      const search = await rect(page, `${s.row} .plib-search`);
      expect(search, `${s.tab}: the search field renders`).toBeTruthy();
      const pad = await page.evaluate((sel) => {
        const cs = getComputedStyle(document.querySelector(sel));
        return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      }, s.row);
      expect(search.w, `${s.tab}: the search takes the row's full content width`)
        .toBeGreaterThanOrEqual(row.w - pad - 1);
      /* and it is the FIRST control: everything else in the row starts on a later line. The
         probe is the wrap detector v142 uses — a child that begins below another child's end.
         The count is asserted too: `.every` on an empty array is true, so a seed that emptied
         these rows (is-nofilters) would pass this silently (review finding — the same guard
         v155-products carries for its own precondition). */
      const others = await page.evaluate((sel) => {
        const row = document.querySelector(sel);
        const search = row.querySelector('.plib-search').getBoundingClientRect();
        const vis = [...row.children]
          .filter((el) => !el.classList.contains('plib-search'))
          .filter((el) => el.getBoundingClientRect().height > 0);
        return {
          count: vis.length,
          below: vis.every((el) => el.getBoundingClientRect().top >= search.bottom - 0.5),
        };
      }, s.row);
      expect(others.count, `${s.tab}: the row really holds controls besides the search`).toBeGreaterThan(0);
      expect(others.below, `${s.tab}: every other visible control sits under the search`).toBe(true);
    }
  });
}

test('R7 @390: the rehomed actions JOIN the control group instead of floating alone', async ({ page }) => {
  await boot(page, 390);

  /* Menu: "Existing plate" shares the picker's line — the audit measured it alone at y250 with
     the select ending at y188, a right-aligned orphan. The picker's 160px flex-basis is what
     makes them fit (160 + 8 + the 121px button inside a 334px content box); see css §31. */
  await page.evaluate((t) => window.showTab(t), 'analysis');
  await page.waitForTimeout(250);
  const sel = await rect(page, '#menuSwitchRow .mnu-selwrap');
  const btn = await rect(page, '#menuAddDishBtn');
  expect(btn, 'the add-existing action renders (a costed plate exists)').toBeTruthy();
  expect(btn.y, 'button starts above the select line’s end').toBeLessThan(sel.bottom - 0.5);
  expect(btn.bottom, 'and ends below its start — same line, not an orphan row').toBeGreaterThan(sel.y + 0.5);

  /* Products: two 160px selects fill a 334px line, so "Import" CANNOT share it at 390 — joining
     the group there means stacking at the GUTTER like any wrapped control, where the old
     margin-left:auto floated it alone at the right (x290 measured). Left edge, positively. */
  await page.evaluate((t) => window.showTab(t), 'ingredients');
  await page.waitForTimeout(250);
  const cat = await rect(page, '#ingControls .plib-selwrap');
  const imp = await rect(page, '#importBtn');
  expect(imp, 'the import action renders').toBeTruthy();
  expect(Math.abs(imp.x - cat.x), 'Import sits on the filters’ own left edge, not floated right')
    .toBeLessThanOrEqual(1.5);
});
