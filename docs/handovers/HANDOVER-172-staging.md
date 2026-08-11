# HANDOVER - 172 (staging Supabase)

**Branch:** `staging-mirror-172` · **Scope:** `docs/QUEUE.md` item *Staging Supabase - mirror the schema and seed it*. Ships `ezplate-v152`.

## What changed

Staging has a schema. All seven catalogue fingerprints match production exactly, including the `restore_backup` body md5, so a migration can now be rehearsed against the shape it will actually meet.
Three seeds: empty, realistic (50 products, 2 menus, 14 plates), scale (520 products, 12 menus, 180 plates, 429 dishes, 168 plates published to more than one menu).
`?env=staging` points the app at the other project. Production is the default and an unrecognised value falls back to it.
A red `STAGING` badge and a `[staging]` tab title, never created on production.
`envFence` purges every `cafeDB_`/`cafeCost_` key when the project changes, so a plate draft cannot cross. First run purges nothing, so the deploy did not wipe Max's settings.

Rehearsed on staging for the first time, as the anon client over PostgREST rather than through the MCP: `restore_backup` end to end with every dish linked and zero null plate links, both refusal paths by name, and **a restore into a genuinely empty database**.
That last one is step 3 of the v110 destructive plan, which had never been run anywhere. It does not discharge the queue item, which is about production and still needs Max's go, but the step is no longer being attempted for the first time on real data.

## Into CLAUDE.md

**Proposed, not yet applied - needs Max's yes.** Two of its statements are now false and I have deliberately left them alone rather than edit silently:

1. The Migrations section says staging *"is EMPTY, so there is still nothing to rehearse against"* and that the safeguard *"becomes real when the queue's staging item RUNS"*. That item has now run. The replacement should point at `docs/STAGING.md` for the procedure and keep the part that is still true: **a rehearsal changes the risk, not the ownership, and anything that deletes or rewrites production data is still Max's.**
2. It says local state is *"preferences and derived caches ONLY"* with the plate draft as the standing exception. Still true, but there is now a tenth key, `cafeCost_env`, which is a stamp rather than a preference. Worth one clause so the next audit does not rediscover it as a violation.

## New docs/QUEUE.md items

None. The staging item is deleted, having shipped.
`Do after: Staging Supabase` was **added** to *Unique ID generation*: its deliverable is explicitly a migration of the live cafe's existing rows, and running that unrehearsed was not something I was willing to start.

## New docs/PHONE.md items

None. Everything here was settled at 380 and 1360 in a real browser, in both themes, and nothing in it is phone-specific.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing in its requirements, but its framing of "verify" was too weak and I did more than it asked. It said migrations should be "verified there before production"; it did not say the verification has to be done as the anon client over PostgREST. Verifying through the MCP would have satisfied the item as written and proved almost nothing, because the MCP runs as `postgres` and bypasses RLS. The item should have said so and now `docs/STAGING.md` does.

I also went beyond it on one safety point. The item asked for seeds; it did not ask for guards. Three files that begin `delete from public.menu_items` are a loaded weapon sitting in a repo whose other Supabase files are meant to be run against production, so each one refuses unless a staging-only marker table exists. The sharper case was not obvious until I had written it: `01-schema.sql` **creates** that marker, so running it against production would have disarmed all three seeds and the next seed run would have wiped the cafe while looking entirely normal. It now refuses if the database already holds a catalogue.

**What did you not propose because it was out of scope?**
The `deleted_prod_ids` / `deleted_menu_ids` tombstone arrays are unbounded and live in `app_settings` as JSON. They only grow. Not a problem at Scoopy's size and not this item's business, but it is the kind of thing that is cheap now and awkward later. Not queued: it is a C by the tier test, and I have not measured it.

I also did not touch the fact that every RLS policy is `using (true)`. That is the multi-tenant item's job and doing it here would have converted a rehearsal surface into a policy change.

## Review findings, both fixed in this branch

The pre-push agent (different model, no brief) found two, and both were real.

**The fence could not beat the theme resolver, and the comment claimed it could.** The resolver reads `cafeCost_theme` in the document head, before `js/app.js` is fetched, so no ordering inside app.js reaches it: the first load after a switch painted in the other environment's theme.
The part worth keeping is not the bug, it is why nothing caught it. **The test written to pin exactly this class of ordering scans `js/app.js` only**, because `loadApp()` reads `js/app.js` only, so it could never have failed on this. A green test that cannot fail is the shape `CLAUDE.md` already records four incidents of, and I wrote another one. Two tests added over `index.html`, and the blind spot is now written into the original test rather than left implicit.

**`?env=constructor` resolved truthy through `Object.prototype`**, skipped the production fallback and left `SUPA_URL` undefined: a dead app with a badge reading "CONSTRUCTOR". Now `hasOwnProperty`. Its replacement test **executes** the real shipped resolver against a stubbed window; the assertion it replaced matched the source line as text, so a correct fix failed it and a broken rewrite would have passed it.

## Surprises

**The scale seed's first run produced a $961 salad and a Dashboard reading 1831% food cost.** `ea` products are priced per item in dollars and `g`/`ml` products in fractions of a cent, and I had given every line the same 20-200 quantity, so plates got 200 eggs. Every structural assertion in the file passed on that data: counts, line shapes, referential integrity, all green. Only opening the app showed it.
The lesson generalises past this batch and is why the seed now asserts a cost ceiling: **a fixture can be internally consistent and still be nonsense, and the checks that would catch it are the ones about magnitude, not about shape.** A seed whose arithmetic is absurd is worse than no seed, because everything downstream of it looks broken and nobody can tell the seed from the bug.

**Staging reproduces `safeupdate` and the role timeouts exactly.** I expected a free second project to differ. Both carry `session_preload_libraries=supautils, safeupdate` and the same `statement_timeout` (anon 3s, authenticated 8s), so the WHERE-less-DELETE behaviour that `CLAUDE.md` warns about does rehearse correctly. That was worth checking rather than assuming, because if it had differed the mirror would have been quietly useless for the one file it matters most for.

**Production has ten public tables, not eleven.** `docs/QUEUE.md`'s `business_id` item says eleven; `20260809_drop_kitchen_items.sql` made it ten. Corrected in the queue in this batch.

**`main` has been RED since 171, and nothing said so.** The v141 sync-corner spec fails on CI and has since that batch merged. It is not a device defect: the assertion has zero slack, because the banner overlays the mobile header and `.scr-head` begins where that header ends, so "the banner clears the screen header" is EQUAL by construction (measured locally: 61 against 61) and passes only by exact float equality. The Linux runner has no Geist installed, its text metrics differ by a fraction of a pixel, and the comparison flips.
Fixed here with one pixel of tolerance rather than queued, because it blocked this PR and a permanently red CI means the next batch cannot tell a new failure from an old one. That is the real cost, and it had already been paid once: **this batch spent time proving the failure was not its own.**
Worth noting for the rule it suggests: a merged PR whose checks are red looks identical to a merged PR whose checks are green, in the only place anyone looks, which is the branch.

**The Ingredients mobile header wraps at 380, not only at 360.** Found while measuring for the header item, which is a different queue item and is now blocked on Max. 380 is the width every mobile assertion in this repo uses, so this is a live defect at a supported width rather than a question about adopting a new one. It is invisible to the suite because the Playwright fixture leaves `#kingWizBtn` hidden and Max's unlinked catalogue never does. Recorded in that item with the measurements.
