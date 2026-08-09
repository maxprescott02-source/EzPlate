/*
 * menu-pills.test.js — v134 (V4a): the Menu tab's switcher pills (spec §3.2).
 *
 * Pills render at ≤5 menus only — the mock's "N more ▾" overflow needs a floating layer,
 * queued behind V6, so with more menus the native select stays as the overflow-capable
 * control. The pill % is avgFoodCostForScope (the same figure the dashboard states for the
 * menu), coloured by the shared dashPctClass pair. An uncosted menu shows its name alone.
 * The click path (select mirroring, setCurrentMenuId) is driven in Playwright, not here.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const APP = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
function extractFn(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('function not found -> ' + name + '. app.js changed; update tests/menu-pills.test.js');
  const start = src.indexOf('{', i);
  let d = 0;
  for (let n = start; n < src.length; n++) {
    if (src[n] === '{') d++;
    else if (src[n] === '}' && --d === 0) return src.slice(i, n + 1);
  }
  throw new Error('unbalanced braces for ' + name);
}

/* menus: [{id, name, pct|null}] */
function harness(menus, current, target = 30) {
  const factory = new Function('FIX', `
    "use strict";
    var DASH_ALL='all';
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

test('more than 5 menus: pills stand down and the select stays the control', () => {
  const six = Array.from({ length: 6 }, (_, i) => ({ id: 'M' + i, name: 'Menu ' + i, pct: 30 }));
  const r = harness(six, 'M0');
  assert.equal(r.hidden, true);
  assert.equal(r.pillsOn, false, 'the select is NOT hidden');
  assert.equal(r.html, '', 'nothing rendered');
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
