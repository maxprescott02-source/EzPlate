# HANDOVER - 167 (F8, Invoices becomes a screen and the upload becomes three steps)

**Branch:** `f8-invoices` · **Scope:** queue item F8, the Invoices screen and the import flow. **Ships `ezplate-v147`.**

## What changed

Invoices is a screen (`#tab-invoices`), built from the mock's §3.6 and §6 rather than restyled, because there was no Invoices screen before this.
The sidebar entry navigates to it instead of opening the import modal, which means the More-screen item now has a converted screen to rehome.
The import modal is the mock's §4 three-step flow: choose, scanning, review, with `invStep()` as the only thing that switches panels, and the shared sheet primitive already turns it into the mobile bottom sheet below 768.
The review step is a restyle, exactly as the item scoped it: the v113 referee gate, `invConfirmState`, the auto-tick law, the pack-teach machinery and the tick-persistence truth table are untouched.
The review footer is the mock's bar, and Cancel on it is new: until now the only way out of a review was the header ×, which on a phone sits above a screenful of scrolled rows.

Four answers the item said to settle here, all recorded at their sites:

- **Tint vs hover: review rows deliberately do not hover.** The masking of `--warn-bg` is real but is not the reason; the reason is that this row is a form, not a button, so a wash would promise a press that does nothing. Every other converted screen's row IS a button. The mock's own review rows carry no hover either.
- **Ticking a never-opened add-new form now opens the form.** The tick lives on `r.newItem.approved`, which does not exist until the form does, so it was being kept only in the DOM.
- **The Apply tick gets a 44px `<label>` target.** A label rather than the `::after` the item suggested, for two reasons: pseudo-elements on a replaced element are not dependably rendered, and a label has a `boundingBox` a spec can read.
- **The three verdict vocabularies are deliberate.** Written out once at `vbadge`, pointed at from `marginLightWord` and the chips.

Two pre-existing defects fixed on the way through, both in the import flow.
The "review the extracted text" message pointed at a paste box that v67 had collapsed and never re-pointed.
And every failure path left the user on a panel whose controls had just been hidden.

One defect this batch created and then found in review of its own diff.
The screen's dropzone can start an import with the modal shut, which is a route `openInv()` never sees, so everything it resets survived from the previous import: a file that then failed to parse dropped the user onto step 1 beside a paste box holding the LAST invoice's text, one "Match products" from silently re-importing it.
`handleInvFile` now starts from a clean modal when it is not already open, and pins that it must not do so mid-flow.

Deleted in the same change: the v67 intro banner and its two CSS rules, `.inv-upload`, `.inv-wait-spin`, the `td[style*="text-align:center"]` attribute selectors, and `.invAppr`'s dead sizing rule.

## Into CLAUDE.md

Nothing proposed.
Everything found this batch is either an instance of a rule already there (the `[hidden]` corollary, the specificity trap, the "a stub passes against the defect" family) or specific to one screen.
The `[hidden]` corollary earned a test this time rather than a fourth comment: `tests/inv-upload.test.js` fails if any `.inv-step` display rule loses its `:not([hidden])` guard.

## New docs/QUEUE.md items

None.
F8 is deleted from the queue per the 11 Aug reset, and three things it raised went to `docs/MAINTENANCE.md` by the tier test:

- **Photographing an invoice** - a behaviour spec, because the item's own wiring plan does not work. Recorded below.
- **"Slightly under" is the one verdict phrase that does not carry its subject** - the residual after the vocabularies decision.
- The **import-history** spec was already there and now says what it would replace.

## New docs/PHONE.md items

**Import a real supplier PDF end to end, both themes.**
The specific asks: does the new scanning panel read as progress or as the app having stopped, is Confirm reachable with a thumb after scrolling a long invoice, and does the bigger Apply target actually feel bigger.
A failure looks like two step panels on screen at once, a blank sheet, or the import feeling slower than it did even though nothing extra is computed.
Also noted there: the Invoices screen has no phone route until the More-screen item lands, and Import invoice on Products still opens the flow in one tap, unchanged.

## The pre-push review found two, both in this batch's own tests, both fixed here

Neither was in the app code.
Both were tests that could not fail, which is the failure mode this repo has recorded four times and which is never a red test.

**1. The regression test for the clean-modal fix was order-only, and the reviewer proved it green against an INVERTED guard.**
It matched three substrings and asserted their left-to-right order, so flipping `if(!(mo && open))` to `if(mo && open)` — reset when the modal IS open, skip it on the one path the fix exists for — left every substring in place and the test passing.
This is the "a test that records call ORDER passes against the broken code" trap, in the diff written to guard against that class.
The remedy is the one the repo already had: the test now RUNS the real `handleInvFile` against stubs and asserts that `openInv` is called once with the modal shut and **zero** times with it open.
Checked against three mutations, not one: the reviewer's inversion, dropping the guard entirely, and the correct code. Only the correct code passes.

**2. A second assertion in the same file could never fail.**
It looked for `r.userTick=cb.checked;` at the very END of the tick handler's source, and there is always code after it, so it passed whatever the branch did.
It now pins the if/else STRUCTURE, and fails if the `addNew` branch is removed or the `else` widened to cover it — which is the real "two homes for one tick" regression.
Also mutation-checked.

The reviewer also traced and cleared the two things I most wanted a second opinion on: the step machine against the v113 referee gate, and whether the checkbox and `r.newItem.approved` can disagree.
It reached the same conclusion I had on the one theoretical gap in the second (an `addNew` row rendered without its `.ni-slot` would leave the tick unstored) and, like me, did not report it, because nothing in the diff can produce that state.
Recorded here rather than acted on, because a deliberately unreachable branch is its own debt and this file already carries one.

## Probe

**What did the queue item tell you to do that you would have done differently?**

**"Take a photo" could not be built as specified, and the specification was a claim about the code.**
The item said `capture` on the file input "feeding the EXISTING parse path; no new parsing".
`handleInvFile` branches on `.pdf` and sends everything else to `FileReader.readAsText`, so a JPG or HEIC arrives as binary noise in the paste box and finds nothing.
`api/parse-invoice` receives text the client already extracted, so it does not close the gap either.
Shipping the button would have been a control that does nothing, which §R4 forbids, so the mobile sheet leads with "Choose a file" and the camera is a behaviour spec that names OCR as the real requirement and flags that a vision call reopens the privacy gate.
The mock's "we accept PDF, JPG and HEIC" copy is wrong for this app for the same reason, and the shipped copy says PDF or CSV.

**The item said the Apply checkbox is 26×26px. It is 24×24.**
`.invAppr{width:26px}` measures 0-1-0 and `input[type=checkbox]` measures 0-1-1, so the base rule has always won and the 26 has never rendered.
Measured in Chromium on the branch point before touching anything.
The rule is deleted rather than given the specificity to win, because 24 is what every other checkbox in the app is and nothing should change visually; what changes is that the file stops asserting a number the screen does not have.
This is the Tier 1 specificity trap, and it is worth noting that it was found by measuring rather than by reading - the item was written from the CSS and the CSS was lying.

**The recents table.** The item allowed "a visibly-stubbed recents area or none". Neither felt right on its own, so the screen states the absence in one sentence and prints the one import fact the app genuinely stores, which is the date of the last one.

**What did you not propose because it was out of scope?**

The three-vocabularies question is answered but its residual is a copy change on the Menu screen and the publish dialog, which is two other screens.
§5 is one screen per change set, so it went to maintenance rather than riding this diff.

The Invoices screen is thin - a dropzone and a sentence.
That is honest given no import history exists, but it means the sidebar now navigates somewhere emptier than the modal it used to open, and only Max can say whether that trade reads as a regression on desktop.
It is not a defect and I did not want to invent content to fill it.

## Surprises

**The review table has been a card list at every width since v13, not a table.**
`thead` is `display:none` and every row is `display:block`, so the "desktop hover" the tint-vs-hover question was framed around could not have existed in the form the question imagined.
The decision stands and is better argued for it, but the framing came from the mock rather than from this screen.

**Two existing pins were consciously changed, and one of them was measuring a proxy.**
`settings.test.js` asserted "the nav bar stays at five tabs" as a way of asserting "Settings is not a tab", which also forbade any other screen ever becoming one.
It now asserts the main nav group is five and that Settings carries no `data-tab`, which is the contract it meant.
`v137-modal-layer.spec.js` asserted that the sidebar entry opens the import modal, which F8 deliberately changes; it now asserts that it navigates and does **not** also open the modal, which is the failure a leftover handler would produce.

**Both new behavioural tests were checked against the unfixed code before being trusted.**
Reverting the add-new tick fix fails its test; removing the `:not([hidden])` guard fails its test.
Five of the fourteen new unit tests passed on their first run for the wrong reason - this repo tombstones what it deletes, so a raw grep for `.inv-upload` or "Take a photo" hits the prose explaining why they are gone.
They read the files with comments stripped now, which also means a comment can never satisfy one of them by accident.
