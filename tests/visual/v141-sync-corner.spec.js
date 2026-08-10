/*
 * v141-sync-corner.spec.js — the sync banner owns no corner that a control already owns.
 *
 * WHAT BROKE. `.sync-banner` is body-level fixed chrome. Its >=1024 rule pinned it top-right at
 * `top:14px`, which was right until two changes met that never referenced each other: v132 deleted
 * the desktop `header` (the sidebar took the brand), and F2/v138 put `.scr-head` — the mock's §2
 * screen-header bar, primary action at its right — into the band the banner had been floating in.
 * From v138 to v140 the banner sat on the primary action of every converted screen.
 *
 * WHY THESE ASSERTIONS AND NOT COORDINATES. Pinning `left`/`bottom` would pass against any future
 * screen whose actions move under the banner again — it would pin the fix, not the property. What
 * has to stay true is the CONDITION: the banner's rect never intersects an interactive element,
 * and never intersects the other two pieces of bottom chrome. That fails if a later F-item puts a
 * control where the banner now lives, which is exactly the regression worth catching.
 *
 * THE STATES ARE THE POINT. The queue item was written from the "Saved" pill (87px) and measured a
 * 19px clip. The banner is sized by its text, and the two states that NEVER auto-dismiss are the
 * two widest — offline 230px, error 273px — so the worst case is also the permanent one. Every
 * state is exercised here for that reason; testing 'ok' alone is how this stayed invisible.
 *
 * Run: npx playwright test tests/visual/v141-sync-corner.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* Every state `setSync` can be called with, widest last. app.js:16 is the source of this list —
   if a state is added there without being added here, the new width is never measured. */
const STATES = ['ok', 'saving', 'loading', 'offline', 'error'];

/* data-tab values, not labels: the naming inversion means `pantry` is the UI's "Ingredients" and
   `ingredients` is the UI's "Products" (CLAUDE.md Tier 1). The three converted screens carry a
   `.scr-head`; `analysis` and `dash` are unconverted and are here so F5/F6 inherit the guard. */
const TABS = ['builder', 'pantry', 'ingredients', 'analysis', 'dash'];

async function boot(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.showTab === 'function');
}

/* WHAT THIS DOES NOT ASSERT, and why that is a decision rather than a gap.
 *
 * The first version of this spec asserted the banner overlaps NO interactive element anywhere on
 * the page. It failed, correctly, and the reason is worth writing down: the list rows are
 * `role="button"` (`.ing-card` and the rest of the row-button grammar), so the content plane of
 * every populated screen is wall-to-wall controls, top to bottom. There is no position for a fixed
 * overlay that intersects nothing — not top, not bottom, not either corner. An assertion that
 * demanded it could only ever be satisfied by deleting the banner.
 *
 * So the rule this pins is the real one: **the banner may float over the CONTENT plane, and may
 * never touch the screen's CHROME.** Chrome is the header bar and the fixed furniture — the things
 * that are small, unique, and the only route to their flow. Content is the list, whose rows are
 * large, repeated and scrollable. What makes floating over content safe is not luck but the
 * `pointer-events:none` pinned at the bottom of this file: a row under the banner is still
 * clickable, so covering one costs a look, never an action.
 */
/* No `.side` here, deliberately: it matches nothing. The sidebar's own controls are `.side-brand`
   and `.side-theme` (index.html), and both live INSIDE `nav.bottomnav` — the same element as the
   mobile tab bar, re-laid-out at >=1024 — so `.bottomnav` already catches them through `closest()`.
   A dead selector in this list would read as coverage it does not provide. */
const CHROME = '.scr-head, header, .bottomnav, .toast, .install-banner';

/* Returns every interactive CHROME element the banner's rect intersects. Scoped by role, not by
   screen: `.scr-head` is the shared §2 header bar that F5-F10 each adopt, so a later screen that
   puts its actions back under the banner fails here without anyone remembering to extend this. */
async function overlappedChrome(page, state) {
  return page.evaluate(([s, chrome]) => {
    window.setSync(s);
    const b = document.getElementById('syncBanner').getBoundingClientRect();
    return [...document.querySelectorAll('button,a,select,input,textarea,[role="button"]')]
      .filter((e) => {
        if (e.closest('#syncBanner')) return false;
        if (!e.closest(chrome)) return false;
        if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false;
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        const cs = getComputedStyle(e);
        if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
        return r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom;
      })
      .map((e) => (e.id || e.className || e.tagName).toString().trim().slice(0, 30));
  }, [state, CHROME]);
}

/* The three converted screens plus the two still to come, at the widths where the content column
   is widest relative to the viewport — 1024 and 1280 are where the old pin covered BOTH header
   actions outright, 1440 where it still covered the primary. */
for (const width of [1024, 1280, 1440]) {
  test(`desktop ${width}: the banner touches no chrome control, in any state, on any screen`, async ({ page }) => {
    await boot(page, width);
    for (const tab of TABS) {
      await page.evaluate((t) => window.showTab(t), tab);
      await page.waitForTimeout(120);
      for (const state of STATES) {
        expect(await overlappedChrome(page, state), `${tab} / ${state} at ${width}px`).toEqual([]);
      }
    }
  });

  /* The placement decision itself: at desktop the banner lives in the BOTTOM half. Without this,
     the assertion above would still pass if someone moved the banner back to the top of a screen
     whose actions had since moved — it would be measuring the current layout's luck rather than
     the rule. This is the rule. */
  test(`desktop ${width}: the banner sits in the bottom half, clear of the header band`, async ({ page }) => {
    await boot(page, width);
    const geo = await page.evaluate(() => {
      window.setSync('error');
      const b = document.getElementById('syncBanner').getBoundingClientRect();
      /* the sidebar is `.bottomnav` — the same element as the mobile tab bar, re-laid-out at
         >=1024 (css/style.css). Measured rather than assumed 224, so widening the sidebar without
         moving the banner fails here instead of tucking it underneath. */
      const rail = document.querySelector('.bottomnav').getBoundingClientRect();
      return { top: b.top, half: window.innerHeight / 2, left: b.left, railRight: rail.right };
    });
    expect(geo.top).toBeGreaterThan(geo.half);
    expect(geo.left).toBeGreaterThanOrEqual(geo.railRight);   // clear of the sidebar, not under it
  });
}

/* Below 1024 a real `header` still occupies the top band and the banner overlays THAT, not the
   screen header — measured clean before this batch and unchanged by it. Pinned so the desktop fix
   cannot be "simplified" into an all-widths rule that moves mobile too. */
for (const width of [380, 768]) {
  test(`mobile/tablet ${width}: the banner is still top-centred over the app header`, async ({ page }) => {
    await boot(page, width);
    const geo = await page.evaluate(() => {
      window.setSync('error');
      const b = document.getElementById('syncBanner').getBoundingClientRect();
      const head = [...document.querySelectorAll('[id^="tab-"] .scr-head')]
        .find((e) => e.getBoundingClientRect().width > 0);
      /* MEASURE the containing block, do not infer it — two earlier versions of this assertion
         inferred it, passed on macOS and failed on the Linux CI runner, which is the same class of
         mistake as the bug this whole spec is about.
         The banner is centred by `left:50%` + `translateX(-50%)`, so the percentage resolves
         against the fixed-position containing block. On the CI runner that block is NARROWER than
         both `window.innerWidth` and `documentElement.clientWidth`, which agree with each other and
         are both wrong (measured: 370 inside a 380 viewport, 759 inside 768). A probe pinned
         `left:0;right:0` is the only thing that reports it honestly on every platform. */
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;right:0;top:0;height:1px;visibility:hidden;pointer-events:none';
      document.body.appendChild(probe);
      const icb = probe.getBoundingClientRect().width;
      probe.remove();
      /* The rail offset is derived, not hardcoded to the CSS 39: `.bottomnav` is one element that
         is the bottom tab bar at 380 and a 78px LEFT rail at 768. Discriminate on ORIENTATION
         (a left rail is taller than it is wide), never on width — the bottom bar is a few pixels
         narrower than the viewport on CI, which is exactly what broke the previous attempt.
         Derived this way it also fails if the rail is widened without the banner following.
         Not a GENERAL discriminator, and said so rather than left to be discovered: it holds
         because the bar is short and full-width at 380 and the rail is narrow and full-height at
         768, which is unambiguous at both. A future breakpoint that made the rail wider than tall
         would fool it, so re-check this line before reusing the pattern at a third width. */
      const rail = document.querySelector('.bottomnav').getBoundingClientRect();
      const railOffset = rail.height > rail.width ? rail.right / 2 : 0;
      return {
        top: Math.round(b.top),
        centreOffset: (b.left + b.right) / 2 - (icb / 2 + railOffset),
        clearsScreenHeader: !head || b.bottom <= head.getBoundingClientRect().top,
        raw: `banner=[${Math.round(b.left)},${Math.round(b.right)}] icb=${icb} `
           + `rail=[${Math.round(rail.width)}x${Math.round(rail.height)}] railOffset=${railOffset}`,
      };
    });
    expect(geo.top, geo.raw).toBeLessThan(30);                    // top-anchored, not at the bottom
    expect(Math.abs(geo.centreOffset), geo.raw).toBeLessThan(2);  // still centred (rail-offset at 768)
    expect(geo.clearsScreenHeader, geo.raw).toBe(true);           // above `.scr-head`, never on it
  });
}

/* The bottom is now a three-way split — left: sync banner, centre: toast, right: install banner —
   and the whole argument for moving it there is that the three do not collide. Asserting it makes
   that argument fail loudly rather than quietly. (The toast and install banner overlap EACH OTHER
   at these widths; that is pre-existing, is queued separately, and is not what this measures.) */
test('desktop: the banner clears the toast and the install banner at every width', async ({ page }) => {
  for (const width of [1024, 1280, 1440, 1920]) {
    await boot(page, width);
    const hits = await page.evaluate(() => {
      window.setSync('error');                                   // the widest state
      const inst = document.getElementById('installBanner');
      inst.style.display = 'flex';                               // never shown in the fixture; force it
      const toast = document.querySelector('.toast');
      toast.classList.add('show');
      toast.textContent = 'Couldn’t save product — no database connection';
      const b = document.getElementById('syncBanner').getBoundingClientRect();
      const hit = (el) => {
        const r = el.getBoundingClientRect();
        return r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom;
      };
      return { install: hit(inst), toast: hit(toast) };
    });
    expect(hits, `bottom chrome collision at ${width}px`).toEqual({ install: false, toast: false });
  }
});

/* The half that is not about placement: the banner has never held a control, and until v141 it
   could take a click from whatever it floated over. Measured at 380px before the fix —
   `elementFromPoint` at the centre of #brandHome returned #syncBanner in the error state. */
test('the banner never takes a click from what it floats over', async ({ page }) => {
  await boot(page, 380);
  const res = await page.evaluate(() => {
    window.setSync('error');
    const b = document.getElementById('syncBanner');
    const r = b.getBoundingClientRect();
    return {
      pointerEvents: getComputedStyle(b).pointerEvents,
      atOwnCentre: document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)?.id || '',
    };
  });
  expect(res.pointerEvents).toBe('none');
  expect(res.atOwnCentre).not.toBe('syncBanner');
});
