# HANDOVER v79 — Gemini Suggestions button: neutral elevated circle, gradient in the sparkle only

**Completed:** 24 Jul 2026 · branch `fix/suggestions-inset-card` (SAME branch as v77/v78, per Max — not a new branch
despite the brief suggesting one) · brief `~/Downloads/ezplate-opus-gemini-fab.md`. Prescriptive, mockup-approved.

Baseline v78 (this branch), **318 node green**, smoke green. Ended **318 node green** (no unit-testable surface — CSS
+ one SVG icon), jsdom smoke green, `node -c` clean, six spots → **v79**. Presentation only; zero contact with the
engine, data model, invoice, money law, protected region, or `api/*.js`. Desktop inline pill surface unchanged.

## What changed (mobile floating trigger `.msug-pill`)

The brief supersedes v78's square/transparent/border-image trigger. The button is now a **quiet elevated circle; the
ICON carries the Gemini identity** — no gradient on the surface or border.

1. **Shape & size:** 48px→**52×52px CIRCLE** (`border-radius:50%`). Sparkle **20px→24px**, centred.
2. **Surface & border:** `background:var(--surface)` (the CARD token — light `#FFFDF9`, dark `#241E1B`; the brief's
   `#FFFDF8`/`#2b231d` are approximations of these existing tokens, and `--card` aliases `--surface`, so this is
   literally "what cards use"). Hairline `border:1px solid var(--border)`. **No new hex values.**
3. **Elevation:** added **ONE** new theme-aware shadow token **`--shadow-float`** (light `0 3px 10px rgba(60,40,20,.13)`,
   dark `0 3px 12px rgba(0,0,0,.45)` — the brief's exact values) in all three token blocks (light `:root`, the
   `:root[data-theme=dark]` block, and the `@media (prefers-color-scheme:dark)` block). The existing `--shadow` reads
   too flat for a floating button and `--shadow-lg` far too heavy, so a dedicated float token was the right call (the
   brief explicitly permits adding one).
4. **Position:** `right:12px`, `bottom:calc(84px + env(safe-area-inset-bottom))`. The 84px is the app's established
   nav-clearance value (nav ≈72px + a 12px gap — the same figure `#appMain` padding, `.install-banner`, and the corner
   toasts all use), so the button clears the bottom nav and the iOS home indicator. **This fixes the brief's "sitting
   hard against the bottom nav"** — v78 sat at 72px, inside the nav's reserved zone.
5. **The sparkle icon** (`index.html`, shared by desktop + mobile): new four-point path
   `M12 2.2l2.3 6.4 6.4 2.3-6.4 2.3L12 19.6l-2.3-6.4L3.3 10.9l6.4-2.3z`, diagonal `<linearGradient>` (id `msugSparkGrad`,
   already unique in the document; `x1/y1=0 → x2/y2=24`) with the brief's stops **#4285f4 0% → #9b72cb 35% →
   #d96570 70% → #f2a60c 100%** and `fill:url(#msugSparkGrad)`.
6. **Interaction:** press `:active{transform:scale(.96)}` (mobile) driven by the base rule's motion-token transition;
   desktop hover lift + `:focus-visible` ring + `-webkit-tap-highlight-color:transparent` all already present on the
   base `.msug-pill` and retained. **Show/hide, swipe-dismiss (v78), and non-persisted restore are unchanged** (the
   brief: "existing show/hide, dismiss, and persistence behaviour is unchanged").

## The green dot — decision: NONE to add (it was bleed-through)

**There is no green-dot element on the button**, and a v74 smoke pin (`[16]`) explicitly asserts
`!menuSuggestBtn.querySelector('.msug-pill-dot')` — the intended state has no dot. The "stray green dot" Max saw was
almost certainly a green traffic-light `.dot` from a healthy dish row showing **through v78's transparent button**.
The new **solid `var(--surface)` circle covers whatever is behind it**, so the dot disappears with no code to add or
remove. (Confirmed there is no JS that appends a dot/badge to the FAB either.) → **Leftover/accidental appearance,
resolved by the opaque surface.**

## Deviation from the brief — aria-label kept as "EzPlate Insights" (flag)

The brief lists `aria-label "Menu suggestions"`. I **did NOT** change it, because:
- The desktop pill **visibly reads "EzPlate Insights"** — WCAG "Label in Name" (2.5.3) requires the accessible name to
  contain the visible label; an aria-label of "Menu suggestions" would violate that on desktop (aria-label overrides
  the visible text for the accessible name).
- A v74 smoke pin locks `menuSuggestBtn.getAttribute('aria-label') === 'EzPlate Insights'`.
- The panel/dialog it opens is already labelled "Menu suggestions" (`#menuSuggestPanel[aria-label]`).

So the button keeps a clear, visible-text-matching accessible name. **If Max wants "Menu suggestions" regardless, I'll
change it and update the smoke pin in the same commit — say the word.**

## Verification

- `npm test` → **318 green** (no test delta). `node -c` clean (app.js, sw.js). jsdom smoke green (all v74 pill pins
  still hold: text "EzPlate Insights", aria-label, `.msug-pill-text`, `svg.msug-pill-spark`, no `.msug-pill-dot`).
- Six version spots all at **v79**.

## Needs Max's phone (380px, both light + dark)

- The button reads as a **circle** with a calm neutral surface + soft elevation, the **gradient only in the sparkle**;
  **no rainbow border, no square, no green dot**.
- It sits bottom-right **clear of the nav** (12px gutter, doesn't touch the nav or sit under the home indicator).
- **No blue tap-highlight box** on press; press gives a subtle scale-down.
- The panel still opens/closes and the button still swipe-dismisses (and returns on menu switch) exactly as v78.
- Desktop pill unchanged (now with the refined sparkle).

## Not built (deliberately)

- No `.msug-pill-dot` indicator (see green-dot decision + smoke pin).
- aria-label unchanged (see deviation flag).
- Desktop inline pill surface/border/text unchanged — the brief's circle spec is the mobile floating trigger only.

---

# v80 follow-up (same branch/PR, Max via remote-control)

**The Suggestions panel/bubble title now reads "EzPlate Insights"** (was "Menu insights" v74), so the bubble matches
the trigger button. One render path (`renderMenuInsights` → `.mi-intro`), so **desktop + mobile change together**.
**Pinned-contract change (deliberate):** the jsdom smoke assertion that pinned the title to "Menu insights" was
updated in the same commit to "EzPlate Insights" (still asserts no eyebrow / no "What stands out" / no `.mi-mark`/svg
chrome). The panel dialog's `aria-label` stays "Menu suggestions" (unchanged; not part of Max's request — could be
aligned to "EzPlate Insights" later if wanted). 318 node green, smoke green, `node -c` clean. Six spots → **v80**.
