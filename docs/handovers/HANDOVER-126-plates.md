# HANDOVER - 126 (Q4: Plates redesign)

**Branch:** `feature/q4-plates-redesign` (PR #85) · **Scope:** queue item Q4, the Plates screen of the redesign phase.

**Ships `ezplate-v123`.**

**Suite at close:** `npm test` **791 green** · **102** Playwright green · `node -c` clean.

## What changed
The Plates library's card grid became one surface of rows: name · category inline, published-where as plain coloured text on a fixed column, plate cost right in mono.
CSS only, every rule `#plateList`-scoped - the Products tab shares the same `.ing-card` classes and is untouched until Q7.
Zero JS changes; `data-pid`, the `openPlateActions` click and every smoke-pinned string are exactly as before.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
`layout-consistency.spec.js` claims to assert "the shared left edge" but stops at the actions row, so a list-body misalignment ships silently - extend it (in Small).

## New docs/PHONE.md items
None new for this batch, but note the standing v102 Plates block in `docs/PHONE.md` now describes the OLD card grid - the rows changed under it, so judge those entries against the new look.

## Probe
**What did the item tell you to do that you would have done differently?**
Nothing - the item's plan matched both the mock and the code, and the whole thing reduced to scoped CSS because the markup already carried the three column groups.

**What did you not propose because it was out of scope?**
The mock's header sub-line ("Your library · 8 plates, 1 not costed, 1 unpublished") and its column-header row - both are new prose surfaces the app's list pattern doesn't use, and the prose-cull precedent (v100/v115) says they need Max's ask, not my initiative.
The mock's footnote claims clicking a plate opens the builder; the app opens the actions chooser - the mock is wrong about the app and nothing was changed.

## Surprises
- The review reproduced a genuine accessibility defect with screenshots: the row's border box coincided with the surface's padding box, so the +2px focus outline fell entirely into the `overflow:hidden` clip - a keyboard user on a one-result list saw no focus at all. An inset outline fixes it. Worth remembering the shape of it: **a full-bleed row inside a clipped surface silently eats any outward focus ring.** The Menu tab's Q3 rows dodge it only because table rows never got the shared outline rule.
- The review also measured what I asserted: the Products tab byte-identical at nine widths, every specificity claim checked, and the one thing it called wrong (`margin:0` no-op) it proved by grepping for the only two definitions. Second batch running where the blind reviewer's reproduction was the difference between "looks right" and "is right".
