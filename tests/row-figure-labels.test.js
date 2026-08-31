/*
 * row-figure-labels.test.js — batch 225. The converted screens' figures say WHICH column they are.
 *
 * The defect. Menu, Products, Ingredients and Plates each render a list as one `<button>` (or
 * `role="button"`) per row, and each puts its column headings in a band above the rows that is
 * `aria-hidden="true"`. A button's accessible name is its contents concatenated in DOM order, so a
 * Menu row announced "Roast $3.00 $10.00 $7.00 food cost 42.9% — well over your target": four
 * figures that mean four different things, three of them unlabelled. The band cannot supply the
 * labels — it is one floating row of five words, announced before every row, naming nothing.
 *
 * The fix is `srLabel`: the column's NAME, in an `.sr-only` span, inside the cell, beside the cell's
 * own figure. Never a copy of the figure — that is the stub-drift class CLAUDE.md's roster is about,
 * and a per-row `aria-label` built from the same numbers is exactly that shape.
 *
 * ⚠ THE INGREDIENTS ROW WAS WORSE THAN THE OTHER THREE AND THE QUEUE ITEM DID NOT KNOW.
 * It carried `aria-label="Edit <name>"`, and an aria-label REPLACES the contents in the accessible
 * name — so its figures were not unlabelled, they were not announced at all. Per-cell labels there
 * are dead text until the row label goes, which is why this file asserts its ABSENCE by name.
 *
 * ⚠ WHAT ROTS HERE, AND IT IS THE LAST TEST BELOW. Three of the seven cells already PRINT their
 * column's name on the phone (the meta line: "$2.31 cost, suggested $5.78", ", in 9 plates"), as
 * generated content that is cancelled at >=768. Those three must hide the spoken copy below 768 or
 * it is said twice — so app.js's set of labelled cells and style.css's set of suppressed cells are
 * ONE decision kept in two files. The last test derives both from source and compares them, so
 * adding a label to a phone-labelled cell fails by name instead of doubling silently.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/* comments are stripped before every source grep in this file: a grep over a source file searches
   PROSE as well as CODE, and this batch's prose names every class it touches. (Roster entry 183a,
   and the reason king-rows.test.js already does this.) */
function code(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

test('aRow labels each of its three figures — run, not grepped', () => {
  /* The real aRow, the real srLabel, the real esc and fmt2. costRangeCell and vbadge are sentinels:
     nothing here asserts what they RETURN, only that the row still emits them into the right cell,
     so a sentinel proves placement and cannot agree with a wrong belief about their contents. */
  const row = new Function(`"use strict";
    ${extractFn(SRC, 'esc')}
    ${extractFn(SRC, 'srLabel')}
    ${extractFn(SRC, 'fmt2')}
    function costRangeCell(){ return '<!--RANGE-->'; }
    function vbadge(){ return '<!--VBADGE-->'; }
    ${extractFn(SRC, 'aRow')}
    return aRow;`)();

  const html = row('Roast', { cost: 3, suggested: 7.5, menuPrice: 10, light: 'red' }, null);
  /* the cell, its label and its figure, in that order and inside the same span — a label that has
     drifted out of its cell announces against the wrong number, which is worse than none. */
  const cell = (cls) => {
    /* split on the row's own cell boundary rather than on `</span>`: the first `</span>` inside a
       labelled cell now closes the LABEL, so a naive slice cuts the figure off and the assertion
       below would be measuring an empty string. */
    const part = html.split('<span class="mnu-').find((c) => c.startsWith(cls.slice(4)));
    assert.ok(part, `the ${cls} cell is emitted`);
    return part;
  };
  assert.match(cell('mnu-cost'), /<span class="sr-only">cost <\/span>\$3\.00/, 'cost is labelled, then stated');
  assert.match(cell('mnu-sug'), /<span class="sr-only">suggested <\/span>\$7\.50/, 'suggested is labelled, then stated');
  assert.match(cell('mnu-price'), /<span class="sr-only">price <\/span>\$10\.00/, 'price is labelled, then stated');

  /* the label is a NAME, never a second copy of the number: exactly one "3.00" on the row, and it is
     the cell's own text. This is the assertion that fails if anyone "improves" srLabel into a
     figure-carrying aria-label. */
  assert.equal((html.match(/3\.00/g) || []).length, 1, 'the cost appears once — the label does not restate it');

  /* the placeholder branch keeps its label: "cost —" tells you which column is empty; a bare dash
     among four dashes does not. */
  const nil = row('Roast', { cost: 0, suggested: 0, menuPrice: null }, null);
  assert.match(nil.slice(nil.indexOf('class="mnu-cost')), /sr-only">cost <\/span>—/, 'an empty cost cell is still named');
});

test('the Ingredients row names itself from its CONTENTS — no aria-label to override them', () => {
  const fn = code(extractFn(SRC, 'renderKitchenPanel'));
  const open = fn.match(/'<div class="king-row'[^\n]*\n?[^\n]*/);
  assert.ok(open, 'the row element is emitted');
  assert.ok(!/aria-label/.test(open[0]),
    'no aria-label on the row: it REPLACES the contents in the accessible name, so every figure the '
    + 'cells carry would be silent again. Growing the label instead is the drift trap — see the header.');
  assert.match(open[0], /role="button"/, 'still a button — name-from-content is legal for that role');
  /* and the loud state survives the removal, because it is the link cell's own visible text */
  assert.match(fn, /king-link king-missing[^]*?product missing/, 'the broken-link warning is content, not label');
});

test('every converted screen labels its figure cells, and the bands stay aria-hidden', () => {
  const app = code(SRC);
  const want = {
    'mnu-cost': 'cost', 'mnu-sug': 'suggested', 'mnu-price': 'price',
    'ing-price': 'unit cost', 'king-price': 'unit cost', 'king-used-n': 'used in',
    'plib-cost': 'plate cost',
  };
  Object.keys(want).forEach((cls) => {
    const re = new RegExp('class="' + cls + '[^]{0,120}?srLabel\\(\'' + want[cls] + '\'\\)');
    assert.match(app, re, `the ${cls} cell carries the spoken column name "${want[cls]}"`);
  });
  /* the bands stay hidden ON PURPOSE — announcing a floating header row before every row labels
     nothing, and is what the per-cell labels replace rather than complement. */
  ['ing-band', 'king-band', 'plib-band'].forEach((b) => {
    assert.match(app, new RegExp('class="' + b + '" aria-hidden="true"'), `the ${b} stays aria-hidden`);
  });
  assert.match(HTML, /class="mnu-band" id="menuBand" aria-hidden="true"/, 'the Menu band stays aria-hidden');
});

test('a cell whose own text already names its subject takes NO label', () => {
  const app = code(SRC);
  /* "no cost" and "not costed" are sentences, not figures. "unit cost no cost" is worse than the
     phrase alone, and this pins the judgement so it is not undone for consistency's sake. */
  assert.match(app, /king-price notcosted">no cost/, 'the broken-link price states itself');
  assert.ok(!/king-price notcosted">'\+srLabel/.test(app), 'and takes no spoken label');
  assert.match(app, /plib-cost'\+\(costed\?'':' is-nil'\)\+'">'\+\(costed\?srLabel\('plate cost'\):''\)/,
    'the plate cost is labelled only on the branch that renders a bare figure');
});

test('THE COUPLING: exactly the cells the PHONE already labels suppress the spoken copy', () => {
  /* Derive both sets from source rather than restating either. app.js decides which cells speak;
     style.css decides which of those stand down below 768. They are one decision in two files, and
     nothing else would notice them disagreeing — the symptom is a phone announcing "cost $2.31
     cost,", which no unit test and no screenshot can see. */
  const app = code(SRC);
  const labelled = new Set();
  for (const m of app.matchAll(/srLabel\(/g)) {
    const before = app.slice(0, m.index);
    const cls = before.slice(before.lastIndexOf('class="') + 7).match(/^[a-z0-9-]+/);
    assert.ok(cls, 'every srLabel sits inside a cell with a class');
    labelled.add(cls[0]);
  }
  assert.ok(labelled.size >= 7, `found ${labelled.size} labelled cells — the four screens carry seven`);

  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, ' ');
  /* a QUOTED `content` on a pseudo-element is a visible string the phone prints; `content:none` is
     the desktop cancel. So "this class prints its own label" is exactly the first form. */
  const printsOwnLabel = new Set();
  for (const m of css.matchAll(/\.([a-z0-9-]+)::(?:before|after)\{content:"/g)) printsOwnLabel.add(m[1]);

  const rule = css.match(/^([^\n{]*?)\{display:none\}\n@media \(min-width:768px\)\{\n\s*([^\n{]*?)\{display:inline\}/m);
  assert.ok(rule, 'the suppression pair is written base-then-media, adjacent, in that order');
  assert.equal(rule[1].trim(), rule[2].trim(),
    'and at the SAME specificity — a @media block does not win by being later, it wins on source '
    + 'order only when the weights tie (CLAUDE.md; F3 got this wrong five times in one screen)');
  const suppressed = new Set(rule[1].split(',').map((s) => s.trim().replace(/^\.([a-z0-9-]+) .*$/, '$1')));

  const expected = [...labelled].filter((c) => printsOwnLabel.has(c)).sort();
  assert.deepEqual([...suppressed].sort(), expected,
    'the suppressed set must be exactly the labelled cells the phone already prints a label for');
  assert.ok(expected.length > 0, 'and it is not vacuously empty — three cells are in this state');
});
