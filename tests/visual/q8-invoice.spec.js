/*
 * q8-invoice.spec.js — Q8 (v127). The invoice review's tick persistence and verdict, behaviourally.
 * Locks THE BUG this batch fixes: a tick the user placed on a review row survives a full re-render
 * triggered elsewhere on the sheet (the v50/v52 loss), and an untick on a matched row survives too.
 * Plus: the verdict sentence, the live "Confirm N changes" footer, and the warn tint on review rows.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const SEED = () => {
  window.invRows = [
    { name: 'CHIPS STRAIGHT CUT 6X2.5KG', raw: 'CHIPS STRAIGHT CUT 6X2.5KG', bestId: 'P0108',
      unitPrice: 2.68, unit: 'kg', conf: 0.82, tier: 'hi', cands: [{ id: 'P0108', coverage: 0.82 }],
      addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
    { name: 'MILK FULL CREAM 2L', raw: 'MILK FULL CREAM 2L', bestId: 'P0201',
      unitPrice: 9.99, unit: 'l', conf: 0.9, tier: 'hi', cands: [{ id: 'P0201', coverage: 0.9 }],
      addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
    { name: 'CHEESE TASTY SHRED 2KG', raw: 'CHEESE TASTY SHRED 2KG', bestId: 'P0031',
      unitPrice: 4.1, unit: 'kg', conf: 0.5, tier: 'mid', cands: [{ id: 'P0031', coverage: 0.5 }],
      addNew: false, manualPick: false, needManual: false, unitMismatch: false, uncertain: false, remembered: false },
  ];
  window.invRows.forEach(window.flagNeedsAttention);
  window.renderInvReview();
  document.getElementById('invModal').classList.add('open');
};

test('a user tick on a review row survives a re-render caused elsewhere', async ({ page }) => {
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1500);
  await page.evaluate(SEED);
  await page.waitForTimeout(300);

  const rows = page.locator('#invReview tr.inv-data');
  // baseline: verdict copy + footer count + tint + the auto-tick law
  const base = await page.evaluate(() => ({
    sum: document.querySelector('.inv-sum').textContent,
    btn: document.getElementById('invApply').textContent,
    reviewTint: getComputedStyle(document.querySelector('tr.st-review')).backgroundColor,
    ticks: [...document.querySelectorAll('.invAppr')].map(c => c.checked),
    states: [...document.querySelectorAll('tr.inv-data')].map(tr => tr.className.match(/st-(\w+)/)[1]),
  }));
  expect(base.sum).toContain('matched and ready');
  expect(base.sum).toContain('your eye');
  // the auto-tick law, derived from the real states (row 1's 9.99 trips the price-change flag → review)
  expect(base.states[0], 'row 0 is the clean matched row').toBe('matched');
  expect(base.states[2], 'row 2 is review (mid tier)').toBe('review');
  expect(base.ticks, 'pre-ticks equal the matched rows exactly').toEqual(base.states.map(st => st === 'matched'));
  const preCount = base.ticks.filter(Boolean).length;
  expect(base.btn, 'footer counts the pre-ticks').toBe('Confirm ' + preCount + ' change' + (preCount === 1 ? '' : 's'));
  // the EXACT warn wash — before v127 these price-change rows painted --bad-bg via the old
  // needs-attention duplicate rule, which outranked st-review; reverting either fix repaints red
  expect(base.reviewTint, 'review rows wear WARN, not the old red').toBe('rgba(169, 98, 6, 0.12)');

  // the user ticks the review row
  await rows.nth(2).locator('.invAppr').check();
  await page.waitForTimeout(100);
  const afterTick = await page.evaluate(() => document.getElementById('invApply').textContent);
  expect(afterTick).toBe('Confirm ' + (preCount + 1) + ' change' + (preCount + 1 === 1 ? '' : 's'));

  // ...and unticks a matched row
  await rows.nth(0).locator('.invAppr').uncheck();
  await page.waitForTimeout(100);

  // a SELF-edit resets the row's own tick to the state default: blank the ticked review row's price
  await rows.nth(2).locator('.invPrice').fill('');
  await rows.nth(2).locator('.invPrice').dispatchEvent('change');
  await page.waitForTimeout(300);
  const selfEdit = await page.evaluate(() => document.querySelectorAll('.invAppr')[2].checked);
  expect(selfEdit, 'blanking the price un-ticks — a ticked-but-unappliable row would lie to the footer').toBe(false);
  // re-tick it for the cross-row test below
  await rows.nth(2).locator('.invPrice').fill('4.10');
  await rows.nth(2).locator('.invPrice').dispatchEvent('change');
  await page.waitForTimeout(300);
  await rows.nth(2).locator('.invAppr').check();
  await page.waitForTimeout(100);

  // now a FULL re-render fires from a different row: edit row 1's price (change event → renderInvReview)
  await rows.nth(1).locator('.invPrice').fill('8.50');
  await rows.nth(1).locator('.invPrice').dispatchEvent('change');
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => ({
    ticks: [...document.querySelectorAll('.invAppr')].map(c => c.checked),
    btn: document.getElementById('invApply').textContent,
  }));
  expect(after.ticks[2], 'THE BUG: the tick the user placed on the review row survived the rebuild').toBe(true);
  expect(after.ticks[0], 'and the untick on the matched row survived too').toBe(false);
  const midState = await page.evaluate(() => document.querySelectorAll('tr.inv-data')[1].className.match(/st-(\w+)/)[1]);
  expect(after.ticks[1], 'the edited row follows its own state default').toBe(midState === 'matched');
  const expected = (after.ticks.filter(Boolean).length);
  expect(after.btn, 'the footer recounted after the rebuild').toBe('Confirm ' + expected + ' change' + (expected === 1 ? '' : 's'));

  // changing the MATCH on the ticked row clears the user decision (the tick approved a different application)
  await rows.nth(2).locator('.invSel').selectOption({ index: 1 }).catch(() => {});
  await page.waitForTimeout(300);
  const cleared = await page.evaluate(() => [...document.querySelectorAll('.invAppr')].map(c => c.checked));
  // whatever the new state derives, it must be the STATE default, not the stale tick — row 2 was mid-tier;
  // a manual pick shows 'manual' confidence and (if the new state is matched) may legitimately pre-tick.
  const st = await page.evaluate(() => [...document.querySelectorAll('tr.inv-data')].map(tr => tr.className.match(/st-(\w+)/)[1]));
  expect(cleared[2]).toBe(st[2] === 'matched');
  expect(errs, errs.join('|')).toHaveLength(0);
});
