# HANDOVER - 277 (edit-modal-figures)

**Branch:** `fix/edit-modal-figures` · **Scope:** `docs/QUEUE.md` item 53, bullets U1 and U22. Shipped deploy version **ezplate-v226**.

## What changed

**The Edit-menu-item modal shows the figure it is asking you to change.** You reach it from a Menu row printing cost, suggested and a food-cost %, and the form then asked for a new sell price while showing none of them.
It now renders ingredient cost, the price, the food-cost % and the verdict word under the price field, in the target colour, recoloured as you type.
It RENDERS `menuMarginPreview` - the pure function the publish dialog already uses, wrapping `analyze()` - so this modal, the publish dialog and the builder's docket cannot disagree about one dish.
**And it refuses to price a plate it cannot fully cost:** "not costed", never a suggestion built from a total that is silently short. That is 222's rule, and it binds hardest here because this form's whole job is the price.

**Money inputs read `31.00` instead of `31`** - `#ed_price`, `#ig_price` and the builder's misc cost.

⚠️ **`padMoney` PADS AND NEVER ROUNDS, and the item's literal instruction would have written a wrong cost.**
It said "format to two decimals" and named `#ig_price`. That field holds a price PER KG / LITRE / UNIT - `perDisplayValue` multiplies the stored cost by 1000 for g and ml - and `saveIngEdit` reads it straight into `cost_per_base_unit`.
**Measured over the 384 priced rows of the real catalogue fixture: 44 carry more than two decimals, 7 are under a cent, and the smallest is $0.0056/kg**, which `toFixed(2)` turns into $0.01 - a 79% increase, on a stored cost.
A property test asserts `padMoney` changes no VALUE across every one of those rows, with a control that the fixture really does contain values `toFixed(2)` would move.

**The builder's misc input pads in the MARKUP**, not by a listener, because that row is rebuilt by `innerHTML`; a browser test proves the row survives its own keystrokes.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-277-edit-modal-figures.md`.

**No defect in the code. Two findings, and both are about THIS BATCH'S OWN COMMENTS claiming more than its tests establish.**

1. The misc-input test's comment said the rebuild-mid-typing hazard was "proved" safe. It proves the self-triggered path only. `renderPlate` is also called by `bootstrapSync`, which the `online` listener re-runs on reconnect. **Reproduced before correcting:** with the field focused mid-edit, calling `renderPlate()` replaces the node, moves `document.activeElement` off it, and re-renders from the stored value.
2. `renderEditMargin`'s comment said the modal "cannot disagree" with the Menu row. True of the `cost>0` family; `plateCostText` gates on `plateFullyCosted` instead, so a plate whose only line is a misc cost of exactly $0.00 reads "$0.00" in Plates and "not costed" here.

Both hazards **predate this batch** and neither is a regression. Both comments are corrected to say what is actually established, and both hazards are filed in `docs/MAINTENANCE.md` with their measurements and what would make each a B.

## Into CLAUDE.md

Nothing, and the candidate is named in the review rather than added. Both findings are one shape - **a comment that says a question is settled when the test beside it answers half of it** - which is close enough to the existing roster entry about a comment disposing of its own correct observation to be read off it. That file is short on purpose.

## New docs/QUEUE.md items

**98** - New product and Edit product ask for different things, so 10 kg for $65 reopens as 6.5 per kg with an empty pack. Split out of 53: it moves which field the stored cost derives from, and `ig_unit` is deliberately `disabled` so an edit can never re-base a product's costs. Money semantics, not layout.
**99** - item 53's last bullet said "the publish dialog and the Menu row print the same ratio at different precision. Align in the same pass." **There are at least three different quantities across six-plus consumers**, not one ratio at two sites: `menuMarginPreview().pct`, `analyze().absPct` and `avgFoodCostForScope()`. A batch acting on it as written would have changed six surfaces on the strength of two.

## New docs/PHONE.md items

None. Everything here is measurable in a browser and was measured in one.

## Probe

**What the item told me to do that I would have done differently.** Four of its pointers were wrong and one would have changed the fix. `#editModal` is at 1587, not the 1440 region; `openEditModal` does not exist (`openMenuEdit` does); `packToUnitCost` stopped being untouchable on 10 Sep 2026; and **`publishPlan` computes no figure at all** - it returns `{action, existingId, unlinked}` - while the bullet says "render it, do not recompute it" and credits it with the figures. A batch following that pointer would have found nothing to render and written its own arithmetic, which is the second copy this repo keeps paying for. All corrected in the consolidated entry.
And U22's instruction was wrong for one of the three fields it named, which is the measurement above.

**What I did not propose because it was out of scope.** Fixing the external-rebuild focus loss. It predates this change, and preserving focus across a docket rebuild is a change to how the docket renders rather than to what this item is about.

**Was any rule missing when I needed it.** No. `.claude/rules/app-data.md`'s rounding law - currency DISPLAYS round, stored costs stay exact - is the whole argument for padding over rounding, and it loaded with `js/app.js`.

## Surprises

**The item's own instruction was the dangerous part, not its stale line numbers.** The premise check found the wrong pointers; only measuring the real catalogue found that "format to two decimals" meant rounding a stored cost on 44 of 384 products.

**The review found nothing wrong with the code and two things wrong with my comments**, which is a better outcome than it sounds: both were claims that a question had been settled, sitting next to tests that answered half of it. A reader trusts the comment over the test.

**And my own mutation run lied to me once.** Checking whether the unlinked-dish guard was pinned, `perl -0pi` without `/g` replaced the FIRST matching occurrence in the file - a line in `dishesOverTarget`, hundreds of lines away - so the test stayed green and read as a coverage gap. `.claude/rules/tests.md` already warns that a hand-run mutation which changes too much reads as a false kill; this is the same trap with the edit landing somewhere else entirely. Re-run against the right occurrence, it goes red as it should.
