# handovers/ — the batch diary

One file per shipped batch: `HANDOVER-vNN.md`. What changed, the root causes
found, the judgement calls made, what was deliberately NOT built, and the
"needs Max's phone" list. **Write-once** — a handover is dated evidence of what
was believed at the time, so it is never edited after the fact. Keep all of
them; git keeps them regardless, and deleting one buys nothing.

This is the log. `CLAUDE.md`'s "State as of" section is the *snapshot* — current
state only, overwritten every batch. If you want history, it is here.

## Known gaps in this record (recorded v88 — deliberately NOT backfilled)

The numbering has holes. They are listed here so a reader who finds no
`HANDOVER-v66.md` knows it is genuinely missing rather than mislaid — and so
nobody is tempted to reconstruct one. **Invented history is worse than an
acknowledged gap:** a reconstructed handover reads exactly like a real one and
would quietly become the record.

### Genuinely missing — no diary entry anywhere

| Version | What shipped, per other sources | Why it matters |
|---|---|---|
| **v41** | Unknown. Only incidental mentions in `HANDOVER-v42.md` and `HANDOVER-v50.md`. | Sits between the v40 logic batch and v42's data-model correction. |
| **v65** | Widened the AI wrong-match detection (`gemMatchSuspect` decoupled from parser confidence). Described only in CLAUDE.md's old "State as of" text, now retired. | No record of the thresholds' reasoning. |
| **v66** | **Reversed a money-handling rule** — the AI no longer overrules the parser's price (`gemMergeLine` never writes Gemini's price when the parser has one). Also added the per-ingredient price log later relied on by v67's insights. | The most consequential gap. A rule about money changed direction with no diary entry; the reasoning survives only in `tests/inv-gemini-merge.test.js` and CLAUDE.md's retired log text. |

### Documented, but folded into a neighbour's file rather than their own

These are not lost — look in the file named, usually under a
`# vNN follow-up` heading near the end.

| Version | Documented in |
|---|---|
| **v64** | `HANDOVER-v63.md` (titled "HANDOVER v63/v64" — the two shipped together) |
| **v76** | `HANDOVER-v75.md` § "v76 follow-up (same branch/PR)" |
| **v78** | `HANDOVER-v77.md` § "v78 follow-up (same branch/PR)" |
| **v80** | `HANDOVER-v79.md` § "v80 follow-up (same branch/PR)" |

The v64 case was flagged by the 26 Jul 2026 audit as an append against the
write-once rule. In practice all four are the same pattern: a small follow-up
shipped on the same branch/PR and written into the parent handover. That is a
reasonable thing to do — **but give the follow-up its own `HANDOVER-vNN.md`
that points at the parent**, so the folder's filenames stay a complete index of
shipped versions. A missing filename is indistinguishable from a missing batch.

### Also corrected in v88

`HANDOVER-v40.md` had been sitting in the repo root since v42, which explicitly
noted the decision not to move it. It now lives here with the rest.
