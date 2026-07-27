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
  // v62: the PURE AI-merge logic — dependency-free, so the rule table is testable against canned
  // Gemini readings with no DOM and no live API. gemHist is NOT pulled in (it needs cpbu/byId);
  // tests pass the canonical H directly.
  const gemMerge = extractFn(src, 'gemMergeLine');
  const gemCanon = extractFn(src, 'gemCanon');
  const gemPackEq = extractFn(src, 'gemPackEq');
  // v63: the PURE suspected-wrong-match decision. Dependency-free (aiCands/histories passed in), no DOM.
  const gemMatchSuspect = extractFn(src, 'gemMatchSuspect');
  // v73: the PURE distiller of a Gemini line + header supplier into the add-new form's clean
  // descriptive candidates. Dependency-free, no DOM — testable against canned readings.
  const gemCleanFields = extractFn(src, 'gemCleanFields');
  // v63/v67/v90: the deterministic insight engine — one pure function PER insight FAMILY plus a pure
  // selector, with deriveInsights orchestrating. Every family takes primitives (the impure
  // computeInsights builds them from live data), so each is testable with no DOM and no live API.
  // v90 rewrote what qualifies: ruleA replaces the v74 nonObvious guard, and six families that only
  // restated the menu table or implied sales volume were deleted (see the note in js/app.js).
  const ruleA = extractFn(src, 'ruleA');
  const scopeAllows = extractFn(src, 'scopeAllows');
  const pts1 = extractFn(src, 'pts1');
  const insCostBase = extractFn(src, 'insCostBase');           // F1: cost-base movement, culprit named
  const insDrift = extractFn(src, 'insDrift');                 // F2: one plate's cost drift
  const insCategory = extractFn(src, 'insCategory');           // F3: category imbalance (menu-scoped)
  const insVolatility = extractFn(src, 'insVolatility');       // F4: the widest-swinging plate
  const insLongStanding = extractFn(src, 'insLongStanding');   // F5: over target through every cost change
  const insNearCluster = extractFn(src, 'insNearCluster');     // F6: the near-miss cluster
  const insSupplierReach = extractFn(src, 'insSupplierReach'); // F7: supplier concentration (global)
  const insPriceGap = extractFn(src, 'insPriceGap');           // F8: same-category unit-price spread (global)
  const insComplexity = extractFn(src, 'insComplexity');
  const insRecentChange = extractFn(src, 'insRecentChange');
  const insData = extractFn(src, 'insData');
  const insBest = extractFn(src, 'insBest');
  const healthyLine = extractFn(src, 'healthyLine'); // v71: warm all-healthy line
  const selectInsights = extractFn(src, 'selectInsights');
  const deriveInsights = extractFn(src, 'deriveInsights');
  const lightFilterPass = extractFn(src, 'lightFilterPass');   // v68: Menu margin-light filter (pure)
  const newProductRecord = extractFn(src, 'newProductRecord'); // v82 D2: pure create-form → product record (locks pack_qty/pack_unit)
  const esc = extractFn(src, 'esc');                           // v83: the app's own escaper, so extracted HTML builders escape exactly as they ship
  const builderNoMatchHtml = extractFn(src, 'builderNoMatchHtml');   // v83 item 7: pure builder-search no-match copy
  const dropPlace = extractFn(src, 'dropPlace');               // v86: pure combobox placement decision (side + max height) inside a bounding box

  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    function invDbg(){}   /* stub: the app's debug logger is a no-op in tests */
    var GEM_BAND=0.5;     /* the app's default plausibility band, mirrored for the extracted merge fn */
    var INSIGHT_DIMS={ time:1, composition:1, breadth:1, aggregation:1, distribution:1, comparison:1 };   /* v90: mirror for ruleA */
    var DROP_MIN=140, DROP_MAX=300;   /* v86: mirror of the app's combobox list bounds for the extracted dropPlace */
    ${parserBlock}
    ${pricingFn}
    ${gemCanon}
    ${gemPackEq}
    ${gemMerge}
    ${gemMatchSuspect}
    ${gemCleanFields}
    ${ruleA}
    ${scopeAllows}
    ${pts1}
    ${insCostBase}
    ${insDrift}
    ${insCategory}
    ${insVolatility}
    ${insLongStanding}
    ${insNearCluster}
    ${insSupplierReach}
    ${insPriceGap}
    ${insComplexity}
    ${insRecentChange}
    ${insData}
    ${insBest}
    ${healthyLine}
    ${selectInsights}
    ${deriveInsights}
    ${lightFilterPass}
    ${newProductRecord}
    ${esc}
    ${builderNoMatchHtml}
    ${dropPlace}
    return { parsePdfLine, pdfTextToRows, packWeight, packCount, firstPairPrice, packToUnitCost, normalizePhrase, applySupplierMemory, derivePackPrice, resolveMatchedPrice, unitCatCategory, unitToBaseFields, gemMergeLine, gemCanon, gemPackEq, gemMatchSuspect, gemCleanFields, ruleA, scopeAllows, pts1, insCostBase, insDrift, insCategory, insVolatility, insLongStanding, insNearCluster, insSupplierReach, insPriceGap, insComplexity, insRecentChange, insData, insBest, healthyLine, selectInsights, deriveInsights, lightFilterPass, newProductRecord, builderNoMatchHtml, dropPlace };
  `);
  return factory();
}

module.exports = build();
