# HANDOVER - 142 (V4b: the Plates library)

**Branch:** `feature/v3-plates` (PR #117) · **Scope:** queue item V4b - Plates (spec §3.3).
**Deploy version shipped: `ezplate-v135`.**

## What changed
The Plates library gains the v3 column-label band (Plate | Published | Plate cost) at ≥640, emitted only when rows are.
Published-in-accent needed no change - v55 already ships it; §3.3 confirms the colour.
The band-and-row columns now genuinely align: both grids use fixed tracks, which also fixed a pre-existing Q4 defect where rows drifted up to 27px from each other behind a comment claiming "one left edge".
The queue's "row click opens the builder" bullet is DEFERRED to V5 - flipping it now would orphan Publish/Print/Delete, which live in the row's action chooser until the builder page owns publishing. Pinned in `v135-plates.spec.js` and recorded on V5's queue item.

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
None new; V5's item now carries the inherited row-click flip.

## New docs/PHONE.md items
None - the phone screen did not change. (PHONE.md's v102 Plates entries still describe the pre-v123 card grid; already flagged in HANDOVER-126.)

## Probe
**What did the queue item tell you to do that you would have done differently?**
Its "row click opens the builder" bullet, which fails §11.6 until V5 - deferred with a pin rather than shipped broken or silently dropped.
**What did you not propose because it was out of scope?**
The mock's header sub-line ("8 plates, 1 not costed…") - Q4 skipped it as new prose needing Max's ask, and that reasoning still holds.

## Surprises
The review MEASURED the band failing at its one job: `max-content` grid tracks resolve per-container, so the "Published" header sat 22px off an uncosted row's value - and the same mechanism had rows disagreeing with each other by 27px since Q4, hidden behind a false comment. Fixed tracks everywhere; the spec now asserts alignment against an uncosted row on purpose.
Also caught: my accent rule was a no-op (v55 already painted pub-on accent) wearing a wrong scoping justification, and my hairline assertion passed under both the regression and the fix. The review-of-the-reviewer pattern keeps earning its cost.
