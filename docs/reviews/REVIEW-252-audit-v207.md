# REVIEW-252 — AUDIT-v207 filed, and the wrong facts it found corrected

Reviewed-commit: 3c876eb98229ce686e3d042b799404552a2560f5

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5).

**Two findings, both major, both mine, and both are the batch committing the exact failure it was correcting.** Acted on; neither declined.

⚠️ **The review ran even though the diff is comment-only in `js/app.js` and the migration.** The artifact gate refused the push, correctly, and the rule it enforces says the line is *deliberately not code-versus-docs* — the batch that nearly wrote it that way had a Markdown-and-YAML diff whose review found a CI change that would have run a live-production-database spec. That judgement paid here: the two findings are in documentation, and one of them would have justified deleting six products nine real plates cost from.

---

## The report, verbatim

> ## Review findings — branch `252-audit-v207` vs `main`
>
> **Verified correct (high confidence):**
> - The `js/app.js` changes (`logChange` doc comment, `trendMarkers` doc comment) are genuinely comment-only — `node -c js/app.js` passes, `npm test` is 2049/2049 (matches the report's claimed count exactly), and the technical claim in the new comment (`avgAfter` defaults to a live `computeAvgFoodCost()` call, `trendMarkers` sums `drop` per day) matches the actual code at `js/app.js:4716-4722`. No test greps that comment text, so nothing is made vacuous.
> - The `supabase/migrations/20260910_history_delete.sql` change is a comment-only addition (a fingerprint-diff record appended after `commit;`), not a new statement.
> - The headline `CLAUDE.md` correction (which functions hold `anon` EXECUTE) is **exactly right**. I ran `has_function_privilege('anon', p.oid, 'EXECUTE')` against production for all 11 named functions and got precisely the split the diff states: `current_business_id`, `current_business_role`, `invite_pending`, `restore_backup`, `set_default_business_id`, `set_member_role`, `stamp_invite` → true; `business_team`, `claim_business_invite`, `create_business`, `my_pending_invites` → false. This also matches the by-name `revoke execute … from anon` statements actually present in the migrations and mirrored in `supabase/staging/01-schema.sql`.
> - Several other re-measured claims (ZZ-AUDIT object cleanup state, the two bad `price_history` points at ids 378/379, the delete-policy table for item 91) all checked out exactly against production.
>
> **Finding 1 (major, high confidence) — `docs/MAINTENANCE.md`'s new "249 left six products…" entry is factually wrong, contradicted by current production data.**
> The new section states as fact: *"Batch 249's picker linked the thirteen stranded plate lines onto ingredients. The six products those lines used to point at are still in the catalogue, and now genuinely nothing references them — no ingredient, and after 249 no plate line either,"* naming `P0004`, `CXmr8nx4z80`, `P0214`, `P0073`, `P0181`, `P0184`.
>
> This is false right now. I queried production `plates.lines` and found all six pids still present as live `{pid, qty}` lines, in 9 real Scoopy's Family Cafe plates (`business_id` confirmed), across exactly 13 lines — the identical 13-lines/9-plates figure `HANDOVER-249` itself recorded as the *pre-heal* count. Batch 249 shipped a Settings *screen* that asks Max to choose an ingredient per product ("Link older plate lines" — item 88, correctly marked "SHIPPED" for the UI); it did not, and cannot, apply the relink itself — that requires Max's interactive choice, which evidently hasn't happened. So the "no plate line references them" claim describes an action that has not occurred, sourced uncritically from a stray line in `HANDOVER-249` without re-verifying against current data — the exact failure mode this same diff carefully avoids everywhere else.
>
> Concrete risk: `CLAUDE.md`'s own rule is "a stale fact is worse than no fact, because it gets trusted." If a future batch or Max acts on this claim (e.g., treats these six as safe clutter and deletes them via SQL rather than through the app, bypassing `productRefs`'s client-side guard), nine real menu plates would lose a costed ingredient line silently.
>
> **Finding 2 (minor-to-major, high confidence) — the newly-raised queue item 91 is not routed to `docs/QUEUE-GROUPS.md`, violating the rule this very diff restates.**
> This diff adds item 91 to both `docs/QUEUE.md` and the consolidated file, and separately spends real text fixing `docs/QUEUE-GROUPS.md`'s G1 for exactly this omission on item 90 ("a batch that raises an item routes it in BOTH files, or the group it belongs to silently under-counts"). Item 91 is squarely G3's context, yet `grep -n "91" docs/QUEUE-GROUPS.md` returns nothing. This is the identical failure mode the diff diagnoses and fixes for item 90, reproduced by the diff itself for item 91, in the same commit.
>
> **Not a finding, but worth noting:** as of this diff's tip there is no `REVIEW-252-*.md` and no `HANDOVER-252*.md` — `node tests/review/check.js` currently refuses the push. Flagging only so it isn't missed.
>
> **Everything else checked and found correct:** the `menu_items` staff-delete-is-deliberate claim (confirmed in `20260814_roles_part1.sql`'s own comment), the owner-only-delete table, the `.gitignore`/`.env` strike, the G3 `ensureDefaultMenu` removal note, and the STAGING.md / verify-skill additions — all consistent with the repo and with each other.

---

## What was done about it

**Finding 1: FIXED, and it is the worst thing in this batch.** Measured on production before rewriting: **all thirteen lines across nine plates are still live**, exactly as item 88 recorded them. 249 shipped the picker that *asks*; it applies nothing on its own, and Max has not used it.

**How it happened is worth more than the correction.** `HANDOVER-249`'s Probe said *"the six products themselves are still in the catalogue with nothing using them"* — which meant **no INGREDIENT uses them**, and was true. Carried forward one step, "nothing uses them" became "nothing references them", and a true sentence about ingredients became a false one about plate lines that would have justified deleting six products nine plates depend on.

**That is a measurement quoted one step too far — the identical shape this batch corrected in the ZZ-AUDIT bullet, in the same diff, in the batch whose entire subject was re-measuring stale claims.** The entry now leads with a measured table and carries a `DO NOT DELETE THESE PRODUCTS` warning naming the nine plates.

**Finding 2: FIXED, and it found a FOURTH instance.** Item 91 is routed into G3. And because three restatements of the rule had not worked, it is now mechanised: `tests/queue-routing.test.js` asserts every `docs/QUEUE.md` item numbered 16 or above appears in an `**Items:**` line of the routing file.

**The check failed on its first clean run**, which is how **item 89** surfaced — split out of 18 by batch 241, unrouted for eleven days and through two audits, while its group read as finished. Nobody had seen it, including two audits and this one.

⚠️ **And the first version of the check was too weak, found the same way everything else here was.** It searched the whole file, so removing 91 from G3's `Items:` line left it green — because 91 is also named in the paragraph *explaining that it had once been missing*. A grep over a document searches its prose, and here the prose was this very rule being written about (roster 183(a)). It reads only the `**Items:**` lines now, and removing either 89 or 91 turns it red.

**Verification after both:** `npm test` 2051 pass · `npm run smoke` pass · `node -c js/app.js` clean.
