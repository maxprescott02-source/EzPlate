# HANDOVER — 175 (shell edges, Products, the trend)

**Branch:** `fix/shell-polish-edges` · **Scope:** `docs/QUEUE.md` items *Desktop shell polish*,
*Products table polish*, *Dashboard trend polish*. Ships `ezplate-v155`.

Three change sets, one per item, one commit each. The batch began as a request to execute the whole
v3 fold-in from scratch; that premise was wrong and is the first thing recorded below.

## The premise correction that came first

The prompt (and `FOLD-IN-PROTOCOL.md` §0a) said a fold-in pass had been **abandoned**, left the app
half-converted, and should be reverted to pre-redesign before rebuilding all nine screens.

**The fold-in was not abandoned. It completed on 11 Aug 2026** — F1a–F10 as `ezplate-v136`–`v149`,
plus the mobile More screen as `v151`, with one handover each from 144 to 171. `docs/QUEUE.md:17`
says so outright. Screenshots at 1360×900 in both themes confirmed it: v3 sidebar, `.scr-head` bars,
tokenised light and dark, Geist Mono figures, v3 empty states, and every hex outside the token block
a comment, a `var(--x, #fallback)` or the print stylesheet.

Step 1 of the prompt would have deleted nineteen shipped versions of merged, reviewed work and put
Max's phone back on the pre-redesign app. It was not run. Max was asked, chose to skip to the defect
list, and separately chose to reverse his own 10 Aug full-bleed-header decision.

**Why the stale text was there, because it will otherwise happen again:** `FOLD-IN-PROTOCOL.md` was
overwritten with the vendor's pristine copy inside PR #159 — a Supabase-staging batch whose commit
messages never mention it, so it was swept in rather than authored. That wiped two of Max's own
amendments: the 10 Aug override of §0a ("no revert pass") and the `.legacy` strike. Both are restored
in this batch, with a box at the top of the file saying the phase is finished. Without them the file
instructed a reader to revert the app and contradicted `QUEUE.md` on the deletion mechanism.

## What shipped

### 1. The shell's page container (`ezplate-v155`)

The header rule overhung the content by 20px on every screen. `.scr-head` took its inset as
**padding**, so the border-bottom spanned the whole `.panel` (x336–1248 at 1360) while every body
block put its content at x356–1228 — too small to read as the mock's full-bleed band, too large to
read as aligned. The inset becomes a **margin**; the title and the actions do not move.

Four blocks were not on the column at all, each drawing a visible border 20px outside its own screen
title: the Settings and Account cards, the Invoices dropzone, and the builder's two columns. None was
wrong on its own terms — they were measured against a header that used to be 20px wider.

The page container had no top padding: `.scr-head` sat 8px from the top of the chrome. Nobody had
declared the 8px — `.plib-panel` zeroes `.panel`'s margin-top and nothing replaced it. Now 32px.

**Most of the item did not reproduce, and that is recorded so it is not re-measured:**
- **Nav weight.** The item said every label renders at 600. Measured 13/500 inactive, 13/600 active,
  title 15/600 — the mock exactly. v136 had already fixed it. Now pinned, so a regression cannot look
  like the original report.
- **Sidebar rhythm.** Nav items measure `padding:7px 10px`, which *is* the mock's value. The
  bottom-group gap is the mock's deliberate separation and it already has the hairline the item
  wondered about (`css/style.css:1643`).
- **The gutter.** The app's 24px is inside the mock's stated "padding 24–32px". The ~135px reported
  alongside it is not padding: at 1360 the main region is 1136 and the column is capped at 960, so
  88px a side is the max-width doing its job. Reclaiming it means abandoning the 960 cap.

**The one deviation from the mock:** the mock's §2 header has `padding:14px 32px` and no max-width,
so its hairline is full-bleed. Max chose matching edges on 12 Aug 2026, having been shown that this
reverses his own 10 Aug call. R1 would say the mock wins; an explicit owner decision outranks the
rubric. What we give up is "the header is a band across the app, not a lid on the content column".

### 2. Products — six defects, and a column counted rather than guessed

The item refused to let the Supplier column be decided from the fixture. Counted against the live
`ingredients` table: **19 of 412 products carry a supplier, 393 are empty, 3 distinct values in the
whole catalogue**, while `brand` is populated on 411 of 412. The column was 95% dashes; its 140px
goes to the name and the category.

It is **hidden, not deleted**, and that is the whole of R3 here: the renderer still emits the cell,
the phone still reads "Category, Supplier" on its meta line as the mobile mock draws it, the supplier
filter is untouched, and the value is on the row's edit form. The earlier report that the column
"duplicated" the name's secondary text was wrong — that text is the BRAND.

Also: `steady` → a dash on **both** Products and Ingredients (one function, decided once, per the
item); category casing normalised at **display time only** via `catLabel`, with `fillFilter` keeping
the raw string as the option VALUE; category 120 → 190px so no real value truncates mid-word; the
brand yields its width so the name stays whole (measured: `scrollWidth == clientWidth` on every name,
only the brand clips); filter selects sized to content, matching the mock's own `flex:1` search
beside an unsized select; and the clear × on all **seven** search fields appears only with a value.

### 3. The Dashboard trend

A card like its neighbours with the range control in the header band (reverses F6, which correctly
read the mock as drawing no container); a real x-axis of dates on real readings (reverses v48, whose
"the scrub tooltip gives exact dates" is nothing at all on a phone); and the active range pill off
orange, so the section no longer shows three accent hues. **The markers stay orange** — they mean
"you did this" while the line means "where you stand against target", and §8 reserves green/amber/red
for cost semantics.

## Into CLAUDE.md

**Nothing proposed as a new rule.** Two existing rules earned their keep loudly and are already
written: the `[hidden]` corollary (an author `display:flex` beats the UA's `[hidden]` on ORIGIN — the
clear-× fix does nothing without `:not([hidden])`) and "measure, don't read" (four of this batch's
findings were invisible in the file and three reported defects did not reproduce).

## New docs/QUEUE.md items

None added. Three removed as shipped, and the file renumbered to 12.

## Probe

**What did the queue item tell you to do that you would have done differently?**

The shell item listed four defects and two of them were already fixed. Building from its list without
measuring would have produced a diff that "fixed" the nav weight by setting 500 on a rule that
already said 500, and a handover claiming a repair that never happened. The item's own warning
("measure before building — three of the other thirteen did not reproduce") was the most useful line
in it, and it was right a fourth and fifth time.

The Products item was the opposite: it refused to let me decide the Supplier column from the
fixture and demanded a count against live data. That instruction is what turned a plausible guess
into a decision — 19 of 412 is not a number anyone would have estimated from the screenshots, where
every visible row showed a dash.

**What did you not propose because it was out of scope?**

The supplier **filter** is now a control over a field that is 95% empty with three distinct values in
the entire catalogue. Dropping the column while keeping the filter is defensible — the filter is a
control and R3 protects it — but the two decisions clearly want taking together, and the item scoped
only the column. Not built, not queued, named here.

Also left alone: the mobile Products header still carries two actions ("Import" beside "New
product"), which is queue item 1 and blocked on Max's yes to a proposed home.

## Surprises

**The premise was wrong, and the evidence for it was a file that had been silently overwritten.** The
protocol said one thing, git said another, and the difference was nineteen versions of shipped work.
The cheapest check — `git status` plus a per-file `git log` on the design package — settled in one
command what the file itself could not.

**A four-column grid with a five-column pin grows a fifth track.** Re-tracking `.ing-band`/`.ing-card`
while `.ing-price` and `.ing-drift` stayed on columns 4 and 5 created an **implicit** track. Nothing
errors; the grid just grows, and the category landed 22.9px off its own header. Caught only because
v140's band test asserts alignment *against the header* rather than against the template — a test
that had checked `grid-template-columns` would have passed.

**`width:auto` shrink-wraps a `<button>` even at `display:block`.** The Invoices dropzone is a real
`<button>` (for the focus ring and Enter/Space), so intrinsic sizing wins and `auto` collapsed it to
723px. An explicit `calc(100% - 2*--sp-5)` is what the margins needed. Measured, not reasoned about.

**Adding 8px of vertical padding to `.scr-head` broke the bar's height.** The tallest child is a 39px
`.plib-btn2`, so 39+16 took Menu and Ingredients to 56 while Dashboard and Settings stayed at 48 —
one rule, two outcomes, and the CSS looked right. Reverted; the clearance belongs to the container.

**`#builderPage` is not a `#tab-*` pane, and a loop over the tabs misses it.** All eight tab screens
passed the edge assertion while the builder's two columns began 20px left of the plate name above
them. A screen that is not in the list is not covered by the list.

## One limit, stated

**The pre-push `code-review` agent did not run.** `CLAUDE.md` makes it mandatory and calls it the
only thing standing between a mistake and production; this session carried an explicit instruction
not to invoke agents. The conflict was not resolved silently in either direction — it is named here
and in the batch report so Max can run it before merging. The suites are green (984 unit, 284
Playwright) but a green suite is not a second reader.

Nothing is pushed and no PR is open.
