/*
 * ci-workflow.test.js — the couplings inside .github/workflows/test.yml that nothing else can see.
 *
 * CI config is the one part of this repo with no harness at all: a wrong gate does not fail, it goes
 * QUIET, which is indistinguishable from a pass. Two of those have already shipped here - a count
 * comment that was wrong for ten batches and two audits, and an artifact gate that discarded the one
 * trace worth keeping for as long as retries were on.
 *
 * These are conditions, not structure. Each pins a pair of settings that must move together, and
 * says what breaks if they do not. None of them cares where in the file the settings live.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const YML = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'test.yml'), 'utf8');
// the playwright job is the last one in the file; every assertion below is about it
const JOB = YML.slice(YML.indexOf('\n  playwright:'));
assert.ok(JOB.length > 500, 'the playwright job block must be findable, or every test below is vacuous');
// what RUNS, with the prose removed. The comments in this job quote the wrong mechanisms on purpose,
// to say why they are wrong, so a check for "this string must not appear" has to skip them or it
// fails on the explanation rather than on the code.
const CODE = JOB.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');

const retries = /--retries=(\d+)/.exec(JOB);

test('retries and the artifact gate move together', () => {
  if (!retries || retries[1] === '0') return;   // no retries, no flaky class, nothing to couple
  // With retries on, a test that fails once and passes on retry is classified `flaky` and the JOB
  // EXITS 0. `failure()` is then false, so an upload gated on failure alone throws away the trace
  // for the failed attempt — which --trace=retain-on-failure did write, and which is the only
  // evidence separating an infra hiccup from an intermittent real regression.
  const gate = /- name: Upload Playwright report\n\s+if: (.+)/.exec(JOB);
  assert.ok(gate, 'the upload step must have an explicit `if:`');
  assert.match(gate[1], /steps\.flaky\.outputs\.flaky/,
    'retries are on, so the upload must fire on a flaky run as well as a failed one');
});

test('the flaky detector has something to read', () => {
  if (!retries || retries[1] === '0') return;
  // The detector reads the json reporter's file. Miss either half and the gate above still LOOKS
  // right and silently never fires — the same failure class it was written to fix.
  assert.match(CODE, /--reporter=[\w,]*\bjson\b/, 'the json reporter must be emitted');
  assert.match(CODE, /PLAYWRIGHT_JSON_OUTPUT_NAME: (\S+)/,
    'and it must be pointed at a file — unset, the json reporter prints the whole report to stdout');
  // The two halves must name the SAME file. Compare the detector's own block against the env line;
  // searching the whole job for the filename would be a tautology, because the filename was read out
  // of that job a line ago. (The first version of this assertion did exactly that and could not fail
  // — caught by the pre-push review, which is the category this whole file exists to police.)
  const file = /PLAYWRIGHT_JSON_OUTPUT_NAME: (\S+)/.exec(CODE)[1];
  const detector = /- name: Did any spec pass only on a retry\?[\s\S]*?(?=\n      - name: |$)/.exec(CODE);
  assert.ok(detector, 'the detector step must be findable by name');
  assert.ok(detector[0].includes(file),
    `the detector must read ${file}, the file the reporter was told to write`);
});

test('the detector reads stats.flaky, and not the literal that never matches', () => {
  if (!retries || retries[1] === '0') return;
  // Measured 10 Aug 2026 against a real flaky report: the JSON reporter PRETTY-PRINTS, so the file
  // contains `"status": "flaky"` with a space and a grep for `"status":"flaky"` matches ZERO times.
  // A grep for the bare word hits 11 times in a one-test report. Both are gates that look correct
  // and are worse than the hole they replace, because they never fire and nobody looks again.
  assert.ok(!CODE.includes('"status":"flaky"'),
    'that literal is not in a Playwright json report — read stats.flaky instead');
  assert.match(CODE, /stats\.flaky/, 'the count is the honest signal');
});

test('the detector runs even when the specs failed', () => {
  if (!retries || retries[1] === '0') return;
  const step = /- name: Did any spec pass only on a retry\?\n\s+id: flaky\n\s+if: (.+)/.exec(JOB);
  assert.ok(step, 'the detector step must keep its id, or the gate above references nothing');
  assert.strictEqual(step[1].trim(), 'always()',
    'a step after a failed one is skipped by default, and a skipped detector reports no output at all');
});

/*
 * The crash detector. These four do NOT assert that the YAML contains a string - they EXTRACT the
 * shipped node script out of the step and RUN it, which is the remedy CLAUDE.md names for a stub
 * that mirrors a real function. A hand-written copy of this walk would be written from the same
 * belief as the original and would agree with it about the bug it exists to catch.
 *
 * The fixture is derived from a real report: the artifact of run 31384057429, the run whose browser
 * segfaulted on v141-sync-corner.spec.js:125 and which then went GREEN on the retry. Its error text
 * and its gitDiff are the real strings, trimmed. The second crash was moved into a nested suite
 * (a describe block) so the recursive walk is load-bearing - a detector that only looked at
 * top-level suites would pass every other assertion here.
 */
const CRASH_STEP = /- name: Did the browser crash\?[\s\S]*?(?=\n      - name: |$)/.exec(JOB);

// One line, single quotes only, so the closing double quote is an unambiguous boundary. If this
// ever mis-slices, the extracted text is a syntax error and the tests below THROW - they cannot
// go quiet, which is the failure mode CI config specialises in.
function crashScript() {
  assert.ok(CRASH_STEP, 'the crash detector step must be findable by name');
  const m = /node -e "([^"]*)"/.exec(CRASH_STEP[0]);
  assert.ok(m, 'the detector must be an inline `node -e "..."` script');
  // Verbatim, deliberately. Inside bash double quotes a backslash is special only before $ ` " \
  // and a newline, so `\n` reaches node unchanged and node's own parser turns it into a newline.
  // "Helpfully" unescaping it here produces a real newline inside a JS string literal, which is a
  // syntax error — this comment exists because the first version of this file did exactly that.
  return m[1];
}

// Runs the real script the way the step does: cwd holds playwright-results.json, which is what
// require('./playwright-results.json') resolves against.
function runDetector(report) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ezplate-ci-'));
  try {
    if (report !== undefined) fs.writeFileSync(path.join(dir, 'playwright-results.json'), report);
    return execFileSync('node', ['-e', crashScript()], { cwd: dir, encoding: 'utf8' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const SEGV_FIXTURE = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'playwright-report-segv.json'), 'utf8');

test('the crash detector names every spec whose failure text carries the signal', () => {
  const out = runDetector(SEGV_FIXTURE);
  assert.match(out, /v141-sync-corner\.spec\.js:125/, 'the crashing spec must be named');
  assert.match(out, /v137-modal-layer\.spec\.js:92/,
    'including one inside a describe block — the walk has to recurse into nested suites');
  assert.ok(!out.includes(':105'),
    'a spec that passed must not be reported: :105 is in the same file and has no error text');
});

test('the crash detector does not fire on a green run whose DIFF mentions the signal', () => {
  // The trap this test exists for. Playwright captures the branch diff into config.metadata.gitDiff
  // in CI, and the diff that added the detector's own comment contains `Received signal` — measured
  // at offset 2087 of the real report. A grep of the file would announce a crash on a clean run.
  const clean = JSON.parse(SEGV_FIXTURE);
  assert.ok(clean.config.metadata.gitDiff.includes('Received signal'),
    'the fixture must keep the string in its gitDiff, or this test proves nothing');
  const strip = (s) => {
    (s.suites || []).forEach(strip);
    (s.specs || []).forEach((sp) => sp.tests.forEach((t) => { t.results = t.results.filter((r) => !r.error); }));
  };
  clean.suites.forEach(strip);
  clean.stats.flaky = 0;
  assert.strictEqual(runDetector(JSON.stringify(clean)).trim(), '',
    'no test failed, so nothing crashed — whatever the diff happens to quote');
});

/*
 * The four channels the crash text can arrive on, pinned one at a time.
 *
 * The fixture above is faithful and that is exactly why it cannot pin these: a real Playwright
 * failure populates error.message, error.stack AND errors[].message with the same text, so a
 * detector that read only one of the three would pass every assertion above. These reports are
 * therefore CONSTRUCTED - each carries the real crash text on one channel and nothing on the
 * others - which is the only way to make each read load-bearing.
 */
const CRASH_TEXT = (() => {
  let found = null;
  const walk = (s) => {
    (s.suites || []).forEach(walk);
    (s.specs || []).forEach((sp) => sp.tests.forEach((t) => t.results.forEach((r) => {
      if (r.error && r.error.message.includes('Received signal')) found = r.error.message;
    })));
  };
  JSON.parse(SEGV_FIXTURE).suites.forEach(walk);
  assert.ok(found, 'the fixture must contain the real crash text, or these tests prove nothing');
  return found;
})();

// A report with one failing spec whose crash text sits on exactly one channel.
const oneChannel = (result) => JSON.stringify({
  config: { metadata: {} },
  stats: { expected: 0, flaky: 1, unexpected: 0 },
  suites: [{
    title: 'f.spec.js', file: 'f.spec.js', line: 0, column: 0, suites: [],
    specs: [{ title: 't', file: 'f.spec.js', line: 42, column: 3,
      tests: [{ status: 'flaky', results: [Object.assign({ status: 'failed', retry: 0 }, result)] }] }],
  }],
  errors: [],
});

test('the crash detector reads error.message', () => {
  assert.match(runDetector(oneChannel({ error: { message: CRASH_TEXT } })), /f\.spec\.js:42/);
});

test('the crash detector reads error.stack', () => {
  // Playwright puts the browser log in the stack as well as the message, and a future reporter
  // version could stop duplicating it. Each read is pinned separately so dropping one goes red.
  assert.match(runDetector(oneChannel({ error: { stack: CRASH_TEXT } })), /f\.spec\.js:42/);
});

test('the crash detector reads errors[].message', () => {
  assert.match(runDetector(oneChannel({ errors: [{ message: CRASH_TEXT }] })), /f\.spec\.js:42/);
});

test('the crash detector reads the report top-level errors, which belong to no spec', () => {
  // The channel the pre-push review found missing, verified against playwright/lib/runner/index.js:
  // the JSON reporter serializes `errors: this._errors`, fed by onError, for a global failure such
  // as a worker process dying BETWEEN tests - the respawn Playwright does after every failure.
  // No spec owns it, so the reader has least to go on, and silence there is the worst outcome.
  const report = JSON.parse(SEGV_FIXTURE);
  const strip = (s) => {
    (s.suites || []).forEach(strip);
    (s.specs || []).forEach((sp) => sp.tests.forEach((t) => { t.results = t.results.filter((r) => !r.error); }));
  };
  report.suites.forEach(strip);
  report.errors = [{ message: CRASH_TEXT }];
  const out = runDetector(JSON.stringify(report));
  assert.notStrictEqual(out.trim(), '', 'a crash with no spec attached must still be announced');
  assert.match(out, /no spec/, 'and it must say so, rather than naming a spec it cannot know');
});

test('the crash detector fails open on a missing or malformed report', () => {
  // It must lose the warning, never the build: a non-zero exit here would turn a green run red,
  // and this step runs on `always()`, so it would do that to a run that had already passed.
  assert.strictEqual(runDetector(undefined).trim(), '', 'no report at all');
  assert.strictEqual(runDetector('{"suites":').trim(), '', 'truncated json');
  assert.strictEqual(runDetector('null').trim(), '', 'valid json of the wrong shape');
});

test('the crash detector runs even when the specs failed', () => {
  // Same reason as the flaky detector: a step after a failed one is skipped by default, and a
  // crash that takes BOTH attempts leaves a red run — the one most likely to be read as a
  // regression in the diff.
  const step = /- name: Did the browser crash\?\n\s+if: (.+)/.exec(JOB);
  assert.ok(step, 'the crash detector step must be findable');
  assert.strictEqual(step[1].trim(), 'always()', 'it must report on a red run as well as a flaky one');
});

test('the non-hermetic screenshots spec is still excluded, and the guard still fails closed', () => {
  // Not new, but it is the highest-cost mistake this file can make: with no file arguments Playwright
  // falls back to testDir and picks up screenshots.spec.js, which reads the LIVE production database.
  assert.match(JOB, /grep -v screenshots\.spec\.js/, 'the spec list must exclude it');
  assert.match(JOB, /if \[ -z "\$SPECS" \]/, 'and an empty list must be refused rather than run');
  assert.match(JOB, /exit 1/, 'refused means a non-zero exit, not a warning');
});
