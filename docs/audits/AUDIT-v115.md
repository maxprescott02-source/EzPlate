# EzPlate project audit

```
Audit at v115, 8 August 2026 — no previous audit; docs/audits/ did not exist, so the gap is unknown.
Filed at v115 per sw.js:2, NOT the v116 the queue item asked for. See "Filing note" at the end.
```

## Verdict

**The project is healthy.** `npm test` is **756/756 green in 0.83s**, every Tier 1 invariant reachable from the repo verified TRUE, and the four protected functions, the parser anchors, the naming inversion and all six version spots are intact.
`CLAUDE.md` is in unusually good condition — the three-tier rewrite is recent and it shows: **no Tier 1 entry was dead enough to recommend for deletion**, which is not the normal result for this check.

**Coverage note:** handovers v113–v116 read in full, plus keyword grep across all 68 back to v40.
The **Supabase MCP was not available** to the auditing agent, so every claim requiring a live database read is marked UNVERIFIABLE rather than assumed true.

---

## 1. Invariants — all clean

| Invariant | Result | Evidence |
|---|---|---|
| Protected parser region, both anchors | **TRUE** | `js/app.js:5344` (`var INV_EXCLUDE=`), `js/app.js:5570` (`function unitLabelFor(`); sliced at `tests/_extract.js:67` |
| No twice-defined top-level name; test asserts **absence** | **TRUE** | `tests/housekeeping.test.js:182`, message at `:189` confirms it fails on a *new* duplicate |
| `data-tab="pantry"` labelled "Ingredients" | **TRUE** | `index.html:783` |
| `data-tab="ingredients"` labelled "Products" | **TRUE** | `index.html:781` |
| `data-tab="builder"` labelled "Plates" | **TRUE** | `index.html:785` |
| Two inversion guards in terminology tests | **TRUE** | `tests/terminology.test.js:88`, `:102` |
| Six version spots agree at 115 | **TRUE** | `sw.js:2`, `sw.js:5` ×2, `index.html:32`, `index.html:797`, `js/app.js:4021` |
| `resolveMatchedPrice` · `unitCatCategory` · `applySupplierMemory` · `packToUnitCost` present and unrenamed | **TRUE** | `js/app.js:5457`, `:5441`, `:5423`, `:920` |

No prior handover recorded a hash for the parser region, so only anchor presence could be compared.

Worth recording for the next auditor: three of the four protected functions (`:5423`, `:5441`, `:5457`) sit **inside** the protected region `5344–5570`, so they are doubly covered.
Only `packToUnitCost` (`js/app.js:920`) is protected by the rule alone.

---

## 2a. `CLAUDE.md` claims, verified one at a time

### Verified TRUE

| Claim | Evidence |
|---|---|
| `rowToMenu` maps a DISH despite the name | `js/app.js:163` — reads `menu_items` columns |
| `isFinite('')` guard is `typeof … === 'number'` **then** `isFinite`, kept separate | `js/app.js:197`, `:1373`, `:1450`, `:2623`, `:2646` — all five in the documented shape |
| `tests/price-log-paths.test.js` pins it | `tests/price-log-paths.test.js:244` |
| `buildBackup` dumps camelCase `menuId`/`plateId`/`sourcePlateId`/`custom` | `js/app.js:4191`; `rowToMenu:163` produces exactly those four |
| Columns are `menu_id`/`plate_id`/`source_plate_id`/`is_custom` | `js/app.js:103`, `:168` (`menuToRow`) |
| `stamp.format` is 3 and must bump on any `bootstrapSync` change | `js/app.js:4194–4201`, rule written at `:4196` |
| `parseBackupFile` accepts 2 and 3, refuses 1 by name | `js/app.js:4258`, `:4264`, `:4373` |
| `plateToRow` omits `menu_id` — restore correct by design | `js/app.js:175` returns `{id,name,lines,category}`; reason at `:171–173` |
| `menu_change_log` records what MAX did | `js/app.js:183–186`, writer at `:281` |
| `setProduct` is `ing_price_history`'s **sole** writer | `js/app.js:1399`; only insert at `:1354` (`saveIngLog`), reached via `setProduct`; all 11 hits checked |
| Five history series, all five identifiers live | `priceHistory` 20 · `menuHistory` 11 · `menuPriceLog` 10 · `ingPriceLog` 12 · `changeLog` 16 |
| `computeAvgFoodCost()` is live, so `avgBefore` must be read first | `js/app.js:1597`; correctly read first at `:6753` |
| `gemToken` MUST be bumped by the watchdog | `js/app.js:6238` — `gemToken++;  // VOID this request` |
| `invConfirmState` is the pure decision | `js/app.js:6211` |
| `productRefs(pid)` checks BOTH paths | `js/app.js:1929–1939` |
| `publishPlan` is the ONE publish decision, shared by both submitters | `js/app.js:1199`; called `:5147`, `:6830` |
| `renderUnlinkedPrompt` reads `.unlinked` | `js/app.js:5071`, reading at `:5078` |
| Cross-referencing writes are a sequence, both helpers exist | `dbPushMenuAfterPlate:4970` (called `:1216`), `dbDeletePlateAfterDishes:4991` (called `:4889`) |
| `.muted-row` hiding scoped to `.is-new` | `js/app.js:6012–6013`; `css/style.css:830`, `:836–837`, `:1584–1587` |
| Auto-tick: only `invRowState === 'matched'` pre-ticks | `js/app.js:6094`, `:6130`, `:6146`, `:6157` |
| Supplier renames must migrate memory; `memKey` off supplier NAME | `js/app.js:1701`, `:5680`, applied at `:4155` |
| Chart colour anchored to TARGET; revert-catching pair exists | `tests/trend-reframe.test.js`, both green |
| `addProduct` dead in app, kept only for `fresh-states` | `js/app.js:751`; **exactly five** call sites: `fresh-states.spec.js:53, 165, 271, 272, 457` |
| Playwright is not in `npm test` | `package.json` — `"test": "node --test tests/*.test.js"` |
| Four hand-written client files, no build step | `js/app.js` 7305 · `css/style.css` 2873 · `index.html` 848 · `sw.js` 42 |
| Both third-party scripts pinned exact + SRI; pdf.js worker pinned only | `index.html:794–795`; `js/app.js:5180–5189`, worker exception at `:5183–5185` |
| `pushWrite` returns its settled promise | `js/app.js:62`; helpers at `:255`, `:263`, `:1354`, `:1499`, `:1559`, `:6747`, `:6866` |
| `nextKid()` scans the live array | `js/app.js:643` |
| `fallbackMenuId()` never returns a deleted id, null on zero menus | `js/app.js:1017` |
| `doDeleteMenu`'s dishes-before-menu ordering guards nothing | `js/app.js:6756–6760` — comment now **correctly** states the SET NULL behaviour |
| `where true` is load-bearing on the restore's deletes | `supabase/migrations/20260803_restore_backup_fn.sql:76–90`, `20260806_restore_backup_v3.sql:97–107` |
| `code-review.yml` on demand only, `deep-review` label, both publishing inputs on | `.github/workflows/code-review.yml:11–30`, `:65`, `:217–218` |
| Suite count matches the newest handover | Measured **756**; `HANDOVER-v116.md:8` says 756. Agrees. |

### STALE or WRONG

**S1 — `ensureDefaultMenu`'s stated condition is not in the function.** *(consequence: medium)*

> `CLAUDE.md` Tier 2 → Menus: *"`ensureDefaultMenu` seeds "Original" only when the `menus` table did not answer at all."*

`js/app.js:1016` seeds whenever the array is empty and knows nothing about whether the table answered.
The gating lives at the **call site**, `js/app.js:457–459` (`var menusRead = …; if(menusRead) … else ensureDefaultMenu();`).
A batch following the rule by grepping the function name finds code that appears to contradict it, and the safe-looking "fix" is a guard inside the function — the wrong place.
Minor: the seeded name is `'Original menu'`, not `"Original"`.

*Filer's note: partially mitigated in the code — `js/app.js:1014–1015` carries a comment saying "The caller decides; this function must never guess". The hazard is that `CLAUDE.md` points at the function rather than the caller, not that the code is undocumented.*

**S2 — the `where true` rule is filed under "the one that bites while editing code", but there is no such code to edit.** *(consequence: low — misdirection, not falsehood)*

All five `.delete()` calls in `js/app.js` (`:263`, `:265`, `:1703`, `:6747`, `:6866`) are `.eq()`-scoped; no WHERE-less delete exists in the four client files.
The `where true` lines are SQL, in migrations Tier 3 says are applied by hand and never bundled.
The hazard is real; the framing points a batch at the wrong file.

**S3 — the three-FK rule cannot be checked against anything in this repo.** *(consequence: medium)*

Tier 1 states three foreign keys with specific ON DELETE behaviours.
Tier 3 states *"the migration files plus their commit messages ARE the audit trail."*
Grepping `supabase/migrations/` for `references` / `foreign key` / `on delete` returns **only negative statements** (`20260801_ing_price_history.sql:25`, `20260727_price_history_menu_id.sql:11`, `20260727_menu_price_history.sql:12`).
None of the three FKs is defined in any migration; they predate the directory.
**The repo's own stated audit trail does not contain them.**
Only the direction of the odd one could be corroborated: `js/app.js:171` — *"v55: plates.menu_id is legacy (a plate no longer belongs to one dish)"*, consistent with `plates.menu_id → menu_items.id`.

**S4 — `docs/QUEUE.md` argues with a `CLAUDE.md` line that no longer exists.** *(consequence: low)*

The `.range-btn` entry says *"not the open a11y item CLAUDE.md still calls it"*.
`grep -c "range-btn" CLAUDE.md` returns **0** — the three-tier rewrite removed it.
The correction now corrects nothing and reads as evidence of a `CLAUDE.md` defect already fixed.

### UNVERIFIABLE from the auditing session

| Claim | Why |
|---|---|
| `ingredients.updated_at` carries the same single timestamp on every row | Needs a live query; no Supabase MCP in that session |
| The three FKs and their ON DELETE behaviours | Same — and see **S3** |
| `safeupdate` rejects WHERE-less DELETE/UPDATE for `authenticator` but not `postgres` | Documented as measured at `20260803_restore_backup_fn.sql:83`; not re-measured |
| Anon UPDATE/DELETE returns 204 with no error | Same |
| `list_migrations` is empty | Needs MCP |
| Playwright specs actually pass | No browser in that session — **since resolved by the filer, see the filing note** |

---

## 2b. Dead traps recommended for removal

**None.** Every Tier 1 entry's subject was located in live code, or is a decision, or is the "trap worked and the test enforces its absence" shape.
Tier 1 is currently earning its context cost.

**One to watch, not to remove now:** the `addProduct` trap depends entirely on `fresh-states.spec.js` continuing to exist.
The open queue item to audit those specs for meaning names this exact function as the reason they are suspect.
**If that item retires `fresh-states.spec.js`, the `addProduct` trap becomes dead in the same commit** — and the entry says deleting it fails *silently*, so nothing would notice.
Whoever works that item should close the trap in the same branch.

---

## 2c. Contradictions

**C1 — the audit filename.** Resolved at filing; see the filing note.

**C2 — Playwright spec count: 100 vs 88.** **RESOLVED BY THE FILER — not drift.** See the filing note.

**C3 — the chip dots: `docs/PHONE.md` asks Max to judge a state the code no longer has.**
- `HANDOVER-v115.md:116`: *"Chip dots gone; the light moved onto the active chip"*
- `HANDOVER-v115.md:227`, same file, same day, Max's own instruction: *"The chip dots are BACK (reversing this batch's first-draft removal — Max's call)"*
- `docs/PHONE.md:32`: *"The dotless chips — Healthy / Watch / Rework. The active chip carries the colour now. Is the idle row too quiet?"*

**The code supports the revert:** `css/style.css:504` is `.mlf-chip .dot{margin:0}`, and the active-chip tint the removal introduced also survives at `:507–510`.
Both ship. The device check names the reverted state and would ask Max about a UI he is not looking at.

**C4 — `npm test` count inside one handover.** `HANDOVER-v115.md:7` and `:199` say 752; `:302` says 756.
**The code supports 756.** The headline is the stale half.
Handovers are write-once, so this is recorded, not edited.

**C5 — `.range-btn`.** The queue is the stale side, not `CLAUDE.md`. See **S4**.

**C6 — the splash was decided three ways in one day and nothing carries the final state.**
`HANDOVER-v115.md:222` (hide on desktop) → `:247` (*"supersedes both the removal and the original"*, rebuilt as the loading screen).
`docs/PHONE.md` has **no splash entry at all**, despite it being the first thing a user sees, rebuilt live on the last shipping batch, and carrying a bug class (`:265` — the session flag was set before it was read) that only a browser caught.

---

## 3. Test drift

1. **The 100→88 Playwright discrepancy** — **resolved by the filer, not drift.** See the filing note.
2. **11 Playwright specs never run under `npm test`.** `"test": "node --test tests/*.test.js"` covers **61 files / 756 tests**; `tests/visual/` holds 11 specs. They now run in CI, so they are not stale — but they are invisible to any local batch, and `CLAUDE.md` names that risk only for `addProduct`.
3. **`fresh-states.spec.js` builds fixtures through a door no user has** — five `window.addProduct(...)` calls. Queued; flagged v111, unchanged.
4. **`screenshots.spec.js` carries 2 assertions for the whole file** — a capture harness in a spec's clothes. Open since the 7 Aug reconcile.
5. **No test references a function, id or copy that no longer exists.** Suite fully green; `terminology`, `housekeeping`, `restore` and `trend-reframe` all pin identifiers independently confirmed live.

---

## 4. Recurring symptoms

Ranked by how much evidence there is that the root cause was never found.

1. **Menu / empty-state centring — four fixes, no root cause on record.** `HANDOVER-v44`, `v49`, `v54`, `v70`.
   Each reads as its own CSS correction; no handover names a shared cause, and no Tier 1 entry was ever written.
   `tests/empty-states.test.js` exists but postdates all four.
   **The strongest remaining candidate for an unfound root cause in this repo.**
2. **Pack-size persistence / supplier memory — five fixes, root cause eventually found.** `v40`, `v45`, `v71`, `v106`, `v107`.
   Cause identified in v107 (`memKey` off the supplier NAME) and correctly promoted to a Tier 2 rule.
   **The residue is data, not code:** `docs/PHONE.md:89–92` records **six orphaned taught packs still in production**, supplier `Document No:`, verified 7 Aug 2026, waiting on a phone visit since v107.
3. **Invoice flag-pill alignment — two fixes.** `v46`, `v62`. No root cause recorded, but the surface is `renderInvReview`, already a documented fragile area.
4. **Dashboard scope persistence — five touches, now resolved.** Closed at the 7 Aug reconcile. No action.
5. **Invoice ticks lost on re-render — flagged twice, never fixed.** A repeated *observation* rather than a repeated fix, which is the cheaper version of the same signal. Queued.

---

## 5. Dropped threads

| Item | Status | Proof |
|---|---|---|
| **Staging Supabase** | Not done — **queued** | `.mcp.json` points at production; named *"the loop's most common stop condition"* |
| **Eval harness for the invoice reader** | **Not done — in NEITHER `QUEUE.md` nor `PHONE.md`, nor any handover** | 0 hits across all three plus all 68 handovers. **Reached no landing place at all.** |
| **`manager` as a third role** | Not done — never reached the queue | Roles item specs owner/staff only; `manager` = 0 hits. Appears only in `HANDOVER-v60`, `v82`, `v98` |
| **Privacy revisit before other businesses' data flows through Gemini** | Not done — **queued**, named the top gate in two places | Properly landed. Residual gap: the only user-facing privacy text is a Settings hint (`index.html:704`), not a policy |
| **Bulk catalogue bootstrap for onboarding** | Partially — **subsumed, not named** | Inside "Onboarding and empty states" by implication only; `grep -ci "bulk catalogue"` = 0 |
| **Import/restore from JSON backup** | **DONE** | Shipped v110; migrations + `parseBackupFile:4258`; pinned by `tests/restore.test.js` |
| **Abbreviation matching in search ("bread gf")** | Not done — never reached the queue | 0 hits; appears only in `HANDOVER-v83` |
| **`TODO(Max)` markers** | Partially / candidate is stale | Exactly **one** survives: `index.html:11`, the absolute production URL for `og:url`/canonical/`og:image`. **No privacy-policy or contact-details TODO exists.** Not in `QUEUE.md` or `PHONE.md` |

### Additional dropped threads

- **The v115 splash rebuild has no device check.** See **C6**.
- **Six orphaned taught packs** (`PHONE.md:89–92`) — open since v107, verified still present.
- **`.invAppr` is still 26×26px** — `css/style.css:829`, markup `js/app.js:6094`. The "inside the protected region" excuse is already disproved (region `5344–5570`). Still the app's last sub-44px target, on its highest-stakes screen.
- **`edDelArmed` is still dead** — `js/app.js:6910`, written `:6937`/`:6949`, read nowhere.
- **Six dead CSS selector families, all still zero-emitting** — re-measured: `.ref-pill` (6), `.db-tools` (2), `.ing-empty` (11), `.an-empty` (20), `.plate-noresult` (1), `.king-tag` (1).
- **Both stale handover comment paths survive** — `index.html:793` names `handovers/HANDOVER-v88.md`, `js/app.js:6189` names `handovers/HANDOVER-v62.md`; both moved under `docs/`.

---

## Nothing to report in

- **Invariants** — every one TRUE.
- **Dead traps** — none recommended for deletion.
- **Test integrity** — 756/756 green, zero skipped, zero todo; no test references anything that no longer exists.
- **Third-party supply chain** — both production scripts pinned exact with SRI, the pdf.js worker exception documented at its call site, no third dependency added.

---

## Filing note (added by the filer, 8 Aug 2026)

The audit agent is read-only and hands its report back rather than saving it.
Three things were checked before filing rather than taken on trust, and two changed the report.

**C1 — filename, resolved deliberately.** The queue item that ordered this audit said to file it as `AUDIT-v116.md`; the agent flagged that as its highest-consequence finding and argued for `v115`.
**Filed as `v115`, and the agent is right.** The `/batch` counter compares the newest `AUDIT-vNN.md` against `sw.js`, which is `ezplate-v115` (`sw.js:2`) because v116 shipped no client asset (`HANDOVER-v116.md:5`).
Filing as v116 would put the counter one version ahead of the thing it measures and buy a free version of silence before the next audit is due.
The queue item conflated the handover diary number with the deploy number; it has been corrected.

**C2 — resolved, and it is NOT drift.** The agent flagged an unexplained loss of 12 Playwright specs between v115 (100/100) and v116 (88/88) and correctly said the repo could not settle it without a browser.
Run here:

```
npx playwright test tests/visual --list                      → 100 tests in 10 files
npx playwright test --list <same, minus screenshots.spec.js> →  88 tests in  9 files
```

**100 is the local total; 88 is CI's set with `screenshots.spec.js` deliberately excluded** because it reads the live production database.
Both numbers were always right about different sets. No spec was deleted, and the "suite nothing runs by default" concern does not apply.

**S1 — confirmed, with one mitigation the agent did not mention.** The guard really is at the call site (`js/app.js:457–459`), not in `ensureDefaultMenu` (`:1016`).
But `js/app.js:1014–1015` already carries *"The caller decides; this function must never guess"*, so a batch that opens the function is warned.
The finding stands — `CLAUDE.md` points at the wrong place — but it is a documentation-accuracy issue, not an undocumented trap.

**C3 — confirmed.** `.mlf-chip .dot{margin:0}` (`css/style.css:504`) and the active-chip tints (`:507–510`) both ship, so `docs/PHONE.md` was asking Max about a UI that was reverted on Max's own instruction. Fixed in `docs/PHONE.md` in this batch.

Everything else in this report was filed as the agent returned it, including the claims it marked UNVERIFIABLE.
**Those are not findings of absence** — they are database claims that need a session with the Supabase MCP, and **S3 in particular says the repo's own stated audit trail does not contain the three foreign keys that Tier 1 states as hard rules.** That has its own queue item.
