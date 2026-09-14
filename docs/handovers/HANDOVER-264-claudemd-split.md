# HANDOVER - 264 (CLAUDE.md splits into path-scoped rules)

**Branch:** `chore/claudemd-split` · **Scope:** gaps E3 and E4 of the 12 Sep 2026 standards audit, taken as item C2 of `~/Desktop/brain-ops/projects/brain-ops/fix-plan.md`. Not a `docs/QUEUE.md` item.

**Deploy version: none.** No client asset changed.

## What changed

- `CLAUDE.md` is **178 lines and 24,568 bytes**, down from 1,078 and 164,502. It carries the rule; the evidence moved.
- Seven `.claude/rules/*.md` files carry `paths:` frontmatter, so **Claude Code loads each one when it reads a file it protects** rather than on every turn of every session. `docs/rules/process.md` holds the process record and is loaded by nothing.
- **57 of the 58 sections moved byte-identical**, scripted rather than retyped, and the pre-push review re-verified that independently. The 58th, the four object nouns, stays whole in `CLAUDE.md`.
- `AGENTS.md` and `.claude/agents/code-review.md` are in the repo. Proved by cloning the branch to a temp directory: both present, along with `.claude/rules/` and `.agents/`.
- `tests/claude-md-split.test.js` - five assertions, the detector E3 never had. Each was proved red-before and green-after by breaking the thing it names.
- `.claude/` joined the review gate's guarded list, and the reviewer's model pin now states the case it cannot cover.

## Review

**Sonnet 5**, overridden down from the definition's `model: opus` because this batch itself ran on Opus and a model reviewing its own work is not a second reader. `docs/reviews/REVIEW-264-claudemd-split.md` carries the report and the disposition of every finding.

**Five findings. Three fixed, one partially fixed with the residue measured and written down, one not fixed and filed.**

- Two rules had **lost reach** in the move, both checkable rather than speculative: the wrong-consequence rule was scoped away from `tests/`, where two of its five recorded incidents happened; the `position:fixed` rule was scoped to the stylesheet when its own stated tell is JS arithmetic in `js/app.js`. Both repros were run, both `paths:` widened, the reason written at each site.
- The detector's own two weak spots were real. A **byte cap** now joins the line cap, proved with the finding's own attack (10,000 bytes on two lines: 178 lines, 34,139 bytes, line cap passes, byte cap reddens). A **corpus floor** now joins the heading manifest - and when tested against the finding's scenario it **did not fire**, so the comment says it catches a collapse and not a gutting, with the measurement in it. The first draft of that comment claimed more than the measurement supported and was corrected.
- **The one that is open: the rule files load on a READ.** Creating a new file is not a read and `cat`/`grep` is not a read, so a session writing a fresh migration - the highest-stakes thing done here - may never load `sql.md`, and nothing reports it. `CLAUDE.md` and `skills/batch/SKILL.md` now say so, and **both are reminders rather than controls**, which is this repo's own definition of a suggestion. The mechanism that would close it, a `PreToolUse` hook, is designed in `docs/MAINTENANCE.md` and deliberately not built today.

## Into CLAUDE.md

The whole batch is a `CLAUDE.md` change, made under the standing authority. Beyond the split itself:

- **The read-trigger limit**, written into the index section, because a mechanism whose failure is silent has to announce the shape of that failure.
- **The reviewer's model pin cannot mean "different from the batch" on its own.** Some work is explicitly run on Opus, which is what the pin names; on those runs the batch overrides the reviewer to Sonnet and says so. Only the batch knows which model it is.

## New docs/QUEUE.md items

None. Three things went to `docs/MAINTENANCE.md` as C: the `PreToolUse` hook; the three EzPlate-specific skills still outside the repo (`new-branch`, `investigate`, `test-flows`); and the 141 comment pointers across `tests/`, `js/app.js` and `css/style.css` that now name the wrong file.

## New docs/PHONE.md items

None. Nothing that ships to a phone changed.

## Probe

**What did the item tell you to do that you would have done differently?**
The item's done-when has three clauses and **one of them cannot be satisfied by the session that does the work**: *"one real batch runs with no rule reported missing in its Probe"*. What shipped is the instrument - a third Probe question in the handover template - and the measurement belongs to the next batch. The item is struck anyway, because leaving it open would have the next session redo the split; **so read the strike as "the mechanism exists", not as "it was measured".** The first real `/batch` after this one owes the answer.

The item also said `.claude/rules/` without saying what would make it work. The mechanism that matters is `paths:` frontmatter, and it was checked against the documentation and the installed CLI (2.1.269) rather than assumed - `@path` imports, the obvious other reading, expand at launch and would have saved nothing at all.

**What did you not propose because it was out of scope?**
`enforce_admins` is still false, so an admin merge still bypasses every check this batch just strengthened. The `flow-tester` and `project-audit` agents are still at `~/.claude/agents/`, so E4 is closed for the reviewer and open for the other two - the same defect, found while closing it.

**Was any rule missing when you needed it?**
Not applicable to this batch in the direction the question means - the rules were all in one file when it started. In the other direction, twice: the review found two rules that **would** have been missing, in `tests/` and in `js/app.js`, and both were fixed by widening a `paths:` line rather than by editing the rule.

## Surprises

**`AGENTS.md` says "never add yourself as commit co-author", and every commit in this repo does it**, including the five most recent merges to `main` and every commit on this branch. That file is Max's own text, copied in verbatim, so it was not edited to match practice - but the two disagree in the repo now, in writing, and **which one is wrong is his call.** The harness instructs the trailer; the preference forbids it.

**The mechanism was observed working, not just documented.** Reading `tests/claude-md-split.test.js` during this batch pulled `.claude/rules/tests.md` into context unprompted - a path-scoped rule loading exactly as intended, on a file created minutes earlier. That is the strongest evidence this batch has that the split does what it claims, and it is one data point on one file type.

**The splitter script read the wrong file the second time it ran** - `CLAUDE.md` had already been rewritten - and failed loudly on a missing section number rather than silently emitting truncated rule files. Worth recording because the silent version of that mistake would have produced seven plausible-looking files with rules missing from them, and the heading manifest would have caught it a step later.
