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
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

// The <tr> build lives contiguously inside renderInvReview's forEach body.
const ROW_START = 'var conf=Math.round(r.conf*100);';
// F8 (v147): the Apply cell gained a <label> wrapper so the 26px checkbox gets a 44px target, and
// its inline `style="text-align:center"` became `class="apprcell"`. Consciously changed, not
// deleted to go green — every assertion below still runs against the real shipped row build.
const ROW_END = "'<td class=\"apprcell\"><label class=\"appr-hit\"><input type=\"checkbox\" class=\"invAppr\"'+(checked?' checked':'')+'></label></td></tr>';";

function sliceRowBuild(src) {
  const i = src.indexOf(ROW_START);
  if (i < 0) throw new Error(`inv-rowmarkup: start anchor not found -> "${ROW_START}". renderInvReview changed; update tests/inv-rowmarkup.test.js`);
  const j = src.indexOf(ROW_END, i);
  if (j < 0) throw new Error(`inv-rowmarkup: end anchor not found -> "${ROW_END}". renderInvReview changed; update tests/inv-rowmarkup.test.js`);
  return src.slice(i, j + ROW_END.length);
}

// Build a row-HTML factory from the real source, with everything it reaches for stubbed.
function makeRowBuilder(products, opts) {
  const byId = {};
  (products || []).forEach(p => { byId[p.id] = p; });
  // 0b: packCount is a STUB PARAMETER now, not a constant null. The prefill defect it hides —
  // `packCount(raw)?'ea':…` putting units in front of a per-kg product — was unreachable while every
  // row in this file pretended no line had an "N x N" pack pattern, which most real ones do.
  const CTX = { packCount: (opts && opts.packCount) || null, packPrice: (opts && opts.packPrice) || 55 };

  // eslint-disable-next-line no-new-func
  const factory = new Function('BYID', 'CTX', `
    "use strict";
    var byId = BYID;
    var invSupplier = '';
    var supplierMem = {};
    function esc(s){ return (s==null?'':String(s)).replace(/[&<>"]/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[m]; }); }
    function dispPrice(p){ return '$' + Number(p.dispPrice).toFixed(2); }
    function unitLabelFor(){ return '/kg'; }
    function packCount(){ return CTX.packCount; }
    function packPriceOf(){ return CTX.packPrice; }
    function invGstAdjust(v){ return v; }
    function cpbu(p){ return p.cost_per_base_unit; }
    ${extractFn(SRC, 'invPackPreviewText')}
    function unitCatWord(c){ return c==='kg'?'kg':c==='l'?'litre':'unit'; }
    // 0b: the unit-category chain is EXTRACTED, not stubbed. unitCatCategory used to be a hand-rolled
    // copy here, and the whole point of the new guard is that the render and the write agree about
    // which unit a row lands in — a copy that agrees with a wrong belief is this repo's most-recorded
    // defect. unitCatWord is three literals with no branch worth extracting.
    ${extractFn(SRC, 'unitCatCategory')}
    ${extractFn(SRC, 'unitToBaseFields')}
    ${extractFn(SRC, 'kingRepointGuard')}
    ${extractFn(SRC, 'invPriceUnit')}
    ${extractFn(SRC, 'invUnitRebase')}
    ${extractFn(SRC, 'invPackUnitOpts')}
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
  return factory(byId, CTX);
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
  assert.ok(h1.indexOf('price change \u2014 check') >= 0, 'price change wins');   // v44 item 2: token renamed from "price jump"
  assert.ok(h1.indexOf('low match \u2014 check') < 0, 'and suppresses the lower-precedence token');

  // clean high-confidence match: no token at all
  const clean = Object.assign(attentionRow(), { needsAttention: false });
  const h2 = buildRow(clean, 0);
  assert.ok(h2.indexOf('low match \u2014 check') < 0, 'an 82% match is not a low match');
  assert.ok(h2.indexOf('price change \u2014 check') < 0, 'and has no price change');   // v44 item 2: token renamed
  assert.ok(/class="inv-data st-matched"/.test(h2), 'a clean match is not muted and carries st-matched (v37)');
});

test('v37: the row class carries invRowState, so new and low-match rows can tint red like the summary says', () => {
  const low = Object.assign(attentionRow(), { conf: 0.4, tier: 'mid', needsAttention: false });
  assert.ok(/ st-review"/.test(buildRow(low, 0)), 'a low-confidence match is st-review');
  const nw = Object.assign(attentionRow(), { addNew: true, bestId: null, needsAttention: false });
  assert.ok(/ st-new"/.test(buildRow(nw, 0)), 'an add-new line is st-new');
});

test('v39: only a clean matched row renders pre-ticked — flagged/new rows never do', () => {
  const flagged = buildRow(attentionRow(), 0);                      // needsAttention -> st-review
  assert.ok(!/invAppr" checked/.test(flagged), 'a price-jump row must not be pre-ticked');
  const clean = buildRow(Object.assign(attentionRow(), { needsAttention: false }), 0);
  assert.ok(/invAppr" checked/.test(clean), 'a clean hi match still auto-ticks');
});

test('Q8 (v127): a tick the USER placed survives a re-render — on any row state', () => {
  // the v50/v52 bug: renderInvReview re-derived every tick from invRowState, so a user's tick on a
  // review or price-change row was discarded whenever anything else on the sheet re-rendered.
  const reviewTicked = buildRow(Object.assign(attentionRow(), { userTick: true }), 0);   // needsAttention -> st-review
  assert.ok(/invAppr" checked/.test(reviewTicked), "the user's tick on a review row is restored, not re-derived");
  assert.ok(/ st-review/.test(reviewTicked), 'and the row is still review — restoring a tick is not a state change');

  // the mirror case: the user UNTICKED a matched row; the pre-tick must not resurrect it
  const matchedUnticked = buildRow(Object.assign(attentionRow(), { needsAttention: false, userTick: false }), 0);
  assert.ok(!/invAppr" checked/.test(matchedUnticked), "the user's untick on a matched row survives too");

  // no user decision -> the auto-tick law exactly as before (pinned again here so this test stands alone)
  const noDecision = buildRow(attentionRow(), 0);
  assert.ok(!/invAppr" checked/.test(noDecision), 'absent a decision, a review row is never pre-ticked');
});

test('Q8 (v127): every self-edit path clears userTick — the persistence protects ticks from OTHER rows only', () => {
  // Playwright is not in npm test, so the clearing rule gets a source pin here too (the addProduct
  // lesson: what only a spec covers can be deleted silently). One site per self-edit path:
  // invSelChanged (match pick) · the .invPrice change handler · the +New open · closeNewItem · the
  // pack-teach recompute. Five, exactly.
  const sites = (SRC.match(/delete (r|invRows\[i\])\.userTick/g) || []).length;
  assert.equal(sites, 5, 'five clearing sites — one per self-edit path; a missing one re-opens the v127 review\'s "ticked but unappliable" hole');
  assert.ok(extractFn(SRC, 'invSelChanged').includes('delete r.userTick'), 'match pick clears');
  assert.ok(extractFn(SRC, 'closeNewItem').includes('userTick'), 'dismissing the new-item form clears');
});

test('v50 item 1: a new-item row persists its ticked state across re-renders (newItem.approved drives the box, v39 still holds)', () => {
  const base = Object.assign(attentionRow(), { addNew: true, bestId: null, needsAttention: false });
  // no form yet -> unticked (v39: a new row is never auto-ticked by the renderer)
  const fresh = buildRow(Object.assign({}, base, { newItem: null }), 0);
  assert.ok(!/invAppr" checked/.test(fresh), 'a brand-new add-new row is not pre-ticked');
  // form open but not yet ticked by the user -> still unticked
  const open = buildRow(Object.assign({}, base, { newItem: { approved: false } }), 0);
  assert.ok(!/invAppr" checked/.test(open), 'an open-but-unticked new-item form stays unticked');
  // user ticked it -> a subsequent re-render must keep it ticked (THE BUG this batch fixes)
  const ticked = buildRow(Object.assign({}, base, { newItem: { approved: true } }), 0);
  assert.ok(/invAppr" checked/.test(ticked), 'once the user ticks a new item, a re-render keeps it ticked');
  assert.ok(/ st-new"/.test(ticked), 'and the row is still st-new (a filled new item is not "matched")');
});

test('v72: the new-item form slot nests INSIDE the row card and PRECEDES the Apply control', () => {
  // add-new mode: the form panel lives inline in the Match cell, before the Apply checkbox,
  // so one card reads header -> price -> match -> form -> Apply (last). The checkbox is unmoved.
  const r = Object.assign(attentionRow(), { addNew: true, bestId: null, needsAttention: false });
  const html = buildRow(r, 0);
  const slot = html.indexOf('ni-slot');
  const panel = html.indexOf('ni-panel');
  const apply = html.indexOf('class="invAppr"');
  assert.ok(slot >= 0, 'an add-new row carries the nested form slot (.ni-slot)');
  assert.ok(panel >= 0, 'and the .ni-panel the form fills');
  // full source order: the slot opens, the panel sits inside it, THEN the Apply checkbox (form above Apply)
  assert.ok(slot < panel && panel < apply, 'order must be ni-slot < ni-panel < Apply, got slot=' + slot + ' panel=' + panel + ' apply=' + apply);
  // and the panel is the slot's CHILD, not a detached sibling — the whole point of the nesting fix
  assert.ok(/class="ni-slot"[^>]*>\s*<div class="ni-panel">/.test(html), 'the .ni-panel must be nested directly inside the .ni-slot');
  // a matched row has no inline new-item slot
  const m = buildRow(Object.assign(attentionRow(), { needsAttention: false }), 0);
  assert.ok(m.indexOf('ni-slot') < 0, 'a matched row carries no nested new-item slot');
});

test('ITEM 1: a hand-picked match is never called a low match — the user already made that call', () => {
  const r = Object.assign(attentionRow(), { manualPick: true, bestId: 'P0999', needsAttention: false });
  const html = buildRow(r, 0);
  assert.ok(html.indexOf('manual') >= 0, 'confidence reads as a labelled manual token');
  assert.ok(html.indexOf('low match \u2014 check') < 0, 'and carries no low-match scolding');
});

/* ---------------------------------------------------------------------------
 * 0b — THE PACK-UNIT CONTROL. Two defects lived in this markup, and the second was the
 * easier route into the first: the select offered every unit, and its PREFILL preferred
 * 'ea' whenever the line carried an "N x N" pack pattern — on a product stored per gram.
 * Confirming a prefill nobody chose then re-based the product.
 * ------------------------------------------------------------------------- */

// a row asking to be taught a pack, on the per-gram CHIPS product
function teachRow() {
  return { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG 55.00', bestId: 'P0108',
           unitPrice: null, unit: 'auto', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
           needsAttention: false, addNew: false, manualPick: false, needManual: true,
           unitMismatch: false, uncertain: false, remembered: false };
}

const packUnits = (html) => {
  const m = /<select class="invPackUnit"[^>]*>([\s\S]*?)<\/select>/.exec(html);
  assert.ok(m, 'the pack-unit select must be in the markup');
  return [...m[1].matchAll(/value="([^"]+)"(\s+selected)?/g)].map(x => ({ v: x[1], sel: !!x[2] }));
};

test('0b: the pack-unit select cannot offer a category the product is not measured in', () => {
  const html = makeRowBuilder([CHIPS])(teachRow(), 0);
  const opts = packUnits(html).map(o => o.v);
  assert.deepEqual(opts, ['kg', 'g'], 'CHIPS is stored per gram — units and litres would re-base it');
});

test('0b: an "N x N" line no longer prefills UNITS on a weighted product', () => {
  /* THE REGRESSION IN ONE LINE. `packCount('6X2.5KG')` is truthy for every carton line Bidfood
     sends, and the old prefill read it FIRST — so the control opened on "units" for a product
     stored per gram, and the ✓ that looks like agreement re-based it. A carton of six 2.5kg bags
     is 15 kg here, not 6 units. */
  const html = makeRowBuilder([CHIPS], { packCount: 6 })(teachRow(), 0);
  const sel = packUnits(html).filter(o => o.sel).map(o => o.v);
  assert.deepEqual(sel, ['kg'], 'the product’s own category wins over the parser’s pack-count guess');
});

test('0b: a per-unit product still prefills and offers units', () => {
  // The fix must not invert into "weights always win": a product genuinely sold by the unit keeps
  // the control it needs, with or without a pack count on the line.
  const EGGS = { id: 'P0108', description: 'Eggs 700g Tray', base_unit: 'ea', dispPrice: 9 };
  const html = makeRowBuilder([EGGS], { packCount: 30 })(teachRow(), 0);
  assert.deepEqual(packUnits(html), [{ v: 'ea', sel: true }]);
});

test('0b: a re-basing row is tinted, badged and EXPLAINED — the tint alone is not a reason', () => {
  /* The existing explain block fires on `needManual && !remembered`, which a taught pack is not —
     so before 0b this row rendered red with nothing on screen saying why. */
  const r = Object.assign(teachRow(), { unit: 'ea', unitPrice: 2, needManual: false,
                                        packTaught: true, taughtQty: 6, taughtUnit: 'ea' });
  const html = makeRowBuilder([CHIPS])(r, 0);
  assert.ok(/class="inv-data[^"]*st-review"/.test(html), 'a re-basing row must tint like every other review row');
  assert.ok(html.indexOf('flag-mismatch') >= 0, 'it wears the unit-mismatch badge — one signal, not a second vocabulary');
  assert.ok(html.indexOf('measured per kg') >= 0 && html.indexOf('to per unit') >= 0,
    'the message must name BOTH categories, or it does not tell the user what to change');
  assert.ok(html.indexOf('Products screen') >= 0,
    'and where to change it — the product is what is stored wrong, not this control');
});

test('0b: a pack already STORED in another category is still shown by the control', () => {
  // Data taught before the guard existed. The select must show what is really stored; the row is
  // flagged and applyInvoice refuses it. A select that silently reads back a different value is a
  // second wrong-data bug wearing the fix for the first.
  const STALE = { id: 'P0108', description: 'Chips', base_unit: 'g', dispPrice: 12.5,
                  pack_qty: 6, pack_unit: 'ea' };
  const r = Object.assign(teachRow(), { fromProductPack: true, needManual: false });
  const html = makeRowBuilder([STALE])(r, 0);
  assert.deepEqual(packUnits(html), [{ v: 'kg', sel: false }, { v: 'g', sel: false }, { v: 'ea', sel: true }]);
});

test('0b: a suspected WRONG MATCH outranks the re-base badge — the cause, not the symptom', () => {
  /* Caught by tests/smoke.js, which paints the real screen: a maple-syrup line matched to a chips
     product hits both signals at once. Badging it "unit mismatch" and telling the user to change the
     product on the Products screen sends them to fix a product that is stored perfectly well — the
     match is what is wrong. The GUARD is untouched by this: the row is still 'review', still
     unticked, and applyInvoice still refuses it. Only the wording defers. */
  const r = Object.assign(teachRow(), { unit: 'l', unitPrice: 12, needManual: false,
    packTaught: true, taughtQty: 1, taughtUnit: 'l', gemMatchReview: true, gemSuggestId: 'P0107' });
  const html = makeRowBuilder([CHIPS])(r, 0);
  assert.ok(html.indexOf('check match') >= 0, 'the more specific signal must be the one shown');
  assert.ok(html.indexOf('flag-mismatch') < 0, 'and the re-base badge must stand down');
  assert.ok(html.indexOf('Products screen') < 0, 'so must its advice — the product is not what is wrong here');
  assert.ok(/class="inv-data[^"]*st-review"/.test(html), 'but the row is still a review row');
});

test('0b: with no more specific signal, the SAME row does badge and explain the re-base', () => {
  // The other half of the pair, so "defers to a better signal" cannot decay into "never shows".
  const r = Object.assign(teachRow(), { unit: 'l', unitPrice: 12, needManual: false,
    packTaught: true, taughtQty: 1, taughtUnit: 'l' });
  const html = makeRowBuilder([CHIPS])(r, 0);
  assert.ok(html.indexOf('flag-mismatch') >= 0);
  assert.ok(html.indexOf('Products screen') >= 0);
});
