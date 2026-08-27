# REVIEW-213 — letting the builder's dropdowns out of their stacking contexts

Reviewed-commit: 2a2b0ce
**Agent:** `code-review`, on **Sonnet** against work done on **Opus 5**, on the branch diff, without a brief.
**Outcome:** two findings. **Both real, both taken, both fixed.** The major one was a regression this batch introduced.

Findings below are the agent's claims, quoted. My decision follows each.

---

## Finding 1 (Major) — `#plateSuggest` survives onto the next tab

> `js/app.js:3175`, inside `showTab(t)`, is the *only* thing every tab switch does to the builder: `var _bp=document.getElementById('builderPage'); if(_bp) _bp.hidden=true;`. It does not call `hidePlateSuggest()` or `closeDrop()`. […]
>
> Before this diff that omission was harmless: `#plateSuggest` was an in-flow descendant of `#builderPage`, so `_bp.hidden=true` (`display:none` on the ancestor) suppressed it instantly regardless of its own JS-tracked "open" state. `#plateSuggest`'s actual close mechanism has always been the blur handler at `js/app.js:8407`: `pn.addEventListener('blur',function(){ setTimeout(hidePlateSuggest,150); })` — a **150ms-delayed** call, never synchronous with the tab switch. It only ever "worked" because the ancestor hide made the delay invisible.
>
> This diff reparents `#plateSuggest` to `<body>` while it is open […] Once portaled, it is a sibling of `#builderPage`, not a descendant, so `_bp.hidden=true` no longer touches it. Its visibility now depends entirely on the 150ms blur timeout finishing.
>
> […] The user sees the plate/menu-item suggestion list floating over the Dashboard (or whichever tab) for a visible beat before it disappears. It does self-heal […] but it is a real, user-visible glitch introduced specifically by this diff […]
>
> Note `#drop`'s equivalent case is *not* broken the same way: its close path is the document-level `click` listener at `js/app.js:1478` […] which fires synchronously in the same click dispatch as any `.navbtn` click […] `#plateSuggest` has no such synchronous rescue; its only close trigger is the async blur timer.
>
> […] The existing `tests/visual/213-layer-stacking.spec.js` does not cover this: its close-path tests only use `Escape` and clearing the query (for `#drop`), never a direct nav-tab switch while `#plateSuggest` is open, so this gap is untested.

**Taken, and FIXED. Correct in every particular, including the part the agent flagged it had not run.** I reproduced it before changing anything, sampling immediately after the nav click with no wait:

```
IMMEDIATELY AFTER NAV CLICK:
{"disp":"block","parentIsBody":true,"h":300,"top":165,
 "builderHidden":true,"onScreen":true,"whoIsAtItsMiddle":"opt sug-opt"}
AFTER 400ms:
{"disp":"none","parentIsBody":false,"h":0}
```

The builder is already hidden, and a 300px suggestion list is sitting at top 165 over the Dashboard **owning its own pixels** — `elementFromPoint` at its middle returns one of its own options. Exactly as described.

**The diagnosis I want on the record is the agent's second paragraph, because it is the more useful half:** the blur timer was never a close. It was a 150ms delay that an ancestor's `hidden` made invisible, and this batch removed the thing that was covering for it. **A layer that leaves its parent stops inheriting every guarantee that parent was quietly providing** — visibility being the one nobody writes down.

Fixed at `showTab`, which is the one thing every tab change does, and **both** layers are closed there rather than only the broken one. `#drop`'s synchronous rescue via the document click listener is real but incidental, and relying on it is finding 2.

Regression test added for **both** layers, asserting with **no wait** after the click — the defect self-heals in 150ms, so any `waitForTimeout` between the click and the assertion produces a test that cannot fail. Confirmed red by deleting the `hidePlateSuggest` call.

## Finding 2 (Minor) — `closeBuilder()` closes one layer and gets away with the other

> `closeBuilder()` (js/app.js:8553) calls `hidePlateSuggest()` explicitly but never calls `closeDrop()`. Every current call site […] happens to run inside a `click` event […] so the global document click listener […] happens to close `#drop` anyway […] But this is incidental — `closeBuilder()`'s own correctness silently depends on always being invoked from within a bubbling click event whose target sits outside `.search-wrap`, which is nowhere enforced or documented. Any future non-click trigger […] would strand `#drop` on `<body>` at z-index 79 exactly as described in finding 1.

**Taken, and FIXED.** The agent's framing is the right one: this was already fragile and this batch raised the price of it failing from "a dropdown looks open" to "a layer is stranded on `<body>` at z-index 79, over whatever you open next". `closeBuilder` now closes both, explicitly, with the reasoning at the site.

---

## What the agent explicitly cleared

> Everything else in the diff checked out: `portalDrop`/`unportalDrop` correctly guard against double-portal and double-unportal (re-entrancy safe), `fixedContainingBlock`'s "reparent before measuring" ordering is correct given it walks `el.parentElement`, the six cache-version spots all agree at v174, the z-index values in the new CSS comment (25/75/78/80) match the actual selectors in `css/style.css`, and the option-click handler on `#drop` is bound directly to the element (survives reparenting, as the Playwright test correctly pins).

## A gap this review does not cover, stated because nothing else records it

`npm run mutate --changed` reports **"nothing in scope"** for this batch. `anchorDrop`, `portalDrop` and `unportalDrop` are not mutation targets and cannot easily become ones: the gate runs `node --test` against the files a target names, and everything pinning the portal is a Playwright spec.
**Adding a target whose named file the gate cannot run would report a false green, which is worse than an honest gap**, so the check was done by hand instead and both halves are recorded: removing the portal reddens 5 of 8 tests, dropping the z-index from 79 to 30 reddens 3, and deleting the `showTab` close reddens the new regression test.
