/*
 * v136-theme.spec.js — dark mode, measured in a real browser.
 *
 * Dark returned in v136 (F1a) after v132 removed it. The unit tests pin the MECHANISM (the
 * resolver writes an explicit attribute; every :root colour literal has a dark counterpart)
 * and the smoke run pins the PREFERENCE (stored vs applied). Neither can see a pixel, and
 * dark mode's characteristic failure is visual and silent: one rule that kept a light value
 * looks almost right until you hit the row it ruins.
 *
 * So this spec measures COMPUTED COLOUR in a real engine, and every assertion is written as a
 * relationship (text is lighter than its background) rather than as an expected hex. A hex
 * pin would have to be rewritten every time the palette moves and would tell you nothing about
 * whether the screen is readable.
 *
 * It also pins the two things most likely to be undone by a later batch, both of which shipped
 * as deliberate decisions with measurements behind them:
 *   - ink on a FILLED control flips with the theme (the mock hardcodes #FFFFFF, which measures
 *     2.54:1 on its own dark accent),
 *   - the theme is applied by an EXPLICIT attribute, never by a CSS media query.
 *
 * Run: npx playwright test tests/visual/v136-theme.spec.js
 */
const { test, expect } = require('@playwright/test');
const { installBoot } = require('./_boot');

/* Relative luminance + WCAG contrast, computed from whatever the engine actually resolved.
   Parses the rgb()/rgba() strings getComputedStyle returns. */
function parse(css) {
  const m = String(css).match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
function lum(c) {
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrast(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* The seed runs on EVERY navigation, reloads included, so a bare localStorage.clear() would
   wipe the theme preference before the <head> resolver could read it — and the persistence
   test would fail against correct code. Carry the one key across the reset: the clear is here
   to simulate a fresh install, not to simulate a reload.

   It also seeds REAL DATA, and that is load-bearing rather than convenience. _boot.js serves
   menus/plates/menu_items out of localStorage at query time, so a seed that only cleared it
   left four of the five tabs on their empty states — and a sweep over an empty DOM finds
   nothing and passes. Every element the semantic tokens colour (verdict pills, drift badges,
   status dots, chart, group rows) only exists once there is something to render. Same reason
   v98-grid.spec.js seeds: so the checks "must not pass vacuously on an absent region".

   TWO HONEST LIMITS, so nobody reads more coverage into this than it has:
   - The **Ingredients** tab (`pantry`) still sweeps an EMPTY STATE. `_boot.js` answers the
     kitchen_ingredients table with an error, so it cannot be seeded from here. That is not
     worthless — the empty state is one of the five states §4 requires — but the populated
     Ingredients grammar (drift badges, broken-link warnings) is NOT swept.
   - Plate lines are all `{misc:true}`, so the kid/pid line grammar is not exercised either.
   Both belong to F3/F7, which rebuild those screens and should extend this fixture. */
const seed = `
  (function(){
    var t=null; try{ t=localStorage.getItem('cafeCost_theme'); }catch(e){}
    localStorage.clear();
    localStorage.setItem('cafeDB_cogsPct','30');
    if(t) try{ localStorage.setItem('cafeCost_theme',t); }catch(e){}
    // costs chosen to land on BOTH sides of the 30% target so the good/warn/bad tokens all
    // render — a fixture that is uniformly healthy never paints --bad anywhere.
    var costs=[3, 6, 0.85, 4.5, 3.8, 5.2];
    var menus=[], plates=[], dishes=[];
    for(var i=0;i<6;i++){
      menus.push({id:'M'+(i+1), name:'Menu '+(i+1)});
      plates.push({id:'PL'+(i+1), name:'Plate '+(i+1), category:'Lunch',
        lines:[{misc:true, name:'x', cost:costs[i%costs.length]}]});
      dishes.push({id:'MI'+(i+1), name:'Plate '+(i+1), section:'Lunch', price:10,
        custom:true, menuId:'M'+(i+1), plateId:'PL'+(i+1)});
    }
    // a price-less dish, which is what renders the muted no-price grammar. (Its plate has no
    // lines, so it costs to $0.00 — that is costed-at-ZERO, not "not costed"; the genuinely
    // uncosted case needs a dish with no plate link and is left to F5.)
    plates.push({id:'PL0', name:'Plate 0', category:'Lunch', lines:[]});
    dishes.push({id:'MI0', name:'Plate 0', section:'Lunch', price:0, custom:true, menuId:'M1', plateId:'PL0'});
    localStorage.setItem('cafeDB_menus', JSON.stringify(menus));
    localStorage.setItem('cafeDB_plates', JSON.stringify(plates));
    localStorage.setItem('cafeDB_menu', JSON.stringify(dishes));
    var now=Date.now(), DAY=86400000, hist=[], mh={};
    for(var d=20;d>=0;d--) hist.push({t:now-d*DAY, v:30+(d%5)});
    mh['M1']=hist.slice(-6); mh['M2']=hist.slice(-4);
    localStorage.setItem('cafeDB_priceHistory', JSON.stringify(hist));
    localStorage.setItem('cafeDB_menuHistory', JSON.stringify(mh));
    // Both AI toggles default ON, so an unswept OFF knob is the default. Force one off: the
    // off-state knob is the only element painting --knob, and it is a deliberate light fill
    // in dark. Seeding it here is what makes the exemption above load-bearing rather than
    // theoretical.
    localStorage.setItem('cafeDB_aiInvoiceCheck','0');
  })();
`;

async function boot(page, width, theme) {
  await page.setViewportSize({ width, height: 900 });
  await installBoot(page);
  await page.route('**/api/**', r => r.abort());
  await page.addInitScript(seed);
  if (theme) await page.addInitScript(t => { try { localStorage.setItem('cafeCost_theme', t); } catch (e) {} }, theme);
  await page.goto('/');
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    const ib = document.querySelector('.install-banner, #installBanner'); if (ib) ib.remove();
  });
}

/* Read a token off <html> exactly as a rule would. */
async function token(page, name) {
  return page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
}

test('the stored preference is honoured before first paint, with no flash of the wrong theme', async ({ page }) => {
  await boot(page, 1280, 'dark');
  // The attribute is written by the <head> script, so it is already correct on the very first
  // evaluation — not applied later by app.js, which would paint one light frame first.
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  const bg = parse(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  expect(lum(bg), 'the canvas is genuinely dark, not a light canvas with dark text').toBeLessThan(0.1);
});

test('an unset preference follows the OS, and the attribute is explicit either way', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page, 1280, null);
  expect(await page.evaluate(() => localStorage.getItem('cafeCost_theme')), 'system is stored as absence').toBeNull();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
    'the OS preference is RESOLVED to an explicit value — this is what lets the CSS carry one dark block').toBe('dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await boot(page, 1280, null);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
});

test('body text clears WCAG AA against the canvas in BOTH themes', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await boot(page, 1280, theme);
    const [text, text2, muted, surface] = await Promise.all(
      ['--text', '--text-2', '--text-3', '--surface'].map(t => token(page, t))
    );
    // computed custom properties come back as the literal hex, so resolve them through an
    // element rather than parsing hex by hand — this measures what the engine really paints.
    const measured = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const read = v => { probe.style.color = v; return getComputedStyle(probe).color; };
      const out = {
        text: read('var(--text)'), text2: read('var(--text-2)'),
        muted: read('var(--text-3)'), surface: read('var(--surface)'),
        surface2: read('var(--surface-2)'),
      };
      probe.remove();
      return out;
    });
    const bg = parse(measured.surface), bg2 = parse(measured.surface2);
    expect(contrast(parse(measured.text), bg), `${theme}: --text on --surface`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parse(measured.text2), bg), `${theme}: --text-2 on --surface`).toBeGreaterThanOrEqual(4.5);
    // --text-3 is the token whose mock value fails AA in both themes and is deliberately
    // corrected. Both PERSISTENT surfaces must clear AA; the transient hover wash is a
    // recorded exception documented in the token block and is not asserted here.
    expect(contrast(parse(measured.muted), bg), `${theme}: --text-3 on --surface (the corrected value)`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parse(measured.muted), bg2), `${theme}: --text-3 on --surface-2`).toBeGreaterThanOrEqual(4.5);
    expect(text && text2 && muted && surface, 'the tokens resolve at all').toBeTruthy();
  }
});

test('ink on a FILLED control flips with the theme — the mock hardcodes white and fails its own dark palette', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await boot(page, 1280, theme);
    const m = await page.evaluate(() => {
      const probe = document.createElement('span');
      document.body.appendChild(probe);
      const read = v => { probe.style.color = v; return getComputedStyle(probe).color; };
      const out = {
        onAccent: read('var(--on-accent)'), accent: read('var(--accent)'),
        onBad: read('var(--on-bad)'), bad: read('var(--bad)'),
        onInverse: read('var(--on-inverse)'), inverse: read('var(--inverse)'),
      };
      probe.remove();
      return out;
    });
    expect(contrast(parse(m.onAccent), parse(m.accent)), `${theme}: --on-accent on --accent`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parse(m.onBad), parse(m.bad)), `${theme}: --on-bad on --bad`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parse(m.onInverse), parse(m.inverse)), `${theme}: --on-inverse on --inverse (toast, tooltip)`).toBeGreaterThanOrEqual(4.5);
  }
});

test('the Settings segment switches the live theme and survives a reload', async ({ page }) => {
  await boot(page, 1280, null);
  await page.locator('#sideSettings').click();
  await page.waitForTimeout(300);
  await page.locator('#setThemeDark').click();
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
  expect(await page.locator('#setThemeDark').getAttribute('aria-checked')).toBe('true');
  expect(await page.locator('#setThemeSystem').getAttribute('aria-checked')).toBe('false');

  await page.reload();
  await page.waitForTimeout(1600);
  // Assert the STORE first. If the harness ever wipes the key again, this fails and names the
  // harness; without it, a harness bug and a persistence bug are indistinguishable — which is
  // exactly what happened the first time this spec ran.
  expect(await page.evaluate(() => localStorage.getItem('cafeCost_theme')),
    'the preference is still stored after the reload (if this fails, the harness cleared it, not the app)').toBe('dark');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
    'the choice survives the reload an intermittent user will always be arriving from').toBe('dark');
});

/* The sweep. Everything above pins a token or a mechanism; this walks the RENDERED DOM and
   asks the only question that actually matters — is anything unreadable? It is the guard
   against the characteristic dark-mode regression: one rule, somewhere in 3300 lines, that
   kept a light value and is invisible until a user switches theme on the screen that has it.
   Written as a sweep rather than as N per-screen assertions so a screen added later is
   covered without anyone remembering to extend it. */
const SWEEP = () => {
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // the painted backdrop, which is whatever ancestor first supplies an opaque one
  const effBg = el => { let n = el;
    while (n && n !== document.documentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; n = n.parentElement; }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }; };
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  /* Not every filled element is a SURFACE. Two kinds are meant to run against the theme:
       --inverse   the toast and the tap tooltip — a dark slab on a light page and a light
                   slab on a dark one is the entire purpose of the token;
       semantics   --good / --warn / --bad / --accent — legend dots, filled pills and primary
                   buttons carry MEANING in colour, so a dark fill on a light page is correct.
     Exempt them by resolving the tokens rather than by hardcoding selectors or by relaxing
     the threshold: a new element using these tokens is covered automatically, while one that
     is inverted by ACCIDENT — the actual bug this sweep hunts — is still caught.
     No legibility is waived: the text branch below measures every one of them anyway. */
  const resolve = v => { const p = document.createElement('span'); document.body.appendChild(p);
    p.style.backgroundColor = v; const out = getComputedStyle(p).backgroundColor; p.remove(); return out; };
  const intentionalFills = new Set(['--inverse', '--good', '--warn', '--bad', '--accent', '--accent-2', '--knob']
    .map(t => resolve(`var(${t})`)));
  const out = [];
  let inspected = 0;
  /* A colour is "baked" when it is a literal that cannot have come from a token — the giveaway
     for the exact bug this hunts. We cannot read the author's stylesheet from here, so instead
     compare against the OTHER theme's token values: if an element paints a colour that belongs
     to the palette we are NOT in, some rule kept a hardcoded value. */
  const foreignPalette = new Set((dark
    ? ['#B84E0C', '#964009', '#2A211B', '#6B5D50', '#FFFFFF', '#FAF7F1', '#EAE3D8']
    : ['#E98B4C', '#F5A874', '#E4E3E1', '#ABA9A5', '#232528', '#1E1F22', '#34363B']
  ).map(h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`));

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
    inspected++;
    // el.className is an SVGAnimatedString on SVG nodes, which stringifies to
    // "[object SVGAnimatedString]" and makes the failure message useless on exactly the
    // elements the SVG branch below reports. getAttribute is the portable read.
    const cls = (el.getAttribute && el.getAttribute('class')) || '';
    const label = (el.tagName + (cls ? '.' + cls.split(/\s+/).slice(0, 2).join('.') : '')).slice(0, 50);
    const bg = parse(cs.backgroundColor);
    // a surface painted the wrong way round for the active theme
    if (bg && bg.a > 0.5 && !intentionalFills.has(cs.backgroundColor) &&
        ((dark && lum(bg) > 0.5) || (!dark && lum(bg) < 0.15))) out.push(`SURFACE ${label} ${cs.backgroundColor}`);

    /* SVG paint. The sweep read only backgroundColor and color at first, which is how the
       desktop sidebar's brand mark kept a hardcoded #B84E0C stroke in dark and sailed past. */
    for (const prop of ['fill', 'stroke']) {
      const v = cs[prop];
      if (!v || v === 'none') continue;
      if (foreignPalette.has(v)) out.push(`SVG ${label} ${prop}:${v} belongs to the other palette`);
    }

    /* Pseudo-elements. ::after/::before carry the toggle knob, the button spinner ring and
       every empty-state illustration, none of which querySelectorAll can reach. */
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (!ps || ps.content === 'none') continue;
      const pbg = parse(ps.backgroundColor);
      if (pbg && pbg.a > 0.5 && !intentionalFills.has(ps.backgroundColor) &&
          ((dark && lum(pbg) > 0.5) || (!dark && lum(pbg) < 0.15))) out.push(`PSEUDO ${label}${pseudo} ${ps.backgroundColor}`);
      if (foreignPalette.has(ps.backgroundColor)) out.push(`PSEUDO ${label}${pseudo} ${ps.backgroundColor} belongs to the other palette`);
    }

    // only elements holding their own text — otherwise every wrapper is counted
    let hasText = false;
    for (const cn of el.childNodes) if (cn.nodeType === 3 && cn.textContent.trim().length > 1) { hasText = true; break; }
    if (!hasText) continue;
    const fg = parse(cs.color); if (!fg || fg.a < 0.5) continue;
    // AA is 4.5 for normal text, 3.0 once it is >=24px, or >=18.66px and bold
    const px = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight, 10) >= 700;
    const floor = (px >= 24 || (px >= 18.66 && bold)) ? 3.0 : 4.5;
    const cr = ratio(fg, effBg(el));
    if (cr < floor) out.push(`TEXT ${label} ${cr.toFixed(2)}<${floor} "${(el.textContent || '').trim().slice(0, 24)}"`);
  }
  return { findings: [...new Set(out)], inspected };
};

for (const width of [380, 1280]) {
  test(`sweep @${width}: nothing is unreadable on any tab, in either theme`, async ({ page }) => {
    for (const theme of ['light', 'dark']) {
      await boot(page, width, theme);
      for (const tab of ['dashboard', 'ingredients', 'pantry', 'builder', 'analysis']) {
        await page.evaluate(t => window.showTab(t), tab);
        await page.waitForTimeout(150);
        const { findings, inspected } = await page.evaluate(SWEEP);
        // THE FLOOR. Without it an empty DOM yields [] and the sweep reports success while
        // having looked at nothing — which is precisely what it did before the fixture seeded
        // real data. The number is a smoke threshold, not a target.
        // The sidebar/bottom nav alone clears ~30 elements, so a floor of 25 could not tell a
        // populated tab from an empty one. 45 sits above the chrome and below the leanest real
        // screen (Ingredients' empty state, measured at 61).
        expect(inspected, `${theme} @${width}px, tab ${tab}: the screen actually rendered`).toBeGreaterThan(45);
        expect(findings, `${theme} @${width}px, tab ${tab}`).toEqual([]);
      }
      /* F9 (v148): Settings is a SCREEN now, so it is swept the same way as every other tab
         rather than as an overlay. It still gets its own line because it carries the theme
         control itself — the one screen where a dark-mode regression would be self-inflicted. */
      await page.evaluate(() => window.showTab('settings'));
      await page.waitForTimeout(200);
      const settings = await page.evaluate(SWEEP);
      expect(settings.inspected, `${theme} @${width}px: Settings rendered`).toBeGreaterThan(45);
      expect(settings.findings, `${theme} @${width}px, Settings`).toEqual([]);
    }
  });
}

test("on 'system', the app follows the OS LIVE — without a reload", async ({ page }) => {
  // The one genuinely new behaviour in this batch, and it had no end-to-end test: the
  // pre-v132 code read the OS setting once at boot, so a phone switching to dark at sunset
  // left the app light until it was reopened — for a once-a-week user, potentially days.
  // Every other theme test calls emulateMedia BEFORE boot, which only exercises the <head>
  // resolver; this one changes it AFTER load, which is the only way to reach the listener.
  await page.emulateMedia({ colorScheme: 'light' });
  await boot(page, 1280, null);
  expect(await page.evaluate(() => localStorage.getItem('cafeCost_theme')), "preference is 'system'").toBeNull();
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
    'the OS went dark and the app followed with no reload').toBe('dark');

  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'and back').toBe('light');

  // ...and an EXPLICIT choice must pin the app against the OS, or "Light" would not survive
  // the next sunset. This is the half that makes the listener's `=== 'system'` guard matter.
  await page.evaluate(() => window.applyThemePref('light'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
    'an explicit Light choice ignores the OS going dark').toBe('light');
});

test('the PWA chrome colour tracks the CHOSEN theme, not the OS', async ({ page }) => {
  // Emulate a DARK phone, then choose Light. A media="(prefers-color-scheme:…)" meta pair
  // would leave the title bar at the dark surface over a white app — the v132 bug.
  await page.emulateMedia({ colorScheme: 'dark' });
  await boot(page, 1280, null);
  const meta = () => page.evaluate(() => document.querySelector('meta[name="theme-color"]').getAttribute('content').toUpperCase());
  const surface = () => page.evaluate(() => {
    const p = document.createElement('span'); document.body.appendChild(p);
    p.style.color = 'var(--surface)'; const v = getComputedStyle(p).color; p.remove(); return v;
  });
  const toRgb = hex => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;

  expect(toRgb(await meta()), 'boot: chrome matches the canvas').toBe(await surface());

  await page.evaluate(() => window.applyThemePref('light'));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
  expect(toRgb(await meta()), 'after choosing Light on a dark phone, the chrome follows the CHOICE').toBe(await surface());

  await page.evaluate(() => window.applyThemePref('dark'));
  await page.waitForTimeout(100);
  expect(toRgb(await meta()), 'and back again').toBe(await surface());
});

test('a hovered sidebar item is still distinguishable from the active one', async ({ page }) => {
  // v136 made --nav-active an alias of --hover, which is the mock's own grammar: its nav
  // renders active as {bg:--hover, color:--text, weight:600} and inactive as {bg:none,
  // color:--text-2, weight:500}, with the same --hover on hover for both. So WEIGHT is the
  // only discriminator, and the app previously had none — every desktop nav item was 600,
  // which made a hovered item pixel-identical to the active tab the moment the two colours
  // converged. Pin the discriminator, or the next batch to touch nav type will erase it
  // without anything noticing.
  await boot(page, 1280, 'light');
  const active = page.locator('.navbtn[data-tab].active').first();
  const inactive = page.locator('.navbtn[data-tab]:not(.active)').first();
  const weight = l => l.evaluate(el => parseInt(getComputedStyle(el).fontWeight, 10));
  const bg = l => l.evaluate(el => getComputedStyle(el).backgroundColor);

  expect(await weight(active), 'the active item is heavier than an inactive one')
    .toBeGreaterThan(await weight(inactive));

  await inactive.hover();
  await page.waitForTimeout(250);   // .navbtn transitions colour; measure after it settles
  expect(await bg(inactive), 'hover and active share a background — that is the mock, not a bug').toBe(await bg(active));
  expect(await weight(active), 'and weight still separates them while hovered')
    .toBeGreaterThan(await weight(inactive));
});

test('the theme segment is one tab stop and arrow keys move within it', async ({ page }) => {
  await boot(page, 1280, 'light');
  await page.locator('#sideSettings').click();
  await page.waitForTimeout(300);
  // exactly one of the three is reachable by Tab; the others are -1
  const tabindexes = await page.evaluate(() =>
    [...document.querySelectorAll('#tab-settings .seg-btn[data-theme-pref]')].map(b => b.getAttribute('tabindex')));
  expect(tabindexes.filter(t => t === '0'), 'a radiogroup is ONE tab stop').toHaveLength(1);
  expect(tabindexes.filter(t => t === '-1')).toHaveLength(2);

  await page.locator('#setThemeLight').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
    'ArrowRight from Light selects Dark — the role="radio" markup promises this').toBe('dark');
  expect(await page.evaluate(() => document.activeElement.id), 'and focus follows the selection').toBe('setThemeDark');

  await page.keyboard.press('Home');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.activeElement.id)).toBe('setThemeLight');
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
});

test('at 380px the theme applies to the mobile chrome too, and no rule kept a light value', async ({ page }) => {
  await boot(page, 380, 'dark');
  // The header and bottom nav are the mobile-only shell. A rule that hardcoded a light
  // surface would leave a bright band across the top or bottom of a dark app.
  const bands = await page.evaluate(() => {
    const read = el => el ? getComputedStyle(el).backgroundColor : null;
    return { header: read(document.querySelector('header')), nav: read(document.querySelector('.bottomnav')) };
  });
  for (const [name, val] of Object.entries(bands)) {
    const c = parse(val);
    if (!c || c.a === 0) continue;             // transparent is fine — it inherits the canvas
    expect(lum(c), `${name} is a dark surface, not a light band`).toBeLessThan(0.2);
  }
});
