# HANDOVER - 146 (F2: Plates rebuilt from the v3 mock)

**Branch:** `feature/f2-plates` · **Scope:** queue item F2, the first SCREEN of the v3 fold-in.
**Shipped `ezplate-v138`.**

## What changed

The Plates library is rebuilt rather than skinned, which is the difference the fold-in protocol exists to enforce.
It no longer borrows the Products `.ing-card` system with twenty `#plateList` overrides stacked on top; it owns its markup and its `.plib-*` classes, so F4 can convert Products without unpicking anything.
Every id, handler and data path is unchanged.

Desktop is the mock's screen: a header bar carrying the title, a computed subtitle ("6 plates, 1 not costed, 2 unpublished") and one primary action, then search plus category select, then a bordered table with a column band.
Mobile is two-line rows, the meta line reading "category, on Winter Menu" under the name, money right, 56px minimum, hairlines and no container.
One breakpoint, 768.

`.scr-head` is the mock's §2 header bar ported as a system class; F3 to F10 reuse it as-is.
The outer `.panel` card is suppressed for this screen because the mock does not draw one, and left in place it renders a border around a border.

Conflict rulings are recorded at the code, not just in the PR: R1 for "not costed" and the 640 to 768 move, R2 for the row still opening the action chooser (F7 flips it), R2 for the 44px touch floor beating the mock's 31/36px except under `(pointer:fine)`, R2 for the loading state being the app-wide boot gate, R3 for Clear filters and the search cross surviving, R4 for the absent permission-denied state.

## Into CLAUDE.md

Nothing proposed.

## New docs/QUEUE.md items

- **The Dashboard panel sits 4px high at every width where `--sp-5` is 20px.** Pre-existing: `#dashBody` opens the tab with `padding-top:16px` while every other tab's panel uses `.panel{margin-top:var(--sp-5)}`. The two coincide only at 560 and below, which is why the spec's existing 380 and 1280 sizes never saw it. `Do with: F6`.
- **The search cross shows on an empty field, on all six search bars.** App-wide `.ms-clear` behaviour, noticed on the converted screen because the mock draws no clear control. Wants deciding once for all six, not per screen.
- **The v3 header bar is not full-bleed.** The mock's hairline spans the whole main area; ours stops at the 960 content width because `.scr-head` lives inside `.wrap`. Breaking out is shell work, so it waits until two or three screens carry `.scr-head`.

Also re-pointed, because it named this batch and was wrong: the opaque-semantic-tint hover item said F2 was "the first F-screen to consume them".
It is not, and shipped without touching them, because the Plates screen has no semantically tinted rows.
It now points at F5, whose verdict cell is the app's original tinted row.

## New docs/PHONE.md items

Five, under a `v138` heading.
The meta line on real plate names in both themes (failure: names wrapping to three lines, or the menu name truncating so you cannot tell which menu a plate is on).
"not costed" at 15px mono (failure: reads as an error rather than information; this supersedes the older "reads as clutter?" question about the previous rendering).
The rebuilt clear cross with a thumb (failure: having to aim, or hitting the field and popping the keyboard).
The CSS-lowercased meta line on iOS Safari, the one engine it was not driven in (failure: "Mains, On Winter Menu", wrong-looking and harmless).
The header row staying one line (failure: the button wrapping, which it did before it was caught).

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

Nothing it said was wrong, and its R2 note about the row click was exactly right.
What it did not say is that the screen is more than the list.
The item describes the rows and the columns, so a batch could read it, rebuild the table, and leave the search row and the header wearing v3 tokens over old markup, which is the hybrid §2 forbids and would have passed every criterion the item names.
The controls row and the header were the larger half of this batch by CSS.
The F3 to F9 items are written the same way, so the same gap is in each of them.

**What did you not propose because it was out of scope?**

The mobile sticky, blurred per-screen header the mock draws.
The app's global brand `<header>` owns the top of the phone viewport, and replacing it changes every screen at once, which §5 forbids inside a screen item.
Also left alone: unifying the six search bars, and the `.panel` base rule, which now has its first exception and will accumulate one per F-item until the last screen converts and it can be deleted.

## Surprises

**Four defects came from measuring, and none from reasoning.**
The one worth remembering: adding a 700px width to `layout-consistency.spec.js` was meant to prove a gutter fix, and it immediately failed on a pre-existing Dashboard defect instead.
The app's gutter steps at 560 and the v3 layout steps at 768, so the band between them belongs to neither, and nothing had ever measured it.

`.plib-note{display:block}` silently outranked the UA's `[hidden]{display:none}`, so the renderer's own hide was ignored and the footnote sat under both empty states.
A class beats an attribute selector on an element the UA styles by type, which is obvious once stated and was not.
`:not([hidden])` is now load-bearing on two rules, and both say so.

A trailing space inside CSS `content` collapses, so the phone read "Breakfast,on Winter Menu".
The test that catches it cannot be a string comparison: `getComputedStyle` reports the SPECIFIED content, so `", "` reads back with its space while rendering without one.
It measures the rendered width against a probe instead.

**Twelve planted defects, and two of them were not confirmations.**
Following v137's lesson, every new assertion was verified failing against a deliberate break.
Two plants passed when they should have failed, and both times the test was right and the CODE was wrong: the 561 to 767 gutter, and the `[hidden]` override.
That is the second batch running where planting defects found real bugs rather than merely validating tests.

The pre-push review found no defects and one fragility: `.scr-head > h2` tied `.panel h2` on specificity, so file order alone decided which won.
Fixed as `.panel > .scr-head > h2` and pinned by a test that fails against the tie.
