# HANDOVER - 227 (AUDIT-v186 filed, and what it found applied)

**Branch:** `chore/audit-v186` · **Scope:** `docs/QUEUE.md` item 10, the audit counter firing at a gap of exactly 10. **Shipped no deploy version** - no client asset changed.

## What changed

`docs/audits/AUDIT-v186.md` exists, which is the whole of the item: the agent is read-only and hands its report back, so an unfiled report leaves the counter at v176 and the next audit is never queued.
The report is verbatim, with a disposition table appended by this batch saying what was done about each finding.

**The verdict is healthy and is worth stating rather than skipping.**
The protected parser region has been byte-stable since batch 197, hash recorded in the report for the next audit to compare against.
Zero dead traps, the eighth consecutive clean result.
All ten batches that shipped a client asset since v176 left a review artifact, which is the gate 207 built working exactly as intended.
92 mutation targets, all resolving to real functions and real test files.

**Corrections applied, every one re-measured independently first**, because another agent's results are not taken at face value here and eight of its claims were spot-checked before anything was edited.
`CLAUDE.md`: the three backup-format claims, which batch 219 moved together; "the three other restore paths" is five; Bidfood 37; 512 commits; a citation whose line number had become `submitInvite`; and a pointer at a `Do after:` line the queue had correctly deleted.
`docs/MAINTENANCE.md`: two live items still gave "staging is paused" as their blocker, and staging came back on 29 Aug with two batches rehearsed against it since.
`docs/QUEUE.md`: item 2b read `Blocked on: NOTHING` under a `blocked` heading, which is the exact phrasing item 5 records as preceding a near-miss on destructive work; item 7 pointed the next batch at `kingMissingImpact`, deleted in `ezplate-v139`.
`docs/PHONE.md`: the "Settled" heading named seven live sections below it and there are thirteen, two of them the file's own money-critical class.

**Every number that rots is now replaced by the command that measures it, not by a fresher number.**
The Bidfood count has been hand-corrected three times and the commit count twice.
This is the same conclusion the `:not([hidden])` paragraph and the `cafe*` key list already reached, applied to four more places.

## Review

**Skipped, and the gate agrees rather than my judgement.**
`node tests/review/check.js --explain` returns *"nothing that runs was changed - no review required"*: the diff is `CLAUDE.md`, three `docs/` files, one skill and the new audit report.
`CLAUDE.md`'s pure-prose exception is the one that applies, and no `--no-verify` was used.

## Into CLAUDE.md

**Two, both made under the standing authority, both named once rather than re-found.**

**A comment can record the defect CORRECTLY and file it under the wrong consequence.**
Three dated instances in fifteen batches - 212, 225, 226 - each of which correctly declined to add a roster bullet, because the roster is about tests and this is about comments, and the shape was left with no name of its own.
The tell is a comment that states an observation and then tells you not to worry about it.
It is the mirror of the rule already in the file about review findings: there, a wrong mechanism can still point at a real bug; here, a right observation can still have been disposed of wrongly.

**An item that names a behaviour without naming its sites is an item whose list is already wrong**, added to `docs/QUEUE.md`'s header rather than to `CLAUDE.md`, because it is about how an item is WRITTEN.
Seven of the last eleven batches found their item's own enumeration short - 222 said six callers of `costFromLines` and found nineteen.
`CLAUDE.md` blames age, and age no longer explains it: 222's item was days old and 221's was one line.

## New docs/QUEUE.md items

**None, and one deleted.**
Item 10 is gone, which is the item this batch ran.
`project-audit` reports and does not add queue items, and none of its findings passed the tier test - they were corrections to documents, which are fixed on sight, not queued.

Filed to `docs/MAINTENANCE.md` instead: six shipped comments the code disagrees with, grouped as one job so the next batch to open `js/app.js` or `css/style.css` takes all six in one cache bump rather than the one it is standing next to.
Also filed, deliberately as a SETTLED exception rather than a finding: two files citing an incident count `CLAUDE.md` disowns, which two audits have now re-found and which batch 216 declined for a reason that is still sound.

## New docs/PHONE.md items

**None.** The heading correction is navigation, not a new check.

## Probe

**What the item told me to do that I would have done differently.**
It said "out of scope: fixing what it finds", and I wrote that item myself last batch.
It is right about code and wrong about documents, and I did the documents anyway.
A stale fact in `CLAUDE.md` is read by every batch until someone fixes it, and `CLAUDE.md`'s own standing authority says a documentation edit is mine and must not be parked - the asymmetry it gives is that a wrong edit is caught by the next audit and a parked one is caught by nothing.
Deferring "the three other restore paths is five" to a future batch would have been the parked kind.
**The item should have said "out of scope: fixing code it finds", and the distinction is now in the audit report's disposition table rather than only here.**

**What I did not propose because it was out of scope.**
The audit's G1 records Tier 1 at 56% of a file loaded into every message, with a consolidating-preamble recommendation now outstanding for three audits.
I did not take it: it is a restructure of the file that most constrains every batch, nothing in it is dead (eighth clean dead-trap result), and doing it inside an audit batch would mix the measurement with a large rewrite of the thing measured.

## Surprises

**The displaced-B section holds two different kinds of thing, and the promotion rule only ever applied to one.**
The audit found seven approved-B entries invisible to `/batch` with fourteen free slots and called it a recurrence, which it is.
Reading the seven, **all of them are features that were specced and deliberately declined** - the `behaviour spec, §11.5` entries and the mock rows that did not ship - where batch 225's five promotions were all defects in shipped behaviour.
Bulk-promoting them would have had `/batch` start building a command palette, a CSV exporter, a write queue and invoice photography, **which needs OCR or a vision model and therefore reopens the privacy gate.**
**A free slot is not an approval.** `/batch`'s authority is "Max said yes when he queued it", and he never queued these; a batch classified them while correctly declining to build them.
So the section is split by kind, only defects promote, and the seven features are recorded as needing his priority call.

**And the trigger is now mechanical, which is the half that would otherwise recur a third time.**
225 wrote "check it when the queue shrinks, because nothing else will" and nothing did.
Writing it down again would not have made it a mechanism, so the check moved into `/batch` step 1's sweep, which already walks every item and costs nothing to extend.
