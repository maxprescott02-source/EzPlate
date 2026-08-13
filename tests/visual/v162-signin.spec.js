/*
 * v162-signin.spec.js — 186. The boot gate for a browser with nobody signed in.
 *
 * WHY THIS STATE EXISTS NOW. This batch removes the `auth.uid() is null` branch from
 * `current_business_id()` — the last permissive read in the database, and the reason the published
 * anon key could read Scoopy's pricing. Afterwards a signed-out caller answers a null tenant, which
 * is byte-for-byte what a signed-in non-member answers, so the client has to tell them apart from
 * the session and show opposite screens. 185's screen says "ask the café owner"; this one is the
 * front door and has to be usable.
 *
 * WHY IT NEEDS A BROWSER. The unit tests pin which screen and which buttons. What they cannot see is
 * whether someone can actually SIGN IN on a 380px phone: three fields stacked in a `max-width:34ch`
 * box, inside a fixed overlay, with a form whose base rules live in a media query this screen
 * deliberately does not use. Every failure this repo keeps finding in that gap — a rule that loses
 * the cascade, an author `display` that beats `[hidden]`, a control off the bottom of the viewport —
 * is invisible to a green suite and obvious here.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const WIDTHS = [
  { w: 380, h: 820, name: 'phone' },
  { w: 1360, h: 900, name: 'desktop' },
];

for (const { w, h } of WIDTHS) {
  for (const theme of ['light', 'dark']) {
    test(`the sign-in gate is usable @ ${w} ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await installBoot(page, { signedOut: true });
      /* ⚠️ `cafeCost_theme`, NOT `cafeDB_theme` — and the luminance assertion below is what stops
         the two themes silently becoming two copies of one test. v142-menu.spec.js and
         v161-nonmember.spec.js both record this exact mistake on this exact key. */
      await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
      await page.goto('/');

      const gate = page.locator('#bootGate');
      await expect(gate).toBeVisible();

      const bg = await gate.evaluate((el) => getComputedStyle(el).backgroundColor);
      const lum = (bg.match(/\d+/g) || []).slice(0, 3).reduce((a, n) => a + Number(n), 0) / 3;
      if (theme === 'dark') expect(lum, `dark gate background was ${bg}`).toBeLessThan(110);
      else expect(lum, `light gate background was ${bg}`).toBeGreaterThan(160);

      await expect(page.locator('#bootGateMsg')).toContainText('Sign in');
      // and it must NOT be wearing 185's screen, which would tell a stranger to ask the café owner
      await expect(page.locator('#bootGateMsg')).not.toContainText('No data has been lost');
      await expect(page.locator('#bootGateOut')).toBeHidden();
      await expect(page.locator('#bootGateRetry')).toBeHidden();

      /* THE `[hidden]` TRAP, MEASURED RATHER THAN REASONED. `.acct-form` sets `display:flex`, an
         author rule, and author origin beats the UA's `[hidden]{display:none}` before specificity
         is compared — so without the #bootGate guard this form sits visible on the loading screen
         and on the error screen too. Asserting it is visible HERE cannot catch that; asserting the
         computed display of a hidden one can. */
      const leaks = await page.evaluate(() => {
        const f = document.getElementById('bgSignForm');
        const was = f.hidden;
        f.hidden = true;
        const shown = getComputedStyle(f).display !== 'none';
        f.hidden = was;
        return shown;
      });
      expect(leaks, 'the form ignores [hidden] — it will sit over every other gate state').toBe(false);

      /* Every control on screen and reachable. The button is the part that goes first, because it
         is last in flow inside a centred `max-width` box. */
      for (const sel of ['#bgEmail', '#bgPass', '#bgSignBtn']) {
        const box = await page.locator(sel).boundingBox();
        expect(box, `${sel} has no box`).not.toBeNull();
        expect(box.y, `${sel} above the viewport`).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height, `${sel} below the fold`).toBeLessThanOrEqual(h);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${sel} overflows the width`).toBeLessThanOrEqual(w);
        // a tap target on a phone, not a link-sized one
        expect(box.height, `${sel} is too short to tap`).toBeGreaterThanOrEqual(40);
        // and wide enough to type into: the 180px flex-basis becoming a HEIGHT is a real regression
        // this file's sibling rules already caused once (see .acct-in in css/style.css)
        expect(box.width, `${sel} is too narrow to use`).toBeGreaterThanOrEqual(160);
      }

      // one control per line — never two fields side by side in a 34ch column
      const rows = await page.evaluate(() => {
        const ids = ['bgEmail', 'bgPass', 'bgSignBtn'];
        return ids.map((id) => Math.round(document.getElementById(id).getBoundingClientRect().top));
      });
      expect(new Set(rows).size, 'the three controls must be on three lines').toBe(3);

      const clipped = await page.locator('#bootGate .bg-inner').evaluate(
        (el) => el.scrollHeight > el.clientHeight + 1);
      expect(clipped, 'the sign-in box is clipped — it is the only thing on this screen').toBe(false);

      // Nothing failed, so nothing may claim it did.
      await expect(page.locator('#syncBanner')).toBeHidden();
    });
  }
}

test('the caret starts in the email field, so the first keystroke goes somewhere', async ({ page }) => {
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page, { signedOut: true });
  await page.goto('/');
  await expect(page.locator('#bgSignForm')).toBeVisible();
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.id);
  expect(focused).toBe('bgEmail');
});

test('a wrong password says so in the server’s own words, and the form stays usable', async ({ page }) => {
  /* The failure path is the one a real person meets: the account exists, the password is wrong, and
     a generic "something went wrong" is how someone spends ten minutes on a typo'd email. The
     button must also come back — a disabled button on a screen with nothing else on it is a dead
     end (CLAUDE.md 184(a): a promise has two settle paths). */
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page, { signedOut: true });
  await page.goto('/');

  await page.locator('#bgEmail').fill('max@example.com');
  await page.locator('#bgPass').fill('wrongpass');
  await page.locator('#bgSignBtn').click();

  await expect(page.locator('#bgErr')).toBeVisible();
  await expect(page.locator('#bgErr')).toContainText('Invalid login credentials');
  await expect(page.locator('#bgSignBtn')).toBeEnabled();
  await expect(page.locator('#bootGate')).toBeVisible();
  // the email is kept: retyping it after a password slip is the small cruelty this avoids
  await expect(page.locator('#bgEmail')).toHaveValue('max@example.com');
});

test('signing in gets you into the app — the whole round trip, not just the paint', async ({ page }) => {
  /* The shim keeps its fake session in localStorage precisely so it survives the reload authApply
     performs, which is what makes this drivable end to end. Without this test the screen could be
     perfect and the button could do nothing. */
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page, { signedOut: true });
  await page.goto('/');

  await expect(page.locator('#bootGate')).toBeVisible();
  await page.locator('#bgEmail').fill('max@example.com');
  await page.locator('#bgPass').fill('correcthorse');
  await page.locator('#bgSignBtn').click();

  // authApply purges this device and reloads; the reload boots with a session and a real tenant.
  await expect(page.locator('#bootGate')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#appMain')).toBeVisible();
  // and the password is not left sitting in the DOM of the page we came from
  const val = await page.evaluate(() => {
    const p = document.getElementById('bgPass');
    return p ? p.value : '';
  });
  expect(val).toBe('');
});

test('an ordinary signed-in café never sees this screen — the no-alarm direction', async ({ page }) => {
  /* The mirror, and the more important half: a false alarm here locks a legitimate user out of a
     working app. Same shim, same boot; only the tenant answer differs. */
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page);
  await page.goto('/');
  await expect(page.locator('#bootGate')).toBeHidden();
  await expect(page.locator('#bgSignForm')).toBeHidden();
});

test('a re-sync does not wipe a half-typed password', async ({ page }) => {
  /* The `online` listener re-runs bootstrapSync on every network flap, and bootstrapSync opens with
     bootGate('loading'). Without the latch that swaps this screen for a spinner mid-typing — the
     same mechanism 185 needed for its explanation, with a worse consequence: the user's input. */
  await page.setViewportSize({ width: 380, height: 820 });
  await installBoot(page, { signedOut: true });
  await page.goto('/');

  await page.locator('#bgEmail').fill('max@example.com');
  await page.locator('#bgPass').fill('half-typed');
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(600);

  await expect(page.locator('#bgSignForm')).toBeVisible();
  await expect(page.locator('#bgEmail')).toHaveValue('max@example.com');
  await expect(page.locator('#bgPass')).toHaveValue('half-typed');
  await expect(page.locator('#bootGateMsg')).toContainText('Sign in');
});
