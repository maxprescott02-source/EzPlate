/*
 * v155-shell-edges.spec.js — queue item 13, the desktop shell's page container.
 *
 * WHY THESE ARE MEASURED AND NOT READ. Every fact below was wrong in the file at least once while
 * this was being built, and reading the CSS gave the wrong answer each time:
 *
 *  - THE HEADER RULE OVERHUNG THE CONTENT BY 20px ON EVERY SCREEN, and nothing in the stylesheet
 *    said so. `.scr-head` took its inset as PADDING, so its border box — and therefore the
 *    border-bottom — spanned the whole `.panel` (x336-1248 at 1360), while every body block put its
 *    content at x356-1228. The two insets are written in different places and in different units of
 *    thought (#dashBody/#aList/#plateList by margin; .plib-controls/.invz/.king-progress by their
 *    own padding), so no amount of reading one rule reveals the mismatch. Only comparing the two
 *    rendered boxes does. This file is that comparison.
 *  - A VERTICAL PADDING ON THE BAR SILENTLY BROKE ITS HEIGHT. 8px of it was tried while fixing the
 *    clearance above. §2's bar is 48px and `min-height` was holding it there, but the tallest child
 *    is a 39px `.plib-btn2`, so 39+16 took Menu and Ingredients to 56 while Dashboard and Settings
 *    stayed at 48. The bar stopped being one height across the app and the CSS still looked right.
 *    Hence the equality assertion: "all bars agree" is the invariant, not any one number.
 *  - THE CLEARANCE ABOVE THE BAR WAS 8px AND NOBODY HAD DECLARED IT. `.plib-panel` zeroes `.panel`'s
 *    margin-top and nothing replaced it, so the title sat effectively flush to the top edge.
 *
 * ON THE VIEWPORT-GEOMETRY RULE IN CLAUDE.md: it does not apply here and that is deliberate, not an
 * oversight. That rule governs assertions resolved AGAINST THE VIEWPORT — anything centred, anything
 * positioned by percentage — which must measure a `position:fixed` probe rather than name
 * `innerWidth`. Every assertion in this file compares two MEASURED element boxes against each other,
 * so the containing block cancels out and the 370/380 and 759/768 discrepancy cannot reach it.
 *
 * ON CI FONT METRICS: the Linux runner has no Geist, so text-driven heights differ by a fraction of
 * a pixel — which is what left `main` red after 171 on a zero-slack assertion. The edge assertions
 * here are box-model only (padding and margin in px), so fonts cannot move them. The bar-height
 * assertion has ~9px of slack: the floor is 48 and the tallest child measures 39.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

// every converted screen that wears `.scr-head`
const SCREENS = ['dashboard', 'analysis', 'builder', 'pantry', 'ingredients', 'invoices', 'settings', 'account'];

// The block whose left/right edges the header rule must match. The app insets its screens three
// different ways and all three are correct — what matters is WHERE THE EDGE THE EYE SEES lands:
//   · margin-inset, no border (#dashBody, #aList, #plateList) — border box IS the visible edge
//   · padding-inset, no border (.plib-controls, .king-progress) — nothing is drawn at the border
//     box, so the visible edge is where the padding puts the content
//   · BORDERED (#invDropZone's dashed box) — the border IS the visible edge, so padding must not be
//     subtracted. Getting this wrong is what made the probe's first version report the Invoices
//     zone as misaligned by 24px when the box itself was fine, and then hide a real 20px overhang
//     behind that number. A probe that measures the wrong box fails in both directions.
async function contentEdges(page, key) {
  return page.evaluate((k) => {
    const head = document.querySelector('#tab-' + k + ' .scr-head');
    let el = head.nextElementSibling;
    while (el && (el.hidden || getComputedStyle(el).display === 'none')) el = el.nextElementSibling;
    if (!el) return null;
    const b = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const drawn = parseFloat(s.borderLeftWidth) > 0;
    return {
      left: drawn ? b.left : b.left + parseFloat(s.paddingLeft),
      right: drawn ? b.right : b.right - parseFloat(s.paddingRight),
      tag: el.tagName + '.' + String(el.className || '-') + (drawn ? ' [bordered]' : ''),
    };
  }, key);
}

async function boot(page) {
  await page.setViewportSize({ width: 1360, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

/* ⚠️ RETITLED FOR R21 (2 Sep 2026). This used to say "the header RULE starts and stops exactly
 * where the content does", and that stopped being what it measures: R21 moved the drawn hairline
 * to a `::after` that deliberately overhangs the box to reach the sidebar (Max reversing his own
 * 12 Aug matching-edges call for the rule only). The BOX edges this test compares are now the
 * CONTENT column — the title's left edge and the actions' right edge — and that half of the
 * matching-edges contract still holds and is still pinned here. The drawn rule's new extent, and
 * the sticky behaviour, are asserted in v190-sticky-header.spec.js. A title naming a property the
 * assertions cannot see is worse than no test (CLAUDE.md roster, 205), hence this note. */
test('the header content column starts and stops exactly where the content does, on every screen', async ({ page }) => {
  await boot(page);
  const bad = [];
  for (const key of SCREENS) {
    await page.evaluate((k) => { window.showTab(k); window.scrollTo(0, 0); }, key);
    const head = await page.evaluate((k) => {
      const b = document.querySelector('#tab-' + k + ' .scr-head').getBoundingClientRect();
      return { left: b.left, right: b.right };
    }, key);
    const body = await contentEdges(page, key);
    if (!body) continue;
    // Settings and Account cap their FORM COLUMN at 680 (§2) inside the 960 page container, so their
    // right edge is legitimately narrower than the header. The page container's LEFT edge is the one
    // both must share on every screen; the right edge is asserted everywhere else.
    const formColumn = key === 'settings' || key === 'account';
    if (Math.abs(head.left - body.left) > 0.5) bad.push(`${key}: left head ${head.left} vs content ${body.left} (${body.tag})`);
    if (!formColumn && Math.abs(head.right - body.right) > 0.5) bad.push(`${key}: right head ${head.right} vs content ${body.right} (${body.tag})`);
  }
  expect(bad, 'header rule must not overhang the content column').toEqual([]);
});

/*
 * #builderPage is NOT a `#tab-*` pane — it is a full page inside the same `.wrap`, a child of the
 * Plates library (CLAUDE.md, "The builder is a FULL PAGE"). It wears the same `.scr-head` and so
 * inherits the same contract, and it was MISSED by the loop above: all eight tab screens passed
 * while the builder's two columns began 20px left of the plate name above them, because `.bld-body`
 * carried `padding:… 0 …`. A screen that is not in the list is not covered by the list.
 */
test('the builder page is on the same column as its own header', async ({ page }) => {
  await boot(page);
  const r = await page.evaluate(() => {
    window.openBuilder();
    const p = document.getElementById('builderPage');
    if (p.hidden) return { open: false };
    const head = p.querySelector('.scr-head').getBoundingClientRect();
    const body = p.querySelector('.bld-body');
    const bb = body.getBoundingClientRect();
    const s = getComputedStyle(body);
    return {
      open: true,
      headLeft: head.left, headRight: head.right,
      bodyLeft: bb.left + parseFloat(s.paddingLeft),
      bodyRight: bb.right - parseFloat(s.paddingRight),
    };
  });
  expect(r.open, 'openBuilder() must actually show the page for this to mean anything').toBe(true);
  expect(Math.abs(r.bodyLeft - r.headLeft), `builder body left ${r.bodyLeft} vs header ${r.headLeft}`).toBeLessThanOrEqual(0.5);
  /* ⚠ RIGHT EDGE RELAXED 12 Aug 2026, and the reason is a real constraint rather than a concession.
     The page container went 960 -> 1200 (the wide-viewport work), and `.bld-body` carries the mock's
     §2 builder cap of 1040 — so past a 1040-wide column the builder legitimately stops short of the
     header, exactly as Settings and Account already do inside their 680 form cap. The LEFT edge is
     the page-container contract and stays exact; the right edge is a form-column decision.
     It is bounded rather than dropped: the body must still be the FULL column whenever the column
     fits inside the cap, and may never be wider than the header. */
  expect(r.bodyRight, 'the builder never spills past its header').toBeLessThanOrEqual(r.headRight + 0.5);
  const columnWidth = r.headRight - r.headLeft;
  if (columnWidth <= 1040) {
    expect(Math.abs(r.bodyRight - r.headRight), `at a ${Math.round(columnWidth)}px column the builder fills it`).toBeLessThanOrEqual(0.5);
  }
});

test('the screen header bar is one height across the whole app', async ({ page }) => {
  await boot(page);
  const heights = {};
  for (const key of SCREENS) {
    await page.evaluate((k) => { window.showTab(k); window.scrollTo(0, 0); }, key);
    heights[key] = await page.evaluate((k) => Math.round(document.querySelector('#tab-' + k + ' .scr-head').getBoundingClientRect().height), key);
  }
  const values = [...new Set(Object.values(heights))];
  expect(values, `bars disagree: ${JSON.stringify(heights)}`).toHaveLength(1);
  expect(values[0], 'v3 §2 puts the bar at 48px').toBeGreaterThanOrEqual(48);
});

test('the page title clears the top edge — the header is not flush to the chrome', async ({ page }) => {
  await boot(page);
  for (const key of SCREENS) {
    await page.evaluate((k) => { window.showTab(k); window.scrollTo(0, 0); }, key);
    const gap = await page.evaluate((k) => {
      const wrap = document.getElementById('appMain');
      const wb = wrap.getBoundingClientRect();
      const top = wb.top + parseFloat(getComputedStyle(wrap).borderTopWidth || '0');
      return document.querySelector('#tab-' + k + ' .scr-head').getBoundingClientRect().top - top;
    }, key);
    expect(gap, `${key}: header sits ${gap}px below the top of the page container`).toBeGreaterThanOrEqual(24);
  }
});

/*
 * Pinned because it was REPORTED as a defect and did not reproduce — the report said every nav label
 * rendered at 600, which would leave the active item with no weight signal and the page title with
 * nothing to outrank. v136 had already fixed it. Without this assertion the next reader has to
 * re-measure to find that out, and a regression would look exactly like the original report.
 * The mock's grammar: inactive {13/500, --text-2}, active {13/600, --text}, title 15/600.
 */
test('nav weight carries the active signal, and the page title outranks both', async ({ page }) => {
  await boot(page);
  const out = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.bottomnav .navbtn')]
      .filter((n) => n.getBoundingClientRect().height > 0)
      .map((n) => ({ label: n.textContent.trim(), active: n.classList.contains('active'), weight: getComputedStyle(n).fontWeight, size: getComputedStyle(n).fontSize }));
    const h2 = document.querySelector('#tab-builder .scr-head h2');
    const t = getComputedStyle(h2);
    return { items, title: { weight: t.fontWeight, size: t.fontSize } };
  });
  expect(out.title).toEqual({ weight: '600', size: '15px' });
  for (const i of out.items) {
    expect(i.size, `${i.label} font-size`).toBe('13px');
    expect(i.weight, `${i.label} (${i.active ? 'active' : 'inactive'}) font-weight`).toBe(i.active ? '600' : '500');
  }
  expect(out.items.filter((i) => i.active), 'exactly one nav item is lit at desktop').toHaveLength(1);
});
