/*
 * TEMPORARY DIAGNOSTIC - delete before merge.
 *
 * Prints the numbers that the two CI-only failures turn on, so the fix's stated mechanism is
 * measured on Linux rather than inferred from a Mac. Asserts nothing.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const metrics = () => {
  const de = document.documentElement;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const pr = probe.getBoundingClientRect();
  probe.remove();
  return {
    innerWidth: window.innerWidth,
    deClientW: de.clientWidth,
    fixedProbeW: pr.width,
    scrollbarPx: window.innerWidth - pr.width,
    hasVScroll: de.scrollHeight > de.clientHeight,
    htmlOverflow: getComputedStyle(de).overflowX + '/' + getComputedStyle(de).overflowY,
  };
};

test('PROBE A: boot gate at 1280', async ({ page }) => {
  await installBoot(page, { noClient: true });
  await page.goto('/');
  await expect(page.locator('#bootGate')).toBeVisible();
  const box = await page.locator('#bootGate').boundingBox();
  console.log('PROBE_A ' + JSON.stringify({ gateW: box.width, ...(await page.evaluate(metrics)) }));
});

test('PROBE B: chart at 380', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const day = 86400000, now = Date.now(), pts = [];
    for (let d = 1; d <= 30; d += 2) pts.push({ t: now - d * day, v: 27 + (d % 5) });
    window.priceHistory = pts.sort((a, b) => a.t - b.t);
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await expect(page.locator('#trendWrap svg')).toBeVisible({ timeout: 15000 });
  const chart = await page.evaluate(() => {
    const s = document.querySelector('#trendWrap svg').getBoundingClientRect();
    const w = document.getElementById('trendWrap').getBoundingClientRect();
    // the point the old spec clicked, and what actually sits under it
    const hit = document.elementFromPoint(s.left + 150, s.top + 100);
    return {
      svgW: s.width, svgH: s.height, wrapW: w.width,
      oldClickInside: 100 <= s.height && 150 <= s.width,
      hitAtOldPoint: hit && (hit.tagName + (hit.id ? '#' + hit.id : '')),
    };
  });
  console.log('PROBE_B ' + JSON.stringify({ ...chart, ...(await page.evaluate(metrics)) }));
});
