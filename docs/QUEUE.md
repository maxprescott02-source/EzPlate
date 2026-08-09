# Queue

Worked top to bottom by `/batch`.
Ordering is priority - move an item up to change what happens next.

Max adds problems here, not briefs: what is wrong, and what must be true when it is fixed.
How is Claude Code's call.

**Two things decide what runs next, and they are different** (added 8 Aug 2026, after Max asked whether the queue was sorted by blockers alone):

- **`Blocked on:`** - waiting on a person or an outside thing. `/batch` skips it and never guesses the answer.
- **`Do after:` / `Do with:`** - waiting on ANOTHER QUEUE ITEM, because doing this first means doing it twice. It names the item and says what the saving is.

Position in this file is still the priority. These two only decide what gets SKIPPED.

**`Do after:` is deleted the moment it is satisfied**, and that is the point of it rather than housekeeping.
The dropdowns item spent two years "sequenced" behind a builder conversion that had already shipped in v54, because the ordering lived in prose that nothing re-checked.
A line naming a finished item is stale by construction, so it gets noticed; a paragraph does not.

**All five questions in `docs/decisions/2026-08-08.html` were ANSWERED on 8 Aug 2026.** The answers are recorded in `docs/decisions/2026-08-08-ANSWERS.md` - read that before re-proposing anything it covers.
Three items left the queue entirely (CodeRabbit **NO**, GitHub Pro **NO**, and the zero-menus headline, which turned out to be **already fixed in v97**).
A fourth - the builder modal - has since closed the same way: **already built, in v54.** See the done entry.

**No live asks for Max.** The decisions #2 file was answered 9 Aug 2026 (`docs/decisions/2026-08-08-2-ANSWERS.md` - all five took the recommendation, all five actioned or unblocked the same day). Both of the previous two are closed: the `menus` RLS migration was written, applied to production and verified as the client on 8 Aug 2026, and the staging project ref arrived the same day.
Migrations are no longer a stop condition at all; `CLAUDE.md` Tier 3 records the reversal.
⚠️ **But staging is still not usable** - the ref is in `.mcp.json` and the server does not load. That is a diagnosis job, not a question for Max; see the item.

**Reconciled 7 Aug 2026** against `CLAUDE.md`'s outstanding list, the "Deliberately NOT built" / "Found, not fixed" / "Follow-ups" sections of all 66 handovers, and the Batch 0 audit.
Every item below was checked against the code or production before it was kept or added - line numbers and counts are measured, not quoted.
⚠️ **Treat that last sentence with suspicion.** Three items that survived this reconcile (the zero-menus headline, abbreviation search, the builder modal) each described something as missing that had already shipped. **Check an item against the code before working it, however confidently it is written.**
Suite green (0 fail) at reconcile time.

---

---

# THE V3 REDESIGN PHASE (added 9 Aug 2026 from Max's v3 package)

**The spec: `docs/design_handoff_ezplate_redesign/V3-Design-Package.md`**, with two mocks (`Redesign v3 - SaaS.dc.html` desktop, `Redesign v3 - Mobile.dc.html` mobile, both rendered by `support.js`).
**It supersedes every v1/v2 mock and the previous phase's remaining screen guidance** - the v2 screen batches (Q2-Q9) all shipped and live in done. The older `.dc.html` files stay on disk as reference; the only item still keyed to one is G2, because the v3 package has no tablet spec and the addendum's §17 remains the only one.
**Spec §11 (the fold-in playbook) is the law of this phase**: a reskin plus layout migration, not a rewrite. Audit each screen's handlers/reads/writes BEFORE touching it and that list is the contract. Mock is layout truth, code is behavior truth. Features are queued to FUNCTION, never shipped as UI shells.

**Three decisions, asked and answered by Max on 9 Aug 2026 (all three recommendations taken):**
1. **The builder becomes a FULL PAGE (V5). This REVERSES Max's 8 Aug modal decision - explicitly, not quietly:** the 8 Aug history, the against-advice flag and Q6's shipped modal redesign were all on the table when he chose. The v3 shell (sidebar, breadcrumbs, full-screen mobile pushes) makes the page the native pattern and the 1040px two-column layout does not fit a modal. `CLAUDE.md` Tier 2 still says "the builder IS a MODAL"; **updating that line ships with V5** - the yes given here covers that edit.
2. **Light theme only, per the spec.** The Light/Dark/System control, the dark token set and the boot `data-theme` restore come out in V1; `cafeCost_theme` is actively removed at boot (the v130 stale-key pattern). Dark can return later as its own designed package - not as per-screen guesses against a light-only spec.
3. **Geist / Geist Mono self-hosted** - woff2 files committed, `@font-face` in CSS, the Google Fonts preconnect/`<link>` removed (offline-friendly, nothing new fetched at runtime). The new-dependency yes is given.

**Already shipped and confirmed by the spec - no work:** menu-scope dropdown (v129), no density toggle (v130), the invoice-review invariants (§8 matches the shipped `invConfirmState`/auto-tick law).

**Standing rules for every item below** (from `CLAUDE.md` and spec §11, which agree):
one §10 step per batch, one PR, one review · v3 tokens land ONCE in V1 as CSS custom properties and every screen consumes them - never hardcode a hex in a screen batch · keep every id, `data-tab` value (the naming inversion holds: nav labels stay "Ingredients"/"Products"/"Plates" over `pantry`/`ingredients`/`builder`), `data-mid`/`data-pid`/`data-scope`, `lt-*`/`st-*` classes and the `.mi-row` delegate · **fold, don't replace still applies** (Max, 8 Aug, "janky": screenshot the CURRENT screen first and judge the result against it, not only the mock - mocks here have been wrong about touch floors and dead space before) · protected parser region untouched · six-spot cache bump per shipping batch · `npm test` AND the full Playwright suite green per batch · §11.6 definition of not-broken: every pre-existing flow (add plate, edit qty, import invoice, change price, change settings) completes end-to-end after every commit.

## blocked  CLAUDE.md corrections from AUDIT-v135 (five lines + one candidate trap)
Problem: the audit verified ~60 CLAUDE.md claims; five are wrong or stale, and one recurring lesson has earned Tier 1 candidacy. Rules there change only with Max's yes.
The corrections (full evidence in `docs/audits/AUDIT-v135.md` §2a):
1. **S1 (the important one):** `pushWrite` "resolves to ... `null` when offline" - NO null path exists; offline resolves `{error}`. A batch following the doc would sequence a dependent write after a failure. The `null` contract belongs to `dbPushMenuAfterPlate`.
2. **S2:** "drops writes silently when fully offline" - the drop is real, "silently" is false (the fail handler toasts "It has NOT been saved").
3. **S3 + C1:** "The dropdown placement work is therefore UNBLOCKED - the positioning context is already final" - both halves false since the 9 Aug reversal (dropdowns are Do-after-V6; V5 rehouses the builder). The planned V5 edit covers only the "IS a MODAL" line, not this sentence - fold this into V5's edit or fix now.
4. **S5/D4 (second audit in a row):** name `cafeDB_plateDraft` as the known exception to "localStorage ... never data" (it is authored content, bound to DRAFTKEY so a literal grep misses it).
5. **R3 candidate Tier 1 entry:** "a stub that mirrors a real function must mirror its CONTRACT - extract the real function instead" - four incidents (v113, and three consecutive batches 139-141), same remedy each time, never written as a rule.
Blocked on: Max - a one-word yes covers 1-4 as the same stale-line class as HANDOVER-133; say separately if 5 (a NEW rule) gets in.

## next  V4c - Ingredients (spec §3.4)
Ingredient | Category | Unit cost | 30-day change (pill or muted "steady") | Used in N plates.
Keep v124's substance: `ingLastMovePct` is the change rule; broken-link states stay loud.
**§11.1 contract banked at `docs/contracts/V4c-ingredients-contract.md` (9 Aug 2026) - read it FIRST; it is the restyle's contract and it corrected this item:** the old text here said "Used in N plates counts BOTH line shapes - the both-sides law at productRefs", which contradicts the shipped v124 law. The RELINK-PROMISE string stays kid-arm only (a relink cannot heal a bare-pid line; the v124 review caught that lie once already). A neutral usage COLUMN, if added, may count both via `productRefs` - decide per surface and record it.
**R1 (AUDIT-v135): `.king-row`'s ≥640 grid ends in `max-content` - the SAME per-container drift the v135 review measured on Plates (fixed twice now: v125 qtybox, v135 band). Fix it to a fixed track IN THIS BATCH, before the band goes on top, and reconcile `.tbl-head` here if this batch consumes it (the css:3222 warning V4a left unanswered).**
Also from the contract: re-adding a Category column reverses a recorded Q5 decision (turns `king-rows.test.js:85` red - flip it consciously); the drift badge is "last logged move", NOT a 30-day window (changing that breaks the row/What-moved agreement invariant); a steady row currently renders nothing where the spec wants muted "steady".

## next  V4d - Products (spec §3.5)
**R1 (AUDIT-v135): `#ingList`'s 640-899 band grid uses a `max-content` middle track - the per-container drift mechanism, third live instance. Fix to fixed tracks when the band lands here.**
Search + supplier select · Product (+muted brand) | Category | Supplier | Pack price | Last change. Keep v99's price-basis visibility rule (the label renders exactly when the figure lacks the basis, v126's dedupe).

## next  V4e - Invoices screen (spec §3.6)
Dashed dropzone + the import entry point moves here. ⚠️ **The "recent imports" table has NO backing store - nothing records an import today.** Ship the dropzone and either a visibly-stubbed recents area or none (§11.4); the store is the "Invoice import history" feature item below, queued to function. Do not invent a per-session fake.

## next  V5 - Builder full page (§10.5; spec §3.7; decision 1 - THE REVERSAL)
Modal → full-screen page: breadcrumb "Plates /", left ingredient table with add-ingredient footer row, 300px right rail (cost card: plate cost, suggested, price input, amber under-suggested guidance banner; publishing card: menu + category selects).
This is a RE-HOUSING, not a rebuild: keep every id (`#builderModal` may live on as the page container's id - never rename), the draft machinery (`isBuilderDirty`, `guardUnfinishedPlate`), `#lines`/`#total`, and Q6's cost-panel logic (`renderBuilderCost`, `menuMarginPreview`).
**Inherited from V4b (v135): the Plates row-click still opens the ACTION CHOOSER** - flipping it to open the builder is THIS batch's job, and only once publishing lives in the builder page (otherwise Publish/Print/Delete are orphaned, §11.6). `tests/visual/v135-plates.spec.js` pins the current behaviour and must be consciously changed here. Mobile is already a full-screen takeover, so <768 mostly restyles; the sticky bottom summary bar (plate cost + suggested + price action) replaces the current footer per §6.
"Saved just now" wording is server-confirmed only - it renders when `pushWrite`'s promise settles ok, never optimistically (an occasional user would rather be told a thing did not save).
The mock's Duplicate button and recent-range line are feature items below - stub or skip, never half-ship (§11.4).
**Ships the `CLAUDE.md` Tier 2 edit** ("builder IS a MODAL" → the 9 Aug full-page decision, dated, with the reversal history). The old "recent range" from `priceHistory` stays queued.

## next  V6 - Modals + sheets (§10.6; spec §4)
Upload-invoice 3-step modal as a RESTYLE of the shipped review flow - the `invConfirmState` law, auto-tick rule, pack-teach/chips machinery and watchdog all untouched; regression tests first per `CLAUDE.md` fragile areas. New-plate modal. Scrim/Esc/centering conventions. <768: modals become bottom sheets per §6.
Delete-workspace modal is NOT built (multi-tenant phase). The command palette arrives with its feature item, not here.
⚠️ Two carried defects land here, where the modal system is open: **Esc closes ALL stacked modals in one press** (`js/app.js:7503` + two parallel Esc listeners; §7 wants top layer only), and **focus trap + return-to-opener exists nowhere** - build it into the shared modal/sheet shell or give it its own item, don't drop it again.

## next  V7 - Settings (§10.7; spec §3.8)
Section cards per the mock, mapped onto the settings that EXIST (Costing: target % + GST switch; Data: the JSON backup/restore, restyled). §11.1 audit first: anything the mock shows that the app lacks (business name, currency, notification toggles - there is no notification system) is stubbed visibly or skipped and queued, not silently invented. Switches 38×22, orange on.
"CSV export" is a feature item below; "Delete workspace" is multi-tenant. The Account screen (spec §3.9: Team, Plan, billing) is NOT built in this phase - it describes a product state (auth, roles, billing) that does not exist; it lives in the multi-tenant phase.

## next  V8 - States (§10.8; spec §5) - absorbs G1 and G3 (folded 9 Aug 2026)
Empty / loading / sync-error / toast / inline-import-error / form-validation per §5, wired to the SHIPPED mechanisms (`toast()`, `#syncBanner`, boot gate, invoice file-failed) - production error wording verbatim, no new error plumbing (that was G1). First-run IS the empty states: Dashboard path card replaces the verdict hero while nothing is costed, state derived from data, no stored flag, gone once a verdict exists; Products first-run leads with invoice import (that was G3). Skeletons match final layout, zero shift.
⚠️ §5 says "no spinners", but the one-ring wait language (boot/PTR/invoice) was considered and DECLINED for replacement in v115 and still sits on `docs/PHONE.md` for Max to judge - if the ring goes, it goes by his call, not silently under this batch.

## next  V9 - Mobile (§10.9; spec §6 + §6.1)
The structural one: the bottom bar becomes Home, Menu, Plates, Ingredients, **More** - Products LEAVES the bar and lands on the new More screen (chevron rows: Products, Invoices, Settings; the mock's workspace/plan card is skipped - no workspace or plan exists). Two-line list rows (56px min), sticky blurred headers, back chevrons on sub-screens (never dead ends), dashboard hero number + simplified sparkline, full-width 50px primaries.
Keep the `data-tab` machinery under the new bar - More is a navigation layer over the existing tabs, not a rename of anything. **The parity map (§6.1) is the acceptance checklist**: same names, same order, same reading direction as desktop.

## next  V10 - Keyboard/focus + system sweep (§10.10; spec §7 - absorbs the old Q10)
Last on purpose - it codifies what V1-V9 establish. Focus-visible outlines everywhere (never removed), Esc/Enter conventions, AA contrast, one primary per region, disabled = tinted + not-allowed (never invisible). Bind ⌘K only once the palette feature exists - never a dead chord.
Carried from the old Q10's measured notes (v128 session), the parts still live after v3:
> - Line numbers below predate the v3 batches by construction - re-grep by NAME.
> - Focus ring missing on `.misc-name` (rule kills it on :focus, colour-only underline left).
> - Row `aria-label`s: `king-row`'s label OVERRIDES its content (price + drift never announced); Products rows announce a run-on string. Decide the screen-wide rule; the `vbadge` aria is the good example.
> - The old palette's contrast-floor violation list and the 3.74:1 selected-idiom pair die with the old palette in V1. **§7 CLAIMS every v3 pill pair is AA - verify with measured ratios, don't trust the spec's own claim.**
> - Fold in the queued **unstyled zero-ingredients link** if it has not shipped by then.
> - `/`-focuses-search: `currentTab()` gives the tab→search-id map; bail when typing or a modal is open. (v3 §7 doesn't ask for it; take it or drop it deliberately.)
> - Verify `prefers-reduced-motion` still genuinely disables motion after nine batches of new CSS.
> - The Esc-stacking and focus-trap defects moved to V6, where the modal shell is open.

## next  G2 - Tablet pass (768-1023)
Keyed to the OLD addendum (`Redesign - Error, Tablet & First-run.dc.html` §17) - **the v3 package has no tablet spec, so §17's decisions stand**: bottom nav kept, 24px gutters, content max 720px, targets ≥44px, hover only ≥1024 under `@media (hover:hover)`. Its "only per-screen wraps are 1120/1130" line predates the v3 layouts - re-measure, don't quote. Test iPad portrait AND landscape. One PR.
Do after: **V9** - the tablet band sits between two layouts that both change in this phase.

## Features from the v3 spec - queued to FUNCTION (§11.5), each needs its brief before build
- **Command palette (⌘K)**: trigger ⌘K + the sidebar button; sources are the live in-memory arrays (plates, menus, ingredients) plus actions (upload invoice, new plate); selecting navigates or opens; Esc closes; no new storage.
- **Invoice import history** (feeds V4e's recents table): nothing records an import today. Needs a real store - a Supabase table (date, supplier, item count, change count, status) written at apply time, with migration + RLS like the others, and a retention decision. This is DATA, so it is not localStorage (Tier 2: there is no third category).
- **Plate Duplicate** (builder header): behavior spec needed - clones lines + category into a new UNSAVED plate; name rule; publish state NOT copied (a copy published to the same menu would duplicate a dish). Decide before building.
- **Recent range on the builder cost card**: read-only derivation from `priceHistory`; define the window and the copy.
- **Mobile camera upload** (bottom-sheet "Take a photo"): `capture` on the file input feeding the existing parse path; no new parsing.
- **CSV export (Settings → Data)**: which objects, which columns. The JSON backup already exists and stays the restore format - **the backup-format law is untouched; CSV is an export for humans and NEVER an import path.**

---

## next  `ensurePlateForDish` heals: relink when ONE plate matches, ask when several (DECIDED 9 Aug 2026)
Problem: correct for a genuinely uncosted row; for one whose real recipe exists in the library it leaves that recipe unreferenced and silently starts a second, empty one.
Flagged in v113, unchanged.
Requirements (Max's answer, 9 Aug 2026): the heal looks for an existing library plate by the dish's name BEFORE creating an empty one; exactly one match -> relink automatically; several -> ask; none -> today's behaviour (a fresh empty plate).
Note **no path creates an unlinked row**: the class arrives only from history or a restore, and production has **0** of them today (verified 7 Aug).
The data-shape decision is made; build it with the both-sides lesson in mind (a relink heals kid-lines only - see kingMissingImpact's v124 history).

## blocked  The restore's full-wipe step (step 3)
Problem: steps 1 and 2 of the v110 destructive plan were run and passed.
Step 3 - restoring into a genuinely EMPTY database - never was.
What it would newly prove is narrow: that an empty table restores as well as a populated one, and how the boot gate reads mid-restore against nothing.
Requirements: a fresh export taken minutes before, and Max's explicit go on the day.
**SCHEDULED (Max, 9 Aug 2026, answers file Q2): runs when the v3 redesign phase (V1-V10 + G2) finishes, before any multi-tenant work.** The batch that closes the phase prepares everything and asks for the go.
Blocked on: Max's go on the day — the timing question is answered.
Destructive against real data.

## next  Mutation testing (Stryker) - measure the tests that cannot fail (APPROVED 9 Aug 2026, dev-only)
Problem: `CLAUDE.md` names fragile areas where a regression test is mandatory, and nothing checks whether those tests would actually FAIL if the code broke.
A test that passes against broken code is worse than no test, because it is trusted.
The suite is 822 tests in ~0.9s (re-measured by the v135 audit; four more cannot-fail incidents landed in v132-v134 alone - see AUDIT-v135 R2, which argues this item deserves an earlier slot), so mutating it is cheap - the usual reason not to do this does not apply here.
Requirements: a mutation score for the fragile areas specifically, not a repo-wide number; every surviving mutant in those areas is either killed with a new assertion or written down as deliberate.
Max's yes: 9 Aug 2026, dev-only (`docs/decisions/2026-08-08-2-ANSWERS.md`). The no-new-dependencies rule protects the CLIENT; nothing here ships to it. The v125 audit's six counted "test that cannot fail" incidents are the case for running this soon.

## next  An eval harness for the invoice reader
Problem: triaged out of the v115 audit's dropped-threads list, 8 Aug 2026, and it is the one of the five that deserved its own item.
The invoice path is the app's highest-stakes surface and its only AI one, and **there is no way to tell whether a parser or prompt change made it better or worse.** `tests/invoice-gate.test.js` and `tests/inv-gemini-merge.test.js` pin specific decisions on hand-written inputs; neither measures accuracy over a corpus.
So every change to `resolveMatchedPrice`, the taught-pack precedence or the Gemini prompt is judged by whether the unit tests still pass and whether one invoice looked right.
Requirements: a set of real invoices with expected line/price/pack outcomes, and a score that can be compared across two commits.
It must run offline against stored model responses - re-calling Gemini per run would make the score non-deterministic and cost money.
Out of scope: changing the parser or the prompt. This is measurement; acting on what it measures is separate.
Note: this needs Max's real invoice set, and those invoices are commercial data - decide where the corpus lives before collecting it.

## next  `isBuilderDirty` compares against the raw saved lines, not what was loaded
Problem: found by the v118 pre-push review and **considered, not fixed** - it is an asymmetry rather than a reproducible bug, and the fix belongs with the orphan-line work rather than bolted onto a draft fix.
`loadPlateState` silently DROPS a `pid` line whose product is gone (a `kid` line degrades to "product missing" instead), but `isBuilderDirty` compares `currentLinesSig()` - built from the filtered `plate` - against `sp.lines` mapped straight through `lineSig`.
So a plate carrying such an orphan reads as dirty the instant it loads, which would re-arm the very "Unfinished plate" prompt v118 removed, for that plate only.
Believed unreachable today because `productRefs(pid)` refuses to delete a product any plate line still references - **that guard is the only thing holding it shut**, so this becomes live the moment a delete path stops checking, or a restore lands a line whose product did not come with it.
Requirements: decide whether `loadPlateState` should degrade a `pid` line the way it degrades a `kid` line, or whether `isBuilderDirty` should compare like against like.
Out of scope: the draft machinery, which is now correct either way.

## next  Menu / empty-state centring - four fixes, no root cause on record
Problem: found by the v115 audit as **the strongest remaining candidate for an unfound root cause in this repo.**
Fixed in `HANDOVER-v44`, `v49`, `v54` and `v70`, each as its own CSS correction.
No handover names a shared cause and no Tier 1 entry was ever written, which is the signature of a symptom being treated four times.
`tests/empty-states.test.js` exists but postdates all four, so it pins the current state rather than the thing that kept breaking.
Requirements: read the four fixes together, name the shared cause or state positively that there isn't one, and if there is, write the trap.
Out of scope: a visual redesign of any empty state.
Do after: **V10** - the empty-state CSS is mid-redesign until the v3 phase lands (V8 redesigns the empty states outright, V9 moves mobile layout), so a root cause named now is named against layout that is still moving. (Was `Do after: Q10`; re-pointed 9 Aug 2026 when the v3 package superseded that sweep.)

## blocked  Re-pin claude-code-action to a release tag
Problem: `.github/workflows/code-review.yml` pins `anthropics/claude-code-action` to commit `751e0038` - **main's head on 8 Aug 2026, not a release.**
Forced, not a preference: at the current release (v1.0.187) `validateTrackProgressEvent` THROWS on the `labeled` action, so the label trigger - the primary way a review is now requested - could not work at all with `track_progress: true`.
Dropping `track_progress` was the alternative and it is the worse one: that is exactly the "runs, finds things, publishes nothing" failure this repo has already paid for twice.
A commit pin is immutable, so this is safe rather than floating - but it is **unreleased third-party code**, and an unreleased pin that nobody revisits is how a temporary decision becomes permanent.
Requirements: once a release ≥ v1.0.188 contains upstream `d573b167`, pin back to `@v1` - one line. The check is in a comment above the pin:
`gh api repos/anthropics/claude-code-action/contents/src/modes/detector.ts?ref=v1 -H 'Accept: application/vnd.github.raw' | grep -A6 'const validActions'` - if `labeled` appears, re-pin.
Blocked on: upstream, not Max. Nothing to decide; check it when a batch next touches the workflow.

## blocked  Staging Supabase - configured but not reachable from a session
**DECIDED 8 Aug 2026 (Max): a free second Supabase project**, not paid branching - he confirmed separately he does NOT need Supabase Pro.
**Max's part is DONE.** He created the project and sent the ref during the v121 batch; `.mcp.json` has carried `supabase-staging` → `pboidoxjghntalovzrke` since. **Nothing is waiting on him here** - do not re-ask.

Blocked on: **APPROVAL, not connectivity - AUDIT-v135 (D1) measured it.** `claude mcp list` shows `supabase-staging ... ⏸ Pending approval (run `claude` to approve)` while production shows Connected. The queue's old "paused project" theory was wrong; unpausing would not have helped.
**The fix is one step and it is Max's: in an interactive `claude` session, approve the `supabase-staging` MCP server when prompted.** After that, `mcp__supabase-staging__*` should exist at runtime and everything below unblocks - migration rehearsal, destructive testing, empty-account testing - and the "every migration is unrehearsed" warning retires.
⚠️ **Until it resolves, every migration still goes straight to production with no rehearsal** - which `CLAUDE.md` Tier 3 names as the safeguard that replaced the hand-run rule. That safeguard is currently not available, and a batch should say so out loud before applying anything that is not a behavioural no-op.

Problem: `.mcp.json` points at production.
Every batch since v89 has run against live data.
Migrations cannot be rehearsed, nothing destructive is testable, and an empty account cannot be tested at all because production is never empty.
Requirements: migrations apply to staging first and are verified there before Max runs them in production.
Local state cannot cross environments - demonstrate it, do not assert it.
Empty, realistic and scale seeds (12 menus, several hundred products, plates on multiple menus).
Out of scope: multi-tenant, auth, RLS policy work.

## next  Floating layers and mobile dropdowns
Problem: dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying.
⚠️ **"Five independent placement implementations" is an UNVERIFIED count and looks wrong** - flagged by the v119 review, 8 Aug 2026.
`anchorDrop` / `dropPlace` / `dropBox` (`app.js:5783–5813`) is ONE shared engine reused across several call sites, not five separate ones; a first pass counts about four real position-computing paths, or six if unpositioned suggestion boxes are included loosely.
**Count them properly before planning off the number** - every enumeration in this project has come back different from the guess.
Requirements: usable one-handed on a 380px phone.
One placement implementation.
Do after: **V6** - the v3 phase restructures every layout a dropdown opens over (sidebar shell, full-page builder, bottom sheets), so doing placement first means doing it twice; V6 is when the layer system settles. (Added 9 Aug 2026 when the v3 package arrived; the same argument previously sequenced this behind Q6.)
(The `Do after: Q6` line was DELETED 9 Aug 2026 by the v125 audit's sweep - Q6 shipped as v125, so the dependency is satisfied and this item is unblocked. The audit noted the line survived one batch past its trigger: the deletion rule works only when the sweep actually runs.)
**The old prose sequencing here was WRONG and is the reason `Do after:` exists.** It said this waited on "the builder-as-modal conversion landing" - a conversion that had already shipped in **v54**, so the item sat behind a satisfied dependency for two years of versions with nothing able to notice.
Q6 is a real, checkable prerequisite; that one was not.

## next  pdf.js 4.2.67+
Problem: 3.11.174 carries CVE-2024-4367. Mitigated in v88 (`isEvalSupported:false`), not fixed.
Theoretical while Max controls the PDFs, real once strangers upload them.
Requirements: multi-tenant launch gate.
Invoice parsing must still work on the real invoice set afterwards.

## next  Unique ID generation
Problem: nine hardcoded `app_settings` keys, `MENU_ORIGINAL` seeded on every install, `K0001` as every account's first ingredient, `supplier_phrases.id` content-derived so two cafés with one supplier collide by construction, plate and dish ids bare `Date.now()`.
Every write is `.upsert()`, so a collision is a silent overwrite under a green "Saved" banner rather than an error.
Requirements: ids that cannot collide across accounts, plus a migration of the live café's existing rows.
Multi-tenant prerequisite; harmless with one account.

## next  Audit the older Playwright specs for MEANING, not for green
Problem: measured 7 Aug - `screenshots.spec.js` carries **2 assertions for the whole file** (it is a capture harness wearing a spec's clothes), while `fresh-states.spec.js` carries 117 but builds its fixtures by calling `window.addProduct(...)` at **five sites**, a function dead in the app and kept only because these specs are its last handle.
A spec that sets up through a door no user has cannot fail for a reason a user would hit.
Requirements: each spec either asserts something a user would notice, or is retired on purpose and said so.
Downgraded from v111's full 45-test audit.
Note: Playwright is not in `npm test`, so nothing here fails loudly.
That is the reason to look, not a reason to defer.
Do after: **V10** - the redesign keeps forcing honest rewrites of these specs (Q2 alone rewrote `v98-grid.spec.js` wholesale, and the v3 phase will do more), so auditing them now audits specs about to be rewritten anyway. What survives the v3 phase is the set actually worth judging. (Was `Do after: Q10`; re-pointed 9 Aug 2026.)
⚠️ **Coupling found by the v115 audit: `addProduct` is a Tier 1 trap kept alive ONLY by `fresh-states.spec.js`, and the trap says deleting it fails SILENTLY.**
If this item retires that spec, `addProduct` becomes dead in the same commit and nothing will notice.
Close the trap in the same branch, or keep the spec for that reason and write it down.

## next  `doDeleteMenu`'s unawaited dish deletes
Problem: flagged in v114, unchanged.
Same class as the v112 sequencing fixes.
Note: `menu_items.menu_id → menus.id` is ON DELETE SET NULL, so unlike the plate case there is no FK to violate - this is about the change-log entry chaining off the write that actually decides the menu is gone, not about a 23503.

## next  `priceHistory` wholesale-replace at boot
Problem: pre-existing asymmetry flagged at the site.
An empty or filtered server response replaces local wholesale.
`menuHistory` merges; `priceHistory` is the last of the series with the gap - a point logged offline is lost at next sync.

## next  Dead CSS sweep
Problem: six selector families with **zero** emitting markup anywhere in `index.html` or `js/app.js`, verified 7 Aug: `.ref-pill` (6 rules, flagged v46), `.db-tools` (2, flagged v49), `.ing-empty` (10) and `.an-empty` (19, both flagged v58), `.plate-noresult` (1), `.king-tag` (1 rule; its only `js` hit is a comment at `app.js:852` saying the pill was REMOVED, not hidden).
Each has been listed and skipped for scope at least once.
Requirements: a rule comes out only when nothing emits its class - grep both files per selector, not per family.
`.an-empty` and `.an-empty-box` are separate names sharing a prefix; do not let one grep answer for both.
Out of scope: restructuring anything the deleted rules sat next to.
Do after: **V10** - the v3 batches rewrite the markup that owns these selectors and will orphan more CSS of their own (V1's dark-theme removal alone will), so sweeping now does part of the job and leaves a second sweep to run anyway. (Was `Do after: Q10`; re-pointed 9 Aug 2026.)

## next  Small, each independently shippable
- **`.github/workflows/test.yml:174` count comment is stale** ("9 specs, 8 survive" - actual 17/16; AUDIT-v135). The guard is correct and fails closed; only the number lies. Workflow-file change, so it takes the mandatory review despite being a comment.
- **The ~390KB of self-hosted fonts re-download on every deploy** (v132 review): `CACHE` changes per version, `activate` deletes the old cache, and `install` re-fetches every ASSET — including the eight immutable woff2 files — on the mobile connection of an intermittent user. Consider a separate versionless font cache (fonts never change once committed) or fetch-time caching. Also: `cache.addAll`'s `.catch(function(){})` swallows a partial install silently — `tests/settings-toggles.test.js` now pins that every ASSETS path exists on disk, which covers the typo case but not a deploy-time failure.
- **The v3 opaque semantic tints no longer composite with row hover** (v132 review): `--warn-bg`/`--good-bg`/`--bad-bg` went from rgba washes to solid hex, so a tinted row (e.g. an invoice review row) fully masks `.atable tbody tr:hover td{background:var(--hover)}` — hover feedback disappears on exactly the rows being scanned. Decide in V2 (the table system owns row hover): either hover wins via a composited overlay, or tinted rows deliberately don't hover.
- **Three vocabularies name the same three lights** (v131 pre-push review): the Add-to-menu preview says "Slightly under"/"Underpriced" (price framing, `marginLightWord`), the filter chips say "Watch"/"Rework", and the Menu cell now says "over"/"well over" (cost framing). Colour can never disagree (all read `analyze()`); the words meet seconds apart in one flow and frame opposite directions. Unify to one vocabulary or record the split as deliberate at all three sites. Best decided inside V6 (modals) - V4a shipped without touching it (AUDIT-v135 C2 caught the routed-note-evaporates pattern; this line now names only the batch still ahead).
- **Ticking a never-opened add-new form stores the tick nowhere** (v127 review, pre-existing): an AI-appended add-new row ticked before its form is opened keeps the tick only in the DOM; Confirm then fails against a form that does not exist with a toast pointing at no highlight, blocking the import. Decide: either opening the form on first tick, or refusing the tick with copy. Lives on `renderInvReview`'s add-new path.
- ⚠️ **Every line number in this block predates the redesign** (v125 audit: ~290 lines moved in `js/app.js`, ~255 in `css/style.css`). The audit re-measured every claim - all still true in substance; the corrected numbers are in `docs/audits/AUDIT-v125.md` §5. Re-grep by NAME, never by the number.
- **The publish dialog and the Menu row print the same food-cost ratio at different precision** (whole-number % vs one decimal; HANDOVER-125, landed by the v125 audit). Same `cost/price` ratio, two displays - align them or record the split as deliberate at both sites.
- **Builder cost panel: the design's "+ Add to another menu" shortcut was deferred out of Q6** (9 Aug 2026). It needs the manage-menus modal to stack over the open builder and the cost panel to refresh when menus change underneath - both untested territory that was not riding a redesign batch. The panel's "On menus" list ships without it; publishing still lives one tap away on the plate card.
- **`layout-consistency.spec.js` never measures the list BODY** - its comment claims it asserts "the shared left edge", but it stops at the actions row (`panelLeft`/`titleTextLeft`/`btnLeft`), so the v123 Plates surface sitting 4px proud at ≥1024 would have shipped silently; the review caught it, not the spec. Extend it to measure each tab's list-body left edge at both sizes. Found by the v123 pre-push review, 9 Aug 2026. (Also pre-existing and shared: at 561-1023px both Products and Plates sit 4px inside the h2 edge - decide once whether that is the design.)
- **`analyze().absPct` lost its last reader in v122** - the Q3 redesign replaced the "`32% under`" Variance cell (its only consumer) with the food-cost % composition. It is three lines inside `analyze` and part of that pure function's tested shape, so it was kept rather than trimmed mid-batch. Trim it (and its `Math.round`) the next time `analyze` is touched, or keep it deliberately - either way say so at the site. Found by the v122 pre-push review.
- **`edDelArmed` is dead** - declared at `app.js:6910`, written at `:6937` and `:6949`, read nowhere.
  Verified 7 Aug. Delete it.
- **The zero-ingredients builder hint is an UNSTYLED link** - `app.js:820` emits `No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>`, and `style.css` has **no anchor colour rule anywhere**, so it renders browser-default blue: near-illegible on the dark surface, and wrong in light too.
  Found 8 Aug 2026 driving the builder at 380px in both themes. Only reachable with **zero kitchen ingredients**, so Scoopy's never sees it - but it is the first thing a brand-new café sees, inside the modal it is being told to use.
  One rule fixes it. Related to the multi-tenant **Onboarding and empty states** item, but independently shippable, so it sits here rather than waiting for that phase.
- **`.invAppr` (the invoice Apply checkbox) is 26×26px** - the app's last sub-44px touch target, and the one on the highest-stakes screen. v46 skipped it as "inside the protected invoice review area"; **that is not true** - the rule is `style.css:829` and the markup `app.js:6094`, while the protected region runs `app.js:5344–5570`.
  The `::after` hit-area technique already used for `.ms-clear` and `.range-btn` fixes it in one rule with no visual change.
  (The `Do with: Q8` line was DELETED 9 Aug 2026 by the batch sweep - Q8 shipped as v127 without it, so the ride-along never happened and the item is independently shippable again. Q2's lesson stands: `::after` satisfies a thumb but NOT a spec measuring `boundingBox`, so check which kind of pin covers this one before choosing the technique.)
- **`.range-btn` - visual size only, NOT an accessibility item.** The chip is 32px tall (`style.css:2180`) but `style.css:2374–2375` give it a `::after` extending 6px top and bottom, so the tappable area is already 44px.
  What is actually left is that the dashboard now shows controls at two visual sizes after the 44px selector rows.
  Max deferred this 31 Jul; it is a taste call.
  (This entry used to end "not the open a11y item CLAUDE.md still calls it". The v115 audit found `CLAUDE.md` no longer mentions `.range-btn` at all - the three-tier rewrite removed it - so the correction was correcting nothing and has been dropped.)
- **`ingredients.updated_at` is stale and means nothing.** It is NOT history and must never be read as such.
  Either make it honest or drop it - but the reason it is here is so nobody builds on it.
- **`ing_price_history` needs its unique index reconsidered** - same-millisecond writes for one product would collide on `unique (product_id, recorded_at)`.
  Not reachable in practice (a human cannot re-price one product twice in a millisecond, and `applyInvoice` touches a different product each pass), but it constrains the normal price-logging path, so it needs its own brief. 0 duplicate pairs as of 4 Aug, so it would still apply cleanly.
- **`saveIngLog`'s `_ingLogPending` buffer** (`app.js:1347–1379`) has exactly one producer and one consumer on adjacent lines, so it holds at most one point.
  Real simplification, but it sits on the price-log path - not housekeeping.
- The stale v60 target-line comment in `trendChart` (`app.js:2821`) - v61 item 6 superseded the half it describes.
- "Menu item" survives as a fifth object noun in the Edit-menu-item modal.
- The `.chart-hint` / `.scope-note` "all menus" pair under the chart.
- `avgFoodCostForScope` counts dishes whose `menuId` has no By-menu row - latent, zero such dishes on current data.
- `verdictHtml`'s "Nothing costed and priced on this menu yet" branch is unreachable for a NAMED menu since v96 (the only reachable scopes are all-menus and menus with a costed plate).
  The all-menus wording of the same branch is still live, so this is a trim, not a delete.
- **A plate whose NAME contains a digit** (e.g. "Pizza 4 Cheese") fails the money-law number validator, so the Gemini phrasing is dropped and the deterministic template stands.
  Safe degradation, never a wrong number - but those plates never get the warmer wording.
  Found in v90, unchanged.

---

## Multi-tenant phase - do not start until the gates above are done

**Picked up from the v3 design package (9 Aug 2026):** the spec's **Account screen** (§3.9: profile, Team + invite, Plan + billing) and **Delete-workspace modal** (§4: type-the-name-to-confirm) belong to THIS phase - they describe auth, roles and billing that do not exist, and building them as UI shells was declined per §11.5. When this phase builds them, the v3 mocks are their design.

## next  Supabase Auth
Requirements: email/password, optional Google.
Login purges local state (v108 removed the heal machinery that made this collide, so it is now clean).

## next  `business_id` on every table, plus RLS
Requirements: staged, one table at a time, migration by hand, each verified before the next.
RLS with no matching policy returns 200 and an empty array, not an error - a policy mistake looks exactly like "no data".
Note: **`menus` no longer starts from RLS OFF** - corrected 8 Aug 2026, when `20260808_menus_rls.sql` was applied. All eleven public tables now have RLS on with at least one policy, so no table needs ENABLING as well as policying; they all need their permissive `using (true)` policy REPLACED with a `business_id` one.
(This sentence was the one the RLS migration told people to go and fix. It said to fix it in `CLAUDE.md`, where it never lived - the v121 review caught that.)
See the blocked item above.

## next  Roles - owner vs staff
Problem: the app currently tells staff "owner and staff access is already planned" while nothing is built.
That copy ships or comes out.
Requirements: what staff can actually do - read costs but not edit prices?
Import invoices but not delete plates?
**DECIDED (Max, 9 Aug 2026, `docs/decisions/2026-08-09-ANSWERS.md` Q3): TWO roles - owner + working staff.** Staff import invoices and edit ingredients/plates; staff cannot delete plates or menus, change the target, restore backups, or touch billing. No manager role unless a real person at a real café needs one later. The item is unblocked and carries its decision; it still waits for the multi-tenant phase gate above.

## next  Onboarding and empty states
Requirements: every screen at zero, which production has never shown.
**Including how a new café gets a product catalogue at all** - named explicitly here by the v115 audit's triage, because "bulk catalogue bootstrap" was inside this item by implication only and an implied requirement is one nobody builds.
Scoopy's catalogue arrived over months of invoice imports; a second café starting from an empty `ingredients` table has no such history, and an empty catalogue means no ingredients, so no plates, so nothing the app can do.
Needs staging.

## next  The privacy gate
Problem: `CLAUDE.md` names this the single most important thing to reopen before EzPlate serves anyone but Scoopy's, and it has no queue entry.
Invoice text goes to Gemini's free tier via `api/parse-invoice`; plate names and costing numbers go to the same tier via `api/insight`.
That tier **may use prompts for training**.
Max accepted this for his own café - his call, made - and that acceptance does not extend to a second customer's data.
Requirements: a paid-tier Google project that excludes training use, or a privacy policy that discloses it.
Before the first non-Scoopy's row exists, not after.

## next  Gate review before public signup
Requirements: the restore function is `SECURITY INVOKER` and explicitly flagged as not a permanent answer.
Anon key exposure, rate limits on the Gemini endpoint, and whose billing runs it.
Note `GET /api/parse-invoice?probe=1` was already removed in v70; only a key-free `?health=1` remains, which never reports the key.

---

## done - clear weekly

- **project-audit at v135** - run and FILED 9 Aug 2026 (`docs/audits/AUDIT-v135.md`). **Verdict: healthy** - third consecutive clean Tier 1 result, parser region byte-identical across 20 versions, all five overnight batches held the phase rules, zero hardcoded hex, all three spot-checked review fixes hold. Findings landed as the items/edits below (S1/S2/S3+C1+R3 await Max's yes; D1 rewrote the staging item; R1 folded into V4c/V4d; D2/D5 went to PHONE.md).

- **V4b - Plates library** - shipped 9 Aug 2026 as **`ezplate-v135`** (PR #117), handover `HANDOVER-142-plates.md`.
  Column band at ≥640 (rows-present branches only); published-in-accent confirmed as v55's shipped colour (the diff's re-declaration was a review-caught no-op). The review MEASURED the band misaligned with its rows (per-container max-content) and a pre-existing 27px row-to-row drift behind a false Q4 comment - both fixed with shared fixed tracks. **The "row click opens the builder" bullet is DEFERRED to V5** (it would orphan Publish/Print/Delete, §11.6) - pinned in `v135-plates.spec.js` and carried on V5's item.

- **KPI delta pill: DECIDED NO (Max, 9 Aug 2026, `docs/decisions/2026-08-09-ANSWERS.md` Q1).** The v98 deletion now stands twice-decided; the chart is the one trend surface. Closed without building. Do not re-propose.

- **V4a - Menu screen** - shipped 9 Aug 2026 as **`ezplate-v134`** (PR #114), handover `HANDOVER-141-menu.md`.
  Switcher pills at ≥1024 (≤5 menus; the select stays the mobile control and the >5 fallback - the "N more ▾" overflow rides the floating-layers item behind V6), column band + group rows + verdict tint as CSS scoped off the invoice review. Review: 2 majors fixed (focus fell to body on every switch; the click path had zero real coverage behind a comment claiming otherwise), verdict figure kept at v122's size. (6th-menu note moved to docs/PHONE.md - AUDIT-v135 D5.)

- **V2+V3 - Table system + Dashboard** - shipped 9 Aug 2026 as **`ezplate-v133`** (PR #111), handover `HANDOVER-140-table-dashboard.md`.
  Run together per V2's Do-with. Shipped primitives: header band + good/bad pills (row-button base, `.pill-warn`, group rows wait for V4a, their first consumer). Dashboard: KPI strip at ≥1024 (hero stays on mobile until V9 and on the empty state everywhere), band headers, pill deltas, sidebar badge (announced via aria-label), credit reworded to "Phrased by Gemini, computed by EzPlate" with the reveal law untouched. Review: 9 findings all actioned - the headline was "Not costed" counting price-less-but-costed plates under a lying label; the delta pill was removed as a quiet v98 reversal and queued for Max.

- **V1 - Tokens + shell** - shipped 9 Aug 2026 as **`ezplate-v132`** (PR #109), handover `HANDOVER-139-v1-tokens-shell.md`.
  v3 palette light-only (dark fully removed, stale key deleted at boot), Geist/Geist Mono self-hosted + SW-cached, desktop sidebar per §2 with Settings in the bottom group, 48px title bars on the four static tabs, §1.4 entry motion. Spec deviations recorded at the code: AA-corrected muted/bad values (the spec's own §7 claim failed measurement), weights normalised to the four real faces, nav order kept for V9. Review: 13 findings, 4 major - the headline was the sidebar Settings entry running `showTab(undefined)` (blank desktop screen; specs passed against it). Two Small items queued (font refetch per deploy; tint-vs-hover compositing for V2).

- **Menu verdict cell: drop the dollar shortfall** - shipped 9 Aug 2026 as **`ezplate-v131`** (PR #107), handover `HANDOVER-138-verdict-cell.md`.
  The cell states food-cost % vs target only: amber "42.2% · over", red "56.1% · well over" (the word is the hue discriminator the old Q10 asked for), aria-label same wording, green and the dash unchanged. The builder panel's "under suggested" guidance stays by design (V5 keeps it). Review: no majors; the three-vocabularies finding is a new Small item; the rounding-hair "30.0% · over" case is accepted and recorded at the test.

- **Remove the density toggle (the second 9 Aug reversal)** - shipped 9 Aug 2026 as **`ezplate-v130`** (PR #104), handover `HANDOVER-136-density-toggle.md`.
  Control, key, plumbing and CSS deleted; a stale `cafeDB_prodDensity` key is actively removed at boot; `q7-products.spec.js` pins the absence (planted-stale-key cleanup included). Review: no functional defects.

- **Dashboard scope chips → one dropdown (the first of the three 9 Aug reversals)** - shipped 9 Aug 2026 as **`ezplate-v129`** (PR #102), handover `HANDOVER-135-scope-dropdown.md`.
  One `.dash-scope-btn` (current scope name + food-cost % in the v115 anchor-to-target pair) opening the ranked popover: selectable All-menus row first, then worst-first, uncosted excluded, honesty note inside the popover, 44px floor spec-pinned.
  Review: 9 findings, all actioned. The major: the popover had no dismissal path and its open flag survived tab navigation - outside click + Escape now dismiss it, the flag dies with the control, and focus returns to the rebuilt button. The mock's amber third tier was deliberately not taken.

- **Q9 - Settings redesign** - shipped 9 Aug 2026 as **`ezplate-v128`** (PR #99), handover `HANDOVER-134-settings.md`.
  The v81 structure already matched the mock, so this was five CSS deltas folded into it: help-text contrast (`--text2`), quiet AA-passing theme segment (accent-weak + inset accent ring, not solid accent), mono right-aligned target input matching the GST select, desktop's duplicate section title sr-only'd (mobile detail keeps it), nav active 800.
  Review: 8 findings, 5 fixed (incl. the mobile "no persistent selection" leak - weight AND a pre-existing colour), 2 kept-with-comment, 1 queued into Q10 (the app-wide selected-idiom contrast pair).
  **Both riders closed too**: absolute `og:url`/canonical/`og:image`/`twitter:image` shipped (the surviving `TODO(Max)` item), and the "two stale handover-path comments" item was struck as stale - the comments already said `docs/handovers/…`.

- **The five decisions of 9 Aug 2026** - all answered (`docs/decisions/2026-08-08-2-ANSWERS.md`), all recommendations taken, all actioned same-day in one docs batch (handover `HANDOVER-133-decisions.md`):
  **`kitchen_items` DROPPED** (re-verified 0 rows + no code reference immediately before; applied over the production MCP with staging unavailable, said out loud; rollback recorded in `supabase/migrations/20260809_drop_kitchen_items.sql`). Ten public tables now.
  **Five stale `CLAUDE.md` lines corrected** (the original three + the v125 audit's two, taken as the same class - flagged in the answers file in case that overreads the yes).
  **Insight rule D closed** - the rule stays at the code.
  **`ensurePlateForDish` and Stryker unblocked** as normal `next` items carrying their decisions.

- **Q8 - Invoice review redesign + the ticks bug** - shipped 9 Aug 2026 as **`ezplate-v127`** (PR #96), handover `HANDOVER-132-invoice.md`.
  Scoped as planned (verdict sentence · warn tints · live "Confirm N changes" footer · THE ticks fix); the mock's structural rebuild was not taken - it omits the pack-teach/chips/price machinery.
  **The ticks bug (flagged v50, v52, verified 7 Aug) is fixed**: user decisions survive re-renders caused elsewhere; every self-edit to a row's basis resets its own tick to the state default; auto-tick law unchanged. Five clearing sites count-pinned in npm test; the re-render and blanked-price sequences driven in `q8-invoice.spec.js`.
  **The review's second major found the tint had NEVER derived from invRowState in substance** - the old needs-attention duplicate outranked the st-* rules on specificity and owned the paint; invisible while both declared identical values. The duplicate is retired; st-* is the one authority.

- **Q7 - Products redesign** - shipped 9 Aug 2026 as **`ezplate-v126`** (PR #94), handover `HANDOVER-131-products.md`.
  One surface of rows with a Change (drift) column via the shared `ingLastMovePct` rule; the density preference on the ONE legal new localStorage key (in-memory-first so a blocked write cannot mute the toggle); the mobile floating add, BODY-level after the review measured it parked below the fold inside the transform-animating tab; v99's price-basis rule kept by DEDUPE (the label renders exactly when the figure lacks the basis).
  The batch's Q7 riders both landed: the two stale handover-path comments were NOT fixed here (they live in files this batch bumped - carried once more, now attached to Q8's entry), and the '—'-vs-"no cost" language question was resolved by the basis-flag dedupe.
  Review: 11 findings, 2 major (the transform-ancestor FAB; a 36px touch target), all actioned.

- **Harden the naming-inversion guard (audit T1)** - shipped 9 Aug 2026 (PR #92), test-only, no deploy version. Handover `HANDOVER-130-t1-guard.md`.
  The guard now pins the CROSSING itself, both halves: the nav button (attribute + aria-label + visible label on one element) and the panel h2 each tab opens. Verified failing against simulated swaps of each half before committing. The review found the first cut pinned only the nav half - the h2s were unpinned anywhere in the repo.

- **Q6 - Plate builder redesign** - shipped 9 Aug 2026 as **`ezplate-v125`** (PR #89), handover `HANDOVER-128-builder.md`.
  The modal shell stayed (decided twice); inside it: the cost panel (total / suggested / per-menu tinted verdicts) leads the save column at ≥900px with the modal widened to 980 and the docket flattened to columns over the unchanged DOM; under 900px the sticky footer carries total + worst-menu verdict + Save. `renderBuilderCost` renders every surface from the one `updateTotals` figure, lights from `menuMarginPreview`.
  **The review's headline: `rank[light]||3` buried RED** (0 is falsy) - the losing menu never led the mobile footer. And a "flaky spec" chase ended in a real defect: the qtybox's 116px min-content overflowing its 92px grid track into the name column. Both fixed and pinned behaviourally in `tests/visual/q6-builder.spec.js`.
  The mock's "+ Add to another menu" shortcut was deferred to the queue rather than shipped half-tested.

- **Q5 - Ingredients redesign** - shipped 9 Aug 2026 as **`ezplate-v124`** (PR #87), handover `HANDOVER-127-ingredients.md`.
  `renderKitchenPanel` + `#kingList`-scoped CSS: one surface of rows (ingredient / "→ product — brand · supplier" / unit cost), inline drift beside the name via `ingLastMovePct` (the same rule as What-moved, reading `ing_price_history`), and loud broken links ("⚠ product missing — relink to keep N plates costed", "no cost").
  **Two corrections along the way:** the item named `renderIngredients` (the Products screen - the naming inversion caught at planning, fixed in the item before building), and its "count N on BOTH sides" premise was wrong about relink semantics - a relink mutates `k.pid` and cannot heal a legacy bare-pid line, so N counts only the kid arm (the review's major finding; the both-sides law stays at `productRefs`).
  **The review's other major:** the first cut's source-grep test pins passed with the two render branches inverted - the fresh-states spec now renders both new states and asserts the DOM.

- **Q4 - Plates redesign** - shipped 9 Aug 2026 as **`ezplate-v123`** (PR #85), handover `HANDOVER-126-plates.md`.
  CSS only, all `#plateList`-scoped - the card grid became one surface of library rows (name · category / published-where on a fixed column / cost right in mono); the Products tab shares the classes and is untouched until Q7. Zero JS changes; smoke [12]'s pins all hold.
  **The review reproduced a real a11y defect in the first cut:** the row's border box coincided with the surface's padding box, so the shared +2px focus outline was entirely clipped by `overflow:hidden` - a keyboard user on a one-result list had NO focus indicator. Fixed with an inset outline; hover also gated behind `(hover:hover)` and the ≥1024 left edge aligned.

- **Q3 - Menu redesign** - shipped 8 Aug 2026 as **`ezplate-v122`**, handover `HANDOVER-125-menu.md`.
  Desktop: quiet Cost/Suggested, 16px bold Menu price, and the verdict cell composing food-cost % + shortfall ("20.0% ✓", "42.2% · +90c"), light from `analyze()` so preview/chips/row cannot disagree. Mobile: the 2×2 labelled card per plate became one surface of one-line rows. Stripe paint retired; `lt-*` classes stay as wiring.
  **Three deliberate deviations from the mock, all found by the pre-push review:** the column header is **"Food cost", not "Margin"** (the mock needed a footnote to admit its "Margin" number is food-cost % - 27.2% food cost is a 72.8% margin, and the footnote wasn't taken); **"cost it →" was dropped** (the row tap opens the price/category editor, which has no route to the builder since v55 - the arrow promised navigation that doesn't exist; an honest muted dash instead); and the mock's red Seafood row is **amber** here (the light is `analyze()`'s price-shortfall rule, pinned).
  Review also added: `aria-label` on the verdict span (on phones the thead is `display:none`, so it is the cell's only announced meaning), an es-row bold-bleed fix, and wrap containment for pathological verdicts at 320px. Two findings queued instead of fixed: `absPct` (Small) and the amber/red hue-only mobile discrimination (folded into Q10).

- **Q2 - Dashboard redesign** - shipped 8 Aug 2026 as **`ezplate-v120`** (PR #79), handover `HANDOVER-123-dashboard.md`.
  The screen is the design's: eyebrow + 40/44px semantic figure, scope chips with the ≤5 / 6+ collapse and a ranked disclosure, chart as its own card, What moved, and the two-column second row. 782 unit and 102 Playwright green.
  **Two deliberate deviations from the mock, both recorded at the code:** the promoted chips are the two WORST menus, not "two most-used" (no sales volume exists - Rule C); and What moved says "this month", never "last invoice" (one writer, used by both the invoice path and a hand edit).
  **An existing spec caught a real 44px touch-floor regression** the mock's 6px chip padding introduced - the design contradicts itself, its own §15 asking for 52px mobile targets.
  **The pre-push review found dead code carrying live test coverage:** `menuCompareHtml`'s standalone branch could not run, yet two test files pinned the honesty note and the All-menus rule through it. Removed; those tests then asserted against `dashChipsHtml` (itself replaced by `dashScopeHtml` when v129 reversed the chips).

- **Convert the builder to a modal** - closed 8 Aug 2026. **The builder has BEEN a modal since v54**; the item's premise was wrong, and so was the question that produced it.
  ⚠️ **Max's decision is SATISFIED, not reversed.** He answered "make it a pop-up first" and the app is a pop-up - the outcome he chose is the outcome he has. Nobody has quietly undone an against-advice decision, which is the thing `docs/decisions/2026-08-08-ANSWERS.md` warns will happen to exactly this decision. Read that sentence before re-opening this.
  **The question itself was unanswerable as put.** All three options in `docs/decisions/2026-08-08.html` - including the *recommended* "Keep it a full page, fix the dropdowns now" - described a full-page builder that has not existed since v54. Max was asked to choose between two states, one of which was fictional.
  Verified before closing, four ways: `openBuilder()` calls `show('builderModal')`; `#tab-builder` contains **no** builder markup (it is the plates card library); measured in a real browser at 380px and 1280px - centred 600px modal with a 16px radius on desktop, full-height square-cornered takeover on mobile, one visible primary CTA (`saveBtn`) at both, 44×44 close, Save inside the viewport without scrolling.
  **This is the third stale queue item in three batches** (after the zero-menus headline and abbreviation search). All three claimed something was missing that had shipped; all three survived a reconcile without being checked against the code. The 7 Aug reconcile says every item "was checked against the code or production before it was kept" - for these three that was not true.
  **Driving it found a real defect, which is what shipped:** the mobile takeover was never edge-to-edge. `.modal{width:min(640px,calc(100vw - 24px))}` in §"margins locked" sits later in `style.css` than the `@media (max-width:560px)` block's `.modal-builder{width:100%}`, at the same specificity - so it won, and the phone got a square-cornered, 100dvh sheet 24px too narrow, with a 12px gutter down each side. Fixed with a descendant selector; `tests/builder-modal.test.js` resolves the cascade and pins the winner, and was verified failing against the pre-fix sheet.

- **The five decisions of 8 Aug 2026** - all answered, recorded in `docs/decisions/2026-08-08-ANSWERS.md`.
  Two went **against the recommendation** and are flagged there as such, because a decision taken against advice is the one most likely to be quietly reversed later by someone who only sees the advice.
  - **CodeRabbit: NO. GitHub Pro: NO.** Both out of the queue. **Do not re-propose either.** The mandatory pre-push `code-review` agent is unchanged and is now permanently the only second reader; recorded in `CLAUDE.md`.
  - **Builder becomes a modal, and it sets an ORDER** - modal first, dropdowns second. Recorded in `CLAUDE.md` Tier 2.
  - **`menus` RLS fixed now**, migration written and awaiting Max.
  - **Staging: a free second project**, not paid branching.

- **Zero menus + existing history shows a stale headline figure** - closed 8 Aug 2026 as **already fixed, and the item was stale.**
  Max answered "show a dash", which is what the app has done since **v97**: `computeAvgFoodCost` returns null, `verdictHtml` renders `—` plus "Nothing costed and priced yet", and `tests/dash-persist.test.js:400` has pinned it since.
  Reproduced in a real browser at 380px with zero menus and 14 history points before closing: headline `—`, honest line, chart still drawn.
  **The item described pre-v97 behaviour and survived the 7 Aug reconcile without being checked against the code** - the second time in two batches that a queue entry claimed something was missing when it had shipped.

- **Threads that never reached any landing place** - triaged 8 Aug 2026. Two became their own items (the invoice eval harness, the surviving `TODO(Max)`), two were folded into the items that already owned the question (`manager` into Roles, bulk catalogue bootstrap into Onboarding), and one was **closed as already built**.
  **Abbreviation matching in search ships and has since v55.** `kitchenSearchMatches` calls `kingSearchFilter`, which matches a kitchen ingredient against its linked product's description and brand, and `matchTokens` requires every token - so "bread gf" finds ingredient "Bread" via product "Bread GF — TipTop". The comment at `app.js:673` states that example outright.
  **The audit was right that it appeared only in one handover, and wrong to infer it was dropped** - a grep of the process docs cannot see a feature that shipped without one. Worth remembering for the next dropped-threads sweep: check the code, not just the paperwork.
  Also corrected: the `TODO(Max)` was waiting on "once the Vercel domain is fixed", and **the domain has been fixed for some time** - the condition was met and nobody noticed.

- **The three foreign keys are Tier 1 law that the repo cannot check** - verified 8 Aug 2026 against production via `pg_constraint`, recorded as an addendum in `docs/audits/AUDIT-v115.md`.
  **All three match `CLAUDE.md` exactly, and there is no fourth FK in `public`**: `menu_items.plate_id → plates.id` NO ACTION, `plates.menu_id → menu_items.id` SET NULL, `menu_items.menu_id → menus.id` SET NULL.
  So the circularity Tier 1 describes and the restore's delete-dishes-first ordering both rest on verified constraints. `CLAUDE.md` was right; the gap was only that nothing in the repo could show it.

- **Builder plants a draft just from looking** - fixed 8 Aug 2026, shipped in **v118**.
  `savePlateDraft` gated on `draftHasContent` alone, which cannot tell unsaved work from a visit: a loaded plate has content by definition. It now asks `isBuilderDirty()`.
  **The sequencing is why it hid:** `loadPlate` renders BEFORE `openBuilder` arms draft saves, so the FIRST builder open of a session wrote nothing and the bug looked absent; `_draftArmed` then stays true, so the SECOND look-only visit planted the draft.
  **A one-visit test passes against the broken code** - `tests/visual/v118-draft.spec.js` drives two, and was verified failing against the pre-fix condition at both widths before it was committed.
  Second half done too: a draft records the baseline it was taken against, and resuming one whose plate moved since asks first. Cannot-tell cases (new plate, deleted plate, pre-v118 draft) resume silently rather than nagging.

- **Run `project-audit` and FILE the report** - done 8 Aug 2026, filed to `docs/audits/AUDIT-v115.md`.
  **Filed as v115, not the v116 this item originally asked for**, and the audit was right to argue: the `/batch` counter compares the newest `AUDIT-vNN.md` against `sw.js`, which is `ezplate-v115` because v116 shipped no client asset. The item had conflated the handover diary number with the deploy number, so filing as v116 would have put the counter a version ahead of the thing it measures.
  **Verdict: healthy.** 756/756 green, every reachable Tier 1 invariant TRUE, and **no Tier 1 entry dead enough to recommend for deletion** - not the normal result for that check.
  Findings landed as the items above; two were checked and changed before filing:
  **the "12 missing Playwright specs" was NOT drift** (100 is the local total, 88 is CI's set minus `screenshots.spec.js`, verified with `--list` both ways), and the chip-dot device check was fixed in `docs/PHONE.md` rather than queued.

- **Two browser specs cannot run in CI** - fixed 8 Aug 2026, both `test.skip` lines gone, CI runs all 88.
  **One cause, not two,** and it takes two rules together: `*::-webkit-scrollbar{width:10px}` (`style.css:1490`) sets the width and `html{scrollbar-gutter:stable}` (`:2693`) reserves it on every page, scrolling or not.
  macOS draws overlay scrollbars, where a stable gutter reserves nothing; Linux draws a classic one, where it costs 10px everywhere.
  Measured on the runner: `innerWidth` 1280, `documentElement.clientWidth` 1280, fixed-positioning containing block **1270**.
  **So the previous attempt was not wrong about the scrollbar - it was wrong that `clientWidth` is a different number.** Both candidate references read 1280 on Linux, so swapping one for the other could never have helped. The gate spec now MEASURES its reference with a throwaway `position:fixed;inset:0` probe instead of naming it.
  **The second half of the item was wrong and the code won:** the svg never went missing. The trace shows the locator RESOLVING to it and then 53 click retries against `#trendWrap intercepts pointer events`. The chart is sized off the wrapper by its viewBox ratio - 314×102 locally, 304×98.8 on CI - so the hardcoded click at `y=100` was 2px inside on one and outside on the other. **No app defect; the chart does not swap its svg.** The spec clicks the centre now.

Struck at the 7 Aug reconcile, each verified rather than assumed:

- **`Ham Leg Sliced 2Mm` (`P0182`) is fixed.** Stored at **$0.013/g** ($13/kg), not the $0.0003/g CLAUDE.md still records.
  Max corrected it; the ~46× error is gone.
  (CLAUDE.md outstanding item 4 is stale and should be struck there too.)
- **`menu_price_history` RLS** - v97 left it unverified whether the migration had been run.
  It has: RLS on, 2 policies.
- **`+ New plate` silently destroying an unsaved plate** (v83/v84's "one real data-loss gap") - `openBuilderNew` is now `guardUnfinishedPlate(startNewPlate)`.
- **Dashboard scope not persisting across a reload** (v96 follow-up 1) - it persists, via `cafeDB_dashScope`.
- **The v45 `+ Existing dish` spec pin** - reconciled in v100 to `+ Existing plate`; the suite's only standing red is retired.
- **`user-scalable=no`** - removed; the viewport meta is clean.
- **Three "recipes" UI strings** (v83) - gone from `index.html`; the only remaining hits are code comments.
- **`tipText` and `showMatchPrompt`** (Batch 0's dead-code find) - both gone.
  `updatePublishLabel` survived and is live (called at `app.js:4661`).
- **`.ing-per` globally hidden**, so a plate's price basis was invisible (Batch 0)
  - v99 made it visible on purpose, with the reason at the site.
- **`bootstrapSync` wiping local supplier memory on an empty server read** (v106)
  - fixed in v107.
- **The restore importer** (v81's top follow-up) - shipped in v110.
- **Multi-menu publishing** (v54) - shipped; a plate is many-to-many with menus.
- (v115 and earlier batch items moved out previously.)
