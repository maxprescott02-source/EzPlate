# HANDOVER v77 — Mobile Suggestions: button-anchored popover → inset floating card

**Completed:** 23 Jul 2026 · branch `fix/suggestions-inset-card` · brief `~/Downloads/ezplate-opus-suggestions-inset-card.md`.

Branch off **v76** (`origin/main` = `a78723a`, PR #20 merged — v75+v76 are on main). Baseline **318 node tests green**,
jsdom smoke green, `node -c` clean (app.js, sw.js, four `api/*.js`), six spots v76. Ended **318 node green** (no test
delta — CSS-only change, no unit-testable surface), jsdom smoke green, `node -c` clean, six spots → **v77**.

**CSS-ONLY** (+ the six version spots). **Zero JS logic change.** Zero contact with: the protected parser region, the
money law, the naming inversion, the plate/dish/menu data model, the invoice subsystem, the insight ENGINE
(`computeInsights`/`deriveInsights`/phrasing all unchanged), or the `api/*.js` endpoints. No new deps, no build step.
Desktop (≥640px) is **byte-identical** except the one shared `overscroll-behavior` line (see below).

---

## The change — positioning approach, not offsets

**Root cause (confirmed, not re-patched):** the mobile panel was `position:fixed` but **anchored to the bottom-right
FAB's right edge**, expanding left + up (v75/v76). Its width derived from the button (`min(340px, 100vw - 2·gutter)`
pinned to `right:var(--sp-4)`), so at 380px it fought both viewport edges — every prior coordinate fix broke a
different case. The brief's instruction was explicit: **fix by changing how it's positioned, not by adjusting
offsets.** Max reviewed mockups and chose the inset floating card.

**What shipped (mobile `@media (max-width:639px)` only, `css/style.css`):**

1. **Inset floating card.** `.msug-panel` on mobile is now `position:fixed; left:12px; right:12px; bottom:calc(84px +
   env(safe-area-inset-bottom)); top:auto; width:auto`. Its **width derives from the viewport** (the two 12px insets),
   never from the button — **it cannot land off-screen by construction.** The `12px` gutter and `84px` nav clearance
   are the app's own established floating-card convention (reused verbatim from `.install-banner`, which has shipped
   with exactly `left:12px; right:12px; bottom:calc(84px + safe-area)`).
2. **Above the nav, over the content.** Anchored above the bottom nav (+ iOS home-indicator safe-area). The menu list
   stays visible above the card — **no full-screen cover, no scrim** (staying in context is the whole point of this
   option; the solid surface + rainbow border already read as a distinct layer, so no scrim was needed).
3. **Height / scroll.** `max-height:min(62vh, calc(100vh - 84px - safe-area - var(--sp-5)))` — ~62vh (within the
   brief's 55–65vh), and never taller than the space above the nav. A long list scrolls internally (the base
   `.msug-panel` rule's `overflow-y:auto`); a short list shrinks to fit (height is auto, card is bottom-anchored, so
   1 insight → small card, doesn't stretch).
4. **Gradient border technique — technique used:** padding-box / border-box `background-clip`. The base `.msug-panel`
   rule already paints `background:linear-gradient(var(--surface),var(--surface)) padding-box, linear-gradient(90deg,
   …4 Gemini stops…) border-box` with `border:1.5px solid transparent` — an **opaque solid card surface** with the
   **rainbow gradient on all four sides**. The mobile block now simply **inherits** that (previously it overrode the
   surface with an 78% `color-mix` translucent tint + `backdrop-filter:blur(12px)`). **Translucency decision:** dropped
   entirely — solid `var(--surface)`. The v75 tint fought text contrast over busy café content; the brief says solid
   supersedes the earlier transparent attempt, and a solid surface passes contrast in both themes with no tint math to
   verify.
5. **Enter animation.** New `@keyframes msugRise{ from{opacity:0; transform:translateY(8px)} to{opacity:1;
   transform:none} }`, run as `msugRise var(--t-med) var(--ease)` — a short fade + slight rise, **transform/opacity
   only**. The removed `msugPopUp` (scale-spring from the FAB corner) was deleted (it was referenced only by the old
   mobile block). The existing `@media (prefers-reduced-motion:reduce){ .msug-panel{animation:none} }` still strips it.
   Desktop keeps its `msugPop` spring untouched.
6. **FAB visibility decision — hide while open.** `.msug.open .msug-pill{display:none}` (mobile only, CSS). The inset
   card spans the width where the floating circle sits, so leaving the FAB visible would trap it under the card. It
   returns the instant the card closes. This is the brief's recommended choice. (The FAB itself is unchanged: a 48px
   rainbow circle bottom-right at `bottom:calc(72px + safe-area)` when the card is closed.)
7. **Scroll containment (both platforms).** Added `overscroll-behavior:contain` to the base `.msug-panel` rule so the
   card's internal scroll never chains to the menu behind it when it hits top/bottom — supports the brief's "don't
   fight page scroll". This is the only line that also touches the desktop popover (harmless there).

**Dismiss — all three (four) ways preserved, no JS touched:** ×-in-header (`#menuSuggestClose`), tap-outside
(document click, `!f.contains`), swipe (the v75 handler on the panel — right-swipe, or down-from-top when already
scrolled to top, so it never fights the internal scroll), plus Escape. All still route through `menuSuggestClose`.

---

## Flag for Max — "persisted dismissed/restore state"

The brief says *"The persisted dismissed/restore state keeps working."* **There is no persisted dismiss state to keep
working** — v74 deliberately retired the persisted `suggest_fab_hidden` setting + the edge-tab restore machinery (a
static/floating trigger is never "in the way", so there was nothing to persist). The current dismiss just closes the
card; the FAB returns on the next render. I **preserved that** and did **not** reintroduce persistence — doing so would
reverse a deliberate v74 decision and is out of this brief's scope. **If you actually want a persisted "hide the
suggestions button" again, say so and I'll scope it as its own item.**

---

## Verification

- `npm test` → **318 green** (unchanged — no unit-testable surface changed).
- `node -c js/app.js` + `node -c sw.js` → clean. `api/*.js` untouched.
- jsdom smoke → all checks pass (panel wiring unchanged; §16 still green).
- Six version spots confirmed all at **v77** (sw.js CACHE, sw.js ×2 `?v=`, index.html ×2 `?v=`, `APP_VERSION`).

## Needs Max's phone (no browser here — feel/layout can only be judged on a device)

At **380px, both themes**:
- Open the card: fully on-screen, inset 12px from **both** sides, menu list visible behind it, floating above the nav
  (clears the home indicator).
- **Long list (5 insights)** → card caps at ~62vh and **scrolls internally**; scrolling to the end does not drag the
  menu behind it.
- **Short list (1 insight)** → card shrinks to fit, does **not** stretch to full height.
- Dismiss three ways: tap outside, the ×, and swipe (right / down-from-top); reopen via the FAB each time.
- Confirm the FAB **disappears while the card is open** and **returns on close**.
- Enter animation reads as a gentle fade + rise (not the old spring); then re-test with **OS reduced-motion ON** and
  confirm the card appears instantly.
- **Desktop unchanged:** the ≥640px anchored-to-pill popover looks and behaves exactly as v76.

## Not built (deliberately)

- Persisted dismiss/restore (see flag above) — out of scope; awaiting Max's call.
- No change to the insight content, engine, ordering, or the desktop popover geometry.
