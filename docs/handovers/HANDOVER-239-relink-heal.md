# HANDOVER - 239 (the relink heal)

**Branch:** `fix/relink-bare-pid-heal` · **Scope:** `docs/QUEUE.md` item 16, the consolidated backlog's item 16. **Shipped `ezplate-v197`.**

## What changed

Settings, under Data, has a row called **"Fix older plate lines"**.
It is HIDDEN unless there is something to fix, and its button reads "Fix" while there is, "Show" once all that is left is lines nothing can decide.
Pressing it shows a confirm that states the size of the fix, says that nothing costs a different amount afterwards, and lists every line it will NOT touch, grouped by product with the plates each one is in.

What the heal does: a legacy `{pid,qty}` plate line becomes `{kid,qty}` wherever **exactly one** kitchen ingredient owns that product.
It moves no cost at all, because the ingredient it writes already points at the product the line already had; what changes is that a later relink now reaches the line, which is the whole item.
One `dbPushPlate` per touched plate, one `plate_relinked` change-log entry per plate the SERVER TOOK, and that plate's lines put back if the write is refused or rejected.

The ingredient modal stopped over-promising: "Used in N saved plates - changing the product updates all of them" now says, when it is true, "M older lines point straight at this product and won't follow - Settings, under Data, fixes that."

`tests/visual/_boot.js` serves the `kitchen_ingredients` app_settings row from `cafeDB_king`, so a browser spec can seed kitchen ingredients for the first time.

## Rehearsed, offline, against the real data

The heal writes production `plates` rows, so the item said to rehearse it.
Staging cannot answer the question that matters (its data is invented), so it was rehearsed by pulling the real rows READ-ONLY through the Supabase MCP and running the real extracted functions over them in Node.
**103 plates, 31 lines rewritten across 11 plates, 13 lines across 9 plates refused, and ZERO of the 103 plate costs moved.**
The 31/13 split matches what SQL says independently.
Nothing was written to production; running it there is Max clicking the button.

## Review

The pre-push `code-review` agent, on Sonnet, with no sight of the item.
`docs/reviews/REVIEW-239-relink-heal.md` has the report verbatim.

**One finding, critical, and it was right about the defect, the mechanism AND the remedy.**
`applyBarePidHeal` re-checked the line's SHAPE between the confirm and the write, and the shape is not the condition the safety argument rests on.
The plan is built when the confirm opens and applied when it is pressed, and `bootstrapSync` replaces both `kitchenIngredients` and `savedPlates` in between whenever the `online` listener fires.
So a relink arriving in that window puts a line on a product the user never agreed to: a real cost change, no error, and a change-log entry whose figures are null by design, so nothing on any screen could notice.

Fixed by extracting `barePidSameProduct` - the ingredient about to be written already points at the product the line already points at - and calling it at the write, so the plan's own proof is made again at the moment it matters.

**The finding understated itself, and the extra half was found by writing its repro.** The same window also breaks the plan's INDICES: `bootstrapSync` hands back a plate whose lines are in a different order, `moves[i]` then names a different bare-pid line, its shape is unchanged, and the shipped check passed it.
Same wrong cost by a second route, and likelier than the relink one because it needs no second device.
The identity check closes both, because it asks about whatever line is at that index now.

Three tests added, and `barePidSameProduct` is on the mutation gate. A fourth fix came out of writing them: an entirely stale plan wrote nothing and SAID nothing, which reads as success.

## Into CLAUDE.md

One rule added, under Tier 3's Migrations section: **a bulk rewrite from the client is not a migration, so none of the seven steps reaches it - rehearse it offline against the real data, writing nothing.**
Pull the rows read-only through the MCP, extract the REAL functions with `tests/_extractfn`, run the plan and the apply in Node, and compare the figure before against the figure after for every row rather than a sample.
The extraction is what makes it evidence; a hand-rolled copy of the costing walk would agree with the code whether the code is right or not.

## New docs/QUEUE.md items

- **88 - Thirteen plate lines cost off a product no ingredient uses.** Item 16's own measured harm, which its stated remedy could not reach: six products, nine plates, all on the live October menu. The app now NAMES them in the confirm; what is missing is the app ASKING which ingredient each product should become, one choice per product. Full item in the consolidated file.
- **`project-audit`** is at the top of the queue: `AUDIT-v186` is the newest report and this batch shipped `v197`, a gap of 11.

Two riders taken because this batch opened the files: the `_boot.js` maintenance entry gained its fourth instance (and the widening that `emptyOk` is not the whole list), and `v136-theme.spec.js`'s stated limit had the wrong reason written into it.

## New docs/PHONE.md items

None. The row and the confirm were driven at 380 and 1280 in both themes, and the seven browser assertions are in `tests/visual/239-bare-pid-heal.spec.js`.

## Probe

**What did the item tell you to do that you would have done differently?**

Two things, and both are corrections rather than preferences.

1. The item says to log "one `menu_change_log` entry per plate **so the Dashboard can show it**". The Dashboard cannot and must not: Recent changes requires a cost delta of at least a cent, and the heal moves no cost by construction. The entries are written anyway - a bulk rewrite of plate rows should leave a trace - but with every figure NULL, because a non-null `avgAfter` would reset the since-line's "since you last acted" clock for an intervention that intervened in nothing. That is the same reason a rename does not log one.
2. The item says `platesUsingKid` under-counts and should count both arms, and names `tests/king-rows.test.js:70-79` as pinning "the opposite". It pins something correct. That count is exactly what a relink heals, and widening it would make the same sentence false in the other direction - promising a fix to plates a relink still cannot reach. The item allowed either arm of its own disjunction ("counts both arms **or says which it counts**") and this takes the second: the count is unchanged and the modal now names the other arm beside it. The test is untouched.

**What did you not propose because it was out of scope?**

The thirteen lines the heal refuses are the mis-costing the item actually measured, and listing them is all the item asked for. Assisted repointing - the app asking "which ingredient is this?" once per product and applying the answer to every line - is queued as item 88 rather than built here.

## Surprises

- **The safety argument turned out to be an identity, not an approximation.** `{pid:P}` -> `{kid:K}` where `K.pid` is already `P` resolves through `lineProduct` to the same product on both sides, so every cost is bit-identical afterwards. That is what made an offline rehearsal over the whole production dataset a proof rather than a spot check.
- **Zero of the 44 bare lines are ambiguous.** The plan's two refusal reasons are "no ingredient owns it" and "two do"; production has 13 of the first and none of the second. The second branch is still built and tested, because one relink is all it takes to create one.
- **The confirm-to-apply window is a real gap and I did not see it.** The plan closure looked obviously fine because the re-check was already there; it was checking the wrong thing, which is this repo's most-recorded shape (a guard that recomputes the write's answer, one function apart) arriving in a batch whose author had just written that sentence into `CLAUDE.md`'s neighbourhood.
- **Relinking an ingredient onto an orphaned product makes its refused lines fixable again**, which briefly read as the heal not having run. It is correct behaviour and the browser spec now says so at the assertion that tripped over it.
- `savedPlates` and `kById` are top-level `let`, so they are not on `window` and a spec reaching for `window.savedPlates` throws rather than fails. `tests/visual/228-plate-heal.spec.js` had already written that note down; it cost half an hour anyway.
