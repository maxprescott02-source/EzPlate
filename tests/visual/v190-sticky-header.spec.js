/*
 * v190-sticky-header.spec.js — audit rows R21 + R22 (docs/ui-audit-2026-09-02.md).
 *
 * R22: the page header was measured SCROLLING out of view (not covered — `.scr-head` computed
 * position:static and elementFromPoint found row content at its old spot), taking the page title
 * and, on Dashboard/Menu, the menu-scope identification with it. Fix: `.scr-head` is sticky.
 * R21: the sidebar brand block's border-bottom sat at y69 while the page header's sat at y80 —
 * two independent boxes, two rules, an 11px break at the sidebar boundary. Fix: one --header-h
 * token; both rules end at exactly that y, and the page-side rule is drawn by an ::after that
 * reaches the sidebar's edge so the line is continuous.
 *
 * Every assertion compares two MEASURED boxes or an equality against a declared token — no
 * viewport arithmetic (the CLAUDE.md viewport-geometry rule is about assertions resolved against
 * the viewport; these cancel their containing block out).
 *
 * Broken-and-watched-red before merge (CLAUDE.md: a test nobody has watched fail proves nothing):
 * removing `position:sticky` reddens the pin assertions; removing the ::after reddens the rule
 * reach; restoring both went green. Backed up by cp, not `git checkout --`.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function boot(page, width, height) {
  await page.setViewportSize({ width, height });
  await installBoot(page);
  // one named menu, seeded the way 228-plate-heal does: the shim serves `menus` from this key,
  // and with zero menus renderAnalysis correctly leaves #menuHeadSub empty — the mobile test
  // below asserts the pinned bar NAMES the menu, which needs a menu to name.
  await page.addInitScript(() => {
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MW', name: 'Winter Menu' }]));
  });
  await page.goto('/');
  await page.waitForTimeout(1200);
}

/* The _boot fixture is deliberately small, so a populated screen can be SHORTER than the
 * viewport — and then scrollTo(0,400) is a silent no-op and every "while scrolled" assertion
 * measures the rest state while claiming otherwise (the vacuous-green failure the roster
 * records as 175). The spacer makes the scroll real; the scrollY guards below prove it. */
async function makeScrollable(page, paneSel) {
  await page.evaluate((sel) => {
    const sp = document.createElement('div');
    sp.id = '_v190spacer';
    sp.style.height = '2000px';
    document.querySelector(sel).appendChild(sp);
  }, paneSel);
}

test('R21: one hairline at --header-h, continuous across the sidebar boundary, at rest AND scrolled', async ({ page }) => {
  await boot(page, 1360, 900);
  await makeScrollable(page, '#tab-analysis .panel');
  const r = await page.evaluate(async () => {
    window.showTab('analysis'); window.scrollTo(0, 0);
    await new Promise((res) => setTimeout(res, 200));
    const head = document.querySelector('#tab-analysis .scr-head');
    const brand = document.querySelector('.side-brand-row');
    const nav = document.querySelector('.bottomnav');
    const hv = getComputedStyle(document.documentElement).getPropertyValue('--header-h').trim();
    const box = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }; };
    const after = getComputedStyle(head, '::after');
    const rest = { head: box(head), brand: box(brand), nav: box(nav), headerH: hv, afterLeft: parseFloat(after.left), afterDrawn: after.content !== 'none' && parseFloat(after.height) >= 1 };
    window.scrollTo(0, 400);
    await new Promise((res) => setTimeout(res, 250));
    const scrolled = { head: box(head), brand: box(brand), scrollY: window.scrollY };
    window.scrollTo(0, 0);
    return { rest, scrolled };
  });
  // the token is real and both rules end exactly on it
  expect(r.rest.headerH, 'the --header-h token must be declared at >=1024').toBe('80px');
  expect(r.rest.head.bottom, 'page-side rule sits at --header-h').toBeCloseTo(80, 0);
  expect(r.rest.brand.bottom, 'sidebar rule sits at the SAME y — this is the R21 defect').toBeCloseTo(r.rest.head.bottom, 0);
  // the drawn rule reaches the sidebar edge: box left minus the ::after overhang == nav's right edge
  expect(r.rest.afterDrawn, 'the ::after hairline must exist — border-bottom alone stops at the box').toBe(true);
  expect(r.rest.head.left + r.rest.afterLeft, `rule starts at the sidebar boundary (nav right ${r.rest.nav.right})`)
    .toBeCloseTo(r.rest.nav.right, 0);
  // and the line is continuous while SCROLLED — the case a rest-only assertion cannot see:
  // the pinned bar's bottom edge must hold the same y the fixed sidebar's rule holds forever
  expect(r.scrolled.scrollY, 'the page must actually have scrolled for this to mean anything').toBeGreaterThanOrEqual(300);
  expect(r.scrolled.head.bottom, 'pinned rule still at --header-h').toBeCloseTo(80, 0);
  expect(r.scrolled.head.bottom, 'pinned rule still meets the sidebar rule').toBeCloseTo(r.scrolled.brand.bottom, 0);
});

test('R22: the header pins with an opaque background, under every floating layer', async ({ page }) => {
  await boot(page, 1360, 900);
  await makeScrollable(page, '#tab-analysis .panel');
  const r = await page.evaluate(async () => {
    window.showTab('analysis'); window.scrollTo(0, 400);
    await new Promise((res) => setTimeout(res, 250));
    const head = document.querySelector('#tab-analysis .scr-head');
    const cs = getComputedStyle(head);
    const z = (sel) => { const el = document.querySelector(sel); return el ? parseInt(getComputedStyle(el).zIndex, 10) : null; };
    const out = {
      pos: cs.position, bg: cs.backgroundColor, top: head.getBoundingClientRect().top, scrollY: window.scrollY,
      headZ: parseInt(cs.zIndex, 10), navZ: z('.bottomnav'), bannerZ: z('.install-banner'), toastZ: z('.toast'),
    };
    window.scrollTo(0, 0);
    return out;
  });
  expect(r.pos, 'the fix is the sticky family — R22 measured scrolling, not covering').toBe('sticky');
  // without this the next assertion is vacuous: at rest the bar ALSO sits at 32 (the .wrap pad)
  expect(r.scrollY, 'the page must actually have scrolled').toBeGreaterThanOrEqual(300);
  // equality, not a denylist (roster 190): the pinned bar holds exactly the .wrap clearance
  expect(r.top, 'pinned at var(--sp-8) so the rule can hold --header-h').toBeCloseTo(32, 0);
  expect(r.bg, 'an opaque background — a transparent sticky bar shows rows through it').toMatch(/^rgb\(/);
  // the R13/R19 check the audit row asks for: header under nav under banner under toast
  expect(r.headZ, 'header z must exist').toBeGreaterThan(0);
  for (const [name, zv] of [['nav', r.navZ], ['install banner', r.bannerZ], ['toast', r.toastZ]]) {
    expect(zv, `${name} must carry a z-index for this ordering to be checkable`).not.toBeNull();
    expect(r.headZ, `header stays under the ${name} (z ${zv})`).toBeLessThan(zv);
  }
});

test('R22 mobile: the bar pins at the top and the Menu header still says WHICH menu', async ({ page }) => {
  await boot(page, 390, 812);
  await makeScrollable(page, '#tab-analysis .panel');
  const r = await page.evaluate(async () => {
    window.showTab('analysis'); window.scrollTo(0, 400);
    await new Promise((res) => setTimeout(res, 250));
    const head = document.querySelector('#tab-analysis .scr-head');
    const sub = document.getElementById('menuHeadSub');
    const sb = sub.getBoundingClientRect();
    const hb = head.getBoundingClientRect();
    const out = {
      pos: getComputedStyle(head).position, top: hb.top, scrollY: window.scrollY,
      subShown: getComputedStyle(sub).display !== 'none' && sb.width > 0 && sb.height > 0,
      subText: sub.textContent.trim(),
      subInBar: sb.top >= hb.top - 0.5 && sb.bottom <= hb.bottom + 0.5,
      oneRow: hb.height < 100, // the pre-R22 measured mobile bar is 69px; a wrapped sub would add a ~20px line
    };
    window.scrollTo(0, 0);
    return out;
  });
  expect(r.pos).toBe('sticky');
  expect(r.scrollY, 'the page must actually have scrolled').toBeGreaterThanOrEqual(300);
  expect(r.top, 'pinned at the viewport top once the app bar scrolls away').toBeCloseTo(0, 0);
  // R22's caveat: without this the pinned header reads a bare "Menu" and identifies nothing
  expect(r.subShown, 'the current menu name must be IN the pinned bar on a phone').toBe(true);
  expect(r.subText.length, 'and must actually name a menu').toBeGreaterThan(0);
  expect(r.subInBar, 'inside the bar, not wrapped out of it').toBe(true);
  expect(r.oneRow, 'the sub must not wrap the header taller (flex-basis 0 is what prevents it)').toBe(true);
});

test('the builder header is deliberately NOT pinned, and its cost panel still is', async ({ page }) => {
  await boot(page, 1360, 900);
  const r = await page.evaluate(() => {
    window.openBuilder();
    const head = document.querySelector('#builderPage .scr-head');
    const sum = document.querySelector('.bld-sum');
    return {
      open: !document.getElementById('builderPage').hidden,
      headPos: getComputedStyle(head).position,
      sumPos: sum ? getComputedStyle(sum).position : null,
    };
  });
  expect(r.open, 'openBuilder() must actually show the page').toBe(true);
  // .bld-sum pins at top:24; a sticky page header would sit on top of it (see the CSS note)
  expect(r.headPos, 'bld-head keeps its own positioning — excluded from the sticky rule').toBe('relative');
  expect(r.sumPos, 'the builder cost panel keeps its own pin').toBe('sticky');
});
