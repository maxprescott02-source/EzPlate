-- ============================================================================
-- EzPlate STAGING seed — EMPTY
--
-- The state production has NEVER shown and therefore the one nothing has been
-- tested against. `docs/QUEUE.md`'s onboarding item is unreachable without it:
-- every screen at zero, the first-run states, the zero-ingredients builder hint,
-- and `ensureDefaultMenu`'s gate (a successful EMPTY read is the user having
-- deleted everything and must be respected — CLAUDE.md, "Menus").
--
-- Leaves the `__ezplate_staging` marker in place, so the seeds still guard.
--
-- ROLLBACK: none needed and none possible — this file DESTROYS staging data by
-- design. Re-run 03 or 04 to get data back.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- THE PRODUCTION GUARD. First statement in every seed, before anything
-- destructive. `__ezplate_staging` exists only in staging (01-schema.sql
-- creates it), so this raises before a single row is deleted if this file is
-- ever pasted into the production SQL editor by mistake.
--
-- Do not "simplify" it into a shared function: inline is what makes it travel
-- with the file, and a file that arrives somewhere without its guard is the
-- exact accident being guarded against.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.__ezplate_staging') is null then
    raise exception 'REFUSED: this is an EzPlate STAGING seed and this database has no __ezplate_staging marker, so it is almost certainly PRODUCTION. Nothing has been changed.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- The wipe. Order is FK-forced and is the same order restore_backup uses:
-- dishes before plates, because menu_items.plate_id -> plates.id is NO ACTION
-- and raises 23503 the other way round (CLAUDE.md, "Three foreign keys").
-- `where true` is load-bearing in the RPC for `authenticator`; here we run as
-- `postgres`, where it is merely harmless — kept identical so the two files
-- cannot drift apart in a reader's head.
-- ---------------------------------------------------------------------------
delete from public.menu_items where true;
delete from public.plates where true;
delete from public.menus where true;
delete from public.ingredients where true;
delete from public.supplier_phrases where true;
delete from public.menu_price_history where true;
delete from public.ing_price_history where true;
delete from public.price_history where true;
delete from public.menu_change_log where true;
delete from public.app_settings where true;

-- ⚠️ app_settings is emptied too, and that is the POINT of this seed rather than
-- an oversight: `kitchen_ingredients` and every user setting live there as JSON
-- blobs keyed by setting name, not as tables (CLAUDE.md, "The row boundary"), so
-- leaving them behind would produce a database with no products and no menus but
-- a full set of kitchen words — a state no real café can be in, and the least
-- useful thing to test onboarding against.

select 'staging is now empty' as result,
       (select count(*) from public.ingredients)  as products,
       (select count(*) from public.menus)        as menus,
       (select count(*) from public.plates)       as plates,
       (select count(*) from public.menu_items)   as dishes,
       (select count(*) from public.app_settings) as settings;
