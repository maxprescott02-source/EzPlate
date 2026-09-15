# REVIEW - 268, screen subtitles and status copy

Reviewed-commit: a06e71791712ec2fa1fa210b57afa5fc4f52222c

**Agent:** `code-review`, run on **Sonnet**.
The definition pins `opus`; this batch ran on Opus, so the reviewer was overridden to Sonnet for this run per `CLAUDE.md` ("a model reviewing its own work is not a second reader").
It was given the branch diff and **not** the queue item, the premise check, the plan or the flow-tester's report.

Five findings. **All five were real.** All five are fixed in this branch.
Four were comment or dead-code rot; the fifth was a test that measured proximity where it claimed to measure structure, and it is the one worth reading.

---

## The agent's report, verbatim

### What holds up (checked, not just read)

- **`kingHeadSummary`'s lost `if(!n) return ''`** - traced all combinations of (ingredients present/absent) x (unlinked present/absent) x (broken present/absent). All eight combinations produce the correct string, including the two that motivate the change (zero ingredients + many unlinked products; a genuinely empty app). `tests/king-head-sub.test.js` exercises these with a fixture where every count differs (correctly following the 184(b) "fields must differ or the test proves nothing" rule).
- **The two-sink CSS pairing** - `.king-progress.is-on{display:none}` (css/style.css line 4086) is physically inside the same `@media (min-width:768px){...}` block as `.scr-sub{display:block...}` (line 4074), and both `.king-progress.is-on` rules are `(0,2,0)` specificity, so source order correctly decides. I verified this by reading the raw file around both rules, not by trusting the comment.
- **No inline `display`** - `renderKingProgress` (js/app.js:6145) now uses `pr.classList.toggle('is-on', !!clause)` exclusively; grepped and confirmed no `pr.style.display` remains.
- **Sink freshness** - `renderKitchenPanel` (js/app.js:5947) writes `#kingHeadSub` unconditionally before any of its early-return branches, and `renderKingProgress`'s three standalone callers (`renderKingWizard`'s open/close paths) never need to touch `#kingHeadSub` because opening/closing the wizard doesn't change `kingUnlinkedProducts()`. Verified by reading `kingUnlinkedClause`'s only inputs.
- **`APP_VERSION`** - still `'v217'`, unstripped, everywhere except the one new `.replace(/^v/,'')` in `renderSettingsTab`; the backup export (`version:APP_VERSION`) and its wire stamp (`app_version:APP_VERSION`) are untouched. All six cache-version spots verified bumped to v217 (`sw.js` CACHE + 2 ASSETS entries, `index.html` x2, `js/app.js` APP_VERSION).
- **Team badge rename** - grepped all of `.js`/`.css`/`.html`/`tests/` for `team-role`/`team-you`/`team-pend`/`team-tag`: no dangling references to the old classes anywhere.
- **Deleted markup** (Plan card, "Recent imports" `<h3>`) - no ids, handlers, or JS logic (`wireAccount`, etc.) reference the removed elements; `.invz-recent h3` CSS rule was correctly deleted alongside its markup.

### Findings

**1. Minor - false comment in `tests/visual/v158-header-actions.spec.js`.**
The new comment states *"`#kingProgress` is deleted (its count is a clause of the Ingredients header sub now)"*. This is not true: `#kingProgress` still exists in `index.html` (`<div class="king-progress" id="kingProgress"></div>`) and `renderKingProgress` still writes to it - that's the entire two-sink design this batch built, stated repeatedly elsewhere in the same diff ("It is NOT deleted, which was this batch's first attempt"). This spec comment appears to be leftover from the abandoned first attempt and was never updated to match the shipped design. It doesn't break the test (it's a comment, and the rewritten assertion is otherwise sound), but it's exactly the kind of comment this repo's own `app-guards.md` calls out - a statement a future reader (or agent) will trust and act on. Verify: `grep -n 'id="kingProgress"' index.html` still finds the element.

**2. Minor - false comment in `index.html` at the Invoices `.invz-recent` note.**
The comment claims `.invz-recent` "is named by id in the `<=767` page-inset rule." `.invz-recent` is only ever used as a class (no `id="invz-recent"` exists anywhere), and the only rule resembling a page-inset that references it - `#invDropZone,.invz-recent,.stg-cards{margin-left:...}` (css/style.css:4113) - sits inside `@media (min-width:768px)`, not a `<=767` rule. Both halves of the citation are wrong, even though the underlying advice ("don't rename this class for tidiness") is presumably still sound. Verify: `grep -n "invz-recent" css/style.css index.html`.

**3. Minor/nit - test-robustness gap in `tests/king-head-sub.test.js`'s "same block" check.**
The assertion locates the boundary of the `@media (min-width:768px)` block by slicing from `.scr-sub{display:block` to the next literal `@media` token, rather than matching the block's actual closing brace. This happens to be correct today (the next `@media` token is exactly this block's own closing brace), but the check would not catch a future edit that moved `.king-progress.is-on{display:none}` to unguarded top-level CSS, as long as it stayed textually before the next `@media` occurrence in the file - which would silently reintroduce the exact "shows in both places on desktop" bug this test exists to prevent. This is the same class of test the repo already keeps a roster for (a check that measures proximity/ordering rather than the real structural fact).

**4. Nit - dead CSS.** `.stg-soon` (css/style.css:3166) has zero remaining markup consumers after the Plan card's removal (confirmed by grep across `index.html`/`js/app.js`). Harmless but unused.

**5. Nit - stale (unmodified) comment in `tests/more-screen.test.js:167-168`.** It still says the Account more-row "legitimately says 'Profile, team, plan'" and that "#tab-account really does carry a Plan section." This diff changes the row's text to "Profile and team" and deletes the Plan section, so both clauses are now false. It doesn't affect the test's actual assertions (they check for absence of specific words outside `.more-list`, and don't literally match "Profile, team, plan"), so this is pure comment rot in a file the diff didn't touch - worth a cleanup pass but not a functional defect.

### Not found
No wrong guard conditions, no writes that silently fail to land, no sequencing defects, and no vacuous test I could break by hand-tracing a plausible mutation (aside from the one noted in #3). The naming inversion is respected (`#kingHeadSub`/`#kingProgress` both live under `data-tab="pantry"`, labelled "Ingredients"). No duplicate top-level definitions were introduced (`kingUnlinkedClause` is defined exactly once). No `isFinite('')`/falsy-zero/inert-`min`-`max` traps apply - this diff touches no numeric input handling.

---

## Disposal

Every finding's own repro was run before its fix, per `CLAUDE.md`'s rule that a finding carries three separable claims.

**1. FIXED.** Reproduced: `grep -c 'id="kingProgress"' index.html` returns 1. The comment was written during this batch's first attempt - when the element genuinely was deleted - and survived the rework that put it back. **It is the highest-value of the five**, because it is a false statement about the exact design decision the batch exists to record, sitting in a Playwright spec, where the next reader of that spec would conclude the phone has no setup count. Rewritten to say what is actually true: the element exists, and what changed is that its visibility is a breakpoint concern rather than evidence about a button.

**2. FIXED.** Reproduced both halves: there is no `id="invz-recent"` anywhere, and the inset rule is inside the `@media (min-width:768px)` block opening at `css/style.css:4049`, not a `<=767` rule. I wrote both errors. The advice was right and the citation was wrong, which is `app-guards.md`'s "a justification that cites a precedent" in miniature - a reader checking the citation finds nothing and concludes the class is free to rename.

**3. FIXED, and this is the one that mattered.** The finding is exactly right and its stated failure mode was reproduced rather than accepted: moving `.king-progress.is-on{display:none}` out of the media query to top-level CSS, leaving it textually before the next `@media` token, **left the old assertion green** while the hide then applied at every width - which deletes the count on the phone, the precise defect this test was written after. The check now walks braces from the media query's opening `{` to its matching `}` and asserts the hide is inside that span, and additionally asserts the query it found is the 768 one. Proved red against the reviewer's own scenario.
**The general shape is worth recording: a structural claim tested by a proximity heuristic is a test that names one thing and measures another** - the roster's oldest entry, arriving in the test written to police a structural fact.

**4. FIXED by deleting the rule.** Confirmed dead: one `stg-soon` hit remains in `index.html` and it is inside a comment; `js/app.js` has none. `.stg-soon` dressed three cards in turn and each stopped needing it as its capability arrived (Profile 174, Team 192, Plan 268 - the last by removing the card rather than filling it). Deleted with the markup in the same change rather than filed, because the dead-selector class is one `docs/MAINTENANCE.md` keeps re-finding. It does not return with billing: a real Plan card carries controls, not a sentence saying it has none.

**5. FIXED.** Both clauses reproduced as false. The file was not in this diff, which is the argument for fixing it here rather than filing it - the change that falsified it is this one, and a stale comment that outlives the batch that invalidated it is how `docs/MAINTENANCE.md`'s comment-rot section fills up. The test's SCOPING is unaffected and was left alone; only the example was corrected, and the correction says what falsified it.

**Nothing was dismissed.** No finding was declined, deferred or routed onward.
