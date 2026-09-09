# HANDOVER - 244 (a refused food-cost target takes the number back with it)

**Branch:** `244-target-rollback` · **Scope:** `docs/QUEUE.md` item 15, the last of the 5 Sep blind audit's four, with consolidated item 25 riding as its C.
**Deploy version shipped:** `ezplate-v201`.

## What changed

A food-cost target the server REFUSES no longer stays on screen.
`setCogs` moved `cogsPct` - the number every suggested price and every good/bad colour in the app is divided by - and then sent the write unawaited with its promise discarded, so a refusal arrived as a toast over a screen that had already recomputed.
Reproduced before fixing, exactly as item 15 claimed and it was the only one of the four still unmeasured: a $6 dish reading **$20** against a rejected 30% where the server still holds 40% and the honest answer is $15.

The rollback goes to the last value the server CONFIRMED, not to the value before the call, and the two differ.
The persist is now debounced 500ms and the repaint is not, so the figures still follow the field live while only the settled value is written; `change` flushes it, so leaving the field does not wait.

Item 25: the target is ONE DECIMAL in all three places, at both entry points, through `cogsRound`.
Integer was the other candidate and would have had the boot read rewrite a restored 32.5 to 33 on sight.

The comment item 15 named as a finding in its own right is fixed: the role default's "fails honestly, with the server's own words in a toast" is a claim about AUTHORISATION, and three of the four controls it excuses are actions. The fourth sets a number, and the number had already moved.

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item.
**One finding, a major, and it was the fix's own defect rather than the item's.**
Two persisted writes can be in flight together now that there is a debounce and a flush, and `cogsServer = pct` on every success let the LATE answer for the OLDER value win - so the confirmed value regressed to 30 while the screen and the server both held 35, and the next refusal rolled the café back to a number nobody chose.

Reproduced independently before acting on it and re-run after the fix, correct in both directions.
Fixed with a sequence (`_cogsSeq` / `_cogsConfirmed`), which is the same shape as `gemToken` and as `confirmPrices`'s `_priceSeen`, and which the finding itself named.
Three things went in beyond what it asked, each because its mechanism implied them: the refusal path takes the sequence guard alongside the value guard (they answer different questions and only the second catches a re-save of the same number); `resetTenantState` retires every outstanding sequence, or a write sent in café A answers into café B; and the gate's one survivor on the new line is written into `allowedSurvivors` as equivalent rather than killed with an assertion about nothing.
Everything else it checked it found correct, itemised.
Full report verbatim: `docs/reviews/REVIEW-244-target-rollback.md`.

## Into CLAUDE.md

Two edits, both taken under standing authority.

**New Tier 1 section: "The server refuses it anyway" is true of an ACTION and false of a VALUE.**
This is the rule the batch earned and the reason the defect survived under a comment that had been read many times.
A permissive client guess costs nothing when what is guessed at is permission to DO something, because a refusal means nothing happened; setting a NUMBER has already changed what the user reads before the server is asked.
It carries the two halves of the remedy that generalise: roll back to the last CONFIRMED value rather than the previous one, and debounce the persist while leaving the repaint live, or the rollback fights the user.

**244 added as the fifth instance of "a comment can record the defect CORRECTLY and file it under the wrong consequence"**, and the count deleted from that section's header - it said "third" while the list under it had grown to five, which is that file's own most-recorded rot.

`docs/MAINTENANCE.md`'s `setCogs`-vs-the-boot-read bullet is STRUCK, not just done-marked, per the rule AUDIT-v197 added on exactly that.

## New docs/QUEUE.md items

None. Item 15 is deleted from `docs/QUEUE.md` and item 25 is struck in `docs/QUEUE-2026-09-08-CONSOLIDATED.md` with the batch and version.
The queue's blind-audit preamble now records that all four of items 12-15 ran and all four findings were TRUE, against a section whose top-ranked finding was false.

## New docs/PHONE.md items

None. Everything here is measurable and was measured: the rollback is driven in Chromium at 380 and 1280, in both themes, and the debounce flush is asserted by counting writes rather than by waiting.

## Probe

**What did the item tell you to do that you would have done differently?**
Nothing about the fix, and one thing about the frame.
The item scopes the defect to a staff account whose role lookup transiently fails, and the mechanism is wider than that: ANY refused target write does it, and the everyday case is no signal, not a role race.
The fix is the same either way, so the item was not rewritten, but the tests and the comments are written about the refusal rather than about the role - which is what makes them true of the common case as well as the item's.

**What did you not propose because it was out of scope?**
`dbSetSetting`'s toast label is the bare word "setting", so a refused target says "Couldn't save setting: permission denied for table app_settings".
The number going back is what makes that honest, and the wording is a copy question one screen wide that belongs with item 46 (one verb per intent).
Not filed separately, because it is that item's subject.

## Surprises

**The measured enumeration came out at ONE, which is the opposite of this queue's usual finding.**
The header rule says an item that names a behaviour without naming its sites has a list that is already wrong, and seven of eleven recent batches found theirs short.
`dbSetSetting` has seven callers; exactly one is both cost-affecting and refused by a policy, and the other six are preferences, flags and a timestamp.
So the honest answer was "one site", and it is written down because a count that comes back small is worth as much evidence as one that comes back large.

**The review found the fix's own defect, not the item's**, which is the second batch running where that has happened (12 produced 12b the same way).
The pattern is worth noticing: a fix that adds asynchrony to a path that had none adds an ordering question with it, and the ordering question is invisible in the tests written for the original defect.
