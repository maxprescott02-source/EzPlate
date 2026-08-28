# AUDIT-v176 — 28 Aug 2026

Run by the `project-audit` agent at `ezplate-v176`, queued by `/batch` step 10 at a gap of 10 from `AUDIT-v166`.
Filed by batch 216. Covers drift across batches 167-215.

**The agent is read-only. Findings marked ✅ VERIFIED were re-checked by hand before filing; the rest are the agent's, reproduced as given.**

---

## Verdict

**The project is healthy.** 1700 pass / 0 fail across 109 files, CI green on `main`, all six version spots agree at 176, the four never-touch functions are byte-identical to their v166 state, all 28 Tier 1 traps still describe live code (seventh consecutive clean dead-trap result), the 77 mutation targets all resolve and all name real test files, and the 22-incident stub roster's header matches its bullet list exactly.

**The single most important finding: the protected parser region was edited by batch 197 and nothing recorded a decision to allow it.**

---

## S1 — THE PROTECTED PARSER REGION WAS EDITED ✅ VERIFIED

`CLAUDE.md`'s rule is absolute: *"Never edit anything inside it. If a fix seems to require it, stop and tell Max — solve outside the region."*

**Re-verified by hand, two ways.** The region hash changed at commit `f259c5c` ("197: the invoice GST conversion runs once, on the price that gets stored", PR #198) and has been stable since. Diffing the region span between `f259c5c^` and `f259c5c`:

- **1 line REMOVED** from inside the region: `if(up!=null && invGst.mode==='inc') up=up/1.1;   // store ex-GST`
- **25 lines ADDED** inside the region, including the replacement conversion and its explanation.

**The change itself is good and is not being questioned.** It fixed a real defect: the GST divisor was applied to the *parser's* candidate price, while `resolveMatchedPrice` could replace `row.unitPrice` outright from a taught pack or supplier memory — both of which re-read the GST-inclusive raw text. So the one path that got divided lost the precedence contest and the two that won were **stored 10% high** while the review screen printed "converted to ex-GST" above them. Measured in that batch: a 10kg taught pack stored $5.50/kg where the parser alone stored $5.00.

**The four never-touch functions were NOT modified** — `resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory` and `packToUnitCost` are byte-identical to v166. So the narrower rule held; the region rule did not.

`HANDOVER-197` discusses the region twice — it notes the queue item pointed at forbidden functions, and defers a *separate* refactor *"because two of the four are inside the protected region, so it needs Max's yes"* — but **never says the batch itself edited inside the region**, and no `docs/decisions/` file records an approval.

**The transferable part is the mechanism, not the incident.** The only region check anywhere is `tests/extractfn.test.js:121`, which asserts the **anchors still slice** — not that the contents are unchanged. Every audit since v125 has compared the hash by hand, and this is the first time it moved. **The strongest invariant in `CLAUDE.md` is the only one with no automated guard.**

⚠️ **This is Max's to rule on, not the assistant's** — it is a decision he made, and the rule's own remedy is "stop and tell Max". Two things are open for him: whether 197's edit is ratified after the fact, and whether the region gets a hash pin in `npm test`. Filed to `docs/MAINTENANCE.md`; **not** actioned here, because the audit item's scope is to report.

---

## S2-S7 — stale `CLAUDE.md` claims

All six corrected in batch 216 under the standing documentation authority. Recorded here because the audit trail is the point.

| | Claim | Reality | Sev |
|---|---|---|---|
| **S2** | The review-artifact gate "lives in `.githooks/pre-push`, which `--no-verify` skips"; the merge is gated "on the suite and the mutation gate, and on nothing else" | `.github/workflows/test.yml:191` runs `node tests/review/check.js` inside the **`unit`** job, which IS a required check. Understates enforcement — the direction that makes a batch think it can skip a gate it cannot | MED |
| **S3** ✅ | "`css/style.css` itself still says 'twelve' in two of its own comments" | **One** hit, `css/style.css:2964`, and it reads *"⚠️ NO COUNT HERE ON PURPOSE"*. The CSS was fixed; CLAUDE.md still cites it as outstanding | MED |
| **S4** | "the comment in `js/app.js` is queued for the same fix in `docs/MAINTENANCE.md`" | Both ends gone — `js/app.js:7726` now cites `backupToPayload` correctly, `docs/MAINTENANCE.md:628` records it fixed | MED |
| **S5** ✅ | Bidfood appears in **26** tracked files, "~20" under `tests/` | **37** tracked files, **27** under `tests/`. The load-bearing facts hold: the letterhead string is present once in `js/app.js`, and `tests/fixtures/base-products.json` holds exactly 393 products | MED |
| **S6** ✅ | "`tests/terminology.test.js` carries two inversion guards" | **Three** — `:98`, `:112`, `:125`. The third is the strongest, pinning the crossing across nav buttons *and* panel headings | LOW |
| **S7** | The `cafe*` grep "finds all thirteen" | Finds **fourteen**; the extra is `cafeDB_menus`, appearing only inside the comment at `js/app.js:2590` explaining the key is dead. Roster entry 183(a) arriving inside the sentence recommending the grep | LOW |

### Verified TRUE — the load-bearing claims, pressed hardest

All 41 named functions exist, unrenamed, exactly once each (incl. `invUnitRebase`, `invPriceUnit`, `fixedContainingBlock`, `anchorDrop`, `plateIdOf`, `publishPlan`, `rowToMenu`, `memKey`). `publishPlan` is the one publish decision, three call sites. Nothing reads the `CX`/`IMP` prefixes — only two mint sites, zero readers. All 17 writes go through `pushWrite`; all 6 deletes are `.eq()`-scoped. Three data-table FKs and 18 total, no migration since 191 adding one. `restore_backup` inserts five tables with `select *`, three name their columns, eight `where true` present. `roles.test.js` holds 187's five and `invites.test.js` 191's four. Two third-party scripts, exact-pinned and SRI'd where the mechanism allows. Branch protection exactly as batch 212 describes it, including the two gaps it names. `addProduct` dead in the app, five live references in `fresh-states.spec.js`. QUEUE at 10 items against a cap of 20 ✅.

---

## Dead traps: NONE — seventh consecutive clean result

All 28 Tier 1 subjects present and reachable, including batch 212's two newest (`.bld-docket{filter:drop-shadow(…)}` still live at `css/style.css:672`; `.suggest-drop` at `:515` still deliberately declares no `position`).

**The growth is the finding this section now carries, with two audits behind it:**

| | v156 | v166 | **v176** | Δ since v166 |
|---|---|---|---|---|
| Whole file | 7,487 w | 14,257 w | **19,320 w / 841 lines** | **+36%** |
| **Tier 1** | 2,642 w | 7,067 w | **10,777 w (28 sections)** | **+52%** |
| Tier 2 | 1,752 | 2,185 | 2,729 | +25% |
| Tier 3 | 2,578 | 3,861 | 4,689 | +21% |

Tier 1 is **56% of a file loaded into every message of every batch**, up 4× in twenty deploy versions. AUDIT-v166 recommended a shared preamble consolidating the six "an operation returns success and does the wrong thing" sections and left it to Max; batch 194 recorded it rather than acting. **It was not taken, and three more sections have been added since.** No deletion is recommended — nothing is dead — but the observation now has a trend line. **Max's call.**

---

## Contradictions

**C1 ✅ — staging is DOWN, `docs/QUEUE.md` knows, `docs/STAGING.md` does not, and `CLAUDE.md` sends batches to `docs/STAGING.md`.** *(HIGH.)*
Measured: `pboidoxjghntalovzrke.supabase.co` → **NXDOMAIN**; production resolves. `docs/QUEUE.md:45` and `:101` both record the outage. `docs/STAGING.md` is 271 lines with **no mention of it**, opening *"the procedure that makes 'rehearse before production' real"*. `CLAUDE.md` says *"STAGING IS NOW REAL … follow it rather than this bullet."* A batch reaching a migration is sent to the one file with no warning, and finds out when a query hangs. **Fixed in batch 216** — `docs/STAGING.md` now carries the outage at the top.

**C2 — `screenshots.spec.js` recorded as DONE and OPEN in `docs/MAINTENANCE.md`, 474 lines apart; the code supports DONE.** `:160` struck through as executed in batch 200; `:634` live and unstruck. `tests/visual/screenshots.spec.js:32` already carries `test.skip` with the reason. **Third recurrence** — 188 and 190 filed it independently, AUDIT-v166 merged those two, the 22 Aug blind audit filed a third that batch 200 did not see.

**C3 — the `docs/PHONE.md` groom is also recorded twice**, `:295` and `:649`, neither citing the other. Same file, same diagnosis, both quoting "756 lines".

**C4 — the same count quoted twice with different values, both stale.** `:299` "756 lines, 173 bullets" and `:649` "756 lines, 38 sections". Actual: **868 lines, 42 sections**.

**C5 — "289 browser specs" in a live item; actual 399 tests across 44 files.** `:563`, from `HANDOVER-178`. Scope understated by 38% and its cost estimate priced off the old number.

**C6 — two live files carry the incident count `CLAUDE.md` itself disowns.** `.githooks/pre-push` says "ten instances across batches 165-176"; `tests/semantic-keys.test.js:21` cites "CLAUDE.md's fourteen-incident rule" against a roster at 22.

**C7 — nit: `.githooks/pre-push`'s header says "Four checks" and runs five.** CLAUDE.md is right and the hook is not, which is the inverse of the usual direction.

---

## Test drift

Clean on counts: 1700/0 across 109 files, no doc stating a disagreeing suite count. `screenshots.spec.js` resolved, not stale (AUDIT-v166 T1 closed). Playwright 399 tests / 44 files, runs in CI, **not** a required check, gated by the `changes` job — verified correct on the last four `main` runs. **No spec references a dead id** (two candidates checked and both false alarms: deliberate absence assertions, and a runtime-built id). Mutation gate healthy — 77 targets all resolving. Nothing runs outside the suite by accident.

---

## Recurring symptoms

1. **Duplicate recording in `docs/MAINTENANCE.md` — three occurrences, and the last audit fixed two.** *(MED.)* Not carelessness: each entry is sound alone, the file is 765 lines, and both duplicates were filed by *different* processes that could not see each other. AUDIT-v166 merged one pair; the mechanism produced two more. **Root cause: nothing checks a new C item against existing ones, and the file has no index.**
2. **Documentation edits parked on an approval that no longer exists.** *(MED.)* `HANDOVER-172` and `HANDOVER-178` each proposed a rule as "needs Max's yes". That requirement was **reversed on 13 Aug 2026** — and the reversal's own justification was that a parked rule sat unapplied while the thing it warned about cost a diagnose cycle. Neither has landed. **The fix that was supposed to close this does not reach edits proposed before it.**
3. **The invoice/taught-pack pricing chain drew three separate root-cause fixes in this window** — 193, 197, 200. Three distinct causes, so not one symptom fixed thrice, but **all three were found by a blind audit or a pre-push review, none by a test**, and the gate was only pointed here in 197.
4. **The three named recurring symptoms produced ZERO new fixes in 167-215** — pack-size persistence, invoice flag-pill alignment, menu/empty-state centring. The last is quiescent, not solved; its root cause is still unnamed.

---

## Dropped threads

| Thread | Status |
|---|---|
| **D1 — `cafeCost_env` is a stamp, not a preference or a cache; `HANDOVER-172` asked for one clause so the next audit does not rediscover it** | **NOT DONE** — and here it is, rediscovered. Tier 2 still says "there is no third category" with the plate draft as the sole exception |
| **D2 — `HANDOVER-178`'s proposed rule: "a primary action must not live inside a node that re-renders"** | **NOT DONE.** Parked on a yes that stopped being required the next day. Earned by a real defect (Save inside `#bFootSum`, click dropped between touchstart and touchend) |
| Abbreviation matching in search | **NOT BUILT**, and the record correction unmade for a **fourth** audit |
| A staging environment | **DONE (172), now UNREACHABLE** — see C1. Worse than "not done", because three docs describe it as available |
| An eval harness for the invoice reader | **NOT DONE.** Sharpened by symptom 3 |
| `manager` as a third role | **DONE — closed by decision and enforced** in SQL. Not a dropped thread |
| The privacy revisit | **PARTIALLY DONE.** Disclosure shipped 27 Aug (208, `v171`); the gate is discharged for the free tier. **The acceptance RECORD is not built** — the tick is never persisted, so nothing knows who accepted which version |
| Catalogue bootstrap · JSON restore · `TODO(Max)` markers | **DONE** — zero markers remain, re-verified |
| **`HANDOVER-175` — the supplier FILTER survives over a field that is 95% empty** | **NOT DONE, and it reached neither `QUEUE.md` nor `MAINTENANCE.md`.** Exists only in a write-once handover |
| **`HANDOVER-197` — the pack-to-unit-price arithmetic is written out FOUR times, and the handover calls extracting it "the real root cause fix"** | **NOT DONE, deliberately unfiled** ("I have not measured whether the four are genuinely identical"). Given that four copies of one formula is exactly why the GST divisor went missing from three of them, this deserves the measurement |
| `setCogs`/`bootstrapSync`/`fmtTargetPct` disagree on fractional targets | **NOT DONE** |
| One magnitude check against real data | **NOT DONE** |
| **Three handover gaps accumulated and none reached the README's gap table** | **NOT DONE.** README lists `v41`, `v65`, `v66`, `batch 189`. **196, 198 and 209 are also missing** — 196/198 docs-only, 209 deliberately unwritten on the open `feature/cafe-creation` branch. The README's own argument is that an unrecorded gap is indistinguishable from a mislaid file |

**Confirmed landed, so nobody redoes them:** AUDIT-v166's S1-S6, S9, C1-C4, D1, D4, T2, T3 all applied in batch 194; S10 corrected on measurement in 203; T1 executed in 200; two backwards CSS comments and the `uid` width comment fixed in 200.

---

## Nothing to report in

Version consistency · the four never-touch functions · the duplicate-definition invariant (guard covers all four keywords and carries its own red-test) · the naming inversion (three guards) · dead traps · suite health · mutation gate integrity · Playwright spec drift · branch-protection claims · third-party pinning · QUEUE discipline · `docs/PHONE.md` currency for batches 208-215 · the `skills/` ↔ `.claude/skills/` symlink relationship.
