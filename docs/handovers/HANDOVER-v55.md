# HANDOVER v55 — Plates completion + bug batch

**Branch:** `feat/plates-independent-library` (continues the v54 work; v55 completes/reworks it).
**Brief:** `~/Downloads/ezplate-opus-plates-completion.md`.
**Status:** `npm test` = **150 green**, jsdom smoke green, `node -c` clean, six version spots at
**v55**. **Playwright NOT run (no browser here)** — see §K. Awaiting Max's phone sign-off + the
three migrations applied to prod, then merge.

## ⚠️ Deploy order (v43 lesson) — apply BEFORE the code deploys
A `dbPush*` that writes a column the live DB lacks fails wholesale. Apply, in order:
1. `supabase/migrations/20260719_menu_items_plate_id.sql` (§A)
2. `supabase/migrations/20260719_backfill_plates_for_uncosted.sql` (§B)
3. `supabase/migrations/20260719_plates_category.sql` (§J)
All idempotent. (v54's `plates_menu_id_nullable.sql` was already applied.)

## A — Many-to-many publishing (LEAD; commit `539cfa4`-era → this branch)
A plate can be on **any number of menus**, each entry with its own price/category. Reworks
v54's single-menu "Move to another menu" popup.
- **Canonical link:** `menu_items.plate_id → plates.id` (migration + COALESCE backfill from
  `plate_id`, legacy `source_plate_id`, and the inverted `plates.menu_id`). `plates.menu_id`
  is legacy (unread/unwritten); `source_plate_id` is a read-fallback, **mirrored on write**
  (`dbPushMenu` writes both) so a device still on v54 keeps resolving during rollout.
- **Resolution helpers** are the single path (call sites never poke raw fields): `plateIdOf`,
  `plateForMenuItem`, `dishesOfPlate`, `menusOfPlate`, `isPublishedPlate`, `ensurePlateForDish`.
- **FK FLIPPED** (was `plates.menu_id → menu_items.id`): the DISH now references the plate, so
  the dish write sequences AFTER the plate — `dbPushMenuAfterPlate` replaces
  `dbPushPlateAfterMenu` (removed); bootstrap reconcile re-pushes plates first, then dishes.
- **UI:** card popup → **Manage menus** (`#manageMenusModal`: Add per menu via the publish
  modal, Remove per menu), Edit plate, Delete plate (removes the plate + every entry; copy says
  products/ingredients untouched). `saveCurrentPlate` saves only `{id,name,lines,category}`.
  Menu delete removes only that menu's entries. renderAnalysis resolves via `plateForMenuItem`;
  the orphan "Custom plates" section is gone.
- **Dead post-v55** (unreachable, left for later cleanup): `openPlateEdit`/`savePlateRestore`/
  `editPermDeletePlate`/`plateEditAction`, `doDeleteMenuItem`, `openMenuInBuilder`.

## B — Uncosted dishes become plates
Migration backfills an empty plate (`lines=[]`, id `'SPD'||dish.id` → idempotent) for any dish
still without a plate. App: an EMPTY plate reads "not costed yet" (Plates card cell +
renderAnalysis), not a misleading $0.00. `ensurePlateForDish` is the app-side guarantee.

## J — Plate categories (parity with Products)
Migration `plates.category` + backfill from a menu entry's section. Builder popup has a
**Category** combo (fuzzy-matches existing plate categories + per-menu sections; `makeInlineCombo`,
inited on popup open because `niCombos` isn't ready at load-IIFE time). Plates tab: category
filter + Clear filters like Products. `plate.category` is the library's own grouping;
menu-entry sections stay per-menu. **Not built (flagged):** extending Tidy-lists tooling to
plate categories.

## C — Plates desktop grid bug (ROOT CAUSE)
The old two-column builder rule `#tab-builder{display:grid;grid-template-columns:minmax(320px,
400px) 1fr}` survived from when the tab held the search + docket side by side. With only the
Plates `.panel` left, it was squeezed into the ~400px first column — the "narrow mobile column
on desktop". **Fix:** removed that rule (+ its 1280px override); `#plateList` now uses the
shared `.ing-list` grid, full-width like Products. (Rendered proof = the `plates-desktop`
Playwright shot, §K — no browser here.)

## D — Small UI/copy
1. Plate-delete copy fixed in §A (products/ingredients untouched). 2. Menu "→ Builder" chip +
edit-modal "Open in builder" button removed (recipe editing is via the Plates card → Edit).
3. Plates nav glyph + `ICON_PLATE_BIG` are now a plate (rim + inner circle). 4. Removed the v54
product-edit helper sentence.

## E — Rounding (ROOT CAUSE for E1)
- **E1:** `flagNeedsAttention` ran the price-jump test on UNROUNDED floats, so two prices that
  both display `$0.01` (differing past the cent) tripped "price change — check". Now it skips
  the jump when `Math.round(a*100)===Math.round(b*100)`. Pinned by `tests/inv-priceflag.test.js`.
- **E2:** audited — every user-facing invoice unit-price is already 2dp (`dispPrice`, the
  `invPrice` input, `f_calc`). The only >2dp `toFixed(4)` are `invDbg` console logs inside the
  protected region (not user-facing); untouched.
- **E3:** the builder inline price editor prefilled per-unit (`ea`) prices at 3dp → now 2dp.
  `commitPrice` only re-derives on an explicit edit, so the stored `cost_per_base_unit` stays
  exact until the user changes it.

## F — Invoice new-item form (ROOT CAUSE for F1)
- **F1:** the "auto-filled" chip keyed off CSS `:placeholder-shown`, so it lit on ANY non-empty
  field including user-typed values. Now the parser-filled fields (Name/Price/Unit/Supplier)
  carry a JS `af` class; a delegated input/change listener clears it on first edit and records
  the field in `r.newItem.edited` so a re-render (v50 machinery) doesn't re-mark it; the chip CSS
  keys off `.af`; `niSnapshot` carries `edited` forward.
- **F2:** the Kitchen-name field no longer prefills a proposal (which silently meant "repoint");
  it starts BLANK, combo suggestions remain. smoke [10] updated.

## G — Builder search matches product text
`kitchenSearchMatches` now reuses `kingSearchFilter`, so `#q` matches the linked product's
description/brand (e.g. "tiptop" finds ingredient "Bread" → product "Bread GF — TipTop"). Pinned
by `tests/builder-search.test.js`.

## H — Wizard repoint regression (design note; Max approved auto-skip)
Repointing an ingredient off product P now calls `parkRepointedProduct(oldPid)` → P lands in the
wizard's recoverable "Skipped (N)" list instead of being re-proposed as unlinked. Unskip still
recovers it. Pinned by `tests/wizard-repoint.test.js`.

## I — "6x8's" pack (DIAGNOSE-FIRST; EXACT LOCATION; Max chose the fix)
**Diagnosis (ran the real code):** `packCount("6x8's")` returns **6, not 48** — its shorthand
regex `/\b(\d{2,4})'?s\b/` needs 2–4 digits, so the single-digit "8's" is dropped and only the
"6x" multiplier survives. `packCount` (`js/app.js` ~L2598), `parsePdfLine` (~L2612), `packPriceOf`
(~L2432), `derivePackPrice` (~L2518) **all sit INSIDE the protected region** (`var INV_EXCLUDE=` …
`function unitLabelFor(`), and the invoice **purchased-quantity column is never captured** (the
parser uses `firstPairPrice` for a per-pack price instead). Both root causes are in the region.
**Fix (Max's call — no region edit):** `normPackNotation` rewrites a compound `N x M's` →
`(N*M)'s` on the RAW text before parsing, at both entry points (`parseInvoice`, PDF path in
`handleInvFile`), and before the textarea is populated so a manual re-parse is consistent. So
"6x8's" → "48's" and `packCount` reads 48. Pinned by `tests/inv-packnorm.test.js`.
**LIMITATIONS (not silently ignored):** (a) fixes the per-pack COUNT only — it does NOT add
purchased-quantity capture, so a line priced at its TOTAL across several packs still needs the
taught-pack flow; (b) it rewrites the displayed line text (name shows "48's"), which could
slightly affect name-matching. If Max wants full purchased-qty handling, that requires editing
the protected parser (his explicit sign-off) — flagged.

## K — Playwright (WRITTEN, NOT RUN — no browser in this container)
- `screenshots.spec.js`: added a `plates + builder popup @ mobile/desktop` test capturing the
  Plates grid (proves §C) + the builder popup + Manage-menus. Existing per-tab shots navigate by
  `data-tab` (correct for v55).
- `layout-consistency.spec.js`: updated the stale "builder docket exception" header note; the
  panel/title/divider assertions already cover the builder (Plates) tab.
- **`fresh-states.spec.js` was NOT edited** (935 lines of assertions I can't run). It still has
  v54-stale tests that will fail until updated on a browser env — the ones flagged in
  HANDOVER-v54 (Save-draft/"Unassigned dishes" ~L171; builder-line tests that click
  `data-tab=builder` expecting `#lines` in the tab — now in `#builderModal`; "chip routes to the
  Builder" ~L888 — chip removed), PLUS new v55 items (publish is now Manage-menus, not the old
  publish modal). **Must run `npm run shots` on a browser env, update these, and regenerate
  screenshots.** Blind edits here would likely add errors, so they were left for that pass.

## Tests (150 green; new/rewritten, named)
- Rewritten: `plates-independence.test.js` (many-to-many resolution + menu-delete preserves
  plates/other menus + ensurePlateForDish), `menu-plate-order.test.js` (`dbPushMenuAfterPlate`,
  flipped FK). New: `inv-priceflag.test.js` (E1), `builder-search.test.js` (G),
  `wizard-repoint.test.js` (H), `inv-packnorm.test.js` (I). smoke [10]/[11]/[12] updated (F1/F2,
  many-to-many lifecycle, plate category).

## needs-Max's-phone / browser
- **Full multi-menu lifecycle on mobile:** new plate → Save (Unpublished) → Manage menus → add
  to 2 menus with different prices → both show on the Menu tab → unpublish one (Remove) → delete
  a menu (plate + its other menu survive) → Edit plate → Delete plate (menu list warning).
- An uncosted/backfilled dish shows in Plates as "not costed"; cost it → menu entry re-costs.
- **Plates desktop grid full-width (§C)** — the whole point of the C fix.
- Builder popup at 380px with the new Category combo; Plates category filter + Clear filters.
- A real invoice import checking **E1** (equal prices don't flag), **F1** (auto-filled chip only
  on parser fields, gone after editing), **F2** (Kitchen field blank), and the **"6x8's ×6"**
  line — confirm the unit price is right (and whether the per-pack price or line total is used;
  if line total, use the taught-pack flow — see §I limitation).
- Both themes throughout.

## CLAUDE.md
"State as of" rewritten to v55. Hard rule 6/7 note: the three-layer model still holds, but the
plate↔dish link is now `menu_items.plate_id` (many-to-many), not `plates.menu_id` (legacy) — a
follow-up rule tweak to PROPOSE to Max at merge (not silently edited).
