# CLAUDE.md — EzPlate (Scoopys-Costing)

You are working on **EzPlate**, a plate/menu-costing PWA for a real café
("Scoopy's Family Cafe"). The owner is **Max** — hospitality background, new to
coding and to git. Real staff use this app on real phones every day, and price
data drives real menu decisions. Broken deploys cost money. Work accordingly.

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

## State as of 28 Jul 2026 (verify, don't trust)

**This section is a SNAPSHOT, not a log.** Overwrite it every batch — never
append. Appending took it 334 → 995 lines in nine days, until 68% of this file
was history nobody read and "Next up" was fifteen versions stale. Per-batch
history belongs in `handovers/`, nowhere else.

- **Version:** branch `test/insight-family-coverage` is at **v93** (unmerged),
  **stacked on `fix/insight-value-ranking` (v92), which is stacked on
  `fix/insight-families` (v91)**. Merge order: **v91 → v92 → v93**.
  `origin/main` is at **v90** (`d12d77f`, PR #29 merged 27 Jul 2026).
  Six spots agree. Local `main` goes stale between sessions (Max merges via GitHub PR) —
  **`git fetch` and check `origin/main` first**
  ([[verify-origin-main-before-trusting-local]]).
- **Suite:** `npm test` = **485 green**, jsdom smoke green (24 sections),
  `node -c` clean (`js/app.js`, `sw.js`, the four `api/*.js`).
- **Playwright:** 71 tests in `tests/visual/`. The 45 pre-v89 ones are **not
  reconciled since v72** — `fresh-states.spec.js` has known-stale pins (one,
  "v45 item 4: button copy", fails on unmodified `main`). The 26 in
  `v89-dash.spec.js`, `v90-dash.spec.js` and `v90-flows.spec.js` are green and
  pin behaviour, not screenshots. All three block `/api/*` as well as
  off-origin: there are no serverless functions behind `playwright test`, and
  the static dev server 501s on POST. **They are also the safe way to drive
  real flows here** — throwaway profile, Supabase never contacted, nothing
  written — which matters while there is still no staging environment.
- **Supabase:** the three v55 migrations are **applied to prod** (Max confirmed
  22 Jul 2026), as is v89's `20260727_price_history_menu_id.sql` (Max, 27 Jul).
  **v90's `20260727_menu_price_history.sql` (the `menu_price_history` table)
  is still awaiting Max's confirmation — check before deploying.** Unapplied,
  the app detects the missing table and keeps sell-price points local,
  silently. **v91 adds no migration.** Schema-can-lag governs FUTURE migrations
  too — apply before the deploy that reads them
  ([[supabase-schema-can-lag-app-code]]).
- **THREE history series, deliberately separate — don't merge them:**
  `priceHistory` is the all-menus average food cost ONLY (`dashComparisons`/
  `histInRange`/the 500-cap all assume one point per moment across the whole
  business); `menuHistory` is the same figure per menu (v89, `price_history.
  menu_id`); `menuPriceLog` is each plate's SELL PRICE over time (v90,
  `menu_price_history`). `menuHistory` and `menuPriceLog` share a shape, so
  `mergeMenuHistory` serves both. `dashScope` is session-only and is NOT
  `currentMenuId` (the Menu tab's own, persisted selection).
- **Insights live on the DASHBOARD only** (v90), scoped by `dashScope`. The
  Menu tab has no suggestions UI — the pill, panel and `.msug*` CSS are gone,
  which retires one of the five floating-layer placement owners the 26 Jul audit
  flagged (**four remain**). An insight must clear **`ruleA`**: two dimensions,
  or one whole-dataset aggregate. Rankings are by **cost efficiency only** —
  EzPlate has no sales volume, so nothing may imply profit or money lost.
  Reconstructed history goes through `ingPriceAt`/`costAtLines` against ONE
  reference moment, and requires `priced > 0` — a plate of fixed misc lines
  reconstructs perfectly and must never be read as observed history.
  **RULE D (v91): every family runs on every render.** No family may be gated on
  another's result or on the state of the menu; one with nothing to say returns
  `[]` and blocks nothing. The all-healthy line is not a family — it is what the
  panel says when the whole engine came back empty, and it may only claim "all
  clear" when nothing is over target as well. v90 gated the engine on the
  over-target count and shipped a panel saying "nothing needs attention" above a
  bar reporting costs creeping up. See `HANDOVER-v91.md`.
  **RULE E (v92): value is declared, and the floor is absolute.** Every family
  scores itself via `insightScore` against the ONE `INSIGHT_VALUE` table
  (non-obviousness × actionability × magnitude); `selectInsights` drops anything
  under `INSIGHT_FLOOR` **before** ranking, so a weak candidate never displays
  merely because nothing better fired. Three insights beat five padded ones. A
  family's own emit gate MUST clear the floor at the weakest input it accepts —
  a gate that admits what the floor refuses means nothing, and a test pins every
  family at its minimum. Nine families remain; `insRecentChange`/`insData`/
  `insBest` were deleted as unreachable bare counts, and `insPriceGap` became
  `insPriceAnomaly` (category is a supplier catalogue heading, NOT a
  substitutability class — it compared onions with spinach). See
  `HANDOVER-v92.md`.
- **`tests/insight-coverage.test.js` (v93) drives the REAL pipeline** —
  `computeInsights()` over seeded app state, one TRIGGER + one SILENCE fixture
  per family. It exists because `insights.test.js` hands each family its
  primitives ready-made, so the impure BUILDER was untested and a broken builder
  was indistinguishable from a quiet family. **Add a fixture pair here whenever
  you add or change a family**, and mutation-test it: deliberately break the
  builder and confirm the suite goes red. That check found a silence fixture
  passing on the wrong gate (see `HANDOVER-v93.md` §3).
- **THREE price-ish logs are written by DIFFERENT events — check the writer, not
  just the reader.** `priceHistory` is written by `logHistory()` on every
  data-changing event (including adding or repricing a plate, with no ingredient
  price change at all); `ingPriceLog` is written by `logIngPrice()` on an invoice
  apply **and** (v91) a hand-edited price in the builder; `menuPriceLog` by
  `logAllMenuPrices()`. Until v91 `logIngPrice` had ONE caller, so hand-edited
  prices moved the average and left no per-product point — which is why "Biggest
  movers" read empty while the comparison bar reported movement, and why insight
  family 1 had nothing to reconstruct. Any new "the app should notice X changed"
  feature: confirm every path that changes X actually writes the log it reads.
- **Third-party scripts:** supabase-js **2.110.8**, pdfjs-dist **3.11.174** —
  pinned, SRI-checked except the pdf.js worker (hard rule 4).

**Outstanding, in priority order:**

1. **Phone sign-off on v82–v93** — twelve batches, none device-verified; their
   "needs Max's phone" lists are the backlog. v87's iOS Safari scroll-lock
   check is sharpest: `position:fixed` on `<body>` is what no desktop can model.
   v90/v91's sharpest question isn't visual: **do the insights pass the "so what"
   test on Max's real menu?** Only he can answer that — and v91/v92 change what
   the panel shows: the warm all-healthy line is exclusive (v91), and v92 drops
   the panel from five lines to three real ones on his own data. Both are tone
   calls worth his eyes.
2. **Upgrade pdf.js to 4.2.67+.** 3.11.174 carries **CVE-2024-4367** (malicious
   PDF → arbitrary JS); mitigated v88 via `isEvalSupported:false`, NOT fixed.
   Supplier PDFs are untrusted input. A 3→4 jump needs its own brief.
3. **The 26 Jul audit's remaining findings**, sequenced separately: `pushWrite`
   drops writes silently offline (v40, still real), the swallowed
   `price_history` error, staging, dead code, structural fixes.
4. **Reconcile the Playwright/visual suite** on the browser that now exists.
5. **The menu-aware chart and By-menu sparklines** — still blocked on per-menu
   history, which started accumulating at v89. Don't schedule until there are
   points to draw.
6. Optional: purchased-quantity capture for v55 §I — protected-region edit, so
   Max's explicit yes first.
7. Small, each needing a yes: `priceHistory` still replaces wholesale on sync
   (the offline-drop gap the other two logs avoid); `.range-btn` is 32px, not
   44px (since v46); the stale v60 target-line comment in `trendChart`. See
   `HANDOVER-v90.md`.
8. **Rules D and E probably belong ABOVE the "State as of" line** (they are
   durable engine laws, not snapshot facts) — recorded in the snapshot for now
   because moving them needs Max's yes. Same question for the three-logs rule.
9. **Supplier coverage is 18% of used products** (8 of 44 in the 16 Jul backup),
   so the concentration family stays silent by design. Not a bug — but if Max
   wants that insight, the supplier field needs filling in past 50%.

**Open, NOT bugs to fix on sight:** "Menu item" survives as a fifth noun in the
Edit-menu-item modal (its own brief); `GET /api/parse-invoice?probe=1` must be
**gated or removed before multi-tenant**. Per-batch detail lives in
`handovers/HANDOVER-vNN.md`; its README records the gaps in that history.
