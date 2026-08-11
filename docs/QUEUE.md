# Queue

Worked top to bottom by `/batch`. Position is priority. Max adds problems, not briefs: what is wrong, and what must be true when it is fixed.
**Tier test — if we launched to paying customers tomorrow, would this item stop us, embarrass us, or hurt them?** **A** = launch is impossible or unsafe without it. **B** = a real person using the app would see something wrong, broken or half-finished. **C** = everything else → `docs/MAINTENANCE.md`, worked only when this file is empty. **Ambiguous is C.**
**Capped at 20 items.** A new A or B displaces the lowest-priority item here into maintenance; it never extends the file.
**`Blocked on:`** = waiting on a person or an outside thing — `/batch` skips it. **`Do after:`** = waiting on another item in this file, and it is DELETED the moment it is satisfied.
**`project-audit` reports; it does not add queue items.** A finding from a batch defaults to C unless it passes the tier test. Nothing about the process itself belongs here.

---

# Phase law — the v3 fold-in (F8-F10)

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

## blocked  1 · One action in a mobile screen header — rehome the second one (DECIDED 10 Aug 2026)  **[B]**

§6's mobile header is "screen title + one action max", and three converted screens ship two.
- **Ingredients (F3):** "Set up from products" beside "New ingredient". Conditional (`renderKingProgress`), so most cafés see one — but Scoopy's catalogue has hundreds of unlinked products, so Max sees two.
- **Products (F4):** "Import invoice" beside "New product", and here it is UNCONDITIONAL. ⚠️ **Its justification EXPIRED in 171** and the replacement is weaker, so do not read the old one as still standing: it used to be that the sidebar's Invoices entry was desktop-only and `#importBtn` was therefore the ONLY phone route into the import flow. More → Invoices is now a second phone route, so keeping it is a shortcut on the screen the import lands in, not a stranding argument. It was deliberately NOT removed in 171 — taking one screen's secondary away first would answer this item by deletion, for one screen, which is the opposite of the requirement below.
- **Menu (F5):** "Existing plate" beside "New menu". The mock's own mobile header carries NEITHER — it is menu name + food-cost pill + "Switch ▾" — and F5 took that trio into the control row beneath (R5) rather than answering this a third way.
Hiding either on mobile was rejected both times: it strands a whole flow on the device Max actually works on.
**DECIDED (Max, 10 Aug 2026): find another home for the second action.** He did NOT take the recommendation to keep both. §6's "one action max" holds on a phone; the header keeps only the primary.
Requirements: ONE home used by every screen — they are one question and must not get three answers. The secondary must stay reachable on a phone in one gesture. **The mock has no pattern for this, so the first job is to PROPOSE one and get a yes before building** — a candidate is not a decision.
⚠️ The mock's desktop label "Add existing plate" WRAPS the 380px header onto two lines; the app's shorter "Existing plate" stays. Two actions is a deviation; a WRAPPED header is a defect, and the two were one keystroke apart. The pair is pinned at both widths in `tests/visual/v140-products.spec.js` and at desktop in `fresh-states.spec.js` — both pins are consciously changed by whoever builds this, never deleted to go green. `tests/visual/v151-more.spec.js` adds a third at 380 and 430, and it is the one that measures a WRAP directly rather than the pair's positions.
⚠️ **MEASURED 11 Aug 2026 (171): two of these headers already wrap at 360px, and this item is the fix for both.** On `main`, before 171, **Ingredients** measured 121px tall at 360 against the one-row 69 — the "Set up from products" pair, with Scoopy's unlinked catalogue making it visible. 171 added a "‹ More" back chevron to Products and that header now wraps at 360 too. **The chevron is not the cause and shrinking it is not the fix**: it costs 30px, the second action costs 72–130px, and no amount of chevron trimming makes a two-action header fit 360. **360 is not a width anything in this repo has ever tested** — every mobile assertion is at 380 and the mock's reference is 390 — so 171 deliberately left it, rather than inventing a support width and engineering a hit-area workaround that would still have left Ingredients broken there. Rehoming the second action reclaims 72–130px and resolves both screens at once. **Decide as part of this item whether 360 becomes a supported width; if it does, add it to the three specs above. Answer it here, do not route it onward.**
Out of scope: the desktop headers, which the mock does allow to carry both.

### MEASURED AND PROPOSED 11 Aug 2026 (batch 172) — awaiting Max's yes

Measured in Playwright against the fixture, with `#kingWizBtn` forced visible because that is what Scoopy's unlinked catalogue does to it (`renderKingProgress` sets `wb.style.display=''`). Header height, one row = 69px:

| screen | 360 | 380 | 430 |
|---|---|---|---|
| Ingredients | **wraps, 121** | **wraps, 121** | 69 |
| Products | **wraps, 121** | 69 | 69 |
| Menu | 69 | 69 | 69 |

⚠️ **THE ITEM UNDERSTATED THIS: Ingredients wraps at 380, not only at 360.** 380 is the width every mobile assertion in this repo uses, so this is not a question about adopting an untested width — it is a **live defect on Max's phone at a supported one**. It is invisible to the suite because the fixture leaves `#kingWizBtn` hidden, and Max's data never does. The `.btn-noun` collapse that `js/app.js` says exists so "the pantry pair fits one line" is already applied at that width and is **not enough**: "New ingredient" is 147px against Products' "New product" at 130, which is the whole difference between the two screens.
Menu does not wrap at any of the three widths — its pair measures 121 + 113 against a 40px title — so **Menu is in this item for consistency, not for a defect.**

**Proposed home: the existing `.plib-controls` row directly beneath the header, mobile only (≤767). Desktop headers keep both, unchanged.**
The argument is that **F5 already chose this home for this exact question and said so at the site.** `#menuSwitchRow`'s R5 comment reads: *"that header slot is taken by the shared `.scr-head`, whose 'one action max on a phone' question is ONE queued item and must not be answered per screen — so the mock's trio lands here instead, one line lower."* All three screens already have such a row as their first child after `.scr-head`. So this is not a new pattern being invented against a mock that has none — it is finishing the one the app already started, which is the cheapest way to satisfy "ONE home used by every screen".
It is one gesture (visible on screen, one tap), it needs **no floating layer** — which matters because *Floating layers and mobile dropdowns* is still open below and any header overflow menu would be built twice — and it reclaims 72–130px, which resolves Ingredients at 380 and both screens at 360.
Known cost, stated honestly: the row is read as filters on Products and Ingredients, and this puts an action in it. Products' row already measures **2 rows / 112px at every width including 430**, so it absorbs a fourth member without a new structural row; Ingredients' and Menu's may gain one.

Runner-up if that cost is judged too high: **a dedicated one-line mobile action row of its own class between `.scr-head` and `.plib-controls`.** Unambiguous and it never muddles actions with filters, but it costs ~44px of vertical space on every affected screen where the recommendation often costs none.
Rejected: **an overflow "⋯" in the header** — two taps, so it fails this item's own one-gesture requirement, and it needs the layer system that is still queued. **The screen footer** (where F5 rehomed "Delete this menu") — needs a scroll past the whole list. **Dropping the secondary on mobile** — already rejected twice.

**And the 360 question, answered here as the item instructs:** recommend **yes, 360 becomes a supported width**, added to all three specs — because after this change every mobile header is title + one action, which fits 360 with room (Products' worst case is chevron 22 + title 65 + "New product" 130), so supporting it costs nothing beyond the assertions and it is what pins the fix.

Blocked on: **Max's yes to the proposed home** — the item requires a pattern be proposed and agreed before it is built, and a candidate is not a decision. Recommendation above is the `.plib-controls` row, mobile only.

## next  2 · Unique ID generation — the SEMANTIC KEYS half  **[A — launch blocker]**

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

## next  3 · Supabase Auth — the REMAINDER  **[A — launch blocker]**

⚠️ **REWRITTEN 12 Aug 2026 (174). Email/password sign-in SHIPPED as `ezplate-v154`; three pieces are left and one of them is Max's.**

**What shipped.** Real `signInWithPassword` / `signOut` on the Account screen's Profile card, session restored on boot, and a change of user purging local state through the same `purgeLocalState` the environment fence uses — one rule, not two. The initial session event deliberately never purges, because `onAuthStateChange` fires `INITIAL_SESSION` on every load and treating that as a switch would wipe the plate draft on every boot.
**It gates nothing, on purpose.** Every RLS policy is still `using (true)` for `public`, so a signed-in session sees exactly what a signed-out one sees; `tests/auth.test.js` pins that nothing consults `authUser`. Gating before isolation exists would lock the door on a building with no walls.

**What is LEFT:**
- **Google sign-in.** Needs a Google Cloud OAuth client id and secret pasted into the Supabase dashboard, which is **Max's to do** — no code can create it. The client call is two lines once it exists. It was listed as "optional" and stays optional.
- **Making an account mean something.** Until RLS distinguishes tenants, signing in is a no-op with a real session behind it. That is the `business_id` item, not this one.
- **Opening sign-up.** There is deliberately no sign-up path: the anon key ships in `index.html`, so anyone reading the page already has the access an account would grant, and a form would advertise it. Accounts are made in the Supabase dashboard until RLS closes that gap. ⚠️ **Supabase sign-ups are open by default at the API level regardless**, which is not made worse by this item but IS part of the gate review.
- **Email confirmation is ON**, found while rehearsing: an account created without confirmation cannot sign in ("Email not confirmed"). A dashboard-created account must be marked confirmed, or the first real sign-in fails in a way that looks like a wrong password.

Do after: **`business_id` PART 2, the policy swap** — for the second bullet only; the Google half needs nothing but Max, and could ship any time he creates the OAuth client.

## next  4 · `business_id` on every table — **PART 1, the additive half**  **[A — launch blocker]**

⚠️ **SPLIT 12 Aug 2026 (174), on reaching it and finding it too large for one reviewable PR.** Ten tables × (column + backfill + index), plus a `businesses` table, plus a membership table, plus thirteen policy rewrites, plus client changes, plus per-table client verification is not one change set — and the second half is the dangerous one, so bundling them means the safe work cannot be merged until the risky work is finished.

**Part 1 is ADDITIVE ONLY and changes no behaviour.** Nothing here can make the app show less data, because no policy is touched:
- a `businesses` table with ONE row for Scoopy's, and a `business_members` table mapping `auth.uid()` to a business (auth shipped in 174, so `auth.uid()` is real now — but **no account has to exist yet**, and Part 1 must not require one);
- `business_id` on all ten public tables, **nullable, with a DEFAULT of the single seeded business** — the default is what stops rows written by today's client from arriving NULL and silently falling outside the Part 2 policies;
- a backfill of every existing row to that business;
- an index on each `business_id`.
Requirements: staging first with `04-seed-scale.sql` loaded, then production; the two schemas must match on the `docs/STAGING.md` fingerprint afterwards; the one-statement rollback (drop the columns and the two tables) written into the migration header. Verify as the client that **nothing changed** — same row counts, same reads, writes still succeed.
Out of scope, deliberately: any policy change, any client change, and roles.

## next  5 · `business_id` — **PART 2, the policy swap**  **[A — launch blocker]**

Replace all thirteen `using (true)` policies with `business_id`-scoped ones, one table at a time, and make the client send `business_id` on insert.
⚠️ **This is the half that can empty the app.** RLS with no matching policy returns **200 and an empty array, not an error**, so a mistake here looks exactly like "all my data is gone" — and on production that is Max's café. Every table is verified AS THE CLIENT over PostgREST before the next one starts.
⚠️ **What staging still cannot rehearse:** neither project has more than one user, so these policies can be proved to RUN and to let the right rows through — not that a second tenant is correctly EXCLUDED. That needs two accounts and belongs to the first real multi-tenant test.
Do after: **`business_id` PART 1** — the column, the default and the backfill must exist and be proven before anything keys off them, or the first policy applied locks the client out of a table whose rows have no owner yet.

### Notes shared by both `business_id` parts

Requirements: staged, one table at a time, each migration verified before the next.
⚠️ **RLS with no matching policy returns 200 and an empty array, not an error — a policy mistake looks exactly like "no data".** And an anon UPDATE or DELETE returns 204 with no error and touches nothing, so **verify AS THE CLIENT over PostgREST with `Prefer: return=representation`**, never through the MCP, which bypasses RLS entirely.
Note **`menus` no longer starts from RLS OFF** — corrected 8 Aug 2026 when `20260808_menus_rls.sql` was applied. All **ten** public tables now have RLS on with at least one policy, so no table needs ENABLING as well as policying; they all need their permissive `using (true)` policy REPLACED with a `business_id` one. *(Was "eleven" until 172; `20260809_drop_kitchen_items.sql` had already made it ten and the count was never updated. Counted against the live catalogue, not inferred.)*
✅ **Rehearsable as of 172** — `supabase/staging/01-schema.sql` reproduces all thirteen policies under production's exact policy NAMES, which is what this item will look them up by. Rehearse each table's swap there first; `docs/STAGING.md` has the procedure and the fingerprint query that proves the two schemas still match afterwards.
⚠️ **What staging CANNOT rehearse here, stated so it is not over-trusted:** neither project has any users, so `anon` is the only role either has ever been exercised as. This item's policies are the first that will distinguish roles, and staging can prove they RUN and that the client sees what it should — not that a second tenant is correctly excluded, which needs auth first.

## next  6 · Roles — owner vs staff  **[A — launch blocker]**

The app currently tells staff "owner and staff access is already planned" while nothing is built. **That copy ships or comes out.**
**DECIDED (Max, 9 Aug 2026): TWO roles — owner + working staff.** Staff import invoices and edit ingredients/plates; staff cannot delete plates or menus, change the target, restore backups, or touch billing. No manager role unless a real person at a real café needs one later.
Do after: **`business_id` PART 2, the policy swap** — roles are enforced in the same policies, so they are written once or twice.

## next  7 · Onboarding and empty states  **[A — launch blocker]**

Every screen at zero, which production has never shown.
**Including how a new café gets a product catalogue at all** — named explicitly because "bulk catalogue bootstrap" was inside this item by implication only, and an implied requirement is one nobody builds. Scoopy's catalogue arrived over months of invoice imports; a second café starting from an empty `ingredients` table has no such history, and an empty catalogue means no ingredients, so no plates, so nothing the app can do.
**Fix here, because it is only reachable at zero:** the zero-ingredients builder hint is an **UNSTYLED link** — `catalogueHintHtml()` in `js/app.js` emits `No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>`, and `css/style.css` has **no anchor colour rule anywhere**, so it renders browser-default blue: near-illegible on the dark surface, and wrong in light too. One rule fixes it. It is the first thing a brand-new café sees.
⚠️ **It has TWO homes and you must style both, or the fix works on one screen and not the other** (170): `renderPlate` puts it inside `#lines`' `.bld-empty` when the plate is empty, and in `#builderHint` when the plate has lines but the catalogue is empty. Never both at once. **Cited by function name on purpose — this item carried `js/app.js:820` and the line had already drifted before 170 moved the code.**
✅ **Testable as of 172.** This item is only reachable at zero and production is never empty, which is why it could not be started before. `supabase/staging/02-seed-empty.sql` now produces exactly that state — every table empty INCLUDING `app_settings`, so there are no kitchen words either, which is the only honest zero. Point the app at it with `?env=staging`; `docs/STAGING.md` has the procedure.

## next  8 · The privacy gate  **[A — launch blocker]**

`CLAUDE.md` names this **the single most important thing to reopen before EzPlate serves anyone but Scoopy's.**
Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`. That tier **may use prompts for training**.
Max accepted this for his own café — his call, made — and **that acceptance does not extend to a second customer's data.**
Requirements: a paid-tier Google project that excludes training use, or a privacy policy that discloses it.
**Before the first non-Scoopy's row exists, not after.**

## next  9 · pdf.js 4.2.67+  **[A — launch blocker]**

3.11.174 carries CVE-2024-4367. Mitigated in v88 (`isEvalSupported:false`), not fixed. Theoretical while Max controls the PDFs, **real once strangers upload them.**
Requirements: multi-tenant launch gate. Invoice parsing must still work on the real invoice set afterwards. Both client third-party scripts stay pinned to an exact version with the `sha384` recomputed in the same commit (the worker is pinned only — `new Worker()` has no SRI).

## next  10 · Gate review before public signup  **[A — launch blocker]**

Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer. Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.
Do after: **`business_id` PART 2, the policy swap**, **the privacy gate** and **pdf.js 4.2.67+** — it is the read-through of the gates, not a substitute for them.

## blocked  11 · The restore's full-wipe step (step 3)  **[A — data integrity]**

Steps 1 and 2 of the v110 destructive plan were run and passed. **Step 3 — restoring into a genuinely EMPTY database — never was.**
What it would newly prove is narrow: that an empty table restores as well as a populated one, and how the boot gate reads mid-restore against nothing.
Requirements: a fresh export taken minutes before, and **Max's explicit go on the day**. Destructive against real data.
**SCHEDULED (Max, 9 Aug 2026): runs when the v3 fold-in phase finishes, before any multi-tenant work.** The batch that closes the phase prepares everything and asks for the go.
⚠️ **Corrected 11 Aug 2026: this read "(items 1-5)", which was a POSITION and had already drifted** — F8 and F9 shipping moved every number under it, so "items 1-5" now points at four items that are not the fold-in at all. **The phase finishes when `F10 — Account` and `The mobile More screen` have both shipped** — the More screen included, because §6.1's parity map is unmet by construction without it and this file says so at that item. Name them; never re-number this.
**BOTH HAVE NOW SHIPPED** — F10 as `ezplate-v149` and `The mobile More screen` as `ezplate-v151`, both on 11 Aug 2026 — so **the phase is closed and this item is DUE NOW**, by its own scheduling. The next batch to reach it prepares everything (a fresh export taken minutes before, the one-statement rollback written down) and asks Max for the go on the day. It stays `blocked` only on that go.
✅ **REHEARSED ON STAGING, 172.** The step itself has now been performed somewhere: staging was emptied with `02-seed-empty.sql` and `restore_backup` was called into it **as the anon client over PostgREST**, returning identical counts to the populated case, every dish linked to its plate, plates inserted with `menu_id` null, and **zero rows with a null plate link** — the signature of the failure that once cost 76 of 77 dishes. Both refusal paths fired by name (format `1`; a missing `ing_price_history`).
**This does NOT discharge the item and must not be read as doing so.** It was synthetic data in a different project, and what is still untested is the half that only production has: a real 412-product export, the real file size through the RPC's 30s `statement_timeout`, and how the boot gate reads mid-restore. What it does mean is that the step is no longer being attempted for the first time on real data.
When Max gives the go: take a fresh export minutes before, write the one-statement rollback into the item, run `02` then the real backup against staging first as a dress rehearsal, then production. `docs/STAGING.md` has the procedure.
Blocked on: Max's go on the day. The timing question is answered; this is not an open ask.

## next  12 · Floating layers and mobile dropdowns  **[B]**

Dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying. **Usable one-handed on a 380px phone** is the requirement, on the device Max actually works on.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** (v119 review). `anchorDrop` / `dropPlace` / `dropBox` is ONE shared engine reused across several call sites; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely. **Count them properly before planning off the number** — every enumeration in this project has come back different from the guess.
Requirements: one placement implementation.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`, so every layout a dropdown opens over is now converted and placement can be done once.)*

## next  13 · Dashboard trend polish — the x-axis and the third accent hue  **[B]**

- **The chart has no x-axis at any range.** Measured: the only `<text>` elements are four y-axis ticks. **This is a deviation from the mock, which also draws none** — so it is a decision, not a fix, and the argument for it is that a trend chart whose x-axis is unlabelled cannot be read against the range control that governs it. ⚠️ The scrub tooltip already carries the full sentence including the date, so the gap is partly covered on hover and **not at all on a phone**. (The annotation half shipped in v145: the label reads "−2 pts", the subject stays in the caption.)
- **Three accent hues in one section — DECIDED 10 Aug 2026: restyle the range pill.** The chart line is `--good`/`--bad` by target, the intervention markers are `--accent` orange, and the active range pill is `--accent-weak`/`--accent-ink` orange, so a healthy section shows green line + orange marker + orange pill. **The markers STAY orange and that is the load-bearing half** — they mean "you did this" while the line means "here is where you stand against target", and the two must never share a hue (§8 reserves green/amber/red for cost semantics). The range control is a button, not data, so it is the one that stops competing. Requirements: the active state must still be unambiguous at a glance. Out of scope: the markers, and the chart line's target anchoring.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
