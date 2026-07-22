# HANDOVER v72 — Animation system: make it feel finished

**Completed:** 22 Jul 2026 · branch `feature/animation-system` · brief `~/Downloads/ezplate-opus-animation-system.md`.

Branch off **v71** (`origin/main` = `1baeddb`, PR #16 merged — v71 had landed by this batch, so the baseline was
v71, not v70 as CLAUDE.md's stale "State as of" implied). Baseline **271 node tests green**, jsdom smoke green, six
spots v71. Ended **271 node green** (unchanged — this is presentation only), jsdom smoke green (incl. a new **[18] v72**
close-out section), `node -c` clean (app.js, sw.js, all four `api/*.js`), six spots → **v72**.

**CSS + a small, central JS wiring change + one smoke section only.** Zero contact with the protected parser region,
the money law, the naming inversion, the plate/dish/menu data model, or any pricing logic. No new deps, no build step.
The invoice-review render / row-state / `invRowState` / auto-tick were **not** touched — the only invoice-area CSS
change is a transition added to the existing `.cand-chip` `.sel` state (motion on an existing state change, which the
brief explicitly permits). This was a **SYSTEM pass, not a sprinkle-effects pass** — the app already had ~70% of a
motion system; the work was formalising it, filling the gaps consistently, and adding exactly two signature moments.

---

## The philosophy this batch followed
The premium feel comes from a FEW transitions being consistent and correct on ONE easing + ONE small timing scale,
plus one or two signature moments — not from lots of things moving. `/frontend-design`'s "spend your boldness in one
place" pointed straight at the Gemini rainbow panel as *the* signature; everything else is invisible-and-functional
(fast, subtle, gets out of the way — cooks use this fast during service).

## 1 — The motion token system (formalised, one place: `css/style.css` `:root`)
The app already shipped `--ease:cubic-bezier(.2,.7,.3,1)`, `--t-fast:.14s`, `--t-med:.22s` used in ~40 places.
**I did NOT rename these to `--motion-*`** — the brief's names were "e.g.", renaming 40 call sites is churn + risk for
zero gain, and CLAUDE.md forbids gratuitous renames. Instead I **extended** the scale to a documented 3-step system and
added two purpose-built easings:

```
Durations:  --t-fast .14s   taps / hovers / toggles / chips
            --t-med  .22s   most state changes (dropdowns, cards, toasts)
            --t-slow .3s    larger surfaces (modal + panel open/close)   ← NEW
Easing:     --ease          primary ease-out (entrances / most motion)
            --ease-in-out   cubic-bezier(.65,0,.35,1) — symmetric moves (modal close) ← NEW
            --ease-spring   cubic-bezier(.34,1.4,.64,1) — the ONE overshoot, signature only ← NEW
```
A comment block above the tokens documents intended use. Everything below references them — there are **no ad-hoc
durations/easings** in anything I added (I also tokenised two stragglers I touched: `aiFade`'s `ease-out`→`var(--ease)`,
and the corner-toast's hardcoded `.2s ease`).

## 2 — The system applied consistently (pure CSS)
- **Modals — open + CLOSE reverse.** Open retargeted to `--t-slow` (`fadeIn` + `modalIn`, unchanged shape, calmer
  duration for the bigger surface). **Close now reverses** (fade + slight scale/translate down) via ONE central
  mechanism — see §Modal close mechanics below. All 19 overlays share the one entrance AND the one exit.
- **Tab switch** — a gentle `tabIn` settle (opacity + 4px, `--t-med`) on the five `#tab-*` panels. `showTab()` flips
  `display:none→''`, which re-triggers this one-shot on every switch. Kept fast — it happens constantly.
- **Card / row press** — ONE shared treatment app-wide: `:active{transform:scale(.985)}` + token transition on
  `.ing-card`, `.hl-card` (unified the old split .996/.995 values to a single .985), press on `.cand-chip`, `.pchip`,
  `.mlf-chip` at .96; `.mi-row` got a token transition (border + background) so its hover/selection eases. Hardcoded
  `.15s`/`.05s` on `.ing-card` replaced with tokens.
- **Filter / light chips** — `.mlf-chip` already token-transitioned its `.on` state; added `transform` + a tap press.
  `.pchip` gained `color` + `transform` in its transition (its hover colour used to snap) + a press.
- **Toasts / status notes** — the invoice **"AI checking…→checked"** note (`.ai-status`) now eases its colour shift
  (`transition:color`). The generic `.toast` was already token-based.
- **Dropdowns / comboboxes** — already used `dropIn` on `--t-med var(--ease)`; left as-is (already consistent).

## 3 — Signature moments (exactly two, justified)
- **A · Gemini suggestions panel expand** — `msugPop` now uses `--ease-spring` with a touch more travel
  (`scale(.9) translateY(10px)`→`none`), origin at the button corner, quick (`--t-med`). This is the app's AI/"special"
  surface — the single place worth an overshoot. Re-fires each open via the existing `[hidden]` toggle. **Collapse stays
  instant** deliberately: `menuSuggestClose()` is called programmatically in several contexts (×, outside-click, Escape,
  menu switch, and "nothing to say" auto-hide), so an animated collapse there risks flashing — the expand is the moment.
- **B · Successful invoice import** — the existing `.corner-toast` ("Invoice imported · …") now **springs up from the
  corner** it docks to (`--ease-spring`, scale + translate) and a **green ✓ lands just after** (a `::before` on
  `.ct-head`, `ctCheck` keyframe, .12s delay). Subtle, not confetti. Routed entirely through the corner-toast — the
  invoice review modal is already closed by `closeInv()` before it shows, so **zero contact with the fragile review
  markup**. The ✓ is safe as an always-success cue: `.corner-toast` is only ever used for a successful import.

## Modal close mechanics (the one JS change — read this if you touch modals)
Modals open through `show(id)`/`openModal()` and close through `hide(id)`/`closeModal()` — every one of the 19
`.modal-overlay`s (verified: all 19 `show()` targets carry the class). I centralised open/close into one pair:

```
openOverlay(el):  clear pending-close timer · remove .closing · add .open · aria-hidden=false
closeOverlay(el): aria-hidden=true (at once) · remove .open (SYNCHRONOUSLY) ·
                  if it wasn't open OR reduced-motion → done ·
                  else add .closing (re-asserts display:flex + runs fadeOut/modalOut) · timer clears .closing after 320ms
```
Two design points that matter:
1. **`.open` drops synchronously.** The fade-out is driven by a *separate* `.closing` class (`.modal-overlay.closing`
   re-asserts `display:flex` and runs the out-animation). So every existing `.classList.contains('open')` check, the
   `.modal-overlay.open` PTR guard, and the 4 existing smoke close-assertions all stay honest — the modal is logically
   closed the instant you call `hide()`; only the pixels linger 320ms. **This is why the suite needed zero edits.**
2. **Reopen cancels the close.** `openOverlay` clears the timer and removes `.closing`, so a fast reopen (e.g. confirm →
   open another) can't be swallowed. Reduced-motion (JS `prefersReducedMotion()` via `matchMedia`) skips the `.closing`
   branch entirely → instant close, matching the CSS killswitch.
- Guard against the "close something already closed" flash: `wasOpen` gates the animation, so `hide()` on an
  already-closed modal does nothing visible.
- **One accepted minor:** `renderKingWizard` clears its inner content synchronously while the overlay fades, so the
  low-traffic setup wizard fades an empty box on close. Acceptable; noted, not fixed.

## Accessibility + performance (hard constraints — all met)
- **`prefers-reduced-motion:reduce`**: the pre-existing **global killswitch** (`css §22`,
  `*,*::before,*::after{animation:none!important;transition:none!important}`) neutralises every CSS transition/animation
  I added — nothing needed a bespoke fallback. The JS modal close additionally checks `matchMedia` and closes instantly.
  Under reduced motion the corner-toast ✓ simply appears (animation dropped, default opacity 1).
- **GPU-only**: every keyframe I added animates **transform/opacity only** (`fadeOut`, `modalOut`, `tabIn`, `ctCheck`,
  the refined `msugPop`); transitions animate transform/opacity/colour/background/border — **no** width/height/top/left/
  margin anywhere. No looping/continuous background animation.
- Focus behaviour unchanged (the v69/v71 panel focus management still holds; smoke re-verifies it).
- On the design skills: `/frontend-design` was invoked and shaped the restraint + single-signature choice. For
  `/web-design-guidelines` and `/general-design-review` — both audit *rendered* UI and motion is invisible without a
  browser, so rather than re-derive at cost I verified their motion rules directly (reduced-motion, GPU props, no loops,
  focus). Flagging this honestly rather than claiming a full audit.

## Tests / verification
- `npm test` = **271 green** (unchanged — presentation only; no pinned contract changed).
- jsdom smoke green, incl. new **[18] v72** section pinning the close-out contract: open adds `.open`+clears
  aria-hidden; close drops `.open` synchronously, sets aria-hidden, adds `.closing`; reopen clears `.closing`.
- `node -c` clean on `js/app.js`, `sw.js`, and all four `api/*.js`.
- Six spots → **v72**.

## Needs Max's phone (motion only shows on device — nothing here is browser-verified; there is no browser in this env)
Test each at **380px, both themes**, then repeat with **OS reduced-motion ON** confirming motion drops out cleanly:
- **Modal open + close** across a few modals (Settings, invoice, builder, a confirm) — open eases in, close fades/scales
  back out, no flash on fast reopen (e.g. a confirm that opens another modal).
- **Tab switches** — the gentle settle, fast, not a hard snap; no jank hopping between tabs.
- **Gemini panel** — the springy expand from the rainbow button (the signature); feels alive but quick.
- **Card / row taps** — consistent press on Products/Ingredients/Plates cards, dashboard highlight cards, menu rows,
  invoice match chips, filter chips — one hand behind all of it.
- **Invoice Confirm All** — the corner-toast springs up with the green ✓ landing; subtle, satisfying, not showy.
- **Toasts / the AI checking→checked note** easing.
- **`fresh-states.spec.js` / `npm run shots`** (Playwright, not runnable here): unchanged markup, but the corner-toast
  and modal timing may shift nothing visual in a static shot — re-run on a browser env and reconcile only if a pin moves.

## NOT built / deliberately left (restraint)
- **No hover-lift** (translateY on hover) on cards — the app's cards signal hover with border-colour consistently;
  adding a lift would be a second, competing treatment. Press-on-tap is the shared feedback.
- **No modal-panel collapse animation** (Gemini panel close stays instant — see §3A rationale).
- **No third signature moment.** Two, as the brief caps.
- Token names left as `--t-fast`/`--t-med` (not renamed to `--motion-*`) — see §1.
- `renderKingWizard` empty-box-fade minor left as-is (see Modal close mechanics).
