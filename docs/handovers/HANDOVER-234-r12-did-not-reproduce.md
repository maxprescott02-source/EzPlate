# HANDOVER - 234 (R12 did not reproduce; the 5 Sep blind audit lands)

**Branch:** `feature/r12-menu-zero-results-clear` · **Scope:** queue item 0 step 5 (R12), plus committing and routing the 5 Sep blind code audit another session left untracked.
**Shipped no deploy version.** No client asset changed; the six cache spots stay at `ezplate-v192`.

## What changed
Step 5 (R12) is resolved with no code: the "Clear search & filters" link the item told me to ADD has existed on the Menu zero-results state since v58, through the same `emptySearchState` helper Plates uses, so the two screens cannot differ.
Reproduced in a real browser at 1280 and 390, for search, category and chip no-match states; the link clears all three and restores the rows.
What the audit photographed: its zero-results pass ran at 390 only, and the pre-R4 layout pushed the empty state low enough that the button's text line sat behind the install banner; a borderless `linklike` button's exposed top padding reads as blank, so an honest pixel-reader saw no link.
That occlusion is the R13/R19 stacking family Max wontfixed, and the R4/R7 re-track already moved the button clear of the banner.
The audit's Phase 2 progress table and queue item 0 now record all of this; next `/batch` takes step 6 (R17+R18).
`BLIND-AUDIT-2026-09-05-brief-code.md` and `BLIND-AUDIT-2026-09-05-code.md` are committed, on the 22 Aug precedent.
The audit's findings were routed into queue items 12-15 and a new `docs/MAINTENANCE.md` section by the session that ran the audit; this batch verified item 14's SQL claim against the migration, fixed three stale cross-references in the routing (a bare "244" that is a PR number in a file full of batch numbers, and two pointers saying "item 12" that meant the fictional-menu maintenance bullet), and committed it.
The two MARKET files (`BLIND-AUDIT-2026-09-05-market.md` and its brief) are deliberately NOT committed: they hold real business data - the cafe's real food-cost percentage, a candid assessment of the owner, an identifiable prospect, and Max's personal circumstances - exactly the class this public repo has already leaked once.
They are moved to `~/Documents/EzPlate-blind-audit-2026-09-05-market/` so no future `git add -A` can sweep them, which nearly happened to their briefs in batch 233.

## Review
Skipped: the diff is pure prose (docs only, no client asset, no tests, no CI change), which is the one skip `CLAUDE.md` allows.
The reproduction evidence was gathered with a scratch Playwright spec that was deleted before commit; it never entered the diff.

## Into CLAUDE.md
Nothing.
The "audit reading corrected by the code" pattern is already the queue header's rule, and the occlusion mechanism is recorded in the audit file's progress table where the next UI batch will look.

## New docs/QUEUE.md items
Items 12-15 (carton quantity-first mis-parse, unverified; same-session tenant contamination, unverified; wrong-invite claim, CONFIRMED; role fail-open with no rollback, unverified) - written by the audit session, verified in part and committed by this batch.
They sit below item 0, which is Max's own ordered plan with one step left; reorder if the A items should pre-empt it.

## New docs/PHONE.md items
None.

## Probe
What the item told me to do that I did differently: everything - it said to add a link that already exists, and showing Max a diff of it would have been shipping a duplicate control on a false premise.
The grep-the-enumeration rule in the queue header is what caught it before any code was written.
What I did not propose because it was out of scope: making the empty-state link banner-proof (that is R19, wontfixed by Max's own call); taking step 6 in the same batch (his plan says one step per batch, stop and show him).

## Surprises
- The working tree changed mid-batch: another session (the one that ran the blind audit) wrote queue items 12-15 and the MAINTENANCE section at 20:12-20:13, minutes into this batch, then went quiet.
  Its routing was complete and good; this batch absorbed it rather than duplicating it.
  Two sessions in one working tree is worth avoiding - the mtimes were the only tell.
- The audit's R12 row said "all" breakpoints; its own harness (`zerores.js`) captured exactly one width.
  A breadth claim inherited from one capture is the queue header's unmeasured-list rule wearing a screenshot.
