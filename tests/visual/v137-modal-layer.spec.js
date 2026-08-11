/*
 * v137-modal-layer.spec.js (F1b) — the modal/sheet primitive, driven in a real browser.
 *
 * WHY THIS FILE EXISTS AT ALL. Before v137 the app's Escape behaviour had ZERO tests of any
 * kind — not a unit test, not a spec, not a smoke assertion. A grep of tests/ for "Escape"
 * returned two files, neither of which pressed it. The defect it was hiding was not subtle:
 * ONE document listener closed a hard-coded list of 8 modal ids, so
 *
 *   - Escape over a STACKED confirm closed the confirm AND everything listed underneath it, and
 *   - the other 8 modals in the app had no Escape handler at all.
 *
 * Both directions wrong, from the same cause, for as long as the list existed.
 *
 * WHAT IS ASSERTED, and why each one is written the way it is:
 *
 *   1. Escape over a real stack closes the TOP LAYER ONLY. The stack used is a genuine one the
 *      app builds itself (Settings -> the clear-cache confirm), not a synthetic pair, because
 *      the bug only ever appeared on real stacks.
 *   2. A second Escape then closes the layer underneath. Together 1 and 2 pin "closes one layer
 *      per press" — assert only #1 and code that closes NOTHING would pass.
 *   3. Every modal that had no Escape handler now closes on Escape. Table-driven over the
 *      measured list of 8, so a regression names which one.
 *   4. Escape routes through each modal's OWN close function. Pinned via #confirmModal, whose
 *      close function clears __confirmFn — a bare hide() leaked it, and that leak is invisible
 *      from the outside unless you look at the callback.
 *   5. Focus is trapped in the top layer, and returns to the opener when it closes. Neither
 *      existed anywhere in the app before this batch.
 *
 * VERIFIED FAILING against planted defects before commit — see the batch handover for which
 * defect was planted for which assertion. An Escape test that passes against the old
 * hard-coded list would be worthless, and #1/#2 are the pair that cannot.
 *
 * Run: npx playwright test tests/visual/v137-modal-layer.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const DESKTOP = { width: 1280, height: 900 };

/* The eight that had NO Escape handler before v137. Each entry is the id and the app function
   that opens it, so the spec drives the real open path rather than adding .open by hand — a
   class added by the test would not prove the app can reach the state.
   F9 (v148): #settingsPanel is DELETED — Settings is a screen, and a screen has no Escape
   behaviour to guard. Seven remain. It is removed rather than repointed because there is no
   longer a Settings overlay for the v137 contract to be true or false about; every OTHER
   modal in the list still carries it, so the contract itself loses nothing. */
const PREVIOUSLY_UNREACHABLE = [
  ['ingModal', 'openIngEdit(PRODUCTS[0].id)'],
  ['kingModal', 'openKingModal(null)'],
  ['smemModal', 'openSmem()'],
  ['addDishModal', 'openAddDishModal()'],
  ['newMenuModal', 'openNewMenuModal()'],
  ['tidyModal', "show('tidyModal')"],
  ['tidyManageModal', 'openTidyManage()'],
];

/* The boot splash is a full-screen position:fixed overlay at z-index 200, and it eats
   elementFromPoint — every probe comes back as #splash, which reads identically to the thing
   under test being absent. Wait until hit-testing reaches the page. Deliberately NOT written as
   `splash.offsetParent === null`: offsetParent is null for ANY fixed element, so that check
   passes instantly with the splash still up (it did, in a first cut of this file). */
async function splashGone(page) {
  await page.waitForFunction(() => {
    const s = document.getElementById('splash');
    if (!s) return true;
    const cs = getComputedStyle(s);
    return cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0'
      || cs.pointerEvents === 'none';
  }, null, { timeout: 15000 });
}

async function boot(page, viewport = DESKTOP) {
  await page.setViewportSize(viewport);
  await installBoot(page);
  await page.goto('/');
  await page.waitForFunction(() => typeof window.show === 'function');
}

const isOpen = (page, id) =>
  page.evaluate((i) => !!document.getElementById(i)?.classList.contains('open'), id);

/* The product editor is F9 (v148)'s stand-in for Settings wherever this file needs a real MODAL to
   stack, trap focus or measure. It has to be opened through eval, exactly as PREVIOUSLY_UNREACHABLE
   does: `PRODUCTS` is declared `let` at top level (js/app.js), so it is NOT a property of window and
   `window.PRODUCTS` is undefined — an eval runs in the same global scope and can see it. */
const openProductEditor = (page) =>
  page.evaluate(() => eval('openIngEdit(PRODUCTS[0].id)'));

/* Geometry must be read AFTER the entry animation, never during it. The sheet rises through
   translateY(24px), so a boundingBox taken mid-flight puts the sheet 24px below the viewport
   and every "flush to the bottom" assertion fails for a reason that has nothing to do with the
   CSS under test. (v136 hit the same class of thing measuring colour through a transition.)
   Waiting on the animation itself rather than a timeout keeps it deterministic. */
const settled = (locator) =>
  locator.evaluate((n) => Promise.all(n.getAnimations().map((a) => a.finished.catch(() => {}))));

/* MEASURE the viewport reference, never name it — `html{scrollbar-gutter:stable}` plus a 10px
   ::-webkit-scrollbar means the fixed-positioning containing block is NOT always innerWidth, and
   a hardcoded 390 fails on one platform and passes on the other. The v115 CI chase is where this
   probe comes from. */
const fixedFrame = (page) =>
  page.evaluate(() => {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;inset:0;pointer-events:none';
    document.body.appendChild(p);
    const r = p.getBoundingClientRect();
    p.remove();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

test.describe('Escape closes the top layer only', () => {
  test('a real stack (the product editor -> its delete confirm) closes one layer per press', async ({ page }) => {
    await boot(page);

    /* F9 (v148) repointed this from Settings, which is a screen now and therefore not a layer.
       The base layer is the product editor, and the stack is the app's OWN: #ingDelete lives
       inside #ingModal and calls deleteIngredient(), which raises exactly this confirm. That is
       why #confirmModal carries z-index:85 (the v44 finding) — the finding is unchanged, it just
       no longer has Settings as its example.
       The confirm is raised directly rather than by clicking #ingDelete because deleteIngredient
       branches on productRefs and the fixture cannot guarantee which branch; what is under test is
       the LAYER behaviour, not which sentence the confirm shows. */
    await openProductEditor(page);
    await expect.poll(() => isOpen(page, 'ingModal')).toBe(true);

    await page.evaluate(() => window.askConfirm('Clear cache', 'Are you sure?', 'Clear', () => {}));
    await expect.poll(() => isOpen(page, 'confirmModal')).toBe(true);

    await page.keyboard.press('Escape');

    // 1. the top layer went...
    await expect.poll(() => isOpen(page, 'confirmModal')).toBe(false);
    // ...and the layer underneath did NOT. This is the assertion the old code failed.
    expect(await isOpen(page, 'ingModal')).toBe(true);

    // 2. one layer per press — a handler that closed nothing would pass #1 alone.
    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'ingModal')).toBe(false);
  });

  test('a stack of two EQUAL z-index modals closes the visually-top one', async ({ page }) => {
    await boot(page);
    /* The other stack test goes through #confirmModal (z-index:85) and so exercises only the
       z-index branch of topOverlay(). This one exercises the TIE-BREAK, where both overlays sit
       at 80 and document order decides what paints on top.

       The pair matters. A first draft used Settings -> "Remembered items", which LOOKS like a
       stack and is not: #setSmemOpen runs `closeSettings(); openSmem();`, so the app never has
       both open, and the test was asserting against a state no user can reach — the same defect
       this repo already recorded in fresh-states.spec.js. Tidy lists -> a tidy action is a real
       one: openTidy() calls show('tidyModal') and never hides #tidyManageModal.

       Asserted against what the BROWSER paints (elementFromPoint), not against an assumed DOM
       order — getting that assumption backwards is what produced the false failure. */
    await page.evaluate(() => window.openTidyManage('category'));
    await expect.poll(() => isOpen(page, 'tidyManageModal')).toBe(true);
    await page.evaluate(() => window.openTidy('category', 'rename', 'Dairy & Eggs'));
    await expect.poll(() => isOpen(page, 'tidyModal')).toBe(true);
    expect(await isOpen(page, 'tidyManageModal')).toBe(true);

    await splashGone(page);
    const painted = await page.evaluate(() =>
      document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.modal-overlay')?.id);
    expect(painted).toBe('tidyModal');

    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'tidyModal')).toBe(false);
    expect(await isOpen(page, 'tidyManageModal')).toBe(true);   // the layer underneath survives

    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'tidyManageModal')).toBe(false);
  });

  test('the dashboard scope popover is a layer too — it does not close a modal with it', async ({ page }) => {
    await boot(page);
    /* FOUND BY THE PRE-PUSH REVIEW, and it was the same defect this batch removes from the modal
       set, surviving in a pre-existing handler: the popover's Escape listener and the top-layer
       one are BOTH on `document`, so a single keypress ran both and took two layers down.

       The flag is set directly rather than through setDashMenusOpen(), and that is deliberate:
       setDashMenusOpen() calls renderDashboard(), which zeroes the flag whenever fewer than two
       menus are costed (app.js — "the open flag dies WITH the control"), and the boot fixture has
       fewer than two. So the real control cannot be rendered here. Production has several costed
       menus and does render it. Setting the flag isolates the LISTENER INTERACTION, which is the
       thing under test; the popover's own open/close path is covered in v96-menu-select.spec.js. */
    await openProductEditor(page);   // F9 (v148): was Settings, which is a screen now
    await expect.poll(() => isOpen(page, 'ingModal')).toBe(true);

    const out = await page.evaluate(async () => {
      window.dashMenusOpen = true;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 150));
      return {
        popover: window.dashMenusOpen,
        modal: document.getElementById('ingModal').classList.contains('open'),
      };
    });

    expect(out.popover).toBe(false);   // the popover closed — it was the top layer
    expect(out.modal).toBe(true);      // ...and the modal under it did NOT
  });

  test('Escape routes through the modal\'s own close function, not a bare hide()', async ({ page }) => {
    await boot(page);
    /* closeConfirm() clears __confirmFn; the old Escape path called hide('confirmModal') and
       left it set. Observable only through the callback, so that is what is checked. */
    const leaked = await page.evaluate(async () => {
      let ran = 0;
      window.askConfirm('Delete', 'Sure?', 'Delete', () => { ran++; });
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise((r) => setTimeout(r, 50));
      // Re-firing the OK button must not run the callback of a dismissed confirm.
      document.getElementById('confirmOk').click();
      return ran;
    });
    expect(leaked).toBe(0);
  });
});

test.describe('the modals that had no Escape handler', () => {
  for (const [id, opener] of PREVIOUSLY_UNREACHABLE) {
    test(`${id} closes on Escape`, async ({ page }) => {
      await boot(page);
      const opened = await page.evaluate((src) => {
        try { eval(src); return true; } catch (e) { return String(e); }
      }, opener);
      expect(opened, `could not open via ${opener}`).toBe(true);
      await expect.poll(() => isOpen(page, id)).toBe(true);

      await page.keyboard.press('Escape');
      await expect.poll(() => isOpen(page, id)).toBe(false);
    });
  }
});

test.describe('focus', () => {
  test('is trapped inside the open modal and wraps at both ends', async ({ page }) => {
    await boot(page);
    // F9 (v148): the product editor stands in for Settings — a modal with several focusables,
    // which is what a wrap test needs. Settings is a screen and has no trap to test.
    await openProductEditor(page);
    await expect.poll(() => isOpen(page, 'ingModal')).toBe(true);

    // Focus must already be inside the dialog — openOverlay moves it there.
    expect(await page.evaluate(() =>
      document.getElementById('ingModal').contains(document.activeElement))).toBe(true);

    /* Tab all the way round. If the trap is absent, focus leaves for the page behind within a
       handful of presses; the count is generous so this fails on absence, not on tab order. */
    for (let i = 0; i < 60; i++) await page.keyboard.press('Tab');
    expect(await page.evaluate(() =>
      document.getElementById('ingModal').contains(document.activeElement))).toBe(true);

    for (let i = 0; i < 10; i++) await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() =>
      document.getElementById('ingModal').contains(document.activeElement))).toBe(true);
  });

  test('returns to the control that opened the modal', async ({ page }) => {
    await boot(page);
    /* F9 (v148): #sideSettings no longer opens a modal — it navigates. The Settings screen's
       own "Tidy lists" button is the replacement opener: a real control, on a real screen, that
       is not inside the modal it opens, so "focus came back" stays unambiguous. This also covers
       the thing the conversion could most plausibly have broken — a door OUT of the new screen. */
    await page.evaluate(() => window.showTab('settings'));
    await expect(page.locator('#setTidyOpen')).toBeVisible();
    await page.locator('#setTidyOpen').focus();
    await page.locator('#setTidyOpen').click();
    await expect.poll(() => isOpen(page, 'tidyManageModal')).toBe(true);

    /* Focus must have MOVED first. Without this line the test cannot fail: strip the whole
       focus mechanism out and focus simply never leaves #setTidyOpen, so the final assertion
       is satisfied by nothing having happened at all. Verified — the plant passed until this
       was added. */
    expect(await page.evaluate(() => document.activeElement?.id)).not.toBe('setTidyOpen');
    expect(await page.evaluate(() =>
      document.getElementById('tidyManageModal').contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'tidyManageModal')).toBe(false);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('setTidyOpen');
  });

  test('closing the top of a stack hands focus back to the layer underneath', async ({ page }) => {
    await boot(page);
    await openProductEditor(page);   // F9 (v148): the base layer is a modal again
    await page.evaluate(() => window.askConfirm('Delete product?', 'Sure?', 'Delete', () => {}));
    await expect.poll(() => isOpen(page, 'confirmModal')).toBe(true);

    /* Same trap as the test above: focus has to be IN the confirm before closing it can be
       said to have handed anything back. Without this the assertion is true from the start. */
    expect(await page.evaluate(() =>
      document.getElementById('confirmModal').contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect.poll(() => isOpen(page, 'confirmModal')).toBe(false);
    // Back in the layer underneath — not left on <body>, which is where it would fall.
    expect(await page.evaluate(() =>
      document.getElementById('ingModal').contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() =>
      document.getElementById('confirmModal').contains(document.activeElement))).toBe(false);
  });
});

test.describe('container: dialog at 12vh, sheet on a phone', () => {
  test('>=768 the modal sits near the top, not vertically centred', async ({ page }) => {
    await boot(page, DESKTOP);
    await openProductEditor(page);   // F9 (v148): a tall modal that still exists
    const el = page.locator('#ingModal .modal');
    await settled(el);
    const box = await el.boundingBox();
    /* 12vh of 900 = 108. Asserted as a band rather than a number so a type-scale change does
       not fail it, and as "well above centre" because that is the property that changed. */
    expect(box.y).toBeGreaterThan(60);
    expect(box.y).toBeLessThan(160);
  });

  test('<768 the modal is a full-width bottom sheet', async ({ page }) => {
    await boot(page, { width: 390, height: 780 });
    await openProductEditor(page);   // F9 (v148)
    const el = page.locator('#ingModal .modal');
    await settled(el);
    const box = await el.boundingBox();
    const frame = await fixedFrame(page);

    expect(box.width).toBeCloseTo(frame.w, 1);        // edge to edge — no side gutter
    expect(box.x).toBeCloseTo(frame.x, 1);
    expect(box.y + box.height).toBeCloseTo(frame.y + frame.h, 1);   // flush to the bottom edge

    // Top corners rounded, bottom corners square: the sheet grammar, not a floating card.
    const radii = await el.evaluate((n) => {
      const s = getComputedStyle(n);
      return [s.borderTopLeftRadius, s.borderBottomLeftRadius];
    });
    expect(parseFloat(radii[0])).toBeGreaterThan(8);
    expect(parseFloat(radii[1])).toBe(0);
  });

  /* F7 (v146): this test's subject was the BUILDER MODAL's exclusion from the sheet grammar.
     The builder is a full page now, so there is no modal to exclude and nothing here to keep —
     re-pointing it at the wizard would have duplicated the test below it, which already drives
     `#kingWizModal` through the same question. RE-POINTED, not deleted: what it was really
     protecting is that a full-height TAKEOVER does not get the sheet's rounded top and grab
     handle, and the wizard is the last element that needs that. */
  test('the wizard keeps its full-height takeover and does NOT become a sheet', async ({ page }) => {
    await boot(page, { width: 390, height: 780 });
    await page.evaluate(() => { const m = document.getElementById('kingWizModal'); if (m) window.show('kingWizModal'); });
    const el = page.locator('#kingWizModal .modal');
    await settled(el);
    const box = await el.boundingBox();
    const frame = await fixedFrame(page);
    expect(box.width).toBeCloseTo(frame.w, 1);
    expect(box.height).toBeGreaterThan(frame.h * 0.95);

    /* SIZE IS NOT THE TEST, and asserting it alone was a test that could not fail — verified on
       the builder half by dropping the exclusion and watching it pass. The takeover carries
       `min-height:100dvh` from its own ≤560 rule, and min-height beats max-height in CSS, so the
       sheet's 88dvh cap could never shrink it and the width was already 100%.
       What the exclusion ACTUALLY protects is the sheet grammar: square corners (a takeover runs
       to the edge of the screen) and no grab handle (there is no sheet to drag). Those are what
       a lost exclusion changes, so those are what is pinned. */
    const shape = await el.evaluate((n) => ({
      radius: getComputedStyle(n).borderTopLeftRadius,
      handle: getComputedStyle(n, '::before').content,
    }));
    expect(parseFloat(shape.radius)).toBe(0);
    expect(['none', 'normal', '']).toContain(shape.handle);
  });
});

test.describe('shell: the sidebar controls the mock added', () => {
  test('the compact theme toggle is 22px of paint but clears WCAG 2.5.8 to the pointer', async ({ page }) => {
    await boot(page);
    const t = page.locator('#sideThemeToggle');
    const box = await t.boundingBox();

    /* 22x22 is the mock's, and it only renders that way because .side-theme overrides the
       app-wide `button{min-height:44px}` touch floor. Without the override the control is
       22 WIDE by 44 TALL — a lopsided pill that is neither the mock nor the rule. That shipped
       to a browser once during this batch, which is why it is pinned. */
    expect(Math.round(box.width)).toBe(22);
    expect(Math.round(box.height)).toBe(22);

    /* Overriding the touch floor is only defensible because the ::after keeps the POINTER target
       above WCAG 2.5.8's 24x24. Walk outward from the edge and measure what actually hit-tests,
       rather than trusting the declaration — the first cut declared -2px and measured 24x24
       exactly, i.e. no margin at all. */
    await splashGone(page);

    const hitBox = await page.evaluate(() => {
      const el = document.getElementById('sideThemeToggle');
      const r = el.getBoundingClientRect();
      const hit = (x, y) => { const e = document.elementFromPoint(x, y); return e === el || el.contains(e); };
      let l = 0, tp = 0;
      while (l < 12 && hit(r.x - l - 0.5, r.y + r.height / 2)) l++;
      while (tp < 12 && hit(r.x + r.width / 2, r.y - tp - 0.5)) tp++;
      return { w: r.width + 2 * l, h: r.height + 2 * tp };
    });
    expect(hitBox.w).toBeGreaterThanOrEqual(28);
    expect(hitBox.h).toBeGreaterThanOrEqual(28);
  });

  test('the toggle reports the RESOLVED theme, which is what makes it honest under "system"', async ({ page }) => {
    /* This is the toggle's own logic and nothing else in the app provides it. The preference has
       THREE states and the control has TWO, so it cannot report the stored value: under 'system'
       on a dark OS a control showing "off" would be offering to switch to the theme already on
       screen. Emulating the OS is the only way to reach that case.

       Deliberately NOT asserted here: that clicking the toggle re-syncs the Settings segment.
       It does, but renderSettingsTab() also calls syncThemeSeg() (openSettings() did before F9/v148
       moved the priming into the screen's render), so the invariant has two guardians and a test
       cannot tell which one held — verified by deleting the toggle's call and watching an earlier
       version of this test pass. The segment/toggle agreement is covered below as an INVARIANT,
       without claiming to pin the mechanism. */
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.setViewportSize(DESKTOP);
    await installBoot(page);
    await page.addInitScript(() => { try { localStorage.removeItem('cafeCost_theme'); } catch (e) {} });
    await page.goto('/');
    await page.waitForFunction(() => typeof window.show === 'function');

    const underSystem = await page.evaluate(() => ({
      stored: localStorage.getItem('cafeCost_theme'),
      applied: document.documentElement.getAttribute('data-theme'),
      pressed: document.getElementById('sideThemeToggle').getAttribute('aria-pressed'),
    }));
    expect(underSystem.stored).toBe(null);      // still 'system'
    expect(underSystem.applied).toBe('dark');   // resolved from the OS
    expect(underSystem.pressed).toBe('true');   // and the control says so

    // Pressing it leaves 'system' for an explicit choice — the mock has no system state.
    await page.locator('#sideThemeToggle').click();
    const after = await page.evaluate(() => ({
      stored: localStorage.getItem('cafeCost_theme'),
      applied: document.documentElement.getAttribute('data-theme'),
      pressed: document.getElementById('sideThemeToggle').getAttribute('aria-pressed'),
    }));
    expect(after.stored).toBe('light');
    expect(after.applied).toBe('light');
    expect(after.pressed).toBe('false');
  });

  test('the two theme controls show the same answer', async ({ page }) => {
    await boot(page);
    await page.locator('#sideThemeToggle').click();
    await page.evaluate(() => window.showTab('settings'));   // 171: openSettings() is deleted — it was a one-line alias for exactly this
    const state = await page.evaluate(() => ({
      applied: document.documentElement.getAttribute('data-theme'),
      pressed: document.getElementById('sideThemeToggle').getAttribute('aria-pressed'),
      seg: [...document.querySelectorAll('#tab-settings .seg-btn[data-theme-pref]')]
        .find((b) => b.getAttribute('aria-checked') === 'true')?.dataset.themePref,
    }));
    expect(state.seg).toBe(state.applied);
    expect(state.pressed).toBe(state.applied === 'dark' ? 'true' : 'false');
  });

  /* 171 grew this group from two to FOUR — Products joined it and Account gained its first nav
     entry, because §6.1 maps the whole group onto the phone's More list. The hairline assertion
     below is unchanged in intent and had to move to the group's new FIRST member: the rule is
     `.navbtn:not(.nav-bottom) + .nav-bottom::before`, so it follows whichever entry leads the
     group, and pinning it to #sideInvoices would now pass against a hairline drawn in the wrong
     place. That is the same class of silent miss the :first-of-type note below records. */
  test('the sidebar bottom group is the four More screens, under a hairline', async ({ page }) => {
    await boot(page);
    const inv = page.locator('#sideInvoices');
    await expect(inv).toBeVisible();
    // the group, in §6.1's order, all four visible at desktop width
    await expect(page.locator('.navbtn.nav-bottom .nl')).toHaveText(['Products', 'Invoices', 'Settings', 'Account']);

    /* The hairline is a ::before on the first member of the group. It is NOT :first-of-type —
       every nav item is a <button>, so that selector matches the Dashboard tab instead and the
       rule lands 6 rows too high, which is invisible unless something measures it. */
    const rule = await page.locator('#sideProducts').evaluate((n) => getComputedStyle(n, '::before').backgroundColor);
    expect(rule).not.toBe('rgba(0, 0, 0, 0)');
    // …and it is on the FIRST member only, or the group reads as four separated rows
    const onSecond = await inv.evaluate((n) => getComputedStyle(n, '::before').backgroundColor);
    expect(onSecond).toBe('rgba(0, 0, 0, 0)');
    const onDashboard = await page.locator('.navbtn[data-tab="dashboard"]')
      .evaluate((n) => getComputedStyle(n, '::before').backgroundColor);
    expect(onDashboard).toBe('rgba(0, 0, 0, 0)');

    /* F8 (v147) CONSCIOUSLY CHANGED THIS ASSERTION. It used to read "it opens the SAME import flow
       as the Products tab's button", because in v137 Invoices was a sidebar entry with no screen
       behind it. Invoices is a screen now, so the entry NAVIGATES — and the thing worth pinning is
       that it does not do both, which is what a leftover `on('sideInvoices', openInv)` alongside
       the generic .navbtn[data-tab] binding would produce. */
    await inv.click();
    await expect(page.locator('#tab-invoices')).toBeVisible();
    expect(await isOpen(page, 'invModal'), 'navigating must not ALSO open the modal').toBe(false);
    // and the import flow is still one tap from there, on the screen's own primary
    await page.locator('#invUploadBtn').click();
    await expect.poll(() => isOpen(page, 'invModal')).toBe(true);
  });
});
