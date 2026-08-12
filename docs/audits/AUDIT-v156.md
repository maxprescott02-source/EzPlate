# EzPlate project audit

```
Audit at v156, 12 August 2026 — previous audit v145, 11 merges ago.
```

**Commit:** `d1a8e53` (branch `main`, clean, matches `origin/main`). **Window:** batches 146–176, deploy versions `ezplate-v146`–`v156`, following `docs/audits/AUDIT-v145.md`.

## Verdict

**The project is healthy and the code is in good shape. The problem this time is not in the code — it is in `CLAUDE.md`.** `npm test` is **986/986 green in 2.9s**; the hermetic Playwright suite is **274/274 green in 3.7m** across 30 spec files. Every invariant holds: the protected parser region is still byte-identical to the hash first recorded at v125 (`3a630b5823933c8b82008787a54a7943`, 15,232 bytes) across eleven more deploy versions, and all six version spots agree at v156. No dead Tier 1 traps — the fifth consecutive clean result. The queue is disciplined (12 of 20, tier test being applied, both blocked items in front of Max today).

**The single most important thing to address is that `CLAUDE.md` and `.claude/skills/batch/SKILL.md` now jointly tell every batch to stop and defer on migrations, for reasons that stopped being true on 11 August.** CLAUDE.md's Tier 3 still says staging "is EMPTY, so there is still nothing to rehearse against" and that "every migration is still UNREHEARSED against production… defer destructive ones"; batch 172 built the staging mirror, three seeds and a seven-step migration procedure (`docs/STAGING.md`), and that file says at line 5 "That warning is now spent." Separately, `SKILL.md:105` still lists "A migration is needed" as a **stop condition**, which CLAUDE.md records Max explicitly reversing on 8 Aug ("i dont want you to stop for me to hand run a query"). The next four A-items in the queue are all migrations. **HANDOVER-172 proposed exactly the CLAUDE.md correction on 11 Aug and it reached nowhere** — not the decision file, not the queue, not maintenance. That is a wrong instruction being followed, which is the class this audit exists for.

---

## 1. Invariants — all TRUE

| Invariant | Result | Evidence |
|---|---|---|
| **Protected parser region** | **TRUE — byte-identical to the v125/v135/v145 hash** | Anchors `js/app.js:7140` (`var INV_EXCLUDE=`) and `:7366` (`function unitLabelFor(`). md5 `3a630b5823933c8b82008787a54a7943`, 15,232 bytes. Hashed at every shipping commit v146→v156: identical throughout |
| **No twice-defined top-level name** | **TRUE, test unchanged and still asserts absence** | `tests/housekeeping.test.js:168-175`, `assert.deepEqual(dupes, [], …)` |
| **Naming inversion** | **TRUE, both halves pinned** | `index.html:1353` `data-tab="pantry"` → `aria-label="Ingredients"`; `:1366` `data-tab="ingredients"` → `"Products"`; `:1351` `builder` → `"Plates"`. Guards at `tests/terminology.test.js:112-114`, `:133-135` |
| **Six version spots** | **TRUE** | `sw.js:2` `ezplate-v156`; `sw.js:5` two `?v=156`; `index.html:105`, `:1400`; `js/app.js:5253` `APP_VERSION='v156'` |
| **Four protected functions** | **TRUE, present and unrenamed** | `packToUnitCost` `js/app.js:1226`, `applySupplierMemory` `:7219`, `unitCatCategory` `:7237`, `resolveMatchedPrice` `:7253` |

⚠️ **One methodological note for the next auditor, because it cost a false alarm.** The recorded hash is only reproducible with `sliceBetween`'s semantics from `tests/_extractfn.js` (from the start of the first anchor to the start of the second, exclusive). A naive `awk '/var INV_EXCLUDE=/,/function unitLabelFor\(/'` gives `ef6f1b0d…`/15,260 bytes and looks like a violation. The recorded hash should carry its method.

Also re-verified clean: the `isFinite('')` two-part guard (`js/app.js:371`, `:2029`) · `gemToken` bumped in the watchdog (`:8110`) · `publishPlan` the one publish decision, shared (`:1605`, `:6833`) with `renderUnlinkedPrompt` reading `.unlinked` (`:6764`) · `productRefs` both arms (`:2610`) · `plateToRow` still omits `menu_id` (`:349`) · `ensureDefaultMenu` gated at its call site (`:633`), unconditional in the function (`:1325`) · `parseBackupFile` accepts 2 and 3, refuses 1 by name (`:5640`, `:5657`) · `ing_price_history`'s sole writer (`:1917`, `:1976`).

---

## 2a. `CLAUDE.md` claims verified — six stale, ranked

### S1 — the staging clause is false, and it is suppressing the queue's next four items *(HIGH)*

| | |
|---|---|
| `CLAUDE.md` Tier 3, Migrations | *"BUT staging is EMPTY, so there is still nothing to rehearse against… The schema has not been mirrored and no seeds exist, so every migration is still UNREHEARSED against production: say so out loud before applying anything that is not a behavioural no-op, and **defer destructive ones**. The safeguard becomes real when the queue's staging item RUNS."* |
| Reality | The item ran as batch 172 / `ezplate-v152`, 11 Aug 2026. `supabase/staging/01-schema.sql` mirrors all ten public tables with all seven fingerprints matching production including the `restore_backup` body md5; `02`/`03`/`04` seeds exist; `tests/staging-seeds.test.js` pins the guard ordering; `docs/STAGING.md:80-92` carries the seven-step procedure |
| `docs/STAGING.md:5` | *"That warning is now spent; this file replaces it."* |

It also points at "the queue's staging item", which has been deleted from `docs/QUEUE.md`. Queue items 2, 4, 5 and 6 are all migrations that will read this line first.

### S2 — the batch skill still makes a migration a stop condition *(HIGH)*

`.claude/skills/batch/SKILL.md:105`, under "**Stop conditions — the only times to come back to Max**":
> **A migration is needed.** Never bundled, never applied by you. Write it, put it in the item, mark the item blocked.

`CLAUDE.md` Tier 3: *"**Max reversed it**… **A migration is no longer a stop condition.** Write it, apply it, verify it, record it."* CLAUDE.md is later (8 Aug 2026) and quotes Max directly. `SKILL.md:127` also still offers "migration pending" as the `Blocked on:` example. The skill is in-repo and read at step 1 of every batch. Combined with S1: a batch reaching item 4 reads one file telling it to stop and another telling it there is nothing to rehearse against.

### S3 — "`openBuilder` hides the **five** `#tab-*` panes" — it is nine *(MEDIUM)*

`CLAUDE.md` Tier 2, fragile areas, builder bullet. Actual: `js/app.js:1683` `TAB_PANES` = `['builder','ingredients','analysis','dashboard','pantry','invoices','settings','account','more']`, and `index.html` has nine `id="tab-*"`. F8/F9/F10 and 171 added four. The count matters: `js/app.js:6431`'s own comment says *"a pane missing here renders UNDER the builder page"*.

### S4 — "`:not([hidden])` is used **twice**" — it is used ten times *(MEDIUM)*

`CLAUDE.md` Tier 1, `[hidden]` corollary. Actual, `css/style.css`: `:520`, `:547`, `:1055`, `:1425`, `:3377`, `:3415`, `:3499`, `:3934`, `:4051`, `:4108`. The rule is alive and earning its keep — 175's clear-× fix does nothing without it on `.plib-x`/`.ms-clear`, and `tests/inv-upload.test.js` now fails if any `.inv-step` display rule loses the guard. Under-counting makes an app-wide idiom read as a curiosity.

### S5 — a drifted line number and a wrong key count, in the clause written to stop rediscovery *(LOW-MED)*

`CLAUDE.md` Tier 2: *"(Grepping the key STRING still finds the constant at `js/app.js:1152`.)"* — `DRAFTKEY` is at **`js/app.js:1400`**. And *"A `localStorage.getItem('...')` grep finds the other **nine** keys"* — the call-site grep finds **seven**; there are **twelve** other `cafe*` keys, including `cafeCost_env`, added by 172. HANDOVER-172 flagged that tenth key too and that half also never landed. CLAUDE.md's own closing test says line numbers belong to git; `docs/MAINTENANCE.md:9` says "Re-grep by NAME, never by the number."

### S6 — the stub-family incident count is under-stated *(LOW)*

`CLAUDE.md` Tier 1: *"Four incidents, one remedy… v113, 139, 140, 141."* At least three more since v145 (see §4 R1). Not a wrong rule — a wrong number under a rule being invoked constantly.

**Re-verified TRUE, no action:** the three foreign keys verbatim against `supabase/staging/01-schema.sql:215-246` (`menu_items_plate_id_fkey` carries no ON DELETE → NO ACTION; both others SET NULL) · ten public tables · both third-party scripts pinned exact with SRI (`index.html:1397-1398` `supabase-js@2.110.8`; `js/app.js` `ensurePdfjs` `pdfjs-dist@3.11.174`, worker pinned-only as documented) · no analytics · `api/_gemini.js`/`_insight.js` underscore-prefixed, routes thin · four client files, no build step · `addProduct` dead in app with exactly five references, all in `tests/visual/fresh-states.spec.js` · `#plateActionsModal` deleted (tombstone at `index.html:985`) · zero `TODO(` markers · the KPI-anchoring line AUDIT-v145 D4 left pending has since landed (`CLAUDE.md:219`).

---

## 2b. Dead traps recommended for removal

**None. Fifth consecutive clean result.** Every Tier 1 entry was checked against current code and every subject is present. Two were pressed hardest because they read as historical:

- **The `@media` specificity rule** — its five F3/v139 instances are shipped and fixed, so it looks spent. It is the *trap-worked* shape: 175's pre-push review caught a comment at `.ing-tag.sup` whose stated mechanism was backwards in exactly this way, and 176's whole CSS-syntax incident came out of the same file region. Keep.
- **Per-publication counting** and **"the client's role is not the MCP's role"** are *decision* entries, true regardless of what the code does. Keep.

Everything in §2a is a correction to a number or a citation **inside a live entry** — none of them is a deletion.

---

## 2c. Contradictions

- **C1 *(HIGH)* — migrations.** `.claude/skills/batch/SKILL.md:105` ("stop condition") vs `CLAUDE.md` Tier 3 ("no longer a stop condition", 8 Aug 2026, Max's words quoted). CLAUDE.md is later; the code supports neither directly but the owner decision is unambiguous. = S2.
- **C2 *(HIGH)* — staging.** `CLAUDE.md` Tier 3 ("nothing to rehearse against") vs `docs/STAGING.md:5` and `docs/QUEUE.md:84`, `:125`, `:140`, `:169` (four items marked ✅ *rehearsable* / *rehearsed*). Five locations say staging works; one says it does not. **The code supports the five** (`supabase/staging/*`, `tests/staging-seeds.test.js`, `tests/env-fence.test.js`). = S1.
- **C3 *(MEDIUM)* — which reviewer is mandatory.** `CLAUDE.md` Tier 3: the pre-push `code-review` agent is *"MANDATORY… whenever the diff changes WHAT RUNS"* and *"the only thing standing between a mistake and production"*. `~/.claude/skills/new-branch/SKILL.md:78,81`: *"The PR workflow is MANDATORY and runs itself"* / *"The `code-review` agent is OPTIONAL"*. Both halves backwards. The code supports CLAUDE.md — `.github/workflows/code-review.yml:14,21,64-65` is `workflow_dispatch` + `deep-review` label only. Open since 10 Aug (HANDOVER-149), raised as AUDIT-v145 D3, queued at `docs/MAINTENANCE.md:269-275`, unchanged. **It has now cost something: `HANDOVER-176:120-125` records the first batch to ship with no pre-push review at all** — *"the brief said 'no code review pass, just implement'"* — while CLAUDE.md Tier 3 says a brief cannot relax its rules.
- **C4 *(LOW)* — commit title vs shipped version.** HEAD `d1a8e53` reads "(ezplate-v155)" and its diff bumps the six spots to **v156**. Reconciled deliberately at `HANDOVER-176:4-6` (two batches, one PR at Max's request, one deploy, one number). Noted only so a future `git log` search for v156 does not come back empty.
- **C5 *(LOW)* — a maintenance entry describing a fixed bug and pointing at a deleted item.** `docs/MAINTENANCE.md:321-332` says `--text3` is undefined so `.side-theme`'s icon renders unmuted, and routes the fix to *"the **Desktop shell polish** queue item, which is already measuring that region."* Both halves are now false: `grep -n -- "--text3" css/style.css` returns **nothing** (176 deleted those rules when it rehomed the theme toggle), and that queue item shipped and is gone. Recommend deleting the entry.

---

## 3. Test drift

1. **T1 *(MEDIUM)* — the CI hermetic spec count is stale for the third consecutive audit.** `.github/workflows/test.yml:238`: *"Latent today (22 specs, 21 survive the filter)."* Measured: **31 specs, 30 survive**. The comment at `:239-242` records that this number *"had been wrong for ten batches, flagged by two consecutive audits"* and instructs a re-measure — it was corrected at v145 and drifted again inside eleven versions because nine specs were added. **The guard is correct and fails closed** (`tests/ci-workflow.test.js:230`); only the number lies. Worth fixing as a *mechanism* this time rather than a third number update — `ci-workflow.test.js` already parses that job and could assert the comment against the directory.
2. **T2 *(MEDIUM)* — the handovers' Playwright counts use a different filter from CI's, and the difference is the live-production spec.** `HANDOVER-176:124` claims *"288 Playwright"*. Measured: CI's filter (`ls tests/visual/*.spec.js | grep -v screenshots.spec.js`) = **274 in 30 files**; whole directory = **288 in 31 files**. The 14-test delta is exactly `tests/visual/screenshots.spec.js`, which imports only `gotoTab` (`:16`) and **never calls `installBoot`** — so it does not stub Supabase and does not abort off-origin requests. Its own header: *"the app talks to your live Supabase."* So the stated green figure came from a run including the one spec CI has an explicit fail-closed guard to exclude, and is not the number CI guarantees. Reads only, so not a data risk — but the batch that reported it also skipped its review.
3. **T3 *(LOW)* — the Stryker item's suite count is stale for the third audit running.** `docs/MAINTENANCE.md:113`: *"878 tests in ~1.6s (measured 11 Aug 2026; 848 at the v145 audit, 822 at v135 — **re-measure, this number has been found stale by two audits running**)."* Actual **986 in 2.9s**. The plea to re-measure is itself the stale part now.
4. **No unexplained drop.** 848 → 986 unit (+138), all attributable (`unique-ids`, `auth`, `staging-seeds`, `cat-label`, `css-syntax`, `env-fence`, trend/KPI). Playwright 221 → 274 hermetic. Eight specs were rewritten across 175/176 with the superseded assertion consciously inverted and the old argument quoted, never deleted to go green.
5. **Nothing pinned to a layout the fold-in replaced.** Every spec has been touched within four days except `v115-reframe.spec.js` (8 Aug) and `q8-invoice.spec.js` (9 Aug), both covering screens converted before those dates. Spot-checked `_extractfn` consumers, `v151-more.spec.js`'s More selectors and the `v155-*`/`v156-*` set — all current.

---

## 4. Recurring symptoms

### R1 *(HIGH)* — "a green test that cannot fail" recurred three more times, and AUDIT-v145's reason for deferring the fix is now falsified

AUDIT-v145 §5 searched deliberately for a fourth instance, found none, and concluded *"the Stryker item does not get an earlier slot on this evidence — the batches are currently catching these themselves."* Since then:

- **172** (`HANDOVER-172:49`): *"The test written to pin exactly this class of ordering scans `js/app.js` only, because `loadApp()` reads `js/app.js` only, so it could never have failed on this… I wrote another one."*
- **175** (`HANDOVER-175:158-161`): *"MAJOR, and it was mine: a green test that proved nothing."* `v155-trend.spec.js` wrapped its comparison in `if (rows.mk.length)` while `boot()` never seeded `changeLog`, so the loop never ran — *"reverting the very `padB` split it claims to pin would not have failed it."* **Caught by the pre-push review, not by the batch.**
- **176** (`HANDOVER-176:97-102`): the Products truncation test went vacuous when the fix removed the pressure its precondition assumed. *"That is the second vacuous test found in two batches, both mine, both green."*

Three in five batches, one caught only by the reviewer — **and the very next batch shipped without one.** The self-catching mechanism v145 relied on is precisely what 176 turned off. `docs/MAINTENANCE.md:114` still quotes v145's conclusion as the argument against promoting Stryker; that sentence should be struck whatever else is decided.

### R2 *(MEDIUM)* — a recorded owner decision silently reverted by an unrelated batch. Second instance.

- PR **#159** (batch 172) deleted **33 lines** from `docs/design_handoff_ezplate_redesign/FOLD-IN-PROTOCOL.md` — *both* 10 Aug 2026 amendments, Max's override of §0a (no revert pass) and the `.legacy` strike — by sweeping in the vendor's pristine copy. Neither the pre-push review nor the merge noticed. It survived three batches until 175 found and restored it: *"Without them the file told a reader to revert nineteen shipped versions, and contradicted QUEUE.md."*
- First instance, `HANDOVER-156`: *"the `HANDOVER-149` done entry claimed a new standing sequencing rule landed in `CLAUDE.md` when its own pre-push review had removed it before merge."*

Same class both times: a decision recorded only in prose is unpinned by any test, so the diff that reverts it reads green. Worth naming — the S1 staging correction is sitting in exactly that unpinned state right now.

### R3 — the charter's known three: **zero occurrences**

Pack-size persistence and invoice flag-pill alignment appear nowhere in HANDOVER-146 → 176. Menu/empty-state centring is unchanged at `docs/MAINTENANCE.md:186-189` — still four fixes with no named root cause, and its `Do after: F10` is now satisfiable (see D4).

### R4 *(LOW, forming)* — "I explained a defensive line and got the mechanism wrong"

`HANDOVER-169` named it at two instances and wrote *"If it happens a third time it is a rule."* It happened a third time in 175 (the `.ing-tag.sup` comment: *"A COMMENT WHOSE STATED REASON WAS BACKWARDS… Being above is precisely what loses"*), and a fourth sits unfixed at `docs/MAINTENANCE.md:253-259` (two CSS comments stating the `[hidden]` mechanism wrongly, open since 10 Aug). By 169's own test the threshold is passed. Flagging, not proposing — only Max adds to CLAUDE.md.

---

## 5. Dropped threads

- **D1 *(HIGH)* — the CLAUDE.md staging correction that HANDOVER-172 proposed reached nowhere.** It is not in `docs/decisions/2026-08-12.md` (which asks Max two unrelated questions), not in `docs/QUEUE.md`, not in `docs/MAINTENANCE.md`. It exists only in a write-once handover that nothing re-reads. Four batches have shipped over it. This is the interesting kind — and by `docs/MAINTENANCE.md:267`'s own standing note (*"this is the THIRD instance of a correction being written down and not propagated. If a fourth turns up, the routing itself is the item"*), **this is the fourth.**
- **D2 *(MEDIUM)* — HANDOVER-176's proposed Tier 1 rule is on the same track.** *"A CSS syntax error is SILENT, and it discards every rule after it"*, with `tests/css-syntax.test.js` as the shipped guard and a real incident behind it. Recorded only in the handover; no decision-file entry. One batch old, so not yet dropped — but the mechanism that dropped D1 is unchanged.
- **D3 *(MEDIUM)* — `~/.claude/skills/new-branch/SKILL.md`.** AUDIT-v145 D3, unchanged at `:78,81`, 21 batches after HANDOVER-149 found it, still read at the start of every batch including whichever one eventually fixes it. Now demonstrably costly — see C3.
- **D4 *(LOW)* — four satisfied `Do after: F10` lines in `docs/MAINTENANCE.md`** (`:129`, `:189`, `:205`, `:218`). F10 shipped as `ezplate-v149` on 11 Aug. `docs/QUEUE.md:6` says a `Do after:` is deleted the moment it is satisfied, and 171's sweep did that for QUEUE — MAINTENANCE was not swept. Four C items read as soft-blocked when they are not, including the Menu/empty-state-centring root cause, which is the only one of the charter's three recurring symptoms still open.
- **D5 *(LOW)* — `docs/PHONE.md` has had no entry since 171/v151, and batches 175 and 176 have no "New docs/PHONE.md items" section at all.** (172, 173 and 174 each have one, saying none — so this is an omission, not a judgement.) Between them 175 and 176 changed things only a phone shows: "steady" became a dash on Products *and* Ingredients, the `/kg` suffix got smaller and dimmer on every money row, the trend gained a card and an x-axis, and the install banner was re-docked and restyled. `HANDOVER-176:19-23` even flags a padding stack that "looks wrong and is not". None of it is on the list Max works through.
- **D6 *(LOW)* — `docs/MAINTENANCE.md:321-332` is fixed and mis-routed.** = C5. Recommend deletion.

### The charter's named candidates

| Thread | Status | Proof |
|---|---|---|
| **Staging Supabase** | **DONE** — shipped 172 / `ezplate-v152` | `docs/STAGING.md`, `supabase/staging/01-04`, `tests/staging-seeds.test.js`, `tests/env-fence.test.js`. But `CLAUDE.md` still says otherwise — **D1** |
| **Eval harness for the invoice reader** | **Not done** | `docs/MAINTENANCE.md:118-122` (moved from QUEUE in the 11 Aug tier split) |
| **`manager` as a third role** | **DONE — closed by decision** | `docs/QUEUE.md:131`, Max 9 Aug 2026: two roles, no manager |
| **The privacy revisit** | **Not done**, correctly still the top gate | `docs/QUEUE.md:142-148`; `CLAUDE.md` Tier 2 unchanged; correctly reopened for the invoice-photo spec at `docs/MAINTENANCE.md:76` |
| **Bulk catalogue bootstrap** | **Not done** — but now named explicitly rather than implied, which fixes v145's complaint | `docs/QUEUE.md:137` |
| **Import/restore from JSON backup** | **DONE**; step 3 now rehearsed on staging and explicitly **not** discharged | `docs/QUEUE.md:161-172`; `docs/STAGING.md:157` |
| **Abbreviation matching in search** | **Still not built; the record correction landed** | `js/app.js:877` comment unchanged since v83; `docs/MAINTENANCE.md:261-267` now carries the correction v145 asked for. Mislabelling fixed, feature open |
| **`TODO(Max)` markers** | **DONE — zero remain** | `grep -rn "TODO(\|TODO:\|FIXME" js/ index.html sw.js css/ api/` → no hits |

---

## 6. Queue hygiene

- **Within cap: 12 items** against 20 (renumbered by 175). The 11 Aug tier split is being used properly — 167, 168 and 170 each routed findings to `docs/MAINTENANCE.md` by the tier test rather than padding the queue.
- **`Do after:` lines are accurate.** All five name `business_id` PART 1 or PART 2, neither shipped. The `Do after: F10` on Floating layers was correctly deleted and left as a dated parenthetical (`:179`). No stale ordering claims in QUEUE — this is a real improvement over v145.
- **Both `blocked` items are honestly blocked, and both are in front of Max today.** Item 1 → `docs/decisions/2026-08-12.md` §1; item 11 → §2. Neither is blocked on something already decided.
- **The phase-law section is NOT dead weight — checked because it was flagged as a candidate.** Lines 21–27 (the R1–R5 rubric, the standing rules, §4 acceptance criteria, the shared-CSS-families warning) were cited *by number* in both 175 and 176 and are load-bearing. What is dead is narrow: the heading `# Phase law — the v3 fold-in (F8-F10)` names three shipped items, and `:17`'s F-item ledger is a completed record. **A retitle, not a deletion** — and worth saying plainly, because "the phase closed so the scaffolding is dead weight" is the reading that would remove a live rubric.
- Nit: item 12's *"Five independent placement implementations is an UNVERIFIED count"* warning is still correct and still unverified.

---

## Ranked: what is worth a batch, and what is noise

**Worth a batch (one docs-only PR could carry all of it):** S1/S2/C1/C2 — the migration and staging contradictions, which is one coherent fix across `CLAUDE.md` and `.claude/skills/batch/SKILL.md`, and needs Max's yes for the CLAUDE.md half. **Then** D3/C3 (`new-branch` skill), which is now three audits old and cost a real review. **Then** R1 — either promote Stryker or strike the falsified sentence at `docs/MAINTENANCE.md:114`; leaving both as they are means the next audit re-derives this.

**Worth ten minutes each, rides any batch:** S3, S4, S5, S6 (four number/citation corrections in `CLAUDE.md`) · T1 (make the CI count a test, not a comment) · D4 (sweep four `Do after: F10`) · D6/C5 (delete a fixed entry) · T3 (one number).

**Noise — recorded, not worth chasing:** C4 (commit title vs shipped version; already reconciled in the handover) · the phase-law heading · item 12's unverified count, which already carries its own warning.

**Judgement call, not a defect:** T2 and D5 both trace to batch 176 running without a second reader at the brief's instruction. Neither is damage; both are the kind of thing a reviewer catches. The finding is the missing reviewer, not the two symptoms.

---

## Nothing to report in

- **Invariants** — every one TRUE; the protected parser region byte-identical across eleven more deploy versions and the whole post-fold-in window.
- **Dead traps** — none recommended for removal. **Fifth consecutive clean result.**
- **Test suite health, on its own terms** — 986/986 unit and 274/274 hermetic Playwright green, monotonic growth, no unexplained drop, and eight specs rewritten honestly (old argument quoted and answered) rather than deleted to go green.
- **The charter's three known recurring symptoms** — zero new occurrences of pack-size persistence, invoice flag-pill alignment or menu empty-state centring.
- **Third-party supply chain** — both scripts pinned to exact versions with `sha384`, the pdf.js worker pinned-only as documented, no fourth dependency, no build step, no analytics.
- **Fold-in consistency across early and late screens** — nine `.scr-head` instances, one per screen plus the builder variant; no drift found between screens converted at F2 and those converted at 171/175.
- **`FOLD-IN-PROTOCOL.md` vs `QUEUE.md`** — reconciled by 175; AUDIT-v145's C1 (`.legacy`) is closed in both files and in the code (`grep -rn "\.legacy" css/style.css index.html js/app.js` → zero hits).
- **AUDIT-v145's other findings** — C1 fixed (156), C2 fixed (157), D1 fixed (158, `tests/kpi-strip.test.js:31` now `extractFn`s the real `fmtTargetPct`), D2's record correction landed, D4 landed (`CLAUDE.md:219`). Only D3 remains open, and §3's two counts were fixed then re-drifted.
- **Queue hygiene** — within cap, ordering accurate, both blocked items genuinely blocked and currently with Max.

---

## What batch 177 did with this report

Filed by the `/batch` loop that commissioned it, 12 Aug 2026, at the version it audited. Actions taken in the same batch:

- **S2/C1 FIXED** — `.claude/skills/batch/SKILL.md` no longer lists a migration as a stop condition; it now points at `docs/STAGING.md`'s procedure. This is a lookup against a decision Max already recorded on 8 Aug, not a new decision.
- **D3/C3 FIXED** — `~/.claude/skills/new-branch/SKILL.md` §6 rewritten so the pre-push agent is mandatory and the workflow is on-demand, matching `CLAUDE.md` and `.github/workflows/code-review.yml`. Three audits old.
- **T1 FIXED as a mechanism** — `tests/ci-workflow.test.js` now asserts the spec count in `.github/workflows/test.yml`'s comment against the real directory, so it cannot drift a fourth time.
- **T3, R1's falsified sentence, D4, D6/C5 FIXED** in `docs/MAINTENANCE.md`.
- **D5 FIXED** — 175 and 176's device-visible changes appended to `docs/PHONE.md`.
- **S1 FIXED, and its policy half put to Max.** The bullet's factual claim — *"staging is EMPTY… the schema has not been mirrored and no seeds exist"* — was false and actively misleading four queued migration items, so it was corrected rather than left pending. **No protection was relaxed:** "defer destructive ones" is preserved by the separate standing bullet that makes destructive work Max's. The clause carried its own expiry (*"the safeguard becomes real when the queue's staging item RUNS"*) and the item ran. What went to Max is whether he wants the removed caution reinstated anyway.
- **S3, S4, S5, S6 APPLIED DIRECTLY, not routed to Max**, and the split is deliberate: these are counts and a line number where the code is the sole authority, and `CLAUDE.md`'s own law is that a line disagreeing with the code is a finding and the code wins. The `decide` skill's test — *does the answer depend on the café, the trade, or Max's history?* — says no for all four, and its own warning is that a decision file full of engineering lookups trains him to skim. Each correction is called out at its site and in the handover, so none is silent.
  **S5 came out wider than the audit had it:** the pre-push review caught that 6 + 6 ≠ 13, and re-measuring found the `getItem` grep misses **seven** keys for **two** reasons — six behind constants, plus `cafeDB_prodDensity`, a tombstone that is only ever `removeItem`'d and so is invisible to any read-side grep.
- **D2 put to Max** in `docs/decisions/2026-08-12-2.md` — a genuinely new Tier 1 rule, which is his call.
- **T2** recorded in `docs/MAINTENANCE.md`; the retrospective review of v156's unreviewed diff routed there too.

⚠️ **The measurements in this report are as at commit `d1a8e53` (986 unit tests).** Batch 177 added one, so the live figure is **987**. The report is left as measured — it is the record of an audit, not a live document.

**The pre-push review of the batch that filed this report found four defects in it, and that is worth recording**: a suite count already stale by one, the 6+6=13 arithmetic above, an out-of-repo skill file still carrying the pre-8-Aug migration policy three sections below the part that had just been fixed, and this very action log misreporting which findings went to Max. All four are fixed above. **An audit batch is not exempt from the thing the audit is about.**
