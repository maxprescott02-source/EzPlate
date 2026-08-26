# HANDOVER - 205 (mutation debt, the Dashboard builder — and the item closes)

**Branch:** `chore/0c-compute-insights` · **Scope:** `docs/QUEUE.md` item 0c, fifth and last slice.
**Shipped no deploy version** - tests and docs only, `js/app.js` untouched.

## What changed
`computeInsights` moved from the gate's `pending` list into `targets`, and **item 0c is finished and deleted.**
It measured 39 survivors plus one mutant that hangs rather than fails; 34 are killed by a new BUILDER section in `tests/insight-coverage.test.js`, four carry written allowances, and the hang is counted as a kill by the gate's own rule.

Suite 1485 to 1514, green.
Full gate 711 mutants, 691 killed, 20 survived, every one with a written allowance.
Batches 201 to 205 closed all 165 of the item's measured survivors. `pending` is down to one line, which is item 0c2.

## Into CLAUDE.md
**Roster entry 205, and the count moves to twenty-two.**
An assertion comparing one fact between two runs, where the object has no such key, is `undefined === undefined` and passes forever.
It happened four times in this batch on three different keys, in tests written the same hour by someone who had just read the roster.
The shape is new and it is not "I mistyped a key": **the two-sided form is what hides it.** A one-sided assertion against a literal fails instantly and obviously; "these two agree about X" is silently satisfied when neither has an X, and reads as the more careful test of the two.
That covers deep-equal of subsets, comparing two API responses, and every before-and-after regression check in this repo.
`tests/insight-coverage.test.js` now carries `sameFact`, which asserts the key exists before comparing it.

## New docs/QUEUE.md items
None. Item 0c is deleted, and the five findings its batches produced are carried into item 0c2 so the last of the mutation debt does not rediscover them.

## New docs/PHONE.md items
None. Nothing a user can reach changed.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
Nothing. The item warned that this function was not another slice of the same job, that its fixtures would be whole app states rather than a row and a pack, and that it was the only one with the hanging mutant. All three were right, and the fixtures were indeed most of the work.

**What did you not propose because it was out of scope?**
Trimming `settings-toggles.test.js` from this target's `tests:` list.
It contributes no kills and never could: it greps the function's SOURCE to prove the AI-suggestions gate comes before the call, which is a property of the call site rather than of the function.
It is honest as a declaration and I left it, but a reader counting on that list for coverage would be misled, so the target comment now says which of the two files actually runs the code.

## Surprises
**Not one of the 39 survivors was in an insight family, and that is the finding.**
Every single one was in the two hundred lines that decide what the families are handed: which dishes reach the reconstruction, which plates count towards a supplier's reach, which products are comparable on price.
Everything above the new section tests a family by handing it the right shape and checking what it says. Nothing tested the code that produces the shape.
That is the argument v93 made when it first extracted this function and it turned out to be exactly right: a family can be perfectly correct while the code feeding it is broken, and on real data the two are indistinguishable, because both look like "this family had nothing to say".

**Four of my own assertions could not fail, and none was found by reading.**
Two were keys that do not exist: `facts.ptsPer10`, which is the builder's internal name for what `insConcentration` publishes as `pts`, and `facts.name` and `facts.count` on an anomaly, whose facts are only `{top, mult}`.
Two were the same boundary fixture, twice: the first asserted a figure that `pts1` had already rounded, so it read 0.3 while the raw value was 0.30000000000000027 and therefore greater than 0.3 under both operators; the second added a raw check that computed the value as a two-term expression while the builder sums a list and subtracts the sums, and the float that survives is not the same one.
**A check that re-implements the code's arithmetic in a different order is a stub of it, and this one agreed with the wrong answer.**
Two were caught by the gate and two by the review.

**The review found a test whose title its own assertions could not check.**
It was called "counted ONCE, at the first price found" and asserted two figures that are counted by walking a different array, so a duplicate publication cannot move them whichever price wins. Inverting the guard to last-wins left it green.
It is merged into the sibling that does pin the price, and the merged test is verified to go red on that inversion.
A title that names a property the assertions cannot see is worse than no test, because the title is what the next reader trusts.

**CI runs the full gate in a fraction of the time this laptop does.**
711 mutants: 4m31s on the CI runner, 796s here, in the same hour.
That is the third independent confirmation this week that the gate's absolute runtime is a property of the machine and not of this repo, which is why the queue item now records only the marginal cost of adding a target.
