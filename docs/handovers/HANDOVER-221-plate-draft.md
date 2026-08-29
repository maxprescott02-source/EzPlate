# HANDOVER - 221 (the recovery draft survives a rejected save)

**Branch:** `fix/plate-draft-survives-failed-save` · **Scope:** `docs/QUEUE.md` item 8, "A plate save clears the recovery draft before the server answers". **Shipped `ezplate-v181`.**

## What changed

A plate save that the server rejects no longer destroys the recovery draft.
`saveCurrentPlate` deleted it on the dispatch line, so offline the app correctly said "it has NOT been saved" while having already thrown away the only copy of the work.
The draft now goes when the write is answered and the builder still matches what was sent, and it survives navigating away while that answer is outstanding.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, **two passes**, because the first pass's fixes introduced a new counter and a new term in a guard and 215's precedent is that a reworked mechanism deserves a second look.
**Four defects, on a one-line item, three of them in the fix rather than in the app.**

1. **MAJOR, pass one.** The fix gated the draft on `_builderEdits`, reusing the badge's guard. `renderPlate()` calls `scheduleDraftSave()` on its first line and bumps that counter, and `renderPlate` is called by a product re-price, an applied invoice, and `bootstrapSync`'s own repaint - which needs no user action. Any of those inside the write's round trip stranded the draft for a plate that saved perfectly. Fixed by asking `isBuilderDirty()`, which is the same call `savePlateDraft` already makes, so the writer and the clearer cannot disagree.
2. **MAJOR, pass one.** Keeping the draft alive lets "Unfinished plate - resume or discard?" fire about the plate being saved, and Discard deletes the only copy. Fixed with `_platePushPending`. ⚠️ **This had been reported to Max as an accepted trade before the review.** The spurious prompt was known; the judgement was wrong because it had not traced what Discard does.
3. **Between passes, not from the agent.** Applying pass one's lesson to the batch's own fix: `isBuilderDirty()` compared the category RAW while the save stores it TRIMMED, so a trailing space left the builder permanently dirty. Latent before this batch; this batch would have escalated it into a permanent nag.
4. **CRITICAL, pass two, reproduced by execution.** `savePlateDraft` owns ONE shared slot and removed it whenever the current builder was not dirty, without asking whose it was. Save, then tap another plate before the answer: the slot is deleted, the write fails, the edit is gone. This batch's own defect through another door, and **it would have shipped green**.

Full report with both passes verbatim: `docs/reviews/REVIEW-221-plate-draft.md`.

## Into CLAUDE.md

Nothing, and that is a judgement rather than an oversight.
Every defect above is an instance of rules the file already carries - "an exemption is scoped to the CLAIM that justified it" for 1 and 3, and the stub roster for the `builderCategoryValue` stub.
The roster header says explicitly to add a bullet only when the SHAPE is new and to leave the number alone otherwise, and none of these shapes is new.

## New docs/QUEUE.md items

None. Item 8 is deleted.

## New docs/MAINTENANCE.md items

**`saveCurrentPlate` is not a mutation target**, despite being the one place a plate's recipe changes.
Added as a target during this batch, measured, and taken back out: **17 survivors** under two test files, **12** under six.
They are genuine coverage gaps, not equivalent mutants, so the honest close is twelve assertions and that is a batch, not a ride-along on a one-line item.
Filed with both numbers and a warning not to add the target without doing the work, because a target carrying twelve allowances reads as covered.

## New docs/PHONE.md items

**Save a plate with the network off, then background the app and come back.**
Only a device settles it: the failure is iOS discarding the tab, which no harness reproduces.
A failure looks like the plate reverting to its pre-edit state with no "Unfinished plate" offer on the next builder entry.
Worth doing the same with the network ON immediately afterwards, where the correct result is the opposite: no offer, because the plate really did save.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing about its diagnosis - it was accurate, including the mechanism and the consequence, and only its line number had drifted.
Its "Requirements: `clearPlateDraft()` moves into the success arm that already exists for `setBuilderSaved(true)`. One line." is where it was wrong, and not because the line is wrong.
**It names the arm by the thing that already lives there, which is an instruction to inherit that arm's guard**, and that guard was built for a different question. Doing exactly what the item said produces defect 1.
The transferable half: an item that says "put it where X already is" is making a claim about X's condition, not just about a location.

**What did you not propose because it was out of scope?**
A draft LIBRARY keyed by plate id. One slot cannot hold two plates, so navigating away mid-save AND authoring a new plate still writes over the pending copy - stated at the site rather than hidden. It is a feature, not a guard.
Also the twelve mutation assertions above, and `requestLoadPlate` / `requestLoadMenuItem` gating on `isBuilderDirty()` alone rather than `unfinishedPlateWaiting()`, which is a real inconsistency the fix routed around rather than through.

## Surprises

**The suite stayed green when the fix was applied**, which is how the batch learned its own tests were worthless here: the existing draft tests match source text and could not tell the two behaviours apart. Every claim in this batch is now backed by reverting the change and watching a test go red.

**A stub hid a real defect for a whole test run** - `builderCategoryValue` returning `''` meant the category never round-tripped, so the trim mismatch could not appear. In the file written that hour to catch exactly this class, by someone who had just read the roster.

**Two of the four defects were only findable by EXECUTING the code.** Pass two's came from the reviewer driving the real functions; defect 3 came from extracting a function the test had stubbed. Reading found the other two. That is the strongest argument this batch produces for the pre-push agent, and it is the second batch running where the agent found something nothing else could.

**Four other test sandboxes needed the new dependencies**, extracted rather than stubbed. Adding a real dependency to one function ripples into every harness that runs it, which is the cost of sandboxes rather than a fixture - and the right trade, since a stub is what hid defect 3.
