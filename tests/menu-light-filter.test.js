/*
 * menu-light-filter.test.js — v68: the Menu tab's margin-light chip filter.
 * lightFilterPass(active, light) is brace-extracted from the REAL shipped js/app.js.
 * The chips are multi-select: [] shows everything; ['red'] shows red only; ['amber','red']
 * shows the "everything needing attention" set. Filter logic is verified independent of render.
 */
const test = require('node:test');
const assert = require('node:assert');
const { lightFilterPass } = require('./_extract.js');

test('no active chips ⇒ every light passes (unfiltered)', () => {
  for (const lt of ['green', 'amber', 'red', 'none']) {
    assert.ok(lightFilterPass([], lt), `empty filter should pass ${lt}`);
  }
  assert.ok(lightFilterPass(undefined, 'red'), 'undefined active is treated as no filter');
  assert.ok(lightFilterPass(null, 'green'), 'null active is treated as no filter');
});

test('red-only: only red passes; amber/green/uncosted are hidden', () => {
  const active = ['red'];
  assert.ok(lightFilterPass(active, 'red'));
  assert.ok(!lightFilterPass(active, 'amber'));
  assert.ok(!lightFilterPass(active, 'green'));
  assert.ok(!lightFilterPass(active, 'none'), 'not-costed rows drop out under a light filter');
});

test('amber+red: the "everything needing attention" set — amber and red pass, green does not', () => {
  const active = ['amber', 'red'];
  assert.ok(lightFilterPass(active, 'red'));
  assert.ok(lightFilterPass(active, 'amber'));
  assert.ok(!lightFilterPass(active, 'green'));
  assert.ok(!lightFilterPass(active, 'none'));
});

test('order of the active chips does not matter', () => {
  assert.deepStrictEqual(
    ['green', 'amber', 'red', 'none'].map((lt) => lightFilterPass(['red', 'amber'], lt)),
    ['green', 'amber', 'red', 'none'].map((lt) => lightFilterPass(['amber', 'red'], lt))
  );
});

test('applied as a row filter, red-only keeps exactly the red rows', () => {
  const rows = [
    { name: 'Burger', light: 'red' },
    { name: 'Salad', light: 'green' },
    { name: 'Soup', light: 'amber' },
    { name: 'Special', light: 'none' },
  ];
  const redOnly = rows.filter((r) => lightFilterPass(['red'], r.light)).map((r) => r.name);
  assert.deepStrictEqual(redOnly, ['Burger']);

  const attention = rows.filter((r) => lightFilterPass(['amber', 'red'], r.light)).map((r) => r.name);
  assert.deepStrictEqual(attention, ['Burger', 'Soup']);

  const cleared = rows.filter((r) => lightFilterPass([], r.light)).map((r) => r.name);
  assert.deepStrictEqual(cleared, ['Burger', 'Salad', 'Soup', 'Special'], 'cleared shows all rows');
});
