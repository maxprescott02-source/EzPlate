# HANDOVER — 176 (the wide viewport)

**Branch:** `fix/shell-polish-edges` (shared with 175, one PR — #162, at Max's request).
**Ships `ezplate-v156`**, which is the deploy version for BOTH batches in that PR: one merge, one
deploy, one number. 175's commits say `v155`; the six spots now read `v156` and that is the figure
that reaches a phone.

Fifteen items arrived as a list. Eight were built, four were not defects, and three are named below
as deliberately not attempted.

## What shipped

**The page container is left-anchored.** This was the real one. At 2400 the sidebar ended at x224
and the table began at x876 — a **652px dead zone** — because `margin:0 auto` centres a 960 column
inside a 2176px main region. At 1440 it was 172px. Now a fixed `margin-left` with `margin-right:auto`,
so spare width collects on the right and the content stays welded to the sidebar. Measured 32px at
both widths.

⚠ **The horizontal padding is 0 and the margin is 12, which looks wrong and is not.** The gutter a
reader sees is made of three stacked insets: this container's margin, its padding, and the 20px that
`.scr-head` and every body block share for 175's matching-edges contract. The first cut used
margin 32 + padding 24 and measured **76px**, over twice what was asked for. 12 + 20 = 32 without
disturbing the shared 20.

**Tables cap at 1200** with the identity column flexing and the two mono columns fixed and adjacent,
so spare width goes to the product name rather than opening a gap between a figure and its
neighbour. Widest inter-column gap now 16px.

**The theme toggle has its own region** at the foot of the sidebar, under Account and its own
hairline. It wears `.navbtn` for the nav's rhythm and carries **no `data-tab`**, which is what keeps
it out of `querySelectorAll('.navbtn[data-tab]')` and therefore out of the router. Both the 44px-floor
override and the `::after` hit area were **deleted** with the 22px square they existed to prop up — a
nav row clears WCAG 2.5.8 on paint alone, so re-adding either would now shrink a compliant target.

Also: the search field capped to the 320–400 band (it was 494 and grew with the viewport); the title
and its meta line share a baseline instead of the meta floating at mid-height; the unit suffix
(`/kg`) is smaller and dimmer so the money scans as a column; the install banner docked clear of the
content and restyled secondary.

**The install banner needed the document's help.** It overlapped the table by 252px at 1440. A fixed
panel cannot be positioned clear of a column that already spans the viewport, so `show()`/`hide()`
set a class on `<html>` and the page reserves the banner's height while it is up. If that pairing is
ever broken the symptom is the last table row sitting underneath it again.

## Into CLAUDE.md

**One rule proposed, and it is a new failure mode rather than a restatement:**

> **A CSS syntax error is SILENT, and it discards every rule after it.** There is no build step and
> nothing parses `css/style.css` — so a malformed rule takes out its neighbours with no error
> anywhere. `npm test`, `node -c` and the page all stay green; the only symptom is a measurement
> coming back wrong. `tests/css-syntax.test.js` is the guard.

Not added to the file without Max's yes. Recorded here and in the queue-adjacent notes so the next
batch has it either way.

## New docs/QUEUE.md items

None added. Three items were declined as work (below) and belong to a later batch if Max wants them.

## Probe

**What did the brief tell you to do that you would have done differently?**

Two of the fifteen items were requests to fix things that were not broken, and both rested on the
same confusion this project has now had three times: **the secondary text beside a product name is
the BRAND, not the supplier.** Counted against the live table — 19 of 412 products carry a supplier
and there are **3 distinct** values, while brand is populated on 411 with **137 distinct**. Every
name the brief listed as a supplier (Priestleys, Heinz Watties, Caterers Choice, Cater Clean, Ozbag,
Sandhurst, Alfinas, Seacrest, Seafrost) is a brand with `supplier` null.

So the header's "3 suppliers" is **correct**, and "fixing" the count would have made it state
something false. And "Spc" is not a raw code leaking through a missing name mapping — it is SPC, a
real Australian food company, stored in `brand`. There is no mapping to trace.

I would also have asked before believing the third: the "floating dark pill at the right screen
edge" is not in this app. The only fixed dark element is `#toast` and it computes `opacity:0`. It is
almost certainly Vercel's preview-comments toolbar, which this repo has enabled and which never
reaches production.

**What did you not propose because it was out of scope?**

The `/kg` suffix fix wraps `dispPrice` rather than changing it, because two of that function's four
callers put its return value where markup would be wrong. The cleaner answer is for `dispPrice` to
return parts rather than a string, and for its four callers to compose what they need — but that is a
refactor of a shared helper on a batch about layout, and it would have touched the invoice review.

## Surprises

**A CSS syntax error cost a full diagnose cycle and produced no error anywhere.** An edit inserted
comment text without its opening `/*`. The parser did exactly what the spec says — discarded the
malformed rule and everything after it until it could resynchronise — so `.wrap{max-width:1200px}`
and the rules following it were simply absent. The page rendered, the suites were green, `node -c`
was clean, and the only symptom was a measurement that came back wrong. Diagnosed by dumping which
`.wrap` rules the CSSOM actually contained, which showed mine was not there at all.

**A test I wrote in the previous batch became vacuous because the fix worked too well.** The wider
table means nothing truncates at 1360, so the Products truncation test's own "these rows are
genuinely tight" precondition stopped holding — it passed while proving nothing about shrink order.
Rewritten to assert the RELATIVE contract at a width that applies real pressure (1024: 15 brands
clipped, 10 names, **0 name-only**). That is the second vacuous test found in two batches, both
mine, both green.

**A wrap detector can be falsified by an alignment change.** `fresh-states` inferred "the header
wrapped" from distinct child CENTRE lines, on the explicit reasoning that "the centre is the only y
shared by everything on one row". Baseline-aligning the title and its meta makes that false, and the
test read 3 rows on a header that had not wrapped. Replaced with a direct test — a wrap is a child
that begins below another child ends — which no alignment can fake.

## Deliberately NOT built, and why

- **Sortable column headers (item 9)** and **pagination/virtualisation (item 10)** are feature-sized
  work across five screens, not layout fixes. Half-built sorting on five tables is worse than none.
  The measurement the next batch will want: **393 rows render in one DOM pass** and there is no
  existing pagination to preserve, so this is net-new rather than a regression to avoid.
- **A row overflow menu (item 11)** — the hover and cursor halves were already correct (rows are real
  `<button>`s). But there are **no per-row actions** to rehome: the whole row opens the edit modal.
  Building the menu would be inventing a control, which R3 does not ask for and §5 forbids.

## One limit, stated

**No pre-push review this time** — the brief said "no code review pass, just implement". 175's
findings were reviewed and fixed; 176's were not read by a second model. The suites are green
(986 unit, 288 Playwright) and every layout claim above is measured rather than argued, but that is
not the same as a second reader.
