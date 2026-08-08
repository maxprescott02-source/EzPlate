# HANDOVER - 129 (the v125 audit, run and filed)

**Branch:** `docs/audit-v125` · **Scope:** the queued `project-audit` item (gap of 10 reached at v125).

**Ships no client asset.** Docs only; no cache bump; pre-push review skipped per the pure-prose rule.

## What changed
The audit ran (read-only agent) and the report is filed at `docs/audits/AUDIT-v125.md`.
Verdict: **healthy** - 799/799 unit green, every reachable Tier 1 invariant TRUE, the protected parser region byte-identical across ten deploy versions (md5 recorded for the next auditor), zero identifier renames across five screen redesigns, no dead traps recommended for deletion for the second audit running.
Every actionable finding was landed somewhere a batch will read it, in this same PR:
the satisfied `Do after: Q6` line on the dropdowns item is deleted (the audit caught it surviving one batch past its trigger);
the inversion-guard hardening (audit T1 - the guard cannot catch a label SWAP) is queued as the next item;
Q7, Q8 and Q10 carry their fold-ins (stale path comments + no-price language; the jsdom inline-handler warning; the trend-chart mock diff + row aria-labels);
`docs/PHONE.md` no longer tells Max a v118-fixed bug is a known bug, and its v102/v103 blocks say the screens were redesigned under them;
the queue header no longer claims the design package is not in the repo; the Playwright-count standing rule no longer hardcodes a rotting number; the mutation item quotes the real suite size;
`docs/handovers/README.md` no longer points at the deleted "State as of" section;
and the disproved staging prediction in `20260808_menus_rls.sql` carries a dated correction (appended, never rewritten).

## Into CLAUDE.md
Two proposals, both added to the existing blocked "stale CLAUDE.md lines" item (now five lines) awaiting Max's yes:
**S1** - Tier 2's "plates persist {kid, qty} ONLY" contradicts 84 of 179 live plate lines and Tier 1's own `addProduct` entry; drop the "only".
**C1/S5 (the audit's lead finding)** - Tier 3 presents staging as an available safeguard while it has never loaded; the hand-run stop condition was retired on its strength. Until staging demonstrably loads, Tier 3 should say migrations are unrehearsed.

## New docs/QUEUE.md items
Harden the naming-inversion guard (T1) - next item, above Q7.
The publish-dialog/Menu-row precision split (in Small).
A stale-line-numbers caution atop the Small block (~290 app.js lines moved in the redesign; re-grep by name).

## New docs/PHONE.md items
None new - two corrections instead (the v118 contradiction, the redesigned-screens banners).

## Probe
**What did the item tell you to do that you would have done differently?**
Nothing - the item was written by the previous batch's step-10 counter check and matched reality exactly, including the deploy-version filename rule.

**What did you not propose because it was out of scope?**
Fixing T1 in this batch - it is a five-line test change, but it changes what runs, and bundling it into a docs-only PR would have laundered a code change past the review rule. It is the next queue item instead.
Retrying the staging MCP diagnosis - no Supabase MCP namespace of any kind was available to the audit session or this one, so a retry would have measured my tooling, not the project.

## Surprises
- The audit found the `Do after:` deletion mechanism failing on its first live trigger: Q6 shipped and the dropdowns item's line survived the same batch's sweep. The mechanism is sound; the sweep has to actually run at step 1 of every batch, including ones (like Q6's) that end late and tired.
- Six batches met the "fix the stale path comments in the next batch that touches those files" trigger without any noticing - a trigger written into a queue item nobody re-reads at build time. Follow-ups that gate on "the next batch that touches X" need to live ON the item that will touch X, which is where the audit has now put them.
- The audit itself is the strongest argument yet for the blocked Stryker item: it counted five prior "green against broken code" incidents and then found a sixth (T1) itself.
