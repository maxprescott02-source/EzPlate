# HANDOVER - 206 (the invoice referee, and the pending list empties)

**Branch:** `chore/0c2-gem-apply-readings` · **Scope:** `docs/QUEUE.md` item 0c2, the last of the mutation debt.
**Shipped no deploy version** - tests, the shared harness and docs only, `js/app.js` untouched.

## What changed
`gemApplyReadings` moved from the gate's `pending` list into `targets`, and **that list is now empty for the first time since it was created in batch 180.**
Measured at 45 survivors rather than the item's 44, which was 180's figure and had drifted by one.
Fifty-two killed in the new `tests/inv-referee.test.js`, two allowed with proofs by enumeration.

`tests/_extract.js` gains the referee and four helpers, plus a fake window with a capturing console.
Suite 1514 to 1543, green. Sixty-nine targets, twenty-two allowances, nothing pending.

## Into CLAUDE.md
Nothing.
The two findings below are both instances of shapes the roster already names - a stub standing in for a real function, and a proof citing coverage that is not there - and the roster's own header says to add a bullet only when the shape is new.

## New docs/QUEUE.md items
None.
0c2 is deleted. `docs/MAINTENANCE.md`'s struck entry for the same work is closed with what actually happened, rather than left pointing at a queue item that no longer exists.

## New docs/PHONE.md items
None. Nothing a user can reach changed.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
Nothing, and the item was unusually well prepared because the previous batch wrote its warnings into it.
The one thing it got wrong was its count: 44, measured at 180 and re-confirmed twice, is 45 today.
Its own warning about checking the declared test files before believing a survivor count is what led me to the real cause in the first ten minutes.

**What did you not propose because it was out of scope?**
Deleting the hand-built sandbox inside `tests/invoice-gate.test.js` now that the shared harness can do the same job.
It is not wrong, it tests a different thing, and rewriting a passing test file to use a different harness is a change with no upside and a real chance of quietly weakening what it pins.
I kept it in the target's `tests:` list and said in the target comment which of the two files is doing the work.

## Surprises
**The 45 survivors were caused by the harness, not by anything missing from the tests.**
The one declared file reaches the referee through its own `new Function` sandbox, which stubs `rankCandidates` to a fixed answer and `packCount` to null.
Both stubs are correct where they sit, because that file is about the confirm gate.
They are fatal here, because two of the referee's decisions are made BY those functions - which is the same finding as batch 202's `costFromLines` and batch 203's `applySupplierMemory`, arriving a third time in a third form.
**The list of files is not the question. What those files do with the function is.**

**One mutant is visible only in a diagnostic nobody reads.**
Reading the pack count off the row's name instead of its raw line changes the merge from rule 2, verified against the second reader, to rule 7, cannot adjudicate.
Both are silent, both leave the price alone, and every field on the screen is identical.
The only place the difference exists is the `console.debug` line, which is why the harness captures it rather than discarding it, and why `gemDiag` is extracted rather than stubbed.
**A no-op stub of a real function and a deleted call to it are the same program**, which is batch 203's `flagNeedsAttention` lesson applied before it could bite rather than after.

**The review found a written allowance whose tripwire did not exist.**
I allowed a surviving mutant on the grounds that its extra call, `gemHist(undefined)`, returns null by that function's own first line - true - and said the guard was pinned by `tests/inv-gemini-merge.test.js`.
That file imports three other functions and never mentions `gemHist`, and no test anywhere called it directly.
So the allowance advertised a protection it did not have: remove that guard and a written allowance silently becomes a crash.
The fix is the test rather than a softer sentence, because the allowance is correct and what was missing was the thing keeping it correct.
**An allowance is a claim about code somewhere else, and a claim about code somewhere else needs a test somewhere else.**
