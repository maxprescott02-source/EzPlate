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
  /* 197: the shared derive-preview. It is the string the review screen shows above the price
     field, and its own comment promises the prefill and the live recompute never disagree - so it
     is the one reachable proxy for the DOM-bound pack-teach handler that shares its formula. */
  const invPackPreviewText = extractFn(src, 'invPackPreviewText');
  // 0b: the preview stopped saying "will be" on a row whose pack unit would re-base its product, so
  // it now asks the SAME extracted category decision the guard and the write ask. Extracted, never
  // stubbed — a copy of that comparison is exactly the drift the shared function exists to prevent.
  const kingRepointGuard = extractFn(src, 'kingRepointGuard');
  const invReResolve = extractFn(src, 'invReResolve');           // the convert-ONCE decision behind the match dropdown
  const invDerivePackQty = extractFn(src, 'invDerivePackQty');   // applyInvoice's real pack-size fallback
  const dispPrice = extractFn(src, 'dispPrice');
  const invGstDetect = extractFn(src, 'invGstDetect');
  const invGstAdjust = extractFn(src, 'invGstAdjust');
  /* 0c2 (batch 206): THE INVOICE REFEREE'S MERGE ORCHESTRATOR and its four helpers.
     It was tested until now through a hand-built `new Function` sandbox inside
     tests/invoice-gate.test.js, which stubs `rankCandidates` to a fixed answer and `packCount` to
     null — correct for that file, which is about the GATE, and useless for pinning the referee: two
     of its decisions are made BY those functions. Here it gets the real ones, and the real byId and
     PRODUCTS with them.
     `gemDiag` is EXTRACTED rather than stubbed, and the difference is the whole reason it is named:
     it is wrapped in its own try/catch and reads `window.console`, so a no-op stub of it and a
     DELETED call to it are the same program — CLAUDE.md's roster, the flagNeedsAttention case
     again. The sandbox gives it a real window with a capturing console instead. */
  const gemRowLocked = extractFn(src, 'gemRowLocked');
  const gemNormKey = extractFn(src, 'gemNormKey');
  const gemHist = extractFn(src, 'gemHist');
  const gemDiag = extractFn(src, 'gemDiag');
  const gemApplyReadings = extractFn(src, 'gemApplyReadings');
  /* item 2 (batch 208): the privacy gate's decision, extracted for the reason the roster gives —
     the three lines it replaced were pinned by an order-only test that stayed green against an
     inverted guard. */
  const privacyAcceptNeeded = extractFn(src, 'privacyAcceptNeeded');
  /* 0c (batch 203): the row's one skimmable signal, EXTRACTED rather than stubbed. It is pure —
     byId and cpbu are already in this sandbox for the insight pipeline — and stubbing it made
     buildInvRows' call to it unkillable by the mutation gate. PRICE_JUMP comes with it because the
     threshold is the decision, and a mirrored constant would be a second copy of it. */
  const flagNeedsAttention = extractFn(src, 'flagNeedsAttention');
  const priceJump = extractVar(src, 'PRICE_JUMP');
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
       result there exactly as renderInvReview does. renderInvReview is stubbed and that stub is
       faithful: it only paints, so a counter is the whole of its observable contract here.
       ⚠️ flagNeedsAttention WAS STUBBED ALONGSIDE IT AND SHOULD NEVER HAVE BEEN (0c, batch 203).
       The note here said it was "DOM-bound" and "display-only per its own comment"; the second half
       is what its comment says and the first half is simply untrue — it touches no DOM at all. It
       reads byId and cpbu and writes row.needsAttention, which is as pure and as extractable as
       anything else in this sandbox. A no-op stub of a real function is CLAUDE.md's roster class in
       its purest form: buildInvRows' call to it could be DELETED and every test stayed green,
       because the stub and the deletion are the same program. It is extracted below by name. */
    var invRows=[], invGst={mode:'unknown', note:''}, invSupplier='', supplierMem={}, gstDefault='ex';
    /* 0c2: the referee's own globals. gemStatus is what gemApplyReadings writes its verdict to, and
       the fake window exists ONLY so gemDiag's console.debug has somewhere to go — the real function
       swallows a missing window in its own try/catch, which would make its call site unkillable by
       any test. Captured rather than discarded so a test can assert the diagnostic fired. */
    var gemStatus=null, _gemDebug=[];
    var window={ console:{ debug:function(){ _gemDebug.push(Array.prototype.join.call(arguments,' ')); } } };
    var console=window.console;
    function setRefereeState(st){
      st=st||{};
      invRows=st.invRows||[];
      gemStatus=(st.gemStatus===undefined?null:st.gemStatus);
      invGst=st.invGst||{mode:'ex', note:''};
      _gemDebug=[]; _invPaints=0;
      if(st.PRODUCTS){ PRODUCTS=st.PRODUCTS; byId={}; PRODUCTS.forEach(function(p){ byId[p.id]=p; }); }
    }
    function gemState(){ return {status:gemStatus, rows:invRows, debug:_gemDebug.slice(), paints:_invPaints}; }
    /* Counts REPAINTS REQUESTED BY buildInvRows, and the name says that rather than "render calls"
       on purpose — 188's lesson is that a counter in a shared fixture gets coupled to every future
       caller, so an unrelated new call site silently retires somebody's assertion. Nothing else in
       this sandbox calls it, and a test reads it through invPaints() to pin that buildInvRows still
       asks for the repaint its contract promises. */
    var _invPaints=0;
    function renderInvReview(){ _invPaints++; }
    function invPaints(){ return _invPaints; }
    ${priceJump}
    ${flagNeedsAttention}
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
    ${dispPrice}
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
    ${kingRepointGuard}
    ${invPackPreviewText}
    ${invReResolve}
    ${invDerivePackQty}
    ${gemRowLocked}
    ${gemNormKey}
    ${gemHist}
    ${gemDiag}
    ${gemApplyReadings}
    ${privacyAcceptNeeded}
    return { setAppState, setInvState, getInvRows, invPaints, flagNeedsAttention,
      setRefereeState, gemState, gemApplyReadings, privacyAcceptNeeded, gemRowLocked, gemNormKey, gemHist, rankCandidates, invPackPreviewText, invDerivePackQty, invReResolve, buildInvRows, invGstDetect, invGstAdjust, computeInsights, DASH_ALL, parsePdfLine, pdfTextToRows, packWeight, packCount, firstPairPrice, packToUnitCost, normalizePhrase, applySupplierMemory, derivePackPrice, resolveMatchedPrice, unitCatCategory, unitToBaseFields, gemMergeLine, gemCanon, gemPackEq, gemMatchSuspect, gemCleanFields, insightScore, INSIGHT_FLOOR, ruleA, scopeAllows, pts1, insCostBase, insDrift, insCategory, insVolatility, insLongStanding, insNearCluster, insConcentration, insPriceAnomaly, insComplexity, healthyLine, selectInsights, deriveInsights, lightFilterPass, newProductRecord, builderNoMatchHtml, dropPlace, invConfirmState, unlinkedDishesOn, publishPlan, plateIdOf };
  `);
  return factory();
}

module.exports = build();
