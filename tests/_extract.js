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
 *
 * The CUTTING itself lives in ./_extractfn — loadApp/extractFn/extractVar/sliceBetween. It used to
 * live here, unexported, which is why 48 test files hand-rolled their own copy of it: this file's
 * only export is the built harness below, so a test wanting a function the harness does not already
 * provide could not reach the helpers. Anything needing a raw slice requires _extractfn directly.
 */
const { loadApp, extractFn, extractVar, sliceBetween } = require('./_extractfn');

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
    // 184: menuIdOf is the other axis' resolver — the scope filters inside computeInsights read a
    // dish's menu through it, exactly as they read its plate through plateIdOf.
    'plateIdOf', 'menuIdOf', 'dishOnMenu', 'plateForMenuItem', 'ptMs', 'ingPriceBand', 'priceAtOrBefore', 'priceHeldSince',
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
  /* 197: buildInvRows — THE COMPOSITION, and the reason it is here.
     Every function in the invoice pricing chain was already extractable and individually tested,
     and the GST defect lived in none of them: it lived in the twenty lines of buildInvRows that
     call them in order. derivePackPrice was right, resolveMatchedPrice was right, invGstDetect was
     right, and the stored price was 10% high. A blind audit found it; no test could have, because
     nothing in this repo ran those twenty lines.
     invGstDetect and invGstAdjust sit just OUTSIDE the sliced parser block (they are above the
     `var INV_EXCLUDE=` anchor), so they are pulled in by name rather than arriving with the slice. */
  const prodTokenSet = extractFn(src, 'prodTokenSet'); // rankCandidates' per-product token set
  const invStop = extractVar(src, 'INV_STOP');       // coreTokens' stop-word set
  const inorm = extractFn(src, 'inorm');             // coreTokens' normaliser
  const coreTokens = extractFn(src, 'coreTokens');   // rankCandidates' tokeniser, just outside the slice
  const invGstDetect = extractFn(src, 'invGstDetect');
  const invGstAdjust = extractFn(src, 'invGstAdjust');
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
    /* 197: the invoice-review globals. invRows is what buildInvRows WRITES, so a test reads its
       result there exactly as renderInvReview does. The two callees below are DOM-bound and are
       deliberately stubbed rather than extracted — but note WHICH: renderInvReview only paints, so
       a no-op is faithful; flagNeedsAttention is display-only per its own comment and sets flags a
       price test does not read. Neither stub sits in the path under test, which is the whole
       point — CLAUDE.md's roster is twenty-one entries of stubs that DID. */
    var invRows=[], invGst={mode:'unknown', note:''}, invSupplier='', supplierMem={}, gstDefault='ex';
    /* Counts REPAINTS REQUESTED BY buildInvRows, and the name says that rather than "render calls"
       on purpose — 188's lesson is that a counter in a shared fixture gets coupled to every future
       caller, so an unrelated new call site silently retires somebody's assertion. Nothing else in
       this sandbox calls it, and a test reads it through invPaints() to pin that buildInvRows still
       asks for the repaint its contract promises. */
    var _invPaints=0;
    function renderInvReview(){ _invPaints++; }
    function invPaints(){ return _invPaints; }
    function flagNeedsAttention(){}
    function normSupplier(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
    function memKey(sup, phrase){ return normSupplier(sup)+'|'+normalizePhrase(phrase); }
    function setInvState(s){
      s=s||{};
      invGst=s.invGst||{mode:'unknown', note:''};
      invSupplier=(s.invSupplier==null?'':s.invSupplier);
      supplierMem=s.supplierMem||{};
      gstDefault=(s.gstDefault==null?'ex':s.gstDefault);
      if(s.PRODUCTS){ PRODUCTS=s.PRODUCTS; byId={}; PRODUCTS.forEach(function(p){ byId[p.id]=p; }); }
      invRows=[]; _invPaints=0;
    }
    function getInvRows(){ return invRows; }
    ${invStop}
    ${prodTokenSet}
    ${inorm}
    ${coreTokens}
    ${invGstDetect}
    ${invGstAdjust}
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
    return { setAppState, setInvState, getInvRows, invPaints, buildInvRows, invGstDetect, invGstAdjust, computeInsights, DASH_ALL, parsePdfLine, pdfTextToRows, packWeight, packCount, firstPairPrice, packToUnitCost, normalizePhrase, applySupplierMemory, derivePackPrice, resolveMatchedPrice, unitCatCategory, unitToBaseFields, gemMergeLine, gemCanon, gemPackEq, gemMatchSuspect, gemCleanFields, insightScore, INSIGHT_FLOOR, ruleA, scopeAllows, pts1, insCostBase, insDrift, insCategory, insVolatility, insLongStanding, insNearCluster, insConcentration, insPriceAnomaly, insComplexity, healthyLine, selectInsights, deriveInsights, lightFilterPass, newProductRecord, builderNoMatchHtml, dropPlace, invConfirmState, unlinkedDishesOn, publishPlan, plateIdOf };
  `);
  return factory();
}

module.exports = build();
