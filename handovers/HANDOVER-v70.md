# HANDOVER v70 — remove the diagnostic Gemini probe · reconcile the fresh-states visual suite (both long-standing outstanding items)

**Completed:** 22 Jul 2026 · branch `chore/fresh-states-and-probe-gate`.

No brief — Max asked to clear the two standing "outstanding" items now that they're both necessary anyway:
(1) gate/remove the diagnostic `?probe=1` endpoint before multi-tenant, and (2) reconcile the stale
`fresh-states.spec.js` Playwright suite. Branch off **v69** (`origin/main` = `cd98207`, PR #14 merged).
Baseline **274 node tests green**. Ended **274 node green**, jsdom smoke green, **`fresh-states.spec.js`
Playwright suite GREEN (31 passed)**, `node -c` clean (app.js, sw.js + all four `api/*.js`).

**Six spots v69 → v70** — one small client CSS fix ships (the empty-state centring below), so the cache
version bumps even though the rest is server-/test-only. Invariants held: protected parser region untouched;
money law untouched; naming inversion left alone; no new deps.

---

## 1 — Removed the diagnostic `?probe=1` endpoint (`api/parse-invoice.js`)
The v64 diagnostic (`GET /api/parse-invoice?probe=1[&text=…]`) made **real, billed, rate-limited** Gemini
calls and listed the models the key can see — added to debug the reader rollout. It was already gated behind
`GEMINI_DEBUG=1` (404 by default), but the reader has been live and stable since v64/v66, and a billed
endpoint with no auth beyond an env flag has no place before EzPlate is multi-tenant. **Removed entirely:**
`PROBE_SAMPLE`, `probeGemini()`, and the handler's `probe` branch. The key-free `?health=1` check remains
(reports resolved model + whether a key is configured, never the key). Server-only; no client behaviour change.

## 2 — Reconciled `fresh-states.spec.js` to the current app (was ~12 stale failures across v54–v69)
This visual suite (`npm run shots`, NOT in `npm test`) had drifted for many versions. Root-caused and fixed:

- **Builder became a modal (v54).** Four tests navigated to the Plates tab and drove `#lines` but never
  opened `#builderModal`, so the lines were hidden (screenshot timeouts / zero rows). Added a shared
  `openFreshBuilder(page)` helper (nav → `#newPlateBtn`, opened BEFORE adding lines since `openBuilder`
  resets the plate) and used it in the four builder tests (v44 item 8, v44 dark theme, v45 items 6+7,
  v46 item 6 ×2 sizes).
- **Target line is now in-view-only (v60).** Two chart tests assumed the target line is always drawn:
  - *v45 item 5 (dashboard headroom)* — its whole premise (data forced below the target, target still the
    topmost line) is invalid under v60's data-fitting domain (v61 draws nothing when out of view). **Deleted**
    — the current domain/target contract is pinned by the node suite (`trend-domain.test.js` + `trend-ticks`).
  - *v47 chart statics* — kept (it pins many still-valid things: bezier curve, dotted fill, y-tick count,
    gutter alignment, sparse/dense dots, focusable). Made the target bits v60-aware: guarded the possibly-null
    `.ref-line` in `drawnLeft`, and only assert "the target sits on a labelled tick" **when the line is drawn**.
- **Features removed in v54/v55.** Deleted two tests for machinery that no longer exists: *v44 item 9*
  (Save-draft parks under "Unassigned dishes" — the `MENU_UNASSIGNED` holding area, removed v54) and *v52
  tap-to-edit* (the Menu `→ Builder` chip `.mi-btn.tobuilder`, removed v55 §D; it also needed seeded dishes a
  fresh install lacks).
- **One REAL bug the suite correctly caught → fixed in CSS (this is the client change that bumps the version).**
  *fresh analysis empty state @ mobile* failed because the Menu search-empty cell was padded asymmetrically at
  mobile (`padding-left:0 / padding-right:28px`), shoving the centred empty-state 14px off-centre. Cause: the
  card-collapse rule `.atable tbody tr > td:first-child{padding:0 28px 6px 0}` (specificity 0,2,3)
  out-specifies the plain `.es-row td` reset (0,1,1). Fix: raise the reset to
  `.atable tbody tr.es-row > td{padding:0…}` (0,2,3, later in source → wins). Desktop was already symmetric.

**Result: 35 → 31 tests, all green** (4 dropped: the two removed-feature tests, the superseded dashboard
headroom test, and the ×2-size tap-to-edit test). Verified with `playwright test tests/visual/fresh-states.spec.js`.

## Tests / verification
- `npm test` = **274 green** (no node tests added/changed; the version bump keeps `settings.test.js` in sync).
- jsdom smoke green (About version matches sw.js at v70).
- `fresh-states.spec.js` = **31 passed, 0 failed**. Full `tests/visual` suite re-run to confirm the CSS fix
  didn't disturb `screenshots.spec.js` / `layout-consistency.spec.js` (see the run notes).
- `node -c` clean on `js/app.js`, `sw.js`, and all four `api/*.js`.

## Needs Max's phone
- Nothing functional changed for the user except the **Menu search-empty state now centres at 380px** (it was
  ~14px left of centre) — worth a glance at both themes. Everything else here is test-suite hygiene + a
  server-side removal (the invoice reader behaves exactly as before; `?health=1` still works, `?probe=1` now
  404s like any unknown route).

## NOT built / deliberately left
- The other visual specs (`screenshots.spec.js`) still expect live Supabase and aren't reconciled here —
  out of scope; they were already passing/handled per the v68 handover.
- Purchased-quantity capture for v55 §I (needs a protected-region edit) — still the standing optional item.
