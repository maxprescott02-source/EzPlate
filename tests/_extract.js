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

// grab a single top-level `var NAME = ...;` declaration verbatim, so a tuning table lives in exactly
// ONE place. v92: the alternative is a hand-copied mirror in the sandbox below, which is the "second
// copy to drift" this file exists to avoid — INSIGHT_VALUE in particular is pure tuning and would
// silently diverge the moment anyone retunes it in app.js.
function extractVar(src, name) {
  const m = new RegExp(`^var ${name}\\s*=`, 'm').exec(src);
  if (!m) throw new Error(`_extract: var not found -> ${name}. app.js changed; update tests/_extract.js`);
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
  throw new Error(`_extract: unterminated var -> ${name}`);
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
  // v92 adds the VALUE layer — every family scores itself through insightScore against the one
  // INSIGHT_VALUE table, and INSIGHT_FLOOR drops anything not worth the owner's attention. Three
  // more families went (insRecentChange/insData/insBest: bare counts and padding, all unreachable
  // above the floor), and insPriceGap became insPriceAnomaly.
  const insightConsts = [                                      // sliced, never mirrored — see extractVar
    extractVar(src, 'INSIGHT_DIMS'), extractVar(src, 'INSIGHT_VALUE'), extractVar(src, 'INSIGHT_FLOOR'),
    extractVar(src, 'CONC_MIN_PTS'), extractVar(src, 'ANOM_MIN_RATIO'),
    extractVar(src, 'COMPLEX_MIN_GAP'),
  ].join('\n    ');
  const clamp01 = extractFn(src, 'clamp01');
  const insightScore = extractFn(src, 'insightScore');
  const ruleA = extractFn(src, 'ruleA');
  const scopeAllows = extractFn(src, 'scopeAllows');
  const pts1 = extractFn(src, 'pts1');
  const insCostBase = extractFn(src, 'insCostBase');           // F1: cost-base movement, culprit named
  const insDrift = extractFn(src, 'insDrift');                 // F2: one plate's cost drift
  const insCategory = extractFn(src, 'insCategory');           // F3: category imbalance (any scope, v92)
  const insVolatility = extractFn(src, 'insVolatility');       // F4: the widest-swinging plate
  const insLongStanding = extractFn(src, 'insLongStanding');   // F5: over target through every cost change
  const insNearCluster = extractFn(src, 'insNearCluster');     // F6: the near-miss cluster
  const insConcentration = extractFn(src, 'insConcentration'); // F7: supplier reach + its consequence (global)
  const insPriceAnomaly = extractFn(src, 'insPriceAnomaly');   // F8: one product priced unlike anything else (global)
  const insComplexity = extractFn(src, 'insComplexity');
  const healthyLine = extractFn(src, 'healthyLine'); // v71: warm all-healthy line
  const selectInsights = extractFn(src, 'selectInsights');
  const deriveInsights = extractFn(src, 'deriveInsights');
  /* v93: computeInsights and its whole dependency closure — the IMPURE builder that turns live app
     state (MENU / savedPlates / PRODUCTS / ingPriceLog / menuPriceLog) into the primitives each
     family consumes. Until now only the families were tested, with primitives handed to them
     ready-made, so a family could be perfectly correct while the code that FEEDS it was broken —
     and on real data the two are indistinguishable: both look like "this family had nothing to
     say". That is the gap this closure closes. The sandbox declares the app globals below; a test
     assigns them per fixture and calls computeInsights exactly as the Dashboard does. */
  const insightPipeline = [
    'cpbu', 'perDisplayValue', 'lineCost', 'lineProduct', 'foodTarget', 'costFromLines',
    'plateIdOf', 'plateForMenuItem', 'ptMs', 'ingPriceBand', 'priceAtOrBefore', 'priceHeldSince',
    'costRangeForLines', 'insightPeriod', 'menuSeedHash', 'insightSeedFor', 'ingPriceAt',
    'costAtLines', 'unitWordFor', 'monthLabel', 'movementCulprit', 'computeInsights',
  ].map((n) => extractFn(src, n)).join('\n    ');
  const pipelineConsts = [
    extractVar(src, 'DASH_ALL'), extractVar(src, 'INSIGHT_WINDOWS'), extractVar(src, 'INSIGHT_PERIOD_MS'),
  ].join('\n    ');

  const lightFilterPass = extractFn(src, 'lightFilterPass');   // v68: Menu margin-light filter (pure)
  const newProductRecord = extractFn(src, 'newProductRecord'); // v82 D2: pure create-form → product record (locks pack_qty/pack_unit)
  const esc = extractFn(src, 'esc');                           // v83: the app's own escaper, so extracted HTML builders escape exactly as they ship
  const builderNoMatchHtml = extractFn(src, 'builderNoMatchHtml');   // v83 item 7: pure builder-search no-match copy
  const dropPlace = extractFn(src, 'dropPlace');               // v86: pure combobox placement decision (side + max height) inside a bounding box
  // v113: the two commit-before-check decisions, both pure so the CONDITION is what a test pins.
  // invConfirmState decides whether the invoice Confirm All may be pressed yet; publishPlan /
  // unlinkedDishesOn decide whether publishing this plate onto this menu duplicates an unlinked row.
  // (plateIdOf is already in insightPipeline above — publishPlan resolves through it, never raw fields.)
  const invConfirmState = extractFn(src, 'invConfirmState');
  const unlinkedDishesOn = extractFn(src, 'unlinkedDishesOn');
  const publishPlan = extractFn(src, 'publishPlan');

  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    function invDbg(){}   /* stub: the app's debug logger is a no-op in tests */
    var GEM_BAND=0.5;     /* the app's default plausibility band, mirrored for the extracted merge fn */
    var DROP_MIN=140, DROP_MAX=300;   /* v86: mirror of the app's combobox list bounds for the extracted dropPlace */
    ${insightConsts}
    ${pipelineConsts}
    /* v93: the app globals computeInsights reads. A test assigns them through setAppState() and then
       calls computeInsights exactly as the Dashboard does — same code, same order, no stubs in the
       path under test. cogsPct is the app's own name for the target %, read via foodTarget(). */
    var MENU=[], savedPlates=[], PRODUCTS=[], byId={}, kById={}, ingPriceLog={}, menuPriceLog={}, cogsPct=30;
    function setAppState(s){
      s=s||{};
      MENU=s.MENU||[]; savedPlates=s.savedPlates||[]; PRODUCTS=s.PRODUCTS||[];
      ingPriceLog=s.ingPriceLog||{}; menuPriceLog=s.menuPriceLog||{};
      cogsPct=(s.cogsPct==null?30:s.cogsPct);
      byId={}; PRODUCTS.forEach(function(p){ byId[p.id]=p; });
      kById={}; (s.kitchenIngredients||[]).forEach(function(k){ kById[k.id]=k; });
    }
    ${parserBlock}
    ${pricingFn}
    ${gemCanon}
    ${gemPackEq}
    ${gemMerge}
    ${gemMatchSuspect}
    ${gemCleanFields}
    ${clamp01}
    ${insightScore}
    ${ruleA}
    ${scopeAllows}
    ${pts1}
    ${insCostBase}
    ${insDrift}
    ${insCategory}
    ${insVolatility}
    ${insLongStanding}
    ${insNearCluster}
    ${insConcentration}
    ${insPriceAnomaly}
    ${insComplexity}
    ${healthyLine}
    ${selectInsights}
    ${deriveInsights}
    ${lightFilterPass}
    ${newProductRecord}
    ${esc}
    ${builderNoMatchHtml}
    ${dropPlace}
    ${invConfirmState}
    ${unlinkedDishesOn}
    ${publishPlan}
    ${insightPipeline}
    return { setAppState, computeInsights, DASH_ALL, parsePdfLine, pdfTextToRows, packWeight, packCount, firstPairPrice, packToUnitCost, normalizePhrase, applySupplierMemory, derivePackPrice, resolveMatchedPrice, unitCatCategory, unitToBaseFields, gemMergeLine, gemCanon, gemPackEq, gemMatchSuspect, gemCleanFields, insightScore, INSIGHT_FLOOR, ruleA, scopeAllows, pts1, insCostBase, insDrift, insCategory, insVolatility, insLongStanding, insNearCluster, insConcentration, insPriceAnomaly, insComplexity, healthyLine, selectInsights, deriveInsights, lightFilterPass, newProductRecord, builderNoMatchHtml, dropPlace, invConfirmState, unlinkedDishesOn, publishPlan, plateIdOf };
  `);
  return factory();
}

module.exports = build();
