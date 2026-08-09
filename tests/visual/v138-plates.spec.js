/*
 * v138-plates.spec.js — the Plates library, REBUILT from the v3 mock (F2; §3.3 desktop, §6 mobile).
 *
 * Succeeds v135-plates.spec.js, which pinned the skinned `.ing-card` version of this screen.
 * Its two durable pins are carried over verbatim in substance:
 *   - a row click opens the ACTION CHOOSER, not the builder (F7 flips this, consciously);
 *   - neither empty state renders the column band, because a band over an empty state
 *     labels nothing.
 * Everything else here is new, and the two things worth pinning are the ones the v135 review
 * had to MEASURE to find: the band and the rows are separate grid containers whose columns must
 * still line up, and the row's focus ring must survive the container's overflow clip.
 *
 * Run: npx playwright test tests/visual/v138-plates.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

function seed() {
  return (a) => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Original' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify(a.withPlates ? [
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, label: 'x', cost: 3 }] },
      { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, label: 'x', cost: 3.6 }] },
      { id: 'PL3', name: 'Soup', category: 'Dinner', lines: [] }] : []));   // an UNCOSTED plate rides along — its wide "not costed" cell is what drifted the columns before v135 fixed the tracks
    localStorage.setItem('cafeDB_menu', JSON.stringify(a.withPlates ? [
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 12, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' }] : []));
    localStorage.setItem('cafeDB_lastTab', 'builder');
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page, withPlates, width) {
  await page.setViewportSize({ width: width || 1280, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), { withPlates });
  await page.goto('/');
  await page.waitForTimeout(1500);
}

test('desktop: the band labels the three columns and they align with EVERY row, uncosted included', async ({ page }) => {
  await boot(page, true);
  const band = page.locator('#plateList > .plib-band');
  await expect(band).toBeVisible();
  await expect(band).toHaveText('PlatePublishedPlate cost');

  // the band and the rows are separate grid containers. A max-content track resolves per
  // container, which is how the middle column drifted by up to 27px between rows before the
  // tracks were fixed. Assert the ALIGNMENT, not the template — a future re-track that still
  // lines up is allowed to pass.
  const geo = await page.evaluate(() => {
    const l = (e) => e.getBoundingClientRect().left;
    const r = (e) => e.getBoundingClientRect().right;
    const rows = [...document.querySelectorAll('#plateList > .plib-row')];
    return {
      rows: rows.length,
      bandPubLeft: l(document.querySelector('.plib-band > span:nth-child(2)')),
      bandCostRight: r(document.querySelector('.plib-bnum')),
      pubLefts: rows.map((row) => l(row.querySelector('.plib-pub'))),
      costRights: rows.map((row) => r(row.querySelector('.plib-cost'))),
      secondRowBottom: getComputedStyle(rows[0]).borderBottomWidth,
      lastRowBottom: getComputedStyle(rows[rows.length - 1]).borderBottomWidth,
      bandBottom: getComputedStyle(document.querySelector('.plib-band')).borderBottomWidth,
    };
  });
  expect(geo.rows, 'exactly the three seeded plates render — the band is NOT one of them').toBe(3);
  for (const left of geo.pubLefts) {
    expect(Math.abs(left - geo.bandPubLeft), 'Published sits on the header\'s left edge on every row').toBeLessThanOrEqual(1.5);
  }
  for (const right of geo.costRights) {
    expect(Math.abs(right - geo.bandCostRight), 'the money column ends on the header\'s right edge on every row').toBeLessThanOrEqual(1.5);
  }
  // hairlines divide rows from EACH OTHER; the last row does not draw one against the container edge
  expect(geo.secondRowBottom, 'row-to-row hairline').toBe('1px');
  expect(geo.lastRowBottom, 'no hairline under the last row — the container border is already there').toBe('0px');
  expect(geo.bandBottom, 'the band divides itself from the rows').toBe('1px');
});

test('desktop: published-when-live is the accent, unpublished is muted, and money is mono tabular', async ({ page }) => {
  await boot(page, true);
  const paint = await page.evaluate(() => {
    const row = (name) => [...document.querySelectorAll('#plateList > .plib-row')]
      .find((r) => r.querySelector('.plib-name').textContent === name);
    const cs = (e) => getComputedStyle(e);
    return {
      onColor: cs(row('Toastie').querySelector('.plib-pub')).color,
      onText: row('Toastie').querySelector('.plib-pub').textContent,
      offColor: cs(row('Burger').querySelector('.plib-pub')).color,
      offText: row('Burger').querySelector('.plib-pub').textContent,
      mutedText: cs(document.querySelector('.plib-band')).color,
      costFamily: cs(row('Toastie').querySelector('.plib-cost')).fontFamily,
      costNumeric: cs(row('Toastie').querySelector('.plib-cost')).fontVariantNumeric,
      costText: row('Toastie').querySelector('.plib-cost').textContent,
      nilText: row('Soup').querySelector('.plib-cost').textContent,
      nilColor: cs(row('Soup').querySelector('.plib-cost')).color,
    };
  });
  expect(paint.onText).toBe('On Original');
  expect(paint.onColor, 'accent when live — v55\'s shipped colour, confirmed by §3.3').toBe('rgb(184, 78, 12)');
  expect(paint.offText).toBe('Unpublished');
  expect(paint.offColor, 'unpublished reads muted, the same muted the band uses').toBe(paint.mutedText);
  expect(paint.costFamily, '§4: Geist Mono on every figure').toMatch(/Geist Mono/);
  expect(paint.costNumeric).toBe('tabular-nums');
  expect(paint.costText).toBe('$3.00');
  // §B survives the rebuild: an uncosted plate says so; it never shows a misleading $0.00
  expect(paint.nilText).toBe('not costed');
  expect(paint.nilColor).toBe(paint.mutedText);
});

test('mobile: two-line rows — no band, no container border, meta reads "category, publish state"', async ({ page }) => {
  await boot(page, true, 380);
  await expect(page.locator('#plateList > .plib-band')).toBeHidden();
  const m = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#plateList > .plib-row')];
    const toastie = rows.find((r) => r.querySelector('.plib-name').textContent === 'Toastie');
    const nameBox = toastie.querySelector('.plib-name').getBoundingClientRect();
    const pubBox = toastie.querySelector('.plib-pub').getBoundingClientRect();
    const catBox = toastie.querySelector('.plib-cat').getBoundingClientRect();
    const costBox = toastie.querySelector('.plib-cost').getBoundingClientRect();
    return {
      listBorder: getComputedStyle(document.getElementById('plateList')).borderBottomWidth,
      rowHeight: toastie.getBoundingClientRect().height,
      // the meta pair sits BELOW the name and on ONE line with it
      metaBelowName: catBox.top >= nameBox.bottom - 1,
      pubBesideCat: Math.abs(pubBox.top - catBox.top) <= 1 && pubBox.left >= catBox.right - 1,
      // money right, on the row's right edge and vertically centred across both lines
      costRightmost: costBox.right > pubBox.right,
      catSep: getComputedStyle(toastie.querySelector('.plib-cat'), '::after').content,
      /* The separator is generated content, so it is not in textContent and getComputedStyle
         reports the SPECIFIED string — `content:", "` reads back with its space even though a
         trailing space collapses when rendered. Only a measurement can tell, so: how much wider
         is the rendered category than the same text with a bare comma? */
      sepWidth: (() => {
        const el = toastie.querySelector('.plib-cat');
        const probe = document.createElement('span');
        probe.textContent = el.textContent + ',';
        const cs = getComputedStyle(el);
        probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
        document.body.appendChild(probe);
        const w = el.getBoundingClientRect().width - probe.getBoundingClientRect().width;
        probe.remove();
        return w;
      })(),
      pubCase: getComputedStyle(toastie.querySelector('.plib-pub'), '::first-letter').textTransform,
    };
  });
  expect(m.listBorder, 'the mock draws no container on mobile — rows sit on the page').toBe('0px');
  expect(m.rowHeight, '§6: minimum 56px row').toBeGreaterThanOrEqual(56);
  expect(m.metaBelowName, 'meta line stacks under the name').toBe(true);
  expect(m.pubBesideCat, 'category and publish state share the meta line').toBe(true);
  expect(m.costRightmost, 'money right — the reading direction never changes (§6.1)').toBe(true);
  expect(m.catSep).toContain(',');
  expect(m.pubCase, 'the mock writes the meta line lowercase; ONE string in the DOM, cased by CSS').toBe('lowercase');
  // a trailing space inside `content` collapses, which rendered "Breakfast,on Winter Menu"
  expect(m.sepWidth, 'the separator renders a real space after the comma').toBeGreaterThan(2);

  // §6: the mobile header is title + ONE action. With the desktop subtitle visible it wrapped
  // the action onto a second line — pin the single row, not just the hidden element.
  const head = await page.evaluate(() => {
    const h = document.querySelector('#tab-builder .scr-head');
    const t = h.querySelector('h2').getBoundingClientRect();
    const b = h.querySelector('.btn').getBoundingClientRect();
    return {
      subShown: getComputedStyle(h.querySelector('.scr-sub')).display,
      sameRow: Math.abs(t.top - b.top) < b.height,
      noteShown: getComputedStyle(document.getElementById('plateListNote')).display,
    };
  });
  expect(head.subShown, 'no subtitle on the mobile header').toBe('none');
  expect(head.sameRow, 'title and the one action share a row').toBe(true);
  expect(head.noteShown, 'the desktop footnote does not follow onto the phone').toBe('none');
});

test('a row click opens the ACTION CHOOSER — the builder handoff is F7\'s, not this batch\'s', async ({ page }) => {
  await boot(page, true);
  await page.click('#plateList .plib-row >> nth=0');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateActionsModal')).toBeVisible();
  await expect(page.locator('#builderModal')).not.toBeVisible();
});

test('the focus ring survives the container clip — the v123 defect must not be re-earned', async ({ page }) => {
  await boot(page, true);
  const ring = await page.evaluate(() => {
    const row = document.querySelector('#plateList > .plib-row');
    row.focus();
    const cs = getComputedStyle(row);
    const list = document.getElementById('plateList');
    return {
      width: cs.outlineWidth,
      offset: cs.outlineOffset,
      clipped: getComputedStyle(list).overflow,
      rowTop: row.getBoundingClientRect().top,
      listTop: list.getBoundingClientRect().top,
    };
  });
  // the container clips, and the row's border box coincides with its padding box — an OUTWARD
  // ring is invisible there. The offset must be negative, i.e. drawn inside the row.
  expect(ring.clipped).toBe('hidden');
  expect(parseFloat(ring.width)).toBeGreaterThan(0);
  expect(parseFloat(ring.offset), 'inset ring — an outward one dies in the clip').toBeLessThan(0);
});

test('the header title is the v3 bar type, not the old uppercase eyebrow', async ({ page }) => {
  await boot(page, true);
  // `.scr-head > h2` alone ties `.panel h2` on specificity (both 0-1-1), so which one won would
  // depend on file order — the pre-push review flagged it. The selector is `.panel > .scr-head > h2`
  // now; this fails if anything flips the header back to the eyebrow, whatever the mechanism.
  const t = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#tab-builder .scr-head > h2'));
    return { size: cs.fontSize, weight: cs.fontWeight, transform: cs.textTransform, border: cs.borderBottomWidth };
  });
  expect(t.size).toBe('15px');
  expect(t.weight).toBe('600');
  expect(t.transform, 'sentence case — the uppercase eyebrow is the OLD idiom').toBe('none');
  expect(t.border, 'the hairline belongs to the bar, not the title').toBe('0px');
});

test('the header subtitle counts the whole library, not the filtered view', async ({ page }) => {
  await boot(page, true);
  await expect(page.locator('#plateHeadSub')).toHaveText('3 plates, 1 not costed, 2 unpublished');
  await page.fill('#plateSearch', 'Toastie');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateList > .plib-row')).toHaveCount(1);
  await expect(page.locator('#plateHeadSub'), 'a search narrows the list, not what you own')
    .toHaveText('3 plates, 1 not costed, 2 unpublished');
});

test('no band and no footnote on either empty state — both would label nothing', async ({ page }) => {
  await boot(page, true);
  await expect(page.locator('#plateListNote')).toBeVisible();
  // filtered-empty
  await page.fill('#plateSearch', 'zzz-no-such-plate');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateList .empty-state')).toBeVisible();
  await expect(page.locator('#plateList > .plib-band')).toHaveCount(0);
  await expect(page.locator('#plateListNote')).toBeHidden();
  await page.click('#plateList .es-clear');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateList > .plib-band')).toHaveCount(1);
  await expect(page.locator('#plateListNote')).toBeVisible();
});

test('true-empty: §5\'s composed onboarding card, no band, no subtitle, no dead controls', async ({ page }) => {
  await boot(page, false);
  await expect(page.locator('#plateList .empty-state h3')).toHaveText('Cost your first plate');
  await expect(page.locator('#plateList .es-actions .btn.primary')).toHaveText('New plate');
  await expect(page.locator('#plateList > .plib-band')).toHaveCount(0);
  await expect(page.locator('#plateListNote')).toBeHidden();
  // the subtitle counts nothing, so it says nothing — the empty state is doing the talking
  await expect(page.locator('#plateHeadSub')).toHaveText('');
  // `fillFilter` runs only on the rows-present branch, so on this branch the select has NO options.
  // Left visible it is a dropdown that opens onto nothing — the R4 rule applies to a control the
  // app fails to fill just as much as to one the mock invented.
  await expect(page.locator('#plateControls')).toBeHidden();
  await expect(page.locator('#plateCatFilter option')).toHaveCount(0);
});

test('the FILTERED empty state keeps its controls — clearing them is the way out', async ({ page }) => {
  await boot(page, true);
  await page.fill('#plateSearch', 'zzz-no-such-plate');
  await page.waitForTimeout(300);
  await expect(page.locator('#plateList .empty-state')).toBeVisible();
  await expect(page.locator('#plateControls')).toBeVisible();
  await expect(page.locator('#plateSearch')).toHaveValue('zzz-no-such-plate');
});
