# HANDOVER - v120 (triaging the dropped threads)

**Branch:** `chore/dropped-threads-triage` · **Scope:** `docs/QUEUE.md` → "Threads that never reached any landing place", from the v115 audit.

**No client asset changed, so no cache bump: `sw.js` stays `ezplate-v118`.**

**Suite at close:** `npm test` **770 green** · `node -c` clean. No code changed.

## What changed

Five dropped threads, each now either an item or closed on purpose:

- **An eval harness for the invoice reader** → its own item. The one of the five that deserved it: the invoice path is the app's highest-stakes surface and its only AI one, and nothing measures whether a parser or prompt change made it better or worse.
- **The surviving `TODO(Max)`** → its own item, with a correction. It was waiting on "once the Vercel domain is fixed", and **the domain has been fixed for some time** - the condition was met and nobody noticed.
- **`manager` as a third role** → folded into "Roles - owner vs staff". "How many roles" and "what can each do" are one question; answering them apart would answer them twice.
- **Bulk catalogue bootstrap** → named explicitly inside "Onboarding and empty states", where it previously lived by implication only. An implied requirement is one nobody builds.
- **Abbreviation matching in search** → **closed: it already ships, and has since v55.**

## Into CLAUDE.md

Nothing proposed.

## New docs/QUEUE.md items

- **An eval harness for the invoice reader.** Must run offline against stored model responses, or the score is non-deterministic and costs money per run. Needs Max's real invoices, which are commercial data - decide where the corpus lives before collecting it.
- **The one surviving `TODO(Max)`: absolute social-sharing URLs.** `og:image`/`twitter:image` are relative and there is no `og:url` or canonical, so a pasted link previews inconsistently. Touches `index.html`, so it should ride a batch already paying the cache bump.

## New docs/PHONE.md items

None.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing about the method, but **one of its five premises was wrong and I only caught it by opening the code.**
The item said abbreviation matching "appears only in `HANDOVER-v83`", which is true, and inferred from that it was dropped, which is not.
It shipped in v55 and the example in the queue item - "bread gf" - is almost verbatim the example in the comment at `app.js:673`.

**What did you not propose because it was out of scope?**
Fixing the `TODO(Max)` in this batch. It is four attribute values and I was already in the file; the reason not to is that `index.html` is a client asset and touching it costs the six-spot cache bump, which is not worth paying for a preview image on its own.
It is queued with that reasoning attached so the next batch touching `index.html` picks it up free.

## Surprises

- **A grep of the process docs cannot see a feature that shipped without one.** The audit checked `QUEUE.md`, `PHONE.md`, `CLAUDE.md` and all 68 handovers for each thread and concluded five were dropped. Four were. The fifth was **built**, and the only reason the paperwork is silent is that whoever built it did not write it down - which is indistinguishable, from the outside, from never having built it.
  Worth carrying to the next sweep of this kind: **check the code, not just the paperwork.** It is the same shape as the audit's own C2 finding, where "12 missing Playwright specs" turned out to be two different sets counted two different ways.
- **Two of the five did not want to be items.** `manager` and the catalogue bootstrap both belong inside questions that already exist, and promoting them would have created two items whose answers depend entirely on another item's answer. The triage was as much about *not* adding to the queue as adding to it.
