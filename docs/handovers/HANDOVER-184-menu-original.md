# HANDOVER - 184 (MENU_ORIGINAL)

**Branch:** `fix/184-menu-original` · **Scope:** queue item "`MENU_ORIGINAL` - the LAST semantic key", both defects it carried.
**Deploy version shipped: `ezplate-v160`.**

## What changed

A brand-new cafe can save its first dish.
Before this, publishing with no menu wrote `menu_id='MENU_ORIGINAL'` against `menu_items_menu_id_fkey`, and `ensureDefaultMenu` seeded that id into memory without ever pushing the row.
`ensurePublishMenu` now creates "Original menu" as a real row at the point of first need, confirmed before the dish write is issued, the same law as `dbPushMenuAfterPlate`.
Zero menus is still a legitimate state at boot; nothing seeds on load.

Two cafes cannot collide on a menu id.
`ensureDefaultMenu` mints `uid('MENU')`, and the literal is gone from `js/app.js` entirely.

Both row mappers stopped fabricating an id.
`rowToMenu` and `menuToRow` pass null through in both directions; a null column is a value, a nonexistent id is a foreign key violation.

The twenty `(m.menuId||'MENU_ORIGINAL')` spellings became one resolver, `menuIdOf`, which is the shape `plateIdOf` already has for the other axis.

**No migration.** The item said `menus.id` is referenced by two foreign keys, so scoping it would mean composite FKs.
Counted in `pg_constraint`: it has exactly ONE, `menu_items_menu_id_fkey`.
`plates.menu_id` references `menu_items(id)`, not `menus(id)` - `CLAUDE.md` says so correctly and the item did not.
Every user-created menu already carried a random `uid('MENU')`, so the hard-coded seed was the only value that could collide, and removing it closes the collision with no schema change.

Rehearsed on staging at zero menus, driven over PostgREST as the anon client: both publish paths landed on a minted `MENUmsrfq6p7-1-0zx44pgl` with dishes linked to their plates, no console errors.
Staging is left holding 1 menu and 2 dishes against 180 plates; it is disposable and the next seed run wipes it.

## The pre-push review

Three findings, all real, all fixed in this branch.
It ran on a different model and was not shown the item.

1. **The batch's own guarantee had a hole, on the entry point a new cafe uses first.**
   `openPublishModal` refuses at zero menus and diverts to the new-menu modal, so `withPublishMenu` never sees that state from the Publish button.
   `submitNewMenu` then pushed onto `menusList` and **dropped the write's promise**, so a menu the server REFUSED stayed in memory - and `withPublishMenu` decides whether to create one by asking `menusList.length`.
   Every later dish would have been waved through against a menus row that does not exist.
   Fixed at the root: `menusList` now means "menus the server has", because `submitNewMenu` puts back anything the server did not keep, which is the same law the delete paths already follow.
2. **Removing the fallback INTRODUCED a null match.** `menuIdOf(m)===currentMenuId` is `true` when both are null, so an orphaned dish read as being on the no-menu at exactly the moment the screen should be empty.
   The old spelling could not do this, because its left side was always the truthy string.
   Fixed with one named comparison, `dishOnMenu`.
   The review found ONE site; a guard test written for the fix found **seven more** and all are converted, so a bare `menuIdOf(x)===` now fails the suite.
3. **`ensurePublishMenu`'s first branch is unreachable from the app**, because `withPublishMenu` short-circuits first.
   Correct, and kept deliberately: the duplication is what keeps the common path synchronous while leaving the function total.
   Written at the site rather than silently left.

## Into CLAUDE.md

Made under the standing authority; reported rather than parked.

- **New Tier 1 trap: "A FOREIGN KEY is checked with RLS OFF, so a cross-tenant reference SUCCEEDS instead of erroring."**
  This is the half of the defect that is worth keeping.
  Before 182 the bad write was `23503`, which is loud.
  After 182 it is silent: FK validation runs as the constraint owner and does not apply RLS, so a second cafe's dish is accepted against Scoopy's menu row, a row that cafe then cannot read.
  Saved, no error, invisible forever.
  The transferable rule is that a foreign key does not confine a reference to your own tenant even though every other operation on that table is scoped, and the symptom to recognise is a row that saved without error and is invisible.
- **The could-not-fail roster went 16 to 18**, with 184(a) and 184(b).
  184(b) is the one worth reading and it is not about tests: the round-trip fixture set `plateId` and `sourcePlateId` to the SAME value, so `(item.plateId||item.sourcePlateId)` could not be distinguished from either half, and flipping the `||` to `&&` - which drops the plate link on every dish written since v55 - stayed green. **A fixture whose fields agree cannot tell you which one the code read.**
  Also recorded there: 184 is the first pair the MECHANISED gate found rather than a hand-run mutation, and 184(b) had been unable to fail since v55. The lesson is about the target LIST, not the gate.
- **One line added to the existing mutation-by-hand rule: assert that the mutation CHANGED THE FILE.**
  A hand-written `perl -0pi` whose pattern does not match edits nothing, the suite is green because the code is untouched, and the harness reports SURVIVED.
  It happened twice in this batch, both on multi-line patterns containing curly quotes, and the second one nearly earned a test for a defect that was never there.
  It sits next to the existing `cp`-not-`git checkout` rule because it is the same harness and the opposite failure: that one reports false greens, this one reports false alarms.

## New docs/QUEUE.md items

None.
The finished item is deleted.
The onboarding item's copy of the "cannot save its first dish" defect was marked fixed in place rather than deleted, because it was deliberately stated in both items, and it gained one real finding: the builder's "Add to a menu" dead-ends at zero with *"create one on the Menu tab first"* while the Menu tab's Existing-plate button now silently makes one.
Neither is wrong, they disagree, and a new cafe meets the discouraging one first.
That is an empty-state decision and it belongs to that item.

## New docs/PHONE.md items

None.
The only new user-visible surface is one error string in the two existing modal error boxes, and it was driven in a real browser in both themes.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Two things, and the first changed the whole shape of the batch.
The item framed the work as a design decision about composite foreign keys, on the stated premise that `menus.id` is referenced by two of them.
It is referenced by one, and `plates.menu_id` points somewhere else entirely.
Once that is measured there is no design decision left: the literal is the only colliding value, minting it closes the collision, and the batch is client-only with no migration at all.
The item also called the second defect "a brand-new cafe cannot save its first dish", which is true but understates it.
Since 182, the same write no longer fails - it succeeds against another tenant's row, because a foreign key is validated with RLS off.
An error would have been the good outcome.

**What did you not propose because it was out of scope?**
Three.
`doDeleteMenu` still fires its dish deletes without awaiting them, so a menu delete that half-fails leaves an orphan dish; the code says so at its own site and it is pre-existing.
The two disagreeing zero-menu empty states, which went to the onboarding item.
And Scoopy's own `menus` row keeps its `MENU_ORIGINAL` id - rewriting a live id means chasing every reference for no benefit, which is the trade the `uid()` header already declined once.

## Surprises

**The Publish modal is not reachable at zero menus, and I only learned that in the browser.**
It opens from a per-menu row inside Manage-menus, so with no menus there is no button.
The reachable path is the Menu tab's Existing-plate button, and reading the code alone would have had me confident about the wrong one.
Both are wired through the fix, but only one of them was ever the bug.

**A test I had just written, and had just mutation-checked, still could not fail.**
The retry test resolved the write with `{error}`, which is the fulfilled path, so the rejection arm's memo clear was unpinned and deleting it stayed green.
supabase-js resolving with `{error}` rather than rejecting is exactly why that arm exists and exactly why the test missed it.
Caught by running the mutation, in the same hour as writing the test that was supposed to be the careful one.
