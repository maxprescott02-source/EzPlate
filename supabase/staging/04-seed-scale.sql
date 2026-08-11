-- ============================================================================
-- EzPlate STAGING seed — SCALE
--
-- The queue's stated target: 12 menus, several hundred products, plates on
-- multiple menus. Built to answer "does it still work at volume", not "does it
-- look right" — for the second question use 03-seed-realistic.sql, which is
-- small enough to read.
--
-- Sizes, as MEASURED on a real run (11 Aug 2026), not estimated:
--   520 products (43 non-food) · 240 kitchen ingredients · 12 menus · 180 plates
--   429 dishes (404 costed + 25 custom) · 168 plates published to more than one menu
--   60 taught packs · 2,862 product price points · 600 dish price points
--   240 average-food-cost points · 120 change-log entries
--
-- WHY GENERATED RATHER THAN LISTED. 520 hand-written INSERT rows cannot be
-- reviewed, and a reviewer who cannot check the data cannot check the seed. Every
-- value below comes from a small, readable expression over `generate_series`, so
-- the PROPERTIES are auditable even though the rows are not. The properties that
-- matter are asserted at the bottom of this file rather than left to be believed.
--
-- The realistic seed's three deliberate properties are preserved here:
-- all three plate-line shapes, plates published to more than one menu, and some
-- products left unlinked.
--
-- Nothing here resembles Scoopy's catalogue. Names are assembled from word lists.
--
-- ⚠️ NOT A PERFORMANCE BENCHMARK. Staging is a free-tier project on shared
-- hardware; a slow query here is not evidence production is slow, and a fast one
-- is not evidence it is fast. This seed exists to make VOLUME BUGS reproducible
-- — pagination, truncation, dropdowns that assume a short list, an O(n^2) render
-- — not to time anything.
--
-- ROLLBACK: re-run 02-seed-empty.sql, or re-run this file (it wipes first).
-- ============================================================================

-- THE PRODUCTION GUARD — see 02-seed-empty.sql for why it is inline in every file.
do $$
begin
  if to_regclass('public.__ezplate_staging') is null then
    raise exception 'REFUSED: this is an EzPlate STAGING seed and this database has no __ezplate_staging marker, so it is almost certainly PRODUCTION. Nothing has been changed.';
  end if;
end $$;

-- FK-forced wipe order: dishes before plates (menu_items.plate_id is NO ACTION).
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

-- ---------------------------------------------------------------------------
-- 520 PRODUCTS
--
-- id `P0001`..`P0520`, zero-padded to four, which is production's own shape.
-- Category and supplier are picked by modulo so both distributions are even and
-- predictable; `base_unit` cycles g/ml/ea so all three unit categories are
-- exercised. One product in twelve is non-food.
--
-- Categories keep production's raw upper-case supplier strings, including the
-- long ones the Products-polish item is about — "HERBS SPICES & SEASONINGS"
-- truncating mid-word is only visible when something long is actually present.
-- ---------------------------------------------------------------------------
insert into public.ingredients
  (id, description, brand, category, sub_category, base_unit, cost_per_base_unit,
   cost_basis, is_food, pack_size_raw, sold_by, current_price_exgst, price_as_of,
   is_custom, supplier, pack_qty, pack_unit)
select
  'P' || lpad(g::text, 4, '0'),
  (array['Diced','Sliced','Whole','Ground','Smoked','Fresh','Frozen','Cured','Pickled','Roasted'])[1 + (g % 10)]
    || ' ' ||
  (array['tomato','beef','chicken','salmon','potato','onion','cheese','butter','flour','sugar',
         'chocolate','coffee','basil','paprika','olive oil','cream','egg','bacon','prawn','kumara'])[1 + (g % 20)]
    || ' ' || (100 * (1 + (g % 20)))::text || 'g',
  (array['Hillside','Creamery','Millhouse','Verde','Ironbark','Goldcrest','Pantryman','Sunfield','',''])[1 + (g % 10)],
  (array['MEATS','EGGS & DAIRY','FRUIT & VEG','BAKERY','SEAFOOD','FROZEN','BAKING SUPPLIES',
         'HERBS SPICES & SEASONINGS','OILS & VINEGARS','CONDIMENTS','BEVERAGES','CLEANING & JANITORIAL'])[1 + (g % 12)],
  (array['Bulk','Portioned','Case','Retail'])[1 + (g % 4)],
  (array['g','ml','ea'])[1 + (g % 3)],
  -- cost per base unit: 'ea' is dollars-per-item so it is orders of magnitude
  -- larger than per-gram. Keeping that gap real is what stops a unit-handling bug
  -- from looking plausible.
  case when g % 3 = 2 then round((0.35 + (g % 47) * 0.11)::numeric, 4)
       else round((0.0009 + (g % 53) * 0.0007)::numeric, 6) end,
  (array['pack','case','each','bulk'])[1 + (g % 4)],
  (g % 12) <> 0,                                                  -- 1 in 12 is non-food
  (1 + (g % 20))::text || (array['kg','l','ea'])[1 + (g % 3)],
  (array['pack','case','each','bulk'])[1 + (g % 4)],
  round((4.5 + (g % 97) * 1.35)::numeric, 2),
  now() - ((g % 90) * interval '1 day'),
  false,
  (array['Meadowbrook Foods','Northern Provisions','Garden Gate Produce','Millhouse Bakery',
         'Harbour Seafoods','Ironbark Coffee','Cape Wholesale'])[1 + (g % 7)],
  (1 + (g % 20)),
  (array['kg','l','ea'])[1 + (g % 3)]
from generate_series(1, 520) g;

-- ---------------------------------------------------------------------------
-- 12 MENUS — the queue's number, taken literally.
-- ---------------------------------------------------------------------------
insert into public.menus (id, name, season, created_at)
select 'm-scale-' || lpad(g::text, 2, '0'),
       (array['All day','Winter specials','Summer specials','Breakfast','Brunch','Lunch',
              'Dinner','Kids','Functions','Takeaway','Christmas','Test kitchen'])[g],
       (array['','Winter','Summer','','','','','','','','Summer',''])[g],
       now() - ((400 - g * 25) * interval '1 day')
from generate_series(1, 12) g;

-- ---------------------------------------------------------------------------
-- 180 PLATES
--
-- `menu_id` stays NULL — it is the legacy FK nothing reads, and `plateToRow`
-- omits it (CLAUDE.md, "Three foreign keys"). Populating it would break the
-- restore's insert order.
--
-- ⚠️ LINE SHAPES, cycled so all three live shapes appear in bulk:
--     plate % 3 = 0  -> new `{kid, qty}` only
--     plate % 3 = 1  -> new lines plus one legacy `{pid, qty}`
--     plate % 3 = 2  -> new lines plus one `{misc, label, cost}`
-- 60 plates of each, so a reader that mishandles a shape fails on a third of the
-- library rather than on one lucky row.
-- ---------------------------------------------------------------------------
insert into public.plates (id, name, menu_id, lines, category, updated_at)
select
  'PLscale' || lpad(g::text, 3, '0'),
  (array['House','Classic','Chef''s','Seasonal','Grilled','Slow-cooked','Crispy','Open','Loaded','Simple'])[1 + (g % 10)]
    || ' ' ||
  (array['breakfast','burger','salad','pasta','curry','pie','bowl','sandwich','roast','stack',
         'omelette','risotto','tart','hash','skewers'])[1 + (g % 15)]
    || ' ' || g::text,
  null,
  (
    -- Four kitchen-word lines, ids spread across the 240 seeded below.
    --
    -- ⚠️ QUANTITY MUST FOLLOW THE LINE'S BASE UNIT or the seed produces gibberish.
    -- `ea` products are priced per ITEM (dollars each); g/ml products are priced
    -- per gram or millilitre (small fractions of a cent). A flat 20-200 quantity
    -- therefore puts 200 EGGS on a salad and costs it at $961 against an $18 sell
    -- price. Found by opening the app, not by reading the SQL — the Dashboard read
    -- 1831% food cost, which is the kind of number that makes a seed worse than no
    -- seed, because everything downstream of it looks broken.
    -- Kitchen ingredient Kn links to product P(2n), and a product's base unit is
    -- decided by its number mod 3, so the unit IS knowable at this point.
    select jsonb_agg(jsonb_build_object(
             'kid', 'K' || lpad((1 + ((g * 7 + k * 53) % 240))::text, 4, '0'),
             'qty', case when (2 * (1 + ((g * 7 + k * 53) % 240))) % 3 = 2
                         then 1 + ((g + k) % 3)             -- 'ea': one to three of them
                         else 20 + ((g + k) % 180) end))    -- 'g'/'ml': a real portion
      from generate_series(0, 3) k
  )
  || case g % 3
       when 1 then jsonb_build_array(jsonb_build_object('pid', 'P' || lpad((1 + ((g * 11) % 520))::text, 4, '0'),
                                                        'qty', case when (1 + ((g * 11) % 520)) % 3 = 2
                                                                    then 1 + (g % 3)      -- same rule for legacy lines
                                                                    else 15 + (g % 60) end))
       when 2 then jsonb_build_array(jsonb_build_object('misc', true,
                                                        'label', (array['Sauce allowance','Garnish','Stock and wine','Batter and fry oil','Dressing'])[1 + (g % 5)],
                                                        'cost', round((0.45 + (g % 20) * 0.11)::numeric, 2)))
       else '[]'::jsonb
     end,
  (array['Breakfast','Lunch','Dinner','Desserts','Drinks','Sides'])[1 + (g % 6)],
  now() - ((g % 300) * interval '1 day')
from generate_series(1, 180) g;

-- ---------------------------------------------------------------------------
-- DISHES — the many-to-many surface, and the point of this seed.
--
-- Plate N is published to every menu M where (N + M) % 5 = 0, which gives each
-- plate between 2 and 3 menus and each menu a different mix. `plate_id` is the
-- canonical link and `source_plate_id` mirrors it, because the app writes both.
--
-- Sell price varies BY MENU for the same plate, so a bug that reads one plate's
-- price as if it were global shows up as a wrong number rather than a crash.
--
-- Plates 1..12 are deliberately published NOWHERE (the `and p > 12` below):
-- an unpublished library plate is a legitimate state and the Plates screen and
-- the uncosted-dish checks both have to handle it.
-- ---------------------------------------------------------------------------
insert into public.menu_items (id, section, name, price, notes, is_custom, menu_id, plate_id, source_plate_id, updated_at)
select
  'd-scale-' || lpad(p::text, 3, '0') || '-' || lpad(m::text, 2, '0'),
  (array['Breakfast','Lunch','Dinner','Desserts','Drinks','Sides'])[1 + (p % 6)],
  pl.name,
  -- Sell prices are chosen so the seeded café STRADDLES its 32% target rather than
  -- sitting permanently over it. A fixture that is uniformly red is nearly as
  -- useless as one that is nonsense: half the app's meaning is in the green/amber/red
  -- split, and you cannot judge that against a screen where every row is red.
  -- Mean plate cost is ~$13.44, so a mean sell price near $40 lands the average
  -- food cost around the target with a real spread either side of it.
  round((18.00 + (p % 23) * 1.75 + m * 0.40)::numeric, 2),
  null, false,
  'm-scale-' || lpad(m::text, 2, '0'),
  pl.id, pl.id,
  now() - ((p % 200) * interval '1 day')
from generate_series(1, 180) p
cross join generate_series(1, 12) m
join public.plates pl on pl.id = 'PLscale' || lpad(p::text, 3, '0')
where (p + m) % 5 = 0
  and p > 12;

-- 25 CUSTOM dishes with no plate behind them, spread across the first five
-- menus: uncosted rows the Menu screen must flag rather than cost as zero.
insert into public.menu_items (id, section, name, price, notes, is_custom, menu_id, plate_id, source_plate_id, updated_at)
select 'd-scale-custom-' || lpad(g::text, 3, '0'),
       'Sides',
       (array['Bowl of fries','Side salad','Garlic bread','Extra egg','Toast and jam'])[1 + (g % 5)] || ' ' || g::text,
       round((4.50 + (g % 9) * 1.10)::numeric, 2),
       'No recipe attached', true,
       'm-scale-' || lpad((1 + (g % 5))::text, 2, '0'),
       null, null,
       now() - ((g % 60) * interval '1 day')
from generate_series(1, 25) g;

-- ---------------------------------------------------------------------------
-- 240 KITCHEN INGREDIENTS + settings, as `app_settings` JSON blobs.
--
-- Each links to exactly ONE product, at P(2n) — so the even-numbered products
-- are linked and roughly 280 odd-numbered ones are NOT. That is what keeps
-- "Set up from products" visible at scale, and it gives the setup wizard a
-- genuinely long list to page through, which is the volume case it has never met.
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, updated_at)
select 'kitchen_ingredients',
       (select jsonb_agg(jsonb_build_object(
                 'id',   'K' || lpad(g::text, 4, '0'),
                 'name', (array['Diced','Sliced','Whole','Ground','Smoked','Fresh','Frozen','Cured'])[1 + (g % 8)]
                           || ' ' ||
                         (array['tomato','beef','chicken','salmon','potato','onion','cheese','butter',
                                'flour','sugar','chocolate','coffee','basil','paprika','oil','cream'])[1 + (g % 16)]
                           || ' ' || g::text,
                 'pid',  'P' || lpad((2 * g)::text, 4, '0'))
               order by g)
          from generate_series(1, 240) g),
       now();

insert into public.app_settings (key, value, updated_at) values
  ('food_cost_target',    '32'::jsonb,   now()),
  ('gst_default',         '"ex"'::jsonb, now()),
  ('ai_invoice_check',    'true'::jsonb, now()),
  ('ai_suggestions',      'true'::jsonb, now()),
  ('suggest_fab_hidden',  '"0"'::jsonb,  now()),
  ('last_invoice_import', to_jsonb((now()-interval '2 days')::text), now()),
  ('deleted_menu_ids',    '["m-scale-retired-01","m-scale-retired-02"]'::jsonb, now()),
  ('deleted_prod_ids',    '["P9001","P9002","P9003"]'::jsonb, now()),
  -- 40 skipped products: long enough that the Unskip list is itself a volume case.
  ('king_wiz_skips',      (select jsonb_agg('P' || lpad((3 * g + 1)::text, 4, '0')) from generate_series(1, 40) g), now());

-- 60 taught packs across the seven suppliers.
insert into public.supplier_phrases (id, supplier, phrase_norm, qty, unit, updated_at)
select 'sp-scale-' || lpad(g::text, 3, '0'),
       (array['Meadowbrook Foods','Northern Provisions','Garden Gate Produce','Millhouse Bakery',
              'Harbour Seafoods','Ironbark Coffee','Cape Wholesale'])[1 + (g % 7)],
       (1 + (g % 20))::text || (array['kg','l','ea'])[1 + (g % 3)] || ' ' ||
       (array['pack','case','sack','tin','bag','block'])[1 + (g % 6)],
       (1 + (g % 20)),
       (array['kg','l','ea'])[1 + (g % 3)],
       now() - ((g % 120) * interval '1 day')
from generate_series(1, 60) g;

-- ---------------------------------------------------------------------------
-- HISTORY at volume. Same five separate series; same law that a supplier price
-- movement never reaches `menu_change_log`.
-- ---------------------------------------------------------------------------

-- 6 monthly points per food product (~2,860 rows), newest exactly on the stored
-- cost so the row and its series agree.
insert into public.ing_price_history (product_id, recorded_at, cost_per_base_unit)
select i.id,
       date_trunc('day', now()) - (g * interval '30 days'),
       round((i.cost_per_base_unit * (1 - g * 0.011))::numeric, 6)
  from public.ingredients i
  cross join generate_series(0, 5) g
 where i.is_food and i.cost_per_base_unit is not null;

-- current price for every dish, plus an older point on two in five.
insert into public.menu_price_history (menu_item_id, recorded_at, price)
select m.id, m.updated_at, m.price from public.menu_items m where m.price is not null
union all
select m.id, m.updated_at - interval '150 days', round((m.price * 0.91)::numeric, 2)
  from (select id, updated_at, price, row_number() over (order by id) rn
          from public.menu_items where price is not null) m
 where m.rn % 5 < 2;

-- 24 monthly all-menus points crossing the 32% target, plus a per-menu series
-- for each of the twelve. Twelve scopes is the case the scope switcher has never
-- been driven at.
insert into public.price_history (recorded_at, avg_food_cost_pct, menu_id)
select date_trunc('day', now()) - (g * interval '30 days'),
       round((30.5 + g * 0.19)::numeric, 2), null
  from generate_series(0, 23) g;

insert into public.price_history (recorded_at, avg_food_cost_pct, menu_id)
select date_trunc('day', now()) - (g * interval '30 days'),
       round((27.0 + m * 0.9 + g * 0.16)::numeric, 2),
       'm-scale-' || lpad(m::text, 2, '0')
  from generate_series(1, 12) m
  cross join generate_series(0, 17) g;

-- 120 change-log entries. `kind` alone never answers "did this move menus", so
-- every third row carries detail.menuFrom / detail.menuTo and the others do not.
insert into public.menu_change_log (id, recorded_at, kind, plate_id, dish_id, menu_ids,
                                    avg_before, avg_after, cost_before, cost_after, detail)
select 'chg-scale-' || lpad(g::text, 3, '0'),
       now() - (g * interval '3 days'),
       (array['dish_price','plate_edit','publish','unpublish'])[1 + (g % 4)],
       'PLscale' || lpad((13 + (g % 167))::text, 3, '0'),
       null,
       array['m-scale-' || lpad((1 + (g % 12))::text, 2, '0')],
       round((32.0 + (g % 11) * 0.1)::numeric, 2),
       round((32.0 + (g % 11) * 0.1 - 0.15)::numeric, 2),
       round((6.00 + (g % 40) * 0.25)::numeric, 2),
       round((6.00 + (g % 40) * 0.25)::numeric, 2),
       case when g % 3 = 0
            then jsonb_build_object('menuFrom', 'm-scale-' || lpad((1 + (g % 12))::text, 2, '0'),
                                    'menuTo',   'm-scale-' || lpad((1 + ((g + 3) % 12))::text, 2, '0'))
            else jsonb_build_object('note', 'scale seed entry ' || g::text)
       end
from generate_series(1, 120) g;

-- ---------------------------------------------------------------------------
-- ASSERTIONS — the properties this seed claims, checked rather than believed.
-- A generated seed is only trustworthy if the generation is verified, and every
-- one of these has a plausible off-by-one that would silently weaken the seed.
-- ---------------------------------------------------------------------------
do $$
declare n int; m int;
begin
  select count(*) into n from public.ingredients;
  if n <> 520 then raise exception 'scale seed: expected 520 products, got %', n; end if;

  select count(*) into n from public.menus;
  if n <> 12 then raise exception 'scale seed: expected 12 menus, got %', n; end if;

  select count(*) into n from public.plates;
  if n <> 180 then raise exception 'scale seed: expected 180 plates, got %', n; end if;

  -- all three plate-line shapes present, in bulk
  select count(*) into n from public.plates where lines @> '[{"misc":true}]'::jsonb;
  if n < 50 then raise exception 'scale seed: only % plates carry a {misc} line', n; end if;
  select count(*) into n from public.plates p where exists (
    select 1 from jsonb_array_elements(p.lines) l where l ? 'pid');
  if n < 50 then raise exception 'scale seed: only % plates carry a legacy {pid} line', n; end if;
  select count(*) into n from public.plates p where exists (
    select 1 from jsonb_array_elements(p.lines) l where l ? 'kid');
  if n <> 180 then raise exception 'scale seed: expected every plate to carry {kid} lines, got %', n; end if;

  -- plates published to MORE THAN ONE menu — the whole point of the seed
  select count(*) into n from (
    select plate_id from public.menu_items where plate_id is not null
    group by plate_id having count(distinct menu_id) > 1) a;
  if n < 100 then raise exception 'scale seed: only % plates are on more than one menu', n; end if;

  -- unpublished library plates still exist
  select count(*) into n from public.plates p
   where not exists (select 1 from public.menu_items mi where mi.plate_id = p.id);
  if n < 5 then raise exception 'scale seed: only % plates are unpublished', n; end if;

  -- unlinked products still exist, so "Set up from products" stays visible
  select jsonb_array_length(value) into m from public.app_settings where key = 'kitchen_ingredients';
  if m <> 240 then raise exception 'scale seed: expected 240 kitchen ingredients, got %', m; end if;
  select count(*) into n from public.ingredients i
   where not exists (
     select 1 from public.app_settings s, jsonb_array_elements(s.value) k
      where s.key = 'kitchen_ingredients' and k->>'pid' = i.id);
  if n < 100 then raise exception 'scale seed: only % products are unlinked', n; end if;

  -- every kitchen ingredient points at a product that EXISTS. A dangling pid is
  -- the single most damaging thing a seed can get wrong: it looks like data and
  -- costs every plate that uses it as zero.
  select count(*) into n from public.app_settings s, jsonb_array_elements(s.value) k
   where s.key = 'kitchen_ingredients'
     and not exists (select 1 from public.ingredients i where i.id = k->>'pid');
  if n <> 0 then raise exception 'scale seed: % kitchen ingredients point at a missing product', n; end if;

  -- and every plate line's kid/pid resolves too.
  select count(*) into n from public.plates p, jsonb_array_elements(p.lines) l
   where l ? 'kid'
     and not exists (select 1 from public.app_settings s, jsonb_array_elements(s.value) k
                      where s.key = 'kitchen_ingredients' and k->>'id' = l->>'kid');
  if n <> 0 then raise exception 'scale seed: % plate lines reference a missing kitchen ingredient', n; end if;
  select count(*) into n from public.plates p, jsonb_array_elements(p.lines) l
   where l ? 'pid'
     and not exists (select 1 from public.ingredients i where i.id = l->>'pid');
  if n <> 0 then raise exception 'scale seed: % plate lines reference a missing product', n; end if;

  -- ⚠️ THE NUMBERS MUST BE SANE, and this is the assertion that says so.
  -- Every other check above passes happily on a seed where a salad costs $961 and
  -- the Dashboard reads 1831% food cost — which is what the first run of this file
  -- actually produced, because `ea` lines carried gram-scale quantities. A seed
  -- whose arithmetic is absurd is worse than no seed: everything downstream looks
  -- broken and nobody can tell the seed from the bug.
  -- Plate cost is computed the app's way: sum(qty * cost_per_base_unit) for kid and
  -- pid lines, plus the flat `cost` on misc lines. $60 is generous for a cafe plate
  -- and is a CEILING, not a target — it only has to catch the order-of-magnitude
  -- error, and being loose is what stops it failing on an honest retune.
  select max(c)::int into n from (
    select p.id, sum(
      case
        when l ? 'misc' then coalesce((l->>'cost')::numeric, 0)
        when l ? 'kid'  then coalesce((l->>'qty')::numeric, 0) * coalesce((
               select i.cost_per_base_unit from public.ingredients i
                where i.id = (select k->>'pid' from public.app_settings s, jsonb_array_elements(s.value) k
                               where s.key = 'kitchen_ingredients' and k->>'id' = l->>'kid')), 0)
        when l ? 'pid'  then coalesce((l->>'qty')::numeric, 0) * coalesce((
               select i.cost_per_base_unit from public.ingredients i where i.id = l->>'pid'), 0)
        else 0
      end) as c
      from public.plates p, jsonb_array_elements(p.lines) l
     group by p.id) a;
  if n > 60 then
    raise exception 'scale seed: the most expensive plate costs $%, which is absurd for a cafe plate. Check that ''ea'' lines carry item-scale quantities and g/ml lines carry portion-scale ones.', n;
  end if;
end $$;

select 'scale seed loaded' as result,
       (select count(*) from public.ingredients)        as products,
       (select count(*) from public.ingredients where not is_food) as non_food,
       (select jsonb_array_length(value) from public.app_settings where key='kitchen_ingredients') as kitchen_ingredients,
       (select count(*) from public.menus)              as menus,
       (select count(*) from public.plates)             as plates,
       (select count(*) from public.menu_items)         as dishes,
       (select count(*) from (select plate_id from public.menu_items where plate_id is not null
                              group by plate_id having count(distinct menu_id) > 1) a) as plates_on_many_menus,
       (select count(*) from public.supplier_phrases)   as taught_packs,
       (select count(*) from public.ing_price_history)  as ing_price_points,
       (select count(*) from public.menu_price_history) as dish_price_points,
       (select count(*) from public.price_history)      as avg_points,
       (select count(*) from public.menu_change_log)    as change_log;
