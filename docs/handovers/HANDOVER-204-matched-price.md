# HANDOVER - 204 (mutation debt, the precedence rule)

**Branch:** `chore/0c-resolve-matched-price` · **Scope:** `docs/QUEUE.md` item 0c, fourth slice.
**Shipped no deploy version** - tests and docs only, `js/app.js` untouched.

## What changed
`resolveMatchedPrice` moved from the gate's `pending` list into `targets`.
It is the whole of "product pack > supplier memory > parser", the rule `CLAUDE.md` names as a fragile area, and it now has a test file of its own.
Twenty-four survivors: twenty-one killed by assertion, three allowed with equivalence proved by enumeration.
The gate's own figures, which are the ones that cannot drift: 55 mutants, 31 killed before this batch and 52 after.

`tests/matched-price.test.js` is new, at eighteen tests.
Suite 1467 to 1485, green. Full gate 593 mutants, 577 killed, 16 survived, every one with a written allowance.

**Only `computeInsights` remains in item 0c.**

## Into CLAUDE.md
Nothing.
The runtime finding below is about one tool's measurement rather than about the code, and the queue item is where a batch taking the next slice will read it.
Nothing else in this batch was a new shape.

## New docs/QUEUE.md items
None.
0c is updated in place: `resolveMatchedPrice` struck, the remaining table down to one line, and a note that the last one is not another slice of the same job.

## New docs/PHONE.md items
None.
Nothing a user can reach changed.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
Nothing, and the one thing it told me that turned out to be wrong was written by me the day before.
The item carried a runtime paragraph of mine saying a full gate run takes 112 seconds, with a warning attached not to trust a figure you had not taken yourself.
I took it, and got 270 seconds for the identical configuration.

**What did you not propose because it was out of scope?**
Trimming `resolveMatchedPrice`'s `tests:` list back to the new file.
The new file alone now kills everything the five together kill, so the other four cost about twelve seconds a run and add no kills today.
I kept them because they genuinely exercise the function, which is the honest test for that list, and because they are what would hold the gate up if the new file were ever deleted.

## Surprises
**The runtime number I wrote into the queue yesterday did not survive a day, and the failure was mine.**
Batch 201 recorded 306 seconds, batch 202 said thirteen minutes, batch 203 measured 112 and wrote both of the others off as not reproducing.
Today the 538-mutant configuration batch 203 measured at 114 measures at 270, on the same laptop, with nothing about the repo changed in between.
All four numbers are real measurements of a machine and every one of them was written down as a fact about the gate.
**What is stable is the MARGINAL cost of adding a target, taken back to back in one sitting: 55 mutants for about 14 seconds.**
That is the number a batch actually needs, it is cheap, and it does not rot.
The item now says so and no longer carries an absolute figure.

**Whether to replace a `tests:` list or add to it is a question with a measurable answer, and the answer differed from last batch's.**
203 replaced `applySupplierMemory`'s two declared files because neither called it.
Here the four declared files do call it, and running the new file alone left one mutant alive that the old four kill.
That settled it in one command rather than by argument, and it is worth doing every time: run the new file alone, and see whether the old ones were carrying anything.
The mutant in question is now killed directly too, so the four are currently redundant for the gate while remaining honest as a list.

**All three allowances are the same shape, and that makes five in the file.**
`>` to `>=` on a guard requiring a positive quantity, every time, and every time the reason is that a later guard already refuses what the loosened one lets past.
It is not a coincidence and it is not laziness in the code: the money path is written defensively, and defence in depth is exactly what produces equivalent mutants on the outer layer.
One of the three is stronger than equivalent and worth reading before copying the pattern: `q>0` inside the memory arm is the same expression the guard ten lines above already required, so it is fully redundant rather than merely harmless.

**The review found this batch's own result miscounted, in the file whose job is that a number means what it says.**
I corrected the count in the queue item and left `tests/mutation/targets.js` saying twenty killed and four allowed, with a second comment seven lines further down saying three out of twenty-three.
Three statements of one result, two of them wrong, written in the same ten minutes.
Both now quote the gate's own figures instead of a count I did by hand.
