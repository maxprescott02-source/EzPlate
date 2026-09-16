/* 179 — the second header action, and the one home it moves to below 768.
 *
 * WHAT THIS FILE EXISTS FOR. The queue item's requirement was "ONE home used by every screen — they
 * are one question and must not get three answers", and the way that requirement gets violated is
 * not a broken layout. It is a fourth screen wired by hand, or a `data-mobile-home` pointing at an
 * id that no longer exists, or a renderer going back to `hidden` on a row that now hosts an action.
 * All three are silent: the app renders, the suite is green, and one button is missing on a phone.
 *
 * The BROWSER half — whether a header actually measures one row, whether the move happens at all —
 * is in tests/visual/v158-header-actions.spec.js, because none of it can be read out of the source.
 * This file pins the source facts that spec cannot see, and it compares the copies against each
 * other rather than against a literal wherever it can, for the reason more-screen.test.js states.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
// comments name every selector and id in this file; a tombstone must never satisfy an assertion
const HTML_LIVE = HTML.replace(/<!--[\s\S]*?-->/g, '');
const CSS_LIVE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const APP_LIVE = APP.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* Read from the MARKUP, never from a list written here — the pairing is declarative on purpose, so
   a fourth screen adopting the pattern should extend these assertions by existing, not by being
   added twice. */
const pairs = () => [...HTML_LIVE.matchAll(/id="([A-Za-z]+)"[^>]*data-mobile-home="([A-Za-z]+)"|data-mobile-home="([A-Za-z]+)"[^>]*id="([A-Za-z]+)"/g)]
  .map((m) => ({ action: m[1] || m[4], home: m[2] || m[3] }));

/* ⚠️ MENU LEFT THIS SET IN BATCH 278 AND THAT IS THE ITEM'S FIX, NOT A REGRESSION. `#menuAddDishBtn`
   adds a plate to the menu chosen in `#menuSwitchRow`, and it sat in `.scr-head` a row ABOVE that
   choice — measured at 1280, the button at y37-75 against the switcher row at y80-136, with the
   header hairline between them. Queue item 54 (U32) moved it INTO that row at every width, so it no
   longer needs `data-mobile-home`: the markup now says permanently what the attribute said below
   768, and the mechanism this file guards has one fewer user rather than a broken one.
   The list is rewritten rather than loosened. `.claude/rules/tests.md` would call a change to
   `length >= 2` the weaker assertion, and the point of naming the screens is that a FOURTH one
   wired by hand is exactly what this file exists to catch. */
test('179: the two screens still using the attribute carry it, and Menu no longer needs it', () => {
  const got = pairs();
  assert.deepEqual(got.map((p) => p.action).sort(),
    ['importBtn', 'kingWizBtn'],
    'Ingredients and Products — Menu rehomed its action permanently in 278 (queue item 54)');
  /* And it really is in the row rather than merely absent from the header, or "no longer needs it"
     would be true of a button that had simply been deleted. */
  assert.match(HTML_LIVE, /<div class="[^"]*plib-controls[^"]*" id="menuSwitchRow"[\s\S]*?id="menuAddDishBtn"[\s\S]*?<\/div>\s*<\/div>/,
    '#menuAddDishBtn is authored inside #menuSwitchRow now');
  assert.ok(!/id="menuAddDishBtn"[^>]*data-mobile-home/.test(HTML_LIVE),
    'and it carries no data-mobile-home, because it never moves');
  /* ONE HOME, not three answers: every one of them names a `.plib-controls` row, which is the home
     Max chose on 12 Aug 2026. A screen pointed at a modal, a footer or a new row of its own would
     be the item's requirement quietly broken, and it would look fine on screen. */
  got.forEach(({ action, home }) => {
    const row = new RegExp(`<div class="[^"]*plib-controls[^"]*" id="${home}"`);
    assert.ok(row.test(HTML_LIVE), `${action}'s home #${home} is a .plib-controls row`);
  });
});

test('179: every named home is a real element, and each action sits in a .scr-head to start with', () => {
  pairs().forEach(({ action, home }) => {
    assert.ok(new RegExp(`id="${home}"`).test(HTML_LIVE), `#${home} exists in the markup`);
    /* The restore target is captured from the DOM at boot, so the button must START in the header —
       markup that shipped it already inside its row would strand it there at desktop, with nothing
       to go red. The check is that the action's id appears between a `.scr-head` and the `</div>`
       that closes it. */
    const head = HTML_LIVE.slice(0, HTML_LIVE.indexOf(`id="${action}"`)).lastIndexOf('class="scr-head');
    const ctl = HTML_LIVE.slice(0, HTML_LIVE.indexOf(`id="${action}"`)).lastIndexOf('plib-controls');
    assert.ok(head > ctl, `#${action} is authored inside the header bar, which is the slot it returns to`);
  });
});

test('179: the move is one function, on the CSS breakpoint, with a desktop fallback', () => {
  assert.match(APP_LIVE, /function syncHeaderActions\(\)/, 'one mover, not three per-screen calls');
  assert.match(APP_LIVE, /querySelectorAll\('\[data-mobile-home\]'\)/,
    'it reads the markup rather than carrying its own list of screens');
  /* 767, because that is where the stylesheet puts the seam — `@media (min-width:768px)` on
     `.scr-head`. A query that disagreed with the CSS would move the button on one side of a
     breakpoint and restyle it on the other. */
  assert.match(APP_LIVE, /matchMedia\('\(max-width:767px\)'\)/, 'the same query the stylesheet uses');
  assert.match(CSS_LIVE, /@media \(min-width:768px\)\{[\s\S]*?\.scr-head\{min-height:48px/,
    'and the stylesheet really does seam at 768 — the pair is what makes 767 correct');
  assert.ok(!/innerWidth|clientWidth/.test(APP.slice(APP.indexOf('function hdrActionsMobile('), APP.indexOf('function syncHeaderActions('))),
    'never a hand-rolled width comparison — CLAUDE.md records the two disagreeing by ~10px in CI');
  /* A throwing matchMedia must resolve to DESKTOP. Mobile would be the destructive default: it
     would move both actions into a row on a browser that never told us it was narrow. */
  const guard = APP_LIVE.slice(APP_LIVE.indexOf('function hdrActionsMobile('), APP_LIVE.indexOf('function syncHeaderActions('));
  assert.match(guard, /catch\(e\)\{ return false; \}/,
    'and it fails safe to the desktop layout, which is today\'s behaviour');
  // the crossing itself, both halves, exactly as the 1024 guard does it
  assert.match(APP_LIVE, /mq\.addEventListener\('change',syncHeaderActions\)/, 'crossing 767 live is handled');
  assert.match(APP_LIVE, /mq\.addListener\(syncHeaderActions\)/, '…with the pre-Safari-14 fallback');
  assert.match(APP_LIVE, /^syncHeaderActions\(\);/m, 'and it runs once at boot, or nothing places the buttons at all');
});

/* THE REGRESSION THIS BATCH CAME CLOSEST TO SHIPPING. All three rows are hidden at zero by their
   renderers, and the reason each gives is about the FILTERS ("an option-less select is a control
   that does nothing"). Reinstating `hidden` on any of them takes the hosted action with it — and on
   Ingredients that is the setup wizard disappearing on a phone at the exact moment the line below
   it in renderKitchenPanel calls the moment the wizard matters most. Nothing on screen would look
   broken; the button would simply not be there. */
test('179: a row that hosts an action hides its FILTERS at zero, never itself', () => {
  pairs().forEach(({ action, home }) => {
    const hid = new RegExp(`getElementById\\('${home}'\\)[^\\n]*\\.hidden\\s*=`);
    assert.ok(!hid.test(APP_LIVE),
      `#${home} hosts ${action} below 768, so it must not be hidden wholesale — toggle is-nofilters instead`);
    assert.ok(new RegExp(`getElementById\\('${home}'\\)[\\s\\S]{0,200}?is-nofilters`).test(APP_LIVE),
      `#${home} switches to the is-nofilters class`);
  });
  /* The selector that makes the class mean "filters, not the row". Its `:not()` is the whole
     mechanism, and CLAUDE.md's @media trap is why the specificity is asserted rather than trusted:
     0-3-0 here against `.plib-search`'s 0-1-0, written outside any media query. */
  assert.match(CSS_LIVE, /\.plib-controls\.is-nofilters > :not\(\[data-mobile-home\]\)\{display:none\}/,
    'the empty state hides every child EXCEPT the hosted action');
  assert.match(CSS_LIVE, /\.plib-controls\.is-nofilters\{padding-top:0\}/,
    'and drops the padding, so a row with nothing left in it collapses as `hidden` used to');
});

/* §6 — "screen title + one action max" on a phone. The markup half: each of the three headers has
   exactly two action buttons authored in it, so after the move each has one. A third would pass
   every layout assertion at 430 and wrap at 360, which is how this item started. */
/* ⚠️ `tab-analysis` (Menu) LEFT THIS LIST IN 278 for the reason above: its header now carries ONE
   action, because the secondary moved permanently into the switcher row. The invariant the test is
   really about is unchanged and is stated below it — a phone sees one action in the header — and
   Menu satisfies it by having one at every width rather than by moving one away. */
test('179: each header still using the move carries exactly two actions, so a phone sees one', () => {
  ['tab-pantry', 'tab-ingredients'].forEach((pane) => {
    const start = HTML_LIVE.indexOf(`id="${pane}"`);
    const head = HTML_LIVE.indexOf('class="scr-head"', start);
    const bar = HTML_LIVE.slice(head, HTML_LIVE.indexOf('</div>', head));
    const buttons = [...bar.matchAll(/<button[^>]*>/g)].filter((b) => !/scr-back/.test(b[0]));
    assert.equal(buttons.length, 2, `#${pane}'s header bar has a primary and one secondary`);
    assert.equal(buttons.filter((b) => /data-mobile-home=/.test(b[0])).length, 1,
      `#${pane} marks exactly one of them as the one that moves`);
    assert.ok(/class="btn primary"/.test(buttons.find((b) => !/data-mobile-home=/.test(b[0]))[0]),
      `#${pane}'s survivor is the primary — the secondary is what leaves`);
  });
});

/* The same invariant, for the screen that now reaches it a different way. Menu's header holds ONE
   button at every width, so there is nothing to move and nothing for a phone to lose. Asserted
   rather than assumed, because "we removed a button" and "we rehomed a button" look identical from
   the header's side and only one of them is what 278 did. */
test('278: Menu\'s header carries one action at every width, and it is the primary', () => {
  const start = HTML_LIVE.indexOf('id="tab-analysis"');
  const head = HTML_LIVE.indexOf('class="scr-head"', start);
  const bar = HTML_LIVE.slice(head, HTML_LIVE.indexOf('</div>', head));
  const buttons = [...bar.matchAll(/<button[^>]*>/g)].filter((b) => !/scr-back/.test(b[0]));
  assert.equal(buttons.length, 1, "Menu's header bar has one action since 278");
  assert.match(buttons[0][0], /id="menuNewBtn"/, 'and it is New menu, whose subject is the screen');
  assert.match(buttons[0][0], /class="btn primary"/);
});
