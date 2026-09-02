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
 * Run: npx playwright test tests/visual/226-bottom-stack.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

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
      await new Promise((r) => setTimeout(r, 300));   // the toast transitions its transform in
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

      /* THE GEOMETRY, bounded on both sides. Below: the toast's bottom edge is above the banner's
         top edge. Above: by no more than a hair over --sp-3 (12) — the toast must be STACKED on
         the banner, not merely moved somewhere else. Math.ceil in the publish can add one pixel. */
      const gap = g.inst.t - g.toast.b;
      expect(gap, `gap ${gap} :: ${raw}`).toBeGreaterThanOrEqual(8);
      expect(gap, `gap ${gap} :: ${raw}`).toBeLessThanOrEqual(20);
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
    };
  });
  expect(g.classed).toBe(false);
  expect(g.toastBottom).toBe('92px');
  expect(g.barBottom).toBe('64px');        // --bottomnav-h's fallback; the bar's own dock at <640
  expect(g.bodyPad).toBe('84px');          // body's own base padding-bottom, banner gone
});
