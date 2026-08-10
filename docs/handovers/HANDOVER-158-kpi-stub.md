# HANDOVER - 158 (the kpi-strip stub)

**Branch:** `test/kpi-strip-extract-fmttargetpct` · **Scope:** the queue's top item, AUDIT-v145 D1.
**Deploy version: NONE.** Test and docs only, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

`tests/kpi-strip.test.js`'s hand-written `fmtTargetPct` is replaced by `${extractFn(APP, 'fmtTargetPct')}`, so the harness runs the shipped function instead of a copy of it.
A fractional-target test is added at 32.53, and it fails against the stub while the other nine tests pass.
That was verified by putting the exact old stub back and running it, not by reasoning about it.
Suite goes 848 to 849.

The stub had the right shape and the wrong contract.
It carried the `%`, which was the "30%%" fix, and not the rounding, so a fractional target rendered "32.53%" where the real function renders "32.5%".
Nothing caught it because every other test in the file runs at the default target of 30, where `cogsPct%1` is 0 and both branches agree.

## Into CLAUDE.md

Nothing.
The rule this item exists to enforce is already there, added in the previous window as the stub-mirrors-contract entry.
What was missing was a sweep for existing violations of it, not another rule.

## New docs/QUEUE.md items

`extractFn` is hand-rolled in 48 test files because `tests/_extract.js` does not export it.
The shared file ends `module.exports = build()`, which returns a harness object of pre-extracted app functions, so `extractFn`, `extractVar` and `loadApp` are unreachable and any file needing one writes its own.
48 private copies against 15 files using the shared module.
They have not drifted yet, which is the argument for doing it now rather than evidence that it does not matter.

## New docs/PHONE.md items

None.
Nothing here reaches a user.

## Probe

**What would I have done differently from the item?**
Nothing on the substance; the item was accurate, specific and already carried the correction to its own audit's first pass.
The one thing I added rather than changed is the whole-number branch in the same test, so the assertion pins both sides of `cogsPct%1` rather than only the fractional one.
A test that only ever exercises the branch the stub got wrong is one edit away from the same blindness the stub had.

**What did I not propose because it was out of scope?**
The item's own out-of-scope line asks the real question and I left it there: `setCogs` rounds and the boot read does not, so the app has two different ideas of what a target is.
That is a data question rather than a test question and nobody has asked it.
I also did not migrate the 48 `extractFn` copies, which is a batch of its own.

## Surprises

The reviewer reconstructed the stub in a scratch copy and re-ran the suite to check the fails-against-the-stub claim, rather than accepting it.
That is worth noting because the claim is exactly the kind this repo has been burned by before, a green test asserted to be meaningful, and the only way to check it is to make it fail on purpose.
The reviewer reaching for that unprompted is the behaviour the mandatory-review rule is buying.
