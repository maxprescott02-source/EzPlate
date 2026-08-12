# HANDOVER - 179 (one action in a mobile screen header)

**Branch:** `feature/mobile-header-one-action` (PR #168) · **Scope:** queue item 1, built to the home Max chose on 12 Aug 2026 (`docs/decisions/2026-08-12.md` §1).
**Ships `ezplate-v158`.**

## What changed

Below 768 a screen's second header action moves into the `.plib-controls` row beneath the header, so Ingredients, Products and Menu each show title plus one action on a phone.
The Ingredients header was two rows tall at 380 on Max's phone and is now one; Products was two rows at 360 and is now one.
360 is a supported width from this batch on, pinned in the three specs the item named.
Desktop headers are untouched and still carry both.

## Into CLAUDE.md

**Nothing.** No new durable rule was found; every trap this batch met was already written down, and two of them earned their keep.
The `@media` specificity rule is why the `is-nofilters` selector was counted (0-3-0) instead of trusted, and the "would this test FAIL if I broke the thing it names" rule is why the fix was disabled and watched go red before the batch went on.

## New docs/QUEUE.md items

**None.** Two findings were recorded in `docs/MAINTENANCE.md` instead, both C by the tier test.

- `.btn-noun` still shortens both rehomed secondaries to "Set up" and "Import", a collapse that exists to make the HEADER fit and which now applies to buttons that no longer live there. "Set up" alone does not say what it sets up.
- "Existing plate" is offered at zero menus and would publish a dish against a null `menuId`. Pre-existing: it sat unhidden in `.scr-head` before and this batch moved it without changing when it shows.

## New docs/PHONE.md items

Six, all on the three changed screens, with the failure each would show.
The one that would be quiet if it were wrong: on a brand-new café with products but no ingredients, "Set up" must still be visible under the Ingredients header, because that screen hides its search and filters at zero and the button now lives in that same row.
The others are the three actions still opening in one tap, the button moving live when the phone rotates across 767, and whether the action reads as part of the filters now that it shares their row.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

Nothing about the decision, but the proposal it carried was wrong about the cost and I would have measured before recommending it.
It said Products' control row "absorbs a fourth member without a new structural row" and that the recommendation "often costs none" where the rejected runner-up cost about 44px on every screen.
Measured, the action wraps to its own line on Products and Menu at all three widths, costing 52px there and 44 on Ingredients, which is the runner-up's price.
The decision still stands on its own terms, and the header is what §6 is a rule about, but the margin that made option A the recommendation was not real and the PR says so.

I would also have rehomed only the two screens with a defect and left Menu alone.
Menu does not wrap at any width; the item puts it in for consistency, and the result is 52px of vertical cost on a screen that had nothing wrong with it.
Consistency is a fair reason and it was Max's call, so it was built as decided.

**What did you not propose because it was out of scope?**

The two maintenance findings above are the honest ones.
Beyond them: `renderIngredients`, `renderKitchenPanel` and `renderAnalysis` each hide their control row with a near-identical `showControls` closure written three times, and this batch changed the same line in all three.
A shared helper would have made the `hidden` to `is-nofilters` switch one edit rather than three, and would stop the next person changing two of them.

## Surprises

**The three rows the proposal chose are all hidden at zero, and one of those hides is load-bearing.**
Appending into them as the proposal described deletes the action at the empty state, and on Ingredients that is the setup wizard vanishing on a phone at exactly the moment `renderKitchenPanel`'s own comment calls the moment the wizard matters most.
Leaving it in the header when the row is hidden is not the escape either, because that is the wrapped header this item exists to fix, at first run.
The fix was to change who owns the hide: the row is hidden because the FILTERS are meaningless at zero, which is what its own comments say, so the renderers now set a class and one selector hides every child except the hosted action.
This is the thing the batch came closest to shipping as a silent regression, and it would have looked like nothing at all.

**The suite caught the new code by where it was parked, not by what it did.**
`tests/more-screen.test.js` slices `js/app.js` between `moreIsNav` and `showTab` and asserts nothing in that slice hand-rolls a width comparison.
The new block landed inside that slice with the word `innerWidth` in a prose comment, and went red.
The code moved above `moreIsNav` rather than the comment being reworded, because a slice-based test stops measuring what it names the moment unrelated code sits inside it.

**The fixture has never been able to show this defect, and that is why a green suite missed it for four batches.**
`#kingWizBtn` is conditional on unlinked linkable products and the Playwright fixture produces no ingredients at all, so the button that made the Ingredients header wrap was hidden in every spec that has ever measured that header.
Every new assertion forces it visible.
Disabling the rehome afterwards turns 360 and 380 red and leaves 430 green, which is the measured table exactly.
