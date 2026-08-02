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
does NOT change: the data is real and irreplaceable, and there is no restore.

## What the app does

1. **Products** — supplier goods with prices, pack sizes, base units (~400,
   seeded from `BASE_PRODUCTS` plus custom `CX*` ids).
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

Data: **localStorage (offline-first) + Supabase sync**. No analytics, no
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

- `js/app.js` (~3000+ lines) — ALL logic, one browser script. Cannot be
  `require()`d; tests extract functions from it by source slicing.
- `css/style.css` (~2000 lines) — entire visual layer, organised in numbered
  sections with `/* ===== batch (vNN) ===== */` history headers.
- `index.html` (~500 lines) — splash, header, five tab containers in
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
3. **`aRow` and `renderAnalysis` are each defined TWICE.** The first definition
   of each is dead; the **second is live**. Grep, confirm line numbers, edit
   the second. Editing the first is a silent no-op that has shipped real bugs.
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
     act on. Backed by localStorage `cafeDB_menus` **and** a Supabase `menus`
     table (`dbUpsertMenuRecord`/`dbDeleteMenuRecord`) that is real but may not
     exist on older projects — the bootstrap read is wrapped in a try/catch.
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
     `dbPushMenuAfterPlate`. (The FK direction FLIPPED in v55: the old
     `plates.menu_id → menu_items.id` FK `plates_menu_id_fkey` and the old
     `dbPushPlateAfterMenu` are gone.) See Data-write rules.
7. **Menu deletion deletes its dishes and UNLINKS their plates — never the
   plates.** (v54, reverses v40/v42.) Deleting a menu removes its `menu_items`
   rows and sets each affected plate's `menu_id` to null; every plate survives in
   the Plates library, unpublished. There is **no holding area** (`MENU_UNASSIGNED`
   and its machinery — `ensureUnassignedMenu`/`holdingHasDishes`/`realMenus` — were
   removed) and **no last-menu guard**: any menu is deletable, including the last,
   and **zero menus is a legitimate state**. `fallbackMenuId()` never returns a
   deleted id and returns `null` when no menu exists; `ensureDefaultMenu` seeds
   "Original" only on a genuinely fresh install (the `cafeDB_menus` key was never
   written). Publishing when no menu exists prompts to create one first.
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

   **The general law, which is why this rule is here and why it keeps needing
   rewriting:** a backup that dumps live in-memory objects inherits every
   assumption those objects carry. Change what fills them and you have changed
   the file format without touching the exporter — silently, with the tests still
   green. Any change to what `bootstrapSync` puts in memory is a change to the
   backup format, and must bump `stamp.format`.

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

## State as of 3 Aug 2026 (verify, don't trust)

**This section is a SNAPSHOT, not a log.** Overwrite it every batch — never
append. Per-batch history belongs in `handovers/`, nowhere else.

- **Version: v109 on branch `fix/price-log-every-path`, six spots agree.**
  `origin/main` is at **v108** (`4f750eb`, the v108 merge). **`git fetch` and
  check `origin/main` yourself every session** — this bullet was a merge stale
  for a day in v107 ([[verify-origin-main-before-trusting-local]]).
  **`aa16387` is the last commit containing the `BASE_PRODUCTS` literal**, which
  a format-1 restore needs (hard rule 9).
- **⚠️ EVERY PRODUCT-PRICE PATH WRITES `ing_price_history`, AND THERE IS ONE
  WRITER (v109).** `setProduct` logs the point; nothing else calls `logIngPrice`.
  Recorded here so the next session cannot repeat the gap: the five paths that
  write `cost_per_base_unit` are the builder hand-edit (`commitPrice`), invoice
  confirm's matched branch and its add-new branch (`applyInvoice`), the Products
  tab edit form (`saveIngEdit`), and the Products tab create form (`submitNew`).
  All five funnel through `setProduct`; the only writers that touch
  `productsById` directly are `applyTidy` (category/brand/supplier) and
  `bootstrapSync` (fills the object, never calls `setProduct` — which is what
  stops boot fabricating 412 points).
  **The condition is the PREVIOUS STORED price, not the last logged point.**
  `logIngPrice` dedupes against the LOG, and nearly every product's log is empty,
  so a non-price write — the invoice pack teach, `{pack_qty, pack_unit}` — would
  sail past that dedupe and invent an observation. Don't "simplify" the two
  guards into one. Product CREATION logs a first point deliberately (Max, 3 Aug):
  `ingPriceAt` returns null before a product's first point, so without it a new
  product's first price move has nothing to have moved from.
  **Device-verified 3 Aug** (see outstanding item 0): a Products-tab edit wrote
  its point. `ing_price_history` is 34 points / 34 products of 412 — the series
  has restarted after 19 dead days, but it is still thin, so the movers card and
  insight family 1 will stay quiet on most products for a while. That is a
  series that has just started, not a bug.
- **⚠️ v108 IS THE ONLINE-ONLY DATA LAYER. Supabase is the source of truth and
  localStorage is no longer a data store.** The single largest change to this
  app's architecture. Read `HANDOVER-v108.md` before touching the data layer.
  What is now TRUE and was not:
  - **There is no `BASE_PRODUCTS` and no `BASE_MENU`.** 132 KB of hardcoded
    catalogue is gone; app.js is 590 KB → ~455 KB. Products come from
    `ingredients`, dishes from `menu_items`. The base+overrides merge is gone —
    `productsById` (was `overrides`) holds the whole catalogue, one layer.
  - **Boot is async and gated.** `bootstrapSync` does ONE `Promise.all` of nine
    reads (was a 4-query batch plus five sequential awaits: ~915 ms → ~225 ms
    measured; the two schema probes folded into their real queries). `#bootGate`
    covers the tabs until data lands. It is NOT the splash — the splash skips a
    same-session refresh and times out at 3 s, both of which would reveal an
    empty app. First boot only; a later failure can still surface.
  - **A failed write is never quiet.** `pushWrite` lost its silent-offline
    branch and its `null`-that-read-as-success. Offline changes the WORDING, not
    whether the user is told. **Still no pre-skip on `navigator.onLine`** — v40's
    lesson, it false-reports in installed PWAs.
  - **`reconcileLocalOnly` is gone**, with the whole heal-and-re-push idea. Its
    premise (a local-only row is probably a dropped write) is false now, and
    against an RLS-empty read it would have resurrected every local row.
  - **Tombstone lists are gone** (D3). A delete is a real DELETE, guarded by
    `productRefs` — see below. The two `app_settings` rows are left in the DB
    deliberately, unread.
  - **The export is `format: 2`**, a complete snapshot. See hard rule 9.
- **⚠️ DELETING A PRODUCT NOW REFUSES IF ANYTHING USES IT (D3).** Until v108,
  `deleted_prod_ids` filtered at RENDER time and the row stayed, so a "delete"
  could not break a plate that costed from it. **That protection was accidental**
  and a real DELETE removes it. `productRefs(pid)` checks BOTH live paths —
  ingredient→pid AND plate-line→pid (of Max's 179 plate lines, 81 take the first
  and 84 the second, so a guard walking only one misses half) — and the delete
  refuses, naming what breaks. Don't "simplify" it to one path.
- **What is still in localStorage, and it is the whole list:** `currentMenuId`
  (D1 — validated at render, never at read), `dashScope`, `dashRange`,
  `lastTab`, `plateDraft`, `lastImport`, `insightCache`, the two AI toggles,
  theme, and two dismissals. **View preferences and derived caches only. If
  something new resists that classification, ask — there is no third category.**
- **The `saveX()` functions are deliberate empty no-ops**, each with a comment
  naming what persistence now is (a server push). ~50 call sites; gutting the
  bodies is what mattered, collapsing the call sites is safely-reviewable
  follow-up and four of them are the sole body of an `if`. Not dead code nobody
  noticed — see the handover.
- **⚠️ jsdom gives every `window.eval()` its own lexical environment.** Top-level
  `let`s (`productsById`, `savedPlates`, `customMenu`, `byId`) are unreachable
  from outside: `w.x = v` makes an unrelated window property and a second
  `w.eval('x = v')` cannot see the binding either. **Concatenate onto app.js and
  evaluate together.** Verified, and this has now bitten twice (v91, v108).
- **Playwright specs no longer abort everything off-origin.** `tests/visual/
  _boot.js` installs a fake Supabase client before app.js so the REAL boot path
  runs against fixtures; it serves `ingredients` from
  `tests/fixtures/base-products.json` and everything else from each spec's own
  localStorage seed, translated to row shape. **Both times these specs went red
  this batch, the app was right and the harness assumption had expired** — but
  the v100 rule stands: treat a failure as real until you have proved otherwise.
- **Suite:** `npm test` **582 green** · jsdom smoke green · Playwright **94/94**
  · `node -c` clean (`js/app.js`, `sw.js`, four `api/*`). (563 → 566 was v108's
  own phase 6c landing after its snapshot was written; 566 → 582 is v109's
  `tests/price-log-paths.test.js`.)
- **Supabase (verified 1–2 Aug 2026 through the MCP server, which reads
  `pg_policies` directly — these are facts, not inferences):** every table the
  app queries exists. **The `menu_price_history` RLS fault is FIXED and
  CONFIRMED** (two policies, 77 rows) — open as "undeterminable" from 28 Jul;
  true of the anon key, not of the MCP. `ing_price_history` exists, RLS on, two
  policies, seeded with 33 points. **Use the MCP for any future "did the
  migration run?" question** ([[running-supabase-migrations-here]]).
- **The four v108 migrations are APPLIED** (see `supabase/migrations/`,
  1 Aug). `ingredients` 120 → 413 → **412 rows** after the `Umrzbztwn` delete.
  `list_migrations` is empty — this project has no CLI migration tracking, so
  the files plus their commit messages ARE the audit trail.
- **Per-menu history has started:** `price_history` 43 rows, 7 carrying
  `menu_id` (was 0 on 30 Jul); `menu_price_history` 77 rows. Thin, but no longer
  empty — check counts, don't assume time has passed.
- **THREE history series, deliberately separate — don't merge:** `priceHistory`
  (all-menus average), `menuHistory` (per menu, v89), `menuPriceLog` (each
  plate's SELL price, v90). Plus `ingPriceLog` (per PRODUCT cost), which as of
  v108 finally has its own table. **Four price-ish logs with DIFFERENT writers —
  check the writer, not just the reader.** As of v109 `ingPriceLog` is the one
  with a SINGLE writer (`setProduct`, see the price-path bullet above); the other
  three are still written from their own call sites, so the rule stands for them.
- **Insights rules A–E and the three-logs rule are unchanged** (v90–v93). Rules
  D and E probably belong above the snapshot line — still needs Max's yes.
- **Third-party scripts:** supabase-js **2.110.8**, pdfjs-dist **3.11.174** —
  pinned, SRI-checked except the pdf.js worker (hard rule 4).

**Outstanding, in priority order:**

0. **Phone sign-off on v108, and it is a different KIND of sign-off.** Every
   previous list was visual; this one is behavioural. Sharpest: **the cold-start
   penalty** — the first request after idle measured **~1,138 ms** against
   79–152 ms warm, and with week-long gaps that is Max's NORMAL case, landing
   on top of the boot gate. Then: does the gate read as honest or as broken?
   Does the offline message arrive when the signal actually drops, not just when
   `navigator.onLine` says so? Does a refused product delete explain itself?
   **Take a fresh `format: 2` export once v108 is on the phone** — the 2 Aug
   format-1 file is the fallback until then.
   **v109's own check is DONE — device-verified 3 Aug.** Max edited a price on
   the Products tab and `ing_price_history` went 33 → 34 points (P0001, one
   point, 0.0247 $/g), which v108 could not have written. He was on the **Vercel
   PREVIEW deploy of the branch**, not production — pushing a branch deploys a
   preview, so a device test can silently be running unmerged code. Check
   `gh api repos/.../deployments` before concluding which build produced a
   result ([[verify-origin-main-before-trusting-local]] applies to deploys too).
1. **Phone sign-off on v82–v104** — the whole UX propagation sequence, still
   none of it device-verified. Carried.
2. **Collapse the ~50 `saveX()` call sites** now that the bodies are empty.
   Mechanical, safely reviewable, no behaviour change.
3. **Upgrade pdf.js to 4.2.67+** — 3.11.174 carries CVE-2024-4367; mitigated
   v88 (`isEvalSupported:false`), NOT fixed. Its own brief.
4. **Reconcile the 45 pre-v89 Playwright tests** (stale premises since v72).
5. **The restore importer** — still unbuilt, and now well-defined: hard rule 9
   plus `stamp.format`. Its own brief.
6. Small, each needing a yes: **`ingredients.updated_at` is stale and means
   nothing** — `ingredientToRow` never sends it and nothing sets it, so P0001
   read 18 Jul minutes after being written (found 3 Aug). Don't use it to judge
   whether a write landed; either populate it or drop it.
   Then: the stale v60 target-line comment in `trendChart`;
   the `.chart-hint`/`.scope-note` pair under the chart; `.range-btn` is 32px
   (DEFERRED by Max 31 Jul as an OPEN accessibility item, not dropped);
   `avgFoodCostForScope` counts dishes whose `menuId` has no By-menu row.
7. Supplier coverage is 18% of used products — the concentration family stays
   silent by design until ~50%.
8. **Max clears the six orphaned `"Document No:"` taught packs** (Settings →
   Remembered items) then imports one Bidfood invoice to re-teach. Only one is a
   real loss. Not urgent.

**Open, NOT bugs to fix on sight:** "Menu item" survives as a fifth noun in the
Edit-menu-item modal (its own brief); `GET /api/parse-invoice?probe=1` must be
**gated or removed before multi-tenant**. Per-batch detail lives in
`handovers/HANDOVER-vNN.md`; its README records the gaps in that history.
