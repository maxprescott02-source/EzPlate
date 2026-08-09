# EzPlate v3 design handoff

Give this whole folder to Claude Code.

## What's here
- `V3-Design-Package.md` — the spec. Tokens, layout system, every screen and modal, states, mobile translation, parity map, fold-in playbook. This is the instruction set.
- `Redesign v3 - SaaS.dc.html` — desktop mock, 10 screens + 4 modals. Open in a browser, navigate via the sidebar.
- `Redesign v3 - Mobile.dc.html` — mobile mock, 9 screens + bottom sheet. Navigate via the tab bar.
- `support.js` — runtime the two mocks need to render. Keep it next to them.

The mocks are reference only. Nothing in them ships as-is; the app keeps its own stack.

## Prompt for Claude Code
> Read `V3-Design-Package.md` in full, then follow §11 (fold-in playbook) exactly, working in the §10 order. The two `.dc.html` files are visual reference for layout only — open them to see each screen. This is a reskin plus layout migration, not a rewrite: every existing handler, route and data path must still work after each commit. Queue new features as behavior specs, not UI shells.

## Model
Opus-tier for the audit, the token pass, and the Builder/modal screens. Sonnet is fine for the mechanical list-screen restyles (§10 steps 4-5 and 9).
