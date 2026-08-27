/*
 * preflight-processes.test.js — the orphan detector's SIGNATURE, which is the whole of it.
 *
 * The script's one real decision is which lines of `ps` output are an orphaned `node --test` worker
 * and which are somebody's editor. It is tested against fixed `ps` text rather than against the live
 * process table, because a test that depends on what happens to be running is a test that passes for
 * reasons nobody chose.
 *
 * ⚠️ THE NEGATIVE CASES ARE THE POINT. A reaper that over-matches gets used once, kills something it
 * should not, and is disabled forever — so each line below that must NOT match is one this had to be
 * narrowed to exclude, including the Claude Code process that was running while it was written.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const P = require('./preflight-processes.js');

/* Real `ps -eo pid,ppid,etime,command` lines, trimmed. The two orphans are genuine captures from the
   27 Aug 2026 incident; the rest are things that were running beside them. */
const PS = [
  '  PID  PPID     ELAPSED COMMAND',
  ' 8342     1    03:33:24 /usr/local/bin/node --test-concurrency=0 --heap-prof-interval=524288 --test-timeout=0 loop.test.js',
  '13413     1    03:08:34 /usr/local/bin/node --test-concurrency=0 --heap-prof-interval=524288 --test-timeout=0 slow.test.js',
  '39604 39181       00:03 /usr/local/bin/node --test-concurrency=0 --test-timeout=0 live-child.test.js',
  '36026 36015       21:08 node tests/mutation/run.js',
  ' 1283   799    03:34:58 claude',
  ' 7467  5145    03:34:58 /Applications/Claude.app/Contents/Frameworks/Claude Helper.app/Contents/MacOS/Claude Helper',
  ' 4210     1    11:02:11 /usr/local/bin/node /usr/local/bin/some-dev-server --port 3000',
  ' 5000     1    01:00:00 /usr/bin/python3 -m http.server 5173',
  /* ⚠️ THE NEXT TWO LINES EXIST BECAUSE THE PRE-PUSH REVIEW FOUND TWO GUARDS THAT NO FIXTURE COULD
     EXERCISE. Every original line was excluded by the ppid check or the flag check, so deleting the
     node-executable regex, or the flag check, changed nothing and all eight tests stayed green —
     a whole guard pinned by an assertion incapable of failing, in a file whose header calls the
     signature "narrow on purpose". Each line below is excluded by exactly ONE guard. */
  ' 6001     1    00:05:00 /bin/sh -c while true; do echo --test-concurrency=0; done',   // orphaned, carries the flag, NOT node
  '36013     1    00:21:08 /usr/local/bin/node tests/mutation/run.js',                    // orphaned node PARENT, no worker flags
  ' 7100     1    00:02:00 /usr/local/bin/node scripts/lint.js --forbid --test-concurrency-unset',  // node, orphaned, MENTIONS the flag
].join('\n');

test('it finds exactly the orphaned node test workers', () => {
  const found = P.findOrphans(PS);
  assert.deepEqual(found.map((o) => o.pid), [8342, 13413],
    'only the reparented node --test WORKERS may match');
});

test('a live worker whose parent is still alive is NOT an orphan', () => {
  /* The distinction is the whole safety property: pid 39604 carries an identical flag set and is
     mid-run. Matching on the flags alone would have this reaper killing the suite that is running. */
  assert.ok(!P.findOrphans(PS).some((o) => o.pid === 39604));
});

/* ⚠️ Retitled and re-fixtured. This asserted pid 36026, whose ppid is 36015 — so the ppid guard alone
   already explained the result and the stated reason ("carries no worker flags") was not what the
   test measured. pid 36013 is the honest case and a real one: `nohup npm run mutate` leaves exactly
   this, an ORPHANED node --test parent with no worker flags, which must not be reaped. */
test('an orphaned node --test PARENT is not matched — only its workers carry the flag', () => {
  const pids = P.findOrphans(PS).map((o) => o.pid);
  assert.ok(!pids.includes(36013), 'the parent has no worker flags and must survive');
  assert.ok(!pids.includes(36026), 'and a LIVE parent is excluded by its ppid as well');
});

test('a process that only MENTIONS the flag is not matched — the match is token-bounded', () => {
  /* pid 7100 is node, orphaned, and contains the string `--test-concurrency` — but not
     `--test-concurrency=`, which is how the real worker always spells it. Loosen WORKER_FLAG back to
     a bare substring and this becomes a reap target. Without this line that loosening was caught
     only by the literal-equality test, i.e. by noticing the edit rather than by its effect. */
  assert.ok(!P.findOrphans(PS).some((o) => o.pid === 7100));
});

test('a non-node process is not matched even when its argv carries the flag', () => {
  /* The only line the node-executable guard is load-bearing for. Delete that guard and pid 6001
     becomes a reap target: a shell loop, SIGKILLed on somebody else's `git push`. */
  assert.ok(!P.findOrphans(PS).some((o) => o.pid === 6001));
});

test('Claude Code, a plain node dev server and python are never matched', () => {
  const pids = P.findOrphans(PS).map((o) => o.pid);
  for (const safe of [1283, 7467, 4210, 5000]) {
    assert.ok(!pids.includes(safe), 'pid ' + safe + ' must never be a reap target');
  }
});

/* ⚠️ An orphaned node process with no worker flags is the case this deliberately DOES NOT touch.
   pid 4210 above is one. It might be junk and it might be the user's dev server, and the script
   cannot tell — so it leaves it alone and says nothing, which is the honest answer. */
test('an orphaned node process without the worker signature is left alone', () => {
  const only = P.findOrphans([
    'PID PPID ELAPSED COMMAND',
    ' 4210 1 11:02:11 /usr/local/bin/node /usr/local/bin/some-dev-server',
  ].join('\n'));
  assert.deepEqual(only, []);
});

test('unreadable or empty ps output blocks nothing', () => {
  /* A preflight that cannot run must not become a gate nobody can satisfy — this repo's
     most-recorded gate failure, and the reason readPs swallows its own error. */
  assert.deepEqual(P.findOrphans(''), []);
  assert.deepEqual(P.findOrphans('total garbage\nnot a process table'), []);
});

test('it reports the elapsed time, which is what tells you it is stale', () => {
  const [first] = P.findOrphans(PS);
  assert.equal(first.etime, '03:33:24');
});

test('the signature the script matches is the one this test claims', () => {
  /* Roster 183(a): a test and the code it pins must not carry two copies of the same literal.
     ⚠️ The trailing `=` is load-bearing and this assertion is what caught it being added: a bare
     `--test-concurrency` also matches a process that merely MENTIONS the flag, which pid 6001 in the
     fixture above now is. */
  assert.equal(P.WORKER_FLAG, '--test-concurrency=');
  assert.ok(PS.includes(P.WORKER_FLAG), 'the fixture must actually contain the signature');
});


/* ---------------- reap() and main(), which the review found had no coverage at all ---------------- */

const { spawn } = require('child_process');

test('reap actually kills the process it is given', { timeout: 8000 }, async () => {
  /* A real child, not a stub: `reap` calls process.kill for effect, and a stub would only prove that
     a function named kill was called. It is `sleep`, so nothing of ours dies if this test is wrong. */
  const child = spawn('sleep', ['30'], { stdio: 'ignore' });
  const exited = new Promise((res) => child.on('exit', (code, signal) => res(signal)));
  const killed = P.reap([{ pid: child.pid }]);
  assert.equal(killed, 1, 'it must report what it actually killed');
  assert.equal(await exited, 'SIGKILL');
});

test('reap counts only what it really killed, and survives a pid that is already gone', () => {
  assert.equal(P.reap([{ pid: 2147483646 }]), 0, 'a dead pid must not be counted as a kill');
  assert.equal(P.reap([]), 0);
});

/* main reports to stderr by design. Silenced around the calls only — the EXIT CODE is what these
   assert, and swallowing the text does not touch it. */
function quiet(fn) {
  const real = console.error;
  console.error = () => {};
  try { return fn(); } finally { console.error = real; }
}

test('main exits 0 and says nothing when there are no orphans', () => {
  assert.equal(quiet(() => P.main([], [])), 0);
  assert.equal(quiet(() => P.main(['--reap'], [])), 0);
});

test('main BLOCKS by default when orphans are present', () => {
  /* This is the exit code the pre-push hook and both mutate scripts read. An inverted branch here
     turns the whole preflight into a no-op that still prints reassuring output. */
  assert.equal(quiet(() => P.main([], [{ pid: 1, etime: '01:00', command: 'node --test-concurrency=0' }])), 1);
});

test('--warn reports without blocking, and --reap clears and continues', () => {
  const fake = [{ pid: 2147483646, etime: '01:00', command: 'node --test-concurrency=0' }];
  assert.equal(quiet(() => P.main(['--warn'], fake)), 0, '--warn must never fail a run');
  assert.equal(quiet(() => P.main(['--reap'], fake)), 0, '--reap continues after clearing');
});
