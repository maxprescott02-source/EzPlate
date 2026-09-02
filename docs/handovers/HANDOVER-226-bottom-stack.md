# HANDOVER - 226 (the install banner publishes what it occupies)

**Branch:** `fix/bottom-chrome-toast-stack` · **Scope:** `docs/QUEUE.md` item 6, "The bottom-of-screen chrome has no single owner, and two pieces overlap". **Shipped `ezplate-v186`.**

## What changed

The toast no longer lands on the install banner.
The banner publishes `--install-banner-clear`, which is its used `bottom` plus its measured height, and three rules read that one number: the document reserve, the builder summary bar and the toast.
A `ResizeObserver` keeps it live, because the height changes while the banner is up when the iOS hint is revealed, and the width changes at every breakpoint that moves the dock.

The cause was the item's title rather than its symptom.
`114px` was hardcoded in two rules and is 90, the height measured at desktop, plus 24, the desktop dock offset.
The dock is 84 below 1024, so the constant was 57px short at every phone width and 113px short with the iOS hint open.
177's comment said the two copies could not drift, which was true and was not the same as being right.

Below 1024 the document reserve therefore goes 114 to 171 while the banner is up, and 227 with the hint.
That is a layout change on every screen and it is the one consequence worth knowing about.
It is space the banner was already covering, full Playwright is green, and the screenshots at 380 and 1280 in both themes were looked at.

## Review

Pre-push `code-review` agent, Sonnet against Opus 5, on the branch diff, without the item.
**No findings.** `docs/reviews/REVIEW-226-bottom-stack.md` has the report verbatim, and the decision on each of its three nits.

Two nits were actioned.
`publishClear()` is now guarded, because this diff added the one line in `show()` that can throw and an unguarded throw would leave a visible banner with no class, which is the pre-177 failure the class exists to prevent.
The geometry bound was picked rather than derived; it is now `[12, 13)` from the arithmetic, with the banner's height cancelling on both sides of the subtraction, which is what makes it safe to pin that tightly on a CI runner with no Geist installed.
Halving the lift to `+6px`, which the first draft's 8 to 20 bound would have passed, now fails 12 of the 14 tests.

The third nit is recorded rather than actioned: `publishClear` cannot be a `tests/mutation/targets.js` entry, because the gate drives `node --test` and this is browser DOM.
An entry the gate cannot exercise looks asked and is not.

The review independently hand-mutated the JS and the CSS and got the same reds this batch got, and it checked the containing-block trap this repo records, confirming `#bFootSum` is a sibling of `.bld-docket` rather than a descendant of it.

## Into CLAUDE.md

**Nothing.**
The shape here is already written down twice, in the two sections that would have caught it: "two definitions of the same thing is the defect; which one is right is not the question", from the DEFAULT-and-trigger record, and the `position:fixed` section's "a batch added a property for its own reason and silently changed the coordinate space a mechanism in another file depends on".
This is the first, in CSS, with a comment asserting the property the code did not have.
Per the roster's own instruction a bullet is added when the shape is new; this one is not.

## New docs/QUEUE.md items

**One, and it is the audit counter firing rather than a finding.**

- **10** run `project-audit` and FILE its report to `docs/audits/AUDIT-v186.md`. The newest audit is `AUDIT-v176` and `sw.js` now reads `ezplate-v186`, a gap of exactly 10. It sits above every unblocked item. The number 10 is used rather than the 6 that just freed up, because reusing a number for a different item is the renumbering trap item 5 records.

Two findings went to `docs/MAINTENANCE.md` as C, both measured rather than reasoned.

- A full-length toast covers the builder's Save button with no install banner involved, measured `saveCovered:true` at 380 with the builder open on a costed plate. C because the toast is `pointer-events:none` and transient, and it says at the entry what would make it B.
- `--bottomnav-h` is read with a fallback at the `.bld-bar` rule and published by nothing, so the 64px fallback has always been the live value while a comment two rules below says the offset is measured. That is the exact silent failure the new spec asserts against for `--install-banner-clear`.

## New docs/PHONE.md items

**None.**
The install banner only appears before the app is installed, so Max on an installed PWA cannot reach this state, and forcing it on a device proves less than the measurements do.

## Probe

**What the item told me to do that I would have done differently.**
Nothing about the requirement, which was right, and two things about its facts.
It measured desktop only and describes a 21px clip; at 380 the toast sits almost wholly inside the banner, which is a cover rather than a clip, and mobile is where a new café actually meets this.
And it offered "stack the toast above the install banner when both are up, or move one" as if either would do.
Moving one cannot work: the toast is centred and sized by its message and the banner is right-aligned and 400px wide, so no horizontal arrangement survives a longer message.
The item is deleted, so both corrections live here.

**What I did not propose because it was out of scope.**
Rebuilding the three pieces of bottom chrome as one flex container with a single owner in the markup, which is what "one owner for the bottom stack" could also mean.
It would have to re-derive v141's verified geometry for the sync banner, and `CLAUDE.md` wants visual changes surgical and one screen at a time.
The variable is the smaller change that satisfies the same requirement.

## Surprises

**The banner is up on every fresh boot, and a spec comment said the opposite.**
The install-banner IIFE ends with a bare `show()`, described at its own site as first-visit guidance for iOS where `beforeinstallprompt` never fires.
So `v141-sync-corner.spec.js`'s "never shown in the fixture; force it" was false, and more usefully, every Playwright spec in that directory boots with the banner on screen.
That is why the mobile reserve change had to be checked against the whole visual suite rather than reasoned about.

**A spec comment recorded the defect and filed it under the wrong consequence, again.**
v141's three-way-split test said in writing that the toast and the install banner overlap each other, that it was pre-existing and queued separately, and that it was not what that test measured.
Every clause was true, and the result was a test named for a three-way split that was green while a third of the split was false.
It measures all three pairs now.
