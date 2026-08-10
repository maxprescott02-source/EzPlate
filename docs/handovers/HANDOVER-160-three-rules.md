# HANDOVER - 160 (three CLAUDE.md rules)

**Branch:** `docs/claudemd-three-rules` · **Scope:** the two blocked PROPOSED-rule items, plus the KPI-colour line left unwritten by the 10 Aug answers file.
**Deploy version: NONE.** Docs only, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

Max answered "ill go with your recommendations", so all three landed, each in the wording I recommended rather than the wording originally proposed.
He took the recommendation in every case, which is recorded because this project's convention is to flag the opposite loudly.

**Which item runs before which belongs in the queue, never in `CLAUDE.md`.**
Shipped narrower than proposed.
The original said sequencing lives in the queue and never in `CLAUDE.md`, and that absolute contradicts Tier 3's Migrations section, which legitimately states standing sequencing.
The rule now splits the two: which queue item runs before which goes in the queue, because it names items, expires, and is checked by the step-1 sweep; standing procedure inside one piece of work stays in `CLAUDE.md`, because it names no item and is true every time.

**A viewport-geometry assertion must measure its reference, never name it.**
The fixed-position probe, never `innerWidth` or `clientWidth`.
The scope is stated honestly rather than as the absolute the item proposed: the evidence is one runner and one browser, so it is a rule about how to obtain the reference and not a claim that the three values differ everywhere.

**KPI colour anchoring**, appended to the Tier 1 chart-colour entry.
Colour on a headline figure is a target reading, not a delta, and it carries the thrice-declined "vs last month" with it.

The sweep the first rule requires was run and changed one line: the Tier 2 builder bullet's "the batch that builds it replaces this bullet".
F7's queue item was checked and does carry that instruction before it was removed from here.

## Into CLAUDE.md

All three of the above, with Max's yes of 10 Aug 2026.
Nothing further proposed.

## New docs/QUEUE.md items

None.
Two blocked items closed, so the only blocked items left are the restore's full-wipe, which waits on the fold-in and then his go on the day, and the `claude-code-action` re-pin, which waits on upstream.
Neither is a question anyone can answer today, and the queue header now says so.

## New docs/PHONE.md items

None.

## Probe

**What would I have done differently from the items?**
Both proposed rules were stated as absolutes and neither survived as one, which is the whole substance of what changed.
Each item had already flagged its own wording as suspect, and in both cases the flag was right.
A rule that overreaches gets worked around rather than followed, and the sequencing one would have contradicted the migrations section on its first reading.

**What did I not propose because it was out of scope?**
Whether the privacy gate belongs in the queue rather than in `CLAUDE.md`.
The review raised it, I judged it to be standing policy rather than item ordering, and rather than move it I made it the worked example of the boundary inside the new rule.
Moving it would be a decision about the privacy work, not about where sentences live.

## Surprises

The review's headline finding was that the queue's done entry cited this handover before it existed.
It was accurate: the entry was written first and the file came after, so at the moment it read the branch the claim was false.
That is the same failure the entry immediately above it describes, a record of intent presented as a record of outcome, and it was caught inside the batch that was writing about it.

Its second finding was better than a defect.
It did not claim the privacy gate was misfiled; it claimed the sweep asserted more completeness than it had earned, which was true, and the fix made the rule more useful than it was before.
