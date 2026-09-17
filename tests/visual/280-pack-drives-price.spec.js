/*
 * 280-pack-drives-price.spec.js (queue item 98) — the Edit-product form asks what the New form asks.
 *
 * WHAT WAS WRONG. New product takes pack size + pack unit + pack price and derives the unit cost
 * into `#f_calc`. Edit took a price PER UNIT, so a sack created as "10 kg for $65" reopened as
 * "6.50" — and the $65 had been stored in `current_price_exgst` since creation and read by nothing
 * anywhere in the app. The pack SIZE round-tripped (v82 D2); only the price was invisible.
 *
 * WHY A BROWSER TEST AND NOT ONLY THE UNIT ONE. `tests/pack-drives-price.test.js` owns the
 * derivation and the refusal against the real functions, and proves the filled price composes back
 * through `saveIngEdit`'s divisor. What only a browser shows is the WIRING — that the journey
 * create → reopen → edit the pack → save actually stores what the pack describes. This spec drives
 * that journey end to end rather than asserting about the pieces.
 *
 * ⚠️ THE SAVE IS THE POINT OF THE LAST TEST. Everything before it is display; a pack that fills a
 * field correctly and then stores something else would pass every other assertion here.
 *
 * Run: npx playwright test tests/visual/280-pack-drives-price.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

async function boot(page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(() => { try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {} });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await gotoTab(page, 'ingredients');
}

/* Creates "10 kg for $65" through the REAL New-product form and returns what `#f_calc` said, so the
   two forms' answers can be compared rather than assumed equal. */
async function createPack(page, name) {
  await page.evaluate(() => window.openModal());
  await page.waitForTimeout(200);
  await page.evaluate((n) => {
    const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
    set('f_desc', n); set('f_category', 'Dry'); set('f_packsize', '10'); set('f_price', '65');
    const u = document.getElementById('f_packunit'); u.value = 'kg'; u.dispatchEvent(new Event('change', { bubbles: true }));
  }, name);
  const calc = await page.evaluate(() => document.getElementById('f_calc').textContent);
  await page.evaluate(() => document.getElementById('mSave').click());
  await page.waitForTimeout(400);
  return calc;
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

const fields = () => {
  const v = (id) => (document.getElementById(id) || {}).value;
  const calc = document.getElementById('ig_calc');
  return { price: v('ig_price'), qty: v('ig_packQty'), unit: v('ig_packUnit'), packPrice: v('ig_packPrice'),
           calc: calc.textContent, hidden: calc.hidden, cls: calc.className };
};

test('a pack created on New reopens on Edit with its price, and both forms agree', async ({ page }) => {
  await boot(page);
  const newCalc = await createPack(page, 'Zed Flour A');
  await openRow(page, 'Zed Flour A');
  const g = await page.evaluate(fields);

  expect(newCalc, 'New derives the unit cost from the pack').toBe('= $6.50 / kg');
  expect(g.packPrice, 'the $65 the user typed is on the form at last').toBe('65.00');
  expect(g.qty).toBe('10');
  expect(g.unit).toBe('kg');
  expect(g.price, 'and the per-unit price still reads what it always did').toBe('6.50');
  expect(g.calc, 'Edit says the same sentence New said').toBe(newCalc);
  expect(g.hidden).toBe(false);
});

test('editing the pack drives the per-unit price, live', async ({ page }) => {
  await boot(page);
  await createPack(page, 'Zed Flour B');
  await openRow(page, 'Zed Flour B');
  const g = await page.evaluate(async () => {
    const fire = (id, val, ev) => { const e = document.getElementById(id); e.value = val; e.dispatchEvent(new Event(ev || 'input', { bubbles: true })); };
    const v = (id) => document.getElementById(id).value;
    const out = {};
    fire('ig_packPrice', '80');
    await new Promise((r) => requestAnimationFrame(r));
    out.price80 = v('ig_price');
    out.calc80 = document.getElementById('ig_calc').textContent;
    fire('ig_packQty', '5');
    await new Promise((r) => requestAnimationFrame(r));
    out.qty5 = v('ig_price');
    return out;
  });
  expect(g.price80, '$80 over 10 kg').toBe('8.00');
  expect(g.calc80).toBe('= $8.00 / kg');
  expect(g.qty5, '$80 over 5 kg').toBe('16.00');
});

/* ⚠️ THE REFUSAL. An `ea` pack on a product stored by weight means price/qty is a price in the wrong
   unit. The form must decline, name both units, and LEAVE THE PRICE ALONE — a silent fallback to
   computing is the unit-mismatch defect by another road. */
test('a pack whose unit does not match the stored one is refused, and the price is untouched', async ({ page }) => {
  await boot(page);
  await createPack(page, 'Zed Flour C');
  await openRow(page, 'Zed Flour C');
  const g = await page.evaluate(async () => {
    const before = document.getElementById('ig_price').value;
    const u = document.getElementById('ig_packUnit'); u.value = 'ea'; u.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => requestAnimationFrame(r));
    const c = document.getElementById('ig_calc');
    return { before, after: document.getElementById('ig_price').value, calc: c.textContent, cls: c.className };
  });
  expect(g.after, 'the price the product already had is left exactly as it was').toBe(g.before);
  expect(g.cls).toContain('bad');
  expect(g.calc).toContain('measured in unit');
  expect(g.calc).toContain('stored per weight');
});

/* THE ONE THAT MATTERS. Everything above is display. This drives the pack, saves, and reads the
   STORED cost back — because a form that fills a field correctly and stores something else would
   satisfy every other assertion in this file. */
test('a pack-driven edit SAVES the cost the pack describes, and does not move the base unit', async ({ page }) => {
  await boot(page);
  await createPack(page, 'Zed Flour D');
  await openRow(page, 'Zed Flour D');
  const g = await page.evaluate(async () => {
    const fire = (id, val) => { const e = document.getElementById(id); e.value = val; e.dispatchEvent(new Event('input', { bubbles: true })); };
    fire('ig_packPrice', '80');            // 80 over 10 kg -> $8.00/kg -> 0.008 per gram
    await new Promise((r) => requestAnimationFrame(r));
    const filled = document.getElementById('ig_price').value;
    document.getElementById('ingSave').click();
    await new Promise((r) => setTimeout(r, 500));
    /* Read the stored record back through the app's own lookup rather than a fixture. */
    const p = window.productById ? window.productById('Zed Flour D') : null;
    return { filled, stored: p };
  });
  expect(g.filled).toBe('8.00');
  /* `productById` may not be exposed; fall back to reopening the row, which is the user-visible
     proof and reads through the same `openIngEdit` path a person would. */
  await openRow(page, 'Zed Flour D');
  const reopened = await page.evaluate(fields);
  expect(reopened.price, 'reopening shows the saved per-unit price').toBe('8.00');
  expect(reopened.packPrice, 'and the pack price it was derived from').toBe('80.00');
  expect(reopened.unit, 'the base unit did not move — v54 is create-only and stays so').toBe('kg');
  expect(reopened.calc).toBe('= $8.00 / kg');
});
