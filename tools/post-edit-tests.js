#!/usr/bin/env node
'use strict';
//
// PostToolUse hook: run the tests an edit could actually have broken, and nothing else.
//
// WHY THIS FILE EXISTS (batch 263, the 12 Sep 2026 standards audit, gap E2).
// `.claude/settings.json` used to run `node --test tests/*.test.js` after EVERY Edit, Write and
// MultiEdit, with no path filter, no timeout and the default concurrency. Three things were wrong
// with that and only one of them is obvious:
//
//   1. NO FILTER. Editing a handover, a queue entry or this comment ran the whole suite. Measured
//      13 Sep 2026: 2241 tests, ~46 seconds. A docs-only batch paid that on every single edit.
//   2. NO BOUND. `node --test` has no default timeout and this repo deliberately ships two
//      non-terminating mutants (tests/mutation-gate.test.js), so a hung run had nothing to stop it.
//      CLAUDE.md's own rule: "a hang is a third outcome and nothing in this toolchain calls it a
//      failure". A hook is the worst place to learn that, because it hangs the session.
//   3. WRONG CONCURRENCY. `npm test` pins `--test-concurrency=2`; the hook used the default, which
//      is the CPU count. Each test file is a child process, and the 8GB machine that reached 40
//      orphans and 18.66GB of swap is the same one. Two definitions of how to run the suite, and
//      the loud one was not the one the hook used.
//
// So: decide from the edited path whether anything could have broken, run ONE bounded command if
// so, and stay silent if not. This is a fast local signal, NOT a gate - `.githooks/pre-push` and
// the `unit` CI job are the gates, and neither of them is skippable by a filter written here.
//
// FAIL-CLOSED ON AN UNREADABLE PAYLOAD, deliberately. If the hook cannot tell which file was
// edited it runs nothing and says so, rather than falling back to the 46-second suite. The cost of
// the wrong guess is asymmetric: a skipped run is caught by the push gate minutes later, while a
// suite fired on every unparseable event is exactly the defect above wearing a safety costume.

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..');
const BOUND_MS = 110000;   // under the 120s the hook's own `timeout` allows, so WE report the kill.

// A path matters if breaking it could redden `npm test`. tests/visual/ is Playwright, which this
// hook has never run and must not start running - those specs take ~9 minutes.
function affectsSuite(rel) {
  if (!rel) return false;
  if (rel.startsWith('tests/visual/')) return false;
  if (rel.startsWith('tests/')) return true;
  if (rel.startsWith('api/')) return true;
  if (rel.startsWith('js/') || rel.startsWith('css/')) return true;
  return rel === 'index.html' || rel === 'sw.js' || rel === 'package.json';
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function editedPath(payload) {
  const input = (payload && payload.tool_input) || {};
  const p = input.file_path || input.notebook_path || input.path;
  return typeof p === 'string' ? p : null;
}

function main() {
  const raw = readStdin();
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    console.log('post-edit tests: skipped — could not read the hook payload. The push gate still runs.');
    return 0;
  }

  const abs = editedPath(payload);
  if (!abs) {
    console.log('post-edit tests: skipped — the payload named no file. The push gate still runs.');
    return 0;
  }

  const rel = path.relative(ROOT, path.resolve(ROOT, abs)).split(path.sep).join('/');
  if (!affectsSuite(rel)) return 0;   // silence is the point: a docs edit says nothing at all.

  // One test file can only break itself, so edit it and that file is the whole answer. Anything
  // else takes the suite as `npm test` defines it - one definition, not a second copy of the flags.
  const oneFile = /^tests\/[^/]+\.test\.js$/.test(rel);
  const cmd = oneFile
    ? { bin: process.execPath, args: ['--test', '--test-concurrency=2', rel] }
    : { bin: 'npm', args: ['test', '--silent'] };

  const run = spawnSync(cmd.bin, cmd.args, {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: BOUND_MS,
    killSignal: 'SIGTERM',
  });

  if (run.error && run.error.code === 'ETIMEDOUT') {
    // A SIGTERM'd `node --test` parent can leave its workers behind; the repo already owns a reaper
    // for exactly that, so use it rather than inventing a second one.
    spawnSync(process.execPath, ['tests/preflight-processes.js', '--reap'], { cwd: ROOT });
    console.error(`post-edit tests: TIMED OUT after ${BOUND_MS / 1000}s running ${cmd.bin} ${cmd.args.join(' ')} — treat this as a failure, not a pass.`);
    return 1;
  }
  if (run.error) {
    console.error(`post-edit tests: could not run ${cmd.bin} — ${run.error.message}`);
    return 1;
  }
  if (run.status !== 0) {
    process.stdout.write(run.stdout || '');
    process.stderr.write(run.stderr || '');
    console.error(`post-edit tests: FAILED (${cmd.bin} ${cmd.args.join(' ')}) after editing ${rel}.`);
    return 1;
  }
  console.log(`post-edit tests: green (${oneFile ? rel : 'npm test'}).`);
  return 0;
}

// `affectsSuite` is exported so tests/harness-config.test.js can ask THE REAL FUNCTION which paths
// fire a run. A test that re-implements this mapping would agree with it whether or not it is right,
// which is this repo's most-recorded defect - see CLAUDE.md's roster.
module.exports = { affectsSuite };

if (require.main === module) process.exit(main());
