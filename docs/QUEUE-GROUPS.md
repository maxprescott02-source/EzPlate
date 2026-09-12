# Batch grouping for the 8 Sep consolidated backlog

**This file ROUTES work; it does not describe it.** Every item's mechanism, sites, acceptance and tests live in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`, and nothing here restates them — two files describing one item is two files that will disagree, and the one you are reading would be the stale half.

**What this file adds:** which items load the SAME context, so a batch pays for that context once; what is serial and what is not, with the measurement; and the order.

**What it does NOT add:** approval. Grouping is a routing decision and is mine under `CLAUDE.md`'s standing authority. **Raising `docs/QUEUE.md`'s 20-item cap is Max's**, and the consolidated file says so at its own site; until he answers, this file is a plan and `docs/QUEUE.md` is still the thing `/batch` reads.

⚠️ **A group's membership is a claim about the code and it expires exactly the way a queued item's facts do.** Four of the last seven batches found their item materially wrong at the point of execution. **Re-grep an item's sites before planning off its group**, and if it turns out to load different context than this file says, move it and say so in the handover.

---

## A GROUP IS NOT A BATCH, and the cap is satisfied by PROMOTION rather than by raising it

**A group is a context. It is spent across as many batches as its items need** — roughly thirty batches across the nine, not nine. The estimates below are planning figures and nothing checks them; they exist to stop "nine groups" being read as "nine batches".

| Group | Items | Batches, est. | What drives the count |
|---|---|---|---|
| G1 | 12 | ~3 | 16 is a production data heal on its own |
| G2 | 4 (17 SHIPPED, 92 raised) | ~2 | 17 was fourteen sub-defects, a corpus test and eight mutation targets — it took a batch and a half, and 92 is the half |
| G3 | 7 + 3 by ref | ~4 | 13, 14 and 15 are a batch each |
| G4 | 5 | ~1–2 | mechanical, one file |
| G5 | 12 | **~6–9** | the design law, below |
| G6 | 4 | ~2 | 48's mechanism is unmeasured; step one is measuring |
| G7 | 9 | ~3 | |
| G8 | 7 | ~7 | each MM item is its own infrastructure |
| G9 | 5 | 0 | they ride other batches |

⚠️ **G5 CANNOT BE ONE BATCH AND IT IS NOT A JUDGEMENT CALL.** `docs/QUEUE.md`'s Design law — still binding, and AUDIT-v156 checked precisely that — carries the standing rule *"one screen per change set, one PR, one review; never mix shell work with screen work."* G5 spans builder, dashboard, invoices, menu, plates, products, settings and account, plus shell work in item 64. **The rule forbids combining them**, so the group is a context spent across six to nine batches. Any plan that treats G5 as a unit is proposing to break a rule the queue states in its own header.

**How the 20-item cap is satisfied: `docs/QUEUE.md` holds the CURRENT GROUP's items, not the backlog.**

- the consolidated file is the backlog — permanently, and **what is OPEN is the unstruck items, which is a grep and never a count written here** (it was 72 on 8 Sep, 73 by 9 Sep, and the number is not this file's to maintain);
- this file is the promotion order;
- `docs/QUEUE.md` is the working set, refilled from the next group when it drains.

G1's twelve alongside the six already there is eighteen — **under the cap, so no raise is needed, and the cap question stops blocking the pass.** Putting the nine GROUPS in the queue instead would fit the arithmetic and break the file: its header requires an item to say what is wrong and what must be true when fixed, which a group heading does neither, and `/batch` would be handed an entry with no condition that finishes it.

### How to promote, concretely

**By REFERENCE, never by copying the body.** A promoted entry in `docs/QUEUE.md` is:

- the consolidated item's **heading line verbatim** — it already states the defect, the grade and the evidence, which is what the queue header asks an item for;
- a `Full item:` line naming `docs/QUEUE-2026-09-08-CONSOLIDATED.md` and the item number;
- its `Do after:` and `Blocked on:` lines, resolved against today rather than copied.

**One description, in one file.** Copying twelve bodies would both blow `docs/QUEUE.md` past the size that got it split at 979 lines, and leave two descriptions of one item to drift apart — which is the failure this whole file is written to avoid.

⚠️ **PROMOTION MUST RESOLVE TRANCHE 0 DEPENDENCIES, AND ITEM 17 IS WHY THIS IS A RULE.** Three groups are gated on something only Max can do, and **those gates live in the consolidated file's Tranche 0 section, not in any item's `Blocked on:` line.** Promote item 17 without checking, and `/batch` — which does not stop for approval, correctly — takes an item whose entire premise is a reversal that may not have been written yet, and **edits the protected parser region without authority.** `CLAUDE.md` Tier 1 still forbids that, and reversing his own call is his alone.
**So at promotion, walk Tranche 0 and mark every dependent item `blocked` with the Tranche 0 line named in plain language.** ~~The three live gates today: the **written parser reversal** (G2 entire)~~ — ✅ **THE PARSER REVERSAL IS IN WRITING, 10 Sep 2026 (Max: "its lifted"), so G2 IS NO LONGER GATED**; see `docs/decisions/2026-09-10.md` question 1 and `CLAUDE.md`'s parser-region section. ~~The two live gates left: the staging account (G7's 27, 28, 29), the tokens decision (G5's 66).~~ **The TOKENS DECISION is answered (10 Sep 2026, in chat) and 66 shipped in batch 258.** One live gate left: the **staging account** (G7's 27, 28, 29). A gate that is satisfied gets the item promoted `next` and the check recorded in the handover.

### How the next session knows what is left, after the context that made this plan is gone

**Nothing here is remembered and nothing is a status field. Both questions are DERIVED:**

- **What is left?** The **unstruck** items in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`. `/batch` step 10 strikes each item there, with its batch and deploy version, in the same edit that deletes it from `docs/QUEUE.md`. So "what remains" is a grep, never a count anybody maintains.
- **Which group is current?** The **first group in the order above with unstruck items.** No "current group" marker exists, because a marker is the thing that goes stale.

⚠️ **THE HOLE THIS CLOSES WAS REAL AND IT WAS IN `skills/batch`, NOT IN A DOC.** `/batch` deletes a finished item from `docs/QUEUE.md` by design — git and the handover hold the record — and it read *"if the queue ever has nothing unblocked left, a maintenance sweep runs."* With a promoted working set, a drained queue means **"this group is finished"**, not **"the work is finished"**, and **nothing in `docs/QUEUE.md` can tell the two apart.** So the first time G1 drained, the loop would have started a maintenance sweep with sixty items outstanding — quietly, with the file apparently agreeing.
**The refill is therefore a STEP IN THE LOOP** (`skills/batch/SKILL.md`, corrected 9 Sep 2026), not a convention in this file. A plan that survives a context clear only if someone remembers to read the plan is not a plan, and this repo's most-recorded defect is a gate that exists as a rule with no mechanism.

---

## The parallel question, answered with the measurement rather than the intuition

**Do not open a second branch on `js/app.js`. This has been tried.**

`docs/MAINTENANCE.md`'s header holds the record: a second worktree with a collision rule ran across **batches 181 to 197 — seventeen batches, zero items landed.** Max retired it on 22 Aug 2026 on that evidence, reversing his own 13 Aug decision. The stated cause is the one that would bite any regrouping of this backlog:

> the whole app is one `js/app.js`, so this will happen, and the answer is always to move on

One `js/app.js`, one `css/style.css`, one `index.html`. Groups G1 through G6 all land in those three files, so **they are serial, and grouping is what makes them cheap — not concurrency.**

**What genuinely parallelises, and it is two things, neither of them a branch:**

1. **Inside a batch: the read-only half.** Measuring the repro, grepping each item's enumeration, checking which claims have gone stale — fan that out across subagents, then make one serial edit pass. The collision rule cannot punish reads, and the queue header's "grep the enumeration before planning off it" is exactly this work.
2. **G7, when a batch stalls.** Its no-dependency items touch `tests/` and `docs/` only, ship no client asset, and need no cache bump — so they can absorb the time a batch spends waiting on one of Max's Tranche 0 decisions.

⚠️ **There is NO independent second track today, and an earlier draft of this plan claimed there was.** The margin monitor (G8) looked free because it touches none of the four client files — but the consolidated file's own dependency lines run `17 → 30 → 31 → 32 → 33`, and item 30 carries a kill line (under 16 of 20, the offer re-plans). Building intake before extraction has cleared that gate is building on a premise that is still being tested. **The file-level independence is real and the schedule-level independence is not**; those are two different questions and only the second one decides whether work can start.

---

## The nine groups

Each names the context a batch loads once. Items are referenced by their consolidated-file number.

### G1 · Costing arithmetic and the history series — `js/app.js`

**Context:** `avgFoodCostForScope`, `logHistory`, `logAllMenuPrices`, `costDetail`, `costFromLines`, `lineProduct`, `setMiscCost`, `saveCurrentPlate`, `setProducts`, `recentChangeRows`, `setCogs`, `trendChart`; the five deliberately-separate history series and the target-anchored colour rule.

**Items:** ~~16~~ (239) · ~~18~~ (241, SPLIT → **89**) · ~~19~~ (245) · ~~20~~ (246) · ~~21~~ (247, SPLIT → **90**) · ~~22~~ (248) · ~~23~~ (241) · ~~55~~ (251) · ~~88~~ (249) · ~~rider 25~~ (248) · ~~89~~ (server half 250, client surface 260) · ~~90~~ (CLOSED 10 Sep 2026 — two halves shipped in 253/254, the third declined by Max) · riders 69, 76, 77, 81 (open, **all tier C**)

⚠️ **G1 IS FINISHED AS A SOURCE OF QUEUE ITEMS, as of batch 260.** Every A and B item in it has shipped; what is left is four tier-C riders, and `docs/QUEUE.md` holds A and B only — so they cannot be promoted into the working set at all. They ride whichever batch next opens their file, per `docs/MAINTENANCE.md`'s rule.
**That is what "the first group with unstruck items" has to mean here**, and the refill rule does not say it: a group whose only survivors are C is DONE for promotion purposes, and reading it as current would stall the queue on items that are not allowed in it. The next group with promotable items is the current one.

⚠️ **G1 IS ALL BUT FINISHED, AND THIS LINE READ AS EIGHT OPEN ITEMS UNTIL 10 SEP 2026** (AUDIT-v207 §2a.4). Every one of the eight shipped across batches 241-251 and none of them came back here to say so — **including 247, which SPLIT item 21 and raised item 90, and routed it in neither this file nor `docs/QUEUE.md`'s group list.**
**That is the rule three lines below being broken by the very next batch that raised an item.** The rule is right; what it lacks is anything that enforces it, and the refill rule reads this file to decide which group is current — so an under-counting group is the one failure that actually costs something.

⚠️ **88 was added here on 9 Sep 2026 by AUDIT-v197's finding C4, which is this file's own failure mode arriving quickly.** Batch 239 raised it, put it in the consolidated file and promoted it into the working set — and never told the routing file, whose whole job is *which items load the same context*. It belongs in G1: it is the thirteen bare-pid lines 16's heal refused, so it reads `lineProduct`, `barePidPlan` and the builder's line shapes, which is this group's context exactly. **The general rule, since nothing enforces it: a batch that raises an item routes it in BOTH files, or the group it belongs to silently under-counts.**

⚠️ **20 MOVED HERE FROM G3 ON 9 Sep 2026, at promotion, against its own context.** Its natural home is the boot group. But **21 is `Do after: 20`** — 20's fictional menu is the deterministic repro trigger for 21's dish path — so with 20 left in G3, **21 would sit in the queue unworkable for several groups**, and the refill rule would keep reading G1 as the current group because 21 was unstruck. **One small item crossing a context boundary is cheaper than a stranded item and a muddied group.** This is the file's own instruction being followed rather than overridden: *if an item loads different context than this file says, move it and say so.*

**Why one batch:** these functions call each other. 22 and 23 are the same measurement 16 and 18 change; 25 is the third disagreeing copy of the target 15 touches; 76's dead branches and 77's dirty-check sit inside functions the others already open.

**Internal order (from the items' own `Do after:` lines):** 16 → 22 · 18 → 23 · 20 → 21. **Promoted to `docs/QUEUE.md` on 9 Sep 2026 in that order**, interleaved with 13, 14 and 15, which keep their existing positions.

~~**Stops for Max:** 16's heal rewrites production `plates` rows. Rehearse on staging; his go on the day.~~
✅ **16 SHIPPED in batch 239 / `ezplate-v197`, and it was deliberately NOT rehearsed on staging** — which is the correction rather than a deviation. The heal is a client-side bulk rewrite, so none of `docs/STAGING.md`'s seven steps reaches it, and staging's invented data cannot answer the question that matters (*does this change a number on Scoopy's real plates?*). It was rehearsed by pulling the real rows READ-ONLY through the MCP and running the real extracted functions over them in Node: 103 plates, 31 lines rewritten, **zero costs moved**. **`CLAUDE.md`'s Migrations section now carries that as the rule**, and it is the stronger of the two — so this line is struck rather than re-pointed. **The half that still stands:** running the heal on production is Max pressing the button, and the app asks him first.
~~**Stops for Max, live:** 18's Tranche 0 half (deleting the bad history point) and 88's answer to *which ingredient did this line mean*.~~
⚠️ **BOTH WERE STALE BY 10 SEP 2026** (AUDIT-v207 §2a.5). **88's is discharged** — batch 249 shipped the surface that asks him, so the answer is a click rather than a stop. **18's has MOVED and GROWN**: 18 is struck and the deletion is item 89's, batch 250 shipped the server half that makes it possible at all, and the count is **two** bad points rather than one (`354.4` all-menus, `30000` on an orphaned per-menu series).
**Stops for Max, live:** **89's** two history points. ✅ **The surface shipped in batch 260 (`ezplate-v214`)**, so this is now a thing he can DO rather than a thing that blocks anything — Settings → Review names each reading and removes it. Deleting production data is still his, every time.

### G2 · The invoice parser — `js/app.js` INV region, `tests/`, `tests/parser-corpus/`

**Context:** the region between `var INV_EXCLUDE=` and `function unitLabelFor(`; `parsePdfLine`, `firstPairPrice`, `packWeight`, `packCount`, `moneyMatches`, `rankCandidates`, `invFixRow`, `invGstDetect`, `invSupplierDetect`; the eval harness at `tests/parser-corpus/` (moved out of `spike/` by batch 256 and now part of `npm test`), its fourteen synthetic layouts, and the six real invoices' truth files, which stay in `spike/parser-audit/real-truth/` because their extracted text carries the cafe's own details and cannot be committed.

**Items:** ~~17~~ (SHIPPED, batch 256, `ezplate-v211`), 26, 37, **92** · rider 71

**Blocked on:** ~~Max putting the parser-region reversal in writing (Tranche 0).~~ ✅ **NOTHING. He wrote it on 10 Sep 2026 (*"its lifted"*) and 17 shipped the same day.**

**Why its own batch:** 17 was fourteen sub-defects with a patch, a corpus test and eight new mutation targets. It was a batch, not an item — **and it turned out to be a batch and a HALF**, which is the part worth keeping now the item is struck. 256 shipped the fix, the corpus and five of the eight targets, and split the other three out as item 92 because adding them reports 34 survivors and the gate fails on any survivor with no written allowance. 26, 37 and 92 are its immediate neighbours and load the same context.
⚠️ **The context line above is now partly wrong and is corrected here rather than left to rot: the harness is NO LONGER in `spike/`.** `run.js` and its fourteen fixtures moved to `tests/parser-corpus/` and are part of `npm test`. What is still in `spike/parser-audit/` is the audit's own tooling — `extract-pdf.mjs`, `real-truth/`, and a `proposed.patch` that has now been APPLIED and must not be applied again.

~~**Also in this batch:** add `spike/` to `.vercelignore`. It is untracked today, and the moment it is committed it is served from the production origin.~~
✅ **BOTH HALVES WERE FALSE when AUDIT-v197 checked them, 9 Sep 2026.** `spike/` is TRACKED and `.vercelignore:33` already lists it, with a comment dated the commit that first tracked it. **The wasted work is not the cost worth naming — the wrong conclusion is.** A batch reading this would believe the production origin is currently serving the spike directory and go hunting a leak that does not exist.

### G3 · Boot, tenancy, grants — `bootstrapSync`, `supabase/migrations/`, `api/`

**Context:** the bootstrap fatal-read list, the three-valued-guard family, RLS and `as restrictive`, `create or replace` ancestry, PostgREST-as-the-client verification.
*(This named `ensureDefaultMenu` and its call-site gate until 10 Sep 2026. Batch 246 DELETED both — the `menus` read is fatal now, so there is no branch left to gate. AUDIT-v207 §2a.6.)*

**Items:** 38, 39, ~~40~~ (243), 41, 42, 73, ~~91~~ (255 + Max's answer, 10 Sep) · `docs/QUEUE.md`'s ~~13~~ (242), ~~14~~ (243), ~~15~~ (244) by reference
*(20 was here until 9 Sep 2026 and moved to G1; the reason is at G1.)*

⚠️ **91 WAS ADDED HERE ON 10 SEP 2026 BY THE PRE-PUSH REVIEW OF THE BATCH THAT RAISED IT — which had just spent a paragraph fixing G1 for the identical omission on item 90, in the same commit.** Batch 252 wrote *"a batch that raises an item routes it in BOTH files, or the group it belongs to silently under-counts"*, added 91 to `docs/QUEUE.md` and the consolidated file, and did not add it here.
**FOUR instances — 88 (AUDIT-v197), 89 (241), 90 (247), 91 (252)** — and the last was committed by the batch diagnosing the third. **89 was found by the check rather than by a reader**: it was split out of 18 by batch 241 and had been unrouted for eleven days, through two audits, while its group read as finished.
**The rule is right, restating it did not work, and it is mechanised now.** `tests/queue-routing.test.js` asserts every `docs/QUEUE.md` item numbered 16 or above appears in an `**Items:**` line here. It failed on the first clean run, which is how 89 surfaced.
It belongs in G3 on context: it is `as restrictive for delete`, one migration, mirrored and pinned exactly as 250's was.

**Ordering:** 40 and 42 ride 14's migration; 73 can ride the same one if the column route is chosen; 25 rides 15 but belongs to G1's context. 38 and 41 must both land before 2b.

**Cost of the context:** this is the group where the migration procedure (`docs/STAGING.md`, seven steps) is paid once for several items. Splitting it pays that cost repeatedly.

### G4 · Copy and terminology — `index.html`, `tests/terminology.test.js`

**Context:** the four object nouns and the forbidden fifth, the naming inversion, the verb table, the `.scr-sub` rule.

**Items:** 46, 57, 58, 60, 78 · the copy half of 51

**Why one batch:** every one of these is a decided vocabulary applied in one pass across one file. Done separately, each batch re-derives the table and they drift.

**Note:** some wording is Max's to approve. Propose the lines in the handover rather than stopping.

### G5 · CSS layout and responsive — `css/style.css`, `tests/visual/`

**Context:** specificity-before-source-order, the `:not([hidden])` idiom, `position:fixed` containing blocks, the breakpoint map, the silent-syntax-error guard.

**Items:** 47, 49, 50, 56, 59, 61, 62, 63, 64, 65, 68, 75

**Blocked members:** ~~66~~ (answered 10 Sep 2026, SHIPPED batch 258) and 85 (his priority call). 85 drops out until answered; the rest do not wait on it.

**Warning specific to this group:** a green pre-push hook is not a green suite — the hook does not run Playwright, and these items change whether controls exist. Run `npx playwright test` before pushing.

### G6 · Popovers, dropdowns and modal layering — one `js/app.js` region

**Context:** `anchorDrop`, `fixedContainingBlock`, `makeInlineCombo`, `reanchorOpenLayers`, the combobox inventory, modal stacking order.

**Items:** 48, 52, 74 · the Save-readiness half of 51

**Why separate from G5:** the defect is JS coordinate arithmetic, not cascade. 48's mechanism is explicitly unmeasured and step one is measuring inside the modal. 52 adds the first reachable modal-over-modal stack, which is exactly what 74 exists to guard — they check each other.

### G7 · Harness, tests and records — `tests/`, `docs/`

**Context:** Playwright meaning and vacuity, the mutation gate and its targets, staging auth, the persona protocol.

**Items:** 44, 79, 80, ~~82~~ (257), 84 (no dependency) · 27, 28, 29 (dependent) · 83 (blocked on Max)

**This is the interleave group.** The five no-dependency items ship no client asset and need no version bump, so they fill the time a batch spends waiting on a Tranche 0 answer. 27 is blocked on the staging account and unblocks 28, 29 and fourteen skipped screenshot tests.

### G8 · The margin monitor — outside the four client files

**Context:** IMAP intake, GitHub Actions cron, Supabase storage paths, the extraction/scoring spike, per-client isolation.

**Items:** 30, 31, 32, 33, 34, 35, 36

**Chain, and it is strict:** `17 → 30 → 31 → 32 → 33 → 34`, with 35 after 31 and 36 after 33. **33 additionally needs 16, 22 and 23** — it prints the weekly page, so it consumes the average named in 23, the price date from 22 and the bare-pid heal from 16, or it prints the wrong page to a bookkeeper.

**So G8 is the reason G1 and G2 come first.** It is the product; the two groups ahead of it are its inputs.

### G9 · Ride-alongs — no context of their own

**Items:** 67, 70, 72, 86, 87

Each rides whichever batch opens its file, per `docs/MAINTENANCE.md`'s standing rule. 87 is blocked on Max's priority call and is a list to put to him, not work to start.

---

## The order

1. **G1** — the wrong numbers, and three of G8's inputs.
2. **G2** — ✅ **the written reversal exists as of 10 Sep 2026.** Unblocks the whole G8 chain.
3. **G4 + G5** — the polish tranche; mechanical, one file each, and the largest item count for the least risk.
4. **G3** — the migration procedure paid once.
5. **G6**, then **G8** as its chain opens.
6. **G7** interleaved throughout; **G9** rides.

**G8's schedule is a consequence of this order, not a separate decision.** Every step of the chain is downstream of 17 and of G1.

---

## What is not routed here

**Tranche 0 is not in any group.** Six things only Max can do — the production data deletions, the staging account, `.env`, the two Supabase dashboard switches, the written parser reversal — and three of them block groups above. They are listed in the consolidated file and belong to him.

**`docs/QUEUE.md`'s six items keep their own file and their own prose.** They are referenced above where a new item rides one of them; they are not restated and not renumbered.
