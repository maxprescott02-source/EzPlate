# HANDOVER - 149 (CLAUDE.md corrections from AUDIT-v135)

**Branch:** `chore/claudemd-audit-v135-corrections` · **Scope:** the queue's top item, the AUDIT-v135 CLAUDE.md corrections, approved in full by Max on 10 Aug 2026.

**Deploy version: NONE.** No client asset changed, so `sw.js` stays at `ezplate-v140` and the six cache spots were not touched.

## What changed

Four stale lines in `CLAUDE.md` are now true, and two rules that had each cost real time several times are now rules instead of lessons.

Every claim was verified against the source before it was written, not taken from the audit.
The audit was right on all six, which is worth recording because it is the third audit in a row and the first whose findings were checked one by one rather than trusted.

- **S1, the one that could have caused a bug.** The file said `pushWrite` "resolves to the result, `{error}`, or `null` when offline".
  There is no `null` path: all three exits return the result or `{error}` (`js/app.js:62-83`).
  `null` is `dbPushMenuAfterPlate`'s contract, returned when the plate push failed so the dish push is skipped (`js/app.js:5658`).
  The correction now says why the confusion matters rather than just naming the right value: a caller that treats only `null` as failure sequences its dependent write straight after an error.
- **S2.** "drops writes silently when fully offline" was half wrong.
  The drop is real and stays flagged; "silently" is false, because the fail handler toasts "you're offline. It has NOT been saved." (`js/app.js:73-75`).
  The file now also tells a future batch not to build a "tell the user" fix for a case already covered.
- **S5/D4.** `cafeDB_plateDraft` is named as the standing exception to "localStorage holds view preferences and derived caches ONLY", with the reason two consecutive audits rediscovered it as an unexplained violation: every use goes through the `DRAFTKEY` constant (`js/app.js:1152`), so a literal grep for the key finds nothing.
- **S3/C1.** The sentence "The dropdown placement work is therefore UNBLOCKED - the positioning context is already final" is deleted.
  Both halves were false from the moment the 9 Aug builder reversal was taken.
- **Item 6.** The Tier 3 staging line said staging "has never yet loaded in any session".
  It loads: `list_tables` answered from this session with an empty `public` schema.
  Only that clause changed. The rest of the warning survives and is now sharper, because the empty schema is the actual reason rehearsal is still unavailable.
- **Two Tier 1 rules added:** a stub that mirrors a real function must mirror its contract, so extract the real function instead (v113, then batches 139, 140 and 141, one remedy every time); and a `@media` block does not win by being later.

One thing outside `CLAUDE.md` changed: `tests/dash-scope.test.js:301` repeated the "drops writes silently" claim in a comment.
A stale fact re-entering through a comment the moment the rule above it is corrected is exactly how the rule goes stale again.

## Into CLAUDE.md

**Everything in this batch, and all of it had Max's yes before it started** (10 Aug 2026, recorded on the queue item).
Four stale-line corrections, plus the two new Tier 1 entries.

**A sixth rule was added and then REMOVED before merge by this batch's own review**, which was right to catch it: "sequencing between pieces of work lives in `docs/QUEUE.md`, never in `CLAUDE.md`".
Max approved four stale-line corrections and two named rules; he did not approve a seventh, and `CLAUDE.md`'s own closing section requires a yes for exactly this.
Flagging it in the handover was not sufficient, and that is the part worth keeping: **the file carries no "pending approval" marker, so an unapproved rule sitting in it reads as settled to the very next batch that opens it.** A self-flagged rule in `CLAUDE.md` is an approved rule in practice.
The review also found the wording too broad on its own terms, which is the better argument: Tier 3's Migrations section legitimately states standing sequencing in `CLAUDE.md`, so a literal "never" contradicts rules this batch never touched.
It is now a `blocked` queue item carrying the wording, the evidence and the narrowing, and it waits for a yes.

The "builder IS a MODAL" bullet was deliberately left for F7, as the queue item instructed.
It is now marked as describing today and as scheduled for reversal, so it cannot be read as a settled shape in the meantime.

## The pre-push review

Three findings, all three real, all three fixed. It is the best return this reviewer has had on a docs diff, and the reason is worth noting: it was asked to verify every factual claim against the source, which is the only useful question to ask about a file that is nothing but claims.

- **The `cafeDB_plateDraft` line I wrote was itself false.** I wrote "a grep for the key finds nothing"; `grep -rn "cafeDB_plateDraft" js/app.js` hits the constant at `:1152` immediately.
  The audit's claim was narrower and true: a `localStorage.getItem('...')` grep finds nine keys and misses this one.
  I widened a true statement into a false one while writing a batch whose entire purpose is removing false statements from this file.
- **The new `@media` rule's corollary named the wrong mechanism.** I wrote that `[hidden]` and `:focus-visible` are "ordinary low-specificity rules, and any class you write outranks them".
  `[hidden]` is an attribute selector at the SAME specificity as a class. An author rule wins on **cascade origin**, which is resolved before specificity is compared.
  This mattered rather than being pedantry: the paragraph above it says "give the two rules the same specificity", which is useless advice for a `[hidden]` case, and the actual remedy used twice in `css/style.css` is a `:not([hidden])` selector guard, not a specificity change.
  The corollary now names origin and the guard. The `:focus-visible` half was dropped as an unverified extrapolation, which is what it was.
- **The unapproved rule**, above.

## New docs/QUEUE.md items

- **PROPOSED rule: work-item sequencing lives in the queue, not `CLAUDE.md`** - `blocked`, carrying the wording and the review's narrowing, waiting on Max's yes.
- **Two CSS comments state the `[hidden]` mechanism wrongly** (`css/style.css:3263` and `:3378-3380`, "outranks" and "class beats attribute-less type rules").
  Found by following the review's finding back into the code it described. The `:not([hidden])` guards are correct and must not change; only the explanations are wrong, and a wrong explanation invites the wrong fix.
- **The `new-branch` skill has the two reviewers exactly backwards.**
  Its §6 says the PR workflow is mandatory and fires on every pull request, and that the pre-push `code-review` agent is optional.
  Both halves have been wrong since the 8 Aug demotion: the workflow is `workflow_dispatch` plus the `deep-review` label only, and `CLAUDE.md` calls the pre-push agent the only thing standing between a mistake and production.
  So a skill that runs at the start of every batch tells that batch to rely on a reviewer that will never fire, and to treat the real one as optional.
  It is outside the repo (`~/.claude/skills/`), so no PR carries it, no review sees it and no test pins it, which is why it drifted unnoticed.
  The item asks whether the three user-global skills should move into the repo alongside the other seven.

## New docs/PHONE.md items

None. Nothing in this batch is visible on a device.

## Probe

**What did the brief or queue item tell you to do that you would have done differently?**

Nothing wrong, but the item's instruction on S3/C1 was the one worth reading twice, exactly as it said.
It warned that the planned F7 edit covers only the "IS a MODAL" line and not the dropdown sentence, so the sentence had to be fixed here or it would fall through the gap between two batches.
That warning was correct and is the reason it landed.

The one place I went beyond the item is the general rule about where sequencing lives, flagged above.
The item asked for a deletion; a deletion alone fixes the instance and leaves the mechanism.

**What did you not propose because it was out of scope?**

I did not fix the `new-branch` skill, though it is the more dangerous of the two problems this batch found, because it sits outside the repo and could neither ride this PR nor be reviewed.
Queued instead.

I also left `CLAUDE.md`'s remaining scheduling-flavoured lines alone, having only checked the one the audit named.
If the new rule is kept, a sweep for others is worth a queue item, and this batch did not do it.

## Surprises

**Two of the three review findings were defects I introduced while removing defects of the same kind.**
A false claim about `cafeDB_plateDraft` and a wrong mechanism in a new Tier 1 rule, in a batch whose whole subject is false claims and wrong mechanisms in this file.
Writing a rule is the same act as writing code and fails the same way, which is the argument for the diff having gone to a reviewer at all rather than being waved through as prose.

**The wrong mechanism was in the code first.**
The corollary I wrote was wrong in the same way as the two comments in `css/style.css` it was generalising from, so the error was inherited rather than invented.
A rule extracted from a code comment is only as correct as the comment, and nothing checks comments.

**The most dangerous stale line was not in `CLAUDE.md`.**
The batch fixed a rule and then found the same wrong fact restated in a test comment, which nothing would have caught.
A correction to a rule is not complete until the places that quote the rule are corrected too, and there is no mechanism that finds those.

**The skill that opens every batch is the least protected file in the workflow.**
Seven skills are in the repo and versioned; three are not, and one of those three had drifted into telling batches that the mandatory review is optional.
The repo's own safeguards did not apply to the file describing the safeguards.
