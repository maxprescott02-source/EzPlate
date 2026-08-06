# HANDOVER v54 — Plates become an independent library

**Branch:** `feat/plates-independent-library` (off `main` @ v53).
**Brief:** `~/Downloads/ezplate-opus-plates-rework.md` (Max's decision — reverses the
v40/v42 holding-area design).
**Status:** `npm test` = **134 green**, jsdom smoke green (sections [12]–[14] new),
`node -c` clean, all six version spots at **v54**. Awaiting Max's phone sign-off, then
merge to `main`. Playwright specs need a browser-env update (see below) — **not run here**.

## The decision (what changed conceptually)

Plates are now a **first-class, independent library**. A plate exists on its own,
menu or no menu. Menus *reference* plates; deleting a menu deletes its menu ENTRIES
but never the plates. The "Unassigned dishes" holding area (v40/v42) is **removed** —
it only existed because a plate couldn't live unattached; now it can.

Two findings up front that shrank the risk (both verified via MCP before any code):
1. **`plates.menu_id` was already NULLABLE in prod** (FK → `menu_items.id` intact).
   The migration is a no-op there — shipped for repo/other-env parity, idempotent, not
   re-applied to prod.
2. **A plate library already existed latently** — `savedPlates` (the `plates` table)
   already carried an optional `menuId`; unpublished plates already rendered as
   "Library"; menu-item delete already nulled the plate and kept it. Much of §1 was
   surfacing/removing scaffolding, not new construction.

`menu_items.menu_id → menus.id` is **ON DELETE SET NULL**, so deleting a menu never
FK-fails; the delete path removes dishes first regardless, so ordering is safe.

## Section-by-section (one commit each)

**§1 Data layer** (`539cfa4`)
- `doDeleteMenu(id,name)` rewritten: for each dish on the menu, unlink its plate
  (`sp.menuId=null; dbPushPlate`) and `removeMenuItem` the dish, then drop the menu.
  **Plates survive, unpublished.** No reassignment.
- Removed all holding-area machinery: `MENU_UNASSIGNED`, `UNASSIGNED_NAME`,
  `ensureUnassignedMenu`, `ensureUnassignedMenuIfReferenced`, `holdingHasDishes`,
  `realMenus`, and every holding special-case in `fallbackMenuId`/`canDeleteMenu`/
  `buildMenuSelector`/`buildMenuPickers`/bootstrap.
- **Zero menus is now legitimate.** `canDeleteMenu` = "menu exists"; `fallbackMenuId`
  returns `null` when none; `setCurrentMenuId` accepts null. `ensureDefaultMenu` seeds
  "Original" **only on a genuinely fresh install** (the `cafeDB_menus` key was never
  written — `menusKeyExists()`); once the user has created OR deleted a menu (either
  writes the key) the real set — including empty — is respected. The Menu tab's
  existing `if(!shown)` empty state covers the zero-menu view; a card's Publish prompts
  to create a menu first when none exist.
- `saveDraft` deleted (holding-area draft flow).
- **Tests:** `menu-fallback.test.js` rewritten to the v54 contract (last menu deletable;
  fallback → null on empty). `save-draft.test.js` **removed**, replaced by
  `plates-independence.test.js` (save-null-menu; menu-delete unlinks+preserves plates;
  delete-last-menu leaves zero menus). `menu-plate-order.test.js` **unchanged** — the
  publish sequencing contract (`dbPushPlateAfterMenu`/`reconcileLocalOnly`) survives.

**§2 Plates tab + builder popup** (`88bb12f`)
- `#tab-builder` (identifier unchanged) is now the **Plates library** — a `.ing-card`/
  `.ing-list` grid identical to Products/Ingredients by construction. Card = name +
  cost + an "On <menu>" / "Unpublished" badge (`menuOfPlate`: plate → dish → menu).
- Builder markup **relocated** into `#builderModal` (full-screen on mobile, large modal
  on desktop) — ids/classes/handlers unchanged. Builder buttons collapsed to **one Save**
  (`saveFromBuilder` → `saveCurrentPlate` which now returns true/false so the popup only
  closes on a real save + refreshes the tab). Publish-to-Menu and Save-draft removed;
  Print docket + Clear plate kept.
- Tapping a card → `#plateActionsModal`: **Publish** (menu picker → existing publish
  flow; **"Move to another menu"** when already published), **Edit** (opens the popup
  pre-filled), **Delete** (double-confirm; a published plate drops its menu dish too).
- `loadPlate`/`loadMenuItemBlank`/`openMenuInBuilder` now open the popup instead of
  switching to the builder tab. New: `loadPlateState` (load without navigating),
  `renderPlatesTab`, `openBuilder/closeBuilder/openBuilderNew`, `openPlateActions`,
  `publishPlateFromCard`, `editPlateFromCard`, `deletePlate`.
- Builder popup is ×/Escape-dismissable but **not** backdrop-dismissable (no accidental
  loss of a plate in progress). `smoke.js [12]` drives the full lifecycle end-to-end.

**§3 Product unit type create-only** (previous commit)
- Edit form (`#ingModal`) `#ig_unit` is **disabled** (shown, not editable);
  `syncIgUnitFromPack` early-returns on a disabled control; `saveIngEdit` derives the
  unit from the **stored** `base_unit`, so an edit can only change the price →
  `cost_per_base_unit`, never `base_unit`. New product form unchanged. The invoice
  pack-teach path is untouched. `smoke.js [13]` pins it.

**§4 Products small fixes** (previous commit)
- Empty/no-match states span the whole grid on all three card lists (`#ingList`,
  `#kingList`, `#plateList`) → centred empty icon (was pinned to column 1 = "padded
  left"). New ghost **Clear filters** button (resets search + both filters), hidden
  when inert. `smoke.js [14]` pins it.

**§5 Tab order + label** (previous commit)
- Nav: **Dashboard, Products, Ingredients, Plates, Menu**. `data-tab="builder"`
  relabelled "Plates"; all `data-tab` values unchanged.

**§6 Cache bump + docs** (this commit)
- Six spots → v54; `settings.test.js` green. Handover + CLAUDE.md "State as of" rewritten.
  Proposed rule edits sent to Max (below) — not silently applied.

## Deliberately NOT built / out of scope
- **Multi-menu publishing** (same plate, different prices per menu). A plate is
  published to at most one menu; re-publish offers to move it. Future option.
- The invoice mismatch/pack-teach flow (v38) — untouched by §3.
- A "reused" dish (`sourcePlateId`) whose source plate is deleted is not specially
  handled by `deletePlate` (same edge as before). Low frequency; flag if it bites.

## Needs Max's phone (cannot verify in this container — no browser)
- **Full lifecycle on mobile:** + New plate → Save → appears **Unpublished** in Plates
  → tap → Publish to a menu → shows on the Menu tab → delete that menu → **plate
  survives, Unpublished** → tap → Edit → move to another menu.
- **Builder popup at 380px** (full-screen takeover), both themes: the two relocated
  panels, the ingredient search `#drop` and `#plateSuggest` dropdowns (must not clip
  inside the scrolling `.mbody`), the 3-button `.actions` row.
- **Zero-menu state:** delete the last menu (allowed now) → Menu tab empty state; then
  publish a plate → the "create a menu first" prompt.
- Plate card action popup feel; Products **Clear filters** show/hide + **centred empty
  icon**; product Edit form **Unit type disabled** affordance.

## Playwright specs — MUST be updated on a browser env (NOT run/updated here)
These encode the OLD builder-in-tab / holding-area contracts and will fail until
updated. They are not in `npm test` (that globs `tests/*.test.js`, not
`tests/visual/*.spec.js`). Update + re-run with `npm run shots` in a browser env:
- `fresh-states.spec.js`:
  - "v44 item 9: Save draft parks the plate under 'Unassigned dishes'" (~line 171) —
    **feature removed**; delete or rewrite as "Save creates an unpublished plate card".
  - builder-line tests (~34/145/266/477) click `data-tab="builder"` expecting `#lines`
    in the tab — `#lines` now lives in `#builderModal`; open the popup (+ New plate /
    a card's Edit) first.
  - "v52 … chip routes to the Builder" (~888) expects `#tab-builder` visible — the chip
    now opens `#builderModal`; assert that instead.
- `layout-consistency.spec.js`: the header comment's "Builder's Publish/Save/Print/Clear
  at the bottom of the docket" exception (~line 13) is stale — the builder is a popup and
  the Plates tab is a plain card panel now (should conform to the skeleton like the
  others; the exception can likely be dropped).

## Migration
`supabase/migrations/20260718_plates_menu_id_nullable.sql` — `ALTER TABLE plates ALTER
COLUMN menu_id DROP NOT NULL`. Already true in prod (no-op); committed for parity.
