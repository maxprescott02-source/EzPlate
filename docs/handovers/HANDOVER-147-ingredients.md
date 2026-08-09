# HANDOVER - 147 (F3: Ingredients rebuilt from the v3 mock)

**Branch:** `feature/f3-ingredients` · **Scope:** queue item F3, the second screen of the v3 fold-in.
**Shipped `ezplate-v139`.**

## What changed

The Ingredients pane is rebuilt from the mock against the §5 contract banked in `docs/contracts/V4c-ingredients-contract.md`, which meant the inventory did not have to be re-spent.
Desktop is five columns: Ingredient over its linked-product sentence, Category, Unit cost, Last change, Used in.
Mobile is two-line rows with a "Category, in N plates" meta line and the unit cost stacked over the change pill.

The `.king-*` class NAMES are kept deliberately.
The contract records that only this pane emits them, so unlike Plates there was no shared system to unpick: the rules changed and every handler, test and `data-kid` reader still finds what it looks for.
The header bar, control row and footnote reuse F2's `.scr-head` and `.plib-*` rather than being rebuilt.

Rulings recorded at the code: R1 puts the Category column back, reversing Q5's decision, and the flipped pin now protects the thing that made Q5 safe, which is that the category is DERIVED and never stored.
R2 refuses the mock's "30-day change" heading because `ingLastMovePct` is the last logged move and the label would be a lie; it ships as "Last change".
R2 counts "Used in" on the kid arm, so the row, the relink promise and the modal cannot disagree.
R3 keeps both controls the mock drops, re-houses the strapline into the empty state, and keeps the linked-product sentence as the desktop row's second line.

## Into CLAUDE.md

**One rule proposed, awaiting Max's yes.**

> **A `@media` block does not win by being later.** Specificity is compared first, so a multi-class
> selector outside a media query beats a single-class rule inside one. Writing the narrow selector
> for the small screen and the plain one for the large screen puts the cascade the wrong way round,
> and the symptom is a rule that is visibly correct in the file and has no effect on screen.
> When a declaration appears at both breakpoints, give the two rules the SAME specificity.

Five instances of exactly this in one screen, in one batch: three found by looking at the app, two by the review.
It is not in Tier 1 yet because Max has not said yes.

## New docs/QUEUE.md items

- **`renderKingProgress` hides the setup line but not its own button's meaning.** With the wizard button in the v3 header bar, a café mid-setup sees two actions on a mobile header where §6 asks for one. Deviation recorded and shipped; revisit if the phone pass finds it crowded.
- Nothing else found-not-fixed. The four review findings were all fixed in the branch.

## New docs/PHONE.md items

Four, under a `v139` heading, written into `docs/PHONE.md`.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

The item and its contract were the best-prepared work in the queue and both were right, including the correction the contract makes to the item's own "count BOTH line shapes" instruction.
The one thing I would change is what the contract calls open.
It leaves "use `platesUsingKid` or `productRefs` for a usage column" as a decision per surface, which reads as a genuine toss-up, and it is not: the contract's own trap 4 already records three different meanings for "used in N plates" on this screen, so the only answer that does not add a fourth is the one the other three already use.
An item that lists a decision as open invites a batch to decide it fresh; this one had already been decided by the surrounding facts.

**What did you not propose because it was out of scope?**

The row's `aria-label` still overrides its content, so the four figures are never announced.
The contract names it at trap 5 and it is queued as a screen-wide rule, so fixing it inside a restyle would have been the silent scope creep the contract warns against.
Also left alone: the six search bars, and the `.panel` base rule, which now carries two per-screen exceptions.

## Surprises

**Five cascade defects, all the same mistake, none of them caught by reasoning.**
Every one was a multi-class selector out-ranking a single-class rule inside a `@media` block.
I fixed the first three and then wrote the fourth into the fix for the third, which is the clearest evidence I have that this needed to be a rule rather than a lesson.

**The one that got furthest was invisible to its own test.**
The desktop "Used in" column rendered ", in —" under a header already reading "Used in", on every row, at every desktop width.
The assertion covering that cell read `textContent`, which does not include `::before` generated content, so it passed against the defect.
Two more assertions had the same blind spot.

**A code comment broke a source-grep pin.**
`king-rows.test.js` asserted that `king-meta` does not appear in the renderer; my comment explaining the flip mentioned the class by name and turned the test red while the markup was correct.
The contract warns about this trap in the other direction, a grep passing while the render is wrong.
The fix is comment-stripping before every grep in that file, which closes both directions.
