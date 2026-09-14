---
paths:
  - "js/app.js"
  - "index.html"
  - "tests/**"
---

# Client guards - the conditions that read as correct and are not

Loaded whenever `js/app.js`, `index.html` or anything under `tests/` is read. Every section is one incident that shipped.

⚠️ **`tests/**` is on that list because the pre-push review of the split caught the rule below going out of reach.** *"A comment can record the defect CORRECTLY and file it under the wrong consequence"* was scoped to the client files, and **two of its five worked examples (212, 226) happened in Playwright specs** - so a batch editing only a spec, which is the exact context that produced them, would never have been shown it. The fix is the scope, not the text.

**Moved out of `CLAUDE.md` verbatim by batch 264** so it loads with the file it protects instead of on every turn of every session. The rule in `CLAUDE.md` is the one-line version; this is the evidence.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, another file in `.claude/rules/`, or `docs/rules/process.md`. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## A duplicate definition is never "dead until reached"

`aRow` and `renderAnalysis` were each defined twice at top level in one scope, and **hoisting makes the LAST definition win everywhere**, before any statement runs.
Editing the first was a silent no-op that shipped real bugs.

Both dead copies are gone and `tests/housekeeping.test.js` now fails if any top-level name in `js/app.js` — `function`, `var`, `let` or `const` — is declared twice again.

⚠️ **THAT SAID "any top-level NAME" until 23 Aug 2026 and it was true of the PROSE and not of the TEST, which covered `function` only — which is half the class, and the half that was live.** Both halves were fixed in batch 200: `tests/housekeeping.test.js` now matches `var`/`let`/`const` as well, and the `var catState` collision it could not see is gone (the Add-to-menu combobox's is `catCombo`; the catalogue importer's kept the name).
**The mechanism is worth keeping even though the instance is fixed, because the `var` form is worse than the `function` form rather than better:** both declarations hoist, and then **both ASSIGNMENTS run in source order, so the LAST one wins at boot** and the first object is discarded before any handler fires. Two functions at least leave one consistent answer; two `var`s build something and throw it away.
**The transferable part is about the GUARD, not the collision: a test that pins a rule for one declaration keyword has pinned the rule for one declaration keyword.** It sat under that guard for months and was found by a pre-push review that had been asked to look for state leaking between two unrelated flows. Widening the regex and renaming one variable are ONE job, in that order, because widening alone goes red immediately — and the widened arm is now exercised against injected source, because a guard nobody has watched fail is this repo's most-recorded defect.
**Scope, stated at the test:** the `^` anchor compares TOP-LEVEL declarations only. A nested shadow is legal JavaScript and is deliberately not flagged.

## An exemption granted for one property applies to EVERY property the same path writes

(QUEUE 0b, batch 200. Found by a blind code audit; the exemption was four years of correct reasoning about the wrong scope.)

`resolveMatchedPrice` exempts a **taught** pack — the product's own `pack_qty`/`pack_unit`, or supplier memory — from its unit-mismatch guard, and says so at its own site: *"a pack the user taught is the truth"*. That is right, and it is right about **PRICE**: a pack the user typed outranks a parser's guess at what the line means.
It says nothing about UNIT. But `applyInvoice` wrote the row's unit straight into `base_unit` on the same line as the price, so the exemption silently covered both. Teach a product stored per gram as "6 ea" and a 200g plate line costs **$2166.67 instead of $1.30** — with `unitMismatch:false` and `needManual:false`, so the row was **pre-ticked and applied with no prompt**.
⚠️ **The loud version is the safe one, and this is the general shape rather than a detail of this bug.** The dangerous case is `ml` vs `g`: teach a `kg` pack on a product stored in `ml`, `base_unit` flips `ml → g`, and a plate line reading `250` (meaning 250 mL) is costed as 250 g. **The magnitude stays plausible and nothing on any screen can notice.** When you widen a guard, ask which of the cases it now catches would have been INVISIBLE, and write the test for that one.

**The transferable rule: an exemption is scoped to the CLAIM that justified it, and code is scoped to the WRITE.** When you find one — a `!taught &&`, an `if(trusted)`, an allowlist that skips validation — do not ask "is this exemption correct?" Ask **"what else does the path this unblocks go on to write?"** Here the honest answer was "a second column, about a different thing, that nobody had thought about since."

**And where the fix goes when the exempting function is untouchable.** `resolveMatchedPrice` was, at the time, inside the protected parser region AND on the never-touch list, so the guard could not live where the exemption does. *(The protection was lifted on 10 Sep 2026 - see the parser-region section below - so the constraint that forced this shape is gone. **The shape is still right, and for a better reason than the prohibition ever was**, which is why the paragraph stands rather than being rewritten as history.)* It went on the ROW instead — one function (`invUnitRebase`) read by the state machine, the renderer and the write, so the three cannot disagree.
**The load-bearing detail is that the guard and the write call the SAME function to decide which unit gets stored** (`invPriceUnit`). A guard that recomputes the write's answer is a stub of it, which is this file's most-recorded defect one level up: it agrees with the code whenever the code is wrong. **If you add a guard in front of a write you cannot move, extract the decision the write makes and have both call it.**

## `isFinite('')` is TRUE

`Number('')` is `0`, and so is `Number(null)`.
So a blank field passes an `isFinite` guard and fabricates a `$0.00` observation in the price history.

**Guard with `typeof x === 'number'` first, then `isFinite`.** The null check is separate from the finite check on purpose - do not merge them.
`tests/price-log-paths.test.js` pins it.

## `min`, `max` and `required` ARE INERT on every input this app reads, and they read exactly like the check

(Batch 245, 9 Sep 2026, QUEUE item 19. Measured in Chromium, not reasoned: the browser had already decided the value was out of range and nothing asked it.)

**An HTML validation attribute only does something at native form submission or on a `checkValidity()`/`:invalid` that somebody wrote.** This app submits no form — every field is read by a handler on `oninput` or `change` — so `min="0"` on a number input constrains the **spinner arrows** and nothing else. Type a negative, or paste one, and the handler is called with it.

The measured instance: the builder's misc-cost field carried `min="0"`, `setMiscCost` was `parseFloat(v)||0` with no sign guard, and a typed `-2` put a $0.92 plate at **$-1.08** — in the builder, in the save, and in the Plates library. On that keystroke `input.validity.rangeUnderflow` was **true**. The browser knew. The attribute was not wrong and it was not enforcement.

**The tell: a numeric input whose handler reads `this.value` directly.** The attribute is the first thing a reader's eye lands on, it states the exact rule, and it makes the missing guard look like a duplicate rather than an absence — which is why this survived next to two siblings on the same screen that both guard (`setQty` clamps, `commitPrice` refuses `v<0`).

**Keep the attribute and add the guard; do not choose.** The attribute is what makes the spinner behave and what a paste into a real form would be checked against; the handler is what actually holds. Deleting either while keeping the other is how this happened.
⚠️ **And the count is not the reassuring part.** `grep -n 'type="number"' index.html js/app.js` returns fifteen, fourteen of them declaring `min="0"`, and **four have been checked**. The rest are filed in `docs/MAINTENANCE.md` with the instruction to reproduce one at a time rather than clamp them all on sight — a blanket clamp would hide which of them was ever reachable, and three of them sit next to the invoice items that are still deciding what a negative line MEANS.

**The general shape, which is this file's oldest rule wearing a new costume: a declaration is not an enforcement.** `[hidden]` losing to an author `display` rule is the same sentence in CSS, and a `revoke … from public` that does not name `anon` is the same sentence in SQL. In all three the artefact states the rule correctly and something else decides.

## "Fail open" is what you do with NO information — reusing it as the answer to a RECHECK reopens the hole

(Batch 185, 14 Aug 2026, the non-member boot gate. Caught by the pre-push review, after the fix for one half of it created the other half.)

A guard that refuses on a definite answer and proceeds on anything else is usually right the FIRST time it runs: with nothing known, a false alarm is worse than a miss, and here it would have locked a legitimate user out of a working app.
**It is wrong the SECOND time, and the wrongness is invisible, because the same expression is still sitting there reading correctly.**
Once the server has already said *"this caller has no café"*, `could not tell` is **not evidence to the contrary** — but a two-valued gate has nowhere to put that, so it lands on the permissive branch and DISCARDS the known state.

The measured shape: from the standing gate, the `online` listener re-runs `bootstrapSync`; the tenant lookup alone fails, one flaky request out of twelve; the check falls open; **the four required reads still succeed with `[]`, because RLS filters rows rather than erroring**, so nothing throws, every store is emptied and the success path hides the gate.
A silent empty app, reached by a network blip, on the exact path the guard was hardened for.

**The remedy is a THIRD value.** `ok` / `nomember` / **`unknown`**, resolved by the caller against what it already knows: only a definite answer may change the standing verdict, and "could not tell" changes nothing in either direction.
**The tell to recognise: a boolean guard whose two branches are "definitely bad" and "everything else".** Ask what it should do when it is asked a second time, by a caller that already has an answer — and if the honest reply is "keep what I had", the guard needs the third value, not a better default.
This is the same family as the empty-read ambiguity above: **a successful-but-empty read, an RLS-blocked read and a failed read are three different things that arrive looking like two.**

**And the counterweight, or the rule above becomes a tax on every unknown** (batch 186, the sign-in gate). A second unreadable answer landed one line away from the first — `getSession` failing while the tenant lookup succeeded — and it is deliberately collapsed to two values, which is not an inconsistency.
**The question to ask is not "are there three states" but "does either branch do something I cannot take back?"** The tenant answer decides whether the app is USABLE, so guessing it wrongly locks someone out or shows them an empty café: three values, and the caller resolves the third. The session answer decides only **which of two screens explains a refusal that has already been decided** — a sign-in form or a "your account has no café" message — and both are recoverable in one tap, so the safer of the two is simply chosen and the third value would be ceremony.
**So: a fail-open default is a decision about CONSEQUENCE, not about epistemics.** Two unknowns in the same function can honestly default in opposite directions, and the comment at each site has to say which consequence it was weighing — otherwise the next reader "fixes" the inconsistency.

## Gating the last committing action is not a gate

The invoice review does not render at all until the AI referee answers, because a match picked, an add-new ticked or a pack taught during the window makes `gemApplyReadings` skip that row - the referee then defers to a ruling made without it.
Disabling the final confirm would not have helped.

`invConfirmState` is the pure decision.
**The watchdog MUST bump `gemToken`**, or a late response is still merged.

## An optimistic write that changes a FIGURE owes a rollback - and the wait it avoids may not exist

(Max, 10 Sep 2026: *"dont make them wait"*, closing QUEUE item 90's last part.)

**The decision: an applied invoice does NOT hold its dialog open while the writes settle.** The list closes immediately and the honest count - *"4 of 36 price writes saved"* - arrives when the server answers. A refused row is therefore NOT left on screen with its own error, and building that is declined rather than deferred.

⚠️ **THE REASON IT IS RECORDED HERE IS THE FIGURE THAT WAS WRONG IN THE FILE FOR A WEEK, NOT THE ANSWER.** Batch 253 wrote at the site, in its handover, and into the queue item that holding the dialog open would cost *"dozens of round trips on cafe mobile data"*. **Measured against the code rather than reasoned: `applyInvoice` already awaits those writes before it says anything, and they are dispatched in parallel** - so the cost is the slowest of N, not N in sequence, and it is bounded either way. The choice never added waiting. It only decided whether the user is BLOCKED during a wait that already happens.

**So the transferable rule is about how a trade-off gets written down, not about invoices: a cost stated in a comment is a claim, and the next person to read it will price the decision off it without re-measuring.** Here the inflated figure would have made the answer look obvious in the direction it happened to go, which is the worst case - it agrees with the outcome, so nothing prompts anyone to check it. **When you defer a decision to someone else, measure the cost you are handing them.** He was asked on the corrected terms and still said no, which is a stronger answer than the old framing could have produced.

## "The server refuses it anyway" is true of an ACTION and false of a VALUE

(Batch 244, 9 Sep 2026, the food-cost target. Reproduced before it was fixed: a $6 dish reading **$20** against a 30% the server had rejected, where the honest answer is $15.)

**A permissive client-side guess costs nothing when the thing being guessed at is permission to DO something**, because the server's refusal means nothing happened. That argument is written into this app in several places and it is right in all of them but one. The role default says it in as many words — *"guessing owner shows a control that then fails honestly, with the server's own words in a toast"* — and three of the four controls it excuses are actions: delete a plate, delete a menu, restore a backup.

**The fourth was a NUMBER, and setting a number has already changed what the user reads before the server is asked.** `setCogs` moved `cogsPct` — which every suggested price and every good/bad colour in the app is divided by — then sent the write unawaited with its promise discarded. The refusal arrived as a toast over a screen that had already recomputed, and a reload silently "fixed" it, so nothing was left to notice.

**So: an optimistic write that changes a FIGURE owes a rollback; one that performs an ACTION does not.** The tell is a guard, a comment or a review finding that excuses a permissive client default with *"the server refuses it either way"* — go and ask what the client did BEFORE it asked, and if the answer is "showed a number", the refusal is only half the story.

**Two details of the remedy that generalise past this one number:**
- **Roll back to the last value the server CONFIRMED, not to the value before this call.** They are different the moment a control can write twice before the first answer lands, and the confirmed one is correct in either settle order. It is a second variable (`cogsServer` here), it belongs to the tenant, and it must be cleared with everything else on a café move.
- **A rollback and a live control fight each other unless the PERSIST is debounced and the repaint is not.** Restoring a field somebody is still typing into is worse than the bug; the split is what makes the rollback safe rather than merely present. Pay the debounce's own cost in the same change — a delay is a window in which the tab can close, so flush on `change`.

Same family as the section below, reached from the other end: there the comment's observation was right and its conclusion wrong; here the conclusion was right about the thing it was written for and was being read about everything the guard touched.

## A justification that CITES A PRECEDENT is a claim that the precedent's CONDITION holds here, and it is never checked

(Batches 247 and 248, 9 Sep 2026. Two consecutive batches, both caught by the pre-push review, both by the same author in the same session — which is what makes it a shape rather than a slip.)

**An exemption with no comment invites the next reader to check it. An exemption justified by naming a rule from elsewhere in the file closes the question**, because the citation reads as the checking already having been done. Both instances below were confident, specific, and wrong in the same way: the cited rule was real, and its condition did not hold at the site.

- **247** left two product-price paths ungated, arguing that *"`setProducts` returns a CHUNKED write whose verdict is a saved manifest rather than a single error"*. True of the catalogue importer, which passes hundreds of entries. **`setProduct` is the N=1 wrapper** — one entry, one chunk, one `pushWrite` — so the verdict is a plain binary error and there was nothing partial to lose. This file already says *"GREP THE PLURAL"* about that exact pair, one section up, for the mirror-image mistake.
- **248** gated an import record on a settings write, arguing it was *"the same reason 247 gates the trend point"*. **The 247 comment ELEVEN LINES ABOVE IT says the opposite** — that this same settings write is not a valid gate because it *"decides nothing about the prices"*. The contradicting sentence was in the same function, on screen, and unmodified by the diff that contradicted it.

**The tell is the citation itself: "for the same reason as X", "the pattern above", "as `foo` already does".** When you write one, the claim you are actually making is *X's precondition is true here* — so state that precondition in the comment and check it. If you cannot say what the precondition is, you are borrowing authority rather than reasoning.
**And read the neighbours.** 248's contradiction was eleven lines away; a citation is exactly the case where the surrounding comments are evidence rather than noise.

⚠️ **This is the same family as "an exemption is scoped to the CLAIM that justified it", pointed at the comment instead of the code** — and it is more dangerous, because that one leaves a silent gap while this one leaves a gap with an argument in front of it. **A wrong justification is worse than none.**

## A comment can record the defect CORRECTLY and file it under the wrong consequence

(Named 2 Sep 2026 by AUDIT-v186 R2, on its third dated instance. Three batches each found one, each correctly declined to add a roster bullet because the roster is about TESTS, and the shape then had no name of its own. **No count in this line on purpose** — it said "third" while the list below it grew to five, which is this file's own most-recorded rot. Count the bullets.)

**The dangerous comment is not the wrong one. It is the one whose first half is exactly right and whose second half draws the wrong conclusion from it** — because the accurate half is what buys the reader's trust, and the conclusion is what they carry away.

- **212** — a spec noted the docket's filter *"creates a containing block but does NOT clip"*. True, and filed under clipping, because the reader was thinking about clipping. The containing block was the bug.
- **225** — a renderer's comment said *"the four figures are never announced"* and concluded *"the label gains nothing here and loses nothing"*. First half right; the `aria-label` it was excusing **was** the cause.
- **226** — a spec said the toast and the install banner overlap each other, that it was pre-existing, and that it was not what that test measured. Every clause true; the result was a test named for a three-way split, green, with a third of the split false.
- **242** — a REVIEW FINDING did it, and the batch nearly copied the disposal into a comment and a test. It correctly found `businessRole` uncleared across a café switch, and gave the consequence as *"owner in A, staff in B, so B's screen offers the owner-only controls"*. **The defect was real; that consequence is unchanged by the fix**, because `unknown` reads as owner by design — so the case comes out `owner` with the fix AND without it. The direction that actually moves is the opposite one (**staff** in A, who then cannot see the controls in a café they own). Written from the finding's words, the comment stated the wrong harm and the test asserted `'owner'` against a fixture where both sides were already `'owner'` — roster **184(b)** — so it **survived the hand-mutation**.
- **244** — the fifth, and the reason the section above it now exists as its own rule. The role default's comment argued that a permissive guess is harmless *"because the server refuses either way, with its own words in a toast"*. Right about the three ACTIONS it was written for and wrong about the fourth control, which sets a NUMBER — so the toast arrived over a screen that had already recomputed every suggested price off a target the server had rejected. **The observation and the conclusion were both true of what the author had in mind, and the conclusion was being read about a wider set than the observation covered**, which is the same failure as an exemption scoped to the claim that justified it.


⚠️ **242 is why this section is not only about comments.** The other three are an author disposing of their own observation; this is an author inheriting somebody else's disposal, which is harder to catch because the finding arrives with the authority of a second reader. **A finding's stated consequence is a fourth separable claim, after the defect, the mechanism and the remedy** — and it is the one that ends up written into the comment and chosen as the test's fixture. The existing rule ("run the finding's own repro, then run its FIX, before you apply it") is what caught it: run it **in both directions**, and if the fix changes nothing in the direction the finding named, you have not found its bug yet.

**The tell: a comment that states an observation and then tells you not to worry about it.** "…but does NOT", "…gains nothing here", "…is not what this measures". The observation is usually load-bearing and the reassurance is usually the author's own frame rather than a finding.
**So read the two halves as separate claims, exactly as this file already requires for a review finding** ("a finding whose stated CAUSE is wrong may still point at a real bug"). Here it is the mirror image: **a note whose OBSERVATION is right may still have disposed of it wrongly.** Go and check what it observed, not what it concluded.
