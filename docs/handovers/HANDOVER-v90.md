# HANDOVER v90 — Dashboard rework, stage 2: insights + drill-downs

**Completed:** 27 Jul 2026 · branch `feature/dashboard-stage2` (off `main` at v89, `60b4d16`, PR #28 merged) ·
brief `~/Downloads/ezplate-opus-dashboard-stage2.md` + mockup `~/Downloads/ezplate-dashboard-mockup_1.html`.
Baseline v89, **413 node green**, `node -c` clean. Ended **432 node green**, jsdom smoke green, `node -c` clean
(`js/app.js`, `sw.js`, the four `api/*.js`), **26 Playwright green** (12 in `v89-dash.spec.js`, 8 in the new
`v90-dash.spec.js`, 6 in the new `v90-flows.spec.js`), six spots → **v90**, CodeRabbit clean on re-review.

Zero contact with the protected parser region, the naming inversion, the menu data model, the invoice path,
`api/*.js`, or the chart's geometry. The money law is unchanged and now has more tests, not fewer.

---

## ⚠️ Read first: this needs a migration applied BEFORE the deploy

`supabase/migrations/20260727_menu_price_history.sql` creates a new **`menu_price_history`** table.
Apply it in the SQL editor before merging — previews and production share one database.

**If you forget, nothing breaks.** `bootstrapSync` probes for the table once; if it's absent,
`menuPriceHistSupported` goes false and sell-price points stay in localStorage — no errors, no toasts, no
repeated failing writes. But that history won't survive a device change, and it is unrecoverable once lost.

(v89's `20260727_price_history_menu_id.sql` is separate. You confirmed you'd applied it — worth double-checking,
because that one is per-menu **average food cost** history, which is a different thing from this one.)

---

## The question that shaped this batch

You asked: *"I understand there is no existing price history but it will build, why can't we build this now?"*

That was the right push, and the answer was yes. One correction that mattered: the SQL you ran added
`menu_id` to `price_history`, which is per-menu **average food cost** history — Stage 1's blocker. What
families 2 and 5 needed was a different thing the app had never stored: **the sell price of each plate over
time**. `menu_items.price` has always held the current price and nothing else.

So v90 starts that clock (§1) *and* builds both families now, in a form that is honest with today's data and
sharpens itself automatically as the log fills. Nothing is deferred waiting for data.

## 1 — The sell-price log

`menuPriceLog` is `{menuItemId: [{t,v}]}` in `cafeDB_menuPriceLog`, mirrored to the new Supabase table.
Deliberate differences from the other two logs:

- **Deduped on VALUE, not on time.** A price is a discrete decision: every change deserves a point and an
  unchanged price deserves none. `priceHistory` needs its hourly guard because it moves continuously; this
  doesn't.
- **One funnel.** `logAllMenuPrices()` is called from `logHistory()`, which already fires on every
  data-changing event, rather than sprinkled across the five places a `menu_items` row gets written. A write
  path added later is covered automatically, and the value dedup makes running it often free. On the first
  run it seeds a baseline point for every already-priced plate, so the history is useful from v90 rather than
  from the next time somebody edits something.
- **Merged, not replaced, on sync** — reusing v89's `mergeMenuHistory` unchanged, because the shape is
  identical. `pushWrite` still drops writes silently offline (CLAUDE.md's known gap), so a point logged on a
  café phone with no signal exists only in localStorage and replacing wholesale would delete it.

**Bug found and fixed on the way:** editing a dish's sell price, publishing a plate, and adding an existing
plate to a menu **never called `logHistory()`**. All three change the menu average, so all three should have
logged a trend point and refreshed a visible Dashboard — the v60 item 1a liveness rule, missed on those three
paths since they were written. One line each. This was pre-existing, not caused by this batch; I fixed it
because the price log needs those same hooks.

## 2 — Insight quality: what was deleted and why

Your test case drove this: *"Eggs are in 8 plates"* is useless. The old guard (`nonObvious`, v74) only asked
"is this in the menu table?" — too weak. It is replaced by **`ruleA`**: every candidate declares the
*dimensions* it combines (time, composition, breadth, aggregation, distribution, comparison) and must carry
**two**, or be a **single aggregate across the whole dataset**.

**Deleted — six families (your approval, 27 Jul):**

| Deleted | Why |
|---|---|
| `insReprice`, `insCut`, `insSummary` | status roll-ups. "X is over target" is what the red light and the Variance column already say; adding points or $/serve adds detail, not a dimension |
| `insSpread` | the food-cost range across the menu — the light column shows it at a glance |
| `insSpend` | "N% of your ingredient spend" implies purchase volume the app has never had (Rule C) |
| `insAggregate` | "$X per 100 serves above target" reads as money lost, which needs volume (Rule C) |

**Rewritten — three:** `insShared` → `insSupplierReach` (bare breadth *was* literally the rejected "Eggs are
in 8 plates"); `insNearMiss` → `insNearCluster` (one plate → an aggregate); `insMover` → folded into
`insCostBase`, which adds the aggregate impact the bare move was missing. `insVolatility` was re-expressed as
a food-cost **% band** plus a ranking.

**Their helpers went with them** — `CUT_PTS`, `dishDriver`, `driverClause`, `overServeFmt`, and `ingMovePct`
(whose only caller was `dishDriver`). Grepped: zero live references to any of them. This is the audit's
dropped-thread E lesson applied — a removal that leaves orphans is how `savePlateRestore` survived 32
versions.

**Kept:** `insCategory`, `insComplexity`, `insRecentChange`, `insData`, `insBest`, `healthyLine`.

**Eight families now ship:** cost-base movement with the culprit named · plate drift · category imbalance ·
volatility · long-standing problem · near-miss cluster · supplier concentration · price gap.

## 3 — HISTORY DEPTH (the section to re-read in three months)

Every "since June" figure is computed against **one reference moment**, not a basket of each ingredient's own
last change — `ingPriceAt` returns the price actually in force then, and a plate takes part only when *every*
priced line's log reaches back that far. That is what lets the copy name a month at all. `INSIGHT_WINDOWS`
tries 30 → 60 → 90 → 180 days and uses the most recent one that enough plates reconstruct at.

| Family | Needs | On a fresh install |
|---|---|---|
| 1 cost-base movement | ≥2 plates reconstructable at one window, ≥1 ingredient moved ≥3% | silent |
| 2 plate drift | same, ≥1 plate | silent; **gains the "its price hasn't moved" clause once the sell-price log covers the window** |
| 3 category imbalance | none (live data) | works immediately |
| 4 volatility | ≥2 logged points on some ingredient | silent |
| 5 long-standing problem | **≥3 distinct months** of logged cost points for that plate | silent; gains "with no price move" once the sell-price log covers it |
| 6 near-miss cluster | none | works immediately |
| 7 supplier reach | ≥2 suppliers, ≥3 plates | works immediately |
| 8 price gap | ≥3 products in one category+unit | works immediately |

**They stay silent rather than emit a degraded version.** Nothing is ever padded to the count cap.

## 4 — Two wrong numbers, and how each was found

**(a) A fabricated 12-month claim — found by looking at a screenshot.**

Screenshotting the real app showed: *"Breakky Burger has been over target through every cost change since
August 2025 — 12 months, not a one-off."* for a plate built entirely from fixed **misc** cost lines.

A misc-only plate reconstructs perfectly at every moment in the past, because its cost is a constant. So
`costAtLines` reported `complete: true` with **no logged history behind it at all**, and family 5 read a
12-month run out of a plate whose cost had never been observed changing. There were no cost changes to be
over target through — the sentence was inventing history, which is exactly what Rule C forbids.

Fixed with a `priced` counter: reconstruction only counts when at least one line actually came from the price
log. Four regression tests in `tests/dash-digin.test.js`. **Worth noting how this was found** — unit tests
passed, Playwright passed, and it took looking at a rendered screenshot. Numbers being *arithmetically* right
is not the same as a sentence being *true*.

**(b) "across N plates" counted LINES, not plates — found re-reading my own diff.**

The culprit-attribution loop incremented its plate counter once per ingredient *line*, so an ingredient used
on two lines of the same plate (two cuts of beef, say) reported that plate twice. "Beef, up 18% across 5
plates" would have overstated the reach. Every line must still contribute to the *cost* figure, so the fix
is a per-plate `seen` set, not a restructure.

The attribution was inline inside `computeInsights` and therefore untestable, which is why it had no cover.
It is now `movementCulprit(ok, ms)` — extracted deliberately, matching the file's one-pure-function-per-family
convention — with five tests pinning the name, the two figures, plates-not-lines, and every skip path.

## 5 — What the removal actually deleted

Markup (`index.html`): `#menuSuggestFab`, `.msug-pill`, its inline `msugSparkGrad` defs, `#menuSuggestPanel`,
`.msug-head`, `#menuSuggestClose`, `#menuInsights`, and the v74 comment block. Also `#hlModal` with
`hlTitle`/`hlBody`/`hlClose`/`hlDone`.

CSS (~150 lines): every `.msug*` rule, the mobile inset-card overrides, `@keyframes msugPop`/`msugRise` and
their reduced-motion rules; `.menu-insights`/`.mi-intro`/`.mi-line`/`.mi-credit`; `.hl-row`/`.hl-card`/
`.hl-head`/`.hl-list`/`.hl-full`/`.hl-more` and `#hlBody`. (`.mi-row`/`.mi-act`/`.mi-btn`/`.mi-name` are the
**menu table's** classes — same prefix, different feature, untouched.)

JS: `renderMenuInsights`, `menuSuggestOpen/Close/Toggle`, `suggestFabSwipeOff`, `wireMenuSuggestFab` and its
document click/keydown listeners, `suggestFabSwiped`/`suggestFabMenuId`/`fabSwipeGuard`, both panel swipe
handlers, `highlightData`/`highlightCard`/`openHighlight`, and every call site.

**Nothing had to stay, and nothing is persisted.** There is no dismiss setting to remove: v74 already retired
the synced `suggest_fab_hidden` (smoke.js pins its absence) and v78's swipe was session-only. Grepped every
identifier afterwards; the only survivors are comments explaining the removal. A Playwright test now asserts
all eleven selectors and six globals are gone from the running app, not merely hidden.

**This closes the ten-version saga** and retires `.msug-panel`, one of the five independent owners of
floating-layer placement the 26 Jul audit blamed for the recurring dropdown bug. **Four owners remain.**
The Dashboard insights block is an ordinary `.panel` in the grid — there is nothing to place.

## 6 — Judgement calls

- **No empty state on the insights panel.** When there is nothing to say the panel is absent, exactly as the
  By-menu panel is absent below two costed menus. The verdict header directly above already explains a scope
  with nothing costed, and a second empty state repeating it is noise on a phone. The **drill-downs** do need
  one and use the shared `emptyStateHtml` helper, with no bespoke markup and no one-off CSS rule — a test
  asserts the `es-built` marker class.
- **The Dig in cards replaced the three highlight cards** (your call). Their content survives inside the four
  cards; the modal is gone in favour of the inline list→detail→back pattern Settings uses.
- **The sparkle gradient is defined once in `index.html`, not in the rendered markup.** `renderDashboard`
  rewrites that markup on every scope change and every drill-down open — a `<linearGradient id>` inside it is
  a duplicate-id bug waiting to happen. Smoke asserts exactly one exists.
- **"Highest cost per plate" is deduped by plate.** One plate published to two menus is one row, not two.
- **`priceHeldSince` returns false when the log is too short**, so the "its price hasn't moved" clause is
  omitted rather than guessed. A log that starts *after* the moment asked about cannot prove anything.
- **By-menu stays in column 1 on desktop; the mockup shows it full-width.** A real discrepancy, resolved in
  favour of the brief: its OUT list names "changes to Stage 1's header/chart/comparison", and By-menu is
  Stage 1's comparison panel. Widening it is a one-line change (`#dashBody .dash-compare{grid-column:1/-1}`)
  if you'd rather match the mockup exactly — say the word. Everything else follows the mockup's structure:
  status → insights → by menu → dig in on mobile, insights beside the chart on desktop, Dig in spanning the
  width below.
- **All copy says "plate", never "dish"**, per CLAUDE.md's four object nouns — the brief used "dish"
  throughout, and a test now pins the engine's output against it.

## 7 — CodeRabbit: 5 findings, 4 fixed, 1 skipped with reason; re-review clean

1. **Drift could be overwritten by an older window (`js/app.js`). REAL, fixed.** The window loop continues
   while `movement` is unset, so a scope producing drift at 30 days but no movement had that drift silently
   replaced by the 60- then 90-day version — the sentence would name a different era depending on whether an
   unrelated family happened to fire. Now keeps the first (most recent) window's result.
2. **`css/style.css` — a desktop `.stat-v{font-size:24px}` restating the base rule two lines above. REAL,
   fixed.** Dead since v49; removed while the surrounding rules were open.
3. **`tests/smoke.js` — the gradient check asserted "exists", not "exists once". REAL, fixed.** Counting is
   the point: the invariant is that re-rendered markup never mints a duplicate id.
4. **`tests/visual/v89-dash.spec.js` — a null-guard made the placement assertion pass vacuously. REAL,
   fixed.** The guard would have let the whole check pass the day the panel stopped rendering, which is the
   regression it exists to catch. Now unconditional.
5. **`tests/smoke.js` — guard `.click()` calls against missing elements. SKIPPED, deliberately.** The
   assertion immediately above each click already proves the element exists, and every other interaction in
   that 900-line file clicks unguarded. A throw there is a loud failure with a stack, not a silent one;
   adding guards to two of ~200 call sites would be inconsistent without being safer.

## 8 — Test changes

**432 node green** (was 413). The count moved in both directions and the arithmetic is worth stating:

- `tests/insights.test.js` **rewritten** — 34 tests pinning the six deleted families were deleted with them
  (deliberate, per the brief), replaced by 56 covering Rule A directly, each new family, scope suppression in
  both directions, the count-scaling curve, no-padding, Rules B and C across the whole engine, the money law,
  the ~24-word phrasing cap, and the plate/dish terminology.
- `tests/dash-digin.test.js` **new**, 23 tests — drill-down sorting and scoping (including that the two global
  cards ignore the selector), the shared empty state, the sell-price log helpers, and both wrong-number guards
  from §4.
- `tests/visual/v90-dash.spec.js` **new**, 8 Playwright tests — insights present and inline with the sparkle
  and **without** the unearned credit (the half jsdom can't show), all four drill-downs opening and returning,
  desktop grid placement, scope re-scoping, the Menu tab being clean, both themes, 380px, no overflow.
- `tests/smoke.js` — the v74 FAB section replaced by the Dashboard equivalent, including the new quota guard.
- `_extract.js`, `settings-toggles.test.js`, `v89-dash.spec.js` — updated for renamed/moved functions.

**A quota bug the new tests caught:** `gemPhraseInsights` only claimed its key *after* a call succeeded. On
the Menu tab that ran about once per menu switch. The Dashboard re-renders far more often — every scope
change, every drill-down open **and** every back — and each of those fired a second identical POST while the
first was still in flight, burning the limited free-tier quota for a phrasing already on its way. The guard is
now in-flight as well as post-hoc, and releases the key if the call fails so a later render can genuinely
retry.

## 9 — The flow-tester did NOT run; I covered its brief in Playwright instead

Worth saying plainly rather than burying: **the `flow-tester` subagent never tested anything.** It ran for
nine hours and spent them delegating to a further subagent instead of driving a browser, then reported that
it was still waiting. Nothing it produced is usable and none of it informs this handover.

Rather than claim a step that didn't happen, I covered the same brief myself in Playwright —
`tests/visual/v90-flows.spec.js`, 6 tests, the same move v89 made when its subagent (correctly) refused to
touch real café data. Safe by construction: throwaway profile, every off-origin request aborted so Supabase
is never contacted, nothing written or deleted.

What it covers, which is what the brief asked the subagent for:

- **the Menu tab still WORKS** with its suggestions UI deleted — search filters and clears, the margin-light
  chips filter and fold into Clear filters, switching menus repaints, and the actions row has no empty
  leftover element where the pill was. Row counts are asserted RELATIVELY, because the app ships a base demo
  menu on top of any seed.
- **navigating every tab** and back to the Dashboard leaves the console clean and both new panels intact.
- **a drill-down survives leaving and returning to the Dashboard** — no stuck half-state.
- **the AI suggestions toggle** adds and removes the insights panel, leaving the rest of the Dashboard alone.
- **all six chart ranges** still render with the new panels present, with no horizontal overflow at 380px.
- **touch targets** on the new controls clear the 44px floor.

**One finding from that last test, in my own new code, fixed rather than listed:** `.dig-back` was 32px —
under the app's stated floor, the same class of problem as the `.range-btn` issue v89 reported. It is new
code from this batch, so there was no reason to ship it below the floor: it is now 44px, with negative block
margins so the panel heading doesn't grow. (Settings' `.set-back` is 40px and predates the floor; left alone,
it's not this batch's.)

**What Playwright still cannot tell you** is everything in §10 — it is a viewport, not a device, and it has
no opinion about whether an insight is worth reading.

## 10 — Needs your phone

The desktop browser verified the numbers, the sorting, the scoping, both themes, both breakpoints, no
horizontal overflow at 380px, and that every drill-down opens, sorts and returns. What it cannot tell you:

1. **Do the insights pass the "so what" test on your real menu?** This is the one that matters and only you
   can answer it. Read all of them and flag any line you'd already know, or that reads as obvious.
2. **The Dig in cards as 2×2 touch targets at 380px.** They're above the 44px floor by CSS, but only a thumb
   says whether a card that swaps the whole panel wants more separation.
3. **The back arrow.** It sits in the panel heading like Settings'. On a tall list you'll have scrolled past
   it — does returning feel like a reach?
4. **The sparkle at real phone density.** 16px with a four-stop gradient looked right in Chromium.
5. **Whether the insights panel is too far down on mobile.** It sits below a tall status block (verdict +
   selector + chart + stat lines). The mockup put it there and you approved that, but the phone is the judge.

## 11 — Follow-ups this batch created or found

1. **`.range-btn` is still 32px, not 44px** (`css/style.css`, since v46) — carried over from v89's list,
   still one line. `.set-back` (Settings' back arrow) is 40px for the same reason.
   `.dig-back` was fixed to 44px in this batch because it is new code (§9).
2. **`priceHistory` still replaces wholesale on sync** — the offline-drop gap `menuHistory` fixed in v89 and
   `menuPriceLog` avoids in v90. It is now the only one of the three logs with the gap.
3. **The stale v60 target-line comment** — reported in v89 §6, still unfixed, still one line needing a yes.
4. **`insData` counts base-menu items with a price and no plate as "not costed yet"** — on the seeded demo
   data that reads as "69 plates aren't costed yet". Correct, but worth checking it isn't shouting on your
   real data.
5. **A plate whose NAME contains a digit** (e.g. "Pizza 4 Cheese") makes the Gemini phrasing fail the number
   validator, so the deterministic template stands. Safe degradation, never a wrong number, but it means those
   plates never get the warmer wording. Found while writing the money-law test.
6. **Per-menu logging now multiplies price writes** by the number of priced dishes on the first run after
   v90 deploys (one baseline point each). Fine at café scale; worth a look if the menu ever runs to hundreds.
