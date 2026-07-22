# HANDOVER v74 — Menu insights: floating FAB → static "EzPlate Insights" pill

**Completed:** 23 Jul 2026 · branch `feature/menu-insights-pill` · request from Max (relaying a user suggestion).

Branch off **v73** (`origin/main` = `dfe28a2`, PR #18 merged). Baseline **287 node tests green**, jsdom smoke green,
six spots v73. Ended **287 node green** (unchanged — presentation change; the smoke FAB section was rewritten in
place, node suite untouched), jsdom smoke green ([16] Suggestions section rewritten to the pill), `node -c` clean,
six spots → **v74**.

**Client only — HTML + CSS + JS + one smoke section.** Zero contact with the protected parser region, the money law,
the naming inversion, the plate/dish/menu data model, the invoice subsystem, or the insight ENGINE (`computeInsights`
/ `deriveInsights` / phrasing are all unchanged — only the surface that shows them moved). No new deps, no build step.

---

## The change
The menu insights lived behind a **floating bottom-right rainbow FAB** (v69) with a v71 swipe-to-hide + edge-tab
dismiss. Max (relaying a user) wanted it **static and discoverable**: a pill inline with the menu buttons. It's now
an **"EzPlate Insights" pill** in the Menu `.panel-actions` row — a rainbow-gradient OUTLINE, no logo, sitting beside
`+ New menu` / `+ Existing dish` (directly above the Delete button). Tapping it drops the **same panel** down from the
pill with the **same spring** (`msugPop`), same content, same open/close/outside-click/Escape/focus behaviour.

## What moved / what went
- **HTML (`index.html`):** the `#menuSuggestFab` wrapper (with `#menuSuggestBtn` + `#menuSuggestPanel`) relocated from
  the end of `#tab-analysis` INTO the `.panel-actions` row. The trigger is now `<button class="msug-pill">` with a
  `.msug-pill-dot` + the text "EzPlate Insights" (the rainbow-gradient logo SVG is gone). **Removed:** the
  `.msug-restore` edge tab, the `.msug-foot` / "Hide the suggestions button" control.
- **CSS (`css/style.css`):** `.msug` is now `position:relative; display:inline-flex` (an inline positioning context,
  was `position:fixed` bottom-right). New `.msug-pill` — rainbow border via `linear-gradient(...) padding-box,
  linear-gradient(rainbow) border-box`, `--accent` text, `--radius-pill`, sized to the `.btn` row (fully opaque —
  it's inline, not "in the way", so none of the old translucent-at-rest treatment). `.msug-pill-dot` is a small
  rainbow dot. The panel now anchors `left:0; top:calc(100% + sp-2); z-index:60` (drops DOWN), `transform-origin:top
  left`, and `msugPop` flipped to `translateY(-20px)→0` so the spring plays downward out of the pill. **Removed:** all
  `.msug-btn` / `.msug-logo` / `.msug-restore*` / `.msug-foot` / `.msug-hide` / `.msug.dismissed` rules and the desktop
  `@media(min-width:1024px) .msug{...}` reposition. (`.panel` is `overflow:visible`, so the drop-down isn't clipped.)
- **JS (`js/app.js`):** `menuSuggestOpen/Close/Toggle` kept (comment updated; behaviour identical). **Removed entirely:**
  `loadSuggestFabHidden`, the `suggestFabHidden` var, `applySuggestFabDismissed`, `setSuggestFabHidden`,
  `suggestFabDismiss`, `suggestFabRestore`, the pointer-swipe-to-dismiss wiring, and the `bootstrapSync`
  `suggest_fab_hidden` read. `renderMenuInsights` shows/hides the **pill** by whether the menu has anything to say
  (unchanged logic, minus the dismissed toggle). `wireMenuSuggestFab` now wires only: pill click → toggle, × → close,
  outside-click → close, Escape → close.

## Retired contract (deliberate)
The **v71 swipe-to-hide / rainbow edge-tab / persisted `suggest_fab_hidden` setting is GONE** (Max's call — a static
inline pill is never "in the way", so there's nothing to hide). An old `suggest_fab_hidden` value left in a user's
Supabase settings or localStorage is simply **ignored** — no reader remains, no migration needed. The v71 smoke
assertions for dismiss/restore/persist were removed and replaced (see below); this is a pinned-contract change, noted
here and in the PR.

## Tests / verification
- **jsdom smoke [16]** Suggestions section rewritten to the pill: shown when the menu has insights; lives inline in
  `.panel-actions` (not a fixed FAB); reads "EzPlate Insights" with the accessible label + rainbow dot and **no SVG
  logo**; starts closed; tap opens (aria-expanded flips) + focus moves into the panel; same `.mi-line` content +
  credit; re-tap toggles closed; × closes + focus returns to the pill; Escape closes; the `.msug-restore` /
  `#menuSuggestDismiss` edge-tab and the `suggestFabDismiss`/`suggestFabHidden` API are **gone**; a menu with nothing
  to say hides the whole pill.
- `npm test` **287 green** (unchanged — the engine/node tests don't touch this surface). `node -c` clean (app.js +
  sw.js). Settings version pin passes. Six spots → **v74**.

## Needs Max's phone (motion + layout only show on device — nothing here is browser-verified)
At **380px and desktop, both themes**, then with **OS reduced-motion ON** (spring should drop out):
- The **pill** in the Menu actions row — rainbow outline reads cleanly in light AND dark; sits nicely beside
  `+ New menu` / `+ Existing dish`; wraps sensibly on a narrow phone (it likely drops to its own line, left-aligned).
- **Tap → the panel springs DOWN from the pill** (the signature moment, now downward); the panel isn't clipped and
  doesn't run off the right edge at 380px (it anchors to the pill's left; if the pill ends up mid-row on some width,
  watch for right-edge overflow — flag if seen).
- ×, outside-tap, Escape all close it; a re-tap toggles; keyboard focus lands in the panel on open and back on the
  pill on close.
- Confirm the old floating bottom-right button is fully gone and nothing else shifted on the Menu tab.

## NOT built / deliberately left
- **No hide/dismiss affordance** — a static inline pill doesn't need one (Max's call).
- **Pill visual = rainbow OUTLINE** (Max chose it over a filled rainbow) — matches the app's restrained scheme.
- **Engine untouched** — same insights, same phrasing, same "nothing to say → hidden" rule.
- **No JS popover repositioning** — pure-CSS anchor (`left:0`, drops down). If real-device testing shows right-edge
  overflow at some width, a small `@media` tweak or a right-anchor flip is the follow-up (noted above).
