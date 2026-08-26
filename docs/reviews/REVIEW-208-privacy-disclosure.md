# REVIEW - 208 (the privacy notice)

Reviewed-commit: ad6417c
**Agent:** `code-review`, run on Sonnet against a batch running on Opus 5 · **Branch:** `feature/privacy-disclosure` · **Brief withheld.**

## Findings, most severe first

### 1. MAJOR — the unit test could not detect an INVERTED gate (roster 167(a))

The reviewer flipped `if(acc && !acc.checked)` to `if(acc && acc.checked)` — so sign-up is blocked
when the box IS ticked and allowed when it is not, the exact opposite of the intent — and **all
twelve tests stayed green.** The test asserted only that `bgUpAccept` was read before `authSubmit`
and that a `return` sat between them: an order-and-existence check, true of the inverted guard
verbatim. That is roster incident 167(a) arriving again, in the batch's own new test file.

It also noted the Playwright spec DID catch the mutation, and that `wireGateSignUp` is not a
mutation target, so `npm run mutate` was blind to the function entirely.

**Verdict: fixed, three ways.** The decision is extracted as `privacyAcceptNeeded`, the test calls
the REAL function instead of describing where it sits, and the function is now a mutation target
(4 mutants, 4 killed). The order check survives as a separate, explicitly-weak assertion beside it.

### 2. MINOR — the guard failed OPEN on a missing element

`acc && !acc.checked` is false when `getElementById` returns null, so a markup rename would have
shipped an ungated sign-up with no error and no signal.

**Verdict: fixed.** `privacyAcceptNeeded` refuses unless `checked === true`, and the test
enumerates null, undefined, false, 0, '', `{}` and a truthy non-boolean. A missing checkbox now
blocks sign-up loudly and is fixed by restoring one element; the other direction sends a stranger's
invoice text to Google having never shown them what leaves.

### 3. NIT — the notice promised a mechanism that does not exist

The copy said *"you will be asked to read it again"* when the notice changes. The reviewer grepped
for an acceptance record and found none: the tick gates the form and is never persisted, so nothing
knows who accepted which version. It also spotted that `docs/QUEUE.md` item 2b already presupposed
such a record.

**Verdict: fixed, and this is the finding worth keeping.** A commitment in a consent notice with
nothing behind it is the one kind of copy this item exists to avoid. The sentence now says what is
true; the queue item's false presupposition is corrected; and building the record is filed in
`docs/MAINTENANCE.md` — flagged there as becoming **B the moment item 2b ships**, because the paid
tier reverses the notice in the user's favour and, with no record, there is no way to identify or
re-ask anyone who accepted the old wording.

## What the reviewer checked and found sound

All six cache-version spots at 171 with no leftover 170; `css/style.css` parses and every new
`display` rule that needs `:not([hidden])` has it (it verified the two that do not are gated by
class-based visibility instead); one submit listener, catching both click and Enter, with the gate
before `authSubmit`/`signUp`; **the `<a>` inside the `<label>` verified empirically in Chromium
not to double-activate the checkbox**; the modal inherits the existing focus-trap, scroll-lock and
Escape machinery with no special-casing; all ten new ids unique and no double-binding; and the
`noticeHtml()` slice confirmed to contain the whole notice and not bleed into the next modal.

## Process note the reviewer raised, and it is correct

The branch's own `docs/QUEUE.md` marks item 2 `blocked` and says **DO NOT MERGE** without Max's
sign-off on the wording, and no such approval is evidenced on the branch. That is deliberate: this
PR is open for him to read, and it does not merge until he answers.
