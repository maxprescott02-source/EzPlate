# CLAUDE.md — EzPlate (Scoopys-Costing)

You are working on **EzPlate**, a plate/menu-costing PWA for a real café
("Scoopy's Family Cafe"). The owner is **Max** — hospitality background, new to
coding and to git. Price data drives real menu decisions, so a broken deploy
costs money. Work accordingly.

**Who actually uses it: ONE intermittent user, not staff on real phones
mid-service. Gaps of a week between uses are normal.** When a design call turns
on how often the app is opened, this is the answer: an occasional user on mobile
data can wait for a fetch, and would rather be told a thing did not save than
discover it next week. The data is real, and losing it costs Max real money. A
restore exists — but it needs a recent export, so a backup named only by a path
is a claim rather than evidence. Check it before relying on it.

## What the app does

1. **Products** — supplier goods with prices, pack sizes, base units. They come
   from the Supabase `ingredients` table and nowhere else. Custom ids are `CX*`.
2. **Ingredients** ("kitchen words") — friendly names (e.g. "Chips") that each
   link to ONE product (`{id, name, pid}`). Plates cost from these, so swapping
   the linked product once updates every plate.
3. **Plates** — the plate library (the tab `data-tab="builder"` is labelled
   **"Plates"**). Assemble a plate from ingredient lines `{kid, qty}` (+ misc
   cost lines) in the builder **popup** (`#builderModal`); **Save** it to the
   library (published or not); **Publish/Move** to a menu from its card. A plate
   is independent — it exists menu or no menu.
4. **Menu analysis** — plate cost vs suggested price at the target food-cost %,
   traffic-light margin health (green/amber/red). For the data model and what
   deleting a menu does, see hard rules 6 and 7 — they are not obvious.
5. **Invoice import** — parse a supplier PDF/text invoice, match lines to
   products, review, confirm → prices update. The most complex and most
   fragile subsystem. Treat with maximum care.
6. **Dashboard** — food-cost trend chart + highlight cards.
7. **Settings** — header gear: target food cost %, GST default, JSON backup
   export and restore, clear cache, About/contact, and **"Tidy lists"** —
   rename/merge/clear the Category/Brand/Supplier values across products (the
   Category picker also spans plate categories), each behind one blast-radius
   confirm, applied through the existing write helpers on a pure core. Ingredient
   categories are derived from the linked product, so a category rename here
   flows to the Ingredients tab automatically.

Data: **Supabase is the source of truth; the app is online-only.**
**localStorage holds view preferences and derived caches ONLY** — never data.
No analytics, no tracking, no build step — hard product constraints.
Third-party code is limited to two pinned, integrity-checked CDN scripts
(supabase-js, pdf.js); adding a third needs Max's yes — see hard rule 4.

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

This has leaked repeatedly, so `tests/terminology.test.js` pins it — including
two **inversion guards**, because a terminology pass is exactly when someone is
tempted to rename `kitchenIngredients` to match the label. Don't (see the next
section). **"Menu item" is still in use** in the Edit-menu-item modal — a known
fifth noun awaiting its own brief.

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

- `js/app.js` — ALL logic, one browser script. Cannot be `require()`d; tests
  extract functions from it by source slicing.
- `css/style.css` — entire visual layer, organised in numbered sections with
  `/* ===== batch (vNN) ===== */` history headers.
- `index.html` — splash, header, five tab containers in `#appMain`, bottom nav,
  all modals.
- `sw.js` — service worker (offline cache).

**Client-side there is no build step.** The repo also has server-side code under
`api/` (Vercel zero-config Node serverless functions): the invoice AI
second-reader and the Dashboard insight phrasing. This is NOT a build step and
does not touch the four files above: Vercel simply serves anything under `/api`.
Conventions there: files whose name starts with `_` (e.g. `api/_gemini.js`) are
**ignored as routes** and hold pure, `require()`-able, unit-tested logic; the
route handlers stay thin. **API keys live ONLY in Vercel env vars**
(`GEMINI_API_KEY`) — never in the client, the repo, or logs. Treat invoice text
and any model output as untrusted data (fence it, validate strictly) — never
executed, never an instruction. **Money/number law:** any AI helper may only
PHRASE numbers the app already computed deterministically — it never produces a
figure; server + client both reject a phrasing that contains a number not in the
supplied facts.

## ⚠️ Privacy gate — before EzPlate serves anyone but Scoopy's

The invoice AI second-reader sends invoice text to Google's Gemini free tier,
which **may use prompts for training**; the Dashboard insight phrasing
(`api/insight.js`) sends plate names + costing numbers to the same tier. Max has
accepted this **for his own café only** (his call, made). **BEFORE multi-tenant
customers' data flows through `api/parse-invoice`, `api/insight`, or any future
endpoint that ships user data to a third-party model, revisit:** move to a
paid-tier Google project that excludes training use, or add a privacy-policy
disclosure. This is the single most important thing to reopen before EzPlate is
used by anyone else.

## 🔒 Hard rules (tests depend on these; violations have caused real damage)

1. **Protected parser region**: the contiguous block in `js/app.js` between the
   exact strings `var INV_EXCLUDE=` and `function unitLabelFor(` is sliced by
   `tests/_extract.js` using those anchors. **Never edit anything inside it.**
   If a fix seems to require it, stop and tell Max — solve outside the region
   (e.g. the taught-pack path exists precisely so the parser needn't learn
   every notation like "105'S").
2. **Never touch** `resolveMatchedPrice`, `unitCatCategory`,
   `applySupplierMemory`, `packToUnitCost`. Reading them is fine.
3. **RETIRED — the number is kept so every cross-reference to rules 4–10 still
   points where it says.** The durable lesson: `aRow` and `renderAnalysis` were
   each defined TWICE at top level in one scope, and **hoisting makes the LAST
   definition win everywhere**, before any statement runs. Editing the first was
   a silent no-op that shipped real bugs — a duplicate is never "dead until
   reached". `tests/housekeeping.test.js` now fails if any name in `js/app.js`
   is defined twice again.
4. **No NEW runtime dependencies, no analytics, no build step, no scope creep.**
   If you spot extra work worth doing, list it for Max — don't build it.
   Two third-party scripts already ship in production: `@supabase/supabase-js`
   in `index.html`, and `pdfjs-dist` loaded on demand by `ensurePdfjs()` (plus
   its worker). Both run with full DOM access on a page holding the Supabase
   anon key and the café's pricing, so both must stay **pinned to an exact
   version** (never a floating `@2`) and **integrity-checked wherever the load
   mechanism allows** — the pdf.js *worker* is the one exception, pinned only,
   because `new Worker()` has no SRI. Changing either version means recomputing
   its `sha384` hash in the same commit; a stale hash blocks the script outright.
   Adding a third such script needs Max's yes, not a judgement call.
5. **Strict scope**: implement what was agreed, nothing more. When in doubt,
   ask before writing code (plan first, then implement).
6. **The menu data model is THREE layers — don't conflate them:**
   - **Menus** — `menusList` (`{id,name,season}`, e.g. `MENU_ORIGINAL`). This is
     what the selector, `canDeleteMenu`, `fallbackMenuId` and `currentMenuId`
     act on. Backed by the Supabase `menus` table
     (`dbUpsertMenuRecord`/`dbDeleteMenuRecord`), which may not exist on older
     projects — the bootstrap read is wrapped in a try/catch.
   - **Dishes / menu items** — `MENU`/`customMenu` (the `menu_items` table).
     Each dish's `.menuId` points at a `menusList` entry. `menuById` keys dishes.
   - **Plates** — the cost builds (the `plates` table). A dish links to its plate
     via **`menu_items.plate_id` → `plates.id`**; ONE plate can back MANY dishes,
     one per menu it's published to (**many-to-many**). Resolve ONLY through
     `plateIdOf` / `plateForMenuItem` / `dishesOfPlate` / `menusOfPlate` — never
     poke the raw fields. `plates.menu_id` is **LEGACY** and read by nothing;
     `menu_items.source_plate_id` is still read as a fallback and mirrored on
     write.

   **THERE ARE THREE FOREIGN KEYS AND ONLY ONE CAN EVER ERROR:**
   - `menu_items.plate_id → plates.id` — **NO ACTION**. Deleting a plate while a
     dish references it raises **23503**. The app's only FK hazard, and what
     `dbDeletePlateAfterDishes` sequences against.
   - `plates.menu_id → menu_items.id` — ON DELETE SET NULL.
   - `menu_items.menu_id → menus.id` — ON DELETE SET NULL. This means
     `doDeleteMenu`'s comment claiming its dishes-before-menu ordering guards an
     FK violation is WRONG — that ordering was never load-bearing. Don't use it
     as precedent.

   The two tables are nonetheless **CIRCULAR**, which constrains any restore:
   `menu_items.plate_id` errors if plates go first, while `plates.menu_id` cannot
   be inserted before the dishes exist. **Any delete-and-reinsert of both tables
   must delete dishes first and insert plates with `menu_id` omitted** — which is
   what `plateToRow` already does, so the restore is correct by existing design
   rather than by luck. If `plateToRow` ever starts writing that column, restore
   breaks (pinned by `tests/restore.test.js`).

   The ingredient, supplier-phrase and change-log delete paths cross NO foreign
   key at all.
7. **Menu deletion deletes its dishes and UNLINKS their plates — never the
   plates.** Deleting a menu removes its `menu_items` rows; every plate survives
   in the Plates library, unpublished (and on any other menu it was published
   to). There is **no holding area** and **no last-menu guard**: any menu is
   deletable, including the last, and **zero menus is a legitimate state**.
   `fallbackMenuId()` never returns a deleted id and returns `null` when no menu
   exists. **`ensureDefaultMenu` seeds "Original" only when the caller has
   established there is no server answer to respect — i.e. the `menus` table did
   not answer at all.** A successful EMPTY read is the user having deleted
   everything and must be respected; an earlier version keyed off a localStorage
   signal that read false forever and silently resurrected "Original menu" on
   every boot. Publishing when no menu exists prompts to create one first.
8. **The backup export is IN-MEMORY shape, not schema shape — a restore written
   against the tables silently drops every link.** `buildBackup` dumps the live
   JS objects verbatim, so `menu_items` rows come out **camelCase**: `menuId`,
   `plateId`, `sourcePlateId`, `custom`. The Supabase columns are `menu_id`,
   `plate_id`, `source_plate_id`, `is_custom` (`rowToMenu`/`dbPushMenu` do the
   translation on every normal read/write; the export bypasses both). A restore
   script written from the schema therefore inserts every dish with a null plate
   link — **every row present, nothing connected**, no error raised. It has
   already cost 76 of 77 dishes on one real file. Any importer must translate
   through the existing `xToRow` writers and never name a column of its own.
   Two groups have **no row mapper and that is not an oversight** —
   `kitchen_ingredients` and everything under `settings` are `app_settings` JSON
   blobs written by `dbSetSetting`, so their boundary is the SETTING KEY. Tests
   pin the trap directly: a restored dish must RESOLVE to its plate and its menu
   (row counts pass happily with every link null), and no camelCase key may reach
   any row.
9. **The export's `products` group mirrors whatever the app holds in memory — so
   what the FILE means is decided by the DATA LAYER, not by `buildBackup`. A
   restore MUST read `stamp.format` and branch, never assume.**
   The chain is `bootstrapSync` → `productsById` → `buildBackup`, which dumps
   that object verbatim. Nobody has ever edited the exporter to change the file's
   meaning; changing what fills the object was enough, twice.

   **Shapes in the wild. `stamp.format` is the only safe way to tell them apart:**
   - **no stamp** — a DELTA against the old `BASE_PRODUCTS` literal, with no
     record of which build. Not safely restorable; reference material only.
   - **`format: 1`** — may be a delta or a complete snapshot, and **the app can
     no longer tell which**, because the literal it would have to compare against
     was deleted. **The restore refuses format 1 outright** (`parseBackupFile`
     names the commit where the literal survives). Refusing a restorable file
     costs one manual recovery; accepting an unrestorable one costs hundreds of
     silently wrong prices.
   - **`format: 2`** — a COMPLETE snapshot. There is no literal, so the two
     `base_products_*` guard fields are **absent**. That absence is deliberate:
     with nothing left to hash they could only be null, and a naive comparison
     reads `null == null` as a MATCH — turning the guard into a rubber stamp.
   - **`format: 3`** — format 2 plus the change-log group.

   **`parseBackupFile` accepts 2 and 3** with all required groups present and of
   the right type, and **refuses, each naming why:** unparseable JSON · no
   `stamp` · `format: 1` · any other `format` · a missing or wrong-typed group.
   A missing group is treated as a DAMAGED FILE, never as an empty dataset — the
   distinction matters because the server would otherwise replace the whole
   catalogue with nothing.

   **The wire format declares what the PAYLOAD contains, not which version built
   it.** `backupToPayload` sends 2 when there is no change log to carry and 3
   only when there is, because the deployed SQL function is whatever was last
   applied by hand. Sending 3 unconditionally would break every restore between
   a deploy and its migration — including a restore of the format-2 file that may
   be the only recovery path there is.

   **The general law, which is why this rule keeps needing rewriting:** a backup
   that dumps live in-memory objects inherits every assumption those objects
   carry. Change what fills them and you have changed the file format without
   touching the exporter — silently, with the tests still green. **Any change to
   what `bootstrapSync` puts in memory is a change to the backup format, and must
   bump `stamp.format`.**
10. **A migration verified through the MCP or the SQL editor has NOT been
    verified for the client. They are different roles.** (Found the hard way, on
    production.)

    `postgres` (what the MCP and the SQL editor connect as) and `authenticator`
    (what PostgREST connects as, for `anon` and `authenticated`) differ in ways
    that change whether SQL *runs at all*:
    - **Preloaded libraries.** `authenticator` carries `safeupdate`; `postgres`
      does not. **`safeupdate` rejects any `DELETE` or `UPDATE` with no `WHERE`
      clause** — so a bare `delete from t;` works perfectly in the SQL editor and
      through the MCP, and fails on the real client path with "DELETE requires a
      WHERE clause". Measured, not inferred: bare is blocked, while `where true`,
      `where id is not null` and a self-subquery all pass, so safeupdate reads the
      PARSE TREE rather than the plan. **The `where true` on the restore's deletes
      is load-bearing.**
    - **`statement_timeout`.** `anon` 3 s, `authenticated` 8 s, `postgres`
      unlimited. A function that is comfortable through the MCP can time out for
      a user.
    - **RLS.** The MCP bypasses it entirely. A SELECT+INSERT-only table is one
      the anon key cannot DELETE from at all — invisible to every SQL test.

    **Exercise any new RPC from the app itself, or from the browser console with
    a payload its own guards refuse** (`rpc('restore_backup', {payload:{format:1}})`
    is the pattern — rejected before any write). Cheap, and it is the only thing
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
`tests/smoke.js` derives its expected version from `sw.js` rather than
hardcoding one.

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
- **`tests/smoke.js` is NOT in the default suite** — run it on its own:
  `npm install jsdom --no-save && node tests/smoke.js`. Anything touching
  rendering, wiring, or Settings.
- **Playwright is NOT in the default suite either** — `npx playwright test`,
  run separately. It drives the installed Chromium against the app from
  `file://` over the specs in `tests/visual/`. **Use it.** Layout, overflow,
  z-index, computed styles and measured geometry at any viewport are things you
  can reproduce and verify rather than defer.
- **Anything server-side must ALSO be exercised as the client's role — see hard
  rule 10.** `npm test`, the smoke and Playwright all stop at the network
  boundary, and the MCP sits on the far side of it as a different, more
  privileged role. A green suite plus a green MCP check is NOT coverage of a
  migration or an RPC. To run the real client against the real database: serve
  the working tree (`python3 -m http.server 8899`) and open it — the local build
  talks to production Supabase, so it exercises the true path while letting you
  test code that is not deployed yet.
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
  `invRowState`, `flagNeedsAttention`, the pack-teach flow). Three invariants,
  each from a real regression: **full-row re-render only** (per-cell patching
  left stale cells); **`.muted-row` hiding is scoped to `.is-new`** (it was
  hiding Old/Conf on needs-attention rows); **tint derives from `invRowState`
  via `st-*` classes** so the card and the summary can never disagree.
- **Taught packs / price precedence**: product pack > supplier memory > parser
  > manual. A pack taught in the mismatch flow must persist on the product and
  outrank the parser on every later import.
- **Mobile visual consistency**: one card system (Products-style), compact
  header pills not full-width bars, one primary CTA per screen (Builder
  Publish, invoice Confirm All). A previous density pass was rolled back
  wholesale — visual changes are surgical, one screen at a time, listed for
  Max's phone.
- **Cross-referencing writes are a SEQUENCE, not two independent writes.** When
  one row references another, the referenced row must land on the server first
  and the dependent write must abort (surfacing the REAL error) if it didn't.
  The FK is `menu_items.plate_id → plates.id`, so **publishing sequences the
  DISH write after the PLATE** via `dbPushMenuAfterPlate` (the plate is normally
  already saved; it's re-pushed idempotently then the dish chains after). Treat
  any new "write X that references Y" flow the same way: push Y, confirm it,
  then X.

  **DELETES ARE THE MIRROR IMAGE.** On the way IN the referenced row lands first
  (plate, then dish); on the way OUT the REFERENCING rows go first (dishes, then
  plate) — `dbDeletePlateAfterDishes` is `dbPushMenuAfterPlate` read backwards.
  Two traps this cost real time to find:
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
  kept is put back so the screen can never show a delete that did not happen. A
  dish whose delete SUCCEEDED is never resurrected when a sibling fails.

## Data-write rules

- Every Supabase write goes through the `pushWrite`-wrapped helpers
  (`dbPushPlate`, `dbPushMenu`, `dbPushIngredient`, `dbSetSetting`,
  `saveKitchenIngredients`, …) — they set sync state and surface the REAL
  error to a toast. Never call the client raw.
- **`pushWrite` returns its settled promise** — resolves to the result,
  `{error}`, or `null` when offline/no client. **Use this whenever write B
  depends on write A having actually landed** — don't fire-and-forget two writes
  that reference each other.
- **Known gap (flagged, not fixed):** `pushWrite` still drops writes silently
  when fully offline — no queue, no retry. Don't assume a write happened just
  because the call was made.
- Settings persist via `dbSetSetting` + a localStorage mirror, loaded
  idempotently in `bootstrapSync`.
- `nextKid()` scans the live `kitchenIngredients` array — push immediately,
  never batch ids.
- Plates persist `{kid, qty}` only; kitchen-word renames are display-only.
- **Rounding rule (Max, 15 Jul): currency DISPLAYS round to the cent
  (`toFixed(2)`); stored costs (`cost_per_base_unit` etc.) stay exact. Never
  round stored values.**
- **Auto-tick rule: only a row whose `invRowState` is `'matched'` is ever
  pre-ticked** — by the renderer AND by every handler. Flagged/review/new rows
  wait for the user's tick. A regression test pins this.
- **Supplier renames must migrate supplier memory.** Taught invoice-line matches
  key off the supplier NAME (`memKey`); renaming a supplier without re-keying its
  memories orphans them silently. `tidySupplierMemMigration` rebuilds keys from
  each entry's already-normalised `phrase_norm` — apply the same pattern to any
  future field-rename feature that touches a name used as a lookup key elsewhere.

## When to delegate to a subagent

Use one for a task on THIS repo when either is true:
- **Exhaustive search across `js/app.js`** before any change that could have
  scattered call sites — e.g. "find every place that reads or writes
  `kitchenIngredients`". One very large single file makes these searches noisy;
  keep that noise out of the main session.
- **Diagnose-before-patch on a fragile area** — e.g. "trace the taught-pack write
  path end to end and report where it breaks" is a research task with a short
  answer; delegate it, then patch in the main session.

Don't delegate small, single-file, already-scoped edits (a CSS rule, a copy
change) — the overhead isn't worth it and you lose the tight loop of
plan → edit → test in the same context.

## Handovers vs. this file — different jobs, don't confuse them

- `handovers/HANDOVER-vNN.md` — a dated diary entry for ONE batch: what
  changed, root causes found, judgement calls. Write-once, never edited
  after the fact. Keep ALL of them — they're the audit trail.
- `CLAUDE.md` (this file) — the current, stable state of the repo. Short on
  purpose. Only the "State" section below is meant to be rewritten every batch
  (overwrite it, don't append — it's a snapshot, not a log). Everything ABOVE
  that section only changes when a genuinely new, durable rule is discovered —
  and even then, propose the addition to Max and get a yes rather than silently
  editing it yourself. Rules here exist because a mistake already happened once.

At the end of every batch: rewrite "State" to reflect reality, write a fresh
`handovers/HANDOVER-vNN.md`, and — only if you hit something that belongs above
that line — say so explicitly and wait for a yes before editing it.

## How work arrives

- **Chat cannot see this repo.** Every claim a brief makes about the code is an
  inference from a summary, and those inferences have been wrong repeatedly — the
  By-menu ranking direction, a distinct-plates requirement reverted on real data,
  and a settled-looking decision to gate only the final confirm, written without
  knowing `gemRowLocked` existed.
- **When a brief contradicts the code, the code wins and the brief was wrong.**
  Report it; never work around it silently. Nothing in a brief is beyond
  correction, including anything it calls settled.
- **`/investigate` runs before a brief when one is warranted** — read-only, no
  branch, no code. Its highest-value output is "this is the wrong question": one
  request asked which tab held the invoice review, and the answer was that the
  tabs were identified backwards.
- **Pushback is the point, not a courtesy.** Every enumeration in this project has
  come back different from the brief's guess — one named price path found three,
  six dead functions found thirty-one, one creation path found two. **If a brief's
  list looks complete, check it anyway.**

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

**Production is `https://scoopyscosting.vercel.app`** — the stable alias, and the
only URL that answers without a login. The per-deployment URLs that
`gh api …/deployments` returns are auth-protected and 302 to Vercel SSO, so a
`curl` against one proves nothing. Fetch the alias, and check WHICH build
answered before concluding anything from a device — a branch push deploys a
PREVIEW.

## Independent review before merge

**Every batch gets an independent review before it merges.** Max has no human
reviewer, so this is the only second reader the code gets. There are TWO, doing
different jobs:

- **`.github/workflows/code-review.yml` — MANDATORY.**
  `anthropics/claude-code-action@v1`, on `pull_request` (`opened`,
  `ready_for_review`). No trigger phrase, no opt-out: **every PR is reviewed once,
  at open.** It runs on a **different model** from the one writing the batch, and
  it is **blind to the brief**: it sees the diff and nothing else, and judges
  whether the code is CORRECT, not whether it matches what was asked for. Don't
  "help" it by pasting the brief into the PR body — that removes the only thing
  that makes it independent. Reviews draw on Max's own plan via
  `CLAUDE_CODE_OAUTH_TOKEN` (a repo Actions secret), so a missing or expired
  token makes the workflow FAIL rather than silently skip.
  - **`synchronize` is deliberately NOT a trigger**, because re-reviewing every
    push cost ~$2 and ~15 minutes each. So **fixes pushed after the PR is opened
    are NOT re-reviewed.** **Open the PR when the diff is FINAL**, or open it as a
    **draft** and mark it ready — `ready_for_review` fires exactly one review, of
    the finished work. **To re-request a review after fixes**, toggle back to
    draft and ready again. No code push, no workflow edit, one run.
  - A **docs-only** change does not trigger it at all (`paths-ignore: '**.md'`),
    so pushing a handover is free. `paths-ignore` skips only when EVERY changed
    file matches, so a batch touching `js/app.js` AND its handover is still
    reviewed in full.
- **The `code-review` agent — runs BEFORE push**, adversarially, on the branch
  diff against `main`, after the suite is green. Nominally optional; **don't skip
  it.** It has caught real defects the workflow did not, it costs nothing extra,
  and its findings are fixed in the same branch so it creates no churn.

**⚠️ A GREEN "Code review" CHECK HAS BEEN WRONG IN TWO WAYS. Both look identical
from the checks list.**

1. **A SKIPPED REVIEW REPORTS SUCCESS.** The action refuses to run when
   `code-review.yml` on the PR differs from the copy on `main` — a security
   measure, since otherwise a PR could rewrite its own reviewer to wave itself
   through. When it refuses it **exits GREEN**, posts nothing, and states the
   reason only in the job log. **So any PR that touches the workflow file is NOT
   reviewed, and the check still passes.** No comment plus no findings is the
   shape of a review that never ran; open the log and confirm it actually
   reviewed before reading silence as approval.
2. **A REVIEW THAT RAN AND THREW ITS FINDINGS AWAY.** The action completed
   cleanly, twice, and posted nothing, because nothing was configured to publish
   — its output went to suppressed stdout, and the log said only `Running Claude
   Code via SDK (full output hidden for security)`. `gh run rerun --debug` does
   NOT recover it. The fix is `track_progress: true` (posts to the PR) and
   `show_full_output: true` (fallback into the job log). **If a run goes quiet
   again, check those two inputs are still on the workflow BEFORE spending
   anything on a re-run.**

**⚠️ NEVER DISMISS A FINDING BECAUSE ITS STATED CAUSE IS WRONG.** A finding whose
*mechanism* is wrong may still be pointing at a real bug. That has happened twice
and both were worth acting on. The finding and the explanation are separate
claims — disprove the explanation and you have disproved nothing. Go and look at
what it was pointing at.

Every finding gets a decision Max can see: fixed (re-run `npm test` + `node -c`),
or explained as intentional, or noted as considered and skipped. Silence is not
a pass. Neither review overrides CLAUDE.md's rules or the tests.

### ⚠️ WHERE A FINDING GETS FIXED — the rule that stops the review eating the batch

**Fix it in the SAME branch, before merge. A finding does NOT get its own PR
unless it is wrong data or silent loss.** Everything else — a missing test, a
stale comment, a nit, a real-but-not-urgent improvement — goes on the outstanding
list below and rides the NEXT batch.
[[fix-review-findings-in-the-same-branch]]

**⚠️ AND IT DOES NOT BECOME PR-WORTHY BECAUSE THE WORK IS ALREADY WRITTEN, because
it is small, or because a commit needs re-landing. Those are the three ways it
gets rationalised, and they are named here because the rule above did not stop
the assistant that wrote it. If you catch yourself explaining why this particular
small PR is different, that is the signal to stop and add it to the outstanding
list instead.** A finished diff is not an argument; it costs nothing to leave it
on a branch and land it with the next batch.

**Why this rule exists (Max, 6 Aug 2026).** One batch merged before its review
was readable, so every finding afterwards needed a *new* PR, and each new PR drew
its own review, which found its own smaller thing — severity decaying each round,
cost not. Six PRs and ten review runs came out of that one mistake. **The steady
state is ONE batch, ONE PR, ONE review (~$2).** If a day's run count is in double
figures, look for the root cause upstream rather than trimming the reviewer. A
docs-only PR is free, so moving something to the outstanding list loses nothing.

## State — verify, don't trust

**A SNAPSHOT, not a log** — overwrite it every batch; per-batch history belongs
in `handovers/`. Read the version from `sw.js`, the branch and history from
`git log`, and **`git fetch` and read `origin/main` yourself** — local `main`
goes stale because Max merges via GitHub PR
([[verify-origin-main-before-trusting-local]]). Row counts, table contents and
applied migrations: check through the MCP, remembering hard rule 10. **Migrations
are applied BY HAND** — `list_migrations` is empty, so the migration files plus
their commit messages ARE the audit trail ([[running-supabase-migrations-here]]).

**Traps in the code as it stands:**

- **⚠️ jsdom gives every `window.eval()` its own lexical environment.** Top-level
  `let`s (`productsById`, `savedPlates`, `customMenu`, `byId`, `plate`) are
  unreachable from outside. **Concatenate onto app.js and evaluate together.**
- **`addProduct` is dead in the app and DELIBERATELY KEPT** — `fresh-states` specs
  have no other handle on the pid-line shape, and Playwright is not in `npm test`,
  so deleting it fails silently.
- **FIVE history series, deliberately separate — don't merge:** `priceHistory`,
  `menuHistory`, `menuPriceLog`, `ingPriceLog`, and `changeLog`, which is not a
  price series at all: it records decisions, not observations. **Check the writer,
  not just the reader.**
- **⚠️ `setProduct` is the ONE writer of `ing_price_history`** — nothing else calls
  `logIngPrice`, and the only code touching `productsById` directly is `applyTidy`
  (guarded to `TIDY_COLS`) and `bootstrapSync`. **The condition is the PREVIOUS
  STORED price, not the last logged point** — don't "simplify" the two guards into
  one. Product CREATION logs a first point deliberately.
- **⚠️ `menu_change_log` records what MAX did; every other log records what a
  SUPPLIER did, and a supplier price movement must NEVER reach it** — it is the
  thing being measured. **THE CONDITION IS A FUNCTION, NOT A LIST: if `setProduct`
  wrote it, it is drift and belongs in `ing_price_history`.** Also:
  - **an anon UPDATE or DELETE returns 204 with NO error** and touches nothing, so
    a caller checking only for an error would believe it had written;
  - **`avgBefore` must be read BEFORE the mutation** — `computeAvgFoodCost()` is
    live, so one line later it is already the AFTER figure;
  - **`kind` alone does not answer "did this move menus"** — a save that changes
    the price AND the menu logs `dish_price`; the move is in `detail.menuFrom`/
    `detail.menuTo`, written on both kinds. **Read `detail`, never `kind` alone;**
  - figures are STORED, not derived: there is no recipe history to reconstruct a
    plate's build from, so `avg_before`/`avg_after` cannot be recovered later.
- **⚠️ Gating the last committing action is not a gate.** The invoice review does
  not render at all until the AI referee answers, because a match picked, an
  add-new ticked or a pack taught during the window makes `gemApplyReadings` skip
  that row — the referee defers to a ruling made without it
  ([[gate-the-first-committing-action-not-the-last]]). `invConfirmState` is the
  pure decision; **the watchdog MUST bump `gemToken`**, or a late response is
  still merged.
- **`publishPlan` is the ONE publish decision**, shared by `submitMenuItem` and
  `submitAddDish` — two row-creating paths once carried the identical blind guard,
  and `renderUnlinkedPrompt` reads its `.unlinked` rather than computing its own.
  The duplicate guard matches by PLATE, so an unlinked row is invisible to it.
- **⚠️ `productRefs(pid)` checks BOTH paths** — ingredient→pid AND plate-line→pid.
  Deleting a product refuses if either hits. Don't "simplify" it.
- **⚠️ The absence of a back-pointer is not evidence that nothing was lost.** A
  dish once read as uncosted while its recipe sat unreferenced in the library,
  because only one direction was checked. **Look on the OTHER side too.**
- **localStorage is view preferences and derived caches ONLY** — twelve
  `cafeDB_*`/`cafeCost_*` keys. **If something new resists that classification,
  ask: there is no third category.**

**Outstanding, in priority order:**

1. **Phone sign-off on a long run of UX work, none of it device-verified.**
   Sharpest is the **cold-start penalty** — ~1,138 ms for the first request after
   idle against 79–152 ms warm, and week-long gaps are Max's NORMAL case. Does the
   boot gate read as honest or as broken? Does the offline message arrive when the
   signal drops? Does a refused product delete explain itself? Does the wait for
   the invoice referee read as progress rather than as a stuck app?
2. **⚠️ `logHistory` fires on only six of the twelve change paths**, so an
   ingredient repoint — the cheapest real intervention in the app — puts no point
   on the food-cost trend line. Pre-existing, not fixed; its own brief.
3. **⚠️ `ensurePlateForDish` gives an unlinked row a brand-new EMPTY plate.**
   Correct for a genuinely uncosted row; for one whose real recipe exists it
   leaves that recipe unreferenced. Needs a brief and Max's yes. Note **no path
   CREATES an unlinked row** — the class arrives only from history or a restore.
4. **`Ham Leg Sliced 2Mm (App 1Kg)` (`P0182`) is stored at $0.0003/g — 30 c/kg**,
   almost certainly out by ~46×. Not changed: prices are Max's call.
5. **`public.menus` has RLS DISABLED** — harmless today (every policy is
   `ALL / true / true`) but it flags in advisors and **matters at the multi-tenant
   gate**. **`public.kitchen_items` looks dead** — nothing reads or writes it.
   Both are schema changes needing Max's yes.
6. **Upgrade pdf.js past CVE-2024-4367** — mitigated with `isEvalSupported:false`,
   not fixed. Its own brief.
7. **Audit the older Playwright specs for MEANING, not for green** —
   `screenshots.spec.js` is capture-only, and four `fresh-states` setups build a
   plate through a door no user has.
8. **The restore's full-wipe step** — optional, ONLY on an explicit go with a
   fresh export taken minutes before. More useful: **none of the restore UI has
   been seen on a phone**; the iOS Safari file picker with a `.json` filter is the
   unknown.
9. Small, each needing a yes: `edDelArmed` is dead (written thrice, never read) ·
   **`ingredients.updated_at` is stale and means nothing — it is NOT history and
   must never be read as such** · the stale target-line comment in `trendChart` ·
   the `.chart-hint`/`.scope-note` pair · `.range-btn` is 32px (DEFERRED by Max
   31 Jul as an OPEN accessibility item, not dropped) · `avgFoodCostForScope`
   counts dishes whose `menuId` has no By-menu row.
10. Supplier coverage is 18% of used products — the concentration family stays
   silent by design until ~50%. And Max clears the six orphaned `"Document No:"`
   taught packs, then imports one Bidfood invoice to re-teach.

**Open, NOT bugs to fix on sight:** "Menu item" survives as a fifth noun in the
Edit-menu-item modal. `GET /api/parse-invoice?probe=1` is gone — only a key-free
`?health=1` remains, which never reports the key. Insights rules A–E and the
three-logs rule are unchanged; D and E probably belong above the snapshot line,
still needing Max's yes.
