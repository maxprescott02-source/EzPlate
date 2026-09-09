# Queue

Worked top to bottom by `/batch`. Position is priority. Max adds problems, not briefs: what is wrong, and what must be true when it is fixed.
**Tier test — if we launched to paying customers tomorrow, would this item stop us, embarrass us, or hurt them?** **A** = launch is impossible or unsafe without it. **B** = a real person using the app would see something wrong, broken or half-finished. **C** = everything else → `docs/MAINTENANCE.md`, whose items **ride whichever batch already touches the file** (Max, 22 Aug 2026, retiring the 13 Aug parallel worktree track on measured evidence; that file's header has the reasoning). **Ambiguous is C.**
**Capped at 20 items.** A new A or B displaces the lowest-priority item here into maintenance; it never extends the file.
**`Blocked on:`** = waiting on a person or an outside thing — `/batch` skips it. **`Do after:`** = waiting on another item in this file, and it is DELETED the moment it is satisfied.
⚠️ **THE STATUS IN THE HEADING IS WHAT `/batch` ACTS ON, so a body that disagrees with it is not a nuance — it is the file lying to the only reader that matters.** (31 Aug 2026, batch 225, which found item 5 headed `next` while its own body said the go *"is a condition of the day, not a standing permission"* and to ask again before running it, with a note in between announcing that nothing was waiting on a person. All three were written by different batches, each correctly, over nineteen days.) **An item is worked from its heading and read from its body, and nothing reconciles them** — so when you edit an item's body in a way that changes whether it can be STARTED, change the heading in the same edit, and when you find the two disagreeing, the safer of the two wins and you say in the item which one moved.
**`project-audit` reports; it does not add queue items.** A finding from a batch defaults to C unless it passes the tier test. **Nothing about the process itself belongs here.**
⚠️ **AN ITEM THAT NAMES A BEHAVIOUR WITHOUT NAMING ITS SITES IS AN ITEM WHOSE LIST IS ALREADY WRONG.** (2 Sep 2026, AUDIT-v186 R1, measured: **seven of the last eleven batches** found their item's own enumeration short at the point of execution — 220 said three insight families and found five, **222 said six callers of `costFromLines` and found nineteen**, 225 said four rows and found three plus a fifth change, 226 measured desktop and missed that mobile was worse, 221 said "one line" and produced four defects.)
`CLAUDE.md` blames AGE, and age is no longer the whole story: 222's item was days old and 221's was one line. **The likelier cause is that an item is written as the diagnosis of ONE site while the codebase has nineteen** — and the phrasing invites the partial fix, because "the callers act on it" reads as complete without ever having been counted.
**So: when you write an item, either COUNT the sites and list them, or say in the item that the list is unmeasured.** Both are honest and the difference is visible; a bare plural is neither. And when you RUN one, grep the enumeration before planning off it — that is not re-asking, and every one of those seven batches did it unprompted.
*(The one exception this file has ever carried — the mutation-testing gate, which Max put here himself on 13 Aug 2026 over that rule — shipped in batch 180 and its item is deleted. It was never precedent: only he can override this line, and he did it once, in writing, with the count that justified it.)*

⚠️ **THIS FILE IS NOT THE WHOLE BACKLOG AS OF 8 SEP 2026, AND `/batch` READING ONLY THIS FILE WILL MISS MOST OF THE OPEN WORK.**
`docs/QUEUE-2026-09-08-CONSOLIDATED.md` holds **the rest of the backlog** consolidated from every audit, `docs/MAINTENANCE.md` and the margin-monitor spec, numbered from 16 so they continue this file. **How many are OPEN is a grep for unstruck items and is deliberately not written down anywhere** — it was 72 on 8 Sep, 73 by 9 Sep, and a number in prose is the one thing in this system nothing can keep true. `docs/QUEUE-GROUPS.md` groups them by the context a batch must load and states the order.
**They are NOT all in this file because the backlog cannot be, and the cap does not need raising:** this file is the **WORKING SET**, refilled one group at a time from the backlog, and `skills/batch` does the refill when nothing unblocked is left. **G1 was promoted on 9 Sep 2026.** So what `/batch` works is whatever stands here now — read it, do not count it from this sentence.
A promoted item is **referenced, not copied**: read the full item in the consolidated file under the number it names.

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

**Two CSS families are still shared and must not be deleted by an F-item on the strength of a grep:** `.menu-search` and `.ms-clear` are worn by MODAL search boxes (add-dish, product-link, tidy), and `.atable-wrap` is the DIV the invoice review renders inside — it is not `.atable`, which is gone.
**`.ad-list` / `.ad-item` / `.ad-nm` / `.ad-meta` are worn by TWO pickers since batch 228** — the Add-dish modal and the recipe-heal modal (`#plateHealModal`). The heal picker reuses them deliberately: same job, same row shape, no second family to keep in step. Deleting them with the Add-dish screen would leave the heal picker unstyled, and nothing but this line says so. `.scr-head` is the shared §2 header bar: reuse it, do not rebuild it. **`.invz` (the dashed dropzone) is worn by TWO elements** — the Invoices screen and the upload modal's step 1 — and `.inv-bar` by two more (step 2 and the AI-referee wait).

---

# The 5 Sep 2026 blind audit — items 12-15

**Source: `docs/audits/BLIND-AUDIT-2026-09-05-code.md`.** A second blind audit, on the 22 Aug pattern: an outside reviewer given the shipping code, the SQL and the tests, and explicitly told NOT to read `CLAUDE.md`, this file, `MAINTENANCE.md` or the handovers. Eleven findings in 25m52s.

⚠️ **READ THIS BEFORE PLANNING OFF ANY OF THE FOUR ITEMS BELOW. ITS TOP-RANKED FINDING, THE ONLY ONE IT CALLED A RELEASE BLOCKER, WAS FALSE.** It claimed `js/app.js` on `main` contains bare English prose at lines 7290 and 11586 and therefore does not parse. `git show origin/main:js/app.js | node --check` **parses clean** at `a56055e`; both citations are continuation lines inside `/* … */` block comments. **The reviewer read the repository in network slices and lost the comment context** — which is exactly the condition that produced its most confident, most precisely cited and most urgent claim.

**So every line citation in these four items is a POINTER TO CHECK, not a fact**, and the queue header's own rule applies with unusual force: *an item that names a behaviour without naming its sites is an item whose list is already wrong.* **Each item below states which of its claims is measured and which is not.**
**All four have now RUN and all four findings were TRUE.** 12 in batch 236 (`ezplate-v194`), 13 in 242 (`ezplate-v199`), 14 in 243 (`ezplate-v200`, confirmed against the SQL and reproduced on staging), and **15 in 244 (`ezplate-v201`) — the one item of the four that was still UNMEASURED when it was taken, and it reproduced on the first attempt: a $6 dish read $20 against a target the server had rejected.** Four for four is worth recording against this section's own warning: the audit's top-ranked finding was false and its four queued ones were not, so a citation being wrong says nothing about the neighbourhood being wrong.
⚠️ **13 was TRUE IN SUBSTANCE AND SHORT BY A FACTOR OF SIX, which is the third of these to be so and is now the pattern rather than the exception.** It described "two findings, merged because they are one mechanism at one site"; there were **twelve** stores surviving a café move, across three different application patterns and about six hundred lines, and the twelfth was found by the pre-push review after the fix's own header claimed to have counted them all. **So read the remaining item's enumeration as a starting point and grep it**, exactly as the header rule above says — the audit is reliable about the neighbourhood and not about the size.
⚠️ **And running 12 produced 12b, which is a defect the audit never saw and which is WORSE than the one it reported** — the pre-push review of the fix found it. That is the argument for taking these items seriously even where the citations are wrong: the audit was pointing at a real neighbourhood.

**Step one of every one of these is the repro, and "it does not reproduce" is a legitimate outcome that DELETES the item** — say so in the handover rather than fixing something to make the finding true. That is `CLAUDE.md`'s standing rule about a review's three separable claims (the defect, the mechanism, the remedy) arriving from an outside reviewer instead of the pre-push one.

---

## blocked  17 · The invoice parser prices by repetition and position, and is wrong on every Supplier B line  **[A, 36 of 41 real lines silently wrong, measured 8 Sep against six real invoices]**

**Full item:** `docs/QUEUE-2026-09-08-CONSOLIDATED.md` item 17. **Promoted here on 9 Sep 2026 by batch 240 ALREADY BLOCKED, which is the point of promoting it** — it is the largest open defect in the backlog and it was invisible to `/batch` while sitting in a group nobody had reached.

**Blocked on: MAX, ONE SENTENCE — does the parser-region protection stand or is it lifted?**

`CLAUDE.md` Tier 1 says *"never edit anything inside it"* and names four never-touch functions. `docs/QUEUE-2026-09-08-CONSOLIDATED.md`'s owner-override block says the protection **is lifted** and attributes that to him on 8 Sep. That file's own Tranche 0 lists *getting the reversal in writing* as still outstanding. `docs/QUEUE-GROUPS.md` blocks the whole G2 group on it. **Four documents, three positions, and no decision file.**

⚠️ **AND THE REGION HAS ALREADY BEEN EDITED ONCE, in batch 197** — `docs/MAINTENANCE.md` has been asking whether that edit is ratified since 28 Aug 2026, through two audits. **His sentence ratifies it or it does not, in the same breath.**

**Why this could not be taken under standing authority:** reversing a decision he made himself is his alone, and the only evidence of the reversal is a batch's summary of a chat — *chat cannot see this repo* is this project's oldest rule about exactly that class of claim.
**If the answer is YES**, `CLAUDE.md` Tier 1 and this file's standing-rules line get edited under standing authority, batch 197 is ratified, and G2 can be promoted. **If NO**, this stays blocked and the parser fix needs a design that works from outside the region — which is a different item, not this one.

---

# Promoted 9 Sep 2026 — group G1, the costing core

**These came from `docs/QUEUE-2026-09-08-CONSOLIDATED.md` by promotion, per `docs/QUEUE-GROUPS.md`.** They are referenced, not copied: **the full item — mechanism, sites, acceptance, the test that pins it — is in the consolidated file under the number given, and that file is the one to read before planning.** One description, in one place.
**When one ships, delete it here AND strike it there**, with the batch and deploy version. `skills/batch` step 10 carries the rule; the strike is what stops finished work being re-promoted.
**Their C riders are NOT promoted** — 69, 76, 77 and 81 ride whichever batch opens their function, per `docs/MAINTENANCE.md`'s standing rule. *(25 rode 15 in batch 244 and is struck; the naming of a rider on the item it rides is what made that work, and it is the pattern to copy.)*

⚠️ **Every line number in these items is a POINTER TO GREP, not a fact** — the consolidated file says so of itself, and the blind audit above is why. **Step one of each is the repro**, and "it does not reproduce" deletes the item and says so in the handover.
*(G1's only [B — wrong number] item, 15, shipped in batch 244; what is left of the group is below. The two headings were folded into one when it went, because a section with a title and no items reads as work nobody has got to.)*

## blocked  91 · Staff may not delete a plate, and may delete every product that plate costs from  **[B, measured on production]**

**Full item:** `docs/QUEUE-2026-09-08-CONSOLIDATED.md` item 91 — raised by AUDIT-v207 out of a question batch 250 handed off, and measured against `pg_policies` rather than the schema file.

**Blocked on: MAX, two sentences.** May staff delete a **product**? May staff delete a **taught pack** (`supplier_phrases`)? Both are deletable by any member today, through the same permissive `FOR ALL` policy that made `price_history` a hole until 250.
⚠️ **`menu_items` is the third such table and is DELIBERATE** — 187 decided staff may unpublish a dish, and it says so in the migration. It is not part of this.
**Why it needs him:** what staff may do is his decision — 187 was his. The migration, if the answer is no, is 187's exact idiom with 250 as the worked example.

## blocked  90 · A refused invoice row should be left unticked with its own error  **[B — everything else in this item has shipped]**

**Full item:** `docs/QUEUE-2026-09-08-CONSOLIDATED.md` item 90.

**Blocked on: MAX, one sentence — after applying an invoice, would you rather have your screen back straight away, or wait on the invoice list while it saves so any row the server refused stays on screen with its own error?**

✅ **The other three parts have shipped.** The completion message in 253 (`ezplate-v208`); the menu delete's sequencing and the boot-time history merge in 254 (`ezplate-v209`).

⚠️ **THE COST OF THIS WAS OVERSTATED BY 253 AND THE CORRECTED FIGURE IS WHAT MAKES IT A REAL QUESTION.** That batch wrote, at the site and in its handover, that holding the dialog open would mean *"dozens of round trips on café mobile data"*. **Measured against the code rather than reasoned: the app ALREADY waits for those writes** — `applyInvoice` closes the dialog, then awaits `importKeptCount(priceWrites)` before it says anything — and the writes are dispatched in parallel, so the wait is the slowest of N, not N in sequence, and it is bounded at 15s either way. **So the choice does not add waiting. It only decides whether the user is blocked during a wait that already happens**, and buys per-row attribution in exchange.
**A recommendation, since one is owed:** keep the current behaviour unless Max wants the per-row detail. `CLAUDE.md` says an occasional user *"would rather be told a thing did not save than discover it next week"*, and 253 already tells them — a count, honestly, without blocking. The per-row version is better only if he intends to ACT on a refused row there and then.

⚠️ Related and still unbuilt whichever way this goes: the shortfall line covers the **price-update branch only**. A product CREATED by an import, and a pack taught during one, are written by other branches and collected nowhere, so a failure there is invisible to that line. Raised by 253's pre-push review; say so on screen or collect them too.
⚠️ **SPLIT OUT OF 21 BY BATCH 247, which shipped 21's history half as `ezplate-v204`.** 21 grouped four instances under one mechanism and only one of them shared it in substance: the history gating was fifteen call sites and a dedup interaction, the invoice completion message needs a COUNT of what landed rather than a boolean, the menu delete is a sequencing change, and the boot-time replace is a merge decision. **Each needs its own repro; none falls out of the others**, and 21's old `Do after: 20` reason was falsified by 246 before either could be used.


## next  89 · A `price_history` point cannot be deleted or corrected from the app  **[B — the SERVER half shipped in batch 250; the SURFACE is what is left]**

**Full item:** `docs/QUEUE-2026-09-08-CONSOLIDATED.md` item 89 — split out of 18 by batch 241, which shipped the bound that stops another one being written.
✅ **Batch 250 shipped the server half and it was a HOLE, not a gap:** `price_history` carried a permissive `FOR ALL` policy, so **any member including staff could delete the café's food-cost history**, while its sibling `menu_price_history` permitted no delete at all. Both are owner-only now, on staging and production, verified as a signed-in staff member.
**What is left is the client surface**, and the item's acceptance is unchanged for it.
⚠️ **Deleting the existing points is Max's**; building the surface is not. **There are TWO of them**, not the one the item named — see the full item.

---

## blocked  2b · Move the AI endpoints to Gemini's PAID tier  **[A — post-launch]**

Blocked on: **Max choosing to take it. He has DEFERRED IT INDEFINITELY (29 Aug 2026): *"im deferring indefenitly until i saw otherwise."*** That IS the block, and it is a person, which is what this field is for. It is not waiting on a console visit, a date or a reminder. **Do not surface it, do not re-propose it, and do not count it as a blocked item needing a decision** — the decision is made and the answer is "not now".
⚠️ **This field read `Blocked on: NOTHING` until 2 Sep 2026** (AUDIT-v186 C2), which is the file's own status vocabulary contradicting its own heading — the exact phrasing item 5 records as preceding a near-miss on destructive work, and the exact shape the header rule above was added to stop. The status was right and the grammar was not; **an item headed `blocked` says in `Blocked on:` who or what it is waiting for, never that it is waiting for nothing.**
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

## blocked  5 · The restore's full-wipe step (step 3)  **[A — data integrity]**

Blocked on: **Max's go ON THE DAY, and it is a `CLAUDE.md` STOP CONDITION rather than an ordinary decision** — this wipes and reinserts every row of the real café's database, and destructive production work is his to authorise every time, rehearsed or not. Nothing else is outstanding.
⚠️ **The `Blocked on:` line was DELETED on 12 Aug 2026 on the grounds that the go had been given, and putting it back is not a reversal of that.** Read this item's own words: *"the window ('no one currently using the software') is a condition of the day, not a standing permission"*, and *"come back here and ask again on the day"*. The file was carrying "nothing is waiting on a person" and "ask him on the day" three paragraphs apart, and `/batch` reads the status line. **A go that must be re-asked is a block; a status that says otherwise is how a destructive step gets taken because a header looked green.**

✅ **PREPARED, 31 Aug 2026 (batch 225), everything that does not need him:** production re-measured (below), and the reason the remaining step cannot be prepared ahead — *"a fresh export taken minutes before"* is by definition taken on the day, and it comes out of the APP (`buildBackup` dumps live in-memory objects; a hand-built file from the schema is the exact row-boundary trap that once cost 76 of 77 dishes). **So the day's order is: Max exports from the app → rehearse that real file against staging per `docs/STAGING.md` → production.**

✅ **`Do after:` DELETED 29 Aug 2026 — SATISFIED.** It named *"The backup does not carry three of the five history series"*, which shipped as batch 219 / `ezplate-v179`, so the reason this item was held is gone: the backup carries all five now, and `restore_backup` v5 puts the two new ones back additively. Deleting the line is the mechanism rather than tidying — a satisfied dependency left in place is how the dropdowns item spent two years waiting on a conversion that had already landed.
⚠️ **The warning that line carried is worth keeping and is NOT about this item's schedule: NAME the item you depend on, never its number.** That `Do after:` had been renumbered eleven times, and once renumbered WRONG, because a regex that renumbers `## next  N` silently skips `Na`. This item is now plain `5` for the same reason the lettered pair existed — 5a is gone.
⚠️ **AND ONE FACT ON THIS ITEM HAS MOVED, per `CLAUDE.md`'s rule that a queued item's approval does not expire and its FACTS do.** It says the wipe would have lost "148 rows of real history". That number is dead: those two tables are in the backup and the restore since 219, so the exposure is zero.
**Re-measured 31 Aug 2026 on production, and every figure below moved in two days — which is the point of re-measuring rather than quoting:** `ingredients` **415** · `plates` **130** · `menus` **2** · `menu_items` **90** · `supplier_phrases` **7** · `ing_price_history` **44** · `menu_change_log` **270** · `app_settings` **10** · `price_history` **345** (was 284 on 29 Aug) · `menu_price_history` **176** (was 143) · `businesses` 1 · `business_members` 1 · `business_invites` 1. **About 1,491 data rows.**
**Re-measure again on the day; do not carry these forward either.** The two history tables are growing ~30/day between them, so any count in this file is stale within a week.

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
*(`Blocked on: Max's go on the day` was DELETED here on 12 Aug 2026 with the words "nothing about this item is now waiting on a person". **That line is REINSTATED at the top of this item and this note is kept as the record of the mistake**, not struck: the go was given, and the same item goes on to say the window is a condition of the day and to ask again on the day. Both readings were in this file at once and the header is what `/batch` acts on. **A go that must be re-asked is a block.**)*

## blocked  8 · Contrast: body text and control boundaries, decided ONCE in the tokens  **[B]**

Blocked on: **Max, three rendered options — `docs/decisions/2026-09-02.html`, put to him 2 Sep 2026 (batch 229).** It is a VISUAL decision and app-wide, which is why it went to him rather than being taken: it changes a token every quiet line in the app reads, the look of every switch, and the colour of every destructive button.

⚠️ **THE ITEM'S OWN DIAGNOSIS OF THE BODY-TEXT HALF IS WRONG, and the correction is what the options are built on.** It says the failing token is `.flag-review`. Measured 2 Sep 2026 in a real browser: `.flag-review.pt-explain` overrides the colour to `--muted2`, which is `--text-3`, and **that token clears AA comfortably on a plain surface — 4.82 light, 4.65 dark. It fails only where it is painted on a TINT**, 4.17 / 4.32 on `--danger-bg`. So it is not "a token that is too faint"; it is a token that is fine against three of the app's four backgrounds.
That matters because it changes the size of the fix: clearing 4.5 on every surface the token touches needs a **4–5% shift** (`#7D7060`→`#776B5C` light, `#908D89`→`#96938F` dark), not the palette rework the item implies. Values solved against **every surface `--text-3` is painted on** — white, `--surface-2`, `--danger-bg` and `--warn-bg` — because it is an app-wide token, so the binding constraint is whichever is worst in each theme (light: `--danger-bg` at 4.50; dark: `--warn-bg` at 4.53).
⚠️ **THE SURFACE THIS ELEMENT PAINTS ON IS ITS OWN, NOT THE ROW'S, and a pre-push review got this wrong in a way worth recording.** It traced the explain line to its `st-review` row (`background:var(--warn-bg)`), recomputed everything against that, and reported the figures above as measured against a surface the text never touches. **`.flag-review` sets `background:var(--bad-bg)` and `.pt-explain` overrides only colour, weight and margin** — so the element paints `--danger-bg` on top of the row's tint. Measured in a real table 2 Sep 2026: the first opaque background above the text is the element itself, giving 4.17 / 4.32. Against the row it would be 4.38 / 4.19 — and in DARK the row is the worse of the two, so the two readings do not even fail in the same direction. `tests/visual/200-pack-unit.spec.js` measures rather than computes for exactly this reason, and now says so.

⚠️ **AND THE CONTROL-BOUNDARY HALF SPLITS IN TWO, which the item treats as one question.** The switch's off-track at **1.36** is an IDENTIFICATION failure — a white knob on a cream track with only a drop shadow between them, so nothing says which way it is set. The destructive button's border at **1.40** is not: its own red label measures **5.43**, and raising the border to 3.0 requires `#A3908E`, **which is not red any more**. One is worth fixing and one costs the thing it is meant to signal, so they are asked separately.

Promoted 31 Aug 2026, and **the two maintenance entries below are merged into ONE item on their own advice** — each says the pair is plausibly the same question about the same palette, and that answering them together beats nudging one hex. Keeping them apart is what produced two entries measuring one palette.
**Both halves are MEASURED, in a real browser, against the surface each is actually painted on**, so this needs a decision about the tokens and a surgical change, not an investigation.
⚠️ `tests/visual/200-pack-unit.spec.js` asserts a floor of **3.0** with the shortfall written out at the assertion; raising the token means raising that number in the same change, and the first half below says why it is not already 4.5.
⚠️ **`CLAUDE.md` requires visual changes to be surgical and one screen at a time, and this is deliberately NOT that** — it is a token change, which is the one shape that cannot be done per screen without becoming the per-control pattern the second half warns about. Say so in the handover.

### The body-text half
Filed 23 Aug 2026 by batch 200, which added an explanation to the invoice review and measured whether a user could read it.
**Measured in a real browser, at the computed colour against the surface it is actually painted on: 4.17:1 in light, 4.32:1 in dark.** The WCAG AA floor for body text is 4.5:1. Both miss, and dark misses by less, which is the opposite of the usual guess.

`.flag-review` is the app's own review-flag colour and is worn by **every** explain line on the invoice review — the parser unit-mismatch message, the "Set the pack, or type the price" prompt, and now 0b's re-base explanation. So this is not one screen's copy being faint; it is a token.
**Why 201 did not fix it:** raising it is an app-wide palette change, and `CLAUDE.md` requires visual changes to be surgical and one screen at a time — a previous density pass was rolled back wholesale for exactly this. It also sits next to the two `1.4:1` control-boundary readings below and is plausibly the same question about the same palette, which is an argument for answering them together rather than nudging one hex.
`tests/visual/200-pack-unit.spec.js` MEASURES it every run and asserts a floor of **3.0** — the AA floor for large text and UI components — with the shortfall written out at the assertion. That is deliberate: asserting 4.5 leaves a permanently red test that says nothing new, and asserting 4.17 pins the defect as though it were intended. Raise the number in that spec as part of the fix.

### The control-boundary half
WCAG 1.4.11 wants 3:1 for the visual boundary of a control. Measured 10 Aug 2026: the toggle's off-track is **1.36:1**, and F5's "Delete this menu" button is **1.40:1 light / 1.38:1 dark** — its border is `--danger-border`, used exactly as the mock's §2 specifies for a destructive button.
Neither was fixed, for the same reason: the control's own TEXT carries the identification (the Delete label measures 5.43 light / 5.92 dark, clear of AA), so the boundary reinforces rather than identifies.
The toggle half is older and worse: a white knob on a `--border-2` `#E3DCCF` track, carried entirely by the knob's drop shadow, track-against-card ~1.35:1. v136 fixed the DARK case (`--knob` when off, `--on-accent` when on) and left light as it has always rendered.
Requirements: decide ONCE for every bordered control whether this app's boundaries clear 3:1, and if yes do it **in the token**, not per control — a per-control fix is how two became a pattern nobody can see. Candidates: darken the off-track, or add a hairline border to track and knob.
Note the palette block already carries three MEASURED DEVIATIONS from the mock on exactly this basis (`--text-3` twice, `--danger` once), so deviating is established practice and not a fight with R1; what is missing is the decision, not the permission.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
