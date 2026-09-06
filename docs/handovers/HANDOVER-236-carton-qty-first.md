# HANDOVER - 236 (a quantity-first carton line no longer halves the unit cost)

**Branch:** `fix/carton-qty-first-repro` · **Scope:** `docs/QUEUE.md` item 12, the first of the 5 Sep blind audit's findings to be run.
**Shipped `ezplate-v194`.**

## What changed
The audit's finding was TRUE and reproduced exactly as written before a line of the fix existed: `2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00` costed at **$5.00/kg where the invoice says $10.00**, with `needManual:false`, so the row was pre-ticked and would have applied silently.
The mechanism is that `packWeight`'s multiplier chain deliberately accepts "N <pack-noun>" so "6 CTN x 6 x" compositions work, which folds a LEADING purchased quantity into the pack weight while the price chooser takes the per-carton figure.
`invQtyFirstRebase` corrects it OUTSIDE the protected parser region - every function involved is inside it - and CALLS the region's own `packWeight` / `moneyMatches` / `firstPairPrice` rather than copying them.
It rebases only when the line's own arithmetic confirms it: a leading `k <container>`, the same weight read from the raw line and from the name, `k` actually folded, a pair and a distinct total, and `k*P` equal to the total within a cent per container.
A line whose total is neither the pair nor `k*P` is flagged `needManual` rather than guessed either way; a line whose pair IS the total is left alone, because there is no purchased-quantity column and the price already covers the whole weight.
One hook, and the enumeration was checked rather than assumed: the PDF path is the only consumer of `pdfTextToRows`, the CSV path takes user-typed unit prices, and the AI referee can never overrule a parser price (`gemMergeLine` keeps P in rules 2/3/6/7 and adopts only when the parser had none).
`tests/inv-qty-first.test.js` is 19 cases, every fixture quantity-FIRST because that ordering is the whole defect and is why the existing parser fixtures stay green against it.

## Review
Sonnet, diff only, no brief: 1 critical, 1 major, 2 minor - every one taken, and both of the top two were reproduced before being acted on.
**The critical one is the rule I cited while breaking it.** The guard verified the fold with `packWeight(row.name)` while the price came from `packWeight(row.raw)`; on a line with a trailing net-weight column those disagree (144kg against 12kg), so it was verifying a fold that had nothing to do with the number it doubled.
Calling the real function with a DIFFERENT ARGUMENT is the same defect as copying it, and the function's own comment claimed the opposite.
The major finding reshaped the design rather than patching it: the "flag when unconfirmed" branch was wrong for the commonest shape, and two of my own tests asserted that wrong behaviour.
The gate then found three further survivors on the reworked function; two were killed by fixtures - one of them prevents a `TypeError` that would have broken a whole import - and the third is a written allowance, proven unreachable by probe rather than argued.
`docs/reviews/REVIEW-236-carton-qty-first.md` holds all four verbatim; `Reviewed-commit: 11359cc`, fixes in `162186c`.

## Into CLAUDE.md
One rule, and it nearly cost a real finding.
**When you hand-run a mutant to check a gate survivor, reproduce the gate's EXACT mutation - its `key:` line names which occurrence.**
The gate reported a survivor; the hand check flipped BOTH `||`s in a three-clause guard, went red, and the obvious conclusion was that the gate was wrong. It was not - its key ends `#0`, it flips only the first, and the survivor was real: the path turns a null price into `$0.00`.
The existing rule next to it covers a hand-run that changes NOTHING and reads as a false survivor; this is the mirror image, and the costs are not symmetric - a false SURVIVED wastes a test, a false KILLED deletes a finding.

## New docs/QUEUE.md items
**12b - a trailing net-weight column makes the parser divide by the WRONG weight. [A]**
Found by this batch's review, MEASURED: `2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg` costs **$0.42/kg where the truth is $10.00**, silently, pre-ticked.
`packWeight` takes the LAST weight token in the whole raw line, so a "net weight" column becomes the pack's unit weight.
It is pre-existing, it is inside the protected region, and it is an order of magnitude further out than the defect this item fixed. 236 refuses to compound it and a test pins that refusal; correcting it is its own item.
Its real-world frequency is unknown and is the first thing to establish - that is what the new `docs/PHONE.md` check is for.

## New docs/PHONE.md items
One: import a real supplier PDF and confirm nothing moved.
Every Bidfood line is composition-first, which is not the shape this touches, so the expected result is that nothing changes at all.
Failure looks like any row's price differing from what that invoice imported before, or a row that used to apply silently now asking to be priced by hand - either would mean the leading-quantity gate is matching a real line it should not.

## Probe
What the item told me to do that I did differently: it said "stop and tell Max" if the repro landed inside the protected region.
It did - `parsePdfLine`, `packWeight`, `firstPairPrice` and `buildInvRows` are all inside it - but the same item's next clause says to solve outside the region the way `invUnitRebase` did, and `normPackNotation` is the standing precedent for exactly this on this parser.
So it was solved outside rather than escalated; a stop there would have spent Max's time on a decision the file had already made.
The item's line citations were wrong, as its own preamble warned (`10287-10340` is not the parser); grepping the names found them.
What I did not propose because it was out of scope: correcting 12b (its own item now), and anything about the parser's weight-token choice, which is region-protected.

## Surprises
- The review's critical finding was in the ONE part of the function I had written a comment congratulating myself about. The comment said it called the region's functions rather than copying them, which was true and irrelevant: the argument was wrong.
- Reproducing the finding turned up a pre-existing defect BIGGER than the one the audit reported, on the same line, which is the "look on the other side too" rule paying out.
- `docs/audits/BLIND-AUDIT-2026-09-05-code.md` was edited in the working tree mid-batch by another session (correcting the reviewer's provenance to the stable model slug). It is left uncommitted and unstaged - not this batch's work, and staging by name is what kept it out of these commits.
