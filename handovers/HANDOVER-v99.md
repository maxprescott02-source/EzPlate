# HANDOVER — v99 (batch 0.5: global chrome)

**Branch:** `feature/global-chrome` · **Scope:** Max's batch 0.5 from the
Batch 0 audit response — the four one-liners with app-wide blast radius,
isolated from the per-tab batches precisely because they change every tab at
once. CSS-only apart from the version bump. No copy, no layout, no markup.

## What changed

1. **`.panel` `--shadow` → `--elev`** (style.css §4). One edit site; every
   non-dashboard tab's cards now follow the v98 two-mode rule — cast shadow in
   light, none in dark (dark depth = the surface step). Dashboard panels were
   already on `--elev` and are unchanged (re-verified against the v98 pin).
2. **`.bottomnav`** — the mobile bar's literal `0 -4px 18px rgba(56,38,30,.08)`
   became a new two-mode token **`--elev-nav`** (same value in light, `none` in
   dark). At ≥640px the element is the sidebar, which already declared
   `box-shadow:none` in both modes — desktop needed nothing.
3. **`.ptr-ind`** — base shadow → `var(--elev)`. The `.ready` state was the
   subtle one: it composites the release-ring with the cast shadow, and
   `box-shadow: <ring>, none` is INVALID CSS — the whole declaration would drop
   and dark mode would lose the functional release affordance. New token
   **`--elev-cast`**: `var(--shadow)` in light, `0 0 rgba(0,0,0,0)` in dark — a
   transparent no-op that is legal inside a shadow list. Ring survives both
   modes; only the cast disappears in dark.
4. **`.ing-per` un-hidden** — deleted `.ing-price .ing-per{display:none}`
   (§27). The original `display:block;font-size:11px;color:var(--muted2)` rule
   (§ingredient cards) takes over again. Product cards show the price basis
   ("per kg / per litre / per unit" from `ingUnitLabel`), plate cards show
   "plate cost" / "not costed yet". Reclassified by Max from polish to
   correctness-visibility (the v20 eggs-bug field); a comment at the removal
   site says not to re-hide it for density.

Six version spots v98 → v99.

## Judgement calls

- **Tokens, not per-component dark overrides.** `applyThemePref` REMOVES
  `data-theme` when the pref is "system", so `[data-theme="dark"] .x` override
  rules silently miss system-dark. Tokens defined in all three root blocks
  (light, `[data-theme="dark"]`, media-query dark) are the only pattern that
  covers both mechanisms — same reason `--elev` itself is a token. Noted in
  passing: the existing `[data-theme="dark"] .ing-tag` override (style.css
  ~1146) has exactly this system-dark gap — latent, pre-existing, NOT fixed
  here (strict scope); it belongs to the per-tab batches touching `.ing-tag`.
- **`--elev` value untouched.** Considered making dark `--elev` a transparent
  shadow instead of `none` so it could composite — rejected: the v98 Playwright
  pin asserts computed `none` on dashboard cards, and "none" is the honest
  value. Hence the separate `--elev-cast`.
- **Other `--shadow` consumers deliberately left**: `.suggest-drop`,
  `.cat-drop` (builder dropdowns), `.ni-panel`, invoice-row cards,
  `.import-summary`, `.tipbox` (`--shadow-lg`), `.shadow-float`. These are
  per-tab or floating-layer calls for their own batches (floating layers may
  legitimately keep shadows in dark — that's a design decision batches 1–5
  make per surface, not a global sweep).

## Verification

- `npm test` **509 green** · `node -c` clean (app.js, sw.js) · jsdom smoke
  green (24 sections).
- Repo Playwright suite run alone: **90 pass, 1 fail** — the fail is the
  known-stale v45 button-copy pin, red on unmodified main (reconciliation is a
  batch 1 item per the approved sequence). Identical to baseline.
- Throwaway computed-style spec (scratchpad, not committed): light+dark ×
  380/1280 × all four tabs — panels `--elev`-correct everywhere, bottomnav
  two-mode at 380 / `none` as sidebar, `.ptr-ind` two-mode with the ready-ring
  present in BOTH modes, `.ing-per` visible with correct text on Products and
  Plates cards, dashboard elevation unchanged. 4/4 green.
- CodeRabbit on the diff: **0 findings**.

## Needs Max's phone (v99)

1. **Dark mode, all four tabs**: cards no longer cast shadows — does depth
   still read on the real OLED, or do panels now blend into the page? (The
   dashboard made this call in v98; this extends it app-wide.)
2. **Dark bottom nav**: the bar now separates from content by its top border
   alone — still reads as chrome?
3. **Pull-to-refresh in dark**: spinner puck shadowless; drag to the threshold
   and check the orange ready-ring still announces "release" clearly.
4. **Product cards at 380px**: every card gained a second line ("per kg" etc.)
   under the price — check density/wrap on the real catalogue, both themes.
5. **Plates tab**: uncosted plates now say "not costed yet" under the dash —
   confirm that reads as information, not clutter.

Carried forward: the v82–v98 phone list (61 items, inventoried in the Batch 0
audit, `~/Downloads/ezplate-batch0-audit.md`), minus the five struck-as-
superseded items.
