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
3. **Builder** — assemble a plate from ingredient lines `{kid, qty}` (+ misc
   cost lines), see total cost, publish to a menu.
4. **Menu analysis** — plate cost vs suggested price at the target food-cost %,
   traffic-light margin health (green/amber/red). Menus are rows in `menu_items`;
   a menu can be deleted (see Hard rules) — dishes on it are always reassigned,
   never deleted.
5. **Invoice import** — parse a supplier PDF/text invoice, match lines to
   products, review, confirm → prices update. The most complex and most
   fragile subsystem. Treat with maximum care.
6. **Dashboard** — food-cost trend chart + highlight cards.
7. **Settings** — header gear: target food cost %, GST default, JSON backup
   export, clear cache, About/contact. **Outstanding: "Tidy lists" UI** (see
   State as of, below) — the pure logic exists and is tested; no Settings
   section calls it yet.

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
   - **Plates** — the cost builds (`plates` table). **`plates.menu_id`
     references a `menu_items` id** (a dish), and THAT is the FK
     `plates_menu_id_fkey`. A write creating a plate for a menu item must not
     race ahead of that menu item's own insert — see Data-write rules.
7. **Never let a menu deletion delete dishes.** Every delete path reassigns
   affected dishes — a menu with dishes always sends them to the reserved
   **"Unassigned dishes"** holding area (`MENU_UNASSIGNED`, v42); an empty menu
   just relands the view. `fallbackMenuId()` must never return a deleted id, and
   never the holding area while a real menu exists. The holding area is never
   deletable and doesn't count as a real menu; the last REAL menu may be deleted
   only when a holding area will stand afterwards (so at least one selectable
   menu always remains).

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
- **Publish-to-new-menu is a two-write sequence, not two independent writes**
  (v40). Creating a menu item and publishing a plate into it happen in one
  user action; the plate write MUST wait on the menu-item write's result and
  abort (with a real error toast) if it failed. This was a live data-integrity
  bug (`plates_menu_id_fkey`), not a style issue — treat any new "publish into
  X, referencing Y" flow with the same suspicion.

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

## State as of 17 Jul 2026 (verify, don't trust)

- `main` is at **v41** (v39+v40+v41 merged via PR #1 — verified against
  `origin/main`, commit `da27ae7`). That IS the live/deployed app.
- Branch `fix/pack-control-and-menus` (off `main`) carries **v42 (FK orphan heal
  + "Unassigned dishes" holding area), v43 (masking-toast bugfix), v44 (Fable
  visual batch), v45 (finishing touches), v46 (Fable UX polish, commit
  `ea9fc62`)** — all committed and pushed — **and v47 (dashboard trend-chart
  rebuild), uncommitted as of this writing**. `npm test` = **131 green**,
  `node -c` clean, jsdom smoke passes, **39 Playwright checks pass** (34 prior —
  one updated for the new Target label — + 5 new v47), all six version spots at
  **v47**. Not on `main` yet.
- **v47 shipped (chart rebuild, Collectr feel — see `handovers/HANDOVER-v47.md`,
  plan approved by Max):** hand-rolled monotone cubic spline (`tcTangents`/
  `tcPath`/`tcYAt` — the scrub dot rides the exact rendered curve), dotted
  `<pattern>` area fill in the semantic line colour, free scrubbing (crosshair +
  curve-riding dot + snapping two-line tooltip card; bright-behind/dim-ahead via
  two clipPath'd copies; rAF-throttled attribute updates only — no re-render),
  real y-axis (3–4 nice ticks via `tcTicks`) + 3 upright date labels replacing
  the stray corner figures, "Target" word at the rule's left end, caption's
  "Tap a point" dropped, plot is ONE focusable control (arrows/Home/End/Escape;
  the 60 per-dot tab stops are gone), reading dots only when ≤32 points.
  0/1 points → empty state; 2 points → straight segment (all pinned by tests).
  Semantic green/red and the v45 headroom fix are unchanged. Scrub FEEL needs
  Max's phone — list in the handover.
- **v46 shipped (UX polish, all screenshot-verified at 380px + 1280px — see
  `handovers/HANDOVER-v46.md`):** Ingredients strapline inline with the buttons
  row on desktop (own line ≤639px); "Set up from products" is a plain `.btn`
  (outlined like "Import invoice"); ingredient cards mirror the `.ing-list`
  grid at every breakpoint (3-across ≥1280px, `.king-link` clamps to 2 lines;
  tap/keyboard-to-edit intact); dashboard Target pill REMOVED — the dashed line
  carries an inline SVG label (`.ref-lbl`, side chosen away from the data; the
  big current-% number stays); invoice flag pill alignment root-caused (three
  cascade leaks: space-between from the generic card td, baseline-pin of unequal
  font sizes, stray pre-flex margin — title cell back to inline flow, pill is
  inline-block `vertical-align:2px`, centring 0.0px off, pinned ≤1px by test);
  builder leader root-caused (stale one-row-era `translateY(-4px)` — `.costs`
  now baseline-aligns so the dots sit ON the shared text baseline); audit fixes:
  `.ms-clear` and `.range-btn` get invisible ≥44px hit areas. Item-7 proposals
  NOT built (dead `.ref-pill` CSS, `.invAppr` 26px checkbox in the protected
  area, viewport `user-scalable=no`, misc-button copy) are listed in the
  handover for Max.
- **v45 context (see `handovers/HANDOVER-v45.md`):** pack control finished
  (price+pack one line desktop / two centred lines mobile; derive preview via
  `invPackPreviewText` shared by render + recompute); mismatch banner reworded;
  Ingredients header reordered to the Products pattern; "+ New product"
  everywhere; dashboard y-scale padding proportional (28%/side); builder
  decluttered and the 380px overflow fixed at the root.
- **v44 shipped (visual batch):** unified invoice pack control; "price change —
  check" copy; pills on the title baseline; menu empty-state centring
  root-caused (td:first-child specificity) and pinned; mobile short labels via
  `.btn-noun`; confirm dialogs above Settings (`#confirmModal{z-index:85}`);
  ingredient cards tap-to-edit with Remove in the modal; builder lines two-row
  (`100 g @ $2.63/kg ··· $0.26`); **"Save to Library" → "Save draft" into
  "Unassigned dishes"** (drafts are visible dishes with `price:0`,
  `section:'Drafts'`, sequenced writes; publish moves them out).
  `tests/visual/fresh-states.spec.js` = offline fresh-install Playwright
  fixtures (`npm run shots`) — how v44/v45 were verified; reuse it.
- **v43 context you need:** the "every publish errors" mystery was the BACKEND —
  Max's `menu_items` table lacked `source_plate_id`, so every dish upsert was
  rejected; Max added the column via SQL. The app-side fix removed the second
  toast masking the real error; `pushWrite` is the single source of save
  messaging. Watch for the same class of bug: any `dbPush*` naming a column the
  live DB lacks fails wholesale — audit column lists against the real schema
  before big features. See `handovers/HANDOVER-v43.md`.
- **v42 shipped:** publish sequencing for EVERY publish path (orphaned dishes
  heal on re-publish; `upsertCustomMenu` returns its push); `bootstrapSync`
  heals instead of clobbering via pure `reconcileLocalOnly` (was silently
  destroying offline-created rows); menu deletion auto-moves dishes to the
  holding area behind ONE confirm (`fallbackMenuId`/`canDeleteMenu` reworked,
  `realMenus()` added). See `handovers/HANDOVER-v42.md` incl. the read-only
  orphan diagnostic snippet.
- **Needs Max's phone (branch preview) before merge** — the v42, v44, v45, v46
  and v47 handover lists. **Export a JSON backup first.** Highlights: publish to
  an EXISTING menu (no FK error); delete a menu → dishes land in "Unassigned
  dishes" and survive reload; real invoice import (pack control both
  breakpoints + live preview line + flag-pill alignment on real titles);
  builder at 380px with a real multi-ingredient plate (leaders on the baseline);
  ingredient card grid at all widths; the rebuilt dashboard chart — scrub feel
  on a real finger (slide the whole curve, slide off both edges, page must not
  scroll while scrubbing), both themes, all six ranges.
- Next up: (a) Max's phone sign-off, then merge the branch to `main`;
  (b) the Tidy lists Settings UI (`HANDOVER-v40.md` spec) is STILL not built —
  next feature task.
