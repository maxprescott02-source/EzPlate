# HANDOVER v74 — Menu insights: floating FAB → static "EzPlate Insights" pill

**Completed:** 23 Jul 2026 · branch `feature/menu-insights-pill` · request from Max (relaying a user suggestion).

Branch off **v73** (`origin/main` = `dfe28a2`, PR #18 merged). Baseline **287 node tests green**, jsdom smoke green,
six spots v73. Ended **299 node green**, jsdom smoke green, `node -c` clean, six spots → **v74**.

**v74 grew across three same-branch pieces** (all shipped in PR #19, one deploy): (1) the pill surface move
(HTML/CSS/JS + smoke) — no engine contact; (2) the **insight-quality** pass, which DOES change the insight ENGINE
(`deriveInsights` / the `ins*` types / `_insight.js` phrasing) — see that section; (3) Max's follow-ups (mobile
floating circle + critical-only insights). Untouched throughout: the protected parser region, the money law (the app
still computes every number; phrasing only rephrases), the naming inversion, the plate/dish/menu data model, and the
invoice subsystem. No new deps, no build step.

---

## The change
The menu insights lived behind a **floating bottom-right rainbow FAB** (v69) with a v71 swipe-to-hide + edge-tab
dismiss. Max (relaying a user) wanted it **static and discoverable**: a pill in the menu actions row. It's now an
**"EzPlate Insights" pill** parked at the **RIGHT edge** of the Menu `.panel-actions` card row (above the Delete
button) — a rainbow-gradient **outline**, with the **text painted in that same rainbow** (gradient-clipped) and a
**generic four-point AI sparkle** icon. Tapping it drops the **same panel** down from the pill with the **same spring**
(`msugPop`), same content, same open/close/outside-click/Escape/focus behaviour. Panel title is now just **"Menu
insights"** (was "What stands out on this menu").

**On the icon (Max asked about the Gemini logo):** we deliberately do **not** use Google's actual Gemini logo — it's
their trademark, and embedding the official mark as UI decoration in a commercial third-party app isn't covered by
fair use (Google's brand guidelines gate it). The pill uses a **generic four-point sparkle** — the now-ubiquitous,
vendor-neutral "AI" glyph — in the rainbow gradient, which reads as AI/Gemini-adjacent without appropriating the mark.
The honest "Refined by Gemini" text credit in the panel is unchanged.

## What moved / what went
- **HTML (`index.html`):** the `#menuSuggestFab` wrapper (with `#menuSuggestBtn` + `#menuSuggestPanel`) relocated from
  the end of `#tab-analysis` INTO the `.panel-actions` row, placed **after** the `.panel-sub` strapline (so the
  strapline's flex-grow pushes the pill to the right edge on desktop). The trigger is `<button class="msug-pill">`
  with a `.msug-pill-spark` inline sparkle SVG + a `.msug-pill-text` span ("EzPlate Insights"). **Removed:** the old
  rainbow-logo SVG, the `.msug-restore` edge tab, the `.msug-foot` / "Hide the suggestions button" control.
- **CSS (`css/style.css`):** `.msug` is now `position:relative; display:inline-flex` (an inline positioning context,
  was `position:fixed` bottom-right); `.an-head .msug{margin-left:auto}` parks it at the right edge, and
  `@media(max-width:639px){.an-head .panel-sub{order:1}}` keeps the pill with the buttons while the strapline drops
  below on phones. New `.msug-pill` — rainbow border via `linear-gradient(...) padding-box, linear-gradient(rainbow)
  border-box`, `--radius-pill`, sized to the `.btn` row (fully opaque). `.msug-pill-text` paints the label in the
  **same rainbow** via `background-clip:text` + `-webkit-text-fill-color:transparent`; `.msug-pill-spark` is the
  15px sparkle glyph (gradient-filled in the SVG). The panel anchors `left:0; top:calc(100% + sp-2); z-index:60`
  (drops DOWN), `transform-origin:top left`, and `msugPop` flipped to `translateY(-20px)→0` so the spring plays
  downward out of the pill. **Removed:** all `.msug-btn` / `.msug-logo` / `.msug-pill-dot` / `.msug-restore*` /
  `.msug-foot` / `.msug-hide` / `.msug.dismissed` rules and the desktop `@media(min-width:1024px) .msug{...}`
  reposition. (`.panel` is `overflow:visible`, so the drop-down isn't clipped.)
- **JS (`js/app.js`):** `menuSuggestOpen/Close/Toggle` kept (comment updated; behaviour identical). **Removed entirely:**
  `loadSuggestFabHidden`, the `suggestFabHidden` var, `applySuggestFabDismissed`, `setSuggestFabHidden`,
  `suggestFabDismiss`, `suggestFabRestore`, the pointer-swipe-to-dismiss wiring, and the `bootstrapSync`
  `suggest_fab_hidden` read. `renderMenuInsights` shows/hides the **pill** by whether the menu has anything to say
  (unchanged logic, minus the dismissed toggle). `wireMenuSuggestFab` now wires only: pill click → toggle, × → close,
  outside-click → close, Escape → close.

## Retired contract (deliberate)
The **v71 swipe-to-hide / rainbow edge-tab / persisted `suggest_fab_hidden` setting is GONE** (Max's call — a static
inline pill is never "in the way", so there's nothing to hide). An old `suggest_fab_hidden` value left in a user's
Supabase settings or localStorage is simply **ignored** — no reader remains, no migration needed. The v71 smoke
assertions for dismiss/restore/persist were removed and replaced (see below); this is a pinned-contract change, noted
here and in the PR.

## Tests / verification
- **jsdom smoke [16]** Suggestions section rewritten to the pill: shown when the menu has insights; lives inline in
  `.panel-actions` (not a fixed FAB); reads "EzPlate Insights" with the accessible label + rainbow dot and **no SVG
  logo**; starts closed; tap opens (aria-expanded flips) + focus moves into the panel; same `.mi-line` content +
  credit; re-tap toggles closed; × closes + focus returns to the pill; Escape closes; the `.msug-restore` /
  `#menuSuggestDismiss` edge-tab and the `suggestFabDismiss`/`suggestFabHidden` API are **gone**; a menu with nothing
  to say hides the whole pill.
- `npm test` **287 green** (unchanged — the engine/node tests don't touch this surface). `node -c` clean (app.js +
  sw.js). Settings version pin passes. Six spots → **v74**.

## Needs Max's phone (motion + layout only show on device — nothing here is browser-verified)
At **380px and desktop, both themes**, then with **OS reduced-motion ON** (spring should drop out):
- The insights trigger: on **desktop (≥640px)** it's the full **"EzPlate Insights" pill** at the RIGHT edge of the
  Menu card (rainbow outline + gradient-clipped text + sparkle) — **watch the gradient text contrast** in light mode
  (the orange stop is the lowest-contrast on a light surface; bump the text to a solid accent if it reads weak), and
  confirm it isn't invisible on any browser lacking `background-clip:text`. On **phones (<640px)** it FLOATS as a
  small rainbow **AI circle bottom-right** (Max: inline overcrowded the header) — same rainbow outline + gradient
  sparkle as desktop; the panel springs UP out of it (`msugPopUp`). Check it sits above the bottom nav, doesn't
  overlap content, and the panel opens fully on-screen.
- **The refined insights on your REAL menu** (the whole point of the quality pass): re-read them for — no tautologies
  ("X is 100% of…"), no "small tweak"/"worth a look" filler, specific figures present (points AND ¢/$-per-serve, the
  cost driver, "up N% this month" where history exists), 4–5 on the full menu spread across DIFFERENT types, each
  scannable in one glance. Confirm a healthy menu still shows the one warm line, and a big healthy menu isn't padded.
- **Tap → the panel springs DOWN from the pill** (the signature moment, now downward); the panel isn't clipped and
  doesn't run off the right edge at 380px (it anchors to the pill's left; if the pill ends up mid-row on some width,
  watch for right-edge overflow — flag if seen).
- ×, outside-tap, Escape all close it; a re-tap toggles; keyboard focus lands in the panel on open and back on the
  pill on close.
- Confirm the old floating bottom-right button is fully gone and nothing else shifted on the Menu tab.

## Added same-branch — insight quality: depth without prescription (brief `~/Downloads/ezplate-opus-insight-quality.md`)
Refines the menu-insights ENGINE (architecture unchanged: deterministic facts + optional Gemini phrasing,
numbers validated, offline→templates, point-don't-prescribe). Pure `js/app.js` + `api/_insight.js` + tests.

- **Rule 1 — the NON-OBVIOUS guard (`nonObvious`).** The menu table already shows name/cost/suggested/current/
  variance/light. Every candidate now declares the dimension it ADDS — `cross` (an ingredient's reach across
  dishes), `composition` (which input dominates a plate), `movement` (a logged price change), or `comparative`
  (menu-wide standing / outlier). `deriveInsights` filters out anything without one before selecting. A line that
  only restates "over target" is dropped.
- **Kill the tautology (`dishDriver`).** A dish's dominant-ingredient "driver" only counts with **≥2 ingredients
  AND a 40–90% top share** (thresholds chosen: >40% = genuinely dominant, <90% = not a single-ingredient
  restatement). So "Chips is 100% of Medium Chips" never fires. `computeInsights` now puts `count` (distinct
  ingredients) + the dominant ingredient's `movePct` (via new `ingMovePct`) on each dish's `top`.
- **Rule 2 — depth = SPECIFIC NUMBERS, not prescriptions.** Over-target types (`insReprice` 2–11pts, `insNearMiss`
  1pt, `insCut` ≥12pts) now carry the gap in BOTH points AND $/serve (`overServeFmt`: cents under $1, dollars
  over) PLUS the cost driver (share + "up N% this month" where history exists). They only fire when a real driver
  exists (else the dish is just "over target" → left to the summary count). Filler gone ("worth a rework", "a
  small tweak would bring it home", "biggest lever").
- **CRITICAL-only (Max, follow-up):** two types that stated a fact without anything to act on were **REMOVED** —
  `insPortion` (standalone "X ingredient is Y% of this plate's cost") and `insBest` ("X dish has your best margin").
  Composition now survives ONLY as the driver clause on an over-target line, where it explains a real problem. What
  remains are genuinely critical/actionable: over-target (reprice/cut/near-miss), cost volatility, price movers, and
  shared-ingredient leverage (the benchmark). When nothing critical exists the menu is "practically perfect" → the
  one all-healthy line is all that shows.
- **Scaling curve (new):** 1→≤1, 2–5→≤2, 6–15→≤3, 16–29→≤4, 30+→≤5; still never padded (a healthy big menu shows
  fewer). Spread across DIFFERENT types (`selectInsights` keeps ≤1/kind).
- **Phrasing — shorter, denser (`_insight.js` + client `gemPhrasingOk`):** one sentence, front-loaded; **hard word
  cap 24** (target 12–20) + a **single-sentence check** (a `.!?` followed by more text → reject; decimals like
  "$1.50" are safe); prompt tone shifted from "warm & conversational" to sharp/economical. A too-long/multi-sentence
  Gemini line → template stands. Numbers stay AI-untouchable (existing validation).
- **Tests:** `insights.test.js` rewritten (non-obvious guard, driver-gated over-target with pts+$/serve+driver,
  40–90% dominant, scaling bands 1/5/15/29/30+ incl. a "reaches 5 across critical types" + "never padded" pair,
  single-ingredient → no composition, composition-only-as-driver-clause); `api-insight.test.js` +5 (word-cap
  boundary 24/25, multi-sentence reject); `_extract.js` exposes `nonObvious`/`dishDriver`/`driverClause`/
  `overServeFmt` and drops `insPortion`/`insBest`. **Pinned-contract changes made deliberately.** Suite ends at
  **299** node green (287 baseline +17 for the quality pass, −5 net when the two neutral types + their tests were
  removed in the follow-up).

## NOT built / deliberately left
- **No hide/dismiss affordance** — a static inline pill doesn't need one (Max's call).
- **Pill visual = rainbow OUTLINE + rainbow-clipped text + generic AI sparkle** (Max chose outline over a filled
  rainbow; the sparkle is vendor-neutral, NOT Google's Gemini logo — see the icon note above).
- **Engine untouched** — same insights, same phrasing, same "nothing to say → hidden" rule; only the panel TITLE
  changed ("What stands out on this menu" → "Menu insights").
- **No JS popover repositioning** — pure-CSS anchor (`left:0`, drops down). If real-device testing shows right-edge
  overflow at some width, a small `@media` tweak or a right-anchor flip is the follow-up (noted above).
