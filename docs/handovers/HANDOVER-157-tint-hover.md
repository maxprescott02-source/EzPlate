# HANDOVER - 157 (tint vs hover, and the routing rule)

**Branch:** `docs/tint-hover-repoint` · **Scope:** the queue's top item, AUDIT-v145 C2.
**Deploy version: NONE.** Docs only, one `.md` file, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

The tint-vs-hover note is closed rather than re-pointed a fifth time.
The item offered two branches, re-point at the invoice review or confirm no such row exists, and the measured answer is the second for a reason the item did not anticipate.
The rule the finding actually named, `.atable tbody tr:hover td{background:var(--hover)}`, was deleted with the whole `.atable` system in F5 and `v142`, so the collision it described has no subject any more.

Measured, both halves.
The app's only full-row semantic tint is the invoice review's `.st-review` row, and `.invtable` rows carry no hover rule at all, so nothing is masked.
The four rows that do hover carry their semantics as a pill rather than a row wash: `.plib-row`, `.king-row`, `.mnu-row` and `#lines .line`, against `.king-drift`, `.ing-drift`, `.mnu-pct`, `.vbadge` and `.pill-good`.

The live residue is a forward question and it now sits on the F8 item in the imperative, because F8 is the batch that can create the collision.
Every screen F2 to F6 converted came out with row hover, and the review rows are the one place a full-row tint would meet it.

The pattern is fixed as a rule at the top of `docs/QUEUE.md`, which the item said was the real finding.
A note routed at a future item lives on that item, never in the Small list with a pointer at it.

## Into CLAUDE.md

Nothing.
The routing rule is about which queue item runs before which, so it belongs in `docs/QUEUE.md` by the same argument as the blocked PROPOSED sequencing rule, and it needs no yes from Max because it changes no code and no standing procedure.

## New docs/QUEUE.md items

None.

## New docs/PHONE.md items

None.
Nothing here reaches a user, and the forward question on F8 becomes a device question only if F8 gives those rows a hover wash.

## Probe

**What would I have done differently from the item?**
The item put the invoice review forward as "the strongest remaining candidate, which makes it `Do after: F8`", and taking that at face value would have been the fifth wrong re-point.
The `.st-review` row has the tint but no hover, so it is not a candidate today at all; it is only a candidate for what F8 might build.
The difference matters, because `Do after: F8` would have parked the note for another two batches in the same section nobody reads.

**What did I not propose because it was out of scope?**
Nothing.
The one thing I considered and rejected was writing the routing rule into `CLAUDE.md`, which would have needed Max's yes and would have collided with the blocked proposal that says sequencing lives in the queue.

## Surprises

The finding had been dead for a version and nothing noticed.
`v142` deleted the hover rule that the note was about, and the audit that re-examined the note one version later still framed it as live and unresolved, because it checked where the note pointed rather than what the note was about.
That is the same failure as the note itself, one level up.
