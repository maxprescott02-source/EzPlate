# V4c §11.1 contract — the Ingredients screen (#tab-pantry)

Produced 9 Aug 2026 by the pre-batch contract audit, banked here so the V4c batch
(in a fresh session) does not re-spend the inventory. The audit is the CONTRACT:
after restyling, every handler, id, and law below must still hold.

⚠ CORRECTION TO THE QUEUE ITEM, found by this audit: the item said "Used in N plates
counts BOTH line shapes (kid and legacy bare-pid)". That contradicts the shipped v124
law for the RELINK-PROMISE string (kid arm only — a relink cannot heal a bare-pid line,
so counting both would make the promise a lie; the v124 review caught exactly that).
The both-sides law belongs to a neutral USAGE count (productRefs). If V4c adds a
"Used in N plates" column, decide per surface: relink warnings stay kid-only;
a neutral usage column may use productRefs. The queue item has been corrected.

---

# §11.1 AUDIT — INGREDIENTS screen (`#tab-pantry`, label "Ingredients")

All paths absolute-rooted at `/Users/max/Documents/Scoopys-Costing`.

---

## 0. Markup boundary

`index.html:182–204` — the whole pane. `index.html:796` — the nav button (`data-tab="pantry"`, `aria-label="Ingredients"`, `<span class="nl">Ingredients</span>`).
Owned modals (outside the pane div, driven only from it): `index.html:343–346` `#kingWizModal` / `#kingWiz`; `index.html:553–577` `#kingModal` (edit/create).

---

## 1. Functions that render the pane

| Function | Lines (`js/app.js`) | Role |
|---|---|---|
| `renderKitchenPanel` | **2206–2262** | the only painter of `#kingList`. Reads `#kingSearch` into `kingQuery` (2208), true-empty branch (2209–2215), fills+reads `#kingCatFilter` (2216–2217), toggles `#kingClearFilters` (2218), filter→category→sort pipeline (2219–2221), no-match branch (2222–2226), row map (2229–2255), row wiring (2256–2260), `renderKingProgress()` tail (2261). |
| row builder | **2229–2255** (inline `.map`, no named fn) | emits one `.king-row` per ingredient. |
| drift display | **2238–2241** — `ingLastMovePct(k.pid)`; definition **1536–1543** | `+X.X%` / `−X.X%` in `.king-drift up|down`. Rides the **name** line deliberately (comment 2239–2240) because `.king-link` is 2-line clamped. `null` ⇒ nothing rendered (silence, not zero). |
| broken-link state | **2244–2249** | `⚠ product missing — relink to keep N plate(s) costed` / `…to give it a cost` in `.king-link.king-missing`; price cell `.king-price.notcosted` = `no cost`. `N = platesUsingKid(k.id).length`. |
| linked-product label | `kingProductLabel` **2182–2186** | `description — brand · supplier`. The `→ ` prefix is CSS, not content. Its `(product missing)` fallback is **defensive only** — the missing branch never calls it (pinned at `tests/king-rows.test.js:94–96`). |
| unit cost | `unitCostStr` **622–625** | `$/kg`, `$/L`, `$/unit`, else `—`. |
| category (derived) | `kingCategory` **2189**, `kingCategories` **2190** | derived live from the linked product; **never stored on the ingredient**. Feeds the filter only — not the row. |
| search filter (pure) | `kingSearchFilter` **2195–2204** | shared token matcher; haystack = ingredient name + linked product `description/brand/category/supplier` (supplier added in Q5/v124 to match what the row shows). |
| clear filters | `clearIngredientFilters` **1974** | resets `#kingSearch`, `kingQuery`, `#kingCatFilter`, re-renders. Also the target of the no-match empty state's `onclick` string. |
| empty states | `emptyStateHtml` **1961–1965**, `emptySearchState` **1968–1971**, icon `ICON_LEAF_BIG` **1953** | variant B true-empty (`#kingEmptyNew` button, 2210–2212); variant A no-match (2223). Exactly one, never both. |
| setup progress / wizard entry | `renderKingProgress` **2329–2339** | `#kingProgress` text `"N of M products have an ingredient"`; shows/hides `#kingWizBtn` and swaps its label `Set up from products` ⇄ `Close setup`. |
| wizard (modal, launched from the pane) | `kingWizGroups` 2340–2350 · `kingWizRowHtml` 2351–2362 · `kingWizSkippedHtml` 2365–2377 · `wireKingWizSkipped` 2378–2385 · `renderKingWizard` 2386–2438 · `toggleKingWizard` 2439 · `closeKingWizard` 2440 · `kingLinkableProducts` 2284 · `kingUnlinkedProducts` 2285–2288 · `proposeKingName` 2289–2293 · `kingWizOutstanding` 2307–2309 · `parkRepointedProduct` 2274 · `setKingWizSkips` 2275–2278 · `saveKingWizSkips` 2279–2282 | |
| row editor (the pane's one destination) | `openKingModal` **2507–2540** · `closeKingModal` 2541 · `saveKingModal` 2542–2590 · `deleteKitchenIngredient` 2608–2625 · `renderKingAlts` 2443–2450 · `renderKingCreateSuggest` 2453–2473 · `kingValid` 2474–2477 · `kingSyncSave` 2478 · `updateKingCat` 2480–2485 · `renderKingProdDrop` 2486–2506 · `kingRenameCheck` 2300–2306 · `kingRepointGuard` 2324–2327 · `kingNameExists` 2295 · `kingNameAction` 2315–2321 · `nextKid` 643–646 | |
| blast-radius helpers | `platesUsingKid` **2596** · `menuIdsForPlates` 2603–2607 | |

**Row-count / listing surfaces the pane does NOT have:** no `#ingCount`-style "N ingredients" line (Products has one at `2027`); the only count is `#kingProgress`, which counts **products**, not ingredients, and stays true across a filtered view (comment 2224).

---

## 2. Event handlers (all `js/app.js` unless noted)

**Wiring IIFE `2626–2653`:**

| Line | Element | Behaviour |
|---|---|---|
| 2628 | `#kingNew` click | `openKingModal(null)` (create) |
| 2629 | `#kingWizBtn` click | `toggleKingWizard()` |
| 2630 | `#kingWizClose` click | `closeKingWizard()` |
| 2632 | `#kingWizModal` mousedown on backdrop | `closeKingWizard()` |
| 2633 | `document` keydown Escape (while `.open`) | `closeKingWizard()` — one of the parallel Esc listeners in the known Esc-stacking defect (queued to V6) |
| 2641–2645 | `#kingSearch` input | sets `kingQuery`, `renderKitchenPanel()` |
| 2646 | `#kingSearch` keydown Enter | `preventDefault` + `blur()` (dismiss phone keyboard) |
| 2647 | `#kingSearchClear` click | clears value + `kingQuery`, re-render, refocus |
| 2648 | `#kingCatFilter` change | `renderKitchenPanel` |
| 2649 | `#kingClearFilters` click | `clearIngredientFilters` |
| 2650 | `#kingModalSave` / `#kingModalCancel` / `#kingModalClose` | save / close |
| 2651 | `#kingModalRemove` click | close modal **first**, then `deleteKitchenIngredient(kid)` so the used-in-N confirm stacks cleanly |
| 2652 | `#kingModal` click on backdrop | `closeKingModal()` |

**Per-render (rebound on every paint):**

| Line | Element | Behaviour |
|---|---|---|
| 2212 | `#kingEmptyNew` `.onclick` | `openKingModal(null)` |
| 2257–2259 | every `.king-row` `.onclick` / `.onkeydown` (Enter, Space) | `openKingModal(row.dataset.kid)` — the whole row opens the **edit modal**; there is no separate relink control, no Edit/Remove links (`.king-acts` deleted v44 item 6b) |
| 2223 | no-match state's inline `onclick="clearIngredientFilters()"` | string-literal handler emitted by `emptySearchState` |
| 2379/2380 | `.kw-skiptoggle` / `.kw-unskip` | show-hide / unskip |
| 2410/2416 | `.kw-add` / `.kw-skip` | create one ingredient / skip a whole group |
| 2420–2434 | `.kw-all` | `askConfirm` → bulk create, **one** `saveKitchenIngredients()` for the batch |
| 2435 | `.kw-more` | `kingWizLimit += 40` |
| 2466 | `#king_alts .use` | pick a suggested product in create mode |
| 2502 | `#king_prodDrop .cat-opt` **mousedown** (not click — beats the input blur) | choose linked product |
| 2519–2526 | `#king_prod` input/focus/blur, `#king_name` input (`__wired` latch — wired once, never rebound) | dropdown + live validation + `renderKingCreateSuggest` |
| 2663 | `wireSearchClear('king_prod','king_prodClear', …)` | modal search × |

**Document-level, reaching the pane:**
- `1404` — `.navbtn[data-tab]` click → `showTab`; `1400` `showTab('pantry')` → `renderKitchenPanel()`; `1385` `rerenderCurrentTab()` same.
- `4916–4923` — **capture-phase** `focusin`/`change` on `select[data-tidy-field]`. `#kingCatFilter` carries `data-tidy-field="category"`, so `fillFilter` appends the `__tidy__` "✎ Manage list…" option (`1998–2003`, sentinel `TIDY_DOOR` at `1997`) and this listener opens the Tidy manager pre-scoped, restoring the previous value. **Sequencing law:** it must run in capture, before the filter's own `change`→render listener, because that render calls `fillFilter` and would wipe the sentinel selection.

**Cross-screen entries that land on / repaint this pane:**
`725` `saveAndAddIngredients()` → `showTab('pantry')` · `820` `#bhGo` builder-hint link → `showTab('pantry')` · `4542` Tidy apply → `renderKitchenPanel()` · `6982` invoice apply (kitchen words made/relinked) · `7020` `confirmGuardedRepoints` (invoice unit-guard confirm).

---

## 3. ids / classes / data-* the markup emits

**Static (index.html:182–204):** `#tab-pantry` · `.panel.king-panel` · `h2` text **"Ingredients"** (pinned) · `.king-head.panel-actions` · `#kingNew` (`.btn.primary`, inner `.btn-noun`) · `#kingWizBtn` (`.btn`, inner `.btn-noun`, starts `display:none`) · `.king-sub.panel-sub` · `#kingProgress.king-progress` (starts `display:none`) · `.ing-controls` · `.menu-search` > `#kingSearch[type=search]` + `#kingSearchClear.ms-clear` · `#kingCatFilter.ing-filter[aria-label="Filter by category"][data-tidy-field="category"]` · `#kingClearFilters.btn.ghost.ing-clear-filters` · **`#kingList`**.

**Emitted by `renderKitchenPanel`:**
- `.king-row` with **`data-kid`**, `role="button"`, `tabindex="0"`, `aria-label="Edit <name>[ — product missing]"`
- `.king-main` > `.king-name` (+ optional `.king-drift.up|.down`) , `.king-link` (+ `.king-missing` when broken)
- `.king-price` (+ `.notcosted` when broken)
- empty states: `.empty-state.es-built` > `.es-icon`, `h3`, `p`, `.es-actions`, `#kingEmptyNew` / `.linklike.es-clear`
- filter option value `__tidy__`

**Wizard/modal:** `.kw-row[data-gi]`, `.kw-name`, `.kw-prod`, `.kw-pick`, `.kw-add`, `.kw-skip`, `.kw-head`, `.kw-explain`, `.kw-all`, `.kw-more`, `.kw-skipped`, `.kw-skiptoggle`, `.kw-srow[data-pid]`, `.kw-unskip`, `.kw-done`; `#king_name`, `#king_prod`, `#king_prodDrop` (`.opt.cat-opt[data-pid]`), `#king_prodClear`, `#king_cat.king-cat-read`, `#king_used.king-used`, `#king_err.ferr`, `#king_alts.king-alts` (`.ka-head/.ka-row/.ka-name/.ka-price/.use[data-pid]`), `#kingModalTitle/Save/Cancel/Close/Remove`.

**Dead-but-still-styled (no longer emitted, deliberate):** `.king-meta` (v67 category chip row, removed Q5), `.king-acts` (v44), `.king-empty`, `.king-tag`.

---

## 4. Storage & sync reachable from the pane

**localStorage: none for this pane's data.** The v108 pass deleted the `cafeDB_kitchenIngredients` / `KINGKEY` mirror; `kitchenIngredients` is server-only. The only LS write reachable is `cafeDB_lastTab` in `showTab` (`1389`). `kingQuery`, the category filter and `kingWizLimit`/`kingWizShowSkipped` are **in-memory only** — a re-render or reload resets them.

**Supabase writes:**
- `saveKitchenIngredients()` **642** → `rebuildKById()` then `dbSetSetting('kitchen_ingredients', kitchenIngredients)` → `pushWrite` upsert on `app_settings` (`270`). Returns the write so callers can chain `logChangeIfSaved`.
- `saveKingWizSkips()` **2279–2282** → `dbSetSetting('king_wiz_skips', ids)`.
- `logChangeIfSaved(write, 'ingredient_repointed' | 'ingredient_deleted', …)` → `menu_change_log` (2569–2570, 2621–2622).
- `logHistory()` → `price_history` (2571 on a **move only**, 2623 on delete).

**Reads:** `bootstrapSync` **443–446** — `app_settings` rows `kitchen_ingredients` (→ `kitchenIngredients` + `rebuildKById`) and `king_wiz_skips` (→ `setKingWizSkips`). `setg.error` is fatal by design (`406–411`): a failed settings read would silently empty every kitchen word.
**Backup/restore:** `4583` (payload), `4668` (`['kitchen_ingredients','array','ingredients']`), `4697`/`4717` (id + bad-`pid` integrity counts), `4745` (restore rpc as a `{key,value}` settings pair), `4788` (summary line).

**The SETTING-KEY boundary law** — stated at `4622–4625`: `kitchen_ingredients` and `king_wiz_skips` have **no row mapper** because their boundary is the *setting key*, not a table row; the key literals may appear only at `dbSetSetting` callers and in the backup assembler. `tests/terminology.test.js:100` pins `'kitchen_ingredients'` as a data contract.

**Sequencing laws:**
1. `saveKitchenIngredients` calls `rebuildKById()` **before** the push — every mutation path relies on `kById` being current immediately (`638`, `642`).
2. In `saveKingModal`'s `commit` (**2560–2572**): read `platesUsingKid` and `computeAvgFoodCost()` **before** mutating `k.pid` — `computeAvgFoodCost` is live and one line later would already be the after-figure.
3. `if(moved) parkRepointedProduct(oldPid)` (2567) — a repointed-away product is auto-parked in the wizard's Skipped list.
4. `if(moved) logHistory()` (2571) — a **rename is display-only** and must not stipple the trend line or reset the "since you last acted" clock. Same reason a rename logs no change entry.
5. A clean no-op (neither renamed nor moved) closes with **no write, no toast, no confirm** (2557).
6. The unit-category guard (`kingRepointGuard`) fires only for a **product change**, never a rename (2573), and the modal closes *before* `askConfirm` so the confirm stacks on top (2574) — same pattern as Remove (2651).
7. Bulk wizard add = **one** write for the whole batch (2430).
8. Delete lowers plate costs with no saving behind it — that is why the change-log entry exists (2614–2617).
9. **Relink semantics = `k.pid` only.** A relink mutates exactly one field; the kid, the name and every `{kid, qty}` plate line are untouched. That is what makes the broken-link N legitimate.

---

## 5. CSS ownership

| Block | File:lines | Notes |
|---|---|---|
| **§27 Q5 (v124) `#kingList`-scoped** | `css/style.css:3043–3070` | the list is one `display:block` bordered, `overflow:hidden` surface; rows lose their card chrome; `+` hairline between rows; `#kingList .king-price{grid-row:1}` (the base span-2 assumed the removed v67 meta row); **inset** `outline-offset:-2px` on `:focus-visible` (an outward ring dies in the surface clip — the §26 lesson); `hover` only under `(hover:hover) and (pointer:fine)`; `→ ` via `.king-link::before`, suppressed on `.king-missing`; `.king-missing`/`.king-drift.up|.down`/`.king-price.notcosted` (unscoped, but only this pane emits them); **≥640 three real columns** `minmax(150px,.7fr) minmax(0,1.6fr) max-content` with `#kingList .king-main{display:contents}`. |
| base `.king-*` | `1910–1939` | `.king-panel`, `.king-row` (card grid `1fr auto`), `.king-price`, `.king-main`, `.king-name`, `.king-link`, `.king-cat-read`, `.king-empty`, `.king-tag`, `.opt.king-opt`; ≤700px `.king-link{white-space:normal}`. §27 overrides the card chrome but the **base grid + typography still cascade** — restyling means reconciling both. |
| clamp | `2345` | `.king-link` `-webkit-line-clamp:2` (unscoped; pinned by Playwright). |
| interaction | `2295–2296` | `.king-row{cursor:pointer}` + outward `:focus-visible` ring, overridden inset by §27. |
| progress / wizard / used-line | `2048`, `2053–2069`, `2070` | `.king-progress`, `.kw-*`, `.king-used`. |
| shared, not owned here | `.ing-controls` `1102–1103`, `.ing-filter` `1104`/`1200`/`1505–1506`, `.menu-search`+`.ms-clear` `1027–1030`/`1195–1199`/`1390`, `.panel` `195–200`, `.panel-actions/.panel-sub/.panel-meta` `2419–2424`, `.empty-state/.es-actions/.es-clear` `1951–1955`/`2045`, `.btn-noun` `2279`, tab-entry animations `967–969` + `1009–1013`, **≥1024 48px title bar** `#tab-pantry > .panel > h2` at `1330–1335`. |
| **`.ing-card` is NOT used here** | — | `.ing-card` (`1110–1114`) is Products (`#ingList`, §29 `3141+`) and Plates (`#plateList`, §26 `3011+`). `.king-row` is a **parallel** implementation of the same card language. The v3 column band `.ing-colhead` (§V4b `3304–3326`) is `#plateList`-scoped and **is not emitted for `#kingList`** — the Ingredients pane has no header band today. |
| live tombstones (do not resurrect) | `2336–2337`, `2341–2342`, `2346–2347`, `1912–1914`, `1926–1930`, `2200–2202` | retired `#kingList` flex/2-up/3-up grids, empty-state `grid-column` rules, `.king-head`/`.king-sub` overrides, `.king-meta`, the `#kingNew` stretch. |
| cascade warning for the restyle | `3220–3224` | the `#tab-* > .panel > h2` 48px rule (1-0-2) **outranks** `.tbl-head` (0-1-1); V4a was told to reconcile, not paper over. It applies to `#tab-pantry` too. |

---

## 6. Tests pinning the pane

**Unit (`npm test`):**
- `tests/king-rows.test.js` — the Q5 contract file. Drift rules (38–64: <2 points ⇒ null; sub-1% floor pinned *at 1*; last two points only; the `isFinite('')` trap). The broken-link N counts **only the kid arm** (66–75). Row-markup source pins (77–86): `product missing`, `king-missing`, `no cost`, `platesUsingKid`, `king-drift`, `ingLastMovePct`, **and `!king-meta`**. `kingProductLabel` order + fallback (88–97).
- `tests/king-search.test.js` — 20 cases on `kingSearchFilter`, incl. no-in-place-sort (55), supplier tokens (96–97), null product table (91–92).
- `tests/terminology.test.js:87–104` — INVERSION GUARD: `renderKitchenPanel` / `kitchenIngredients` / `saveKitchenIngredients` must still exist; `'kitchen_ingredients'` is a data contract. `:104–108` both `data-tab` values exist. **`:115–143`** pins the crossing itself — nav button `aria-label="Ingredients"` + `<span class="nl">Ingredients</span>` on `data-tab="pantry"`, **and `panel('pantry') === 'Ingredients'`, i.e. `#tab-pantry`'s first `<h2>` text is exact-matched.**
- `tests/empty-states.test.js:78–86` — `renderKitchenPanel` must build its empty state via the shared helper; `:91` no bare `No ingredients match</div>` survivor; `:73–76` "No ingredients match." + "Clear search & filters" wording.
- `tests/king-rename.test.js`, `king-repoint.test.js`, `king-propose.test.js`, `king-wizskip.test.js`, `wizard-repoint.test.js` — modal/wizard logic.
- `tests/history-paths.test.js` (79–80, 129–131, 181, 190–192) and `tests/change-log.test.js` (78–79, 138–140, 611–619) — repoint logs / rename logs nothing, both drive `saveKingModal` with `renderKitchenPanel` stubbed.
- `tests/builder-search.test.js:34` reuses `kingSearchFilter`.
- `tests/smoke.js` — **181–197** `#kingList .king-row` count 2, search→1, brand search resolves via `.king-name`, "No ingredients match", `#kingSearchClear` restores; **198–212** rename flow; **213–241** wizard modal open/close/skip/unskip; **786** lands on `#tab-pantry`; **1080** builder-hint link routes to `#tab-pantry`.

**Playwright:**
- `tests/visual/fresh-states.spec.js:382–442` — **the Q5 DOM contract**: one shared left edge at both 380 and 1280 (`kingCols === 1`), `#kingList` is a clipped bordered surface, `.king-link` clamp `2`, the inset `#kingList .king-row:focus-visible` rule exists in the CSSOM, and the **rendered** states: `.king-link.king-missing` contains `product missing`, `.king-price.notcosted` **=== `'no cost'`**, `.king-drift` **=== `'+12.0%'`** with class `up` and non-zero width; Enter on a focused `.king-row[data-kid="K1"]` opens `#kingModal`; screenshots `q5-king-rows-{mobile,desktop}.png`.
- `:129–155` — v44 item 6b: `.king-row[data-kid="K1"]` has `role="button"`, `.king-acts` count 0, click → `#kingModal` titled "Edit ingredient", Remove → confirm on top → row gone.
- `:314–333` — v45 item 3: header order `.king-panel > h2` → `#kingNew` → `.king-head .king-sub`, with a 1px divider on the h2.
- `:33–43` — `fresh-pantry-mobile.png` screenshot.
- `tests/visual/layout-consistency.spec.js:26, 81–91` — pantry is in the five-tab skeleton: panel top/left, title y, divider y, title text left, one title type, actions-row y and primary-button left edge **identical within 1px** to Products and Menu; `#kingNew` must sit on the h2 text edge.
- `tests/visual/screenshots.spec.js:17` — `pantry` in the tab screenshot sweep.

---

## 7. Traps

1. **The naming inversion is deliberate and guarded.** `data-tab="pantry"` = the screen LABELLED "Ingredients"; `data-tab="ingredients"` = "Products". `renderIngredients` is **Products**, not this pane. `HANDOVER-127-ingredients.md` records that the inversion already "claimed a victim at planning time" — the Q5 item named the wrong function. Renaming identifiers to match labels has caused rollbacks (`terminology.test.js:87–99`).
2. **Relink heals kid lines only.** `platesUsingKid` (2596) + its law comment (**2597–2602**): N counts the `{kid}` arm *on purpose*, because the copy promises "relink to keep N plates costed" and a relink mutates only `k.pid`. A legacy bare-`pid` line resolves through `byId` in `lineProduct` (648–652) and a relink cannot heal it — counting it would make the sentence a lie for exactly those plates. **The v124 review caught the first cut doing that.** ⚠️ `docs/QUEUE.md:60` (the V4c item) says *"Used in N plates counts BOTH line shapes"* — that instruction contradicts this shipped law for the broken-link string; the both-sides rule belongs to a *usage* count, not to the relink promise.
3. **The both-sides law lives at `productRefs` (2104–2114), not here** — deleting a PRODUCT genuinely breaks both paths, which is why `deleteIngredient` (2115–2129) gates on `refs.ingredients.length || refs.plates.length` (a CodeRabbit-caught real bug; 84 of 179 of Max's lines take the direct route).
4. **"Used in N plates" has two different meanings today.** In the row (2245) it means *plates a relink would rescue*. In the edit modal `#king_used` (2527–2534) it means *saved plates containing this kid* — same kid-arm computation, different sentence ("changing the product updates all of them"). The delete confirm (2610–2612) uses the same kid arm again. None of the three is `productRefs`.
5. **Row `aria-label` OVERRIDES the row's content** (2250) — price and drift are never announced. Recorded in `docs/QUEUE.md:98` as a V10 (ex-Q10) item: *"Decide the screen-wide rule; the `vbadge` aria is the good example."* Products rows solved it locally with per-span `aria-label`s (2034–2035); this pane did not. Do not silently fix it inside the restyle — it is queued.
6. **Source-grep pins are not render pins.** All seven Q5 markup greps passed with the two render branches inverted; that is why `fresh-states.spec.js:414–437` asserts on the rendered DOM. Any restyle that changes branch structure must keep both.
7. **`isFinite('') === true`** — the `typeof last!=='number'` guard at `1540` is load-bearing; without it a `''` point renders a confident `−100.0%`. Pinned at `king-rows.test.js:62`.
8. **Deliberate omissions, recorded:** the v67 category chip row is gone from the row by design (2231–2234, CSS tombstone 1926–1927, test 85); `.king-acts` removed v44 item 6b (CSS 1930); no per-skip confirms in the wizard, by design (2264–2269, 2416); `#kingWizBtn` stays visible while open so "Close setup" is reachable (2337); `#kingProgress` counts a skipped product as not-done, "stays literal" (2335).
9. **Two visual languages for one fact**, recorded and unresolved in `HANDOVER-127-ingredients.md`: a linked product with no price shows bold `—` (`unitCostStr`), a missing product shows muted `no cost`.
10. **Tidy-door capture ordering** (see §2) — moving `#kingCatFilter` or adding a normal `change` handler that re-fills it can break the "Manage list…" door.
11. **Filter state is not persisted** and `renderKitchenPanel` re-reads `#kingSearch` from the DOM every call (2208) while also keeping `kingQuery` — two sources that must stay in step.

---

## 8. Gap against spec §3.4 — `Ingredient | Category | Unit cost | 30-day change | Used in N plates`

Spec: `docs/design_handoff_ezplate_redesign/V3-Design-Package.md:55` and the SaaS mock `Redesign v3 - SaaS.dc.html:230` (band labels: Ingredient · Category · Unit cost · 30-day change · **Used in**). Queue item: `docs/QUEUE.md:58–60`.

| Spec column | Today | Backing data if built |
|---|---|---|
| **Ingredient** | ✅ `.king-name` (2251) | `k.name` |
| **Category** | ❌ **not on the row.** Removed from the row in Q5/v124 on purpose (CSS tombstone `1926–1927`, test pin `king-rows.test.js:85`). It survives only as the `#kingCatFilter` dropdown and as a read-only line in the edit modal (`#king_cat`, `updateKingCat` 2480–2485). | `kingCategory(k)` (2189) = `byId[k.pid].category`. **Derived, never stored on the ingredient** — repointing or editing the product changes it automatically. `kingCategories()` (2190) already builds the distinct set. Zero new data needed; re-adding it *reverses a recorded Q5 design decision and turns `king-rows.test.js:85` red* — that must be a conscious flip, not a side effect. |
| **Unit cost** | ✅ `.king-price` (2243) — `unitCostStr(kp)`, `—` when the product has no `cost_per_base_unit`; `no cost` when the link is broken. | `p.cost_per_base_unit` + `base_unit`. |
| **30-day change** (pill or muted "steady") | ⚠️ **partial.** Renders as an inline `.king-drift` badge on the *name* line, not a column, and only when non-null — there is **no muted "steady"/"—" placeholder**; a steady ingredient shows nothing. Also it is **"the last logged move", not 30 days** — `ingLastMovePct` (1536–1543) compares the last two points of `ingPriceLog[pid]` regardless of their dates, with a sub-1% noise floor. | `ingPriceLog` (`ing_price_history`). Products already ships the column form: `.ing-drift` with a `none` variant rendering `—` plus an `aria-label`, at `2033–2035`. A true 30-day window would need a new time-bounded rule and would **break the "row and What-moved can never disagree" invariant** (1530–1535) unless the movers panel moves with it. |
| **Used in N plates** | ❌ **no count on the row.** N appears only inside the broken-link warning string (2245–2247) — i.e. only on rows whose product is missing — and in the modal `#king_used` (2530–2531) and the delete confirm (2610). A healthy row shows no usage at all. | `platesUsingKid(kid)` (2596) = kid arm only; `productRefs(pid)` (2104–2114) = kid **and** bare-pid arms, the both-sides law. Per trap 2, which one to use is the open decision: the *relink promise* must stay kid-only, while a neutral "Used in N plates" column arguably wants `productRefs`. Both read `savedPlates` already in memory — no new store. |

**Also present today but absent from the spec's five columns** (must be re-housed, not dropped): the linked-product sentence `.king-link` (`→ description — brand · supplier`, the pane's only visible link to Products), the loud broken-link warning, `#kingProgress` + `#kingWizBtn` (setup-from-products), and the `Clear filters` button. The spec's Ingredients screen shows a search + select control row, which the pane already has (`.ing-controls`), and a header band, which `#kingList` does **not** emit — `.ing-colhead` exists only `#plateList`-scoped (§V4b, `3304–3326`).
