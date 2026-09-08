# HANDOVER - 238 (a confirmation link lands on the app, and a dead one says so)

**Branch:** `fix/auth-callback-redirect` · **Scope:** reported in chat, not from the queue - Max clicked the Supabase confirmation email for a new account and got `http://localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`.
**Shipped `ezplate-v196`.**

## What changed

**The report was two faults wearing one symptom, and the sign-up itself was never one of them.** `auth.users` settled that before any code was read: the account was created 06:50:05 and `email_confirmed_at` is 06:50:23, so the FIRST click worked perfectly. A confirmation token is single-use, so `otp_expired` came from the second click - and GoTrue returns that one code for "already used" and "genuinely expired" and cannot tell them apart either.

**1. The link pointed at the wrong machine.** `signUp` sent no `emailRedirectTo`, so every confirmation email inherited the project's **Site URL** - still GoTrue's factory default `http://localhost:3000` on the day self-service sign-up shipped as `ezplate-v178`. `authRedirectTo` now names this origin's directory. Computed rather than hardcoded, because a literal would send every local and preview rehearsal's confirmation email to Max's real café; the directory rather than the file, because `/index.html` and `/` must be one allow-list entry rather than two spellings of one place.

**2. A dead link explained nothing.** Nothing read the fragment GoTrue redirects back with, so a stranger reached the plain sign-in gate: a form, where an answer belonged. `captureAuthUrlError` reads it at load, `paintAuthUrlError` puts it on the gate. The copy names both causes and leads with the action, because the measured case is the one a naive message would have got wrong - somebody whose account already works being sent back around the sign-up loop for a second single-use link.

Two properties inside that are load-bearing and neither is obvious:

- **It cleans the hash and NEVER the search.** `index.html` reads `?env=staging` out of `location.search` to choose which Supabase project the app talks to, in the head, above the theme resolver. A tidy-up that rewrote the URL to a bare pathname would silently return a staging session to production on its next boot - the exact accident the staging project exists to prevent.
- **One shot, latched on its own flag rather than on `bgErr`'s state.** `bootGate('signin')` re-enters on every `online` blip and every pull-to-refresh; reading the element to decide whether to paint makes the test a statement about THIS call. That is 209's defect on the branch next door, and here it would replace a live "Invalid login credentials" with a stale complaint about a link the user has already dealt with.

⚠️ **THE CLIENT HALF IS NECESSARY AND NOT SUFFICIENT, AND THE BATCH CANNOT CLOSE THE OTHER HALF.** GoTrue validates `emailRedirectTo` against the project's Redirect URLs allow-list and **silently falls back to the Site URL** when it does not match - no error, no warning, nothing observable from the app. **Max must set, in the Supabase dashboard under Authentication → URL Configuration: Site URL `https://scoopyscosting.vercel.app`, and add `https://scoopyscosting.vercel.app/**` to Redirect URLs.** There is no management token, no CLI and no MCP call in this environment that reaches that page; it was checked rather than assumed. Until it is set, this batch's worst case is exactly the old behaviour, which is what made it safe to ship ahead of the click.

## Review

**Read the reviewer line before the verdict.** The review was launched on **Sonnet 5** per the rule that a model may not review its own work, and it **died mid-run on an API spend limit** (HTTP 429, `req_011CeqkcQRy1e9bUDfo1t8XT`) having produced nothing but an announcement that it was about to start the mutation gate. It was relaunched on **Haiku 4.5**, which completed with **no findings**.

That satisfies the letter of the rule and is honestly **a weaker second reader than this repo normally gets**, on a diff that touches the boot path and the one screen a stranger ever sees. It was also told not to re-run the suite or the gate, so its evidence is reading rather than execution. `docs/reviews/REVIEW-238-auth-callback-redirect.md` leads with all of that rather than letting a clean tick imply more than it earned; `Reviewed-commit: a717d43`.

**The sharper observation is what its report is made of.** Five of its six sections restate a claim the diff's own comments make and agree with it - which is this repo's stub failure ("the copy is written from the same wrong belief as the code") arriving in a review instead of a test. Its one genuinely independent move was following `gateErr` OUT of the diff into unchanged code to confirm the missing-element guard exists. **Both real defects in this batch were found by other means**, and both before the reviewer saw the file.

## Into CLAUDE.md

**One new Tier 1 rule, and it is new because nothing in the file covered a dependency that is not in the repo at all.** The existing rules are about checks that looked at the wrong thing; this one is about a value with nothing to look at. Every artefact a reader can inspect was correct - `signUp` was right, the account was right, the suite was green - and the user still ended up somewhere wrong, because the decision lived in a dashboard field. The rule names that tell and carries the corollary that bit here: a client-side fix for an out-of-repo default is usually necessary and not sufficient, and must say so at its own site.

`docs/MAINTENANCE.md` takes the follow-up: **there is no inventory of these.** Two are now known - the auth URL configuration and `auth_leaked_password_protection` - found separately, years of versions apart, each by something breaking. `docs/GATE-REVIEW.md` (batch 210) reviewed the sign-up gates and missed both, which is the argument for a list rather than for another review: a review reads what is in front of it, and none of this is.

## New docs/QUEUE.md items

None. This arrived from chat and is finished, apart from the dashboard click, which is on Max and is recorded above and in `docs/MAINTENANCE.md`.

## New docs/PHONE.md items

**Re-run the sign-up flow end to end once the Site URL is set** - a fresh address, click the emailed link, confirm it lands on `scoopyscosting.vercel.app` and drops you at the "name your café" screen. That is the only check that proves the half this repo cannot test, and it needs a real inbox.
Also worth one deliberately WRONG click: open the same link a second time and confirm the gate now explains it instead of showing a bare form.
⚠️ **`maxgrailed820@gmail.com` already exists and is confirmed** (created 8 Sep 2026, no café). It can sign in today; it is not a broken account and does not need deleting to test with a fresh one.

## Probe

The chat report framed this as "the sign up flow is broken", and the most useful thing done in the batch was **not believing the error code**. Reading `auth.users` first turned one vague fault into two specific ones and ruled out the whole sign-up path in a single query - and it inverted the copy, because a message written from `otp_expired` alone would have told a confirmed user to go and sign up again.

What was deliberately NOT built: a resend-confirmation control. It is the obvious next feature and nobody asked for it; the message points at sign-in, which is the correct action in the measured case, and adding a second way to spend a rate-limited email send is a decision rather than a tidy-up.

## Surprises

- **The mutation gate changed the CODE, not just the tests.** Two survivors on `authUrlErrorMessage` were equivalent because the fallback chain ended `desc || err || …`, and `err` is a log enum - `access_denied` - that would have been shown to a café owner as if it were a sentence. Unreachable *and* wrong. Deleting it fixed both at once. **A dead branch and an unkillable mutant turned out to be the same finding seen from two sides**, which is a better argument for the gate than "it catches weak tests".
- **A tautology was written into a brand-new Playwright spec, in the batch whose whole subject is a check that proved nothing.** `expect(locator).toHaveCount(await locator.count())` - a count compared against itself, roster entry 205 verbatim, by someone who had just read the roster. Caught by re-reading, not by any tool: the gate does not run Playwright. It is deleted with the reasoning left in place.
- **A comment stated a mechanism that measurement disproved.** The first draft said supabase-js clears the error fragment, so reading later would race it. Reading the pinned 2.110.8 off the CDN: `_getSessionFromURL` THROWS on an error fragment several hundred bytes before its `history.replaceState`, so it clears the SUCCESS fragment and never the error one, and `_initialize` swallows the throw into an `{error}` nobody reads. There was no race to lose. The ordering is still right for two other reasons, both now written at the site - but the plausible reason was the wrong one, and only fetching the library settled it.
- **A stray `*/` closed a comment block early, twice in one batch**, in the same file this project has a whole `CLAUDE.md` section about for CSS. `node -c` caught both instantly, which is the difference: the JS failure is loud and the CSS one is silent.
- **The review agent's first run cost nothing and produced nothing**, and the failure mode is worth noting for the next batch that hits it: an agent that dies on a spend limit reports as a completed task with a summary, and the summary reads like progress.
