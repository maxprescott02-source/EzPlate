/*
 * inv-rowmarkup.test.js — locks in the v35 Item 1 contract at the markup level.
 *
 * THE BUG: renderInvReview put `.muted-row` on EVERY non-matched row, and
 * style.css hid td4/td5 (Old price / Confidence) off `.muted-row` — a rule whose
 * own comment says it exists so that NEW-ITEM lines drop those meaningless cells.
 * But invRowState() returns 'review' for price-jump rows and for tier!=='hi'
 * matches, so exactly the rows where the old price matters MOST rendered it and
 * then had it hidden. The render layer was always correct; CSS was eating it.
 *
 * THE CONTRACT these tests pin:
 *   - a row with a bestId ALWAYS emits Old price + Confidence, whatever its state
 *   - only add-new rows carry `.is-new`, the class the hiding now keys off
 *   - `.muted-row` no longer implies hidden cells (it is opacity only)
 *   - a matched row whose shown confidence isn't high carries a `low match — check`
 *     token, so a weak match is never signalled by an unticked box alone
 *
 * The row-build block is sliced out of the REAL shipped js/app.js between two
 * source anchors and executed with injected stubs, so these assertions run against
 * the code that ships. If the anchors move, the slice throws a message naming them.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

function extractFn(src, name) {
  const sig = `function ${name}(`;
  const i = src.indexOf(sig);
  if (i < 0) throw new Error(`inv-rowmarkup: function not found -> ${name}. app.js changed; update tests/inv-rowmarkup.test.js`);
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') depth++;
    else if (src[n] === '}' && --depth === 0) return src.slice(i, n + 1);
  }
  throw new Error(`inv-rowmarkup: unbalanced braces for ${name}`);
}

// The <tr> build lives contiguously inside renderInvReview's forEach body.
const ROW_START = 'var conf=Math.round(r.conf*100);';
const ROW_END = "'<td style=\"text-align:center\"><input type=\"checkbox\" class=\"invAppr\"'+(checked?' checked':'')+'></td></tr>';";

function sliceRowBuild(src) {
  const i = src.indexOf(ROW_START);
  if (i < 0) throw new Error(`inv-rowmarkup: start anchor not found -> "${ROW_START}". renderInvReview changed; update tests/inv-rowmarkup.test.js`);
  const j = src.indexOf(ROW_END, i);
  if (j < 0) throw new Error(`inv-rowmarkup: end anchor not found -> "${ROW_END}". renderInvReview changed; update tests/inv-rowmarkup.test.js`);
  return src.slice(i, j + ROW_END.length);
}

// Build a row-HTML factory from the real source, with everything it reaches for stubbed.
function makeRowBuilder(products) {
  const byId = {};
  (products || []).forEach(p => { byId[p.id] = p; });

  // eslint-disable-next-line no-new-func
  const factory = new Function('BYID', `
    "use strict";
    var byId = BYID;
    var invSupplier = '';
    var supplierMem = {};
    function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m]; }); }
    function dispPrice(p){ return '$' + Number(p.dispPrice).toFixed(2); }
    function unitLabelFor(){ return '/kg'; }
    function unitCatCategory(u){ return (u==='g'||u==='kg')?'kg':((u==='ml'||u==='l')?'l':'ea'); }
    function packCount(){ return null; }
    function normSupplier(){ return ''; }
    function memKey(){ return ''; }
    function invMatchOptions(){ return '<option value="skip"></option>'; }
    ${extractFn(SRC, 'tierOf')}
    ${extractFn(SRC, 'invDisplayConf')}
    ${extractFn(SRC, 'invRowState')}
    return function buildRow(r, i){
      var html = '';
      ${sliceRowBuild(SRC)}
      return html;
    };
  `);
  return factory(byId);
}

// a linked product whose stored price renders as $12.50
const CHIPS = { id: 'P0108', description: 'Chips 10Mm Straight Cut', brand: 'Safries', base_unit: 'g', dispPrice: 12.5 };
const buildRow = makeRowBuilder([CHIPS]);

// a price-jump row: matched, high confidence, but the invoice price moved >12%
function attentionRow() {
  return { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108',
           unitPrice: 3.10, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
           needsAttention: true, addNew: false, manualPick: false, needManual: false,
           unitMismatch: false, uncertain: false, remembered: false };
}

test('ITEM 1: a needs-attention row still shows the Old price and a Confidence label', () => {
  const html = buildRow(attentionRow(), 0);
  assert.ok(html.indexOf('invOld') >= 0, 'the Old price cell must be emitted');
  assert.ok(html.indexOf('$12.50') >= 0, 'the linked product\u2019s stored price must be in the markup');
  assert.ok(html.indexOf('82%') >= 0, 'the confidence label must be in the markup');
  assert.ok(html.indexOf('class="num invOld dash"') < 0, 'a row with a bestId must not dash out its Old price');
});

test('ITEM 1 ROOT CAUSE: a needs-attention row is .muted-row but NOT .is-new, so CSS cannot hide its cells', () => {
  const html = buildRow(attentionRow(), 0);
  assert.ok(/class="inv-data muted-row needs-attention st-review"/.test(html), 'expected muted-row + needs-attention + st-review (v37: tint driven by invRowState), got: ' + html.slice(0, 120));
  assert.ok(html.indexOf('is-new') < 0, 'ONLY add-new rows may carry .is-new — that class is what hides Old/Conf');
});

test('ITEM 1: an add-new row carries .is-new and dashes Old/Conf (the cells are genuinely meaningless there)', () => {
  const r = Object.assign(attentionRow(), { addNew: true, bestId: null, needsAttention: false });
  const html = buildRow(r, 0);
  assert.ok(html.indexOf('is-new') >= 0, 'add-new rows must carry .is-new');
  assert.ok(html.indexOf('class="num invOld dash"') >= 0, 'add-new rows dash the Old price');
  assert.ok(html.indexOf('$12.50') < 0, 'add-new rows have no linked product price to show');
});

test('ITEM 1: a mid-tier matched row carries the low-match cue (an unticked box is not a signal)', () => {
  const r = Object.assign(attentionRow(), { conf: 0.44, tier: 'mid', needsAttention: false,
                                            cands: [{ id: 'P0108', coverage: 0.44 }] });
  const html = buildRow(r, 0);
  assert.ok(html.indexOf('low match \u2014 check') >= 0, 'a 44% match must say so in words');
  assert.ok(html.indexOf('flag-review') >= 0, 'it reuses the existing review-flag styling');
  assert.ok(html.indexOf('44%') >= 0, 'and the confidence cell still shows the number');
  assert.ok(html.indexOf('$12.50') >= 0, 'a low-confidence match is EXACTLY when the old price matters');
});

test('ITEM 1: flag precedence holds — price jump outranks low match, and a clean hi match gets neither', () => {
  // both conditions true: price jump must win
  const both = Object.assign(attentionRow(), { conf: 0.44, tier: 'mid', needsAttention: true,
                                               cands: [{ id: 'P0108', coverage: 0.44 }] });
  const h1 = buildRow(both, 0);
  assert.ok(h1.indexOf('price jump \u2014 check') >= 0, 'price jump wins');
  assert.ok(h1.indexOf('low match \u2014 check') < 0, 'and suppresses the lower-precedence token');

  // clean high-confidence match: no token at all
  const clean = Object.assign(attentionRow(), { needsAttention: false });
  const h2 = buildRow(clean, 0);
  assert.ok(h2.indexOf('low match \u2014 check') < 0, 'an 82% match is not a low match');
  assert.ok(h2.indexOf('price jump \u2014 check') < 0, 'and has no jump');
  assert.ok(/class="inv-data st-matched"/.test(h2), 'a clean match is not muted and carries st-matched (v37)');
});

test('v37: the row class carries invRowState, so new and low-match rows can tint red like the summary says', () => {
  const low = Object.assign(attentionRow(), { conf: 0.4, tier: 'mid', needsAttention: false });
  assert.ok(/ st-review"/.test(buildRow(low, 0)), 'a low-confidence match is st-review');
  const nw = Object.assign(attentionRow(), { addNew: true, bestId: null, needsAttention: false });
  assert.ok(/ st-new"/.test(buildRow(nw, 0)), 'an add-new line is st-new');
});

test('ITEM 1: a hand-picked match is never called a low match — the user already made that call', () => {
  const r = Object.assign(attentionRow(), { manualPick: true, bestId: 'P0999', needsAttention: false });
  const html = buildRow(r, 0);
  assert.ok(html.indexOf('manual') >= 0, 'confidence reads as a labelled manual token');
  assert.ok(html.indexOf('low match \u2014 check') < 0, 'and carries no low-match scolding');
});
