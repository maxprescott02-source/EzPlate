/*
 * _dash.js — F6 (v143): WHERE THE DASHBOARD'S HEADLINE LIVES, STATED ONCE.
 *
 * The rebuilt screen has TWO verdict surfaces and only ever one on screen:
 *   <1024   the mobile mock's §6 hero      — `.dash-hero` / `.dh-num` / `.dh-ctx`
 *   >=1024  the desktop mock's KPI strip   — `.kpi-strip` first cell / `.kpi-num` / `.kpi-sub`
 * and a THIRD that replaces both while nothing is costed and priced: §5's first-run `.dash-path`
 * card, which shows at every width precisely because the strip that hides the hero is itself
 * absent then.
 *
 * ⚠ WHY THIS FILE EXISTS RATHER THAN A SELECTOR PER SPEC. Playwright's `toHaveText` reads
 * textContent, which IGNORES visibility — so `expect(page.locator('.dh-num')).toHaveText('40.0%')`
 * passes on desktop against an element that is `display:none`. That is a test which cannot fail
 * for the reason it was written, and the v133 review had already caught the same shape once on
 * `.verdict-num`. Every caller goes through here and gets the figure a HUMAN can see.
 *
 * Before F6 this was `.verdict-num` / `.verdict-line`, one element at both widths. Those classes
 * and their markup are deleted; the CONTRACT each spec was pinning is unchanged, which is why the
 * specs were rewritten rather than retired.
 */

/* The headline percentage a user can actually see, or null when the screen is in its first-run
   state (where there is deliberately no figure at all — not a "—", not a zero). */
async function verdictFigure(page) {
  return page.evaluate(() => {
    const vis = (el) => el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none';
    const strip = document.querySelector('.kpi-strip');
    if (vis(strip)) return strip.querySelector('.kpi-num').textContent.trim();
    const hero = document.querySelector('.dash-hero');
    if (vis(hero)) return hero.querySelector('.dh-num').textContent.trim();
    return null;
  });
}

/* The sentence under it — "10.0 pts over your 30% target" — from whichever surface is showing. */
async function verdictContext(page) {
  return page.evaluate(() => {
    const vis = (el) => el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).display !== 'none';
    const strip = document.querySelector('.kpi-strip');
    if (vis(strip)) return strip.querySelector('.kpi-sub').textContent.trim();
    const hero = document.querySelector('.dash-hero');
    if (vis(hero)) return hero.querySelector('.dh-ctx').textContent.trim();
    const path = document.querySelector('.dash-path');
    return path ? path.textContent.trim() : null;
  });
}

/* True when the screen is showing §5's first-run path card instead of a figure. Replaces the old
   `.verdict-num` === '—' assertion, which pinned a dash that no longer exists. */
async function isFirstRun(page) {
  return page.evaluate(() => !!document.querySelector('.dash-path') && !document.querySelector('.dash-hero'));
}

/* The scope the screen is CURRENTLY showing. Before F6 this was `.dh-scope`, a span inside the
   card's eyebrow heading; that heading is gone with the card, and v97's "scope is stated once"
   rule now resolves to the control that sets it — the header dropdown's own label. When fewer
   than two menus are costed there is no control and no scope to state, so this returns null. */
async function scopeName(page) {
  const btn = page.locator('#dashScopeBtn .dsb-name');
  return (await btn.count()) ? (await btn.textContent()).trim() : null;
}

/* The scope the screen is EFFECTIVELY on, which is a different question from what it says and a
   different question again from the raw stored value. Needed because the screen deliberately says
   nothing when fewer than two menus are costed: there is no control, and "all menus" versus "the
   one costed menu" is the same figure. Before F6 the card's eyebrow heading printed "All menus"
   unconditionally, so a label assertion could stand in for a state assertion; it cannot any more.
   ⚠ `dashScopeValid()`, not the raw `dashScope`. The stored value is allowed to hold a deleted
   menu's id — nothing goes back and rewrites localStorage when a menu is removed — and
   dashScopeValid is the function that refuses it at render time. That corrector IS the contract
   these tests were written for ("no trapped scope"); asserting the raw var would fail against
   perfectly correct code. */
async function scopeState(page) {
  return page.evaluate(() => window.dashScopeValid());
}

module.exports = { verdictFigure, verdictContext, isFirstRun, scopeName, scopeState };
