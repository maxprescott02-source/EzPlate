# HANDOVER - 262 (one verb per intent)

**Branch:** `chore/one-verb-per-intent` · **Scope:** `docs/QUEUE.md` item 46, consolidated item 46. Shipped `ezplate-v215`.

## What changed

**The app had five save verbs, three delete verbs, two import verbs and a button labelled with a noun.**
It now has one word per intent, decided once and applied in one pass: opener `New <object>`, commit `Add <object>`, join a list `Add to menu`, edit `Save`, destroy `Delete <object>`, leave a list `Remove from <list>`, and one import word.
`tests/verbs.test.js` pins all 23 controls **by equality**, not by absence, so a relabel to a third wrong word cannot pass.

**Three sites were not in the item's list.**
They were found by counting the verbs across all 103 labelled buttons rather than by reading the enumeration, which is `CLAUDE.md`'s standing warning holding again.

- **`#kingModalSave` is DUAL-PURPOSE.** `saveKingModal` branches on `kingEditId`, and the markup carried one static "Save" - so the CREATE path wore the edit vocabulary. It is labelled from `isEdit` now, the same flag that decides whether Remove is shown, so the two cannot disagree about which mode the modal is in.
- **`#delChoiceMenuOnly` said "Delete from menu only" while KEEPING the plate** - its own toast says *"plate kept"* - while `#kingModalRemove` said "Remove" while destroying an ingredient outright. **The two were on opposite wrong sides of the same line.** The split is stated as *what survives*, not *how bad it feels*.
- **The import verbs are six sites, not three.**

**Two are deliberately unchanged and pinned with the reasoning**, so a later pass does not finish the job wrongly: `#ed_delete` ("Delete item") is the surviving fifth noun awaiting its own brief, and `#delChoiceAll` ("Delete everything") means two different things by design.

## Review

`code-review` agent, Sonnet against Opus. `docs/reviews/REVIEW-262-one-verb-per-intent.md`, `Reviewed-commit: 7b34924`.
**One CRITICAL finding and two minor ones. All fixed.**

⚠️ **THE CRITICAL ONE IS THIS BATCH'S OWN REGRESSION, AND IT IS THE SIBLING OF THE DEFECT THE BATCH EXISTED TO FIX.**
`setEditMode` - called by `openMenuEdit`, the only way the edit-menu-item modal opens - unconditionally wrote `'Save changes'` over `#editSave`.
So the relabel in `index.html` **could never reach the screen**, and `tests/verbs.test.js` was green about markup no user ever sees.

**I found the `kingModalSave` version of this by counting verbs across all 103 buttons, and then did not ask the next question: what else writes a label at RUNTIME.**
A static-markup pass is exactly the change that cannot see a runtime override, and I had just written a test that reads static markup.

**The fix is not "set it to Save", it is that a label has ONE OWNER.** All three `textContent` writes in `setEditMode` are gone; two of them wrote precisely what the markup already says, which is why the third looked like the others.
They restored the labels for the first of two modes and the second has been dead since v55.

**And the test grew a runtime half**, which the reviewer called methodological and which is treated as the finding, because the methodology is what let the regression through: it extracts the real `setEditMode`, runs it against a fake document seeded with the shipped labels, and was proved to go red by reintroducing the exact line.

The minor one was stale comments citing the old labels, fixed at every site.

## Into CLAUDE.md

Nothing.
The enumeration lesson is already *"an item that names a behaviour without naming its sites is an item whose list is already wrong"*, and the assertion-message one is *"a comment can record the defect CORRECTLY and file it under the wrong consequence"*.

## New docs/QUEUE.md items

None.
Item 46 is struck in both files and the three remaining G4 items (57, 58, 60) keep their positions.

## New docs/MAINTENANCE.md items

**Two, both about tests rather than the app.**

- **`fresh-states.spec.js` asserts the Menu secondary's label on a HIDDEN element.** In a fresh state there are no menus and no eligible plates, so `updateMenuAddDishBtn` hides the button - and Playwright's `innerText()` on a hidden node returns the raw text rather than the rendered text. The assertion has therefore never observed anything about layout, while its message said *"it already fits"*. Pinning the rendered label needs a spec with a menu in it, which is a fixture rather than a one-line change.
- ✅ **`v143-dashboard.spec.js` compared `getBoundingClientRect()` floats with `toBe`** and flaked one run in four. Fixed here; recorded because the shape will recur.
- ✅ **`226-bottom-stack.spec.js` slept 300ms through a transform** instead of waiting for it, and failed only under the full suite's parallel workers. Fixed by polling until the rect settles, capped so a stuck transition still fails rather than hangs.

## New docs/PHONE.md items

None.
Every label was read from the live DOM in a browser, and the one that could have wrapped is shorter than what it replaced.

## Probe

**What did the queue item tell you to do that you would have done differently?**

**Its label for the noun button, and the disagreement is recorded rather than silently taken.**
The item proposes "Add plate to menu"; the shipped label is "Add plate".
`fresh-states.spec.js` records that the mock's "Add existing plate" **wrapped the 380px Menu header onto two lines**, and that this button's own rule is that its words stay put at both widths rather than collapsing.
"to menu" is also the redundant half: `css/style.css` states the app's reason for the `.btn-noun` idiom in as many words - *the tab already names the thing*.
So the verb the item asked for is there and the noun the screen already supplies is not.

**What did you not propose because it was out of scope?**

**Resolving the fifth noun.** "Menu item" survives in `#ed_delete`, `#delChoiceTitle` and the Edit-menu-item modal, and every alternative is either forbidden ("dish") or wrong ("plate" - it deletes the menu row, not the plate). `CLAUDE.md` says it is awaiting its own brief and is not to be fixed on sight, and a verb pass is exactly when someone would be tempted. It is pinned instead, so the next reader finds the three sites together.

I also left `Create account` and `Create my café` alone. They are onboarding rather than app objects, and "Add account" is worse English for the one flow a stranger meets first.

## Surprises

**A first cut of this item went red for the right reason and taught me something about a spec I was not reviewing.**
I gave the Menu button the app's `.btn-noun` collapse; the 380px assertion then failed with the FULL text.
The cause is that the button is `hidden` in a fresh state, and **`innerText()` on a hidden node ignores the `display:none` on the span**.
So an assertion that has been green for many versions, whose message names a rendered-width property, has only ever been reading `textContent`.

**TWO flaky tests cost more than their flakes, and they fail in opposite ways.**
`v143-dashboard.spec.js` compared layout floats with `toBe` and went red with a delta of **eighteen-thousandths of a pixel** - it flakes on an unmodified `main` one run in four, in isolation.
`226-bottom-stack.spec.js` slept 300ms through a toast's transform and went red with the toast **8px short of its final position** - it passes 3/3 in isolation and on a full run of clean `main`, and failed only inside a full run on the branch.
**So the two need DIFFERENT checks, which is the transferable part:** run a suspect spec three times in isolation AND once as part of a full run on clean `main`, because this pair proves neither alone is sufficient.
⚠️ **AND A THIRD RUN PRODUCED FOUR MORE FAILURES THAT WERE NONE OF MY BUSINESS EITHER.** Four unrelated specs, and the run took **42.6 minutes against the usual nine**. `uptime` said load average **17.3** - I had run four full suites back to back, so the machine was starving its own workers.
On a settled machine the same tree passes 478/0 in 8.9 minutes.
**So: check the WALL CLOCK and the load average before reading a Playwright result at all.** A run that takes five times as long is not a result, and four unrelated timing failures at once is the signature - a real regression does not spread itself across four specs that share no code.

⚠️ **And in both of the real flakes, every other number in the payload was exactly right** - which is what makes a timing failure read as a geometry defect, since the assertion is about geometry. The honest first reading of a red test is *"my change broke this"*, and that reading cost this batch most of its time.

**The regression I shipped was invisible to 2240 green tests, and a browser drive of the actual modal would have caught it in ten seconds.**
I drove every label I changed by reading them out of the live DOM - and reading a label is not the same as OPENING the thing that shows it.
`CLAUDE.md` says to drive the app, and I drove the document.

**I also confounded my own Playwright run** by hand-mutating `index.html` while it was reading the file, and had to throw the run away and start again.
That is `CLAUDE.md`'s batch-182 lesson - a mutation run that overlaps something else reading the tree produces results that cannot be trusted - arriving from the other direction: there the harness could not restore, here the harness was fine and the *other* reader was the casualty.
