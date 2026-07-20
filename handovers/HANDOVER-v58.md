# HANDOVER v58 — Empty states: one system, every tab

Branch: `feat/plates-independent-library` (continues v54–v57, off `main` @ v53).
Brief: `~/Downloads/ezplate-opus-empty-states.md`. **NOTE:** the brief said "branch off main",
but every earlier symptom it describes (Plates search-empty, the removed Builder tab, the v57 icon)
only exists on THIS branch — main is still v53. Continued here; do not branch off main for this.

Baseline before: 150 green, smoke green, `node -c` clean, six spots at v57.
After: **157 green (150 + 7 new), jsdom smoke green, `node -c` clean, six spots at v58.**

## Root cause (what was actually wrong)
Empty-state markup/copy was written inline at each render site and had drifted apart: Products'
search-empty was a bare `.an-empty ing-empty` div; Ingredients' was bare `<div class="empty">No
ingredients match</div>` (no glyph, no action); Plates' was the v56 `.plate-noresult` one-off;
Menu's was a hand-built `.an-empty-box` with its own SVG and a "Clear search" link. Four render
sites, four looks, inconsistent labels ("Clear search" vs "Clear filters"), and stale copy
(Menu pointed at the removed Builder tab).

## The fix — ONE empty-state system (`js/app.js`, near line 920)
All four tabs now build their empty state through the shared helpers; there is exactly one place
empty-state markup is constructed. The marker class **`es-built`** is emitted only by the helper.

- `emptyStateHtml(icon,title,body,actionsHtml)` — **variant B (true-empty)**: glyph + headline +
  guidance + real action button(s). Now stamps `es-built` and omits the `<p>` when body is empty.
- `emptySearchState(icon,noun,clearFn)` — **variant A (search/filter-empty)**: glyph + "No {noun}
  match." + exactly ONE action, the same label on every tab — **"Clear search & filters"** —
  wired to that tab's clear fn. Never carries getting-started guidance (routes through
  emptyStateHtml with an empty body, so it can't).
- Four global clear fns — `clearProductFilters` / `clearIngredientFilters` / `clearPlateFilters`
  / `clearMenuFilters` — reset that tab's search AND any active filters, then rerender. They are
  shared by BOTH the empty-state action and the header "Clear filters" button (Products/Plates),
  so those can never diverge again.
- `ICON_MENU_BIG` added (the Menu nav glyph — ascending bars) so Menu's empty state uses the
  standing rule (empty-state glyph == the tab's own nav glyph). Verified all four glyphs post
  icon-churn: Products=box, Ingredients=tomato, Plates=fork+knife (v57), Menu=bars.

### Variant selection (B only when the collection is genuinely empty)
- Products: B when `!PRODUCTS.length`, else A. Ingredients: B when `!kitchenIngredients.length`,
  else A. Plates: B when `!savedPlates.length`, else A. Menu: A when the current menu HAS dishes
  but the search matched none (`MENU.filter(inMenu).length` > 0), else B.

### Copy (per the contract)
- Products B: "No products yet." / "Import an invoice or tap '+ New product'." (+ Import/New buttons)
- Ingredients B: "No ingredients yet." / "Tap '+ New ingredient' or set up from your products."
- Plates B: "No plates yet." / "Tap '+ New plate' to cost your first dish."
- Menu B: "Nothing on this menu yet." / "Publish a plate from the Plates tab to see it here."
  (the stale "cost a plate in the Builder" copy is gone — the Builder tab no longer exists.)
- All A: "No {products|ingredients|plates|menu items} match." + "Clear search & filters".

### Deleted / rerouted
- Inline variants removed entirely: `an-empty ing-empty` (Products), bare `.empty` "No ingredients
  match" (Ingredients), the v56 `.plate-noresult` block + its CSS (Plates), the `.an-empty-box` /
  `#anClearSearch` menu markup + its per-render binding (Menu).
- Header "Clear filters" buttons (`#ingClearFilters`, `#plateClearFilters`) now call the shared
  clear fns. They were already in the same slot with the same class/hide-when-inert behaviour, so
  no markup move was needed — just the handler dedupe. Menu/Ingredients stay search-only; their
  empty-state action still uses the shared "Clear search & filters" label regardless.
- Menu's empty state is one `.empty-state` div inside `<tr class="es-row"><td colspan="6">`;
  `.es-row td{padding:0}` (CSS) so the cell centres it symmetrically.

## Tests
- **New `tests/empty-states.test.js` (7):** the helpers emit `es-built`; variant A has the
  standard headline, the one shared clear label, the onclick wiring, and NO `<p>` guidance; every
  render path (`renderIngredients`/`renderKitchenPanel`/`renderPlatesTab`/**live** `renderAnalysis`
  — 2nd definition per hard rule 3) routes through the helper; no inline variant survives; copy
  pins (Products names "+ New product" not ingredient; Menu names the Plates tab, not Builder).
- **Runtime-verified in jsdom** (scratch, not committed): all four tabs render `.empty-state.es-built`
  with the right variant/copy, and each clear fn resets its search and rerenders to content.
- `fresh-states.spec.js` analysis-empty test updated deliberately to the new `.es-row`/`es-built`
  markup (Playwright — **not run here, no browser**).
- Full suite 157 green; jsdom smoke green.

## Needs Max's phone / browser
- **`npm run shots`** — empty-state shots across all four tabs are new/changed (adds to the v56+v57
  stale-shots list). `fresh-analysis-*.png` will re-baseline.
- Eyeball each tab's **A** (search gibberish; then set a category/supplier filter with no matches on
  Products/Plates) and **B** (Products: clear all products; Menu: a menu with zero dishes) variants,
  both themes, 380px + desktop. I could runtime-trigger every A and the Ingredients/Plates B in
  jsdom; Products B and Menu B are seeded in the harness so those two true-empty screens are pinned
  by unit tests + source only — worth an eyeball.

## Deliberately NOT done (scope)
- Left the now-legacy `.ing-empty` / `.an-empty` / `.an-empty-box` CSS in place (no longer used by
  the four tabs, but chasing every rule in a 2000-line file risks collateral; only removed the CSS I
  added in v56, `.plate-noresult`). Flag if you want a dead-CSS sweep as its own batch.
- No change to the builder docket empty ("No ingredients yet", `#lines .empty`) — it's a popup, not
  one of the four tabs, and keeps its own glyph.
