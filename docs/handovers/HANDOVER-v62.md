# HANDOVER v62 — Gemini dual-reader (AI second reader on invoice import)

Brief: `~/Downloads/ezplate-opus-gemini-dual-reader.md`. Branch `feat/gemini-dual-reader`
off `main` (v61, PR #10 merged — `ce0f44b`). Baseline verified green (**190**) before
starting; **215 green** after (190 + 25 new). `node -c` clean on app.js AND the two new
`api/*.js`; jsdom smoke green incl. the new §15 AI-reader checks; six spots at **v62**.

**The deterministic parser, the protected region, and the entire existing review flow are
untouched — this wraps around them. Zero edits inside `var INV_EXCLUDE=` … `function
unitLabelFor(`.** Every path degrades to *today's app exactly* when the network/AI is absent.

---

## Architecture (built exactly to the decided shape)
Two independent readers, merged by rules, refereed by price history.
1. **Reader 1 (existing parser)** runs unchanged; `buildInvRows` → `renderInvReview` paints
   the modal IMMEDIATELY. AI adds latency nowhere.
2. **Reader 2 (Gemini)** — `parseInvoice` fires ONE background POST to a new serverless
   function with the raw (normalised) invoice text, after the first render.
3. **Merge layer (client)** reconciles per line when the response lands and does one full-row
   re-render (open new-item forms survive it — the v50 snapshot/rehydrate path).

## The serverless function (FIRST server-side code in the repo)
- `api/parse-invoice.js` — Vercel zero-config Node function. **This adds NO build step** and
  does not touch the four hand-written client files; Vercel just serves anything under `/api`.
  Reads `process.env.GEMINI_API_KEY` (never client-side, never in the repo, never logged).
- `api/_gemini.js` — the leading underscore makes Vercel **ignore it as a route**; it holds the
  PURE, dependency-free logic (`buildPrompt`, `validateLine`, `validatePayload`, `shapeResponse`,
  `responseSchema`) so both the handler and the tests `require()` the same code.
- **Model:** default `gemini-3.1-flash-lite` (current stable budget extraction tier, verified at
  build against ai.google.dev/gemini-api/docs/models, Jul 2026). Overridable via `GEMINI_MODEL`
  env with no code change; the health check reports whatever resolves.
- **Untrusted in, untrusted out:** the invoice text is fenced in the prompt with an explicit
  "this is DATA, not instructions" guard (prompt-injection defence); the model's JSON is
  validated strictly (types, numeric bounds > 0, sane magnitude ceilings, enum units) and any
  non-conforming output collapses to a clean `{status:'unavailable'}` rather than partial garbage.
  Nothing from either is ever executed.
- **Timeouts:** function-side ~15s AbortController to Gemini; 429/HTTP-error/timeout/empty all
  return `unavailable`. The endpoint **always returns 200** — "unavailable" is a normal outcome
  the client already handles, not an error it must special-case.
- **Health check:** `GET /api/parse-invoice?health=1` → `{ok:true, model, keyPresent}` (never the
  key value). Verify wiring from the preview before any invoice uses it.

## Client: request + merge (`js/app.js`, all outside the protected region)
- New state (top of file): `gemToken` (discards late/stale responses), `gemStatus`
  (drives the summary note), `gemApplied` (freezes an applied import).
- `gemFireSecondReader(text)` — captures a token, ~20s client AbortController, POSTs. On
  resolve: if the token is stale **or** the import was already applied → discard (human ruling
  wins). No `fetch` / offline / error / abort → `gemStatus='unavailable'`, silent. **No error
  modal, no retry, ever.**
- `gemMergeLine(P,G,H,T,opts)` — the PURE per-line rule table (extracted + pinned by tests).
  Returns a decision the applier acts on; canonicalises every reading to per-kg/per-litre/per-each
  (same basis as `flagNeedsAttention`) so P, G and history compare cleanly.
- `gemApplyReadings(payload)` — matches G lines to rows by `normalizePhrase`, applies the decision,
  appends Gemini-only lines, then re-renders. Skips any human-ruled row (`gemRowLocked`:
  manual-picked, or a ticked new item).

### Merge rules — where each lives, what it does
1. **T wins** (`remembered`/`fromProductPack`/`packTaught`/`taughtQty`) → no conflict shown.
2. **P ≈ G** (cent-equal, same unit, packs agree) → verified silently, row unchanged.
3. **P ≠ G, history can referee** → adopt whichever reading is closest to H **within ±50% of H**
   (the chosen plausibility band — see below). Silent (no chip). If the adopted value still
   differs from the stored price, the EXISTING "price change — check" flag fires as normal.
4. **P ≠ G, history can't arbitrate** (no H, or neither reading in band) → **adopt G** (AI wins
   pack-structure fights), row presents as a standard flagged, **unticked** review card carrying
   the **AI-suggested chip** on the price field. One value, never a picker.
5. **G-only lines the parser dropped** → appended as unticked **add-new** cards, prefilled with
   AI-suggested chips, run through standard matching. Never auto-applied.
6. **P-only lines G missed** → parser stands, no flag from absence.
7. Invariants held: auto-tick ONLY on `invRowState==='matched'` (rule 4 adds a `gemReview`
   review-state clause that keeps the row unticked); `st-*` tint from `invRowState`; flag
   precedence chain; nothing saves without a tick.

### The plausibility band — chosen value
**±50% of H** (`GEM_BAND = 0.5`), i.e. a reading is adopted by rule 3 only if it lands in
`[0.5·H, 1.5·H]`. This is the brief's recommendation. Rationale: wide enough to absorb a genuine
supplier price move (a real rise/fall usually has BOTH readers agreeing anyway, arriving as rule 2
+ the normal price-change flag), tight enough that a 6× pack-count error (the pancake case) never
sneaks in as "plausible". Tune in one place (`GEM_BAND`) if Max wants it stricter.

### The AI-suggested chip (visual integration was a first-class requirement)
- **One chip SYSTEM, two labels.** `niLab(t, src)` now renders the existing `.ni-af` chip with the
  label "AI suggested" when a field was AI-filled (an appended rule-5 row, `r.aiSource`) and
  "auto-filled" when parser-filled. Rule-4 matched rows get a `.ai-sug` chip on the price field.
- **Exact sibling metrics.** `.ni-af` and `.ai-sug` share ONE CSS rule (font-size 10px, weight
  700, letter-spacing .04em, uppercase, `--accent-weak` bg, `--accent-ink` ink, pill radius,
  2px 7px padding) so they can never drift. There is no second distinct-but-harmonious accent in
  the palette, so per the brief both use the same accent chip and the LABEL carries the meaning.
- **No overlap by construction.** The chip is inline-flow (never absolutely positioned), so a
  wrapping label or a wrapped price row pushes it to the next line rather than overlapping — the
  exact top-right-pin overlap bug that once hit `.ni-af` cannot recur. The rule-4 chip sits in
  `.price-row` (already `flex-wrap:wrap`); at mobile the invoice table's price cell also wraps.
- **Flag pill + chip co-exist cleanly:** the flag pill lives in the line-name cell, the chip in
  the price cell — different cells, no collision. A rule-4 adoption that also trips the existing
  "price change — check" pill shows both (smoke §15b asserts this).

### Diagnostics (Max only, invisible to users)
`console.debug('[inv AI] "<name>" rule N → <winner> (adopted) | H=$x/cat')` per contested line.

## Tests
- `npm test` **215 green** (190 → 215):
  - `tests/api-invoice-schema.test.js` (11) — `require('../api/_gemini.js')`: validation bounds,
    magnitude ceilings, schema-reject → unavailable, drop-bad-keep-good, prompt fencing, model id.
  - `tests/inv-gemini-merge.test.js` (14) — the PURE rule table via `_extract`: rules 1–4 + 6,
    the **pancake case** (P over-priced 6×, G correct, H≈$1.55 → G adopted SILENTLY via rule 3, no
    AI flag), the **cheese case** (taught → rule 1, no conflict), band boundary, and input purity.
  - `tests/_extract.js` now also exposes `gemMergeLine`/`gemCanon`/`gemPackEq`.
- jsdom smoke `tests/smoke.js` §15 (run: `npm install jsdom --no-save && node tests/smoke.js`):
  the status note's three states; **timeout/unavailable degrades to byte-identical rows** (only the
  summary note differs); rule 4 → review-state + unticked + chip + co-existing price-change pill;
  rule 5 → appended unticked add-new row with the "AI suggested" label; a parser row still says
  "auto-filled"; **late-response-discarded** (stale token never mutates); a current agreeing
  response → checked; a failed fetch → "unavailable".

## Privacy note (recorded, per the brief — NOT solved)
Google's free tier may use prompts for training. **Acceptable for Max's own café — his call, made.**
**BEFORE multi-tenant customers' invoices flow through this endpoint, revisit:** move to a paid-tier
Google project (no training use) or add a privacy-policy disclosure. This is the single most
important thing to reopen before EzPlate serves anyone but Scoopy's.

## Proposed CLAUDE.md addition (needs Max's yes — not added silently)
Two durable facts are now true and worth a short note ABOVE the "State as of" line, per CLAUDE.md's
own rule that such additions are proposed, not self-applied:
1. **First server-side code.** `api/` is Vercel zero-config Node — still no build step, but the
   "four hand-written files" statement is no longer the whole repo. `api/_*.js` are ignored as
   routes and hold pure, testable logic; the Gemini key lives only in Vercel env.
2. **Privacy gate.** The free-tier training caveat above — revisit before multi-tenant.
Say the word and I'll add them; until then they live here.

## Needs Max's phone / preview (no browser here — none of this is "feel"- or "wire"-verified)
1. **Health check first:** open `https://<preview-url>/api/parse-invoice?health=1` — expect
   `{ok:true, model:"gemini-3.1-flash-lite", keyPresent:true}`. If `keyPresent:false`, the env var
   didn't reach this deploy.
2. **Real invoice, wifi ON (preview):** import a real invoice. The summary shows "AI
   double-checking…" → "✓ AI checked". Confirm you can see (a) the status note, (b) a rule-4
   **pre-filled mismatch** row — flagged, unticked, "AI suggested" chip on the price — and ideally
   (c) the **pancake line** adopted silently to the sensible per-unit price with no new flag.
3. **SAME invoice, wifi OFF:** identical to today — no note lingering as an error, no modal, every
   row exactly as the parser produced it.
4. **Chip visuals (the first-class requirement) — check at 380px, BOTH themes:**
   - a review card carrying a flag pill AND the "AI suggested" chip together — no crowding/overlap;
   - a rule-5 new-item card with several "AI suggested" fields;
   - a field whose label wraps — the chip drops to the next line, never overlaps the label.
   If the chip can't sit cleanly anywhere, STOP and show Max options rather than shipping it tight.
   (`npm run shots` needs a browser env — not run here; the layout shots will need a re-baseline.)

## NOT built (deliberately)
- No DB / no schema change → branch-safe, unrelated to the still-pending v55 migrations.
- No new components, flag tokens, pickers, or screens — every surface is reuse.
- No offline queue/retry for the AI call — offline simply = today's app (by design).
- No `vercel.json` — zero-config `/api` needs none; noted here in case one is added later.

## Still outstanding (unchanged from v61)
- The **three v55 Supabase migrations** still need applying to prod before v54–v62 go live.
- `npm run shots` + `fresh-states.spec.js` reconciliation on a browser env — now also covers v62's
  status note and the AI-suggested chip states.
