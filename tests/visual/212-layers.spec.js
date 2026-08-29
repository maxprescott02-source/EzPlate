/*
 * 212-layers.spec.js — QUEUE ITEM 6, "Floating layers and mobile dropdowns", measured rather than
 * described. Max: dropdowns "cover the search bar, cannot be scrolled, and the bounce animation is
 * annoying", usable one-handed on a 380px phone.
 *
 * WHY EACH ASSERTION IS A REGRESSION AND NOT A DESCRIPTION. Every number below was measured on the
 * SHIPPED v172 build before the change, and every assertion goes red if the engine is taken away
 * again. Selector and class assertions are deliberately avoided throughout: the whole defect class
 * here is a layer whose CLASS was right and whose GEOMETRY was wrong, which is invisible to both.
 *
 *  1. #plateSuggest DOES NOT MOVE THE PAGE. This is the "covers the search bar" complaint, and its
 *     mechanism turned out to be DISPLACEMENT rather than overlap — which is why looking for an
 *     overlapping rect found nothing and the queue item's own guess (the engine flipping upward)
 *     was wrong. `.suggest-drop` declared no `position` at all, so it was `static`: an in-flow
 *     block. Measured on v172 at 380px: opening it inserted 381px of flow and pushed #q from top
 *     213 to top 602 — 389px, off the screen on a phone with the keyboard up. Asserted as "#q does
 *     not move", because that is the user-visible claim and it cannot be satisfied by a layer that
 *     is in the flow.
 *  2. AND IT ACTUALLY FLOATS. The counterpart to 1: a layer that moved nothing because it rendered
 *     nothing would pass assertion 1 perfectly. So it must also be on screen, non-zero, and
 *     overlapping the content it floats above.
 *  3. #drop LANDS ON ITS OWN INPUT. The containing-block trap, and the reason this batch is not a
 *     three-line change. `.bld-docket` carries `filter:drop-shadow`, which makes it the containing
 *     block for a `position:fixed` descendant — measured: a fixed;left:0;top:0 probe inside
 *     `.bld-add .search-wrap` lands at (12, 198), not (0, 0). anchorDrop wrote viewport coordinates
 *     and its own comment justified that with a claim about MODALS. Without fixedContainingBlock
 *     the list renders 198px below the field. Asserted as a gap in single digits, so any reappearing
 *     offset fails regardless of its size.
 *  4. #drop STAYS INSIDE THE VIEWPORT ON A SHORT ONE, AND CAN STILL SCROLL. The "cannot be scrolled"
 *     complaint. `.drop`'s `max-height:min(330px,45vh)` is measured against the LAYOUT viewport,
 *     which does not shrink when a phone keyboard opens; measured at 380x420 on v172 the list ran
 *     35px BELOW the visible area, so the part you would scroll to was off-screen. Both halves are
 *     asserted together on purpose: clamping a list to zero height would satisfy "inside the
 *     viewport" and destroy the feature.
 *  5. THE BOUNCE IS GONE AND THE FADE IS NOT. Asserted as the keyframe's own computed content
 *     rather than as "the animation is none", because deleting the animation outright is a
 *     different (and worse) change that a `toBe('none')` assertion would have accepted.
 *  6. THE DASHBOARD POPOVER IS PLACED BY THE ENGINE, and stays inside both edges.
 *
 * Both widths and both themes: §6.1's parity map applies, and the two breakpoints lay the builder
 * header out differently.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  const plates = [];
  for (let i = 1; i <= 10; i++) {
    plates.push({ id: 'PL' + i, name: 'Fish plate ' + i, category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: i }] });
  }
  localStorage.setItem('cafeDB_plates', JSON.stringify(plates));
};

const DASH_SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([
    { id: 'MENU_ORIGINAL', name: 'Original menu' }, { id: 'MENU_WINTER', name: 'Winter Menu' },
  ]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Bacon & Egg Muffin', category: 'Breakfast', lines: [{ misc: true, name: 'x', cost: 2.31 }] },
    { id: 'PL2', name: 'Seafood Basket', category: 'Mains', lines: [{ misc: true, name: 'x', cost: 8.42 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Bacon & Egg Muffin', section: 'Breakfast', price: 8.5, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
    { id: 'MI2', name: 'Seafood Basket', section: 'Mains', price: 18.5, custom: true, menuId: 'MENU_WINTER', plateId: 'PL2' },
  ]));
};

async function openTheBuilder(page, width, theme) {
  await page.setViewportSize({ width, height: 780 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(SEED);
  if (theme === 'dark') await page.addInitScript(() => localStorage.setItem('cafeDB_theme', 'dark'));
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    for (let i = 1; i <= 40; i++) window.kitchenIngredients.push({ id: 'K' + i, name: 'Chip variety ' + i, pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .plib-row').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('#builderPage')).toBeVisible();
}

const rect = (sel) => {
  const e = document.querySelector(sel);
  const b = e.getBoundingClientRect();
  return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, w: b.width, h: b.height };
};

for (const width of [380, 1280]) {
  for (const theme of ['light', 'dark']) {
    test(`the plate-name suggestions float instead of shoving the page @${width} ${theme}`, async ({ page }) => {
      await openTheBuilder(page, width, theme);

      const before = await page.evaluate((r) => ({ q: eval('(' + r + ')')('#q'), bodyH: document.body.scrollHeight }), rect.toString());
      await page.locator('#plateName').fill('');
      await page.locator('#plateName').type('Fish', { delay: 20 });
      await page.waitForTimeout(400);
      const after = await page.evaluate((r) => {
        const R = eval('(' + r + ')');
        const sg = document.getElementById('plateSuggest');
        return {
          q: R('#q'), bodyH: document.body.scrollHeight,
          sug: R('#plateSuggest'), opts: sg.querySelectorAll('.sug-opt').length,
          pos: getComputedStyle(sg).position, vh: window.innerHeight, vw: window.innerWidth,
        };
      }, rect.toString());

      // there must BE suggestions, or every assertion below is vacuous (the 205 lesson: an
      // assertion whose subject does not exist cannot fail)
      expect(after.opts, 'the seed produces suggestions to float').toBeGreaterThan(1);

      /* 1. the complaint. On v172 this moved 389px at 380 wide. */
      expect(Math.round(after.q.top), 'the ingredient search bar does not move when suggestions open')
        .toBe(Math.round(before.q.top));
      expect(after.bodyH, 'and the page does not grow — nothing was inserted into the flow')
        .toBe(before.bodyH);

      /* 2. and it is really there, floating over the content rather than absent */
      expect(after.pos, 'the layer is placed by the engine').toBe('fixed');
      expect(after.sug.h, 'the suggestion list has real height').toBeGreaterThan(40);
      expect(after.sug.bottom, 'it overlaps the content below it, which is what floating means')
        .toBeGreaterThan(after.q.top);
      expect(after.sug.bottom, 'and it stays inside the viewport').toBeLessThanOrEqual(after.vh + 1);
      expect(after.sug.left, 'and inside the left edge').toBeGreaterThanOrEqual(-1);
      expect(after.sug.right, 'and inside the right edge').toBeLessThanOrEqual(after.vw + 1);
    });

    test(`the ingredient dropdown lands on its own field despite the docket's filter @${width} ${theme}`, async ({ page }) => {
      await openTheBuilder(page, width, theme);
      await page.locator('#q').fill('chip');
      await page.waitForTimeout(400);

      const m = await page.evaluate((r) => {
        const R = eval('(' + r + ')');
        const d = document.getElementById('drop');
        return {
          drop: R('#drop'), q: R('#q'), pos: getComputedStyle(d).position,
          opts: d.querySelectorAll('.opt').length,
          scrollH: d.scrollHeight, clientH: d.clientHeight,
          vh: window.innerHeight, vw: window.innerWidth,
        };
      }, rect.toString());

      expect(m.opts, 'there is a list to place').toBeGreaterThan(1);
      expect(m.pos, 'the engine placed it').toBe('fixed');

      /* 3. THE CONTAINING-BLOCK TRAP. `.bld-docket`'s filter:drop-shadow is the containing block for
         a fixed descendant, so viewport coordinates written straight in land 198px low. */
      const gap = m.drop.top - m.q.bottom;
      expect(gap, `the list sits just under its field, not ${Math.round(gap)}px away`)
        .toBeGreaterThanOrEqual(0);
      expect(gap, `the list sits just under its field, not ${Math.round(gap)}px away`)
        .toBeLessThan(10);
      expect(Math.abs(m.drop.left - m.q.left), 'and is aligned to it horizontally').toBeLessThan(2);
      expect(Math.abs(m.drop.w - m.q.w), 'and is its width').toBeLessThan(2);
    });
  }

  test(`the ingredient dropdown stays on a short viewport and can still be scrolled @${width}`, async ({ page }) => {
    await openTheBuilder(page, width, 'light');
    // 420 stands in for a phone with the keyboard up. `45vh` cannot see that; the engine can.
    await page.setViewportSize({ width, height: 420 });
    await page.waitForTimeout(200);
    await page.locator('#q').fill('');
    await page.locator('#q').fill('chip');
    await page.waitForTimeout(400);

    const m = await page.evaluate((r) => {
      const R = eval('(' + r + ')');
      const d = document.getElementById('drop');
      return { drop: R('#drop'), opts: d.querySelectorAll('.opt').length,
        scrollH: d.scrollHeight, clientH: d.clientHeight, vh: window.innerHeight };
    }, rect.toString());

    expect(m.opts, 'there is a long list to clamp').toBeGreaterThan(6);
    /* 4a. on v172 this was 35px BELOW the viewport, and that surplus was unreachable */
    expect(m.drop.bottom, 'the list ends inside the viewport').toBeLessThanOrEqual(m.vh + 1);
    expect(m.drop.top, 'and starts inside it').toBeGreaterThanOrEqual(-1);
    /* 4b. and clamping did not just delete the feature */
    expect(m.drop.h, 'the list is still usably tall').toBeGreaterThan(80);
    expect(m.scrollH, 'and the part that did not fit is reachable by scrolling')
      .toBeGreaterThan(m.clientH + 1);
  });
}

test('the dropdown fades in and no longer bounces', async ({ page }) => {
  await openTheBuilder(page, 380, 'light');
  const kf = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const r of rules) {
        if (r.type === CSSRule.KEYFRAMES_RULE && r.name === 'dropIn') {
          for (const k of r.cssRules) out.push({ key: k.keyText, css: k.style.cssText });
        }
      }
    }
    return { frames: out, applied: getComputedStyle(document.getElementById('drop')).animationName };
  });
  expect(kf.frames.length, 'the dropIn keyframes still exist').toBeGreaterThan(0);
  const all = kf.frames.map((f) => f.css).join(' ');
  /* 5. Max: "the bounce animation is annoying". The TRANSFORM is the bounce; the opacity is the
     fade, and a layer appearing with no transition at all reads as a repaint glitch — so this
     asserts both directions rather than "there is no animation". */
  expect(all, 'the translateY bounce is gone').not.toContain('transform');
  expect(all, 'and the fade it was riding on is kept').toContain('opacity');
});

test('the dashboard scope popover is placed by the engine and stays on screen @380', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 780 });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(DASH_SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(400);
  await page.locator('#dashScopeBtn').click();
  await page.waitForTimeout(300);

  const m = await page.evaluate((r) => {
    const R = eval('(' + r + ')');
    const p = document.querySelector('.dash-menus-pop');
    return { pos: getComputedStyle(p).position, pop: R('.dash-menus-pop'), btn: R('#dashScopeBtn'),
      rows: p.querySelectorAll('.mcmp-row').length, vw: window.innerWidth, vh: window.innerHeight };
  }, rect.toString());

  expect(m.rows, 'the popover has its scope rows').toBeGreaterThan(1);
  /* 6. it was position:absolute with a width clamp and no flip and no re-anchor */
  expect(m.pos, 'the engine placed it').toBe('fixed');
  expect(m.pop.right, 'it stays inside the right edge').toBeLessThanOrEqual(m.vw + 1);
  expect(m.pop.left, 'and the left').toBeGreaterThanOrEqual(-1);
  expect(m.pop.bottom, 'and the bottom').toBeLessThanOrEqual(m.vh + 1);
  expect(m.pop.w, 'and it kept its own width rather than the button\'s').toBeGreaterThan(m.btn.w);
});
