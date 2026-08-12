/*
 * mutate.js — the mutation ENGINE. Text in, mutants out. Pure: no I/O, no child processes, no deps.
 *
 * WHY THIS EXISTS AT ALL, rather than Stryker. Every test in this repo reads js/app.js as TEXT and
 * cuts a function out of it by exact anchor (`tests/_extractfn.js`). Stryker rewrites the file from
 * its own AST, so `var INV_EXCLUDE=` becomes `var INV_EXCLUDE = stryMutAct_…(…) ? … : …` and every
 * anchor stops matching — the whole suite would go red on mutant #1 and stay red, which reports
 * 100% of mutants killed and proves nothing. A mutation gate that always passes is the exact defect
 * this gate was built to catch, one level up. So the mutation is TEXTUAL, at operator granularity,
 * and leaves every byte it is not changing exactly where it was.
 *
 * WHAT IT DOES NOT DO, stated so nobody trusts it further than it goes:
 *   - It does not parse JavaScript. It scans well enough to know code from strings, comments,
 *     template literals and regex literals, and it refuses to emit a mutant whose function no
 *     longer parses (same `new Function` check _extractfn uses). That is the whole guarantee.
 *   - Code INSIDE a template literal's `${…}` is skipped, not mutated. Marking the template opaque
 *     is what keeps the scanner honest about its own limits.
 *   - There is no equivalent-mutant detection. A survivor is a claim to be judged by a human, which
 *     is why targets.js has an allowance list with a written reason per entry.
 */

/* Ordered longest-first: the first operator that matches at an index wins and consumes its length,
   so `!==` can never be read as `!` and `>=` can never be read as `>`. */
const OPS = [
  { op: 'equality',   from: '===', to: '!==' },
  { op: 'equality',   from: '!==', to: '===' },
  { op: 'equality',   from: '==',  to: '!=' },
  { op: 'equality',   from: '!=',  to: '==' },
  { op: 'relational', from: '>=',  to: '>' },
  { op: 'relational', from: '<=',  to: '<' },
  { op: 'relational', from: '>',   to: '>=' },
  { op: 'relational', from: '<',   to: '<=' },
  { op: 'logical',    from: '&&',  to: '||' },
  { op: 'logical',    from: '||',  to: '&&' },
  { op: 'literal',    from: 'true',  to: 'false' },
  { op: 'literal',    from: 'false', to: 'true' },
  { op: 'negation',   from: '!',   to: '' },
];

const IDENT = /[A-Za-z0-9_$]/;
/* Deciding whether a `/` opens a regex or divides is the one genuinely ambiguous thing in a JS
   scanner, and the cheap heuristic ("the previous character looks like an identifier, so it is a
   value, so this divides") is WRONG after a keyword. `return /a&&b/.test(x)` ends in `n`, so the
   heuristic called it division, never entered regex mode, and happily emitted a mutant flipping the
   `&&` INSIDE the regex — a mutant that is not the operator it claims to be, corrupting the survivor
   count and any allowance keyed to it. None of the shipped targets contain one; several of the
   functions queued to become targets plausibly do. So the check reads the whole preceding WORD. */
const KEYWORD_BEFORE_REGEX = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await',
]);
/* A `(` after one of these is a call the void-call operator may delete; after anything else it is
   control flow or a function definition and deleting the line would only change whether it parses. */
const NOT_A_CALL = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'typeof', 'new', 'do', 'else']);

/**
 * Mark every byte of `src` that is ordinary code — 1 for code, 0 for the inside of a string,
 * template literal, comment or regex literal. Nothing outside the mask is ever mutated.
 */
/**
 * Can a `/` at this point open a regex literal, given what precedes it?
 * `prevIdx` is the index of the last significant character before it, or -1.
 */
function regexAllowed(src, prevIdx) {
  if (prevIdx < 0) return true;                       // start of the slice
  const p = src[prevIdx];
  if (p === ')' || p === ']') return false;           // end of a call, group or index: a value
  if (p === '"' || p === "'" || p === '`') return false;   // end of a string: also a value
  if (!IDENT.test(p)) return true;                    // an operator, comma or brace: a regex may follow
  let s = prevIdx;
  while (s >= 0 && IDENT.test(src[s])) s--;
  return KEYWORD_BEFORE_REGEX.has(src.slice(s + 1, prevIdx + 1));
}

function codeMask(src) {
  const mask = new Uint8Array(src.length);
  let i = 0;
  let prevIdx = -1;                    // index of the last significant code character
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) { if (src[i] === '\\') i++; i++; }
      prevIdx = i; i++; continue;      // the closing quote is the last significant character
    }
    if (c === '`') {                   // template: opaque, `${…}` included. See the header.
      i++;
      let depth = 0;
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === '$' && src[i + 1] === '{') { depth++; i += 2; continue; }
        if (ch === '}' && depth > 0) { depth--; i++; continue; }
        if (ch === '`' && depth === 0) break;
        i++;
      }
      prevIdx = i; i++; continue;
    }
    // A `/` is a regex literal unless what precedes it could end an expression, in which case it divides.
    if (c === '/' && regexAllowed(src, prevIdx)) {
      i++;
      let inClass = false;
      while (i < src.length) {
        const ch = src[i];
        if (ch === '\\') { i += 2; continue; }
        if (ch === '[') inClass = true;
        else if (ch === ']') inClass = false;
        else if (ch === '/' && !inClass) break;
        else if (ch === '\n') break;   // unterminated: bail rather than swallow the rest of the file
        i++;
      }
      i++;
      while (i < src.length && /[a-z]/.test(src[i])) i++;   // flags
      prevIdx = i - 1; continue;
    }
    mask[i] = 1;
    if (!/\s/.test(c)) prevIdx = i;
    i++;
  }
  return mask;
}

/** True when the operator match at [i, i+len) is a real occurrence of that operator and not a slice of a longer one. */
function boundaryOk(src, i, from) {
  const before = src[i - 1] || '';
  const after = src[i + from.length] || '';
  if (/^[A-Za-z]/.test(from)) {                          // `true` / `false`
    if (IDENT.test(before) || before === '.') return false;
    if (IDENT.test(after)) return false;
    return true;
  }
  if (from === '>' || from === '<') {
    if (before === '=' || before === from || before === '<' || before === '>') return false;  // `=>`, `<<`, `>>`
    if (after === '=' || after === from) return false;
    return true;
  }
  if (from === '!') return after !== '=';
  if (from === '==' || from === '!=') return after !== '=' && before !== '=' && before !== '!';
  if (from === '&&' || from === '||') return before !== from[0] && after !== from[0];
  return true;
}

/** Operator mutants inside `src` (a whole function's source), offset by `base` in the parent file. */
function operatorMutants(src, base) {
  const mask = codeMask(src);
  const out = [];
  let i = 0;
  while (i < src.length) {
    if (!mask[i]) { i++; continue; }
    let matched = null;
    for (const o of OPS) {
      if (!src.startsWith(o.from, i)) continue;
      let allCode = true;
      for (let k = 0; k < o.from.length; k++) if (!mask[i + k]) allCode = false;
      if (!allCode) continue;
      if (!boundaryOk(src, i, o.from)) continue;
      matched = o;
      break;
    }
    if (!matched) { i++; continue; }
    out.push({ op: matched.op, from: matched.from, to: matched.to, at: base + i, len: matched.from.length, rel: i });
    i += matched.from.length;
  }
  return out;
}

/**
 * Delete a whole call statement that sits alone on its line.
 *
 * The highest-value operator here, because the defect class this gate exists for is a test that
 * never asserts an effect — `S.purges` read but never incremented, a spy whose call was never
 * checked. Flipping an operator cannot catch that; removing the call can.
 */
function voidCallMutants(src, base) {
  const mask = codeMask(src);
  const out = [];
  let lineStart = 0;
  for (let i = 0; i <= src.length; i++) {
    if (i !== src.length && src[i] !== '\n') continue;
    const line = src.slice(lineStart, i);
    const m = /^(\s*)([A-Za-z_$][\w$.]*)\(.*\);\s*$/.exec(line);
    if (m && !NOT_A_CALL.has(m[2].split('.')[0])) {
      const bodyStart = lineStart + m[1].length;
      let codeOnly = true, open = 0, close = 0;
      for (let k = bodyStart; k < i; k++) {
        if (!mask[k]) { codeOnly = false; break; }
        if (src[k] === '(') open++;
        else if (src[k] === ')') close++;
      }
      const stmt = src.slice(bodyStart, i).replace(/\s+$/, '');
      if (codeOnly && open === close && open > 0) {
        out.push({ op: 'void-call', from: stmt, to: '', at: base + bodyStart, len: stmt.length, rel: bodyStart });
      }
    }
    lineStart = i + 1;
  }
  return out;
}

/** `src` with the mutant applied. Works on the function slice (rel) or the whole file (at). */
function apply(text, mutant, offsetKey) {
  const at = mutant[offsetKey];
  return text.slice(0, at) + mutant.to + text.slice(at + mutant.len);
}

/** Does the mutated function still parse? A mutant that does not is dropped, never counted as killed. */
function parses(fnSrc) {
  try { new Function(`return (${fnSrc})`); return true; } catch (e) { return false; }
}

/**
 * Every mutant for one function.
 * `fnSrc` is the function's exact source; `base` is its byte offset inside the file it came from.
 * Each mutant carries `at` (offset in the file) and `rel` (offset in fnSrc) so callers can apply it
 * to either without recomputing anything.
 */
function mutantsFor(fnSrc, base, fnName) {
  const raw = operatorMutants(fnSrc, base).concat(voidCallMutants(fnSrc, base));
  const out = [];
  for (const m of raw) {
    if (!parses(apply(fnSrc, m, 'rel'))) continue;      // e.g. dropping a `!` that carried an IIFE
    const lineNo = fnSrc.slice(0, m.rel).split('\n').length;          // 1-based, within the function
    const lines = fnSrc.split('\n');
    const lineText = lines[lineNo - 1].trim();
    let nth = 0;
    const lineFrom = fnSrc.lastIndexOf('\n', m.rel) + 1;
    for (const other of raw) {
      if (other === m) break;
      if (other.from === m.from && other.to === m.to && other.rel >= lineFrom && other.rel < m.rel) nth++;
    }
    out.push({
      fn: fnName,
      op: m.op,
      from: m.from,
      to: m.to,
      at: m.at,
      rel: m.rel,
      len: m.len,
      fnLine: lineNo,
      line: lineText,
      nth,
      /* The stable identity of a mutant. Deliberately NOT a line number: line numbers in js/app.js
         drift every batch, and an allowance keyed to one would silently start matching a different
         mutant. Keyed to the line's TEXT instead, so an allowance stops matching the moment the code
         it excused is edited — the survivor comes back and someone re-judges it. That is the safe
         direction to fail in. */
      key: `${fnName} :: ${lineText} :: ${m.op} ${m.from}>${m.to || '∅'} #${nth}`,
    });
  }
  return out;
}

module.exports = { codeMask, regexAllowed, operatorMutants, voidCallMutants, mutantsFor, apply, parses, OPS };
