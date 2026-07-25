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
  // v63/v67: the deterministic insight engine. v67 broadened it into one pure function PER insight
  // TYPE + a pure selector; deriveInsights orchestrates them. All are dependency-free (dishes/shared/
  // mover are passed in as primitives), so each is testable with no DOM and no live API.
  // v74: shared helpers the insight types depend on — the non-obvious guard, the dominant-ingredient
  // driver (≥2 ingredients, 40–90% share), its phrase, and the $/serve formatter. Extracted so the
  // types can run in isolation with no DOM.
  const nonObvious = extractFn(src, 'nonObvious');
  const dishDriver = extractFn(src, 'dishDriver');
  const driverClause = extractFn(src, 'driverClause');
  const overServeFmt = extractFn(src, 'overServeFmt');
  const insReprice = extractFn(src, 'insReprice');
  const insNearMiss = extractFn(src, 'insNearMiss');
  const insVolatility = extractFn(src, 'insVolatility');
  const insShared = extractFn(src, 'insShared');
  const insMover = extractFn(src, 'insMover');
  const insSummary = extractFn(src, 'insSummary');
  const insCut = extractFn(src, 'insCut');           // v69: far-over-target → rework/drop
  // v75: the widened menu-level / cross-cutting pool
  const insCategory = extractFn(src, 'insCategory');
  const insSpread = extractFn(src, 'insSpread');
  const insAggregate = extractFn(src, 'insAggregate');
  const insSpend = extractFn(src, 'insSpend');
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

  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    function invDbg(){}   /* stub: the app's debug logger is a no-op in tests */
    var GEM_BAND=0.5;     /* the app's default plausibility band, mirrored for the extracted merge fn */
    var CUT_PTS=12;       /* v69: insReprice/insCut share this over-target threshold (mirrored for extraction) */
    var INSIGHT_DIMS={ cross:1, composition:1, movement:1, comparative:1, coverage:1 };   /* v74/v75: mirror for nonObvious */
    ${parserBlock}
    ${pricingFn}
    ${gemCanon}
    ${gemPackEq}
    ${gemMerge}
    ${gemMatchSuspect}
    ${gemCleanFields}
    ${nonObvious}
    ${dishDriver}
    ${driverClause}
    ${overServeFmt}
    ${insReprice}
    ${insNearMiss}
    ${insVolatility}
    ${insShared}
    ${insMover}
    ${insSummary}
    ${insCut}
    ${insCategory}
    ${insSpread}
    ${insAggregate}
    ${insSpend}
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
    return { parsePdfLine, pdfTextToRows, packWeight, packCount, firstPairPrice, packToUnitCost, normalizePhrase, applySupplierMemory, derivePackPrice, resolveMatchedPrice, unitCatCategory, unitToBaseFields, gemMergeLine, gemCanon, gemPackEq, gemMatchSuspect, gemCleanFields, nonObvious, dishDriver, driverClause, overServeFmt, insReprice, insNearMiss, insVolatility, insShared, insMover, insSummary, insCut, insCategory, insSpread, insAggregate, insSpend, insComplexity, insRecentChange, insData, insBest, healthyLine, selectInsights, deriveInsights, lightFilterPass, newProductRecord, builderNoMatchHtml };
  `);
  return factory();
}

module.exports = build();
