/*
 * extractfn.test.js — the extractor, tested.
 *
 * Every source-slicing test in this suite depends on tests/_extractfn.js, and until this file existed
 * NOTHING checked it. That is the same shape as the defect the fold-in batches kept paying for: a
 * helper trusted by everything, verified by nothing.
 *
 * The pins that matter are the FAILURE ones. A brace-naive extractor that ends a slice early does not
 * throw — it returns a shorter string that looks like a function, and the test using it then asserts
 * against a truncated body and passes. So the guard here is that a mis-slice RAISES, naming the
 * function, rather than being handed back.
 *
 * The last test is the reason the helper is shared at all: it fails if a test file grows its own copy
 * again. Forty-eight of them had, and three of those forty-eight carried the parse guard while the
 * other forty-five did not.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn, extractVar, sliceBetween, APP_PATH } = require('./_extractfn');

/* ---- loadApp ------------------------------------------------------------------------------- */

test('loadApp reads the shipped js/app.js, not a copy', () => {
  const src = loadApp();
  assert.strictEqual(src, fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8'));
  assert.strictEqual(APP_PATH, path.join(__dirname, '..', 'js', 'app.js'));
  assert.match(src, /var APP_VERSION='v\d+';/, 'and it really is the client script');
});

/* ---- extractFn ----------------------------------------------------------------------------- */

const NESTED = `
var x=1;
function outer(a){
  if (a) { return { k: 1 }; }
  return 0;
}
function after(){ return 9; }
`;

test('extractFn returns the whole function, nested braces included, and stops at its close', () => {
  const out = extractFn(NESTED, 'outer');
  assert.match(out, /^function outer\(a\)\{/);
  assert.ok(out.endsWith('}'), 'ends on the function’s own closing brace');
  assert.ok(out.includes('return { k: 1 };'), 'the nested block survives');
  assert.ok(!out.includes('function after'), 'and the next function is not swallowed');
});

test('extractFn names the function it could not find', () => {
  assert.throws(() => extractFn(NESTED, 'missing'), /function not found -> missing/);
});

test('extractFn throws on unbalanced braces rather than returning a partial slice', () => {
  assert.throws(() => extractFn('function broken(){ if (1) { return 2;\n', 'broken'),
    /unbalanced braces for broken/);
});

/* The guard that only 3 of the 48 private copies carried (CodeRabbit, PR #50). The depth counter does
   not know strings, so the `}` inside one ends the slice early — the extracted text is then a
   syntactically broken fragment. Silently returning it puts a truncated function into a test's
   sandbox, where it either throws a syntax error naming the whole bundle or, worse, still parses. */
test('a brace inside a string mis-slices, so the parse guard catches it and names the function', () => {
  const trap = 'function fooled(){ const s = \'}\'; return s; }';
  assert.throws(() => extractFn(trap, 'fooled'), /extracted fooled does not parse/);
});

test('the parse guard does not reject a function that merely mentions braces safely', () => {
  const ok = 'function fine(){ const s = "{ }"; return s; }';   // balanced inside the string
  assert.strictEqual(extractFn(ok, 'fine'), ok);
});

/* Hoisting makes the LAST top-level definition win, so a name defined twice must be selected
   deliberately. tests/empty-states.test.js keeps a LIVE_OCC map for exactly this. */
const TWICE = 'function dup(){ return 1; }\nfunction dup(){ return 2; }\n';

test('occurrence picks the Nth definition, and defaults to the first', () => {
  assert.ok(extractFn(TWICE, 'dup').includes('return 1'));
  assert.ok(extractFn(TWICE, 'dup', { occurrence: 1 }).includes('return 1'));
  assert.ok(extractFn(TWICE, 'dup', { occurrence: 2 }).includes('return 2'));
});

test('an occurrence that does not exist says WHICH one was missing', () => {
  assert.throws(() => extractFn(TWICE, 'dup', { occurrence: 3 }), /function #3 not found -> dup/);
});

/* ---- extractVar ---------------------------------------------------------------------------- */

test('extractVar takes the whole declaration and stops at the depth-0 semicolon', () => {
  const src = 'var T={a:1, b:{c:2}};\nfunction next(){}';
  assert.strictEqual(extractVar(src, 'T'), 'var T={a:1, b:{c:2}};');
});

test('extractVar is not fooled by a trailing comment after the semicolon', () => {
  // the v92 regression: a lazy `;\s*$` ran past this line and swallowed the next function whole
  const src = 'var FLOOR=45;   // tuning\nfunction next(){ return 1; }';
  assert.strictEqual(extractVar(src, 'FLOOR'), 'var FLOOR=45;');
});

test('extractVar names the var it could not find', () => {
  assert.throws(() => extractVar('var A=1;', 'B'), /var not found -> B/);
});

test('extractVar throws when the declaration never terminates', () => {
  assert.throws(() => extractVar('var A={a:1}', 'A'), /unterminated var -> A/);
});

/* ---- sliceBetween -------------------------------------------------------------------------- */

test('sliceBetween keeps the start marker and stops before the end marker', () => {
  const src = 'head\nSTART body one\nbody two\nEND tail';
  assert.strictEqual(sliceBetween(src, 'START', 'END'), 'START body one\nbody two\n');
});

test('sliceBetween names whichever marker is missing', () => {
  assert.throws(() => sliceBetween('a END b', 'START', 'END'), /start marker not found/);
  assert.throws(() => sliceBetween('a START b', 'START', 'END'), /end marker not found/);
});

test('the protected parser region’s own anchors still slice', () => {
  // the anchors tests/_extract.js uses; CLAUDE.md forbids editing between them
  const block = sliceBetween(loadApp(), 'var INV_EXCLUDE=', 'function unitLabelFor(');
  assert.ok(block.startsWith('var INV_EXCLUDE='));
  assert.ok(block.length > 1000, 'the region is substantial, so an empty slice means the anchors moved');
});

/* ---- the reason it is shared --------------------------------------------------------------- */

test('no test file carries its own extractFn/extractVar/sliceBetween copy', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  ));
  const offenders = walk(__dirname)
    .filter((f) => f.endsWith('.js') && path.basename(f) !== '_extractfn.js')
    .filter((f) => /\bfunction (extractFn|extractVar|sliceBetween)\s*\(/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(path.join(__dirname, '..'), f));
  assert.deepStrictEqual(offenders, [],
    'require tests/_extractfn instead — a private copy is how 45 files ended up without the parse guard');
});
