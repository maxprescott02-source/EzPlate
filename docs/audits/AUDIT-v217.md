# AUDIT - v217, 15 September 2026

**Previous audit:** `AUDIT-v207.md`, ten deploy versions ago (batches ~252-268).
**Filed by batch 269**, which also made the documentation corrections this audit's findings 1, 2, 4, 6 and 7 called for - those are marked `done: batch 269` at their own entries below rather than queued, per `CLAUDE.md`'s standing authority over documentation.

⚠️ **THE HEADLINE, AND IT IS NOT A DOC NIT: `enforce_admins` IS `true` ON `main` AND FOUR LIVE DOCUMENTS SAID IT WAS `false`** - including `CLAUDE.md`, which loads into every turn of every session and carried the sentence *"an admin merge bypasses everything."* Verified against the GitHub API on the day of filing: `{"contexts":["unit tests","smoke (jsdom)"],"enforce_admins":true}`. Max evidently ran batch 265's one-liner after that batch merged, and nothing in the repo noticed. Corrected in all four places.

⚠️ **AND THE SECOND ONE IS A RULE THIS REPO SHIPPED THE DAY BEFORE, WRONG IN THE DIRECTION THAT MANUFACTURES BUGS.** Batch 268 wrote *"the subtitle slot does not exist on a phone at all"* into `.claude/rules/css.md`. Six of the seven `.scr-sub` elements vanish below 768 and **`#menuHeadSub` does not** - `css/style.css:4043` sets `display:block` at id specificity outside any media query, with its own comment explaining why the Menu screen needs it. **Consolidated item 61 is the Menu screen**, and a batch running it with the absolute in hand would have concluded the menu name was invisible on mobile and duplicated it into the body - manufacturing the two-places bug 268 spent a batch removing. Corrected.

---

## Method limit, stated first

The Supabase MCP tools were not exposed to the audit agent (same as `AUDIT-v207`), so **every SQL-side claim below was checked against the committed migrations and `supabase/staging/01-schema.sql`, never against `pg_policies` or `pg_constraint`.** The **GitHub API was reachable**, and that is where the top finding came from. Handovers were read newest-first: 264-268 in full, the Probe/Surprises sections of 253-263, and 240-251 via `AUDIT-v207`.

**Verdict: the project is healthy and the machinery built in 263-266 is working.** `npm test` is **2312 pass / 0 fail / 0 skipped**. All six version spots read 217. Both parser anchors live. Every function named in `CLAUDE.md` and `.claude/rules/*.md` exists and carries tests - 16 of 16 spot-checked. `docs/STATE.json` is byte-current. **Zero dead traps, second audit running.**

---

## 1. Invariants - all clean

- **Protected parser region** - both anchors live: `js/app.js:12326` (`var INV_EXCLUDE=`) and `js/app.js:12791` (`function unitLabelFor(`). `tests/_extract.js:23` still slices on those exact strings. The slice moved twice across the stretch (17437 bytes at 252, 32561 at 256, 36184 from 263) and **both moves are authorised** - protection was lifted 10 Sep 2026.
- **No twice-defined top-level name** - `tests/housekeeping.test.js:208` asserts absence across `function`/`var`/`let`/`const`, and `:222` proves the guard can go red against injected source.
- **Naming inversion** - all three crossings present, all three guards in `tests/terminology.test.js`.
- **Six version spots agree at 217**, now mechanically pinned by `tests/cache-version.test.js` reading `tools/bump-version.js`'s own `readSpots()` rather than a second set of greps. **This is the gap `AUDIT-v207` could not have caught and 265 closed.**
- **Four never-touch functions present and unrenamed** - `resolveMatchedPrice` (13 refs), `unitCatCategory` (5), `applySupplierMemory` (4), `packToUnitCost` (5).

---

## 2a. VERIFY - claims checked one at a time, ranked by consequence

**1. `CLAUDE.md` stated a security control as OFF that is ON. [A]** — **done: batch 269**
It read *"`enforce_admins` is FALSE, so an admin merge bypasses everything."* The API returns `"enforce_admins":{"enabled":true}`. Everything else in that sentence was correct - contexts are exactly `["unit tests","smoke (jsdom)"]` and Playwright is not required.
Wrong in **four live places a batch reads**: `CLAUDE.md`, `.claude/agents/code-review.md`, `docs/MAINTENANCE.md` (gap E5, marked OPEN with "one API call" as the remaining work), and `docs/rules/process.md`. It also *understated* the gate - a batch believed it could land a bad merge as admin and cannot.

**2. `docs/MAINTENANCE.md`'s E-list marked E6 OPEN; batch 265 shipped exactly its remedy. [B]** — **done: batch 269**
E6 read *"Six cache literals, four of them unchecked by anything. OPEN. One bump script and one test over all six."* `tools/bump-version.js` and `tests/cache-version.test.js` are both in the tree and both do precisely that. **A done-mark-is-not-a-strike recurrence, one batch after the file that carries that rule.** E5 is the same row in the opposite direction.

**3. Three OPEN tier-B backlog items are in no group, so the refill can never reach them. [B]** — **done: batch 269**
Items **24, 53 and 54** are unstruck, graded **B**, and appeared in no `**Items:**` line in `docs/QUEUE-GROUPS.md`. Also unrouted, tier C: **43, 45**. Item **85** was named in G5's prose but not in its `**Items:**` line, so the derivation could not see it.
This is the fifth through seventh instance of a defect recorded four times (88, 89, 90, 91) and mechanised by `tests/queue-routing.test.js` - **but that test only checks items already PROMOTED into `docs/QUEUE.md`**, and says so in its own header. The mechanism was never generalised to the backlog, and three B items were invisible for weeks.

**4. `.claude/rules/css.md` stated an absolute that one of its own seven subjects contradicts. [B]** — **done: batch 269**
See the header. Six of seven vanish below 768; `#menuHeadSub` does not. The absolute was one day old and was the one that would have been quoted, by item 61, about the exact screen that is the exception.

**5. `tools/state.js`'s `open_ab_count` cannot see an unnumbered item. [C]** — **done: batch 269**
`docs/STATE.json` said `3`; `docs/QUEUE.md` had **four** item headings. The `project-audit` entry has no number, so `queueItems()`'s regex skips it - and `tests/state-file.test.js` used a regex with the same requirement, so both agreed and the suite was green. Since batch 265 explicitly allows one un-numbered process item to hold a slot, the count under-reported the working set by one whenever that slot was filled.

**6. `CLAUDE.md` and `tools/state.js` still said `docs/QUEUE.md` holds "tier A and B only". [C]** — **done: batch 269**
`docs/QUEUE.md` (batch 265) reversed that: *"AT MOST ONE PROCESS ITEM MAY HOLD A SLOT."* `HANDOVER-265` recorded *"Into CLAUDE.md: Nothing."* Two files were changed and the index row describing them was not.

**7. `tools/state.js`'s header overstated by one field. [C]** — **done: batch 269**
*"EVERY FIELD IS DERIVED FROM A FILE, NEVER FROM MEMORY"* - `written_at` is `new Date()`. The per-field docs were honest about it; the headline was not.

### Verified correct - the claims most likely to have rotted

Checked and reproduced, one at a time: **13 `cafe*` keys with a 14th hit that is prose** ✓ · **`TAB_PANES` holds nine** ✓ · **15 `type="number"` inputs, 14 carrying `min="0"`** ✓ · **the roster header says twenty-two and the list has exactly 22 bullets** ✓ · **the three app foreign keys and their ON DELETE behaviour**, matching `.claude/rules/app-data.md` row for row *(file-level; confirm against `pg_constraint` before acting)* ✓ · **`is_custom`, never the id prefix** - zero readers of either prefix ✓ · **393 real products in the fixture; 58 tracked files name the distributor** ✓ · **third-party pins and their integrity hashes** ✓ · **four CI jobs with four `timeout-minutes`; five numbered pre-push checks** ✓ · **the staff-delete asymmetry, `AUDIT-v207`'s open question: ANSWERED AND SHIPPED** in `20260910_staff_deletes.sql` ✓ · **`docs/STATE.json` current on every field**, with `first_unstruck_group: "G4"` independently re-derived ✓

---

## 2b. DEAD TRAPS - recommended for removal

⚠️ **WHAT `tests/audit-closure.test.js` ACTUALLY POLICES IN THIS FILE, because batch 269 believed it was more and the pre-push review measured it: THIS SECTION ONLY.** The gate opens on a heading matching `recommendations?`/`recommended for`/`what to change`/`what to do`/`proposed fixes`, and **`2b` is the only heading here that does.** The numbered findings in `2a`, `2c` and `3` are never examined - so the `done:` / `#nn` markers they carry are **a convention this audit chose, not a gate that would redden without them.**
The first version of this file also wrote its one recommendation as *"Recommendation 1:"*, which the gate's `NUMBERED` pattern does not match either - so **the file passed with every marker stripped out.** Measured by running the unmodified checker against the unmodified file, then against a copy with all markers deleted: `[]` both times. It is written as `**1. …**` now and the gate bites.
**The gate was not widened.** Its own site records why a bare `recommend` was rejected, and that reasoning still holds; what was wrong was this file's shape and the reader's belief about its reach. **If a future audit wants its findings policed, put them under a heading the gate recognises** - do not assume markers elsewhere are load-bearing.

**None.** Every subject named in `CLAUDE.md` and in `.claude/rules/*.md` is live in `js/app.js` with tests behind it - 16 of 16 checked, 3-21 test files each. `addProduct` is dead in the app and **deliberately kept**, which is a decision entry and stays whatever the code does.

Classified so the next audit does not redo it: the **`min="0"` entry is a rule whose subject is deliberately kept**; the **parser-region entry survives the lifting of its own protection** because the two anchor literals are still load-bearing for `tests/_extract.js`; the **`ensureDefaultMenu` paragraph was already rewritten by 246** and `tests/menu-default.test.js` pins its absence.

**1. Narrow this check's standing instruction.** — **done: batch 269**
It exists because *"Tier 1 only grows and nothing prunes it."* Since batch 264 that premise no longer holds: `CLAUDE.md` is capped at 200 lines and 32KB by `tests/claude-md-split.test.js`, the rule files load only on a matching read, and `MANIFEST` makes a deletion a deliberate visible act. **Two audits running have found nothing.** Narrow it from *"walk every Tier 1 entry"* to *"walk any entry added since the last audit, plus any rule whose named code the invariant sweep did not find"* - the sweep in section 1 already produces that list for free.
*(Applied to the `project-audit` agent definition by batch 269. ⚠️ That definition lives OUTSIDE this repo, at `~/.claude/agents/project-audit/project-audit.md`, so there is no diff of the change here - which is consolidated item 83's whole point.)*

---

## 2c. CONTRADICTIONS

**C1 - `enforce_admins`, and the code supported NEITHER cleanly. [A]** — **done: batch 269**
`docs/decisions/2026-08-22-blind-audit-outcomes.md` states it as a **decision**: *"deliberately false."* Four other documents describe it as an **open gap to be closed**. **The live setting is now `true`, so both were stale**, and the decision file records a position that has been reversed without being revisited. Per `CLAUDE.md`'s own rule, reversing a decision Max made himself is his; he appears to have made it, and no file knew.

**C2 - what `docs/QUEUE.md` is allowed to hold. The code supports `docs/QUEUE.md`. [C]** — **done: batch 269**
See 2a.6.

**C3 - does the header-subtitle slot exist on a phone? The code supports "six of seven". [B]** — **done: batch 269**
See 2a.4. Both sides were written by batches that were right about their own screen.

**C4 - commit co-authorship. The code supports neither, which is the worst case. [C]** — **#87** (put to Max as a decision, not taken)
`AGENTS.md` says *"Never add yourself as commit co-author."* Every recent merge commit carries a `Co-Authored-By:` trailer, because the harness instructs it. `HANDOVER-264` flagged it verbatim - *"which one is wrong is his call"* - and it reached **neither `docs/QUEUE.md` nor `docs/PHONE.md` nor `docs/MAINTENANCE.md`.** **A repo rule that every commit breaks is a rule that teaches readers to discount the file it lives in.** Routed to the decision list for Max rather than resolved by a batch, because `AGENTS.md` is his working-preferences file.

---

## 3. Test drift

1. **`tests/visual/screenshots.spec.js` has been dark since `ezplate-v162` - now 55 deploy versions, 14 tests. [B]** Blocked on the staging test account (consolidated item 27), which `docs/QUEUE-GROUPS.md` names as **the one live Tranche 0 gate left**, estimated at two minutes, and which also unblocks 28 and 29. **Top test-drift finding in three consecutive audits.**
2. **`tests/mutation/targets.js`'s `pending` list is still empty** and `applyInvoice` is neither a target nor pending - 148 targets, none of them it. **Correctly filed now** in `docs/MAINTENANCE.md` with the measure-first mechanism `AUDIT-v207` asked for. Filed, not done. **[C]**
3. **No count drop, no vacuity found in the new tests.** All fourteen test files added in 252-268 were sampled. Eleven use `extractFn`/`new Function` to run the real code; the only source-shaped assertions are in `tests/import-summary.test.js`, and all ten are `assert.match` against output the test actually rendered. Four of them carry an explicit self-test proving the checker can return a violation. **Answering the brief's question directly: no recently-added test was found that could not fail.**
4. **One roster candidate, offered rather than asserted. [C]** — **done: batch 269**
   268's review killed a test that located a CSS media block *by slicing to the next `@media` token*, so moving the rule to top-level CSS would have kept it green while reintroducing the bug. That is a **new shape**: a structural locator that silently widens its own scope. Added as roster bullet 23.
5. **Playwright is still not a required check**, correctly described everywhere. One flake recorded in `HANDOVER-267` and not chased; one is not a pattern.

---

## 4. Recurring symptoms

**S-A - the pre-push review found a real defect in the batch's own work in 264, 265, 266, 267 AND 268. Five for five**, and 267's was a defect the batch had just created in the field it had just fixed. The reviewer also **undercounted twice**, which is the "run the finding's own repro, then its fix" rule paying for itself in both directions. **No new rule recommended; the channel is working and the rate is the finding.**

**S-B - an item's enumeration comes back short at execution. Now unbroken across 261, 266, 267, 268.** 268 found *"about nineteen lines of drift"* and an **arithmetically wrong number** in item 58. **The `premise-check` subagent 266 shipped is the mechanisation of this and it is already earning.**

**S-C - the mutation gate believed to be editing `js/app.js` under the batch, and killed. Twice: `HANDOVER-267` and `HANDOVER-268`. [C]** — **done: batch 269**
268 records that 267's *Surprises* section had already answered it, in this repo, three days earlier, and it still cost eighteen minutes and a full re-run. **It was written only in two handovers, which no batch reads.** One sentence now sits in `.claude/rules/tests.md`, which loads with the file.

**S-D - a comment or grep assertion searching PROSE as well as code (roster 183a). Twice more this stretch**, both caught. Already a roster entry; recorded to show it is still the most frequently re-encountered one.

**The three named examples: no new instances.** Pack-size persistence, invoice flag-pill alignment and menu empty-state centring all remain dormant rather than resolved.

---

## 5. Dropped threads

| Thread | Status |
|---|---|
| **`enforce_admins`** | ✅ **DONE by Max**, and four documents did not know - corrected by 269 |
| **Staging test ACCOUNT** | ❌ **NOT DONE - fourth audit running.** 14 tests dark 55 deploy versions |
| **Eval harness for the invoice reader** | ✅ DONE, batch 261 - with the honest limit that the six real invoices cannot be committed |
| **Privacy revisit / free tier** | DISCHARGED for the free tier; the **acceptance RECORD is still not built** (item 41) |
| **Supabase dashboard: Site URL, Redirect URLs, leaked-password protection** | ❌ **NOT DONE.** A stranger's sign-up is still broken and nothing in the repo can fix it |
| **The two bad production history points** | ⚠️ **NOW POSSIBLE, still not done.** 260 shipped the surface; deleting them is Max's, every time |
| **Batch 197's parser-region edit - ratification** | ✅ **MOOT.** Protection lifted 10 Sep 2026. **Four audits carried this; struck below** |
| **The delete-rule asymmetry (v207's open question)** | ✅ ANSWERED AND SHIPPED, batch 255 + Max's 10 Sep answer |
| **`applyInvoice` as a mutation target** | FILED, not done - and now filed *properly*, with the `pending` mechanism |
| **Six `Document No:` remembered packs** | ❌ NOT DONE - measured at six on 10 Sep, waiting since 3 August |
| **`tools/state.js` as a mutation target** | ❌ REACHED NOWHERE. 266's Probe declined it as out of scope and it reached no file |
| **"`.mcp.production.json` means a `/batch` cannot reach production"** | ❌ **NEVER PUT TO MAX.** 263's Probe called it *"the one thing in the batch worth Max's attention"*. The state is documented; the *question* reached no decision file |
| **Commit co-authorship** | ❌ REACHED NOWHERE, flagged by 264 as his call - routed to #87 by 269 |
| **"No fetch in this app has a timeout" - watch for a third instance** | ⚠️ **NOBODY IS COUNTING.** 253 filed nothing pending a third instance; whether 260's `writeLanded` is the second or a different thread is undecided, and no file holds the tally |

### Two retirements

1. **"Batch 197's parser-region edit - ratification."** Carried as NOT DONE by three audits. Max lifted the protection outright on 10 Sep 2026, in writing. **There is nothing left to ratify; struck from the standing checklist.** — **done: batch 269**
2. **"Abbreviation matching in search" and `TODO(Max)` markers** - already retired by `AUDIT-v197`, and **the record held**: neither was re-derived. **Reported as the record working rather than as a finding.**

---

## Nothing to report in

Version-spot agreement (now mechanically pinned, which it was not at v207) · the protected-region anchors and the four never-touch functions · the duplicate-definition guard and its self-test · the naming inversion, all three crossings and all three guards · test-suite health, monotonic 2049 → 2304 → 2312, matching the newest two handovers exactly · `docs/STATE.json` and every one of its seven derivations · dead traps, zero, second audit running · the rule-file `paths:` frontmatter, all seven declaring globs that match real files · Supabase write discipline and the three app foreign keys (file-level) · the review-artifact gate, unbroken 252-268 · the reviewer model override, stated in all five handovers · `docs/PHONE.md`, five checks with the cap and the entry test both respected · the handover record, every batch stating its deploy version or saying it shipped none.
