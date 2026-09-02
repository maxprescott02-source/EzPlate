/*
 * 228-plate-heal.spec.js — an unlinked dish finds its real plate, end to end in a browser.
 *
 * The unit half lives in tests/plate-heal.test.js and owns `plateHealPlan`'s four outcomes. This file
 * owns the half that only a browser can answer: that the decision is actually WIRED — the picker
 * opens, its rows are the candidates, choosing one relinks and opens the builder on the real recipe,
 * and "Start a new plate" still does today's thing. A pure decision nobody routed is worth nothing,
 * and `renderUnlinkedPrompt`'s history in this repo is exactly that shape.
 *
 * WHY A SEEDED FIXTURE AND NOT A REAL FLOW. A dish with no plate link cannot be created by the app —
 * `CLAUDE.md` records that no path makes one, and production has zero. The class arrives only from a
 * restore or from history, so the fixture IS the case: a menu item with no plateId, and plates that
 * share its name.
 *
 * Run: npx playwright test tests/visual/228-plate-heal.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* Three plates. Two normalise to the same name as the dish ("Fish & Chips" / "FISH & CHIPS"), so the
   plan is `ask`. The third is deliberately NOT a match — "fish and chips" is a different string, and
   the heal matches names rather than guessing at synonyms, which is the line between relinking and
   inventing. */
const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MW', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350 }] },
    { id: 'PL2', name: 'fish and chips', category: 'Specials', lines: [] },
    { id: 'PL3', name: 'FISH & CHIPS', category: 'Lunch', lines: [{ kid: 'K1', qty: 200 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 24, custom: true, menuId: 'MW' },
  ]));
  try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {}
};

/* One plate only — the `relink` branch, which must NOT ask. */
const SEED_ONE = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MW', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_plates', JSON.stringify([
    { id: 'PL1', name: 'Fish & Chips', category: 'Mains', lines: [{ kid: 'K1', qty: 350 }] },
  ]));
  localStorage.setItem('cafeDB_menu', JSON.stringify([
    { id: 'MI1', name: 'Fish & Chips', section: 'Mains', price: 24, custom: true, menuId: 'MW' },
  ]));
  try { localStorage.setItem('cafeCost_installDismissed', '1'); } catch (e) {}
};

/* ⚠️ `menuById`, `savedPlates` and `customMenu` are read as BARE IDENTIFIERS, never `window.x`.
   They are top-level `let` in a classic script, which puts them in the global LEXICAL environment
   rather than on `window` — so `window.menuById` is undefined and every assertion built on it throws
   rather than failing, which reads like a broken app. `window.requestLoadMenuItem` and
   `window.kitchenIngredients` are fine because a top-level `function` and a `var` do land on
   `window`; the difference is the declaration keyword, not the file. */
async function boot(page, seed, width) {
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: width || 1280, height: 860 });
  await installBoot(page);
  await page.addInitScript(seed);
  await page.goto('/');
  await page.waitForTimeout(1600);
  // K1 is the kitchen word both plates cost through. Pushed here for the same reason q6-builder does:
  // the shim serves products, not kitchen ingredients.
  await page.evaluate(() => { window.kitchenIngredients.push({ id: 'K1', name: 'Fish', pid: 'P0108' }); window.rebuildKById(); });
  return errs;
}

test('several same-named plates: the picker asks, and never guesses', async ({ page }) => {
  const errs = await boot(page, SEED);
  await page.evaluate(() => window.requestLoadMenuItem('MI1'));
  await page.waitForTimeout(300);

  const open = await page.evaluate(() => document.getElementById('plateHealModal').classList.contains('open'));
  expect(open, 'the picker is on screen').toBe(true);

  const rows = await page.evaluate(() => [...document.querySelectorAll('#plateHealList .ad-item')]
    .map((b) => b.getAttribute('data-plate')));
  expect(rows, 'exactly the two name matches — "fish and chips" is a different name, not a synonym')
    .toEqual(['PL1', 'PL3']);

  // nothing was linked and nothing minted while the question is open
  const state = await page.evaluate(() => ({
    plateId: menuById.MI1.plateId || null,
    plates: savedPlates.length,
  }));
  expect(state).toEqual({ plateId: null, plates: 3 });
  expect(errs).toEqual([]);
});

test('choosing a plate relinks the dish to THAT recipe and opens it', async ({ page }) => {
  const errs = await boot(page, SEED);
  await page.evaluate(() => window.requestLoadMenuItem('MI1'));
  await page.waitForTimeout(300);
  await page.locator('#plateHealList .ad-item[data-plate="PL3"]').click();
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => ({
    plateId: menuById.MI1.plateId,
    plates: savedPlates.length,
    builder: !document.getElementById('builderPage').hidden,
    open: document.getElementById('plateHealModal').classList.contains('open'),
    name: (document.getElementById('plateName') || {}).value,
  }));
  expect(after.plateId, 'the dish now uses the plate the user picked').toBe('PL3');
  expect(after.plates, 'and nothing was minted').toBe(3);
  expect(after.open, 'the picker closed').toBe(false);
  expect(after.builder, 'the builder opened on it').toBe(true);
  expect(after.name).toBe('FISH & CHIPS');
  expect(errs).toEqual([]);
});

/* "None of these" is a real answer. Without it the only way out of an ambiguous heal would be Cancel,
   which leaves the dish exactly as broken as it was — so this button is the escape hatch, and it does
   precisely what the app did before 228. */
test('"Start a new plate" mints an empty one, exactly as before', async ({ page }) => {
  const errs = await boot(page, SEED);
  await page.evaluate(() => window.requestLoadMenuItem('MI1'));
  await page.waitForTimeout(300);
  await page.locator('#plateHealNew').click();
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => {
    const pid = menuById.MI1.plateId;
    const sp = savedPlates.find((s) => s.id === pid);
    return { pid: pid, plates: savedPlates.length, lines: sp ? sp.lines : null, wasCandidate: pid === 'PL1' || pid === 'PL3' };
  });
  expect(after.plates, 'a fourth plate exists').toBe(4);
  expect(after.wasCandidate, 'and it is neither candidate — the app did not choose for the user').toBe(false);
  expect(after.lines).toEqual([]);
  expect(errs).toEqual([]);
});

/* The branch that must NOT ask. One match is the case Max called "relink it", and a picker here would
   be the app asking a question with one possible answer. */
test('exactly one match relinks silently — no picker at all', async ({ page }) => {
  const errs = await boot(page, SEED_ONE);
  await page.evaluate(() => window.requestLoadMenuItem('MI1'));
  await page.waitForTimeout(400);

  const after = await page.evaluate(() => ({
    open: document.getElementById('plateHealModal').classList.contains('open'),
    plateId: menuById.MI1.plateId,
    plates: savedPlates.length,
    builder: !document.getElementById('builderPage').hidden,
  }));
  expect(after.open, 'no question was asked').toBe(false);
  expect(after.plateId, 'it went straight to the real plate').toBe('PL1');
  expect(after.plates, 'and minted nothing').toBe(1);
  expect(after.builder).toBe(true);
  expect(errs).toEqual([]);
});
