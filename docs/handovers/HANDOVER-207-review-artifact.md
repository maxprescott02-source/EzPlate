# HANDOVER - 207 (the review leaves a trace, and the dead workflow goes)

**Branch:** `chore/0d-review-artifact` · **Scope:** `docs/QUEUE.md` item 0d.
**Shipped no deploy version** - tests, gates, CI, skills and docs only, `js/app.js` untouched.

## What changed
The pre-push `code-review` agent now leaves a file behind: `docs/reviews/REVIEW-<batch>-<name>.md`, carrying a `Reviewed-commit:` line.
`.githooks/pre-push` and the `unit` CI job both refuse a diff that changes what runs when no artifact names a commit on the branch.
`## Review` is a mandatory handover section, with "None" acceptable exactly as `## Probe` works.
`.github/workflows/code-review.yml` is deleted, with its live references in `CLAUDE.md`, three skills, `test.yml`'s comment and one maintenance entry.

Suite 1514 to 1562, green. Smoke passes.

## Review
`code-review` agent, run on Sonnet against a batch running on Opus 5, without the item. Artifact: `docs/reviews/REVIEW-207-review-artifact.md`.
**Seven findings, all acted on, none declined.**
The two criticals were both this batch reproducing, in its own implementation, the failure it was written to fix: the gate ran only from the hook, which a fresh clone does not install, so it looked exactly like a clone that passed one; and it failed OPEN when it could not find the branch point, reporting "nothing that runs was changed" for a branch that had changed `js/app.js` two commits earlier.
Then a rename bypass the repo already had a test against one directory over, a hook test that could not fail, two skills still claiming the deleted workflow existed, a prefix match that would have counted `sw.js.map`, and a header parser that read fenced examples as claims.
**The gate refused the push that created its own artifact**, which is the acceptance test for the item.

## Into CLAUDE.md
The review section is rewritten: the artifact, the two halves and what each is worth, the ancestor-not-tip rule, and the workflow's deletion with the measured reasons.
**No new rule.** Everything the batch learned is an instance of something already written down - a gate nobody can satisfy gets disabled, a fail-open default is a decision about consequence, a test that cannot fail. The roster's own header says not to add a bullet for a shape it already names.

## New docs/QUEUE.md items
None. 0d is deleted.

## New docs/PHONE.md items
None. Nothing a user can reach changed.

## Probe
**What did the brief or queue item tell you to do that you would have done differently?**
It said the hook should refuse when no artifact exists "for the current HEAD", and I did not implement that literally.
Requiring the artifact to name the exact tip is unsatisfiable: the review's own findings get fixed, each fix is a commit, and HEAD moves past the artifact every time.
So the rule is ANCESTOR, the cost is written at the test that pins it, and the handover section is what covers the gap.
The item also did not ask for a CI backstop and the review was right that it needed one - the hook alone reproduces the failure the item is about.

**What did you not propose because it was out of scope?**
Making `git config core.hooksPath .githooks` automatic, through a `prepare` script in `package.json`.
It would close the fresh-clone hole properly rather than relying on CI to catch it afterwards, and it is one line.
I left it because npm lifecycle scripts run on every install and this repo has a standing rule about not adding machinery, and because CI now holds the property either way.
It is worth a maintenance entry rather than a queue item.

## Surprises
**The reviewer caught this batch committing the exact defect the batch exists to fix, twice.**
A gate that runs only from a hook a fresh clone does not install is a gate that is absent and looks present - which is the sentence `test.yml` already contains, five lines from where I added nothing.
And a gate that fails OPEN when it cannot determine what changed is the "absent check looks like a passing one" failure in miniature.
Neither was subtle in hindsight and neither was visible to me while writing it.

**The first draft's fallback was worse than no fallback.**
`merge-base` failing fell back to `HEAD~1..HEAD`, which reads as caution and is not: it diffs one commit rather than the branch, so the more commits a branch has, the more it hides.
Refusing costs one `git fetch` and says so.

**Writing the artifact found one more bug that neither the review nor I had looked for.**
Artifacts were read from the filesystem, so an uncommitted one satisfied the local hook and would have failed CI - green locally, red on push, which is the exact class this hook was extended in 192 to stop, after it happened twice on the same assertion.
They are read from the committed tree now, so the two cannot disagree.
**Dogfooding the mechanism found what reading it did not.**
