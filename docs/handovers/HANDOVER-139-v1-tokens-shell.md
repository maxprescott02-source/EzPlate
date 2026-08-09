# HANDOVER - 139 (V1: v3 tokens + shell)

**Branch:** `feature/v3-tokens-shell` (PR #109) · **Scope:** queue item "V1 - Tokens + shell" (§10.1; spec §1, §2), the v3 phase's one deliberately-global batch.
**Deploy version shipped: `ezplate-v132`.**

## What changed
The whole app repaints to the v3 palette: white canvas, flat white cards on hairline borders, one marmalade accent, Geist / Geist Mono self-hosted (eight woff2 committed with the OFL license, Google Fonts gone, fonts cached by the service worker).
Dark mode is fully removed - token blocks, the header moon toggle, the Settings theme segment, all theme machinery - and the stale `cafeCost_theme` key is actively deleted at boot.
At ≥1024 the sidebar is the v3 shell: 224px on `#FAF7F1`, tinted active pill, Settings in the bottom group (`#sideSettings`), header hidden, 48px panel title bars on the four static tabs.
Entry-rise motion per §1.4, double-guarded for reduced motion; press stays `scale(.98)` (v115 law), recorded at the token.
Below 1024 the layout stays today's (new tokens only) until V9.

## Into CLAUDE.md
Nothing proposed.

## New docs/QUEUE.md items
- Small: the ~390KB of fonts re-download on every deploy (versioned cache churn); `cache.addAll`'s swallow noted; an ASSETS-exist unit pin now covers the typo case.
- Small: the v3 opaque semantic tints no longer composite with row hover - decide in V2, which owns the table system.

## New docs/PHONE.md items
None - mobile keeps today's layout this batch; V9 is the mobile batch.

## Probe
**What did the queue item tell you to do that you would have done differently?**
Two spec values failed their own §7 AA claim once measured (`muted` #A2937F at 2.99:1, the bad pair at 4.44:1) - both replaced with same-hue AA values, recorded at the token. V10's note "verify with measured ratios, don't trust the spec's own claim" was right early.
**What did you not propose because it was out of scope?**
Reordering the nav to the spec's order - the sidebar and the mobile bar are one element, so the reorder belongs to V9, whose §6.1 parity map is the acceptance checklist.
The mock's ⌘K button, "UI states" and Invoices nav entries, and the skeleton shimmer (V8 emits skeletons; shipping the animation now would be dead CSS).

## Surprises
The review's headline major: giving the sidebar Settings entry the `.navbtn` class put it under the blanket tab wiring, so opening Settings ran `showTab(undefined)` - every pane hidden, the string "undefined" written into `cafeDB_lastTab`, and a blank desktop screen after closing.
Both specs I had already updated PASSED against that broken build (they assert DOM counts, which ignore a hidden ancestor) - the "test that cannot fail" pattern again, caught only because the reviewer ran the click by hand.
The wiring is now scoped to `.navbtn[data-tab]` and the round trip is pinned.
Also: the old variable font had been silently lending the CSS weights (650/800/900) that the four static Geist faces cannot honour - the CSS now authors only weights that exist.
The first rewrite of the v98 elevation test could never fail (`none` × 4 is the initial value); it now pins token equality.
