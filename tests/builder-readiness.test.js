/*
 * builder-readiness.test.js — 271 (queue item 51).
 *
 * Four claims the builder page now makes, each pinned against the REAL shipped function rather than
 * a copy of it (`_extractfn`'s loadApp + extractFn — a stub written from the same belief as the code
 * passes against the defect it was written to catch):
 *
 *  1. Save is refused BEFORE it is pressed, and the refusal SAYS WHY. The disabling is the easy half
 *     and the dangerous one on its own: it replaces a toast that named what was missing with a grey
 *     button. Every test here that asserts `disabled` also asserts the sentence.
 *  2. Print is dead on an empty docket and Clear is not. Clear also drops the NAME and the loaded
 *     plate, so "the docket is empty" is not the same question for it — a typed name with no lines
 *     is still work to discard, and disabling Clear there strands the user with it.
 *  3. #editTag says saved-or-new and never the plate's name. The name is on the page twice already.
 *  4. The same ingredient cannot be added twice, and is REFUSED rather than merged — merging would
 *     add a defaultQty the user never typed to a quantity they did.
 *
 * The census at the end is the guard the F7 batch's own review asked for, one control class wider:
 * these four buttons have ONE owner, because two `disabled=` assignments per call site is exactly
 * how the Clear-plate gap happened with `hidden`.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadApp, extractFn } = require('./_extractfn');

const SRC = loadApp();

/* ------------------------------------------------------------------ 1 + 2. the readiness rule */

/* The REAL syncBuilderPlateActions, over a fake document that records what it wrote. Every control
   it touches is present, so a missing element cannot be mistaken for a control left alone. */
function readiness(opts) {
  const els = {};
  const mk = () => ({ hidden: false, disabled: false, title: '', textContent: '', value: '',
    removeAttribute(a) { if (a === 'title') this.title = ''; } });
  ['bldDuplicate', 'bldDelete', 'saveBtn', 'bldSaveBar', 'printBtn', 'clearBtn', 'saveHint', 'plateName']
    .forEach((id) => { els[id] = mk(); });
  els.plateName.value = opts.name || '';
  // eslint-disable-next-line no-new-func
  const factory = new Function('E', 'OPT', `
    "use strict";
    var document={getElementById:function(id){ return E[id] || null; }};
    var plate=OPT.lines||[], loadedPlateId=OPT.loadedPlateId||null;
    ${extractFn(SRC, 'builderSaveBlocker')}
    ${extractFn(SRC, 'builderPlateName')}
    ${extractFn(SRC, 'syncBuilderPlateActions')}
    return syncBuilderPlateActions;
  `);
  factory(els, opts)();
  return els;
}

const ONE_LINE = [{ uid: 1, kid: 'K1', qty: 100 }];

test('271: a brand-new plate — no name, no lines — cannot be saved, and says which', () => {
  const e = readiness({});
  assert.strictEqual(e.saveBtn.disabled, true, 'the rail Save must be disabled');
  assert.strictEqual(e.bldSaveBar.disabled, true, "the phone's Save must be disabled too — one rule, two controls");
  assert.strictEqual(e.saveHint.hidden, false, 'a disabled primary with no reason beside it is the trap this fixes');
  assert.match(e.saveHint.textContent, /ingredient/i, 'the sentence names the missing thing, not "invalid"');
  assert.strictEqual(e.saveBtn.title, e.saveHint.textContent, 'the hover reason and the printed reason are the same string');
});

test('271: lines but no name — Save still refused, and the reason CHANGES to the name', () => {
  const e = readiness({ lines: ONE_LINE });
  assert.strictEqual(e.saveBtn.disabled, true);
  assert.match(e.saveHint.textContent, /[Nn]ame/, 'the second condition has to say the second thing');
  assert.ok(!/ingredient/i.test(e.saveHint.textContent),
    'the empty-docket sentence must not survive into a state where the docket is not empty');
});

test('271: a named plate with a line is saveable — nothing is disabled and no reason is printed', () => {
  const e = readiness({ lines: ONE_LINE, name: 'Fish & chips' });
  assert.strictEqual(e.saveBtn.disabled, false);
  assert.strictEqual(e.bldSaveBar.disabled, false);
  assert.strictEqual(e.saveHint.hidden, true, 'the hint hides when there is nothing to explain');
  assert.strictEqual(e.saveHint.textContent, '', 'and empties, so a stale reason cannot flash on the next render');
  assert.strictEqual(e.saveBtn.title, '', 'the title is REMOVED, not left over a live button');
});

test('271: a whitespace-only name is not a name', () => {
  const e = readiness({ lines: ONE_LINE, name: '   ' });
  assert.strictEqual(e.saveBtn.disabled, true,
    'saveCurrentPlate trims before it refuses, so the button must trim before it enables');
});

test('271: Print is disabled on an empty docket and live as soon as there is a line', () => {
  assert.strictEqual(readiness({}).printBtn.disabled, true,
    'printing an empty docket produces "Untitled plate · 0 ingredients" on paper');
  assert.strictEqual(readiness({ lines: ONE_LINE }).printBtn.disabled, false,
    'an unnamed plate is still a docket worth printing — Print does not wait for the name');
});

test('271: Clear is disabled only when there is NOTHING to clear', () => {
  assert.strictEqual(readiness({}).clearBtn.disabled, true, 'a fresh builder has nothing to discard');
  assert.strictEqual(readiness({ name: 'Chips' }).clearBtn.disabled, false,
    'a typed name with no lines is still work — this is the case that would strand the user');
  assert.strictEqual(readiness({ lines: ONE_LINE }).clearBtn.disabled, false);
  assert.strictEqual(readiness({ loadedPlateId: 'SP1' }).clearBtn.disabled, false,
    'a loaded plate is cleared by this button even when the docket has been emptied line by line');
});

test('271: the blocker is a pure function of the two conditions, in that order', () => {
  // eslint-disable-next-line no-new-func
  const blk = new Function(`"use strict"; ${extractFn(SRC, 'builderSaveBlocker')} return builderSaveBlocker;`)();
  assert.notStrictEqual(blk(false, false), '', 'neither condition met');
  assert.strictEqual(blk(false, true), blk(false, false),
    'no lines wins over the name — telling someone to name an empty plate is the wrong next step');
  assert.notStrictEqual(blk(true, false), '');
  assert.strictEqual(blk(true, true), '', 'both met is the only empty answer');
});

/* --------------------------------------------- 1b. the reason is also the route, on the phone */

function blockerFocus(lines, name) {
  const S = { focused: null, selected: false };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', 'LINES', 'NAME', `
    "use strict";
    var plate=LINES;
    var els={ plateName:{value:NAME, focus:function(){ S.focused='plateName'; }, select:function(){ S.selected=true; }},
              q:{value:'', focus:function(){ S.focused='q'; }} };
    var document={getElementById:function(id){ return els[id]||null; }};
    ${extractFn(SRC, 'focusBuilderBlocker')}
    return focusBuilderBlocker;
  `);
  factory(S, lines, name)();
  return S;
}

test('271: the blocker line sends the cursor to whichever thing is MISSING', () => {
  assert.strictEqual(blockerFocus([], '').focused, 'q',
    'no lines: the ingredient search, not the name field');
  assert.strictEqual(blockerFocus(ONE_LINE, '').focused, 'plateName',
    'lines but no name: the name field — the case v150-builder-order measures at 380, where that ' +
    'field is off the top of the screen while the bar carrying this message is pinned to the bottom');
});

test('271: the target is read from the STATE, never parsed out of the sentence', () => {
  const fn = extractFn(SRC, 'focusBuilderBlocker').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  assert.ok(!/textContent|innerHTML|builderSaveBlocker\(/.test(fn),
    'rewording the copy must not be able to send the cursor to the wrong field — so it may not read ' +
    'the rendered sentence, nor re-derive it');
  assert.match(fn, /plate\.length/, 'it asks the same condition builderSaveBlocker does, of the same state');
});

/* ------------------------------------------------------------------ 3. the edit tag */

function editTag(opts) {
  const el = { textContent: '', style: {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('EL', 'OPT', `
    "use strict";
    var document={getElementById:function(id){ return id==='editTag'?EL:null; }};
    var loadedPlateId=OPT.loadedPlateId||null, savedPlates=OPT.savedPlates||[];
    function updatePublishLabel(){}
    ${extractFn(SRC, 'updateEditTag')}
    return updateEditTag;
  `);
  factory(el, opts)();
  return el;
}

test('271: the edit tag states saved-vs-new and never the plate name', () => {
  const NAME = 'Big Breakfast';
  const el = editTag({ loadedPlateId: 'SP1', savedPlates: [{ id: 'SP1', name: NAME }] });
  assert.strictEqual(el.style.display, 'inline', 'a saved plate still shows the tag — that state is its job');
  assert.ok(!el.textContent.includes(NAME),
    'the name is already the header field and #plateName; a third copy is what item 51 came for');
  assert.match(el.textContent, /saved/i, 'and it must still SAY which state it is in');
});

test('271: a new plate shows no tag at all', () => {
  assert.strictEqual(editTag({}).style.display, 'none');
});

test('271: a loadedPlateId pointing at a plate that is gone shows no tag', () => {
  assert.strictEqual(editTag({ loadedPlateId: 'SP9', savedPlates: [{ id: 'SP1', name: 'x' }] }).style.display, 'none',
    'the tag claims a plate exists, so it must not claim it when the lookup misses');
});

/* ------------------------------------------------------------------ 4. the duplicate line */

function adder(opts) {
  const state = { toasts: [], focused: null, rendered: 0 };
  // eslint-disable-next-line no-new-func
  const factory = new Function('S', 'OPT', `
    "use strict";
    var plate=OPT.plate||[], uidc=9;
    var kById=OPT.kById||{}, byId=OPT.byId||{};
    var qEl={value:'chi', focus:function(){ S.focused='q'; }};
    var document={querySelector:function(sel){
      S.selector=sel;
      return OPT.rowFound===false?null:{focus:function(){ S.focused='qty'; }, select:function(){ S.selected=true; }};
    }};
    function closeDrop(){ S.closed=true; }
    function renderPlate(){ S.rendered++; }
    function toast(m){ S.toasts.push(m); }
    function defaultQty(){ return 100; }
    ${extractFn(SRC, 'addKitchenLine')}
    return { add:addKitchenLine, plate:function(){ return plate; }, q:qEl };
  `);
  return { api: factory(state, opts), state };
}

const K = { kById: { K1: { id: 'K1', name: 'Chips', pid: 'P1' } }, byId: { P1: { id: 'P1', base_unit: 'g' } } };

test('271: adding the same ingredient twice adds ONE line', () => {
  const { api, state } = adder(K);
  api.add('K1');
  api.add('K1');
  assert.strictEqual(api.plate().length, 1, 'the second add must not push a second line');
  assert.strictEqual(state.toasts.length, 1, 'and it must not be silent — the user pressed a thing');
  assert.match(state.toasts[0], /already on this plate/);
  assert.match(state.toasts[0], /Chips/, 'the toast names WHICH ingredient, because the dropdown is already closed');
});

test('271: the refused add does not invent a quantity on the line that exists', () => {
  const plate = [{ uid: 1, kid: 'K1', qty: 250 }];
  const { api } = adder(Object.assign({ plate }, K));
  api.add('K1');
  assert.strictEqual(plate[0].qty, 250,
    'MERGING was the other option in item 51 and is the wrong one: the added line carries defaultQty ' +
    'or null, so a merge adds a number the user never typed to one they did');
});

test('271: the refused add focuses the existing line\'s quantity, which is what the user came to change', () => {
  const { api, state } = adder(Object.assign({ plate: [{ uid: 7, kid: 'K1', qty: 250 }] }, K));
  api.add('K1');
  assert.strictEqual(state.focused, 'qty');
  assert.match(state.selector, /data-uid="7"/, 'the EXISTING line, by its uid — not the first row on the docket');
  assert.strictEqual(state.closed, true, 'and the dropdown closes, as it does on a successful add');
});

test('271: with the row not on screen, focus falls back to the search field rather than throwing', () => {
  const { api, state } = adder(Object.assign({ plate: [{ uid: 7, kid: 'K1', qty: 250 }], rowFound: false }, K));
  assert.doesNotThrow(() => api.add('K1'));
  assert.strictEqual(state.focused, 'q');
});

test('271: a DIFFERENT ingredient still adds normally', () => {
  const two = { kById: { K1: K.kById.K1, K2: { id: 'K2', name: 'Fish', pid: 'P1' } }, byId: K.byId };
  const { api, state } = adder(two);
  api.add('K1');
  api.add('K2');
  assert.strictEqual(api.plate().length, 2);
  assert.deepStrictEqual(state.toasts, [], 'nothing was refused, so nothing is announced');
  assert.strictEqual(state.rendered, 2, 'and both adds repaint the docket');
});

test('271: a legacy {pid} line for the same product does NOT block adding its kitchen ingredient', () => {
  /* Live data: 84 of 179 plate lines were bare-pid at the v125 count. They carry no kid, so the
     guard must key off the KID and not off the product — refusing here would make an ingredient
     unaddable on any plate that already has a legacy line for its product, and nothing on screen
     would explain why. */
  const { api } = adder(Object.assign({ plate: [{ uid: 1, pid: 'P1', qty: 50 }] }, K));
  api.add('K1');
  assert.strictEqual(api.plate().length, 2);
});

/* ------------------------------------------------------------------ census */

test('271 census: the four readiness controls have ONE owner', () => {
  /* The F7 census said this about `hidden` on two controls, after two copied assignments per call
     site left both visible on a discarded plate. `disabled` is the same mechanism on four more.
     ⚠️ TWO CHECKS, BECAUSE THE FIRST ONE ALONE IS A PROXIMITY HEURISTIC and this file's own roster
     (`.claude/rules/tests.md`, entry 268) is about exactly that: the same-line form catches a direct
     `getElementById('x').disabled=`, and a second writer that binds the element to a variable first
     and sets `.disabled` twenty lines later walks straight past it. That is the natural way anyone
     would write the second writer, because it is how the owner itself is written.
     So the second check follows the BINDING: any `var/let/const X = getElementById('<id>')` outside
     the owner is found by name, and `X.disabled =` is then forbidden anywhere outside the owner.
     Stated limit, because a heuristic sold as a structural claim is the defect: neither check sees
     an element reached through a collection, a `querySelector`, or a variable assigned in two steps. */
  const owner = extractFn(SRC, 'syncBuilderPlateActions');
  const elsewhere = SRC.split(owner).join('');
  for (const id of ['saveBtn', 'bldSaveBar', 'printBtn', 'clearBtn']) {
    assert.ok(owner.includes(id), `syncBuilderPlateActions must own #${id}`);
    assert.ok(!new RegExp("getElementById\\(['\"]" + id + "['\"]\\)[^;\\n]*disabled\\s*=").test(elsewhere),
      `#${id}'s disabled state is set outside syncBuilderPlateActions — a second writer is how the ` +
      'F7 Clear-plate gap happened');
    const bind = new RegExp("(?:var|let|const)\\s+(\\w+)\\s*=\\s*document\\.getElementById\\(['\"]" + id + "['\"]\\)", 'g');
    let m;
    while ((m = bind.exec(elsewhere))) {
      assert.ok(!new RegExp("\\b" + m[1] + "\\s*\\.\\s*disabled\\s*=").test(elsewhere),
        `#${id} is bound to \`${m[1]}\` outside syncBuilderPlateActions and that variable's ` +
        '`.disabled` is written — same second writer, one statement further apart');
    }
  }
});

test('271 census: the binding check can actually see a second writer', () => {
  /* The check above is the kind that passes for the wrong reason, so it is run against source that
     contains the defect. Without this, a regex that matches nothing reads exactly like a clean file
     — roster 167, and the reason `tests/queue-routing.test.js` carries the same pair. */
  const owner = extractFn(SRC, 'syncBuilderPlateActions');
  const injected = SRC.split(owner).join('') +
    "\nfunction somethingLater(){ var sb=document.getElementById('saveBtn'); if(sb) sb.disabled=false; }\n";
  const bind = /(?:var|let|const)\s+(\w+)\s*=\s*document\.getElementById\('saveBtn'\)/g;
  const hits = [];
  let m;
  while ((m = bind.exec(injected))) hits.push(m[1]);
  assert.ok(hits.includes('sb'), 'the binding pattern finds the injected variable');
  assert.ok(/\bsb\s*\.\s*disabled\s*=/.test(injected), 'and the write it makes is what the assertion forbids');
});

test('271 census: the blocker has one definition and every sink reads it', () => {
  /* Two sinks at two widths: #saveHint (the rail, hidden below 768 with #saveBtn) and #bFootLine
     (the phone bar). If either ever builds its own sentence, the two disagree at the breakpoint and
     no test that renders one width can see it. */
  const calls = SRC.split('builderSaveBlocker(').length - 1;
  assert.ok(calls >= 3, `builderSaveBlocker must be CALLED by every sink, not copied — found ${calls} uses`);
  for (const fn of ['syncBuilderPlateActions', 'renderBuilderCost']) {
    assert.match(extractFn(SRC, fn), /builderSaveBlocker\(/,
      `${fn} writes one of the sinks, so it must ask the one source`);
  }
});

test('271 census: the helper line under the docket is one sentence per statement', () => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const m = /<span class="bld-tip">([^<]*)<\/span>/.exec(html);
  assert.ok(m, 'the builder tip line still exists');
  assert.ok(!/&mdash;|—/.test(m[1]), 'a dash joining two whole sentences is not punctuation the app uses in copy');
  assert.ok(!/\btap\b/i.test(m[1]), 'a device verb: this app is read on a desktop as often as a phone');
  assert.match(m[1], /^[A-Z]/, 'user copy starts with a capital — the 267 casing rule');
});

test('271 census: the phone hides the Cost card body by CLASS, in the block that hides .bld-kv', () => {
  /* The class is what lets a stylesheet rule that must be able to LOSE at another width do so. An
     inline style from JS would beat every rule in the file regardless of the media query — the
     mechanism `.claude/rules/css.md` records against #kingProgress. */
  const css = require('fs').readFileSync(require('path').join(__dirname, '..', 'css', 'style.css'), 'utf8');
  /* ⚠️ 274 — THIS FOUND THE BLOCK BY THE LITERAL `@media (max-width:767px)` AND THAT NUMBER MOVED.
     The rule it pins is "these two hides live in ONE block", which had nothing to do with 767; the
     ceiling is now 1075, because the band where the rail wraps and the rail's Save is unreachable
     runs to there rather than to the phone breakpoint. Pinning the number meant this went red for a
     change that did not touch its invariant, and - worse in the other direction - it would have gone
     GREEN if someone moved one hide into a different block that happened to be `767`.
     So it locates the block by the rule it is about and walks braces from the query's own opening
     `{` to its match, which is roster entry 268's fix for exactly this shape. */
  const at = css.indexOf('#bCost .bld-sumhead');
  assert.ok(at > 0, 'the #bCost hide block is still findable by its first rule');
  const qAt = css.lastIndexOf('@media', at);
  const open = css.indexOf('{', qAt);
  let depth = 0, end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (!depth) { end = i; break; } }
  }
  const query = css.slice(qAt, open).trim();
  const block = [null, css.slice(open + 1, end)];
  assert.match(block[1], /#bCost\.is-bare \.bld-cardbody\{display:none\}/,
    'the bare-body hide must live in the SAME block as the .bld-kv hide it depends on');
  assert.match(block[1], /#bCost \.bld-kv/, 'precondition: that is the block being read');

  /* ⚠️ THE THREE 274 MEDIA QUERIES MUST OVERLAP IN THE SAFE DIRECTION, AND AN EARLIER VERSION OF
     THIS ASSERTION REQUIRED THEM TO MEET EXACTLY. That was wrong, and CI proved it: the wrap point
     is where `.bld-body` reaches 800px of inner width, which depends on the SCROLLBAR as well as the
     viewport, so a rule pinned one pixel past the macOS wrap leaves a band on a classic-scrollbar
     machine where the query says "two-column" while flex is still wrapping - the bar hidden, and
     #saveBtn restored to a rail under a full-height docket. A width with NO reachable commit.
     ⚠️ SO THE TWO ERRORS ARE NOT SYMMETRIC AND THIS ASSERTS THE ASYMMETRY. The bar being shown
     slightly past the wrap is harmless (one control, reachable, mildly redundant). The bar switching
     off slightly before it is the defect. **Overlap is safe; a gap is not** - so the bar's threshold
     must be strictly ABOVE the wrapped-rail band rather than adjacent to it.
     ⚠️ AND THE HONEST LIMIT, because this test cannot see a browser: agreement between RULES is not
     agreement with the LAYOUT. All three of these can be perfectly consistent and all three wrong
     about where flex actually wraps, which is exactly what happened. What proves the property is
     `tests/visual/274-builder-tablet.spec.js`'s sweep, which measures the wrap instead of naming it.
     This file's job is only that the three numbers cannot drift APART. */
  const ceiling = /max-width:(\d+)px/.exec(query);
  assert.ok(ceiling, `the #bCost hide block must be bounded by a max-width, got "${query}"`);
  const wrapBlock = /@media \(min-width:768px\) and \(max-width:(\d+)px\)\{\s*(?:\/\*[\s\S]*?\*\/\s*)?\.bld-rail\{max-width:none\}/.exec(css);
  assert.ok(wrapBlock, 'the wrapped-rail block must still be findable — 274 added it');
  const barBlock = /@media \(min-width:(\d+)px\)\{\s*\.bld-bar\{display:none\}/.exec(css);
  assert.ok(barBlock, 'the save-bar hide block must still be findable');

  const hideTo = Number(ceiling[1]);        // #bCost's figures and #saveBtn are hidden up to here
  const wrapTo = Number(wrapBlock[1]);      // the rail is known-wrapped up to here
  const barOff = Number(barBlock[1]);       // the sticky bar disappears from here

  assert.strictEqual(barOff, hideTo + 1,
    'the sticky bar must switch off exactly where #saveBtn comes back, or there is a width with two primary CTAs or none');
  assert.ok(hideTo > wrapTo,
    `the bar must be shown PAST the wrapped-rail band, not level with it: #bCost hides to ${hideTo} and the wrap band ends at ${wrapTo}. A scrollbar moves the real wrap point, and the two errors are not symmetric — overlapping is safe, a gap has no reachable commit.`);
  assert.ok(hideTo - wrapTo >= 20,
    `the margin between them is ${hideTo - wrapTo}px, which is under the ~17px a classic scrollbar can move the wrap point by. Widen it rather than trimming it.`);
  assert.ok(!/bCost[^\n]*style\.display/.test(SRC),
    'nothing may set the card body\'s display inline — an inline style cannot lose at 1280');
  assert.match(extractFn(SRC, 'renderBuilderCost'), /classList\.toggle\('is-bare'/,
    'and renderBuilderCost is what decides it, from the menus the plate is on');
});
