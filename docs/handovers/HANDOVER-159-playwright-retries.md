# HANDOVER - 159 (Playwright retries)

**Branch:** `ci/playwright-retries` · **Scope:** the queue's top item, the spurious red that blocked batch 155.
**Deploy version: NONE.** CI and docs only, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

`--retries=1` on the CI Playwright command line, so one slow `browser.newContext` under load no longer fails a whole PR.
It went on the command line rather than into `playwright.config.js` as the item specified, because the workflow's own comment block states the convention: every flag is set there so `npm run shots` and a local run behave exactly as they did.
A config branch would have been the first exception to that rule for no gain.

Workers stay at 2, per the item's own instruction to measure before assuming.
The job runs about 7 minutes against a 15 minute timeout, and halving parallelism to chase a rare flake risks trading it for a routine timeout.

The stale spec count in the same comment block is corrected from "9 specs, 8 survive" to 22/21.
That was a Small-list item flagged by two consecutive audits, and it cost nothing here because this batch was already in that block and already paying for the mandatory review.
That is also the answer to the question the item kept asking about why it was never taken: not difficulty, but that nothing else had needed to touch the file, and a workflow change costs a full review.

## Into CLAUDE.md

Nothing.

## New docs/QUEUE.md items

A flaky-but-green Playwright run throws away the only trace worth having.
The upload step is gated `if: failure()`, which does not fire when a test fails once and passes on retry, so the trace Playwright retained for the failed attempt is discarded with the runner.
The fix needs a json reporter and a step that detects `"status":"flaky"`, which is real machinery in a job kept deliberately minimal, so it is queued rather than bolted onto the change that revealed it.

## New docs/PHONE.md items

None.

## Probe

**What would I have done differently from the item?**
Two things, and one of them matters.
The item said to put `retries` in `playwright.config.js`; the file's own documented convention says CI flags go on the command line, so it went there.
More importantly, **the item's stated reason was wrong and I would not repeat it**: it said a retried pass "is not a silent pass, which is what keeps this honest".
At the job level it is exactly a silent pass, because a run where every test eventually passes exits 0 and the check goes green.
The change is still right, because a spurious red trains the reader to dismiss red, but it is a cost accepted rather than avoided, and the workflow now says so at the site.

**What did I not propose because it was out of scope?**
Nothing was held back on scope grounds.
The one thing I chose not to build inside this change is the flaky-artifact gate, and it is queued with its mechanism written out.

## Surprises

My own comment was the defect the review found.
The first draft asserted "this does not hide a failure ... a genuinely broken test fails twice and the job is red as before", which is true only for deterministic breakage.
An intermittent real regression, a race or a timing bug of the kind these visual specs exist to catch, presents identically to an infra hiccup and now has a better chance of going green.
The safety net is therefore an annotation and a human reading it, which is why the file now says in as many words that a flaky annotation on a green check is a finding rather than noise.

Second, smaller: the first attempt to drive the CI command locally reported "No tests found", which looked briefly like a real defect in the spec-list expansion.
It was zsh not word-splitting the newline-separated list.
Actions runs bash, where the same expression yields 21 arguments, and the run is 209/209 green.
Worth knowing before someone reproduces a CI shell step in this environment and believes the result.
