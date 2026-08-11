/*
 * q9-settings.spec.js — REWRITTEN for F9 (v148), when Settings became a screen.
 *
 * What this file used to guard was the v128 modal's one load-bearing invariant: the section title
 * was sr-only on desktop (where it duplicated the highlighted nav item) and the ONLY visible label
 * on mobile detail. Both halves of that are gone with the modal — there is no nav to duplicate and
 * no detail view to be the only label of. Rewritten rather than deleted, because the QUESTION it
 * was asking survives the conversion: does every section have a visible, correctly-labelled home at
 * both widths, and does the screen render its values from state rather than from the markup?
 *
 * The one thing this file exists to catch is the priming. openSettings() primed the form on every
 * OPEN; a screen has no open event, so a navigation that forgets to render leaves every control
 * showing its markup default — 0%, GST-exclusive, a switch reading off while the flag is on — with
 * no error anywhere and a green unit suite. tests/settings-toggles.test.js pins the function; this
 * pins what a user actually sees after a real navigation in a real browser.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

async function boot(page, width) {
  await page.setViewportSize({ width, height: 800 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
}

/* The route depends on the width and the two do NOT overlap. 171 replaced the mobile half — the
   header gear is deleted and Settings is reached through the More screen — but the reason this
   helper exists is unchanged: `.nav-more` is hidden at >=1024 and `.nav-bottom` below it, so
   clicking the wrong one for the width tests nothing. Below 1024 that is now TWO clicks, because
   Settings is one level down under More, which is exactly what §6 designs. */
const openSettings = async (page, width) => {
  if (width >= 1024) { await page.click('#sideSettings'); return; }
  await page.click('.navbtn[data-tab="more"]');
  await page.waitForTimeout(200);
  await page.click('#tab-more [data-more="settings"]');
};

// F10 (v149): seven, not F9's eight — Account and Team moved to #tab-account, and the Account card
// left behind is the door to it rather than a third copy of the same sentence.
const CARDS = ['Costing', 'AI features', 'Appearance', 'Lists', 'Data', 'Account', 'About'];

// 380 is the phone Max works on; 1280 is the desktop the mock is drawn at; 900 sits between the
// v3 768 breakpoint and the 1024 nav breakpoint, which is the band where a route mistake hides.
for (const width of [380, 900, 1280]) {
  test(`${width}px: every section card is visible at once, correctly labelled`, async ({ page }) => {
    await boot(page, width);
    await openSettings(page, width);
    await page.waitForTimeout(400);

    await expect(page.locator('#tab-settings')).toBeVisible();
    const heads = page.locator('#tab-settings .stg-card-h');
    await expect(heads).toHaveText(CARDS);

    /* All eight AT ONCE is the whole point of the conversion — the modal showed one at a time and
       that drill is what a screen replaces. Asserted as "every card has a real box", not as a
       count of DOM nodes, because a hidden card still counts. */
    for (const label of CARDS) {
      const card = page.locator('#tab-settings .stg-card', { hasText: label }).first();
      const box = await card.boundingBox();
      expect(box, `${label} card must be rendered`).not.toBeNull();
      expect(box.height, `${label} card must have height`).toBeGreaterThan(20);
    }
  });

  test(`${width}px: the screen renders values from state, not from the markup defaults`, async ({ page }) => {
    await boot(page, width);
    /* Set the state to something no markup default could produce, THEN navigate. If the priming is
       dropped the target renders empty (the input has no value attribute) and the GST select falls
       to its first option — both of which are exactly what a user would see and disbelieve. */
    await page.evaluate(() => {
      window.setCogs(37, false);
      window.setGstDefault('inc', false);
      window.setAiInvoiceCheck(false, false);
    });
    await openSettings(page, width);
    await page.waitForTimeout(400);

    await expect(page.locator('#setCogsInput')).toHaveValue('37');
    await expect(page.locator('#setGstDefault')).toHaveValue('inc');
    await expect(page.locator('#setAiInvoiceChk')).not.toBeChecked();
    await expect(page.locator('#setVersion')).not.toHaveText('—');

    /* And AGAIN after leaving and coming back, with the state changed while the screen was off.
       This is the regression a "render once on first show" optimisation would introduce, and it is
       invisible until a user changes the target on one device and opens Settings on another. */
    await page.evaluate(() => { window.showTab('builder'); window.setCogs(29, false); });
    await openSettings(page, width);
    await page.waitForTimeout(400);
    await expect(page.locator('#setCogsInput')).toHaveValue('29');
  });
}

test('380px: the theme segment is reachable and usable on a phone — it is the only theme control there', async ({ page }) => {
  /* The sidebar's compact toggle (F1b) is inside .side-theme, which @media (max-width:1023px)
     hides. So below 1024 this segment is the ONLY way to change theme, which is why R3 rehomed it
     onto the screen rather than letting the mock's silence delete it. */
  await boot(page, 380);
  await expect(page.locator('.side-theme')).toBeHidden();
  await openSettings(page, 380);
  await page.waitForTimeout(400);

  const seg = page.locator('#tab-settings .seg-btn[data-theme-pref]');
  await expect(seg).toHaveCount(3);
  await page.locator('#setThemeDark').click();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  await expect(page.locator('#setThemeDark')).toHaveAttribute('aria-checked', 'true');
});

test('380px: every control on the screen clears a 44px tap target', async ({ page }) => {
  /* F9 shrank the switch TRACK to the mock's 44x26 on mobile (from 48x28). The track is decoration;
     the label around it is what a thumb hits, and it must not have shrunk with it. Measured rather
     than read, because the whole point of the change was a number in the CSS. */
  await boot(page, 380);
  await openSettings(page, 380);
  await page.waitForTimeout(400);
  const ids = ['setCogsInput', 'setGstDefault', 'setSmemOpen', 'setTidyOpen',
    'setExport', 'setRestore', 'setClearCache', 'setThemeLight'];
  for (const id of ids) {
    const box = await page.locator('#' + id).boundingBox();
    expect(box, `#${id} must be on screen`).not.toBeNull();
    expect(box.height, `#${id} tap height`).toBeGreaterThanOrEqual(43.5);
  }
  for (const id of ['setAiInvoiceChk', 'setAiSuggestChk']) {
    // the <label class="switch"> is the target, not the visually-hidden input
    const box = await page.locator(`#${id}`).locator('xpath=ancestor::label[1]').boundingBox();
    expect(box, `#${id} switch label`).not.toBeNull();
    expect(box.height, `#${id} switch tap height`).toBeGreaterThanOrEqual(43.5);
  }
});

test('1280px: leaving Settings for another tab really leaves it, and coming back is one click', async ({ page }) => {
  /* The v128 review's finding, repointed: the sidebar entry wears .navbtn, and the first cut of the
     Invoices conversion let the blanket wiring run showTab(undefined), blanking every pane and
     writing the string "undefined" into cafeDB_lastTab. Settings carries a data-tab now, so it goes
     through the same path and needs the same round trip pinned. */
  await boot(page, 1280);
  await page.click('#sideSettings');
  await page.waitForTimeout(300);
  await page.click('.navbtn[data-tab="dashboard"]');
  await page.waitForTimeout(300);

  const state = await page.evaluate(() => ({
    visiblePanes: ['builder', 'ingredients', 'analysis', 'dashboard', 'pantry', 'invoices', 'settings']
      .filter((n) => document.getElementById('tab-' + n).style.display !== 'none'),
    lastTab: localStorage.getItem('cafeDB_lastTab'),
    settingsActive: document.getElementById('sideSettings').classList.contains('active'),
  }));
  expect(state.visiblePanes, 'exactly one pane is visible').toEqual(['dashboard']);
  expect(state.lastTab).toBe('dashboard');
  expect(state.settingsActive, 'the Settings entry gives up the active pill when you leave').toBe(false);

  await page.click('#sideSettings');
  await page.waitForTimeout(300);
  await expect(page.locator('#tab-settings')).toBeVisible();
  expect(await page.evaluate(() =>
    document.getElementById('sideSettings').classList.contains('active')),
  ).toBe(true);
});

test('380px: the Settings row is the whole route to Account, and it works with a thumb', async ({ page }) => {
  /* 171: this row is no longer the ONLY way in — the More screen's Account row is the phone's own
     route and #sideAccount is desktop's — but it survives, F10's reason for it stands, and a broken
     handler and a missing row still look identical in the markup. So it is still driven here, and
     the More route is driven in the test below. */
  await boot(page, 380);
  await openSettings(page, 380);
  await page.waitForTimeout(400);
  const door = page.locator('#setAccountOpen');
  await expect(door).toBeVisible();
  expect((await door.boundingBox()).height, 'tap height').toBeGreaterThanOrEqual(43.5);

  await door.click();
  await page.waitForTimeout(400);
  await expect(page.locator('#tab-account')).toBeVisible();
  await expect(page.locator('#tab-settings')).toBeHidden();
  await expect(page.locator('#tab-account .stg-card-h')).toHaveText(['Profile', 'Team', 'Plan']);

  /* Not a dead end — and 171 gave it the §6 answer rather than the fallback this used to accept:
     the "‹ More" chevron goes back to the screen it was opened from. The bottom bar still works too
     and both are checked, because losing either would strand the screen in a different way. */
  await page.click('#tab-account .scr-back');
  await page.waitForTimeout(400);
  await expect(page.locator('#tab-more')).toBeVisible();
  await expect(page.locator('#tab-account')).toBeHidden();
  await page.click('.navbtn[data-tab="dashboard"]');
  await page.waitForTimeout(400);
  await expect(page.locator('#tab-account')).toBeHidden();
  await expect(page.locator('#tab-dashboard')).toBeVisible();
});

test('1280px: the account screen renders, and only its BACKED card carries controls', async ({ page }) => {
  await boot(page, 1280);
  await page.click('#sideSettings');
  await page.waitForTimeout(300);
  await page.click('#setAccountOpen');
  await page.waitForTimeout(400);
  await expect(page.locator('#tab-account')).toBeVisible();
  /* §R4: the mock draws Edit profile / Invite a teammate / Manage billing / Sign out, and the rule
     is "a capability that does not exist is stated in a sentence, never mimed with a control that
     does nothing".
     ⚠️ 174 NARROWED this from "no control anywhere in the body" to "no control in Team or Plan",
     because Profile now HAS the capability — real Supabase sign-in — and a card that earned its
     controls is the rule working, not the rule being dodged. Team and Plan still describe backends
     that do not exist and are still asserted empty. */
  const promiseCards = '#tab-account .stg-card:not(:has(#acctForm))';
  await expect(page.locator(`${promiseCards} button, ${promiseCards} input, ${promiseCards} select, ${promiseCards} a`)).toHaveCount(0);
  // and the backed card really is backed, so this cannot pass by the form having vanished
  await expect(page.locator('#tab-account #acctForm')).toBeVisible();
  await expect(page.locator('#tab-account #acctIn')).toBeVisible();
  // 171: scoped to the body. The screen gained a "‹ More" chevron in its shared header — navigation,
  // not a capability — and at 1280 it is display:none anyway, which is asserted rather than assumed.
  await expect(page.locator('#tab-account .scr-back')).toBeHidden();
  for (const label of ['Profile', 'Team', 'Plan']) {
    const box = await page.locator('#tab-account .stg-card', { hasText: label }).first().boundingBox();
    expect(box, `${label} card`).not.toBeNull();
    expect(box.height).toBeGreaterThan(20);
  }
});
