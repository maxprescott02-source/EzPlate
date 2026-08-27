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
/* `opts.nonMember` makes the tenant lookup answer NULL — a signed-in account with no
   `business_members` row. It is served here rather than left to each spec because the state is
   otherwise UNREACHABLE in a browser: every table read succeeds with zero rows, so there is no
   error to inject and no seed that produces it. Measured on staging as `c@example.com` (185).
   It is a THIRD state, distinct from `noProducts` (a real café with an empty catalogue) and from
   `noClient` (cannot reach the database at all) — the app answers all three differently, and
   collapsing any two would hide the distinction the gate exists to draw. */
/* 186 — `opts.signedOut` is the state EVERY first open lands in once the anon fallback is gone
   from `current_business_id()`: no session, so the tenant lookup answers null and every table read
   comes back empty with no error. It is the fourth member of the family above and is distinct from
   `nonMember` in exactly one respect — whether anyone is signed in — which is the whole thing the
   two screens are chosen on.
   The fake `auth` this needs is served for ALL specs, not just these, and that is a deliberate
   reversal of 185's note ("auth is deliberately still ABSENT"). The reasoning has flipped rather
   than been forgotten: with a null-answering tenant lookup now a REAL state, an absent auth API
   means "could not tell whether anyone is signed in", so every spec would exercise the degraded
   reading instead of the real one — the same argument 185 used to start serving `rpc`.
   The session lives in localStorage rather than a page global so it SURVIVES THE RELOAD that
   authApply performs, which is what lets a spec drive sign-in end to end. `purgeLocalState` cannot
   touch it: it removes `cafeDB_`/`cafeCost_` keys only, by construction. */
async function installBoot(page, opts = {}) {
  const rows = opts.noProducts ? [] : Object.values(PRODUCTS).map((p) => ({ ...p, is_custom: false }));
  await page.addInitScript(
    ([ingredientRows, emptyOk, noClient, nonMemberOpt, rpcFailsAfter, signedOut, role, invited, claimLoops, createFails]) => {
      if (noClient) return;
      /* 192: `nonMember` and `claimed` are LET rather than const, because the claim RPC below
         changes them — a successful claim really does turn a non-member into a member, and the
         re-sync that follows has to see the café. Everything else here is fixed for the run. */
      let nonMember = nonMemberOpt;
      let claimed = false;                       // opt out: exercise the real "can't reach the database" state
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
        /* 192: backed by localStorage rather than a constant, so an insert and a delete are
           OBSERVABLE — a spec can invite somebody and see the row come back on the re-read, which
           is what makes the Team card drivable end to end rather than merely paintable. */
        if (table === 'business_invites') return { data: ls('__ezInvites', []), error: null };
        if (emptyOk.includes(table)) return { data: [], error: null };
        return { data: null, error: { message: 'fixture: table not served' } };
      };
      // A thenable query builder: .select().order() etc. all chain and finally resolve.
      // 192: `.is()` joins them, for the Team card's pending-invitations read.
      const make = (table) => {
        const q = {
          select: () => q,
          order: () => q,
          limit: () => q,
          eq: () => q,
          is: () => q,
          then: (res) => Promise.resolve(result(table)).then(res),
          catch: () => q,
        };
        return q;
      };
      const SESSION_KEY = '__ezFakeSession';
      const fakeSession = () => {
        if (nonMember) return { user: { id: 'u-nomember', email: 'c@example.com' } };
        try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
      };
      let onAuth = null;
      window.supabase = {
        createClient: () => ({
          /* 186. Enough of the auth surface for the REAL authInit, authApply and the gate's form to
             run: a session that survives a reload, a sign-in that fires the listener the app relies
             on to purge and reload, and a sign-out that clears it. `wrongpass` is the one password
             that fails, so a spec can drive the error path without a second fixture flag. */
          auth: {
            getSession: () => Promise.resolve({ data: { session: fakeSession() }, error: null }),
            onAuthStateChange: (cb) => { onAuth = cb; return { data: { subscription: { unsubscribe() {} } } }; },
            signInWithPassword: ({ email, password }) => {
              if (password === 'wrongpass') {
                return Promise.resolve({ data: null, error: { message: 'Invalid login credentials' } });
              }
              const session = { user: { id: 'u-max', email } };
              try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ }
              if (onAuth) setTimeout(() => onAuth('SIGNED_IN', session), 0);
              return Promise.resolve({ data: { session }, error: null });
            },
            /* 192: sign-up. It returns NO session, which is what Supabase does with e-mail
               confirmation on — so `onAuthStateChange` must NOT fire here, and the app is expected
               to show "check your email" rather than reload. A shim that signed the user in would
               make that assertion untestable and would hide the case entirely. */
            signUp: ({ email }) => Promise.resolve({ data: { user: { id: 'u-new', email }, session: null }, error: null }),
            signOut: () => {
              try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
              if (onAuth) setTimeout(() => onAuth('SIGNED_OUT', null), 0);
              return Promise.resolve({ error: null });
            },
          },
          /* 185: the tenant lookup. Answers the seeded café, which is what `anon` and a MEMBER both
             get — so every spec boots as a legitimate caller and the non-member gate stays shut.
             Served rather than omitted on purpose: app.js guards a missing `rpc` and falls open, so
             leaving it out would silently exercise the degraded path in all 29 specs and none of
             them would ever touch the real one. (186 serves `auth` for that same reason now — the
             note that used to sit here saying it was deliberately absent is above, with why it
             flipped.) */
          rpc: function (name, args) {
            /* 186: signed out answers null too, and only signing in changes it — which is what
               makes the sign-in round trip drivable rather than merely paintable. */
            const noTenant = nonMember || (signedOut && !fakeSession());
            /* 188 — THE SHIM DISPATCHES ON THE FUNCTION NAME, which it did not have to while there
               was only one RPC. Same argument the paragraph above makes for serving `rpc` at all:
               app.js reads an unrecognised answer as "could not tell", which for the ROLE resolves
               to owner — so a shim that handed the tenant uuid back for `current_business_role`
               would put all 30 specs on the degraded path and none of them would ever exercise a
               real role. `opts.role` is what lets a spec be staff; a caller with no tenant has no
               role either, which is what the server answers.
               ⚠️ IT RETURNS ABOVE THE COUNTER ON PURPOSE — see the counter's own note. */
            if (name === 'current_business_role') {
              return Promise.resolve({ data: noTenant ? null : (role || 'owner'), error: null });
            }
            /* 192 — the three invitation RPCs, all ABOVE the counter for the same reason the role
               is: `__rpcCalls` means "how many times was the TENANT asked" and nothing else. That
               note is one branch up and it is the whole of why 188 had to move the counter; adding
               three more callers to it would retire v161's re-sync assertion all over again.

               THE CLAIM is the one with real behaviour rather than a canned answer. `opts.invited`
               is an owner having invited this address BEFORE the app loaded, so the claim answers a
               café id ONCE and null afterwards — which is what the real function does (a second
               call finds the caller already a member) and is what makes the app's re-entrancy latch
               drivable rather than merely inspectable. Flipping `nonMember` off is the fixture
               standing in for the membership row the real claim writes: every read after it must
               answer as a member, or the re-sync would find the same empty café. */
            if (name === 'claim_business_invite') {
              /* ⚠️ `claimLoops` IS THE ONLY WAY THE RE-ENTRANCY LATCH CAN BE DRIVEN, and it exists
                 because the spec that claimed to test the latch SURVIVED the latch being deleted —
                 caught by hand-mutating a brand-new spec, which is CLAUDE.md 190's whole argument.
                 In the ordinary fixture a claim flips `nonMember` off, so the nested re-sync
                 succeeds and never reaches the claim branch again: the latch is never consulted and
                 removing it changes nothing.
                 This is the shape that DOES consult it — the claim keeps answering a café id while
                 the tenant keeps answering none, which is replication lag, a server bug, or a
                 membership revoked in the same instant. Without the latch bootstrapSync calls
                 itself forever; with it there is exactly one nested run and then the gate paints. */
              if (claimLoops) return Promise.resolve({ data: '00000000-0000-0000-0000-000000000001', error: null });
              if (!invited || claimed) return Promise.resolve({ data: null, error: null });
              claimed = true; nonMember = false;
              return Promise.resolve({ data: '00000000-0000-0000-0000-000000000001', error: null });
            }
            /* 209 — CREATE MY CAFÉ, and it is the claim's mirror image in every respect: ABOVE the
               counter for the reason all four of its siblings are, and with REAL behaviour rather
               than a canned answer because the whole point of this path is what happens next.
               Flipping `nonMember` off is the fixture standing in for the two rows the real
               function writes — `businesses` and the founding `business_members` — so the re-sync
               the handler performs finds a café instead of the same empty one, which is the only
               way the journey can be driven end to end.
               `opts.createFails` carries a MESSAGE rather than a boolean, because the refusals this
               function can return are written to be read by the person in front of the form
               ("confirm your email address first") and the app is supposed to show the server's own
               words. A boolean would only ever prove that SOME error appeared. */
            if (name === 'create_business') {
              /* ⚠️ ITS OWN COUNTER AND ITS OWN RECORD, NOT `__rpcCalls`. That counter means "how
                 many times was the TENANT asked" and nothing else — 188 had to move it below the
                 role branch after adding one unrelated call to the same Promise.all silently
                 retired v161's re-sync assertion, which CLAUDE.md calls the worst kind of defect
                 this repo has had. A spec asking "was the server asked to create a café, and with
                 WHAT" needs a number that means that, so it gets one.
                 `__createdWith` records the ARGUMENT because the client is supposed to normalise a
                 name before sending it, and the only way to prove what was sent is to keep it. */
              window.__createCalls = (window.__createCalls || 0) + 1;
              window.__createdWith = args || null;
              if (createFails) return Promise.resolve({ data: null, error: { message: createFails } });
              nonMember = false;
              return Promise.resolve({ data: '00000000-0000-0000-0000-000000000001', error: null });
            }
            /* ⚠️ 209 LEFT THIS BRANCH IN PLACE WITH NO CALLER IN THE APP. The sign-up form stopped
               calling `invite_pending` when self-service sign-up shipped, and the server function
               is deliberately not dropped in that batch (an old cached client still calls it — see
               the migration's header). Removing the branch would make the shim disagree with the
               database about what exists, which is the one thing a fixture must never do. */
            if (name === 'invite_pending') return Promise.resolve({ data: !!invited, error: null });
            if (name === 'business_team') {
              /* Owner-only on the server, and the shim says so rather than always answering: a spec
                 that boots as staff must see what staff see, which is zero rows. */
              if (noTenant || (role && role !== 'owner')) return Promise.resolve({ data: [], error: null });
              return Promise.resolve({ data: [{ user_id: 'u-max', email: 'max@example.com', role: 'owner' }], error: null });
            }
            /* `opts.rpcFailsAfter` lets the tenant lookup start FAILING after N calls while every
               table read keeps succeeding. That combination is the shape of a real defect (185's
               pre-push review): from an existing non-member gate, a re-sync whose lookup alone
               fails must not fall open, because RLS returns `[]` rather than an error and nothing
               downstream would throw. It is unreachable without this hook — one request out of
               twelve has to fail, and only that one.
               ⚠️ `__rpcCalls` COUNTS THE TENANT LOOKUP ONLY, and 188 had to move it below the role
               branch to keep that true. Counting both would be a quiet correctness bug in a
               HARNESS, which is the worst place for one: a boot now issues TWO rpc calls, so
               v161-nonmember.spec.js's `expect(rpcCalls).toBeGreaterThan(1)` — written to prove the
               re-sync actually ran, or "this test proves nothing" in its own words — would have
               been satisfied by the first boot alone and could no longer fail. Exactly the
               assertion-that-cannot-fail class CLAUDE.md counts eighteen of, introduced by adding
               an unrelated RPC. The counter means "how many times was the TENANT asked". */
            window.__rpcCalls = (window.__rpcCalls || 0) + 1;
            if (rpcFailsAfter && window.__rpcCalls > rpcFailsAfter) {
              return Promise.resolve({ data: null, error: { message: 'fixture: tenant lookup timed out' } });
            }
            return Promise.resolve(
              noTenant ? { data: null, error: null }
                       : { data: '00000000-0000-0000-0000-000000000001', error: null });
          },
          /* 192 — WRITES ARE THENABLE BUILDERS NOW, not bare promises. The Team card writes
             `.insert(...).select()` and `.delete().eq(id).select()`, and both READ what comes back:
             HTTP 200 with no rows is the measured silent no-op (191's rehearsal, as staff), so the
             app treats an empty body as a failure. A fixture that resolved `{data:null}` from
             `.insert()` would therefore make every invitation report as refused — the shim has to
             answer the way PostgREST does, with the row. `business_invites` is kept in
             localStorage so the effect survives to the next read. */
          from: (table) => {
            const invites = () => ls('__ezInvites', []);
            const saveInv = (v) => { try { localStorage.setItem('__ezInvites', JSON.stringify(v)); } catch (e) { /* ignore */ } };
            const done = (data) => { const t = { then: (r) => Promise.resolve({ data, error: null }).then(r), select: () => t, eq: () => t }; return t; };
            return {
              select: () => make(table),
              upsert: () => Promise.resolve({ data: null, error: null }),
              insert: (row) => {
                if (table !== 'business_invites') return done(null);
                const r = { id: 'inv-' + invites().length, email: row.email, role: row.role, created_at: new Date(0).toISOString(), accepted_at: null };
                saveInv(invites().concat([r]));
                return done([r]);
              },
              delete: () => {
                if (table !== 'business_invites') return { eq: () => done(null) };
                const t = {
                  eq: (col, val) => {
                    const gone = invites().filter((r) => r[col] === val);
                    saveInv(invites().filter((r) => r[col] !== val));
                    return done(gone);
                  },
                  select: () => t,
                };
                return t;
              },
            };
          },
        }),
      };
    },
    [rows, EMPTY_OK, !!opts.noClient, !!opts.nonMember, opts.rpcFailsAfter || 0, !!opts.signedOut,
      opts.role || 'owner', !!opts.invited, !!opts.claimLoops, opts.createFails || ''],
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
