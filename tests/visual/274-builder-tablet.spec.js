/*
 * 274-builder-tablet.spec.js (queue item 49) — THE BUILDER FROM 768 TO 1360, MEASURED.
 *
 * ⚠️ THIS IS A NEW SPEC, NOT AN EXTENSION, AND THE ITEM SAID OTHERWISE. Item 49's test line reads
 * "Extends `v190-tablet-band.spec.js` upward". That spec pins the 768-1023 band on the Menu,
 * Ingredients and Products TABLES (`.mnu-band`, `.king-band`, `.ing-band`) and contains no `.bld-*`
 * assertion of any kind, so there was nothing to extend. Recorded because "extend" hid the size of
 * the job, and the consolidated item now says so too.
 *
 * WHAT WAS WRONG, measured on the shipped build at an 800px-tall viewport with a five-line costed
 * plate — every figure here is a before-value this spec now forbids:
 *
 *   width   empty space right of the wrapped rail   name track   save control on screen
 *   768     290px                                   178px        none
 *   900     360px                                   248px        none
 *   1024    428px  (larger than the 340px rail)     316px        none
 *   1100    -                                       70px, and "Mushrooms Sliced" CLIPPED
 *
 * and the qty inputs sat on three different left edges (363 / 378 / 386 at 1100), because
 * `.bld-qty` packs right and the unit noun after the input is "g", "ml" or the WORD "unit".
 *
 * WHY EACH ASSERTION IS A REGRESSION AND NOT A DESCRIPTION:
 *
 *  1. THE WRAP POINT, FROM BOTH SIDES. 1076 is not a chosen number: it is where `.bld-body`'s inner
 *     width reaches 800 = `.bld-main`'s 500 basis + the rail's 280 + the 20px gap. It is therefore
 *     COUPLED to the sidebar's 224px, and nothing in CSS can notice that moving — the three media
 *     queries this batch added would just be silently wrong at the wrong widths. Asserting 1075
 *     wrapped AND 1076 side by side is the only thing that catches it, and it is why both halves are
 *     here rather than one.
 *  2. THE WRAPPED RAIL FILLS ITS ROW. Written as "the space to its right is no wider than the gap",
 *     which is the item's own acceptance wording, rather than as "max-width is none" — a selector
 *     assertion passes on a rule that some later specificity fight overrides.
 *  3. THE NAME IS NOT CLIPPED. Asserted as `scrollWidth <= clientWidth`, the browser's own answer,
 *     plus the 140px floor. Roster 190: the equality is the weight, the negative names the defect.
 *  4. EXACTLY ONE COMMIT CONTROL, AND IT IS ON SCREEN. Both halves matter and they are a pair the
 *     stylesheet states in as many words: both visible is two primary CTAs (§7), both hidden is no
 *     way to save at all, which is what the band actually had.
 *  5. THE QTY INPUTS SHARE ONE EDGE.
 *  6. THE SAVE BAR CLEARS THE SIDEBAR. Asserted as bar.left === sidebar.right, which pins the
 *     RELATIONSHIP rather than the 224px literal the stylesheet had to duplicate.
 *  7. THE BAND AND THE ROWS USE THE SAME TEMPLATE. They are separate grids; the columns line up only
 *     because the two strings match, and nothing else would notice them diverging.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

/* A mix of gram-priced and each-priced products is the fixture, not a detail: `unitNoun` returns the
   WORD "unit" for anything that is not g or ml, and a docket of one unit kind cannot show the
   stagger assertion 5 exists for. `.claude/rules/tests.md` roster 184(b): a fixture whose fields
   agree cannot tell you which one the code read. */
const KING = [
  { id: 1, name: 'Mushrooms Sliced', pid: 'P0200' },
  { id: 2, name: 'Bacon Middle Rindless', pid: 'P0004' },
  { id: 3, name: 'Bags Garbage Prem', pid: 'P0005' },
  { id: 4, name: 'Milk Full Cream', pid: 'P0100' },
];

const SEED = (king) => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_king', JSON.stringify(king));
  localStorage.setItem('cafeDB_plates', JSON.stringify([{
    id: 'PL1', name: 'Big Breakfast', category: 'Mains',
    lines: king.map((k) => ({ kid: k.id, qty: 120 })),
  }]));
};

async function openPlate(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await installBoot(page);
  await page.addInitScript(SEED, KING);
  await page.goto('/');
  await gotoTab(page, 'builder');
  await page.locator('#plateList .plib-row').first().click();
  await expect(page.locator('#lines .bld-row').first()).toBeVisible();
}

const geom = () => ({
  wrapped: (() => {
    const m = document.querySelector('.bld-main').getBoundingClientRect();
    const r = document.querySelector('.bld-rail').getBoundingClientRect();
    return r.top >= m.bottom - 4;
  })(),
  bodyRight: Math.round(document.querySelector('.bld-body').getBoundingClientRect().right),
  railRight: Math.round(document.querySelector('.bld-rail').getBoundingClientRect().right),
  gap: Math.round(parseFloat(getComputedStyle(document.querySelector('.bld-body')).columnGap)),
  bandCols: getComputedStyle(document.querySelector('.bld-band')).gridTemplateColumns,
  rowCols: getComputedStyle(document.querySelector('#lines .bld-row')).gridTemplateColumns,
  names: [...document.querySelectorAll('#lines .bld-ing b')].map((b) => ({
    text: b.textContent.trim(),
    w: Math.round(b.getBoundingClientRect().width),
    clipped: b.scrollWidth > b.clientWidth + 1,
  })),
  nouns: [...document.querySelectorAll('#lines .bld-u')].map((u) => ({
    text: u.textContent.trim(), clipped: u.scrollWidth > u.clientWidth + 1,
  })),
  qtyLefts: [...new Set([...document.querySelectorAll('#lines .bld-qty input')]
    .map((i) => Math.round(i.getBoundingClientRect().x)))],
  painted: (id) => {
    const el = document.getElementById(id); if (!el) return false;
    const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  },
});

test('1: the wrap point is 1076, asserted from both sides because it is coupled to the sidebar', async ({ page }) => {
  await openPlate(page, 1075);
  expect(await page.evaluate(() => {
    const m = document.querySelector('.bld-main').getBoundingClientRect();
    const r = document.querySelector('.bld-rail').getBoundingClientRect();
    return r.top >= m.bottom - 4;
  }), 'at 1075 the rail must still wrap under the docket').toBe(true);

  await page.setViewportSize({ width: 1076, height: 800 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => {
    const m = document.querySelector('.bld-main').getBoundingClientRect();
    const r = document.querySelector('.bld-rail').getBoundingClientRect();
    return r.top >= m.bottom - 4;
  }), 'at 1076 the rail must sit beside the docket — if this moved, the sidebar width changed and the three media queries in css/style.css are now wrong').toBe(false);
});

for (const width of [768, 900, 1024, 1075]) {
  test(`2+4: at ${width} the wrapped rail fills its row and exactly one commit control is on screen`, async ({ page }) => {
    await openPlate(page, width);
    const m = await page.evaluate(geom);

    expect(m.wrapped, 'precondition: this width is meant to be in the wrapped band').toBe(true);
    // 2 — it was 290 / 360 / 428px of nothing here, more empty space than rail at 1024.
    expect(m.bodyRight - m.railRight,
      'the wrapped rail must fill its row: nothing wider than the flex gap may sit beside it').toBeLessThanOrEqual(m.gap + 1);

    // 4 — the pair. Both visible is two primaries (§7); both hidden is what this band actually had.
    const bar = await page.evaluate(() => {
      const el = document.getElementById('bldSaveBar'); if (!el) return null;
      const r = el.getBoundingClientRect();
      return { painted: r.width > 0 && r.height > 0, top: Math.round(r.top), bottom: Math.round(r.bottom) };
    });
    const railSave = await page.evaluate(() => {
      const el = document.getElementById('saveBtn'); if (!el) return false;
      const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    expect(bar && bar.painted, 'the sticky save bar is the only reachable commit in this band').toBe(true);
    expect(railSave, 'the rail\'s Save must be hidden here, or the screen has two primary CTAs').toBe(false);
    expect(bar.bottom, 'the bar is the commit control only if it is actually on screen').toBeLessThanOrEqual(801);
  });
}

for (const width of [1076, 1100, 1200, 1360]) {
  test(`3: at ${width} the ingredient name and the unit noun are whole`, async ({ page }) => {
    await openPlate(page, width);
    const m = await page.evaluate(geom);

    expect(m.wrapped, 'precondition: this width is meant to be two-column').toBe(false);
    expect(m.names.length, 'precondition: the fixture did not render its rows').toBe(4);

    const nameTrack = parseFloat(m.rowCols.split(' ')[0]);
    expect(nameTrack, 'the name track floor is 140 and it read 70 before this').toBeGreaterThanOrEqual(139.5);
    for (const n of m.names) {
      expect(n.clipped, `"${n.text}" is clipped — the name is what the row is for`).toBe(false);
    }
    /* the unit noun is the other half, and the first attempt at this fix CAUSED this failure by
       giving `.bld-u` a min-width under "unit"'s natural width. */
    for (const u of m.nouns) {
      expect(u.clipped, `the unit noun "${u.text}" is clipped`).toBe(false);
    }
  });
}

for (const width of [900, 1076, 1360]) {
  test(`5+7: at ${width} the qty inputs share one edge and the band matches the rows`, async ({ page }) => {
    await openPlate(page, width);
    const m = await page.evaluate(geom);
    expect(m.qtyLefts.length,
      `the qty inputs sit on ${m.qtyLefts.length} different left edges (${m.qtyLefts.join(', ')}) — the unit noun after the input decides the position, so a docket mixing units staggers them`).toBe(1);
    expect(m.rowCols, 'the band and the rows are separate grids and only line up while these strings match').toBe(m.bandCols);
  });
}

test('6: from 1024 to 1075 the save bar starts at the sidebar\'s right edge, not under it', async ({ page }) => {
  await openPlate(page, 1024);
  const m = await page.evaluate(() => {
    /* `.bld-bar` is the BAR; `#bldSaveBar` is the Save button inside it, which the stylesheet's own
       comment says must not be the same element. The left edge belongs to the bar. */
    const bar = document.querySelector('.bld-bar').getBoundingClientRect();
    /* the sidebar is the bottom nav element promoted to a left rail at 1024 — discriminated by
       ORIENTATION rather than by width, per `.claude/rules/tests.md`: a left rail is taller than it
       is wide, and comparing its width against the viewport misfires. */
    const cands = [...document.querySelectorAll('nav, .bottomnav, .sidebar')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > r.width);
    return { barLeft: Math.round(bar.left), barBottom: Math.round(bar.bottom), rail: cands.length ? Math.round(cands[0].right) : null };
  });
  expect(m.rail, 'precondition: no left rail found at 1024, so this test measures nothing').not.toBeNull();
  expect(m.barLeft,
    'the bar is position:fixed;left:0 by default, which runs it under the sidebar').toBe(m.rail);
  expect(m.barBottom, 'and it docks against a bottom nav that does not exist at this width').toBeLessThanOrEqual(801);
});
