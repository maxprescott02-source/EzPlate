# HANDOVER - 136 (remove the density toggle)

**Branch:** `feature/remove-density-toggle` (PR #104) · **Scope:** the queue item "Remove the density toggle" (Max's second 9 Aug reversal of a Q7/v126 feature). Shipped **`ezplate-v130`**.

## What changed
- The Products Comfortable/Compact toggle is gone: control, `cafeDB_prodDensity` key, in-memory-first plumbing, and every `density-compact`/`.seg-density`/`.segd` CSS rule.
- One row height everywhere, the comfortable default the toggle shipped with.
- A stale `cafeDB_prodDensity` key is actively removed at boot, so a device that had Compact set silently returns to the one height and localStorage holds only live preferences again.
- `q7-products.spec.js` retires the toggle pins on purpose and pins the ABSENCE instead: no control at either width, no class, and a deliberately planted stale key proven removed at boot.
- Design Package §13 already recorded the cut (landed in the 9 Aug handoff update); verified, not edited.
- 805 unit, 111 Playwright, both green.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
None.

## New docs/PHONE.md items
None. The visual result is the default the untouched install already showed, and the key cleanup is asserted in the spec.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?** Nothing. The item's line numbers were accurate, its "Design Package §13 records the cut" turned out to be a fact to verify rather than work to do, and the reversal itself is Max's call.
**What did you not propose because it was out of scope?** Making the boot-time key removal self-expiring. It runs on every load forever; the reviewer called it inert-but-permanent tech debt and I kept it deliberately, because it is one guarded line and it is the mechanism that cleans a device whenever it next visits. If the app ever grows a one-shot migration spot, fold it in there.

## Surprises
- The Opus review agent died mid-run on the Claude session limit (resets 10:10am Brisbane); the review reran on Sonnet and completed. Worth knowing that the mandatory reviewer competes with the same subscription capacity as the batch itself.
- None in the code: the review found no functional defects, and the removal was as clean as the item predicted.
