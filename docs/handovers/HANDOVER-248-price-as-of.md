# HANDOVER - 248 (a price gets a date, an import gets a record, a column gets its real name)

**Branch:** `248-price-as-of` · **Scope:** `docs/QUEUE.md` item 22, all three of its parts.
**Deploy version shipped:** `ezplate-v205`.

## What changed

**`price_as_of` is written.** Nothing wrote it before. The column has existed since the schema was written and both row mappers round-trip it faithfully, which is exactly what made it invisible - measured on production: **0 of 428 products carried a date and 421 had a price.**
⚠️ **Stamped whenever a price is WRITTEN, not only when it moved**, and that is the whole meaning of the field. `ing_price_history` records movements and deliberately skips a re-write of the same number; this answers *"as of when is this price known to be current"*. An invoice confirming $10 again has observed $10 today, and a staleness reading built on the movement rule would call a price checked this morning six months old.

**An applied invoice writes one `menu_change_log` event** - supplier, line count, counts. That closes the measured complaint: the app's only memory of an import was one date in `app_settings`, overwritten by the next one, carrying no supplier and no size.

**"Last change" is renamed "Supplier move"** on both screens. The figure is the linked PRODUCT's price movement and does not move when the ingredient changes by another route - which is why K0164 read a dash on 8 Sep after being relinked from $10/kg to $20/kg.

## Review

The pre-push `code-review` agent, on Sonnet, not shown the item.
**One finding, a MAJOR, and it was mine. It is the sharpest this process has produced, because of how it was found.**

I gated the import record on the `last_invoice_import` settings write, justifying it as *"the same reason 247 gates the trend point"*.
**The 247 comment ELEVEN LINES ABOVE says the opposite** - that this same settings write is not a valid gate because it *"decides nothing about the prices"*. The contradicting sentence was in the same function, on screen, unmodified by the diff that contradicted it. Nothing in the diff looked wrong; the reviewer found it by reading the neighbourhood.

Wrong in both directions, and the first is the worse one: the settings key failing on a flaky connection drops the record for an import whose prices all landed.
**The record is now ungated** and its counts are named `attempted`. There is no honest boolean available here - an import's verdict is a COUNT from the saved manifest, which is item 90's, together with the completion message that has the identical dependency. 247 wrote that same sentence at this same site, which is the precedent I should have read instead of the one I cited.

A second defect surfaced while fixing the first: the census test's regex only recognised `logChangeIfSaved`, so switching to plain `logChange` would have slipped a new kind into `applyInvoice` unseen - the census's own subject. Widened, and both properties hand-mutated red.

Full report verbatim: `docs/reviews/REVIEW-248-price-as-of.md`.

## Into CLAUDE.md

**One new Tier 1 section: a justification that CITES A PRECEDENT is a claim that the precedent's CONDITION holds here, and it is never checked.**
Two dated instances, consecutive batches, both mine, both caught by the review: 247 cited the chunked-manifest argument at sites where `setProduct` is the N=1 wrapper; 248 cited a comment saying the opposite from eleven lines up.
**An exemption with no comment invites the next reader to check it. One with a citation closes the question**, because the citation reads as the checking already having been done. The tell is the phrasing itself - "for the same reason as X", "the pattern above", "as `foo` already does" - and the rule is to state X's precondition and check it, or admit you are borrowing authority rather than reasoning.

## New docs/QUEUE.md items

None. Item 22 is deleted from `docs/QUEUE.md` and struck in the consolidated backlog with what was done differently and why.
The UX **U38** note asking for the column to be HIDDEN until item 22 gave it values is resolved differently and says so: hiding it would have removed a true reading because its label was wrong.
Item **90** gains a pointer - the import's confirmed count is its work, and this batch's `attempted` counts are the placeholder.

## New docs/PHONE.md items

None.

## Probe

**What did the item tell you to do that you would have done differently?**
**One of its three requirements contradicts a Tier 1 rule, and the rule won.**
It asked for the invoice event *"so the Dashboard's since-line and Recent changes can show it"*. `sinceLineHtml` reads `lastChangeEntry`, which picks the newest entry carrying avgBefore/avgAfter - so an invoice with those figures becomes "your last change" and resets the "since you last acted" clock every time a supplier raises a price, which is the exact event the drift counter exists to accumulate. `CLAUDE.md` calls that self-defeating in as many words.
The entry therefore carries no figures. It is still a record, which is what the item actually MEASURED as missing - the item's reason was wrong and its defect was real, which is this project's most common shape.

Also its first requirement offered two fixes and I took the second. Making "Last change" reflect any route needs a per-ingredient cost series that does not exist, and inventing one to answer a column header would be a sixth series against a rule that keeps five apart.

**What did you not propose because it was out of scope?**
The confirmed count for an import, which needs `dbPushIngredients`' saved manifest threaded out of `applyInvoice`. It is item 90's and doing it here would have pulled the completion message in with it.
Also `applyInvoice` is still not a mutation target, which the item asked for. It is a very large function and adding it without first doing the work would produce a list of allowances that reads as coverage - the `gemApplyReadings` precedent. Not filed as new, because `docs/MAINTENANCE.md` already carries the "more functions on the gate" entry.

## Surprises

**The review has now found the batch's own defect four batches running** (244, 245, 247, 248), and three of those four were **exemptions I wrote a justification for**.
That is why this one produced a rule rather than another fix: the pattern is not "I missed a case", it is "I explained why the case did not apply, and the explanation was the thing that was wrong". A silent gap gets checked by the next reader. An argued one does not.

**And a Playwright run was discarded for the second batch running**, same cause: launched in the background, then edited under while the review findings were applied. Stopped rather than reported.
The fix is an ordering one and it is now written into how this batch ran - **commit first, run second** - which is what produced the numbers in the review artifact.
