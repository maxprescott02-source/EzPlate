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

**No live asks for Max.** Both of the previous two are closed: the `menus` RLS migration was written, applied to production and verified as the client on 8 Aug 2026, and the staging project ref arrived the same day.
Migrations are no longer a stop condition at all; `CLAUDE.md` Tier 3 records the reversal.
⚠️ **But staging is still not usable** - the ref is in `.mcp.json` and the server does not load. That is a diagnosis job, not a question for Max; see the item.

**Reconciled 7 Aug 2026** against `CLAUDE.md`'s outstanding list, the "Deliberately NOT built" / "Found, not fixed" / "Follow-ups" sections of all 66 handovers, and the Batch 0 audit.
Every item below was checked against the code or production before it was kept or added - line numbers and counts are measured, not quoted.
⚠️ **Treat that last sentence with suspicion.** Three items that survived this reconcile (the zero-menus headline, abbreviation search, the builder modal) each described something as missing that had already shipped. **Check an item against the code before working it, however confidently it is written.**
Suite green (0 fail) at reconcile time.

---

---

# THE REDESIGN PHASE (added 8 Aug 2026 from Max's brief)

**Q1 is DONE - this block is its output.** Read-only pass over `design_handoff_ezplate_redesign/`: the `README.md` rulebook and `Design Package.dc.html` (tokens, type scale, components, motion/states, density, empty states, keyboard/contrast).
Each item below carries its implementation plan as the indented block under it.

**Where the package lives.** It arrived as `~/Downloads/Redesign_ Dashboard critique and proposal.zip` and is NOT in the repo.
It must land in **`docs/design/`**, never the repo root - Vercel serves the root, and `.vercelignore` already excludes `docs/`.
Left out of the repo for now because Q1 said "no code changes, nothing else"; **committing it is the first action of Q2.**

**The package is unusually accurate about this repo** - all 11 render functions it names exist (`renderDashboard`, `verdictHtml`, `trendChart`, `menuCompareHtml`, `digInHtml`, `renderAnalysis`, `aRow`, `renderIngredients`, `renderPlatesTab`, `renderKing*`, `renderPlate`, `renderInvReview`), as do all 7 ids (`#dashBody`, `#aBody`, `#ingList`, `#plateList`, `#lines`, `#total`, `#builderModal`), and its "no new tokens" claim holds against `css/style.css`.
It quotes `CLAUDE.md`'s own rules back correctly, including the naming inversion and the one-screen-per-batch rule.
**Verified, not assumed** - three queue items in three batches have already been wrong about this codebase.

**Three things in it are wrong or missing. Do not discover these mid-batch:**
1. ⚠️ **The builder redesign is a FULL PAGE, which reverses Max's decision of the same day.** README screen 5 says "Full-page editor", and `Redesign - Plate Builder.dc.html` has the sidebar nav, a "← Plates" back link and no overlay markup. On **8 Aug 2026 Max chose the modal, against the recommendation to keep it a page** (`docs/decisions/2026-08-08-ANSWERS.md`, flagged against advice). The package **contradicts itself** here: its own merge plan item 3 lists `#builderModal` among "every existing hook" to keep. See Q6.
2. **`Current - *.dc.html` and `src/` do not exist.** README line 34 promises them and the zip has 12 files, none of them. So **Q2's "diff against `Current - Dashboard.dc.html`" cannot be done as written.** Diff against the shipped app instead, which is the better reference anyway - the code is the truth here, the mock is an inference.
3. **`--accent-press` already IS the hover-darken value.** The package hardcodes `#A34509`/`#E2792A`; those are `--accent-press` at `style.css:69` and `:100`. Use the token, never the literal.

**Sequencing question for Max, recommendation given, NOT blocking anything below.**
The "Floating layers and mobile dropdowns" item was unblocked this batch and now sits under this phase.
The redesign restructures the layout of every screen a dropdown opens over, so doing dropdowns first means doing them twice - the same argument that sequenced them behind the builder.
**Recommendation: leave dropdowns until after Q6 (Builder), then do them once against the final layout.** Taken as read unless Max says otherwise.

**Order is Max's, and differs from the package's.** He set Dashboard → Menu → Plates → Ingredients → Builder → Products → Invoice → Settings → sweep; the README proposed Products third. His order stands.

**Standing rules for every item below** (from `CLAUDE.md` and the package, which agree):
one screen per batch, one PR, one review · change only the HTML strings the named render functions emit, never restructure `js/app.js` around them · keep every id, `data-tab`, `data-mid`/`data-pid`/`data-scope`, `lt-*`/`st-*` class and the `.mi-row` delegate · no new tokens, no new dependencies, no build step · never rename anything · six-spot cache bump each time · `npm test` **and** the 102 Playwright specs green per batch.

## doing  Q2 - Dashboard redesign
**Branch `feature/q2-dashboard-redesign`, commit 391f4cd, pushed and NOT merged.** Cache already bumped to v120 on the branch.
**Done:** the whole screen — verdict eyebrow + 40/44px semantic figure, scope chips with the ≤5 / 6+ collapse and the ranked disclosure, chart as its own card, What moved, the two-column second row, and the v98 desktop grid rewritten in place. Driven in a real browser at 380px and 1280px in both themes. Unit suite **782 green** (+9 in `tests/dash-chips.test.js`), `node -c` and smoke clean. The design package is committed to `docs/design_handoff_ezplate_redesign/`.
**Left to do, and the ONLY thing standing between this and a PR: 21 dashboard Playwright specs are red** because the screen deliberately changed shape.
They need rewriting one at a time to the new layout - **not a snapshot bless**, which is what the package and `CLAUDE.md` both warn against.
- `v98-grid.spec.js` (10) is the big one and is largely **obsolete by design**: it tests a two-column row 1 and a `.dash-compare` card that no longer exist. Decide per test whether it retires or moves to the new map.
- `v89-dash.spec.js` (5), `v115-reframe.spec.js` (4), `v96-menu-select.spec.js` (1), `v90-flows.spec.js` (1) are mostly screenshot and geometry pins that need re-pointing.
⚠️ **One of these already earned its keep**: `v96-menu-select.spec.js:245` caught a real 44px touch-floor regression the mock's 6px chip padding introduced. Treat the rest as potentially doing the same - read what each was protecting before changing it.
Then: pre-push `code-review` agent (mandatory, different model), PR, merge, handover.


Implement `Redesign - Dashboard v2 Desktop.dc.html` + the Dashboard frame of `Redesign - Mobile States.dc.html`, inside the existing `renderDashboard()` path. Both themes, 380px and desktop.
Out of scope: every other screen. Stop after this one.
> **Plan.** First commit the package to `docs/design/`. Then work outward from `renderDashboard()` and the four helpers it calls, changing only their emitted markup: `verdictHtml` gains the 44px mono semantic headline (one per screen); `trendChart` keeps its existing SVG maths and gains the over-target wash, dashed target line and accent change-markers; `menuCompareHtml` and `digInHtml` become two-column row lists on one surface with hairline separators, not card-per-row.
> Scope chips are new markup around the existing `dashScope` state - **≤5 menus enumerate, 6+ collapse to All + two most-used + "N more ▾"** ranked worst-first with uncosted menus excluded. That ranking is new logic and needs its own unit test.
> The AI panel is a restyle of the shipped insights block, not a rebuild: keep the deterministic-template-then-cross-fade path, the `#ezSparkGrad` reuse (the gradient must stay defined exactly once - `smoke [16]` pins this) and the mandatory credit line. **It must stay read-only** - no control in it may write.
> ⚠️ **Do not touch the per-publication counting.** A plate on two menus counts twice; distinct-plate maths was built, tested and reverted by Max on his own data. The chips make scope more prominent, which makes this MORE tempting, not less.
> Watch: `tests/dash-persist.test.js` pins the zero-state (`—` + "Nothing costed and priced yet") and scope restore; `v89-dash`, `v90-dash`, `v98-grid`, `v115-reframe` and `v96-menu-select` specs all cover this screen and will need honest updating, not wholesale snapshot blessing.

## next  Q3 - Menu redesign
Implement `Redesign - Menu.dc.html` + its mobile frame. Same rules. Stop after.
> **Plan.** `renderAnalysis` / `aRow` only. Desktop becomes a real table inside one surface - sections as small-caps eyebrows (max one per panel), columns Plate / Cost (min–max range beneath) / Suggested / Menu price / Margin.
> The Margin cell composes the verdict in words + figure ("27.2% ✓", "42.2% · +90c", "45.5% · +$2.60", muted "cost it →" when uncosted). **Uncosted is muted, never red** - that is a Design Package rule and also the app's existing meaning.
> Colour stays anchored to the TARGET, not to direction - `tests/trend-reframe.test.js` holds the pair that catches a revert.
> Mobile is one line per plate with the coloured figure carrying the verdict. Keep `data-mid` and the `.mi-row` delegate exactly; the filter toolbar wraps below ~1130px.

## next  Q4 - Plates redesign
Implement `Redesign - Plates.dc.html`. Stop after.
> **Plan.** `renderPlatesTab` only. Card grid becomes library rows on one surface: name·category / published-where (accent when on a menu, muted "Unpublished") / plate cost right-aligned in a fixed mono column.
> Keep `data-pid` and the card click → `openPlateActions(pid)` wiring untouched; this changes what a row looks like, never how it is found.
> Uncosted plates keep "not costed yet" and stay muted. `smoke [12]` asserts the grid, the badges and the cost cell - read it before editing.

## next  Q5 - Ingredients redesign
Implement `Redesign - Ingredients.dc.html`. Stop after.
> **Plan.** The `data-tab="pantry"` screen, UI label "Ingredients" - `renderIngredients`. Rows become ingredient / "→ linked product · brand · supplier" / unit cost, with inline drift % when the last invoice moved it.
> Drift must read from `ing_price_history`, **never `ingredients.updated_at`**, which is a single restore timestamp on every row and means nothing.
> New broken-link state: "⚠ product missing — relink to keep N plates costed" in `--bad`. **Count N on BOTH sides** - the absence of a back-pointer is not evidence nothing was lost.

## next  Q6 - Plate builder redesign
Implement `Redesign - Plate Builder.dc.html` + its mobile frame.
**DECIDED 8 Aug 2026 (Max): "keep the modal".** Unblocked by that answer - it took the recommendation below, so the design's full-page shell is set aside and everything else is taken.
The modal shape now has TWO explicit confirmations from Max on the same day, the second against a design proposing otherwise. **Do not re-open it from the mock.**
> **The recommendation he took: keep the modal shell, take everything else.** The design's substance is the docket columns, the sticky cost panel, the margin verdict block and the mobile sticky footer (total + margin + Save together) - **all of which fit inside `#builderModal` unchanged.** The cost panel can be `position:sticky` within `.mbody` at desktop widths; the modal is already a full-screen takeover under 560px, which is what the mobile frame draws anyway.
> That yields the redesign without reversing a decision, without reopening the dropdown sequencing, and without touching the v118 draft machinery or `guardUnfinishedPlate`.
> If Max does want the full page, say so explicitly and it becomes its own batch with its own risk: every builder entry point, the draft/resume flow, the unfinished-plate guard and the scroll-lock all assume an overlay.
> Either way: `renderPlate` and the `#lines`/`#total` ids stay, and **nothing inside the protected parser region is touched** - the invoice REVIEW UI is fair game, the parsing is not.

## next  Q7 - Products redesign
Implement `Redesign - Products.dc.html` + its mobile frame, including the density toggle. Stop after.
> **Plan.** The `data-tab="ingredients"` screen, UI label "Products". Table rows: product·brand / category / supplier / price (16px mono + unit) / Change column showing drift from the last invoice, semantically coloured, "—" when untouched.
> **The density toggle is the one legal new localStorage key** - a view preference, Comfortable 58px / Compact 40px, compact dropping sub-lines only and never the figure column. It must not store data.
> Mobile stacks price+drift right with a floating + button.

## next  Q8 - Invoice import redesign
Implement `Redesign - Invoice Import.dc.html`. Stop after.
> **Plan. This is the app's most fragile surface - read `CLAUDE.md`'s invoice rules and the existing tests BEFORE editing, and diagnose with a truth table.**
> `renderInvReview` only. Adds the verdict sentence up front ("11 matched and ready · 2 need your eye · 1 new product") and row tints, and a footer "Confirm N changes" counting ticked rows.
> Three invariants must survive, each from a real regression: **full-row re-render only** (per-cell patching left stale cells) · **`.muted-row` hiding stays scoped to `.is-new`** · **tint derives from `invRowState` via `st-*` classes** so the card and the summary can never disagree.
> **Auto-tick rule is unchanged and the design agrees**: only a `'matched'` row is ever pre-ticked, by the renderer AND by every handler.
> Note the queued bug "Invoice ticks are lost on any re-render" lives on this exact code - **fix it in this batch or explicitly not, but decide it, because this batch rewrites the renderer that causes it.**

## next  Q9 - Settings redesign
Implement `Redesign - Settings.dc.html`. Stop after.
> **Plan.** Sectioned modal, markup in `index.html`: left nav with `--accent-weak` active fill, setting rows as label+help left / control right.
> The seven-section drill-down, the AI toggles, the theme segment and the About version line all already exist and are pinned by `smoke [3b]` - this is a restyle of that structure, not a rebuild.
> "Menu item" survives as a fifth object noun in the Edit-menu-item modal; it is a known exception awaiting its own brief, **not a bug to fix on sight here.**

## next  Q10 - System sweep
Apply Design Package §11–15 app-wide: five interaction states per control, skeletons, empty-state variants, keyboard rules, contrast floors, moon/sun theme icon. Verify `prefers-reduced-motion`. No screen-specific changes.
> **Plan. Last on purpose** - it codifies what the eight screen batches established, so running it early would set rules the screens then break.
> Five states on every interactive element (rest/hover/pressed/focus-visible/disabled), **focus ring never removed**. Skeleton bars for waiting regions, never a spinner in a card, never layout shift.
> Empty states are already gold-standard per the package - **carry them over unchanged**, two variants only (A: filters matched nothing; B: true empty). Do not redesign them.
> Contrast floors: `--muted` only ≥12px and only for dispensable text; anything needed to act uses `--text2` or better.
> Fold in the queued **unstyled zero-ingredients link** here if it has not shipped by then - the sheet still has no anchor colour rule at all.
> ⚠️ Verify `prefers-reduced-motion` genuinely disables motion; the app already has a reduced-motion early return in `closeOverlay` that a sweep could easily break.

---

## blocked  Drop `kitchen_items`
Problem: a tenth table nothing reads.
Verified 7 Aug: the table exists, RLS on, one policy, **0 rows**, and no reader or writer in `js/app.js`.
Blocked on: Max's yes.

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

## blocked  Three `CLAUDE.md` lines point a batch at the wrong file
Problem: the first two were found by the v115 audit, the third by the v119 batch. All are wording, not code - but `CLAUDE.md` says its rules only change with Max's yes.
⚠️ **Item 3 is the one that actually costs something** - it is why a whole batch was spent discovering the builder was already a modal.
1. **Tier 2 → Menus** says *"`ensureDefaultMenu` seeds "Original" only when the `menus` table did not answer at all."* The function (`js/app.js:1016`) does no such thing - it seeds whenever the array is empty. The gating is at the **call site** (`js/app.js:457–459`). A batch grepping the function name finds code that looks like it contradicts the rule, and the safe-looking fix is a guard inside the function, which is the wrong place. (The code does defend itself: `:1014–1015` says "The caller decides; this function must never guess".) Also the seeded name is `'Original menu'`, not `"Original"`.
2. **Tier 1 → the `where true` rule** is filed under *"The one that bites while editing code"*, but there is no such code to edit: all five `.delete()` calls in `js/app.js` are `.eq()`-scoped. The `where true` lines are SQL, in migrations that Tier 3 says are applied by hand and never bundled into a batch. The hazard is real; the framing sends a batch to the wrong file.
3. **Tier 2 → Fragile areas** says *"**The builder becomes a MODAL (Max, 8 Aug 2026)** … the builder is converted first, the dropdown placement work second"*, which reads as work still to do. **The builder has been a modal since v54** (verified 8 Aug 2026 in a real browser at 380px and 1280px - see the done entry). A batch reading this line goes looking for a conversion that happened two years of versions ago, and the sentence also holds the dropdown item hostage to it.
   Max's DECISION is not in question and must not be softened - he chose the modal and the app is a modal. What is wrong is only the tense.
   Suggested replacement: *"The builder is a MODAL and has been since v54; Max confirmed this shape on 8 Aug 2026 against a recommendation to change it. The dropdown placement work is therefore unblocked - the positioning context is already final."*
Requirements: rule 1 names the call site; rule 2 says it is a MIGRATION-authoring trap; rule 3 puts the builder in the past tense without weakening the decision.
Blocked on: Max's yes. Docs-only, and none of the three changes what the code does.

## blocked  Insight rule D - promote into `CLAUDE.md`?
Problem: **this item's premise expired and two of its facts were wrong** - corrected 8 Aug 2026 rather than worked around.
1. It said `CLAUDE.md` records these under "Open, NOT bugs", above a "snapshot line". The three-tier rewrite (#69) deleted both that section and the snapshot line, so there is no longer a line to promote anything above.
2. **There is no rule E.** The code carries rules **A–D only** (`js/app.js:2974–2998`); "A–E" was a miscount that the old `CLAUDE.md` propagated. The three-logs rule it was bundled with already IS durable law - it is Tier 1's "Five history series, deliberately separate".
So what is actually left to decide is only rule D (every insight family runs on every render; v90 shipped a panel saying "nothing needs attention" above a bar reporting costs creeping up).
It is written at the function it governs, which is where `CLAUDE.md`'s own test - "true but inferable is a deletion" - says it belongs.
Requirements: either promote rule D and say why the comment at the site is not enough, or close this and leave it where it is.
Blocked on: Max's yes.
Docs-only either way, and the do-nothing answer is defensible.

## blocked  Mutation testing (Stryker) - measure the tests that cannot fail
Problem: `CLAUDE.md` names fragile areas where a regression test is mandatory, and nothing checks whether those tests would actually FAIL if the code broke.
A test that passes against broken code is worse than no test, because it is trusted.
The suite is ~756 tests in 0.84s, so mutating it is cheap - the usual reason not to do this does not apply here.
Requirements: a mutation score for the fragile areas specifically, not a repo-wide number; every surviving mutant in those areas is either killed with a new assertion or written down as deliberate.
Blocked on: **Max's yes.** It adds a devDependency, and `CLAUDE.md`'s no-new-dependencies rule means he decides, not the batch.

## next  An eval harness for the invoice reader
Problem: triaged out of the v115 audit's dropped-threads list, 8 Aug 2026, and it is the one of the five that deserved its own item.
The invoice path is the app's highest-stakes surface and its only AI one, and **there is no way to tell whether a parser or prompt change made it better or worse.** `tests/invoice-gate.test.js` and `tests/inv-gemini-merge.test.js` pin specific decisions on hand-written inputs; neither measures accuracy over a corpus.
So every change to `resolveMatchedPrice`, the taught-pack precedence or the Gemini prompt is judged by whether the unit tests still pass and whether one invoice looked right.
Requirements: a set of real invoices with expected line/price/pack outcomes, and a score that can be compared across two commits.
It must run offline against stored model responses - re-calling Gemini per run would make the score non-deterministic and cost money.
Out of scope: changing the parser or the prompt. This is measurement; acting on what it measures is separate.
Note: this needs Max's real invoice set, and those invoices are commercial data - decide where the corpus lives before collecting it.

## next  The one surviving `TODO(Max)`: absolute social-sharing URLs
Problem: triaged out of the v115 audit, 8 Aug 2026. `index.html:11` says to set an absolute production URL for `og:url` + `<link rel="canonical"/>` and absolute `og:image`/`twitter:image` **"once the Vercel domain is fixed"**.
**The domain IS fixed** - `CLAUDE.md` names `https://scoopyscosting.vercel.app` the stable alias - so the condition this was waiting on has been met and nobody noticed.
Today `og:image` and `twitter:image` are relative (`icons/icon-512.png`, `index.html:16` and `:20`) and there is no `og:url` or canonical at all, so a link pasted into a message thread previews inconsistently or not at all.
Requirements: absolute URLs on all four, the TODO comment removed.
Out of scope: any other head metadata.
Note: touches `index.html`, so it needs the six-spot cache bump - worth folding into a batch already shipping a client asset rather than paying a bump for a preview image.

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
Do after: **Q10** - the empty-state CSS is mid-redesign until the sweep lands, so a root cause named now is named against layout that is still moving. Q10 explicitly carries the empty states over UNCHANGED, which is what makes the target hold still.

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

Blocked on: **the staging MCP server does not load.** Verified 8 Aug 2026, in a session AFTER the one that added it - `.mcp.json` lists both servers, but only the production namespace (`mcp__supabase__*`) exists at runtime and `get_project_url` returns the PRODUCTION ref (`izrnptxhdylllodvglla`). There is no `mcp__supabase-staging__*` tool to call.
v121 predicted it would be "reachable once the MCP reconnects next session". **It was not**, so that prediction is now disproved rather than pending.
Most likely cause, untested: the free project has **paused** after a week idle, which was explicitly accepted as friction at decision time - a paused project would fail to connect and the server would be dropped. Second candidate: the second server needs approval that only the first received.
Next step is diagnosis, not a decision: unpause the project in the dashboard, restart the session, and check whether `mcp__supabase-staging__*` appears. If it does, this item is unblocked and everything below can start.
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
Do after: **Q6** - every screen a dropdown opens over is being restructured by the redesign, so fixing placement against today's layout means computing it twice.
**The old prose sequencing here was WRONG and is the reason `Do after:` exists.** It said this waited on "the builder-as-modal conversion landing" - a conversion that had already shipped in **v54**, so the item sat behind a satisfied dependency for two years of versions with nothing able to notice.
Q6 is a real, checkable prerequisite; that one was not.

## next  Invoice ticks are lost on any re-render
Problem: `renderInvReview()` is a full-row rebuild, and it re-derives every tick from `invRowState` - `checked = (state === 'matched')`.
So a tick the USER put on a review or price-change row is discarded whenever anything else on the sheet re-renders: teaching a pack (`.pt-done`), adding a new item (`.ni-add-btn`), picking a match from a chip.
Only the new-item FORM state is rehydrated across a rebuild (v50 item 1); the ticks are not.
Flagged as a known parallel in v50 and v52, verified still true 7 Aug at `app.js:6130`, `:6146`, `:6157`.
Requirements: a tick the user placed survives a re-render.
The auto-tick rule is untouched - only `matched` rows are ever *pre*-ticked; this is about not throwing away a decision the user already made.
Do with: **Q8** - the bug is IN `renderInvReview`, which is the one function Q8 rewrites. Two batches on one renderer, or one; and fixing it first means fixing it into markup Q8 replaces.
Q8's plan already says to decide this explicitly rather than let it ride.
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
Do after: **Q10** - the redesign is already forcing honest rewrites of a chunk of these specs (Q2 alone rewrote `v98-grid.spec.js` wholesale), so auditing them now audits specs that are about to be rewritten anyway. What survives Q10 is the set actually worth judging.
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
Do after: **Q10** - Q2 to Q9 rewrite the markup that owns these selectors and will orphan more CSS of their own, so sweeping now does part of the job and leaves a second sweep to run anyway.

## next  Small, each independently shippable
- **`edDelArmed` is dead** - declared at `app.js:6910`, written at `:6937` and `:6949`, read nowhere.
  Verified 7 Aug. Delete it.
- **The zero-ingredients builder hint is an UNSTYLED link** - `app.js:820` emits `No ingredients yet — <a href="#" id="bhGo">add your first ingredient</a>`, and `style.css` has **no anchor colour rule anywhere**, so it renders browser-default blue: near-illegible on the dark surface, and wrong in light too.
  Found 8 Aug 2026 driving the builder at 380px in both themes. Only reachable with **zero kitchen ingredients**, so Scoopy's never sees it - but it is the first thing a brand-new café sees, inside the modal it is being told to use.
  One rule fixes it. Related to the multi-tenant **Onboarding and empty states** item, but independently shippable, so it sits here rather than waiting for that phase.
- **`.invAppr` (the invoice Apply checkbox) is 26×26px** - the app's last sub-44px touch target, and the one on the highest-stakes screen. v46 skipped it as "inside the protected invoice review area"; **that is not true** - the rule is `style.css:829` and the markup `app.js:6094`, while the protected region runs `app.js:5344–5570`.
  The `::after` hit-area technique already used for `.ms-clear` and `.range-btn` fixes it in one rule with no visual change.
  **Do with Q8** - same markup Q8 rewrites. (Q2 learned that `::after` satisfies a thumb but NOT a spec measuring `boundingBox`, so check which kind of pin covers this one before choosing the technique.)
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
Note: **`menus` no longer starts from RLS OFF** - corrected 8 Aug 2026, when `20260808_menus_rls.sql` was applied. All eleven public tables now have RLS on with at least one policy, so no table needs ENABLING as well as policying; they all need their permissive `using (true)` policy REPLACED with a `business_id` one.
(This sentence was the one the RLS migration told people to go and fix. It said to fix it in `CLAUDE.md`, where it never lived - the v121 review caught that.)
See the blocked item above.

## next  Roles - owner vs staff
Problem: the app currently tells staff "owner and staff access is already planned" while nothing is built.
That copy ships or comes out.
Requirements: what staff can actually do - read costs but not edit prices?
Import invoices but not delete plates?
**Is there a third role?** A `manager` was sketched in `HANDOVER-v60`, `v82` and `v98` and never carried forward - folded in here by the v115 audit's dropped-threads triage rather than given its own item, because "how many roles" and "what can each do" are one question and answering them apart would answer them twice.
Blocked on: Max.
Product decision; everything technical downstream depends on it.

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
