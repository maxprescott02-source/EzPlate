# HANDOVER - 208 (the privacy notice)

**Branch:** `feature/privacy-disclosure` · **Scope:** `docs/QUEUE.md` item 2, the privacy gate.
**Ships `ezplate-v171`** - the six cache spots are bumped.
✅ **Max approved the wording on 27 Aug 2026**, which was the one thing in the item that was ever his. Recorded in `CLAUDE.md`'s privacy-gate section with that date.
⚠️ **He replied "i approve the light one", and there was no light-versus-dark CHOICE to make** - the decision file rendered the same notice twice, in the app's two themes, because a wording has no variants. It was put to him plainly before merging rather than read as a preference, and he was told what the reply was being taken to mean. **The lesson is about the decision FILE, not about him: rendering one option twice reads as two options.** `skills/decide` says to draw every option side by side and label them A, B, C - two renders of one thing sitting side by side wear that grammar without being it. **A single-option approval should be drawn ONCE, at the primary size, and say in the caption that the second frame is the same words.**

## What changed
A privacy notice that names Google, the free Gemini tier, that submissions may be used to improve Google's products including training, and that human reviewers may read them.
It is accepted at sign-up before an account exists, readable from the signed-out gate, restated at both invoice dropzones, and linked from the Settings toggle - which now names the destination instead of only saying "no AI calls".

Suite 1562 to 1575, green. Smoke passes. Twelve Playwright cases across three surfaces, two sizes and two themes.

## Review
`code-review` agent on Sonnet against a batch on Opus 5, without the item. Artifact: `docs/reviews/REVIEW-208-privacy-disclosure.md`.
**Three findings, all fixed, none declined.**

The first is the one worth carrying. It flipped `!acc.checked` to `acc.checked` - so sign-up is blocked when the box IS ticked and allowed when it is not - and **all twelve tests stayed green**, because mine asserted only that the checkbox was read before `authSubmit` with a `return` between them. That is roster 167(a), in this batch's own new test file, written by someone who had read the roster that week.
It also found the guard failed OPEN on a missing element, and that the notice promised "you will be asked to read it again" with nothing implementing it.

## Into CLAUDE.md
Nothing.
All three findings are instances of shapes already on the roster - an order-only assertion, a fail-open guard, a claim with no mechanism behind it. The roster's header says to add a bullet when the SHAPE is new, and none of these is.

## New docs/QUEUE.md items
None.
Item 2b is corrected: it said "the screens and the acceptance RECORD all stay" and there is no acceptance record.

## New docs/QUEUE.md deletions
Item 2 is DELETED, finished. **Three `Do after: the privacy gate` lines went with it** - on items 1 (café creation), 2b (the paid tier) and 4 (the gate review) - per this file's own rule that a satisfied dependency is removed rather than left standing. One answer unblocked four items.

## New docs/PHONE.md items
None.
The three surfaces are driven at 380px in both themes by `tests/visual/item2-privacy.spec.js`, which is a better check than a device note because it runs on every push.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
Nothing. The item is unusually well specified and its fourth bullet - "check what the Dashboard insight toggle currently says" - was right that it was the cheapest of the four and also the most wrong: "Off = no AI calls" is true about calls and silent about where they go, which is the one fact the whole item exists to surface.

**What did you not propose because it was out of scope?**
Persisting the acceptance. I built the tick that gates sign-up and did not write it anywhere, so nothing knows who accepted which version.
That is defensible while the notice only ever gets stricter, and it stops being defensible the moment item 2b ships - the paid tier reverses the notice in the user's favour, and with no record there is no way to identify or re-ask anyone who accepted the old wording.
It is filed in `docs/MAINTENANCE.md` as C with that escalation written into it, and item 2b now points at it.

## Surprises
**The reviewer inverted my gate and my own test did not notice.**
Blocking sign-up when the box IS ticked is the exact opposite of the feature, and twelve green tests said it was fine, because I had asserted the ORDER of two things and the existence of a `return` rather than the decision itself.
The remedy was the one this repo already had written down: extract the decision, call the real function, and put it on the mutation gate - where it is now four mutants and four kills. Before that, `wireGateSignUp` was invisible to `npm run mutate` entirely.

**The notice made a promise the code could not keep, and only a reader looking for the mechanism found it.**
"You will be asked to read it again" is a reasonable thing for a privacy notice to say and there is nothing in the app that could do it.
It is worth noticing what kind of defect that is: not wrong code, but a commitment in consumer-facing copy with nothing behind it - in the one batch whose entire subject is not saying things that hide the truth.

**The browser found a layout defect that reading the CSS could not.**
The acceptance label wraps to two lines on a phone, and `#bootGate` centres its text, so the second line sat centred under a checkbox pinned left.
Every rule involved was individually correct.

**CI caught a regression the laptop did not, because I ran only my OWN spec.**
The privacy gate refuses sign-up until the box is ticked, and `tests/visual/v165-invite.spec.js` drives that exact flow twice - it fills the form and submits without ticking anything, which was correct until this batch changed the flow underneath it.
Both cases went red in CI and green locally, because I ran `item2-privacy.spec.js` alone and never the suite.
**The hook is the fast local copy; CI is the one that actually holds** - `CLAUDE.md` says so about the mutation gate and it is just as true here. The fix is one line per spec: tick the box, because that is the step a real user now takes.
⚠️ **The general shape is worth more than the fix: a new GATE is a change to every flow that passes through it, and the specs that drive those flows do not mention the gate anywhere.** Grepping for the thing you added finds nothing; you have to grep for the SCREEN.

**`npx` is unusable on this machine and the repo already knew.**
The npm cache has root-owned files, so `npm run serve` fails - and `playwright.config.js` says at its own site that it serves with `python3 -m http.server` for exactly that reason.
Worth knowing before spending time on it: the Playwright path works, the `npx serve` path does not.
