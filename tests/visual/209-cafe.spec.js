/*
 * 209-cafe.spec.js — naming your own café, driven in a real browser.
 *
 * WHY THIS NEEDS A BROWSER. tests/cafe-create.test.js runs every extractable decision in this
 * feature — the name rules, the three-answer discipline, the RPC boundary — and the SQL assertions
 * cover the migration's one-word edits. What NONE of them can see is the piece that matters most:
 * the handler is a DOM event listener inside `bootGate`'s 'nomember' state, and its follow-through
 * is a nested `bootstrapSync`. That whole path is unreachable from a unit test, and CLAUDE.md's
 * roster is twenty-two incidents of a structural assertion standing in for a behavioural one.
 *
 * So the split is the same one v165-invite.spec.js records:
 *   * the unit file proves the DECISIONS;
 *   * this proves the JOURNEY — somebody who has just confirmed an email opens the app, types the
 *     name of their café, and ends up inside a working one.
 *
 * ⚠️ THE STATE IS UNREACHABLE WITHOUT THE SHIM'S `nonMember` FLAG: every table read SUCCEEDS with
 * zero rows, so there is no error to inject and no seed that produces it. See _boot.js.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const PHONE = { width: 380, height: 820 };
const DESK = { width: 1360, height: 900 };

async function bootNonMember(page, size, opts = {}) {
  await page.setViewportSize(size);
  await installBoot(page, Object.assign({ nonMember: true }, opts));
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(400);
}

/* ------------------------------------------------------------------------------------------
   1. THE JOURNEY
   ------------------------------------------------------------------------------------------ */

test('a memberless account names a café and lands in a WORKING app', async ({ page }) => {
  /* The whole item in one test. Before this batch the only way out of this screen was Sign out,
     because a café could not be created except by hand in the Supabase dashboard — which is the
     sentence queue item 1 exists to delete. */
  await bootNonMember(page, PHONE);

  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bgCafeForm')).toBeVisible();

  await page.locator('#bgCafeName').fill('Scoopy’s Family Cafe');
  await page.locator('#bgCafeBtn').click();
  await page.waitForTimeout(600);

  /* ⚠️ THE GATE MUST BE GONE, not merely showing a different message. The latch (`_bootNoMember`)
     is one-way and 'ok' may not clear it — only a definite uuid from the TENANT lookup inside the
     nested re-sync does, several functions away from this handler. If that chain is broken, this
     screen stays up forever with a café that exists, which is the exact silent-failure shape 185
     was built to end, wearing the opposite sign. */
  await expect(page.locator('#bootGate')).toBeHidden();
  await expect(page.locator('#bootGateOut')).toBeHidden();
  /* And the app underneath is real, not an empty shell: the shim's café has products. */
  await expect(page.locator('#syncBanner')).toBeHidden();
});

test('the name is CLEANED before it is sent, not after', async ({ page }) => {
  /* ⚠️ THE BEHAVIOURAL HALF OF cafe-create.test.js's "cleans ONCE, then checks and sends the same
     string". A handler that validated `inp.value` and then sent `inp.value` would pass every source
     assertion and still store a name with a newline in it, which is a café whose name never matches
     what its owner believes they typed. Reading what actually reached the server is the only way to
     tell the two apart. */
  await bootNonMember(page, PHONE);
  await page.locator('#bgCafeName').fill('   Scoopy’s   Family    Cafe   ');
  await page.locator('#bgCafeBtn').click();
  await page.waitForTimeout(600);

  const sent = await page.evaluate(() => window.__createdWith);
  expect(sent).toEqual({ p_name: 'Scoopy’s Family Cafe' });
});

/* ------------------------------------------------------------------------------------------
   2. THE REFUSALS
   ------------------------------------------------------------------------------------------ */

test('a blank name is refused HERE, with no round trip at all', async ({ page }) => {
  /* The client check exists to save a round trip for a mistake the field already knows about — a
     stranger on café wifi waiting on a request to be told they left a box empty is the friction
     this app's one-intermittent-user premise says to remove. So the assertion is not merely "an
     error appears": it is that the server was never asked. */
  await bootNonMember(page, PHONE);
  await page.locator('#bgCafeName').fill('    ');
  await page.locator('#bgCafeBtn').click();
  await page.waitForTimeout(300);

  const err = page.locator('#bgErr');
  await expect(err).toBeVisible();
  await expect(err).toContainText('Enter a name');
  expect(await page.evaluate(() => window.__createCalls || 0)).toBe(0);
  /* Still on the same screen, with the form intact so it can be corrected. */
  await expect(page.locator('#bgCafeForm')).toBeVisible();
  await expect(page.locator('#bgCafeBtn')).toBeEnabled();
});

test('a server refusal shows the SERVER\'s words, and the button comes back', async ({ page }) => {
  /* ⚠️ THE REAL MESSAGE, NOT A FRIENDLY GUESS — CLAUDE.md's writes rule. The refusals this function
     can return are written to be read by the person in front of the form ("confirm your email
     address first, then come back"), and replacing them with "something went wrong" is how somebody
     spends ten minutes on a problem the server already explained.
     ⚠️ AND THE BUTTON MUST COME BACK, or one refusal ends the session on the one screen a brand-new
     account can reach — there is nothing else on it to press except Sign out. */
  await bootNonMember(page, PHONE, { createFails: 'confirm your email address first, then come back' });
  await page.locator('#bgCafeName').fill('Scoopy’s Family Cafe');
  await page.locator('#bgCafeBtn').click();
  await page.waitForTimeout(500);

  const err = page.locator('#bgErr');
  await expect(err).toBeVisible();
  await expect(err).toContainText('confirm your email address');
  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bgCafeBtn')).toBeEnabled();
  /* Its label is restored too. "Setting up…" left frozen under an error message says the opposite
     of what the error says, and two contradictory statements on one screen is worse than one. */
  await expect(page.locator('#bgCafeBtn')).toHaveText('Create my café');
  /* The name is KEPT, so a refusal that is about something else entirely does not also cost the
     user their typing. */
  await expect(page.locator('#bgCafeName')).toHaveValue('Scoopy’s Family Cafe');
});

/* ------------------------------------------------------------------------------------------
   3. THE SCREEN
   ------------------------------------------------------------------------------------------ */

for (const { size, name } of [{ size: PHONE, name: 'phone' }, { size: DESK, name: 'desktop' }]) {
  for (const theme of ['light', 'dark']) {
    test(`the café form is legible and complete @ ${name} ${theme}`, async ({ page }) => {
      /* ⚠️ `cafeCost_theme`, NOT `cafeDB_theme` — v161 records the same mistake on the same key, and
         the assertion below is why it is recorded: the axis must PROVE it took, or light and dark
         are two copies of one test. */
      await page.setViewportSize(size);
      await installBoot(page, { nonMember: true });
      await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
      await page.goto('http://localhost:5173/');
      await page.waitForFunction(() => window.__ezReady === true);
      await page.waitForTimeout(400);

      const bg = await page.locator('#bootGate').evaluate((el) => getComputedStyle(el).backgroundColor);
      const lum = (bg.match(/\d+/g) || []).slice(0, 3).reduce((a, n) => a + Number(n), 0) / 3;
      if (theme === 'dark') expect(lum, `dark gate background was ${bg}`).toBeLessThan(110);
      else expect(lum, `light gate background was ${bg}`).toBeGreaterThan(160);

      const note = page.locator('#bgCafeNote');
      await expect(note).toBeVisible();
      /* ⚠️ LEFT-ALIGNED, and it is checked rather than assumed. `#bootGate` centres its text, so a
         three-line warning inherits centring and reads as a caption under the form rather than as a
         warning about the button above it — which is exactly the defect 208 found by driving the
         privacy acceptance at 380px and could not have found by reading the rule. */
      expect(await note.evaluate((el) => getComputedStyle(el).textAlign)).toBe('left');
      /* And it is not the same colour as the background it sits on. A warning nobody can read is
         the same as no warning, and this one names an action that cannot be undone. */
      const [fg, bgc] = await note.evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.color, getComputedStyle(document.getElementById('bootGate')).backgroundColor];
      });
      expect(fg).not.toBe(bgc);

      /* Nothing is clipped by the box that holds it — `.bg-inner` has no overflow rule, so a
         scrollHeight past clientHeight means the copy is being cut off rather than wrapped. The
         screen is taller than it was before this batch by a form, a warning and a button. */
      const clipped = await page.locator('#bootGate .bg-inner').evaluate(
        (el) => el.scrollHeight > el.clientHeight + 1);
      expect(clipped, 'the café form or its warning is clipped off this screen').toBe(false);

      /* The field is a real tap target and sits inside the viewport at both widths. */
      const box = await page.locator('#bgCafeName').boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThanOrEqual(40);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width);
    });
  }
}

test('the café form appears on NO other state of this gate', async ({ page }) => {
  /* ⚠️ THE `hideForms` HALF, and it is the regression this batch could most easily have shipped.
     An author `display:flex` on `.acct-form` beats the UA's `[hidden]` on ORIGIN — CLAUDE.md's
     `[hidden]` corollary — so the guard scoped to #bootGate is the only thing keeping a hidden form
     hidden, and `hideForms` is the only thing that hides it on the states that are not 'nomember'.
     Two states are checked because they reach the paint by different branches. */
  await page.setViewportSize(PHONE);
  await installBoot(page, { signedOut: true });
  await page.goto('http://localhost:5173/');
  await page.waitForFunction(() => window.__ezReady === true);
  await page.waitForTimeout(300);
  await expect(page.locator('#bgSignForm')).toBeVisible();
  await expect(page.locator('#bgCafeForm')).toBeHidden();
  await expect(page.locator('#bgCafeNote')).toBeHidden();

  /* And on the sign-up side, which `gateMode` swaps to without going through bootGate at all. */
  await page.locator('#bgToSignUp').click();
  await expect(page.locator('#bgSignUpForm')).toBeVisible();
  await expect(page.locator('#bgCafeForm')).toBeHidden();
});

test('a re-sync does NOT empty a half-typed café name', async ({ page }) => {
  /* ⚠️ SHOWN, NEVER RESET — the rule the sign-in form three states up already carries, and it bites
     harder here: a password manager can put a password back, and nothing can put back the name
     somebody was halfway through typing. `bootGate('nomember')` runs again on every re-sync that
     reaches it, and an `online` blip on café wifi is an ordinary event rather than an exotic one.
     `rpcFailsAfter` makes the re-sync's tenant lookup fail, which is the shape that repaints this
     screen rather than leaving it — 185's own recorded scenario. */
  await bootNonMember(page, PHONE, { rpcFailsAfter: 1 });
  await page.locator('#bgCafeName').fill('Half typed na');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(700);

  await expect(page.locator('#bootGate')).toBeVisible();
  await expect(page.locator('#bgCafeName')).toHaveValue('Half typed na');
});
