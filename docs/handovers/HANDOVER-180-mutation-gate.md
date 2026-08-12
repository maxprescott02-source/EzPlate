# HANDOVER - 180 (mutation gate)

**Branch:** `180-mutation-gate` · **Scope:** `docs/QUEUE.md` item 1, mutation testing as a pre-push gate.
**Deploy version: none.** No client asset changed, so `sw.js` stays at `ezplate-v158` and there was no cache bump.

## What changed

`npm run mutate` flips one operator, or deletes one call, in each of 17 listed functions of `js/app.js`, runs ONLY the test files that claim to pin that function, and fails on any mutant that survives without a written allowance.
`.githooks/pre-push` runs `npm test` then the changed-scope version; install it with `git config core.hooksPath .githooks`, which is already done on this machine.
156 mutants, 11 seconds for the full run, 4 deliberate survivors each with a reason in `tests/mutation/targets.js`.

`tests/push-write.test.js` is new: `pushWrite` had no test running its body at all.
31 survivors from the first run were killed with real assertions across six existing test files.

`CLAUDE.md`'s stub roster is reconciled against the handovers and is now twelve incidents.

## Not Stryker, and that is a finding rather than a preference

Every test here reads `js/app.js` as text and cuts a function out by exact anchor.
Stryker regenerates source from its own AST, so `var INV_EXCLUDE=` becomes `var INV_EXCLUDE = stryMutAct_…(…) ? … : …` and every anchor stops matching.
The suite would go red on mutant #1 and stay red, which reports every mutant killed and proves nothing.
That is the same false green the gate exists to catch, one level up, so the mutation is textual and leaves every byte it is not changing where it was.
The reasoning is at the top of `tests/mutation/mutate.js` so nobody re-derives it.

## The three things the first run found

**`pushWrite` had no test running its body.**
Six test files name it and not one executes it: `change-log` and `history-paths` stub it to THROW, which is correct for what they test and is the opposite of pinning it, and `delete-sequencing` asserts that two callers contain the string `return pushWrite(`, which pins the call site.
Every mutant survived, including deleting the `!` from `if(!SUPA)`, which inverts the no-connection branch so every write with a live client takes the failure path.
`CLAUDE.md` states this function's contract twice and AUDIT-v135 had to correct the file on it, which is a documentation fix where a test was wanted.

**`NODE_TEST_CONTEXT` is inherited and suppresses the child's exit code.**
`node --test` sets it on the processes it spawns, and any node process that sees it reports results to a parent instead of through its own status.
The gate's self-test drives the runner from inside `node --test`, so the variable was present, so every mutant came back status 0.
A gate reporting a perfect score while checking nothing, found by the gate's own self-test on its first run.
`runTests` now deletes the variable, with the reason written at the call.

**31 survivors, all real.**
The largest clusters: `flagNeedsAttention`'s five-clause guard was almost entirely unpinned (a dangling `bestId` would have thrown mid-render, a zero stored price divided by zero, an `ea` product scaled like a weight); `dbDeletePlateAfterDishes`'s status object was never read by any assertion, only its call order; `publishPlan`'s menu comparison could read every dish as being on the Original menu because every existing case used that menu; `parseBackupFile`'s refusals were pinned by `ok:false` and never by which refusal.

## Into CLAUDE.md

Edited directly under the 13 Aug 2026 standing authority, and reported here rather than parked.

- The stub roster is now **twelve** incidents, sourced from the handovers.
  It said seven; `docs/QUEUE.md` separately claimed ten across 165-176.
  Both were wrong and the two lists were counting different things.
  The five missing were 162 (a tautological assertion, in the file written to police this class), 167a (order-only, green against an inverted guard), 167b (a fragment looked for at the end of a source, where there is always code after it), 173 (the `uid` counter masked by real `crypto`) and 174 (`S.purges` read but never incremented).
  Seven of the twelve fall in 165-176; the queue's ten could not be sourced from any handover.
- The gate itself, in the same section and in the review section of Tier 3, including that a survivor is not a suggestion and that `--no-verify` must be declared in the handover.
- `skills/handover/SKILL.md` still said to propose `CLAUDE.md` rules and wait for a yes.
  That contradicted the reversal recorded in `CLAUDE.md` on 13 Aug 2026, so it is corrected.

## New docs/QUEUE.md items

None.
The finished item is deleted, and the items below it are renumbered.
`10a`/`10b` moved back from `11a`/`11b` now that slot 1 has freed, which is the THIRD renumbering of those two, so `10b`'s `Do after:` line now names its dependency instead of numbering it and says why.

Two items went to `docs/MAINTENANCE.md`, both C by `CLAUDE.md`'s rule that a missing test is C by construction:

- **`gemApplyReadings` under the gate.** Measured at 44 surviving mutants against `invoice-gate.test.js`, which pins exactly one property of it.
  It is in `tests/mutation/targets.js` under `pending` with that count, deliberately outside `targets`: a gate nobody can satisfy gets disabled, which is worse than one target short.
- **More functions on the target list**, with the next candidates named.

## New docs/PHONE.md items

None.
Nothing in this batch is reachable from the app.

## Probe

**What did the queue item tell you to do that you would have done differently?**

The item required every surviving mutant in the covered areas to be killed or written down as deliberate, and 77 survived the first run.
Doing all of them would have meant writing a coverage suite for `gemApplyReadings` inside this batch, so I held that one function back instead, with its measured count in the file and an item pointing at it.
That is a smaller gate than the item asks for and it is deliberate: shipping a gate that exits 1 on `main` would have made the first person to hit it delete the hook.

The item also named the `[hidden]` corollaries as a starting scope.
Those are CSS, and this gate mutates JavaScript, so they are not covered and cannot be.
`tests/css-syntax.test.js` is the guard that exists there.

**What did you not propose because it was out of scope?**

`buildBackup` is not pinned by any test that runs it, which the target list made visible when I could not name a test file for it.
It is the exporter for the file that is the only recovery path there is.
I did not add it: it reads a dozen live globals, so testing it is a harness job rather than an assertion, and it belongs with item 10a, which is already rewriting that function.

`api/_gemini.js` and the other `_`-prefixed server modules are `require()`-able and unit-tested, and the gate cannot mutate them, because it mutates one named file.
Widening it is a config change rather than a design one, and nothing suggested it was needed yet.

## Surprises

**The gate's own self-test found the bug that would have made the gate useless**, on its first run, before it had reviewed a single line of `js/app.js`.
The item asked for a proof of non-vacuity because a gate that cannot fail is the same defect one level up; that proof paid for itself immediately.
It is two-sided on purpose: one fixture test file pins every condition and must leave zero survivors, another pins none and must leave many.
Either half alone is satisfied by a harness that always answers the same way.

**Six test files named `pushWrite` and none of them ran it.**
This is the shape `CLAUDE.md` already describes, but the count is the part worth recording: the function is named in enough places that a reader would reasonably conclude it was covered, and reading the files is what would have produced that conclusion.
The gate needed no judgement to see it.

**One targeted run gave a result I could not reproduce**, reporting eleven survivors where every other run of the same command reported one, with a clean working tree both times.
I did not find the cause and I have not claimed one.
What I did instead is remove every way a verdict can come from an unmutated file: the sandbox directory now carries the process id, so two runs cannot share one tree, and each mutant is **read back off disk and compared** before its verdict is believed, with a mismatch throwing rather than reporting.
Three consecutive targeted runs and two concurrent ones now agree.
Worth stating plainly because the alternative was to explain it away, and a gate whose output is not reproducible is worse than no gate.

**A survivor's key must not carry a line number.**
The obvious identity for an allowance is `file:line`, and line numbers in `js/app.js` drift every batch, so an allowance would silently start excusing a different mutant.
Keyed to the line's TEXT instead, an allowance stops matching the moment the code it excused is edited, the survivor comes back, and someone re-judges it.
The gate also fails on an allowance that is no longer needed, because a list nobody prunes becomes permission to ignore everything.
