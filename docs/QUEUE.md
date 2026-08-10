# Queue

Worked top to bottom by `/batch`.
Ordering is priority - move an item up to change what happens next.

Max adds problems here, not briefs: what is wrong, and what must be true when it is fixed.
How is Claude Code's call.

**Two things decide what runs next, and they are different** (added 8 Aug 2026, after Max asked whether the queue was sorted by blockers alone):

- **`Blocked on:`** - waiting on a person or an outside thing. `/batch` skips it and never guesses the answer.
- **`Do after:` / `Do with:`** - waiting on ANOTHER QUEUE ITEM, because doing this first means doing it twice. It names the item and says what the saving is.

Position in this file is still the priority. These two only decide what gets SKIPPED.

**A note routed at a future item LIVES ON THAT ITEM. Never in the Small list with a pointer at it** (added 10 Aug 2026, after the third instance in three audits).
The failure is specific and it is not the same as a stale `Do after:`: a line saying *"decide this in F5"* sits in a section the F5 batch never opens, so F5 ships without answering it, and the next audit finds the note still pointing at a batch that has now gone past.
The tint-vs-hover note did it **four times** (V2 → F1 → F2 → F5), was wrong the last two, and the fifth re-point would have been wrong too - the collision it described had been deleted underneath it while nobody re-read the code.
AUDIT-v135 C2 named this shape, and it then recurred **twice more in the same file, in the same phase, after being named** (AUDIT-v145 C2 and D2).
**So: write the note into the target item's own body, in the imperative, with "answer it here, do not route it onward".** A Small-list line is for something anyone can pick up, never for something one specific future batch must decide.

**`Do after:` is deleted the moment it is satisfied**, and that is the point of it rather than housekeeping.
The dropdowns item spent two years "sequenced" behind a builder conversion that had already shipped in v54, because the ordering lived in prose that nothing re-checked.
A line naming a finished item is stale by construction, so it gets noticed; a paragraph does not.

**All five questions in `docs/decisions/2026-08-08.html` were ANSWERED on 8 Aug 2026.** The answers are recorded in `docs/decisions/2026-08-08-ANSWERS.md` - read that before re-proposing anything it covers.
Three items left the queue entirely (CodeRabbit **NO**, GitHub Pro **NO**, and the zero-menus headline, which turned out to be **already fixed in v97**).
A fourth - the builder modal - has since closed the same way: **already built, in v54.** See the done entry.

**No live asks for Max as of 10 Aug 2026** - and this line is only trustworthy if whoever changes it counts the `blocked` items rather than copying the sentence. It read "No live asks" while two proposed rules sat waiting for a batch; both were ANSWERED 10 Aug 2026 (he took the recommendation on both, plus the KPI-colour line - see the done section). **The two `blocked` items left are not asks:** the restore's full-wipe waits on the fold-in finishing and then his go ON THE DAY, and the `claude-code-action` re-pin waits on upstream. Neither is a question anyone can answer today.
The decisions #2 file was answered 9 Aug 2026 (`docs/decisions/2026-08-08-2-ANSWERS.md` - all five took the recommendation, all five actioned or unblocked the same day). Both of the previous two are closed: the `menus` RLS migration was written, applied to production and verified as the client on 8 Aug 2026, and the staging project ref arrived the same day.
Migrations are no longer a stop condition at all; `CLAUDE.md` Tier 3 records the reversal.
⚠️ **Staging LOADS but is still EMPTY** (corrected 10 Aug 2026 - this line said "the server does not load", which stopped being true when Max approved the server, and the item below has recorded the correction since). Nothing is waiting on Max and there is nothing to diagnose; what is missing is the schema mirror and the seeds, so every migration is still unrehearsed. See the item.

**Reconciled 7 Aug 2026** against `CLAUDE.md`'s outstanding list, the "Deliberately NOT built" / "Found, not fixed" / "Follow-ups" sections of all 66 handovers, and the Batch 0 audit.
Every item below was checked against the code or production before it was kept or added - line numbers and counts are measured, not quoted.
⚠️ **Treat that last sentence with suspicion.** Three items that survived this reconcile (the zero-menus headline, abbreviation search, the builder modal) each described something as missing that had already shipped. **Check an item against the code before working it, however confidently it is written.**
⚠️ **One of those three examples is itself wrong, which rather makes the point** (AUDIT-v145 D2, 10 Aug 2026): **abbreviation search had NOT shipped** - v55 §G is product-text substring matching, and abbreviation matching was explicitly declined at `js/app.js:701-704` and is still not built. The warning above stands on the other two; do not cite the third until the record is corrected. See *"Abbreviation matching in search has been recorded as shipped for three audits"*.
Suite green (0 fail) at reconcile time.

---

---

# Audit due

## done  project-audit — the counter tripped at v145
**RAN and FILED 10 Aug 2026 as `docs/audits/AUDIT-v145.md`** (batch 155, docs-only, no deploy version). Verdict: **healthy**, and the fold-in phase is the best-disciplined stretch of the three audits so far.
The counter is reset: the next audit is due when `sw.js` reaches **v155**.
What it found, all landed as items below rather than left in the report: the `.legacy` prose contradiction, the tint item's dead F5 pointer, the `kpi-strip.test.js` stub, the abbreviation-matching record correction, and two stale counts (fixed in place, in this file).
**Two results worth carrying forward, because they change what the next batch should believe:**
- **The fourth "test that cannot fail" was searched for deliberately and NOT found.** So the **Mutation testing (Stryker)** item did NOT earn the earlier slot this item offered it - it stays where it is. The three known incidents were each self-caught inside the batch that introduced them, which is the argument for leaving it.
- **All six of AUDIT-v135's `CLAUDE.md` corrections landed exactly as approved** - the first 100% pass-through in three audits. The protected parser region is byte-identical to the hash first recorded at v125 across ten more deploy versions and five screen rebuilds.

## done  The `.legacy` wrapper is described as operative and has never existed (AUDIT-v145 C1)
**DECIDED and shipped 10 Aug 2026, docs-only, no deploy version: the claim is STRUCK, per-screen manual deletion IS the mechanism.** See the done section.

## done  The tint-vs-hover item still points at F5, which disproved its premise (AUDIT-v145 C2)
**CLOSED 10 Aug 2026 without a fifth re-point: the pair does not exist in the code, and the pattern is now a rule at the top of this file.** See the done section.

## done  `tests/kpi-strip.test.js` hand-stubs `fmtTargetPct` instead of extracting it (AUDIT-v145 D1)
**Shipped 10 Aug 2026, test-only, no deploy version.** See the done section.

## done  `extractFn` is hand-rolled in 48 test files because `tests/_extract.js` does not export it
**Shipped 10 Aug 2026, test-only, no deploy version - and the item's "not drifted yet" claim was FALSE. See the done section before citing this item for anything.**
Problem: found 10 Aug 2026 by the pre-push review of the `kpi-strip` stub fix, and it is the same theme one level up - the item was about not hand-rolling a copy of a real function, and **the extractor doing the extracting is itself a hand-rolled copy, 48 times over.**
Measured: **48** of the test files declare their own `function extractFn(src, name)`, byte-identical brace-matching logic; **15** require the shared `tests/_extract.js`.
**The cause is mechanical, not laziness, and it is the whole fix:** `tests/_extract.js` ends `module.exports = build()`, which returns a HARNESS OBJECT of pre-extracted app functions. `extractFn` (`:51`), `extractVar` (`:34`) and `loadApp` are never exported, so a file that wants to extract something `build()` does not already provide has no way to reach the helper and writes its own.
Requirements: export the helpers alongside the built harness (or a separate `tests/_extractfn.js`), then migrate the 48. The migration is mechanical but it is 48 files, so it wants its own batch and its own review, not a ride-along.
⚠️ **"The copies have not drifted yet - checked" was WRONG, and the measurement is the whole story of this batch.** They had drifted three ways: **37** took `(src, name)`, **10** closed over a module-level `SRC` and took `(name)`, **1** took `(src, name, occ)`; and - the one that mattered - **THREE carried the parse guard and FORTY-FIVE did not.** That guard (CodeRabbit, PR #50) exists because the depth counter is brace-naive, so a `}` inside a string ends the slice early and hands back a TRUNCATED function instead of raising. In 45 files that mis-slice was silent.
Out of scope: `build()`'s exported surface, and any change to what the 48 files actually assert.

## done  A flaky-but-GREEN Playwright run throws away the only trace worth having
**Shipped 10 Aug 2026, CI-only, no deploy version. The item's PREMISE was confirmed by measurement and its stated MECHANISM was wrong - see the done section before reusing either.**
Problem: found 10 Aug 2026 by the pre-push review of the `--retries=1` change, as a direct consequence of it.
`.github/workflows/test.yml`'s `Upload Playwright report` step is gated `if: failure()`. With retries on, a run where a test fails once and passes on retry **exits 0 and goes green**, so that step never fires - and the trace for the failed attempt, which Playwright DID retain (`--trace=retain-on-failure` keeps it), is discarded with the runner.
**That is precisely the run you most want to open.** A green-with-flaky run is the only evidence that distinguishes an infra hiccup from an intermittent real regression, and right now it survives as one annotation and a log line, with no DOM snapshot.
Requirements: upload the report when the run had a flaky test as well as when it failed. `if: always()` is the wrong answer and the existing comment says why - a green run's report is megabytes of nothing. The mechanism is a json reporter (`--reporter=github,html,json` + `PLAYWRIGHT_JSON_OUTPUT_NAME`) and a step that greps the result for `"status":"flaky"` and sets an output the upload gate reads; the run step exits non-zero on a real failure, so every step after it needs `if: always()`.
Out of scope: the retry count itself, and the `github` reporter's annotation, which is correct and is the signal that a human is meant to read.
Note this is machinery in a job kept deliberately minimal, which is why it was queued rather than bolted onto the change that revealed it.

## done  The Playwright job has no retries, so one slow context launch fails the whole PR
**Shipped 10 Aug 2026, CI-only, no deploy version - and the item's own honesty premise was DISPROVED by the review; read the done entry before citing it.** See the done section.

## next  `v141-sync-corner.spec.js` has now failed IN SETUP twice, on two independent runs
Problem: found 10 Aug 2026 while rehearsing the flaky-upload gate locally - the rehearsal itself went flaky, which is the first time this repo has caught one outside CI.
`v144: the persistent states are tinted, the transient ones stay quiet @ light` failed attempt 0 with **`browser.newContext: Target page, context or browser has been closed`** and passed attempt 1.
**That is the SECOND setup-phase failure in this one spec file.** The first was `Test timeout of 30000ms exceeded while setting up "context"` in the same file, and it is the incident that bought `--retries=1` in the first place. Two independent runs, two different setup errors, one file.
⚠️ **The innocent explanation is real and must be checked before anything else: this file has the most contexts of any spec** - 12 tests from its width and theme loops, against a handful elsewhere - so being the file that meets an infra hiccup is what you would expect from volume alone. Do the arithmetic (failures per context created, not per file) before calling it a defect.
The spec does NOT manage contexts itself: no `newContext`, no `browser.close()`, only the standard `page` fixture, so nothing in the file's own code is an obvious cause.
Requirements: count setup-phase failures per context across the whole visual suite, then either name a cause in this file or record positively that it is volume and close it. The trace for this exact failure is the kind the gate shipped in this batch now preserves, so the next CI occurrence will come with a DOM snapshot rather than a log line.
Out of scope: the retry count, and the flaky-upload gate, which is done.

## next  "Abbreviation matching in search" has been recorded as shipped for three audits and is not built (AUDIT-v145 D2)
Problem: `docs/QUEUE.md:30` and `:758` both cite "abbreviation search" as a past example of a queue item that described something as missing which had already shipped - one of the three that motivated this file's own "check an item against the code before working it" warning.
**The citation is a different feature.** `js/app.js:673-677`'s `kitchenSearchMatches` (v55 §G) matches the ingredient name and its linked product's description/brand/category/supplier - real and shipped, but a plain substring match (`js/app.js:667-668`, `hay.indexOf(token) >= 0`). There is no abbreviation expansion in the file.
The actual feature - "gf" finding "Gluten Free Bread" with no literal "gf" in the haystack - was **explicitly declined**, and says so a few lines below the code AUDIT-v135 cited as proof it shipped (`js/app.js:701-704`, unchanged since `HANDOVER-v83`: *"the fuzzy matcher can't match abbreviations… it produced duplicate ingredients"*).
`HANDOVER-v120.md:36` flagged the mislabelling once and it did not stick - v121, v122 and v135 each repeated it.
Requirements: **correct the record first**, everywhere it is cited - rename the closed thread to "product-text search (v55 §G)" so it stops being re-verified as done by every future audit. Then decide separately whether real abbreviation/synonym matching is wanted, and if so where the mapping comes from (a hand-maintained dictionary, or nothing). Those are two jobs and only the first is certain.
Note this is the THIRD instance of a correction being written down and not propagated (with C2 above and AUDIT-v135's own C2). If a fourth turns up, the routing itself is the item.

---

# UI defects — desktop shell & tables

Reported 10 Aug 2026 from screenshots of the shipped dark desktop build (Dashboard and Products), read at a 1208px CSS viewport.
**Every number below was re-measured in a real browser at 1208×900, dark, against `ezplate-v144`**, because a queue entry carrying a wrong measurement is worse than no entry (the reconcile warning at the top of this file).
Where a re-measurement disagrees with the report, the measured value is the one recorded and the disagreement is stated.

⚠️ **THE REPORT'S FRAMING NEEDS ONE CORRECTION BEFORE ANY OF THIS IS SCHEDULED, and it changes the whole set.**
It says the shell fixes are "prerequisites for converting any screen" and that most of these "should be resolved by converting the screen rather than patching it".
**Both screens named are already converted, and so is the shell**: shell F1a/F1b (`ezplate-v136`/`v137`), Products F4 (`v140`), Dashboard F6 (`v143`).
There is no pending conversion left to fold any of this into - F7-F10 are the Builder, Invoices, Settings and Account.
So these are **defects in converted code, or deliberate mock-faithful choices**, and each entry below says which. Nothing here is subsumed; nothing here blocks F7.

**Four of the sixteen do not reproduce as described** (2, 3, 9, 10) and one is already queued (14b). They are kept as entries rather than dropped, because the thing the reporter SAW is usually real even when the stated cause is not - `CLAUDE.md`'s rule about never dismissing a finding for a wrong mechanism.

**R-numbers below are FOLD-IN-PROTOCOL.md §3**: R1 presentational, mock wins · R2 real constraint, old behaviour in new dress · R3 dropped control, rehome · R4 missing backend · R5 tie, mock wins.

## done  UI-1  The header bar sits flush to the top of the main region — CLOSED, the mock wins (ANSWERED 10 Aug 2026, `docs/decisions/2026-08-10-ANSWERS.md`)
Measured at 1208: `.scr-head` top **0**, height 48; the title's box runs y12-35 and the scope control's y5-43; `#dashBody` starts at y80.
So there is no clearance above the header bar, which is what was seen.
⚠️ **The AC as written cannot be taken: "≥24px clearance above" contradicts the mock (R1).** The v3 §2 header is a 48px bar flush to the top of `<main>` with a bottom hairline - `<main style="padding:0"><div style="border-bottom:...; padding:14px 32px">` - and all four other converted screens now match it.
⚠️ **The second half of the AC is ALREADY TRUE and should not be "fixed":** title and control are both centred on y≈23.5 in the 48px bar (12+23/2 = 23.5; 5+38/2 = 24). They share a centre line to within half a pixel.
Requirements: decide whether this app deviates from the mock's flush header. If yes it is one change for all five converted screens and it moves every screen's content down; if no, close this and record that the flush bar is deliberate so it is not re-reported.
Out of scope: the header's internal padding, which is the mock's.

**ANSWER 1A: the mock wins, close it.** No code. Recorded here so the same screenshot does not reopen it.
⚠️ **He added "can review later", and that is part of the answer.** The question's own reasoning was that a first-look reaction to a new layout is usually unfamiliarity while a week-two reaction is design. If this comes back after he has lived with the screen it is the SECOND signal the question asked for, not a re-litigation - do not answer it with "decided 10 Aug". The answer then is 1C.
## done  UI-2  The header hairline and the content column have different left edges — CLOSED in the OPPOSITE direction (ANSWERED 10 Aug 2026, `docs/decisions/2026-08-10-ANSWERS.md`)
Measured at 1208: `.scr-head` spans x**260-1172** (912 wide); `#dashBody` and `#ingList` span x**280-1152** (872 wide). Left edges differ by **20px**, widths by 40px.
The report's figures (309→1100 vs 326→1070, 17px and 47px) do not reproduce; the shape of the observation does.
The 20px is `.scr-head`'s own `padding:0 var(--sp-5)`, so the header's TEXT edge is x280 - identical to the content edge. It is the **hairline** that is wider, not the text.
⚠️ **The AC inverts an existing queue item.** "Header rule and all cards share identical left/right edges" is the opposite of the queued *"The v3 screen header bar is not full-bleed"*, which records that the mock's §2 hairline spans the whole main area while content sits at max-width, and that the app is currently too NARROW. Both cannot ship.
Requirements: settle the direction once, for all five converted screens, and close whichever of the two items loses. Note the mock's own header hairline is full-bleed, so R1 favours widening rather than narrowing.

**ANSWER 2A: full-bleed - the rule runs the WHOLE width, wider than it is now.** So this item closes in the opposite direction to the way it was reported, and its "identical edges" AC is dead. The queued item *"The v3 screen header bar is not full-bleed"* is the survivor and is now buildable; do that one, not this.
## next  UI-3  MEASURED AGAINST THE REPORT AND DOES NOT REPRODUCE - content is not width-starved
Report: "~135px gutters each side leave ~744px usable inside a 1017px region (73%)".
Measured at 1208 dark: main region x236-1196 = **960 wide**; content x280-1152 = **872 wide**. Gutters are **44px** a side, and content is **91%** of the region, not 73%.
The mock specifies content `max-width` 960 with 24-32px padding, i.e. ~896 usable - so the app is 24px tighter than the mock, not 273px.
Kept as an entry rather than deleted for two reasons: the reporter's screenshot may have been taken at a different effective width or with a scrollbar, and 44px is still 12px wider than the mock's upper bound.
Requirements: reconcile the gutter to the mock's 24-32px, which reclaims **24px** of column width - and record here what viewport actually produced the reported 73%, because if a real width does, that is a separate and much larger defect than this one.

## next  UI-4  Sidebar nav labels are the same weight as the page title
Measured: page title **15px/600**; sidebar nav label **13px/600**. Two pixels apart at identical weight, which is the reported symptom.
**The cause is the nav, not the title, and it is an R1 deviation already in the code.** The mock's title is 15/600 - the app matches it exactly - while the mock's inactive nav items are `font-size:13px; font-weight:500`, with 600 reserved for the ACTIVE item (`t.weight`). The app renders every nav label at 600, so the active state carries no weight signal either.
AC: inactive nav labels at 500, active at 600, title unchanged at 15/600. Fixing the nav fixes the hierarchy and restores the active-item signal in the same change.

## next  UI-5  Sidebar rhythm, and the gap that is not unexplained
Reported: ~31px nav spacing, an unexplained gap before Invoices/Settings, and a theme toggle crowding the wordmark.
**The gap is `.nav-bottom` and it is the mock's (R1):** v3 §2 specifies "Bottom group above hairline: Invoices, Settings", and F1b shipped it under the mock's own hairline. It is a deliberate section separation, so the AC ("deliberate section separation") is already met - the defect, if any, is that it does not READ as deliberate.
**The toggle is also the mock's:** §2 puts the ⌘K control in the logo row, and F1b put the 22px theme toggle in that slot instead (recorded at the time, because no palette exists to open).
Requirements: measure the nav item spacing against the mock's `padding:7px 10px` and correct only what deviates; then decide whether the bottom group needs a visible hairline it currently lacks. Do not delete the gap.

## done  UI-6  The trend section has no card — CLOSED, the mock wins (ANSWERED 10 Aug 2026, `docs/decisions/2026-08-10-ANSWERS.md`)
Measured: `.dash-trend` computed `border-top-width` **0px**, while `.dash-ins`, `.dash-moved` and `.dash-dig` are all bordered containers. The page does read card / not-card / card.
⚠️ **The AC contradicts the mock and should not be built as written.** §3.1 draws the trend as a bare `<section style="margin-top:36px">` on the page canvas with no border, no band and no fill; only tables and lists are bordered containers in v3 (§2). F6 (`v143`) implemented it that way deliberately and the CSS says so at the site.
The second half of the AC is already true: the range control **is** inside the section header (`.ds-head`), measured at x903-1152 y240, with the section starting at y240 and the chart at y286. It is above the chart because the mock puts it there.
Requirements: this is a decision for Max, not a fix - either the app deviates from the mock and every dashboard section becomes a card, or the mixed rhythm is the design and this closes. Do not resolve it by patching one section.

**ANSWER 1A: the mock wins, close it.** No code. Recorded here so the same screenshot does not reopen it.
⚠️ **He added "can review later", and that is part of the answer.** The question's own reasoning was that a first-look reaction to a new layout is usually unfamiliarity while a week-two reaction is design. If this comes back after he has lived with the screen it is the SECOND signal the question asked for, not a re-litigation - do not answer it with "decided 10 Aug". The answer then is 1C.
## next  UI-7  The trend chart has no x-axis at all  (the ANNOTATION half shipped in v145)
Measured: the only `<text>` elements in the chart are **"36%", "38%", "40%", "42%"** - four y-axis ticks and nothing else. There is no time axis at any range.
The marker annotation is confirmed bare: `trendChart` emits `'−'+mag` with no unit and no subject, so a marker reads "−0.2".
**Split, because the two halves have different rule numbers.** The mock ALSO draws no x-axis (§3.1's chart has three y labels and one annotation), so "add date ticks" is a deviation from the mock and a genuine readability argument - a trend chart whose x-axis is unlabelled cannot be read against the range control that governs it. The annotation is different: the mock's reads **"price change, -0.7"**, so the app's bare "−0.2" is a plain R1 shortfall and is the cheaper half.
**The annotation half is DONE (`ezplate-v145`):** the label reads "−2 pts" rather than a bare "−2", and the SUBJECT stays in the caption ("● marks changes you made") rather than being repeated on every marker, which is what keeps it short enough for the phone's 20px strip. The collision gap moved 30 → 52 units with it, because since v143 a viewBox unit is about a rendered pixel and 30 no longer clears an 8-character label.
**What is LEFT is the x-axis**, and it is a decision rather than a fix: the mock draws no x-axis either, so date ticks are a deviation from it. The argument for them is that a trend chart whose x-axis is unlabelled cannot be read against the range control that governs it.
⚠️ The scrub tooltip already carries the full sentence including the date, so the axis gap is partly covered on hover and not at all on a phone.

## done  UI-8  The chart's y-domain collapses the series into a band when the target is near the data
**REPRODUCED, with the mechanism.** Measured at 1208 with target 30 and data 31.0-32.5: ticks render **25% / 30% / 35%** and the series occupies fractions **0.33 to 0.43** of the plot height - about **10% of the plot, with ~57% dead below it**, which is what was reported.
Control case, target 30 with data 36-42: ticks 36/38/40/42 and the series occupies 0.13-0.88, i.e. 75% of the plot. Healthy.
Cause: `targetInView` is true whenever the target sits within one tick of the data, and `tcTicks(cogsPct, min(dmn,cogsPct), max(dmx,cogsPct))` then stretches the domain to cover the target AND a tick beyond it. **The v60 comment at the site says the opposite** - "the DOMAIN fits the DATA (target excluded), so small margin moves read as movement" - and that sentence is false in exactly the case Max's own data produces, because his target is 30 and his averages sit near it.
**FIXED in `ezplate-v145`.** Re-measured after: the reported case (target 30, data 31.0-32.5) goes from **10% of the plot to 48%**, with the target line still drawn and no axis label rendering off-plot. The far case (36-42) is 75%, unchanged, and a genuinely FLAT series (41.00-41.05) still gets v60's minimum window, so the anti-noise rule was not deleted to make the reported case pass.
Root cause was TWO defensible rules compounding: v60's minimum ~5-pt window and v48's requirement that the target sit on a labelled tick (which forces tcTicks to step 5 on a 5-pt window), with the domain then derived from the outermost TICK ±half a step. The fix splits them - when the target is drawn it already guarantees the span, so the minimum window is not applied on top of it. The stale v60 comment was rewritten in the same change.

## next  UI-9  MEASURED AND DOES NOT REPRODUCE - the dark palette is the spec, and there is no hard-coded hex
Report: "near-black sidebar against a warm dark-grey canvas, inverted from the soft neutral scheme (canvas #232528, sidebar #1E1F22). Almost certainly hard-coded hex."
Measured at 1208 dark: canvas `rgb(35,37,40)` = **#232528**; sidebar `rgb(30,31,34)` = **#1E1F22**.
Those are the two values the report itself names as the spec, in the roles the report assigns them, so the palette is exactly right and is not inverted.
Hard-coded hex, checked across the whole stylesheet below the token block: the only literals outside comments are two `var(--accent,#3a6b4f)` fallbacks, one `var(--card,#fff)` fallback, and the `@media print` block, which is deliberately literal for the printed docket and says so.
Kept as an entry only to record the negative result, so the same screenshot does not produce the same report twice. **Close on read unless a real hex is produced.**
What may actually be behind the observation: sidebar-darker-than-canvas is correct per the mock but is a low tonal step (#1E1F22 vs #232528), so the two planes can read as one on a dim display. That is a legitimate and different question, and it is the one worth asking.

## next  UI-10  The Products Supplier column is empty on every fixture row - measure it against production
Measured, 15 visible rows: the Supplier cell is **"—" on 15 of 15**, and the column band reads Product | Category | Supplier | Unit cost | Last change.
⚠️ **The stated cause is wrong and the correction matters.** The secondary text beside the product name is the **BRAND** (Priestleys, Heinz Watties, Caterers Choice), not the supplier - F4 shipped "Product + inline brand" per the mock's §3.5. Nothing is duplicated, so "one supplier location" would remove a column that is not a duplicate of anything.
The real question is whether Supplier is empty on **Max's** catalogue, which the Playwright fixture cannot answer - it carries no supplier data at all, which is why every row shows a dash.
Requirements: count non-empty `supplier` values across the live `ingredients` table before deciding anything. If most rows are empty the column is dead weight and its width goes to the name column; if they are populated the column is correct and this closes.
Out of scope: the brand, which the mock puts beside the name deliberately.

## next  UI-11  "Last change" prints "steady" on every unchanged row — DECIDED: a dash (ANSWERED 10 Aug 2026, `docs/decisions/2026-08-10-ANSWERS.md`)
Measured: **15 of 15** visible rows print "steady".
⚠️ **The AC contradicts the mock (R1).** Both the §3.4 Ingredients and §3.5 Products rows in `Redesign v3 - SaaS.dc.html` render a muted `steady` for the no-change case - `<span style="font-family:'Geist Mono'; font-size:12px; color:var(--text-3)">steady</span>` - so blank-or-dash is a deviation, not a correction.
The observation is still worth acting on: a column that reads "steady" fifteen times is carrying no information, and the mock's own fixture data has only three of eight rows unchanged, so it never shows what fifteen looks like.
Requirements: Max's decision between the mock's "steady" and a blank. If blank wins it applies to Ingredients too, since they share the wording, and the change is one function.

**ANSWER 3C: a dash (—), not "steady" and not blank.** A deliberate deviation from the mock, on the grounds that the mock's fixture never shows more than three unchanged rows at once and Scoopy's shows fifteen. A dash is what every other "nothing here" cell already renders.
Requirements: applies to **Ingredients as well as Products** - they share the wording and it is one function. Keep the mock's muted `--text-3` mono styling; only the glyph changes.
## next  UI-12  Category values render raw, in mixed case, and truncate mid-word
Measured across 15 rows: `DESSERTS`, `BAKING SUPPLIES`, `SMALLGOODS`, `CLEANING & JANITORIAL`, `HERBS SPICES & SEASONINGS`, `BEEF PORTIONED` sit beside sentence-case `Fish`.
These are supplier-supplied strings stored verbatim, so the mixture is in the data rather than in the rendering.
AC: one casing rule applied at display time, and no mid-word truncation in the category column.
⚠️ Display-time only. The stored value is what the invoice parser and the category derivation both match against, so normalising at rest would be a data migration with a blast radius well beyond this column.

## next  UI-13  A long product name truncates the name and its brand together
Both `.ing-name` and the brand beside it are `flex:0 1 auto` with `min-width:0`, so a long name shrinks both and a row can lose the end of the name AND the brand at once.
AC: a truncation strategy that keeps one label whole - the name is the identifier, so the brand should yield first.
Note F4 already fixed the mobile half of this by dropping the brand below 768 per the mock's own fixture; this is the desktop residue.

## next  UI-14  The Products filter row is wider than it needs to be
Measured at 1208: the control row spans the full 912, with search **365px**, category select **329px**, supplier select **162px**.
The mock's §3.5 control row is a search that grows plus a select sized to content, not three controls sharing the full width.
AC: controls sized to content against the mock, with the reclaimed width going to the table.
⚠️ **The second half of the report - "search shows its clear button while empty" - is ALREADY A QUEUE ITEM** and is not duplicated here. See *"The search ✕ shows on every search bar even when the field is empty"*, which records that it is app-wide across six search bars and must be decided in one place. Confirmed still true while writing this: measured `display:flex` with the field value `""`.

## done  UI-15  KPI values are colour-coded — CLOSED, keep them (ANSWERED 10 Aug 2026, `docs/decisions/2026-08-10-ANSWERS.md`)
Measured: the first two KPI figures render `rgb(229,135,125)` (`--danger`) and the third `rgb(228,227,225)` (`--text`), so "Average food cost" and "Plates over target" are red while "Not costed or priced" is neutral.
The mock does the same: §3.1's `kpis` carry a `color` per cell, red on the first two.
**Recommendation: keep it.** The colour is anchored to the TARGET, not to direction, which is the `trend-reframe` law this app already paid for once - green means at or under target everywhere on this screen, and the KPI figure agreeing with the chart and the sparklines is the point. A delta indicator instead would reintroduce the "vs last month" baseline Max deleted in v98 and declined again on 9 Aug 2026.
**ANSWER 4A: keep them.** No code. Every other figure on the screen is anchored to the target and that consistency is what makes the colour mean anything. Note this also declines a "vs last month" delta for the THIRD time (deleted v98, declined 9 Aug 2026, and it was the mechanism option B needed).
**The one-line `CLAUDE.md` addition is WRITTEN (Max's yes, 10 Aug 2026)** - appended to the Tier 1 *"Chart colour is anchored to the TARGET"* entry, so the question cannot be asked a fourth time from the KPI end. It carries the thrice-declined delta with it.

## next  UI-16  Three accent hues in the trend section — DECIDED: restyle the range pill (ANSWERED 10 Aug 2026, `docs/decisions/2026-08-10-ANSWERS.md`)
Confirmed: the chart line is `--good` or `--bad` by target, the intervention markers are `--accent` orange, and the active range pill is `--accent-weak`/`--accent-ink` orange.
So a healthy section shows green line + orange marker + orange pill.
**Recommendation: keep the marker orange, restyle the range pill.** The marker and the line mean different things and must not share a hue - the marker says "you did this", the line says "this is where you are against target" - and §8 reserves green/amber/red for cost semantics, which is why the marker is accent rather than green. The pill is the odd one out: it is a control, not data, and it is the only element making the count three.
**ANSWER 5B: restyle the range control so the active option is not orange.** The markers STAY orange and that is the load-bearing half - they mean "you did this" while the line means "here is where you stand against target", so the two must never share a hue. The range control is a button rather than data, so it is the one that stops competing.
Requirements: the active state must still be unambiguous at a glance (it is how you know which range you are on). Out of scope: the markers, and the chart line's target anchoring.

---

# THE V3 FOLD-IN (queue reset 10 Aug 2026 per FOLD-IN-PROTOCOL.md §0a/§0b)

**The law of this phase: `docs/design_handoff_ezplate_redesign/FOLD-IN-PROTOCOL.md`.** It supersedes spec §11 (where they disagree, the protocol wins). The spec is `V3-Design-Package.md`; the mocks are `Redesign v3 - SaaS.dc.html` (desktop, 10 screens + 4 modals, light AND dark) and `Redesign v3 - Mobile.dc.html` (9 screens + sheets). Both were clicked through screen-by-screen on 10 Aug 2026 before this reset.

**The direction INVERTED (§0):** the previous pass applied new styling to old markup - skinning, per the old §11's own instructions. The protocol calls the result a hybrid and it is - though the record should stay straight: the pass was not abandoned mid-screen. Five whole batches shipped green and reviewed (V1 tokens/shell, V2+V3 table+dashboard, V4a Menu, V4b Plates = `ezplate-v132`-`v135`); they are hybrids by the new definition (old IA, new paint), not broken halves.
The new law: **the mock is truth for structure, hierarchy and interaction; the app is truth for data, business rules and side effects. Each screen's view layer is REBUILT from the mock and re-attached to the existing logic - never restyled in place.** A screen is fully v3 or fully untouched. **A converted screen deletes its old markup and its old CSS in the same change, each selector grepped against `index.html` AND `js/app.js` first - that per-screen deletion IS the mechanism, and there is no other one.** (The `.legacy` wrapper this line used to describe was STRUCK 10 Aug 2026: it was never built and cannot be - see the protocol's §2 amendment and the done item below.)

**§0a's REVERT IS OVERRIDDEN (Max, 10 Aug 2026): no reset pass, no clean starting line.** The fold-in proceeds from the current shipped state (v135). The V1-V4b paint STAYS until each screen's F-item rebuilds that screen from the mock - a skinned screen is treated exactly like an old screen: fully replaced when its turn comes, never patched further. So §2 binds FORWARD: no NEW skinning, no screen ever half-converted by an F-item; the already-skinned screens are a known, listed, shrinking set (Dashboard, Menu, Plates carry v13x paint), and **conversion state is read from THIS QUEUE'S F-items and nowhere else** - not from the paint, and not from the `.legacy` wrapper this sentence used to name as the second source (struck 10 Aug 2026; it never existed, and this was the THIRD present-tense reference to it, one more than the audit counted - it is the one that mattered most, because the other two described the mechanism while this one instructed a batch to go and read it). The protocol file carries a dated amendment saying the same, so no future session runs §0a's revert off the raw document.

**Conflicts walk the §3 rubric (R1 presentational→mock wins · R2 real constraint→old behaviour in new dress · R3 dropped control→rehome, never delete · R4 missing backend→build what exists, spec the rest, never a dead control · R5 tie→mock wins, note the loss) and the rule number is recorded here.**

**What survives of the 9 Aug decisions:** builder-as-full-page STANDS (rides F7, with the CLAUDE.md "IS a MODAL" edit). **Light-only is SUPERSEDED** - the replacement package ships light + dark and protocol §6 orders both ported verbatim (`data-theme` switch, persisted, OS default); do not cite the 9 Aug answer against it. Geist self-hosted STANDS - already shipped in v132 and stays.

**Standing rules, unchanged by the reset:** naming inversion holds (UI labels "Ingredients"/"Products"/"Plates" over `pantry`/`ingredients`/`builder` internals - only human-read text changes) · protected parser region untouched · **list every handler, data read/write and edge case BEFORE touching a screen; that list is the contract (§5) - keep the ids/data hooks the surviving JS reads, or move the handler deliberately; never discover behaviour by deleting it** · six-spot cache bump per shipping batch · `npm test` + Playwright green per batch (specs pinning old layouts are rewritten honestly in the same change, never deleted to go green) · one screen per change set, one PR, one review; never mix shell work with screen work · §4's last bullet is §11.6's law: every pre-existing flow (add plate, edit qty, import invoice, change price, change settings) completes end-to-end after every commit, or carries a written R3/R4 reason.

**§4 acceptance criteria = the definition of done for EVERY F-screen below** (check them off in the PR): structure matches the mock side-by-side at 1360×900 (same regions in order; row grammar identity-left, mono-figures-right, status-pill-rightmost) · every colour/border/shadow from a token, ZERO hard-coded hex in screen code · Geist for UI, Geist Mono `tabular-nums` for every number · all five states (loading skeleton, empty, error, first-run, permission denied) exist and are v3-styled · mobile counterpart converted in the SAME item per the §6.1 parity map · old component + CSS deleted in the same change · focus ring on every interactive; modals trap focus and close on Esc · no behaviour regression without a logged reason.

## done  CLAUDE.md corrections from AUDIT-v135 - five stale lines + TWO new Tier 1 rules (APPROVED 10 Aug 2026)
Shipped 10 Aug 2026, docs-only, **no deploy version** (no client asset changed - `sw.js` stays at `ezplate-v140`). See the done section.
Problem: the audit verified ~60 CLAUDE.md claims; five are wrong or stale, and one recurring lesson has earned Tier 1 candidacy. Rules there change only with Max's yes.
The corrections (full evidence in `docs/audits/AUDIT-v135.md` §2a):
1. **S1 (the important one):** `pushWrite` "resolves to ... `null` when offline" - NO null path exists; offline resolves `{error}`. A batch following the doc would sequence a dependent write after a failure. The `null` contract belongs to `dbPushMenuAfterPlate`.
2. **S2:** "drops writes silently when fully offline" - the drop is real, "silently" is false (the fail handler toasts "It has NOT been saved").
3. **S3 + C1:** "The dropdown placement work is therefore UNBLOCKED - the positioning context is already final" - both halves false since the 9 Aug reversal (dropdowns are Do-after the floating-layers item, now F10-gated; F7 rehouses the builder). The planned builder-batch edit covers only the "IS a MODAL" line, not this sentence - fold it into F7's edit or fix now. (V5/V6 references re-pointed 10 Aug 2026 at the queue reset.)
4. **S5/D4 (second audit in a row):** name `cafeDB_plateDraft` as the known exception to "localStorage ... never data" (it is authored content, bound to DRAFTKEY so a literal grep misses it).
5. **R3 candidate Tier 1 entry:** "a stub that mirrors a real function must mirror its CONTRACT - extract the real function instead" - four incidents (v113, and three consecutive batches 139-141), same remedy each time, never written as a rule.
6. **ADDED 10 Aug 2026 (F1a batch), same stale-line class:** Tier 3 line 363 says "**staging has never yet loaded in any session**". It loads now - `mcp__supabase-staging__list_tables` was called from a live session on 10 Aug 2026 and answered (empty `public`, as a fresh project should be). AUDIT-v135 (D1) was right that the cause was approval, not connectivity, and Max has since approved the server. **The rest of that line still stands and must NOT be deleted with it:** the schema is empty, so there is still nothing to rehearse against, and every migration is still unrehearsed until the staging queue item runs. Correct the "never loaded" clause only.
7. **ADDED 10 Aug 2026 (F3 batch) - a SECOND new Tier 1 candidate, and the strongest evidence any of these has:**
   > **A `@media` block does not win by being later.** Specificity is compared before source order, so a multi-class selector written outside a media query beats a single-class rule written inside one. Putting the narrow selector on the small screen and the plain one on the large screen inverts the cascade, and the symptom is a rule that looks right in the file and does nothing on screen. When a declaration appears at both breakpoints, give the two rules the SAME specificity.

   **Five instances in ONE screen in ONE batch** (F3/v139): a 4-class sibling chain threw a cell into the wrong column on broken rows; the desktop `—` placeholders lost to a mobile `.is-nil` rule and rendered blank; a dead grid row appeared under every healthy mobile name; the desktop cancel of a mobile `::before` prefix could never win, so a column headed "Used in" read ", in —" on every row; and the header's right-alignment keyed off one class of button and left the other 393px away. Three were found by looking at the app and two by the review - **and the fourth was written into the fix for the third**, which is the case for making it a rule rather than a lesson. F2 (v138) hit the same class twice more (`[hidden]` overrides).
**APPROVED IN FULL (Max, 10 Aug 2026).** He said yes to the five stale-line corrections (1-4 and 6) as the same class as HANDOVER-133, and yes to BOTH new Tier 1 rules - 5 (the stub-mirrors-contract rule) and 7 (the `@media` specificity rule). Nothing here is waiting on him any more; it is now a docs batch to execute.
When it runs: item 3 is the one to read twice, because the planned F7 edit covers only the "IS a MODAL" line and NOT the dropdown sentence - fix the sentence here rather than leaving it for a batch whose scope excludes it. Item 6 corrects the "never loaded" clause ONLY; the rest of that line still stands and must survive.

## done  F1a - Tokens (light + dark) + the theme switch
Shipped 10 Aug 2026 as **`ezplate-v136`**. See the done section for what landed.

## done  F1b - Shell reconcile + the modal/sheet primitive
Shipped 10 Aug 2026 as **`ezplate-v137`**. See the done section.

## done  F2 - Plates (desktop §3.3 + mobile §6, one item)
Shipped 10 Aug 2026 as **`ezplate-v138`**. See the done section.

⚠️ **Read this before every F-item.** The F-items describe the LIST and nothing else, so a batch can rebuild the table, satisfy every criterion the item names, and leave the screen's header and control row wearing v3 tokens over old markup - the hybrid §2 forbids. On F2 those two were the larger half of the CSS. **Every F-item includes its screen's header bar and its filter/search row**, with the screen's own classes.
**Updated 10 Aug 2026 (F4):** `.ing-controls`, `.menu-search`, `.ing-filter`, `.ms-clear` and `.panel` now dress **only the Menu screen** - Plates, Ingredients and Products have all left them. So F5 is the batch that empties them, and restyling any of them before F5 still converts Menu by accident.
**DONE, with two corrections (F5, 10 Aug 2026).** `.ing-controls`, `.ing-filter` and `.ing-clear-filters` are DELETED, and so are the whole v49/v52 panel skeleton (`.panel-actions`, `.panel-sub`, `.panel-meta`, `.an-head`, `.an-controls`) and the entire `.atable` table system. **Two of the five named above did NOT empty and must not be deleted on the strength of this line:** `.menu-search` and `.ms-clear` are still worn by MODAL search boxes (the add-dish search, the product-link search, the tidy search), and `.panel` still dresses the Dashboard until F6. `.atable-wrap` also stays - it is the DIV the invoice review renders inside, and it is not `.atable`.
`.scr-head` (title + muted subtitle + right-aligned actions) is built and is the shared §2 header bar - reuse it, do not rebuild it. `.plib-panel`'s card-suppression rule is the pattern for dropping the old `.panel` card per screen; when the last screen converts, the base `.panel` rule goes.
**The `.ing-*` ROW classes are a different set and are NOT shared** - F4 verified every one is emitted only by `renderIngredients`. Keeping a converted screen's class names (F3 for `.king-*`, F4 for `.ing-*`) is the default; renaming for tidiness is what CLAUDE.md's naming rule forbids. F2 introduced `.plib-*` because Plates was BORROWING another screen's classes, which is a different problem.

## done  F3 - Ingredients (desktop §3.4 + mobile §6, one item)
Shipped 10 Aug 2026 as **`ezplate-v139`**. See the done section.

## next  One action in a mobile screen header - rehome the second one (DECIDED 10 Aug 2026)
Problem: §6's mobile header is "screen title + one action max", and two converted screens ship two.
- **Ingredients (F3):** "Set up from products" beside "New ingredient". The wizard button is CONDITIONAL (`renderKingProgress` shows it only while products are unlinked or skips exist), so most cafés see one action most of the time - but Scoopy's catalogue has hundreds of unlinked products, so Max sees two.
- **Products (F4, added 10 Aug 2026):** "Import invoice" beside "New product", and here it is UNCONDITIONAL. The sidebar's Invoices entry is desktop-only (`.nav-bottom`, hidden below 1024), so on a phone `#importBtn` is the ONLY route into the import flow. F4 applied F3's existing shape rather than improvising a third pattern, and pinned the pair's BEHAVIOUR instead (one row, primary rightmost, no wrap, both widths - `tests/visual/v140-products.spec.js`).
- **Menu (F5, added 10 Aug 2026):** "Existing plate" beside "New menu", and here the mock's own mobile header carries NEITHER - it is menu name + food-cost pill + "Switch ▾". F5 took the mock's trio into the control row directly beneath (R5, recorded at the markup) and left `.scr-head` carrying both actions, rather than answering this question a third time in a third way. It also found the SHARP EDGE of the deviation and pinned it: the mock's desktop label "Add existing plate" wraps the 380px header onto two lines, so the app's shorter "Existing plate" stays, and `tests/visual/fresh-states.spec.js` now fails if the header ever becomes two rows. Two actions is a deviation; a WRAPPED header is a defect, and the two were one keystroke apart.
Hiding either on mobile was rejected for the same reason both times: it strands a whole flow on the device Max actually works on.
**DECIDED (Max, 10 Aug 2026): find another home for the second action. He did NOT take the recommendation to keep both.** So §6's "one action max" holds on a phone, and the header keeps only the primary.
Requirements: one home, used by BOTH screens - they are one question and must not get two answers. The secondary must stay reachable on a phone in one gesture (this is the whole reason it was not simply hidden): "Import invoice" is the only mobile route into the import flow, and "Set up from products" is the only route into linking a catalogue.
The mock has no pattern for this, so the first job is to PROPOSE one and get a yes before building - a candidate is not a decision. Do not ship a third pattern by accident, and do not solve it per screen.
Out of scope: the desktop headers, which the mock does allow to carry both and which measure fine.
Note the pair is currently pinned at both widths in `tests/visual/v140-products.spec.js` and at desktop in `fresh-states.spec.js`; both pins are consciously changed by whoever builds this, not deleted to go green.
Do after: **F10** - every remaining F-item adds a converted header, so a home chosen now is chosen against a set that is still growing, and F8/F9 may well arrive wanting the same slot. Nothing about the current state is wrong or lossy in the meantime; it is a deviation from the mock, recorded and visible.

## done  F4 - Products (desktop §3.5 + mobile §6, one item)
Shipped 10 Aug 2026 as **`ezplate-v140`**. See the done section.

## next  The mobile More screen, and Products/Invoices/Settings/Account as sub-screens under it
Problem: v3 §6 gives the phone a five-tab bar - Home, Menu, Plates, Ingredients, **More** - with Products, Invoices, Settings and Account as sub-screens reached from a More list, each with a "‹ More" back chevron. The app's bottom bar has five DIRECT tabs (Dashboard, Products, Ingredients, Plates, Menu) and no More screen at all, so the desktop sidebar's bottom group (`.nav-bottom`: Invoices, Settings) is CSS-hidden below 1024 and has no mobile counterpart.
F4 (10 Aug 2026) refused to build it inside the Products item, R2 + §2: it is shell work, it moves three screens that are not converted yet (F8 Invoices, F9 Settings, F10 Account), and a "‹ More" chevron pointing at a screen that does not exist is exactly the dead end §6 forbids. F1b had already deferred the same thing, its comment pointing at F9.
So Products ships as a normal bottom-nav tab with its own `.scr-head`, which is honest and complete on its own.
Requirements: one item that builds the More screen (§6's chevron rows in the §6.1 order) AND restructures the bottom bar, AND gives each sub-screen its back chevron - not four separate half-conversions. Every screen it rehomes must already be converted, or the chevron leads somewhere still wearing old markup.
Do after: **F10** - it rehomes Invoices, Settings and Account, so running it earlier means running it again for each screen that converts afterwards. F1b's `.nav-bottom` comment naming F9 is superseded by this item.
Note this is the last piece of §6 that no F-item owns, and without it the desktop↔mobile parity map (§6.1) is unmet by construction - say so if the phase is ever called finished before it lands.

## done  The sync pill covers the right edge of every converted screen's primary button
Shipped 10 Aug 2026 as **`ezplate-v141`**. See the done section - and note the item's own measurement was an UNDERSTATEMENT, which is the reusable part.

## done  The v3 sync/status treatment - spec'd in the package, owned by no F-item
Shipped 10 Aug 2026 as **`ezplate-v144`**. See `docs/handovers/HANDOVER-153-sync-status.md`.
**THE DECISION, so nobody re-opens it from the mock alone: the floating pill STAYS and is dressed** - the item's second option, taken because the first needs two capabilities the app does not have, and building either as UI would be a dead or lying control (R4).
- **The two PERSISTENT states (`offline`, `error`) take §5's danger tint** (`--danger-bg` / `--danger-border` / `--danger`), replacing an amber outline. Both mean writes are being lost, which is the loudest thing this app ever has to say, and an amber outline was the wrong severity as well as the wrong colour. One treatment for both, never per state. ⚠️ The token choice changes nothing on screen today - this app aliases `--bad:var(--danger)` - and the comment at the site says so; it is a claim about which name the rule DEPENDS on, so a future split of destructive-red from cost-red carries the banner with the error token rather than the cost lights.
- **The three TRANSIENT states (`loading`, `saving`, `ok`) keep the quiet surface pill.** §3.1 draws them as header text reading "Synced 4 min ago", which needs a last-sync timestamp - see the behaviour spec below.
- **Placement is UNCHANGED and that is deliberate.** §5 says "in flow"; v141 measured every in-flow home in the top band and all of them fail (the control row, the secondary action at 1024, a permanent ~290px indent). The mock's in-flow position describes a layout with no other bottom chrome. Do not re-open this without re-measuring.
- **`.sync-banner{pointer-events:none}` SURVIVES**, and the ⚠️ on it now records that Retry was considered and refused rather than merely not reached.

## next  "Synced N min ago" - the §3.1 quiet channel needs a last-sync timestamp
Problem: found by the v144 batch, which decided the sync treatment and could not build this half of it.
§3.1's header carries a quiet **"Synced 4 min ago"** at 12px `--text-3`. The app has no last-sync concept at all: `setSync('ok')` shows "Saved" for 1400ms and then hides, so there is nothing to render a relative time FROM.
Trigger: a successful boot load, and every successful `pushWrite`. Data: one timestamp, in memory - it is a derived cache of "when did the server last answer", so it is not a third localStorage category (Tier 2) and does not belong in Supabase either. State: the header shows a relative time that must re-render as it ages, which is the part with a real cost - a ticking element in a screen header on every screen.
⚠️ **Placement is the unsolved half, not the timestamp.** The mock puts it inside the §2 header bar between the title spacer and the actions. This app's `.scr-head` is PER-SCREEN markup in `index.html`, five copies of it, and the sync element is deliberately ONE element - so either it becomes five, which the sync item's own "never per screen" rule forbids, or a single fixed element is aligned into the header band, which is exactly what v141 measured as unworkable there. Solve that before writing any code.
Out of scope: the two persistent states, which are decided and shipped.

## next  Retry on a failed write needs a write queue first, and that is the feature
Problem: found by the v144 batch, which refused to ship the mock's Retry button rather than ship a dead one.
§5's error banner carries a **Retry**. On a failed WRITE there is nothing to retry: `pushWrite` does not keep the builder after it fails, and `CLAUDE.md` records the absence as a known gap ("`pushWrite` **drops** writes when fully offline - no queue, no retry"). A button would either need that queue or would reload and lose the edit anyway.
The one path where Retry is honest is a failed BOOT, and `#bootGate` already owns that with a full-screen message - so there is no gap there either.
Requirements: this is the WRITE QUEUE item, and Retry is its UI. Trigger: a write that fails while the app is open. Data: the pending builders, which are closures - so the queue has to be built from serialisable intent, not from the functions `pushWrite` is handed today, and that is the design problem. State: a queued write must be visible, re-orderable against later edits of the same row, and must not resurrect a delete that succeeded. Error: a retry that fails again must not loop.
⚠️ **If this ships, `css/style.css`'s `.sync-banner{pointer-events:none}` comes out in the same change and the placement is re-measured** - the comment at the site says so, and v141's whole reason for that line was that the element has never held a control.
Note the standing rule this does NOT change: offline already toasts *"you're offline. It has NOT been saved."* The user is told today; what they cannot do is act on it.

## done  F5 - Menu (desktop §3.2 + mobile §6, one item)
Shipped 10 Aug 2026 as **`ezplate-v142`** (PR #130). See `docs/handovers/HANDOVER-151-menu.md`.
Rubric decisions recorded at their sites: R4+R3 on the mock's "New plate" header primary (no builder route from this screen until F7) · R5 on the mobile header (the mock's name+pill+Switch trio moved one row down, because `.scr-head`'s two-actions question is ONE queued item) · R3 on the filter row and on Delete (rehomed to the screen footer as §2's destructive button) · R4 on "cost it" (the honest dash stays) · R1 on "Suggested at 40%" and "Price".
**The "Switch control in the header" line above was NOT followed literally, and that is deliberate** - the mobile mock's header carries no create actions at all because its IA publishes plates from the builder's Publishing card, which is F7. Following it today would have stranded "Existing plate" and "New menu". If F7 rehomes publishing, revisit rather than inherit.

## done  F6 - Dashboard (desktop §3.1 + mobile §6, one item)
Shipped 10 Aug 2026 as **`ezplate-v143`**. See the done section and `docs/handovers/HANDOVER-152-dashboard.md`.
**Two lines of this item were wrong when it was written, and the code won both times** (recorded here because the item read as settled):
- "hero 44 mono + **delta pill**" - the delta pill was **DECIDED NO** (Max, 9 Aug 2026, `docs/decisions/2026-08-09-ANSWERS.md` Q1, "the chart is the one trend surface", closed without building, do not re-propose). The line inherited it from the mock at the queue reset. R2: no pill, at either width; the since-line carries movement and is honest about which series it read.
- "Needs-attention briefing (read-only rows, **bold lead + ONE link each**)" - the app has none of the three. An insight is ONE deterministic sentence with no navigation target, and `applyPhrasedInsights` replaces `textContent` WHOLESALE, so a lead/body split could not survive the Gemini swap that is the point of the panel. R4: single paragraphs in the mock's row chrome; a per-insight link needs a subject the engine does not compute and would be a behaviour spec.

## next  F7 - Plate Builder (desktop §3.7 + mobile §6, one item - full page; the 9 Aug reversal STANDS)
Modal → full-screen page: breadcrumb "Plates /", header = plate name + live food-cost pill + saved state + Duplicate*, left ingredient table (Ingredient | Qty input mono | Unit | Cost | Remove) with add-ingredient footer row, 300px right rail (Cost card: plate cost, recent range*, suggested at 40%, menu price input, amber under-suggested guidance; Publishing card: menu + category selects). Mobile: full-screen push "‹ Plates", sticky bottom summary bar (plate cost + suggested + set-price action) above the tab bar.
Re-attach, never rediscover: the draft machinery (`isBuilderDirty`, `guardUnfinishedPlate`), `#lines`/`#total`, `renderBuilderCost`/`menuMarginPreview`, and the plate↔dish link laws (`plateIdOf`/`plateForMenuItem`/`dishesOfPlate`/`menusOfPlate` only). "Saved just now" renders only when `pushWrite`'s settled promise is ok - never optimistically (the occasional user would rather be told a thing did not save).
**This item flips the Plates row-click to open the builder** (F2's R2 note) - publishing lives here now, so nothing orphans; the pinning spec is consciously changed in this change.
*Duplicate and recent-range are behaviour specs below (R4): visibly disabled with a reason, or absent - never decorative.
**Ships the `CLAUDE.md` Tier 2 edit** ("builder IS a MODAL" → the full-page decision, dated, with the full reversal history) plus the S3/C1 dropdown-sentence correction if the blocked audit item hasn't landed it first.
§4 criteria are the definition of done.

## next  F8 - Invoices (desktop §3.6 + mobile §6, one item)
Dashed dropzone + the upload entry point; the upload modal/sheet's 3 steps (choose → scanning → review) with §4's exact copy ("Nothing changes without your review"), mobile sheet leading with "Take a photo"*. **The review step is a RESTYLE of the shipped flow** - `invConfirmState` law, auto-tick rule (only `'matched'` pre-ticks), pack-teach/chips/price machinery, watchdog + `gemToken` bump: all untouched, regression tests first (`CLAUDE.md` fragile area). Inline amber row for unmatched lines (Link / Skip) - never a modal, never blocks the rest.
**R4, recorded:** the mock's recent-imports table has NO backing store - nothing records an import today. Ship the dropzone and either a visibly-stubbed recents area or none; the store is the behaviour spec below. Never invent a per-session fake.
*Camera capture is its own behaviour spec below.
⚠️ **ANSWER THIS ONE IN THIS ITEM - do not route it onward.** F8 is the batch that can CREATE the tint-vs-hover collision, which is why the note lives here rather than in the Small list where it was re-pointed four times and read by nobody. Today the `.st-review` row is the app's ONLY full-row semantic tint (`--warn-bg`, `css/style.css:2393`) and `.invtable` rows have **no `:hover` rule at all**, so nothing is masked. Every screen F2-F6 converted came out WITH row hover. So if this rebuild gives the review rows a hover wash, an opaque `--warn-bg` will fully mask it on exactly the rows the user is scanning - the v132 review's original finding, arriving for real at last. Decide it here, both themes: hover wins via a composited overlay, or tinted rows deliberately do not hover and the row's affordance is carried by its controls. Either is fine; silence is not, and "decide in the next one" is what this note already did four times.
§4 criteria are the definition of done.

## next  F9 - Settings (desktop §3.8 + mobile §6, one item)
Section cards mapped onto what EXISTS: Costing (target % number input + GST switch, 38×22 orange-on), Data (the JSON backup/restore, restyled). **R4 for everything else the mock shows** - business name, currency, notification toggles (no notification system exists), CSV export, Delete workspace: each is visibly-stubbed-with-reason, absent, or waits for its behaviour spec - never decorative, never silently invented. Mobile: sub-screen under More, back chevron.
§4 criteria are the definition of done.

## next  F10 - Account (desktop §3.9 + mobile §6, one item) - expect this to reduce to ONE QUESTION
⚠️ R4 nearly in full: profile, team, invite, plan and billing describe auth, roles and billing that DO NOT EXIST (the recorded multi-tenant deferral of that machinery stands - see the multi-tenant section). Per §5's stop-and-ask: when this item is reached, put the one question to Max with a recommendation - ship a minimal honest screen for what exists today, or leave Account entirely to the multi-tenant phase and let More/sidebar omit it. Do not build UI shells for absent capabilities either way.
§4 criteria apply to whatever ships.

## Behaviour specs from the package (§11.5, plus the R4 discoveries above) - each needs its brief before build
Written as trigger / data / state changes / error path; the mock is referenced for placement only. UI polish never ships as a feature entry; features never ship as pure UI.
- **Command palette (⌘K)** - Trigger: ⌘K and the sidebar button. Data: the live in-memory arrays (plates, menus, ingredients) + static actions (upload invoice, new plate); no new storage. State: selecting navigates to the screen or opens the action's modal; Esc closes; focus returns to the opener. Error: an honest zero-results row; the chord binds only once the palette exists - never a dead chord.
- **Invoice apply-step wiring** - Trigger: "Apply N updates" on the review step (F8's dressing). Data: the confirmed rows per `invConfirmState`; counts for the "N price updates, M unchanged" footer. State: exactly the shipped apply path - nothing applies without review (§8). Error: per-line inline amber (Link product / Skip this line); a late AI response is dead by `gemToken` law.
- **Invoice import history** (feeds F8's recents; R4) - Trigger: apply time. Data: date, supplier, item count, change count, status - a Supabase table with migration + RLS like the others, plus a retention decision. This is DATA, so never localStorage (Tier 2: there is no third category). State: one row per import; "Failed, retry" rows need a decision on whether pre-store failures are recordable at all. Error: a write failure surfaces via `pushWrite`'s toast, and the import itself must not be blocked by history bookkeeping.
- **Plate Duplicate** (F7's header; R4) - Trigger: the Duplicate button. Data: lines + category cloned into a new UNSAVED plate; name rule to decide. State: publish state NOT copied (a copy published to the same menu would duplicate a dish); interacts with `guardUnfinishedPlate`. Error: unsaved-work guard fires before the clone, not after.
- **Recent range on the cost card** (F7; R4) - Trigger: cost card render. Data: read-only derivation from `priceHistory`; window and copy to define. State: none - display only. Error: fewer than two points renders nothing, never "$X to $X".
- **Mobile camera upload** - Trigger: "Take a photo" on the upload sheet. Data: `capture` on the file input, feeding the EXISTING parse path; no new parsing. State: the same 3-step flow. Error: the existing file-failed path, verbatim wording.
- **CSV export (Settings → Data)** - Trigger: the Data-section button. Data: which objects and columns, to decide. State: a download; nothing else changes. **CSV is an export for humans and NEVER an import path - the JSON backup stays the restore format and the backup-format law is untouched.**
- **Delete workspace** - recorded and GATED on the multi-tenant phase: no workspace concept exists to delete, so the control does not ship before the capability (R4). The type-to-confirm design is banked in the mock and §4 for when that phase builds it.

## superseded  G2 - Tablet pass (768-1023)
Superseded 10 Aug 2026 at the queue reset: it was keyed to the OLD addendum's §17, and the package replacement deleted its reference mock from disk. v3 defines one breakpoint (<768); 768-1023 renders the desktop layout. If the tablet band looks broken during the phase, that is a stop-and-ask with a recommendation - not a resurrection of §17.

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
**SCHEDULED (Max, 9 Aug 2026, answers file Q2): runs when the v3 fold-in phase (F1-F10) finishes, before any multi-tenant work.** (Was "V1-V10 + G2"; re-pointed 10 Aug 2026 at the queue reset - same phase, new item names.) The batch that closes the phase prepares everything and asks for the go.
Blocked on: Max's go on the day — the timing question is answered.
Destructive against real data.

## next  Mutation testing (Stryker) - measure the tests that cannot fail (APPROVED 9 Aug 2026, dev-only)
Problem: `CLAUDE.md` names fragile areas where a regression test is mandatory, and nothing checks whether those tests would actually FAIL if the code broke.
A test that passes against broken code is worse than no test, because it is trusted.
The suite is **848 tests in ~1.5s** (re-measured by the v145 audit, 10 Aug 2026; it read 822/~0.9s at v135 and the count has been found stale by two audits running), so mutating it is cheap - the usual reason not to do this does not apply here.
⚠️ **AUDIT-v145 looked for a fourth "test that cannot fail" specifically, to decide whether this item earned an earlier slot, and did NOT find one** - so it stays where it is. The three known incidents (F6's focus-ring, v143's marker-collision gap, the light-only sync pin) were each caught and fixed inside the batch that introduced them, which is the argument against promoting it. AUDIT-v135's R2 argued the other way on four incidents in v132-v134; the evidence has moved since.
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
Do after: **F10** - the empty-state CSS is mid-rebuild until the fold-in lands (every screen's §5 states are rebuilt from the mock), so a root cause named now is named against layout that is still moving. (Was Q10, then V10; re-pointed 10 Aug 2026 at the queue reset.)

## blocked  Re-pin claude-code-action to a release tag
Problem: `.github/workflows/code-review.yml` pins `anthropics/claude-code-action` to commit `751e0038` - **main's head on 8 Aug 2026, not a release.**
Forced, not a preference: at the current release (v1.0.187) `validateTrackProgressEvent` THROWS on the `labeled` action, so the label trigger - the primary way a review is now requested - could not work at all with `track_progress: true`.
Dropping `track_progress` was the alternative and it is the worse one: that is exactly the "runs, finds things, publishes nothing" failure this repo has already paid for twice.
A commit pin is immutable, so this is safe rather than floating - but it is **unreleased third-party code**, and an unreleased pin that nobody revisits is how a temporary decision becomes permanent.
Requirements: once a release ≥ v1.0.188 contains upstream `d573b167`, pin back to `@v1` - one line. The check is in a comment above the pin:
`gh api repos/anthropics/claude-code-action/contents/src/modes/detector.ts?ref=v1 -H 'Accept: application/vnd.github.raw' | grep -A6 'const validActions'` - if `labeled` appears, re-pin.
Blocked on: upstream, not Max. Nothing to decide; check it when a batch next touches the workflow.

## next  Staging Supabase - reachable at last; mirror the schema and seed it
**DECIDED 8 Aug 2026 (Max): a free second Supabase project**, not paid branching - he confirmed separately he does NOT need Supabase Pro.
**Max's part is DONE.** He created the project and sent the ref during the v121 batch; `.mcp.json` has carried `supabase-staging` → `pboidoxjghntalovzrke` since. **Nothing is waiting on him here** - do not re-ask.

**UNBLOCKED 10 Aug 2026 (F1 batch, step-1 sweep): the approval landed.** `mcp__supabase-staging__list_tables` was called from a live session and answered - empty `public` schema, as a fresh project should be. AUDIT-v135 (D1) had it right: approval, not connectivity, and Max approving the server fixed it.
⚠️ **Rehearsal is still not real until this item RUNS** - the schema is empty, so there is nothing to rehearse against. Until the mirror + seeds exist, a batch should still say out loud that a migration is unrehearsed before applying anything that is not a behavioural no-op. The `CLAUDE.md` Tier 3 "staging has never yet loaded" line is now stale on the "loads" half only - that correction rides the blocked CLAUDE.md-corrections item or the next batch that edits the file with Max's yes.

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
Do after: **F10** - the fold-in rebuilds every layout a dropdown opens over (shell, full-page builder, bottom sheets), so doing placement first means doing it twice; the layer system settles with the last converted screen. (Was V6; re-pointed 10 Aug 2026 at the queue reset. The same argument previously sequenced this behind Q6.)
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
Do after: **F10** - the fold-in forces honest rewrites of these specs screen by screen (Q2 alone rewrote `v98-grid.spec.js` wholesale, and rebuilding markup will do far more), so auditing them now audits specs about to be rewritten anyway. What survives the fold-in is the set actually worth judging. (Was Q10, then V10; re-pointed 10 Aug 2026 at the queue reset.)
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
Do after: **F10** - **re-worded 10 Aug 2026 and the old reason is dead.** It used to say the fold-in "rewrites the markup that owns these selectors" and that §2's `.legacy` mechanism "does most of this sweep structurally". **Both halves were false:** nothing emits any of these six selectors, so there is no markup to rewrite, and the `.legacy` wrapper never existed (struck the same day - see the done item). The saving that IS real: F7-F10 each delete a modal's worth of old CSS and will ADD dead families to this list, so sweeping now means sweeping again. Nothing about the current state is wrong or lossy meanwhile - these rules are inert, not harmful. (Was Q10, then V10; re-pointed 10 Aug 2026 at the queue reset.)
**Re-measured 10 Aug 2026** (lines containing each selector in `css/style.css`; still zero emitters in both `index.html` and `js/app.js`): `.ref-pill` 6 · `.db-tools` 2 · `.ing-empty` **9, not the 10 recorded** · `.an-empty` 19 (this count still includes `.an-empty-box` - the warning above stands) · `.plate-noresult` 1 · `.king-tag` 1, whose only `js` hit remains the comment saying the pill was REMOVED.

## next  Nothing makes "a modal opened over another must be LATER in the markup" a rule
Problem: found by the v137 pre-push review, and its stated mechanism was wrong while the thing it pointed at is real — the case `CLAUDE.md` warns never to dismiss.
Fifteen of the eighteen `.modal-overlay` elements share `z-index:80`; only `#confirmModal` is `85`.
For equal z-index the browser paints the LATER sibling on top, so a flow that opens an earlier-in-markup modal over a later one gets the new modal rendered **behind** the old — a rendering bug, and one that would look like "the button did nothing".
`topOverlay()` is NOT the defect and must not be "fixed": it computes paint order by the browser's own two rules, so whatever it returns genuinely is on top. It simply cannot rescue a modal painted in the wrong place.
No such flow exists today - verified: every real stack either routes through `#confirmModal` (which always wins) or closes the first modal before opening the second (`setSmemOpen` runs `closeSettings(); openSmem();`, `paPublish` runs `closePlateActions(); openManageMenus(id);`). The one genuine same-z stack, Tidy lists → a tidy action, has the child later in the markup and is pinned against `elementFromPoint` in `tests/visual/v137-modal-layer.spec.js`.
Requirements: make the ordering a rule that can fail — either a test that asserts every reachable modal-over-modal pair paints its child on top, or an explicit stacking scheme (an `.is-stacked` layer above 80) that removes the dependency on markup order entirely.
Out of scope: reordering `index.html` for its own sake, and any change to `topOverlay`.
Do after: **F10** - the fold-in rebuilds this markup screen by screen and F7 removes the builder overlay entirely, so a pairing enumerated now is enumerated against modals about to move.

## done  The Dashboard panel sits 4px high at every width where `--sp-5` is 20px
Shipped 10 Aug 2026 with **F6 / `ezplate-v143`**, which is what its `Do with:` line was for. Both halves landed: one owner for the tab's top gap (`.plib-panel` zeroes the panel margin for every converted screen alike, and `#dashBody`'s own margin is the content inset below the header bar - the same job `#ingList`/`#plateList`/`#aList` do), and 700px promoted from `EDGE_SIZES` into `SIZES` in `layout-consistency.spec.js`, with Dashboard folded into the compared set. `EDGE_SIZES` is gone rather than left as a satisfied exception.

## done  PROPOSED CLAUDE.md rule: work-item sequencing lives in the queue, never in CLAUDE.md
**APPROVED 10 Aug 2026 (Max, taking the recommendation) and shipped in the narrower wording.** See the done section.

## done  PROPOSED CLAUDE.md rule: measure the fixed containing block, never `innerWidth`
**APPROVED 10 Aug 2026 (Max, taking the recommendation) and shipped with the scope stated honestly.** See the done section.

## next  The converted screens' column bands are `aria-hidden`, so their figures are announced unlabelled
Problem: found 10 Aug 2026 by the F5 pre-push review, which spotted it on Menu. It is **all four converted screens**, not one - `renderIngredients`, `renderKitchenPanel`, `renderPlatesTab` and the Menu band in `index.html` every one emit `aria-hidden="true"` on the column-heading row. F2 set the pattern and F3/F4/F5 each followed it, so F5 did not introduce this and fixing it on Menu alone would leave the app with two accessibility idioms across four tables that look identical.
**What a screen reader actually gets** (measured, not assumed): each row is one `<button>`, so its accessible name is the concatenation of its cells, and a Menu row reads *"Roast $3.00 $10.00 $7.00 food cost 42.9% - well over your target"*. The verdict is fine - `vbadge`'s `aria-label` is the v131 law and carries its own meaning. The other three figures are bare. The old `<table><thead>` announced "Cost", "Suggested", "Price" against each cell; the div grid announces nothing.
On MOBILE the meta line's `::after`/`::before` do supply the words "cost," and "suggested", but generated content is announced inconsistently across screen readers and is cancelled entirely at >=768 - so it cannot be the answer.
Requirements: ONE decision for all four screens. Two candidates, neither obviously right: visually-hidden per-cell labels inside each row (verbose - it is repeated on every row of a long list), or a per-row `aria-label` built by the renderer from the same values the cells show (concise, but a second string that can drift from the visible one, which is the failure mode `CLAUDE.md` names for stubs). Whichever wins, the band's `aria-hidden` is then correct rather than a gap - it is decoration once the row carries its own meaning.
Out of scope: the `vbadge` markup, wording and aria, which are exact-pinned and already correct.
Note this is the reason to keep `aria-hidden` for now rather than simply removing it: an announced floating row of five words before every list is worse than silence, and does not label anything.

## next  `_boot.js`'s empty-table list is a list of things NO browser spec can see
Problem: found twice in three batches, and the second time it blocked verifying a change that had just been made.
`tests/visual/_boot.js` serves a handful of Supabase tables from localStorage and answers `{data:[]}` for everything in `emptyOk`. Two of those turned out to be the ONLY feeder for a visible feature:
- **`ing_price_history`** (fixed in F6/`v143`) feeds the What-moved panel and the "Biggest movers" row. No spec had ever rendered either populated; `v98-grid.spec.js` carried a comment reading like a choice - "this seed writes no per-product price points" - when it was the only reachable state.
- **`menu_change_log`** (fixed in `v145`) feeds the trend chart's intervention markers and the dashboard's since-line. Same story: the marker label was changed in `v145` and could be checked only in a unit test until the shim was extended mid-batch.
Requirements: read the rest of `emptyOk` as a list of app features no browser spec can currently exercise, and for each, either serve it from localStorage in the shape its row-mapper expects (the pattern is now established three times) or record at the site that nothing renders from it, so the next batch does not rediscover the same gap.
Out of scope: the fixtures themselves, and any spec that is currently passing.
Note the cost is asymmetric and that is the argument for doing it in one pass: serving a table is a few lines, while discovering the gap costs a batch its verification step at exactly the moment it needs one.

## next  The trend chart does not re-measure on resize, so its type is off-scale until the next render
Problem: found and created by F6 (10 Aug 2026), and it is the residue of that batch's own fix rather than a pre-existing bug.
Everything inside the trend SVG is in viewBox units - `font-size:11px` in CSS is 11 USER UNITS on an SVG `<text>`, not 11 device px - so the plot's type and stroke scale with its rendered width. F6 fixed the cause by sizing the viewBox to the column at render time (`trendPlotSize`, reading `#dashBody.clientWidth`), which took the desktop chart from a 2.7x enlargement (axis labels ~30px, line ~6.8px) to 1:1.
**But `renderDashboard` does not run on resize.** Drag a desktop window from 1360 to 900 and the viewBox stays at the old width: the SVG rescales smoothly (`width:100%;height:auto`), so nothing breaks and nothing looks wrong at a glance, but the type is off by the ratio of the two widths until the next re-render - which any scope or range change performs.
Requirements: decide between a debounced `resize` listener that calls `repaintDashboardIfVisible()` only when the plot width has actually changed, and leaving it as a known, documented limit. If a listener ships, it must not fire mid-scrub (the scrub holds state on the live SVG) and must not re-render while the tab is hidden.
Out of scope: `trendPlotSize`'s ratios and clamps, which are pinned in `tests/trend-reframe.test.js`.
Note the intermittent-user rule cuts BOTH ways here: Max on a phone never resizes, which is why this is not urgent - and is also why nothing else will ever notice it.

## next  Two CSS comments state the `[hidden]` override mechanism wrongly
Problem: found 10 Aug 2026 by the pre-push review of the CLAUDE.md batch, which caught the same error in the new Tier 1 rule and then the same error in the code it was describing.
`css/style.css:3263` says a bare `display:flex` "outranks the UA's `[hidden]{display:none}`", and `:3378-3380` says the same plus "(class beats attribute-less type rules)".
**Both mechanisms are wrong.** `[hidden]` is an attribute selector at the same specificity as a class, so nothing is out-ranking anything: an author rule wins because **author origin beats UA origin, and origin is resolved before specificity is compared.**
The `:not([hidden])` guards those comments sit above are CORRECT and must not change - only the explanation is wrong. It matters because the wrong explanation invites the wrong fix: someone reading "outranks" reasons that matching specificity will do, and it will not.
Requirements: reword both comments to name cascade origin. No selector, rule or behaviour changes.
Out of scope: everything else in the two `.plib-*` blocks. This is a comment fix, but it lands in a client asset, so it takes a cache bump and the mandatory review like any other.

## next  The `new-branch` skill tells every batch that the MANDATORY reviewer is optional
Problem: found 10 Aug 2026 by the CLAUDE.md-corrections batch, which runs that skill at step 1 of every batch.
`~/.claude/skills/new-branch/SKILL.md` §6 says the PR **workflow** is *"MANDATORY and runs itself … fires on every pull request … you can't skip it"*, and that the pre-push **`code-review` agent** is *"OPTIONAL"*.
**Both halves are backwards**, and have been since the 8 Aug 2026 demotion. `.github/workflows/code-review.yml` is `workflow_dispatch` + the `deep-review` label only - `opened`, `ready_for_review` and `synchronize` are all deliberately gone, with the measured reason in the file's own header (~$20 spent, zero bugs found). `CLAUDE.md` Tier 3 makes the pre-push agent the mandatory one and calls it *"the only thing standing between a mistake and production"*.
So the skill instructs a batch to rely on a reviewer that will never fire, and to treat the real one as optional. It also promises the workflow "lands as PR comments" that a batch may then sit waiting for.
Requirements: §6 restated to match `CLAUDE.md` - the pre-push agent is mandatory, the workflow is on-demand - including the "different model" and "never show it the brief" conditions, and the three ways a workflow check has been wrong. While there, the same section's "Treating a green PR workflow as no findings" gotcha needs re-pointing, and step 5's "wait for the user to approve the plan" contradicts `/batch` for queued items (it is correct for chat/brief work - say which is which).
Out of scope: the other five user-global skills, unless the same sweep finds the same drift.
⚠️ **This file is OUTSIDE the repo** (`~/.claude/skills/`, user-global; the repo's own `.claude/skills/` holds `batch`, `cache-version`, `decide`, `handover`, `supabase*`, `verify`). It therefore cannot ride a PR, cannot be reviewed, and no test can pin it - which is exactly why it drifted two days without notice. Decide as part of this item whether `new-branch`, `investigate` and `test-flows` should MOVE into the repo so they are versioned and reviewable like the other seven.

## next  Small, each independently shippable
- **Four test files still read `js/app.js` by hand instead of `loadApp()`** - the residue of the 48-file `extractFn` migration (10 Aug 2026), which scoped itself to the files that hand-rolled the EXTRACTOR. These four extract nothing, so they were never in the 48: `builder-nomatch.test.js`, `scroll-lock.test.js`, `terminology.test.js`, `smoke.js`. Each is one line - `fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8')` → `loadApp()` from `./_extractfn` - and `smoke.js` may want leaving alone, since it is not in `npm test` and runs standalone. Deliberately NOT bolted onto the migration batch: the pre-push review was already running against that diff, and four unreviewed one-liners is exactly how a "trivial" change rides in unread. Note `tests/extractfn.test.js` reads the file by hand ON PURPOSE - that is how it proves `loadApp` returns the real thing - so it is not a fifth.
- **The toast and the install banner overlap each other at desktop** - found 10 Aug 2026 by the v141 batch while measuring a free slot for the sync banner, and it is the same class as the defect that batch fixed: two pieces of `position:fixed` bottom chrome whose owners never met. Measured at 1024 with both showing: `.toast` occupies x431-817 / y770-816, `.install-banner` x600-1000 / y787-876 - they share x600-817, y787-816. The same overlap holds at 1280, 1440 and 1920 (both are anchored to the bottom, one centred and one right-aligned, so widening does not separate them). The toast is `pointer-events:none` so nothing is BLOCKED, but the install banner's "Install" button and its ✕ sit under a pill of text. Only reachable pre-install (the banner needs `beforeinstallprompt`), so Max on an installed PWA never sees it - it is a new café's first ten minutes. Requirements: one owner for the bottom stack; v141 established the three-way split (left: sync banner, centre: toast, right: install banner) and this is the one pair that split does not already separate, so the fix is vertical - stack the toast above the install banner when both are up, or move one. `tests/visual/v141-sync-corner.spec.js` already measures the banner against both and would extend to cover this pair.
- **The search ✕ shows on every search bar even when the field is empty** - pre-existing and app-wide (`.ms-clear`, `css/style.css:1160`), noticed on the converted Plates screen where the mock draws no clear control at all. F2 kept the control (R3 - `type="search"` renders no native clear on iOS Safari, which is Max's phone) and rebuilt it as `.plib-x`, but did not change WHEN it shows, because the behaviour is shared with four unconverted screens. Decide once: hide it while the field is empty (an input listener on each search bar, or one delegated handler), or keep it always-on deliberately and say so. Whichever way, it wants doing in one place for all six search bars, not per screen.
- **The v3 screen header bar is not full-bleed — DECIDED 10 Aug 2026, BUILD IT (answer 2A).** This is the survivor of the two contradicting items; UI-2 closed in its favour, so its "identical edges" AC is dead and must not be revived. Max chose full-bleed knowing the overhang past the content column is what caught his eye in the first place: the mock's header is a band across the app, not a lid on the content column, and the overhang is what makes it read that way. Applies to all five converted screens at once, never per screen. Original note follows. - the mock's §2 header hairline spans the whole main area while the content sits at max-width 960; in the app both are 960 because `.scr-head` lives inside `.wrap`. Visible as a hairline that stops short of the window edge on a wide screen. Full-bleeding it means breaking out of `.wrap`, which is shell work affecting every screen's header, so F2 left it. Best decided once two or three screens carry `.scr-head` and the shape is settled - F4 or F5.
- **`manifest.json`'s `theme_color` / `background_color` match NEITHER palette** (`#3E2C26` / `#F7F3EC`) - pre-existing, found by the v136 pre-push review while fixing the `theme-color` meta. The meta now follows the chosen theme correctly; the manifest is a separate, static declaration used for the install splash and the task-switcher card, and it still names colours from a palette two redesigns ago. A manifest cannot be theme-aware, so this is a decision: pick the LIGHT palette values (`#FFFFFF` / `#FFFFFF`) as the install-time default, or the dark ones. Not urgent - it is only seen at install and in the app-switcher - but it is wrong today either way.
- **Control BOUNDARIES sit near 1.4:1, in two places now, and it is ONE question** - WCAG 1.4.11 wants 3:1 for the visual boundary of a control. Measured 10 Aug 2026: the toggle's off-track is 1.36:1 (below), and F5's "Delete this menu" button is **1.40:1 in light and 1.38:1 in dark** - its border is `--danger-border`, and F5 is the app's FIRST consumer of that token, used exactly as the mock's §2 specifies for a destructive button ("white + `#F0D4D1` border + red text"). Neither was fixed, for the same reason: the control's own TEXT carries the identification (the Delete label measures 5.43 light / 5.92 dark, well clear of AA), so the boundary reinforces rather than identifies. Requirements: decide ONCE for every bordered control whether this app's boundaries clear 3:1, and if yes, do it in the token rather than per control - a per-control fix is how two became a pattern nobody can see. Note the palette block already carries three MEASURED DEVIATIONS from the mock on exactly this basis (`--text-3` twice, `--danger` once), so deviating is established practice here and not a fight with R1; what is missing is the decision, not the permission.
- **The toggle switch's OFF state is low-contrast in LIGHT, and always has been** - white knob on a `--border-2` `#E3DCCF` track measures **1.36:1**, carried entirely by the knob's drop shadow, and the track against the card behind it is ~1.35:1. WCAG 1.4.11 wants 3:1 for a control's boundary. v136 fixed the DARK case (the knob is now state-aware: `--knob` when off, `--on-accent` when on) and left light exactly as it has always rendered, because changing it is a visual decision on a control that appears on both AI toggles and reads fine to a sighted user. Decide: darken the off-track, or add a hairline border to track and knob.
- ~~**`.github/workflows/test.yml:174` count comment is stale, and drifting**~~ — **DONE 10 Aug 2026**, corrected to **22/21** by the `--retries=1` batch, which was already in that comment block and already taking the mandatory review, so it cost nothing. **That is the answer to the question this item kept asking:** it was skipped for ten batches and two audits not because it was hard but because nothing else ever needed to touch this file, and a workflow-file change costs a full review. The line now also says to re-measure rather than trust the number, which is the durable half.
- **The ~390KB of self-hosted fonts re-download on every deploy** (v132 review): `CACHE` changes per version, `activate` deletes the old cache, and `install` re-fetches every ASSET — including the eight immutable woff2 files — on the mobile connection of an intermittent user. Consider a separate versionless font cache (fonts never change once committed) or fetch-time caching. Also: `cache.addAll`'s `.catch(function(){})` swallows a partial install silently — `tests/settings-toggles.test.js` now pins that every ASSETS path exists on disk, which covers the typo case but not a deploy-time failure.
- ~~**The v3 opaque semantic tints no longer composite with row hover**~~ — **CLOSED 10 Aug 2026, and NOT by a fifth re-point: the pair it describes does not exist in the app.** Measured, both halves. **The one full-row semantic tint left is the invoice review's `.invtable tbody tr.inv-data.st-review` (`--warn-bg`, `css/style.css:2393`), and `.invtable` rows have NO `:hover` rule at all** - so nothing is masked. **The four rows that DO hover carry their semantics as a PILL, never as a row wash:** `.plib-row` (`:3134`), `.king-row` (`:3263`), `.mnu-row` (`:3646`) and `#lines .line` (`:1966`), against `.king-drift`/`.ing-drift`/`.mnu-pct`/`.vbadge`/`.pill-good`. And the rule the finding actually named - `.atable tbody tr:hover td{background:var(--hover)}` - **was deleted with the whole `.atable` system in F5/`v142`**, so its subject is gone, not pending. The tokens are still solid hex in both palettes (`--warn-bg` #FDF3E0 / #312C24) and `--hover` is still separate from `--surface-2`; those facts were never the defect on their own. **The live residue is a FORWARD question and it now lives on the F8 item, not here** - see F8's tint-vs-hover line. Four re-points (V2 → "when F1 re-lands the tokens" → F2 → F5), wrong the last two, and the fifth would have been wrong as well: the honest answer was that the collision had been deleted underneath the note while nobody re-read the code.
- **Three vocabularies name the same three lights** (v131 pre-push review): the Add-to-menu preview says "Slightly under"/"Underpriced" (price framing, `marginLightWord`), the filter chips say "Watch"/"Rework", and the Menu cell now says "over"/"well over" (cost framing). Colour can never disagree (all read `analyze()`); the words meet seconds apart in one flow and frame opposite directions. Unify to one vocabulary or record the split as deliberate at all three sites. Best decided inside F8 (the invoice modal batch; was V6, re-pointed 10 Aug 2026) - V4a shipped without touching it (AUDIT-v135 C2 caught the routed-note-evaporates pattern; this line now names only the batch still ahead).
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

- **One extractor, shared (`tests/_extractfn.js`)** - shipped 10 Aug 2026, **test-only, no deploy version** (`sw.js` stays `ezplate-v145`), handover `HANDOVER-161-shared-extractor.md`.
  48 files migrated, `tests/_extract.js` rewired to the same helper with its exported surface unchanged, and `tests/extractfn.test.js` added because the extractor everything depends on had **no tests at all**. Suite 849 → 865.
  ⚠️ **THE ITEM'S "the copies have not drifted yet - checked" WAS FALSE, and that is the durable half of this batch.** Three signatures existed (37 × `(src, name)`, 10 × `(name)` closing over a module `SRC`, 1 × `(src, name, occ)`) - and **three copies carried the parse guard while forty-five did not.** The guard exists because the depth counter is brace-naive: a `}` inside a string ends the slice early and hands back a TRUNCATED function rather than raising, so in 45 files a mis-slice was silent. It is now on for every caller and the suite is green with it on, so nothing was mis-slicing today.
  **The lesson is about the CHECK, not about the drift:** "checked" meant reading a few copies. Hashing all 48 took one command and gave the opposite answer. A duplication item's own claim that the duplicates agree is the claim least worth taking on trust.
  Two `.map(extractFn)` sites passed the array index as the second argument the moment the signature changed; the suite caught both, which is the only reason to trust the other 351 call sites.
  **Review (Sonnet, no brief): one finding, real, fixed** - two dead `require('path')` lines, left because the migration script tested "is this module still used" with `\bpath\.`, which **prose satisfies** when a comment ends a sentence with the word. Re-checked all 49 files against the API rather than the word; those two were the only ones.
  Deliberately left out and queued instead: four files that read `js/app.js` by hand but extract nothing. Adding four unreviewed one-liners after the mandatory review had started is exactly how a "trivial" change rides in unread.

- **Three CLAUDE.md rules, all APPROVED 10 Aug 2026 (Max: "ill go with your recommendations")** - shipped 10 Aug 2026, docs-only, **no deploy version** (`sw.js` stays `ezplate-v145`), handover `HANDOVER-160-three-rules.md`.
  **He took the recommendation on all three, so nothing here went against advice** - recorded that way because this file's own convention is to flag the opposite case loudly.
  1. **"Which item runs before which belongs in the QUEUE, never here"** - shipped in the NARROWER wording, not the original absolute. The review of the batch that first wrote it had found "sequencing lives in the queue, **never** in `CLAUDE.md`" too broad, because Tier 3's Migrations section legitimately states standing sequencing. The rule now splits it: **which queue item runs before which** goes in the queue (it names items, it expires, the step-1 sweep checks it); **standing procedure inside one piece of work** stays in `CLAUDE.md` ("staging first, then production", "push the plate, confirm it, then the dish"). The test given is "if you cannot name the queue item, you are probably writing the second kind".
  2. **"A viewport-geometry assertion must MEASURE its reference, never name it"** - the `position:fixed;left:0;right:0` probe, never `innerWidth` or `clientWidth`. ⚠️ **The scope is stated honestly rather than as the absolute the item proposed:** the measurement is one runner and one browser (containing block 370 inside 380, 759 inside 768, while both named references agree with each other and are both wrong), so it is a rule about HOW TO OBTAIN the reference, not a claim that the three differ everywhere. The probe is right where they agree too, which is why it is the default and not a CI workaround. Carries the orientation corollary (`.bottomnav` measures 370 at a 380 viewport, so discriminate a left rail by being taller than wide).
  3. **KPI colour anchoring**, appended to the Tier 1 chart-colour entry: the strip, the chart, the sparklines and the Menu rows all read at-or-under-target, so **colour on a headline figure is a target reading, not a delta.** It carries the thrice-declined "vs last month" with it (v98, 9 Aug, 10 Aug), which is the thing that kept coming back.
  **The sweep rule 1 requires was run and changed ONE line:** the Tier 2 builder bullet ended "the batch that builds it replaces this bullet", a scheduling claim nothing in that file could check. Narrowed to state only what is true now, with the scheduling left on F7's item, which already carries it (verified before removing it, not assumed).
  ⚠️ **"It found one instance" was too confident, and the review said so.** Every other ordering line in `CLAUDE.md` was read and judged to be the standing-procedure kind, but the **privacy gate** is a genuine borderline case that the sweep passed over without arguing either way. It is now written into the rule as the WORKED EXAMPLE of the boundary - it looks like item-to-item ordering and is not, because it names no item, never expires, and binds any future endpoint shipping user data to a third-party model. Giving the ambiguous case is more use than giving the clear ones.

- **Playwright retries, and the spurious red (`--retries=1`)** - shipped 10 Aug 2026, **CI-only, no deploy version** (`sw.js` stays `ezplate-v145`), handover `HANDOVER-159-playwright-retries.md`.
  ⚠️ **THE ITEM'S HONESTY PREMISE WAS WRONG AND THE REVIEW DISPROVED IT. Do not cite the item.** It said to set retries "so a flake is reported as **flaky** rather than green (Playwright distinguishes them - a retried pass is not a silent pass, which is what keeps this honest)". **At the JOB level a retried pass IS a silent pass:** if every test eventually passes within its retry budget the run exits 0 and the check is green. There is no retry-exhaustion-only path. What survives is an annotation, not a red check.
  **So the cost is ACCEPTED, not avoided, and the file now says so.** Playwright cannot tell an infra hiccup from an intermittent REAL bug - a race or timing regression failing one run in three, which is exactly what these visual specs exist to catch - because both present as fail-then-pass. The mitigation is a documented instruction rather than a mechanism: **a `flaky` annotation on a green check is a FINDING, not noise.**
  **Where it went:** `--retries=1` on the CI command line, NOT `retries: process.env.CI ? 1 : 0` in `playwright.config.js` as the item specified. The workflow's own comment block states the convention - every flag is set on the command line so `npm run shots` and a local `npx playwright test` behave exactly as they did - and a config branch would have been the first exception to it for no gain.
  **Workers deliberately unchanged at 2**, per the item's own "measure before assuming": the job runs ~7 min against a 15 min timeout, and halving parallelism to chase a rare flake risks trading it for a routine timeout.
  Verified by running the exact CI command line locally: **209/209 green, 21 specs**, and the empty-list guard re-checked and still failing closed. (A first local attempt reported "No tests found" - that was **zsh not word-splitting** the newline-separated `$SPECS`, not a CI defect; Actions runs bash, and under `bash -c` it expands to 21 arguments correctly.)
  **Review (Sonnet, no brief): two findings, both real, both actioned.** The first is the premise correction above - my comment claimed "this does not hide a failure" and that was false. The second is that the artifact upload is `if: failure()`, so a flaky-but-green run discards the very trace worth reading; that one is queued above rather than bolted on, because it needs a json reporter and a detection step in a job kept deliberately minimal.
  Also folded in, because this batch was already in that comment block and already paying for the mandatory review: the **"9 specs, 8 survive" count is corrected to 22/21**, closing a Small-list item flagged by two consecutive audits.

- **`kpi-strip.test.js` hand-stubbed `fmtTargetPct` (AUDIT-v145 D1)** - shipped 10 Aug 2026, **test-only, no deploy version** (`sw.js` stays `ezplate-v145`), handover `HANDOVER-158-kpi-stub.md`.
  The stub is replaced by `${extractFn(APP, 'fmtTargetPct')}` and a fractional-target test is added at 32.53, which **fails against the planted stub while the other nine still pass** - verified by putting the exact old stub back and running it, not by reasoning about it. Suite 848 → 849.
  The stub had the right SHAPE and the wrong CONTRACT: it carried the `%` (the "30%%" fix) and not the rounding, and every other test in the file runs at the default target 30, where `cogsPct%1` is 0 and both branches agree. That is why nothing caught it.
  **The item's reachability note was right and is worth keeping:** the Settings input routes through `setCogs`, which rounds (`js/app.js:1107`); the one path that assigns a fractional `cogsPct` is the BOOT READ (`js/app.js:514`, `cogsPct=pv` straight from `parseFloat`). Both re-verified against the source before the comment citing them was written.
  **Review (Sonnet, no brief): no defects.** It re-derived the fails-against-the-stub claim itself by reconstructing the stub in a scratch copy rather than taking the diff's word, which is the right instinct for a claim of that shape. Its one observation became the `extractFn`-duplication item above.

- **The tint-vs-hover re-point (AUDIT-v145 C2)** - closed 10 Aug 2026, docs-only, **no deploy version** (`sw.js` stays `ezplate-v145`), handover `HANDOVER-157-tint-hover.md`.
  **Neither of the item's two branches was quite right, and the code decided it.** It offered "re-point at the invoice review (`Do after: F8`)" or "confirm no such row exists". The measured answer is the second, for a reason the item did not anticipate: **the rule the finding NAMED - `.atable tbody tr:hover td{background:var(--hover)}` - was deleted with the whole `.atable` system in F5/`v142`.** Its subject is gone, not pending. So a fifth re-point would have been wrong as well, and the note had been describing a collision that no longer existed while nobody re-read the code.
  **What was measured:** the app's ONLY full-row semantic tint is `.invtable tbody tr.inv-data.st-review` (`--warn-bg`, `css/style.css:2393`), and `.invtable` rows have **no `:hover` rule at all**. The four rows that do hover - `.plib-row` `:3134`, `.king-row` `:3263`, `.mnu-row` `:3646`, `#lines .line` `:1966` - all carry their semantics as a PILL (`.king-drift`, `.ing-drift`, `.mnu-pct`, `.vbadge`, `.pill-good`), never as a row wash. Tokens are unchanged and were never the defect alone.
  **The live residue is FORWARD and now lives on the F8 item in the imperative**, because F8 is the batch that can create the collision: every screen F2-F6 converted came out with row hover, and the review rows are the one place a full-row tint would meet it.
  **The pattern is fixed as a rule at the top of this file, which is the half the item said was the real finding:** a note routed at a future item lives ON that item, never in the Small list with a pointer. Four re-points, two of them wrong, and two further instances after AUDIT-v135 C2 named the shape.

- **The `.legacy` wrapper (AUDIT-v145 C1)** - decided 10 Aug 2026, docs-only, **no deploy version** (`sw.js` stays `ezplate-v145`), handover `HANDOVER-156-legacy-wrapper.md`.
  **The claim is STRUCK from all three places it lived** (`FOLD-IN-PROTOCOL.md` §2, this file's fold-in preamble, the Dead CSS sweep's `Do after:`), and per-screen manual deletion is recorded as the mechanism - which it has been since F2.
  **The item offered "implement it instead" and the code refused the option, which is why this is a strike rather than a coin-toss.** Two measured reasons, both new to the record: **there is no unconverted screen left to wrap** - all five `#tab-*` panels are converted (F2-F6), so a wrapper scoped to unconverted screens would have zero children, and by §2's own test zero children means *delete the stylesheet* while most of it is still live; and **the residue is shared chrome** - what is actually unconverted is three MODALS (`#builderModal` F7, `#invModal` F8, `#settingsPanel` F9) opened *from* converted screens, plus Account (F10), which has no markup at all. A per-screen wrapper cannot scope a modal shared by both halves of the app.
  **Three corrections to the item's own framing, recorded because it read as settled:** it called Builder/Invoices/Settings/Account "the four screens still unconverted" - **none of the four is a screen**; "six screens running" is five screens plus the shell; and there were **THREE** present-tense references in this file, not the two the audit counted. The third is the one that mattered most - the fold-in preamble told a batch that *"conversion state is read from this queue and the `.legacy` wrapper"*, so it did not merely describe the mechanism, it instructed someone to go and read it. **A sweep that starts from an audit's list stops at the audit's list; grep for the thing itself.**
  **The Dead CSS sweep keeps its `Do after: F10` but on a different reason.** Both halves of the old one were false (nothing emits those six selectors, so no markup owns them to be rewritten; and the `.legacy` half never existed). The real saving is that F7-F10 each delete a modal's worth of CSS and will ADD families to the list. Re-measured while there: `.ing-empty` is **9 lines, not the 10 recorded**; the other five match.
  **§2's rule is untouched** - fully v3 or fully untouched, no new skinning. Only the enforcement sentence went, and §1.4 already stated the real mechanism, which is why nothing was lost with it.

- **The sync pill covers the primary button** - shipped 10 Aug 2026 as **`ezplate-v141`**, handover `HANDOVER-150-sync-corner.md`.
  **The item's measurement was an understatement, and that is the lesson worth keeping.** It measured the `ok` pill (87px) and reported a 19px clip that left the button's centre clickable. But the banner is sized by its TEXT, and `setSync`'s five states are 87 "Saved" / 99 "Saving…" / 176 "Loading latest data…" / 230 offline / 273 error - so **the two states that never auto-dismiss are the two widest.** Re-measured across every state: at 1024 and 1280 the error pill covers BOTH header actions outright, centres included ("Import invoice" AND "New product"; "Set up from products" AND "New ingredient"), so the only route into each flow was a **dead control** for as long as the error stood - not a visual clip. Still covers the primary at 1440; only 1920 is clear. **Measure the widest state of a text-sized element, never the one that happens to be on screen.**
  **All three homes the item proposed were measured and all three fail:** "below the header bar" lands on the control row (every converted screen has search + filters directly under `.scr-head` once it has data); "centred as it is under 1024" puts the 273px error state across the secondary action at 1024; "headers reserve room" would indent every action ~290px permanently for a pill that is absent almost always and four different widths when present. There is no free region in the top band at 1024-1440.
  So the banner LEAVES the top band: **bottom-left at ≥1024**, which completes a three-way split of the bottom chrome that cannot collide (left: sync, centre: `.toast` at bottom 92, right: `.install-banner` at 400px/bottom 24) and is the ordinary status-bar convention. The header bar now owns that corner at every width - the one rule F5-F10 inherit without re-measuring. Mobile/tablet is deliberately untouched and pinned: below 1024 a real `header` still occupies the top band, so the banner never met `.scr-head` there.
  **Root cause, named:** two changes that never referenced each other. v132 deleted the desktop `<header>`; F2/v138 put `.scr-head` into the band it vacated; the banner's ≥1024 pin still assumed the old header was there. **Deleting a layout element hands its band to whatever is pinned to the viewport at that offset** - the v132 comment saying the fixed siblings "survive" was true and incomplete, and now says so.
  **Second half of the fix, and the durable one:** `pointer-events:none`. The banner is a status readout that has never held a control, and it could take a click from whatever it floated over - measured at 380px, `elementFromPoint` at the centre of `#brandHome` returned `#syncBanner` in the error state, so **mobile had a blocked control too and the item did not know**. ⚠️ The mock's §5 error banner carries a **Retry** button; the day one is added, that line must come out and the placement be re-measured - noted at the site.
  `tests/visual/v141-sync-corner.spec.js` pins the CONDITION, not the coordinates: the banner may float over the content plane and may never touch chrome. **7 of its 10 tests fail against the pre-fix CSS**, checked by stashing it. The first draft asserted "overlaps no interactive element anywhere" and failed correctly - list rows are `role="button"`, so the content plane is wall-to-wall controls and no fixed overlay can intersect nothing; the spec records that as a decision with `pointer-events:none` as the reason it is safe, rather than quietly narrowing to fit.
  **A geometry assertion that passes locally and fails in CI is a guess, not a measurement.** The two mobile pins passed on macOS and failed on the Linux runner three times; both of the first two fixes were theories written without measuring, and both were wrong. Instrumenting the assertion to print its own geometry settled it in one run: **the fixed-position containing block on that runner is NARROWER than the viewport - 370 inside 380, 759 inside 768 - while `window.innerWidth` and `document.documentElement.clientWidth` agree with each other and are both wrong.** `.bottomnav` at 380 measures 370 too, so "left rail or bottom bar?" answered by comparing widths applied a 185px offset to the bottom bar. Both are measured now: a `position:fixed;left:0;right:0` probe for the containing block, and rail ORIENTATION (taller than wide) for the offset. Anyone writing a viewport-geometry pin in this repo should reach for the probe rather than `innerWidth`.
  **Pre-push review: no defects, one nit, fixed in branch.** The reviewer did not take the "7 of 10" claim on trust - it re-derived it by mutating the CSS twice (reverting the position rule fails 6, reverting `pointer-events:none` fails 1) and confirmed no click handler is ever attached to `#syncBanner` or its children, which is what makes that line safe. The nit was a dead `.side` in the spec's chrome selector list: the sidebar's own controls are `.side-brand`/`.side-theme` and both sit inside `nav.bottomnav`, already covered through `closest()`. Verified against the markup and removed, with a comment saying why, because a dead selector in a coverage list reads as coverage it does not provide.

- **CLAUDE.md corrections from AUDIT-v135** - shipped 10 Aug 2026, docs-only, **no deploy version** (`sw.js` stays `ezplate-v140`), handover `HANDOVER-149-claudemd-corrections.md`.
  All four stale lines corrected and both new Tier 1 rules landed, each verified against the code before editing rather than taken from the audit.
  **S1** `pushWrite` has NO `null` path - all three exits return the result or `{error}` (`js/app.js:62-83`); `null` is `dbPushMenuAfterPlate`'s contract (`:5658`), and the file now says why the confusion is dangerous (a caller treating only `null` as failure sequences its dependent write straight after an error). **S2** the offline drop is real, "silently" was false - the fail handler toasts *"It has NOT been saved"* (`:73-75`). **S5/D4** `cafeDB_plateDraft` named as the standing localStorage exception, with the reason two audits missed it (every use goes through the `DRAFTKEY` constant, so a literal grep finds nothing). **S3/C1** the dropdown "UNBLOCKED / positioning context is already final" sentence DELETED. ⚠️ **This entry also claimed a new standing rule landed - "sequencing lives in `docs/QUEUE.md`, never in `CLAUDE.md`" - and it did NOT** (corrected 10 Aug 2026). Its own pre-push review removed it before merge for want of Max's yes. **It has since landed, later the same day and in NARROWER wording** - Max's yes, taking the recommendation - so `CLAUDE.md` now carries *"Which item runs before which belongs in the QUEUE, never here"*, which is not the absolute this entry originally claimed. See the done section. The entry recorded the intent and not the outcome, which is exactly the class of claim the `.legacy` item was opened for. The "IS a MODAL" bullet was left for F7 as the item instructed, now marked as describing today and scheduled for reversal. **Item 6** the staging line's "has never yet loaded" clause corrected against a live `list_tables` call (empty `public` schema); the rest of the warning survives verbatim and is now sharper - the safeguard becomes real when the staging item RUNS, not when the server connects.
  **Two Tier 1 rules added:** the stub-mirrors-contract rule (v113 + batches 139/140/141, one remedy - extract the real function), and the `@media` specificity rule with its corollary that `[hidden]`, `:focus-visible` and other UA defaults are ordinary low-specificity rules any class outranks.
  Also corrected: `tests/dash-scope.test.js:301` repeated the "drops writes silently" claim in a comment - a stale fact re-entering through the back door the moment the rule was fixed.
  **The pre-push review found three real defects, TWO of them introduced by this batch while it removed defects of the same kind:** the new `cafeDB_plateDraft` line claimed "a grep for the key finds nothing" and a grep finds it at `js/app.js:1152` (the audit's true claim was narrower - a `localStorage.getItem('...')` grep misses it); and the `@media` rule's corollary said `[hidden]` and `:focus-visible` are low-specificity rules a class outranks, when `[hidden]` ties a class on specificity and the author rule wins on **cascade origin** - which matters, because the remedy is a `:not([hidden])` guard and not the specificity fix the paragraph above it recommends. The `:focus-visible` half was dropped as unverified. The third finding removed an unapproved rule; it is the `blocked` item above.
  **Found not fixed:** the `new-branch` skill has the two reviewers exactly backwards, and two `css/style.css` comments state the `[hidden]` mechanism wrongly - both queued above.

- **F4 - Products, rebuilt from the mock** - shipped 10 Aug 2026 as **`ezplate-v140`**, handover `HANDOVER-148-products.md`.
  Five columns (Product + inline brand | Category | Supplier | Unit cost | Last change); mobile two-line rows with a "Category, Supplier" meta line and the unit cost stacked over the change pill. The `.ing-*` class NAMES are kept (F3's ruling): every one is emitted only by `renderIngredients`, verified across both files, so there was no shared system to unpick - `.ing-controls`/`.ing-filter`/`.menu-search` are NOT in that set and still dress the Menu screen, so the rebuild took F2's `.plib-*` controls instead.
  **Rulings:** R2 the mock's "Pack price" heading is refused as a LIE - `dispPrice` renders a per-base-unit figure and the pack price is a different number on the edit form; ships as "Unit cost", the word Ingredients already uses · R2 "New product" beats the mock's "Add product" (v45 renamed it app-wide; §7 forbids two labels for one intent) · R1/§7 the `#prodFab` floating add is DELETED - §6.1 puts the primary in the header on both platforms, so it was a duplicate CTA · R3 "Import invoice" survives in the header (the sidebar's Invoices entry is desktop-only) - the second instance of the blocked two-actions question · R3 `#lastImport` is rehomed, not deleted: the identical string already renders as `#lastImport2` inside the invoice modal, one tap away · R2 mobile stays a TAB - the More-screen restructure is shell work and is queued as its own item · R1 the mobile row carries NO brand, per the mock's own fixture data.
  `#ingCount`'s filtered count is not lost: the header subtitle reads "412 products, 7 suppliers" unfiltered and "12 of 412 products" while a filter is on.
  **The defect the suite could not see** was a THREE-line mobile row: the brand wrapped onto its own line whenever the name was long, so rows were two lines or three depending on the product. Found by looking at a 380px screenshot. The mock's own mobile fixture settled it - its Products sub is "Category, Supplier" with no brand at all.
  **A test that could not fail, in a spec shipped two batches ago:** `expect(outlineWidth > 0)` never proved a focus ring existed - the UA default is 3px at `outline-style:none`, which is exactly what the row reports when `:focus-visible` does not match. Fixed in `v138-plates.spec.js` as well as the new spec. (Its sibling: `:focus-visible` keys off the last input MODALITY, so a spec that reaches a tab by clicking must press Tab before asserting a ring.)
  Also: an `@media` block left holding only a comment made `builder-modal.test.js`'s cascade walker lose track of which media query it was inside for the REST of the file - it failed loudly here, but the same slip could hide a rule. The parser now pops an empty block, verified against a planted one.

- **F3 - Ingredients, rebuilt from the mock** - shipped 10 Aug 2026 as **`ezplate-v139`** (PR #125), handover `HANDOVER-147-ingredients.md`.
  Five columns (Ingredient over its linked-product sentence | Category | Unit cost | Last change | Used in); mobile two-line rows with a "Category, in N plates" meta. The `.king-*` NAMES are kept - the contract records only this pane emits them, so there was no shared system to unpick.
  **Rulings:** R1 the Category column is BACK, reversing Q5, and the flipped pin now protects what made Q5 safe (the category is DERIVED, never stored) · R2 the mock's "30-day change" heading is refused as a LIE - `ingLastMovePct` is the last logged move, and a real 30-day rule would break the row/What-moved invariant; ships as "Last change" · R2 "Used in" counts the KID ARM, so the row, the relink promise and the modal cannot disagree (the contract left this open; the surrounding facts had already decided it) · R3 both controls the mock drops survive, the strapline is re-housed into the empty state, the linked-product sentence becomes the desktop row's second line.
  **FIVE cascade defects, all one mistake** - a multi-class selector out-ranking a single-class rule inside a `@media` block. Three found by looking at the screen, two by the review; the fourth was written INTO the fix for the third. **A CLAUDE.md rule is proposed for it and awaits Max's yes** (see the handover).
  The furthest-travelling one was invisible to its own test: `textContent` cannot see `::before`, so a column headed "Used in" read ", in —" on every desktop row while its assertion passed. Eleven planted defects; three assertions rewritten because they could not fail.
  Also: `king-rows.test.js` strips comments before every source grep - a code comment mentioning `king-meta` broke a pin while the markup was correct.

- **F2 - Plates, the first screen REBUILT from the mock** - shipped 10 Aug 2026 as **`ezplate-v138`** (PR #123), handover `HANDOVER-146-plates.md`.
  The screen owns its markup and its `.plib-*` classes instead of borrowing the Products `.ing-card` system under twenty `#plateList` overrides, so F4 converts Products without unpicking them. Desktop: the mock's header bar (title + computed "6 plates, 1 not costed, 2 unpublished" + New plate), search + category select, bordered table with a column band at `minmax(0,1fr) 170px 120px`. Mobile: two-line rows, "category, on Winter Menu" meta, mono money right, 56px floor, no container. One breakpoint, 768.
  **Rulings at the code:** R1 "not costed" and 640→768 · R2 the row still opens the ACTION CHOOSER, **F7 flips it** · R2 the 44px floor beats the mock's 31/36px except under `(pointer:fine)` · R2 loading IS the boot gate (v108 exists so no screen paints before the server answers; a per-screen skeleton contradicts it and is unreachable behind the gate) · R3 Clear filters and the search × survive (no native clear on iOS Safari) · R4 no permission-denied state, there is no auth.
  **Four defects found by MEASURING, none by reasoning:** the header gutter was wrong in the 561-767 band only (the app steps at 560, v3 steps at 768, and nothing had measured between them); `.plib-note{display:block}` outranked the UA's `[hidden]` so the footnote sat under both empty states; a trailing space in CSS `content` collapses ("Breakfast,on Winter Menu" on the phone); the true-empty state showed an option-less category select because `fillFilter` runs only on the rows-present branch.
  **Twelve planted defects, two of which caught real bugs rather than confirming fixes** - second batch running that planting has paid. Specs rewritten honestly: `layout-consistency.spec.js` now compares the UNCONVERTED set (its "all five tabs share one skeleton" premise is superseded by the fold-in) and gains a left-edge test for converted ones; `v135-plates.spec.js` → `v138-plates.spec.js`. Review: no defects, one fragility fixed (`.scr-head > h2` tied `.panel h2` on specificity; now `.panel > .scr-head > h2`, pinned).

- **F1b - Shell reconcile + the modal/sheet primitive** - shipped 10 Aug 2026 as **`ezplate-v137`**, handover `HANDOVER-145-shell-modal.md`.
  **Escape now closes the TOP LAYER ONLY, derived from the DOM** (`topOverlay()`: highest computed z-index among `.modal-overlay.open`, tie-broken by document order — the two rules the browser itself paints by). It replaces a hard-coded list of 8 ids plus two single-modal listeners, and closes through each overlay's own `.mhead > .x`, so every modal keeps its real close function — `closeConfirm` clears `__confirmFn`, which the old bare `hide()` leaked. **Self-maintaining: a new modal with a × is covered by construction.** The 8 modals that had no Escape at all now have one. **Focus trap + return-to-opener exist for the first time**, including handing focus back to the layer underneath when the top of a stack closes.
  **Container:** centred at 12vh ≥768, bottom sheet <768 (grab handle, slide-up, safe-area). `.modal-builder`/`.modal-wiz` excluded and keep their full-height takeover — R2, the mobile mock's Builder is a full-screen push and F7 replaces the shell anyway.
  **Shell:** Invoices joins the sidebar bottom group under the mock's hairline (opening the same `openInv()` as the Products tab's button — placement, not a second capability); the brand row is the mock's one-line form, hosting the 22px theme toggle. **R4, deliberately not built:** the ⌘K button (no palette exists — a dead chord is forbidden), the account row (no workspace concept — F10 owns the question), "UI states" (a designer's spec screen, not an app screen). The tagline "Plate costing made easy" is gone (R1) and its orphaned CSS deleted in the same change.
  **Two defects found by measuring my own work:** the theme toggle rendered **22 wide × 44 tall**, because `button{min-height:44px}` beats `height` and `min-height` always wins — it reached a browser before being caught; and **three new tests passed against planted defects** (two focus tests could not tell "focus returned" from "focus never moved"; a theme-sync test was satisfied by `openSettings()`'s own re-sync). All rewritten and re-verified.
  **The pre-push review's real finding:** the dashboard scope popover's Escape listener and the new top-layer one are both on `document`, so one keypress closed two layers — the very defect this batch removes, surviving in a pre-existing handler. Fixed with `stopImmediatePropagation` (the plain form cannot work: `stopPropagation` never stops a sibling listener on the same node). Reproduced before fixing and pinned.
  Its second finding was **inverted and the code won**: `topOverlay()` computes paint order by the browser's own rules, so it cannot disagree with the screen. The residual hazard it was pointing at is real and is queued below.

- **F1a - Tokens (light + dark) + the theme switch** - shipped 10 Aug 2026 as **`ezplate-v136`**, handover `HANDOVER-144-tokens-dark.md`.
  **The mock's token NAMES are now canonical** (`--surface-2`, `--text-3`, `--hairline`, `--danger`, `--scrim`, `--grid`…), pasted verbatim from the SaaS mock with the app's older names (`--surface2`, `--muted2`, `--bad`…) kept as a `var()` ALIAS layer. F2-F10 port from the mock without a translation step, which is the mistranslation this removes - and a mistranslation is invisible until someone switches theme.
  **Dark is ONE `html[data-theme="dark"]` block, and there is no `prefers-color-scheme` rule in the CSS at all.** The `<head>` resolver always writes an explicit `light`/`dark`, so the pre-v132 arrangement - "system" meaning NO attribute, therefore every dark rule written twice, once under the attribute and once under a media mirror - cannot recur. A real bug once came from writing one half and forgetting the other. A test pins the absence of the mirror and says why.
  **Three deviations from the mock, all MEASURED** (its §7 AA claim has now failed measurement twice): light `--text-3` #A2937F is 2.99/2.80/2.51 and ships at #7D7060; dark `--text-3` #807E7A is 3.79/4.07/3.26 and ships at #908D89; light `--danger` #C63C33 is 4.44 on its own tint and ships at #C0392F. Each clears AA on both PERSISTENT surfaces; the transient hover wash lands ~4.0 and that is a **recorded, deliberate limit** - a value dark enough to clear hover collapses the gap to `--text-2` and destroys the three-level text hierarchy. Dark `--danger`/`--warn`/`--good`/`--accent` all pass as the mock ships them and are NOT overridden.
  **A defect in the mock, found by measuring:** it hardcodes `color:#FFFFFF` on accent- and danger-filled buttons, which against its OWN dark palette is **2.54:1** and **2.59:1**. `--on-accent`/`--on-bad`/`--on-inverse` now flip with the theme (R2 - legibility is a real constraint).
  Also landed: `.seg`/`.seg-btn` restored with the Settings Light/Dark/System control; a live `matchMedia` listener so 'system' follows the OS **without a reload** (the pre-v132 code read it once at boot, so an intermittent user could sit in the wrong theme for a week); dark variants of the four empty-state SVG data-URIs **and of the reduced-motion static one** (required, not belt-and-braces: `html[data-theme]` outranks `:root`, so one declaration would have won inside that media query and animated for someone who asked for no motion); the sparkle's light/dark gradient PAIR restored, its spec now asserting both directions after the light-only assertion sailed through v132-v135 with the dark selector deleted.
  **New guard: `tests/visual/v136-theme.spec.js` sweeps the rendered DOM** on every tab, both themes, at 380 and 1280, and fails on any text under its AA floor or any surface painted the wrong way round. Verified failing against planted defects in BOTH branches. Deliberately-inverse fills (`--inverse`, and the semantic `--good`/`--warn`/`--bad`/`--accent`) are exempted by resolving the tokens, not by naming selectors, so a new element using them is covered automatically.

- **The V-series redesign queue (V4c-V10, G2, the features list, the 9 Aug phase preamble) SUPERSEDED 10 Aug 2026** by Max's replacement design package (`FOLD-IN-PROTOCOL.md` §0a/§0b). The fold-in direction inverted from restyle-in-place to rebuild-from-mock, so the remaining items were reset as F1-F10 + behaviour specs; surviving substance (the V4c contract, the carried modal defects, the R2/R4 laws, the old Q10 residue relevant post-rebuild) moved into the F-items. V1-V4b SHIPPED (`ezplate-v132`-`v135`) and STAND - Max overrode §0a's revert on 10 Aug 2026 (no reset pass; each screen's paint is replaced when its F-item rebuilds it, and F1 reconciles the shipped shell instead of starting clean). AUDIT-v135's R1 grid-track fixes queued on V4c/V4d die with the rebuilt grids they were scoped to. Of the old Q10 sweep, the §4 per-screen criteria absorb the focus/AA work; two durable notes moved to the specs/preamble (⌘K never binds before the palette exists; §7's own AA claim gets measured, not trusted).

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
  ⚠️ **Correction, AUDIT-v145 D2 (10 Aug 2026): abbreviation search does not belong in that list** - it had NOT shipped, and still has not. `js/app.js:701-704` declines it explicitly. So this was the SECOND such item, not the third, and the pattern is one instance smaller than three documents have claimed.
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
