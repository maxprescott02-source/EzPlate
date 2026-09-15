# HANDOVER - 271 (builder readiness)

**Branch:** `fix/271-builder-readiness` · **Scope:** `docs/QUEUE.md` item 51 (consolidated item 51), "Builder readiness and copy", the last A-or-B item in group G4.

## What changed

Save is refused BEFORE it is pressed, and the refusal says why.
`builderSaveBlocker` is the one source for "not yet" and `syncBuilderPlateActions` grows from two controls to six, owning every one.
Print is disabled on an empty docket; Clear only when there is nothing at all to clear, which is not the same question, because Clear also drops the name and the loaded plate.
The reason renders into two sinks with one writer each: `#saveHint` in the rail and `#bFootLine` in the phone's sticky bar, which hide and show at the same breakpoint as the Save control each sits beside.
On the phone that line is also the ROUTE: tapping it puts the cursor in whichever field is missing, and focus is what scrolls.
`#editTag` says "Editing a saved plate" in a neutral pill, so the plate's name is on the page twice rather than three times.
The docket helper is two sentences with no device verb: "Select a unit cost to edit it. The change applies to every plate."
`addKitchenLine` refuses an ingredient already on the plate, naming it in a toast and focusing the existing line's quantity, rather than merging.
`#bCost` gains `is-bare`, so the phone stops painting an empty card body for a plate on no menu.
`tests/builder-readiness.test.js` is new: 23 tests, every one proven red by hand against the code it names.
**Shipped `ezplate-v220`.**

## Review

The pre-push `code-review` agent, run on **Sonnet**.
The definition pins `opus` and this batch ran on Opus, so the reviewer was overridden for this run per `CLAUDE.md`.
It was given the branch diff and not the item, the plan or the premise-check report.

**No defects. Two nits.**
The first, that the "one owner" census used a same-line regex a second writer binding the element to a variable would walk past, was right and is TAKEN: the census now also follows the binding and forbids `X.disabled =` anywhere outside the owner, in both quote styles, proven red against a real injected second writer and with its remaining limit stated at the site.
The second, the name keystroke cascading into a full `renderBuilderCost` repaint, was CONSIDERED AND DECLINED: keeping it is what gives `#bFootLine` one writer, and the correctness question underneath was checked rather than assumed - reaching `#plateName` blurs `#bPrice` first, and that blur commits, so no name keystroke can discard an uncommitted price.

Full `npm run mutate`: 1436 mutants, 1382 killed, 54 survived all with written allowances, 3 killed by timeout, exit 0.
Re-run scoped to this batch's three targets after the nit-1 fix: 22 mutants, 22 killed, 0 survived.
Full Playwright: 480 passed, 14 skipped.
Artifact: `docs/reviews/REVIEW-271-builder-readiness.md`.

## Into CLAUDE.md

Nothing in `CLAUDE.md` itself or in `.claude/rules/`.
Three process edits under the 13 Aug 2026 standing authority.
`docs/QUEUE.md`'s promoted-items heading no longer names a group: it named the wrong one for five batches, because a section heading is not a status field, and the current group is derived into `docs/STATE.json`.
`docs/QUEUE-GROUPS.md` strikes 51 in G4's `**Items:**` line and in G6's, which listed "the Save-readiness half of 51" as its own, and records that G4 is drained of A-and-B work.
`docs/MAINTENANCE.md` marks two entries done and records that one of them carried a stale measurement pointing at a fix that would have deleted two controls from the phone.

## New docs/QUEUE.md items

None as new work.
The refill promoted G5's twelve tier-A-and-B items: 47, 49, 50, 53, 54, 56, 59, 61, 62, 63, 64, 65.
68, 75 and 85 are tier C and stay in the backlog; `docs/QUEUE.md` holds A and B only.
One finding was routed rather than fixed: `docs/MAINTENANCE.md`'s toast-over-Save entry was offered to this batch as a C rider on `renderBuilderCost` and declined there, and is now visible as promoted item 50.

## New docs/PHONE.md items

One, appended to the existing keyboard check rather than added as a sixth section, so the file stays at five.
Tapping the sticky bar's "Name this plate to save it." must bring the name field up above the soft keyboard with the cursor already in it.
It passes the five-way test on the soft keyboard: focus is what scrolls, iOS decides where a focused field lands, and no browser on a desk can answer that.

## Probe

**What the item told me to do that I would have done differently.**
Three things.
It said to hide the Cost CARD when it has nothing to show; at 380 that card is 60px and holds Print and Clear, so hiding it deletes two controls from the phone, and the part that is actually empty is `.bld-cardbody`.
It offered "merge into the existing line's quantity" for the duplicate ingredient; a new line carries `defaultQty` or null, so merging adds a number the user never typed to one they did, silently, on a costing screen.
Its grammar bullet does not reproduce and nothing was changed to make it true.

**What I did not propose because it was out of scope.**
The toast-over-Save collision, a C rider on a function this batch opened.
Declined because the fix is the `--install-banner-clear` mechanism pointed at a second element, which is the toast's docking rather than the builder's readiness, and taking it would have made one PR out of two subsystems.

**Was any rule missing when I needed it.**
No.
`.claude/rules/css.md` loaded with the stylesheet and named the exact trap I then walked into, and its one-source-two-sinks-one-breakpoint rule is the shape this batch's hint follows.

## Surprises

`premise-check` found four of the item's six line citations wrong, which is the ninth batch in a row to find its item's enumeration or citations short.

**Two Playwright specs failed on the first full run and both failures were the new code working.**
`213-layer-stacking` types "chip" and clicks the FIRST option, and on its seeded plate that option is the ingredient the plate already has, so the duplicate guard correctly added nothing.
It now picks one the plate does not have, with the reason written at the site.

**The second is the finding worth carrying, and it is not about this screen: DISABLING A CONTROL SILENTLY DELETES WHATEVER ITS REFUSAL USED TO EXPLAIN.**
`v150-builder-order` pinned "pressing Save on an unnamed plate BRINGS THE FIELD TO THE USER", measured at 380 with eight lines, where `#plateName` is off the top of the screen.
A disabled Save has no press, so that one-tap recovery would have gone out with it and nothing in the item mentioned it.
The spec is rewritten around the mechanism that replaced it rather than deleted, and the tap-to-fix on the reason line exists ONLY because that spec did.
An item that says "disable X until valid" is also saying "delete whatever X's refusal was doing", and neither this item nor the modal it cites as the rule says so.

I wrote a CSS comment without its opening `/*`, which is the silent-discard failure `.claude/rules/css.md` records in full, in the session that had just loaded it.
`tests/css-syntax.test.js` went red in the same minute, which is what that test is for.
