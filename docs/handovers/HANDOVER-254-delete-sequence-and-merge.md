# HANDOVER - 254 (a menu delete waits for its dishes, and a history point survives the re-sync)

**Branch:** `254-delete-sequence-and-merge` · **Scope:** `docs/QUEUE.md` item 90's two remaining DEFECTS. Its third part is a question for Max and is now the whole of the item.
**Deploy version shipped:** `ezplate-v209`.

## What changed

**Deleting a menu now waits for its plates to come off before it deletes the menu.** `doDeleteMenu` fired one dish delete per plate and the menus-row delete in a single unawaited burst. The dispatch order was already dishes-first, which is exactly the trap: dispatching in order is not sequencing, and a test that records call ORDER passes against the broken code. `dbDeleteMenuAfterDishes` mirrors `dbDeletePlateAfterDishes` — the menus row is not ISSUED until every dish delete has resolved, and if any failed the menu is not deleted at all. `rollbackMenuDelete` puts back exactly what the server still holds.

⚠️ **THE ITEM CALLED THIS THE MILDER CASE AND IT IS THE WORSE ONE.** *"No FK to violate… so this is the v112 sequencing class rather than a 23503 risk"* reads as reassurance. `menu_items.plate_id` is NO ACTION and fails **loudly**; `menu_items.menu_id` is ON DELETE SET NULL — checked against production, `confdeltype 'n'` — so deleting the menus row early does not error. **Postgres detaches the in-flight dish for you**, and if that dish's own delete then fails the row survives on no menu, on no screen, with nothing raised anywhere. An error would have been the good outcome.
**Measured on production while fixing it: 90 `menu_items` rows, 0 orphaned.** Latent, not damage already done, and worth saying which.

**A cost-history point logged with no signal is no longer wiped by the next sync.** `priceHistory` replaced wholesale at boot while both siblings merged. `mergeSeries` is extracted from `mergeMenuHistory` so one function serves both shapes.
⚠️ **The old comment's "exists only in localStorage" was the misleading half, not the deferral.** `priceHistory` is written there by nothing, so the window is not "until the next reload" — it is until the next `bootstrapSync`, which the `online` listener re-runs. **Narrower and more reachable:** log a point with no signal, signal returns, the re-sync wipes it, inside one session with the app open.

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item. **One finding, a major, and it is a COVERAGE gap rather than a live defect — the harder kind to find and the easier kind to wave through.**

`doDeleteMenu` captures `wasCurrent=(currentMenuId===id)` and the rollback restores the selection from it. **Nothing asserted it, and `doDeleteMenu` was not a mutation target** — I had listed its two new helpers and not the function that calls them, then reported "0 survived", which was true and did not mean what it looked like. The reviewer applied both mutations itself and confirmed all 49 tests stayed green either way. **And it is the COMMON path**: `deleteCurrentMenu` is the only caller and always passes the current menu, so that guard runs on every real delete.

Three behavioural tests now pin it, **one of them asserting the guard's other side** — two tests checking only that the selection comes back would both pass under `if(!wasCurrent)`.

Adding `doDeleteMenu` to the gate **surfaced six more survivors, every one mine and every one in the presentation half**. All the behavioural tests read the state ARRAYS, and a gutted repaint does not touch those — `menuView` agreed with its assertion for the wrong reason. Five killed; one allowance, with its reason, for the hoisted `typeof … === 'function'` idiom.
⚠️ **Adding the target does not fully close it, and `targets.js` says so.** The consuming line carries no operator to flip and is excluded from void-call deletion, so this engine cannot mutate it at all. The gate covers the capture; the tests cover the use.

Full report verbatim: `docs/reviews/REVIEW-254-delete-sequence-and-merge.md`.

## Into CLAUDE.md

**One correction, and it is this file's own "a comment can record the defect CORRECTLY and file it under the wrong consequence" applied to CLAUDE.md itself.**
The FK section said *"`doDeleteMenu`'s dishes-before-menu ordering guards nothing"* and called `plate_id` *"the app's only FK hazard"*. Both are true only if a hazard has to be an ERROR. **`ON DELETE SET NULL` is more dangerous than `NO ACTION`, not less, and it reads as the mild one** — it converts a sequencing bug from a raised exception into a silent state change. The section now says so, with the general form: a referential action that "handles" your mistake has converted an error into silence, and the milder-sounding clause is the one to sequence against.

No new roster bullet. The two test defects this batch produced are both instances of shapes already recorded (183(a), and 184(a)'s two settle paths) — the roster records new SHAPES, not every instance.

## New docs/QUEUE.md items

None. **Item 90 is now `blocked` and its remaining content is one question**, with the cost corrected — see below.

## New docs/PHONE.md items

None. The two toast changes were measured at 380px in both themes rather than left for a device check.

## Probe

**What did the item tell you to do that you would have done differently?**
It framed the menu delete as the *milder* of the two sequencing bugs because no foreign key can raise. That is backwards, and the fix is shaped by the correction: the reason to sequence here is not to avoid an error, it is that there is no error to avoid.

**What did you not propose because it was out of scope?**
Bounding the merged `priceHistory` at boot. `logHistoryPoint` caps at 500 after a push, and merging can exceed that until the next point lands. The reviewer checked and found the cap was already unenforced at boot before this diff, so this is pre-existing and unchanged, not something the merge introduced. Not filed: it self-corrects on the next logged point.

## Surprises

**A test passed on my own explanation of its violation.** The census asserting `doDeleteMenu` still calls `removeMenuItem` stayed GREEN after I deleted that call — because the commit's own comment quoted the deleted line to explain what had gone. Roster 183(a), reached from the inside: a source grep searches PROSE, and here the prose was written by me, in the same edit, saying the same words. It now strips comments through a shared helper, which replaced a second copy that already existed in `tests/inv-upload.test.js` and whose comment already stated this exact reasoning.

**The browser drive earned its place, and not for the thing it was run to check.** The sequencing was already right. What it found was that two toasts were too long — measured, not judged: the toast is 190px wide at 380px, and the first draft of the rollback message wrapped to **137px, six lines on a phone**. Both are now 92px, matching the existing success toast.
And one of them said the same thing twice — *"Couldn't delete X — it has NOT been deleted"*. I had copied it from `rollbackPlateDelete`, where the two halves are DIFFERENT objects (the dish went, the plate did not). Here the subject is one object, so the second clause was pure length. **A borrowed string carries the reason it was written**, which is 247/248's citation rule wearing a different hat.

**Backticks inside a `new Function` template literal, for the fifth time this session.** It fails loudly at require time and costs a minute, so it is still not worth a rule — but `tests/plates-independence.test.js` already carries a comment in that very file saying *"No backticks - this sits inside a template literal"*, and I wrote them ten lines above it.
