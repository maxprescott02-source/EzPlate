# HANDOVER - 165 (the segfault reproducer, and the bump that does not fix it)

**Branch:** `ci/segv-probe-and-bump` · **Scope:** the queue item - test the tightest-cycle hypothesis, then bump Playwright / Chromium.
**Deploy version: NONE.** A devDependency and docs, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

`@playwright/test` 1.61.1 to 1.62.1, which moves `chromium-headless-shell` 1228 to 1234.
Nothing else ships: the two probe specs that produced the result were deleted before merge, as the item required.

## The hypothesis is confirmed, and the item's own probes would have said so wrongly

The item named two probes, and both lengthen the short test and ask whether the crash goes away.
It also says a green run cannot settle that, at six occurrences in forty-four runs.
So the experiment was inverted: amplify instead of dilute.

A tight arm reproduced `v141-sync-corner.spec.js:105` exactly, boot and wait for `showTab` and end, so the context is torn down while the service worker registration started on window load is still in flight.
A control arm was identical but for a 1500ms wait.
Playwright parallelises by file, so the two arms ran in separate browser processes.

Across three CI runs the tight arm crashed nine times and the control arm never.
On Chromium 1228 that is six of 210 against zero of 210, Fisher one-sided p about 0.015.

The padded arm crashed zero times in 360 cycles.
That is the number that matters for the item's own probes: either of them would have come back clean and been read as a fix.

## The bump does not fix it

Chromium 1234 crashed three of 150 tight cycles, against 2.9 percent on 1228.
Indistinguishable.

The item recorded that a bump "cannot be shown to have WORKED, only to have not recurred".
That is true of a bare bump and stops being true once a reproducer exists, which is the argument for doing the experiment first.
The bump is kept anyway, green at 209 of 209, because landing it with the result recorded is what stops the next person reaching for "just bump Chromium".

## Into CLAUDE.md

Nothing proposed, though one candidate is worth naming for the next time it happens.
A local reproduction of a CI command is not a reproduction until it is run in CI's shell.
It cost real time here and is written into the queue entry rather than proposed as a rule, because it has happened once.

## New docs/QUEUE.md items

One: the specs register a service worker they never test, and that is what crashes the browser.
It carries the mechanism, the acceptance test, and the warning not to measure it with a green suite.

## New docs/PHONE.md items

None.

## Probe

**What did the queue item tell you to do that you would have done differently?**
The experiment design.
Both probes it named were absence tests, on a question it had already established absence could not answer.

**What did you not propose because it was out of scope?**
Blocking service worker registration in `_boot.js`, which the evidence now points at as the actual fix.
It changes what 209 specs exercise, so it is its own item with its own review rather than a ride-along on a dependency bump.

## Surprises

I raised a finding that Playwright 1.62 had broken CI's argument form, having reproduced it three times locally.
Its control disproved it: the same command found no tests under 1.61.1, the version CI runs green every day.
The cause was zsh, which does not word-split an unquoted `$SPECS`, so all 21 paths arrived as a single argument.
Without that control I would have queued a blocker that does not exist.
