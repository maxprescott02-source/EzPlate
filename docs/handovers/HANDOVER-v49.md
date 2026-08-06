# HANDOVER — v49 (cross-tab layout consistency: ONE panel skeleton)

**Date:** 18 Jul 2026
**Branch:** `refactor/panel-structure` (off `fix/pack-control-and-menus` at v48 — main doesn't
have v42–v48 yet, so this branches off the pending branch and merges after it).
**Brief:** `ezplate-fable-layout-consistency.md`. Skeleton approved by Max before editing.

## Why this batch exists

Cross-tab consistency kept regressing because it was treated as a design problem when it was a
structural one: five hand-written headers, each with its own wrappers and spacing values, nudged
toward each other by eye every few batches. v49 gives every tab ONE skeleton and adds a
Playwright spec that measures it, so drift now fails the suite instead of reaching Max's phone.

## The audit (what each tab was doing differently)

| Tab | Title | Divider | Buttons | Spacing encoding |
|---|---|---|---|---|
| Dashboard | h2 + inline live value | on the h2 | none in header | tokens + bespoke `#dashBody` offsets (panel started 2px lower than every other tab; 20px lower on desktop) |
| Builder | h2 ×2 | on the h2 | bottom of docket | tokens + 2 inline styles |
| Ingredients (pantry) | **h3** faked to look like h2 by **3 generations of overrides** (6 rules) | negative-margin stretch trick on the h3 | inside the title row | 3 rule generations, 2 dead |
| Products | h2 | on the h2 | own row (16px edge vs the title's 20px) | raw px + **inline `style=` attributes** |
| Menu | h2 | on the h2 | inside the picker control | mixed raw px/tokens |

The same left edge was encoded three ways (tokens / raw 16px / inline styles) — that's the
mechanism of the drift.

## The canonical skeleton (now in the v49 CSS batch)

`.panel > h2 (small-caps title, divider on its border-bottom) > optional .panel-actions
(primary .btn → plain/ghost → inline .panel-sub strapline) > tab controls > body.`
One left edge: `--sp-5`, collapsing to `--sp-4` ≤560px in ONE shared rule. All header spacing
on tokens; zero inline styles; zero raw px.

## What changed per tab (ids/handlers untouched — verified by jsdom smoke)

- **Pantry**: `h3` → real `h2` as a direct panel child; `.king-head` is now just the actions
  row (carries `.panel-actions`); `.king-sub` carries `.panel-sub`. All six stacked
  `.king-head*` rules replaced by tombstone comments pointing at the v49 batch. Also killed
  the stacked-era `#kingNew{flex:1 1 auto}` phone rule that made pantry's "+ New" render wider
  than every other tab's (it had been *countered* by a later rule rather than removed — classic
  drift; caught by screenshot review after the counter-rule was removed).
- **Products**: `.ing-tools` carries `.panel-actions`; `#lastImport`/`#ingCount` inline styles
  replaced by shared `.panel-meta`; `.ing-controls` tokenized; the ≥1024 padding special-case
  deleted (the shared edge applies at every width).
- **Menu**: `.an-controls` joins the shared edge and the sp-3 divider gap; buttons stay inside
  the picker (intentional — they operate the control).
- **Dashboard**: bespoke `#dashBody` offsets removed (2px top pad; sp-4 panel margin at
  tablet; margin:0 on desktop grid) — the dash panel now starts exactly where every other
  tab's panel does at every width.
- **Builder**: already conformed up top; its two inline styles moved into CSS
  (`.docket-head` margin, `#docketPanel > .pad`).

## Legitimate exceptions (documented in the spec header too)

- **Builder's Publish/Save/Print/Clear stay at the docket's bottom** — they commit the
  assembled plate (form-submit semantics), not header actions.
- **Menu has no actions row** — its buttons are part of the menu-picker control.
- **Menu's table body keeps its own `.atable-wrap` inset** — restructuring it risks the
  v44-pinned empty-state centring; body interiors were out of scope.
- Card lists (`#kingList`/`.ing-list`) keep their existing shared 16px inset — they already
  mirror each other (v46) at every breakpoint; consistent across tabs, which is the goal.

## The measurement test (what makes it stick)

`tests/visual/layout-consistency.spec.js`: at 380px AND 1280px, visits all five tabs and
asserts panel top, title y, divider y, title text left, title font signature, actions-row y,
and button left edges are identical **within 1px** across tabs. **Falsified deliberately**:
injecting a 26px margin on one tab made it fail with a named assertion before the drift line
was removed — it's not a vacuous test.

## Verification

- `npm test` = **138 green**; `node -c` clean; **jsdom smoke passes** (wiring: all header ids
  still bind); **44 Playwright checks pass** (42 prior — one pantry-header check updated for
  the real-h2 structure, deliberately — + 2 new consistency checks). Six version spots at
  **v49**. Screenshots regenerated; pantry/Products headers verified identical by eye at 380px.

## Deliberately NOT done

- No copy changes, no feature changes, nothing in the invoice review area.
- The dead first `renderAnalysis`/`aRow` definitions stay (hard rule — noted again as a
  maintenance trap, Max's call whether a future batch removes them).
- Dead `.db-tools` CSS spotted (no matching markup anywhere) — listed here, not deleted:
  out of scope.

## Needs Max's phone (branch preview)

- Switch all five tabs in sequence at phone width, then on desktop: titles, dividers, and
  button rows should land in exactly the same place every time (no "jump" between tabs).
- Both themes.
- Pantry specifically: "+ New" / "Set up" buttons now natural width on phones (they used to
  stretch); strapline under them; search bar edge now matches the other tabs at 16px.
- Products: the "No invoice imported yet" line and count line sit on the title's edge.
- Dashboard: panel no longer starts a hair lower than the other tabs (2px on phone, 20px on
  desktop) — confirm nothing looks newly cramped above the chart.
- Builder unchanged by eye (only inline styles moved) — a quick glance that the docket looks
  exactly as before.
