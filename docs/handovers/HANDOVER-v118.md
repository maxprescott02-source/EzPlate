# HANDOVER - v118 (looking at a plate no longer plants a draft)

**Branch:** `fix/builder-look-only-draft` · **Scope:** `docs/QUEUE.md` → "Builder plants a draft just from looking", plus marking Staging Supabase blocked.

**Cache version bumped 115 → 118, all six spots.** Two numbers skipped **on purpose**: v116 and v117 were no-bump docs batches, so the diary had drifted ahead of the deploy number.
The v115 audit's top finding was about exactly that conflation, so this realigns them rather than widening the gap.
From here, handover vNN and `sw.js` vNN mean the same thing again.

**Suite at close:** `npm test` **765 green** (756 → 765, +9 `plate-draft`) · jsdom smoke green · Playwright **90** (88 + 2 new `v118-draft`) · `node -c` clean · driven in a real browser at 380px and 1280px.

## What changed

- Opening the builder to LOOK at a plate and closing it with × no longer leaves a draft, so the next entry - possibly a week later - no longer asks "Unfinished plate — resume or discard?" about a plate nobody touched.
- A draft that does exist can no longer silently overwrite newer state: it records the baseline it was taken against, and resuming one whose plate has moved since asks first.
- `docs/QUEUE.md` → Staging Supabase marked **blocked**. It is the loop's most common stop condition and it fired: no agent can create the project.

## Into CLAUDE.md

Nothing proposed.
The trap here is `_draftArmed` living for the whole session while `loadPlate` renders before `openBuilder` arms it - and that is now written at both the fix and the spec that drives it, which is where it will be read.

## New docs/QUEUE.md items

None. One item closed, one moved to blocked.

## New docs/PHONE.md items

- **Look at a plate, close it, open a different one.** Confirmation rather than diagnosis - Chromium says it is fixed at both widths, but it depends on the builder closing the way a thumb closes it. Failure: the prompt still appears after a look-only visit, or - worse - stops appearing after real unsaved edits.
- **The new "Plate changed since" dialog.** Only reachable by leaving a draft on one device and changing that plate elsewhere. Failure: unclear which version wins, or the two buttons are the wrong way round under a thumb.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing - it was accurate, including the mechanism, which is a change from the last two items I took.
Its parenthetical *"a look-only visit arms the prompt for the next one"* turned out to be the single most important phrase in it, and I nearly skimmed past it.

**What did you not propose because it was out of scope?**
`_draftArmed` is a one-way latch for the whole session, which is what turns "renders before arming" from a harmless ordering detail into a bug that only appears on the second visit.
Disarming on `closeBuilder` would be the tidier fix and it is a bigger change than this item asked for, with its own risk of losing a draft when × is pressed mid-edit.
Not proposed, not built, and noted here because the latch is still there.

## Surprises

- **My first browser check passed against the broken code, and I nearly kept it.** It opened the builder once. The first open of a session never wrote a draft, because `loadPlate` renders before `openBuilder` arms saves - so a one-visit test reproduces nothing. The committed spec drives two visits and was verified failing against the pre-fix condition at both widths.
  This is the `CLAUDE.md` warning about tests that pass against broken code, met in the wild: the unit test caught the fix, and the integration test I wrote to be thorough was the one that lied.
- **The fix is smaller than the diagnosis.** One condition - `isBuilderDirty()` instead of `draftHasContent(d)` alone - because the question the code was asking ("is there content?") was never the question that mattered ("did anything change?"). A loaded plate has content by definition.
- `lineSig` prefixes `'K'` to a kid that already starts with `'K'`, so a real signature reads `KK0001:100`. Harmless - it is an opaque comparison key - but it cost two failing tests where I had hardcoded the format I assumed. The tests now build expected baselines with the app's own `lineSig` instead of spelling it out.
