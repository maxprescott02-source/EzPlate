# Staging

The second Supabase project, and the procedure that makes "rehearse before production" real.

Built in batch 172 (11 Aug 2026). Before it, `.mcp.json` had carried a staging project since v121 and the MCP server answered — but the schema was **empty**, so there was nothing to rehearse against and every migration since v89 reached production unrehearsed. `CLAUDE.md` said so out loud at *Migrations — Claude applies them*. That warning is now spent; this file replaces it.

| | |
|---|---|
| Production | `izrnptxhdylllodvglla` — Scoopy's real data. **The café.** |
| Staging | `pboidoxjghntalovzrke` — disposable, synthetic. |
| SQL | `supabase/staging/` — `01-schema.sql`, then one of `02`/`03`/`04` |

Both are in `.mcp.json` as `supabase` and `supabase-staging`.

---

## The one thing to understand first

**Everything in `supabase/staging/` is destructive by design.** The seeds delete every row before they insert. The only thing standing between them and the café is a table called `__ezplate_staging` that exists in staging and must never exist in production.

Each seed's first statement checks for it and raises if it is missing. Postgres aborts the rest of the batch on a raise, so nothing below the guard runs. **Both halves were demonstrated on 11 Aug 2026, not assumed:**

- the guard raised against production and passed against staging;
- a `DELETE` placed after a deliberately-failing guard **did not execute** — the row survived.

`01-schema.sql` carries a **different** guard, and it is the sharper one: it creates the marker, so running it against production would **disarm all three seeds**, and the next seed run would wipe the café while looking completely normal. It therefore refuses if the database already holds a product catalogue. That was demonstrated too — production raised; staging re-ran as a no-op.

`tests/staging-seeds.test.js` pins the ordering (no destructive statement above a guard) because that is the part a future edit can break silently. It cannot pin that the guards *fire* — that needs a database, and it is why the demonstrations above are recorded here.

---

## Pointing the app at staging

Add `?env=staging` to the URL:

```
http://localhost:5173/?env=staging
https://scoopyscosting.vercel.app/?env=staging
```

Production is the default and stays the default. A bare URL, an installed PWA and every link Max ever opens all resolve to production; an unrecognised `?env=` value falls back to production rather than erroring.

**You will know.** A red `STAGING DATA — NOT THE CAFÉ` pill sits at the top of the screen and the browser tab reads `[staging]`. Neither is ever created on production.

### Local state cannot cross — and here is how to see it

Both environments are served from the **same origin**, so localStorage is shared between them by default. Most keys are view preferences, but `cafeDB_plateDraft` is unsaved authored work whose `kid`/`pid` values name **different rows** in the other project — resuming a staging draft against production would cost a real plate against ids that mean something else.

`envFence` in `js/app.js` handles it: on any change of project it removes every `cafeDB_`/`cafeCost_` key. The rule is blanket on purpose — an exception list rots the moment someone adds a key without thinking about it, and the failure would be silent. **A first run purges nothing** (a missing stamp means "never seen", not "changed"), so the deploy that shipped this did not wipe Max's settings.

To see it rather than trust it, in one browser:

1. Open `/`, change the theme, start a plate in the builder, leave it dirty.
2. `localStorage` in devtools → note `cafeDB_plateDraft` and `cafeCost_env` (production's ref).
3. Open `/?env=staging`. The red pill appears.
4. `localStorage` now holds **only** `cafeCost_env`, stamped with staging's ref. The draft is gone.
5. Go back to `/`. Anything created against staging is gone in turn — the fence is symmetric.

`tests/env-fence.test.js` pins the decisions against the real extracted function, including the case where storage throws.

---

## Applying SQL

There is no `psql` and no Supabase CLI here, and `apply_migration` is blocked. Use **`execute_sql` on the `supabase-staging` MCP server**, or the staging SQL editor. Both run as `postgres`.

```
01-schema.sql   mirror production's schema. Idempotent — re-run it after any production migration.
02-seed-empty   every screen at zero. The state production has never shown.
03-seed-realistic  50 products, 2 menus, 14 plates. Use when judging whether something LOOKS right.
04-seed-scale   520 products, 12 menus, 180 plates, 429 dishes. Use for volume bugs.
```

Run `01` once, then whichever seed you need. Seeds are mutually exclusive — each wipes first.

**⚠️ `04` is not a performance benchmark.** Staging is a free-tier project on shared hardware. It exists to make volume *bugs* reproducible — pagination, truncation, a dropdown that assumes a short list — not to time anything.

---

## The migration procedure

Applies to every migration from now on. This is what `CLAUDE.md`'s *staging first, then production* actually means in this repo.

1. **Write the migration** in `supabase/migrations/`, with its one-statement rollback stated in the header.
2. **Re-mirror staging** — run `01-schema.sql`. It is idempotent, and it guarantees you are rehearsing against today's production schema rather than last month's.
   ⚠️ **If your migration replaces `restore_backup`, copy its WHOLE `create or replace` block into `01-schema.sql` section 6** — byte identical, not one hand-edited line. `functions_fp` hashes `pg_get_functiondef`, which includes the body's COMMENTS, so a mirror carrying the statements but not the comments makes this very step turn the drift detector red for a reason that is not drift. That was silently the case from 11 to 13 Aug 2026; `tests/semantic-keys.test.js` now pins the two blocks equal, because nothing else can notice.
3. **Load a seed** that contains the case the migration is about. Empty, realistic or scale.
4. **Apply the migration to staging.** Order the statements so the dangerous intermediate state cannot exist; keep the transaction as well.
5. **Verify AS THE CLIENT** — see below. Not through the MCP.
6. **Apply to production**, and record in the file's header that it was applied, when, by whom, and how it was verified. `list_migrations` is empty, so the file is the only place that can say so.
7. **Diff the two schemas** with the fingerprint query below. They must match again.

**Anything that DELETES or REWRITES production data is still Max's to authorise**, rehearsed or not. A rehearsal changes the risk, not the ownership.

### Verifying as the client

The MCP and the SQL editor run as `postgres` and **bypass RLS entirely**, so they cannot see a policy mistake. PostgREST runs as `authenticator`, which differs in ways that change whether SQL runs at all.

Both projects were confirmed on 11 Aug 2026 to carry identical role config — `session_preload_libraries=supautils, safeupdate`, `statement_timeout` 3s for `anon` and 8s for `authenticated`. So staging **does** reproduce the `safeupdate` behaviour that rejects a WHERE-less `DELETE`/`UPDATE` for the client but not for `postgres`. That is why the `where true` lines in `restore_backup` are load-bearing and are mirrored verbatim.

```bash
U=https://pboidoxjghntalovzrke.supabase.co
K=<staging publishable key — supabase-staging MCP, get_publishable_keys>

# a read
curl -s "$U/rest/v1/plates?select=id,name&limit=3" -H "apikey: $K" -H "Authorization: Bearer $K"

# a write — Prefer: return=representation is not optional
curl -s -X POST "$U/rest/v1/ingredients" \
  -H "apikey: $K" -H "Authorization: Bearer $K" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"id":"CXprobe1","description":"probe","base_unit":"g","cost_per_base_unit":0.01}'
```

**An empty array is the failure signal, not an error.** A blocked anon INSERT returns success; a blocked anon UPDATE or DELETE returns 204 with no error and touches nothing. If a row does not come back, the write did not happen.

### Diffing the two schemas

Run this identically on both MCP servers. All seven values must match — they did on 11 Aug 2026, including the `restore_backup` body md5.

```sql
select
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'COL '||table_name||'.'||column_name||' '||data_type||' null='||is_nullable||' def='||coalesce(column_default,'-')||' pos='||ordinal_position s from information_schema.columns where table_schema='public' and table_name not like '\_\_ezplate%') a) as columns_fp,
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'CON '||c.relname||' '||con.conname||' '||pg_get_constraintdef(con.oid) s from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname not like '\_\_ezplate%') a) as constraints_fp,
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'IDX '||indexdef s from pg_indexes where schemaname='public' and tablename not like '\_\_ezplate%') a) as indexes_fp,
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'POL '||tablename||' '||policyname||' '||cmd||' roles='||array_to_string(roles::text[],'+')||' q='||coalesce(qual,'-')||' w='||coalesce(with_check,'-') s from pg_policies where schemaname='public') a) as policies_fp,
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'RLS '||c.relname||'='||c.relrowsecurity::text s from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname not like '\_\_ezplate%') a) as rls_fp,
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'FN '||p.proname||' secdef='||p.prosecdef::text||' '||md5(pg_get_functiondef(p.oid)) s from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public') a) as functions_fp,
 (select count(*)||':'||md5(string_agg(s,chr(10) order by s)) from (select 'GRANT '||table_name||' '||grantee||' '||privilege_type s from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated','service_role') and table_name not like '\_\_ezplate%') a) as grants_fp;
```

The `__ezplate%` exclusions are what let the marker be the one deliberate difference. **Anything else that differs is drift, and the mirror is stale.**

### ⚠️ `columns_fp` includes `ordinal_position`, and DROPPING a column does not give its number back

Found in batch 181 by rehearsing a migration's rollback on staging, which is exactly what this file tells you to do.

`information_schema.columns.ordinal_position` is `pg_attribute.attnum`, and **Postgres never reuses the attnum of a dropped column** — a dropped column leaves a permanent tombstone in the catalogue. So `drop column` followed by `add column` puts the column back one position higher, forever.

The effect: after rolling a migration back on staging and re-applying it, **`columns_fp` differed from production while the other six fingerprints matched**, with the same column COUNT on both sides. Nothing was functionally wrong — `business_id` was still last on both, so `restore_backup`'s `select *` ordering was unaffected — but the mirror's only drift detector was permanently red, and a detector that is always red is one nobody reads.

**So:**

- **A `columns_fp` mismatch with a matching COUNT usually means positions, not columns.** Diff the column lists before concluding the mirror is missing something — the query at the top of this section with the `md5(s), s` per row shows which rows differ.
- **The fix is to recreate the affected tables, not to re-run `01-schema.sql`** — `create table if not exists` skips an existing table, so it cannot renumber anything. Batch 181 dropped the ten data tables with `cascade` and recreated them from sections 1–5, then re-added the tenant column and re-seeded; fresh tables reproduce production's positions exactly because section 1 lists the columns in production's final order.
- **Rehearsing a rollback is still right.** It is how 181 found that its own stated rollback was broken — the policy on `businesses` reads `business_members`, so the drop order in the header failed outright. Just rebuild the tables afterwards rather than leaving staging one position out.

---

## What staging does NOT rehearse

Written down because a rehearsal you over-trust is worse than none.

- **The data.** Staging holds invented products at invented prices. It cannot tell you whether a change gives the right answer for Scoopy's — only whether it runs, links and renders.
- **Scale of history.** The seeds generate tidy series. Production's history is lumpy and has gaps.
- ⚠️ **Anything auth — THIS BULLET WAS TRUE UNTIL 13 Aug 2026 AND IS NOW THE OPPOSITE.** It read: *"Neither project has users. `anon` is the only role either has ever been exercised as, and the RLS policies are all `using (true)`."* Batch 182 swapped the policies and, to rehearse them honestly, created **three real accounts and a second business in staging** — so this project now exercises `authenticated` as well as `anon`, and a second tenant's exclusion has been demonstrated rather than assumed. See the 182 record below for what that proved.
  **What is still NOT rehearsable here — REWRITTEN 14 Aug 2026 (186), because most of what this said had been overtaken.** It read: *"production still has zero users, so nothing about a real sign-in on Max's own data has been exercised anywhere… the client has never been driven while signed in… a signed-in account with no `business_members` row sees an empty app with no error, and the client has no way to say so yet."* All three have since happened: Max created his account and membership on production and signed in there (queue item 1 step 1, 14 Aug), batch 185 shipped the screen that tells a non-member instead of showing them nothing, and 186 made sign-in mandatory.
  **What remains true is narrower and worth keeping:** staging's accounts are hand-made rows rather than people, so what it can prove is that a policy lets the right rows through and keeps the wrong ones out — never that Max's own café answers correctly, because staging does not hold Scoopy's data. **Production still has exactly one account**, so nothing about two real users of the same café — the roles item — has been exercised anywhere but here.
- **The invoice AI path.** `api/parse-invoice` and `api/insight` are Vercel functions with one `GEMINI_API_KEY`. They do not know which Supabase project the page is talking to, and pointing the client at staging does not point them anywhere new.
- **Timing.** Free tier, shared hardware. See the note on `04`.

---

## Current state

Left on the **scale seed** (520 products, 12 menus, 180 plates, 429 dishes) — plus, since batch 182, **a second tenant and three accounts, which are worth keeping and are the reason this section is no longer just "which seed"**.

| | |
|---|---|
| `businesses` | the seeded Scoopy's `…0001`, and `…00b2` "Second Cafe (staging)" — **which holds NO data rows as of 13 Aug 2026 (183)**, because that batch re-ran the scale seed at the end and a seed wipes every tenant's rows |
| accounts | `a@example.com` → **owner** of `…0001` · `b@example.com` → **owner** of `…00b2` · `c@example.com` → **member of nothing**, the empty-app case · `d@example.com` → **staff** of `…0001` (added by 187, and the only account that can exercise a restriction) |

⚠️ **`c@example.com` is the one account a rehearsal is tempted to CONSUME, and it must be put back.** Batch 191 used it to claim an invitation, which by design makes it a member — and "a member of nothing" is the only way this project can reproduce 185's silent-empty-app case, which is the worst defect this repo has had. 191 deleted the membership again at the end. **If you join it to a café, delete the `business_members` row before you finish**, and say in the handover that you did.

⚠️ **The passwords were reset in 183 and are still not written down** — use the `crypt` recipe below, which is the whole point of not recording them.

The three are hand-made rows in `auth.users` + `auth.identities`, not sign-ups: Supabase rejects `.test` addresses and rate-limits confirmation emails, so the API route ran out almost immediately. **Two things are needed or GoTrue answers `Database error querying schema` on sign-in, which reads like a server fault and is not:** `email_confirmed_at` must be set, and the token columns (`confirmation_token`, `recovery_token`, `email_change*`, `phone_change*`, `reauthentication_token`) must be `''` and never NULL — the Go scanner cannot read a NULL into them.

**Passwords are not written down here on purpose.** Reset one instead — this is the whole recipe:

```sql
update auth.users set encrypted_password = extensions.crypt('<new password>', extensions.gen_salt('bf'))
 where email = 'a@example.com';
```

A seed re-run (`02`/`03`/`04`) wipes the DATA but not `auth.users`, `businesses` or `business_members` — none of those are in a seed — so the accounts survive it and the second café's memberships do too. Its one product and one menu do not.

⚠️ **THEIR PASSWORDS ARE NOT WRITTEN DOWN ANYWHERE, AND MUST NOT BE — this repo is public.** Batch 186 needed to sign all three in and had no way to; **set your own for the rehearsal instead of hunting for the old one**, which takes one statement through the MCP and is why nothing is lost by not recording it:

```sql
update auth.users
set encrypted_password = extensions.crypt('<a throwaway you generate now>', extensions.gen_salt('bf'))
where email in ('a@example.com','b@example.com','c@example.com');
```

Then `POST /auth/v1/token?grant_type=password` for a real JWT, and use it as the `Authorization: Bearer` in the client verification below.

⚠️ **MAKING A NEW ACCOUNT BY HAND TAKES THREE THINGS, AND MISSING EITHER OF THE LAST TWO FAILS AS `500 Database error querying schema`** — a message that says nothing about what is wrong, and which cost batch 187 three attempts. The signup API is not an option: it rejects `@example.com` outright (`email_address_invalid`), which is why every account here is hand-made.

1. the `auth.users` row (copy an existing one's `instance_id`/`aud`/`role` rather than guessing);
2. **an `auth.identities` row with `provider = 'email'`** — GoTrue looks the password up through it, and a user without one simply cannot sign in;
3. **`''` rather than NULL in `confirmation_token`, `recovery_token`, `email_change`, `email_change_token_new`, `email_change_token_current`, `phone_change`, `phone_change_token` and `reauthentication_token`.** GoTrue scans them into non-nullable strings, so one NULL anywhere in the row breaks sign-in for that user with the schema error above.

Set `email_confirmed_at` too, or the first sign-in fails with "Email not confirmed", which reads exactly like a wrong password. **The method is the durable thing; the password is deliberately not.** `pgcrypto` is already installed, and `extensions.` is required because Supabase installs it there rather than in `public`.

⚠️ **A seed re-run restores the exact counts, because it deletes as `postgres` and therefore across every tenant.** Left after 183: 520 products, 240 kitchen ingredients, 12 menus, 180 plates, 429 dishes, 60 taught packs, 10 settings — the scale seed's own numbers, with café two holding nothing.
*(This line read "staging's café 1 no longer has the seed's exact counts — 521 products exist, 520 of them Scoopy's" until 13 Aug 2026. That was true while café two held a product; it stopped being true the moment a seed ran, and a warning that has silently expired is worse than none. **The durable form of it: a raw `count(*)` here is only equal to the seed's number while no OTHER tenant holds rows, and nothing enforces that — so filter on `business_id` whenever the answer matters.**)*

⚠️ **Batch 181 restored Max's REAL 412-product export into staging as part of rehearsing `business_id`, and then reloaded the scale seed to get rid of it.** Do the same if you ever need the real file here: staging's anon key is public in `index.html` and its policies are all `using (true)`, so anything left in it is readable by anyone who reads the page. **Staging is synthetic by contract, and a rehearsal that needs real data ends by wiping it.**

### Already rehearsed here, on 11 Aug 2026

Recorded because these are the first things staging has ever been used for, and two of them de-risk queued work:

- **`restore_backup` end to end as the anon client** — correct counts returned; every dish came back linked to its plate; plates inserted with `menu_id` null; one plate correctly on two menus. **Zero dishes with a null plate link** — the signature of the failure that once cost 76 of 77 dishes.
- **Both refusal paths, by name** — format `1` refused, and a missing group named as `ing_price_history`.
- **A restore into a genuinely EMPTY database.** This is *step 3 of the v110 destructive plan*, which the queue records as never having been run. It now has been — against staging, at zero risk, with identical counts and links to the populated case. That does not discharge the queue item, which is about production and still needs Max's go on the day, but it means the step is no longer being attempted for the first time on real data.

### And on 13 Aug 2026 (batch 181), the `business_id` additive migration

- **The real file, end to end, as the anon client.** Max's 412-product format-3 export was translated through the app's own `backupToPayload` and POSTed to `restore_backup` over PostgREST: 412 products, 79 plates, 76 dishes, 2 menus, 7 taught packs, in **1.6s** against the RPC's 30s `statement_timeout`. That is the first time the real file has gone through the RPC anywhere, and it de-risks the queue's *restore full-wipe step* further — though it still does not discharge it, because staging is not production and the boot gate was not exercised mid-restore.
- **A NEGATIVE result worth more than the positive one.** With the new `set_business_id` trigger dropped from `ingredients` only, the same restore left **all 412 products with a null `business_id`** while `plates` (trigger intact) had none. That is the measurement behind the migration's design: `restore_backup`'s `select *` inserts turn an absent JSON key into an EXPLICIT NULL, which overrides a column DEFAULT. **A column added to any of those five tables with a DEFAULT and no trigger is silently wrong on the next restore.**

### And on 13 Aug 2026 (batch 182), the policy swap — the first REAL multi-tenant test

This is the one this file said could not be done. It was worth the hour: **the rehearsal found a defect that every SQL-side assertion passed straight over.**

- **The defect, and it only showed as a second tenant.** With the scoped policies live and Part 1's literal column DEFAULT still in place, café two could READ its rows and could not WRITE any — `42501, new row violates row-level security policy`. A DEFAULT is applied when the column is ABSENT from the INSERT, which is every write the client makes, so the tenant column arrived already holding the LEGACY café's id; the trigger fills only nulls and correctly left it; `with check` then refused the row. **Reads looked perfect throughout.** The fix is in the migration: the DEFAULT, the trigger and the policy all read `current_business_id()`.
- **Exclusion, demonstrated on all ten tables.** Café one's member saw 520/180/429/12/…; café two saw 0 of each and only its own inserts; anon saw café one. Café two's UPDATE and DELETE against café one's `P0001` both returned an empty array and changed nothing — the silent no-op that `Prefer: return=representation` exists to expose.
- **The member of nothing.** Zero rows on every table, refused on write. That is `current_business_id()` returning NULL, and it is the state a dashboard-created account lands in until someone inserts its membership row.
- **`restore_backup` is tenant-scoped for free**, because it is SECURITY INVOKER. Called as café two it restored into café two and left café one's 520 products, 12 menus, 180 plates and 429 dishes untouched. Its five `delete … where true` statements now only reach the caller's own café.
- **A known limit, measured rather than predicted, and WIDER than it first looked.** `app_settings.key` is a global primary key and `dbSetSetting` upserts against it, so a second café is refused `42501` on the USING expression the first time it saves ANY setting that already exists — a food cost target, a GST default, its kitchen ingredients. Restoring a file containing `app_settings` fails for the same reason and is one instance of it. Loud, not silent. That is the queue's semantic-keys item, and it now carries this measurement.
  ⚠️ **This bullet said "café two restoring a file containing `app_settings`" until the batch's own pre-push review reproduced the LIVE write path.** Worth keeping visible: the read-side exclusion proof above is real, and it tempted a summary — "isolation works" — that the write side does not support. **Isolation holding is not multi-tenancy working.**
  ✅ **CLOSED by batch 183** — `20260813_semantic_keys.sql` widened both keys. See below.

### And on 13 Aug 2026 (batch 183), the semantic keys — the first rehearsal that STARTED by reproducing the bug

The order is the point and is worth copying: the 42501 pair was reproduced **as the client, before a line of the migration was written**, so the fix had something to be measured against rather than reasoned about.

- **Before:** signed in as café two, `POST /rest/v1/app_settings {"key":"food_cost_target"}` → `42501 new row violates row-level security policy (USING expression)`, and the same for `supplier_phrases` against an id café one already held.
- **After:** both return a row. Café two saved a target, a GST default and its kitchen ingredients; re-upserting the same key UPDATED one row rather than duplicating it, which is the property the composite key exists to preserve. Café one's values and all 60 of its taught packs were untouched throughout, and the two cafés now hold **the same `supplier_phrases.id` with different suppliers and quantities** — the collision, resolved rather than avoided.
- **No client change was needed, and that was measured rather than assumed:** PostgREST derives an upsert's `ON CONFLICT` target from the table's primary key, so `dbSetSetting` kept working untouched. `js/app.js` now says at both call sites that the ABSENCE of an `onConflict` is load-bearing.
- **`restore_backup` v4 exercised as BOTH callers** — as café two and as **anon**, which is production's caller. Its `app_settings` upsert updated the keys the file carried and left the ones it did not, and neither restore touched the other tenant. Format `1` still refused by name.
- ⚠️ **The rollback was RUN, both ways, and both results were worth having.** With café two holding rows it **refused with 23505** — a narrowing key correctly declining to throw a row away — and after café two's rows were cleared it restored both primary keys and the v3 function body in one statement. Then the migration was re-applied. `docs/STAGING.md`'s own advice, taken.
- ⚠️ **One 23505 in this session was NOT a defect and is recorded so the next reader does not chase it.** An anon restore raised `duplicate key value violates unique constraint "ingredients_pkey"` — because the test payload reused an id café two already owned. `ingredients.id`, `plates.id`, `menus.id` and `menu_items.id` are **still global keys**, and their non-collision rests on `uid()`'s entropy (batch 173), not on the schema. **What that proves is the good half: a cross-tenant id collision on restore fails LOUDLY and rolls the whole transaction back, rather than corrupting anything.**

### And on 14 Aug 2026 (batch 191), invitations — the rehearsal that found a spoofable column

The measurements are in `supabase/migrations/20260814_invitations.sql`'s header, which is where they belong. Three things about the *procedure* are worth keeping here, because they are transferable rather than about this migration.

- **Step 2 was satisfied by MEASUREMENT rather than by re-running the file.** All seven fingerprints were diffed against production first and came back identical, which proves the mirror is current far better than re-running `01-schema.sql` and assuming it worked. Re-run it when they differ; diff them first either way.
- ⚠️ **The defect the rehearsal found could not have been found by reading, and reading is what nearly happened.** `invited_by uuid default auth.uid()` looks like "the server decides who invited". It is not: a DEFAULT fires only when the column is **absent** from the INSERT, so an owner POSTing `"invited_by":"<somebody else>"` had it stored verbatim. This is `CLAUDE.md`'s DEFAULT-vs-BEFORE-trigger law read in the other direction — 182 hit the half where the default wins when it should not, and this is the half where it does not fire when it should. **Any column that must not be caller-controlled needs the trigger; the default alone is decoration.** The fix was verified by re-POSTing the spoof and by a PATCH trying to rewrite it.
- **A rehearsal that CONSUMES an account has to put it back.** See the warning at the accounts table above.
