# HANDOVER - 200 (pack unit re-base)

**Branch:** `201-pack-unit-rebase` (misnamed, see Surprises) · **Scope:** `docs/QUEUE.md` item 0b, filed from the blind code audit of 22 Aug 2026. **Shipped `ezplate-v170`.**

## What changed
Teaching an invoice pack in a unit from another category can no longer change what a product is measured in.
`resolveMatchedPrice` exempts a taught pack from its unit guard, which is correct about price, and `applyInvoice` wrote the row's unit into `base_unit` on the same line, so the exemption silently covered the unit too.
The guard could not go where the exemption is, because `resolveMatchedPrice` is inside the protected parser region and on the never-touch list.
It went on the row instead: `invUnitRebase`, read by `invRowState`, the renderer and the write, with the write's own unit decision extracted as `invPriceUnit` and called by both so a guard and the thing it guards cannot drift.
The row is never pre-ticked, the pack-unit select cannot offer another category, `applyInvoice` refuses the row outright and names it, and the derive preview stopped saying "will be" about a write that is now refused.

The prefill was the easier route in and the item did not mention it.
`packCount(raw)?'ea':...` put units in front of every "6 X 2.5KG" line, including on a per-gram product, so the control opened on the wrong category and the tick that looks like agreement re-based the product.

Riding the batch from `docs/MAINTENANCE.md`, all in files this batch already opened.
`var catState` was declared twice at top level; the combobox's is now `catCombo` and `tests/housekeeping.test.js` covers `var`/`let`/`const` as well as `function`, with the new arm exercised against injected source.
Two comments that disagreed with the code, plus a test title that repeated one of them.
`screenshots.spec.js` is `test.skip` with its cause, per the decision 194 recorded, so a full Playwright run says skipped and why instead of thirteen red at the bottom of a green suite.

## Into CLAUDE.md
Two edits, both made under the standing authority.

Corrected the duplicate-definition trap: its prose claimed the guard covered "any top-level NAME" and the test covered `function` only, which was half the class and the half that was live.
Both halves are now true, and the section keeps the mechanism because the `var` form is worse than the `function` form rather than better.

Added a new Tier 1 rule: **an exemption granted for one property applies to every property the same path writes.**
The transferable question is not "is this exemption correct" but "what else does the path it unblocks go on to write".
It carries the corollary about where the fix goes when the exempting function is untouchable: extract the decision the write makes and have the guard call it.

## New docs/QUEUE.md items
None.
Item 0b is deleted.
Corrected item 0c's target count from 49 to 52 and named the three functions this batch added, because its own claim depends on that number meaning something.

## New docs/PHONE.md items
None.
Everything this batch changed is reachable in a headless browser and was driven there at 380px and desktop, both themes.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
The item offered three remedies and I took all three rather than choosing.
Restricting the control makes the mistake unreachable, the row guard covers pack data that arrives from supplier memory or from an earlier import, and the write refusal is the only one that is actually a gate, because `userTick` is honoured over the row state so a user can tick a flagged row by hand.
Taking one would have left the other two paths open.

Its stated line numbers were stale and its framing was slightly narrower than the defect: it described the pack-teach control, and the prefill defect sat one expression away and was the likelier way in.

**What did you not propose because it was out of scope?**
The catalogue importer writes `base_unit` from a CSV pack unit on an update and has the same shape of exposure, guarded differently.
`applyInvoice`'s two review-row loops share a fixture and would read better extracted, but that is a refactor and this is an A item.
`.flag-review`'s contrast, filed rather than fixed, because raising a token is an app-wide visual change.

## Surprises
**The batch number.** I named the branch and every comment `201` from the PR number.
Batch 199 shipped v169 and the offset has been thirty for at least three batches, so this is batch 200.
Corrected in a follow-up commit; the branch name is left as it was because it is already in the merge commit.

**The flag precedence was wrong in the first draft and only `tests/smoke.js` caught it.**
A row the AI suspects is matched to the wrong product also trips the unit guard, and badging it "unit mismatch" sends the user to the Products screen to change a product that is stored perfectly well.
The wrong match is the cause and the unit conflict is its symptom.
Both directions are pinned now, but nothing in the unit suite or the mutation gate could see it, because it is a question about which of two true things to say.

**`.flag-review` measures below the AA body-text floor in both themes**, 4.17 light and 4.32 dark, and dark misses by less, which is the opposite of the usual guess.
Found only because the new explanation is a message the user has to read, so the spec measured it.
Filed in `docs/MAINTENANCE.md`; the spec asserts an honest 3.0 floor with the shortfall written at the assertion, because asserting 4.5 leaves a permanently red test and asserting 4.17 pins the defect as intended.

**One of the three fixes `docs/MAINTENANCE.md` offered for `syncMemoryToProduct` is unsafe.**
Matching on the normalised phrase instead of the dead `pid` would make the guard fire on every supplier's entry for that phrase, and two suppliers can genuinely sell different pack sizes under line text that normalises the same way.
That turns a dead guard into a wrong-data path.
Recorded in the item; two fixes remain and both are larger than a ride-along.

**The pre-push review found one thing and it was the right one.**
The last test in `inv-unit-rebase-apply.test.js` was an order-only substring assertion, which is roster entry 167(a)/(b) written fresh, in the batch's own new test file, by someone who had read that roster the same hour.
It now runs the loop with the box unticked, and hoisting the guard above the tick check turns it red.
No new roster bullet: the shape is not new, and the header's rule is to add a bullet for a new shape and leave the number alone otherwise.

**A hand-run mutation reported BROKEN rather than a result**, which is the `diff -q` check in `CLAUDE.md` doing its job.
Fourteen mutations were run in total, all of them against a copy backup, and every one that landed turned the intended test red.
