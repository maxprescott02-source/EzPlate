# REVIEW - 207 (the review artifact gate)

Reviewed-commit: 456d59b
**Agent:** `code-review`, run on Sonnet against a batch running on Opus 5 · **Branch:** `chore/0d-review-artifact` · **Brief withheld.**

⚠️ **This is the first artifact in this directory, and the gate it records refused the push that
created it** — which is the acceptance test for the whole item and is why the file exists at all.

## Findings, most severe first — and every one of them was real

### 1. CRITICAL — no CI backstop, in a batch whose subject is that remembering is not a mechanism

`tests/review/check.js` was invoked only from `.githooks/pre-push`. `core.hooksPath` is not set by
default and nothing configures it, so a fresh clone runs no gate at all and looks exactly like a
clone that passed one. The reviewer quoted `.github/workflows/test.yml`'s own comment, five lines
above where this batch added nothing, saying precisely that about the mutation gate — *"a fresh clone
or a new machine runs no gate at all and looks exactly like a clone that passed it"*.

**Verdict: fixed.** The `unit` job now runs `node tests/review/check.js` unconditionally, and its
checkout gains `fetch-depth: 0` because the gate diffs against `origin/main`.

### 2. CRITICAL — wrong condition: losing `origin/main` narrowed the diff to one commit and passed

`gather()` fell back to `HEAD~1..HEAD` when `merge-base` failed. That is one COMMIT, not the branch —
so a branch that changed `js/app.js` in its second commit and docs in its third reported *"nothing
that runs was changed"*. Reproduced end to end by the reviewer in a scratch repo. Fail-open, in a
gate whose entire subject is that an absent check looks like a passing one.

**Verdict: fixed.** No branch point now REFUSES and names the fix (`git fetch origin main`).
Re-reproduced against the fix in a scratch repo, along with the branch-wide diff it was hiding.

### 3. MAJOR — rename bypass: no `--no-renames`, so moving a guarded file out of its tree hid it

`git mv js/app.js docs/archived.js` reported only the new path, so `guardedHits` returned empty and
the gate said no review was required — app code deleted from its live location, invisibly. The
reviewer noted that `test.yml`'s `changes` job already carries the flag, calls it LOAD-BEARING, and
that `tests/ci-workflow.test.js` has a test pinning exactly this property. **The bug was
reintroduced one directory over from the test that exists to prevent it.**

**Verdict: fixed**, and re-reproduced against the fix.

### 4. MAJOR — a test that could not fail, inside the batch building a gate against that

`tests/review-gate.test.js`'s hook-invocation test asserted only that the command appeared. The
reviewer mutated the hook to `node tests/review/check.js --explain` — which forces exit 0 and
enforces nothing — and all fourteen tests stayed green.

**Verdict: fixed.** The test now requires exactly one invocation and forbids `--explain`, and a
second test pins that `--explain` really does always exit 0, so the prohibition is not cargo cult.
Verified by re-applying the reviewer's mutation and watching it go red.

### 5. MINOR — stale references to the deleted workflow left live in two skills

`skills/verify/SKILL.md` and `skills/handover/SKILL.md` both still asserted the workflow existed and
was reachable by the `deep-review` label. `skills/handover/SKILL.md` is a file this diff already
modified, so the contradiction was introduced and left standing a few lines apart.

**Verdict: fixed**, both.

### 6. NIT — `index.html` / `sw.js` matched by prefix, so `sw.js.map` would have counted

**Verdict: fixed.** Directory entries match by prefix; file entries must match whole.

### 7. NIT — the `Reviewed-commit:` parser was fence-blind

A header quoted inside a fenced code block to illustrate the format would have been read as a claim.

**Verdict: fixed.** Fenced blocks are skipped.

## What the reviewer checked and found sound

`npm test` green; `tests/ci-workflow.test.js` green with no dependency on the deleted workflow;
`test.yml` valid YAML; the hook's shell correct under `set -e` with matching step numbers; and the
pure-function tests for `decide()` and `reviewedCommit()` — ancestor-vs-equality, multiple artifacts,
missing header, wrong branch — sound, and red against the mutations it tried.

## Nothing was declined

All seven findings were acted on. Two were critical, and both were the batch reproducing, in its own
implementation, the failure it was written to fix.
