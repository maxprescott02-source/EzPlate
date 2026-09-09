# HANDOVER - 240 (AUDIT-v197)

**Branch:** `docs/audit-v197` · **Scope:** the `project-audit` item, queued by batch 239 when the counter hit a gap of 11. **Docs only. No client asset, no deploy version.**

## What changed

`docs/audits/AUDIT-v197.md` is filed, verbatim.
**Verdict: healthy.** 1915 pass, six version spots agreeing at 197, no dead Tier 1 traps, and every high-consequence claim it checked - the write discipline, the restore's five/five column split, branch protection, the third-party pins, the handover gap table - came back matching its documentation.

The corrections it earned, all made this batch:

- **Item 17 is now `blocked`, in both files, and promoted into `docs/QUEUE.md` blocked rather than left invisible.** See Review below - it is the headline finding and the one thing this batch hands back to Max.
- **`spike/` is tracked and IS in `.vercelignore`.** Two live planning documents said the opposite and told a future batch to add it. Struck in both, with the reason: the wasted work was not the cost, the wrong conclusion was - a batch reading it would believe the production origin is serving the spike directory and go hunting a leak that is not there.
- **Two `docs/MAINTENANCE.md` entries were struck as done at one end of the file and live as outstanding at the other**, ~470 lines apart, for ten deploy versions. Both verified done in batch 230; both now struck where a rider actually reads them.
- **The abbreviation-matching record is corrected**, at the fourth audit to re-derive it. It was declined in `HANDOVER-v83` and never built; the closed thread's name is now "product-text search (v55 §G)", which is what shipped.
- **Two spent checks retired from the `project-audit` agent's standing checklist** - abbreviation matching, and a `TODO(Max)` grep four audits in a row have found zero of.
- **"72 items" is deleted from four files.** It was 73 by the time the audit ran. What is open is a grep for unstruck items, in a system whose own rule says a count in prose cannot be kept true.
- **`.env` and `.env.*` added to `.gitignore`**, with the history check recorded at the site: `git log --all --diff-filter=A -- .env` is empty, so nothing is being hidden retroactively.
- `docs/QUEUE-GROUPS.md` learned about item 88, and its G1 "rehearse on staging" instruction is struck - 239 shipped that item by the offline method `CLAUDE.md` now prefers, which is the stronger of the two.
- Two stale `js/app.js` comments (a format literal that no longer exists; a `doDeleteMenu` sentence `CLAUDE.md` records as wrong, sitting nine lines from its own correction) are filed as C riders rather than shipping a deploy version for two comments.

## Review

**Skipped, and this is the pure-prose exemption rather than a judgement call.** The diff is Markdown plus `.gitignore`, and `tests/review/check.js`'s guarded list is `js/ css/ index.html sw.js tests/ .github/ supabase/ .githooks/ api/` - none of them touched, so the artifact gate does not fire and there is nothing about what runs for a reviewer to judge.
The one edit outside the repo (`~/.claude/agents/project-audit/project-audit.md`) is recorded in `docs/MAINTENANCE.md` precisely because no reviewer and no test can see it.

## Into CLAUDE.md

One rule, from two findings that turned out to be one shape: **a done-mark is not a strike, and a standing check needs an expiry.**
Recording "DONE" in a summary list does not close the entry a rider reads, and a checklist line is an instruction to spend part of every future audit's budget with nothing to expire it.
The transferable half: **when you disprove something, fix the SOURCE that keeps asking, not just the report you are writing** - and if an audit re-derives a correction a previous audit already made, the defect is in the record, not in the code.

## New docs/QUEUE.md items

- **17**, promoted `blocked` - the invoice parser, 36 of 41 real lines silently wrong. It is the largest open defect in the backlog and it was sitting in an unreached group where `/batch` could not see it.

Nothing else was promoted. The audit's other findings were corrections, and all of them were made rather than queued.

## New docs/PHONE.md items

None. Nothing in this batch is device-visible.

## Probe

**What did the item tell you to do that you would have done differently?**

Nothing - the queue item was three lines and every one of them was right, including the one insisting the report gets FILED rather than handed back, which the agent independently closed its own report by restating.

**What did you not propose because it was out of scope?**

The audit lists four things that are Max's and I left every one of them alone: the two Supabase dashboard switches that keep a stranger's sign-up broken, the ZZ-AUDIT test objects and the 354.4% history point still on production, the staging test account that would unblock a spec file dark for 35 versions, and the parser-region sentence. All four are already routed; none is mine to take.

I also did not go after the two S-class recurrences the audit names (the parser's root cause, and the pack-arithmetic written out four times). Both are real, both are queued as items 17 and 37, and both are gated on the same sentence.

## Surprises

- **The audit's headline finding was a mechanism, not a fact, and that is what made it worth acting on.** Item 17 was headed `next` with `Do after: nothing` while `docs/QUEUE-GROUPS.md` blocked its whole group - and the promotion rule copies headings verbatim, so the item was one group-promotion away from having `/batch` edit the protected region on the strength of a chat summary. The routing file predicted that failure in writing and did not change the heading, which was the one thing that would have prevented it.
- **The region has already been edited once, in batch 197**, and has been waiting for ratification through two audits. So the question is not "may we start", it is "was that allowed" - and one sentence answers both.
- **Four audits spent budget re-deriving the same correction** because the checklist that asked for it lived outside the repo where nothing could strike it. The cost was invisible in every individual audit and only visible across four.
- **Nothing in Tier 1 was recommended for pruning**, which the agent flagged as the first time in a while - and it declined to manufacture a finding about the file's length, which is the right call and worth recording as one.
