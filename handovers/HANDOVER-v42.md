# HANDOVER — v42 (Opus logic batch: pack-control-and-menus)

Branch: `fix/pack-control-and-menus` (off `main` @ v41, **unmerged**). Ships as
**v42** — all six version spots bumped. `npm test` = **128 green**; `node -c
js/app.js` clean; jsdom smoke passes. Two items from `ezplate-opus-logic-batch.md`.

## Baseline correction (read first)

The session opened believing v40/v41 were **not** on `main`. That was a stale
**local** `main` (v39, commit `0e6a1d7`). A fresh fetch showed **`origin/main` =
`da27ae7` = "Merge pull request #1 … fix/invoice-rounding", at v41** — v39+v40+v41
ARE merged and live. This branch is correctly based on that. Also: the
comprehensive `CLAUDE.md` (the one with all the v40 rules) had been sitting
**uncommitted** in the working tree and was never on `main`; it's committed on
this branch, with the Rule 6 correction folded in.

## Item 1 — `plates_menu_id_fkey` STILL firing (data integrity) ✅

**Confirmed root cause (code-path, not a live DB query — no Supabase from here):
orphaned local `menu_items`.** v40 fixed only the *new-dish* publish race. Two
holes remained, both matching Max's "on any menu, 16 Jul" symptom:

1. **Re-publishing to an *existing* dish was never sequenced.** In
   `submitMenuItem` the existing-dish branch left `menuItemPush=null`, so the
   plate push didn't wait. If that dish's row had never actually landed on the
   server (a `pushWrite` drop while offline — the known gap), the plate
   references a missing `menu_items` row → FK fails, every build, forever.
2. **`bootstrapSync` *replaced* local with the server snapshot** (`customMenu =
   server; savedPlates = server`). Any dish/plate created offline and not yet
   synced was **silently destroyed on reload** — the flip side of the same gap,
   and a latent **data-loss** bug in its own right.

**Data-model correction (supersedes v40's note and old Rule 6):** there are
THREE layers — `menusList` (menus, `menus` table), `menu_items` (dishes, each
`.menuId` → a menusList id), and `plates`. **`plates.menu_id` → a `menu_items`
id.** The `menus` table is real (just optional on old projects). CLAUDE.md
Rule 6 rewritten accordingly (Max approved).

**Fix (root):**
- `upsertCustomMenu` now RETURNS its `dbPushMenu` promise (backward compatible).
- `submitMenuItem` threads that promise as `menuItemPush` on the existing-dish
  path too, so the plate push waits for a confirmed `menu_items` upsert on
  EVERY publish — re-publishing an orphaned dish re-creates it, then the plate
  references a row that's really there.
- New pure `reconcileLocalOnly(local, server, tombstones)` → `{merged,
  localOnly}`: keep server rows PLUS any local rows the server lacks, minus
  tombstoned ids. `bootstrapSync` uses it for both dishes and plates (heal, not
  clobber) and re-pushes the local-only rows — plates sequenced AFTER their
  (possibly also-orphaned) dish via `dbPushPlateAfterMenu` + a `menuPushById`
  map. Idempotent: once the re-push lands, the next snapshot has the ids, so
  `localOnly` is empty and there are no duplicates.
- The error toast still surfaces the REAL Supabase error (unchanged path).

**Tests:** `tests/menu-plate-order.test.js` +4 — `reconcileLocalOnly` surfaces &
keeps local-only rows, never resurrects tombstoned ids, is idempotent, and is
null-safe. (The v40 sequencing tests still pass unchanged.)

**Still NOT fixed (flagged, out of scope):** `pushWrite` has no offline
queue/retry. The heal makes reloads safe and re-publishing self-healing, but a
write made while fully offline still doesn't reach the server until the next
publish or bootstrap re-pushes it.

## Item 2 — "Unassigned dishes" holding area ✅

Replaces v40's destination-picker / permanent-delete model with an automatic
holding area, per Max's new design.

- **Name: "Unassigned dishes"** (`UNASSIGNED_NAME`), reserved id
  `MENU_UNASSIGNED`. Chosen over "Non-menu dishes" because it reads as a
  temporary state a dish moves *out of*, not a category it belongs to.
- `ensureUnassignedMenu()` — creates it on demand and pushes its `menus` record
  **before** any dish is reassigned into it (defensive: if `menu_items.menu_id`
  is ever FK-enforced against `menus`, the row is already there). Returns the
  push promise; idempotent (second call is a no-op, returns null).
- Never seeded on fresh installs (`ensureDefaultMenu` still seeds only Original,
  now gated on `realMenus().length`). Self-heals: `ensureUnassignedMenuIfReferenced()`
  runs at cold start and in `bootstrapSync`, so if a `menus`-table snapshot
  drops it but dishes still point at it, it comes back.
- **Delete flow:** single `askConfirm` ("Delete Winter Menu? Its 6 dishes move
  to Unassigned dishes.") → dishes reassigned there, menu row dropped, view
  lands on the holding area. Empty menus just reland the view. The v40
  `delMenuModal` picker is removed — JS (`openDelMenu`/`confirmDelMenu`/
  `closeDelMenu`/`delMenuTargetId`, its event wiring, its entries in the
  modal-close arrays) and HTML (`#delMenuModal`).
- `canDeleteMenu` / `fallbackMenuId` reworked (+ new `realMenus()`): holding
  area never deletable and never counts as a real menu; fallback never returns
  it while a real menu exists; the LAST real menu is deletable only when a
  holding area will stand afterwards (already exists, or this menu's dishes
  spawn it) — "holding area alone" is a valid end state.
- **Selector** shows the holding area only while it has dishes (`data-holding="1"`
  attribute for Fable to style — kept last in the list). **Pickers:** the
  Publish modal (`mi_menu`) lists real menus only (you never publish a NEW dish
  into holding); the Edit modal (`ed_menu`) also offers the holding area when it
  has dishes, so a dish there can be moved back OUT.

**Tests:** `tests/menu-fallback.test.js` rewritten (5 → 11) — holding never
deletable / excluded from the count / last-real-menu deletable when holding
stands or dishes spawn it / not deletable when nothing would remain; fallback
never returns holding while a real menu exists and returns it only when it's all
that's left; on-demand creation is idempotent.

## Judgement calls

- Item 1 heal lives in `bootstrapSync` + the publish path; still no offline write
  queue (bigger, out of scope). The heal MERGES rather than replaces — a
  deliberate change to a load-bearing sync path, so the merge logic is a pure,
  unit-tested helper rather than inline soup.
- `reconcileLocalOnly` respects `deletedMenuIds` tombstones for dishes so a
  deliberately-deleted dish isn't resurrected. **Plates have no tombstone list**,
  so a plate hard-deleted on another device while surviving locally could
  reappear on reload. Judged the lesser evil vs. losing an unsynced plate; flagged
  here rather than inventing a plate-tombstone system unasked.
- Whether `menu_items.menu_id` is FK-enforced against `menus` server-side is
  UNKNOWN from here. Designed defensively (push the holding `menus` row first;
  self-heal it locally) so it's correct either way.
- Kept `HANDOVER-v40.md` in the repo root (didn't move it); new handovers go in
  `handovers/` per CLAUDE.md.

## Needs Max's phone / branch preview (NOT verifiable here — no browser)

**Export a JSON backup (Settings → Export) before testing on real data.**

1. **Item 1 (existing menu):** build a plate, Publish it to an EXISTING menu →
   no `plates_menu_id_fkey` error. Reload → the dish + its cost survive.
2. **Item 1 (heal):** if you can, go offline, create a dish, come back online,
   reload → the dish should NOT vanish (old build would lose it).
3. **Item 2 (delete → holding):** with ≥2 menus, delete one that has dishes →
   single confirm naming "Unassigned dishes" → dishes appear under "Unassigned
   dishes" in the selector; the deleted menu is gone and does not return after
   reload.
4. **Item 2 (move back / disappear):** edit a dish in "Unassigned dishes",
   move it to a real menu → when the last one leaves, "Unassigned dishes"
   disappears from the selector.
5. **Item 2 (last real menu):** deleting the last real menu while dishes exist
   should leave you on "Unassigned dishes" (valid end state); the holding area
   itself shows no Delete button.

### Read-only orphan diagnostic (paste in the browser console on the preview)

Confirms whether orphaned local `menu_items`/`plates` exist (Item 1's root
cause). Read-only — writes nothing:

```js
(async () => {
  const mi = await SUPA.from('menu_items').select('id');
  const haveM = new Set((mi.data || []).map(r => r.id));
  console.log('orphan menu_items (local-only):',
    customMenu.filter(c => c.custom && !haveM.has(c.id)).map(o => ({ id: o.id, name: o.name })));
  const pl = await SUPA.from('plates').select('id');
  const haveP = new Set((pl.data || []).map(r => r.id));
  console.log('orphan plates (local-only):',
    savedPlates.filter(p => !haveP.has(p.id)).map(p => ({ id: p.id, menuId: p.menuId })));
})();
```

If either list is non-empty, the orphan hypothesis is confirmed; a reload on the
v42 build re-pushes them (heal) and the FK errors stop.
