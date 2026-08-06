# Phone

Things only a device can settle.
`/batch` appends here rather than stopping - Max works through it in one session.

Each entry: what to check, why a phone is the only judge, and what a failure looks like.

**Reconciled 7 Aug 2026** against every handover's "Needs Max's phone" section (v99–v115) and the Batch 0 audit's Part D inventory.
The previous version listed four versions and a one-line stub for everything else; v100–v108, v112 and v114 were missing entirely, and the carried backlog had no items in it - only a count.
Production state below is measured, not assumed.

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
- **The dotless chips** - Healthy / Watch / Rework.
  The active chip carries the colour now.
  Is the idle row too quiet?
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

- **Ingredient cards with the price column at 380px.** Long product names now wrap into the space the price vacated - does the column read at arm's length, and do prices scan as one axis down the list?
- **The two compressed modal hints in situ.** "Follows the linked product." is the tersest line shipped - five-second test it.
- **D1 (v86 carried):** the strapline in situ.
- **D2 (v86 carried):** the setup-from-products wizard - progress and done states.

## v102 - Plates tab + the carried B block (the biggest single clearable chunk)

- Plates cards: 16px radius + 8px seam at tablet/desktop widths - glance check.
- Builder popup: no hint under the search (with ingredients); the compressed docket line; the no-ingredients empty state still appears on a fresh install.
- The Manage-menus modal one-liner in situ.
- Chip tint on plate cards in dark mode with theme = System (the fixed path).
- **B1–B9, all on this tab:** B1 draft resume round-trip · B2 re-entry guard (+ no-nag after save) · B3 live margin preview vs Menu row · B4 sticky Save reachable · B5 "Add to a menu" wording · B6 no-match dead-end lands on Ingredients · B7 empty-plate no-match shows message only · B8 unnamed-plate refusal stays put · B9 printed docket copy.
  **Note on B1/B2:** the queue's "builder plants a draft just from looking" bug lives exactly here.
  If the resume prompt greets you after a look-only visit, that is the known bug, not a new finding.

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
