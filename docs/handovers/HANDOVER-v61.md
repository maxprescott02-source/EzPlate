# HANDOVER v61 — UI fixes before the Gemini batch

Brief: `~/Downloads/ezplate-opus-ui-fixes-pre-gemini.md`. Branch `fix/ui-pre-gemini`
off `main` (which was already at **v60** — the `feat/ux-pass` batch had merged since
the v60 "State as of" snapshot still said origin/main=v59; the documented "local main
goes stale" pattern). Baseline verified green (**185**) before starting; **190 green**
after (185 + 5 new: 2 for item 1, 3 for item 7). `node -c` clean, jsdom smoke green
(incl. version parity + the new wizard-modal checks), six spots at **v61**.

Two items were DIAGNOSE-first; both are resolved to a root cause below. Item 5 was a
Max decision (verify-only — see §5).

---

## 1. Builder qty 4-digit clipping — VERDICT: VISUAL (a), NOT a data bug
The reported "1100 shows as 110" is **visual clipping only — the stored quantity is
correct.** Proof: the qty input is `type="number"` (browsers ignore `maxlength` on
number inputs anyway — and there was none), and `setQty` stores `parseFloat` /
`Math.max(0,n)` with **zero truncation**. The clip was CSS: `.line .costs .qtybox input`
was `66px`, and the native number-spinner arrows ate ~16px of that, so 4–5 digits
overflowed.

**No recheck of past lines is needed — no costing was ever silently wrong.**

Fix (CSS only): hid the spinners on `.qtybox input` (`appearance:none` +
`::-webkit-*-spin-button` — the exact pattern already used for `.invPackQty`, style.css)
and widened the builder qty from `66px` → `76px`. The dotted leader absorbs the extra
10px; the 380px row still fits (fixed `.priceline` is 116px; the row's fixed items sum
well under the available width). **Regression tests (2)** in `plates-independence.test.js`:
a 4-digit (`1100`) and a 5-digit (`10000`) `setQty` round-trip into the stored line
intact.

## 2. Builder popup opened scrolled
`openBuilder` called `show()` but never reset the scroller, so it could retain the
previous session's position. Fixed: `openBuilder` now zeroes `scrollTop` on both
`#builderModal` (the full-screen overlay at mobile) and its `.mbody` (the desktop
scroller). Covers New AND Edit — both route through `openBuilder`.

## 3. Ingredients search stray indent — ROOT CAUSE
The Ingredients-tab search wrapper carried an extra `.king-search` class that Products'
bare `.menu-search` does not; `.king-search{margin:10px var(--sp-5)…}` (+ a `sp-4`
media-query variant) was the inset. Fix: dropped the `king-search` class from the markup
so it aligns exactly like Products (shared `.menu-search` / `.ing-controls` tokens), and
deleted the now-dead `.king-search` CSS. No compensating offset.

## 4. "Set up from products" is a modal now
The wizard rendered inline in the Ingredients tab (`#kingWiz`). Rehoused into a new
`#kingWizModal` (standard chrome: `.modal modal-wide modal-wiz`, `mhead` + × + `mbody`;
full-screen takeover at ≤560px like the builder, via a shared rule with `.modal-builder`).
**Only the container changed** — all ids/handlers/skip-persistence/progress line/grouped
rows are the original markup, relocated wholesale. `renderKingWizard` now `show()`s the
modal when `kingWizOpen`, `hide()`s it when not. `#kingWiz` keeps its full-bleed layout:
`.modal-wiz .mbody{padding:0}` so the rows keep their own `var(--sp-5)` indent and the
separators span edge-to-edge exactly as before (the old tab-context top border/margin is
gone — the `mhead` border separates it now).

- **Single close path:** new `closeKingWizard()` sets `kingWizOpen=false` then re-renders,
  so the modal's open-class and `kingWizOpen` never desync. The ×, the backdrop tap, AND
  Escape all route through it (dedicated listeners — NOT the generic `hide(id)` lists,
  which would leave `kingWizOpen` stale). Backdrop-close is safe: skips persist immediately.
- **Removed the search-hides-wizard coupling** (old app.js line: `if(kingQuery &&
  kingWizOpen) kingWizOpen=false`). A modal is a takeover — the tab search behind it can't
  coexist, so opening is explicit and the × closes it, per the brief.
- Smoke (`tests/smoke.js` §8) now asserts the button opens the modal and the × closes it
  and clears `kingWizOpen`.

## 5. Delete-plate button — DIAGNOSIS: already unified (Max: verify-only, no change)
Full sweep of destructive classes: the app has **exactly two** `.btn.danger` buttons —
`#paDelete` (plate card popup) and `#ingDelete` (ingredient modal) — and they carry
**identical** classes (`btn danger ghost`) with **no button-specific override**. Both are
already covered by v60's `@media (hover:none)` neutralization of `.btn.danger:hover`. There
is **no CSS divergence** between them. This brief was written pre-Gemini/likely pre-v60's
delete-standardization; the pass already reached this button. **Max chose verify-only — no
change shipped.** If a real difference shows on the *latest* build, it needs a screenshot;
nothing in the current CSS explains one.

## 6. Dashboard edge annotation removed (SUPERSESSION)
Deleted the edge-annotation branch in `trendChart`: when the target is outside the
data-fit domain, **nothing** is drawn now — no edge marker, no arrow. `targetInView` still
governs the dashed line: target inside the domain (or within one tick) → the line renders on
its labelled tick exactly as before; outside → nothing. Removed the `edgeAnno` var, its
`else` branch, the `+edgeAnno` in the SVG concat, and the `.tc-target-edge` CSS.

**This supersedes the edge-annotation half of v60's item-1b domain rule.** The
target-on-a-labelled-tick rule (v48, `tcTicks`) still applies **whenever the line shows** —
unchanged and still pinned by `trend-ticks.test.js`. `trend-domain.test.js` is unchanged in
behaviour (the "far outside is hidden" test still holds — `targetInView` is the gate); only
its now-stale "(edge annotation instead)" description was updated to "(nothing is drawn)".

## 7. Builder ingredient search "sometimes doesn't work" — ROOT CAUSE, reproduced
**Trigger (the un-pinnable "sometimes"):** type in the builder ingredient search → click
the **× (clear) button** → search again → the dropdown stays invisible, **dead until page
reload**. It survives close/reopen because `#drop` persists in the modal DOM.

**Root cause:** the `#qClear` × handler hid the dropdown with an **inline**
`dropEl.style.display='none'`. Inline style beats the `.drop.open{display:block}` class, so
once set it permanently wins — every later `renderDrop` computes results and adds `.open`,
but the dropdown never shows. Nothing ever cleared the inline style (`closeDrop` is
class-only; reopen / `openBuilderNew` don't touch it).

**Fix at root:** the × handler now calls `closeDrop()` (class-only, like every other close
path) instead of the inline style; and `renderDrop` defensively clears any inline `display`
so visibility is class-driven only. **Regression tests (3)** in `builder-search.test.js`:
(a) a dropdown re-opens after a clear left an inline `display:none` (reproduces the stuck
state and proves the resurrection), (b) `closeDrop` never leaves a sticky inline display,
(c) a source-level guard that the qClear handler no longer sets an inline `display:none`.
Also covered by a jsdom walk in the reproduced path.

---

## Tests
- `npm test` **190 green** (185 → 190). New: 2 in `plates-independence.test.js` (item 1
  qty round-trip), 3 in `builder-search.test.js` (item 7). `trend-domain.test.js` +
  `trend-ticks.test.js` unchanged in behaviour.
- `node -c js/app.js` clean; jsdom smoke green (version parity + new §8 wizard-modal checks).

## NOT built (deliberately)
- **Item 5:** no CSS change — the button already matches the standard destructive treatment
  (Max: verify-only). Documented above rather than inventing a diff.
- Did not rewrite the working tab-search clear wiring or other modals' close paths — only the
  builder search (#q) had the inline-display bug.

## Needs Max's phone (no browser here — none of this is "feel"-verified)
1. **4-digit qty end to end:** enter `1100` (and `10000`) on a builder line — the field shows
   all the digits, and the saved plate costs off the full number.
2. **Wizard as a modal at 380px:** "Set up from products" opens a full-screen modal; ×
   closes it; skip/add/progress all work as before; Settings/tab behind is untouched.
3. **Builder search across open/close/reopen AND edit-load paths:** type → clear with the ×
   → type again → the dropdown still appears. Open via + New plate and via Edit plate.
4. **Dashboard with target IN and OUT of domain, both themes:** in-domain shows the dashed
   line on its tick; out-of-domain shows the line and **no** edge label/arrow.
5. **Builder popup opens at the top** every time (New and Edit), even after scrolling a long
   plate last time.
6. **Ingredients search left edge** now lines up with the buttons/cards above and below it
   (matches Products).
7. **Delete plate button** (item 5) — confirm on the phone it reads the same as the other
   delete button; flag with a screenshot if not.

## Still outstanding (unchanged from v60)
- The **three v55 Supabase migrations** still need applying to prod before any of v54–v61
  goes live (see `supabase-schema-can-lag-app-code`).
- `npm run shots` + `fresh-states.spec.js` reconciliation on a browser env — now also covers
  v61's wizard modal, the widened qty field, and the removed dashboard edge annotation.
