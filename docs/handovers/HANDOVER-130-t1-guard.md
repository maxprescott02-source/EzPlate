# HANDOVER - 130 (audit T1: the inversion guard pins the crossing)

**Branch:** `fix/inversion-guard-t1` (PR #92) · **Scope:** the queued audit-T1 item.

**Ships no client asset.** Test-only; no cache bump. Suite at close: **800 green**.

## What changed
`tests/terminology.test.js` now pins the naming inversion's CROSSING, not just the presence of both `data-tab` strings.
Both halves: the nav button (attribute + aria-label + visible label on one element) and the panel `h2` each tab opens.
Each pin was verified failing against a simulated swap before committing.

## Into CLAUDE.md
Nothing.

## New docs/QUEUE.md items
None.

## New docs/PHONE.md items
None.

## Probe
**What did the item tell you to do that you would have done differently?**
Nothing - the audit's finding specified the fix almost exactly, and the review still improved it (the panel-h2 half was unpinned anywhere in the repo, and my first cut repeated the audit's own blind spot by pinning only the nav).

**What did you not propose because it was out of scope?**
Pinning every crossed string app-wide (buttons, empty states, modals) - that generalises into a snapshot test of all copy, which fights every future copy edit. The two surfaces a swap would actually ship through are pinned.

## Surprises
- The reviewer disproved one of my negative assertions by construction (it could not fail while the positives held) and convicted the other of false-positiving on legitimate attribute text - the same "test that cannot fail" class the audit counted six instances of, caught before merge this time.
