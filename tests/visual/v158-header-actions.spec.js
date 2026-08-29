/*
 * v158-header-actions.spec.js — 179. The mobile header keeps ONE action, and the second one lands
 * in the control row beneath it.
 *
 * WHY A BROWSER. Every claim here is a computed one. Whether a header is one row or two is decided
 * by flex wrapping, which nothing in the CSS states; whether the rehome happens at all is decided by
 * matchMedia, which only answers honestly in a real viewport; and whether the action survives the
 * empty state is decided by a `:not()` selector out-specifying two others, which CLAUDE.md records
 * as the exact thing that cannot be settled by reading.
 *
 * THE MEASUREMENT IS A WRAP, NOT A POSITION — the queue item says so, and v151-more.spec.js is the
 * method it points at: compare the TOPS of the header's visible, non-zero-height children. Asserting
 * coordinates instead would pin this fix to one label's pixel width and go red on a copy change.
 * `.scr-gap` is why the zero-height filter is load-bearing: it is an empty flex spacer, so its rect
 * is a zero-height line that overlaps nothing and reports "wrapped" on a header that is visibly one
 * row.
 *
 * ⚠️ #kingWizBtn IS FORCED VISIBLE, and that is the whole reason the suite could not see this
 * defect. It is conditional — renderKingProgress shows it only when there are unlinked linkable
 * products — and the fixture does not produce that state, while Scoopy's catalogue of hundreds of
 * unlinked products always does. So the measured wrap on Max's phone was invisible to a green suite.
 *
 * 360 IS A SUPPORTED WIDTH AS OF THIS BATCH (Max, 12 Aug 2026, docs/decisions/2026-08-12.md §1:
 * "yes it should be"). v151-more.spec.js excluded it deliberately and said why; that exclusion is
 * spent, and this file plus the three specs the queue item names are where it is now pinned.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

/* tab key -> the row that hosts its second action below 768. The pairing lives in `data-mobile-home`
   in index.html; this restates it so a screen wired to the wrong row is a red test and not a shrug. */
const SCREENS = [
  { key: 'pantry', title: 'Ingredients', action: 'kingWizBtn', home: 'kingControls' },
  { key: 'ingredients', title: 'Products', action: 'importBtn', home: 'ingControls' },
  { key: 'analysis', title: 'Menu', action: 'menuAddDishBtn', home: 'menuSwitchRow' },
];

/* ⚠️ THE SEED IS LOAD-BEARING SINCE 214, AND IT IS THE PRECONDITION RATHER THAN DECORATION.
   This file is about WHERE a rehomed action sits and whether it still works from there. It is not
   about whether the action is OFFERED — but as of 214 the Menu screen hides `#menuAddDishBtn`
   unless there is a menu to add to and a costed plate to add, because a button whose modal can only
   say "No costed plates found" is a dead control.
   With no seed at all this file booted into a café with zero menus and zero plates, so the button
   was correctly absent and every assertion about its placement failed. The fix is to seed the state
   the assertions are ABOUT; weakening them to tolerate an absent button would delete the only
   coverage the rehoming has.
   **If you remove this seed, three assertions in this file stop meaning anything.** */
const SEED = () => {
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, label: 'Chips', cost: 6.5 }] },
  ]));
};

async function boot(page, w, h) {
  await page.setViewportSize({ width: w, height: h || 844 });
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1200);
  // fixed-position chrome that intercepts clicks in this harness (the same removal v151 does)
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

/* The conditional button, forced on AFTER the screen has rendered — renderKingProgress runs during
   showTab and would otherwise put it straight back to display:none. */
async function forceWizard(page) {
  await page.evaluate(() => {
    const w = document.getElementById('kingWizBtn');
    if (w) w.style.display = '';
  });
  await page.waitForTimeout(100);
}

async function headerRows(page, key) {
  return page.evaluate((k) => {
    const head = document.querySelector(`#tab-${k} .scr-head`);
    const rects = [...head.children]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .map((e) => e.getBoundingClientRect())
      .filter((r) => r.height > 0);
    const lo = Math.max(...rects.map((r) => r.top)), hi = Math.min(...rects.map((r) => r.bottom));
    return {
      oneRow: lo < hi,
      n: rects.length,
      height: Math.round(head.getBoundingClientRect().height),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  }, key);
}

/* THE DEFECT THIS ITEM EXISTS FOR. Measured on `main` before this batch: Ingredients 121px tall at
   both 360 and 380 against the one-row 69, and Products 121 at 360. Three widths, three screens. */
for (const width of [360, 380, 430]) {
  test(`${width}: no converted screen header wraps, with the conditional action showing`, async ({ page }) => {
    await boot(page, width);
    for (const { key, title } of SCREENS) {
      await gotoTab(page, key);
      await forceWizard(page);
      const m = await headerRows(page, key);
      expect(m.n, `${title} header has children to measure`).toBeGreaterThan(1);
      expect(m.oneRow, `${title} header is ONE row at ${width}`).toBe(true);
      expect(m.overflowX, `${title} does not overflow horizontally at ${width}`).toBeLessThanOrEqual(0);
    }
  });
}

/* §6's rule itself, stated as a count rather than as a height — a header that measured one row
   while carrying two actions would still be the deviation the item was raised about. */
for (const width of [360, 380]) {
  test(`${width}: every converted header carries exactly ONE action (§6)`, async ({ page }) => {
    await boot(page, width);
    for (const { key, title, action, home } of SCREENS) {
      await gotoTab(page, key);
      await forceWizard(page);
      const m = await page.evaluate((k) => {
        const head = document.querySelector(`#tab-${k} .scr-head`);
        return {
          inHead: [...head.querySelectorAll('button')]
            .filter((b) => !b.classList.contains('scr-back'))   // the "‹ More" chevron is navigation, not an action
            .map((b) => b.id),
        };
      }, key);
      expect(m.inHead.length, `${title} header holds one action at ${width}`).toBe(1);
      expect(m.inHead[0], `${title}'s survivor is the PRIMARY`).not.toBe(action);
      // …and the secondary is in its named row, not merely gone
      expect(await page.evaluate((a) => document.getElementById(a).parentElement.id, action),
        `${title}'s secondary is rehomed`).toBe(home);
      await expect(page.locator(`#${action}`), `${title}'s secondary is still on screen`).toBeVisible();
    }
  });
}

/* THE ACTIONS STILL WORK AFTER BEING MOVED — the one risk that is not about layout at all, and the
   one a geometry assertion cannot see. `appendChild` MOVES a node rather than copying it, so
   addEventListener bindings ride along; but that is a claim about the DOM, and this batch is exactly
   the kind of change where "it must still be bound" is assumed and never driven. Each is TAPPED at
   its rehomed position and the thing it opens is asserted.
   The queue item's own requirement is that the secondary stays "reachable on a phone in one
   gesture", so this is also the assertion that requirement reduces to. */
test('380: each rehomed action still opens what it opened, in one tap', async ({ page }) => {
  await boot(page, 380);

  await gotoTab(page, 'ingredients');
  await page.locator('#importBtn').click();
  await expect(page.locator('#invModal'), 'Import invoice still opens the importer').toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  await gotoTab(page, 'analysis');
  await page.locator('#menuAddDishBtn').click();
  await expect(page.locator('#addDishModal'), 'Existing plate still opens the add-dish modal').toBeVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* The wizard is the conditional one, so it is forced visible the way the fixture cannot produce.
     Its handler is a TOGGLE, so the assertion is that the panel it renders into fills. */
  await gotoTab(page, 'pantry');
  await forceWizard(page);
  await page.locator('#kingWizBtn').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.getElementById('kingProgress').offsetParent !== null
    || document.getElementById('kingWizBtn').textContent.indexOf('Close') === 0),
  'Set up from products still toggles the wizard').toBe(true);
});

/* THE DESKTOP HALF IS UNCHANGED, and that is a requirement of the item rather than a side effect —
   the mock allows a desktop header to carry both. This is what would go red if the media query were
   widened, or if the restore put the button back in the wrong place or not at all. */
test('1280: both actions are back in the header, in their original order', async ({ page }) => {
  await boot(page, 1280, 900);
  for (const { key, title, action } of SCREENS) {
    await gotoTab(page, key);
    await forceWizard(page);
    const m = await page.evaluate(([k, a]) => {
      const head = document.querySelector(`#tab-${k} .scr-head`);
      const el = document.getElementById(a);
      const primary = head.querySelector('.btn.primary');
      return {
        parent: el.parentElement.className,
        // §6.1: the primary is rightmost, and the secondary is the sibling immediately before it
        nextIsPrimary: el.nextElementSibling === primary,
        primaryRightmost: primary.getBoundingClientRect().left > el.getBoundingClientRect().left,
      };
    }, [key, action]);
    expect(m.parent, `${title}'s secondary is back in the header bar`).toContain('scr-head');
    expect(m.nextIsPrimary, `${title} restores the EXACT slot, not "append and hope"`).toBe(true);
    expect(m.primaryRightmost, `${title} keeps the primary rightmost`).toBe(true);
  }
});

/* THE LIVE CROSSING. A phone rotated, a desktop window dragged narrow, the device toolbar toggled.
   No navigation happens, so nothing re-renders — the media query IS the event, and if the listener
   were missing this is the only thing that would show it. Both directions, because a one-way
   listener passes the mobile test and strands the button on the way back. */
test('crossing 767 live moves the action both ways without a re-render', async ({ page }) => {
  await boot(page, 1280, 900);
  await gotoTab(page, 'ingredients');
  const where = () => page.evaluate(() => document.getElementById('importBtn').parentElement.id
    || document.getElementById('importBtn').parentElement.className);
  expect(await where(), 'starts in the header').toContain('scr-head');
  await page.setViewportSize({ width: 380, height: 844 });
  await page.waitForTimeout(300);
  expect(await where(), 'narrowing rehomes it').toBe('ingControls');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  expect(await where(), 'and widening puts it back').toContain('scr-head');
});

/* THE EMPTY STATE, which is where a naive append would have deleted the action. All three rows are
   hidden at zero by their renderers, and that hide is about the FILTERS — "an option-less select is
   a control that does nothing". Once the row hosts an action the hide had to stop covering it, or a
   café with a full catalogue and no ingredients would lose the setup wizard on a phone at exactly
   the moment renderKitchenPanel's own comment calls it the moment the wizard matters.
   Driven at the Products screen because `noProducts` is the one true-empty state the shim can
   produce; the rule under test is one selector shared by all three rows. */
test('380: the empty state hides the FILTERS and keeps the rehomed action', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 844 });
  await installBoot(page, { noProducts: true });
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  await gotoTab(page, 'ingredients');
  await expect(page.locator('#ingList .empty-state, #ingList .es-row').first(), 'the true-empty state rendered').toBeVisible();
  await expect(page.locator('#importBtn'), 'the action survives the empty state').toBeVisible();
  const m = await page.evaluate(() => {
    const row = document.getElementById('ingControls');
    const vis = (s) => getComputedStyle(document.querySelector(s)).display;
    return {
      hosted: document.getElementById('importBtn').parentElement.id,
      search: vis('#ingControls .plib-search'),
      select: vis('#ingControls .plib-selwrap'),
      rowTop: Math.round(row.getBoundingClientRect().top),
      rowBottom: Math.round(row.getBoundingClientRect().bottom),
    };
  });
  expect(m.hosted, 'and it is in the row, not left in the header').toBe('ingControls');
  expect(m.search, 'the search is gone — there is nothing to search').toBe('none');
  expect(m.select, 'and so is the option-less filter').toBe('none');
  /* The row is exactly as tall as the one thing left in it: the padding is dropped with the
     filters, so nothing is left behind where `hidden` used to collapse the row to nothing. */
  const btn = await page.locator('#importBtn').boundingBox();
  expect(m.rowBottom - m.rowTop, 'the row collapses onto its one remaining child')
    .toBeLessThanOrEqual(Math.round(btn.height) + 2);
});
