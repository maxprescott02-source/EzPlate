/*
 * tests/verbs.test.js (261, queue item 46) — ONE VERB PER INTENT.
 *
 * Every modal footer and header action was labelled by the batch that built it, so the app had five
 * save verbs, three delete verbs, two import verbs and one button labelled with a noun. The table
 * below is the decision; this file is what stops it drifting back one batch at a time, which is
 * exactly how it got here.
 *
 * THE TABLE, and the reasoning is the part worth keeping because the labels will be argued about:
 *
 *   OPENER    "New <object>"      — opens a form. Already consistent before this pass; pinned so it
 *                                   stays that way, since the committers below now start with "Add"
 *                                   and the two are one pair.
 *   COMMIT    "Add <object>"      — creates the object the opener promised.
 *   COMMIT    "Add to menu"       — puts an EXISTING object on a list.
 *   COMMIT    "Save"              — commits an edit to something that already exists.
 *   DESTROY   "Delete <object>"   — the object stops existing.
 *   DESTROY   "Remove from <list>"— the object leaves a list and SURVIVES outside it.
 *   IMPORT    "Import"            — one word. "Upload" is gone.
 *
 * ⚠️ THE DESTRUCTIVE SPLIT IS ABOUT WHAT SURVIVES, NOT ABOUT HOW BAD IT FEELS, and two sites were
 * on the wrong side of it. `#kingModalRemove` said "Remove" while destroying an ingredient
 * outright, and `#delChoiceMenuOnly` said "Delete from menu only" while KEEPING the plate — its own
 * toast says "plate kept". A word that overstates is not the safe direction: it teaches the reader
 * that "Delete" here might not mean delete, which is what makes the real one unreadable.
 *
 * ⚠️ THREE SITES IN THIS FILE ARE NOT IN THE QUEUE ITEM'S LIST. They were found by counting the
 * verbs across all 103 labelled buttons rather than by reading the item's enumeration:
 *   - `#kingModalSave` is DUAL-PURPOSE (`saveKingModal` branches on `kingEditId`) and carried one
 *     static "Save", so the create path wore the edit vocabulary;
 *   - `#delChoiceMenuOnly`, above;
 *   - the import verbs are SIX sites, not the three the item names.
 * That is `CLAUDE.md`'s "an item that names a behaviour without naming its sites is an item whose
 * list is already wrong", which it warns about in its own header and which held again here.
 *
 * ⚠️ WHAT IS DELIBERATELY NOT CHANGED, so a later pass does not "finish the job" wrongly:
 *   - `#ed_delete` still says "Delete item". "Menu item" is the known surviving FIFTH noun, which
 *     `CLAUDE.md` says is awaiting its own brief and is NOT to be fixed on sight. Renaming it needs
 *     that vocabulary decided, and the alternatives are a forbidden noun ("dish") or a wrong one
 *     ("plate" — it deletes the menu row, not the plate).
 *   - `#delChoiceAll` still says "Delete everything". It means two different things by design: with
 *     a plate it deletes the plate, without one it only removes the menu row. Its own code says so.
 *     "Delete plate" would be a lie in the second case.
 *   - `#bgUpBtn` / `#bgCafeBtn` keep "Create account" / "Create my café". Those are onboarding, not
 *     app objects, and "Add account" is worse English for the one flow a stranger meets first.
 *   - The builder keeps "Save plate" on BOTH its controls, which is the item's own carve-out and is
 *     conditional on the two agreeing. The test below is what holds them together.
 *
 * ⚠️ THE ITEM PROPOSED "Add plate to menu" AND THE SHIPPED LABEL IS "Add plate". Not a trim for its
 * own sake: `fresh-states.spec.js` records that the mock's "Add existing plate" WRAPPED the 380px
 * Menu header onto two lines, and that this button's rule is that its words stay put at both widths
 * rather than collapsing. "to menu" is also the redundant half — `css/style.css` states the app's
 * own reasoning for the `.btn-noun` idiom in as many words: *the tab already names the thing*. So
 * the verb the item asked for is there and the noun the screen already supplies is not.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
/* HTML comments are stripped for the same reason `terminology.test.js` strips JS ones: a grep over
   source searches PROSE as well as CODE (CLAUDE.md roster 183a), and this file's own subject —
   button wording — appears in the comments explaining the buttons. */
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');

/** The visible label of the element with this id, with inner markup flattened. */
function labelOf(id) {
  const m = html.match(new RegExp(`id="${id}"[^>]*>([\\s\\S]*?)</(?:button|h3|a)>`));
  assert.ok(m, `#${id} not found in index.html — if it was renamed, this table is stale`);
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/* ⚠️ EQUALITY, NOT ABSENCE, AT EVERY SITE. `CLAUDE.md` roster 190: "not the wrong value" is a guess
   about every wrong value there could be; "is the right value" is a fact about this app. An earlier
   draft of this file asserted that "Save changes" appears nowhere, which would have stayed green if
   a site had been relabelled to a THIRD wrong word. */
const TABLE = {
  // openers — these open a form
  newPlateBtn: 'New plate',
  menuNewBtn: 'New menu',
  kingNew: 'New ingredient',
  newBtn: 'New product',
  // committers — these create the object the opener promised
  mSave: 'Add product',
  newMenuSave: 'Add menu',
  // committers — an existing object joins a list
  menuSave: 'Add to menu',
  addDishSave: 'Add to menu',
  // committers — an edit to something that exists
  editSave: 'Save',
  ingSave: 'Save',
  // the builder's pair, kept by the item's own carve-out and only while they agree
  saveBtn: 'Save plate',
  bldSaveBar: 'Save plate',
  // destructive — the object stops existing, and it is named
  bldDelete: 'Delete plate',
  menuDelBtn: 'Delete menu',
  ingDelete: 'Delete product',
  kingModalRemove: 'Delete ingredient',
  // destructive — the object leaves a list and survives
  delChoiceMenuOnly: 'Remove from menu',
  // one import word
  importBtn: 'Import invoice',
  invUploadBtn: 'Import invoice',
  invModalTitle: 'Import invoice',
  catImportBtn: 'Import',
  catGo: 'Import',
  // the noun that became a verb
  menuAddDishBtn: 'Add plate',
};

test('every control in the verb table says exactly what the table says', () => {
  for (const [id, want] of Object.entries(TABLE)) {
    assert.equal(labelOf(id), want, `#${id}`);
  }
  /* Roster 205: a loop that asserts nothing is silently satisfied when it has nothing to iterate. */
  assert.equal(Object.keys(TABLE).length, 23, 'the table still covers 23 controls');
});

test('the builder\'s two save controls agree, which is the condition for keeping "Save plate"', () => {
  /* The item allows the builder to keep the object in its label ONLY while both controls match. If
     a later batch changes one, this fails and the carve-out is re-decided rather than half-applied. */
  assert.equal(labelOf('saveBtn'), labelOf('bldSaveBar'));
});

test('"Upload" is gone as an import verb', () => {
  /* The one absence assertion in the file, and it earns its place: the table above cannot see a
     SEVENTH import control added later by a batch that never read this file. Kept alongside the
     equalities, not instead of them. */
  assert.ok(!/Upload invoice/.test(html), 'the app has one import word and it is "Import"');
});

test('kingModalSave is dual-purpose, so it is labelled from the SAME flag as the Remove button', () => {
  /* `saveKingModal` branches on `kingEditId`; the markup carried one static word, so creating an
     ingredient used the edit vocabulary. The label is now set from `isEdit`, which already decides
     whether Remove is shown — one source, so the two cannot disagree about which mode the modal is
     in. Driven in a browser: create shows "Add ingredient" with Remove hidden, edit shows "Save"
     with Remove visible. */
  const fn = app.match(/var remEl=document\.getElementById\('kingModalRemove'\);[\s\S]{0,900}?show\('kingModal'\)/);
  assert.ok(fn, 'the king modal open path moved — re-point this assertion');
  const body = fn[0];
  assert.match(body, /getElementById\('kingModalSave'\)/, 'the commit button is labelled here');
  assert.match(body, /isEdit\?'Save':'Add ingredient'/, 'and from isEdit, the same flag Remove uses');
  assert.match(body, /remEl\.style\.display=isEdit\?''/, 'which is still what shows Remove');
});

test('the supplier-memory row DELETES, and its toast agrees with its button', () => {
  /* A taught pack does not survive being removed, so it is a Delete. The toast said "Removed" while
     the button said "Remove"; both now say delete. A button and its own confirmation disagreeing is
     the same defect as two buttons disagreeing, one step later in the flow. */
  assert.match(app, /class="smem-del">Delete<\/button>/, 'the button');
  assert.match(app, /renderSmemList\(\); toast\('Deleted'\);/, 'and the toast it produces');
});

test('the fifth-noun sites are left alone, deliberately', () => {
  /* These are NOT oversights — see the header. If a later batch decides the "menu item" vocabulary,
     this test is where to come and re-decide them together. */
  assert.equal(labelOf('ed_delete'), 'Delete item', 'the surviving fifth noun, awaiting its own brief');
  assert.equal(labelOf('delChoiceAll'), 'Delete everything', 'means two things by design');
});
