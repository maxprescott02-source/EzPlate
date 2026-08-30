# HANDOVER - 223 (the last two insight families publish their subject)

**Branch:** `fix/insight-subject-two-more` · **Scope:** `docs/QUEUE.md` item 7, "Two more insight families name a subject that is not in `facts`". **Shipped `ezplate-v183`.**

## What changed

`insVolatility` now publishes the volatile INGREDIENT it blames, and `insNearCluster` the plate names it prints.
Before this, a warmer rephrasing could blame a different ingredient, or send the owner to look at two plates that are not the ones near target, with every figure, symbol and direction identical.
Both keys are conditional: no ingredient known means no key, because the template falls back to the literal word "ingredient" and requiring that to survive every rewording is a false-reject generator.

**The item said one string key per family and nothing else changes, and that was not enough.**
`nameSequence` matched a name anywhere, including inside a longer word, and `insVolatility`'s own template contains "prices" and "swings".
So an ingredient named `Rice` was found inside p|rice|s and one named `Wings` inside s|wings, in the template's own prose, the spurious hit landed on both sides of the comparison, and the swap was still ACCEPTED with the key published.
Both measured on ordinary café ingredients.
A match must now START at a word boundary, in both validator copies.
The trailing edge stays open because English inflects at the end of a word and "tomatoes" must still match `Tomato`.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, on the branch diff, without the item.
**Two findings, both acted on.** `docs/reviews/REVIEW-223-insight-subject-two-more.md` has the report verbatim.

**Finding 1 was a real defect whose stated cause and stated novelty were both wrong**, and the corrections matter more than the finding because each one points at a different action.
`Rice` is still matched inside "Rice Noodles", so a rephrasing can name a different real product sharing a prefix. Reproduced exactly.
Closing the trailing edge, which the finding implies, fixes nothing: the character after `Rice` is a SPACE, which satisfies a trailing boundary exactly as it satisfies a leading one, and it rejects "Tomatoes".
It is also not new here: measured on `main`, `insCostBase` has published a bare name since 220 and "Beef" to "Beef Mince" is accepted there.
The comment's claim that the open trailing edge "costs nothing" WAS an overclaim and is fixed.
The gap is now pinned in `tests/insight-parity.test.js` the way the inverted-recommendation gap is, together with the two facts that rule out the wrong remedy, and filed in `docs/MAINTENANCE.md` beside its sibling.

**Finding 2 accepted and fixed.** The word-character range spanned U+00D7 and U+00F7, which are math symbols rather than letters.

## Into CLAUDE.md

**One rule added**, to the "never dismiss a finding because its stated cause is wrong" section.
That rule covers under-reacting and said nothing about over-reacting.
A finding carries up to three claims, the defect, the mechanism and the implied fix, and they fail independently: here the defect was real, the mechanism wrong, and the remedy actively harmful.
**Run the finding's repro, then run its FIX, before applying it**, and pin why when you decline it.

## New docs/QUEUE.md items

**None.** Item 7 is deleted.
Two limits found and filed as C in `docs/MAINTENANCE.md`, merged into one entry because they need the same fix: a name identical to a word in the template's boilerplate, and a name that is a prefix of a longer name.
The real fix is the builders publishing WHERE a name sits rather than only what it is, across all eight families, which is its own item and not a rider on this one.

## New docs/PHONE.md items

**None.** Nothing rendered changed: the deterministic templates are byte-identical and they are what the Dashboard shows.

## Probe

**What did the item tell you to do that you would have done differently?**
It said "One string key per subject and nothing else changes."
Doing only that leaves the defect measurably in place for any ingredient whose name sits inside a word of its own template, which is exactly the shape of the mistake 220 refused to make and which this item then reproduced.
The item also treats the two families as independent design questions, and they are, but the thing that made both fixes real was a third change neither of them names.

**What did you not propose because it was out of scope?**
Publishing `insPriceAnomaly`'s unit, which the boundary rule now makes safe. 220 withheld it because "ea" sits inside "dearest", and the leading boundary retires that hazard, but reversing another batch's deliberate call belongs in its own item with its own measurement.
Invalidating the phrasing cache. A phrasing accepted under the old rules stays in `localStorage` until the period rolls, which is one day.

## Surprises

**The mutation gate produced eight survivors the moment the two builders were listed as targets**, all of them in entry-guard logic this batch did not write.
That is the list's own stated failure mode arriving on schedule: a function that is not a target has never been asked the question.
Seven are killed with assertions; one is allowed with an arithmetic proof plus the condition that expires it.

**One of those assertions could only be written at a target of 0%,** because `Math.abs(cost/price - target)*100` can equal exactly 0.5 only when the subtraction is exact, and a percentage target is not a dyadic rational.
At a 30% target the nearest a cent-grid plate gets is 0.5000000000000004, which `<=` and `<` both reject, so the two operators cannot be told apart there at all.
This repo already records the identical trap at the NUM_EPS boundary, where (20, 20.005) could not distinguish the operators and (0, 0.005) could.

**The review's `npm test` count of 1788 is 1789 in the merged tree**, because its own findings added a test after it read the diff.
