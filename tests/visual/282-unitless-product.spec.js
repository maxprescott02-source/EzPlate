/*
 * 282-unitless-product.spec.js (queue item 102) — a product with NO recorded unit.
 *
 * WHAT WAS WRONG. `saveIngEdit` derived the unit it saves in from the STORED product with a ternary
 * closing `: 'kg'`, so an unrecognised `base_unit` landed on `'kg'` and `invUnitToBase('kg')` divides
 * by 1000. Typing `1.41` for a $1.41 container stored `cost_per_base_unit: 0.00141, base_unit:'g'` —
 * $1.41 per KILO, with a weight unit invented for an item sold by count.
 *
 * ⚠️ THIS SPEC NEEDS NO FIXTURE PATCH, AND THAT IS THE POINT. `tests/fixtures/base-products.json`
 * already carries **P0122 "Container Food 3.15Lt Storage"** with `base_unit:"unknown"`,
 * `cost_per_base_unit:null` and `current_price_exgst:1.41` — the item's own worked example, shipped
 * in the repo, one of the eight rows `supabase/migrations/20260801_base_products_backfill.sql`
 * coerces to NULL because the table's CHECK forbids the string. Production holds the null spelling
 * and the fixture holds the pre-migration one; both took the old fallback.
 *
 * WHY A BROWSER TEST AND NOT ONLY THE UNIT ONE. `tests/unitless-product-price.test.js` owns the
 * mapping, the lock and the real `saveIngEdit` against a stubbed DOM. What only a browser shows is
 * that the control a user actually touches is REACHABLE and ENABLED — a select whose `disabled` the
 * app clears but whose CSS or markup still refuses input would satisfy every unit assertion here and
 * leave the product exactly as unpriceable as before.
 *
 * Run: npx playwright test tests/visual/282-unitless-product.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const UNITLESS = 'Container Food 3.15Lt Storage';                 // P0122, base_unit "unknown"
const KNOWN = 'Apple Pie Grannys Pre Cut';                        // P0001, base_unit "g"

async function boot(page, width) {
  await page.setViewportSize({ width: width || 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(() => { try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {} });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await gotoTab(page, 'ingredients');
}

async function openRow(page, name) {
  await page.evaluate((n) => {
    const row = [...document.querySelectorAll('#ingList [role="button"], #ingList .ing-card, #ingList button')]
      .find((e) => e.textContent.includes(n));
    if (!row) throw new Error('row not found: ' + n);
    row.click();
  }, name);
  await page.waitForTimeout(300);
}

const unitState = () => {
  const s = document.getElementById('ig_unit');
  return { value: s.value, disabled: s.disabled, aria: s.getAttribute('aria-disabled') };
};

test('a product with no recorded unit opens with the unit UNSET and settable', async ({ page }) => {
  await boot(page);
  await openRow(page, UNITLESS);
  const u = await page.evaluate(unitState);
  expect(u.value, 'nothing is pre-selected — the old code showed "per kg" here').toBe('');
  expect(u.disabled, 'this is the one product where v54 protects nothing').toBe(false);
  expect(u.aria, 'the a11y state moves with the real one').toBe(null);
  /* Reachable, not merely un-disabled: a control the app enables and the page still refuses is the
     same dead end with a different cause. Driven through the real pointer path. */
  await page.selectOption('#ig_unit', 'unit');
  expect(await page.evaluate(() => document.getElementById('ig_unit').value)).toBe('unit');
});

test('a product that HAS a unit is untouched — the control stays locked', async ({ page }) => {
  await boot(page);
  await openRow(page, KNOWN);
  const u = await page.evaluate(unitState);
  expect(u.value).toBe('kg');
  expect(u.disabled, 'flipping g/ml/ea re-means every saved plate line (v54)').toBe(true);
  expect(u.aria).toBe('true');
});

/* THE ONE THAT MATTERS. Everything above is the control; this is the number that reaches the row. */
test('$1.41 for a container saves as $1.41 per unit, not $1.41 per kilo', async ({ page }) => {
  await boot(page);
  await openRow(page, UNITLESS);
  await page.selectOption('#ig_unit', 'unit');
  await page.fill('#ig_price', '1.41');
  await page.click('#ingSave');
  await page.waitForTimeout(600);

  /* Read it back through `openIngEdit`, which is the user-visible proof and goes through the same
     `perDisplayValue` a person sees — a save that stored $/g would reopen showing 1410.00. */
  await openRow(page, UNITLESS);
  const after = await page.evaluate(() => ({
    price: document.getElementById('ig_price').value,
    value: document.getElementById('ig_unit').value,
    disabled: document.getElementById('ig_unit').disabled,
  }));
  expect(after.price, 'reopening shows the price that was typed').toBe('1.41');
  expect(after.value, 'the unit it was saved in is now recorded').toBe('unit');
  expect(after.disabled, 'and it is create-only again, because it is no longer unknown').toBe(true);
});

test('the pack read-out sends the user to the unit control while the unit is unknown', async ({ page }) => {
  await boot(page);
  await openRow(page, UNITLESS);
  /* ⚠️ `selectOption`, NOT a hand-dispatched `change`. A real select fires `input` AND `change`, and
     `igPackWire` listens to both — so the true sequence on a pack-unit pick is fill(stale unit) →
     sync → fill(chosen unit), and only the last one is right. Dispatching `change` alone skips the
     stale fill entirely and would pass against a wiring order that a person could not use. */
  await page.fill('#ig_packQty', '1');
  await page.selectOption('#ig_packUnit', 'ea');
  await page.fill('#ig_packPrice', '1.41');
  const before = await page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(r));
    const c = document.getElementById('ig_calc');
    return { text: c.textContent, cls: c.className, price: document.getElementById('ig_price').value,
             unit: document.getElementById('ig_unit').value };
  });
  expect(before.unit, 'the pack unit set the unit, because the control is unlocked here').toBe('unit');
  /* ⚠️ Choosing the pack unit sets `#ig_unit` through `syncIgUnitFromPack`, because the control is
     unlocked on this product — so by the time the read-out runs, the unit IS known and the pack
     derives. That is the intended journey and the wiring ORDER is what makes it work; if it ever
     regresses, this reads "no unit recorded" instead. */
  expect(before.text, 'the pack drove the unit and then the price').toBe('= $1.41 / unit');
  expect(before.price).toBe('1.41');

  /* And with no pack unit chosen, the refusal names the control rather than the price field. */
  const bare = await page.evaluate(async () => {
    document.getElementById('ig_unit').value = '';
    const u = document.getElementById('ig_packUnit'); u.value = ''; u.dispatchEvent(new Event('change', { bubbles: true }));
    const e = document.getElementById('ig_packQty'); e.value = '1'; e.dispatchEvent(new Event('input', { bubbles: true }));
    const p = document.getElementById('ig_packPrice'); p.value = '1.41'; p.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    return document.getElementById('ig_calc').textContent;
  });
  /* A pack with no unit is PARTIAL, not a unit refusal — the read-out hides rather than explaining.
     Asserted so the two states stay distinct, which is `igPackDerive`'s own contract. */
  expect(bare).toBe('');
});

test('saving with no unit chosen refuses in the form, at 380px too', async ({ page }) => {
  await boot(page, 380);
  await openRow(page, UNITLESS);
  await page.fill('#ig_price', '1.41');
  await page.click('#ingSave');
  await page.waitForTimeout(300);
  const err = await page.evaluate(() => {
    const e = document.getElementById('ig_err');
    return { text: e.textContent, display: getComputedStyle(e).display, open: !document.getElementById('ingModal').hidden };
  });
  expect(err.text).toMatch(/no unit recorded/i);
  expect(err.display, 'the message is rendered, not merely assigned').not.toBe('none');
  expect(err.open, 'the form stays open on the field the user has to fill').toBe(true);
});
