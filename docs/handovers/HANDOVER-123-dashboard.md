# HANDOVER - 123 (Q2: the dashboard redesign)

**Branch:** `feature/q2-dashboard-redesign` (PR #79) · **Scope:** Q2 of Max's redesign brief, plus the handover-naming fix he approved.

**Ships `ezplate-v120`.** A client asset changed, so the six spots were bumped.

**First handover under the new name.** `HANDOVER-<batch>-<name>.md`, no `v` - see below.

**Suite at close:** `npm test` **782 green** · **102** Playwright green · `node -c` clean · `tests/smoke.js` clean.

## What changed

The Dashboard is the design's: small-caps eyebrow, a 40px phone / 44px desktop mono figure in its semantic colour, scope chips beside it, the trend as its own card, then What moved and Dig in as a two-column row.

**The scope chips are the By-menu card, not a second control.** Same `.mcmp-row` class, same `data-scope`, same delegate. Five or fewer costed menus enumerate; six or more collapse to All plus two, with the full ranked list behind a disclosure that keeps the shipped row markup, so sparklines survive.

**What moved is not new maths.** It is the existing `movers` computation promoted from a Dig-in tile to a panel; `digData` only gained a per-row sub-line.

**The v98 desktop grid was rewritten in place**, per its own comment that a second stacked layer is what bred repeat breakages here. That comment was right: the first cut of this batch put two cards in one grid cell and the verdict rendered invisibly under the chart.

**Two deliberate deviations from the mock**, both recorded at the code:
the promoted chips are the two WORST menus rather than the design's "two most-used", because EzPlate has no sales volume and a usage proxy would imply the profit impact Rule C forbids;
and What moved says "this month", never the design's "last invoice", because `setProduct` is the one writer of that log and a hand edit uses it too.

## Into CLAUDE.md

**Handover naming, and Max said yes.** New files are `HANDOVER-<batch>-<name>.md`. The `v` implied the number was the app version; it is not. The batch counter moves every batch, the deploy version only when a client asset ships, and four docs-only batches in a row had left them three apart - `HANDOVER-v122` shipped `ezplate-v119`.
**`AUDIT-vNN.md` keeps its `v` and that is correct**, because an audit really is keyed to the deploy version; a line says so, so nobody makes it consistent the wrong way.
Existing handovers keep their names. They are write-once, and renaming them to fix a label would be rewriting the record.

## New docs/QUEUE.md items

None. Q2 is marked done; Q6 was unblocked by Max's "keep the modal".

## New docs/PHONE.md items

None. The screen was driven at 380px in both themes and the 44px floor is pinned by a spec rather than left to a device check.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Two things, both already flagged in the Q1 plan and both confirmed while building.
The item said to diff against `Current - Dashboard.dc.html`; that file does not exist, so the shipped app was the reference - which is the better one anyway.
And the design's chip padding is below this app's touch floor. I followed the app, not the mock, and the design contradicts itself there: its own section 15 asks for 52px mobile targets while section 6 draws a 37.5px chip.

**What did you not propose because it was out of scope?**
The trend chart's own restyle. The design gives it an over-target wash, a dashed target line and accent markers; the shipped chart already has all three, so nothing was needed - but I did not verify them against the mock pixel by pixel, and if they differ it belongs in Q10's sweep rather than here.
Also left alone: the desktop shell. The sidebar the mocks show already exists at 1024px, so the redesign needed nothing from it.

## Surprises

- **The pre-push review found dead code that was carrying live test coverage.** `menuCompareHtml`'s standalone branch could not run, and two test files asserted the honesty note, the All-menus row and the ranking THROUGH it. Either could have been deleted from the live chips with 782 tests still green. That is the "a test that passes against broken code is worse than no test" case, arrived at from the opposite direction: the test was fine, the path under it had gone.
  It also caught a measured density regression at 640-899px that no spec covered, an unreachable CSS rule, and two rules setting one value that happened to agree.
- **An existing spec caught a real accessibility regression before the review did.** `v96-menu-select.spec.js:245` failed on the 44px touch floor the moment the chips landed. Two fixes failed before the right one: an `::after` hit area looks fixed but leaves `boundingBox` measuring 37.5, and a `pointer:fine` query relaxes the floor in exactly the case it must hold, because the desktop Chromium the specs run in reports a fine pointer at 380px too.
- **The redesign package is unusually accurate about this repo** - all 11 render functions and all 7 ids it names exist, and its "no new tokens" claim held. After three stale queue items in three batches, that was not the expected result.
- **A background agent committed to this branch mid-flight** (`e96d510`, the `Do after:` / `Do with:` queue convention) and swept up some of my uncommitted spec edits into its commit, so that message understates what it contains. Nothing was lost and everything is green, but the convention landed without my review and is flagged in the PR rather than presented as mine.
