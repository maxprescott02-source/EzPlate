# REVIEW-283 — one food-cost %, one precision

Reviewed-commit: de78375
Agent: `code-review`, run on **Sonnet**. The batch itself ran on Opus, so the reviewer was overridden off its pinned `opus` per `CLAUDE.md`'s "a model reviewing its own work is not a second reader".
Brief: not shown to the agent. It was given the branch diff and the areas to attack, nothing about the queue item's reasoning.

---

## The report, verbatim

> ## Review: `batch-283-percent-precision` vs `main` (7cb6e93 / de78375)
>
> I read the full diff (`git diff main...HEAD`), the two new functions and every call site, the `analyze()`/`menuMarginPreview()`/`vbadge` chain, all touched tests, `tests/mutation/targets.js`, and the docs changes (`QUEUE.md`, `MAINTENANCE.md`, `QUEUE-GROUPS.md`, `QUEUE-2026-09-08-CONSOLIDATED.md`, `STATE.json`). `npm test` is green (2441/2441). I started `npm run mutate` but killed it partway through given time budget — see caveat below.
>
> ### What I checked and found correct
>
> - **`foodCostPct`/`fmtFoodPct` (`js/app.js:3741-3742`)** — `foodCostPct` returns `null` unless both `cost>0 && price>0` (matches old inline guard exactly, `0` is not falsely treated as valid, negative values correctly rejected). `fmtFoodPct` is a bare `v.toFixed(1)`.
> - **Every one of the six print sites is guarded against `null`/`undefined` before calling `fmtFoodPct`** — I traced all of them: `js/app.js:2584` (builder per-menu list, guarded by `mp.pct==null` ternary), `:2598` (header pill, guarded by `w.mp.pct!=null`), `:2639` (sticky bar, guarded by `worst.mp.pct==null` ternary), `:4258` (`vbadge`, only reached when `a.cost>0 && a.menuPrice>0`, which makes `foodCostPct` non-null by construction), `:12475` (publish dialog, guarded by `mp.pct==null` early return), `:15790` (edit modal, same guard). No path hands `fmtFoodPct` a null/undefined/NaN today.
> - **`analyze().absPct` has no surviving reader.** Grepped the whole repo — the only hits left are the explanatory comment and the two tests, both of which were rewritten to pin the underlying condition (`recommended`/`suggested` for the negative-price guard, exact shortfall arithmetic for the 15% boundary) rather than the dead field. The second commit (`de78375`) also caught and fixed a residual `absPct:null` that survived in `analyze`'s early `nomenu` return — a real self-caught bug, fixed before push.
> - **The "at least three quantities" confusion in the original queue item is correctly resolved**: one computation (`foodCostPct`) now feeds all six per-dish surfaces at one decimal; `avgFoodCostForScope` (mean-of-ratios) is untouched, as required by `app-data.md`'s "arithmetic across two series" warning; the three whole-number "fourth register" sites (`insDrift`, `insVolatility`, `insCategory`) are deliberately left alone with a reasoned, dated `MAINTENANCE.md` entry explaining why (AI-fact-contract stability + different rhetorical register) — I confirmed those three sites still do their own `Math.round`, matching the doc's claim.
> - **Six cache-version spots agree at v230** (`index.html` x2, `sw.js` `CACHE` + `ASSETS` line, `js/app.js` `APP_VERSION`) — verified by grep, no stragglers on v229.
> - **No duplicate top-level declarations** — `foodCostPct`/`fmtFoodPct` each defined exactly once; suite includes `housekeeping.test.js` and it's green.
> - **Parser-region anchors untouched** — `var INV_EXCLUDE=` (line 12999) and `function unitLabelFor(` (line 13464) are unchanged strings; all new/changed functions sit outside that span.
> - **Tests pin the condition, not the structure**: the new `menu-margin.test.js` tests use real dish numbers (`3.88`/`11.97`), assert the unrounded `pct` survives past the source (`Math.abs(pct - 32.414369) < 1e-5`, verified this arithmetic independently in node), assert the one-decimal boundary explicitly (`'30.0'` not `'30'`), and assert cross-surface agreement between `vbadge` and `menuMarginPreview` rather than merely that a function was called. `tests/mutation/targets.js` adds both new functions as explicit mutation targets with real test coverage, and the comment there correctly explains why they can't just inherit `menuMarginPreview`'s coverage (extracted arithmetic would otherwise silently lose gate coverage).
> - **Docs are internally consistent**: `QUEUE.md` item 99 is fully struck (not just relabeled), `MAINTENANCE.md` has two new entries dated and reasoned, `QUEUE-GROUPS.md` and the consolidated backlog both strike item 99 with the shipped version number, `STATE.json` is rewritten (`batch: 282`→ still 282, `deploy_version: 230`, `open_ab_count: 12`) in the same commit as the doc edits — batch number itself presumably updates at handover, consistent with prior-batch precedent I checked (`0ecccd4`).
>
> ### Minor finding
>
> **`fmtFoodPct` has no internal guard of its own** (`js/app.js:3742`, `function fmtFoodPct(v){ return v.toFixed(1); }`) — it relies entirely on every call site having already excluded `null`/`undefined`/NaN, which is true today at all six sites (verified above) but is not enforced by the function itself. A future seventh call site that forgets the `==null` check (easy to miss — `menuMarginPreview`'s own doc comment even warns callers must not pre-round, but says nothing about must-not-pass-null) would throw a `TypeError` at render time rather than degrading gracefully. This is the same "declaration is not enforcement" shape `.claude/rules/app-guards.md` names repeatedly for other constructs in this codebase. Not a bug today — a fragility to note.
>
> ### Caveat
>
> I did not let `npm run mutate` finish (killed it after ~2 min of a run that typically takes several minutes, to stay within budget) — I did not see it report survivors for `foodCostPct`/`fmtFoodPct`, but I'm relying on the tests I hand-verified (which do exercise the exact conditions: null-guard, boundary, raw-ratio, cross-surface agreement) rather than a completed gate run. If the hook enforces this before push, it will catch anything I missed; flagging the gap rather than asserting a mutation-clean result I didn't observe.
>
> No wrong conditions, no writes that don't land, no sequencing defects, no silent failures, and no tests that can't fail were found in this diff.

---

## Decisions

### Minor finding — `fmtFoodPct` has no internal guard — **CONSIDERED AND DECLINED, deliberately**

The finding is **factually correct**: `fmtFoodPct(null)` throws, and nothing in the function stops a seventh caller passing one.
I ran its own repro (`node -e` on the extracted function) and it does throw `TypeError: Cannot read properties of null`.

**It is not being fixed, and the reason is this repo's own rule rather than a judgement about likelihood.**

A guard here would have to choose what to return for a null, and **every available answer is worse than the throw**:

- `return ''` — the caller then concatenates an empty string into `'<b>'+…+'% food cost</b>'` and the app renders **"% food cost"** with no number. A figure silently missing from a costing surface is precisely the failure `CLAUDE.md`'s money law exists to prevent.
- `return '0.0'` — fabricates a figure. Strictly forbidden: *"a plate with no price has no food cost, and a pill reading 0% would be a figure the app invented"* is already written at `#bldPill`'s own site.
- `return '—'` — invents a fifth rendering of absence, each of the six surfaces already having its own correct one (the pill HIDES, the publish dialog clears, the Menu row prints `.muted-dash`, the edit modal prints "not costed"). A shared formatter cannot know which is right for its caller.

**A `TypeError` at render is the LOUD failure, and the alternatives are all quiet ones.** The reviewer's own citation argues this direction when followed through: `.claude/rules/app-guards.md`'s "fail open" section says a fail-open default is *"a decision about CONSEQUENCE, not about epistemics"*, and the consequence of guessing here is a wrong or absent number on a pricing screen.

**What the finding is right about is that the requirement was undocumented**, which is the actionable half. `fmtFoodPct`'s comment block now states that callers own the null check, names why the function deliberately does not, and says which of the six absence renderings belongs to which surface — so a seventh caller is told what it owes before it writes the bug rather than after.

### Caveat — mutation gate not observed by the reviewer — **RESOLVED**

The reviewer killed `npm run mutate` for budget and correctly refused to claim a clean result it had not seen.
**The batch ran it to completion twice**: before the `absPct` residual fix (`1498 mutants, 1443 killed, 55 survived, all 55 with a written allowance`, exit 0) and again after it (exit 0). `foodCostPct` and `fmtFoodPct` were targets on both runs and produced no survivors.
