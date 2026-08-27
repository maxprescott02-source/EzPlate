# HANDOVER - 213 (letting the builder's dropdowns out of their stacking contexts)

**Branch:** `fix/layer-stacking` (PR #227, merged) · **Scope:** `docs/QUEUE.md` item 6, written by batch 212.
**Shipped `ezplate-v174`.**

## What changed

The builder's two dropdowns are no longer painted over by the summary bar.

`.bld-bar` is `position:fixed` at `z-index:25` and holds Save plate.
It owned 8 of 25 sampled points of the ingredient list and 4 of 25 of the plate-name suggestions, which looked like rows and did not answer a tap.
`position:fixed` escapes clipping but not stacking confinement, so both layers were pinned at their ancestor's level and lost to a lower z-index than their own: `#drop` inside `.bld-docket`, a context via `filter:drop-shadow`, and `#plateSuggest` inside `.bld-head{z-index:2}`.

On open each layer is now reparented to `<body>` and placed at `z-index:79`, above `.bld-bar` (25), `.bottomnav` (75) and `#installBanner` (78), below `.modal-overlay` (80).
On close it goes back exactly where it came from.
Zero covered points at 380x640, 380x420 and 380x780, each below its own field and inside the viewport.

`.suggest-drop`'s `margin-top` is deleted.
It was left over from that layer's in-flow life and offset the rendered box 8px past where 212's engine placed it, so a list computed to end on the viewport floor painted 4px below it.

## Review

`code-review` on Sonnet against work on Opus 5, on the branch diff, without a brief.
Report: `docs/reviews/REVIEW-213-layer-stacking.md`.
**Two findings, both real, both fixed, and the major one was a regression this batch introduced.**

`showTab` leaves the builder with `#builderPage.hidden=true`, which hides everything INSIDE the page.
A portaled layer is a sibling, so `hidden` stops reaching it, and `#plateSuggest`'s only close trigger is a 150ms `setTimeout` on blur.
Tapping a nav tab with suggestions open left a 300px list painted over the Dashboard, owning its own pixels, until the timer fired.
Reproduced before fixing; both layers are now closed at `showTab`, and `closeBuilder` closes both explicitly rather than relying on the document click listener to catch one of them.

**The diagnosis worth keeping is the reviewer's: the blur timer was never a close.**
It was a delay that an ancestor's `hidden` had been making invisible for as long as the layer sat in the flow.
This batch did not break the timer, it removed the thing covering for it.

## Into CLAUDE.md

**Nothing, and that is deliberate.**
212 already added the trap this batch is the second half of, and the stacking half is one paragraph of the same mechanism rather than a new rule.
The one genuinely new sentence, that a layer leaving its parent stops inheriting every guarantee that parent was quietly providing, is written at the `showTab` site where someone changing that line will read it, not in a file they might not open.
If it recurs somewhere other than these two layers it earns a Tier 1 line.

## New docs/QUEUE.md items

**None.** Item 6 is deleted, and nothing found here would stop, embarrass or hurt a paying customer.

## New docs/PHONE.md items

**None.** 212's `visualViewport` entry still stands and is unaffected by this change.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It prescribed the fix, and the fix was wrong.
Subtracting the fixed furniture from `dropBox`'s soft bound makes 380x640 worse, because the list flips up to clear `.bld-bar` and lands under `.bld-head` instead, 12 of 20 points covered, and at 380x420 `dropPlace`'s documented fallback to the hard bound puts it straight back under everything, 20 of 25.
I built it, measured it and reverted it, and the reasoning is at the site so nobody retries it.
**I wrote that item myself one batch earlier, which is the part worth noticing:** it was wrong in exactly the way this file warns briefs are wrong, and being its author bought it no accuracy at all.

**What did you not propose because it was out of scope?**
`.dash-menus-pop` is confined the same way and is deliberately not portaled.
It was never measured as covered, it opens downward from the top of the dashboard, and it is rebuilt by every `renderDashboard`, so a portaled copy of an element its own renderer does not own would be orphaned on `<body>` at the next render.
That reasoning is written at the engine rather than queued, because there is no defect to fix.

## Surprises

**The mutation gate cannot reach any of this, and saying so is the only honest option.**
`npm run mutate --changed` reports "nothing in scope": `anchorDrop`, `portalDrop` and `unportalDrop` are not targets and cannot easily become ones, because the gate runs `node --test` against the files a target names and everything pinning the portal is a Playwright spec.
**A target whose named file the gate cannot run would report a false green, which is worse than an honest gap**, so the checks were run by hand and recorded: removing the portal reddens 5 of 8 tests, dropping the z-index from 79 to 30 reddens 3, deleting the `showTab` close reddens the regression test.

**Two of my three first test failures were bugs in my tests, and one nearly read as a code failure.**
`.fill('')` on the search box re-OPENS the dropdown through the no-match branch, so clearing after closing left it open and portaled, and the first draft read that as the layer failing to go home.
The spec now says so at the line.
