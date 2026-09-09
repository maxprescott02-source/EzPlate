# REVIEW - 241 (the food-cost sanity bound)

Reviewed-commit: 0d9832eccaf27e7f5f7f19a62b11a5da75dccaed

**Agent:** the pre-push `code-review` agent, forced onto **Sonnet** (the batch ran on Opus), given the branch diff against `main` and nothing about the queue item.
**Outcome:** three findings, all real, all fixed on the branch before push. Two of them are places the bound did not reach and one is a colour.

---

## The report, verbatim

I have enough. Here are my findings.

## Findings

**1. `dishesOverTarget()` (js/app.js:4230-4235) was not given the same sanity bound — major, and it is exactly the code path that caused the original incident.**

This function is a second, independent implementation of "how many plates are over target," used only by the invoice-import flow (`js/app.js:12402` `overBefore=dishesOverTarget()`, `:12510` `overAfter=dishesOverTarget()`) to drive the post-import corner toast in `showImportSummary` (`js/app.js:12564-12566`): `"⚠ N plates now over 30% target"`. It calls `analyze(d.cost, m.price)` (js/app.js:2946), which has no bound of any kind — `shortfall` can be arbitrarily large and still resolves to `state:'under'`/`light:'red'`.

The diff carefully added `FOOD_COST_SANE_MAX` gating to `dishRatios`, `digData('foodcost')`, `computeInsights`, and `kpiStripHtml` — every other place that counts or averages "over target" — but not to this one. Since this toast fires immediately after an invoice import, and the production incident that motivated this whole PR was itself caused by a bad price reaching the app (a $0.01 typo), this is precisely the surface most likely to hit the bug again: import an invoice with one garbled line that drives a plate's cost to 30000%, and the user gets "⚠ 1 plate now over 30% target," conflating a data-entry error with a real margin problem — the exact failure this PR's own commit message says it exists to prevent.

How to verify: `grep -n "dishesOverTarget" js/app.js` shows it defined once and called only at the two invoice-summary sites; it references `FOOD_COST_SANE_MAX` nowhere. No test in the diff (`tests/food-cost-bound.test.js`, `tests/plate-cost.test.js`) exercises `dishesOverTarget` against the bound.

Confidence: high — read directly from the call sites and the toast copy.

**2. `mcmpSparkSeries` (js/app.js:7452-7468), the By-menu sparklines, has the identical unbounded min/max scaling defect the PR just fixed in `trendChart` — major, same mechanism, left untouched.**

`trendChart` used to do `dmn=Math.min.apply(null,dvals), dmx=Math.max.apply(null,dvals)` over raw history values, and the PR's own comment explains why that's dangerous: a single stored 354.4 drags the axis so far that real 20-35% readings flatten into the bottom of the plot. `mcmpSparkSeries` does the exact same thing — `var mn=Math.min.apply(null,vs), mx=Math.max.apply(null,vs);` over `pts.slice(-12)` raw values from `menuHistory`/`priceHistory` — with no cap and no clamp. It's called from `mcmpSparkHtml` (js/app.js:7445), which is rendered in the live By-menu comparison rows (`js/app.js:7590`, inside `renderDashboard`).

Since a corrupted point like production's 354.4 is permanent (append-only, per this PR's own reasoning), any per-menu sparkline whose last 12 points include it will still show the same flattened, unreadable line the PR describes fixing in the main chart — just in a different widget reading the same data.

How to verify: read `mcmpSparkSeries`, note it has no `CAP`/clamp; confirm no test in the diff (`tests/food-cost-bound.test.js`, `tests/visual/241-food-cost-bound.spec.js`) references `mcmpSpark`.

Confidence: high on the mechanism (it's the same code shape the PR fixed elsewhere); the severity depends on whether a corrupted point is currently within any menu's last 12 logged points, which I haven't checked against real data.

**3. Minor: `digData('plate')`'s `light` field (js/app.js:6334) is unbounded.**

The "Highest cost per plate" card ranks by absolute dollar cost (unaffected by a sell-price typo, so the ranking itself is fine), but the `light` dot for each row comes from `analyze(c, m.price).light`, which is unbounded. A mispriced plate showing up in this list (it can, since it ranks by cost not by %) would render with a red dot rather than being excluded/flagged as mispriced. Low stakes since it's a single color indicator next to a dollar figure, not a headline number, but it's the same class of gap as #1 and #2 — a spot the bound didn't reach.

**What I checked and found consistent (no issue):** the `FOOD_COST_SANE_MAX` threshold (`>300`) is applied with the identical operator and identical `cost/price*100` formula in `dishRatios`, `digData('foodcost')`, `computeInsights`, and `kpiStripHtml` — these four agree with each other exactly, including at the boundary (300 in, 301 out, tested). `logHistory`/`logMenuHistory` both route through the now-bounded `computeAvgFoodCost`/`avgFoodCostForScope`, so no new corrupted point can enter `price_history`/`menuHistory` going forward — the trend-chart clip is correctly scoped to defend against *already-stored* bad data, not new writes. The six cache-version spots (`index.html` ×2, `sw.js` `CACHE` + 2 asset entries, `js/app.js` `APP_VERSION`) all agree at v198. The new unit tests use real computed values (not tautologies), assert both sides of the 300% boundary, and the mutation-target allowances added are unusually well-justified (each ties a specific equivalent-mutant claim to a specific new guard). The trend-chart axis fallback (`basis=inRange.length?inRange:[CAP]`) correctly avoids `Math.max` on an empty array (which would be `-Infinity`).

---

## What was done about it

**All three fixed.** Every one reproduces as described.

**1 — `dishesOverTarget`.** Bounded, and the finding's framing is the part worth keeping: of the app's two over-target counters, the first cut bounded the calm one and missed the one an **invoice import** reads. That is where a bad cost actually arrives.
⚠️ **And there was a comment pointing at it the whole time.** `kpiStripHtml` carries *"dishesOverTarget is the insights' own epsilon-free count — left alone on purpose"*, which is true, was written about the display EPSILON, and said nothing about a bound that did not exist yet. Reading "left alone on purpose" as covering both is `CLAUDE.md`'s own **"an exemption is scoped to the CLAIM that justified it"**, one guard over, committed by someone who had read that rule that morning.

**2 — `mcmpSparkSeries`.** Same treatment as the chart: the scale is built from the readings that are on it, and an off-scale point clamps to the top. No caption, unlike the chart, and the reason is stated at the site — a 54px glyph carries shape only, and the row prints the figure itself unclipped beside it.

**3 — `digData('plate')`.** The row stays (its cost is real; the price is the typo) and the **light** goes. `light:null` is what an unpriced plate on that card already gets, so no renderer changed. Leaving a red dot there would have contradicted the card this batch added three sections above, which says in its own CSS comment that an excluded plate has no honest position against target.

Eleven tests added across the three, and `dishesOverTarget` and `mcmpSparkSeries` are now mutation targets — neither had ever been one, **which is why the bound could miss both without a single test going red.**

**The transferable half, and it is the finding under the findings:** the item named four sites, measuring found two more, and an independent reader found three after that. Nine. "I applied it where the item said" is not a census — `docs/QUEUE.md`'s own header rule about unmeasured enumerations, arriving from the other direction.
