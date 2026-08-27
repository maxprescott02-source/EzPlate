# REVIEW-211 — the test harness process leak

Reviewed-commit: f973a14
**Agent:** `code-review`, on **Sonnet** against work done on **Opus 5**, on the branch diff, without a brief.
**Outcome:** five findings. **Four fixed, one accepted as a named trade-off the agent itself declined to call a defect.**

Findings below are the agent's claims; my decision follows each.

---

## Finding 1 — the process-group kill was unconditional, widening a PID-reuse race

> **the process-group kill is unconditional and unverified, widening a real (if narrow) race window instead of closing it.** `tests/mutation/run.js:100-102`
>
> This fires after *every* `spawnSync` call, not just the timed-out ones — the comment itself says "the group is already gone on the ordinary path," meaning on the success path this line's only purpose is defensive cleanup of something that should no longer exist. A process group id becomes free for OS reuse the instant its last member exits, and `spawnSync` returning is exactly that instant on the success path. There is no check that the pgid still belongs to the child this function spawned […] **a *successful* wrong kill produces no error at all, so it is indistinguishable in the logs from the documented "already reaped" no-op.**
>
> Verify: instrument the line to log when `process.kill` actually succeeds (vs. throws) across a full `npm run mutate` run and check whether it ever fires on the non-timeout path; a nonzero count there is the signal.

**Taken: correct, and FIXED — and I ran the verification it proposed rather than reasoning about it.** Instrumented across 37 mutants: the unconditional kill **succeeded zero times and threw "already gone" 37 times.** So it bought nothing off the timeout path and was pure exposure, hundreds of times per run, on a machine this same script churns pids on.

The kill is now scoped to `timedOut`. Confirmed the fix still works where it matters: a full gate run contains a real timeout (`computeInsights`) and leaks **zero** orphans.

The sharpest part of the finding is the part about evidence, and it is now written at the site: a wrong kill that succeeds raises nothing, so it would have been indistinguishable from the no-op it was assumed to be.

## Finding 2 — a whole guard had no fixture that could exercise it

> **an entire guard in the reaper's signature has no fixture line that isolates it, so mutating it away leaves the whole test file green.** `tests/preflight-processes.js:47`
>
> […] no fixture line depends on the node-executable regex to be excluded or included — deleting or inverting `tests/preflight-processes.js:47` produces identical output on this fixture, and all 8 tests in `tests/preflight-processes.test.js` still pass. The file's own header comment calls this check part of "the signature… narrow on purpose," but nothing proves it does anything.

**Taken: correct, and FIXED.** This is the repo's most-recorded defect class, in a file written the same hour, by someone who had just read the roster about it. The agent traced it by hand and was right.

The fixture gained a line excluded by **exactly one** guard: an orphaned `/bin/sh` loop whose argv carries the flag. Deleting the node check now turns the file red — confirmed by running the mutation.

## Finding 3 — a test's title named a reason its assertion could not see

> **a test's stated purpose isn't what its assertion actually exercises.** `tests/preflight-processes.test.js:43-45`
>
> PID `36026`'s line in the fixture […] has `ppid=36015`, not `1` — it's already excluded by the `ppid!=='1'` filter alone, regardless of whether it carries `WORKER_FLAG`. The comment claims the exclusion is because it "carries no worker flags," but the `ppid` check alone fully explains the result.

**Taken: correct, and FIXED.** Roster 205's sibling — a title naming a property the assertions cannot see. Re-fixtured onto pid 36013, an **orphaned** node `--test` parent, which is both the honest case and a real one: `nohup npm run mutate` leaves exactly that shape, and it must not be reaped.

## Finding 4 — `reap()` and `main()` had no coverage at all

> Only `findOrphans` has assertions […] The actual destructive call […] and `main`'s `--reap`/`--warn`/default exit-code logic — **the part that decides whether `mutate`, `mutate:changed`, and the pre-push hook proceed or block** — have zero test coverage. A wrong pid reference, an inverted early-return, or a flipped `warnOnly` branch would ship undetected.

**Taken: correct, and FIXED.** The untested half was the half that decides whether a push proceeds — an inverted branch there turns the preflight into a no-op that still prints reassuring output.

`main` now takes an injectable orphan list so its exit codes can be asserted without a real process table. `reap` is tested against a **real** child process (`sleep`), not a stub, because a stub would only prove a function named `kill` was called. Both mutations — inverting the blocking branch, and making `reap` not kill — confirmed red.

## Finding 5 — `--reap` cannot tell wreckage from a deliberately-disowned run

> a developer who intentionally backgrounds and disowns a long `node --test --test-concurrency=1 tests/slow.test.js &` run […] has that exact signature the moment their shell exits, and it will be silently `SIGKILL`ed on the next unrelated `git push` […] This is explicitly the documented intent ("reaps rather than refusing"), so I'm not calling it a defect, but it is a real, irreversible cost of the design as wired, not a hypothetical. Relatedly, the match itself is a naive `command.includes(WORKER_FLAG)` substring check rather than a token-boundary check.

**Taken: the substring half FIXED, the trade-off ACCEPTED and now stated where it is wired.**

`WORKER_FLAG` is now `--test-concurrency=`, which is how the real worker always spells it, so a process that merely *mentions* the flag no longer matches. The fixture carries a node process doing exactly that, so loosening it back fails behaviourally rather than only tripping the literal-equality check.

The disowned-run cost is real and I am keeping the behaviour: the alternative is refusing the push, and a gate that stops your push to tell you about someone else's dead processes is one you learn to skip — this repo's most-recorded gate failure. What I will not claim is that it cannot bite. It is written at the wiring site rather than left to be discovered.

## Not defects

> **No defect found for items in the "does capping concurrency change outcomes" and "does the detached kill change stdout/stderr/exit-code capture" categories.** `opts.detached=true` is set after `r`'s fields would be read, and the extra `process.kill` call runs after `spawnSync` has already populated `r.status`/`r.error`/`r.stdout`/`r.stderr` […] I found no test file in `tests/*.test.js` that depends on inter-file parallelism, a fixed port, or a non-pid-suffixed shared temp path […] so `--test-concurrency=2` and Playwright `workers: 2` look like pure throttling, not an outcome change.
