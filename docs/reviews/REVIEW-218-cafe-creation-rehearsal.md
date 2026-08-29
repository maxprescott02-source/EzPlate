# REVIEW - 218 (café creation: the rehearsal and the grant)

Reviewed-commit: faa8151ec5727b6694a1c27c040e2a897f118932

**Agent:** `code-review`, on **Sonnet**, against a batch running on **Opus 5**.
**Target:** `git diff origin/main...HEAD` on `feature/cafe-creation` - seven commits, ~1770 insertions.
**The item was NOT shown to it**, per `CLAUDE.md`: it judges whether the code is correct, not whether it matches what was asked.

⚠️ **This is the SECOND artifact on this branch and it exists because the first does not cover the branch.**
`REVIEW-209-cafe-creation.md` names `ff379e1`, which predates the migration's grant change entirely.
`tests/review/check.js` was satisfied by that older artifact, because it accepts any ancestor - so the gate would have let a security-relevant SQL statement through with no adversarial pass of its own.
The reviewer raised exactly this as its second finding, independently, and this file is the answer to it.

---

## The report, verbatim

> ## Review of `feature/cafe-creation` vs `origin/main`
>
> I read the full diff (7 commits, ~1770 insertions across the migration, its staging mirror, `js/app.js`, `index.html`, `css/style.css`, and the test suite), cross-checked it against the unchanged code it calls into, ran the full unit suite (1720/1720 green), and independently verified the migration's live state against **production** via the Supabase MCP (function ACL, `prosecdef`/`search_path`, `relforcerowsecurity` on `businesses`/`business_members`, the `set_member_role` trigger, the `business_members_one_business_per_user` constraint, and `get_advisors('security')`) rather than trusting the header's claims about what was measured.
>
> ### What's actually wrong
>
> **1. Minor — client/server name-length boundary disagrees for astral-plane characters (unverified against a live café, but reproducible).**
>
> `cafeNameClean`/`cafeNameProblem` (`js/app.js`, the `CAFE_NAME_MAX=60` block) and the HTML `maxlength="60"` on `#bgCafeName` (`index.html`) both count JS/UTF-16 code units. The server's guard, `length(nm) > 60` in `create_business`, counts Postgres characters (codepoints). For any character outside the BMP (emoji, some historic/rare scripts — each 2 UTF-16 units but 1 codepoint), the two disagree: a name of 31–60 such characters is 62–120 JS units, so the client (and the `maxlength` attribute, which physically stops further typing) refuses it as "too long," while the server's `length()` would have accepted it (≤60 codepoints).
>
> Verified the JS half directly: `'😀'.repeat(31).length === 62` (>60, refused client-side) while Postgres `length()` on the same string is 31. `tests/cafe-create.test.js`'s boundary test only exercises ASCII `'x'.repeat(N)`, so it can't see this — it isn't a claim that the test is broken, just that the covered cases are all BMP. Narrow real-world impact (café names rarely lean on emoji), but it's exactly the "the shorter one wins silently, and it is the only one the user can feel" class this project's own tests explicitly guard against for the `maxlength` vs. server-length pair — this is a second, uncovered instance of the same family (codepoints vs. UTF-16 units, not markup vs. SQL).
>
> **2. Minor/process — the batch-218 commit (`ca15f1e`) makes a real, security-relevant SQL change with no review artifact of its own.**
>
> `docs/reviews/REVIEW-209-cafe-creation.md` covers commit `ff379e1`. The later commit `ca15f1e` ("item 1: rehearse the café-creation migration, and the grant it never actually had") adds a genuinely new SQL statement — `revoke execute on function public.create_business(text) from anon;` — to both `supabase/migrations/20260827_cafe_creation.sql` and `supabase/staging/01-schema.sql`, plus new test assertions in `tests/cafe-create.test.js`. This is precisely the class of change CLAUDE.md calls mandatory-review territory ("a check that finds nothing has only proved something about what it looked for" — which is literally the bug this commit fixes, found only by hand-rehearsing on staging, not by review). No `docs/reviews/REVIEW-218-*.md` exists; the pre-push gate (`tests/review/check.js`) is satisfied only because it accepts *any* ancestor commit's review artifact on the branch, and `Reviewed-commit:` in the existing file names an earlier commit that predates this SQL change entirely. I independently verified the resulting grant against production and it is correct (`create_business` is absent from lint `0028` anon-executable, present only under `0029` authenticated), so nothing is wrong in outcome — but the process gap (a security-relevant statement shipped without its own adversarial pass) is real, not hypothetical, and it's the exact failure mode the review-artifact mechanism was built to catch.
>
> ### What I checked and found correct (worth stating plainly, since the priority list asks for wrong conditions and silent failure first)
>
> - The one genuine bug on this branch — `bootGate`'s `nomember` transition guard reading `cf.hidden` *after* `hideForms()` had already set it, so every re-sync wiped a standing error and stole focus — was caught by the pre-push review, is fixed correctly (`cfWasUp` is now read at the top of `bootGate`, before any branch can call `hideForms`), and is now pinned by tests that actually exercise the regression (`tests/boot-gate.test.js`'s two new cases assert `.focuses` counts and `#bgErr` persistence, not just `.value`, which is exactly what the original vacuous Playwright assertion missed). I reinstated the historical bug mentally against the current test and confirmed the assertions would go red.
> - The migration: `security definer`/`search_path=''`, the advisory lock precedes the membership read, the existing-membership early return sits above both inserts, the owner assertion uses `is distinct from` (not `<>`), and all NOT-NULL columns on `businesses`/`business_members` are covered by defaults or explicit values — confirmed against the live production schema via MCP, not just read.
> - `create_business`'s ACL on production has `anon` genuinely absent (confirmed via `pg_proc.proacl` and the security advisor), matching the header's rehearsal claims.
> - The function body in the migration and in `supabase/staging/01-schema.sql` is byte-identical (I diffed the `$fn$…$fn$` block directly), and the grant/revoke ordering is identical in both files.
> - The six cache-version spots (`sw.js` `CACHE`, both `ASSETS` entries, `index.html`'s two `?v=` links, `js/app.js`'s `APP_VERSION`) all agree at v178.
> - No duplicate top-level declarations were introduced (checked programmatically, not just by running the suite).
> - Sequencing (migration before client merge, review-before-push per the existing artifact) is stated and followed; `invite_pending` is correctly left deployed-but-uncalled per the 186 ordering law rather than dropped alongside its caller.
> - The rewritten tests in `tests/auth.test.js`, `tests/tenant-gate.test.js`, `tests/visual/v161-nonmember.spec.js`, and `tests/visual/v165-invite.spec.js` are genuinely behavioral changes reflecting the reversed decision, not loosened assertions papering over the copy change.
>
> ### Confidence
>
> High on both findings above — the unicode mismatch is reproduced directly; the missing review artifact is a straightforward read of `tests/review/check.js`'s matching logic against the commit graph. Everything else in "what I checked and found correct" was verified against the live production database via MCP, not inferred from comments.
>
> **Files relevant to this review:** `supabase/migrations/20260827_cafe_creation.sql`, `supabase/staging/01-schema.sql`, `js/app.js` (`bootGate`, `wireGateCreateCafe`, `cafeNameClean`, `cafeNameProblem`, `createBusinessState`, `authCreateBusiness`), `index.html` (`#bgCafeForm`/`#bgCafeName`), `tests/cafe-create.test.js`, `tests/boot-gate.test.js`, `tests/visual/209-cafe.spec.js`, `docs/reviews/REVIEW-209-cafe-creation.md`, `docs/MAINTENANCE.md`, `docs/STAGING.md`.

---

## What was done about each

### Finding 1 - the unit mismatch. ACCEPTED, reproduced, NOT fixed, and pinned instead.

Reproduced on both sides before deciding anything, rather than taken on the report's word:

```
node   '😀'.repeat(31).length          -> 62      (UTF-16 code units)
psql   length(repeat('😀', 31))        -> 31      (codepoints)
```

So the finding is exact, and it is a genuine deepening of the one this batch raised itself: the equality test added an hour earlier asserts that three numbers are all 60, and **two of them are not counting the same thing.**

**It is filed rather than fixed, and the deciding factor is the DIRECTION rather than the size.**
The client is the stricter of the two, so the only outcome it can produce is a **false refusal** - never a name that passes the client and is rejected after a round trip, and never a stored name the server's guard was meant to stop.

**And the obvious fix moves the mismatch instead of closing it.** Counting codepoints in `cafeNameProblem` aligns it with the server and leaves `maxlength` as the sole binding constraint, still in UTF-16 units, still stricter, still silent - because HTML `maxlength` has no codepoint-counting form. Closing it properly means dropping `maxlength` and giving up a native affordance, for a case a café name will not meet. That is a real trade and it belongs to whoever next has reason to open this form.

**What shipped instead is the assertion that was missing.** `tests/cafe-create.test.js` now pins the property that actually matters and that the equality test cannot see: *the client may refuse more than the server, and must never accept more*, over a spread of astral-plane lengths. The tempting direction - loosening the client to remove the false refusal - goes red by name. Confirmed red by widening the client's bound.
The equality test keeps asserting the three numbers match and now says at its own site that **equal numbers in different units are not agreement**.
Filed with the full reasoning in `docs/MAINTENANCE.md`.

### Finding 2 - no artifact covering the SQL commit. ACCEPTED and discharged by this file.

Correct, and correct about the mechanism: `tests/review/check.js` accepts any ancestor commit, so `REVIEW-209`'s `Reviewed-commit: ff379e1` satisfied the gate for a branch that had since grown a new `revoke` statement. The gate is a guard against forgetting and says so in its own header; it cannot tell that the artifact predates the change.

**This artifact is the answer**, and `Reviewed-commit:` names `faa8151` - the tip the reviewer actually read, which includes both the SQL change and the test that came with it. The reviewer's own verification of the resulting production ACL is in its report above and matches this batch's independent measurement.

⚠️ **The transferable half is about the GATE, not this branch, and it is left here rather than turned into a rule.** A long-lived branch that is reviewed, then parked, then resumed weeks later by a different batch will always satisfy the artifact gate with its first review while accumulating unreviewed commits. That is inherent to "names an ANCESTOR", which is itself a deliberate choice - requiring the exact tip is unsatisfiable, because a review's own findings get fixed and each fix is a commit. **The batch that resumes a parked branch owes the branch a second artifact**, and the gate cannot ask for one.

### Everything in "checked and found correct"

Read and not contested. Two points are worth recording because they were verified independently by both the reviewer and this batch, from different directions: the production ACL genuinely excludes `anon`, and the function body is byte-identical between the migration and the staging mirror. The reviewer reached both through the MCP and `pg_proc`; this batch reached them through a PostgREST probe as the anon client and a `difflib` comparison of the two `$fn$` blocks.
