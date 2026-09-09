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
const { loadApp, extractFn, noComments } = require('./_extractfn');

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
    'setCogsHelp', 'teamRole', 'teamOwner', 'delChoiceAll', 'delChoiceMsg',
    'ingDelete'];   // 255: the product delete, which moved ONTO this list as the plate delete moved off
  const D = {};
  ids.forEach((id) => { D[id] = mkNode(id); });
  (opts.omit || []).forEach((id) => { delete D[id]; });
  const calls = { toasts: [], shown: [], teamLoads: 0 };
  // eslint-disable-next-line no-new-func
  const api = new Function('D', 'C', 'OPT', `
    "use strict";
    /* 192: applyRoleUi asks whether the Account PANE is on screen, which is the pane element's own
       display — the same thing showTab sets. Served here rather than stubbed away, because which
       question the guard asks IS what the promotion test is checking. */
    var document = { getElementById: function(id){
      if(id==='tab-account') return { style: { display: OPT.acctShowing ? '' : 'none' } };
      return D[id] || null;
    } };
    function toast(m){ C.toasts.push(m); }
    function show(id){ C.shown.push(id); }
    var loadedPlateId = OPT.loadedPlateId || null;
    var currentMenuId = OPT.currentMenuId || 'M1';
    var menusList = OPT.menusList || [{id:'M1', name:'Main'}];
    var menuById = OPT.menuById || {};
    var delChoiceId = null;
    function canDeleteMenu(id){ return menusList.some(function(m){return m.id===id;}); }
    function plateForMenuItem(mi){ return (mi && mi.plate) || null; }
    /* 192 — applyRoleUi now also refreshes the Team card. Both of these are COLLABORATORS observed
       here, not decisions re-implemented: what is under test is WHETHER applyRoleUi re-reads the
       team, and on which condition — never what loadTeam does, which invites-client.test.js runs
       for real. teamData starts idle, which is the shipped initial state.
       (No backticks in this comment: it lives inside a template literal, and one would end the
       string. That cost a syntax error the first time it was written.) */
    var teamData = OPT.teamData || {status:'idle', members:[], invites:[], err:''};
    function loadTeam(){ C.teamLoads++; }
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

/* ⚠️ 255 — THIS TEST IS INVERTED, NOT DELETED, AND THE INVERSION IS THE RECORD.
   It asserted that staff are NOT offered the builder's Delete. Max reversed his own 187 decision on
   10 Sep 2026: *"they can do plates but not products, since those can break other plates that arent
   theres."* His reason is the whole rule and belongs where the next reader will meet it — the line
   is not how much damage a delete does, it is WHOSE work it destroys. A plate belongs to whoever
   built it; a product is shared, so deleting one reaches plates that are not yours.
   The pre-existing half of the condition still holds and is still asserted below. */
test('delete plate: the builder button is offered to STAFF TOO, since 255', () => {
  const owner = harness({ loadedPlateId: 'P1' });
  owner.api.applyRoleUi();
  assert.equal(owner.D.bldDelete.hidden, false, 'an owner with a saved plate loaded sees Delete');
  assert.equal(owner.D.bldDuplicate.hidden, false, 'Duplicate is untouched — staff create plates freely');

  const staff = harness({ loadedPlateId: 'P1', role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.bldDelete.hidden, false, 'staff may delete a plate now — this is the 187 reversal');
  assert.equal(staff.D.bldDuplicate.hidden, false, 'and Duplicate is STILL untouched');

  /* The pre-existing half of the condition survives: no plate loaded, no Delete button, whoever
     you are. A role gate that swallowed that would put back the "visible control that does
     nothing" F7's review found. */
  const none = harness({ loadedPlateId: null });
  none.api.applyRoleUi();
  assert.equal(none.D.bldDelete.hidden, true, 'and an unsaved plate still has nothing to delete');
});

/* 255 — the product delete is the one control that CHANGED SIDES, so it is asserted on both. */
test('delete product: the button is not offered to staff', () => {
  const owner = harness();
  owner.api.applyRoleUi();
  assert.equal(owner.D.ingDelete.hidden, false, 'an owner sees Delete in the product edit modal');

  const staff = harness({ role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.ingDelete.hidden, true,
    'staff may not delete a product — it is the row other people\'s plates are costed from');
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

/* ⚠️ 255 — THIS TEST'S SUBJECT IS GONE, AND SAYING SO IS THE POINT.
   It pinned a condition with two halves: hide "Delete everything" when the dish HAS a plate AND the
   viewer is staff. Max reversed the role half on 10 Sep 2026, and the remaining half was never a
   condition on this button at all — it was `!hasPlate || isOwner()`, so a plate-less dish showed the
   button for everyone already. With the role gone, the button is shown in every case.
   A first cut of this batch "tidied" that into `hidden = !hasPlate`, which reads better and newly
   HID the button for a plate-less dish — a behaviour change nobody asked for, caught by the review.
   So this now pins the thing that is true: the button is offered to every role, with or without a
   plate, and the two roles get the SAME screen. */
test('"Delete everything" is offered to every role, with or without a plate', () => {
  const linked = { D1: { id: 'D1', name: 'Fish', plate: { id: 'P1' } } };
  const loose = { D2: { id: 'D2', name: 'Soup', plate: null } };

  for (const [label, role] of [['an owner', undefined], ['staff', 'staff']]) {
    const withPlate = harness(role ? { menuById: linked, role } : { menuById: linked });
    withPlate.api.openDelChoice('D1', 'Fish');
    assert.equal(withPlate.D.delChoiceAll.hidden, false, `${label} is offered it on a dish WITH a plate`);
    assert.match(withPlate.D.delChoiceMsg.textContent, /or delete everything\?/);

    const noPlate = harness(role ? { menuById: loose, role } : { menuById: loose });
    noPlate.api.openDelChoice('D2', 'Soup');
    assert.equal(noPlate.D.delChoiceAll.hidden, false, `${label} is offered it on a dish with NO plate too`);
  }

  /* The two roles must agree, which is the whole of the reversal: before 255 these differed. */
  const o = harness({ menuById: linked }); o.api.openDelChoice('D1', 'Fish');
  const st = harness({ menuById: linked, role: 'staff' }); st.api.openDelChoice('D1', 'Fish');
  assert.equal(st.D.delChoiceAll.hidden, o.D.delChoiceAll.hidden, 'staff and owner see the same button');
  assert.equal(st.D.delChoiceMsg.textContent, o.D.delChoiceMsg.textContent, 'and the same words');
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
    ['deleteCurrentMenu', /if\(!ownerOnly\('delete a menu'\)\) return;/],
    // 255: the product delete. NOTE THE NAME — deleteIngredient deletes a PRODUCT (the naming
    // inversion). This is the guard Max's answer actually asked for.
    ['deleteIngredient', /if\(!ownerOnly\('delete a product'\)\) return;/],
  ];
  guarded.forEach(([name, re]) => {
    assert.match(noComments(extractFn(SRC, name), 'block', 'line'), re,
      `${name} must refuse a non-owner itself`);
  });
  /* ⚠️ 255 — AND THE OTHER DIRECTION, WHICH IS THE HALF A CENSUS FORGETS: the two plate guards are
     GONE and must stay gone. Dropping them from the list above would let them be silently restored,
     and a restored guard is invisible — staff would simply find the button doing nothing again.
     Searched over code with comments stripped, because this batch's own comments explain the removal
     using the very words being searched for (CLAUDE.md 183(a)). */
  [['deletePlate', /ownerOnly\('delete a plate'\)/],
   ['doDeleteEverything', /ownerOnly\('delete a plate'\)/]].forEach(([name, re]) => {
    assert.ok(!re.test(noComments(extractFn(SRC, name), 'block', 'line')),
      `${name} must NOT refuse a non-owner — Max reversed that on 10 Sep 2026`);
  });
  /* ⚠️ THE TAUGHT-PACK REMOVAL IS DELIBERATELY UNGATED, and is asserted as such rather than left
     out — an omission from a census reads as an oversight. The restriction was built and reverted:
     `applyTidy` re-keys taught packs through the same delete with no role check anywhere in its
     chain, so gating only this door produces a silent half-apply on a staff supplier rename.
     tests/roles.test.js holds the server half of the same statement. */
  const smem = jsCode(SRC).slice(jsCode(SRC).indexOf(".smem-del').addEventListener"));
  assert.ok(!/ownerOnly\(/.test(smem.slice(0, 400)),
    'removing a taught pack is NOT owner-gated — gating it alone half-applies a staff supplier rename');
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
  /* 244 split the one-line listener into a debounced one, so this is asserted on the BLOCK rather
     than on a single line — and it is stronger for it: what matters is that the refusal comes
     FIRST, before anything is parsed, applied or scheduled, not that it shares a line with the
     opening brace. Moving the guard below the setCogs call now fails; it did not before. */
  const code = jsCode(SRC);
  const listener = code.slice(code.indexOf("ci.addEventListener('input'"));
  const body = listener.slice(0, listener.indexOf('\n  });'));
  assert.ok(body.indexOf('if(!isOwner()) return;') >= 0, "the target's input listener refuses a non-owner itself");
  assert.ok(body.indexOf('if(!isOwner()) return;') < body.indexOf('setCogs('),
    'and it refuses BEFORE it reaches setCogs');
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
  /* ⚠️ THESE TWO WERE THE EXACT OPPOSITE UNTIL 192, and inverting them is the batch doing its job
     rather than a test being loosened. 188 asserted a `.stg-soon` sentence and NO `<button>`,
     because adding someone did not exist and §R4 forbids miming an absent capability with a
     control. 191 built it and this batch ships it — so the same rule now requires the reverse: the
     sentence saying it is done by hand is a false statement to a customer, and the control is
     honest. The rule never changed; the fact underneath it did.
     Kept as assertions rather than deleted, so a revert that removes the invite form but leaves
     the card claiming to have one still goes red. */
  assert.ok(body.indexOf('class="stg-soon"') < 0,
    'adding someone is no longer "for now" — the sentence goes when the capability arrives');
  assert.ok(body.indexOf('done by hand') < 0, 'and so does the claim that it is done by hand');
  assert.ok(/id="teamForm"/.test(body) && /id="teamEmail"/.test(body) && /id="teamAdd"/.test(body),
    'the card carries a real invite form');
  assert.ok(/id="teamList"/.test(body), 'and the list it invites people into');
  /* ⚠️ THE HONEST SENTENCE, and it is the one thing a reader of this card cannot work out for
     themselves. 191 writes a ROW; no email leaves EzPlate at any point in this flow. An owner told
     "invitation sent" waits for a delivery that never happens instead of telling the person, and
     the feature silently does nothing. The first draft of this card got it wrong. */
  /* `.{0,8}` rather than `.` for the apostrophe: the copy is written with `&rsquo;`, which is seven
     characters, and a single-dot match went red against markup that says exactly the right thing. */
  assert.match(body, /EzPlate doesn.{0,8}t email them/i,
    'the card must say EzPlate sends nothing, or an owner waits for an email that never arrives');
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

test('192: the invitations block is hidden from staff as ONE block, not control by control', () => {
  /* 191 refuses staff every command on `business_invites`, the SELECT included, so a staff account
     shown this would get an empty list under an Invite button and nothing to explain it. §R4 again:
     the #teamRole sentence is what they get instead. Hiding the container rather than each control
     is what makes "did I remember all of them" not a question — a fifth control added inside
     inherits the gate. */
  const owner = harness();
  owner.api.applyRoleUi();
  assert.equal(owner.D.teamOwner.hidden, false, 'an owner sees the list and the invite form');

  const staff = harness({ role: 'staff' });
  staff.api.applyRoleUi();
  assert.equal(staff.D.teamOwner.hidden, true, 'staff see neither');

  /* ⚠️ AND `.team-own` MUST CARRY NO `display` RULE, which is the half that is not in the JS at all.
     An author `display` rule beats the UA's `[hidden]{display:none}` on ORIGIN, before specificity
     is compared, so one line of CSS would show every staff account the invite form with the
     assertion above still green. CLAUDE.md records twelve `:not([hidden])` repairs of exactly this;
     the cheaper fix is not to write the rule, and this is what holds someone to it.
     Comments stripped first — CLAUDE.md 183(a): the CSS comment here NAMES the class and uses the
     word "display" to explain why there is no rule, and an unstripped match would fail on its own
     documentation. */
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\.team-own[^{,]*\{[^}]*display\s*:/.test(css),
    '.team-own must have no display rule, or hiding it from staff does nothing');
  /* The same trap one level down, and it is the one a later batch is likeliest to spring: the two
     gate lines toggled by bootGate/gateMode. */
  ['bg-alt', 'bg-done'].forEach((c) => {
    assert.ok(!new RegExp(`\\.${c}[^{,]*\\{[^}]*display\\s*:`).test(css),
      `.${c} is toggled with [hidden] and must carry no display rule`);
  });
});

test('192: a PROMOTED account whose card is on screen re-reads it — the review finding', () => {
  /* ⚠️ THE CASE THE FIRST CONDITION GOT WRONG, and it is worth stating why the wrong version read
     as correct. The guard was `teamData.status!=='idle'`, with a comment claiming that meant "the
     card has been opened". It does not: `loadTeam` RESETS the state to 'idle' for a staff caller,
     so a staff account is idle however many times the Account screen has been opened.
     Promote that account — another owner adds the role — while they are looking at the Account
     screen, let an `online` blip re-sync, and `applyRoleUi` unhides the invitations block while the
     guard skips the fetch. An empty card, for the person who just gained the right to see it. It
     self-healed on the next navigation, which is what would have kept it unreported. */
  const shown = harness({ acctShowing: true, teamData: { status: 'idle', members: [], invites: [], err: '' } });
  shown.api.applyRoleUi();
  assert.equal(shown.D.teamOwner.hidden, false, 'the block is revealed to the new owner');
  assert.equal(shown.calls.teamLoads, 1, 'and its contents are fetched, or it is revealed EMPTY');

  /* And the boot-cost property is unchanged: idle AND not showing is still no request. Without
     this half the fix would be "fetch always", which is the two-round-trips-per-boot cost the
     condition exists to avoid. */
  const hidden = harness({ acctShowing: false, teamData: { status: 'idle', members: [], invites: [], err: '' } });
  hidden.api.applyRoleUi();
  assert.equal(hidden.calls.teamLoads, 0, 'a card nobody is looking at still costs nothing at boot');
});

test('192: a role that arrives later re-reads the team, but boot does not', () => {
  /* THE COST THIS CONDITION EXISTS TO AVOID. `applyRoleUi` runs inside `bootstrapSync` on EVERY
     load, so an unconditional `loadTeam()` would spend two round trips per boot on a card nobody
     is looking at — on a phone, on the boot critical path v108 spent a whole batch shortening.
     `!== 'idle'` is what keeps it off there, and it is not merely an optimisation: it is the
     difference between the Account screen paying for itself and every screen paying for it. */
  const cold = harness();                                    // teamData starts idle, as it ships
  cold.api.applyRoleUi();
  assert.equal(cold.calls.teamLoads, 0, 'boot must not fetch a card nobody has opened');

  /* But once the card HAS been opened, a re-sync that changes the role must not leave a stale list
     on screen — a demoted owner would otherwise keep reading their team's addresses off a rendered
     list until they navigated away. */
  const warm = harness({ teamData: { status: 'ok', members: [{}], invites: [], err: '' } });
  warm.api.applyRoleUi();
  assert.equal(warm.calls.teamLoads, 1, 'an opened card is re-read when the role resolves');
  const warmStaff = harness({ role: 'staff', teamData: { status: 'ok', members: [{}], invites: [], err: '' } });
  warmStaff.api.applyRoleUi();
  assert.equal(warmStaff.calls.teamLoads, 1,
    'including for staff — loadTeam is what CLEARS a list that was read as owner');
});

/* ---------------------------------------------------------------------------------------------
   6. AND IT NEVER THROWS ON AN ELEMENT THAT IS NOT THERE
   --------------------------------------------------------------------------------------------- */

test('applyRoleUi is a no-op on a page missing every one of its elements', () => {
  /* A cached index.html from before this batch has none of the new ids. It must degrade to "the
     old screen, unrestricted" rather than throwing inside bootstrapSync's try — which would land
     on "couldn't load your data" for a database that answered perfectly. */
  const { api } = harness({ omit: ['bldDuplicate', 'bldDelete', 'menuDelBtn', 'setRestoreRow', 'ingDelete',
    'setCogsInput', 'setCogsHelp', 'teamRole'], role: 'staff' });
  assert.doesNotThrow(() => api.applyRoleUi());
});
