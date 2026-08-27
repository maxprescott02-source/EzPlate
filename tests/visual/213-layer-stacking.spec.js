/*
 * 213-layer-stacking.spec.js — `docs/QUEUE.md` item 6, "a dropdown's middle band is unclickable
 * behind the builder's summary bar".
 *
 * WHY THIS IS A BROWSER SPEC AND NOT A UNIT TEST. The defect is PAINT ORDER, and paint order is
 * invisible to every tool this repo has except a real browser. `tests/visual/212-layers.spec.js`
 * asserts `getBoundingClientRect()` and passed throughout the whole life of this bug, because the
 * rectangles were always right — the pixels were owned by something else. So every assertion here
 * is `document.elementFromPoint`, asking who actually receives a tap.
 *
 * THE DEFECT. `position:fixed` escapes CLIPPING but not STACKING CONFINEMENT. A z-index orders
 * siblings within a stacking context and never across the boundary of an ancestor that established
 * one, so both builder layers were pinned at their ancestor's level (`#drop` inside `.bld-docket`,
 * a context via `filter:drop-shadow`; `#plateSuggest` inside `.bld-head{z-index:2}`) and lost to
 * opaque chrome carrying a LOWER z-index than their own. Measured at 380x640 before the fix:
 * `.bld-bar` (z-index:25, holding Save plate) owned 8 of 25 sampled points of `#drop` and 4 of 25
 * of `#plateSuggest`.
 *
 * ⚠️ AND THE FIX THE ITEM PRESCRIBED WAS THE WRONG ONE — built, measured, and reverted. Subtracting
 * the furniture from `dropBox`'s soft bound makes 380x640 WORSE: the list flips up to clear
 * `.bld-bar` and lands under `.bld-head` instead, 12 of 20 points covered. Trading one stacking
 * context for another is not a fix, so the layer is reparented to <body> on open instead.
 *
 * The three viewports are not decoration. 640 is where `.bld-bar` sat over the list; 420 stands in
 * for a phone with the keyboard up, where the item's prescribed fix failed a second and different
 * way; 780 is the case that already worked and must keep working.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  localStorage.clear();
  localStorage.setItem('cafeDB_menus', JSON.stringify([{ id: 'M1', name: 'Winter Menu' }]));
  localStorage.setItem('cafeDB_cogsPct', '40');
  const plates = [];
  for (let i = 1; i <= 12; i++) {
    plates.push({ id: 'PL' + i, name: 'Fish plate ' + i, category: 'Mains', lines: [{ kid: 'K1', qty: 350, uid: i }] });
  }
  localStorage.setItem('cafeDB_plates', JSON.stringify(plates));
};

async function openTheBuilder(page, w, h) {
  await page.setViewportSize({ width: w, height: h });
  await installBoot(page);
  await page.route('**/api/**', (r) => r.abort());
  await page.addInitScript(SEED);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    for (let i = 1; i <= 60; i++) window.kitchenIngredients.push({ id: 'K' + i, name: 'Chip variety ' + i, pid: 'P0108' });
    window.rebuildKById();
  });
  await page.locator('.navbtn[data-tab="builder"]').click();
  await page.waitForTimeout(300);
  await page.locator('#plateList .plib-row').first().click();
  await page.waitForTimeout(500);
}

/* Walks the layer's own box and asks who owns each point. Returns the anchor's rect too, so the
   "not covered" claim cannot be satisfied by a layer that rendered somewhere useless. */
const SCAN = ([id, anchorId]) => {
  const el = document.getElementById(id);
  const anchor = document.getElementById(anchorId);
  const r = el.getBoundingClientRect();
  const ar = anchor.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const covered = [];
  let total = 0;
  for (let y = Math.ceil(r.top) + 4; y < r.bottom - 2; y += 10) {
    const hit = document.elementFromPoint(x, y);
    total++;
    if (!hit || !el.contains(hit)) covered.push({ y: Math.round(y), hit: hit ? String(hit.className || hit.tagName) : 'null' });
  }
  return {
    total, covered, opts: el.querySelectorAll('.opt, .sug-opt').length,
    h: Math.round(r.height),
    top: Math.round(r.top), bottom: Math.round(r.bottom),
    anchorTop: Math.round(ar.top), anchorBottom: Math.round(ar.bottom),
    coversItsOwnField: r.top < ar.bottom && r.bottom > ar.top,
    insideViewport: r.top >= -1 && r.bottom <= window.innerHeight + 1,
    scrollable: el.scrollHeight > el.clientHeight + 1,
    parentIsBody: el.parentElement === document.body,
  };
};

for (const [w, h] of [[380, 640], [380, 420], [380, 780]]) {
  test(`the ingredient dropdown owns every one of its own pixels @${w}x${h}`, async ({ page }) => {
    await openTheBuilder(page, w, h);
    await page.locator('#q').click();
    await page.locator('#q').type('chip', { delay: 12 });
    await page.waitForTimeout(400);
    const m = await page.evaluate(SCAN, ['drop', 'q']);

    expect(m.opts, 'there is a list on screen to be covered').toBeGreaterThan(4);
    expect(m.total, 'the scan actually sampled the layer').toBeGreaterThan(8);
    // THE COMPLAINT. Before the fix this was 8 of 25 at 640, owned by .bld-bar.
    expect(m.covered, `these points are owned by something else: ${JSON.stringify(m.covered)}`).toEqual([]);
    // and it did not "win" by rendering somewhere useless
    expect(m.coversItsOwnField, 'the list does not sit on top of the field it belongs to').toBe(false);
    expect(m.insideViewport, 'and it is inside the viewport').toBe(true);
    expect(m.h, 'and it is a usable size').toBeGreaterThan(80);
  });

  test(`the plate-name suggestions own every one of their own pixels @${w}x${h}`, async ({ page }) => {
    await openTheBuilder(page, w, h);
    await page.locator('#plateName').click();
    await page.locator('#plateName').fill('');
    await page.locator('#plateName').type('Fish', { delay: 12 });
    await page.waitForTimeout(400);
    const m = await page.evaluate(SCAN, ['plateSuggest', 'plateName']);

    expect(m.opts, 'there are suggestions on screen').toBeGreaterThan(4);
    expect(m.total, 'the scan actually sampled the layer').toBeGreaterThan(8);
    expect(m.covered, `these points are owned by something else: ${JSON.stringify(m.covered)}`).toEqual([]);
    expect(m.coversItsOwnField, 'the list does not sit on top of the field it belongs to').toBe(false);
    expect(m.insideViewport, 'and it is inside the viewport').toBe(true);
  });
}

/* THE OTHER HALF OF A PORTAL, and the one that bites later rather than now: a layer moved to <body>
   and never moved back is a stray absolutely-positioned element in the document, and the next render
   of its real home does not know it exists. Both layers are checked home AND checked that <body> is
   not accumulating copies after several open/close cycles. */
test('a portaled layer goes back exactly where it came from, and body does not accumulate', async ({ page }) => {
  await openTheBuilder(page, 380, 640);

  const home = await page.evaluate(() => ({
    drop: document.getElementById('drop').parentElement.className,
    suggest: document.getElementById('plateSuggest').parentElement.className,
    bodyDrops: document.querySelectorAll('body > .drop, body > .suggest-drop').length,
  }));
  expect(home.bodyDrops, 'nothing is portaled before anything opens').toBe(0);

  for (let i = 0; i < 3; i++) {
    await page.locator('#q').click();
    await page.locator('#q').type('chip', { delay: 5 });
    await page.waitForTimeout(250);
    expect(await page.evaluate(() => document.getElementById('drop').parentElement === document.body),
      'while open it is a body child, which is the whole point').toBe(true);
    /* ⚠️ CLEAR FIRST, THEN CLOSE, and the order is the whole reason this comment exists. `.fill('')`
       runs renderDrop with an empty query, which takes the NO-MATCH branch — and that branch OPENS
       the layer rather than closing it (it carries the "no match" message and its action). Closing
       before clearing therefore left the drop open and portaled, and the first draft of this test
       read that as the layer failing to go home. */
    await page.locator('#q').fill('');
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  const after = await page.evaluate(() => ({
    drop: document.getElementById('drop').parentElement.className,
    suggest: document.getElementById('plateSuggest').parentElement.className,
    bodyDrops: document.querySelectorAll('body > .drop, body > .suggest-drop').length,
    dropCount: document.querySelectorAll('#drop').length,
  }));
  expect(after.drop, 'the dropdown is back in its search wrap').toBe(home.drop);
  expect(after.bodyDrops, 'and body is not accumulating stray layers').toBe(0);
  expect(after.dropCount, 'and there is still exactly one of it').toBe(1);
});

/* Picking an option must still WORK once the layer is a body child — the outside-click closer keys
   off `closest('.search-wrap')`, which a portaled layer is no longer inside. It survives because the
   option handler is a `mousedown` on #drop itself rather than a delegate on an ancestor, and that is
   a fact about the code worth pinning rather than assuming. */
test('picking an option still adds the line once the layer is portaled', async ({ page }) => {
  await openTheBuilder(page, 380, 640);
  const before = await page.evaluate(() => document.querySelectorAll('#lines .bld-row').length);
  await page.locator('#q').click();
  await page.locator('#q').type('chip', { delay: 12 });
  await page.waitForTimeout(400);
  await page.locator('#drop .king-opt').first().click();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    lines: document.querySelectorAll('#lines .bld-row').length,
    open: document.getElementById('drop').classList.contains('open'),
    parent: document.getElementById('drop').parentElement.className,
  }));
  expect(after.lines, 'the ingredient was added to the plate').toBe(before + 1);
  expect(after.open, 'and the dropdown closed').toBe(false);
  expect(after.parent, 'and the layer went home').toContain('search-wrap');
});
