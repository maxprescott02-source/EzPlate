/*
 * 273-builder-discard.spec.js (queue item 47's last bullet) — ONE RED VERB ON THE BUILDER, MEASURED.
 *
 * THE DEFECT, measured on the shipped build before this change, in Chromium, on a SAVED plate:
 * #clearBtn ("Clear plate") and #bldDelete ("Delete plate") computed the IDENTICAL colour —
 * rgb(192, 57, 47) in light and rgb(229, 135, 125) in dark — and at 1360x900 both were painted at
 * once, at y=279 and y=681. Two controls in one red and one `<verb> plate` grammar, meaning two
 * different things: the first empties the working builder and LEAVES THE SAVED PLATE ON THE SERVER,
 * the second destroys it.
 *
 * ⚠️ WHY THIS EXISTS BESIDE `tests/builder-discard.test.js` RATHER THAN INSTEAD OF IT. That file
 * reads the source: the label, the `danger` classes, and rules whose selector types "#clearBtn". It
 * cannot see a future `.bld-actrow .btn{color:var(--bad)}` — a selector that never names the button
 * — which would repaint it red with every source assertion still green. `.claude/rules/css.md` is
 * the whole file about rules that look right and do something else; the computed value is the only
 * form of this claim that can fail for every way of making it true.
 *
 * ⚠️ THE ASSERTIONS ARE EQUALITIES, NOT "not the red one". Roster entry 190: a Playwright spec
 * asserting a link was *not* the browser's default blue stayed green in dark mode, because the
 * denial named one wrong value out of two. So the weight here is on two positives —
 *   #bldDelete  === the --bad token, resolved from the live document;
 *   #clearBtn   === #printBtn, the plain neutral button sitting beside it in the same row
 * — and the inequality is kept only for the failure message, which names the defect better than
 * either equality does.
 *
 * ⚠️ AND THE PHONE ASSERTIONS ARE ABOUT A MOVE THAT WAS DELIBERATELY NOT MADE. Item 47 asked for the
 * button to move into the docket masthead; it did not, and a later batch reading that item needs to
 * know what it would be spending.
 *
 * ⚠️ THE FIRST DRAFT OF THIS FILE GOT THAT REASON WRONG, AND THE WRONGNESS IS WHY THE PHONE TEST IS
 * A TABLE RATHER THAN ONE CASE. It asserted, in its title, that `.bld-actrow` is "all that card
 * shows" below 768 — measured, correctly, against a seed whose plate was on NO menu, and stated as a
 * fact about the screen. 273's pre-push review traced the actual CSS and found it false for any
 * PUBLISHED plate: `.is-bare` (and with it `#bCost .bld-cardbody{display:none}`) is set from
 * `on.length===0`, so a plate on one menu keeps #bPriceRow in the body and a plate on two keeps
 * #bMenus. Re-measured at 380 across all three: **card height 60 / 127 / 164px** for 0 / 1 / 2 menus.
 * The give-away was in the stylesheet the whole time — the same media block sets
 * `#bCost .bld-menus{border-top:0;padding-top:0}`, which is only worth writing if that list renders
 * at this width.
 * So the table below pins what is ACTUALLY true at every menu count — the discard is in the row, in
 * the card, and painted — and pins the bare-card case as the one state it holds in, by its condition
 * rather than by its name. `.claude/rules/app-guards.md`: an exemption is scoped to the claim that
 * justified it, and here the claim was a single fixture.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

/* `dishes` is what publishes the plate, and it is a PARAMETER rather than a constant because the
   number of menus is the variable the first draft of this file held fixed without noticing. */
const SEED = (dishes) => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_WINTER', name: 'Winter Menu' }, { id: 'MENU_SUMMER', name: 'Summer Menu' },
  ]));
  localStorage.setItem('cafeDB_king', JSON.stringify([{ kid: 1, name: 'Chips', pid: 'P_CHIPS' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish and chips', lines: [{ kid: 1, qty: 200 }], category: 'Mains' },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify(dishes));
};

const DISH = (id, menuId, price) => ({ id, menuId, name: 'Fish and chips', price, plateId: 'PL1', sourcePlateId: 'PL1' });
const MENU_COUNTS = [
  { menus: 0, dishes: [], bare: true },
  { menus: 1, dishes: [DISH('MI1', 'MENU_WINTER', 24)], bare: false },
  { menus: 2, dishes: [DISH('MI1', 'MENU_WINTER', 24), DISH('MI2', 'MENU_SUMMER', 26)], bare: false },
];

/* A SAVED plate is the precondition, not a convenience: #bldDelete is `hidden` until
   `loadedPlateId` is set (syncBuilderPlateActions), so on a fresh builder there is no second red
   verb to collide with and the spec would measure nothing. Opening the library row is the real
   gesture that gets there. */
async function openSavedPlate(page, theme, dishes = []) {
  await installBoot(page);
  await page.addInitScript(SEED, dishes);
  await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
  await page.goto('/');
  await gotoTab(page, 'builder');
  await page.locator('#plateList .plib-row').first().click();
  await expect(page.locator('#bldDelete')).toBeVisible();
}

for (const theme of ['light', 'dark']) {
  test(`the builder's two verbs do not share the destructive colour (${theme}, 1360)`, async ({ page }) => {
    await page.setViewportSize({ width: 1360, height: 900 });
    await openSavedPlate(page, theme);

    const m = await page.evaluate(() => {
      const paint = (id) => getComputedStyle(document.getElementById(id)).color;
      /* the token resolved through a real element, not parsed out of the stylesheet: --bad is
         redefined per theme and this has to read whichever one is live. */
      const probe = document.createElement('span');
      probe.style.color = 'var(--bad)';
      document.body.appendChild(probe);
      const bad = getComputedStyle(probe).color;
      probe.remove();
      const box = (id) => { const r = document.getElementById(id).getBoundingClientRect(); return { y: Math.round(r.y), h: Math.round(r.height) }; };
      return {
        bad,
        clear: paint('clearBtn'), print: paint('printBtn'), del: paint('bldDelete'),
        clearBox: box('clearBtn'), delBox: box('bldDelete'),
        clearText: document.getElementById('clearBtn').textContent.trim(),
      };
    });

    // the control: this spec is worth nothing unless both verbs really are on screen together,
    // which is the condition that made them confusable in the first place.
    expect(m.clearBox.h, 'precondition: the discard is not painted').toBeGreaterThan(0);
    expect(m.delBox.h, 'precondition: Delete plate is not painted').toBeGreaterThan(0);
    expect(m.delBox.y, 'precondition: the two verbs are no longer both in a 900px viewport').toBeLessThan(900);

    expect(m.del, 'Delete plate must keep the destructive colour — it is the one that destroys a plate').toBe(m.bad);
    expect(m.clear, 'the discard wears the same plain treatment as Print docket beside it').toBe(m.print);
    expect(m.clear, 'the discard must not wear the destructive colour: the saved plate survives it').not.toBe(m.bad);
    expect(m.clearText).toBe('Start over');
  });
}

for (const c of MENU_COUNTS) {
  test(`at 380 the discard is in the summary card's action row, with the plate on ${c.menus} menu(s)`, async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 900 });
    await openSavedPlate(page, 'light', c.dishes);

    const m = await page.evaluate(() => {
      const cb = document.getElementById('clearBtn');
      const row = cb.closest('.bld-actrow');
      const card = document.getElementById('bCost');
      const painted = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      return {
        inRow: !!row,
        rowInCard: !!(row && card && card.contains(row)),
        clearPainted: painted(cb),
        bare: card.classList.contains('is-bare'),
        bodyPainted: painted(card.querySelector('.bld-cardbody')),
        /* the three the @media block hides at this width REGARDLESS of `.is-bare`. They are the
           part of the old one-case claim that really was general, so they stay asserted. */
        hiddenAtThisWidth: ['bTotal', 'bSuggest', 'saveBtn'].filter((id) => painted(document.getElementById(id))),
      };
    });

    expect(m.inRow, '#clearBtn left .bld-actrow').toBe(true);
    expect(m.rowInCard, '.bld-actrow left #bCost').toBe(true);
    expect(m.clearPainted, 'the discard is not reachable on a phone').toBe(true);
    expect(m.hiddenAtThisWidth,
      'the figures and Save are hidden below 768 at every menu count — the phone reads them from the sticky bar').toEqual([]);

    /* AND THE CONDITIONAL HALF, stated as the condition rather than as a fact about the screen:
       the card is down to its action row ONLY when the plate is on no menu. A published plate keeps
       #bPriceRow or #bMenus in the body. This is the assertion the pre-push review's finding
       produced, and it is what a later batch should read before believing that moving #clearBtn
       out of this row would leave a card with one button in it. */
    expect(m.bare, `.is-bare is set from on.length===0, and this plate is on ${c.menus}`).toBe(c.bare);
    expect(m.bodyPainted, c.bare
      ? 'on no menu the body is hidden, so the action row really is all the card holds'
      : 'on a menu the body stays and carries the price row or the menu list beside the action row').toBe(!c.bare);
  });
}
