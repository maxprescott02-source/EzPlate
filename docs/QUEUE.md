# Queue

Worked top to bottom by `/batch`.
Ordering is priority - move an item up to change what happens next.

Max adds problems here, not briefs: what is wrong, and what must be true when it is fixed.
How is Claude Code's call.

**Reconciled 7 Aug 2026** against `CLAUDE.md`'s outstanding list, the "Deliberately NOT built" / "Found, not fixed" / "Follow-ups" sections of all 66 handovers, and the Batch 0 audit.
Every item below was checked against the code or production before it was kept or added - line numbers and counts are measured, not quoted.
Suite green (0 fail) at reconcile time.

---

## blocked  Builder as modal - decision
Problem: the builder is a full page.
Making it a modal was raised and never decided.
It gates the dropdown work below: the positioning context changes, so fixing dropdowns first means fixing them twice.
Blocked on: Max.
Product decision, not a technical one.

## blocked  Drop `kitchen_items`
Problem: a tenth table nothing reads.
Verified 7 Aug: the table exists, RLS on, one policy, **0 rows**, and no reader or writer in `js/app.js`.
Blocked on: Max's yes.

## blocked  `public.menus` has RLS disabled
Problem: verified 7 Aug - `menus` is the only public table with `relrowsecurity = false` and **zero policies**; the other ten all have RLS on.
Requirements: decide whether this is fixed now or at the multi-tenant gate.
It is harmless single-tenant and a real hole the moment there are two accounts.
Blocked on: Max - the answer depends on whether multi-tenant has a date.

## blocked  `ensurePlateForDish` gives an unlinked row a brand-new EMPTY plate
Problem: correct for a genuinely uncosted row; for one whose real recipe exists in the library it leaves that recipe unreferenced and silently starts a second, empty one.
Flagged in v113, unchanged.
Requirements: a heal that looks for the existing plate before creating one - and an answer for what to do when it finds two candidates.
Note **no path creates an unlinked row**: the class arrives only from history or a restore, and production has **0** of them today (verified 7 Aug).
Blocked on: Max's yes.
It needs its own brief; it is a data-shape decision.

## blocked  The restore's full-wipe step (step 3)
Problem: steps 1 and 2 of the v110 destructive plan were run and passed.
Step 3 - restoring into a genuinely EMPTY database - never was.
What it would newly prove is narrow: that an empty table restores as well as a populated one, and how the boot gate reads mid-restore against nothing.
Requirements: a fresh export taken minutes before, and Max's explicit go on the day.
Not something to schedule.
Blocked on: Max.
Destructive against real data.

## blocked  Two `CLAUDE.md` lines point a batch at the wrong file
Problem: found by the v115 audit. Both are wording, not code - but `CLAUDE.md` says its rules only change with Max's yes.
1. **Tier 2 → Menus** says *"`ensureDefaultMenu` seeds "Original" only when the `menus` table did not answer at all."* The function (`js/app.js:1016`) does no such thing - it seeds whenever the array is empty. The gating is at the **call site** (`js/app.js:457–459`). A batch grepping the function name finds code that looks like it contradicts the rule, and the safe-looking fix is a guard inside the function, which is the wrong place. (The code does defend itself: `:1014–1015` says "The caller decides; this function must never guess".) Also the seeded name is `'Original menu'`, not `"Original"`.
2. **Tier 1 → the `where true` rule** is filed under *"The one that bites while editing code"*, but there is no such code to edit: all five `.delete()` calls in `js/app.js` are `.eq()`-scoped. The `where true` lines are SQL, in migrations that Tier 3 says are applied by hand and never bundled into a batch. The hazard is real; the framing sends a batch to the wrong file.
Requirements: rule 1 names the call site; rule 2 says it is a MIGRATION-authoring trap.
Blocked on: Max's yes. Docs-only, and neither changes what the code does.

## blocked  Insight rule D - promote into `CLAUDE.md`?
Problem: **this item's premise expired and two of its facts were wrong** - corrected 8 Aug 2026 rather than worked around.
1. It said `CLAUDE.md` records these under "Open, NOT bugs", above a "snapshot line". The three-tier rewrite (#69) deleted both that section and the snapshot line, so there is no longer a line to promote anything above.
2. **There is no rule E.** The code carries rules **A–D only** (`js/app.js:2974–2998`); "A–E" was a miscount that the old `CLAUDE.md` propagated. The three-logs rule it was bundled with already IS durable law - it is Tier 1's "Five history series, deliberately separate".
So what is actually left to decide is only rule D (every insight family runs on every render; v90 shipped a panel saying "nothing needs attention" above a bar reporting costs creeping up).
It is written at the function it governs, which is where `CLAUDE.md`'s own test - "true but inferable is a deletion" - says it belongs.
Requirements: either promote rule D and say why the comment at the site is not enough, or close this and leave it where it is.
Blocked on: Max's yes.
Docs-only either way, and the do-nothing answer is defensible.

## blocked  Zero menus + existing history shows a stale headline figure
Problem: with nothing costed, the dashboard still states a percentage from the old series.
Arguably an honesty question.
Pre-existing v89 behaviour, flagged in v96, unchanged.
Requirements: decide what the headline says when there is nothing to average.
Blocked on: Max - it moves the headline number in a state that has shipped for seven versions, so it is not a judgement call.

## blocked  CodeRabbit free tier as the independent second reader
Problem: the GitHub Actions "Code review" workflow was demoted to on-demand on 8 Aug 2026 - 11 runs, 5 silent skips, zero bugs found, ~$20 of Max's personal Claude subscription capacity and ~15 min per batch.
That leaves the pre-push `code-review` agent as the only reviewer, and it runs on the same machine as the batch.
CodeRabbit is now **free for private repos, unlimited**, and has the measured record here: **two criticals in v108 alone**, plus real bugs in v102, v111 and v113.
It was dropped only because a trial expired, not because it underperformed.
Requirements: it reviews every PR, and its findings follow the same rule as any other - fixed, explained, or queued, in the same branch.
Known problems, documented in this repo's own handovers: **the CLI times out**, and **it skips untracked files** - so a brand-new file can pass review by never being read.
Blocked on: **Max.** It needs a GitHub App installed against his account, which no agent can do.

## blocked  Mutation testing (Stryker) - measure the tests that cannot fail
Problem: `CLAUDE.md` names fragile areas where a regression test is mandatory, and nothing checks whether those tests would actually FAIL if the code broke.
A test that passes against broken code is worse than no test, because it is trusted.
The suite is ~756 tests in 0.84s, so mutating it is cheap - the usual reason not to do this does not apply here.
Requirements: a mutation score for the fragile areas specifically, not a repo-wide number; every surviving mutant in those areas is either killed with a new assertion or written down as deliberate.
Blocked on: **Max's yes.** It adds a devDependency, and `CLAUDE.md`'s no-new-dependencies rule means he decides, not the batch.

## blocked  The three foreign keys are Tier 1 law that the repo cannot check
Problem: found by the v115 audit.
`CLAUDE.md` Tier 1 states three FKs with specific ON DELETE behaviours, and Tier 3 states that **the migration files plus their commit messages ARE the audit trail**.
Grepping `supabase/migrations/` for `references` / `foreign key` / `on delete` returns **only negative statements** - none of the three is defined in any migration, because they predate the directory.
So a hard rule that constrains every restore and every delete path rests on nothing the repo can verify, and the one FK the app can actually hit (`menu_items.plate_id → plates.id`, NO ACTION, raises 23503) is the one most expensive to be wrong about.
Requirements: query `pg_constraint` through the Supabase MCP, confirm all three names and ON DELETE behaviours, and record the result where the repo can see it - a migration file that documents existing state, or a line in the audit.
If any differs from Tier 1, the code wins and `CLAUDE.md` is the finding.
Blocked on: a session with the Supabase MCP.
Read-only, nothing destructive, no migration to apply - it just could not be done in the audit's own session.

## next  Threads that never reached any landing place
Problem: found by the v115 audit, which checked `QUEUE.md`, `PHONE.md`, `CLAUDE.md` **and all 68 handovers** for each.
These are not deferred - they were dropped, and nothing anywhere records them.
- **An eval harness for the invoice reader.** Zero hits in all three files and every handover. The invoice path is the app's highest-stakes surface and the only one with an AI in it; there is no way to tell whether a parser or prompt change made it better or worse.
- **Abbreviation matching in search** ("bread gf"). Appears only in `HANDOVER-v83`.
- **`manager` as a third role.** The roles item below specs owner/staff only; `manager` appears in `HANDOVER-v60`, `v82` and `v98` and was never carried forward.
- **Bulk catalogue bootstrap for onboarding.** Inside "Onboarding and empty states" by implication only, never named.
- **The one surviving `TODO(Max)`** - `index.html:11`, the absolute production URL used for `og:url`, canonical and `og:image`. In neither `QUEUE.md` nor `PHONE.md`. (The privacy-policy and contact-details TODOs the older notes mention **no longer exist in the code**.)
Requirements: each either becomes its own item with a real problem statement, or is closed on purpose and said so.
Out of scope: building any of them.
This item is a triage, not a batch.

## next  Menu / empty-state centring - four fixes, no root cause on record
Problem: found by the v115 audit as **the strongest remaining candidate for an unfound root cause in this repo.**
Fixed in `HANDOVER-v44`, `v49`, `v54` and `v70`, each as its own CSS correction.
No handover names a shared cause and no Tier 1 entry was ever written, which is the signature of a symptom being treated four times.
`tests/empty-states.test.js` exists but postdates all four, so it pins the current state rather than the thing that kept breaking.
Requirements: read the four fixes together, name the shared cause or state positively that there isn't one, and if there is, write the trap.
Out of scope: a visual redesign of any empty state.

## blocked  Re-pin claude-code-action to a release tag
Problem: `.github/workflows/code-review.yml` pins `anthropics/claude-code-action` to commit `751e0038` - **main's head on 8 Aug 2026, not a release.**
Forced, not a preference: at the current release (v1.0.187) `validateTrackProgressEvent` THROWS on the `labeled` action, so the label trigger - the primary way a review is now requested - could not work at all with `track_progress: true`.
Dropping `track_progress` was the alternative and it is the worse one: that is exactly the "runs, finds things, publishes nothing" failure this repo has already paid for twice.
A commit pin is immutable, so this is safe rather than floating - but it is **unreleased third-party code**, and an unreleased pin that nobody revisits is how a temporary decision becomes permanent.
Requirements: once a release ≥ v1.0.188 contains upstream `d573b167`, pin back to `@v1` - one line. The check is in a comment above the pin:
`gh api repos/anthropics/claude-code-action/contents/src/modes/detector.ts?ref=v1 -H 'Accept: application/vnd.github.raw' | grep -A6 'const validActions'` - if `labeled` appears, re-pin.
Blocked on: upstream, not Max. Nothing to decide; check it when a batch next touches the workflow.

## blocked  GitHub Pro at $4/month - so a check can actually gate `main`
Problem: branch protection and rulesets require Pro on a private repo (the API returns **403**), so today **nothing can block a merge** - "mandatory review" is a convention, not a mechanism.
$4/month buys the mechanism: a required check that stops a merge with a red review or a failing suite.
Blocked on: **Max.** A spending decision, not a task - there is nothing to build until he says yes.

---

## blocked  Staging Supabase
**Stop condition fired 8 Aug 2026, and it is not something a batch can work around.**
There is no staging project to build against and no agent can create one: the Supabase MCP is scoped to a single `project_ref` (`.mcp.json:5`, production) and exposes no project-creation tool.
The alternative, Supabase's own branching (`create_branch` / `merge_branch`), is a **paid add-on**, so that is a spending decision as well as an account one.
Blocked on: **Max.** Either create a second free-tier Supabase project and add its ref, or say yes to paid branching.
Everything below is what to build once one of those exists, and none of it can start before then.

Problem: `.mcp.json` points at production.
Every batch since v89 has run against live data.
Migrations cannot be rehearsed, nothing destructive is testable, and an empty account cannot be tested at all because production is never empty.
Requirements: migrations apply to staging first and are verified there before Max runs them in production.
Local state cannot cross environments - demonstrate it, do not assert it.
Empty, realistic and scale seeds (12 menus, several hundred products, plates on multiple menus).
Out of scope: multi-tenant, auth, RLS policy work.
Note: this is the loop's most common stop condition.
Until it exists, "autonomous" means halting every second batch to wait for a hand-run migration.

## next  Builder plants a draft just from looking
Problem: opening the builder to LOOK at a plate and closing it with × autosaves a draft, which resurfaces as "Unfinished plate — resume or discard?" on the next visit, possibly a week later.
Resuming against a plate that changed elsewhere could reintroduce stale lines.
Found in v115 flow-testing; pre-existing v82 draft machinery, now reached through `guardUnfinishedPlate` on every entry (`app.js:4844`), so a look-only visit arms the prompt for the next one.
Requirements: looking at a plate leaves no draft.
A draft that does exist cannot silently overwrite newer state.
Out of scope: the builder's layout.

## next  Floating layers and mobile dropdowns
Problem: dropdowns cover the search bar, cannot be scrolled, and the bounce animation is annoying.
Underneath: five independent placement implementations, five separate breakages.
Requirements: usable one-handed on a 380px phone.
One placement implementation.
Blocked on: the builder-as-modal decision above.

## next  Invoice ticks are lost on any re-render
Problem: `renderInvReview()` is a full-row rebuild, and it re-derives every tick from `invRowState` - `checked = (state === 'matched')`.
So a tick the USER put on a review or price-change row is discarded whenever anything else on the sheet re-renders: teaching a pack (`.pt-done`), adding a new item (`.ni-add-btn`), picking a match from a chip.
Only the new-item FORM state is rehydrated across a rebuild (v50 item 1); the ticks are not.
Flagged as a known parallel in v50 and v52, verified still true 7 Aug at `app.js:6130`, `:6146`, `:6157`.
Requirements: a tick the user placed survives a re-render.
The auto-tick rule is untouched - only `matched` rows are ever *pre*-ticked; this is about not throwing away a decision the user already made.
Note: fragile area.
Truth-table diagnosis first, regression test mandatory.

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

## next  Small, each independently shippable
- **`edDelArmed` is dead** - declared at `app.js:6910`, written at `:6937` and `:6949`, read nowhere.
  Verified 7 Aug. Delete it.
- **`.invAppr` (the invoice Apply checkbox) is 26×26px** - the app's last sub-44px touch target, and the one on the highest-stakes screen. v46 skipped it as "inside the protected invoice review area"; **that is not true** - the rule is `style.css:829` and the markup `app.js:6094`, while the protected region runs `app.js:5344–5570`.
  The `::after` hit-area technique already used for `.ms-clear` and `.range-btn` fixes it in one rule with no visual change.
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
- **Two source comments point at the old handover path.** `index.html` names `handovers/HANDOVER-v88.md` and `js/app.js` names `handovers/HANDOVER-v62.md`; both are now under `docs/`.
  Deliberately NOT fixed when the docs moved: editing `js/app.js` even for a comment makes it a shipped change, which forces the six-spot cache bump for zero user benefit.
  Fix them free, with no extra bump, in the next batch that touches those files anyway.
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

## next  Supabase Auth
Requirements: email/password, optional Google.
Login purges local state (v108 removed the heal machinery that made this collide, so it is now clean).

## next  `business_id` on every table, plus RLS
Requirements: staged, one table at a time, migration by hand, each verified before the next.
RLS with no matching policy returns 200 and an empty array, not an error - a policy mistake looks exactly like "no data".
Note: `menus` starts from RLS OFF and zero policies, so it is the one table that needs enabling as well as policying.
See the blocked item above.

## next  Roles - owner vs staff
Problem: the app currently tells staff "owner and staff access is already planned" while nothing is built.
That copy ships or comes out.
Requirements: what staff can actually do - read costs but not edit prices?
Import invoices but not delete plates?
Blocked on: Max.
Product decision; everything technical downstream depends on it.

## next  Onboarding and empty states
Requirements: every screen at zero, which production has never shown.
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
