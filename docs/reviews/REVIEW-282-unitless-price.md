# REVIEW - 282 (unitless-price)

Reviewed-commit: 0428da5

**Agent:** the `code-review` agent, on **Sonnet**, overriding the definition's `opus` pin because this batch ran on Opus.

**Outcome: ONE MAJOR FINDING, REPRODUCED AND QUEUED AS ITEM 103. Two minor, both handled.**

The major finding is not a defect in this diff.
It is the same shape of defect at a different door, which exists on `main` today and is unchanged by this branch: the invoice-apply path writes `base_unit` on a product whose unit is unrecorded with no gate at all, because the mismatch guard short-circuits on a falsy `baseCat`.

**I reproduced it before acting on it**, per `CLAUDE.md`'s rule that a finding carries separable claims.
The mechanism holds exactly as stated, and the control case proves the guard works everywhere else.
**It is NOT folded into this PR.** It lands in `resolveMatchedPrice` and the invoice review state machine, which `.claude/rules/invoice.md` puts under mandatory regression tests and a `tests/parser-corpus/run.js` run in both directions.
Folding a second write-path change to the app's other most dangerous surface into an [A] money fix is `CLAUDE.md`'s "the batch would exceed what one PR can be reviewed as", which says to split and queue the rest.

The repro's output is in the item itself so the next batch does not re-derive it.

---

## What I did about each finding

| # | Finding | Decision |
|---|---|---|
| 1 | The invoice-apply path has no equivalent unit gate | **Reproduced, queued as item 103 [A].** Not fixed here - different site, parser-region rules, own corpus run. |
| 2 | Queue not struck, `STATE.json` batch still 281, no handover | **Not a defect: that is `/batch` step 10**, which runs after merge. Done in the handover commit. |
| 3 | Uncommitted spec change on top of the reviewed commit | **Committed.** Its reasoning was right and the review's analysis of it was right too - the final state is identical either way, so it exposes no bug; it makes the test drive the path a person actually drives. |

## The repro I ran for finding 1

Real functions, extracted. `stored g` is the control.

```
stored g,       parser "ea"    baseCat "kg"   unitMismatch true    invRowState review
stored g,       parser "kg"    baseCat "kg"   unitMismatch false   invRowState matched
stored null,    parser "ea"    baseCat null   unitMismatch false   invRowState matched   <-- pre-ticked
stored null,    parser "kg"    baseCat null   unitMismatch false   invRowState matched   <-- pre-ticked
stored "unknown", parser "kg"  baseCat null   unitMismatch false   invRowState matched   <-- pre-ticked
stored null,    parser "box"   baseCat null   unitMismatch false   invRowState matched   <-- stores 'ea'
```

The last row is the one that writes a wrong number rather than merely an unconfirmed one: nothing recognises `box`, `invPriceUnit` falls through to `'ea'`, and the parser's per-box price is stored as a per-unit price.

---

## The report, verbatim

## Summary

I reviewed commit `0428da5` against `main`. The fix itself — `igStoredUnitType`/`igChosenUnitType`/`igUnitLock`/`igEffectiveBase` in the Edit‑product form — is correct and well‑tested for the surface it covers. But the diff's own framing ("a product with no recorded unit cannot be priced until the unit is known") is broader than what it actually closes, and I found one real gap plus some process/completeness issues.

## 1. Major — the same "unrecorded unit → silent default" defect is still live via the invoice‑apply path (not touched by this diff)

**Files:** `js/app.js`, functions `resolveMatchedPrice` (~13219‑13223), `kingRepointGuard` (6487‑6489), `invUnitRebase` (14147‑14151), `invPriceUnit` (14131‑14132), `applyInvoice` (14839‑14850).

`saveIngEdit` now refuses to write a price for a product whose `base_unit` is unrecorded until the user picks one. But a product can also get its `cost_per_base_unit`/`base_unit` written by **matching it against an invoice line and applying the import**, and that path has no equivalent gate:

- `resolveMatchedPrice` computes `var baseCat=product?unitCatCategory(product.base_unit):null;` and only sets `row.unitMismatch=true` when `baseCat` is truthy. `unitCatCategory(null)` (and `unitCatCategory('unknown')`/`('dim')`) returns `null`, so for any of the eight unrecorded‑unit products the mismatch check is skipped entirely — `chosen.unit` (the parser's guess for *this one invoice line*) is accepted unconditionally.
- `kingRepointGuard(oldBaseUnit, newBaseUnit)` does `var oldCat=oldBaseUnit?unitCatCategory(oldBaseUnit):null;` and `needsConfirm=!!(oldCat && newCat && oldCat!==newCat)`. A null `oldBaseUnit` makes `oldCat` null, so `invUnitRebase` returns `null` (no rebase warning), and `invRowState` never routes the row to `'review'` on that account.
- `invPriceUnit(r,p)` falls back to `p.base_unit==='g'?'kg':p.base_unit==='ml'?'l':'ea'` when the parser's own `r.unit` isn't recognized — for a null `base_unit` that's `'ea'`, silently guessed, not asked.

Net effect: if a previously‑unitless product is text‑matched to an invoice line with high confidence (`tier==='hi'`) and the parser derives *some* unit for that line, `invRowState` returns `'matched'`, the row is **pre‑ticked** per the auto‑tick rule, and `applyInvoice` writes `base_unit`/`cost_basis`/`cost_per_base_unit` from whatever the parser inferred for that one line — with no confirmation dialog, no mismatch flag, no manual-unit prompt. That's the same "an absent unit resolves to a default nobody chose" defect this batch fixed in the Edit form, reachable through a different, arguably more commonly used, door.

**Confidence:** high on the mechanism — traced directly through the four functions and their call sites, not through the fixed comment trail. Not verified against a running browser/import, so I can't state the resulting number's exact magnitude; the shape of the gap is what I'm confident of.

**How to verify:** give a product `base_unit: null` in the fixture/test catalogue, run it through `buildInvRows`/`resolveMatchedPrice`/`applyInvoice` against an invoice line whose text yields a `kg` or `ea` unit, and check whether `row.unitMismatch` and `invUnitRebase(row)` are ever true, and whether `invRowState(row)` can return `'matched'`.

## 2. Minor — batch closeout is incomplete, and the files that say so disagree with each other

- `docs/QUEUE.md:75` still lists item 102 as `## next`, unstruck.
- `docs/STATE.json` bumps `deploy_version` to 229 and `written_at` to 2026‑09‑22, but leaves `"batch": 281` unchanged even though the commit message says `282: …` and CLAUDE.md requires STATE.json to be rewritten "in the same commit as each handover."
- No `docs/handovers/HANDOVER-282-*.md` exists in this diff at all, which per `CLAUDE.md` means "the batch is not finished."

This isn't a data-correctness bug, but it is a concrete, checkable violation of the project's own required process, and it would mislead the next `/batch` run into thinking item 102 is still open while the fix has already shipped.

**How to verify:** `grep -n "102" docs/QUEUE.md`, `cat docs/STATE.json`, `ls docs/handovers/ | grep 282`.

## 3. Note — uncommitted change sitting on top of the reviewed commit

`git status` shows `tests/visual/282-unitless-product.spec.js` modified in the working tree beyond `0428da5`. It replaces hand-dispatched `change` events on `#ig_packUnit` with real `page.selectOption`, arguing a real `<select>` fires `input` then `change` and the committed test skips the `input`-triggered intermediate render. I traced this through `igPackWire`/`syncIgUnitFromPack`: the extra `input` event does cause an intermediate stale render, but the final state after `change` fires is identical either way (same listener order, same final DOM), so I don't believe this exposes a functional bug in the reviewed commit — but it's an uncommitted change to a test that's about to be reviewed/merged, worth reconciling (commit it or discard it) before push rather than leaving it dangling.

## What I didn't find anything wrong with

- `igStoredUnitType`/`igEffectiveBase`'s null-vs-truthy-unrecognized handling (the `"unknown"`/`"dim"` fixture-vs-production divergence) is handled correctly and is pinned by tests that actually exercise the real functions via `extractFn`, not stubs.
- The `openIngEdit` listener‑registration reordering (`syncIgUnitFromPack` before `igPackWire`'s listeners) is correct and necessary for the pack‑drives‑price journey on an unlocked control; I traced both orderings and confirmed the shipped order produces the correct final read‑out.
- `saveIngEdit`'s refusal (`if(!unitType) return fail(...)`) genuinely blocks the write — `C.writes.length===0` is asserted directly against the real function, not a stub.
- Six cache-version spots agree at v229; parser-region anchors (`var INV_EXCLUDE=`, `function unitLabelFor(`) are untouched; no duplicate top-level declarations introduced.
- The `#ig_pricePer` dead-element and `igUnitWord`'s "unit"-for-unknown latent issue are honestly filed in `docs/MAINTENANCE.md` rather than silently left — I checked those claims (`grep -c ig_pricePer index.html` etc.) and they hold up.
