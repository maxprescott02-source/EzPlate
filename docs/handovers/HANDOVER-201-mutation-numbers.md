# HANDOVER - 201 (mutation gate, part one)

**Branch:** `201-mutation-numbers` · **Scope:** `docs/QUEUE.md` item 0c, part one of a split. **Shipped no deploy version** - docs and tests only, no client asset.

## What changed
The mutation gate can now be pointed at code that contains a loop, which it could not before.
`spawnSync` had no timeout and `node --test` has no default one, so a mutant that turns a loop condition into a non-terminating one hung the gate forever: no red, no green, no output at all.
`computeInsights` has exactly one such mutant and the run went past ten minutes before being killed by hand.
Each mutant is now bounded at ten times the gate's own baseline, floored at five seconds; the baseline gets an absolute 180 seconds because it cannot derive a bound from itself; a timeout counts as killed and is named separately in the report.

Every CI job carries `timeout-minutes` now, and only the Playwright one did.
The `unit` job runs both the suite and the gate and had no bound at all, so a hang there ran to GitHub's 360-minute default.

Four pricing functions are targets at zero survivors: `packToUnitCost`, `unitToBaseFields`, `packPriceOf`, `menuMarginPreview`.
Their test files were already doing the work and nothing had ever asked them the question.

`tests/inv-chain.test.js` runs raw invoice text through `pdfTextToRows` into `buildInvRows` and asserts the review row a human would see, in eleven cases.
That was the item's stated deliverable: the individual functions are each correct and the wrong numbers arrive from the twenty lines that call them in order.

## Into CLAUDE.md
One rule, made under the standing authority, in the mutation-gate section.

**A hang is a third outcome and nothing in this toolchain calls it a failure, including the gate itself.**
195 wrote that about a promise that never settles; the same hole was in the tool built to enforce it.
The part worth keeping is why it had never bitten: no target had a loop in it, so the class was unreachable until someone tried to point the gate at the arithmetic.
It carries the three-part remedy and the honest limit - deleting a bound makes the self-test hang rather than go red, because `mutationRun` is synchronous and node:test's own timeout cannot interrupt a synchronous child wait, so the net has to be outside the thing being fixed.

## New docs/QUEUE.md items
**0c** is rewritten rather than deleted, because only part one shipped.
It now carries a measured table of ten functions in cost order with a survivor count each, from 1 for `invGstDetect` to 39 for `computeInsights`, totalling 165.
**0c2** is new: `gemApplyReadings`, 44 survivors, promoted out of `docs/MAINTENANCE.md` into an item that can reach the top of the queue on its own.

## New docs/PHONE.md items
None.
Nothing in this batch is reachable from the app.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
The item's requirement was "the pricing and invoice-chain functions are targets", stated as one job.
It is ten jobs and 165 survivors, and I did not find that out by reasoning about it - I added every candidate to the list and ran the gate.
Doing what the item said would have meant promoting functions whose coverage does not exist, which makes the gate exit 1 on `main` and block every push, and the file's own note says a gate nobody can satisfy gets disabled.

Two of its numbers were stale and one of its candidates was wrong.
54 targets against 616 functions, not 49 against 609.
`cpbu` and `fmtTargetPct` can never be targets at all: both are one-expression functions that yield zero mutants, so a target on either reports nothing rather than nothing wrong.

**What did you not propose because it was out of scope?**
The gate takes about five minutes for a full run and its own maintenance entry claims "low tens of seconds", which was already false and nobody had timed it.
Making it faster is real work and this batch only corrected the claim.
I also left the twelve cheapest survivors unkilled - `invGstDetect` through `costFromLines` - because the PR already had a spine and grinding twenty-two unrelated assertions onto it would have made it unreviewable.

## Surprises
**The item could not be started without fixing the tool.**
That was not visible from the item, from the code, or from any previous batch, because the gap only exists for functions with loops and the target list had none.
It is the item's own sentence arriving one level up: a function that is not a target has never been asked the question, and neither has a tool that has never been pointed somewhere new.

**The composition test barely moved the number and that is the honest result.**
`buildInvRows` went from 14 survivors to 12.
The eleven cases pin real behaviour and the remaining survivors are coverage-threshold boundaries that need fixtures landing on exact values, which is a different kind of work.
The exactly-0.6 case is in because it was constructible; 0.3 was not, and I did not pretend otherwise.

**`applySupplierMemory` has 24 mutants and kills zero of them.**
Its declared test file mentions it and never exercises it.
That is the worst number on the board and it is on a function that re-derives a unit price from a remembered pack.

**The pre-push review found two things and reproduced the first rather than reading it.**
The baseline run had no bound, so the defect the whole change exists to remove was still fully present on the run that happens first every time - and the branch handling it was unreachable, which is why nothing noticed.
The second was subtler: every signal-killed child was classified as a timeout, so an OOM kill or a cancelled CI job would have read as a hang.
Neither would have turned anything green that should have been red; the second would have put the wrong cause in the report.

**Pinning the second took two attempts and the first attempt was a test that could not fail.**
`process.kill(process.pid)` inside a test file does not reproduce a crash, because `node --test` catches the child's death and exits 1, so the gate sees an ordinary non-zero status.
Killing the runner with `process.ppid` is what produces a signal-killed top-level process.
The first fixture left the assertion unable to tell the two classifications apart, and mutating it is what said so.

**Two skill files are modified in the working tree and are not mine.**
`skills/batch/SKILL.md` and `skills/decide/SKILL.md` carry coherent dated edits quoting Max about visual decisions going out at one rather than three.
They were deliberately left out of both commits rather than swept in, and they are still uncommitted.
