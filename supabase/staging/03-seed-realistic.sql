-- ============================================================================
-- EzPlate STAGING seed — REALISTIC
--
-- One small café, sized so every screen can be READ at a glance and a wrong
-- number is obvious. MEASURED on a real run (11 Aug 2026): 50 products (48
-- supplier + 2 custom), 27 kitchen ingredients, 2 menus, 14 plates, 17 dishes,
-- 3 plates published to both menus, 23 unlinked products, 1 unpublished plate.
-- This is the seed to use when judging whether something LOOKS right.
-- Use 04-seed-scale.sql when the question is whether it still works at volume.
--
-- Three things here are deliberate and must survive any edit, because they are
-- the properties that make a rehearsal worth anything:
--
--   1. PLATE LINES USE ALL THREE LIVE SHAPES. New `{kid, qty}`, legacy
--      `{pid, qty}`, and `{misc, label, cost}`. CLAUDE.md records that legacy
--      lines are LIVE data (84 of 179 at the v125 count) that every reader must
--      keep resolving, so a seed built only from the new shape would rehearse a
--      database the app has never actually met.
--   2. ONE PLATE IS PUBLISHED TO BOTH MENUS. Plate<->dish is many-to-many, one
--      dish per menu, and per-publication counting means it must count twice on
--      the dashboard. A seed where every plate sits on one menu cannot show that.
--   3. SOME PRODUCTS ARE UNLINKED. `renderKingProgress` only shows "Set up from
--      products" when unlinked products exist, and that button is half of the
--      mobile-header queue item. A fully-linked seed hides it.
--
-- All names, suppliers, brands and prices are INVENTED. Nothing here comes from
-- Scoopy's real catalogue: staging is a second copy of the schema, never a
-- second copy of the café's pricing.
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
-- PRODUCTS (supplier goods — the UI calls this screen "Products", the table is
-- `ingredients`. The naming inversion is CLAUDE.md Tier 1; do not "fix" it.)
--
-- `base_unit` is constrained to g/ml/ea, and `cost_per_base_unit` is the exact
-- unrounded cost — CLAUDE.md forbids rounding stored values, so these carry more
-- decimals than any display will ever show. That is on purpose: a seed rounded
-- to the cent would quietly agree with a bug that rounds at rest.
--
-- Four suppliers and a spread of categories, including the raw upper-case
-- supplier strings the Products-polish queue item is about ("BAKING SUPPLIES"),
-- because normalising them here would hide the very thing that needs looking at.
-- ---------------------------------------------------------------------------
insert into public.ingredients
  (id, description, brand, category, sub_category, base_unit, cost_per_base_unit,
   cost_basis, is_food, pack_size_raw, sold_by, current_price_exgst, price_as_of,
   is_custom, supplier, pack_qty, pack_unit)
values
  ('P0001','Streaky bacon 2kg','Hillside','MEATS','Bacon','g',0.0148,'pack',true,'2kg','pack',29.60,now()-interval '6 days',false,'Meadowbrook Foods',2,'kg'),
  ('P0002','Free range eggs size 7','Fernvale','EGGS & DAIRY','Eggs','ea',0.5583,'tray',true,'tray 30','tray',16.75,now()-interval '9 days',false,'Meadowbrook Foods',30,'ea'),
  ('P0003','Sourdough loaf 800g','Millhouse','BAKERY','Bread','g',0.0069,'each',true,'800g','each',5.50,now()-interval '3 days',false,'Millhouse Bakery',800,'g'),
  ('P0004','Butter salted 5kg','Creamery','EGGS & DAIRY','Butter','g',0.0132,'block',true,'5kg','block',66.00,now()-interval '12 days',false,'Northern Provisions',5,'kg'),
  ('P0005','Cheddar tasty 1kg','Creamery','EGGS & DAIRY','Cheese','g',0.0165,'block',true,'1kg','block',16.50,now()-interval '12 days',false,'Northern Provisions',1,'kg'),
  ('P0006','Avocado class 1','','FRUIT & VEG','Fruit','ea',1.2000,'each',true,'each','each',1.20,now()-interval '2 days',false,'Garden Gate Produce',1,'ea'),
  ('P0007','Tomatoes gourmet 5kg','','FRUIT & VEG','Vegetables','g',0.0079,'case',true,'5kg','case',39.50,now()-interval '2 days',false,'Garden Gate Produce',5,'kg'),
  ('P0008','Baby spinach 1kg','','FRUIT & VEG','Salad','g',0.0142,'bag',true,'1kg','bag',14.20,now()-interval '2 days',false,'Garden Gate Produce',1,'kg'),
  ('P0009','Red onion 10kg','','FRUIT & VEG','Vegetables','g',0.0031,'sack',true,'10kg','sack',31.00,now()-interval '8 days',false,'Garden Gate Produce',10,'kg'),
  ('P0010','Agria potatoes 10kg','','FRUIT & VEG','Vegetables','g',0.0022,'sack',true,'10kg','sack',22.00,now()-interval '8 days',false,'Garden Gate Produce',10,'kg'),
  ('P0011','Shoestring fries 2.5kg','Goldcrest','FROZEN','Chips','g',0.0043,'bag',true,'2.5kg','bag',10.75,now()-interval '5 days',false,'Northern Provisions',2.5,'kg'),
  ('P0012','Sirloin steak portioned 220g','Hillside','MEATS','Beef','g',0.0361,'pack',true,'5kg','pack',180.50,now()-interval '6 days',false,'Meadowbrook Foods',5,'kg'),
  ('P0013','Chicken breast skinless 5kg','Hillside','MEATS','Poultry','g',0.0154,'pack',true,'5kg','pack',77.00,now()-interval '6 days',false,'Meadowbrook Foods',5,'kg'),
  ('P0014','Salmon fillet fresh','','SEAFOOD','Fish','g',0.0428,'kg',true,'1kg','kg',42.80,now()-interval '1 day',false,'Harbour Seafoods',1,'kg'),
  ('P0015','Prawn cutlets 1kg','Tidewater','SEAFOOD','Shellfish','g',0.0339,'bag',true,'1kg','bag',33.90,now()-interval '11 days',false,'Harbour Seafoods',1,'kg'),
  ('P0016','Olive oil extra virgin 4L','Verde','OILS & VINEGARS','Oil','ml',0.0091,'tin',true,'4L','tin',36.40,now()-interval '20 days',false,'Northern Provisions',4,'l'),
  ('P0017','Rice bran oil 20L','Verde','OILS & VINEGARS','Oil','ml',0.0044,'drum',true,'20L','drum',88.00,now()-interval '20 days',false,'Northern Provisions',20,'l'),
  ('P0018','Balsamic vinegar 5L','Verde','OILS & VINEGARS','Vinegar','ml',0.0058,'bottle',true,'5L','bottle',29.00,now()-interval '30 days',false,'Northern Provisions',5,'l'),
  ('P0019','Plain flour 25kg','Millhouse','BAKING SUPPLIES','Flour','g',0.0018,'sack',true,'25kg','sack',45.00,now()-interval '25 days',false,'Millhouse Bakery',25,'kg'),
  ('P0020','Caster sugar 25kg','','BAKING SUPPLIES','Sugar','g',0.0021,'sack',true,'25kg','sack',52.50,now()-interval '25 days',false,'Millhouse Bakery',25,'kg'),
  ('P0021','Baking powder 3kg','','BAKING SUPPLIES','Raising agents','g',0.0094,'tub',true,'3kg','tub',28.20,now()-interval '40 days',false,'Millhouse Bakery',3,'kg'),
  ('P0022','Dark chocolate 55% 5kg','Couverture Co','BAKING SUPPLIES','Chocolate','g',0.0212,'box',true,'5kg','box',106.00,now()-interval '18 days',false,'Northern Provisions',5,'kg'),
  ('P0023','Vanilla extract 1L','','BAKING SUPPLIES','Flavourings','ml',0.0890,'bottle',true,'1L','bottle',89.00,now()-interval '60 days',false,'Northern Provisions',1,'l'),
  ('P0024','Cream 35% 2L','Creamery','EGGS & DAIRY','Cream','ml',0.0074,'bottle',true,'2L','bottle',14.80,now()-interval '4 days',false,'Northern Provisions',2,'l'),
  ('P0025','Milk standard 2L','Creamery','EGGS & DAIRY','Milk','ml',0.0021,'bottle',true,'2L','bottle',4.20,now()-interval '1 day',false,'Northern Provisions',2,'l'),
  ('P0026','Espresso beans house blend 1kg','Ironbark','BEVERAGES','Coffee','g',0.0325,'bag',true,'1kg','bag',32.50,now()-interval '7 days',false,'Ironbark Coffee',1,'kg'),
  ('P0027','Loose leaf breakfast tea 500g','Ironbark','BEVERAGES','Tea','g',0.0480,'tin',true,'500g','tin',24.00,now()-interval '45 days',false,'Ironbark Coffee',500,'g'),
  ('P0028','Orange juice 2L','Sunfield','BEVERAGES','Juice','ml',0.0031,'bottle',true,'2L','bottle',6.20,now()-interval '3 days',false,'Northern Provisions',2,'l'),
  ('P0029','Sea salt flakes 1kg','','HERBS SPICES & SEASONINGS','Salt','g',0.0088,'box',true,'1kg','box',8.80,now()-interval '90 days',false,'Northern Provisions',1,'kg'),
  ('P0030','Black peppercorns 500g','','HERBS SPICES & SEASONINGS','Pepper','g',0.0342,'bag',true,'500g','bag',17.10,now()-interval '90 days',false,'Northern Provisions',500,'g'),
  ('P0031','Smoked paprika 500g','','HERBS SPICES & SEASONINGS','Spices','g',0.0268,'bag',true,'500g','bag',13.40,now()-interval '90 days',false,'Northern Provisions',500,'g'),
  ('P0032','Dried oregano 250g','','HERBS SPICES & SEASONINGS','Herbs','g',0.0396,'bag',true,'250g','bag',9.90,now()-interval '90 days',false,'Northern Provisions',250,'g'),
  ('P0033','Basil fresh 100g','','FRUIT & VEG','Herbs','g',0.0450,'punnet',true,'100g','punnet',4.50,now()-interval '2 days',false,'Garden Gate Produce',100,'g'),
  ('P0034','Lemons loose','','FRUIT & VEG','Fruit','ea',0.6500,'each',true,'each','each',0.65,now()-interval '2 days',false,'Garden Gate Produce',1,'ea'),
  ('P0035','Mesclun mix 500g','','FRUIT & VEG','Salad','g',0.0210,'bag',true,'500g','bag',10.50,now()-interval '2 days',false,'Garden Gate Produce',500,'g'),
  ('P0036','Burger bun brioche','Millhouse','BAKERY','Buns','ea',0.7800,'each',true,'pack 24','pack',18.72,now()-interval '3 days',false,'Millhouse Bakery',24,'ea'),
  ('P0037','Ciabatta roll','Millhouse','BAKERY','Buns','ea',0.9200,'each',true,'pack 20','pack',18.40,now()-interval '3 days',false,'Millhouse Bakery',20,'ea'),
  ('P0038','Mayonnaise 4L','Pantryman','CONDIMENTS','Sauces','ml',0.0053,'pail',true,'4L','pail',21.20,now()-interval '35 days',false,'Northern Provisions',4,'l'),
  ('P0039','Tomato sauce 4L','Pantryman','CONDIMENTS','Sauces','ml',0.0038,'pail',true,'4L','pail',15.20,now()-interval '35 days',false,'Northern Provisions',4,'l'),
  ('P0040','Wholegrain mustard 2.5kg','Pantryman','CONDIMENTS','Sauces','g',0.0117,'tub',true,'2.5kg','tub',29.25,now()-interval '35 days',false,'Northern Provisions',2.5,'kg'),
  -- non-food: `is_food=false` keeps these OUT of the food-cost average. A seed
  -- without them cannot catch a change that starts counting cleaning chemicals
  -- as an ingredient cost.
  ('P0041','Dishwash liquid 5L','Brightwash','CLEANING & JANITORIAL','Detergent','ml',0.0046,'bottle',false,'5L','bottle',23.00,now()-interval '28 days',false,'Northern Provisions',5,'l'),
  ('P0042','Blue roll 2ply','Brightwash','CLEANING & JANITORIAL','Paper','ea',3.4000,'roll',false,'pack 6','pack',20.40,now()-interval '28 days',false,'Northern Provisions',6,'ea'),
  ('P0043','Takeaway container 750ml','Packrite','PACKAGING','Containers','ea',0.2400,'each',false,'carton 500','carton',120.00,now()-interval '50 days',false,'Northern Provisions',500,'ea'),
  -- Unlinked on purpose: P0044, P0045, P0046 and P0048 have no kitchen ingredient
  -- pointing at them, so `renderKingProgress` shows "Set up from products" and the
  -- Ingredients header carries two actions, exactly as Max's catalogue makes it.
  -- ⚠️ P0045 and P0046 ARE referenced, but by legacy `{pid,qty}` PLATE LINES rather
  -- than by an ingredient. That combination is the case `productRefs(pid)` exists
  -- for — it checks ingredient->pid AND plate-line->pid, and deleting either of
  -- these two must refuse on the second path alone. P0047 below is linked (K0020).
  ('P0044','Halloumi 1kg','Creamery','EGGS & DAIRY','Cheese','g',0.0248,'block',true,'1kg','block',24.80,now()-interval '12 days',false,'Northern Provisions',1,'kg'),
  ('P0045','Chorizo cured 1kg','Hillside','MEATS','Smallgoods','g',0.0289,'pack',true,'1kg','pack',28.90,now()-interval '6 days',false,'Meadowbrook Foods',1,'kg'),
  ('P0046','Feta Danish style 2kg','Creamery','EGGS & DAIRY','Cheese','g',0.0163,'tub',true,'2kg','tub',32.60,now()-interval '12 days',false,'Northern Provisions',2,'kg'),
  ('P0047','Kumara orange 10kg','','FRUIT & VEG','Vegetables','g',0.0038,'sack',true,'10kg','sack',38.00,now()-interval '8 days',false,'Garden Gate Produce',10,'kg'),
  ('P0048','Maple syrup 1L','Sunfield','CONDIMENTS','Syrups','ml',0.0247,'bottle',true,'1L','bottle',24.70,now()-interval '30 days',false,'Northern Provisions',1,'l'),
  -- two CUSTOM products. `CX*` ids and `is_custom=true` are how a hand-added
  -- product differs from an invoice-imported one, and `is_custom` round-trips
  -- through the row boundary rather than being derived, so it has to be seeded.
  ('CXstg000001','House pickle mix (made in-house)','','CONDIMENTS','Pickles','g',0.0074,'manual',true,'2kg batch','batch',14.80,now()-interval '14 days',true,'',2,'kg'),
  ('CXstg000002','Sourdough starter discard','','BAKERY','Bread','g',0.0009,'manual',true,'1kg','batch',0.90,now()-interval '14 days',true,'',1,'kg');

-- ---------------------------------------------------------------------------
-- MENUS
-- `MENU_ORIGINAL` is kept as a LEGACY id, and the reason has changed as of 184.
-- It used to be what `ensureDefaultMenu` seeded. It no longer is — that function
-- now mints `uid('MENU')`, because a hard-coded id is the one value two cafes
-- could collide on. Production still carries a row with this id (it predates the
-- code), so staging keeps one too: it is the shape a long-lived install actually
-- has, and it is the only place the old id is still exercised.
-- A NEW cafe's first menu looks like `MENU-<random>` — see 02-seed-empty.sql,
-- which produces the zero state where the app mints one for itself.
-- ---------------------------------------------------------------------------
insert into public.menus (id, name, season, created_at) values
  ('MENU_ORIGINAL','All day','',            now()-interval '400 days'),
  ('m-stg-winter', 'Winter specials','Winter', now()-interval '60 days');

-- ---------------------------------------------------------------------------
-- PLATES
--
-- `menu_id` is left NULL on every row. That is not laziness: `plates.menu_id`
-- is the LEGACY foreign key that nothing reads (CLAUDE.md, "Three foreign keys"),
-- and `plateToRow` already omits it — a seed that populated it would rehearse a
-- shape the app never writes and would break the restore's insert order.
-- The real plate<->dish link is `menu_items.plate_id`, set below.
--
-- ⚠️ Line shapes, deliberately mixed — see the header. `{kid,qty}` is current,
-- `{pid,qty}` and `{misc,label,cost}` are legacy-but-live.
-- ---------------------------------------------------------------------------
insert into public.plates (id, name, menu_id, lines, category, updated_at) values
  ('PLstg01','Bacon and eggs on sourdough', null,
    '[{"kid":"K0001","qty":120},{"kid":"K0002","qty":2},{"kid":"K0003","qty":160},{"kid":"K0009","qty":12}]'::jsonb,
    'Breakfast', now()-interval '30 days'),
  ('PLstg02','Smashed avocado', null,
    '[{"kid":"K0002","qty":1},{"kid":"K0003","qty":160},{"kid":"K0016","qty":30},{"kid":"K0011","qty":1}]'::jsonb,
    'Breakfast', now()-interval '28 days'),
  ('PLstg03','Eggs benedict', null,
    '[{"kid":"K0002","qty":2},{"kid":"K0003","qty":120},{"kid":"K0001","qty":80},{"kid":"K0009","qty":40},
      {"misc":true,"label":"Hollandaise (batch allowance)","cost":1.15}]'::jsonb,
    'Breakfast', now()-interval '26 days'),
  ('PLstg04','Steak sandwich', null,
    '[{"kid":"K0006","qty":220},{"kid":"K0014","qty":1},{"kid":"K0013","qty":40},{"kid":"K0004","qty":30},
      {"pid":"P0040","qty":15}]'::jsonb,
    'Lunch', now()-interval '24 days'),
  ('PLstg05','Beef burger', null,
    '[{"kid":"K0006","qty":180},{"kid":"K0015","qty":1},{"kid":"K0005","qty":40},{"kid":"K0012","qty":25},
      {"kid":"K0010","qty":150},{"pid":"P0038","qty":20}]'::jsonb,
    'Lunch', now()-interval '22 days'),
  ('PLstg06','Chicken caesar', null,
    '[{"kid":"K0007","qty":180},{"kid":"K0013","qty":80},{"kid":"K0005","qty":25},{"kid":"K0001","qty":40},
      {"misc":true,"label":"Caesar dressing","cost":0.85}]'::jsonb,
    'Lunch', now()-interval '21 days'),
  ('PLstg07','Fish and chips', null,
    '[{"kid":"K0008","qty":200},{"kid":"K0010","qty":250},{"kid":"K0018","qty":1},
      {"misc":true,"label":"Batter and fry oil","cost":0.62}]'::jsonb,
    'Lunch', now()-interval '20 days'),
  ('PLstg08','Garlic prawn linguine', null,
    '[{"kid":"K0017","qty":140},{"kid":"K0016","qty":25},{"kid":"K0019","qty":30},
      {"misc":true,"label":"Linguine 120g","cost":0.94}]'::jsonb,
    'Dinner', now()-interval '18 days'),
  ('PLstg09','Roast kumara salad', null,
    '[{"kid":"K0020","qty":200},{"kid":"K0013","qty":60},{"kid":"K0016","qty":20},{"pid":"P0046","qty":40}]'::jsonb,
    'Lunch', now()-interval '16 days'),
  ('PLstg10','Chocolate brownie', null,
    '[{"kid":"K0021","qty":45},{"kid":"K0022","qty":40},{"kid":"K0004","qty":35},{"kid":"K0002","qty":1},
      {"kid":"K0023","qty":30}]'::jsonb,
    'Desserts', now()-interval '15 days'),
  ('PLstg11','Flat white', null,
    '[{"kid":"K0024","qty":18},{"kid":"K0025","qty":180}]'::jsonb,
    'Drinks', now()-interval '12 days'),
  ('PLstg12','Winter beef ragu', null,
    '[{"kid":"K0006","qty":200},{"kid":"K0012","qty":60},{"kid":"K0011","qty":80},{"kid":"K0016","qty":20},
      {"misc":true,"label":"Red wine and stock","cost":1.40}]'::jsonb,
    'Dinner', now()-interval '10 days'),
  ('PLstg13','Kumara and chorizo hash', null,
    '[{"pid":"P0047","qty":220},{"pid":"P0045","qty":70},{"kid":"K0002","qty":1},{"kid":"K0012","qty":30}]'::jsonb,
    'Breakfast', now()-interval '8 days'),
  -- UNPUBLISHED on purpose: a plate that exists in the library and sits on no
  -- menu is a legitimate and common state, and the Plates screen has to show it.
  ('PLstg14','Test bench — sticky date pudding', null,
    '[{"kid":"K0021","qty":60},{"kid":"K0022","qty":55},{"kid":"K0004","qty":45},
      {"misc":true,"label":"Dates and butterscotch","cost":1.75}]'::jsonb,
    'Desserts', now()-interval '4 days');

-- ---------------------------------------------------------------------------
-- DISHES (menu_items — `rowToMenu` maps a DISH despite its name, CLAUDE.md)
--
-- ⚠️ `plate_id` is the canonical link; `source_plate_id` mirrors it because v54
-- clients still read that column, and the app writes BOTH. A seed that set only
-- one would rehearse a row shape the app never produces.
--
-- PLstg01 and PLstg05 are each published to BOTH menus — two dishes, one plate,
-- different sell prices. That is the many-to-many case and the reason the
-- dashboard headline counts per publication.
-- ---------------------------------------------------------------------------
insert into public.menu_items (id, section, name, price, notes, is_custom, menu_id, plate_id, source_plate_id, updated_at) values
  ('d-stg-01','Breakfast','Bacon and eggs on sourdough', 19.50,null,false,'MENU_ORIGINAL','PLstg01','PLstg01',now()-interval '30 days'),
  ('d-stg-02','Breakfast','Smashed avocado',            18.00,null,false,'MENU_ORIGINAL','PLstg02','PLstg02',now()-interval '28 days'),
  ('d-stg-03','Breakfast','Eggs benedict',              21.00,null,false,'MENU_ORIGINAL','PLstg03','PLstg03',now()-interval '26 days'),
  ('d-stg-04','Lunch',    'Steak sandwich',             26.00,null,false,'MENU_ORIGINAL','PLstg04','PLstg04',now()-interval '24 days'),
  ('d-stg-05','Lunch',    'Beef burger',                24.00,null,false,'MENU_ORIGINAL','PLstg05','PLstg05',now()-interval '22 days'),
  ('d-stg-06','Lunch',    'Chicken caesar',             22.50,null,false,'MENU_ORIGINAL','PLstg06','PLstg06',now()-interval '21 days'),
  ('d-stg-07','Lunch',    'Fish and chips',             27.00,null,false,'MENU_ORIGINAL','PLstg07','PLstg07',now()-interval '20 days'),
  ('d-stg-08','Dinner',   'Garlic prawn linguine',      29.00,null,false,'MENU_ORIGINAL','PLstg08','PLstg08',now()-interval '18 days'),
  ('d-stg-09','Lunch',    'Roast kumara salad',         19.00,null,false,'MENU_ORIGINAL','PLstg09','PLstg09',now()-interval '16 days'),
  ('d-stg-10','Desserts', 'Chocolate brownie',          12.00,null,false,'MENU_ORIGINAL','PLstg10','PLstg10',now()-interval '15 days'),
  ('d-stg-11','Drinks',   'Flat white',                  5.50,null,false,'MENU_ORIGINAL','PLstg11','PLstg11',now()-interval '12 days'),
  ('d-stg-12','Breakfast','Kumara and chorizo hash',    20.00,null,false,'MENU_ORIGINAL','PLstg13','PLstg13',now()-interval '8 days'),
  -- Winter specials. Note the two shared plates carry DIFFERENT prices here.
  ('d-stg-13','Dinner',   'Winter beef ragu',           28.50,null,false,'m-stg-winter','PLstg12','PLstg12',now()-interval '10 days'),
  ('d-stg-14','Lunch',    'Beef burger',                25.50,'Winter menu price',false,'m-stg-winter','PLstg05','PLstg05',now()-interval '9 days'),
  ('d-stg-15','Breakfast','Bacon and eggs on sourdough',20.50,null,false,'m-stg-winter','PLstg01','PLstg01',now()-interval '9 days'),
  ('d-stg-16','Desserts', 'Chocolate brownie',          13.00,null,false,'m-stg-winter','PLstg10','PLstg10',now()-interval '7 days'),
  -- a CUSTOM dish: priced on the menu with no plate behind it. `plate_id` null
  -- and `is_custom` true is the uncosted-dish state the Menu screen flags.
  ('d-stg-17','Sides',    'Bowl of fries',               9.00,'No recipe attached',true,'MENU_ORIGINAL',null,null,now()-interval '5 days');

-- ---------------------------------------------------------------------------
-- SUPPLIER MEMORY (taught packs)
--
-- ⚠️ `id` is CONTENT-DERIVED in production, which is exactly the collision the
-- "Unique ID generation" queue item exists to fix — reproduced here rather than
-- corrected, because staging's job is to rehearse what production IS. `memKey`
-- keys off the supplier NAME, so a supplier rename must re-key these
-- (`tidySupplierMemMigration`); two suppliers below share a phrase on purpose so
-- a rename bug has something to break.
-- ---------------------------------------------------------------------------
insert into public.supplier_phrases (id, supplier, phrase_norm, qty, unit, updated_at) values
  ('sp-stg-1','Meadowbrook Foods','2kg pack',        2,   'kg', now()-interval '40 days'),
  ('sp-stg-2','Meadowbrook Foods','5kg pack',        5,   'kg', now()-interval '40 days'),
  ('sp-stg-3','Northern Provisions','4l tin',        4,   'l',  now()-interval '35 days'),
  ('sp-stg-4','Northern Provisions','5kg block',     5,   'kg', now()-interval '35 days'),
  ('sp-stg-5','Garden Gate Produce','10kg sack',    10,   'kg', now()-interval '30 days'),
  ('sp-stg-6','Millhouse Bakery','pack 24',         24,   'ea', now()-interval '25 days'),
  ('sp-stg-7','Harbour Seafoods','1kg bag',          1,   'kg', now()-interval '20 days'),
  ('sp-stg-8','Ironbark Coffee','1kg bag',           1,   'kg', now()-interval '15 days');

-- ---------------------------------------------------------------------------
-- SETTINGS AND KITCHEN WORDS
--
-- ⚠️ These are `app_settings` JSON BLOBS keyed by setting name, not tables.
-- CLAUDE.md: "their boundary is the SETTING KEY, not a column list." All nine
-- keys production carries are written, so a reader that assumes a key exists
-- behaves the same here.
--
-- `kitchen_ingredients` is the UI's "Ingredients": each links to exactly ONE
-- product. K0001 upward, zero-padded, because `nextKid()` scans the live array.
-- Two of them point at CX* custom products, which is a real and easily-missed case.
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, updated_at) values
  ('kitchen_ingredients', '[
     {"id":"K0001","name":"Bacon",          "pid":"P0001"},
     {"id":"K0002","name":"Eggs",           "pid":"P0002"},
     {"id":"K0003","name":"Sourdough",      "pid":"P0003"},
     {"id":"K0004","name":"Butter",         "pid":"P0004"},
     {"id":"K0005","name":"Cheddar",        "pid":"P0005"},
     {"id":"K0006","name":"Beef",           "pid":"P0012"},
     {"id":"K0007","name":"Chicken breast", "pid":"P0013"},
     {"id":"K0008","name":"Salmon",         "pid":"P0014"},
     {"id":"K0009","name":"Hollandaise base","pid":"P0024"},
     {"id":"K0010","name":"Fries",          "pid":"P0011"},
     {"id":"K0011","name":"Tomato",         "pid":"P0007"},
     {"id":"K0012","name":"Red onion",      "pid":"P0009"},
     {"id":"K0013","name":"Mesclun",        "pid":"P0035"},
     {"id":"K0014","name":"Ciabatta",       "pid":"P0037"},
     {"id":"K0015","name":"Brioche bun",    "pid":"P0036"},
     {"id":"K0016","name":"Olive oil",      "pid":"P0016"},
     {"id":"K0017","name":"Prawns",         "pid":"P0015"},
     {"id":"K0018","name":"Lemon",          "pid":"P0034"},
     {"id":"K0019","name":"Basil",          "pid":"P0033"},
     {"id":"K0020","name":"Kumara",         "pid":"P0047"},
     {"id":"K0021","name":"Flour",          "pid":"P0019"},
     {"id":"K0022","name":"Caster sugar",   "pid":"P0020"},
     {"id":"K0023","name":"Dark chocolate", "pid":"P0022"},
     {"id":"K0024","name":"Espresso beans", "pid":"P0026"},
     {"id":"K0025","name":"Milk",           "pid":"P0025"},
     {"id":"K0026","name":"House pickle",   "pid":"CXstg000001"},
     {"id":"K0027","name":"Starter discard","pid":"CXstg000002"}
   ]'::jsonb, now()),
  ('food_cost_target',    '30'::jsonb,        now()),
  ('gst_default',         '"ex"'::jsonb,      now()),
  ('ai_invoice_check',    'true'::jsonb,      now()),
  ('ai_suggestions',      'true'::jsonb,      now()),
  ('suggest_fab_hidden',  '"0"'::jsonb,       now()),
  ('last_invoice_import', to_jsonb((now()-interval '3 days')::text), now()),
  -- tombstones. Non-empty on purpose: an id in `deleted_prod_ids` must NOT come
  -- back on the next sync, and an empty array cannot demonstrate that.
  ('deleted_menu_ids',    '["m-stg-retired-2025"]'::jsonb, now()),
  ('deleted_prod_ids',    '["P9001","P9002"]'::jsonb,      now()),
  -- three products skipped in the setup wizard. `renderKingProgress` keeps the
  -- button visible while skips exist so the Unskip list is never stranded.
  ('king_wiz_skips',      '["P0041","P0042","P0043"]'::jsonb, now());

-- ---------------------------------------------------------------------------
-- HISTORY — five series, deliberately separate (CLAUDE.md). Generated rather
-- than listed so the shape is auditable at a glance.
--
-- ⚠️ `menu_change_log` records what MAX did; the other four record what a
-- SUPPLIER did. A supplier price movement must never appear in the change log —
-- so the rows below are menu/plate edits only, never a drift.
-- ---------------------------------------------------------------------------

-- per-product cost drift: 6 monthly points per food product, walking ±6% around
-- today's stored cost, ending exactly ON it so the newest point agrees with the
-- product row. Unique (product_id, recorded_at) is respected by construction.
insert into public.ing_price_history (product_id, recorded_at, cost_per_base_unit)
select i.id,
       date_trunc('day', now()) - (g * interval '30 days'),
       round((i.cost_per_base_unit * (1 - (g * 0.012)))::numeric, 6)
  from public.ingredients i
  cross join generate_series(0, 5) g
 where i.is_food
   and i.cost_per_base_unit is not null;

-- per-dish sell-price log: one point per dish per published price, plus one
-- earlier point on the four dishes that have had a rise.
insert into public.menu_price_history (menu_item_id, recorded_at, price)
select m.id, m.updated_at, m.price from public.menu_items m where m.price is not null
union all
select m.id, m.updated_at - interval '120 days', round((m.price * 0.92)::numeric, 2)
  from public.menu_items m where m.id in ('d-stg-01','d-stg-05','d-stg-07','d-stg-10');

-- the ALL-MENUS average food-cost series the dashboard chart reads. 18 monthly
-- points drifting from 34% down to 29%, i.e. crossing the 30% target — which is
-- what makes the chart's colour anchoring visible (green at or under target,
-- red over; NOT green-when-improving, CLAUDE.md).
insert into public.price_history (recorded_at, avg_food_cost_pct, menu_id)
select date_trunc('day', now()) - (g * interval '30 days'),
       round((29.0 + g * 0.3)::numeric, 2),
       null
  from generate_series(0, 17) g;

-- and a per-menu series for each menu, so scope switching has something to show.
insert into public.price_history (recorded_at, avg_food_cost_pct, menu_id)
select date_trunc('day', now()) - (g * interval '30 days'),
       round((28.4 + g * 0.28)::numeric, 2), 'MENU_ORIGINAL'
  from generate_series(0, 17) g
union all
select date_trunc('day', now()) - (g * interval '30 days'),
       round((31.6 + g * 0.22)::numeric, 2), 'm-stg-winter'
  from generate_series(0, 11) g;

-- what Max did. `kind` alone does not answer "did this move menus" — the move
-- lives in detail.menuFrom / detail.menuTo, so the last row below carries both.
insert into public.menu_change_log (id, recorded_at, kind, plate_id, dish_id, menu_ids, avg_before, avg_after, cost_before, cost_after, detail) values
  ('chg-stg-1', now()-interval '22 days','dish_price','PLstg05','d-stg-05','{MENU_ORIGINAL}',31.2,30.6,7.34,7.34,'{"priceFrom":22.00,"priceTo":24.00}'::jsonb),
  ('chg-stg-2', now()-interval '20 days','plate_edit','PLstg07','d-stg-07','{MENU_ORIGINAL}',30.6,30.9,8.02,8.31,'{"note":"heavier fish portion"}'::jsonb),
  ('chg-stg-3', now()-interval '15 days','publish',   'PLstg10','d-stg-10','{MENU_ORIGINAL}',30.9,30.7,3.44,3.44,'{"menuTo":"MENU_ORIGINAL"}'::jsonb),
  ('chg-stg-4', now()-interval '10 days','publish',   'PLstg12','d-stg-13','{m-stg-winter}', 30.7,30.4,9.11,9.11,'{"menuTo":"m-stg-winter"}'::jsonb),
  ('chg-stg-5', now()-interval  '9 days','dish_price','PLstg05','d-stg-14','{MENU_ORIGINAL,m-stg-winter}',30.4,30.1,7.34,7.34,'{"priceFrom":24.00,"priceTo":25.50,"menuFrom":"MENU_ORIGINAL","menuTo":"m-stg-winter"}'::jsonb);

select 'realistic seed loaded' as result,
       (select count(*) from public.ingredients)         as products,
       (select count(*) from public.ingredients where is_food) as food_products,
       (select jsonb_array_length(value) from public.app_settings where key='kitchen_ingredients') as kitchen_ingredients,
       (select count(*) from public.menus)               as menus,
       (select count(*) from public.plates)              as plates,
       (select count(*) from public.menu_items)          as dishes,
       (select count(distinct plate_id) from public.menu_items where plate_id is not null) as published_plates,
       (select count(*) from public.supplier_phrases)    as taught_packs,
       (select count(*) from public.ing_price_history)   as ing_price_points,
       (select count(*) from public.menu_price_history)  as dish_price_points,
       (select count(*) from public.price_history)       as avg_points,
       (select count(*) from public.menu_change_log)     as change_log;
