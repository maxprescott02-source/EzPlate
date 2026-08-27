# HANDOVER - 211 (the test harness process leak)

**Branch:** `fix/test-process-leak` (PR #221, merged) · **Scope:** not a queue item. Max reported his machine out of application memory and asked for the root causes fixed.
**Shipped no deploy version** - nothing under `js/`, `css/`, `index.html` or `sw.js` changed.

⚠️ **This batch MERGED BEFORE 210, whose PR was already open and verified.** The numbering is by batch, not by merge order, and 210's own handover is unchanged and correct as written.

## What changed

`npm test` no longer leaks four permanently-spinning node processes per run.

`node --test` runs each test file in a child process, and `tests/mutation/run.js` kills a hung mutant with SIGKILL, which cannot be caught - so the parent died without tearing its workers down and they were reparented to launchd and kept running forever.
`tests/mutation-gate.test.js` runs two deliberately non-terminating mutants to prove a hang is classified as a kill, and that file is part of `npm test`, so every single run of the suite leaked four.
Measured: 0 orphans before, 4 after, from that one file.
An 8GB machine reached about 40 orphans and 18.66GB of swap.

The fix is two lines: `detached:true` makes the child a process-group leader, and `process.kill(-pid)` signals the whole group.
`--test-isolation=none` also fixes it and was rejected on evidence, because it turns the gate's own self-test red.

`npm test` is capped at `--test-concurrency=2` and Playwright at `workers:2` in config, so a future leak cannot saturate the box.
`tests/preflight-processes.js` reaps orphans ahead of the pre-push hook and both mutate scripts.

## Review

`code-review` on Sonnet against work on Opus 5, without a brief.
Report: `docs/reviews/REVIEW-211-process-leak.md`.
**Five findings, four fixed, one accepted as a named trade-off the agent itself declined to call a defect.**

The two worth knowing: my group kill fired on **every** call rather than only on timeouts, which widened a pid-reuse race instead of closing one - and a wrong kill that succeeds raises nothing, so it would have been indistinguishable from the no-op I assumed it was.
The review proposed instrumenting rather than arguing; across 37 mutants the unconditional kill succeeded zero times and threw "already gone" 37, so it bought nothing off the timeout path and is now scoped.
And the preflight's node-executable guard had **no fixture that could exercise it** - deleting it changed nothing and all eight tests stayed green.

## Into CLAUDE.md

**Nothing, and that is a deliberate call rather than an omission.**
Both defects above are instances of shapes the Tier 1 roster already records - an assertion incapable of failing, and a default whose two branches hide a third outcome - so per the roster header's own rule the number is left alone.

The one thing that is genuinely new is not about code: **a performance measurement is a claim about the MACHINE as much as about the code, and nothing in the number says which.**
It is written into `docs/MAINTENANCE.md` at the entry it falsified rather than into `CLAUDE.md`, because it is a correction to a specific recorded measurement rather than a rule a batch could violate without knowing.
If it recurs, it earns a Tier 1 line.

## New docs/QUEUE.md items

**None.** Nothing here would stop, embarrass or hurt a paying customer; it is entirely internal tooling.

## New docs/PHONE.md items

**None.** Nothing a device can judge.

## Probe

**What did the request tell you to do that you would have done differently?**
Max's item 2 was "the mutation gate runs at full core count - cap worker concurrency to 2".
The gate does **not** run at full core count: it is `spawnSync`, strictly one mutant at a time, and the parallelism is one level down inside `node --test`.
Capping was still worth doing, but it treats a symptom; the leak was the disease, and a batch that only did what was asked would have left it in place.
I said so before applying rather than quietly widening the scope.

**What did you not propose because it was out of scope?**
That `tests/mutation-gate.test.js` deliberately spawns non-terminating processes at all.
It is the honest way to prove the classification and I would not change it - but it means the suite's correctness depends on the harness cleaning up after a SIGKILL, and nothing said so anywhere until this batch.
I also left alone the fact that a fresh clone runs no pre-push gate until `core.hooksPath` is set by hand, which is recorded elsewhere and is not mine to re-open here.

## Surprises

**The leak was costing ten times the runtime, and that fed back into causing more of it.**
The full gate ran in 935s with the orphans present and 96s on a clean machine - same command, same laptop.
They were starving it of the six cores it was competing for.
That slowness is *why* I started running the gate concurrently with Playwright and detaching it with `nohup` so it would survive, which leaked more, which made it slower.
I was inside the loop and reading it as the gate being slow.

**It invalidated a maintenance entry that had already been corrected twice for being unmeasured.**
`docs/MAINTENANCE.md` recorded "306s at 54 targets, 801s at 64" and concluded the cost scaled toward a CI bound; the clean re-measurement is 96s at **71** targets.
That entry had twice warned its predecessor "had never been timed", added a measurement and a date, and was still wrong - because the missing control was never "did you time it".

**The rebase broke the review artifact gate**, which nothing had exercised before: rewriting SHAs left `Reviewed-commit:` naming a commit no longer on the branch, and the push was refused.
The reviewed files were byte-identical across the rebase, checked rather than assumed, so the pointer moved and the artifact now records that it did.
