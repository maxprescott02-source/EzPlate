# Review — batch 231 (R21+R22, the header band)

Reviewed-commit: 2bcdd55
Reviewer: `code-review` agent, forced onto Opus (the batch ran on Fable), given the branch diff and nothing about the brief.
Outcome: seven findings; all seven acted on in ecd0081. Decisions inline after the verbatim report.

## Verbatim report

# Review — `fix/ui-audit-phase2-header` (2bcdd55) vs `main`

## 1. CSS

### F1 — `#tab-analysis .scr-gap` matches two elements, not one. MAJOR.
`/Users/max/Documents/Scoopys-Costing/css/style.css:3834`

```css
@media (max-width:767px){ #tab-analysis .scr-gap{flex:0 0 auto} }
```

The comment three lines above says *"Below 768 the **Menu header's** `.scr-gap` stops growing"*. The selector is not scoped to the header. `#tab-analysis` contains **two** `.scr-gap` spans — `index.html:520` (in `.scr-head`) and `index.html:553` (in `#menuSwitchRow`, the switcher/search row).

Concrete failure: on a phone, `#menuSwitchRow` is `.plib-controls{display:flex;flex-wrap:wrap}`. Its first line is `.menu-picker-row{flex:1 1 220px}` + `.scr-gap`. Both grew, so positive free space split roughly 50/50. With the gap at `flex:0 0 auto`, `.menu-picker-row` now takes **all** of it, and inside it `.mnu-selwrap{flex:1 1 auto;max-width:none}` (`css/style.css:4532`) grows too — so the menu `<select>` stretches to the full row width and `#menuScopePct` (`flex:0 0 auto`) is pushed to the far right of the picker cluster. That is a visible, unintended layout change on the Menu screen at ≤767, on a row the diff never mentions and no test covers.

Verify: at 390px on Menu, `document.querySelectorAll('#tab-analysis .scr-gap').length` → 2; measure `#menuSelect`'s width with and without the rule. Fix is small and obvious: `#tab-analysis .scr-head > .scr-gap`.

### F2 — The `::before` mask is documented as load-bearing and nothing asserts it. MINOR (coverage), and the audit doc overstates.
`/Users/max/Documents/Scoopys-Costing/css/style.css:3934`

The comment calls it *"a mask, not decoration… without the mask scrolled rows would show in that strip"*. Delete the `::before` block and every assertion in `v190-sticky-header.spec.js` stays green — the spec measures `head.top`, `head.bottom`, `afterLeft` and z-indexes, none of which the mask touches. `docs/ui-audit-2026-09-02.md:223` claims the spec *"pins all of it"*; it pins the sticky, the token, the `::after` extent and the sub. Not the mask.

### F3 — Keyboard focus and find-in-page now land behind the pinned bar. MINOR.
There is no `scroll-padding-top` anywhere in `css/style.css`, and the diff adds none. Shift-Tab backwards up a long list (`#aList`, `#plateList`, `#ingList`) scrolls each focused control flush to the scrollport top — which is now under an opaque 69px bar on a phone and 48px at y32 on desktop. Same for Ctrl-F. It is a direct consequence of making a top-of-screen bar sticky and it is a one-line fix (`html{scroll-padding-top:…}`), so I'm flagging it rather than filing it.

Verify: at 390 on Menu with the list scrolled, focus a row and Shift-Tab; `document.elementFromPoint` at the focused rect's centre returns `.scr-head` or a descendant.

### What I checked and found correct (stating it explicitly, since the brief asked)

- **The `.bld-head` exclusion holds.** `.scr-head:not(.bld-head)` is 0-2-0; `.bld-head{position:relative;z-index:2}` (`css/style.css:568`) is untouched and never matches the sticky rule. Dropping the `:not()` would make `.scr-head{position:sticky}` (0-1-0, line 3810) beat line 568 on source order — so the builder test does redden on that mutation.
- **Nothing else needed excluding.** All nine panes put `.scr-head` as the first child of a single full-height `.panel.plib-panel`, so the sticky range spans the whole screen on every one. There is no second `.panel` that would end the sticky early.
- **No stacking regression.** The only floating layer that lives inside a `.scr-head` is `.dash-menus-pop` (z 20, `css/style.css:3427`), and `js/app.js:10891` records that it deliberately does **not** portal. The header's new z50 context *raises* it (it now paints at level 50 instead of 20) rather than trapping it; it lost to `.bottomnav` (75) and `#installBanner` (78) before and still does. The two builder layers (`.drop`/`.suggest-drop`, z 79) leave the DOM for `<body>` in `portalDrop` before anchoring, and the builder header is excluded anyway. `.cat-drop` (60), `.tipbox` (70), `#syncBanner` (82), `.modal-overlay` (80), `#bootGate` (60/79) all sit above 50.
- **`position:sticky` does not establish a containing block for `position:fixed`**, so `fixedContainingBlock`/`anchorDrop` geometry is untouched — the v189 containing-block fix is not disturbed.
- **`html/body{overflow-x:clip}`** (`css/style.css:2729-2730`) is `clip`, not `hidden`, so `overflow-y` stays `visible`, the body is not a scroll container, and both `window.scrollY` and the sticky continue to work. The pseudo-element overhang is clipped.
- **The overhang arithmetic is right.** `--sp-3`=12, `--sp-5`=20; body `padding-left:224`, `.wrap{margin-left:12}`, `.scr-head{margin:0 20px}` → box left 256, `::after{left:-32}` → x224 = `.bottomnav`'s border-box right edge. `.side-brand-row{margin:0 -12px}` inside `padding:0 12px` spans x0–223, and the sidebar's own 1px `border-right` (same `--border`) fills x223–224. The line is genuinely continuous. `--header-h:80` = 32 (`.wrap` padding-top) + 48 (bar), and `height:80` on a border-box brand row puts both hairlines at y79–80.
- **No `[hidden]` trap.** `#menuHeadSub` is driven by `textContent` (`js/app.js:12044`), never by the `hidden` attribute, so the unconditional `display:block` cannot override a JS hide.
- **No `@media`-loses-on-specificity trap** in the new rules: `.scr-head{border-bottom:0}` (0-1-0, line 3926) is later than the base 0-1-0 rule and nothing more specific sets `border-bottom` on `.scr-head`; `#menuHeadSub` (1-0-0) beats `.scr-sub` at every breakpoint in both directions.
- **Six cache spots all agree at v190**: `sw.js` `CACHE`, the two `?v=` in `sw.js`, the two in `index.html`, `APP_VERSION` in `js/app.js`. Count is correct.
- **Spec count**: `ls tests/visual/*.spec.js` → 49, workflow comment now says 49/48, and `tests/ci-workflow.test.js:230` asserts it against the real directory. Correct.

## 2. The new spec — `tests/visual/v190-sticky-header.spec.js`

### F4 — `oneRow` cannot fail for the regression it names. MAJOR (roster class).
`/Users/max/Documents/Scoopys-Costing/tests/visual/v190-sticky-header.spec.js:128,140`

```js
oneRow: hb.height < 100, // the pre-R22 measured mobile bar is 69px; a wrapped sub would add a ~20px line
...
expect(r.oneRow, 'the sub must not wrap the header taller (flex-basis 0 is what prevents it)').toBe(true);
```

Three independent reasons it is green whatever the CSS says:

**(a) The threshold is above every single-wrap outcome.** Using the repo's own measured numbers (`js/app.js:3425`: one-row bar 69, wrapped two-action bar 121) and the actual box model (`padding:12px` vertical, `gap:8px`, `min-height:44px` on buttons):
- sub wraps to its own line: `12 + 45 + 8 + 20 + 12 = 97`
- button wraps instead: `12 + 22 + 8 + 45 + 12 = 99`

Both under 100, by 1–3px. Only the two-*button* wrap (121) exceeds it, which is not what the assertion is about.

**(b) The named mechanism is the wrong one.** The assertion message and the CSS comment both credit `flex-basis:0`. Flex line-breaking uses each item's *hypothetical main size* = flex base size clamped by min/max — and `min-width:auto` on a flex item resolves to its **content-based minimum**, which with `white-space:nowrap` is the whole string. What actually zeroes that minimum is `overflow:hidden` (CSS Flexbox §4.5). So the mutation that really breaks this is deleting `overflow:hidden` from `css/style.css:3833`, and both the comment and the test point at the wrong declaration.

**(c) The fixture cannot produce a wrap at all.** The seed is `"Winter Menu"`. At 390px: `"Menu"` ≈ 40 + sub ≈ 75 + `"New menu"` ≈ 90 + 3×8 gap + 32 padding ≈ 229 against 358 available. Even with content sizing there is nothing to wrap.

Verify: change `#menuHeadSub` to `flex:0 1 auto` (or drop `overflow:hidden`), seed a 60-character menu name, re-run. Expect green.

### The rest of the spec — checked, and it does hold
- **Scroll guards are real.** The page scroller is `window` (`body` is not a scroll container — see above), so `scrollTo(0,400)` genuinely moves and `scrollY >= 300` would fail loudly if it didn't. The `top ≈ 32` assertion's own comment correctly identifies that it would be vacuous without the guard.
- **`afterDrawn`** goes false if the `::after` is deleted — `getComputedStyle(el,'::after').content` returns `'none'`, and `parseFloat('auto')` is `NaN`. Real.
- **`head.left + afterLeft ≈ nav.right`** is real: both sides measured, and the earlier `head.bottom ≈ 80` literal keeps the paired `brand.bottom ≈ head.bottom` comparison from being the roster-205 "both sides computed" shape.
- **`bg` `/^rgb\(/`** correctly rejects `rgba(0, 0, 0, 0)` — the `a` breaks the anchored match. Deleting `background:var(--bg)` reddens it.
- **`headPos === 'relative'`** in the builder test reddens if the `:not(.bld-head)` is dropped, per F-note above.
- **The `cafeDB_menus` seed is not a dead key here.** `tests/visual/_boot.js:125` serves the `menus` table from it, read at query time, and Playwright runs init scripts in registration order — so the seed lands before `installBoot`'s shim reads it. CLAUDE.md's "dead key" note is about `js/app.js`, not the shim. `subText.length > 0` is a real assertion.
- **`makeScrollable` targets `#tab-analysis .panel`** — the sticky element's own parent, which is the correct box to extend: it lengthens the sticky containing block rather than just the document.

### Minor gap
`expect(r.headZ).toBeGreaterThan(0)` is trivially satisfied and proves nothing: with `z-index:auto` a sticky box still paints above in-flow content. It is harmless, but it is not the guard its message implies.

## 3. The `v155-shell-edges.spec.js` retitle

The retitle is honest. At ≥768 `.scr-head` carries `padding:0;margin:0 var(--sp-5)`, so the header's border box **is** its content column (title's left edge, actions' right edge), and that is what the loop compares. The new title is accurate and the note explains the split correctly.

### F5 — the failure message was not retitled with the test. NIT.
`/Users/max/Documents/Scoopys-Costing/tests/visual/v155-shell-edges.spec.js:100`

```js
expect(bad, 'header rule must not overhang the content column').toEqual([]);
```

The drawn rule now deliberately **does** overhang, to reach the sidebar. The message is the half a reader sees on a red run, and it now names the contract this batch reversed. Same class as the retitle itself, one line lower.

## 4. Everything else

### F6 — a comment the diff falsified and left standing. MINOR.
`/Users/max/Documents/Scoopys-Costing/index.html:516-518`, on the very element the diff changed:

> *"On a phone `.scr-sub` is hidden by F2's rule, so the name is carried by the switcher control below instead — see the R5 note there."*

`#menuHeadSub{display:block}` reverses exactly this, and the R5 note it points at describes a home that is no longer the only one. In this repo that is not cosmetic — the next reader trusts the markup comment over the stylesheet.

### F7 — `top:env(safe-area-inset-top,0px)` may be permanently 0, making the new PHONE.md check unfalsifiable. LOW CONFIDENCE ON THE MECHANISM, worth checking.
`css/style.css:3810`, `docs/PHONE.md:166-176`

`index.html:104` sets `apple-mobile-web-app-status-bar-style: default`, not `black-translucent`. Under `default`, iOS insets the web view *below* the status bar in standalone, so `safe-area-inset-top` resolves to 0 — the same value the CSS comment says every browser gives. If that is right, the offset is inert and PHONE.md's stated **Fail** condition ("the bar's title renders under the clock or the notch") cannot occur, so the device check will pass regardless and proves nothing. That is the shape CLAUDE.md's oldest rule warns about: a check that finds nothing has only proved something about what it looked for.

I am confident the meta tag is `default` and confident about what that implies; I have not measured it on a device, which is the doc's own point. Worth confirming before the check is treated as evidence — and if it is inert, either the doc should say so or the offset should be dropped.

### Nit
The `.scr-head` comment (`css/style.css:3799-3803`) says the z-order was *"checked against R13/R19"* and enumerates anchorDrop 79 and modals 80; the spec checks nav, banner and toast only. The claim is true, just wider than what is pinned.

**Nothing found** in: cache-version spots, the naming inversion, duplicate top-level declarations, the row boundary, migrations, silent-failure paths, or dead code. The `js/app.js` change is the version literal alone.

## Decisions (all in ecd0081)

- **F1 — FIXED.** Premise verified against the markup (two `.scr-gap` in `#tab-analysis`); selector scoped to `.scr-head >`. Measured proof: `#menuSelect` at 390 is 212.5px on main and 212.5px on the branch after the fix (it stretched with the unscoped rule). Comment at the rule now records the second gap.
- **F2 — FIXED.** The desktop R22 test now hit-tests the strip above the pinned bar (`elementFromPoint` at y16 must land on the header); the delete-the-mask mutation was hand-run and killed.
- **F3 — FIXED.** `html{scroll-padding-top:calc(env(safe-area-inset-top,0px) + var(--header-h,80px))}` — clears the tallest bar at every width.
- **F4 — FIXED.** 62-char seeded name, same-line assertion against the title's own box (a wrap puts the sub ~20px lower), plus an assertion that the long name is genuinely ellipsising. The `flex:0 1 auto` mutation was hand-run and killed. Both the spec comment and the CSS comment now name the real mechanism (basis 0 + the zeroed automatic minimum, not basis 0 alone).
- **F5 — FIXED.** Failure message retitled with its test.
- **F6 — FIXED.** The index.html comment now records the batch-231 reversal instead of contradicting it.
- **F7 — CONFIRMED AND FIXED IN THE DOC.** The meta is `default` (verified), so the inset is 0 in standalone and a notch collision cannot occur on the current build. PHONE.md now says exactly what the device check can prove (sticky survives real iOS standalone) and what it cannot; the `env()` offset stays as future-proofing and its CSS comment says so.
- **Minor gap (headZ>0) — FIXED.** Pinned to the declared 50 (equality, per the roster's denylist rule).
- **Final nit — FIXED.** The comment now says which three layers the spec pins and that the rest were read by hand.
