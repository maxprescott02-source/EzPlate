# HANDOVER v69 — Suggestions rainbow FAB · richer non-reprice advice · misc name field back · invoice-header mobile stacking

**Completed:** 22 Jul 2026 · branch `feature/suggestions-fab`.

Brief: `~/Downloads/ezplate-opus-suggestions-fab.md`. Branch off **v68** (origin/main was already at v68 — PR #13
`fix/visual-consistency-pass` had merged; the v68 CLAUDE.md "State as of" still described that branch as
unmerged). **Client + CSS + tests only — no DB/schema change, branch-safe** (unrelated to the still-pending
v55 migrations, which are already applied to prod). Baseline **261 green** → **270 green**; jsdom smoke green (§16 extended, §17 unchanged);
`node -c` clean on `js/app.js`, `sw.js` + all four `api/*.js`. **Six spots v68 → v69.**

Invariants held: protected parser region untouched; **money stays deterministic** (the app computes every
number; the optional Gemini layer only phrases and is forbidden a figure not in the facts — the new insight
types all pass numbers through `facts`); naming inversion left alone; no new deps/build step; the live (2nd)
`renderAnalysis`/`aRow` untouched. Two Max decisions taken up front: (5) proceed on the written description
(no screenshot arrived); (1) FAB-only — suggestions live entirely behind the button, as briefed.

The three design skills (`/frontend-design`, `/web-design-guidelines`) guided the FAB; the ONE flourish (the
gradient logo) is spent on the button, everything around it stays quiet.

---

## 1 — Menu Suggestions → floating rainbow button + panel (bottom-left of the Menu tab)
The whole content system (`computeInsights` → `renderMenuInsights` → Gemini phrasing) is unchanged; **only the
container moved** from an always-visible inline block to an on-demand panel behind a persistent button.
- **DOM** (`index.html`, inside `#tab-analysis` so it only shows on the Menu tab): `#menuSuggestFab` wraps
  `#menuSuggestPanel` (holds `#menuInsights` + a small "Suggestions" eyebrow + ×) and `#menuSuggestBtn` (the
  EzPlate logo SVG re-stroked with a **Gemini rainbow gradient** `#4285F4→#9B72CB→#D96570→#F2A65A`).
- **Behaviour** (`js/app.js`): `renderMenuInsights` now toggles `#menuSuggestFab[hidden]` — shown only when
  the current menu has something to say, hidden (and panel force-closed) otherwise. `menuSuggestOpen/Close/
  Toggle` + a one-time `wireMenuSuggestFab` IIFE: tap toggles, ×/outside-click/Escape close, `aria-expanded`
  tracks state. The panel reflects the SELECTED menu (re-rendered by `renderAnalysis` on menu switch); an open
  panel stays open and just updates content. The honest "Refined by Gemini" credit lives inside the panel
  (unchanged `applyPhrasedInsights`, still keyed to `#menuInsightsPanel`).
- **CSS** (`css/style.css`, new v69 section): `.msug` fixed bottom-left, clears the bottom nav on mobile
  (`bottom:calc(72px + safe-area)`) and the 232px sidebar on desktop (`left:calc(232px + sp-5)`); 54px button
  (touch-safe), faint Gemini-purple edge; `.msug-panel` `width:min(320px, 100vw − 2·sp-4)` so it fits at 380px,
  `max-height:min(62vh,460px)` scroll, expands from the bottom-left corner (`@keyframes msugPop`, disabled
  under `prefers-reduced-motion`). `.msug-panel .menu-insights` is flush (panel supplies the chrome).
- **a11y:** button `aria-label="Menu suggestions"`, `aria-haspopup="dialog"`, `aria-controls`, `aria-expanded`;
  panel `role="dialog"`; `:focus-visible` rings; SVG `aria-hidden`.

## 2 — Suggestions go beyond "raise the price" (three new levers)
Three new **pure, tested** insight functions in the existing `{kind,facts,text,score}` pattern
(`js/app.js`), each a real deterministic figure so the Gemini layer can only rephrase:
- **`insPortion`** — a dish leaning on ONE costly ingredient (share ≥ 45%): "Fish is 60% of Barra & Chips'
  cost — a 15% smaller portion saves about $0.40 a plate, no price change." `computeInsights` finds the
  costliest line per dish and passes `top={name,share,trimPct:15,saving}`.
- **`insSub`** — a **cheaper same-category** product actually in Products (reuses the existing `alternatives(p)`
  helper): "You buy Cheese at $12.20/kg; Cheese Block Alfa is $9.80/kg — swapping saves about $3.20 across 8
  plates." `computeInsights` sums qty per product menu-wide, takes the cheapest in-category alt, computes the
  saving. **Only emits when a real cheaper in-category product exists** (per the brief).
- **`insCut`** — a dish ≥ `CUT_PTS` (12) over target: "Steak Works runs 12 pts over and is hard to reprice
  cleanly — worth reworking the spec or dropping it."
- **Reprice demoted to LAST-RESORT:** `insReprice` now only covers `[1, CUT_PTS)` pts (extreme dishes hand off
  to `insCut`), its score dropped (`min(60, 22+pts·2)`, was `min(100, 45+pts·3)`) so the cheaper levers outrank
  it, and its copy softened to frame price as the fallback ("if a rework can't close it, $X would bring it to
  Y%"). `deriveInsights` concats the new types first. `selectInsights` already enforces ≤1 per kind + rotation,
  so "never three reprice lines" holds. `computeInsights` bundles `subs`; the new fns are exposed in
  `tests/_extract.js` (with `CUT_PTS` mirrored, like `GEM_BAND`).

## 3 — "Reprice" → "Rework"
- Menu margin-light chip label **Reprice → Rework** (`index.html`; smoke keys off `data-light`, not the text,
  so no test broke). Menu strapline "…what needs repricing" → "…what needs a rework".
- The reprice insight copy softened (see §2). **Pinned `insReprice` test strings** deliberately kept passing:
  the softened text still contains "N pts over" and the target "$X.XX", the two substrings the test matched, so
  the existing assertions hold without churn (the change is documented here per hard-rule bookkeeping).

## 4 — Builder misc line: editable NAME field restored (reverses v60)
`miscRowHtml` (`js/app.js`) puts an editable `<input class="misc-name">` back in the ingredient row's name
slot (`.nm`), wired to the already-present-but-dormant `setMiscLabel`; blank shows **"Misc"** as a placeholder.
The `label` was preserved in the data model throughout v60→v68, so **pre-existing labels reappear** and the
value round-trips through `saveCurrentPlate` unchanged. Kept the v67 two-row `.line` skeleton (matches
ingredient rows): name + × on `.top`, `$` in its right-hand total slot on `.costs`. `addMiscCost` now focuses
the name field. CSS: the old `.misc-line .nm b` rule replaced with `.misc-name` field styling (fills the slot,
`min-height:44px` on phones, no truncation at 380px).

## 5 — Invoice import modal — mobile header stacking (mobile-only, no functional/desktop change)
Worked from the written description (no screenshot arrived — Max chose "proceed"). The two inline-styled header
rows got classes (`.inv-parse-row`, `.inv-smem-row`) with their spacing moved to CSS at the **same desktop
values** (`sp-3` = the old inline 12px), so desktop is byte-identical. A `@media (max-width:700px)` block then
restacks: `.inv-upload` becomes a column (Upload → "or paste text manually" → filename each on their own line),
`.inv-parse-row` becomes a column ("Match products" on its own, "Prices last updated" meta below), and the
sequence (upload → paste → match → meta → Remembered) gets even `sp-4` rhythm. **No id/handler change; the
fragile invoice REVIEW render area was not touched** (this is the import *header* only).

## Tests — 261 → 270 green
- `tests/insights.test.js` +9 (22→31): `insPortion` (dominant / not-dominant / most-lopsided), `insSub`
  (formats per-unit + plate count / empty / biggest-saving), `insCut` (≥12 pts → cut + `insReprice` hands it
  off / <12 pts not a cut), and `deriveInsights` (cheaper levers lead over reprice). Require + `_extract`
  exposures updated.
- jsdom **smoke §16 extended** (deliberate): the Suggestions content now lives behind the FAB — new checks that
  the FAB shows when there are insights, the button carries a gradient logo + accessible label, the panel
  starts closed, tap opens (aria-expanded flips) with the same mi-lines + credit, × closes, and an
  insight-less menu hides the whole FAB. §16's existing title/credit checks still pass (`#menuInsightsPanel`
  still renders inside the panel).
- No parser/merge/light-filter test needed a change.

## Playwright / fresh-states — updated but NOT runnable to green here (unchanged deferral)
`tests/visual/fresh-states.spec.js` is a browser spec (`npm run shots`), NOT in `npm test`, and the v68
handover already flagged **12 pre-existing stale failures** pending a browser + Max's sign-off. I updated the
misc bits my change directly touches — the old `.misc-label` selector → `.misc-name`, dispatch an `input`
event so `setMiscLabel` fires, and rewrote the misc assertions to the current v69 **two-row** reality (name
field + × on `.top`, `$` on `.costs`; name width > 120px, no truncation). **I could not verify these in-env:**
the test dies earlier at its `#lines` screenshot (line 48) because the builder became a `#builderModal` popup
in v54/v55 and the spec never opens it — a pre-existing structural staleness, not my change. Full fresh-states
reconciliation (open the builder modal first, re-baseline the 12) remains the standing deferred task.

## Needs Max's phone (nothing here is "feel"-verified — no phone in the container)
1. **The rainbow FAB + panel on the Menu tab, 380px + desktop, both themes:** the gradient logo button sits
   bottom-left clear of the bottom nav (mobile) / the sidebar (desktop); tap expands the panel from the corner
   (no clipping at 380px, panel scrolls if long); ×/outside-tap/Escape close it; switching menus updates the
   content; it hides entirely on a menu with nothing to say. Confirm it doesn't cover the last table row or
   any other bottom-left chrome.
2. **Varied non-reprice advice:** on a real menu, confirm the suggestions lead with portion/substitution/cut
   advice and only fall back to a (softened) reprice line — never three reprice lines. Sanity-check the
   substitution figures against a known cheaper product.
3. **Misc line name field** readable + editable at 380px (New and Edit), placeholder "Misc" when blank, old
   labels showing again; both themes.
4. **Invoice import header at 380px** against the described problems: Upload/paste no longer fight for a row,
   "Match products" and "Prices last updated" stack cleanly, even rhythm down the header; **desktop unchanged**;
   invoice review area unchanged.

## NOT built (deliberately)
- No DB/schema change (branch-safe).
- Invoice REVIEW render area untouched (fragile guardrail) — only the import header spacing changed.
- No new suggestion beyond the four levers named in the brief; `selectInsights`/rotation reused as-is.
- fresh-states full reconciliation not attempted (deferred, sign-off-gated — see above).

## Still outstanding
- ~~The three v55 Supabase migrations~~ — **applied to prod (Max, confirmed 22 Jul 2026)**; the v54+ line is live.
- `fresh-states.spec.js` baseline reconciliation (now also: the v69 misc name field + the moved Suggestions
  FAB) once Max signs off the look on a browser env.
- The diagnostic `GET /api/parse-invoice?probe=1` (gated off) — gate or remove before multi-tenant.
