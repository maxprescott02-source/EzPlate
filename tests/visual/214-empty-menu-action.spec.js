/*
 * 214-empty-menu-action.spec.js — `docs/QUEUE.md` item 6, first half: the Menu screen offered
 * "Existing plate" before there was any plate to add.
 *
 * WHY IT MATTERED. At zero costed plates the button sat in the Menu header — and below 768 it moves
 * into `#menuSwitchRow` (`data-mobile-home`), where it wrapped onto its own row and read as an
 * orphan — and opened a modal whose entire content was "No costed plates found. Build and save a
 * plate first." §4's definition of done says a first-run state carries no dead control, and a
 * control that can only ever explain why it is useless is one.
 *
 * WHAT IS ACTUALLY PINNED, and it is not "the button is hidden". It is that the BUTTON and the
 * MODAL cannot disagree, because a second definition of "is there anything to add" would be a stub
 * of `eligibleDishes()` and would agree with it right until it did not. So the test drives both
 * states and checks the pair each time: hidden exactly when the picker would be empty, shown exactly
 * when it would not.
 *
 * Both widths, because the button lives in two different parents at 380 and 1280 and `hidden` has to
 * survive the relocation.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* ⚠️ Misc lines are `{misc, label, cost}` — the shape `savePlate` actually writes. The first draft
   of these fixtures used a `name` key, which `costFromLines` does not read, so the seed happened to
   work while describing data the app never produces. A fixture that does not match the real shape
   is a test measuring a coincidence (CLAUDE.md, roster entry 184(b)). Caught by the pre-push
   review. */
const NO_PLATES = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
};
const WITH_A_PLATE = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, label: 'Chips', cost: 6.5 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
};
const NO_MENUS = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ misc: true, label: 'Chips', cost: 6.5 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([]));
};

async function openMenu(page, w, seed) {
  await page.setViewportSize({ width: w, height: 800 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(seed);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(400);
}

/* The picker's own answer, read the way the modal reads it — so "the button agrees with the modal"
   is a measurement rather than a restatement of the button's own condition. */
const PICKER_WOULD_BE_EMPTY = () => window.eligibleDishes().length === 0;

for (const w of [380, 1280]) {
  test(`no costed plates: the add-existing control is not offered @${w}`, async ({ page }) => {
    await openMenu(page, w, NO_PLATES);
    const m = await page.evaluate(() => ({
      hidden: document.getElementById('menuAddDishBtn').hidden,
      painted: document.getElementById('menuAddDishBtn').getBoundingClientRect().height > 0,
      pickerEmpty: window.eligibleDishes().length === 0,
    }));
    expect(m.pickerEmpty, 'the seed really does leave nothing to add').toBe(true);
    expect(m.hidden, 'so the control is not offered').toBe(true);
    expect(m.painted, 'and it takes no space, orphan row included').toBe(false);
  });

  test(`one costed plate: the add-existing control comes back @${w}`, async ({ page }) => {
    await openMenu(page, w, WITH_A_PLATE);
    const m = await page.evaluate(() => ({
      hidden: document.getElementById('menuAddDishBtn').hidden,
      painted: document.getElementById('menuAddDishBtn').getBoundingClientRect().height > 0,
      pickerEmpty: window.eligibleDishes().length === 0,
    }));
    // the other half of the pair: hiding it always would pass the test above and break the feature
    expect(m.pickerEmpty, 'there is something to add').toBe(false);
    expect(m.hidden, 'so the control is offered').toBe(false);
    expect(m.painted, 'and it is really on screen').toBe(true);
  });

  test(`no menus at all: the add-existing control is not offered either @${w}`, async ({ page }) => {
    await openMenu(page, w, NO_MENUS);
    const m = await page.evaluate(() => ({
      hidden: document.getElementById('menuAddDishBtn').hidden,
      menus: window.menusList.length,
      pickerEmpty: window.eligibleDishes().length === 0,
    }));
    expect(m.menus, 'zero menus, which is a legitimate state').toBe(0);
    expect(m.pickerEmpty, 'and a plate exists, so this is the MENU half being tested').toBe(false);
    expect(m.hidden, 'adding to a menu that does not exist is not offered').toBe(true);
  });
}
