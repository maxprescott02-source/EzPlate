# HANDOVER — v102 (batch 3: Plates)

**Branch:** `feature/plates-batch` · **Scope:** the Plates tab's approved cull
+ Part B checklist. Six version spots v101 → v102.

## The cull table (62 explanatory words → 19, −69%)

| Surface | Was | Now | Why |
|---|---|---|---|
| Strapline (index.html:89) | "Your costed plates — save here, publish to a menu when the price is right" (14w) | **CUT** | The buttons and Unpublished/On-menu badges carry the model. |
| `#builderHint` default text (index.html + the js re-setter) | "Build plates from your ingredients. New ones are added on the Ingredients tab." (13w) | **CUT** | The search dropdown says the same thing at the decision point (pinned, staying). The ELEMENT stays: the no-ingredients empty state (a KEEP) renders into it — JS now hides it otherwise. |
| Docket hint | "Tap a price to update it — changes apply everywhere and save automatically." (12w) | **COMPRESSED** — "Tap a price to edit — changes apply everywhere." | Tappable chips are non-obvious on touch; "everywhere" prevents the costing surprise. |
| Manage-menus modal | "Add this plate to a menu (each gets its own price), or remove it from one. The plate itself stays in your library." (23w) | **COMPRESSED** — "Each menu prices it separately — the plate always stays in your library." | Both mistake-preventing facts survive. |

KEEP: the misc-cost inline example, the pinned no-match dropdown strings, all
docket warnings/tooltips, draft/resume copy.

## Visual

- **Shared-CSS discipline** (the batch-0.5 lesson): `.ing-list`/`.ing-card`
  are shared with Products, so every RENDERING change is `#plateList`-scoped —
  8px seam at ≥640/≥1024, on-scale top edge at ≥1024 (sp-5 sides kept per
  Max's edge-scale ruling), radius → `--radius-card`. Products' batch applies
  the same values and can then promote them to base, deleting the scoped
  block. Value-identical token swaps (12px→`--fs-xs` etc.) went in at base —
  zero rendered change on either tab.
- **The `.ing-tag` system-dark gap is FIXED at base** (flagged in the v99
  handover): the dark chip tint was `[data-theme="dark"]`-only, which misses
  system-dark because `applyThemePref` removes the attribute on "system".
  Added the media-query variant. This is a bug fix completing an existing
  app-wide rule's intent, not a design change — verified via the system-dark
  path in the throwaway spec (no `data-theme` attr, `colorScheme: dark`).
- **Kept, with reasons**: `.suggest-drop`/`.cat-drop` shadows (floating
  layers legitimately cast — same per-surface call v99 made); the `.ing-tag`
  rgba tint (a chip label, not a card — no third-tone violation); per-card
  right-aligned prices without a fixed-width column (cards in a grid don't
  share a figure axis the way list rows do — the v98 column rule targets
  rows in one list).

## Verification

- `npm test` 509 green · `node -c` clean (app.js touched — the builderHint
  setter) · smoke green.
- **Playwright 91/91.** One run took 49 MINUTES (baseline 1.7m) and reported
  88 passed with phantom fails — the machine had slept or degraded mid-run;
  the recovered rerun was 91/91 in 1.7m. Third occurrence of the v98 pattern;
  check wall-clock before believing failures.
- Throwaway spec: both themes × 380/1280 — strapline gone, radius/seam
  scoped values confirmed, chip tint correct under SYSTEM-dark, builder hint
  hidden-and-empty with ingredients present, both compressed lines verbatim.
  Screenshots eyeballed.
- CodeRabbit: one run reported `findings:1` but the payload was never
  delivered; two full reruns on identical changes returned 0 findings.
  Noted rather than hidden.

## Needs Max's phone (v102) — this batch also clears the B-block backlog

New this batch:
1. Plates cards: 16px radius + 8px seam at tablet/desktop widths — glance check.
2. Builder popup: no hint under the search (with ingredients); the compressed
   docket line; the no-ingredients empty state still appears on a fresh install.
3. The Manage-menus modal one-liner in situ.
4. Chip tint on plate cards in dark mode with theme = System (the fixed path).

Carried B-items to clear in the same pass (v82–v86, all on this tab):
B1 draft resume round-trip · B2 re-entry guard (+ no-nag after save) ·
B3 live margin preview vs Menu row · B4 sticky Save reachable · B5 "Add to a
menu" wording · B6 no-match dead-end lands on Ingredients · B7 empty-plate
no-match shows message only · B8 unnamed-plate refusal stays put · B9 printed
docket copy.

Carried forward: the rest of the v82–v101 phone list.
