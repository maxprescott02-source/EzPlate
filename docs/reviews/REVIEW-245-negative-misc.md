# REVIEW-245 — a negative misc cost cannot reach a plate cost

Reviewed-commit: da5715bc8a2ef34a3ec5f5f2100129c0d9303498

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).
Given the diff and the codebase conventions, and **not** the queue item, so it judged correctness rather than conformance.

**Two findings. Both acted on; neither declined.**
The first is a minor by its own grading and is the more interesting of the two: the guard was written at the wrong level, and the reviewer's own reachability analysis understated it by one call site.
The second is a count in a process doc that disagreed with two other process docs edited in the same commit — caught by recounting, which is what the rule those docs state asks for.

---

## The report, verbatim

> Working tree is clean, nothing uncommitted.
>
> ## Findings
>
> **1. Minor — the negative-cost guard added to `costDetail` is not mirrored in the per-line renderers that compute the identical value**
>
> `js/app.js`, `renderPlate()` (~line 2192) and `updateLine()` (~line 2214).
>
> `costDetail` (the function this diff patches) now treats a product line with `lineCost(p,l.qty) < 0` as "missing" — excluded from the total, counted in the flag, and dropped from `plateFullyCosted`/`dishRatios`. But the row-level cell that displays that same line's cost — `<span class="bld-lc" id="lc-${l.uid}">${lc==null?'<span class="nocost">no cost</span>':money(lc)}</span>` in `renderPlate`, and the identical pattern in `updateLine` — computes `lc` via the same `lineCost(p,l.qty)` call but only checks `lc==null`, never `lc<0`. `cpbu(p)` returns `p.cost_per_base_unit` verbatim with no sign check (`js/app.js:1891`), and nothing in the app can currently produce a negative product cost through the UI (`commitPrice` refuses `v<0`, `packToUnitCost` refuses `price<0`) — but a restore, backup file, or corrupted import can, which is exactly the class of data the diff's own `costDetail` fix and its comments say they're guarding against ("a negative product cost is the same claim by the other route").
>
> Concretely: open a plate that references a product with a negative `cost_per_base_unit` (only reachable via restored/imported data). The builder would show that line's cost as e.g. `$-2.00` — a real-looking dollar figure, not the "no cost" placeholder that a genuinely missing product gets — while the total below it, and the flag ("1 item has no usable cost and is not in the total"), both treat the line as excluded. The screen contradicts itself: one line looks costed, the aggregate says it isn't.
>
> This is the same shape CLAUDE.md itself names repeatedly (the `resolveMatchedPrice`/"same function must decide the write" precedent, and the `[hidden]` CSS precedent): a guard was added at one site that computes a value, and not at the sibling site computing the same value for display. Confidence in the mechanism is high (verified by reading both call sites and `cpbu`/`lineCost`). Real-world reachability is low today — the fixture in this diff's own `plate-cost.test.js` notes "0 of 428" products currently have a negative cost — so this is a latent inconsistency rather than something a user hits through normal typing, but it means the fix's "handled by the same route" claim holds for the arithmetic and not for what's on screen.
>
> **2. Nit — same-commit numeric inconsistency in the docs (the second commit, `da5715b`)**
>
> `docs/QUEUE-2026-09-08-CONSOLIDATED.md` (item 19's closing note) says *"the other **twelve** un-checked `min="0"` inputs"*, while `CLAUDE.md`'s new Tier-1 rule and `docs/MAINTENANCE.md`'s new entry — added in the same commit — both say **eleven**. I recounted by hand: `grep -n 'type="number"' index.html js/app.js` returns 15 inputs, 14 declare `min="0"`, and of those 14, three are actually guarded in code (`setQty`'s qty field, `commitPrice`'s price chip, `setMiscCost`'s misc-cost field) — leaving 11 unguarded `min="0"` fields, not 12. This is exactly the "read the hits, don't trust the count" trap CLAUDE.md warns about at length, introduced in the very commit that states the rule. No code impact — process-doc only.
>
> No other issues found. The core fix (`setMiscCost` clamp, `costDetail`'s `mc<0`/`lc<0` exclusion, the flag wording, cache-version bump across all six spots, the mutation target, and both new test files) is correct, well-targeted, and the tests genuinely exercise the real functions with differentiating fixtures (confirmed by running `npm test` — 2011/2011 passing — and the targeted test files individually).

---

## What was done about it

**Finding 1: FIXED, and it reaches a FOURTH call site the finding did not name.**

The finding's defect and mechanism both hold. Its remedy — mirror the condition in the two renderers — is the one thing that was not taken, and deliberately: repeating `lc==null||lc<0` at each site is the drift this codebase has the most recorded incidents of.
**The refusal moved into `lineCost` itself**, which is where `null` already means "this line cannot be priced". Grepping its callers rather than trusting the finding's list gave **four**, not two:

| caller | what it does with `null` |
|---|---|
| `costDetail` | counts the line as missing |
| `renderPlate` | renders "no cost" in the cell |
| `updateLine` | repaints the same cell |
| the supplier-exposure sum (`js/app.js` ~7547) | `if(lc!=null)` — **would have added the negative silently** |

The fourth is the one worth recording: it is not a display, it is a second figure, and it would have taken a negative into a supplier's exposure total with nothing on screen to show it. So the finding's severity of "minor, latent, display-only" was itself an understatement, which is why `CLAUDE.md`'s rule about reading a finding's four claims separately keeps earning its place.

With the refusal at the source, `costDetail`'s `||lc<0` became a condition that could never fire and was **removed** rather than left as a belt — same reasoning the batch already applied to the save-time guard the item asked for.

Pinned at the source in `tests/plate-cost.test.js`: `lineCost` returns `null` for a negative unit cost and `0` for a zero one. Hand-mutated (`c==null||c<0` → `c==null`) and confirmed red.

**Finding 2: FIXED.** `docs/QUEUE-2026-09-08-CONSOLIDATED.md` now says eleven, matching the other two. The reviewer's recount is right and its diagnosis is right: the wrong number was written into the same commit that added the rule against trusting counts. The three docs were corrected to eleven at different moments and one was missed, which is the ordinary way this happens.

**Verification after both fixes:** `npm test` 2011 pass · `npm run smoke` pass · full mutation gate 1235 mutants, 1189 killed, 46 survived all with written allowances · the item's browser spec green at 380 and 1280.
