# Max's answers, 22 Aug 2026 — what the two blind audits change

Two independent audits were run the same day, deliberately starved of context so they could not
simply agree with this project's own documentation.

- **Code audit** — got the four client files, `api/`, `supabase/` and `tests/`. No `CLAUDE.md`, no
  `docs/`, no history. Constraints supplied as axioms without rationale, so it could not argue for
  a build step or new dependencies.
- **Process audit** — got `skills/`, the hook, both CI workflows, `tests/mutation/`, the 149
  handovers, the audit and decision files, and the full git log. **No `CLAUDE.md`, no `QUEUE.md`,
  no `MAINTENANCE.md`.**

Reports and both briefs: `docs/audits/BLIND-AUDIT-2026-08-22-*`.

## The result that mattered, and the reason the method is worth repeating

**The two audits converged on the same hole from opposite directions, with no shared context.**

The process auditor, having never read a line of the app, predicted it from the shape of the gates:
*"Not one of [the 49 mutation targets] computes a price, a cost, a food-cost percentage, a trend
point or an insight… the gate guards who may press Delete while nothing at all guards the arithmetic
that decides what a plate costs."*

The code auditor, having never read a process doc, walked into it and came out with five new defects
in the invoice pricing chain — including one putting a **10% error into `cost_per_base_unit` today**,
on the path the app rewards users for using, under a banner saying it had converted the price.

Verified independently before filing: `analyze`, `menuMarginPreview`, `costAtLines`, `fmtTargetPct`,
`computeInsights`, `costFromLines`, `cpbu`, `packToUnitCost`, `buildInvRows`, `resolveMatchedPrice`,
`derivePackPrice`, `packPriceOf`, `applySupplierMemory`, `invGstDetect` — **zero mutation targets
each**, and `grep -rn 'invGstDetect\|buildInvRows' tests/` returns one hit which is a comment.

## Question 1 — where the two structural process fixes go

**ANSWER: the QUEUE, as A items.** (Items `0c` and `0d`.)

This overrides `docs/QUEUE.md`'s own rule that *"nothing about the process itself belongs here"*.
**It is the second time that rule has been overridden and the first was the mutation gate itself**,
13 Aug 2026 — same person, same reasoning, and it is not precedent for anything else.

The reason it was put to him rather than filed: the alternative destination, the parallel maintenance
track, has **completed zero items in fifteen batches**. Filing the two fixes that prevent recurrence
onto the track that does not run is the mechanism by which *"eval harness: not done"* survived six
consecutive audits.

## Question 2 — branch protection on `main`

**ANSWER: on, requiring `unit tests` and `smoke (jsdom)`.** Applied the same day.

Closes two recorded incidents: `main` red for a whole batch with nothing saying so (172), and a merge
with all four checks red during the Actions billing block (183).

`enforce_admins` is deliberately **false**: on a 183-shaped day the merge is still possible without a
dashboard trip, but a red check is now visible instead of indistinguishable from a green one.
`allow_force_pushes` and `allow_deletions` are both off. `strict` is off, so a branch does not have to
be rebased onto the newest `main` to merge.

⚠️ **`CLAUDE.md`'s "Independent review before merge" section says branch protection is available and
"simply not yet turned on", and that "mandatory" is therefore a convention rather than a mechanism.
Half of that is now stale** — the mechanism exists for the two unit jobs. It remains true for the
pre-push `code-review` agent, which is what item `0d` is about.

## Question 3 — `.github/workflows/code-review.yml`

**ANSWER: delete it.** Reverses his own 8 Aug 2026 "demote, do not delete" call, and the deletion
rides item `0d` rather than getting its own PR.

Measured, not argued: **zero runs since the demotion** and the `deep-review` label **never once
applied** — both checked against the GitHub API on the day. 320 lines, and not free: batches 155 and
159 each declined a one-line CI fix because touching a workflow file triggers the mandatory review,
so a workflow nobody runs was making unrelated work more expensive. Git keeps it.

## What was NOT accepted from the audits

- **`node -c js/app.js` as ceremony** (process audit §4.4). "Never been red in 149 handovers" is also
  what a working guard looks like. It costs about a second. Kept.
- **The magnitude-band check as the answer to wrong numbers** (process audit rec 7). It is a good
  check and it is filed — but it **cannot catch queue item 0**: $5.50/kg for chips is inside every
  plausible band, so a 10% error is invisible to magnitude. Filed with that limit stated at the site,
  because the recommendation as written would have been over-trusted.
- **Code-audit finding 7's reasoning.** It says the `invite_pending` migration *"does not address the
  scope"*. False — `20260814_invitations.sql:55-74` addresses exactly that, names what is disclosed,
  argues the alternative is worse, flags that it is unrate-limited, and routes it to the queue. The
  **finding** stands and is already `QUEUE.md` item 4; only its explanation was wrong. Per this
  project's own rule, a wrong mechanism does not disprove a finding — and an adversary finding it cold
  is evidence the A-tier rating was right.
