# HANDOVER — v40 (Opus logic batch)

Branch: `fix/invoice-rounding` (unmerged). Ships as **v40** — all six version
spots bumped. `npm test` = **117 green**; `node -c js/app.js` clean; jsdom smoke
passes. Built on top of the v39 work (also on this branch, not yet merged).

## Item 1 — plates_menu_id_fkey on publish-to-new-menu (BUG, data integrity) ✅

**Confirmed root cause: hypothesis 2, a same-action async race.** In
`submitMenuItem` (the "Publish to menu" modal), the NEW-item path does, in one
click:
1. `dbPushMenu(...)` — inserts the new `menu_items` row (fire-and-forget), then
2. `saveCurrentPlate(false)` → `dbPushPlate(...)` — inserts the plate whose
   `menu_id` references that row (also fire-and-forget).

Both go through `pushWrite`, which had no ordering, so the plate insert could
reach Supabase before the `menu_items` insert committed → FK violation. It only
bit NEW items because the existing-item path references a row already on the
server.

**Correction to the prompt's assumption:** `plates.menu_id` references
**`menu_items.id`**, not a `menus` table. (`menuLinkEl` is populated from `MENU`,
the menu-items array; the plate's `menuId` is a menu-item id.) The fix is the
same regardless.

**Fix (root):**
- `pushWrite` now RETURNS its settled promise (resolving to the result / `{error}`
  / `null` when offline or no client). Backward compatible — every existing
  caller ignores the return.
- `dbPushMenu` / `dbPushPlate` return that promise.
- New `dbPushPlateAfterMenu(sp, menuPushPromise)`: pushes the plate ONLY after the
  menu-item push resolves; if it errored, aborts (no orphan plate) and toasts.
- `submitMenuItem` captures the menu-item push and threads it through
  `saveCurrentPlate(false, menuItemPush)`. The existing-item path passes `null`
  (unchanged behaviour).

**Test:** `tests/menu-plate-order.test.js` (4) — call order, abort-on-menu-error,
unchanged no-dependency path, null-plate safety. Extracted from the real shipped
function.

**Note (not fixed, flagged):** `pushWrite` still drops writes silently when
offline (no queue/retry). That's a broader gap than this bug; the sequenced fix
also covers the reconnect case because the plate push re-runs on the next save.

## Item 2 — the Original menu is deletable when others exist (parity) ✅

- `updateMenuDelBtn` now uses `canDeleteMenu(id)`: **any** menu is deletable
  **except the last one standing** (Original included).
- Deleting the **Original** menu opens a **destination picker** (`delMenuModal`)
  so you choose where its dishes move — **"ask me each time"** (your call).
  Deleting a non-original menu keeps the existing auto-move behaviour, now
  targeting `fallbackMenuId()` instead of a hardcoded `MENU_ORIGINAL`.
- `fallbackMenuId()` — current-menu fallback that **never returns a deleted id**:
  prefers `MENU_ORIGINAL` while it exists, else the first surviving menu. Wired
  into the two resolution points (bootstrap + `buildMenuSelector`) and post-delete.
- `ensureDefaultMenu()` now seeds Original **only on an empty list**, so a
  deliberately deleted Original is **never resurrected** on reload.
- `doDeleteMenu(id, dest, name)` shared by both paths; dishes are **reassigned,
  never deleted**, and you land on the destination menu.

**Deletion semantics (chosen, per your answer):** dishes are never lost. Original
delete → dishes move to a menu you pick; non-original delete → dishes move to the
fallback (Original if present, else first surviving). This matches the existing
"nothing is lost" delete.

**Tests:** `tests/menu-fallback.test.js` (5) — fallback never returns a deleted id;
last-menu guard; Original becomes deletable with >1 menu. Also fixed a stale
`smoke.js` assertion (it hardcoded `v35`; now derived from `sw.js`).

## Item 3 — Tidy lists (FEATURE) — PURE CORE ONLY ✅ (UI is a follow-up)

Per your call (logic first, UI after), this lands the tested pure core; the
Settings UI is **not built yet**.

- `tidyFieldValues(products, field)` — distinct non-empty values + usage counts,
  most-used first then A–Z. `field` ∈ {category, brand, supplier} via `TIDY_FIELDS`.
- `tidyPlan(products, field, action, from, to)` — exact per-product patch list +
  `isMerge`. `rename` == `merge` semantics; **rename onto an existing value is
  flagged `isMerge`**; `clear` nulls the field. One patch per affected product.
- `tidySupplierMemMigration(supplierMem, from, to)` — **supplier-memory decision:
  YES, migrate.** Taught packs key off the supplier NAME (`memKey`), so a rename
  must re-key them or they orphan. Rebuilds the new key from the entry's already-
  normalised `phrase_norm` (== `memKey(to,·)`), so it touches **nothing in the
  protected parser region**. `to === null` (clear) drops the memories.

**Tests:** `tests/tidy-lists.test.js` (10) — counts, rename N patches, merge ==
rename, rename-onto-existing == merge, clear nulls, no-op, and the three
supplier-memory cases.

**Follow-up (UI) — task noted:** Settings "Tidy lists" section — 3 pickers,
values+counts, per-value Rename/Merge/Clear each behind ONE blast-radius confirm
("Rename BAKERY on 14 products?"); apply `plan.patches` through `dbPushIngredient`
and the supplier-mem moves through `rememberSupplierPhrase` /
`dbDeleteSupplierPhrase`; then re-derive dropdown sources and re-render affected
tabs. Reuse `.set-group` styling. Child-simple: no multi-select, no undo — the
confirm is the safety.

## Judgement calls
- Item 1 fix lives at the plate-publish point (sequencing), not by touching the
  DB constraint or building an offline write queue (out of scope).
- Item 2: non-original delete behaviour left as-is except the target is now
  `fallbackMenuId()` (only differs if Original was already deleted). Only the
  Original-delete path gets the new picker, matching your "ask me each time".
- Item 3: added the supplier-mem migration planner now (not just a handover note)
  because orphaning taught packs on rename is clearly wrong, not ambiguous.

## Needs Max's phone / branch preview (not verifiable here)
1. **Item 1:** create a NEW menu → build a plate → Publish into it → no FK error;
   reload → the dish survives and stays on that menu.
2. **Item 2:** with ≥2 menus, delete the **Original** menu → picker appears →
   pick a destination → dishes land there, Original is gone, and it does **not**
   come back after reload. Confirm the last remaining menu shows no Delete.
3. **Item 3:** nothing to see yet (no UI this pass).
4. **Recommend: Settings → Export backup (JSON) BEFORE testing item 1/2 on real
   data.**
