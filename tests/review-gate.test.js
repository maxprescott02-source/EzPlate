/*
 * review-gate.test.js — QUEUE 0d. The gate that makes the pre-push review leave a trace.
 *
 * WHY THE DECISION IS A FUNCTION AND NOT A SHELL CONDITION. A rule that lives inside
 * `.githooks/pre-push` can only be tested by pushing, so it is never tested, so nobody knows whether
 * it fires — which is the same shape as the defect it was written to fix. `tests/review/check.js`
 * splits the impure half (what git says changed, which artifacts exist) from the decision, and this
 * file drives the decision over every shape it can be handed.
 *
 * ⚠️ THE ASSERTIONS ARE ON THE OUTCOME AND THE REASON, not on the reason's wording alone. A gate
 * that refuses is only useful if the message says what to do, and a test matching the whole string
 * would go red on a typo fix — so the tests below assert `ok` (which is the behaviour) and that the
 * reason NAMES the thing that decided it.
 */
const test = require('node:test');
const assert = require('node:assert');
const { decide, guardedHits, reviewedCommit, GUARDED } = require('./review/check.js');

const HEAD = 'a'.repeat(40);
const OLD = 'b'.repeat(40);
const OTHER = 'c'.repeat(40);
const onBranch = [OLD, HEAD];

/* ---------------------------------------------------------------------------
 * 1. WHICH CHANGES NEED A REVIEW AT ALL.
 * ------------------------------------------------------------------------- */

test('0d: a docs-only diff needs no review — that is the one carve-out CLAUDE.md allows', () => {
  /* Handovers, queue entries and briefs are pure prose. The rule has always been that they are the
     exception, and a gate that demanded a review for them would make the cheapest possible PR
     expensive and train everyone to reach for --no-verify. */
  const r = decide({ files: ['docs/QUEUE.md', 'docs/handovers/HANDOVER-207-x.md', 'CLAUDE.md', 'README.md'], ancestors: onBranch, artifacts: [] });
  assert.equal(r.ok, true);
  assert.match(r.reason, /no review required/);
});

test('0d: every guarded area triggers it, ONE AT A TIME', () => {
  /* Each prefix is asserted alone, because a fixture touching several cannot tell you that any
     particular one is wired up — the same reason the taught-signal test in inv-referee.test.js sets
     one flag at a time. A missing prefix here is a whole class of change shipping unreviewed. */
  for (const g of GUARDED) {
    const file = g.prefix.endsWith('/') ? `${g.prefix}some-file.js` : g.prefix;
    const r = decide({ files: [file], ancestors: onBranch, artifacts: [] });
    assert.equal(r.ok, false, `${file} must require a review`);
    assert.match(r.reason, new RegExp(g.why.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      `and the refusal must say WHY — "${g.why}"`);
  }
});

test('0d: the guarded list covers the four client files by name, and CI, and the database', () => {
  /* The list is data, so this pins its CONTENTS rather than its behaviour — the four hand-written
     client files are the whole of what ships to a phone, and `.github/` is on the list because the
     batch that added CI-as-prose found a workflow change that would have run the live-production
     spec in a job documented as hermetic. Deleting any of these silently reopens that. */
  const prefixes = GUARDED.map((g) => g.prefix);
  for (const need of ['js/', 'css/', 'index.html', 'sw.js', 'tests/', '.github/', 'supabase/']) {
    assert.ok(prefixes.indexOf(need) >= 0, `${need} must be guarded`);
  }
});

test('0d: a path that merely LOOKS like a guarded one is not confused for it', () => {
  /* `startsWith` is the check, so a sibling directory whose name begins the same way would be
     caught by accident — and a rule that fires on the wrong files is how a gate gets a reputation
     for crying wolf, which is how it gets bypassed. */
  const r = decide({ files: ['docs/js-notes.md', 'docs/tests-we-should-write.md'], ancestors: onBranch, artifacts: [] });
  assert.equal(r.ok, true, 'documentation ABOUT js and tests is still documentation');
});

/* ---------------------------------------------------------------------------
 * 2. WHAT COUNTS AS AN ARTIFACT.
 * ------------------------------------------------------------------------- */

test('0d: a code change with no artifact at all is REFUSED, and told where to put one', () => {
  const r = decide({ files: ['js/app.js'], ancestors: onBranch, artifacts: [] });
  assert.equal(r.ok, false);
  assert.match(r.reason, /docs\/reviews/, 'the refusal names the directory');
});

test('0d: an artifact naming a commit ON this branch lets the push through', () => {
  const r = decide({ files: ['js/app.js'], ancestors: onBranch, artifacts: [{ file: 'docs/reviews/REVIEW-207-x.md', commit: OLD }] });
  assert.equal(r.ok, true);
  assert.equal(r.artifact.commit, OLD);
});

test('0d: an artifact that names an EARLIER commit still counts, and that is deliberate', () => {
  /* The obvious reading of "an artifact for the current HEAD" is that the sha must equal HEAD, and
     it is unsatisfiable: the review's own findings get fixed, each fix is a commit, and HEAD moves
     past the artifact every single time. A gate nobody can satisfy gets disabled — this repo's
     most-recorded gate failure, and the reason gemApplyReadings sat outside the mutation gate for
     twenty-six batches. So the rule is ANCESTOR, not equal, and the cost is stated where it is
     taken: a review at commit one does not know about commit five.
     What closes that gap is the handover's `## Review` section, which a human writes and a human
     reads. This gate is against forgetting, not against dishonesty. */
  const r = decide({ files: ['js/app.js'], ancestors: [OLD, HEAD], artifacts: [{ file: 'docs/reviews/REVIEW-207-x.md', commit: OLD }] });
  assert.equal(r.ok, true, 'a review followed by fix commits is the NORMAL shape of a batch');
});

test('0d: an artifact from a DIFFERENT branch does not count', () => {
  /* The whole point of the sha is that an artifact cannot be inherited. Without this, one review
     file committed once would satisfy the gate forever, on every future branch. */
  const r = decide({ files: ['js/app.js'], ancestors: onBranch, artifacts: [{ file: 'docs/reviews/REVIEW-200-old.md', commit: OTHER }] });
  assert.equal(r.ok, false);
  assert.match(r.reason, /none names a commit on this branch/);
});

test('0d: an artifact with no `Reviewed-commit:` line is not an artifact', () => {
  /* This is the shape a hand-written placeholder takes — a file created to satisfy the gate, with
     no claim in it about what was read. It must fail loudly rather than pass quietly, and the
     refusal names the file so it is obvious which one is empty of the header. */
  const r = decide({ files: ['js/app.js'], ancestors: onBranch, artifacts: [{ file: 'docs/reviews/REVIEW-207-x.md', commit: null }] });
  assert.equal(r.ok, false);
  assert.match(r.reason, /no Reviewed-commit/);
});

test('0d: with several artifacts present, one covering commit is enough', () => {
  /* docs/reviews/ accumulates — every past batch's file stays. So the check is "does ANY of them
     name a commit on this branch", and the stale ones must not drown out the live one. */
  const r = decide({ files: ['js/app.js'], ancestors: onBranch, artifacts: [
    { file: 'docs/reviews/REVIEW-200-old.md', commit: OTHER },
    { file: 'docs/reviews/REVIEW-205-older.md', commit: null },
    { file: 'docs/reviews/REVIEW-207-this.md', commit: HEAD },
  ] });
  assert.equal(r.ok, true);
  assert.equal(r.artifact.file, 'docs/reviews/REVIEW-207-this.md');
});

test('0d: the directory’s own README is not mistaken for an attempted artifact', () => {
  /* `gather` filters it out, so this pins the CONSEQUENCE rather than the filter: with no reviews
     yet, the refusal must read "no review artifact exists" and send the author to create one — not
     "an artifact exists but names no commit", which sends them hunting for a file that is supposed
     to be missing. A gate whose message points the wrong way is a gate people learn to skip. */
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(__dirname, '..', 'docs', 'reviews');
  assert.ok(fs.existsSync(path.join(dir, 'README.md')), 'the README must exist for this to be about anything');
  assert.equal(reviewedCommit(fs.readFileSync(path.join(dir, 'README.md'), 'utf8')), null,
    'and must carry no Reviewed-commit line, or it would satisfy the gate for every branch forever');

  const { gather } = require('./review/check.js');
  const facts = gather(path.join(__dirname, '..'));
  assert.ok(facts.artifacts.every((a) => !/readme\.md$/i.test(a.file)), 'the README is not scanned as an artifact');
});

test('0d: artifacts are read from the COMMITTED tree, not from the working directory', () => {
  /* A file written but not committed satisfies a filesystem read and is absent from CI, so the local
     hook would pass and the `unit` job would fail — the "green everywhere locally, red on push"
     failure this hook's own header says it was extended in 192 to stop, after it happened twice on
     the same assertion. Reading through git is what makes the two agree.
     Asserted by writing an uncommitted file into docs/reviews/ and checking `gather` does not see
     it, then removing it. The file name is deliberately one no batch would use. */
  const fs = require('fs');
  const path = require('path');
  const repo = path.join(__dirname, '..');
  const stray = path.join(repo, 'docs', 'reviews', 'REVIEW-000-uncommitted-probe.md');
  const { gather } = require('./review/check.js');
  fs.writeFileSync(stray, '# probe\n\nReviewed-commit: ' + 'f'.repeat(40) + '\n');
  try {
    const facts = gather(repo);
    assert.ok(facts.artifacts.every((a) => a.file.indexOf('uncommitted-probe') < 0),
      'an uncommitted artifact must not satisfy the local gate, or local and CI disagree');
  } finally {
    fs.unlinkSync(stray);
  }
});

test('0d: with no branch point findable, the gate REFUSES rather than guessing', () => {
  /* ⚠️ THE FIRST DRAFT FAILED OPEN HERE AND IT WAS THE WORST BUG IN THIS BATCH. It fell back to
     diffing HEAD~1..HEAD, which is one COMMIT rather than the branch — so a branch that touched
     js/app.js in its second commit and docs in its third reported "nothing that runs was changed"
     and went straight through. A gate whose subject is that an absent check looks like a passing
     one, failing open. Caught by the pre-push review, which reproduced it in a scratch repo.
     CLAUDE.md's rule is that a fail-open default is a decision about CONSEQUENCE, not about
     epistemics: refusing here costs one `git fetch` and says so, and guessing wrong ships an
     unreviewed change to production. */
  const r = decide({ noBase: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /git fetch origin main/, 'and the refusal says how to fix it');
});

test('0d: a guarded FILE is matched exactly, not by prefix', () => {
  /* Directory entries end in `/` and match by prefix; file entries must match whole. Prefix-matching
     a file name means `sw.js.map` or `index.html.bak` counts as the service worker — harmless today
     because neither exists, and exactly the over-firing that teaches people to reach for
     --no-verify. Both directions are asserted, because a fixture that only checks the false case
     would pass against a function that matches nothing at all. */
  assert.equal(decide({ files: ['sw.js.map', 'index.html.bak'], ancestors: onBranch, artifacts: [] }).ok, true);
  assert.equal(decide({ files: ['sw.js'], ancestors: onBranch, artifacts: [] }).ok, false);
  assert.equal(decide({ files: ['index.html'], ancestors: onBranch, artifacts: [] }).ok, false);
});

test('0d: the diff is read with --no-renames, so moving a guarded file out is still seen', () => {
  /* ⚠️ Git detects renames by DEFAULT and then reports only the NEW path, so `git mv js/app.js
     docs/archived.js` shows a docs file and nothing else — app code deleted from its live location,
     with the gate reporting nothing that runs was changed. `tests/ci-workflow.test.js` already pins
     this exact property for test.yml's `changes` job, whose comment calls the flag LOAD-BEARING, and
     the first draft of this file reintroduced the bug one directory over. Caught by the pre-push
     review.
     This asserts the flag is passed, which is a source-level check and weak on its own (roster
     183a) — so it is narrowed to the git invocation rather than a mention, and the sibling test in
     ci-workflow.test.js is what proves the underlying git behaviour it defends against. */
  const fs = require('fs');
  const src = fs.readFileSync(require('path').join(__dirname, 'review', 'check.js'), 'utf8');
  const call = src.split('\n').find((l) => /git\(\['diff'/.test(l));
  assert.ok(call, 'the diff call must exist to be checked');
  assert.match(call, /'--no-renames'/, 'a rename must not hide the path it came from');
});

/* ---------------------------------------------------------------------------
 * 3. THE HEADER PARSER.
 * ------------------------------------------------------------------------- */

test('0d: the Reviewed-commit line is read from anywhere in the file, case-insensitively', () => {
  assert.equal(reviewedCommit('# Review\n\nReviewed-commit: abc1234\n\nNo findings.'), 'abc1234');
  assert.equal(reviewedCommit('reviewed-commit: ' + HEAD), HEAD);
  assert.equal(reviewedCommit('lots\nof\nprose\nfirst\nReviewed-commit: deadbee\nand after'), 'deadbee');
});

test('0d: something that is not a sha is not read as one', () => {
  /* The pattern is deliberately narrow. A file saying "Reviewed-commit: see the PR" names no
     commit, and treating that as an answer would let the gate be satisfied by a sentence. */
  assert.equal(reviewedCommit('Reviewed-commit: see the PR'), null);
  assert.equal(reviewedCommit('Reviewed-commit: abc'), null, 'too short to be a sha');
  assert.equal(reviewedCommit('Reviewed-commit:'), null);
  assert.equal(reviewedCommit(''), null);
  assert.equal(reviewedCommit(null), null);
  assert.equal(reviewedCommit('The reviewer said Reviewed-commit: abc1234 in passing'), null,
    'it must be the whole line, or prose quoting the header would satisfy the gate');
});

/* ---------------------------------------------------------------------------
 * 4. THE HOOK ACTUALLY CALLS IT.
 * ------------------------------------------------------------------------- */

test('0d: .githooks/pre-push runs the review gate', () => {
  /* ⚠️ A grep over a file is a weak assertion and this repo has a roster entry about it (183a: any
     grep searches PROSE as well as CODE). It is used here for the one thing that cannot be tested
     any other way — whether the hook INVOKES the checker — and it is narrowed to a command line
     rather than a mention, so the paragraph above it explaining the gate cannot satisfy it. */
  const fs = require('fs');
  const hook = fs.readFileSync(require('path').join(__dirname, '..', '.githooks', 'pre-push'), 'utf8');
  const commands = hook.split('\n').filter((l) => !l.trim().startsWith('#'));
  const invocations = commands.filter((l) => /node\s+tests\/review\/check\.js/.test(l));
  assert.equal(invocations.length, 1, 'the hook must RUN tests/review/check.js exactly once, not merely mention it');
  /* ⚠️ AND IT MUST NOT PASS `--explain`, which is the mutation this test could not see in its first
     draft. `--explain` makes the checker exit 0 whatever it decided — it exists so a reader can ask
     the gate what it thinks without being refused — so a hook invoking it that way keeps every
     surface signal (the command is there, `set -e` is there) while enforcing nothing at all.
     Caught by the pre-push review, which mutated the hook and watched all fourteen tests stay green.
     This is the roster's own class arriving inside the batch that builds a gate against it. */
  assert.ok(!/--explain/.test(invocations[0]), 'and must NOT pass --explain, which always exits 0');
  assert.ok(/set -e/.test(hook), 'and must still exit on a failing step, or the gate reports and proceeds');
});

test('0d: --explain really does always exit 0, or the assertion above is about nothing', () => {
  /* The test above forbids a flag on the strength of what that flag does. If `--explain` ever stops
     forcing a zero exit, the prohibition becomes cargo cult — so its behaviour is pinned here, in
     the same file, rather than left as a claim in a comment. */
  const { execFileSync } = require('child_process');
  const path = require('path');
  const repo = path.join(__dirname, '..');
  const out = execFileSync(process.execPath, ['tests/review/check.js', '--explain'],
    { cwd: repo, encoding: 'utf8' });                       // execFileSync THROWS on a non-zero exit
  assert.ok(out.indexOf('review gate') >= 0, 'it still reports');
});
