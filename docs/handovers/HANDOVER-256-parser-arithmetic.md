# HANDOVER - 256 (parser arithmetic)

**Branch:** `fix/parser-arithmetic` · **Scope:** consolidated item 17, unblocked 10 Sep 2026 by Max's *"its lifted"*. Shipped `ezplate-v211`.

## What changed

The invoice parser prices a line by its arithmetic instead of by repetition and position.
`lineColumns` finds the quantity, unit-price and extension columns by looking for q x P = T; when nothing adds up the row refuses rather than pricing from the line total.
A kilogram or litre quantity column now prices per kilogram or litre (D2), a multiplier after the weight counts (D3), a wrapped description is spliced back into the name (D4), a line carrying any negative amount refuses (D5), a receipt's trailing `*` is no longer a multiplier (D6), a dozen beats a weight (D7), "GST (included)" reads as inclusive (D8), a candidate tie breaks on how much of the line the product explains (D9), and a letterhead sharing its line with the heading is read while "Credit Terms: 7 Days" is not (D10).

Measured on the fourteen corpus layouts, before and after: **30 right / 31 silent-wrong / 2 unflagged leaks** becomes **63 right / 2 silent-wrong / 0 unflagged leaks**.
Against the cafe's own 393-product catalogue, pre-ticked-wrong goes **3 to 0**.
The two residuals are the ones the audit named and are allowed by name AND by line, so a new one cannot hide behind an old one.

`tests/parser-corpus/run.js` and its fixtures moved out of `spike/` into `npm test`.
That corpus is what replaces "never edit the region", and it was proved to go RED against the shipped parser and green against the fix.

`invFixRow`'s 237 re-base is retired: once the parser reads the pack off the NAME, that branch compared a value with itself.
The identity is pinned, so a future change that reintroduces a raw-line read goes red instead of quietly needing a branch that is gone.

## Review

`code-review` agent, Sonnet against Opus, on the branch diff with no sight of the item or the audit.
Artifact: `docs/reviews/REVIEW-256-parser-arithmetic.md`, `Reviewed-commit: 217c394`.
**Two findings, both real, both reproduced against the real extracted functions before anything was changed, both fixed.**

**Finding 1, critical.** The credit refusal was scoped to `parsePdfLine`.
`resolveMatchedPrice` and `applySupplierMemory` re-derive from `row.raw` through `packPriceOf`, which reads the digits and drops the sign, so the real credit page's `-2.00 -2.00 ... $-59.00` gave `firstPairPrice` 2 and a taught 12kg pack turned the refusal into $0.1667/kg with `needManual:false`, on a matched product.
`buildInvRows` was dropping `basis`, so the refusal existed only inside one function call.
`basis` is carried onto the row now and one predicate guards the two FUNCTIONS rather than their call sites, because `resolveMatchedPrice` has two callers and the second is the user picking a product by hand.

**Running that repro found a bigger defect the review did not report.**
The same probe showed a PURCHASE with a taught pack coming back at $0.25/kg against a truth of $2.4583.
`packPriceOf` is three lines and both of them were D1, on the path that OUTRANKS the parser, so this batch would have shipped "the parser prices by arithmetic" while every product Max has taught was still priced by the defect.
It asks `lineColumns` now, the same function the parser asks, so the two cannot disagree.
Measured on production: 23 of 431 products carry a taught pack, plus 7 remembered supplier phrases.

**Finding 2.** `lineColumns`' arithmetic tolerance scaled with the QUANTITY, so at q=200 it had $2 of slack and preferred $5.01 over $5.00, and at q=300 it confirmed a total 50c off an exact multiple.
The remedy was measured rather than accepted: all four candidate tolerances score the corpus identically, so the loose one was never earning anything and only the two repro lines could tell them apart.
Tied to the price now.

Findings 3 and 4 were the agent independently verifying the `invFixRow` deletion and declining to raise the `invSupplierDetect` skips as findings.
Both are recorded in the artifact; no action.

⚠️ **I nearly dismissed half of finding 1 on a bad reproduction.**
The first `applySupplierMemory` probe passed `{pack_qty, pack_unit}` where that function takes `{qty, unit}`, so it looked clean and the finding looked half wrong.
That is thirty seconds from being written off, and it is exactly what `CLAUDE.md`'s rule about a finding's three separable claims exists to stop.

## Into CLAUDE.md

Three edits, made under standing authority.

The parser-region section gains what replaced the protection: the corpus test, what a batch touching the region owes its handover (the two `run.js` numbers, before and after), and the honest limit that the fourteen layouts are INVENTED and a green corpus never means the real invoices are right.
The exemption-scope section's opening clause is corrected: `resolveMatchedPrice` **was** on the never-touch list, and the constraint that forced the guard onto the row is gone, but the shape is still right for a better reason.
No new rule was added for the credit defect: it is the existing exemption-scope trap read backwards, and `CLAUDE.md` says to stop writing about a rule that already exists.

## New docs/QUEUE.md items

**None in `docs/QUEUE.md`.** Item 17 is deleted from it and struck in the consolidated file.

**Consolidated item 92, new, C.** Three of the audit's eight mutation targets did not land: `parsePdfLine`, `lineColumns` and `rankCandidates` report **16, 11 and 7 survivors**, counted rather than estimated.
The gate fails on any survivor with no written allowance, so a half-added target cannot ship, and resolving 34 is a body of work the size of this batch's tests again.
Graded C because `CLAUDE.md`'s tier test says a missing test is C by construction and item 81 is the standing precedent; it says **Do with: 81** and 81 now says **Do with: 92**.

Two `docs/MAINTENANCE.md` entries, both C.
A credit row refuses correctly and explains itself wrongly: it says "unit mismatch" when the reason is that it is a refund, and `basis.kind` already carries the reason.
And the fix stops NEW wrong prices without correcting the ones already stored, bounded by measurement on production.

Struck as done: the eval-harness entry and the parser-region-has-no-guard entry, both of which this batch built the mechanism for.

## New docs/PHONE.md items

One, and it is deliberately the OPPOSITE of the v194/v195 checks above it.
Those asked Max to confirm nothing moved; this one changes nearly every line from one supplier and "the numbers are different" is the PASS.
Both suppliers, control first: the foodservice distributor's invoice must be unchanged, and the poultry supplier's rows must match the Item Price column on the paper.
**Failure looks like** a ticked row whose price is not the number printed on the invoice, or any change at all on the control supplier.
It also names the four new behaviours that are not faults, and warns that the first corrected import will show as a price jump on those products' history rather than a rise.

## Probe

**What did the item tell you to do that you would have done differently?**
It said to add all eight mutation targets, and I added five.
That is a real disagreement rather than a shortcut: the item's own author could not have known the survivor count, and 34 unresolved survivors cannot ship past a gate that fails on them.
The split is recorded in `tests/mutation/targets.js` at the site, with the counts, so it cannot read as an oversight.

I would also have written the item differently in one place.
It says the corpus "replaces the protection", and after building it I think that overstates what a synthetic corpus can do: it proves no invented layout regressed and it cannot see the six real invoices at all, because their text cannot be committed to a public repo.
The `--products` run is the closest thing to real data the repo holds and it is a catalogue, not an invoice.
That limit is now written into `CLAUDE.md` beside the claim.

**What did you not propose because it was out of scope?**
Correcting the prices already stored from wrong parses.
It is a production data rewrite and therefore Max's, and I do not think a heal is the right shape even with his go: there is no way to tell from a stored number whether it came from a bad parse or from him typing it, so a script would be guessing at exactly the values it claims to fix.
The honest version is a report he reads, and it is filed as such.

D12, sorting a line's items by x, was left alone because the audit says to do it only with the real corpus in place.

## Surprises

**The audit's own patch did not carry what the audit's prose claimed.**
Its D4 comment says the continuation stop-list carries "no summary word" and its test spec asks for a summary line to be refused, and neither `INV_CONT_STOP` nor `INV_EXCLUDE` contained one.
So "Summary of Supplies" — the heading that directly follows the last table row on page 2 of a real invoice, which is exactly where a continuation is looked for — was being spliced onto that row's product name.
Found by writing the test the audit asked for, not by reading the patch.
That is `CLAUDE.md`'s citation trap arriving in a patch rather than a comment: the prose was right about the intent and nothing checked that the code carried it.

**A test went red for a reason that was not a defect.**
`tests/queue-routing.test.js` asserted at least three consolidated items in the working set.
The working set is MEANT to drain — the refill step exists to produce exactly that — so shipping item 17 took it from three to two and the guard fired with nothing wrong.
The floor now counts items at all, which is what it meant.

**The gate caught two second-order effects of the fix, and the second one mattered.**
Adding `!credit &&` to two guards rewrote those lines, so the two written allowances keyed to them came back STALE; both were re-anchored rather than deleted, since the mutants and the enumerations behind them are unchanged.
Nothing in the diff of `js/app.js` says "two allowances in another file just stopped matching".
The second was a real survivor IN the fix: mutating `buildInvRows`' `basis:r.basis||null` makes `row.basis` always null, so the credit guard never fires and the defect comes straight back, **and all four new credit tests still passed** because every one of them hands the re-pricers a row straight out of `parsePdfLine`.
Only a test that drives the ASSEMBLY can see an assembly defect, which is the reason `buildInvRows` is a target at all.
A fifth case now runs the real chain end to end.
**And a third:** the one-line `packPriceOf` fix both created an unpinned branch and stopped an EXISTING mutant being killed, because `lineColumns` now short-circuits past the old ternary on nearly every fixture in the suite.
The fallback assertion written for it used `60.00 60.00 60.00`, where the repeated pair and the line total are the same number, so it could not fail either way.
That is roster 184(b) in a test written that hour by someone who had just read the roster, and only the gate could see it.

**`packPriceOf` being three lines was the surprise that mattered most.**
The audit filed it as a follow-up and the fix is one line, and without it the headline claim of this whole batch would have been true of the parser and false of the path that outranks it.
The thing that found it was running the review's repro and looking at the line NEXT to the one the finding named.
