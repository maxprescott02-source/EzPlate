/*
 * v90-dash.spec.js — browser cover for the v90 Dashboard rework: insights moved off the Menu tab,
 * the AI marker's two halves, and the "Dig in" drill-downs.
 *
 * Like v89-dash.spec.js this asserts BEHAVIOUR and pins no screenshot baselines, so an unrelated
 * visual tweak can't make it go stale. All off-origin requests are blocked (Supabase never
 * overwrites the seed) and so is /api/*, which means the insight phrasing takes its offline path —
 * deterministic templates, and therefore NO Gemini credit ("Phrased by Gemini, computed by EzPlate" since v133). That is the half of the
 * credit rule jsdom can't show: smoke.js proves it appears when Gemini phrases a line, this proves
 * it stays away when nothing was refined.
 *
 * Run: npx playwright test tests/visual/v90-dash.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

// Two menus with enough shape for real insights: Original spans two sections at different food
// costs (category imbalance), Winter runs hot. Ingredient price history gives the movement families
// something to read; a sell-price log point gives priceHeldSince something to prove.
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original' },
    { id: 'MENU_WINTER', name: 'Winter', season: 'Jun–Aug' }
  ]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
    { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4.4 }] },
    { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] },
    { id: 'PL4', name: 'Soup', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3.1 }] }
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI4', name: 'Soup', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL4' },
    { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
  ]));
  const day = 86400000, now = Date.now();
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 20 * day, v: 42.0 }, { t: now - 10 * day, v: 38.5 }, { t: now - day, v: 36.0 }
  ]));
  localStorage.setItem('cafeDB_menuPriceLog', JSON.stringify({
    MI1: [{ t: now - 120 * day, v: 10 }], MI2: [{ t: now - 120 * day, v: 10 }]
  }));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

async function boot(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.route('**/api/**', r => r.abort());   // no serverless functions behind the static dev server
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1600);
  if (theme) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(() => { const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove(); });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);
}

for (const [label, width] of [['mobile', 380], ['desktop', 1280]]) {
  for (const theme of ['light', 'dark']) {
    test(`v90 dashboard @ ${label} ${theme}`, async ({ page }) => {
      const errs = [], crashes = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => crashes.push(String(e)));
      await boot(page, width, theme);

      // ---- insights are here, inline, with the sparkle and WITHOUT the unearned credit ----
      const ins = page.locator('#dashBody .dash-ins');
      await expect(ins, 'the insights panel renders on the Dashboard').toHaveCount(1);
      // v143: the mock's §3.1 wording — "Needs attention". Copy change, same section, same class.
      await expect(ins.locator('h2')).toContainText('Needs attention');
      await expect(ins.locator('h2 svg.ins-spark'), 'the gradient sparkle is beside the heading').toHaveCount(1);
      await expect(ins.locator('.ins-line').first()).not.toBeEmpty();
      await expect(ins.locator('.ins-credit'), 'templates rendering → nothing was refined → no credit').toBeHidden();

      // it is an ordinary panel in the flow, not a floating layer
      const floating = await ins.evaluate((el) => {
        const p = getComputedStyle(el).position;
        return { p, dialog: !!el.closest('[role="dialog"]') };
      });
      expect(floating.dialog, 'insights are not inside a dialog').toBe(false);
      expect(['static', 'relative']).toContain(floating.p);

      // ---- Dig in: grid → detail → back, no modal ----
      await expect(page.locator('#dashBody .dig-card')).toHaveCount(4);
      await expect(page.locator('#dashBody .dig-card').first()).toContainText('Highest food cost %');
      await page.locator('#dashBody .dig-card').first().click();
      await expect(page.locator('#dashBody .dig-card'), 'the detail view REPLACES the grid').toHaveCount(0);
      await expect(page.locator('#dashBody .dig-row').first()).toBeVisible();
      await expect(page.locator('.modal-overlay.open'), 'a drill-down is not a modal').toHaveCount(0);
      // sorted: highest food cost % first (Roast/Burger 44% > Soup 31% > Toastie 20%)
      const figs = await page.locator('#dashBody .dig-rv').allTextContents();
      const nums = figs.map(t => parseFloat(t));
      expect(nums, 'the list is sorted, highest first').toEqual([...nums].sort((a, b) => b - a));
      await expect(page.locator('#digBack')).toBeVisible();
      await page.locator('#digBack').click();
      await expect(page.locator('#dashBody .dig-card'), 'back returns to the grid').toHaveCount(4);

      // ---- the four cards each survive open + back ----
      for (let i = 0; i < 4; i++) {
        await page.locator('#dashBody .dig-card').nth(i).click();
        await expect(page.locator('#digBack'), `card ${i} opens`).toBeVisible();
        const hasContent = await page.locator('#dashBody .dig-row, #dashBody .empty-state').count();
        expect(hasContent, `card ${i} shows rows or the shared empty state`).toBeGreaterThan(0);
        await page.locator('#digBack').click();
        await expect(page.locator('#dashBody .dig-card'), `card ${i} returns`).toHaveCount(4);
      }

      /* ---- F6 (v143) REPLACES the v98 grid pin in place ----
         The 12-track desktop grid and the `.dp-tile` ordering handles are deleted, so the old
         assertions describe a layout that cannot exist. What is pinned instead is the §6.1
         hierarchy, and it now holds at EVERY width rather than only at ≥1024 — there is no CSS
         reordering left on this screen, which is a stronger statement than the one it replaces. */
      const geo = await page.evaluate(() => ({
        top: document.querySelector('#dashBody .dash-top').getBoundingClientRect(),
        trend: document.querySelector('#dashBody .dash-trend').getBoundingClientRect(),
        ins: document.querySelector('#dashBody .dash-ins').getBoundingClientRect(),
        dig: document.querySelector('#dashBody .dash-dig').getBoundingClientRect()
      }));
      expect(geo.trend.top, 'the trend reads under the verdict').toBeGreaterThanOrEqual(geo.top.bottom - 1);
      expect(geo.ins.top, 'insights read below the trend').toBeGreaterThanOrEqual(geo.trend.bottom - 1);
      expect(geo.dig.top, 'Dig in reads below the insights').toBeGreaterThanOrEqual(geo.ins.bottom - 1);
      // v98 revision: the compares block is gone at EVERY width — deleted, not relocated
      await expect(page.locator('#dashBody .dp-stats, #dashBody .stat-attach, #dashBody .stat-line')).toHaveCount(0);
      // …and so are the v95/v98 tile wrappers and the card they sat in, with the layout that needed them
      await expect(page.locator('#dashBody .dp-tile, #dashBody .dash-panel')).toHaveCount(0);

      /* ---- surfaces: v3 draws a SECTION as a bordered container on the page canvas ----
         The v98 pin here compared the dig tiles' fill against the panel's, because the light-mode
         bug of that era was a beige card inside a white card. There are no cards inside cards left
         to compare: the sections sit on the page and their rows carry no fill of their own. That is
         the property pinned now, by computed style rather than by eyeballing, so a stray background
         creeping back onto a row still fails here. */
      const fills = await page.evaluate(() => {
        const cs = (sel) => getComputedStyle(document.querySelector(sel));
        return {
          dig: cs('#dashBody .dig-card').backgroundColor,
          secBg: cs('#dashBody .dash-dig').backgroundColor,
          secBorder: cs('#dashBody .dash-dig').borderTopWidth,
          band: cs('#dashBody .dash-dig .ds-head').backgroundColor,
        };
      });
      expect(fills.dig, 'a Dig-in row draws no fill of its own').toBe('rgba(0, 0, 0, 0)');
      /* A v3 section is a BORDER on the page canvas, not a filled card — the fill belongs to the
         header band alone (§2's table rules). Measured after the first cut of this assertion asserted
         a section background and failed against correct code: the mock draws none. */
      expect(fills.secBg, 'the section is unfilled — the page shows through it').toBe('rgba(0, 0, 0, 0)');
      expect(parseFloat(fills.secBorder), 'and it is a bordered container').toBeGreaterThan(0);
      expect(fills.band, 'only the header band is tinted').not.toBe('rgba(0, 0, 0, 0)');

      // ---- nothing overflows, nothing errored ----
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);
      expect(crashes, 'no uncaught exceptions').toEqual([]);
      expect(errs.filter(e => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'no console errors').toEqual([]);
    });
  }
}

test('the Menu tab has NO suggestions UI left behind', async ({ page }) => {
  const crashes = [];
  page.on('pageerror', e => crashes.push(String(e)));
  await boot(page, 380, 'light');
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(400);
  for (const sel of ['#menuSuggestFab', '#menuSuggestBtn', '#menuSuggestPanel', '#menuSuggestClose',
                     '#menuInsights', '.msug', '.msug-pill', '.msug-panel', '.menu-insights', '.mi-line', '.mi-credit']) {
    await expect(page.locator(sel), `${sel} must not exist anywhere`).toHaveCount(0);
  }
  // and the removed API is gone from the runtime, not merely hidden
  const gone = await page.evaluate(() => ['renderMenuInsights', 'menuSuggestOpen', 'menuSuggestClose',
    'menuSuggestToggle', 'suggestFabSwipeOff', 'openHighlight'].filter(k => typeof window[k] !== 'undefined'));
  expect(gone, 'no orphaned functions survive the removal').toEqual([]);
  expect(crashes).toEqual([]);
});

test('the old highlight cards and their modal are gone', async ({ page }) => {
  await boot(page, 1280, 'light');
  for (const sel of ['.hl-row', '.hl-card', '#hlModal', '#hlTitle', '#hlBody', '#hlDone']) {
    await expect(page.locator(sel), `${sel} must not exist`).toHaveCount(0);
  }
});

/* v129: the scope rows live behind the dropdown — open it, then pick; picking closes it. */
async function pickScope(page, id) {
  await page.locator('#dashScopeBtn[aria-expanded="false"]').click();
  await page.waitForTimeout(250);
  await page.locator(`.mcmp-row[data-scope="${id}"]`).click();
  await page.waitForTimeout(300);
}

test('scoping the Dashboard changes the insight set and rescopes the drill-downs', async ({ page }) => {
  await boot(page, 1280, 'light');
  const before = await page.locator('#dashBody .ins-line').allTextContents();
  const rowsAll = await page.evaluate(() => {
    document.querySelector('#dashBody .dig-card').click();
    const n = document.querySelectorAll('#dashBody .dig-row').length;
    document.getElementById('digBack').click();
    return n;
  });

  await pickScope(page, 'MENU_WINTER');   // v96: the list is the selector; v129: behind the dropdown
  const after = await page.locator('#dashBody .ins-line').allTextContents();
  expect(after.join('|'), 'a different scope says different things').not.toEqual(before.join('|'));

  const rowsWinter = await page.evaluate(() => {
    document.querySelector('#dashBody .dig-card').click();
    const n = document.querySelectorAll('#dashBody .dig-row').length;
    document.getElementById('digBack').click();
    return n;
  });
  expect(rowsWinter, 'the scoped drill-down narrows to the selected menu').toBeLessThan(rowsAll);

  // the Menu tab's own selection is untouched by dashboard scoping (the v89 invariant, still true)
  expect(await page.evaluate(() => window.currentMenuId)).toBe('MENU_ORIGINAL');
});

test('the GLOBAL drill-downs ignore the scope — they rank products, not a menu', async ({ page }) => {
  await boot(page, 1280, 'light');
  const readCard = (i) => page.evaluate((idx) => {
    document.querySelectorAll('#dashBody .dig-card')[idx].click();
    const rows = [...document.querySelectorAll('#dashBody .dig-row .dig-rn')].map(e => e.textContent);
    const sub = (document.querySelector('#dashBody .dig-sub') || {}).textContent || '';
    document.getElementById('digBack').click();
    return { rows, sub };
  }, i);

  const stockAll = await readCard(3);
  await pickScope(page, 'MENU_WINTER');   // v96: the list is the selector; v129: behind the dropdown
  const stockWinter = await readCard(3);
  expect(stockWinter.rows, 'dearest-per-unit is the same list at any scope').toEqual(stockAll.rows);
  expect(stockWinter.sub, 'and its label says it covers all products').toMatch(/all products/i);
});
