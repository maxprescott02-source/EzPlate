# HANDOVER - 145 (F1b: shell reconcile + the modal/sheet primitive)

**Branch:** `feature/f1b-shell-modal` · **Scope:** queue item F1b, the second half of F1.
**Shipped `ezplate-v137`.**

## What changed

Escape closes the TOP LAYER ONLY, and the layer is derived from the DOM rather than named.
`topOverlay()` takes the highest computed z-index among `.modal-overlay.open` and tie-breaks by document order, which are the two rules the browser itself paints by.
It replaces a hard-coded list of 8 ids plus two single-modal listeners.
It closes through each overlay's own `.mhead > .x`, so every modal keeps its real close function: `closeConfirm` clears `__confirmFn`, which the old bare `hide()` leaked.
A new modal with a × is covered by construction, which is the one thing a fixed list can never be.
The 8 modals that had no Escape handler at all now have one.

Focus is trapped inside the top layer and returns to the opener when it closes, neither of which existed anywhere in the app before.
Closing the top of a stack hands focus back to the layer underneath.

Modals are centred at 12vh at >=768 and are bottom sheets below it, with a grab handle, slide-up and safe-area padding.
`.modal-builder` and `.modal-wiz` are excluded and keep their full-height takeover (R2: the mobile mock's Builder is a full-screen push, and F7 replaces that shell anyway).

Invoices joins the sidebar bottom group under the mock's hairline, opening the same `openInv()` as the Products tab's button.
The brand row is the mock's one-line form and hosts the 22px theme toggle, which reports the RESOLVED theme so it stays honest under 'system'.

Deliberately NOT built, all R4: the ⌘K button (no palette exists, and a dead chord is forbidden), the account row (no workspace concept, F10 owns the question), "UI states" (a designer's spec screen, not an app screen).

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
- Nothing makes "a modal opened over another must be LATER in the markup" a rule that can fail.
  Fifteen overlays share `z-index:80`, so a future flow opening an earlier-in-markup modal over a later one would paint the new modal behind the old.
  No such flow exists today and the item records how that was verified.
  `Do after: F10`, because the fold-in is about to move this markup.

## New docs/PHONE.md items
None.
The sheet was driven in a real engine at 380 in both themes and the geometry is pinned, so nothing here needs a device to settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing substantive: the item's own correction of F1's mis-stated Esc defect was accurate, and its enumeration of the 8 unhandled modals matched the code exactly.
It asked me to "decide consciously rather than shrinking the rule" on the 22px toggle against the app's 44px floor, and that instruction was worth its length.
The one thing I would add to the item is that it described the modal work as a primitive to build, when most of the value turned out to be in deleting a list.

**What did you not propose because it was out of scope?**
The mobile tab bar and the More screen.
Spec §6.1 moves Products out of the tab bar into More, but F4 already ships "Products as a sub-screen under More", so the mobile nav restructure belongs to the screen items and not to the shell.
Also left alone: focusing the first form control instead of the ×, which reads better on paper but pops the phone keyboard over a sheet, and is already available to any modal that wants it by focusing after `show()`.

## Surprises

Measuring caught two things that reasoning did not.

The theme toggle rendered 22 wide by 44 tall.
`button,.btn,.navbtn,input,select{min-height:44px}` applies to every button in the app and `min-height` always beats `height`, so the mock's square came out a lopsided pill.
It reached a real browser looking like that before it was measured.

Three of the new tests passed against planted defects.
Two focus tests could not tell "focus returned to the opener" from "focus never moved", because stripping the whole mechanism leaves focus sitting on the opener anyway.
A theme-sync test was satisfied by `openSettings()` calling `syncThemeSeg()` regardless of what the toggle did.
All three were rewritten to assert the movement first, and the theme one now pins the toggle's own logic (reporting the resolved theme under 'system') because that is the part nothing else provides.

The pre-push review's headline finding was the same defect this batch exists to remove, surviving in a handler it did not touch.
The dashboard scope popover's Escape listener and the new top-layer one are both registered on `document`, so one keypress closed two layers.
`stopPropagation` cannot fix it, because it never stops a sibling listener on the same node; `stopImmediatePropagation` does.
Reproduced before fixing, and the guard was verified failing against the plain form.

The review's second finding was inverted and the code won.
It read `topOverlay()`'s DOM-order tie-break as an assumption that could disagree with visual stacking.
It cannot: the function computes paint order by the browser's own rules, so whatever it returns is what is on top.
What it genuinely pointed at, that nothing enforces the markup ordering a stack depends on, is real and is now a queue item.
That is the third time a finding with a wrong mechanism has been worth acting on.
