/*
 * layer-anchor.test.js — batch 212, queue item 6.
 *
 * WHAT THIS PINS, AND WHY IT IS NOT `dropPlace`'s TEST (`tests/combo-drop.test.js` is that).
 * `dropPlace` decides WHICH SIDE a layer opens on and HOW TALL it may be. This file pins the step
 * before it: WHAT COORDINATE SPACE the answer is written into.
 *
 * THE DEFECT IT EXISTS FOR. `anchorDrop` sets `position:fixed` and then writes the anchor's VIEWPORT
 * rect straight into `left`/`top`. That is correct only when the layer's containing block IS the
 * viewport, and the comment at anchorDrop justified it with a claim scoped to modals — "the modal's
 * only transform is the open animation, long finished by interaction time". A fixed element's
 * containing block is instead the nearest ancestor carrying `transform`, `perspective`, `filter`,
 * `backdrop-filter`, a layout/paint `contain`, or a `will-change` naming one of those.
 *
 * MEASURED 28 Aug 2026 in a real browser at 380px: `.bld-docket` carries `filter:drop-shadow` (it is
 * required — the docket's tear-off edge is a zigzag, so a box-shadow would cast a straight rectangle
 * under the teeth), and a `position:fixed;left:0;top:0` probe inside `.bld-add .search-wrap` landed
 * at (12, 198) rather than (0, 0). Handing the builder's ingredient list to the engine without this
 * would have rendered it 198px below its own field.
 *
 * THE FUNCTION IS EXTRACTED, NOT MIRRORED. CLAUDE.md's roster is twenty-two incidents of a stub
 * written from the same wrong belief as the code. The three DOM APIs it reads are injected instead,
 * and each fake node carries its own computed style and its own rect — collapsing either would make
 * the walk pass whatever it did.
 */
const test = require('node:test');
const assert = require('node:assert');
const { fixedContainingBlock, setDomEnv } = require('./_extract.js');

/* A fake node. `cs` is this node's OWN computed style and `rect` its OWN box, kept separate per node
   on purpose: a single shared style object cannot tell "the walk stopped at the right ancestor" from
   "the walk stopped at all". */
function node(cs, rect, parent) {
  return {
    parentElement: parent || null,
    __cs: Object.assign({
      transform: 'none', perspective: 'none', filter: 'none', backdropFilter: 'none',
      willChange: 'auto', contain: 'none',
      borderLeftWidth: '0px', borderTopWidth: '0px', borderBottomWidth: '0px',
    }, cs || {}),
    __rect: Object.assign({ left: 0, top: 0, right: 0, bottom: 0 }, rect || {}),
    getBoundingClientRect() { return this.__rect; },
  };
}

/* Build a chain root -> ... -> leaf and install it as the DOM. Returns the leaf's CHILD, which is
   what anchorDrop passes (the walk starts at parentElement, as a containing block must). */
function install(chain, innerHeight) {
  const html = node({}, {});
  let parent = html;
  for (const spec of chain) { parent = node(spec.cs, spec.rect, parent); }
  const leaf = node({}, {}, parent);
  setDomEnv({
    document: { documentElement: html },
    window: { innerHeight: innerHeight == null ? 800 : innerHeight },
    getComputedStyle: (n) => n.__cs,
  });
  return leaf;
}

test('with no special ancestor the containing block IS the viewport', () => {
  const leaf = install([{ cs: {}, rect: { left: 50, top: 60, bottom: 700 } }], 800);
  const cb = fixedContainingBlock(leaf);
  assert.strictEqual(cb.x, 0, 'x is the viewport origin');
  assert.strictEqual(cb.y, 0, 'y is the viewport origin');
  assert.strictEqual(cb.bottom, 800, 'and the bottom is the viewport height, not an element');
});

/* THE MEASURED CASE. The numbers are the ones taken off the shipped build, so this test fails with
   the real defect's real magnitude rather than a made-up one. */
test('a filter ancestor becomes the containing block — the builder docket, measured', () => {
  const leaf = install([
    { cs: {}, rect: { left: 0, top: 0, bottom: 780 } },
    { cs: { filter: 'drop-shadow(rgba(24, 24, 27, 0.08) 0px 8px 20px)' }, rect: { left: 12, top: 198, bottom: 577 } },
    { cs: {}, rect: { left: 12, top: 198, bottom: 577 } },
  ], 780);
  const cb = fixedContainingBlock(leaf);
  assert.strictEqual(cb.x, 12, 'the docket\'s left edge, which is where left:0 would land');
  assert.strictEqual(cb.y, 198, 'and its top — the 198px the builder list would have dropped by');
  assert.strictEqual(cb.bottom, 577, 'the flip-up case measures against the block, not innerHeight');
});

/* Each trigger is asserted on its own. A single "does it stop" test passes when only one arm works,
   and every one of these is a real CSS property some future screen will reach for. */
for (const [label, cs] of [
  ['transform', { transform: 'matrix(1, 0, 0, 1, 0, 0)' }],
  ['perspective', { perspective: '800px' }],
  ['filter', { filter: 'blur(2px)' }],
  ['backdrop-filter', { backdropFilter: 'blur(6px)' }],
  ['will-change: transform', { willChange: 'transform' }],
  ['will-change: filter', { willChange: 'filter' }],
  ['contain: paint', { contain: 'paint' }],
  ['contain: layout', { contain: 'layout' }],
  ['contain: strict', { contain: 'strict' }],
  ['contain: content', { contain: 'content' }],
]) {
  test(`${label} establishes the containing block`, () => {
    const leaf = install([{ cs, rect: { left: 20, top: 40, bottom: 400 } }], 800);
    const cb = fixedContainingBlock(leaf);
    assert.strictEqual(cb.x, 20, `${label} must stop the walk`);
    assert.strictEqual(cb.y, 40, `${label} must stop the walk`);
    assert.strictEqual(cb.bottom, 400, `${label} must supply the bottom too`);
  });
}

/* THE NEGATIVE HALF, and it is the one that matters most. `will-change` and `contain` take many
   values, and only some establish a containing block. A guard that fires on ANY value of either
   would silently anchor layers to arbitrary ancestors — the failure would be a dropdown landing in
   the wrong place on a screen nobody changed. */
for (const [label, cs] of [
  ['will-change: opacity', { willChange: 'opacity' }],
  ['will-change: scroll-position', { willChange: 'scroll-position' }],
  ['contain: size', { contain: 'size' }],
  ['contain: style', { contain: 'style' }],
]) {
  test(`${label} does NOT establish one`, () => {
    const leaf = install([{ cs, rect: { left: 20, top: 40, bottom: 400 } }], 800);
    const cb = fixedContainingBlock(leaf);
    assert.strictEqual(cb.x, 0, `${label} does not create a containing block`);
    assert.strictEqual(cb.y, 0, `${label} does not create a containing block`);
    assert.strictEqual(cb.bottom, 800, 'so the viewport still supplies the bottom');
  });
}

test('the NEAREST qualifying ancestor wins, not the outermost', () => {
  const leaf = install([
    { cs: { transform: 'translateY(4px)' }, rect: { left: 5, top: 5, bottom: 900 } },
    { cs: {}, rect: { left: 10, top: 10, bottom: 800 } },
    { cs: { filter: 'drop-shadow(0 1px 1px #000)' }, rect: { left: 30, top: 90, bottom: 500 } },
  ], 800);
  const cb = fixedContainingBlock(leaf);
  assert.strictEqual(cb.x, 30, 'the inner filter, not the outer transform');
  assert.strictEqual(cb.y, 90, 'the inner filter, not the outer transform');
});

/* The containing block is the PADDING box. A border on the qualifying ancestor shifts the origin,
   and getBoundingClientRect returns the BORDER box — so the widths have to come off. A fake whose
   borders were all zero could never see this, which is why one is non-zero here. */
test('the origin is the padding box — the ancestor\'s border is subtracted', () => {
  const leaf = install([{
    cs: { transform: 'translateY(0)', borderLeftWidth: '3px', borderTopWidth: '7px', borderBottomWidth: '5px' },
    rect: { left: 100, top: 200, bottom: 600 },
  }], 800);
  const cb = fixedContainingBlock(leaf);
  assert.strictEqual(cb.x, 103, 'left border comes off the origin');
  assert.strictEqual(cb.y, 207, 'top border comes off the origin');
  assert.strictEqual(cb.bottom, 595, 'and the bottom border comes off the bottom');
});

test('the walk stops at documentElement rather than running off the top', () => {
  const leaf = install([{ cs: {}, rect: {} }, { cs: {}, rect: {} }, { cs: {}, rect: {} }], 640);
  const cb = fixedContainingBlock(leaf);
  assert.deepStrictEqual(cb, { x: 0, y: 0, bottom: 640 });
});

test('a node with no parent at all is the viewport, not a throw', () => {
  setDomEnv({ document: { documentElement: node({}, {}) }, window: { innerHeight: 500 }, getComputedStyle: (n) => n.__cs });
  assert.deepStrictEqual(fixedContainingBlock({ parentElement: null }), { x: 0, y: 0, bottom: 500 });
});
