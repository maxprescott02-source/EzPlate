/*
 * v115-reframe.spec.js — the chart reframe, driven in the real DOM.
 *
 * menu_change_log had 0 rows when this batch shipped — nothing had ever RENDERED an entry, so a
 * wrong figure or shape had been invisible since v114. This spec is that first look: it seeds real
 * entries through the page and asserts what actually draws, in both themes, at phone and desktop
 * widths. Behavioural assertions only; the screenshots are review artefacts, not baselines.
 *
 * Run: npx playwright test tests/visual/v115-reframe.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
  localStorage.setItem('cafeDB_cogsPct', '30');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2.4 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
  ]));
  localStorage.setItem('cafeDB_lastTab', 'dashboard');
};

// A rising-under-target series with one real intervention drop 20 days back, plus a raise (which
// must NOT mark), pushed into the live module vars the same way the v47 dark-theme spec does.
const seedSeries = () => {
  const day = 86400000, now = Date.now(), pts = [];
  for (let d = 60; d >= 21; d -= 3) pts.push({ t: now - d * day, v: 24 - (d - 21) / 20 });
  pts.push({ t: now - 20 * day, v: 21.5 });                     // the drop lands here
  for (let d = 19; d >= 0; d -= 2) pts.push({ t: now - d * day, v: 21.7 + (19 - d) / 12 });
  window.priceHistory = pts;
  window.changeLog = [
    { id: 'CLA', t: now - 20.2 * day, kind: 'ingredient_repointed', plateId: 'PL1', dishId: null,
      menuIds: ['MENU_ORIGINAL'], avgBefore: 24, avgAfter: 21.5, costBefore: 2.9, costAfter: 2.4, detail: {} },
    { id: 'CLB', t: now - 6 * day, kind: 'dish_price', plateId: 'GONE_PLATE', dishId: 'MI9',
      menuIds: ['MENU_ORIGINAL'], avgBefore: 21.9, avgAfter: 22.3, costBefore: null, costAfter: null,
      detail: { priceFrom: 12, priceTo: 11 } },                  // a RAISE in avg terms — no marker
  ];
  window.setDashRange('3m');
};

for (const theme of ['light', 'dark']) {
  for (const size of [{ name: 'phone', width: 380, height: 760 }, { name: 'desktop', width: 1200, height: 900 }]) {
    test(`v115 reframe: markers + since-line + target colour @ ${theme}/${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await installBoot(page);
      await page.addInitScript(SEED);
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
      await page.goto('/');
      await page.waitForTimeout(1500);
      await page.evaluate(`document.documentElement.setAttribute('data-theme','${theme}')`);
      await page.evaluate(seedSeries);
      await page.waitForTimeout(300);

      const st = await page.evaluate(() => ({
        stroke: document.querySelector('#trendWrap svg g[clip-path] path[stroke]').getAttribute('stroke'),
        marks: document.querySelectorAll('#trendWrap .mk-pt').length,
        band: !!document.querySelector('#trendWrap .over-band'),
        since: (document.querySelector('.since') || {}).textContent || '',
        caption: document.querySelector('.chart-hint').textContent,
        chartRight: document.querySelector('#trendWrap svg').getBoundingClientRect().right,
      }));
      expect(st.stroke, 'under target → green, however the line slopes').toBe('var(--good)');
      expect(st.marks, 'ONE marker: the drop marks, the raise does not').toBe(1);
      expect(st.band, 'target (30) sits above this series and out of its domain — no band to shade').toBe(false);
      // The LATEST entry is the recent price correction (a raise), not the older drop — the
      // since-line reports the last thing Max did, whatever its direction, and stays neutral.
      expect(st.since, 'the since-line reports the latest entry').toContain('Your last change was 6 days ago.');
      expect(st.since, 'then the drift, measured from that entry\'s after-figure').toMatch(/Costs up [\d.]+ pts since\./);
      expect(st.caption, 'the caption keys the marker once').toContain('marks changes you made');
      expect(st.caption).toContain('under your 30% target');
      expect(st.chartRight, 'chart stays inside the viewport').toBeLessThanOrEqual(size.width);
      await page.locator('.dash-panel').screenshot({ path: `tests/visual/__shots__/v115-reframe-${theme}-${size.name}.png` });
    });
  }
}

test('v115 reframe: the EMPTY change log — the state production actually ships — renders clean', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 760 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 30; d >= 0; d -= 3) pts.push({ t: now - d * day, v: 22 + (30 - d) / 30 });
    window.priceHistory = pts; window.setDashRange('3m');
  });
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({
    marks: document.querySelectorAll('#trendWrap .mk-pt').length,
    since: !!document.querySelector('.since'),
    errors: window.__pageErrors || null,
    caption: document.querySelector('.chart-hint').textContent,
  }));
  expect(st.marks, 'no log, no markers').toBe(0);
  expect(st.since, 'no log, no since-line — an empty state, not a fault').toBe(false);
  expect(st.caption, 'the caption still states position against target').toContain('under your 30% target');
});

test('v115 reframe: an entry naming a deleted plate draws without error', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 760 });
  await installBoot(page);
  await page.addInitScript(SEED);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 30; d >= 0; d -= 3) pts.push({ t: now - d * day, v: 23 - (30 - d) / 20 });
    window.priceHistory = pts;
    window.changeLog = [{ id: 'CLX', t: now - 15 * day, kind: 'plate_deleted', plateId: 'PLATE_LONG_GONE',
      dishId: null, menuIds: ['MENU_ORIGINAL'], avgBefore: 23, avgAfter: 22.4, costBefore: 4, costAfter: null, detail: { name: 'Old special' } }];
    window.setDashRange('3m');
  });
  await page.waitForTimeout(300);
  const marks = await page.evaluate(() => document.querySelectorAll('#trendWrap .mk-pt').length);
  expect(marks, 'the movement was real; the dead reference costs nothing').toBe(1);
  expect(errors, 'no page errors').toEqual([]);
});
