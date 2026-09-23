/*
 * 277-edit-modal-figures.spec.js (queue item 53, U1 + U22) — the Edit-menu-item modal shows the
 * number you opened it to change, and money inputs look like money.
 *
 * WHAT WAS WRONG. You reach `#editModal` from a Menu row that prints cost, suggested and a
 * food-cost %, and the form then asked for a new sell price while showing none of them. Re-pricing
 * is the second most common task in the app and its own form was blind to the one figure that
 * decides it. The sell price also read `12` beside lists printing `$12.00`.
 *
 * ⚠️ THIS IS NOT IN `fresh-states.spec.js`, WHICH IS WHERE THE QUEUE ITEM SAID TO PUT IT. That file
 * is about first-run and EMPTY states; every assertion here needs a populated menu, a costed plate
 * and an open modal. Putting it there would have meant seeding a full café into the empty-state
 * spec. Recorded because the item names that file explicitly.
 *
 * WHY THESE ASSERTIONS. The unit file (`tests/edit-modal-figures.test.js`) owns the arithmetic and
 * the three render states against the real functions; what only a browser can show is that the
 * wiring exists — that the element is in the modal, that typing moves it, and that the blur pads
 * without disturbing what the user typed. So this asserts the LIVE behaviour and not the maths.
 *
 * Run: npx playwright test tests/visual/277-edit-modal-figures.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* Toastie costs $2 against a 30% target, so at $10 it is 20% (green) and at $4 it is 50% (red) —
   two different lights from one dish, which is what makes "recoloured as you type" checkable.
   Pumpkin Soup has an EMPTY plate: it is the uncosted case, and it must never show a price. */
function seed() {
  return () => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeCost_installDismissed', '1');
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Winter Menu' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify([
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
      { id: 'PL3', name: 'Pumpkin Soup', category: 'Lunch', lines: [] },
    ]));
    localStorage.setItem('cafeDB_menu', JSON.stringify([
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI3', name: 'Pumpkin Soup', section: 'Lunch', price: 9, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL3' },
    ]));
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page, width = 1280) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), {});
  await page.goto('/');
  await page.waitForTimeout(1500);
}

const read = () => ({
  text: document.getElementById('ed_margin').textContent.trim(),
  cls: document.getElementById('ed_margin').className,
  price: document.getElementById('ed_price').value,
});

test('the modal opens with the dish\'s cost, price and food-cost %, in the target colour', async ({ page }) => {
  await boot(page);
  const g = await page.evaluate(async () => {
    window.openMenuEdit('MI1');
    await new Promise((r) => requestAnimationFrame(r));
    return { text: document.getElementById('ed_margin').textContent.trim(),
             cls: document.getElementById('ed_margin').className,
             price: document.getElementById('ed_price').value };
  });
  expect(g.price, 'the sell price pads to two places').toBe('10.00');
  expect(g.text).toContain('Ingredient cost $2.00');
  expect(g.text).toContain('at $10.00');
  // 283: ONE DECIMAL. This read '20% food cost' and passed while the Menu row this modal is
  // opened FROM printed the same dish's ratio at one decimal — the two computations are now one.
  expect(g.text).toContain('20.0% food cost');
  expect(g.cls).toBe('margin-preview mp-green');
});

test('the % and the colour move as the price is typed, and the blur pads what was typed', async ({ page }) => {
  await boot(page);
  const g = await page.evaluate(async (R) => {
    window.openMenuEdit('MI1');
    await new Promise((r) => requestAnimationFrame(r));
    const pe = document.getElementById('ed_price');
    pe.value = '4';
    pe.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    const typed = { text: document.getElementById('ed_margin').textContent.trim(),
                    cls: document.getElementById('ed_margin').className };
    pe.dispatchEvent(new Event('blur', { bubbles: true }));
    return { typed, padded: pe.value };
  }, null);
  /* Bounded on BOTH sides: it is not enough that it CHANGED, it has to be the right verdict.
     $2 against $4 at a 30% target is 50.0% food cost, which analyze() calls red. */
  expect(g.typed.text).toContain('at $4.00');
  expect(g.typed.text).toContain('50.0% food cost');   // 283: one decimal, as above
  expect(g.typed.cls, 'green at $10, red at $4 — the colour is the target rule, live').toBe('margin-preview mp-red');
  expect(g.padded, '4 pads to 4.00 on blur').toBe('4.00');
});

test('clearing the price keeps the cost and the suggestion, and drops the verdict colour', async ({ page }) => {
  await boot(page);
  const g = await page.evaluate(async () => {
    window.openMenuEdit('MI1');
    await new Promise((r) => requestAnimationFrame(r));
    const pe = document.getElementById('ed_price');
    pe.value = '';
    pe.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    return { text: document.getElementById('ed_margin').textContent.trim(),
             cls: document.getElementById('ed_margin').className };
  });
  expect(g.text).toContain('Ingredient cost $2.00');
  expect(g.text).toContain('suggested $6.67 at a 30% food cost');
  expect(g.cls, 'no light without a price to judge').toBe('margin-preview');
});

/* 222's rule, in the place it binds hardest: this form's whole job is the sell price, so a
   suggested price built from a total that is silently short is a confident wrong number exactly
   where it does the most damage. */
test('an uncosted plate says "not costed" and prices nothing', async ({ page }) => {
  await boot(page);
  const g = await page.evaluate(async () => {
    window.openMenuEdit('MI3');
    await new Promise((r) => requestAnimationFrame(r));
    const box = document.getElementById('ed_margin');
    return { text: box.textContent.trim(), html: box.innerHTML, cls: box.className,
             price: document.getElementById('ed_price').value };
  });
  expect(g.text).toBe('not costed');
  expect(g.html, 'no figure at all, not even a cost').toBe('not costed');
  expect(g.cls).toBe('margin-preview');
  expect(g.price, 'the price still pads, because that part is honest').toBe('9.00');
});

/* U22's third field. The builder's misc input is rendered by innerHTML on every structural change,
   so it is padded in the MARKUP rather than by a listener.
   WHAT THIS TEST PROVES, stated narrowly on purpose: typing in the field does not rebuild the field.
   `setMiscCost` calls `updateTotals`, which calls `renderBuilderCost` and NOT `renderPlate`, so the
   row survives its own keystrokes — which is the path padding could plausibly have broken.
   ⚠️ IT DOES NOT PROVE THE FIELD IS SAFE FROM EVERY REBUILD, AND AN EARLIER DRAFT OF THIS COMMENT
   SAID IT DID. (277's pre-push review, which went looking for exactly that overclaim.) `renderPlate`
   is also called from `bootstrapSync`, which `.claude/rules/app-guards.md` records as re-run by the
   `online` listener whenever the connection returns. Measured by calling `renderPlate()` directly
   with the field focused mid-edit: the node is REPLACED, `document.activeElement` moves off it, and
   the input re-renders from the stored value.
   **That hazard predates this change** — the innerHTML rebuild has always worked this way and only
   the padding is new — so it is recorded in `docs/MAINTENANCE.md` rather than fixed here. The point
   of saying so is that a comment claiming "proved safe" is worse than no comment: it tells the next
   reader the question has been settled when only half of it has. */
test('the builder misc cost pads on render and is NOT rewritten by its OWN keystrokes', async ({ page }) => {
  await boot(page, 380);
  await page.evaluate(() => window.showTab('builder'));
  await page.locator('#plateList .plib-row').first().click();
  await page.locator('#lines .bld-row, #addMiscBtn').first().waitFor();
  const g = await page.evaluate(async () => {
    document.getElementById('addMiscBtn').click();
    await new Promise((r) => requestAnimationFrame(r));
    const inp = document.querySelector('.misc-costbox input');
    const initial = inp.value;
    inp.focus();
    inp.value = '0.5';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    const live = document.querySelector('.misc-costbox input');
    return { initial, afterTyping: live.value, sameNode: live === inp, stillFocused: document.activeElement === live };
  });
  expect(g.initial, 'a new misc line reads 0.00, not 0').toBe('0.00');
  expect(g.afterTyping, 'what the user typed is left exactly alone').toBe('0.5');
  expect(g.sameNode, 'the row was not rebuilt under the caret').toBe(true);
  expect(g.stillFocused).toBe(true);
});
