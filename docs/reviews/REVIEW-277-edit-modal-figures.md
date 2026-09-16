# REVIEW - 277 (edit-modal-figures)

Reviewed-commit: 71c4791

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.
`CLAUDE.md` requires a different model from the batch, and only the batch knows which model it is. It was given `git diff main...HEAD` and nothing about the queue item.

**Outcome: no defect in the code. Two findings, and BOTH are about this batch's own COMMENTS claiming more than its tests establish.**
That is the more useful kind of finding for this repo, whose roster already carries "a comment can record the defect correctly and file it under the wrong consequence". Here the shape is one step along: a comment that says a question is *settled* when only half of it has been asked.
Both underlying hazards are pre-existing and neither is a regression. Both comments are corrected and both hazards are now filed in `docs/MAINTENANCE.md`.

---

## The report, verbatim

All tests pass. That confirms the unit-level correctness claims; the remaining findings below are about what the tests and comments don't establish, not about test failures.

## Findings

**1. Minor — the visual test's own comment overclaims what it proves about the "rebuild mid-typing" hazard.**

`tests/visual/277-edit-modal-figures.spec.js` (the last test) carries this comment:

> "the risk of doing it there is that a rebuild lands mid-keystroke and rewrites what is being typed. `setMiscCost` calls updateTotals, which calls renderBuilderCost and NOT renderPlate, so the row survives; this is what proves it"

That's true only of the path where typing *in the misc field itself* triggers the rebuild — it doesn't, because `setMiscCost` (js/app.js:2308) only calls `updateTotals()`, which does not touch `linesEl.innerHTML`. But `renderPlate()` (which *does* rebuild the misc row via `miscRowHtml`, and is where `padMoney` now runs) is called from several places that are not driven by the user's own keystrokes in that field — most notably `bootstrapSync` (js/app.js:1832), which per `.claude/rules/app-guards.md` is re-run by the `online` event listener whenever the connection comes back. If that fires while a user has a misc-cost field focused and mid-edit (e.g. they've typed `"5."` and paused), the whole `#lines` block is replaced with a fresh DOM node, the input loses focus, and the in-progress edit is interrupted.

This hazard predates the diff (the innerHTML-rebuild pattern was already there; only the `padMoney` formatting is new), so it is not a regression this diff introduces. But the new comment asserts the case is "proved" safe, and the new test only exercises the narrower, always-safe self-triggered path — it never simulates an external `renderPlate()` landing mid-keystroke, so it cannot catch a future change that makes this worse, and it does not establish what the comment claims.

- Repro sketch to verify the mechanism: open the builder, add a misc line, focus its cost input, type a partial value, then call `renderPlate()` directly from the console (simulating what `bootstrapSync`'s `online`-triggered resync does) — the input node is replaced and focus/caret are lost.

**2. Nit — "cannot disagree about the same dish" doesn't hold against the Plates library's `plateCostText` for a zero-cost plate, though this is inherited, not new.**

`renderEditMargin`'s comment asserts the modal "cannot disagree" with the publish dialog, the builder's docket, or the Menu row about a given dish, because all read `costDetail`/`analyze`. That's true of that specific family (all four gate on `cost>0`, confirmed at `renderMenuMarginPreview` js/app.js:12225, `renderBuilderCost` js/app.js:2497, and `vbadge` js/app.js:4221). But `plateCostText` (js/app.js:11658, used in the Plates library) gates on `plateFullyCosted`, which only checks `miss===0` and line count — not `cost>0`. So a plate whose only line is a misc cost of exactly `$0.00` (a value `costDetail`'s own comment calls legitimate) would show **"not costed"** in this new modal and in the publish dialog, but **"$0.00"** in the Plates library, for the identical dish. This discrepancy already existed via `renderMenuMarginPreview` before this diff — it is not introduced here — but the new comment's blanket claim is not accurate against that screen. Low practical impact (requires a misc line typed to exactly zero), flagged for completeness rather than as a regression.

**Everything else checked and found correct:**
- `padMoney`/`padMoneyEl` are value-preserving (verified by the property test over all 384 real catalogue rows, and it passes); the round-trip guard in `padMoneyEl` is the right belt for a field `saveIngEdit` reads straight into `cost_per_base_unit`.
- `saveMenuEdit` and `saveIngEdit` both read the raw `.value` and `parseFloat` it directly — padding never changes what gets saved.
- `attachMoneyPad` is idempotent per-element (`el.__moneyPad`) and the margin-preview `input` listener is likewise guarded (`__marginWired`), so no duplicate/leaked listeners across repeated modal opens.
- No duplicate top-level definitions for any of the four new functions.
- All six cache-version spots (`sw.js` CACHE, `sw.js` ASSETS ×2, `index.html` css link, `index.html` script src, `js/app.js` `APP_VERSION`) are bumped together, v225→v226.
- `renderEditMargin`'s three states (unlinked/no-dish, uncosted, costed) match its unit tests, and the uncosted-plate refusal correctly withholds a suggested price rather than computing one from a short total (222's rule).
- The `.margin-preview`/`mp-*` CSS classes and `.field.full` grid class already exist and are reused, not reinvented.

---

## Decisions

### Finding 1 — CONFIRMED by running its own repro, comment corrected, hazard filed.

`CLAUDE.md` requires a finding's repro to be run before its remedy is applied. Run: builder open, misc line added, its cost field focused and edited, then `renderPlate()` called directly.
**Measured: `sameNode:false`, `document.activeElement` moves off the input, and the field re-renders from the stored value.** Exactly as described.

The comment now states precisely what the test proves — that the field survives **its own** keystrokes, which is the path padding could plausibly have broken — and names the external-rebuild hazard as pre-existing and unproven-safe.
The hazard itself is filed in `docs/MAINTENANCE.md` with the measurement, the two grounds that make it C, and what would make it B (a rebuild on a timer, or any field in `#lines` that is typed into for longer than a moment).

**Not fixed here, deliberately.** The innerHTML rebuild predates this batch and only the padding inside the template is new; preserving focus and selection across a rebuild is a change to how the docket renders, which is a different subject from what this item is about.

### Finding 2 — CONFIRMED, comment scoped, divergence filed.

The claim was written as an absolute and is true of the `cost>0` family only. `plateCostText` gates on `plateFullyCosted` (`miss===0` plus a line count), so the one shape where they disagree is a plate with lines, no missing costs, and a total of exactly zero.
The comment now names the family it holds for and names the exception. The divergence is filed as C, with the observation that it needs a product decision rather than a fix: *"a plate that costs nothing"* and *"a plate we cannot cost"* are different sentences and the app currently says both.

### What is worth carrying out of this review.

Both findings are the same shape, and it is one the roster does not yet name in these words: **a comment that says a question is SETTLED when the test beside it answers half of it.**
The existing rule is about a comment that observes correctly and disposes wrongly; this is about a comment that cites its own test as proof of a wider claim than the test makes.
It is not being added to `CLAUDE.md` as a new rule — it is close enough to the existing entry to be read off it, and that file is short on purpose — but it is recorded here and at both sites, because the reviewer found it twice in one diff.
