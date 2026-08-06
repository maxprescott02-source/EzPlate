-- v114 — menu_change_log: a record of what MAX DID, as distinct from what the suppliers did.
--
-- WHY THIS EXISTS
-- The dashboard's food-cost trend is permanently red and always will be: ingredient prices drift up
-- continuously and the number only falls when somebody acts. Colouring by direction therefore reports
-- failure during the ordinary operation of a cafe. The reframe (a later batch) replaces direction with
-- "where you sit against target" and "what you last did about it, and how far it has moved since".
-- That second half needs a record of interventions, and no such record exists anywhere in the app.
--
-- WHY NOT plates.updated_at, WHICH IS THE OBVIOUS CANDIDATE
--   1. v110's restore_backup deletes and reinserts every plates row, so ONE restore erases the entire
--      history of interventions while the trend line it is supposed to annotate survives intact.
--   2. It records that a row was WRITTEN, not that a decision was MADE. A sync, a backfill and a real
--      re-portioning are indistinguishable.
--
-- WHAT IS AND IS NOT AN INTERVENTION
-- Supplier price movements are NOT logged here. They are the thing being measured against, and if they
-- wrote to this table the "how long since you last acted" clock would reset every time a supplier raised
-- a price -- the precise event the drift counter exists to accumulate. Self-defeating.
-- The line is drawn at a function, not at a list: every product-price write in the app funnels through
-- `setProduct`, which is `ing_price_history`'s sole writer. If setProduct wrote it, it is supplier drift
-- and belongs there. This table is written by the twelve paths that change a RECIPE, a LINK or a MENU.
--
-- NO FOREIGN KEYS, DELIBERATELY -- AND THE REASON IS DOUBLE.
--   1. Same reason `ing_price_history` has none to `ingredients` and `menu_price_history` none to
--      `menu_items`: deleting a plate must not destroy the record of what was done to it. An entry
--      naming a plate that no longer exists is the most interesting kind of entry this table holds.
--   2. The restore FORCES it. `restore_backup` deletes and reinserts every row of menu_items, plates
--      and menus. An edge with NO ACTION (the shape menu_items.plate_id -> plates.id carries, the app's
--      only FK that can error) would reject that delete outright; an ON DELETE SET NULL edge would
--      silently blank every link in this table on a restore that appeared to succeed. Neither is
--      survivable for a log whose entire value is that it can be trusted.
-- So plate_id / dish_id / menu_ids are plain text, resolved in the client or not at all.
--
-- APPEND-ONLY IS ENFORCED BY THE POLICIES, NOT BY CONVENTION.
-- SELECT and INSERT are granted; UPDATE and DELETE are not, to any role that reaches this through
-- PostgREST. An intervention that later proved wrong is still an intervention that happened, so there
-- is no legitimate caller for either. This mirrors ing_price_history's least-privilege grant, and it
-- is what lets the restore be additive without needing to trust the client.
--
-- id IS CLIENT-GENERATED TEXT, not a bigserial, and that is what makes the restore idempotent.
-- ing_price_history has to identify a point by (product_id, recorded_at) because its ids are server-
-- side; here the client already mints stable ids for plates, dishes and menus, so an entry carries its
-- own identity into the backup file and back out again. Restoring the same file twice inserts nothing
-- the second time (`on conflict (id) do nothing`) rather than relying on a composite natural key that
-- two entries written in the same millisecond could collide on.
--
-- WHY numeric AND NOT A STORED PERCENTAGE.
-- avg_before/avg_after are what computeAvgFoodCost() said either side of the change -- the chart's own
-- units, comparable across every kind of event. cost_before/cost_after are the plate's ingredient cost
-- in dollars, present only where the event is plate-scoped. Storing a food-cost PERCENTAGE instead
-- would bake in the sell price and the target, which move independently of the intervention; the pair
-- of primitives lets a later batch compute against whatever it wants, and lets it say "this cut 42c off
-- the plate", which stays true forever. CLAUDE.md's rounding rule applies: stored values are exact.
--
-- These figures are STORED rather than derived at read time, and the brief's framing of that trade
-- ("stored is simpler and lies if the data changes; derived is honest and more expensive") does not
-- apply here. Deriving an intervention's effect needs the plate's recipe as it was BEFORE and AFTER the
-- change. `plates.lines` holds only the current state and there is no recipe history in this app. So
-- derived is not more expensive, it is unavailable.
--
-- APPLY THIS IN THE SQL EDITOR BEFORE THE v114 CODE SHIPS. Previews and production share one database.
-- Idempotent: safe to run twice. Reversible with: drop table public.menu_change_log;

create table if not exists public.menu_change_log (
  id           text primary key,
  recorded_at  timestamptz not null default now(),
  kind         text not null,
  plate_id     text,
  dish_id      text,
  -- Every menu the one action affected. A plate published to three menus is ONE entry listing three,
  -- not three entries: the user did one thing, and N rows would inflate any "interventions this month"
  -- count by a factor. Empty for a plate that is not on any menu -- a real and common case, not a gap.
  menu_ids     text[] not null default '{}',
  avg_before   numeric,
  avg_after    numeric,
  cost_before  numeric,
  cost_after   numeric,
  -- Names and labels for the marker, so a later chart can say WHICH plate without resolving an id that
  -- may since have been deleted. Never numbers the chart should be computing -- see the columns above.
  detail       jsonb
);

-- The chart reads a time window, newest first. The client caps its boot read; this is what keeps that
-- read cheap once the table has years in it.
create index if not exists menu_change_log_recorded_at_idx
  on public.menu_change_log (recorded_at desc);

-- GRANTS, which are a SEPARATE question from RLS. RLS decides which rows are visible once the table is
-- reachable; the Data API decides whether anon can reach it at all, and the symptom of missing grants is
-- a 404 on a table that plainly exists -- which reads like a typo, not a permissions problem.
-- No sequence grant is needed here: `id` is client-supplied text, so no nextval() is called. That is one
-- fewer way for this table to come up half-working than ing_price_history had.
grant usage on schema public to anon, authenticated;
grant select, insert on public.menu_change_log to anon, authenticated;

-- RLS POLICIES ARE IN THIS FILE ON PURPOSE. The v90 menu_price_history migration created a table and
-- stopped there; it came up with RLS enabled and no policies, so every insert was rejected 42501 while
-- every select returned 200-with-no-rows -- indistinguishable from an empty table, so nothing looked
-- wrong for a day of production. That cost a second migration. Not repeating it.
--
-- This also settles CLAUDE.md's note that public.menus has RLS disabled while every other public table
-- has it enabled: the prevailing pattern is followed here, not the outlier.
alter table public.menu_change_log enable row level security;

drop policy if exists "menu_change_log anon select" on public.menu_change_log;
create policy "menu_change_log anon select"
  on public.menu_change_log
  for select
  to anon, authenticated
  using (true);

drop policy if exists "menu_change_log anon insert" on public.menu_change_log;
create policy "menu_change_log anon insert"
  on public.menu_change_log
  for insert
  to anon, authenticated
  with check (true);

-- VERIFY AFTER RUNNING. All four should succeed, and the last should return exactly two rows.
--
--   select count(*) from public.menu_change_log;
--
--   insert into public.menu_change_log (id, kind, menu_ids)
--     values ('__verify__', 'plate_edited', array['MENU_ORIGINAL']);
--   delete from public.menu_change_log where id = '__verify__';
--
--   select policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'menu_change_log';
--
-- The INSERT is the one that matters -- it is the check the v90 migration did not have, and the reason
-- that table sat write-blocked for a day. Do NOT skip it: a select alone cannot tell an empty table
-- apart from an RLS-filtered one. (The delete above runs as `postgres` in the SQL editor, which is not
-- subject to the policies; the app's own role has no DELETE policy and that is intended.)
