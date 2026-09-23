/*
 * edit-modal-figures.test.js — 277 (queue item 53, bullets U1 and U22).
 *
 * TWO THINGS, AND THE SECOND IS THE ONE THAT COULD HAVE COST MONEY.
 *
 * U1 — the Edit-menu-item modal now shows the figure it is asking you to change. It RENDERS
 * `menuMarginPreview`, the pure function the publish dialog already uses, so the modal, the publish
 * dialog, the builder's docket verdict and the Menu row cannot disagree about one dish.
 * ⚠️ The queue item said "render it, do not recompute it" and was right, while naming the wrong
 * function: it credited `publishPlan`, which returns `{action, existingId, unlinked}` and no figure
 * at all. A batch following the pointer would have found nothing to render and written its own
 * arithmetic, which is the second copy this codebase has repeatedly paid for.
 *
 * U22 — money inputs read `31.00` instead of `31`. **`padMoney` PADS AND NEVER ROUNDS**, and that
 * is the whole function rather than a nicety. The item said "format to two decimals" and named
 * `#ig_price` among the fields. `#ig_price` holds a price PER KG / LITRE / UNIT — `perDisplayValue`
 * multiplies the stored per-base-unit cost by 1000 for g and ml — and `saveIngEdit` reads that same
 * element straight into `cost_per_base_unit`. Measured over the 384 priced rows of the real
 * catalogue fixture: **44 carry more than two decimals, 7 are under a cent, and the smallest is
 * $0.0056/kg**, which `toFixed(2)` turns into $0.01 — a 79% increase, written to a stored cost.
 * The property test below is the guard, and it runs over the real fixture rather than over examples.
 *
 * WHY EACH TEST IS A REGRESSION RATHER THAN A DESCRIPTION:
 *  1. `padMoney` never changes the NUMBER, asserted across every real catalogue value rather than
 *     at hand-picked points. A `toFixed(2)` re-introduced here fails on 44 of them.
 *  2. `padMoneyEl` refuses to write a value that does not round-trip — the belt that makes a blur
 *     listener safe to attach to a field holding a stored cost.
 *  3. `renderEditMargin` has THREE states and the middle one is the one a naive version drops: a
 *     plate that cannot be fully costed renders "not costed", never a suggested price built from a
 *     total that is silently short (222's rule, and this form's whole job is the price).
 *  4. It reads the shared function rather than recomputing. Asserted by making `menuMarginPreview`
 *     return a sentinel and finding it in the output.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
const CATALOGUE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'base-products.json'), 'utf8'));

/* ------------------------------------------------------------------ 1 + 2. padMoney */

// eslint-disable-next-line no-new-func
const money = new Function(`
  ${extractFn(SRC, 'padMoney')}
  ${extractFn(SRC, 'padMoneyEl')}
  return { padMoney: padMoney, padMoneyEl: padMoneyEl };
`)();

test('277: padMoney pads to two places', () => {
  assert.strictEqual(money.padMoney(31), '31.00');
  assert.strictEqual(money.padMoney(12), '12.00');
  assert.strictEqual(money.padMoney(12.5), '12.50');
  assert.strictEqual(money.padMoney(0), '0.00');
  assert.strictEqual(money.padMoney('0.5'), '0.50');     // the builder's misc input, against a docket printing $0.46
});

test('277: padMoney keeps every decimal a value actually has', () => {
  assert.strictEqual(money.padMoney(0.0056), '0.0056', 'the smallest real per-kg price in the catalogue');
  assert.strictEqual(money.padMoney(24.785), '24.785');
  assert.strictEqual(money.padMoney('1.2300'), '1.23', 'trailing zeros are not significant decimals');
});

test('277: padMoney never eats input it cannot parse', () => {
  assert.strictEqual(money.padMoney(''), '');
  assert.strictEqual(money.padMoney(null), '');
  assert.strictEqual(money.padMoney(undefined), '');
  assert.strictEqual(money.padMoney('abc'), 'abc');
  assert.strictEqual(money.padMoney('  '), '');
});

/* ⚠️ THE PROPERTY, OVER THE REAL CATALOGUE RATHER THAN OVER EXAMPLES. `#ig_price` shows
   `perDisplayValue(p)` — the stored cost times 1000 for g and ml — and `saveIngEdit` parses that
   same element back into `cost_per_base_unit`. So anything this function does to the field is done
   to a stored cost on the next save. Hand-picked examples would have passed a `toFixed(2)`; 44 of
   these do not. */
test('277: padMoney changes no VALUE, across all 384 priced rows of the real catalogue', () => {
  const vals = Object.values(CATALOGUE)
    .map((p) => {
      const c = Number(p.cost_per_base_unit);
      if (!isFinite(c) || c <= 0) return null;
      return (p.base_unit === 'g' || p.base_unit === 'ml') ? c * 1000 : c;
    })
    .filter((v) => v != null);

  assert.ok(vals.length > 300, `fixture should carry hundreds of priced rows, found ${vals.length}`);

  const moved = vals.filter((v) => Number(money.padMoney(v)) !== v);
  assert.deepStrictEqual(moved, [], 'padMoney must be value-preserving on every real product');

  /* The control that keeps the test above from being vacuous: these values genuinely DO have more
     than two decimals, so a rounding implementation would be caught rather than coincidentally
     agreeing. Roster 270 — a control must be about the code, not about the environment. */
  const wouldRound = vals.filter((v) => Number(v.toFixed(2)) !== v);
  assert.ok(wouldRound.length > 20,
    `the fixture must contain values toFixed(2) would move, or this test proves nothing — found ${wouldRound.length}`);
  assert.ok(Math.min(...vals) < 0.01, 'and at least one under a cent, which is where rounding does the most damage');
});

/* ⚠️ THE ROUND-TRIP CHECK INSIDE `padMoneyEl` CANNOT BE KILLED BY THIS FILE, AND THAT IS STATED
   RATHER THAN HIDDEN. `Number(out) === Number(el.value)` can only ever fail if `padMoney` returns a
   different NUMBER, and the property test above proves it never does — so deleting the check leaves
   every assertion here green. It is defence-in-depth against a FUTURE `padMoney` that rounds, on a
   field whose value `saveIngEdit` writes to `cost_per_base_unit`, and it is deliberately kept.
   Not added to `tests/mutation/targets.js` for the same reason: the gate would report it as a
   survivor forever, and an allowance that says "unreachable while its sibling is correct" is a
   truer record here than a target nobody can satisfy. */
test('277: padMoneyEl writes only a value that round-trips to the same number', () => {
  const el = { value: '31' };
  money.padMoneyEl(el);
  assert.strictEqual(el.value, '31.00');

  const precise = { value: '0.0056' };
  money.padMoneyEl(precise);
  assert.strictEqual(precise.value, '0.0056', 'untouched, because padding it changes nothing');

  const junk = { value: 'abc' };
  money.padMoneyEl(junk);
  assert.strictEqual(junk.value, 'abc', 'a field the user is mid-way through typing is left alone');

  const blank = { value: '' };
  money.padMoneyEl(blank);
  assert.strictEqual(blank.value, '', 'an empty field stays empty rather than becoming 0.00');
});

/* ------------------------------------------------------------------ 3 + 4. renderEditMargin */

/* The REAL renderEditMargin over a fake document. Everything it reaches outside itself is supplied,
   and `menuMarginPreview` is a SENTINEL rather than the real function — this test is about which
   figures the modal renders and where it gets them, and the real preview has its own file
   (`menu-margin.test.js`). A sentinel is what proves the modal did not do its own arithmetic. */
function render(opts) {
  const box = { className: '', textContent: '', innerHTML: '' };
  const price = { value: opts.price == null ? '' : String(opts.price) };
  const els = { ed_margin: box, ed_price: price };
  const calls = [];
  // eslint-disable-next-line no-new-func
  const factory = new Function('E', 'OPT', 'CALLS', `
    var document={ getElementById:function(id){ return E[id]||null; } };
    var editTargetId = OPT.editTargetId;
    var menuById = OPT.menuById;
    var cogsPct = 30;
    function plateForMenuItem(m){ return OPT.plate; }
    function costDetail(lines){ CALLS.push('costDetail'); return OPT.costDetail; }
    function fmt2(x){ return '$'+Number(x).toFixed(2); }
    function marginLightWord(l){ return l==='green'?'Healthy margin':l==='red'?'Underpriced':''; }
    /* 283: the REAL formatter, deliberately not a sentinel. menuMarginPreview stays a sentinel
       because this file is about WHERE the modal gets its figures; the precision is the one thing
       about the number this modal owns, and it is the half that was wrong — this modal printed a
       whole number while the Menu row it opens FROM printed one decimal. */
    ${extractFn(SRC, 'fmtFoodPct')}
    function menuMarginPreview(cost, price){ CALLS.push('menuMarginPreview:'+cost+':'+price);
      return { cost:cost, price:price, suggested:OPT.suggested, light:OPT.light,
               pct:OPT.pct===undefined?null:OPT.pct }; }
    ${extractFn(SRC, 'renderEditMargin')}
    return renderEditMargin;
  `);
  factory(els, opts, calls)();
  return { box, calls };
}

const COSTED = {
  editTargetId: 'MI1', menuById: { MI1: { id: 'MI1', name: 'Toastie' } },
  plate: { id: 'PL1', lines: [{ misc: true, cost: 2 }] },
  costDetail: { cost: 2, miss: 0 }, suggested: 6.6667, light: 'green', pct: 20,
};

test('277: a costed dish renders cost, the price and the food-cost %, in the light', () => {
  const { box } = render({ ...COSTED, price: 10 });
  assert.match(box.innerHTML, /Ingredient cost <b>\$2\.00<\/b>/);
  assert.match(box.innerHTML, /at <b>\$10\.00<\/b>/);
  // 283: ONE DECIMAL, and this assertion is the pin. It read /20% food cost/ and passed while the
  // Menu row this modal is opened FROM printed the same dish's ratio at one decimal.
  assert.match(box.innerHTML, /<b>20\.0% food cost<\/b>/);
  assert.match(box.innerHTML, /Healthy margin/);
  assert.strictEqual(box.className, 'margin-preview mp-green', 'the light is the class, so it cannot disagree with the words');
});

test('277: the figures come from menuMarginPreview — the modal does no arithmetic of its own', () => {
  const { calls } = render({ ...COSTED, price: 10 });
  assert.ok(calls.includes('costDetail'), 'the cost comes from costDetail');
  assert.ok(calls.some((c) => c.startsWith('menuMarginPreview:2:10')),
    'and the verdict from menuMarginPreview, called with that cost and the typed price');
});

/* ⚠️ THE STATE A NAIVE VERSION DROPS. A plate with one uncostable line has a total that is silently
   short; a suggested price built from it is a confident wrong number on the screen where a sell
   price gets set. 222 established this for the publish dialog and it binds harder here. */
test('277: a plate that cannot be fully costed says so, and prices nothing', () => {
  const { box } = render({ ...COSTED, costDetail: { cost: 5, miss: 1 }, price: 10 });
  assert.strictEqual(box.textContent, 'not costed', "the app's own words for it — see plateCostText");
  assert.strictEqual(box.innerHTML, '', 'and no figure at all');
  assert.strictEqual(box.className, 'margin-preview', 'no light, because there is no verdict');
});

test('277: a zero-cost plate is the same refusal, not a $0.00 cost', () => {
  const { box } = render({ ...COSTED, costDetail: { cost: 0, miss: 0 }, price: 10 });
  assert.strictEqual(box.textContent, 'not costed');
});

test('277: clearing the price keeps the cost and the target-based suggestion', () => {
  const { box } = render({ ...COSTED, price: '', pct: null });
  assert.match(box.innerHTML, /Ingredient cost <b>\$2\.00<\/b>/);
  assert.match(box.innerHTML, /suggested <b>\$6\.67<\/b> at a 30% food cost/);
  assert.strictEqual(box.className, 'margin-preview', 'no light without a price to judge');
});

test('277: an unlinked dish renders nothing rather than guessing', () => {
  const { box, calls } = render({ ...COSTED, plate: null, price: 10 });
  assert.strictEqual(box.textContent, '');
  assert.strictEqual(box.innerHTML, '');
  assert.ok(!calls.includes('costDetail'), 'and it does not go looking for a cost that cannot exist');
});

test('277: no target dish at all is a safe no-op', () => {
  const { box } = render({ ...COSTED, editTargetId: null, price: 10 });
  assert.strictEqual(box.textContent, '');
  assert.strictEqual(box.innerHTML, '');
});
