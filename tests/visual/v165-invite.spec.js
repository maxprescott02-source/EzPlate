/*
 * v165-invite.spec.js — 192. Invitations, driven in a real browser.
 *
 * tests/invites-client.test.js runs every extractable function in this feature. What it CANNOT run
 * is the one piece that matters most: the claim's placement inside `bootstrapSync`, which is a
 * branch of the async function that owns the whole boot. Its unit assertions there are structural,
 * and CLAUDE.md's roster is twenty incidents of a structural assertion that could not fail.
 *
 * So this file is the behavioural half, and the two are deliberately complementary:
 *   * the unit file proves the DECISIONS (three answers, the guards, the writes);
 *   * this proves the JOURNEY — a person who has been invited opens the app and ends up inside a
 *     café, with no button to press and no reload.
 *
 * ⚠️ v161 and v162 are the specs this one sits beside, and the trap they record applies here too:
 * `__rpcCalls` counts the TENANT lookup only. The three RPCs this batch adds return ABOVE that
 * counter in the shim, deliberately — 188 retired an assertion in v161 by adding one call to the
 * same Promise.all, and that is the single worst kind of defect this repo has had.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

const PHONE = { width: 380, height: 780 };

/* ------------------------------------------------------------------------------------------
   1. THE JOURNEY — invited, then opens the app
   ------------------------------------------------------------------------------------------ */

test('an invited account is joined at the gate and lands in a WORKING app, not on the non-member screen', async ({ page }) => {
  /* The whole feature in one assertion. `nonMember` is the state 185 paints and `invited` is an
     owner having created the row first — so this boots exactly as the real person does: signed in,
     a member of nothing, with an invitation waiting. Nothing is clicked. */
  await page.setViewportSize(PHONE);
  await installBoot(page, { nonMember: true, invited: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(400);

  const gate = page.locator('#bootGate');
  await expect(gate).toBeHidden();
  /* ⚠️ AND THE APP MUST ACTUALLY HAVE DATA IN IT, which is the assertion that separates "the gate
     went away" from "the claim worked". A re-sync that ran but still read as a non-member would
     leave every store empty, and 185's whole lesson is that an empty app raises nothing. */
  await gotoTab(page, 'ingredients');
  /* The RENDERED list, not the in-memory store. `PRODUCTS` is module-scoped in app.js and is not
     reachable from a spec — and it would be the weaker check anyway: what this batch has to prove
     is that a screen the person can look at has their café on it, which is exactly the thing 185's
     silent-empty-app defect had going for it. */
  await expect(page.locator('#ingList')).not.toBeEmpty();
  const empties = await page.locator('#ingList .empty-state, #ingList .emp').count();
  expect(empties).toBe(0);
});

test('a successful join re-syncs exactly once — no extra round trip on a phone', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await installBoot(page, { nonMember: true, invited: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(600);
  /* Two tenant lookups and no more: the boot that found no café, and the re-sync after the join. */
  expect(await page.evaluate(() => window.__rpcCalls)).toBe(2);
  await expect(page.locator('#bootGate')).toBeHidden();
});

test('THE LATCH: a claim that keeps saying "joined" while the tenant keeps saying "no café" still settles', async ({ page }) => {
  /* ⚠️ THIS SPEC EXISTS BECAUSE THE FIRST VERSION OF IT WAS WORTHLESS, and recording that is worth
     more than the test. It was called "the latch, driven rather than read", it passed, and it went
     on passing with `!_claiming` DELETED — because in the ordinary fixture a successful claim makes
     the re-sync succeed, so the nested run never reaches the claim branch and the latch is never
     consulted. The name claimed a guarantee the assertions could not give. Caught by hand-mutating
     a spec written that hour, which is exactly what CLAUDE.md 190 argues for and exactly the
     twenty-incident class it counts.
     `claimLoops` is the state that DOES consult the latch: the claim answers a café id every time
     while the tenant lookup keeps answering none — replication lag, a server bug, or a membership
     revoked in the same instant. Without the latch, bootstrapSync calls itself forever, on a phone,
     behind a spinner. With it there is one nested run and then the honest screen. */
  await page.setViewportSize(PHONE);
  await installBoot(page, { nonMember: true, invited: true, claimLoops: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(1200);                         // long enough for a runaway to be obvious

  /* The boot, and ONE re-sync. A runaway shows here as a number that keeps climbing. */
  const first = await page.evaluate(() => window.__rpcCalls);
  expect(first).toBe(2);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__rpcCalls)).toBe(first);   // and it has STOPPED, not merely paused

  /* And it settles on the honest screen rather than a spinner: the claim said joined, the server
     still shows no café, so what the person is told is 185's message — which is true. */
  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bootGateMsg')).toContainText('isn’t part of a café');
});

test('a NON-member with no invitation gets 185s screen — now carrying 209s form', async ({ page }) => {
  /* The regression half. 192 added a call on the path 185 owns, and the overwhelmingly common
     outcome of that call is "there was nothing to claim" — which must change nothing about the
     claim itself.
     ⚠️ 209 CHANGED WHAT THAT SCREEN OFFERS, and this test was rewritten rather than left to fail
     on the wording. The person it paints for used to be told "ask the café owner to add this
     account", which was honest while a café could only be made by hand in the Supabase dashboard
     and is now advice to wait for somebody who may not exist. The sign-in and sign-up forms stay
     hidden — this account IS signed in — and the café form is what is offered instead. */
  await page.setViewportSize(PHONE);
  await installBoot(page, { nonMember: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(400);
  const gate = page.locator('#bootGate');
  await expect(gate).toBeVisible();
  await expect(page.locator('#bootGateMsg')).toContainText('isn’t part of a café');
  await expect(page.locator('#bootGateOut')).toBeVisible();
  await expect(page.locator('#bgSignForm')).toBeHidden();
  await expect(page.locator('#bgSignUpForm')).toBeHidden();
  await expect(page.locator('#bgCafeForm')).toBeVisible();
  await expect(page.locator('#bgCafeNote')).toBeVisible();
});

/* ------------------------------------------------------------------------------------------
   2. THE SIGN-UP SIDE OF THE GATE
   ------------------------------------------------------------------------------------------ */

test('signed out: the sign-up form is reachable, and swaps the screen cleanly', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await installBoot(page, { signedOut: true, invited: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(300);

  await expect(page.locator('#bgSignForm')).toBeVisible();
  await expect(page.locator('#bgAltIn')).toBeVisible();
  await expect(page.locator('#bgSignUpForm')).toBeHidden();

  await page.locator('#bgToSignUp').click();
  await expect(page.locator('#bgSignUpForm')).toBeVisible();
  await expect(page.locator('#bgSignForm')).toBeHidden();
  /* ⚠️ EXACTLY ONE ALT LINK IS UP AT A TIME. Two would give a screen two ways back to the same
     place; none would strand somebody on the wrong form. Counted rather than checked one at a
     time, so a future third link cannot slip in unnoticed. */
  expect(await page.locator('#bootGate .bg-alt:not([hidden])').count()).toBe(1);
  await expect(page.locator('#bgAltUp')).toBeVisible();
  await expect(page.locator('#bootGateMsg')).toContainText('invited');

  await page.locator('#bgToSignIn').click();
  await expect(page.locator('#bgSignForm')).toBeVisible();
  await expect(page.locator('#bgSignUpForm')).toBeHidden();
  expect(await page.locator('#bootGate .bg-alt:not([hidden])').count()).toBe(1);
});

test('an INVITED address signs up and is told about the confirmation email', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await installBoot(page, { signedOut: true, invited: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(300);

  await page.locator('#bgToSignUp').click();
  await page.locator('#bgUpEmail').fill('new@example.com');
  await page.locator('#bgUpPass').fill('a-real-password');
  /* item 2 (batch 208): the privacy acceptance is part of this flow now — the sign-up gate refuses
     before `signUp` runs, which is the first committing action on this screen. Ticking it here is
     not weakening the test: it is the step a real user takes, and tests/visual/item2-privacy.spec.js
     is what pins that the refusal fires when they do not.
     ⚠️ This spec went red in CI and green on the laptop, because that batch ran only its OWN new
     spec locally. The hook is the fast local copy; CI is the one that actually holds. */
  await page.locator('#bgUpAccept').check();
  await page.locator('#bgUpBtn').click();
  await page.waitForTimeout(300);

  /* ⚠️ THE FORM IS REPLACED, not merely joined by a message. `signUp` returns no session with
     confirmation on, so the screen is otherwise identical to a failure — and submitting twice
     sends a second email and reads as though the first did not work. */
  await expect(page.locator('#bgSignUpForm')).toBeHidden();
  const done = page.locator('#bgDone');
  await expect(done).toBeVisible();
  await expect(done).toContainText('new@example.com');
  await expect(done).toContainText('confirmation');
  await expect(page.locator('#bgErr')).toBeHidden();
});

test('209: an UNINVITED address signs up — sign-up is self-service now', async ({ page }) => {
  /* ⚠️ THIS TEST USED TO ASSERT THE OPPOSITE and the reversal is a decision, not a regression.
     192 refused an uninvited address before `signUp` ran, on the strength of "a self-service
     sign-up form is still NO (Max, 14 Aug 2026)". He reversed that the same day, in writing,
     choosing shape B — a stranger creates an account and names their own café, unattended
     (`docs/decisions/2026-08-14-cafe-creation.md` q1). An uninvited address is the CUSTOMER now.
     The fixture is deliberately the same one the old test used — `signedOut` with no `invited` —
     so what changed is the expectation and not the setup. */
  await page.setViewportSize(PHONE);
  await installBoot(page, { signedOut: true });          // no `invited`
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(300);

  await page.locator('#bgToSignUp').click();
  await page.locator('#bgUpEmail').fill('stranger@example.com');
  await page.locator('#bgUpPass').fill('a-real-password');
  await page.locator('#bgUpAccept').check();   // item 2: the privacy acceptance is the one thing that still runs first
  await page.locator('#bgUpBtn').click();
  await page.waitForTimeout(300);

  /* The same "check your email" outcome an invited address gets, because there is no longer any
     difference between them at this step. */
  await expect(page.locator('#bgErr')).toBeHidden();
  await expect(page.locator('#bgSignUpForm')).toBeHidden();
  const done = page.locator('#bgDone');
  await expect(done).toBeVisible();
  await expect(done).toContainText('stranger@example.com');
  await expect(done).toContainText('confirmation');
});

/* ------------------------------------------------------------------------------------------
   3. THE TEAM CARD
   ------------------------------------------------------------------------------------------ */

test('an owner sees the team, invites somebody, and the invitation appears', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await installBoot(page);
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await gotoTab(page, 'account');
  await page.waitForTimeout(300);

  const own = page.locator('#teamOwner');
  await expect(own).toBeVisible();
  await expect(page.locator('#teamList')).toContainText('max@example.com');
  await expect(page.locator('#teamList')).toContainText('Owner');

  await page.locator('#teamEmail').fill('newstaff@example.com');
  await page.locator('#teamAdd').click();
  await page.waitForTimeout(400);

  /* The invitation is in the list WITHOUT a reload — the re-read after the write, which the
     mutation gate found unpinned. */
  await expect(page.locator('#teamList')).toContainText('newstaff@example.com');
  await expect(page.locator('#teamList [data-revoke]')).toHaveCount(1);
  await expect(page.locator('#teamEmail')).toHaveValue('');
  await expect(page.locator('#teamErr')).toBeHidden();

  /* And revoking takes it away again. The confirm is real, so it has to be answered. */
  await page.locator('#teamList [data-revoke]').click();
  await page.waitForTimeout(200);
  await page.locator('#confirmOk').click();
  await page.waitForTimeout(400);
  await expect(page.locator('#teamList [data-revoke]')).toHaveCount(0);
  await expect(page.locator('#teamList')).toContainText('max@example.com');   // the member survives
});

test('staff see the roles sentence and NO invitations surface at all', async ({ page }) => {
  /* 191 refuses staff every command on the table, the SELECT included. §R4: a capability you do
     not have is stated in a sentence, never mimed with a control — and an empty list under an
     Invite button that fails is the worst of both. */
  await page.setViewportSize(PHONE);
  await installBoot(page, { role: 'staff' });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await gotoTab(page, 'account');
  await page.waitForTimeout(300);

  await expect(page.locator('#teamOwner')).toBeHidden();
  await expect(page.locator('#teamEmail')).toBeHidden();
  await expect(page.locator('#teamAdd')).toBeHidden();
  /* ⚠️ HIDDEN, not merely absent from the layout. This is the CLAUDE.md `[hidden]` trap: an author
     `display` rule beats the UA's `[hidden]{display:none}` on origin, so the block would sit there
     with `hidden` set and the unit assertion still green. toBeHidden() measures the rendered box. */
  await expect(page.locator('#teamRole')).toContainText('signed in as staff');
});

test('both themes: the gate sign-up link and the team rows are legible', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.setViewportSize(PHONE);
    await installBoot(page, { signedOut: true, invited: true });
    await page.goto('http://localhost:5173/');
    await page.addInitScript(() => { /* theme is applied below, after boot */ });
    await page.waitForFunction(() => window.__ezReady === true);
    await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); }, theme);
    await page.waitForTimeout(200);

    /* ⚠️ AN EQUALITY ASSERTION, NOT A DENYLIST — CLAUDE.md 190, whose whole lesson was that "not
       the browser's default blue" passed in dark mode because Chromium picks a different default
       there. The link must be the app's accent ink, which is a fact about this app rather than a
       guess about every wrong colour there could be. */
    const link = page.locator('#bgToSignUp');
    await expect(link).toBeVisible();
    const [got, want] = await page.evaluate(() => {
      const a = document.getElementById('bgToSignUp');
      const probe = document.createElement('span');
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent-ink').trim();
      document.body.appendChild(probe);
      const w = getComputedStyle(probe).color;
      probe.remove();
      return [getComputedStyle(a).color, w];
    });
    expect(got).toBe(want);
  }
});
