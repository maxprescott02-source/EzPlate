/*
 * v142-menu.spec.js — F5: the Menu screen, rebuilt from `Redesign v3 - SaaS.dc.html` §3.2
 * (desktop) and `Redesign v3 - Mobile.dc.html` §6 (mobile).
 *
 * WHAT THIS FILE IS FOR, and why it is not a screenshot harness. The unit suite can read the
 * emitted HTML but cannot see the cascade, and this screen's whole rebuild is cascade: ONE set of
 * markup that is a five-column desktop table and a two-line phone row. Every defect that shape can
 * have is invisible to `npm test` and invisible to reading the file:
 *
 *   - a mobile `::after` prefix whose desktop `content:none` cancel loses on specificity, so a
 *     figure column reads "$6.96 cost," on a 1360px screen (CLAUDE.md Tier 1 — F3 shipped five of
 *     these in one screen, and one of them was written INTO the fix for another);
 *   - the band and the rows drifting apart, because they are separate grid containers and a
 *     `max-content` track resolves per container (v135's review measured 27px on Plates);
 *   - a row whose cells land in the wrong column when a cell is conditionally absent.
 *
 * So this file MEASURES: computed `content`, column alignment between band and rows, and the row
 * grammar the mock's §4 acceptance criteria name — identity left, mono figures right, status pill
 * rightmost. Screenshots are taken too, but they are evidence, not the assertion.
 *
 * Run: npx playwright test tests/visual/v142-menu.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* One menu, three dishes across two sections, one of them UNCOSTED — the uncosted row is a
 * different cell set (dashes, "not costed yet") sharing one grid, which is exactly where a
 * column-placement mistake shows up. Prices are chosen so the verdicts span all three lights:
 * Toastie 2/10 = 20% (good), Roast 3/7 = 42.9% (bad), Soup uncosted. */
function seed() {
  return () => {
    if (localStorage.getItem('__spec_seeded')) return;
    localStorage.clear();
    localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'MENU_ORIGINAL', name: 'Winter Menu' }]));
    localStorage.setItem('cafeDB_cogsPct', '30');
    localStorage.setItem('cafeDB_plates', JSON.stringify([
      { id: 'PL1', name: 'Toastie', category: 'Lunch', lines: [{ misc: true, name: 'x', cost: 2 }] },
      { id: 'PL2', name: 'Roast', category: 'Dinner', lines: [{ misc: true, name: 'x', cost: 3 }] },
      { id: 'PL3', name: 'Pumpkin Soup', category: 'Lunch', lines: [] },
    ]));
    localStorage.setItem('cafeDB_menu', JSON.stringify([
      { id: 'MI1', name: 'Toastie', section: 'Lunch', price: 10, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL1' },
      { id: 'MI2', name: 'Roast', section: 'Dinner', price: 7, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL2' },
      { id: 'MI3', name: 'Pumpkin Soup', section: 'Lunch', price: 9, custom: true, menuId: 'MENU_ORIGINAL', plateId: 'PL3' },
    ]));
    localStorage.setItem('cafeDB_lastTab', 'analysis');
    localStorage.setItem('__spec_seeded', '1');
  };
}

async function boot(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.addInitScript(seed(), {});
  // THEME_KEY is `cafeCost_theme`, not `cafeDB_*` — this screen's first cut guessed the app's
  // usual prefix and both "dark" shots came out light, which a screenshot-only check would have
  // filed as evidence that dark mode works.
  if (theme) await page.addInitScript((t) => localStorage.setItem('cafeCost_theme', t), theme);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.locator('.navbtn[data-tab="analysis"]').click();
  await page.waitForTimeout(400);
}

const cell = (row, klass) => `#aBody .mnu-row:nth-of-type(${row}) .${klass}`;

test('DESKTOP: the band and the rows share one column grid — figures cannot drift from their headings', async ({ page }) => {
  await boot(page, 1280);
  await expect(page.locator('#aBody .mnu-row')).toHaveCount(3);
  const cols = await page.evaluate(() => {
    const R = el => el.getBoundingClientRect();
    const band = [...document.querySelectorAll('.mnu-band > span')].map(s => R(s));
    const row = document.querySelector('#aBody .mnu-row');
    const cells = ['mnu-id', 'mnu-cost', 'mnu-sug', 'mnu-price', 'mnu-verdict']
      .map(c => R(row.querySelector('.' + c)));
    return { band: band.map(b => [b.left, b.right]), cells: cells.map(c => [c.left, c.right]) };
  });
  expect(cols.band.length, 'five column headings').toBe(5);
  cols.band.forEach(([l, r], i) => {
    expect(Math.abs(l - cols.cells[i][0]), `column ${i} left edge matches its heading`).toBeLessThanOrEqual(1);
    expect(Math.abs(r - cols.cells[i][1]), `column ${i} right edge matches its heading`).toBeLessThanOrEqual(1);
  });
});

test('DESKTOP: the mobile meta prefixes are actually cancelled — the Tier 1 @media specificity trap', async ({ page }) => {
  await boot(page, 1280);
  // The rules that set these live OUTSIDE the media query and the cancels live INSIDE it. If the
  // two ever stop matching in specificity, the cancel silently loses and every desktop row reads
  // "$2.00 cost, suggested $6.67" across two numeric columns. Reading the file cannot catch it.
  const pseudo = await page.evaluate(() => {
    const row = document.querySelector('#aBody .mnu-row');
    return {
      costAfter: getComputedStyle(row.querySelector('.mnu-cost'), '::after').content,
      sugBefore: getComputedStyle(row.querySelector('.mnu-sug'), '::before').content,
    };
  });
  expect(pseudo.costAfter, 'no " cost," suffix on the desktop Cost column').toBe('none');
  expect(pseudo.sugBefore, 'no "suggested " prefix on the desktop Suggested column').toBe('none');
});

test('MOBILE: the meta prefixes ARE applied — the same pair, the other way round', async ({ page }) => {
  await boot(page, 380);
  const pseudo = await page.evaluate(() => {
    const row = document.querySelector('#aBody .mnu-row');
    return {
      costAfter: getComputedStyle(row.querySelector('.mnu-cost'), '::after').content,
      sugBefore: getComputedStyle(row.querySelector('.mnu-sug'), '::before').content,
    };
  });
  // asserting BOTH directions is the point: a cancel that always wins reads as "correct" on
  // desktop while quietly deleting the phone's only explanation of its two numbers
  expect(pseudo.costAfter, 'the phone meta line names its first figure').toContain('cost,');
  expect(pseudo.sugBefore, 'and its second').toContain('suggested');
});

test('MOBILE: §6 row grammar — name over meta on the left, price over the pill on the right', async ({ page }) => {
  await boot(page, 380);
  const g = await page.evaluate(() => {
    const R = s => document.querySelector(s).getBoundingClientRect();
    const row = document.querySelector('#aBody .mnu-row').getBoundingClientRect();
    return {
      row,
      name: R('#aBody .mnu-row .mnu-nm'),
      cost: R('#aBody .mnu-row .mnu-cost'),
      price: R('#aBody .mnu-row .mnu-price'),
      pill: R('#aBody .mnu-row .mnu-verdict'),
    };
  });
  expect(g.row.height, '§6 minimum list-row height').toBeGreaterThanOrEqual(56);
  expect(g.cost.top, 'the meta line sits under the name').toBeGreaterThan(g.name.top);
  expect(g.pill.top, 'the pill sits under the price').toBeGreaterThan(g.price.top);
  expect(g.price.left, 'money is right of the identity').toBeGreaterThan(g.name.right - 1);
  expect(Math.abs(g.price.right - g.pill.right), 'price and pill share the right edge').toBeLessThanOrEqual(2);
});

test('the uncosted row lands in the same columns — dashes on desktop, one honest line on the phone', async ({ page }) => {
  await boot(page, 1280);
  // Pumpkin Soup is row 2 of section Lunch (rows sort by name: Pumpkin Soup, Toastie)
  const d = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#aBody .mnu-row')].find(r => r.classList.contains('muted'));
    const R = c => row.querySelector('.' + c).getBoundingClientRect();
    const first = document.querySelector('#aBody .mnu-row:not(.muted)');
    return {
      found: !!row,
      uncosted: row.querySelector('.mi-uncosted').textContent,
      costText: row.querySelector('.mnu-cost').textContent,
      verdict: row.querySelector('.mnu-verdict').textContent,
      // the dashes must sit in the SAME columns as a costed row's figures, or the two row shapes
      // read as two different tables
      costLeft: R('mnu-cost').left,
      refCostLeft: first.querySelector('.mnu-cost').getBoundingClientRect().left,
      priceLeft: R('mnu-price').left,
      refPriceLeft: first.querySelector('.mnu-price').getBoundingClientRect().left,
    };
  });
  expect(d.found, 'the uncosted row renders').toBe(true);
  expect(d.uncosted).toBe('not costed yet');
  expect(d.costText, 'an honest dash, never $0.00').toContain('—');
  expect(d.verdict.trim(), 'and a dash for the verdict — never a "cost it" pill (R4: no route exists)').toBe('—');
  expect(Math.abs(d.costLeft - d.refCostLeft), 'the Cost dash is in the Cost column').toBeLessThanOrEqual(1);
  expect(Math.abs(d.priceLeft - d.refPriceLeft), 'the price is in the Price column').toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 380, height: 900 });
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#aBody .mnu-row')].find(r => r.classList.contains('muted'));
    const vis = c => getComputedStyle(row.querySelector('.' + c)).display !== 'none';
    return { cost: vis('mnu-cost'), sug: vis('mnu-sug'), note: vis('mi-uncosted') };
  });
  expect(m.note, 'the phone says "not costed yet"').toBe(true);
  expect(m.cost, 'and does NOT also read "— cost,"').toBe(false);
  expect(m.sug, 'or "suggested —"').toBe(false);
});

/* 225. THE POINT OF THE WHOLE CHANGE, AND IT EXISTS NOWHERE BUT IN A BROWSER.
   The row is one button, so its accessible name is its cells concatenated — which made
   "Roast $3.00 $10.00 $7.00 food cost 42.9% — well over your target" out of four figures that mean
   four different things. The band above the rows is `aria-hidden` and correctly so: announcing a
   floating header row of five words before every row labels nothing.
   Chromium computes this name for real, including generated content, which is why the assertion is
   here rather than in the unit suite: `npm test` can read the emitted HTML and CANNOT tell you what
   is spoken. The mobile half is the one no other check can reach — below 768 the meta line PRINTS
   " cost, " and "suggested " through `::after`/`::before`, so if the spoken copy did not stand down
   the row would say "cost" twice, silently, on a phone. */
test('DESKTOP: the row announces WHICH figure is which', async ({ page }) => {
  await boot(page, 1360);
  const row = page.locator('#aBody .mnu-row', { hasText: 'Roast' }).first();
  const name = await row.evaluate((el) => el.ariaLabel || null);
  expect(name, 'no aria-label — the name must come from the cells, or the figures go silent').toBe(null);
  await expect(row, 'name, then each figure behind the word for its column')
    .toHaveAccessibleName(/Roast\s+cost\s+\$3\.00\s+suggested\s+\$10\.00\s+price\s+\$7\.00\s+food cost/);
});

test('MOBILE: the phone PRINTS two of those words, so the spoken copy must not repeat them', async ({ page }) => {
  await boot(page, 380);
  const row = page.locator('#aBody .mnu-row', { hasText: 'Roast' }).first();
  const spoken = await page.evaluate(() => {
    const r = [...document.querySelectorAll('#aBody .mnu-row')].find((x) => /Roast/.test(x.textContent));
    return { cost: getComputedStyle(r.querySelector('.mnu-cost'), '::after').content,
             hidden: getComputedStyle(r.querySelector('.mnu-cost .sr-only')).display };
  });
  expect(spoken.cost, 'the phone prints the word').toMatch(/cost/);
  expect(spoken.hidden, 'so the spoken copy stands down').toBe('none');
  /* and the DOM half: "cost" is in the row's TEXT exactly once (the suppressed label). The printed
     copy is generated content, which textContent cannot see — so one here plus one printed is the
     two the row is allowed, and a second in the text would be the doubling this rule forbids. */
  const acc = await row.evaluate((el) => el.textContent);
  expect((acc.match(/cost/g) || []).length, 'exactly one "cost" in the row text — the label, not a duplicate').toBe(1);
  await expect(row, 'price is spoken here too: nothing else ever labels that cell')
    .toHaveAccessibleName(/price\s+\$7\.00/);
});

test('the whole row is ONE button: Enter opens the editor, and the focus ring is not clipped away', async ({ page }) => {
  await boot(page, 1280);
  const row = page.locator('#aBody .mnu-row').first();
  expect(await row.evaluate(el => el.tagName), '§2: the row IS the button').toBe('BUTTON');
  expect(await row.evaluate(el => el.querySelectorAll('button').length), 'no nested control').toBe(0);
  // TAB to it, never `.focus()`. A programmatic focus does not satisfy `:focus-visible` in
  // Chromium — measured, not assumed: the first cut of this test called `.focus()` and read
  // `outline-style:none`, which looks exactly like a missing ring and is not one. Tabbing is also
  // the thing being tested: what a keyboard user actually gets.
  await page.locator('#menuSearch').focus();
  for (let i = 0; i < 12 && !(await page.evaluate(() => document.activeElement.classList.contains('mnu-row'))); i++) {
    await page.keyboard.press('Tab');
  }
  const ring = await page.evaluate(() => {
    const el = document.activeElement;
    const cs = getComputedStyle(el);
    return { onRow: el.classList.contains('mnu-row'), style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset };
  });
  expect(ring.onRow, 'Tab reaches the row — it is in the tab order at all').toBe(true);
  expect(ring.style, '§7: a visible focus ring on every interactive').toBe('solid');
  expect(parseFloat(ring.width), 'and it has width').toBeGreaterThan(0);
  // inset, or the ring dies inside the container's overflow:hidden — the v123 defect, caught then
  // by review rather than by a spec
  expect(parseFloat(ring.offset), 'the ring is inset so the container cannot clip it').toBeLessThan(0);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await expect(page.locator('#editModal')).toBeVisible();
});

test('the verdict pill spans all three lights and is the rightmost thing in the row', async ({ page }) => {
  await boot(page, 1280);
  const v = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#aBody .mnu-row')];
    return rows.map((r) => {
      const p = r.querySelector('.mnu-verdict .vbadge') || r.querySelector('.mnu-verdict .muted-dash');
      const rr = r.getBoundingClientRect();
      const pr = p.getBoundingClientRect();
      const cells = [...r.children].map(c => c.getBoundingClientRect().right);
      return {
        cls: p.className,
        tinted: getComputedStyle(p).backgroundColor,
        rightmost: Math.max(...cells) - pr.right < 1.5,
        insideRow: pr.right <= rr.right + 1,
      };
    });
  });
  const classes = v.map(x => x.cls).join(' ');
  expect(classes, 'the good pair renders').toContain('vgood');
  expect(classes, 'the bad pair renders').toContain('vbad');
  expect(classes, 'and the uncosted dash is not a pill at all').toContain('muted-dash');
  v.forEach((x, i) => {
    expect(x.rightmost, `row ${i}: the status pill is rightmost (§4 row grammar)`).toBe(true);
    expect(x.insideRow, `row ${i}: it does not overhang the row`).toBe(true);
  });
  const pills = v.filter(x => x.cls.includes('vbadge'));
  pills.forEach((p, i) => expect(p.tinted, `pill ${i} is tinted, not bare text`).not.toBe('rgba(0, 0, 0, 0)'));
});

test('every colour in the screen comes from a token — zero hard-coded hex (protocol §6)', async ({ page }) => {
  // §6 makes this self-enforcing and mechanical: any literal hex in a converted screen's rules is
  // a dark-mode bug by construction. Checked against the SOURCE, because a computed style is
  // resolved and cannot tell a token from a literal.
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(__dirname, '..', '..', 'css', 'style.css'), 'utf8');
  const start = css.indexOf('31. F5 (v142) — THE MENU SCREEN, REBUILT FROM THE v3 MOCK');
  expect(start, 'the F5 section is findable').toBeGreaterThan(-1);
  const end = css.indexOf('v137 (F1b) — THE MODAL / SHEET PRIMITIVE', start);
  const section = css.slice(start, end > start ? end : css.length);
  const body = section.replace(/\/\*[^]*?\*\//g, '');   // comments may name a hex when quoting the mock
  const hex = body.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  expect(hex, `hard-coded hex in the Menu screen's rules: ${hex.join(', ')}`).toEqual([]);
});

for (const theme of ['light', 'dark']) {
  for (const size of [{ name: 'mobile', w: 380 }, { name: 'desktop', w: 1280 }]) {
    test(`shot: menu ${theme} @ ${size.name}`, async ({ page }) => {
      await boot(page, size.w, theme);
      await page.evaluate(() => {
        ['.install-banner', '#syncBanner', '.sync-banner'].forEach((s) => {
          const e = document.querySelector(s); if (e) e.remove();
        });
      });
      // assert the theme actually took — a screenshot cannot fail, and a mis-keyed preference
      // renders a perfectly good LIGHT page under a filename that says dark
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
        'the requested theme is the applied theme').toBe(theme);
      await page.locator('#tab-analysis .panel').screenshot({
        path: `tests/visual/__shots__/v142-menu-${theme}-${size.name}.png`,
      });
    });
  }
}
