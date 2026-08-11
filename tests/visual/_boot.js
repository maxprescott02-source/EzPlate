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

/* `opts.noProducts` serves the ingredients table EMPTY rather than the 393-row fixture. The Products
   screen's true-empty state is unreachable otherwise — PRODUCTS is module-scoped in app.js, so a spec
   cannot empty it from outside — and §4 makes that state part of every screen's definition of done.
   It is a successful EMPTY read, not an error: `noClient` already covers the cannot-reach case, and
   the two must not be confused (the app answers them differently, on purpose). */
async function installBoot(page, opts = {}) {
  const rows = opts.noProducts ? [] : Object.values(PRODUCTS).map((p) => ({ ...p, is_custom: false }));
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
        /* F6 (v143): `ing_price_history` was in `emptyOk`, so it always answered with nothing — and
           `ingPriceLog` is the ONLY feeder for the What-moved panel and the Dig-in "Biggest movers"
           row. No Playwright spec could therefore render either of them populated, which is why
           v98-grid.spec.js's empty-tile test reads "this seed writes no per-product price points"
           as if that were a choice. It was not; it was the only reachable state.
           Served from `cafeDB_ingPriceLog` in exactly the shape the other two series use, so a spec
           seeds it the same way it seeds the rest. Specs that do not seed the key get `{}` and the
           empty state, i.e. today's behaviour, unchanged. */
        if (table === 'ing_price_history') return { data: pts(ls('cafeDB_ingPriceLog', {}), 'cost_per_base_unit', 'product_id'), error: null };
        /* v145: `menu_change_log` was in `emptyOk` for the same reason `ing_price_history` was, and
           with the same consequence — it is the ONLY feeder for the trend chart's intervention
           markers and for the dashboard's since-line, so neither could be driven in a browser at
           all. The marker label was changed in this batch and could be verified only in a unit test
           until this existed.
           Served from `cafeDB_changeLog` in the ROW shape `rowToChange` expects (it needs `id` and
           a parseable `recorded_at`, and drops the entry otherwise), so a spec seeds plain
           `{t, kind, avgBefore, avgAfter}` objects and this maps them. Specs that do not seed the
           key get `[]` and today's behaviour, unchanged. */
        if (table === 'menu_change_log') {
          const src = ls('cafeDB_changeLog', []);
          return { data: (Array.isArray(src) ? src : []).map((e, i) => ({
            id: e.id || ('CL' + i),
            recorded_at: new Date(e.t).toISOString(),
            kind: e.kind || 'plate_edited',
            plate_id: e.plateId || null, dish_id: e.dishId || null,
            menu_ids: e.menuIds || [],
            avg_before: e.avgBefore == null ? null : e.avgBefore,
            avg_after: e.avgAfter == null ? null : e.avgAfter,
            cost_before: e.costBefore == null ? null : e.costBefore,
            cost_after: e.costAfter == null ? null : e.costAfter,
            detail: e.detail || {},
          })), error: null };
        }
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


/* 171 — gotoTab(page, key): navigate to a screen THE WAY A USER AT THIS WIDTH WOULD.
 *
 * WHY THIS EXISTS. Four of the app's screens — Products (`ingredients`), Invoices, Settings and
 * Account — moved into a group that renders TWO WAYS: the sidebar's bottom group at >=1024, and the
 * phone's More screen below it. `.navbtn[data-tab="ingredients"]` still resolves at 380, because the
 * button is in the DOM, but it is `display:none` there — so every spec that clicked it at a mobile
 * width started timing out on an invisible element. Six specs, one cause.
 *
 * The fix is deliberately NOT `window.showTab(key)`. That would go green while the screen was
 * unreachable by any real gesture, which is precisely the failure this batch could introduce and
 * the reason the specs were driving the nav in the first place. This drives the real route at the
 * real width — one click on desktop, two on a phone (More, then the row), exactly as §6 designs.
 *
 * Width is read from the viewport rather than passed in, so a caller cannot get it wrong and a
 * spec that loops over widths needs no branch of its own.
 */
const MORE_SUBS = ['ingredients', 'invoices', 'settings', 'account'];
async function gotoTab(page, key) {
  const width = page.viewportSize().width;
  if (width < 1024 && MORE_SUBS.indexOf(key) >= 0) {
    await page.locator('.navbtn[data-tab="more"]').click();
    await page.waitForTimeout(150);
    await page.locator(`#tab-more [data-more="${key}"]`).click();
  } else {
    await page.locator(`.navbtn[data-tab="${key}"]`).click();
  }
  await page.waitForTimeout(150);
}

module.exports = { installBoot, PRODUCTS, gotoTab };
