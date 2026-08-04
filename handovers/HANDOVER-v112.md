# HANDOVER v112 — cross-referencing writes: the two sequencing defects

**Branch:** `fix/v112-write-sequencing` · **Base:** `main` at `96c648f` (the PR #52 / v111 merge)
**Date:** 5 Aug 2026 · **Brief:** `~/Downloads/ezplate-opus-write-sequencing.md`

Two outstanding items from v111's CodeRabbit review, both in the plate/dish linking area, both the same
class: a write that references another row is not sequenced against the write that creates or removes it.

**The headline is that the brief was half wrong, and finding that out was most of the work.** Defect 1
was real but **unreachable** — no user could trigger it. Defect 2 was real, live, and I reproduced its
failure against the production database from the real client.

---

## Defect 1 — `savePlateRestore` — NOT a live bug. Removed as dead code.

### What the brief said, and what is actually true

The brief (written from `CLAUDE.md`, which was written from CodeRabbit's finding) described a compounding
silent failure: a restored dish links to its plate only via `sp.menuId`, `plateToRow` omits `menu_id`, so
the link dies on reload and costing the dish mints a second empty plate.

**Every word of that mechanism is correct. The code cannot run.** Verified four independent ways:

1. `aRow` (`js/app.js:5978`) takes a 5th `pid` argument that emits `data-pid` on the row. It has
   **exactly one call site** (`js/app.js:6023`), which passes three arguments. `pid` is always
   `undefined`, so `data-pid` was never emitted on any menu row.
2. `openPlateEdit` had exactly one call site (`js/app.js:6042`), gated on that never-emitted attribute.
3. `setEditMode('plate')` was called only from inside `openPlateEdit`, so `editKind` was only ever
   `'menu'` and `onEditSave`'s `editKind==='plate'` branch never ran.
4. `handovers/HANDOVER-v55.md:33` already recorded it: *"Dead post-v55 (unreachable, left for later
   cleanup): `openPlateEdit`/`savePlateRestore`/…"*.

**Why v111's dead-code sweep missed it, and this is the durable lesson:** `savePlateRestore` **is**
referenced by name from live code (`onEditSave`). A reachability closure over NAME references keeps it
alive. Only the DATA flow — one argument never passed, three frames up — shows it is dead. v111's own
lesson was "re-run a reachability closure AFTER removing duplicate definitions"; this batch adds that
name-reachability is not enough on its own.

### What was removed (Max's call — option A of three)

| Removed | Was at | Why |
|---|---|---|
| `openPlateEdit` | `app.js:6284` | unreachable entry point |
| `savePlateRename` | `app.js:6299` | only reachable through it |
| `editRestoreToMenu` | `app.js:6308` | ditto |
| `savePlateRestore` | `app.js:6318` | **defect 1** |
| `editPermDeletePlate` | `app.js:6333` | **a worse landmine — see below** |
| `setEditMode`'s plate branch + `editKind` + `edRestoreMode` | `app.js:6267`, `6193` | only the plate mode used them |
| `aRow`'s 5th `pid` param and its `data-pid` branch | `app.js:5978` | never passed by anyone |
| `plateIdOf`'s third branch | `app.js:1087` | see below |
| `#ed_plateActions` markup + its CSS rule | `index.html:479`, `style.css:702` | only that mode showed it |

**The capability is not lost.** Publishing an unpublished plate to a menu works through the live path:
Plates tab → Publish → `openManageMenus` → `openPublishModal` → `submitMenuItem`, which sets a real
`plateId` and already sequences the writes with `dbPushMenuAfterPlate`. The dead block was a duplicate,
worse implementation of a feature that already works properly.

### `editPermDeletePlate` was the more dangerous of the two

It deleted a plate with **zero dish cleanup** — a *deterministic* FK violation, not a race. It sat in the
same dead block, so it never fired. Had the row-click delegate ever been revived, it would have thrown
23503 for any plate on a menu. Removing it closes that door permanently.

### `plateIdOf`'s `sp.menuId` fallback — dead everywhere, not just "in practice"

The brief asked whether this branch had any remaining live caller. It does not, and the reason is
stronger than v111's finding ("dead in practice for server-loaded plates"):

- The **only** writer of `sp.menuId` anywhere in the app was `savePlateRestore:6329`.
- `rowToPlate` (`app.js:172`) does not read `menu_id` at all, so a **server-loaded plate never carries
  `.menuId`** — regardless of what is in the column.
- `plateToRow` does not write it either.

So the branch could only ever fire for a plate that `savePlateRestore` had touched, in that same session,
before any reload. With `savePlateRestore` gone it can never fire. Removed, and
`tests/plates-independence.test.js` now pins the **inversion**: a plate whose `menuId` names the dish must
NOT resolve.

The brief also asked whether persisting `menu_id` on the plate was the alternative fix. It is not, and
would have broken something: `plateToRow` omitting `menu_id` is **load-bearing for v110's restore**
(hard rule 6, pinned by `tests/restore.test.js`).

---

## Defect 2 — `deletePlate` / `doDeleteEverything` — real, live, and fixed

### Reproduced, not theorised

Against the production database:

```
ERROR: 23503: update or delete on table "plates" violates foreign key constraint
"menu_items_plate_id_fkey" on table "menu_items"
DETAIL: Key (id)=(SP_TMP_TEST) is still referenced from table "menu_items".
```

Then reproduced again **from the real client as the `anon` role** (see "Verification" below), which is
the only test that counts under hard rule 10.

### Root cause

`deletePlate:4449` and `doDeleteEverything:6362` each did:

```js
dishesOfPlate(sp).forEach(function(d){ removeMenuItem(d.id); });   // N fire-and-forget DELETEs
dbDeletePlate(id);                                                 // one more, immediately
```

Neither `dbDeleteMenu:6163` nor `dbDeletePlate:233` **returned** its `pushWrite` promise, so the plate
delete could not be chained even if a caller had wanted to. The requests were *dispatched* in the right
order and *committed* in an arbitrary one — a race, which is why it presented as "sometimes broken"
rather than as a bug.

**A test that merely records call order passes against the broken code too.** That trap is called out at
the top of the new test file: what changed is that the plate delete is not *issued* until the dish
deletes have *resolved*, so the ordering tests hold the dish deletes pending and assert the plate delete
has not happened yet. Verified red against the pre-v112 code by temporarily restoring the old body.

### The fix

- `dbDeleteMenu` and `dbDeletePlate` now **return** their `pushWrite` promise.
- `forgetMenuItems(ids)` — `removeMenuItem`'s in-memory half, split out so a caller that must sequence
  the server deletes can drop the rows locally and drive the writes itself. `removeMenuItem` keeps its
  exact behaviour and now returns its promise.
- **`dbDeletePlateAfterDishes(dishIds, plateId)`** — the delete-side twin of `dbPushMenuAfterPlate`.
  Deletes every dish, confirms they all landed, *then* deletes the plate. Reports **per-dish** outcomes,
  because the caller has to roll back to the state the server is actually in and a partial failure across
  N dishes is a real outcome, not a binary one.
- `deletePlate` and `doDeleteEverything` route through it.

Writes and deletes are now mirror images: on the way **in** the referenced row lands first (plate, then
dish); on the way **out** the referencing rows go first (dishes, then plate).

### Honest failure (Max's call — the screen must never lie)

The optimistic repaint stays, so the UI is still instant. What waits for the server is the **wording**.

| Outcome | What the user sees |
|---|---|
| All deletes land | "*X* deleted" |
| A dish delete fails | Plate and the failed dish(es) are restored; the plate delete is **never issued**. "Couldn't delete *X* — it has NOT been deleted." |
| Dishes land, plate delete fails | Menu entries stay gone (correct — they really were deleted); the plate reappears in the library. "*X* was removed from the menu, but the plate couldn't be deleted — it's still in your Plates library." |

A dish whose delete *succeeded* is never resurrected, even when a sibling dish failed. `loadedPlateId`
follows a rolled-back plate so the builder is not left pointing at nothing. `pushWrite` has already
toasted the underlying error; the summary toast lands after it and is the last word.

---

## Verification

- `npm test` — **643 green** (626 baseline + 12 new `delete-sequencing` + 5 new `plates-independence`).
- `node -c` clean: `js/app.js`, `sw.js`, all four `api/*.js`.
- jsdom smoke — green.
- Playwright — **94/94**, run alone.
- **CodeRabbit — 0 findings** on the second pass (three on the first; all three fixed, see below).
- **Real client against the real database**, served from the working tree at `localhost:8899` and driven
  from the browser console as the **`anon`** role:
  - old order (plate first, dish present) → **rejected**, exact FK error;
  - v112 order → `{dishesOk:true, failedDishIds:[], plateOk:true}`.
  - Temp rows (`SP_V112_CHECK` / `um_V112_CHECK`) created and removed; production verified back at
    78 plates / 78 dishes with no debris.

**Two pinned contracts changed deliberately, updated in the same commit:**

1. `tests/plates-independence.test.js` — the `plateIdOf` third-branch assertion is now its inversion.
2. `tests/housekeeping.test.js` — two `removeMenuItem` harnesses gained `forgetMenuItems`. The contract
   they pin is unchanged and still passes; only the harness needed the split-out helper.

### CodeRabbit findings (first pass — three, all real, all fixed)

1. **major** — rejected promises in `dbDeletePlateAfterDishes` were not normalised. Its stated mechanism
   was wrong (`pushWrite` catches its own errors and always resolves, so nothing can reject today), but
   **the finding was still worth acting on**: if one ever did reject, the caller's `.then` would never
   run and the UI would sit in the optimistic "deleted" state with no rollback and no word to the user —
   exactly the silent failure v108 removed. Rejection handlers added; the guarantee no longer rests on
   `pushWrite`'s internals. *(The brief warned not to dismiss a finding because its stated cause is
   wrong. This is that case.)*
2. **minor** — `doDeleteEverything`'s no-plate branch did not await its single dish delete, so it claimed
   success before the server confirmed. Fixed to match its sibling branch. CodeRabbit's "avoid deleting
   twice" reasoning was wrong (`removeMenuItem` is exactly `forgetMenuItems` + `dbDeleteMenu`), so
   `removeMenuItem` was kept; only the await and rollback were added. A test covers it.
3. **minor** — the happy-path toast assertion used `/deleted/`, which also matches "has NOT been
   deleted" — it would have passed on the exact outcome it existed to rule out. Tightened.

---

## Record corrections (things `CLAUDE.md` had wrong)

1. **v111's "nothing was lost" for the orphan dish is WRONG.** There is still exactly one dish with no
   plate link (`ummrq8xbur`, "Cheese & Ham Toastie GF") — but there is also an unreferenced plate
   `SPmrq8xbut`, **same name, three real ingredient lines**, ids two milliseconds apart (both
   18 Jul 2026 10:50:45.699/.701). The dish reads as uncosted on the menu while its recipe sits in the
   Plates library. v111 checked only whether a plate pointed *back* via `menu_id` and concluded nothing
   was lost. **Per the brief, the count is reported and no repair was written** — a repair that guesses
   at links is worse than an orphan. Note the plate is *newer* than the dish, so `savePlateRestore` did
   not create this pair; the cause is historical and was not chased further.
2. **There are THREE foreign keys, not two.** `CLAUDE.md` documents `plates_menu_id_fkey` and
   `menu_items_plate_id_fkey`. It omits **`menu_items_menu_id_fkey`** (`menu_items.menu_id → menus.id`,
   **ON DELETE SET NULL**). Consequence: `doDeleteMenu`'s comment claiming its ordering guards an FK
   violation is wrong — with SET NULL that ordering was never load-bearing.
3. **Only ONE FK edge in the whole app can ever error**: `menu_items.plate_id → plates.id` (NO ACTION).
   The other two are SET NULL. The ingredient and supplier-phrase delete paths cross no FK at all.
4. **`public.menus` has RLS disabled** (0 policies); every other public table has it enabled. Practically
   it changes nothing today — every existing policy is `ALL / true / true` for `public`, so the anon key
   already has full access by design — but it will flag in Supabase advisors and it matters at the
   multi-tenant gate. **Not touched** (schema change → Max's call, per the brief).

---

## Deliberately NOT built

- **No repair of the one production orphan.** The brief was explicit: report the count, do not guess.
- **No DB migration.** A delete action on `menu_items_plate_id_fkey` would be a *substitute* for the
  sequencing fix, not an addition — and the app-side fix is the only one that can report a partial
  failure honestly. Handed to Max rather than applied.
- **`menus` RLS** — schema change, out of scope.
- **`edDelArmed` is dead** (`app.js:6193`) — declared and written in three places, never read. Spotted
  while removing its neighbours; left alone under hard rule 5. One line, zero risk, needs a yes.
- Everything in the brief's out-of-scope list.

---

## Needs Max's phone

Nothing in this batch is visual, but two things need a real device:

1. **The delete flow end to end** — delete a plate that is on a menu, and confirm it disappears and stays
   gone after a reload. This is the fix's whole point.
2. **A failed delete's wording** — hard to stage deliberately; if you ever see the new
   "…it's still in your Plates library" toast, check the plate really did come back in the library.

The brief's own device check (restore a plate to a menu, force a reload, confirm it still shows as
costed) **no longer applies**: that path was the unreachable `savePlateRestore`. The equivalent live
check is **Plates tab → Publish → reload → confirm the dish still reads as costed on the Menu tab**.

Carried from before, still unverified on a device: phone sign-off on v108 (especially the ~1,138 ms
cold-start against a boot gate), and the whole v82–v104 UX sequence.

---

## Addendum — 5 Aug 2026, during Max's device check

**Reported:** "ham and cheese toastie gf is costed in plates, I then attached it
to original menu to test delete flow and it doesn't show as costed on the menu."

**Not a v112 defect. The publish worked.** What Max saw was the pre-existing
orphan documented above, made visible by his own test:

| Row | Section | Plate link | Reads as |
|---|---|---|---|
| `ummrq8xbur` (pre-existing) | **Sandwiches** | none | **not costed** ← what he was looking at |
| `ummsf4uldn` (created by his publish) | Uncategorised | `SPmrq8xbut` ✓ | costed |

Two rows of the same name on the same menu, in different sections.

### The real gap this exposed

`submitMenuItem`'s "one entry per (plate, menu)" guard is
`dishesOfPlate(sp).find(...)`, which resolves through `plateIdOf`. **A dish with
no plate link is invisible to it.** So publishing the very plate an orphaned dish
should have been using cannot heal it — it adds a second row instead, silently.
That is the "five plates called Chips" family, it is UNFIXED, and it is the
mechanism by which an orphan could recur unnoticed. Logged as outstanding item
5a; it needs its own brief because "heal vs warn" is a real UX call.

### The repair (Max's explicit yes, option A of three)

```sql
UPDATE menu_items SET plate_id='SPmrq8xbut', source_plate_id='SPmrq8xbut'
 WHERE id='ummrq8xbur';
DELETE FROM menu_items WHERE id='ummsf4uldn';
```

Chose to heal the ORIGINAL row rather than keep the new one: it already carried
the correct `Sandwiches` section and $8 price, and it is the row with the
history. Verified after: one toastie row, `Sandwiches`, $8, linked to a 3-line
plate. **78 dishes / 78 plates, 0 orphan dishes.** The one remaining unreferenced
plate ("chippy") is a legitimately unpublished library plate.

### Spotted while costing it, NOT changed

`Ham Leg Sliced 2Mm (App 1Kg)` (`P0182`) is stored at **$0.0003/g = 30 c/kg**,
almost certainly wrong by ~46×. It makes the toastie read $2.30 (29%, green) when
the truth is nearer $3.70 (46%, amber). Prices are Max's call — flagged as
outstanding item 5b, not edited.

**No code changed in this addendum.** Suite still 643 green; the repair was data
only.
