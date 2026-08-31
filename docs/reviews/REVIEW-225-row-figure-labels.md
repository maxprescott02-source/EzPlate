# REVIEW - 225 (the converted screens' figures say which column they are)

Reviewed-commit: f2b4799a4d1ebaf2f7f8385e82fec963559cd959
**Agent:** pre-push `code-review`, run on Sonnet against Opus 5 (the batch's own model), on `git diff main...HEAD`, without the queue item.
**Verdict:** no findings.

⚠️ **A no-findings report still gets a file, and that is the entire point of this directory** — a review that found nothing and a review that never ran are otherwise the same silence.
⚠️ **One honest caveat about this run, raised by the agent itself and kept here rather than tidied away:** three commits landed on the branch WHILE it was reviewing (`665bbe3`, `18b0c76`, `f2b4799`). It says it reviewed against the final HEAD, and `Reviewed-commit` names that HEAD, so the artifact and the report agree. It is recorded because a reader comparing timestamps would otherwise find the overlap themselves and have no way to know it was noticed.

---

## The report, verbatim

Clean. I've completed a thorough review, including running the real tests and hand-mutating the two safety-critical guards to confirm they actually fail. Here is my final assessment.

## Finding

**Nothing.** I could not find a defect in this diff — not in the priority-1/2/3 categories (wrong conditions, writes that don't land, sequencing), not silent failure, not a test that can't fail, not dead code, and not a false claim in the new CSS-cascade comment.

Specifics checked, for the record:

- **`js/app.js`** (`srLabel`, and its use in `renderIngredients`, `renderKitchenPanel`, `renderPlatesTab`, `aRow`, and the uncosted-row branch in `renderAnalysis`): every cell that shows a bare, non-self-describing figure (`—`, a dollar amount) gets a label; every cell whose visible text already names its subject (`no cost`, `not costed`) correctly omits one. The `plib-cost` label is gated on the same `plateFullyCosted`-derived `costed` var that decides the visible branch, so it can't drift from what's on screen. Confirmed by mutation: flipping the `plib-cost` ternary to unconditional, and reintroducing the removed `aria-label="Edit …"` on the Ingredients row, both turned `tests/row-figure-labels.test.js` red immediately.
- **`css/style.css:2667-2670`**: the stated cascade reasoning (same-specificity selector pair, media rule wins on source order) is literally true — both rules use the identical selector list, so there's no specificity trick to get wrong, and `.sr-only`'s underlying `position:absolute`/`clip:rect(0,0,0,0)` means the `display:none`↔`display:inline` toggle changes only accessibility-tree membership, never visible geometry. Verified no other rule in the file touches `.sr-only` or these three descendant selectors. Verified via grep that the three suppressed classes (`mnu-cost`, `mnu-sug`, `king-used-n`) are exactly the ones with mobile `::before`/`::after` generated content, and that the other four labelled cells (`ing-price`, `king-price`, `plib-cost`, `mnu-price`) have no such generated content and are correctly left unsuppressed.
- **Missed render branches**: checked every place each of the seven labelled classes is emitted (including the second `mnu-cost`/`mnu-sug`/`mnu-price` code path in the uncosted-menu-row branch) — all covered, no bare second copy without a label.
- **Escaping / double-emission**: `srLabel` is called only with hardcoded literals; no injection surface. The label span sits outside the `<b>` wrapper on Products' unit-cost cell, so it doesn't corrupt that markup. No cell emits two labels.
- **Collateral damage to unmodified tests**: grepped every other test file for the seven touched classes (`king-rows.test.js`, `menu-margin.test.js`, `prod-rows.test.js`, and the untouched Playwright specs) — none assert on runtime DOM text content for these cells in a way the new `.sr-only` spans would corrupt; the two that do source-text slicing (`menu-margin.test.js`) operate on the JS source, not the function call's expansion, so they aren't fooled by `srLabel('cost')` the way the new test file explicitly guards against. Ran the full relevant set (`row-figure-labels.test.js`, `king-rows.test.js`, `menu-margin.test.js`, `prod-rows.test.js`) — 37/37 pass.
- **Six cache-version spots**: all six updated consistently to v185 (`index.html` ×2, `sw.js` `CACHE` + `ASSETS` ×2, `js/app.js` `APP_VERSION`).
- **Naming inversion**: `renderIngredients` (data-tab="ingredients") correctly treated as the Products UI, `renderKitchenPanel` (data-tab="pantry") as the Ingredients UI — matches CLAUDE.md's crossing, not inverted.
- Docs changes (`QUEUE.md`, `MAINTENANCE.md`, `PHONE.md`) are consistent bookkeeping (closing the maintenance item, promoting displaced B-items, adding a manual VoiceOver check) with no factual contradictions against the code.

One aside, not a finding against the diff itself: mid-review the branch received several more commits from what appears to be a concurrently-running process on this same worktree (`665bbe3`, `18b0c76`, `f2b4799` — the last of which adds `esc()` to `srLabel`, a purely defensive strengthening with no behavioral change since all call sites pass literals). I reviewed against the final HEAD state; nothing in those later commits changes the assessment above.

---

## What was done about it

Nothing to fix. **Two of its checks are worth recording because they are corroboration rather than agreement:** it independently hand-mutated the `plib-cost` ternary and re-added the Ingredients row's `aria-label`, and got the same reds this batch got — an independent reproduction of the batch's own mutation results, on a different model, without the item in front of it.

It also checked one thing the batch did not: **collateral damage to test files the diff never opened** (`king-rows.test.js`, `prod-rows.test.js`), on the theory that new DOM text could corrupt an untouched assertion. It found none, and its reasoning about why `menu-margin.test.js` is immune (it slices JS source, so it sees `srLabel('cost')` rather than the expansion) is correct and was verified against that file.
