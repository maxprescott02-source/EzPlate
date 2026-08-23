# HANDOVER - 199 (importer GST)

**Branch:** `feature/importer-gst` · **Scope:** `docs/QUEUE.md` item 0e, split out of item 0 when 197 shipped. **Shipped `ezplate-v169`.**

## What changed
The catalogue CSV importer asks which tax basis its price column is on, and stores ex-GST either way.
It took the mapped price at face value before, so a GST-inclusive price list stored every cost 10% high on the onboarding path, previewing entirely plausible per-kg figures with nothing on any later screen revisiting it.
`invGstAdjust` gained an OPTIONAL mode, so the app's one divisor now serves the importer too rather than a second `/1.1` being written.
Omitted, it reads the `invGst` global exactly as before, which is what leaves every invoice call site byte-identical, including the one inside the protected parser region.
The conversion happens once, immediately after the price is validated, so the pack maths, the stored column and the previewed figure all read one number: previewed is stored by construction rather than by call sites agreeing.

Riding the batch from `docs/MAINTENANCE.md`, all comment-only, taken because that item names its own trigger as the next batch that already bumps the cache.
The `setProduct`/`setProducts` sole-writer claim, `buildBackup`'s citation of a precedent that lives in another function, 193's missing non-bump note, the two `:not([hidden])` comments that stated the override mechanism backwards, and the two stale "twelve" counts.

## Into CLAUDE.md
**One correction, made under the 13 Aug standing authority.**
The Tier 1 duplicate-definition trap claimed `tests/housekeeping.test.js` fails "if any top-level NAME is defined twice".
The regex is `^function`, the test's own title says function, and only the prose overclaimed.
That matters because `var catState` is declared twice in `js/app.js` right now, and the `var` form is worse than the function form rather than better: both declarations hoist, then both ASSIGNMENTS run in source order, so the last wins at boot and the first object is discarded before any handler fires.
The transferable line is written there as being about the guard rather than the collision: a test that pins a rule for one declaration keyword has pinned it for one declaration keyword.

## New docs/QUEUE.md items
**None.** Item 0e is deleted; git and this file are the record.

## New docs/MAINTENANCE.md items
One. `var catState` is declared twice, and the housekeeping guard cannot see it.
Filed C rather than fixed on sight because neither direction currently loses data: `openCatImport` reassigns wholesale so the importer self-heals, and the combobox read falls through to a visible re-prompt that returns without writing.
Requirements are written as ONE job in a stated order, because widening the regex before renaming one `catState` goes red immediately.
Three maintenance entries were closed by this batch and deleted.

## New docs/PHONE.md items
One, filed as costs-money-if-wrong.
At the mapping step, switch the GST radio and watch every unit cost move about 9% and the note change with it.
A failure looks like the numbers not moving, or the note disagreeing with the figures.
A wrong ANSWER looks like nothing at all, which is why the check compares against a price the reader already knows rather than asking whether it looks right.

## Probe
**What did the queue item tell you to do that you would have done differently?**
Nothing material, and this is the first item in a while whose facts held: `js/app.js:2255` and the `priceCovers` reasoning at `:2069-2072` were both where it said.
The one thing it could not have known is that "reuse `invGstAdjust`" is not free, because that function reads a module global belonging to the invoice flow.
Reusing it literally would have meant setting `invGst` from the importer, which is a state leak between two flows that share nothing; the optional-mode parameter is what makes the reuse honest, and it exists so the importer can never read that global at all.
The test harness pins that: it extracts `invGstAdjust` with no `invGst` in scope, so a future change that reaches for the global goes red with a ReferenceError instead of quietly taking a catalogue's tax basis from whichever invoice was last opened.

**What did you not propose because it was out of scope?**
The importer asks two questions about one column now, and a third is already implied by the same reasoning: what the price column is the price of in TIME.
A "last price paid" export is historical, and the code stores it as current.
Also not proposed: `catImportPlan` is 120 lines and the row loop now carries five refusal branches and two price questions; it is the obvious extract, and it is not this batch's job.

## Surprises
**The suite went red for a reason that was not mine, and was right to.**
`tests/ci-workflow.test.js` asserts that a comment in `test.yml` naming the spec count matches the real directory.
Adding one Playwright spec made 39 against a claimed 38.
That is a guard written after the same comment was found stale by three consecutive audits, and it is the first time in this repo's handovers that it has actually caught someone.

**The review found nothing in the diff and something beside it.**
Asked to look for state leaking between two unrelated flows, it found two variables that are literally the same variable.
Worth recording that the finding it returned was adjacent to the diff rather than in it, and that the durable half was not the collision but the guard that was documented as covering it and never did.
