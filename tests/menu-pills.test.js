/*
 * menu-pills.test.js — v134 (V4a): the Menu tab's switcher pills (spec §3.2).
 *
 * Pills render at ≤5 menus only — the mock's "N more ▾" overflow needs a floating layer,
 * queued behind V6, so with more menus the native select stays as the overflow-capable
 * control. The pill % is avgFoodCostForScope (the same figure the dashboard states for the
 * menu), coloured by the shared dashPctClass pair. An uncosted menu shows its name alone.
 * The click path (select mirroring, setCurrentMenuId, focus restore) is driven in
 * tests/visual/v134-menu-pills.spec.js — the harness below stubs querySelectorAll to [],
 * so nothing in THIS file executes the onclick.
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const APP = loadApp();
/* menus: [{id, name, pct|null}] */
function harness(menus, current, target = 30) {
  const factory = new Function('FIX', `
    "use strict";
    var cogsPct=FIX.target;
    var menusList=FIX.menus;
    var currentMenuId=FIX.current;
    var row={classes:{}, classList:{toggle:function(k,v){ row.classes[k]=v; }}};
    var box={hidden:false, innerHTML:'', closest:function(){ return row; }, querySelectorAll:function(){ return []; }};
    var document={ getElementById:function(id){ return id==='menuPills'?box:null; } };
    function avgFoodCostForScope(id){ var m=FIX.menus.find(function(x){return x.id===id;}); return m?m.pct:null; }
    ${extractFn(APP, 'esc')}   // the REAL escaper, not a stub — a hand-rolled one missed '>' and hid exactly the class of bug this test exists for
    ${extractFn(APP, 'dashPctClass')}
    ${extractFn(APP, 'buildMenuPills')}
    buildMenuPills();
    return { html:box.innerHTML, hidden:box.hidden, pillsOn:row.classes['pills-on'] };
  `);
  return factory({ menus, current, target });
}

test('≤5 menus: one pill per menu, active carries .act + aria-current, % is mono and coloured', () => {
  const r = harness([
    { id: 'M_A', name: 'Original', pct: 32.1 },
    { id: 'M_B', name: 'Winter', pct: 42.9 },
  ], 'M_A');
  assert.equal(r.hidden, false);
  assert.equal(r.pillsOn, true, 'the row hides its select at desktop');
  const pills = r.html.split('</button>').filter(s => s.includes('menu-pill'));
  assert.equal(pills.length, 2);
  assert.ok(/menu-pill act/.test(pills[0]) && /aria-current="true"/.test(pills[0]), 'Original is active');
  assert.ok(!/act/.test(pills[1].match(/class="[^"]*"/)[0]), 'Winter is not');
  assert.ok(/mp-pct bad">42\.9%/.test(pills[1]), 'over-target % coloured by the shared pair');
  assert.ok(/aria-label="Winter, 42\.9% food cost"/.test(pills[1]), 'the % is announced with its meaning');
});

test('an uncosted menu shows its name alone — no dash, no fabricated figure', () => {
  const r = harness([{ id: 'M_A', name: 'Original', pct: 32.1 }, { id: 'M_N', name: 'New', pct: null }], 'M_A');
  const pill = r.html.split('</button>').filter(s => s.includes('data-menu="M_N"'))[0];
  assert.ok(!/mp-pct/.test(pill) && !/—/.test(pill), 'name only');
  assert.ok(/aria-label="New"/.test(pill), 'label is just the name');
});

test('exactly 5 menus still fit; the 6th stands the pills down (the boundary itself is the pin)', () => {
  const five = Array.from({ length: 5 }, (_, i) => ({ id: 'M' + i, name: 'Menu ' + i, pct: 30 }));
  const r5 = harness(five, 'M0');
  assert.equal(r5.hidden, false, 'five menus: pills render');
  assert.equal((r5.html.match(/menu-pill/g) || []).length >= 5, true);
  const six = five.concat([{ id: 'M5', name: 'Menu 5', pct: 30 }]);
  const r6 = harness(six, 'M0');
  assert.equal(r6.hidden, true, 'six menus: pills stand down');
  assert.equal(r6.pillsOn, false, 'the select is NOT hidden');
  assert.equal(r6.html, '', 'nothing rendered');
});

test('an under-target menu wears the good pair — both dashPctClass branches, not just bad', () => {
  const r = harness([{ id: 'M_A', name: 'Original', pct: 22.0 }, { id: 'M_B', name: 'Winter', pct: 42.9 }], 'M_A');
  assert.ok(/mp-pct good">22\.0%/.test(r.html), 'under target is good');
  assert.ok(/mp-pct bad">42\.9%/.test(r.html), 'over target is bad');
});

test('zero menus: no pills, no crash — zero menus is a legitimate state', () => {
  const r = harness([], null);
  assert.equal(r.hidden, true);
  assert.equal(r.html, '');
});

test('menu names are escaped', () => {
  const r = harness([{ id: 'M_X', name: 'A<b>&"menu', pct: 30 }], 'M_X');
  assert.ok(!/(<b>)/.test(r.html), 'no raw HTML from a menu name');
  assert.ok(/A&lt;b&gt;&amp;&quot;menu/.test(r.html));
});
