# HANDOVER - 228 (an unlinked dish finds its real plate)

**Branch:** `fix/relink-existing-plate` · **Scope:** `docs/QUEUE.md` item 7, "`ensurePlateForDish` starts a second empty recipe instead of relinking the real one". **Shipped `ezplate-v187`.**

## What changed

Costing a dish whose plate link was lost now looks for its plate by name before minting an empty one.
Exactly one match relinks; several open a picker; none does what the app always did.
That is Max's answer of 9 Aug 2026, verified at its source rather than taken from the item.

`plateHealPlan` is the decision, pure, in `publishPlan`'s idiom, with four named outcomes rather than a boolean, because "found none" and "found several" are different answers that a two-valued return collapses into the same silent create.
`loadMenuItemBlank` computes it once and hands it to `ensurePlateForDish`, so there is no second computation of a write's own decision.

Three things the item did not say, each found by checking rather than planning off it.
A candidate already backing a dish on THIS dish's menu is excluded, or a relink would put two dishes of one plate on one menu.
The comparison goes through `dishOnMenu` rather than a bare `===`, because a dish on no menu has a null id and `null===null` would read two unmenued dishes as sharing a menu.
And "recipe" is a forbidden object noun, so every string in the new modal says plate.

`dishLinkedToast` is extracted and three-valued.
It claimed *"is now costed from this plate"* for every link, including a plate with no lines at all and one whose lines cannot all be resolved, where the total understates itself.
That was live on the publish path too, and `publish-guard`'s own fixture is an empty plate, so its test was pinning the wrong message.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, on the branch diff, without the item.
**No critical or major findings**, three notes it had looked at hard. `docs/reviews/REVIEW-228-plate-heal.md` has the report verbatim and the decision on each.

One produced a change and it is the useful one.
My `create`-branch comment said the change log is skipped because an empty plate has no cost movement to explain, and the relink branch logs `dish_linked` unconditionally because it delegates to the shipped linker.
The two branches never shared that principle, so the comment implied a guarantee the code does not make.
The agent traced why it is harmless — `avgFoodCostForScope` drops any plate with `miss!==0`, so nothing numeric moves — and that trace is kept at the site rather than the wrong claim.

It also hand-mutated three of the new guards independently and got the same reds this batch got.

## Into CLAUDE.md

**Nothing.**
The comment finding is an instance of the section added in batch 227, not a new shape, and the roster's instruction is to add a bullet only when the shape is new.
The duplicate-definition collision is the oldest rule in the file working exactly as written; recording it again would be a tally, not a rule.

## New docs/QUEUE.md items

**None, and item 7 is deleted.**
Nothing was found that passes the tier test.
One line was added to the design-law section: `.ad-list` / `.ad-item` / `.ad-nm` / `.ad-meta` are worn by TWO pickers now, the Add-dish modal and the plate-heal modal, so an F-item cannot delete them on the strength of a grep.

## New docs/PHONE.md items

**None.**
The picker was driven at 380 and 1280 in both themes with no console errors, and the state it needs cannot occur in production — `CLAUDE.md` records that no path creates an unlinked row and production has zero.

## Probe

**What the item told me to do that I would have done differently.**
Nothing about the requirement, which was Max's and settled.
Two things about the item's framing.
It said "exactly one match relinks automatically" without saying which plates are eligible to match, and the eligible set is the whole question: a plate already used by another dish on the same menu must not be one.
That is batch 227's own new queue rule — an item that names a behaviour without naming its sites has a list that is already wrong — arriving on the very next item.
It also carried a lesson about healing kid-lines only, and the place that lesson actually bites is not the heal at all but the MESSAGE, where a shipped toast was announcing an understated total as a cost on two paths.

**What I did not propose because it was out of scope.**
Asking for confirmation on the single-match relink, which the review noticed is an unconfirmed write.
Max chose "relink if there's exactly one match" over "never relink automatically, just warn me", with both spelled out and costed, so adding a confirmation would be re-litigating his answer.

## Surprises

**I wrote a second top-level `linkDishToPlate` 6500 lines above the real one.**
`tests/housekeeping.test.js` failed within seconds: hoisting makes the last definition win, so mine was dead on arrival and twelve unrelated tests broke.
That guard is `CLAUDE.md`'s oldest Tier 1 section and this is the first time in the record it has caught the thing live rather than being cited.

**The fix was better than a rename.**
The shipped `linkDishToPlate` already logs `dish_linked`, rebuilds the menu and re-renders — and an unlinked dish becoming costed IS `dish_linked`, whose own comment calls it the single largest one-step move the food-cost average can make.
A heal with its own writer would have moved the café's average with nothing in `menu_change_log` explaining why.

**A test in `plates-independence` was pinning the defect this item fixes**, asserting *"a SECOND plate now exists, and it is empty — the real recipe is orphaned"*.
It is rewritten to pin the fix, with a sibling pinning the honest limit: the heal matches on a name, so rename either side and the old behaviour is exactly what happens.
