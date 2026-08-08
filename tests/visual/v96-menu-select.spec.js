/*
 * v96-menu-select.spec.js — the regression list from the "menu selection moves onto the By Menu list"
 * brief, driven in a real browser.
 *
 * v96 merged two controls into one: the picker chip that sat in the headline block is deleted, and the
 * By-menu rows (already buttons since v89) are now the only thing that sets dashScope. "All menus" is
 * a real first row rather than an implicit fallback.
 *
 * What this pins that the unit tests can't: the round trip through a real re-render (does returning to
 * All menus reproduce the all-menus dashboard EXACTLY), reload behaviour, thin-history copy, and the
 * measured 44px touch floor on rows that are now controls.
 *
 * Run: npx playwright test tests/visual/v96-menu-select.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const MENUS = [
  { id: 'MENU_ORIGINAL', name: 'Original' },
  { id: 'MENU_WINTER', name: 'Winter', season: 'Jun–Aug' }
];
const PLATES = [
  { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  { id: 'PL2', name: 'Burger', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 3 }] },
  { id: 'PL3', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 6 }] }
];
const DISHES = [
  { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
  { id: 'MI2', name: 'Burger', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
  { id: 'MI3', name: 'Roast', section: 'Dinner', price: 10, custom: true, menuId: 'MENU_WINTER', plateId: 'PL3' }
];

// history is a PARAMETER here: the thin-history case is one of the things under test.
// v97: so is the stored scope — seeding it is how the deleted-menu fallback gets exercised through a
// real boot, which is the shape a deploy-time reload finds after a menu is deleted on another device.
function seed() {
  return (args) => {
    /* v97: addInitScript runs on EVERY navigation, including page.reload(). Re-seeding there would call
       localStorage.clear() and wipe exactly the preferences a reload test exists to check — so seed once
       per context, then leave storage alone and let the app own it. The v96 version of this file could
       not see the problem: it re-seeded cafeDB_dashRange to '3m' and then asserted '3m', which passes
       whether the value persisted or was just rewritten. */
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify(args.MENUS));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify(args.PLATES));
    localStorage.setItem('cafeDB_menu', JSON.stringify(args.DISHES));
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify(args.history));
    localStorage.setItem('cafeDB_dashRange', '3m');
    if (args.scope) localStorage.setItem('cafeDB_dashScope', args.scope);
    localStorage.setItem('__spec_seeded', '1');   // test-only key, deliberately outside the cafeDB_ namespace
  };
}

const FULL_HISTORY = (() => {
  const day = 86400000, now = Date.now();
  return [{ t: now - 20 * day, v: 42.0 }, { t: now - 10 * day, v: 38.5 }, { t: now - day, v: 36.0 }];
})();

async function boot(page, { width = 380, history = FULL_HISTORY, scope = null } = {}) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  // same-origin /api/* would reach the static dev server and 501 on POST — block it so the insight
  // phrasing takes its offline template path rather than logging an error that masks a real one.
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(seed(), { MENUS, PLATES, DISHES, history, scope });
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);
}

/* v129: the scope rows live behind the dropdown — open it when it isn't already; picking closes it. */
async function openScope(page) {
  const closed = page.locator('#dashScopeBtn[aria-expanded="false"]');
  if (await closed.count()) { await closed.click(); await page.waitForTimeout(250); }
}
async function pickScope(page, id) {
  await openScope(page);
  await page.locator(`.mcmp-row[data-scope="${id}"]`).click();
  await page.waitForTimeout(300);
}

/* ---- 1. one selection drives every dependent, together ----
   The brief named three regions. Two of them (the comparison block, the trend chart) are all-menus by
   the v89 scope-honesty rule and do NOT follow the selection — per-menu history has only existed since
   v89 and drawing the aggregate under a menu's name would be a figure this app can't stand behind. So
   what is pinned here is what the scope ACTUALLY drives — headline, insights, drill-downs — plus the
   fact that the chart says so in words when narrowed. Descoped with Max, 29 Jul; the menu-aware chart
   remains CLAUDE.md's outstanding item 5, blocked on per-menu points. */
test('one tap moves every scope-following region at once, with no partial update', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.verdict-num')).toHaveText('40.0%');
  const insAll = await page.locator('#dashBody .ins-line').allTextContents();

  await pickScope(page, 'MENU_WINTER');

  // headline, its target line, and the control marking all moved together (v129: the closed
  // dropdown's label is the visible marking; the row's aria-current is asserted re-opened)
  await expect(page.locator('.verdict-num')).toHaveText('60.0%');
  await expect(page.locator('.dh-scope')).toHaveText('Winter');
  await expect(page.locator('.verdict-line')).toContainText('30.0 pts over your 30% target');
  await expect(page.locator('#dashScopeBtn .dsb-name')).toHaveText('Winter');
  await openScope(page);
  await expect(page.locator('.mcmp-row.act')).toHaveCount(1);
  await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'MENU_WINTER');
  await page.locator('#dashScopeBtn').click();   // close it again so the rest reads the resting state
  await page.waitForTimeout(250);

  // the chart is honest that it did NOT narrow, rather than silently redrawing as the menu
  await expect(page.locator('.chart-title')).toHaveText('Food cost trend');
  await expect(page.locator('.scope-note')).toBeVisible();

  // and the insight set is genuinely different, not a stale panel left behind. On this seed the
  // narrowed panel is ABSENT rather than repopulated — one thin-data menu has nothing that clears
  // the v92 value floor, and CLAUDE.md's rule is that a panel with nothing to say does not render.
  // Asserting insAll is non-empty first keeps the comparison from being satisfied by both sides
  // being empty, i.e. by the panel never having rendered at all.
  expect(insAll.length, 'the all-menus panel has something to say on this seed').toBeGreaterThan(0);
  const insWinter = await page.locator('#dashBody .ins-line').allTextContents();
  expect(insWinter.join('|')).not.toEqual(insAll.join('|'));
});

/* ---- 2. returning to All menus reproduces the all-menus dashboard EXACTLY ----
   The strongest available form of "reproduces the current rendering": capture the whole rendered
   dashboard, go away, come back, and require it byte-identical. A partial restore (marking moves but
   a caption or a drill-down keeps the menu's numbers) fails this. */
test('selecting All menus reproduces the all-menus rendering exactly', async ({ page }) => {
  await boot(page);
  const before = await page.locator('#dashBody').innerHTML();

  await pickScope(page, 'MENU_WINTER');
  await pickScope(page, 'MENU_ORIGINAL');
  await pickScope(page, 'all');

  const after = await page.locator('#dashBody').innerHTML();
  expect(after, 'the all-menus dashboard is restored intact').toEqual(before);
});

/* ---- 3. thin history: the existing copy, never a blank or a NaN ---- */
test('a scope with insufficient history shows the not-enough-history copy, not NaN', async ({ page }) => {
  await boot(page, { history: [] });

  await pickScope(page, 'MENU_WINTER');

  // the headline still computes from live costing — only the HISTORY is missing
  await expect(page.locator('.verdict-num')).toHaveText('60.0%');
  /* v98 revision: the comparison cards (and their "not enough history yet" line) were DELETED
     with the compares block — the chart empty state below is now the one place thin history
     speaks, and the no-NaN sweep keeps the honesty this test exists for. */
  // the chart takes its empty-state card, not a broken plot
  await expect(page.locator('.dash-chart.empty')).toHaveCount(1);
  await expect(page.locator('.chart-hint')).toContainText('at least two logged points');

  const body = await page.locator('#dashBody').innerText();
  expect(body, 'no NaN anywhere on the dashboard').not.toMatch(/NaN/);
  expect(body, 'no undefined leaking into copy').not.toMatch(/undefined/);
});

/* ---- 4. reload behaviour ----
   v96 pinned the OPPOSITE of this: the selection was session-only, inherited from the picker, because
   that brief forbade adding persistence. v97 reverses it deliberately — merging the picker into the list
   made the list the dashboard's only scope control, so a reload silently discarded the user's scope, and
   the app reloads itself on deploy. The contract is reversed here rather than deleted, in the same commit
   as the change, so the file still records what the behaviour is meant to be. Real reload, real
   localStorage, real boot — which is the only place the module-init read is genuinely exercised. */
test('v97: the selection survives a reload, and the range survives it independently', async ({ page }) => {
  await boot(page);
  await pickScope(page, 'MENU_WINTER');
  await expect(page.locator('.dh-scope')).toHaveText('Winter');
  await page.locator('.range-btn[data-rg="1y"]').click();              // change the OTHER persisted preference
  await page.waitForTimeout(300);
  await expect(page.locator('.dh-scope')).toHaveText('Winter', { timeout: 3000 });  // …which must not reset the scope

  await page.reload();
  await page.waitForTimeout(1600);
  await page.locator('.navbtn[data-tab="dashboard"]').click();
  await page.waitForTimeout(500);

  await expect(page.locator('.dh-scope')).toHaveText('Winter');
  await expect(page.locator('#dashScopeBtn .dsb-name')).toHaveText('Winter');
  await openScope(page);
  await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'MENU_WINTER');
  await expect(page.locator('.range-btn.act')).toHaveAttribute('data-rg', '1y');
});

/* The silent fallback, driven through a real boot: a stored id whose menu no longer exists must land on
   All menus with nothing surfaced — no toast, no error, no blank card, no headline computed against a
   menu that isn't there. Seeded directly into storage because that is the shape a deploy-time reload
   finds after Max deletes a menu on another device. */
test('v97: a stored scope for a deleted menu falls back to All menus, silently', async ({ page }) => {
  const errors = [];
  /* boot() deliberately aborts off-origin and /api/** requests, which Chromium reports as ERR_FAILED
     console errors. Those have to be filtered or this asserts the harness rather than the fallback —
     but the filter is keyed on the failing request's URL, not on the message text. Matching
     /Failed to load resource/ would also swallow a REAL app asset failing to load, which is exactly the
     kind of thing "the fallback must be silent" is supposed to catch. */
  const isBlockedByHarness = m => {
    const url = (m.location() && m.location().url) || '';
    return url !== '' && (!url.startsWith('http://localhost:5173') || url.includes('/api/'));
  };
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !isBlockedByHarness(m)) errors.push(m.text()); });

  await boot(page, { scope: 'MENU_DELETED' });
  await expect(page.locator('.dh-scope')).toHaveText('All menus');
  await expect(page.locator('#dashScopeBtn .dsb-name')).toHaveText('All menus');
  await openScope(page);
  await expect(page.locator('.mcmp-row.act')).toHaveAttribute('data-scope', 'all');
  await page.locator('#dashScopeBtn').click();   // close again: the silence assertions read the resting state
  await page.waitForTimeout(250);
  await expect(page.locator('.verdict-num')).not.toHaveText('—');      // a real figure, not a blank card
  // #toast is always in the DOM; .show is what makes it visible, so THAT is what "nothing surfaced" means
  await expect(page.locator('#toast')).not.toHaveClass(/\bshow\b/);
  await expect(page.locator('#toast')).toHaveText('');
  expect(errors, 'the fallback must be silent').toEqual([]);
});

/* v97: scope is stated ONCE, in the card heading, and the two halves of that heading are deliberately
   NOT the same weight. The v95 density pass mutes every #dashBody panel heading; this is its one
   exception, because the menu name is the only heading content on this tab that changes, and a scope
   indicator quieter than the target line beneath it is how someone reads a specials figure as a
   whole-menu figure. Measured rather than asserted from the source, because what matters is which rule
   actually WINS — a muted-by-default h2 out-specifying the exception would be silent and invisible. */
test('v97: the menu name is full strength while the metric stays muted, and scope is stated once', async ({ page }) => {
  await boot(page);
  await pickScope(page, 'MENU_WINTER');

  const seen = await page.evaluate(() => {
    const h2 = document.querySelector('#dashBody .dash-panel h2');
    const span = h2.querySelector('.dh-scope');
    return {
      heading: h2.textContent.trim(),
      metric: getComputedStyle(h2).color,
      name: getComputedStyle(span).color,
      body: getComputedStyle(document.body).color
    };
  });

  expect(seen.heading).toBe('Average food cost — Winter');       // metric + scope, together, in one place
  expect(seen.name, 'the exception must WIN over #dashBody .panel h2').not.toBe(seen.metric);
  expect(seen.name, 'and land on the full-strength text colour').toBe(seen.body);

  /* …and the scope appears exactly once across the region that owns the number and the chart.
     v120 split that region into two cards (verdict, then chart), so the check reads BOTH — the
     rule is "stated once", and satisfying it by moving the second mention into a sibling card
     would be exactly the redundancy v97 removed. */
  const card = await page.evaluate(() => {
    /* The SCOPE CONTROL is excluded, exactly as it was before v120 — it used to be a separate
       By-menu card that this selector never reached, and it is now a chip row inside the card.
       A control naming its own options is not a restatement: the v97 rule this pins is about
       DESCRIPTIVE mentions (the highlighted row, "on <menu>" beside the number, "— ALL MENUS"
       on the chart title), and counting the control would make the rule unsatisfiable. */
    const el = document.querySelector('#dashBody .dash-panel');
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.dash-scope-wrap').forEach((n) => n.remove());
    return clone.innerText;
  });
  // case-insensitive: innerText returns CSS-TRANSFORMED text, and dashboard headings are uppercased
  expect(card.match(/winter/gi), 'scope stated once in this card').toHaveLength(1);
  await expect(page.locator('.verdict-cap')).toHaveCount(0);
  await expect(page.locator('.chart-title')).toHaveText('Food cost trend');
});

/* ---- 5. the rows are controls now, so the 44px floor applies to them ----
   The v94 density pass lowered the DIG-row floor to 32px on the grounds that those are display rows.
   That reasoning is correct and stands; it does not extend here. By-menu rows are buttons that set the
   dashboard's scope, so they are held to the app's touch-target floor — measured, at phone width. */
test('the scope button and every row, including All menus, clear the 44px touch floor @ 380px', async ({ page }) => {
  await boot(page);
  // v129: the button is the always-visible control, so the floor applies to it first
  const btn = await page.locator('#dashScopeBtn').boundingBox();
  expect(btn.height, 'the dropdown button is at least 44px tall').toBeGreaterThanOrEqual(44);
  await openScope(page);
  const rows = await page.locator('.mcmp-row').all();
  expect(rows.length, 'All menus + two costed menus').toBe(3);
  for (const r of rows) {
    const id = await r.getAttribute('data-scope');
    const box = await r.boundingBox();
    expect(box.height, `row ${id} is at least 44px tall`).toBeGreaterThanOrEqual(44);
  }
  // the dig rows keep their v94/v95 32px pin — this batch does not read the row change as a licence
  await page.locator('#dashBody .dig-card').first().click();
  await page.waitForTimeout(300);
  const digs = await page.locator('#dashBody .dig-row').all();
  for (const d of digs) {
    const box = await d.boundingBox();
    expect(box.height, 'dig rows stay display rows at 32px').toBeGreaterThanOrEqual(32);
  }
});
