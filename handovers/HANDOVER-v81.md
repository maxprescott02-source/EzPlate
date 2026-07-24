# HANDOVER v81 — Settings: proper sectioned surface (sidebar / drill-down) + AI toggles + theme preference

**Completed:** 24 Jul 2026 · branch `feature/settings-sections` (off `main` @ v80, PR #21 merged) ·
brief `~/Downloads/ezplate-opus-settings-sections.md`. Plan approved by Max (two judgment calls answered:
Account/Team shown as empty states; AI-suggestions toggle in General).

Baseline v80, **318 node green**, jsdom smoke green, `node -c` clean. Ended **333 node green** (+15 in a new
`tests/settings-toggles.test.js`), smoke green (+ new `[3b]` section), `node -c` clean (app.js, sw.js, the four
`api/*.js`), six spots → **v81**. Client only (HTML + CSS + JS + tests). **Zero contact** with the protected
parser region, money law, naming inversion, data model, the invoice review render / `invRowState` / auto-tick, the
insight ENGINE, or `api/*.js`. No new dependency. **No setting changed behaviour** — everything was relocated and
restyled; the two new toggles GATE existing code paths, they don't alter them.

## What changed — Settings is now a sectioned surface

The old `#settingsPanel` was one long scroll of stacked `.set-group` blocks with an inconsistent control/help
alignment (button-left/text-right in some rows, stacked in others). It's now a **navigable, evenly-spaced sectioned
surface** inside the SAME modal (so every existing id / handler / test contract survived):

- **Desktop (≥640px):** a left **sidebar** (`.set-nav`, 184px, `--surface2`) lists the sections; the selected
  section renders in the right pane (`.set-content`). Active item = `aria-current="page"` (accent-weak highlight).
  The modal widened 560 → **760px** to fit both columns; each column scrolls independently.
- **Mobile (≤639px):** standard **list → detail** drill-down. Settings opens as a list of section cards (each with
  a `›` chevron); tapping one drills to that section's content and reveals a **back arrow** (`#settingsBack`) in the
  modal header that returns to the list. Driven by a `.detail-open` class on `.settings-panel` (`setSettingsSection`
  adds it, `settingsBack` removes it); on desktop `.detail-open` is a no-op (CSS shows both columns always).
- **State is NOT persisted between opens** — `openSettings` always resets to General / the mobile list.

### Where each existing setting moved (behaviour unchanged, only location + styling)
- **General** — Target food cost (COGS %); **Theme preference** (new, §4); **AI suggestions** toggle (new, §4).
- **Invoices** — GST default; **AI invoice check** toggle (new, §4); **Remembered packs** (moved here from the old
  "Tidy lists" group — it's an invoice concept). `setSmemOpen` id unchanged.
- **Lists** — Tidy lists (`setTidyOpen` unchanged).
- **Data** — Export backup (JSON); Clear cache & refresh.
- **Account / Team** — future-proof placeholders (§3).
- **About** — app name, version (`#setVersion`), contact, privacy TODO.

Every control id handlers bind to is intact (`setCogsInput`, `setGstDefault`, `setExport`, `setClearCache`,
`setTidyOpen`, `setSmemOpen`, `setVersion`) — the settings.test.js version-mirror + COGS-round-trip and the smoke
`[2]/[3]` pins all still pass unchanged. One shared row pattern app-wide now: `.set-item` = label + help on the
left, control on the right (stacks on mobile). This is the single control/help alignment relationship §5 asked for.

## Sub-surface back navigation — Max's specific complaint, fixed

Max: *"opening Tidy lists by mistake must be one tap to get back."* Before, the Settings doors did
`closeSettings(); openTidyManage()` — so escaping Tidy/Remembered dumped you to the app, a dead end.

Now the Settings doors record a **return section** (`reopenSettingsSection`) before opening the sub-modal, and
`closeTidyManage` / `closeSmem` call `backToSettingsSection()` — which reopens Settings **at the parent section in
the mobile detail view** (Lists for Tidy, Invoices for Remembered packs). Verified in a real browser at 390px:
open Tidy from Lists → close → back at Settings/Lists (`{activeSection:'lists', detailOpen:true, settingsOpen:true}`).
The OTHER door into Tidy (a filter's "Manage list…") never sets `reopenSettingsSection`, so it still closes back to
the app exactly as before. (Chosen over stacking two modal-overlays — `smemModal` sits BEFORE `settingsPanel` in the
DOM, so it would have painted *behind* Settings; the return-flag approach is DOM-order-independent and gives a clear
back rather than two stacked scrims.)

## The two new toggles (§4) — the existing settings-persistence pattern, exactly

Both follow the GST/COGS house pattern: a module var + `load*()` (localStorage mirror, **default ON** so brand-new
accounts / anyone offline are byte-identical to today) + `set*(on, persist)` (localStorage + `dbSetSetting` when
`persist`) + a round-trip read in `bootstrapSync`. Each gates a SINGLE existing choke point:

- **AI invoice check** (Invoices, `ai_invoice_check` / `cafeDB_aiInvoiceCheck`): gated at the top of
  `gemFireSecondReader`. OFF ⇒ `gemStatus=null`, `renderInvReview()`, **return before any `fetch`** — no API call at
  all, no "checking" note; the deterministic parser behaves exactly as today. (Unit-tested both ways: OFF makes no
  fetch, ON still fires.)
- **AI suggestions** (General, `ai_suggestions` / `cafeDB_aiSuggestions`): gated at the top of `renderMenuInsights`.
  OFF ⇒ clears the host, hides the FAB, closes the panel — the trigger and panel **don't render at all** and nothing
  is computed. `setAiSuggestions` re-renders immediately so the toggle takes effect live.

## Theme preference (§4) — surfaced, not a second mechanism

A **Light / Dark / System** segmented control in General. It reuses the header moon toggle's EXACT mechanism —
`localStorage['cafeCost_theme']` + `<html data-theme>`. Light/Dark write the key + attribute; **System clears both**
so CSS falls back to `prefers-color-scheme`. Kept **device-local** (not synced via `dbSetSetting`) to match the
header toggle — theme is per device and staff share devices. The header moon toggle keeps working; this is the
persistent choice behind it, surfaced. `loadThemePref()` returns `'system'` when the key is absent (today's default).

## Placeholder decision (§3) — SHOWN as empty states (Max's call)

Account and Team are **real nav items** that open a clean dashed empty-state card ("Sign-in and account settings
arrive with EzPlate accounts" / "Team roles arrive with EzPlate accounts"), NOT a disabled grey row and NOT a fake
control. Verified in-browser they read as a roadmap, not broken software — so they're shown, not hidden. When
accounts ship they slot into the existing nav with no restructure. **Billing deliberately NOT added** (too
speculative, per the brief).

## Tests / verification

- `tests/settings-toggles.test.js` (NEW, 15 tests): both toggles' default-ON + persist + round-trip + no-sync-when-
  `persist:false`; theme resolution (dark/light set the header key + attribute, System clears both, default =
  system); the **gate behaviour** — AI invoice check OFF makes no `fetch` (ON still fires) via an extracted
  `gemFireSecondReader`; source pins that `renderMenuInsights` is gated and `bootstrapSync` reads both keys; the
  sectioned-surface structure (7 nav items + 7 sections + back control) kept every control id; Account/Team are empty
  states, not disabled controls.
- `tests/smoke.js` `[3b]` (NEW): opens on General, 7 nav items, drilling adds `.detail-open` + swaps content, back
  clears it, toggles prefill + flip the module flags + mirror to localStorage, AI-suggestions-off clears the insights
  host, theme segments force/clear `data-theme` + the header key. Existing `[2]/[3]` settings pins unchanged & green.
- `npm test` **318 → 333**, jsdom smoke green, `node -c` clean, six version spots → **v81**.
- **Verified in a real browser** (Chrome, localhost) across desktop (1100px) + mobile (390px), light + dark: the
  sidebar layout, the drill-down + back arrow, the consistent row rhythm, the segmented theme control, the switches,
  the Account empty state, and the Tidy-lists one-tap-back round-trip. (Screenshots taken during the batch; not
  committed.)

## Recommended FOLLOW-UP — NOT built this pass (top priority)

**Import / restore from backup.** Export exists (Data section); there is still no way to restore a backup JSON — a
backup that can't be restored isn't a backup. This is data-destructive (overwrites or merges live data) and deserves
its own brief with proper confirmations, a dry-run summary ("this file contains 381 products, 42 plates — replace or
merge?"), and tests. Flagged here as the top follow-up; deliberately not implemented.

## Needs Max's phone (feel / touch — can't be judged here)

- Settings at **380px**: the section list, tapping a card slides to detail, the **back arrow** returns to the list;
  no dead ends. Both themes.
- **Desktop sidebar** (if he ever uses a wider screen / tablet): sidebar + content, active highlight, independent
  scrolling.
- **Tidy lists AND Remembered packs** both reachable from Settings AND escapable back to their section in one tap.
- **Both new toggles persist across a reload** (turn off, reload, still off) and across devices (they sync via
  `dbSetSetting`); AI invoice check OFF → a real import makes no AI call (no "checking" note); AI suggestions OFF →
  the EzPlate Insights pill/panel don't appear on the Menu tab.
- **Theme preference:** Light / Dark / System all take effect; System follows the phone; the header moon still flips
  light/dark and agrees with the control on the next open.
- Segmented theme control keyboard: each segment is a focusable `<button>` (Tab + Enter/Space selects); arrow-key
  roving within the group is NOT implemented — flag if wanted.
