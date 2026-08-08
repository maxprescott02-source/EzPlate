# Handoff: EzPlate Redesign

## Overview
A full-app visual redesign of EzPlate (plate/menu costing PWA for cafés): Dashboard, Menu, Plates, Ingredients, Plate builder, Products, Invoice import and Settings, desktop-first with defined 380px mobile states. Same palette and data model as the shipped app; the changes are structural — verdict-first hierarchy, one-surface lists instead of card-per-row, figure-forward typography, and a read-only AI briefing as the flagship dashboard element.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, NOT production code to copy. The task is to **recreate these designs inside the existing EzPlate codebase**: vanilla HTML/CSS/JS, four hand-written files (`index.html`, `css/style.css`, `js/app.js`, `sw.js`), **no build step, no framework, no component library, no new dependencies**. Every visual value in the mocks maps onto CSS custom properties that already exist in `css/style.css`.

## Hard repo rules (from the codebase's CLAUDE.md — violating these has caused rollbacks)
- Only ever change text a human reads. **Never rename identifiers, classes, ids, `data-tab` values, localStorage keys or Supabase tables.** The tab labeled "Plates" is `data-tab="builder"`, "Products" is `data-tab="ingredients"`, "Ingredients" is `data-tab="pantry"` — this inversion is deliberate.
- Visual changes are **surgical, one screen per batch** — a previous wholesale density pass was rolled back.
- localStorage holds view preferences and derived caches ONLY (the density toggle qualifies; nothing else new).
- The AI never produces a figure; it only phrases numbers the app computed. No UI may imply the AI can change data.
- Object nouns: Product, Ingredient, Plate, Menu. Never "recipe" or "dish" in copy.
- Currency displays round to the cent; stored costs stay exact.

## Fidelity
**High-fidelity.** Colors, type sizes, weights, spacing and radii in the mocks are final values; recreate pixel-perfectly using the existing token set. The mock data (Fish & Chips $6.96 etc.) is illustrative.

## Screens
Each file toggles light/dark via its ◐ control; implement both modes through the existing `data-theme` tokens.

1. **Redesign - Dashboard v2 Desktop.dc.html** — Verdict headline (44px mono, semantic color) + scope chips (≤5 menus enumerate; 6+ collapse to All + two most-used + "N more ▾" ranked dropdown, worst first, uncosted menus excluded) + full-width trend chart (over-target wash, dashed target line, accent markers for user changes) + AI briefing panel ("What needs attention": sparkle icon 16px, small-caps heading, sentence rows with one quiet link each, credit line "Phrased by Gemini — every figure computed by EzPlate") + What moved + Dig in as two-column row lists.
2. **Redesign - Menu.dc.html** — Real table on desktop: sections as small-caps eyebrows inside one surface; columns Plate / Cost (with min–max range under) / Suggested / Menu price / Margin. The Margin cell composes the verdict: "27.2% ✓" green, "42.2% · +90c" amber, "45.5% · +$2.60" red, "cost it →" muted for uncosted. Filter toolbar wraps below ~1130px.
3. **Redesign - Plates.dc.html** — Library rows: name·category / published-where (accent when on a menu, muted "Unpublished") / plate cost right.
4. **Redesign - Ingredients.dc.html** — Rows: ingredient / "→ linked product · brand · supplier" (+ inline drift % when the last invoice moved it) / unit cost. Broken link state: "⚠ product missing — relink to keep N plates costed" in --bad.
5. **Redesign - Plate Builder.dc.html** — Full-page editor: back link + plate name as 28px underlined input; docket card (search on top, dashed EZPLATE — DOCKET head, columned lines: name+linked product / qty input+unit / unit-cost chip (tap to edit) / line cost / remove; misc rows; add-misc); sticky right cost panel: 36px total, suggested at target, "On menus" list with price + tinted margin verdict + "Add to another menu", category, Save primary + Print/Clear. Below ~1120px the panel stacks under the docket.
6. **Redesign - Products.dc.html** — Table rows: product·brand / category / supplier / price (16px mono + unit) / Change column (drift from last invoice, semantic color, "—" when untouched).
7. **Redesign - Invoice Import.dc.html** — Modal: file strip, verdict sentence up front ("11 matched and ready · 2 need your eye · 1 new product"), review list with row tints (--warn-bg for flagged/review), checkboxes (matched pre-ticked; flagged/review/new NOT pre-ticked — this mirrors an existing invariant), footer "Confirm N changes" counting ticked rows.
8. **Redesign - Settings.dc.html** — Sectioned modal: left nav (accent-weak active), setting rows: label+help left, control right.
9. **Redesign - Mobile States.dc.html** — Four 380px frames: Dashboard, Menu (one line per plate, colored figure is the verdict), Builder (sticky footer = total + margin verdict + Save together), Products (price+drift stacked right, floating + button). Bottom 5-tab nav, 52px+ targets.
10. **Design Package.dc.html** — The system spec: tokens, type scale, spacing/shape, buttons, fields, chips, rows, margin verdict block, AI panel rules, navigation, motion/state table, empty states, density modes, skeletons, keyboard/focus/contrast rules, implementation notes. **Read this first; it is the rulebook.**

Reference (current app, for diffing): `Current - *.dc.html` recreate today's UI verbatim; `src/` holds the real `index.html`, `style.css`, `app.js` copies.

## Interactions & Behavior
Specified in Design Package sections 11–15. Summary: durations --t-fast/.14s, --t-med/.22s, --t-slow/.3s, easing cubic-bezier(.2,.7,.3,1); five states per interactive element (rest/hover/pressed/focus-visible/disabled); rows hover to --field; optimistic repaint with server-confirmed toast wording; AI phrasing cross-fades in; skeleton bars (no spinners-in-cards, no layout shift); `/` focuses search, Esc closes top layer, Enter activates focused row, arrows scrub the chart; focus trap in dialogs; all motion off under prefers-reduced-motion.

## State Management
No new stores. New view state: dashboard scope (existing `dashScope`), menus-dropdown open, density preference (localStorage view pref), invoice tick set (existing `invConfirmState` rules unchanged).

## Design Tokens
All existing in `css/style.css` — no new tokens. Core: bg #F7F3EC/#191412 · surface #FFFDF9/#241E1B · field #F2EADF/#221C19 · text #2A1F1A/#F3EDE5 · text2 #6B5D54/#C9BBAF · muted #756759/#97897E · border #E8DFD3/#392F2A · border2 #D9CDBD/#4A3E37 · brand #3E2C26/#F3EDE5 · accent #B84E0C/#F08A3C · good #2E6B44/#6FBE8F · warn #A96206/#E2A54B · bad #B03A2E/#E76D5C. Elevation: cast shadow light / none dark. Spacing 4·8·12·16·20·24·32. Radii 16/12/10/999. Type: Nunito Sans for words; ui-monospace stack + tabular-nums for every figure; scale and usage in Design Package §2.

## Assets
No new assets. Logo mark, nav icons (24px viewBox, 2px stroke, round caps) and Gemini sparkle gradients (`#ezSparkGrad`/`#ezSparkGradDeep`) already exist in `index.html`. Theme toggles in the mocks use the moon icon from the existing moon/sun SVG pair; wire it to the shipped `applyThemePref` behavior.

## Merge plan — how to land this WITHOUT breaking the shipped app
The repo's own rule is "visual changes are surgical, one screen per batch" (a wholesale pass was rolled back once). Follow it:

1. **Batch order:** Dashboard → Menu → Products → Plates → Ingredients → Builder → Invoice review → Settings. One batch = one PR = one review, per the repo's workflow.
2. **Change CSS and markup structure only inside the render functions that own each screen** (`renderDashboard`/`verdictHtml`/`trendChart`/`menuCompareHtml`/`digInHtml`, `renderAnalysis`/`aRow`, `renderIngredients`, `renderPlatesTab`, `renderKing*`, `renderPlate`, `renderInvReview`, the Settings markup in `index.html`). Do not restructure `js/app.js` beyond the HTML strings those functions emit.
3. **Keep every existing hook**: ids (`#dashBody`, `#aBody`, `#ingList`, `#plateList`, `#lines`, `#total`, `#builderModal`…), `data-tab` values, `data-mid`/`data-pid`/`data-scope` attributes, `lt-*` and `st-*` state classes, and the `.mi-row` click-delegate pattern. The redesign changes what rows LOOK like, never how they are found or wired.
4. **Reuse the shipped tokens** in `css/style.css` — the redesign introduces zero new custom properties. New layout classes should be added, old ones left in place until their screen's batch retires them.
5. **Fragile areas need regression tests first** (repo rule): invoice review rendering (`invRowState` tinting, full-row re-render, auto-tick only for `'matched'`), the builder draft flow, and the Menu-tab row markup pinned by existing tests. Run `npm test` per batch; the visual Playwright specs in `tests/visual/` are the diff harness — update their snapshots per screen batch, never wholesale.
6. **Do not touch** the protected parser region in `js/app.js` (between `var INV_EXCLUDE=` and `function unitLabelFor(`) or the functions its docs name — the invoice REVIEW UI is fair game, the parsing is not.
7. **Desktop shell (sidebar) is additive**: implement as a ≥1024px media-query layer over the existing bottom-nav markup (the current app already swaps chrome at that breakpoint via `.side-brand`), so mobile ships unchanged until its own batch.
8. **Density toggle** persists in localStorage as a view preference — the one legal kind of new localStorage key.

## Files
All `.dc.html` files listed above are included in this folder. Open any in a browser; use its ◐ toggle for dark/light.
