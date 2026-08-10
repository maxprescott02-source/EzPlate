# EzPlate project audit

```
Audit at v145, 10 August 2026 — previous audit v135, 10 merges ago.
```

**Commit:** `4d6f804` (branch `main`). **Window under audit:** v136–v145, the entire v3 fold-in (F1a tokens/theme through the chart y-domain fix), following `docs/audits/AUDIT-v135.md`.

## Verdict

**The project is healthy, and the fold-in phase has been exceptionally disciplined — arguably more so than the phase AUDIT-v135 reviewed.** `npm test` is **848/848 green in ~1.5s** (67 files, up from 822 at v135, all growth attributable to new work, no unexplained drops); the **full** Playwright suite is **221/221 green in 3.0m** across 22 spec files. The protected parser region is still **byte-identical** to the hash first recorded at v125 (md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes) — now unscathed across *ten* deploy versions and *five* screen rebuilds. All ten shipping commits' `sw.js` match their handovers' claimed version exactly. Every one of the six corrections and two new Tier 1 rules approved 10 Aug landed in `CLAUDE.md` exactly as approved — the first time in three audits that 100% of a prior audit's recommended corrections actually reached the file (contrast v135's own D4, where a v125 recommendation reached nowhere). The batches were also unusually good at catching their own defects: eight-plus pre-push review findings in F1a alone, and three separate "tests that cannot fail" (F6's focus-ring, the marker-collision gap, the light-only sync-tint pin) each found and fixed inside the batch that introduced it.

**The single most important thing to address is a small, concrete drift the project already has a name for and a rule against: `tests/kpi-strip.test.js:44` hand-stubs `fmtTargetPct` instead of extracting the real one** — the exact function `CLAUDE.md`'s own Tier 1 rule (added 10 Aug, citing incident "140") names as the poster child for this trap — and the stub's rounding behaviour diverges from the real function's for any fractional target. It is small to fix and worth fixing for what it says about coverage: the rule was *written* this window but not *swept for* against the exact case that motivated it. Runner-up: `docs/QUEUE.md`'s own prose (twice) asserts that unconverted screens are protected by a `.legacy` CSS wrapper that "does most of" the eventual dead-CSS sweep "structurally" — but that class has **zero occurrences** anywhere in the shipped code, a fact a handover in this very window recorded and asked to be decided "before F6," and F6 shipped without touching it (§2c C1).

---

## 1. Invariants

All TRUE. No regressions from v135.

| Invariant | Result | Evidence |
|---|---|---|
| **Protected parser region** | **TRUE — byte-identical to the v125/v135 hash** | Anchors at `js/app.js:6266` (`var INV_EXCLUDE=`) and `js/app.js:6492` (`function unitLabelFor(`). md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes — unchanged despite ~290 net line insertions elsewhere in the file across this window |
| **No twice-defined top-level name** | **TRUE, test unchanged** | `tests/housekeeping.test.js:182-187`, still asserts `dupes` is empty, not the reverse |
| **Naming inversion** | **TRUE, both halves pinned** | `index.html:945` `data-tab="ingredients"` → `aria-label="Products"`; `:947` `data-tab="pantry"` → `"Ingredients"`; `:949` `builder` → `"Plates"` |
| **Six version spots** | **TRUE at HEAD and at all ten shipping commits** | `sw.js:2` `ezplate-v145`; `sw.js:5` two `?v=145`; `index.html:56,969` two `?v=145`; `js/app.js:4674` `APP_VERSION='v145'`. Verified per-commit for all ten (`d56486e`…`2cd6cd1`) — every one internally consistent |
| **Four protected functions** | **TRUE, present and unrenamed** (lines shifted with the redesign, names did not) | `packToUnitCost` `js/app.js:979`, `applySupplierMemory` `:6345`, `unitCatCategory` `:6363`, `resolveMatchedPrice` `:6379` |

Also re-verified clean: the `isFinite('')` two-part guard intact (`js/app.js:1529-1532`); five history-series variables still distinct and `setProduct`/`logIngPrice` still the sole writer into `ing_price_history` (`js/app.js:612`); `gemToken` bump present (`js/app.js:6106,7180`); `invRowState` still the single source of tint (`js/app.js:6878`); `productRefs` still checks both the kid and pid arms (`js/app.js:2160-2166`).

---

## 2a. `CLAUDE.md` claims verified — a genuinely clean pass

All six corrections approved 10 Aug 2026 (5 stale-line fixes + 2 new Tier 1 rules) were checked individually against the file and **all landed exactly as approved**:

- `pushWrite`'s contract (S1/v135) now correctly states no `null` path exists.
- The "drops writes silently" line (S2/v135) now correctly says the drop is real but the toast is not silent.
- `cafeDB_plateDraft` is now named as the standing localStorage exception (S5/D4 of v135 *and* v125 — the second recommendation, finally landed).
- The false "positioning context is already final" sentence (S3/C1 of v135) is deleted; the "builder IS a MODAL" bullet now correctly reads as describing today and scheduled for reversal at F7 (unshipped, still `next` — so the claim is still true at HEAD).
- Tier 3's staging line now correctly says the server loads and answers, with the substantive warning (empty schema, still unrehearsed) intact.
- Both new Tier 1 rules (`@media` specificity, stub-mirrors-contract) are present with their corrected corollaries (cascade **origin**, not specificity, for `[hidden]`).

Roughly 40 further claims were checked this pass — third-party pinning/SRI, the four-noun rule, the FK table, the writes section, the fragile-areas list — with **no further errors in the file text**.

One soft forward note rather than a correction: Tier 2's *"one primary CTA per screen"* is a standing rule, and two shipped screens (Ingredients F3, Products F4) carry two mobile header actions today. This is a known, decided, queued deviation (`docs/QUEUE.md:231-242`, `Do after: F10`) rather than an oversight, so it is not a factual error — but it is the same shape as things this file elsewhere names explicitly (e.g. "Menu item" surviving as a fifth noun). Not worth a `CLAUDE.md` edit on its own.

---

## 2b. Dead traps recommended for removal

**None. Fourth consecutive clean result** (after v115, v125, v135). All 18 Tier 1 entries (16 carried + 2 added 10 Aug) were checked against current code:

- **Both new entries are alive and earning their keep.** The `@media` specificity rule was invoked by name in F5's and F6's own handovers ("the pair of `content:none` cancels is now measured in both directions", "earned its keep twice here"). The stub-mirrors-contract rule was explicitly reasoned about and correctly *not* applied in `HANDOVER-154` (chart y-domain) — but see D-item below for a place it was **not** swept.
- **Everything carried from v135 remains live**, unaffected by a window that touched CSS and markup rather than schema or data shape: row boundary/`buildBackup`, cross-referencing write sequencing, the three foreign keys, `ingredients.updated_at`, per-publication counting, the five history series, `addProduct` (still exactly five references, all in `tests/visual/fresh-states.spec.js:53,165,271,272,626` — unchanged count from v135).

**Counterpoint recorded rather than actioned as a "dead trap":** the stub-mirrors-contract rule has a live unswept violation. That does not make the rule dead; it makes it under-enforced.

---

## 2c. Contradictions

### C1 — `docs/QUEUE.md` asserts a mechanical safety net that has never been built, and a handover in this same window said so without anyone acting on it *(high)*

| Location | Wording |
|---|---|
| `docs/QUEUE.md:184` | *"The old stylesheet is scoped to a `.legacy` wrapper on unconverted screens; … when `.legacy` has no children left, the old stylesheet dies."* |
| `docs/QUEUE.md:455` (Dead CSS sweep) | *"its §2 `.legacy` mechanism does most of this sweep structurally (when `.legacy` has no children left, the old stylesheet dies wholesale)"* |
| `docs/handovers/HANDOVER-151-menu.md` | *"This repo has never implemented that mechanism — every F-item has instead deleted its screen's rules by hand… it means the protocol's stated safety net does not exist and nobody has said so out loud. Worth a decision before F6 rather than after F10."* |

**What the code supports:** `grep -rn "\.legacy" css/style.css index.html js/app.js` returns **zero hits**. The class does not exist.

F6 (`v143`), the very next batch after HANDOVER-151 asked for the decision, shipped without addressing it and does not mention `.legacy` at all. So two queue passages describe an operative structural mechanism in the present tense — one of them *relying* on it to do future work — while the mechanism has never existed, the gap was flagged explicitly inside this window, and the requested decision point has come and gone. The manual per-screen deletion done instead has worked for six screens running, so this is **not a live bug**; the queue's prose is simply wrong about how that safety is being provided.

### C2 — a live recurrence, in this same window, of the exact pattern AUDIT-v135 named "the systemic one" *(medium)*

`docs/QUEUE.md:539` (opaque semantic tints vs row hover) reads, present tense: *"F5 (Menu) is: its food-cost verdict cell is the app's original tinted row."*

F5 shipped as `v142`, and its own handover records that it **deleted the entire `.atable` system** and found the masking concern was never about Menu (*"only the WRAP is shared… every `.atable*` rule was Menu-only"*). Menu's verdict is now a small `.vbadge` pill (`css/style.css:3637-3640`), not a full-row tint, and the row's hover rule (`css/style.css:3646`, `.mnu-row:hover{background:var(--hover)}`) is untouched by it. The item's premise was invalidated by the very batch it was pointed at, and the item was never updated to say so or re-pointed at wherever the real masking risk now lives — most plausibly the invoice review's `.st-*` row tints, still on F8, unconverted.

This is the identical shape v135's C2 described (*"a note names a future batch… that batch ran and answered none of them"*) recurring in the same file, in the same phase, **after being named explicitly.** That is the finding: not the tint, but that naming the pattern did not stop it.

---

## 3. Test drift

1. **RECURRENCE — the CI hermetic-spec-count comment, flagged stale by AUDIT-v135, is still wrong and has drifted further.** `.github/workflows/test.yml:174`: *"Latent today (9 specs, 8 survive the filter)."* Measured now: **22 spec files, 21 survive** (`ls tests/visual/*.spec.js | wc -l` = 22, minus `screenshots.spec.js`). At v135 it was 17/16 — the gap has grown from 8 wrong to 13 wrong across this window, entirely unactioned. The item recommending the fix already sits in the "Small, each independently shippable" list and nobody has taken it in ten batches. **The guard still fails closed correctly — only the number lies.** Note the queue item itself now states the *v135* figures (17/16), so it needs correcting too.
2. **A stale test count in the Stryker queue item, the same shape v135 flagged in the same item.** `docs/QUEUE.md:349` still says *"The suite is 822 tests in ~0.9s (re-measured by the v135 audit…)"*; actual is **848 tests in ~1.5s**. Low harm — the item is hedged and its case does not turn on the number — but this is the second audit running to find this specific item's count stale.
3. **No unexplained test-count drop.** Unit tests 822 → 848 (+26), fully attributable to new fold-in coverage. Two Playwright specs were deliberately retired (`v135-plates.spec.js` at F2/`v138`, `q7-products.spec.js` at F4/`v140`), both with an explicit reviewed replacement and a named carry-forward of the load-bearing assertion each held — `HANDOVER-148`'s pre-push review caught and preserved the `cafeDB_prodDensity` boot-cleanup coverage that `q7-products.spec.js` was the only holder of. This is the honest-rewrite path the fold-in's standing rules require, not drift.
4. **No test references anything that no longer exists.** Spot-checked `_extract.js`, the new `trend-domain`/`kpi-strip`/`dash-scope` harnesses, and `king-rows.test.js`'s comment-stripped source grep (itself a fix for a real false positive found in F3) — all current.

---

## 4. Recurring symptoms

### R1 — `max-content` grid tracks resolving per-container: **CLOSED this window**, and fixed by shape rather than by screen, exactly as AUDIT-v135 recommended

v135 found the fix applied once (`#plateList`, v135/Q4b) with three more instances surviving on the next screens in the queue. All three are now fixed, each carrying the same comment lineage back to the v135 review's 27px measurement:

- `css/style.css:3270-3272` (`#kingList`, Ingredients/F3): *"band and rows are separate grid containers, so both carry the SAME fixed tracks — a max-content track resolves per container and drifts the columns apart (v135's review measured 27px)."*
- `css/style.css:3460-3462` (`#ingList`, Products/F4): identical pattern, identical lineage.
- `css/style.css:3672-3675` (`.mnu-band`/`.mnu-row`, Menu/F5): *"BOTH templates are fixed and IDENTICAL… The spec asserts the resulting alignment rather than the template, so a future re-track that still lines up is allowed."*

This is the rare case of a queue-recorded root cause actually being fixed by shape instead of rediscovered per screen. **Named here so the next audit does not have to re-derive it.**

**The charter's known three: zero new occurrences this period**, matching v135. Pack-size persistence and invoice flag-pill alignment appear nowhere in `HANDOVER-144` through `154`. Menu/empty-state centring is unchanged, still `Do after: F10`, reasoning intact.

**No new recurring symptom** beyond C1/C2 above, which are a *routing* recurrence rather than a bug-fixed-twice one and are kept there.

---

## 5. Dropped threads

### The fourth "test that cannot fail" — searched for deliberately, and NOT found

A targeted search across all 22 Playwright specs (weak-pattern grep for `toBeGreaterThan(0)`, `toContain`, `toBeTruthy`, DOM-count-without-floor) and the newest unit harnesses turned up **no new always-passing assertion** of the F6-focus-ring / marker-collision / light-only-sync-pin shape. The three known incidents in this window were each confirmed self-caught and fixed inside the batch that introduced them:

- F6's `outlineWidth > 0` — fixed in `v138-plates.spec.js` and `v140-products.spec.js`, and correctly guarded with a preceding `style==='solid'` check in the newer `v142-menu.spec.js:194`.
- The marker-collision gap — `HANDOVER-154`, self-planted and self-caught in the same batch.
- The light-only sync-tint pin — `tests/visual/v141-sync-corner.spec.js:228` now runs its danger-tint assertions `for (const theme of ['light','dark'])`, with a comment at `:225-227` recording the trap and stating it was added *because* an earlier pass "had hand-traced the dark cascade and noted nothing pinned it". Confirmed added in the same commit (`99bb407`, v144) as the fix it guards.

**So the Stryker item does not get an earlier slot on this evidence** — the batches are currently catching these themselves. What was found instead is an instance of the *sibling* rule.

### D1 — the stub-mirrors-contract rule has a live violation, in the very function the rule cites as its origin

`tests/kpi-strip.test.js:44`:
```js
function fmtTargetPct(){ return String(cogsPct)+'%'; }   // mirrors the real return shape — it INCLUDES the % (a stub without it hid a "30%%" bug the browser drive caught)
```
The real function, `js/app.js:4212`:
```js
function fmtTargetPct(){ return (cogsPct%1?cogsPct.toFixed(1):cogsPct.toFixed(0))+'%'; }
```

The stub matches the real function's *includes-the-%* fix — the "30%%" defect the Tier 1 rule calls incident 140 — but **not its rounding**. For a fractional target the two disagree: `32.53` renders `"32.5%"` from the real function and `"32.53%"` from the stub. `kpi-strip.test.js` only ever exercises whole-number and `.0` targets (`:143-147` use `30`, `30.0`, `28.0`), so the divergence is never exercised.

⚠️ **Reachability, corrected — the audit pass that found this had the mechanism wrong, and the correction matters for how the fix is judged.** It is *not* reachable from the Settings input: `js/app.js:5160` is the only Settings path and it routes through `setCogs`, which does `pct=Math.max(1,Math.min(99,Math.round(pct)))` at `js/app.js:1107` — so every value the app itself persists to `food_cost_target` is an integer. The one path that assigns a fractional `cogsPct` is the **boot read** at `js/app.js:514`, which does `cogsPct=pv` straight from `parseFloat` with **no rounding** — so a setting holding `32.5` from a restore, an older file, or a direct DB write loads fractional and stays fractional until the user next touches Settings. The real function's `cogsPct%1` branch exists for exactly that path.

So the divergence is **latent, not live**. The finding stands anyway, and on the rule's own terms: this is a hand-rolled copy of a shipped function written from the same belief as the code, in a file where the fix pattern was already available — `tests/dash-persist.test.js:392` and `tests/trend-reframe.test.js:58` both `extractFn` this same function, and three lines below the stub the same harness extracts `analyze`, `avgFoodCostForScope`, `dashPctClass` and `kpiStripHtml`. The rule was written this window and not swept for.

### The charter's named candidates

| Thread | Status | Proof |
|---|---|---|
| **Staging Supabase** | **Still not usable** — unchanged from v135's D1, now correctly reflected in both `CLAUDE.md` and the queue | Server approved, schema still empty (`docs/QUEUE.md:392-393`); the item is next, unblocked, unstarted |
| **Eval harness for the invoice reader** | **Not done**, unchanged | `docs/QUEUE.md:353-360` |
| **`manager` as a third role** | **DONE — closed by decision**, unchanged | `docs/QUEUE.md:592-597` |
| **The privacy revisit** | **Not done**, unchanged | `docs/QUEUE.md:605-611`; `CLAUDE.md` Tier 2 still names it the top gate |
| **Bulk catalogue bootstrap** | **Not done**, still folded into Onboarding | `docs/QUEUE.md:599-603` |
| **Import/restore from JSON backup** | **DONE**, unaffected by this window | unchanged since v110 |
| **Abbreviation matching in search** | **MISLABELLED "DONE" by the last two audits — actually still not built** | see D2 |
| **`TODO(Max)` markers** | **DONE — zero remain**, re-verified | `grep -rn "TODO(" js/ index.html sw.js css/ api/` → no hits |

### D2 — "Abbreviation matching in search" has been carried as a closed thread for three audits, and it is not one

`docs/QUEUE.md:30` and `:758` both cite "abbreviation search" as a past example of a stale queue item that turned out to be already shipped, alongside the zero-menus headline and the builder modal. AUDIT-v135's dropped-threads table recorded it as *"DONE — shipped v55… worked example at `js/app.js:673`."*

**That citation is a different feature.** `js/app.js:673-677`'s `kitchenSearchMatches` (v55 §G) matches a search term against the ingredient name *and its linked product's* description/brand/category/supplier text — real, useful and shipped, but a plain substring match (`js/app.js:667-668`: split on whitespace, then `hay.indexOf(token) >= 0` per token). There is no abbreviation expansion anywhere in the file. The actual abbreviation feature — "gf" finding "Gluten Free Bread" with no literal "gf" in the haystack — was **explicitly declined**, and says so a few lines below the code cited as proof it shipped:

`js/app.js:701-704` (comment, present since `HANDOVER-v83`, unchanged through this window):
> *"the fuzzy matcher can't match abbreviations ("bread gf" does not find "Gluten Free Bread"), so 'no match' is not a reliable enough signal to safely offer creation — it produced duplicate ingredients."*

`HANDOVER-v120.md:36` had already flagged the mislabelling once, but the correction did not stick: v121 and v122 repeated the claim and v135 inherited it uncorrected. This is a three-audit-old misfiling rather than a regression from this window — but it means the thread is genuinely **still open**, contrary to what every recent document says. **It is also the second entry in this report (with C2) where a correction was written down and then not propagated**, which is the pattern worth more attention than either instance.

### D3 — the `new-branch` skill still tells every batch the mandatory reviewer is optional

Flagged 10 Aug by `HANDOVER-149` and correctly queued (`docs/QUEUE.md:521-528`). Re-verified: `~/.claude/skills/new-branch/SKILL.md:78,81` still says the PR **workflow** is *"MANDATORY and runs itself"* and the pre-push **`code-review` agent** is *"OPTIONAL"* — both backwards, unchanged. Outside the repo, so it cannot ride a PR or be reviewed. Surfaced again because it is the one open item whose cost compounds every batch it survives: it is read at the start of every batch, **including whichever batch eventually fixes it.**

### D4 — the proposed `CLAUDE.md` KPI-anchoring addition is correctly still unwritten

`docs/decisions/2026-08-10-ANSWERS.md`'s closing section proposes a one-line Tier 1 addition (KPI figures carry the same target-anchoring as the chart) and says *"NOT yet written… needs his yes."* Confirmed absent from `CLAUDE.md` at HEAD — correctly gated, not a finding, recorded only so the next audit does not re-derive that it is pending rather than dropped.

---

## Nothing to report in

- **Invariants** — every one TRUE; the protected parser region is byte-identical across *ten* more deploy versions and *five* more screen rebuilds since the hash was first recorded at v125.
- **Dead traps** — none recommended for removal. **Fourth consecutive clean result.**
- **Fold-in consistency across the five converted screens + shell** — genuinely one idiom, not five variants: all five share `.scr-head`; old markup and CSS were deleted in the same commit as each conversion (verified for F2's `.plib-*`, F3's deliberately-kept `.king-*`, F4's deliberately-kept `.ing-*`, F5's wholesale `.atable` deletion, F6's five deleted layout layers); `tabular-nums` is present on money and percentage cells; focus rings are pinned and *measured* rather than merely asserted on every converted screen; the mobile counterpart shipped in the same item as desktop for every F-item. The one real gap is the `.legacy` safety net (C1) — a process gap, not a rendering one.
- **Handover claims vs git** — all ten shipping commits' `sw.js` match their handover's stated deploy version exactly.
- **`CLAUDE.md` corrections from the last audit** — all six landed correctly, the first 100% pass-through in three audits.
- **Test suite health** — 848/848 unit and 221/221 Playwright green, monotonic growth, no unexplained drop, both retired specs explained with their load-bearing coverage carried forward.
- **Third-party supply chain / no-new-dependency rule** — unaffected by this window, unchanged from v135.
- **Pre-push review efficacy** — continues to earn its "mandatory, single reviewer" status: substantive findings in essentially every batch this window (8+7 in F1a, 2 in F1b, fragility-only in F2, 4 in F3, 3 in F4, 2 each in F5/F6, 1 major plus one more in the y-domain fix).
- **The charter's known three recurring symptoms** — zero new occurrences, and R1 is now genuinely closed rather than deferred.

---

## What this report changed in the queue

Five items were added or corrected when this report was filed (`HANDOVER-155`): the `.legacy` prose contradiction (C1), the tint item's dead F5 pointer (C2), the `kpi-strip.test.js` stub (D1), the abbreviation-matching record correction (D2), and the two stale counts in §3. The Stryker item was **not** promoted — §5 looked for a fourth cannot-fail test and did not find one.
