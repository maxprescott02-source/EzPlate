# HANDOVER - 156 (the .legacy wrapper, struck)

**Branch:** `docs/legacy-wrapper-mechanism` · **Scope:** the queue's top item, AUDIT-v145 C1.
**Deploy version: NONE.** Docs only, two `.md` files, no client asset, so `sw.js` stays `ezplate-v145`.

## What changed

The `.legacy` wrapper is struck from every place that described it as operative, and per-screen manual deletion is recorded as the mechanism it has actually been since F2.
`FOLD-IN-PROTOCOL.md` §2 carries a dated amendment; §2's rule itself is untouched, only its enforcement sentence.
The Dead CSS sweep keeps `Do after: F10` on a rewritten reason, because both halves of the old one were false.

The item offered "implement it instead" and I did not treat that as a coin toss, because the code refuses the option.
There is no unconverted screen left to wrap: all five `#tab-*` panels are converted, so a wrapper scoped to unconverted screens has zero children, and by §2's own test zero children means delete the stylesheet while most of it is still live.
And the residue is shared chrome, which no per-screen wrapper can scope: what is unconverted is three modals opened from converted screens (`#builderModal`, `#invModal`, `#settingsPanel`) plus Account, which has no markup at all.

Three things the item said that the code corrected.
Builder, Invoices, Settings and Account are not "the four screens still unconverted", because none of the four is a screen.
"Six screens running" is five screens plus the shell.
And there were three present-tense references in `docs/QUEUE.md`, not the two the audit counted.

## Into CLAUDE.md

Nothing.
The candidate rule here is "a sweep that starts from an audit's list stops at the audit's list, so grep for the thing itself", and it is one incident, so it is recorded in the queue's done entry rather than proposed.

## New docs/QUEUE.md items

None.
Three stale claims were corrected in place instead, all in the queue's own header and all the same class as the item itself, a claim describing a mechanism as operative when it is not.
The header said "No live asks for Max" while two `blocked` items had been waiting on his yes for a batch.
It said staging "does not load", which stopped being true when he approved the server, and which the staging item itself has recorded correctly since.
And the `HANDOVER-149` done entry claimed a new standing sequencing rule landed in `CLAUDE.md` when its own pre-push review had removed it before merge; `grep -n "sequencing" CLAUDE.md` returns nothing.

## New docs/PHONE.md items

None.
Nothing here reaches a user.

## Probe

**What would I have done differently from the item?**
The item framed this as a choice with two live options and I do not think it was one.
Implementing the wrapper is not a heavier option, it is an impossible one, and half an hour of grepping settles that before any judgement about taste or effort is needed.
The item also read as if the fold-in had four screens left; it has none, and that fact is what decides the question.

**What did I not propose because it was out of scope?**
The six dead selector families are provably dead today and could come out now.
I left them, because that is the Dead CSS sweep item and it has its own ordering.
I also did not touch the audit report or the handovers that describe the wrapper in the present tense, because both are write-once records of what was believed at the time.

## Surprises

The third reference was the one that mattered and nothing had counted it.
The other two describe the mechanism; that one instructs a batch to go and read it, telling a future session that conversion state "is read from this queue and the `.legacy` wrapper".
It survived because the audit named two passages and a sweep that starts from an audit's list stops at that list.

The queue header's "No live asks for Max" is the same failure in a different place.
A header that says nothing is waiting is how a `decide` file never gets written, and two items had been sitting there since the previous batch.
