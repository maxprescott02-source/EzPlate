/*
 * _boot.js — v108 Playwright boot shim.
 *
 * WHY THIS EXISTS. Every spec used to do exactly this:
 *
 *     await page.route(/^(?!http:\/\/localhost:5173)/, r => r.abort());
 *     await page.goto('/');
 *
 * i.e. abort everything off-origin — which also aborts the supabase-js CDN script, leaving
 * `window.supabase` undefined and `SUPA` null. Under v107 that was harmless: the app rendered the
 * hardcoded BASE_PRODUCTS literal plus whatever the spec had seeded into localStorage.
 *
 * Under v108 it is not harmless and SHOULD NOT BE. There is no literal, Supabase is the source of
 * truth, and "no client" is a real failure the app now reports honestly through the boot gate — so
 * all 29 call sites started timing out behind a full-screen error overlay. The app is right; the
 * harness assumption is what expired.
 *
 * WHAT THIS DOES. Installs a fake `window.supabase` before app.js runs, so the REAL bootstrapSync
 * executes against deterministic fixtures and the gate resolves to 'ok'. The specs then test what
 * they were written to test — layout, geometry, computed styles — through the real boot path rather
 * than around it.
 *
 * The per-table behaviour is chosen to PRESERVE each spec's existing seeding, so no spec had to be
 * rewritten to keep meaning what it meant:
 *
 *   ingredients   the 393-row fixture (tests/fixtures/base-products.json) — the catalogue the specs
 *                 used to get from the literal.
 *   menu_items    empty, no error. reconcileLocalOnly HEALS rather than clobbers, so dishes seeded
 *   plates        into localStorage survive as local-only rows exactly as before.
 *   app_settings  empty, no error — the setRows lookups find nothing and every local value stands.
 *   everything    returns an ERROR, which bootstrapSync's `soft` path treats as "not supported" and
 *   else          skips, leaving the seeded local history/menus/supplier memory untouched. Returning
 *                 empty-with-no-error would instead REPLACE priceHistory with [] and wipe the very
 *                 series the dashboard specs seed.
 */
const fs = require('fs');
const path = require('path');

const PRODUCTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'base-products.json'), 'utf8'),
);

/* Tables that must load for the app to be usable. Anything not listed is reported unsupported. */
const EMPTY_OK = ['menu_items', 'plates', 'app_settings'];

async function installBoot(page, opts = {}) {
  const rows = Object.values(PRODUCTS).map((p) => ({ ...p, is_custom: false }));
  await page.addInitScript(
    ([ingredientRows, emptyOk, noClient]) => {
      if (noClient) return;                       // opt out: exercise the real "can't reach the database" state
      const result = (table) => {
        if (table === 'ingredients') return { data: ingredientRows, error: null };
        if (emptyOk.includes(table)) return { data: [], error: null };
        return { data: null, error: { message: 'fixture: table not served' } };
      };
      // A thenable query builder: .select().order() etc. all chain and finally resolve.
      const make = (table) => {
        const q = {
          select: () => q,
          order: () => q,
          limit: () => q,
          eq: () => q,
          then: (res) => Promise.resolve(result(table)).then(res),
          catch: () => q,
        };
        return q;
      };
      window.supabase = {
        createClient: () => ({
          from: (table) => ({
            select: () => make(table),
            upsert: () => Promise.resolve({ data: null, error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
      };
    },
    [rows, EMPTY_OK, !!opts.noClient],
  );
  await page.route(/^(?!http:\/\/localhost:5173)/, (r) => r.abort());
}

module.exports = { installBoot, PRODUCTS };
