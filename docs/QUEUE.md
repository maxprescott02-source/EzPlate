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

## blocked  Insights rules D and E - promote above the snapshot line?
Problem: `CLAUDE.md` records the three-logs rule and insight rules A–E under "Open, NOT bugs".
D and E read like durable law, not snapshot state, and the file says rules only move above the line with Max's yes.
Blocked on: Max's yes.
Docs-only either way.

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

## next  Two browser specs cannot run in CI - find out why, don't widen the tolerance
Problem: the Playwright job added 8 Aug 2026 runs 86 of 88 tests. Two are `test.skip`ped when `CI` is set, and the skip is a holding position, not a fix.
Both pass on a Mac and fail on CI's Linux Chromium, and **these specs had never run on any machine but Max's before this**, so the assumptions are years old.
1. `tests/visual/v108-boot.spec.js` - "the gate never paints an empty app underneath itself". `expect(box.width).toBeGreaterThanOrEqual(vp.width - 1)` failed at **1270 against 1280**. The obvious cause is the scrollbar - macOS draws overlay scrollbars at 0px, Linux draws a classic one - **but measuring `documentElement.clientWidth` instead of `page.viewportSize()` did NOT fix it**, so that theory is wrong or incomplete and the real cause is unknown.
2. `tests/visual/fresh-states.spec.js:792` - "v48: tap highlight killed, keyboard focus ring kept". The click times out after 30s with `waiting for locator('#trendWrap svg')`, **even though an explicit `toBeVisible` on the same locator passed immediately before it.** That shape means the svg existed and then stopped existing - a re-render replacing the element. **If the chart really does swap its svg out from under a pointer, that is an app behaviour, not a test artefact** - check that before touching the test.
Requirements: reproduce on Linux Chromium (a container, or push a branch and read the artefact - the job uploads the HTML report and traces on failure), fix the real cause, remove both `test.skip` lines.
Out of scope: widening the tolerance or lengthening a timeout to get a green tick. Two CI runs were already spent guessing from logs; the next attempt should start from a trace, not a theory.

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

## next  Staging Supabase
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
- **`.range-btn` - visual size only, NOT an accessibility item.** Correcting the record: the chip is 32px tall (`style.css:2180`) but `style.css:2374–2375` give it a `::after` extending 6px top and bottom, so the tappable area is already 44px.
  What is actually left is that the dashboard now shows controls at two visual sizes after the 44px selector rows.
  Max deferred this 31 Jul; it is a taste call, not the open a11y item CLAUDE.md still calls it.
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
