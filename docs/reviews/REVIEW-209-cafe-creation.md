# REVIEW — 209 (a stranger can create a café)

Reviewed-commit: ff379e141baa31762cb413f46b750ac2d821c82e

**Agent:** `code-review`, run on Sonnet against a batch running on Opus 5.
**Given:** the branch diff (`git diff main...HEAD`) and the repo. **Not given:** the queue item, the
plan, or any statement of intent — which is what makes it a judgement about whether the code is
correct rather than about whether it matches an instruction.

**One finding, critical, plus its companion about why no test could catch it. Both real, both
fixed.** Pasted verbatim below.

---

## The report, verbatim

> ## Findings
>
> **1. Critical — the "shown once, never reset" guard on the new café-creation form is always true, so every re-render of the `nomember` boot-gate state wipes the visible error and steals focus, contradicting the code's own stated contract.**
>
> `js/app.js`, `bootGate()`, `state==='nomember'` branch:
>
> ```js
> if(r) r.hidden=true; hideForms(); if(bd) bd.hidden=true;
> ...
> if(cf && cf.hidden){
>   cf.hidden=false;
>   gateErr('');
>   var ci=document.getElementById('bgCafeName');
>   if(ci && typeof ci.focus==='function'){ try{ ci.focus(); }catch(e){} }
> }
> if(cn) cn.hidden=false;
> ```
> (`js/app.js:688-703`)
>
> `hideForms()` (defined at `js/app.js:601-606`) unconditionally sets `cf.hidden=true` a few lines *above* the `if(cf && cf.hidden)` check, in the same synchronous call. So the guard can never observe "already shown" — it is trivially true on every single invocation of the `nomember` state, not just the first. The accompanying comment says the opposite is intended: *"SHOWN, NEVER RESET... clearing the value or re-focusing would empty or interrupt a half-typed café name... The error line is cleared only on the transition."*
>
> Compare the analogous, correctly-written `signin` block three states up (`js/app.js:653-676`), which deliberately does **not** call `hideForms()` before checking `f.hidden`, so that guard genuinely distinguishes first-entry from re-entry. The `nomember` branch calls `hideForms()` (needed to hide the *other* forms) and then reuses the same flag it just clobbered as its own "first time" signal — the wrong condition.
>
> **What breaks, concretely:** `bootGate('nomember', …)` runs again on every re-sync that lands there (an `online` event, a pull-to-refresh — this is explicitly the scenario the code's own comments describe). If a user has just been refused by the server (e.g. `gateErr('Couldn't set up your café…')` or the client-side "too long"/"enter a name" refusal from `wireGateCreateCafe`) and any such re-sync fires before they resubmit, the error message is silently wiped (`gateErr('')` hides `#bgErr`) and focus is yanked back onto `#bgCafeName`, every single time, regardless of whether the form was already showing.
>
> **Verified**, not just reasoned: extracted the real `bootGate` via `tests/_extractfn` and drove it through `loading → nomember → nomember` with a DOM stub that (unlike the shipped `tests/boot-gate.test.js`, whose node list never includes `bgCafeForm`/`bgCafeNote`/`bgCafeName` at all) actually wires up the café-form elements:
>
> ```
> after 1st nomember: bgCafeName.focuses = 1  bgErr.hidden = true
> after 2nd nomember (re-sync): bgCafeName.focuses = 2  bgErr.hidden = true  bgErr.textContent = ""
> ```
> An error that was showing before the second call ("That name is too long") is gone after it, and focus was stolen a second time.
>
> **5. Related — no test can catch this.** `tests/boot-gate.test.js`'s `makeGate()` DOM stub (unchanged by this diff) never includes `bgCafeForm`/`bgCafeNote`/`bgCafeName`, so `cf`/`cn` are always `null` in that entire file and the whole branch is exercised only for "does not throw." The one behavioural test that does cover this in Playwright, `tests/visual/209-cafe.spec.js`'s `'a re-sync does NOT empty a half-typed café name'` (lines 199-212), only asserts `#bgCafeName` still `toHaveValue('Half typed na')` after an `online` re-sync — which is true regardless of this bug, since `.focus()` doesn't touch `.value`. It does not check focus or `#bgErr`, so it is a test that cannot fail against the actual defect its own title claims to pin ("SHOWN, NEVER RESET").
>
> Confidence in the mechanism: high — verified by extracting and running the real function, not by reading.
>
> ---
>
> Everything else I checked holds up:
> - The migration (`supabase/migrations/20260827_cafe_creation.sql`) and its mirror in `supabase/staging/01-schema.sql` are byte-identical in the function body (confirmed via diff), additive-only, correctly gate on `auth.uid()`, email confirmation, the advisory lock precedes the membership read, the early-return for an existing member sits above both inserts, and the owner assertion uses `is distinct from` rather than `<>`.
> - `anon` is not granted execute; `authenticated`/`service_role` are.
> - The six cache-version spots (`index.html` ×2, `sw.js` `CACHE` + both `ASSETS` entries, `js/app.js` `APP_VERSION`) all agree at v172.
> - No duplicate top-level declarations were introduced (`tests/housekeeping.test.js` passes; checked by hand for the new names too).
> - `createBusinessState`/`cafeNameClean`/`cafeNameProblem` follow the three-answer discipline correctly and are on the mutation-gate target list; `authCreateBusiness` correctly checks `SUPA`/`SUPA.rpc` before use and never throws.
> - The dead invitation-gate removal (`authSignUpGated`, `authInvitePending`) is handled correctly: `invite_pending` is deliberately left deployed and un-called rather than dropped, per the project's stated ordering rule, and its test coverage was rewritten rather than just deleted.
> - Full suite is green (1592/1592) — as expected, since the bug above isn't exercised by any test.
>
> Files relevant to the finding: `js/app.js` (lines 592-606, 683-704, esp. 688 vs. 698), `tests/boot-gate.test.js` (lines 38-50), `tests/visual/209-cafe.spec.js` (lines 199-212).

---

## What was done about it

**Finding 1 — FIXED.** The flag is now read at the top of `bootGate`, before any branch can call
`hideForms`, as `cfWasUp`. The form is unhidden unconditionally (it was just hidden, one line up);
only the two things that disturb somebody mid-sentence — clearing the error line and taking the
caret — are conditional on the transition.

The finding is correct in every particular and its mechanism is exact. It is worth recording *why it
was invisible*: the guard is a character-for-character match for the correct one three states above
it, and the difference is not in the guard at all but in whether `hideForms` ran first. **A "have I
already painted this?" test must read state the paint has not touched yet** — reusing the flag the
paint SETS turns the test into a statement about this call rather than about the last one, and it is
silent, because the first call still behaves. That note is now at the site.

**Finding 5 — FIXED, and it is the half that mattered more.** Three things changed:

- `tests/boot-gate.test.js`'s `makeGate()` stub gains `bgCafeForm`, `bgCafeNote` and `bgCafeName`,
  the last with a focus counter. Their absence meant `cf` and `cn` were `null` in **every test in
  that file**, so the whole branch ran for "does not throw" and nothing else.
- Two new cases there: a re-sync must not take the caret twice or clear a standing refusal, and a
  genuine re-entry must still focus on arrival. The second exists because "never focus twice" and
  "focus on arrival" are different rules, and a one-way latch would satisfy the first while failing
  the second.
- The Playwright case was renamed and rewritten. Its old title claimed to pin "SHOWN, NEVER RESET"
  and asserted only `toHaveValue`, which `.focus()` does not touch — **roster 205's shape exactly, a
  title naming a property the assertions cannot see.** It now checks the value, `document.activeElement`
  and `#bgErr`.

**Proved rather than believed.** The defect was reinstated verbatim in `js/app.js` (backed up by
`cp`, never `git checkout --`) and the suite re-run: the re-sync case goes **red**, and the re-entry
case correctly stays green, since that path was never broken. Restored and re-verified afterwards.

Nothing was declined. Suite 1592 → **1595**, green; `mutate:changed` 26 mutants, 26 killed;
Playwright 10/10 on this spec and 367 across the run.
