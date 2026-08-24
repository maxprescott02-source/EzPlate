# HANDOVER - 202 (mutation debt, cheap slice)

**Branch:** `202-mutation-debt-slice` · **Scope:** `docs/QUEUE.md` item 0c, second slice. **Shipped no deploy version** - tests and docs only, `js/app.js` untouched.

## What changed
Six functions moved from the gate's `pending` list into `targets`: `invGstDetect`, `costAtLines`, `unitCatCategory`, `derivePackPrice`, `costFromLines` and `analyze`.
Twenty-two survivors: nineteen killed by assertion, three allowed with proofs of equivalence obtained by enumeration rather than by argument.
Ninety-nine survivors remain in the item across four functions, and every one of them is twelve or more, so this is a clean line rather than an arbitrary stopping point.

`tests/plate-cost.test.js` is new and exists because `costFromLines` had never been executed by a test at all.

## Into CLAUDE.md
Nothing.
The two findings worth a rule are both already covered: the stub roster covers a stub standing in for a real function, and the queue item itself carries the warning about `tests:` lists for whoever takes the next slice.
Adding a bullet for a shape the roster already names is what its own header tells you not to do.

## New docs/QUEUE.md items
None.
0c is updated in place with the six cleared, the corrected remaining count, and the warning about declared test files that stub what they claim to pin.

## New docs/PHONE.md items
None.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
Nothing, and that is because I rewrote the item myself last batch from measurement.
The one thing it got wrong was mine: it said 143 survivors remain when the table under it summed to 99, because I had added item 0c2's 44 into a total for item 0c.

**What did you not propose because it was out of scope?**
The gate now takes thirteen minutes on this laptop for a full run and grows with every target added.
I filed it with numbers and a date rather than optimising it, because CI does it in three and a half minutes and the job has a twenty-minute bound.
The obvious lever, if it ever matters, is that the gate re-runs a target's whole declared test-file set for every single mutant.

## Surprises
**`costFromLines` had never run in a test, and the target list said otherwise.**
It is the plate cost, the most load-bearing number in the app, and all four of its declared test files replace it with a stub: one returns `lines[0].cost`, one returns 1, one returns 0, one looks the answer up in a table.
Every one of those stubs is correct where it sits, because none of those files is about plate costing.
The defect is the `tests:` list, which reads as coverage and is only a claim - and the gate had been reporting five survivors, truthfully, the whole time.
This is the stub roster one level up: the roster is about a stub hiding a defect inside a test, and this is a stub hiding the absence of a test.

**Not one of the twenty-two survivors was a subtle case.**
Every single one was a branch no test had ever taken.
The later spellings in an `||` chain, the volume arm of a function only ever tested with weights and counts, the GST fallback on an invoice that states no tax basis, a plate line whose product was deleted, a negative menu price, the exact fifteen-percent boundary.
That is worth knowing before the next slice: this is not a hunt for cleverness, it is a list of doors nobody has opened.

**Two of the twenty-two needed the harness widened rather than a new case.**
`dash-digin.test.js` stubbed `lineProduct` in a form that could not represent a `{kid, qty}` line at all, so every kitchen-ingredient branch in `costAtLines` was unreachable from that file.
A stub that cannot express one of the two line shapes the app stores is not a simplification.

**The review found a test written THIS BATCH that could not fail, in the file written this batch to fix exactly that class.**
The rounding test asserted 12.5 x $0.08 = 1 and 33 x $0.01 = 0.33, and cent-rounding changes neither, so wrapping the function's return in `Math.round(c*100)/100` left it green.
A test named for the "stored costs stay exact" rule, unable to see that rule broken.
The agent proved it by injecting the regression rather than reading the code, which is the difference between the finding and an opinion.
The fixture is now 2.5g at a cent a gram, which rounding turns from $0.025 into $0.03, and it carries a sanity assertion that the fixture is one rounding would change.

**Three of the four findings were wrong NUMBERS in prose I had just written**, including a runtime entry whose whole point is that its predecessor rotted for want of a measurement and a date.
It said "54 targets on unmodified main", which was true when measured and false by the time it was written down, because the batch in between promoted four.
