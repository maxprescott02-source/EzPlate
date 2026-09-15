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
 * ⚠️ AND THE PHONE ASSERTION IS ABOUT A MOVE THAT WAS DELIBERATELY NOT MADE. Item 47 asked for the
 * button to move into the docket masthead. It did not, for a measured reason: below 768 `.bld-actrow`
 * is the ONLY thing #bCost still shows (`#bCost .bld-sumhead, .bld-kv, > #saveBtn, > #saveHint` are
 * all `display:none` there, and `.is-bare` hides the body), so moving Clear out leaves a bordered
 * card containing one button. A later batch reading the queue item would have no way to know that
 * without re-measuring, which is what this assertion is for.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_king', JSON.stringify([{ kid: 1, name: 'Chips', pid: 'P_CHIPS' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish and chips', lines: [{ kid: 1, qty: 200 }], category: 'Mains' },
  ]));
};

/* A SAVED plate is the precondition, not a convenience: #bldDelete is `hidden` until
   `loadedPlateId` is set (syncBuilderPlateActions), so on a fresh builder there is no second red
   verb to collide with and the spec would measure nothing. Opening the library row is the real
   gesture that gets there. */
async function openSavedPlate(page, theme) {
  await installBoot(page);
  await page.addInitScript(SEED);
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

test('at 380 the discard is still in the summary card\'s action row, which is all that card shows', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await openSavedPlate(page, 'light');

  const m = await page.evaluate(() => {
    const cb = document.getElementById('clearBtn');
    const row = cb.closest('.bld-actrow');
    const card = document.getElementById('bCost');
    const painted = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    return {
      inRow: !!row,
      rowInCard: !!(row && card && card.contains(row)),
      clearPainted: painted(cb),
      // everything else #bCost holds, at this width: if any of these came back the card is no
      // longer one row and the reason for not moving the button has changed.
      othersPainted: ['bTotal', 'bSuggest', 'saveBtn'].filter((id) => {
        const el = document.getElementById(id); return el && painted(el);
      }),
    };
  });

  expect(m.inRow, '#clearBtn left .bld-actrow').toBe(true);
  expect(m.rowInCard, '.bld-actrow left #bCost').toBe(true);
  expect(m.clearPainted, 'the discard is not reachable on a phone').toBe(true);
  expect(m.othersPainted,
    'the reason #clearBtn stays put is that this row is all #bCost shows below 768 — re-measure before moving it').toEqual([]);
});
