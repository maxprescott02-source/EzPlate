# HANDOVER - 222 (a plate that cannot cost every line)

**Branch:** `fix/uncostable-line-visible` · **Scope:** `docs/QUEUE.md` item 9. **Shipped `ezplate-v182`.**

## What changed

A plate carrying a line the app cannot cost no longer renders as costed anywhere outside the builder.
It used to print a confident figure, a suggested price and a GREEN verdict pill, all computed from a total missing an ingredient - and a smaller cost is a better food cost, so the error always pointed the reassuring way.
A line with no quantity is also no longer a free ingredient: `lineCost` returned `qty*c` and `null*c` is 0, so the line cost nothing and the builder's own flag stayed down.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5. Two findings, both real.
Full report verbatim: `docs/reviews/REVIEW-222-uncostable-line.md`.

1. **CRITICAL - five more surfaces still asked the old question.** Already fixed when the report landed, and recorded in full anyway: the batch found them by re-counting the item's enumeration and the agent found the same five by reading the code. Two routes, one answer.
2. **The misc branch carried the same trap the quantity fix closed**, one branch over: `Number('')` is 0, so a misc cost never entered added a real $0.00 with `miss` at zero. Fixed. **The batch's own test had asserted the wrong behaviour and argued for it in prose**, which is the instructive half and is written up rather than quietly corrected.

⚠️ **One process lesson, and the reviewer is the one who surfaced it: COMMIT BEFORE REVIEWING.**
A reviewer pointed at `main...HEAD` cannot see the working tree, so a batch that reviews mid-flight gets a report about a state it has already left. This one noticed and said so; a less careful one would have reported confidently against a stale tree, or missed finding 2 in the noise.

## Into CLAUDE.md

Nothing.
Both findings are instances of rules already there - the `isFinite('')` trap by name, and the enumeration warning in Tier 3.
The roster header says to add a bullet only when the SHAPE is new, and neither is.

## New docs/QUEUE.md items

None. Item 9 is deleted.

## New docs/MAINTENANCE.md items

None new. `saveCurrentPlate`'s mutation gap from 221 still stands there unclaimed.

## New docs/PHONE.md items

None. The change is arithmetic and label selection; nothing about it turns on a device.

## Probe

**What did the item tell you to do that you would have done differently?**
Its diagnosis was exactly right, including the sentence that turned out to matter most - that `kpiStripHtml`'s comment claims the Ingredients tab owns this surface and that **for a direct `pid` line that surface does not exist**. That is the kind of specific, checkable claim a good item carries.
Where it was wrong is the enumeration: it named six callers of `costFromLines` and there are nineteen. Five of the ones it did not name are user-facing Dashboard figures sitting next to the ones it did. Fixing only its list would have left the Dashboard internally inconsistent, which is worse than fixing none of them.
**I would not have written the requirement as "costFromLines returns or exposes its miss count and the callers act on it"** without saying which callers - that phrasing invites exactly the partial fix the first commit made.

**What did you not propose because it was out of scope?**
The change-log's `costBefore`/`costAfter` still record partial costs for a partially-costed plate. They are a historical record of what was computed at the time, so changing them rewrites the meaning of existing rows rather than fixing a display - a different decision, and not one to make in passing.
Also left: `renderBuilderCost` still shows the partial total in the builder, which is correct there because `#flag` says so beside it.

## Surprises

**The item's enumeration was a third of the real one**, which is now three batches running (220 said three families and there were five; 221 said one line and the fix needed four). `CLAUDE.md`'s "if a brief's list looks complete, check it anyway" has earned its place three times in three batches.

**My own test defended a bug in prose.** The misc-cost assertion did not merely happen to be wrong - it carried a written justification for being wrong, in the file that exists to catch that class, written minutes after fixing the identical trap one branch away. Confident wrong reasoning is harder to spot in review than an absent test.

**A live guard became unreachable as a side effect**, and only the mutation gate noticed. `computeInsights`' null-line check cannot fire now that partially-costed plates are excluded before the loop. That is this repo's "a fallback that cannot fire is not a safety net" shape arriving backwards - not written dead, but retired by a change in another function - and nothing except a survivor report would ever have said so.

**The supplier pass is deliberately NOT narrowed**, and the first draft of that assertion guessed it would be. Reach is a fact about the product list rather than a costed figure, so a plate with one uncostable line still legitimately counts towards a supplier's spread. Measured, not reasoned: the guess said 2, the answer is 3.
