/*
 * a11y-fooditem.test.js — v82 D3.
 *
 * The report said the "Food item" checkbox had an accessible name of "on" (label not tied to the
 * input). DIAGNOSED before patching: in the shipped markup the input is WRAPPED in its <label>, so
 * the accessible name already resolves to the visible text (jsdom: input.labels.length === 1,
 * label.control === input, name === "Food item (appears in ingredient search)"). The reported bug
 * does NOT reproduce — no code change was warranted. This test LOCKS the association so it can't
 * silently regress into the reported state.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('D3: the Food item checkbox is wrapped in a <label> carrying its visible text (implicit association)', () => {
  const m = HTML.match(/<label[^>]*>\s*<input id="f_food"[^>]*>\s*([^<]*?)\s*<\/label>/);
  assert.ok(m, 'the f_food checkbox must sit inside a <label> (so its accessible name is the label text, not "on")');
  assert.match(m[1], /Food item \(appears in ingredient search\)/, 'label text is the visible copy');
});
