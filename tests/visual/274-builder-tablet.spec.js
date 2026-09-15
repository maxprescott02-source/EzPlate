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
 *  1. WHEREVER THE RAIL WRAPS, A COMMIT CONTROL IS ON SCREEN — swept across 900-1200 rather than
 *     asserted at a named width. This started life as "wrapped at 1075, side by side at 1076" and CI
 *     failed it while macOS passed: the wrap depends on the SCROLLBAR as well as the viewport, so the
 *     number is not a property of the app. The header block above that test carries the full story,
 *     including why the media query built on that number was itself wrong and not just the test.
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

/* ⚠️ THIS TEST ASSERTED THE WRAP POINT AS A NUMBER — "wrapped at 1075, side by side at 1076" — AND
   CI FAILED IT WHILE MACOS PASSED. The wrap happens where `.bld-body`'s inner width reaches 800, and
   that width depends on the SCROLLBAR as well as the viewport: overlay scrollbars here, a classic one
   on the Linux runner, so the same 1076 is two-column on one and still wrapped on the other. Roster
   entry 270: the only thing that finds an environment-dependent assertion is a different environment,
   and `.claude/rules/tests.md` already says a viewport-geometry assertion must MEASURE its reference
   rather than name it.
   ⚠️ AND THE NUMBER WAS NOT JUST A BAD ASSERTION, IT WAS A BAD RULE. A media query pinned one past
   the measured wrap leaves any environment with a wider scrollbar a band where the query says
   "two-column", the bar is hidden and #saveBtn is restored — to a rail that is still under the
   docket. A width with no reachable commit, which is the defect this batch removes.
   So the property replaces the number, and it is the property that actually matters: **wherever the
   rail wraps, there is a commit control on screen.** That is true in every environment, at every
   scrollbar width, and it cannot be satisfied by three media queries agreeing with each other. */
test('1: wherever the rail wraps, a commit control is on screen — swept, not named', async ({ page }) => {
  await openPlate(page, 900);
  const sweep = [];
  for (let w = 900; w <= 1200; w += 20) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(120);
    sweep.push(await page.evaluate((width) => {
      const m = document.querySelector('.bld-main').getBoundingClientRect();
      const r = document.querySelector('.bld-rail').getBoundingClientRect();
      const bar = document.querySelector('.bld-bar').getBoundingClientRect();
      const btn = document.getElementById('saveBtn').getBoundingClientRect();
      const on = (x) => x.width > 0 && x.height > 0;
      return {
        width,
        wrapped: r.top >= m.bottom - 4,
        barOn: on(bar) && bar.bottom <= innerHeight + 1,
        railSaveOn: on(btn) && btn.bottom <= innerHeight,
      };
    }, w));
  }

  // the control: the sweep must actually cross the boundary, or it proves nothing.
  expect(sweep.some((s) => s.wrapped), 'precondition: no wrapped width in the sweep').toBe(true);
  expect(sweep.some((s) => !s.wrapped), 'precondition: no two-column width in the sweep').toBe(true);

  for (const s of sweep) {
    if (s.wrapped) {
      expect(s.barOn,
        `at ${s.width} the rail is wrapped, so its Save is below a full-height docket — the sticky bar must be on screen`).toBe(true);
    }
    expect(s.barOn && s.railSaveOn,
      `at ${s.width} both the sticky bar and the rail's Save are on screen — two primary CTAs (§7)`).toBe(false);
    expect(s.barOn || s.railSaveOn,
      `at ${s.width} there is NO commit control on screen at all`).toBe(true);
  }
});

for (const width of [768, 900, 1024, 1060]) {
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

for (const width of [1100, 1200, 1360]) {
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

for (const width of [900, 1100, 1360]) {
  test(`5+7: at ${width} the qty inputs share one edge and the band matches the rows`, async ({ page }) => {
    await openPlate(page, width);
    const m = await page.evaluate(geom);
    expect(Math.max(...m.qtyLefts) - Math.min(...m.qtyLefts),
      `the qty inputs sit on left edges ${m.qtyLefts.join(', ')} — the unit noun after the input decides the position, so a docket mixing units staggers them. 1px of sub-pixel rounding is tolerated; the defect was 23px.`).toBeLessThanOrEqual(1);
    expect(m.rowCols, 'the band and the rows are separate grids and only line up while these strings match').toBe(m.bandCols);
  });
}

/* ⚠️ THIS RAN AT 1024 ONLY, AND THAT IS WHY IT DID NOT CATCH THE DEFECT ITS OWN BATCH SHIPPED.
   The nav is a left rail from **640**, not from 1024: 78px wide at 640-1023 and 224px from 1024. The
   first cut of this spec asserted the bar's left edge at the one width that already had a rule, so
   13/13 was green while the bar sat under the 78px rail at every width from 640 to 1023 - and, as it
   turned out, had been doing so on `main` at 640-767 all along.
   The lesson is the fixture's, not the assertion's: a spec that checks the boundary it just wrote a
   rule for has checked its own work. Run it at every width the ELEMENT can appear at. */
for (const width of [640, 768, 900, 1023, 1024, 1060]) {
  test(`6: at ${width} the save bar clears the nav rail rather than sitting under it`, async ({ page }) => {
    await openPlate(page, width);
    const m = await page.evaluate(() => {
    /* `.bld-bar` is the BAR; `#bldSaveBar` is the Save button inside it, which the stylesheet's own
       comment says must not be the same element. The left edge belongs to the bar. */
    const bar = document.querySelector('.bld-bar').getBoundingClientRect();
      /* the nav is ONE element that becomes a left rail — discriminated by ORIENTATION rather than
         by width, per `.claude/rules/tests.md`: a left rail is taller than it is wide, and comparing
         its width against the viewport misfires (`.bottomnav` measures 370 at a 380 viewport). */
      const cands = [...document.querySelectorAll('nav, .bottomnav, .sidebar')]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > r.width);
      const figs = document.querySelector('.bfs-figs');
      return {
        barLeft: Math.round(bar.left), barBottom: Math.round(bar.bottom),
        barPainted: bar.width > 0 && bar.height > 0,
        rail: cands.length ? Math.round(cands[0].right) : null,
        figLeft: figs ? Math.round(figs.getBoundingClientRect().left) : null,
      };
    });

    expect(m.barPainted, 'precondition: the bar is not painted at this width, so this measures nothing').toBe(true);
    expect(m.rail, 'precondition: no left rail found, so this test measures nothing').not.toBeNull();
    expect(m.barLeft,
      'the bar is position:fixed;left:0 by default, so it runs under the nav rail — 78px of it at 640-1023, 224px from 1024').toBe(m.rail);
    /* and the consequence, asserted separately from the cause: the figures are what the collision
       actually swallowed, at x=16 inside a 78px rail. A left edge can be right while the content
       inside it is not, and this is the half a user would have reported. */
    expect(m.figLeft, 'the bar\'s figures must start clear of the rail').toBeGreaterThanOrEqual(m.rail);
    expect(m.barBottom, 'and it must dock on the viewport floor, not against a bottom nav that is not there').toBeLessThanOrEqual(801);
  });
}
