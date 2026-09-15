/*
 * king-head-sub.test.js (268, queue item 58)
 *
 * The Ingredients screen used to carry its setup count on its own detached row — `#kingProgress`,
 * "164 of 399 products have an ingredient", floating between the header bar and the search row.
 * Item 58 moves it into the header subtitle, where this screen's other counts already live, and
 * `kingHeadSummary` is now the ONE function that composes that line.
 *
 * ⚠️ THE NUMBER THE QUEUE ITEM ASKED FOR WAS WRONG AND THAT IS WHY THIS FILE EXISTS.
 * It proposed "164 ingredients, 235 products unlinked", reading the old line's 164 as a count of
 * ingredients. 164 was the count of LINKED PRODUCTS — `kingLinkableProducts().length` minus
 * `kingUnlinkedProducts().length` — and the ingredient count is a different figure entirely. On a
 * costing screen a confidently wrong count is worse than no count, so the two are pinned apart
 * here: the fixtures below deliberately give every quantity a DIFFERENT value, per the roster's
 * 184(b) rule that a fixture whose fields agree cannot tell you which one the code read.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { extractFn } = require('./_extractfn');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');

/* The REAL kingHeadSummary and the REAL kingUnlinkedProducts, not copies — a stub written from the
 * same belief as the code passes against the defect it was written to catch (roster, 22 incidents).
 * `kingLinkableProducts` is the one thing injected, because it is the PRODUCTS global's reader and
 * the whole point is to vary the catalogue.
 */
function makeSummary(products, kitchen) {
  const factory = new Function('PRODUCTS_', 'KITCHEN', 'BYID', `
    "use strict";
    var kitchenIngredients = KITCHEN, byId = BYID;
    function kingLinkableProducts(){ return PRODUCTS_.filter(function(p){ return p && p.description && p.is_food!==false; }); }
    ${extractFn(SRC, 'kingUnlinkedProducts')}
    ${extractFn(SRC, 'kingUnlinkedClause')}
    ${extractFn(SRC, 'kingHeadSummary')}
    return function(){ return kingHeadSummary(kitchenIngredients); };
  `);
  const byId = {};
  products.forEach((p) => { byId[p.id] = p; });
  return factory(products, kitchen, byId);
}

// 5 linkable products (one is_food:false is excluded), 3 kitchen ingredients, 1 of them broken.
// Every count differs from every other, on purpose.
const PRODUCTS = [
  { id: 'P1', description: 'Chips Straight Cut', is_food: true },
  { id: 'P2', description: 'Eggs Large', is_food: true },
  { id: 'P3', description: 'Flour Plain', is_food: true },
  { id: 'P4', description: 'Oil Canola', is_food: true },
  { id: 'P5', description: 'Napkins', is_food: true },
  { id: 'P6', description: 'Dishwasher Tablets', is_food: false },
];

test('268: the subtitle counts INGREDIENTS and UNLINKED PRODUCTS as two different numbers', () => {
  // 3 ingredients; 2 of them link to real products, so 4 of the 5 linkable products are unlinked.
  const kitchen = [{ pid: 'P1' }, { pid: 'P2' }, { pid: 'GONE' }];
  const out = makeSummary(PRODUCTS, kitchen)();
  assert.equal(out, '3 ingredients, 1 product missing, 3 products with no ingredient');
  /* Read that against the item's proposal: it would have printed the LINKED count (2) as the
     ingredient count (3). The two are one apart in this fixture on purpose — a fixture where they
     coincided would pass either way. */
});

test('268: zero ingredients still reports the unlinked products — the first-run state', () => {
  /* ⚠️ THIS IS THE REGRESSION THE MOVE CREATED AND IS THE REASON THE FUNCTION LOST AN EARLY EXIT.
     `kingHeadSummary` opened with `if(!n) return ''`, which was correct while it only counted
     ingredients. The empty branch of renderKitchenPanel says in its own comment that zero kitchen
     words plus many products is "EXACTLY when the wizard matters" — and that is precisely the
     state the early exit would have blanked, silently dropping the count `#kingProgress` used to
     print at the only moment it is the whole story. */
  const out = makeSummary(PRODUCTS, [])();
  assert.equal(out, '5 products with no ingredient');
});

test('268: a genuinely empty app says nothing at all', () => {
  assert.equal(makeSummary([], [])(), '', 'no ingredients and no products leaves the slot empty');
});

test('268: the unlinked clause disappears when every product is linked', () => {
  const kitchen = PRODUCTS.filter((p) => p.is_food !== false).map((p) => ({ pid: p.id }));
  const out = makeSummary(PRODUCTS, kitchen)();
  assert.equal(out, '5 ingredients', 'nothing left to set up, so the slot does not nag');
  assert.ok(!/no ingredient/.test(out), 'and the clause is absent rather than reading zero');
});

test('268: singulars', () => {
  assert.equal(makeSummary([PRODUCTS[0]], [])(), '1 product with no ingredient');
  assert.equal(makeSummary([PRODUCTS[0]], [{ pid: 'P1' }])(), '1 ingredient');
  assert.equal(makeSummary([PRODUCTS[0]], [{ pid: 'GONE' }])(),
    '1 ingredient, 1 product missing, 1 product with no ingredient');
});

/* ⚠️ THE TWO HOMES, AND THIS IS THE TEST THAT EXISTS BECAUSE THE FIRST ATTEMPT WAS WRONG.
 * Item 58 says to move the count into the header sub. `.scr-sub` is `display:none` below 768 — on
 * this screen the subtitle slot does not exist on a phone (the Menu screen's `#menuHeadSub`
 * overrides that by id and is the one exception; see `.claude/rules/css.md`) — so moving the count
 * there and deleting `#kingProgress` renders
 * correctly at 1360 and DELETES THE COUNT ON THE PHONE, with the entire suite green. It was caught
 * by rendering the screen at 380, which is why `docs/PHONE.md`'s replacement (a browser agent) is
 * part of the loop rather than an optional extra.
 * What is pinned here is the invariant, not the layout: ONE function produces the string, two
 * elements render it, and CSS makes them mutually exclusive off the SAME breakpoint. Any of those
 * three drifting is what this catches — two copies of the arithmetic, a missing sink, or two rules
 * that stop being opposite.
 */
test('268: the setup count has ONE source and two mutually exclusive homes', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
    .replace(/<!--[\s\S]*?-->/g, '');
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const app = SRC.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .map((l) => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n');

  // ONE source. kingUnlinkedProducts().length is read in exactly one place: the clause builder.
  assert.equal((app.match(/kingUnlinkedProducts\(\)\.length/g) || []).length, 1,
    'the unlinked count is computed once — a second reader is a second copy of the arithmetic, which is how two numbers on one screen start disagreeing');
  assert.match(app, /function kingUnlinkedClause\(\)/, 'and it has a name both renderers can call');

  // TWO sinks, both calling it.
  assert.match(app, /function kingHeadSummary\([\s\S]{0,1600}kingUnlinkedClause\(\)/,
    'the header sub gets the clause');
  assert.match(app, /function renderKingProgress\(\)\{[\s\S]{0,900}kingUnlinkedClause\(\)/,
    'and so does #kingProgress');
  assert.ok(/id="kingProgress"/.test(html), 'the phone-visible element still exists');
  assert.ok(/id="kingHeadSub"/.test(html), 'and so does the desktop one');

  /* MUTUALLY EXCLUSIVE, OFF THE SAME BREAKPOINT. `.scr-sub` is display:none by default and block
     inside a min-width:768 block; `.king-progress` must be the exact inverse, and the hide has to
     live in THAT block — a different breakpoint would leave a width showing both or neither. */
  assert.match(css, /\.scr-sub\{display:none/, '.scr-sub is hidden by default');
  /* ⚠️ `@media (min-width:768px)` OCCURS SEVERAL TIMES IN THIS SHEET, and slicing from the FIRST one
     is how the first draft of this assertion failed against correct CSS. Anchor on the rule itself:
     take the text from `.scr-sub{display:block` to the next `@media`, which is the remainder of the
     block that rule lives in, and require the hide to be inside it. That pins what actually matters
     — the two rules stay one edit apart, in one block, off one breakpoint — rather than pinning a
     position in the file. */
  /* ⚠️ THIS FINDS THE BLOCK BY COUNTING BRACES, NOT BY SLICING TO THE NEXT `@media`.
     The slice version was written first and the pre-push review killed it: it measured PROXIMITY,
     so moving `.king-progress.is-on{display:none}` OUT of the media query to unguarded top-level
     CSS would have kept it textually before the next `@media` token and left the test green —
     while reintroducing the exact "shows in both places on desktop" bug this test exists to stop.
     A check that measures ordering instead of the structural fact is this repo's most-recorded
     defect class, and here it was in the test written to police a structural fact. */
  const subShown = css.indexOf('.scr-sub{display:block');
  assert.ok(subShown > 0, '.scr-sub is shown somewhere');
  const openIdx = css.lastIndexOf('@media', subShown);
  assert.ok(openIdx >= 0, '.scr-sub{display:block} is inside a media query');
  assert.match(css.slice(openIdx, css.indexOf('{', openIdx)), /min-width:\s*768px/,
    'and that query is the 768 breakpoint');
  // walk from the query's opening brace to its matching close
  let i = css.indexOf('{', openIdx), depth = 0, end = -1;
  for (; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) { end = i; break; }
  }
  assert.ok(end > subShown, 'the block closes after the .scr-sub rule');
  const sameBlock = css.slice(openIdx, end);
  assert.match(sameBlock, /\.king-progress\.is-on\{display:none\}/,
    '#kingProgress must be hidden INSIDE the same media block that shows the sub — outside it, the hide applies at every width and the phone loses the count');

  /* ⚠️ THE TWO RULES MUST MATCH ON SPECIFICITY, which is the whole of css.md's opening section: a
     @media block does not win by being later, specificity is compared first, so a 0,1,0 rule inside
     the query cannot override a 0,2,0 rule outside it. Both are `.king-progress.is-on`. */
  assert.match(css, /\.king-progress\.is-on\{display:block\}/,
    'the small-screen rule is the same two-class selector, so source order is what decides');

  /* AND THE ELEMENT CARRIES NO INLINE `display`, because an inline style beats a stylesheet rule
     outright — it would pin the count visible at every width and defeat the pair above. This is the
     assertion that catches the mistake, since both CSS rules can be perfect and still be overridden. */
  assert.ok(!/id="kingProgress"[^>]*style=/.test(html),
    '#kingProgress has no inline style — an inline display beats both rules above and shows the count twice on desktop');
  /* Scoped to `pr`, which is #kingProgress's own handle. ⚠️ The first version of this searched for
     any `.style.display` within 400 characters of "kingProgress" and went red against correct code,
     because `wb.style.display` — the BUTTON's, which is legitimate and unrelated to the breakpoint —
     sits two lines away. A proximity match is not a match on the thing you mean. */
  const fn = app.slice(app.indexOf('function renderKingProgress()'));
  const body = fn.slice(0, fn.indexOf('\nfunction '));
  assert.ok(!/pr\.style\.display/.test(body),
    'renderKingProgress must not write #kingProgress\'s display inline — it would beat both CSS rules and show the count at every width');
  assert.match(body, /pr\.classList/, 'it toggles a class instead, so the cascade decides');
});

/* ⚠️ THE EXCEPTION, PINNED, BECAUSE THE RULE WAS WRITTEN AS AN ABSOLUTE AND THE ABSOLUTE WAS WRONG.
 * Batch 268 wrote "the subtitle slot does not exist on a phone AT ALL" into `.claude/rules/css.md`,
 * and AUDIT-v217 caught it the next day: `#menuHeadSub` sets `display:block` OUTSIDE any media
 * query, at id specificity, so the Menu screen's subtitle is the one that survives below 768.
 * It is deliberate and the reason is at its own rule — on Menu the current menu's NAME otherwise
 * lives only in a switcher that scrolls away under the pinned bar.
 *
 * This is pinned rather than merely written down because the absolute is the version that gets
 * quoted, and quoting it at consolidated item 61 — which IS the Menu screen — would manufacture
 * exactly the two-places bug 268 spent a batch removing. A test names which screen is the
 * exception, so the next reader gets the qualified fact rather than the tidy one.
 */
test('268/269: .scr-sub is desktop-only on six screens, and #menuHeadSub is the stated exception', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.scr-sub\{display:none/, 'the default is hidden');

  const idx = css.indexOf('#menuHeadSub{display:block');
  assert.ok(idx > 0,
    '#menuHeadSub must still force itself visible — without it the Menu screen shows a bare "Menu" on a phone with the menu name scrolled away');

  /* AND IT MUST BE OUTSIDE A MEDIA QUERY, which is the whole of why it is an exception. Walk every
     @media block and assert none of them contains it: inside one, it would inherit that block's
     width condition and stop being the phone's answer. */
  const blocks = [];
  let at = css.indexOf('@media');
  while (at >= 0) {
    let i = css.indexOf('{', at), depth = 0, end = -1;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}' && --depth === 0) { end = i; break; }
    }
    if (end < 0) break;
    blocks.push([at, end]);
    at = css.indexOf('@media', end);
  }
  const inside = blocks.some(([a, b]) => idx > a && idx < b);
  assert.equal(inside, false,
    '#menuHeadSub{display:block} must sit OUTSIDE every media query — inside one it picks up that width condition and the Menu screen loses its name on a phone');
});
