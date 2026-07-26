/*
 * combo-drop.test.js (v86) — the combobox list must stay inside the surface it belongs to.
 *
 * THE BUG (Max's screenshot, invoice import → "Add new item from this invoice line" →
 * Ingredient name): anchorDrop measured the space around the input against the raw VIEWPORT.
 * On the LAST field of the form it therefore saw ~340px of "room below" and drew its full
 * 300px list — straight down through the Apply row and 144px past the bottom of the line's
 * card. Measured in a real browser at 380x820:
 *
 *     input   426 -> 472      card ends 632      Apply tick box 586 -> 610
 *     list    476 -> 776      (overlapped Apply, overran the card by 144px)
 *
 * dropPlace is the pure decision that was wrong. It now takes two boxes:
 *   soft = the modal ∩ the form panel  — a list may float over its OWN fields, never over the
 *                                        controls that FOLLOW the form (Apply),
 *   hard = the modal                   — an absolute bound, used only when the form is too
 *                                        tight on BOTH sides to show a usable list.
 * The numbers below are the real measured ones, so this test fails against the pre-v86 code.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { dropPlace } = require('./_extract.js');

// the real geometry from the reproduction, 380x820
const INPUT = { top: 426, bottom: 472 };
const MODAL = { top: 20, bottom: 800 };
const PANEL = { top: 20, bottom: 575 };            // the .ni-panel form ends above the Apply row
const soft = { top: MODAL.top, bottom: Math.min(MODAL.bottom, PANEL.bottom) };
const hard = MODAL;

test('v86: the last field opens UPWARD instead of drilling through the Apply row', () => {
  const p = dropPlace(INPUT, soft, hard);
  assert.strictEqual(p.below, false, 'there is only ~95px below inside the form, but ~398px above');
});

test('v86: opening upward, the list ends above the input and never reaches the Apply row (586)', () => {
  const p = dropPlace(INPUT, soft, hard);
  const top = INPUT.top - 4 - p.maxHeight;
  assert.ok(!p.below, 'precondition: opens upward');
  assert.ok(top >= MODAL.top, `list top ${top} must stay inside the modal (${MODAL.top})`);
  assert.ok(INPUT.top - 4 < 586, 'the list bottom sits above the input, well clear of Apply');
});

test('v86 REGRESSION: the pre-fix rule put the list through the Apply row; the new one does not', () => {
  // The shipped pre-v86 rule, transcribed exactly: measured against the raw 820px window, and
  // biased to open DOWNWARD whenever 160px happened to be available there.
  const preV86 = r => {
    const below = 820 - r.bottom - 8, above = r.top - 8;
    return (below >= 160 || below >= above)
      ? { below: true, maxHeight: Math.min(300, Math.max(140, below)) }
      : { below: false, maxHeight: Math.min(300, Math.max(140, above)) };
  };
  const old = preV86(INPUT);
  assert.strictEqual(old.below, true, 'the old rule opened downward');
  const oldTop = INPUT.bottom + 4, oldBottom = oldTop + old.maxHeight;
  assert.ok(oldBottom > 632, `and overran the card: list reached ${oldBottom}, card ends 632`);
  assert.ok(oldTop < 610 && oldBottom > 586, 'and covered the Apply tick box (586-610)');

  const now = dropPlace(INPUT, soft, hard);
  assert.strictEqual(now.below, false, 'v86 opens upward instead');
  assert.ok(INPUT.top - 4 < 586, 'clear of the Apply row entirely');
});

test('a field in the MIDDLE of the form still opens downward, inside the form', () => {
  const mid = { top: 200, bottom: 246 };
  const p = dropPlace(mid, soft, hard);
  assert.strictEqual(p.below, true, 'plenty of room below inside the panel');
  assert.ok(mid.bottom + 4 + p.maxHeight <= PANEL.bottom + 4, 'and it stays within the form');
});

test('the list is never taller than the room it was given (long lists scroll internally)', () => {
  const tight = { top: 300, bottom: 346 };
  const smallSoft = { top: 280, bottom: 520 };
  const p = dropPlace(tight, smallSoft, hard);
  assert.ok(p.maxHeight <= 300, 'never exceeds DROP_MAX');
  assert.ok(p.maxHeight <= Math.max(smallSoft.bottom - tight.bottom, tight.top - smallSoft.top) + 1,
    'never exceeds the room actually available on the chosen side');
});

test('when the form is too tight BOTH ways, it falls back to the modal bound', () => {
  // a form panel barely taller than the input itself: soft gives < DROP_MIN either side
  const cramped = { top: 400, bottom: 446 };
  const tinySoft = { top: 395, bottom: 455 };
  const p = dropPlace(cramped, tinySoft, hard);
  assert.ok(p.maxHeight >= 140, 'a usable list is still shown rather than a sliver');
});

test('even when the HARD bound is also tight, the list stays inside it (CodeRabbit, v86)', () => {
  // a very short window: neither side of the modal has DROP_MIN available. Flooring the height
  // at DROP_MIN here would have pushed the list straight back out of the modal.
  const inp = { top: 100, bottom: 146 };
  const tinyModal = { top: 60, bottom: 240 };
  const p = dropPlace(inp, tinyModal, tinyModal);
  const room = p.below ? tinyModal.bottom - inp.bottom - 8 : inp.top - tinyModal.top - 8;
  assert.ok(p.maxHeight <= room, `maxHeight ${p.maxHeight} must not exceed the ${room}px available`);
  const edge = p.below ? inp.bottom + 4 + p.maxHeight : inp.top - 4 - p.maxHeight;
  if (p.below) assert.ok(edge <= tinyModal.bottom, 'list bottom stays inside the modal');
  else assert.ok(edge >= tinyModal.top, 'list top stays inside the modal');
});

test('the hard bound is never exceeded — the list cannot escape the modal', () => {
  const low = { top: 700, bottom: 746 };           // input near the bottom of the modal
  const p = dropPlace(low, { top: 20, bottom: 760 }, hard);
  const span = p.below ? low.bottom + 4 + p.maxHeight : low.top - 4 - p.maxHeight;
  if (p.below) assert.ok(span <= MODAL.bottom + 1, `list bottom ${span} must stay inside the modal`);
  else assert.ok(span >= MODAL.top - 1, `list top ${span} must stay inside the modal`);
});
