# EzPlate project audit

```
Audit at v135, 9 August 2026 — previous audit v125, 10 merges ago.
```

## Verdict

**The project is healthy, and the redesign phase has been unusually well disciplined.** `npm test` is **822/822 green in 0.89s** (66 test files, 0 fail, 0 skipped, 0 todo); Playwright is 118 tests in 17 files locally, 16 files in CI's hermetic set, green on v135. The protected parser region is **byte-identical to the hash the v125 audit recorded** — md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes — meaning twenty deploy versions and ten screen redesigns have now gone past it without a scratch. All six version spots agree at 135 at HEAD *and* at every one of the five shipping commits in this period. Every Tier 1 invariant reachable from the repo is TRUE, no identifier was renamed, and the phase's "no dead CSS" rule was genuinely honoured for classes (`.pill-warn` was held back rather than shipped inert). Five adversarial reviews each caught a major; three spot-checked fixes all hold at HEAD.

**The single most important thing to address is `CLAUDE.md` Tier 2's `pushWrite` contract, which is wrong about the one thing it exists to tell you** (`CLAUDE.md:257`: *"resolves to the result, `{error}`, or `null` when offline"*). There is no `null` return path in `pushWrite`. A caller written to the documented contract — `if (r === null) { /* offline */ }` — would treat the `{error}` object as a success, because it is truthy. This is the same shape as the trap the file itself teaches four sections earlier ("an anon UPDATE returns 204 with NO error — a caller checking only for an error would believe it had written"), and it is being loaded into every message of every batch. Runner-up: the builder-modal contradiction (§2c C1), where `CLAUDE.md` asserts as settled a decision Max reversed on 9 August, and draws a conclusion from it ("the positioning context is already final") that the queue's own sequencing already contradicts.

---

## 1. Invariants

All TRUE. Evidence, in order of load-bearing-ness:

| Invariant | Result | Evidence |
|---|---|---|
| **Protected parser region** | **TRUE — byte-identical to v115 and v125** | Anchors at `js/app.js:5733` (`var INV_EXCLUDE=`) and `js/app.js:5959` (`function unitLabelFor(`). md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes — the hash `AUDIT-v125.md:22` recorded for the next auditor. `git log -L 5733,5959:js/app.js v131..HEAD` returns **no commits**. `tests/_extract.js:67` still slices on both anchors |
| **No twice-defined top-level name** | **TRUE, and the test still asserts absence** | `tests/housekeeping.test.js:182` — `'v111: hard rule 3 is retired — no top-level function in app.js is defined twice'`, asserts `deepEqual(dupes, [])`. Absence, not presence. Green |
| **Naming inversion** | **TRUE, both halves pinned** | `index.html:794` `data-tab="ingredients"` → `aria-label="Products"` / `<span class="nl">Products</span>`; `index.html:796` `data-tab="pantry"` → `"Ingredients"`; `:798` `builder` → `"Plates"`. `tests/terminology.test.js:102` and `:115` pin the attributes *and* the crossing (nav button + panel h2). **Note:** the v3 sidebar and the mobile bar are one element set, so the guard's first-match regex still covers everything — no second nav was introduced |
| **Six version spots** | **TRUE at HEAD and at all five shipping commits** | `sw.js:2` `ezplate-v135`; `sw.js:5` two `?v=135`; `index.html:31,814` two `?v=135`; `js/app.js:4405` `APP_VERSION='v135'`. Verified per-commit for v131/v132/v133/v134/v135 — every one internally consistent |
| **Four protected functions** | **TRUE, present and unrenamed** | `packToUnitCost` `js/app.js:979`, `applySupplierMemory` `:5812`, `unitCatCategory` `:5830`, `resolveMatchedPrice` `:5846` |

Also verified clean this pass: all five history-series variables distinct (`js/app.js:1430,1442,1488,1567,1650`); `st-*` tint still derived from `invRowState` (`js/app.js:6496`) with auto-tick pinned to `'matched'` (`:6468`, `:6540`); `.muted-row` hiding still scoped to `.is-new` (`js/app.js:6409-6410`, `css/style.css:1575`); the watchdog still bumps `gemToken` (`js/app.js:6658`); `productRefs` still checks both arms (`js/app.js:2109`); `plateToRow` still omits `menu_id` (`js/app.js:175`); every `.delete()` is `.eq()`-scoped (5 sites, `js/app.js:263,265,1860,7212,7331`); `setProduct` is still the sole writer into `ing_price_history` (`logIngPrice:1511` has exactly one caller, `setProduct:612`); both third-party scripts still pinned exact with SRI (`index.html:811-813`, `js/app.js:5577-5583`, worker exception documented at the call site).

---

## 2a. `CLAUDE.md` claims verified one at a time — STALE or WRONG

Roughly 60 discrete claims were checked. **The v125 audit's S1–S5 all landed** in `5c0dfc1` (HANDOVER-133) and read correctly today. Five new problems:

**S1 — `pushWrite`'s documented return contract has a value that does not exist.** *(consequence: high)*

> `CLAUDE.md:257` — *"**`pushWrite` returns its settled promise** - resolves to the result, `{error}`, or `null` when offline."*

`js/app.js:62-83` has exactly three return paths and **none of them is `null`**:

```js
if(!SUPA){ ... return Promise.resolve(noClient); }        // {error:{message:'No database connection'}}
return Promise.resolve().then(builder).then(function(res){
    if(res && res.error) return fail(res.error);          // {error:e}
    setSync('ok'); return res;                            // the result
  }).catch(fail);                                         // {error:e}
```

Offline, the fetch rejects and lands in `.catch(fail)` → `{error:e}`. The rule is used for exactly the case where it is most dangerous — *"Use it whenever write B depends on write A landing"* — and a batch following it literally would branch on `=== null`, get an `{error}` object, and sequence a dependent write after a failure. No live caller relies on it (all use `!r || r.error`), so this is a latent instruction hazard, not a shipped bug. **Likely origin, worth stating in the correction:** `dbPushMenuAfterPlate` *does* return `null` on plate-push failure (`js/app.js:5370`) — that is a different function's contract that migrated into `pushWrite`'s.

**S2 — "drops writes silently when fully offline" is wrong on the word that matters.** *(consequence: medium)*

> `CLAUDE.md:259` — *"**Known gap, flagged not fixed:** `pushWrite` drops writes silently when fully offline - no queue, no retry."*

"No queue, no retry" is TRUE. "Silently" is FALSE, and has been since the `fail` handler was written: `js/app.js:71-75` sets sync state to `error` and toasts *"Couldn't save … — you're offline. It has NOT been saved."*, with a comment stating the intent outright (`js/app.js:72`: *"Offline only changes the WORDING — never whether the user is told"*). The file's own top section says an occasional user *"would rather be told a thing did not save"* — the app already does exactly that, and this line says it does not. A batch reading it could build a warning that exists, or assume the user is uninformed when deciding a UX question.

**S3 — Tier 2 fragile areas: "the positioning context is already final" is now false.** *(consequence: medium — see C1, where it is half of a contradiction)*

> `CLAUDE.md:320` — *"The dropdown placement work is therefore UNBLOCKED - the positioning context is already final."*

Both halves fail. `docs/QUEUE.md:202` gives the floating-layers item `Do after: **V6**`, so it is **not** unblocked; and `docs/QUEUE.md:68-71` converts the builder to a full page in V5, so the positioning context is **not** final. The queue's plan to fix the modal line at V5 (`docs/QUEUE.md:74`) names only *"builder IS a MODAL"* — this sentence is not covered by that plan and would survive the edit.

**S4 — the "no dead CSS" standing rule was kept for classes and broken for tokens.** *(consequence: low)*

`docs/QUEUE.md:51` requires *"v3 tokens land ONCE in V1 as CSS custom properties and every screen consumes them"*, and the phase's own CSS restates the law (`css/style.css:3202`: *"NOT shipped yet, each waiting for its first real consumer (the no-dead-CSS law)"*). Class discipline held — `.pill-warn` genuinely has no rule anywhere. But **six tokens shipped in V1 with zero `var(--…)` consumers**: `--skeleton` (`css/style.css:87`), `--danger-border` (`:97`), `--toast-bg` and `--toast-action` (`:98`), `--accent-tint` and `--accent-tint-ink` (`:92`). Only `--skeleton` carries a "V8 emits them" note; the other five carry comments naming a use ("destructive outlines, error banners", "toast chip", "avatars, mobile active chip") that no rule implements. These feed the already-queued Dead CSS sweep the phase promised not to grow.

**S5 — `localStorage` key enumeration: the exception is real and is now invisible to a literal grep.** *(consequence: low, but see D4)*

`CLAUDE.md:245` — *"localStorage holds view preferences and derived caches ONLY - never data."* Ten keys exist. Nine are preferences or caches. The tenth is `cafeDB_plateDraft` (`js/app.js:1149`), which holds a user's unsaved plate — authored content existing nowhere else. It is deliberate and documented at the site, the v125 audit flagged it as S7 and asked for it to be named as the known exception, and it was not. Note for the next auditor: it is bound to `const DRAFTKEY`, so a `localStorage.getItem('...')` grep finds nine keys and misses this one — a live instance of the charter's *"an identifier can be reached without being named literally."*

### UNVERIFIABLE this session

**No Supabase MCP tool was exposed to me** (`mcp__supabase__*` returned *No such tool available*), though `claude mcp list` shows the production server connected — see D1. Carried unverified, unchanged from v125: `ingredients.updated_at` carrying one timestamp per row; `safeupdate`'s behaviour split between `authenticator` and `postgres` (measured and recorded at `supabase/migrations/20260803_restore_backup_fn.sql:83`); anon UPDATE/DELETE returning 204 with no error; `list_migrations` being empty; the "84 of 179 plate lines" count. The three foreign keys were verified against production on 8 Aug (`AUDIT-v115.md` addendum) and nothing in v126–v135 touched schema.

---

## 2b. Dead traps recommended for removal

**None. Third consecutive clean result.** All 16 Tier 1 entries were checked by going to find their subject; every one is in live code, is a decision, or is the trap-worked shape.

- **Live code, still reachable:** naming inversion (`index.html:792-799`) · `isFinite('')` (the two-guard split is intact at `js/app.js:1515`) · protected parser region · row boundary / `buildBackup` (`js/app.js:4571-4586`) · cross-referencing writes (`dbPushMenuAfterPlate:5367`, `dbDeletePlateAfterDishes`) · gating the last committing action (`invConfirmState`, `gemToken:6647-6665`) · `productRefs` + `publishPlan` · five history series · `addProduct` (`js/app.js:751`, one reference — its own definition; still reached only by `fresh-states.spec.js` at five sites, matching the queue's count).
- **The "trap worked, a test enforces its absence" shape — must stay:** the duplicate-definition entry. Deleting it removes the reason `tests/housekeeping.test.js:182` exists.
- **Decisions, true regardless of the code:** per-publication counting · the client's role is not the MCP's role · the three foreign keys · the absence of a back-pointer · chart colour anchored to target · `ingredients.updated_at` is not history (a prohibition — zero readers is the trap working).

One Tier 1 entry is worth *re-reading* rather than deleting: **`addProduct`** now depends on a spec the queue is scheduled to retire (`docs/QUEUE.md:227-229` already flags the coupling). It is correctly queued; noted here only so the next audit does not treat it as newly discovered.

---

## 2c. Contradictions

**C1 — the builder's shape is stated as settled in one file and reversed in the other, and the code supports the reversal's premise being about to become true.** *(high)*

| Location | Wording |
|---|---|
| `CLAUDE.md:319-320` | *"**The builder IS a MODAL and has been since v54; Max confirmed this shape on 8 Aug 2026 against a recommendation to change it** … The dropdown placement work is therefore UNBLOCKED - the positioning context is already final."* |
| `docs/QUEUE.md:44` | *"**The builder becomes a FULL PAGE (V5). This REVERSES Max's 8 Aug modal decision - explicitly, not quietly** … `CLAUDE.md` Tier 2 still says 'the builder IS a MODAL'; **updating that line ships with V5** - the yes given here covers that edit."* |
| `docs/QUEUE.md:202` | Floating layers and mobile dropdowns: *"**Do after: V6**"* |

**What the code supports:** the builder is a modal *today* (`openBuilder()` → `show('builderModal')`, `js/app.js:5208`) — so the first clause is true at HEAD. The deferral of the `CLAUDE.md` edit to V5 is a deliberate, recorded decision and is defensible. What is **not** covered by it, and is wrong today rather than at V5, is the second sentence: the dropdown work is not unblocked (the queue sequences it behind V6) and the positioning context is not final (V5 rehouses it). This is the precise failure the same paragraph's own parenthetical describes — *"the old future-tense wording cost a whole batch hunting a conversion that had shipped two years of versions earlier."* The v125 audit fixed the tense on 9 August and Max reversed the underlying decision the same day; the correction was stale within hours, and only its first half is scheduled for repair.

**C2 — three instructions addressed to a named future batch; that batch ran and answered none of them.** *(medium — and this is the systemic one)*

All three were written *at* or *for* V4a. V4a shipped as v134 (`e4f8129`). None was acted on, and `HANDOVER-141-menu.md` does not mention any of them (`grep -i "vocab|tbl-head|target|reconcile"` → no hits).

| Instruction | Where | What happened |
|---|---|---|
| *"⚠ **V4a**: the four static tabs' 48px title-bar rule … still outranks this class — **the Menu batch must reconcile the two when it becomes the second consumer, not paper over it**"* | `css/style.css:3222-3224` | V4a's diff touches `tbl-head` **zero times** (`git show e4f8129 -- css/style.css \| grep -c tbl-head` → 0). It used a separate `#tab-analysis .atable thead th` rule instead. Not reconciled, not answered |
| *"Three vocabularies name the same three lights … **Best decided inside V4a (Menu) / V6 (modals)**"* | `docs/QUEUE.md:252` | V4a shipped; item untouched, still routed to a batch that has been |
| *"V4a redesigns this screen and is **the place to revisit** the mobile framing"* (mobile verdict text lacks the word "target") | `HANDOVER-138-verdict-cell.md:29` | V4a explicitly left mobile alone (*"Mobile is unchanged until V9"*). Reached neither `QUEUE.md` nor `PHONE.md` |

The queue already solved this class for *dependencies* — `Do after:` is deleted the moment it is satisfied, precisely so a satisfied line becomes visibly stale (`docs/QUEUE.md:16-18`). There is no equivalent for *"do this IN batch X"* notes, so they read as sound advice forever and nothing checks them when X runs.

**C3 — the same mechanism described as a live hazard in one place and as fixed in another.** *(low, and a smaller instance of C4)*

`css/style.css:3203` states `.pill-warn` is *"waiting for its first real consumer … (V4a's Menu rows)"*. V4a shipped and did not consume it; the comment now points at a batch in the past. The token is correctly absent (no dead CSS) — only the note is stale.

---

## 3. Test drift

Nothing serious. In order:

1. **`screenshots.spec.js` never runs in CI and has for its whole life** — deliberately excluded because it reads the live production database (`.github/workflows/test.yml:176-186`). It carries 2 assertions for the whole file and is already queued (`docs/QUEUE.md:219-229`, `Do after: V10`). Unchanged, correctly landed, not drift so much as a known state.
2. **A count comment in the CI guard is stale by 8 specs.** `.github/workflows/test.yml:174` — *"Latent today (9 specs, 8 survive the filter)"*. Actual: **17 specs, 16 survive**. The guard itself is correct and fails closed; only the number lies. It matters because that comment is the reader's evidence that the empty-list case is latent.
3. **No unexplained test-count drop.** Unit test files grew monotonically 64 → 64 → 65 → 66 → 66 across v131→v135; specs 15 → 15 → 15 → 16 → 17. 822 unit tests at HEAD vs the v125 audit's measured 799 — +23 across six batches, all attributable to `menu-pills.test.js` (100 assertions), `kpi-strip.test.js` and the V1 additions. **Caveat worth recording:** no handover in this period states a test count, so a *drop* between two batches could only be caught by an audit measuring at HEAD, not by comparing paperwork.
4. **`docs/QUEUE.md:138` quotes "~799 tests"** in the Stryker item; actual 822. Attributed to the v125 audit and hedged with `~`, so low-harm — but it is the number the Stryker case rests on.
5. **No test references anything that no longer exists.** Every file `CLAUDE.md` names was verified present: `_extract.js`, `price-log-paths`, `restore`, `trend-reframe`, `terminology`, `housekeeping`, `empty-states`, `builder-modal`, `invoice-gate`, `inv-gemini-merge`, `dash-persist`. `node tests/smoke.js` passes all 25 blocks.

**Spot-check of the three review-caught majors — all three hold at HEAD:**

- **`sideSettings` `[data-tab]` wiring guard (v132):** `js/app.js:1404` — `document.querySelectorAll('.navbtn[data-tab]')`, with the reason at the line. `currentTab()` is separately guarded (`js/app.js:1377`: `if(b&&b.dataset.tab)`). Pinned by `tests/visual/q9-settings.spec.js:27-44` driving the real click.
- **KPI strip `has-kpis` empty-state gating (v133):** class applied conditionally at `js/app.js:4246`; the hide is gated at `css/style.css:3248-3249`; `kpiStripHtml` returns `''` on empty data, asserted at `tests/kpi-strip.test.js:121`.
- **Plates band fixed grid tracks (v135):** band and rows share identical fixed tracks — `css/style.css:3038` and `:3318` both `minmax(0,1fr) 200px 120px`. Pinned against an *uncosted* row on purpose in `tests/visual/v135-plates.spec.js:42-53`, with the emit-only-when-rows-present behaviour at `:84-93`.

---

## 4. Recurring symptoms

**R1 — `max-content` grid tracks resolving per-container. Fixed twice; three more instances survive, on the two screens next in the queue.** *(the highest-value finding in this section)*

Two fixes, different framings, same mechanism:

- `HANDOVER-128-builder.md:36` (v125): *"the qtybox's ~116px min-content overflowed its 92px grid track leftward into the name column"* — chased as a flaky test through three wrong theories.
- `HANDOVER-142-plates.md:28` (v135): *"`max-content` grid tracks resolve per-container, so the 'Published' header sat 22px off an uncosted row's value - and the same mechanism had rows disagreeing with each other by 27px since Q4, hidden behind a false comment."*

The v135 fix was applied to `#plateList` only. The identical shape — a **per-row grid container** with a `max-content` track, so each row resolves it independently — still ships in three places:

| Location | Selector | Screen |
|---|---|---|
| `css/style.css:3066` | `#kingList .king-row{grid-template-columns:minmax(150px,.7fr) minmax(0,1.6fr) max-content}` at ≥640 | Ingredients — **V4c, the next queue item**, which adds a column band |
| `css/style.css:3175` | `#ingList > .ing-card{grid-template-columns:minmax(0,1fr) max-content 72px}` at 640–899 | Products — **V4d** |
| `css/style.css:2468` | `.atable:not(.invtable) tbody tr.mi-row{grid-template-columns:max-content max-content 1fr auto}` | Menu mobile rows |

Each row is its own grid container (`.king-row` is `display:grid` at `css/style.css:1916`, `.ing-card` at `:1110`), so the drift is structural, not incidental. V4c's queue entry (`docs/QUEUE.md:58-60`) asks for exactly the column layout that made this visible on Plates. **The root cause is now named twice and fixed once — this is the moment to fix it by shape rather than by screen.** Lower risk, listed for completeness: `css/style.css:3018` (`#plateList` below 640) and `:3158` (`#ingList` mobile) have no band to misalign against today.

**R2 — "a test that cannot fail". Ten recorded incidents, no root cause, remedy approved and not started.** *(medium)*

`HANDOVER-v91:149,159` · `v112:115,185` · `v114:254-257` · `v118:52` · `v122:61` · `130-t1-guard:29` · **`139-v1-tokens-shell:32` and `:35` (two in one batch)** · `140-table-dashboard:33` · `141-menu:29`. Every one was caught by a reviewer or a browser drive, never by the suite. This period alone contributed four. The remedy — Stryker mutation testing scoped to the fragile areas — was **approved by Max on 9 Aug** (`docs/QUEUE.md:135-140`) and sits mid-queue behind the entire v3 phase. Given four incidents in five batches, its position is worth Max's eye.

**R3 — "stubs that lie about the real function's contract". Three incidents in three consecutive batches.** *(medium)*

`HANDOVER-139` (a stub hid `showTab(undefined)` because it asserted DOM counts) → `HANDOVER-140:34` (*"the unit stub had hidden [a `30%%`] by mirroring `fmtTargetPct` wrongly - the second stub-lied incident in two batches"*) → `HANDOVER-141:31` (*"a hand-rolled `esc` missing `>`; the real function is now extracted instead. **Three batches running, the same lesson**"*). There is a fourth, older instance: `HANDOVER-v113.md:263` (*"A passthrough stub hid a real escaping"* — the fix there was the same one 141 reached, using the app's own `esc`). Four incidents, one known-good remedy (extract the real function rather than stub it) applied three times locally and never written down as a rule. **This is a candidate Tier 1 entry** — it has cost real time four times and no batch is required to know it. Recommend proposing it to Max rather than leaving it in three handovers.

**The charter's known three: zero new occurrences this period.** Pack-size persistence — no handover in 123–142 mentions it. Invoice flag-pill alignment — last touched `HANDOVER-v104`. Menu / empty-state centring — last fixed v70, still queued with `Do after: V10` and the reasoning intact (`docs/QUEUE.md:159-166`).

---

## 5. Dropped threads

### The charter's named candidates

| Thread | Status | Proof |
|---|---|---|
| **Staging Supabase** | **Not done — but this audit found the cause, and the queue names the wrong one** | See D1 below |
| **Eval harness for the invoice reader** | **Not done** — properly queued, unchanged since v125 | `docs/QUEUE.md:142-149`. Landing is fixed; work not started; the open question (where the commercial invoice corpus lives) is still open |
| **`manager` as a third role** | **DONE — closed by decision** | `docs/QUEUE.md:309`: *"DECIDED (Max, 9 Aug 2026, `docs/decisions/2026-08-09-ANSWERS.md` Q3): **TWO roles - owner + working staff** … No manager role unless a real person at a real café needs one later."* Correctly recorded on the item that owned the question |
| **The privacy revisit** | **Not done** — queued, named the top gate in two places | `CLAUDE.md` Tier 2 privacy gate; `docs/QUEUE.md:317-323`. Unchanged from v115 and v125. Residual gap also unchanged: the only user-facing privacy text is a Settings hint, not a policy |
| **Bulk catalogue bootstrap** | **Not done** — named explicitly inside Onboarding, as the v115 triage asked | `docs/QUEUE.md:311-315` |
| **Import/restore from JSON backup** | **DONE** | Shipped v110; `parseBackupFile` at `js/app.js:4641`, accepts formats 2 and 3 and refuses 1 by name (`:4646-4661`); pinned by `tests/restore.test.js` |
| **Abbreviation matching in search** | **DONE — shipped v55; the thread was never dropped** | `docs/QUEUE.md:427`; worked example at `js/app.js:673` |
| **`TODO(Max)` markers** | **DONE — zero remain** | `grep -rn "TODO(" js/ index.html sw.js css/ api/` returns **nothing**. The last one (absolute `og:url`/canonical) shipped in Q9/v128 — `docs/QUEUE.md:361` |

### D1 — Staging: the queue's most likely cause is wrong, and the real one is a one-step fix

`docs/QUEUE.md:183` — *"Most likely cause, untested: the free project has **paused** after a week idle … Second candidate: the second server needs approval that only the first received."*

Measured this session:

```
supabase:          …project_ref=izrnptxhdylllodvglla (HTTP) - ✔ Connected
supabase-staging:  …project_ref=pboidoxjghntalovzrke (HTTP) - ⏸ Pending approval (run `claude` to approve)
```

**It is the second candidate, not the first.** The server is not failing to connect and the project is not diagnosably paused — the server has never been approved in this environment, which is why only the production namespace has ever existed at runtime. The queue's prescribed next step (*"unpause the project in the dashboard, restart the session"*) would not have resolved it. This unblocks the item's whole dependent set — migration rehearsal, destructive testing, empty-account testing — and removes the standing warning at `docs/QUEUE.md:185` and `CLAUDE.md` Tier 3 that every migration is unrehearsed. Worth Max's attention above everything else in this section.

### D2 — `docs/PHONE.md` received nothing across six deploy versions, including a whole-app repaint

Newest entry is **v129**. Nothing for v130–v135. Each handover states *"New docs/PHONE.md items: None"*, and for V2/V3/V4a/V4b that is correct — those changes are gated at ≥640 or ≥1024.

**v132 is not.** The v3 palette is on `:root` (`css/style.css:82-98`) and applied at `body` (`:125`); the Geist `@font-face` block is global (`:40-47`); dark mode was removed everywhere and `cafeCost_theme` is deleted at boot (`index.html:7`). `HANDOVER-139-v1-tokens-shell.md:12` says *"Below 1024 the layout stays today's (**new tokens only**) until V9"* — new tokens are new colours, and the typeface changed on every screen. So Max's installed PWA now has a different typeface, a different palette and no dark mode, and `PHONE.md` — the file that exists for *"things only a device can settle"* — has not one line asking him to look. Font rendering, contrast on a real OLED in kitchen light, and the disappearance of a mode he may have been using are precisely device questions.

### D3 — three notes routed to V4a evaporated

Fully documented as **C2** above. Listed here too because their landing place is the question: the mobile "target" wording (`HANDOVER-138:29`) reached neither `QUEUE.md` nor `PHONE.md`, which is the interesting kind.

### D4 — the v125 audit's S7 reached nothing

That audit recommended naming `cafeDB_plateDraft` as the known exception to *"localStorage … never data"*, *"so the next batch does not re-derive it."* `grep -rn "plateDraft|plate draft" CLAUDE.md docs/QUEUE.md` → **no hits**. The exception is real and live (`js/app.js:1149`). An audit finding that lands in no file is the exact failure mode this report's own filing note warns about.

### D5 — a note parked in the "done - clear weekly" section, which is deleted weekly

`docs/QUEUE.md:340` — *"**Note for Max:** a 6th menu swaps pills back to the select with no copy - say if that reads as breakage."* This is an open question for Max sitting in the one section of the queue explicitly scheduled for deletion. Its natural home is `docs/PHONE.md` (it is a "does this read as breakage" judgement, and `HANDOVER-141:19` chose not to put it there) or its own item.

---

## Nothing to report in

- **Invariants** — every one TRUE. Protected parser region **byte-identical across twenty deploy versions and ten screen redesigns** (md5 unchanged from the v125 record); all six version spots agree at 135 at HEAD and at each of the five shipping commits; all four protected functions present and unrenamed; the naming inversion holds in the markup and is pinned on both halves.
- **Dead traps** — none recommended for deletion. All 16 Tier 1 entries located in live code, or a decision, or the trap-worked-and-a-test-enforces-its-absence shape. **Third consecutive clean result.**
- **Redesign contract compliance** — the phase's standing rules held. Zero identifier renames across five batches. Every `data-tab`, `data-pid`, `data-mid`, `lt-*`/`st-*` class and the `.mi-row` delegate intact. **No hardcoded hex in any v3 CSS section** — every colour literal in `style.css` is inside the `:root` token block, a print rule, or a pre-v3 `var(--x, #fallback)`. New classes have emitters; `.pill-warn` was correctly withheld rather than shipped inert. Deviations *are* recorded at the code (`css/style.css:83` and `:96` carry the measured AA corrections and say the spec's own §7 claim failed measurement).
- **Light-only removal (v132)** — clean. No `prefers-color-scheme`, no `data-theme`, no dark token block anywhere the client ships; the only survivors are historical comments and one cosmetically misnamed `.theme-toggle` class on the Settings button (`index.html:75`, styled at `css/style.css:167`). Stale-key removal is at boot in `index.html:7`, before app.js. All eight woff2 files are on disk, all eight are in `sw.js` ASSETS, and `tests/settings-toggles.test.js:141-146` pins that every ASSETS path exists.
- **`setProduct` as sole writer** — re-traced end to end; `logIngPrice` has exactly one call site. The five history series remain distinct and unmerged.
- **Test suite health** — 822/822 green, 0 skipped, 0 todo; monotonic growth across the period with no drop; no test references anything that no longer exists; CI green on v135 including all 16 hermetic Playwright specs.
- **Third-party supply chain** — unchanged and correct. Both scripts pinned exact with SRI, the worker exception documented at its call site, no third dependency added, no build step. `.vercelignore` still excludes `docs/`, `CLAUDE.md`, `tests/`, `supabase/`, `.github/` and both gitignore spellings.
- **Handover claims vs git** — every one of the five handovers' stated deploy version matches `sw.js` at its commit exactly. No `CLAUDE.md` change was proposed by any batch in this period (`HANDOVER-138` through `142` all state *"Nothing proposed"*), so no proposed change silently failed to land — and all five of the v125 audit's `CLAUDE.md` corrections did land, in `5c0dfc1`.
- **Recurring symptoms, the charter's known three** — pack-size persistence, invoice flag-pill alignment and empty-state centring produced **zero** new fixes in v126–v135.

---

**Filing note.** This report is unfiled. It must be saved by the caller to `/Users/max/Documents/Scoopys-Costing/docs/audits/AUDIT-v135.md` — that filename is what the `/batch` loop compares against `sw.js` to decide when the next audit is due, so an audit whose report is never filed does not exist as far as the counter is concerned, and the gap would keep growing from v125. The queue item that triggered this run (`docs/QUEUE.md:53-56`) states the filing obligation explicitly, so I expect it to be honoured — but I cannot do it myself, and D4 above is what it looks like when an audit finding lands nowhere.
