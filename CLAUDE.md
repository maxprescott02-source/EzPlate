# CLAUDE.md — EzPlate (Scoopys-Costing)

You are working on **EzPlate**, a plate/menu-costing PWA for a real café
("Scoopy's Family Cafe"). The owner is **Max** — hospitality background, new to
coding and to git. Price data drives real menu decisions, so a broken deploy
costs money. Work accordingly.

**Who actually uses it, corrected 1 Aug 2026 (Max).** ONE intermittent user, not
staff on real phones mid-service. **Gaps of a week between uses are normal.**
This file said the opposite for months and it produced at least one wrong
recommendation, because the two readings pull opposite ways: "daily, mid-service,
on the pass" argues for tolerating anything rather than blocking, and for
optimising the seconds. One occasional user on mobile data can wait for a fetch,
and would rather be told a thing did not save than discover it next week. **When
a design call turns on how often the app is opened, this is the answer.** What
does NOT change: the data is real, and losing it costs Max real money.
**It is no longer irreplaceable, and "there is no restore" — which this line said
until v111 — is no longer true.** v110 shipped one, and it has recovered a real
deletion against production byte-for-byte (see the snapshot). That does not make
data loss cheap: a restore needs a recent export, and the newest one is named in
the snapshot with its size and timestamp precisely because a backup referred to
only by a path is a claim rather than evidence. Check it before relying on it.

## What the app does

1. **Products** — supplier goods with prices, pack sizes, base units (412 rows
   as of 4 Aug 2026). They come from the Supabase `ingredients` table and nowhere
   else: **there is no `BASE_PRODUCTS` literal** (v108 deleted it; this line said
   otherwise until v111). Custom ids are still `CX*`.
2. **Ingredients** ("kitchen words") — friendly names (e.g. "Chips") that each
   link to ONE product (`{id, name, pid}`). Recipes cost from these, so swapping
   the linked product once updates every recipe.
3. **Plates** — the plate library (the tab `data-tab="builder"` is now labelled
   **"Plates"**, v54). Assemble a plate from ingredient lines `{kid, qty}` (+ misc
   cost lines) in the builder **popup** (`#builderModal`); **Save** it to the
   library (published or not); **Publish/Move** to a menu from its card. A plate is
   independent — it exists menu or no menu.
4. **Menu analysis** — plate cost vs suggested price at the target food-cost %,
   traffic-light margin health (green/amber/red). Menus are rows in `menu_items`;
   a menu can be deleted (see Hard rules) — dishes on it are always reassigned,
   never deleted.
5. **Invoice import** — parse a supplier PDF/text invoice, match lines to
   products, review, confirm → prices update. The most complex and most
   fragile subsystem. Treat with maximum care.
6. **Dashboard** — food-cost trend chart + highlight cards.
7. **Settings** — header gear: target food cost %, GST default, JSON backup
   export, clear cache, About/contact, and **"Tidy lists"** (shipped v59) —
   rename/merge/clear the Category/Brand/Supplier values across products (the
   Category picker also spans plate categories), each behind one blast-radius
   confirm, applied through the existing write helpers on the v40 pure core
   (`tidyFieldValues`/`tidyPlan`/`tidyValuesCombined`/`tidyPlanAll`/
   `tidySupplierMemMigration`). Ingredient categories are derived from the linked
   product, so a category rename here flows to the Ingredients tab automatically.

Data: **Supabase is the source of truth; the app is online-only** (v108).
**localStorage holds view preferences and derived caches ONLY** — never data.
This line said "localStorage (offline-first) + Supabase sync" until v111, which
was the pre-v108 architecture and the exact opposite of the rule below it; see
the snapshot for the full list of the twelve keys that remain. No analytics, no
tracking, no build step — hard product constraints. Third-party code is limited
to **two pinned, integrity-checked CDN scripts** (supabase-js, pdf.js); adding a
third needs Max's yes — see hard rule 4.

## The four object nouns — UI copy may not invent a fifth

The app has exactly FOUR objects. These are the only nouns that may name a thing
in user-facing copy:

- **Product** — something you buy from a supplier (price, unit, pack, brand,
  category, supplier).
- **Ingredient** — the name you cook with; links to exactly ONE product.
- **Plate** — a costed dish built from ingredients. **"Dish" is not a separate
  noun** (Max, 25 Jul 2026): a plate on a menu is still a plate.
- **Menu** — a set of plates with sell prices.

**Forbidden as object nouns:** "recipe" (names nothing in this app), "kitchen
word" / "kitchen name" (internal vocabulary — the object is an **Ingredient**),
and "dish". Describing without naming is fine — "the name you'll use when
building plates" is good copy; "your kitchen name" is not.

This has leaked three times (v83 removed one batch, v86 the rest), so
`tests/terminology.test.js` pins it — including two **inversion guards**, because
a terminology pass is exactly when someone is tempted to rename
`kitchenIngredients` to match the label. Don't (see the next section).
**"Menu item" is still in use** in the Edit-menu-item modal — a known fifth noun
awaiting its own brief.

## ⚠️ The naming inversion — never "fix" it

UI labels and internal identifiers are deliberately CROSSED:
- Nav tab `data-tab="pantry"` is **labelled "Ingredients"** (kitchen words).
- Nav tab `data-tab="ingredients"` is **labelled "Products"** (supplier goods).
- Internally: `kitchenIngredients` / `king*` / `kById` / the Supabase
  `ingredients` table = kitchen words (UI "Ingredients"); `PRODUCTS` / `byId` /
  `ing*` render code = supplier products (UI "Products").

Only ever change text a human reads. **Never rename an identifier, class, id,
`data-tab` value, localStorage key, or Supabase table.** Renaming to "make it
consistent" has caused rollbacks.

## The codebase (no build step — four hand-written files)

- `js/app.js` (**6,576 lines / 474 KB**, measured 4 Aug 2026) — ALL logic, one
  browser script. Cannot be `require()`d; tests extract functions from it by
  source slicing. (This said "~3000+ lines" for many batches and was roughly half
  the truth — check it rather than quoting it.)
- `css/style.css` (**2,804 lines**) — entire visual layer, organised in numbered
  sections with `/* ===== batch (vNN) ===== */` history headers.
- `index.html` (**819 lines**) — splash, header, five tab containers in
  `#appMain`, bottom nav, all modals.
- `sw.js` — service worker (offline cache).

**Client-side there is still no build step.** Since v62 the repo also has a small amount
of **server-side code under `api/`** (Vercel zero-config Node serverless functions): the
invoice AI second-reader (`api/parse-invoice.js` + pure `api/_gemini.js`) and, since v63, the
Dashboard insight phrasing (`api/insight.js` + pure `api/_insight.js`). This is NOT a build
step and does not touch the four files above: Vercel simply serves anything under `/api`.
Conventions there: files whose name starts with `_` (e.g. `api/_gemini.js`, `api/_insight.js`)
are **ignored as routes** and hold pure, `require()`-able, unit-tested logic; the route handlers
stay thin. **API keys live ONLY in Vercel env vars** (`GEMINI_API_KEY`) — never in the client,
the repo, or logs. Treat invoice text and any model output as untrusted data (fence it, validate
strictly) — never executed, never an instruction. **Money/number law (v63):** any AI helper may
only PHRASE numbers the app already computed deterministically — it never produces a figure;
server + client both reject a phrasing that contains a number not in the supplied facts.

## ⚠️ Privacy gate — before EzPlate serves anyone but Scoopy's
The invoice AI second-reader (v62) sends invoice text to Google's Gemini free tier, which
**may use prompts for training**; the v63 Dashboard insight phrasing (`api/insight.js`) sends
plate names + costing numbers to the same tier. Max has accepted this **for his own café only**
(his call, made). **BEFORE multi-tenant customers' data flows through `api/parse-invoice`,
`api/insight`, or any future endpoint that ships user data to a third-party model, revisit:**
move to a paid-tier
Google project that excludes training use, or add a privacy-policy disclosure. This is the
single most important thing to reopen before EzPlate is used by anyone else.

## 🔒 Hard rules (tests depend on these; violations have caused real damage)

1. **Protected parser region**: the contiguous block in `js/app.js` between the
   exact strings `var INV_EXCLUDE=` and `function unitLabelFor(` is sliced by
   `tests/_extract.js` using those anchors. **Never edit anything inside it.**
   If a fix seems to require it, stop and tell Max — solve outside the region
   (e.g. the taught-pack path exists precisely so the parser needn't learn
   every notation like "105'S").
2. **Never touch** `resolveMatchedPrice`, `unitCatCategory`,
   `applySupplierMemory`, `packToUnitCost`. Reading them is fine.
3. **RETIRED in v111 — the hazard is gone, the number is kept so every existing
   cross-reference to rules 4–10 still points where it says.** This rule used to
   warn that `aRow` and `renderAnalysis` were each defined TWICE, the first dead
   and the second live, so editing the first was a silent no-op that shipped real
   bugs. Both dead first definitions are now deleted. The property that made them
   dead is worth keeping in mind: these were top-level declarations in one scope,
   so **hoisting makes the LAST definition win everywhere**, before any statement
   runs — a duplicate is never "dead until reached". `tests/housekeeping.test.js`
   now fails if any name in `js/app.js` is defined twice again.
4. **No NEW runtime dependencies, no analytics, no build step, no scope creep.**
   If you spot extra work worth doing, list it for Max — don't build it.
   **This rule used to say "no external libraries", which was simply false** —
   two third-party scripts ship in production and always have (corrected v88):
   - `index.html` — `@supabase/supabase-js`, the sync client;
   - `js/app.js` `ensurePdfjs()` — `pdfjs-dist`, loaded on demand to read PDF
     invoices (plus its worker).
   Both run with full DOM access on a page holding the Supabase anon key and the
   café's pricing, so both must stay **pinned to an exact version** (never a
   floating `@2`) and **integrity-checked wherever the load mechanism allows**
   — the pdf.js *worker* is the one exception, pinned only, because
   `new Worker()` has no SRI. Changing either version means recomputing its
   `sha384` hash in the same commit; a stale hash blocks the script outright.
   Adding a third such script needs Max's yes, not a judgement call.
5. **Strict scope**: implement what was agreed, nothing more. When in doubt,
   ask before writing code (plan first, then implement).
6. **The menu data model is THREE layers — don't conflate them** (corrected
   v42; earlier drafts of this file wrongly said "no menus table / a menu and a
   menu item are the same row"):
   - **Menus** — `menusList` (`{id,name,season}`, e.g. `MENU_ORIGINAL`). This is
     what the selector, `canDeleteMenu`, `fallbackMenuId`, and `currentMenuId`
     act on. Backed by the Supabase `menus` table
     (`dbUpsertMenuRecord`/`dbDeleteMenuRecord`), which may not exist on older
     projects — the bootstrap read is wrapped in a try/catch. **The localStorage
     `cafeDB_menus` key is GONE** (v108 removed every write to it, and this line
     said otherwise until v111); see rule 7 for what replaced it as the
     fresh-install signal.
   - **Dishes / menu items** — `MENU`/`customMenu` (the `menu_items` table). Each
     dish's `.menuId` points at a `menusList` entry. `menuById` keys dishes.
   - **Plates** — the cost builds (`plates` table), the library's own objects. A
     dish links to its plate via **`menu_items.plate_id` → `plates.id`** (v55; FK
     `menu_items_plate_id_fkey`); ONE plate can back MANY dishes — one per menu it's
     published to (**many-to-many**). Resolve ONLY through `plateIdOf` /
     `plateForMenuItem` / `dishesOfPlate` / `menusOfPlate` — never poke the raw
     fields. `plates.menu_id` and `menu_items.source_plate_id` are **LEGACY**
     (`source_plate_id` still read as a fallback + mirrored on write during rollout;
     `plates.menu_id` unread/unwritten). Because the DISH now references the plate,
     a dish write must not race ahead of its plate's insert — sequence with
     `dbPushMenuAfterPlate`. **The APPLICATION-level direction flipped in v55 —
     the DATABASE constraint did not, and this line said otherwise until v110.**
     `dbPushPlateAfterMenu` is genuinely gone, but the FK
     `plates_menu_id_fkey` (`plates.menu_id → menu_items.id`, `ON DELETE SET
     NULL`) is **still live**, though **0 of 78 plates now carry a non-null
     `menu_id`** (checked through the MCP as `postgres`, 4 Aug 2026 — it was 20 on
     3 Aug). v110's own restore nulled them: `plateToRow` omits the column and the
     restore reinserts every plate. **Nothing resolves through those values, and
     as of v112 nothing reads `plate.menuId` AT ALL** — `plateIdOf`'s `sp.menuId`
     branch is DELETED, not merely dormant. Its only writer anywhere was the
     unreachable `savePlateRestore`, and `rowToPlate` never reads `menu_id`, so a
     server-loaded plate never carried `.menuId` in the first place.
     **⚠️ "so no link was lost" — which this line claimed until v112 — WAS WRONG,
     and the lost link has since been REPAIRED.** The one dish with no plate link
     (`ummrq8xbur`, "Cheese & Ham Toastie GF") had an unreferenced plate
     `SPmrq8xbut` with the SAME NAME, THREE real ingredient lines, and an id 2 ms
     apart. It read as uncosted on the menu while its recipe sat in the library.
     v111 checked only whether a plate pointed BACK via `menu_id` and drew the
     wrong conclusion from it — **the absence of a back-pointer is not evidence
     that nothing was lost; look for an orphan on the OTHER side too.** Repaired
     5 Aug 2026 on Max's explicit yes (`plate_id`/`source_plate_id` set to
     `SPmrq8xbut`, keeping its Sandwiches section and $8 price). **There are now 0
     orphan dishes.** **The CONSTRAINT is what still matters, not the data.** So
     the two tables are
     **CIRCULAR**: `menu_items.plate_id → plates.id` has no delete action and
     errors if plates go first, while `plates.menu_id` cannot be inserted before
     the dishes exist. **Any delete-and-reinsert of both tables must delete
     dishes first and insert plates with `menu_id` omitted** — which is what
     `plateToRow` already does, so v110's restore is correct by existing design
     rather than by luck. If `plateToRow` ever starts writing that column,
     restore breaks (pinned by `tests/restore.test.js`). See Data-write rules.

     **THERE ARE THREE FKs, NOT TWO — this rule listed only two until v112, and
     ONLY ONE OF THE THREE CAN EVER ERROR:**
     - `menu_items.plate_id → plates.id` — **NO ACTION**. Deleting a plate while
       a dish references it raises **23503**. This is the app's only FK hazard,
       and what `dbDeletePlateAfterDishes` sequences against.
     - `plates.menu_id → menu_items.id` — ON DELETE SET NULL.
     - `menu_items.menu_id → menus.id` — ON DELETE SET NULL. **Undocumented here
       until v112**, and its absence made a real comment wrong: `doDeleteMenu`
       claims its dishes-before-menu ordering guards an FK violation. With SET
       NULL that ordering was never load-bearing. Don't rely on it as precedent.

     The ingredient and supplier-phrase delete paths cross NO foreign key at all.
7. **Menu deletion deletes its dishes and UNLINKS their plates — never the
   plates.** (v54, reverses v40/v42.) Deleting a menu removes its `menu_items`
   rows and sets each affected plate's `menu_id` to null; every plate survives in
   the Plates library, unpublished. There is **no holding area** (`MENU_UNASSIGNED`
   and its machinery — `ensureUnassignedMenu`/`holdingHasDishes`/`realMenus` — were
   removed) and **no last-menu guard**: any menu is deletable, including the last,
   and **zero menus is a legitimate state**. `fallbackMenuId()` never returns a
   deleted id and returns `null` when no menu exists. **`ensureDefaultMenu` seeds
   "Original" only when the caller has established there is no server answer to
   respect — i.e. the `menus` table did not answer at all.** It used to key off
   "the `cafeDB_menus` key was never written", and v108 deleted that test as a
   BUG: phase 5b removed every write to the key, so it read false forever and
   re-seeded "Original menu" on EVERY boot once the user deleted their last menu,
   silently resurrecting it. A successful EMPTY read is the user having deleted
   everything and must be respected. (This line described the deleted mechanism
   until v111.) Publishing when no menu exists prompts to create one first.
8. **The backup export is IN-MEMORY shape, not schema shape — a restore written
   against the tables silently drops every link** (recorded v106, from the backup
   audit). `buildBackup` dumps the live JS objects verbatim, so `menu_items` rows
   come out **camelCase**: `menuId`, `plateId`, `sourcePlateId`, `custom`. The
   Supabase columns are `menu_id`, `plate_id`, `source_plate_id`, `is_custom`
   (`rowToMenu`/`dbPushMenu` do the translation on every normal read/write; the
   export bypasses both). A restore script written from the schema therefore
   inserts every dish with a null plate link — **every row present, nothing
   connected**, no error raised. On Max's 1 Aug export that is 76 of 77 dishes.
   Any importer must translate through `dbPushMenu`'s mapping, never assume the
   file matches the table. This is exactly the class this file exists for: code
   that looks correct and is not.
   **v110 built that importer and obeys this rule structurally, not by care.**
   `backupToPayload` maps every group through the existing `xToRow` writers and
   names no column of its own; the SQL function is handed rows that are already
   row-shaped and uses `jsonb_populate_recordset`, so it names TABLES but not
   columns. Two groups have **no row mapper and that is not an oversight** —
   `kitchen_ingredients` and everything under `settings` are `app_settings` JSON
   blobs written by `dbSetSetting`, so their boundary is the SETTING KEY. Two
   tests pin the trap directly: a restored dish must RESOLVE to its plate and its
   menu (row counts pass happily with every link null), and no camelCase key may
   reach any row.
9. **The export's `products` group mirrors whatever the app holds in memory — so
   what the FILE means is decided by the DATA LAYER, not by `buildBackup`. It has
   changed twice. A restore MUST read `stamp.format` and branch, never assume.**
   (v106 · rewritten twice, 1 and 2 Aug 2026 — see the law at the end for why
   this rule keeps moving.)
   The chain is `bootstrapSync` → `productsById` → `buildBackup`, which dumps
   that object verbatim. Nobody has ever edited the exporter to change the file's
   meaning; changing what fills the object was enough, both times.

   **THREE shapes exist in the wild. `stamp.format` is the only safe way to
   tell them apart:**
   - **no stamp** — pre-v106. A DELTA against `BASE_PRODUCTS`, with no record of
     which build. Not safely restorable; treat as reference material only.
   - **`format: 1`** — v106–v107. Also a delta *if* taken before the 1 Aug
     backfill (Max's 31 Jul file is 118 of 412 products; the other 295 came from
     the literal in whatever build restored it, which is what
     `base_products_count` + `base_products_hash` existed to guard). A format-1
     file taken AFTER the backfill is already a full snapshot — his 2 Aug export,
     412 products, is the last and best one.
   - **`format: 2`** — v108 on. A COMPLETE snapshot. There is no literal, so
     there is nothing for a restore to agree about, and the two `base_products_*`
     fields are **absent**. That absence is deliberate: with nothing left to hash
     they could only be null, and a naive comparison reads `null == null` as a
     MATCH — turning the guard into a rubber stamp, the exact failure it existed
     to prevent. `app_version` stays, because a restore will need it when the
     schema drifts.

   **For a format-1 file the test is per-id, not a count:** if every
   `BASE_PRODUCTS` id of the restoring build appears in `products`, the literal
   is unused; if ANY is absent, the file leans on the literal for that id and the
   stamp must match or the restore must refuse. (`BASE_PRODUCTS` no longer exists
   in the app, so this check needs the literal recovered from git — commit
   `aa16387` is the last one that has it.)

   **AS SHIPPED IN v110, THE RESTORE REFUSES FORMAT 1 OUTRIGHT** (`parseBackupFile`),
   and the reason is worth stating exactly, because "format 1 is incomplete" is
   the wrong summary: some format-1 files ARE complete. It refuses because the
   app can no longer RUN the per-id test above — v108 deleted the literal it
   needs. Refusing a restorable file costs one manual recovery; accepting an
   unrestorable one costs 295 silently wrong prices. **Accepts:** `format: 2`
   with all seven groups present and of the right type. **Refuses, each naming
   why:** unparseable JSON · no `stamp` · `format: 1` (naming `aa16387`) · any
   other `format` · a missing or wrong-typed group. A missing group is treated as
   a DAMAGED FILE, never as an empty dataset — the distinction matters because
   the server would otherwise replace a 412-product catalogue with nothing.

   **The general law, which is why this rule is here and why it keeps needing
   rewriting:** a backup that dumps live in-memory objects inherits every
   assumption those objects carry. Change what fills them and you have changed
   the file format without touching the exporter — silently, with the tests still
   green. Any change to what `bootstrapSync` puts in memory is a change to the
   backup format, and must bump `stamp.format`.
10. **A migration verified through the MCP or the SQL editor has NOT been
    verified for the client. They are different roles.** (v110, 3 Aug 2026 —
    found the hard way, on production.)

    `postgres` (what the MCP and the SQL editor connect as) and `authenticator`
    (what PostgREST connects as, for `anon` and `authenticated`) differ in ways
    that change whether SQL *runs at all*:
    - **Preloaded libraries.** `authenticator` carries
      `session_preload_libraries = supautils, safeupdate`; `postgres` carries
      only `supautils`. **`safeupdate` rejects any `DELETE` or `UPDATE` with no
      `WHERE` clause** — so a bare `delete from t;` works perfectly in the SQL
      editor and through the MCP, and fails on the real client path with
      "DELETE requires a WHERE clause". Measured from the anon path, not
      inferred: bare is blocked, while `where true`, `where id is not null` and a
      self-subquery all pass, so safeupdate reads the PARSE TREE rather than the
      plan.
    - **`statement_timeout`.** `anon` 3 s, `authenticated` 8 s, `postgres`
      unlimited. A function that is comfortable through the MCP can time out for
      a user.
    - **RLS.** The MCP bypasses it. `ing_price_history` and
      `menu_price_history` carry SELECT+INSERT policies only, so the anon key
      cannot DELETE from them at ALL — invisible to every SQL test.

    v110's `restore_backup` was hashed, guard-tested and atomicity-proven
    through the MCP, and still failed on the first real browser call. **Exercise
    any new RPC from the app itself, or from the browser console with a payload
    its own guards refuse** (`rpc('restore_backup', {payload:{format:1}})` is the
    pattern — it is rejected before any write). Cheap, and it is the only thing
    that tests the role your users actually are.

## Cache-version discipline (six spots — easy to get wrong)

Every change that ships JS/CSS/HTML bumps the version by one in ALL of:
1. `sw.js` — `const CACHE = 'ezplate-vNN'`
2. `sw.js` — `?v=NN` on style.css in ASSETS
3. `sw.js` — `?v=NN` on app.js in ASSETS
4. `index.html` — `css/style.css?v=NN`
5. `index.html` — `js/app.js?v=NN`
6. `js/app.js` — `var APP_VERSION='vNN'` (shown in Settings → About;
   `tests/settings.test.js` FAILS if it disagrees with sw.js — deliberate).

Miss one and Max's phone serves stale code and everyone loses an hour.
`tests/smoke.js` derives its expected version from `sw.js` (fixed v40 — it used
to hardcode a version string and silently go stale).

## Testing & verification (every session, every change)

- `npm test` (== `node --test tests/*.test.js`). Must be green **before you
  start** (verify the baseline — the container/repo has drifted from claimed
  state before; if the count or anchors don't match what's documented, STOP
  and tell Max what you actually found) and **after every item**.
- After any JS edit: `node -c js/app.js`.
- Tests extract real shipped code via source slicing/brace extraction — there
  are no duplicate copies to drift. If you rename an anchored function, tests
  fail loudly naming the anchor. If you deliberately change a pinned contract,
  update the test in the same commit and say so in the PR/handover.
- `tests/smoke.js` — jsdom DOM smoke (not in the default suite):
  `npm install jsdom --no-save && node tests/smoke.js`. Run it for anything
  touching rendering, wiring, or Settings.
- **Anything server-side must ALSO be exercised as the client's role — see hard
  rule 10.** `npm test`, the smoke and Playwright all stop at the network
  boundary, and the MCP sits on the far side of it as a different, more
  privileged role. A green suite plus a green MCP check is NOT coverage of a
  migration or an RPC. To run the real client against the real database: serve
  the working tree (`python3 -m http.server 8899`) and open it — the local build
  talks to production Supabase, so it exercises the true path while letting you
  test code that is not deployed yet. That is how v110's `safeupdate` failure
  was found.
- **A browser IS available here** (corrected v88; this line used to say "there
  is no browser here" and that was believed for dozens of batches). Playwright
  drives the installed Chromium against the app from `file://` —
  `npx playwright test` resolves 45 tests across the three specs in
  `tests/visual/`. **Use it.** Layout, overflow, z-index, computed styles and
  measured geometry at any viewport are all things you can reproduce and verify
  rather than defer — v86 root-caused a real 380px layout bug this way.
- **A narrow viewport is still not a device.** Anything about *feel* (touch
  targets, spacing, animation, keyboard, PTR, iOS Safari specifically) goes on
  a "needs Max's phone" list in your handover — never claim it verified. The
  browser tells you whether the pixels are right; only the phone tells you
  whether it feels right.

## Fragile areas — extra care + regression tests mandatory

These have regressed repeatedly. Any change near them requires reading the
relevant tests first, a truth-table diagnosis before patching, and a regression
test locking the fix:
- **Invoice review rendering** (`renderInvReview`, `invSelChanged`,
  `invRowState`, `flagNeedsAttention`, the pack-teach flow). History: state
  was patched per-cell → stale cells (fixed v33: full-row re-render only);
  `.muted-row` CSS hid Old/Conf on needs-attention rows (fixed v35: hiding is
  scoped to `.is-new`); tint now derives from `invRowState` via `st-*` classes
  (v37) so the card and the summary can never disagree. Preserve all three
  invariants.
- **Taught packs / price precedence**: product pack > supplier memory > parser
  > manual. A pack taught in the mismatch flow must persist on the product and
  outrank the parser on every later import (v38 work).
- **Mobile visual consistency**: one card system (Products-style), compact
  header pills not full-width bars, one primary CTA per screen (Builder
  Publish, invoice Confirm All). A previous density pass (v31) was rolled back
  wholesale — visual changes are surgical, one screen at a time, listed for
  Max's phone.
- **Cross-referencing writes are a SEQUENCE, not two independent writes** (v40;
  **direction flipped v55**). When one row references another, the referenced row
  must land on the server first and the dependent write must abort (surfacing the
  REAL error) if it didn't. In v55 the FK is `menu_items.plate_id → plates.id`, so
  **publishing sequences the DISH write after the PLATE** via `dbPushMenuAfterPlate`
  (the plate is normally already saved; it's re-pushed idempotently then the dish
  chains after). This reverses v40's `plates.menu_id → menu_items.id` ordering
  (plate-after-menu, `dbPushPlateAfterMenu`), which — with that FK — is gone.
  Treat any new "write X that references Y" flow with the same suspicion: push Y,
  confirm it, then X.
  **DELETES ARE THE MIRROR IMAGE, and this rule covered only writes until v112.**
  On the way IN the referenced row lands first (plate, then dish); on the way OUT
  the REFERENCING rows go first (dishes, then plate) — `dbDeletePlateAfterDishes`
  is `dbPushMenuAfterPlate` read backwards. Two traps this cost real time to find:
  - **Dispatching in the right order is not sequencing.** `deletePlate` and
    `doDeleteEverything` already fired the dish deletes before the plate delete;
    they just never awaited them, so the COMMIT order was arbitrary and the plate
    delete could be rejected with 23503. It presented as "sometimes broken".
    **A test that records call ORDER therefore passes against the broken code** —
    assert instead that the dependent write has not been ISSUED yet while the
    others are still pending (`tests/delete-sequencing.test.js`).
  - **A helper that swallows its promise cannot be sequenced by anyone.**
    `dbDeleteMenu`/`dbDeletePlate` dropped their `pushWrite` return, so no caller
    could chain them however much it wanted to. If a new `dbDelete*` helper is
    added, RETURN the write.
  Rolling back on failure is part of the sequence, not a nicety: the optimistic
  repaint stays, but the WORDING waits for the server, and anything the server
  kept is put back so the screen can never show a delete that did not happen.

## Data-write rules

- Every Supabase write goes through the `pushWrite`-wrapped helpers
  (`dbPushPlate`, `dbPushMenu`, `dbPushIngredient`, `dbSetSetting`,
  `saveKitchenIngredients`, …) — they set sync state and surface the REAL
  error to a toast. Never call the client raw.
- **`pushWrite` returns its settled promise** (v40) — resolves to the result,
  `{error}`, or `null` when offline/no client. Existing callers that ignore the
  return are unaffected. **Use this whenever write B depends on write A having
  actually landed** (see `dbPushPlateAfterMenu` as the pattern) — don't
  fire-and-forget two writes that reference each other.
- **Known gap (flagged v40, not fixed):** `pushWrite` still drops writes
  silently when fully offline — no queue, no retry. Don't assume a write
  happened just because the call was made; this is a real limitation, not
  paranoia.
- Settings persist via `dbSetSetting` + a localStorage mirror, loaded
  idempotently in `bootstrapSync`.
- `nextKid()` scans the live `kitchenIngredients` array — push immediately,
  never batch ids.
- Plates persist `{kid, qty}` only; kitchen-word renames are display-only.
- **Rounding rule (Max, 15 Jul): currency DISPLAYS round to the cent
  (`toFixed(2)`); stored costs (`cost_per_base_unit` etc.) stay exact. Never
  round stored values.**
- **Auto-tick rule (v39): only a row whose `invRowState` is `'matched'` is ever
  pre-ticked — by the renderer AND by every handler. Flagged/review/new rows
  wait for the user's tick. A regression test pins this.**
- **Supplier renames must migrate supplier memory** (v40). Taught invoice-line
  matches key off the supplier NAME (`memKey`); renaming a supplier without
  re-keying its memories orphans them silently. `tidySupplierMemMigration`
  rebuilds keys from each entry's already-normalised `phrase_norm` — apply the
  same pattern to any future field-rename feature that touches a name used as
  a lookup key elsewhere.

## When to delegate to a subagent

Claude Code has subagents (separate workers with their own clean context that
report back a summary) — use one for a task on THIS repo when either is true:
- **Exhaustive search across `js/app.js`** before any change that could have
  scattered call sites — e.g. "find every place that reads or writes
  `kitchenIngredients`", "find every caller of `invRowState`". One 3000-line
  file means these searches are noisy; keep that noise out of the main
  session so it doesn't crowd out the actual edit.
- **Diagnose-before-patch on a fragile area** (see above) — e.g. "trace the
  taught-pack write path end to end and report where it breaks" is a
  research task with a short answer; delegate it, then patch in the main
  session once the subagent reports back.

Don't delegate small, single-file, already-scoped edits (a CSS rule, a copy
change) — the overhead isn't worth it and you lose the tight loop of
plan → edit → test in the same context.

## Handovers vs. this file — different jobs, don't confuse them

- `handovers/HANDOVER-vNN.md` — a dated diary entry for ONE batch: what
  changed, root causes found, judgement calls. Write-once, never edited
  after the fact. Keep ALL of them — they're the audit trail (git keeps them
  forever regardless; deleting one buys nothing). Put new ones in the
  `handovers/` folder, not the repo root.
- `CLAUDE.md` (this file) — the current, stable state of the repo. Short on
  purpose. Only the "State as of" section below is meant to be rewritten
  every batch (overwrite it, don't append to it — it's a snapshot, not a
  log). Everything ABOVE that section (rules, glossary, fragile areas) only
  changes when a genuinely new, durable rule is discovered — and even then,
  propose the addition to Max and get a yes rather than silently editing it
  yourself. Rules in this file exist because a mistake already happened once;
  treat a proposed change to them as worth a real look, not a rubber stamp.

At the end of every batch: rewrite "State as of" to reflect reality, write a
fresh `handovers/HANDOVER-vNN.md`, and — only if you hit something that
belongs above that line — say so explicitly and wait for a yes before
editing it.

## How to work with Max

- He communicates tersely, in note form, usually with phone screenshots.
  Real examples beat abstract descriptions — ask for a screenshot when unsure.
- **Plan first.** For any multi-item batch: restate the items as a scoped,
  root-cause-framed plan and get a yes before editing. Ask clarifying
  questions up front with your recommended answer for each.
- **Diagnose before patching** anything "sometimes broken": reproduce it
  (jsdom), find the root cause, document it in a one-line comment at the fix
  site, lock it with a regression test.
- Rollbacks happen. If Max says the baseline is X, believe him — then verify
  it yourself and report discrepancies before working.
- Every batch ends with a **handover**: what changed, root causes found,
  judgement calls, what was deliberately NOT built and why, and the
  "needs Max's phone" list.
- Keep commentary in the PR/handover — never in user-visible app copy.

## Deploy pipeline

GitHub `main` → Vercel auto-deploys → installed PWAs pick it up via the
network-first service worker (hence the cache-version discipline). Treat every
merge to `main` as a production deploy.

## Independent review before merge (replaces the CodeRabbit rule)

**Every batch gets an independent review before it merges.** Max has no human
reviewer, so this is the only second reader the code gets.

There are TWO, doing different jobs — don't treat either as the other:

- **`.github/workflows/code-review.yml` — MANDATORY, and it is the one that
  matters.** `anthropics/claude-code-action@v1` on every `pull_request`
  (`opened`, `synchronize`). There is no trigger phrase and no opt-out: it
  **cannot be skipped**, which is the whole point of putting it there rather
  than in a skill. It runs on a **different model** from the one writing the
  batch, deliberately — same family, so the blind spots overlap, but not
  entirely. It is **blind to the brief**: it sees the diff and nothing else, and
  judges whether the code is CORRECT, not whether it matches what was asked
  for. Don't "help" it by pasting the brief into the PR body as context for it;
  that removes the only thing that makes it independent.
- **The `code-review` agent — OPTIONAL, and runs BEFORE push.** Adversarial
  review of the branch diff against `main`, after the suite is green. Cheaper
  and faster than finding the same thing on the PR. Skipping it is a judgement
  call; skipping the workflow is not available.

**⚠️ A SKIPPED REVIEW REPORTS SUCCESS — the one trap in this setup, and it is
the exact failure class the reviewer is told to hunt for.** The action refuses
to run when `code-review.yml` on the PR differs from the copy on `main` — a
security measure, since otherwise a PR could rewrite its own reviewer to wave
itself through. When it refuses it **exits GREEN**, posts nothing, and states
the reason only in the job log. So **any PR that touches the workflow file is
NOT reviewed, and the check still passes.** Measured on PR #55 — the PR that
added the workflow, which could not be reviewed by it. **A green "Code review"
check is not evidence that a review happened.** No comment plus no findings is
the shape of a review that never ran; open the log and confirm it actually
reviewed before reading silence as approval.

**⚠️ NEVER DISMISS A FINDING BECAUSE ITS STATED CAUSE IS WRONG.** A finding
whose *mechanism* is wrong may still be pointing at a real bug. That happened
**twice** with the previous reviewer and **both were worth acting on**. The
finding and the explanation are separate claims — disprove the explanation and
you have disproved nothing. Go and look at what it was pointing at.

Every finding gets a decision Max can see: fixed (re-run `npm test` + `node -c`),
or explained as intentional, or noted as considered and skipped. Silence is not
a pass. Neither review overrides CLAUDE.md's rules or the tests — those remain
authoritative.

## State as of 6 Aug 2026 (verify, don't trust)

**This section is a SNAPSHOT, not a log.** Overwrite it every batch — never
append. Per-batch history belongs in `handovers/`, nowhere else.

- **Version: v114, on branch `feature/v114-menu-change-log` — NOT yet merged.**
  `origin/main` is at **`16290ec`** (the PR #55 merge, which replaced CodeRabbit
  with the mandatory review workflow). Five batches running, the recorded
  `origin/main` was stale by the time it was read — `git fetch` and read
  `origin/main` yourself ([[verify-origin-main-before-trusting-local]]).
  **Production is `https://scoopyscosting.vercel.app`** — the stable alias, and
  the only URL that answers without a login. The per-deployment URLs that
  `gh api …/deployments` returns are auth-protected and 302 to Vercel SSO, so a
  `curl` against one proves nothing. Fetch the alias, and check WHICH build
  answered before concluding anything from a device (a branch push deploys a
  PREVIEW).
  **`aa16387` is the last commit containing the `BASE_PRODUCTS` literal**, which
  a format-1 restore needs (hard rule 9).
- **⚠️ v114 ADDED THE CHANGE LOG, AND ITS TWO MIGRATIONS ARE NOT YET APPLIED.**
  Read `HANDOVER-v114.md` before touching any path that changes a plate, a link
  or a menu. Apply **in this order**, in the SQL editor:
  `20260806_menu_change_log.sql`, then `20260806_restore_backup_v3.sql` (which
  replaces `restore_backup(jsonb)` and references the table). **Run the INSERT in
  each verify block** — a select alone cannot tell an empty table from an
  RLS-filtered one, which is how v90's `menu_price_history` sat write-blocked for
  a day. **The code is safe to ship first**: booted against production with the
  table absent (real client, real data — 412 products, 77 dishes, no errors) and
  it simply records nothing, exactly as `menuHistSupported`/
  `menuPriceHistSupported` degrade.
  - **⚠️ `public.menu_change_log` RECORDS WHAT MAX DID. Every other price-ish log
    records what a SUPPLIER did. A supplier price movement must NEVER reach it** —
    it is the thing being measured, and logging it would reset the "how long since
    you last acted" clock on the exact event the drift counter accumulates.
    **THE CONDITION IS A FUNCTION, NOT A LIST: if `setProduct` wrote it, it is
    drift and belongs in `ing_price_history`.** That covers `commitPrice`, both
    `applyInvoice` price branches, `saveIngEdit`, `submitNew`, the pack teach,
    `applyTidy` and the product delete. Pinned behaviourally AND by census, both
    verified red.
  - **TWELVE paths write it, and TWO were not in the brief:** the ingredient
    re-link inside `applyInvoice` (`kingRepoints`) and `linkDishToPlate`. The full
    table is in the handover. **`logHistory` is NOT the funnel** — it fires on six
    of the twelve and not the other six, so an ingredient repoint does not even
    put a point on the food-cost trend line today. Real, pre-existing, NOT fixed.
  - **⚠️ NO ENTRY IS EVER WRITTEN FOR A CHANGE THE SERVER DID NOT TAKE.** The log
    is append-only with no UPDATE and no DELETE **at the policy level**, so an
    optimistic entry could never be retracted. Every call site logs in its success
    branch via `logChangeIfSaved`. On the delete paths that is load-bearing:
    v112's rollback restores everything on a partial failure. **`dbSetSetting` and
    `dbDeleteMenuRecord` now RETURN their `pushWrite`** for this — the same gap
    v112 closed on `dbDeleteMenu`/`dbDeletePlate`.
    **⚠️ BUT `logChangeIfSaved` CONFIRMS THE WRITE THAT CARRIES THE CHANGE, NOT
    THE LOG'S OWN INSERT** — so a local-only entry is one for something that DID
    happen whose insert failed. `bootstrapSync` therefore MERGES by id
    (`mergeChangeLog`) rather than replacing; replacing would delete exactly the
    entries worth keeping, silently, at the next reload. An earlier draft got this
    wrong on reasoning that reads as airtight.
  - **⚠️ THE BOOT PROBE IS A SELECT AND WHAT IT AUTHORISES IS AN INSERT.** They
    fail independently: a half-applied migration (grants + RLS + the select policy,
    no insert policy) READS `200 []` and refuses every write with 42501 — the shape
    v90's `menu_price_history` came up in. **`dbPushChange` latches
    `changeLogSupported` false on the first error**, so a refused insert costs one
    toast rather than one per action forever. Both guards are needed; neither
    covers the other's case.
  - **`avgBefore` MUST be read before the mutation.** `computeAvgFoodCost()` is
    live, so one line later it is already the AFTER figure. The first draft of the
    `saveKingModal` repoint had exactly that bug.
  - **ONE user action is ONE entry**, with `menu_ids text[]` listing every menu it
    touched. The exception is the invoice repoint loop: one entry per INGREDIENT.
    The log is written by **`removeMenuItem`'s callers**, not by `removeMenuItem`,
    because `doDeleteMenu` calls it once per dish for ONE decision; a census test
    fails and names a fourth caller if one appears.
  - **Figures are STORED, and they are primitives, not a percentage.**
    `avg_before`/`avg_after` in the chart's own units plus plate cost in dollars.
    Deriving is not merely expensive here, it is **unavailable** — there is no
    recipe history to reconstruct a plate's build from. Exact, never rounded.
  - **NO foreign keys**, matching `ing_price_history`/`menu_price_history` — and
    forced by the restore, which deletes and reinserts every `menu_items`/`plates`/
    `menus` row.
- **⚠️ THE BACKUP IS `format: 3` NOW, AND BOTH 2 AND 3 RESTORE. THE WIRE FORMAT
  DECLARES WHAT THE PAYLOAD CONTAINS, NOT WHICH VERSION BUILT IT** —
  `backupToPayload` sends **2 when there is no change log to carry** and 3 only
  when there is. That is not a nicety: the deployed function is whatever was last
  applied by hand, v110's refuses format 3 outright, and sending 3 unconditionally
  would break EVERY restore between this code reaching Vercel and migration 2
  being run — including a restore of the format-2 file that is the only recovery
  path there is. Hard rule 9's
  general law made the new group a format change. **Refusing format 2 would have
  been the more dangerous choice**: `~/Downloads/ezplate-PRE-STEP2.json` is format
  2 and is the only recovery path there is. A format-2 file simply predates the
  log — a true statement about the file, not a guess, which is the distinction
  that makes format 1 refusable and format 2 not. **The change-log restore is
  ADDITIVE** (`on conflict (id) do nothing`), the second deliberate exception to
  "replace", because a replace would erase every intervention made since the
  backup was taken. Being never deleted is also why the group is exempt from
  "missing group = damaged file" on BOTH sides.
  **`tests/restore.test.js` now pins `20260806_restore_backup_v3.sql`**, not
  v110's file — that one stays as the record of what ran, but it is superseded.
- **⚠️ v113 GATED TWO COMMIT-BEFORE-CHECK PATHS.** Read `HANDOVER-v113.md` before
  touching the invoice confirm or either publish path.
  - **⚠️ THE INVOICE REVIEW DOES NOT RENDER AT ALL UNTIL THE AI REFEREE HAS
    SPOKEN.** `renderInvReview` early-returns to `renderInvWaiting` while
    `gemPending()`. **Gating only `Confirm All` is NOT enough, and the reason is
    `gemRowLocked`:** a match picked (`manualPick`), an add-new ticked
    (`newItem.approved`) or a pack taught (`packTaught`/`taughtQty`) during the
    window makes `gemApplyReadings` SKIP that row entirely, and `invSelChanged`
    clears `gemMatchReview`/`gemPriceReview` on top. **The referee does not arrive
    too late to matter — it DEFERS to a ruling made without it and treats it as
    informed** ([[gate-the-first-committing-action-not-the-last]]).
  - **`invConfirmState(status, aiOn)` is the pure decision**, read by
    `gemPending()` in exactly TWO places: the early return above and
    `confirmApplyInvoice`. The Confirm All button carries **no `disabled`
    binding** — reaching that line means the gate was already open.
  - **There is no per-row "checking" state, and that is not a shortcut.** ONE
    request covers the whole invoice. The panel shows no counts either.
  - **The referee can only ever DEMOTE a row.** **The 20 s watchdog MUST bump
    `gemToken`**, or a response arriving after the gate released is still merged.
  - **`publishPlan(dishes, plateId, menuId)` is the ONE publish decision**, shared
    by `submitMenuItem` AND `submitAddDish` — there were TWO row-creating paths
    with the identical blind guard. Its `plateId ? … : null` is load-bearing.
    **`renderUnlinkedPrompt` reads `publishPlan(...).unlinked`, never its own
    computation** — found by opening the modal in Chromium, not by any test.
- **⚠️ v112 FIXED THE DELETE-SIDE SEQUENCING.** Read `HANDOVER-v112.md` before
  touching plate/dish deletes.
  - **`dbDeletePlateAfterDishes` is the delete-side twin of
    `dbPushMenuAfterPlate`.** On the way IN the referenced row lands first (plate,
    then dish); on the way OUT the referencing rows go first.
  - **The old bug was a RACE, not a wrong order.** **A test that records call
    ORDER passes against the broken code** — `tests/delete-sequencing.test.js`
    holds the dish deletes pending and asserts the plate delete has not been
    ISSUED yet.
  - **Failure is honest and the screen matches the server.** The optimistic
    repaint stays; the WORDING waits. A dish whose delete SUCCEEDED is never
    resurrected when a sibling fails.
  - **The orphan-plate editor is GONE** — unreachable since v55. **v111's sweep
    missed it because the functions ARE name-referenced from live code; only the
    DATA flow showed they were dead.**
  - **`plateIdOf` has TWO branches** (`plateId`, then `sourcePlateId`). The third
    (a stale local `plate.menuId`) is removed and nothing reads `plate.menuId` at
    all.
- **⚠️ THERE ARE THREE FOREIGN KEYS, AND ONLY ONE CAN EVER ERROR** (re-read
  through the MCP, 6 Aug):
  - `menu_items.plate_id → plates.id` — **NO ACTION**. Deleting a plate while a
    dish references it raises **23503**. The only FK hazard in the app.
  - `plates.menu_id → menu_items.id` — ON DELETE SET NULL. 0 rows non-null.
  - `menu_items.menu_id → menus.id` — ON DELETE SET NULL. It means
    `doDeleteMenu`'s comment claiming its ordering guards an FK violation is
    WRONG — that ordering was never load-bearing.
  The ingredient, supplier-phrase and change-log paths cross no FK at all.
- **✅ 0 ORPHAN DISHES** (re-checked 6 Aug: 77 `menu_items`, all with a
  `plate_id`). The v112 toastie was repaired 5 Aug. **The absence of a
  back-pointer is not evidence that nothing was lost — look for an orphan on the
  OTHER side too.**
  **⚠️ `submitMenuItem`'s duplicate guard matches by PLATE**, so an unlinked row
  is invisible to it — v113 closed that by DETECT AND OFFER (`publishPlan` +
  `renderUnlinkedPrompt`), not by auto-healing or name matching.
- **⚠️ THE BACKUP RESTORE EXISTS (v110).** Settings → Data → **Restore from
  backup**. What it accepts and refuses is in hard rule 9; how it crosses the row
  boundary is in hard rule 8.
  - **One `SUPA.rpc('restore_backup', …)`, never per-table writes.** A test pins
    that there is exactly one call site.
  - **The function is `SECURITY INVOKER`, deliberately** — it grants no privilege
    the public anon key does not already hold.
  - **`ing_price_history` is ADDITIVE**, and since v114 so is `menu_change_log`.
  - **⚠️ `where true` ON THE FIVE DELETES IS LOAD-BEARING.** `safeupdate` is
    preloaded for `authenticator` and rejects a bare DELETE; `postgres` does not
    load it. The general lesson is **hard rule 10**.
  - **STEPS 1 AND 2 OF THE DESTRUCTIVE PLAN ARE DONE** (3–4 Aug, against
    production). **Step 3 (full wipe) is still not run**; what it would newly
    prove is narrow.
  - **The restore NULLS `plates.menu_id` for every plate.** Nothing resolves
    through those values.
  - **Newest backup: `~/Downloads/ezplate-PRE-STEP2.json`** — v110, `format: 2`,
    412 products / 78 plates / 78 dishes, **312,999 bytes, 4 Aug 2026 05:16
    NZST**. It is one dish ahead of production now (77), which is a real deletion
    since, not a fault in the file. A safety net named only by a path is a claim,
    not evidence — check it before relying on it.
- **⚠️ EVERY PRODUCT-PRICE PATH WRITES `ing_price_history`, AND THERE IS ONE
  WRITER (v109).** `setProduct` logs the point; nothing else calls `logIngPrice`.
  The five paths are `commitPrice`, `applyInvoice`'s matched and add-new branches,
  `saveIngEdit` and `submitNew`. The only writers touching `productsById` directly
  are `applyTidy` (guarded to `TIDY_COLS`) and `bootstrapSync`. **The condition is
  the PREVIOUS STORED price, not the last logged point** — don't "simplify" the
  two guards into one. Product CREATION logs a first point deliberately.
  **Since v114 `setProduct` is also the definition of what the change log must
  IGNORE.**
- **⚠️ v108 IS THE ONLINE-ONLY DATA LAYER.** Read `HANDOVER-v108.md` before
  touching the data layer.
  - **There is no `BASE_PRODUCTS` and no `BASE_MENU`.** `productsById` holds the
    whole catalogue, one layer.
  - **Boot is async and gated.** `bootstrapSync` does ONE `Promise.all` of **ten**
    reads (v114 added `menu_change_log`, newest-500, descending). `#bootGate`
    covers the tabs until data lands. It is NOT the splash.
  - **A failed write is never quiet.** Offline changes the WORDING, not whether
    the user is told. **Still no pre-skip on `navigator.onLine`.**
  - **`reconcileLocalOnly` is gone**; tombstone lists are gone; a delete is a real
    DELETE, guarded by `productRefs`.
- **⚠️ DELETING A PRODUCT REFUSES IF ANYTHING USES IT (D3).** `productRefs(pid)`
  checks BOTH live paths — ingredient→pid AND plate-line→pid. Don't "simplify" it.
- **What is still in localStorage, and it is the whole list** (12 keys):
  `cafeDB_currentMenuId`, `cafeDB_dashScope`, `cafeDB_dashRange`,
  `cafeDB_lastTab`, `cafeDB_plateDraft`, `cafeDB_lastImport`,
  `cafeDB_insightCache`, `cafeDB_aiInvoiceCheck`, `cafeDB_aiSuggestions`,
  `cafeCost_theme`, and two dismissals. **View preferences and derived caches
  only. If something new resists that classification, ask — there is no third
  category.**
- **⚠️ jsdom gives every `window.eval()` its own lexical environment.** Top-level
  `let`s (`productsById`, `savedPlates`, `customMenu`, `byId`, `plate`) are
  unreachable from outside. **Concatenate onto app.js and evaluate together.**
  `changeLog` is a `var`, so it IS reachable — but don't rely on that as a
  pattern.
- **`addProduct` is dead in the app and DELIBERATELY KEPT** (v111) — four
  `fresh-states` specs have no other handle on the pid-line shape.
- **Playwright specs no longer abort everything off-origin.** `tests/visual/
  _boot.js` installs a fake Supabase client before app.js. **It serves an ERROR
  for any table it does not know**, which is how `menu_change_log` correctly
  degrades to unsupported in every spec.
- **Suite:** `npm test` **720 green** · jsdom smoke green · Playwright **94/94**
  · `node -c` clean (`js/app.js`, `sw.js`, four `api/*`). (680 → 720 is v114's
  `tests/change-log.test.js` (33) plus seven new `restore`/`settings` cases.)
  **There is no known-failing test.**
- **Playwright is 94 tests across NINE specs in `tests/visual/`.**
- **Sizes (measured 6 Aug, after v114):** `js/app.js` **7,129 lines / 520 KB** ·
  `css/style.css` **2,845 lines** · `index.html` **819 lines**.
- **Supabase, re-verified 6 Aug 2026 through the MCP — which connects as
  `postgres`, NOT as the client's role (hard rule 10).** `ingredients` **412** ·
  `plates` **78** · `menu_items` **77** (all with a `plate_id`; it was 78 on
  5 Aug — one real deletion since) · `menus` **2** · `ing_price_history`
  **34 points / 34 products** · `price_history` **49** · `menu_price_history`
  **78** · `supplier_phrases` **7** · `app_settings` **10** · `plates` with
  non-null `menu_id` **0** · **`menu_change_log` does not exist yet.**
  **`public.restore_backup(jsonb)` is still the only function in the schema.**
- **⚠️ THERE IS A TENTH PUBLIC TABLE, `kitchen_items`** (`id`, `name`,
  `current_product_id`, `created_at`) — RLS on, one policy. **Nothing in
  `js/app.js` reads or writes it**; it looks like a relic from before kitchen
  words moved into the `app_settings` blob. Undocumented until v114. Not touched:
  dropping a table needs Max's yes.
- **⚠️ `public.menus` has RLS DISABLED** (0 policies); every other public table
  has it enabled. Practically it changes nothing today — every existing policy is
  `ALL / true / true` for `public` — but it will flag in Supabase advisors and it
  **matters at the multi-tenant gate**. Not fixed: schema change, needs Max's yes.
- **Migrations applied:** the four v108 ones and v110's
  `20260803_restore_backup_fn.sql`. **v114's two are NOT applied yet** (top of
  this section). `list_migrations` is empty — the files plus their commit messages
  ARE the audit trail ([[running-supabase-migrations-here]]).
- **FOUR history series, deliberately separate — don't merge:** `priceHistory`
  (all-menus average), `menuHistory` (per menu, v89), `menuPriceLog` (each
  plate's SELL price, v90), `ingPriceLog` (per PRODUCT cost, v109 — the one with
  a SINGLE writer). **v114's `changeLog` is a FIFTH and is not a price series at
  all** — it records decisions, not observations. **Check the writer, not just the
  reader.**
- **Insights rules A–E and the three-logs rule are unchanged** (v90–v93). Rules
  D and E probably belong above the snapshot line — still needs Max's yes.
- **Third-party scripts:** supabase-js **2.110.8**, pdfjs-dist **3.11.174** —
  pinned, SRI-checked except the pdf.js worker (hard rule 4).
- **⚠️ CODE REVIEW MOVED OFF CODERABBIT (6 Aug 2026).** Everything CodeRabbit is
  removed. **The `coderabbitai[bot]` GitHub App may still be installed** — it is
  an account-level install, removable only from
  github.com/settings/installations. Replaced per "Independent review before
  merge" above. **Reviews draw on Max's own Max plan via
  `CLAUDE_CODE_OAUTH_TOKEN`** (a repo Actions secret), so a missing or expired
  token makes the PR workflow FAIL rather than silently skip.

**Outstanding, in priority order:**

0. **Apply v114's two migrations** (top of this section), then confirm through the
   app rather than the SQL editor — hard rule 10. The cheap client-role check is
   `await SUPA.rpc('restore_backup', {payload:{format:1}})` from the browser
   console, which every guard refuses before a single write.
1. **Phone sign-off on v108, and it is a different KIND of sign-off.** Sharpest:
   **the cold-start penalty** — the first request after idle measured
   **~1,138 ms** against 79–152 ms warm, and with week-long gaps that is Max's
   NORMAL case, landing on top of the boot gate. Then: does the gate read as
   honest or as broken? Does the offline message arrive when the signal actually
   drops? Does a refused product delete explain itself?
2. **Phone sign-off on v82–v104** — the whole UX propagation sequence, still none
   of it device-verified. Carried.
3. **v112's device check:** delete a plate that is on a menu, reload, confirm it
   stays gone. And Plates tab → Publish → reload → the dish still reads as costed.
4. **v113's device check, and item 1 of it is that batch's one real risk.**
   **Import an invoice and watch the wait**: `Confirm All` is disabled until the
   AI referee answers, and on mobile data after a week idle the cold-start penalty
   lands BEFORE the referee starts. It must read as progress, not as the app being
   stuck. Then: **publish a plate normally** and confirm the unlinked-row prompt
   stays invisible — production has 0 orphans, so seeing nothing IS the pass.
5. **v114 has no visual check** — nothing user-facing changed. The one behavioural
   thing: every save now fires one extra INSERT, fire-and-forget. If a plate save
   feels slower on mobile data, that is the first thing to look at.
6. **⚠️ `logHistory` does not fire on six of the twelve change paths** —
   `saveKingModal`, `confirmGuardedRepoints`, `deleteKitchenIngredient`,
   `mmRemove`/`doDeleteMenuOnly`, `deletePlate`/`doDeleteEverything`,
   `doDeleteMenu`. So an ingredient repoint — the cheapest real intervention in
   the app — puts no point on the food-cost trend line. Found in v114's
   enumeration, NOT fixed (hard rule 5). Its own brief.
7. **⚠️ `ensurePlateForDish` is the OTHER door onto an orphan, and it answers
   wrongly.** Reached from the builder's "load menu item", it gives an unlinked
   row a **brand-new EMPTY plate**. Correct for a genuinely uncosted row; for the
   v112 toastie it would have left the real recipe unreferenced. Needs its own
   brief and Max's yes. Related: **no path CREATES an unlinked row**, so the class
   can only arrive from history or from a backup restore.
8. **⚠️ `Ham Leg Sliced 2Mm (App 1Kg)` (`P0182`) is stored at $0.0003/g —
   30 c/kg.** Almost certainly wrong by a factor of ~46 (≈$13.90/kg would be
   normal). **Not changed** — it is a price, and prices are Max's call. Worth
   checking against a recent invoice.
9. **`public.menus` RLS is off**, and **`public.kitchen_items` looks like a dead
   table** — both above. Each its own brief; harmless today.
10. **Upgrade pdf.js to 4.2.67+** — 3.11.174 carries CVE-2024-4367; mitigated v88
   (`isEvalSupported:false`), NOT fixed. Its own brief.
11. **Audit the 45 pre-v89 Playwright tests for MEANING, not for green** — they
   all pass, so this is not urgent. 12 of the 45 (`screenshots.spec.js`) are
   capture-only, and four `fresh-states` setups build a plate through
   `addProduct`, a door no user has had since v31.
12. **The restore's destructive plan — only STEP 3 remains**, optional rather than
   blocking. ONLY on an explicit go with a fresh export taken minutes before.
   **Separately, and more useful: none of the restore UI has been seen on a real
   phone.** The file picker on iOS Safari with a `.json` filter is the unknown.
13. ~~A unique index on `ing_price_history (product_id, recorded_at)`~~ —
   **CLOSED. It already exists** and has since 1 Aug:
   `ing_price_history_product_moment_key`, created in
   `20260801_ing_price_history.sql`. The old entry said it was "deliberately NOT
   built" and would "apply cleanly", which was simply wrong. The restore's
   `DISTINCT ON` is still load-bearing (it guards duplicates WITHIN one payload),
   but "not race-safe" no longer applies.
14. Small, each needing a yes: **`edDelArmed` is dead** (written in three places,
   never read). **`ingredients.updated_at` is stale and means nothing** —
   `ingredientToRow` never sends it and nothing sets it. Then: the stale v60
   target-line comment in `trendChart`; the `.chart-hint`/`.scope-note` pair under
   the chart; `.range-btn` is 32px (DEFERRED by Max 31 Jul as an OPEN
   accessibility item, not dropped); `avgFoodCostForScope` counts dishes whose
   `menuId` has no By-menu row.
15. Supplier coverage is 18% of used products — the concentration family stays
   silent by design until ~50%.
16. **Max clears the six orphaned `"Document No:"` taught packs** (Settings →
   Remembered items) then imports one Bidfood invoice to re-teach. Only one is a
   real loss. Not urgent.

**Open, NOT bugs to fix on sight:** "Menu item" survives as a fifth noun in the
Edit-menu-item modal (its own brief). **`GET /api/parse-invoice?probe=1` was
already REMOVED in v70** — only a key-free `?health=1` check remains, which
reports the model name and whether a key is configured, never the key.
Per-batch detail lives in `handovers/HANDOVER-vNN.md`; its README records the
gaps in that history.
