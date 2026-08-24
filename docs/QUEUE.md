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

## next  0c · Close the measured mutation debt on the pricing surface  **[A — Max's override, 22 Aug 2026]**

⚠️ **This is process work and this file's own header says process work does not belong here. Max put it here anyway, in writing, on 22 Aug 2026**, after the audit showed the alternative track had completed zero items in fifteen batches. **It is the second time that rule has been overridden and the first was the mutation gate itself** — same reasoning, same person, and it is not precedent for anything else.

✅ **PART ONE SHIPPED IN BATCH 201 (`ezplate-v170`) AND THIS ITEM IS THE REMAINDER, RE-STATED FROM MEASUREMENT RATHER THAN FROM THE ORIGINAL GUESS.** What landed: the gate can now be pointed at this code at all (it could not before — see below); four pricing functions are targets at zero survivors (`packToUnitCost`, `unitToBaseFields`, `packPriceOf`, `menuMarginPreview`); `tests/inv-chain.test.js` exercises `buildInvRows` end to end in eleven cases, which was the item's stated deliverable; and every remaining candidate was RUN through the gate, so the debt below is counted rather than estimated.

⚠️ **THE BLOCKER NOBODY HAD HIT, because nobody had pointed the gate here: `spawnSync` had no timeout and `node --test` has no default one, so a mutant that turns a loop into a non-terminating one hung the gate forever** — no red, no green, no output. `computeInsights` has exactly one and the gate ran past ten minutes on it. Fixed in 201 with a baseline-derived per-mutant bound; a timeout is counted as a kill and named separately. **Do not attempt any of the below on a gate without that bound.**

✅ **BATCH 202 CLEARED THE TOP SIX** — `invGstDetect`, `costAtLines`, `unitCatCategory`, `derivePackPrice`, `costFromLines` and `analyze` are targets now. Twenty-two survivors: nineteen killed by assertion, three allowed with **enumerated** proofs of equivalence rather than arguments that they are unlikely. **143 survivors remain across four functions, and every one of them is 12 or more** — the cheap slice is finished and the next one is a different size of job.
⚠️ **THE BIGGEST FINDING OF THE SLICE IS ABOUT THE `tests:` LISTS, NOT THE CODE.** `costFromLines` — the plate cost, the most load-bearing number in the app — declared four test files and **all four replace it with a stub**: `kpi-strip` returns `lines[0].cost`, `builder-page` returns 1, `publish-guard` returns 0, `dash-digin` looks the answer up in a table. Not one line of it had ever executed in a test. The stubs are all correct where they are (none of those files is about plate costing), so the fix was a file of its own, `tests/plate-cost.test.js`. **When taking the next slice, check that the declared files RUN the function before believing the survivor count means what it looks like** — a `tests:` list reads as coverage and is only a claim.

What the six had in common is worth knowing before starting the next slice: **not one of them was a subtle case. Every survivor was a branch no test had ever taken** — the later spellings in an `||` chain (`gr`, `gram`, `lt`, `litre`, `units`, `each`), the volume arm of a function only ever tested with weights and counts, the Settings fallback on an invoice that states no tax basis, a plate line whose product was deleted, a negative menu price, and the exact 15% amber/red boundary. Two of the twelve needed the HARNESS widened rather than a new case: `dash-digin.test.js` stubbed `lineProduct` in a form that could not represent a `{kid, qty}` line at all, so every kitchen-ingredient branch in `costAtLines` was unreachable from that file.

**THE REMAINING DEBT, and it lives in `tests/mutation/targets.js`'s `pending` list with a count on every line.** Work it in cost order; each promotion is "kill the survivors, move the line up".

| function | survivors | note |
|---|---|---|
| `buildInvRows` | 12 | was 14; `inv-chain.test.js` took two. The rest are coverage-threshold boundaries needing exact-coverage fixtures |
| `resolveMatchedPrice` | 24 | |
| `applySupplierMemory` | 24 | **24 mutants, ZERO killed.** Its declared test file mentions it and never exercises it |
| `computeInsights` | 39 | plus the one that hangs |

**`cpbu` and `fmtTargetPct` are struck from the original list and can never be targets:** both are one-expression functions yielding ZERO mutants, so a target on either reports nothing at all rather than nothing wrong. Same trap as the `setProducts` delegate.

Requirements: every line above reaches zero survivors and moves from `pending` into `targets`. **Split it — 165 survivors is not one PR**, and the table is in cost order so a batch can take a contiguous slice and say where it stopped.

## next  0c2 · `gemApplyReadings` has 44 surviving mutants and needs its own coverage batch  **[A — scheduled, not deferred]**

**This item exists because 0c's third requirement was that this be SCHEDULED rather than deferred a sixteenth time**, and a line inside another item is what let it be deferred fifteen times. It is now a thing that can reach the top of this file on its own.

`gemApplyReadings` is the invoice referee's merge orchestrator — it decides which of the AI's readings are allowed to change a row a human is about to confirm. **44 of its 56 mutants survive** `tests/invoice-gate.test.js`, which pins exactly one property of it: that a row the user has already ruled on is skipped. Measured at batch 180, unchanged at 195, re-confirmed at 201.

It is held out of `targets` for the reason written at its own site: promoting it before the coverage exists makes the gate exit 1 on `main` and block every push, and **a gate nobody can satisfy gets disabled**, which costs more than one missing target.

Requirements: the survivors are killed or carry written allowances, and the line moves from `pending` into `targets`. Expect this to be mostly test-writing against canned Gemini payloads — `tests/inv-gemini-merge.test.js` and `tests/inv-gemini-match.test.js` already have the fixtures shape.

## next  0d · The mandatory pre-push review leaves no artifact anywhere  **[A — Max's override, 22 Aug 2026]**

Same override as 0c. **Found by an independent blind PROCESS audit** run the same day against the skills, hooks, CI and 149 handovers, with `CLAUDE.md` and this file withheld.

The pre-push `code-review` agent is, on the record, the most productive gate in this process — and it is **the only gate with no trace of any kind**: not on the PR, not in CI, not in git, and not in the handover template (`skills/handover/SKILL.md` lists six mandatory sections and a review is not one of them). **Six batches that shipped a client asset to production have no record of it**: 151, 153, 170, 176, 179 and 183 — and 183 also shipped a production migration. Only 176 is knowable, because its brief said to skip it. **The other five are silence, and silence is indistinguishable from compliance.** Verified here: those five contain zero mentions, while 187/190/193/195 contain two to five each.

The 13 Aug rule — *"NOT SKIPPABLE BY INSTRUCTION"* — fixes the one case that was visible and does nothing about the five that were not, because it is another convention layered on the convention that failed.

Requirements: the review writes its findings to a file; `.githooks/pre-push` refuses the push when the diff touches `js/`, `css/`, `index.html`, `sw.js`, `tests/`, `.github/` or `supabase/` and no review artifact exists for the current HEAD; `## Review` becomes a mandatory handover section, with *"None"* an acceptable answer exactly as the Probe section works.

**Delete `.github/workflows/code-review.yml` in this same item** (Max, 22 Aug 2026, reversing his own 8 Aug demote-not-delete). 320 lines, **zero runs since the demotion** and the `deep-review` label **never once applied** — both verified against the GitHub API. It is not free: two batches (155, 159) declined one-line CI fixes because touching a workflow file triggers the mandatory review, so a workflow nobody runs is making other work more expensive. Git keeps it.

## next  1 · A new café cannot be CREATED at all  **[A — launch blocker]**

✅ **ANSWERED 14 Aug 2026 (Max): shape B — SELF-SERVICE. A stranger creates an account and names their own café, unattended.**
He was told in writing that B reverses his own "a self-service sign-up form is still NO" call of the same day, and that it makes the privacy gate urgent, and chose it anyway. **It is a decision and may not be re-litigated.** (`docs/decisions/2026-08-14-cafe-creation.md` q1.) Options A and C — Max provisioning each café, and a founder invitation — are DECLINED; do not re-propose either.

Do after: **the privacy gate** — and this is a scheduling fact rather than a second opinion on his answer. B's whole point is that a stranger's café can exist without Max, and this file's privacy-gate item says *"before the first non-Scoopy's row exists, not after"*; a café row is such a row, and the stranger who owns it will send invoice text into Gemini's free tier on day one. **Shipping signup first is the one ordering that cannot be undone**, because the data has already left.
⚠️ **This line named TWO items until 15 Aug 2026 and now names one: pdf.js 4.2.67+ SHIPPED in batch 195** (`ezplate-v167`, 4.10.38), so its half is deleted per this file's own rule that a satisfied dependency is removed rather than left standing.
⚠️ **And the remaining half stopped being a DECISION later the same day.** Max answered the privacy gate — option B, disclose it — so that item is `next` rather than `blocked` and is ordinary work again. **This item is therefore behind WORK, not behind Max.** Nothing here is waiting on a person; the disclosure simply has to ship first, because B's whole point is that a stranger is told before their invoice text reaches Google, and a stranger cannot be told if signup exists before the telling does.

**Found by batch 191 while shipping invitations, by reading the policy list rather than by hitting it.** Measured against production, 14 Aug 2026:

```
businesses        → ONE policy, "members read their business",   SELECT, authenticated
business_members  → ONE policy, "members read their own membership", SELECT, authenticated
```

**Select and nothing else.** No client role may INSERT into either table, and nothing in `js/app.js` tries. The only write path to `business_members` anywhere is 191's `claim_business_invite()`, which is `SECURITY DEFINER` and can only ever join somebody to a café that **already exists**. So:

- Invitations let an owner add people to an existing café. **They do not create cafés.** *(Both halves have now SHIPPED — the server in 191, the client in 192 — so this is a statement about a live feature rather than a planned one, and it makes this item the only remaining hole in the signup story.)*
- Every `businesses` row and every founding `business_members` row in this project has been made **by hand in the Supabase dashboard**, and there is no other way to make one today.
- `set_member_role` already says what a founder IS — the first member of a business becomes `owner` — so the vocabulary exists; what is missing is anything that can insert the two rows.

**Why this is A and not B:** a second café literally cannot come into existence without Max opening the Supabase dashboard, which is the same sentence the invitations item was written to delete, one level up. The launch story is signup → café → catalogue → plates, and this is the second step.

### What B has to build

**Measured against production 14 Aug 2026, not assumed:** `businesses` and `business_members` carry exactly two policies, both `SELECT` to `authenticated`, and no INSERT anywhere. ⚠️ **The GRANTS are wide open on both tables to `anon` and `authenticated`** — it is RLS's default-deny, not the grants, that stops a write today. Know that before touching either table; it is the opposite of what 191's `business_invites` does deliberately.

**192 shipped a sign-up form gated by `invite_pending`**, so today the only way to get an account is to be invited, and an invitation joins you to the café that sent it. B opens a **second** sign-up path that is not invitation-gated: a confirmed account with no membership and no pending invitation reaches a first-run "name your café" screen, and naming it creates the business and the founding membership together. `set_member_role` already makes the first member an `owner`, so the café has one by construction and invitations work on it immediately.

Requirements: a café can be created and get an owner **without the Supabase dashboard**, by a stranger, unattended.
⚠️ **Do NOT open this by widening the policies on `businesses`/`business_members`.** A plain INSERT policy on `business_members` would let any signed-in account write itself a membership row for **any** business id it can name — which is every tenant policy 181-187 built, undone by one statement. The shape that fits what is already here is a `SECURITY DEFINER` function that creates the business and the founding membership together, exactly as `claim_business_invite()` creates a membership and nothing else can.

*(Batch 192's A/B/C options block was struck from this item on 15 Aug 2026, by AUDIT-v166's C1. It was correct when written and superseded a day later by Max's answer, and it left this item saying **answered** in its header and **"that is the blocked question"** in its requirements — 41 lines apart, in a file whose rule is that a queued item runs without stopping. A and C are declined; the reasoning that produced the answer is in `docs/decisions/2026-08-14-cafe-creation.md`, which is where a superseded option list belongs.)*
⚠️ **It interacts with invitations, and 192 changed what that interaction is worth:** a café created this way has an owner by construction (`set_member_role`), so invitations work on it immediately. The old note said doing this FIRST would make the invitations item testable with a real second café — **that scheduling argument is now spent, because invitations have shipped and were rehearsed against staging's second café instead.** What survives is the plainer point: this is the only way a second café can exist at all, and until it does, every invitation in the world is an invitation into Scoopy's.

## next  2 · The privacy gate — ship the DISCLOSURE  **[A — launch blocker]**

✅ **ANSWERED 15 Aug 2026 (Max): option B — disclose it.** His words: *"for now do b and we can sort this later post launch."*
He was shown both options with measured costs and a recommendation of A (paid tier, ~5–20c per café per month), and chose B. **It is a decision; do not re-put the A/B question.** Full reasoning, the measured figures and Google's exact terms: `docs/decisions/2026-08-15-privacy-gate.md`.
*(`Blocked on: Max` DELETED 15 Aug 2026 — answered. This item is now ordinary work.)*

Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`. Google's terms for that tier: it **uses submissions to improve its products**, and **human reviewers may read them**.
Requirements: **a privacy policy that discloses this, shown before the data moves.**

⚠️ **A POLICY NOBODY READS BEFORE THE DATA MOVES IS NOT A DISCLOSURE**, and this is the half that is easy to ship wrong. The gate's own wording is *"before the first non-Scoopy's row exists, not after"*; the same logic applies inside the app.

- Written policy naming **Google specifically**, saying the free tier may use the data for training and that humans may review it. **Vague wording does not discharge this** — "we may share data with service providers" is exactly the phrasing that hides the material fact. The unusual specific is the whole point.
- Shown and accepted **at signup**, before an account exists.
- Restated **at the invoice import screen**, because that is the moment data actually leaves. Someone who accepted a policy three weeks ago has not meaningfully consented to today's upload.
- Check what the Dashboard insight toggle currently says; it is already user-controllable, so it may be the cheapest of the four.

**The WORDING is Max's to approve before it publishes** — a privacy policy is a statement his business makes. Drafting it does not need him and must not wait on him; only the sign-off does.
Out of scope: switching to the paid tier. That is the item below.

## next  2b · Move the AI endpoints to Gemini's PAID tier  **[A — post-launch]**

**DEFERRED, not declined (Max, 15 Aug 2026):** *"we can sort this later post launch."*
On the paid tier Google *"doesn't use your prompts... or responses to improve our products."* Recorded here rather than dropped, because a deferred decision that leaves no trace is indistinguishable from one nobody thought of.

Measured 15 Aug 2026 against the real prompt (443 tokens of instructions) at $0.25/M input and $1.50/M output: **~0.4c per invoice, ~0.02c per insight, roughly 5–20c per café per month.** 100 cafés is about $20/month.
No code change and no new key — enabling billing on the existing Google Cloud project upgrades the key automatically. Google requires a **$10 minimum prepaid credit**, then pure pay-per-use.

Do after: **The privacy gate — ship the DISCLOSURE** — B is what makes launch legitimate; this is the upgrade that later makes the disclosure milder. Shipping this first would moot B, which is fine, but it is not the order Max chose.
⚠️ **This needs Max at the billing console** (his card, and the assistant may not enter payment details), so it will be `blocked` the day it is taken. **Set a project SPEND CAP in the same sitting** — on a paid key an abused endpoint costs real money, which is the one genuine downside of A and the reason the rate-limit work in the gate-review item matters more once this lands.
When it ships, the policy stops saying *"Google may train on this"* and starts saying *"we pay for a tier that contractually cannot"*. The screens and the acceptance record all stay.

## next  4 · Gate review before public signup  **[A — launch blocker]**

Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer. Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.
Do after: **the privacy gate** — it is the read-through of the gates, not a substitute for them. *(`business_id` PART 2 struck from this line 13 Aug 2026 — shipped in batch 182. **`pdf.js 4.2.67+` struck 15 Aug 2026 — shipped in batch 195 as 4.10.38.** The pdf.js version is still one of the things this review READS; what is gone is the wait for it.)*
⚠️ **Both of this item's standing lines are now ANSWERED, and what is left is the sign-off rather than the work.** `restore_backup` is still `SECURITY INVOKER` — verified live, 13 Aug 2026 — and under 182's policies that makes it tenant-scoped for free: a restore deletes and rewrites only the caller's own café, measured on staging. Since 187 it also refuses a non-owner outright. **The anon-key exposure is CLOSED** — 186's `20260814_mandatory_sign_in.sql` removed the anon branch from `current_business_id()`, so the key that ships in `index.html` reads nothing; verified over PostgREST on production, `null` tenant and zero rows on all four required tables. *(This paragraph said closing it was "the auth item's one-function change, and this review is where it gets signed off". The auth item is gone and the change shipped; the sign-off is still this item's.)*
**So what remains here is genuinely a REVIEW:** read the four gates end to end and say whether they hold together — Gemini's tier, the pdf.js version, rate limits and billing on the AI endpoints, and whether open API-level signup is acceptable now that a self-made account can see nothing.
✅ **The pdf.js gate is SETTLED and this review only has to confirm it: 195 shipped 4.10.38**, which closes CVE-2024-4367 outright rather than mitigating it, keeps `isEvalSupported:false` as a second layer, and keeps the SRI hash across the move to an ESM load. `tests/third-party-pins.test.js` now pins both scripts' version-and-hash pair and encodes both known advisory windows, so a future "bump to latest" into GHSA-hq66-cqwq-w95j (5.6.83 ≤ v < 6.2.108) fails the suite. **Read that test rather than re-deriving the version question.**
⚠️ **Batch 191 added a FIFTH thing to read, and it is the only unauthenticated endpoint this app has ever deliberately shipped.** `invite_pending(email)` is callable by `anon` and answers whether some café has a pending invitation for an address. The disclosure is argued at length in `supabase/migrations/20260814_invitations.sql`'s header and is believed to be the smaller of the two available surfaces — but **nothing in this repo rate-limits it**, and Supabase's per-IP limits are the whole brake. Decide here whether that is acceptable, and say so either way. **192 made it REACHABLE**: the boot gate's sign-up form calls it on every attempt, so it is no longer a function nothing invokes — it is now the first thing an uninvited stranger's browser can ask this database, and the only rate limit on it is Supabase's per-IP one.

## next  5a · The backup does not carry three of the five history series  **[A — data integrity]**

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

## next  6 · Floating layers and mobile dropdowns  **[B]**

Dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying. **Usable one-handed on a 380px phone** is the requirement, on the device Max actually works on.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** (v119 review). `anchorDrop` / `dropPlace` / `dropBox` is ONE shared engine reused across several call sites; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely. **Count them properly before planning off the number** — every enumeration in this project has come back different from the guess.
Requirements: one placement implementation.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`, so every layout a dropdown opens over is now converted and placement can be done once.)*

## next  7 · Onboarding — the empty-state decisions 190 did not take  **[B]**

**What is left of the onboarding item after batch 190**, kept as B rather than A because both are judgement calls about wording and neither blocks anyone.

⚠️ **190 measured every screen at genuine zero — nine panes, 380 and 1280, light and dark — and the headline claim was already mostly built.** The v58 empty-state system (`emptyStateHtml` / `emptySearchState`) already gives Products, Ingredients, Plates, Menu, Dashboard and Invoices a real true-empty state with a CTA; Settings and Account render fine; and at zero plates the Add-dish picker says *"No costed plates found. Build and save a plate first."* — honest, with no dead control. **Do not re-audit that; look only at what is below.**

Two things a reader could reasonably call wrong, both cosmetic:

- **The Menu screen offers "Existing plate" at zero plates**, and at 380 it wraps onto its own row under the header and reads as an orphan. It is not broken — the modal it opens explains itself — but it is a control offered before it can do anything.
- **The six empty states have never been read end to end as one sequence.** Each was written by the batch that built its screen, months apart; nobody has read all six together to ask whether a new café is being told the same story in the same words, or six unrelated ones. Screenshots of all nine panes at zero are cheap to retake — see the spec named above.

## next  8 · The insight validator checks the digits, not what they mean  **[B]**

From the blind code audit, 22 Aug 2026. `api/_insight.js` states a hard law — *"any number in the model's text that isn't one of the facts we handed it ⇒ the whole phrasing is rejected"* — and enforces exactly that sentence and nothing more. `validatePhrasing` (`api/_insight.js:40-58`) is **set membership** over `/-?\d+(?:\.\d+)?/g` with a ±0.005 tolerance. Nothing checks position, adjacency, unit or sign.

Run against the real function with facts `{pts:18, plates:5}`, **all of these are ACCEPTED**:

```
"Beef, up 18% across 5 plates, is most of it."          correct
"Beef, up $18 across 5 plates, is most of it."          % became $
"Beef, up 5% across 18 plates, is most of it."          facts swapped
"Beef is down 18% across 5 plates."                     direction reversed
"Beef, up 18% across 5 plates, is fine and needs no action."   advice inverted
```

The endpoint runs at `temperature: 0.4`, the toggle **defaults ON** (`js/app.js:9041`), and `api/insight.js`'s own header tells the reader this is safe: *"every number preserved (enforced by `_insight.validateInsightResponse`)"*. Number preservation is not what is enforced.

**`tests/api-insight.test.js` is the other half of this item.** Its header calls this *"the HARD LAW"*; all five of its `validatePhrasing` assertions test the same half — a number NOT in the fact set is rejected. **Nothing tests meaning.** The file's own summary sentence is false about what it checks.

Requirements: validate the **sequence** of numbers rather than the set, and reject a candidate whose number-adjacent unit tokens (`%`, `$`, `pts`) differ from the template's. That still permits rewording, which is all the feature needs. The test asserts the meaning half by name.

## next  9 · A plate save clears the recovery draft before the server answers  **[B — silent loss of authored work]**

`js/app.js:2811`: `var _write=dbPushPlate(sp); clearPlateDraft(); …` — the draft is deleted **synchronously**, whether or not the write lands.

Offline, `pushWrite` toasts *"you're offline. It has NOT been saved."* and the "Saved just now" badge correctly stays down — but `cafeDB_plateDraft` is already gone and `savedPlates` holds the new lines only in memory. Background the app, iOS discards the tab, `bootstrapSync` replaces `savedPlates` from the server, and the edit is gone with no draft to resume. **This app's stated user goes a week between uses, so the toast is long past.**

The comment three lines below already reasons about exactly this hazard for the BADGE, and `authSwitchUser` (`js/app.js:6781-6789`) argues at length that the draft is *"unsaved authored work … destroying it is data loss, not tidying, and the app never does that silently anywhere else."* **This is the place it does.**

Requirements: `clearPlateDraft()` moves into the success arm that already exists for `setBuilderSaved(true)`. One line.

## next  10 · A plate with an uncostable line reads as fully costed, and healthier than it is  **[B]**

`costFromLines` (`js/app.js:2851`) counts the lines it could not cost into `miss` and **returns only the partial sum**. Every cost, percentage, verdict pill and dashboard average outside the builder comes from it — `avgFoodCostForScope`, `dishesOverTarget`, `renderAnalysis`, `kpiStripHtml`, `plateCostText`, `computeInsights`. The builder is the one screen that counts missing lines itself and raises `#flag`, so **the only screen that warns is the one you must already be on.**

Second way in: `lineCost(p,qty)` is `qty*c`, and `null * c` is **0**, not null — so a line with no quantity is a real line costing nothing and even the builder's flag stays down.

Reached by a restore that `backupRefCheck` flagged as a soft problem — the confirm says *"Those will cost nothing until you relink them"* — or by a plate saved before the `qty<=0` rule. The Menu row then prints a reduced cost, a suggested price derived from it, and a **green** verdict pill, with nothing indicating a line is missing. `kpiStripHtml`'s comment asserts the Ingredients tab owns this surface; for a direct `pid` line **that surface does not exist**.

Requirements: a plate that could not cost every line does not render as costed. `costFromLines` returns or exposes its `miss` count and the callers act on it.

## next  11 · A price point is logged even when the write carrying it was rejected  **[B]**

`setProducts` (`js/app.js:1279-1299`) fires the `ingredients` upsert and the `ing_price_history` insert independently and gates neither on the other — `var write=dbPushIngredients(…)` is never awaited before `logIngPrice` and `saveIngLog()` run.

Café phone, one bar, invoice import: the product upsert times out, the smaller history insert lands. `pushWrite` honestly toasts the product failure. Next boot, the product's price comes back correct from the server — and `ingPriceLog` also comes back from the server carrying **a point for a price that was never stored.**

That phantom point is then read by `ingPriceBand` (the builder's "recent range" and the Menu cost band), `ingLastMovePct` (the Ingredients drift chip), and `ingPriceAt`/`costAtLines`, which is what the Dashboard's *"N pts higher than at June prices"* sentence is built from. All of them describe a movement that did not happen. **The change log applies exactly this discipline for interventions via `logChangeIfSaved`; the price log does not.**

Requirements: the price point is written only if the write that carries it succeeded, or is reconciled on the next boot.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
