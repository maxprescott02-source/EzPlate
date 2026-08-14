/*
 * roles-client.test.js — 188. The CLIENT half of owner vs staff.
 *
 * 187 taught the database the two roles and enforces four refusals with restrictive policies and a
 * guard inside `restore_backup`; `tests/roles.test.js` pins that SQL. This file pins the client
 * side of the same four: that the app resolves its role honestly, and that the four controls the
 * server refuses are the four it stops offering.
 *
 * WHAT THESE RUN. The real shipped functions, brace-extracted from js/app.js — roleState, isOwner,
 * ownerOnly, applyRoleUi, syncBuilderPlateActions, updateMenuDelBtn, openDelChoice — against a
 * small DOM stub. Nothing here re-implements a shipped decision, which is CLAUDE.md's eighteen-
 * incident rule: a stub written from the same belief as the code passes against the defect.
 *
 * THE ONE THAT MATTERS MOST is the default. "Could not tell" must read as OWNER, and it is the
 * OPPOSITE default from the tenant gate one screen away:
 *
 *   ⚠️ The server refuses a non-owner either way, so the client's guess costs nothing in safety and
 *   everything in usability. Guess "staff" and the person who OWNS the café loses four controls
 *   with nothing on screen to explain it, and no way to get them back. Guess "owner" and a staff
 *   account is shown a button that fails honestly with the server's own words. A single-tenant
 *   database with one owner cannot tell the two apart — every test here would pass either way on
 *   production data — which is exactly why it is pinned in text rather than left to a measurement
 *   nobody can take yet.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');

/* ⚠️ CLAUDE.md 183(a), and it fired twice while this file was being written: an assertion that
   greps a source file is searching PROSE as well as code, and the prose is written by the same
   person in the same hour saying the same words. The comment above the Team card explains that it
   used to say "planned" — so the test forbidding that word matched its own explanation. Both of
   these strip comments before searching, and both were confirmed to go red without the strip. */
const jsCode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
  .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
const htmlCode = (s) => s.replace(/<!--[\s\S]*?-->/g, '');

/* ---------------------------------------------------------------------------------------------
   The sandbox. One `businessRole` variable, the real functions, and a DOM stub that reports which
   elements ended up hidden. `plateForMenuItem` and `menuById` are COLLABORATORS observed here, not
   decisions re-implemented — what is under test is whether openDelChoice consults them at all.
   --------------------------------------------------------------------------------------------- */
function mkNode(id) {
  return { id, hidden: false, readOnly: false, textContent: '', style: {}, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {} };
}

function harness(opts) {
  opts = opts || {};
  const ids = ['bldDuplicate', 'bldDelete', 'menuDelBtn', 'setRestoreRow', 'setCogsInput',
    'setCogsHelp', 'teamRole', 'delChoiceAll', 'delChoiceMsg'];
  const D = {};
  ids.forEach((id) => { D[id] = mkNode(id); });
  (opts.omit || []).forEach((id) => { delete D[id]; });
  const calls = { toasts: [], shown: [] };
  // eslint-disable-next-line no-new-func
  const api = new Function('D', 'C', 'OPT', `
    "use strict";
    var document = { getElementById: function(id){ return D[id] || null; } };
    function toast(m){ C.toasts.push(m); }
    function show(id){ C.shown.push(id); }
    var loadedPlateId = OPT.loadedPlateId || null;
    var currentMenuId = OPT.currentMenuId || 'M1';
    var menusList = OPT.menusList || [{id:'M1', name:'Main'}];
    var menuById = OPT.menuById || {};
    var delChoiceId = null;
    function canDeleteMenu(id){ return menusList.some(function(m){return m.id===id;}); }
    function plateForMenuItem(mi){ return (mi && mi.plate) || null; }
    ${extractFn(SRC, 'roleState')}
    ${extractFn(SRC, 'isOwner')}
    ${extractFn(SRC, 'ownerOnly')}
    ${extractFn(SRC, 'applyRoleUi')}
    ${extractFn(SRC, 'syncBuilderPlateActions')}
    ${extractFn(SRC, 'updateMenuDelBtn')}
    ${extractFn(SRC, 'openDelChoice')}
    var businessRole = OPT.role || 'owner';
    return {
      roleState: roleState,
      isOwner: isOwner,
      ownerOnly: ownerOnly,
      applyRoleUi: applyRoleUi,
      openDelChoice: openDelChoice,
      setRole: function(r){ businessRole = r; },
      role: function(){ return businessRole; }
    };
  `)(D, calls, opts);
  return { api, D, calls };
}

/* ---------------------------------------------------------------------------------------------
   1. THE THREE ANSWERS
   --------------------------------------------------------------------------------------------- */

test('roleState has three answers, and NULL is not one of them', () => {
  const { api } = harness();
  assert.equal(api.roleState({ data: 'owner' }), 'owner');
  assert.equal(api.roleState({ data: 'staff' }), 'staff');
  /* A caller with no membership answers NULL. That is the non-member case the tenant gate has
     already returned on — it is not a role, and inventing one from it would make an account with
     no café into an owner or a staff member of nothing. */
  assert.equal(api.roleState({ data: null }), 'unknown', 'NULL is not a role');
  assert.equal(api.roleState({ error: { message: 'boom' } }), 'unknown', 'an error is not an answer');
  assert.equal(api.roleState(null), 'unknown', 'no result at all is not an answer');
  assert.equal(api.roleState({}), 'unknown', 'an undefined data field is not an answer');
  /* A role the client has never heard of — say a manager role added server-side later — is not
     silently treated as staff. It falls to 'unknown', which reads as owner, so the server stays
     the thing that decides and nobody is locked out of their own café by a client that is behind. */
  assert.equal(api.roleState({ data: 'manager' }), 'unknown', 'an unrecognised role is not staff');
});

test('the DEFAULT is owner, and isOwner is written as "not definitely staff"', () => {
  const { api } = harness();
  assert.equal(api.role(), 'owner', 'the standing role before any answer arrives');
  assert.equal(api.isOwner(), true);
  api.setRole('staff');
  assert.equal(api.isOwner(), false, 'a definite staff answer is the ONLY thing that hides controls');
  /* ⚠️ THE ASSERTION THAT WOULD CATCH THE INVERSION. If isOwner were written `=== 'owner'`, an
     unexpected value would hide four controls from the café owner. It is written as "not staff",
     so anything unrecognised lands on the permissive side by construction. */
  api.setRole('manager');
  assert.equal(api.isOwner(), true, 'anything that is not definitely staff is treated as owner');
  api.setRole(null);
  assert.equal(api.isOwner(), true, 'and so is nothing at all');
});

test('only a DEFINITE answer moves the standing role — the resolve line in bootstrapSync', () => {
  /* The three-value shape earns its keep on the SECOND reading, exactly as _bootNoMember does: a
     re-sync whose role lookup alone fails must leave a known staff account staff rather than
     promoting it to owner. That is one line in bootstrapSync and this is what pins it. */
  const line = SRC.slice(SRC.indexOf('var _rs=roleState(_role)'));
  const resolve = line.slice(0, line.indexOf('applyRoleUi()'));
  assert.match(resolve, /if\s*\(\s*_rs\s*!==\s*'unknown'\s*\)\s*businessRole\s*=\s*_rs\s*;/,
    "'unknown' must change nothing in either direction");
  /* And it happens AFTER the tenant gate's early return, never before: a non-member's role is
     NULL, and there is no screen to apply a role to while the gate covers the app. */
  assert.ok(SRC.indexOf("bootReady('signin', SIGNIN_MSG)") < SRC.indexOf('var _rs=roleState(_role)'),
    'the role resolves after the tenant gate has had its chance to return');
});

test('the role rides the Promise.all that was already in flight — no extra round trip', () => {
  const boot = SRC.slice(SRC.indexOf('async function bootstrapSync'));
  const batch = boot.slice(boot.indexOf('var results=await Promise.all(['), boot.indexOf(']);'));
  assert.match(batch, /softCall\(function\(\)\{ return SUPA\.rpc\('current_business_role'\); \}\)/,
    'current_business_role is one more entry in the existing batch');
  /* softCall, not soft: SUPA.rpc on the Playwright shim's fake client throws while the ARRAY is
     still being built — before Promise.all, inside the try — which would report "couldn't load
     your data" on a working database. Same reason 185 wrapped the tenant lookup. */
  assert.ok(batch.indexOf("soft(SUPA.rpc('current_business_role'))") < 0,
    'it must be softCall, not soft — see the note at softCall');
  /* And the destructure has to keep up with the array, or the role is read off the session slot. */
  assert.match(boot, /var _biz=results\[10\], _ses=results\[11\], _role=results\[12\];/);
  /* "No extra round trip" as a contract rather than as a head-count: the role is asked for ONCE,
     and that once is inside the batch. A later refactor that adds `await SUPA.rpc(…)` of its own
     before or after the Promise.all costs a full round trip on the boot critical path, on a phone,
     which is exactly what v108 spent a batch removing. A raw count of reads would have to be
     hand-edited every time a table is added and would say nothing about where they run. */
  const inBoot = (jsCode(boot).slice(0, jsCode(boot).indexOf('rerenderCurrentTab'))
    .match(/current_business_role/g) || []).length;
  assert.equal(inBoot, 1, 'asked once');
  assert.equal((jsCode(batch).match(/current_business_role/g) || []).length, 1, 'and that once is in the batch');
});

/* ---------------------------------------------------------------------------------------------
   2. THE FOUR CONTROLS — one per thing the server refuses
   --------------------------------------------------------------------------------------------- */

test('delete plate: the builder button is not offered to staff', () => {
  const owner = harness({ loadedPlateId: 'P1' });
  owner.api.applyRoleUi();
  assert.equal(owner.D.bldDelete.hidden, false, 'an owner with a saved plate loaded sees Delete');
  assert.equal(owner.D.bldDuplicate.hidden, false, 'Duplicate is untouched — staff create plates freely');

  const staff = harness({ loadedPlateId: 'P1', role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.bldDelete.hidden, true, 'staff may not delete a plate');
  assert.equal(staff.D.bldDuplicate.hidden, false, 'and Duplicate is STILL untouched');

  /* The pre-existing half of the condition survives: no plate loaded, no Delete button, whoever
     you are. A role gate that swallowed that would put back the "visible control that does
     nothing" F7's review found. */
  const none = harness({ loadedPlateId: null });
  none.api.applyRoleUi();
  assert.equal(none.D.bldDelete.hidden, true, 'and an unsaved plate still has nothing to delete');
});

test('delete menu: the Menu-tab button is not offered to staff', () => {
  const owner = harness();
  owner.api.applyRoleUi();
  assert.equal(owner.D.menuDelBtn.style.display, '', 'an owner on an existing menu sees it');

  const staff = harness({ role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.menuDelBtn.style.display, 'none', 'staff may not delete a menu');

  /* canDeleteMenu's own answer is still half of it — a menu id that is not in the list stays
     undeletable for an owner too. */
  const gone = harness({ currentMenuId: 'M-deleted' });
  gone.api.applyRoleUi();
  assert.equal(gone.D.menuDelBtn.style.display, 'none', 'a menu that is not there is still not deletable');
});

test('food cost target: staff SEE the number and cannot change it', () => {
  const owner = harness();
  owner.api.applyRoleUi();
  assert.equal(owner.D.setCogsInput.readOnly, false);
  assert.match(owner.D.setCogsHelp.textContent, /Drives suggested prices/);

  const staff = harness({ role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.setCogsInput.readOnly, true, 'the edit is removed');
  assert.equal(staff.D.setCogsInput.attrs['aria-readonly'], 'true', 'and said out loud');
  /* ⚠️ NOT HIDDEN, AND THIS IS THE ASSERTION THAT SAYS SO. Every other restricted control here
     disappears; this one is a NUMBER that drives every suggested price and every good/bad colour
     a staff member reads all day. Hiding it would take away a fact in order to prevent an edit.
     If a later batch "makes it consistent" by hiding the row, this goes red on purpose. */
  assert.match(staff.D.setCogsHelp.textContent, /Only the caf./,
    'the help line says who can change it, so the field does not merely look broken');
  assert.ok(SRC.indexOf('setCogsRow') < 0, 'there is deliberately no hook for hiding the target row');
});

test('restore: the row is hidden for staff, and the CSS lets it actually hide', () => {
  const owner = harness();
  owner.api.applyRoleUi();
  assert.equal(owner.D.setRestoreRow.hidden, false);

  const staff = harness({ role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.setRestoreRow.hidden, true);

  /* ⚠️ THE HALF THAT IS NOT IN THE JS AT ALL, and without it the line above is green while the row
     sits there on screen. An author `display` rule beats the UA's `[hidden]{display:none}` because
     ORIGIN is compared before specificity, so `.stg-row{display:flex}` would win. CLAUDE.md's ten
     — now eleven — instances of the same fix. */
  assert.match(CSS, /\.stg-row:not\(\[hidden\]\)\{display:flex/,
    '.stg-row needs the :not([hidden]) guard or hiding the row does nothing');
  /* AND ON BOTH RULES. The narrow-screen copy repeats `align-items` and `gap`; specificity is
     compared before source order, so guarding only the wide rule would raise it to (0,2,0) and
     silently kill the mobile override — the exact @media trap CLAUDE.md records five of. */
  assert.equal((CSS.match(/\.stg-row:not\(\[hidden\]\)/g) || []).length, 2,
    'both .stg-row rules carry the guard, so the two keep matching specificity');
  assert.ok(CSS.indexOf('\n  .stg-row{') < 0 && CSS.indexOf('\n.stg-row{') < 0,
    'no unguarded .stg-row display rule is left at either breakpoint');
});

/* ---------------------------------------------------------------------------------------------
   3. THE SECOND DOOR TO A PLATE DELETE
   --------------------------------------------------------------------------------------------- */

test('"Delete everything" is a plate delete ONLY when there is a plate — both halves', () => {
  /* ⚠️ THIS IS THE DOOR THAT IS EASY TO MISS. The builder is not the only way to delete a plate;
     the menu-item modal's "Delete everything" does it too. And it is not a blanket restriction,
     because for a dish with NO plate the same button only removes the menu_items row — everyday
     unpublishing, which 187 deliberately left staff able to do. */
  const linked = { D1: { id: 'D1', name: 'Fish', plate: { id: 'P1' } } };
  const loose = { D2: { id: 'D2', name: 'Soup', plate: null } };

  const owner = harness({ menuById: linked });
  owner.api.openDelChoice('D1', 'Fish');
  assert.equal(owner.D.delChoiceAll.hidden, false, 'an owner is offered both');
  assert.match(owner.D.delChoiceMsg.textContent, /or delete everything\?/);

  const staff = harness({ menuById: linked, role: 'staff' });
  staff.api.openDelChoice('D1', 'Fish');
  assert.equal(staff.D.delChoiceAll.hidden, true, 'staff are not offered the plate delete');
  /* The wording follows the button. A modal asking "keep the plate, or delete everything?" above a
     single button is a question with one answer. */
  assert.ok(staff.D.delChoiceMsg.textContent.indexOf('delete everything') < 0,
    'and the message stops asking a question it no longer offers');
  assert.match(staff.D.delChoiceMsg.textContent, /only the caf. owner can delete a plate/);

  const staffLoose = harness({ menuById: loose, role: 'staff' });
  staffLoose.api.openDelChoice('D2', 'Soup');
  assert.equal(staffLoose.D.delChoiceAll.hidden, false,
    'with no plate to delete, staff keep the button — it only unpublishes the dish');
  assert.match(staffLoose.D.delChoiceMsg.textContent, /or delete everything\?/);
});

/* ---------------------------------------------------------------------------------------------
   4. THE GUARD AT THE ACTION, NOT ONLY AT THE BUTTON
   --------------------------------------------------------------------------------------------- */

test('ownerOnly refuses with words rather than silence, and lets an owner through', () => {
  const owner = harness();
  assert.equal(owner.api.ownerOnly('delete a plate'), true);
  assert.deepEqual(owner.calls.toasts, [], 'an owner is not told anything');

  const staff = harness({ role: 'staff' });
  assert.equal(staff.api.ownerOnly('delete a plate'), false);
  assert.equal(staff.calls.toasts.length, 1);
  assert.match(staff.calls.toasts[0], /Only the caf. owner can delete a plate\./,
    'and it names the thing, not a generic refusal');
});

test('every action the server refuses is guarded at the FUNCTION, not only at its button', () => {
  /* Hiding a control is an affordance. CLAUDE.md's lesson from 187 is that the frame must be "what
     are ALL the ways this can happen", not "which doors does my UI draw" — a stale screen, a
     keyboard path or a call site added next month walks straight past a missing button. Each of
     these is one line at the top of the real function. */
  const guarded = [
    ['deletePlate', /if\(!ownerOnly\('delete a plate'\)\) return;/],
    ['deleteCurrentMenu', /if\(!ownerOnly\('delete a menu'\)\) return;/],
    ['doDeleteEverything', /if\(sp && !ownerOnly\('delete a plate'\)\)\{ closeDelChoice\(\); return; \}/],
  ];
  guarded.forEach(([name, re]) => {
    assert.match(extractFn(SRC, name), re, `${name} must refuse a non-owner itself`);
  });
  /* The restore is not a named function of its own — it is the file-picker pair — so it is pinned
     at both ends: the button that OPENS the picker and the change event that arrives afterwards,
     because a change can land after the row was hidden mid-flow. */
  const picker = jsCode(SRC).slice(jsCode(SRC).indexOf("var b=document.getElementById('setRestore')"));
  const block = picker.slice(0, picker.indexOf('})();'));
  assert.equal((block.match(/ownerOnly\('restore a backup'\)/g) || []).length, 2,
    'both the click that opens the picker and the change that follows it');
  /* And the target's input listener, which readOnly already blocks for a human — this is for an
     event dispatched programmatically. Silent rather than toasting: the help line already explains
     it, and a toast per keystroke on an unusable field is noise. */
  assert.match(jsCode(SRC), /ci\.addEventListener\('input',function\(\)\{ if\(!isOwner\(\)\) return;/,
    "the target's input listener refuses before it reaches setCogs");
});

/* ---------------------------------------------------------------------------------------------
   5. THE COPY, which is the item's first job
   --------------------------------------------------------------------------------------------- */

test('the Team card states the roles as fact and names the one you hold', () => {
  const stripped = htmlCode(HTML);
  const card = stripped.slice(stripped.indexOf('<h3 class="stg-card-h">Team</h3>'));
  const body = card.slice(0, card.indexOf('</section>'));
  /* ⚠️ THE REGRESSION THIS EXISTS FOR. The card said the two roles were "planned", which was true
     when it was written and became false the day 187 shipped. Nothing else in the app would have
     noticed. */
  assert.ok(body.indexOf('planned') < 0, 'the roles are not "planned" any more — they are enforced');
  assert.ok(body.indexOf('id="teamRole"') > 0, 'and the card says which one the reader holds');
  /* The four it names must be the four the server actually refuses — the card is the only place a
     user is ever told what staff cannot do, so a drift here is a false statement to a customer. */
  ['delete plates', 'menus', 'target food cost', 'restore a backup'].forEach((s) => {
    assert.ok(body.indexOf(s) > 0, `the card names "${s}"`);
  });
  /* It keeps its .stg-soon sentence, because ONE capability here still does not exist — adding
     someone — and §R4 says that is stated in a sentence, never mimed with a control. */
  assert.ok(body.indexOf('class="stg-soon"') > 0);
  assert.ok(body.indexOf('<button') < 0, 'invitations are not built, so no control pretends they are');
  /* The SECOND stale claim on this screen, and it was found by looking at it rather than by any
     test: the header subtitle said "roles and billing are still to come". Half of that is now
     false, and a screen that contradicts itself two cards apart is worse than either sentence
     alone. Pinned here because nothing else reads that line. */
  const head = stripped.slice(stripped.indexOf('id="tab-account"'));
  assert.ok(head.slice(0, head.indexOf('</h2>') + 200).indexOf('roles and billing are still to come') < 0,
    'the Account header cannot still call roles a coming feature');

  const owner = harness();
  owner.api.applyRoleUi();
  assert.match(owner.D.teamRole.textContent, /owner of this caf./);
  const staff = harness({ role: 'staff' });
  staff.api.applyRoleUi();
  assert.match(staff.D.teamRole.textContent, /signed in as staff/);
});

/* ---------------------------------------------------------------------------------------------
   6. AND IT NEVER THROWS ON AN ELEMENT THAT IS NOT THERE
   --------------------------------------------------------------------------------------------- */

test('applyRoleUi is a no-op on a page missing every one of its elements', () => {
  /* A cached index.html from before this batch has none of the new ids. It must degrade to "the
     old screen, unrestricted" rather than throwing inside bootstrapSync's try — which would land
     on "couldn't load your data" for a database that answered perfectly. */
  const { api } = harness({ omit: ['bldDuplicate', 'bldDelete', 'menuDelBtn', 'setRestoreRow',
    'setCogsInput', 'setCogsHelp', 'teamRole'], role: 'staff' });
  assert.doesNotThrow(() => api.applyRoleUi());
});
