/*
 * v151-more.spec.js — 171. The measured half of the More screen and the nav restructure.
 *
 * tests/more-screen.test.js pins the source facts (which lists must match which, which decisions
 * were taken, which routes exist). This file pins what only a browser can settle, and each of these
 * is here because reading the files gave the WRONG answer at least once while it was being built:
 *
 *  - THE PRODUCTS HEADER WRAPS. Adding a "‹ More" chevron to a header that already carried two
 *    actions took its fixed children to 389px against a 380px viewport, and "New product" dropped
 *    to a second row. Nothing in the CSS says so; it was found by measuring the tops. The fix (the
 *    `.btn-noun` collapse) is only correct as long as it keeps measuring one row, so it is pinned
 *    at the width it was found at, on all four screens, rather than argued from the rule.
 *  - WHICH TAB IS LIT. showTab adds `active` to TWO buttons on a More sub-screen. Whether that
 *    reads as one highlight or two depends on `display`, which is a computed style, not a class.
 *  - THE 1023/1024 SEAM. The two media queries are asserted as text in the unit test; that they
 *    actually HAND OVER — exactly one of the two navs present at every width, never zero, never
 *    both — is a rendering question and is measured on both sides of the boundary.
 *  - THE ONE-WAY GUARD. `showTab('more')` above 1024 must redirect. matchMedia only answers
 *    honestly in a real viewport.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SUBS = [
  { key: 'ingredients', title: 'Products' },
  { key: 'invoices', title: 'Invoices' },
  { key: 'settings', title: 'Settings' },
  { key: 'account', title: 'Account' },
];

async function boot(page, w, h, theme) {
  await page.setViewportSize({ width: w, height: h || 844 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  if (theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);
  // the install banner is fixed-position chrome and intercepts clicks in this harness
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

/* §6: five tabs, and §6.1 fixes the order — "sidebar top-to-bottom = tab bar left-to-right".
   Read from what is VISIBLE, not from the DOM: the four `.nav-bottom` buttons are still in the
   markup at this width and only `display:none` separates them from the bar. */
test('380: the tab bar is the mock\'s five, in order, with nothing else showing', async ({ page }) => {
  await boot(page, 380);
  const bar = await page.evaluate(() => [...document.querySelectorAll('nav.bottomnav .navbtn')]
    .filter((b) => b.getBoundingClientRect().width > 0)
    .map((b) => ({ tab: b.dataset.tab, label: b.querySelector('.nl').textContent, left: Math.round(b.getBoundingClientRect().left) })));
  expect(bar.map((b) => b.tab)).toEqual(['dashboard', 'analysis', 'builder', 'pantry', 'more']);
  expect(bar.map((b) => b.label)).toEqual(['Dashboard', 'Menu', 'Plates', 'Ingredients', 'More']);
  // left-to-right, ascending, no overlap — the "reading direction" half of the parity map
  expect(bar.map((b) => b.left)).toEqual([...bar.map((b) => b.left)].sort((a, b) => a - b));
  // and the desktop group is genuinely absent, not merely off-screen
  await expect(page.locator('.navbtn.nav-bottom').first()).toBeHidden();
});

test('380: the More screen is four rows in §6.1\'s order, each opening its screen', async ({ page }) => {
  await boot(page, 380);
  await page.locator('.navbtn[data-tab="more"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#tab-more')).toBeVisible();
  await expect(page.locator('#tab-more .scr-head > h2')).toHaveText('More');
  await expect(page.locator('#tab-more .more-lbl')).toHaveText(['Products', 'Invoices', 'Settings', 'Account']);

  /* Every row clears the 44px thumb floor and the mock's own 56px row height. Measured, because the
     rule is `min-height` inside a flex context and what that resolves to is not readable. */
  for (const box of await page.locator('#tab-more .more-row').all()) {
    expect((await box.boundingBox()).height, 'row height').toBeGreaterThanOrEqual(56);
  }

  for (const { key, title } of SUBS) {
    await page.locator('.navbtn[data-tab="more"]').click();
    await page.waitForTimeout(200);
    await page.locator(`#tab-more [data-more="${key}"]`).click();
    await page.waitForTimeout(300);
    await expect(page.locator(`#tab-${key}`), `${title} opens`).toBeVisible();
    await expect(page.locator('#tab-more')).toBeHidden();
    await expect(page.locator(`#tab-${key} .scr-head > h2`)).toHaveText(title);
    // …and back again, which is the half that makes it not a dead end
    await page.locator(`#tab-${key} .scr-back`).click();
    await page.waitForTimeout(300);
    await expect(page.locator('#tab-more'), `${title} goes back to More`).toBeVisible();
  }
});

/* THE LIT TAB. showTab adds `active` to #navMore AND to the sub-screen's own `.nav-bottom` entry.
   The claim that this is not a double highlight rests entirely on the two never rendering at the
   same width, which is a computed `display` and not something the class list can show. Both halves
   are asserted: More is lit AND it is the only lit thing a phone user can see. */
test('380: every More sub-screen lights More, and lights nothing else visible', async ({ page }) => {
  await boot(page, 380);
  for (const { key, title } of SUBS) {
    await gotoTab(page, key);
    const lit = await page.evaluate(() => [...document.querySelectorAll('nav.bottomnav .navbtn.active')]
      .filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.dataset.tab));
    expect(lit, `${title} lights More, and exactly one tab`).toEqual(['more']);
    // and the app still knows which screen it is on — the #navMore-is-last-in-the-DOM contract
    expect(await page.evaluate(() => window.currentTab()), `currentTab on ${title}`).toBe(key);
  }
});

/* THE HEADER MUST NOT WRAP. §6 gives the phone "screen title + one action max" and a wrapped header
   is a defect the queue names as such. This is the assertion that caught the chevron pushing the
   Products header to two rows: it compares the TOP of every visible header child, which is the only
   thing that distinguishes one row from two.

   ⚠️ 360 IS DELIBERATELY NOT IN THIS LIST, and the reason is measured rather than assumed. The
   Products header DOES wrap at 360 with the chevron present — but 360 was already a width where a
   header wrapped before this batch: on `main`, at 360, the INGREDIENTS header (its conditional
   "Set up from products" beside "New ingredient") measures 121px tall against the one-row 69. Both
   wraps have the same cause and it is not the chevron, which costs 30px: it is a SECOND ACTION
   costing 72-130px in a header §6 allows one action in. No spec in this repo has ever measured 360
   — every mobile assertion is at 380, and the mock's own reference is 390 — so pinning it here
   would be inventing a support width and then engineering to it, and the machinery it would take
   (shrinking the chevron below its tap target and re-expanding with an ::after) would still leave
   Ingredients broken at that width. It is recorded on the queue item that owns the second action,
   naming both screens, and that item's fix resolves both at once. */
for (const width of [380, 430]) {
  test(`${width}: no More sub-screen header wraps to a second row`, async ({ page }) => {
    await boot(page, width);
    for (const { key, title } of SUBS) {
      await gotoTab(page, key);
      const m = await page.evaluate((k) => {
        const head = document.querySelector(`#tab-${k} .scr-head`);
        /* ZERO-HEIGHT CHILDREN ARE EXCLUDED, and this is the whole subtlety of the measurement.
           `.scr-gap` is the mock's explicit flex spacer — no content, so its rect is a zero-height
           line — and a zero-height span overlaps nothing by definition. Including it made this
           assertion report "wrapped" on a header that was visibly one row, in every case. So the
           test measures the children that actually OCCUPY the row. */
        const rects = [...head.children]
          .filter((e) => getComputedStyle(e).display !== 'none')
          .map((e) => e.getBoundingClientRect())
          .filter((r) => r.height > 0);
        // one row: every child's vertical span overlaps every other child's
        const lo = Math.max(...rects.map((r) => r.top)), hi = Math.min(...rects.map((r) => r.bottom));
        return { oneRow: lo < hi, n: rects.length,
          overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      }, key);
      expect(m.n, `${title} header has children to measure`).toBeGreaterThan(1);
      expect(m.oneRow, `${title} header is one row at ${width}`).toBe(true);
      expect(m.overflowX, `${title} does not overflow horizontally at ${width}`).toBeLessThanOrEqual(0);
    }
  });
}

/* THE SEAM. Exactly one of the two navs at every width — never zero (four screens unreachable),
   never both (a phone tab beside the sidebar entries it duplicates). 1023 and 1024 are the two
   values that matter; the outer pair guard against a query being widened rather than moved. */
for (const width of [380, 1023, 1024, 1360]) {
  test(`${width}: exactly one of the More tab / the sidebar bottom group is present`, async ({ page }) => {
    await boot(page, width, 900);
    const vis = async (sel) => page.evaluate((s) => [...document.querySelectorAll(s)]
      .filter((e) => e.getBoundingClientRect().width > 0).length, sel);
    const more = await vis('.nav-more');
    const bottom = await vis('.navbtn.nav-bottom');
    if (width >= 1024) {
      expect(more, 'no More tab beside the sidebar').toBe(0);
      expect(bottom, 'the sidebar carries all four').toBe(4);
    } else {
      expect(more, 'the phone gets the More tab').toBe(1);
      expect(bottom, 'and none of the sidebar group').toBe(0);
    }
  });
}

/* THE BACK CHEVRON rides the same seam: it points at a screen that only exists below 1024, so at
   desktop width it must be gone rather than merely inert. Asserted on all four, because the rule is
   one selector and a screen could be given a chevron outside `.scr-head` by accident. */
test('1360: no back chevron, no More list, and the four are first-class sidebar entries', async ({ page }) => {
  await boot(page, 1360, 900);
  await expect(page.locator('.navbtn.nav-bottom .nl')).toHaveText(['Products', 'Invoices', 'Settings', 'Account']);
  for (const { key, title } of SUBS) {
    await page.locator(`.navbtn[data-tab="${key}"]`).click();
    await page.waitForTimeout(250);
    await expect(page.locator(`#tab-${key}`)).toBeVisible();
    await expect(page.locator(`#tab-${key} .scr-back`), `${title} hides its chevron on desktop`).toBeHidden();
    // the sidebar entry itself is what is lit here — More does not exist to be lit
    const lit = await page.evaluate(() => [...document.querySelectorAll('nav.bottomnav .navbtn.active')]
      .filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.dataset.tab));
    expect(lit, `${title} lights its own sidebar entry`).toEqual([key]);
  }
  await expect(page.locator('.more-list')).toBeHidden();
});

/* THE ONE-WAY GUARD, driven rather than read. The route that reaches it in real life is
   restoreLastTab() replaying a `cafeDB_lastTab` of 'more' written on a phone, so that is the route
   driven here — a bare showTab('more') would test the same branch but not the way in. */
test('1360: a lastTab of "more" saved on a phone lands on the Dashboard, not a blank pane', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await installBoot(page);
  await page.addInitScript(() => { localStorage.setItem('cafeDB_lastTab', 'more'); });
  await page.goto('/');
  await page.waitForTimeout(1400);
  await expect(page.locator('#tab-more')).toBeHidden();
  await expect(page.locator('#tab-dashboard')).toBeVisible();
  // …and the redirect is WRITTEN BACK, or every reload at desktop width repeats the bounce
  expect(await page.evaluate(() => localStorage.getItem('cafeDB_lastTab'))).toBe('dashboard');
});

/* Crossing the seam with More open. No navigation happens, so showTab's guard cannot fire — the
   media query itself is the event. Without the listener the user is left on a blank panel with a
   sidebar that has no way to express where they are. */
test('resizing from phone to desktop with More open leaves the Dashboard, not a blank pane', async ({ page }) => {
  await boot(page, 380);
  await page.locator('.navbtn[data-tab="more"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#tab-more')).toBeVisible();
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.waitForTimeout(400);
  await expect(page.locator('#tab-more')).toBeHidden();
  await expect(page.locator('#tab-dashboard')).toBeVisible();
});

/* §4: every colour from a token, and the focus ring visible on every interactive. The token rule is
   self-enforcing per FOLD-IN §6 — a hard-coded hex in a converted screen IS a dark-mode bug — so it
   is checked by reading the live cssRules rather than grepping the file, which would miss a colour
   arriving from a shared rule the screen happens to match. */
for (const theme of ['light', 'dark']) {
  test(`380 ${theme}: the More screen is token-only, focusable, and reads on its canvas`, async ({ page }) => {
    await boot(page, 380, 844, theme);
    await page.locator('.navbtn[data-tab="more"]').click();
    await page.waitForTimeout(300);

    const hex = await page.evaluate(() => [...document.styleSheets]
      .flatMap((s) => { try { return [...s.cssRules]; } catch (e) { return []; } })
      .filter((r) => r.selectorText && /\.more-|\.scr-back/.test(r.selectorText))
      .filter((r) => /#[0-9a-f]{3,8}\b/i.test(r.cssText)).map((r) => r.selectorText));
    expect(hex, 'zero hard-coded hex in this screen\'s rules').toEqual([]);

    /* FOCUSED BY KEYBOARD, not by `.focus()`. The ring is `:focus-visible`, and Chromium only
       matches that after a KEYBOARD interaction — a programmatic focus following a mouse click
       leaves the element focused with no ring, so `locator.focus()` reported "none" against a rule
       that works perfectly for the user it is for. Tabbing is what a keyboard user does and is the
       only way to ask the real question. */
    const onRow = () => page.evaluate(() => !!document.activeElement
      && document.activeElement.classList.contains('more-row'));
    for (let i = 0; i < 40 && !(await onRow()); i++) await page.keyboard.press('Tab');
    const ring = await page.evaluate(() => {
      const n = document.activeElement;
      const cs = getComputedStyle(n);
      return { cls: n.className, w: cs.outlineWidth, s: cs.outlineStyle, c: cs.outlineColor };
    });
    expect(ring.cls, 'tabbing reaches a More row').toContain('more-row');
    expect(ring.s, 'focus ring style').not.toBe('none');
    expect(parseFloat(ring.w), 'focus ring width').toBeGreaterThanOrEqual(2);
    expect(ring.c, 'and it is a real colour, not transparent').not.toBe('rgba(0, 0, 0, 0)');

    // the sub-line must not vanish into the canvas in either theme — it is the row's whole content
    const sub = await page.locator('#tab-more .more-sub').first().evaluate((n) => getComputedStyle(n).color);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(sub, 'the muted line resolves to a real colour').toMatch(/^rgba?\(/);
    expect(sub, 'and is not the page background').not.toBe(bg);
  });
}
