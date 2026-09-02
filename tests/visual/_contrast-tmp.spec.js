const { test } = require('@playwright/test');
const { installBoot } = require('./_boot');
for (const theme of ['light','dark']) {
  test(`contrast ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 380, height: 800 });
    await installBoot(page);
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate((t)=>document.documentElement.setAttribute('data-theme',t), theme);
    await page.waitForTimeout(150);
    const out = await page.evaluate(() => {
      const lum = (c) => { const [r,g,b]=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{const x=v/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);}); return 0.2126*r+0.7152*g+0.0722*b; };
      const ratio = (a,b) => { const A=lum(a),B=lum(b); return +(((Math.max(A,B)+0.05)/(Math.min(A,B)+0.05)).toFixed(2)); };
      const cs = getComputedStyle(document.documentElement);
      const tok = (n) => cs.getPropertyValue(n).trim();
      // resolve a token to rgb
      const rgb = (v) => { const d=document.createElement('div'); d.style.color=v; document.body.appendChild(d); const c=getComputedStyle(d).color; d.remove(); return c; };
      const surface = rgb(tok('--surface'));
      const surface2 = rgb(tok('--surface-2'));
      const badbg = rgb(tok('--danger-bg'));
      return {
        tokens: { muted2: tok('--muted2')||tok('--text-2'), text3: tok('--text-3'), border2: tok('--border-2'),
                  dangerBr: tok('--danger-br'), danger: tok('--danger'), surface: tok('--surface'), knob: tok('--knob') },
        explain_on_dangerbg: ratio(rgb(tok('--muted2')||tok('--text-2')), badbg),
        explain_on_surface:  ratio(rgb(tok('--muted2')||tok('--text-2')), surface),
        text3_on_surface:    ratio(rgb(tok('--text-3')), surface),
        border2_on_surface:  ratio(rgb(tok('--border-2')), surface),
        dangerBr_on_surface: ratio(rgb(tok('--danger-br')), surface),
        danger_on_surface:   ratio(rgb(tok('--danger')), surface),
        knob_on_border2:     ratio(rgb(tok('--knob')), rgb(tok('--border-2'))),
      };
    });
    console.log('C', theme, JSON.stringify(out));
  });
}
