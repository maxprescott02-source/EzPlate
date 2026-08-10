# HANDOVER - 162 (the flaky trace)

**Branch:** `ci/flaky-trace-upload` · **Scope:** the queue's top item, found by the 159 pre-push review.
**Deploy version: NONE.** CI and tests only, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

The Playwright job now uploads its report when a spec passed only on a retry, as well as when the run failed.
The json reporter writes `playwright-results.json`, a detection step reads `stats.flaky`, and the gate is `failure() || steps.flaky.outputs.flaky == 'true'`.
`tests/ci-workflow.test.js` is new.
Suite 865 to 870.

**The item's premise was right and its mechanism was wrong.**
It specified grepping the report for `"status":"flaky"`.
Measured against a real flaky report: that literal matches **zero** times, because the reporter pretty prints, so the file contains `"status": "flaky"` with a space.
The bare word `flaky` appears 11 times in a one test report.
Either grep would have shipped a gate that looks correct and never fires, which is worse than the hole it replaces, because nobody looks at it again.
`stats.flaky` is a number and is the honest signal.

Everything else was measured on a real flaky run rather than reasoned about.
The job exits 0, `stats.flaky` is 1, and the failed attempt's `trace.zip` **is** retained, so the item was right that the evidence existed and was being thrown away.
`PLAYWRIGHT_JSON_OUTPUT_NAME` resolves relative to the **config's** directory rather than the working directory, and without it the json reporter prints the whole report to stdout and buries the github reporter's summary.

**Review (Sonnet, no brief): one finding, real, fixed, and it was a test that could not fail.**
The assertion coupling the detector to the reporter's file searched the whole job block for a filename it had extracted from that same block a line earlier, so the `||` chain ended in a tautology.
The reviewer proved it by re-pointing the detector at a made-up file and watching all five tests stay green.
That is the category this test file was written to police, found inside the test doing the policing, and it is the second time in two batches that a claim of the form "I checked" has been the wrong part.
It also caught the queue entry claiming all five were mutation-checked, which was false for exactly that one.
Repaired to compare the detector's own block against the env line, and mutation-checked both ways.

## Into CLAUDE.md

Nothing.

## New docs/QUEUE.md items

`v141-sync-corner.spec.js` has now failed in SETUP twice, on two independent runs, with two different errors.
The innocent explanation is on the item and has to be checked first: that file has 12 tests against a handful elsewhere, so being the file that meets an infra hiccup is what volume alone predicts.

## New docs/PHONE.md items

None.
Nothing here reaches a user.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Its grep, which does not match, and I would not have found that by reading either.
The only reason it was caught is that the fix was built against a flaky report generated on purpose rather than against the shape of one imagined from the docs.
That is the same lesson as the CI geometry rule: instrument it and look, because a mechanism that cannot fire and a mechanism that has nothing to report are indistinguishable from the outside.

**What did you not propose because it was out of scope?**
The retry count and the annotation, both named out of scope by the item, and both still correct.
I also did not chase the flaky spec the rehearsal surfaced; it is queued with the arithmetic that has to be done before calling it a defect.

## Surprises

The local rehearsal went flaky by itself, on the first run, on the same spec file as the incident that bought `--retries=1`.
So the gate this batch shipped was exercised by a real occurrence within minutes of being written, and the trace it now preserves is the one that named `browser.newContext: Target page, context or browser has been closed`.
Nothing else in this repo has ever caught a flake outside CI.
