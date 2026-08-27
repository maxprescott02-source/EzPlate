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

test('the node --test PARENT is not matched — it carries no worker flags', () => {
  assert.ok(!P.findOrphans(PS).some((o) => o.pid === 36026));
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
  /* Roster 183(a): a test and the code it pins must not carry two copies of the same literal. */
  assert.equal(P.WORKER_FLAG, '--test-concurrency');
  assert.ok(PS.includes(P.WORKER_FLAG), 'the fixture must actually contain the signature');
});
