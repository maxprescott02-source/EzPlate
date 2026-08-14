/*
 * _extractfn.js — the source-slicing helpers, in ONE place.
 *
 * js/app.js is a browser script (window/document/Supabase), so it cannot be require()'d. Every test
 * that wants to exercise real shipped logic reads app.js as TEXT, cuts one function or one `var` out
 * of it, and runs that slice in a sandbox. This file is the cutting.
 *
 * WHY IT EXISTS SEPARATELY FROM _extract.js. `_extract.js` ends `module.exports = build()`, which
 * returns a ready-built harness object of pre-extracted functions. Its own extractFn/extractVar/
 * loadApp were never exported, so a test wanting a function the harness does not already provide had
 * no way to reach them and wrote its own copy. Forty-eight files did exactly that.
 *
 * They had already DRIFTED, which is the argument for this file rather than a tidiness one:
 *   - 37 took (src, name), 10 closed over a module-level SRC, 1 took (src, name, occ);
 *   - THREE carried the parse guard below and FORTY-FIVE did not, so the mis-slice that guard was
 *     written for (CodeRabbit, PR #50) was caught in three files and silent in the rest.
 * The guard is now on for every caller, which is the whole point of there being one implementation.
 *
 * Requiring this file does NOT build the harness — it reads nothing until you call it. A test that
 * wants one function should not pay for compiling the entire insight pipeline.
 */
const fs = require('fs');
const path = require('path');

const APP_PATH = path.join(__dirname, '..', 'js', 'app.js');

/** The shipped client script, as text. */
function loadApp() {
  return fs.readFileSync(APP_PATH, 'utf8');
}

/**
 * Grab a contiguous block between two source markers (inclusive of start, up to end).
 * Used for the protected parser region, which is sliced by its anchors rather than by name.
 */
function sliceBetween(src, startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error(`sliceBetween: start marker not found -> "${startMarker}". app.js changed; update the caller (see the stack below)`);
  const j = src.indexOf(endMarker, i);
  if (j < 0) throw new Error(`sliceBetween: end marker not found -> "${endMarker}". app.js changed; update the caller (see the stack below)`);
  return src.slice(i, j);
}

/**
 * Grab a single top-level `var NAME = ...;` declaration verbatim, so a tuning table lives in exactly
 * ONE place. v92: the alternative is a hand-copied mirror in a test's sandbox, which is the "second
 * copy to drift" this machinery exists to avoid — INSIGHT_VALUE in particular is pure tuning and
 * would silently diverge the moment anyone retunes it in app.js.
 */
function extractVar(src, name) {
  const m = new RegExp(`^var ${name}\\s*=`, 'm').exec(src);
  if (!m) throw new Error(`extractVar: var not found -> ${name}. app.js changed; update the caller (see the stack below)`);
  // scan to the terminating semicolon at nesting depth 0 — a trailing `// comment` after the `;`, or a
  // `;` inside a nested object/array, must not end it. (A regex got this wrong: `var INSIGHT_FLOOR=45;`
  // has a trailing comment, so a lazy `;\s*$` ran on and swallowed the next function whole.)
  let depth = 0;
  for (let n = m.index + m[0].length; n < src.length; n++) {
    const ch = src[n];
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    else if (ch === '}' || ch === ']' || ch === ')') depth--;
    else if (ch === ';' && depth === 0) return src.slice(m.index, n + 1);
  }
  throw new Error(`extractVar: unterminated var -> ${name}`);
}

/**
 * Grab a single named function by brace-matching (robust to line moves).
 *
 * `opts.occurrence` (1-based, default 1) picks the Nth `function NAME(` in the source. Hoisting makes
 * the LAST top-level definition win at runtime, so a test pinning a name that is defined more than
 * once must say WHICH one it means rather than silently taking the first. No name in app.js is
 * currently defined twice — tests/housekeeping.test.js fails if one ever is — so the parameter is
 * there to pin a future duplicate deliberately.
 */
function extractFn(src, name, opts) {
  const occurrence = (opts && opts.occurrence) || 1;
  const sig = `function ${name}(`;
  let i = -1;
  for (let k = 0; k < occurrence; k++) {
    i = src.indexOf(sig, i + 1);
    if (i < 0) {
      throw new Error(occurrence > 1
        ? `extractFn: function #${occurrence} not found -> ${name}. app.js changed; update the caller (see the stack below)`
        : `extractFn: function not found -> ${name}. app.js changed; update the caller (see the stack below)`);
    }
  }
  /* 186: KEEP A PRECEDING `async`. The signature search finds the `function` keyword, so an async
     function was sliced from there — dropping the modifier and turning every `await` in the body
     into a syntax error. It surfaced as "await is only valid in async functions" pointing at the
     extractor rather than at the function, which is exactly the confusion the parse check below
     exists to prevent; it just could not see a cause it had created itself. */
  const before = src.slice(Math.max(0, i - 12), i);
  const am = /(?:^|[^\w$])(async\s+)$/.exec(before);
  if (am) i -= am[1].length;
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) {
      const out = src.slice(i, n + 1);
      /* The depth counter is brace-NAIVE: it does not know strings, template literals, regexes or
         comments, so a `}` inside any of those would end the slice early. Writing a JS parser here
         would be worse than the problem. Instead, prove every slice is real JavaScript and name the
         culprit when it is not — without this, a bad extraction surfaces as a syntax error on the
         whole concatenated sandbox bundle, with nothing saying which function broke it.
         (CodeRabbit, PR #50. It lived in three private copies and is now on for all of them.) */
      try {
        // eslint-disable-next-line no-new-func
        new Function(`return (${out})`);
      } catch (e) {
        throw new Error(`extractFn: extracted ${name} does not parse (${e.message}). A brace inside a `
          + 'string, comment or regex in app.js can fool this extractor; update the caller (see the stack below)');
      }
      return out;
    }
  }
  throw new Error(`extractFn: unbalanced braces for ${name}`);
}

module.exports = { loadApp, extractFn, extractVar, sliceBetween, APP_PATH };
