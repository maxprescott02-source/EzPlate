# Phone

Things only a device can settle.
`/batch` appends here rather than stopping - Max works through it in one session.

Each entry: what to check, why a phone is the only judge, and what a failure looks like.

**Reconciled 7 Aug 2026** against every handover's "Needs Max's phone" section (v99–v115) and the Batch 0 audit's Part D inventory.
The previous version listed four versions and a one-line stub for everything else; v100–v108, v112 and v114 were missing entirely, and the carried backlog had no items in it - only a count.
Production state below is measured, not assumed.

---

## 171 / v151 - the bottom bar changed, and there is a More tab now

**This is the batch you will notice first, because it moves things you tap every day.** Open the app
and look at the bottom bar before doing anything else.

- **The bar is a different five, in a different order: Dashboard, Menu, Plates, Ingredients, More.**
  Products has LEFT the bar - it is now under More. The order of the middle three is reversed from
  what you had (it was Products, Ingredients, Plates, Menu). Both changes are the design package's
  parity map, which says the phone bar left-to-right must equal the desktop sidebar top-to-bottom.
  **The old order was the workflow - buy, name, build, sell - and that is what was given up.** The
  thing only you can judge: after a few days, does reaching for Products under More annoy you, and
  does the new order fight your muscle memory or stop mattering? A failure is you tapping the wrong
  tab more than the first day or two.
- **The gear in the top-right of the header is GONE.** Settings is More → Settings, two taps instead
  of one. This was a deliberate call and it is the one most likely to be wrong for you specifically,
  because you are the only person who knows how often you open Settings. **If you find yourself
  reaching for the top-right corner more than once, say so** - the gear can come back, and the
  reason it went (two routes to one screen on one platform) is a rule, not a law of physics.
- **Invoices has a phone home for the first time.** More → Invoices opens the Invoices screen, which
  until now only existed on desktop. Import invoice on Products still works exactly as before and
  is unchanged - so there are now two ways in on a phone. Check the screen itself is worth having on
  the phone at all: it is a dropzone and a "we don't keep a list of past imports yet" note.
- **Account is reachable from More too**, as well as from the Settings row that already opened it.
- **Every one of those four screens has a "‹" back arrow at the top-left** that returns to More.
  Below about 640px wide it is just the arrow with no word beside it; on a wider screen it says
  "‹ More". That is not a bug - the word was taking the space the Products header needed for its two
  buttons. **A failure is tapping the arrow and landing somewhere that is not the More list**, or
  the arrow being too small or too close to the edge for a thumb.
- **On all four of those screens the More tab is the lit one.** A failure is the bar showing nothing
  lit at all, which would read as "you are nowhere".
- **The known rough edge, and it is not new:** at 360px wide (narrower than your phone - some Android
  phones) the Products header wraps onto two lines. The Ingredients header already did that before
  this batch for the same reason: two buttons in a header the design allows one in. It is queued as
  one fix for both. **If your own phone ever shows a header on two lines, say so and which screen** -
  that would mean the width it happens at is wider than measured.
- **Both themes.** The More list is four rows on the plain page background with hairlines between
  them - no card, no container. Check the small grey second line under each name is readable in dark.

---

## 170 / v150 - the plate builder fills in the order you actually work

**Build a plate from nothing on the phone, both themes.** That is the whole item: the search is at
the TOP of the ingredients card now, the page is two numbered steps ("1 Add ingredients", "2 Name &
save"), and the plate name and category are both in step 2 rather than in the header and the
Publishing card. A failure is still reaching past the naming step to find the search, or the two
step numbers reading as decoration rather than as sequence.

- **The plate name in the header is static text you cannot tap now.** It used to be the field. The
  field is in step 2. A failure is reaching for it, nothing happening, and having no sense of where
  it went.
- **The header is three rows tall at 380px** - back chevron, then the title, then Save on its own
  row. It was the same height before, with a field where the title is. A failure is Save sitting far
  enough down that it reads as part of the page rather than as the bar.
- **The ingredient dropdown was being cut off and is not any more.** On the shipped v149 build it
  painted 37px of its 96px, so you saw one and a bit of your matches. Type two letters with a real
  catalogue behind it and check you get a full list you can scroll.
- **The Cost card on an unpublished plate is a known empty box.** Below 768 it hides its heading and
  both figures (the bar underneath carries them) and it has no menus to list yet, so it draws a thin
  bordered rectangle with nothing in it. Pre-existing since v146, recorded in `docs/MAINTENANCE.md`,
  not a new fault - but if it reads as broken rather than as empty, say so and it moves up.

---

## F9 / v148 - Settings is a screen, not a panel

The gear in the header is still the way in and is unchanged. What opens is different: instead of a
panel with a list of seven sections you tap into one at a time, it is a full screen with all eight
sections stacked, and you scroll.

- **There is no Done button any more.** Leaving is tapping another tab, the same as any screen.
  The thing only you can judge: after changing the target %, does it FEEL saved without a button to
  press? It is written the moment you type it, and it always was - the old Done button never saved
  anything, it just closed the panel. But "always was" is not the same as "reads that way on the
  phone". A failure is hesitating, or going back in to check it stuck.
- **The "Changes save as you make them" line is desktop-only** (it is in the shared screen header,
  which hides its subtitle below 768, like every other screen). So the reassurance above is exactly
  the thing the phone does NOT get. If the point above bothers you, this is the fix and it is one
  line - say so.
- **The two AI switches are physically smaller** - the coloured track went from 48x28 to 44x26 on the
  phone, which is the mock's number. The tappable area around each is deliberately still 44px tall.
  Tap them with a thumb, not a fingertip. A failure is missing, or having to aim.
- **Everything that was in the panel is still there**, regrouped: the target % and GST default are
  under Costing, both AI toggles under AI features, Theme under Appearance, Remembered packs and
  Tidy lists under Lists, and export/restore/clear under Data. If you go looking for something and
  cannot find it, that is the finding - name what you were looking for and where you looked.
- **Tidy lists and Remembered packs open over the screen and close back onto it.** They used to shut
  Settings and re-open it on the right section. A failure is closing one of them and landing
  somewhere that is not Settings.
- **Both themes.** The screen is eight bordered cards with tinted header bands; in dark those bands
  are a shade lighter than the card. Check nothing reads as a disabled or greyed-out section.

---

## F8 / v147 - Invoices is a screen, and the upload is three steps

**Import a real supplier PDF end to end on the phone, both themes.** This is the batch's whole point
and the flow you use most.

- **The upload is three panels now: choose, then scanning, then review.** Only one is ever on screen.
  A failure looks like two of them showing at once, or a blank sheet with nothing on it.
- **The scanning panel is new** - it says "Reading <your file>" with a moving orange bar underneath.
  On mobile data after a week idle this is the panel you will sit on longest, and it is the thing an
  emulator cannot judge. Does the wait read as progress, or as the app having stopped? A failure is
  reaching for the back button.
- **The review sheet has a footer bar now: Cancel on the left of the primary, "Confirm N changes" on
  the right.** On the phone both go full width and stack. Check Confirm is reachable with a thumb
  after scrolling a long invoice, and that Cancel is not somewhere you would hit it by accident.
- **The Apply tick has a bigger touch target** - the box looks the same size, but the tappable area
  around it is now 44px. Tap several of them quickly with a thumb rather than a fingertip. A failure
  is still having to aim, or hitting the row instead of the box.
- **Ticking a "new item" line now opens its form for you.** Previously ticking it before opening the
  form did nothing you could see and could block the whole import at Confirm. A failure is the form
  opening and then the tick coming off by itself.
- **The blue intro banner at the top of the import window is gone.** Its promise ("nothing saves
  until you review") is now printed permanently on the dropzone instead of being dismissible.
- **The Invoices screen itself is desktop-only for now**, because the sidebar's bottom group is
  hidden below 1024 and the More screen that gives it a phone home is a queued item. On the phone,
  Import invoice on the Products screen still opens the upload flow in one tap, exactly as before.
  **If you land on an Invoices screen on your phone with no tab lit** - which can only happen if you
  were last on it at desktop width and then reopened on the phone - say so, because that is the edge
  this batch knowingly left open.
- **What only a phone can settle:** whether the extra step (scanning) makes the import feel slower
  than it did, even though nothing extra is being computed. It replaces a filename that used to
  change in place. A failure is the import feeling longer than it used to.

---

## v143 - the Dashboard is rebuilt, and the scope control moved into the header

The Dashboard is the last of the five main screens to be rebuilt from the v3 mock. Everything it
could do before it still does: pick a scope, change the chart range, scrub the trend line, open a
Dig-in drill-down and come back.

- **The menu-scope dropdown is now in the screen header**, top-right, beside the "Dashboard" title -
  it used to sit beside the big number. Same control, same ranked list, same sparklines. On a phone
  it shares that row with the title. **Check it is comfortable to reach and read one-handed at the
  top of the screen**, and that a long menu name truncates rather than shoving the title.
- **The trend chart is drawn at its true size now.** On desktop its axis labels and line were being
  scaled up ~2.7x by a fixed-size drawing box; they render at their intended size at last, so the
  chart looks noticeably finer and wider. **On the phone this should look essentially unchanged** -
  that width was always close to correct. Say if the phone chart looks thinner or smaller than it did.
- **The big 44px food-cost number is the phone's verdict; desktop shows a three-cell strip instead**
  (average, plates over target, not costed or priced). Only one is ever on screen. Check the phone
  still leads with the number you want first.
- **"What needs attention" is now "Needs attention"**, in a bordered card with the Gemini credit in
  its header bar rather than under the lines. The credit still only appears when Gemini actually
  phrased a line you can see - **if you ever see it on a line that looks like the app's own plain
  wording, that is a real bug**, and worth a screenshot.
- **Dig in is four rows now, not four tiles.** On the phone each row is two lines (the question, then
  what it points at) with the figure right. Tapping still opens the same list.
- **A brand-new café's Dashboard now shows a "Cost your first plate" card with a New plate button**,
  instead of a dash. You will only see this on an empty account - not worth engineering, but if you
  ever do see it with real data on the screen, that is a bug.
- **What only a phone can settle:** whether the whole screen still passes the one-glance test. The
  desktop strip and the phone hero say the same thing in different shapes, and the phone is the one
  that matters. A failure looks like having to scroll or think before you know whether you are over
  target.

---

## v142 - Menu is rebuilt, and Delete has moved

The Menu tab is a five-column table on desktop and two-line rows on the phone. Everything it could
do before it still does: tap a row to edit its price, category or menu; search; the category filter;
the Healthy / Watch / Rework chips; switch menus; New menu; Existing plate.

- **"Delete" has moved out of the menu-switcher row and to the BOTTOM of the screen**, under the
  list, labelled "Delete this menu". A phone is the only judge of whether that reads as safer (a
  destructive control no longer sits beside the control you tap most) or as lost (you now scroll a
  long menu to reach it). A failure looks like you hunting for it, or finding it by accident while
  scrolling. Say which, because the reasoning cuts both ways and only you use this screen daily.
- **The row's second line now reads "$3.00 cost, suggested $10.00"** — the phone used to say
  "$3.00 cost · $9.00 on menu". The price itself moved to the right, above the food-cost pill. Is
  the suggested price the more useful of the two to have on the line, or do you want the menu price
  back there? This changed because the mock designs it that way; it is a real change in what the
  row tells you at a glance.
- **An amber or red verdict pill wraps onto two lines on a phone** ("42.9% ·" / "well over"), which
  makes those rows taller than green ones. Deliberate: the alternative was truncating the "suggested
  $17.40" figure beside it, and a cut-off price is worse than a tall row. Check it does not make a
  menu of mostly-red plates feel ragged.
- **The menu name is no longer in the screen header** — the header says "Menu", and the current
  menu's name is in the switcher control below it, with its food-cost % beside it. On the real
  catalogue with your real menu names, does that still tell you which menu you are looking at
  quickly enough?
- **Two actions still share the mobile header** ("Existing plate" and "New menu"). Same known
  deviation as Ingredients and Products; it is queued as one question for all three. What is worth
  reporting is whether the header ever WRAPS to two lines on your phone with your font settings —
  a spec pins it at 380px, but iOS text scaling is not something a spec can see.

---

## v140 - Products is rebuilt, and the floating "+" is gone

The Products tab is a five-column table on desktop and two-line rows on the phone. Everything it
could do before it still does: tap a row to edit a product, search, the category and supplier
filters and their "Manage list..." doors, and Import invoice.

- **The floating orange "+" in the bottom-right corner is DELETED.** "New product" now lives in the
  screen header, where Plates and Ingredients already keep theirs. This is the one change you might
  actively miss: the header scrolls away and the "+" never did, and you have ~400 products to
  scroll. A failure is finding yourself scrolling back to the top to add a product. Say so if it
  bites - the design forbids two buttons for one action, but it does not forbid the header sticking.
- **The row no longer shows the BRAND on the phone.** It reads name, then "Category, Supplier"
  underneath. The brand is still there on desktop and still in the row's own edit form. It came off
  because keeping it truncated both: "Apple Slice…" next to "Heinz Wa…", neither readable. A failure
  is not being able to tell two similar products apart in the list - e.g. two "Baked Beans" rows
  from different brands. That is the exact case this trade risks, so it is worth a real look at your
  own catalogue.
- **"steady" where a price has not moved**, replacing the dash. Same word Ingredients now uses for
  the same number. A failure is it reading as a status you have to act on rather than "no news".
- **Two buttons in the header again: "Import" and "New product".** Same question v139 raised on
  Ingredients, and here it is permanent rather than conditional - so answer it once for both
  screens. A failure is the pair crowding the title or wrapping to a second line.
- **"Prices last updated: ..." has left the Products screen.** The same line still shows inside the
  Import invoice window, which is one tap from that header. Check that is close enough: a failure is
  wanting to know when you last imported and having to open the import flow to find out.
- **The supplier column on your real catalogue.** Most of your products have no supplier recorded,
  so on desktop that column is a lot of dashes. On the phone it simply does not appear. Say if the
  dashes read as broken rather than as empty.

## v139 - Ingredients is rebuilt too, and it is now five columns

The screen is a table on desktop and two-line rows on the phone. Everything it could do before it
still does: tap a row to rename it or change the product it links to, the setup wizard, search,
the category filter and its "Manage list..." door.

- **The meta line on your real catalogue.** Each row now reads "Category, in N plates" under the
  name. A failure is a category long enough to push the plate count off the line, or a row where
  both are missing and the line sits empty.
- **"Last change", not "30-day change".** The mock asked for a 30-day window and the app does not
  have one - this is the last logged move, which is the same number the dashboard's What moved
  uses. Check the two agree for an ingredient you know moved recently. If they disagree, that is
  the invariant breaking and it matters more than the label.
- **"steady" where a price has not moved.** It used to render nothing at all. A failure is it
  reading as a status you have to act on rather than as "no news".
- **Two buttons in the header while setup is live.** "Set up from products" sits next to
  "New ingredient" on the phone. The mock asks for one action there. A failure is the pair
  crowding the title or wrapping to a second line - it did exactly that before it was caught, and
  the fix was measured at desktop only.

## v138 - Plates is the first screen REBUILT from the v3 mock

The Plates tab no longer borrows the Products card styling. It is a two-line list on the phone
(name, then "category, on Winter Menu", cost right) and a three-column table on desktop.
Everything else on the screen still works exactly as it did - the row still opens the same
Add-to-a-menu / Edit / Print / Delete chooser.

- **Read the meta line on the real catalogue, both themes.** Every row is now
  "category, publish state" under the name. Your plate names are longer than the fixtures.
  A failure looks like: the name wrapping to three lines, or the meta line truncating the menu
  name so you cannot tell which menu a plate is on.
- **"not costed" in the cost column.** It replaces the old dash-plus-"not costed yet" caption.
  A device is the judge of whether it reads as information at 15px mono, or as an error.
  (The older "reads as clutter?" question further down this file is about the OLD rendering and
  is answered by this one - do not answer both.)
- **The clear ✕ inside the search box.** It is a new element (`.plib-x`) with an invisible 40px
  hit area rather than the app's shared one. Tap it with a thumb, not a fingertip: a failure is
  having to aim, or hitting the text field instead and popping the keyboard.
- **The lowercase meta line.** "Mains, on Winter Menu" is lowercased by CSS (`::first-letter`),
  not in the text. iOS Safari is the one engine this was not driven in. A failure looks like
  "Mains, On Winter Menu" - wrong-looking but harmless, so it is worth a glance and nothing more.
- **The header row.** Title plus one "New plate" button, no subtitle on the phone (the desktop
  gets "6 plates, 1 not costed, 2 unpublished"). A failure is the button wrapping onto its own
  line - it did exactly that before it was caught, and only on a narrow screen.

## v136 - dark mode is BACK, and Settings now has a Light / Dark / System control

⚠️ **This reverses what the v132-v135 block below tells you.** That block says dark mode is gone
and the app should come up light. It was correct when written; the replacement design package
ships both palettes and the protocol orders both ported, so the condition you set on 9 Aug
("light only until a designed dark package exists") is **met**, not overruled. Read this block
first and treat the "dark mode is gone" bullet below as history.

- **Find it:** Settings → General → Theme. Three choices. **System** is the default and follows
  your phone.
- **The one thing only your phone can settle: does dark actually read in the kitchen?** The
  palette is deliberately soft grey (`#232528` canvas, `#1E1F22` sidebar), not black. On an OLED
  that choice can look washed out where black would look crisp — or it can look right and black
  would glare at 5am. Every text/background pair was measured against WCAG AA in a real browser,
  so this is **not** a contrast question; it is a "does it feel right on the real screen" question.
  Failure: you find yourself squinting, or you switch it back to Light within a day.
- **The theme must not flash on boot.** The theme is resolved before the first frame paints.
  Failure: any flash of white before dark appears (or vice versa) when you open the installed PWA
  cold. That is the single most likely real defect here and an emulator will not show it honestly.
- **The PWA title bar / status bar should match the app's canvas**, and must follow **your
  choice**, not the phone's setting. The specific case to try: **set your phone to dark, then
  choose Light in Settings.** Failure: a near-black title bar sitting above a white app. (This
  exact bug existed in v132 and again briefly in this batch; it is fixed and pinned, but only a
  real installed PWA proves the title bar.)
- **"System" should flip live.** With System selected, change your phone's appearance (or let it
  switch at sunset) **without reopening the app**. It should follow immediately. Before this batch
  it only read the setting at boot, which for a once-a-week user meant sitting in the wrong theme
  for days. Failure: it stays on the old theme until you reopen.
- **Native controls in dark.** Open a `<select>` — Settings → GST default is the quickest. The
  popup list should be dark. Failure: a white popup list over the dark app (this is the
  `color-scheme` fix; iOS Safari is the one that most often ignores it).
- **The empty-state drawings in dark.** The clearest is the plate builder with no ingredients
  added. The line art should be visible grey, not a near-invisible dark-on-dark smudge.
- **Printing while in dark mode.** Print a plate docket with the app in dark. The paper must come
  out white with black text. Failure: any dark background on the printout.

## v132-v135 - the v3 repaint reached your phone (AUDIT-v135 D2: nobody asked you to look)

- **Every screen now wears the v3 look on the phone too:** white canvas, flat bordered cards, the Geist typeface, and NO dark mode (your call, 9 Aug - light only until a designed dark package exists). The mobile LAYOUTS are unchanged until V9; the paint and type are not.
  Failure: the typeface renders badly at small sizes on the real screen, contrast suffers on the real OLED in kitchen light, or you simply miss dark mode - all three are device judgements no emulator settles.
- ~~**If you used dark mode:** it is gone~~ — **SUPERSEDED by the v136 block above, 10 Aug 2026.** Dark returned with the replacement design package. Struck rather than deleted so the reversal is visible: this said dark was gone, and it is not.
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

## 175 + 176 / v155-v156 - the shell, Products and the trend

**Added retrospectively on 12 Aug 2026 by the v156 audit.** Neither batch wrote a `docs/PHONE.md`
section - 172, 173 and 174 each wrote one saying "none", so this is an omission rather than a
judgement that there was nothing to check. Both batches changed things only a device shows, and
**176 also shipped without a pre-push review**, so it has had no second reader at all.

- **The `/kg` unit suffix is now smaller and dimmer** on every money row, so the prices scan as a
  column. A failure looks like the suffix being too faint to read outdoors or at arm's length, or
  the money column no longer lining up once the suffixes differ in width. Only a real screen in real
  light settles legibility.
- **"steady" became a dash** on Products *and* Ingredients. Check a dash reads as "no change" rather
  than as "missing data" on a small screen - it is a deliberate absence and it should not look like
  a bug.
- **The trend gained a card and a real x-axis of dates.** v48's reasoning for having no axis was
  that the scrub tooltip gives exact dates, which is nothing at all on a phone - this is the fix, so
  the phone is the only place it can be judged. A failure looks like date labels overlapping,
  clipping at the card edge, or so few that the axis says nothing.
- **The active range pill is no longer orange.** Confirm the selected range still reads as selected
  at a glance; the markers staying orange is deliberate (they mean "you did this").
- **The install banner was re-docked and restyled secondary**, and the page now reserves its height
  by setting a class on `<html>` while it is up. ⚠️ **The failure mode is specific and named in the
  handover: the last table row sitting underneath the banner.** Scroll to the bottom of a long
  Products list with the banner showing.
- **The desktop container is left-anchored with `padding:0` and `margin:12`**, which `HANDOVER-176`
  flags as looking wrong and not being - the visible gutter is three stacked insets totalling 32px.
  Nothing to check on the phone; noted so a future reader does not "fix" it from a screenshot.

Both themes for all of it. If any of these is wrong, it is a defect in code that is already live.

## F7 / v146 - the builder page

**Drive the whole builder on the phone, both themes.**
Open a plate from Plates, change a quantity, tap a unit cost to re-price it, add a misc line, save, then publish from the Publishing card.
A failure looks like: the fixed summary bar covering the last table row, the header wrapping to three lines, Save reachable only by scrolling, or the bar sitting on top of the tab bar instead of above it.
Only a device settles the bar's clearance - the offset is calculated against the real `.bottomnav` height plus the safe-area inset, and the emulator's inset is zero.

## 178 / v157 - the docket builder, the trend row, the form measure

**The builder's Save moved, and the phone reaches it a different way from the desktop.**
The header now carries NO action: Save is in the rail's summary panel at >=768, and on a phone it is the sticky bar's own button.
Drive a whole plate: add ingredients, set a quantity, tap a unit cost, add a misc line, set the menu price, save.

- ⚠️ **Tap Save in the sticky bar WITH the menu-price field still focused.** It must commit on the first tap.
  A failure looks like nothing happening, then working on a second tap.
  The bar's button used to be rebuilt on every keystroke, which would swap it between touchstart and touchend; it is static markup now, but the blur-then-tap ordering is browser behaviour and only a device settles it.
- ⚠️ **Tap the plate name in the breadcrumb header.** It must not zoom the page.
  It is a real input wearing the title's size, and it deliberately does not override the app-wide 16px `!important` that exists to stop iOS zoom-on-focus.
- **The install banner and the summary bar have always overlapped** (fixed at 84px and z-index 78, against the bar's 25). The bar now rides 114px while the banner is up. With the install prompt showing, confirm the Save button is fully tappable and nothing sits over it.
- **The docket's paper is `--surface-2`,** which in dark is DARKER than the page canvas rather than lighter. That is the mock's own choice. Confirm it reads as paper on a table rather than as a hole in the screen.
- **The tear-off zigzag** is drawn with gradients. Check it does not shimmer or alias badly on a real panel.

Both themes. If any of these is wrong it is a defect in code that is already live.

---

## 179 / v158 - the second button in a screen header moved down one line

**Three screens changed shape at the top: Ingredients, Products and Menu.** On each, the header now
carries the screen name and **one** button; the second button sits in the row of controls directly
beneath it, pushed to the right.

- **Ingredients: "Set up" is now under the header**, beside/below the search and category filter,
  instead of next to "New ingredient". This is the screen the change was really for - on your phone
  that header was **two rows tall** (121px against 69), because your catalogue has hundreds of
  unlinked products and that is what makes the button appear. It was wrong at 380px, which is your
  width, and no test could see it because the test data never produces that button.
  **A failure is the header still looking like two rows, or "Set up" not being on screen at all.**
- **Products: "Import" is now under the header**, after the two filter dropdowns. Import invoice from
  the Products screen still works exactly as before - one tap, same modal. **A failure is tapping it
  and nothing opening**, which is the specific risk of moving a live button between two places.
- **Menu: "Existing plate" is now under the header**, after the menu switcher and search.
- **All three still work in one tap** and are driven by the test suite, but a tap in a browser at a
  narrow window is not a thumb on glass. **What only the phone can settle: whether the button is
  comfortable where it now is, or whether it reads as part of the filters** - that cost was written
  down when the home was chosen, and you are the only one who can say whether it matters.
- **Rotating the phone, or anything that changes the width across ~767px, moves the button live.**
  Turn the phone sideways on each of the three screens and back again. **A failure is the button
  disappearing, appearing twice, or landing somewhere other than the header (landscape/wide) or the
  control row (portrait).**
- **360px-wide phones are supported from this batch on** (your call, 12 Aug). If you ever open the
  app on a narrower device than usual, the headers should still be one row.

**The one that would be quiet if it were wrong:** on a *brand-new* café with products but no
ingredients yet, "Set up" must still be visible under the Ingredients header. That screen hides its
search and filters when there is nothing to search, and the button lives in that same row now - it is
deliberately exempt, but it is the kind of thing that only shows up on a genuinely empty account.

---

## 186 - you will be signed out, and the phone is where that lands

**READ THIS ONE FIRST: after this deploy, opening EzPlate on any device shows a sign-in screen.**
That is the batch, not a fault.
The anon key that shipped in the page could read the whole cafe, and it no longer can - so the app
asks who you are before it shows anything.

- **Sign in on your phone with the account you made yesterday** (`maxprescott02@gmail.com`).
  You may need to install the app again from the sign-in screen, or just open the installed one.
  **A failure is the password being rejected, or signing in and landing straight back on the same
  screen.** The second one would mean the session is not surviving the reload, and only a real
  device with a real PWA container can show that - Safari's storage rules for an installed app are
  not the same as a browser tab's, and nothing in the suite runs there.
- **Check the keyboard.** The screen is three controls in a centred column: email, password, Sign in.
  **A failure is the keyboard covering the Sign in button with no way to scroll to it.**
  This is the one thing about the screen that a desktop browser at a phone-sized window cannot
  reproduce, because it has no on-screen keyboard.
- **Then close the app completely and reopen it.** You should go straight in, no sign-in.
  **A failure is being asked to sign in every time**, which would mean the session token is being
  cleared on launch and is a real bug rather than a preference.
- **If a plate was half-built on that device, signing in will ASK you about it first**, exactly as
  the Account screen has always done: "You were building X. Signing in clears this device, so it will
  be discarded." **Say yes.** There is no way to keep it - a signed-out browser cannot save anything,
  so the plate cannot be rescued first, and carrying it across would put it in whichever cafe you
  sign into. **A failure is being asked and then signing in anyway, or not being asked and the
  builder later offering a plate you had already discarded.**
  If you have real unfinished work in the builder right now, **save it before this deploy lands.**
- **On the desktop machine too, once**, because the sign-in screen now covers the whole window
  including the left rail - so if anything is off-screen there, there is no nav to escape with.

---

## 192 - the sign-up form, and inviting a real second person

Two of these need a phone because they are about the on-screen keyboard and the password manager,
and one needs a second human. Nothing here is urgent - **no existing behaviour changed for you**,
so a failure is a new feature not working, never the app breaking.

- **Open the sign-in screen and tap "Been invited? Create your account".** The screen swaps to a
  sign-up form with the same three controls. Tap "Already have an account? Sign in" to go back.
  **A failure is both forms showing at once, or the link taking away the only way back.**
- **Does the password field offer to GENERATE a password?** On the sign-up form it is marked
  `new-password`, which is what tells iOS Keychain or 1Password to suggest a strong one rather than
  offering the password you already have saved for EzPlate. This is the entire reason sign-up is a
  separate form instead of a mode of the sign-in one, and **a desktop browser cannot show it** -
  only a real device with a real password manager can. **A failure is being offered your EXISTING
  EzPlate password on the sign-up form**, which would mean the two forms have been collapsed
  somewhere and the separation bought nothing.
- **Check the keyboard again, on the sign-up form this time.** Same failure as 186's: the keyboard
  covering "Create account" with no way to scroll to it. The form is one control taller than the
  sign-in one, so it is the worse case of the two and 186's pass does not cover it.
- **Then the real thing, when you actually want to add someone.** Account -> Team. Type their email,
  tap Invite. The address appears in the list marked "invited", with a Revoke button.
  ⚠️ **EZPLATE DOES NOT EMAIL THEM. Nothing is sent.** You have to tell them yourself: open EzPlate,
  tap "Been invited?", and sign up with **that exact address**. The card says so under the form -
  **a failure is that sentence being missing or wrong**, because without it you would sit waiting
  for a delivery that was never going to happen.
  They will get one email, from Supabase, with a confirmation link, **after** they sign up. They must
  click it before their first sign-in works - an unconfirmed account fails with "Email not
  confirmed", which reads exactly like a wrong password.
- **When they open the app after confirming, they should land straight in your cafe.** There is no
  button to press and nothing for them to accept: the app notices they have an invitation and uses
  it while it is loading. **A failure is them seeing "This account isn't linked to a cafe yet"** -
  which would mean the address they signed up with is not the address you invited. Check for a typo
  before assuming it is broken; that is the one way this fails that is not a bug.
- **Have them check what they CANNOT do**, since an invitation makes them staff: no Delete on a
  plate or a menu, the target food cost is read-only, and no Restore backup in Settings. They can
  still import invoices and edit ingredients, plates and menus.
