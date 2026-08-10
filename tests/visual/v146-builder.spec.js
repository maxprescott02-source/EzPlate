/*
 * v146-builder.spec.js — F7. The builder page, in a real browser, at both widths and both themes.
 *
 * What it pins, and why each one is a thing that can go wrong rather than a description:
 *
 *  - It is a PAGE. It hides the Plates library behind it, keeps the Plates nav item lit (a child
 *    page, not a sixth tab), and leaves cleanly. Tapping another tab leaves it — which is exactly
 *    what pressing × did while it was a modal, and the draft machinery still covers the work.
 *  - The mock's five columns line up DOWN the table. Each row is its own grid, so per-row track
 *    sizing would let the columns drift; Q6 (v125) measured that on the docket and this table has
 *    the same shape. `costRights` collapsing to one value is the assertion.
 *  - §7: the plate cost is printed ONCE per width. Desktop = the Cost card, phone = the summary
 *    bar, never both. The old docket printed it twice and Q6 had to unpick it.
 *  - §6: one action in the mobile header. Save is it; Duplicate went to the rail for this reason.
 *  - The header pill is ABSENT on an unpublished plate, not zeroed — there is no price anywhere
 *    to compute a food cost from, and a "0% food cost" pill would be a fabricated figure.
 *  - No horizontal scroll at 380px, and no row escapes the table.
 *
 * GEOMETRY REFERENCE: this spec measures elements against their own PARENT, never against
 * window.innerWidth — CLAUDE.md's viewport rule. Nothing here is resolved against "the whole
 * screen", so no fixed-position probe is needed; the one place that would need it (the summary
 * bar's width) is asserted against the fixed frame instead.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350 }] },
    { id: 'PL2', name: 'Unpublished Plate', category: '', lines: [{ kid: 'K1', qty: 100 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 6, custom: true, menuId: 'MENU_WINTER', plateId: 'PL1' },
  ]));
};

async function openOn(page, rowIndex, { width, height, theme }) {
  await page.setViewportSize({ width, height });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .plib-row').nth(rowIndex).click();
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const b = document.querySelector('.install-banner, #installBanner'); if (b) b.remove();
    const t = document.getElementById('toast'); if (t) t.remove();
  });
}

/* The fixed-position containing block, measured rather than named. CLAUDE.md: innerWidth and
   clientWidth both disagree with it on the Linux runner (370 in a 380 viewport). */
async function fixedFrame(page) {
  return page.evaluate(() => {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;right:0;top:0;height:1px;pointer-events:none';
    document.body.appendChild(p);
    const w = p.getBoundingClientRect().width;
    p.remove();
    return w;
  });
}

const SIZES = [
  { name: 'mobile', width: 380, height: 780 },
  { name: 'desktop', width: 1280, height: 900 },
];

for (const size of SIZES) {
  for (const theme of ['light', 'dark']) {
    test(`the builder is a page, and its columns line up @ ${size.name} ${theme}`, async ({ page }) => {
      const errs = [];
      page.on('pageerror', (e) => errs.push(String(e)));
      await openOn(page, 0, { ...size, theme });
      await page.evaluate(() => window.addMiscCost());
      await page.waitForTimeout(200);

      const m = await page.evaluate(() => {
        const g = (id) => document.getElementById(id);
        const rows = [...document.querySelectorAll('#lines .bld-row')];
        return {
          pageShown: !g('builderPage').hidden,
          libraryHidden: g('tab-builder').style.display === 'none',
          navLit: !!document.querySelector('.navbtn[data-tab="builder"].active'),
          rowCount: rows.length,
          costRights: [...document.querySelectorAll('#lines .bld-lc')]
            .map((x) => Math.round(x.getBoundingClientRect().right)),
          overflow: rows.map((r) => Math.round(
            r.getBoundingClientRect().right - r.parentElement.getBoundingClientRect().right)),
          cardFigures: getComputedStyle(g('bCost').querySelector('.bld-kv')).display,
          barDisplay: getComputedStyle(g('bFootSum')).display,
          barWidth: Math.round(g('bFootSum').getBoundingClientRect().width),
          headActions: [...document.querySelectorAll('.bld-head button')]
            .filter((b) => b.id !== 'builderClose' && getComputedStyle(b).display !== 'none').map((b) => b.id),
          scrollW: document.scrollingElement.scrollWidth,
        };
      });

      expect(m.pageShown, 'the builder page is up').toBe(true);
      expect(m.libraryHidden, 'and the Plates library is behind it, not under it').toBe(true);
      expect(m.navLit, 'the Plates nav item stays lit — the builder is its child, not a sixth tab').toBe(true);

      expect(m.rowCount, 'an ingredient row and a misc row').toBe(2);
      const spread = Math.max(...m.costRights) - Math.min(...m.costRights);
      expect(spread, 'the cost column has ONE right edge down the whole table').toBeLessThanOrEqual(1);
      for (const o of m.overflow) expect(o, 'no row escapes the table').toBeLessThanOrEqual(0);

      /* §7 — the plate cost is printed once per width, and the two carriers swap over. */
      if (size.name === 'desktop') {
        expect(m.cardFigures, 'desktop: the Cost card carries the figures').not.toBe('none');
        expect(m.barDisplay, 'desktop: the phone summary bar is not drawn').toBe('none');
      } else {
        expect(m.cardFigures, 'phone: the card does not repeat what the bar says').toBe('none');
        expect(m.barDisplay, 'phone: the summary bar carries them').not.toBe('none');
        const frame = await fixedFrame(page);
        expect(m.barWidth, 'the bar spans the fixed frame').toBeCloseTo(frame, 0);
        /* §6: one action in the mobile header. Save is it — Duplicate is in the rail precisely so
           this stays true, and a second header button here is the deviation that item exists for. */
        expect(m.headActions, 'exactly one action in the mobile header').toEqual(['saveBtn']);
      }

      expect(m.scrollW, 'no horizontal scroll').toBeLessThanOrEqual(size.width);
      expect(errs, errs.join(' | ')).toHaveLength(0);
      await page.screenshot({
        path: `tests/visual/__shots__/v146-builder-${size.name}-${theme}.png`, fullPage: true,
      });
    });
  }
}

test('an unpublished plate shows NO food-cost pill — absent, not zeroed', async ({ page }) => {
  await openOn(page, 1, { width: 1280, height: 900, theme: 'light' });   // PL2, on no menu
  const state = await page.evaluate(() => {
    const p = document.getElementById('bldPill');
    return {
      attr: p.hidden,
      display: getComputedStyle(p).display,
      box: p.getBoundingClientRect().width,
      menus: document.getElementById('bMenus').style.display,
      pub: document.getElementById('bPublish').textContent,
    };
  });
  /* There is no price anywhere for this plate, so there is no food cost. A pill reading "0%"
     would be a figure the app invented — the money law's whole point.
     ⚠️ THE COMPUTED STYLE IS THE ASSERTION, not `.hidden`. The first cut of this test read the DOM
     property, which reflects only the attribute — and the F7 pre-push review found the CSS
     rendering the chip anyway, because a bare author `display` rule beats the UA's `[hidden]` on
     ORIGIN. The test passed while an empty coloured pill shipped in the header of every new plate.
     A property check here is a test that cannot fail against the thing it claims to pin. */
  expect(state.attr, 'the renderer hides it').toBe(true);
  expect(state.display, 'and the CSS agrees — `.bld-pill:not([hidden])` is what makes it so').toBe('none');
  expect(state.box, 'nothing is painted').toBe(0);
  expect(state.menus, 'and no On-menus list').toBe('none');
  expect(state.pub, 'the Publishing card offers the way out').toMatch(/Add to a menu/);
});

test('leaving by tapping another tab hides the page and keeps the work', async ({ page }) => {
  await openOn(page, 0, { width: 1280, height: 900, theme: 'light' });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#builderPage')).toBeHidden();
  /* Nothing is lost: this is exactly what pressing × did from v54 to v145. The plate is still in
     memory, so the unfinished-plate guard has something to offer back. */
  const stillLoaded = await page.evaluate(() => window.loadedPlateId || document.getElementById('plateName').value);
  expect(stillLoaded, 'the plate is still loaded behind the scenes').toBeTruthy();
});

test('focus is carried into the builder page and handed back on the way out', async ({ page }) => {
  /* Found by the F7 pre-push review, measuring document.activeElement in a real browser: both
     directions landed on <body>. Every overlay in this app gets this free from
     openOverlay/closeOverlay; a page is not an overlay, so the rewrite dropped it silently and a
     keyboard or screen-reader user was stranded at the top of the document on every entry and
     exit. The opener's own pane is one of the five openBuilder hides, which is WHY focus is lost
     and why the opener has to be captured before the hiding, not after. */
  await openOn(page, 0, { width: 1280, height: 900, theme: 'light' });

  const inside = await page.evaluate(() => ({
    tag: document.activeElement && document.activeElement.tagName,
    id: document.activeElement && document.activeElement.id,
    onPage: !!(document.activeElement && document.getElementById('builderPage').contains(document.activeElement)),
  }));
  expect(inside.onPage, `focus must land on the page, not on ${inside.tag}#${inside.id}`).toBe(true);

  await page.evaluate(() => window.closeBuilder());
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({
    tag: document.activeElement && document.activeElement.tagName,
    id: document.activeElement && document.activeElement.id,
    body: document.activeElement === document.body,
  }));
  /* The opener was a Plates row, which the save/close re-render replaces, so the honest fallback
     is the control that gets you back in — never <body>. */
  expect(after.body, `focus was dropped on the way out (landed on ${after.tag}#${after.id})`).toBe(false);
});
