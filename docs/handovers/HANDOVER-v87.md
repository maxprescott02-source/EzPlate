# HANDOVER v87 — The page behind a modal no longer scrolls

**Completed:** 26 Jul 2026 · branch `fix/modal-scroll-lock` (off `main` at v86, i.e. after PR #24 merged) ·
Max, reporting it directly: *"scrolling whilst having modal open still scrolls the main page behind modal"*.
Baseline v86, **383 node green**, `node -c` clean. Ended **392 node green**, smoke green (+ new `[23]`),
`node -c` clean (app.js, sw.js + the four `api/*.js`), six spots → **v87**. Client only (`css/style.css` +
`js/app.js` + tests). Zero contact with the protected parser region, the money law, the naming inversion, the
data model, the invoice subsystem, the insight engine, or `api/*.js`.

## The bug, measured

Reproduced in a real browser on the Ingredients tab (a long, scrollable list behind), page scrolled to 150,
then a modal opened:

| Gesture | 380px | desktop |
|---|---|---|
| Wheel over the **backdrop** | 150 → **550** | 150 → **550** |
| Wheel over the **modal card** | contained | 550 → **1150** |

## Root cause: there was no scroll lock at all

`openOverlay` only ever added `.open`. Nothing stopped the *document* scrolling while an overlay was up.

`.mbody` and `.modal` do carry `overscroll-behavior:contain` — but that only bites when **that element is
itself scrollable and hits its end**. Two everyday cases slip straight past it:

- the pointer is on the **backdrop**, not on any inner scroller, so there is nothing to contain;
- the modal is **short enough that `.mbody` never scrolls at all** — which is why desktop was worse than
  mobile, not better.

In both, the gesture chained to `<body>`. `.modal-overlay` itself had `overscroll-behavior:auto`.

## The fix

- **`syncBodyScrollLock()`**, called from `openOverlay` and `closeOverlay` — the two choke points v72 already
  centralised every modal open/close through, so this is one place rather than nineteen overlays.
- **`position:fixed` on `<body>`** with the scroll offset held in `top`, **not `overflow:hidden`** — iOS Safari
  silently ignores the latter on `<body>`, and iOS is the device this app lives on. On unlock we `scrollTo` the
  held offset, so closing a modal never jumps the page.
- **State is DERIVED from the DOM** (`document.querySelector('.modal-overlay.open')`), not counted. The app
  deliberately stacks a confirm on top of a modal (the v44 used-in-N confirm, the unit guard); a plain toggle
  would free the page while the modal underneath is still up, and a counter drifts the moment one path misses
  a decrement. A derived check cannot.
- **Called BEFORE `closeOverlay`'s reduced-motion early return** — that path returns before the `.closing`
  animation is set up, and a lock released after it would strand the page locked forever with OS reduced motion
  on. A test pins the ordering specifically.
- **Desktop scrollbar compensated** via `padding-right` while locked, so content doesn't jolt sideways when the
  bar disappears. Restored to whatever it was on unlock (not blanked).
- **`overscroll-behavior:contain` on `.modal-overlay`** as a second, independent layer.

## Verified in a real browser (not on the phone list)

27 checks at 380px and desktop, plus a reduced-motion pass:

| | 380 | desktop |
|---|---|---|
| body locked while open; offset held on `<body>` | ok | ok |
| wheel on the **backdrop** does not scroll the page | ok | ok |
| wheel over the **card** does not scroll the page | ok | ok |
| no content jolt from the vanishing scrollbar | ok | ok |
| stacked confirm closes → page **stays** locked | ok | ok |
| close → unlocked, inline `top`/`padding-right` cleaned up | ok | ok |
| **scroll position restored exactly** (150 → 150, no jump) | ok | ok |
| page scrolls normally again afterwards | ok | ok |
| reduced-motion close path also unlocks and restores | ok | — |

**Regression checked separately:** a *tall* modal (the invoice import with several parsed lines) still scrolls
its own content internally at both widths while the page behind stays put. Worth noting for whoever reads this
next: the scroller is `.modal` / `.mbody`, **not** `.modal-overlay` — my first version of that check measured
the overlay, got `scrollHeight === clientHeight`, and looked like a regression it wasn't.

## Tests (383 → 392)

- **`tests/scroll-lock.test.js` (+9)** — source pins for the three things that would silently rot: both choke
  points call the lock (a new modal path can't forget it); `closeOverlay` calls it **before** the reduced-motion
  early return (positional assertion, not just presence); the lock is derived-not-counted, uses
  `position:fixed` not `overflow:hidden`, captures and restores the offset, compensates the scrollbar, and
  cleans up its inline styles.
- **`tests/smoke.js` `[23]` (+11 checks)** — the state machine in jsdom: lock on open, survives a stacked
  confirm, only the *last* close unlocks, inline styles cleaned up, re-open works.

## CodeRabbit — 1 finding, real, fixed

**minor, `smoke.js [23]`** — jsdom reports `pageYOffset` as 0 and has no real `scrollTo`, so
`ok(body.style.top !== '')` passed **trivially** ("0px") and the restore was never actually asserted. Now the
window is seeded to 150 and `scrollTo` is captured, so the section asserts `top === '-150px'` on lock and a
genuine `scrollTo(0, 150)` on unlock. Good catch — the test looked stronger than it was.

## Judgement calls

- **Fixed it at `openOverlay`/`closeOverlay` rather than per-modal.** v72 centralised those precisely so
  behaviour like this lands once; nineteen overlays with their own lock calls is the version that rots.
- **Derived state over a refcount.** A counter is the obvious implementation and the one that breaks the first
  time someone adds an overlay path that doesn't decrement.
- **`position:fixed` over `overflow:hidden`.** The simpler fix works in every desktop browser and fails on the
  one platform that matters here, which is the worst possible failure mode: green everywhere I can test, broken
  on Max's phone.
- **Did NOT touch PTR.** `body.ptr-active` and the ≤700px `overscroll-behavior-y:none` are untouched; the lock
  keys off `.open` only, so a closing overlay's 320ms `.closing` fade doesn't hold the page.

## Needs Max's phone

1. **iOS Safari specifically** — the whole reason for `position:fixed`. Open any modal with the page scrolled
   down, drag on the backdrop and on the card, confirm the page behind is still and that closing returns you to
   exactly where you were.
2. A **tall** modal (invoice import with a real invoice) — its own content should still scroll normally.
3. **Address-bar behaviour** on iOS while a modal is open — `position:fixed` on `<body>` is the usual suspect
   for the toolbar collapsing/expanding oddly, and no desktop browser can model it.
