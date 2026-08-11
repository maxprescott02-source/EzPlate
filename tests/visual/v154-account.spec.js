/*
 * v154-account.spec.js — 174. The Account screen's sign-in form, measured.
 *
 * THIS FILE EXISTS BECAUSE OF ONE BUG THAT READING COULD NOT HAVE FOUND. `.acct-in` is
 * `flex:1 1 180px`, which is a WIDTH hint while the form is a row. The mobile breakpoint turns the
 * form into a column, and a flex basis applies to the MAIN axis — so at 380 the 180px silently
 * became a HEIGHT and the screen shipped three 180px-tall text fields. The rule looks correct in
 * the file at both breakpoints; only measurement shows it.
 *
 * So what is pinned here is the CONTROL BOX at both widths, not the presence of the markup. A test
 * asserting "#acctForm exists" would have passed against the broken build.
 *
 * ⚠️ SCOPE: signed-OUT only. `_boot.js` installs a fake `window.supabase` with no `auth`, so
 * `authInit` returns early and the screen renders its default state — which is also what every
 * user sees before signing in, so it is the state worth pinning here. The signed-in branch is
 * covered by tests/auth.test.js against the real functions, and was driven end to end against the
 * live staging project (recorded in the handover). Do not "fix" this by stubbing auth in _boot.js
 * without deciding what the other 260 specs should then see.
 */
const { test, expect } = require('@playwright/test');
const { installBoot, gotoTab } = require('./_boot');

async function boot(page, w, theme) {
  await page.setViewportSize({ width: w, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
    document.querySelectorAll('.install-banner').forEach((b) => b.remove());
  }, theme);
  await gotoTab(page, 'account');
  await page.waitForTimeout(300);
}

async function geo(page) {
  return page.evaluate(() => {
    /* MEASURE the containing block, never name it — CLAUDE.md's rule, after two assertions that
       inferred it passed on macOS and failed on the Linux runner. */
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:0;right:0;top:0;height:1px;visibility:hidden';
    document.body.appendChild(probe);
    const icb = probe.getBoundingClientRect().width;
    probe.remove();
    const form = document.getElementById('acctForm');
    const kids = [...form.children].map((e) => {
      const r = e.getBoundingClientRect();
      return { id: e.id, w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
    });
    return {
      icb,
      kids,
      rows: new Set(kids.map((k) => k.top)).size,
      pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      signedOutVisible: !document.getElementById('acctOut').hidden,
      signedInHidden: document.getElementById('acctIn2').hidden,
      errHidden: document.getElementById('acctErr').hidden,
    };
  });
}

for (const theme of ['dark', 'light']) {
  test(`380 ${theme}: one control per row, every one a real 44px target`, async ({ page }) => {
    await boot(page, 380, theme);
    const g = await geo(page);
    const raw = JSON.stringify(g);
    expect(g.kids.length, raw).toBe(3);
    // THE regression: a flex basis on the wrong axis made these 180 tall.
    for (const k of g.kids) {
      expect(k.h, `${k.id} height — ${raw}`).toBeGreaterThanOrEqual(44);
      expect(k.h, `${k.id} is absurdly tall, the flex basis is on the wrong axis — ${raw}`).toBeLessThan(60);
    }
    expect(g.rows, `each control gets its own row on a phone — ${raw}`).toBe(3);
    // full width, and none of them wider than the screen
    for (const k of g.kids) {
      expect(k.w, `${k.id} should fill the column — ${raw}`).toBeGreaterThan(g.icb * 0.7);
      expect(k.w, `${k.id} overflows — ${raw}`).toBeLessThanOrEqual(g.icb);
    }
    expect(g.pageOverflows, raw).toBe(false);
  });

  test(`1360 ${theme}: the whole form is one row`, async ({ page }) => {
    await boot(page, 1360, theme);
    const g = await geo(page);
    const raw = JSON.stringify(g);
    expect(g.rows, `desktop keeps email, password and button on one line — ${raw}`).toBe(1);
    for (const k of g.kids) expect(k.h, `${k.id} — ${raw}`).toBeGreaterThanOrEqual(44);
    expect(g.pageOverflows, raw).toBe(false);
  });
}

test('the default state is signed OUT, with the error hidden', async ({ page }) => {
  // Cheap, but it is the state every user meets first, and `hidden` on these two is exactly the
  // pattern CLAUDE.md warns can be defeated by an author `display` rule.
  await boot(page, 1360, 'dark');
  const g = await geo(page);
  expect(g.signedOutVisible).toBe(true);
  expect(g.signedInHidden).toBe(true);
  expect(g.errHidden).toBe(true);
});
