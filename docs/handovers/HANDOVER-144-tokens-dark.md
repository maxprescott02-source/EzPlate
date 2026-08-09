# HANDOVER - 144 (F1a: tokens light + dark, and the theme switch)

**Branch:** `feature/f1-shell` · **Scope:** the first half of queue item F1.
**Shipped `ezplate-v136`.**

## F1 was split, and why

F1 as queued was four things: tokens + dark, the theme switch, a shell reconcile
(sidebar / header bar / page container), and a new modal+sheet primitive carrying two
behavioural defects. That is one PR that changes **every colour in the app** and **rewrites
every modal's interaction** — `CLAUDE.md`'s "would exceed what one PR can be reviewed as"
stop condition, whose stated remedy is to do the first half and queue the rest.

Both halves are shell work, so the split does not violate protocol §2: no screen is touched
by either, and no screen is left half-converted. **F1b is queued** with the shell reconcile,
the modal/sheet primitive, and the mock's compact sidebar theme toggle.

## What changed

**The mock's token names are now canonical.** The palette block is pasted verbatim from
`Redesign v3 - SaaS.dc.html` — `--surface-2`, `--text-3`, `--hairline`, `--danger`,
`--scrim`, `--grid` and the rest — and the app's older names (`--surface2`, `--muted2`,
`--bad`…) survive as a `var()` alias layer on top, the same way `--paper` / `--ink` /
`--line` already aliased onto v3 names.

The reason is F2-F10, not tidiness: every remaining screen is ported from that mock's
markup, which references those names. One vocabulary means no hand-translation step, and a
mistranslated colour is invisible until someone switches theme.

**Dark is ONE `html[data-theme="dark"]` block and there is no `prefers-color-scheme` rule
in the stylesheet at all.** The `<head>` resolver always writes an explicit `light`/`dark`,
resolving the OS preference in JS. Before v132, "system" meant *no attribute*, so every dark
rule had to be written twice — once under the attribute, once inside a
`@media (prefers-color-scheme:dark)` mirror — and a real bug came from writing one half and
forgetting the other. That whole class is now unreachable, and a test pins the mirror's
absence with the reason attached.

**Three deviations from the mock, every one measured** — the package's own §7 AA claim has
now failed measurement twice, so nothing here is quoted:

| token | mock | measured (surface / surface-2 / hover) | ships |
|---|---|---|---|
| light `--text-3` | `#A2937F` | 2.99 / 2.80 / 2.51 — fails everywhere | `#7D7060` (4.82 / 4.51 / 4.04) |
| dark `--text-3` | `#807E7A` | 3.79 / 4.07 / 3.26 — fails both surfaces | `#908D89` (4.65 / 4.99 / 4.00) |
| light `--danger` | `#C63C33` | 4.44 on its own tint | `#C0392F` (5.43 / 4.70) |

Each clears AA on both **persistent** surfaces. On the transient hover wash both land ~4.0,
and **that is a recorded, deliberate limit, not an oversight**: a value dark enough to clear
hover (`#756858`, 4.54) closes the gap to `--text-2` and destroys the three-level text
hierarchy the token exists to provide. Dark `--danger` / `--warn` / `--good` / `--accent`
all pass as the mock ships them and are **not** overridden.

**A defect in the mock, found by measuring it.** It hardcodes `color:#FFFFFF` on its
accent-filled and danger-filled buttons. Against its *own* dark palette that is **2.54:1**
and **2.59:1** — unreadable. `--on-accent` / `--on-bad` / `--on-inverse` now flip with the
theme (R2: legibility is a real constraint, kept and dressed in the new palette). Logged as
a mock defect rather than treated as licence to redraw it.

**`color-scheme` is declared for both themes** — the one dark-mode fix no stylesheet audit
can find, because the surfaces it controls are drawn by the browser and never appear in the
DOM. Without it a dark app still opens a white `<select>` popup, white number spinners and a
dark-on-dark caret. The app has selects on Settings, Menu and the builder, so it was
reachable immediately. Print re-declares `color-scheme:light` — paper is white whatever the
screen is.

Also landed: `.seg`/`.seg-btn` restored with the Settings **Light / Dark / System** control
(Settings, not the mock's sidebar toggle, because Settings is reachable at every screen size
and the sidebar is desktop-only — the mobile mock has no theme control at all); a live
`matchMedia` listener so 'system' follows the OS **without a reload**, which the pre-v132
code never did; dark variants of the four empty-state SVG data-URIs **and of the
reduced-motion static one** — required, not belt-and-braces, because `html[data-theme]`
outranks `:root`, so a single dark declaration would have won *inside* that media query and
animated for someone who asked for no motion; and the sparkle's light/dark gradient pair
restored.

## Root causes found

**The sparkle's dark gradient had been deleted in v132 and nothing noticed for four
versions.** Its spec asserted only the light half, so it passed happily through v132-v135
while the dark selector did not exist. The spec now asserts both directions. Same shape as
the audit's recurring "test that cannot fail" finding.

**Measuring during a CSS transition reads interpolated colours.** A first pass at the
in-browser contrast sweep reported six failing nav labels in light mode; the colours were
fine. `.navbtn` transitions `color` over 140ms, and the sweep ran synchronously after the
theme flip, so it measured mid-transition values. Worth knowing before anyone chases it
again — the fix is to measure after the transition, not to change the code.

**Bumping the cache version once at the START of a batch makes the browser serve stale
assets for the rest of it.** Three "defects" during the browser pass — the theme-color meta
not updating, the sidebar arc keeping its light accent, the nav weights unchanged — were all
the HTTP cache serving the earlier `?v=136` bytes under an unchanged URL. Confirmed by
fetching with `cache:'reload'` and diffing server content against applied content, not
assumed. **Production is unaffected** (it only ever sees final v136), but it is a real trap
for the next batch that verifies in a browser mid-work.

## Review

Two pre-push `code-review` passes on a different model, the second because the fixes for the
first were themselves new unreviewed code.

The first found **eight** real defects. Every one was fixed:

1. **The `theme-color` meta pair reintroduced the exact v132 bug.** The browser resolves
   `media="(prefers-color-scheme:…)"` against the **OS**; the page resolves its palette
   against the **stored** preference. Choosing Light on a dark phone gave a near-black title
   bar over a white app. Now one meta, rewritten by the resolver and by `applyResolvedTheme`,
   which reads the live `--surface` so it cannot drift.
2. **Hover and active became pixel-identical in the sidebar.** `--nav-active` aliased to
   `--hover`, and the app had no other discriminator. The mock's own grammar turned out to be
   **font-weight** (active 600, inactive 500, same `--hover` background on hover for both), so
   that shipped — R1, the mock wins — with a line recording what the old stronger-background
   signal gave up.
3. **A test asserted the artefact of defect 1 exists.** `/prefers-color-scheme/.test(HTML)`
   was satisfied by the metas alone; the whole resolver could be deleted and it stayed green.
   Now scoped to the resolver script itself, plus a new test pinning the resolver's **position**
   (before the stylesheet, in `<head>`) — nothing pinned that, and moving it to the end of
   `<body>` would have left every other theme test green while a light frame painted.
4. **The DOM sweep walked four empty screens with no floor assertion** — an empty DOM finds
   nothing and passes. It now seeds real data (61-3599 elements per tab, verified) and asserts
   `inspected > 25`. It was also blind to SVG paint, pseudo-elements and translucent fills;
   all three are now covered.
5. **The sidebar brand's accent arc kept `#B84E0C` in dark** (3.25:1), because the rule was
   scoped `.brand-logo .mk-arc` and the sidebar copy has no such ancestor. Unscoped now, so
   any future copy is covered by construction. The strengthened SVG branch catches it.
6. **The toggle knob measured 1.55:1 in dark** and borrowed `--scrim` for its shadow — a
   scrim must get *denser* in dark, a knob shadow must not. The knob is now state-aware
   (`--knob` when off, `--on-accent` when on: 7.87 and 6.48 in dark); light is byte-identical
   to how it has always rendered.
7. **The "no flash" test did not test that** — see 3.
8. **`toContain('ezSparkGrad')` is satisfied by `'ezSparkGradDeep'`**, so it passed against
   the code it was written to catch. Now a terminated match.

Plus nits: a stale comment the `--hover` change invalidated, a first-wins token map that
recorded the pre-deviation value, `--shadow-toast` imported and left unused while the toast
borrowed the modal's, and `.seg` promising arrow-key selection through `role="radio"` without
implementing it (now implemented with roving tabindex + Home/End, and pinned).

**The second pass found seven more, and it was worth running.** Two were mine, from the first
round of fixes:

- **The print `color-scheme:light` override was dead.** `:root` is (0,1,0) and loses to
  `html[data-theme="dark"]` at (0,1,1); media queries add no specificity. So printing from a
  dark app still got dark browser chrome. Galling because the identical trap is handled
  correctly twenty lines away for `--empty-illust`, with a comment explaining it — this block
  got the comment and not the selector.
- **`--shadow-float` silently lost a third of its opacity in LIGHT** (.12 → .08) when I mapped
  it onto `--shadow-pop`. It has its own colour token now.

And five pre-existing or newly-introduced-by-omission:

- **The `.tp-tip` conversion was a no-op.** The selector is re-declared twice further down at
  equal specificity, and the later rule makes the chart tooltip a light *card* with no arrow.
  My edit never rendered. Left tokenised (so it degrades safely if the later rule ever goes)
  with a warning comment naming the winner — and the spec's "(toast, tooltip)" label corrected,
  since the tooltip consumes neither token.
- **The sweep would have false-positived on the toggle knob** the moment any switch was OFF —
  `--knob` is a deliberate light fill in dark and was not exempted. Green only by luck, because
  both AI toggles default ON. That is exactly how a guard gets deleted by a later batch as
  "flaky". Exempted, and the fixture now seeds a toggle OFF so the exemption is load-bearing.
- **The live OS-change listener — the one genuinely new behaviour here — had no end-to-end
  test**, and the assertion naming it matched `systemPrefersDark`'s one-shot read too, so
  deleting the whole listener left it green. Now pinned in both places, and **verified failing
  against an actually-removed listener** (my first planted defect was not one: the
  `else if (mq.addListener)` fallback still fires in Chromium, which is its own small lesson).
- **The sweep's floor was satisfied by the nav chrome alone** (~30 elements against a floor of
  25), so it could not tell a populated tab from an empty one. Raised to 45, and the seed
  comment now states two honest limits rather than overclaiming: the Ingredients tab still
  sweeps an empty state (`_boot.js` errors that table, so it cannot be seeded), and no plate
  line exercises the kid/pid grammar. Both belong to F3/F7.
- **`.tipbox`** — the hover help bubble — was left behind by the `--inverse` conversion, and
  the sweep structurally cannot see it because it is `display:none` until hovered. Fixed. The
  same blind spot covers modal and invoice-review rules; the sweep's claim is therefore scoped
  to *visible elements on five tabs plus Settings*, not "the app".
- **`syncThemeSeg` re-read the store**, so on a device where localStorage throws the theme
  would flip while the control snapped back — this app's own "tell them it did not save" rule,
  inverted. It now takes the applied preference.

**Every new guard was verified failing against a planted defect** — the orphan-token test,
the `color-scheme` test, both branches of the DOM sweep, and the nav weight discriminator.
The sweep's exemptions (`--inverse` and the semantic fills) resolve tokens rather than naming
selectors, so a new element using them is covered automatically while one inverted by
accident is still caught.

## Into CLAUDE.md
Nothing proposed this batch. One correction was **added to the blocked corrections item**:
Tier 3 says "staging has never yet loaded in any session", and it loads now — verified from a
live session, empty `public` schema. The rest of that line stands: the schema is empty, so
migrations are still unrehearsed until the staging item runs.

## New docs/QUEUE.md items
- **F1b** — the shell reconcile, the modal/sheet primitive, and the sidebar theme toggle. It
  carries a **correction to F1's premise**: the Esc defect is not "`app.js:7503` + two parallel
  listeners". It is ONE listener closing a hard-coded list of 8 ids, which means a real stack
  closes wrongly in *both* directions and **eight modals have no Esc handler at all**. The fix
  is to derive the top layer from the DOM, the way `syncBodyScrollLock` already does.
- `manifest.json`'s `theme_color` / `background_color` match neither palette (pre-existing).
- The toggle's OFF state is low-contrast in **light** too (1.36:1), and always has been — a
  visual decision, so left alone rather than changed inside a dark-mode batch.
- The tint-vs-hover compositing item was re-pointed to **F2** and updated: F1a did *not*
  resolve it, and `--hover` separating from `--surface-2` makes the masking more visible.

## New docs/PHONE.md items
See `docs/PHONE.md` — dark mode on a real phone (OLED rendering, the PWA title bar against
the new palette, and whether "System" flips correctly when iOS switches at sunset) can only
be settled on the device.

## Probe
**What did the queue item tell you to do that you would have done differently?**
F1 asked for the shell reconcile and the modal primitive in the same item as the tokens. I
split it, and I would do that again — but the split is the kind of decision the item should
have made, not the batch. The modal primitive in particular deserves its own review pass
because it touches 18 modals and two known-wrong behaviours.

The item also stated the Esc defect wrongly (a line number and a listener count that do not
exist). The code won and F1b carries the measured version. That is the third time an
enumeration in this project has come back different from the brief's guess.

**What did you not propose because it was out of scope?**
`--grid`, `--warn-br` and `--shimmer` are imported and unused — they are part of the verbatim
palette and F-screens consume them, so they stay. The Settings segment's own visual design is
v128's, not the mock's; F9 restyles Settings and owns that.

## Surprises

**Running the review a second time, on the fixes, paid for itself.** Two of the seven it found
were defects I introduced while fixing the first seven — including one that made a fix I had
just written and commented do nothing. The first-round fixes are new code and had never been
read by anything but me; treating "the review passed" as covering them would have been wrong.
Worth making a habit when a review produces more than a couple of substantive fixes.

The mock is not self-consistent in dark: it hardcodes white ink on its filled buttons, which
fails against its own dark palette. Fidelity to the mock and legibility genuinely conflict
there, and R2 is what resolves it — worth expecting again in F2-F10 wherever the mock writes
a literal colour instead of a token.
