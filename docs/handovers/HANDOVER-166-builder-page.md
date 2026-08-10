# HANDOVER - 166 (F7, the plate builder becomes a full page)

**Branch:** `f7-plate-builder` · **Scope:** queue item F7, the last screen conversion before Invoices. **Ships `ezplate-v146`.**

## What changed

The builder is a full page (`#builderPage`), rebuilt from the mock's §3.7 and §6 rather than restyled.
It is a CHILD of the Plates library, not a sixth tab: `data-tab="builder"` is still the library, `openBuilder` hides the five panes, and the Plates nav item stays lit while its child page is open.
A Plates row now opens the builder directly, which is the handoff F2 deferred to this item in its own test name.
The v54 plate-action chooser is deleted and all four of its actions were rehomed: Edit is the row click, Add-to-a-menu is the Publishing card, Print docket and Delete plate are the rail's actions.
Duplicate ships, clones lines and category into an unsaved plate, and deliberately does not copy the publish state.
"Saved just now" renders only when the server confirms, and any edit retracts it.
Save no longer navigates away, because the control the user needs next is on this page now.
Deleted in the same change: the whole v49 docket, Q6's §28 modal grid, the v101 380px squeeze, the v67 misc block, `#plateActionsModal`.

## Into CLAUDE.md

The Tier 2 bullet is rewritten, which this item carried the instruction to do.
It now states the page as today's fact and writes out the full reversal history in one place, plus two things a future batch could get wrong: leaving the page is not a data risk, and publishing lives here.
No new rule proposed.

## New docs/QUEUE.md items

None.
The item is deleted from the queue per the 11 Aug reset, and one thing it asked for did not ship: **Recent range on the cost card**, recorded in `docs/MAINTENANCE.md`.

## New docs/PHONE.md items

**Drive the builder on the phone, both themes.** Open a plate from Plates, change a quantity, tap a unit cost to re-price, add a misc line, save, then publish from the Publishing card.
A failure looks like: the summary bar covering the last row, the header wrapping to three lines, or Save reachable only by scrolling.
Only a device settles the bar's clearance, because the tab bar's height is measured differently by the emulator.

## Probe

**What did the queue item tell you to do that you would have done differently?**

Two things, and one of them was impossible as written.

**"Recent range: read-only derivation from `priceHistory`" cannot be built.** `priceHistory` is the all-menus food-cost average series, not a per-plate cost history, and no per-plate cost series exists anywhere in the app.
Reading it anyway would have printed the cafe's average food cost as though it were this plate's cost range, which is a wrong number on a costing screen.
It did not ship (R4), and `docs/MAINTENANCE.md` records what a real one would need: reconstructing each line's product price at time T from `ing_price_history`.
The item was written from the mock, and the mock does not know what data exists.

**Duplicate is in the rail, not the header.** The mock puts it in the header and puts no Save there, because its builder autosaves; this app must not autosave, so Save is the header action, and §6 allows one on a phone.
Putting both in the header would have spread the exact deviation the mobile-header queue item exists to stop.

**What did you not propose because it was out of scope?**

The mock's Cost card has one menu-price input and this app's plate is on any number of menus, each with its own price.
The per-menu list stays (R2), but a plate on six menus now shows six rows in a 300px rail with no way to edit a price without opening the manage-menus modal.
That is a real design question and it belongs to whoever revisits publishing, not to a screen conversion.

The `.f` label style renders "Category (optional)" in uppercase letter-spaced caps, which is the app's old form idiom and not the mock's sentence case.
It is app-wide, so changing it here would have converted every other form by accident.

## The pre-push review found four, all reproduced in a browser, all fixed in this branch

**1. The header pill had no `:not([hidden])` guard**, so the renderer's `hidden=true` was overridden and a small empty coloured chip floated in the header of every new plate.
This is CLAUDE.md's Tier 1 `[hidden]` corollary landing for the third time in the codebase, and the review caught what the spec could not: the spec asserted the DOM `hidden` PROPERTY, which reflects only the attribute.
It passed while the bug shipped.
The spec now asserts the computed `display` and the painted box, which is the contract it claimed to pin.

**2. "Clear plate" left Duplicate and Delete visible and dead.**
Both read `loadedPlateId`, the discard sets it to null, and neither `openBuilder` nor `saveCurrentPlate` runs on that path.
Clicking either was a silent no-op, which is what §R4 forbids.
The cause was two `hidden=` assignments copied to each call site rather than one function owning them, so the fix is `syncBuilderPlateActions` plus a census that fails if a third copy appears.
The bug did not exist before F7: the four actions used to live in a popup Clear-plate could not reach.

**3. "Saved just now" could appear for a state the server had never seen.**
Save, keep editing while the write is in flight, let the write resolve: the resolver put the badge up for a push that did not contain the later edit.
Retracting on the next edit cannot help, because the stale write has not resolved yet.
The save now captures an edit counter and refuses to claim success if it has moved.
On mobile data, which is the condition this app is designed around, that was reachable by anyone who kept typing after tapping Save.

**4. Focus was dropped in both directions.**
Every overlay gets opener capture, focus-in and focus-restore free from `openOverlay`/`closeOverlay`; a page is not an overlay, so the rewrite lost all three and `document.activeElement` landed on `<body>` on every entry and exit.
The opener has to be captured BEFORE the panes are hidden, because hiding the pane it lives in is what drops focus.

Each fix carries a regression test, and each test was checked against the unfixed code first.
Two of them did not fail on the first attempt: the Clear-plate test called the helper from its own shim rather than the real handler, and the pill test read the property rather than the computed style.
Both are the shape CLAUDE.md warns about, found by doing the check rather than by reasoning about it.

## Surprises

**A test was right by accident, and F7 is what exposed it.** `builder-modal.test.js` resolved the CSS cascade for the wizard by extracting classes from `:not(.modal-builder):not(.modal-wiz)` as though they were positive classes.
The wizard does not carry `modal-builder`, so the matcher concluded "provably cannot match" and returned the correct answer for the wrong reason.
Deleting `:not(.modal-builder)` with the builder made the accident stop working and the matcher failed loudly, exactly as its own error message asks.
It now reads `:not()` and `>` properly. The file is renamed `wiz-takeover.test.js` rather than deleted, because the cascade fight it guards is still live for `#kingWizModal`.

**The title field lost a cascade fight that reads as fine in the file.** `.bld-name` is 0-1-0 and the base rule is `input[type=text]` at 0-1-1, so the page title rendered as a full-width bordered form box inside a 48px header.
Found by looking at the app, not by reading the CSS. The fix is the descendant form `.bld-head .bld-name`.
This is the same family as the `@media` trap in Tier 1: specificity is compared before source order, and the symptom is a rule that looks right and does nothing.

**The mobile row was 148px tall on the first cut** because name, qty and unit cost each took a grid row of their own.
A two-ingredient plate filled a 380px screen. The qty and the unit cost share a band now, measured back to about 104px.
