# HANDOVER - 212 (floating layers and mobile dropdowns)

**Branch:** `fix/floating-layers` (PR #224, merged) · **Scope:** `docs/QUEUE.md` item 6.
**Shipped `ezplate-v173`.**

## What changed

The app has one placement engine instead of one engine and four things that never asked it.

`anchorDrop` is now containing-block aware and takes its anchor explicitly, so a layer that is not a combobox can use it.
The eleven `.cat-drop` call sites are unchanged.
`#drop`, `#plateSuggest` and `.dash-menus-pop` adopt it.
`.tp-tip` stays separate with the reason written at its site: it anchors to a data point in the chart's coordinate space rather than to a control, so folding it in means a second engine wearing the first one's name.

The plate-name suggestion list no longer shoves the page.
It declared no `position` at all, so it was `static`, and opening it pushed the ingredient search bar 389px down the page.
That is the item's "dropdowns cover the search bar", and it is displacement rather than overlap, which is why looking for an overlapping rect found nothing.

The ingredient dropdown no longer runs off a short screen.
At 380x420 it spilled 35px below the viewport, because `max-height:min(330px,45vh)` measures the layout viewport.
It now flips above the field with 211px of clearance and still scrolls.

The `translateY` bounce is deleted from `@keyframes dropIn`; the fade stays.

## Review

`code-review` on Sonnet against work on Opus 5, on the branch diff, without a brief.
Report: `docs/reviews/REVIEW-212-floating-layers.md`.
**Two findings. One fixed, one real but pre-existing and queued.**

The minor one was mine: a comment I wrote in this diff claimed `.suggest-drop` degrades like `.drop` does when the engine is absent.
It does not, because `.drop` carries `position:absolute` in its base rule and this layer has no `position` at all.
The comment told the next reader the fallback was safe. Rewritten to say what it is actually worth.

The major one is stacking-context confinement, and it is worth reading the artifact for.
The mechanism the agent described is exactly right: `position:fixed` escapes clipping but not stacking confinement, so a layer trapped in an ancestor's context loses to a lower `z-index` outside it.
Its named element was wrong and so was its stated direction.
Measured with an `elementFromPoint` scan at 380x640, the coverer is `.bld-bar` (fixed, `z-index:25`, band 426-526), not `.bottomnav`, which neither layer reaches.
It pre-exists on main and this batch improves it: `#drop` went from 9 covered points to 8, `#plateSuggest` from 8 to 4.
Queued rather than fixed, because the right fix is `dropBox` subtracting fixed furniture and that is a visible design change deserving its own review.

## Into CLAUDE.md

Two new Tier 1 traps, both written and both new rather than roster entries.

**`position:fixed` is not viewport-relative**, and the app's standard escape hatch assumes it is.
`.bld-docket` carries `filter:drop-shadow`, so a `fixed;left:0;top:0` probe inside the builder's search wrap lands at (12, 198).
The transferable half is not about CSS: a batch added a property for its own correct reason and silently changed the coordinate space a mechanism in another file depends on.
`anchorDrop`'s comment justified viewport coordinates with a claim about modals, and that claim quietly became a claim about everything it places.

**Offsets on a `position:static` box are inert**, and the costume around them still reads as deliberate.
`position:relative` on a parent and `left/right/top` on a child are evidence of intent, never evidence of effect.
When a layer misbehaves, read its computed `position` before its offsets, its `z-index` or its specificity.

## New docs/QUEUE.md items

**One, as item 6.** A dropdown's middle band is unclickable behind the builder's summary bar.
Carries the measured table, the `elementFromPoint` scan as its reproduction, the note that the fix belongs in `dropBox` rather than in a `z-index`, and the cost to weigh first: subtracting `.bld-bar` removes about 160px of below-room at 380x640, so the list will flip above the field in the common phone case.

## New docs/PHONE.md items

**One.** Does the ingredient dropdown clear the on-screen keyboard.
The engine reads `window.innerHeight`, which does not shrink under an iOS keyboard, so the clamp is a strict improvement and may still draw a list that runs under it.
A failure looks like the last row or two sitting behind the keyboard with no way to scroll to them, because the list scrolls internally and the surplus never comes into view.
Not fixed blind: `visualViewport` also reports pinch-zoom, and guessing which a phone is doing is how this gets worse.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It told me the fix might point in the opposite direction from the other two complaints, and to reproduce before choosing.
Reproducing showed the opposite: the mechanism was a layer that never floated, not the engine's flip preference, so `dropPlace` was left untouched and all three complaints were solved the same way.
The item also listed `.tipbox` as one of five live layers and it is dead CSS, and missed `#plateSuggest`, which is the one that actually produced the complaint.
Five layers, one engine was the framing; five live layers, one dead stylesheet block, one engine is the fact.

**What did you not propose because it was out of scope?**
Deleting the dead `.tipbox` and `.tip` rules, their wired handler and the document-wide click listener that runs on every click in the app for a class no element carries.
It is recorded in `docs/MAINTENANCE.md` to ride whichever batch next opens that section.
Also the `visualViewport` change, which needs a device before it is worth writing.

## Surprises

**The check that found nothing had only proved something about one pixel row.**
My first probe of the review's finding sampled a single point, `rect.bottom - 6`, which on main landed below `.bld-bar`'s band and came back clean.
On that I concluded for a while that I had introduced the whole defect.
Scanning every 12px down the layer showed it pre-exists and that this batch reduces it.
The rule this is an instance of is already in `CLAUDE.md`, which is why it is here rather than there, but it is the second time in two batches that a one-sample measurement read as a general result.

**The repo already knew about the containing block and had filed it under the wrong consequence.**
`tests/visual/v150-builder-order.spec.js` says the docket's filter "creates a containing block but does NOT clip".
That is correct, and it was written by someone thinking about clipping, so a note about containing blocks read as reassurance.
The fact was recorded two batches before it mattered and nothing connected it to the arithmetic it would break.
