# HANDOVER v67 — Builder polish · invoice header de-intimidate · Suggestions → Menu tab + broadened

Brief: `~/Downloads/ezplate-opus-builder-invoice-suggestions.md`. Branch `fix/builder-invoice-suggestions`
off **v66** (origin/main was already at v66 — PR #11 merged; the CLAUDE.md "State as of" text still said
v61 but the code was v66). All work is **client + CSS + one server prompt tweak — no DB/schema change,
branch-safe.** Baseline **242 green** → **256 green** after; `node -c` clean on `js/app.js` + all four
`api/*.js`; jsdom smoke green (§16 rewritten). **Six spots v66 → v67.**

Invariants held: protected parser region untouched; money stays deterministic (the app computes every
number, the AI only phrases); the naming inversion left alone; no new deps/build step; the live
`renderAnalysis` (2nd def) is the one edited.

---

## 1 — Plate builder: category moved to the BOTTOM of the plate flow
`plateCat` (label + `.cat-wrap`, ids/handlers unchanged) moved out of `#platePanel` (top) to a new
`.plate-cat-field` at the **bottom of `#docketPanel`, just above the Save/Print/Clear actions**. The flow
now reads name → add ingredient → docket → total → **category** → Save, matching the app's "name up top,
category down low" card rhythm. The combo is bound by id in `openBuilder` via `makeInlineCombo` (which
uses `anchorDrop`, position:fixed), so relocating the node changes nothing functionally — the
existing-category suggest still fires. The plate-NAME fuzzy-match (`plateSuggest`) stayed put with the name.

## 2 — Builder top section breathes
`#platePanel .pad` bumped `--sp-5` → `--sp-6` vertically; `.modal-builder label.f` margin-bottom 6px →
`--sp-2` (8px) for an even label→field gap across the builder. `.plate-cat-field` carries `--sp-5`
horizontal padding (matching `.total`/`.actions`) with an even gap above/below. No token invented — the
standard `--sp` scale only. **Needs Max's phone at 380px + desktop.**

## 3 — Misc line is now a SIBLING of the ingredient line
Was a bespoke single flat row (`Misc · leader · $ · ×`); the `$` sat one slot left of the ingredient
total column and the row was a different height. `miscRowHtml` now reuses the **exact two-row `.line`
skeleton**: `.top` = a fixed **"Misc cost"** label (muted) + `×` in the same top-right column as every
ingredient row; `.costs` = a dotted leader + the `$` input in the **same far-right slot the ingredient
total (`.lc`) occupies** (the leader grows to push it there). It therefore inherits row height, the ×
column and the total column from the ingredient rules — they line up pixel-wise for free. No name field
(the v60 rule stands — "Misc cost" is a static label). Same ids/handlers (`setMiscCost`/`removeLine`; the
`lc-`+uid lookup remains a guarded no-op). **CSS cleanup:** removed the whole accumulated single-row
override pile (the v36/v53/v56/v60 `.misc-label`/`.misc-fixed`/single-row-`.line.misc-line` rules across
~6 locations) and replaced it with one small `.line.misc-line .costs .misc-costbox` block (order:0 to beat
`.qtybox{order:-1}`, `$` hugs the field, 92px right-aligned input, 44px phone hit target).

## 4 — Invoice reader header de-intimidated (nothing deleted — collapsed / quieted)
**Collapsed** (present, one tap away — NOT removed):
- The big raw-text paste box (`#invCsv`) **and its CSV hint** now live in `#invManualBox`, hidden behind a
  quiet "**or paste text manually**" link (`#invManualToggle`, `linklike`). `openInv` re-collapses it on
  every open, so a first-time user always sees the clean upload → match → review flow, never a wall of
  monospace. Uploading still fills the (hidden) textarea and renders the review directly; expanding focuses
  the textarea for the power path. New JS: `setInvManual`/`toggleInvManual`.

**Quieted** (kept, de-emphasised):
- The GST-default notice (`.inv-gst`) restyled from the loud warn-box (border + `--warn-bg`) to a small
  muted line (`--fs-xs`, `--muted2`, no border/background). Still always present, just no longer shouting.

**Kept prominent, unchanged:** the Upload button, the Match products CTA, and the matched/new/review +
"AI checked" summary. The filename / "N lines read, review below" line was already small + muted — left as is.

**Deleted: nothing.** Only the paste box moved behind a toggle and the GST note lost its box.

## 5 — AI Suggestions: relocated to the Menu tab AND broadened
**5a — placement.** The grounded "Suggestions" panel was **removed from `renderDashboard`** and now renders
on the **Menu tab, below the dish table** (`#menuInsights` host in `#tab-analysis`; `renderMenuInsights`
called at the end of the live `renderAnalysis`). It's **scoped to the currently selected menu**
(`computeInsights` filters `MENU` by `currentMenuId`, mirroring `renderAnalysis`'s `inMenu`) and re-renders
on every menu switch. Reuses the `.dash-insights` tokens (`.menu-insights` — a normal card, not an
oversized slab) with a "· <menu name>" sub-label. Phrasing cache is now keyed **per menu** (`menuId|sig`).

**5b — broadened engine (the insights were flat because every line was the same shape).** Rebuilt as **one
pure, tested function per insight TYPE** (each returns `{kind, facts, text, score}`) plus a pure
`selectInsights`:
- `insReprice` — over-target dish → target price (the v63 insight, now ONE type among several).
- `insNearMiss` — a dish only ~1 pt over: a low-effort win.
- `insVolatility` — the dish whose cost swings most, naming the volatile ingredient. **Now feasible:** the
  v66 per-ingredient price log (`ingPriceLog`/`ingPriceBand`/`costRangeForLines`) gives real cost ranges —
  v63 had to drop this for lack of data.
- `insShared` — an ingredient across many of this menu's dishes (supplier-switch leverage).
- `insMover` — the biggest logged price move + how many of this menu's dishes it feeds. **Also newly
  feasible** off `ingPriceLog` (v63's "biggest mover" was dropped as impossible).
- `insBest` — a positive: a dish comfortably under target (not everything is a warning).
- `insSummary` — the over/under count (always-available filler so the panel never renders empty when there
  IS data).

**Selection / rotation (`selectInsights`):** rank by a notability `score`, keep **type variety** (≤1 per
kind in the diverse pass), and **rotate the near-top (similarly-notable) group by a seed** so the list
stops always leading with the same over-target dish. A far-below candidate can never rotate above the top
group (12-pt band guard). The seed is `insightSeed` — day-based base (rotates over time) + bumped once per
`onMenuSelectChange` (rotates on menu switch), **stable across incidental re-renders** (search/edit) so it
doesn't reshuffle on every keystroke. Surfaces the most relevant **2–3**.

**Money law intact:** every number is computed in `computeInsights`/the type fns; the optional Gemini
phrasing (`/api/insight`, one call per menu per session, session-cached) only rewrites the sentence and is
rejected line-by-line if it contains a number not in that insight's facts (`gemPhrasingOk` client-side +
`validatePhrasing` server-side). Offline / unavailable / invalid → the deterministic templates stand.
**Server:** `api/_insight.js` is type-agnostic (validates numbers vs facts) — **no contract change**; only
the prompt **tone** was tuned to "a sharp hospitality consultant, vary sentence shapes, never open every
line with 'X is N pts over'" (the required "untrusted DATA" + "MUST NOT … any number" phrases kept verbatim,
still pinned by `api-insight.test.js`).

## Tests — 242 → 256 green
- `tests/insights.test.js` **rewritten** (8 → 22) for the new per-type + selector contract (a **deliberate
  pinned-contract change**, called out in the file header): `insTargetPrice`, `insReprice`, `insNearMiss`,
  `insVolatility`, `insShared`, `insMover`, `insBest`, `insSummary`, `selectInsights` (variety + seed
  rotation + band guard), and `deriveInsights` orchestration (bundle input, bare-array accepted, type mix,
  never-empty-with-data, purity).
- `tests/_extract.js` now exposes all nine new insight functions.
- `tests/api-insight.test.js` (8) unchanged and green after the tone tweak.
- jsdom smoke `tests/smoke.js` §16 rewritten: the Suggestions card now renders via `renderMenuInsights`
  into `#menuInsightsPanel` on the Menu tab; templates immediate, one `/api/insight` POST, a valid
  rephrasing swaps in place. (`npm install jsdom --no-save && node tests/smoke.js`.)

## Needs Max's phone (nothing here is "feel"-verified — no browser in the container)
1. **Builder at 380px + desktop:** the top section (heading → name) breathes; the category field sits at
   the bottom just above Save and its existing-category suggest still drops.
2. **Misc line at 380px:** add a misc cost — it should read as a sibling of the ingredient rows (same
   height, the `$` input lined up under the ingredient totals, `×` in the same column). Both themes.
3. **Invoice header as a NEW user sees it:** paste box collapsed behind "or paste text manually"; upload →
   match → review with no monospace wall; the GST note is a quiet muted line; expanding the toggle reveals
   + focuses the textarea. Both themes.
4. **Suggestions on the Menu tab, switching between two menus:** the card sits below the dish table, shows a
   varied 2–3 (not all "raise price"), reflects the selected menu, and the lead rotates on menu switch.
   With the API reachable the wording is warmer but **every number identical**; offline → templates. Both themes.

## NOT built (deliberately)
- No DB/schema change (branch-safe; still unrelated to the pending v55 migrations).
- No chat / free-text Q&A — grounded insights only, as before.
- Misc line kept NO name field (v60 rule) — "Misc cost" is a static label, per the two-row-sibling brief.

## Still outstanding (unchanged from v66)
- The three v55 Supabase migrations still need applying to prod before the v54+ line goes live.
- `npm run shots` + `fresh-states.spec.js` reconciliation on a browser env — now also: the relocated
  builder category, the two-row misc line, the collapsed invoice header, and the Menu-tab Suggestions card.
- The diagnostic `GET /api/parse-invoice?probe=1` (gated off by default) — gate or remove before multi-tenant.
