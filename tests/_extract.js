/*
 * _extract.js — makes the pure logic inside js/app.js testable in Node.
 *
 * app.js is a browser script (it touches window/document/Supabase), so it can't
 * be require()'d directly. This helper reads it as text, pulls out ONLY the
 * dependency-free costing functions, and runs them in an isolated sandbox with a
 * stubbed debug logger. The tests therefore check the REAL shipped code — there
 * is no second copy to drift out of sync.
 *
 * If app.js is restructured and an anchor below is renamed, these tests will fail
 * loudly with a clear message telling you which anchor to update. That's intended.
 */
const fs = require('fs');
const path = require('path');

function loadApp() {
  const p = path.join(__dirname, '..', 'js', 'app.js');
  return fs.readFileSync(p, 'utf8');
}

// grab a contiguous block between two source markers (inclusive of start, up to end)
function sliceBetween(src, startMarker, endMarker) {
  const i = src.indexOf(startMarker);
  if (i < 0) throw new Error(`_extract: start marker not found -> "${startMarker}". app.js changed; update tests/_extract.js`);
  const j = src.indexOf(endMarker, i);
  if (j < 0) throw new Error(`_extract: end marker not found -> "${endMarker}". app.js changed; update tests/_extract.js`);
  return src.slice(i, j);
}

// grab a single named function by brace-matching (robust to line moves)
function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`_extract: function not found -> ${name}. app.js changed; update tests/_extract.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`_extract: unbalanced braces for ${name}`);
}

function build() {
  const src = loadApp();
  // The whole invoice-parser region lives contiguously between these two anchors.
  const parserBlock = sliceBetween(src, 'var INV_EXCLUDE=', 'function unitLabelFor(');
  // The ingredient pricing calc is a self-contained function.
  const pricingFn = extractFn(src, 'packToUnitCost');

  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    function invDbg(){}   /* stub: the app's debug logger is a no-op in tests */
    ${parserBlock}
    ${pricingFn}
    return { parsePdfLine, pdfTextToRows, packWeight, packCount, firstPairPrice, packToUnitCost, normalizePhrase, applySupplierMemory };
  `);
  return factory();
}

module.exports = build();
