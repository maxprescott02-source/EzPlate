# HANDOVER - 241 (the food-cost sanity bound)

**Branch:** `fix/food-cost-bound` · **Scope:** queue items 18 and 23 (23 rode the same file). **Shipped `ezplate-v198`.**

## What changed

One plate with a wrong sell price can no longer rewrite every figure on the Dashboard.

`FOOD_COST_SANE_MAX` is **300** and is written once, in `js/app.js`, with its reason.
A plate whose food-cost ratio is over it is left out of the average, the over-target counts, the insight facts and the Dig-in ranking - and is **named** on its own "Check the price" card, with what it costs and what it sells for, which is enough to see the typo without opening anything.
The card carries no verdict colour on purpose: colour in this app is a reading against target, and a plate excluded for having no honest position against target must not appear to have one.

The trend chart's axis is built from the readings that are ON the scale, and a stored reading above 100% is clamped to the top with the caption saying so.
The By-menu sparklines got the same treatment.

Both tiles now say **which** average the headline is: "Average of plate food costs".

## Measured, and reproduced before anything was written

`avgFoodCostForScope` is the mean of per-plate ratios with no bound. Extracted and driven against the real cost path: **25.0% becomes 15012.5%** when one $0.01 plate joins one sane one.
On production on 8 September that was a headline of 354.4%, "324.4 pts over your target", a 380% chart axis that flattened every real week into the floor, and `api/insight` reporting "swings 20000-30000%" - every figure deterministically computed, correctly phrased, and about a typo.

## Review

The pre-push `code-review` agent, on Sonnet, with no sight of the item. `docs/reviews/REVIEW-241-food-cost-bound.md` has the report verbatim.
**Three findings, all real, all fixed before push.**

1. **`dishesOverTarget` - the SECOND over-target counter, and the one an invoice import reads.** Its toast says "N plates now over your target" straight after an import, which is exactly how a bad cost arrives here. Of the two counters, the first cut bounded the calm one and missed the one standing where the danger comes from.
2. **`mcmpSparkSeries`** had the chart's own unbounded-scale defect in a 54px glyph reading the same append-only series.
3. **`digData('plate')`'s light** - the row stays, the red dot goes.

Eleven tests added, and both functions are mutation targets now. Neither had ever been one, **which is why the bound could miss them both with the suite green.**

⚠️ **One of these had a comment pointing at it the whole time.** `kpiStripHtml` says *"dishesOverTarget is the insights' own epsilon-free count - left alone on purpose"*. True, written about the display epsilon, and silent about a bound that did not exist yet. Reading it as covering both is `CLAUDE.md`'s **"an exemption is scoped to the CLAIM that justified it"**, one guard over, by someone who had read that rule that morning.

## Into CLAUDE.md

One section, holding both of this batch's decisions because they are read together: **the headline average is a mean of per-plate ratios, and it is bounded at 300%.**
It states which average (the alternative is 1.4 points away on Max's real data), that the bound exists because a ratio that high is a wrong price rather than a bad margin, and the part that is not optional: **excluding a plate from a headline figure obliges you to name it.** The number itself is not restated there - grep the constant.

## New docs/QUEUE.md items

- **89 - a `price_history` point cannot be deleted or corrected from the app.** Split out of 18 deliberately: the bound is arithmetic and this is a new destructive write surface with its own confirm and RLS design. The 354.4 is still on production; the chart no longer chases it.

Items 18 and 23 are deleted from the queue and struck in the consolidated file.

## New docs/PHONE.md items

None. Driven at 380 and 1280 in both themes; fourteen assertions in `tests/visual/241-food-cost-bound.spec.js`.

## Probe

**What did the item tell you to do that you would have done differently?**

Two corrections and one split.

1. **The item's suggested label was "average of DISH food costs".** "dish" is a forbidden UI noun (Max, 25 Jul 2026) and `tests/terminology.test.js` went red within a minute. The object is a Plate. Worth recording because the wording came from an item, not from carelessness - the guard caught the queue, not the batch.
2. **The item's site list named four places and there are nine.** Four in the item, two more found by measuring (`kpiStripHtml`'s count and the Dig-in ranking, which read "Pineapple Fritter 30000.0%"), three more found by the review. That is `docs/QUEUE.md`'s own header rule about unmeasured enumerations, and it is the second batch running to hit it.
3. **The history-point deletion is queued, not built.** The item asks for both; they are different in kind, and one PR that both changes an average and adds a way to delete production history is not one review.

**What did you not propose because it was out of scope?**

`analyze()` is unbounded and always will be - it is the per-plate function, and on a plate's own screen the true 30000% is exactly what Max needs to see. The bound belongs to figures that AGGREGATE, and I did not extend it downwards.

## Surprises

- **Two defects were visible only in a browser, with the suite green and the mutation gate clean.** The clipped chart point drew as a gentle hump peaking near 31% with nothing saying it was off the scale - a smaller lie than the 380% axis it replaced, and the same kind. And `clipped` was computed and never read, which is its own tell.
- **Capping only the maximum was not enough.** With data at 22-26 and a stored 354.4, `dmx=100` still let the tick generator pad to 130 and left the real week in the bottom fifth of the plot. The fix is to build the domain from the in-range readings and clamp the rest onto it.
- **Adding a function to the mutation gate is asking it a question, and `kpiStripHtml` had eight answers waiting.** None was broken; none had ever been stated.
- **The bound retired two previously-killed mutants** in `computeInsights`: a guard that stopped a zero price now has a second layer catching the resulting Infinity, so the first is no longer observable. A new guard can silently un-pin an old assertion, which is roster entry 188's shape arriving through a shared code path rather than a shared counter.
