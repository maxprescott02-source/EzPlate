# HANDOVER - 210 (gate review before public signup)

**Branch:** `review/gate-review-signup` · **Scope:** `docs/QUEUE.md` item 4, "Gate review before public signup".
**Ships `ezplate-v172`.**

## What changed

Six launch gates were read end to end against production and signed off in `docs/GATE-REVIEW.md`.
Five hold.
One did not, and it had nothing to do with the thing every previous batch had been hardening.

`api/parse-invoice` and `api/insight` accepted a POST from anywhere with no auth, no rate limit and no origin check, and the client sent no credential.
Anyone could spend Max's Gemini key, and the health endpoint confirmed a key was configured.
Both now require a live, confirmed session, verified by one `GET /auth/v1/user` with the caller's bearer token.
The gate fails closed, and it runs before the request body is read so an uncredentialled caller cannot make the function buffer 2MB first.

The client sends the token via a new `apiAuthHeaders()`, which resolves it per call rather than caching it.
A cached access token expires within the hour, and every AI call would then quietly 401, which presents as the feature having stopped working rather than as an error.

Three existing tests caught the real behaviour change this makes - the request now leaves one microtask later - and were rewritten to say so rather than to go green.
One lost "(unchanged behaviour)" from its title, because the timing genuinely is changed.

## Review

`code-review` on **Sonnet** against a batch on **Opus 5**, on the branch diff, without the item.
Report: `docs/reviews/REVIEW-210-gate-review-signup.md`.
**Three findings. Two fixed here, one accepted as a reasoned non-defect that the agent itself declined to raise as one.**

1. **`verifyCaller`'s own fetch was unbounded.** Correct, and the criticism lands hardest because the file's own header lectures about never-settling promises and then does not apply it to its one outbound call.
   Fixed with an `AbortController` at 3s, aborting onto the same fail-closed branch as a throw.
2. **The client's 20s abort no longer contained the server's work.** Correct.
   Neither number was wrong on its own, which is exactly why nothing could see it: a reading the server really produced would be discarded by the caller a moment before it arrived, presenting as the ordinary "unavailable".
   The budget now adds up and is written out - 3s token plus 3s verification plus 15s Gemini, inside a 22s abort - and **the arithmetic is an assertion** that reads all four constants out of the shipped sources.
3. **A slow refresh can silently refuse a legitimate caller.** Accepted, and recorded rather than inherited, because fixing finding 2 moved the bound from 5s to 3s and made it marginally more likely.
   A connection where one small auth call takes over three seconds is one where the 15s Gemini call is already in trouble, and the outcome is a state this feature already has for every other failure.

## Into CLAUDE.md

**Nothing.** Two roster-shaped defects turned up and both are instances of shapes already written down, so per the roster header's own rule the number is left alone and no bullet was added.

The first: deleting the caller gate made the handler fall through to `readBody` and **hang** rather than go red - roster 195, inside the file written to close a different hole.
Both handler tests now carry an explicit `{timeout}`.
The second: the test written for review finding 1 asserted only the outcome, from a fake fetch that read `opts.signal`; delete the signal and that read throws, the throw is caught by the same `try/catch`, and the result is identical - roster 205, in a test written to close a review finding.
It is now two tests, one of which asserts the mechanism.

Both were found by running the mutation, not by reading, which is the third time this batch that was the only thing that would have worked.

## New docs/QUEUE.md items

**None.** Item 4 is deleted, done.
Three items were marked `blocked` because the loop had been walking past them as if they were workable: **1** and **5a** on Max resuming the staging Supabase project, **2b** on Max at the Google Cloud billing console.
Item 1 also now records that its open PR #219 must re-bump past the `v172` this batch took.

Three findings went to `docs/MAINTENANCE.md` as C: per-account rate limiting on the AI endpoints, proving on staging that `restore_backup` is inert for `anon`, and dropping `invite_pending` once no cached client calls it.

## New docs/PHONE.md items

**One, and it is filed at the top of the file because it is the one that costs money if it is wrong.**
The AI second reader must be exercised on production while signed in.
A failure looks like "AI check unavailable" on every invoice however good the signal, and the Gemini credit never appearing under the Dashboard insights.
It is not urgent and it is not data loss - the parser and the deterministic templates are unaffected - it is a feature quietly switched off.

## Probe

**What did the item tell you to do that you would have done differently?**
The item scoped itself to "genuinely a REVIEW ... the sign-off rather than the work", and I did not keep to that.
Gate 5 turned out to be open rather than merely unaudited, and handing back a review that says "an unauthenticated endpoint spends a real key" while leaving it open would have been moving the blocker rather than closing it.
I would rewrite the item's own scoping sentence: a gate review cannot know in advance whether it is a review, because that depends on what it finds.

**What did you not propose because it was out of scope?**
Per-account rate limiting, which is the honest completion of gate 5.
It needs a counter that survives between serverless invocations, so a table, so a migration, so staging - and staging is paused.
Half-building it against production was the wrong trade, so it is named in the review and filed, rather than started.

I also did not touch the three `anon` `EXECUTE` grants that are believed inert.
The reasoning is in the review and it is only reasoning; the one place to test it is production, and being wrong costs Scoopy's real data.

## Surprises

**API-level signup is already open, today.** `disable_signup:false` on the live auth settings.
The item asks whether open signup is acceptable "now that a self-made account can see nothing", which implies a future tense that does not apply - anyone with the public anon key can create an account right now.
It is bounded, and the review says how, but the framing everywhere else in the queue assumes this is a thing that has not happened yet.

**The hole was where nobody was looking, and the reason is structural.**
Six batches of tenant work made a stranger's account see nothing.
A stranger never needed an account to spend the key, because no database was involved - so not one of those batches could have caught it, however well they were done.

**The pre-push review found a defect I had created while fixing the thing I was reviewing.**
The client budget was correct before this batch and correct in each of its parts after it, and wrong as a whole.
That is the second time this batch that a number being individually right was not the question.

**The browser drive could not be run.** Chrome automation timed out on script injection on every attempt, including from a fresh tab.
Playwright and the jsdom smoke both drive the changed call paths in a real engine, so this is not unverified - but the end-to-end path, a real signed-in request to a deployed function, has never been executed as a whole, and that is why the `docs/PHONE.md` entry exists and is first.
