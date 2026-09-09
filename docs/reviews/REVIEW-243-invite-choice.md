# REVIEW-243 — two pending invitations: refuse rather than guess

Reviewed-commit: d02d757206e85b16e140e6f494e4ad65c8e6ed6a

**Agent:** `code-review`, run on Sonnet (the batch ran on Opus 5). Given the diff and the codebase
conventions, and **not** the queue item, so it judged correctness rather than conformance.

**Six findings. All six acted on; none declined.** Two were majors and both were mine.

---

## The report, verbatim

> ## Findings
>
> **1. MAJOR — `_pendingInvites` is overwritten unconditionally on a failed recheck, discarding a known-good offer on a transient error**
> `js/app.js:939-943` (`joinInvite`), also `js/app.js:1544` (`bootstrapSync`'s nomember branch, reachable from `window.addEventListener('online', …)` at `js/app.js:8223` while the chooser is already up).
>
> When a join attempt fails (any reason — cancelled, or a network error), `joinInvite` unconditionally re-fetches `my_pending_invites()` and assigns the result straight into `_pendingInvites` via `invitesOf(...)`. `invitesOf` (`js/app.js:1148-1156`) returns `[]` both for "confirmed zero rows" and for "the RPC itself errored" (`if(!res || res.error || !Array.isArray(res.data)) return [];`). So if that second RPC also fails — very plausible in the same network conditions that made the first call fail, or on an `online`-event re-sync firing while the connection is still settling — a list of real, still-valid invitations that was just on screen collapses to `[]`, `renderInviteChoices` hides the whole chooser (`js/app.js:897`), and the user is left looking at only the "Create my café" form with no visible sign anything was ever offered.
>
> This is precisely the "fail-open is what you do with no information — reusing it as the answer to a RECHECK reopens the hole" pattern this codebase already names and fixed once for `_bootNoMember`/`_tg` (three-value discipline: only a *definite* answer may overwrite a standing verdict). That discipline was applied to the tenant-gate state but not extended to this new state variable: `_pendingInvites` has no "unknown, leave it alone" case, only "here is the new list" vs implicit "empty." Given the app's own stated one-membership-per-user, no-leave rule (restated in this very diff's `index.html` comment — "creating one here permanently forecloses the invitation they were sent"), a user who is scared off by a wrongly-emptied chooser and creates their own café instead has done something irreversible. `joinInvite` has zero test coverage (not extracted in `tests/boot-gate.test.js`, not in `tests/mutation/targets.js`), so nothing pins the correct behavior (keep the last known list, or at least distinguish "confirmed gone" from "couldn't check") either way.
>
> Confidence: high on the mechanism (read directly, traced both call paths) and high that it's a real defect, not merely theoretical — it reuses the identical shape CLAUDE.md documents as this project's worst prior bug.
>
> **2. MAJOR — the standing SQL test for `claim_business_invite`'s security is pinned to a now-superseded migration file, so it verifies nothing about the deployed function**
> `tests/invites.test.js:36-38` (`MIGRATION_FILE = '20260814_invitations.sql'`), test at `tests/invites.test.js:282-294` titled *"claim_business_invite takes NO argument — that is the whole of its security."*
>
> This diff's own migration header explicitly invokes the "find the newest definition by listing the directory" lesson (roster 219) for itself, and correctly identifies `20260814_invitations.sql` as the ancestor to replace. But `tests/invites.test.js` was not touched at all, and it still reads and asserts against that same 20260814 file — which still contains the *old*, 0-arg `create or replace function public.claim_business_invite()`, because migrations are never edited after the fact. The deployed function (from `20260909_invite_choice.sql`) now takes `p_invite uuid default null`. The test's own docstring (`tests/invites.test.js:19-23`) states the exact property it is trying to guarantee — "there is nothing to point at somebody else's invitation... a `p_email` parameter would leave every other assertion in this file green" — and then goes on to check that property against dead code. The suite is green, but for the wrong reason: `20260814_invitations.sql` never changed, so of course it still says `claim_business_invite()`. Nothing in the automated suite currently verifies the argument shape or the caller-identity binding of the function that is actually running. (I confirmed by inspecting the new function that the *real* code is still correctly scoped to the caller's own confirmed email — this is not a live vulnerability today — but the regression guard that specifically exists to catch someone from loosening that in the future is now inert, which is exactly the shape CLAUDE.md calls "the only security-critical assertion of the three" in its own retelling of this failure mode.)
>
> The companion test at `tests/invites.test.js:397` ("the mirror's four function bodies are BYTE-IDENTICAL to the migration's") is likewise now comparing two stale artifacts to each other rather than to what's deployed.
>
> Confidence: high — verified by reading the file, confirming the hardcoded path, and running the suite to see it green.
>
> **3. MODERATE — the schema mirror was not re-run, so a fresh staging rebuild reinstalls the vulnerable function**
> `supabase/staging/01-schema.sql` is untouched by this diff. `docs/STAGING.md` states the standing procedure in so many words: *"01-schema.sql mirror production's schema. Idempotent — re-run it after any production migration."* Since the mirror still only contains the pre-243 `claim_business_invite()` (0-arg) and no `my_pending_invites()`, any future `01`+seed rebuild of staging silently reinstates the exact bug this batch fixes, and any rehearsal against a freshly-mirrored staging project would not be testing the current design. This may be intentionally deferred to pair with the still-outstanding production apply (the migration header says production is "NOT YET APPLIED... deliberately deferred"), in which case it should be done together — but nothing in the diff says so, unlike the migration header's explicit note about deferring the production apply itself. Medium confidence this is a real gap rather than an intentional, stated deferral.
>
> **4. MINOR — documentation debt: two docs still claim the anon-grant gap is outstanding, on the same branch that closes it**
> `docs/MAINTENANCE.md:981-998` and `docs/QUEUE.md:125` both still describe `claim_business_invite()`/`business_team()` being callable by `anon` as "reasoned-not-run" / an open item, even though `20260909_invite_choice.sql` applies exactly the SQL those entries prescribe (to staging; production pending). Neither was struck or updated in this diff. This is the mirror image of the "A DONE-MARK IS NOT A STRIKE" trap this project's own `CLAUDE.md` names from AUDIT-v197 — here the code moved but the doc claiming it's still broken didn't follow, which will cause a future audit to re-flag a thing that (mostly) already shipped.
>
> **5. MINOR — TOCTOU between the ambiguity probe and the actual row pick**
> `supabase/migrations/20260909_invite_choice.sql`, the `p_invite is null` branch: the `count(*) ... limit 2` probe and the subsequent `select ... for update` are two separate statements under READ COMMITTED with no shared lock between them. If a second invitation for the same address is inserted in the gap between them, the count-of-1 determination is stale and the code proceeds straight to picking the (now not-necessarily-unique) oldest row without re-checking — silently reverting to the old guessing behavior for that one race. Narrow window, not a privilege-escalation path, but worth noting since "count before choosing" is the stated correctness mechanism of this migration.
>
> **6. MINOR — double-submit is only guarded per-button, not across the list**
> `js/app.js:924-930`: `joinInvite` disables only the specific button clicked (`if(btn) btn.disabled=true;`); the other rendered invite buttons stay enabled during the pending request. Two quick clicks on two different invitations from the same account can send two concurrent `claim_business_invite` calls. The `business_members` unique constraint backstops this (the loser gets a raw DB error surfaced through `errText`, not silent corruption), so this is cosmetic rather than a correctness/security issue.
>
> ---
>
> Everything I checked in the SQL migration itself that the task asked about specifically — `for update` placement relative to the read, the drop-before-create ordering for the 0-arg overload, the named-claim path's scoping to the caller's own confirmed email (no way to aim it at someone else's invitation), and the grants (`revoke...from public` vs the real `anon` default-privilege fix, ordered after the creates) — is correct and matches what it claims to do. The client's XSS handling in `renderInviteChoices`/`invitesOf` (escaping, role allow-listing, dropping rows with no id) is also correct and is exercised by tests that would actually fail if the guards were inverted (confirmed by reading the boot-gate tests' explicit "written the wrong way first" and inverted-guard commentary). The real problems are the two I gave top billing: the state-loss-on-recheck bug in the client, and the stale security test that no longer verifies the property it claims to.

---

## Disposition

### 1 — **FIXED.** Reproduced first, against the real function

`invitesOf` returned `[]` for a confirmed-empty answer *and* for an unreadable one — printed side by
side before touching anything, and they were byte-identical. The reviewer's reading of the
consequence is right and is the part that makes it a major rather than a nit: **187 makes membership
one café per person with no way to leave**, so somebody who concludes the invitation never arrived
and creates their own café has done something no one can undo.

`invitesOf` now returns `null` for could-not-tell. `applyPendingInvites` is the **single writer** and
both call sites go through it — they are 600 lines apart, which is why this is a function rather than
a rule. The test that asserted the old behaviour has been rewritten to assert the new one, plus its
counterweight: a **definite** empty answer still clears the offer, or a cancelled invitation would go
on being offered.

### 2 — **FIXED**, and it is the finding I am most glad of

Roster entry 219, in the one file whose docstring names the property as *"the whole of its
security"*, found in the batch whose own migration header cites 219 as the reason to list the
directory. The test read `20260814_invitations.sql` at a hardcoded path, and a migration is a
historical record: it still says `claim_business_invite()` and always will.

`newestDefining()` now resolves the source by listing the directory. The test's *title and claim*
changed too, because the property genuinely changed — the function now takes an argument, and what
makes that safe is `and i.email = em` scoping every lookup to the caller's own confirmed address.
Deleting the old assertion without stating the new one would have left the file quieter and no safer.

⚠️ **One correction to the finding's implied remedy.** "Assert the revoke in the newest migration"
is the wrong resolver for a *grant*: `business_team` is **defined** by `20260814` and **revoked** by
`20260909`, which does not redefine it, so looking only where a function is defined finds no revoke
and reports a hole that is not there. The assertion is therefore an **ordering** — the newest revoke
must not be older than the newest definition, because `create or replace` re-runs the default
privilege and hands `anon` EXECUTE straight back — plus, for a same-file pair, that the revoke
follows the create.

### 3 — **FIXED.** The reviewer was right that nothing said it was deferred

`supabase/staging/01-schema.sql` re-mirrored with both new function bodies and all three revokes. The
byte-identical test now compares each body against **whichever migration defines it last**, and
`my_pending_invites` was added to that list so a mirror missing it entirely cannot pass unnoticed.

### 4 — **FIXED.** `docs/MAINTENANCE.md`'s entry and backlog item 40 are struck

With the measurement, and with the note that production follows the deploy. The entry's *body* is
kept unstruck beneath the strike, because its reasoning — the mechanism, the six functions the
linter names, and the four that must never be swept up with these two — is what a future reader
needs. That is `CLAUDE.md`'s own "a done-mark is not a strike" rule applied in the direction the
reviewer names.

### 5 — **FIXED**, and it was worth more than "minor"

The probe and the pick were two statements under READ COMMITTED. They are now one
`select … limit 2 for update` loop, so **what is counted is what is locked**. The row is copied to a
separate variable inside the loop, because PL/pgSQL only guarantees a query-`FOR` variable's value
*inside* the loop — an extra line that removes a question rather than answering it.

**The SQL changed, so the staging rehearsal was re-run in full against the revised function**, not
patched up: a rehearsal of superseded SQL proves nothing. Identical results across all nine checks.

### 6 — **FIXED.** Every row locks now, behind an in-flight latch

Cheap, and the reviewer's own framing is why it was worth taking: nothing is corrupted either way,
but what was at stake is whether the loser of the race gets a sentence or a constraint name, on the
one screen whose entire job is to be legible.

## After the fixes

`npm test` **1988 pass / 0 fail** · `npm run smoke` green · `npm run mutate` **1218 mutants, 45
survivors all with written allowances** · `npx playwright test` **465 passed / 14 skipped**.

**Seven hand-run mutants against the SQL and the mirror, seven kills** — including one that came back
as a NO-OP first (the pattern missed a comment inside the block) and was redone, because a mutation
that changes nothing reads as a survivor and is not a result.

Staging was restored to its documented baseline after the second rehearsal: 4 accounts, 2 businesses,
3 memberships, 0 invites, `c@example.com` a member of nothing.
