# HANDOVER - 163 (the browser segfault)

**Branch:** `chore/segv-diagnosis` · **Scope:** the queue's top item - why `v141-sync-corner.spec.js` keeps dying in setup.
**Deploy version: NONE.** Docs and one CI comment block, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

No code. The item was an investigation and it produced an answer to both halves of its own question.

`.github/workflows/test.yml`'s `--retries=1` comment block now states the measured mechanism instead of the guessed one.
`docs/QUEUE.md` closes the item with the census and the arithmetic, and carries two follow-ups.

## The cause

**The browser process segfaults.**

All **five** CI occurrences carry `Received signal 11 SEGV_MAPERR 0000000001b0` in the Chromium stderr, and all five crash at the **identical instruction, binary offset `0x2af9eec`** - computed by subtracting a frame's module offset from its absolute address, so it survives ASLR - with `ax` at 0, `cr2` at `0x1b0`, and `rcx` holding the ASCII `ocalhost`.
It is one bug, five times, not a family of crashes.
That is a null dereference at a fixed member offset in `chrome-headless-shell-1228`, under Playwright 1.61.1.
`--disable-dev-shm-usage` is already on the launch line, so the usual `/dev/shm` explanation is excluded before it is raised.

**The item's central number means the opposite of what it says.**
It read the 30002ms as "the 30 seconds is consumed entirely by context creation".
It is 30 seconds spent waiting on a process that is already dead - Playwright's `context` fixture sits in the test timeout when the browser has gone.
For the same reason **the item's "two different errors" are one event**: `Target page, context or browser has been closed` and `Test timeout … while setting up "context"` differ only in whether Playwright had noticed yet.

Nothing in the spec's own code is involved.
The item noticed that the file manages no contexts of its own and called it the thing that made it worth a proper look; it was right, and this is why.

## The census, and why the concentration is left unexplained

**The premise "all in this one file" is false.**
A census of all 42 `tests` workflow runs of 10 Aug - the `v141-sync-pill-corner` branch runs are *inside* that 42, not additional to it - finds **six** occurrences in **two** spec files, five in CI and one local:

| run | when | test |
|---|---|---|
| `31348972108` | 02:08, branch | `v141-sync-corner.spec.js:90` @1440 |
| `31349737666` | 02:25, branch | `v141-sync-corner.spec.js:90` @1280 |
| `31359764333` | 05:48, **main** | **`v142-menu.spec.js:67`** |
| `31368954663` **attempt 1** | 08:11, branch | `v141-sync-corner.spec.js:174` |
| `31380462471` | 10:44, PR #144 | `v141-sync-corner.spec.js:125` |
| — | local | `v141-sync-corner.spec.js:229`, same error string, no log kept |

The `v142` one is the run that turned `main` red, and it had been in the record the whole time.
"Three of three in the 5.7% file" was a count of the occurrences someone had looked at, not a count of the occurrences.

**Two of the six are not independent samples.**
Both branch-run occurrences come from runs where two other `v141` tests were failing for a known unrelated reason - the ICB-geometry assertions that batch was fixing - and **Playwright discards the worker and launches a fresh browser after every failure.**
That is not read from the docs: PR #144's own report shows worker 1 dying and the retry running on a worker 2 that had not existed before.
So those two are conditioned on `v141` already failing.
The local one has unknown sampling; what was actually run during the rehearsal is not recorded anywhere.

**That leaves three clean CI occurrences: `v141` twice, `v142` once.**
`v141` is 12 of 209 tests, 5.74%, so two-or-more of three landing in it is about **1 in 105**.
That is a long way from the 1 in 5,400 the item's framing implied, and much too weak an n to call a defect - but it is not "chance, demonstrated" either, and saying so would be the same overreach in the other direction.

**Recorded as unexplained.**
The only testable mechanism was refuted (below), the failure is a browser bug whatever tilts the odds, and the response is a retry either way.
What the queue now asks for instead is cheap and sufficient: **record the file every time one appears.** A third file closes it.

## The lead that died

Worth writing down because it was the only substantive one and because it was killed by its own control rather than by argument.

Crashes land at context boundaries, so the file that creates and destroys the most contexts per second should meet the most of them.
`v141-sync-corner.spec.js` looked like that file - its `:105` tests run in about 600ms.

It is not.
`v137-modal-layer.spec.js` runs **22 tests at a 1215ms mean** against `v141`'s **12 at 2235ms**, so it churns contexts nearly twice as fast, and it has never crashed once.

## Occurrence 1, and the `gh` trap that hid it

This section was first written as "occurrence 1 cannot be located", with the search that proved it.
The search was wrong, and the reason is worth more than the result.

The incident that bought `--retries=1` is **run `31368954663`, attempt 1** - `v141-sync-corner.spec.js:174`, `Test timeout of 30000ms exceeded while setting up "context"`, `Received signal 11 SEGV_MAPERR 0000000001b0`, 208 passed and 1 failed, with attempt 2 green at 209/209.
Exactly as `test.yml` had described it.

**`gh` reports that run as having one attempt.**
Both `gh run list --json attempt` and `gh run view <id> --json attempt` return `1` for it.
Only the REST field `run_attempt`, via `gh api 'repos/:owner/:repo/actions/runs?created=…'`, says `2`; and only `gh api …/actions/runs/<id>/attempts/1/jobs` will hand you the failing job's log.
A re-run therefore hides the original attempt from every `gh run` subcommand, `--log-failed` included - that one cheerfully returns the *passing* attempt's log and reports no failure.

So the first pass checked fifteen runs by hand for the error string, found nothing, and concluded the incident had never happened.
That claim was in this handover and in the queue entry, and it was caught by the sweep that was meant to *harden* it - widening the search from fifteen runs to all 42 was what surfaced the one run with `run_attempt: 2`.
**A negative result from a tool is a claim about the tool**, which is the same lesson as the flaky grep that matched zero times one batch ago.

## What this means for `--retries=1`

It is not a workaround, it is the correct response, and the case for it is stronger than the one originally written.
A segfault is unambiguously infra: it cannot be a regression in the diff, and a fresh worker gets a fresh browser.
The cost is 30 seconds per occurrence.

Three claims in that comment block were disproved and are corrected in place: "one slow `browser.newContext` under load", "a slow context launch", and "contention is a plausible cause and it was not measured".
Contention has now been measured and is not it - load does not produce a segfault at a fixed code offset - so workers stay at 2 on a better reason than before.

The paragraph stating that retries hide an intermittent real bug is untouched. That cost is still accepted and still real.

## Review (Sonnet, no brief): one major finding, already self-caught; one minor, fixed; one claim strengthened

**The major finding was the "occurrence 1 cannot be located" sentence** - the same claim I had already removed before the review returned, arrived at independently and by a different route.
It did not need `run_attempt`: it simply grepped run `31349737666`, **which my own census table cites**, and found `Test timeout of 30000ms exceeded while setting up "context"` sitting in it.
So the sentence was false twice over, and the second way was visible in my own evidence.
That is worse than the first and worth stating plainly: I wrote "no run in the window contains that timeout string" while holding a grep result that contained it, because I had gone looking for the *pass-count signature* and stopped reading once the run ids did not match.

Nothing to fix - the sentence is gone - but the review is the reason it is recorded as a near miss rather than quietly dropped.
Worth noting the reviewer, working only from `gh run`, could not find the batch-159 incident either and said so honestly. The trap is real and it caught both of us.

**Minor, fixed:** the census read "all 42 runs … plus the three branch runs", which implies a denominator of 45. The branch runs are inside the 42. Reworded in both files.

**A claim strengthened rather than corrected.** I had written that three of the five occurrences crashed at the identical instruction, because three were as far as I had carried the arithmetic. The reviewer recomputed two more. I re-derived all five myself rather than take it: `31348972108`, `31349737666`, `31359764333`, `31368954663`, `31380462471` all land on `0x2af9eec`. **All five, not three** - so it is one bug five times, and the queue, the handover and the workflow comment all say so now.

Everything else it could check independently held: the 42-run count, every SEGV site, the offset arithmetic, the 22-at-1215ms vs 12-at-2235ms figures from the retained artifact, Playwright's post-failure worker relaunch as documented behaviour rather than an invented mechanism, the workflow diff being comment-only, and `ci-workflow.test.js` stripping comments before asserting so this rewrite cannot move it either way.

## Into CLAUDE.md

Nothing, and one candidate considered and declined rather than skipped.

The segfault itself is one dependency's bug at one version, and the queue's Chromium-bump item exists to make it go away rather than to be remembered.
The durable lesson - that a failure's stated mechanism is a separate claim from the failure - is already Tier 3.

**The `gh run` re-run trap was weighed for Tier 1 and left out.**
It passes the "would a competent model get this wrong" test, and it did get this one wrong.
It fails the other half: it is a fact about `gh`, not about this repo, and Tier 1 exists for things that look like mistakes *in this codebase* and are not.
It is written at the two places a reader needs it - `test.yml`'s comment, beside the run id, and this handover - rather than in the file that is meant to stay short.
If it bites a second time, that is the argument for promoting it, and this paragraph is the record that it bit once.

## New docs/QUEUE.md items

1. **A browser segfault reads as a mystery flake.** The `flaky` annotation says a spec passed on a retry and not that the browser crashed, so the reader's first hypothesis is their own diff, which is the one thing it cannot be. `Received signal` is already in the json report; surface it in the warning. Must fail open like the existing detector.
2. **Playwright / Chromium bump.** The only actual fix. Not urgent because retries hide it competently. It cannot be shown to have worked, only to have not recurred - measured rate is 5 CI occurrences across 42 runs - so record the version and the date and treat a later occurrence as evidence against the bump.

## New docs/PHONE.md items

None. Nothing here reaches a user.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It sent me to look at what was different about the file's context setup - worker assignment, scheduling position, `installBoot`, the viewport loop.
All of that was the wrong question, and the item could not have known it.
The answer was one field in a trace nobody had opened: the artifact the previous batch built the gate for had been downloaded, but only the timing numbers were read out of it, and the browser log sitting in the same file names the cause in one line.

**What did you not propose because it was out of scope?**
The detector step and the Playwright bump, both queued.
Neither belonged in an investigation batch, and the second changes what the browser specs render, which is not something to ride along on a docs diff.

## Surprises

The evidence that killed the item's premise was in GitHub the whole time.
`31359764333` failed on `main` at 05:48 with the identical segfault in `v142-menu.spec.js`, four hours before the item was written asserting that no other file had ever done this.
Nothing looked, because the file that had failed most recently was the one that got counted.

The second surprise is smaller and more useful: two of the six occurrences are from runs that were already red for an unrelated reason, and a failure causes a browser relaunch.
So the naive census over-counts the file that was under development at the time, which is exactly the file that then looks cursed.

The third is the one I would most want to have known at the start.
I wrote "occurrence 1 cannot be located" into two files, with a fifteen-run search behind it, and it was false - `gh run` hides a re-run's original attempt and reports it as attempt 1.
It was caught only because I went back to widen a claim I had already stated more broadly than I had measured it.
The near miss is the finding: the wrong version was well-evidenced, confidently worded, and would have sent the next reader looking for an incident I had told them was not there.
