# HANDOVER - 229 (the amber verdict says what it is judging)

**Branch:** `fix/verdict-subject` · **Scope:** `docs/QUEUE.md` item 9, plus item 8 put to Max as a rendered decision. **Shipped `ezplate-v188`.**

## What changed

"Slightly under" is now "Slightly underpriced".
Of the nine verdict phrases it was the only one naming no subject, and it renders directly after "… → 30.0% food cost", so the nearest figure the reader has just been handed is a COST while the phrase is about PRICE.
The amber/red pair discriminates by degree now, which is the idiom `vbadge` already uses for "over" against "well over".

Measured at 380 and 1280 in both themes against the longest realistic figures: the row is the same height with either phrase, 54px at 380 and 34px at 1280, and nothing overflows.
So the item's "without lengthening the row" is met rather than assumed.

`tests/verdict-subject.test.js` is new because nothing pinned any of these strings.
The property lived in a comment, and the phrase that violated it survived F8 — the batch that was explicitly reasoning about these three vocabularies and wrote the violation down as a residual rather than fixing it.

**Item 8 is `blocked` on Max**, with three options rendered in `docs/decisions/2026-09-02.html` and put to him in chat.
It is a visual, app-wide token change, and `skills/batch` says one blocked visual decision is enough to render rather than wait.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, on the branch diff, without the item.
**Two findings: one Major, DECLINED on measurement, and one Minor, fixed.** `docs/reviews/REVIEW-229-verdict-subject.md` has the report verbatim and the reasoning for each.

The Major one said the decision document's contrast figures were measured against a surface the text never paints on — it traced the explain line to its `st-review` row, which is `--warn-bg`, and recomputed everything against that.
Every figure follows correctly from that premise and the premise is false: `.flag-review` sets `background:var(--bad-bg)` and `.pt-explain` overrides only colour, weight and margin, so the element paints `--danger-bg` on top of the row's tint.
Measured in a real table rather than argued — the first opaque background above the text is the element itself, `rgb(251,235,234)` light and `rgb(51,40,38)` dark, giving the 4.17 and 4.32 already in the document.

Applying the remedy would have put wrong numbers in front of Max on a decision he has not answered.
That is batch 223's rule arriving from the other side: run the finding's own repro and its fix before applying it, because a review is not exempt from being measured.
It is pinned rather than only declined — `tests/visual/200-pack-unit.spec.js` now says why it walks to the first opaque background instead of naming a token, since in DARK the row is the worse of the two surfaces and the two readings do not fail in the same direction.

The one thing it was right about is fixed: the queue item said the values were solved against "the worst case, which is `--warn-bg`", which is true only in dark.

## Into CLAUDE.md

**Nothing.**
The declined finding is an instance of a rule already in the file — a finding's defect, mechanism and remedy fail independently, and the remedy is the one to measure before applying.
Adding a second worked example would be a tally.

## New docs/QUEUE.md items

**None. Item 9 is deleted and item 8 moved to `blocked`.**
Item 8 also carries two corrections to its own body, both measured: its body-text half names the wrong token — the failing one is `--text-3` via `--muted2`, not `.flag-review` — and its control-boundary half is two questions rather than one, because the switch cannot be read while the destructive button's border is decoration whose fix destroys the colour it signals with.

`docs/MAINTENANCE.md` had a line still describing the "Slightly under" residual as outstanding; it is struck with the closure.

## New docs/PHONE.md items

**None.** The change is two words in a modal preview line, measured at both widths and both themes.

## Probe

**What the item told me to do that I would have done differently.**
Nothing — it was one site and one phrase, and it was right about both.
It also told me what NOT to do, twice, and both warnings earned their place: do not re-litigate the three-vocabulary split, and do not lengthen the row.
The second is the reason the row height was measured with both phrases rather than eyeballed.

**What I did not propose because it was out of scope.**
Reviewing the other eight phrases for the same property.
The new test asserts the subject rule for the three `marginLightWord` returns only; the Menu cell's and the chips' phrases are asserted by nothing.
That is a bigger change to copy the item explicitly put out of scope, and it would have meant touching two screens on the strength of one.

## Surprises

⚠️ **I committed this batch to local `main` instead of a branch, and only caught it when the review reported the wrong branch name.**
Nothing had been pushed, so `origin/main` was never touched: `main` was reset to `origin/main` and the two commits moved to `fix/verdict-subject`.
The `new-branch` skill exists to prevent exactly this and the three earlier batches this session each ran it; this one did not, after merging the previous batch and going straight into the next item.
**The real cost would have arrived at push time** — a direct push to `main` bypasses the PR, and `enforce_admins` is false, so nothing would have stopped it.
Recorded rather than quietly fixed, because a recovery that leaves no trace is indistinguishable from the mistake never happening.

**A careful reader can derive the wrong contrast surface from the stylesheet alone**, which is the more useful half of this batch.
Two nested backgrounds — an element with its own fill inside a tinted row — is the case a palette-level calculation gets wrong, and it is why the spec that measures this walks the DOM instead of naming a token.
The spec was already right; what was missing was the sentence saying why, and it is now there.
