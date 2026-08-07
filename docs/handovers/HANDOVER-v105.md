# HANDOVER — v105 (chore: the About privacy line)

**Branch:** `chore/privacy-line` · One line. The flow-tester's post-sequence
pass surfaced that Settings → About shipped the literal placeholder
`Privacy — TODO(Max)` to users; Max said fix it.

## The line

> Privacy — data stays on this device and EzPlate's synced database. AI
> features (both optional, in Settings) send invoice text and plate names to
> Google Gemini.

Why this wording: it is the TRUE statement of the app's data flows —
localStorage + Supabase sync, plus the two opt-out AI paths (invoice second
reader, insight phrasing) that send data to Gemini's free tier. It matches
the compressed Settings voice and the two AI toggles' own help lines. It is
NOT a privacy policy — CLAUDE.md's privacy gate (paid tier or policy before
multi-tenant) stands unchanged; this line just stops the app showing "TODO"
to staff.

## Verification

`npm test` 509 green · smoke green · Playwright **91/91** alone ·
`node -c` clean · six spots v104 → v105 · CodeRabbit 0 findings. The line is
unpinned by any test (verified before editing).

## Needs Max's phone

Settings → About: the line wraps to ~3 lines at 380px — read it once in situ.

Carried forward: phone sign-off on v82–v104 (the sequence's standing list).
