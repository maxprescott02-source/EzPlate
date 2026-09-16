/*
 * 226-bottom-stack.spec.js — the install banner OWNS how much bottom space it takes, and every
 * rule that has to clear it reads that one number.
 *
 * WHAT BROKE, and it is two things with one cause.
 *
 * (a) THE OVERLAP the queue item names. v141 split the bottom chrome three ways — left: the sync
 *     banner, centre: the toast, right: the install banner — and that separates two of the three
 *     pairs. It cannot separate this one: the toast is centred and sized by its message, the
 *     banner is right-aligned and 400px wide, so at 1024-1440 the centre reaches into the right
 *     slot. Measured before the fix at 1024: toast x431-817 against banner x600-1000, overlapping
 *     y787-808 — the Install button and the ✕ under a pill of text. The toast is
 *     `pointer-events:none`, so nothing is BLOCKED; it is unreadable rather than unreachable.
 *
 * (b) THE ITEM MEASURED DESKTOP ONLY, AND MOBILE IS WORSE. At 380 the toast (x95-285) sat almost
 *     wholly inside the banner (x12-368) — a cover, not a clip. Recorded because the item's own
 *     numbers would have sent a reader looking for a 21px clip on a phone and finding a different
 *     shape.
 *
 * THE CAUSE, which is the item's title rather than its symptom. `114px` was hardcoded in two rules
 * (`html.has-install-banner body`, `html.has-install-banner .bld-bar`) and is
 * `90 (the height measured at DESKTOP) + 24 (the DESKTOP dock offset)`. The dock is 84 below 1024,
 * so the constant was 57px short at every phone width and 113px short once the iOS hint is open.
 * 177's comment said the two copies "cannot drift" because they share the number — true, and both
 * were wrong together. Two agreeing constants are not a measurement.
 *
 * WHY THESE ASSERTIONS. The geometry ones are POSITIVE and bounded on BOTH sides: "the toast sits
 * a small gap above the banner", not "the two rects do not intersect". `not.toBe` on a rect is
 * satisfied by moving the toast anywhere at all, including the top of the screen, which is the
 * roster's entry 190 (a denylist assertion is weaker than an equality one). The mechanism
 * assertion is the load-bearing one: it pins that the variable is PUBLISHED and equals what the
 * banner occupies. `--bottomnav-h` in this same stylesheet is read with a fallback and published by
 * nothing, so its fallback has always been the live value while a comment two rules away says it is
 * measured — the failure this file exists to make loud.
 *
 * ──────────────────────────────────────────────────────────────────────────────────────────────
 * 275 (queue item 50) — THE OTHER TWO PUBLISHERS. This file's title says "bottom stack" and it
 * measured one element of it, because the banner was the only one anyone had measured. Two more
 * reach up from the same floor and the toast was landing on both:
 *
 * (c) `.bld-bar`, THE BUILDER'S STICKY SUMMARY BAR, WHICH CARRIES SAVE. A real-length toast
 *     overlapped it at EVERY width the bar is shown at — the item named 380 only. Measured at an
 *     800px-tall viewport with a five-line costed plate: toast y616-708 against the bar at y635-735
 *     (380, where it also covers `.bfs-save` at y646-690), y700-800 (768 and 900) and y701-800
 *     (1024). Above 768 it reaches only the bar's top 8px, so the symptom is a clipped "Plate cost"
 *     rather than a buried button — same defect, quieter.
 *
 * (d) AN OPEN BOTTOM SHEET'S FOOTER, AND NINETEEN OF TWENTY ARE ALREADY FINE. A standard `.mfoot`
 *     is 76px against the toast's 92px dock, so it clears by 16 and must NOT move — a fix written
 *     as "lift the toast over sheets" would have shifted all twenty for the sake of one.
 *     `#delChoiceModal`'s footer STACKS three choices and is 127px, so the toast lands on it: one
 *     sheet out of twenty, and it is the delete-choice dialog. Both halves are asserted below,
 *     because the one that must not move is the half a blanket fix breaks silently.
 *
 * WHAT DID NOT NEED A NEW TEST, recorded so the next reader does not add one: `hide()` now removes
 * the inline `--install-banner-clear` as well as the class, because 275 collapsed the lift into a
 * single unconditional rule reading `var(…, 0px)` — and "dismissing the banner releases the reserve
 * and the lift together", at the foot of this file, goes red on its own if that removal is dropped
 * (a leftover inline value would hold the lift at 183px instead of 92).
 *
 * Run: npx playwright test tests/visual/226-bottom-stack.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

/* 380 and 768 are the two dock offsets below the sidebar breakpoint; 1024 is where the banner
   becomes a right-aligned 400px panel and the toast starts being pushed by the sidebar; 1920 is
   the one width where the pair happen to separate horizontally and the lift must STILL apply, or
   the rule is width-dependent and the next copy change puts the overlap back. */
const WIDTHS = [380, 768, 1024, 1280, 1440, 1920];

async function boot(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');
}

/* Drives the REAL show path — the `beforeinstallprompt` listener — rather than setting
   `display:flex` by hand. The variable is published by `show()`, so a fixture that reveals the
   element itself would measure the fallback and pass against a deleted publish. */
async function raise(page, { iosHint = false, toast = true } = {}) {
  return page.evaluate(async ({ iosHint, toast }) => {
    try { localStorage.removeItem('cafeCost_installDismissed'); } catch (e) {}
    window.dispatchEvent(new Event('beforeinstallprompt'));
    if (iosHint) document.getElementById('iosHint').style.display = 'block';
    /* two frames: one for the ResizeObserver to fire on the hint, one for the style to apply */
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const el = document.querySelector('.toast');
    if (toast) {
      el.classList.add('show');
      el.textContent = 'Couldn’t save product — no database connection';
      /* ⚠️ WAIT FOR THE TRANSFORM TO SETTLE, DO NOT SLEEP THROUGH IT. This was `setTimeout(…, 300)`,
         which is a bet that 300ms is longer than the animation — true on an idle machine and false
         under the full suite's parallel workers. Batch 262 caught it: at 380 and 768 the gap came
         out 4.5 instead of the derived 12.5, because the toast was sampled 8px short of its final
         position. Every other figure in the payload (`clear`, `dock`, the banner rect) was exactly
         right, which is what makes a mid-animation sample read as a LAYOUT defect rather than a
         timing one — the assertion is about geometry, so the failure looks like geometry.
         Polling until the rect stops moving costs nothing when the animation is already done, and
         the cap means a genuinely stuck transition still fails rather than hanging. */
      let last = null, still = 0;
      for (let i = 0; i < 120 && still < 3; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const now = el.getBoundingClientRect().bottom;
        still = (last !== null && Math.abs(now - last) < 0.01) ? still + 1 : 0;
        last = now;
      }
    }
    const R = (n) => { const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height }; };
    const inst = document.getElementById('installBanner');
    const cs = getComputedStyle(inst);
    return {
      shown: cs.display,
      classed: document.documentElement.classList.contains('has-install-banner'),
      clear: getComputedStyle(document.documentElement).getPropertyValue('--install-banner-clear').trim(),
      dock: parseFloat(cs.bottom),
      bodyPad: getComputedStyle(document.body).paddingBottom,
      toastBottom: getComputedStyle(el).bottom,
      barBottom: getComputedStyle(document.getElementById('bFootSum')).bottom,
      inst: R(inst),
      toast: R(el),
    };
  }, { iosHint, toast });
}

for (const width of WIDTHS) {
  for (const iosHint of [false, true]) {
    test(`${width}px${iosHint ? ' + iOS hint' : ''}: the toast stacks on the banner, and the banner is the one that says how tall it is`, async ({ page }) => {
      await boot(page, width);
      const g = await raise(page, { iosHint });
      const raw = JSON.stringify(g);

      expect(g.shown, raw).toBe('flex');
      expect(g.classed, raw).toBe(true);

      /* THE MECHANISM. The published value is what the banner actually occupies: its used `bottom`
         (which has already resolved env(safe-area-inset-bottom) — a reader must not add it again)
         plus its measured height. Deleting the publish leaves the stylesheet's 114px fallback, and
         that fails here at 380 and 768, where the true value is 171 and 154. */
      expect(g.clear, raw).toBe(Math.ceil(g.dock + g.inst.h) + 'px');

      /* …and the two other readers hold exactly it, so neither can drift back to a constant. */
      expect(g.bodyPad, raw).toBe(g.clear);
      expect(g.barBottom, raw).toBe(g.clear);

      /* THE GEOMETRY, bounded on both sides — the toast must be STACKED on the banner, not merely
         moved somewhere else. A one-sided "the rects do not intersect" is satisfied by putting the
         toast at the top of the screen.
         THE BOUND IS DERIVED, NOT GENEROUS, and the derivation is why it can be this tight:
           toast.bottom(viewport) = H - (clear + 12)        `--sp-3` is 12
           banner.top(viewport)   = H - (dock + h)
           clear                  = ceil(dock + h)
           gap = banner.top - toast.bottom = ceil(x) - x + 12,  x = dock + h
         and `ceil(x) - x` is in [0, 1), so the gap is in [12, 13) at every width and in every
         state. H cancels, and so does the banner's height — which matters because the height is
         TEXT, and the Linux CI runner has no Geist installed, so its metrics differ from macOS.
         An earlier assertion in this directory went red on CI for exactly that reason. Here the
         font affects both sides of the subtraction equally and drops out.
         Measured on this machine: 12.5 everywhere except 768/no-hint, which is 12. A first draft
         bounded this at 8..20, which the pre-push review correctly called generous — it would have
         passed a lift that was 8px short of clearing a taller banner. */
      const gap = g.inst.t - g.toast.b;
      expect(gap, `gap ${gap} :: ${raw}`).toBeGreaterThanOrEqual(12);
      expect(gap, `gap ${gap} :: ${raw}`).toBeLessThan(13);
    });
  }
}

/* THE LIFT IS CONDITIONAL. Without this, a `.toast{bottom:171px}` written flat would pass every
   assertion above and would float the toast a third of the way up an empty screen for every user
   who has already installed — which is everyone, after the first ten minutes.
   ⚠️ THE DISMISS FLAG HAS TO BE SEEDED BEFORE THE PAGE LOADS, and that is a fact about the app
   rather than harness plumbing: the IIFE ends with a bare `show()` — "first-visit guidance even
   where beforeinstallprompt never fires (e.g. iOS)" — so on a fresh profile the banner is up before
   any event arrives, and there is no default state with it absent. It also means every other spec
   in this directory boots with the banner on screen and, below 1024, now reserves 171px instead of
   114 at the foot of the page. (`v141-sync-corner.spec.js` says "never shown in the fixture; force
   it" at its own forcing; that was already untrue and is corrected there.) */
test('with no install banner the toast returns to its own dock', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 900 });
  await installBoot(page);
  await page.addInitScript(() => { try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {} });
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');
  const g = await page.evaluate(() => {
    const el = document.querySelector('.toast');
    el.classList.add('show');
    return {
      classed: document.documentElement.classList.contains('has-install-banner'),
      instShown: getComputedStyle(document.getElementById('installBanner')).display,
      toastBottom: getComputedStyle(el).bottom,
    };
  });
  expect(g.classed).toBe(false);
  expect(g.instShown).toBe('none');
  expect(g.toastBottom).toBe('92px');   // the base rule, env(safe-area-inset-bottom) resolving to 0
});

/* DISMISSING PUTS IT BACK. `hide()` drops the class, so all three readers fall back to their own
   docks in one step — the half of the pairing that has no visible symptom when it breaks, because
   a permanently reserved 171px at the foot of every screen reads as a design choice. */
test('dismissing the banner releases the reserve and the lift together', async ({ page }) => {
  await boot(page, 380);
  await raise(page, { toast: false });   // already up from the bare show(); this pins the class and the var
  const g = await page.evaluate(async () => {
    document.getElementById('installClose').click();
    await new Promise((r) => requestAnimationFrame(r));
    const el = document.querySelector('.toast');
    el.classList.add('show');
    return {
      classed: document.documentElement.classList.contains('has-install-banner'),
      bodyPad: getComputedStyle(document.body).paddingBottom,
      toastBottom: getComputedStyle(el).bottom,
      barBottom: getComputedStyle(document.getElementById('bFootSum')).bottom,
      navH: document.querySelector('.bottomnav').getBoundingClientRect().height,
    };
  });
  expect(g.classed).toBe(false);
  expect(g.toastBottom).toBe('92px');
  /* ⚠️ THIS ASSERTED THE LITERAL '64px' AND BATCH 230 TURNED IT RED — correctly, and the test was
     the thing that was wrong. 64 was `--bottomnav-h`'s CSS fallback, which was the live value only
     because nothing published the variable; 230 publishes it and the real bar is 65px at 380. The
     assertion is now the PROPERTY it always meant — the summary bar docks on top of the tab bar —
     measured rather than quoted, so it survives the bar being restyled and would still catch the
     dock being dropped. */
  expect(g.barBottom).toBe(Math.ceil(g.navH) + 'px');
  expect(g.bodyPad).toBe('84px');          // body's own base padding-bottom, banner gone
});

/* ══════════════════════════════════════════════════════════════════════════════════════════════
   275 — (c) THE BUILDER'S SUMMARY BAR AND (d) THE BOTTOM SHEET'S FOOTER
   ══════════════════════════════════════════════════════════════════════════════════════════════ */

/* A mix of gram-priced products, five lines, so the bar carries real figures AND wraps its
   `.bfs-line` to a second row — the height this publisher exists to measure is the wrapped one. */
const KING = [
  { id: 1, name: 'Mushrooms Sliced', pid: 'P0200' },
  { id: 2, name: 'Bacon Middle Rindless', pid: 'P0004' },
  { id: 3, name: 'Bags Garbage Prem', pid: 'P0005' },
  { id: 4, name: 'Milk Full Cream', pid: 'P0100' },
];
const SEED_PLATE = (king) => {
  localStorage.clear();
  localStorage.setItem('cafeCost_installDismissed', '1');
  localStorage.setItem('cafeDB_cogsPct', '40');
  localStorage.setItem('cafeDB_king', JSON.stringify(king));
  localStorage.setItem('cafeDB_plates', JSON.stringify([{
    id: 'PL1', name: 'Big Breakfast', category: 'Mains',
    lines: king.map((k) => ({ kid: k.id, qty: 120 })),
  }]));
};

/* The longest real message the builder can produce. The length is the point: at 380 it wraps to
   three lines and is 91.5px tall, which is what made it reach the bar in the first place. A short
   fixture toast passes a broken lift. */
const REAL_TOAST = 'Couldn’t save plate — no database connection';

async function raiseToast(page) {
  await page.evaluate(async (msg) => {
    const el = document.querySelector('.toast');
    el.textContent = msg;
    el.classList.add('show');
    /* Poll until the rect stops moving rather than sleeping through the transform — the same
       reasoning (and the same bug) as `raise()` at the top of this file. */
    let last = null, still = 0;
    for (let i = 0; i < 120 && still < 3; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = el.getBoundingClientRect().bottom;
      still = (last !== null && Math.abs(now - last) < 0.01) ? still + 1 : 0;
      last = now;
    }
  }, REAL_TOAST);
}

async function openCostedPlate(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await installBoot(page);
  await page.addInitScript(SEED_PLATE, KING);
  await page.goto('/');
  await gotoTab(page, 'builder');
  await page.locator('#plateList .plib-row').first().click();
  await expect(page.locator('#lines .bld-row').first()).toBeVisible();
}

const barGeom = () => {
  const R = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height }; };
  const el = document.querySelector('.toast');
  const bar = document.getElementById('bFootSum');
  return {
    clear: getComputedStyle(document.documentElement).getPropertyValue('--bld-bar-clear').trim(),
    dock: parseFloat(getComputedStyle(bar).bottom) || 0,
    barDisplay: getComputedStyle(bar).display,
    toastBottom: getComputedStyle(el).bottom,
    toast: R(el), bar: R(bar), save: R(document.getElementById('bldSaveBar')),
  };
};

/* 380 is where the toast covers `.bfs-save` itself; 768 and 900 are the band 274 opened the bar
   into; 1024 is where the bar docks at 0 behind a 224px sidebar. All four had the overlap. */
for (const width of [380, 768, 900, 1024]) {
  test(`${width}px: the builder's summary bar says how tall it is, and the toast sits above it`, async ({ page }) => {
    await openCostedPlate(page, width);
    await raiseToast(page);
    const g = await page.evaluate(barGeom);
    const raw = JSON.stringify(g);

    expect(g.barDisplay, raw).toBe('flex');

    /* THE MECHANISM, and it is the load-bearing assertion: the published value is what the bar
       actually occupies — its used `bottom` (which has already resolved env(safe-area-inset-bottom))
       plus its measured height. Deleting the publish leaves the `0px` fallback and drops the toast
       back onto the bar, which every geometry assertion below then catches too. */
    expect(g.clear, raw).toBe(Math.ceil(g.dock + g.bar.h) + 'px');

    /* …and the toast holds exactly it, so it cannot drift back to a constant. */
    expect(g.toastBottom, raw).toBe(`${parseFloat(g.clear) + 12}px`);   // --sp-3 is 12

    /* THE GEOMETRY, bounded on both sides — STACKED on the bar, not merely moved somewhere else.
       Derived exactly as the banner's gap is, and for the same reason it can be this tight:
         toast.bottom(viewport) = H - (clear + 12)
         bar.top(viewport)      = H - (dock + h)
         clear                  = ceil(dock + h)
         gap = bar.top - toast.bottom = ceil(x) - x + 12,  x = dock + h
       so it is in [12, 13) at every width. H cancels and so does the bar's height, which matters
       because the height is TEXT and the Linux runner has no Geist — the font affects both sides of
       the subtraction equally and drops out. */
    const gap = g.bar.t - g.toast.b;
    expect(gap, `gap ${gap} :: ${raw}`).toBeGreaterThanOrEqual(12);
    expect(gap, `gap ${gap} :: ${raw}`).toBeLessThan(13);

    /* The item's own name for the defect, kept as the failure message rather than as the weight —
       roster 190. At 380 this was the Save button under an opaque pill; at 768+ it was the figures. */
    expect(g.toast.b, `toast over .bfs-save :: ${raw}`).toBeLessThanOrEqual(g.save.t);
  });
}

/* THE LIFT IS CONDITIONAL, and this is the half with no visible symptom. Without it a
   `.toast{bottom:165px}` written flat passes every assertion above and floats the toast a third of
   the way up an empty screen on every other screen in the app — the same trap the banner's own
   conditional test at the top of this file exists for. At 1100 `.bld-bar` is `display:none`. */
test('1100px: the bar is gone, the clearance is released, and the toast returns to its own dock', async ({ page }) => {
  await openCostedPlate(page, 1100);
  await raiseToast(page);
  const g = await page.evaluate(barGeom);
  expect(g.barDisplay).toBe('none');
  expect(g.clear).toBe('0px');
  expect(g.toastBottom).toBe('92px');
});

/* The builder page is not the only place a toast fires, and leaving it must release the bar too —
   the bar lives inside #builderPage, so a tab change takes it off screen without changing any rule
   that mentions it. */
test('380px: leaving the builder releases the bar clearance', async ({ page }) => {
  await openCostedPlate(page, 380);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bld-bar-clear').trim())).not.toBe('0px');
  await gotoTab(page, 'analysis');
  await raiseToast(page);
  const g = await page.evaluate(barGeom);
  expect(g.clear).toBe('0px');
  expect(g.toastBottom).toBe('92px');
});

/* ───────────────────────── (d) the sheet footer ───────────────────────── */

const sheetGeom = (id) => {
  const R = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height }; };
  const el = document.querySelector('.toast');
  const foot = document.querySelector(`#${id} .mfoot`);
  return {
    clear: getComputedStyle(document.documentElement).getPropertyValue('--sheet-foot-clear').trim(),
    align: getComputedStyle(document.getElementById(id)).alignItems,
    toastBottom: getComputedStyle(el).bottom,
    toast: R(el), foot: R(foot),
    btns: [...document.querySelectorAll(`#${id} .mfoot .btn`)].map(R),
  };
};

async function openSheet(page, id) {
  await page.evaluate(async (i) => {
    window.show(i);
    /* `sheetUp` starts at translateY(24px). Wait for the sheet itself to stop moving before the
       toast is raised, or the geometry read here is mid-animation — the failure this file's own
       `raise()` records for the toast, one element along. */
    const m = document.querySelector(`#${i} .modal`);
    let last = null, still = 0;
    for (let n = 0; n < 120 && still < 3; n++) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = m.getBoundingClientRect().bottom;
      still = (last !== null && Math.abs(now - last) < 0.01) ? still + 1 : 0;
      last = now;
    }
  }, id);
}

test('380px: a sheet footer taller than the toast\'s dock lifts it; the ordinary one does not', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  await installBoot(page);
  await page.addInitScript(SEED_PLATE, KING);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');

  /* THE ONE THAT MUST MOVE. #delChoiceModal offers three choices, so its footer stacks to 127px —
     past the toast's own 92px dock, which is why the toast landed on the buttons. */
  await openSheet(page, 'delChoiceModal');
  await raiseToast(page);
  const tall = await page.evaluate(sheetGeom, 'delChoiceModal');
  const rawT = JSON.stringify(tall);

  expect(tall.align, rawT).toBe('flex-end');                       // it is a SHEET, not a centred dialog
  expect(tall.clear, rawT).toBe(Math.ceil(tall.foot.h) + 'px');    // docked, so the footer's height IS its reach
  expect(parseFloat(tall.clear), rawT).toBeGreaterThan(92);        // …and it is past the toast's own dock
  expect(tall.toastBottom, rawT).toBe(`${parseFloat(tall.clear) + 12}px`);
  const gap = tall.foot.t - tall.toast.b;
  expect(gap, `gap ${gap} :: ${rawT}`).toBeGreaterThanOrEqual(12);
  expect(gap, `gap ${gap} :: ${rawT}`).toBeLessThan(13);
  tall.btns.forEach((b, i) => expect(tall.toast.b, `btn ${i} :: ${rawT}`).toBeLessThanOrEqual(b.t));

  await page.evaluate(() => { window.hide('delChoiceModal'); document.querySelector('.toast').classList.remove('show'); });

  /* THE NINETEEN THAT MUST NOT. A 76px footer clears the toast's own dock by 16px, so the max()
     picks the dock and nothing moves. This is the assertion a blanket "lift the toast whenever a
     sheet is open" fix fails, and it would fail it invisibly — the toast would simply sit higher
     on every confirm in the app. */
  await page.evaluate(() => window.askConfirm('Delete this plate?', 'This cannot be undone.', 'Delete', function () {}, 'Cancel'));
  await openSheet(page, 'confirmModal');
  await raiseToast(page);
  const short = await page.evaluate(sheetGeom, 'confirmModal');
  const rawS = JSON.stringify(short);
  expect(short.clear, rawS).toBe(Math.ceil(short.foot.h) + 'px');   // published honestly…
  expect(parseFloat(short.clear), rawS).toBeLessThan(92);           // …and smaller than the dock…
  expect(short.toastBottom, rawS).toBe('92px');                     // …so the toast does not move.

  /* AND CLOSING RELEASES IT. closeOverlay republishes before the reduced-motion early return, so
     both close paths drop the clearance. */
  await page.evaluate(() => window.hide('confirmModal'));
  const after = await page.evaluate(sheetGeom, 'confirmModal');
  expect(after.clear).toBe('0px');
  expect(after.toastBottom).toBe('92px');
});

/* THE SHEET CLEARANCE SURVIVES A RESIZE, IN BOTH DIRECTIONS — 275's pre-push review, which
   reproduced this rather than reasoning about it.
   `publishSheetFootClear` is the one publisher of the three with no ResizeObserver behind it (the
   thing that changes is the VIEWPORT crossing 767, not any one overlay's size), so before this it
   was called only from openOverlay/closeOverlay. Widen past 768 with a sheet still open and the
   same markup becomes a centred dialog whose footer is mid-screen, while `--sheet-foot-clear` kept
   the sheet's 127px: measured align-items flex-end -> flex-start, clear still 127px, toast still
   lifted to 139px with nothing beneath it.
   BOTH DIRECTIONS are asserted because they fail differently and only one of them is visible: the
   widen leaves a toast floating (cosmetic, reads as a design choice), and the NARROW leaves a toast
   back on the delete-choice dialog's buttons, which is the defect this whole section exists for. */
test('the sheet clearance is re-read when the viewport crosses the sheet breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 800 });
  await installBoot(page);
  await page.addInitScript(() => { try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {} });
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');

  const read = () => page.evaluate(() => ({
    clear: getComputedStyle(document.documentElement).getPropertyValue('--sheet-foot-clear').trim(),
    align: getComputedStyle(document.getElementById('delChoiceModal')).alignItems,
    toastBottom: getComputedStyle(document.querySelector('.toast')).bottom,
  }));

  await openSheet(page, 'delChoiceModal');
  const phone = await read();
  expect(phone.align).toBe('flex-end');
  expect(phone.clear).toBe('127px');
  expect(phone.toastBottom).toBe('139px');

  /* WIDEN, same overlay still open. */
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(150);
  const desk = await read();
  expect(desk.align, JSON.stringify(desk)).toBe('flex-start');   // it is a centred dialog now
  expect(desk.clear, JSON.stringify(desk)).toBe('0px');
  expect(desk.toastBottom, JSON.stringify(desk)).toBe('92px');

  /* AND BACK. The lift has to return, or the fix for the stale value has traded one silent
     failure for the loud one. */
  await page.setViewportSize({ width: 380, height: 800 });
  await page.waitForTimeout(150);
  const back = await read();
  expect(back.align, JSON.stringify(back)).toBe('flex-end');
  expect(back.clear, JSON.stringify(back)).toBe('127px');
  expect(back.toastBottom, JSON.stringify(back)).toBe('139px');
});
