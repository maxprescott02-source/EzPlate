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
dismiss. Max (relaying a user) wanted it **static and discoverable**: a pill in the menu actions row. It's now an
**"EzPlate Insights" pill** parked at the **RIGHT edge** of the Menu `.panel-actions` card row (above the Delete
button) — a rainbow-gradient **outline**, with the **text painted in that same rainbow** (gradient-clipped) and a
**generic four-point AI sparkle** icon. Tapping it drops the **same panel** down from the pill with the **same spring**
(`msugPop`), same content, same open/close/outside-click/Escape/focus behaviour. Panel title is now just **"Menu
insights"** (was "What stands out on this menu").

**On the icon (Max asked about the Gemini logo):** we deliberately do **not** use Google's actual Gemini logo — it's
their trademark, and embedding the official mark as UI decoration in a commercial third-party app isn't covered by
fair use (Google's brand guidelines gate it). The pill uses a **generic four-point sparkle** — the now-ubiquitous,
vendor-neutral "AI" glyph — in the rainbow gradient, which reads as AI/Gemini-adjacent without appropriating the mark.
The honest "Refined by Gemini" text credit in the panel is unchanged.

## What moved / what went
- **HTML (`index.html`):** the `#menuSuggestFab` wrapper (with `#menuSuggestBtn` + `#menuSuggestPanel`) relocated from
  the end of `#tab-analysis` INTO the `.panel-actions` row, placed **after** the `.panel-sub` strapline (so the
  strapline's flex-grow pushes the pill to the right edge on desktop). The trigger is `<button class="msug-pill">`
  with a `.msug-pill-spark` inline sparkle SVG + a `.msug-pill-text` span ("EzPlate Insights"). **Removed:** the old
  rainbow-logo SVG, the `.msug-restore` edge tab, the `.msug-foot` / "Hide the suggestions button" control.
- **CSS (`css/style.css`):** `.msug` is now `position:relative; display:inline-flex` (an inline positioning context,
  was `position:fixed` bottom-right); `.an-head .msug{margin-left:auto}` parks it at the right edge, and
  `@media(max-width:639px){.an-head .panel-sub{order:1}}` keeps the pill with the buttons while the strapline drops
  below on phones. New `.msug-pill` — rainbow border via `linear-gradient(...) padding-box, linear-gradient(rainbow)
  border-box`, `--radius-pill`, sized to the `.btn` row (fully opaque). `.msug-pill-text` paints the label in the
  **same rainbow** via `background-clip:text` + `-webkit-text-fill-color:transparent`; `.msug-pill-spark` is the
  15px sparkle glyph (gradient-filled in the SVG). The panel anchors `left:0; top:calc(100% + sp-2); z-index:60`
  (drops DOWN), `transform-origin:top left`, and `msugPop` flipped to `translateY(-20px)→0` so the spring plays
  downward out of the pill. **Removed:** all `.msug-btn` / `.msug-logo` / `.msug-pill-dot` / `.msug-restore*` /
  `.msug-foot` / `.msug-hide` / `.msug.dismissed` rules and the desktop `@media(min-width:1024px) .msug{...}`
  reposition. (`.panel` is `overflow:visible`, so the drop-down isn't clipped.)
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
- The **pill** parked at the RIGHT edge of the Menu card — the rainbow **outline + gradient-clipped text + sparkle**
  read cleanly in light AND dark. **Watch the gradient text contrast** (the orange stop is the lowest-contrast on a
  light surface — bump the text to a solid accent if it reads weak); confirm it isn't invisible on any OS/browser
  that lacks `background-clip:text`. On a narrow phone the strapline drops below the buttons and the pill stays with
  them (right-aligned) — check it doesn't look stranded.
- **Tap → the panel springs DOWN from the pill** (the signature moment, now downward); the panel isn't clipped and
  doesn't run off the right edge at 380px (it anchors to the pill's left; if the pill ends up mid-row on some width,
  watch for right-edge overflow — flag if seen).
- ×, outside-tap, Escape all close it; a re-tap toggles; keyboard focus lands in the panel on open and back on the
  pill on close.
- Confirm the old floating bottom-right button is fully gone and nothing else shifted on the Menu tab.

## NOT built / deliberately left
- **No hide/dismiss affordance** — a static inline pill doesn't need one (Max's call).
- **Pill visual = rainbow OUTLINE + rainbow-clipped text + generic AI sparkle** (Max chose outline over a filled
  rainbow; the sparkle is vendor-neutral, NOT Google's Gemini logo — see the icon note above).
- **Engine untouched** — same insights, same phrasing, same "nothing to say → hidden" rule; only the panel TITLE
  changed ("What stands out on this menu" → "Menu insights").
- **No JS popover repositioning** — pure-CSS anchor (`left:0`, drops down). If real-device testing shows right-edge
  overflow at some width, a small `@media` tweak or a right-anchor flip is the follow-up (noted above).
