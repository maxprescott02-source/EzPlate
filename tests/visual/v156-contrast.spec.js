/*
 * v156-contrast.spec.js — the semantic pill pairs clear WCAG AA in BOTH themes.
 *
 * Written because the pairing was REPORTED as failing in dark mode ("red-on-dark-red must pass
 * 4.5:1") and it does not — measured 5.50:1. Pinning the measurement is worth more than the fix that
 * was not needed: these are the only colour pairs in the app where foreground and background are
 * both semantic tokens, so a palette edit can break them without touching a single rule that
 * mentions contrast, and nothing else in the suite would notice.
 *
 * v3 §7 requires AA on every pill fg/bg pair. The ratios are computed here rather than asserted as
 * hex, so the test follows the tokens instead of restating them — swapping `--danger` for a new red
 * re-runs the maths rather than needing this file edited.
 *
 * ⚠ THE PROBE READS COMPUTED VALUES, not the stylesheet text. `--danger` resolves differently under
 * `html[data-theme="dark"]`, and reading the declaration would give whichever one happened to be
 * written first. The theme is switched on the real document and the values re-read each time.
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

// WCAG 2.1 relative luminance and contrast ratio
function luminance([r, g, b]) {
  const f = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
}
function contrast(a, b) {
  const l1 = luminance(a), l2 = luminance(b);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
const rgb = (s) => s.match(/\d+/g).slice(0, 3).map(Number);

// every fg/bg token pair the app renders as a tinted pill
const PAIRS = [
  ['a price rise', '--danger', '--danger-bg'],
  ['a price fall', '--good', '--good-bg'],
  ['a warning', '--warn', '--warn-bg'],
];

for (const theme of ['light', 'dark']) {
  test(`the semantic pills clear AA in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1200);
    await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme);

    const resolved = await page.evaluate((pairs) => {
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const out = {};
      for (const [name, fgTok, bgTok] of pairs) {
        probe.style.cssText = '';
        probe.style.color = `var(${fgTok})`;
        probe.style.backgroundColor = `var(${bgTok})`;
        const cs = getComputedStyle(probe);
        out[name] = { fg: cs.color, bg: cs.backgroundColor, fgTok, bgTok };
      }
      probe.remove();
      return out;
    }, PAIRS);

    for (const [name, v] of Object.entries(resolved)) {
      // a token that does not resolve computes to transparent/black and would pass or fail by luck
      expect(v.fg, `${v.fgTok} resolves`).not.toBe('rgba(0, 0, 0, 0)');
      expect(v.bg, `${v.bgTok} resolves`).not.toBe('rgba(0, 0, 0, 0)');
      const ratio = contrast(rgb(v.fg), rgb(v.bg));
      expect(ratio, `${name} (${v.fgTok} on ${v.bgTok}) = ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

test('the pills are token-driven — no hard-coded hex on the semantic classes', async ({ page }) => {
  /* The other half of the report: "use the --danger/--good tokens, not hard-coded hex". They already
     do, and this is what keeps it true — a literal here would freeze one theme's colour into both. */
  await page.setViewportSize({ width: 1440, height: 900 });
  await installBoot(page);
  await page.goto('/');
  await page.waitForTimeout(1200);

  const literals = await page.evaluate(() => {
    const bad = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      const walk = (rs) => {
        for (const r of rs) {
          if (r.cssRules) { walk(r.cssRules); continue; }
          if (!r.selectorText) continue;
          if (!/\.(ing-drift|king-drift|dig-v|verdict|fc-pill)\b/.test(r.selectorText)) continue;
          const t = r.style.cssText || '';
          if (/#[0-9a-fA-F]{3,8}\b/.test(t)) bad.push(`${r.selectorText} { ${t.slice(0, 80)} }`);
        }
      };
      walk(rules);
    }
    return bad;
  });
  expect(literals, 'semantic pill rules must resolve their colour from tokens').toEqual([]);
});
