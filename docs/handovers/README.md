# handovers/ — the batch diary

One file per shipped batch: `HANDOVER-vNN.md`. What changed, the root causes
found, the judgement calls made, what was deliberately NOT built, and the
"needs Max's phone" list. **Write-once** — a handover is dated evidence of what
was believed at the time, so it is never edited after the fact. Keep all of
them; git keeps them regardless, and deleting one buys nothing.

Current state lives in git, `docs/QUEUE.md` and `docs/PHONE.md` - `CLAUDE.md` deliberately carries no snapshot section since the three-tier rewrite. (Corrected 9 Aug 2026 by the v125 audit; this line used to point at a deleted "State as of" section.)
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
| **batch 189** | Docs-only, so it shipped **no deploy version** — which is why it is a batch number here and not a `v`. Commit `1cb623b`, *"189: invitations is blocked, and its stated hard part was the wrong one"*: 25 insertions and 11 deletions to `docs/QUEUE.md`, blocking the invitations item, correcting its premise and renumbering the file. | Nothing was lost technically — the commit message carries the finding and the diff is the change. It is listed because **189 reshaped the item that then decided the next four batches**, and this table's own argument is that an unrecorded gap is indistinguishable from a mislaid file. Added 15 Aug 2026 by AUDIT-v166 (T2). **Do not reconstruct a handover for it**; read the commit. |
| **batch 196** | Docs-only, so it shipped **no deploy version**. | Nothing technical was lost; the commit carries the change. Listed because this table's own argument is that an unrecorded gap is indistinguishable from a mislaid file. Added 29 Aug 2026 (batch 218), from `docs/MAINTENANCE.md`. **Do not reconstruct one**; read the commit. |
| **batch 198** | Docs-only, so it shipped **no deploy version**. | Same as 196, and added at the same time for the same reason. |

### Documented, but folded into a neighbour's file rather than their own

These are not lost — look in the file named, usually under a
`# vNN follow-up` heading near the end.

| Version | Documented in |
|---|---|
| **v64** | `HANDOVER-v63.md` (titled "HANDOVER v63/v64" — the two shipped together) |
| **batch 209** | `HANDOVER-218-cafe-creation-rehearsal.md`. 209 built the café-creation feature and **deliberately wrote no handover**, because its migration could not be rehearsed (staging was paused) and this folder's rule is that a batch whose migration has not been applied has not finished happening. Batch 218 resumed the same branch, applied it, and documented both. |
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

## Naming changed 8 Aug 2026 — the `v` is gone

New files are `HANDOVER-<batch>-<short-name>.md`, e.g. `HANDOVER-123-dashboard.md`.

**Why:** the `v` implied the number was the app version. It is not. The batch number
increments once per batch; the deploy version in `sw.js` increments only when a batch
ships a client asset, so a run of docs-only batches drives them apart. They were three
apart when this was written — `HANDOVER-v122` shipped `ezplate-v119`. That ambiguity had
already caused a wrong audit filing (v115) before it confused Max directly.

**Existing `HANDOVER-vNN.md` files keep their names.** They are write-once: renaming them
to fix a label would be rewriting the record. A reader who sees both forms is looking at
the changeover, not at a mistake.

**Every handover now states the deploy version it shipped, or says it shipped none.**
