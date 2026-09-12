# HANDOVER - 260 (history point repair)

**Branch:** `feat/history-point-repair` · **Scope:** `docs/QUEUE.md` item 89, consolidated item 89. Shipped `ezplate-v214`.

## What changed

**An owner can take a nonsense food-cost reading off the trend chart.**
Batch 241 stopped a 912% reading poisoning the headline average and named the plate on its own Dashboard row, but the point stayed on the chart for good.
Settings now carries a Review row that appears only when there is something to review and only for an owner, names each reading before confirming, and removes it.

Max has two such points on production.
Removing them is his to do in the app; this batch touched no data.

## Review

`code-review` agent, Sonnet against Opus. `docs/reviews/REVIEW-260-history-point-repair.md`, `Reviewed-commit: 0a060c1`.
**Four findings, all real, all fixed.** The two that matter are the same shape from opposite ends: a claim nobody checked.

**A test that could not fail on the guard it was written for.**
It asserted the source CONTAINS `isOwner()`, which is true of `!isOwner()` and `isOwner()` alike, so inverting the guard left it green - the control shown to exactly the staff it hides from, and hidden from every owner.
The data was never at risk because the server refuses the delete; what would have shipped is a dead control.
It now evaluates the function across all four combinations, and `syncHistFixRow` is a mutation target, which is the half that keeps asking.

⚠️ **And a justification I wrote that cited a mechanism whose condition I had not read.**
The delete key was excused by *"`logHistory`'s hourly dedup admits one point per series per hour"*.
That guard is `Math.abs(last.v-v)<0.05 && elapsed<3600000` - **value-gated, not time-gated** - so a reading that moves writes a second point quite legitimately, and nothing in the database enforces the key either.
The key is kept for a reason that is actually true: `mergeSeries` collapses same-millisecond rows into one point before the user ever sees them, so removing both is what the screen offered.
Zero such pairs on production, measured rather than argued.

**The Remove buttons keyed to a list index.** Reproduced in a browser: after a re-sync lands a new reading ahead of the rendered one, an index picks 555.5% - a reading the user has never seen - while identity still picks the 912.5% named on the confirm.
**And three stray macOS duplicate test files** swept in by my own `git add -A`, which never ran, so nothing would ever have gone red.

## Into CLAUDE.md

Nothing.
All four already have sections: the citation trap is *"a justification that CITES A PRECEDENT is a claim that the precedent's CONDITION holds here"*, the test one is roster 167(a), and the fixture I built for the identity tests is 184(b).
`CLAUDE.md` says to stop writing about a rule that already exists, so each instance is recorded at its site and in the review artifact.

## New docs/QUEUE.md items

None.
`syncHistFixRow` and `badPointByIdentity` are now mutation targets, which is where the durable follow-up went: 5/5 and 6/6 killed.

## New docs/PHONE.md items

None.
The Review row is reachable in any browser and was driven in one, so it fails the file's own entry test - *is a phone the only thing that CAN check it*.

## Probe

**What did the queue item tell you to do that you would have done differently?**

Nothing, but it understated its own hard part.
The item was written as a UI affordance - a list, a confirm, a delete - and the delete was the whole of it: the first cut passed every test, repainted correctly, wrote its change-log entry, and **did not delete the row**.
That is only visible signed out, against a real server, in a browser.
**The general thing: an item that describes a screen has described the half that is easy to verify.**

**What did you not propose because it was out of scope?**

A reconciliation between what the client believes it wrote and what the server kept.
`writeLanded` is now used in two places and both were added after the same silent no-op bit someone; every other `pushWrite` caller still reads an absent error as success.
That is a real gap and it is a sweep across dozens of call sites, not a rider on this item.
Filed in `docs/MAINTENANCE.md` rather than queued, because nothing is known to be broken - the paths that were checked are the two that were measured.

I also did not touch Max's two bad readings.
The feature exists so he can, and deleting production data is his, every time.

## Surprises

**The defect was found by signing OUT, which is not a state I would have thought to test a delete in.**
It only surfaced because the browser drive started before signing in and the modal was reachable anyway.
A signed-in owner would have seen it work perfectly, and so would every test.

**Two of the four findings were about things I had written in the same commit to explain why something was safe** - one comment and one test.
Both read as more careful than the thing they were excusing, which is what made them worth trusting and wrong.

**And the mutation gate's flag is `--target=`, not `--fn`**, so a mistyped flag silently ran the entire gate instead of one function and had to be killed at ten minutes.
It reported nothing wrong while doing it, which is the same shape as every other finding here: a tool that cannot tell you it was asked the wrong question.
