# HANDOVER — v45 (Fable finishing touches — continuation of the v44 visual batch)

Branch: `fix/pack-control-and-menus` (v42+v43+v44 already pushed; this rides on top).
Ships as **v45** — all six version spots bumped. `npm test` = **131 green**; `node -c`
clean; jsdom smoke passes; **27 Playwright checks pass** (21 existing + 6 new v45
checks), all items verified with rendered screenshots at 380px and 1280px.
v44's handover is finalised/write-once, so this is its follow-up entry, per the batch.

## What shipped

**Item 1 — pack control: one line desktop, two lines mobile, preview line beneath.**
`.price-row` now keeps the price field and the `[qty][unit][✓]` pack row on ONE line on
desktop and stacks them as two centred lines ≤639px (never forced onto one line at
narrow widths). The derive preview ("Was $2.63/kg → will be $3.04/kg") moved out of the
`.pack-teach` span onto its own line beneath both layouts — and it now prefills on first
render whenever the known pack can compute it, instead of appearing only after typing.
One formula feeds both paths: new `invPackPreviewText(r,q,u)` (used by the renderer AND
the input recompute, so they can never disagree). Resolution logic, precedence,
`invRowState` and what ✓ writes: unchanged; all pinned invariants still green.

**Item 2 — mismatch banner reword.** "Priced per kg — set the pack." →
"This item was priced per kg — edit the pack size to determine price per unit."
(The per-kg/per-litre/per-unit word stays dynamic.) No test pinned the old string;
the new one is asserted in the v45 Playwright check.

**Item 3 — Ingredients header order matches Products.** Now title → divider → buttons
row → strapline, both breakpoints. The strapline moved after the buttons in the DOM
(so no flex `order:` juggling), and the divider moved off the header box onto the
`h3` itself via negative side margins — same visual rhythm as the Products `h2`.
Ids/classes/copy untouched.

**Item 4 — button copy.** "+ Existing dish" keeps its full label on mobile (the bare
"+ Existing" lost too much). "+ Add product" → "+ New product" (mobile "+ New"),
including the empty-state CTA and — Max's call — the add-product modal: heading
"New product", save button "Add new product". (I kept a verb on the save button;
a bare noun on the committing button read ambiguously. Flag if you want it literal.)

**Item 5 — dashboard target-line spacing (root-caused).** Same markup, but the chart's
y-scale padded with FLAT units: ±1 always, ±3 total only when the value spread was <4.
7-day windows have tight spreads, fire that branch, and get generous headroom; longer
ranges spread wider and pinned the target line ~1 unit under the chart top. Reproduced
numerically: target-line y was 72.7 (7d) vs 28.7–31.6 (3m/1y) for the same target.
Fix at the root: padding is now PROPORTIONAL (28% of the span each side, span floored
at 4), so every range renders the same headroom fraction. After: 45.6 on every wide
range, 59.7 on 7d (its extra is genuinely data-driven — a tight cluster centres the
band). A Playwright check drives all six ranges and asserts the target line never
hugs the range bar; all six screenshotted.

**Items 6+7 — builder declutter + the 380px overflow regression.**
- "· new"/"· edited" badges: render code REMOVED (both breakpoints, Max's decision).
- Direct-product subtitle: supplier/brand only — the "· CATEGORY" tail is gone; a
  product with no brand now shows no subtitle at all (Max chose this over a category
  fallback).
- The orange "ingredient" pill (`.row2`/`.king-tag` in `renderPlate`): markup removed
  entirely, per the batch — not CSS-hidden.
- Overflow root cause (two parts): the one-row era's `.lc{min-width:78px}` inflated
  small totals ~28px past the card's content box, and the costs row had no guaranteed
  leader width, so the dotted connector collapsed to 0 and the total sat on the card
  border while still "inside the viewport" (which is why v44's viewport-based check
  passed). Fixes: `.line .costs .lc{min-width:0}`, leader `min-width:14px`, qty input
  72→66px, and the price column gets a fixed 116px flex-basis so the leader starts at
  the same x on every row (the drift complaint). The misc "$" gap was the fixed
  32px-wide `.u` span — now content-width for the misc costbox.
- The Playwright check now measures against the CARD's content box, not the viewport,
  plus leader ≥10px, no-badge/no-pill/no-category assertions, and a multi-ingredient
  plate (kid line + branded product + per-unit product + misc) — the exact case that
  broke.

## Judgement calls

- **Item 4 save button** says "Add new product", not the literal "New product" — a
  committing button needs a verb. One-word revert if Max prefers literal.
- **Item 5 pad constant 0.28** ≈ 18% of final plot height above/below the extremes.
  Chosen to reproduce today's 7-day look (verified numerically) while generalising it.
  Long-range lines render slightly flatter than before (data gets 64% of the height
  instead of ~85%) — that's the price of consistent headroom; flag if it reads wrong.
- **Item 1 preview prefill** shows on load for already-resolved rows (taught packs),
  not just after typing — "always-visible control" logic extended to its caption.
  It stays empty (and hides via `:empty`) when no pack price exists on the line.
- The `_measure` probe pattern (temp spec copied into tests/visual, run, deleted) was
  used again for the geometry numbers; nothing temporary is left in the repo.

## Needs Max's phone (branch preview)

**Export a JSON backup first (Settings → Export).**

1. **Invoice review on a REAL import, both orientations**: price + pack on one line on
   a tablet/desktop, stacked and centred on the phone; the "Was … → will be …" line
   updates live as you edit qty/unit; the reworded mismatch banner reads right.
2. **Builder at 380px with a real multi-ingredient plate** — the exact regression:
   totals must sit inside the card with the dotted leader visible on every row; misc
   "$" hugs its field. Check the tighter qty box (66px) still takes 3-digit grams
   comfortably.
3. **Ingredients tab header**: title/divider/buttons/strapline order on the phone.
4. **Dashboard**: flick through all six ranges — the target line should keep the same
   breathing room under the range buttons on every one.
5. Button copy: "+ New product" / "+ New" (Products), "+ Existing dish" (Menu),
   modal "New product"/"Add new product".
