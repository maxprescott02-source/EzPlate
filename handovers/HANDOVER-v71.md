# HANDOVER v71 — Suggestions refinement: point, don't prescribe · remembered packs → Settings · dismissable Gemini FAB · builder gap

**Completed:** 22 Jul 2026 · branch `feature/suggestions-refine` · brief `~/Downloads/ezplate-opus-suggestions-refine.md`.

Branch off **v70** (`origin/main` = `48358e5`, PR #15 merged). Baseline **274 node tests green**, jsdom smoke green,
six spots v70. Ended **271 node green** (net −3, deliberate — see Tests), jsdom smoke green (incl. new v71 checks),
`node -c` clean (app.js, sw.js, all four `api/*.js`), six spots → **v71**.

Client + one server prompt + tests only. **Zero contact** with the protected parser region, the money law, the
naming inversion, or the plate/dish/menu data model. No new deps, no build step.

---

## 1 — Suggestions now POINT, never PRESCRIBE (engine: `js/app.js` + `tests/insights.test.js`)
The engine names a cost problem and its size, then stops. It no longer dictates a fix.

- **Substitution REMOVED entirely.** `insSub` and its matcher `subCandidate` are gone (and dropped from
  `_extract.js` + the `subs` bundle in `computeInsights`). Rationale (Max): the cost engine can't know two
  products are culinarily interchangeable (a burger patty vs a sausage patty are just two meat products to it),
  and the substitute a cook actually reaches for may not be in the supplier data at all — a class of error no
  data fixes.
- **`insReprice`** (over-target, 2..11 pts): dropped the `$X target price` directive. Now *"… is running N pts
  over your M% target at $P — worth a rework when you get to it."* Threshold raised `pts>=1`→`pts>=2` so a 1-pt
  dish is owned solely by `insNearMiss` (no double-flagging).
- **`insNearMiss`** (1 pt over): dropped the *"$X → $Y"* nudge. Now *"… is a whisker over … a small tweak would
  bring it home."*
- **`insPortion`** → "costly dominant ingredient": dropped the prescribed *"15% smaller portion saves $X"*. Now
  *"Fish is 60% of Barra & Chips's cost — the biggest lever on this plate if you want to bring it down."* `top`
  is now just `{name, share}` (no `trimPct`/`saving`).
- **Unchanged (already point-not-prescribe):** `insVolatility`, `insShared`, `insMover`, `insBest`, `insSummary`,
  `insCut` (the "Rework/drop" framing). `insTargetPrice` was removed (its only callers were reprice/nearmiss).
- **Money law intact:** every number still computed by the app; the removals only take numbers AWAY. A new test
  scans a rich menu's output and asserts no line contains a swap / prescribed-portion / "raise to $X" directive
  and no `facts.targetPrice` anywhere.

## 2 — Tone: personal, constraint-aware (server prompt: `api/_insight.js`)
`buildInsightPrompt` re-steered: a consultant who *knows this café* — warm, observational, varied sentence
shapes. Two hard tone constraints added: (a) POINT don't prescribe (never tell them to swap/reportion/set a
price); (b) **never default to "charge more"** — reprinting menus is expensive here, so frame as "worth a look" /
"keep an eye on", not an order. Deterministic facts unchanged underneath; the number validator
(`validatePhrasing`) still discards any phrasing that invents a figure; offline → templates. No API contract
change (`api-insight.test.js` still 8 green).

## 3 — Suggestion COUNT scales with menu size (`deriveInsights`)
Cap now derives from the costed-dish count: **1 dish → ≤1, 2–5 → ≤2, 6+ → ≤3**. `selectInsights` only ever
returns real candidates, so a sparse menu shows fewer — nothing is padded to reach the cap. Pinned by three new
tests (1→≤1, 4→≤2, 8→≤3).

## 4 — All-healthy menu → ONE warm line (`healthyLine`, in `deriveInsights`)
When nothing is over target, `deriveInsights` short-circuits to a single warm, seed-varied line from a 4-line
pool (e.g. *"This menu's in good shape — every one of its N costed dishes is holding at or under M%."*) instead
of stacking positives. Only reached when it's genuinely true. Carries only the count + target % as facts, so the
Gemini number-check still passes.

## 5 — Remembered packs: moved to Settings, made READ-ONLY (decision, confirmed by Max)
**Editability:** a taught pack is user-confirmed ground truth the app relies on for correct costings, so the
list is now **view + Remove only** — the inline quantity edit is gone (it risked silently miscosting, the same
reason pack/unit are create-only on products). The deliberate correction path is **Remove**, then let the next
invoice that includes the line re-teach the right size. The teaching flow + precedence chain are **untouched**.
**Placement:** the "Remembered items" link was removed from the (already busy) invoice import modal; a
**"Remembered packs →"** door now lives in **Settings**, next to Tidy lists (`#setSmemOpen` → `openSmem`, closes
Settings first like `setTidyOpen`). The `#smemModal` copy is updated to say it's read-only and how to correct.
Dead `.inv-smem-row` CSS removed; new read-only `.smem-qty-ro`.

## 6 — Gemini Suggestions button: swipe-to-dismiss + restore + persist (decision, confirmed by Max)
- **Dismiss:** swipe the rainbow button rightward (touch, gesture scoped to the button so it never fights page
  scroll — a small move is still a tap that toggles the panel; only a clear horizontal drag >40px dismisses, and
  the trailing click is swallowed), OR a clearly-labelled **"Hide the suggestions button"** control in the panel
  foot (desktop + non-swipe path — chosen over a cryptic × on the button).
- **Restore:** a **slim rainbow edge tab** (`.msug-restore`) hugs the screen's right edge once dismissed —
  low-profile, never lost. Tapping it brings the button straight back.
- **Persist + scope:** **GLOBAL** (one `cafeDB_suggestFabHidden` flag + `dbSetSetting('suggest_fab_hidden')`,
  read back in `bootstrapSync`). Rationale: the user hides the assistant because it's in the way, not because of
  one menu — a per-menu flag would flicker it back on every menu switch and read as broken. Survives reload and
  syncs across the café's devices. Focus follows onto the restore tab on dismiss and back to the button on
  restore. Pinned by a smoke round-trip (dismiss → persists '1' → re-render stays dismissed → restore clears).

## 7 — Builder Name↔Category gap tightened (`css/style.css`)
Root cause: three spacing sources stacked between the name field and the category field — `#platePanel .pad`
bottom padding (sp-6=24), the empty `.plate-tools` ghost margin (sp-3=12), and `.plate-cat-field` top padding
(sp-5=20) ≈ 56px. Fix: dropped the name `.pad` bottom padding to 0 (heading→name top sp-6 untouched — brief
requirement) and trimmed `.plate-cat-field` top sp-5→sp-2, leaving a clean ~20px field step (tools margin 12 +
cat top 8). No `:has()`, token-only. Save/Print buttons + section heading untouched.

## Tests / verification
- `npm test` = **271 green** (was 274). Net −3 is deliberate: `insights.test.js` rewritten for the
  point-not-prescribe contract — removed the 4 `subCandidate`, 3 `insSub`, and 1 `insTargetPrice` pins (features
  gone), added count-scaling (×3), the warm-line (×1), and the point-not-prescribe scan (×1). `_extract.js`
  updated to expose `healthyLine`, drop the three removed fns.
- jsdom smoke green, incl. new **[16] v71** dismiss/restore/persist round-trip.
- `node -c` clean on `js/app.js`, `sw.js`, and all four `api/*.js`.

## Needs Max's phone (nothing here is browser-verified — no browser in this env)
- **Suggestions content** across menu sizes, both themes: a **1-item menu** (≤1 line, no padding), a **full menu**
  (varied shapes, non-prescriptive — no swap / portion-size / "raise to $X" directives), an **all-healthy menu**
  (one warm line), and the Gemini phrasing reading personal, not templated, and NOT leaning on "charge more".
- **The Gemini FAB at 380px, both themes, bottom-right:** swipe-right to dismiss → the slim rainbow edge tab
  appears at the right edge (no bottom-nav overlap) → tap restores; the "Hide the suggestions button" link in the
  panel; the dismissed state surviving a reload.
- **Remembered packs in Settings** (view + Remove, read-only qty); confirm it's gone from the invoice modal.
- **Builder Name & Save:** the tightened name↔category gap at 380px + desktop.
- **`fresh-states.spec.js` / `npm run shots`** (Playwright, not runnable here): the builder `#platePanel` spacing
  and the new FAB markup may shift visual pins — re-run on a browser env and reconcile if needed.

## Follow-ups added same-branch (Max, after first review — still v71, one deploy)
- **Gemini button translucent at rest.** `.msug-btn` now sits at `opacity:.5` and goes fully opaque on
  hover / focus-visible / active / when the panel is open (opacity added to its transition). Low-profile until
  wanted; on mobile it's translucent until tapped (tap opens the panel → opaque).
- **Invoice suggested-match chips: full name on hover / long-press.** The `.cand-chip` label is truncated (JS
  slice + CSS ellipsis), so the full "description · brand" is now on the chip's `title` (desktop hover) and
  `data-full` (mobile). On mobile a **long-press (~450ms, movement-cancelled)** reveals it via `toast` and
  swallows the trailing click so it can't also select the match; `-webkit-touch-callout:none` suppresses the iOS
  callout. Additive to the fragile invoice-review render — no change to row state / `invRowState` / auto-tick /
  the re-render path; the chip's selection onclick is unchanged except for the long-press guard. Smoke pins the
  `title`===`data-full` exposure.
- **Swipe-to-dismiss now works on desktop.** The FAB dismiss gesture was touch-only (dead with a mouse). Rewired
  to **Pointer Events** so a mouse drag OR a finger drag rightward past the threshold dismisses; the button
  tracks the cursor for feedback and snaps back; a completed drag swallows the trailing click. `touch-action:none`
  on the button keeps a touch-drag from scrolling the page. The panel "Hide the suggestions button" link remains
  as the click-only path.

## NOT built / deliberately left
- No change to how packs are TAUGHT or to the price-precedence chain (item 5 was placement + editability only).
- No `×`-on-the-button dismiss badge — the panel-foot "Hide" link + swipe cover both input modes more clearly.
- Purchased-quantity capture for v55 §I (needs a protected-region edit) — still the standing optional item.
