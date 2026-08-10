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
const path = require('path');

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
  assert.match(JOB, /--reporter=[\w,]*\bjson\b/, 'the json reporter must be emitted');
  assert.match(JOB, /PLAYWRIGHT_JSON_OUTPUT_NAME: (\S+)/,
    'and it must be pointed at a file — unset, the json reporter prints the whole report to stdout');
  const file = /PLAYWRIGHT_JSON_OUTPUT_NAME: (\S+)/.exec(JOB)[1];
  assert.ok(JOB.includes(file + '\'') || JOB.includes('./' + file) || JOB.includes(file),
    'the detector must read the file the reporter was told to write');
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

test('the non-hermetic screenshots spec is still excluded, and the guard still fails closed', () => {
  // Not new, but it is the highest-cost mistake this file can make: with no file arguments Playwright
  // falls back to testDir and picks up screenshots.spec.js, which reads the LIVE production database.
  assert.match(JOB, /grep -v screenshots\.spec\.js/, 'the spec list must exclude it');
  assert.match(JOB, /if \[ -z "\$SPECS" \]/, 'and an empty list must be refused rather than run');
  assert.match(JOB, /exit 1/, 'refused means a non-zero exit, not a warning');
});
