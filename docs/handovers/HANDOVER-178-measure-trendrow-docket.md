# HANDOVER - 178 (the form measure, the trend row, and the docket)

**Branch:** `fix/v3-measure-dashboard-docket` (PR #165) and `ci/skip-browser-specs-on-prose` (PR #166).
**Scope:** a four-item brief from Max, 12 Aug 2026, against the refreshed v3 package; then a fifth item he asked for once the Actions bill came up.
**Ships `ezplate-v157`.** PR #166 ships no client asset and bumps nothing.

## What changed

Settings and Account cap at 760 and stay welded to the sidebar; at 2400 the header rule ran to x1416 over cards ending at x936, which read as a left stripe.
The dashboard's full-width chart is now a two-up: the trend at 2/3, a new Recent-changes card at 1/3 naming the changes its dots come from, with the since-line rehomed from a standalone banner into that card's header meta.
The plate builder is rebuilt from the mock: the docket is the editing surface, with a mono masthead, dashed rules, a tally at its foot and a tear-off edge, and the rail is a sticky summary carrying the total, the recent range, a menu-price input and Save.
A plate on exactly one menu can have its sell price set from the builder, which previously needed the Menu screen's edit modal.
A prose-only diff no longer pays for the 8.7-minute browser job, which ran twice per merged PR.

## Into CLAUDE.md

**One rule proposed, not added - it needs Max's yes.**

> **A primary action must not live inside a node that re-renders.**
> `renderBuilderCost` replaced the whole of `#bFootSum` on every keystroke, which was harmless for
> two years while that bar held only figures.
> The moment it carried Save, tapping it with a field focused fired blur first, replaced the button
> between touchstart and touchend, and a touch browser drops the click.
> The rule is not "avoid innerHTML"; it is that adding an interactive control to an element changes
> what its render cadence costs, and the cadence is usually written somewhere else.

Nothing else. The vendor-refresh finding below belongs in the file it is about, and is already there.

## New docs/QUEUE.md items

None. Two things were declined as work and are recorded here rather than queued, because neither would stop, embarrass or hurt a paying customer:

- The 289-spec Playwright suite has never been audited for specs that pass against a broken app. This project has hit that failure seven times, so the suite itself is due one. C-tier.
- `dispPrice` still returns a string that two of its four callers have to unpick, noted in 176 and still true.

## New docs/PHONE.md items

**Two, both on the builder, both only reachable on a real device.**

- **Tap Save in the sticky bar with the menu-price field focused.** It must commit. A failure looks like nothing happening on the first tap and working on the second. This is the defect the review found and the fix is the button no longer being re-rendered, but the blur-then-tap ordering is a browser behaviour and only a phone can confirm it.
- **The plate name is back in the breadcrumb header.** A failure looks like iOS zooming the page when you tap it, which is what the app-wide 16px `!important` exists to prevent and which this field deliberately does not override.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

The brief put the plate name back in the breadcrumb header, which reverses 170 - a change Max asked for himself after reporting that the first thing a user met on an empty builder was the last step of the form.
I built it as asked and it is defensible now, because deleting the numbered step cards moves the fill order onto the docket's own add field, so the name in the chrome is no longer the first step anyone meets.
But 170's complaint was about what the screen puts in front of you, not about where a field is declared, and that is worth looking at on the phone before it is settled.

The brief also asked me to keep the supplier count and the "Spc" code "in force" as data-bug fixes.
They were investigated in 176 and are not defects: 411 of 412 products carry a brand and 19 carry a supplier, so the header's "3 suppliers" is correct, and SPC is a real company stored in `brand`.
Nothing was changed, so there was nothing to hold in force. This is the third time that confusion has come round.

**What did you not propose because it was out of scope?**

The two-pass dashboard render exists because `trendPlotSize` measures a DOM box, and a renderer that must run twice to measure itself is a shape worth removing rather than commenting.
The honest fix is for the chart to size itself from its own container after mount rather than for the caller to sequence it, and that is a refactor of the dashboard's render path on a batch about layout.

## Surprises

**The design package refresh silently reverted the repo's amendments, for the second time.**
`FOLD-IN-PROTOCOL.md` is the vendor's file, and a fresh drop does not carry the amendment box recording Max's decisions of 10 Aug - that §0a's revert pass is overridden and the `.legacy` wrapper was never built.
PR #159 did it once; this batch did it again while legitimately updating the mock.
Both times it rode inside a diff that reads as "updated the handoff docs".
The box now names both incidents and gives the one-line check, which is the only place that can catch the third.

**`trendPlotSize` had been over-measuring since F6, and moving the chart made it matter.**
It read `#dashBody.clientWidth` - 1084 against a chart that rendered at 667 - so everything inside the viewBox drew at about 0.6 scale, which reads as slightly-too-small axis type and nothing else.
At 2/3 width that stops being cosmetic. It now measures a padding-free box inside the card, and viewBox equals rendered width exactly.

**The install banner has been sitting on top of the summary bar the whole time.**
Fixed at `bottom:84px` with `z-index:78` against the bar's 25, so they have overlapped since the bar existed and the symptom was a covered figure.
It became a covered commit button in this batch. Found by Playwright reporting an intercepted click, not by looking, because the two elements only coexist once the install prompt has fired.

**A one-line comment cost a test file its whole run.**
The new `dash-recent.test.js` builds its sandbox with a template literal, and the comment I wrote inside it used backticks around identifiers.
A backtick ends a template literal, so the file threw a syntax error rather than failing an assertion.
`change-log.test.js` carries a warning about exactly this, three feet away, and I wrote the comment anyway.
