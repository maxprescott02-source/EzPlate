---
paths:
  - "js/app.js"
---

# The invoice parser and the review screen

Loaded whenever `js/app.js` is read. A mispriced line looks exactly like a correctly priced one, which is why this is its own file.

**Moved out of `CLAUDE.md` verbatim by batch 264** so it loads with the file it protects instead of on every turn of every session. The rule in `CLAUDE.md` is the one-line version; this is the evidence.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, another file in `.claude/rules/`, or `docs/rules/process.md`. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## The parser region - THE PROTECTION IS LIFTED (Max, 10 Sep 2026: *"its lifted"*)

⚠️ **THIS SECTION SAID "NEVER EDIT ANYTHING INSIDE IT" AND NAMED FOUR NEVER-TOUCH FUNCTIONS. IT NO LONGER DOES.**
Put to him as question 1 of `docs/decisions/2026-09-10.md` with both consequences written out, because reversing a decision he made himself is his alone and the record had been contradicting itself for two days across four documents.
**The same sentence RATIFIES batch 197's edit inside the region**, which `docs/MAINTENANCE.md` had been asking about since 28 Aug 2026 through two audits - the question said so in as many words, and the answer was given against that wording.

**So the region may be edited, and `resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory` and `packToUnitCost` may be changed.** The reason the prohibition existed - QUEUE item 17, the parser pricing by repetition and position, wrong on 36 of 41 real lines - is the work it was blocking.

**What is NOT lifted, because it was never a decision of his and is not a rule at all:**

- **The two anchors are LOAD-BEARING STRINGS.** `tests/_extract.js` slices the block with `sliceBetween(src, 'var INV_EXCLUDE=', 'function unitLabelFor(')`. Delete, rename or reorder either literal and the slice silently becomes something else - a different span, or an empty one - and every test built on it is then asserting about the wrong text while staying green. **Edit inside the anchors freely; do not disturb the anchors themselves without changing that file in the same commit.**
- **The taught-pack path still exists so the parser needn't learn every notation.** That is a design fact, not a permission: a notation the user can teach is still cheaper than a parser rule, and lifting the protection does not make parsing the right answer to every line.
- **These four functions are the ones this file has recorded defects in most often** - the exemption-scope trap at `resolveMatchedPrice` is a Tier 1 section of its own. They are now editable and they are still the code where a wrong change is hardest to see, because a mispriced line looks exactly like a correctly priced one. **Extract and pin before changing, per the roster.**

✅ **AND WHAT REPLACED THE PROTECTION NOW EXISTS - `tests/parser-corpus.test.js`, in `npm test` since batch 256.** It runs the REAL parser over fourteen invoice layouts with hand-written truth and fails on **any silent-wrong price or any unflagged non-product row**; two residuals are allowed by NAME AND BY LINE so a new one cannot hide behind an old one. It was proved to go red against the pre-256 parser and green after, which is the only evidence that a net is a net.
**So the answer to "may I edit the region" is no longer a rule, it is a number**, and the number is what a batch touching the region owes its handover: run `node tests/parser-corpus/run.js` and `node tests/parser-corpus/run.js --products tests/fixtures/base-products.json`, and put silent-wrong and pre-ticked-wrong in, before and after.
⚠️ **THE HONEST LIMIT, because a net you over-trust is worse than none: THE FOURTEEN LAYOUTS ARE INVENTED.** The six REAL invoices' truth is committed at `spike/parser-audit/real-truth/` and their extracted text deliberately is not - it carries the cafe's details and this repository is public - **so no test in this repo can run them.** A green corpus means *no synthetic layout regressed*; it never means *the real invoices are right*. That gap is consolidated item 37 and it is the reason the `--products` run is asked for separately: it is the closest thing to real data the repo holds.

## Fragile areas - regression tests mandatory

Read the relevant tests first, diagnose with a truth table before patching, lock the fix with a regression test.

- **Invoice review rendering** (`renderInvReview`, `invSelChanged`, `invRowState`, `flagNeedsAttention`, the pack-teach flow).
  Three invariants, each from a real regression: **full-row re-render only** (per-cell patching left stale cells); **`.muted-row` hiding is scoped to `.is-new`** (it was hiding Old/Conf on needs-attention rows); **tint derives from `invRowState` via `st-*` classes** so the card and the summary can never disagree.
- **Auto-tick rule:** only a row whose `invRowState` is `'matched'` is ever **pre**-ticked - by the renderer AND by every handler.
  Flagged, review and new rows wait for the user.
- **Taught packs / price precedence:** product pack > supplier memory > parser > manual.
  A pack taught in the mismatch flow must persist on the product and outrank the parser on every later import.
- **Supplier renames must migrate supplier memory.** Taught matches key off the supplier NAME (`memKey`); renaming without re-keying orphans them silently.
  `tidySupplierMemMigration` rebuilds keys from each entry's already-normalised `phrase_norm`.
  Apply the same pattern to any future rename of a name used as a lookup key elsewhere.
- **The builder is a FULL PAGE.** `#builderPage`, a child of the Plates library rather than a tab of its own: `openBuilder` hides the `#tab-*` panes and shows it, the Plates nav item stays lit, and any tab change leaves it.
  ⚠️ **There are NINE panes, not five** - this said "five" until 12 Aug 2026, when AUDIT-v156 counted them; F8, F9, F10 and 171 each added one. **Read the list from `TAB_PANES` in `js/app.js`, never from a count written down anywhere**, because a pane missing from that array renders UNDERNEATH the builder page - the code says so at its own site.
  **The whole history, because this line has been wrong in both directions and each time it cost a batch:** the builder was a modal from v54; Max confirmed that shape on 8 Aug 2026 against a recommendation to change it; Q6 (v125) shipped its redesign inside the modal; **he then reversed it on 9 Aug 2026**, and this file carried both facts at once until **F7 shipped the page as `ezplate-v146` on 11 Aug 2026.** A batch once spent itself hunting a conversion that had already shipped two years of versions earlier, which is why the record is written out rather than summarised.
  **Leaving the page is not a data risk and must not be "fixed" into one.** Tapping another tab hides it and keeps the plate in memory and in the draft - exactly what pressing × did while it was a modal - and `guardUnfinishedPlate` offers the work back at the next entry.
  **Publishing, printing, duplicating and deleting a plate all live on this page.** The v54 plate-action chooser (`#plateActionsModal`) is deleted and a Plates row opens the builder directly; F7 rehomed all four of its actions rather than dropping any (§R3).
  **A sentence here claiming the dropdown placement work is "UNBLOCKED" because "the positioning context is already final" was DELETED 10 Aug 2026** (Max's yes, AUDIT-v135): both halves were false the moment the reversal was taken.
  The scheduling it asserted lives on the queue item, which re-checks it every batch.
- **Mobile visual consistency:** one card system, compact header pills not full-width bars, one primary CTA per screen.
  A previous density pass was rolled back wholesale - visual changes are surgical, one screen at a time.

---
