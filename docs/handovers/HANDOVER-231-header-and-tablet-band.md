# HANDOVER - 231 (one header band, sticky page header, tablet tables)

**Branch:** `fix/ui-audit-phase2-header` (PR #253) · **Scope:** Max's ordered Phase 2 plan of 3 Sep 2026 against `docs/ui-audit-2026-09-02.md`, steps 1-2 (rows R21+R22, R1-R3) plus the dark-theme matrix re-run.
**Shipped `ezplate-v190`.**

## What changed
- The page header pins on scroll (R22, measured as scrolling out of view, not covered), so the title and the menu scope stay on screen; the mobile Menu header now names the current menu.
- One `--header-h` token (R21): the sidebar brand rule and every `.scr-head` hairline sit at the same y and read as one continuous line, at rest and while scrolled.
- That partially reverses Max's 12 Aug matching-edges call, for the RULE only, on his own written R21 instruction; recorded at the CSS site and in `v155-shell-edges.spec.js`'s retitle.
- The builder header is deliberately not sticky (its cost panel already pins; its mobile header is three rows).
- `html{scroll-padding-top}` so keyboard focus and find-in-page land clear of the pinned bar.
- The three data tables get 768-1023 track overrides sized from measured content (R1-R3): Menu name 34px to ~150, Ingredients identity 64px to ~196 (rows 203px to ~57-95), Products' 76px of silently clipped right edge gone.
- Dark-theme matrix re-run: 146 captures, zero new rows; recorded in the audit file with method and honest scope.
- New specs `v190-sticky-header` and `v190-tablet-band`; every new assertion was watched fail via hand-run CSS reverts.
- Remaining steps 3-6 and Max's deferred list are queue item 0, written to be runnable cold.

## Review
Two runs of the `code-review` agent, both forced onto Opus, diff only, no brief.
Review 1 (commit 2bcdd55): 7 findings, 2 major — a mis-scoped selector that let the Menu `<select>` swallow its row on phones, and a no-wrap assertion in the new spec that could not fail. All 7 fixed in ecd0081.
Review 2 (range to 8798b8c): 9 findings, none major — it reverted each band override itself and re-measured every assertion; the standouts were mono-font track widths measured in the wrong font, a 9.5px-slack threshold, and a dead `.king-link` line-clamp a new comment had papered over. All acted on in 262804e; the dead clamp predates the batch and is filed in `docs/MAINTENANCE.md`.
`docs/reviews/REVIEW-231-header-band.md` holds both verbatim reports and every decision; it names a reviewed commit in each range.

## Into CLAUDE.md
Nothing. The candidate lessons (a test whose threshold clears the broken case by less than a line box; measuring text in the cell's actual font) are instances of roster classes already recorded.

## New docs/QUEUE.md items
Item 0: UI audit Phase 2 steps 3-6, Max's own ordered plan, with his constraints, his deferred list, and the harness location.

## New docs/PHONE.md items
The pinned page header in the installed app: confirm sticky survives real iOS standalone.
A failure looks like the bar scrolling away with the page, sitting partially off-screen, or juddering.
The check deliberately does NOT claim to test notch clearance: under the shipped `status-bar-style: default` the safe-area inset is 0 in standalone, so that collision cannot occur on the current build.

## Probe
What the plan said that I would have done differently: the R22 row suggested showing `.scr-sub` on mobile generally; only Menu's sub is load-bearing, so the change is id-scoped to `#menuHeadSub` and every other screen keeps the mock's title-plus-one-action mobile header.
Also the R21/R22 rows and the covered-or-scrolling first task were already committed by a previous session (PR #252); I verified instead of re-appending, and re-ran the scroll probe fresh rather than trusting the record.
What I did not propose because it was out of scope: widening the desktop table tracks at exactly 1024, where the Menu name column (170px) is now tighter than the band gives it at 768; noted in the audit progress table.
Also the dead `.king-link` line-clamp (maintenance-filed, not fixed) and the R14 wide-screen centring interaction with the new full-width header rule.

## Surprises
- The band between 768 and 1023 was measured by no spec at all, which is how three tables rotted; the new band spec exists for exactly that reason.
- `env(safe-area-inset-top)` is 0 even in the installed PWA because the app ships `status-bar-style: default` — the first draft of the PHONE.md check promised a notch test the build cannot produce; review 2 caught it.
- The audit harness's `--theme=dark` run needed only a seeded `cafeCost_theme` key, and the dark theme came back clean everywhere sampled — the tokenisation genuinely held.
- My own first-draft tests produced three could-not-fail assertions across the two specs, all caught by review or hand-run mutation, none by re-reading. The roster's count stays where it is; these are known shapes.
