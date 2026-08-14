# Queue

Worked top to bottom by `/batch`. Position is priority. Max adds problems, not briefs: what is wrong, and what must be true when it is fixed.
**Tier test — if we launched to paying customers tomorrow, would this item stop us, embarrass us, or hurt them?** **A** = launch is impossible or unsafe without it. **B** = a real person using the app would see something wrong, broken or half-finished. **C** = everything else → `docs/MAINTENANCE.md`, which since 13 Aug 2026 is worked on a **parallel track in its own worktree** rather than only when this file is empty (that file's header has the procedure and the collision rule). **Ambiguous is C.**
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

## next  1 · A new café cannot be CREATED at all  **[A — launch blocker]**

✅ **ANSWERED 14 Aug 2026 (Max): shape B — SELF-SERVICE. A stranger creates an account and names their own café, unattended.**
He was told in writing that B reverses his own "a self-service sign-up form is still NO" call of the same day, and that it makes the privacy gate urgent, and chose it anyway. **It is a decision and may not be re-litigated.** (`docs/decisions/2026-08-14-cafe-creation.md` q1.) Options A and C — Max provisioning each café, and a founder invitation — are DECLINED; do not re-propose either.

Do after: **the privacy gate** and **pdf.js 4.2.67+** — and this is a scheduling fact rather than a second opinion on his answer. B's whole point is that a stranger's café can exist without Max, and this file's privacy-gate item says *"before the first non-Scoopy's row exists, not after"*; a café row is such a row, and the stranger who owns it will import a PDF invoice through `pdf.js` into Gemini's free tier on day one. **Shipping signup first is the one ordering that cannot be undone**, because the data has already left. Both named items are directly above/below this one and neither is blocked on anything.

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

### ⚠️ THE DECISION, AND WHY IT IS HIS — added by batch 192, which went to build this and stopped

**This item's requirement presupposes something Max has said NO to, and nobody noticed because the two were decided a day apart.**

- 192 shipped a sign-up form **gated by `invite_pending`**. The only way to get an account today is to be invited, and an invitation joins you to the café that sent it.
- So there is **no such thing as "a brand-new account" that is not already destined for somebody else's café.** The requirement below cannot be met without opening a SECOND sign-up path that is not invitation-gated.
- That second path is **self-service signup**, which is the exact thing the invitations decision says is still NO: *"A **self-service** sign-up form is still NO"* (Max, 14 Aug 2026, recorded in the invitations item and now in `HANDOVER-192`).

**`CLAUDE.md` makes reversing his own call his, however good the reason.** So this is not a scheduling question and not an implementation choice; it is the one class that defers an item.

**Three shapes, and only the middle one needs the reversal.** Measured against production 14 Aug 2026, not assumed: `businesses` and `business_members` carry exactly two policies, both `SELECT` to `authenticated`, and no INSERT anywhere. ⚠️ **The GRANTS are wide open on both tables to `anon` and `authenticated`** — it is RLS's default-deny, not the grants, that stops a write today. That is worth knowing before touching either table, and it is the opposite of what 191's `business_invites` does deliberately.

- **A — Max provisions each café.** A `SECURITY DEFINER` function he calls, which creates the business and its founding membership together; he then invites the owner with the machinery 191/192 already shipped. **No self-service, no reversal, and it satisfies this item's literal words ("without the dashboard").** Max stays in the loop for every café that will ever exist.
- **B — a first-run "name your café" screen** for any confirmed account with no membership and no invitation. Full self-service SaaS signup. **This is the reversal.**
- **C — a FOUNDER invitation.** Max creates an invite that says "this address starts a NEW café" rather than "joins mine"; the existing gated sign-up is unchanged, and `claim_business_invite` grows one branch. **Reuses everything 191 and 192 built, keeps sign-up invitation-gated, and still lets a café exist without the dashboard.** This is the shape that fits what is already there, and it is the recommendation if he does not want B.

⚠️ **AND THE ORDERING IS NOT A MATTER OF TASTE EITHER.** If the answer is B, a stranger's invoices reach `api/parse-invoice` and Gemini's free tier the day it ships — which **the privacy gate item forbids outright** ("before the first non-Scoopy's row exists, not after"), and pdf.js 4.2.67+ becomes real rather than theoretical the same day. **B cannot ship before those two, whatever he answers.** A and C do not have that problem, because Max still chooses every café.

Requirements: a café can be created and get an owner **without the Supabase dashboard**. Which of A/B/C decides who may do the creating, and that is the blocked question — the sign-up-time-step-versus-first-run-screen wording this item used to carry presupposed B and has been deleted for that reason.
⚠️ **Do NOT open this by widening the policies on `businesses`/`business_members`.** A plain INSERT policy on `business_members` would let any signed-in account write itself a membership row for **any** business id it can name — which is every tenant policy 181-187 built, undone by one statement. The shape that fits what is already here is a `SECURITY DEFINER` function that creates the business and the founding membership together, exactly as `claim_business_invite()` creates a membership and nothing else can.
⚠️ **It interacts with invitations, and 192 changed what that interaction is worth:** a café created this way has an owner by construction (`set_member_role`), so invitations work on it immediately. The old note said doing this FIRST would make the invitations item testable with a real second café — **that scheduling argument is now spent, because invitations have shipped and were rehearsed against staging's second café instead.** What survives is the plainer point: this is the only way a second café can exist at all, and until it does, every invitation in the world is an invitation into Scoopy's.

## next  2 · Bulk catalogue bootstrap — how a new café gets a product catalogue at all  **[A — launch blocker]**

**Split out of `Onboarding and empty states` by batch 190, which shipped the rest of that item.** It was inside it by implication only, and an implied requirement is one nobody builds — so it is its own item now, because it is a FEATURE and the rest was two view-layer fixes.

Scoopy's catalogue arrived over months of invoice imports. A second café starting from an empty `ingredients` table has no such history, and **an empty catalogue means no ingredients, so no plates, so nothing the app can do.** Every empty state 190 verified is honest and every one of them points at this hole: Products says *"Import an invoice to fill your catalogue, or add one product by hand"*, and by-hand for 400 products is not an answer.

Requirements: a brand-new café can populate a usable catalogue without hand-typing it.

⚠️ **"THE INVOICE IMPORTER IS ALREADY THE ROUTE" IS THE OBVIOUS ANSWER AND IT IS WRONG AT ZERO — read this before planning, because 190 nearly recommended it and then measured it.** Traced through `invRowState` against an empty `ingredients` table:

- `invRowState` returns `'matched'` only when `r.bestId` resolves to an existing product. With **zero** products nothing can match, so **every line falls to `'review'`** by way of `if(!r.bestId) return 'review'`.
- The auto-tick rule (a hard rule in `CLAUDE.md`) pre-ticks **only** `'matched'` rows. So on the first import of a new café's life, **not one line is pre-ticked** and the importer's whole leverage — confirm a screenful at once — is absent exactly when it is needed most.
- Clearing a line means opening its add-new panel and settling **five** fields: name plus the four `NI_COMBOS` (`brand`, `cat`, `sup`, `king`). Gemini prefills four of them when the AI check is on (`AI_FIELD`), and **never `king`**, the kitchen word — so every line needs a human regardless.

**So a 60-line first invoice is 60 panels, and that is hand-typing wearing a different hat.** The importer is not broken and needs no fix for Scoopy's; it is simply designed around a catalogue that already exists.

### ✅ DECIDED, 14 Aug 2026 (Max) — a SUPPLIER EXPORT import, and the source was measured in his own account

Three shapes were put to him: a supplier file import, a starter catalogue, or a bulk "accept all as new" mode for the existing importer.

- **Bulk-accept is OUT, and it was the recommendation until he answered.** Asked whether a messy catalogue would be acceptable on day one, his answer was *"i dont think so it shouldnt really be messy that would be a turn off for customers."* Accepting invoice lines wholesale means AI-guessed names, brands and categories across every row, which is exactly that.
- **A shipped starter catalogue is OUT and should not be reopened.** Any realistic one would be built from Scoopy's data, which would publish a real café's supplier list and pricing to every stranger who installs EzPlate. See the repository-is-public section of `CLAUDE.md`.
- **A supplier export import is IN**, and 2b is why: Scoopy's own 393-product catalogue never came from invoices at all. Max downloaded a file from the supplier portal and had an LLM turn it into the products JSON, once. That is the bootstrap that actually happened, and it is clean by construction.

⚠️ **THE SOURCE FILE EXISTS AND ITS SHAPE WAS READ FROM THE LIVE PORTAL, 14 Aug 2026** — signed in as the café, in Chrome, read-only; nothing was downloaded and nothing was changed. **Do not go and re-derive this, and do not guess the columns.**

**Where it is:** the supplier portal's `Accounts → Reports → Previous purchases`, which has its own **Export** button and offers **up to 24 months of history**. A `Report exports` page sits beside it. The report has a **Standard** and an **Advanced** form; Advanced adds `ORDER BY: CUSTOMER / CATEGORY / PREFERRED` and subtotal rows, which is how a **category** is obtained — Standard has no category column.

**The Standard columns, in order:** `PRODUCT CODE · BRAND · DESCRIPTION · PACK SIZE · CTN QTY · UOM · QTY · LAST PRICE PAID · TOTAL EX GST · GST · TOTAL INCL GST · ACCOUNT`.

**Why that settles the design rather than merely informing it:** those columns carry **every input the app already computes a unit cost from**, so nothing has to be inferred and no model has to be asked. `PACK SIZE` + `UOM` + `CTN QTY` are exactly what `packToUnitCost` takes; `LAST PRICE PAID` is the price; `PRODUCT CODE` is a stable per-supplier id that makes re-importing an update rather than a duplicate; `BRAND` and `DESCRIPTION` map straight across. **This is a deterministic import with no AI in the path**, which is what makes it satisfy the not-messy requirement that killed bulk-accept — and it means the privacy gate below does **not** bind this item, because nothing here goes near `api/parse-invoice`.

Requirements when this is built:
- Import a supplier export and create products from it, deterministically. **No model in the path** — that is the property being bought.
- **Re-importing must UPDATE on `PRODUCT CODE`, never duplicate**, so the same file can be used to refresh prices later. Decide against `setProduct`, which is `ing_price_history`'s one writer — a bulk price refresh is a real price movement and belongs in that series, so **do not bypass it**; and read the `isFinite('')` trap before parsing a single number.
- ⚠️ **The format is one supplier's, and the item must not pretend otherwise.** Ask what happens for a café on a different supplier before designing the file picker: a named-format importer that says which formats it knows is honest, a "CSV importer" that silently assumes these column headings is not.
- Prove it against a real export end to end, and **do not commit the file or any row of it** — the repository is public.
### ✅ AND THE LAST OPEN QUESTION IS ANSWERED — market research, 14 Aug 2026, at Max's instruction

He was unsure whether the first release should read only this supplier's export or a generic CSV too, and asked for the market to be checked rather than the cheapest thing built. **The answer is BOTH, in one build, and the ordering matters:**

**Build the generic mapped importer FIRST, then ship the supplier export as a recognised preset on top of it.**

- **A column-mapping step is the industry norm, not a luxury.** Every serious tool imports a spreadsheet and has the user map their columns onto its fields; Restaurant365's own docs describe columns needing to be mapped to record rows. A fixed-template-only importer is below market.
- **Named supplier integrations are the PREMIUM tier and are per-supplier work.** MarketMan's supplier integrations (Sysco, Gordon, Performance Foodservice and others) auto-update prices, product codes and new items. That is the top end, it is sold as a differentiator, and it is one build per supplier — which is exactly why it cannot be the only path.
- **Onboarding speed is where the incumbents are weak, so it is the thing worth winning.** MarketMan quotes **2-3 weeks** to get running *with a dedicated onboarding team*, and the trade press calls building the item master the most labour-intensive phase of any implementation. A café that goes from signup to a costed catalogue in minutes, unattended, is a real competitive claim — and it is only true if the file it needs is one the café can already produce.
- **The Australian ecosystem is a genuine gap and also a trap.** US-built tools are described as missing it entirely, and the local competitor positions squarely on naming PFD, Bidfood and Holco. **But a preset per supplier does not scale**, so the presets must sit on a generic mapper rather than replace it.

⚠️ **"CSV/XLSX" IS NOT FREE, AND THE ITEM DOES NOT ACKNOWLEDGE IT — flagged by batch 192 reading this against `CLAUDE.md`, before building.** An `.xlsx` is a ZIP of XML and **cannot be parsed without a library**, which collides head-on with the standing rule: two third-party scripts ship today and *"adding a third needs Max's yes, not a judgement call."*
✅ **ANSWERED 14 Aug 2026 (Max): CSV ONLY** (`docs/decisions/2026-08-14-cafe-creation.md` q2, answer A). No third dependency. **The file picker accepts CSV and SAYS so** — it must not silently fail on a workbook, because "nothing happened" is the worst possible first minute of a new café's life. Adding XLSX later is a fresh yes, not an enhancement.
⚠️ **The supplier export's actual FORMAT was never recorded** — the columns were read from the portal, the download was not taken. **Confirm its Export offers CSV before building the preset**; if it only offers a workbook, that is a finding to bring back rather than a reason to add a library, and "save it as CSV first" is a legitimate one-line instruction in the UI.

**So the shape:** parse a CSV → detect a known header signature and pre-fill the mapping → otherwise ask the user to map, with the app's own fields named in plain words. The supplier export becomes zero-config for the common case, and a café on any other supplier is still served on day one. **This supersedes the earlier note in this item that a named-format importer was the honest option and a generic CSV was not** — the honest thing is a mapper that SHOWS the mapping it guessed and lets it be corrected, which is neither of the two things that were originally put to Max.

⚠️ **COMPETITIVE FACT FOUND WHILE RESEARCHING THIS, AND IT IS NOT ABOUT THE IMPORTER — READ IT BEFORE PLANNING ANY LAUNCH WORK.** The supplier's own portal ships **MyRecipes / Menu Planning**, a recipe-costing feature, free to account holders, and it is promoted on **live pricing** — the nav item is visible in the account this export was measured from. So the nearest competitor to EzPlate for its own first customer is **free, already installed, and has price data EzPlate cannot match without an integration.**
**That is not a reason to stop; it is a reason to know what the answer is.** The defensible ground is that it costs one supplier's products only, that a supplier's costing tool will never tell a café to buy elsewhere, and that EzPlate is multi-supplier by construction — **all of which argue for the generic mapper above rather than against it.** Whether any of that is worth building a business on is Max's call and nobody has put it to him yet.
⚠️ **Do not re-derive the zero state; 190 measured it.** `installBoot(page, {noProducts:true})` with clean storage is genuine zero and `tests/visual/v164-onboarding.spec.js` boots it. `Second Cafe (staging)` also holds zero rows on every table with `b@example.com` as its owner, so no seed needs running to get a real RLS-enforced zero.
⚠️ **The privacy gate binds this if the answer routes through `api/parse-invoice`** — a second café's invoices reaching Gemini's free tier is the exact thing that item forbids before launch.

## next  3 · The privacy gate  **[A — launch blocker]**

`CLAUDE.md` names this **the single most important thing to reopen before EzPlate serves anyone but Scoopy's.**
Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`. That tier **may use prompts for training**.
Max accepted this for his own café — his call, made — and **that acceptance does not extend to a second customer's data.**
Requirements: a paid-tier Google project that excludes training use, or a privacy policy that discloses it.
**Before the first non-Scoopy's row exists, not after.**

## next  4 · pdf.js 4.2.67+  **[A — launch blocker]**

3.11.174 carries CVE-2024-4367. Mitigated in v88 (`isEvalSupported:false`), not fixed. Theoretical while Max controls the PDFs, **real once strangers upload them.**
Requirements: multi-tenant launch gate. Invoice parsing must still work on the real invoice set afterwards. Both client third-party scripts stay pinned to an exact version with the `sha384` recomputed in the same commit (the worker is pinned only — `new Worker()` has no SRI).

## next  5 · Gate review before public signup  **[A — launch blocker]**

Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer. Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.
Do after: **the privacy gate** and **pdf.js 4.2.67+** — it is the read-through of the gates, not a substitute for them. *(`business_id` PART 2 struck from this line 13 Aug 2026 — shipped in batch 182.)*
⚠️ **Both of this item's standing lines are now ANSWERED, and what is left is the sign-off rather than the work.** `restore_backup` is still `SECURITY INVOKER` — verified live, 13 Aug 2026 — and under 182's policies that makes it tenant-scoped for free: a restore deletes and rewrites only the caller's own café, measured on staging. Since 187 it also refuses a non-owner outright. **The anon-key exposure is CLOSED** — 186's `20260814_mandatory_sign_in.sql` removed the anon branch from `current_business_id()`, so the key that ships in `index.html` reads nothing; verified over PostgREST on production, `null` tenant and zero rows on all four required tables. *(This paragraph said closing it was "the auth item's one-function change, and this review is where it gets signed off". The auth item is gone and the change shipped; the sign-off is still this item's.)*
**So what remains here is genuinely a REVIEW:** read the four gates end to end and say whether they hold together — Gemini's tier, the pdf.js version, rate limits and billing on the AI endpoints, and whether open API-level signup is acceptable now that a self-made account can see nothing.
⚠️ **Batch 191 added a FIFTH thing to read, and it is the only unauthenticated endpoint this app has ever deliberately shipped.** `invite_pending(email)` is callable by `anon` and answers whether some café has a pending invitation for an address. The disclosure is argued at length in `supabase/migrations/20260814_invitations.sql`'s header and is believed to be the smaller of the two available surfaces — but **nothing in this repo rate-limits it**, and Supabase's per-IP limits are the whole brake. Decide here whether that is acceptable, and say so either way. **192 made it REACHABLE**: the boot gate's sign-up form calls it on every attempt, so it is no longer a function nothing invokes — it is now the first thing an uninvited stranger's browser can ask this database, and the only rate limit on it is Supabase's per-IP one.

## next  6a · The backup does not carry three of the five history series  **[A — data integrity]**

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

## next  6b · The restore's full-wipe step (step 3)  **[A — data integrity]**

Do after: **`The backup does not carry three of the five history series`** — the item directly above, whatever number it currently wears. (It has now been renumbered NINE times: 10a → 11a when the mutation-testing gate took slot 1, back to 10a in 180 when that gate shipped and its slot freed, to 9a in 181, to 8a in 182 when the policy swap shipped, to 7a in 184 when `MENU_ORIGINAL` did, to 6a in 188 when the roles client half did, to 5a in that same batch when invitations went blocked, back to 6a when they were unblocked, to **7a in 191**, which both shipped an item above it AND inserted a new one, and back to **6a in 192** when the invitations client half shipped and its item was deleted. **Name it, never the number** — this line is the standing evidence for why, and every batch that ships an item above it adds one to that count. 184 also renumbered it WRONG on the first attempt, leaving `8a` sitting above a `7`, because a regex that renumbers `## next  N` silently skips `Na` — so the lettered pair is not merely awkward to cite, it is awkward to MOVE.) — the whole point of the wipe is to prove the backup restores everything, and today it demonstrably does not. Running it first would either lose 148 rows of real history or prove less than the item claims.

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

## next  7 · Floating layers and mobile dropdowns  **[B]**

Dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying. **Usable one-handed on a 380px phone** is the requirement, on the device Max actually works on.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** (v119 review). `anchorDrop` / `dropPlace` / `dropBox` is ONE shared engine reused across several call sites; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely. **Count them properly before planning off the number** — every enumeration in this project has come back different from the guess.
Requirements: one placement implementation.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`, so every layout a dropdown opens over is now converted and placement can be done once.)*

## next  8 · Onboarding — the empty-state decisions 190 did not take  **[B]**

**What is left of the onboarding item after batch 190**, kept as B rather than A because both are judgement calls about wording and neither blocks anyone.

⚠️ **190 measured every screen at genuine zero — nine panes, 380 and 1280, light and dark — and the headline claim was already mostly built.** The v58 empty-state system (`emptyStateHtml` / `emptySearchState`) already gives Products, Ingredients, Plates, Menu, Dashboard and Invoices a real true-empty state with a CTA; Settings and Account render fine; and at zero plates the Add-dish picker says *"No costed plates found. Build and save a plate first."* — honest, with no dead control. **Do not re-audit that; look only at what is below.**

Two things a reader could reasonably call wrong, both cosmetic:

- **The Menu screen offers "Existing plate" at zero plates**, and at 380 it wraps onto its own row under the header and reads as an orphan. It is not broken — the modal it opens explains itself — but it is a control offered before it can do anything.
- **The six empty states have never been read end to end as one sequence.** Each was written by the batch that built its screen, months apart; nobody has read all six together to ask whether a new café is being told the same story in the same words, or six unrelated ones. Screenshots of all nine panes at zero are cheap to retake — see the spec named above.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
