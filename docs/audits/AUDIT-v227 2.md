# AUDIT-v227

**Audit at `ezplate-v227`, 16 September 2026.** Previous audit `AUDIT-v217`, ten merges ago — the gap that `skills/batch` step 10 queues on.
Window: batches ~268-278. Run by the `project-audit` agent, read-only; filed by batch 279, which made the decisions in the Recommendations section below.

## Verdict

**The project is healthy.** `npm test` is 2409/2409, all six version spots agree at `v227`, every load-bearing invariant checked holds, branch protection matches what `CLAUDE.md` claims (verified against the GitHub API rather than a document), and `docs/STATE.json` re-derives byte-identically.
Batches 275-278 each found their own queue item materially wrong and said so in the handover rather than working around it.

**The headline finding: `docs/QUEUE-2026-09-08-CONSOLIDATED.md` is drifting from the code faster than it is being worked.** Eight unrun items sampled; **every line citation checked was wrong, 6 of 6**, and two items carried an error beyond position — item 68 names `renderIngRows`, which exists nowhere in `js/app.js`, and item 76's first bullet (`edDelArmed`) was deleted by batch 272 and never struck. That is on top of what 277 and 278 already reported.

## 1. Invariants — all clean

- **Parser anchors** both present: `var INV_EXCLUDE=` at `js/app.js:12760`, `function unitLabelFor(` at `:13225`; `tests/_extract.js:23` slices between exactly those literals.
- **No twice-defined top-level name.** `tests/housekeeping.test.js:208` asserts absence, and `:222` proves the guard goes red against injected source for all four declaration keywords.
- **Naming inversion holds.** `data-tab="pantry"` → "Ingredients", `"ingredients"` → "Products", `"builder"` → "Plates". `tests/terminology.test.js` carries exactly three inversion guards.
- **Six version spots** agree at 227.
- **Protected functions** present and unrenamed: `resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory`, `packToUnitCost`.

## 2. Documented claims that are false

Ranked by consequence. Each verified against the code.

**a. `tests/third-party-pins.test.js` is NOT the authority on the Playwright version, and two `docs/MAINTENANCE.md` entries say it is.** `grep -ci playwright tests/third-party-pins.test.js` returns **0**; that file scopes itself to the two scripts that ship to production. Playwright is a devDependency at `^1.62.1` — **a caret, not an exact pin** — held still only by `package-lock.json`. The next batch to hit a segfault is directed at a file that will tell it nothing.

**b. `analyze().absPct` has no reader in the app, and queue item 99 is built on it having one.** `absPct` appears at `js/app.js:3703`, `:3705`, `:3710` and nowhere else; the only other hits are in `tests/menu-margin.test.js`. `docs/MAINTENANCE.md:580` and consolidated item 76 both already say it lost its last reader in v122. Item 99 — written a week ago, currently `next` — sends a batch looking for a third printed percentage that does not exist.

**c. `menusList` has FOUR writers, not three.** `CLAUDE.md` and `.claude/rules/app-data.md` both say *"Three writers… If you add a fourth, this is what it owes."* The fourth is `rollbackMenuDelete` (declared `js/app.js:15146`; its `menusList` write is the `splice` at `:15156`), added by batch 254. **The invariant is not violated** — it restores a menu the server still holds — but the count is the exact "exactly N" form both files tell you to grep rather than believe.

**d. `cafeCost_env` is a third localStorage category and `CLAUDE.md` says there is no third category.** `ENV_STAMP_KEY` at `js/app.js:43`, survived by name in `purgeLocalState`'s keep-list. Not a view preference, not a derived cache, not the plate draft. Known — consolidated item 78, `docs/MAINTENANCE.md:1134` — and unfixed.

**e. Two `docs/MAINTENANCE.md` entries are done-but-unstruck.** `:539` (`doDeleteMenu`'s unawaited dish deletes) was fixed in batch **254** and has read as outstanding for ~24 batches; `:577` (`edDelArmed`) was deleted by batch **272**. This is the second and third instance of the class batch 275 found.

**f. `docs/MAINTENANCE.md:688` enumerates the in-repo skills wrongly, in a file whose subject is enumeration drift.** `.claude/skills/` is gitignored and holds symlinks; the tracked directory is `skills/` and holds five, not seven. A clone gets five.

**g. Line citations, 6 of 6 sampled, stale.** Item 62 `renderPlatesTab` 9530 → **11670** · item 63 `index.html:1751` → **1966** · item 68 `4638` → symbol gone · item 69 `js/app.js:419-423` → wrong region · item 70 `rerenderCurrentTab` 3490 → **4267** · item 78 `js/app.js:701-704` → real site **2164**. Item 78's whole job is recording corrections that were never propagated, and its own citation has drifted 1,460 lines.

**Checked and TRUE:** branch protection (`enforce_admins: true`, contexts exactly `["unit tests","smoke (jsdom)"]`) · all seven rule files carry matching `paths:` frontmatter · CLAUDE.md is 179 lines against an enforced 200 · 393 products in the fixture · 58 files name the distributor · `.mcp.json` staging-only · no `code-review.yml` · thirteen storage keys plus one prose hit · **nothing reads the `CX`/`IMP` id prefixes** (both write-only) · `TAB_PANES` holds nine · item 75's dead-CSS claim is 7 for 7 · the tests roster says 24 and has 24 bullets.

**Assumed, not verified:** two of the three data-table foreign keys. Only `menu_items.plate_id → plates.id` is defined in a migration; the other two predate the migration files and **no Supabase MCP was available in this session**. Batch 254 verified all three against production on 9 Sep.

## 3. Dead traps — none found

Three `CLAUDE.md` entries were tested hardest and all three keep their subject: the **naming inversion** (three tests enforce it), the **no-second-reader decision** (a decision, not code — it exists to stop the proposal returning), and **`addProduct` deliberately kept** (Playwright is outside `npm test`, so deleting it fails silently).

⚠️ **The one genuine removal candidate is in the `project-audit` agent's own standing checklist, which lives outside the repo where nothing can review it.** Four of its six standing "dropped thread" candidates are settled and cost budget every audit: the `manager` role (a recorded decision, with the reversal written beside it), JSON restore (shipped; only the full-wipe rehearsal remains, correctly blocked), bulk catalogue bootstrap (shipped), and the staging environment (shipped; only the test *account* remains, item 27).

## 4. Recurring symptoms

**a. NEW and active — "measured at one width and generalised". Three consecutive batches, each after the previous wrote the lesson down.** 274's media query was pinned one pixel past a locally-measured wrap point that depends on the **scrollbar**; 275's item measured one width and the overlap was at four; 278 shipped a `<select>` crushed to **48px at 768** after screenshotting 1280 and 380.
**The root cause is not found and the mechanism that would find it exists.** 274 concluded *"a viewport-geometry ASSERTION must measure its reference — the same is true of a RULE, and unlike a test, a wrong breakpoint ships."* **That sentence is in a write-once handover and in no rule file.**

**b. Stale enumerations — nine consecutive batches** (270, 271, 272, 273, 274, 277, 278 and two more). `docs/QUEUE.md`'s header records seven of eleven; this window is nine of nine.

**c. The three long-standing candidates:** pack-size persistence **dormant** since the parser rewrite (`ezplate-v211`) and a real corpus net · invoice flag-pill alignment **dormant** since v104 · **menu/empty-state centring still unaddressed**, four fixes with no root cause named, and `tests/empty-states.test.js` postdates all four so it pins the current state rather than the thing that kept breaking.

**d. The mutation-gate sandbox belief (267, 268) is CLOSED.** The correction landed in `.claude/rules/tests.md` and no batch in 269-278 repeated it. Worth saying because it is the one recurring symptom in this window that the record actually fixed.

## 5. Test drift

1. **`tests/visual/screenshots.spec.js` has not run since v162 — 65 deploy versions.** Excluded from CI by name, correctly and fails-closed; its 14 tests are blocked on consolidated item 27, a staging test account. **Named as the top test-drift finding in four consecutive audits.** It needs Max, not a batch.
2. All 66 Playwright specs sit outside `npm test` and outside the pre-push hook. Three went red in 278 for reasons unrelated to that branch; one was found only because the exit-code fix landed the same session.
3. **`v190-sticky-header.spec.js` is reliably red on macOS and green in CI.** Its real cost is training local Playwright red to read as noise — the exact condition that let 278's four false greens pass.
4. `updateLastImport` writes to three element ids and only two exist; the test pins the id LIST, so it stays green if all three die.
5. **No unexplained drop in test count**, and no live document quotes a stale figure — the two that carry numbers label them as dated measurements, which is the right pattern.
6. **Mutation gate in good order**: 160 targets, every 275-278 addition landed, every allowance carries a reason and several name the condition under which they must be deleted.

## 6. Dropped threads that reached neither file

1. **The `project-audit` and `flow-tester` agent definitions are outside the repo**, while `.claude/agents/` is now tracked and holds three others. The mechanism to fix it exists and the move was not made.
2. **Three EzPlate-specific skills outside the repo** — `new-branch`, `investigate`, `test-flows`. A clone can run `/batch` and cannot run `/new-branch`. Consolidated item 83, blocked.
3. **274's "a wrong breakpoint ships" lesson** — proposed nowhere.
4. **278's pipeline/exit-code rule landed at an address the person who needs it may not visit.** It is in `.claude/rules/tests.md`, which loads on a **read** of `tests/**`; `skills/verify/SKILL.md` §4 — the file a batch opens to learn how to run Playwright — does not mention it, though it already carries two siblings of the same shape.
5. **Nothing else in the repo reads a test or gate result through a pipe.** Checked every `run:` step in the workflow, the pre-push hook, `tools/`, `skills/`, `.claude/`. The one pipe in CI feeds a path classifier and sets `pipefail`. **Clean** — the exposure is an interactive agent typing one by hand.
6. `docs/MAINTENANCE.md:1142` — *"FOR MAX: `AGENTS.md` forbids commit co-authorship and every commit does it anyway"* — still open, still addressed to Max.
7. `docs/PHONE.md` holds a check its own header forbids, under a heading admitting it is not a phone check, now waiting six weeks.

## Recommendations

Every item carries the decision batch 279 made about it.

1. **Write 274's breakpoint lesson into `.claude/rules/css.md`.** Three consecutive batches made the same mistake, each after the previous recorded it, and the sentence lives only in a write-once handover. This is the highest-value finding in the audit because it is the only recurring symptom here with a known root cause and no rule. **done:** added as "A BREAKPOINT IS A MEASUREMENT AND A WRONG ONE SHIPS", with all three instances and the scrollbar case.
2. **Correct the two `docs/MAINTENANCE.md` entries that name `tests/third-party-pins.test.js` as the Playwright authority.** It has never covered Playwright; the version is a caret in `package.json`. **done:** both entries corrected to name `package.json` and `package-lock.json`, with the caret called out.
3. **Rewrite queue item 99, whose premise is short by one.** `analyze().absPct` has no reader. **done:** the item now names two printed quantities and one dead field, and keeps its correct warning against aligning `avgFoodCostForScope` with `mp.pct`.
4. **Correct the "three writers" count for `menusList` in `CLAUDE.md` and `.claude/rules/app-data.md`.** **done:** both say four and name `rollbackMenuDelete`, with the note that it restores rather than invents.
5. **Strike the two done-but-unstruck `docs/MAINTENANCE.md` entries** (`doDeleteMenu`, fixed batch 254; `edDelArmed`, deleted batch 272). **done:** both struck with the batch that fixed them.
6. **Correct `docs/MAINTENANCE.md:688`'s skills enumeration.** **done:** it now says five tracked skills in `skills/`, and that `.claude/skills/` is gitignored symlinks.
7. **Point `skills/verify` at the pipeline exit-code trap.** The rule exists at an address a batch about to run Playwright may not read. **done:** §4 now carries it beside its two existing siblings.
8. **Move `docs/PHONE.md`'s non-phone check out**, per that file's own entry test. **done:** moved to `docs/MAINTENANCE.md`; PHONE.md is back to five checks.
9. **Do NOT promote consolidated item 94 (the bulk citation sweep) into the working set.** **declined:** its own text names the per-batch premise-checker as its complement, and **that checker has since shipped** and is catching these at the point of use — nine of nine batches in this window. The bulk sweep was written when nothing caught them; the remaining cost is one agent run per batch, which is bounded and cheap. 94's text is updated to record that its complement exists, so the next reader prices it correctly.
10. **`docs/MAINTENANCE.md` has no cap and no entry test, and states that exact diagnosis about a different file.** 1,520 lines, 134 entries, four added in five batches. This is not a documentation edit — deciding what that file is FOR (a record, or a working list) is a judgement about process that changes what every future batch does with a finding. **#100** — queued as the one process slot, with the three-part test written out.
11. **`tests/visual/screenshots.spec.js` has not run in 65 deploy versions**, blocked on a staging test account. Named by four consecutive audits. **declined:** not actionable by a batch — it is consolidated item 27 and needs Max to create the account. Surfaced to him in the handover rather than re-derived by a fifth audit.
12. **Move the `project-audit` and `flow-tester` agent definitions into the repo.** `.claude/agents/` is tracked and holds three others; the audit's own checklist being unreviewable is what let four settled threads cost budget every run. **#101**
13. **Strike four settled candidates from the `project-audit` standing checklist** (the `manager` role, JSON restore, bulk catalogue bootstrap, staging environment). **#101** — folded into the same item, because the checklist lives in the file that item moves.
14. **`cafeCost_env` is a third localStorage category `CLAUDE.md` says cannot exist.** **declined:** already consolidated item 78 and already in `docs/MAINTENANCE.md`; filing it a third time is the duplication this audit is complaining about. Left where it is.
15. **Menu/empty-state centring: four fixes, no root cause, and a test that postdates all four.** **declined:** unchanged since the v115 audit named it, and re-deriving it a fourth time buys nothing. It needs a reproduction before it needs an item, and nobody has one.
