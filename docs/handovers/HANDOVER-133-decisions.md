# HANDOVER - 133 (the decisions #2 answers, actioned)

**Branch:** `docs/decisions-2-applied` · **Scope:** Max answered all five questions in `docs/decisions/2026-08-08-2.html` (9 Aug 2026); this batch actions them.

**Ships no client asset.** Docs + one applied migration; no cache bump; review skipped per the pure-prose rule (the migration was applied and verified live before the file was written - the file is the record).

## What changed
`kitchen_items` is DROPPED from production: re-verified 0 rows and zero code references immediately before applying, dropped over the production MCP, gone-state verified, rollback recorded in `supabase/migrations/20260809_drop_kitchen_items.sql`. Staging was unavailable, so the drop ran unrehearsed - said out loud per the (newly honest) Tier 3 rule; accepted because both the data risk and the app-behavioural risk are zero.
Five stale `CLAUDE.md` lines corrected with Max's yes: the ensureDefaultMenu gate names its call site; the `where true` rule is filed as a migration-authoring trap; the builder line is past-tense (and notes Q6 shipped); "plates persist {kid,qty} only" lost its dangerous "only"; Tier 3 now says staging has never loaded and migrations are unrehearsed.
Insight rule D closed - the rule stays at the function it governs.
`ensurePlateForDish` (heal-one/ask-many) and Stryker (dev-only) are unblocked `next` items carrying their decisions.

## Into CLAUDE.md
The five corrections above, each with Max's yes recorded inline with its date.

## New docs/QUEUE.md items
None - two unblocked, three closed.

## New docs/PHONE.md items
None.

## Probe
**What did the item tell you to do that you would have done differently?**
The answers file's question 3 said "three" CLAUDE.md lines; the queue item had grown to five (the audit's additions) and my summary to Max said five. I applied all five and flagged the scope-read in the answers file so one word from him reverts lines 4-5. Recording the ambiguity beat either silently narrowing or silently widening his yes.

**What did you not propose because it was out of scope?**
Building the ensurePlateForDish heal now - the decision landed but the build wants its own batch with the kid-line-only lesson in the tests.
Running Stryker now - approved, queued, and worth a fresh session's full attention.

## Surprises
- The production MCP was reachable this session after the audit session had no MCP at all - tool availability varies per session, which is worth remembering before marking anything "unverifiable" permanently.
- All five recommendations were taken without edits - the second file in a row. The decide-file format is earning its keep; the threshold stays at three.
