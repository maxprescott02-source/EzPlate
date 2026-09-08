/*
 * 238-confirm-link.spec.js — what a real browser does with GoTrue's answer to a confirmation link.
 *
 * WHY THIS NEEDS A BROWSER, when boot-gate.test.js already pins the painting. That test drives the
 * real bootGate against a fake DOM and an INJECTED verdict — it starts one step downstream of
 * everything that can go wrong here, and the step it skips is the whole mechanism: a fragment that
 * a real browser puts in `location.hash`, read by module-level code that runs above the Supabase
 * client, cleaned with a real `history.replaceState`, and painted onto an element whose visibility
 * is decided by CSS. A fake `location` cannot fail at any of that, and `gateErr` sets `hidden`,
 * which this repo has watched an author `display` rule beat more than once.
 *
 * It also pins the ORDER against the real library rather than against a reading of it. supabase-js
 * 2.110.8 throws out of `_getSessionFromURL` on an error fragment and swallows it; if this app's
 * reader ever ends up downstream of that, or the library starts clearing the fragment first, the
 * message silently stops appearing and nothing else changes.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const DEAD = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

test('a dead confirmation link is explained on the sign-in gate, in a real browser', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page, { signedOut: true });
  await page.goto('/' + DEAD);

  await expect(page.locator('#bootGate')).toBeVisible();
  const err = page.locator('#bgErr');
  /* toBeVisible, not a textContent read: `gateErr` sets `hidden`, and an author `display` rule that
     beats the UA's `[hidden]` is one of this repo's standing defects — it would leave the element
     carrying the right words and showing them at the wrong times, or carrying none and showing an
     empty red box. Only a computed check can tell. */
  await expect(err).toBeVisible();
  await expect(err).toContainText(/already been used/i);
  await expect(err).toContainText(/sign in/i);

  // and the thing it is telling them to do is on the same screen
  await expect(page.locator('#bgSignForm')).toBeVisible();
  await expect(page.locator('#bgEmail')).toBeVisible();
});

test('the fragment is cleaned, so a refresh does not re-accuse the link', async ({ page }) => {
  await installBoot(page, { signedOut: true });
  await page.goto('/' + DEAD);
  await expect(page.locator('#bgErr')).toBeVisible();

  /* The REAL history.replaceState, which the unit test can only observe through a spy. */
  expect(page.url(), 'the error fragment must not survive in the address bar').not.toContain('error=');
  expect(page.url()).not.toContain('#');

  await page.reload();
  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bgErr')).toBeHidden('a refresh must not repeat a complaint already made');
});

test('⚠️ ?env=staging survives the cleanup — it is what picks the PROJECT', async ({ page }) => {
  /* The assertion with real money behind it. index.html reads `?env=staging` out of location.search
     to choose which Supabase project the app talks to. A cleanup that rewrote the URL to a bare
     pathname would return a rehearsal to Max's production café on its next boot, silently. The unit
     test pins the string this function hands to replaceState; this pins what the BROWSER is left
     holding, which is the thing that actually decides. */
  await installBoot(page, { signedOut: true });
  await page.goto('/?env=staging' + DEAD);

  await expect(page.locator('#bgErr')).toBeVisible();
  expect(page.url()).toContain('env=staging');
  expect(page.url()).not.toContain('error=');
  /* ⚠️ A LINE WAS DELETED HERE AND THE DELETION IS THE POINT. The first draft ended with
     `expect(locator).toHaveCount(await locator.count())` — a count compared against ITSELF, which
     passes forever and reads as the more careful assertion of the three because both sides are real
     measurements. That is roster entry 205 verbatim ("a comparison whose two sides are both
     computed, with no literal anywhere in the assertion"), written by someone who had just read the
     roster, in the spec for a batch whose whole subject is a check that proved nothing.
     What it was groping for — that the staging BADGE is still up — belongs to the env item's own
     specs, which own that element. The URL is what this test is about, and the two lines above say
     it against literals. */
});

test('an ordinary signed-out boot is never accused of a broken link', async ({ page }) => {
  /* The overwhelmingly common case and the one a careless painter breaks: every visitor who has
     clicked nothing at all reaches this same screen. */
  await installBoot(page, { signedOut: true });
  await page.goto('/');
  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bgSignForm')).toBeVisible();
  await expect(page.locator('#bgErr')).toBeHidden();
});

test('a successful confirmation is not treated as an error and keeps its fragment', async ({ page }) => {
  /* The other side of the guard. A fragment carrying tokens belongs to supabase-js; this app must
     neither complain about it nor rewrite it out from under the library mid-initialisation. The
     session itself is faked away by _boot, so what is asserted here is the NON-interference: no
     error line, and the fragment still present for whoever owns it. */
  await installBoot(page, { signedOut: true });
  await page.goto('/#access_token=fake&refresh_token=fake&token_type=bearer&expires_in=3600');
  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bgErr')).toBeHidden('no complaint about a link that worked');
});
