# HANDOVER - 235 (R17+R18, and Phase 2 closes)

**Branch:** `feature/r17-r18-more-header-row-heights` · **Scope:** queue item 0 step 6, the last step of Max's 3 Sep Phase 2 plan.
**Shipped `ezplate-v193`.**

## What changed
R18: `--lrow-min:45px` is the one floor the three sibling tables consume at >=768; every row in Plates, Menu and Products now measures exactly 45 at 1024 and 1440 (before: 40.5 / 43.5-44.5 / 43.5).
45 rather than 44 because a Menu verdict-pill row is 44.5 by content, so a 44 floor leaves the Menu table unequal within itself; `.king-row` is deliberately excluded and the token comment says why.
R17: at <=767 the More title now centres at the same y as every sibling (min-height:44 + flex centring on the h2 itself), and the collapsed "‹" back control hits at ~44px wide via an ::after with zero layout movement.
The audit's R17 reading was corrected in two places by measurement: the offset is <=767 only (768 was already aligned), and Dashboard shares the defect only when fewer than two menus are costed - the real cafe's captures show zero Dashboard pixels moving.
Before/after captures at 390/768/1024/1440 against real data: the only 390 diffs are the More screen (intended) and the Settings version glyph; >=768 the three tables' pages grow by exactly the row-floor delta.
One capture artifact worth knowing: the first before-run photographed the 415-row Products list mid-render (a blank tail), which read as a 308k-pixel diff until a re-run proved it noise.
**Phase 2 as Max ordered it is COMPLETE.** Item 0 is deleted; the audit file's progress table now carries every row's disposition (fixed / deferred / wontfix) and the phase-complete line.

## Review
Opus, diff only, no brief: 1 major, 2 minor, 3 nits - every one taken.
The major: my new title test compared More's title against Settings' title, and the rule moves BOTH, so deleting the centring left it green (roster 205's shape).
Its repro was run before the fix and was green exactly as predicted.
The replacement anchors the title against the back glyph on the same screen - and my first draft of that anchor measured a hidden pane (zero agrees with zero), caught only by re-running the repro against the fixed test.
Also taken: a 0-2-1 selector per the file's own note, three comment corrections, and the R18 toBe kept deliberately with its fixture guarantee written out (weakening to >= was tried and measured to miss the 45→44 token drift).
`docs/reviews/REVIEW-235-r17-r18.md` holds it verbatim; `Reviewed-commit: 5dced44`, fix commit `b68aedb`.
All five hand-run mutations red; full Playwright 439 green twice, before and after the fixes.

## Into CLAUDE.md
Nothing.
The vacuous-anchor lesson (a hidden pane's rects are zero, and zero agrees with zero) is roster entry 205's existing shape; the spec's own comment carries it at the site.

## New docs/QUEUE.md items
None.
Item 0 deleted - finished.
The queue's top is now items 12-15 (the 5 Sep blind audit); item 12 is the next unblocked item.
**R20 (the token fold) is now ready to put to Max** - his own condition "reconsider only after the above ships" is satisfied - but it is his priority call, so it is recorded in the audit file's progress table rather than queued.

## New docs/PHONE.md items
One: thumb-test the widened "‹" back control on the More sub-screens.
Failure looks like still needing to hit the glyph itself.

## Probe
What the item told me to do that I would have done differently: R17 named the More screen and "<=1023"; measurement narrowed it to <=767 and widened it to any buttonless header (Dashboard below two costed menus), so the fix went on the h2 rather than the pane.
R18 named 44-ish heights; the honest floor is 45, for the pill-row reason above.
What I did not propose because it was out of scope: touching `.king-row`'s height (legitimately content-tall), the R20 token fold (his call, now unblocked), and R9 (rides queue item 8's contrast decision - noted in the progress table).

## Surprises
- The review's major finding reproduced exactly as it predicted from reading the box model alone, and my first fix for it failed the same repro for a different reason (hidden-pane zeros).
  Running the finding's repro against the FIX, not just the defect, is what caught it - that ordering is worth keeping.
- The Menu table was unequal WITHIN itself (44 vs 44.5 by row content), which no audit row mentioned; it is what decided the token's value.
