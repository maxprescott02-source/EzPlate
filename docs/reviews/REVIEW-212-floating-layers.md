# REVIEW-212 — floating layers and mobile dropdowns

Reviewed-commit: 09b1a11
**Agent:** `code-review`, on **Sonnet** against work done on **Opus 5**, on the branch diff, without a brief.
**Outcome:** two findings. **One accepted as REAL and PRE-EXISTING → queued, not fixed here. One fixed.**

Findings below are the agent's claims, quoted. My decision follows each.

---

## Finding 1 (Major) — the engine's dropdowns can paint underneath `.bottomnav`

> `js/app.js`'s new `fixedContainingBlock` and its comment ("the engine's `position:fixed` escapes every clipping ancestor") solve where a fixed layer's *coordinates* resolve. It does not address, and the comment implicitly denies the existence of, a separate CSS mechanism: **stacking-context confinement**, which `position:fixed` does *not* escape.
>
> - `.bld-docket{filter:drop-shadow(...)}` (`css/style.css:652`) establishes a stacking context. `#drop`'s new fixed-positioning containing block is correctly computed as `.bld-docket`, but for *paint order* this also traps `#drop` inside `.bld-docket`'s local stacking context […]
> - `.bld-head{position:relative;z-index:2}` (`css/style.css:557`, unchanged by this diff) is a *separate* stacking-context trigger […] and `#plateSuggest`/`.suggest-drop` is its descendant […] it is still trapped in `.bld-head`'s (z:2) stacking context for paint purposes.
> - `.bottomnav{position:fixed;...;z-index:75}` (`css/style.css:1505-1509`) is a body-level sibling of the builder page, always visible while the builder is open […]
>
> Consequence: wherever the clamped/anchored `#drop` or `#plateSuggest` box's bottom edge extends into the screen region also covered by the fixed bottom nav, that portion of the list renders **underneath** `.bottomnav` — invisible and untappable — regardless of the layer's own `z-index:30`, because z-index only orders siblings *within* the same stacking context, never across the boundary of an ancestor that already established one.
>
> This is not new territory introduced only by this diff's math bug fix, but the diff materially increases the chance of hitting it: previously `#drop` was clipped by `overflow` well before it could reach anywhere near the bottom of the screen (that was the very bug being fixed); now `dropBox`/`dropPlace` clamp `maxHeight` only against `window.innerHeight` (and `.modal`/`.ni-panel` bounds) — nothing in the room calculation subtracts `.bottomnav`'s height […]
>
> None of the new tests can catch this: `tests/visual/212-layers.spec.js` only asserts `getBoundingClientRect()` numbers […] which say nothing about paint order.
>
> **How to verify:** on a real/simulated short viewport (e.g. 380×640, keyboard up), open the builder, type a query that yields enough matches for the clamped list's bottom edge to reach the last ~70-90px of the viewport, and check `document.elementFromPoint(x, y)` for a point inside the dropdown's bottom row […]

**THE DEFECT IS REAL. THE MECHANISM IS EXACTLY RIGHT. THE NAMED ELEMENT IS WRONG, AND THE DIRECTION OF THE CHANGE IS THE OPPOSITE OF WHAT IS CLAIMED — all three settled by running the verification it proposed rather than reasoning about it.**

Measured at 380×640, scanning `elementFromPoint` down the middle of each layer every 12px:

| | `.bld-bar` band | `#drop` covered points | `#plateSuggest` covered points |
|---|---|---|---|
| **main (v172)** | 426–526 | **9 of 24** | **8 of 32** |
| **this branch** | 426–526 | **8 of 25** | **4 of 25** |

- **The coverer is `.bld-bar`** — `position:fixed`, `z-index:25`, a 100px summary/save bar sitting at 426–526 — **not `.bottomnav`**. Neither layer reaches the nav at any size I could produce. The confinement mechanism the agent describes is precisely what lets a z:25 bar beat a z:30 layer, so the reasoning is sound and only the element is misidentified.
- **It PRE-EXISTS on main, for both layers**, so this diff did not introduce it.
- **And the diff makes it BETTER, not worse** — fewer covered points on both layers, because the engine clamps a list that used to run unbounded. The agent's "materially increases the chance" is the one claim that measurement contradicts.

⚠️ **I nearly got this wrong in the agent's favour, and the way I did is worth recording.** My first probe sampled ONE point — `rect.bottom - 6` — which on main happened to fall *below* `.bld-bar`'s band, so it came back clean and I concluded for about ten minutes that I had introduced the whole thing. A single sample proved something about one pixel row and nothing about the layer. The scan is what settled it.

**Decision: NOT fixed in this branch. Queued as a B item** (`docs/QUEUE.md`, "A dropdown's middle band is unclickable behind the builder's summary bar"). Reasons, in order:

1. It is pre-existing and this batch improves it, so shipping is not a regression.
2. The right fix is **not** a z-index nudge. It is `dropBox` subtracting the app's fixed furniture from the available box — which is the same principle already written at that function's site (*"a dropdown may float over its OWN fields, but not over the controls that FOLLOW the form"*), and `.bld-bar` holds Save plate. That is a real design decision with a real cost (at 380×640 it removes ~160px of below-room and would flip the list upward), and it deserves its own item and its own review.
3. Doing it now would ship an **unreviewed** change of exactly the kind this gate exists to catch, added after the review had run.

**What I did take from it immediately:** the queue item carries the measured table above, the `elementFromPoint` scan as its reproduction, and the note that geometry assertions cannot see paint order — so the next batch does not re-derive any of it.

---

## Finding 2 (Minor) — stale comment overstates `.suggest-drop`'s closed-state parity with `.drop`

> `css/style.css` (the new comment above `.bld-namewrap` / near `.suggest-drop`) says the CSS offsets are "the closed-state fallback in the same way `.drop`'s are." That's not quite true: `.drop`'s base rule carries `position:absolute` (`css/style.css:475`), so it has a real, valid positioned fallback even if JS never runs. `.suggest-drop` was never given a `position` property in this diff (still implicitly `static`), so if it were ever shown without `anchorDrop` also having run, it would reproduce the original in-flow-pushing bug it was written to fix, not degrade gracefully like `.drop` does. In practice this is inert today — `#plateSuggest` ships `style="display:none"` inline (`index.html:331`) and every code path that sets `display:'block'` calls `anchorDrop` in the same synchronous statement — so there's no live defect, just a comment claiming a symmetry the CSS doesn't actually have.

**Taken, and FIXED.** The comment was mine, written in this diff, and it was wrong in the direction that matters: it told the next reader the fallback was safe. Rewritten to say what the fallback is actually worth, and to state the operative rule plainly — **if you show this layer from a new call site, the `anchorDrop` call is not optional.**

I did NOT "fix" it by adding `position:absolute` to `.suggest-drop`. That would restore parity with `.drop` at the cost of a second positioning story for a layer the engine now owns, and the honest answer is that this layer has one way to be shown correctly.

---

## What the agent explicitly cleared

> I checked the coordinate arithmetic in `fixedContainingBlock`/`anchorDrop` line by line (padding-box origin, border subtraction, below/above math for `top`/`bottom`), all four `anchorDrop` call sites, all `resetDrop`/close paths, the `matchWidth:false`/`align:'right'` branch for the dashboard popover, and the DOM ancestor chains involved […] The math itself is correct and the tests for it (`tests/layer-anchor.test.js`) are genuinely load-bearing — they use differing per-node fixtures (not a shared/collapsed fake), assert both positive and negative trigger cases (`will-change: opacity` must *not* qualify), and pin the measured real-world numbers. I did not find a wrong condition, a lost write, or a vacuous test in the reviewed diff.

> Everything else — the six cache-version spots (all agree at v173), the parser-region boundary (new code is well outside `INV_EXCLUDE`…`unitLabelFor`), the mutation target addition, the `QUEUE.md` renumbering, and the `.tp-tip` non-adoption (justified in writing, per the item's own requirement) — checked out.
