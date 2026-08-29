# Queue

Worked top to bottom by `/batch`. Position is priority. Max adds problems, not briefs: what is wrong, and what must be true when it is fixed.
**Tier test — if we launched to paying customers tomorrow, would this item stop us, embarrass us, or hurt them?** **A** = launch is impossible or unsafe without it. **B** = a real person using the app would see something wrong, broken or half-finished. **C** = everything else → `docs/MAINTENANCE.md`, whose items **ride whichever batch already touches the file** (Max, 22 Aug 2026, retiring the 13 Aug parallel worktree track on measured evidence; that file's header has the reasoning). **Ambiguous is C.**
**Capped at 20 items.** A new A or B displaces the lowest-priority item here into maintenance; it never extends the file.
**`Blocked on:`** = waiting on a person or an outside thing — `/batch` skips it. **`Do after:`** = waiting on another item in this file, and it is DELETED the moment it is satisfied.
**`project-audit` reports; it does not add queue items.** A finding from a batch defaults to C unless it passes the tier test. **Nothing about the process itself belongs here.**
*(The one exception this file has ever carried — the mutation-testing gate, which Max put here himself on 13 Aug 2026 over that rule — shipped in batch 180 and its item is deleted. It was never precedent: only he can override this line, and he did it once, in writing, with the count that justified it.)*

---

# Design law — inherited from the v3 fold-in, and STILL BINDING

⚠️ **This heading read "Phase law — the v3 fold-in (F8-F10)" until 12 Aug 2026.** It named three items that have all shipped, which invites the reading that the whole section is spent scaffolding. **It is not.** AUDIT-v156 checked precisely this: the R1-R5 rubric, the standing rules, the §4 acceptance criteria and the shared-CSS-families warning below were cited **by rule number** in both 175 and 176, and they bind every screen touched from here on. The retitle is the fix; deleting the section is the mistake it was written to prevent.

**`docs/design_handoff_ezplate_redesign/FOLD-IN-PROTOCOL.md` is the law of this phase** and supersedes spec §11. Spec: `V3-Design-Package.md`. Mocks: `Redesign v3 - SaaS.dc.html` (desktop) and `Redesign v3 - Mobile.dc.html`, light AND dark.

**The mock is truth for structure, hierarchy and interaction; the app is truth for data, business rules and side effects.** Each screen's view layer is REBUILT from the mock and re-attached to the existing logic — never restyled in place. A screen is fully v3 or fully untouched. **A converted screen deletes its old markup and its old CSS in the same change, each selector grepped against `index.html` AND `js/app.js` first — that per-screen deletion IS the mechanism, and there is no other one.**

**Conversion state is read from THIS FILE'S F-items and nowhere else** — not from the paint. F1a-F10 have ALL shipped (`ezplate-v136`-`v143`, F7 as `v146`, F8 as `v147`, F9 as `v148`, F10 as `v149`). No F-item remains.
✅ **THE PHASE IS FINISHED, 11 Aug 2026.** The last piece of §6 was `The mobile More screen` — which no F-item ever owned, and without which the §6.1 parity map was unmet by construction — and it shipped as `ezplate-v151` (batch 171): the phone's five-tab bar with More, the four sub-screens under it, each with a "‹ More" chevron, and the sidebar's bottom group grown to the same four in the same order. **What this unblocks is `The restore's full-wipe step`, which was SCHEDULED for the batch after the phase closes** — see that item; it is the next thing due and it needs Max's go on the day.
There was no reset pass and no clean starting line (Max, 10 Aug 2026, overriding §0a): §2 binds FORWARD, and it still does — a screen touched from here on is still fully v3 or fully untouched.

**Conflicts walk the §3 rubric and the rule number is recorded at the site:** R1 presentational → mock wins · R2 real constraint → old behaviour in new dress · R3 dropped control → rehome, never delete · R4 missing backend → build what exists, spec the rest, never a dead control · R5 tie → mock wins, note the loss.

**Standing rules:** naming inversion holds (only human-read text changes) · protected parser region untouched · **list every handler, data read/write and edge case BEFORE touching a screen; that list is the contract (§5) — never discover behaviour by deleting it** · six-spot cache bump per shipping batch · `npm test` + Playwright green (specs pinning old layouts are rewritten honestly in the same change, never deleted to go green) · one screen per change set, one PR, one review; never mix shell work with screen work · every pre-existing flow completes end-to-end after every commit, or carries a written R3/R4 reason.

**§4 acceptance criteria = the definition of done for every F-item** (check them off in the PR): structure matches the mock side-by-side at 1360×900 (same regions in order; row grammar identity-left, mono-figures-right, status-pill-rightmost) · every colour/border/shadow from a token, ZERO hard-coded hex in screen code · Geist for UI, Geist Mono `tabular-nums` for every number · all five states (loading skeleton, empty, error, first-run, permission denied) exist and are v3-styled · mobile counterpart converted in the SAME item per the §6.1 parity map · old component + CSS deleted in the same change · focus ring on every interactive; modals trap focus and close on Esc · no behaviour regression without a logged reason.

**Two CSS families are still shared and must not be deleted by an F-item on the strength of a grep:** `.menu-search` and `.ms-clear` are worn by MODAL search boxes (add-dish, product-link, tidy), and `.atable-wrap` is the DIV the invoice review renders inside — it is not `.atable`, which is gone. `.scr-head` is the shared §2 header bar: reuse it, do not rebuild it. **`.invz` (the dashed dropzone) is worn by TWO elements** — the Invoices screen and the upload modal's step 1 — and `.inv-bar` by two more (step 2 and the AI-referee wait).

---

## blocked  2b · Move the AI endpoints to Gemini's PAID tier  **[A — post-launch]**

Blocked on: **NOTHING — Max has DEFERRED THIS INDEFINITELY (29 Aug 2026): *"im deferring indefenitly until i saw otherwise."*** It is not waiting on a console visit, a date or a reminder. **Do not surface it, do not re-propose it, and do not count it as a blocked item needing a decision** — the decision is made and the answer is "not now".
⚠️ **It stays in the file rather than being deleted because it is DEFERRED, NOT DECLINED**, and the difference is the whole reason this item has survived three re-checks: the free tier means Google may train on café data, and the day that stops being acceptable this item is the ready-made answer. Batch 208's privacy notice is what makes the wait tolerable — a stranger is told, before an account exists, what leaves and where it goes.
**The original block, still true whenever he takes it:** Max at the Google Cloud billing console — his card, and the assistant may not enter payment details.
⚠️ **Set the project SPEND CAP in the same sitting.** `docs/GATE-REVIEW.md` gate 5 makes this the day the AI endpoints' rate-limit residual stops being tolerable: today abuse costs quota, and on the paid tier it costs money.


**DEFERRED, not declined (Max, 15 Aug 2026):** *"we can sort this later post launch."*
On the paid tier Google *"doesn't use your prompts... or responses to improve our products."* Recorded here rather than dropped, because a deferred decision that leaves no trace is indistinguishable from one nobody thought of.

Measured 15 Aug 2026 against the real prompt (443 tokens of instructions) at $0.25/M input and $1.50/M output: **~0.4c per invoice, ~0.02c per insight, roughly 5–20c per café per month.** 100 cafés is about $20/month.
No code change and no new key — enabling billing on the existing Google Cloud project upgrades the key automatically. Google requires a **$10 minimum prepaid credit**, then pure pay-per-use.

⚠️ **This needs Max at the billing console** (his card, and the assistant may not enter payment details), so it will be `blocked` the day it is taken. **Set a project SPEND CAP in the same sitting** — on a paid key an abused endpoint costs real money, which is the one genuine downside of A and the reason the rate-limit work in the gate-review item matters more once this lands.
When it ships, the policy stops saying *"Google may train on this"* and starts saying *"we pay for a tier that contractually cannot"*. The screens all stay — the acceptance, the link placements and the restatement at import are unchanged by the tier.
⚠️ **This line said "the screens and the acceptance RECORD all stay" until 27 Aug 2026, and there is no acceptance record.** Batch 208 shipped the notice and the tick that gates sign-up; the tick is never written anywhere, so nothing knows who accepted which version. Caught by that batch's pre-push review, which went looking for the mechanism behind the notice's own promise to re-ask people and found none. Building it is filed in `docs/MAINTENANCE.md`; **this item does not depend on it** and must not wait for it.

## next  5a · The backup does not carry three of the five history series  **[A — data integrity]**

✅ **UNBLOCKED 29 Aug 2026 — Max resumed the staging project**, the same event that unblocked item 1.
✅ **Staging is ready — no rebuild needed**, re-measured after the restore completed (14 tables, 9 functions, four intact accounts). ⚠️ **This item is about HISTORY SERIES, so the drift matters more here than elsewhere:** `ing_price_history` has 2862 rows and `menu_change_log` 134, but menus came back as 1 and dishes as 2 against the seed's 12 and 429. **Reload seed `03`/`04` before rehearsing a backup/restore round trip**, or the round trip will prove less than it appears to. This item's own requirements end "Rehearse on staging first per `docs/STAGING.md`, then production", and the change it needs is a replacement `restore_backup`: the disaster-recovery path, on real data, which is the last function in this project to apply unrehearsed. The client half is not split out and shipped alone on purpose — a client emitting format 4 against a server that cannot restore its new groups is exactly the intermediate state `CLAUDE.md` says to order away.


⚠️ **FOUND 12 Aug 2026 while preparing the full-wipe step, by reading `restore_backup`'s body against the live tables. This is the reason that step did not run, and it must ship before it does (Max's call, 12 Aug 2026, choosing "fix the backup first, then wipe" over three alternatives).**

**The gap, measured against production, not inferred:**

| Table | Rows | Span | In the backup file? | Deleted by `restore_backup`? |
|---|---|---|---|---|
| `price_history` | **69** | 6 Jul – 10 Aug 2026 | ❌ no | no |
| `menu_price_history` | **79** | 30 Jul – 4 Aug 2026 | ❌ no | no |

`buildBackup` emits eight groups and **neither table is one of them.** `restore_backup` deletes only `menu_items`, `plates`, `menus`, `ingredients`, `supplier_phrases` — so a restore onto a LIVE database is fine, because these two survive untouched. **A full wipe is where it bites:** they are deleted and nothing puts them back.

**What that costs in the app:** `price_history` feeds `priceHistory` (the Dashboard trend line) and `menuHistory` (per-menu food cost); `menu_price_history` feeds `menuPriceLog` (per-dish sell price). So restoring from a backup after a total loss returns a working app with **a flat trend chart and no price history, and raises no error** — the quiet-wrong-number failure this repo keeps finding.

**Three LIVE `app_settings` keys are also missing:** `ai_invoice_check`, `ai_suggestions`, `last_invoice_import`. Three more (`deleted_menu_ids`, `deleted_prod_ids`, `suggest_fab_hidden`) are **retired keys no reader remains for** — verified by grep, and they are deliberately NOT worth carrying. Do not "fix" those three.

**The shapes, measured live so the next batch does not have to:**
- `priceHistory` = `array[45]` of `{t,v}`, the all-menus series, `menu_id` null.
- `menuHistory` = `object{2}` keyed by menu id → `[{t,v}]`.
- `menuPriceLog` = `object{79}` keyed by **`menu_item_id`** → `[{t,v}]`.
- **45 + 24 = 69 and 79 = 79**, so memory covers the server exactly and nothing is truncated at export time.

Requirements:
- `buildBackup` carries all three series plus the three live settings; **`stamp.format` 3 → 4**, because hard rule 9 makes any change to what `bootstrapSync` puts in memory a format change.
- `parseBackupFile` accepts 2, 3 and 4. The new groups are **type-checked when present and never required** — a format-2 or -3 file legitimately lacks them, exactly as it lacks `change_log`.
- `backupToPayload` translates them with **`pointToRow` only** (`avg_food_cost_pct` + `menu_id`; `price` + `menu_item_id`), naming no column of its own. That is how hard rule 8 is obeyed structurally rather than by care.
- A new `restore_backup` migration inserts both **additively with dedup**, mirroring `ing_price_history` — never deleting them, so restoring an old file cannot erase newer points.
  ⚠️ **Start from v4, not from `20260806_restore_backup_v3.sql`.** Batch 183 replaced the function inside `20260813_semantic_keys.sql`; its `app_settings` upsert resolves against `(business_id, key)` and reverting to the v3 body would raise **42P10 on the next restore**. The two files differ in exactly that one clause.
- ⚠️ **The wire `format` declares what the PAYLOAD CONTAINS, not which build sent it.** Send 4 only when there is something new to carry, exactly as the existing `chg.length?3:2` does, or every restore breaks between the client shipping and the migration being applied.
- Rehearse on staging first per `docs/STAGING.md`, then production.
- ⚠️ **Both tables now carry `business_id` (batch 181), so your new inserts must not reintroduce it as NULL.** The existing `select *` inserts get away with it only because a `BEFORE INSERT` trigger fills the column — a column DEFAULT alone does NOT survive `jsonb_populate_recordset`, which turns an absent JSON key into an explicit NULL. Your two new inserts should name their columns anyway, as the `ing_price_history` one already does, and **`pointToRow` must keep naming no column of its own** so the server stays the only thing that decides the tenant. Decide it here against `20260813_business_id_part1.sql`'s header; **answer it here, do not route it onward.**

✅ **A verified format-3 export is already on disk: `~/Downloads/ezplate-backup-2026-08-12.json`** — 412 products, 79 plates, 76/76 dishes linked, taken and checked 12 Aug 2026. It is the recovery file for the wipe, and it is also the format-3 fixture for proving 4 stays backward compatible.

## next  5b · The restore's full-wipe step (step 3)  **[A — data integrity]**

Do after: **`The backup does not carry three of the five history series`** — the item directly above, whatever number it currently wears. (It has now been renumbered ELEVEN times: 10a → 11a when the mutation-testing gate took slot 1, back to 10a in 180 when that gate shipped and its slot freed, to 9a in 181, to 8a in 182 when the policy swap shipped, to 7a in 184 when `MENU_ORIGINAL` did, to 6a in 188 when the roles client half did, to 5a in that same batch when invitations went blocked, back to 6a when they were unblocked, to **7a in 191**, which both shipped an item above it AND inserted a new one, back to **6a in 192** when the invitations client half shipped and its item was deleted, to **5a in 194** when the audit item was completed and deleted, and to **4a in 195** when pdf.js shipped and its item was deleted. **Name it, never the number** — this line is the standing evidence for why, and every batch that ships an item above it adds one to that count. 184 also renumbered it WRONG on the first attempt, leaving `8a` sitting above a `7`, because a regex that renumbers `## next  N` silently skips `Na` — so the lettered pair is not merely awkward to cite, it is awkward to MOVE.) — the whole point of the wipe is to prove the backup restores everything, and today it demonstrably does not. Running it first would either lose 148 rows of real history or prove less than the item claims.

✅ **THE GO WAS GIVEN, 12 Aug 2026** — `docs/decisions/2026-08-12.md` §2, Max's words: *"yes you can do it no one currently using the software."*
⚠️ **THE GO STANDS, BUT THE STEP DID NOT RUN, and the reason is the backup-history item above, not a change of mind.** It was given on a premise the preparation then falsified: the decision file told him *"if it fails, the export we just took is the way back"*, and that is untrue for 148 rows of history the backup does not carry. He was told, and chose to fix the backup first. **Do the backup-history item above, then come back here and ask again on the day** — the window ("no one currently using the software") is a condition of the day, not a standing permission.
**That last clause is the operating window, not small talk:** the wipe and restore must run while nothing else is writing, so confirm it still holds before starting and do not leave the database wiped while waiting on anything.
**The go does NOT waive the preconditions** — a fresh export taken minutes before, the one-statement rollback written down, and the real file rehearsed against staging first. Those are what make the go safe rather than alternatives to it.

Steps 1 and 2 of the v110 destructive plan were run and passed. **Step 3 — restoring into a genuinely EMPTY database — never was.**
What it would newly prove is narrow: that an empty table restores as well as a populated one, and how the boot gate reads mid-restore against nothing.
Requirements: a fresh export taken minutes before, and **Max's explicit go on the day**. Destructive against real data.
**SCHEDULED (Max, 9 Aug 2026): runs when the v3 fold-in phase finishes, before any multi-tenant work.** The batch that closes the phase prepares everything and asks for the go.
⚠️ **Corrected 11 Aug 2026: this read "(items 1-5)", which was a POSITION and had already drifted** — F8 and F9 shipping moved every number under it, so "items 1-5" now points at four items that are not the fold-in at all. **The phase finishes when `F10 — Account` and `The mobile More screen` have both shipped** — the More screen included, because §6.1's parity map is unmet by construction without it and this file says so at that item. Name them; never re-number this.
**BOTH HAVE NOW SHIPPED** — F10 as `ezplate-v149` and `The mobile More screen` as `ezplate-v151`, both on 11 Aug 2026 — so **the phase is closed and this item is DUE NOW**, by its own scheduling. The next batch to reach it prepares everything (a fresh export taken minutes before, the one-statement rollback written down) and asks Max for the go on the day. It stays `blocked` only on that go.
✅ **REHEARSED ON STAGING, 172.** The step itself has now been performed somewhere: staging was emptied with `02-seed-empty.sql` and `restore_backup` was called into it **as the anon client over PostgREST**, returning identical counts to the populated case, every dish linked to its plate, plates inserted with `menu_id` null, and **zero rows with a null plate link** — the signature of the failure that once cost 76 of 77 dishes. Both refusal paths fired by name (format `1`; a missing `ing_price_history`).
**This does NOT discharge the item and must not be read as doing so.** It was synthetic data in a different project, and what is still untested is the half that only production has: a real 412-product export, the real file size through the RPC's 30s `statement_timeout`, and how the boot gate reads mid-restore. What it does mean is that the step is no longer being attempted for the first time on real data.
When Max gives the go: take a fresh export minutes before, write the one-statement rollback into the item, run `02` then the real backup against staging first as a dress rehearsal, then production. `docs/STAGING.md` has the procedure.
*(`Blocked on: Max's go on the day` DELETED 12 Aug 2026 — given. Nothing about this item is now waiting on a person.)*

## next  7 · Three insight families do not put their subject in `facts`  **[B]**

Found by batch 215's second pre-push review, running the REAL insight builders rather than the batch's own fixtures.

215 made the phrasing validator compare a model's rewording against the deterministic template — figures in order, `%` vs `$`, direction, and the ORDER OF THE ENTITY NAMES. The name check reads `factNames(ins.facts)`, i.e. the string values in an insight's facts.

**Three families name their subject only in the rendered `text` and put no name in `facts`, so for them the name check has nothing to sequence:**

| Family | `facts` | what the text names |
|---|---|---|
| `insCostBase` | `{pts, ingPct, plates}` | the culprit **ingredient** ("Beef") |
| `insConcentration` | `{plates, total, rise, pts}` | the **supplier** |
| `insPriceAnomaly` | `{top, mult}` | the **product** and its unit |

⚠️ **`insCostBase` is the family the original blind audit used as its example**, so the motivating case is the one still uncovered. Measured: replacing "Beef" with "Chicken" throughout, keeping every figure and symbol identical, is ACCEPTED by both copies of the validator.

**What it costs a real person:** the cost rise is blamed on the wrong ingredient, the supplier exposure on the wrong supplier, the price anomaly on the wrong product — in the warmer voice that is supposed to mean the number was checked.

**Requirements:** each of the three carries its subject in `facts`, so the existing name check covers it. One key per family and nothing else changes — `factNumbers` filters to `typeof === 'number'`, so a string fact cannot disturb the number law, and the name is already in the prompt via the template text.
⚠️ **It is a change to the insight ENGINE, not the validator, which is why 215 did not do it**: `computeInsights` is a mutation target with a large existing suite, and `tests/insight-coverage.test.js` already reasons about which families have a `facts.name` (see its note about an anomaly "whose facts are only `{top, mult}`"). Read that file before adding keys.
✅ **`tests/insight-real-templates.test.js` already pins the gap as it stands** — its `KNOWN GAP` test asserts the swap is currently accepted, so this item going in turns that test RED by design. Invert it and delete the gap note; do not weaken it.

## next  8 · A plate save clears the recovery draft before the server answers  **[B — silent loss of authored work]**

`js/app.js:2811`: `var _write=dbPushPlate(sp); clearPlateDraft(); …` — the draft is deleted **synchronously**, whether or not the write lands.

Offline, `pushWrite` toasts *"you're offline. It has NOT been saved."* and the "Saved just now" badge correctly stays down — but `cafeDB_plateDraft` is already gone and `savedPlates` holds the new lines only in memory. Background the app, iOS discards the tab, `bootstrapSync` replaces `savedPlates` from the server, and the edit is gone with no draft to resume. **This app's stated user goes a week between uses, so the toast is long past.**

The comment three lines below already reasons about exactly this hazard for the BADGE, and `authSwitchUser` (`js/app.js:6781-6789`) argues at length that the draft is *"unsaved authored work … destroying it is data loss, not tidying, and the app never does that silently anywhere else."* **This is the place it does.**

Requirements: `clearPlateDraft()` moves into the success arm that already exists for `setBuilderSaved(true)`. One line.

## next  9 · A plate with an uncostable line reads as fully costed, and healthier than it is  **[B]**

`costFromLines` (`js/app.js:2851`) counts the lines it could not cost into `miss` and **returns only the partial sum**. Every cost, percentage, verdict pill and dashboard average outside the builder comes from it — `avgFoodCostForScope`, `dishesOverTarget`, `renderAnalysis`, `kpiStripHtml`, `plateCostText`, `computeInsights`. The builder is the one screen that counts missing lines itself and raises `#flag`, so **the only screen that warns is the one you must already be on.**

Second way in: `lineCost(p,qty)` is `qty*c`, and `null * c` is **0**, not null — so a line with no quantity is a real line costing nothing and even the builder's flag stays down.

Reached by a restore that `backupRefCheck` flagged as a soft problem — the confirm says *"Those will cost nothing until you relink them"* — or by a plate saved before the `qty<=0` rule. The Menu row then prints a reduced cost, a suggested price derived from it, and a **green** verdict pill, with nothing indicating a line is missing. `kpiStripHtml`'s comment asserts the Ingredients tab owns this surface; for a direct `pid` line **that surface does not exist**.

Requirements: a plate that could not cost every line does not render as costed. `costFromLines` returns or exposes its `miss` count and the callers act on it.

## next  10 · A price point is logged even when the write carrying it was rejected  **[B]**

`setProducts` (`js/app.js:1279-1299`) fires the `ingredients` upsert and the `ing_price_history` insert independently and gates neither on the other — `var write=dbPushIngredients(…)` is never awaited before `logIngPrice` and `saveIngLog()` run.

Café phone, one bar, invoice import: the product upsert times out, the smaller history insert lands. `pushWrite` honestly toasts the product failure. Next boot, the product's price comes back correct from the server — and `ingPriceLog` also comes back from the server carrying **a point for a price that was never stored.**

That phantom point is then read by `ingPriceBand` (the builder's "recent range" and the Menu cost band), `ingLastMovePct` (the Ingredients drift chip), and `ingPriceAt`/`costAtLines`, which is what the Dashboard's *"N pts higher than at June prices"* sentence is built from. All of them describe a movement that did not happen. **The change log applies exactly this discipline for interventions via `logChangeIfSaved`; the price log does not.**

Requirements: the price point is written only if the write that carries it succeeded, or is reconciled on the next boot.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
