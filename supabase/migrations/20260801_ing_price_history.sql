-- v108 — per-product cost history gets a server table at last.
--
-- WHY THIS EXISTS
-- `cafeDB_ingPriceLog` is the ONE dataset in EzPlate with no server destination at all.
-- Verified both directions before writing this: `loadIngLog`/`saveIngLog` (js/app.js:1004-1005)
-- touch localStorage and nothing else, and none of the eight tables `bootstrapSync` reads
-- carries it. One copy, one device, one browser profile — clearing Safari website data has
-- always destroyed it outright. v106 put it in the backup export, which made a second copy
-- POSSIBLE; this makes it automatic.
--
-- It is not decorative data: `ingPriceAt` reads it to reconstruct historical plate costs,
-- which is what the movers card and insight family 1 stand on. Without it those features
-- have nothing to say.
--
-- THE ONLINE-ONLY BATCH DEPENDS ON THIS. That batch stops localStorage being a data store.
-- Applied to a database without this table, per-product cost history would not move to the
-- server — it would simply cease to exist. This migration must land, and be confirmed, first.
--
-- SHAPE
-- In memory the log is `{productId: [{t: epochMillis, v: costPerBaseUnit}]}`, capped at the
-- newest 60 points per product (`logIngPrice`). One row here is one point. The cap stays a
-- client-side read concern: history is append-only on the server, exactly like `price_history`
-- and `menu_price_history`.
--
-- NO foreign key to ingredients(id), deliberately, and for the same reason
-- `menu_price_history` has none to `menu_items(id)`: deleting a product must not destroy the
-- price history that explains what happened before it went. An orphaned product_id is simply
-- a series nothing asks for any more.
--
-- The UNIQUE constraint is what makes the data seed re-runnable. A point is identified by
-- (product, moment); inserting the same point twice is a no-op rather than a duplicate that
-- would quietly double-weight one observation in a band or an average.
--
-- RLS POLICIES ARE IN THIS FILE ON PURPOSE. The v90 `menu_price_history` migration created a
-- table and stopped there; it came up with RLS enabled and no policies, so every insert was
-- rejected 42501 while every select returned 200-with-no-rows — which is indistinguishable
-- from an empty table, so the app's support probe saw nothing wrong for a day of production.
-- That cost a second migration (20260728_menu_price_history_rls.sql). Not repeating it.
--
-- Least privilege: the app SELECTs (bootstrap) and INSERTs (`logIngPrice`). It never updates
-- or deletes a point, so no policy is granted for those.
--
-- APPLY THIS IN THE SQL EDITOR BEFORE THE v108 CODE SHIPS. Previews and production share one
-- database. Idempotent: safe to run twice.

create table if not exists public.ing_price_history (
  id                 bigserial primary key,
  product_id         text not null,
  recorded_at        timestamptz not null default now(),
  cost_per_base_unit numeric not null,
  constraint ing_price_history_product_moment_key unique (product_id, recorded_at)
);

create index if not exists ing_price_history_product_recorded_at_idx
  on public.ing_price_history (product_id, recorded_at);

-- GRANTS, which are a SEPARATE question from RLS and are the other way a new table comes up
-- unusable. RLS decides which ROWS are visible once the table is reachable; the Data API
-- decides whether the anon role can reach it at all. Depending on the project's Data API
-- settings a newly created table is not necessarily exposed, and the symptom is a 404 on a
-- table that plainly exists — which reads like a typo, not a permissions problem.
--
-- Empirically this project does expose new public tables (`menu_price_history` was created by
-- SQL in v90 and is readable with the publishable key today, 77 rows). These grants are
-- therefore belt-and-braces — but they cost nothing, they make the migration self-sufficient,
-- and this is the second failure mode in a row on this exact table pattern.
--
-- The sequence grant is the one that is easy to miss: `id` is `bigserial`, so an INSERT calls
-- nextval() on the sequence. Without usage on it, selects work and inserts fail — the same
-- half-working shape the v90 RLS bug had.

grant usage on schema public to anon, authenticated;
grant select, insert on public.ing_price_history to anon, authenticated;
grant usage, select on sequence public.ing_price_history_id_seq to anon, authenticated;

alter table public.ing_price_history enable row level security;

drop policy if exists "ing_price_history anon select" on public.ing_price_history;
create policy "ing_price_history anon select"
  on public.ing_price_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists "ing_price_history anon insert" on public.ing_price_history;
create policy "ing_price_history anon insert"
  on public.ing_price_history
  for insert
  to anon, authenticated
  with check (true);

-- VERIFY AFTER RUNNING. All four should succeed, and the last should return two rows.
--
--   select count(*) from public.ing_price_history;
--
--   insert into public.ing_price_history (product_id, recorded_at, cost_per_base_unit)
--     values ('__verify__', now(), 1.23);
--   delete from public.ing_price_history where product_id = '__verify__';
--
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'ing_price_history';
--
-- The insert is the one that matters — it is the check the v90 migration did not have, and
-- the reason that table sat write-blocked. Do NOT skip it: a select alone cannot tell an
-- empty table apart from an RLS-filtered one.
