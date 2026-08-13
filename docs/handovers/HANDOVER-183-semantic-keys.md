# HANDOVER - 183 (semantic keys)

**Branch:** `183-semantic-keys` · **Scope:** queue item "Unique ID generation - the SEMANTIC KEYS half", **split**: three of its four keys shipped, `MENU_ORIGINAL` did not.
**Deploy version shipped: `ezplate-v159`.**

## What changed

A second cafe can save a setting.
`app_settings` moved from `primary key (key)` to `(business_id, key)` and `supplier_phrases` from `(id)` to `(business_id, id)`, in `supabase/migrations/20260813_semantic_keys.sql`, applied to staging and then production.
Before it, a second cafe's first attempt to save a food cost target, a GST default or its kitchen ingredients was refused 42501, permanently.

`restore_backup` moved to v4 in the same migration and in the same transaction.
Its `app_settings` upsert said `on conflict (key)`, which names an arbiter that stops existing the moment the key is composite.
That is 42P10 raised at RUNTIME, so the migration would have applied green and the first restore after it would have failed.

`nextKid()`'s `K0001` ids are fixed by this without being touched, because they live inside the `kitchen_ingredients` `app_settings` blob and inherit that row's tenant.

No client behaviour changed.
PostgREST derives an upsert's `ON CONFLICT` target from the table's primary key, measured as a second tenant over PostgREST rather than assumed, so `dbSetSetting` kept working untouched.
Both upsert call sites gained a comment saying that the ABSENCE of an `onConflict` is load-bearing, because adding one would silently re-globalise the key.

`supabase/staging/01-schema.sql` gained section 4b so a rebuilt staging carries the same keys, and `tests/semantic-keys.test.js` (11 tests) pins the migration's statement order, the mirror parity and the client's silence.

## Into CLAUDE.md

Made, under the standing authority; reported rather than parked.

- **New Tier 1 trap: "A PRIMARY KEY's column list is a contract with every `ON CONFLICT` that names it - and with the client that names none."** Covers the 42P10-at-runtime half, the PostgREST-derives-it-from-the-PK half, and the general law that a key's width is depended on in three places that never mention each other.
- **The could-not-fail roster went 14 to 16**, with 183(a) and 183(b) written in.
  183(a) is the one worth reading: `pg_get_functiondef` returns the body's COMMENTS, so an assertion greping a function body can pass on its own prose. Generalised at the site.

## New docs/QUEUE.md items

- **Item 1 rewritten to `MENU_ORIGINAL` - the LAST semantic key** [A].
  Carries why the composite-key trick does not transfer (`menus.id` is referenced by two foreign keys, so scoping it means composite FKs or dropping one), the 27 client literal sites, and the second defect below.
- **A brand-new cafe cannot save its first dish**, measured 13 Aug 2026.
  `ensureDefaultMenu` seeds "Original menu" into `menusList` in memory and nothing ever writes that row to `menus`; production only has one because it predates the code.
  So the first dish save writes `menu_id='MENU_ORIGINAL'` against `menu_items_menu_id_fkey` and raises 23503.
  Stated in full in BOTH item 1 and the onboarding item, because it is a fact rather than a pointer, and whichever runs first fixes it.
- **Item 8a gained one line:** its new `restore_backup` migration must start from v4, not from `20260806_restore_backup_v3.sql`.

Into `docs/MAINTENANCE.md` (C): the staging seeds' self-assertions use `select ... into` on `app_settings` and so assume exactly one tenant.
It cannot bite today only because each seed wipes across all tenants first, which is an unwritten load-bearing assumption.

## New docs/PHONE.md items

None.
The only client change is comments, and the write path was driven in a real browser against staging.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Two things.
First, the item said to fix `supplier_phrases` by **prefixing the tenant onto the id**; I widened the primary key instead.
Prefixing would have required the client to know which tenant it is, putting the tenant decision in two places - the client's string and the server's trigger - which is exactly the defect batch 182's section 3 was written about.
A composite key keeps the content-addressing within a cafe, which is the property that makes re-teaching a pack update one row, and the client still never learns its tenant.
Second, the item asked for all four keys in one go and I **split it**, taking three and leaving `MENU_ORIGINAL`.
Two composite-key swaps plus a `restore_backup` rewrite plus a two-tenant rehearsal is one reviewable PR; 27 client sites across the Dashboard scope maths, the change log and `publishPlan` is a different diff with a different risk, and preparing it turned up a second, unrelated defect under the same literal.

**What did you not propose because it was out of scope?**
The seed self-assertion fragility went to maintenance rather than being fixed here.
I also did not touch `ingredients.id`, `plates.id`, `menus.id` or `menu_items.id`, which are all still GLOBAL primary keys whose non-collision rests entirely on `uid()`'s entropy from batch 173 rather than on the schema.
That is a deliberate, documented design and not a defect, but it is worth knowing that the schema does not enforce it.

## Surprises

**The migration's own assertion caught this file, on the first staging run, for the right reason and the wrong target.**
It refused to apply because it found `on conflict (key)` in the deployed function - inside the COMMENT explaining why that spelling was being removed.
The valuable half is the inverse: without stripping comments, the POSITIVE assertion would have passed on the prose alone, green whatever the statement said.

**A test survived its own mutation.**
The `memKey` assertion matched a substring, so gluing a tenant onto either end left it green - the exact change it existed to forbid.
Fifteen mutations were run by hand against the migration, the mirror and `js/app.js`; fourteen were killed first time and that one was not.
Files were backed up by `cp`, never `git checkout --`.

**One 23505 that was not a defect, recorded so nobody chases it.**
An anon restore on staging raised `duplicate key value violates unique constraint "ingredients_pkey"` because my own test payload reused an id the second tenant already owned.
What it actually demonstrates is the good half: a cross-tenant id collision on restore fails loudly and rolls the whole transaction back rather than corrupting anything.

**GitHub Actions is blocked at the ACCOUNT level, and all four checks went red without running.**
"The job was not started because recent account payments have failed or your spending limit needs to be increased."
Batch 182 ran clean at 00:10Z the same day; this push at 09:45Z is the first blocked one, so it is nothing to do with the change.
It matters more than one red PR: `CLAUDE.md` designates the CI `unit` job as the copy of the mutation gate that actually HOLDS, because the pre-push hook needs `git config core.hooksPath .githooks` per clone and a fresh clone runs no gate at all while looking identical to one that passed.
With Actions blocked, the only mechanical gate this repo has is whatever runs on the machine doing the work.
All four jobs were reproduced locally instead: unit 1094, the full unconditional `npm run mutate`, smoke, and Playwright 301.
Merged on that basis. **Max needs to clear the billing block before the next batch**, and this is flagged to him rather than only recorded here.

**The rollback refused, correctly.**
Rehearsed both ways on staging: with the second cafe holding rows it raised 23505, which is a narrowing key declining to throw a row away; with those rows cleared it restored both primary keys and the v3 function body in one statement.
`docs/STAGING.md` says to rehearse the rollback because batch 181 found its own was broken. Taking that advice is what produced both results.
