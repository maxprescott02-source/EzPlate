# HANDOVER - v119 (the foreign keys, and five decisions)

**Branch:** `chore/fk-verify-and-decisions` · **Scope:** the v115 audit's S3 finding, plus the `decide` skill firing at 13 blocked items.

**No client asset changed, so no cache bump: `sw.js` stays `ezplate-v118`.**

**Correcting v118's handover, which overclaimed.** It said that from v118 on, "handover vNN and `sw.js` vNN mean the same thing again".
This batch broke that one merge later, because a docs-only batch gets a diary entry and no deploy.
**The two numbers are different things and always will be** - which is exactly the v115 audit's top finding, so I should not have promised to fuse them.
What actually has to hold is narrower: the audit counter compares `docs/audits/AUDIT-vNN.md` against `sw.js`, and nothing else keys off the diary number.

**Suite at close:** `npm test` **770 green** · `node -c` clean. No code changed.

## What changed

- **All three foreign keys verified against production** and recorded as an addendum in `docs/audits/AUDIT-v115.md`. They match `CLAUDE.md` exactly, and there is no fourth FK in `public`.
- `docs/decisions/2026-08-08.html` - five questions, phone-readable, with a copy button. Driven in a browser at 380px and 1280px: no sideways scroll, skipping works, notes come through.

## Into CLAUDE.md

Nothing yet.
Each answer that comes back gets recorded there with its date, per the `decide` skill, so none of it is re-litigated.

## New docs/QUEUE.md items

None. One blocked item closed (the FKs), and a pointer to the decision file added at the top.

## New docs/PHONE.md items

None.

## Probe

**What did the queue item tell you to do that you would have done differently?**
The FK item - which I wrote yesterday in this same run - said it was blocked on "a session with the Supabase MCP".
It was not: **I had the MCP the whole time.** The audit that raised it lacked one, and I copied its constraint into the item instead of checking my own tools.
It cost one query to close something I had marked blocked and nearly left for Max.

**What did you not propose because it was out of scope?**
Eight of the thirteen blocked items are not in the decision file.
That is the skill's five-item cap doing its job, but it means the file is not the full picture, and `docs/QUEUE.md` remains the real pending-decisions list.

## The pre-push review

Four findings, no critical or major, all four acted on.
Two were the "stale fact gets trusted" pattern, and both were self-inflicted by this batch:

1. **`AUDIT-v115.md` contradicted itself.** The addendum declared S3 resolved while the closing paragraph two paragraphs below still said S3 was open with its own queue item - a queue item this same diff had deleted. Rewritten to point at the addendum and to name the four claims that genuinely remain unverifiable.
2. **The queue banner miscounted.** It said 13 items blocked on Max; one waits on upstream and needs no decision. Now 12, with the exception named.
3. **The decision file's note boxes would zoom the page on iOS** - any text input under 16px triggers it, and the viewport meta deliberately allows scaling. `font-size:16px`, with the reason at the rule.
4. **"Five independent placement implementations" is an unverified count and looks wrong.** `anchorDrop`/`dropPlace`/`dropBox` is one shared engine reused across call sites. I had repeated the number to Max in the decision file as settled fact; the card no longer depends on it, and the queue item now says to count them properly first.

## Surprises

- **`CLAUDE.md` was right and the repo simply could not show it.** The audit was correct that a Tier 1 hard rule rested on nothing checkable - none of the three FKs appears in any migration, because they predate the directory. But the rule itself was accurate to the letter, including the asymmetry that only one of the three can ever raise an error.
- **The decision threshold of three is far too low here, and I want to say so while it is fresh.** The skill says three or more blocked items means run `decide`; the queue had **thirteen**. Batching five and deliberately leaving eight felt right - a file of thirteen reads as homework and would sit unanswered. If Max answers this one promptly, the number to raise is not the trigger but the **cap**.
