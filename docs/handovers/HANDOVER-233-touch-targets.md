# HANDOVER - 233 (touch targets: R5+R6, step 4 of Max's Phase 2 plan)

**Branch:** `fix/ui-audit-phase2-touch` · **Scope:** queue item 0, step 4 only (R5+R6).
**Shipped `ezplate-v192`.**

## What changed
One ≤767 CSS block; no resting pixel moved, proven by four-width before/after capture comparison (only anti-aliasing noise plus the Settings version glyph).
The builder remove-× hits at 42.5×44 instead of 15.5×36, with the glyph exactly where it was.
The pack-price chip keeps its 27px look and hits at ~45.7, and the inline price edit still takes caret taps (a :focus-within guard stands the overlay down).
Trend range buttons deepen an extension they already had; the text ANCHORS (tel link, privacy links, sign-in/sign-up swaps) get padded hit boxes.
Two audit readings were corrected by the code: the range buttons were already ~43 effective (boundingBox cannot see an ::after) and wizard Skip was already 44 (the base button floor) - the sub-44 links were the anchors only.
Three shortfalls are geometry-bound and recorded at the site: the gate's last line and the sign-up in-label link get 29px each; a first-cut cap on the gate swap line survived its own mutation and was deleted, so those get the full 45.
New `tests/visual/v192-touch-targets.spec.js`: real elementFromPoint hit tests, probes sized to carry the 44 claim itself.

## Review
Initial run on Opus, diff only, no brief: 0 critical, 0 major, 6 minor, 1 nit - every one taken.
The load-bearing find: top/bottom on an absolute pseudo resolve against the PADDING box, so an ::after offset on a bordered element buys ~1px/edge less than it says - the chip had shipped at 43.7 believing 45, after the same correction was derived for the range buttons and not carried across.
Also taken: measured figures replacing wrong ones in two comments and the audit row (the wrong MECHANISM had been recorded, which is what let the chip error through), three unpinned gate rules (now a fourth spec test), a missing position:relative, and the zero-pixel claim scoped to the resting state.
Addendum run over the fix range on Sonnet (the Opus attempt died on a spend limit): no critical or major, fixes verified by mutation, two wording items - both taken.
`docs/reviews/REVIEW-233-touch-targets.md` holds both verbatim; `Reviewed-commit: 1853280`, addendum range `1853280..7a1c3fc`.

## Into CLAUDE.md
Nothing.
The border/padding-box lesson is recorded in the CSS block's header comment and the audit row, where the next touch-target batch will actually look; it is one mechanism, not a class.

## New docs/QUEUE.md items
None.
Item 0 updated in place: step 4 marked shipped, next `/batch` takes step 5 (R12, the one approved JS change - show Max the diff).

## New docs/PHONE.md items
One: thumb-test the new hit areas (builder × and chip, caret taps in the chip edit, range buttons, the small links).
Failure looks like still needing aim, a chip tap removing a line, or a caret tap committing the edit.

## Probe
What the item told me to do that I did differently: R6's remedy said `min-height:44px` on `.range-btn` - that is a visual change his own step-4 constraint forbids, and the button was already ~43 effective; it got depth on the existing invisible extension instead.
The audit's "text links ~17px" list also named wizard Skip, which measures 44; the fix narrowed to anchors.
What I did not propose because it was out of scope: the `.use` buttons (36px) and `.del-link` (~37px) are also sub-44 and unnamed by the audit; the search-clear × behaviour entry already in `docs/MAINTENANCE.md`; and growing the gate box to give its last line full 44, which is a visual change and Max's call.

## Surprises
- `git add -A` swept two untracked blind-audit brief files (`BLIND-AUDIT-2026-09-05-brief-*.md`, placed by Max or another session) into a commit and push before they had been read. Read post-hoc: no credentials, same deliberate pattern as the committed 22 Aug briefs. Removed from the branch, left on disk for their owner. The lesson is mine: check `git status` for unexpected untracked files before committing, and stage by name.
- The first full-suite tail was read as "428 passed, 14 skipped" when it was hiding "4 failed" above the fold; only re-running the named specs surfaced it. Read the exit line, not the tail.
- The capture harness's bitwise compare is too strict for "visuals unchanged": whole-page anti-aliasing jitter differs deterministically between trees. A channel-Δ threshold (>40) separates real change from noise cleanly.
- The Opus reviewer hit the monthly spend limit mid-addendum; Sonnet finished it. If Opus 429s again, that is the first knob to check.
