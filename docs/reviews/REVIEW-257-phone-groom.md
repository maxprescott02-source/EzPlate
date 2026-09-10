# REVIEW-257-phone-groom

Reviewed-commit: c5f39c693de7c581fe1d93e95552173e2289a3e6

`code-review` agent, Sonnet against Opus, on `git diff main...HEAD`.

**The diff is documentation, two skill files, and a comment-only change to an already-applied
migration.** The review gate refuses a push touching `supabase/`, and it is right to: "it is only a
comment" is exactly the rationalisation the gate exists for, and confirming the SQL is comment-only
is a check worth having rather than an argument to win.

**Three findings, all real, all fixed.** Report verbatim below, dispositions after.

---

## The report, verbatim

## Review findings — `chore/phone-groom-and-decisions` vs `main`

### 1. Migration file — confirmed comment-only ✅
`git diff main...HEAD -- supabase/migrations/20260814_roles_part1.sql` adds exactly 16 lines, and every added line is inside the existing `--` comment block (a new subsection titled "TWO LATER ANSWERS, WRITTEN HERE BECAUSE THIS IS THE LIST PEOPLE COME TO READ"). No `create policy`, `grant`, `revoke`, `alter`, or any other executable statement is touched, added, or removed. **Confidence: high** — verified by direct diff inspection, not inference.

I also checked the added prose against production (`pg_policies` on `ingredients`, `plates`, `supplier_phrases`): `ingredients` carries a restrictive owner-only DELETE policy, `plates` and `supplier_phrases` do not. This matches exactly what the new comment claims ("plates moved back to any member... products became owner-only... taught packs stay open to any member"). **Confidence: high**, measured directly against production via the Supabase MCP.

### 2. `docs/QUEUE-2026-09-08-CONSOLIDATED.md` item 82 and `docs/MAINTENANCE.md`'s duplicate entry are left open despite being exactly the work this batch did — critical/major, high confidence

`docs/QUEUE-2026-09-08-CONSOLIDATED.md:638`, status **`next`** (i.e. unblocked and ready to run):
```
## next  82 · `docs/PHONE.md` needs a groom, and Max asked for it  **[C, 973 lines, 42 sections...]**
```
Its body asks for precisely what batch 257 just did (sort every bullet, merge the header-wrap duplicates, pin a "costs money if wrong" section, cap the rest). The diff does not touch this item — it is not struck, not marked shipped, nothing. It is also still actively routed in `docs/QUEUE-GROUPS.md:173` (`**Items:** 44, 79, 80, 82, 84 (no dependency)...`), which is the file `/batch`'s refill step reads to pull unblocked work. A future `/batch` run can legitimately promote item 82 into `docs/QUEUE.md` and try to re-run a groom against a file that is now 144 lines, contradicting the item's own stated "973 lines, 42 sections."

The same gap exists a second time at `docs/MAINTENANCE.md:287` (`## C — docs/PHONE.md needs a groom, and Max asked for it (15 Aug 2026)`), which is the entry the new section at the bottom of the file (`## C — the checks that came off docs/PHONE.md (10 Sep 2026, batch 257)`) should have struck or referenced and does not.

This is exactly the failure shape `CLAUDE.md` itself names under *"A DONE-MARK IS NOT A STRIKE, AND A STANDING CHECK NEEDS AN EXPIRY"* — work was done, and the entry describing it as outstanding was left standing rather than struck.

**How to verify:** `grep -n "next  82" docs/QUEUE-2026-09-08-CONSOLIDATED.md`, `grep -n "82" docs/QUEUE-GROUPS.md`, `sed -n '287,304p' docs/MAINTENANCE.md` — none show any acknowledgement of this diff's work.

### 3. The `v168` "invoice GST conversion — COSTS MONEY IF WRONG" check is dropped from `docs/PHONE.md` with no trace anywhere — major, medium-high confidence

The old file (`main:docs/PHONE.md:792`) carried a dedicated check: after an invoice import, pick a line with a taught pack, confirm the stored price is the ex-GST figure (~9% below the printed line), and warn explicitly that *"a wrong ANSWER looks like nothing at all — every cost 10% out, uniformly, on a screen of plausible per-kg figures."* That is a distinct, still-live risk (`js/app.js`'s `invGstAdjust`/GST-conversion path is separate code from the `ezplate-v211` parser rewrite this batch is built around).

The new file's item 1 keeps only one fragment of that old section — the "match dropdown to another product and back, price must not move" bullet (the ÷1.1 regression check) — but drops the actual GST-correctness verification (compare stored price against a known real price to confirm the ~9% ex-GST conversion is still happening). Item 1's own pass criterion, *"each price matches the Item Price column on the paper in your hand,"* is not obviously compatible with a correctly-working GST conversion if that supplier's invoices print GST-inclusive prices — a correctly converted price would legitimately differ from the printed figure by ~9%, and nothing in the new text says so.

This omission is corroborated by item 82 itself (§2 above), which explicitly lists what the "Costs money if wrong" section this groom was supposed to produce must include: *"v168 GST conversion, v169 importer GST, 193's carton-vs-pack question, 210's signed-in AI reader, v194/v195's real-PDF import."* Of that named list, v169/193 (item 4), 210 (item 1's "AI checked" bullet), and v194/v195 (superseded by item 1's v211 content) all survive in some form. **v168 alone is missing**, and it is not filed to `docs/MAINTENANCE.md`'s agent-check list either (GST correctness against a real invoice figure requires knowledge only Max has, so it isn't agent-testable) — it appears to have simply been lost.

**Confidence: medium-high.** I can't rule out that the author judged this fully subsumed/redundant with the general "match the invoice" check, but the wording gives no indication that was a deliberate call, and the file's own opening claim — "Max had never used it once" — doesn't distinguish a check where silence is meaningful evidence (UX taste) from one where it explicitly is not (the v168 section itself says a wrong answer produces no complaint-worthy symptom).

**How to verify:** `sed -n '792,832p' /tmp/phone_old.md` (recovered via `git show main:docs/PHONE.md`) against the new file's item 1 and item 4; also read `docs/QUEUE-2026-09-08-CONSOLIDATED.md:640` (item 82's own required contents).

### 4. Everything else checked out

- `docs/PHONE.md`'s specific production claims verify exactly: the "six `Document No:` remembered packs" claim (`count: 6`, the same six phrase_norms) and the "seventh row, The Fruit Wagon / avocado tray, is genuine" claim were both confirmed live against production via SQL.
- The `ezplate-v211` / batch 256 parser-rewrite narrative in the new item 1 (credit-note refusal, bread/beef-patty naming join, fuel levy, supplier-first-then-poultry-second ordering, price-history jump warning) matches `docs/handovers/HANDOVER-256-parser-arithmetic.md` and the old file's own `v211` section closely — no fabrication found there.
- Item 91 is closed consistently between `docs/QUEUE.md` (deleted) and `docs/QUEUE-2026-09-08-CONSOLIDATED.md` (struck with rationale) — **except** `docs/QUEUE-GROUPS.md:129` still lists `**91**` bold/un-struck in G3's `**Items:**` line, unlike its sibling closures in the same line (`~~40~~ (243)`). This diff doesn't touch `QUEUE-GROUPS.md` at all. `tests/queue-routing.test.js` won't catch this because item 91 was deleted outright from `QUEUE.md` rather than struck, so the routing check has nothing left to compare against. **Confidence: high** (direct grep), **severity: minor** — it's a stale pointer, not a data-risk, but it is exactly the class of inconsistency the review was asked to look for.
- The `skills/decide` and `skills/batch` changes are internally consistent with each other and with how they were applied in this same diff (`docs/QUEUE.md`'s item 8 now points at a live Artifact URL, which I confirmed resolves and is titled "Three Contrast Questions," matching the item). No contradiction found against `CLAUDE.md` (which states no rule about `.html` vs `.md` decision files itself).

If you want, I can also check whether item 82 should simply be deleted/struck and the `docs/MAINTENANCE.md:287` entry struck, since fixing that is small and mechanical — but that's a fix decision, not part of what you asked me to report.

---

## What was done about each

### Finding 1 — no action, and it is the one worth having asked for

The gate refused this push because `supabase/` is guarded, and the honest reason to run the review
rather than argue was that **"it is only a comment" is the exact rationalisation the gate exists to
catch.** The agent confirmed it independently, by diff rather than by inference, and then went
further than asked: it checked the new comment's CLAIMS against `pg_policies` on production and
found the three policy states match what the comment says. That is a stronger result than "the SQL
did not change".

### Finding 2 — FIXED, and it is the batch's real mistake

**Consolidated item 82 IS this work, it was left `next`, and its body was the specification.**

The groom was done from the FILE — reading 1051 lines and judging each section — without first
checking whether an item already described the job. It did, in one paragraph, and that paragraph
named the exact contents of the "costs money if wrong" section. Four of the six were folded in by
coincidence; **one was not, and that is finding 3.**

⚠️ **The transferable half is not "strike the item", it is that work arriving from CHAT skips the
queue sweep.** `skills/batch` step 1 reads the queue because the loop starts there. A chat
instruction starts somewhere else entirely, and the item describing the same work sits unread —
so the batch re-derived a specification that already existed and got it slightly wrong.
**Grep the backlog for the thing you are about to do, whatever asked you to do it.**

Struck in all three places the review named: consolidated item 82 (with the lesson written into
it), `docs/MAINTENANCE.md:287`, and `docs/QUEUE-GROUPS.md:173`.

### Finding 3 — FIXED, and the reviewer was right about more than it claimed

Measured before acting: **both of Max's suppliers print EX-GST** (`docs/audits/PARSER-AUDIT-2026-09-08.md`
§3 — Supplier A *"Ex-GST, GST per line"*, Supplier B *"Ex-GST"*). So for his real invoices "matches
the paper" is the correct criterion, and the v168 check is not runnable by him at all today.

**That makes the omission defensible and the WORDING wrong, which is the sharper half of the
finding.** The new pass criterion said, flatly, that a price should match the printed figure. On a
GST-inclusive invoice a correct import stores about 9% BELOW it — so as written, the file would have
had him report a working conversion as a failure, or accept a broken one as a pass.

A caveat paragraph now says exactly that, names it as the old v168 check, and says why it is folded
in rather than kept as its own item: he has no GST-inclusive supplier to run it against, and the day
he gets one that paragraph is the check. The dropdown bullet also now says to use a line with a
taught pack, which is the path the original defect lived on and the path `ezplate-v211` changed.

### Finding 4's minor — FIXED

`docs/QUEUE-GROUPS.md:129` struck for item 91.
⚠️ **The reviewer's note on WHY the routing test could not catch it is the part worth keeping:**
item 91 was DELETED from `docs/QUEUE.md` rather than struck, so `tests/queue-routing.test.js` had
nothing left to compare against. The test checks that every queue item is routed; it cannot check
that a routing entry for a closed item was retired. That direction is deliberately out of scope
(the routing file covers the whole backlog and most of it is unpromoted), so this is a real gap in
what any test can see, not a bug in the test.

**After the fixes: `npm test` 2168 pass / 0 fail; `node -c` clean. No client asset, so no version bump.**
