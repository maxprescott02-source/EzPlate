# Independent process audit — how this project ships code

You are auditing a **development process**, not an application.

## Situation

A solo, non-professional developer maintains a costing app for a real café,
working almost entirely through AI coding agents. He has **no human reviewer**.
The app's numbers drive real pricing decisions, so a plausible-looking wrong
number is the worst failure mode, and a broken deploy costs money.

Over roughly 150 batches of work he has accumulated a process: skills that
agents invoke, a git pre-push hook, CI workflows, a mutation-testing gate, an
adversarial pre-push review agent, and a written handover after every batch.

**The question is whether that process actually works, or whether parts of it
are ceremony that has never prevented anything.**

## What you have — and what is deliberately withheld

You have the process **artifacts** and the process **record**:

- `skills/` — the procedures agents are told to follow
- `.githooks/pre-push`, `.github/workflows/` — the automated gates
- `tests/mutation/` — the mutation-testing gate's target list and allowances
- `docs/handovers/` — ~149 write-once records, one per batch, saying what was
  done, what broke, and what was caught
- `docs/audits/`, `docs/decisions/`, `docs/STAGING.md`, `docs/PHONE.md`
- `GIT-LOG.txt` and `GIT-LOG-WITH-FILES.txt` — the full commit history
- `TEST-FILE-LIST.txt` — what the suite covers, by filename

You do **not** have the project's central rulebook, its backlog file, or its
maintenance list. That is deliberate: those documents explain and justify the
process, and reading them would make you agree with it. **Do not comment on
their absence, and do not treat any gap you find as evidence they don't
exist.** A tiered backlog and a rules document both exist.

Derive the process from the artifacts and from what the record shows actually
happened. Where the two disagree, the record wins.

## The five questions

Answer these directly and in this order. Cite specific handovers, commits or
files as evidence for every claim.

**1. Trace one change from idea to production.**
Reconstruct the path. At every point where a wrong change could survive to
`main` and deploy, name what is supposed to stop it — and say whether that
thing is a **mechanism** (it runs whether or not anyone remembers) or a
**convention** (it works only if a human or an agent chooses to follow it).
Produce this as a list. Conventions are the interesting entries.

**2. Which gates can be skipped silently?**
For each gate, answer: can it be bypassed, does anything record the bypass,
and can a skipped run be told apart from a passed one by looking at the PR?
Include the case of a fresh clone, and the case of a gate that runs, finds
something, and fails to report it.

**3. From the record alone: what class of defect recurs?**
Read the handovers as data, not as narrative. Categorise what went wrong
across batches. Then, for each recurring class, name which gate was supposed
to catch it and say why it didn't. Give counts.

**4. What is ceremony?**
Which steps in this process consume real time and have **no traceable instance
of preventing anything** across ~150 batches? This is the question the project
cannot ask itself, because its documentation only ever records rules that were
added — never ones that turned out to be waste. Be specific and be willing to
be blunt.

**5. Where is the effort going versus where are the defects?**
Compare the weight of process applied to each area against where the record
shows defects actually occurred. Name any mismatch in either direction —
heavily-guarded areas that never break, and areas that break repeatedly with
little guarding.

## Rules of engagement

- **Evidence, not opinion.** Every claim cites a handover, a commit, or a
  file. "Best practice suggests" is worthless here.
- Do not recommend hiring a reviewer, adopting an enterprise process, or
  adding paid tooling as a first resort. He is one person. Recommendations
  must be affordable by one person in an afternoon.
- Do not recommend more documentation as the fix for a documentation problem
  without saying what would be deleted to pay for it.
- Rank your recommendations by expected value, and say which single change you
  would make first if you could only make one.
- If some part of this process is genuinely good, say so and say why — knowing
  what to protect is as useful as knowing what to cut.
