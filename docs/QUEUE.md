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

## next  6 · The bottom-of-screen chrome has no single owner, and two pieces overlap  **[B]**

Promoted from `docs/MAINTENANCE.md`'s displaced-B list on 31 Aug 2026 by batch 225, under that file's own rule — these five passed the launch test and sat there only because this file was at its 20-item cap. It is not: the cap freed up long ago and nobody re-checked, so approved B work was sitting where `/batch` cannot see it. **The trigger is a slot, and the slot has been open for weeks.**

Found 10 Aug 2026 while measuring a free slot for the sync banner; the same class as the defect v141 fixed — two pieces of `position:fixed` bottom chrome whose owners never met.
Measured at 1024 with both showing: `.toast` x431-817 / y770-816, `.install-banner` x600-1000 / y787-876 — they share x600-817, y787-816. The same overlap holds at 1280, 1440 and 1920 (both anchored to the bottom, one centred and one right-aligned, so widening does not separate them).
The toast is `pointer-events:none` so nothing is BLOCKED, but the install banner's "Install" button and its ✕ sit under a pill of text. Only reachable pre-install (`beforeinstallprompt`), so Max on an installed PWA never sees it — **it is a new café's first ten minutes.**
Requirements: one owner for the bottom stack. v141 established the three-way split (left: sync banner, centre: toast, right: install banner) and this is the one pair that split does not separate, so the fix is vertical — stack the toast above the install banner when both are up, or move one. `tests/visual/v141-sync-corner.spec.js` already measures the banner against both and would extend to cover this pair.

## next  7 · `ensurePlateForDish` starts a second empty recipe instead of relinking the real one  **[B]**

Promoted 31 Aug 2026, same reason. **Max already answered the design question on 9 Aug 2026**, so nothing here is open — the requirements below are settled, not candidates.

Correct for a genuinely uncosted row; for one whose real recipe exists in the library it leaves that recipe unreferenced and silently starts a second, empty one. Flagged in v113, unchanged.
Requirements (Max's answer, 9 Aug 2026): the heal looks for an existing library plate by the dish's name BEFORE creating an empty one; exactly one match → relink automatically; several → ask; none → today's behaviour.
Note **no path creates an unlinked row**: the class arrives only from history or a restore, and production has **0** of them (verified 7 Aug 2026).
Build it with the both-sides lesson in mind — a relink heals kid-lines only (see `kingMissingImpact`'s v124 history).

## next  8 · Contrast: body text and control boundaries, decided ONCE in the tokens  **[B]**

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

## next  9 · "Slightly under" is the one verdict phrase that does not carry its own subject  **[B]**

Promoted 31 Aug 2026. One site, one or two words. **The three-vocabulary split it sits inside is DECIDED** — this must not turn into re-litigating it.

F8 (v147) answered the queue's three-vocabularies question: the split IS deliberate — the Menu cell judges COST against target ("over"/"well over"), `marginLightWord` judges PRICE against suggested ("Slightly under"/"Underpriced"), and the filter chips say what you would DO ("Watch"/"Rework"). Three subjects, one shared LIGHT from `analyze()`. Written out at `vbadge` in `js/app.js`, with pointers at the other two sites.
**The residual:** of the nine phrases, "Slightly under" alone names no subject, so it is the only one a user can read as being about cost when it is about price. "Underpriced", "Healthy margin", "over", "Watch" and the rest all carry theirs.
Requirements: one word or two, at one site, that names the subject without lengthening the row — and it must not turn into a re-litigation of the split, which is decided. Out of scope: colour, `analyze()`, and the other eight phrases.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
