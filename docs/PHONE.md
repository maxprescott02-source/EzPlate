# Phone

Things only a device can settle.
`/batch` appends here rather than stopping - Max works through it in one session.

Each entry: what to check, why a phone is the only judge, and what a failure looks like.

**Reconciled 7 Aug 2026** against every handover's "Needs Max's phone" section (v99–v115) and the Batch 0 audit's Part D inventory.
The previous version listed four versions and a one-line stub for everything else; v100–v108, v112 and v114 were missing entirely, and the carried backlog had no items in it - only a count.
Production state below is measured, not assumed.

---

## v132-v135 - the v3 repaint reached your phone (AUDIT-v135 D2: nobody asked you to look)

- **Every screen now wears the v3 look on the phone too:** white canvas, flat bordered cards, the Geist typeface, and NO dark mode (your call, 9 Aug - light only until a designed dark package exists). The mobile LAYOUTS are unchanged until V9; the paint and type are not.
  Failure: the typeface renders badly at small sizes on the real screen, contrast suffers on the real OLED in kitchen light, or you simply miss dark mode - all three are device judgements no emulator settles.
- **If you used dark mode:** it is gone, and the app should come up light with no flash of the old theme. Failure: a stale dark flash at boot, or the PWA title bar clashing with the white app.
- **The Menu tab at ≥1024 only (iPad landscape):** switcher pills replace the menu dropdown. A 6th menu makes the pills stand down and the dropdown return, with no copy explaining the swap - **say if that reads as breakage** (it is one line of copy or an earlier overflow design if so).
- **The mobile Menu verdict cell** says "42.9% · over" with no visible word "target" (the column header is hidden on phones; the aria-label carries it). The v133 review flagged it as possibly reading as "42.9% over [something else]". Failure: you misread it even once. V9 is where the fix would land.

## v129 - the dashboard scope dropdown

- **Open the Dashboard and look at the verdict row: the big figure on the left, the "All menus 21.7 ▾" button on the right.**
  Both state the same number, in the same semantic colour, a few centimetres apart — the mock draws it that way and the pre-push review flagged it as worth a real-screen judgement. On a 380px phone the button wraps under the figure, which may read better or worse than side-by-side.
  This is a **taste call**, not a defect hunt: does the doubled number read as confirmation ("this is what you're scoped to") or as clutter?
- **Why only a device settles it:** the duplication is deliberate and correct at desktop width; whether it feels heavy depends on the phone's actual line-wrap and how much the two numbers dominate the card together, which Chromium's 380px emulation renders but cannot judge.
  Failure: it reads as the same stat shown twice for no reason. If so, say the word and the button can show the name + caret only.
- **Tap the button, pick a menu, tap elsewhere to dismiss.** The popover should close on an outside tap and never re-open on its own after switching tabs.

---

## v119 - the builder takeover goes edge-to-edge

- **Open any plate in the builder and look at the two side edges.**
  Until now the phone got a full-height, square-cornered sheet that was **24px too narrow** - a 12px strip of dimmed backdrop down each side. It has been that way since v54 and nobody named it; it was found by measuring, not by looking.
  Chromium at 380px now reports the sheet at the full viewport width in both themes, so this is a **confirmation**, not a diagnosis.
  Failure: a visible gutter remains on either side; or the opposite direction - content now runs under the rounded display corners, or the × / Save bar collides with the notch or the home indicator.
- **Why only a device settles it:** the sheet is `min-height:100dvh` and the overlay uses `env(safe-area-inset-*)` padding, and both were previously masked by the 12px inset. `dvh` and the safe-area insets are exactly what a desktop browser cannot reproduce - iOS Safari changes `dvh` as the URL bar retracts.
  Check it **scrolled to the top and again after scrolling the docket**, and in landscape, where the insets move to the sides.
- **Same rule covers the ingredient wizard** (`.modal-wiz`). Open it once and check the same two edges.

---

## v118 - the plate draft

- **Open a plate, look, close with ×. Then open a different plate.**
  The old build planted a draft on that second visit and met you with "Unfinished plate — resume or discard?" about a plate you never edited.
  Chromium says it is fixed at 380px and 1280px, so this is a **confirmation on the real device**, not a diagnosis: it depends on the builder actually closing the way a thumb closes it.
  Failure: the prompt still appears after a look-only visit, or - the worse direction - it stops appearing after **real** unsaved edits.
- **The new "Plate changed since" dialog.** Only reachable by editing a plate on one device, leaving a draft, and changing that plate elsewhere before resuming.
  Hard to stage deliberately; worth a look if it ever appears.
  Failure: the wording does not make clear which version wins, or "Resume anyway" and "Discard draft" are the wrong way round under a thumb.

---

## v115 - the dashboard reframe

**Production now has ONE change-log entry** - a dish removal on 6 Aug ("Bacon & Egg Muffin", −0.17pp).
So the chart has one marker and a since-line rather than the empty state the handover predicted.
One marker is a thin test: **make a second change before judging this**, so you can see whether two drops read as a sequence or as noise.

- **The chart with markers and the since-line, 380px, both themes.** Do the drops read as *your* work?
  That is the entire batch.
  Failure looks like a drop you cannot connect to anything you did.
- **The since-line.** Honest, or nagging?
  It is the one piece of new copy.
- **The unified ring.** Boot, pull-to-refresh and the invoice wait should read as one thing.
  Failure: they still feel like three different apps.
- **The patient boot message** after a genuine week idle - "Still loading, the first open after a break takes a little longer."
  Honest or annoying?
  A warm boot never shows it, so this waits for a real gap.
- **Re-tap smooth scroll and tab-switch scroll.** Chromium could not answer this: it pauses rAF in background tabs.
  Does iOS Safari fight it?
- **The chips** - Healthy / Watch / Rework.
  ⚠️ **Corrected 8 Aug 2026 by the v115 audit: this entry used to read "the dotless chips", which described a state that never shipped.**
  The dots were removed in v115's first draft and put BACK on Max's own instruction the same day (`HANDOVER-v115.md:227` reverses `:116`).
  Both the dots (`css/style.css:504`) and the active-chip tint the removal introduced (`:507-510`) ship together.
  So the question is not whether the idle row is too quiet without dots - it is whether **dots plus a tinted active chip** is one signal too many.
- **The v115 splash / loading screen.** Rebuilt live on the last shipping batch after being decided three ways in one day (`HANDOVER-v115.md:222` then `:247`, which supersedes it), and it is the first thing a user sees.
  It also carried a bug only a browser caught - the session flag was set before it was read (`HANDOVER-v115.md:265`).
  Failure: it flashes on a warm open, or shows twice, or a real week-long gap shows the wrong one of the two states.
- **Builder rows at 380px.** The overflow from Max's screenshot.
  Contained in Chromium by measurement; the phone is the judge.
- **The Gemini insight arrival.** Settles rather than flashes?

## v114 - the extra write

- **Does a plate save feel slower?** Every save now fires one extra INSERT.
  It is fire-and-forget and never blocks the UI, but on mobile data after a week idle it lands behind the cold-start penalty.
  If saving feels heavier than it did, this is the first thing to look at.

## v113 - invoice gate and publish guard

- **The invoice wait.** Does the gate read as progress or as the app being stuck?
  Failure looks like reaching for the back button.
  This is the batch's one real risk: on mobile data after a week idle the cold start lands *before* the referee even starts.
- **The timeout path**, hard to provoke deliberately - if Gemini is slow once, check Confirm All comes back and the amber "didn't finish" line is legible.
- **Publishing a plate normally.** The orphan guard should stay invisible when there is nothing to warn about - production has **0** unlinked dishes (verified 7 Aug), so it should never appear.

## v112 - delete sequencing

- **The delete flow end to end.** Delete a plate that is on a menu; confirm it disappears and stays gone after a reload.
  This is the fix's whole point.
- **A failed delete's wording.** Hard to stage deliberately.
  If you ever see the "…it's still in your Plates library" toast, check the plate really did come back.
- **Publish → reload → still costed.** Plates tab → Publish → force a reload → the dish still reads as costed on the Menu tab.
  (This replaces the brief's own check, which pointed at the unreachable `savePlateRestore`.)

## v110 - restore

- **The restore UI has never been seen on a phone.** It is the most destructive button in the app, one tap from Export.
  Check the confirm copy, the iOS file picker, and whether the boot gate reappearing reads as progress or as a fault.
- **Does the iOS Safari file picker offer a `.json`?** The hidden-input pattern is the invoice one and works there, but a `.json` `accept` filter is not a PDF one, and iOS is particular about which files it will show.
- **Does the confirm read as serious enough** - does it FEEL like a stop sign?
- **How long a real restore takes on mobile data**, with the cold-start penalty landing on top.

## v108 - behavioural, not visual

This block is a different KIND from everything above it.
None of it can be checked from a container.

- **The cold-start penalty.** First request after idle measured **~1,138 ms** against 79–152 ms warm.
  With week-long gaps that is the NORMAL case, and it lands on top of the boot gate.
  Single most important thing to feel.
  (Supabase waking, not app latency - boot is one `Promise.all`.)
- **Does the boot gate read as honest, or as broken?** It is the first thing the app shows now.
- **Does the offline message arrive when the signal actually drops** - not just when `navigator.onLine` says so?
  That flag is unreliable in installed PWAs, which is why nothing pre-skips on it.
- **Does a refused product delete explain itself** well enough to act on?
- **Take a fresh `format: 2` (or 3) export** and keep it.
  The restore refuses `format: 1` outright, so an older file is not a recovery path.

## v107 - supplier memory

- **Import one Bidfood invoice and check the supplier field reads `Bidfood`.** The whole batch in one action.
- **Clear the six orphaned taught packs.** Settings → Remembered items → Remove each entry showing "from Document No:".
  **Verified still there 7 Aug: six rows, supplier `Document No:`** - mayonnaise, two cheese-slice entries, pluto pups, lime cheesecake, spring rolls.
  The seventh row (`The Fruit Wagon` / avocado tray) is genuine; leave it.
  The import in the item above re-teaches what it needs.

## v105 - Settings

- **Settings → About wraps to ~3 lines at 380px.** Read it once in situ.

## v104 - Products tab (Opus batch) + the carried C and F blocks

- **Invoice import end-to-end on a real supplier PDF.** This retires the carried block: **C4** add-new dropdown geometry · **C5** form state persistence across rows · **C6** real-PDF parse over mobile data · **C7** catalogue load · **C8** unit-change confirm copy.
  All need a real file and a real phone.
- **The compressed `#invIntro` + the CSV placeholder in situ.** One sentence above the Upload button - reassurance at arm's length, or decoration you skip?
- **Products cards with the new seam/radius.** ~412 products (verified 7 Aug): the tab where an 8px seam either resolves into a rhythm or looks cramped.
  The most-scrolled list in the app and the batch's main visual risk.
- **The invoice modal in light mode.** One card tone now - do rows still separate on a bright screen?
- **iOS modal items F1–F4 (carried).** The invoice modal is their stress case: tallest, most scrollable, the only one that stacks a confirm over itself.
  If v87's scroll-lock has an iOS edge, this is where it shows.

## v103 - Ingredients tab + the carried D block

⚠️ **The Ingredients tab was redesigned in v124** (cards → one surface of rows, inline drift, loud broken links). The D-block flows still apply; the card descriptions predate the redesign.

- **~~Ingredient cards with~~ Ingredient ROWS (v124) with the price column at 380px.** Long product names now wrap into the space the price vacated - does the column read at arm's length, and do prices scan as one axis down the list?
- **The two compressed modal hints in situ.** "Follows the linked product." is the tersest line shipped - five-second test it.
- **D1 (v86 carried):** the strapline in situ.
- **D2 (v86 carried):** the setup-from-products wizard - progress and done states.

## v102 - Plates tab + the carried B block (the biggest single clearable chunk)

⚠️ **The Plates tab was redesigned in v123** (card grid → one surface of rows) and the builder in v125 (cost panel + docket columns). The B-block FLOWS below are still worth driving; the visual descriptions predate the redesign - judge the new rows/panel on their own terms.

- ~~Plates cards: 16px radius + 8px seam at tablet/desktop widths~~ (superseded by the v123 rows - glance-check the row list instead).
- Builder popup: no hint under the search (with ingredients); the compressed docket line; the no-ingredients empty state still appears on a fresh install.
- The Manage-menus modal one-liner in situ.
- Chip tint on plate cards in dark mode with theme = System (the fixed path).
- **B1–B9, all on this tab:** B1 draft resume round-trip · B2 re-entry guard (+ no-nag after save) · B3 live margin preview vs Menu row · B4 sticky Save reachable · B5 "Add to a menu" wording · B6 no-match dead-end lands on Ingredients · B7 empty-plate no-match shows message only · B8 unnamed-plate refusal stays put · B9 printed docket copy.
  **Note on B1/B2 (corrected 9 Aug 2026 by the v125 audit):** the "builder plants a draft just from looking" bug was FIXED in v118 - the v118 block near the top of this file is the current truth.
  If the resume prompt greets you after a look-only visit, that is a REGRESSION worth reporting, not a known bug to ignore.

## v101 - Settings prose

- Walk all seven Settings sections - the six compressed help lines in situ.
  Is anything now TOO terse to act on?
  (Five-second test per section: hide the line, say what the control does.)
- The Remembered-packs modal without its preamble - open it with real remembered packs; does the list stand alone?
  (Seven rows today, six of them the orphans above - so this and the v107 clear-out are the same visit.)
- Account/Team as bare one-line placeholders - still read as "coming", not "broken"?

## v100 - Menu tab + pinch-zoom

- **Pinch-zoom now works - test it against the FIXED chrome** (Max's own rider).
  Zoom in on each tab and check `.bottomnav` and the builder's sticky Save bar behave sanely under zoom.
  This is the one place removing `user-scalable=no` can bite, and it is why the attribute existed.
- Menu cards at 380px: quiet lowercase labels - still scannable in kitchen light, or do the rows blur together without the uppercase?
- Desktop Menu: section headers without the beige band - do groups still separate?
- The compressed Add-plate modal line and target meta line in situ (the meta line wraps after "—" at 380px; acceptable pre-existing behaviour, say if it bothers).
- **E1 (v82 carried):** price a dish in the Add-to-menu dialog, watch the live margin preview, save, confirm the Menu row shows the same number and light.

## v99 - global chrome

- **Dark mode, all four tabs.** Cards no longer cast shadows.
  Does depth still read on the real OLED, or do panels blend into the page?
- **Dark bottom nav.** It separates from content by its top border alone now.
  Still reads as chrome?
- **Pull-to-refresh in dark.** The puck is shadowless; drag to the threshold and check the ready-ring still announces "release".
- **Product cards at 380px.** Every card gained a "per kg" line under the price.
  Density and wrapping on the real catalogue, both themes.
- **Plates tab.** Uncosted plates say "not costed yet" under the dash - reads as information or as clutter?

## Carried, v82–v98 - what is actually left

The Batch 0 audit inventoried **61 unsigned-off items**.
Reconciling that inventory against the sections above:

- **Assigned and listed above:** E1 (v100) · B1–B9 (v102) · D1–D2 (v103) · C1–C8 and F1–F4 (v104).
  Working those version blocks retires them; there is nothing separate to do.
- **Still unassigned - F5:** the post-service-worker-update boot.
  Belongs to whichever batch ships next.
  Check the app comes back cleanly after a deploy rather than half-updated.
- **Still unassigned - the dashboard block, 29 mobile + 3 desktop.** The single largest remaining chunk, and the UX sequence never covered it. v94–v98's sharpest questions are read-and-react, not build-dependent: the one-glance test, the absence of the compares block, dig-tile tappability, sparkline behaviour, scope restore on reload.
  Worth one dedicated dashboard session - and it now folds naturally into the v115 block at the top, since that is the same screen.
- **Struck as superseded, do not test:** A15 (dotted chart fill - deleted) · A29 (dashboard selector - deleted v96) · AD1 (compares strip - deleted v98) · C9 (product bridge - removed v83) · F7 (snackbar - deleted v83).
- The two sharpest carried items on record: **v87's iOS scroll-lock** (its stress case is the invoice modal, F1–F4 above) and **v90–v92's "so what" test against real insights**.

---

## Settled - checked from here, no phone needed

- **v109: does a price edit land a history point?** Answered.
  `ing_price_history` held 33 points across 33 products at the v109 baseline; it holds **35 across 35** as of 7 Aug. Points are landing.
- **v106: re-export and confirm all seven groups.** Superseded by v108's `format: 2`/`3` export request above - the older stamped file is no longer the one that matters.
