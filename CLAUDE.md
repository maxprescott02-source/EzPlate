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
tracking, no external libraries, no build step — hard product constraints.

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
4. **No new dependencies, no analytics, no build step, no scope creep.** If you
   spot extra work worth doing, list it for Max — don't build it.
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
- There is no browser here. Anything about *feel* (touch targets, spacing,
  animation, keyboard, PTR) goes on a "needs Max's phone" list in your
  handover — never claim it verified.

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

## State as of 22 Jul 2026 (verify, don't trust)

- `origin/main` is at **v71** — PR #16 (`feature/suggestions-refine`, v71) is now MERGED (`1baeddb`).
  One unmerged branch carries the next batch: **`feature/animation-system`** (**v72**), off `main`,
  awaiting Max's phone sign-off then merge. NOTE: local `main` goes stale between sessions (Max merges via
  GitHub PR) — `git fetch` and check `origin/main` first ([[verify-origin-main-before-trusting-local]]).
  **The three v55 Supabase migrations are APPLIED to prod (Max, confirmed 22 Jul 2026)** — the v54+ line is
  live; the schema-can-lag lesson still stands for FUTURE migrations ([[supabase-schema-can-lag-app-code]]).
  `npm test` = **271 green** (unchanged in v72 — a presentation-only batch), jsdom smoke green (incl. a new
  [18] v72 modal close-out section), `node -c` clean (app.js, sw.js + the four `api/*.js`), six spots at
  **v72**. Per-batch detail lives in `handovers/HANDOVER-vNN.md`. **fresh-states.spec.js NOT re-run for v72**
  (no browser) — markup is unchanged but motion timing can only be judged on a device; reconcile on a browser env.

- **v72 (branch `feature/animation-system`) — Animation system: make it feel finished (brief:
  `~/Downloads/ezplate-opus-animation-system.md`). See `handovers/HANDOVER-v72.md`.** A SYSTEM pass (not
  sprinkle-effects) — the app already had ~70% of a motion system; this formalised it + added two signature
  moments. **CSS + one central JS wiring change + one smoke section only;** zero contact with the protected
  region, money law, naming inversion, data model, or invoice-review render/row-state (the only invoice CSS is
  a transition on the existing `.cand-chip` `.sel` state — motion on an existing state change). No new deps.
  (1) **Motion tokens formalised** (`css :root`): kept `--ease`/`--t-fast`/`--t-med` (NOT renamed to `--motion-*`
  — churn for nothing, and ~40 call sites), **added** `--t-slow:.3s`, `--ease-in-out`, and `--ease-spring`
  (the one overshoot), documented in a comment block; no ad-hoc durations/easings elsewhere. (2) **Applied
  consistently:** modal open→`--t-slow`; **modal CLOSE now reverses** (fade+scale) via one central mechanism;
  tab-switch `tabIn` settle on the five `#tab-*`; ONE shared card/row press (`:active{scale(.985)}` on
  `.ing-card`/`.hl-card`, .96 on chips) + token transitions on `.mi-row`/`.pchip`/`.mlf-chip`/`.cand-chip`; the
  invoice "AI checking→checked" note eases its colour. (3) **Two signature moments:** the **Gemini panel
  spring-expand** (`msugPop`→`--ease-spring`, the app's AI surface — the one place to spend boldness) and the
  **invoice-import corner-toast** springing up with a green ✓ that lands after (routed through the already-shown
  corner-toast, NOT the fragile review markup). **Modal close is centralised** in `openOverlay`/`closeOverlay`
  (`show`/`hide`/`openModal`/`closeModal` route through them): `.open` drops SYNCHRONOUSLY (so every `.open`
  check + the 4 existing smoke close-assertions stay honest — that's why the suite needed zero edits) while a
  separate `.closing` class re-asserts display and runs the fade-out for 320ms; reopen cancels it; reduced-motion
  (JS `matchMedia`) + the pre-existing global CSS killswitch both close instantly. All added keyframes animate
  **transform/opacity only**. 271 tests unchanged; smoke +[18]; six spots → **v72**. **Needs Max's phone:**
  modal open/close, tab switches, the Gemini panel expand, card taps, the Confirm-All corner-toast+✓, and the
  AI-note easing — all at 380px both themes, then re-tested with OS reduced-motion ON confirming motion drops out.

- **v71 (branch `feature/suggestions-refine`) — Suggestions refinement: point, don't prescribe · remembered
  packs → Settings · dismissable Gemini FAB · builder gap (brief: `~/Downloads/ezplate-opus-suggestions-refine.md`).
  See `handovers/HANDOVER-v71.md`.** Client + one server prompt + tests; zero contact with the protected region,
  money law, naming inversion, data model. (1) **Insight engine now POINTS, never PRESCRIBES:** the substitution
  insight is REMOVED (`insSub` + `subCandidate` gone — the cost engine can't know two products are culinarily
  interchangeable, Max's call); `insReprice`/`insNearMiss` drop the target-price directive ("worth a rework",
  "a small tweak"); `insPortion` → "costly dominant ingredient" (no prescribed trim/saving, `top` is just
  `{name,share}`); `insTargetPrice` removed. `insReprice` threshold `pts>=1`→`>=2` (1 pt is `insNearMiss`'s).
  (2) **Tone** (`api/_insight.js` prompt): a consultant who knows THIS café — never defaults to "charge more"
  (reprints cost Max money); numbers still validated/discarded, offline→templates. (3) **Count scales with menu
  size:** 1 dish→≤1, 2–5→≤2, 6+→≤3, never padded. (4) **All-healthy → ONE warm seed-varied line** (`healthyLine`).
  (5) **Remembered packs moved OUT of the invoice modal into Settings** (`#setSmemOpen`, next to Tidy lists) and
  made **read-only** (view + Remove; the inline qty edit is gone — a taught pack is ground truth, correct it by
  Remove-then-re-teach). Teaching flow + precedence UNCHANGED. (6) **Gemini FAB is dismissable + recallable:**
  swipe-right (gesture scoped to the button, doesn't fight scroll) or a "Hide the suggestions button" link in the
  panel foot dismisses it to a **slim rainbow edge tab** (`.msug-restore`, never lost); tap restores. State is
  **GLOBAL**, persisted (`cafeDB_suggestFabHidden` + `dbSetSetting('suggest_fab_hidden')`, read in `bootstrapSync`)
  — a per-menu flag would flicker on menu switch. (7) **Builder Name↔Category gap** tightened — three stacked
  spacing sources (name `.pad` bottom + empty `.plate-tools` margin + `.plate-cat-field` top ≈ 56px) collapsed to
  one ~20px field step (token-only, heading + Save untouched). `insights.test.js` rewritten to the
  point-not-prescribe contract (35→32; pinned-contract change noted), smoke +v71 dismiss/restore/persist. 274→271.
  Six spots → **v71**. **Needs Max's phone:** varied non-prescriptive advice across menu sizes + all-healthy warm
  line both themes; the FAB swipe-away/edge-tab restore/persist at 380px; remembered packs in Settings; the
  builder gap.

- **v69 (branch `feature/suggestions-fab`) — Suggestions rainbow FAB · richer non-reprice advice · misc name
  field back · invoice-header mobile stacking (brief: `~/Downloads/ezplate-opus-suggestions-fab.md`). See
  `handovers/HANDOVER-v69.md`.** Client/CSS/tests only, branch-safe. (1) **Menu Suggestions moved off the inline
  slot into an on-demand floating panel** behind a persistent **bottom-RIGHT** button (Max, moved from left) —
  the EzPlate logo in a Gemini rainbow gradient (`#menuSuggestFab`/`#menuSuggestPanel`/`#menuSuggestBtn`,
  `.msug*` CSS). Same content system (`renderMenuInsights` toggles the FAB `[hidden]` by whether the menu has
  anything to say; the "Refined by Gemini" credit lives in the panel); tap/×/outside-click/Escape close;
  reflects the selected menu; clears the bottom nav (mobile) / content column (desktop). Panel title always
  **"What stands out on this menu"** (no menu name, no eyebrow). (2) **Suggestions broadened beyond reprice** —
  three new pure/tested types: `insPortion` (trim the costliest portion, no price change), `insSub` (a cheaper
  **same-ingredient** product), `insCut` (≥ `CUT_PTS`=12 over → rework/drop). **Reprice DEMOTED to last-resort**:
  now only `[1,CUT_PTS)` pts, score dropped below the cheaper levers, copy softened. **Substitution is SAFE
  (Max caught Bacon→Ham):** `insSub` uses `subCandidate` — matches only the SAME ingredient (finest grain first:
  `sub_category`, else `item_type`; **never** the coarse `category`) + a shared-leading-noun net; fails closed.
  (3) **"Reprice" → "Rework"** on the margin-light chip + Menu strapline; reprice copy softened. (4) **Misc line
  name field RESTORED (reverses v60):** editable `.misc-name` back in the `.nm` slot wired to `setMiscLabel`,
  placeholder "Misc"; v67 two-row skeleton kept; label round-trips. (5) **Invoice import HEADER mobile stacking
  only** (`@media max-width:700px`); desktop byte-identical; **fragile invoice review area untouched**.
  **Insights CACHED per menu per period (1 day) then rotate** — `insightSeedFor(menuId)` (period + menu hash)
  seeds a stable-then-rotating selection; `gemPhraseInsights` reads/writes a localStorage cache
  (`cafeDB_insightCache`) so reloads within a period don't re-hit Gemini (saves quota); a price change (new sig)
  forces a fresh call. 261→**274** (`insights.test.js` +9 types, +4 `subCandidate`; smoke §16 extended for the
  FAB + the "no second Gemini call on re-render" cache check). Six spots → **v69**. **Builder flow reordered
  (Max): Add ingredients → Name & save (name → category → Save)** — `#docketPanel` first, `#platePanel` second;
  misc name field restyled to read as a clean editable label (bold text + underline, not a boxy input);
  Suggestions panel got focus management (CodeRabbit). `fresh-states.spec.js` misc
  pins updated to `.misc-name` + two-row but NOT runnable to green in-env (dies earlier at the builder-modal
  screenshot — pre-existing) — full reconciliation still deferred. **Needs Max's phone: the FAB+panel at 380px
  both themes bottom-right (no nav overlap), varied SAFE non-reprice advice, misc name field, invoice header
  stacking.**

- **v68 (branch `fix/visual-consistency-pass`) — Menu light-chip filter · Suggestions title + honest AI
  credit · whole-site grid-snap (brief: `~/Downloads/ezplate-opus-visual-consistency_1.md`). See
  `handovers/HANDOVER-v68.md`.** (1) **Menu tab margin-light filter** — multi-select tappable chips
  (Healthy/Watch/Reprice = green/amber/red, reusing the `.dot` key so they double as the legend); pure
  `lightFilterPass(active,light)` (tested: red-only / amber+red / cleared) filters `renderAnalysis`'s
  precomputed per-dish `analyze()`; folds into `clearMenuFilters`. (2) **Suggestions** retitled
  `.mi-intro` → **"What stands out on {menu}"**; **honest attribution** — a muted "Refined by Gemini" corner
  credit (`.mi-credit`) revealed ONLY when Gemini actually phrased a shown line (`gemPhraseInsights` tracks
  `refined`, `applyPhrasedInsights` reveals; template-only → nothing). (3) **Whole-site grid-snap** (Max
  chose the full scope over targeted): spacing/type ONLY, snapped ~96 non-invoice off-scale values to the
  `--sp`/`--fs` scale (`gap:10px`→sp-2/sp-3, `6px`→sp-2, `font-size:14px`→fs-base/fs-sm, `font-weight:650`
  →700, rem→tokens, card padding→12×16), applied as a count-asserted replacement manifest (91/91 one-for-one
  swap, zero structural diff). **Invoice review area, control paddings, touch targets, heading tier, legacy
  pricing section deliberately excluded.** The Suggestions-crowds-the-target-line trigger fixed by reordering
  the card above that line + a clear section gap. 256→261 (`menu-light-filter.test.js` +5; smoke §16 retitle
  +credit, §17 chips). Six spots → **v68**. **This is a v31-shaped app-wide density change — needs Max's
  phone across every tab/modal both themes before merge.**

- **v67 (branch `fix/builder-invoice-suggestions`) — builder polish · invoice header · Suggestions → Menu
  tab + broadened (brief: `~/Downloads/ezplate-opus-builder-invoice-suggestions.md`). See
  `handovers/HANDOVER-v67.md`.** (1) Plate **category field moved to the BOTTOM** of the builder flow (just
  above Save) — ids/handlers unchanged, combo binds by id in `openBuilder`. (2) Builder top section spacing
  evened on the `--sp` scale. (3) **Misc line rebuilt as a SIBLING of the ingredient line** — reuses the
  two-row `.line` skeleton (`.top` = "Misc cost" + ×, `.costs` = leader + `$` in the ingredient total slot);
  the whole accumulated single-row misc CSS pile (`.misc-label`/`.misc-fixed`) was removed. (4) **Invoice
  header de-intimidated** — the raw-text paste box + CSV hint COLLAPSED behind an "or paste text manually"
  link (`#invManualBox`/`setInvManual`; re-collapses on open; upload still fills it hidden), and the
  `.inv-gst` GST note QUIETED to a muted line. Nothing deleted. (5) **AI "Suggestions" MOVED off the
  Dashboard onto the Menu tab** (`#menuInsights`/`renderMenuInsights`, scoped to `currentMenuId`, below the
  dish table) and **BROADENED** from one shape into one pure-tested function per TYPE (`insReprice`,
  `insNearMiss`, `insVolatility`, `insShared`, `insMover`, `insBest`, `insSummary`) + `selectInsights`
  (rank by notability, ≤1 per kind, rotate the near-top group by a per-menu/day seed → most-relevant 2–3).
  Volatility + biggest-mover are now feasible off the **v66 per-ingredient price log**
  (`ingPriceLog`/`ingPriceBand`/`costRangeForLines`) — v63 had dropped both for lack of data. Money law
  intact (app computes every number; `api/_insight.js` unchanged except a tone tweak). `tests/insights.test.js`
  rewritten 8→22 (pinned-contract change, noted), `_extract.js` exposes the nine new fns, smoke §16 rewritten
  to the Menu tab. 242→256. Six spots → **v67**.

- **v66 (same branch) — the AI NO LONGER OVERRULES the parser's price (Max: "hallucinating prices, parser
  readings overruled").** Once the API went live (v64), the v62 price rules that ADOPTED Gemini's reading on
  disagreement (rule 3 closest-to-history, rule 4 adopt-G) started replacing correct parser prices with
  Gemini's misreads. Fixed to honour "money stays deterministic": `gemMergeLine` now NEVER writes Gemini's
  price when the parser already has one. Rule 2 (agreement) silent as before; when they disagree it only
  **flags** ("check price", new `gemPriceReview` → `st-review`, price left untouched) and ONLY when price
  history independently shows the parser out of band while Gemini is in (rule 3, action `'flag'`); otherwise
  the parser stands silently (rule 7). Rule 4 adopt survives ONLY for the parser-had-NO-price case (filling a
  blank, nothing to overrule). Flag clears when the human edits the price or changes the match. 242 tests
  (merge + smoke §15b rewritten to pin "flag, never overrule"). Six spots → **v66**.

- **v65 (same branch) — WIDENED the AI wrong-match detection (Max's call: catch more mismatches).**
  `gemMatchSuspect` was DECOUPLED from the parser's own confidence. The old rule needed Gemini's pick to
  beat `localCov+0.15`, so a wrong match the parser was SURE about (the common case) never flagged. Now the
  only comparison is how the parser's product ranks against Gemini's OWN description (`localInAi`): if Gemini
  clearly prefers a different, real match (coverage ≥0.45, margin ≥0.15) it flags "check match" however
  confident the parser was; a thinner name match (≥0.3) still needs price-history corroboration; a near-tie
  is still treated as ambiguity (margin guard). Still NEVER auto-applies — always a human tick. 239→242 tests.
  Six spots → **v65**. NOTE: still only flags rows where Gemini's line key-matches the parser row (shared
  raw text); rows Gemini reads with very different text than the parser aren't evaluated — a possible next
  widening if needed.

- **v64 hotfix (same branch) — two v63 integration bugs Max caught testing the preview.** (1) **Uploaded
  PDF invoices never fired the second reader:** `handleInvFile`'s PDF branch calls `buildInvRows` directly,
  bypassing `parseInvoice`, so `gemStatus`/`gemFireSecondReader` never ran (no note, no AI) — and uploading
  is how Max actually imports. Now the PDF branch stamps the status + fires the reader like `parseInvoice`.
  (2) **The Dashboard "Suggestions" card found nothing:** `computeInsights` used the legacy `sp.menuId`
  map, but v55 moved the canonical link to `menu_items.plate_id`; it now resolves via `plateForMenuItem(m)`
  like the rest of the dashboard. **Lesson: a passing `/api/…?health=1` proves only the serverless FUNCTION +
  key are live — NOT the client bundle or its wiring; both these features are client-side.** (3) **Gemini
  returned no line items:** once the key was valid, calls still came back `bad-shape` — `responseSchema`
  didn't mark `lines` required, so `gemini-3.1-flash-lite` emitted `{supplier}` and omitted the array. Fix:
  `responseSchema()` now sets `required:['lines']` (+per-line `rawText`/`derivedUnitPrice`) and both handlers
  pass `thinkingConfig:{thinkingBudget:0}`. **A diagnostic `GET /api/parse-invoice?probe=1[&text=…]` (real
  model calls, behind preview SSO) was added — GATE OR REMOVE before multi-tenant.** All server-only (no bump).
  See HANDOVER-v63 top.

- **v63 shipped — Gemini reader v2: status fix + match suggestions + first Dashboard insight (brief:
  `~/Downloads/ezplate-opus-gemini-reader-v2.md`). See `handovers/HANDOVER-v63.md`.** Same branch as v62,
  same invariants (parser is backbone, protected region untouched, money deterministic, taught outranks
  all, key server-only). **(1) Status flicker guard:** the "AI double-checking…" note wasn't the bug —
  production simply had no `/api/parse-invoice` (PR unmerged) so it 404'd → silent unavailable; added
  `gemSettle`/`GEM_MIN_VISIBLE` (900ms floor via `gemCheckStart`) so a fast/failed result can't flip the
  note before it's read. **(2) Suspected wrong match** (`gemMatchSuspect`, pure/tested): when Gemini's
  `description` points at a DIFFERENT catalog product than the parser's `bestId` (strong token margin OR
  price-history corroboration), flag the row **"check match"** (`gemMatchReview` → `st-review`, unticked),
  rank the AI product first in the existing MATCH-TO chips with an "AI suggested" marker (`.cc-ai`, shares
  the `.ni-af`/`.ai-sug` metrics), and SKIP the price merge — it never changes `bestId`, the human ticks.
  Suppresses a co-incident "price change" flag (the mis-match explains the gap). **(3) First AI helper =
  grounded Dashboard "Suggestions"**, NOT a chatbot: `deriveInsights` (pure/tested) computes 1–3 plate-vs-
  target observations (worst over-target dish + target price, count over/under) — **the app computes every
  number, the AI only rephrases**. Optional `api/insight.js`+`api/_insight.js` warmer phrasing validates
  that NO number the app didn't compute appears (`validatePhrasing`), else the deterministic template
  stands; offline/unavailable → templates render. One phrasing call per dashboard load, session-cached.
  **Data note:** no per-ingredient price history exists (`priceHistory` is aggregate-only), so the brief's
  "biggest ingredient price mover" insight was dropped. 215→239 tests (+8 match +8 insights +8 api-insight),
  jsdom smoke §16. **Follow-up:** same preview/phone list PLUS the check-match row + the Dashboard insight
  card (API on AND off) at 380px both themes — see HANDOVER-v63 §"Needs Max's phone".

- **v62 shipped — Gemini dual-reader / AI second reader on invoice import (brief:
  `~/Downloads/ezplate-opus-gemini-dual-reader.md`). See `handovers/HANDOVER-v62.md`.** Wraps the
  existing parser + review flow with a second reader; **zero contact with the protected region**;
  every path degrades to today's app exactly when the AI/network is absent. **FIRST server-side code
  in the repo:** `api/parse-invoice.js` (Vercel zero-config Node — no build step) + `api/_gemini.js`
  (underscore = not a route; pure, testable prompt/validation logic). Gemini key lives ONLY in Vercel
  env (`GEMINI_API_KEY`); model default `gemini-3.1-flash-lite`, overridable via `GEMINI_MODEL`;
  health check `GET /api/parse-invoice?health=1`. Client: `parseInvoice` renders Reader 1 immediately
  then fires ONE background request; `gemMergeLine` (pure, extracted, tested) + `gemApplyReadings`
  reconcile per line. **Rules:** T > P≈G (silent) > history-referee within **±50% band** (`GEM_BAND`,
  silent) > adopt-G flagged review (rule 4) > append G-only add-new lines (rule 5) > parser stands
  (rule 6). Late/stale responses and applied imports are discarded (`gemToken`/`gemApplied`) — human
  ruling is final. `invRowState` gained a `gemReview` clause (auto-tick stays pinned to `matched`).
  **AI-suggested chip = the existing `.ni-af` system, second label** ("AI suggested" vs "auto-filled")
  — `niLab(t,src)` + a shared `.ni-af,.ai-sug` CSS rule so metrics can't drift; inline-flow so it
  can't overlap a wrapping label. Summary gains a muted status note (checking → checked/unavailable).
  Untrusted invoice text + model output — fenced prompt, strict schema validation → clean
  "unavailable" over partial garbage. 190→215 tests (11 schema + 14 merge) + jsdom smoke §15.
  **Two follow-ups for Max:** (a) preview phone-check list incl. the chip at 380px both themes
  (HANDOVER §"Needs Max's phone"); (b) a proposed CLAUDE.md addition (first-server-code + the
  free-tier **privacy gate before multi-tenant invoices**) awaiting his yes — NOT added silently.

- **v61 shipped — UI fixes before the Gemini batch (brief: `~/Downloads/ezplate-opus-ui-fixes-pre-gemini.md`).
  See `handovers/HANDOVER-v61.md`.** (1) Builder qty 4-digit clipping = **VISUAL only, NOT a data bug**
  (`type=number`, no maxlength, `setQty` stores `parseFloat` untruncated) — hid the native spinners
  (`.qtybox input`, the `.invPackQty` pattern) + widened `66px`→`76px`; regression tests round-trip a
  4- and 5-digit qty. (2) `openBuilder` resets the scroller (overlay + `.mbody`) so the popup opens at
  the top (New AND Edit). (3) Ingredients search stray indent ROOT CAUSE: an extra `.king-search` class
  added `margin var(--sp-5)` Products' `.menu-search` doesn't — dropped the class + dead CSS. (4) **"Set
  up from products" is a MODAL now** (`#kingWizModal`, `.modal-wiz`, full-screen at ≤560px like the
  builder); `renderKingWizard` show/hides it; `closeKingWizard()` is the single close path (×/backdrop/
  Escape all route through it, keeping `kingWizOpen` in sync); the old search-hides-wizard coupling is
  gone; `.modal-wiz .mbody{padding:0}` keeps the rows full-bleed. (5) Delete-plate button = **already
  unified** (the app's only two `.btn.danger` share identical classes; v60's `@media(hover:none)` covers
  both) — **Max: verify-only, no change**. (6) **Dashboard edge annotation DELETED** — when the target is
  outside the data-fit domain, nothing draws (no marker/arrow); `targetInView` still gates the dashed
  line, which still lands on its labelled tick when shown. **This SUPERSEDES the edge-annotation half of
  v60's item-1b rule; `tcTicks`/`trend-ticks` unchanged.** (7) Builder search "sometimes dead" ROOT CAUSE:
  the `#qClear` × set an **inline `display:none`** on `#drop` that permanently beat `.drop.open` (dead
  till reload, survived close/reopen) — the × now calls `closeDrop()` (class-only) + `renderDrop` clears
  any inline display; 3 regression tests reproduce the clear-then-search path. 185→190 tests.

- **v60 shipped — UX pass (brief: `~/Downloads/ezplate-opus-ux-pass.md`). See
  `handovers/HANDOVER-v60.md`.** (1a) Dashboard staleness ROOT CAUSE: `logHistory` returned early on
  a deduped point *before* the re-render, and plate save never called it — now the dedup guards only
  the point push, the re-render always runs when the dashboard is visible, and `saveCurrentPlate`
  calls `logHistory`. (1b) The trend y-domain now **fits the data** (`niceStep`/`niceTicks`, min ~5-pt
  span); the target line shows only when in view (or within one tick, `targetInView`) — else a "target
  NN% ↑/↓" edge annotation. **This supersedes v48's always-include-target DOMAIN rule; `tcTicks` is
  unchanged** (its target-on-a-tick contract still governs the shown case, still pinned by
  `trend-ticks`). New `trend-domain.test.js` (7). (2) Misc line has NO name field — fixed "Misc"
  label · leader · `$` · × (leader now grows so × is flush-right). (3) `printDocketFor(name,lines)`
  shared by the builder Print button + a new plate-popup "Print docket" (`#paPrint`). (4) builder qty
  starts EMPTY (`defaultQty`→null, blank field) and `saveCurrentPlate` requires a positive quantity on
  every ingredient line (revised from the brief's "default 0" at Max's request). (5) tab switch scrolls to top; Delete red hover-fill gated behind `@media(hover:none)` (it
  stuck on tap); builder category label + product pack-help copy. (6) search-× sweep — added to
  `king_prod` + `ad_search` via shared `wireSearchClear`; value comboboxes stay ×-free. (7) Menu
  controls are a column at all widths = Products parity (dropped the ≥640px row-switch; zeroed nested
  `.ing-controls` padding). (8) **Tidy lists is a MODAL now** (`#tidyManageModal`) — Settings keeps one
  row (`#setTidyOpen`); each category/supplier filter has a "✎ Manage list…" door (`data-tidy-field`)
  handled by a **document capture-phase change listener** (beats the filter's own render, which
  rebuilds the `<select>`). 174→185 tests.

- **v59 shipped — Parity pass (brief: `~/Downloads/ezplate-opus-parity-pass.md`). See
  `handovers/HANDOVER-v59.md`.** (1) builder #q no longer creates ingredients (Ingredients tab
  only). (2) modal combobox dropdowns escape the `.mbody` overflow clip via `anchorDrop`
  (position:fixed to the input) — ROOT CAUSE fixed; one sweep covers `makeInlineCombo` + the king
  product search. (3) Menu traffic-light key legend removed (`.akey` gone; row dots stay). (4) Menu
  controls now match Products: search + category filter (`#menuCatFilter`, by dish section) +
  Clear filters on their own row. (5) ONE shared token matcher `searchTokens`/`matchTokens` — every
  search bar is token-order-independent ("gluten free bread" ↔ "Bread Gluten Free"); **the old
  `subseq` fuzzy fallback was dropped (Max approved)**. (6a) ingredient category is DERIVED live
  from the linked product (`kingCategory`) — chip on cards, category filter on the Ingredients tab,
  read-only in the edit modal. (6b) **Tidy-lists Settings UI finally built** on the v40 core
  (`tidyValuesCombined`/`tidyPlanAll`): Category/Brand/Supplier pickers, counts, Rename/Merge/Clear
  behind one blast-radius confirm, applied via `overrides`→`dbPushIngredient` + `dbPushPlate` +
  supplier-memory migration; **the Category picker spans product AND plate categories** (Max's
  call). 164→174 tests.

- **v58 shipped — empty states unified into ONE system (brief:
  `~/Downloads/ezplate-opus-empty-states.md`). See `handovers/HANDOVER-v58.md`.** All four tabs'
  empty states now build through the shared helpers in `js/app.js` (~line 920): `emptyStateHtml`
  (variant B, true-empty) and `emptySearchState` (variant A, search/filter-empty, the ONE shared
  action label "Clear search & filters"). The marker class `es-built` is emitted only there
  (route-through test asserts it). Four global clear fns (`clearProductFilters` / `Ingredient` /
  `Plate` / `Menu`) are shared by the empty-state action AND the header "Clear filters" buttons.
  `ICON_MENU_BIG` added. All inline variants deleted (`an-empty ing-empty`, bare `.empty` "No
  ingredients match", v56 `.plate-noresult`, the `.an-empty-box`/`anClearSearch` menu markup).
  Menu's empty state is a `.empty-state` in `<tr class="es-row">`. New `tests/empty-states.test.js`
  (7); 150→157.

- **v57 shipped — Plates icon changed to a fork + knife (Max's request). See
  `handovers/HANDOVER-v57.md`.** The plate glyph (two concentric circles) became a hand-authored
  fork + knife line icon, updated in all four spots that share it (nav tab, `ICON_PLATE_BIG`,
  `#lines .empty::before`, `.plate-noresult::before`) so the tab and its empty states stay
  consistent. No logic change; 150 tests unchanged.

- **v56 shipped — Plates polish batch (brief: `~/Downloads/ezplate-opus-plates-polish.md`).
  See `handovers/HANDOVER-v56.md`.** All four items are markup/CSS/copy — no logic or
  data-model change; 150 tests unchanged.
  - **1:** the plate glyph now propagates to the two empty states that missed it — the builder
    docket empty (`#lines .empty::before`, was the clipboard) and the Plates search-empty (was
    the inherited Products cube; a new `.plate-noresult` class overrides just the mask-image,
    Products untouched). Plates search-empty gains a "Clear filters" `.linklike` affordance
    (`#plateEmptyClear`) matching the Menu tab.
  - **2:** builder popup reordered to one top-to-bottom flow — new top panel `#platePanel`
    ("The plate", name + category), then the Add-ingredient search integrated into the top of
    `#docketPanel` (its `<h2>` is now "Add ingredient"). Markup relocated only; every id/handler
    unchanged; the old `.search-card` wrapper is gone.
  - **3:** dashboard "How today's average compares" — `.stat-lead`/`.stat-line` left offset
    2px→0 so the block shares the chart's x0 (title/axis/caption).
  - **4:** misc-cost line is now `name · dotted leader · $ input · ×` — the duplicate bold
    total (`.lc`) is gone, the `$` input IS the total. `setMiscCost`'s `lc-`+uid lookup is a
    guarded no-op for misc lines now. `fresh-states.spec.js` misc pins updated deliberately
    (not run — no browser). **`npm run shots` needed** (builder/misc/plates shots stale).

- **v55 shipped — Plates completion + bug batch (brief:
  `~/Downloads/ezplate-opus-plates-completion.md`). See `handovers/HANDOVER-v55.md`.**
  - **A (LEAD): many-to-many publishing.** A plate can be on ANY number of menus, each
    entry its own price/category. Canonical link is now **`menu_items.plate_id → plates.id`**
    (migration + backfill); `plates.menu_id` and `source_plate_id` are legacy (source_plate_id
    mirrored on write for rollout). **THE FK FLIPPED** — the DISH references the plate, so the
    dish write sequences AFTER the plate (`dbPushMenuAfterPlate`; `dbPushPlateAfterMenu`
    removed). Resolution goes through `plateIdOf`/`plateForMenuItem`/`dishesOfPlate`/
    `menusOfPlate`/`ensurePlateForDish` — never poke raw fields. Card popup → **Manage menus**
    (`#manageMenusModal`). Menu delete removes only that menu's entries; plates survive.
  - **B:** every dish gets an (empty) plate (migration); an empty plate reads "not costed yet".
  - **J:** `plates.category` (migration) + a builder category combo + Plates category filter.
  - **C (bug):** removed the stale `#tab-builder{display:grid…}` two-column rule that squeezed
    the Plates grid to ~400px on desktop — now full-width like Products.
  - **D/E/F/G/H:** removed Menu "→ Builder" chip + plate glyph; price-jump flag compares at the
    cent (`flagNeedsAttention`); invoice auto-fill chip keys off a JS `.af` mark not
    `:placeholder-shown`, Kitchen field starts blank; builder search matches linked product
    text (`kitchenSearchMatches`→`kingSearchFilter`); repoint parks the old product in wizard
    skips (`parkRepointedProduct`).
  - **I (protected region):** `packCount("6x8's")`=6 not 48 (the shorthand regex drops the
    single-digit "8's"); root causes are INSIDE the protected parser and the purchased-quantity
    column is never captured. Fix (Max's call, OUTSIDE the region): `normPackNotation` rewrites
    `N x M's`→`(N*M)'s` on the raw text. **Limitation:** fixes the per-pack count only, NOT
    purchased-quantity — a line priced at its total across packs still needs the taught-pack
    flow. Details + exact locations in HANDOVER-v55 §I.
  - **Tests (150):** `plates-independence`/`menu-plate-order` rewritten; new `inv-priceflag`,
    `builder-search`, `wizard-repoint`, `inv-packnorm`. **Playwright NOT run (no browser)** —
    `screenshots`/`layout-consistency` updated; **`fresh-states.spec.js` still has v54/v55-stale
    tests** to fix on a browser env (HANDOVER-v55 §K lists them).

- **v54 shipped — Plates independence (see `handovers/HANDOVER-v54.md`):** the Builder tab
  became the Plates library card grid + a builder popup; the holding area was removed; menu
  delete unlinks plates; zero menus legitimate; product unit type create-only; tab order
  Dashboard/Products/Ingredients/Plates/Menu. **v55's §A supersedes v54's single-menu popup.**
  CLAUDE.md "What the app does" §3 + hard rule 7 were updated to v54 with Max's approval.

- **CLAUDE.md hard rule 6 + the v40 fragile-area sequencing note updated with Max's approval
  (v55):** the plate↔dish link is now **`menu_items.plate_id → plates.id` (many-to-many)**;
  `plates.menu_id`/`source_plate_id` are legacy and the FK sequencing FLIPPED — publishing
  sequences the dish after the plate (`dbPushMenuAfterPlate`); the old `plates_menu_id_fkey` /
  `dbPushPlateAfterMenu` are gone.

- **Older-batch context (details in the named handovers):** invoice new-item form persists via
  `invRows[i].newItem` snapshot/rehydrate (v50, FRAGILE — now also carries `edited` for the §F1
  auto-fill mark); chart is a hand-rolled monotone cubic (`tcTicks`/`tcTangents`/`tcPath`);
  v49 panel skeleton (`layout-consistency.spec.js`); **v43 lesson — any `dbPush*` naming a
  column the live DB lacks fails wholesale; apply any NEW migration to prod BEFORE the deploy that reads
  it** (the v55 migrations themselves are already applied — see [[supabase-schema-can-lag-app-code]]).

- Next up: (a) Max's phone sign-off on v72's motion (then merge) — modal open/close, tab switches, the Gemini
  panel spring-expand, card taps, the Confirm-All corner-toast+✓, the AI-note easing, all at 380px both themes,
  then re-tested with OS reduced-motion ON; (b) reconcile `fresh-states.spec.js` on a browser env (v71's
  builder-spacing + FAB markup and v72's timing); (c) optional: purchased-quantity capture for v55 §I (needs a
  protected-region edit). **Done in v72:** motion-token scale formalised (added `--t-slow`/`--ease-in-out`/
  `--ease-spring`, kept `--t-fast`/`--t-med`); modal close now reverses via central `openOverlay`/`closeOverlay`
  (`.open` drops synchronously, `.closing` drives the fade); tab-switch settle; ONE shared card/row press;
  two signature moments (Gemini panel spring-expand + invoice corner-toast with a landing ✓); reduced-motion +
  GPU-only (transform/opacity) throughout. **Two decisions Max confirmed this batch:** include the modal
  close-reverse (touches shared `hide()`/`closeModal()`); ship both signature moments (not Gemini-panel-only).
