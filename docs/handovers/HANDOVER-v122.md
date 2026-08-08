# HANDOVER - v122 (the builder was already a modal; its takeover was 24px narrow)

**Branch:** `feature/builder-modal` (PR #77) · **Scope:** the queue's top item, "Convert the builder to a modal".

**Cache bumped: `sw.js` is now `ezplate-v119`.** A client asset changed.

**Suite at close:** `npm test` **773 green** · all **102** Playwright specs green · `node -c` clean · `tests/smoke.js` clean.

## What changed

**The item asked for work that was done in v54.** The builder has been a modal since then, so there was no conversion to make.
Verified before closing: `openBuilder()` calls `show('builderModal')`, `#tab-builder` holds no builder markup, and it was measured in a browser at 380px and 1280px.

**Max's decision is SATISFIED, not reversed.** He answered "make it a pop-up first" and the app is a pop-up.
Worth stating plainly, because `docs/decisions/2026-08-08-ANSWERS.md` warns that a decision taken against advice is the one most likely to be quietly undone by someone who only reads the advice.

**What shipped is a real defect found by driving it.** The mobile takeover was never edge-to-edge.
`.modal{width:min(640px,calc(100vw - 24px))}` in the "margins locked" section sits later in `style.css` than the `@media (max-width:560px)` block's `.modal-builder{width:100%}`, at identical specificity, so it won.
The phone got a square-cornered `100dvh` sheet 24px too narrow, with a 12px strip of backdrop down each side, since v54.
The ingredient wizard had the same bug and is fixed by the same rule.
Fixed with a descendant selector inside the existing mobile block; 600px and 1280px are unchanged.

## Into CLAUDE.md

**Nothing added.** One correction is PROPOSED and blocked on Max, folded into the existing "`CLAUDE.md` lines point a batch at the wrong file" item as a third line.
Tier 2's "The builder becomes a MODAL (Max, 8 Aug 2026) ... converted first, the dropdown placement work second" reads as pending work and sent this batch looking for a conversion that had already happened.
Only the tense is wrong; the decision must not be softened.

## New docs/QUEUE.md items

- **The zero-ingredients builder hint is an unstyled `<a>`.** `app.js:820` emits a bare link and `style.css` has no anchor colour rule anywhere, so it renders browser-default blue, near-illegible in dark. Only a brand-new cafe sees it. Covered by smoke [25], so the state is real.
- **Staging re-filed.** It is no longer waiting on Max: he sent the ref in v121 and `.mcp.json` has it. It is waiting on the staging MCP server actually loading, which it does not.

## New docs/PHONE.md items

- **v119: check both side edges of the builder and the wizard.** Failure is a remaining gutter, or the opposite direction, content under the rounded display corners or the Save bar colliding with the home indicator.
  A phone is the only judge because `dvh` and `env(safe-area-inset-*)` are exactly what a desktop browser cannot reproduce, and both were masked by the 12px inset until now.

## Probe

**What did the queue item tell you to do that you would have done differently?**
All of it.
The item described a full-page builder and asked for a conversion; the builder has been a modal since v54, and the requirements it listed as goals were already true, including "one primary CTA per screen".
Had I trusted it I would have rebuilt a working screen, which is the expensive direction: this item was flagged "big enough to be its own batch and probably its own PR".
**The decision file that produced it was wrong the same way.** All three options offered to Max, including the recommended one, described a state that had not existed for 60+ versions, so he was asked to choose between two things when one of them was fiction.

**What did you not propose because it was out of scope?**
Two.
The 1280px builder resolves to 600px wide while `.modal-builder{max-width:720px}` says otherwise, so something else is capping it.
It looks fine and I did not chase it, but nobody has explained that number and it is the kind of thing that turns out to matter later.
Also the empty-state link contrast, which is one CSS rule and was queued rather than folded in, because the item was about geometry and a colour fix would have ridden in unreviewed.

## Surprises

- **This is the THIRD stale queue item in three batches**, after the zero-menus headline and abbreviation search.
  All three claimed something was missing that had shipped, and all three survived the 7 Aug reconcile, which states that every item "was checked against the code or production before it was kept".
  Three counterexamples make that sentence actively misleading, so a warning now sits directly beneath it in `docs/QUEUE.md`.
  **The pattern is worth more than the three instances: the reconcile checked the paperwork against the paperwork.**
- **The bug had been on the phone since v54 and nobody named it**, including a "mobile visual consistency" pass and four separate empty-state centring fixes.
  It was found by measuring geometry, not by looking at a screenshot, and it is invisible in a screenshot unless you already suspect it.
- **A grep-shaped test would have passed against the broken sheet.** The losing `width:100%` was in the file the whole time; only the cascade knew it was losing.
  That is why the test resolves the cascade instead, and it was verified failing against the pre-fix CSS in both directions.
- **The pre-push review found a false-pass hole in that very test**, which is the one direction a regression test must not fail in.
  The model omitted the `.open` class, and `.modal-overlay` is `display:none` until it is open, so a later `.open`-scoped rule breaking the width would have been dropped in silence while the test kept passing.
  Confirmed by injecting one: now caught and named, previously invisible.
  The reviewer also grepped a coverage claim I had written loosely and found it false, which is the second time in two batches that review has caught a claim rather than a bug.
- **v121's prediction that staging would be reachable "next session" is disproved.** This was that session.
  `.mcp.json` lists both projects and only production loads, so every migration still goes straight to production unrehearsed, which is the safeguard `CLAUDE.md` Tier 3 leans on now that the hand-run rule is retired.
