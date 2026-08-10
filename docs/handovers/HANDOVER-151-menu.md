# HANDOVER - 151 (F5, the Menu screen)

**Branch:** `feature/f5-menu-v3` (PR #130, squashed to `ab2ca6d`) · **Scope:** the `docs/QUEUE.md` item "F5 - Menu (desktop §3.2 + mobile §6, one item)".
**Deploy version: `ezplate-v142`.** Verified live on `https://scoopyscosting.vercel.app/sw.js`.

## What changed

The Menu screen is rebuilt from the v3 mock rather than restyled: `.scr-head` header bar, the mock's switcher-and-search row, a five-column grid list with uppercase group rows, a footnote, and two-line rows on the phone.
Delete moved out from beside the menu switcher to the bottom of the screen, labelled "Delete this menu".
Zero menus stopped saying "Nothing on this menu yet" about a menu that does not exist; it has its own state and a New-menu button, and every control that would do nothing there is stood down.
The column headings took the mock's words: "Suggested at 40%" and "Price".
Deleted in the same change: the whole `.atable` table system, the v49/v52 panel skeleton (`.panel-actions`, `.panel-sub`, `.panel-meta`, `.an-head`, `.an-controls`), `.ing-controls`/`.ing-filter`, `.mi-act`/`.mi-btn`, and `menuActions()`.
`layout-consistency.spec.js`'s cross-screen comparison came back, because four screens now share one header shape - which is what that file predicted in writing when F4 retired it.

## Into CLAUDE.md

Nothing proposed.
The two rules this batch leaned on hardest are already there and both earned their keep again: the `@media` specificity trap (the pair of `content:none` cancels is now measured in both directions by a spec) and "a stub that mirrors a real function must mirror its CONTRACT".

## New docs/QUEUE.md items

- **The converted screens' column bands are `aria-hidden`, so their figures are announced unlabelled.** A Menu row reads "Roast $3.00 $10.00 $7.00 food cost 42.9% - well over your target"; three of those figures have no label. All four converted screens do it, F2 set the pattern, so it is one decision for four screens and not an F5 fix.
- **Control boundaries sit near 1.4:1, in two places now, and it is ONE question.** Folded into the existing toggle-off-track bullet rather than filed separately. Delete's border measures 1.40 light and 1.38 dark; its red text measures 5.43 and 5.92, so the border reinforces rather than identifies.
- The Menu screen was added to the existing "one action in a mobile screen header" item, and the F-item preamble was corrected: three of the five classes F4 said F5 would empty did not empty.

## New docs/PHONE.md items

- **Delete has moved to the bottom of the screen.** Failure looks like Max hunting for it, or finding it by accident while scrolling a long menu.
- **The row's second line now reads "$3.00 cost, suggested $10.00"** where it used to say "$3.00 cost · $9.00 on menu". Failure looks like the menu price being the one he actually wanted there.
- **Amber and red verdict pills wrap onto two lines on a phone**, so those rows are taller than green ones. Deliberate; the alternative was truncating the suggested price beside them. Failure looks like a mostly-red menu reading as ragged.
- **The menu name left the screen header** for the switcher control below it. Failure looks like not knowing which menu is on screen at a glance.
- **The mobile header still carries two actions.** Failure looks like it WRAPPING to two lines under iOS text scaling, which a spec at 380px cannot see.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

The item says "not-costed row muted with 'cost it' pill", and I did not ship the pill.
The item itself allows this ("wire it honestly to the F2/F7 row-click route or keep the honest muted dash - never a control that does nothing"), so this is the item working rather than the item being wrong, but it is worth saying that the mock's own design loses here for the second time and will keep losing until F7 exists.

The item's mobile line - "Switch control in the header" - I did not follow literally, and this is the one place I would flag.
The mobile mock's header is menu name + food-cost pill + Switch, with no create actions at all, because in the mock's IA you add plates to a menu from the builder's Publishing card. That card is F7. Following the item literally today would have stranded "Existing plate" and "New menu" with nowhere to go, so the mock's trio went one row lower and `.scr-head` kept the actions. If F7 does rehome publishing, this decision should be revisited rather than inherited.

**What did you not propose because it was out of scope?**

The `aria-hidden` band, which I queued instead of fixing, because fixing it on one screen would have given four identical-looking tables two accessibility idioms.

The `.plib-x` clear button still shows on an empty search field, now on a sixth search bar. It is already queued and I did not widen that item.

I also did not touch `.legacy`. Protocol §2 says the old stylesheet should be scoped to a `.legacy` wrapper on unconverted screens, with the stylesheet dying when it has no children left. This repo has never implemented that mechanism - every F-item has instead deleted its screen's rules by hand, which has worked, but it means the protocol's stated safety net does not exist and nobody has said so out loud. Worth a decision before F6 rather than after F10.

## Surprises

**`.atable` was never shared with the invoice review, and the CSS said it was.**
Two comments described `.atable-wrap` as shared with the invoice modal and treated the whole family as fragile. Only the WRAP is shared: the invoice table is `<table class="invtable">`, with no `atable` class, so every `.atable*` rule was Menu-only and every `:not(.invtable)` guard in them was inert. That made the deletion far safer than it looked going in, and it is worth knowing that a "fragile, shared" label had drifted onto the wrong element.

**Three defects in this batch were invisible to reading and to a green suite, and all three were caught by the same new spec.**
A CSS hex escape (`\00a0cost` is one code point plus "ost", so the phone rendered `$2.00਌ost,`); a truncated *price* in the mobile meta line; and both "dark" screenshots rendering light because the theme key was guessed as `cafeDB_theme` when it is `cafeCost_theme`. The last one is the one to remember: a screenshot cannot fail, so a mis-keyed preference produces a perfectly good light-mode PNG under a filename that says dark, and it would have been filed as evidence that dark mode works. That spec now asserts `data-theme` before it saves the image.

**Two of my own measurements were wrong before they were right**, both while trying to assert "the header is one row": dividing height by a line height reads 2 on a one-row header (44px button plus 24px padding), and grouping children by their `top` reads 4, because the header centres children of four different heights. Only the centre line is shared by everything on one row. The general shape is the one already in `CLAUDE.md` - measure, do not reason - but it applies to the measurement itself, not just to the thing measured.
