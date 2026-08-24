/*
 * mutation-gate.test.js — the gate's own proof that it can fail.
 *
 * A mutation gate that reports every mutant killed no matter what is the SAME defect it exists to
 * catch, one level up, and it is the easy way to get here: instrument js/app.js so that the source
 * anchors stop matching and every mutant "dies" on a broken suite. That is the specific reason this
 * project's gate is textual rather than AST-rewriting (see tests/mutation/mutate.js), and it is why
 * the claim gets a test instead of a comment.
 *
 * The proof is two-sided, because one side alone proves nothing:
 *   - against a test file that pins every condition, ZERO survivors  -> the gate can go green;
 *   - against a test file that pins none of them, survivors reported -> the gate can go red.
 * A gate that only ever passes and a gate that only ever fails are equally useless, and each of them
 * satisfies half of this.
 *
 * It runs against tests/fixtures/mutation/, not against js/app.js. Measuring the gate with the same
 * code it measures would be circular, and it keeps this test at a fixed, small cost inside `npm test`.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { codeMask, mutantsFor, apply } = require('./mutation/mutate');
const { mutationRun, report, mutantBudgetMs, runTests } = require('./mutation/run');

const FIXTURES = path.join(__dirname, 'fixtures', 'mutation');

/* ---------------------------------------------------------------------------
   1. The gate end to end, on code whose coverage is known.
   --------------------------------------------------------------------------- */

const res = mutationRun({
  root: FIXTURES,
  appRel: 'app.js',
  testDir: '.',
  sandboxName: 'fixture',
  targets: [
    { fn: 'priceMoved', tests: ['strong.test.js'] },
    { fn: 'priceMoved', tests: ['weak.test.js'] },
  ],
  allow: [],
}, () => {});                                    // silent: this is a test, not a report

/* A SEPARATE RUN, because these mutants do not fail — they HANG, and the whole question is what the
   gate does about that. `mutantMs` is passed explicitly so the self-test costs ~1s instead of the
   ~10s the derived bound would spend waiting; the derived bound itself is exercised by every real
   run of the gate. */
const loopRes = mutationRun({
  root: FIXTURES,
  appRel: 'app.js',
  testDir: '.',
  sandboxName: 'fixture-loop',
  targets: [{ fn: 'countDown', tests: ['loop.test.js'] }],
  allow: [],
  mutantMs: 500,
}, () => {});

test('a mutant that NEVER TERMINATES is caught, not waited on forever', () => {
  /* ⚠️ THE GATE HUNG BEFORE THIS. spawnSync had no `timeout` and `node --test` has no default one,
     so a mutant that turned a loop into a non-terminating one produced no red, no green and no
     output at all — indistinguishable from a slow run locally and from a stuck runner in CI.
     Measured on the real code, which is how it was found: `computeInsights` has exactly one such
     mutant and the gate ran past TEN MINUTES on it. With the bound it finishes in 19 seconds.
     Both of countDown's mutants hang, and that is not a contrivance — `left > 0` -> `left >= 0`
     leaves the loop spinning at zero, and `left >= 1` -> `left > 1` leaves it stuck at one. Two
     ordinary relational flips out of the gate's own operator set.

     ⚠️ WHAT THIS TEST CANNOT DO, STATED RATHER THAN LEFT TO BE DISCOVERED. Deleting the `timeout`
     from spawnSync does NOT turn this red: it makes the whole file HANG, because mutationRun is
     synchronous and node:test's own `{timeout}` cannot interrupt a synchronous child wait. Measured,
     not assumed — the mutation was run and killed at sixty seconds by an outside bound.
     So this test proves the CLASSIFICATION (a hang is a timeout, a timeout is a kill, and it is
     named) and it does not and cannot prove the PLUMBING. The net for the plumbing is outside the
     suite: every CI job now carries `timeout-minutes`, which it did not before this batch — only
     the playwright job did, so a hang in `unit` ran to GitHub's six-hour default. Three tests below
     pin the budget itself, including the call site, which is the part that can be broken quietly. */
  assert.strictEqual(loopRes.baselineOk, true, 'the fixture must pass clean, or this proves nothing');
  assert.strictEqual(loopRes.ran, 2, 'countDown yields exactly two mutants and both hang');
  assert.strictEqual(loopRes.timedOut.length, 2, 'both must be REPORTED as timeouts, by name');
  assert.deepStrictEqual(loopRes.survivors, [],
    'a hang is NOT a survivor — calling it one sends someone to write a test for a defect already caught');
  assert.strictEqual(loopRes.killed, 2, 'and it is counted as killed, because the suite did not pass');
});

test('the timeout is reported separately, so it can never be read as an ordinary kill', () => {
  // A test file that HANGS instead of failing is its own finding: in CI that is a stuck job, not a
  // red one. Folding these into the tally would hide that those files have no timeout of their own.
  const lines = [];
  const code = report(loopRes, (m) => lines.push(m));
  const text = lines.join('\n');
  assert.strictEqual(code, 0, 'every mutant was killed, so the gate must exit 0 — a hang is not a failure to report');
  assert.match(text, /killed BY TIMEOUT/, 'the summary line must say so');
  assert.match(text, /TIMED OUT \(counted as killed\)\s+countDown/, 'and each one must be named');
});

test('the per-mutant budget is derived from the baseline, and has a floor', () => {
  /* PINNED SEPARATELY BECAUSE THE RUNS ABOVE PASS `mutantMs` EXPLICITLY TO STAY FAST, so the derived
     path they do not take was covered by nothing. Mutating `Math.max(5000, ...)` to `0` left the
     whole suite green while putting the hang back on every real run of the gate — the exact shape
     this repo keeps paying for: a guard whose test never reaches it. */
  assert.strictEqual(mutantBudgetMs(0), 5000, 'a baseline too fast to measure still gets the floor');
  assert.strictEqual(mutantBudgetMs(100), 5000, 'the floor wins while ten times the baseline is under it');
  assert.strictEqual(mutantBudgetMs(2000), 20000, 'above the floor it scales with the suite, so it cannot rot');
  assert.strictEqual(mutantBudgetMs(undefined), 5000, 'an unmeasurable baseline never yields 0 or NaN');
  assert.strictEqual(mutantBudgetMs(-1), 5000, 'nor does a clock that went backwards');
  assert.ok(mutantBudgetMs(0) > 0, 'ZERO IS THE DANGEROUS VALUE — spawnSync reads it as no timeout at all');
});

test('a BASELINE that hangs is bounded too, and says it is a test bug rather than a finding', () => {
  /* ⚠️ THE FIRST DRAFT OF THE TIMEOUT FIX BOUNDED EVERY MUTANT AND LEFT THIS PATH UNBOUNDED, so a
     genuinely hanging test file still wedged the gate forever — the identical failure the change
     exists to remove, on the one run that happens first every single time. Caught by the pre-push
     review, which reproduced it against the shipped function rather than reading it.
     The baseline cannot derive its bound the way a mutant does: the per-mutant limit is ten times
     how long the baseline TOOK, so it does not exist until the baseline has returned. Hence an
     absolute one, and hence this test — the branch reading `baseline.timedOut` was unreachable. */
  const lines = [];
  const res = mutationRun({
    root: FIXTURES, appRel: 'app.js', testDir: '.', sandboxName: 'fixture-hang',
    targets: [{ fn: 'priceMoved', tests: ['hang.test.js'] }], allow: [], baselineMs: 700,
  }, (m) => lines.push(m));

  assert.strictEqual(res.baselineOk, false, 'a hanging baseline is not a baseline the gate may report from');
  assert.strictEqual(res.ran, 0, 'and NOT ONE mutant may run against it — every verdict would be noise');
  assert.match(lines.join('\n'), /BASELINE TIMED OUT/);
  assert.match(lines.join('\n'), /bug in a TEST rather than a finding/,
    'the message must say which kind of problem this is, or it reads as a finding about js/app.js');
  assert.match(lines.join('\n'), /hang\.test\.js/, 'and name the files, so it can be acted on');
});

test('a crash is NOT reported as a hang — the two look alike and mean different things', () => {
  /* Measured against Node rather than assumed:
       timeout      -> status null, signal SIGKILL, error.code ETIMEDOUT
       self-SIGKILL -> status null, signal SIGKILL, error undefined
     The first draft accepted `status === null && signal != null`, which is EVERY signal-killed
     child — an OOM kill, a native abort, a cancelled CI job. Both paths count as killed, so nothing
     would have gone green that should not; it would have put the wrong CAUSE in the report and sent
     someone looking for a loop that was never there. Caught by the pre-push review. */
  const { spawnSync } = require('node:child_process');
  const killed = spawnSync(process.execPath, ['-e', 'process.kill(process.pid,"SIGKILL")'],
    { timeout: 10000, killSignal: 'SIGKILL', encoding: 'utf8' });
  assert.strictEqual(killed.status, null, 'sanity: a signal-killed child has no exit status');
  assert.ok(killed.signal != null, 'sanity: and it does carry a signal');
  assert.strictEqual(killed.error, undefined,
    'THE DISCRIMINATOR: only a real timeout carries an error, so the classifier must key on that');

  const timedOut = spawnSync(process.execPath, ['-e', 'while(true){}'],
    { timeout: 300, killSignal: 'SIGKILL', encoding: 'utf8' });
  assert.strictEqual(timedOut.error && timedOut.error.code, 'ETIMEDOUT');

  /* AND THE CLASSIFIER ITSELF, not just the platform behaviour underneath it. Asserting Node's
     semantics alone left this reversible: putting the broad `status === null && signal != null` form
     back kept every assertion above green, because none of them ran runTests. Found by mutating it. */
  const crashed = runTests(FIXTURES, '.', ['crash.test.js'], 10000);
  assert.strictEqual(crashed.ok, false, 'a crashing test file has not passed');
  assert.strictEqual(crashed.timedOut, false,
    'and it is an ORDINARY kill — reporting it as a hang sends someone hunting a loop that is not there');

  const hung = runTests(FIXTURES, '.', ['hang.test.js'], 500);
  assert.strictEqual(hung.ok, false);
  assert.strictEqual(hung.timedOut, true, 'while a real hang must still be recognised as one');
});

test('the gate ran real mutants against a real baseline', () => {
  assert.strictEqual(res.baselineOk, true, 'a red baseline would make every mutant read as killed');
  /* THE CALL SITE, not just the function. This run passes no `mutantMs`, so it takes the derived
     branch — and asserting the resolved value is what stops someone replacing that call with 0.
     spawnSync reads 0 as NO TIMEOUT AT ALL, so that one character puts the hang back everywhere
     while every other test in this file, which passes its bound explicitly, stays green. */
  assert.ok(res.mutantMs >= 5000, `the derived per-mutant bound must be real, got ${res.mutantMs}`);
  assert.ok(res.ran >= 10, `the fixture should yield a double-figure mutant count, got ${res.ran}`);
});

test('a test file that pins every condition leaves NO survivor — the gate can pass', () => {
  const survived = res.survivors.filter((s) => s.tests.includes('strong.test.js'));
  assert.deepStrictEqual(survived.map((s) => s.key), [],
    'strong.test.js asserts every branch, so nothing should get through');
});

test('a test file that pins NOTHING leaves survivors — the gate can fail', () => {
  const survived = res.survivors.filter((s) => s.tests.includes('weak.test.js'));
  assert.ok(survived.length >= 5,
    `weak.test.js asserts only that a boolean comes back, so most mutants must survive; got ${survived.length}`);
  // And the survivors are the guard conditions themselves, not incidental noise.
  assert.ok(survived.some((s) => s.op === 'equality'), 'an equality flip must be among them');
  assert.ok(survived.some((s) => s.op === 'literal'), 'a boolean-literal flip must be among them');
});

test('the same code, judged twice, gives opposite answers — so the verdict is about the TESTS', () => {
  // The one comparison that rules out "the harness always says X". Identical mutants, identical
  // source, two test files: everything dies against one and most survive against the other.
  const strong = res.survivors.filter((s) => s.tests.includes('strong.test.js')).length;
  const weak = res.survivors.filter((s) => s.tests.includes('weak.test.js')).length;
  assert.strictEqual(strong, 0);
  assert.ok(weak > strong);
  assert.strictEqual(res.killed + res.survivors.length + res.allowed.length, res.ran, 'every mutant is accounted for');
});

/* ---------------------------------------------------------------------------
   2. The engine's own limits, pinned so a "tidy-up" cannot quietly widen them.
   --------------------------------------------------------------------------- */

test('nothing inside a string, comment, template or regex is ever mutated', () => {
  const src = [
    'function f(a, b){',
    '  var s = "a && b || true";',
    "  var t = 'x === y';",
    '  // a real comment with && and === in it',
    '  /* and a block one with || and false */',
    '  var re = /a===b|c&&d/g;',
    '  var tpl = `${a === b} && true`;',
    '  return a === b;',
    '}',
  ].join('\n');
  const ms = mutantsFor(src, 0, 'f');
  assert.strictEqual(ms.length, 1, `only the real === should be mutable, got ${ms.map((m) => m.line).join(' | ')}`);
  assert.strictEqual(ms[0].line, 'return a === b;');
});

test('division is not read as a regex', () => {
  const src = 'function g(a, b){ return (a) / (b) === a/b; }';
  const ms = mutantsFor(src, 0, 'g');
  assert.strictEqual(ms.length, 1, 'the === is the only operator here — the slashes are division');
  assert.strictEqual(ms[0].op, 'equality');
});

test('a regex after a KEYWORD is a regex, not division — found by the pre-push review', () => {
  // The cheap heuristic is "the previous character looks like an identifier, so this divides", and
  // `return /a&&b/` ends in `n`. That called it division, never entered regex mode, and emitted a
  // mutant flipping the `&&` INSIDE the pattern: a mutant that is not the operator it claims to be.
  const cases = [
    ['function f(a){ return /a&&b/.test(a) === true; }', 'return'],
    ['function f(a){ if(typeof a === "s" && /p||q/.test(a)) return 1; }', 'a &&-guarded regex'],
    ['function f(a){ return a.replace(/x&&y/g, "z") === ""; }', 'a regex argument'],
  ];
  for (const [src, why] of cases) {
    const open = src.indexOf('/');
    const close = src.indexOf('/', open + 1);
    const inside = mutantsFor(src, 0, 'f').filter((m) => m.rel > open && m.rel < close);
    assert.deepStrictEqual(inside.map((m) => m.key), [],
      `${why}: a mutant landed inside the regex literal, between offsets ${open} and ${close}`);
  }
  // and the real operators around them are still found
  assert.ok(mutantsFor('function f(a){ return /a&&b/.test(a) === true; }', 0, 'f')
    .some((m) => m.op === 'equality'), 'the === outside the pattern is still mutable');
});

test('a number, a call and a string are values, so a following slash divides', () => {
  for (const src of [
    'function f(a){ var n = 10 / 2; return n === 5; }',
    'function f(a){ return g(a) / 2 === 1; }',
    'function f(a){ return a[0] / 2 === 1; }',
  ]) {
    assert.strictEqual(mutantsFor(src, 0, 'f').filter((m) => m.op === 'equality').length, 1,
      `the === must survive the scan in: ${src}`);
  }
});

test('an operator is never read as a slice of a longer one', () => {
  const src = 'function h(a, b){ if(a !== b && a >= 1) return a => b; return a <= b; }';
  const ops = mutantsFor(src, 0, 'h').map((m) => `${m.from}>${m.to}`).sort();
  assert.ok(ops.includes('!==>==='), '!== must be taken whole, not as ! then ==');
  assert.ok(ops.includes('>=>>'), '>= must be taken whole');
  assert.ok(!ops.some((o) => o.startsWith('=>')), 'the arrow function must not be mutated as an operator');
});

test('every emitted mutant still parses — a syntax error would kill the whole suite for the wrong reason', () => {
  const src = fs.readFileSync(path.join(FIXTURES, 'app.js'), 'utf8');
  const fn = src.slice(src.indexOf('function priceMoved'), src.indexOf('module.exports'));
  for (const m of mutantsFor(fn, 0, 'priceMoved')) {
    const mutated = apply(fn, m, 'rel');
    assert.doesNotThrow(() => new Function(`return (${mutated})`), `mutant did not parse: ${m.key}`);
  }
});

test('the code mask covers the whole source and marks the non-code regions out', () => {
  const src = 'var a = 1; // && \n var b = "||";';
  const mask = codeMask(src);
  assert.strictEqual(mask.length, src.length, 'one flag per byte, so no offset can drift');
  assert.strictEqual(mask[src.indexOf('&&')], 0, 'inside a comment');
  assert.strictEqual(mask[src.indexOf('||')], 0, 'inside a string');
  assert.strictEqual(mask[src.indexOf('var')], 1, 'ordinary code');
});
