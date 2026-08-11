# HANDOVER - 170 (the plate builder's fill order)

**Branch:** `feature/builder-fill-order` · **Scope:** queue item 1, the builder fill order Max reported on 11 Aug 2026. **Ships `ezplate-v150`.**

## What changed

The ingredient search sits ABOVE `#lines`, so the docket grows downward from where you type.
The page says its order out loud: two numbered cards in the v3 card system, "1 Add ingredients" and "2 Name & save".
`#plateName` left the header for step 2, which is where the v69 order puts it, and the header shows the mock's static §3.7 title instead.
Category left the Publishing card and joined the naming step, sentence-cased rather than the app-wide `.f` label's caps.
One no-ingredients message instead of two, and it now points up rather than down.
`#saveBtn` stays the one header action.

Fixed on the way, found by measuring rather than reported: the ingredient dropdown was being CLIPPED.
`#drop` is `position:absolute` inside `.search-wrap` and `.bld-table` carried `overflow:hidden`, so at 1280 a 96px list painted 37px.
`.bld-step` deliberately does not clip, and its `h2` rounds its own top corners instead of relying on the card to trim them.

Deleted in the same change: `.bld-table`, `.bld-foot`, `.bld-search`, `.bld-name` with the specificity fight it needed, and `.bld-cardbody label.f`.

## Into CLAUDE.md

Nothing proposed.
The Tier 2 builder bullet is still accurate: the page is still a page, and this item changed order and labels inside it.

## New docs/QUEUE.md items

None.
Two findings went to `docs/MAINTENANCE.md` as C, both measured rather than guessed:
the Cost card paints an empty 16px bordered box on the phone for an unpublished plate, which is pre-existing since F7 and not this change;
and the plate name now appears three times on the page, which IS this change, because `#editTag` still spells it out under the field.

## New docs/PHONE.md items

**Build a plate from nothing on the phone, both themes, and see whether the order now matches your hand.**
That is the whole item and it is the thing an emulator cannot answer.
A failure looks like still reaching past the naming step to find the search, or the two step numbers reading as decoration rather than as sequence.

**The header is three rows tall at 380px** (back chevron, then the title, then Save on its own row).
It was the same height before, with an editable field where the title now is.
A failure is Save sitting far enough down that it reads as part of the page rather than the bar.

**The plate name in the header is now static text you cannot tap.**
Tapping it used to put a cursor in it.
A failure is reaching for it and nothing happening, with no sense of where the field went.

## Probe

**What did the queue item tell you to do that you would have done differently?**

Nothing it required, but it left one thing open that decided the shape of the batch, and the item's own diagnosis pulled against my answer.
It said `#saveBtn` may stay in the header or move to the naming step, while naming Save as one of the two end-of-flow controls a user meets first.
Save stays in the header.
On a twenty-line docket the naming step is below the fold, and §6's summary bar carries figures only with no button, so a step-2 Save would be reachable on a phone only by scrolling past every ingredient.
A header commit is not a form field, and the fill order is about fields.

I also reverted my own copy change mid-batch.
I had rewritten the search placeholder to "Search ingredients to add" so the new empty-state wording would land, then found the mock uses "Add an ingredient" verbatim.
§3 R1 gives the mock presentational conflicts, so the placeholder went back and only the empty state's direction word changed.

**What did you not propose because it was out of scope?**

`#editTag` reads "Editing: Fish & Chips" directly under a field containing "Fish & Chips", under a header saying it a third time.
Its useful content is saved-plate-versus-new-plate, not the name, but changing its copy was not in the item, so it is written down instead.

The empty Cost card on the phone is a different region of the screen from the one the item scoped, and the fix is a judgement call rather than a line.

## Surprises

**The dropdown clip.** It is on the screen this item is about, it has shipped since F7, and no spec caught it, because every spec asserted the dropdown's class or its option count and all of those were correct throughout.
The measurement that found it took one probe; reading the CSS would not have, and did not.

**The smoke test that failed was pinning the container, not the contract.**
v102's assertion was that `#builderHint` is visible on a fresh empty plate, written to guard a promise ("a brand-new cafe is offered its first ingredient") that this change keeps.
Moving the link into the empty state broke the assertion while keeping the promise.
It was rewritten to assert the promise plus the half v102 could not make, which is that there is exactly ONE such message, and both new assertions were checked against the pre-fix code first and did fail there.

**`.bld-table` and `.bld-card` were the same four declarations plus `overflow:hidden`.**
The item asked for the steps to use the v3 card system, and the ingredient table already was one, wearing a different name and one extra property that happened to be the bug.
