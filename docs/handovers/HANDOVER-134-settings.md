# HANDOVER - 134 (Q9 Settings redesign)

**Branch:** `feature/q9-settings-redesign` · **Scope:** Q9 from the redesign phase, plus the two riders whose queue entries asked to ride a batch touching these files. PR #99, shipped as **`ezplate-v128`**.

## What changed
Settings restyle, markup untouched: help text at `--text2` for contrast, quiet theme segment (accent-weak fill + inset accent ring instead of solid accent competing with Done), the target-% input matching the GST select and the mono numeral idiom, desktop's duplicate section title sr-only'd (mobile detail keeps it as its only section label), nav active at weight 800.
The mobile list's "no persistent selection" is now real: the override neutralises weight AND colour back to resting values, closing a pre-existing colour leak the review's weight finding exposed.
`.cogs-in` is defined once, in the Settings block, with a tombstone at the old menu-analysis site.
Rider: absolute `og:url`, canonical, `og:image`, `twitter:image` on the production alias, `TODO(Max)` removed.
Rider closed as stale: the "two stale handover-path comments" item - both comments already said `docs/handovers/…`, so it was struck, not done.
New `tests/visual/q9-settings.spec.js`: title sr-only at 640 and 1280 but present for AT, visible on mobile detail, list uniform after back. The sr-only pin was verified failing against the reverted CSS.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
None new; one line added into Q10: the app's selected-state pair (`--accent-ink` on `--accent-weak`) is 3.74:1 at 15px/800, below AA, and Q9 made it the Settings pane's only visible section cue - decide the pair app-wide there.
Also swept: the `.invAppr` item's `Do with: Q8` line deleted (Q8 shipped without it, so the item is independently shippable again).

## New docs/PHONE.md items
None.

## Probe
**What did the queue item tell you to do that you would have done differently?**
Nothing - the item's "restyle of that structure, not a rebuild" premise was correct, which is worth noting because the last three redesign items each needed a correction.
**What did you not propose because it was out of scope?**
Fixing the selected-idiom contrast (review finding 8) here by forking the colour pair on the Settings nav alone - it is one idiom used app-wide, so it went to Q10 instead.
The mock's in-modal moon theme-toggle - Q10 owns the app-wide theme icon.

## Surprises
- The v81 settings implementation already matched the mock's structure almost exactly, so Q9 was five CSS deltas, the smallest redesign batch yet.
- The pre-push review (8 findings on ~30 changed CSS lines) again beat the suite: the mobile weight leak, the light-theme AA failure and the hover-vs-selected collision were all invisible to every harness and real on sight.
- Three hardcoded production URLs now sit in `index.html` head with nothing testing them; a future custom domain has to find all three by hand. Accepted, noted here.
