# HANDOVER - 138 (Menu verdict cell drops the dollar shortfall)

**Branch:** `fix/verdict-cell-drop-shortfall` (PR #107) · **Scope:** queue item "Menu verdict cell: drop the dollar shortfall" (Max, 9 Aug 2026; v3 spec §8 agrees).
**Deploy version shipped: `ezplate-v131`.**

## What changed
The Menu tab's Food-cost cell no longer prints the price shortfall ("42.2% · +90c" is gone).
It states food-cost % vs target only, and the word after the % now carries the amber/red discrimination that hue alone carried: amber "42.2% · over", red "56.1% · well over".
Green ("27.2% ✓") and the uncosted dash are unchanged.
The aria-label follows the same wording ("food cost 42.2% — over your target").
An nbsp keeps "well over" unwrapped, so narrow cells break at the "·", never mid-phrase.
The builder cost panel deliberately KEEPS its "90c under suggested" guidance (that is where a price gets set; V5's spec keeps it) and its comment no longer claims to mirror the Menu cell.
This satisfies the amber/red hue-only discriminator this item took over from the old Q10.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
- Small list: three vocabularies name the same three lights (preview "Slightly under"/"Underpriced", chips "Watch"/"Rework", cell "over"/"well over") - unify or record deliberate; best decided in V4a/V6. From the pre-push review.

## New docs/PHONE.md items
None.

## Probe
**What did the queue item tell you to do that you would have done differently?**
Nothing - both of its verified-live premises held exactly, and its example copy ("42.2% · over") was used as written.
**What did you not propose because it was out of scope?**
The review's point that mobile's visible text lacks the word "target" (the thead is hidden, so "42.2% · over" could misread as "42.2% over").
Kept Max's own copy; V4a redesigns this screen and is the place to revisit the mobile framing.

## Surprises
The review found the builder panel comment claiming to "mirror the Menu tab's cell" - true when written in v125, false the moment this batch merged.
The rounding-hair case ("30.0% · over" at a 30% target when the true % is 30.01) is accepted and recorded at the test: the word follows analyze()'s unrounded state, because a display-consulting word would be a second light rule.
The review also caught the first cut of the no-dollar-delta sweep test pinning the old FORMAT (+90c shape) rather than the property; it now asserts no "$", no cents figure, no "suggested" in any form.
