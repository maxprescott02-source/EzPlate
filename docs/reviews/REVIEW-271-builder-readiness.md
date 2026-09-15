# REVIEW - 271 (builder readiness and copy)

Reviewed-commit: 1a24091a7b8e895eecf9eb679360c87aae935e4f

**Agent:** the pre-push `code-review` agent, run on **Sonnet**.
The definition pins `opus` and this batch ran on Opus, so the reviewer was overridden for this run per `CLAUDE.md`'s rule that a model may not review its own work.
It was given the branch diff, the suite's state, and the six areas to attack.
It was NOT given the queue item, the plan, the premise-check report or the handover draft.

The report is pasted verbatim below.
Two nits, no defect.
What I did about each is under it.

---

## The report

## Review summary

I read the full diff (`js/app.js`, `css/style.css`, `index.html`, `sw.js`, and the test changes) and specifically chased each of the six flagged risk areas end to end, including every caller of the mutated code paths.

**Disabled-state sync (`syncBuilderPlateActions` / `builderSaveBlocker`).** Traced every place `plate` or the name field can change: `addKitchenLine`, `removeLine`, `setMiscCost`, the `#plateName` input listener, `loadPlateState`, `startNewPlate`, `duplicateCurrentPlate`, and `clearBtn`'s handler. All of them funnel through `renderPlate()` or `updateTotals()`, and `updateTotals()` (`js/app.js:2397-2413`) now calls `syncBuilderPlateActions()` before `renderBuilderCost(tot)` unconditionally, on both the empty-plate early return and the populated path. No path mutates `plate.length` or the name without eventually reaching one of these. `applyRoleUi()` (`js/app.js:1364`) calls `syncBuilderPlateActions()` alone, without `renderBuilderCost`, but role changes don't affect the two blocker conditions, so this can't produce a stale `#bFootLine`.

**The two sinks (`#saveHint` vs `#bFootLine`).** Both call `builderSaveBlocker(plate.length>0, builderPlateName()!=='')` independently, but always synchronously back-to-back with no intervening state mutation (JS is single-threaded, no `await` between the two calls in every reachable path I found), so they cannot observably disagree.

**`addKitchenLine`'s duplicate guard and its callers.** Both add paths (`pickListItem`'s Enter, and the dropdown's `mousedown` handler at `js/app.js:2192-2193`) call `addKitchenLine` directly, so the guard applies uniformly. It correctly keys off `l.kid`, so a legacy `{pid}` line for the same product does not falsely block adding the kitchen ingredient (confirmed against the test at `tests/builder-readiness.test.js:251-259`). The create-from-builder call site (`js/app.js:6540`) adds a brand-new id that can't already be on the plate.

**`.is-bare` CSS at both sides of the breakpoint.** `#bCost.is-bare .bld-cardbody{display:none}` lives inside the same `@media (max-width:767px)` block as the `.bld-kv` hide it depends on, with specificity (id+class+class) that beats the base `.bld-cardbody{display:flex}` rule regardless of source order — no source-order-vs-specificity trap. Verified `#bCost`'s two `.bld-cardbody` divs are structurally distinct (the one hidden by `is-bare` holds only `bld-kv`/`bPriceRow`/`bWarn`/`bMenus`; Print/Clear live in a sibling `.bld-sumacts`, so they are never accidentally hidden). Above 768px the hide rule doesn't apply, matching intent.

**The `#bFootLine` click/keydown listener.** Wired once, reads live state on each interaction (not a stale closure), correctly no-ops when not blocked, and `role`/`tabindex` are added/removed in step with whether the element is currently a control.

**Tests.** The new `tests/builder-readiness.test.js` extracts and runs the real functions (not stubs), exercises both blocker branches with fixtures where the two conditions actually differ, and the duplicate-line tests distinguish "guard removed" from "guard over-fires" (would catch either an `&&`→`||`-style or an always-true/always-false mutation). The rewritten Playwright spec (`v150-builder-order.spec.js`) measures real disabled state, real text, real viewport geometry, and real focus after a click — not a proxy.

No critical or major defect found in any of the six flagged areas, despite deliberately adversarial tracing of every caller.

**Minor / nit, low stakes:**
- `tests/builder-readiness.test.js:263-274` ("one owner" census) checks for a second `disabled=` assignment with a same-line regex (`getElementById('id')[^;\n]*disabled\s*=`). It wouldn't catch a future duplicate writer that stores the element in a variable first and sets `.disabled` on a later line/statement. Not a defect in the shipped code today (verified only one writer exists), just a heuristic that could give false confidence later — same shape as the roster's "proximity heuristic" class in `.claude/rules/tests.md`, though narrower in consequence than those instances since it can only produce a false negative on a *future* regression, not hide a current one.
- `js/app.js:3666-3675`: the `#plateName` input listener now calls `updateTotals()` on every keystroke (previously `scheduleDraftSave()` only), which cascades into a full `renderBuilderCost` repaint each keystroke, including rebuilding `#bPriceRow`'s `<input>` and reattaching its blur/keydown listeners. This mirrors an existing pattern already accepted for qty edits, so it's not new risk, just added frequency — a performance nit, not a correctness issue.

Files most relevant to this review: `js/app.js` (lines 2218-2231, 2397-2413, 2472-2644, 3666-3675, 11204-11216, 11563-11625), `css/style.css` (lines ~641-648, 954-975, 1015-1024), `index.html` (lines 428-480), `tests/builder-readiness.test.js`, `tests/visual/v150-builder-order.spec.js`, `tests/visual/213-layer-stacking.spec.js`.

---

## What I did about each

**Nit 1, the census heuristic — TAKEN, and it was right.**
The same-line regex would have missed the second writer written the way anyone would actually write one, which is the way the owner itself is written: bind the element to a variable, set `.disabled` later.
The census now runs two checks: the same-line direct write, and a BINDING check that finds any `var/let/const X = document.getElementById('<id>')` outside the owner by name and forbids `X.disabled =` anywhere outside it.
Both quote styles, because the first cut only matched single quotes and a hand-injected double-quoted writer walked past it - found by running the mutation rather than by reading.
**Proven both ways:** appending a real second writer to `js/app.js` turns it red, and removing it turns it green; a self-test asserts the binding pattern actually finds an injected variable, so a regex that matches nothing cannot read as a clean file.
The limit is now stated at the site rather than implied: neither check sees an element reached through a collection, a `querySelector`, or a variable assigned in two steps.

**Nit 2, the keystroke cascade — CONSIDERED AND DECLINED, with the reason.**
Keeping `updateTotals()` in the name listener is deliberate: the blocker's phone sink is `#bFootLine`, whose one writer is `renderBuilderCost`, and `updateTotals` is what calls it with a cost.
The alternative - the listener writing `#bFootLine` itself - is the two-writers-one-element shape this batch spent its design on avoiding, and the order between them would be the bug.
**The correctness question the nit does not ask, checked rather than assumed:** rebuilding `#bPriceRow` discards whatever is typed in `#bPrice`, so could a name keystroke eat an uncommitted menu price? No - reaching `#plateName` blurs `#bPrice` first, and that blur commits, so the value is already stored before any name keystroke can fire.
What is left is frequency, on a page whose qty fields already pay the same cost on every keystroke, for one user on one phone with plates of under twenty lines.

## The other loop, closed here because a review is not the only gate

Full `npm run mutate` on the reviewed commit: **1436 mutants, 1382 killed, 54 survived all with written allowances, 3 killed by timeout, exit 0.**
Re-run after the nit-1 fix, scoped to this batch's three targets: **22 mutants, 22 killed, 0 survived.**
Full Playwright: **480 passed, 14 skipped.**
`npm test`: 2350, with the four `docs/STATE.json` failures that `node tools/state.js` clears in the handover commit - which is the mechanism working, not a red suite.
