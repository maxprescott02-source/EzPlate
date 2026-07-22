# HANDOVER v68 — Menu light-chip filter · Suggestions title + honest AI credit · whole-site grid-snap

**Completed:** 22 Jul 2026 · branch `fix/visual-consistency-pass` (PR #13).

Brief: `~/Downloads/ezplate-opus-visual-consistency_1.md`. Branch `fix/visual-consistency-pass` off **v67**
(origin/main was already at v67 — PR #12 `fix/builder-invoice-suggestions` had merged; the v67 CLAUDE.md
"State as of" still described that branch as unmerged). **Client + CSS only — no DB/schema change,
branch-safe.** Baseline **256 green** → **261 green** after; `node -c` clean on `js/app.js` + all four
`api/*.js`; jsdom smoke green (§16 updated, §17 added). **Six spots v67 → v68.**

Invariants held: protected parser region untouched; money stays deterministic (the app computes every
number, the AI only phrases); the naming inversion left alone; no new deps/build step; the live (2nd)
`renderAnalysis` / `aRow` are the ones edited. **Invoice review area left untouched** (documented fragile
zone) — the grid-snap explicitly excluded every invoice selector (see §3).

The three design skills (`/web-design-guidelines`, `/general-design-review`, `/frontend-design`) were the
authority for every spacing/type decision, as the brief directed.

---

## 1 — Menu tab: filter by margin light (multi-select tappable chips)
New chips in the Menu controls row (`.ing-controls`, beside the category filter): **Healthy / Watch /
Reprice** (green / amber / red), each reusing the existing `.dot` colour-key so the chips **double as the
light key** (the v59 legend was removed, so there was nothing to "merge into" — standalone chips are the
clean path). **Multi-select:** tap Reprice → red only; tap Watch too → amber+red (the "everything needing
attention" case, the reason for multi-select over a dropdown).

- **State:** `menuLightFilter` (array; `[]` = show all). **Pure, tested** `lightFilterPass(active, light)`:
  no active lights ⇒ everything passes; else only the active lights (uncosted `'none'` rows drop out under
  any active filter — correct, they have no margin health).
- **Render:** `renderAnalysis` now precomputes each dish's `analyze()` result per section, then
  `.filter(lightFilterPass(menuLightFilter, …))` before emitting the section header (so a fully-filtered
  section shows no stray header). Behaviour with no chips active is identical to before.
- **Folds into the shared reset:** `clearMenuFilters()` clears search + category **and** the light chips;
  the `#menuClearFilters` button shows whenever `q || catSel || menuLightFilter.length`; the empty-state
  "Clear search & filters" action already routes through `clearMenuFilters`.
- **Chips:** `<button aria-pressed>` toggles (WIG: aria-pressed, group `aria-label`, `:focus-visible`,
  `touch-action:manipulation`, hover state). Active = `--accent-weak` (the app's existing active-chip look),
  clearly distinct from inactive. Delegated click handler on `#menuLightChips`. Both breakpoints (chips wrap).
- **Tests:** new `tests/menu-light-filter.test.js` (5) — red-only, amber+red, cleared, order-independence,
  and applied-as-a-row-filter — **independent of render**. Smoke §17 exercises the wiring + fold-into-clear.
- **Wording call:** labels Healthy/Watch/Reprice map directly to `analyze()`'s thresholds (green = at/above
  suggested; amber = up to 15% below; red = >15% below). Easy to reword — say the word.

## 2 — Suggestions: title + honest AI attribution
- **Title** (`.mi-intro`): **"What stands out on {menu}"** replaces v67's "A read on {menu}" (fallback
  "What stands out on this menu"). Personal, works whether the news is good or bad.
- **Attribution** (adopted the brief's **recommended** option — accurate, not the always-on badge): a muted
  corner credit **"Refined by Gemini"** that is **hidden while the deterministic template shows** and
  revealed **only when Gemini actually phrased a shown line**. Mechanism: `gemPhraseInsights` computes
  `refined` = "≥1 line's shown text came from Gemini AND passed the number-check", stores it on the phrasing
  cache, and passes it to `applyPhrasedInsights`, which reveals `.mi-credit` only then. Template-only /
  offline / all-lines-rejected → no credit. So the credit quietly signals exactly when the AI added value.
- CSS: `.mi-credit` is a quiet right-aligned `--fs-xs --muted2` line; `[hidden]` respected. Smoke asserts
  hidden-under-template and revealed-after-valid-rephrasing.

## 3 — Whole-site visual consistency pass (grid-snap)
**Max chose the "Full grid-snap" scope** (over targeted-only / name-tokens) after being shown the audit and
the v31 rollback risk. Executed as spacing/type **only** — no layout restructures, no colour changes, no
card-system changes, no id/class/handler renames (guardrails held). Applied as a **verified replacement
manifest** (each find asserted to match an exact count; a trailing zero-remain sweep confirmed nothing
non-invoice was missed) — **91 non-invoice sites, a clean 91/91 one-for-one token swap** (braces balanced,
zero structural diff), plus 5 later-caught non-invoice sites (`.field` label→input gap, `.mm-row`, `.badge`,
`.kw-row`, `.side-brand`). The trigger case fixed as part of this.

### The audit found 6 systemic patterns, not 96 scattered bugs
The app's spacing is systemically off-grid; the ~96 "clear violations" collapse into de-facto values:
`gap:10px` (~25), `font-size:14px` (~30), `6px` small-gaps (~25), `font-weight:650` (~11), rem font-sizes
(4), and card padding `12×14` vs `14×16`. Full catalogue lived in the audit (subagent, pre-edit).

### Mapping policy (every change justifiable against craft rule #8 + the type scale)
- `gap:10px` → `--sp-2` (8) within action/chip clusters; `--sp-3` (12) between cards / between control rows
  (gaps within a group smaller than gaps between groups).
- `gap:6px` / small block-gaps `6px` → `--sp-2` (8).
- block margins `10px` → `--sp-3` (12); `14px` → `--sp-4` (16).
- `font-size:14px` → `--fs-base` (15) for primary text; `--fs-sm` (13) for dense/tabular/secondary/nav.
- `font-weight:650` → `700`.
- rem font-sizes → nearest token (.9rem→base, .8rem/.75rem→xs, .85rem→sm).
- card padding (`.ing-card`, `.king-row`, analysis card, `.stat-card`, `.hl-card`, dashboard override) →
  unified `--sp-3 --sp-4` (12×16), on-grid.

### Deliberately NOT snapped (JUDGEMENT — documented, left as-is)
- **Entire invoice review area** (`.invtable`, `.ni-*`, `.smem-*`, `.pack-teach`/`.pt-*`/`.tp-tip`,
  `.flag-*`, `.lr-*`/`.loadrow`, `.mp-*`/`.match-prompt`, `.uprice-edit`, `.ai-status`, `.import-summary`,
  `.is-*`, `.corner-toast`, `.cand-chip`, `.price-row`, `.ni-grid`) — fragile zone, brief says don't touch.
- **Interactive control paddings** (button/input/select `11px 18px`, `10px 14px`, etc.) and **touch-target
  dims** (44/76px, `min-height`) — legitimate control/accessibility sizing, off the spacing scale on purpose.
- **Legacy pricing/margin section** (`.pricing`/`.pval`/`.margin`, `.calc-line`) — kept-for-compat and
  price-display-adjacent; low value, excluded to stay clear of anything price-fragile.
- **Improvised heading tier** (17/20/28px on `.mhead h3`, `.brand-text b`, `header h1`, `.total .amt`),
  optical nudges (`2px`), border-widths, radii — not part of the agreed five patterns. **Proposal for a
  later batch:** anchor a title step off `--fs-xl` so the heading tier stops being improvised.

### The trigger (Suggestions card too close to the food-cost line)
Confirmed on-scale, not off-scale — a **rhythm** problem. Fixed by (a) **reordering** the Menu tab so the
Suggestions card sits **above** the food-cost-target line (that line explains the table's "Suggested"
column, so it now sits right above the table), and (b) giving the card a clear section gap
(`.menu-insights` bottom margin `--sp-2` → `--sp-5`; interior padding evened to `--sp-4`). `.panel` is block
flow so the margin governs the separation whether or not the card renders.

## Tests — 256 → 261 green
- `tests/menu-light-filter.test.js` **new** (5): `lightFilterPass` red-only / amber+red / cleared /
  order-independent / applied-as-row-filter.
- `tests/_extract.js` exposes `lightFilterPass`.
- jsdom smoke: §16 updated (new title "What stands out on"; credit hidden-under-template then
  revealed-after-valid-phrasing — a **deliberate pinned-contract change** for the retitle + attribution);
  §17 **added** (chip wiring: red-only → amber+red → toggle-off → Clear resets). `node tests/smoke.js`.
- No logic test needed a change from the CSS pass (pure token swaps).

## Screenshots / Playwright visual
`npm run shots` = `playwright test tests/visual` — a browser IS available in this env and it ran (fresh
screenshots written to `tests/visual/__shots__/` for the audited surfaces). Full suite: **37 passed, 12
failed**; `screenshots.spec.js` and `layout-consistency.spec.js` (panel skeleton identical across all five
tabs) **passed** — a good structural signal that the grid-snap didn't disturb layout. **All 12 failures are
in `fresh-states.spec.js`, and they are NOT regressions:** I re-ran that file against the **v67 baseline**
(git-stash) and it failed the **identical 12** (lines 34/147/173/268/360/479/568/890/914 × breakpoints).
They are the stale DOM-assertion pins HANDOVER-v67 already flagged (e.g. line 173 asserts "Save draft parks
the plate under 'Unassigned dishes'" — machinery **removed in v54**; line 914 asserts the `.es-row` cell
padding symmetry against the pre-existing `td:first-child` 28px right padding, unchanged by this batch).
**My changes added zero new visual-test failures.** Baseline reconciliation of `fresh-states.spec.js`
remains the standing outstanding item — do it once Max signs off the look.

## Needs Max's phone (nothing here is "feel"-verified — no phone in the container)
1. **Menu light chips at 380px + desktop, both themes:** Healthy/Watch/Reprice sit beside the category
   filter; tap Reprice → only red rows; tap Watch too → amber+red; active chips read clearly distinct;
   "Clear filters" appears and resets the chips too; chips wrap cleanly at 380px and read as a legend.
2. **Suggestions card:** title "What stands out on {menu}"; card now sits **above** the food-cost line with
   a clear gap; "Refined by Gemini" appears **only** when the API rephrases (offline/template → nothing).
3. **The grid-snap across every tab + modal, both themes, 380px + desktop** — this is the v31-shaped risk
   Max accepted: walk every screen for even rhythm and confirm nothing reads worse. Highest-attention
   surfaces: dashboard stat/highlight cards (padding now 12×16), ingredient & plate cards, the Menu table,
   empty states, the wizard modal, buttons/nav (font 14→15/13). **Invoice import/review deliberately
   unchanged** — confirm it looks exactly as before.

## NOT built (deliberately)
- No DB/schema change (branch-safe; unrelated to the pending v55 migrations).
- Invoice review area untouched (fragile guardrail) — its off-scale values remain by design.
- No new spacing/type tokens invented — everything snapped to the existing `--sp`/`--fs` scale.
- Heading-tier normalization + a title scale step: listed as a proposal, not built.

## Still outstanding (unchanged from v67)
- The three v55 Supabase migrations still need applying to prod before the v54+ line goes live.
- `fresh-states.spec.js` baseline reconciliation (now also: the grid-snap spacing, the Menu light chips,
  the reordered Suggestions card) once Max signs off the look.
- The diagnostic `GET /api/parse-invoice?probe=1` (gated off) — gate or remove before multi-tenant.
