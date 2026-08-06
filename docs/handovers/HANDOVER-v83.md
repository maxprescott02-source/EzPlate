# HANDOVER v83 — Bridge REMOVED · the safe new-user subset · the builder's informative dead end

**Completed:** 25 Jul 2026 · branch `feature/newuser-flow` (continues on top of v82, off `main` @ v81) ·
brief `~/Downloads/ezplate-opus-newuser-safe-fixes.md`. Max's instruction: remove the per-product-card
create-ingredient affordance entirely, then apply items 1–7 of that brief, skipping anything already
correctly implemented.

Baseline verified before starting: v82, **354 node green**, jsdom smoke green, `node -c` clean, six
spots at v82 — matched CLAUDE.md's claim exactly. Ended **356 node green**, smoke green, `node -c`
clean (app.js, sw.js + the four `api/*.js`), six version spots → **v83**. **Client only** (HTML + CSS +
JS + tests). **Zero contact** with the protected parser region, money law, the naming inversion, the
menu data model, invoice review / `invRowState` / auto-tick, the insight engine, or `api/*.js`. No new
dependency.

## 1. The v82 product→recipe BRIDGE is removed — it never shipped

v82's headline feature was mis-specified and is now gone in full. The new brief is explicit: do not add
any create-kitchen-word affordance to product cards, do not use "recipes" as a UI noun (the app's nouns
are Products, Ingredients, Plates, Menu), and do not add variable-height sections to the product grid.

Removed completely:
- **`js/app.js`** — `kingForProduct`, `bridgeKingName`, `bridgeCreateKing`, `useProductInRecipes`,
  `bridgeHtml`, `fillIngBridge`, and the `toastAction` action-snackbar helper (its only caller was the
  bridge). `renderIngredients` is back to emitting a plain `.ing-card` button per product — **no
  `.prod-card` wrapper, no strip** — and `openIngEdit` no longer fills a bridge row.
- **`index.html`** — the `#ig_bridge` row in the edit modal.
- **`css/style.css`** — the `.prod-card` / `.prod-bridge` / `.prod-userecipes` / `.prod-inrecipes` /
  `.ig-bridge-row` block and the whole `.snackbar` block.
- **`tests/bridge.test.js`** — deleted (−6 tests). Smoke `[20]`'s bridge assertions replaced with
  **negative pins**: a product card is a plain `.ing-card` whose parent is `#ingList`, no
  bridge/creation classes exist anywhere in the list, and the product list contains no "recipes"
  wording. The affordance cannot come back by accident.

`proposeKingName` / `kingNameExists` **stay** — they pre-date v82 and are still used by the ingredient
wizard and the rename guard (checked; not left dead).

**One v82 line deliberately KEPT** (it is not an affordance, a banner, or wording): `submitNew` still
calls `renderIngredients()` after a product is created. `setOverride` → `rebuild()` updates data only,
never the DOM, so without it a product you just made does not appear in the list until something else
repaints. The create toast is back to the pre-v82 `toast(desc+' added')`.

## 2. Items 1–6 — already correctly implemented in v82, verified not re-done

Each was re-checked against the new brief's wording and its locking test, not taken on trust:

| # | Item | Status |
|---|------|--------|
| 1 | In-progress plate lost on reload | **Done (v82 D1).** One `cafeDB_plateDraft` slot, debounced; boot snapshot `_bootPlateDraft` + `offerPlateDraftResume` offers Resume/Discard; cleared on save and on Clear; tolerates a deleted-ingredient ref. All four of the brief's tests exist in `plate-draft.test.js`. |
| 2 | Live margin preview when pricing | **Done (v82 item 3).** `menuMarginPreview` **reuses `analyze()`**; `menu-margin.test.js` pins that the preview light always equals the Menu row's. |
| 3 | Plate name + Save below the fold | **Done (v82 item 4).** `#saveBtn` (id unchanged) pinned in `.mfoot .builder-foot`. |
| 4 | Pack size dropped on create | **Done (v82 D2), root cause found.** `submitNew` wrote the display string `pack_size_raw` but never the structured `pack_qty`/`pack_unit` that `openIngEdit` reads back — the record was built inline and simply omitted them. Now built by pure `newProductRecord()`; `create-pack.test.js` locks the round-trip. |
| 5 | "Food item" checkbox has no label | **Already correct — does not reproduce.** The input is wrapped in its `<label>`, so the accessible name is the visible copy, not "on" (jsdom: `labels.length === 1`). No code change; `a11y-fooditem.test.js` locks it against regressing *into* the reported state. |
| 6 | "Manage menus" wording | **Done (v82).** → "Add to a menu", pinned in smoke. |

## 3. Item 7 — the builder's ingredient search: an informative dead end (the only new build)

This was the half-done one. The "No ingredient called 'X'" message already existed (v59), but nothing
reassured the user their plate was safe, and there was no way out that preserved it.

**A creation path was NOT added, and the v59 removal stands.** The fuzzy matcher can't match
abbreviations ("bread gf" does not find "Gluten Free Bread"), so "no match" is not a reliable enough
signal to safely offer creation — it produced duplicate ingredients.

- **`builderNoMatchHtml(term, hasLines)`** (pure, extracted, unit-tested) — names the searched term,
  says where an ingredient is made, and adds the reassurance. An empty search box gets guidance, not a
  "found nothing" claim.
- **The one action** (Max's call — the brief flagged it as optional and Max said build it):
  **"Save plate & add ingredients"**, shown **only when `plate.length > 0`**. With an empty plate there
  is nothing to lose, so no dead button.
- **`saveAndAddIngredients()`** routes through **`saveCurrentPlate(false)`**, so it obeys exactly the
  same rules as the Save button: a plate with no name, or a line with no quantity, is **refused** and
  the builder stays open with that error shown and focused. It never navigates away from an unsaved
  plate. On success: `closeDrop()` → `closeBuilder()` → `showTab('pantry')` (the naming inversion —
  `data-tab="pantry"` is the tab labelled "Ingredients").
- **CSS** — `.opt` is a baseline flex *row* built for result lines, so `.nomatch` overrides to a column
  and drops the row hover; the action is a 44px-min `.btn`.
- **A11y** — `#drop` is `role="listbox"`, and a listbox may only contain options, so `renderDrop` now
  swaps it to `role="group"` while the message is showing and restores `listbox` for results. The
  no-match branch also sets `aria-expanded="true"` on the input, which it previously left at `false`
  while a visible dropdown was open. `tests/builder-search.test.js`'s v61 harness stub grew
  `setAttribute`/`getAttribute`/`querySelector` + `plate` to match renderDrop's new dependencies —
  harness-only, no assertion changed.

Copy uses the app's real nouns only; a test asserts "recipes" never appears in any variant.

`tests/builder-nomatch.test.js` (+8): term named, exactly one action, no action on an empty plate,
empty-term guidance, **term is HTML-escaped** (it is user input rendered via `innerHTML`), no creation
affordance in any variant, no "recipes", and the refuse-before-navigate contract. Smoke `[20]` drives
the whole thing end to end including the nameless-plate refusal and the successful save landing on the
Ingredients tab with the plate in the library.

## 4. Judgement calls

- **v83 on top of v82, not a rewrite of it.** The branch is unpushed and unmerged, so amending was
  possible — but handovers are write-once and the audit trail is worth more than a tidy single commit,
  especially with Max new to git. v82 stays in history as what was tried; v83 is the correction.
  Nothing from v82's bridge ever reached `main` or a phone.
- **Three pre-existing "recipes" strings on `main` were left alone** — see the flag below.
- Item 7's action deliberately does **not** prefill the searched term into the Ingredients tab or
  auto-open the new-ingredient modal. The brief says ONE action, no forms; `+ New ingredient` is
  already the primary button on the tab it lands on.

## 5. Flagged for Max — NOT built (CLAUDE.md rule 4)

1. **`+ New plate` silently destroys an unsaved in-progress plate.** `closeBuilder()` only hides the
   modal, so `plate` survives in memory but is **unreachable** — the Plates tab's only entry point is
   `openBuilderNew()`, which wipes `plate` *and*, via `renderPlate()` → `scheduleDraftSave()` on an
   empty plate, deletes the stored draft too. So the v82 draft only protects the **reload** path, not
   the close-then-reopen path. Item 7's action removes this from *its* flow (the plate gets saved), but
   the hole is still there generally. Worth its own brief: either confirm before wiping, or offer the
   draft as a resume on the Plates tab. **This is the one real data-loss gap left in the new-user flow.**
2. **Three pre-existing "recipes" strings** that pre-date this brief and sit on `main` — `index.html:161`
   ("Kitchen words for recipes…"), `index.html:524` ("Recipes cost from this product…"), and the
   ingredient-wizard done-state in `js/app.js` ("…recipes can use all of them."). The brief bans
   "recipes" as a UI noun, but changing copy `main` already ships is outside what was asked. Say the
   word and it's a two-minute copy-only change.

## 6. Needs Max's phone (no browser here — never claimed verified)

- Builder search for something that doesn't exist: message readable, term correct, **one** action, the
  action saves and lands on Ingredients; then Plates → the plate is there and opens with everything.
- The same search with an **empty** plate: message only, no button.
- Try the action on an unnamed plate / a line with no qty: it must refuse and stay put, not navigate.
- Products tab: cards are back to the plain single-card look, **no strip, no second line, uniform card
  height** in the grid.
- Create a product: toast reads "… added", and the new product appears in the list immediately.
- Everything v82 still standing: build → reload → resume the draft; price a dish watching live margin;
  pack size round-trips; Save reachable without scrolling.
- **Both themes, 380px and desktop.**
- **Visual-spec baselines** (`tests/visual/screenshots.spec.js`) still need regenerating on a browser —
  the product card changed again (v82's strip added, v83 removed it, so it should match pre-v82) and the
  builder dropdown is new. Not runnable in this environment.
