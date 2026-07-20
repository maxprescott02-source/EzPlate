/*
 * search-matcher.test.js — v59: the ONE shared token matcher every search bar uses.
 * Token-order-independent; every token must be a substring of the haystack, any order.
 * searchTokens + matchTokens are brace-extracted from the REAL shipped js/app.js.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`search-matcher: function not found -> ${name}`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`search-matcher: unbalanced braces for ${name}`);
}
const { searchTokens, matchTokens } = new Function(`
  "use strict";
  ${extractFn(SRC, 'searchTokens')}
  ${extractFn(SRC, 'matchTokens')}
  return { searchTokens, matchTokens };
`)();

const match = (q, hay) => matchTokens(searchTokens(q), hay.toLowerCase());

test('every permutation of the query tokens matches the same haystack', () => {
  const hay = 'bread gluten free';
  for (const q of ['gluten free bread', 'bread gluten free', 'free bread gluten', 'gluten bread free']) {
    assert.ok(match(q, hay), `"${q}" should match "${hay}"`);
  }
});

test('partial tokens match as substrings (prefix or mid-word)', () => {
  assert.ok(match('glut fr', 'bread gluten free'));
  assert.ok(match('read', 'bread gluten free'), 'mid-word substring counts');
});

test('a token absent from the haystack fails the whole query', () => {
  assert.ok(!match('gluten cheese', 'bread gluten free'), 'cheese is not present');
  assert.ok(!match('zzz', 'bread gluten free'));
});

test('an empty / whitespace query matches everything', () => {
  assert.ok(match('', 'anything at all'));
  assert.ok(match('   ', 'anything at all'));
  assert.deepStrictEqual(searchTokens('  '), []);
});

test('case-insensitive, and extra whitespace between tokens is ignored', () => {
  assert.ok(match('GLUTEN   Free', 'bread gluten free'));
  assert.deepStrictEqual(searchTokens('  a   b '), ['a', 'b']);
});
