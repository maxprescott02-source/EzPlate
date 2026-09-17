# REVIEW - 280 (product-form-parity)

Reviewed-commit: a39072a

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.

**Outcome: one CRITICAL finding, reproduced end to end, and it is the most serious defect this session produced.** One minor, also real. Both fixed.

The reviewer was told the diff touches how a stored product cost is derived and to weight correctness above everything else. It did not review by reading: it patched a fixture to the production state the repo's own migration documents, drove the real Edit form in a browser, clicked Save, and read the stored row back.

---

## The report, verbatim

## Review: `fix/product-form-parity` vs `main`

Scope: `js/app.js` (pack-driven price on the Edit-product form), `index.html`, `css/style.css`, `tests/pack-drives-price.test.js`, `tests/visual/280-pack-drives-price.spec.js`, plus version/queue bookkeeping.

Full suite (`npm test`): 2417/2417 pass. `npx playwright test tests/visual/280-pack-drives-price.spec.js`: 4/4 pass (run without a pipe, exit code checked). Six cache-version spots agree at v228.

### Critical — the unit-mismatch guard is skipped whenever the stored product has no `base_unit`, and that state is real in production

`igPackDerive` only refuses a pack whose unit disagrees with the stored one when `storedBaseUnit` is truthy:

```js
if(storedBaseUnit && r.base_unit!==storedBaseUnit) return {state:'mismatch', ...};
```

When `storedBaseUnit` is `null` (product's `base_unit` column is `null`), the check is skipped entirely and any pack — regardless of unit — is accepted as `'ok'` and written straight into `#ig_price`. The accompanying test (`"with no stored base unit the pack derives freely"`) asserts exactly this and calls it *"the create-ish path"* — but `igPackDerive` is **only ever invoked from `openIngEdit`/`igPackFill`, i.e. Edit**, never from product creation. There is no create-ish path here: a null `base_unit` reaching Edit is an existing, ambiguous row, not a not-yet-decided one. This is the project's own top-priority failure shape — a comment/justification whose stated reasoning doesn't hold at the site it excuses.

`base_unit = null` is not hypothetical. `supabase/migrations/20260801_base_products_backfill.sql` documents 8 real production rows coerced to `null` specifically because their unit is unknown — including P0122 "Container Food 3.15Lt Storage" (`sold_by: 'each'`, currently uncosted) and P0279 "Pump Syrup" (`sold_by: 'each'`). These are exactly the rows Max would open Edit on to give them a price, and the new pack-driven UI is the obvious way to do it (enter qty + unit + price).

Reproduced live in a real browser (Playwright against the app, fixture patched to `base_unit: null, cost_per_base_unit: null` for P0122, matching the documented production state):

- Opened Edit, entered pack `1 ea` at `$1.41` (a completely natural, correct entry for a $1.41-each container).
- Read-out correctly showed `"= $1.41 / unit"` — no warning of any kind, `#ig_err` stayed empty.
- Clicked Save. The row saved as:
  ```json
  { "base_unit": "g", "cost_basis": "$/g", "cost_per_base_unit": 0.00141, "pack_qty": 1, "pack_unit": "ea", "current_price_exgst": 1.41 }
  ```

The product is silently stored at **$1.41/kg instead of $1.41/each** — off by roughly 1000x for a countable item now mis-tagged as sold by weight — with no error, no confirmation dialog, and a read-out that told the user the opposite of what got saved. This is the same magnitude of defect the code's own comments cite as precedent (*"$2166.67 instead of $1.30"*), and it lands through the exact path that giant comment block claims is safe (*"THE WRITE PATH IS DELIBERATELY UNTOUCHED... cannot reach `base_unit`"* — false for this state: `saveIngEdit`'s own pre-existing `_bu==='g'?...:'kg'` fallback silently turns `null` into `'g'` on save, and the new feature is what makes hitting this path likely).

Repro: `tests/pack-drives-price.test.js`'s own `H.igPackDerive(parts(5,'ea',80), null)` test proves the mechanism (`state:'ok'`, computed freely) — the gap is that nothing traces this through `saveIngEdit`'s null-`base_unit` default to see what actually gets persisted. I verified the full round trip in a live Playwright session against the real app and real save path (not included in the branch — reproducible by seeding `productPatch: { P0122: { base_unit: null, cost_per_base_unit: null } }` via `_boot.js` and driving the Edit form as above).

### Minor — the unit-mismatch refusal message (`.calc-line.bad`) has no visual treatment distinguishing it from an empty placeholder

`css/style.css` defines `.calc-line` and `.calc-line.ok` but no `.calc-line.bad`. Verified with computed styles in a live page: `.calc-line.bad`'s color/border/background are byte-identical to the bare `.calc-line` default. Every other `.bad` modifier in this stylesheet (`.stat-arrow.bad`, `.mnu-pct.bad`, `.dh-num.bad`, …) resolves to `color:var(--bad)`; this one resolves to nothing. The refusal text is present and readable, but the one safety-critical message this feature can show (*"That pack is measured in X, but this product is stored per Y"*) renders with the same muted, neutral styling as "no pack entered yet." This is the CSS rule's own named trap class — a rule that looks correct in the file and does nothing on screen — and no test in the diff checks computed style (the Playwright spec only asserts `className` contains `'bad'`, which passes regardless of whether `.bad` is styled).

### What I checked and found correct

- **Arithmetic across unit combos** (kg/g, l/ml, ea) composes correctly: `igPackFill`'s fill into `#ig_price` and `saveIngEdit`'s `price/ub.div` divisor agree with `packToUnitCost`'s own `cost_per_base_unit`, pinned against the real functions (not stubs) in `tests/pack-drives-price.test.js`'s round-trip test, and confirmed live via Playwright (`$65/10kg → 8.00` on qty edit, etc.).
- **Unit-mismatch refusal when `base_unit` is a real value** (`g`/`ml`/`ea`) works as designed: refuses, leaves `#ig_price` untouched, names both units. Verified live.
- **`base_unit`/`cost_basis` cannot be changed by this form** when the stored unit is known — `saveIngEdit` always derives `unitType` from `byId[id].base_unit`, never from the pack, and `#ig_unit` stays `disabled`. Confirmed by the "does not move the base unit" Playwright assertion and by reading the write path.
- **Open path**: a product whose stored price and stored pack disagree is *not* silently rewritten — `igPackFill(..., true)` only fills `#ig_price` when it's empty on open; a non-empty stored value is left alone even when the pack derives a different figure (only the read-out changes). Confirmed by code and by the `quiet` guard.
- **`current_price_exgst` being written by the Edit form**: it was already written by `submitNew` and the catalogue importer with the same semantics (total pack price, ex-GST); the row mappers (`ingredientToRow`/`rowToIngredient`) already round-trip the column; nothing else in the app reads it. Grepped every occurrence — the new writer is consistent and doesn't collide with or break any other reader/writer, the backup format, or the invoice-apply path.
- **Event listeners**: `igPackWire` guards against re-attaching with `el.__igPackWired`, and re-reads `el.__igBase` at event time rather than closing over a stale value, so opening product B after product A does not leak A's stored base unit into B's derivation.
- **Clearing the pack price on save**: since `#ig_packPrice` is always repopulated from `p.current_price_exgst` on open, a save that never touches the pack fields round-trips the existing value rather than nulling it.

### Confidence

The critical finding is verified end-to-end against the real save path in a live browser session, using the exact production state the repo's own migration documents (8 real rows, `base_unit: null`). I'm confident in both the mechanism and the outcome. The CSS finding is verified by computed-style comparison in the same live session.

---

## Decisions

### CRITICAL — CONFIRMED by independent repro, FIXED.

`CLAUDE.md` requires a finding's own repro to be run before its remedy. Run here against the extracted shipped functions rather than the reviewer's fixture, which is a second route to the same answer:

```
derive state: ok   perUnit: 1.41   unitWord: unit
saveIngEdit unitType for a null base_unit: kg -> div 1000, base_unit g
STORES cost_per_base_unit = 0.00141  ($/g)
TRUTH for a $1.41-each item          = 1.41  (per unit)
FACTOR WRONG: 1000
```

And the production state is real: `supabase/migrations/20260801_base_products_backfill.sql` says at its own site *"EIGHT ROWS HAVE THEIR `base_unit` COERCED TO NULL"*, with *"All 8 have `cost_per_base_unit` NULL"* — which is what makes them the rows someone opens Edit on to give a price.

**Fixed:** an unknown stored unit is now its own state, `nounit`, refused before any figure is produced. The form says *"This product has no unit recorded, so a pack cannot work out its price per unit. Enter the price per unit directly."*

**⚠️ The reviewer's sharpest point is about the TEST, not the code, and it is the one worth carrying.** `tests/pack-drives-price.test.js` asserted the broken behaviour as correct and justified it as *"the create-ish path"* — a path that does not exist, since `igPackDerive` is reached only from `openIngEdit`. **A justification naming a caller the function does not have is this repo's most-recorded comment defect, and here it turned a defect into a green test.** The test now asserts the refusal across all five pack units, with a control proving the same pack still derives once the unit is known — so a version that refused unconditionally would fail rather than pass.

### MINOR — CONFIRMED, FIXED, and the test that missed it is fixed too.

`.calc-line.bad` had no rule at all; the two safety refusals rendered byte-identically to the "no pack entered yet" placeholder. Added, resolving to `var(--bad)` like every other `.bad` in the sheet.
**The spec's assertion was the actual gap**: it checked `className` contains `'bad'`, which passes whether or not `bad` means anything — roster 190's denylist weakness in a new costume. It now compares the rendered colour against both the neutral and the happy state.

### And the half that is NOT this batch's to fix — queued as item 102, tier A.

The underlying mechanism is pre-existing: `saveIngEdit`'s `_bu==='g'?'kg':…:'kg'` fallback turns a null unit into `'kg'`, so **typing directly into `#ig_price` has always stored 1000x wrong on those eight rows.** 280 did not cause it and 280's fix does not remove it — the honest refusal now routes the user to *"enter the price per unit directly"*, which is the path that is still wrong.
Filed **[A]** rather than [B] because it writes a wrong cost to the database. `CLAUDE.md` treats that as the one thing this app must never do, and a default that invents a unit is the `isFinite('')` shape: it turns "unknown" into a confident wrong answer.
