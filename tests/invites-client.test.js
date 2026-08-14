/*
 * invites-client.test.js — 192. The CLIENT half of invitations.
 *
 * 191 shipped the server: `business_invites` with four restrictive policies, `invite_pending` for
 * the sign-up gate, `claim_business_invite` for the join, `business_team` for the list. Nothing it
 * built was reachable from the app. This file pins the half that reaches it.
 *
 * WHAT THESE RUN. The real shipped functions, brace-extracted from js/app.js — claimState,
 * teamWriteLanded, normEmail, loadTeam, renderTeam, submitInvite, revokeInvite, gateMode — against
 * a DOM stub and a fake Supabase client. The only things faked are the network boundary and the
 * DOM. Nothing here re-implements a shipped decision, which is CLAUDE.md's twenty-incident rule.
 *
 * ⚠️ THE ONE THING THIS FILE CANNOT RUN is the claim's placement inside `bootstrapSync`, which is
 * a branch of a 200-line async function that owns the whole boot. Those assertions are structural,
 * exactly as 185's and 186's are in tests/tenant-gate.test.js and for the same reason — and the
 * BEHAVIOUR is proved in tests/visual/v165-invite.spec.js, which drives a real browser from the
 * non-member gate to a loaded café. Structural here, behavioural there; neither alone would do.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/* CLAUDE.md 183(a): an assertion that greps a source file searches PROSE as well as code, and the
   prose is written by the same person in the same hour saying the same words. Every structural
   assertion below runs on this. */
const jsCode = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').split('\n')
  .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');

/* ---------------------------------------------------------------------------------------------
   1. claimState — the third answer, again
   --------------------------------------------------------------------------------------------- */

// eslint-disable-next-line no-new-func
const claimState = new Function(`"use strict";${extractFn(SRC, 'claimState')}return claimState;`)();

test('claimState has three answers, and an error is not one of the other two', () => {
  assert.equal(claimState({ data: '0000-uuid', error: null }), 'joined', 'a uuid means joined');
  assert.equal(claimState({ data: null, error: null }), 'none', 'null means there was nothing to claim');
  /* ⚠️ THE ONE THAT MATTERS. A failed claim must not read as "joined" — that would re-sync forever
     against a café that does not exist — and it must not read as a definite "nothing to claim"
     either, because the caller uses the two differently in the handover to 185's screen. */
  assert.equal(claimState({ error: { message: 'boom' } }), 'unknown', 'an error is not an answer');
  assert.equal(claimState(null), 'unknown', 'no result at all is not an answer');
  assert.equal(claimState({}), 'unknown', 'and neither is an absent data field');
  assert.equal(claimState({ data: undefined, error: null }), 'unknown',
    'undefined is NOT null here — an older project with no such function has told us nothing');
  /* Anything that is not a uuid string is could-not-tell rather than joined. A truthy non-string
     would otherwise trigger the re-sync against a café that was never returned. */
  [1, true, {}, [], ''].forEach((odd) => {
    assert.equal(claimState({ data: odd, error: null }), 'unknown',
      `${JSON.stringify(odd)} is not a café id`);
  });
  /* An error ALONGSIDE data is still an error. supabase-js resolves rather than rejecting, so this
     shape is reachable, and reading the uuid off it would join somebody to a failed call. */
  assert.equal(claimState({ data: 'uuid', error: { message: 'boom' } }), 'unknown',
    'the error is checked FIRST, or a failed call still reads as a join');
});

/* ---------------------------------------------------------------------------------------------
   2. WHERE THE CLAIM SITS — structural, and each assertion names the defect it forbids
   --------------------------------------------------------------------------------------------- */

test('the claim runs BEFORE the non-member screen is painted, and only for a signed-in caller', () => {
  const src = jsCode(SRC);
  const branch = src.slice(src.indexOf("_tg==='nomember' ||"), src.indexOf("bootReady('signin', SIGNIN_MSG)"));

  assert.match(branch, /claim_business_invite/, 'the claim is attempted at the tenant gate at all');
  /* ORDER. After the paint it would be a round trip whose answer nothing reads — the user is
     already looking at "ask the café owner to add this account" while they have just been added. */
  assert.ok(branch.indexOf('claim_business_invite') < branch.indexOf("bootReady('nomember'"),
    'the claim must be asked BEFORE the screen that says there is nothing to show');
  /* THE ANON GUARD. `claim_business_invite` returns null on a null auth.uid(), so asking without a
     session is a round trip on the PUBLIC path — the one every stranger who opens the URL takes —
     to be told what the session read already said. */
  assert.match(branch, /if\(_u\s*&&\s*!_claiming\)/,
    'a signed-out visitor must not pay for a claim that cannot succeed');
  /* ONLY a definite join re-syncs. 'none' and 'unknown' must both fall through to the screen that
     was going to be painted anyway — an unreadable claim is not evidence of a café. */
  assert.match(branch, /if\(_cl==='joined'\)/, "only 'joined' may change what happens next");
  assert.match(branch, /await bootstrapSync\(\)/, 'and a join re-syncs, because every read above is stale');
});

test('the claim cannot loop forever — the re-entrancy latch, and it is cleared in a finally', () => {
  /* ⚠️ THE DEFECT THIS FORBIDS IS AN INFINITE BOOT. A successful claim re-runs bootstrapSync, and
     that run reaches the same branch if the tenant lookup still says nomember — replication lag, a
     flaky request, a server bug. Without the latch the two call each other forever, on a phone,
     behind a spinner. With it the NESTED run never claims, so it either paints or succeeds. */
  const src = jsCode(SRC);
  assert.match(src, /var _claiming=false;/, 'the latch exists');
  const branch = src.slice(src.indexOf("_tg==='nomember' ||"), src.indexOf("bootReady('signin', SIGNIN_MSG)"));
  assert.match(branch, /_claiming=true;\s*try\{\s*await bootstrapSync\(\);\s*\}\s*finally\{\s*_claiming=false;\s*\}/,
    'set before the nested sync and cleared in a FINALLY — a throw inside must not wedge the app into never claiming again');
  /* And the guard must READ it, or the latch is a variable nobody consults. */
  assert.match(branch, /!_claiming/, 'the guard reads the latch');
  /* Exactly two writers and one reader. A second place setting it would be a second definition of
     "am I already claiming", which is how this kind of latch drifts out of step. */
  assert.equal((src.match(/_claiming=/g) || []).length, 3, 'declared once, set once, cleared once');
});

/* ---------------------------------------------------------------------------------------------
   3. THE TEAM CARD — the real functions, a fake wire
   --------------------------------------------------------------------------------------------- */

function mkNode(id) {
  const n = {
    id, hidden: false, value: '', disabled: false, textContent: '', innerHTML: '',
    style: {}, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {},
  };
  return n;
}

/* `q` is what the fake `from()` records and answers with. Every builder method returns `this`, so a
   chain of any shape resolves — and the RECORDED chain is what the assertions read, which is how a
   dropped `.select()` or a missing `.eq()` is caught rather than silently tolerated. */
function teamHarness(opts) {
  opts = opts || {};
  const S = {
    toasts: [], confirms: [], rpc: [], from: [], chain: [], sync: [], rpcN: 0, hold: null,
  };
  const D = {};
  ['teamList', 'teamErr', 'teamEmail', 'teamAdd'].forEach((id) => { D[id] = mkNode(id); });
  (opts.omit || []).forEach((id) => { delete D[id]; });

  // eslint-disable-next-line no-new-func
  const api = new Function('D', 'S', 'OPT', `
    "use strict";
    var document = { getElementById: function(id){ return D[id] || null; } };
    var navigator = { onLine: true };
    var console = { error: function(){} };
    function toast(m){ S.toasts.push(m); }
    function setSync(s){ S.sync.push(s); }
    /* The REAL askConfirm hands its callback to a modal button and returns; it does not pass the
       callback's promise back, so revokeInvite cannot return one either. Capturing what fn()
       resolves to is how the test awaits the real async path without the app being contorted to
       suit it. Same reason the harness stubs the modal at all. */
    function askConfirm(title,msg,ok,fn){ S.confirms.push([title,msg,ok]); if(OPT.confirm!==false) S.confirmed = fn(); }
    var authUser = OPT.authUser || null;
    var businessRole = OPT.role || 'owner';
    ${extractFn(SRC, 'esc')}
    ${extractFn(SRC, 'errText')}
    ${extractFn(SRC, 'isOwner')}
    ${extractFn(SRC, 'pushWrite')}
    ${extractFn(SRC, 'normEmail')}
    ${extractFn(SRC, 'teamMemberHtml')}
    ${extractFn(SRC, 'teamInviteHtml')}
    ${extractFn(SRC, 'renderTeam')}
    ${extractFn(SRC, 'teamErr')}
    ${extractFn(SRC, 'teamWriteLanded')}
    ${extractFn(SRC, 'dbInviteMember')}
    ${extractFn(SRC, 'dbRevokeInvite')}
    ${extractFn(SRC, 'loadTeam')}
    ${extractFn(SRC, 'submitInvite')}
    ${extractFn(SRC, 'revokeInvite')}
    var teamData = OPT.teamData || {status:'idle', members:[], invites:[], err:''};
    /* The real generation counter, at its shipped starting value. Declared rather than extracted
       because it is a bare var, not a function — but it is the SAME variable loadTeam bumps and
       reads, so the out-of-order tests below run the real mechanism. */
    var _teamGen = 0;
    var SUPA = OPT.noClient ? null : {
      /* S.hold, when a test sets it, makes the FIRST read hang until the test releases it — which
         is the only way to get two loadTeam calls resolving OUT OF ORDER, the shape the generation
         token exists for. S.rpcN is which call this is, so a test can make them answer
         differently and tell which one won. */
      rpc: function(name){
        S.rpc.push(name);
        var n = ++S.rpcN;
        var out = (OPT.seq && OPT.seq[n-1]) || OPT.teamRes || {data:OPT.members||[], error:null};
        if(n===1 && S.hold) return Promise.resolve(S.hold).then(function(){ return out; });
        return Promise.resolve(out);
      },
      from: function(t){
        S.from.push(t);
        var rec = { table:t, ops:[] };
        S.chain.push(rec);
        var b = {};
        ['select','insert','delete','is','order','eq'].forEach(function(m){
          b[m] = function(a,c){ rec.ops.push([m, a, c]); return b; };
        });
        /* A thenable, so await on ANY point in the chain resolves — which is what supabase-js
           does, and what makes a missing .select() a real observable difference rather than a
           crash the test would notice for the wrong reason.
           (No backticks anywhere in this template literal: one ends the string.) */
        b.then = function(res, rej){ return Promise.resolve(OPT.writeRes !== undefined ? OPT.writeRes : {data:OPT.rows||[], error:null}).then(res, rej); };
        return b;
      }
    };
    return {
      loadTeam: loadTeam, renderTeam: renderTeam, submitInvite: submitInvite,
      revokeInvite: revokeInvite, teamWriteLanded: teamWriteLanded, normEmail: normEmail,
      data: function(){ return teamData; },
      setData: function(d){ teamData = d; }
    };
  `)(D, S, opts);
  return { api, D, S };
}

test('teamWriteLanded: HTTP 200 with NO rows is a FAILURE, not a success', () => {
  /* ⚠️ THE MEASURED DEFECT, not a hypothetical one. 191's rehearsal recorded it on this exact
     table: as staff, `DELETE /business_invites` returned HTTP 200 having changed NOTHING, with the
     row still there afterwards. `pushWrite` reports `res.error`, and there is no error to report —
     so without this the sync pill goes green, the toast says it worked, the list repaints without
     the row, and the invitation is still live. An anon UPDATE/DELETE does the same (CLAUDE.md). */
  const { api } = teamHarness();
  assert.equal(api.teamWriteLanded({ data: [{ id: 'i1' }], error: null }), true, 'a row came back');
  assert.equal(api.teamWriteLanded({ data: [], error: null }), false,
    'HTTP 200 with an empty array is the silent no-op — it must not read as success');
  assert.equal(api.teamWriteLanded({ data: null, error: null }), false, 'and neither does no body at all');
  assert.equal(api.teamWriteLanded({ error: { message: 'x' } }), false, 'an error is obviously not a landing');
  assert.equal(api.teamWriteLanded(null), false);
  assert.equal(api.teamWriteLanded(undefined), false);
});

test('loadTeam does not ask the server anything on behalf of staff', () => {
  /* Staff can read NEITHER source — `business_team()` returns zero rows for a non-owner and the
     invites table is invisible to them (191's restrictive SELECT). Two round trips to render
     nothing, on a card they are not shown. */
  const staff = teamHarness({ role: 'staff', teamData: { status: 'ok', members: [{ email: 'a@b.co', role: 'owner' }], invites: [], err: '' } });
  return staff.api.loadTeam().then(() => {
    assert.deepEqual(staff.S.rpc, [], 'no rpc');
    assert.deepEqual(staff.S.from, [], 'and no table read');
    /* ⚠️ AND IT CLEARS, which is the half that is not about cost. A list read while the account was
       owner must not survive into a staff session — a demotion mid-session would otherwise leave
       every member's email address rendered on screen. */
    assert.equal(staff.api.data().status, 'idle', 'the state is reset, not merely left alone');
    assert.deepEqual(staff.api.data().members, [], 'and the members it held are gone');
  });
});

test('loadTeam paints the loading state BEFORE it waits, not after', () => {
  /* §4 requires a loading state and this is what proves it is reached. The two reads are a real
     round trip on a phone; without this the card sits blank — or worse, keeps the PREVIOUS café's
     list on screen through a refresh, which is a stale list read as a current one.
     Asserted synchronously, before the promise resolves, because "it renders eventually" is what a
     deleted call also does. */
  const h = teamHarness({ members: [], rows: [] });
  const p = h.api.loadTeam();
  assert.match(h.D.teamList.innerHTML, /Loading/, 'the wait is drawn while it is still waiting');
  return p.then(() => {
    assert.ok(h.D.teamList.innerHTML.indexOf('Loading') < 0, 'and replaced once the answer lands');
  });
});

test('loadTeam reads the team and the PENDING invitations, and asks for pending only', () => {
  const h = teamHarness({ members: [{ user_id: 'u1', email: 'max@b.co', role: 'owner' }], rows: [{ id: 'i1', email: 'new@b.co' }] });
  return h.api.loadTeam().then(() => {
    assert.deepEqual(h.S.rpc, ['business_team'], 'the members come from the owner-only function');
    assert.deepEqual(h.S.from, ['business_invites']);
    const ops = h.S.chain[0].ops.map((o) => o[0]);
    /* ⚠️ `.is('accepted_at', null)` IS THE ASSERTION. An ACCEPTED invitation is a member, and the
       members list already has them — without this filter every person in the café appears twice,
       once as a member and once as an outstanding invitation with a Revoke button beside it that
       cannot un-join them. */
    assert.ok(ops.indexOf('is') >= 0, 'pending only');
    const isOp = h.S.chain[0].ops.find((o) => o[0] === 'is');
    assert.deepEqual([isOp[1], isOp[2]], ['accepted_at', null], 'and "pending" means accepted_at is null');
    /* OLDEST FIRST. Not decoration: the list is re-read after every invite and every revoke, so an
       unordered read lets the rows reshuffle under the owner's finger between one Revoke button and
       the next. Ascending also puts the invitation somebody has been waiting longest on at the top,
       which is the one most likely to need chasing. */
    const ord = h.S.chain[0].ops.find((o) => o[0] === 'order');
    assert.deepEqual([ord[1], ord[2]], ['created_at', { ascending: true }], 'oldest invitation first, stably');
    assert.equal(h.api.data().status, 'ok');
    assert.equal(h.api.data().members.length, 1);
    assert.equal(h.api.data().invites.length, 1);
  });
});

test('an OLDER read that lands last is discarded — the generation token', () => {
  /* ⚠️ THE FINDING THE PRE-PUSH REVIEW RAISED, and its precedent is already a rule in CLAUDE.md:
     `gemToken` exists because a late Gemini answer must not be merged over a ruling made without
     it. Same shape here. `loadTeam` has three triggers that can overlap — `applyRoleUi` on every
     boot and `online` blip, `showTab('account')`, and the re-read after an invite or revoke — and
     two in flight together can resolve out of order on a phone.
     Concretely: an owner revokes an invitation, which re-reads; an `online` blip re-syncs and
     re-reads too; the read ISSUED FIRST arrives LAST and puts the revoked invitation back on
     screen as still pending. Nothing errors, nothing is lost on the server, and the number on the
     card is simply wrong until the next load — which is this repo's worst failure shape. */
  let release;
  const slow = new Promise((r) => { release = r; });
  /* Call 1 answers with a STALE list and hangs; call 2 answers with the current one immediately.
     Made distinguishable on purpose — CLAUDE.md 184(b): a fixture whose candidates AGREE cannot
     tell you which one the code read. */
  const h = teamHarness({
    rows: [],
    seq: [
      { data: [{ user_id: 'u1', email: 'STALE@b.co', role: 'owner' }], error: null },
      { data: [{ user_id: 'u1', email: 'current@b.co', role: 'owner' }], error: null },
    ],
  });
  h.S.hold = slow;

  const first = h.api.loadTeam();
  const second = h.api.loadTeam();
  return second.then(() => {
    assert.match(h.D.teamList.innerHTML, /current@b\.co/, 'the newer read painted');
    release();
    return first.then(() => {
      assert.match(h.D.teamList.innerHTML, /current@b\.co/,
        'and the older response, arriving last, changed nothing');
      assert.ok(h.D.teamList.innerHTML.indexOf('STALE@b.co') < 0,
        'a revoked invitation must not come back from a read issued before the delete');
      assert.equal(h.api.data().members[0].email, 'current@b.co', 'in memory as well as on screen');
    });
  });
});

test('a stale ERROR is discarded too, not just stale data', () => {
  /* ⚠️ WHICH IS WHY THE TOKEN IS CHECKED ABOVE BOTH WRITES RATHER THAN ONLY THE SUCCESS ONE. A read
     that failed before a newer read succeeded would otherwise replace a good list with "couldn't
     load your team" — the same defect wearing an error message, and more alarming to look at. */
  let release;
  const slow = new Promise((r) => { release = r; });
  const h = teamHarness({
    rows: [],
    seq: [
      { data: null, error: { message: 'stale timeout' } },
      { data: [{ user_id: 'u1', email: 'current@b.co', role: 'owner' }], error: null },
    ],
  });
  h.S.hold = slow;

  const first = h.api.loadTeam();
  const second = h.api.loadTeam();
  return second.then(() => {
    release();
    return first.then(() => {
      assert.equal(h.api.data().status, 'ok', 'the good answer stands');
      assert.ok(h.D.teamList.innerHTML.indexOf('stale timeout') < 0, 'and no stale error is shown');
      assert.match(h.D.teamList.innerHTML, /current@b\.co/);
    });
  });
});

test('loadTeam paints ONE error state rather than half a card', () => {
  /* The two reads answer one question — who is in this café, now and pending. A members list above
     an unexplained blank where the invitations should be is the quiet-wrong-answer failure this
     repo keeps finding: it looks like "nobody is invited" and means "we could not tell". */
  const h = teamHarness({ writeRes: { data: null, error: { message: 'permission denied' } } });
  return h.api.loadTeam().then(() => {
    assert.equal(h.api.data().status, 'error');
    assert.deepEqual(h.api.data().members, [], 'no half-painted list survives the error');
    assert.match(h.D.teamList.innerHTML, /Couldn.t load your team/);
    assert.match(h.D.teamList.innerHTML, /permission denied/, "and the server's own words reach the user");
  });
});

test('renderTeam draws the states §4 requires, and marks who YOU are', () => {
  const h = teamHarness({ authUser: { id: 'u1' } });
  h.api.setData({ status: 'loading', members: [], invites: [], err: '' });
  h.api.renderTeam();
  assert.match(h.D.teamList.innerHTML, /Loading/, 'loading');

  h.api.setData({
    status: 'ok',
    members: [{ user_id: 'u1', email: 'max@b.co', role: 'owner' }, { user_id: 'u2', email: 'sam@b.co', role: 'staff' }],
    invites: [{ id: 'i1', email: 'new@b.co' }],
    err: '',
  });
  h.api.renderTeam();
  const html = h.D.teamList.innerHTML;
  assert.match(html, /max@b\.co/); assert.match(html, /sam@b\.co/); assert.match(html, /new@b\.co/);
  assert.match(html, /Owner/); assert.match(html, /Staff/);
  /* Which row is you. An owner looking at two addresses needs to know which one is the account they
     are holding — it is the whole diagnosis when something is refused, the same reason 185's screen
     names the account. */
  assert.match(html, /max@b\.co[\s\S]{0,60}>you</, 'the caller is marked');
  assert.ok(!/sam@b\.co[\s\S]{0,40}>you</.test(html), 'and nobody else is');
  assert.match(html, /data-revoke="i1"/, 'a pending invitation can be revoked');
  assert.ok(!/data-revoke[^>]*>[\s\S]{0,40}max@b\.co/.test(html), 'a MEMBER has no revoke — that would be a different feature');

  /* ⚠️ AN EMPTY MEMBERS LIST IS NOT AN EMPTY STATE, and saying so is the point. An owner is always
     a member of their own café, so nothing at all means the answer was not the one we asked for —
     a role that changed underneath us. A blank box would read as "your café has nobody in it". */
  h.api.setData({ status: 'ok', members: [], invites: [], err: '' });
  h.api.renderTeam();
  assert.match(h.D.teamList.innerHTML, /Couldn.t read who is in this caf/);
});

test('the rendered list ESCAPES what the server sent — an email is untrusted text', () => {
  /* An address arrives from `auth.users` via `business_team()` and goes into innerHTML. It is typed
     by a person, and the person who typed it is the one being invited. CLAUDE.md's v113 lesson: a
     passthrough stub hid a real escaping bug, and the fix was to use the app's own `esc`. */
  const h = teamHarness();
  h.api.setData({
    status: 'ok',
    members: [{ user_id: 'u9', email: '<img src=x onerror=alert(1)>@b.co', role: 'staff' }],
    invites: [{ id: '"><script>alert(1)</script>', email: 'x@b.co' }],
    err: '',
  });
  h.api.renderTeam();
  const html = h.D.teamList.innerHTML;
  assert.ok(html.indexOf('<img') < 0, 'no raw tag from an address');
  assert.ok(html.indexOf('<script') < 0, 'and none from an id');
  assert.match(html, /&lt;img/, 'it is escaped rather than stripped');
  /* The id goes into an ATTRIBUTE, so the quote is what matters there rather than the angle bracket. */
  assert.ok(!/data-revoke="[^"]*"[^>]*>alert/.test(html), 'the id cannot break out of its attribute');
  assert.match(html, /&quot;/, 'its quote is escaped');
});

test('submitInvite refuses the two duplicates the CLIENT can name better than Postgres can', () => {
  const base = {
    status: 'ok',
    members: [{ user_id: 'u1', email: 'max@b.co', role: 'owner' }],
    invites: [{ id: 'i1', email: 'pending@b.co' }],
    err: '',
  };
  /* Both of these would otherwise arrive as `duplicate key value violates unique constraint
     "business_invites_pending_uk"`, which is not a sentence to show a café owner. A genuine RACE
     still falls through to the server's own words, which is CLAUDE.md's rule for the unforeseen —
     this handles only the two cases the client can already see. */
  const already = teamHarness({ teamData: base });
  already.D.teamEmail.value = '  MAX@B.CO ';                 // and case/space must not defeat it
  return already.api.submitInvite().then(() => {
    assert.deepEqual(already.S.from, [], 'no write is attempted');
    assert.match(already.D.teamErr.textContent, /already in your caf/);
    assert.equal(already.D.teamErr.hidden, false, 'and the error is actually shown');

    const dup = teamHarness({ teamData: base });
    dup.D.teamEmail.value = 'Pending@B.co';
    return dup.api.submitInvite().then(() => {
      assert.deepEqual(dup.S.from, []);
      assert.match(dup.D.teamErr.textContent, /already been invited/);

      const blank = teamHarness({ teamData: base });
      blank.D.teamEmail.value = '   ';
      return blank.api.submitInvite().then(() => {
        assert.deepEqual(blank.S.from, [], 'a blank never reaches the network');
        assert.match(blank.D.teamErr.textContent, /Enter the email/);
      });
    });
  });
});

test('submitInvite writes a STAFF invitation, asks for the row back, and never says "sent"', () => {
  const h = teamHarness({
    teamData: { status: 'ok', members: [], invites: [], err: '' },
    rows: [{ id: 'i2', email: 'new@b.co' }],
  });
  h.D.teamEmail.value = ' New@B.co ';
  return h.api.submitInvite().then(() => {
    const write = h.S.chain[0];
    assert.equal(write.table, 'business_invites');
    const ins = write.ops.find((o) => o[0] === 'insert');
    assert.ok(ins, 'it inserts');
    /* Normalised before it goes, so what the duplicate check compared is what was sent. The server
       normalises too (191's `stamp_invite`) and its check constraint proves that ran — this copy
       only predicts, it does not decide. */
    assert.equal(ins[1].email, 'new@b.co', 'lower-cased and trimmed');
    /* ⚠️ `role:'staff'` IS WRITTEN OUT even though the column defaults to it. 191's `role` column
       accepts 'owner' as well, deliberately, so nothing in the database stops an owner-role
       invitation — "staff only" is a promise this UI makes and the server does not enforce. The
       promise belongs at the write, where a reader can see it without opening a migration. */
    assert.equal(ins[1].role, 'staff', 'invitations create staff, and the client is what decides that');
    assert.ok(write.ops.some((o) => o[0] === 'select'),
      'and asks for the row back — a write with no representation cannot be told from a no-op');

    /* ⚠️ NOT "invitation sent". Nothing is sent: 191 writes a row and no email leaves EzPlate at
       any point in this flow. "Sent" promises a delivery that never happens and leaves an owner
       waiting instead of telling the person, which makes the feature silently do nothing. */
    assert.equal(h.S.toasts.length, 1);
    assert.ok(h.S.toasts[0].indexOf('sent') < 0, 'the word "sent" would be a lie');
    assert.match(h.S.toasts[0], /new@b\.co/, 'it names the address');
    assert.equal(h.D.teamEmail.value, '', 'the field is cleared for the next one');
    assert.deepEqual(h.S.sync.slice(-1), ['ok'], 'and the sync pill reports the write');
    /* ⚠️ THE LIST IS RE-READ, or the invitation just sent does not appear and the owner sends it
       again. The second send is not harmless: it is refused by 191's partial unique index with a
       raw 23505, so the feature's most likely first experience would be an error message for doing
       the obvious thing. Observed as a real second read rather than as a call count, so it cannot
       be satisfied by a function that was entered and did nothing. */
    assert.deepEqual(h.S.rpc, ['business_team'], 'the members are re-read');
    assert.deepEqual(h.S.from, ['business_invites', 'business_invites'],
      'the write, then the re-read — the new invitation must show up without a reload');
  });
});

test('submitInvite disables its button for the length of the write', () => {
  /* Two taps on a phone is one tap plus a bounce. The client-side duplicate guards cannot catch it
     — `teamData.invites` is not updated until the re-read lands — so both would reach the network
     and the second comes back as a raw unique violation. The disable is the only thing between a
     fat-fingered tap and an error message for doing nothing wrong.
     Asserted as a SEQUENCE, not an end state: `disabled` is false again afterwards either way, so
     checking only the end proves nothing. */
  const seen = [];
  const h = teamHarness({ teamData: { status: 'ok', members: [], invites: [], err: '' }, rows: [{ id: 'i2' }] });
  Object.defineProperty(h.D.teamAdd, 'disabled', {
    get() { return this._d; }, set(v) { this._d = v; seen.push(v); },
  });
  h.D.teamEmail.value = 'new@b.co';
  return h.api.submitInvite().then(() => {
    assert.deepEqual(seen, [true, false], 'disabled for the round trip, and given back afterwards');
  });
});

test('a failed invite still gives the button back', () => {
  /* The half that is easy to leave out and impossible to notice in testing, because it only
     appears when the network is bad: a button disabled on the way in and re-enabled only on the
     success path is a form that dies on its first error, on the one screen an owner uses twice a
     year. CLAUDE.md 184(a) — a promise has two settle paths. */
  const seen = [];
  const h = teamHarness({
    teamData: { status: 'ok', members: [], invites: [], err: '' },
    writeRes: { data: null, error: { message: 'network' } },
  });
  Object.defineProperty(h.D.teamAdd, 'disabled', {
    get() { return this._d; }, set(v) { this._d = v; seen.push(v); },
  });
  h.D.teamEmail.value = 'new@b.co';
  return h.api.submitInvite().then(() => {
    assert.deepEqual(seen, [true, false], 'the button comes back on the failure path too');
    /* pushWrite has ALREADY toasted, with the server's real words — that is its contract and this
       path relies on it rather than duplicating it. What must not happen is a SECOND toast saying
       it worked, so the assertion is about which message, not about silence. */
    assert.equal(h.S.toasts.length, 1, 'exactly the one pushWrite raised');
    assert.match(h.S.toasts[0], /Couldn.t save the invitation: network/,
      "and it is the failure, in the server's own words");
    assert.equal(h.D.teamEmail.value, 'new@b.co', 'the address is kept so it need not be retyped');
  });
});

test('an invitation the server SILENTLY dropped is reported, not celebrated', () => {
  /* The same 200-with-no-rows as the delete case. Here it would mean a stale role: the card was
     rendered for an owner who has since been demoted, so the insert is refused by RLS. */
  const h = teamHarness({ teamData: { status: 'ok', members: [], invites: [], err: '' }, rows: [] });
  h.D.teamEmail.value = 'new@b.co';
  return h.api.submitInvite().then(() => {
    assert.deepEqual(h.S.toasts, [], 'nothing is celebrated');
    assert.match(h.D.teamErr.textContent, /not saved/);
    assert.equal(h.D.teamEmail.value, 'new@b.co', 'and the address is KEPT, so it need not be retyped');
  });
});

test('revoke ASKS first, deletes by id, and checks a row actually went', () => {
  const data = { status: 'ok', members: [], invites: [{ id: 'i1', email: 'gone@b.co' }], err: '' };
  const h = teamHarness({ teamData: data, rows: [{ id: 'i1' }] });
  h.api.revokeInvite('i1');
  return h.S.confirmed.then(() => {
    assert.equal(h.S.confirms.length, 1, 'revoking is confirmed — it cannot be undone except by re-inviting');
    assert.match(h.S.confirms[0][1], /gone@b\.co/, 'and the question names the address');
    const del = h.S.chain[0];
    assert.equal(del.table, 'business_invites');
    assert.ok(del.ops.some((o) => o[0] === 'delete'));
    /* ⚠️ `.eq('id', …)` IS NOT OPTIONAL. `safeupdate` rejects a WHERE-less DELETE for the client
       role — CLAUDE.md — so a missing filter is not a wide delete, it is a refusal. But the reason
       to assert it is the other one: an id-scoped delete is what makes this revoke ONE invitation. */
    const eq = del.ops.find((o) => o[0] === 'eq');
    assert.deepEqual([eq[1], eq[2]], ['id', 'i1']);
    assert.ok(del.ops.some((o) => o[0] === 'select'), 'representation, for the silent-no-op reason');
    assert.equal(h.S.toasts.length, 1);
    assert.match(h.S.toasts[0], /revoked/);
  });
});

test('declining the confirm does nothing at all', () => {
  const h = teamHarness({
    teamData: { status: 'ok', members: [], invites: [{ id: 'i1', email: 'gone@b.co' }], err: '' },
    confirm: false,
  });
  h.api.revokeInvite('i1');
  assert.equal(h.S.confirmed, undefined, 'the callback never ran');
  return Promise.resolve().then(() => {
    assert.deepEqual(h.S.from, [], 'no delete is issued');
    assert.deepEqual(h.S.toasts, [], 'and nothing is reported');
  });
});

test('a revoke the server silently dropped is reported too', () => {
  const h = teamHarness({
    teamData: { status: 'ok', members: [], invites: [{ id: 'i1', email: 'gone@b.co' }], err: '' },
    rows: [],
  });
  h.api.revokeInvite('i1');
  return h.S.confirmed.then(() => {
    assert.deepEqual(h.S.toasts, [], 'a 200 that changed nothing is not a revoke');
    assert.match(h.D.teamErr.textContent, /not revoked/);
  });
});

test('the team functions are a no-op on a page that has none of their elements', () => {
  /* A cached index.html from before this batch has no #teamList. renderTeam must degrade rather
     than throw — it is called from applyRoleUi, which runs inside bootstrapSync's try, so a throw
     would land on "couldn't load your data" for a database that answered perfectly. Exactly 188's
     reasoning, one card along. */
  const h = teamHarness({ omit: ['teamList', 'teamErr', 'teamEmail', 'teamAdd'] });
  h.api.setData({ status: 'ok', members: [{ email: 'a@b.co' }], invites: [], err: '' });
  assert.doesNotThrow(() => h.api.renderTeam());
  return h.api.submitInvite().then((r) => {
    assert.equal(r, undefined);
    assert.deepEqual(h.S.from, [], 'with no field there is nothing to submit');
  });
});

/* ---------------------------------------------------------------------------------------------
   4. THE GATE'S TWO FORMS
   --------------------------------------------------------------------------------------------- */

function gateHarness() {
  const D = {};
  ['bgSignForm', 'bgSignUpForm', 'bootGateMsg', 'bgDone', 'bgAltIn', 'bgAltUp', 'bgEmail', 'bgUpEmail', 'bgErr']
    .forEach((id) => { D[id] = mkNode(id); });
  D.bgSignUpForm.hidden = true; D.bgAltUp.hidden = true; D.bgDone.hidden = true;
  const S = { focused: [] };
  ['bgEmail', 'bgUpEmail'].forEach((id) => { D[id].focus = () => S.focused.push(id); });
  // eslint-disable-next-line no-new-func
  const api = new Function('D', 'S', `
    "use strict";
    var document = { getElementById: function(id){ return D[id] || null; } };
    ${extractFn(SRC, 'gateErr')}
    var SIGNIN_MSG='Sign in to see your caf\\u00e9\\u2019s products, plates and menus.';
    var SIGNUP_MSG='Been invited to a caf\\u00e9? Create your account with the email address the owner invited.';
    ${extractFn(SRC, 'gateMode')}
    return { gateMode: gateMode };
  `)(D, S);
  return { api, D, S };
}

test('gateMode swaps the whole screen, never leaving both forms or both links up', () => {
  const { api, D, S } = gateHarness();
  api.gateMode(true);
  assert.equal(D.bgSignForm.hidden, true); assert.equal(D.bgSignUpForm.hidden, false);
  /* ⚠️ BOTH LINKS, and this is the assertion that would catch the obvious half-fix. Each side
     offers the way back to the other; two "already have an account?" links on one screen, or none
     at all, both strand somebody on the wrong form with no way out. */
  assert.equal(D.bgAltIn.hidden, true); assert.equal(D.bgAltUp.hidden, false);
  assert.match(D.bootGateMsg.textContent, /invited/i, 'and the message explains the form underneath it');
  assert.deepEqual(S.focused, ['bgUpEmail'], 'the caret lands in the first field of the form now showing');

  api.gateMode(false);
  assert.equal(D.bgSignForm.hidden, false); assert.equal(D.bgSignUpForm.hidden, true);
  assert.equal(D.bgAltIn.hidden, false); assert.equal(D.bgAltUp.hidden, true);
  assert.match(D.bootGateMsg.textContent, /Sign in to see/);
  assert.deepEqual(S.focused, ['bgUpEmail', 'bgEmail']);
});

test('switching forms clears the error and the confirmation line', () => {
  /* Carrying "Invalid login credentials" across to the sign-up form blames the wrong thing, and
     leaving "check your email" above a sign-in form reads as though it applies to it. */
  const { api, D } = gateHarness();
  D.bgErr.textContent = 'Invalid login credentials'; D.bgErr.hidden = false;
  D.bgDone.textContent = 'Account created.'; D.bgDone.hidden = false;
  api.gateMode(true);
  assert.equal(D.bgErr.textContent, ''); assert.equal(D.bgErr.hidden, true);
  assert.equal(D.bgDone.textContent, ''); assert.equal(D.bgDone.hidden, true);
});

test('a re-sync must NOT repaint the sign-up side out from under someone', () => {
  /* ⚠️ THE DEFECT THIS FORBIDS, and it is 186's rule extended rather than a new one. `bootReady
     ('signin')` runs again on every re-sync that gets that far — an `online` blip, a
     pull-to-refresh — and both the sign-up form and the "check your email" line are reached from
     that state. Without the guard a blip swaps a half-typed sign-up back to the sign-in form and
     overwrites the one sentence telling somebody a confirmation email is waiting. */
  const src = jsCode(SRC);
  const branch = src.slice(src.indexOf("if(state==='signin')"), src.indexOf("if(_bootSlowTimer){ clearTimeout(_bootSlowTimer); _bootSlowTimer=null; }   //"));
  assert.match(branch, /if\(\(su && !su\.hidden\) \|\| \(dn && !dn\.hidden\)\) return;/,
    'the signin state has nothing to say while the sign-up side is up');
  /* And it must return BEFORE the message is rewritten, or the guard is decoration. */
  assert.ok(branch.indexOf('!su.hidden') < branch.indexOf('m.textContent=msg||SIGNIN_MSG'),
    'before the copy is overwritten, not after');

  /* Every other gate state hides BOTH forms. A stale sign-up sitting over an error screen is the
     thing `hideForms` exists to make impossible — one place, so the next state added cannot forget
     the second form the way this batch nearly did. */
  const gate = src.slice(src.indexOf('function bootGate'), src.indexOf('function bootReady'));
  assert.equal((gate.match(/hideForms\(\)/g) || []).length, 4,
    'loading, ok, nomember and error all hide both forms');
  /* ⚠️ THE DEFINITION IS CUT OUT BEFORE THE SEARCH, and getting that wrong is why this assertion
     first went red against correct code: `hideForms` itself of course contains `if(f) f.hidden
     =true`, and a one-line `.replace` missed it because the helper spans four lines. An assertion
     that matches its own subject proves nothing either way — CLAUDE.md 183(a), in the other
     direction. */
  const defAt = gate.indexOf('var hideForms');
  const bodies = gate.slice(0, defAt) + gate.slice(gate.indexOf('};', defAt) + 2);
  assert.ok(!/if\(f\) f\.hidden=true/.test(bodies),
    'no branch hides the sign-in form on its own any more — that is what left the other one up');
});

/* ---------------------------------------------------------------------------------------------
   5. THE MARKUP
   --------------------------------------------------------------------------------------------- */

test('the sign-up form asks a password manager for a NEW password, not a saved one', () => {
  /* ⚠️ THIS IS WHY IT IS A SECOND FORM RATHER THAN A MODE OF THE FIRST. `current-password` tells a
     manager to OFFER a saved password and `new-password` tells it to GENERATE one, and managers do
     not re-read that attribute if it is swapped at runtime. The person reading this screen is
     creating their first password, on a phone, and it is the only screen they will ever see here. */
  const up = HTML.slice(HTML.indexOf('id="bgSignUpForm"'), HTML.indexOf('id="bgAltUp"'));
  assert.match(up, /id="bgUpPass"[^>]*autocomplete="new-password"/);
  const inForm = HTML.slice(HTML.indexOf('id="bgSignForm"'), HTML.indexOf('id="bgAltIn"'));
  assert.match(inForm, /id="bgPass"[^>]*autocomplete="current-password"/, 'and the sign-in form still asks for the saved one');
  /* Both start hidden, or a signed-out visitor sees two forms before any JS runs. */
  assert.match(HTML, /id="bgSignUpForm" hidden/);
  assert.match(HTML, /id="bgAltUp" hidden/);
  assert.match(HTML, /id="bgDone" hidden/);
});

test('the confirmation line is a status, not an alert', () => {
  /* It is the GOOD outcome. `role="alert"` interrupts a screen reader mid-sentence, which is right
     for "that password was wrong" and wrong for "your account was created". */
  const done = HTML.slice(HTML.indexOf('id="bgDone"'), HTML.indexOf('id="bgDone"') + 90);
  assert.match(done, /role="status"/);
  assert.match(HTML.slice(HTML.indexOf('id="bgErr"'), HTML.indexOf('id="bgErr"') + 90), /role="alert"/,
    'while the error still interrupts, because it must');
});
