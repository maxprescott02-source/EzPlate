#!/usr/bin/env node
/* Applies the PARSER-AUDIT-2026-09-08 proposed changes to a COPY of js/app.js (never the repo's own; see docs/audits/PARSER-AUDIT-2026-09-08.md). The tests/inv-row-fix.test.js rewrite is applied to the sibling tests/ of the given file when present.
   usage: node apply-patch.js <path/to/app.js>   (rewrites the file in place) */
'use strict';
const fs = require('fs');
const file = process.argv[2];
let src = fs.readFileSync(file, 'utf8');
function rep(oldS, newS, label) {
  const i = src.indexOf(oldS);
  if (i < 0) throw new Error('anchor not found: ' + label);
  if (src.indexOf(oldS, i + 1) >= 0) throw new Error('anchor not unique: ' + label);
  src = src.slice(0, i) + newS + src.slice(i + oldS.length);
}

/* ---- D9: rankCandidates tie-break ---- */
rep(`    scored.push({id:p.id, coverage:score});
  });
  scored.sort(function(a,b){ return b.coverage-a.coverage; });`,
`    scored.push({id:p.id, coverage:score, overlap:overlap, size:pk.length});
  });
  /* PARSER-AUDIT D9: coverage is normalised by the SHORTER token set, so a one-word product
     ("Mayonnaise", Kewpie) scores 1.0 against every line containing that word and TIES with the
     right product ("Mayonnaise Aioli Squeeze Bottle"); a stable sort then hands the tie to whichever
     came first in PRODUCTS. Break ties on how much of the LINE the product explains. */
  scored.sort(function(a,b){ return (b.coverage-a.coverage) || (b.overlap-a.overlap) || (b.size-a.size); });`, 'rankCandidates');

/* ---- D1/D5: moneyMatches carries sign and $ ---- */
rep(`function moneyMatches(line){
  var re=/\\$?\\s*(\\d{1,3}(?:,\\d{3})*\\.\\d{2}|\\d+\\.\\d{2})\\b/g, m, arr=[];
  while((m=re.exec(line))!==null){ arr.push({val:parseFloat(m[1].replace(/,/g,'')), idx:m.index, end:re.lastIndex}); }
  return arr;
}`,
`function moneyMatches(line){
  /* PARSER-AUDIT D1/D5: each amount also records whether it wore a $ and whether it was negative.
     val/idx/end are unchanged for every existing caller; a sign is only "negative" when the minus is
     glued to the $ or the digits ("-2.00", "$-59.00"), so a dash in a name ("Bread - 4.50") is not. */
  var re=/(-(?=\\$?\\d))?(\\$)?\\s*(-(?=\\d))?(\\d{1,3}(?:,\\d{3})*\\.\\d{2}|\\d+\\.\\d{2})\\b/g, m, arr=[];
  while((m=re.exec(line))!==null){ arr.push({val:parseFloat(m[4].replace(/,/g,'')), idx:m.index, end:re.lastIndex, dollar:!!m[2], neg:!!(m[1]||m[3])}); }
  return arr;
}`, 'moneyMatches');

/* ---- D1/D2: the column chooser, inserted before packWeight's comment ---- */
rep(`/* nested pack weight: "6 x (22 x 120g)" -> total kg/L. Multiplies every "N x"/"N of" before the final weight/volume unit. */
function packWeight(line){`,
`/* PARSER-AUDIT D1/D2: the quantity, unit-price and extension columns of one line, found by their
   ARITHMETIC (q x P = T, T to the right of P, q to the left) rather than by position or by repetition.
   The old chooser took the first adjacent pair of equal amounts, which on any layout that prints
   "Ordered Shipped" as 2-decimal numbers is the QUANTITY ("3.00 3.00 CTN ... $29.50 $88.50" -> $3.00
   a carton), and otherwise took the line total, which on every layout with a qty column and no
   repeated price column is the unit price TIMES the quantity. Measured: 36 of 41 lines on five real
   invoices were stored wrong by exactly the purchased quantity, unflagged.
   A number is a quantity candidate unless it is glued to a unit ("2.5kg"), sits right of an "x"
   ("6 x 1kg"), wears a $, is negative, or is followed by %. Preference: a $-marked price over a bare
   one, the nearest quantity to the price, the rightmost price; a candidate whose three amounts are
   all equal is skipped (q=1 lines make "1.00 1.00 1.00" satisfy 1x1=1 and say nothing).
   Returns null when nothing adds up, so the caller can refuse to guess. */
var INV_QTY_UNIT=/^(kg|kgs|g|gr|gram|grams|l|lt|ltr|litre|liter|ml|ea|each|unit|units|pcs?|pce|pieces?|bunch|bunches|pun|punnets?|cans?|tins?|btls?|bottles?|jars?|tubs?|trays?|bags?|drums?|pk|pkt|packs?|packets?|box|boxes|ctns?|cartons?|cases?|blk|bkt|pail|sleeves?|doz|dozen|loaf|loaves|roll|rolls)\\b/i;
var INV_COUNT_NOUN=/^(ea|each|unit|units|pcs?|pce|pieces?|bunch|bunches|pun|punnets?|cans?|tins?|btls?|bottles?|jars?|tubs?|drums?|loaf|loaves|roll|rolls)$/i;
function lineColumns(line){
  line=line||'';
  var monies=moneyMatches(line); if(monies.length<2) return null;
  var nums=[], re=/\\d+(?:\\.\\d+)?/g, m;
  while((m=re.exec(line))!==null){
    var s=m.index, e=re.lastIndex, before=line.slice(0,s), after=line.slice(e);
    if(/\\$\\s*$/.test(before) || /-$/.test(before)) continue;                 // a $ amount or a negative is never a quantity
    if(/[x\\u00d7*]\\s*$/i.test(before)) continue;                             // the right side of "6 x 1kg" is pack composition
    if(/^\\s*%/.test(after) || /^(?:kg|kgs|g|gr|gram|grams|l|lt|ltr|litre|liter|ml|mm|cm|oz)\\b/i.test(after)) continue;   // glued unit: "2.5kg", "100MM"
    var wa=/^\\s+([a-z]+)\\b/i.exec(after), wb=/(?:^|\\s)([a-z]+)\\s+$/i.exec(before), unit=null;   // wb: a STANDALONE word ("kg 1.135"), never the tail of "1.2kg 3"
    if(wa && INV_QTY_UNIT.test(wa[1])) unit=wa[1].toLowerCase();
    else if(wb && /^(kg|kgs|l|lt|ltr|litre|liter)$/i.test(wb[1])) unit=wb[1].toLowerCase();   // "kg 1.135" (weight word BEFORE the figure)
    nums.push({val:parseFloat(m[0]), idx:s, end:e, unit:unit, unitEnd:(wa&&unit?e+wa[0].length:e)});
  }
  var best=null;
  for(var i=0;i<monies.length-1;i++){
    var P=monies[i]; if(!(P.val>0) || P.neg) continue;
    for(var j=i+1;j<monies.length;j++){
      var T=monies[j]; if(T.neg) continue;
      for(var k=nums.length-1;k>=0;k--){
        var q=nums[k]; if(!(q.val>0) || q.end>P.idx) continue;
        if(q.val===P.val && P.val===T.val) continue;                             // 1 x 1.00 = 1.00 says nothing
        if(Math.abs(q.val*P.val-T.val) > 0.01*q.val+0.006) continue;
        var cand={price:P.val, dollar:P.dollar, priceIdx:P.idx, qty:q.val, qtyIdx:q.idx, qtyEnd:q.unitEnd, qtyUnit:q.unit, total:T.val};
        if(!best || (cand.dollar&&!best.dollar) || (cand.dollar===best.dollar && cand.priceIdx>=best.priceIdx)) best=cand;
        break;                                                                   // nearest quantity to this price wins
      }
    }
  }
  return best;
}
/* nested pack weight: "6 x (22 x 120g)" -> total kg/L. Multiplies every "N x"/"N of" before the final weight/volume unit. */
function packWeight(line){`, 'lineColumns');

/* ---- D3: packWeight trailing multiplier ---- */
rep(`  while((mm=mr.exec(prefix))!==null){ var v=parseFloat(mm[1]); if(v>0){ mult*=v; factors.push(v); } }
  var qtyInCat=mult*unitNum*u.f;                                    // total weight in kg (or L)`,
`  while((mm=mr.exec(prefix))!==null){ var v=parseFloat(mm[1]); if(v>0){ mult*=v; factors.push(v); } }
  /* PARSER-AUDIT D3: a multiplier AFTER the weight - "2.26KG X 6", "700G/UNIT 6 UNITS/CTN",
     "600G/UNIT 6UNITS/CTN". Only the x-form and the N-units form count; a bare number after the
     weight ("1kg 10 5.62", Bidfood's qty column) is left alone. */
  var suffix=line.slice(last.index+last[0].length),
      sm=/^\\s*(?:\\/\\s*(?:unit|units|ea|each|pce?s?|piece|pkt|pack|portion)\\b\\s*)?(?:(?:x|\\u00d7|\\*)\\s*(\\d+(?:\\.\\d+)?)\\b|(\\d+(?:\\.\\d+)?)\\s*(?:x\\b|units?\\b|ea\\b|each\\b|pcs?\\b|pce\\b|pieces?\\b|pk\\b|pkt\\b|packs?\\b|per\\b))/i.exec(suffix);
  if(sm){ var sv=parseFloat(sm[1]||sm[2]); if(sv>0){ mult*=sv; factors.push(sv); } }
  var qtyInCat=mult*unitNum*u.f;                                    // total weight in kg (or L)`, 'packWeight suffix');

/* ---- packCount: no bare-symbol multiplier, pack/pk are counts ---- */
rep(`  var mult=1, any=false, mm, mr=/(\\d+(?:\\.\\d+)?)\\s*[a-z]*\\s*(?:x|\\u00d7|\\*|of)\\s*/gi;`,
`  /* PARSER-AUDIT: the multiplier must be FOLLOWED BY A NUMBER. Without the lookahead a supermarket
     receipt's taxable marker ("... 9.00 *") read as "9 x" and divided the price by nine. */
  var mult=1, any=false, mm, mr=/(\\d+(?:\\.\\d+)?)\\s*[a-z]*\\s*(?:x|\\u00d7|\\*|of)\\s*(?=\\d)/gi;`, 'packCount multiplier');
rep(`  var ct=line.match(/(\\d+)\\s*(ea|each|unit|units|pcs|pce|piece|pieces|portion|portions|sleeve|sleeves)\\b/i);`,
`  var ct=line.match(/(\\d+)\\s*(ea|each|unit|units|pcs|pce|piece|pieces|portion|portions|sleeve|sleeves|pk|pkt|pack|packs|packet|packets)\\b/i);   // PARSER-AUDIT: "48 pack", "6PK"`, 'packCount words');

/* ---- parsePdfLine ---- */
rep(`function parsePdfLine(line){
  line=(line||'').trim(); if(!line) return null;
  if(!/[A-Za-z]{2,}/.test(line)) return null;
  var monies=moneyMatches(line); if(!monies.length) return null;
  var name=line.slice(0, monies[0].idx).replace(/[\\s,;:@\\-]+$/,'').trim();
  if(name.length<2) name=line.replace(/[\\s,;:@\\-]+$/,'').trim();   // qty-first layouts: keep the whole line as the name
  var cls=invLineClass(name, line); if(cls==='exclude'){ invDbg('[parsePdfLine] EXCLUDED (summary/footer line):', line); return null; }
  var unc=(cls==='uncertain');
  var ex=explicitUnitPrice(line);                                 // 1) explicit unit price wins
  if(ex){ invDbg('[parsePdfLine] explicit unit price:', {name:name, unitPrice:ex.unitPrice, unit:ex.unit}); return {name:name, unitPrice:ex.unitPrice, unit:ex.unit, needManual:false, uncertain:unc, raw:line}; }
  // Per-PACK price: columnar invoices repeat the Unit Price / Price columns ("52.12 52.12"); simple invoices
  // repeat the qty-1 unit price as the line total ("$20.00 $20.00"). The first adjacent equal pair is the price
  // of ONE pack. Using it (not the last money / line total) is what stops qty>1 lines being multiplied by qty.
  var total=monies[monies.length-1].val;                          // last money = line total
  var packPrice=firstPairPrice(monies); if(packPrice==null) packPrice=total;
  var aps=line.match(/\\b(\\d{2,4})'s\\b/i);                          // 1b) explicit apostrophe-s pack count e.g. "105'S", "400'S" -> N pieces per pack
  if(aps){ var apc=parseFloat(aps[1]);
    if(apc>0){ invDbg('[parsePdfLine] APOSTROPHE-S count:', {name:name, count:apc, packPrice:packPrice, perUnit:'$'+(packPrice/apc).toFixed(4)+'/unit'});
      return {name:name, unitPrice:packPrice/apc, unit:'ea', needManual:false, uncertain:unc, raw:line}; } }
  var w=packWeight(line);                                         // 2) derive $/kg or $/L from the pack price and the pack's weight/volume
  if(w && w.qtyInCat>0){ var upw=packPrice/w.qtyInCat; invDbg('[parsePdfLine] WEIGHT calc:', {name:name, packPrice:packPrice, lineTotal:total, totalWeight:w.qtyInCat+(w.cat==='l'?' L':' kg'), pricePerUnit:'$'+upw.toFixed(4)+'/'+(w.cat==='l'?'L':'kg')}); return {name:name, unitPrice:upw, unit:w.cat, needManual:false, uncertain:unc, raw:line}; }
  var c=packCount(line);                                          //    or $/unit from the pack price and the per-pack count
  if(c && c>0) return {name:name, unitPrice:packPrice/c, unit:'ea', needManual:false, uncertain:unc, raw:line};
  return {name:name, unitPrice:null, unit:'auto', needManual:true, uncertain:unc, raw:line};   // 3) ambiguous
}
function pdfTextToRows(text){
  var rows=[]; (text||'').split(/\\n/).forEach(function(raw){ var r=parsePdfLine(raw); if(r) rows.push(r); });
  return rows;
}`,
`function parsePdfLine(line){
  line=(line||'').trim(); if(!line) return null;
  if(!/[A-Za-z]{2,}/.test(line)) return null;
  var monies=moneyMatches(line); if(!monies.length) return null;
  var name=line.slice(0, monies[0].idx).replace(/[\\s,;:@\\-]+$/,'').trim();
  if(name.length<2) name=line.replace(/[\\s,;:@\\-]+$/,'').trim();   // qty-first layouts: keep the whole line as the name
  var cls=invLineClass(name, line); if(cls==='exclude'){ invDbg('[parsePdfLine] EXCLUDED (summary/footer line):', line); return null; }
  var unc=(cls==='uncertain');
  function manual(why){ return {name:name, unitPrice:null, unit:'auto', needManual:true, uncertain:unc, raw:line, basis:{kind:why}}; }
  /* PARSER-AUDIT D5: a negative quantity or amount is a credit, a return or a reversal. It is never a
     purchase price, and on a credit note the unit-price column is usually not what it looks like. */
  if(monies.some(function(mo){ return mo.neg; })) return manual('credit');
  var ex=explicitUnitPrice(line);                                 // 1) explicit unit price wins
  if(ex){ invDbg('[parsePdfLine] explicit unit price:', {name:name, unitPrice:ex.unitPrice, unit:ex.unit}); return {name:name, unitPrice:ex.unitPrice, unit:ex.unit, needManual:false, uncertain:unc, raw:line, basis:{kind:'explicit'}}; }
  /* PARSER-AUDIT D1/D2: the price of ONE pack is the column that, times the quantity, gives the
     extension - lineColumns finds it. Only when nothing adds up does the old repeated-pair rule run,
     and a line with several amounts that neither pair nor add up is refused rather than priced from
     its total (the total is the price times the quantity, on every layout that prints a quantity). */
  var col=lineColumns(line), packPrice, packText=name, kind;
  if(col){ packPrice=col.price; kind='columns';
    if(col.qtyIdx<name.length) packText=(name.slice(0,col.qtyIdx)+' '+name.slice(Math.min(col.qtyEnd,name.length))).replace(/\\s+/g,' ').trim();   // the purchased quantity is not part of the pack
  } else {
    packPrice=firstPairPrice(monies);
    if(packPrice!=null) kind='pair';
    else if(monies.length===1){ packPrice=monies[0].val; kind='single'; }
    else return manual('unbalanced');
  }
  var basis={kind:kind, packPrice:packPrice, qty:(col?col.qty:null), qtyUnit:(col?col.qtyUnit:null)};
  function done(up, unit, extra){ var r={name:name, unitPrice:up, unit:unit, needManual:false, uncertain:unc, raw:line, basis:basis}; if(extra) for(var k in extra) basis[k]=extra[k]; return r; }
  /* D2: a quantity column in kilograms or litres means the price is per kilogram or litre - the pack
     in the name (the 2.5kg the bacon comes in) is what was delivered, not what was priced. A
     fractional quantity on a weighed line ("5.12" of a "2 x 2.5kg" bacon) is the same case with the
     unit word on the header row instead of the line. */
  if(col && col.qtyUnit && /^(kg|kgs|l|lt|ltr|litre|liter)$/.test(col.qtyUnit)){ var qc=unitCat(col.qtyUnit); return done(packPrice, qc.cat, {perQtyUnit:true}); }
  var wName=packWeight(packText);
  if(col && col.qty%1!==0 && wName && !col.qtyUnit) return done(packPrice, wName.cat, {perQtyUnit:true, weight:wName});
  // an explicit count comes BEFORE a weight when the line carries both: "105'S ... 1.5kg" is 105
  // slices and "600G 15X1 DOZEN" is 180 eggs. The bare "105S" form keeps today's precedence
  // (weight first; tests/inv-chain.test.js pins that reading) - see the audit's residuals.
  var aps=packText.match(/\\b(\\d{2,4})'s\\b/i);                      // 1b) explicit apostrophe-s pack count e.g. "105'S", "400'S" -> N pieces per pack
  if(aps){ var apc=parseFloat(aps[1]);
    if(apc>0){ invDbg('[parsePdfLine] APOSTROPHE-S count:', {name:name, count:apc, packPrice:packPrice, perUnit:'$'+(packPrice/apc).toFixed(4)+'/unit'});
      return done(packPrice/apc, 'ea', {count:apc}); } }
  if(/\\d\\s*(?:doz|dozen|pk|pkt|packs?)\\b/i.test(packText)){ var cd=packCount(packText); if(cd&&cd>0) return done(packPrice/cd, 'ea', {count:cd}); }   // "15X1 DOZEN", "12PK 700G", "6 pack"
  var w=wName;                                                    // 2) derive $/kg or $/L from the pack price and the pack's weight/volume, read from the NAME (the money columns are not pack description)
  if(w && w.qtyInCat>0){ var upw=packPrice/w.qtyInCat; invDbg('[parsePdfLine] WEIGHT calc:', {name:name, packPrice:packPrice, totalWeight:w.qtyInCat+(w.cat==='l'?' L':' kg'), pricePerUnit:'$'+upw.toFixed(4)+'/'+(w.cat==='l'?'L':'kg')}); return done(upw, w.cat, {weight:w}); }
  var c=packCount(packText);                                      //    or $/unit from the pack price and the per-pack count
  if(c && c>0) return done(packPrice/c, 'ea', {count:c});
  if(col && col.qtyUnit && INV_COUNT_NOUN.test(col.qtyUnit)) return done(packPrice, 'ea', {perQtyUnit:true});   // "24 EACH Avocado $1.85": the column says what one is
  return manual('ambiguous');                                     // 3) ambiguous
}
/* PARSER-AUDIT D4: a wrapped description. Several layouts print the second half of a description
   on its own money-less line ("60*120G ANGEL BAY 72361", "UNITS/CTN TIP TOP 9323"), and the pack
   size is often on that half. One such line, directly under a row, that carries no summary word, no
   column-header word and no page marker, is spliced into the row's name AHEAD of the money columns
   and the row is re-priced. The row's raw stays the original line: it is the supplier-memory key. */
var INV_CONT_STOP=/\\*{3,}|\\bpage\\b|\\bcontinued\\b|\\bcarried\\b|\\bdescription\\b|\\bqty\\b|\\bquantity\\b|\\bprice\\b|\\bcode\\b|\\bdate\\b|\\bterms\\b|\\bcustomer\\b|\\bdeliver|\\bsold\\b|[:@]/i;
function pdfTextToRows(text){
  var rows=[], last=null;
  (text||'').split(/\\n/).forEach(function(raw){
    var r=parsePdfLine(raw);
    if(r){ rows.push(r); last=r; return; }
    var t=(raw||'').trim();
    if(last && t && t.length<=60 && /[A-Za-z]{2,}/.test(t) && !moneyMatches(t).length && !INV_EXCLUDE.test(t) && !INV_CONT_STOP.test(t)){
      var lm=moneyMatches(last.raw), cut=lm.length?lm[0].idx:last.raw.length;
      var joined=(last.raw.slice(0,cut).replace(/\\s+$/,'')+' '+t+' '+last.raw.slice(cut)).trim();
      var r2=parsePdfLine(joined);
      if(r2){ r2.raw=last.raw; r2.cont=t; rows[rows.length-1]=r2; }
    }
    last=null;
  });
  return rows;
}`, 'parsePdfLine');

/* ---- invFixRow: read the parser's own basis ---- */
rep(`  if(explicitUnitPrice(row.raw||'')) return row;                  // the line states its own rate: no pack-weight basis exists to correct
  var wr=packWeight(row.raw||'');                                 // what priced the row`,
`  if(explicitUnitPrice(row.raw||'')) return row;                  // the line states its own rate: no pack-weight basis exists to correct
  /* PARSER-AUDIT: a row priced by lineColumns already knows its purchased quantity (removed from the
     pack text before the weight was read) and already read the weight off the NAME, so neither A nor
     B applies. Rows built by hand, or priced by the repeated-pair fallback, take the path below. */
  if(row.basis && (row.basis.kind==='columns' || row.basis.perQtyUnit)) return row;
  var wr=(row.basis && row.basis.weight) ? row.basis.weight : packWeight(row.raw||'');   // what priced the row`, 'invFixRow');

/* ---- invGstDetect: "GST (included)" ---- */
rep(`  if(/gst\\s*incl|incl[a-z]*\\s*gst|inc\\.?\\s*gst|includes?\\s+gst|inclusive of gst/.test(t))`,
`  if(/gst\\s*\\(?\\s*incl|incl[a-z]*\\s*gst|inc\\.?\\s*gst|includes?\\s+gst|inclusive of gst/.test(t))`, 'invGstDetect');

fs.writeFileSync(file, src);
console.log('patched', file);

/* ---- tests/inv-row-fix.test.js: five tests pinned the OLD mechanism's preconditions (the parser
   alone being wrong before invFixRow ran). Under the new parser those preconditions are false
   because the defect is fixed at its source, so the tests are rewritten to pin the OUTCOME. ---- */
const tfile = require('path').join(require('path').dirname(file), '..', 'tests', 'inv-row-fix.test.js');
if (fs.existsSync(tfile)) {
  src = fs.readFileSync(tfile, 'utf8');
  rep(`  const l = '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg';
  assertClose(parsePdfLine(l).unitPrice, 0.4167, 'precondition: the parser alone is an order of magnitude out');
  const r = parse(l);
  assertClose(r.unitPrice, 10, 'the pack\\'s own weight prices the row');
  assert.equal(r.needManual, false);`,
`  const l = '2 CTN Beef Mince 6 x 1kg 60.00 60.00 120.00 12.0kg';
  /* PARSER-AUDIT: the parser now reads the pack off the NAME with the purchased quantity removed
     (lineColumns found 2 x 60.00 = 120.00), so it is right on its own and invFixRow has nothing to
     do. The outcome is what is pinned; the old precondition (parser alone at $0.42) is gone. */
  const bare = parsePdfLine(l);
  assertClose(bare.unitPrice, 10, 'the parser prices off the pack in the name');
  assert.equal(bare.basis.kind, 'columns', 'and it knows which column was the quantity');
  const r = parse(l);
  assertClose(r.unitPrice, 10, 'the pack\\'s own weight prices the row');
  assert.equal(r.needManual, false);`, 'test 12b headline');
  rep(`  const l = 'Beef Mince 6 x 1kg 60.00 60.00 60.00 6.0kg';
  assertClose(parsePdfLine(l).unitPrice, 1.6667, 'precondition: wrong before');
  const r = parse(l);`,
`  const l = 'Beef Mince 6 x 1kg 60.00 60.00 60.00 6.0kg';
  assert.equal(parsePdfLine(l).basis.kind, 'pair', 'no quantity on the line: the repeated-pair rule priced it');
  const r = parse(l);`, 'test 12b alone');
  rep(`  const l = '2 CTN Beef Mince 60.00 60.00 120.00 12.0kg';
  const bare = parsePdfLine(l);
  assert.equal(bare.unit, 'kg', 'precondition: the parser did derive a weight price here');
  const r = parse(l);
  assert.equal(r.needManual, true, 'flagged for a human');
  assert.equal(r.unitPrice, bare.unitPrice, 'and its price is left as parsed, not invented');`,
`  const l = '2 CTN Beef Mince 60.00 60.00 120.00 12.0kg';
  const r = parse(l);
  assert.equal(r.needManual, true, 'flagged for a human');
  assert.equal(r.unitPrice, null, 'and no price is invented from a column that is not the pack');
  assert.equal(r.unit, 'auto', 'no pack, no unit');`, 'test weight outside name');
  rep(`  const l = 'Sauce 6 x 500ml 30.00 30.00 60.00 3.0kg';
  const bare = parsePdfLine(l);
  const r = parse(l);
  assert.equal(r.needManual, true, 'flagged');
  assert.equal(r.unit, bare.unit, 'the unit is NOT rewritten');
  assert.equal(r.unitPrice, bare.unitPrice, 'and neither is the price');`,
`  const l = 'Sauce 6 x 500ml 30.00 30.00 60.00 3.0kg';
  /* PARSER-AUDIT: the trailing 3.0kg is a delivered-weight column, not pack description, and the
     parser no longer reads it: 6 x 500ml for $30 is $10/L. The invariant that survives is the
     unit - it must be the NAME's category, never the column's. */
  const r = parse(l);
  assert.equal(r.unit, 'l', 'the unit is the pack\\'s category, never the trailing column\\'s');
  assertClose(r.unitPrice, 10, '$30 over 3L');
  assert.equal(r.needManual, false);`, 'test different category');
  rep(`  const r = parse('Beef Mince 2 x 6 x 1kg 60.00 60.00 120.00');`,
`  /* PARSER-AUDIT: with a 120.00 total the leading 2 IS the purchased quantity (2 x 60 = 120) and the
     old fixture contradicted itself; at 60.00 the 2 is composition and the parser's reading stands. */
  const r = parse('Beef Mince 2 x 6 x 1kg 60.00 60.00 60.00');`, 'test mid-line quantity');
  fs.writeFileSync(tfile, src);
  console.log('patched', tfile);
}
