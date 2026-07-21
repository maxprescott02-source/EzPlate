# HANDOVER v63/v64 — Gemini reader v2 (status fix · match suggestions · first Dashboard insight)

> **v64 hotfix (same branch, after Max tested v63 on the preview):** two integration bugs found
> because both features looked dead on a real preview even though the health check passed:
> 1. **Uploaded PDF invoices never fired the second reader.** `handleInvFile`'s PDF branch calls
>    `buildInvRows(rows)` DIRECTLY (not via `parseInvoice`), so `gemStatus` was never set and
>    `gemFireSecondReader` never ran — no status note, no AI, for the way Max actually imports
>    (uploading, not pasting CSV). Fixed: the PDF branch now stamps `gemStatus='checking'`/
>    `gemCheckStart` and fires `gemFireSecondReader(text)`, mirroring `parseInvoice`.
> 2. **The Dashboard "Suggestions" card silently found nothing.** `computeInsights` used the LEGACY
>    `sp.menuId` reverse-map, but v55 moved the canonical menu↔plate link to `menu_items.plate_id`
>    (`plate.menu_id` is left unset since v55). Fixed: it now resolves via `plateForMenuItem(m)` —
>    the exact pattern `dashComparisons`/the trend + highlight cards already use.
>
> Lesson worth keeping: **a passing `?health=1` only proves the serverless FUNCTION + key are live.
> It says nothing about the client bundle or its wiring.** Both these features are client-side; the
> health check was a red herring. Six spots bumped v63 → **v64**. 239 tests still green.


Brief: `~/Downloads/ezplate-opus-gemini-reader-v2.md`. **Same branch as v62**
(`feat/gemini-dual-reader`, PR #11) — Max asked to stack this on the unmerged v62 work, not
branch fresh. Baseline **215 green** before; **239 green** after (215 + 8 match + 8 insights
+ 8 api-insight). `node -c` clean on `js/app.js` and all three `api/*.js`; jsdom smoke green
incl. the new §16. Six spots at **v63**.

**Same invariants as v62:** deterministic parser is the backbone, the protected region
(`var INV_EXCLUDE=` … `function unitLabelFor(`) is untouched, money stays deterministic,
nothing saves without a tick on a flagged row, taught/supplier-memory outranks everything,
the Gemini key is server-only, and every path degrades to today's app when the AI/network is
absent. **No AI ever changes a matched product (`bestId`) or any money figure.**

---

## 1 — Status indicator ("AI double-checking…") — cause + flicker guard
**The note was never broken.** The render path was correct all along: `parseInvoice` sets
`gemStatus='checking'` before `buildInvRows`, and `gemStatusHtml()` is appended to `.inv-sum`.
The reason Max saw "no sign" is that **PR #11 isn't merged** — production and his installed PWA
have **no `/api/parse-invoice` endpoint**, so the POST 404s → the client silently degrades to
"unavailable" (exactly the offline contract). It only works on the **preview** deployment.

The one genuine UX gap was flicker: a fast or failed response could flip the note past the point
you could read it. Fixed with a minimum-visible floor:
- `gemCheckStart` timestamps the moment "checking" is shown (`parseInvoice`).
- `GEM_MIN_VISIBLE = 900` ms; `gemSettle(token, fn)` runs the terminal flip
  (checked/unavailable + render) immediately if 900 ms have passed, else defers the remainder.
  It re-checks `token===gemToken && !gemApplied` **inside** the delay so a fresh parse or an
  applied import still wins — a stale settle can never clobber a newer state.
- No CSS change; the three states + the `.ai-ok` fade are unchanged.

## 2 — Suspected WRONG MATCH ("check match")
v1 could referee price/pack but not *which product* a line matched — the maple-syrup case showed
a mis-match as a "price change". Now the merge layer can flag it. Gemini's line already carries
`description`/`supplier`, so **no schema change** was needed.

- **`gemMatchSuspect(o)` — PURE, extracted + tested** (`tests/inv-gemini-match.test.js`). All
  inputs are primitives (the caller passes `rankCandidates(description)` and canonical readings),
  so it needs no DOM/PRODUCTS. Fires when Gemini's text points at a DIFFERENT catalog product than
  the parser's `bestId`, via EITHER:
  - **strong token evidence** — the AI's top candidate clears 0.5 coverage AND beats the local
    match's confidence by ≥0.15; OR
  - **price corroboration** — the line's derived price sits in the AI-suggested product's history
    band (`GEM_BAND`, ±50%) while the LOCAL match's makes it look like a wild jump (this is the
    maple-syrup signature: the mis-match, not a real rise, explains the gap).
  - Guard against ambiguity: if the local match is a near-tie in the AI's own ranking
    (`top.coverage − localInAi < 0.15`) it's treated as ambiguity, not a wrong match → defer to
    the price merge. `bestId` absent from the AI list → it truly points elsewhere.
- **Wiring (`gemApplyReadings`, before the price merge):** only for an already-matched, non-taught
  row. On a hit → `r.gemMatchReview=true`, `r.gemSuggestId`, the AI product is unshifted to the
  front of `r.cands` marked `ai:true`, and the price merge is **skipped** (no rule-4 price flag on
  the same row). `bestId` is NOT changed.
- **UI (all reuse):** `invRowState` gains a `gemMatchReview → 'review'` clause (→ `st-review`
  tint, unticked). The flag chain gains a **"check match"** branch (`.flag-review`, ranked above
  "price change"). The AI candidate renders as the FIRST MATCH-TO chip with a compact **"AI"**
  marker (`.cc-ai`, sharing the exact `.ni-af`/`.ai-sug` chip metrics — inline-flow, can't
  overlap). Tapping it runs the existing `invSelChanged` path; that clears `gemMatchReview`
  (the human has ruled). Taught / supplier-memory / manual-pick rows are never flagged.

## 3 — First Dashboard insight (grounded, restrained — NOT a chatbot)
**Hard law honoured: the app computes every number; the AI only phrases it.**

- **3a — deterministic engine, ships with NO API.** `deriveInsights(dishes, targetFrac)` — PURE,
  extracted + tested (`tests/insights.test.js`). From costed+priced dishes it derives up to 3
  observations, each carrying `facts` (every number) + ready template `text`:
  1. worst over-target dish — `pts = round((cost/menuPrice − target)·100)` (only if ≥1 pt over) +
     the **target price** (`cost/target`, rounded UP to the nearest $0.50);
  2. the second-worst over-target dish;
  3. a count line ("3 of 12 costed dishes sit over your 30% target"), OR a single positive line
     when nothing is over.
  No costed+priced dishes → returns `[]` and **the card hides** (decided: no empty state).
  `computeInsights()` wraps it from `savedPlates`+`MENU` via `costFromLines`/`foodTarget`.
- **3b — optional Gemini phrasing (degrades to templates).** `api/insight.js` + pure
  `api/_insight.js` (mirrors the `_gemini.js` split; `_`-prefixed = not a route). The model is
  GIVEN the numbers and told to only rephrase; `validatePhrasing` rejects any line containing a
  number that isn't in that insight's facts (the enforcement of "never produce a figure") →
  the deterministic template is kept per line. Health check `GET /api/insight?health=1`.
- **Client:** `renderDashboard` appends a muted **"Suggestions"** panel (`.dash-insights`,
  existing tokens, theme-aware, **no input box / no chat**) below the highlights, rendering the
  templates immediately. `gemPhraseInsights` fires **at most one** call per dashboard load, only
  when there's something to phrase, **session-cached** (`gemInsightPhrased`); on success it swaps
  the wording in place (numbers already fixed, re-validated client-side via `gemPhrasingOk`).
  Offline/unavailable/invalid → templates stand. Never blocks the dashboard.
- **Dropped from the brief (data reality):** the "biggest ingredient price mover" example — there
  is **no per-ingredient price history** in the app (`priceHistory` is the aggregate food-cost-%
  trend only). The two plate-vs-target derivations above ship instead. If Max wants the mover
  insight, it needs a new per-product price log first (a separate piece of work).

## The plausibility band + thresholds (tune in one place each)
`GEM_BAND=0.5` (unchanged, shared by rules 3 and the item-2 price corroboration).
`GEM_MIN_VISIBLE=900` (status floor). Match thresholds live inline in `gemMatchSuspect`
(0.5 token / +0.15 over local / 0.15 ambiguity margin / 0.4 price-backed).

## Tests
- `npm test` **239 green** (215 → 239):
  - `tests/inv-gemini-match.test.js` (8) — the maple case → suspect + AI product first; a real
    rise on the correct match → NOT suspect; weak tokens + price corroboration → suspect; weak
    tokens without corroboration → not suspect; agreement (AI top = local) → not suspect; purity.
  - `tests/insights.test.js` (8) — worst-over-target selection + target price ($0.50 round-up),
    all-healthy positive line, multi-over cap at 3, sub-1-pt not flagged, empty → `[]`, purity.
  - `tests/api-insight.test.js` (8) — `_insight.js`: a number-preserving rephrase passes; a
    changed/invented number is rejected; per-line template fallback; malformed JSON → unavailable;
    prompt fences the lines + forbids changing numbers.
  - `tests/_extract.js` now also exposes `gemMatchSuspect` + `deriveInsights`.
- jsdom smoke `tests/smoke.js` §16 (`npm install jsdom --no-save && node tests/smoke.js`):
  the flicker guard (fast result doesn't flip the note until the min-visible window passes);
  a check-match row renders `st-review` + unticked + "check match" pill + the AI product as the
  first chip with the marker; the Dashboard "Suggestions" card renders templates (no input box)
  and a valid rephrasing swaps in place. (Existing §15 canned Gemini `description`s were made
  realistic — the full line name, as Gemini actually returns — so item-2 doesn't misfire on a
  generic one-word stub.)

## Needs Max's phone / preview (nothing here is "feel"-verified — no browser in the container)
Test on the **preview** URL (PR #11 is unmerged; production still has no `/api`):
1. **Health checks:** `…/api/parse-invoice?health=1` AND `…/api/insight?health=1` → both
   `{ok:true, model:"gemini-3.1-flash-lite", keyPresent:true}`. If `keyPresent:false`, the env
   var isn't on the Preview scope.
2. **Invoice, wifi ON:** the summary shows "AI double-checking…" → "✓ AI checked" (the note no
   longer flickers past unread). Import a line the local matcher gets WRONG (maple-syrup style) —
   it should read **"check match"**, unticked, with the right product as the first candidate chip
   carrying the "AI" marker (NOT "price change"). A correct match with a real price rise still
   reads "price change".
3. **Invoice, wifi OFF:** identical to today — no lingering note, every row as the parser made it.
4. **Dashboard, API ON then OFF:** the "Suggestions" card shows 1–3 grounded lines; with the API
   reachable the wording is warmer but **every number is identical**; offline, the templates
   render unchanged. No input box, no chat.
5. **Visuals at 380px, BOTH themes:** the "AI" candidate chip next to the "check match" pill (no
   crowding/overlap); the Dashboard "Suggestions" card. If anything sits tight, STOP and show Max
   options rather than ship it. (`npm run shots` needs a browser env — not run here; layout shots
   need a re-baseline covering the check-match chip + the insights card.)

## NOT built (deliberately)
- No ingredient-price-mover insight (no per-ingredient history exists — see §3).
- No chat / free-text Q&A / multi-turn. Insights only.
- No DB/schema change → branch-safe, still unrelated to the pending v55 migrations.
- No `vercel.json` — zero-config `/api` needs none.

## Still outstanding (unchanged)
- The **three v55 Supabase migrations** must be applied to prod before v54–v63 go live.
- `npm run shots` + `fresh-states.spec.js` reconciliation on a browser env — now also the
  check-match chip and the Dashboard insights card.
