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
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'python3 -m http.server 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
