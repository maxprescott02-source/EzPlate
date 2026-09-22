# HANDOVER - 282 (unitless-price)

**Branch:** `fix/102-unitless-price` · **Scope:** queue item 102 [A], a product with no recorded unit stored its price 1000x wrong. **Shipped `ezplate-v229`.**

## What changed

**A product with no recorded unit can be given one, and cannot be priced until it has one.**
`saveIngEdit` derived its unit from the stored product with a ternary closing `: 'kg'`, so an unrecognised `base_unit` became a kilo price and `invUnitToBase('kg')` divided by 1000.
Typing `1.41` for a $1.41 container stored `cost_per_base_unit: 0.00141, base_unit:'g'` - $1.41 per KILO, with a weight unit invented for an item sold by count.

`igStoredUnitType` returns **null** for anything it does not recognise, and the two callers each say what they do with that.
The Edit form unlocks the unit control on exactly those products; the save refuses rather than guessing and writes nothing.

⚠️ **Why unlocking is safe here is a property of the CODE, not of today's data**, and that is the argument v54 needs: with `base_unit` null, `unitNoun` returns `''`, so no quantity was ever entered against a stated unit, and `cpbu` is null, so `lineCost` returns null for every line referencing it.
There is nothing to re-mean. Setting the unit records it for the first time.

280's *"Enter the price per unit directly"* is now the route into the defect, so the pack read-out says *"Choose a unit type above first."*

**The premise-check found the item short by one:** `openIngEdit` carried the identical null-to-kg ternary, feeding the display-only disabled select, so every unitless product was labelled "per kg" on screen.

Checks: `npm test` 2437, Playwright 563, smoke green, full gate 1491 mutants / 1436 killed / 55 survived all with written allowances.
New tests proved red against three hand-injected mutations including the money test. Driven in Chromium at 380 and 1280, both themes.

## Review

The `code-review` agent on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-282-unitless-price.md`.

**ONE MAJOR FINDING, reproduced and queued as item 103 [A] rather than folded in.**
It is not a defect in this diff: the invoice-apply path writes `base_unit` onto an unrecorded-unit product with no gate, because `unitCatCategory(null)` is null and `resolveMatchedPrice`'s mismatch guard short-circuits on a falsy `baseCat`.
I ran its repro against the real functions, and **the control is what makes it a finding**: the guard fires loudly on every product that HAS a unit and is blind only where the unit is unknown. Six cases measured, written into item 103.
Not folded in because it lands in `resolveMatchedPrice`, which `.claude/rules/invoice.md` puts under mandatory regression tests and a corpus run in both directions.

Its two minor findings: one was `/batch` step 10, done in this commit; the other an uncommitted test change, now committed. Its analysis of that change was right, including that it exposed no bug.

## Into CLAUDE.md

New section in `.claude/rules/tests.md`: **`tests/fixtures/base-products.json` is pre-migration data and is the only catalogue any test here can run.** Standing authority.

Also standing authority: `docs/MAINTENANCE.md`'s item-57 entry said *"filed rather than ridden"* and *"ride it with whichever batch next opens `openIngEdit`"* in one paragraph, and 282 was the first batch to reach that condition.
The ride condition is **replaced, not deleted** - it rides a batch already changing a write path on one of those three forms and already owing a corpus run. **I skipped it under that rule**, which the rule now requires be said here.

## New docs/QUEUE.md items

**103 [A]** - the invoice path writes a unit onto a product that has none, pre-ticked, with no gate. Routed into **G2**, which batch 261 recorded as drained; a review finding can reopen a drained group and this one did.

## New docs/PHONE.md items

None. A select being enabled or disabled, and a form refusing, are both settled by a browser agent, and none of the five phone-only conditions applies.

## Probe

**What the item told me to do that I would have done differently.** It offered two options and I took the first, letting the unit be SET when it is null.
Refusing the price field would have left eight production products permanently unpriceable: the unit is create-only, so the only other route is delete-and-recreate, which loses the id and every reference to it.

**What I did not propose because it was out of scope.** `#ig_pricePer` does not exist and two lines write into it, which matters more now the unit is settable - but which way to close it is a copy decision on a form Max uses. Filed, with `igUnitWord`'s unrecognised-to-"unit" fall-through and the `saveIngEdit` mutation gap.

**Was any rule missing.** No, and one arrived exactly when it should have and I broke it anyway.
`.claude/rules/app-guards.md` loaded with `js/app.js`, and its *"extract the decision the write makes and have both call it"* is precisely what my first `igEffectiveBase` violated: it asked `if(storedBaseUnit)` where the write asked `igStoredUnitType(...)`.
**A browser caught it, not the rule.** Worth recording against the split's only feedback question: the rule reaching the batch is not the same as the batch applying it.

## Surprises

**The committed fixture and production hold different spellings of the same state.**
`tests/fixtures/base-products.json` carries `base_unit:"unknown"` on four rows and `"dim"` on four more; production carries NULL on the same eight, because the table's CHECK forbids the strings and the 20260801 backfill coerced them.
**A fix written for `null` alone is correct about production and green in every test in this repo**, because the browser specs can only ever serve the fixture. That is the new rules section.

**Adding `saveIngEdit` as a mutation target found `logHistory(_prodWrite)` deletable with the whole suite green** - the one call deciding whether a product price change is ever recorded in `ing_price_history`.
Two of the three survivors are pinned now. Eleven more survive in branches this item has no business claiming, so the target is backed out and the measured list filed rather than given eleven allowances: an allowance says *"this mutant cannot matter"*, not *"I did not test this"*.
