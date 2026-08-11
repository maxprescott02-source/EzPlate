# HANDOVER - 171 (the mobile More screen, and the nav restructure)

**Branch:** `feature/more-screen` · **Scope:** queue item 1, the last piece of v3 §6. **Ships `ezplate-v151`.**

**This closes the v3 fold-in phase.** §6.1's parity map was unmet by construction while the phone had
no home for four screens; it is met now, and `The restore's full-wipe step` - which was scheduled for
the batch after the phase closes - is due next and needs Max's go on the day.

## What changed

The phone's bottom bar is **Dashboard, Menu, Plates, Ingredients, More**. Products left the bar.
`#tab-more` is a new screen: four chevron rows - Products, Invoices, Settings, Account - each opening
its screen, each of those carrying a "‹ More" chevron back.

The desktop sidebar's bottom group grew from two to the same four, in the same order, because **one
DOM order serves both platforms**. That is the mechanism, not a coincidence: §6.1 says the sidebar
top-to-bottom equals the tab bar left-to-right and the desktop bottom group equals the More list, so
writing the nav once in that order makes the two provably identical rather than separately maintained.

**Three things this cost, each a decision rather than a side effect:**

- **v54's workflow nav order is gone** (Dashboard, Products=buy, Ingredients=name, Plates=build,
  Menu=sell). It could not survive Products leaving the main group, which §6 requires, and the mock's
  order is outcome-first. R5: the mock wins, the loss is recorded at the markup.
- **The header gear `#settingsBtn` is deleted**, and `.theme-toggle` with it - the class it was the
  only wearer of. F9 made the gear unremovable *because it was the phone's only route to Settings*;
  that condition is met, and keeping it would be two routes to one screen on one platform, which §7
  forbids by name. Settings is two taps on a phone now. **That is the call most likely to be wrong
  for Max specifically** and `docs/PHONE.md` says so in those words.
- **`openSettings()` went with it** - a one-line alias for `showTab('settings')` that existed because
  the gear needed a handler to bind. Checked for a Playwright handle before deleting, per the
  `addProduct` trap: `v137-modal-layer.spec.js` was its last caller and now calls `showTab` directly.

`showTab` gained two things. A **one-way guard**: `showTab('more')` above 1024 redirects to the
Dashboard, because #tab-more has no desktop counterpart - at ≥1024 its four routes ARE the sidebar -
and the one route that reaches it there is `restoreLastTab()` replaying a `cafeDB_lastTab` of 'more'
written on a phone. It is deliberately **not** symmetric: landing on the four sub-screens below 1024
is the whole point of the batch. And a **lit-More rule** for those four sub-screens (§6), which lights
a second `.navbtn` - safe because `.nav-more` and `.nav-bottom` are hidden at opposite sides of 1024.

`#navMore` is **last in the DOM and that is load-bearing**: `currentTab()` returns the first
`.navbtn.active` in document order, so last means the sub-screen's own entry wins that read and
`currentTab()` still says 'ingredients', not 'more'. Pinned, with the consequence written out.

A `matchMedia('(min-width:1024px)')` listener handles crossing the seam with More open - no navigation
happens there, so the guard cannot fire and the media query itself has to be the event.

## Measured, not read

**The Products header wrapped.** Adding "‹ More" took its fixed children to 389px against a 380px
viewport and dropped "New product" to a second row. Nothing in the CSS says so; it was found by
comparing the children's tops. Fixed by collapsing the word "More" with **`.btn-noun`** - the app's
own class, which already turns "Import invoice" into "Import" in that same header - so the collapse
reuses an existing pattern *and* its existing 639px step rather than inventing a fourth breakpoint.

**360px is a known rough edge and was deliberately not chased.** Products does wrap there - but on
`main`, before this batch, the **Ingredients** header already measured 121px against the one-row 69 at
360, same cause. The chevron costs 30px; the second action costs 72-130px. No spec in this repo has
ever measured 360. Recorded on the queue item that owns the second action, naming both screens.

## Into CLAUDE.md

**Nothing proposed.** Two things were checked and left alone deliberately:

- Tier 2's "the four object nouns" is untouched - "More" is a place, not an object noun, and the row
  sub-lines describe without naming.
- Tier 1's naming inversion is untouched. `data-tab="ingredients"` moved position in the nav and kept
  its key; `data-more="ingredients"` is the same crossed key on purpose, and the new test says so
  where someone would otherwise be tempted to "fix" it.

## docs/QUEUE.md

**The item is DELETED** and the remaining fifteen renumbered. The §11 preamble now records the phase
as finished, and `The restore's full-wipe step` says it is due now rather than "waiting on the More
screen".

Two lines were re-pointed rather than left to rot: the Products entry in the header item, whose stated
justification ("`#importBtn` is the ONLY phone route into the import flow") **expired the moment More
→ Invoices existed**; and the 360px measurement above, with the instruction to answer the
supported-width question inside that item rather than route it onward.

## docs/MAINTENANCE.md

One C finding: **`--text3` is used once and has never been defined.** `css/style.css` defines
`--text-3` and aliases `--text2`/`--muted2` off it, but the desktop sidebar's theme toggle asks for
`--text3`, so the declaration is invalid at computed-value time and the icon inherits full text colour
instead of the muted grey. One character, but it changes a shell control's appearance, so it belongs
with `Desktop shell polish`, which is already measuring that region.

## docs/PHONE.md

The whole batch, because it moves things Max taps daily. The three that only a device settles: whether
the new tab order fights muscle memory or stops mattering; **whether losing the gear costs him a
reach** (the one to reverse if it does); and whether the "‹" arrow is comfortable that close to the
screen edge under a thumb.

## Tests

`tests/more-screen.test.js` (11) and `tests/visual/v151-more.spec.js` (14) are new.
The unit file's shape is deliberate: the same four routes are written down in four places by §6.1's
own requirement, so **every assertion compares the copies against each other** rather than against a
literal. Adding a fifth screen to all four passes; adding it to three fails and names the missing one.
The one literal is the ORDER, because a test that derived it from one copy could not tell a reorder
from a reorder.

`tests/visual/_boot.js` gained **`gotoTab(page, key)`** - navigate the way a user at this width would.
Six specs broke identically: `.navbtn[data-tab="ingredients"]` still *resolves* at 380 because the
button is in the DOM, and only `display:none` separates it from the bar, so they timed out clicking an
invisible element. The fix is deliberately not `window.showTab(key)`, which would have gone green while
the screen was unreachable by any real gesture - which is the exact failure this batch could introduce.

Five pins were consciously changed and none deleted to go green: F9's "the gear is the only route
below 1024" (re-pointed at the pair that replaced it, including a numeric assertion that 1023 and 1024
actually abut - the failure mode is a one-digit typo that leaves both string assertions passing);
F10's "the Settings row is the ONLY route to Account" (F10 predicted this item would change it);
F10's "no control of any kind on the account screen", narrowed to the screen's BODY, because the back
chevron is navigation chrome and not a capability the account claims; TAB_PANES's list; and v137's
"the sidebar bottom group is Invoices then Settings", whose hairline assertion had to move to the
group's new first member or it would pass against a hairline drawn in the wrong place.

`npm test` 918 · smoke all green · Playwright 264.

## Review

Pre-push `code-review` agent, on a different model, blind to the brief. **One finding, fixed in this
branch**: `js/app.js` still carried `// F10 (v149): the ONLY route to #tab-account at any width` on
the `setAccountOpen` binding - false the moment this diff added `#sideAccount` and the More row, and
missed by my own sweep even though the same fact was corrected correctly in three other files. Inert,
but it is precisely the stale claim that gets trusted later, so it was rewritten rather than deleted:
the row survives and F10's reason for it is undamaged, it is simply no longer the only way in.

It found nothing else. Worth recording what it *did* verify rather than take on trust, because those
were the parts I would have wanted a second reader on: that the `'more'` guard runs before the retap
check, the `cafeDB_lastTab` write and the pane-visibility loop (so the redirect cannot leave a stale
pane or write `'more'` to storage); that the double-`active` mechanism is never a double *visible*
highlight; and that the two 1024 breakpoints genuinely abut rather than merely both existing.

## Probe

**What did the queue item tell you to do that you would have done differently?**

Nothing it required. It handed me one open decision - whether the gear stays - with a caution against
reflexively tidying it, and I removed it anyway. The caution is worth restating because it may yet be
right: the gear was not a duplicate when it was written, it was Settings' only phone route, and the
argument for deleting it only became available in this batch. If Max misses it, putting it back costs
nothing and the rule it violates is a design rule, not a correctness one.

The item also said "restructures the bottom bar" and did not mention the desktop sidebar. I reordered
the sidebar too. That is not scope creep: they are one element, and §6.1's first rule is that the two
orders are identical, so leaving the sidebar alone would have made the parity map *less* met than
before while claiming to complete it.

**What did you not propose because it was out of scope?**

Removing `#importBtn` from the Products header. Its reason for existing expired in this batch, which
makes it tempting - and it is exactly what caused the header to need the `.btn-noun` collapse. But the
item that owns it requires ONE home used by every screen, chosen once, and taking this one away first
would have answered that question for one screen by deletion.

The 360px wrap, for the reason above.

## Surprises

**The Products header wrap was invisible to reading and took one probe to find.** Both other candidate
fixes I had reasoned out from the CSS - trimming padding, tightening the header gap - were arithmetic
that did not clear 380 with any margin. The measurement also produced the fact that made the right fix
obvious, which is that `#importBtn` was already collapsing its own noun 8px away.

**Two of my own new assertions were wrong before the code was.** The header-wrap test called a
correct header "wrapped" because `.scr-gap` is a zero-height flex spacer whose span overlaps nothing;
and the focus-ring test reported "none" against a working ring because `locator.focus()` does not
match `:focus-visible` after a mouse click - Chromium wants a keyboard interaction. Both were the test
describing the thing wrongly, and both would have been "fixed" in the CSS by anyone who trusted them.

**`currentTab()`'s fallback loop stopped being load-bearing and the comment saying it was is now
false.** F10 wrote that loop specifically because no `.navbtn` carried `data-tab="account"`; this batch
gave Account a nav entry, so the branch above it answers for all nine panes. The loop is kept - its
cost is nil and it is the only thing stopping a pane with no lit button reading as 'builder' - but the
sentence claiming it was load-bearing was corrected rather than left standing, which is the exact rot
`CLAUDE.md` warns about.
