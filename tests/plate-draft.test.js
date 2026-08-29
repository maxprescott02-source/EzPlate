/*
 * plate-draft.test.js — v82 D1. The in-progress plate must survive a reload (offline-first).
 *
 * Building a plate then reloading used to lose everything — no draft, no warning. The builder now
 * persists to ONE localStorage slot (cafeDB_plateDraft), restored on the next open. This locks the
 * data contract: what gets stored, that an empty builder stores NO stale draft, and that a draft
 * referencing a since-deleted ingredient still round-trips (the render layer degrades it to
 * "product missing" — that's renderPlate's job, covered by the app's existing orphan-line handling).
 */
const test = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();
/* v118: savePlateDraft now asks isBuilderDirty() before writing anything, so the sandbox has to
   carry the real dirt check and what it reads - savedPlates, lineSig, currentLinesSig. All are
   extracted from app.js rather than restated here, so a change to the real comparison shows up as a
   failure in these tests instead of passing against a private copy of the logic. */
function makeDraft({ plate = [], name = '', cat = '', loadedPlateId = null, savedPlates = [] } = {}) {
  // eslint-disable-next-line no-new-func
  const factory = new Function('PLATE', 'NAME', 'CAT', 'LID', 'SAVED', `
    "use strict";
    var DRAFTKEY='cafeDB_plateDraft';
    var store={};
    var localStorage={ getItem:function(k){return (k in store)?store[k]:null;},
                       setItem:function(k,v){store[k]=String(v);}, removeItem:function(k){delete store[k];} };
    var plate=PLATE, loadedPlateId=LID, _name=NAME, _cat=CAT, _draftT=null, savedPlates=SAVED;
    var document={ getElementById:function(id){
      if(id==='plateName') return {value:_name};
      if(id==='plateCat')  return {value:_cat};
      return null;
    }};
    ${extractFn(SRC, 'lineSig')}
    ${extractFn(SRC, 'currentLinesSig')}
    ${extractFn(SRC, 'isBuilderDirty')}
    ${extractFn(SRC, 'draftHasContent')}
    ${extractFn(SRC, 'draftBaseChanged')}
    ${extractFn(SRC, 'readPlateDraft')}
    ${extractFn(SRC, 'savePlateDraft')}
    ${extractFn(SRC, 'clearPlateDraft')}
    return {
      draftHasContent: draftHasContent,
      draftBaseChanged: draftBaseChanged,
      isBuilderDirty: isBuilderDirty,
      lineSig: lineSig,
      savePlateDraft: savePlateDraft,
      clearPlateDraft: clearPlateDraft,
      read: function(){ var v=store[DRAFTKEY]; return v?JSON.parse(v):null; },
      // bootstrapSync reassigns savedPlates under an open builder; these let a test model that
      // and a move to another plate, which is where the review found the baseline re-anchoring.
      resync: function(next){ savedPlates=next; },
      setLoaded: function(id){ loadedPlateId=id; }
    };
  `);
  return factory(plate, name, cat, loadedPlateId, savedPlates);
}

test('draftHasContent: lines OR a name make it worth resuming; nothing does not', () => {
  const d = makeDraft();
  assert.equal(d.draftHasContent(null), false);
  assert.equal(d.draftHasContent({ lines: [], name: '' }), false);
  assert.equal(d.draftHasContent({ lines: [], name: '   ' }), false, 'whitespace name is not content');
  assert.equal(d.draftHasContent({ lines: [{ kid: 'K1', qty: 100 }], name: '' }), true);
  assert.equal(d.draftHasContent({ lines: [], name: 'Big Breakfast' }), true);
});

test('a plate in progress persists its lines, name, category and loadedPlateId', () => {
  const d = makeDraft({ plate: [{ kid: 'K1', qty: 100 }, { misc: true, label: 'Box', cost: 0.4 }],
    name: 'Big Breakfast', cat: 'Mains', loadedPlateId: 'SP7' });
  d.savePlateDraft();
  const saved = d.read();
  assert.ok(saved, 'a draft was written');
  assert.equal(saved.name, 'Big Breakfast');
  assert.equal(saved.cat, 'Mains');
  assert.equal(saved.loadedPlateId, 'SP7');
  assert.equal(saved.lines.length, 2, 'ingredient + misc line both stored');
  assert.equal(saved.lines[0].kid, 'K1');
  assert.equal(saved.lines[0].qty, 100);
});

test('an empty builder writes NO stale draft (and clears any prior one)', () => {
  const d = makeDraft({ plate: [], name: '' });
  d.savePlateDraft();
  assert.equal(d.read(), null, 'nothing worth resuming ⇒ no draft slot');
});

test('clearPlateDraft removes the slot (save on a real plate, then clear)', () => {
  const d = makeDraft({ plate: [{ kid: 'K1', qty: 50 }], name: 'X' });
  d.savePlateDraft();
  assert.ok(d.read(), 'stored');
  d.clearPlateDraft();
  assert.equal(d.read(), null, 'cleared');
});

test('a draft referencing a since-deleted ingredient still round-trips (graceful degrade is the render layer)', () => {
  const d = makeDraft({ plate: [{ kid: 'K_GONE', qty: 100 }], name: 'Ghost plate' });
  d.savePlateDraft();
  const saved = d.read();
  assert.equal(saved.lines[0].kid, 'K_GONE', 'the orphaned line survives serialization — restore never crashes on it');
  assert.equal(saved.name, 'Ghost plate');
});

/* ---------------------------------------------------------------------------
 * v118 (found in v115 flow-testing): opening the builder to LOOK at a plate and
 * closing it with × planted a draft, which resurfaced as "Unfinished plate —
 * resume or discard?" on the next entry, possibly a week later.
 *
 * The truth table. What should a draft be written for?
 *
 *   loaded plate?  on-screen == saved?  draft?   why
 *   -------------  -------------------  ------   ------------------------------
 *   yes            yes                  NO       a visit, not work        <- the bug
 *   yes            no                   YES      real unsaved edits
 *   no (new)       n/a, has lines       YES      real unsaved work
 *   no (new)       n/a, empty           NO       nothing worth resuming
 *
 * draftHasContent answers only the last row, so rows 1 and 2 were indistinguishable
 * and row 1 got a draft it had not earned. isBuilderDirty() is the missing question.
 * ------------------------------------------------------------------------- */
/* Realistic ids: nextKid() makes 'K0001'-style kids, and lineSig prefixes another 'K' to mark a
   kitchen line apart from a product line - so a real signature reads 'KK0001:100'. The tests build
   expected baselines with the app's own lineSig rather than hardcoding that, because the format is
   an opaque comparison key and pinning its spelling would be pinning the wrong thing. */
const SP = (over = {}) => Object.assign(
  { id: 'SP7', name: 'Big Breakfast', lines: [{ kid: 'K0001', qty: 100 }] }, over,
);
const sigOf = (d, lines) => lines.map(d.lineSig).join('|');

test('v118: LOOKING at a saved plate writes no draft — the bug this fixes', () => {
  // builder opened on SP7 and nothing touched: on-screen state === saved state
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 100 }], name: 'Big Breakfast',
    loadedPlateId: 'SP7', savedPlates: [SP()] });
  assert.equal(d.isBuilderDirty(), false, 'an untouched load is not dirty');
  d.savePlateDraft();
  assert.equal(d.read(), null, 'a look-only visit must leave NOTHING behind to prompt about later');
});

test('v118: editing a loaded plate STILL drafts — the fix must not disable the feature', () => {
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 250 }], name: 'Big Breakfast',   // qty moved 100 -> 250
    loadedPlateId: 'SP7', savedPlates: [SP()] });
  assert.equal(d.isBuilderDirty(), true);
  const saved = (d.savePlateDraft(), d.read());
  assert.ok(saved, 'real unsaved edits are still protected');
  assert.equal(saved.lines[0].qty, 250);
});

test('v118: renaming a loaded plate counts as work worth drafting', () => {
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 100 }], name: 'Brunch',
    loadedPlateId: 'SP7', savedPlates: [SP()] });
  d.savePlateDraft();
  assert.ok(d.read(), 'the name is part of the plate, so changing it is a change');
});

test('v118: a brand-new plate with lines drafts as it always did', () => {
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 50 }], name: 'New thing' });
  d.savePlateDraft();
  assert.ok(d.read(), 'nothing to be clean against — unsaved work by definition');
});

/* The second half of the item: a draft that DOES exist cannot silently overwrite newer state. */
test('v118: a draft records the baseline it was taken against, not what is on screen', () => {
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 250 }], name: 'Big Breakfast',
    loadedPlateId: 'SP7', savedPlates: [SP()] });
  d.savePlateDraft();
  const saved = d.read();
  assert.equal(saved.baseSig, sigOf(d, [{ kid: 'K0001', qty: 100 }]), 'the SAVED plate at draft time');
  assert.notEqual(saved.baseSig, sigOf(d, [{ kid: 'K0001', qty: 250 }]),
    'if the baseline tracked the on-screen edit it could never detect a change');
  assert.equal(saved.baseName, 'Big Breakfast');
});

test('v118: draftBaseChanged is TRUE when the plate moved under the draft', () => {
  const d = makeDraft({ savedPlates: [SP({ lines: [{ kid: 'K0001', qty: 999 }] })] });
  const base = sigOf(d, [{ kid: 'K0001', qty: 100 }]);
  assert.equal(d.draftBaseChanged({ loadedPlateId: 'SP7', baseSig: base, baseName: 'Big Breakfast' }), true);
});

test('v118: draftBaseChanged catches a RENAME elsewhere, not just relines', () => {
  const d = makeDraft({ savedPlates: [SP({ name: 'Renamed' })] });
  const base = sigOf(d, [{ kid: 'K0001', qty: 100 }]);
  assert.equal(d.draftBaseChanged({ loadedPlateId: 'SP7', baseSig: base, baseName: 'Big Breakfast' }), true);
});

test('v118: draftBaseChanged is FALSE when nothing moved — cannot-tell must not nag', () => {
  const d = makeDraft({ savedPlates: [SP()] });
  const base = sigOf(d, [{ kid: 'K0001', qty: 100 }]);
  assert.equal(d.draftBaseChanged({ loadedPlateId: 'SP7', baseSig: base, baseName: 'Big Breakfast' }), false,
    'unchanged plate');
  assert.equal(d.draftBaseChanged({ loadedPlateId: 'SP7', baseName: 'Big Breakfast' }), false,
    'a pre-v118 draft carries no baseSig — unknowable, so it must resume silently as before');
  assert.equal(d.draftBaseChanged({ loadedPlateId: 'GONE', baseSig: base }), false,
    'the plate was deleted — nothing to overwrite');
  assert.equal(d.draftBaseChanged({ baseSig: base }), false, 'a new plate has no baseline');
  assert.equal(d.draftBaseChanged(null), false);
});

/* ---------------------------------------------------------------------------
 * v118, from the pre-push review. Three ways the first cut of this fix was wrong.
 * ------------------------------------------------------------------------- */

test('v118 review 1: a category-only edit is dirt — gating on a check blind to it was silent loss', () => {
  // the plateCat input has scheduled draft saves since v82, so this IS unsaved work. Before the
  // gate existed, draftHasContent kept it. A dirt check without category would drop it on x with
  // no draft AND no "Unfinished plate" prompt — worse than the bug v118 set out to fix.
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 100 }], name: 'Big Breakfast',
    cat: 'Specials', loadedPlateId: 'SP7', savedPlates: [SP({ category: 'Mains' })] });
  assert.equal(d.isBuilderDirty(), true, 'changing only the category is still a change');
  d.savePlateDraft();
  const saved = d.read();
  assert.ok(saved, 'the category edit must survive x');
  assert.equal(saved.cat, 'Specials');
});

test('v118 review 1b: matching category is still not dirty — the look-only fix survives', () => {
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 100 }], name: 'Big Breakfast',
    cat: 'Mains', loadedPlateId: 'SP7', savedPlates: [SP({ category: 'Mains' })] });
  assert.equal(d.isBuilderDirty(), false);
  d.savePlateDraft();
  assert.equal(d.read(), null);
});

test('v118 review 2: the baseline is captured ONCE, not re-anchored on every save', () => {
  // savedPlates is reassigned under an open builder whenever bootstrapSync reruns (online listener,
  // pull-to-refresh). Recomputing the baseline would adopt the newer server state as "what I started
  // from", the later comparison would match, and the stale draft would overwrite it in silence.
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 250 }], name: 'Big Breakfast',
    loadedPlateId: 'SP7', savedPlates: [SP()] });
  d.savePlateDraft();
  const first = d.read().baseSig;

  d.resync([SP({ lines: [{ kid: 'K0001', qty: 900 }], name: 'Renamed elsewhere' })]);   // the mid-draft resync
  d.savePlateDraft();                                                                   // next keystroke
  assert.equal(d.read().baseSig, first, 'the baseline must still be the state drafting STARTED from');
  assert.equal(d.read().baseName, 'Big Breakfast');
  assert.equal(d.draftBaseChanged(d.read()), true,
    'and the guard must therefore still fire — this is the case it exists for');
});

test('v118 review 2b: a baseline is only carried for the SAME plate', () => {
  const d = makeDraft({ plate: [{ kid: 'K0001', qty: 250 }], name: 'Big Breakfast',
    loadedPlateId: 'SP7', savedPlates: [SP(), SP({ id: 'SP8', name: 'Other', lines: [{ kid: 'K0009', qty: 5 }] })] });
  d.savePlateDraft();
  d.setLoaded('SP8');                       // builder moved to a different plate
  d.savePlateDraft();
  assert.equal(d.read().baseSig, sigOf(d, [{ kid: 'K0009', qty: 5 }]),
    'a different plate gets its own baseline, not the previous one carried over');
});

test('v118 review 3: the boot resume waits for the plates before it asks', () => {
  // offerPlateDraftResume runs as the last statement in app.js, necessarily BEFORE bootstrapSync's
  // await resolves — so savedPlates is [] there, guaranteed. The confirm modal outranks the boot
  // gate in z-index, so Resume is tappable while the gate is still up, and draftBaseChanged would
  // read "not loaded yet" as "deleted, nothing to overwrite" and skip the warning on the one path
  // this feature is really for: a week-old draft resuming at boot.
  const fn = extractFn(SRC, 'offerPlateDraftResume');
  assert.match(fn, /if\(!window\.__ezReady && _draftOfferWaits\+\+ < 50\)\{ setTimeout\(offerPlateDraftResume, 200\); return; \}/,
    'it defers until boot has CONCLUDED');
  // ⚠️ __ezReady, not _bootGateDone. _bootGateDone flips only on success, so keying off it made a
  // failed boot (no client, offline) wait the full timeout before asking — the state where the user
  // most wants the draft back. bootReady sets __ezReady on both outcomes, after savedPlates on the
  // ok path. The jsdom smoke test caught this and it is the reason the flag changed.
  const cond = fn.split('\n').find((l) => l.includes('_draftOfferWaits++'));
  assert.ok(!/_bootGateDone/.test(cond), 'must NOT key off the success-only flag');   // the CONDITION, not the comment explaining it
  assert.match(extractFn(SRC, 'bootReady'), /window\.__ezReady=true/, 'the flag it waits on is real');
  // bounded: a boot that never concludes must still eventually offer, not swallow the draft
  assert.match(fn, /< 50/, 'the wait is capped (~10s)');
  // and the call itself must stay last — the v83 __confirmFn ordering depends on it
  const tail = SRC.trimEnd().split('\n').slice(-1)[0];
  assert.match(tail, /offerPlateDraftResume\(\);/, 'still the last statement in app.js');
});

test('v118: resume ASKS before replacing newer lines, and both boot and guard go through it', () => {
  const r = extractFn(SRC, 'resumePlateDraft');
  assert.match(r, /if\(draftBaseChanged\(d\)\)\{/, 'the check gates the resume');
  assert.match(r, /'Resume anyway', function\(\)\{ applyPlateDraft\(d\); \}, 'Discard draft', clearPlateDraft/,
    'the user chooses; a stray dismiss does neither (v82 rule)');
  assert.match(r, /applyPlateDraft\(d\);\s*\}$/m, 'the unchanged case still applies straight through');
  // both entry points must inherit the guard rather than calling the applier directly
  assert.match(extractFn(SRC, 'offerPlateDraftResume'), /resumePlateDraft\(d\)/, 'boot offer');
  assert.match(extractFn(SRC, 'resumeUnfinishedPlate'), /resumePlateDraft\(d\)/, 'entry guard');
  assert.ok(!/applyPlateDraft\(/.test(extractFn(SRC, 'offerPlateDraftResume')), 'boot must not bypass the check');
  assert.ok(!/applyPlateDraft\(/.test(extractFn(SRC, 'resumeUnfinishedPlate')), 'the guard must not bypass it either');
});

/* ---------------------------------------------------------------------------
 * v83: "resuming a plate doesn't work" (Max, reported after v82 shipped the draft).
 * REPRODUCED in jsdom, TWO independent causes — both invisible to the pure tests
 * above, because both are load-order/wiring bugs rather than data bugs:
 *
 *   1. offerPlateDraftResume() ran mid-file, so askConfirm stored its callbacks in
 *      __confirmFn/__confirmCancelFn — and then `var __confirmFn=null,
 *      __confirmCancelFn=null;`, ~2300 lines further down, executed later in the
 *      SAME top-level pass and nulled them. Tapping Resume closed the dialog and
 *      did nothing. Fix: the call is now the last statement in app.js.
 *   2. The boot pass renders an EMPTY builder, which scheduled a draft save that
 *      fired ~250ms later, found nothing worth keeping and REMOVED the stored
 *      draft — while the user was still reading the dialog. So a second reload
 *      offered nothing at all. Fix: draft saves stay disarmed until openBuilder.
 *
 * These pin the ORDER and the GATE at the source, which is where the bugs lived.
 * ------------------------------------------------------------------------- */
test('v83 regression 1: the load-time resume offer runs AFTER the confirm-callback initialiser', () => {
  const initialiser = SRC.indexOf('var __confirmFn=null');
  assert.ok(initialiser > 0, 'the confirm-callback module vars still exist');
  const calls = [...SRC.matchAll(/^offerPlateDraftResume\(\);/gm)].map(m => m.index);
  assert.strictEqual(calls.length, 1, 'exactly one load-time call to offerPlateDraftResume');
  assert.ok(calls[0] > initialiser,
    'offerPlateDraftResume() must run after `var __confirmFn=null` executes, or the Resume callback is nulled before the user can tap it');
});

test('v83 regression 1b: nothing re-initialises the confirm callbacks after that call', () => {
  const call = SRC.indexOf('\nofferPlateDraftResume();');
  assert.ok(!/var __confirmFn\s*=/.test(SRC.slice(call)),
    'a later `var __confirmFn=…` would resurrect the exact bug — keep the offer last');
});

test('v83 regression 2: draft saves are disarmed until the builder is actually open', () => {
  const sched = extractFn(SRC, 'scheduleDraftSave');
  assert.match(sched, /if\(!_draftArmed\) return;/,
    'a boot-time render must not be able to schedule a save that wipes the stored draft');
  const open = extractFn(SRC, 'openBuilder');
  assert.match(open, /armDraftSaves\(\)/,
    'opening the builder is what arms draft saves — that is the only time a draft should be written');
  assert.match(extractFn(SRC, 'armDraftSaves'), /_draftArmed=true/);
});

test('v83 regression 2b: only clearPlateDraft removes the slot on an explicit user decision', () => {
  // save/Clear/Discard clear it deliberately; nothing else may.
  const removals = [...SRC.matchAll(/removeItem\(DRAFTKEY\)/g)].length;
  assert.strictEqual(removals, 2,
    'exactly two removal sites: savePlateDraft (empty builder, now only reachable while armed) and clearPlateDraft');
});

/* ---------------------------------------------------------------------------
 * v85 (Max, reviewing the flows): pressing × then re-entering the builder via
 * "+ New plate" (or "Edit plate" on a card) silently binned the unfinished plate
 * AND its stored draft — the empty render removed the slot, so even reloading
 * couldn't recover it. The app already guarded its OTHER two builder entries
 * (requestLoadPlate / requestLoadMenuItem) with isBuilderDirty; these two never
 * got it. Both now route through guardUnfinishedPlate.
 * ------------------------------------------------------------------------- */
test('v85: "+ New plate" is guarded — it can never wipe unfinished work silently', () => {
  const fn = extractFn(SRC, 'openBuilderNew');
  assert.match(fn, /guardUnfinishedPlate\(startNewPlate\)/,
    '+ New plate must ask before replacing an in-progress plate');
  assert.ok(!/plate=\[\]/.test(fn), 'the wipe itself moved into startNewPlate, behind the guard');
});

test('v85: "Edit plate" from a card is guarded by the same path', () => {
  assert.match(extractFn(SRC, 'editPlateFromCard'), /guardUnfinishedPlate\(/,
    'loading another plate over unfinished work must ask first');
});

test('v85: the guard offers Resume/Discard and only the explicit Discard clears', () => {
  const g = extractFn(SRC, 'guardUnfinishedPlate');
  assert.match(g, /if\(!unfinishedPlateWaiting\(\)\)\{ proceed\(\); return; \}/,
    'a clean builder proceeds straight through — no nagging');
  assert.match(g, /'Resume', resumeUnfinishedPlate, 'Discard'/, 'both choices are offered');
  assert.match(g, /clearPlateDraft\(\); proceed\(\);/, 'only the Discard callback clears the draft');
  // a stray × / backdrop dismiss runs neither callback (v82 rule) -> nothing is lost
});

test('v85: the guard fires for this session OR a draft whose boot offer was dismissed', () => {
  /* ⚠️ 221 ADDED A THIRD TERM AND THIS ASSERTION IS DELIBERATELY REWRITTEN RATHER THAN LOOSENED.
     `_platePushPending` suppresses the STORED-DRAFT half while a plate write is in flight, because
     since 221 the draft is kept alive across the round trip and is then the safety copy of a save in
     progress rather than abandoned work. Without it, Save followed by "+ New plate" — the most
     natural pair of actions on this screen — asks "resume or discard?" about the plate being saved,
     and Discard deletes the only local copy. Found by 221's pre-push review.
     The IN-MEMORY half is deliberately NOT suppressed: a dirty builder is unfinished work whatever
     the network is doing. Both halves are asserted, so relaxing either one is visible here.
     ⚠️ This is a SOURCE match and therefore weak on its own (CLAUDE.md roster 167/195): what proves
     the behaviour is `tests/plate-draft-save.test.js`, which runs the guard against a real in-flight
     save on both the success and failure paths. */
  const fn = extractFn(SRC, 'unfinishedPlateWaiting');
  assert.match(fn, /isBuilderDirty\(\) \|\|/,
    'in-memory dirt still counts as work worth protecting, whatever the network is doing');
  assert.match(fn, /!_platePushPending && draftHasContent\(readPlateDraft\(\)\)/,
    'a stored draft counts too — unless it is the safety copy of a write still in flight');
});

test('v85: resume prefers the still-loaded session state over re-reading storage', () => {
  const r = extractFn(SRC, 'resumeUnfinishedPlate');
  assert.match(r, /if\(isBuilderDirty\(\)\)\{ openBuilder\(\); return; \}/,
    '× only hid the popup — the work is still in memory, so just reopen it');
  assert.match(r, /resumePlateDraft\(d\)/, 'otherwise fall back to the stored draft');
});
