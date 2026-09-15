# HANDOVER - 272 (modal footers)

**Branch:** `fix/272-modal-footers` · **Scope:** `docs/QUEUE.md` item 47 (consolidated item 47), "One modal footer pattern", the first item promoted from group G5.

## What changed

Every edit form's destructive action is placed by ONE rule, `.mfoot > .btn.danger:first-child{margin-right:auto}`.
Three modals wore that intent before this and each did it differently: an empty `.mfoot-spacer` span under a modal-named `.ig-foot` class, `margin-right:auto` on one button's own id, and an entire `.edit-delete-row` strip below the footer holding a centred `<a>`.
All three old mechanisms are deleted, so the pattern can be worn rather than copied.
**The rule is keyed on `:first-child` and NOT on `.btn.danger`, and that is the safety of it:** a confirm dialog's destructive action is its PRIMARY and belongs on the right, which is where `#delChoiceModal`'s "Delete everything" stays.
`#ed_delete` is a real `<button>` instead of an `<a role="button" tabindex="0">`.
Five dismissal buttons that only close their modal now wear one class instead of four.
Below 420 the footer buttons trim their side padding, which is what gives the pattern room to exist at 380.
`.use` reaches 44px effective through an `::after` extension; `.del-link` retires with the footer rewrite.
`tests/modal-footers.test.js` (9 tests) and `tests/visual/272-modal-footers.spec.js` (12, at two widths and both themes) are new.
**Shipped `ezplate-v221`.**

## Review

The pre-push `code-review` agent, run on **Sonnet**, overridden from the pinned `opus` because this batch ran on Opus.
It was given the branch diff and not the item, the plan or the premise-check report.

**Three findings.**
The first, that `docs/STATE.json` was stale and the branch could not merge, is the handover step this batch had not reached - `node tools/state.js` runs in this commit, and `tests/state-file.test.js` exists precisely so a handover cannot land without it.
It is recorded rather than waved away because the reviewer was handed a claim ("2359 green") that was true of the commit before the version bump and not of the one it read, and it falsified it.
The second and third are real and both are TAKEN.
The anchor-colour test I rewrote was WEAKER than the one it replaced: making the class list derived was right, but a class with no own-name rule and a class whose rule had been DELETED hit the same `continue`, so deleting `.linklike{...}` left it green. It now has a derived loop and a literal floor, and the reviewer's own repro turns it red.
And a comment saying the app owns "exactly three anchors" was edited BY THIS BATCH into "that count is two anchors" - a fresh wrong number written into the fix for a stale one, in a repo whose most-recorded rot is exactly that. The enumeration is deleted rather than re-counted.

Full `npm run mutate`: 1436 mutants, 1382 killed, 54 survived all with written allowances, 3 killed by timeout, exit 0.
Full Playwright: 493 passed, 14 skipped.
Artifact: `docs/reviews/REVIEW-272-modal-footers.md`.

## Into CLAUDE.md

Nothing in `CLAUDE.md` itself or in `.claude/rules/`.
The three shapes a modal footer can have are written into the header of `tests/modal-footers.test.js` and asserted there, rather than into a rule file, because a reader reaches them at the moment they would get it wrong.

## New docs/QUEUE.md items

None as new work.
Item 47 STAYS in the queue, rewritten: four of its five bullets shipped and the fifth, the builder's "Clear plate" beside "Delete plate", is builder-screen work rather than modal work.
The Design law forbids mixing the two in one change set, and batch 271 moved that screen under the bullet, so the residue is written back into the consolidated item with corrected line numbers and a warning to re-measure at 380 rather than left implied.
`docs/MAINTENANCE.md`'s sub-44 touch-target entry is struck: `.use` is done and `.del-link` retired with the row it lived in.

## New docs/PHONE.md items

None.
Every footer was measured in a real browser at 380 and 1280 in both themes, and the touch target with a real hit test, so by the five-way test in `skills/batch` none of it needs a phone.

## Probe

**What the item told me to do that I would have done differently.**
It asked for "one modal footer pattern" over a set it counted as three footers.
There are eighteen, and they are three SHAPES rather than one: an edit form's destructive action is an escape hatch and goes far left, a confirm dialog's IS the primary and stays right, a dismissal is a single button that only closes.
Following the item literally would have moved "Delete everything" to the left of its own dialog.
Its "Done buttons disagree" bullet named two buttons; there are five, in four styles.
And its last bullet is split out rather than done, which is stated above.

**What I did not propose because it was out of scope.**
Nothing.

**Was any rule missing when I needed it.**
No.
`.claude/rules/css.md` loaded with the stylesheet and is what made me write the browser spec rather than trust the source test: it says a CSS syntax error is silent and takes every rule after it, which a grep for a selector cannot see.

## Surprises

**`#ed_delete` had no keyboard access at all and nothing had noticed.**
It was an `<a role="button" tabindex="0">` with a CLICK handler and no keydown, so Enter and Space did nothing on the Delete control in the Edit-menu-item modal.
Neither the item, nor the accessibility bullet in the same item, nor any audit had named it; it was found by moving the element for an unrelated reason and fixed for free by making it a real button.
The spec presses Space rather than clicking, so the regression is pinned by the key that never worked.

**The pattern did not exist at 380 for the longest label, and only measuring all three showed it.**
"Delete ingredient" (162px) + Cancel + Save + two gaps + 40px of footer padding is 380 on the nose, so `margin-right:auto` had ZERO free space and the destructive button sat 8px from Cancel - the adjacency the item exists to prevent.
Edit product cleared it by 25px and Edit menu item by more, so two of the three modals looked fine.
The first fix I tried, `flex-wrap:wrap`, changed nothing and was reverted: there was no overflow to wrap, only an exact fit.

**Three line-citation corrections, and a fourth claim that pointed at nothing.**
`premise-check` found 6 of 7 wrong - several landing inside unrelated modals - and `js/app.js:9645`, cited as recording why "Clear plate" exists, is inside the team-invite deletion block. The real comment is at `:2668`. All four corrections are written into the consolidated item for the batch that takes the remaining bullet.

A dead-code rider came with the two functions this batch opened: `edDelArmed`, declared and written twice and read nowhere, plus a line writing "Delete item" over markup that already said "Delete item" - the fourth instance of that exact shape in this one modal's openers, after batch 262 removed three of them from the function next door.
