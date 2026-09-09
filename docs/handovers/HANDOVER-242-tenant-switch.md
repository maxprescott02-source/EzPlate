# HANDOVER - 242 (tenant switch)

**Branch:** `batch-242-tenant-switch` · **Scope:** `docs/QUEUE.md` item 13, the 5 Sep blind audit's cross-tenant finding.
**Deploy version: `ezplate-v199`.**

## What changed

A same-session move from café A to café B no longer leaves any of A behind.
`applyTenantBoundary` resolves the tenant uuid, clears tenant-scoped state on a definite move to a different café, and remembers which café is in memory.
Before this the uuid was read only to answer "is there one" and then discarded, so nothing could tell a re-sync of the same café from a move to another one.
Café A's supplier phrases are no longer pushed into café B's database, which was the half that wrote.

## Review

The `code-review` agent, on Sonnet, without the queue item.
Report and disposition in `docs/reviews/REVIEW-242-tenant-switch.md`.
Two findings, both fixed.

**Finding 1, `businessRole` is a twelfth conditionally-applied store and was not cleared.**
Real, and my header claimed to cover every one of them.
Fixed, and the enumeration in that header now says twelve and says how the twelfth was missed.

**Its stated consequence was wrong, and the first test I wrote from the finding's own words could not fail.**
The finding's case is owner in A and staff in B with B's role lookup failing, which comes out `owner` with the fix and `owner` without it, because `unknown` reads as owner by design.
So the assertion had both sides already `owner`, which is roster entry 184(b), and it survived the hand-mutation.
The direction that actually moves is the opposite one: a staff member in A who owns B is shown a staff screen in their own café until they reload.
That is what the test asserts now, and removing the fix reddens it.

**Finding 2, `resetTenantState` was not itself a gate target.**
Fixed. Its mutants are all call deletions, and dropping `rebuild()` would leave `PRODUCTS` holding the previous café.

The reviewer also checked the `COGS_PCT_DEFAULT` / `GST_DEFAULT_MODE` declaration order, which I had flagged to myself as a worry, and reached the same verdict I did on re-reading: there is no hazard, so no change was made.

## Into CLAUDE.md

Added the 242 instance to **"A comment can record the defect CORRECTLY and file it under the wrong consequence"**, taken under standing authority.
The other three instances are an author disposing of their own observation.
This one is an author inheriting a review's disposal, which is harder to catch because it arrives with a second reader's authority.
The line it adds: a finding's stated consequence is a fourth separable claim after the defect, the mechanism and the remedy, and it is the one that ends up in the comment and in the test's fixture.
Run the finding's repro in both directions, and if the fix changes nothing in the direction the finding named, you have not found its bug yet.

No other rule was added.
The eleven-versus-twelve miscount is already covered by `docs/QUEUE.md`'s own header rule about unmeasured enumerations, and by the roster.
Writing it twice would be the thing that took the roster from four entries to twenty.

## New docs/QUEUE.md items

None.
Item 13 is deleted from `docs/QUEUE.md` and needs no strike in `docs/QUEUE-2026-09-08-CONSOLIDATED.md`, because items 12 to 15 came from the 5 Sep blind audit and were only ever stated in `docs/QUEUE.md`.
Two existing items gained a note rather than a new item being raised:

- **item 20** now records that this batch gives its defect a second door: clearing `menusList` means a failed `menus` read on the boot after a move mints a fictional menu instead of showing café A's.
  Both are wrong and this one is less wrong, and item 20 is the fix, at the read rather than at the reset.
- **item 39** now records the in-memory sibling of the draft it already covers: the builder's `plate[]` is not cleared on a move, so an in-progress plate survives into a café where its `kid` lines resolve to nothing and it costs zero.
  No café A data is written by that path, which is why it is a note on 39 rather than an item of its own.

`Do after: 13, 14, 27` on item 29 loses the `13`.

## New docs/PHONE.md items

None.
Nothing here is judgeable on a device that is not already better judged by item 29's persona harness.

## Probe

**What did the item tell you to do that you would have done differently?**
Nothing about the approach, and the item's own diagnosis was right: it said the fix belongs at the boundary rather than per variable, and that is exactly what was built.
What was wrong was its enumeration.
It named two stores as "two findings, merged because they are one mechanism at one site" and there are twelve, across three different application patterns and about six hundred lines.
Its claimed line numbers were stale, as the section warned they would be.
The item is also the third of these blind-audit items to be materially incomplete at execution time while being correct in substance, which is `docs/QUEUE.md`'s header rule holding up.

**What did you not propose because it was out of scope?**
Clearing the builder's in-progress plate on a move, which is the one remaining thing a tenant switch leaves inconsistent.
It is genuinely item 39's territory and it needs a decision about discarding somebody's unsaved work, so it went there as a note rather than being built here.
I also did not touch `docs/MAINTENANCE.md` item 25, the food-cost-target integer-versus-decimal split, even though this batch opened the `cogsPct` declaration.
That entry is explicitly assigned to ride item 15, which opens `setCogs` itself and has to decide which of the three readings is right, and taking it here would have been the smaller frame.

## Surprises

**There is no `businessId` anywhere in the app.**
Two comments say "rather than patching `businessId` in place", which reads as though such a variable exists.
They are describing why a re-sync is preferable to a patch, and both are correct, but the effect is that the fix had to begin by inventing the thing the codebase sounded like it already had.

**The pre-existing v107 supplier-memory guard is the mechanism that made the disclosure possible, and it is correct.**
It keeps local phrases over an empty read because a successful-but-empty read and an RLS-blocked read are indistinguishable over PostgREST, which is right.
It simply cannot tell that the memory it is protecting belongs to a different café.
That is why the fix is at the boundary and the guard is untouched, and why `supplierMemApply` now says so at its own site.

**A test comment containing backticks silently breaks a `new Function` sandbox.**
Twice, in two different files, because the sandbox body is a template literal and the failure surfaces as `SyntaxError: missing ) after argument list` pointing at an unrelated interpolation line.
Both are now noted in the files themselves.

**An untracked `docs/reviews/REVIEW-000-uncommitted-probe.md` was sitting in the working tree**, carrying `Reviewed-commit: ffffffff...`, and `git add -A` swept it into the first commit.
Removed before the PR.
The gate rejected it correctly, so nothing was bypassed, and the general limit it points at is already written down in `docs/reviews/README.md`: the artifact gate can tell whether a file says a review happened, never whether one did.
