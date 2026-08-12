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

test('179: the three screens the queue item names all carry the attribute', () => {
  const got = pairs();
  assert.deepEqual(got.map((p) => p.action).sort(),
    ['importBtn', 'kingWizBtn', 'menuAddDishBtn'],
    'Ingredients, Products and Menu — the three converted screens that shipped two header actions');
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
test('179: each converted header carries exactly two actions, so a phone sees one', () => {
  ['tab-pantry', 'tab-ingredients', 'tab-analysis'].forEach((pane) => {
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
