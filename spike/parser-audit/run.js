#!/usr/bin/env node
/*
 * spike/parser-audit/run.js - the invoice-parser eval harness (PARSER-AUDIT-2026-09-08).
 *
 * Runs the REAL shipped parser (sliced out of js/app.js exactly as tests/_extract.js does; nothing is
 * copied) over a directory of cases and scores every line against a hand-written truth file.
 *
 *   node spike/parser-audit/run.js --cases spike/parser-audit/fixtures [--cases DIR ...]
 *                                  [--products tests/fixtures/base-products.json] [--json out.json]
 *                                  [--verbose] [--csv]
 *
 * A case is  NAME.txt  +  NAME.truth.json  side by side in the cases directory.
 *   NAME.txt        the text the app would see. For a PDF that is what extractPdfText() yields
 *                   (one visual line per row, whitespace collapsed) - produce it with extract-pdf.mjs.
 *                   For a CSV paste it is the CSV.
 *   NAME.truth.json see fixtures/README.md for the schema. Prices in truth are EX-GST, per stored unit.
 *
 * Per truth line the verdict is one of:
 *   right         captured, unit + price agree with an accepted answer, parser confident (not flagged)
 *   noisy         captured and right, but flagged for manual review (a human is asked to confirm a right number)
 *   silent-wrong  captured, WRONG unit or price, and NOT flagged - the number the app would store
 *   loud-wrong    captured and wrong, but flagged - a human sees a wrong prefill and is asked
 *   missed        no parsed row contains the line's `match` string
 * plus, per case: `leaks` (rows built from lines the truth says are not products, e.g. FUEL LEVY, a
 * credit-note line, a totals line) and `junk` (rows matching no truth line at all).
 *
 * "Flagged" is parser-level: needManual || uncertain || unitMismatch. With --products the full
 * buildInvRows chain runs against a catalogue and a second column reports invRowState(), whose
 * 'matched' value is the ONLY state the review screen pre-ticks. Both are printed because they answer
 * different questions: the first is "did the parser know it was guessing", the second is "would this
 * particular cafe's screen have shown a tick".
 *
 * Nothing in here is a stub of parser logic. The sandbox below assembles the parser region and the
 * functions around it by slicing js/app.js; stubs are limited to the DOM-bound painters (renderInvReview)
 * and the debug logger, which is how tests/_extract.js does it.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn, extractVar, sliceBetween } = require('../../tests/_extractfn');

function buildSandbox() {
  const src = loadApp();
  const parserBlock = sliceBetween(src, 'var INV_EXCLUDE=', 'function unitLabelFor(');
  const parts = [
    extractVar(src, 'INV_STOP'),
    extractVar(src, 'PRICE_JUMP'),
    ...['cpbu', 'inorm', 'coreTokens', 'prodTokenSet', 'normSupplier', 'invGstDetect', 'invGstAdjust',
      'invReResolve', 'invDerivePackQty', 'flagNeedsAttention', 'kingRepointGuard', 'invPriceUnit',
      'invPackUnitOpts', 'invUnitRebase', 'invRowState', 'invSupplierDetect', 'parseInvoiceCSV',
      'normPackNotation', 'invPackWeight', 'invFixRow', 'unitLabelFor', 'packToUnitCost'].map((n) => extractFn(src, n)),
  ].join('\n');
  // eslint-disable-next-line no-new-func
  const factory = new Function(`
    "use strict";
    function invDbg(){}
    var window={ EZ_INV_DEBUG:false, console:console };
    var PRODUCTS=[], byId={}, kById={}, invRows=[], invGst={mode:'unknown', note:''}, invSupplier='', supplierMem={}, gstDefault='ex';
    function memKey(sup, phrase){ return normSupplier(sup)+'|'+normalizePhrase(phrase); }
    var _paints=0; function renderInvReview(){ _paints++; }
    ${parts}
    ${parserBlock}
    function setProducts(list){ PRODUCTS=list||[]; byId={}; PRODUCTS.forEach(function(p){ byId[p.id]=p; }); }
    function setGstDefault(m){ gstDefault=m; }
    /* The PDF path, exactly as handleInvFile runs it: normalise pack notation, detect GST + supplier,
       parse, apply the 236/237 corrections, then build the review rows (match + resolve + GST adjust). */
    function runPdf(text){
      text=normPackNotation(text);
      invGst=invGstDetect(text); invSupplier=invSupplierDetect(text);
      var rows=pdfTextToRows(text).map(invFixRow);
      var parsed=rows.map(function(r){ return Object.assign({}, r); });   // the parser's own reading, before buildInvRows mutates it
      buildInvRows(rows);
      return {gst:invGst, supplier:invSupplier, parsed:parsed, rows:invRows};
    }
    /* The paste/CSV path, exactly as parseInvoice runs it. */
    function runCsv(text){
      text=normPackNotation(text);
      invGst=invGstDetect(text); invSupplier=invSupplierDetect(text);
      var rows=parseInvoiceCSV(text);
      var parsed=rows.map(function(r){ return Object.assign({}, r); });
      buildInvRows(rows);
      return {gst:invGst, supplier:invSupplier, parsed:parsed, rows:invRows};
    }
    return { runPdf:runPdf, runCsv:runCsv, setProducts:setProducts, setGstDefault:setGstDefault, invRowState:invRowState,
             parsePdfLine:parsePdfLine, packWeight:packWeight, packCount:packCount, moneyMatches:moneyMatches,
             firstPairPrice:firstPairPrice, explicitUnitPrice:explicitUnitPrice, invFixRow:invFixRow };
  `);
  return factory();
}

function loadProducts(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (Array.isArray(raw)) return raw;
  return Object.keys(raw).map((id) => Object.assign({ id }, raw[id]));
}

function priceClose(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number' || !isFinite(a) || !isFinite(b)) return false;
  if (b === 0) return Math.abs(a) < 0.005;
  return Math.abs(a - b) / Math.abs(b) <= 0.005 || Math.abs(a - b) < 0.0005;
}

function scoreCase(sb, cs, opts) {
  const text = fs.readFileSync(cs.txt, 'utf8');
  const truth = JSON.parse(fs.readFileSync(cs.truth, 'utf8'));
  const res = (truth.source === 'csv') ? sb.runCsv(text) : sb.runPdf(text);
  const rows = res.rows;
  const used = new Set();
  const lines = (truth.lines || []).map((t) => {
    const needle = String(t.match || t.desc).toLowerCase();
    let idx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (used.has(i)) continue;
      if (String(rows[i].raw || rows[i].name).toLowerCase().indexOf(needle) >= 0) { idx = i; break; }
    }
    if (idx < 0) return { desc: t.desc, verdict: 'missed', expect: t.accept, got: null };
    used.add(idx);
    const r = rows[idx];
    const flagged = !!(r.needManual || r.uncertain || r.unitMismatch);
    const state = opts.products ? sb.invRowState(r) : null;
    const accept = t.accept || [];
    const ok = accept.some((a) => a.unit === r.unit && priceClose(r.unitPrice, a.price));
    const manualOk = accept.length === 0 && r.needManual;          // truth says "must ask": a manual row is the right answer
    const right = ok || manualOk;
    const verdict = right ? (flagged && !manualOk ? 'noisy' : 'right') : (flagged ? 'loud-wrong' : 'silent-wrong');
    return { desc: t.desc, verdict, flagged, state, expect: accept,
      got: { unit: r.unit, unitPrice: r.unitPrice, needManual: r.needManual, uncertain: r.uncertain, unitMismatch: r.unitMismatch,
        priceSource: r.priceSource, bestId: r.bestId, tier: r.tier, addNew: r.addNew, raw: r.raw } };
  });
  const leaks = [];
  (truth.exclude || []).forEach((needle) => {
    rows.forEach((r, i) => {
      if (String(r.raw || r.name).toLowerCase().indexOf(String(needle).toLowerCase()) >= 0) {
        used.add(i);
        leaks.push({ needle, raw: r.raw, flagged: !!(r.needManual || r.uncertain || r.unitMismatch), unitPrice: r.unitPrice, unit: r.unit, state: opts.products ? sb.invRowState(r) : null });
      }
    });
  });
  const junk = rows.map((r, i) => (used.has(i) ? null : r)).filter(Boolean).map((r) => ({ raw: r.raw, flagged: !!(r.needManual || r.uncertain || r.unitMismatch), unitPrice: r.unitPrice, unit: r.unit, state: opts.products ? sb.invRowState(r) : null, addNew: r.addNew }));
  const tally = { total: lines.length, right: 0, noisy: 0, 'silent-wrong': 0, 'loud-wrong': 0, missed: 0 };
  lines.forEach((l) => { tally[l.verdict]++; });
  tally.captured = tally.total - tally.missed;
  tally.preTickedWrong = lines.filter((l) => l.state === 'matched' && (l.verdict === 'silent-wrong' || l.verdict === 'loud-wrong')).length;
  tally.preTicked = lines.filter((l) => l.state === 'matched').length;
  tally.leaks = leaks.length; tally.leaksUnflagged = leaks.filter((l) => !l.flagged).length;
  tally.junk = junk.length; tally.junkUnflagged = junk.filter((j) => !j.flagged).length;
  return { name: cs.name, style: truth.style || '', gstDetected: res.gst.mode, gstTruth: truth.gst, supplier: res.supplier, tally, lines, leaks, junk };
}

function findCases(dir) {
  const out = [];
  fs.readdirSync(dir).filter((f) => f.endsWith('.truth.json')).sort().forEach((f) => {
    const name = f.replace(/\.truth\.json$/, '');
    const txt = path.join(dir, name + '.txt');
    if (fs.existsSync(txt)) out.push({ name, txt, truth: path.join(dir, f) });
  });
  return out;
}

function main() {
  const argv = process.argv.slice(2);
  const dirs = []; let productsFile = null; let jsonOut = null; let verbose = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--cases') dirs.push(argv[++i]);
    else if (argv[i] === '--products') productsFile = argv[++i];
    else if (argv[i] === '--json') jsonOut = argv[++i];
    else if (argv[i] === '--verbose') verbose = true;
    else dirs.push(argv[i]);
  }
  if (!dirs.length) dirs.push(path.join(__dirname, 'fixtures'));
  const sb = buildSandbox();
  const opts = { products: null };
  if (productsFile) { opts.products = loadProducts(productsFile); sb.setProducts(opts.products); }
  const results = [];
  dirs.forEach((d) => findCases(d).forEach((cs) => results.push(scoreCase(sb, cs, opts))));

  const pad = (s, n) => String(s).padEnd(n);
  const cols = ['case', 'lines', 'capt', 'right', 'noisy', 'S-WRONG', 'L-wrong', 'missed', 'leaks(unfl)', 'junk(unfl)', 'gst', 'pretick(wrong)'];
  console.log(cols.map((c, i) => pad(c, i === 0 ? 34 : 12)).join(''));
  const sum = { total: 0, captured: 0, right: 0, noisy: 0, 'silent-wrong': 0, 'loud-wrong': 0, missed: 0, leaks: 0, leaksUnflagged: 0, junk: 0, junkUnflagged: 0, preTicked: 0, preTickedWrong: 0 };
  results.forEach((r) => {
    const t = r.tally;
    Object.keys(sum).forEach((k) => { sum[k] += t[k] || 0; });
    console.log([pad(r.name, 34), t.total, t.captured, t.right, t.noisy, t['silent-wrong'], t['loud-wrong'], t.missed,
      `${t.leaks}(${t.leaksUnflagged})`, `${t.junk}(${t.junkUnflagged})`, `${r.gstDetected}/${r.gstTruth || '?'}`,
      opts.products ? `${t.preTicked}(${t.preTickedWrong})` : '-'].map((c, i) => pad(c, i === 0 ? 34 : 12)).join(''));
  });
  console.log([pad('TOTAL', 34), sum.total, sum.captured, sum.right, sum.noisy, sum['silent-wrong'], sum['loud-wrong'], sum.missed,
    `${sum.leaks}(${sum.leaksUnflagged})`, `${sum.junk}(${sum.junkUnflagged})`, '', opts.products ? `${sum.preTicked}(${sum.preTickedWrong})` : '-'].map((c, i) => pad(c, i === 0 ? 34 : 12)).join(''));

  if (verbose) {
    results.forEach((r) => {
      console.log(`\n=== ${r.name}  [${r.style}]  gst=${r.gstDetected}  supplier="${r.supplier}"`);
      r.lines.forEach((l) => {
        const g = l.got;
        const exp = (l.expect || []).map((a) => `${a.price.toFixed(4)}/${a.unit}`).join(' | ') || 'manual';
        const gotS = g ? `${g.unitPrice == null ? 'null' : g.unitPrice.toFixed(4)}/${g.unit}${g.needManual ? ' manual' : ''}${g.uncertain ? ' uncertain' : ''}${g.unitMismatch ? ' mismatch' : ''}${l.state ? ' [' + l.state + (g.bestId ? ' ' + g.bestId + ' ' + g.tier : '') + ']' : ''}` : '-';
        console.log(`  ${pad(l.verdict, 13)} ${pad(l.desc.slice(0, 44), 46)} want ${pad(exp, 28)} got ${gotS}`);
      });
      r.leaks.forEach((l) => console.log(`  LEAK          ${l.needle}  ->  ${l.unitPrice == null ? 'null' : l.unitPrice.toFixed(4)}/${l.unit}${l.flagged ? ' (flagged)' : ' (UNFLAGGED)'}${l.state ? ' [' + l.state + ']' : ''}   ${l.raw.slice(0, 80)}`));
      r.junk.forEach((j) => console.log(`  junk          ${j.unitPrice == null ? 'null' : j.unitPrice.toFixed(4)}/${j.unit}${j.flagged ? ' (flagged)' : ' (UNFLAGGED)'}${j.state ? ' [' + j.state + ']' : ''}   ${j.raw.slice(0, 90)}`));
    });
  }
  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ products: !!opts.products, sum, results }, null, 2));
}

if (require.main === module) main();
module.exports = { buildSandbox, scoreCase, findCases };
