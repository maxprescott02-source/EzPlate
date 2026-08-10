/*
 * v143-dashboard.spec.js — F6: the Dashboard rebuilt from the v3 mock (§3.1 desktop, §6 mobile).
 *
 * These pin CONDITIONS, not coordinates. Three of them exist because the defect was found by
 * LOOKING at the screen and would have shipped past a green suite:
 *
 *  1. THE PLOT'S SCALE. Everything inside the trend SVG is in viewBox units — `font-size:11px` in
 *     CSS is 11 USER UNITS on an SVG <text>, not 11 device px — so a fixed 320-unit box on an 872px
 *     column enlarged the whole chart 2.7×: axis labels measured ~30px against the mock's 10.5, and
 *     the line ~6.8px against 1.75. No assertion about markup can see that. This measures the
 *     RENDERED type, which is the only thing that can.
 *  2. THE TREND HEADING AT 380. The six-button range bar is ~200px wide, so a flex heading row set
 *     "Food cost trend" on three lines. Pinned as a line count, not a width.
 *  3. THE TWO VERDICT SURFACES ARE NEVER BOTH ON SCREEN, and — the case a naive hide breaks —
 *     the first-run path card survives at EVERY width, because the strip that hides the hero is
 *     itself absent when nothing is costed and priced.
 *
 * Run: npx playwright test tests/visual/v143-dashboard.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const DAY = 86400000;

/* Costed and priced, on two menus, with enough history for a real line. */
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original menu' },
    { id: 'MENU_WINTER', name: 'Winter Menu' },
  ]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Bacon & Egg Muffin', category: 'Breakfast', lines: [{ misc: true, name: 'x', cost: 2.31 }] },
    { id: 'PL2', name: 'Chicken Schnitzel Burger', category: 'Mains', lines: [{ misc: true, name: 'x', cost: 4.12 }] },
    { id: 'PL3', name: 'Seafood Basket', category: 'Mains', lines: [{ misc: true, name: 'x', cost: 8.42 }] },
    { id: 'PL4', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, name: 'x', cost: 6.96 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Bacon & Egg Muffin', section: 'Breakfast', price: 8.5, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Chicken Schnitzel Burger', section: 'Mains', price: 14, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI3', name: 'Seafood Basket', section: 'Mains', price: 18.5, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' },
    { id: 'MI4', name: 'Fish & Chips', section: 'Mains', price: 16.5, custom: true, menuId: 'MENU_WINTER', plateId: 'PL4' },
  ]));
  const now = Date.now(), d = 86400000;
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 80 * d, v: 43.2 }, { t: now - 60 * d, v: 42.4 }, { t: now - 44 * d, v: 41.8 },
    { t: now - 30 * d, v: 40.9 }, { t: now - 20 * d, v: 41.6 }, { t: now - 10 * d, v: 41.9 },
    { t: now - 2 * d, v: 41.2 },
  ]));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

/* A seed that actually EARNS an insights panel. The engine's value floors mean most seeds produce
   nothing, and the credit test below needs a line on screen to credit — it skipped itself against
   the main SEED, which is a test that cannot fail. Shape borrowed from v90-dash.spec.js, which was
   built for exactly this: two menus at a 30% target, one spanning two sections at different food
   costs (category imbalance) and one running hot. */
const SEED_INSIGHTS = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENU_WINTER', name: 'Winter' },
  ]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
    { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4.4 }] },
    { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] },
    { id: 'PL4', name: 'Soup', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3.1 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI4', name: 'Soup', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL4' },
    { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' },
  ]));
  const now = Date.now(), d = 86400000;
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 20 * d, v: 42.0 }, { t: now - 10 * d, v: 38.5 }, { t: now - d, v: 36.0 },
  ]));
  localStorage.setItem('cafeDB_menuPriceLog', JSON.stringify({
    MI1: [{ t: now - 120 * d, v: 10 }], MI2: [{ t: now - 120 * d, v: 10 }],
  }));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

/* Nothing costed and priced anywhere — §5's first-run state, derived from data with no stored flag. */
const SEED_EMPTY = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
};

async function boot(page, width, seed) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());   // no serverless functions behind the static dev server
  await page.addInitScript(seed || SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
}

/* ============================================================================================
 * 1. The plot is drawn at 1:1 — the defect a green suite could not see
 * ========================================================================================= */

for (const width of [380, 1360]) {
  test(`the trend's type renders at its stated size, not scaled by the viewBox @ ${width}`, async ({ page }) => {
    await boot(page, width);
    const m = await page.evaluate(() => {
      const svg = document.querySelector('.dash-chart svg');
      const ax = document.querySelector('.dash-chart .ax');
      const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
      return {
        vbW: vb[2],
        renderedW: svg.getBoundingClientRect().width,
        axCss: parseFloat(getComputedStyle(ax).fontSize),   // the value in USER UNITS
        axRendered: ax.getBoundingClientRect().height,      // what a human actually sees
      };
    });
    // The scale IS the bug: a viewBox narrower than its render multiplies every unit inside it.
    const scale = m.renderedW / m.vbW;
    expect(scale, `viewBox ${m.vbW} rendered at ${Math.round(m.renderedW)} — the plot must be sized in rendered px`)
      .toBeLessThan(1.15);
    // 11 user units at scale ~1 is ~11px of type. The cap is generous (line-box height exceeds
    // font-size) and still fails hard against the old 320-unit box, where this measured ~30.
    expect(m.axRendered, `axis label rendered ${Math.round(m.axRendered)}px from a ${m.axCss}px rule`)
      .toBeLessThan(m.axCss * 1.6);
  });
}

test('the plot fills the column rather than sitting in a capped block', async ({ page }) => {
  await boot(page, 1360);
  const m = await page.evaluate(() => ({
    chart: document.querySelector('.dash-chart svg').getBoundingClientRect().width,
    column: document.getElementById('dashBody').clientWidth,
  }));
  // The v98/v121 layout capped it at 540px inside a full-width card, which Max called janky.
  expect(m.chart).toBeGreaterThan(m.column - 2);
});

/* ============================================================================================
 * 2. The §2 header bar, and the scope control rehoused into it
 * ========================================================================================= */

test('the scope control lives in the screen header and still sets the scope', async ({ page }) => {
  await boot(page, 1360);
  const head = page.locator('#tab-dashboard .scr-head');
  await expect(head.locator('h2')).toHaveText('Dashboard');
  // It is INSIDE the header bar, not in the body — the whole point of the rehousing, and the
  // reason renderDashboard wires these handlers to the slot rather than to #dashBody.
  await expect(head.locator('#dashScopeBtn')).toHaveCount(1);
  await expect(page.locator('#dashBody #dashScopeBtn')).toHaveCount(0);

  await page.locator('#dashScopeBtn').click();
  await expect(page.locator('.dash-menus-pop')).toHaveCount(1);
  const before = await page.locator('#dashScopeBtn .dsb-name').textContent();
  await page.locator('.mcmp-row').nth(1).click();
  await page.waitForTimeout(250);
  const after = await page.locator('#dashScopeBtn .dsb-name').textContent();
  expect(after).not.toBe(before);
  await expect(page.locator('.dash-menus-pop'), 'picking a scope closes the layer (v129)').toHaveCount(0);
});

test('the popover rows keep their slim padding now that #dashBody no longer ancestors them', async ({ page }) => {
  // The rule was written `#dashBody .dash-menus-pop .mcmp-row` to out-specify a density block that
  // no longer exists. Left id-qualified it would have stopped matching SILENTLY when the control
  // moved into the header, and the rows would have inherited the 44px-floor padding instead.
  await boot(page, 1360);
  await page.locator('#dashScopeBtn').click();
  const pad = await page.locator('.dash-menus-pop .mcmp-row').first()
    .evaluate((el) => getComputedStyle(el).paddingTop);
  expect(pad).toBe('8px');
});

/* ============================================================================================
 * 3. Two verdict surfaces, never both — and the first-run card that outlives them
 * ========================================================================================= */

test('desktop shows the KPI strip and hides the hero', async ({ page }) => {
  await boot(page, 1360);
  await expect(page.locator('.kpi-strip')).toBeVisible();
  await expect(page.locator('.dash-hero')).toBeHidden();
});

test('mobile shows the 44px hero and hides the KPI strip', async ({ page }) => {
  await boot(page, 380);
  await expect(page.locator('.dash-hero')).toBeVisible();
  await expect(page.locator('.kpi-strip')).toBeHidden();
  const size = await page.locator('.dh-num').evaluate((el) => getComputedStyle(el).fontSize);
  expect(size, "the mobile mock's hero is 44px mono").toBe('44px');
});

for (const width of [380, 1360]) {
  test(`first-run: the path card replaces the verdict at ${width} and carries ONE primary CTA`, async ({ page }) => {
    await boot(page, width, SEED_EMPTY);
    await expect(page.locator('.dash-path')).toBeVisible();
    await expect(page.locator('.dash-hero')).toHaveCount(0);
    // The gate that makes this work: no strip, so nothing hides the hero's slot. An unconditional
    // hide left desktop with no instruction at all (the v133 review finding this preserves).
    await expect(page.locator('.kpi-strip')).toHaveCount(0);
    await expect(page.locator('#dashPathCta')).toBeVisible();
    // Derived from data, not a stored flag — and it opens the real builder, not a lookalike.
    await page.locator('#dashPathCta').click();
    await page.waitForTimeout(300);
    await expect(page.locator('#builderPage')).toBeVisible();   // F7 (v146): the builder is a page, not a modal
  });
}

/* ============================================================================================
 * 4. Layout: the mock's stack, the mock's two-up, and no overflow
 * ========================================================================================= */

test('the trend heading stays on ONE line at 380', async ({ page }) => {
  await boot(page, 380);
  const lines = await page.locator('.dash-trend .ds-head h2').evaluate((el) => {
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.2;
    return Math.round(el.getBoundingClientRect().height / lh);
  });
  expect(lines, 'the range bar took the room and set the title on three lines').toBeLessThanOrEqual(1);
});

test('What moved and Dig in are two-up at desktop and stacked on a phone', async ({ page }) => {
  await boot(page, 1360);
  let box = await page.evaluate(() => {
    const a = document.querySelector('.dash-moved').getBoundingClientRect();
    const b = document.querySelector('.dash-dig').getBoundingClientRect();
    return { sameRow: Math.abs(a.top - b.top) < 2, sideBySide: b.left > a.right - 2 };
  });
  expect(box.sameRow && box.sideBySide).toBe(true);

  await boot(page, 380);
  box = await page.evaluate(() => {
    const a = document.querySelector('.dash-moved').getBoundingClientRect();
    const b = document.querySelector('.dash-dig').getBoundingClientRect();
    return { stacked: b.top > a.bottom - 2 };
  });
  expect(box.stacked).toBe(true);
});

test('a drill-down takes the full row and What moved stands down', async ({ page }) => {
  await boot(page, 1360);
  await page.locator('.dig-card').first().click();
  await page.waitForTimeout(250);
  await expect(page.locator('.dash-moved')).toHaveCount(0);
  await expect(page.locator('.dash-dig.detail-open')).toHaveCount(1);
  const m = await page.evaluate(() => ({
    dig: document.querySelector('.dash-dig').getBoundingClientRect().width,
    column: document.getElementById('dashBody').clientWidth,
  }));
  expect(m.dig).toBeGreaterThan(m.column - 2);
  await page.locator('#digBack').click();
  await page.waitForTimeout(250);
  await expect(page.locator('.dash-moved')).toHaveCount(1);
});

for (const width of [380, 700, 1360]) {
  test(`nothing overflows the viewport @ ${width}`, async ({ page }) => {
    await boot(page, width);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, 'a horizontal scrollbar on the dashboard').toBeLessThanOrEqual(1);
  });
}

/* ============================================================================================
 * 5. The Dig-in row's figure sits on the label's baseline at desktop
 * ========================================================================================= */

test('the Dig-in figure shares the label baseline at desktop', async ({ page }) => {
  // The mobile rule spans the figure across both grid rows and centres it, and `align-self` on a
  // FLEX item outranks the container's `align-items:baseline` — so the desktop row needs it reset.
  // The symptom was a figure sitting a few px low: visible, and invisible to any test that only
  // checks the row exists.
  await boot(page, 1360);
  const d = await page.locator('.dig-card').first().evaluate((el) => {
    const k = el.querySelector('.dig-k').getBoundingClientRect();
    const v = el.querySelector('.dig-v').getBoundingClientRect();
    return Math.abs((k.top + k.height) - (v.top + v.height));
  });
  expect(d, 'label and figure bottoms should sit within a couple of px').toBeLessThan(3);
});

/* ============================================================================================
 * 6. The Gemini credit: the reveal law, and the reason its old reservation rule could go
 * ========================================================================================= */

test('revealing the Gemini credit shifts nothing below it', async ({ page }) => {
  /* v115 reserved the credit's line box because it sat UNDER the insight lines and revealing it
     pushed every section down. F6 moved it into the section's header band (the mock's placement),
     where the band's height is set by its h2 and the credit is shorter — so the reservation rule
     was deleted rather than carried forward inert. This is what makes that safe: if the credit
     ever grows past the h2, or moves back into the flow, this fails.
     It also pins the REVEAL LAW itself across the move: hidden while the deterministic template
     shows, revealed only once Gemini phrased a line that is on screen. The lookup crosses a
     subtree boundary now (the credit is outside #dashInsBody), and a stale `host.querySelector`
     would find nothing, throw nothing, and leave the credit hidden forever with every test green. */
  await boot(page, 1360, SEED_INSIGHTS);
  /* Asserted, never skipped. A `test.skip` on an empty panel would turn the whole thing green on a
     seed that produces nothing — which is what the main SEED does, and how the first cut of this
     test passed while verifying nothing at all. */
  expect(await page.locator('.ins-line').count(), 'the seed must earn its panel').toBeGreaterThan(0);

  const before = await page.evaluate(() => ({
    hidden: document.querySelector('#dashInsPanel .ins-credit').hidden,
    band: document.querySelector('#dashInsPanel .ds-head').getBoundingClientRect().height,
    below: document.querySelector('.dash-row2').getBoundingClientRect().top,
  }));
  expect(before.hidden, 'no API behind the dev server, so nothing was phrased and nothing is credited').toBe(true);

  await page.evaluate(() => {
    // the real reveal path, with the real insight set — the signature guard rejects anything else
    applyPhrasedInsights([], (window.dashInsPending || {}).insights || [], true, false);
  });
  await page.waitForTimeout(150);

  const after = await page.evaluate(() => ({
    hidden: document.querySelector('#dashInsPanel .ins-credit').hidden,
    band: document.querySelector('#dashInsPanel .ds-head').getBoundingClientRect().height,
    below: document.querySelector('.dash-row2').getBoundingClientRect().top,
  }));
  expect(after.hidden, 'the credit is revealed from the section, not the line host').toBe(false);
  expect(after.band, 'the header band does not grow').toBe(before.band);
  expect(after.below, 'and nothing below it moves').toBe(before.below);
});

/* ============================================================================================
 * 7. SPACING, not just ordering — the seam the pre-push review caught
 * ========================================================================================= */

/* A seed that also produces a What-moved row, which needs a logged price step on a REAL product
   from the boot fixture (`digData('movers')` reads `ingPriceLog[pid]` and looks the pid up in
   `byId`, so an invented id yields nothing). P0004 is "Bacon Middle Rindless" in
   tests/fixtures/base-products.json. */
const SEED_MOVER = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original' }, { id: 'MENU_WINTER', name: 'Winter' },
  ]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
    { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4.4 }] },
    { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
    { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' },
  ]));
  const now = Date.now(), d = 86400000;
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify([
    { t: now - 20 * d, v: 42.0 }, { t: now - 10 * d, v: 38.5 }, { t: now - d, v: 36.0 },
  ]));
  localStorage.setItem('cafeDB_ingPriceLog', JSON.stringify({
    P0004: [{ t: now - 30 * d, v: 0.0122 }, { t: now - 2 * d, v: 0.0140 }],   // a ~15% rise
  }));
  localStorage.setItem('cafeDB_dashRange', '3m');
};

for (const width of [380, 700, 1360]) {
  test(`every seam between regions is a real gap, not just an order @ ${width}`, async ({ page }) => {
    /* ⚠ THE POINT OF THIS TEST. Every other geometry assertion in this batch compares
       `b.top >= a.bottom - 1`, which pins the reading ORDER and passes identically whether the gap
       is 20px or nothing at all. It did: `.dash-row2` is the only top-level child of #dashBody that
       is not a `.dash-sec`, so it missed `.dash-sec`'s margin, and the "Needs attention" card's
       border sat FLUSH against "What moved"'s at every width under 768 — a phone-only defect, on
       the app's only real device, found by the pre-push review and invisible to eleven ordering
       assertions. A tolerant comparison is not a spacing assertion. */
    await boot(page, width, SEED_INSIGHTS);
    const gaps = await page.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
      const top = r('.dash-top'), trend = r('.dash-trend'), ins = r('.dash-ins'), row2 = r('.dash-row2');
      return {
        hasIns: !!ins,
        topToTrend: trend.top - top.bottom,
        trendToIns: ins ? ins.top - trend.bottom : null,
        insToRow2: ins ? row2.top - ins.bottom : row2.top - trend.bottom,
      };
    });
    expect(gaps.hasIns, 'the seed must render an insights section for this to mean anything').toBe(true);
    for (const [k, v] of Object.entries(gaps)) {
      if (k === 'hasIns') continue;
      expect(v, `${k} is a real seam, not two borders touching`).toBeGreaterThanOrEqual(16);
    }
  });
}

test('the What-moved delta wears the mock\'s 12px lozenge, not .dig-v\'s 13px', async ({ page }) => {
  /* `.pill{font-size:12px}` and `.dig-v{font-size:13px}` are both single-class, and `.dig-v` is
     declared later — so without an override the lozenge renders at 13px while the comment above
     `.pill` claims 12. v133 shipped the same override for the same collision and it was deleted
     with that block as no-longer-needed. Caught by the pre-push review. */
  await boot(page, 1360, SEED_MOVER);
  const pill = page.locator('.mv-row .dig-v').first();
  await expect(pill, 'the seed must produce a mover row, or this pins nothing').toHaveCount(1);
  const got = await pill.evaluate((el) => ({
    size: getComputedStyle(el).fontSize,
    classes: el.className,
  }));
  expect(got.classes, 'the collision only exists while both classes are on one element').toContain('pill');
  expect(got.classes).toContain('dig-v');
  expect(got.size, 'the §3.1 lozenge is 12px').toBe('12px');
});

/* ============================================================================================
 * 8. v145 — the intervention markers, drivable in a browser for the FIRST TIME
 *
 * `menu_change_log` was in `_boot.js`'s always-empty list until this batch, so the markers and the
 * dashboard's since-line had never rendered in a Playwright run at all — the marker label was
 * changed here and could be checked only in a unit test. The unit test pins the label's TEXT; this
 * pins the thing it cannot see, which is whether two labels collide once they are ~8 characters
 * wide. The collision gap moved 30 → 52 viewBox units for exactly that reason: since v143 a unit is
 * about a rendered pixel, so 30 no longer clears the label it was tuned for.
 * ========================================================================================= */

const SEED_MARKERS = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
  ]));
  const d = 86400000, now = Date.now();
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify(
    [31, 31.6, 32.4, 32.0, 31.7, 32.5].map((v, i, a) => ({ t: now - (a.length - 1 - i) * 6 * d, v }))));
  // WELL SEPARATED: both keep their label, so over-aggressive thinning fails here.
  localStorage.setItem('cafeDB_changeLog', JSON.stringify([
    { t: now - 24 * d, kind: 'dish_price', avgBefore: 32.6, avgAfter: 31.9, detail: {} },
    { t: now - 6 * d, kind: 'plate_edited', avgBefore: 32.4, avgAfter: 32.0, detail: {} },
  ]));
};

/* The SAME series with the two interventions ONE DAY apart, which is the case the collision gap
   exists for. `trendMarkers` dedups to one marker per calendar day, so a day apart is the closest
   two markers can legitimately be. Kept as its own seed because the far-apart case above and this
   one assert opposite things and a single seed cannot do both. */
/* ⚠️ Inlined, NOT composed from SEED_MARKERS. `addInitScript` serialises the function and runs it
   in the page, where the closure it was defined in does not exist — calling a sibling seed from
   inside one throws a ReferenceError in the browser, the seeding silently does nothing, and the
   test then fails for a reason that has nothing to do with what it is testing. Cost twenty
   minutes here; every seed in this file is self-contained for that reason. */
const SEED_MARKERS_CLOSE = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
  ]));
  const d = 86400000, now = Date.now();
  localStorage.setItem('cafeDB_priceHistory', JSON.stringify(
    [31, 31.6, 32.4, 32.0, 31.7, 32.5].map((v, i, a) => ({ t: now - (a.length - 1 - i) * 6 * d, v }))));
  localStorage.setItem('cafeDB_changeLog', JSON.stringify([
    /* 1.5 days apart, and the figure is DERIVED rather than picked: readings sit 6 days apart, the
       plot is ~166 units per reading at 1360, so 1.5 days is ~41 units between markers — inside the
       band where the old 30-unit gap drew both (and they overprinted, labels being ~48 units wide)
       and the new 52-unit gap thins the second. At one day apart they are ~28 units and BOTH gaps
       thin, which is why the first attempt at this test could not fail. */
    { t: now - 7.5 * d, kind: 'dish_price', avgBefore: 32.6, avgAfter: 31.9, detail: {} },
    { t: now - 6 * d, kind: 'plate_edited', avgBefore: 32.4, avgAfter: 32.0, detail: {} },
  ]));
};

for (const width of [380, 1360]) {
  test(`marker labels carry their unit and never overprint @ ${width}`, async ({ page }) => {
    await boot(page, width, SEED_MARKERS);
    const m = await page.evaluate(() => {
      const svg = document.querySelector('.dash-chart svg');
      const lbls = Array.from(svg.querySelectorAll('.mk-lbl'));
      const boxes = lbls.map((t) => t.getBoundingClientRect());
      const plot = svg.getBoundingClientRect();
      let overlap = false;
      for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i - 1].right) overlap = true;
      return {
        texts: lbls.map((t) => t.textContent),
        dots: svg.querySelectorAll('.mk-pt').length,
        overlap,
        escapes: boxes.some((b) => b.left < plot.left - 1 || b.right > plot.right + 1),
      };
    });
    expect(m.dots, 'both interventions draw a dot').toBe(2);
    expect(m.texts.length, 'well separated, so neither label is thinned away').toBe(2);
    m.texts.forEach((t) => expect(t, 'a magnitude with no unit states nothing').toMatch(/pts$/));
    expect(m.overlap).toBe(false);
    expect(m.escapes, 'a label may not run outside the plot').toBe(false);
  });

  test(`two markers a day and a half apart never overprint @ ${width}`, async ({ page }) => {
    /* THE DISCRIMINATING CASE, and the first cut of this test could not fail: its markers were 18
       days apart, so the collision gap was never exercised and reverting 52 → 30 passed. A day and a half
       apart at 1360 is ~41 rendered px between markers against a label ~48px wide, so the old gap
       drew both and they overprinted; the new one thins the second away. */
    await boot(page, width, SEED_MARKERS_CLOSE);
    const m = await page.evaluate(() => {
      const svg = document.querySelector('.dash-chart svg');
      const lbls = Array.from(svg.querySelectorAll('.mk-lbl'));
      const boxes = lbls.map((t) => t.getBoundingClientRect());
      let overlap = false;
      for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i - 1].right) overlap = true;
      return { dots: svg.querySelectorAll('.mk-pt').length, labels: lbls.length, overlap };
    });
    expect(m.dots, 'both dots still draw — only the LABEL thins, never the marker').toBe(2);
    expect(m.overlap, 'labels this close must not overprint').toBe(false);
    expect(m.labels, 'so at most one of the two is labelled').toBeLessThanOrEqual(1);
  });
}

test('v145: the since-line renders, which no browser spec could show before', async ({ page }) => {
  // It reads the change log, so it was unreachable in Playwright until `menu_change_log` was served.
  await boot(page, 1360, SEED_MARKERS);
  await expect(page.locator('.since')).toBeVisible();
  await expect(page.locator('.since')).toContainText('Your last change cut');
});
