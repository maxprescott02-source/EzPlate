# HANDOVER - 237 (the pack's own weight prices the row)

**Branch:** `fix/trailing-net-weight` · **Scope:** `docs/QUEUE.md` item 12b, which batch 236's own pre-push review found while fixing item 12.
**Shipped `ezplate-v195`.**

## What changed
`packWeight` takes the LAST weight token in whatever string it is handed and `parsePdfLine` hands it the WHOLE RAW LINE, so an ordinary trailing net-weight column became the pack's unit weight: `2 x 6 x 12.0kg = 144kg` and **$0.42/kg where the invoice says $10.00**, `needManual:false`, pre-ticked.
The correction recovers the parser's OWN price choice rather than re-deciding it - whatever money it picked, `packPrice = unitPrice * wRaw`, so re-basing onto the pack's weight is a ratio and nothing here needs to know whether it took the pair or the line total.
It never writes `row.unit`: a same-category correction is arithmetic on one basis and safe silently, while a different category means the unit is wrong too and a silent ml-to-g flip is the change `CLAUDE.md` records as unnoticeable, so that case and a name with no weight at all are flagged for a human instead.
236's `invQtyFirstRebase` and this are now ONE function, `invFixRow`, because the basis correction is only valid before the fold undo and a comment saying so is not a mechanism.
Both halves read the pack weight through `invPackWeight`, so the price, the guard and the arithmetic cannot ask different questions.
Inert on explicit-rate lines, on lines whose weight sits inside the name, and on lines with no leading quantity - the two real Bidfood fixtures measure a ratio of exactly 1.

## Review
Sonnet, diff only, no brief: 1 critical, 1 major, 2 supporting - all taken, and the critical one was reproduced before being acted on.
**The critical finding is the same rule broken in a new place.** My entry gate keyed off `row.unit`, but `unit` does not say which parser BRANCH produced the price: `explicitUnitPrice` fires first, returns kg/L, and owes nothing to any pack weight - so a real weighed-goods line, `PORK BELLY BONELESS 3.1kg $14.90/kg 46.19 2.8kg`, was silently re-priced to **$13.46 and pre-ticked**.
The fix's target class and the class it broke were the same class: variable-weight meat and produce.
The remedy is to ASK the branch with the parser's own function - `if(explicitUnitPrice(row.raw)) return row;` - which is `invPackWeight`'s rule one level up, and the rule 236's review had already caught this batch breaking once.
The same line resolved the major finding (correct rows being flagged for a manual step they never needed).
Its fourth finding is why both got through: the file had **zero** fixtures reaching the explicit-rate branch, so no assertion in it could have failed - the code path was never executed. Both measured lines are now fixtures, placed first, and deleting the new guard turns exactly those two red.
`docs/reviews/REVIEW-237-trailing-net-weight.md` holds all of it verbatim; `Reviewed-commit: b92fd3b`.

## Into CLAUDE.md
Nothing new, and that is the finding rather than the absence of one.
Both of this batch's serious defects, and both of 236's, are the SAME existing rule - *a guard that recomputes the write's answer is a stub of it* - and each time it wore a different disguise: the wrong argument to the right function, then the right function never asked at all.
The rule does not need rewriting; what it needed was applying, and the pre-push review is what applied it. Adding a fourth restatement would dilute a rule that is already correct.

## New docs/QUEUE.md items
None. 12b is deleted - finished.
The queue's top is now item 13 (café A's settings and supplier memory surviving into café B), still an unmeasured audit claim.

## New docs/PHONE.md items
The v194 entry is extended rather than duplicated, and it is now worth doing even if the v194 check was already done: 237 widened what it covers, and the review found the first cut breaking **explicitly rated** lines (`$14.90/kg` with a delivered-weight column), which is the shape weighed goods actually use.
The fixtures are invented lines; Max's are real. Pay particular attention to any line priced per kg with a weight column.

## Probe
What the item told me to do that I did differently: it said the hard half was "deciding which weight token is the PACK and which is a total", implying a heuristic.
It is not a heuristic - `parsePdfLine` already slices the name at the first money value, so the pack description is exactly the name and the money columns are exactly what it excludes. Naming that made the fix a ratio rather than a guess.
The item also said 236 "already refuses to touch such a line, so the detection half exists"; that refusal was deleted, because once the basis is corrected there is nothing to refuse.
What I did not propose because it was out of scope: anything about `moneyMatches` losing a leading minus sign on credit lines (pre-existing, inside the protected region, and the reviewer confirmed it is untouched by this diff).

## Surprises
- A test was **deleted by accident** while merging the two functions - a block edit whose range ran one test too far - and nothing in the suite noticed, because a test that no longer exists looks exactly like a test that passes. The mutation gate caught it, reporting the entry guard as survived. That is the strongest argument this repo has yet produced for the gate covering new code the hour it is written.
- Two consecutive reviews, on two consecutive batches, found the same underlying rule broken in two different ways in code written that hour by someone who had just read the rule.
- The reviewer chased a plausible comma-thousands bug (`$12,345.00` injecting spurious pack factors), measured it, and found the arithmetic self-cancelling. Recorded in the artifact because it looked like a bug and measurement disproved it.
