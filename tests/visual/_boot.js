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
 *   menu_items    SERVED FROM THE SPEC'S OWN localStorage SEED, translated to row shape.
 *   plates        v108 phase 5 deleted reconcileLocalOnly, so an empty server response no longer
 *   menus         "heals" into the seeded local rows — it correctly WIPES them. The seeds are the
 *                 user's data, and under online-only the user's data arrives from the server, so the
 *                 shim has to hand it back as rows. Read at QUERY time, not install time, because the
 *                 specs' own addInitScript seeds run after this one.
 *   app_settings  empty, no error — the setRows lookups find nothing and every local value stands.
 *   everything    returns an ERROR, which bootstrapSync's `soft` path treats as "not supported" and
 *   else          skips, leaving the seeded local history untouched. Returning empty-with-no-error
 *                 would instead REPLACE priceHistory with [] and wipe the very series the dashboard
 *                 specs seed.
 */
const fs = require('fs');
const path = require('path');

const PRODUCTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'base-products.json'), 'utf8'),
);

/* Served as empty-but-fine. Anything not handled explicitly is reported unsupported. */
const EMPTY_OK = ['app_settings'];

async function installBoot(page, opts = {}) {
  const rows = Object.values(PRODUCTS).map((p) => ({ ...p, is_custom: false }));
  await page.addInitScript(
    ([ingredientRows, emptyOk, noClient]) => {
      if (noClient) return;                       // opt out: exercise the real "can't reach the database" state
      const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
      /* The spec seeds the in-memory shape; the app now reads rows. This is the same crossing
         js/app.js's menuToRow does — spelled out here rather than imported, because the shim runs in
         the page before app.js has defined anything. */
      const dishRows = () => ls('cafeDB_menu', []).map((m) => ({
        id: m.id, section: m.section, name: m.name, price: m.price, notes: m.notes || null,
        is_custom: m.custom !== false,
        menu_id: m.menuId || 'MENU_ORIGINAL',
        plate_id: m.plateId || m.sourcePlateId || null,
        source_plate_id: m.sourcePlateId || m.plateId || null,
      }));
      /* History and settings stopped being read from localStorage in phase 5b, so the specs' seeds
         have to arrive as rows too. `{t,v}` in memory <-> recorded_at + a per-table value column,
         which is exactly the crossing js/app.js's rowToPoint/pointToRow describe. */
      const pts = (obj, valueCol, keyCol) => {
        const out = [];
        const push = (arr, key) => (arr || []).forEach((p) => {
          const row = { recorded_at: new Date(p.t).toISOString() };
          row[valueCol] = p.v;
          if (keyCol) row[keyCol] = key;
          out.push(row);
        });
        if (Array.isArray(obj)) push(obj, null);
        else Object.keys(obj || {}).forEach((k) => push(obj[k], k));
        return out;
      };
      const priceHistoryRows = () => pts(ls('cafeDB_priceHistory', []), 'avg_food_cost_pct', null)
        .map((r) => ({ ...r, menu_id: null }))
        .concat(pts(ls('cafeDB_menuHistory', {}), 'avg_food_cost_pct', 'menu_id'))
        .sort((a, b) => (a.recorded_at < b.recorded_at ? -1 : 1));
      const settingRows = () => {
        const out = [];
        const cogs = localStorage.getItem('cafeDB_cogsPct');
        if (cogs != null) out.push({ key: 'food_cost_target', value: Number(cogs) });
        return out;
      };
      const result = (table) => {
        if (table === 'ingredients') return { data: ingredientRows, error: null };
        if (table === 'menu_items') return { data: dishRows(), error: null };
        if (table === 'plates') return { data: ls('cafeDB_plates', []), error: null };
        if (table === 'menus') return { data: ls('cafeDB_menus', []), error: null };
        if (table === 'price_history') return { data: priceHistoryRows(), error: null };
        if (table === 'menu_price_history') return { data: pts(ls('cafeDB_menuPriceLog', {}), 'price', 'menu_item_id'), error: null };
        if (table === 'app_settings') return { data: settingRows(), error: null };
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
