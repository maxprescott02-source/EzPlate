# HANDOVER v85 — Re-entering the builder no longer bins an unfinished plate

**Completed:** 25 Jul 2026 · branch `feature/newuser-flow` (on top of v84) · Max reviewed the draft
flows and asked whether they were right. Baseline v84, 360 node green. Ended **365 node green**, smoke
green (+ new `[22]` section), `node -c` clean, six spots → **v85**. Client only, `js/app.js` + tests.
Zero contact with the protected region, money law, naming inversion, data model, invoice subsystem,
insight engine, `api/*.js`.

## What Max asked

Three observed flows, and "do these seem right — if yes leave it, if no fix it appropriately":

1. Build a plate, press ×, refresh → resume offered.
2. Refresh while the builder is open → resume offered.
3. Press ×, go make an ingredient, tap **+ New plate** → **no resume option**.

## Verdict: 1 and 2 are right. 3 is wrong — and worse than it looked

Flows 1 and 2 are both reloads, and the boot offer is exactly the specified behaviour ("on load, if a
draft exists, offer to resume"). Left alone.

Flow 3 was reproduced in jsdom, and the missing offer was the smaller half of the problem:

```
after building        : draft stored = true  | lines in memory = 1
after pressing x      : builder open = false | draft stored = true
back on Plates tab    : draft stored = true
--- after tapping "+ New plate" ---
resume offered        : false
plate name            : ""
lines in memory       : 0
draft still stored    : false      <-- the work is unrecoverable, even by reloading
```

`openBuilderNew()` cleared `plate` and the name field, then called `renderPlate()`, whose (now armed)
`scheduleDraftSave()` fired 250ms later, found an empty builder and **removed the draft slot**. So the
user didn't just lose the offer — they lost the plate permanently. Flow 3 is also precisely the flow
v83 item 7 was built around ("go add the missing ingredient and come back"), which makes it the most
likely path a new user takes.

**A fourth entry has the identical defect** and Max didn't mention it: press ×, tap a saved plate →
**Edit plate**. `editPlateFromCard` → `loadPlate` → `loadPlateState`, which does the same
`plate=[]` + `renderPlate()`. Fixed in the same pass — leaving it would have left the hole open via a
different button.

## The fix — reuse the guard the app already had

The app **already** protects two other builder entries this way: `requestLoadPlate` and
`requestLoadMenuItem` both check `isBuilderDirty()` and ask before clobbering. `+ New plate` and
`Edit plate` simply never got it. So this is not new machinery, it is the existing pattern applied to
the two entries that were missed.

- `unfinishedPlateWaiting()` — `isBuilderDirty()` **or** a stored draft with content. The first covers
  this session (× only hides the popup; the work stays in memory), the second covers a draft whose boot
  offer was dismissed.
- `guardUnfinishedPlate(proceed)` — if nothing is at risk, `proceed()` runs immediately (**no nagging**).
  Otherwise the same Resume/Discard dialog the boot offer uses, so the question reads identically
  wherever it's asked. **Discard** clears the draft and then proceeds; a stray × / backdrop dismiss runs
  neither callback and changes nothing (v82's rule).
- `resumeUnfinishedPlate()` — reopens in place when the work is still loaded, else restores from the
  stored draft.
- `openBuilderNew()` is now just `guardUnfinishedPlate(startNewPlate)`; the old body became
  `startNewPlate()`. `editPlateFromCard` wraps `loadPlate` the same way.
- `readPlateDraft()` extracted so the boot snapshot and the guard share one reader.

## Verified (jsdom, all paths)

| Path | Result |
|---|---|
| Flow 3: ×, Ingredients tab, **+ New plate** | Resume offered, names the plate, restores lines + name |
| Same, choose **Discard** | Clean empty builder, draft cleared |
| Same, stray **×** on the dialog | Nothing decided, draft kept |
| Flow 4: ×, then **Edit plate** on a card | Resume offered; Discard opens the tapped plate |
| Clean builder → **+ New plate** | Opens straight away, **no dialog** |
| After **saving**, then **+ New plate** | Opens straight away — a saved plate is not "unfinished" |
| Flows 1 & 2 (reload) | Unchanged, still offer and still resume |

The last two matter as much as the fix: a guard that nags after a normal save would be worse than the
bug.

## Tests (360 → 365, + smoke `[22]`)

Five source pins in `plate-draft.test.js`: both entries route through the guard; the wipe moved behind
it (`openBuilderNew` no longer contains `plate=[]`); the guard passes a clean builder straight through;
only the explicit Discard clears; resume prefers loaded session state over storage.

Smoke `[22]` drives Max's flow 3 end to end in a fresh window — build, ×, switch tabs, **+ New plate**,
Resume — plus Discard, stray dismiss, and both no-nag cases.

## Judgement calls

- **Fixed flow 4 as well**, unreported. Same root, same silent loss, one button away.
- **Guard on entry, not on ×.** Prompting on × would tax the common case (closing to look something up
  is normal and safe — the work survives); prompting only when something is about to be *replaced*
  puts the question where the loss actually happens.
- **Did not add a visible "unfinished plate" card to the Plates tab.** It would be more discoverable
  than a dialog, but it is a new surface with its own empty/duplicate states — worth its own brief if
  Max wants the work advertised rather than merely protected.

## Needs Max's phone

Flow 3 exactly as reported: build, ×, Ingredients tab, back, **+ New plate** → Resume brings it back.
Then repeat choosing **Discard** (clean builder). Then confirm the *absence* of nagging: save a plate
normally, tap **+ New plate**, and it should open immediately with no dialog. Both themes, 380px.
