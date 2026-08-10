# HANDOVER - 150 (sync corner)

**Branch:** `v141-sync-pill-corner` · **Scope:** the `docs/QUEUE.md` item "The sync pill covers the right edge of every converted screen's primary button", found by F4.
**Deploy version shipped: `ezplate-v141`.**

## What changed

The sync banner no longer sits on the screen header's action corner at desktop: at 1024 and above it moves to the bottom-left status slot, and the header bar owns that corner at every width.
"Import invoice", "New product", "New ingredient" and "Set up from products" are reachable again while a save is in flight or an error is standing.
The banner also gained `pointer-events:none`, so a status readout with no control in it can no longer take a click from anything it floats over, at any width.
Mobile and tablet are deliberately unchanged and now pinned as unchanged.

## Into CLAUDE.md

One rule PROPOSED, awaiting Max's yes, queued as a blocked item so it is not lost: a viewport-geometry assertion must measure the fixed-position containing block with a `left:0;right:0` probe rather than read `window.innerWidth` or `documentElement.clientWidth`, because on the CI runner all three disagree and only the probe is right.
It cost three CI round-trips here and every remaining F-item writes geometry pins, so it will bite again.

Not proposed, and written in the code instead, because it is about this file rather than about the project: deleting a layout element hands its band to whatever is pinned to the viewport at that offset.
It sits at `css/style.css` on the v132 `header{display:none}` comment, where the next person to delete a layout element will read it.

## New docs/QUEUE.md items

The toast and the install banner overlap each other at desktop, measured at 1024/1280/1440/1920 while checking the new bottom slot was free.
Nothing is blocked (the toast is `pointer-events:none`) but the install banner's Install button and its close ✕ sit under a pill of text, and it is only reachable pre-install, so it is a new café's first ten minutes rather than anything Max sees.

The v3 sync/status treatment, which the package designs twice and no F-item owns.
The mock puts a quiet "Synced 4 min ago" in the §2 header row and specs the error as an in-flow red banner with Retry; the app has one floating pill for all five states.
It falls between the F-items because the package's own build order makes states a shell pass rather than a screen, which is the same gap the More-screen item names.
Sequenced after F6, and it carries the warning that shipping Retry means removing the `pointer-events:none` this batch added.

## New docs/PHONE.md items

None.
The mobile half of this was settled at 380px in a browser, and the change to it is a `pointer-events` line whose effect is measurable rather than perceptual.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Both halves of it.
Its measurement was of the `ok` pill only, 87px wide, and it concluded "not a dead button, a visual collision plus a partly-blocked target".
The banner is sized by its text and the two states that never auto-dismiss are the two widest, so the true worst case at 1024 and 1280 is the error pill covering both header actions outright, centres included: dead controls, for as long as the error stands, on the only route into each flow.
It also did not know the same state takes the click from `#brandHome` on a phone.
Then all three homes it proposed fail on measurement, which is why the fix is none of them.
I rewrote the item's record rather than working around it, per the rule that the code wins.

**What did you not propose because it was out of scope?**
The mock does not float this element at all.
It puts a quiet "Synced 4 min ago" inside the §2 header row, before the actions, and specs the error case as an in-flow red banner with a Retry button.
That is the right answer and it is a states-and-copy change, which the item fenced off, so I did not build it.
It should ride F5 or F6 as an R1, and the `pointer-events:none` comment names the Retry button as the thing that forces a re-measure when it arrives.

## Review

No defects.
One nit, fixed in branch: the spec's chrome selector list carried a `.side` that matches nothing, since the sidebar's controls are `.side-brand` and `.side-theme` and both sit inside `nav.bottomnav`, already covered.
Verified against the markup before removing it, because a dead selector in a coverage list reads as coverage it does not provide.
Worth recording that the reviewer re-derived the "7 of 10 tests fail against the pre-fix CSS" claim by mutating the CSS itself rather than believing the handover.

## The CI lesson, which is the batch's own lesson again

The two mobile assertions passed on macOS and failed on the Linux runner three times running.
Both of my first two fixes were theories about why, written without measuring, and both were wrong.
Instrumenting the assertion to print its own geometry settled it in one run: the fixed-position containing block on that runner is NARROWER than the viewport, 370 inside 380 and 759 inside 768, while `window.innerWidth` and `document.documentElement.clientWidth` agree with each other and are both wrong.
`.bottomnav` at 380 is 370 wide too, which is why "is this a left rail or a bottom bar?" answered by comparing widths applied a 185px offset to the bottom bar.
Both are now measured rather than inferred: a `left:0;right:0` probe for the containing block, and rail orientation (taller than wide) for the offset.

Worth writing down because it is the same mistake as the defect the batch exists to fix, one level up.
The queue item inferred the collision from the one banner state it happened to see; I inferred the CI failure from the one platform I could run.
**A viewport measurement that has not been taken on the platform it is asserted on is a guess.**

## Surprises

The first version of the regression spec asserted the banner overlaps no interactive element anywhere, and failed.
The reason is worth keeping: list rows are `role="button"`, so the content plane of every populated screen is wall-to-wall controls and no fixed overlay can intersect nothing.
There is no empty corner to move this into, only a choice about what it is allowed to cover.
The spec now pins that choice - the banner may float over content, never over chrome - and says why the content half is safe rather than narrowing the assertion until it passed.
