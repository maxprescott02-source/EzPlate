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
⚠️ **The phase is NOT finished**: `The mobile More screen` is the last piece of §6 and no F-item ever owned it, so the §6.1 parity map is unmet until it lands. Its `Do after: F10` is satisfied and DELETED below. There is no reset pass and no clean starting line (Max, 10 Aug 2026, overriding §0a): §2 binds FORWARD.

**Conflicts walk the §3 rubric and the rule number is recorded at the site:** R1 presentational → mock wins · R2 real constraint → old behaviour in new dress · R3 dropped control → rehome, never delete · R4 missing backend → build what exists, spec the rest, never a dead control · R5 tie → mock wins, note the loss.

**Standing rules:** naming inversion holds (only human-read text changes) · protected parser region untouched · **list every handler, data read/write and edge case BEFORE touching a screen; that list is the contract (§5) — never discover behaviour by deleting it** · six-spot cache bump per shipping batch · `npm test` + Playwright green (specs pinning old layouts are rewritten honestly in the same change, never deleted to go green) · one screen per change set, one PR, one review; never mix shell work with screen work · every pre-existing flow completes end-to-end after every commit, or carries a written R3/R4 reason.

**§4 acceptance criteria = the definition of done for every F-item** (check them off in the PR): structure matches the mock side-by-side at 1360×900 (same regions in order; row grammar identity-left, mono-figures-right, status-pill-rightmost) · every colour/border/shadow from a token, ZERO hard-coded hex in screen code · Geist for UI, Geist Mono `tabular-nums` for every number · all five states (loading skeleton, empty, error, first-run, permission denied) exist and are v3-styled · mobile counterpart converted in the SAME item per the §6.1 parity map · old component + CSS deleted in the same change · focus ring on every interactive; modals trap focus and close on Esc · no behaviour regression without a logged reason.

**Two CSS families are still shared and must not be deleted by an F-item on the strength of a grep:** `.menu-search` and `.ms-clear` are worn by MODAL search boxes (add-dish, product-link, tidy), and `.atable-wrap` is the DIV the invoice review renders inside — it is not `.atable`, which is gone. `.scr-head` is the shared §2 header bar: reuse it, do not rebuild it. **`.invz` (the dashed dropzone) is worn by TWO elements** — the Invoices screen and the upload modal's step 1 — and `.inv-bar` by two more (step 2 and the AI-referee wait).

---

## next  1 · The plate builder — restore the FILL ORDER the redesign lost  **[B]**

**Max, 11 Aug 2026:** *"needs to find a middle ground between old docket style and the new redesign; whilst added ux features are great (duplicate) the rest is not user friendly, confusing ordering, flow does not match how the user would fill the form."*

⚠️ **THE PAGE STAYS A PAGE. "Docket style" is a LAYOUT, not the modal.** `CLAUDE.md` records that this one line has been wrong in both directions and cost a batch each time — modal from v54, page since F7/`ezplate-v146`. Nothing in this item reopens that. What is being restored is the ORDER of the form, which is what F7 dropped when it moved the fields into the mock's frame.

### The diagnosis, measured against the v145 markup and an empty builder at 1360

**The decided fill order is `add ingredients → name → categorise → save` (v69, Max's call).** It is written into the F7 comment at `index.html`'s `.bld-namewrap`, which cites it as the reason the title is an editable field — so F7 knew the order and kept the mock's placement anyway.

**The page presents the exact reverse.** On an empty builder the first field is `#plateName` ("Name this plate", top-left) and the most prominent control is `#saveBtn` ("Save plate", top-right). Both are END-of-flow actions and they are the two things a user meets first. The ingredient search, which is step ONE, is at the BOTTOM of the table inside `.bld-foot`.

**The old builder said the steps out loud and this one does not.** Pre-F7 markup had two headed sections: `#docketPanel` → `<h2>Add ingredients</h2>` and `#platePanel` → `<h2>Name &amp; save</h2>`, with `#q` ABOVE `#lines` so the docket grew downward as you typed. F7 kept every id and dropped both headings and the search position. That is the whole of what "flow does not match" names.

**Three smaller things measured at the same time, all consequences of the same move:**
- The empty state reads *"No ingredients yet. Add the first one below."* — **copy compensating for a control being in the wrong place.** If the search sat above the lines the word "below" would not be needed.
- **Two different "no ingredients" messages render at once**: that empty state, and `#builderHint`'s *"No ingredients yet — add your first ingredient, then build plates with them."* directly under it.
- **`Category` sits under a card headed `Publishing`, and it is not publishing.** The card's own first line is *"Save the plate first, then publish it to a menu"*, so the heading describes something inert while the one live control under it is step THREE of the fill order. `CATEGORY (OPTIONAL)` is also the only all-caps field label on the screen.

### Requirements

- **The search moves ABOVE `#lines`.** The docket grows downward from where you type, which is both the pre-F7 behaviour and how a docket reads.
- **The page states its order.** Two labelled steps, in the v69 order, using the v3 card system rather than the old `<h2>`s: ingredients first, then name/category/save. The exact treatment is a design call and is YOURS — what is not optional is that a user reading top to bottom fills the form in the order the app expects.
- **`Category` leaves the `Publishing` card** and joins the naming step. Sentence-case its label like every other field.
- **One empty-ingredients message, not two.**
- **KEEP, explicitly, because Max named it:** Duplicate, and the rest of the v3 visual system — the column band, the Cost card, Print / Clear / Delete, the sticky mobile bar. This item changes ORDER and LABELS, not the card system.
- `#saveBtn` may stay the header action or move to the naming step, but §6 allows exactly ONE header action on a phone and Save is currently it — if it moves, nothing takes its place.

**Every id stays.** `q`, `drop`, `lines`, `plateName`, `plateCat`, `saveBtn`, `bTotal`, `bFootSum` and the rest are bound by id and §5 says re-attach, never rediscover. §5 also requires the full handler/edge-case list BEFORE the screen is touched, and this screen is on `CLAUDE.md`'s fragile list.

Out of scope: the modal-vs-page question, the plate-draft machinery, and the unstyled blue "add your first ingredient" link — that link is real and visible right here, but it belongs to **Onboarding and empty states**, which already names it with its line number.

## next  2 · The mobile More screen, and Products/Invoices/Settings/Account as sub-screens under it  **[B]**

v3 §6 gives the phone a five-tab bar — Home, Menu, Plates, Ingredients, **More** — with Products, Invoices, Settings and Account as sub-screens reached from a More list, each with a "‹ More" back chevron. The app's bottom bar has five DIRECT tabs and no More screen, so the desktop sidebar's bottom group (`.nav-bottom`: Invoices, Settings) is CSS-hidden below 1024.
⚠️ **Corrected 11 Aug 2026, after F9: that group's two entries are NOT in the same position, and the earlier wording ("no mobile counterpart at all") flattened them.** **Settings HAS a phone route** — the header gear, `#settingsBtn`, which `header{display:none}` inside `@media (min-width:1024px)` makes mobile-ONLY. **Invoices has none.** So this item ADDS a third route to Settings and the FIRST route to Invoices, and the gear is not a duplicate to be tidied away when the More list appears: deciding whether it stays is part of this item's work, and it must not be deleted before the More screen exists.
F4 refused to build it inside the Products item (R2 + §2): it is shell work, it moves three screens that were not converted, and a "‹ More" chevron pointing at a screen that does not exist is the dead end §6 forbids.
Requirements: ONE item that builds the More screen (§6's chevron rows in the §6.1 order) AND restructures the bottom bar AND gives each sub-screen its back chevron — not four half-conversions. Every screen it rehomes must already be converted.
**All four now are** — Products (F4), Invoices (F8), Settings (F9), Account (F10). Nothing is waiting; this item is ready to run.
Note this is the last piece of §6 that no F-item owns, and without it the desktop↔mobile parity map (§6.1) is unmet by construction — say so if the phase is ever called finished before it lands.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`. All four screens it rehomes are now converted.)*

## next  3 · One action in a mobile screen header — rehome the second one (DECIDED 10 Aug 2026)  **[B]**

§6's mobile header is "screen title + one action max", and three converted screens ship two.
- **Ingredients (F3):** "Set up from products" beside "New ingredient". Conditional (`renderKingProgress`), so most cafés see one — but Scoopy's catalogue has hundreds of unlinked products, so Max sees two.
- **Products (F4):** "Import invoice" beside "New product", and here it is UNCONDITIONAL. The sidebar's Invoices entry is desktop-only, so on a phone `#importBtn` is the ONLY route into the import flow.
- **Menu (F5):** "Existing plate" beside "New menu". The mock's own mobile header carries NEITHER — it is menu name + food-cost pill + "Switch ▾" — and F5 took that trio into the control row beneath (R5) rather than answering this a third way.
Hiding either on mobile was rejected both times: it strands a whole flow on the device Max actually works on.
**DECIDED (Max, 10 Aug 2026): find another home for the second action.** He did NOT take the recommendation to keep both. §6's "one action max" holds on a phone; the header keeps only the primary.
Requirements: ONE home used by every screen — they are one question and must not get three answers. The secondary must stay reachable on a phone in one gesture. **The mock has no pattern for this, so the first job is to PROPOSE one and get a yes before building** — a candidate is not a decision.
⚠️ The mock's desktop label "Add existing plate" WRAPS the 380px header onto two lines; the app's shorter "Existing plate" stays. Two actions is a deviation; a WRAPPED header is a defect, and the two were one keystroke apart. The pair is pinned at both widths in `tests/visual/v140-products.spec.js` and at desktop in `fresh-states.spec.js` — both pins are consciously changed by whoever builds this, never deleted to go green.
Out of scope: the desktop headers, which the mock does allow to carry both.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`. The reason it gave has expired with it: no F-item remains, so the set of converted headers has stopped growing and a home chosen now is chosen against all of them.)*

## next  4 · Unique ID generation  **[A — launch blocker]**

Nine hardcoded `app_settings` keys, `MENU_ORIGINAL` seeded on every install, `K0001` as every account's first ingredient, `supplier_phrases.id` content-derived so two cafés with one supplier collide **by construction**, plate and dish ids bare `Date.now()`.
Every write is `.upsert()`, so a collision is a **silent overwrite under a green "Saved" banner**, not an error.
Requirements: ids that cannot collide across accounts, plus a migration of the live café's existing rows.
Multi-tenant prerequisite; harmless with one account. **First of the A items because every other multi-tenant table change inherits it.**

## next  5 · Staging Supabase — mirror the schema and seed it  **[A — the safety net for Auth, RLS and Roles]**

**DECIDED 8 Aug 2026 (Max): a free second Supabase project**, not paid branching. **Max's part is DONE** — the project exists, `.mcp.json` has carried `supabase-staging` → `pboidoxjghntalovzrke` since v121, and the MCP server LOADS (`list_tables` answered on 10 Aug 2026, empty `public`, as a fresh project should be). Nothing is waiting on him. Do not re-ask.
⚠️ **Rehearsal is not real until this item RUNS.** The schema is empty, so there is nothing to rehearse against, and every migration is still unrehearsed — a batch must say so out loud before applying anything that is not a behavioural no-op.
Problem: `.mcp.json` points at production and every batch since v89 has run against live data. Migrations cannot be rehearsed, nothing destructive is testable, and an empty account cannot be tested at all because production is never empty.
Requirements: migrations apply to staging first and are verified there before production. Local state cannot cross environments — demonstrate it, do not assert it. Empty, realistic and scale seeds (12 menus, several hundred products, plates on multiple menus).
Out of scope: multi-tenant, auth, RLS policy work — this item builds the rehearsal surface those three use.

## next  6 · Supabase Auth  **[A — launch blocker]**

Requirements: email/password, optional Google.
Login purges local state (v108 removed the heal machinery that made this collide, so it is now clean).

## next  7 · `business_id` on every table, plus RLS  **[A — launch blocker]**

Requirements: staged, one table at a time, each migration verified before the next.
⚠️ **RLS with no matching policy returns 200 and an empty array, not an error — a policy mistake looks exactly like "no data".** And an anon UPDATE or DELETE returns 204 with no error and touches nothing, so **verify AS THE CLIENT over PostgREST with `Prefer: return=representation`**, never through the MCP, which bypasses RLS entirely.
Note **`menus` no longer starts from RLS OFF** — corrected 8 Aug 2026 when `20260808_menus_rls.sql` was applied. All eleven public tables now have RLS on with at least one policy, so no table needs ENABLING as well as policying; they all need their permissive `using (true)` policy REPLACED with a `business_id` one.
Do after: **Staging Supabase** — this is the largest unrehearsed migration in the project.

## next  8 · Roles — owner vs staff  **[A — launch blocker]**

The app currently tells staff "owner and staff access is already planned" while nothing is built. **That copy ships or comes out.**
**DECIDED (Max, 9 Aug 2026): TWO roles — owner + working staff.** Staff import invoices and edit ingredients/plates; staff cannot delete plates or menus, change the target, restore backups, or touch billing. No manager role unless a real person at a real café needs one later.
Do after: **`business_id` on every table, plus RLS** — roles are enforced in the same policies.

## next  9 · Onboarding and empty states  **[A — launch blocker]**

Every screen at zero, which production has never shown.
**Including how a new café gets a product catalogue at all** — named explicitly because "bulk catalogue bootstrap" was inside this item by implication only, and an implied requirement is one nobody builds. Scoopy's catalogue arrived over months of invoice imports; a second café starting from an empty `ingredients` table has no such history, and an empty catalogue means no ingredients, so no plates, so nothing the app can do.
**Fix here, because it is only reachable at zero:** the zero-ingredients builder hint is an **UNSTYLED link** — `js/app.js:820` emits `No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>`, and `css/style.css` has **no anchor colour rule anywhere**, so it renders browser-default blue: near-illegible on the dark surface, and wrong in light too. One rule fixes it. It is the first thing a brand-new café sees.
Needs **Staging Supabase** to test at all.

## next  10 · The privacy gate  **[A — launch blocker]**

`CLAUDE.md` names this **the single most important thing to reopen before EzPlate serves anyone but Scoopy's.**
Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`. That tier **may use prompts for training**.
Max accepted this for his own café — his call, made — and **that acceptance does not extend to a second customer's data.**
Requirements: a paid-tier Google project that excludes training use, or a privacy policy that discloses it.
**Before the first non-Scoopy's row exists, not after.**

## next  11 · pdf.js 4.2.67+  **[A — launch blocker]**

3.11.174 carries CVE-2024-4367. Mitigated in v88 (`isEvalSupported:false`), not fixed. Theoretical while Max controls the PDFs, **real once strangers upload them.**
Requirements: multi-tenant launch gate. Invoice parsing must still work on the real invoice set afterwards. Both client third-party scripts stay pinned to an exact version with the `sha384` recomputed in the same commit (the worker is pinned only — `new Worker()` has no SRI).

## next  12 · Gate review before public signup  **[A — launch blocker]**

Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer. Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.
Do after: **`business_id` + RLS**, **the privacy gate** and **pdf.js 4.2.67+** — it is the read-through of the gates, not a substitute for them.

## blocked  13 · The restore's full-wipe step (step 3)  **[A — data integrity]**

Steps 1 and 2 of the v110 destructive plan were run and passed. **Step 3 — restoring into a genuinely EMPTY database — never was.**
What it would newly prove is narrow: that an empty table restores as well as a populated one, and how the boot gate reads mid-restore against nothing.
Requirements: a fresh export taken minutes before, and **Max's explicit go on the day**. Destructive against real data.
**SCHEDULED (Max, 9 Aug 2026): runs when the v3 fold-in phase finishes, before any multi-tenant work.** The batch that closes the phase prepares everything and asks for the go.
⚠️ **Corrected 11 Aug 2026: this read "(items 1-5)", which was a POSITION and had already drifted** — F8 and F9 shipping moved every number under it, so "items 1-5" now points at four items that are not the fold-in at all. **The phase finishes when `F10 — Account` and `The mobile More screen` have both shipped** — the More screen included, because §6.1's parity map is unmet by construction without it and this file says so at that item. Name them; never re-number this.
**F10 shipped 11 Aug 2026 as `ezplate-v149`. Only `The mobile More screen` remains**, so this item comes due the batch after that one lands.
Blocked on: Max's go on the day. The timing question is answered; this is not an open ask.

## next  14 · Floating layers and mobile dropdowns  **[B]**

Dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying. **Usable one-handed on a 380px phone** is the requirement, on the device Max actually works on.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** (v119 review). `anchorDrop` / `dropPlace` / `dropBox` is ONE shared engine reused across several call sites; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely. **Count them properly before planning off the number** — every enumeration in this project has come back different from the guess.
Requirements: one placement implementation.
*(`Do after: F10` DELETED 11 Aug 2026 — F10 shipped as `ezplate-v149`, so every layout a dropdown opens over is now converted and placement can be done once.)*

## next  15 · Desktop shell polish — nav hierarchy, rhythm, and the full-bleed header  **[B]**

Three measured defects in the converted shell, one screen's worth of work, all five converted screens at once.
- **Nav labels are the same weight as the page title.** Measured: page title **15px/600**, sidebar nav label **13px/600**. **The cause is the nav, not the title** — the mock's title is 15/600 and the app matches it exactly, while the mock's inactive nav items are 13px/**500**, with 600 reserved for the ACTIVE item. The app renders every label at 600, so the active state carries no weight signal either. AC: inactive 500, active 600, title unchanged.
- **The header bar is not full-bleed — DECIDED 10 Aug 2026, BUILD IT.** The mock's §2 header hairline spans the whole main area while content sits at max-width 960; in the app both are 960 because `.scr-head` lives inside `.wrap`. Measured at 1208: `.scr-head` x260-1172, content x280-1152. Max chose full-bleed knowing the overhang past the content column is what caught his eye: **the header is a band across the app, not a lid on the content column, and the overhang is what makes it read that way.** Breaking out of `.wrap` is shell work — all five screens at once, never per screen. ⚠️ The contradicting "identical edges" AC from the UI-2 report is DEAD; do not revive it.
- **Sidebar rhythm.** Reported as ~31px nav spacing plus an unexplained gap. **The gap is `.nav-bottom` and it is the mock's** (§2: "Bottom group above hairline: Invoices, Settings") — a deliberate section separation, so **do not delete it**; the defect, if any, is that it does not READ as deliberate. The theme toggle in the logo row is also the mock's slot (§2 puts ⌘K there; F1b put the 22px toggle in it because no palette exists to open). Requirements: measure nav item spacing against the mock's `padding:7px 10px` and correct only what deviates, then decide whether the bottom group needs the visible hairline it currently lacks.
- **No top padding on the main region.** Reported 11 Aug 2026 from the dark desktop build at 1208: content begins ~74px from the chrome with the title cap ~10px below it, and the header actions sit flush to the top edge. AC: the title and the header actions share a baseline with **at least 24px of clearance above**, and the page-header row carries its own vertical padding rather than inheriting the content's. ⚠️ **Measure before building** — this arrived as one of fourteen reported defects and three of the other thirteen did not reproduce, including the width claim below. Same change as the full-bleed header, because both move `.scr-head`.
Note the content gutter measures **44px** a side against the mock's 24-32px — reconciling it reclaims 24px of column width and belongs in the same change. (The report that claimed 73% usable width did not reproduce: measured 91%.)

## next  16 · Products table polish — five measured defects, one screen  **[B]**

- **"Last change" prints "steady" on every unchanged row** — 15 of 15 visible. **DECIDED 10 Aug 2026: a dash (—)**, not "steady" and not blank. A deliberate deviation from the mock, on the grounds that the mock's fixture never shows more than three unchanged rows at once and Scoopy's shows fifteen; a dash is what every other "nothing here" cell already renders. **Applies to Ingredients as well** — they share the wording and it is one function. Keep the muted `--text-3` mono styling; only the glyph changes.
- **The Supplier column is empty on every fixture row.** ⚠️ **The reported cause is wrong:** the secondary text beside the product name is the **BRAND** (Priestleys, Heinz Watties, Caterers Choice), not the supplier — F4 shipped "Product + inline brand" per the mock's §3.5, so nothing is duplicated and "one supplier location" would remove a column that duplicates nothing. The real question is whether Supplier is empty on **Max's** catalogue, which the Playwright fixture cannot answer. **Count non-empty `supplier` values across the live `ingredients` table before deciding anything.** If most are empty the column is dead weight and its width goes to the name column; if populated, this half closes.
- **Category values render raw, in mixed case, and truncate mid-word** — `DESSERTS`, `BAKING SUPPLIES`, `CLEANING & JANITORIAL`, `HERBS SPICES & SEASONINGS` beside sentence-case `Fish`. These are supplier-supplied strings stored verbatim, so the mixture is in the data, not the rendering. AC: one casing rule applied **at display time**, and no mid-word truncation. ⚠️ Display-time only — the stored value is what the invoice parser and the category derivation both match against, so normalising at rest is a data migration with a blast radius well beyond this column.
- **A long product name truncates the name and its brand together.** Both `.ing-name` and the brand are `flex:0 1 auto` with `min-width:0`. AC: a strategy that keeps one label whole — the name is the identifier, so the brand yields first. F4 already fixed the mobile half by dropping the brand below 768 per the mock; this is the desktop residue.
- **The filter row is wider than it needs to be.** Measured at 1208: the row spans the full 912 with search 365px, category select 329px, supplier select 162px. The mock's §3.5 control row is a search that grows plus a select sized to content. AC: controls sized to content, reclaimed width to the table.
- **The search's clear button is drawn even when the field is empty.** Verified 11 Aug 2026, in the code rather than from a screenshot: `#ingSearchClear` is plain markup in `index.html` and `js/app.js` binds a click handler to it and nothing else — there is no show/hide anywhere, so the × is permanently visible offering to clear nothing. AC: the clear control appears only when the field has a value. ⚠️ **It is not one button.** `wireSearchClear` wires the same always-on pattern to the modal search boxes, and `#kingSearchClear` and `#menuSearchClear` are two more of the same shape — so this is one rule for every `.plib-x`/`.ms-clear`, applied once, not a fix to the Products field. Grep both class names before starting; `CLAUDE.md` names `.menu-search`/`.ms-clear` as shared families.

## next  17 · Dashboard trend polish — the x-axis and the third accent hue  **[B]**

- **The chart has no x-axis at any range.** Measured: the only `<text>` elements are four y-axis ticks. **This is a deviation from the mock, which also draws none** — so it is a decision, not a fix, and the argument for it is that a trend chart whose x-axis is unlabelled cannot be read against the range control that governs it. ⚠️ The scrub tooltip already carries the full sentence including the date, so the gap is partly covered on hover and **not at all on a phone**. (The annotation half shipped in v145: the label reads "−2 pts", the subject stays in the caption.)
- **Three accent hues in one section — DECIDED 10 Aug 2026: restyle the range pill.** The chart line is `--good`/`--bad` by target, the intervention markers are `--accent` orange, and the active range pill is `--accent-weak`/`--accent-ink` orange, so a healthy section shows green line + orange marker + orange pill. **The markers STAY orange and that is the load-bearing half** — they mean "you did this" while the line means "here is where you stand against target", and the two must never share a hue (§8 reserves green/amber/red for cost semantics). The range control is a button, not data, so it is the one that stops competing. Requirements: the active state must still be unambiguous at a glance. Out of scope: the markers, and the chart line's target anchoring.

---

# Multi-tenant phase — the [A] items above are its gates

The v3 spec's **Account screen** (§3.9) and **Delete-workspace modal** (§4) belong to this phase — they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.
