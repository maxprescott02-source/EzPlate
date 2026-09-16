/*
 * 278-add-dish-picker.spec.js (queue item 54, U2 + U32) — the add-to-menu control sits with the
 * menu it applies to, and the picker leads with what is missing.
 *
 * U32, MEASURED BEFORE THE MOVE at 1280: `#menuAddDishBtn` sat at x1049-1147 y37-75, inside
 * `.scr-head` (y32-80), while `#menuSwitchRow` — where the menu it adds to is CHOSEN — runs y80-136.
 * The control and its own subject were on different lines with the header hairline between them.
 * Below 768 it was already in the switcher row, via `data-mobile-home`; the markup now says that
 * permanently and the attribute is gone.
 *
 * WHY A BROWSER TEST AND NOT ONLY THE UNIT ONE. `tests/add-dish-picker.test.js` owns the ordering
 * and the labels against the real `renderDishPicker`. What only a browser shows is WHERE the button
 * ends up once the cascade and the `data-mobile-home` machinery have both had their say — and the
 * assertion is CONTAINMENT (`#menuSwitchRow.contains(btn)`) rather than coordinates, so it pins the
 * relationship rather than this layout's numbers.
 *
 * Run: npx playwright test tests/visual/278-add-dish-picker.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* Apple Tart and Chowder are on the CURRENT menu, Bacon Roll is on another, Danish is on none.
   Alphabetically A,B,C,D; the required order is B,D,A,C — so the fixture cannot be satisfied by the
   sort that was there before. */
function seed() {
  return () => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeCost_installDismissed', '1');
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }, { id: 'M2', name: 'Summer Menu' }]));
    localStorage.setItem('cafeDB_plates', JSON.stringify([
      { id: 'PA', name: 'Apple Tart', category: 'Sweets', lines: [{ misc: true, name: 'x', cost: 2 }] },
      { id: 'PB', name: 'Bacon Roll', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
      { id: 'PC', name: 'Chowder', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 4 }] },
      { id: 'PD', name: 'Danish', category: 'Sweets', lines: [{ misc: true, name: 'x', cost: 5 }] },
    ]));
    localStorage.setItem('cafeDB_menu', JSON.stringify([
      { id: 'MI1', name: 'Apple Tart', section: 'Sweets', price: 10, custom: true, menuId: 'M1', plateId: 'PA' },
      { id: 'MI2', name: 'Chowder', section: 'Lunch', price: 12, custom: true, menuId: 'M1', plateId: 'PC' },
      { id: 'MI3', name: 'Bacon Roll', section: 'Lunch', price: 9, custom: true, menuId: 'M2', plateId: 'PB' },
    ]));
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), {});
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.showTab('analysis'));
  await page.waitForTimeout(300);
}

/* 380 is where it already lived; 1280 is where it did not; 767 and 768 straddle the breakpoint the
   old `data-mobile-home` keyed on, so a rule that still moves it at one width and not the other
   fails here rather than looking fine at the two ends. */
for (const width of [380, 767, 768, 1280]) {
  test(`${width}px: "Add plate" sits in the row that chooses the menu it adds to`, async ({ page }) => {
    await boot(page, width);
    const g = await page.evaluate(() => {
      const b = document.getElementById('menuAddDishBtn');
      const row = document.getElementById('menuSwitchRow');
      const head = document.querySelector('#tab-analysis .scr-head');
      return {
        hidden: b.hidden,
        inSwitchRow: row.contains(b),
        inHeader: !!head && head.contains(b),
        hasMobileHome: b.hasAttribute('data-mobile-home'),
        newMenuInHeader: !!head && head.contains(document.getElementById('menuNewBtn')),
      };
    });
    expect(g.hidden, 'two menus and four costed plates — it must be offered').toBe(false);
    expect(g.inSwitchRow, `at ${width} it belongs with the menu switcher`).toBe(true);
    expect(g.inHeader).toBe(false);
    expect(g.hasMobileHome, 'the markup says it permanently now, so the attribute is gone').toBe(false);
    /* The counterweight: "New menu" makes a NEW menu, so its subject is the screen rather than the
       current selection. It stays put, and the header keeps exactly one action. */
    expect(g.newMenuInHeader).toBe(true);
  });
}

test('the picker leads with the plates that are NOT on this menu', async ({ page }) => {
  await boot(page, 1280);
  const g = await page.evaluate(async () => {
    document.getElementById('menuAddDishBtn').click();
    await new Promise((r) => setTimeout(r, 200));
    return [...document.querySelectorAll('#ad_list .ad-item')].map((b) => ({
      name: b.querySelector('.ad-nm').textContent,
      meta: b.querySelector('.ad-meta').textContent,
      dimmed: b.classList.contains('is-on'),
    }));
  });
  expect(g.map((r) => r.name)).toEqual(['Bacon Roll', 'Danish', 'Apple Tart', 'Chowder']);
  expect(g.map((r) => r.dimmed)).toEqual([false, false, true, true]);
  expect(g[2].meta).toBe('Already on this menu · cost $2.00');
  expect(g[0].meta, 'another menu still names itself').toBe('On Summer Menu · cost $3.00');
});

/* The dim must be visible and must NOT read as disabled — it is a ranking, and selecting one of
   these updates its existing entry rather than duplicating it. Measured as a real colour difference
   against a full-strength row rather than asserted from the class, which would be circular. */
test('an already-on row is dimmer than an addable one, and still pressable', async ({ page }) => {
  await boot(page, 1280);
  const g = await page.evaluate(async () => {
    document.getElementById('menuAddDishBtn').click();
    await new Promise((r) => setTimeout(r, 200));
    const items = [...document.querySelectorAll('#ad_list .ad-item')];
    const off = items[0], on = items[2];
    const nm = (el) => getComputedStyle(el.querySelector('.ad-nm')).color;
    return { offColor: nm(off), onColor: nm(on),
             onDisabled: on.disabled, onPointer: getComputedStyle(on).pointerEvents,
             onPid: on.getAttribute('data-pid') };
  });
  expect(g.onColor, 'the already-on name is a different colour from an addable one').not.toBe(g.offColor);
  expect(g.onDisabled, 'not disabled — selecting it updates the existing entry').toBe(false);
  expect(g.onPointer).not.toBe('none');
  expect(g.onPid).toBeTruthy();
});
