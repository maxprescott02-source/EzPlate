# HANDOVER - 127 (Q5: Ingredients redesign)

**Branch:** `feature/q5-ingredients-redesign` (PR #87) · **Scope:** queue item Q5, the Ingredients (pantry) screen of the redesign phase.

**Ships `ezplate-v124`.**

**Suite at close:** `npm test` **799 green** · **102** Playwright green · `node -c` clean.

## What changed
The Ingredients card grid became one surface of rows: ingredient / "→ product — brand · supplier" / unit cost.
A price move the log recorded shows beside the name ("+12.0%", up red, down green), by the same rule the Dashboard's What-moved panel uses, so the two can never disagree.
A broken product link is loud now: "⚠ product missing — relink to keep N plates costed" in red, "no cost" in the price column, and the row's screen-reader label says so too.
The search bar now matches the supplier the rows display.
The v67 category chip row is gone per the design; category still drives the filter, still derived from the linked product.

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
None - the review's remaining nit ("—" bold for a linked product with no price vs "no cost" muted for a missing product, two visual languages for the same fact) is recorded here and is Q7/Q10 territory when price cells get their pass.

## New docs/PHONE.md items
None - driven at 380 and 1280 in both themes; the standing v103 Ingredients block in `docs/PHONE.md` now describes the old cards, judge it against the new rows.

## Probe
**What did the item tell you to do that you would have done differently?**
Two things, both corrected in the item before or during the build.
It named `renderIngredients` as the target - that is the Products screen; the pantry is `renderKitchenPanel`.
The naming inversion has now claimed a victim at planning time, not just while coding.
And it said to count the broken-link N "on BOTH sides" - the review showed a relink cannot heal a bare-pid line, so both-sides counting would promise a fix half the counted plates cannot get.
The both-sides law is real but belongs to `productRefs`, where deleting a product genuinely breaks both paths.

**What did you not propose because it was out of scope?**
A tap-through from the broken-link row straight into the relink picker - the row opens the edit modal, which contains the link control, so the path exists; a dedicated shortcut is polish for a state production has zero rows of.
Announcing drift and unit cost to screen readers (the row's aria-label names only the ingredient and the missing state) - that is a screen-wide row-labelling question for Q10.

## Surprises
- **The review's sharpest finding was about the tests, not the code:** all seven of my source-grep markup pins passed with the two render branches inverted - a build where every row screamed "product missing" would have shipped green. Behavioural assertions on the rendered DOM now cover both states. Source-grep pins prove a string exists, never that it renders.
- The isFinite('') trap nearly shipped in new code the same week CLAUDE.md's warning about it was in context - copied shape, not copied guard. The typeof check and a '' fixture are now pinned in the new test file.
- One process slip worth recording: Q5's work started on local main instead of a fresh branch (the new-branch step got skipped rolling straight from Q4's merge into Q5). Caught before anything was pushed; the commit was moved to its branch and main reset. The clean-break re-read exists for exactly this - it got skimmed.
