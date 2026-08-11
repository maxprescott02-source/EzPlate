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

---

## What staging does NOT rehearse

Written down because a rehearsal you over-trust is worse than none.

- **The data.** Staging holds invented products at invented prices. It cannot tell you whether a change gives the right answer for Scoopy's — only whether it runs, links and renders.
- **Scale of history.** The seeds generate tidy series. Production's history is lumpy and has gaps.
- **Anything auth.** Neither project has users. `anon` is the only role either has ever been exercised as, and the RLS policies are all `using (true)` — so **the multi-tenant work will be rehearsing policies that do not exist yet**, which is the point of building this before it, not a gap in it.
- **The invoice AI path.** `api/parse-invoice` and `api/insight` are Vercel functions with one `GEMINI_API_KEY`. They do not know which Supabase project the page is talking to, and pointing the client at staging does not point them anywhere new.
- **Timing.** Free tier, shared hardware. See the note on `04`.

---

## Current state

Left on the **scale seed** at the end of batch 172 (520 products, 12 menus, 180 plates, 429 dishes). Run `02` or `03` to change it — nothing in staging is worth preserving, which is the point of it.

### Already rehearsed here, on 11 Aug 2026

Recorded because these are the first things staging has ever been used for, and two of them de-risk queued work:

- **`restore_backup` end to end as the anon client** — correct counts returned; every dish came back linked to its plate; plates inserted with `menu_id` null; one plate correctly on two menus. **Zero dishes with a null plate link** — the signature of the failure that once cost 76 of 77 dishes.
- **Both refusal paths, by name** — format `1` refused, and a missing group named as `ing_price_history`.
- **A restore into a genuinely EMPTY database.** This is *step 3 of the v110 destructive plan*, which the queue records as never having been run. It now has been — against staging, at zero risk, with identical counts and links to the populated case. That does not discharge the queue item, which is about production and still needs Max's go on the day, but it means the step is no longer being attempted for the first time on real data.
