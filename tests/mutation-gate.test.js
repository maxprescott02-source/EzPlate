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
const { mutationRun } = require('./mutation/run');

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

test('the gate ran real mutants against a real baseline', () => {
  assert.strictEqual(res.baselineOk, true, 'a red baseline would make every mutant read as killed');
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
