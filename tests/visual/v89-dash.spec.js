/*
 * v89-dash.spec.js — browser regression cover for the v89 Dashboard rework.
 *
 * Drives the real app in Chromium with seeded local data (all off-origin requests blocked, so
 * Supabase never overwrites the seed). Deliberately asserts BEHAVIOUR — rendered text, scope
 * switching, grid placement, overflow — and pins no screenshot baselines, so unlike the v72-era
 * shots in fresh-states.spec.js it can't go stale from an unrelated visual tweak. The shots it
 * writes to __shots__/ are review artefacts, not assertions.
 *
 * Run: npx playwright test tests/visual/v89-dash.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

// Two menus, three costed+priced dishes: Original at 30%/30% (avg 30), Winter at 60%.
// v92: Original's two dishes were 20%/40%. Same average, same every asserted figure — but they now
// sit ON the 30% target, which makes the near-miss cluster a REAL insight for this seed. Until v92
// the only thing rendering an insights panel here was insBest ("Toastie is your strongest margin"),
// the padding line, which v92 deleted; the placement check below would then have had nothing to
// measure. The seed has to earn its panel rather than be handed one.
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original' },
    { id: 'MENU_WINTER', name: 'Winter', season: 'Jun–Aug' }
  ]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  const plates = [
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
    { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
    { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] }
  ];
  localStorage.setItem('cafeDB_plates', JSON.stringify(plates));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
  ]));
  // two aggregate history points so the trend line draws (NULL menu_id = all menus)
  const day = 86400000, now = Date.now();
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 20 * day, v: 42.0 }, { t: now - 10 * day, v: 38.5 }, { t: now - day, v: 36.0 }
  ]));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

/* v129: the scope rows live behind the dropdown now — open it when it isn't already. Picking a
   scope CLOSES the dropdown (the button label confirms the pick), so specs re-open per assertion. */
async function openScope(page) {
  const closed = page.locator('#dashScopeBtn[aria-expanded="false"]');
  if (await closed.count()) { await closed.click(); await page.waitForTimeout(250); }
}
async function pickScope(page, id) {
  await openScope(page);
  await page.locator(`.mcmp-row[data-scope="${id}"]`).click();
  await page.waitForTimeout(300);
}

async function boot(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  // v90: /api/* is same-origin, so the rule above lets it through to the static dev server, which
  // 501s on POST. There are no serverless functions behind `playwright test` — block them so the
  // insight phrasing takes its offline path (deterministic templates) instead of logging an error
  // that would mask a real one. Templates + no credit line is exactly the state v90-dash asserts.
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1600);
  if (theme) await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(() => {
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);
}

for (const [label, width] of [['mobile', 380], ['desktop', 1280]]) {
  for (const theme of ['light', 'dark']) {
    test(`v89 dashboard @ ${label} ${theme}`, async ({ page }) => {
      // net::ERR_FAILED is THIS SPEC blocking off-origin (supabase-js, the webfont) on purpose —
      // filtered out so it can't mask a real one. Uncaught exceptions are collected separately.
      const errs = [], crashes = [];
      page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      page.on('pageerror', e => crashes.push(String(e)));
      await boot(page, width, theme);

      // the verdict header shows the ALL-MENUS figure: mean of 20/40/60 = 40.0%
      // ⚠ v133: at ≥1024 the hero is display:none (the KPI strip replaces it) and toHaveText
      // reads textContent regardless of visibility — so on desktop these three lines alone
      // would verify nothing a user sees (review finding). The strip assertions below are the
      // desktop half; the hero lines stay because mobile still shows it.
      await expect(page.locator('.verdict-num')).toHaveText('40.0%');
      await expect(page.locator('.dh-scope')).toHaveText('All menus');
      await expect(page.locator('.verdict-line')).toContainText('10.0 pts over your 30% target');
      if (width >= 1024) {
        await expect(page.locator('.kpi-strip')).toBeVisible();
        await expect(page.locator('.kpi-cell').first()).toContainText('40.0%');
        await expect(page.locator('.kpi-cell').first()).toContainText('10.0 pts over your 30% target');
        await expect(page.locator('.verdict-num')).not.toBeVisible();
      } else {
        await expect(page.locator('.verdict-num')).toBeVisible();
        await expect(page.locator('.kpi-strip')).not.toBeVisible();
      }

      // v96: the picker is gone; v129: so are the chips — the DROPDOWN is the control, its button
      // carrying the current scope's name and figure
      await expect(page.locator('#dashScopeSelect')).toHaveCount(0);
      await expect(page.locator('#dashScopeBtn .dsb-name')).toHaveText('All menus');

      // open it: the list leads with All menus (marked current), then ranks WORST-first
      // (v98, Max's call — overflow must hide the healthy menus, not the ones needing attention)
      await openScope(page);
      await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'all');
      const names = await page.locator('.dash-menus-pop .mcmp-name').allTextContents();
      const pcts = await page.locator('.dash-menus-pop .mcmp-pct').allTextContents();
      expect(names).toEqual(['All menus', 'Winter', 'Original']);
      expect(pcts).toEqual(['40.0%', '60.0%', '30.0%']);

      await page.screenshot({ path: `tests/visual/__shots__/v89-dash-all-${label}-${theme}.png`, fullPage: true });

      // switching scope by tapping a row drives the header (the dropdown is already open)
      await page.locator('.mcmp-row[data-scope="MENU_WINTER"]').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.verdict-num')).toHaveText('60.0%');
      await expect(page.locator('.dh-scope')).toHaveText('Winter');
      /* v97: the chart title no longer appends "— all menus" when narrowed, and the scope caption beside
         the number is gone — scope is stated ONCE, in the card heading (.dh-scope, asserted above). What
         still differs between scopes is .scope-note, which is not a restatement but the v89 honesty
         CORRECTION: the line under a menu's name still covers every menu. That distinction is the point
         of this pair of assertions, so keep both. */
      await expect(page.locator('.chart-title')).toHaveText('Food cost trend');
      await expect(page.locator('.scope-note')).toBeVisible();
      // v129: picking CLOSED the dropdown — the button label is what confirms the selection
      await expect(page.locator('.dash-menus-pop')).toHaveCount(0);
      await expect(page.locator('#dashScopeBtn .dsb-name')).toHaveText('Winter');
      await page.screenshot({ path: `tests/visual/__shots__/v89-dash-winter-${label}-${theme}.png`, fullPage: true });

      // and another row moves it again — exactly one row is ever marked
      await pickScope(page, 'MENU_ORIGINAL');
      await expect(page.locator('.verdict-num')).toHaveText('30.0%');
      await openScope(page);
      await expect(page.locator('.mcmp-row.act')).toHaveCount(1);
      await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'MENU_ORIGINAL');

      // v96: and back to All menus via its row — the state the picker's first option used to reach
      await page.locator('.mcmp-row[data-scope="all"]').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.verdict-num')).toHaveText('40.0%');
      await expect(page.locator('.dh-scope')).toHaveText('All menus');
      await expect(page.locator('.chart-title')).toHaveText('Food cost trend');
      await expect(page.locator('.scope-note')).toHaveCount(0);
      await pickScope(page, 'MENU_ORIGINAL');

      // the Menu tab's own selection is UNTOUCHED by dashboard scoping
      const cur = await page.evaluate(() => window.currentMenuId);
      expect(cur).toBe('MENU_ORIGINAL');

      // desktop: v98 grid (SUPERSEDES the v95 terminal-row bento, per the grid brief) — the
      /* v121: the top card is ONE surface again (verdict + chips + chart), with What moved as the
         right-hand row-1 card — the v98 7/5 split, kept because it is the layout that already
         looked right; v120's two full-width cards were reverted as janky on Max's screenshot.
         Light stacking check only; v98-grid.spec.js owns the full contract at three content
         levels. Asserted unconditionally so it can't pass vacuously (CodeRabbit, v90). */
      if (width >= 1024) {
        await expect(page.locator('#dashBody .dash-ins')).toHaveCount(1);
        const geo = await page.evaluate(() => {
          const r = (s) => { const el = document.querySelector(s); return el ? el.getBoundingClientRect() : null; };
          return { panel: r('#dashBody .dash-panel'), moved: r('#dashBody .dash-moved'),
                   ins: r('#dashBody .dash-ins') };
        });
        for (const k of ['panel', 'moved', 'ins']) {
          expect(geo[k], `${k} renders`).not.toBeNull();
        }
        expect(geo.moved.left, 'What moved is the right-hand row-1 card').toBeGreaterThanOrEqual(geo.panel.right - 1);
        expect(Math.abs(geo.moved.top - geo.panel.top), 'row-1 cards top-aligned').toBeLessThanOrEqual(2);
        expect(geo.ins.top, 'insights are a full-width row below row 1').toBeGreaterThanOrEqual(geo.panel.bottom - 1);
        // edge pins, not a width comparison (CodeRabbit, v98): a width check could pass offset
        expect(geo.ins.left, 'insights start at the top card edge').toBeLessThanOrEqual(geo.panel.left + 1);
        expect(geo.ins.right, 'insights span through the What-moved edge').toBeGreaterThanOrEqual(geo.moved.right - 1);
      }

      // nothing overflows horizontally
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no horizontal overflow').toBeLessThanOrEqual(0);

      expect(crashes, 'no uncaught exceptions').toEqual([]);
      expect(errs.filter(e => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'no console errors').toEqual([]);
    });
  }
}

/* v96: range and scope are ORTHOGONAL, in both directions. The range bar and the By-menu list are two
   controls over two independent module vars (dashRange, persisted; dashScope, session-only), and each
   setter re-renders from the other's live value rather than resetting it. Pinned here because the two
   controls now sit in the same card and a shared re-render is exactly where a reset would hide. */
test('every chart range still renders with the list present, and the range never resets the scope @ 380px', async ({ page }) => {
  await boot(page, 380, 'light');
  await pickScope(page, 'MENU_WINTER');
  for (const rg of ['1w', '1m', '3m', '6m', '1y', 'all']) {
    await page.locator(`.range-btn[data-rg="${rg}"]`).click();
    await page.waitForTimeout(200);
    await expect(page.locator('.dash-chart')).toBeVisible();
    await expect(page.locator('#dashScopeBtn'), 'the scope control survives a range change').toBeVisible();
    // the selection survives every range change — the button label is the closed-state truth
    await expect(page.locator('#dashScopeBtn .dsb-name'), `range ${rg} reset the scope`).toHaveText('Winter');
    await expect(page.locator('.dh-scope')).toHaveText('Winter');
    const of = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(of, `range ${rg} overflows`).toBeLessThanOrEqual(0);
  }
  // …and the reverse: changing the scope leaves the range where the user put it
  await expect(page.locator('.range-btn.act')).toHaveAttribute('data-rg', 'all');
  await pickScope(page, 'MENU_ORIGINAL');
  await expect(page.locator('.range-btn.act')).toHaveAttribute('data-rg', 'all');
});

test('the whole scope control is absent when only one menu exists', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await installBoot(page);
  // v90: /api/* is same-origin, so the rule above lets it through to the static dev server, which
  // 501s on POST. There are no serverless functions behind `playwright test` — block them so the
  // insight phrasing takes its offline path (deterministic templates) instead of logging an error
  // that would mask a real one. Templates + no credit line is exactly the state v90-dash asserts.
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(SEED);
  await page.addInitScript(() => {
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
  });
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#dashScopeSelect')).toHaveCount(0);
  await expect(page.locator('.dash-scope-btn'), 'fewer than two costed menus: no scope control at all').toHaveCount(0);
  await expect(page.locator('.verdict-num')).toBeVisible();
});

/* ===== Priorities the flow-tester could not run against Max's real café data =====
   Safe here: Playwright uses a throwaway browser profile and every off-origin request is aborted, so
   Supabase is never contacted and nothing real is touched. */

// Boot with an arbitrary menus/dishes seed rather than the shared SEED above.
async function bootWith(page, menus, dishes, plates) {
  await page.setViewportSize({ width: 380, height: 900 });
  await installBoot(page);
  // v90: /api/* is same-origin, so the rule above lets it through to the static dev server, which
  // 501s on POST. There are no serverless functions behind `playwright test` — block them so the
  // insight phrasing takes its offline path (deterministic templates) instead of logging an error
  // that would mask a real one. Templates + no credit line is exactly the state v90-dash asserts.
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(([m, d, p]) => {
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify(m));
    localStorage.setItem('cafeDB_menu', JSON.stringify(d));
    localStorage.setItem('cafeDB_plates', JSON.stringify(p));
    localStorage.setItem('cafeDB_cogsPct', '30');
  }, [menus, dishes, plates]);
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
}

const PLATES3 = [
  { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] }
];

test('deleting the OTHER menu while scoped leaves no trapped scope', async ({ page }) => {
  await boot(page, 380, 'light');
  // scope the dashboard to Winter via the dropdown, then delete Original from the Menu tab
  await pickScope(page, 'MENU_WINTER');
  await expect(page.locator('.dh-scope')).toHaveText('Winter');

  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  await page.selectOption('#menuSelect', 'MENU_ORIGINAL');
  await page.waitForTimeout(200);
  await page.locator('#menuDelBtn').click();
  await page.waitForTimeout(300);
  await page.locator('#confirmOk').click();
  await page.waitForTimeout(400);

  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  // one menu left -> the list is gone, so the scope must have collapsed to all-menus with it
  await expect(page.locator('.mcmp-row')).toHaveCount(0);
  await expect(page.locator('.dh-scope')).toHaveText('All menus');
  await expect(page.locator('.dash-scope-btn'), 'fewer than two costed menus: no scope control at all').toHaveCount(0);
  // and the figure is the surviving menu's own, not a stale cached one
  await expect(page.locator('.verdict-num')).toHaveText('60.0%');
});

test('deleting the menu the dashboard is scoped TO recovers cleanly', async ({ page }) => {
  await boot(page, 380, 'light');
  await pickScope(page, 'MENU_WINTER');

  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(300);
  await page.selectOption('#menuSelect', 'MENU_WINTER');
  await page.waitForTimeout(200);
  await page.locator('#menuDelBtn').click();
  await page.waitForTimeout(300);
  await page.locator('#confirmOk').click();
  await page.waitForTimeout(400);

  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator('.dh-scope')).toHaveText('All menus');
  await expect(page.locator('.verdict-num')).toHaveText('30.0%', { timeout: 3000 });   // only Original's dishes remain
  await expect(page.locator('.mcmp-row')).toHaveCount(0);
});

test('zero menus is a legitimate state, not a broken dashboard', async ({ page }) => {
  await bootWith(page, [], [], PLATES3);
  await expect(page.locator('.mcmp-row')).toHaveCount(0);
  await expect(page.locator('.dash-scope-btn'), 'fewer than two costed menus: no scope control at all').toHaveCount(0);
  await expect(page.locator('.verdict-num')).toHaveText('—');
  await expect(page.locator('.verdict-line')).toContainText('Nothing costed and priced yet');
  const of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(of, 'no overflow with nothing to show').toBeLessThanOrEqual(0);
});

test('a menu whose plates have no sell price shows the empty verdict, not 0%', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }],
    [{ id: 'MI1', name: 'Toastie', section: 'Lunch', price: 0, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' }],
    PLATES3);
  await expect(page.locator('.verdict-num')).toHaveText('—');
  await expect(page.locator('.verdict-line')).toContainText('Nothing costed and priced yet');
});

test('a menu with prices but no costed plates shows the empty verdict, not 0%', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }],
    [{ id: 'MI1', name: 'Ghost', section: 'Lunch', price: 12, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'NOPE' }],
    PLATES3);
  await expect(page.locator('.verdict-num')).toHaveText('—');
});

/* v96 CHANGES THIS ONE, deliberately (Max, 29 Jul). An uncosted menu was never a By-menu ROW, but it
   WAS a picker option — so it used to be a reachable scope showing "Nothing costed on this menu yet".
   With the picker gone it is unreachable, and nothing is lost that could be shown: a menu with no
   costed plate has no cost efficiency to display. The exclusion rule itself is unchanged. */
test('an uncosted menu is excluded from By-menu, and is no longer a reachable scope', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENU_WINTER', name: 'Winter' }],
    [
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI2', name: 'Roast', section: 'Dinner', price: 0, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
    ],
    PLATES3);
  // one costed menu -> no list, and therefore no control: the dashboard stays at all-menus
  await expect(page.locator('.dash-scope-btn'), 'fewer than two costed menus: no scope control at all').toHaveCount(0);
  await expect(page.locator('.mcmp-row')).toHaveCount(0);
  await expect(page.locator('.dh-scope')).toHaveText('All menus');
  await expect(page.locator('.verdict-num')).toHaveText('30.0%');   // Toastie: 3/10
});

/* The other half of the same decision: with BOTH menus costed the uncosted-menu case disappears and
   every menu present is reachable, so the narrowing never strands the user. */
test('v96: every menu with a row is reachable, and the All-menus row returns from any of them', async ({ page }) => {
  await bootWith(page,
    [{ id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENU_WINTER', name: 'Winter' }],
    [
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI2', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
    ],
    PLATES3);
  await openScope(page);
  await expect(page.locator('.mcmp-row')).toHaveCount(3);           // All menus + both
  for (const id of ['MENU_ORIGINAL', 'MENU_WINTER']) {
    await pickScope(page, id);
    await openScope(page);
    await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', id);
    await page.locator('.mcmp-row[data-scope="all"]').click();
    await page.waitForTimeout(250);
    await expect(page.locator('.dh-scope')).toHaveText('All menus');
  }
});
