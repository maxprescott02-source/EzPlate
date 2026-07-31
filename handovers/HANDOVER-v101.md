# HANDOVER — v101 (batch 2: Settings / global)

**Branch:** `feature/settings-batch` · **Scope:** the Settings cull from the
Batch 0 audit — the app's largest prose surface (~40% of the in-scope cull),
run second so the compressed voice is set at scale before the bigger tabs.
Copy-only: no CSS, no layout, no behaviour. Six version spots v100 → v101.

## The cull table (~270 cullable words → ~109, −60%)

| Surface | Was (words) | Now | Verdict |
|---|---|---|---|
| Target food cost | 25 | "Share of the sell price going to ingredients. Drives suggested prices and the target line." | COMPRESS |
| Theme | 14 | "System follows your phone's setting." | COMPRESS |
| AI suggestions | 25 | "Shows margin insights on the Dashboard. Off = no AI calls." | COMPRESS |
| GST default | 21 | "Used only when an invoice doesn't say. Costs are always stored ex-GST." | COMPRESS |
| AI invoice check | 30 | "A second AI read of invoice matches. Off = imports stay fully offline." | COMPRESS |
| Remembered packs | 22 | "Pack sizes learned from invoices — remove a wrong one and the next invoice re-teaches it." | COMPRESS |
| Tidy lists help + Tidy modal hint | 23 + 26 (near-dupes) | ONE line in both spots: "Rename, merge or clear categories, brands and suppliers — applies everywhere at once." | COMPRESS |
| Export backup | 11 | unchanged | KEEP |
| Clear cache | 17 | "Re-downloads the app. Your data is untouched." | COMPRESS |
| Account / Team placeholder subs | 12 + 15 | CUT — titles alone carry it (the pinned "arrive with EzPlate accounts" fragment lives in the titles, both kept) | CUT |
| Remembered-packs MODAL preamble | 35 | CUT — its only entry point is the Settings row that now explains it | CUT |

Voice rules applied consistently: lead with what it does, one dash clause max,
`Off = …` for toggle consequences, no second sentences restating the control.

**Freebie bug fix:** the smem-modal preamble shipped literal `’`/`—`
escape sequences rendering as text (flagged in the audit) — died with the cut.
`grep -c 'u2019\|u2014' index.html` is now 0.

**Untouched by design:** the clear-cache CONFIRM dialog (pinned "NOT touched",
excluded category), the GST honesty content (the invoice-wins rule survives in
compressed form), install banner, About, taglines.

## CodeRabbit

1 finding: wants the AI-invoice-check line to be a "complete, clear sentence".
Skipped — the fragment style is the approved compressed voice, used
identically on both AI toggles; changing it would break the batch's one-voice
rule. (Nothing else flagged.)

## Verification

- `npm test` 509 green · `node -c` clean · jsdom smoke green (24 sections —
  Settings is smoke's most-covered surface: sections drill-down, toggles,
  theme segments, export, clear-cache flow all re-verified).
- Playwright **91/91** run alone.
- Throwaway spec (scratchpad): both themes × 380/1280 — every help line ≤15
  words, no old phrasing survives, the pinned fragment present in BOTH
  empty-section titles, no `.set-empty-sub` remains, smem modal opens with no
  preamble, no literal `\uXXXX` in the rendered document. Screenshots
  eyeballed (desktop General shown compressed and aligned).

## Needs Max's phone (v101)

1. Walk all seven Settings sections — the six compressed help lines in situ:
   is anything now TOO terse to act on? (The five-second test per section:
   hide it, say what each control does.)
2. The Remembered-packs modal without its preamble — open it with real
   remembered packs; does the list stand alone?
3. Account/Team as bare one-line placeholders — still read as "coming", not
   "broken"?

Carried forward: the v82–v100 phone list.
