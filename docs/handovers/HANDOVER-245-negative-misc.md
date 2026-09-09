# HANDOVER - 245 (a negative misc cost cannot reach a plate cost)

**Branch:** `245-negative-misc` · **Scope:** `docs/QUEUE.md` item 19, promoted from group G1.
**Deploy version shipped:** `ezplate-v202`.

## What changed

A misc cost typed as a negative no longer reaches the plate.
Reproduced in Chromium first: typing `-2` into the builder's misc line put a $0.92 plate at **$-1.08**, saved it there, and left *"plate cost $-1.08"* in the Plates library.

`setMiscCost` clamps at zero, the way `setQty` one screen up already did.
It was the one unguarded number of three on that screen; `commitPrice` refuses `v<0` as well, so this was a gap between two guards rather than a lone oversight.

`lineCost` refuses a negative unit cost and `costDetail` counts a negative misc line as MISSING, so a negative arriving from a restore or a backup file stays out of every average, out of `plateFullyCosted`, and is flagged in the builder.
A clamp at the input cannot reach data the input never touched.

The builder's warning now reads "no usable cost" rather than "no cost data", because a line reading -$2.00 has cost data and has the wrong data, and that flag is the only thing on screen saying why the total is short.

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item.
**Two findings, both acted on, neither declined.**

**The first is the one worth reading.** It found the negative-product-cost guard written in `costDetail` and not in the builder's cost cell, which computes the same value — so a plate holding a negative product cost would have rendered that line as a real-looking `$-2.00` under a total that excluded it.
Its stated remedy was to mirror the condition in the two renderers, and that is the one part not taken: the refusal moved into `lineCost` instead, where `null` already means "cannot be priced".
**Grepping its callers rather than trusting the finding's list gave FOUR, not two, and the fourth is not a display** - the supplier-exposure sum does `if(lc!=null)` and would have added the negative into a supplier's total silently.
So the finding's own severity ("minor, latent, display-only") understated it, which is `CLAUDE.md`'s rule about a finding's separable claims arriving from the other direction for once.
`costDetail`'s `||lc<0` was deleted with the fix, because at the source it can no longer fire.

The second was a count: the consolidated backlog said twelve where `CLAUDE.md` and `docs/MAINTENANCE.md` said eleven, written into the same commit that added the rule against trusting counts. Eleven is right.

Full report verbatim: `docs/reviews/REVIEW-245-negative-misc.md`.

## Into CLAUDE.md

**One new Tier 1 section: `min`, `max` and `required` ARE INERT on every input this app reads.**
An HTML validation attribute only acts at native form submission or on a `checkValidity()` somebody wrote; this app submits no form and reads every field on `oninput` or `change`, so `min="0"` constrains the spinner arrows and nothing else.
The measured detail is what makes it a rule rather than a note: on the offending keystroke `input.validity.rangeUnderflow` was **true**. The browser had already decided and nothing asked it.
It ends by tying the shape to two rules already in the file - `[hidden]` losing to an author `display` rule, and a `revoke ... from public` that does not name `anon`. **A declaration is not an enforcement**, in three languages.

## New docs/QUEUE.md items

None. Item 19 is deleted from `docs/QUEUE.md` and struck in `docs/QUEUE-2026-09-08-CONSOLIDATED.md` with what was done differently from what it asked.

**One new C in `docs/MAINTENANCE.md`:** the `type="number"` inputs nothing has asked a question of.
Fifteen exist, fourteen declare `min="0"`, four are known to be guarded, and **eleven have not been looked at**.
Filed rather than fixed on sight, and the entry says why: three of the eleven are on the invoice review, next to consolidated items 17 and 26, which are still deciding what a negative invoice line MEANS - and a blanket clamp would hide which of them was ever reachable rather than prove it.

## New docs/PHONE.md items

None. The defect and the fix are both measurable in Chromium and were measured, at 380 and 1280.

## Probe

**What did the item tell you to do that you would have done differently?**
Two things, and both are in the record rather than silently dropped.

It asked for `saveCurrentPlate` to refuse a negative plate cost with a message. **Not built.** With the walk's rule the total cannot be negative, so the guard could never fire, and this repo has already deleted one fallback for exactly that reason (`plateIdOf`, v112).
The requirement is met structurally instead, which is stronger than a message.

Its headline says the plate *"lowers every average it is in"*, and that is false for the case it describes: a plate whose total goes negative is already excluded by `dishRatios`' `d.cost>0`.
The item's own BODY has this right. The case that actually got through is the plate a negative line merely **drags down** - still positive, still averaged, understated by the amount of the bad line - and the tests are written about that one.

**What did you not propose because it was out of scope?**
The eleven unchecked number inputs, which went to maintenance rather than into the fix.
Clamping all fifteen would have been three lines and would have been wrong: it would close the class without ever learning which members of it were reachable, and three of them belong to a question two other queue items are still deciding.

## Surprises

**The artefact the item was written from is gone.** It says a plate at minus $2.00 *"persisted to production on 8 Sep"*.
Measured 9 Sep: zero negative misc lines in `plates`, zero negative `cost_per_base_unit` in 428 products, and the ZZ-AUDIT plates that Tranche 0 listed for deletion are no longer there.
So the defect was real, reproducible in thirty seconds, and its evidence had been cleaned up underneath the item - which is the ordinary case for an item written off an audit and executed a day later, and an argument for reproducing rather than for going looking for the artefact.

**The `min="0"` was on the element the whole time.** That is what made this survive next to two guarded siblings: the attribute states the rule exactly, so the missing check reads as a duplicate rather than an absence.
Both are kept - the attribute for the spinner, the guard for the handler - and the test asserts both, because deleting either while keeping the other is how it happened.
