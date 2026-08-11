/*
 * v155-trend.spec.js — the Dashboard trend, queue item "Dashboard trend polish".
 *
 * Three changes, each of which reverses something that was deliberate when it was written, which is
 * why each is pinned rather than left to read correctly in the file:
 *
 *  - THE TREND IS A CARD. F6 (v143) deliberately gave it no container, quoting the mock: its trend
 *    really is a bare <section> while "Needs attention" beside it is bordered. Max reversed that on
 *    12 Aug 2026 having seen the built screen. Pinned against a SIBLING card rather than against a
 *    hard-coded border value, so the assertion means "it matches its neighbours" — which is the
 *    actual requirement — instead of "it has 1px of something".
 *  - THE X-AXIS IS BACK. v48 removed it as declutter ("the range buttons state the window; the scrub
 *    tooltip gives exact dates"). Both halves are answered by the item: the range buttons name a
 *    window but never which dates, so 3M and 1Y draw the same picture; and a hover tooltip is
 *    nothing at all on a phone. fresh-states.spec.js pins the COUNT across every range; what is
 *    pinned here is the geometry that count cannot see — that the end labels stay inside the viewBox.
 *  - THE ACTIVE RANGE PILL IS NOT ORANGE. It was --accent-weak/--accent-ink, putting a third accent
 *    hue in a section that already carries a semantic line colour and orange intervention markers.
 *    The markers STAY orange (they mean "you did this"); the control is what stops competing.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

const DAY = 86400000;

async function boot(page, w) {
  await page.setViewportSize({ width: w || 1360, height: 1000 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('.install-banner'); if (b) b.remove(); });
  // a real series, so the plot actually draws — every assertion below is vacuous on the empty state
  await page.evaluate((d) => {
    const now = Date.now();
    const vals = [38.2, 39.1, 40.4, 41.2, 40.8, 39.6, 38.9, 39.4, 40.1, 41.5, 42.2, 41.0];
    window.priceHistory = vals.map((v, i) => ({ t: new Date(now - (vals.length - 1 - i) * 7 * d).toISOString(), v }));
    window.showTab('dashboard');
  }, DAY);
  await page.waitForTimeout(600);
}

test('the trend wears the same card as its neighbours, with the range control in the header band', async ({ page }) => {
  await boot(page);
  const m = await page.evaluate(() => {
    const trend = document.querySelector('#dashBody .dash-trend');
    const sibling = document.querySelector('#dashBody .dash-dig') || document.querySelector('#dashBody .dash-moved');
    const cs = (e) => getComputedStyle(e);
    const head = trend.querySelector('.ds-head');
    const range = trend.querySelector('.range-bar');
    return {
      border: cs(trend).borderBottomWidth, siblingBorder: cs(sibling).borderBottomWidth,
      radius: cs(trend).borderTopLeftRadius, siblingRadius: cs(sibling).borderTopLeftRadius,
      headBg: cs(head).backgroundColor, siblingHeadBg: cs(sibling.querySelector('.ds-head')).backgroundColor,
      headBorder: cs(head).borderBottomWidth,
      rangeInHead: !!range && head.contains(range),
      // the control sits on the header's baseline, not stacked under it, at desktop
      headRows: !!range && Math.abs(range.getBoundingClientRect().top - head.getBoundingClientRect().top) < head.getBoundingClientRect().height,
    };
  });
  expect(m.rangeInHead, 'the range control lives in the card header').toBe(true);
  expect(m.border, 'the trend is bordered like its neighbour').toBe(m.siblingBorder);
  expect(m.border).not.toBe('0px');
  expect(m.radius, 'and shares its corner radius').toBe(m.siblingRadius);
  expect(m.headBg, 'and its header band is the same tint').toBe(m.siblingHeadBg);
  expect(m.headBorder, 'the band divides itself from the plot').toBe('1px');
  expect(m.headRows, 'at desktop the control is on the title row, not a second one').toBe(true);
});

test('the x-axis labels stay inside the viewBox at both ends', async ({ page }) => {
  await boot(page);
  const m = await page.evaluate(() => {
    const svg = document.querySelector('#trendWrap svg');
    const vb = svg.getAttribute('viewBox').split(/\s+/).map(Number);
    const xs = Array.from(svg.querySelectorAll('text.ax-x'));
    return {
      vbW: vb[2],
      labels: xs.map((t) => ({ text: t.textContent, x: Number(t.getAttribute('x')), anchor: t.getAttribute('anchor') || t.getAttribute('text-anchor') })),
      // measured, not assumed: an overhanging label is clipped, and its rendered box is what shows it
      boxes: xs.map((t) => { const b = t.getBBox(); return { left: b.x, right: b.x + b.width }; }),
    };
  });
  expect(m.labels.length, 'the axis is labelled at all').toBeGreaterThanOrEqual(2);
  expect(m.labels[0].anchor, 'the first label is start-anchored, or it overhangs x=0').toBe('start');
  expect(m.labels[m.labels.length - 1].anchor, 'and the last is end-anchored').toBe('end');
  for (let i = 0; i < m.boxes.length; i++) {
    expect(m.boxes[i].left, `"${m.labels[i].text}" does not overhang the left edge`).toBeGreaterThanOrEqual(-0.5);
    expect(m.boxes[i].right, `"${m.labels[i].text}" does not overhang the right edge`).toBeLessThanOrEqual(m.vbW + 0.5);
  }
  const texts = m.labels.map((l) => l.text);
  expect(new Set(texts).size, 'no label is drawn twice — a repeat reads as a broken axis').toBe(texts.length);
});

test('the marker labels and the x-axis are two rows, not one', async ({ page }) => {
  /* The marker label is centred on its own x and an axis tick on a reading, so on a sparse series
     they collide whenever an intervention lands near a tick. Growing padB to stack them is what made
     the x-axis possible; if a later change shrinks it back they silently overprint. */
  await boot(page);
  const rows = await page.evaluate(() => {
    const svg = document.querySelector('#trendWrap svg');
    const y = (sel) => Array.from(svg.querySelectorAll(sel)).map((t) => Number(t.getAttribute('y')));
    return { mk: y('text.mk-lbl'), ax: y('text.ax-x') };
  });
  if (rows.mk.length) {
    for (const my of rows.mk) {
      for (const ay of rows.ax) {
        expect(Math.abs(my - ay), 'a marker label and an axis date never share a baseline').toBeGreaterThanOrEqual(8);
      }
    }
  }
  expect(rows.ax.length, 'the axis row exists').toBeGreaterThan(0);
});

test('the active range pill carries no accent hue — the markers own orange', async ({ page }) => {
  await boot(page);
  const m = await page.evaluate(() => {
    const act = document.querySelector('.range-btn.act');
    const idle = document.querySelector('.range-btn:not(.act)');
    const cs = (e) => getComputedStyle(e);
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const tok = (name) => { probe.style.color = `var(${name})`; return getComputedStyle(probe).color; };
    const accent = tok('--accent');
    const accentInk = tok('--accent-ink');
    const accentWeak = (() => { probe.style.background = 'var(--accent-weak)'; return getComputedStyle(probe).backgroundColor; })();
    probe.remove();
    return {
      actBg: cs(act).backgroundColor, actFg: cs(act).color, actBorder: cs(act).borderBottomWidth,
      idleBorder: cs(idle).borderBottomWidth,
      accent, accentInk, accentWeak,
    };
  });
  expect(m.actBg, 'the selected range is not tinted with the accent').not.toBe(m.accentWeak);
  expect(m.actFg, 'nor lettered in it').not.toBe(m.accentInk);
  expect(m.actFg).not.toBe(m.accent);
  /* every button carries the border, or selecting one would grow it by 2px and shuffle the bar —
     the reason the transparent border is on `.range-btn` and not added to `.act` */
  expect(m.actBorder, 'the selected pill is outlined').toBe(m.idleBorder);
  expect(m.actBorder).not.toBe('0px');
});

test('the y-domain is fitted to the data, not collapsed against the target', async ({ page }) => {
  /* Shipped in v145 and pinned here because this batch moved the plot into a card and grew its
     bottom band — both change H, which every y value derives from. */
  await boot(page);
  const ticks = await page.evaluate(() => Array.from(document.querySelectorAll('#trendWrap text.ax:not(.ax-x)'))
    .map((t) => parseFloat(t.textContent)));
  expect(ticks.length, '3–4 y ticks').toBeGreaterThanOrEqual(3);
  const lo = Math.min(...ticks), hi = Math.max(...ticks);
  // the seeded series runs 38.2–42.2 against a 40% target
  expect(lo, 'the axis floor sits near the data, not at zero').toBeGreaterThan(30);
  expect(hi - lo, 'and the domain hugs the series rather than spanning a coarse step').toBeLessThanOrEqual(10);
  expect(ticks, 'the target sits on a labelled tick').toContain(40);
});
