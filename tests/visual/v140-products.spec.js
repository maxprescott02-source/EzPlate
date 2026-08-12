/*
 * v140-products.spec.js — the Products list, REBUILT from the v3 mock (F4; §3.5 desktop, §6 mobile).
 *
 * Succeeds q7-products.spec.js, which pinned the Q7 (v126) version: one surface of rows over the old
 * card language, a floating mobile add, and steps at 640/900/1024. Three of its pins are carried
 * over in substance and one is consciously REVERSED:
 *   - carried: the drift figure renders, a rise is classed up and a fall down (with the true minus);
 *   - carried: v99's basis flag renders on an unknown-basis product;
 *   - carried: the rows share one left edge on one bordered surface (desktop);
 *   - REVERSED: "untouched products read as a dash". The mock words that cell "steady" and F3 already
 *     ships it that way for the same figure on Ingredients, so a dash would leave the two screens
 *     saying different things about one function's output. R1, flipped here rather than worked around.
 *   - RETIRED: every floating-add assertion. The button is deleted — §6.1 puts the primary action in
 *     the screen header on both platforms, so a second control for the same intent was §7's forbidden
 *     duplicate. Its absence is pinned below so it cannot drift back in.
 *
 * Run: npx playwright test tests/visual/v140-products.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

/* The 393-row fixture carries NO supplier on any product and a category on every one, so both
   placeholder states have to be staged. They go through the real writer (`setProduct`) rather than
   being poked into PRODUCTS, which is module-scoped — the same route q7 used. */
async function boot(page, width, errs, opts = {}) {
  await page.setViewportSize({ width: width || 1280, height: 900 });
  await installBoot(page, opts);
  if (errs) {
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });   // renderIngredients failures surface via console.error, not pageerror
  }
  await page.goto('/');
  await page.waitForTimeout(1500);
  if (!opts.noProducts) {
    await page.evaluate(() => {
      const b = document.querySelector('.install-banner'); if (b) b.remove();
      // a rise on P0108 (+12.0%) and a DROP on P0002 (−8.0%)
      window.ingPriceLog.P0108 = [{ t: Date.now() - 86400000, v: 0.01 }, { t: Date.now(), v: 0.0112 }];
      window.ingPriceLog.P0002 = [{ t: Date.now() - 86400000, v: 0.02 }, { t: Date.now(), v: 0.0184 }];
      window.setProduct('P0108', { supplier: 'Bidfood' });          // the only row with a supplier
      window.setProduct('P0002', { base_unit: 'unknown', category: '' });   // basis flag AND a category-less row
    });
  }
  await gotoTab(page, 'ingredients');   // 171: Products is under More below 1024 — drive the real route at the real width
  await page.waitForTimeout(400);
  await page.evaluate(() => window.renderIngredients());
  await page.waitForTimeout(200);
}

/* ⚠ REWRITTEN 12 Aug 2026: FIVE columns became FOUR. The Supplier column is dropped at desktop —
   counted against the live catalogue, 19 of 412 products carry one and there are 3 distinct values
   in all — so its 140px went to the name and the category. The cell is still EMITTED (the phone's
   meta line reads "Category, Supplier", which is the mobile mock's own row); only the desktop column
   is hidden. Rewritten rather than deleted so a silent return of the column fails here. */
test('desktop: the band labels four columns, and every row lines up with it', async ({ page }) => {
  const errs = [];
  await boot(page, 1280, errs);
  const band = page.locator('#ingList > .ing-band');
  await expect(band).toBeVisible();
  /* ⚠ The mock's fourth heading is "Pack price" and this app's figure is a per-base-unit cost
     ("$3.45/kg"), computed by dispPrice — the pack price is a different number living on the edit
     form. The honest heading is pinned so a later "make it match the mock" pass has to argue with a
     failing test rather than quietly relabel a figure. Same refusal F3 made of "30-day change". */
  await expect(band).toHaveText('ProductCategoryUnit costLast change');

  const geo = await page.evaluate(() => {
    const l = (e) => e.getBoundingClientRect().left;
    const r = (e) => e.getBoundingClientRect().right;
    const rows = [...document.querySelectorAll('#ingList > .ing-card')].slice(0, 25);
    return {
      rows: rows.length,
      bandCatLeft: l(document.querySelector('.ing-band > span:nth-child(2)')),
      bandCells: document.querySelectorAll('.ing-band > span').length,
      bandChangeRight: r(document.querySelector('.ing-band > span:nth-child(4)')),
      catLefts: rows.map((row) => l(row.querySelector('.ing-tag:not(.sup)'))),
      // still in the DOM for the phone, and hidden here — asserted, not assumed
      supPresent: rows.every((row) => !!row.querySelector('.ing-tag.sup')),
      supHidden: rows.every((row) => getComputedStyle(row.querySelector('.ing-tag.sup')).display === 'none'),
      driftRights: rows.map((row) => r(row.querySelector('.ing-drift'))),
      oneEdge: new Set(rows.map((row) => Math.round(l(row)))).size,
      midRowBottom: getComputedStyle(rows[1]).borderBottomWidth,
      bandBottom: getComputedStyle(document.querySelector('.ing-band')).borderBottomWidth,
      surface: (() => { const cs = getComputedStyle(document.getElementById('ingList')); return cs.overflow === 'hidden' && cs.borderTopWidth === '1px'; })(),
    };
  });
  expect(geo.surface, 'one bordered, clipped surface at desktop').toBe(true);
  expect(geo.oneEdge, 'rows share one left edge').toBe(1);
  /* The band and the rows are SEPARATE grid containers. A max-content track resolves per container,
     which is how a middle column drifted by up to 27px between rows before v135's review measured
     it. Assert the ALIGNMENT, not the template — a future re-track that still lines up may pass. */
  for (const left of geo.catLefts) {
    expect(Math.abs(left - geo.bandCatLeft), 'Category sits on its header\'s left edge on every row').toBeLessThanOrEqual(1.5);
  }
  expect(geo.bandCells, 'four headings, not five').toBe(4);
  expect(geo.supPresent, 'the supplier cell is still emitted — the phone reads it on the meta line').toBe(true);
  expect(geo.supHidden, 'and it is hidden at desktop rather than deleted from the row').toBe(true);
  for (const right of geo.driftRights) {
    expect(Math.abs(right - geo.bandChangeRight), 'the change column ends on its header\'s right edge on every row').toBeLessThanOrEqual(1.5);
  }
  expect(geo.midRowBottom, 'row-to-row hairline').toBe('1px');
  expect(geo.bandBottom, 'the band divides itself from the rows').toBe('1px');
  expect(errs.filter((e) => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'console clean').toHaveLength(0);
});

/* ⚠ REWRITTEN 12 Aug 2026: "steady" became a dash (Max). The mock's fixture never shows more than
   three unchanged rows at once; Scoopy's shows fifteen of fifteen, and a page of the same word reads
   as noise where a dash reads as "nothing here" — which is what every other empty cell in the app
   already renders. The muted, un-tinted, mono treatment is unchanged; only the glyph moved, and the
   assertions below still pin that it is NOT a pill. */
test('desktop: the change cell is a tinted mono pill, or a muted dash', async ({ page }) => {
  await boot(page, 1280);
  const d = await page.evaluate(() => {
    const drift = (id) => document.querySelector(`#ingList > .ing-card[data-id="${id}"]`).querySelector('.ing-drift');
    const cs = (e) => getComputedStyle(e);
    const steadyRow = [...document.querySelectorAll('#ingList > .ing-card')]
      .find((r) => r.querySelector('.ing-drift').classList.contains('none'));
    return {
      up: drift('P0108').textContent,
      upCls: drift('P0108').classList.contains('up'),
      upBg: cs(drift('P0108')).backgroundColor,
      upFg: cs(drift('P0108')).color,
      down: drift('P0002').textContent,
      downCls: drift('P0002').classList.contains('down'),
      downFg: cs(drift('P0002')).color,
      steady: steadyRow ? steadyRow.querySelector('.ing-drift').textContent : null,
      steadyBg: steadyRow ? cs(steadyRow.querySelector('.ing-drift')).backgroundColor : null,
      family: cs(drift('P0108')).fontFamily,
      numeric: cs(drift('P0108')).fontVariantNumeric,
    };
  });
  expect(d.up, 'the logged rise renders').toBe('+12.0%');
  expect(d.upCls, 'a rise is classed up — price up is worse').toBe(true);
  expect(d.down, 'a DROP renders with the true minus sign, not a hyphen').toBe('−8.0%');
  expect(d.downCls).toBe(true);
  expect(d.upFg).not.toBe(d.downFg);
  expect(d.upBg, 'a real move is a TINTED pill (mock §3.5)').not.toBe('rgba(0, 0, 0, 0)');
  // no logged move reads as a dash, matching what Ingredients says about the same figure
  expect(d.steady, 'untouched products read a dash, not the word "steady"').toBe('—');
  expect(d.steadyBg, 'and the dash is not a pill — it is the absence of news').toBe('rgba(0, 0, 0, 0)');
  expect(d.family, '§4: Geist Mono on every figure').toMatch(/Geist Mono/);
  expect(d.numeric).toBe('tabular-nums');
});

test('v99: the basis flag renders exactly where the figure cannot carry it', async ({ page }) => {
  await boot(page, 1280);
  const d = await page.evaluate(() => {
    const q = (id, sel) => document.querySelector(`#ingList > .ing-card[data-id="${id}"]`).querySelector(sel);
    return {
      // P0002 was given an unknown base_unit, so dispPrice's "/unit" is a GUESS and the real basis shows
      flagged: q('P0002', '.ing-per') ? q('P0002', '.ing-per').textContent : null,
      flagColour: q('P0002', '.ing-per') ? getComputedStyle(q('P0002', '.ing-per')).color : null,
      // a normal product's figure states its own basis, so the label would only repeat it
      normal: q('P0108', '.ing-per'),
      normalFigure: q('P0108', '.ing-price b').textContent,
      mono: getComputedStyle(q('P0108', '.ing-price b')).fontFamily,
    };
  });
  expect(d.flagged, 'an unknown basis is named beside the figure — the v20 eggs bug made this a correctness flag').toBeTruthy();
  expect(d.normal, 'and it does NOT render where the figure already says "/kg" — v126 deduped, it did not hide').toBeNull();
  expect(d.normalFigure).toMatch(/^\$[\d.]+\/(kg|L|unit)$/);
  const brand = await page.evaluate(() => {
    /* the SHORTEST branded name on screen, deliberately: with `flex:0 1 auto` the name no longer
       grows, so slack at the cell edge only exists on a row that has any — picking whichever row
       came first would make this assertion depend on the fixture's alphabetical order. */
    const row = [...document.querySelectorAll('#ingList > .ing-card')]
      .filter((r) => r.querySelector('.ing-brand') && r.querySelector('.ing-brand').textContent)
      .sort((a, b) => a.querySelector('.ing-name').textContent.length - b.querySelector('.ing-name').textContent.length)[0];
    const n = row.querySelector('.ing-name').getBoundingClientRect();
    const b = row.querySelector('.ing-brand').getBoundingClientRect();
    return {
      shown: getComputedStyle(row.querySelector('.ing-brand')).display,
      sameLine: Math.abs(n.top - b.top) <= 2,
      gap: b.left - n.right,
      cellRight: row.querySelector('.ing-main').getBoundingClientRect().right,
      brandRight: b.right,
    };
  });
  expect(brand.shown, 'the desktop mock draws the brand beside the name (§3.5)').not.toBe('none');
  expect(brand.sameLine, 'INLINE with it — a wrap here is the third line the phone caught').toBe(true);
  /* ADJACENT, not pushed to the column edge. A growing `.ing-name` flung the brand to the far right
     of column 1, which reads as a second column rather than as part of the name. */
  expect(brand.gap, 'the brand sits right after the name').toBeLessThan(12);
  expect(brand.cellRight - brand.brandRight, 'so there is slack left at the cell edge, not before it').toBeGreaterThan(12);
  expect(d.mono, '§4: money is mono').toMatch(/Geist Mono/);
});

/* ⚠ REWRITTEN 12 Aug 2026 with the Supplier column. The CATEGORY half is unchanged and still the
   point: a desktop column needs a cell, so an absent value renders a dash there and is simply absent
   on the phone. The SUPPLIER half inverts — the column is gone, so the correct desktop state is a
   cell that still exists in the DOM (the phone's meta line needs it) and is not displayed. Asserting
   both halves is what stops the cell being deleted outright, which would take the value off the
   phone as well as off the table. */
test('desktop: an absent category renders a placeholder dash, and the supplier cell is hidden not deleted', async ({ page }) => {
  await boot(page, 1280);
  const d = await page.evaluate(() => {
    const row = document.querySelector('#ingList > .ing-card[data-id="P0002"]');   // category cleared in boot()
    const other = document.querySelector('#ingList > .ing-card[data-id="P0108"]'); // the one row WITH a supplier
    const cs = (e) => getComputedStyle(e);
    return {
      catText: row.querySelector('.ing-tag:not(.sup)').textContent,
      catShown: cs(row.querySelector('.ing-tag:not(.sup)')).display,
      catIsNil: row.querySelector('.ing-tag:not(.sup)').classList.contains('is-nil'),
      supNilText: row.querySelector('.ing-tag.sup').textContent,
      supNilShown: cs(row.querySelector('.ing-tag.sup')).display,
      realSup: other.querySelector('.ing-tag.sup').textContent,
      // and no separator leaks into a column that has its own header
      catBefore: cs(row.querySelector('.ing-tag:not(.sup)'), '::before').content,
      supBefore: cs(other.querySelector('.ing-tag.sup'), '::before').content,
      noCatSupBefore: cs(row.querySelector('.ing-tag.sup'), '::before').content,
    };
  });
  expect(d.catIsNil, 'an empty category is marked as a placeholder, not left bare').toBe(true);
  expect(d.catText).toBe('—');
  expect(d.catShown, 'and the placeholder is VISIBLE at desktop — the mobile rule must not win here').not.toBe('none');
  expect(d.supNilText, 'the cell still renders its placeholder — the phone hides it via is-nil, not via this').toBe('—');
  expect(d.supNilShown, 'but no supplier is displayed at desktop: the column is dropped').toBe('none');
  expect(d.realSup, 'and a REAL supplier is still in the DOM for the phone to read').toBe('Bidfood');
  /* The mobile middot rules are (0,2,0) and (0,3,0), and a single desktop `.ing-tag.sup::before`
     cancels only the first. Scope note, because it was measured rather than assumed: dropping the
     second cancel changes NOTHING on screen today — the no-cat rule's value is an empty string, so
     the leak renders as nothing either way — and this pair of assertions passes against that plant.
     What they do catch is the state F3 actually shipped, a leaked separator with real content in it,
     which the mobile spec below fails on. Both are asserted so the column can never grow one. */
  expect(d.supBefore, 'no separator in a column with its own header').toMatch(/^(none|normal|"")$/);
  expect(d.noCatSupBefore, 'and none on a category-less row either — the (0,3,0) rule is cancelled too').toMatch(/^(none|normal|"")$/);
  expect(d.catBefore).toMatch(/^(none|normal|"")$/);
});

test('mobile: two-line rows, no band, no container, "Category · Supplier" under the name', async ({ page }) => {
  const errs = [];
  await boot(page, 380, errs);
  await expect(page.locator('#ingList > .ing-band')).toBeHidden();
  const m = await page.evaluate(() => {
    const row = document.querySelector('#ingList > .ing-card[data-id="P0108"]');   // has a supplier AND a category
    const nil = document.querySelector('#ingList > .ing-card[data-id="P0002"]');   // category cleared
    const box = (e) => e.getBoundingClientRect();
    const nameB = box(row.querySelector('.ing-name'));
    const metaB = box(row.querySelector('.ing-meta'));
    const priceB = box(row.querySelector('.ing-price'));
    const driftB = box(row.querySelector('.ing-drift'));
    const sup = row.querySelector('.ing-tag.sup');
    /* The separator is generated content, so it is not in textContent and getComputedStyle reports
       the SPECIFIED string — a trailing space reads back even though it collapses when rendered.
       Only a measurement tells the truth (F2 found "Breakfast,on Winter Menu" that way). */
    const probe = document.createElement('span');
    probe.textContent = sup.textContent;
    const cs = getComputedStyle(sup);
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font:${cs.font};letter-spacing:${cs.letterSpacing}`;
    document.body.appendChild(probe);
    const sepWidth = box(sup).width - box(probe).width;
    probe.remove();
    return {
      listBorder: getComputedStyle(document.getElementById('ingList')).borderBottomWidth,
      rowHeight: box(row).height,
      metaBelowName: metaB.top >= nameB.bottom - 1,
      priceRight: priceB.right > metaB.right,
      driftUnderPrice: driftB.top >= priceB.bottom - 4,
      driftRightAligned: Math.abs(driftB.right - priceB.right) <= 1.5,
      sepWidth,
      // R1: the mobile mock's row carries no brand at all — keeping it truncated the NAME
      brandShown: getComputedStyle(row.querySelector('.ing-brand')).display,
      /* the LONGEST name on screen: it is the one that has to truncate, so it is the one that
         proves the identity cell is not being shared. A short name legitimately leaves slack. */
      longestNameFills: (() => {
        const r = [...document.querySelectorAll('#ingList > .ing-card')]
          .sort((a, b) => b.querySelector('.ing-name').textContent.length - a.querySelector('.ing-name').textContent.length)[0];
        return box(r.querySelector('.ing-name')).width >= box(r.querySelector('.ing-main')).width - 1;
      })(),
      sepChar: getComputedStyle(sup, '::before').content,
      // the phone has no columns, so an absent value is absent — not a row of dashes
      nilCatShown: getComputedStyle(nil.querySelector('.ing-tag:not(.sup)')).display,
      nilSupShown: getComputedStyle(nil.querySelector('.ing-tag.sup')).display,
      // …and with no category there is nothing to separate FROM, so no leading middot
      noCatSep: getComputedStyle(nil.querySelector('.ing-tag.sup'), '::before').content,
    };
  });
  expect(m.listBorder, 'the mock draws no container on mobile — rows sit on the page').toBe('0px');
  expect(m.rowHeight, '§6: minimum 56px row').toBeGreaterThanOrEqual(56);
  expect(m.metaBelowName, 'the meta line stacks under the name').toBe(true);
  expect(m.priceRight, 'money right — the reading direction never changes (§6.1)').toBe(true);
  expect(m.driftUnderPrice, 'the change pill stacks under the price').toBe(true);
  expect(m.driftRightAligned, 'and shares its right edge').toBe(true);
  expect(m.brandShown, 'no brand on the phone — the mock drops it, and it cost the name its room').toBe('none');
  expect(m.longestNameFills, 'so a long name gets the WHOLE identity cell before it truncates').toBe(true);
  expect(m.sepChar, 'the mock separates the pair with a comma, as the Plates row already does').toContain(',');
  /* a trailing space inside `content` COLLAPSES — that shipped "Breakfast,on Winter Menu" on F2 —
     and getComputedStyle reports the specified string either way, so only a measurement tells. */
  expect(m.sepWidth, 'the separator renders a real comma plus a real space').toBeGreaterThan(2);
  expect(m.nilCatShown, 'no dash placeholders on a phone — there are no columns to fill').toBe('none');
  expect(m.nilSupShown).toBe('none');
  expect(m.noCatSep, 'a category-less row gets no dangling separator').toMatch(/^(none|"")$/);
  expect(errs.filter((e) => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'console clean').toHaveLength(0);
});

test('the floating add is GONE, and the header carries the one primary at both widths', async ({ page }) => {
  for (const width of [380, 1280]) {
    await boot(page, width);
    await expect(page.locator('#prodFab, .fab'), `no floating add at ${width}`).toHaveCount(0);
    const h = await page.evaluate(() => {
      const head = document.querySelector('#tab-ingredients .scr-head');
      const primary = head.querySelector('.btn.primary');
      const second = head.querySelector('.plib-btn2');
      const t = head.querySelector('h2').getBoundingClientRect();
      return {
        primaryId: primary.id,
        primaryText: primary.textContent,
        secondId: second.id,
        // §6's header is one row; a wrap is what the mobile Plates header did before it was caught
        oneRow: Math.abs(t.top - primary.getBoundingClientRect().top) < primary.getBoundingClientRect().height
          && Math.abs(second.getBoundingClientRect().top - primary.getBoundingClientRect().top) < 2,
        primaryRightmost: primary.getBoundingClientRect().left > second.getBoundingClientRect().left,
      };
    });
    expect(h.primaryId, 'the header primary IS the same button the old actions row held').toBe('newBtn');
    expect(h.primaryText, '§7: one label per intent — "New product", never the mock\'s "Add product"').toBe('New product');
    /* RECORDED DEVIATION. §6's mobile header is "title + one action max" and this screen ships two:
       the sidebar's Invoices entry is desktop-only, so on a phone #importBtn is the ONLY route into
       the import flow. Dropping it would strand the app's highest-value feature on the device Max
       works on. Same question F3 raised on Ingredients; both are folded into one queued decision.
       What IS pinned is that the pair behaves — one row, primary rightmost, no wrap. */
    expect(h.secondId).toBe('importBtn');
    expect(h.oneRow, `header actions share the title's row at ${width}`).toBe(true);
    expect(h.primaryRightmost, 'the primary is rightmost — §6.1\'s position for it').toBe(true);
  }
});

test('the header subtitle counts the library, and answers the filter when one is on', async ({ page }) => {
  await boot(page, 1280);
  await expect(page.locator('#ingHeadSub')).toHaveText(/^\d+ products, \d+ suppliers?$/);
  const total = await page.evaluate(() => document.querySelectorAll('#ingList > .ing-card').length);
  await page.fill('#ingSearch', 'chips');
  await page.waitForTimeout(300);
  const shown = await page.evaluate(() => document.querySelectorAll('#ingList > .ing-card').length);
  expect(shown, 'the search actually narrows the list').toBeLessThan(total);
  await expect(page.locator('#ingHeadSub'), 'filtered: it answers the search WITHOUT losing the library total')
    .toHaveText(new RegExp(`^${shown} of \\d+ products$`));
});

test('the focus ring survives the container clip, and a row click opens the EDIT modal', async ({ page }) => {
  await boot(page, 1280);
  /* Chromium decides `:focus-visible` from the LAST INPUT MODALITY, and boot() reaches this tab with
     a mouse click — so a bare `row.focus()` here does not match the pseudo-class and the row keeps
     the UA default, `outline-style:none` at `outline-width:3px`. A Tab press sets the modality to
     keyboard, which is also the only user this ring is for. */
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => {
    const row = document.querySelector('#ingList > .ing-card');
    row.focus();
    const cs = getComputedStyle(row);
    return {
      matched: row.matches(':focus-visible'),
      style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset,
      clipped: getComputedStyle(document.getElementById('ingList')).overflow,
    };
  });
  expect(ring.clipped).toBe('hidden');
  /* ⚠ `outlineWidth > 0` does NOT prove a ring is drawn — the UA default is 3px at style:none, which
     is exactly what this row reports when the pseudo-class does not match. Assert the STYLE. */
  expect(ring.matched, 'the row takes :focus-visible for a keyboard user').toBe(true);
  expect(ring.style, 'a ring is actually painted').not.toBe('none');
  expect(parseFloat(ring.width)).toBeGreaterThan(0);
  expect(parseFloat(ring.offset), 'inset ring — an outward one dies in the clip').toBeLessThan(0);

  await page.click('#ingList > .ing-card >> nth=0');
  await page.waitForTimeout(300);
  await expect(page.locator('#ingModal'), 'the row still opens the edit form — behaviour is unchanged by the rebuild').toHaveClass(/open/);
});

test('the header title is the v3 bar type, not the old uppercase eyebrow', async ({ page }) => {
  await boot(page, 1280);
  const t = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('#tab-ingredients .scr-head > h2'));
    return { size: cs.fontSize, weight: cs.fontWeight, transform: cs.textTransform, border: cs.borderBottomWidth };
  });
  expect(t.size).toBe('15px');
  expect(t.weight).toBe('600');
  expect(t.transform, 'sentence case — the uppercase eyebrow is the OLD idiom').toBe('none');
  expect(t.border, 'the hairline belongs to the bar, not the title').toBe('0px');
});

test('the FILTERED empty state keeps its controls — clearing them is the way out', async ({ page }) => {
  await boot(page, 1280);
  await expect(page.locator('#ingListNote')).toBeVisible();
  await page.fill('#ingSearch', 'zzz-no-such-product');
  await page.waitForTimeout(300);
  await expect(page.locator('#ingList .empty-state')).toBeVisible();
  await expect(page.locator('#ingList > .ing-band'), 'a band over an empty state labels nothing').toHaveCount(0);
  await expect(page.locator('#ingListNote')).toBeHidden();
  await expect(page.locator('#ingControls')).toBeVisible();
  await expect(page.locator('#ingSearch')).toHaveValue('zzz-no-such-product');
  await page.click('#ingList .es-clear');
  await page.waitForTimeout(300);
  await expect(page.locator('#ingList > .ing-band')).toHaveCount(1);
  await expect(page.locator('#ingListNote')).toBeVisible();
});

/* CARRIED FORWARD from q7-products.spec.js, which F4 retired. Its floating-add and card-language
   assertions died with the rebuild, but this one did not: `js/app.js` still actively removes a stale
   `cafeDB_prodDensity` key at boot (the v130 tombstone), and deleting the spec left that line — live,
   and boot-time so not unit-testable — with no coverage at all. Found by the pre-push review. */
test('a stale density key from the v130 era is still actively removed at boot', async ({ page }) => {
  await boot(page, 1280);
  await page.evaluate(() => localStorage.setItem('cafeDB_prodDensity', 'compact'));
  await page.reload();
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => localStorage.getItem('cafeDB_prodDensity')),
    'the retired key is cleaned up, not left as dead storage').toBe(null);
  // and the toggle it belonged to is still gone — the other half of v130's deletion
  await expect(page.locator('.seg-density, .segd'), 'no density control anywhere').toHaveCount(0);
});

test('true-empty: §5\'s composed onboarding card, no band, no dead controls', async ({ page }) => {
  const errs = [];
  await boot(page, 1280, errs, { noProducts: true });
  await expect(page.locator('#ingList .empty-state')).toBeVisible();
  await expect(page.locator('#ingList .es-actions .btn.primary'), 'import is the primary — a new café gets its catalogue from invoices').toHaveText('Import invoice');
  await expect(page.locator('#ingList .es-actions .btn:not(.primary)')).toHaveText('New product');
  await expect(page.locator('#ingList > .ing-band')).toHaveCount(0);
  await expect(page.locator('#ingListNote')).toBeHidden();
  await expect(page.locator('#ingHeadSub'), 'nothing to count, so it says nothing — the card is speaking').toHaveText('');
  /* `fillFilter` runs only on the rows-present branch, so on this branch both selects have NO
     options. Left visible they are dropdowns that open onto nothing — the same R4 rule that forbids
     a control the mock invented forbids one the app fails to fill. F2 found this the hard way. */
  await expect(page.locator('#ingControls')).toBeHidden();
  await expect(page.locator('#ingCatFilter option')).toHaveCount(0);
  await expect(page.locator('#ingSupFilter option')).toHaveCount(0);
  expect(errs.filter((e) => !/favicon|manifest|net::ERR_FAILED/i.test(e)), 'console clean').toHaveLength(0);
});
