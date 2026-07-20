# HANDOVER v59 — Parity pass: search, categories, menu controls

Branch: `feat/parity-pass` (off `feat/empty-states-unified` = the unmerged v58; once v58 merges to
main this PR shows only v59). Brief: `~/Downloads/ezplate-opus-parity-pass.md`. Plan approved by
Max with three decisions: **all 6 as one v59 batch**; **token-substring matching, drop subseq**;
**include plate categories in the Tidy-lists Category picker**.

Baseline before: 164 green (v58 branch), smoke green, `node -c` clean, six spots at v58.
After: **174 green, jsdom smoke green, `node -c` clean, six spots at v59**, plus a scratch jsdom
"parity-check" (not committed) exercising every DOM-heavy item end-to-end.

## Item 1 — builder search no longer creates ingredients
`renderDrop` (#q) dropped the `+ Create "x"` branch and the `__create` path (`pickListItem`,
`createIngredientFromSearch`, the mousedown create branch all removed). Unknown terms now show a
message pointing at the Ingredients tab. Hint copy changed in `index.html` (#builderHint) and
`renderPlate`. `builder-search.test.js` updated (+ token-order test).

## Item 2 — modal combobox dropdown clip (ROOT CAUSE)
**Root cause:** modal comboboxes render `.cat-drop` as `position:absolute` inside `.mbody`, whose
`overflow:auto` (needed so tall modals scroll) clips the dropdown after ~1.5 rows — the Save bar
then covers it. The `.cat-drop` already had `max-height:210px;overflow:auto`, so internal scroll
was never the issue; the *clip* was.
**Fix:** on open, `anchorDrop(drop)` sets the dropdown to `position:fixed` at the input's viewport
rect, so it escapes the scroll container entirely (the modal's only transform is the open
animation, long finished by interaction time, so fixed is viewport-relative; verified no persistent
containing block). Opens upward when the input sits low; repositions on scroll/resize (capture);
`resetDrop` clears the inline geometry on close. Hooked at the two shared show paths —
`makeInlineCombo` (covers f_*, ig_*, plateCat, mi_*, ed_*, ni_* invoice combos) and
`renderKingProdDrop` (the king modal's product search, the reported one). One sweep, all combos.

## Item 3 — Menu traffic-light key removed
Deleted the `.akey` legend row (markup + all three CSS rules); the row dots (`.dot`) stay.
`fresh-states.spec.js` menu-header order/edge test updated to drop `.akey`.

## Item 4 — Menu controls match the Products/Plates pattern
`#menuSearch` moved out of its inline spot into a new `.ing-controls` row **below** the
selector+Delete, alongside a **category filter** (`#menuCatFilter`, options = the current menu's
dish sections) and **Clear filters** (`#menuClearFilters`). All ids/handlers kept; new ids wired;
`clearMenuFilters` now also resets the category filter. Category filter narrows the dish list to
one section.

## Item 5 — one shared token matcher, every search bar
New `searchTokens(q)` + `matchTokens(tokens, hay)`: the query splits into whitespace tokens; **every
token must be a substring of the item's precomputed lowercase haystack, in any order** — so "gluten
free bread" matches "Bread Gluten Free". Empty query matches all. Routed through it: Products
(`renderIngredients`), Ingredients + builder #q (`kingSearchFilter`), Plates (`renderPlatesTab`),
Menu (`renderAnalysis` `hit()`). **Behaviour change (Max approved): the old `subseq` fuzzy fallback
is gone** — "chp"→"Chips" no longer matches; `subseq` itself stays (still used by the SEARCHABLE
typeahead, untouched). New `search-matcher.test.js` (permutations/partials/absent/empty); king- and
builder-search tests updated.

## Item 6 — categories: ingredients inherit + Tidy-lists UI ships
**6a (derived category).** `kingCategory(k)` = the linked product's category, live — never stored on
the ingredient. Shown as a muted chip on ingredient cards; added a **category filter + Clear
filters** to the Ingredients tab (same controls-row pattern); the ingredient search haystack now
includes the derived category; the edit modal shows category **read-only** (`#king_cat`, updated
live by `updateKingCat` as the linked product changes) with a "set by the linked product" note.
`category-derive.test.js` (repoint follows; product-cat edit reflects; missing product safe;
distinct list).
**6b (Tidy-lists UI — finally built).** Settings → **Tidy lists**: a field picker
(Category/Brand/Supplier), values with usage counts (most-used first), per-value **Rename / Merge /
Clear**, each behind ONE blast-radius confirm modal (`#tidyModal`, e.g. *"Rename 'Bakery' on 14
products and 3 plates? This can't be undone."*). Applies via the existing write path —
`overrides`→`dbPushIngredient` for products (matches the real edit save), `dbPushPlate` for plate
categories, and `tidySupplierMemMigration` for a supplier rename/clear so taught invoice packs
don't orphan. **Per Max's decision the Category picker spans product categories AND plate
categories** (`tidyValuesCombined`/`tidyPlanAll`, both pure + tested). Because ingredient categories
mirror their product, a rename here flows to the Ingredients tab automatically — the payoff of 6a.
**6c:** Products stays the only place a product's category is *set* (plus Tidy lists for bulk).

## Tests
174 green. New: `search-matcher.test.js` (5), `category-derive.test.js` (5); extended
`tidy-lists.test.js` (+5 for `tidyValuesCombined`/`tidyPlanAll`), `king-search.test.js`,
`builder-search.test.js`. `fresh-states.spec.js` menu-header test updated for the removed `.akey`
(Playwright — **not run here, no browser**). Runtime jsdom parity-check confirmed: no create in
builder search; menu category filter populated; Tidy rename applied end-to-end (old value gone, new
present); derived-category chip + ingredient filter; modal dropdown anchored `position:fixed`.

## Needs Max's phone / browser
- **`npm run shots`** — menu header (key gone, new controls row), Ingredients tab (category chip +
  filter), Settings Tidy lists, modal dropdowns. Adds to the standing stale-shots list.
- **Tidy lists — export a JSON backup first (Settings → Data), then try ONE real rename** on a test
  category and confirm it flows to Products, the Ingredients cards, and Plates. Merge + Clear too.
- Modal dropdowns at 380px + desktop: the linked-product search in **+ New ingredient** now shows
  5+ options over the Save bar; sweep the other modal combos (brand/supplier/category, invoice
  new-item) — none should clip. Test one near the bottom of a tall modal (opens upward).
- Token search on every tab ("gluten free bread" ↔ "Bread Gluten Free"); builder search shows no
  "Create" for unknown names; Menu category filter; filter Ingredients by a category. Both themes.

## Proposed CLAUDE.md edit (needs Max's yes — it's above the State line)
"What the app does" §7 still says *"Outstanding: 'Tidy lists' UI — the pure logic exists and is
tested; no Settings section calls it yet."* That's now **built** (item 6b). Suggest changing that
line to note Tidy lists ships in Settings. Left unedited pending your ok.

## Deliberately NOT done (scope)
- The king-modal product typeahead (`renderKingProdDrop`) and the invoice combos keep their own
  ranked typeahead matching — the shared token matcher is for the five list *search bars*, per the
  brief. Left as-is.
- No dead-CSS sweep of the legacy empty-state rules (from v58) — separate batch if wanted.
