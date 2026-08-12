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

## next  1 · Unique ID generation — the SEMANTIC KEYS half  **[A — launch blocker]**

⚠️ **REWRITTEN 12 Aug 2026 (173). The surrogate-id half SHIPPED as `ezplate-v153`; what is left is a different problem with a different fix, and the original item conflated the two.**

**What shipped (173).** Every id the client mints for a surrogate primary key — plates `SP`, dishes `um`, menus `MENU`, custom products `CX` and `U`, change-log entries `CL` — now goes through one `uid()` in `js/app.js`: prefix + timestamp + an in-session counter + 8 base-36 characters of `crypto` entropy. The counter guarantees uniqueness inside one session deterministically (the invoice importer mints several ids in one millisecond); the random block is what separates two ACCOUNTS, where two counters know nothing about each other.
**No migration was needed, and that was the finding rather than a shortcut.** A new id always contains `-` and the old format never did, so the two sets are disjoint by construction: Scoopy's existing rows cannot be collided with, and rewriting every live id — chasing references inside plate-line JSONB, the history tables and the change log — was avoided entirely. `tests/unique-ids.test.js` pins that disjointness, because it is the claim the safety rests on.

**What is LEFT, and why it is not the same job.** These four are **names the code looks things up by**, not surrogate ids, so randomising them breaks the lookup instead of fixing the collision:
- **The nine `app_settings` keys** (`food_cost_target`, `gst_default`, `kitchen_ingredients`, …). `key` is the primary key and the literals are shared by every account, so two cafés collide on the first write. Only tenant scoping fixes this.
- **`supplier_phrases.id = memKey(supplier, phrase)`** — content-derived **on purpose**: it is what makes re-teaching the same pack UPDATE one row instead of duplicating it. Randomising it would break taught-pack dedupe, which `CLAUDE.md` lists as a fragile area. The fix is to prefix the tenant, keeping the content-addressing *within* an account.
- **`K0001`** from `nextKid()`. Kitchen ids live INSIDE the `kitchen_ingredients` blob, so they are not a global namespace at all and inherit whatever `app_settings` gets.
- **`MENU_ORIGINAL`** from `ensureDefaultMenu`. `menus.id` IS a global key, so this genuinely collides — but the literal appears **28 times across 26 lines of `js/app.js`** as the fallback for a null `menu_id` (one of those lines is the pointer comment in `uid`, so the real work is 27), so changing the seed means replacing every one of those with a dynamic lookup (`fallbackMenuId()` already exists and is the shape to use). That is a real piece of work and it is why this was not bundled into 173.

Requirements: every one of the four is scoped so two accounts cannot collide, with the supplier-phrase content-addressing preserved within an account, and the `MENU_ORIGINAL` fallbacks replaced rather than left pointing at a menu a new café does not have.
Do after: **`business_id` PART 2, the policy swap** — all four fixes are "prefix or compose the key with the tenant", and the tenant column does not exist yet. Doing it first would mean inventing a placeholder tenant and then rewriting all four again once the real column lands, which is the same work twice. *(This ordering is the opposite of what the queue assumed when it called this item "first of the A items because every other multi-tenant table change inherits it" — true of the surrogate ids, which have now shipped independently, and false of the semantic keys.)*
✅ Rehearsable on staging when it runs — `docs/STAGING.md` has the procedure, and `04-seed-scale.sql` carries 60 taught packs and a full settings blob to rehearse against.

## next  2 · Supabase Auth — the REMAINDER  **[A — launch blocker]**

⚠️ **REWRITTEN 12 Aug 2026 (174). Email/password sign-in SHIPPED as `ezplate-v154`; three pieces are left and one of them is Max's.**

**What shipped.** Real `signInWithPassword` / `signOut` on the Account screen's Profile card, session restored on boot, and a change of user purging local state through the same `purgeLocalState` the environment fence uses — one rule, not two. The initial session event deliberately never purges, because `onAuthStateChange` fires `INITIAL_SESSION` on every load and treating that as a switch would wipe the plate draft on every boot.
**It gates nothing, on purpose.** Every RLS policy is still `using (true)` for `public`, so a signed-in session sees exactly what a signed-out one sees; `tests/auth.test.js` pins that nothing consults `authUser`. Gating before isolation exists would lock the door on a building with no walls.

**What is LEFT:**
- **Google sign-in.** Needs a Google Cloud OAuth client id and secret pasted into the Supabase dashboard, which is **Max's to do** — no code can create it. The client call is two lines once it exists. It was listed as "optional" and stays optional.
- **Making an account mean something.** Until RLS distinguishes tenants, signing in is a no-op with a real session behind it. That is the `business_id` item, not this one.
- **Opening sign-up.** There is deliberately no sign-up path: the anon key ships in `index.html`, so anyone reading the page already has the access an account would grant, and a form would advertise it. Accounts are made in the Supabase dashboard until RLS closes that gap. ⚠️ **Supabase sign-ups are open by default at the API level regardless**, which is not made worse by this item but IS part of the gate review.
- **Email confirmation is ON**, found while rehearsing: an account created without confirmation cannot sign in ("Email not confirmed"). A dashboard-created account must be marked confirmed, or the first real sign-in fails in a way that looks like a wrong password.

Do after: **`business_id` PART 2, the policy swap** — for the second bullet only; the Google half needs nothing but Max, and could ship any time he creates the OAuth client.

## next  3 · `business_id` — **PART 2, the policy swap**  **[A — launch blocker]**

Replace all thirteen `using (true)` policies with `business_id`-scoped ones, one table at a time, and make the client send `business_id` on insert.
⚠️ **This is the half that can empty the app.** RLS with no matching policy returns **200 and an empty array, not an error**, so a mistake here looks exactly like "all my data is gone" — and on production that is Max's café. Every table is verified AS THE CLIENT over PostgREST before the next one starts.
⚠️ **What staging still cannot rehearse:** neither project has more than one user, so these policies can be proved to RUN and to let the right rows through — not that a second tenant is correctly EXCLUDED. That needs two accounts and belongs to the first real multi-tenant test.
*(`Do after: business_id PART 1` DELETED 13 Aug 2026 — PART 1 shipped in batch 181 as `20260813_business_id_part1.sql`, applied to staging and production, ten tables carrying the column with zero null rows. **Read its header before writing PART 2**: the tenant is filled by a BEFORE INSERT trigger as well as a column DEFAULT, and PART 2 replaces that function's BODY with a membership lookup rather than deleting the triggers.)*

### Notes shared by both `business_id` parts

Requirements: staged, one table at a time, each migration verified before the next.
⚠️ **RLS with no matching policy returns 200 and an empty array, not an error — a policy mistake looks exactly like "no data".** And an anon UPDATE or DELETE returns 204 with no error and touches nothing, so **verify AS THE CLIENT over PostgREST with `Prefer: return=representation`**, never through the MCP, which bypasses RLS entirely.
Note **`menus` no longer starts from RLS OFF** — corrected 8 Aug 2026 when `20260808_menus_rls.sql` was applied. All **ten** public tables now have RLS on with at least one policy, so no table needs ENABLING as well as policying; they all need their permissive `using (true)` policy REPLACED with a `business_id` one. *(Was "eleven" until 172; `20260809_drop_kitchen_items.sql` had already made it ten and the count was never updated. Counted against the live catalogue, not inferred.)*
✅ **Rehearsable as of 172** — `supabase/staging/01-schema.sql` reproduces all thirteen policies under production's exact policy NAMES, which is what this item will look them up by. Rehearse each table's swap there first; `docs/STAGING.md` has the procedure and the fingerprint query that proves the two schemas still match afterwards.
⚠️ **What staging CANNOT rehearse here, stated so it is not over-trusted:** neither project has any users, so `anon` is the only role either has ever been exercised as. This item's policies are the first that will distinguish roles, and staging can prove they RUN and that the client sees what it should — not that a second tenant is correctly excluded, which needs auth first.

## next  4 · Roles — owner vs staff  **[A — launch blocker]**

The app currently tells staff "owner and staff access is already planned" while nothing is built. **That copy ships or comes out.**
**DECIDED (Max, 9 Aug 2026): TWO roles — owner + working staff.** Staff import invoices and edit ingredients/plates; staff cannot delete plates or menus, change the target, restore backups, or touch billing. No manager role unless a real person at a real café needs one later.
Do after: **`business_id` PART 2, the policy swap** — roles are enforced in the same policies, so they are written once or twice.

## next  5 · Onboarding and empty states  **[A — launch blocker]**

Every screen at zero, which production has never shown.
**Including how a new café gets a product catalogue at all** — named explicitly because "bulk catalogue bootstrap" was inside this item by implication only, and an implied requirement is one nobody builds. Scoopy's catalogue arrived over months of invoice imports; a second café starting from an empty `ingredients` table has no such history, and an empty catalogue means no ingredients, so no plates, so nothing the app can do.
**Fix here, because it is only reachable at zero:** the zero-ingredients builder hint is an **UNSTYLED link** — `catalogueHintHtml()` in `js/app.js` emits `No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>`, and `css/style.css` has **no anchor colour rule anywhere**, so it renders browser-default blue: near-illegible on the dark surface, and wrong in light too. One rule fixes it. It is the first thing a brand-new café sees.
⚠️ **It has TWO homes and you must style both, or the fix works on one screen and not the other** (170): `renderPlate` puts it inside `#lines`' `.bld-empty` when the plate is empty, and in `#builderHint` when the plate has lines but the catalogue is empty. Never both at once. **Cited by function name on purpose — this item carried `js/app.js:820` and the line had already drifted before 170 moved the code.**
✅ **Testable as of 172.** This item is only reachable at zero and production is never empty, which is why it could not be started before. `supabase/staging/02-seed-empty.sql` now produces exactly that state — every table empty INCLUDING `app_settings`, so there are no kitchen words either, which is the only honest zero. Point the app at it with `?env=staging`; `docs/STAGING.md` has the procedure.

## next  6 · The privacy gate  **[A — launch blocker]**

`CLAUDE.md` names this **the single most important thing to reopen before EzPlate serves anyone but Scoopy's.**
Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`. That tier **may use prompts for training**.
Max accepted this for his own café — his call, made — and **that acceptance does not extend to a second customer's data.**
Requirements: a paid-tier Google project that excludes training use, or a privacy policy that discloses it.
**Before the first non-Scoopy's row exists, not after.**

## next  7 · pdf.js 4.2.67+  **[A — launch blocker]**

3.11.174 carries CVE-2024-4367. Mitigated in v88 (`isEvalSupported:false`), not fixed. Theoretical while Max controls the PDFs, **real once strangers upload them.**
Requirements: multi-tenant launch gate. Invoice parsing must still work on the real invoice set afterwards. Both client third-party scripts stay pinned to an exact version with the `sha384` recomputed in the same commit (the worker is pinned only — `new Worker()` has no SRI).

## next  8 · Gate review before public signup  **[A — launch blocker]**

Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer. Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.
Do after: **`business_id` PART 2, the policy swap**, **the privacy gate** and **pdf.js 4.2.67+** — it is the read-through of the gates, not a substitute for them.

## next  9a · The backup does not carry three of the five history series  **[A — data integrity]**

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
- ⚠️ **The wire `format` declares what the PAYLOAD CONTAINS, not which build sent it.** Send 4 only when there is something new to carry, exactly as the existing `chg.length?3:2` does, or every restore breaks between the client shipping and the migration being applied.
- Rehearse on staging first per `docs/STAGING.md`, then production.
- ⚠️ **Both tables now carry `business_id` (batch 181), so your new inserts must not reintroduce it as NULL.** The existing `select *` inserts get away with it only because a `BEFORE INSERT` trigger fills the column — a column DEFAULT alone does NOT survive `jsonb_populate_recordset`, which turns an absent JSON key into an explicit NULL. Your two new inserts should name their columns anyway, as the `ing_price_history` one already does, and **`pointToRow` must keep naming no column of its own** so the server stays the only thing that decides the tenant. Decide it here against `20260813_business_id_part1.sql`'s header; **answer it here, do not route it onward.**

✅ **A verified format-3 export is already on disk: `~/Downloads/ezplate-backup-2026-08-12.json`** — 412 products, 79 plates, 76/76 dishes linked, taken and checked 12 Aug 2026. It is the recovery file for the wipe, and it is also the format-3 fixture for proving 4 stays backward compatible.

## next  9b · The restore's full-wipe step (step 3)  **[A — data integrity]**

Do after: **`The backup does not carry three of the five history series`** — the item directly above, whatever number it currently wears. (It has now been renumbered THREE times: 10a → 11a when the mutation-testing gate took slot 1, and back to 10a in 180 when that gate shipped and its slot freed. **Name it, never the number** — this line is the standing evidence for why.) — the whole point of the wipe is to prove the backup restores everything, and today it demonstrably does not. Running it first would either lose 148 rows of real history or prove less than the item claims.

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

## next  10 · Floating layers and mobile dropdowns  **[B]**

Dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying. **Usable one-handed on a 380px phone** is the requirement, on the device Max actually works on.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** (v119 review). `anchorDrop` / `dropPlace` / `dropBox` is ONE shared engine reused across several call sites; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely. **Count them properly before planning off the number** — every enumeration in this project has come back different from the guess.
Requirements: one placement implementation.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`, so every layout a dropdown opens over is now converted and placement can be done once.)*

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
