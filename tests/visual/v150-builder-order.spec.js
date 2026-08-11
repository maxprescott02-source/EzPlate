/*
 * v150-builder-order.spec.js — the builder's FILL ORDER, pinned as geometry rather than as markup.
 *
 * Max, 11 Aug 2026: "confusing ordering, flow does not match how the user would fill the form."
 * The decided order is v69's and is his: add ingredients → name → categorise → save. F7 (v146) knew
 * it — it is written into the markup comment that justified the editable header title — and shipped
 * the page in the exact reverse anyway, because the mock's frame put the title first and the search
 * last. This spec is what stops that happening a second time.
 *
 * WHY EACH ASSERTION IS A REGRESSION AND NOT A DESCRIPTION:
 *
 *  1. THE SEARCH IS ABOVE #lines. This is the whole complaint in one measurement. It is written as
 *     a coordinate comparison, not "is #q inside .bld-add", because the requirement is about what a
 *     user reading down the page meets first — a selector assertion passes on markup that renders
 *     in any order at all.
 *  2. THE DROPDOWN IS NOT CLIPPED. Measured on the SHIPPED v149 build before this change: a 96px
 *     list with 37px of it visible at 1280, because #drop is position:absolute inside .search-wrap
 *     and `.bld-table` carried overflow:hidden. That defect was invisible to every existing spec —
 *     they all asserted the dropdown's CLASS or its option count, which were correct throughout.
 *     So this asserts PAINTED height against the real clipping ancestors, which is the only form of
 *     the claim that can fail. (CLAUDE.md: the failure is never a red test, it is a green one.)
 *  3. THE STEPS ARE NUMBERED AND IN ORDER. "The page states its order" is the item's second
 *     requirement; a heading that exists but sits second states the wrong one.
 *  4. CATEGORY IS IN THE NAMING STEP, NOT THE PUBLISHING CARD. It is step three of the fill order
 *     and it was under a card whose own first line reads "Save the plate first, then publish it".
 *  5. THE LABEL IS SENTENCE CASE. It was the only all-caps field label on the screen, via the
 *     app-wide `.f`. Asserting the COMPUTED text-transform, not the class, because `.f` could be
 *     re-added and the rendered result is what Max sees.
 *  6. THE HEADER TITLE MIRRORS THE NAME FIELD. The field moved out of the header, so the mirror is
 *     new state and new state that can go stale. Driven by typing, which is the path with no
 *     renderPlate() call of its own.
 *
 * Both widths, because §6.1's parity map applies and the two breakpoints lay the header out
 * differently (the title takes a full row at 380 and sits inline at 1280).
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_WINTER', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: 1 }, { kid: 'K2', qty: 90, uid: 2 }] }
  ]));
};

async function openTheBuilder(page) {
  await installBoot(page);
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.kitchenIngredients.push({ id: 'K1', name: 'Chips', pid: 'P0108' });
    window.kitchenIngredients.push({ id: 'K2', name: 'Cheese', pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .plib-row').first().click();   // F7: the row opens the builder itself
  await page.waitForTimeout(500);
  await expect(page.locator('#builderPage')).toBeVisible();
}

for (const size of [{ name: '380px', width: 380, height: 780 }, { name: 'desktop', width: 1280, height: 900 }]) {
  test(`the builder fills in the v69 order @ ${size.name}`, async ({ page }) => {
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    await page.setViewportSize({ width: size.width, height: size.height });
    await openTheBuilder(page);

    /* 1 + 3 + 4 + 5: the reading order down the page */
    const order = await page.evaluate(() => {
      const top = s => Math.round(document.querySelector(s).getBoundingClientRect().top);
      const step = n => document.querySelector(`#bldStep${n} > h2`).textContent.replace(/\s+/g, ' ').trim();
      const lbl = document.querySelector('label[for="plateCat"]');
      return {
        searchTop: top('.bld-add'), linesTop: top('#lines'),
        step1Top: top('#bldStep1'), step2Top: top('#bldStep2'),
        step1: step(1), step2: step(2),
        nameInStep2: !!document.querySelector('#bldStep2 #plateName'),
        catInStep2: !!document.querySelector('#bldStep2 #plateCat'),
        catInRail: !!document.querySelector('.bld-rail #plateCat'),
        catLabelCase: getComputedStyle(lbl).textTransform,
        catLabelText: lbl.textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    // 1. the docket grows DOWNWARD from where you type — the pre-F7 behaviour, and how a docket reads
    expect(order.searchTop, 'the ingredient search sits above the lines it adds to').toBeLessThan(order.linesTop);
    // 3. ingredients first, naming second — the v69 order, said out loud
    expect(order.step1Top, 'step 1 is above step 2').toBeLessThan(order.step2Top);
    expect(order.step1).toMatch(/^1\s*Add ingredients$/);
    expect(order.step2).toMatch(/^2\s*Name & save$/);
    // 4. naming and categorising are the same step, and Publishing holds neither
    expect(order.nameInStep2, 'the plate name is in the naming step').toBe(true);
    expect(order.catInStep2, 'so is the category').toBe(true);
    expect(order.catInRail, 'and the category has LEFT the Publishing card').toBe(false);
    // 5. sentence case, like every other field on the screen
    expect(order.catLabelCase, 'the category label is not shouting').not.toBe('uppercase');
    expect(order.catLabelText).toBe('Category (optional)');

    /* 2. the dropdown paints in full. Measured against every clipping ancestor, which is what an
       overflow:hidden card actually does to it — not against the card the markup happens to name. */
    await page.locator('#q').click();
    await page.locator('#q').fill('c');
    await page.waitForTimeout(400);
    const drop = await page.evaluate(() => {
      const d = document.getElementById('drop');
      const r = d.getBoundingClientRect();
      let top = -1e9, bottom = 1e9;
      for (let el = d.parentElement; el; el = el.parentElement) {
        const cs = getComputedStyle(el);
        if (/hidden|auto|scroll/.test(cs.overflowY) || /hidden|auto|scroll/.test(cs.overflowX)) {
          const b = el.getBoundingClientRect();
          top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom);
        }
      }
      return {
        opts: d.querySelectorAll('.opt').length,
        height: Math.round(r.height),
        painted: Math.round(Math.max(0, Math.min(r.bottom, bottom) - Math.max(r.top, top))),
      };
    });
    expect(drop.opts, 'the search matched something to draw').toBeGreaterThanOrEqual(2);
    expect(drop.height, 'the dropdown has real height').toBeGreaterThan(40);
    expect(drop.painted, 'and ALL of it is inside the clip — v149 painted 37 of 96').toBe(drop.height);

    /* 6. the header title mirrors the field, live, as you type */
    const t0 = await page.locator('#bldTitle').textContent();
    expect(t0).toBe('Fish & Chips');
    await page.locator('#plateName').fill('Fish & Chips v2');
    await page.waitForTimeout(200);
    expect(await page.locator('#bldTitle').textContent(), 'the header follows the field').toBe('Fish & Chips v2');
    await page.locator('#plateName').fill('');
    await page.waitForTimeout(200);
    const unnamed = await page.evaluate(() => {
      const t = document.getElementById('bldTitle');
      return { text: t.textContent, muted: t.classList.contains('is-unnamed') };
    });
    expect(unnamed.text, 'an unnamed plate is named as one, not left blank').toBe('New plate');
    expect(unnamed.muted, 'and reads as a placeholder').toBe(true);

    expect(errs, errs.join('|')).toHaveLength(0);
  });
}

test('an empty plate carries ONE no-ingredients message, and it points UP @ 380px', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width: 380, height: 780 });
  await openTheBuilder(page);
  await page.locator('#clearBtn').click();
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => ({
    empty: (document.querySelector('.bld-empty') || {}).textContent || '',
    hintPainted: getComputedStyle(document.getElementById('builderHint')).display !== 'none',
    sentences: (document.getElementById('builderPage').textContent.match(/No ingredients yet/g) || []).length,
  }));
  // the copy was compensating for the control being in the wrong place; the control moved, so it goes
  expect(s.empty).not.toMatch(/below/i);
  expect(s.empty).toMatch(/above/i);
  expect(s.hintPainted, 'the hint does not double the empty state').toBe(false);
  expect(s.sentences, 'exactly one "No ingredients yet" on the screen').toBe(1);
  expect(errs, errs.join('|')).toHaveLength(0);
});
