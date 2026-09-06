# REVIEW - 237 (item 12b: a trailing net-weight column prices the row)

Reviewed-commit: b92fd3b
Reviewer: `code-review` agent on **Sonnet** (claude-sonnet-5), diff of `fix/trailing-net-weight` against `main`, no brief shown.
Every finding was taken. Fixes are in the commit after `b92fd3b` on this branch.

## Findings, verbatim

### 1. CRITICAL — `invFixRow` silently corrupts an already-correct explicit `$/kg` (or `$/L`) price when the line also carries an unrelated weight token

`js/app.js:10712-10720`. The gate is `if(!(row.unit==='kg'||row.unit==='l')) return row;` — it only checks the row's *final* unit, not which branch of `parsePdfLine` produced the price. But `explicitUnitPrice` (`js/app.js:10549-10559`, the parser's *first and highest-confidence* branch, `parsePdfLine:10601-10602`) also returns `unit:'kg'`/`unit:'l'`, with a price that has nothing to do with any pack weight at all. `invFixRow` cannot tell the two branches apart, so it applies the weight-ratio correction to explicit-rate rows too.

Measured:

```
'PORK BELLY BONELESS 3.1kg $14.90/kg 46.19 2.8kg'
  parsePdfLine: unitPrice = 14.9  (correct, explicit rate)
  invFixRow:    unitPrice = 13.458064516129031, needManual = false
```

The line states the price explicitly ($14.90/kg) — there is no ambiguity to resolve. `invFixRow` computes `wr = packWeight(raw)` (finds the trailing `2.8kg`), `w = invPackWeight(row)` (finds the nominal `3.1kg` in the name), sees `w.cat===wr.cat` and `w.qtyInCat!==wr.qtyInCat`, and multiplies the correct $14.90 by an irrelevant ratio (2.8/3.1) to get $13.46 — pre-ticked, `needManual:false`, matched and ready to apply. This is exactly the "wrong price that looks plausible" class the fix exists to prevent, reintroduced by the fix itself.

The described `A · trailing net weight` bug in the new comment is itself framed around "a variable-weight meat or produce line" — which is precisely the invoice shape (nominal/average weight + explicit per-kg rate + delivered-weight column) that real weighed-goods invoices use, and that the protected region's own comment cites `"$6.20/kg"`/`"$24.78/kg"` as the standard real-world example. The fix's target class and the class it breaks are the same class.

**Confidence: high — directly measured, not inferred.**

**Decision: TAKEN, repro run first and reproduced exactly ($13.46).** The branch is now ASKED rather than inferred, using the parser's own function: `if(explicitUnitPrice(row.raw)) return row;`. That is the same rule `invPackWeight` embodies one level up — ask the real function, do not re-derive its answer — and it was the rule this batch had already been caught breaking once, in a different place, by the previous review.

### 2. MAJOR — the same gap forces spurious manual review on every fully-correct explicit-rate row that has any trailing weight-shaped token and no weight in the name

`js/app.js:10717-10718`. When the name carries no weight at all (`invPackWeight` returns `null`), the code assumes "pack size unknown" and sets `needManual=true` — correct for a weight-*derived* row, wrong for an explicit-rate row where no pack size was ever needed.

Measured:

```
'PORK BELLY $14.90/kg 41.72 2.8kg'
  parsePdfLine: unitPrice = 14.9, needManual = false  (fully correct, unambiguous)
  invFixRow:    unitPrice = 14.9, needManual = true   (now blocked pending manual review)
```

Nothing is wrong with this row, yet it is now pulled out of the "auto-tick" path CLAUDE.md's Fragile-areas section protects. For any invoice where weighed items are priced by explicit rate plus a delivered-weight column — an ordinary, common layout — every such line now demands a manual step it didn't need before this branch existed.

**Confidence: high — directly measured.**

**Decision: TAKEN — the same one-line fix resolves it**, since the row now returns before any flagging. Measured after: `needManual:false`, price unchanged.

### 3. The claim "inert by construction on every line whose weight sits inside the name" is false as stated

It is true only for rows whose price came from the `packWeight` branch of `parsePdfLine`. It is false for rows from the `explicitUnitPrice` branch, which are just as "ordinary" — more so, since that's the dedicated branch for exactly the variable-weight goods this fix targets. The claim conflates "final `row.unit` is kg/l" with "this row's price is a function of `packWeight`," which is the same category of unsound guard as findings 1–2.

**Decision: TAKEN.** The inertness sentence now names all three conditions, explicit-rate lines first, and the new guard carries the measured counter-example at its own site so the premise cannot be re-adopted by a future reader.

### 4. Coverage gap that let 1–2 through a green suite

`tests/inv-row-fix.test.js` has zero fixtures where `parsePdfLine` takes the `explicitUnitPrice` branch. Every fixture in the file reaches `invFixRow` via the `packWeight`-derived path. The file's own header claims fixtures are deliberately unusual — true, but the same gap means no fixture combines a trailing weight token with an *explicit rate* line, which is exactly the untested interaction that breaks. None of the existing assertions would fail against the code in finding 1 or 2 — they simply never execute that code path.

**Decision: TAKEN.** Both measured lines are now fixtures, placed FIRST in the file under a header explaining that a whole parser branch had no coverage and that no assertion in the file could have failed against it. Deleting the new guard turns exactly those two red.

### 5. Checked and clean: comma-thousands-separated totals do **not** corrupt weight-derived rows

The reviewer hypothesised that a comma-grouped total could inject spurious multipliers into `packWeight`'s prefix scan and corrupt `wr.qtyInCat`. Measured: `wr.qtyInCat = 497664` against `w.qtyInCat = 12`, and the result was still the mathematically correct $2057.50 — because step A's ratio is algebraically `packPrice / w.qtyInCat`, so any noise inside `wr.qtyInCat` cancels exactly, *provided* the row was weight-derived. Noted because it looked like a bug and measurement disproved it — and because that proviso is precisely findings 1–2.

### Areas confirmed clean (reviewer's words, condensed)

- **`row.unit` is never written** on any path — verified statement by statement; only `unitPrice` and `needManual` are assigned.
- **Sequencing (A before B)** is correct and necessary — verified algebraically and by the combined test; running B first would use the wrong price base.
- **The `^`-anchor and mid-line-quantity tests** exercise real guard conditions and would fail if the anchor or a logical operator were flipped — checked by hand-tracing, not by title.
- **Pack notations, credit/negative lines, name-is-whole-line**: no new regression. Negative-sign loss is a pre-existing `moneyMatches` quirk inside the protected region, untouched and out of scope.

## After the fixes

22 tests in `tests/inv-row-fix.test.js`; full suite **1852** green; smoke green; full Playwright **439 passed / 14 skipped**; `npm run mutate` exits 0 with 31 survivors, all carrying written allowances. Deleting the new explicit-rate guard turns exactly the two new fixtures red.
