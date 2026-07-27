-- v90 — sell-price history for plates on a menu.
--
-- EzPlate has always stored each plate's CURRENT sell price on its menu_items row and nothing
-- else. Ingredient prices have been logged per product since early on (localStorage
-- cafeDB_ingPriceLog), so the app can already say how a plate's COST has moved — but it has
-- never been able to say whether the PRICE moved with it. That gap is why "its cost rose but
-- the price didn't" and "over target four months running" could not be stated honestly: both
-- are claims about the past that need the price at that moment, not today's price.
--
-- This table starts that clock. One row per observed price for one menu_items row.
--
-- No foreign key to menu_items(id), deliberately, and for the same reason v89's
-- price_history.menu_id has none: deleting a dish (or a whole menu — CLAUDE.md hard rule 7
-- deletes its dishes) must not destroy the price history that explains what happened before
-- it went. An orphaned menu_item_id is simply a series nothing asks for any more.
--
-- APPLY THIS BEFORE DEPLOYING v90. Previews and production share one database.
-- Until it is applied, v90 detects the missing table at bootstrap and keeps sell-price points
-- in localStorage only — no errors, no toasts, no repeated failing writes. The insight
-- families that need price history simply stay silent until they have points, which is what
-- they do on a fresh install anyway.

create table if not exists public.menu_price_history (
  id            bigserial primary key,
  menu_item_id  text not null,
  recorded_at   timestamptz not null default now(),
  price         numeric not null
);

create index if not exists menu_price_history_item_recorded_at_idx
  on public.menu_price_history (menu_item_id, recorded_at);
