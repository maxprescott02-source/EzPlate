/*
 * v150-builder-order.spec.js — the builder's FILL ORDER, pinned as geometry rather than as markup.
 *
 * Max, 11 Aug 2026: "confusing ordering, flow does not match how the user would fill the form."
 * The decided order is v69's and is his: add ingredients → name → categorise → save. F7 (v146) knew
 * it — it is written into the markup comment that justified the editable header title — and shipped
 * the page in the exact reverse anyway, because the mock's frame put the title first and the search
 * last. This spec is what stops that happening a second time.
 *
 * ⚠ REWRITTEN BY 177, WHICH REBUILT THIS SCREEN AND MOVED THREE OF THE SIX THINGS BELOW.
 * The complaint above is unchanged and still binds; what changed is where it is carried. 177 deletes
 * the numbered step cards and makes the DOCKET the editing surface, so the fill order is carried by
 * the thing you type into rather than by a card saying "1" above it. The plate name goes back to the
 * breadcrumb header — which is what 170 moved it OUT of — and that is Max's call in the brief, taken
 * knowingly: with the docket's add-ingredient field as the first control on the page, the name in
 * the chrome is no longer the first step a user meets.
 * The three pins that no longer describe anything are rewritten to what they were PROTECTING, not
 * deleted to go green:
 *   · "the steps are numbered and in order" → the search still sits above the lines (assertion 1,
 *     which was always the real measurement of the complaint), and there are no numbered steps left
 *     to be in the wrong order.
 *   · "category is in the naming step, not the Publishing card" → its actual finding was that the
 *     card's heading described something INERT ("Save the plate first, then publish it") over the
 *     one live control on it. So the pin is now on the heading NAMING what it holds.
 *   · "the header title mirrors the name field" → there is no mirror, because there is no second
 *     element. The pin is that the header field IS the name and edits reach the plate.
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
 *     ⚠ 177 gives the docket a `filter:drop-shadow`, which creates a containing block but does NOT
 *     clip — so this assertion is exactly as load-bearing as it was, against a new shape.
 *  3. THE DOCKET IS THE FIRST THING ON THE PAGE, and nothing numbered survives above it.
 *  4. THE CARD HOLDING CATEGORY NAMES CATEGORY. That is 170's finding, expressed against a card
 *     whose contents changed.
 *  5. THE LABEL IS SENTENCE CASE. It was the only all-caps field label on the screen, via the
 *     app-wide `.f`. Asserting the COMPUTED text-transform, not the class, because `.f` could be
 *     re-added and the rendered result is what Max sees.
 *  6. THE HEADER FIELD IS THE PLATE NAME. Typing in it renames the plate — one element, so there is
 *     no second copy to go stale, and the assertion is that the edit REACHES the data.
 *
 * Both widths, because §6.1's parity map applies and the two breakpoints lay the header out
 * differently (the name takes a full row at 380 and sits inline at 1280).
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
      const lbl = document.querySelector('label[for="plateCat"]');
      const catCard = document.querySelector('#plateCat').closest('.bld-card');
      return {
        searchTop: top('.bld-add'), linesTop: top('#lines'),
        docketTop: top('.bld-docket'), tallyTop: top('.bld-tally'),
        numberedSteps: document.querySelectorAll('.bld-step, .bld-stepn').length,
        nameInHead: !!document.querySelector('.bld-head #plateName'),
        nameMirrors: document.querySelectorAll('#plateName, #bldTitle').length,
        catCardHeading: catCard ? catCard.querySelector('h2').textContent.replace(/\s+/g, ' ').trim() : null,
        catLabelCase: getComputedStyle(lbl).textTransform,
        catLabelText: lbl.textContent.replace(/\s+/g, ' ').trim(),
      };
    });
    // 1. the docket grows DOWNWARD from where you type — the pre-F7 behaviour, and how a docket reads
    expect(order.searchTop, 'the ingredient search sits above the lines it adds to').toBeLessThan(order.linesTop);
    // and the docket totals itself at its foot, under the lines — a receipt, not a table
    expect(order.tallyTop, 'the tally is the last thing on the docket').toBeGreaterThan(order.linesTop);
    /* 3. 177: the numbered step cards are GONE, not hidden. The fill order is carried by the docket,
       whose first control is the add field (assertion 1). A step card left in the DOM but styled
       away would still be read out to a screen reader, so the count is the assertion. */
    expect(order.numberedSteps, 'no numbered step cards survive').toBe(0);
    /* 4. the plate name is the breadcrumb title again, and it is ONE element — 170's mirror span is
       deleted with the step card that made it necessary, so there is no second copy to go stale. */
    expect(order.nameInHead, 'the plate name is the breadcrumb title').toBe(true);
    expect(order.nameMirrors, 'and there is exactly one of it — no mirror to drift').toBe(1);
    /* 170's finding, restated against the card Category now lives in: its heading must NAME what it
       holds. The defect was a heading describing something inert over the one live control on it. */
    expect(order.catCardHeading, 'the card holding Category says so').toMatch(/category/i);
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

    /* 6. the header field IS the plate name — typing in it reaches the plate, and an empty one names
       itself through its placeholder rather than through a second element's fallback text. */
    expect(await page.inputValue('#plateName')).toBe('Fish & Chips');
    await page.locator('#plateName').fill('Fish & Chips v2');
    await page.waitForTimeout(200);
    await page.locator('#saveBtn, #bldSaveBar').filter({ visible: true }).first().click();
    await page.waitForTimeout(600);
    /* Read the LIBRARY, not a module variable: `savedPlates` is a `let` and never reaches `window`,
       and asserting through the screen the rename has to show up on is the stronger claim anyway. */
    await page.evaluate(() => window.closeBuilder());
    await page.waitForTimeout(300);
    await expect(page.locator('#plateList')).toContainText('Fish & Chips v2');
    const placeholder = await page.getAttribute('#plateName', 'placeholder');
    expect(placeholder, 'an unnamed plate is asked to be named, in the field itself')
      .toMatch(/name this plate/i);

    expect(errs, errs.join('|')).toHaveLength(0);
  });
}

/* The refusal to save an unnamed plate points at a field the user may not be able to see, so the
   thing to pin is that pressing Save BRINGS IT TO THEM. It works because saveCurrentPlate calls
   pn.focus() and focus scrolls — a fact about the browser, not about the code, which is why it is
   measured rather than assumed.
   ⚠ 177 INVERTED THE GEOMETRY AND THE GUARANTEE IS THE SAME. #plateName went back into the header,
   so it is off the TOP once the docket is scrolled rather than off the bottom, and Save on a phone
   is the sticky bar's — always on screen, at the other end of the page from the field it refuses
   for. That is a longer distance than 170's, not a shorter one, so the pin is if anything more
   load-bearing here. The premise below scrolls to the BOTTOM for exactly that reason. */
test('saving an unnamed plate scrolls its error into view @ 380px', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter' }]));
    localStorage.setItem('cafeDB_cogsPct', '40');
  });
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) window.kitchenIngredients.push({ id: 'K' + i, name: 'Ing ' + i, pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#newPlateBtn').click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 8; i++) {                       // a docket long enough to bury step 2
    await page.locator('#q').fill('Ing ' + i);
    await page.waitForTimeout(250);
    await page.locator('#drop .opt').first().click();
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));   // to the foot of the docket
  await page.waitForTimeout(200);
  const buried = await page.evaluate(() => {
    const r = document.getElementById('plateName').getBoundingClientRect();
    return r.bottom < 0;
  });
  expect(buried, 'the premise: with 8 lines the header name field is off the top of the screen').toBe(true);

  // the phone's Save is the sticky bar's — visible wherever the page is scrolled to
  await expect(page.locator('#bldSaveBar')).toBeVisible();
  await page.locator('#bldSaveBar').click();
  await page.waitForTimeout(600);
  const shown = await page.evaluate(() => {
    const e = document.getElementById('plateNameErr'), r = e.getBoundingClientRect();
    return {
      text: e.textContent,
      inViewport: r.top >= 0 && r.bottom <= window.innerHeight,
      focused: document.activeElement && document.activeElement.id,
    };
  });
  expect(shown.text).toMatch(/name/i);
  expect(shown.focused, 'the refusal puts the cursor in the field it is about').toBe('plateName');
  expect(shown.inViewport, 'and the message is somewhere the user can actually read it').toBe(true);
  expect(errs, errs.join('|')).toHaveLength(0);
});

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
