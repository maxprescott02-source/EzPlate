// @ts-check
const { defineConfig } = require('@playwright/test');

// Config for `npm run shots` (tests/visual/screenshots.spec.js).
// Serves the static PWA and points page.goto('/') at it.
//
// We serve with python3's built-in http.server rather than the repo's
// `npm run serve` (npx serve) on purpose: it needs no network and no npm
// cache, so `npm run shots` works even when the npm cache is unwritable.
// python3 ships with macOS. For a human preview you can still use `npm run serve`.
module.exports = defineConfig({
  testDir: './tests/visual',
  /*
   * ⚠️ THE WORKER CAP LIVES HERE RATHER THAN ON CI'S COMMAND LINE, AND THAT REVERSES A DELIBERATE
   * CHOICE — see the flag block in .github/workflows/test.yml, which set --workers=2 there
   * specifically so `npm run shots` and a local `npx playwright test` kept the default.
   *
   * The default is one worker per two cores, so a six-core dev machine runs three real Chromium
   * instances. That is fine on its own and is not fine beside anything else: on 27 Aug 2026 a
   * local Playwright run shared an 8GB machine with the mutation gate and the box went out of
   * application memory. CI's two-core runner never had the headroom to expose this, so the place
   * the cap was missing was the only place it mattered.
   *
   * CI still passes --workers=2 explicitly. It is now redundant rather than load-bearing, and it
   * is kept because a value stated in the job is one a reader of the job can see.
   */
  workers: 2,
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'python3 -m http.server 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
