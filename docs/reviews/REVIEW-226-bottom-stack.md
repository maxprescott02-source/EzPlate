# REVIEW - 226 (the bottom stack has one owner)

Reviewed-commit: f6b64dbf2e99c1a21d125df79b4820ecaeebee30
Agent: `code-review`, Sonnet (the batch ran as Opus 5).
Given: the branch diff of `fix/bottom-chrome-toast-stack` against `main`, and NOT the queue item.

---

## Report, verbatim

All six cache-version spots agree at v186.

I've completed an adversarial review of this diff, including running the real test suite, hand-mutating both the JS and CSS to confirm the new/changed tests actually fail on broken code (not just pass coincidentally), running the full Playwright visual suite (411 passed) to check for collateral regressions, and reasoning through the CSS cascade/specificity and `position:fixed` containing-block traps this repo has specifically been burned by before.

## Summary: no defect found

This is an unusually clean diff. Specifics of what I checked and confirmed correct:

- **The core mechanism** (`js/app.js:8833-8837`, `publishClear`): `dock = getComputedStyle(banner).bottom` (already resolves `env(safe-area-inset-bottom)` and any breakpoint-specific value — 84px<1024, 24px>=1024) plus `h = getBoundingClientRect().height`, published as one `--install-banner-clear` custom property. I hand-mutated this to drop `dock` from the sum and to hardcode the old `114px` in `.bld-bar`'s rule (`css/style.css:991`) — both mutations were caught by `tests/visual/226-bottom-stack.spec.js` (12/14 and 8/14 cases failed respectively, exactly the widths where the old constant was wrong). Restored both files and confirmed no diff remained.
- **CSS specificity claims**: verified by hand that `html.has-install-banner .toast` is (0,2,1), beating the base `.toast` rule (0,1,0) and the `left`-only media overrides, and that `html.has-install-banner .bld-bar` (0,2,1) beats both the base `.bld-bar` rule and its `@media (min-width:640px)` override (both (0,1,0)) — independent of source order, as the comment claims.
- **Containing-block trap** (this repo's own documented `position:fixed` gotcha): `#installBanner`, `#bFootSum`/`.bld-bar`, and `.toast` are all body-level, and neither `body` nor `html` carries `transform`/`filter`/`contain`/`backdrop-filter`/`will-change`. `#bFootSum` sits as a sibling of `.bld-docket` (which does carry `filter:drop-shadow`), not a descendant, so it's not caught by that ancestor. No trap here.
- **`env()` double-counting**: the comment's claim that the published value already contains the safe-area inset and must not have it added again by a reader is correct — `getComputedStyle(banner).bottom` returns the fully-resolved calc(), so `.toast`/`.bld-bar`/`body` correctly just reference the variable with no extra `env()`.
- **Sequencing**: `publishClear()` is called before `classList.add('has-install-banner')` in `show()`, so no frame can be painted against the stale 114px CSS fallback — verified this is achievable since both happen synchronously in the same tick.
- **Six cache-version spots**: `index.html` (x2), `sw.js` (x3: `CACHE` + 2 `ASSETS` entries), `js/app.js` `APP_VERSION` — all consistently bumped to v186.
- **No duplicate top-level definitions, no CSS syntax corruption**: `tests/housekeeping.test.js` and `tests/css-syntax.test.js` both pass.
- **No collateral regressions**: grepped every other visual spec touching `.toast`/`#bFootSum`/install-banner — none assert numeric bottom positions that this change could disturb, and the ones that could (builder/plates/grid/menu-select specs) already `.remove()` the install banner defensively. Full visual suite: 411 passed, 0 failed.
- **Full unit suite**: 1811 passed, 0 failed.
- `docs/MAINTENANCE.md` additions honestly record two related-but-out-of-scope findings (a toast-vs-builder-bar overlap with no install banner involved, and the pre-existing unpublished `--bottomnav-h` fallback) as C-tier follow-ups rather than silently fixing or ignoring them — consistent with this repo's process.

## Minor/nit observations (not blocking)

1. **`publishClear()` throwing would silently skip the class-add** (`js/app.js:8841-8844`): since `show()` calls `publishClear()` then `classList.add(...)` in sequence with no try/catch, an exception in the new function (unlikely in practice — `getComputedStyle`/`getBoundingClientRect`/`setProperty` essentially never throw) would leave the reserve unset without the banner being marked as such. Confidence: low that this ever fires; noting it because the previous code had no such exception surface at all.
2. **`publishClear` is not (and structurally cannot be) a `tests/mutation/targets.js` entry**, since the mechanized gate only runs `node --test` and this function is pure browser DOM/ResizeObserver code. I confirmed by hand-mutation that `tests/visual/226-bottom-stack.spec.js` does catch breakage, so this isn't an actual protection gap — just a case the mechanized gate structurally can't reach, same as the pre-existing `show()`/`hide()` functions it sits beside.
3. The test's geometry bound (`gap` between 8 and 20, `tests/visual/226-bottom-stack.spec.js:111-112`) is looser than the ~12px±1 the formula should actually produce — it would catch a removed lift or a wildly wrong offset, but wouldn't catch a smaller miscalculation in that range. Not a "cannot fail" test (I demonstrated it does fail on real mutations), just generously bounded.

None of these rise to major/critical. If you want, I can also look at whether `publishClear`'s formula should be refactored into something the mechanized gate could reach, but that's a design question, not a defect in this diff.

---

## What was done about each

**No findings**, so nothing was fixed under protest and nothing was disputed. Two of the three nits were acted on; the third is recorded rather than actioned.

**Nit 1 — the unguarded publish: FIXED.** The observation is right that this diff ADDS an exception surface `show()` did not have, and the consequence is the specific one 177 fixed: a visible banner with no `has-install-banner` class is a fixed panel over the last rows of a 393-row table and over the builder's Save. `publishClear()` is now `try{ }catch(e){}`, so a throw falls back to the stylesheet's 114px — wrong on a phone, and not broken. The reason is written at the site.

**Nit 3 — the generous bound: FIXED, and the review was right that it mattered.** The bound is now derived rather than picked: `gap = ceil(x) - x + 12` for `x = dock + h`, so it lies in `[12, 13)` at every width and in every state, with the banner's height (which is TEXT, and therefore differs on the font-less Linux CI runner) cancelling on both sides of the subtraction. Measured 12.5 everywhere except 768/no-hint, which is 12. Tightened to `>= 12` and `< 13`, and the derivation is written at the assertion.
**Proved rather than argued:** halving the lift to `+ 6px` — a miscalculation the old 8..20 bound would have PASSED — now fails 12 of the 14 tests. That is the review's point demonstrated, not accepted on trust.

**Nit 2 — not a mutation target: RECORDED, no change.** The reasoning is correct and there is nothing to do: `tests/mutation/run.js` drives `node --test`, and `publishClear` is browser DOM plus a `ResizeObserver`. Adding it to `tests/mutation/targets.js` would put an entry in that file that the gate cannot exercise, which is worse than the absence — a target nobody has asked the question of, that LOOKS asked. The Playwright spec is the protection, and the review confirmed by hand-mutation that it holds.
The offered refactor is declined for this batch: reshaping a DOM measurement into something `node --test` can reach means either a fake DOM (roster 195: a fake DOM that collapses two steps the real one keeps apart) or extracting arithmetic so thin the test would pin nothing. Not filed either — it is a design question with no defect behind it, and this repo does not queue those.

**One thing the review did NOT flag, worth saying because a silence is not a verdict:** it did not look at whether the mobile reserve going 114 -> 171 is a layout change on every screen. It is, while the banner is up. That was checked by the batch instead — full Playwright is green and the screenshots at 380/1280 x light/dark were looked at — and it is stated in the handover as the one consequence a reader should know about.
