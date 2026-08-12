/*
 * css-syntax.test.js — the stylesheet parses, and its comments are balanced.
 *
 * WHY THIS EXISTS, and it is not hypothetical: an edit in this batch inserted a comment body WITHOUT
 * its opening `/*`, leaving a stray `*​/` and a paragraph of English sitting where CSS declarations
 * belong. The browser did exactly what the spec says — it discarded the malformed rule AND every
 * rule after it until it could resynchronise — so `.wrap{max-width:1200px}` and the rules following
 * it were silently absent. The page still rendered, `npm test` was green, `node -c` was clean, and
 * the only symptom was a layout that measured wrong.
 *
 * THAT IS THE POINT: a CSS syntax error is SILENT. There is no parse step in this project, no build,
 * and nothing that reads style.css as anything but text — so the only way it surfaces is a
 * measurement that happens to cover the affected rule. It cost a full measure-diagnose cycle to find
 * once; this test finds it in 40ms.
 *
 * Deliberately structural rather than a full CSS parser: no dependency may be added to this project,
 * and the two failures that can silently swallow rules are unbalanced comments and unbalanced braces.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CSS_PATH = path.join(__dirname, '..', 'css', 'style.css');
const src = fs.readFileSync(CSS_PATH, 'utf8');

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

test('every comment is opened and closed, in order', () => {
  let i = 0, open = null, count = 0;
  while (i < src.length) {
    if (open === null) {
      const at = src.indexOf('/*', i);
      const stray = src.indexOf('*/', i);
      // a `*/` reached before any `/*` is the exact defect this file was written for
      assert.ok(
        stray === -1 || (at !== -1 && at < stray),
        `line ${lineOf(src, stray)}: a closing "*/" with no matching "/*" — every rule after it is silently discarded by the CSS parser`
      );
      if (at === -1) break;
      open = at; i = at + 2;
    } else {
      const close = src.indexOf('*/', i);
      assert.notStrictEqual(close, -1, `line ${lineOf(src, open)}: a comment is opened and never closed — everything after it is swallowed`);
      open = null; i = close + 2; count++;
    }
  }
  assert.strictEqual(open, null, 'the file ends inside an unclosed comment');
  assert.ok(count > 100, `sanity: found only ${count} comments, so the scan is probably not working`);
});

test('braces balance once comments and strings are removed', () => {
  // blank out comments, preserving newlines so reported line numbers stay true
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // and quoted values, which legitimately contain braces (the data: URI illustrations do)
  const clean = noComments.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, (m) => m.replace(/[^\n]/g, ' '));

  let depth = 0;
  const lines = clean.split('\n');
  for (let n = 0; n < lines.length; n++) {
    for (const ch of lines[n]) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        assert.ok(depth >= 0, `line ${n + 1}: a closing brace with nothing open — the rest of the file is parsed as garbage`);
      }
    }
  }
  assert.strictEqual(depth, 0, `the file ends ${depth} brace(s) deep — an unclosed block swallows every rule after it`);
});

/* A third check — "prose sitting inside a declaration block" — was written and DELETED rather than
   shipped. It flagged a legitimate multi-line `transition:` continuation as prose, and it would have
   MISSED the real defect anyway, because the stray paragraph contained commas and its heuristic
   treated a trailing comma as a selector fragment. A test that both false-positives and
   false-negatives is worse than no test: the first assertion above catches the actual bug — a `*/`
   with no `/*` — exactly and without guessing. */
