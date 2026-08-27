#!/usr/bin/env node
/*
 * preflight-processes.js — refuse to start a heavy run on top of a previous run's wreckage.
 *
 * ⚠️ WITH THE PROCESS-GROUP KILL IN tests/mutation/run.js, THIS SHOULD NEVER FIRE. That is not an
 * argument against it. On 27 Aug 2026 an 8GB machine went out of application memory with ~40
 * orphaned `node --test` workers spinning at full CPU and 18.66GB of swap, accumulated over four
 * hours across four separate runs. The leak was real and fixed; what made it EXPENSIVE was that
 * nothing was watching, so run four inherited runs one through three and nobody knew until the
 * machine died. This is the watching.
 *
 * WHAT IT LOOKS FOR. A `node --test` WORKER that has been reparented to launchd/init. Node runs
 * each test file in a child process and passes it a distinctive flag set; the parent has no such
 * flags. So the signature is: parent pid 1, executable node, argv carrying `--test-concurrency`.
 * That is narrow on purpose — it cannot match an editor, a dev server, a language server, or the
 * Claude Code process itself, none of which are node test workers.
 *
 * ⚠️ IT IS DELIBERATELY NOT "kill every node process with ppid 1". A reaper that guesses is worse
 * than no reaper: it gets used once, kills something it should not, and is then disabled forever.
 *
 * Usage:
 *   node tests/preflight-processes.js           report and exit 1 if any are found
 *   node tests/preflight-processes.js --reap    kill them, then exit 0
 *   node tests/preflight-processes.js --warn    report but never fail the run
 *
 * POSIX only. On a platform without `ps` it reports nothing and exits 0 rather than blocking a
 * push, because a preflight that cannot run must not become a gate nobody can satisfy — this
 * repo's most-recorded gate failure.
 */
'use strict';

const { execFileSync } = require('child_process');

/* The worker signature, kept as one constant so the test and the script cannot disagree about it.
   ⚠️ It ends in `=` on purpose. A bare `--test-concurrency` substring would also match a process that
   merely MENTIONS the flag in its argv — a shell loop, a grep, an editor opening this very file — and
   the node worker always spells it `--test-concurrency=<n>`. Narrowed after the pre-push review
   pointed out the unbounded match. */
const WORKER_FLAG = '--test-concurrency=';

/** Every orphaned node test worker, as {pid, etime, command}. Never throws. */
function findOrphans(psOutput) {
  const text = typeof psOutput === 'string' ? psOutput : readPs();
  if (!text) return [];
  const out = [];
  for (const line of text.split('\n')) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const [, pid, ppid, etime, command] = m;
    if (ppid !== '1') continue;
    if (!/(^|\/)node\b/.test(command)) continue;
    if (!command.includes(WORKER_FLAG)) continue;
    out.push({ pid: Number(pid), etime, command });
  }
  return out;
}

function readPs() {
  try {
    return execFileSync('ps', ['-eo', 'pid,ppid,etime,command'], { encoding: 'utf8', timeout: 10000 });
  } catch (e) {
    return '';                                   // no ps, or it failed — report nothing, block nothing
  }
}

function reap(orphans) {
  let killed = 0;
  for (const o of orphans) {
    try { process.kill(o.pid, 'SIGKILL'); killed++; } catch (e) { /* already gone */ }
  }
  return killed;
}

/* `injected` exists so the exit-code branching below can be tested without a real process table.
   The review found reap() and main() had no coverage at all: the part that decides whether a push
   proceeds or blocks was the untested part. */
function main(argv, injected) {
  const reapMode = argv.includes('--reap');
  const warnOnly = argv.includes('--warn');
  const orphans = injected || findOrphans();

  if (!orphans.length) return 0;

  console.error('\npreflight: ' + orphans.length + ' orphaned node test worker(s) from a previous run:\n');
  for (const o of orphans) {
    console.error('  pid ' + o.pid + '  up ' + o.etime + '  ' + o.command.slice(0, 90));
  }

  if (reapMode) {
    const n = reap(orphans);
    console.error('\npreflight: killed ' + n + '. Continuing.\n');
    return 0;
  }

  console.error('\nThese spin at full CPU forever and page out to swap, so they are cheap to miss and'
    + '\nexpensive to leave. Clear them with:\n\n    node tests/preflight-processes.js --reap\n');

  return warnOnly ? 0 : 1;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { findOrphans, reap, main, WORKER_FLAG };
