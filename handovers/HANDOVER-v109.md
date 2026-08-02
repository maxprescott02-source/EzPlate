# HANDOVER v109 — price edits write history from every path

**Date:** 3 Aug 2026
**Branch:** `fix/price-log-every-path` off `main` at `4f750eb` (the v108 merge)
**Brief:** `ezplate-opus-price-log-gap.md` — small batch, correctness not features
**Suite:** `npm test` 582 green (566 → 582) · jsdom smoke green · Playwright 94/94 · `node -c` clean

---

## What was wrong

Editing a product's price on the **Products tab** (`saveIngEdit`) called `setProduct`
and never `logIngPrice`, so no per-product history point was written. Found during
v108: Max edited two prices on 31 Jul and the export showed 33 points, newest 15 Jul,
with neither P0007 nor P0267 in it.

It is a correctness bug rather than a missing feature because of what sits downstream.
`ing_price_log` is what `ingPriceAt` reads, which reconstructs historical plate costs,
which is what the movers card and insight family 1 run on. So the dashboard's history
was silently incomplete **depending on which screen the user happened to use** — and
the gap is invisible: the card shows fewer movers, never an error.

CLAUDE.md already carried the rule this violated ("check the writer, not just the
reader"). The rule existed; the Products tab was missed anyway. That is the argument
for the shape of the fix.

---

## The enumeration, which is the part that mattered

The brief said to enumerate every price-mutating path and report before building. That
turned up **three** gaps, not one.

`cost_per_base_unit` is written in exactly five places, and all five go through
`setProduct`:

| # | Path | Site (pre-fix) | Logged? |
|---|---|---|---|
| 1 | Builder hand-edit — `commitPrice` | `js/app.js:666` | yes (explicit call, added v91) |
| 2 | Invoice confirm, **matched** line — `applyInvoice` | `js/app.js:5753` | yes (batched via `ingLogged`) |
| 3 | Products tab **edit** form — `saveIngEdit` | `js/app.js:1794` | **no** ← the reported defect |
| 4 | Products tab **create** form — `submitNew` | `js/app.js:851-856` | **no** |
| 5 | Invoice confirm, **add-new** line — `applyInvoice` | `js/app.js:5735` | **no** |

The two extra gaps are the same path on two different screens: **product creation never
recorded a first observation.** That is worse than it reads. `ingPriceAt` returns `null`
before a product's first point (`js/app.js:3040`), so a product created today and
re-priced next month produces *no* movement reading at all — the movers card cannot say
what it was, because nothing ever observed what it was. Every product Max has created
since 15 Jul is in that state.

**Non-price product writes, checked and correctly silent:**

- `applyInvoice`'s pack teach, `setProduct(bestId, {pack_qty, pack_unit})` (`:5769`).
  Pack fields feed invoice price *derivation* (`resolveMatchedPrice`/`derivePackPrice`)
  only; `cost_per_base_unit` is stored, so the effective price does not move.
- `applyTidy` (`:3777`) writes `productsById[id][col]` **directly, bypassing
  `setProduct`**; `col` is only category/brand/supplier.
- `bootstrapSync`/`rowToProduct` fill `productsById` directly and never call
  `setProduct` — which is exactly what keeps boot from fabricating 412 points.
- `syncMemoryToProduct` writes supplier memory, not the product.

---

## The fix

**One writer, inside `setProduct`** (`js/app.js:481`). The enumeration is what justifies
the placement: all five price writes already funnel through it, and the only
direct-to-`productsById` writers write no price.

**Stated as an invariant, not a guarantee** (CodeRabbit caught the overclaim in the first
draft of this file, and it was right): *a product price is only ever changed by calling
`setProduct`.* Exactly one shape could break it — assigning into `productsById` directly,
which `applyTidy` already does: `productsById[pt.id][col] = pt.value`, where `col` is a
runtime value, not a literal. That is safe today because tidy's field is only ever
category/brand/supplier, but **nothing in the code constrains it to those** —
`tidyPlanAll(products, plates, field, …)` takes `field` free. No guard was added for that
(strict scope, and a source-level scan of an assignment through a computed key is not
something a test can pin honestly); the invariant is written at the fix site instead, so
the next person to add a price path reads it.

```js
if(patch && Object.prototype.hasOwnProperty.call(patch, 'cost_per_base_unit')){
  var now=patch.cost_per_base_unit;
  if((had==null || !samePrice(had, now)) && logIngPrice(id, now)) saveIngLog();
}
```

### The condition is the previous STORED price, not the last logged point

This is the whole safety of it and the thing not to "simplify". `logIngPrice` dedupes
against the **log**, and nearly every product's log is empty — 33 points across 412
products. So a pack-only write on a product with no history would have sailed straight
past that dedupe and **fabricated a price observation for a change that never happened**.
The two guards compose deliberately: `setProduct` asks *did the stored price move*,
`logIngPrice` asks *is this a new observation*.

### Product creation logs a first point — Max's call, 3 Aug

Asked explicitly rather than assumed, because "every path that CHANGES a price" does not
obviously cover a create. Logged, for the `ingPriceAt` reason above. It cannot invent a
false mover: the point equals the current price until something changes it.

### Two smaller corrections made in passing

- **`samePrice(a, b)` extracted** from `logIngPrice`'s dedupe line, so "the same price"
  has one definition and is asked identically in both places. The relative tolerance is
  also what absorbs display rounding: the price chip renders 2dp, so re-committing an
  unchanged price hands back a value differing in the 18th decimal — a keystroke, not an
  observation.
- **`logIngPrice` now gates on `typeof cpbuVal !== 'number'`**, not `isFinite` alone.
  `isFinite('')` is `true` because `Number('')` is `0`, so a blank field would have been
  recorded as a real-looking $0.00 product. Same trap `rowToPoint` was corrected for in
  v108. `0` stays legitimate (P0277 costs 0) — which is precisely why the check is on the
  **type**, not on falsiness.

### What came out

The two explicit `logIngPrice` call sites (`commitPrice`, `applyInvoice`) and
`applyInvoice`'s batched `ingLogged` flag + `if(ingLogged) saveIngLog()`. With logging
inside `setProduct` they were dead — the inner call logs first, so the outer returns
`false` — and leaving them is exactly the "call sites kept in sync by discipline" the
batch exists to remove. Server round-trips are unchanged: `saveIngLog` pushes one row per
point either way.

---

## Tests

**`tests/price-log-paths.test.js` — 16 new, in the default suite.** Real `setProduct`,
`samePrice`, `logIngPrice`, `saveIngLog`, `ingPriceAt` sliced from shipped source; the
patch shapes are built through the app's own `newProductRecord` / `invUnitToBase` /
`unitToBaseFields` / `packToUnitCost` rather than hand-written, so a path's shape drifting
shows up here.

Per the brief, these **assert the point that lands**, never "did it call the guard" —
v108's critical bug survived a thorough suite because `deleteIngredient` was pinned
structurally, which cannot catch a wrong condition. One test per enumerated path;
unchanged price writes nothing; pack teach on an **empty-log** product writes nothing (the
one that catches the wrong condition); `0` writes a point, `null` and `''` do not; points
from different paths are indistinguishable to `ingPriceAt`; every point that lands is also
flushed.

**`tests/smoke.js` [24b] — jsdom, the two screens.** Drives the real `openIngEdit` /
`saveIngEdit` and the real create form / `submitNew`, because the helper was never the
thing that was wrong. Verified it fails on pre-fix code: 3 real FAILs on exactly the three
gap paths.

*Honest note on that verification:* the node file fails 16/16 against pre-fix app.js, but
for the weak reason — `samePrice` doesn't exist there, so extraction throws. The
**behavioural** proof that the tests catch the bug is the smoke section, not the node one.

---

## Deliberately NOT done

- **No backfill.** The missing observations are genuinely unknown; reconstructing them
  would fabricate evidence in the exact series the dashboard draws bands from. History is
  complete from this batch forward, and that is the honest outcome.
- **No UI disclosure of the gap.** The brief says report, don't build. Reported here: the
  movers card and insight family 1 will stay quiet on most products for a while yet, and
  that is not a bug now — it is a series that has just started.
- The ~50 `saveX` call sites, the restore importer, pdf.js, ID generation.

---

## Found, not fixed

**Two points for the same product in the same millisecond would collide** on
`ing_price_history`'s `unique (product_id, recorded_at)`. `t` is `Date.now()`, so
same-tick writes share a timestamp. Not a regression — true of every writer since the
table was created — and not reachable in practice: a human cannot re-price one product
three times inside a millisecond, and `applyInvoice`'s loop touches a different product
each pass. It surfaced as a *test* failure (my own assumption, not the app's behaviour)
and the test now separates its writes in time, with the reason written at the site.

---

## Needs Max's phone

Only one thing, and it is the brief's own acceptance check:

- **Edit a price on the Products tab and confirm a point lands.** Note which product you
  edit and check *that* product, so an unrelated row can't read as a pass:

  ```sql
  select recorded_at, cost_per_base_unit
    from ing_price_history
   where product_id = '<the id you edited>'
   order by recorded_at desc;
  ```

  Baseline as of 3 Aug (verified through the MCP): **33 points across 33 products, newest
  15 Jul**, out of 412 products — so almost any product you pick will go from zero rows to
  one. That also starts filling the series the movers card has been unable to draw.

Nothing visual changed, so nothing else here needs a device. v108's behavioural sign-off
list is untouched and still outstanding.

---

## Rules

Six version spots bumped **v108 → v109**. No DB migration — `ing_price_history` gained
its table in v108 and needed no change. Confirmed there is **no FK** from
`ing_price_history` to `ingredients` (deliberate, documented in the v108 migration), so a
history point for a just-created product needs no write sequencing.
