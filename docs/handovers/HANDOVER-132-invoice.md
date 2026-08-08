# HANDOVER - 132 (Q8: Invoice review + the ticks bug)

**Branch:** `feature/q8-invoice-redesign` (PR #96) · **Scope:** queue item Q8 plus the "Invoice ticks are lost on any re-render" item it carried (`Do with: Q8`).

**Ships `ezplate-v127`.**

**Suite at close:** `npm test` **802 green** · **106** Playwright green · smoke clean · `node -c` clean.

## What changed
A tick the user places in the invoice review now survives re-renders caused elsewhere on the sheet - the bug flagged in v50 and v52 and verified three times since.
The rule: a user decision stands until the user edits that row's own basis (match pick, price edit, pack teach, +New open/close), which resets it to the state default; the auto-tick law (only `matched` pre-ticks) is untouched.
The verdict reads as a sentence, the footer counts live ("Confirm N changes"), review rows tint warn instead of red, new rows carry an accent stripe.
Both stale handover-path comments are finally fixed (seven batches after their trigger was met).

## Into CLAUDE.md
Nothing proposed - the tick truth table and the v113-gate coupling are documented at the code they govern.

## New docs/QUEUE.md items
Ticking a never-opened add-new form stores the tick nowhere (v127 review, pre-existing) - in Small.

## New docs/PHONE.md items
None - the invoice modal is already the standing stress case in the v104 block; the new things to feel there are the warn tints and the live count.

## Probe
**What did the item tell you to do that you would have done differently?**
The item was right to force the decide-it-now on the ticks bug, and its scoping note was the batch's most valuable line: the mock draws a five-column row list with no pack-teach control, no candidate chips and no price editing - implementing it literally would have deleted the machinery three real regressions built. The fold rule protected the app from its own design package here.

**What did you not propose because it was out of scope?**
The mock's file strip and "12 of 14 will apply" footer summary - more surface on the most fragile screen for information the verdict and button already carry.
Adding userTick to gemRowLocked - not needed while the v113 gate renders no checkboxes during the referee window; the coupling is now stated at the truth table with a revisit condition.

## Surprises
- **The review found the tint had NEVER derived from invRowState in substance.** The old needs-attention rule outranked the st-* rules on specificity and owned the paint; the v37 invariant held only because both rules declared identical values. My tint change would have shipped painting the wrong colour on exactly the rows it was written for. Two rules painting the same thing are one silent specificity war waiting for the first divergence.
- The first cut of tick persistence made a user tick outrank the row's own state FOREVER - a blanked price kept its tick and applied nothing, silently. The correcting principle was worth the finding: persistence exists only to protect ticks from re-renders caused ELSEWHERE; any self-edit resets.
- This surface's reputation is earned: every one of the three fragile-area invariants came up during the batch, and the pre-push review was the only thing standing between two of them and production. Eighth batch this session; the review has found at least one major in six of them.
