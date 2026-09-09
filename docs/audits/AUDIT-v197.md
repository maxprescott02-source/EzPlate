# AUDIT-v197

```
Audit at v197, 9 September 2026 — previous audit v186, 11 merges ago.
```

Run by the `project-audit` agent, read-only, and filed by batch 240. What follows is its report verbatim; what batch 240 did about each finding is recorded in `docs/handovers/HANDOVER-240-audit-v197.md` and, where it was a correction, in the file that was corrected.

---

**Verdict: the project is healthy.** `npm test` is 1915 pass / 0 fail. All six version spots read 197. Every Tier 1 trap's subject is live code, a live decision, or a rule with an enforcing test — **I found nothing in Tier 1 to prune**, which is the first audit in a while able to say that. Branch protection, the review-artifact gate, the third-party pins, the handover gap table and `restore_backup`'s five/five column split all match their documentation exactly. Batch 239's work is careful: the identity guard (`barePidSameProduct`) closes both halves of the confirm-to-apply window, the change-log figures are null for a stated reason, and the `_boot.js` change is additive and guarded so no existing spec can be silently retired by it.

**The single most important thing to address: the protected parser region is in four documents in three different states, and the code supports none of them cleanly.** `CLAUDE.md` (loaded into every message of every batch) says "never edit anything inside it"; `docs/QUEUE-2026-09-08-CONSOLIDATED.md` states as an in-force owner override that the protection is *lifted*; that same file's Tranche 0 lists getting the reversal in writing as still outstanding; and `docs/QUEUE-GROUPS.md` blocks the whole G2 group on it. Meanwhile the region **has already been edited once** (batch 197) and `docs/MAINTENANCE.md` has been asking for two audits whether that edit is ratified. Item 17 is nonetheless headed `next` with `Do after: nothing`, and the promotion rule copies headings verbatim — so promoting G2 hands `/batch`, which correctly does not stop for approval, an A-grade item whose entire premise is an unwritten reversal. `docs/QUEUE-GROUPS.md` predicts this failure in writing and does not prevent it. This needs Max's sentence, either way, before G2 is promoted.

---

## 1. Invariants

Everything checked came back clean.

- **Protected parser region** — both anchors present: `var INV_EXCLUDE=` at `js/app.js:10735`, `function unitLabelFor(` at `:10985`. `tests/_extract.js:23` still slices on those exact strings. **No hash has ever been recorded**, so there is nothing to compare against; `docs/MAINTENANCE.md:918` records this as the open question it is.
- **No twice-defined top-level name** — `tests/housekeeping.test.js:182` asserts absence for `function`, `var`, `let` and `const`, and `:196` is a self-test that proves the guard can go red against injected source. Both halves of the 200-era widening are intact.
- **Naming inversion** — `data-tab="pantry"` labelled "Ingredients" (`index.html:1735`), `data-tab="ingredients"` labelled "Products" (`:1748`), `data-tab="builder"` labelled "Plates" (`:1733`). Three inversion guards in `tests/terminology.test.js` (`:98`, `:112`, `:125`), matching CLAUDE.md's corrected count.
- **Six version spots agree at 197** — `sw.js:2` CACHE, `sw.js:5` (two `?v=`), `index.html:105`, `index.html:1782`, `js/app.js:7781` `APP_VERSION`.
- **Protected functions present and unrenamed** — `packToUnitCost` `:2149`, `applySupplierMemory` `:10838`, `unitCatCategory` `:10856`, `resolveMatchedPrice` `:10872`.

---

## 2a. VERIFY — factual claims checked one at a time

Ranked by consequence.

1. **Two live planning documents instruct a future batch to do something already done, and describe `spike/` as untracked when it is tracked.** Consolidated item 17: *"Add `spike/` to `.vercelignore` in the same batch: it is not there today"*; `docs/QUEUE-GROUPS.md` G2: *"It is untracked today, and the moment it is committed it is served from the production origin."* Both false — `git ls-files spike/` returns tracked files, and `.vercelignore` carries a `spike/` entry with a comment dated 9 Sep 2026 explaining the commit that added it. A batch running G2 would spend time re-doing this and, worse, might conclude the origin is exposed when it is not.

2. **`js/app.js:8678` quotes a format literal that no longer exists in the file.** The comment says *"the precedent is `format:chg.length?3:2` in `backupToPayload`"*. The live expression at `:9001` is `format:(ph.length||mph.length)?4:(chg.length?3:2)` — batch 219 widened it. The function name is now right (AUDIT-v186 X3 fixed that half); the quoted expression is the stale half, in the same comment block that exists to warn about exactly this. CLAUDE.md is correct here and states no literal at all.

3. **`docs/MAINTENANCE.md` carries two entries twice — once struck as done, once live as outstanding.** `:466` reads *"~~Two live files cite an incident count `CLAUDE.md` disowns~~ — **DONE, batch 230**"*. But `:936` (*"Two live files carry an incident count `CLAUDE.md` itself disowns"*) and `:940` (*"`.githooks/pre-push`'s header says 'Four checks' and runs five"*) sit unstruck in the AUDIT-v176 section. Verified fixed by commit `f3f0558`: `.githooks/pre-push:3` now says "FIVE checks", `:25` quotes no incident count, and `tests/semantic-keys.test.js:21` cites the roster rather than a number. A rider batch reading the file top-to-bottom will go hunting for work that no longer exists.

4. **`js/app.js` states a fact and its contradiction nine lines apart, in one function.** `:12668` still says *"dishes already gone, so the `menu_items.menu_id` FK can never be violated"* — the claim CLAUDE.md flags as **wrong**. `:12677`, inside the same function, states the correct fact: *"the FK `menu_items.menu_id -> menus.id` is ON DELETE SET NULL, so unlike the plate case there is nothing to sequence against."* CLAUDE.md's claim is still true and still un-actioned; the correction landed beside the error instead of replacing it.

5. **"72 items" is now 73, quoted in four places.** `docs/QUEUE.md:15` and `:16`, `docs/QUEUE-GROUPS.md:33`, `docs/QUEUE-2026-09-08-CONSOLIDATED.md:19`, `skills/batch/SKILL.md:19`. Batch 239 added item 88. Low harm — every one of those files also says to derive what remains by grepping unstruck items — but the file that says *"what is left is a grep, never a count anybody maintains"* quotes a count four times.

6. **Stale line citation:** CLAUDE.md cites `css/style.css:2964` for the "NO COUNT HERE ON PURPOSE" comment; it is at `:3046`. The comment itself is correct and is the only "twelve" in the file, as claimed.

7. **CLAUDE.md's Bidfood figures have moved again**, as the file predicts of itself: `git grep -l -i bidfood | wc -l` = **50** against "around forty"; the test-file subset is **28** against "the **27** test files". The sentence explicitly defers to the live grep, so this is the disclaimer working; noted only for completeness.

**Verified correct — worth stating because these are the claims most likely to have rotted:**

- **13 `cafe*` localStorage keys, 14 grep hits, one of them prose** — exactly as CLAUDE.md describes, including all six constant-mediated keys by name and the `cafeDB_prodDensity` tombstone.
- **`setProducts` is the sole writer of `ing_price_history`** ✓ — and `dbPushIngPrice` (singular, the dead wrapper AUDIT-v186 X4 flagged) is now **gone**; the write map at `:340` names the live path.
- **Every Supabase write goes through `pushWrite`** ✓ — I grepped for raw `SUPA.from(...).insert/update/upsert/delete` and every hit is inside a `pushWrite` closure, including the two `business_invites` writes that look raw at first glance (`:8121`, `:8126`). **Every `.delete()` is `.eq()`-scoped** ✓.
- **`restore_backup` v5: exactly five `select *` tables** (ingredients, menus, plates, menu_items, supplier_phrases) and **exactly five column-named** (ing_price_history, menu_change_log, price_history, menu_price_history, app_settings). CLAUDE.md's corrected 5/5 split is right.
- **187's five restrictive policies and 191's four owner-only `business_invites` policies** both present. **`tests/roles.test.js` now scans the migrations directory** (`:47`, `:241`) rather than hardcoding a filename — 219's lesson landed.
- **Branch protection matches CLAUDE.md exactly** — two required contexts (`unit tests`, `smoke (jsdom)`), Playwright not required, `enforce_admins: false`. Verified against the GitHub API.
- **`TAB_PANES` holds nine panes** ✓ · **roster has 22 bullets against a header saying TWENTY-TWO** ✓ · **`base-products.json` holds 393 products** ✓ · **two third-party scripts, exact versions, SRI, enforced by `tests/third-party-pins.test.js`** ✓ · **four CI jobs, four `timeout-minutes`** ✓ · **`tests/_extract.js` and `tests/_extractfn.js` both exist** ✓ · **handover gap table matches the actual gaps exactly** (189, 196, 198, 209) ✓ · **`addProduct` still has five uses in `fresh-states.spec.js`**, so the deliberate-retention note is still load-bearing ✓.

*Note on method: the Supabase MCP tools were not exposed to this agent, so SQL-side claims were verified against the committed migrations and the schema mirror rather than against the live databases. Foreign-key counts in CLAUDE.md's "Three foreign keys" section were not re-counted against `pg_constraint`; the section itself says to grep for the live figure and makes no static claim.*

---

## 2b. DEAD TRAPS — recommended for removal

**None.** I went and looked for the code behind every Tier 1 entry and every subject is live. Recording the classification so a future audit does not redo it:

- **Code gone *because the trap worked*, with a test enforcing absence — keep:** the duplicate-definition rule (`tests/housekeeping.test.js`), the `MENU_ORIGINAL` FK rule (pinned by a test asserting the literal is gone), the `isFinite('')` rule (`tests/price-log-paths.test.js`), the `on conflict` / primary-key rule (`tests/semantic-keys.test.js`).
- **A decision rather than a line of code — keep:** per-publication counting, target-anchored chart colour, "the client's role is not the MCP's role", the CSV-only importer call, the row-boundary backup law.
- **Subject demonstrably still live — keep:** `addProduct` (five spec uses), `.suggest-drop` (still declares no `position`; the fix was to hand it to `anchorDrop` from JS, and the CSS comment at `:621` says so), `.bld-docket`'s `filter` (`css/style.css:686`, still establishing the containing block `fixedContainingBlock` asks about), the `revoke … from public` rule (only `create_business` carries the by-name revoke; `claim_business_invite` and `business_team` still do not — consolidated item 40), the `@media` specificity and `[hidden]` idioms (both still used app-wide).

Tier 1 is very long and it does only grow — but length is not the finding this check is for, and I am not going to manufacture one. The honest recommendation is that the next prune should be triggered by a subject actually disappearing, not by the file's size.

---

## 2c. CONTRADICTIONS

**C1 — The protected parser region. Four documents, three positions, and the code supports neither.** *(This is the headline finding.)*

| Location | Wording |
|---|---|
| `CLAUDE.md` Tier 1 | *"Never edit anything inside it. If a fix seems to require it, stop and tell Max"* + *"Never touch `resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory`, `packToUnitCost`."* |
| `docs/QUEUE.md:35` | Standing rules: *"protected parser region untouched"* |
| `docs/QUEUE-2026-09-08-CONSOLIDATED.md:17` | Owner override 2, stated as in force: *"**The parser region is no longer protected.** `CLAUDE.md`'s 'Never edit anything inside it' is lifted."* |
| Same file, Tranche 0 | *"**Confirm the `CLAUDE.md` reversal on the parser region in writing.**"* — i.e. not yet written |
| `docs/QUEUE-GROUPS.md` G2 | *"**Blocked on:** Max putting the parser-region reversal in writing. **Item 17 has no authority to exist without it.**"* |

**Which the code supports: neither.** The region has already been edited once — batch 197, commit `f259c5c`, one line removed and 25 added — and `docs/MAINTENANCE.md:918` still carries that as an open ratification question, first raised by AUDIT-v176 on 28 August. There is **no decision file**: `docs/decisions/` ends at `2026-09-02.html`. The only record of the reversal is `docs/audits/PARSER-AUDIT-2026-09-08.md:5`, which is a report, not a decision.

**The mechanism that makes this dangerous rather than merely untidy:** consolidated item 17 is headed `## next 17` with *"**Do after:** nothing."* `docs/QUEUE.md`'s own header rule says **"THE STATUS IN THE HEADING IS WHAT `/batch` ACTS ON, so a body that disagrees with it is not a nuance — it is the file lying to the only reader that matters."** And `docs/QUEUE-GROUPS.md`'s promotion rule says to promote *"the consolidated item's **heading line verbatim**"*. So promoting G2 puts an A-grade item headed `next` into the working set, `/batch` correctly does not stop for approval, and it edits the protected region. `docs/QUEUE-GROUPS.md` writes this exact prediction down — *"`/batch` … takes an item whose entire premise is a reversal that may not have been written yet, and **edits the protected parser region without authority**"* — and then does not change item 17's heading, which is the one thing that would prevent it.

**For Max:** this is a reversal of his own call, so it is his alone. One sentence resolves it. If the reversal stands, `CLAUDE.md` Tier 1, `docs/QUEUE.md:35` and the two `MAINTENANCE.md` entries need editing under standing authority and batch 197 is ratified by the same sentence. If it does not, item 17's heading must read `blocked`.

**C2 — `docs/MAINTENANCE.md` says two things are outstanding that it also says are done.** `:466` (struck, "DONE, batch 230") against `:936` and `:940` (live). Both readable as current, in one file, ~470 lines apart. Detail in 2a §3; the code supports the *struck* version.

**C3 — `docs/QUEUE-GROUPS.md` still instructs a staging rehearsal for work that shipped by a method `CLAUDE.md` now prefers.** G1: *"**Stops for Max:** 16's heal rewrites production `plates` rows. **Rehearse on staging; his go on the day.**"* Item 16 shipped in batch 239 and is struck in the consolidated file — and it was deliberately **not** rehearsed on staging. It was rehearsed offline against real production rows pulled read-only, and 239 wrote the rule into `CLAUDE.md:783`: *"A BULK REWRITE FROM THE CLIENT IS NOT A MIGRATION, SO NOTHING ABOVE REACHES IT."* The routing file's instruction is now the weaker of the two and points at a spent item. The code supports `CLAUDE.md`.

**C4 — `docs/QUEUE-GROUPS.md` does not know about item 88.** Its table says G1 holds 12 items; G1's own list enumerates 13 (8 items plus 5 riders); and item 88 — raised by 239, sitting in `docs/QUEUE.md` between G1 items, graded B — appears **nowhere** in the routing file. Low harm today because the queue holds it directly, but the file whose job is "which items load the same context" is missing one.

---

## 3. Test drift

1. **`tests/visual/screenshots.spec.js` has been entirely dark since v162 — about 35 deploy versions.** `test.skip(true, …)` at file level, blocked on a signed-in session. The spec's own comment is the sharpest statement of the cost: *"A spec that cannot pass and cannot report is worse than a deleted one, because it trains every batch to skim past a block of red."* Unblocking it is a Tranche 0 item — create a throwaway staging account — estimated in the consolidated file at **two minutes**, and it also unblocks items 27, 28 and 29.
2. **The Playwright job is not a required check** — verified against the GitHub API, and matching CLAUDE.md's description. 55 specs run in CI and a PR that reddens them still merges. At the time of writing, the `main` run for 239 was still executing Playwright; the branch run passed all four checks.
3. **`docs/MAINTENANCE.md:37` cites "1018 tests"** against an actual 1915. It sits inside the retired-worktree section, explicitly framed as "verified on the day it was created", so it is a dated record rather than a live claim — but it is the only four-digit test count in the docs and reads as current on a skim.
4. **Consolidated item 17 cites "passes the suite (1876 pass)"** for `spike/parser-audit/proposed.patch`. The suite is now 1915. The item already instructs regeneration via `apply-patch.js`, so this is self-correcting.
5. **No unexplained count drop.** 1915 pass, 0 fail, 0 skipped, 0 todo.
6. **Nothing not run that should be.** The five `tests/fixtures/mutation/*.test.js` files fall outside `npm test`'s `tests/*.test.js` glob by design — they are the mutation gate's own self-test fixtures.
7. **No spec references a function, id or copy that no longer exists**, on the identifiers CLAUDE.md names. `cafeDB_king`, newly written by `tests/visual/_boot.js`, is a test-harness key with no app counterpart — deliberate, guarded by `if (Array.isArray(king))`, and no pre-239 spec sets it, so no existing assertion was silently retired.

---

## 4. Recurring symptoms

**S1 — The invoice parser prices a line off the wrong quantity or weight. Three fixes; the root cause was found only on 8 September, after the last of them.**

- **236 / `ezplate-v194`** — a quantity-first carton line halved the unit cost: `2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00` costed at $5.00/kg against a true $10.00, `needManual:false`, pre-ticked. Fix: `invQtyFirstRebase`.
- **237 / `ezplate-v195`** — a trailing net-weight column made `packWeight` divide by 144kg instead of 12kg: **$0.42/kg against a true $10.00**, silently, pre-ticked. Fix: `invFixRow`, absorbing 236's function.
- **`docs/audits/PARSER-AUDIT-2026-09-08.md`** — the shipped parser scores **53 right / 67 silent-wrong** over 130 lines, because `firstPairPrice` and `parsePdfLine` **never consult the quantity at all**. That is the root cause; 236 and 237 were two faces of it, each diagnosed as new. The audit enumerates fourteen.

Both handovers frame their defect as novel. 237's own "Into CLAUDE.md" section is the tell: *"Nothing new, and that is the finding rather than the absence of one."*

**S2 — Pack-to-unit-price arithmetic. Fixed under at least four framings; the root cause was named a year ago and is still not fixed.** Batches **197** (invoice GST), **199** (importer GST), **200** (pack-unit rebase), **204** (matched price), then **236** and **237**. `docs/MAINTENANCE.md:933` records HANDOVER-197's own conclusion: the arithmetic is written out **four times** — `derivePackPrice`, `applySupplierMemory`, the pack-teach recompute, `invPackPreviewText` — and extracting it is *"the real root cause fix"*. It was left unfiled because nobody measured whether the four are genuinely identical, and the entry notes that four copies of one formula is precisely why the GST divisor went missing from three of them. Now consolidated item 37. **Two of the four are inside the protected region, so S2 is gated on C1.**

**S3 — "A guard that recomputes the write's answer is a stub of it." Four instances in four batches, every one caught by the pre-push review and none by the suite or the mutation gate.** 200 (the `invUnitRebase`/`invPriceUnit` extraction), 236 (right function, **wrong argument** — `packWeight(row.name)` verifying a price derived from `packWeight(row.raw)`), 237 (right function, **never asked** — keyed off `row.unit`, which does not say which parser branch produced the price), 239 (`barePidSameProduct` — the shipped check tested the line's *shape*, not the identity the safety argument rests on). 237 explicitly declined to add a fourth restatement to `CLAUDE.md`, which I think is correct: the rule is right and is being applied by the reviewer rather than by the author. **The finding is the detection channel** — four consecutive batches where the only thing standing between this and production was a second reader that `--no-verify` skips.

**S4 — Pack-size persistence: settled.** Traced through v45, v50, v60, v82, v83, v101, v104, v106, then 193/197/200. No new instance since 200. The taught-pack precedence rule (product pack > supplier memory > parser > manual) appears to hold; the live risk has migrated into S1 and S2.

**S5 — Invoice flag-pill alignment (v46, v62, v104) and menu empty-state centring: settled.** No instance after v104 in either family.

---

## 5. Dropped threads

| Thread | Status | Evidence |
|---|---|---|
| **Staging Supabase environment** | **DONE** | Batch 172 / `ezplate-v152`; `docs/STAGING.md`; the rehearsal is recorded at `docs/QUEUE.md:223` |
| **Eval harness for the invoice reader** | **PARTIALLY DONE — first real movement after six audits called it "not done"** | `spike/parser-audit/run.js` exists and scored 130 lines on 8 Sep. It is **not in `npm test`**; promotion is consolidated item 17, standing use item 37; the real corpus deliberately lives outside the repo. **Gated on C1.** |
| **`manager` as a third role** | **NOT DONE — deliberately folded, correctly** | `HANDOVER-v120:15` folded it into "Roles — owner vs staff". Schema is still owner/staff (`20260814_roles_part1.sql`). No orphaned item. |
| **Privacy revisit before other cafés' data flows through Gemini** | **DISCHARGED for the free tier; the gate itself correctly still stands** | Notice shipped `ezplate-v171`, 27 Aug. ⚠️ **The acceptance RECORD is still not built** — the tick gates the form and is never persisted, so nothing knows who accepted which version. Consolidated item 41; becomes B the day 2b ships. |
| **Bulk catalogue bootstrap** | **DONE** | Batch 193, the CSV importer |
| **Import/restore from JSON backup** | **PARTIALLY** | The RPC exists and is rehearsed on staging; the production full-wipe (step 3) has never run. `docs/QUEUE.md` item 5, `blocked` on Max's go **on the day** — correctly reinstated as a block. |
| **Abbreviation matching ("bread gf" → "Gluten Free Bread")** | **DECLINED — and the record correction has still never been made** | `docs/MAINTENANCE.md:525-529`. The feature was explicitly declined in `HANDOVER-v83`; what shipped is `kitchenSearchMatches`, a plain substring match, which is a *different* feature. The entry's first instruction is *"correct the record first, everywhere it is cited — so it stops being re-verified as done by every future audit."* **This is the fourth audit to re-verify it.** Now consolidated item 78. |
| **`TODO(Max)` markers** | **DONE — zero remain** | `grep -rn "TODO(Max)\|TODO:" js/ index.html css/ sw.js api/` → no hits. Fourth consecutive audit confirming zero. **Recommend retiring this from the standing audit checklist**; it now costs more to check than it can find. |

**Newly found or newly urgent:**

- **238's two Supabase dashboard clicks are still outstanding and the sign-up flow is broken for strangers until they happen.** Site URL → `https://scoopyscosting.vercel.app`, and `https://scoopyscosting.vercel.app/**` added to Redirect URLs, on **both** projects; plus leaked-password protection. **Routing was correct** — it reached `docs/PHONE.md:978-985`, `docs/MAINTENANCE.md:1005-1010` and Tranche 0. Nothing in the repo can do it, and 238's client-side fix is necessary and not sufficient by GoTrue's design.
- **`.env` is not in `.gitignore`.** Verified safe today: `git log --all --diff-filter=A -- .env` is empty and no `.env` exists locally. On a public repo this is one careless file from being unsafe. One line, Tranche 0.
- **The ZZ-AUDIT test objects and the 354.4 `price_history` point are still on production.** Until removed, the Dashboard's "Needs attention" insights and biggest movers are about fake plates, and the trend chart's y-axis runs to 380%. Destructive, so Max's.
- **Batch 197's edit inside the protected region is still unratified**, open since 28 August and now reported by two audits. Folds into C1 and is answered by the same sentence.
- **The staging test account** — two minutes, unblocks a whole dark spec file and three queued items.

---

## Nothing to report in:

- **Version-spot agreement** — six spots, all 197.
- **Protected-region anchors and the four never-touch functions** — present, unrenamed, still slicing.
- **The duplicate-definition guard** — present, asserts *absence*, covers all four declaration keywords, and carries a self-test proving it can go red.
- **The naming inversion** — three guards, labels crossed exactly as specified.
- **Test-suite health** — 1915 pass, 0 fail, no unexplained drop, nothing skipped in the unit suite.
- **The review-artifact gate** — an unbroken run of `docs/reviews/REVIEW-*.md` from 207 to 239, with gaps only at 216, 227 and 234, none of which shipped a client asset.
- **The handover gap table** — matches the actual gaps exactly (189, 196, 198, 209), with a reason for each.
- **Third-party pins** — two scripts, exact versions, SRI, CVE windows encoded, enforced by `tests/third-party-pins.test.js`.
- **Branch protection** — matches CLAUDE.md's description exactly, including the honest admission that `enforce_admins` is false.
- **Supabase write discipline** — every write through `pushWrite`, every delete `.eq()`-scoped.
- **`restore_backup` v5's five/five split** — exactly as CLAUDE.md's corrected version states.
- **Tier 1 dead traps** — none found; every entry's subject is live.
- **Batch 239's own work** — the identity guard, the null change-log figures, the rollback path and the `_boot.js` change all check out, and the new `CLAUDE.md` rule is correctly placed under Tier 3's Migrations section and names artefacts that exist.

---

**One closing note on filing.** This report is not saved by me — I am read-only. `docs/QUEUE.md`'s `doing` item already says the running batch files it to `docs/audits/AUDIT-v197.md`, and `skills/batch/SKILL.md:75-76` carries the same instruction, so the mechanism is in place and I have no reason to think it will be skipped. But it is worth restating what the mechanism protects: an unfiled report leaves the counter at v186, and the next audit is queued off the gap between `docs/audits/` and `sw.js`. If this is not filed, the gap reads 11 today and keeps growing while looking like nothing has changed.
