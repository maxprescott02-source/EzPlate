# HANDOVER - 197 (invoice GST)

**Branch:** `fix/invoice-gst-all-paths` · **Scope:** `docs/QUEUE.md` item 0, filed the same day from an independent blind code audit. **Shipped `ezplate-v168`.**

## What changed
A GST-inclusive invoice now stores ex-GST prices on every path that can set one, not just the parser's.
The divisor lives in one named function, `invGstAdjust`, instead of an inline `/1.1` that only one of the paths had.
Two more decisions became real functions so a test can execute them rather than re-type them: `invReResolve` owns the convert-once condition behind the match dropdown, `invDerivePackQty` owns the shared-tax-basis rule for deriving a pack size.
`gemApplyReadings` converts every AI reading once at its boundary, and `api/_gemini.js` now asks for the price as printed, so the tax basis is the client's decision rather than the model's.

## Into CLAUDE.md
**Nothing, and that is a deliberate answer rather than an omission.**
This batch produced five defects across three reviews and every one of them is already covered by an existing rule.
The enumeration miss is "every enumeration in this project has come back different from the brief's guess".
Writing the fourth defect into the fix for the third is HANDOVER-147, quoted in the CSS section, and the general shape is already in Tier 1.
The pack-size test that re-typed `applyInvoice`'s arithmetic is roster entry 195 in miniature.
Adding a bullet for each would be treating the roster as a tally, which the roster's own header now forbids.
The one genuinely new thing is recorded where it can act: a `PRICE_JUMP` of 0.12 cannot see a 9.09% arithmetic error, and that sits at `invReResolve`'s own site where someone changing the condition will read it.

## New docs/QUEUE.md items
`0e` - the catalogue CSV importer never asks about GST, split out of item 0 rather than dropped; same defect, different door, but a different flow with its own UI and no `invGst` state, so mixing them made one PR into two unrelated changes to review.
Item 0's own body was rewritten twice: once when the stop condition fired, once when the third review caught it still reading `blocked` on a question Max had already answered.

## New docs/PHONE.md items
One, and it is the first entry filed as costs-money-if-wrong.
Import a GST-inclusive invoice, check a taught-pack line reads about 9% below the printed per-unit price, **change the match dropdown and confirm the price does not move**, and confirm the pack preview and the price field agree.
A failure looks like a price about 10% high (no conversion) or about 9% low and dropping each time the dropdown is touched (converted twice).
Neither raises a flag and both look plausible, which is the reason the check exists.

## Probe
**What did the queue item tell you to do that you would have done differently?**
It named the fix site, and the fix site was forbidden.
`buildInvRows`, `packPriceOf`, `applySupplierMemory`, `derivePackPrice` and `resolveMatchedPrice` are all inside the protected parser region, and the item's own sentence pointed at `resolveMatchedPrice`, which `CLAUDE.md` forbids twice over.
I filed that item an hour before running it, off the audit's wording, without checking the region.
That is this file's own "a queued item's approval does not expire and its facts do", at the shortest interval it has ever been observed.
The item also warned in writing about `applyInvoice`'s `pack/entered` fallback breaking if the entered price changed basis, and I shipped a commit that did exactly that.
Writing the warning down did not stop it.

**What did you not propose because it was out of scope?**
The same pack-to-unit-price arithmetic is written out four times: `derivePackPrice`, `applySupplierMemory`, the pack-teach recompute, and `invPackPreviewText`.
Four copies of one formula is why the GST divisor could be missing from three of them, and extracting it is the real root cause fix.
Two of the four are inside the protected region, so it needs Max's yes and a batch of its own, and it is not filed as an item because I have not measured whether the four are genuinely identical or merely similar.
Also not proposed: making `PRICE_JUMP` sensitive to arithmetic errors rather than supplier movement.
It is tuned for a real purpose and widening it would flag ordinary trading.

## Surprises
The three reviews found five defects and I introduced three of them, all while fixing the previous one.
The severity did not decay the way the six-PRs-from-one-mistake story predicts: review 2's finding was worse than review 1's, because a 9.09% error sits under the 12% flag threshold where the original 10% error sat above it.
A guard tuned for one failure mode was structurally blind to a smaller one.

The mutation gate earned its keep three times in one batch and only once in the way it is documented to.
It found a real survivor in `buildInvRows`, it crashed loudly on an allowance schema I had guessed at rather than accepting it, and adding two freshly extracted functions as targets immediately exposed four unpinned guards in one of them.
An extracted function inherits responsibility for its own edges, and "it was inline before" carries none of that across.

`tests/invoice-gate.test.js` failed rather than passing quietly when `gemApplyReadings` gained a dependency, which is the opposite of this repo's most common test failure and worth recording as such.

I also read `MUTATE EXIT=0` off a `tail` pipeline when the gate had exited 1.
`CLAUDE.md` warns about exactly that in the sentence above the one I was following.
