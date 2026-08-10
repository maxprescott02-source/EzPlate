# HANDOVER - 148 (F4: Products rebuilt from the v3 mock)

**Branch:** `feature/f4-products` · **Scope:** queue item F4, the third screen of the v3 fold-in.
**Shipped `ezplate-v140`.**

## What changed

The Products pane is rebuilt from the mock: five columns on desktop (Product with its brand inline, Category, Supplier, Unit cost, Last change) and two-line rows on the phone with a "Category, Supplier" meta line and the unit cost stacked over the change pill.
The header bar, control row and footnote reuse F2's `.scr-head` and `.plib-*` rather than being rebuilt.

The `.ing-*` row class NAMES are kept, which is F3's ruling applied again.
Every one of them is emitted only by `renderIngredients`, verified across `index.html` and `js/app.js`, so there was no shared system to unpick.
`.ing-controls`, `.ing-filter` and `.menu-search` are NOT in that set, still dress the Menu screen, and were left alone.

Rulings recorded at the code.
R2 refuses the mock's "Pack price" heading because `dispPrice` renders a per-base-unit figure and the pack price is a different number living on the edit form; it ships as "Unit cost", the word Ingredients already uses for the same kind of figure.
R2 keeps "New product" over the mock's "Add product", since v45 renamed it app-wide and §7 forbids two labels for one intent.
R1 and §7 delete the `#prodFab` floating add: §6.1 puts the primary action in the screen header on both platforms, so a second control for the same intent was a duplicate.
R3 keeps Import invoice in the header, because the sidebar's Invoices entry is desktop-only and on a phone that button is the only route into the import flow.
R3 rehomes `#lastImport` rather than deleting it: the identical string already renders as `#lastImport2` inside the invoice modal, one tap from this screen's own Import button.
R2 keeps Products as a bottom-nav tab instead of the mock's More sub-screen, because a More screen is shell work that also moves three unconverted screens, and a "‹ More" chevron pointing at a screen that does not exist is the dead end §6 forbids.

`#ingCount`'s filtered count is not lost.
The header subtitle reads "412 products, 7 suppliers" unfiltered and "12 of 412 products" while a filter is on.

## Into CLAUDE.md

Nothing new proposed.
F3's `@media`-specificity rule is still waiting on Max and this batch is more evidence for it: every declaration written at both breakpoints here was given matching specificity deliberately, and the one place that was measured rather than assumed is recorded at the code.

## New docs/QUEUE.md items

- **The mobile More screen, and Products/Invoices/Settings/Account as sub-screens under it.** The last piece of §6 that no F-item owns; without it the §6.1 parity map is unmet by construction. Do after F10.
- **The sync pill covers the right edge of every converted screen's primary button.** Pre-existing since F2, measured at 1280 on all three converted screens; not a dead button, but a partly-blocked target while a write is in flight.

## New docs/PHONE.md items

Five, under a `v140` heading.
The two that matter: the floating "+" is gone and the header scrolls away on a 400-product list, and the row no longer shows the brand on a phone, which is exactly the trade that could make two similar products indistinguishable in the list.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

The item's one instruction about mobile was "sub-screen under More, back chevron '‹ More', never a dead end", and that could not be built inside this item.
It is not a small deviation: it is a whole navigation restructure that moves Invoices, Settings and Account, none of them converted, and F1b had already deferred the same work while pointing at F9.
The F-items inherited that line from the §6.1 parity map without anyone checking whether the app had a More screen to hang it on, and it does not.
What I would change is that the F-items should have carried the shell gap as its own item from the start, rather than each screen's item quietly asking for it.

**What did you not propose because it was out of scope?**

The row's `aria-label` problem F3 named is not on this screen, but the equivalent is: the five cells are announced as raw text with no column names, so a screen reader gets "DESSERTS — $24.78/kg steady" with nothing to attach it to. That wants one rule across every converted screen, not a per-screen patch.
Also left alone: the six search bars, the `.ing-empty` family (still dead, still on the dead-CSS sweep), and `.panel`, which now carries three per-screen exceptions and dresses one screen.

## Surprises

**The suite could not see a three-line row.**
On the phone the brand wrapped onto a line of its own whenever the name was long, so a row was two lines on short names and three on long ones, and every measurement I had written passed.
It took looking at a 380px screenshot.
The mock's own mobile fixture settled what to do: its Products sub is "Category, Supplier" and carries no brand at all.

**A test that could not fail, in a spec shipped two batches ago.**
`expect(outlineWidth > 0)` never proved a focus ring existed, because the UA default is 3px at `outline-style:none` and that is exactly what a row reports when `:focus-visible` does not match.
Found because the modality differed in the new spec and the offset came back 0.
Fixed in `v138-plates.spec.js` as well as here.
Its sibling is worth knowing: `:focus-visible` keys off the last input modality, so a spec that reaches a tab by clicking must press Tab before asserting a ring.

**An empty `@media` block broke a test's cascade walker.**
Deleting the last rule from a media query and leaving a comment made `builder-modal.test.js` lose track of which media query it was inside for the rest of the file, because comments are stripped and the block's `}` was then swallowed by the next rule's head.
It failed loudly this time, which is luck: the same slip could as easily make a rule that does not apply look like it does.
The parser now pops an empty block, verified against a planted one.

**One belt-and-braces rule was measured rather than assumed.**
F3's lesson says cancel a mobile `::before` at matching specificity on both selectors, and I did.
Planting the drop proved it changes nothing on screen today, because the leaked value is an empty string.
It is kept for the day that value becomes a real character, which is exactly how F3 earned the defect, and the comment now says that rather than claiming a live bug.
