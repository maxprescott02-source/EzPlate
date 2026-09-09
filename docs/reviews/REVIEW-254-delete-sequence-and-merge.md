# REVIEW-254 — a menu delete waits for its dishes, and a history point survives the re-sync

Reviewed-commit: 9a4b5dab4eb9cad78adae675ee06ed6c179abf2d

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the branch diff and told which two changes to focus on, and **not** the queue item — so it judged whether the code is correct, not whether it matches what was asked.

**One finding, a major, and it is a coverage gap rather than a live defect — which is the harder kind to find and the easier kind to wave through.**

The reviewer did what the finding demanded before reporting it: it applied both mutations itself and confirmed all 49 tests stayed green either way. That is the difference between "this looks unpinned" and "this is unpinned", and it is why the finding could be acted on immediately instead of being re-derived.

---

## The report, verbatim

> ## Summary
>
> The two focal changes are correct. I traced every failure combination named in the prompt (partial dish failure, all-dishes-fail, dish-rejects, menu-row-fails, menu-row-rejects, zero dishes, current-menu deleted, last-menu deleted) by hand and by instrumented execution, and the in-memory/server reconciliation is right in each case, including the `currentMenuId` restore on rollback. The `mergeSeries` extraction is behavior-preserving for `mergeMenuHistory` (verified by tracing the seen-set/dedup/sort semantics and by running the existing + new tests). I did not find a wrong condition or a silent-loss bug in the code itself. One real, mechanically-confirmed gap stands out; everything else below is minor.
>
> ## Findings
>
> **1. Major (category 5 — untestable guard) — `doDeleteMenu`'s `currentMenuId` restore is asserted nowhere, and is invisible to both the unit suite and the mutation gate.**
>
> `doDeleteMenu` (`js/app.js`, the function starting at line 13974) captures `wasCurrent=(currentMenuId===id)` and, on rollback, `rollbackMenuDelete` does `if(wasCurrent) setCurrentMenuId(menuRec.id);` (line 13954). In the shipped app this is not an edge case: `doDeleteMenu`'s only caller, `deleteCurrentMenu()`, always passes `id=currentMenuId`, so `wasCurrent` is `true` on every real invocation — this is the entire mechanism by which the current-menu selector recovers after a failed delete.
>
> Nothing pins it:
> - No test in `tests/delete-sequencing.test.js` or `tests/plates-independence.test.js` asserts `currentMenuId` after a call, even though both harnesses expose it in their returned state (`plates-independence.test.js` even sets `currentMenuId: 'MW'` — matching the deleted menu, the realistic case — in two tests and never reads it back).
> - I confirmed this is exploitable, not theoretical: inverting the guard to `if(!wasCurrent) setCurrentMenuId(menuRec.id);`, and separately deleting the line outright, both leave all 49 tests in those two files green.
> - `doDeleteMenu` itself was never added to `tests/mutation/targets.js` (only its two new helpers, `dbDeleteMenuAfterDishes` and `rollbackMenuDelete`, were) — `node tests/mutation/run.js --target=doDeleteMenu` reports "nothing in scope." So the `wasCurrent=(currentMenuId===id)` capture is never mutated by CI's gate at all.
> - Even if it were targeted, the consuming line inside `rollbackMenuDelete` — `if(wasCurrent) setCurrentMenuId(menuRec.id);` — is structurally unmutatable by this repo's engine: it has no comparison/logical operator and no `!` to flip, and it's excluded from void-call deletion because the line starts with `if` (`NOT_A_CALL` in `tests/mutation/mutate.js`). I confirmed this directly: `mutantsFor` on `rollbackMenuDelete` produces exactly 7 mutants, none touching that line.
>
> So the "28 mutants, 28 killed, 0 survived" the batch's own `npm run mutate` would report for this diff's new targets is real but doesn't cover the one behavior that actually matters to a user watching their menu selector after a failed delete. I manually verified the *current* code is correct (both the success-path fallback and the failure-path restore land on the right menu id), so this is a coverage gap rather than an active bug — but it's exactly the shape CLAUDE.md's own roster warns about repeatedly: a guard whose condition nothing can catch going wrong.
>
> How to verify: `node tests/mutation/run.js --target=doDeleteMenu` → "nothing in scope"; hand-apply either mutation above to `js/app.js` and re-run `node --test tests/delete-sequencing.test.js tests/plates-independence.test.js` → all green either way.
>
> **2. Minor/nit — comment overstates what the census in `tests/mutation/targets.js` buys.**
>
> The new targets.js entry says `mergeSeries` is "listed separately from its sibling [dbDeleteMenuAfterDishes]" for a stated reason, and generally the batch's comments (in CLAUDE.md and in `js/app.js`) present "28 mutants, 0 survived" implicitly as full confidence in the new sequencing code. Given finding 1, that confidence doesn't extend to `doDeleteMenu` itself. Not a defect in the shipped behavior, just a case worth flagging since this project explicitly tracks "a check that finds nothing has only proved something about what it looked for."
>
> **3. Nothing wrong found in:**
> - `dbDeleteMenuAfterDishes` — correctly mirrors `dbDeletePlateAfterDishes`; the menu row is never issued until all dish deletes resolve, and a partial dish failure correctly leaves the menu untouched (avoiding the SET NULL hazard the comment describes).
> - `rollbackMenuDelete` — correctly restores only failed dishes (never resurrects a dish whose delete landed), restores the menu record at its original index (not appended), and reports an honest partial-success count in the toast.
> - `mergeSeries`/`mergeMenuHistory` — the extraction is behavior-preserving (verified by tracing the union-of-keys/seen-set/sort logic and by running the full test suite); no mutation of inputs; string/numeric timestamp equivalence via `ptMs` is preserved.
> - The `priceHistory=mergeSeries(_all, priceHistory)` boot-time change — consistent with the existing `menuHistory` merge precedent; no new interaction found with the 500-point cap (which was already unenforced at boot before this diff) or with `logHistoryPoint`'s dedup (array stays time-sorted).
> - The FK/`ON DELETE SET NULL` comment correction in `js/app.js` and `CLAUDE.md` is internally consistent with the rest of the file's own documented FK list.
> - `noComments` dedup between `tests/_extractfn.js` and `tests/inv-upload.test.js`, and the fixed `removeMenuItem`-caller census (verified the "3 real call sites, tombstone comment excluded" claim directly against the source).
> - All six cache-version spots agree (`ezplate-v209` everywhere `tests/settings.test.js` checks).
> - Full suite: 2092/2092 passing; all changed/added tests fail when their guarded condition is broken (verified by hand-mutation for the delete-sequencing and dash-scope tests), except for the one gap in finding 1.

---

## What was done about it

**Finding 1: FIXED, both halves, and the finding is right about all three of its claims** — the defect, the mechanism, and the remedy.

Reproduced its two mutations exactly as described before changing anything, then a third of my own (`wasCurrent=(currentMenuId!==id)`). All three were green. All three are now red:

| mutation | before | after |
|---|---|---|
| `if(!wasCurrent) setCurrentMenuId(...)` | green | **killed** |
| the restore line deleted outright | green | **killed** |
| `wasCurrent=(currentMenuId!==id)` | green | **killed** |

Three behavioural tests, and the third exists **because** of the inversion: two tests asserting only that the selection comes back would both pass under `if(!wasCurrent)`, so one of them asserts the guard's OTHER side — that a rollback does *not* drag the user to a menu they were not looking at.

`doDeleteMenu` is now a mutation target. **That surfaced six more survivors, every one of them mine and every one in the presentation half** — the change-log entry's `name`, the toast's pluralisation, the optimistic repaint, `repaint()` itself, and `repaintDashboardIfVisible()`. All the behavioural tests read the state ARRAYS, and a gutted repaint does not touch those: `menuView` agreed with its assertion for the wrong reason, because MENU simply kept what the harness had seeded. Reading the rendered view after a **success** is what separates them. Five killed with assertions; one allowance written.

**The one allowance is `typeof renderPlatesTab==='function'`**, the file-wide optional-call idiom. `renderPlatesTab` is a hoisted top-level declaration, so the two branches differ only in a world where the repainter does not exist. Killing it would mean asserting a repaint happened in that world.

**Finding 2: ACCEPTED, and the comment it names now says the opposite of what it said.** The `targets.js` entry records that adding `doDeleteMenu` does **not** fully close the gap — the consuming line carries no operator to flip and is excluded from void-call deletion, so this engine cannot mutate it at all. The gate covers the capture; three tests cover the use. The reviewer's own framing is quoted there, because it is this repo's oldest rule arriving inside the tool built to enforce it.

## Found by the browser drive, not by the review or the suite

Driving the real page at 380px in both themes, with the server writes stubbed so production was never touched:

- **the sequencing is right in a browser** — `dish:D1 -> dish:D2 -> menurec:MW`, and on a refused dish the `menurec` write is **never issued**, which is the whole point: had it been, `SET NULL` would have detached the surviving dish silently;
- **the menu comes back at its original index** — `MO,MW,MS`, not appended;
- **two toasts were too long.** Measured, not judged: the toast is 190px wide at 380px, and the first draft of the rollback message wrapped to **137px — six lines on a phone**. Both were shortened and re-measured at **92px**, the same height as the existing success toast.
- One of them also said the same thing twice — *"Couldn't delete X — it has NOT been deleted"*. That phrasing is right in `rollbackPlateDelete`, where the two halves are different objects (the dish went, the plate did not); here the subject is one object, so the second clause was pure length. **A borrowed string carries the reason it was written**, which is this file's own citation rule wearing a different hat.

**Verification after every fix:** `npm test` 2099 pass · `npm run smoke` pass · changed-scope gate 94 mutants, 93 killed, 1 survived with a written allowance · `npx playwright test` 478 passed / 14 skipped / 8.6m against the committed tree.
