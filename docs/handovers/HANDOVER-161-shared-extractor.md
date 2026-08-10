# HANDOVER - 161 (one extractor, shared)

**Branch:** `chore/extractfn-shared-helper` · **Scope:** the queue's top item, found by the 158 pre-push review.
**Deploy version: NONE.** Tests only, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

`tests/_extractfn.js` is new and holds `loadApp`, `extractFn`, `extractVar` and `sliceBetween`.
`tests/_extract.js` requires it instead of defining its own; its exported surface is unchanged.
All 48 files that hand-rolled the extractor now require the shared one, and what they assert is untouched.
`tests/extractfn.test.js` is new: the extractor had no tests at all.
Suite 849 to 865.

**The item said the copies had not drifted, and that was wrong.**
Three signatures existed: 37 took `(src, name)`, 10 closed over a module-level `SRC` and took `(name)`, one took `(src, name, occ)`.
The one that mattered: **three copies carried the parse guard and forty-five did not.**
The depth counter is brace naive, so a `}` inside a string ends the slice early and hands back a truncated function instead of raising.
That guard is now on for every caller, and the suite is green with it on, so nothing was mis-slicing today.

Two call sites were `.map(extractFn)`, which passed the array index as the second argument the moment the signature changed.
They failed loudly when the suite ran, which is the only reason to trust the other 351.

**Review (Sonnet, no brief): one finding, real, fixed.**
Two dead `require('path')` lines survived in `dash-digin` and `plate-draft`.
The cause is worth recording because it is a trap in the tool rather than in the code: the migration script decided a module was still used by grepping `\bpath\.`, and PROSE satisfies that pattern when a comment ends a sentence with the word ("the pid path. \*/").
Re-checked across all 49 files with a pattern that matches the API rather than the word; those two were the only ones.
It read the rest of the diff call site by call site and found no defect.

## Into CLAUDE.md

Nothing.
Its two references to `tests/_extract.js` are both still true, and `_extract.js`'s own header now points a reader at `_extractfn`, so the discoverability trap this batch fixed is closed in the code rather than in the doc.

## New docs/QUEUE.md items

Four test files still read `js/app.js` by hand rather than through `loadApp()`.
They extract nothing, so they were never in the 48, and they were deliberately left out rather than added after the review had started.

## New docs/PHONE.md items

None.
Nothing here reaches a user.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing on the substance, but its confident "the copies have not drifted yet - checked" was false, and the check that disproved it took one command.
The item is now corrected in place, because it was about to be cited as evidence that this class of duplication is harmless.
It offered a choice between exporting from `_extract.js` and a separate file; a separate file wins because requiring `_extract.js` builds the whole insight-pipeline sandbox, and a test wanting one function should not pay for that.

**What did you not propose because it was out of scope?**
`housekeeping.test.js` has a no-op `.replace(/^function applyTidy/, 'function applyTidy')` at its `applyTidy` extraction, which does nothing at all.
It is inside the "what the 48 files assert" line the item drew, so it stayed.

## Surprises

The 45 files without the parse guard were the finding, not the 48 signatures.
The item framed this as tidiness with drift as a future risk; the drift had already happened, and it had already cost a real safety property in 94 percent of the files.
A brace inside a string in `js/app.js` would have been caught in three test files and silently truncated in the rest.
