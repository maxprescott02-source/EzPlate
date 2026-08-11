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
- **`MENU_ORIGINAL`** from `ensureDefaultMenu`. `menus.id` IS a global key, so this genuinely collides — but the literal appears **25 times in `js/app.js`** as the fallback for a null `menu_id`, so changing the seed means replacing every one of those with a dynamic lookup (`fallbackMenuId()` already exists and is the shape to use). That is a real piece of work and it is why this was not bundled into 173.

Requirements: every one of the four is scoped so two accounts cannot collide, with the supplier-phrase content-addressing preserved within an account, and the `MENU_ORIGINAL` fallbacks replaced rather than left pointing at a menu a new café does not have.
Do after: **`business_id` on every table, plus RLS** — all four fixes are "prefix or compose the key with the tenant", and the tenant column does not exist yet. Doing it first would mean inventing a placeholder tenant and then rewriting all four again once the real column lands, which is the same work twice. *(This ordering is the opposite of what the queue assumed when it called this item "first of the A items because every other multi-tenant table change inherits it" — true of the surrogate ids, which have now shipped independently, and false of the semantic keys.)*
✅ Rehearsable on staging when it runs — `docs/STAGING.md` has the procedure, and `04-seed-scale.sql` carries 60 taught packs and a full settings blob to rehearse against.

## next  3 · Supabase Auth  **[A — launch blocker]**

Requirements: email/password, optional Google.
Login purges local state (v108 removed the heal machinery that made this collide, so it is now clean).

## next  4 · `business_id` on every table, plus RLS  **[A — launch blocker]**

Requirements: staged, one table at a time, each migration verified before the next.
⚠️ **RLS with no matching policy returns 200 and an empty array, not an error — a policy mistake looks exactly like "no data".** And an anon UPDATE or DELETE returns 204 with no error and touches nothing, so **verify AS THE CLIENT over PostgREST with `Prefer: return=representation`**, never through the MCP, which bypasses RLS entirely.
Note **`menus` no longer starts from RLS OFF** — corrected 8 Aug 2026 when `20260808_menus_rls.sql` was applied. All **ten** public tables now have RLS on with at least one policy, so no table needs ENABLING as well as policying; they all need their permissive `using (true)` policy REPLACED with a `business_id` one. *(Was "eleven" until 172; `20260809_drop_kitchen_items.sql` had already made it ten and the count was never updated. Counted against the live catalogue, not inferred.)*
✅ **Rehearsable as of 172** — `supabase/staging/01-schema.sql` reproduces all thirteen policies under production's exact policy NAMES, which is what this item will look them up by. Rehearse each table's swap there first; `docs/STAGING.md` has the procedure and the fingerprint query that proves the two schemas still match afterwards.
⚠️ **What staging CANNOT rehearse here, stated so it is not over-trusted:** neither project has any users, so `anon` is the only role either has ever been exercised as. This item's policies are the first that will distinguish roles, and staging can prove they RUN and that the client sees what it should — not that a second tenant is correctly excluded, which needs auth first.

## next  5 · Roles — owner vs staff  **[A — launch blocker]**

The app currently tells staff "owner and staff access is already planned" while nothing is built. **That copy ships or comes out.**
**DECIDED (Max, 9 Aug 2026): TWO roles — owner + working staff.** Staff import invoices and edit ingredients/plates; staff cannot delete plates or menus, change the target, restore backups, or touch billing. No manager role unless a real person at a real café needs one later.
Do after: **`business_id` on every table, plus RLS** — roles are enforced in the same policies.

## next  6 · Onboarding and empty states  **[A — launch blocker]**

Every screen at zero, which production has never shown.
**Including how a new café gets a product catalogue at all** — named explicitly because "bulk catalogue bootstrap" was inside this item by implication only, and an implied requirement is one nobody builds. Scoopy's catalogue arrived over months of invoice imports; a second café starting from an empty `ingredients` table has no such history, and an empty catalogue means no ingredients, so no plates, so nothing the app can do.
**Fix here, because it is only reachable at zero:** the zero-ingredients builder hint is an **UNSTYLED link** — `catalogueHintHtml()` in `js/app.js` emits `No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>`, and `css/style.css` has **no anchor colour rule anywhere**, so it renders browser-default blue: near-illegible on the dark surface, and wrong in light too. One rule fixes it. It is the first thing a brand-new café sees.
⚠️ **It has TWO homes and you must style both, or the fix works on one screen and not the other** (170): `renderPlate` puts it inside `#lines`' `.bld-empty` when the plate is empty, and in `#builderHint` when the plate has lines but the catalogue is empty. Never both at once. **Cited by function name on purpose — this item carried `js/app.js:820` and the line had already drifted before 170 moved the code.**
✅ **Testable as of 172.** This item is only reachable at zero and production is never empty, which is why it could not be started before. `supabase/staging/02-seed-empty.sql` now produces exactly that state — every table empty INCLUDING `app_settings`, so there are no kitchen words either, which is the only honest zero. Point the app at it with `?env=staging`; `docs/STAGING.md` has the procedure.

## next  7 · The privacy gate  **[A — launch blocker]**

`CLAUDE.md` names this **the single most important thing to reopen before EzPlate serves anyone but Scoopy's.**
Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`. That tier **may use prompts for training**.
Max accepted this for his own café — his call, made — and **that acceptance does not extend to a second customer's data.**
Requirements: a paid-tier Google project that excludes training use, or a privacy policy that discloses it.
**Before the first non-Scoopy's row exists, not after.**

## next  8 · pdf.js 4.2.67+  **[A — launch blocker]**

3.11.174 carries CVE-2024-4367. Mitigated in v88 (`isEvalSupported:false`), not fixed. Theoretical while Max controls the PDFs, **real once strangers upload them.**
Requirements: multi-tenant launch gate. Invoice parsing must still work on the real invoice set afterwards. Both client third-party scripts stay pinned to an exact version with the `sha384` recomputed in the same commit (the worker is pinned only — `new Worker()` has no SRI).

## next  9 · Gate review before public signup  **[A — launch blocker]**

Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer. Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.
Do after: **`business_id` + RLS**, **the privacy gate** and **pdf.js 4.2.67+** — it is the read-through of the gates, not a substitute for them.

## blocked  10 · The restore's full-wipe step (step 3)  **[A — data integrity]**

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

## next  11 · Floating layers and mobile dropdowns  **[B]**

Dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying. **Usable one-handed on a 380px phone** is the requirement, on the device Max actually works on.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** (v119 review). `anchorDrop` / `dropPlace` / `dropBox` is ONE shared engine reused across several call sites; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely. **Count them properly before planning off the number** — every enumeration in this project has come back different from the guess.
Requirements: one placement implementation.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`, so every layout a dropdown opens over is now converted and placement can be done once.)*

## next  12 · Desktop shell polish — nav hierarchy, rhythm, and the full-bleed header  **[B]**

Three measured defects in the converted shell, one screen's worth of work, all five converted screens at once.
- **Nav labels are the same weight as the page title.** Measured: page title **15px/600**, sidebar nav label **13px/600**. **The cause is the nav, not the title** — the mock's title is 15/600 and the app matches it exactly, while the mock's inactive nav items are 13px/**500**, with 600 reserved for the ACTIVE item. The app renders every label at 600, so the active state carries no weight signal either. AC: inactive 500, active 600, title unchanged.
- **The header bar is not full-bleed — DECIDED 10 Aug 2026, BUILD IT.** The mock's §2 header hairline spans the whole main area while content sits at max-width 960; in the app both are 960 because `.scr-head` lives inside `.wrap`. Measured at 1208: `.scr-head` x260-1172, content x280-1152. Max chose full-bleed knowing the overhang past the content column is what caught his eye: **the header is a band across the app, not a lid on the content column, and the overhang is what makes it read that way.** Breaking out of `.wrap` is shell work — all five screens at once, never per screen. ⚠️ The contradicting "identical edges" AC from the UI-2 report is DEAD; do not revive it.
- **Sidebar rhythm.** Reported as ~31px nav spacing plus an unexplained gap. **The gap is `.nav-bottom` and it is the mock's** (§2: "Bottom group above hairline: Invoices, Settings") — a deliberate section separation, so **do not delete it**; the defect, if any, is that it does not READ as deliberate. The theme toggle in the logo row is also the mock's slot (§2 puts ⌘K there; F1b put the 22px toggle in it because no palette exists to open). Requirements: measure nav item spacing against the mock's `padding:7px 10px` and correct only what deviates, then decide whether the bottom group needs the visible hairline it currently lacks.
- **No top padding on the main region.** Reported 11 Aug 2026 from the dark desktop build at 1208: content begins ~74px from the chrome with the title cap ~10px below it, and the header actions sit flush to the top edge. AC: the title and the header actions share a baseline with **at least 24px of clearance above**, and the page-header row carries its own vertical padding rather than inheriting the content's. ⚠️ **Measure before building** — this arrived as one of fourteen reported defects and three of the other thirteen did not reproduce, including the width claim below. Same change as the full-bleed header, because both move `.scr-head`.
Note the content gutter measures **44px** a side against the mock's 24-32px — reconciling it reclaims 24px of column width and belongs in the same change. (The report that claimed 73% usable width did not reproduce: measured 91%.)

## next  13 · Products table polish — five measured defects, one screen  **[B]**

- **"Last change" prints "steady" on every unchanged row** — 15 of 15 visible. **DECIDED 10 Aug 2026: a dash (—)**, not "steady" and not blank. A deliberate deviation from the mock, on the grounds that the mock's fixture never shows more than three unchanged rows at once and Scoopy's shows fifteen; a dash is what every other "nothing here" cell already renders. **Applies to Ingredients as well** — they share the wording and it is one function. Keep the muted `--text-3` mono styling; only the glyph changes.
- **The Supplier column is empty on every fixture row.** ⚠️ **The reported cause is wrong:** the secondary text beside the product name is the **BRAND** (Priestleys, Heinz Watties, Caterers Choice), not the supplier — F4 shipped "Product + inline brand" per the mock's §3.5, so nothing is duplicated and "one supplier location" would remove a column that duplicates nothing. The real question is whether Supplier is empty on **Max's** catalogue, which the Playwright fixture cannot answer. **Count non-empty `supplier` values across the live `ingredients` table before deciding anything.** If most are empty the column is dead weight and its width goes to the name column; if populated, this half closes.
- **Category values render raw, in mixed case, and truncate mid-word** — `DESSERTS`, `BAKING SUPPLIES`, `CLEANING & JANITORIAL`, `HERBS SPICES & SEASONINGS` beside sentence-case `Fish`. These are supplier-supplied strings stored verbatim, so the mixture is in the data, not the rendering. AC: one casing rule applied **at display time**, and no mid-word truncation. ⚠️ Display-time only — the stored value is what the invoice parser and the category derivation both match against, so normalising at rest is a data migration with a blast radius well beyond this column.
- **A long product name truncates the name and its brand together.** Both `.ing-name` and the brand are `flex:0 1 auto` with `min-width:0`. AC: a strategy that keeps one label whole — the name is the identifier, so the brand yields first. F4 already fixed the mobile half by dropping the brand below 768 per the mock; this is the desktop residue.
- **The filter row is wider than it needs to be.** Measured at 1208: the row spans the full 912 with search 365px, category select 329px, supplier select 162px. The mock's §3.5 control row is a search that grows plus a select sized to content. AC: controls sized to content, reclaimed width to the table.
- **The search's clear button is drawn even when the field is empty.** Verified 11 Aug 2026, in the code rather than from a screenshot: `#ingSearchClear` is plain markup in `index.html` and `js/app.js` binds a click handler to it and nothing else — there is no show/hide anywhere, so the × is permanently visible offering to clear nothing. AC: the clear control appears only when the field has a value. ⚠️ **It is not one button.** `wireSearchClear` wires the same always-on pattern to the modal search boxes, and `#kingSearchClear` and `#menuSearchClear` are two more of the same shape — so this is one rule for every `.plib-x`/`.ms-clear`, applied once, not a fix to the Products field. Grep both class names before starting; `CLAUDE.md` names `.menu-search`/`.ms-clear` as shared families.

## next  14 · Dashboard trend polish — the x-axis and the third accent hue  **[B]**

- **The chart has no x-axis at any range.** Measured: the only `<text>` elements are four y-axis ticks. **This is a deviation from the mock, which also draws none** — so it is a decision, not a fix, and the argument for it is that a trend chart whose x-axis is unlabelled cannot be read against the range control that governs it. ⚠️ The scrub tooltip already carries the full sentence including the date, so the gap is partly covered on hover and **not at all on a phone**. (The annotation half shipped in v145: the label reads "−2 pts", the subject stays in the caption.)
- **Three accent hues in one section — DECIDED 10 Aug 2026: restyle the range pill.** The chart line is `--good`/`--bad` by target, the intervention markers are `--accent` orange, and the active range pill is `--accent-weak`/`--accent-ink` orange, so a healthy section shows green line + orange marker + orange pill. **The markers STAY orange and that is the load-bearing half** — they mean "you did this" while the line means "here is where you stand against target", and the two must never share a hue (§8 reserves green/amber/red for cost semantics). The range control is a button, not data, so it is the one that stops competing. Requirements: the active state must still be unambiguous at a glance. Out of scope: the markers, and the chart line's target anchoring.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
