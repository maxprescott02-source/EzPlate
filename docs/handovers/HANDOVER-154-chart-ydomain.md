# HANDOVER - 154 (the chart's y-domain, and the marker's unit)

**Branch:** `fix/chart-ydomain` · **Scope:** queue items UI-8 and the annotation half of UI-7, both from the UI defect set reported 10 Aug 2026.
**Deploy version: `ezplate-v145`.**

## What changed

The trend chart no longer collapses the series into a band when the target sits near the readings.
Measured before and after, same data: readings 31.0-32.5 against a 30% target went from **10%** of the plot height to **45%**; readings [28,30,32] against the same target from a collapsed axis to **93%**.
The target line is still drawn in every case and no axis label renders off-plot.

Two defensible rules were compounding, which is why neither looked wrong on its own.
v60's minimum ~5-pt window stops a flat series magnifying rounding noise.
v48's requirement that the target sit on a labelled tick makes `tcTicks` build outward from the target and widen the step until it has four or fewer ticks, which on a 5-pt window lands on step 5.
The domain was then the outermost tick plus half a step either side, so a step of 5 spent 15 points of axis on 1.5 points of data.

The fix splits the two cases.
When the target is NOT drawn, v60's behaviour is kept verbatim - that is the case its minimum window was written for.
When it IS drawn, the target already guarantees the span, so ticks are generated over the readings-union-target range and the domain is their EXTENT plus a hair.
Nothing is filtered, and that is the substance rather than a detail: `tcTicks` covers whatever range it is handed, so every tick it returns is inside the domain by construction, an off-plot label is structurally impossible, and `tcTicks`' own three-to-four-tick guarantee survives end to end.
A near-zero-variance series sitting on its target gets a 1.5-point window, which is v60's idea at the scale this case actually needs.

The marker labels now read "−0.7 pts" rather than a bare "−0.7", and the collision gap moved 30 to 52 viewport units with them.

## Into CLAUDE.md

Nothing.

## New docs/QUEUE.md items

- **`_boot.js`'s empty-table list is a list of things no browser spec can see.** Two entries in three batches turned out to be the only feeder for a visible feature. Read the rest of it in one pass rather than rediscovering it a third time.
- **`project-audit`, because the counter tripped.** `AUDIT-v135` against `ezplate-v145` is a gap of ten, so it sits above every other unblocked item. The entry says to FILE the report, which is the step that keeps the counter honest.

UI-8 is ticked, UI-7 is reduced to its x-axis half, and four of the reported defects moved to `blocked` against `docs/decisions/2026-08-10.md`.

## New docs/PHONE.md items

None yet.
The chart change is measurable and was measured; what a phone would add is whether the tighter domain reads as more informative or merely more jittery, and that is worth asking once Max has had the new chart in front of him for a few days rather than as a check to run.

## Probe

**What did the queue item tell you to do that you would have done differently?**
The AC I wrote for UI-8 said "the series occupies a majority of the plot height", and that is not always achievable.
When the target is two points below the readings, the axis must span it, so the series gets a third of the plot no matter what.
45% on the reported case is the honest ceiling for that shape of data, not a shortfall - and where the readings genuinely bracket the target, as in [28,30,32], it reaches 93%.

**What did you not propose because it was out of scope?**
Date ticks on the x-axis, which is the other half of UI-7 and is a deviation from the mock rather than a shortfall against it, so it stays a decision.
Regenerating ticks at a finer step so a tight domain still gets three of them: it would need a second copy of `tcTicks`'s sequence builder, and a copy written from the same belief as the original is the stub trap `CLAUDE.md` names. Handing `tcTicks` the honest range instead turned out to make the whole problem go away, which is the better answer and was not the first one.

## Pre-push review

**One major finding, and it was right about the fix AND about the test.**
The first cut generated ticks over a padded domain and then filtered out the ones that fell outside it.
For ordinary data - readings [28,30,32] against a 30% target - `tcTicks` widens to step 5 by its own four-tick rule, returns [25,30,35], and the filter left **one** label on the whole axis.
Squarely inside the case this batch set out to improve.

The sharper half of the finding is the one worth recording: I had **rewritten the `fresh-states` tick-count assertion from "3-4 ticks" to "at least one"**, which is fitting the spec to the regression rather than closing the regression.
That is the failure `FOLD-IN-PROTOCOL` §5 and `CLAUDE.md` both name, committed while quoting the rule that forbids it.

Rewritten rather than patched: there is no filtering now.
Ticks are generated over the readings-union-target range and the domain is their EXTENT plus a hair, so every tick is inside the domain by construction and an off-plot label is structurally impossible.
`tcTicks`' own guarantees then hold end to end - at least three ticks via its pad-outward loop, at most four via its widen loop - so the assertion is **restored verbatim**.
The review's two cases now give [28,30,32] with the series at 93% of the plot, and [25,30,35] at 56%.
Three new pins cover them and all three fail against the filtered version.

The second finding, a dead `step` assignment in the new branch, was already gone: I had found it independently while checking the same edge cases the review was asked about.

**A second round on the rewrite found one more, narrower and pre-existing.**
Deriving the domain from the ticks does not guarantee it contains the READINGS: `tcTicks` ends with `while(lo<0) lo+=step`, a guard that keeps tick labels non-negative on a percent axis and does it by raising the whole sequence, so near the zero floor `ticks[0]` can sit above a reading.
`y(v)` is unclamped, so the curve then draws below the plot floor into the marker strip.
Reproduced at a 1.5% target with readings flat at 0 - and **not introduced here**: `main` fails the same way at 3.5%.
The guard therefore sits after BOTH domain branches rather than inside the new one, and it can only widen, so "every tick is on the plot" survives untouched.
Swept the whole stated `cogsPct` range, 1 to 99 in half-points against readings at 0/0.5/1/2: **794 combinations, zero out of plot**, where the unguarded version fails four of the review's five spot checks.
Reachable rather than likely - it needs a food cost at or near 0%, meaning near-free ingredients - but the app clamps `cogsPct` only to [1,99], so its own stated input range allows it, and no other test goes anywhere near that region.

## Surprises

**Two tests I wrote were wrong in two different ways, and neither was caught by running them.**
The first could not fail; the second permitted the defect.
Both needed something outside the test to catch them - a plant, and a reviewer - and that is the argument for both habits in one batch.
The suite also had nothing to say about readings near 0%, because every fixture in the repo uses a ~30% target against readings above 10; a green suite was silence, not verification.

**A test I wrote could not fail, and the plant caught it.**
The marker-collision pin seeded two interventions 18 days apart, so the gap it was written to check was never exercised and reverting 52 to 30 passed.
At one day apart both gaps thin the label, so that fails too.
The discriminating band is about 1.5 days on this seed - roughly 41 units between markers against a 48-unit label - and the figure is derived in the test rather than picked, so it survives someone changing the seed.

**A seed that called another seed silently did nothing.**
`addInitScript` serialises the function and runs it in the page, where the closure it was defined in does not exist, so calling a sibling seed throws a ReferenceError in the browser and the test fails for a reason unconnected to what it tests.
Every seed in that file is self-contained now, with the reason written down.

**`menu_change_log` was in the boot shim's always-empty list**, exactly as `ing_price_history` was two batches ago.
It is the only feeder for the chart's markers and for the dashboard's since-line, so neither had ever rendered in a Playwright run - the marker label was changed in this batch and could be checked only in a unit test until the shim was extended.
Two of these in three batches suggests the shim's empty list is worth reading as a list of things no browser spec can see, rather than as a list of tables nobody happened to need.

**The v60 comment was false and had been for a while.**
It opened "the y-domain now fits the DATA, not the target" while the very next line concatenated the target into the domain.
It sent this batch's investigation the wrong way for a while before the measurement settled it, and it has been rewritten to say what the code does.
