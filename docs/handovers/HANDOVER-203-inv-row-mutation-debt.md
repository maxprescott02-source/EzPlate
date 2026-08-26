# HANDOVER - 203 (mutation debt, the invoice-row pair)

**Branch:** `chore/0c-mutation-debt-slice-two` · **Scope:** `docs/QUEUE.md` item 0c, third slice.
**Shipped no deploy version** - tests, the test harness and docs only, `js/app.js` untouched.

## What changed
`buildInvRows` and `applySupplierMemory` moved from the gate's `pending` list into `targets`.
Thirty-six survivors: thirty-three killed by assertion, three allowed with equivalence proved by running the real and mutated forms over an enumerated input set.
`tests/supplier-memory.test.js` is new and exists because `applySupplierMemory` had never been called by a test.
`tests/inv-chain.test.js` gained a section 5 covering the rest of `buildInvRows`.
`tests/_extract.js` now extracts `flagNeedsAttention` instead of stubbing it as a no-op.

Suite 1447 to 1467, green. Full gate 538 mutants, 525 killed, 13 survived, every one with a written allowance.

## Into CLAUDE.md
Nothing.
Both findings are already covered by rules that exist: the stub roster's own header says to add a bullet only when the SHAPE is new, and neither is.
A no-op stub of a real function is the roster's plainest case rather than a new one, and a `tests:` list that reads as coverage is the finding batch 202 recorded and the queue item already carries as a warning to the next slice.

## New docs/QUEUE.md items
None.
0c is updated in place: the two cleared, the remaining table down to `resolveMatchedPrice` and `computeInsights`, and three things the next slice would otherwise have to rediscover.

## New docs/PHONE.md items
None.
Nothing a user can reach changed, so no device check and no browser drive.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
It said to work the table in cost order, and I took the pair out of order.
`buildInvRows` calls `applySupplierMemory`, so two of the first function's twelve survivors were about the second, and one set of fixtures killed both.
`resolveMatchedPrice` is the same size and is also called by `buildInvRows`, so the same argument would have picked it; the tie went to the ZERO in the other column.
The item now says cost order is the default rather than the rule, and why.

**What did you not propose because it was out of scope?**
`applySupplierMemory` stores a `$0.00` line as a price of zero and clears `needManual`, while `invDerivePackQty` treats the same line as a freebie and deliberately derives nothing from it.
Both are defensible and they disagree, which is the interesting part.
Changing what the app stores is not a coverage batch's job, so the boundary is pinned as behaviour with the tension written at the test's own site, and the question is filed in `docs/MAINTENANCE.md`.

## Surprises
**`applySupplierMemory` had twenty-four mutants and zero kills, and the cause was its `tests:` list rather than any test.**
Both declared files mention it and neither calls it.
That is `costFromLines` from batch 202 arriving one function later, on the very next thing anyone looked at, and the warning 202 wrote into the queue item paid out immediately.
Both remaining entries have now been checked for the same thing so the next slice does not have to: `resolveMatchedPrice` is genuinely exercised, `computeInsights` is genuinely run by one of its two files while the other only greps its source.

**One of the twelve survivors was a gap in the HARNESS, and the harness said out loud that it was not.**
`tests/_extract.js` stubbed `flagNeedsAttention` as a no-op with a comment calling it DOM-bound and asserting the stub did not sit in the path under test.
It touches no DOM.
It reads `byId` and `cpbu` and writes `row.needsAttention`, and with a no-op in its place, deleting `buildInvRows`' call to it and keeping it were the same program.
The stub was written in the same file as a note about the roster being twenty-one entries of stubs that hid defects.

**The gate is not slow, and two files said it was.**
Batch 201 measured 306 seconds and batch 202's handover said thirteen minutes.
Measured today on the same laptop: 112 seconds on `main` and 114 with this batch's two targets added.
The conclusion both reached, that optimising it is not worth a batch, is unchanged and now rests on a number rather than on a figure nobody re-took.
That is written into the queue item because the old figures were being used as an argument.

**The pre-push review found a comment overclaiming what a fixture proved, in the file about tests that overclaim what they prove.**
The `CATALOGUE` block said all three base units were represented and there was no litre product in it.
Corrected rather than fixed by adding one: `rankCandidates` scores against every product in `PRODUCTS`, so a new entry can re-rank the 0.3 and 0.6 confidence boundaries this file lands on exactly, and buying a third unit there would put the two boundaries at risk.
