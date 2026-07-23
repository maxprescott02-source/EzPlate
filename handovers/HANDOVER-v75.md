# HANDOVER v75 — Insight depth (widen the pool, keep the guard) + panel polish

**Completed:** 23 Jul 2026 · branch `fix/insight-depth-panel` · brief `~/Downloads/ezplate-opus-insight-depth-panel.md`.

Branch off **v74** (`origin/main` = `604f14e`, PR #19 merged — v74's guard + pill are on main; the local
`feature/menu-insights-pill` branch was byte-identical to origin/main, i.e. fully squash-merged). Baseline **299 node
tests green**, jsdom smoke green, six spots v74. Ended **318 node green** (+19 insight tests), jsdom smoke green,
`node -c` clean (app.js, sw.js, and the four `api/*.js` untouched), six spots → **v75**.

**CLIENT ONLY** (JS engine + CSS + one JS gesture handler + test files). Zero contact with: the protected parser
region, the money law (the app still computes EVERY number; the AI layer only rephrases and still rejects any figure
not in `facts`), the naming inversion, the plate/dish/menu data model, the invoice subsystem, or the Gemini phrasing
endpoints (`api/*.js` unchanged). No new deps, no build step.

Two decisions Max made up front (asked before coding):
1. **Best performer** — the brief lists a positive "best performer" line, which reverses v74's deliberate
   critical-only removal of `insBest`. **Max: re-add it**, as a low-priority positive line.
2. **"Swipe to dismiss"** (item 3) — the brief's wording echoed v71's retired swipe-to-HIDE-the-button + persistence.
   **Max clarified: it's just the mobile panel/toast that must be easily dismissible so it doesn't block the menu.**
   So swipe CLOSES the open panel (alongside ×/outside-tap/Escape). **No persistence, no button-hiding** — v74's
   retirement of that machinery stands.

---

## Item 1 — only 2 insights on a 30+ item menu: WIDEN the pool, keep the guard

**Root cause (owned, not undone):** v74 added the correct `nonObvious` guard (an insight must add a dimension not in
the menu table) and Max's follow-up stripped the two neutral types. Net: the emitting pool collapsed to ~4 types that
almost all key off over-target dishes. On a big menu where few dishes are dramatically over target, once the shallow
over-target lines are rejected there's nothing left to promote → only ~2 show. **The guard is CORRECT and unchanged.**
The fix is more genuinely non-obvious TYPES, not a weaker guard.

### New types (all pure, tested; each declares its `dim` so the guard still gates it; each states a FACT + figures only)
Added in `js/app.js` just after `insCut`:
- **`insCategory`** (dim `comparative`) — average food-cost % per menu **section**; needs ≥2 sections (≥2 dishes each)
  and a ≥3-pt gap. "Your Breakfast dishes average 24% food cost, Lunch sits at 34%."
- **`insSpread`** (comparative) — the menu-wide food-cost % **range**; needs ≥4 dishes and a ≥10-pt span.
- **`insAggregate`** (comparative) — what the over-target dishes are worth **in aggregate**, per 100 serves (≥2 over).
  `facts.per=100` so the "per 100 serves" figure is number-law-clean.
- **`insSpend`** (dim `cross`) — the single biggest-**spend** ingredient across the menu, at ≥25% of total spend.
- **`insComplexity`** (comparative) — many-ingredient (`nIng`≥6) vs simpler dishes' avg cost %, only when the pattern
  holds (both groups ≥2 dishes, ≥3-pt gap). `facts.minIng=6` keeps the "6+" figure inside facts.
- **`insRecentChange`** (dim `movement`) — how many dishes cost MORE now than at the last price update (≥2), from the
  per-ingredient price log.
- **`insData`** (dim `coverage` — **new dim**, added to `INSIGHT_DIMS`) — dishes not costed yet: a gentle, actionable,
  table-invisible coverage note.
- **`insBest`** (comparative) — the standout dish comfortably UNDER target (≥5 pts), the one positive line
  (score fixed low at 24 so it never crowds out a real problem). Re-added per Max.

All existing types kept. `INSIGHT_DIMS` gained `coverage` (mirrored in `tests/_extract.js`). `_extract.js` exposes the
eight new fns and wires them into the sandbox + return.

### Priority / graceful-fill ordering (documented at `deriveInsights`)
Priority is encoded in each type's **score**, then `selectInsights` ranks, keeps ≤1 per kind (the diverse pass),
rotates the near-top band by seed, and only fills toward the cap from REAL candidates (the guard already dropped
tautologies — nothing is padded). Order: **severe over-target (cut) → margin problems (reprice / near-miss /
aggregate) → risk & leverage (volatility / shared / mover / biggest spend / recent change) → menu-wide comparison
(category / spread / complexity) → floors (best performer / uncosted / roll-up).** The size-scaled cap (1/2/3/4/5 by
menu size) and the no-padding rule are unchanged and still pinned.

**All-healthy path (small change to v71's behaviour, kept warm):** nothing over target still LEADS with the one warm
`healthyLine` and never manufactures concern — but a large healthy menu now also fills toward the cap with the NEUTRAL
menu-level facts (category / spread / spend / complexity / uncosted), so it isn't stuck at a single line. A small
healthy menu has little to say and stays one line (a 3-dish menu won't manufacture 5).

### Data plumbing (`computeInsights`, still all app-computed)
Each dish now carries `section` (`m.section`) and `nIng` (distinct ingredient count). Menu-level bundles added:
`spend` (per-ingredient menu-wide cost + % share), `recent` (`{up}` = dishes whose cost rose vs each ingredient's
previous logged price — misc lines ride along at fixed cost), `coverage` (`{uncosted}` = priced dishes on this menu
with no plate / no cost). Passed into `deriveInsights`.

### Tests (`tests/insights.test.js`, 41 → 60)
Per-type derivation + guard + thresholds for all eight new types; a **`numbersInFactsOnly`** helper pins the money law
(every number shown is in `facts`) across each type AND the full pipeline; the **deliverable fixture** — a 33-dish menu
yields exactly **5 insights across ≥4 distinct types**, each number-law-clean; a large-healthy-menu test (warm line +
a few neutral facts, no manufactured concern). The `per:100` / `minIng:6` facts were added precisely because the
`numbersInFactsOnly` test caught the literal figures — a real number-law fix, not a test fudge.

## Item 2 — panel rainbow border to match the pill
`.msug-panel` now carries the **same** rainbow-gradient OUTLINE as `.msug-pill` (identical colours + 90° angle) via the
padding-box/border-box technique, so button and panel read as one object. Surface fill via padding-box keeps the
background untinted and text contrast unchanged in both themes. (Was a plain `1px solid var(--border)`.)

## Item 3 — mobile panel: dismissible + fully on-screen (Max: "just needs to not block the menu")
- **Opens leftward, fully on-screen:** on phones the panel is now `position:fixed` to the **viewport** (was
  `position:absolute` inside the 48px floating circle), anchored `right:var(--sp-4)` and expanding LEFT + UP, width
  `min(340px, calc(100vw - 2*sp-4))`. At 380px that's 340px with a 24px left gap — no horizontal scroll, no running
  off the right edge. Floats above the pill and clear of the bottom nav (`bottom: 72 + 48 + sp-3 + safe-area`).
- **Semi-transparent:** mobile fill is `color-mix(in srgb, var(--surface) 78%, transparent)` + `backdrop-filter:
  blur(12px)` — the menu behind shows through, the blur holds text contrast in both themes. 78% is the minimum tint
  I'd trust over busy café content; **Max to confirm legibility** (drop it if it reads too solid).
- **Swipe-to-close:** a rightward swipe (horizontal), or a downward swipe when the panel is scrolled to the top,
  closes the panel — scoped so it never fights the panel's own vertical scroll. Alongside the existing ×, outside-tap
  and Escape. Not persisted; the pill always returns.

---

## Needs Max's phone (no browser here — feel/layout unverifiable in-env)
1. **The 5 insights on your real 30+ menu** — open the pill on your actual menu and read them: confirm you see ~5,
   that they're VARIED (not five repriced dishes), and that **none is obvious or just restating the table** (e.g. a
   category-average line, the biggest-spend ingredient, the menu-wide spread, uncosted-dish count, recent movers).
   This is the whole point of the batch — if any line reads as a table-restatement, tell me which and I'll tighten it.
2. **Rainbow border** on the panel in BOTH light and dark themes (matches the pill; text still crisp).
3. **Mobile panel at 380px** — opens leftward FULLY on-screen (no horizontal scroll), doesn't overlap the bottom nav,
   semi-transparent-but-legible in both themes, and closes on ×, tap-outside, Escape, AND a swipe (right, or down from
   the top). Confirm it never blocks using the menu.

## Not done / deliberately out of scope
- **Ingredient-price spread** (same-category products at different prices) and **stale/never-reviewed** dishes were in
  the brief's candidate list but NOT built: price-spread needs same-unit/same-category grouping that's noisy across
  ~400 seeded products with mixed base units, and "price hasn't changed while cost drifted" needs a **menu-price
  history** the app doesn't log (only ingredient prices are logged). The pool is already wide enough to hit 5 without
  them; flag if you want either and I'll scope the data first.
- **`insData` products-without-a-kitchen-word half** was dropped as noisy (most of ~400 seeded products legitimately
  have no kitchen word — not actionable). `insData` uses the actionable signal only: uncosted dishes on this menu.
- **CodeRabbit** not yet run (per `/new-branch` step 6 it runs before push; this batch is awaiting your phone sign-off
  first). Say the word and I'll run it before any commit/push.
- `fresh-states.spec.js` still needs a browser env to reconcile (carried over from v71–v74).
