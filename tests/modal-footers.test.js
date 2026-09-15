/*
 * modal-footers.test.js — 272 (consolidated item 47, the modal half).
 *
 * THE ITEM ASKED FOR "ONE MODAL FOOTER PATTERN" AND THERE ARE THREE SHAPES, WHICH IS THE FIRST
 * THING THIS FILE EXISTS TO SAY. Eighteen modals carry a `.mfoot`; collapsing them to one rule
 * would put #delChoiceModal's "Delete everything" on the LEFT of a confirm dialog, away from the
 * position a primary action occupies everywhere else in the app.
 *
 *   1. EDIT FORM      [Delete X] ................ [Cancel] [Save]
 *      The destructive action is an escape hatch, deliberately far from Save. Three modals.
 *   2. CONFIRM/CHOICE  ................. [Cancel] [other] [primary]
 *      The destructive action IS the primary, because destroying is what the user came to do.
 *   3. DISMISSAL       ............................... [Done]
 *      One button that only closes. Five modals, and they wore four different styles.
 *
 * What the item got right is that shape 1 was implemented THREE SEPARATE WAYS for three modals: an
 * empty `.mfoot-spacer` span under a modal-named `.ig-foot` class, `margin-right:auto` on one
 * button's own id, and an entire `.edit-delete-row` strip BELOW the footer holding a centred <a>.
 * Three mechanisms is why the pattern never spread: none of them could be worn, only copied.
 *
 * Every assertion here reads `index.html` and `css/style.css` as text, because the thing under test
 * is the MARKUP CONTRACT the one CSS rule depends on. The geometry that results is measured in a
 * browser instead, by `tests/visual/272-modal-footers.spec.js` — a computed-style read would prove
 * a declaration reached the element and not that anything moved (batch 232's clamp lesson).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
/* Roster 183(a): a grep of a source file searches PROSE as well as code, and this batch's own
   tombstone comments name every class it deleted. Strip comments before searching, always. */
const CSS_CODE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const HTML_CODE = HTML.replace(/<!--[\s\S]*?-->/g, '');

/** Every `.mfoot` in the markup, as {modalId, html}. */
function footers() {
  const out = [];
  const re = /<div class="modal-overlay"[^>]*id="([^"]+)"[\s\S]*?(?=<div class="modal-overlay"|$)/g;
  for (const m of HTML_CODE.matchAll(re)) {
    const f = m[0].match(/<div class="mfoot[^"]*">([\s\S]*?)<\/div>/);
    if (f) out.push({ modalId: m[1], html: f[1] });
  }
  return out;
}

/** The ids of the buttons in one footer, in source order. */
function order(html) {
  return [...html.matchAll(/<button[^>]*id="([^"]+)"/g)].map((m) => m[1]);
}
function classesOf(html, id) {
  const m = html.match(new RegExp('<button[^>]*id="' + id + '"[^>]*class="([^"]+)"|<button[^>]*class="([^"]+)"[^>]*id="' + id + '"'));
  return m ? (m[1] || m[2]).trim().split(/\s+/) : null;
}

const EDIT_FORMS = [
  { modal: 'ingModal', destructive: 'ingDelete', cancel: 'ingCancel', save: 'ingSave' },
  { modal: 'kingModal', destructive: 'kingModalRemove', cancel: 'kingModalCancel', save: 'kingModalSave' },
  { modal: 'editModal', destructive: 'ed_delete', cancel: 'editCancel', save: 'editSave' },
];
const DISMISSALS = ['manageMenusDone', 'smemDone', 'histFixDone', 'tidyManageDone', 'privacyDone'];

/* ------------------------------------------------------------------ shape 1: the edit form */

test('272: all three edit forms write the destructive action FIRST, then Cancel, then Save', () => {
  const found = footers();
  assert.ok(found.length >= 15, `only ${found.length} modal footers were parsed — the walker has stopped matching`);
  for (const f of EDIT_FORMS) {
    const foot = found.find((x) => x.modalId === f.modal);
    assert.ok(foot, `#${f.modal} has no .mfoot`);
    assert.deepStrictEqual(order(foot.html), [f.destructive, f.cancel, f.save],
      `#${f.modal}'s footer is not [destructive, Cancel, Save] in source order — and source order is ` +
      'what the one CSS rule keys on, so a reorder moves the button without touching any CSS');
  }
});

test('272: the destructive button in each wears the SAME two classes, so it cannot be told apart by look', () => {
  const found = footers();
  for (const f of EDIT_FORMS) {
    const foot = found.find((x) => x.modalId === f.modal);
    const cls = classesOf(foot.html, f.destructive);
    assert.ok(cls, `#${f.destructive} has no class attribute`);
    for (const want of ['btn', 'danger', 'ghost']) {
      assert.ok(cls.includes(want),
        `#${f.destructive} is missing "${want}" — before 272 these three buttons were ` +
        '`btn danger ghost`, `btn ghost king-remove` and an <a class="del-link">, which is three ' +
        'appearances for one meaning');
    }
  }
});

test('272: ONE rule places all three, keyed on the shape and not on a modal', () => {
  assert.match(CSS_CODE, /\.mfoot\s*>\s*\.btn\.danger:first-child\s*\{[^}]*margin-right\s*:\s*auto/,
    'the shared placement rule is gone; each modal will drift back to its own mechanism');
  for (const dead of ['ig-foot', 'mfoot-spacer', 'edit-delete-row', 'del-link']) {
    assert.ok(!new RegExp('\\.' + dead + '\\b').test(CSS_CODE),
      `.${dead} still has a rule — the three old mechanisms come out with the pattern, or the next ` +
      'reader finds four ways to place one button');
    assert.ok(!new RegExp('class="[^"]*\\b' + dead + '\\b').test(HTML_CODE), `.${dead} is still worn in the markup`);
  }
  assert.ok(!/#kingModalRemove\s*\{/.test(CSS_CODE),
    "#kingModalRemove's own id rule hand-rolled the margin and the exact colour .btn.danger gives");
});

test('272: the rule is NOT keyed on .btn.danger alone, which would drag a confirm dialog left', () => {
  /* The safety of the whole pattern is this one selector being narrower than it looks like it could
     be. `.mfoot .btn.danger{margin-right:auto}` reads as the same rule and would push a destructive
     PRIMARY to the left the day someone writes one — shape 2, where it belongs on the right. */
  const m = CSS_CODE.match(/\.mfoot[^{]*\.danger[^{]*\{[^}]*margin-right\s*:\s*auto[^}]*\}/g) || [];
  assert.strictEqual(m.length, 1, `expected exactly one danger-placement rule, found ${m.length}`);
  assert.match(m[0], /:first-child/,
    'the placement must be conditioned on the button being FIRST, which is what separates an edit ' +
    "form's escape hatch from a confirm dialog's primary");
});

test('272: #ed_delete is a real <button>, which is how it gets Enter and Space', () => {
  /* It was `<a class="del-link" role="button" tabindex="0">` with a CLICK handler and no keydown,
     so both keys did nothing on it and nothing in the repo had noticed. Found while moving it. */
  assert.match(HTML_CODE, /<button[^>]*id="ed_delete"[^>]*type="button"/,
    '#ed_delete must be a real button element');
  assert.ok(!/<a[^>]*id="ed_delete"/.test(HTML_CODE), 'it must not go back to being an anchor');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
  assert.ok(!/getElementById\('ed_deleteRow'\)/.test(app),
    'the row it used to live in is gone, so nothing may still be reaching for it');
});

test('272: the fifth-noun carve-out is respected — "Delete item" keeps its words', () => {
  /* CLAUDE.md records "Menu item" as a KNOWN surviving fifth object noun in this modal, awaiting
     its own brief and explicitly not a bug to fix on sight. A footer pass is exactly when someone
     would tidy it, so the words are pinned here rather than left to judgement. */
  assert.match(HTML_CODE, /<button[^>]*id="ed_delete"[^>]*>Delete item</,
    'renaming this is a terminology decision with its own brief, not part of a footer pass');
});

/* ------------------------------------------------------------------ shape 3: dismissal */

test('272: every button that only CLOSES its modal wears the same one class', () => {
  /* Five of them, in four styles before this: `btn`, `btn primary`, `btn ghost`, `btn primary`.
     The item named two. Plain, because a button that performs no action is not a primary. */
  for (const id of DISMISSALS) {
    const cls = classesOf(HTML_CODE, id);
    assert.ok(cls, `#${id} not found`);
    assert.deepStrictEqual(cls, ['btn'],
      `#${id} wears ${JSON.stringify(cls)} — a dismissal button offers nothing to emphasise, and ` +
      'two of these were orange while the one beside them was not');
  }
});

test('272: the privacy modal keeps "Close" rather than "Done", and that is the reason', () => {
  /* The other four end a piece of WORK — manage menus, supplier memory, history points, tidy lists.
     The privacy notice is read, not worked in, so there is nothing to be done with. Same style,
     honest word. Pinned so the next consistency pass does not flatten it without deciding to. */
  assert.match(HTML_CODE, /<button[^>]*id="privacyDone"[^>]*>Close</);
  for (const id of ['manageMenusDone', 'smemDone', 'histFixDone', 'tidyManageDone']) {
    assert.match(HTML_CODE, new RegExp('<button[^>]*id="' + id + '"[^>]*>Done<'), `#${id} says Done`);
  }
});

/* ------------------------------------------------------------------ shape 2: the carve-out */

test('272: a confirm dialog keeps its destructive action on the RIGHT, as its primary', () => {
  /* This is an assertion that nothing changed, and it earns its place: it is the one thing a later
     "finish the footer pattern" batch would get wrong, and the markup gives it no reason not to. */
  const foot = footers().find((x) => x.modalId === 'delChoiceModal');
  assert.ok(foot, '#delChoiceModal has no .mfoot');
  assert.deepStrictEqual(order(foot.html), ['delChoiceCancel', 'delChoiceMenuOnly', 'delChoiceAll'],
    'Cancel, then the milder action, then the destructive one as the primary');
  assert.ok(classesOf(foot.html, 'delChoiceAll').includes('primary'),
    '"Delete everything" is what the user opened this dialog to do, so it is the primary and it ' +
    'stays on the right — it must NOT be given `danger` and dragged left by the edit-form rule');
  assert.ok(!classesOf(foot.html, 'delChoiceAll').includes('danger'),
    'giving it `danger` would put it first-child-adjacent in intent while leaving it last in source, ' +
    'which is the confusing half-state this test exists to forbid');
});
