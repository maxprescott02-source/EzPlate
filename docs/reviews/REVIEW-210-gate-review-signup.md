# REVIEW-210 — gate review before public signup

Reviewed-commit: 925e144
**Agent:** `code-review`, run on **Sonnet** against a batch running on **Opus 5**, on the branch diff, without the queue item.
**Outcome:** three findings. **Two fixed in this branch, one recorded as a reasoned non-defect** (the agent explicitly declined to raise it as one).

⚠️ The findings below are the agent's own words, pasted rather than summarised. My decision on each follows under **Taken**.

---

## Finding 1 — `verifyCaller`'s own network call has no timeout

> **`verifyCaller`'s own network call has no timeout — the one outbound fetch in the whole gate that isn't bounded.** `api/_auth.js:96-101`
>
> No `AbortController`/timeout is attached. Contrast with `callGemini` in both `api/parse-invoice.js` and `api/insight.js`, which explicitly wrap their fetch in an `AbortController` + `setTimeout(...GEMINI_TIMEOUT_MS)` specifically so a slow upstream degrades to a clean `unavailable` JSON rather than hanging — and contrast with the client's own `apiAuthHeaders()` in `js/app.js`, whose entire block comment argues at length that a promise which never settles is this repo's most-recorded defect class and bounds itself with a `Promise.race` against a 5s timer for exactly that reason. The server-side twin of that same network call has no such bound. If Supabase's `/auth/v1/user` is slow or unresponsive (not erroring — hanging), the `await` blocks for as long as the platform allows, instead of returning the clean 200 `unavailable` both files otherwise guarantee on every failure path.
>
> The practical blast radius is partly contained by the client's own independent 20s `ctrl.abort()` in `gemFireSecondReader`/`gemPhraseInsights`, which bounds what the *browser* waits regardless of server behavior — so this isn't a spinner-forever bug for the user. But it is a genuine gap relative to the file's own stated contract ("never throws, never rejects" — never mentions never hangs) and to the standing project rule about unresolved promises, it leaves a Vercel function running (and billable) indefinitely on a degraded upstream, and it is untested: `tests/api-auth.test.js` tests a `verifyCaller` fetch that *throws*, never one that *never resolves* — the one shape the client-side sibling test explicitly exercises (`'apiAuthHeaders always settles, on a bounded wait'`).
>
> Confidence: high on the mechanism (verified directly in source — no signal/timeout anywhere in `verifyCaller`); moderate on real-world frequency (requires a genuine Supabase-reachable-but-slow condition rather than a fast network error).

**Taken: correct, and FIXED.** The criticism lands hardest because the file's own header lectures about exactly this class and then does not apply it. `verifyCaller` now carries an `AbortController` bounded at `VERIFY_TIMEOUT_MS = 3000`, with the abort landing on the same fail-closed `verify-failed` branch as a throw, and a `finally` clearing the timer.

⚠️ **The test written for it could not fail, and that is worth more than the fix.** The first version asserted only the outcome, using a fake fetch that read `opts.signal.addEventListener`. Delete the signal and that read throws, the throw is caught by the same `try/catch`, and the result is `verify-failed` again — green for the opposite reason. Roster entry 205's shape, inside a test written to close a review finding. It is now two tests: one asserts the signal is handed over at all (fails instantly if it is removed), one asserts a hanging call settles AND that `signal.aborted` became true. Both confirmed red by re-deleting the signal.

## Finding 2 — the client's 20s budget no longer contains the server's work

> **Sequencing: the 20s client-side abort/`guard` timers in `gemFireSecondReader` start counting before `apiAuthHeaders()` resolves, so a slow token lookup eats directly into the budget meant for the network round trip + server's own 15s Gemini budget.** `js/app.js:10447-10461` vs `10472`
>
> `timer` and `guard` are both `setTimeout(..., 20000)` registered at function entry (t=0), unchanged by this diff. The actual `fetch('/api/parse-invoice', ...)` call is now deferred behind `apiAuthHeaders()`, which — per its own doc comment — can legitimately take up to 5000ms in the worst case (its `Promise.race` bound) before the request is even issued. Previously the full ~20s client budget applied to the network round trip against a 15s server-side `GEMINI_TIMEOUT_MS`, leaving several seconds of margin for transit and processing overhead. Now, in a case where token refresh takes close to the full 5s bound (e.g. a real but slow refresh, not just a hang) and the server then uses close to its full 15s Gemini budget plus `verifyCaller`'s own added ~100ms+ round trip to Supabase, the remaining client-side window before `ctrl.abort()` fires can shrink to near zero — a request that would previously have completed in time can now be client-aborted mid-flight, silently degrading a working AI reading to "unavailable." This is a real, if narrow, regression in the timing contract between the two independently-tuned budgets (client 20s / server 15s), and it is not exercised by any test: `tests/invoice-gate.test.js`'s fake harness deliberately uses `SUPA=null` so `apiAuthHeaders()` resolves on a bare microtask with no real timer registered (its own comment says so), which sidesteps exactly the worst-case timing this finding is about.
>
> Confidence: high on the mechanism (timers start before the fetch is dispatched, verified in source and in the test harness's own faithful reproduction of that ordering); moderate on how often it would actually manifest, since it requires several near-worst-case latencies to stack.

**Taken: correct, and FIXED.** The failure it describes is the invisible kind — a reading the server genuinely produced, discarded by the caller a moment before it arrived, presenting as the ordinary "unavailable". Neither number was wrong on its own, which is why nothing could see it.

The budget now adds up and is written out in `api/_auth.js`'s header: **3s token + 3s verification + 15s Gemini = 21s, inside a 22s client abort.** Three changes: `apiAuthHeaders`' bound 5s → 3s, the two client watchdogs 20s → 22s via one shared `AI_CALL_BUDGET_MS` so they cannot drift, and `VERIFY_TIMEOUT_MS` at 3s from finding 1.

**The arithmetic is now an assertion**, not a comment: `tests/api-auth.test.js` reads all four constants out of the shipped sources and fails if the server-side worst case stops fitting inside the client abort. Confirmed red by putting the budget back to 20000. Two tests in `tests/invoice-gate.test.js` that had hard-coded `19000`/`21000` now derive their ticks from the constant — one of them had already gone red, having been left asserting a timeout that no longer happened.

## Finding 3 — a legitimate caller on a slow connection can be silently refused

> **(Minor/by-design, noted for completeness) A legitimate signed-in caller on a slow connection can be silently refused.** If `SUPA.auth.getSession()` needs to refresh over a slow network and takes longer than `apiAuthHeaders()`'s 5000ms bound, the request is sent with no `Authorization` header and the server 401s it — a real, valid session gets treated as absent. This is explicitly reasoned about at the site (`js/app.js:769` block comment) as a deliberate consequence trade-off, and CLAUDE.md's own precedent endorses fail-closed defaults being about consequence not epistemics — but it's worth flagging given the project's stated design center is exactly "an occasional user on mobile data" whose fetches are slow rather than absent. Not raising this as a defect, since it's documented and reasoned, but it is a real behavior change that degrades the AI second reader with no visible reason to the user beyond the ordinary "unavailable" state it already has for every other failure.

**Taken: accepted as reasoned, and NOT fixed — but the fix for finding 2 makes it slightly more likely, so the decision is recorded rather than inherited.** The bound moved from 5s to 3s, which is the opposite direction from what this finding would want.

That is the right trade and here is why. The refresh only happens when the token is over an hour old, and it is one small HTTPS call; a connection on which it takes more than three seconds is a connection on which the 15s Gemini call is already in trouble. The outcome is "unavailable" — a first-class state this feature has for every other failure, changing no data and costing an optional second opinion. And the alternative is worse in the same scenario: a longer bound does not make the call succeed, it just spends the request's own budget waiting, which is finding 2 again.

## Everything else

> No other issues found. The gate's core logic (`bearerToken`, `userIsUsable`, fail-closed defaults, gate-before-body-read ordering, the fallback-config duplication guard, cache-version bump across all six spots, the absence of duplicate top-level declarations, and the test updates in `tests/invoice-gate.test.js` / `tests/settings-toggles.test.js` / `tests/smoke.js`) are correctly implemented and the added flushes make the assertions strictly *more* precise, not vacuous — each new/changed assertion was checked against what happens if the gate or guard it pins is removed or inverted, and each would fail.
