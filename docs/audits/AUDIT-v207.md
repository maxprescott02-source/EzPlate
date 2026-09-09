# AUDIT-v207 — 10 September 2026

**Run by the `project-audit` agent, filed by batch 252.** Previous report: `AUDIT-v197.md`, ten deploy versions and eight batches ago (244-251).

⚠️ **METHOD LIMIT, STATED FIRST BECAUSE IT BOUNDS SECTION 2a.** The Supabase MCP tools were not exposed to the agent, so **every SQL-side claim below was checked against the committed migrations and `supabase/staging/01-schema.sql`, never against `pg_policies` or `proacl`.** `CLAUDE.md`'s own instruction — *"check `proacl`, never the file"* — stands and is the right one. Where this batch could check the live databases it did, and those results are marked as such.

**Verdict: the project is healthy and this stretch is the most disciplined it has been.** `npm test` is 2049 pass / 0 fail / 0 skipped, matching `docs/reviews/REVIEW-251-recent-changes.md` exactly; the count rose monotonically 1915 → 2049 across eleven batches with no unexplained drop. All six version spots read 207. The protected parser region is byte-identical to its v197 baseline. All three new Tier 1 sections (244, 245, 248) check out line by line, including their measured numbers.

**The single most important finding: `CLAUDE.md` stated a CLOSED security gap as open**, in the one file loaded into every message of every batch, pointing at a maintenance entry already struck — and it was wrong in the other direction too, naming two fixed functions while omitting the ones that still lack a by-name revoke. Fixed by this batch.

---

## 1. Invariants — all clean

- **Protected parser region** — both anchors live (`var INV_EXCLUDE=`, `function unitLabelFor(`); `tests/_extract.js` still slices on those exact strings. Measured, not assumed: the slice is identical at batch 240 (the v197 baseline) and at batch 251.
- **No twice-defined top-level name** — `tests/housekeeping.test.js` asserts absence across `function`/`var`/`let`/`const`, with a self-test proving the guard can go red against injected source. Both halves intact.
- **Naming inversion** — `pantry`→"Ingredients", `ingredients`→"Products", `builder`→"Plates". Three guards in `tests/terminology.test.js`.
- **Six version spots agree at 207.**
- **The four never-touch functions present and unrenamed** — `packToUnitCost`, `applySupplierMemory`, `unitCatCategory`, `resolveMatchedPrice`.

---

## 2a. VERIFY — claims checked one at a time, ranked by consequence

**1. `CLAUDE.md` stated a closed hole as open, and omitted the open ones. [FIXED, batch 252]**
It told every batch that `claim_business_invite()` and `business_team()` carry an open `anon` execute hole "filed in `docs/MAINTENANCE.md` rather than fixed on sight". **Batch 243 closed both on 9 September**, on staging and production — by-name revokes in `20260909_invite_choice.sql`, mirrored in `01-schema.sql`, with `docs/MAINTENANCE.md` and consolidated item 40 both struck. 243's handover says *"Into CLAUDE.md: Nothing."*
Wrong in two directions at once: it named two functions that are fixed, and named none of the seven that still carry no by-name `anon` revoke — of which `restore_backup` and `set_member_role` are the two worth naming, both body-guarded, both the same "callable-and-raising" shape `create_business` was.

**2. Consolidated item 21's body teaches the mistake batch 247 was corrected for. [FIXED, batch 252]**
It states as shipped fact that three sites are ungated because `setProducts` returns a chunked write whose verdict is a manifest. The code gates two of the three, each with a comment saying that argument was **false there**, and `CLAUDE.md` records it as the first of the two instances behind its "cite a precedent" rule. The struck item is what the next reader consults.

**3. Tranche 0 says `.env` is not in `.gitignore`. It is**, since batch 240. Unstruck — a "done-mark is not a strike" recurrence one batch after AUDIT-v197 named that shape. **[FIXED, batch 252]**

**4. `docs/QUEUE-GROUPS.md` G1 is eight items out of date and item 90 is missing entirely. [FIXED, batch 252]**
All eight listed items shipped. Item 90, raised by 247, appears nowhere in the routing file — which is exactly AUDIT-v197's finding C4 about item 88, and the rule that audit produced (*"a batch that raises an item routes it in BOTH files"*) was broken by the next batch to raise one. **This mattered immediately**, because the refill rule reads that file.

**5-7. Three more stale routing claims. [FIXED, batch 252]** G3's context names `ensureDefaultMenu` and its call-site gate, both deleted by 246; the "Stops for Max" list names two stops that are discharged; Tranche 0's data bullets are stale in both directions.

**8. `applyInvoice` as a mutation target has no home. [FILED, batch 252]** Item 22 asked for it; 248 declined and routed it to a maintenance entry that does not mention it, and `tests/mutation/targets.js`'s `pending` list is empty. The request existed only in a struck item and a handover.

**9. `dbSetSetting`'s toast wording reached nothing. [FILED, batch 252]** 244 routed it to item 46 *"because it is that item's subject"*; item 46's body never mentions it. `CLAUDE.md` requires a note aimed at one future item to live **in that item's body**.

**10. `docs/MAINTENANCE.md` and AUDIT-v197 disagree on whether a region hash has ever been compared. [RESOLVED, batch 252 — see C6.]**

### Verified correct — the claims most likely to have rotted

All three new Tier 1 sections reproduce against the code, including their numbers: **244**'s `cogsServer`, sequence guards, two-guard rollback, tenant clearing, and the 500 ms debounce with a `change` flush; **245**'s count of 15 `type="number"` inputs of which 14 carry `min="0"`, and all four guarded handlers; **248**'s `price_as_of` stamp, the ungated `invoice_applied` entry with `attempted` counts, and "Supplier move" on both headers.

Also verified: `setProducts` is the sole writer of `ing_price_history`; every Supabase write goes through `pushWrite` and every `.delete()` is `.eq()`-scoped; the rewritten Menus paragraph's three `menusList` writers all wait on the server; 13 `cafe*` keys with 14 grep hits and one prose; `TAB_PANES` holds nine; the roster header says twenty-two and the list has 22 bullets; four CI jobs with four `timeout-minutes`; the pre-push hook's five checks; `addProduct` still has five uses in `fresh-states.spec.js`; every file named in `CLAUDE.md` and the handovers exists (30 checked, zero missing); the handover gap table matches; every handover 240-251 states its deploy version and uses the `v`-less naming; "72 items" is gone from all four files.

---

## 2b. DEAD TRAPS — recommended for removal

**None.** Every Tier 1 subject is live. The one Tier 1 line needing an edit was §1 above, and it is a **correction rather than a prune** — the `revoke … from public` rule itself is sound and load-bearing.

Classified so a future audit does not redo it: **244 and 248 are decisions plus a live remedy**; **245 is a rule whose subject is deliberately kept** — the `min="0"` attribute stays alongside the guard and the test asserts both, so deleting either half is the regression.

---

## 2c. CONTRADICTIONS

**C1** — item 21's ungated-sites paragraph against `CLAUDE.md` against the code. **The code supports `CLAUDE.md`.** [FIXED]
**C2** — `CLAUDE.md` against `docs/MAINTENANCE.md`, consolidated item 40, and the migrations. **The code supports the struck version.** [FIXED]
**C3** — Tranche 0's `.env` bullet against `.gitignore`. **The repo supports "done".** [FIXED]
**C4** — `docs/QUEUE-GROUPS.md` G1 against the consolidated file's strikes. **The consolidated file is right**, and it is the one the refill rule derives from. [FIXED]

**C5 — the protected parser region: partly resolved, still open, still Max's.**
240 correctly moved item 17 to `blocked` in both files, which removes the mechanism that would have let `/batch` edit the region without authority. **The four-document disagreement itself is unchanged** and there is still no decision file. What this audit adds that the last could not: **the region has not moved since**, so batch 197's edit is the only one outstanding for ratification, and one sentence still settles both questions.

**C6 — has a region hash ever been compared? [RESOLVED, batch 252, and the resolution is instructive.]**
The agent recommended recording a specific md5. **Batch 252 could not reproduce it** — four plausible slice variants against `tests/_extract.js`'s own `sliceBetween` semantics all disagreed with it, while agreeing with each other on the line count. So the number was not recorded.
⚠️ **That is the maintenance entry's own instruction proving itself in one step:** *"compute it at the time rather than trusting a number written here."* A bare hash in prose is an artefact nobody can falsify — and the recommendation to write one down arrived from a process whose value was that it checks things. **The hash was computed by this batch, by the app's own slicer, and deliberately not enshrined.** A pin in `npm test` remains Max's call, exactly as the entry says.

---

## 3. Test drift

1. **`tests/visual/screenshots.spec.js` has been dark since `ezplate-v162` — 45 deploy versions, 14 tests.** Blocked on the Tranche 0 staging account, estimated at two minutes, which also unblocks items 27, 28 and 29.
2. **Two Playwright runs discarded in three batches, same cause, and the fix was written nowhere durable. [FIXED, batch 252 — now in `skills/verify`.]** 246 launched a background run while the tree was still being edited: **47 minutes against a normal 8.6, 466 passed where 474 was expected, exit code 0, no failures reported** — a green result worth nothing that looks exactly like a good one. 248 hit it again. The remedy existed only in those two handovers.
3. **`tests/mutation/targets.js`'s `pending` list is empty** and `applyInvoice` is neither target nor pending. [FILED]
4. **No count drop and no vacuity found.** `tests/menu-default.test.js` asserts `ensureDefaultMenu` is **gone** rather than pinning it — the right shape for a rewritten spec.
5. **Playwright is still not a required check**, unchanged and correctly described.

---

## 4. Recurring symptoms

**S-A — the pre-push review found a defect in the batch's OWN work in nine of eleven batches** (241, 242, 243 ×2, 244, 245, 247, 248, 249 critical, 251). Clean: 246 and 250. **Three were exemptions the author had written a justification for**, and `CLAUDE.md`'s new "cite a precedent" rule covers exactly that.

**What is still missing is not a rule, it is the channel.** Every one was caught by a convention `--no-verify` skips, whose artifact gate can only tell whether a file *claims* a review happened. Two things in this stretch point at where the value concentrates: **250's reviewer read `pg_policies` on both live projects rather than the diff, and returned the only clean verdict of the stretch** on the one change whose subject was what the server permits; and **249's critical was invisible at the call site** — the code passed an average, and what was wrong was the *absence* of the second one. Neither is reachable by the mutation gate or the suite.

**S-B — an item's enumeration comes back short**: 241 (4→9), 242 (2→12), 245 (2→4), 247 (2→18). **The rule is working** — every one of those batches grepped unprompted.

**S-C — emerging, three instances: a branch that cannot fire, written and then removed.** 245 declined a guard that could never fire; 251 removed a word whose entry the filter always drops *and* a test whose fixture no writer can produce; 249's gate reported seven survivors on guards no fixture reached. All three reason from the v112 `plateIdOf` precedent, re-derived each time. **No rule recommended** — every instance was caught, and `CLAUDE.md` warns against a bullet per instance. Named so a fourth is recognised as a shape.

**S-D — backticks inside a `new Function` template-literal sandbox**: 242 (twice), 247. Both files carry a note; 247's observation is that *"reading the note does not help, because you are not reading it when you write the comment"*. It fails loudly and instantly, so no rule — recorded so a fourth instance changes the answer.

**S-E — `logChange`'s live `avgAfter` default is a landmine and its warning was at the wrong end. [FIXED, batch 252.]** Batched over N plates it made every entry carry the whole batch's movement, and `trendMarkers` sums per day — 249's critical drew **twice** the real fall. The hazard was explained at two **call** sites and at neither the definition nor `trendMarkers`, which is where the next author writing a batched caller will be standing.

**S1 and S2 (parser): no new instances** — both gated on C5, which is the honest reason rather than evidence they are fixed.
**S4, S5: still settled**, zero occurrences across handovers 240-251.

---

## 5. Dropped threads

| Thread | Status |
|---|---|
| Fingerprint diff after 250's migration | **DONE, batch 252** — all seven identical, `policies_fp` 28 on both |
| Staging Supabase environment | DONE (172) |
| Eval harness for the invoice reader | PARTIALLY — gated on C5 |
| `manager` as a third role | NOT DONE — deliberately folded, correctly |
| Privacy revisit before other cafés' data | DISCHARGED for the free tier; the **acceptance record** is still not built (item 41) |
| Bulk catalogue bootstrap | DONE (193) |
| Import/restore from JSON backup | PARTIALLY — item 5, blocked on Max's go **on the day** |
| **Supabase dashboard: Site URL, Redirect URLs, leaked-password protection** | **NOT DONE — a stranger's sign-up is still broken.** Nothing in the repo can do it |
| **Staging test account** | **NOT DONE** — two minutes; 14 tests still dark |
| **The two bad production history points** | **NOT DONE, and now measured at TWO.** Destructive, so Max's |
| **Batch 197's parser-region edit — ratification** | **NOT DONE, three audits** — folds into C5 |
| "Commit first, run Playwright second" | **DONE, batch 252** — now in `skills/verify` |
| `applyInvoice` as a mutation target | **FILED, batch 252** |
| `dbSetSetting`'s toast wording → item 46 | **FILED into item 46's body, batch 252** |
| 249's six orphaned products | **FILED, batch 252** — it had reached nowhere |
| **The other eight tables' delete rules** | **ANSWERED, and it is not empty — see below** |

### The delete-rule asymmetry, answered

Read from `supabase/staging/01-schema.sql` (file-level; confirm against `pg_policies` before acting):

- **Owner-only DELETE:** `plates`, `menus` (187), `price_history`, `menu_price_history` (250), and `app_settings` **only** for `key='food_cost_target'`.
- **No DELETE at all:** `ing_price_history`, `menu_change_log`.
- ⚠️ **Any member — staff included — can DELETE from `ingredients`, `menu_items` and `supplier_phrases`**, via the same permissive `FOR ALL` tenant policy that made `price_history` a hole.

**The asymmetry to put to Max: staff may not delete a plate, and may delete every product that plate costs from.** Queued as a blocked item by batch 252, because what staff may do is his decision (187 was his).

---

## Nothing to report in

Version-spot agreement · protected-region anchors, the four never-touch functions, and the region's contents · the duplicate-definition guard and its self-test · the naming inversion · test-suite health (2049 pass, monotonic, matching the newest review artifact) · the three new Tier 1 sections · batch 250's migration, mirror and pinning tests · the review-artifact gate (unbroken 241-251, with only 240 missing under the documented pure-prose exemption) · Supabase write discipline · the handover record · Tier 1 dead traps · pack-size persistence, invoice flag-pill alignment, menu empty-state centring.
