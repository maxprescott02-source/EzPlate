# HANDOVER — v103 (batch 4: Ingredients)

**Branch:** `feature/ingredients-batch` · **Scope:** the Ingredients tab
(`#tab-pantry`) — the smallest cull, plus the tab's one big Part B item: money
was inline in running text. Six version spots v102 → v103.

## The cull table

| Surface | Was | Now | Verdict |
|---|---|---|---|
| Strapline | "The names you cook with — each one links to a product you buy" | unchanged | **KEEP** — the app's one genuinely non-obvious concept; pinned verbatim to STAY explanatory (`terminology.test.js:40`). Max confirmed the asymmetry vs the cut Menu/Plates straplines is the right answer. |
| Link-a-product hint (kingModal) | "…Switch it later and every plate follows — one tap, not a rewrite." (17w) | "Plates cost from this product. Switch it later and every plate follows." (12w) | **COMPRESS** — the surviving text is exactly the pinned portion (`terminology.test.js:45`); no pin change needed. |
| Read-only category hint | "Set by the linked product — change it on the Products tab or in Settings → Tidy lists." (16w) | "Follows the linked product." (4w) | **COMPRESS** |
| Usage line ("Used in N saved plates…"), wizard copy | unchanged | — | **KEEP** — blast-radius anchor; onboarding guidance (excluded category, v86 pins). |

## The figure column (the tab's biggest Part B deviation, fixed)

`kingProductLabel` used to bake the price into the sentence — "Chips 10mm
Straight Cut — Safries · $2.68/kg" in a 13px two-line-clamped text line, so the
MONEY was the first thing ellipsis ate on long names. Now:

- `.king-link` carries name — brand only (clamp still 2 lines, pin intact).
- The unit price renders as **`.king-price`** in the card's second grid column
  — right-aligned, mono, `--fs-md`, self-anchored ("$2.68/kg") — the exact
  `.ing-price` idiom, so ingredient and product cards read identically (the
  v67 intent, completed).
- A missing product renders NO price and keeps "(product missing)".
- Renderer-only change in a non-fragile area; `kingSearchFilter` reads data
  fields, not the rendered label, so brand search is untouched (smoke [6]
  still green). No test pinned the old string format (verified).

## Other visual

- `.king-row` radius 12px → `--radius-card`; `#kingList` 8px seam at
  ≥640/≥1024, top edge on-scale (sp-5 sides stay, per the edge-scale ruling).
  These selectors are `#kingList`/`.king-row`-own — no cross-tab sharing, so
  edits went in directly (unlike the Plates batch's scoped overrides).
- Left as listed dead code (the 26 Jul audit's item, not this sequence):
  `.king-tag` CSS, the overridden `.king-row` base margin.

## Verification

- `npm test` 509 green · `node -c` clean · smoke green (25 sections).
- Playwright **91/91** run alone, normal wall-clock.
- Throwaway spec: both themes × 380/1280 — price in a right-aligned mono
  column hugging the card edge, sentence contains no `$`, missing-product row
  has no price element, radius/seam on-token, both compressed hints verbatim.
  Screenshots eyeballed — the card now mirrors the Products card exactly.
- CodeRabbit: 0 findings.

## Needs Max's phone (v103) — plus the two carried D-items

1. Ingredient cards with the price column at 380px: long product names now
   wrap into the space the price vacated — does the column read at arm's
   length, and do prices down the list scan as one axis?
2. The two compressed modal hints in situ ("Follows the linked product." is
   the tersest line shipped so far — five-second test it).
3. **D1 (v86 carried):** the strapline in situ.
4. **D2 (v86 carried):** the setup-from-products wizard — progress and done
   states.

Carried forward: the rest of the v82–v102 phone list.
