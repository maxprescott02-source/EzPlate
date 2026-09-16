# REVIEW-274 — the builder between 768 and 1076

Reviewed-commit: 200c0cd

**Reviewer model: Sonnet, overriding the `code-review` definition's `opus` pin, because THIS BATCH RAN ON OPUS.**
The agent was given the branch diff and was not shown the queue item or the plan.
It checked out the branch and ran the app against Playwright rather than reading the rules, which is what produced finding 1.

---

## The report, verbatim

Working tree is clean (no leftover scratch files). Here are my findings, most severe first.

### 1. CRITICAL — the sticky save bar renders under the tablet nav rail for every width from 768 to 1023px (a brand-new regression, and untested)

This diff extends `.bld-bar`'s visible range from "hidden at ≥768" to "hidden at ≥1076," and adds `.bld-bar{left:224px;bottom:0}` only inside `@media (min-width:1024px) and (max-width:1075px)` — matching the **full** 224px sidebar that exists only from 1024px up. But there is a second, narrower sidebar state: `@media (min-width:640px) and (max-width:1023px){ body{padding-left:78px} .bottomnav{width:78px; z-index:75 (inherited)} }` — a collapsed nav rail that covers exactly this range. No override exists for `.bld-bar`'s `left` in 768–1023px, so it keeps the base `left:0;right:0` (z-index:25).

I verified this live (checked out this branch, ran the app against Playwright):
- At 768, 900 and 1023px, `.bottomnav` renders at `left:0..78`, `z-index:75`; `.bld-bar` renders at `left:0..<viewport>`, `z-index:25` → **78px of overlap**, with the sidebar painting on top.
- The bar's first figure, "Plate cost $6.04", renders at `left:16, right:68.75` — entirely inside that 78px strip. **It is completely hidden behind the collapsed sidebar rail** at every width in this band.

Before this diff the bar was hidden for all widths ≥768, so this collision never occurred in production — it is introduced by this change.

The new spec (`tests/visual/274-builder-tablet.spec.js`) does not catch it: the parametrized test at widths `[768, 900, 1024, 1075]` ("2+4") asserts the bar is `painted` and `bar.bottom <= 801`, but never reads `bar.left`. Test "6" (the only test that checks `left`) runs **only at width 1024**, inside the range that already has the fix. So the whole spec is green (13/13, confirmed by running it) while the defect ships. `tests/builder-readiness.test.js`'s new brace-walking assertion is a separate, sound check (verified it actually fails when the numbers are mutated) but it only compares the three breakpoint *numbers* to each other, not the bar's horizontal position.

How to verify: `page.setViewportSize({width:768,height:800})`, load the builder with a costed plate, read `getBoundingClientRect()` on `.bld-bar` and `.bottomnav` — the rectangles overlap by 78px, and the "Plate cost" figure sits inside the overlap.

### 2. MINOR — "the desktop (≥1200) is unchanged" is false for the row/band grid tracks in roughly 1076–1249px, including 1200px itself

I diffed the actual rendered `#lines .bld-row` grid at width 1200 between `origin/main`'s CSS and this branch's CSS (same server, same fixture):
- main: `132px 110px 110px 90px 40px`
- this branch: `140px 107px 110px 85px 40px`

The QTY and line-cost (LC) tracks are 3px and 5px narrower respectively at a completely ordinary desktop width. They only return to the old fixed 110/110/90 values at ~1250px (measured the crossover: 1200→`107/110/85`, 1250→`110/110/90`). Nothing clips (all values stay above their own stated floors of 82/95/60), so this is cosmetic, not a defect a user will notice — but it contradicts the in-code comment's claim that the chips are compressed only "at the narrowest two-column width" and "widen once they are back at 110/110/90," which reads as though this settles at or near the wrap boundary (1076px). It doesn't; the compression persists across roughly 175px of ordinary desktop viewport widths. No test in the new spec checks this — its "3:" tests at 1076/1100/1200/1360 only assert absence of clipping, not agreement with the pre-existing track widths. Confirmed by running Playwright against both CSS versions in place (main's `css/style.css` swapped in, measured, then restored).

### 3. NIT — the planning docs state a wrap breakpoint the shipped code overrode within the same batch

`docs/QUEUE.md` and `docs/QUEUE-2026-09-08-CONSOLIDATED.md` both assert, as a corrected/measured fact, that "the wrap point is **exactly 1056**" (`480 + 280 + 20` to the pixel) and that the band is "768 to 1055." The shipped CSS comment says the opposite happened mid-batch: `.bld-main`'s flex-basis moved from 480 to 500 "in the same edit," which moves the real wrap point to 1076 — the number the CSS and the new spec both actually use. The two queue docs were never reconciled to the final 1076/1075 figures, so a reader planning off item 49's "corrected" table (still marked `doing`, not struck) gets a number this very batch already invalidated.

---

## Decisions

### 1 — the bar under the nav rail · **CONFIRMED, FIXED, AND THE FINDING'S SCOPE WAS ITSELF SHORT**

**The defect is real and the review earned the batch.** Reproduced before touching anything (`scratchpad/probe49d.js`): at 768, 900 and 1023 the bar sits at `left:0` under a `[0,78]` rail at `z-index:75` against the bar's `25`, and `.bfs-figs` renders at **x=16**, entirely inside the strip.

⚠️ **AND ITS ONE WRONG CLAIM IS THE ONE WORTH RECORDING: "this collision never occurred in production — it is introduced by this change" IS FALSE.** The reviewer reasoned that the bar was hidden at ≥768 before, which is true, and did not measure the band **below** 768 where the bar was already shown. **Measured on an `origin/main` worktree at 640, 700, 760 and 767: the bar is painted, sits at `left:0` under the same `[0,78]` rail, and the "Plate cost" figure renders at x=16 behind it — on `main`, today.**

The nav becomes a **78px rail at 640**, not at 768. So:
- the defect has existed on `main` for every width from **640 to 767**;
- this batch **widened** it to 640–1023 by showing the bar further up;
- it did not introduce it.

`CLAUDE.md`'s rule that a finding carries separable claims — defect, mechanism, remedy, consequence — with this one landing in the direction that **understates**. Fixed for the whole band rather than only the part 274 widened: `@media (min-width:640px) and (max-width:1023px){.bld-bar{left:78px}}` alongside the existing 224px rule.

**The spec's own failure is the more useful half and is written into its header.** Assertion 6 ran at **1024 only** — the single width that already had a rule — so 13/13 was green while the bar sat under the rail everywhere else. *A spec that checks the boundary it just wrote a rule for has checked its own work.* It now runs at 640, 768, 900, 1023, 1024 and 1075, asserts the bar's left edge against the rail's **measured** right edge, and separately asserts that the **figures** clear it, since a correct left edge with hidden content is the half a user would actually report. Verified red: removing the 78px rule fails exactly the four widths in that band.

### 2 — "the desktop is unchanged" · **CONFIRMED, AND THE COMMENT IS CORRECTED RATHER THAN THE CODE**

Right, and it is the same mistake this batch's predecessor made: **I measured 1360, found it identical to `main`, and wrote "the desktop is unchanged."** At 1200 the tracks really do move — `140 107 110 85 40` against main's `132 110 110 90 40`.

**The code is not changed, because the trade is the item's own subject and is deliberate:** at 1200 the docket cannot hold a 140px name *and* 110/110/90 of chips (140+110+110+90+40 + 48 gaps + 32 padding = 570 against a 564 docket). Something gives, and item 49 is about the name. Nothing clips; every track stays above its floor.

What was wrong was the **comment**, which implied this settles at the wrap boundary when it settles around 1250. Rewritten with the measured figures and an explicit note that it is the intended trade, so it is not re-litigated as a defect later.

### 3 — the queue docs' stale wrap point · **CONFIRMED AND FIXED IN BOTH FILES**

Exactly the "two files describing one thing will disagree" defect, committed inside the batch that had just written the corrected table. The 1056 was measured against the **shipped** 480 basis; raising it to 500 was part of the fix and moved the wrap point to 1076. Both numbers are true of different code, which is precisely why leaving the old one unqualified was the problem.

`docs/QUEUE.md` and `docs/QUEUE-2026-09-08-CONSOLIDATED.md` now carry 1076/1075 throughout, with one sentence recording that 1056 was correct against the pre-fix basis. The queue item also gains the 640-rail fact, so the next change that widens where the bar appears is told what it owes.

---

## One thing the review did not find, recorded because the guard did

Rewriting the finding-2 comment left a `*/` mid-block, closing a CSS comment early and leaving two lines of prose as raw stylesheet text. `tests/css-syntax.test.js` went red on the next run.

That is `.claude/rules/css.md`'s *"a CSS syntax error is SILENT, and it discards every rule after it"* — the guard catching the exact class it was written for, in the batch that was editing comments about measurement discipline. Nothing shipped; noted because the guard's value is invisible unless someone says when it fired.

---

## What the review did NOT find, and CI did

**The breakpoint itself was wrong, in the dangerous direction, and every gate in this repo passed it.**

`browser specs (Playwright)` went red on the PR with the local suite green. Three failures, two causes:

**The wrap point is not a property of the app.** It is where `.bld-body`'s inner width reaches 800px, and that width depends on the **scrollbar** as well as the viewport — overlay scrollbars on macOS, a classic one on the Linux runner. So the same 1076px viewport is two-column here and **still wrapped** there.

⚠️ **That is not a test artifact, and reading it as one would have been the expensive mistake.** A media query pinned one pixel past the locally-measured wrap leaves any machine with a wider scrollbar a band where the query says "two-column" — so the bar hides and `#saveBtn` is restored **to a rail still sitting under a full-height docket**. A width with no reachable commit: precisely the defect this batch exists to remove, reintroduced by its own fix, on every Linux and Windows machine.

**And note which gate failed to see it.** `tests/builder-readiness.test.js` asserted the three new media queries agree with **each other**, and they did — perfectly, at 1075/1075/1076. **Agreement between rules is not agreement with the layout.** All three can be consistent and all three wrong about where flex actually wraps.

**Three corrections:**
- **The threshold is now 1100, deliberately loose**, not wrap+1. Between the real wrap and 1100 the bar is shown while the rail is already beside the docket — one control, reachable, mildly redundant. **Overlapping is safe; a gap is not,** and the two errors are not symmetric.
- **The spec asserts the property, not the number.** It sweeps 900→1200 in 20px steps and asserts that *wherever the rail wraps, a commit control is on screen* — plus never two, and never none. True at every scrollbar width, in every environment, and it cannot be satisfied by three rules agreeing with each other.
- **The unit-noun floor is `32px`, not `2.5em`.** The em resolved to a fraction and the runner rounded the qty inputs to 427 and 428 where macOS gave one value. The assertion now tolerates 1px of sub-pixel rounding and names the 23px defect it is really about.

`tests/builder-readiness.test.js` now asserts the **asymmetry** instead of adjacency: the bar's threshold must sit strictly above the wrapped-rail band, by at least 20px, "which is under the ~17px a classic scrollbar can move the wrap point by." Verified red against the exact 1075/1076 configuration CI rejected.

**The transferable half, and it is the reason this section exists rather than a quiet fix:** `.claude/rules/tests.md` already says a viewport-geometry **assertion** must measure its reference rather than name it. This batch proves the same is true of a **rule**. A breakpoint derived from a measured container width inherits every environmental assumption that measurement carried — and unlike a test, a wrong breakpoint ships.
