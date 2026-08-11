/* 171 — the More screen and the mobile nav restructure.
 *
 * WHAT THIS FILE EXISTS FOR. The same four routes (Products, Invoices, Settings, Account) are now
 * written down in FOUR places: the `.nav-bottom` group in <nav>, the `[data-more]` rows in
 * #tab-more, the MORE_SUBS array in js/app.js, and the four `.scr-back` chevrons on the screens
 * themselves. That is a §6.1 requirement, not duplication for its own sake — the desktop sidebar
 * group and the phone's More list are the same list shown two ways, and the map says "same names,
 * same order, same reading direction everywhere". But four copies of one list is exactly the shape
 * that drifts, and the drift is SILENT: a fifth sidebar entry with no More row simply cannot be
 * reached on a phone, and nothing else would go red.
 *
 * So every assertion here compares the copies AGAINST EACH OTHER rather than against a literal.
 * Adding a fifth screen to all four places passes; adding it to three fails and names the missing
 * one. The one literal is the ORDER, because §6.1 fixes it and a test that derived the expected
 * order from one of the copies could not tell a reorder from a reorder.
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const CSS = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
// comments name every selector and key in this file; a tombstone must never satisfy an assertion
const CSS_LIVE = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
const HTML_LIVE = HTML.replace(/<!--[\s\S]*?-->/g, '');

/* §6.1: "Desktop's bottom sidebar group (Products, Invoices, Settings, Account) = mobile's More
   list, in the same order." data-tab keys, not labels — `ingredients` is the screen LABELLED
   Products (the naming inversion), and writing the label here would invite someone to "fix" it. */
const ORDER = ['ingredients', 'invoices', 'settings', 'account'];

const navGroup = () =>
  [...HTML_LIVE.matchAll(/<button class="navbtn nav-bottom[^"]*" data-tab="([a-z]+)"/g)].map((m) => m[1]);
const moreRows = () =>
  [...HTML_LIVE.matchAll(/class="more-row" type="button" data-more="([a-z]+)"/g)].map((m) => m[1]);

test('171: the sidebar bottom group is §6.1\'s four, in §6.1\'s order', () => {
  assert.deepEqual(navGroup(), ORDER,
    'Products, Invoices, Settings, Account — the order the parity map fixes for both platforms');
});

test('171: the More screen renders the SAME four, in the SAME order', () => {
  assert.deepEqual(moreRows(), ORDER, 'the More list is the sidebar bottom group, shown as rows');
  // compared against each other as well, so a future fifth screen cannot land in one and not the other
  assert.deepEqual(moreRows(), navGroup(),
    'the two copies of this list must be identical — they are one list rendered two ways');
});

test('171: MORE_SUBS is the same four again, and showTab lights More from it', () => {
  const decl = APP.match(/var MORE_SUBS=\[([^\]]*)\];/);
  assert.ok(decl, 'MORE_SUBS is declared once, as a literal');
  assert.deepEqual(decl[1].split(',').map((x) => x.trim().replace(/'/g, '')), ORDER,
    'the four screens that light the More tab are the four screens the More list opens');
  /* THE RULE it feeds (§6: "Invoices/Products/Settings/Account highlight More"). Asserted on the
     mechanism, because the failure is invisible: a phone user on one of these four screens sees a
     tab bar with nothing lit at all, which reads as "you are nowhere". */
  const showTab = APP.slice(APP.indexOf('function showTab('), APP.indexOf('function restoreLastTab('));
  assert.ok(/MORE_SUBS\.indexOf\(t\)>=0/.test(showTab), 'showTab reads the shared list, not a copy');
  assert.ok(/classList\.add\('active'\)/.test(showTab),
    'and ADDS the class — it must never clear one the exact-match pass set, or the sub-screen\'s own entry goes dark on desktop');
});

/* Every one of the four is a real pane, and every one carries a way back. A chevron pointing at a
   screen that does not exist is the dead end §6 forbids by name, and it is the exact failure F4
   refused to ship inside the Products item. */
test('171: each of the four is a pane, and each carries a "‹ More" chevron back', () => {
  ORDER.forEach((key) => {
    assert.ok(HTML.indexOf(`id="tab-${key}"`) >= 0, `#tab-${key} exists`);
    const pane = HTML.slice(HTML.indexOf(`id="tab-${key}"`));
    const head = pane.slice(0, pane.indexOf('</div>'));
    assert.match(head, /class="scr-back" type="button" data-back="more"/,
      `#tab-${key} has a back chevron in its .scr-head — never a dead end`);
  });
  // …and every chevron in the file points at a pane that exists
  [...HTML_LIVE.matchAll(/class="scr-back"[^>]*data-back="([a-z]+)"/g)].forEach((m) => {
    assert.ok(HTML.indexOf(`id="tab-${m[1]}"`) >= 0, `a chevron points at #tab-${m[1]}, which must exist`);
  });
  // exactly four, so a fifth screen cannot quietly acquire one without joining the list above
  assert.equal((HTML_LIVE.match(/class="scr-back"/g) || []).length, ORDER.length,
    'one chevron per More sub-screen, and none anywhere else');
});

test('171: both the More rows and the chevrons route through showTab, not a second navigation path', () => {
  assert.match(APP, /\.more-row\[data-more\]/, 'the rows are bound by attribute');
  assert.match(APP, /\.scr-back\[data-back\]/, 'and so are the chevrons');
  // the attribute value IS a TAB_PANES key in both cases — that is what makes one showTab enough
  const panes = APP.match(/var TAB_PANES=\[([^\]]*)\];/)[1].split(',').map((x) => x.trim().replace(/'/g, ''));
  moreRows().forEach((k) => assert.ok(panes.indexOf(k) >= 0, `data-more="${k}" is a TAB_PANES key`));
  assert.ok(panes.indexOf('more') >= 0, "…and 'more' is one itself, or its own pane never hides");
});

/* THE MOBILE TAB BAR. §6 gives the phone five tabs and the order is §6.1's: the sidebar's top group
   read left to right, with More last. The bar is "every .navbtn that is not .nav-bottom", because
   .nav-bottom is the desktop-only group — so this reads the bar the same way the CSS does. */
test('171: the phone gets five tabs, in §6.1\'s order, with More last', () => {
  const bar = [...HTML_LIVE.matchAll(/<button class="navbtn(?![^"]*nav-bottom)[^"]*" data-tab="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(bar, ['dashboard', 'analysis', 'builder', 'pantry', 'more'],
    'Home, Menu, Plates, Ingredients, More — §6.1\'s "sidebar top-to-bottom = tab bar left-to-right"');
});

/* THE DOM POSITION OF #navMore IS LOAD-BEARING and nothing else can catch it going wrong. showTab
   lights BOTH #navMore and the sub-screen's own .nav-bottom entry; currentTab() returns the first
   .navbtn.active in DOCUMENT order. #navMore last means the sub-screen's entry wins that read.
   Move it above the bottom group and currentTab answers 'more' for four screens — which sends
   rerenderCurrentTab down its early-return branch and stops those screens repainting when boot
   data lands. Silent, and only on a slow connection. */
test('171: #navMore is the LAST nav button, so currentTab reads the sub-screen and not More', () => {
  const nav = HTML.slice(HTML.indexOf('<nav class="bottomnav"'), HTML.indexOf('</nav>'));
  const ids = [...nav.matchAll(/<button class="navbtn[^"]*"[^>]*data-tab="([a-z]+)"/g)].map((m) => m[1]);
  assert.equal(ids[ids.length - 1], 'more', '#navMore is written last in <nav>');
  assert.ok(ids.indexOf('more') > ids.indexOf('account'), '…after every member of the bottom group');
  assert.match(APP, /var b=document\.querySelector\('\.navbtn\.active'\)/,
    'currentTab still reads the FIRST active button — the ordering above is what makes that correct');
});

/* THE ONE-WAY GUARD. #tab-more has no desktop counterpart: at >=1024 its four routes ARE the
   sidebar. It is reachable there by exactly one route — restoreLastTab() replaying a
   `cafeDB_lastTab` of 'more' written on a phone — and it must not paint. The reverse is NOT
   guarded and must not be: landing on the four sub-screens below 1024 is the whole point of the
   batch, and a symmetric guard would undo it. */
test('171: showTab refuses "more" above 1024, and guards nothing else', () => {
  const showTab = APP.slice(APP.indexOf('function showTab('), APP.indexOf('function restoreLastTab('));
  assert.match(showTab, /if\(t==='more' && !moreIsNav\(\)\) t='dashboard';/,
    'the guard redirects rather than painting a screen the sidebar cannot express');
  ORDER.forEach((k) => assert.ok(!new RegExp(`t==='${k}'.*moreIsNav`).test(showTab),
    `${k} is NOT width-guarded — it is reachable at both widths and that is the point of this batch`));
  /* matchMedia, not innerWidth: it is the unit the stylesheet resolves. CLAUDE.md records that
     innerWidth and the fixed-position containing block disagree by ~10px on the CI runner, so a
     hand-rolled comparison would flip on a different side of 1024 than `.nav-more` does. */
  const fn = APP.slice(APP.indexOf('function moreIsNav('), APP.indexOf('function showTab('));
  assert.match(fn, /matchMedia\('\(min-width:1024px\)'\)/, 'the guard asks the same query the CSS does');
  assert.ok(!/innerWidth|clientWidth/.test(fn), 'never a hand-rolled width comparison');
  // and the crossing itself is handled — widening a window with More open must not strand a blank pane
  assert.match(APP, /mq\.addEventListener\('change',onCross\)/, 'crossing 1024 live is handled');
  assert.match(APP, /mq\.addListener\(onCross\)/, '…with the pre-Safari-14 fallback');
});

/* Nothing on this screen is derived from data — four fixed routes, no fetch — so §4's five states
   do not apply, exactly as F9 and F10 recorded for Settings and Account. What WOULD be a defect is
   a number or a figure appearing here, because that would mean it had started reading data without
   gaining the skeleton/empty/error states that come with it. */
test('171: the More screen reads no data — no render function, no figures', () => {
  const pane = HTML.slice(HTML.indexOf('id="tab-more"'));
  const body = pane.slice(0, pane.indexOf('<!-- /tab-more')).replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(!/renderMore/.test(APP), 'no render function — it is static markup');
  assert.match(APP, /if\(t==='account'\|\|t==='more'\) return;/,
    'rerenderCurrentTab returns early for it, or boot data repaints a hidden Plates library');
  assert.ok(!/\d/.test(body.replace(/[^>]*>/g, '')), 'no figure of any kind in the rendered text');
});

/* THE MOCK'S WORKSPACE/PLAN CARD IS R4 AND IS NOT DRAWN. §6: "More screen: chevron rows … +
   workspace/plan card". No workspace, no plan and no billing exist. This asserts the absence by the
   words that would appear if someone later "completed" the mock without the backing — the same
   shape F10 used for Edit profile / Invite a teammate / Manage billing / Sign out. */
test('171: R4 — the mock\'s workspace/plan card is not drawn, because neither exists', () => {
  const pane = HTML.slice(HTML.indexOf('id="tab-more"'));
  const body = pane.slice(0, pane.indexOf('<!-- /tab-more')).replace(/<!--[\s\S]*?-->/g, '');
  /* Structural first: the screen is a header and a list, and nothing follows the list. The mock's
     card sits AFTER its rows, so "nothing after the list" is the assertion that actually catches
     it — a word list alone would pass against a card that used different words. */
  const after = body.slice(body.lastIndexOf('</button>') + '</button>'.length);
  assert.ok(!/<(?!\/)/.test(after), 'nothing is drawn after the four rows — the mock\'s card sits there');
  /* Then the words that would arrive with it. Scoped to OUTSIDE `.more-list`, because the Account
     ROW legitimately says "Profile, team, plan" — that is the mock's own sub-line describing the
     screen it opens, and it is honest: #tab-account really does carry a Plan section saying nothing
     is billed. What must not appear is a workspace name, a plan NAME or a renewal date. */
  const outside = body.replace(/<div class="more-list">[\s\S]*<\/div>/, '');
  ['renews', 'workspace', 'billing', 'upgrade', 'trial'].forEach((dead) => {
    assert.ok(!new RegExp(dead, 'i').test(outside), `"${dead}" must not ship on this screen — nothing is behind it`);
  });
});

/* THE HEADER GEAR IS DELETED, and this pins the deletion rather than only the replacement. F9 made
   the gear unremovable because it was the phone's only route to Settings; that condition is met and
   the queue item asked this batch to decide. Asserted because the tempting "fix" for anyone who
   misses the gear is to put it back, which would restore §7's duplicate intent silently. */
test('171: the header gear is gone, and so is the class only it wore', () => {
  assert.ok(!/id="settingsBtn"/.test(HTML_LIVE), 'no gear in the markup');
  assert.ok(!/settingsBtn/.test(APP.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')),
    'and nothing binds one');
  assert.ok(!/\.theme-toggle/.test(CSS_LIVE), '.theme-toggle is deleted with its only wearer (§1.4, delete as you go)');
  assert.ok(!/openSettings/.test(APP.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')),
    'and the one-line alias it needed a handler for is deleted too');
});
