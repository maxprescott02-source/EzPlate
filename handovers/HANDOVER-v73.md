# HANDOVER v73 — Gemini clean-prefill for the invoice new-item form

**Completed:** 23 Jul 2026 · branch `feature/gemini-newitem-prefill` · brief `~/Downloads/ezplate-opus-gemini-newitem-prefill.md`.

Branch off **v72** (`origin/main` = `49636f7`, PR #17 merged). Baseline **272 node tests green**, jsdom smoke green,
six spots v72, `node -c` clean. Ended **286 node green** (+14, one new file `tests/gemini-newitem.test.js`), jsdom
smoke green (new **[19] v73** section), `node -c` clean on `js/app.js`, `sw.js`, and all four `api/*.js`, six spots → **v73**.

Extends the **existing** Gemini dual-reader — same serverless function, same server-only key, same one-call-per-import,
same offline→degrade discipline. **FRAGILE AREA** (invoice review) — read `tests/inv-rowmarkup.test.js` first; the row
build / `invRowState` / auto-tick / the v72 `.ni-slot` nesting were **not** touched. **Descriptive fields only** — no
contact with the protected parser region, the money law (price/pack/unit stay deterministic + referee), the naming
inversion, or the plate/dish/menu data model. No new deps, no build step.

---

## The problem (confirmed in code)
The "Add new item" form (`expandNewItem`) was filled by the **deterministic parser only** — Gemini refereed
price/pack/match but never the descriptive fields. So Name became the raw `CTN 140201 #MUFFINS ENGLISH TIP TOP…`
string, Supplier could be a mis-grabbed `Document No:`, and Brand/Category were blank. This wires the reader the app
already runs per import into the form's Name/Brand/Category/Supplier.

## Server — widen the existing response (no 2nd call, no new endpoint)
`api/_gemini.js`:
- **`validateLine`** gains three bounded descriptive strings per line: `cleanName` (≤120), `brand` (≤60),
  `category` (≤60), via a new `boundedStr(v,max)` that **drops** (nulls) an over-cap value rather than truncating a
  mangled name into the catalog. Supplier already existed (per-line + header). A bad/absent field is null, never fatal
  — the form just falls back to today's deterministic value for it.
- **`buildPrompt(text, opts)`** now takes the client's existing category list (`opts.categories`, trimmed + capped at
  200) and, when present, appends an `EXISTING categories … PREFER one of these` block so the model reuses a category
  rather than proliferating near-duplicates. The three descriptive keys are declared in the JSON shape; `cleanName` is
  told to read like a product a café owner would type, SKU stripped. Injection fencing unchanged (the category list is
  untrusted like everything else — just a hint).
- **`responseSchema()`** declares `cleanName`/`brand`/`category` as nullable strings.

`api/parse-invoice.js`: `callGemini(text, categories)` reads `body.categories` (array or `[]`) and passes it into
`buildPrompt`. Everything else (timeout, 200-always, strict validation) unchanged.

## Client — per-field prefill + the late-response upgrade
`js/app.js`:
- **`gemFireSecondReader`** now POSTs `{text, categories: prodCategories()}`.
- **`gemCleanFields(g, headerSupplier)`** (new, PURE, sliced into `_extract.js` + unit-tested): distils a validated
  Gemini line into `{name, brand, category, supplier}`. **`name` comes from `cleanName` ONLY** — never `description`,
  which can be the messy raw string (so an absent `cleanName` leaves the deterministic name with its plain auto-filled
  mark, not a fake "AI suggested"). Supplier prefers the per-line value, else the invoice header (this is what corrects
  a parser mis-grab).
- **`gemApplyReadings`** stashes `r.aiClean = gemCleanFields(...)` on every key-matched row **and** appended AI-new
  rows (rule 5). The matched loop's early return changed from `if(gemRowLocked(r) || r.addNew) return;` to
  `if(gemRowLocked(r)) return;` then `if(r.addNew) return;` **after** setting `aiClean` + `usedG` — so an already-open
  add-new form (opened before the reader returned) still receives the clean values. Locked rows (manual pick / an
  approved new item) are still left entirely — human ruling is final. Price/match referee logic for matched rows is
  byte-unchanged.
- **`expandNewItem`** prefill is now **per field**: a new `niFld(field, detVal, detFilled)` returns the AI value with
  the **"AI suggested"** mark when `r.aiClean` has one AND the user hasn't edited that field; otherwise today's
  deterministic value/blank with its normal treatment (Name→parsed, Brand/Cat→blank, Supplier→invoice header). The
  three combos commit their prefilled value into `niCombos` via a new **`niSetCombo(id,val,listFn)`** — **auto-confirmed
  (Max's call, 23 Jul)** so Confirm All accepts an AI-suggested new brand/category without an extra step; `isNew` still
  reflects whether it's genuinely new, so an AI value matching an existing entry resolves to that canonical one
  (category proliferation is held down server-side by the PREFER-existing prompt).
- **Late-response upgrade** (the careful bit): edit-tracking is broadened from v55's af-only marking to **every field**
  (type OR combo-pick — a `.cat-opt` mousedown is caught too, since a pick fires no input event), and **`niRehydrate`**
  now leaves an AI-filled, un-edited field as its build-time AI prefill instead of restoring the pre-upgrade snapshot
  over it (`aiHeld(field)` gate via the new `AI_FIELD` map). Because `r.aiClean` only exists AFTER the reader returns,
  **pre-response behaviour is byte-identical to v72** — offline / slow / invalid ⇒ deterministic prefill exactly as
  before. Once the AI lands, untouched fields upgrade; a field the user has touched is never overwritten.

## The mark treatment
Reuses the existing one-chip / two-label system (`niLab(t,src)` + the `.af` class → `.ni-f:has(.af) .ni-af`): an
AI-interpreted field reads **"AI suggested"**, a parser-copied field **"auto-filled"**, a blank field shows no chip.
Editing a field drops its chip and (now) marks it edited so the chip never returns and the late upgrade skips it.
**No CSS changes** — the chip element and its visibility rule already existed (v37/v55/v62).

## Tests / verification
- New **`tests/gemini-newitem.test.js`** (14): server `validateLine` keeps/bounds/coerces the descriptive fields
  (over-cap → null, whitespace trimmed, absent → null); `validatePayload` passthrough; `buildPrompt` declares the keys
  + folds in and PREFERs the category list + caps a runaway list; `responseSchema` declares them; pure `gemCleanFields`
  maps cleanName→name, prefers per-line-then-header supplier, nulls blanks, never invents a name from `description`,
  null-safe.
- **jsdom smoke [19]** (new): full clean prefill + AI-suggested marks + corrected supplier; auto-confirmed category;
  clean fall-back when a field is absent; **offline (no `aiClean`) → byte-for-byte today's deterministic prefill**;
  **late-response upgrade preserves a user-edited Name while upgrading an untouched Brand.** Existing [10]/[11]
  (form-exists, v50 persistence, v72 nesting) still pass unchanged.
- `npm test` **286 green** (272→286). `node -c` clean on app.js, sw.js, all four api files. Six spots → **v73**.
- `settings.test.js` version pin passes (APP_VERSION agrees with sw.js CACHE).

## Privacy note (unchanged gate, one new field-set)
Same call, same free tier — invoice text already goes to Gemini (Max's café-only acceptance stands). This batch also
sends the **generic product-category list** (e.g. "Bakery", "Dairy") so the model reuses one; low-sensitivity, no new
personal data. The CLAUDE.md multi-tenant privacy gate is unchanged and still the thing to reopen before EzPlate serves
anyone but Scoopy's.

## Needs Max's phone (no browser here — behaviour is jsdom-verified, feel/layout is not)
Test at **380px, both themes**, on a preview with the API live:
- A **real invoice with a new-item line** — open "Add new item": Name reads a clean human name (compare to the raw
  code string), Brand/Category/Supplier inferred, each with the **"AI suggested"** mark; Confirm All accepts an
  AI-suggested new category without an extra confirm step.
- **Same invoice, wifi OFF** — the form is the deterministic prefill exactly as v72 (no marks, blank brand/cat).
- **Late-response**: open the form the instant the review appears (before "✓ AI checked"), edit one field, let the AI
  land — the edited field is preserved, an untouched field upgrades to the AI value. Also confirm the combo dropdowns
  aren't clipped and the form still nests in the one red card (v72).

## NOT built / deliberately left
- **No price/pack/unit from Gemini here** — descriptive only; money stays deterministic + refereed (money law).
- **No new endpoint / no per-line call** — folded into the existing one-call-per-invoice response.
- **No CSS change** — reused the existing chip system and the v72 nested form layout.
- **Category snapping left to the client combo** — the server PREFERs an existing category via the prompt; when the
  returned value matches an existing one case-insensitively, `niSetCombo`/`resolveCombo` resolve it to the canonical
  entry. No server-side list-snap (would couple validation to the user's data).
