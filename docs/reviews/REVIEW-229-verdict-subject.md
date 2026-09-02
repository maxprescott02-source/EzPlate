# REVIEW - 229 (the amber verdict says what it is judging)

Reviewed-commit: 28463775400bc2c28369f4528a7c504d11ac7d27
Agent: `code-review`, Sonnet (the batch ran as Opus 5).
Given: the branch diff of `fix/verdict-subject` against `main`, and NOT the queue item.
⚠️ It was first pointed at the WRONG BRANCH — `chore/audit-v186` — because this batch's commits had been made on local `main` by mistake. Corrected mid-run by message; the agent re-ran against the right diff and its report below is of that.

---

## Report, verbatim

## Review: `fix/verdict-subject` vs `main`

Scope confirmed via `git diff main...HEAD --stat`: `docs/QUEUE.md`, `docs/decisions/2026-09-02.html`, `index.html`, `js/app.js`, `sw.js`, `tests/mutation/targets.js`, `tests/verdict-subject.test.js`.

### Finding 1 — Major. The decision document's headline contrast numbers are measured against the wrong CSS token, and materially overstate the dark-mode margin

`docs/QUEUE.md:88-89` and `docs/decisions/2026-09-02.html` (Question 1) both claim the failing background for `.flag-review.pt-explain` text is **`--danger-bg`** ("It fails only where it is painted on a TINT, 4.17 / 4.32 on `--danger-bg`"), and the artifact's rendered "before"/"after" specimens (`.row{background:var(--danger-bg)}`) paint the exact copy from that class on `--danger-bg`.

That's not the surface this text is ever painted on. Both real call sites of `.flag-review.pt-explain` (`js/app.js:11261`, `:11272`) render only when `r.needManual` or a re-base condition is true, both of which make `invRowState(r)` return `'review'` (`js/app.js:11123-11134`). The row's class is `'st-'+invRowState(r)` (`js/app.js:11319`), and the only CSS rule tinting that state is `.invtable tbody tr.inv-data.st-review{background:var(--warn-bg);...}` (`css/style.css:3106-3107`). There is no path that puts this text on `--danger-bg`.

I recomputed WCAG contrast from the actual tokens (`css/style.css:89-105,128-129`):
- `--text-3` (old, `#7D7060`) on the real background `--warn-bg` (`#FDF3E0` light / `#312C24` dark): **4.38 / 4.19** — not the claimed 4.17/4.32.
- Proposed new `--text-3` (`#776B5C` / `#96938F`) on the real `--warn-bg`: **4.72 / 4.53** — not the claimed/rendered 4.50/4.66.

The dark-mode "after" figure the artifact shows Max is **4.66**, computed against `--danger-bg-dark`; the real background it will actually paint on gives **4.53** — a margin of only 0.03 over the 4.5 floor, not the "clears AA comfortably" framing implies. It does still pass, so the recommended remedy isn't wrong, but the number driving Max's decision is for a background this element never renders on, and materially understates how thin the dark-mode margin actually is.

QUEUE.md's own text is internally inconsistent on this: it states the failure was measured "on `--danger-bg`" in one sentence, then says two sentences later "Values solved against the worst case, which is `--warn-bg`, not `--danger-bg`" — i.e. the author used one token to state the headline figures shown to Max and a different token to actually solve the fix, without reconciling the two, and without either number matching the real background computed against the real token.

**Confidence:** high on the mechanism (verified against the live CSS/JS, computed the actual ratios, and match the doc's numbers exactly to `--danger-bg` and not to `--warn-bg`). The remedy itself (the recommended hex shift) still clears the real floor, so this isn't wrong data driving a wrong recommendation — but it's a decision document whose own quoted measurement contradicts the code, exactly the class of finding this review was asked to check for.

**How to verify:** compute WCAG contrast for `#7D7060`/`#776B5C` (light) and `#908D89`/`#96938F` (dark) against `#FDF3E0`/`#312C24` (`--warn-bg`) vs `#FBEBEA`/`#332826` (`--danger-bg`); compare to the figures in `docs/decisions/2026-09-02.html` and `docs/QUEUE.md:88-89`. Also trace `js/app.js:11261,11272` → `invRowState` → the `st-review` CSS rule at `css/style.css:3106` to confirm the real background.

### Finding 2 — Minor. `docs/MAINTENANCE.md:559` is now stale and wasn't updated by this batch

`docs/MAINTENANCE.md:559` still reads: *"The only residual is **'Slightly under' is the one verdict phrase that does not carry its own subject**, above in this file"* — describing it as outstanding. This batch fixed exactly that residual (`js/app.js`'s `marginLightWord`) and deleted the corresponding `docs/QUEUE.md` item 9, but `docs/MAINTENANCE.md` wasn't touched. Per this repo's own stated rule ("a stale fact is worse than no fact, because it gets trusted"), this line should have been struck or updated in the same batch. Low severity — it's a docs/handover process file, not app code, and it isn't gated by any test.

**Confidence:** high that the text is stale; this is a docs-hygiene gap rather than a functional defect.

### Everything else checked, no issues found

- `marginLightWord` (`js/app.js:9789`): mutated it two ways (reverting the amber string to the old subjectless "Slightly under"; making the empty-string fallback branch return a non-empty word) — both mutations were caught by `tests/verdict-subject.test.js`, confirmed by copying the file, diffing to prove the mutation landed, then restoring from the copy. The test is not vacuous.
- `tests/verdict-subject.test.js` uses the shared, guarded `extractFn`/`loadApp` helpers from `tests/_extractfn.js` rather than a hand-rolled stub — extracts and runs the real function, consistent with this repo's "extract the real function" rule.
- `tests/mutation/targets.js` addition is well-formed and the referenced test file exists and passes.
- All six cache-version spots agree (`sw.js` CACHE + 2 `?v=` stamps, `index.html` 2 `?v=` stamps, `js/app.js` `APP_VERSION`), and `tests/settings.test.js`'s mechanized mirror/stamp checks pass.
- `docs/QUEUE.md`'s numeric claims for Questions 2 and 3 of the decision doc (switch track/knob contrast 1.36, destructive button border 1.40, label 5.43, proposed border 3.03) were independently recomputed from the real tokens and match exactly.
- No forbidden object nouns ("recipe", "dish", "kitchen word") introduced in any changed file.
- `index.html`/`js/app.js` comment edits are consistent with the code change and don't reopen the vocabulary-split decision they reference.

**Follow-up message, after the background mutation gate finished:** 977 mutants, 948 killed, 29 survived with a written allowance, 2 killed by timeout, 0 unexplained survivors. No change to the findings.

---

## What was done about each

### Finding 1 — DECLINED, on measurement rather than on argument

**The finding is wrong, and the way it is wrong is worth more than the verdict.**

It traced the element to its ROW — `st-review`, `background:var(--warn-bg)` — and every recomputed figure follows correctly from that premise. The premise is false: **`.flag-review` sets `background:var(--bad-bg)` and `.flag-review.pt-explain` overrides only `color`, `font-weight` and `margin-top`.** So the explain line paints `--danger-bg` ON TOP of the row's tint, and the row's `--warn-bg` is behind it, not under the text.

**Measured in a real table, 2 Sep 2026, rather than read off the stylesheet** — the same walk `tests/visual/200-pack-unit.spec.js` does, which takes the first opaque background above the text:

| | fg | first opaque bg | from | ratio |
|---|---|---|---|---|
| light | `rgb(125,112,96)` | `rgb(251,235,234)` = `--danger-bg` | `flag-review pt-explain` | **4.17** |
| dark | `rgb(144,141,137)` | `rgb(51,40,38)` = `--danger-bg` | `flag-review pt-explain` | **4.32** |

The row's background in the same render is `rgb(253,243,224)` / `rgb(49,44,36)` — `--warn-bg`, exactly as the finding says, and **not the surface the text sits on**.

So the decision document's figures were already right, and **applying the remedy would have put wrong numbers in front of Max on a decision he has not answered yet.** That is batch 223's rule arriving on the other side: *run the finding's own repro, and its FIX, before you apply it — a review is not exempt from being measured.*

**Pinned rather than merely declined**, because the next reader can re-derive the same wrong answer from the same stylesheet. `tests/visual/200-pack-unit.spec.js` now says why it walks to the first opaque background instead of naming a token: two nested backgrounds is precisely what a palette-level calculation gets wrong, and in DARK the row is the WORSE of the two surfaces, so the two readings do not even fail in the same direction.

**The one thing it was right about is fixed.** `docs/QUEUE.md` said the values were solved against *"the worst case, which is `--warn-bg`, not `--danger-bg`"*. That is true only in dark, and it read as contradicting the headline figures two sentences above. It now names every surface `--text-3` is painted on and which one binds in each theme — light `--danger-bg` at 4.50, dark `--warn-bg` at 4.53.

### Finding 2 — FIXED

Correct, and the sharper point is that the stale line survived the batch that falsified it. `docs/MAINTENANCE.md` is struck with the closure and the reason, rather than deleted, so the record shows the residual was tracked and answered.

### Process note recorded here because it belongs in the audit trail

The review was first pointed at `chore/audit-v186`, because **this batch's commits were made on local `main` by mistake** rather than on a branch. Nothing had been pushed, `main` was reset to `origin/main`, and the work moved to `fix/verdict-subject`; the agent was corrected mid-run and re-reviewed the right diff. Recorded because a recovery that leaves no trace is indistinguishable from the mistake never happening.
