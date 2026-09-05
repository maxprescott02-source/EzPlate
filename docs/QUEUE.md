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

## next  0 · UI audit Phase 2, steps 3-6 (R4+R7, R5+R6, R12, R17+R18)  **[B — visible polish, Max's own ordered plan]**

Max wrote this plan himself on 3 Sep 2026 (chat, batch 231) and approved it by ordering the steps, so it is pre-approved work, not a brief to re-confirm.
Steps 1-2 shipped in batch 231 as `ezplate-v190` (PR #253): R21+R22 (one header band, sticky page header) and R1-R3 (the 768-1023 tablet tables).
**Step 3 shipped in batch 232 as `ezplate-v191`**, **step 4 in batch 233 as `ezplate-v192`** (R5+R6, one commit; the audit file's progress table has the detail — two of R6's readings were corrected by the code, and three shortfalls are geometry-bound and recorded). **Step 5 (R12) resolved in batch 234 with NO code change: the finding did not reproduce.** The Menu zero-results renderer has offered "Clear search & filters" since v58, via the same shared helper Plates uses; what the audit photographed was the link's text occluded by the install banner in its single 390 capture (R13/R19 stacking family, wontfixed) — the audit file's progress table has the mechanism. There is no diff to show him; the evidence is in `HANDOVER-234`. His plan says STOP and show him after each step, and he was not in the chat — so each batch takes ONE step and hands over with the captures; the next `/batch` takes step 6 (R17+R18). That is the honest reading of his constraint when he is not live; if he'd rather have multiple steps per batch, say so and this line changes.
Row ids refer to `docs/ui-audit-2026-09-02.md`, whose Phase 2 progress table tracks status.
`docs/handovers/HANDOVER-231-header-and-tablet-band.md` is the diary of how steps 1-2 went and what the reviews caught.

**His constraints, verbatim in substance:** no functional change; component APIs, routes, handlers, field names and data fetching unchanged; no new dependencies, no rebrand; CSS and markup only EXCEPT R12, the one approved JS change; one commit per step; STOP and show him after each step.

**The remaining steps, in his order:**
3. R4 + R7, one commit. Menu search into the same left slot and width as Plates / Products / Ingredients (400x40 top-left), all four screens on one control-row pattern (search + filter row; the secondary action joins the filter row instead of floating alone). ⚠️ The audit's site list for R7 is UNMEASURED — count the control rows before planning (queue header rule).
4. R5 + R6, one commit. Touch targets to 44px effective via padding and negative margin, visuals unchanged: builder remove-line "x" (15.5x36), pack-price chips (27px tall), Dashboard trend range buttons (32px), and the small text links (Privacy notice, What is sent, wizard Skip, phone link, sign-in links).
5. ~~R12, APPROVED JS change (the only one): add the "Clear search & filters" link to the Menu zero-results renderer, matching Plates. Show him the diff.~~ **RESOLVED, batch 234, no change — the link already existed and matched Plates (see above). The approved JS change was never needed.**
6. R17 + R18, one commit. More-screen title alignment + back-chevron hit area; one row-height token for desktop list rows (Plates 41 vs Menu 44-45 vs Products 44).

**Deferred by his explicit call — do NOT do:** R20 (token fold — reconsider only after the above ships) · R8 unless CSS `:has()` reaches it with zero JS (if it needs a class toggle, skip and say so) · R10, R11, R13, R14, R15, R16 (leave) · R19 (wontfix, agreed).

**Verification, every commit (his list):** suite + smoke + Playwright green · diff confined to css/style.css and index.html or name the exception · before/after captures at 390, 768, 1024, 1440 for every screen touched · state which flows were not touched.
The capture harness lives at `~/Documents/EzPlate-ui-audit-2026-09-02/` (`node run.js --out=<dir> --widths=... --states=pop`; befores are `out/shots/`, deliberately NOT in this public repo — real business data).
One deploy-version bump per batch that ships a client asset; a docs-only step (like 234's) ships none and bumps nothing.
The pre-push code-review agent caught 16 real findings across steps 1-2 (two of them in brand-new tests that could not fail) — run it per stop-point, force it onto a different model, and hand-run a mutation on every new assertion.

---

# The 5 Sep 2026 blind audit — items 12-15

**Source: `docs/audits/BLIND-AUDIT-2026-09-05-code.md`.** A second blind audit, on the 22 Aug pattern: an outside reviewer given the shipping code, the SQL and the tests, and explicitly told NOT to read `CLAUDE.md`, this file, `MAINTENANCE.md` or the handovers. Eleven findings in 25m52s.

⚠️ **READ THIS BEFORE PLANNING OFF ANY OF THE FOUR ITEMS BELOW. ITS TOP-RANKED FINDING, THE ONLY ONE IT CALLED A RELEASE BLOCKER, WAS FALSE.** It claimed `js/app.js` on `main` contains bare English prose at lines 7290 and 11586 and therefore does not parse. `git show origin/main:js/app.js | node --check` **parses clean** at `a56055e`; both citations are continuation lines inside `/* … */` block comments. **The reviewer read the repository in network slices and lost the comment context** — which is exactly the condition that produced its most confident, most precisely cited and most urgent claim.

**So every line citation in these four items is a POINTER TO CHECK, not a fact**, and the queue header's own rule applies with unusual force: *an item that names a behaviour without naming its sites is an item whose list is already wrong.* **Each item below states which of its claims is measured and which is not.** Only item 14 has been verified.

**Step one of every one of these is the repro, and "it does not reproduce" is a legitimate outcome that DELETES the item** — say so in the handover rather than fixing something to make the finding true. That is `CLAUDE.md`'s standing rule about a review's three separable claims (the defect, the mechanism, the remedy) arriving from an outside reviewer instead of the pre-push one.

---

## next  12 · A quantity-first carton line can silently halve an ingredient's unit cost  **[A — silently wrong numbers, the class this repo ranks above a crash]**

⚠️ **UNMEASURED. The fixture below has not been run.** Reproduce it first; if it does not, delete this item.

**The claim:** `parseInvoiceText()` can count the purchased-carton quantity as part of the pack denominator while the monetary chooser selects a **per-carton** price, so the two halves describe different things and the division is wrong in the cheap direction.

**The fixture to run first, verbatim:**

```
2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00
```

The pack parser is claimed to see both `2 CTN` and `6 x 1kg` and produce a **12 kg** denominator, while the price chooser takes the repeated `60.00`. That gives **$60 / 12 kg = $5.00/kg with `needManual:false`**, so the row is not flagged and is pre-ticked. The invoice says two 6 kg cartons at $60 each: **$120 / 12 kg = $10.00/kg.** Apply then writes $5.00/kg onto the product and it flows into every plate line that uses it.

**Nothing errors and the answer is entirely believable**, which is why this is A rather than B: a halved beef price does not look like a bug, it looks like a good week.

**Claimed sites:** `js/app.js:10287-10340`, applied around `11576-11583`. **Grep before planning off those numbers.**

⚠️ **`resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory` and `packToUnitCost` are on the never-touch list and the protected parser region between `var INV_EXCLUDE=` and `function unitLabelFor(` may not be edited.** If the repro lands inside either, **stop and tell Max** — solve outside the region, the way 0b's `invUnitRebase` did, and extract the decision so the guard and the write cannot disagree.

**What must be true when it is fixed:** that exact line costs $10.00/kg, or is flagged `needManual` rather than silently pre-ticked. **And the regression fixture must put the purchased quantity BEFORE the pack composition**, because that ordering is the whole defect: `parser.test.js` and `inv-packnorm.test.js` both stay green today, and the reviewer's reason is that every existing multi-carton fixture puts composition first. `matched-price.test.js` cannot see it either — it starts downstream of raw parsing.

## next  13 · Café A's settings and supplier memory survive a same-session move into café B  **[A — cross-tenant, and one half writes A's data into B's database]**

⚠️ **UNMEASURED.** Two findings, merged because they are one mechanism at one site: **bootstrap does not clear tenant-scoped in-memory state before applying the new tenant's rows**, so anything café B has no row for keeps café A's value.

**The sequence claimed, and it needs no page reload because the current code implements exactly this transition:** A is loaded with a food-cost target of 30% and a GST default of `inc`. The A membership is revoked while the page stays open — **the non-member path deliberately leaves in-memory state present**, which is 185's `unknown`-third-value work doing what it was built to do. The same account is then admitted to B.

**Half one, wrong numbers.** B has no `food_cost_target` row, so bootstrap never assigns the variable and A's 30% survives. A $6 dish that should price off the 40% baseline is suggested at **$20 instead of $15**. An inherited inclusive-GST default reads a $110 invoice figure as $100.

**Half two, and this is the worse one.** `supplierMem` survives the same transition. B's `supplier_phrases` read **succeeds and returns `[]`**, bootstrap treats A's retained phrases as local unsynced data, and pushes them into B — **correctly stamped as B by the tenant machinery, which is the point.** That is cross-tenant disclosure plus persistent parser pollution: B's later invoices are matched using pack knowledge learned in A.

**The reviewer is explicit that this is NOT an RLS failure:** *"RLS is doing its job; the client is handing B data that originated from A."* It found no ordinary-table cross-tenant bypass in the migrations it traced. **Do not go looking for a policy bug.**

**Claimed sites:** `js/app.js:1082-1085, 1231-1237, 1239-1249, 2737-2751, 9907-9918`, supplier-memory helpers around `4131-4140`.

⚠️ **This is a successful-but-empty read being treated as absence, which is the family `CLAUDE.md` already names three times** — a successful empty read, an RLS-blocked read and a failed read are three different things that arrive looking like two. **The fix belongs at the boundary, not per variable:** a tenant transition clears tenant-scoped state, and `[]` from B means B has nothing rather than "keep what you had".

**What must be true when it is fixed:** after an A → non-member → B bootstrap in one page, every tenant-scoped setting reads B's value or the application default, never A's; and **zero rows originating in A appear in B's `supplier_phrases`.** The regression test is that exact three-step bootstrap with **empty** B settings and phrases — `boot-gate.test.js` does not cover it.

## next  14 · An account with two pending invitations joins the OLDEST café, not the intended one  **[A — multi-tenant correctness, and it also decides their role]**

✅ **CONFIRMED against the SQL, 5 Sep 2026. The only item here that is not a claim.** `supabase/migrations/20260814_invitations.sql:495-540` — and that is still the newest definition, checked by listing the directory rather than trusting this line.

`claim_business_invite()` **takes no arguments at all.** It resolves the caller's confirmed email, then:

```sql
select i.* into inv
  from public.business_invites i
 where i.email = em
   and i.accepted_at is null
 order by i.created_at, i.id
 limit 1
   for update;
```

and inserts `business_members` with **`inv.role`** from whichever invitation that picked.

**The failure:** café A invites `alice@` on Monday, café B invites the same address on Tuesday. Alice follows B's path intending to join B. The client calls the argumentless RPC **automatically at boot**, so she is never asked. She becomes an **A** member, with **A's role**, and the one-business-per-user constraint then blocks the membership she actually wanted. No error is raised anywhere.

**Claimed client site:** `js/app.js:1095-1117`.

**What is NOT wrong, and the reviewer checked:** there is no replay turning an accepted invitation into a second membership, and no path where the client chooses a more privileged role during the claim. **The stored role is what SQL inserts. The defect is selection of the wrong valid invitation, not role injection.** Do not widen this item into a rewrite of the invitation flow.

**What must be true when it is fixed:** the claim names which invitation it is claiming, and an ambiguous case is either resolved by that identifier or refused rather than guessed. **Two pending invitations to one confirmed email is the regression test**, and no existing invitation test exercises it, which is why this survived a suite that covers confirmed-email, replay, role and RLS behaviour.

⚠️ **`claim_business_invite()` also carries the `revoke … from public` gap that does not revoke `anon`** — already filed in `MAINTENANCE.md` under its own entry, still reasoned-not-run. **A batch touching this function should close both in one migration**, and must find the newest definition by listing the directory: `grep -l 'create or replace function public.claim_business_invite' supabase/migrations/*.sql | sort | tail -1`. Copying forward from the wrong ancestor is how 219 deleted 187's owner-only guard.

## next  15 · A transient role-lookup failure lets staff move the live costing target, with no rollback  **[B — a wrong price on screen, and the server is not the problem]**

⚠️ **UNMEASURED.**

**The claim:** on a fresh session an unknown or errored role is treated as owner-like client-side. `current_business_role` transiently fails for a staff account, the food-cost target control stays operable, they change 40% to 30%, and **`setCogs()` updates `cogsPct` and recomputes pricing immediately.** The Supabase write is then correctly refused by 187's owner-only restrictive policy — and **nothing rolls the client state back.** A $6 dish shows **$20 instead of $15** until a reload.

**"The server authorization is sound here. The numeric client state is not."** Do not touch the policies.

**Claimed sites:** `js/app.js:916-926, 1131-1133, 2739-2750`, target-input handler around `8534-8540`.

⚠️ **The comment at `js/app.js:916-919` is a finding in its own right** and is the reason this was not caught: it argues fail-open role presentation is harmless because the server rejects the write and the user gets an error. **That is right about authorisation and wrong about consequence** — the number has already moved. This is the shape `CLAUDE.md` names as *a comment that records the defect correctly and files it under the wrong consequence*, and it is that section's fourth dated instance. **Fix the comment in the same change.**

**What must be true when it is fixed:** a cost-affecting client write that the server refuses leaves the client showing what the server holds. **The regression test must assert the rollback, not the refusal** — the existing role/client tests pin unknown-as-owner-like and therefore establish nothing about state after rejection.

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
