# HANDOVER v82 — New-user friction: the product→recipe bridge, plate drafts, live margin, sticky Save

**Completed:** 25 Jul 2026 · branch `feature/newuser-flow` (off `main` @ v81) ·
brief `~/Downloads/ezplate-opus-newuser-friction.md`. Plan approved by Max (two open design calls
answered "pick what's genuinely best for the user, not the low-risk option").

Baseline v81, **333 node green**, jsdom smoke green, `node -c` clean. Ended **354 node green**
(+21 across four new test files), smoke green (+ new `[20]` section), `node -c` clean (app.js, sw.js),
six version spots → **v82**. **Client only** (HTML + CSS + JS + tests). **Zero contact** with the
protected parser region, money law, the naming inversion (an ingredient is still `{id,name,pid}`), the
menu data model, invoice review / `invRowState` / auto-tick, the insight engine, or `api/*.js`. No new
dependency.

## 1. THE BIG ONE — the product→recipe bridge (the #1 give-up point)

A new user made products (oil, bacon, eggs), tried to build a plate, and couldn't — plates cost from
kitchen **ingredients**, not products, and nothing on the Products side said "make a kitchen word next."
Fixed by adding the missing PATH, not by touching the two-object model.

**Design (Max: build what's best for the user).** Three pure helpers + surfaces:
- `kingForProduct(pid)` — the linked kitchen word, or null (the visible-state lookup).
- `bridgeKingName(p)` — `proposeKingName`, then **clash-safe**: if the name's taken by a *different*
  product, append the brand ("Bacon" → "Bacon Primo"), then a numeric suffix. A one-tap create can
  never collide with `kingNameExists`.
- `bridgeCreateKing(pid)` — **idempotent**: returns the word already linking the product, else creates
  one through the SAME write path the Ingredients tab uses (`nextKid` → `kitchenIngredients.push` →
  `saveKitchenIngredients`). No duplicate on repeat; no new data model.

Surfaces (state visible everywhere, action where the user stalls):
- **Product card** — restructured to a `.prod-card` wrapper holding the **UNCHANGED** `.ing-card` button
  (opens edit, same look as plate-library cards) plus a `.prod-bridge` strip: unlinked → a one-tap
  **"Use in recipes"**; linked → an **"✓ In recipes · {word}"** chip. `.ing-card`'s base CSS is untouched
  (plate cards, app.js:3050, share it) — the border/hover move to `.prod-card`; the inner button drops
  its own border so there's one frame. `#ingList .ing-card` still resolves (the smoke/edit wiring holds).
- **Create moment** — after `submitNew`, an **action snackbar** ("{name} saved · Use in recipes", ~6s,
  tappable) via new `toastAction()`. Chosen over a confirm dialog so bulk product entry isn't interrupted;
  separate from `toast()` (a text-only `role=status` region — an actionable control doesn't belong in it).
  `submitNew` now also re-renders the Products list so the new card (and its bridge) shows at once.
- **Edit modal** — a `#ig_bridge` row (`fillIngBridge`) shows the same state/action for parity.

## 2. D1 — in-progress plate draft (offline-first)

Building a plate then reloading lost everything. Now the live builder persists to **one** localStorage
slot `cafeDB_plateDraft` (not a draft library), debounced (`scheduleDraftSave`, 250ms), hooked into the
mutation funnels: `renderPlate` (structure), `updateTotals` (qty/misc/price — every cost change routes
here), `setMiscLabel`, and the name/category inputs. On boot, `offerPlateDraftResume` reads a
**snapshot taken at module load** (`_bootPlateDraft`, captured before any render can clear the slot) and,
if it has content, offers **Resume / Discard** via `askConfirm` — which gained an optional
`cancelLabel`/`cancelFn` (existing 4-arg callers unaffected; only the labelled Cancel button runs the
callback, so a stray ×/Escape/backdrop never discards). Cleared on successful save (`saveCurrentPlate`)
and on explicit Clear. A draft referencing a since-deleted ingredient round-trips fine — `renderPlate`
already renders such a line as "product missing" and `costFromLines` leaves it out of the total.

## 3. Live margin preview at the point of pricing

The Add-to-menu dialog demanded a sell price but showed no cost %, margin, or light until the dish was
committed and the Menu tab opened. New `#mi_preview` line updates as the price is typed:
`menuMarginPreview(cost, price)` **REUSES `analyze()`** (the exact cost/target/light logic the Menu table
uses — not a reimplementation), so the preview and the resulting Menu row **cannot disagree**. Shows
"Ingredient cost $X · at $P → N% food cost · {Healthy/Slightly under/Underpriced}" with the same `.dot`
colour key; before a price is typed it shows cost + the target-based suggested price.

## 4. Builder Save below the fold

Save moved from inside `#platePanel` into a pinned **`.mfoot .builder-foot`** (a flex:0-0-auto footer on
the flex-column modal), so it's always reachable without scrolling past the docket + name/category. The
"Name & save" section and Print/Clear stay put; only the button relocated (id `#saveBtn` unchanged — smoke
and wiring hold). One full-width primary CTA — the builder's single primary action.

## 5. Minor

- **D2 — pack size dropped on create (ROOT CAUSE).** `submitNew` stored `pack_size_raw` (a display
  string) but never the structured `pack_qty`/`pack_unit` that the edit form reads back
  (`openIngEdit`/`saveIngEdit`) — so the pack field reopened BLANK while the per-unit price (from `calc`)
  was correct. The record is now built by the pure `newProductRecord()`, which sets `pack_qty`/`pack_unit`
  (same shape the edit path uses). This also feeds invoice pricing correctly (product pack > memory >
  parser), which the form copy promises. The existing `pack-survives` test only covered the *invoice*
  teach path — this manual-create path was untested; now locked by `tests/create-pack.test.js`.
- **D3 — "Food item" checkbox a11y (DIAGNOSED, no change warranted).** The report said its accessible
  name was "on". In the shipped markup the input is WRAPPED in its `<label>`, so the name already resolves
  to the visible text — verified in jsdom: `input.labels.length === 1`, `label.control === input`, name =
  "Food item (appears in ingredient search)". The reported bug **does not reproduce** (fixed since the
  report, or a tooling artifact). No spurious markup added; instead `tests/a11y-fooditem.test.js` LOCKS
  the association so it can't regress into the reported state.
- **Wording.** The plate-card **"Manage menus"** button is now **"Add to a menu"** (opens the same
  many-to-menu manager); the dialog's static title/save default aligned to "Add to menu". Copy only.

## Tests / verification
- **Four new files (+21):** `bridge.test.js` (state lookup, idempotency, clash-safe naming),
  `plate-draft.test.js` (what's stored, no stale draft when empty, missing-ingredient round-trip),
  `menu-margin.test.js` (the preview's light ALWAYS equals `analyze()`'s — the reuse is the contract),
  `create-pack.test.js` (D2 pack round-trip), `a11y-fooditem.test.js` (D3 label association).
- **Pinned-contract updates (same batch):** `plates-independence.test.js` got a `clearPlateDraft()` stub
  (`saveCurrentPlate` gained that dependency); `smoke.js` `[12]` wording pin updated "Manage menus" →
  "Add to a menu"; `_extract.js` exposes `newProductRecord`.
- `smoke.js` `[20]` (NEW): the card bridge (unlinked action → link → chip, idempotent), the margin slot
  reusing `analyze`, the draft helpers, the pinned Save footer. (Section clears filters first — earlier
  sections left search/filter state dirty; that was a harness ordering issue, not an app bug.)
- `npm test` **333 → 354**, jsdom smoke green, `node -c` clean, six version spots → **v82**.
- **CodeRabbit:** 2 minor findings, both addressed — (1) `pack_size_raw` produced a "NaN …" string when
  the pack size was blank → now `''` (matches the `pack_qty` null handling); (2) a visual-spec comment
  over-claimed that the publish modal was captured → corrected to describe what the test actually shoots.

## Needs Max's phone (feel / touch — can't be judged here)
- **Bridge:** create a product, then use the bridge into a plate WITHOUT visiting Ingredients manually —
  via the create-moment snackbar AND via the card's "Use in recipes". Linked cards show the chip; no
  duplicate on repeat. Both themes, 380px.
- **Draft:** build a plate, reload, get the Resume/Discard prompt, resume correctly; Discard clears it;
  a saved plate leaves no draft.
- **Margin preview:** price a dish in the Add-to-menu dialog and watch cost %/light update live; confirm
  it matches the Menu row after saving.
- **Sticky Save:** reachable without scrolling at 380px and desktop; one primary CTA.
- **Pack size** entered on create round-trips on reopen.
- **Wording:** "Add to a menu" reads right on the plate card.
- **Snackbar** on desktop (it's bottom-centre; the plain toast shifts for the side nav — the snackbar
  does not) — check it doesn't sit awkwardly over the desktop layout.

## Visual specs (Playwright) — NOT run here (no browser)
Product-card screenshots will differ (the new `.prod-bridge` strip), as will the builder popup (sticky
Save footer) and the Add-to-menu dialog (margin line). No spec SELECTOR breaks (they key off `.king-row`,
tab `.actions` rows, `#newPlateBtn` — none of which changed structurally), but the baselines under
`tests/visual/__shots__/` need regenerating + eyeballing on a browser env. `fresh-states.spec.js` remains
not-runnable-in-env (per CLAUDE.md), still deferred.

## NOT built (deliberately)
Nothing from the brief deferred. The praised elements (inline docket, live unit-cost hint, plain-language
helper copy, category typeahead, honest delete confirms) left exactly as-is.
