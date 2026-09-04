# HANDOVER - 232 (one control-row pattern: R4+R7, step 3 of Max's Phase 2 plan)

**Branch:** `fix/ui-audit-phase2-controls` · **Scope:** queue item 0, step 3 only (R4+R7), plus the `.king-link` maintenance entry riding the open file.
**Shipped `ezplate-v191`.**

## What changed
- The Menu search sits in the same left slot at the same 320-400px width as Plates, Products and Ingredients (R4, Max's own instruction over the mock's "switcher left, search right"); the menu picker right-aligns in the same row and can never wrap it.
- Below 768 every screen opens the same way: the search is a full-width first line, the filters sit under it (R7). The Menu keeps its switcher line between the two.
- A rehomed secondary action ("Existing plate", "Import", "Set up") joins the filter group left-packed instead of floating alone right-aligned on an orphan row; on the Menu at 390 the button now shares the select's line (picker basis 220 to 160, measured).
- Rode along: `.king-link`'s dead line-clamp is deleted (it never applied at any width); the 2-3 line wrap R2 already sized for is now the decided behaviour.
- New `tests/visual/v191-control-rows.spec.js`; honest rewrites in `fresh-states.spec.js` (edge probe measures the search now, clamp assertion pins 'none') and `v134-menu-pills.spec.js` (pills at the row's right, not the screen's left).
- One deliberate trade, recorded in the audit file: at 768-1023 the picker gets what the 400px search leaves, so a long menu name ellipsises in the select; the pinned header names the menu in full.

## Review
Two runs of nothing - ONE run of the `code-review` agent, forced onto Opus, diff only, no brief.
No critical or major findings; 8 minor/nit, all real: an uncapped mobile search width that needed to be a stated decision rather than an accident (decided, kept, said at the rule), two comments recording wrong causes, a spec table the assertions never read, a self-comparison, a vacuous-on-empty `.every`, a consumerless class, and a spec citing this handover before it existed.
Seven fixed in `4114808`; the eighth is discharged by this file (see Surprises for the mutation list it promised).
`docs/reviews/REVIEW-232-control-rows.md` holds the verbatim report and every decision; `Reviewed-commit: d2ebea7`.

## Into CLAUDE.md
Nothing.
The candidates (a computed-style probe proves a declaration reaches the element, not that it does anything; a mapping the assertions cannot see) are instances of roster classes already recorded.

## New docs/QUEUE.md items
None.
Item 0 updated in place: step 3 marked shipped, and a note that "STOP and show him after each step" with Max not live reads as one step per batch - the next `/batch` takes step 4 (R5+R6), and Max can override that reading in the item.

## New docs/PHONE.md items
None.
The changed rows are plain flex at widths the specs measure; nothing here needs a device to settle.

## Probe
What the item told me to do that I did differently: "the secondary action joins the filter row" is impossible verbatim on two screens - the Menu's `#menuFilterRow` is hidden outright on an empty list (`js/app.js:12127`), so homing the button there would delete the add-first-dish action on phones, and at 390 Products' two selects fill the line completely so Import physically cannot share it.
The shipped reading: the button keeps its `menuSwitchRow` home and joins the picker's line on Menu, and joins the group left-packed (stacking at the gutter when the line is full) on Products - the audit's actual complaint was "alone AND right-aligned", and both halves are gone.
What I did not propose because it was out of scope: capping the 561-767 search width (review finding 1 - kept full-width as the mobile pattern, but a real product call could go the other way); the Products supplier select still wrapping to a second line at 768-1023 (pre-existing, R7 is scoped ≤767); and the pct pill's ~50px squeezing the tablet-band select, which would vanish if the pill stood down below 1024.

## Surprises
- R7's stated remedy dissolved on measurement twice (the filter-row home, the 390 arithmetic) - the queue header's "grep the enumeration before planning" rule earned its keep again.
- `fresh-states`' clamp assertion had been green for months while pinning an INERT declaration: `webkitLineClamp` reads back from computed style even when the display it requires never applies. A computed-style probe is not a render probe.
- The eight hand-run mutations, each watched red (the spec's F8 promise): restore `.mnu-switch .plib-search{flex:0 1 200px}` → R4 width; restore `[data-mobile-home]{margin-left:auto}` → Products join; picker basis back to 220 → Menu same-line; delete the ≤767 `flex:1 1 100%` → R7@767 full-width (invisible at 390, which is why the 767 case exists); revert picker right-alignment → v134 pills; re-add a `.king-link` clamp → fresh-states 'none'; markup search back to the row's right → fresh-states edge probe; stale id in the spec's SCREENS table → R4 hasField.
- The unit suite's one red was the spec-COUNT guard in `tests/ci-workflow.test.js` - adding a 51st spec file trips a comment assertion in `.github/workflows/test.yml`, by design.
