# HANDOVER v60 — UX pass (dashboard, misc, search parity, Tidy modal)

Brief: `~/Downloads/ezplate-opus-ux-pass.md`. Branch `feat/ux-pass` off `main`
(which was already at v59 — PRs #6 + #7 had merged v58/v59; "all old branches
merged" was already true, local `main` was just 36 commits stale). Baseline
verified green (174) before starting; **181 green** after (174 + 7 new
`trend-domain` tests). `node -c` clean, jsdom smoke green, six spots at **v60**.
Eight staged commits, one per item.

---

## 1. Dashboard — live data + a zoom that shows real movement

### 1a. Liveness — ROOT CAUSE
The header "% today" and the stat cards are already computed **live** by
`renderDashboard` (via `computeAvgFoodCost` in `dashComparisons`). The staleness
was two gaps in what *called* `renderDashboard`:

1. **`logHistory` returned early on a deduped point — before re-rendering.** Its
   last two lines re-render a visible dashboard, but the "skip a near-duplicate
   point within the hour" guard `return`ed *above* them. So any change that moved
   the average by <0.05 pt (or a second edit within the hour) logged nothing AND
   refreshed nothing — the number on screen went stale. Fixed: the dedup now
   guards only the **point push**; the re-render always runs when the dashboard is
   visible. (Logging a trend point and refreshing the view are now separate
   concerns, which is what the brief asked for.)
2. **Plate save never called `logHistory`.** `saveCurrentPlate` re-costs the menu
   but didn't refresh the dashboard. Added `logHistory()` there.

Price edits (`commitPrice`) and invoice apply already called `logHistory`; tab
activation already re-renders in `showTab`. So all three trigger points
(price edit, invoice apply, plate save) + every tab activation now refresh.

### 1b. Zoom — NEW y-domain rule (SUPERSESSION)
**Old rule (v48, now superseded):** the domain always concatenated the target
(`cogsPct`) into its min/max, so the dashed target line was always on screen even
when far from the data — flattening 1–2 pt margin moves into noise.

**New rule (v60):** the y-domain **fits the data** (`niceStep`/`niceTicks` — round
ticks over the readings only), with a **minimum ~5-pt span** (centred) so a flat
window doesn't magnify sub-pt noise. The target line renders **only when it's in
view** — inside the domain *or within one tick* of it (`targetInView`). When shown,
v48's contract still governs: ticks are the target-anchored `tcTicks`, so the line
lands exactly on a labelled tick (that's why it carries no word). When the target is
far away, it becomes a small **edge annotation** ("target 30% ↑/↓") at the plot's
top/bottom instead of dragging the axis to reach it.

- `tcTicks` is **unchanged** — its "target sits on a labelled tick" contract still
  holds and is still pinned by `tests/trend-ticks.test.js` (those tests call
  `tcTicks` directly with an in-view target; that's exactly the shown case).
- New `tests/trend-domain.test.js` (7) pins `niceTicks` (covers the data, ≤4
  round ticks, never negative, does NOT reach a distant target) and `targetInView`
  (inside / within-one-tick shown; far outside hidden).
- Range-stability invariants (fixed gutter geometry, fixed axis font, domain =
  tick extent ± half a step) are preserved.

---

## 2. Misc cost — no name field
The misc line is now: fixed **"Misc"** label · dotted leader · `$` input · ×.
Removed the name input; `setMiscLabel` is now dead (left in place, harmless) and
any stored `label` on a pre-v60 misc line stays in the data but is never shown.
`addMiscCost` focuses the `$` input. **× alignment (ROOT CAUSE):** the leader was a
40px stub (`.line.misc-line .leader{flex:0 1 40px}`) that leaned on the removed
`flex:1` name field to push the `$`/× right; with the name gone the leader now
grows (`flex:1 1 auto`), so × lands flush-right in the ingredient rows' × column.

## 3. Print docket from the plate card popup
Extracted the builder's docket renderer into a shared **`printDocketFor(name, lines)`**
— one template, no fork. The in-builder Print button calls it; a new **"Print
docket"** action (`#paPrint`) in the plate card popup prints straight from the
saved plate's `name` + `lines`.

## 4. Builder line qty starts EMPTY and is required (revised from the brief's "default 0")
The brief asked for a default of 0; Max then asked for a truly empty field that
must be filled. Final behaviour: `defaultQty` returns **null**, so a new ingredient
line renders a **blank** qty input (placeholder "qty"); `setQty` maps a cleared
field back to `null` (not 0). **`saveCurrentPlate` refuses to save** while any
ingredient line has no positive quantity — it toasts "Enter a quantity for every
ingredient" and focuses the first offending line. Misc lines are unaffected.
Regression tests (4) in `plates-independence.test.js`: empty blocks, 0 blocks, a
positive qty saves, and an empty ingredient qty still blocks alongside a misc line.

## 5. Small fixes
- **Tab scroll-to-top:** `window.scrollTo(0,0)` at the end of `showTab` — which
  runs on every nav click, so re-tapping the current tab scrolls up too.
- **Delete red pressed state:** the red fill came from `.btn.danger:hover`, which
  **sticks after a tap on touch devices**. Gated behind `@media (hover:none)` →
  neutralised back to the resting outline on touch; resting + real-hover (desktop)
  unchanged. (Kept as an override block, not an in-place edit of the base rules.)
- **Builder category label:** "Category (optional)" only — dropped "— how it groups
  in your Plates library".
- **Product pack help:** label "Pack size (optional)" + sentence-case hint "Units
  per pack — e.g. a carton of eggs = 180. Helps invoice imports price it right."

## 6. Search-clear × sweep
**Rule settled:** every SEARCH box gets the always-visible × (the Products
`ms-clear` pattern); form VALUE inputs do not. Full audit of every text/search
input below.

| input | kind | ×? |
|---|---|---|
| `plateSearch`, `menuSearch`, `kingSearch`, `ingSearch` | tab list search | ✅ already had |
| `q` (builder add-ingredient) | list search | ✅ already had |
| **`king_prod`** (ingredient modal → product link) | **search** | **➕ added (Max's report)** |
| **`ad_search`** ("add existing dish" picker) | **search** | **➕ added** |
| `f_brand/f_sup/f_category`, `ig_brand/ig_cat/ig_sup`, `mi_cat`, `ed_cat`, `plateCat` | category/brand/supplier VALUE combobox | ❌ (value input, like name/price) |
| `plateName` | name field (dual "type to search saved plates") | ❌ (name value; clears via Clear plate) |
| `f_desc/ig_name/king_name/mi_name/nm_name/ed_name/mi_notes` and all `$`/number fields | value inputs | ❌ |
| `tidyRenameInput` | value input (modal) | ❌ |

Added via a shared `wireSearchClear(inputId, clearId, onClear)` helper + the
existing `ms-clear` markup/CSS. Both new wrappers (`cat-wrap`, `menu-search`) are
`position:relative` so the global `.ms-clear` positions itself; the input just
needed right padding (`.cat-wrap.has-clear > input`).

**Judgement call:** the cat/brand/supplier comboboxes are *type-to-search* but set a
field value, so per the rule they stay ×-free (consistent with name/price fields).
`king_prod` is structurally the same combobox but searches the whole product
catalog to *link* — Max flagged it, and it reads as a search, so it got the ×.

## 7. Menu tab controls — Products parity
`.an-controls` switched to `flex-direction:row` at ≥640px, putting the
search/category filter beside the selector/Delete with ragged widths. Now it's a
**column at every width**: picker row (menu + Delete), then a full-width controls
row that IS a nested `.ing-controls` (Products' exact heights/gaps/order); the
search grows like Products'. Also **zeroed the nested `.ing-controls` padding**
(both it and `.an-controls` carried `sp-5`/`sp-4` → double indent past the picker
row's left edge).

## 8. Category editing — Tidy is a modal now (Settings stays short)
The field picker + values list moved out of the inline Settings section into a new
**`#tidyManageModal`**. Settings shows ONE row ("Tidy lists — categories, brands,
suppliers →", `#setTidyOpen`) that opens it on Category. Per-row Rename/Merge/Clear
still open the existing `#tidyModal` confirm (stacked above the manager; it
`renderTidyValues()` refreshes the list underneath on apply).

**Contextual door (recommended design; liberty granted):** each category/supplier
filter (`data-tidy-field`) gains a "✎ Manage list…" option that opens the manager
**pre-scoped** to that field. I chose the in-dropdown door over a pencil button so
it needs **no controls-row layout change** (keeps the item-7 Products parity intact
across all 5 filters). **Implementation subtlety worth knowing:** the door is
handled by a **document-level capture-phase `change` listener** — a per-element
listener loses, because the filter's own change→render listener runs first and
`fillFilter` rebuilds the `<select>`, clearing the sentinel selection before the
per-element handler sees it. The capture handler `stopPropagation`s, restores the
previous value (recorded on `focusin`), and opens the manager. Verified end-to-end
in jsdom.

---

## Tests
- `npm test` **181 green** (174 → 181). New `tests/trend-domain.test.js` (7).
- `tests/plates-independence.test.js` save harness gained a `logHistory` stub
  (deliberate — `saveCurrentPlate` now calls it). Noted in that commit.
- `node -c js/app.js` clean; jsdom smoke green (incl. version parity).
- `tcTicks`/`trend-ticks.test.js` untouched and still green (the domain change is
  in `trendChart`, not `tcTicks`).

## NOT built (deliberately)
- No pencil-button variant for the Tidy door (chose the dropdown option — see §8).
- No × on category/brand/supplier value comboboxes (they're value inputs — §6).
- Did not refactor the existing tab-search clear wiring into the new helper
  (they already share the `ms-clear` markup; rewiring working spots is needless
  risk). The helper covers the two new spots and stands as the shared pattern.

## Needs Max's phone (no browser here — none of this is "feel"-verified)
1. **Dashboard live-updates:** edit a price, import an invoice, save a plate —
   confirm the "% today" number and the chart move without leaving the tab.
2. **Zoomed chart on every range** (1w…1y): margins should look like they move;
   target line shows on a tick when near the data, and becomes a small "target
   NN% ↑/↓" edge label when the data is far from target. Check both light + dark.
3. **Misc line** at 380px: "Misc" label, `$` input, and × sharing the ingredient
   rows' right-edge column.
4. **Print docket** from a plate card (and still from the builder).
5. **Empty-qty flow:** new ingredient line's qty field is blank ("qty"
   placeholder); saving is blocked with a toast until every line has a quantity.
6. **Delete buttons:** tap on a phone — no red flash/fill (resting outline only).
7. **Menu controls** at 380px and desktop: two stacked rows matching Products
   exactly (search grows, category + Clear filters beside it, one left edge).
8. **Tidy modal:** opens from Settings' single row AND from a filter's "Manage
   list…" option (pre-scoped); Settings page is short again. Rename/merge/clear
   still work through the confirm.
9. **Tab scroll-to-top** on switching and on re-tapping the active tab.

## Still outstanding (unchanged from v59)
- The **three v55 Supabase migrations** still need applying to prod before any of
  v54–v60 goes live (see `supabase-schema-can-lag-app-code`).
- `npm run shots` + `fresh-states.spec.js` reconciliation on a browser env — now
  also covers v60's misc line (no name field), the plate-popup Print button, the
  Menu controls, and the Tidy modal.
