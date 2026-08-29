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

## next  5 · The restore's full-wipe step (step 3)  **[A — data integrity]**

✅ **`Do after:` DELETED 29 Aug 2026 — SATISFIED.** It named *"The backup does not carry three of the five history series"*, which shipped as batch 219 / `ezplate-v179`, so the reason this item was held is gone: the backup carries all five now, and `restore_backup` v5 puts the two new ones back additively. Deleting the line is the mechanism rather than tidying — a satisfied dependency left in place is how the dropdowns item spent two years waiting on a conversion that had already landed.
⚠️ **The warning that line carried is worth keeping and is NOT about this item's schedule: NAME the item you depend on, never its number.** That `Do after:` had been renumbered eleven times, and once renumbered WRONG, because a regex that renumbers `## next  N` silently skips `Na`. This item is now plain `5` for the same reason the lettered pair existed — 5a is gone.
⚠️ **AND ONE FACT ON THIS ITEM HAS MOVED, per `CLAUDE.md`'s rule that a queued item's approval does not expire and its FACTS do.** It says the wipe would have lost "148 rows of real history". Measured 29 Aug 2026 on production: `price_history` is **284** rows and `menu_price_history` **143**, so the exposure was 427 and is now zero — those two tables are in the backup and the restore. **Re-measure before starting; do not carry 148 forward.**

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

## next  7 · Two more insight families name a subject that is not in `facts`  **[B]**

Found by batch 220 while closing the previous item 7, which named THREE families. It named three because the pre-push review that found them demonstrated three; the enumeration was never checked. **There are five, and the other two are the same defect with the same cost.** (`CLAUDE.md` Tier 3: *"If a brief's list looks complete, check it anyway."*)

| Family | `facts` | what the text names and nothing defends |
|---|---|---|
| `insVolatility` | `{name, loPct, hiPct}` | the **volatile INGREDIENT** — "swings 24–38% with **cream** prices". The PLATE is published; the ingredient driving it is not. |
| `insNearCluster` | `{count, targetPct, others}` | up to **two PLATE names** — "Barra & Chips, Cheeseburger and 1 other sit within…". No name at all is published. |

**Measured 29 Aug 2026, against the real builders and the shipped validator:** rewriting "cream" to "beef", and "Barra & Chips, Cheeseburger" to two other plates, are both still **ACCEPTED** — every figure, symbol and direction identical. The owner is pointed at the wrong ingredient, or told to go and look at two plates that are not the ones near target.

**What is already built and is why this is small:** 220 shipped `namesAllPresent` / `gemNamesAllPresent`, so a subject published in `facts` is now *required* to survive a rephrasing. These two families simply do not publish one. The mechanism is done; this is the data.

**Requirements:** each names its subject in `facts`, and `tests/insight-real-templates.test.js`'s `SUBJECTS` table grows two rows (it is already a loop — a row is a family). One string key per subject and nothing else changes.
⚠️ **Neither is a one-liner, and that is why 220 did not just do them** — each carries a real design question, and answering it is the work:
- `insVolatility` falls back to the literal `'ingredient'` when `volatileIng` is absent. **Publishing that fallback as a name would require the word "ingredient" to survive every rewording**, which is a normal English word in a sentence about ingredients. Publish the key only when a real ingredient is known.
- `insNearCluster` names **0, 1 or 2** plates depending on the data, and `lead` falls back to a bare count. So the key count is conditional — the `others` remainder is the precedent for a conditionally-present fact.
⚠️ **Do NOT publish the UNIT anywhere while doing this.** 220 deliberately left `insPriceAnomaly`'s unit out of `facts`: every string in facts is matched against the text as a name, and `"ea"` sits inside `"dearest"` in that very template, so short unit strings generate spurious matches and reject good rewordings. The comment at that site says so.

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
