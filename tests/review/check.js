#!/usr/bin/env node
/*
 * check.js — THE REVIEW ARTIFACT GATE.
 *
 * The pre-push `code-review` agent is, on the record, the most productive gate in this process, and
 * until batch 207 it was the only one that left no trace of any kind: not on the PR, not in CI, not
 * in git, and not in the handover template. Six batches that shipped a client asset to production
 * have no record of it, and only one of those is knowable. **The other five are silence, and silence
 * is indistinguishable from compliance.**
 *
 * So: a push whose diff changes WHAT RUNS must be accompanied by a review artifact committed under
 * docs/reviews/. This file decides that, and the hook calls it. The decision is here rather than in
 * the shell script for the reason `tests/mutation/run.js` exists rather than a grep: a rule that
 * lives in a hook is testable only by pushing, and a gate nobody can test is a gate nobody trusts.
 *
 * ⚠️ WHAT IT DOES NOT DO, stated plainly because the alternative is someone trusting it for more.
 * It cannot tell whether a review actually HAPPENED, whether the artifact describes this diff, or
 * whether its findings were acted on. A determined author can write an empty-ish file, and
 * `git push --no-verify` skips the hook entirely. It is a gate against FORGETTING, which is the
 * failure that actually occurred five times, and it is not a gate against dishonesty. The handover's
 * mandatory `## Review` section is the half a human reads.
 *
 * Usage:
 *   node tests/review/check.js            decide for the current branch, exit 1 to refuse the push
 *   node tests/review/check.js --explain  print the decision and always exit 0
 */
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const REVIEW_DIR = 'docs/reviews';

/*
 * The paths whose change makes a review mandatory. This is CLAUDE.md's "whenever the diff changes
 * WHAT RUNS", written out — app code, tests, the harness, CI and the database.
 *
 * ⚠️ THE LINE IS DELIBERATELY NOT code-versus-docs, and that is not an oversight to tidy up. It was
 * nearly written that way on 8 Aug 2026, and the review of the batch that wrote it — a diff of
 * nothing but YAML and Markdown — found a CI change that would have silently run the
 * live-production-database spec in a job documented as hermetic. A rule that skipped "config and
 * prose" would have shipped it.
 */
const GUARDED = [
  { prefix: 'js/', why: 'app code' },
  { prefix: 'css/', why: 'app styles' },
  { prefix: 'index.html', why: 'the app shell' },
  { prefix: 'sw.js', why: 'the service worker' },
  { prefix: 'tests/', why: 'tests and the harness' },
  { prefix: '.github/', why: 'CI' },
  { prefix: 'supabase/', why: 'the database' },
  { prefix: '.githooks/', why: 'the gates themselves' },
  { prefix: 'api/', why: 'the serverless endpoints' },
];

/**
 * Which guarded areas a file list touches. Empty means a review is not required.
 *
 * An entry ending in `/` is a directory and matches by prefix; anything else is a single FILE and
 * must match exactly. The first draft prefix-matched both, so `sw.js.map` or `index.html.bak` would
 * have counted as the service worker — harmless today because no such file exists, and precisely
 * the kind of over-firing that teaches people to reach for --no-verify.
 */
function guardedHits(files) {
  const hits = [];
  for (const g of GUARDED) {
    const isDir = g.prefix.endsWith('/');
    if (files.some((f) => (isDir ? f.startsWith(g.prefix) : f === g.prefix))) hits.push(g);
  }
  return hits;
}

/**
 * Read the `Reviewed-commit:` line out of an artifact.
 * Absent is not an error — an artifact without one is treated as covering nothing, which fails
 * loudly rather than passing quietly. Returning null for "no header" and letting the caller say so
 * is deliberate: an artifact that exists but names no commit is the shape a hand-written placeholder
 * takes, and it must not read as compliance.
 */
function reviewedCommit(text) {
  /* Lines inside a fenced code block are ILLUSTRATIONS of the format, not claims — docs/reviews's
     own README shows the header, and a future artifact quoting the format in a fence would otherwise
     be read as naming a commit. Stripping fences first is cheap and removes the whole question. */
  const lines = String(text == null ? '' : text).split('\n');
  let fenced = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^Reviewed-commit:\s*([0-9a-f]{7,40})\s*$/i.exec(line);
    if (m) return m[1];
  }
  return null;
}

/**
 * The decision, as a pure function of facts the caller gathered. Everything that touches git or the
 * filesystem is in `gather` below, so this half can be tested against every shape without a repo.
 *
 * Returns {ok, reason, hits, artifact}.
 */
function decide(facts) {
  if (facts.noBase) {
    return { ok: false, hits: [], artifact: null,
      reason: 'cannot find this branch\'s point of divergence from origin/main, so the diff to review '
        + 'is unknown — run `git fetch origin main` and try again' };
  }
  const files = facts.files || [];
  const hits = guardedHits(files);
  if (!hits.length) {
    return { ok: true, reason: 'nothing that runs was changed — no review required', hits, artifact: null };
  }
  const arts = facts.artifacts || [];
  if (!arts.length) {
    return { ok: false, hits, artifact: null,
      reason: `this diff changes ${hits.map((h) => h.why).join(', ')} and no review artifact exists in ${REVIEW_DIR}/` };
  }
  /* An artifact counts when the commit it names is an ANCESTOR of what is being pushed — not when it
     equals HEAD. Requiring equality is the obvious reading of "for the current HEAD" and it is
     unsatisfiable in practice: the review's own findings get fixed, each fix is a commit, and HEAD
     moves past the artifact every time. A gate nobody can satisfy gets disabled, which is this
     repo's most-recorded gate failure and costs more than the looser rule. */
  const covering = arts.filter((a) => a.commit && facts.ancestors.indexOf(a.commit) >= 0);
  if (!covering.length) {
    const named = arts.map((a) => `${a.file} (${a.commit || 'no Reviewed-commit: line'})`).join(', ');
    return { ok: false, hits, artifact: null,
      reason: `a review artifact exists but none names a commit on this branch: ${named}` };
  }
  return { ok: true, hits, artifact: covering[covering.length - 1],
    reason: `reviewed at ${covering[covering.length - 1].commit}` };
}

/** Everything impure: what git says changed, which artifacts exist, and this branch's commits. */
function gather(root) {
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  let base;
  /* ⚠️ NO BRANCH POINT MEANS REFUSE, NOT GUESS, and the first draft of this got it backwards.
     It fell back to HEAD~1, which diffs only the most recent COMMIT rather than the branch — so a
     branch that changed js/app.js in commit two and docs in commit three reported "nothing that
     runs was changed" and sailed through. Fail-open, in a gate whose whole subject is that an
     absent check looks exactly like a passing one. Caught by the pre-push review.
     CLAUDE.md's rule is that a fail-open default is a decision about CONSEQUENCE: here refusing is
     recoverable in one command (`git fetch origin main`) and says so, while guessing wrong ships an
     unreviewed change to production. So this returns no base at all and `decide` refuses. */
  try { base = git(['merge-base', 'HEAD', 'origin/main']); } catch (e) { base = null; }
  if (!base) return { files: [], ancestors: [], artifacts: [], noBase: true };
  /* ⚠️ --no-renames IS LOAD-BEARING, and it is load-bearing here for exactly the reason
     `.github/workflows/test.yml` says it is in the `changes` job. Git detects renames by DEFAULT and
     then reports only the NEW path, so `git mv js/app.js docs/archived.js` would show a docs file
     and nothing else — app code deleted from its live location, with the gate reporting that nothing
     that runs was changed. `tests/ci-workflow.test.js` already pins this property for that job;
     this file reintroduced the bug one directory over. Caught by the pre-push review. */
  const files = git(['diff', '--no-renames', '--name-only', `${base}..HEAD`]).split('\n').filter(Boolean);
  const ancestors = git(['rev-list', `${base}..HEAD`]).split('\n').filter(Boolean)
    .concat(git(['rev-parse', 'HEAD']));
  /* ⚠️ ARTIFACTS ARE READ FROM THE COMMITTED TREE, NOT FROM DISK, and that is the difference between
     this gate and one that lies. A file written but not committed satisfies a filesystem read and is
     absent from CI, so the local hook would pass and the `unit` job would fail — which is precisely
     the "green everywhere locally, red on push" failure this hook's own header says it was extended
     in 192 to stop, after it happened twice on the same assertion.
     README.md is the directory's own explanation rather than an attempted artifact; excluding it is
     what makes an empty directory report "no artifact exists" (create one) instead of "an artifact
     exists but names no commit" (go hunting for a file that is meant to be missing). */
  let listed = [];
  try { listed = git(['ls-tree', '-r', '--name-only', 'HEAD', `${REVIEW_DIR}/`]).split('\n').filter(Boolean); }
  catch (e) { listed = []; }
  const artifacts = listed
    .filter((f) => f.endsWith('.md') && path.basename(f).toLowerCase() !== 'readme.md')
    .map((f) => {
      let body = '';
      try { body = git(['show', `HEAD:${f}`]); } catch (e) { body = ''; }
      const full = reviewedCommit(body);
      return { file: f, commit: full ? expand(git, full) : null };
    });
  return { files, ancestors, artifacts };
}

/** A short sha in an artifact must compare against full shas from rev-list. */
function expand(git, sha) {
  try { return git(['rev-parse', sha]); } catch (e) { return sha; }
}

function main(argv) {
  const explain = argv.indexOf('--explain') >= 0;
  const res = decide(gather(REPO));
  if (res.ok) {
    process.stdout.write(`review gate: ${res.reason}\n`);
    process.exit(0);
  }
  process.stdout.write('\nreview gate: REFUSED\n');
  process.stdout.write(`  ${res.reason}\n\n`);
  process.stdout.write(`  The pre-push code-review agent is mandatory whenever the diff changes what runs,\n`);
  process.stdout.write(`  and until it leaves a file behind, skipping it and doing it look identical.\n\n`);
  process.stdout.write(`  Run the review, then save its report as ${REVIEW_DIR}/REVIEW-<batch>-<short-name>.md\n`);
  process.stdout.write(`  with a "Reviewed-commit: <sha>" line naming the commit it read.\n`);
  process.stdout.write(`  "No findings" is a complete and acceptable report.\n\n`);
  process.stdout.write(`  git push --no-verify skips this. If you use it, SAY SO IN THE HANDOVER.\n\n`);
  process.exit(explain ? 0 : 1);
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { decide, guardedHits, reviewedCommit, gather, GUARDED, REVIEW_DIR };
