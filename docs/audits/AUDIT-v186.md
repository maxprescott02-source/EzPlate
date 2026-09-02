# AUDIT-v186 — 2 Sep 2026

Audit at v186, 2 Sep 2026 — previous audit v176, 10 merges ago.

Run by the `project-audit` agent at `ezplate-v186` (`sw.js:2`), queued by `/batch` step 10 as `docs/QUEUE.md` item 10. Covers drift across batches 216–226.

**The agent is read-only. It changed nothing, including this file. Every finding carries the evidence to re-check it.**

**Coverage:** handovers 216–226 read in full (the eleven since AUDIT-v176 was filed); 167–215 taken from AUDIT-v176 rather than re-read; all 177 handovers swept by grep for the recurring-symptom check. `CLAUDE.md`, `docs/QUEUE.md`, `docs/MAINTENANCE.md`, `docs/PHONE.md`, `docs/STAGING.md`, `docs/GATE-REVIEW.md` read in full. All four source files, `tests/`, `supabase/migrations/`, `.github/workflows/test.yml`, `.githooks/pre-push` inspected as needed.

---

## Verdict

**The project is healthy, and measurably healthier than at v176.** 1811 pass / 0 fail across 112 suite files, exit 0. All four CI jobs green on the `v186` merge (run `33579722379`), including the full mutation gate and Playwright. All six version spots agree at 186. The protected parser region has been **byte-stable since `f259c5c`** — the batch-197 edit AUDIT-v176 reported — with hash `c1eb483cef554e7b1d0a2194d8a5c357` (251 lines), and the four never-touch functions are byte-identical to their v176 state. No top-level name in `js/app.js` is declared twice. The naming inversion holds with all three guards. 92 mutation targets, all resolving, all naming real test files. Branch protection is exactly as `CLAUDE.md` describes it, gaps included. Every one of the ten batches that shipped a client asset (v177–v186) left a review artifact. The handover gap table is complete for the first time. The eleven handovers in this window are the strongest run of pre-push reviews in the record: 221 caught four defects on a one-line item, 219 caught a shipped production security regression, 224 caught a regression *in the fix*.

**The single most important thing to address: `docs/MAINTENANCE.md:665` still gives "staging is paused" as the reason per-account AI rate limiting cannot be built, and staging came back on 29 Aug 2026.** That is AUDIT-v176's C1 running in reverse — that audit found staging down while `docs/STAGING.md` said it was up; now staging is up while three files say it is down. It matters because that item is the one C entry that becomes a launch blocker the day the paid tier lands, and the only obstacle it names no longer exists. Evidence: `docs/STAGING.md:3` (measured — 14 tables, 4 accounts, restored 29 Aug), batches 218 and 219 both rehearsed against it, versus `docs/MAINTENANCE.md:665`, `docs/MAINTENANCE.md:677`, `docs/GATE-REVIEW.md:35`, `docs/GATE-REVIEW.md:93`.

**Second, and cheaper: `docs/QUEUE.md:108` — the item `/batch` runs next — points a batch at `kingMissingImpact`, a function deleted in `ezplate-v139`.**

---

## S0 — Disposition of AUDIT-v176's findings

| v176 finding | Status now | Evidence |
|---|---|---|
| **S1 — protected parser region edited by 197, no mechanism** | **PARTIALLY ACTIONED.** Filed for Max at `docs/MAINTENANCE.md:870`. Neither decision taken: 197 is not ratified, and there is still no hash pin. The region has not moved since. | `tests/extractfn.test.js:121` still asserts only that the anchors slice; region hash unchanged across all 19 commits touching `js/app.js` since `f259c5c` |
| **S2 — review gate understated as hook-only** | **DONE** | `CLAUDE.md` corrected; `.github/workflows/test.yml:192` runs `node tests/review/check.js` in the required `unit` job |
| **S3 — `css/style.css` "twelve"** | **DONE** | One hit, now `css/style.css:3008`, and it is the "NO COUNT HERE ON PURPOSE" comment |
| **S4 — dead `buildBackup` pointer** | **DONE**, but its replacement line number has rotted (see F5) | |
| **S5 — Bidfood 26→37** | **DONE, and already moved again**: now **40** tracked files, 27 under `tests/` | `git grep -l -i bidfood \| wc -l` = 40. The claim carries its own "the number will keep moving" caveat, so this is self-correcting by design |
| **S6 — three inversion guards** | **DONE** | `tests/terminology.test.js:98`, `:112`, `:125` |
| **S7 — fourteen `cafe*` grep hits** | **DONE and still exactly right** | 14 unique keys, 13 live, `cafeDB_menus` prose-only |
| **C1 — staging down, STAGING.md silent** | **DONE, and now INVERTED** — staging is back and three files still say paused (see C1 below) | |
| **C2/C3/C4 — MAINTENANCE duplicates and counts** | **DONE.** No duplicate headings remain across 92 sections | `grep '^### ' docs/MAINTENANCE.md` |
| **C5 — "289 browser specs"** | **DONE** at `docs/MAINTENANCE.md:564` (399/44); **now 46 spec files**, and `:284` still says "38 specs" | |
| **C6 — two live files carry a disowned incident count** | **NOT DONE** | `.githooks/pre-push:23` "ten instances across batches 165-176"; `tests/semantic-keys.test.js:21` "CLAUDE.md's fourteen-incident rule" against a roster of 22 |
| **C7 — hook header says "Four checks", runs five** | **NOT DONE** | `.githooks/pre-push:3` vs steps 0–4 listed immediately below it |
| **Dead traps: none** | **Confirmed again — eighth consecutive clean result** | All 30 Tier 1 subjects verified live below |
| **Tier 1 growth** | **CONTINUES.** 28 → **30** sections | See G1 |

---

## S1 — Invariants

All clean. Listed with evidence because a clean invariant is a result.

| Invariant | Result |
|---|---|
| **Protected parser region** | ✅ Both anchors present — `js/app.js:10204` (`var INV_EXCLUDE=`), `js/app.js:10454` (`function unitLabelFor(`). **Hash `c1eb483cef554e7b1d0a2194d8a5c357`, 251 lines. Unchanged since `f259c5c` (batch 197).** Record this hash; the next audit should compare against it. |
| **No twice-defined top-level name** | ✅ Zero duplicates across `function`/`var`/`let`/`const`. `tests/housekeeping.test.js:189` asserts **absence** (`assert.deepEqual(dupes, [])`), and `:196` is a self-test proving the guard goes red for all four keywords against injected source. `catState` (importer, `:2502`) and `catCombo` (add-to-menu, `:12589`) are distinct, as `CLAUDE.md` records. |
| **Naming inversion** | ✅ `data-tab="pantry"` → `aria-label="Ingredients"` (`index.html:1694`); `data-tab="ingredients"` → `aria-label="Products"` (`index.html:1707`); `data-tab="builder"` → "Plates" (`:1692`). Three guards live. |
| **Six version spots** | ✅ All 186 — `sw.js:2`, `sw.js:5` (×2), `index.html:105`, `index.html:1741`, `js/app.js:7413`. |
| **Four never-touch functions** | ✅ Present, unrenamed, exactly once each, **byte-identical to their v176 state** (md5 per function diffed against tree `28a3340`). `packToUnitCost:2056`, `applySupplierMemory:10307`, `unitCatCategory:10325`, `resolveMatchedPrice:10341`. |

---

## S2a — `CLAUDE.md` claims verified against the code

Every factual claim in all three tiers was taken individually. **The load-bearing ones all hold.** What follows is only what did not.

### F1 — The backup format numbers are stale in three places, and 219 moved all of them *(MED)*

Batch 219 took the file format 3 → 4. `CLAUDE.md`'s row-boundary section still describes the pre-219 world:

| `CLAUDE.md` | Reality |
|---|---|
| `:156` "`backupToPayload`'s `format:chg.length?3:2` is the precedent" | `js/app.js:8563` — `format:(ph.length||mph.length)?4:(chg.length?3:2)` |
| `:157` "`buildBackup` carries a flat `format:3`" | `js/app.js:8297` — `format:4,` |
| `:160` "`parseBackupFile` accepts formats 2 and 3 and refuses everything else by name" | Accepts **2, 3 and 4** (`tests/_extractfn` slice of `parseBackupFile`, the `if(f!==2 && f!==3 && f!==4)` guard) |

Why it matters beyond tidiness: `:157` exists specifically to tell a reader *"go and check the citation"*, and a reader who does now finds `format:4` where the file promises a flat `3` — which is the identical failure the paragraph was written to fix, one format number later.

### F2 — "The three other restore paths … name their columns and are safe" is now five *(MED)*

`CLAUDE.md:169`. Batch 219 added two more column-named inserts. Measured in `supabase/migrations/20260829_restore_backup_v5.sql`:

- **Five `select *` inserts, unchanged and correct:** `ingredients:278`, `menus:282`, `plates:289`, `menu_items:294`, `supplier_phrases:298`.
- **Five column-named inserts:** `ing_price_history:309`, `menu_change_log:341`, **`price_history:372`**, **`menu_price_history:389`**, `app_settings:420`.

The hazard half of the rule (which five tables a DEFAULT is unsafe on) is still exactly right. The safe list understates itself by two.

### F3 — "`Bidfood` appears in 37 tracked files" is now 40 *(LOW — self-correcting)*

`CLAUDE.md:49`. Live figure `git grep -l -i bidfood | wc -l` = **40**; 27 under `tests/`, which is unchanged and is the number the sentence at `:50` uses. The claim already tells the reader the number moves and gives the command, so this is a note rather than a defect.

### F4 — "512 of them" commits is now 588 *(LOW)*

`CLAUDE.md:52`. `git rev-list --count HEAD` = **588**. Same class as F3 but without the self-correcting caveat.

### F5 — `js/app.js:7726` no longer names the corrected citation *(LOW)*

`CLAUDE.md:157`'s struck-through fix cites `js/app.js:7726` as the site that now points at `backupToPayload` correctly. Line 7726 is `submitInvite`. The correct comment is at **`js/app.js:8240`**, and it is still correct. Line-number rot only; `CLAUDE.md`'s own header says to re-grep by name.

### Verified TRUE — the claims pressed hardest

All 61 named functions exist, unrenamed, exactly once each (including `invUnitRebase`, `invPriceUnit`, `fixedContainingBlock`, `anchorDrop`, `plateIdOf`, `plateForMenuItem`, `dishesOfPlate`, `menusOfPlate`, `publishPlan`, `rowToMenu`, `memKey`, `tidySupplierMemMigration`, `emptyStateHtml`, `srLabel`). The two exceptions are deliberate: `publishClear` is nested inside the install-banner IIFE (`js/app.js:8833`, as batch 226 describes), and `kingMissingImpact` is genuinely gone — see C3.

Every "exactly one / nothing reads this / the only writer" claim was grepped rather than believed:

- **`setProducts` is `ing_price_history`'s sole writer** ✅ — one path (`js/app.js:1434` `logIngPrice`, `:1455` `saveIngLog`), both inside `setProducts` (`:1417`). `setProduct` is its N=1 wrapper at `:1459` with exactly **six** call sites, matching the comment at `:3870`.
- **Nothing reads the `CX`/`IMP` prefixes** ✅ — two mint sites (`:2690`, `:11668`), zero readers.
- **`plates.menu_id` is legacy, read by nothing** ✅ — `js/app.js:374`, `:504`; `plateToRow` omits the column.
- **`publishPlan` is the ONE publish decision** ✅ — three call sites (`:9720` `renderUnlinkedPrompt` reading `.unlinked`, `:9798` `submitMenuItem`, `:12157` `submitAddDish`).
- **Every Supabase write goes through `pushWrite`** ✅ — including `dbInviteMember`/`dbRevokeInvite` at `js/app.js:7711`/`:7716`, which look raw and are not. All **six** deletes are `.eq()`-scoped.
- **`addProduct` is dead in the app and deliberately kept** ✅ — `js/app.js:1629`, five references in `tests/visual/fresh-states.spec.js`.
- **`dbSetSetting`/`dbPushSupplierPhrase` name no `onConflict`** ✅ — the two load-bearing absences are commented at `js/app.js:517` and `:4184`; `tests/semantic-keys.test.js` pins them.
- **`invite_pending` has no caller** ✅ — the client comment at `js/app.js:7539` says so and is correct; the function is still `anon`-granted (`20260814_invitations.sql:434`), which is gate 6's accepted residual.
- **`claim_business_invite()` and `business_team()` carry the identical `anon` grant gap** ✅ — `20260814_invitations.sql:549`, `:587` carry `revoke … from public` with no `revoke … from anon`, exactly as `CLAUDE.md`'s newest Tier 1 section says. `create_business` is the one that was fixed (`20260827_cafe_creation.sql:317`).
- **Three data-table FKs, and only `menu_items.plate_id` can error** ✅ — `supabase/staging/01-schema.sql:241` (no ON DELETE), `:246` and `:251` (SET NULL). **No migration since 191 has added an FK** — verified against `20260815`, `20260827`, `20260829`.
- **`restore_backup`'s owner guard and its nine `where true`** ✅ — `20260829_restore_backup_v5.sql:206`, `is distinct from 'owner'` as the NULL rule requires; nine `where true`.
- **Two third-party scripts, exact-pinned, SRI where the mechanism allows** ✅ — `index.html:1738-1739` (supabase-js 2.110.8), `js/app.js:9851/9867` (pdf.js 4.10.38); `tests/third-party-pins.test.js:32-35` holds both version/hash pairs.
- **Branch protection** ✅ — exactly as written: required checks `["unit tests","smoke (jsdom)"]`, Playwright **not** required, `enforce_admins: false`.
- **All CI jobs carry `timeout-minutes`** ✅ — `changes:89`, `unit:159`, `smoke:214`, `playwright:262`.
- **`TAB_PANES` has nine panes** ✅ — `js/app.js:3302`.
- **Thirteen `cafe*` keys, grep returns fourteen** ✅ — exactly as recorded.
- **The 22-incident stub roster's header matches its bullet list** ✅ — 22 and 22. None of batches 216–226 added a bullet, and each explicitly said why not, which is the roster header's own instruction being followed.
- **Zero `TODO(Max)` markers** ✅ across `js/`, `css/`, `index.html`, `sw.js`, `api/`.
- **`css/style.css:3008`** carries the "NO COUNT HERE ON PURPOSE" comment ✅.
- **393 products in `tests/fixtures/base-products.json`** ✅.

---

## S2b — Dead traps recommended for removal

**NONE. Eighth consecutive clean result.**

All 30 Tier 1 sections were checked by going to find the code, not by reading the rule. Every one has a live subject. The two newest — batch 218's `revoke … from public` does not revoke `anon`, and batch 219's `create or replace` replaces the whole body — are alive and load-bearing: two functions still carry the grant gap, and `20260829_restore_backup_v5.sql` is the newest of four `restore_backup` definitions in a directory where the wrong ancestor is still one `grep` away.

The two candidates that look dead and are not, classified per the brief:

- **"A duplicate definition is never dead until reached"** — the instances (`aRow`, `renderAnalysis`, `catState`) are all gone. **This is the "trap worked, and a test enforces its absence" shape.** `tests/housekeeping.test.js:189` fails if any name returns. Keep.
- **"Per-publication counting was decided, then reverted on real data"**, **"A FOREIGN KEY is checked with RLS OFF"** (the `MENU_ORIGINAL` literal is gone and `tests/unique-ids.test.js` pins its absence), and **"`addProduct` is dead and DELIBERATELY KEPT"** — all **decision-recording** entries. They stay true regardless of the code. Keep.
- **"Offsets on a `position:static` box are INERT"** — `.suggest-drop` at `css/style.css:515` still declares no `position`, deliberately, because `anchorDrop` sets it inline. Subject alive. **"`position:fixed` is not viewport-relative"** — `.bld-docket{filter:drop-shadow(…)}` still live at `css/style.css:672`. Both keep.

### G1 — Tier 1 growth, third audit with a trend line *(observation, Max's call)*

| | v156 | v166 | v176 | **v186** | Δ since v176 |
|---|---|---|---|---|---|
| Whole file | 7,487 w | 14,257 w | 19,320 w / 841 ln | **21,047 w / 899 ln** | **+9%** |
| **Tier 1** | 2,642 | 7,067 | 10,777 (28 §) | **11,823 (30 §)** | **+10%, +2 §** |
| Tier 2 | 1,752 | 2,185 | 2,729 | 2,813 | +3% |
| Tier 3 | 2,578 | 3,861 | 4,689 | 5,264 | +12% |

Tier 1 is **56% of a file loaded into every message of every batch**. Growth has slowed markedly — +10% against v176's +52% — and the eleven batches in this window added only two sections while explicitly declining to add roster bullets four separate times (220, 221, 222, 224, 225, 226 all record the decision and the reason). **The discipline the roster header asks for is being followed.** AUDIT-v166's consolidating-preamble recommendation remains untaken; it is recorded here for the third time and no deletion is recommended, because nothing is dead.

---

## S2c — Contradictions

### C1 — Staging is BACK, and three files still give "staging is paused" as a live blocker *(HIGH)*

**The pair.** `docs/STAGING.md:3`: *"✅ **STAGING IS BACK AND USABLE (Max, 29 Aug 2026). Measured, not assumed.** 14 public tables, 9 functions, 4 accounts…"* — and batches 218 and 219 both ran full rehearsals against it.

Against:

- `docs/MAINTENANCE.md:665` (**live C item, per-account AI rate limiting**): *"a per-account counter must survive between serverless invocations, so it needs a table, so it needs a migration, so it needs staging — **and staging is paused**. Half-building it against production was the wrong trade."*
- `docs/MAINTENANCE.md:677`: *"Blocked on staging being resumed, like everything else that needs a rehearsal."* — this governs `claim_business_invite` and `business_team`, which `:684` confirms are still reasoned-not-run.
- `docs/GATE-REVIEW.md:35` and `:93`, same wording.

**The code supports `docs/STAGING.md`.** GATE-REVIEW is a dated sign-off and can defensibly keep its 27 Aug text; `docs/MAINTENANCE.md:665` and `:677` cannot, because they are live items whose only stated obstacle has been gone for four days. This is AUDIT-v176's C1 inverted, and the direction is the more dangerous one: a batch reading `:665` concludes the work is impossible when it is now merely undone.

### C2 — `docs/QUEUE.md` item 2b is headed `blocked` and its body says `Blocked on: NOTHING` *(MED)*

**The pair, in one file, seven lines apart in effect.**

- `docs/QUEUE.md:35` — `## blocked  2b · Move the AI endpoints to Gemini's PAID tier`
- `docs/QUEUE.md:37` — `Blocked on: **NOTHING — Max has DEFERRED THIS INDEFINITELY (29 Aug 2026)**`

Against `docs/QUEUE.md:56`, which is item 5's own record of exactly this phrase being the mistake: *"The `Blocked on:` line was DELETED on 12 Aug 2026 on the grounds that the go had been given… **A go that must be re-asked is a block; a status that says otherwise is how a destructive step gets taken because a header looked green.**"* — and against the header rule batch 225 added at `:7`: *"an item is worked from its heading and read from its body, and nothing reconciles them."*

**The consequence is benign and the grammar is not.** `blocked` is the right status and the body is unambiguous about why. But `Blocked on: NOTHING` is the file's own status vocabulary saying the opposite of the heading, in a file that carries a written record of that exact phrasing preceding a near-miss on destructive work. The two items model opposite conventions for the same field.

### C3 — `docs/QUEUE.md:108` sends the next batch to a function deleted 47 deploy versions ago *(MED)*

`docs/QUEUE.md:108`, inside **item 7 — `ensurePlateForDish`**, which is `next` and is the first unblocked work item after this audit:

> *"Build it with the both-sides lesson in mind — a relink heals kid-lines only (see `kingMissingImpact`'s v124 history)."*

`kingMissingImpact` does not exist. `git log -S` places its deletion at `15a3ed1`, **`ezplate-v139`** (batch F3, the Ingredients rebuild). `git grep kingMissingImpact` returns exactly one hit repo-wide: that queue line.

This is `CLAUDE.md` Tier 3's *"a queued item's approval does not expire and its FACTS do"* landing on the very next item to run. The lesson the pointer refers to is real and is written out in the same sentence, so the cost is a batch spending time hunting a function — the same shape as the dropdowns item that waited two years on a shipped conversion.

### C4 — `CLAUDE.md:677` points at a `Do after:` line that no longer exists *(LOW, and instructive)*

`CLAUDE.md:677`, in the privacy gate: *"**The ordering it implies lives in `docs/QUEUE.md` as a `Do after:`, and this file deliberately does not restate it.**"*

`grep "Do after:" docs/QUEUE.md` returns the header's definition (`:6`) and item 5's record of one being deleted (`:60`). **There is no live `Do after:` anywhere in the file.** The signup item it referred to shipped as `ezplate-v178` (batch 218) and was deleted from the queue.

The mechanism worked exactly as designed — the queue deleted its own line on satisfaction. What rotted is `CLAUDE.md`'s *pointer at the mechanism*, and the parenthetical in that very sentence predicted this: *"the day the gate ships, the queue deletes its `Do after:` by the mechanism designed for it and the copy here rots with nothing able to notice."* Same sentence, one level up. Related and same severity: `CLAUDE.md:676` still reads *"The moment self-service signup ships"* in the future tense; it shipped on 30 Aug 2026, and the ordering it was guarding was honoured (disclosure `v171`, 27 Aug → signup `v178`, 30 Aug).

### C5 — `docs/PHONE.md`'s "Settled" warning enumerates seven live sections below it and there are now thirteen *(MED)*

`docs/PHONE.md:557` carries a corrected heading whose warning names what is live below it: *"Everything below this section is **ACTIVE and needs a phone**: 175+176/v155-v156, F7/v146, 178/v157, 179/v158, 186, 192, 193."* It closes with an explicit instruction: *"(If a later batch appends here and this heading is once again sitting above live work, move the heading rather than the work…)"*

**Six more sections have been appended below it since, and the heading was not moved:** `195/v167` (`:765`), **`v168 (batch 197) — COSTS MONEY IF WRONG`** (`:790`), **`v169 (batch 0e) — COSTS MONEY IF WRONG`** (`:810`), `batch 212` (`:843`), `batch 221` (`:870`), `batch 225` (`:883`).

The instruction was written for exactly this and was not followed six times. Two of the un-listed sections are the file's own money-critical class. This is the third recurrence of a `docs/PHONE.md` navigation failure (AUDIT-v166 D1 found the first).

### C6 — two live files still cite an incident count `CLAUDE.md` disowns *(LOW, carried from v176 C6/C7)*

`.githooks/pre-push:23` — *"ten instances across batches 165-176"*; `tests/semantic-keys.test.js:21` — *"CLAUDE.md's fourteen-incident rule"*, against a roster at 22. And `.githooks/pre-push:3` says *"Four checks"* above five numbered steps.

Not actioned, and the reason is on record and is sound: `docs/MAINTENANCE.md:888` explains batch 216 declined to fix them because both files' diffs change what runs, which would have pulled a docs-only PR into the mandatory-review path for three comments. **Eleven batches have since opened neither file.** Worth noting only as evidence that "rides the next batch that opens this file" has a long tail.

---

## S3 — Test drift

**Clean.** No finding rises above LOW.

- **Suite count agrees everywhere.** 1811 pass / 0 fail / 0 skipped, exit 0, 112 files matching `tests/*.test.js`. No document states a disagreeing figure — `HANDOVER-223` records 1788 in its review and 1789 merged, and explains the one-test difference; nothing has quoted a count since.
- **No drop in test count between handovers.** 1789 (223) → 1811 (now), monotonic.
- **Exactly one skipped spec, documented and struck as resolved:** `tests/visual/screenshots.spec.js:32`. AUDIT-v166 T1 stays closed.
- **Playwright runs and is not stale.** 46 spec files (up from 44 at v176), gated by the `changes` job, ran to `success` on the `v186` merge. Still not a required check — correctly documented as a known gap at `CLAUDE.md`'s branch-protection section.
- **Mutation gate healthy and grown.** 92 targets (77 at v176), **all 92 resolve to a real function in `js/app.js` and every named test file exists**. Ran in full in CI on the `v186` merge, green.
- **No spec references a dead id or dead copy.** Two candidates checked: `renderManageMenusZero`'s "No menus yet." (live, `js/app.js:9517`) and the Menu tab's "Create your first menu" (live, `js/app.js:11949`). Both real.
- **D1 (LOW) — two CSS comments cite test files that do not exist.** `css/style.css:2129` cites `tests/builder-modal.test.js`, which existed (added at `1fa2cef`, v119) and was deleted when the builder became a page. `css/style.css:3105` cites `tests/inv-tint.test.js`, which **has never existed in the history**, and claims it *"fails if a hover background is ever added here"*. **The guard is real** — it lives at `tests/inv-upload.test.js:215`, `'DECIDED: invoice review rows carry no hover wash'`, and it does exactly what the comment promises. So this is pointer rot, not an absent guard; but a reader who checks the citation concludes F8's tint-vs-hover decision is unenforced, which is the `buildBackup`/`backupToPayload` failure in a different file.

---

## S4 — Recurring symptoms

### R1 — A queue item's own enumeration is wrong: seven consecutive batches *(HIGH — this is the strongest signal in the audit)*

AUDIT-v166 measured *"four of the last seven batches found their item materially wrong at the point of execution"* and `CLAUDE.md` Tier 3 carries the rule. **In this window it is seven of eleven, and the failures are all the same shape: the item's LIST was short.**

| Batch | The item said | Reality | Source |
|---|---|---|---|
| 219 | *"Start from v4, not from `20260806_restore_backup_v3.sql`"* | Naming an ancestor **caused** the owner-guard regression that reached production | `HANDOVER-219`, Probe |
| 220 | three insight families | **five** | `HANDOVER-220`, Surprises |
| 221 | *"One line."* | four defects, three of them in the fix | `HANDOVER-221`, Review |
| 222 | six callers of `costFromLines` | **nineteen** | `HANDOVER-222`, Surprises |
| 223 | *"One string key per family and nothing else changes"* | needed a third change in both validator copies | `HANDOVER-223`, Probe |
| 224 | *"written only if the write succeeded"* | doing exactly that is a **regression**, in two independent ways | `HANDOVER-224`, Probe |
| 225 | four rows concatenate their cells | three do; the fourth needed a fifth change nobody had written down | `HANDOVER-225`, Probe |
| 226 | measured desktop only; offered two remedies | one remedy cannot work at all | `HANDOVER-226`, Probe |

**Every one was caught, and none shipped wrong.** The rule is working. But the root cause named in `CLAUDE.md` — "it is age, not carelessness" — is now doubtful: 222's item was written days before it ran, and 221's was one line. **The likelier cause is that items are written as a diagnosis of one site and the codebase has nineteen.** `HANDOVER-222` says this plainly: *"I would not have written the requirement as 'costFromLines returns or exposes its miss count and the callers act on it' without saying which callers — that phrasing invites exactly the partial fix the first commit made."* That is a rule about **how to write an item**, and it is in a write-once handover rather than in `docs/QUEUE.md`'s header.

### R2 — "A comment recorded the defect correctly and filed it under the wrong consequence": three instances, three declines to name it *(MED)*

- **212** — `tests/visual/v150-builder-order.spec.js` noted the docket's filter *"creates a containing block but does NOT clip"*, filed under clipping. `CLAUDE.md` records this one as a near-miss inside the `position:fixed` section.
- **225** — the Ingredients renderer's comment said *"the four figures are never announced"* and concluded *"the label gains nothing here and loses nothing"*. First half exactly right; second half the opposite of right — the label **was** the cause. `HANDOVER-225`, Surprises.
- **226** — `tests/visual/v141-sync-corner.spec.js` said in writing that the toast and install banner overlap, that it was pre-existing, and that it was not what that test measured. Every clause true; the result was a test named for a three-way split that was green while a third of it was false. `HANDOVER-226`, Surprises.

225 and 226 each explicitly declined to add a `CLAUDE.md` bullet on the grounds that the shape is not new — correctly, per the roster header. **But the shape now has three dated instances in fifteen batches and no name of its own**, and it is not what the `position:fixed` section is about. It is worth a decision either way rather than a third silent decline.

### R3 — The insight-phrasing validator: three batches, one mechanism, root cause named and not built *(MED)*

215 (build the validator) → 220 (three families publish their subject; the validator needed changing too) → 223 (two more families; `nameSequence` needed a word boundary). Two residual limits are filed at `docs/MAINTENANCE.md:770` and `:801`.

`HANDOVER-223` names the root cause in one sentence: *"The real fix is the builders publishing WHERE a name sits rather than only what it is, across all eight families, which is its own item and not a rider on this one."* **It was filed as C and has no item.** Three fixes, each correct, each finding the next instance — which is this audit's own definition of a root cause not yet found.

### R4 — The three named recurring symptoms produced ZERO new fixes in 216–226

Pack-size persistence: last touched batch 200. Invoice flag-pill alignment: last touched `HANDOVER-v104`. Menu empty-state centring: last touched `HANDOVER-v122`; still recorded as *"four fixes, no root cause on record"* at `docs/MAINTENANCE.md:374`. **Quiescent, not solved.** Same finding as v176.

### R5 — `git push --no-verify` on the handover commit, three batches running *(LOW — observation, not a defect)*

220, 224 and 225 each used it for the prose-only commit and each recorded it in the handover, which is exactly what the rule asks. 220 went further and said it *"should not have been reached for anyway."* **The rule is being honoured perfectly.** The pattern says something else: the hook's seven minutes are being paid a second time on a tree that already passed, three times in six batches. That is a fact about the hook's scope, not about anyone's discipline.

---

## S5 — Dropped threads

Every item flagged "follow-up", "not built", "revisit", "recommended next" or "Max's call" across handovers 216–226, AUDIT-v176, `docs/GATE-REVIEW.md` and the two blind audits, cross-checked against `docs/QUEUE.md` and `docs/PHONE.md`.

### The named candidates

| Thread | Status | Evidence |
|---|---|---|
| **A staging Supabase environment** | ✅ **DONE and RESTORED.** Was down at v176; Max restored it 29 Aug 2026 and two batches have rehearsed against it since | `docs/STAGING.md:3`; `HANDOVER-218`, `HANDOVER-219`. **But see C1** — three files still say paused |
| **An eval harness for the invoice reader** | ❌ **NOT DONE.** Sharpened again by R3 and by the taught-pack chain | `docs/MAINTENANCE.md:222` |
| **`manager` as a third role** | ✅ **CLOSED by decision and enforced in SQL** — not a dropped thread | `tests/roles.test.js:211`, "the role column is constrained to the two roles that were decided" |
| **The privacy revisit** | ✅ **DISCHARGED for the free tier**, and correctly ordered: disclosure `v171` (27 Aug) shipped **before** self-service signup `v178` (30 Aug). ⚠️ **The acceptance RECORD is still not built** — the tick gates the form and is never persisted | `js/app.js:7912` `privacyAcceptNeeded`; `docs/MAINTENANCE.md:310` |
| **Bulk catalogue bootstrap** | ✅ **DONE** (batch 193, CSV importer; `IMP` mint at `js/app.js:2690`) | |
| **Import/restore from JSON backup** | ✅ **DONE**, and materially improved in this window — 219 took the file to format 4 carrying all five history series | `20260829_restore_backup_v5.sql` |
| **Abbreviation matching in search** | ❌ **NOT BUILT**, and the record correction is now unmade for a **fifth** audit | `docs/MAINTENANCE.md:486` |
| **`TODO(Max)` markers** | ✅ **ZERO remain**, re-verified across all shipped files | |

### AUDIT-v176's own dropped threads, re-checked

| Thread | Status |
|---|---|
| **The region hash pin, and ratifying 197's edit** | ❌ **NOT DONE, both halves.** Filed for Max at `docs/MAINTENANCE.md:870`. Region unmoved, so nothing is at risk today — but the strongest invariant in `CLAUDE.md` still has no automated guard, one audit later |
| **D1 — `cafeCost_env` is a stamp, not a preference or a cache** | ❌ **NOT DONE. Fifth audit running.** `CLAUDE.md:594` names `ENV_STAMP_KEY` in its grep list and never resolves the classification; Tier 2 still says *"there is no third category"* with the plate draft as the sole exception. `HANDOVER-172` asked for one clause specifically so the next audit would not rediscover it. Here it is |
| **D2 — `HANDOVER-178`'s rule: "a primary action must not live inside a node that re-renders"** | ❌ **NOT DONE.** Not in `CLAUDE.md` (grepped). Parked on a yes that stopped being required the next day. Earned by a real defect |
| **`HANDOVER-175` — the supplier FILTER over a 95%-empty field** | ⚠️ **NOW FILED.** v176 found it reached neither file; it is now `docs/MAINTENANCE.md:881`. Routing fixed, work not done |
| **`HANDOVER-197` — the pack-to-unit arithmetic written out FOUR times** | ⚠️ **NOW FILED** at `docs/MAINTENANCE.md:884`, with the note that two of the four are inside the protected region so acting needs Max. Not measured |
| **Three handover gaps not in the README table** | ✅ **DONE, batch 218.** `docs/handovers/README.md:28`, `:29`, `:39` now carry 196, 198 and 209. **No new gap has accumulated** — 216 through 226 are all present |
| **`setCogs`/`bootstrapSync`/`fmtTargetPct` disagree on fractional targets** | ❌ **NOT DONE** — `docs/MAINTENANCE.md:634` |
| **One magnitude check against real data** | ❌ **NOT DONE** — `docs/MAINTENANCE.md:640` |
| **MAINTENANCE duplicate recording** | ✅ **RESOLVED.** No duplicate headings across 92 sections. The "grep before filing" convention has held for eleven batches |

### New in this window

| Thread | Status |
|---|---|
| **Seven displaced-B items sit in `docs/MAINTENANCE.md` with fourteen free queue slots** *(MED)* | ❌ **RECURRED IMMEDIATELY.** Batch 225 promoted five and wrote at `docs/MAINTENANCE.md:111`: *"This section's trigger is a free slot; check it when the queue shrinks, because nothing else will."* The queue is now at **6 items against a cap of 20**, and seven approved-B entries remain invisible to `/batch` (`:67`, `:74`, `:80`, `:94`, `:98`, `:102`, `:107`). The mechanism 225 identified as missing is still missing |
| **`renderManageMenusZero` reports where the new rule says it should invite** | ❌ Filed `docs/MAINTENANCE.md:910`. Copy, so Max's. A café can reach it before ever opening the Menu tab, so it is two voices in one session |
| **`saveCurrentPlate` is not a mutation target — 17 survivors under two files, 12 under six** | ❌ Filed `docs/MAINTENANCE.md:210` with both numbers and a warning not to add the target without doing the work. Still unclaimed after five batches |
| **`--bottomnav-h` is read with a fallback and defined by nothing** | ❌ Filed by 226 at `docs/MAINTENANCE.md:303`. **Independently verified:** `css/style.css:873` reads `var(--bottomnav-h, 64px)`; the name appears nowhere else in `css/style.css` or `js/app.js` except the comment at `:971`. The 64px fallback has always been the live value |
| **A full-length toast covers the builder's Save button with no install banner involved** | ❌ Filed by 226 at `docs/MAINTENANCE.md:292`, measured `saveCovered:true` at 380px, C because the toast is `pointer-events:none` and transient |
| **The unicode unit mismatch in the café-name limit** | ❌ Filed `docs/MAINTENANCE.md:953`. Client is the stricter side, so it can only produce a false refusal |
| **Supabase leaked-password protection is OFF and sign-up is now public** | ❌ Filed `docs/MAINTENANCE.md:947`. **A dashboard toggle, so Max's — and it is the cheapest open item in the project** |
| **`invite_pending` drop once no cached client calls it** | ⏳ **Correctly waiting.** The last caller went with `v178` on 30 Aug; the drop must follow the client, and three days is not long enough. Not dropped |
| **`dbPushIngPrice` — the N=1 wrapper — has had no callers since 193** | ❌ Unfiled. Confirmed: zero call sites anywhere including tests. Undocumented dead code, unlike `addProduct`, whose retention is deliberate and written down |

---

## S6 — Code comments that the code disagrees with

Requested explicitly; separated from S2a because these are in shipped files rather than in `CLAUDE.md`.

| | Site | The comment says | The code says | Sev |
|---|---|---|---|---|
| **X1** | `css/style.css:970` | *"The offset is measured against `.bottomnav` rather than assumed — `--bottomnav-h` is not a token this sheet defines."* | Nothing defines it anywhere, so the 64px fallback at `:873` is and always has been the live value. The comment describes a measurement that never happens | MED (filed by 226) |
| **X2** | `js/app.js:8227` | *"parseBackupFile accepts 2 and 3"* | Accepts 2, 3 and 4 since batch 219 | LOW |
| **X3** | `js/app.js:8243` | *"The line below is a flat `format:3`"* | The line below (`:8297`) is `format:4,`. This is the citation-correction comment itself going stale | LOW |
| **X4** | `js/app.js:248` | *"per-product cost → `dbPushIngPrice` via `saveIngLog`"* — the module's own write-map | `saveIngLog` calls `dbPushIngPrices` (`:3790`); `dbPushIngPrice` (`:3807`) has **zero** callers. The map names the dead wrapper as the live path | LOW |
| **X5** | `js/app.js:9506` and `js/app.js:12095` | Both quote the Menu tab as showing **"No menus yet."** | Batch 217 changed that title to **"Create your first menu"** (`js/app.js:11949`). The mechanisms both comments describe are still correct; only the quoted copy is stale, and 217 did not grep for it | LOW |
| **X6** | `css/style.css:2129`, `css/style.css:3105` | Cite `tests/builder-modal.test.js` (deleted) and `tests/inv-tint.test.js` (never existed) | The guard `:3105` promises is real and lives at `tests/inv-upload.test.js:215`; `:2129`'s is not obviously replaced | LOW |

Re-verified as still **correct**, because they are the ones most likely to have rotted: `js/app.js:3870` ("`setProduct(` finds six call sites" — exactly six), `js/app.js:3865` ("`setProducts` … is `ing_price_history`'s sole writer" — true), `js/app.js:374`/`:504` (plates.menu_id legacy), `js/app.js:517`/`:4184` (the load-bearing `onConflict` absences), `js/app.js:7539` (`invite_pending` has no caller), `js/app.js:1629` (`addProduct` retained deliberately), `supabase/migrations/20260829_restore_backup_v5.sql:256` (`where true` is load-bearing).

---

## Nothing to report in

- **Version consistency** — all six spots at 186.
- **The four never-touch functions** — byte-identical to v176.
- **The protected parser region** — unmoved since batch 197; hash recorded above for the next audit.
- **The duplicate-definition invariant** — zero duplicates, guard covers all four keywords, carries its own red-test.
- **The naming inversion** — three guards, all live.
- **Dead traps** — none, eighth consecutive clean result.
- **Suite health** — 1811/0, exit 0, no count disagreement anywhere.
- **Mutation gate integrity** — 92 targets, all resolving, all naming real files, full run green in CI.
- **CI configuration** — four jobs, all with `timeout-minutes`, all green on the `v186` merge.
- **Branch protection** — exactly as documented, gaps included.
- **Review-artifact discipline** — all ten client-shipping batches (v177–v186) left an artifact; the one prose-only batch (216) correctly did not.
- **Handover completeness** — 216–226 all present, all state their deploy version; the README gap table is complete and no new gap accumulated.
- **`docs/MAINTENANCE.md` duplicate recording** — resolved; no duplicate headings across 92 sections.
- **Third-party pinning** — two scripts, exact versions, SRI where the mechanism allows, both pairs pinned by test.
- **QUEUE discipline** — 6 items against a cap of 20, no process items, no items added by an audit.
- **`docs/PHONE.md` currency** — entries filed for every batch that needed one (221, 225); *ordering* is C5.
- **Foreign keys** — three data-table FKs unchanged, no migration since 191 has added one.
- **Playwright spec drift** — one documented skip, no dead-id references.

---

**A closing note on filing.** This report is handed back, not saved. `docs/QUEUE.md:92-95` is unusually clear that filing it to `docs/audits/AUDIT-v186.md` *is* the work — an unfiled report leaves the counter at v176 and the next audit is never queued, silently. The caller queued this item knowing that, and item 10 exists solely to close the loop, so I expect it to be filed; this line is here because the failure it guards against is invisible.

---

## Filed by batch 227, with what was done about each

The report above is **verbatim**. This section is the batch's, not the agent's.

**Spot-checked before acting on anything, per `CLAUDE.md`'s rule that another agent's results are not taken at face value.** F1, F2, F3, F4, C1, C3, C4 and C5 were each re-measured independently and every one held: `format:4` at `js/app.js:8297`, `f!==2 && f!==3 && f!==4` at `:8400`, five `select *` inserts and five column-named ones in `20260829_restore_backup_v5.sql`, 40 Bidfood files, 588 commits, one `kingMissingImpact` hit repo-wide and it is the queue line, no live `Do after:`, and thirteen `docs/PHONE.md` sections below a heading that names seven.

| Finding | Done |
|---|---|
| **F1** backup format numbers | **FIXED** in `CLAUDE.md` — all three claims now match `js/app.js` |
| **F2** "three other restore paths" | **FIXED** — five, named |
| **F3** Bidfood 37 → 40 | **FIXED** |
| **F4** 512 → 588 commits | **FIXED** |
| **F5** `js/app.js:7726` → `:8240` | **FIXED** |
| **C1** staging paused, three files | **FIXED** in `docs/MAINTENANCE.md` (both live items). `docs/GATE-REVIEW.md` left alone deliberately — it is a dated sign-off, and the audit says so |
| **C2** item 2b heading vs body | **FIXED** — the body no longer uses `Blocked on:` to say nothing is blocking |
| **C3** `kingMissingImpact` | **FIXED** — the pointer is replaced by the lesson itself, which is what it was for |
| **C4** the dead `Do after:` pointer | **FIXED**, and the future tense with it |
| **C5** `docs/PHONE.md` heading | **FIXED** — the enumeration is deleted rather than re-counted, for the reason the `:not([hidden])` paragraph gives |
| **C6** two files citing a disowned count | **NOT FIXED**, deliberately — unchanged reasoning, and now recorded as a standing exception rather than re-found every audit |
| **R1** items whose list is short | **RULE ADDED** to `docs/QUEUE.md`'s header. It is about how an item is WRITTEN, which is why a handover was the wrong home for it |
| **R2** comment right, consequence wrong | **NAMED** in `CLAUDE.md`, on its third dated instance, as the audit asks |
| **S5** seven displaced-B items, fourteen free slots | **PROMOTED**, and the trigger moved into `/batch` step 1's sweep so it stops being a remembering problem |
| **X1–X6** stale code comments | **FILED as C** in `docs/MAINTENANCE.md`. They are in `js/app.js` and `css/style.css`, so fixing them ships a client asset and pulls a prose batch into a cache bump and a mandatory review; they ride the next batch that opens those files, which is that file's own rule |
| Everything else | Already filed where the audit found it, and left there |
