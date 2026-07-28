# HANDOVER v92 — Insight VALUE ranking: score, floor, and three families fixed at the root

**Completed:** 28 Jul 2026 · branch `fix/insight-value-ranking`, **stacked on `fix/insight-families`
(v91, unmerged)** — your call, and the right one: this batch rewrites `deriveInsights`/`selectInsights`,
which v91 had just rewritten, and it needs v91's `ingPriceLog` fix underneath it. **v91 must merge first.**
Brief `~/Downloads/ezplate-opus-insight-families.md` (second brief, in-chat).
Baseline v91, 436 node green. Ended **447 node green**, jsdom smoke green, `node -c` clean
(`js/app.js`, `sw.js`, the four `api/*.js`), **26 Playwright green**, six spots → **v92**.

No migration. Zero contact with the protected parser region, the naming inversion, the menu data
model, or the invoice path. The money law is unchanged and every new line is pinned by it.

---

## 1 — DIAGNOSIS (asked for first, so here it is first)

I ran the real families against your **real data** — `~/Downloads/ezplate-backup-2026-07-16.json`,
20 costed plates at the time. Not a guess.

**It is not insufficient `price_history`, and it is not one cause. It is two.**

### Cause 1 — four of the five strong families share one input, and a bug had starved it

`insCostBase`, `insDrift`, `insVolatility`, `insLongStanding` (plus `insRecentChange`) all read
**`ingPriceLog`**, the per-product price log. That is a *different* series from `priceHistory`, the
all-menus average that drives your chart and comparison bar. `priceHistory` is healthy.
`ingPriceLog` had exactly **one writer** — the invoice-confirm path — so every hand-edited price
wrote nothing to it.

With that log empty: `costAtLines(...).complete` is false for every plate (families 1, 2 and 5 have
no reference moment), `ingPriceBand` returns a zero-width band so `hasRange` is false (family 4
silent), and `recentUp` stays 0.

That is the v91 bug, already fixed and pushed. **It starts the clock; it cannot backfill.**

### Cause 2 — the one strong family needing no history was scope-suppressed where you look

`insCategory` was `scope:'menu'`, so `scopeAllows` blocked it at all-menus. On your data it fires
with an **8-point gap**: *"Your Fish & Chips plates average 17% food cost, Burgers sits at 25%."*
Meanwhile concentration and price-gap are `scope:'global'` — they fire **only** at all-menus.

So at the default scope, **every strong family was unavailable by construction and the two weakest
were guaranteed available.** What remained — pricegap, supplier, nearcluster, complexity, data, best
— is exactly the set computable from a static snapshot of today's numbers, and those are structurally
weak *because* they have no time dimension. All they can do is count, spread or aggregate.

### The conclusion that shaped the rest of the batch

**The weak/strong split was the history/no-history split plus one scope bug. Ranking alone would
have changed nothing, because the strong candidates were never in the pool.** That is why §2 needed
an absolute floor and not just a sort.

---

## 2 — Value ranking, with a hard floor

Value is now **declared**, on the two axes you named, in one table (`INSIGHT_VALUE`):

- **NON-OBVIOUSNESS** — could you have worked it out from the menu table? A movement over time could
  not (you'd need last month's prices). A count of rows could.
- **ACTIONABILITY** — does it name the thing to look at? A named plate, ingredient, section or
  supplier points somewhere; a menu-wide average does not.

`score = 100 · (0.55·novel + 0.45·act) · magnitude`, magnitude ∈ [0.5, 1] for how big *this instance*
is. **`INSIGHT_FLOOR = 45` is absolute**: applied in `selectInsights` *before* ranking, so a weak
candidate is dropped outright rather than out-ranked — it can never reach the panel on a quiet day.
All tuning lives in one table, not scattered across twelve families as hand-picked constants.

**Three families deleted**, because they could not clear the floor at *any* magnitude — i.e. they
could only ever have displayed because nothing better fired, which is precisely what the floor exists
to stop. Keeping them would have been dead code pretending to be a feature:

| removed | why | peak score |
|---|---|---|
| `insRecentChange` | "N plates cost more now than at your last price update" — a bare count, names nothing | 38 |
| `insData` | "N plates aren't costed yet" — a to-do, and the Plates tab already shows it | 31 |
| `insBest` | "X is your strongest margin" — the padding line by construction (its own v90 comment said so) | 25 |

`insBest` is the one to argue with, so: under a heading that reads *"What needs attention"* it is
noise, and the all-healthy line already carries the positive framing when nothing is wrong. **One
number in `INSIGHT_VALUE` brings any of them back** if you disagree.

---

## 3 — The three families, fixed at the root

### Price-gap → **price ANOMALY**. You were right, and it was worse than SMALLGOODS.

On your real data the spread version fired: *"Your 6 VEGETABLES products run $2.10–$13.33 per kg — a
6.3x spread."* That is **brown onions against spinach**. Category here is a supplier catalogue
heading, not a substitutability class, so no threshold could fix it — the grouping itself was wrong.

An anomaly test needs no substitutability claim: it says one number looks out of place next to every
other number *of the same kind*. So grouping is now **base unit only** (never $/kg against $/unit),
and the comparison is against the **next dearest**, not the cheapest — being the dearest is
unremarkable; being a multiple of the runner-up is not. ≥4 in the group, ≥3x.

**On your current data it says nothing** — your dearest per-kg item is Dukkah at $55.14, and that is
only **1.84x** the next dearest (beef at $29.89). That is the correct answer, and it is the point:
one honest silence in place of one confident wrong sentence.
*Known limit:* two similarly-priced outliers mask each other. Deliberate — for a line that says
"this may be wrong", a conservative test that stays quiet is the right trade.

### Concentration — now carries its consequence, and knows when it can't speak

Reach alone is the bare count you rejected. It now computes the consequence deterministically: if
that supplier's prices rose 10%, how many points would it add to the average food cost across the
plates they touch? *"The Fruit Wagon is in 12 of your 20 costed plates — a 10% rise there would add
0.8 pts to their average food cost."* Conditional, clearly marked, in points not money (Rule C).
Below 0.5 pts the honest answer is "not much", and it stays silent.

**The coverage gate matters more than the thresholds.** In your data **8 of 44** products used in
plates carry a supplier — 18%. Reach computed over an 82%-unlabelled list measures *which supplier
got typed in*, not procurement. Under 50% coverage the family says nothing. **So on your data it is
silent**, which is right. Fill in more suppliers and it starts speaking.

### Near-miss — reframed, and the AI told to stop inverting it

Copy is now *"2 plates are sitting within half a point of your 30% target — the closest on your
menu."* A test forbids "only"/"just"/"falls short"/"misses".

The deficit framing probably wasn't in the template at all — **it was the phrasing model**. The
prompt cast it as "a sharp hospitality consultant… name the cost issue and its size" under a panel
headed *"What needs attention"*, which pulls hard toward a concerned register. `api/_insight.js` now
carries an explicit rule: keep the framing you are given, never add "only", never turn a standing
into a shortfall.

### Ingredient-count — kept, as you asked

Untouched in substance. Its gap gate went 3 → 5 pts, but only because CodeRabbit found it was in the
dead zone below (see §5). On your data the gap is 8 points, so it is unaffected.

---

## 4 — What you will actually see

I ran the shipped engine over your real backup. Before: five lines, mostly weak. After:

```
1. [category]    Your Fish & Chips plates average 17% food cost, Burgers sits at 25%.
2. [complexity]  Plates with 6+ ingredients average 27% food cost, simpler ones 19%.
3. [nearcluster] 2 plates are sitting within half a point of your 30% target — the closest on your menu.
```

**Three insights where the cap allowed four**, led by the family that was previously suppressed.
Nothing padded. Anomaly and concentration are both correctly silent.

Expect the panel to grow, not shrink, as `ingPriceLog` fills: the four history families are the
highest-scoring in the table and will lead the moment they have data.

---

## 5 — CodeRabbit: five findings, two of them real bugs I had introduced

1. **MAJOR — the concentration population mismatch.** I counted `totalPlates`/`platesBySup` over all
   plates with any product, but the points figure only over *priced* plates. So "11 of 14" and the
   pts figure described different sets of plates **inside the same sentence**. Fixed: everything is
   now gated behind a resolved sell price, so reach, denominator and consequence share one
   population. Good catch — that one would have shipped a quietly wrong number.
2. **MAJOR — a dead zone between each family's gate and the floor.** `insPriceAnomaly` at exactly its
   3x gate scored 42.3, and `insComplexity` at its 3-pt gap scored 42.6, both under the floor of 45.
   They passed their own documented gate and were then silently dropped — the worst of both bars,
   because the thresholds written on the family were no longer the thresholds in force. Fixed:
   anomaly's magnitude base 0.5 → 0.6; complexity's gap gate 3 → 5 pts (also the honest bar — a
   3-point difference is inside café noise). **Pinned by a new test that exercises every family at
   the weakest input it accepts**, which is what my original "no dead families" test missed by only
   checking magnitude 1.
3. Minor — that same magnitude-1-only weakness. Fixed by the test above.
4. Minor — the padding test asserted only `out.length`. Tightened to assert the exact family set.
5. Minor — asked for an anomaly at exactly 3x through `deriveInsights`. Covered by the minimum-gate
   test in 2.

---

## 6 — Judgement calls

- **`insCategory` is no longer menu-scoped.** This reverses a deliberate v90 decision ("comparing
  sections across every menu averages away the thing that makes it useful"). It is the direct fix for
  diagnosis cause 2, and a section average across all menus is still an aggregate over a real group of
  plates. If you disagree, this is the one to push back on — it changes what the default scope shows.
- **Three families deleted rather than left scored-but-unreachable.** See §2.
- **The `v89-dash` Playwright seed was changed** (Original's two dishes 20%/40% → 30%/30%; every
  asserted figure is identical). Those two desktop tests failed after the change, and the reason is
  worth stating: **the only thing rendering an insights panel in that fixture was `insBest`** — the
  padding line. The seed now sits on the target so the near-miss cluster is a real insight, and the
  placement invariant has something genuine to measure. I did not add a null-guard; CodeRabbit
  rejected that in v90 for making the check vacuous, and it was right.
- **`extractVar` is new in `tests/_extract.js`.** `INSIGHT_VALUE` is pure tuning, and a hand-copied
  mirror in the test sandbox is exactly the "second copy to drift" that file exists to prevent — so
  the constants are sliced from the real source. I moved the existing `INSIGHT_DIMS` mirror onto it
  too. (Its first regex version was wrong: `var INSIGHT_FLOOR=45;` has a trailing comment, so a lazy
  `;\s*$` ran past it and swallowed the next function. It is brace-depth-aware now.)

## 7 — Needs your phone

- **The main question is unchanged and only you can answer it: do these three lines pass the "so
  what" test on your real menu?** Especially the category line — it is now leading, and it was never
  visible before.
- Three lines instead of five is the intended outcome, not a failure. Tell me if it reads as thin.
- The near-miss copy is longer. Check it doesn't wrap badly.
- If you want concentration to speak, the supplier field needs filling in past 50% of used products.
