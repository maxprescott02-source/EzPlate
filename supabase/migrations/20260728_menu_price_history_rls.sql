-- v94 — RLS policies for menu_price_history. THE v90 MIGRATION FORGOT THESE.
--
-- WHAT WAS WRONG, and why nothing complained loudly:
-- 20260727_menu_price_history.sql creates the table and its index and stops there. On this project
-- the table came up with row-level security ENABLED and no policies at all, which means:
--   * INSERT  -> 401 / 42501 "new row violates row-level security policy". Every sell-price point
--                the app has ever tried to write has been rejected.
--   * SELECT  -> HTTP 200 with an empty array. NOT an error — RLS simply filters every row away.
--
-- That second line is the reason this went unnoticed for a day of production. `bootstrapSync`
-- decides whether the feature is usable with:
--     SUPA.from('menu_price_history').select('menu_item_id').limit(1)  -> is there an .error?
-- With RLS on and no policy there is no error, just no rows. So `menuPriceHistSupported` stays
-- TRUE, the app believes the table is fine, and every write fails behind a toast. The probe tests
-- for "table missing", which is a different question from "table usable".
--
-- Confirmed against production on 28 Jul 2026: the table exists, the column names are right, the
-- probe returns 200, `menu_price_history` holds 0 rows, and an insert with the app's own
-- publishable key returns 42501. `price_history` by contrast accepts an insert, which is what the
-- policies below reproduce for this table.
--
-- Least privilege on purpose: the app SELECTs (bootstrapSync, to merge server points into the local
-- mirror) and INSERTs (dbPushMenuPrice). It never updates or deletes a price point — history is
-- append-only by design, exactly like price_history — so no policy is granted for those.
--
-- APPLY THIS IN THE SQL EDITOR. Until it is applied, sell-price history stays local-only and every
-- price edit fails its server write. Idempotent: safe to run twice.

alter table public.menu_price_history enable row level security;

drop policy if exists "menu_price_history anon select" on public.menu_price_history;
create policy "menu_price_history anon select"
  on public.menu_price_history
  for select
  to anon, authenticated
  using (true);

drop policy if exists "menu_price_history anon insert" on public.menu_price_history;
create policy "menu_price_history anon insert"
  on public.menu_price_history
  for insert
  to anon, authenticated
  with check (true);

-- Verify after running (both should succeed):
--   select count(*) from public.menu_price_history;
--   insert into public.menu_price_history (menu_item_id, recorded_at, price)
--     values ('__verify__', now(), 1.23);
--   delete from public.menu_price_history where menu_item_id = '__verify__';
