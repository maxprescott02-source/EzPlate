-- v108 — retire the tombstone lists by actually deleting the one row they hide.
--
-- RUN THIS LAST, and only after saying yes to it. It is the ONLY statement in this batch that
-- destroys anything.
--
-- WHAT A TOMBSTONE WAS FOR
-- `deleted_prod_ids` and `deleted_menu_ids` exist because deletion had to survive two things
-- that are both going away: a hardcoded base layer that would re-add the row on every
-- `rebuild()`, and `reconcileLocalOnly`, which re-pushes local rows the server does not have
-- and needed to be told which absences were deliberate. With the base literals migrated into
-- the tables and the local-only heal deleted, a tombstone list is a second, weaker way of
-- saying "deleted" — the third category the online-only brief rules out.
--
-- WHAT IS ACTUALLY IN THEM (verified against production and the stamped export, 1 Aug 2026,
-- not taken from the audit):
--
--   deleted_menu_ids = ["m42","m51","m50"]
--     All three are `BASE_MENU` ids, and all three are ALREADY ABSENT from `menu_items` —
--     66 of the literal's 69 dishes are server rows, these 3 are not. Nothing to delete.
--     Deleting the `BASE_MENU` literal drops them by itself.
--
--   deleted_prod_ids = ["Umrzbztwn"]
--     "ZZTEST Olive Oil", a custom product Max made and deleted on 24 Jul. Unlike the menu
--     ids, THIS ROW IS STILL ON THE SERVER — deletion only ever hid it. Once products come
--     from the table, a hidden row that is still in the table is a row that comes back.
--
-- So this file is one DELETE.
--
-- RECOVERABLE: the row is in the stamped backup export (`products["Umrzbztwn"]`), in full.
-- If it is ever wanted back it can be re-inserted by hand from that file.
--
-- SAFE TO APPLY BEFORE THE CODE SHIPS: under the deployed v107 the row is already suppressed
-- by the tombstone at `rebuild()` (js/app.js:228), so deleting it changes nothing a user sees.
--
-- The two `app_settings` rows are left in place on purpose. They cost nothing, and dropping
-- them is not reversible if this batch is rolled back. They can be cleared in a later tidy
-- once online-only has run for a while:
--   delete from public.app_settings where key in ('deleted_prod_ids','deleted_menu_ids');

-- THE DELETE VERIFIES BEFORE IT ACTS, rather than trusting that a test product is unreferenced.
--
-- A product is reachable from a plate by TWO paths, and both are live on Max's data:
--   plate line -> kid -> kitchen ingredient -> pid -> product   (81 of 179 lines)
--   plate line -> pid -> product, directly                      (84 of 179 lines)
-- The `not exists` clauses below cover both: the first rules out any kitchen ingredient
-- pointing at this product (which is what every `kid` path must pass through), the second
-- rules out any plate line naming it directly.
--
-- If either finds a reference, this deletes NOTHING and reports `DELETE 0`. That is the
-- signal to stop, not a no-op to shrug at.
--
-- Checked by hand against production first (1 Aug 2026): 0 of 159 kitchen ingredients and
-- 0 of 179 plate lines reference it. The clauses are here so the check is part of the
-- statement rather than a claim in a comment.

-- Containment (`@>`), not `jsonb_array_elements`, and that is deliberate. `app_settings` is a
-- key/value table holding scalars as well as arrays — `food_cost_target` is the number 40 —
-- and a lateral expansion is evaluated per row of the join, AHEAD of the WHERE that would have
-- filtered the scalars out. So the obvious spelling errors with "cannot extract elements from
-- a scalar" and deletes nothing; and a `jsonb_typeof` guard in the WHERE does not save it,
-- because that clause is evaluated too late as well. `@>` has no such trap: applied to a
-- scalar it simply returns false.
--
-- Reading the test: `[… ,{"id":"K12","name":"Chips","pid":"P0004"}, …] @> [{"pid":"P0004"}]`
-- is true when ANY element of the stored array contains that key/value pair. Which is the
-- question being asked — does anything point at this product.

delete from public.ingredients i
 where i.id = 'Umrzbztwn'
   and not exists (
     select 1 from public.app_settings
      where key = 'kitchen_ingredients'
        and value::jsonb @> jsonb_build_array(jsonb_build_object('pid', i.id)))
   and not exists (
     select 1 from public.plates
      where coalesce(lines::jsonb, '[]'::jsonb)
            @> jsonb_build_array(jsonb_build_object('pid', i.id)));

-- VERIFY AFTER RUNNING:
--
--   The statement above must report DELETE 1.
--   DELETE 0 means something references the product — do not force it, say so.
--
--   select count(*) from public.ingredients;
--     -> expect 412  (413 after the backfill, minus this one)
--
--   select count(*) from public.ingredients where id = 'Umrzbztwn';
--     -> expect 0
--
-- 412 is the live product count the app shows today. If the number is anything else, stop and
-- say so before the code ships — the catalogue is the thing every plate cost is built on.
