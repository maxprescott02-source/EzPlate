# HANDOVER v84 — BUGFIX: "resuming a plate doesn't work" (two load-order causes)

**Completed:** 25 Jul 2026 · branch `feature/newuser-flow` (on top of v83) · reported by Max after v83
was pushed. Baseline v83, 356 node green. Ended **360 node green**, smoke green (+ new `[21]` section),
`node -c` clean, six version spots → **v84**. Client only, `js/app.js` + tests. Zero contact with the
protected region, money law, naming inversion, data model, invoice subsystem, insight engine, `api/*.js`.

## The report

Max: "resuming a plate doesn't work." The v82 draft feature: build a plate, reload, get the
"Unfinished plate — Resume / Discard" dialog.

## Reproduced first, in jsdom (not guessed)

Boot the real `index.html` + `app.js` with a draft already in `localStorage` — i.e. a reload — then tap
Resume. The dialog appeared with correct copy and correct button labels, and **clicking Resume did
nothing at all**: builder closed, name empty, zero lines.

Two isolating probes separated the causes:
- `resumePlateDraft(seeded)` called directly → **works perfectly** (builder opens, name, category and
  lines all restored). So the restore logic was never the problem.
- `askConfirm(…, fn)` registered *after* boot, then OK clicked → **fn runs**. So the confirm dialog
  was never the problem either.

The failure existed **only** for an `askConfirm` issued during the top-level boot pass.

## Cause 1 — the Resume callback was nulled before the user could tap it

`offerPlateDraftResume()` was called at `js/app.js:2600`, mid-file. It calls `askConfirm`, which stores
the callbacks in the module vars `__confirmFn` / `__confirmCancelFn`. But:

```
2600  offerPlateDraftResume();      // askConfirm sets __confirmFn = the Resume callback
…
4911  var __confirmFn=null, __confirmCancelFn=null;      // ← runs LATER in the same pass, nulls it
```

`var` hoisting declares the binding early, but the **`= null` initialiser executes in source order** —
about 2300 lines after the call. By the time the script finished and the user could tap anything, both
callbacks were `null`, and the OK handler's `var fn=__confirmFn; closeConfirm(); if(fn)fn();` closed the
dialog and did nothing. **Discard was equally dead** (it silently left the draft in place).

**Fix:** `offerPlateDraftResume()` is now the **last statement in `js/app.js`**, after every initialiser
— the same reasoning that already parks `restoreLastTab()` late ("safe now: all module data is
initialised"). A comment at the old site records the trap: anything calling `askConfirm` at load time
must run after those vars.

## Cause 2 — the boot render deleted the stored draft ~250ms in

Independently: the boot pass renders an **empty** builder (`restoreLastTab` → `renderPlate`), which
called `scheduleDraftSave()`. 250ms later `savePlateDraft()` ran, found nothing worth keeping, and hit
`localStorage.removeItem(DRAFTKEY)` — **while the user was still reading the resume dialog.**

v82's comment claimed the boot snapshot (`_bootPlateDraft`) meant "an empty-builder render at startup
can't wipe the stored draft". It protects **that one offer**, which is why Resume-immediately could
look fine — but localStorage was already gone, so a **second reload offered nothing**, and any dismissal
of the dialog lost the plate for good. Verified: draft present at boot, absent 400ms later, untouched
by the user.

**Fix:** a draft may only be written by someone actually **in** the builder. `scheduleDraftSave()` is
gated behind `_draftArmed`, which starts `false` and is set by `armDraftSaves()` — called from
`openBuilder()`. Boot renders happen with the modal closed and now touch nothing. `openBuilderNew` and
`resumePlateDraft` both call `renderPlate()` *before* `openBuilder()`, so neither can wipe the slot on
the way in either.

## Verified behaviour (jsdom, all six paths)

| Path | Result |
|---|---|
| Boot with a draft, tap **Resume** | Builder opens; name, category and lines restored |
| Edit after resuming | Draft tracks the edits again |
| Boot, touch nothing, wait | **Draft still in localStorage** — a 2nd reload still offers it |
| Tap **Discard** | Draft cleared |
| Dismiss with **×** | Draft **kept** (a stray dismiss must not throw work away) |
| Draft naming a deleted ingredient | Resumes, degrades, never crashes |
| Clean boot, no draft | No dialog, nothing written |

## Tests (356 → 360, + smoke `[21]`)

`tests/plate-draft.test.js` +4 **source-order pins** — the existing tests only exercised the pure data
layer, which is exactly why neither bug could surface there. New pins: the load-time offer must sit
after the `var __confirmFn=null` initialiser; nothing may re-initialise those vars after it;
`scheduleDraftSave` must be gated by `_draftArmed` and `openBuilder` must arm it; only two
`removeItem(DRAFTKEY)` sites may exist.

**Three of the four fail against the pre-fix `app.js`** — checked by reverting `js/app.js` and re-running
(the fourth is an invariant guard, not a bug-catcher, and is labelled as such).

Smoke gains `[21]`, which boots a **second jsdom window with a draft already in localStorage** — a real
reload — and drives Max's exact flow plus all six paths above. This is the functional coverage; the
node pins are the cheap early warning.

## Judgement calls

- **Fixed both causes, not just the reported symptom.** Cause 1 alone would have made Resume work while
  still silently destroying the draft on any boot the user didn't immediately resume — the bug would
  have come back as "it lost my plate again" with a different description.
- **A stray × keeps the draft** rather than discarding it, matching v82's existing reasoning that only
  the explicitly labelled button acts.
- **`_draftArmed` is armed by `openBuilder`, not by the dialog resolving.** Being in the builder is the
  real precondition for writing a draft, and it covers every entry point (new, edit, resume) without the
  dialog's dismiss paths needing to be enumerated.

## Still flagged, still NOT built

`+ New plate` (`openBuilderNew`) wiping an unsaved in-progress plate — unchanged by this batch and still
worth its own brief. Note it is now *slightly* safer: its `renderPlate()` runs before `openBuilder()`
arms saves, so it no longer removes the stored draft on the way in; the in-memory plate is still lost.

## Needs Max's phone

Build a plate, reload, **tap Resume** — everything back. Then: reload and ignore the dialog, reload
again, confirm it is **still offered**. Then Discard and confirm it is gone. Both themes, 380px.
