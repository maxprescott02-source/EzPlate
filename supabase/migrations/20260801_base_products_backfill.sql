-- v108 — BASE_PRODUCTS moves into the products table. Generated, not hand-written.
--
-- WHY
-- Until now the catalogue lived in TWO places: 393 rows hardcoded in js/app.js line 3
-- (`BASE_PRODUCTS`, 132 KB), and a server `ingredients` table holding only the DELTAS on
-- top of it. Verified against production 1 Aug 2026: `ingredients` holds 120 rows against
-- 412 live products. **293 of Max's products exist nowhere but the JS literal.**
--
-- The online-only batch makes Supabase the source of truth. It cannot do that while most of
-- the catalogue is a constant in the client. This migration is the missing 293 rows, plus the
-- 98 already-edited base rows re-stated so the file is a complete, self-contained statement of
-- the base catalogue.
--
-- THE SAFETY PROPERTY, AND IT IS THE WHOLE DESIGN:
--
--   on conflict (id) do nothing
--
-- Every row already in `ingredients` is a row MAX HAS EDITED — an imported invoice price, a
-- taught pack, a renamed supplier. Those are ground truth. The values below are the shipped
-- literal, which for those 98 ids is STALE BY DEFINITION. `do nothing` means the literal fills
-- gaps and never overwrites. An `on conflict do update` here would silently roll 98 products
-- back to their factory prices in a costing app — the exact failure class CLAUDE.md hard rule 9
-- exists to prevent. Do not "improve" this into an upsert.
--
-- SAFE TO APPLY BEFORE THE CODE SHIPS — checked, not assumed. Under the currently deployed
-- v107, `bootstrapSync` reads every `ingredients` row into `overrides` and `rebuild()` merges
-- them over `BASE_PRODUCTS`. After this migration those merges are value-for-value identical to
-- the base rows they cover, so `rebuild()` produces the same 412 products it does today. The
-- one tombstoned product (`Umrzbztwn`, a CUSTOM id, still filtered by `deleted_prod_ids`) is
-- untouched: it is not in the literal and not in this file. v107 keeps working unchanged either
-- way, which is what lets the migration land first and be verified on its own.
--
-- Values are generated directly from the literal through `ingredientToRow`'s exact mapping
-- (js/app.js:41-50) — same null handling, same `is_food !== false`, same empty-array default
-- for `search_aliases`. `is_custom` is false for all 393: these ARE the base catalogue.
--
-- `search_aliases` is **jsonb**, written here as '["pie"]'::jsonb. The first cut of this file
-- used `array[...]::text[]` and failed on the first row: 42804, "column search_aliases is of
-- type jsonb but expression is of type text[]". Worth recording because the two are
-- indistinguishable over the REST API — PostgREST renders a text[] and a jsonb array as the
-- same JSON, so the column type cannot be read off a normal query, only off the error or the
-- schema. Every other column here takes a plain quoted string, a bare number, a bare boolean
-- or null, so no other cast is in play: `price_as_of`, `pack_qty`, `pack_unit` and `supplier`
-- are null on all 393 base rows (the literal has no such fields), which is checked, not assumed.
--
-- EIGHT ROWS HAVE THEIR `base_unit` COERCED TO NULL, and that needs stating plainly.
--
-- The table enforces `check (base_unit = any (array['g','ml','ea']))`. The literal carries two
-- values the server has never seen, because these products were never edited and so were never
-- pushed: `unknown` (P0115 Chorizo, P0122 Container, P0182 Ham Leg Sliced, P0279 Syrup Pump)
-- and `dim` (P0120 Clingwrap, P0169 Foil, P0260/P0261 Baking Paper). A CHECK passes on NULL —
-- it only fails on FALSE — so null is the value that satisfies the constraint without asserting
-- a unit nobody knows.
--
-- Behaviour-neutral, checked rather than assumed:
--   * All 8 have `cost_per_base_unit` NULL. Zero of them carry a cost, so no cost changes.
--   * Nothing in js/app.js reads `'dim'` or `'unknown'` as a base_unit — grepped. Every unit
--     display path (`unitNoun`, `displayUnitWord`, `unitCostStr`) already falls through its
--     else branch for both values, and `unitCostStr` short-circuits on the null cost anyway.
--   * `cost_basis` keeps its literal value, "needs review", which is where the information
--     that these need attention actually lives. That column has no constraint.
--
-- They are NOT dropped from this file, deliberately. P0182 "Ham Leg Sliced 2Mm" is the product
-- behind the kitchen ingredient "Ham Leg" (K0058), which the plate "Cheese & Ham Toastie GF"
-- uses. Omitting these 8 would leave that ingredient pointing at nothing — which is exactly the
-- dangling reference the v108 delete guard exists to prevent. (That plate is under-costed today
-- because the product has no price; that is a data-entry issue for Max, not a migration one.)
--
-- Stamp of the literal this was generated from: 393 rows, FNV-1a be5e0fbe.
-- If that hash has moved, this file is stale — regenerate it, do not run it.
--
-- APPLY THIS IN THE SQL EDITOR. Idempotent: safe to run twice, and safe to re-run after any
-- number of price edits.

insert into public.ingredients (
  id, description, brand, category, sub_category, item_type,
  base_unit, cost_per_base_unit, cost_basis, is_food,
  pack_size_raw, sold_by, current_price_exgst, price_as_of,
  search_aliases, supplier, pack_qty, pack_unit, is_custom
) values
  ('P0001', 'Apple Pie Grannys Pre Cut 16''S 1-003', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', 'pie', 'g', 0.02478, '$/g', true, '2 KG', 'each', 49.56, null, '["pie"]'::jsonb, null, null, null, false),
  ('P0002', 'Apple Sliced Pie', 'Heinz Watties', 'BAKING SUPPLIES', 'Fruit Pie Fillings', 'pie', 'g', 0.00564, '$/g', true, '2.7 KG', 'can', 15.22, null, '["pie"]'::jsonb, null, null, null, false),
  ('P0003', 'Apple Sliced Pie Granny Smith Bakers Choice', 'Spc', 'BAKING SUPPLIES', 'Fruit Pie Fillings', 'pie', 'g', 0.00573, '$/g', true, '2.75 KG', 'can', 15.75, null, '["pie"]'::jsonb, null, null, null, false),
  ('P0004', 'Bacon Middle Rindless Gas Flushed (Qld)', 'Caterers Choice', 'SMALLGOODS', 'Bacon Rashers', 'bacon', 'g', 0.0122, '$/g', true, '2.5 KG', 'packet', 30.5, null, '["bacon","rasher"]'::jsonb, null, null, null, false),
  ('P0005', 'Bags Garbage Prem 72-80Lt Black', 'Cater Clean', 'CLEANING & JANITORIAL', 'Bins And Bin Liners', null, 'ea', 0.1984, '$/unit', false, '25''S', 'packet', 4.96, null, '[]'::jsonb, null, null, null, false),
  ('P0006', 'Bags Paper 4 Flat White', 'Ozbag', 'PACKAGING', 'White Paper Bags', null, 'ea', 0.0393, '$/unit', false, '500''S', 'bundle', 19.64, null, '[]'::jsonb, null, null, null, false),
  ('P0007', 'Baked Beans', 'Sandhurst', 'READY MEALS', 'Baked Beans & Spaghetti', 'baked beans', 'g', 0.00333, '$/g', true, '2.7 KG', 'can', 8.98, null, '["baked beans"]'::jsonb, null, null, null, false),
  ('P0008', 'Baked Beans In Tomato Sauce', 'Alfinas', 'READY MEALS', 'Baked Beans & Spaghetti', 'baked beans', 'g', 0.00305, '$/g', true, '2.7 KG', 'can', 8.23, null, '["baked beans"]'::jsonb, null, null, null, false),
  ('P0009', 'Baking Powder', 'Caterers Choice', 'BAKING SUPPLIES', 'Baking Powder', null, 'g', 0.00978, '$/g', true, '2 KG', 'packet', 19.55, null, '[]'::jsonb, null, null, null, false),
  ('P0010', 'Barramundi Flt 100/200 S/Less', 'Seacrest', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.01657, '$/g', true, '5 KG', 'carton', 82.83, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0011', 'Barramundi Flt 100/200 S/Less (I)', 'Seacrest', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.01657, '$/g', true, '5 KG', 'carton', 82.83, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0012', 'Basa Flt 140/170 Shatter Pack S&B (I)', 'Seafrost', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.00761, '$/g', true, '5 KG', 'carton', 38.03, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0013', 'Bay Leaves', 'Caterers Choice', 'HERBS  SPICES & SEASONINGS', 'Herbs & Spices Dried', null, 'g', 0.0518, '$/g', true, '100 GR', 'packet', 5.18, null, '[]'::jsonb, null, null, null, false),
  ('P0014', 'Beef Cube Roll 100Gr', 'Choice Cut', 'BEEF PORTIONED', 'Beef Cube/Scotch Fillet', null, 'g', 0.03086, '$/g', true, '10 X 100GR', 'packet', 30.86, null, '[]'::jsonb, null, null, null, false),
  ('P0015', 'Beef Sandwich Steak 100Gr', 'Choice Cut', 'BEEF PORTIONED', 'Beef Other', null, 'g', 0.02989, '$/g', true, '1 KG', 'packet', 29.89, null, '[]'::jsonb, null, null, null, false),
  ('P0016', 'Beetroot Sliced', 'Dewfresh', 'VEGETABLES', 'Vegetable Prepared', 'vegetable', 'g', 0.00311, '$/g', true, '3 KG', 'can', 9.32, null, '["vegetable"]'::jsonb, null, null, null, false),
  ('P0017', 'Berries Mixed Iqf', 'Caterers Choice', 'FRUIT', 'Frozen Fruit', null, 'g', 0.01013, '$/g', true, '1 KG', 'bag', 10.13, null, '[]'::jsonb, null, null, null, false),
  ('P0018', 'Biscuit Crumbs Oreo With Creme', 'Oreo', 'BISCUITS', 'Biscuit Base & Crumbs', null, 'g', 0.00989, '$/g', true, '454 GR', 'packet', 4.49, null, '[]'::jsonb, null, null, null, false),
  ('P0019', 'Biscuits Chocolate Ripple', 'Arnotts', 'BISCUITS', 'Biscuits Sweet', null, 'g', 0.01204, '$/g', true, '250 GR', 'packet', 3.01, null, '[]'::jsonb, null, null, null, false),
  ('P0020', 'Biscuits P/C Biscoff Classic Wrapped', 'Lotus', 'BISCUITS', 'Biscuits Portion Control', null, 'ea', 0.0998, '$/unit', true, '50''S', 'packet', 4.99, null, '[]'::jsonb, null, null, null, false),
  ('P0021', 'Biscuits P/C Caramelised Traditional Belgian', 'Little Bakes', 'BISCUITS', 'Biscuits Portion Control', null, 'g', 0.01738, '$/g', true, '300 X 6GR', 'carton', 31.29, null, '[]'::jsonb, null, null, null, false),
  ('P0022', 'Biscuits Vanilla Beans', 'Mother Meg''S', 'BISCUITS', 'Biscuits Sweet', null, 'g', 0.02958, '$/g', true, '500 GR', 'packet', 14.79, null, '[]'::jsonb, null, null, null, false),
  ('P0023', 'Bread Banana Pre Cut Gluten Free 1-171', 'Priestleys', 'BREAD & PASTRY', 'Sweet Bread/Rolls/Buns', 'bread', 'ea', 2.6467, '$/unit', true, '12''S', 'each', 31.76, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0024', 'Bread Buns Burger Large Gluten Free', 'Mission Foods', 'BREAD & PASTRY', 'Rolls Buns & Sticks', 'bun', 'g', 0.02565, '$/g', true, '20 X 140GR', 'carton', 71.81, null, '["bun"]'::jsonb, null, null, null, false),
  ('P0025', 'Bread Buns Burger White Vegan Gluten Free', 'La''Bakehouse Ex', 'BREAD & PASTRY', 'Rolls Buns & Sticks', 'bun', 'g', 0.02755, '$/g', true, '18 X 108GR', 'carton', 53.55, null, '["bun"]'::jsonb, null, null, null, false),
  ('P0026', 'Bread Buns Milk 4.5', 'Tip Top', 'BREAD & PASTRY', 'Rolls Buns & Sticks', 'milk', 'g', 0.01277, '$/g', true, '48 X 85GR', 'carton', 52.12, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0027', 'Bread Rolls Hot Dog 7  (9611)', 'Tip Top', 'BREAD & PASTRY', 'Rolls Buns & Sticks', 'bread', 'g', 0.0121, '$/g', true, '54 X 75GR', 'carton', 49.01, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0028', 'Bread Sliced Multigrain Foodservice', 'Tip Top', 'BREAD & PASTRY', 'Bread Loaves', 'bread', 'g', 0.00657, '$/g', true, '6 X 700GR', 'carton', 27.6, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0029', 'Bread Sliced Super Thick Raisin', 'Tip Top', 'BREAD & PASTRY', 'Sweet Bread/Rolls/Buns', 'bread', 'g', 0.01199, '$/g', true, '6 X 600GR', 'carton', 43.16, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0030', 'Bread Sliced Super Thick White', 'Tip Top', 'BREAD & PASTRY', 'Bread Loaves', 'bread', 'g', 0.00657, '$/g', true, '6 X 700GR', 'carton', 27.6, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0031', 'Bread Sliced White Foodservice', 'Tip Top', 'BREAD & PASTRY', 'Bread Loaves', 'bread', 'g', 0.00657, '$/g', true, '6 X 700GR', 'carton', 27.58, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0032', 'Bread Sliced Wholemeal Foodservice', 'Tip Top', 'BREAD & PASTRY', 'Bread Loaves', 'bread', 'g', 0.00633, '$/g', true, '6 X 700GR', 'carton', 26.57, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0033', 'Bread Sourdough Endless Sliced Vegan', 'Flourshop', 'BREAD & PASTRY', 'Bread Sourdough', 'sourdough', 'g', 0.00692, '$/g', true, '9 X 900GR', 'carton', 56.09, null, '["sourdough"]'::jsonb, null, null, null, false),
  ('P0034', 'Bread Sourdough Sliced Cafe Style', 'Bakers Maison', 'BREAD & PASTRY', 'Bread Sourdough', 'sourdough', 'g', 0.00438, '$/g', true, '8 X 1.2KG', 'carton', 42, null, '["sourdough"]'::jsonb, null, null, null, false),
  ('P0035', 'Bread Turkish Long', 'Nomad Breads', 'BREAD & PASTRY', 'Bread Turkish', 'bread', 'g', 0.00668, '$/g', true, '12 X 450GR', 'carton', 36.08, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0036', 'Bread White Gluten Free', 'Abbotts', 'BREAD & PASTRY', 'Bread Loaves', 'bread', 'g', 0.02071, '$/g', true, '6 X 500GR', 'carton', 62.12, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0037', 'Breadcrumbs Coarse', 'Caterers Choice', 'BAKING SUPPLIES', 'Breadcrumbs', 'bread', 'g', 0.00315, '$/g', true, '10 KG', 'bag', 31.54, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0038', 'Breadcrumbs Fine', 'Caterers Choice', 'BAKING SUPPLIES', 'Breadcrumbs', 'bread', 'g', 0.00317, '$/g', true, '10 KG', 'bag', 31.72, null, '["bread"]'::jsonb, null, null, null, false),
  ('P0039', 'Buns Burger Potato 4.5  Sliced', 'Tip Top', 'BREAD & PASTRY', 'Rolls Buns & Sticks', 'bun', 'g', 0.01307, '$/g', true, '48 X 85GR', 'carton', 53.33, null, '["bun"]'::jsonb, null, null, null, false),
  ('P0040', 'Burger Patties Beef Angus Frz', 'Bounty Premium', 'SAUSAGES  HOT DOGS & PATTIES', 'Burger Patties - Beef', 'patty', 'g', 0.01426, '$/g', true, '36 X 150GR', 'carton', 76.99, null, '["patty","pattie","burger"]'::jsonb, null, null, null, false),
  ('P0041', 'Burger Patties Beef Gourmet Gluten Free', 'Angel Bay', 'SAUSAGES  HOT DOGS & PATTIES', 'Burger Patties - Beef', 'patty', 'g', 0.01443, '$/g', true, '60 X 120GR', 'carton', 103.91, null, '["patty","pattie","burger"]'::jsonb, null, null, null, false),
  ('P0042', 'Burger Patties Beef Par Cooked Homestyle', 'Angel Bay', 'SAUSAGES  HOT DOGS & PATTIES', 'Burger Patties - Beef', 'patty', 'g', 0.01406, '$/g', true, '22 X 120GR', 'sleeve', 37.12, null, '["patty","pattie","burger"]'::jsonb, null, null, null, false),
  ('P0043', 'Burger Patties Breakfast Beef Sausage Par Cook', 'Angel Bay', 'SAUSAGES  HOT DOGS & PATTIES', 'Burger Patties - Beef', 'patty', 'g', 0.01664, '$/g', true, '80 X 50GR', 'carton', 66.55, null, '["patty","pattie","burger"]'::jsonb, null, null, null, false),
  ('P0044', 'Burger Patties Breakfast Sausage', 'Butlers', 'SAUSAGES  HOT DOGS & PATTIES', 'Burger Patties - Beef', 'patty', 'g', 0.01993, '$/g', true, '81 X 45GR', 'carton', 72.65, null, '["patty","pattie","burger"]'::jsonb, null, null, null, false),
  ('P0045', 'Burger Patties Vegetable', 'I & J', 'SAUSAGES  HOT DOGS & PATTIES', 'Burger Patties - Other', 'patty', 'g', 0.01252, '$/g', true, '36 X 113.5GR', 'carton', 51.17, null, '["patty","pattie","burger"]'::jsonb, null, null, null, false),
  ('P0046', 'Butter P/C', 'Lurpak', 'DAIRY', 'Butter Portion Control', 'butter', 'g', 0.02256, '$/g', true, '100 X 8GR', 'tray', 18.05, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0047', 'Butter Salted', 'Yarde Farm', 'DAIRY', 'Butter', 'butter', 'g', 0.01548, '$/g', true, '500 GR', 'pat', 7.74, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0048', 'Butter Unsalted', 'Yarde Farm', 'DAIRY', 'Butter', 'butter', 'g', 0.01646, '$/g', true, '1.5 KG', 'block', 24.69, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0049', 'Cajun Spice', 'Caterers Choice', 'HERBS  SPICES & SEASONINGS', 'Herbs & Spices Dried', null, 'g', 0.02351, '$/g', true, '1 KG', 'packet', 23.51, null, '[]'::jsonb, null, null, null, false),
  ('P0050', 'Cake Caramel Sin Pre Cut 16''S 1-298', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.0238, '$/g', true, '2.61 KG', 'each', 62.13, null, '[]'::jsonb, null, null, null, false),
  ('P0051', 'Cake Celestial Mud Pre Cut 16''S Gluten Free 1-861', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.02178, '$/g', true, '2.85 KG', 'each', 62.06, null, '[]'::jsonb, null, null, null, false),
  ('P0052', 'Cake Chocolate Bavarian Tray', 'Sara Lee', 'DESSERTS', 'Cheesecakes & Bavarians', null, 'g', 0.0202, '$/g', true, '1.15 KG', 'tray', 23.23, null, '[]'::jsonb, null, null, null, false),
  ('P0053', 'Cake Hummingbird Pre Cut 16''S 1-238', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.02234, '$/g', true, '2.65 KG', 'each', 59.2, null, '[]'::jsonb, null, null, null, false),
  ('P0054', 'Cake Lemon Pistachio 1-750', 'Priestleys', 'DESSERTS', 'Cakes - Whole & Gateau', null, 'g', 0.0234, '$/g', true, '2.24 KG', 'each', 52.42, null, '[]'::jsonb, null, null, null, false),
  ('P0055', 'Cake Lemon Tray', 'Johnathon Jones', 'DESSERTS', 'Cake Trays', null, 'g', 0.0163, '$/g', true, '1.8 KG', 'tray', 29.34, null, '[]'::jsonb, null, null, null, false),
  ('P0056', 'Cake Nero Mud Pre Cut 16''S 1-208', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.02317, '$/g', true, '2.274 KG', 'each', 52.68, null, '[]'::jsonb, null, null, null, false),
  ('P0057', 'Cake Orange & Almond Pre Cut 16''S Gluten/Dairy Fre', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.03015, '$/g', true, '2.05 KG', 'each', 61.81, null, '[]'::jsonb, null, null, null, false),
  ('P0058', 'Cake P/C Caramel Sticky Date 1-152', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.02634, '$/g', true, '8 X 120GR', 'tray', 25.29, null, '[]'::jsonb, null, null, null, false),
  ('P0059', 'Cake P/C Caramel Sticky Date Gluten Free 1-614', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.03077, '$/g', true, '8 X 113GR', 'tray', 27.82, null, '[]'::jsonb, null, null, null, false),
  ('P0060', 'Cake P/C Carrot & Ginger Gluten Free', 'Scottish Baker', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.0258, '$/g', true, '12 X 140GR', 'tray', 43.34, null, '[]'::jsonb, null, null, null, false),
  ('P0061', 'Cake P/C Choc Brownie With Raspberry Frosting G/Fr', 'Scottish Baker', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.02574, '$/g', true, '12 X 150GR', 'tray', 46.34, null, '[]'::jsonb, null, null, null, false),
  ('P0062', 'Cake P/C Lemon With Blueberry Frosting Gluten Free', 'Scottish Baker', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.02433, '$/g', true, '12 X 150GR', 'tray', 43.8, null, '[]'::jsonb, null, null, null, false),
  ('P0063', 'Cake P/C Matcha Strawberry Gluten Free 1-619', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.03622, '$/g', true, '8 X 96GR', 'tray', 27.82, null, '[]'::jsonb, null, null, null, false),
  ('P0064', 'Cake P/C Orange & Almond Gluten & Dairy Free 1-662', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.04025, '$/g', true, '8 X 95GR', 'tray', 30.59, null, '[]'::jsonb, null, null, null, false),
  ('P0065', 'Cake P/C Pear & Walnut Gluten & Dairy Free', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.03311, '$/g', true, '8 X 115GR', 'tray', 30.46, null, '[]'::jsonb, null, null, null, false),
  ('P0066', 'Cake P/C Sticky Date Individuals', 'Perfect Portion', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.01597, '$/g', true, '40 X 80GR', 'tray', 51.09, null, '[]'::jsonb, null, null, null, false),
  ('P0067', 'Cake Pear & Raspberry Pre Cut 16''S Gluten Free', 'Homebush Cakes', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.03443, '$/g', true, '1.5 KG', 'each', 51.64, null, '[]'::jsonb, null, null, null, false),
  ('P0068', 'Cake Red Velvet Pre Cut 16''S 1-862', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.028, '$/g', true, '2.22 KG', 'each', 62.17, null, '[]'::jsonb, null, null, null, false),
  ('P0069', 'Cake Tiramisu Slice 1-321', 'Priestleys', 'DESSERTS', 'Cake Trays', null, 'g', 0.02237, '$/g', true, '1.9 KG', 'tray', 42.5, null, '[]'::jsonb, null, null, null, false),
  ('P0070', 'Cake Toppings Non Pareils', 'Windsor Farm', 'BAKING SUPPLIES', 'Cake Decorations', null, 'g', 0.01061, '$/g', true, '1 KG', 'bag', 10.61, null, '[]'::jsonb, null, null, null, false),
  ('P0071', 'Cake White Chocolate & Raspberry Tray', 'Johnathon Jones', 'DESSERTS', 'Cake Trays', null, 'g', 0.01554, '$/g', true, '2 KG', 'tray', 31.08, null, '[]'::jsonb, null, null, null, false),
  ('P0072', 'Cheese Cream Express Professional', 'Dairy Farmers', 'DAIRY', 'Cheese Cream', 'cheese', 'g', 0.00941, '$/g', true, '2 KG', 'packet', 18.81, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0073', 'Cheese Fetta Danish', 'Wombat Valley', 'DAIRY', 'Cheese Fetta', 'cheese', 'g', 0.01098, '$/g', true, '2 KG', 'bucket', 21.96, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0074', 'Cheese Halloumi Block Cyprus', 'Kalos', 'DAIRY', 'Cheese Specialty', 'cheese', 'g', 0.02355, '$/g', true, '1 KG', 'packet', 23.55, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0075', 'Cheese Haloumi Block Cyprus', 'Kalos', 'DAIRY', 'Cheese Specialty', 'cheese', 'g', 0.02355, '$/g', true, '1 KG', 'packet', 23.55, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0076', 'Cheese Mozzarella Shredded', 'Yarde Farm', 'DAIRY', 'Cheese Mozzarella', 'cheese', 'g', 0.0115, '$/g', true, '2 KG', 'packet', 23, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0077', 'Cheese Mozzarella Shredded Pizza White', 'Alfinas', 'DAIRY', 'Cheese Mozzarella', 'cheese', 'g', 0.01149, '$/g', true, '2 KG', 'packet', 22.98, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0078', 'Cheese Slices Haloumi Block Cyprus', 'Kalos', 'DAIRY', 'Cheese Specialty', 'cheese', 'g', 0.02654, '$/g', true, '1 KG', 'packet', 26.54, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0079', 'Cheese Slices Tasty 105''S', 'Yarde Farm', 'DAIRY', 'Cheese Slices & Cubes', 'cheese', 'g', 0.01419, '$/g', true, '1.5 KG', 'packet', 21.29, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0080', 'Cheese Slices Tasty 90''S', 'Yarde Farm', 'DAIRY', 'Cheese Slices & Cubes', 'cheese', 'g', 0.01411, '$/g', true, '1.5 KG', 'packet', 21.17, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0081', 'Cheese Slices Tasty Natural 90''S', 'Mainland', 'DAIRY', 'Cheese Slices & Cubes', 'cheese', 'g', 0.01547, '$/g', true, '1.5 KG', 'packet', 23.2, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0082', 'Cheesecake Caramel Swirl Pre Cut 16''S 1-736', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.0223, '$/g', true, '2.6 KG', 'each', 57.97, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0083', 'Cheesecake Chunky Chocolate Pre Cut 16''S 1-293', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.02536, '$/g', true, '2.18 KG', 'each', 55.29, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0084', 'Cheesecake Lime Swirl Pre Cut 16''S 1-281', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.0263, '$/g', true, '2.16 KG', 'each', 56.81, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0085', 'Cheesecake Mixed Berry Cream Tray', 'Sara Lee', 'DESSERTS', 'Cheesecakes & Bavarians', 'cheese', 'g', 0.01784, '$/g', true, '1.35 KG', 'tray', 24.08, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0086', 'Cheesecake P/C Blueberry 1-280', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.03791, '$/g', true, '8 X 100GR', 'tray', 30.33, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0087', 'Cheesecake P/C Cookies & Cream 1-334', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.0321, '$/g', true, '8 X 120GR', 'tray', 30.82, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0088', 'Cheesecake P/C Loaded Salted Caramel Flourless', 'Spoon Wholesale', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.0273, '$/g', true, '8 X 160GR', 'tray', 34.95, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0089', 'Cheesecake P/C New York Vanilla Flourless', 'Spoon Wholesale', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.02913, '$/g', true, '8 X 150GR', 'tray', 34.95, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0090', 'Cheesecake P/C Strawberries & Cream Flourless', 'Spoon Wholesale', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.02831, '$/g', true, '8 X 150GR', 'tray', 33.97, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0091', 'Cheesecake P/C Strawberry Tart Gluten Free 1-840', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.03981, '$/g', true, '6 X 105GR', 'tray', 25.08, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0092', 'Cheesecake Passionfruit Pre Cut 16''S 1-290', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.02202, '$/g', true, '2.5 KG', 'each', 55.04, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0093', 'Cheesecake Peach Mango Tray', 'Sara Lee', 'DESSERTS', 'Cheesecakes & Bavarians', 'cheese', 'g', 0.01784, '$/g', true, '1.35 KG', 'tray', 24.08, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0094', 'Cheesecake Raspberry New York Pre Cut 16''S 1-286', 'Priestleys', 'DESSERTS', 'Cheesecake Portioned', 'cheese', 'g', 0.02455, '$/g', true, '2.5 KG', 'each', 61.37, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0095', 'Cheesecake Strawberry Sponge Tray 1-176', 'Priestleys', 'DESSERTS', 'Cheesecakes & Bavarians', 'cheese', 'g', 0.01484, '$/g', true, '1.72 KG', 'tray', 25.53, null, '["cheese"]'::jsonb, null, null, null, false),
  ('P0096', 'Chicken Breast Flts Raw Frozen', 'Farmyard Chicke', 'POULTRY WHOLE & CUTS', 'Chicken Breast', null, 'g', 0.00775, '$/g', true, '2 KG', 'packet', 15.5, null, '[]'::jsonb, null, null, null, false),
  ('P0097', 'Chicken Breast Oven Roasted Sliced', 'Carols', 'POULTRY FURTHER PROCESSED', 'Cooked Meat', null, 'g', 0.01481, '$/g', true, '1 KG', 'packet', 14.81, null, '[]'::jsonb, null, null, null, false),
  ('P0098', 'Chicken Meat Breast Cooked & Diced', 'Steggles', 'POULTRY FURTHER PROCESSED', 'Breast Products', null, 'g', 0.0199, '$/g', true, '1 KG', 'packet', 19.9, null, '[]'::jsonb, null, null, null, false),
  ('P0099', 'Chicken Meat Sliced Roasted (Strips)', 'Ingham', 'POULTRY FURTHER PROCESSED', 'Cooked Meat', null, 'g', 0.01673, '$/g', true, '1 KG', 'packet', 16.73, null, '[]'::jsonb, null, null, null, false),
  ('P0100', 'Chicken Nuggets Breast Tempura', 'Ingham', 'FINGER & SNACK FOODS', 'Chicken Products', 'nugget', 'g', 0.01228, '$/g', true, '1 KG', 'packet', 12.28, null, '["nugget"]'::jsonb, null, null, null, false),
  ('P0101', 'Chicken Nuggets Breast Tempura Bulk', 'Ingham', 'FINGER & SNACK FOODS', 'Chicken Products', 'nugget', 'g', 0.01086, '$/g', true, '2 X 2.5KG', 'carton', 54.3, null, '["nugget"]'::jsonb, null, null, null, false),
  ('P0102', 'Chicken Nuggets Gluten Free Coating', 'Ingham', 'FINGER & SNACK FOODS', 'Chicken Products', 'nugget', 'g', 0.01469, '$/g', true, '45 X 22GR', 'packet', 14.54, null, '["nugget"]'::jsonb, null, null, null, false),
  ('P0103', 'Chicken Pulled Cooked Frz', 'Naturalaz', 'POULTRY FURTHER PROCESSED', 'Cooked Meat', null, 'g', 0.01849, '$/g', true, '1 KG', 'packet', 18.49, null, '[]'::jsonb, null, null, null, false),
  ('P0104', 'Chiko Rolls 170Gr', 'Chiko', 'FINGER & SNACK FOODS', 'Snack Foods', 'chiko roll', 'g', 0.00788, '$/g', true, '2 KG', 'packet', 15.76, null, '["chiko roll"]'::jsonb, null, null, null, false),
  ('P0105', 'Chilli Con Carne', 'Hermans', 'READY MEALS', 'Beef', null, 'g', 0.01172, '$/g', true, '2 KG', 'bag', 23.44, null, '[]'::jsonb, null, null, null, false),
  ('P0106', 'Chipolatas Pork', 'Primo', 'SAUSAGES  HOT DOGS & PATTIES', 'Chipolatas', 'sausage', 'g', 0.01248, '$/g', true, '1.5 KG', 'packet', 18.72, null, '["sausage","snag"]'::jsonb, null, null, null, false),
  ('P0107', 'Chips 10Mm Crispy Coated Fries', 'Farm Frites', 'POTATO PRODUCTS', 'Chips Specialty', 'chips', 'g', 0.00481, '$/g', true, '4 X 2.5KG', 'carton', 48.13, null, '["chips","fries"]'::jsonb, null, null, null, false),
  ('P0108', 'Chips 10Mm Straight Cut', 'Safries', 'POTATO PRODUCTS', 'Fries & Chips', 'chips', 'g', 0.00263, '$/g', true, '6 X 2.5KG', 'carton', 39.5, null, '["chips","fries"]'::jsonb, null, null, null, false),
  ('P0109', 'Chips 10Mm Supa Crunch Delivery', 'Edgell', 'POTATO PRODUCTS', 'Chips Specialty', 'chips', 'g', 0.00451, '$/g', true, '6 X 2KG', 'carton', 54.06, null, '["chips","fries"]'::jsonb, null, null, null, false),
  ('P0110', 'Chips 12Mm Traditional Takeaway', 'Farm Frites', 'POTATO PRODUCTS', 'Fries & Chips', 'chips', 'g', 0.0026, '$/g', true, '4 X 2.5KG', 'carton', 26, null, '["chips","fries"]'::jsonb, null, null, null, false),
  ('P0111', 'Chocolate Buttons Dark Compound', 'Caterers Choice', 'BAKING SUPPLIES', 'Chocolate Cooking', null, 'g', 0.01529, '$/g', true, '1 KG', 'packet', 15.29, null, '[]'::jsonb, null, null, null, false),
  ('P0112', 'Chocolate Buttons Milk Compound', 'Caterers Choice', 'BAKING SUPPLIES', 'Chocolate Cooking', 'milk', 'g', 0.01529, '$/g', true, '1 KG', 'packet', 15.29, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0113', 'Chocolate Buttons White', 'Caterers Choice', 'BAKING SUPPLIES', 'Chocolate Cooking', null, 'g', 0.01589, '$/g', true, '1 KG', 'packet', 15.89, null, '[]'::jsonb, null, null, null, false),
  ('P0114', 'Chocolate Drinking Cafe Blend', 'Cadbury', 'BEVERAGES', 'Chocolate Drinking', null, 'g', 0.01226, '$/g', true, '1.75 KG', 'jar', 21.45, null, '[]'::jsonb, null, null, null, false),
  ('P0115', 'Chorizo (App 2Kg)', 'Sunvalley Fine', 'SMALLGOODS', 'Salami', 'sausage', null, null, 'needs review', true, 'KG', 'kg', 14.67, null, '["sausage","snag"]'::jsonb, null, null, null, false),
  ('P0116', 'Chorizo Spanish', 'Hans', 'SMALLGOODS', 'Salami', 'sausage', 'g', 0.01832, '$/g', true, '2 KG', 'packet', 36.63, null, '["sausage","snag"]'::jsonb, null, null, null, false),
  ('P0117', 'Cinnamon Ground', 'Caterers Choice', 'HERBS  SPICES & SEASONINGS', 'Herbs & Spices Dried', null, 'g', 0.01494, '$/g', true, '1 KG', 'packet', 14.94, null, '[]'::jsonb, null, null, null, false),
  ('P0118', 'Cinnamon Quills', 'Galaxy', 'HERBS  SPICES & SEASONINGS', 'Herbs & Spices Dried', null, 'g', 0.14327, '$/g', true, '150 GR', 'jar', 21.49, null, '[]'::jsonb, null, null, null, false),
  ('P0119', 'Cleaner Coffee Espresso Machine Powder', 'Aurora', 'CLEANING & JANITORIAL', 'Cleaners Coffee Espresso Machines', 'coffee', 'g', 0.05464, '$/g', false, '1 KG', 'tub', 54.64, null, '["coffee"]'::jsonb, null, null, null, false),
  ('P0120', 'Clingwrap Dispenser', 'Caterers Choice', 'PACKAGING', 'Clingwrap', null, null, null, 'needs review', false, '600M X 45CM', 'roll', 22.5, null, '[]'::jsonb, null, null, null, false),
  ('P0121', 'Cocoa Powder', 'Caterers Choice', 'BEVERAGES', 'Cocoa', null, 'g', 0.02779, '$/g', true, '1 KG', 'packet', 27.79, null, '[]'::jsonb, null, null, null, false),
  ('P0122', 'Container Food 3.15Lt Storage', 'Catermart', 'PACKAGING', 'Food Containers', null, null, null, 'needs review', false, 'EA', 'each', 1.41, null, '[]'::jsonb, null, null, null, false),
  ('P0123', 'Container Rectangle Rib 1000Ml T/Away Clear Frz Gd', 'Genfac', 'PACKAGING', 'Rectangular Takeaway Containers', null, 'ea', 0.1548, '$/unit', false, '50''S', 'sleeve', 7.74, null, '[]'::jsonb, null, null, null, false),
  ('P0124', 'Cookies Choc Chip Double', 'Allied', 'BISCUITS', 'Cookies', null, 'g', 0.01411, '$/g', true, '56 X 50GR', 'carton', 39.51, null, '[]'::jsonb, null, null, null, false),
  ('P0125', 'Cookies M & Ms', 'Allied', 'BISCUITS', 'Cookies', null, 'g', 0.01411, '$/g', true, '56 X 50GR', 'carton', 39.51, null, '[]'::jsonb, null, null, null, false),
  ('P0126', 'Cornjacks 120Gr', 'Chiko', 'FINGER & SNACK FOODS', 'Snack Foods', null, 'g', 0.01019, '$/g', true, '1.44 KG', 'packet', 14.68, null, '[]'::jsonb, null, null, null, false),
  ('P0127', 'Crab Balls', 'Tasty', 'Value Added', 'Seafood Value Added', null, 'g', 0.00972, '$/g', true, '1 KG', 'packet', 9.72, null, '[]'::jsonb, null, null, null, false),
  ('P0128', 'Cream Culinary (Cooking)', 'Anchor', 'DAIRY', 'Cream', 'cream', 'ml', 0.00999, '$/ml', true, '1 LT', 'each', 9.99, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0129', 'Cream Culinary Australian', 'Pauls', 'DAIRY', 'Cream', 'cream', 'ml', 0.00781, '$/ml', true, '1 LT', 'each', 7.81, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0130', 'Cream Thickened Cooking', 'Dairy Farmers', 'DAIRY', 'Cream', 'cream', 'ml', 0.00682, '$/ml', true, '2 LT', 'bottle', 13.64, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0131', 'Cream Whipped Aerosol', 'Anchor', 'DAIRY', 'Cream', 'cream', 'g', 0.02235, '$/g', true, '400 GR', 'can', 8.94, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0132', 'Croissants Butter Extra Large F/B', 'Sara Lee', 'BREAD & PASTRY', 'Croissants', 'butter', 'g', 0.01741, '$/g', true, '24 X 110GR', 'carton', 45.95, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0133', 'Croissants Butter Large Bent F/B', 'Bakers Maison', 'BREAD & PASTRY', 'Croissants', 'butter', 'g', 0.01303, '$/g', true, '40 X 95GR', 'carton', 49.51, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0134', 'Croissants Large', 'Speedibake', 'BREAD & PASTRY', 'Croissants', 'croissant', 'g', 0.01629, '$/g', true, '50 X 100GR', 'carton', 81.45, null, '["croissant"]'::jsonb, null, null, null, false),
  ('P0135', 'Cucumbers Sandwich Stackers', 'Riviana', 'VEGETABLES', 'Vegetable Prepared', 'vegetable', 'g', 0.00436, '$/g', true, '2.2 KG', 'jar', 9.6, null, '["vegetable"]'::jsonb, null, null, null, false),
  ('P0136', 'Cupcakes Caramolo 1-787', 'Priestleys', 'DESSERTS', 'Cupcakes', null, 'g', 0.02788, '$/g', true, '8 X 104GR', 'tray', 23.2, null, '[]'::jsonb, null, null, null, false),
  ('P0137', 'Cupcakes Chocolate Mint 1-789', 'Priestleys', 'DESSERTS', 'Cupcakes', null, 'g', 0.02589, '$/g', true, '8 X 112GR', 'tray', 23.2, null, '[]'::jsonb, null, null, null, false),
  ('P0138', 'Cupcakes Chocolate Regular', 'The Country Che', 'DESSERTS', 'Cupcakes', null, 'g', 0.02109, '$/g', true, '16 X 72GR', 'carton', 24.3, null, '[]'::jsonb, null, null, null, false),
  ('P0139', 'Cupcakes Freaky Face 1-786', 'Priestleys', 'DESSERTS', 'Cupcakes', null, 'g', 0.02988, '$/g', true, '8 X 86GR', 'tray', 20.56, null, '[]'::jsonb, null, null, null, false),
  ('P0140', 'Cupcakes Red Velvet Regular', 'The Country Che', 'DESSERTS', 'Cupcakes', null, 'g', 0.02109, '$/g', true, '16 X 72GR', 'carton', 24.3, null, '[]'::jsonb, null, null, null, false),
  ('P0141', 'Cupcakes Ultimate Chocolate 1-797', 'Priestleys', 'DESSERTS', 'Cupcakes', null, 'g', 0.02685, '$/g', true, '8 X 108GR', 'tray', 23.2, null, '[]'::jsonb, null, null, null, false),
  ('P0142', 'Cupcakes White Chocolate 1-788', 'Priestleys', 'DESSERTS', 'Cupcakes', null, 'g', 0.02613, '$/g', true, '8 X 111GR', 'tray', 23.2, null, '[]'::jsonb, null, null, null, false),
  ('P0143', 'Cups 120Ml 4Oz 63Mm Single Wall White Biocup', 'Biopak', 'PACKAGING', 'Cups Coffee', null, 'ea', 0.0528, '$/unit', false, '50''S', 'sleeve', 2.64, null, '[]'::jsonb, null, null, null, false),
  ('P0144', 'Cutlery Pack Wooden', 'Caterers Choice', 'PACKAGING', 'Disposable Cutlery', null, 'ea', 0.1226, '$/unit', false, '100''S', 'packet', 12.26, null, '[]'::jsonb, null, null, null, false),
  ('P0145', 'Dagwood Dogs', 'Keiths', 'FINGER & SNACK FOODS', 'Snack Foods', 'hot dog', 'g', 0.013, '$/g', true, '20 X 125GR', 'carton', 32.49, null, '["hot dog"]'::jsonb, null, null, null, false),
  ('P0146', 'Detergent Dishwashing', 'Cater Clean', 'CLEANING & JANITORIAL', 'Dishwashing Detergent', null, 'ml', 0.00336, '$/ml', false, '5 LT', 'bottle', 16.79, null, '[]'::jsonb, null, null, null, false),
  ('P0147', 'Donuts Jam Filled Christmas Red & Green Mixed', 'Gd Donuts', 'DESSERTS', 'Donuts & Cronuts', null, 'ea', 2.175, '$/unit', true, '24''S', 'carton', 52.2, null, '[]'::jsonb, null, null, null, false),
  ('P0148', 'Dressing Greek Gluten Free', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Salad Dressings', 'sauce', 'ml', 0.00933, '$/ml', true, '3 LT', 'bottle', 28, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0149', 'Dressing Italian Gluten Free', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Salad Dressings', 'sauce', 'ml', 0.00823, '$/ml', true, '3 LT', 'bottle', 24.7, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0150', 'Dressing Ranch Squeeze Bottle Gluten Free', 'Jeffersons', 'SAUCES  CONDIMENTS & DRESSINGS', 'Salad Dressings', 'sauce', 'ml', 0.01154, '$/ml', true, '1 LT', 'bottle', 11.54, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0151', 'Drink Blood Orange', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.00444, '$/ml', true, '12 X 375ML', 'carton', 19.99, null, '[]'::jsonb, null, null, null, false),
  ('P0152', 'Drink Creaming Soda Burgundee', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', 'cream', 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0153', 'Drink Ginger Beer Glass Loose', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.00502, '$/ml', true, '24 X 375ML', 'carton', 45.18, null, '[]'::jsonb, null, null, null, false),
  ('P0154', 'Drink Guava', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '[]'::jsonb, null, null, null, false),
  ('P0155', 'Drink Lemon Lime & Bitters', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '[]'::jsonb, null, null, null, false),
  ('P0156', 'Drink Passionfruit', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '[]'::jsonb, null, null, null, false),
  ('P0157', 'Drink Pineapple & Coconut', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', 'pineapple', 'ml', 0.00484, '$/ml', true, '12 X 375ML', 'carton', 21.76, null, '["pineapple"]'::jsonb, null, null, null, false),
  ('P0158', 'Drink Pink Grapefruit', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.00512, '$/ml', true, '12 X 375ML', 'carton', 23.02, null, '[]'::jsonb, null, null, null, false),
  ('P0159', 'Drink Sarsaparilla', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '[]'::jsonb, null, null, null, false),
  ('P0160', 'Drink Traditional Lemonade', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '[]'::jsonb, null, null, null, false),
  ('P0161', 'Drink Tropical Mango', 'Bundaberg', 'BEVERAGES', 'Soft Drinks Carbonated', null, 'ml', 0.0053, '$/ml', true, '12 X 375ML', 'carton', 23.86, null, '[]'::jsonb, null, null, null, false),
  ('P0162', 'Dukkah', 'Krio Krush', 'HERBS  SPICES & SEASONINGS', 'Seasonings & Sprinkles', null, 'g', 0.05514, '$/g', true, '500 GR', 'each', 27.57, null, '[]'::jsonb, null, null, null, false),
  ('P0163', 'Eggs Large Bulk (180 Eggs) 55-64Gr Filler', 'Daybreak', 'EGGS', 'Eggs Whole', 'egg', 'ea', 0.3617, '$/unit', true, '15 DOZ', 'carton', 65.1, null, '["egg"]'::jsonb, null, null, null, false),
  ('P0164', 'Essence Vanilla Imitation', 'Queen', 'BAKING SUPPLIES', 'Essences', null, 'ml', 0.00887, '$/ml', true, '2 LT', 'bottle', 17.75, null, '[]'::jsonb, null, null, null, false),
  ('P0165', 'Fish Cocktails Tempura S/Less', 'Pacific West', 'Value Added', 'Seafood Value Added', 'fish', 'g', 0.01498, '$/g', true, '5 KG', 'carton', 74.9, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0166', 'Fish Cocktails Tempura S/Less (I)', 'Pacific West', 'Value Added', 'Seafood Value Added', 'fish', 'g', 0.01498, '$/g', true, '5 KG', 'carton', 74.9, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0167', 'Flour Plain', 'Caterers Choice', 'BAKING SUPPLIES', 'Flour', 'flour', 'g', 0.00139, '$/g', true, '10 KG', 'bag', 13.95, null, '["flour"]'::jsonb, null, null, null, false),
  ('P0168', 'Flour Self Raising', 'Caterers Choice', 'BAKING SUPPLIES', 'Flour', 'flour', 'g', 0.00158, '$/g', true, '10 KG', 'bag', 15.79, null, '["flour"]'::jsonb, null, null, null, false),
  ('P0169', 'Foil All Purpose Dispenser', 'Caterers Choice', 'PACKAGING', 'Alfoil', 'oil', null, null, 'needs review', false, '150M X 44CM', 'roll', 21.9, null, '["oil"]'::jsonb, null, null, null, false),
  ('P0170', 'Garlic Crushed', 'Caterers Choice', 'HERBS  SPICES & SEASONINGS', 'Garlic', null, 'g', 0.00435, '$/g', true, '10 KG', 'tub', 43.49, null, '[]'::jsonb, null, null, null, false),
  ('P0171', 'Gateau Black Forest Pre Cut 14''S 1-860', 'Priestleys', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.03287, '$/g', true, '1.73 KG', 'each', 56.87, null, '[]'::jsonb, null, null, null, false),
  ('P0172', 'Gherkins Sandwich Stackers', 'Sandhurst', 'VEGETABLES', 'Vegetable Prepared', null, 'g', 0.00471, '$/g', true, '2 KG', 'jar', 9.43, null, '[]'::jsonb, null, null, null, false),
  ('P0173', 'Gherkins Sandwich Stackers Sliced', 'Sandhurst', 'VEGETABLES', 'Vegetable Prepared', null, 'g', 0.00449, '$/g', true, '2.2 KG', 'jar', 9.87, null, '[]'::jsonb, null, null, null, false),
  ('P0174', 'Glaze Italian (With Balsamico)', 'Alfinas', 'SAUCES  CONDIMENTS & DRESSINGS', 'Bastes & Glazes', null, 'ml', 0.01372, '$/ml', true, '500 ML', 'bottle', 6.86, null, '[]'::jsonb, null, null, null, false),
  ('P0175', 'Gloves Nitrile Powder Free Black Large', 'Medi-Origin', 'CLEANING & JANITORIAL', 'Gloves', null, 'ea', 0.075, '$/unit', false, '100''S', 'packet', 7.5, null, '[]'::jsonb, null, null, null, false),
  ('P0176', 'Gloves Premium Vinyl Clear Large Powdered', 'Capri', 'CLEANING & JANITORIAL', 'Gloves', null, 'ea', 0.0393, '$/unit', false, '100''S', 'packet', 3.93, null, '[]'::jsonb, null, null, null, false),
  ('P0177', 'Gloves Vinyl Blue Large Powder Free', 'Workplace', 'CLEANING & JANITORIAL', 'Gloves', null, 'ea', 0.0348, '$/unit', false, '100''S', 'packet', 3.48, null, '[]'::jsonb, null, null, null, false),
  ('P0178', 'Gloves Vinyl Blue Medium Powder Free', 'Workplace', 'CLEANING & JANITORIAL', 'Gloves', null, 'ea', 0.0331, '$/unit', false, '100''S', 'packet', 3.31, null, '[]'::jsonb, null, null, null, false),
  ('P0179', 'Gloves Vinyl Clear Medium Powder Free', 'Workplace', 'CLEANING & JANITORIAL', 'Gloves', null, 'ea', 0.0347, '$/unit', false, '100''S', 'packet', 3.47, null, '[]'::jsonb, null, null, null, false),
  ('P0180', 'Gravy Mix Rich Classic', 'Maggi', 'SOUPS & STOCKS', 'Gravy Mixes', 'gravy', 'g', 0.01325, '$/g', true, '7.5 KG', 'pail', 99.35, null, '["gravy"]'::jsonb, null, null, null, false),
  ('P0181', 'Ham Leg Sliced', 'Caterers Choice', 'SMALLGOODS', 'Ham Sliced  Diced And Shredded', 'ham', 'g', 0.0129, '$/g', true, '1 KG', 'packet', 12.9, null, '["ham"]'::jsonb, null, null, null, false),
  ('P0182', 'Ham Leg Sliced 2Mm (App 1Kg)', 'Sunvalley Fine', 'SMALLGOODS', 'Ham Sliced  Diced And Shredded', 'ham', null, null, 'needs review', true, 'KG', 'kg', 11.98, null, '["ham"]'::jsonb, null, null, null, false),
  ('P0183', 'Hash Browns Triangles (App 50''S)', 'Mccain', 'POTATO PRODUCTS', 'Hash Browns & Potato Rostis', 'hash brown', 'g', 0.0063, '$/g', true, '2 KG', 'packet', 12.6, null, '["hash brown"]'::jsonb, null, null, null, false),
  ('P0184', 'Hash Browns Triangles Chunky', 'Farm Frites', 'POTATO PRODUCTS', 'Hash Browns & Potato Rostis', 'hash brown', 'g', 0.00562, '$/g', true, '1 KG', 'packet', 5.62, null, '["hash brown"]'::jsonb, null, null, null, false),
  ('P0185', 'Hoki S/F Flt S/Less 4/6 (115-175Gr)', 'Amaltal', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.0117, '$/g', true, '6.8 KG', 'block', 79.59, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0186', 'Hoki S/F Flt S/Less 4/6 (115-175Gr) (I)', 'Amaltal', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.01286, '$/g', true, '6.8 KG', 'block', 87.47, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0187', 'Honey P/C', 'Kraft', 'SPREADS', 'Honey Portion Control', null, 'g', 0.02321, '$/g', true, '50 X 14GR', 'tray', 16.25, null, '[]'::jsonb, null, null, null, false),
  ('P0188', 'Honey Pure', 'Allowrie', 'SPREADS', 'Honey', null, 'g', 0.00795, '$/g', true, '3 KG', 'can', 23.84, null, '[]'::jsonb, null, null, null, false),
  ('P0189', 'Hot Dogs 190Mm 8  All American', 'Hans', 'SAUSAGES  HOT DOGS & PATTIES', 'Frankfurts/Hotdogs', 'hot dog', 'g', 0.01417, '$/g', true, '2.5 KG', 'packet', 35.43, null, '["hot dog"]'::jsonb, null, null, null, false),
  ('P0190', 'Hot Dogs 8  97% Fat Free', 'Hans', 'SAUSAGES  HOT DOGS & PATTIES', 'Frankfurts/Hotdogs', 'hot dog', 'g', 0.01396, '$/g', true, '2 KG', 'packet', 27.92, null, '["hot dog"]'::jsonb, null, null, null, false),
  ('P0191', 'Ice Cream Cones Double Premium', 'Altimate', 'ICE & ICE CREAM', 'Cones  Wafers & Accessories', 'cream', 'ea', 0.1391, '$/unit', true, '200''S', 'carton', 27.82, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0192', 'Ice Cream Cones Single Superior', 'Altimate', 'ICE & ICE CREAM', 'Cones  Wafers & Accessories', 'cream', 'ea', 0.0892, '$/unit', true, '400''S', 'carton', 35.68, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0193', 'Ice Cream Cones Small Cup', 'Altimate', 'ICE & ICE CREAM', 'Cones  Wafers & Accessories', 'cream', 'ea', 0.1053, '$/unit', true, '224''S', 'carton', 23.58, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0194', 'Ice Cream Cones Waffle Natural B', 'Altimate', 'ICE & ICE CREAM', 'Cones  Wafers & Accessories', 'cream', 'ea', 0.1588, '$/unit', true, '312''S', 'carton', 49.56, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0195', 'Ice Cream Vanilla', 'Bulla', 'ICE & ICE CREAM', 'Ice Cream Tubs & Bulk', 'cream', 'ml', 0.003, '$/ml', true, '10 LT', 'tub', 30, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0196', 'Icing Sugar Pure', 'Caterers Choice', 'BAKING SUPPLIES', 'Icing Sugar & Mix', 'sugar', 'g', 0.00408, '$/g', true, '3 KG', 'packet', 12.23, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0197', 'Jam P/C Strawberry', 'Kraft', 'SPREADS', 'Jam Portion Control', null, 'g', 0.0108, '$/g', true, '75 X 14GR', 'tray', 11.34, null, '[]'::jsonb, null, null, null, false),
  ('P0198', 'Juice Apple Long Life 100%', 'Juicee Crush', 'BEVERAGES', 'Fruit Juices', null, 'ml', 0.00204, '$/ml', true, '2 LT', 'bottle', 4.07, null, '[]'::jsonb, null, null, null, false),
  ('P0199', 'Juice Clear Apple Long Life 100% Pet', 'Dewfresh', 'BEVERAGES', 'Fruit Juices', null, 'ml', 0.00192, '$/ml', true, '2 LT', 'bottle', 3.84, null, '[]'::jsonb, null, null, null, false),
  ('P0200', 'Labels Permanent 60 X 40Mm Hot Take-Out Foods', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.0381, '$/unit', false, '500''S', 'roll', 19.06, null, '[]'::jsonb, null, null, null, false),
  ('P0201', 'Labels Removable 24Mm Round Friday', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.009, '$/unit', false, '1000''S', 'packet', 9.02, null, '[]'::jsonb, null, null, null, false),
  ('P0202', 'Labels Removable 24Mm Round Monday', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.009, '$/unit', false, '1000''S', 'packet', 9.02, null, '[]'::jsonb, null, null, null, false),
  ('P0203', 'Labels Removable 24Mm Round Saturday', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.009, '$/unit', false, '1000''S', 'packet', 9.02, null, '[]'::jsonb, null, null, null, false),
  ('P0204', 'Labels Removable 24Mm Round Thursday', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.009, '$/unit', false, '1000''S', 'packet', 9.02, null, '[]'::jsonb, null, null, null, false),
  ('P0205', 'Labels Removable 24Mm Round Wednesday', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.009, '$/unit', false, '1000''S', 'packet', 9.02, null, '[]'::jsonb, null, null, null, false),
  ('P0206', 'Labels Removable Shelf Life 102 X 47Mm', 'Fildes', 'PACKAGING', 'Labels', null, 'ea', 0.0345, '$/unit', false, '500''S', 'roll', 17.26, null, '[]'::jsonb, null, null, null, false),
  ('P0207', 'Lamb Kofta', 'Specialty Foods', 'FINGER & SNACK FOODS', 'Finger Food Other', null, 'g', 0.02124, '$/g', true, '20 X 60GR', 'packet', 25.49, null, '[]'::jsonb, null, null, null, false),
  ('P0208', 'Lids Round 120Mm To Suit 220/850Ml Container', 'Genfac', 'PACKAGING', 'Lids', null, 'ea', 0.0386, '$/unit', false, '50''S', 'sleeve', 1.93, null, '[]'::jsonb, null, null, null, false),
  ('P0209', 'Lids To Suit 118Ml 4Oz Portion Control Cups Pet', 'Beta Eco', 'PACKAGING', 'Lids', null, 'ea', 0.0479, '$/unit', false, '100''S', 'sleeve', 4.79, null, '[]'::jsonb, null, null, null, false),
  ('P0210', 'Lids To Suit 120Ml 4Oz Biocup Black Sipper Hole', 'Biopak', 'PACKAGING', 'Lids', null, 'ea', 0.0368, '$/unit', false, '50''S', 'sleeve', 1.84, null, '[]'::jsonb, null, null, null, false),
  ('P0211', 'Mango Cheeks', 'Sunshine Tropic', 'FRUIT', 'Frozen Fruit', null, 'g', 0.01088, '$/g', true, '1 KG', 'packet', 10.88, null, '[]'::jsonb, null, null, null, false),
  ('P0212', 'Mango Chunks Iqf', 'Entyce', 'FRUIT', 'Frozen Fruit', null, 'g', 0.00658, '$/g', true, '2.5 KG', 'packet', 16.45, null, '[]'::jsonb, null, null, null, false),
  ('P0213', 'Mango Sliced', 'Riviana', 'FRUIT', 'Canned Fruit', null, 'g', 0.00373, '$/g', true, '3 KG', 'can', 11.2, null, '[]'::jsonb, null, null, null, false),
  ('P0214', 'Maple Syrup Flavoured', 'Frenchmaid', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.01032, '$/ml', true, '1 LT', 'bottle', 10.32, null, '[]'::jsonb, null, null, null, false),
  ('P0215', 'Maple Syrup Flavoured P/C', 'Frenchmaid', 'DESSERTS', 'Syrups & Toppings', null, 'g', 0.01564, '$/g', true, '100 X 30GR', 'carton', 46.93, null, '[]'::jsonb, null, null, null, false),
  ('P0216', 'Margarine Spread', 'Sunlit Plains', 'DAIRY', 'Margarine And Spreads', 'margarine', 'g', 0.00395, '$/g', true, '1 KG', 'tub', 3.95, null, '["margarine"]'::jsonb, null, null, null, false),
  ('P0217', 'Margarine Spread Catchoice', 'Sunlit Plains', 'DAIRY', 'Margarine And Spreads', 'margarine', 'g', 0.00395, '$/g', true, '1 KG', 'tub', 3.95, null, '["margarine"]'::jsonb, null, null, null, false),
  ('P0218', 'Margarine Spread Catering Catchoice', 'Sunlit Plains', 'DAIRY', 'Margarine And Spreads', 'margarine', 'g', 0.0049, '$/g', true, '10 KG', 'carton', 48.97, null, '["margarine"]'::jsonb, null, null, null, false),
  ('P0219', 'Marshmallows Mini Pink & White', 'Trumps', 'CONFECTIONERY', 'Lollies Bulk', null, 'g', 0.02939, '$/g', true, '375 GR', 'packet', 11.02, null, '[]'::jsonb, null, null, null, false),
  ('P0220', 'Marshmallows Mixed Pink & White', 'Trumps', 'CONFECTIONERY', 'Lollies Bulk', null, 'g', 0.0148, '$/g', true, '500 GR', 'packet', 7.4, null, '[]'::jsonb, null, null, null, false),
  ('P0221', 'Marshmallows White', 'Pascall', 'CONFECTIONERY', 'Lollies Bulk', null, 'g', 0.00765, '$/g', true, '5 KG', 'carton', 38.25, null, '[]'::jsonb, null, null, null, false),
  ('P0222', 'Mayonnaise', 'Kewpie', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mayonnaise', 'mayonnaise', 'g', 0.01208, '$/g', true, '1 KG', 'bottle', 12.08, null, '["mayonnaise"]'::jsonb, null, null, null, false),
  ('P0223', 'Mayonnaise Aioli Gluten Free', 'Bright Side', 'SAUCES  CONDIMENTS & DRESSINGS', 'Aioli', 'aioli', 'ml', 0.0095, '$/ml', true, '1 LT', 'bottle', 9.5, null, '["aioli","garlic mayo"]'::jsonb, null, null, null, false),
  ('P0224', 'Mayonnaise Aioli Squeeze Bottle Gluten Free', 'Jeffersons', 'SAUCES  CONDIMENTS & DRESSINGS', 'Aioli', 'aioli', 'ml', 0.01134, '$/ml', true, '1 LT', 'bottle', 11.34, null, '["aioli","garlic mayo"]'::jsonb, null, null, null, false),
  ('P0225', 'Mayonnaise Basil Pesto Squeeze Gluten Free', 'Wombat Valley', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mayonnaise', 'mayonnaise', 'g', 0.01023, '$/g', true, '1 KG', 'bottle', 10.23, null, '["mayonnaise"]'::jsonb, null, null, null, false),
  ('P0226', 'Mayonnaise Fiery Chipotle Squeeze Bottle G/Free', 'Jeffersons', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mayonnaise', 'mayonnaise', 'ml', 0.01097, '$/ml', true, '1 LT', 'bottle', 10.97, null, '["mayonnaise"]'::jsonb, null, null, null, false),
  ('P0227', 'Mayonnaise Japanese Gluten Free', 'Akari', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mayonnaise', 'mayonnaise', 'ml', 0.01025, '$/ml', true, '1 LT', 'bottle', 10.25, null, '["mayonnaise"]'::jsonb, null, null, null, false),
  ('P0228', 'Mayonnaise P/C Squeeze On', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mayonnaise', 'mayonnaise', 'g', 0.01936, '$/g', true, '100 X 11GR', 'carton', 21.3, null, '["mayonnaise"]'::jsonb, null, null, null, false),
  ('P0229', 'Mayonnaise Whole Egg Free Range Gluten Free', 'Menu Maker', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mayonnaise', 'mayonnaise', 'ml', 0.01057, '$/ml', true, '1 LT', 'bottle', 10.57, null, '["mayonnaise"]'::jsonb, null, null, null, false),
  ('P0230', 'Milk Almond Uht Barista', 'Alternative Dai', 'DAIRY', 'Milk Specialty', 'milk', 'ml', 0.00312, '$/ml', true, '1 LT', 'each', 3.12, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0231', 'Milk Light Fresh (Low Fat)', 'Yarde Farm', 'DAIRY', 'Milk', 'milk', 'ml', 0.00165, '$/ml', true, '6 X 2LT', 'carton', 19.8, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0232', 'Milk Oat Uht', 'Little Things', 'DAIRY', 'Milk Specialty', 'milk', 'ml', 0.00286, '$/ml', true, '1 LT', 'each', 2.86, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0233', 'Milk Powder Malted', 'Nestle', 'BEVERAGES', 'Milk Powders', 'milk', 'g', 0.02101, '$/g', true, '1.5 KG', 'can', 31.52, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0234', 'Milk Soya Uht', 'Little Things', 'DAIRY', 'Milk Specialty', 'milk', 'ml', 0.00261, '$/ml', true, '1 LT', 'each', 2.61, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0235', 'Milk Uht Almond Barista', 'Alternative Dai', 'DAIRY', 'Milk Specialty', 'milk', 'ml', 0.00312, '$/ml', true, '1 LT', 'each', 3.12, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0236', 'Milk Uht Full Cream Lactose Free', 'Little Things', 'DAIRY', 'Milk Specialty', 'cream', 'ml', 0.00303, '$/ml', true, '1 LT', 'each', 3.03, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0237', 'Milk Uht Oat', 'Little Things', 'DAIRY', 'Milk Specialty', 'milk', 'ml', 0.00304, '$/ml', true, '1 LT', 'each', 3.04, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0238', 'Milk Uht Skim', 'Little Things', 'DAIRY', 'Milk Uht', 'milk', 'ml', 0.00224, '$/ml', true, '1 LT', 'each', 2.24, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0239', 'Milk Uht Soya', 'Little Things', 'DAIRY', 'Milk Specialty', 'milk', 'ml', 0.0028, '$/ml', true, '1 LT', 'each', 2.8, null, '["milk"]'::jsonb, null, null, null, false),
  ('P0240', 'Mixed Fruit Dried Standard', 'Trumps', 'FRUIT', 'Dried Fruit', null, 'g', 0.01075, '$/g', true, '1 KG', 'packet', 10.75, null, '[]'::jsonb, null, null, null, false),
  ('P0241', 'Muffins Apple 1-090', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01806, '$/g', true, '6 X 150GR', 'tray', 16.25, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0242', 'Muffins Apple 1-816', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.02925, '$/g', true, '6 X 120GR', 'tray', 21.06, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0243', 'Muffins Banana & Walnut 1-083', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01834, '$/g', true, '6 X 150GR', 'tray', 16.51, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0244', 'Muffins Blueberry Gluten Free 1-367', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01948, '$/g', true, '6 X 150GR', 'tray', 17.53, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0245', 'Muffins Butterscotch & White Chocolate', 'Helen''S', 'BREAD & PASTRY', 'Muffins', 'butter', 'g', 0.02008, '$/g', true, '6 X 120GR', 'tray', 14.46, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0246', 'Muffins Cinnamon Donut Gluten Free Vegan 1-609', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.02628, '$/g', true, '6 X 150GR', 'tray', 23.65, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0247', 'Muffins Double Chocolate 1-091', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01902, '$/g', true, '6 X 150GR', 'tray', 17.12, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0248', 'Muffins English Traditional', 'Tip Top', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01194, '$/g', true, '6 X 400GR', 'carton', 28.66, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0249', 'Muffins Raspberry & White Chocolate 1-081', 'Priestleys', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.02139, '$/g', true, '6 X 132GR', 'tray', 16.94, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0250', 'Muffins Texas Blueberry & Custard', 'Helen''S', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01741, '$/g', true, '6 X 180GR', 'tray', 18.8, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0251', 'Muffins Texas Triple Chocolate', 'Helen''S', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01741, '$/g', true, '6 X 180GR', 'tray', 18.8, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0252', 'Muffins Texas Wildberry & White Chocolate', 'Helen''S', 'BREAD & PASTRY', 'Muffins', 'muffin', 'g', 0.01737, '$/g', true, '6 X 180GR', 'tray', 18.76, null, '["muffin"]'::jsonb, null, null, null, false),
  ('P0253', 'Oil Canola Cooking Spray', 'Sandhurst', 'OILS & FATS', 'Oil Spray', 'oil', 'g', 0.00933, '$/g', true, '450 GR', 'can', 4.2, null, '["oil"]'::jsonb, null, null, null, false),
  ('P0254', 'Olives Kalamata Sliced', 'Kalos', 'VEGETABLES', 'Olives', 'olive', 'g', 0.00952, '$/g', true, '2 KG', 'jar', 19.03, null, '["olive"]'::jsonb, null, null, null, false),
  ('P0255', 'Onion Rings Beer Battered', 'Big Country', 'FINGER & SNACK FOODS', 'Snack Foods', 'onion ring', 'g', 0.01073, '$/g', true, '1 KG', 'packet', 10.73, null, '["onion ring"]'::jsonb, null, null, null, false),
  ('P0256', 'Onion Rings Beer Battered Iqf', 'Noys Kitchen', 'FINGER & SNACK FOODS', 'Finger Food Other', 'onion ring', 'g', 0.01175, '$/g', true, '1 KG', 'packet', 11.75, null, '["onion ring"]'::jsonb, null, null, null, false),
  ('P0257', 'Onion Rings Beer Battered Natural', 'Jeffersons', 'FINGER & SNACK FOODS', 'Snack Foods', 'onion ring', 'g', 0.01197, '$/g', true, '1 KG', 'packet', 11.97, null, '["onion ring"]'::jsonb, null, null, null, false),
  ('P0258', 'Pancakes 30''S', 'Golden', 'DESSERTS', 'Pancakes', 'pancake', 'g', 0.01492, '$/g', true, '5 X 360GR', 'carton', 26.86, null, '["pancake"]'::jsonb, null, null, null, false),
  ('P0259', 'Pancakes Hotcakes Happy Plain 100Mm', 'Marcels', 'DESSERTS', 'Pancakes', 'pancake', 'ea', 0.6302, '$/unit', true, '8 X 6''S', 'carton', 30.25, null, '["pancake"]'::jsonb, null, null, null, false),
  ('P0260', 'Paper Baking Dispenser 30Cm X 120Mt', 'Caterers Choice', 'PACKAGING', 'Baking Paper', null, null, null, 'needs review', false, '120M X 30CM', 'roll', 32.75, null, '[]'::jsonb, null, null, null, false),
  ('P0261', 'Paper Baking Dispenser 45Cm X 120Mt', 'Caterers Choice', 'PACKAGING', 'Baking Paper', null, null, null, 'needs review', false, '120M X 45CM', 'roll', 41.28, null, '[]'::jsonb, null, null, null, false),
  ('P0262', 'Peanut Butter Smooth', 'Bega', 'SPREADS', 'Peanut Butter', 'butter', 'g', 0.01265, '$/g', true, '2 KG', 'bucket', 25.3, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0263', 'Pepper P/C', 'Ism', 'HERBS  SPICES & SEASONINGS', 'Pepper', 'pepper', 'ea', 0.0227, '$/unit', true, '2000''S', 'carton', 45.34, null, '["pepper"]'::jsonb, null, null, null, false),
  ('P0264', 'Peppercorns Black Whole', 'Caterers Choice', 'HERBS  SPICES & SEASONINGS', 'Pepper', 'pepper', 'g', 0.03296, '$/g', true, '1 KG', 'packet', 32.96, null, '["pepper"]'::jsonb, null, null, null, false),
  ('P0265', 'Pie P/C Lemon Meringue', 'Spoon Wholesale', 'DESSERTS', 'Cake Portions & Individuals', 'pie', 'g', 0.03265, '$/g', true, '8 X 110GR', 'tray', 28.73, null, '["pie"]'::jsonb, null, null, null, false),
  ('P0266', 'Pie Pecan Pre Cut 16''S 1-062', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', 'pie', 'g', 0.03409, '$/g', true, '1.7 KG', 'each', 57.95, null, '["pie"]'::jsonb, null, null, null, false),
  ('P0267', 'Pineapple Thinly Sliced In Light Syrup', 'Dewfresh', 'FRUIT', 'Canned Pineapple', 'pineapple', 'g', 0.00414, '$/g', true, '3.06 KG', 'can', 12.67, null, '["pineapple"]'::jsonb, null, null, null, false),
  ('P0268', 'Pluto Pups 20''S', 'Chiko', 'FINGER & SNACK FOODS', 'Snack Foods', 'hot dog', 'g', 0.01718, '$/g', true, '2.25 KG', 'carton', 38.66, null, '["hot dog"]'::jsonb, null, null, null, false),
  ('P0269', 'Pork Pulled Plain Cooked Frz', 'Naturalaz', 'PORK PORTIONED', 'Pork Cooked', null, 'g', 0.01395, '$/g', true, '1 KG', 'packet', 13.95, null, '[]'::jsonb, null, null, null, false),
  ('P0270', 'Potato Cakes Scallops Extra Large', 'Sol''S Snax', 'POTATO PRODUCTS', 'Potato Scallops & Cakes', 'potato scallop', 'g', 0.00754, '$/g', true, '120 X 80GR', 'carton', 72.43, null, '["potato scallop"]'::jsonb, null, null, null, false),
  ('P0271', 'Potato Cakes Scallops Formed Extra Large', 'Sol''S Snax', 'POTATO PRODUCTS', 'Potato Scallops & Cakes', 'potato scallop', 'g', 0.0068, '$/g', true, '100 X 90GR', 'carton', 61.24, null, '["potato scallop"]'::jsonb, null, null, null, false),
  ('P0272', 'Potato Cakes Scallops Natural Slice Extra Large', 'Sol''S Snax', 'POTATO PRODUCTS', 'Potato Scallops & Cakes', 'potato scallop', 'g', 0.00735, '$/g', true, '100 X 90GR', 'carton', 66.13, null, '["potato scallop"]'::jsonb, null, null, null, false),
  ('P0273', 'Potato Cakes Scallops Natural Slice Large', 'Sol''S Snax', 'POTATO PRODUCTS', 'Potato Scallops & Cakes', 'potato scallop', 'g', 0.00677, '$/g', true, '100 X 70GR', 'carton', 47.36, null, '["potato scallop"]'::jsonb, null, null, null, false),
  ('P0274', 'Potato Gems', 'Edgell', 'POTATO PRODUCTS', 'Hash Browns & Potato Rostis', 'potato gem', 'g', 0.00482, '$/g', true, '2 KG', 'packet', 9.64, null, '["potato gem"]'::jsonb, null, null, null, false),
  ('P0275', 'Prawn Cutlet Crumbed 10/15', 'Seafrost', 'Value Added', 'Seafood Value Added', 'prawn', 'g', 0.02065, '$/g', true, '2 KG', 'packet', 41.29, null, '["prawn"]'::jsonb, null, null, null, false),
  ('P0276', 'Prawn Cutlet Crumbed 16/20', 'Seafrost', 'Value Added', 'Seafood Value Added', 'prawn', 'g', 0.02018, '$/g', true, '2 KG', 'packet', 40.37, null, '["prawn"]'::jsonb, null, null, null, false),
  ('P0277', 'Prawn Cutlet Raw 10/15 Vannamei (Seafrost)', 'Seacrest', 'Prawns', 'Prawn Cutlets Cooked & Raw', 'prawn', 'g', 0, '$/g', true, '700 GR', 'packet', 0, null, '["prawn"]'::jsonb, null, null, null, false),
  ('P0278', 'Prawn Cutlet Tempura 16/20 (I)', 'Seafrost', 'Value Added', 'Seafood Value Added', 'prawn', 'g', 0.02715, '$/g', true, '1 KG', 'packet', 27.15, null, '["prawn"]'::jsonb, null, null, null, false),
  ('P0279', 'Pump Syrup To Suit 750Ml & 1Lt Bottle', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', null, null, null, 'needs review', true, 'EA', 'each', 4.72, null, '[]'::jsonb, null, null, null, false),
  ('P0280', 'Relish Tomato', 'Woods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Chutneys & Relishes & Pickles', 'sauce', 'g', 0.01263, '$/g', true, '2.4 KG', 'tub', 30.32, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0281', 'Salmon Portions S/On 125Gr Scaled (App 40/Ctn) (I)', 'Seafrost', 'Fish', 'Salmon Fillets/Portions', null, 'g', 0.0296, '$/g', true, '5 KG', 'carton', 148, null, '[]'::jsonb, null, null, null, false),
  ('P0282', 'Salt Chicken Gluten Free', 'Edlyn', 'HERBS  SPICES & SEASONINGS', 'Salt', 'salt', 'g', 0.01003, '$/g', true, '8 KG', 'tub', 80.2, null, '["salt"]'::jsonb, null, null, null, false),
  ('P0283', 'Salt P/C', 'Ism', 'HERBS  SPICES & SEASONINGS', 'Salt', 'salt', 'ea', 0.0082, '$/unit', true, '2000''S', 'carton', 16.49, null, '["salt"]'::jsonb, null, null, null, false),
  ('P0284', 'Salt Table', 'Trumps', 'HERBS  SPICES & SEASONINGS', 'Salt', 'salt', 'g', 0.00216, '$/g', true, '2.5 KG', 'packet', 5.41, null, '["salt"]'::jsonb, null, null, null, false),
  ('P0285', 'Sauce Barbeque Gluten Free', 'Caterers Choice', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Bbq', 'sauce', 'ml', 0.00296, '$/ml', true, '4 LT', 'bottle', 11.85, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0286', 'Sauce Cheese American (Liquid)', 'Wombat Valley', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Specialty', 'sauce', 'g', 0.01097, '$/g', true, '1 KG', 'bag', 10.97, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0287', 'Sauce Cheese Cheddar (Liquid)', 'Jeffersons', 'DAIRY', 'Cheese Liquid', 'sauce', 'g', 0.01083, '$/g', true, '1 KG', 'bag', 10.83, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0288', 'Sauce Chocolate White Vegan Dairy & Gluten Free', 'Alchemy', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Sweet - Desert', 'sauce', 'ml', 0.0099, '$/ml', true, '1.47 LT', 'bottle', 14.55, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0289', 'Sauce Dessert Raspberry Coulis Gluten Free', 'Priestleys', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Sweet - Desert', 'sauce', 'ml', 0.0339, '$/ml', true, '500 ML', 'bottle', 16.95, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0290', 'Sauce Dessert Salted Caramel Gluten Free', 'Wombat Valley', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Sweet - Desert', 'sauce', 'ml', 0.01011, '$/ml', true, '1 LT', 'bottle', 10.11, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0291', 'Sauce Hollandaise Garde Dor Tetra', 'Knorr', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Specialty', 'hollandaise', 'ml', 0.01161, '$/ml', true, '1 LT', 'each', 11.61, null, '["hollandaise"]'::jsonb, null, null, null, false),
  ('P0292', 'Sauce Mustard American Squeeze', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Mustards', 'sauce', 'ml', 0.00948, '$/ml', true, '920 ML', 'bottle', 8.72, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0293', 'Sauce P/C Barbecue Squeeze On', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Portion Control', 'sauce', 'g', 0.01926, '$/g', true, '100 X 14GR', 'carton', 26.96, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0294', 'Sauce P/C Tartare', 'Zoosh', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Portion Control', 'sauce', 'g', 0.01527, '$/g', true, '50 X 11GR', 'tray', 8.4, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0295', 'Sauce P/C Tartare Squeeze On', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Portion Control', 'sauce', 'g', 0.02127, '$/g', true, '100 X 11GR', 'carton', 23.4, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0296', 'Sauce P/C Tomato Squeeze On', 'Masterfoods', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Portion Control', 'sauce', 'g', 0.01211, '$/g', true, '300 X 14GR', 'carton', 50.86, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0297', 'Sauce Sweet Chilli Gluten Free', 'Oriental Deligh', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Chilli', 'sauce', 'ml', 0.00569, '$/ml', true, '3 LT', 'bottle', 17.06, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0298', 'Sauce Tartare Pouch Gluten Free', 'Edlyn', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Tartare', 'sauce', 'g', 0.00678, '$/g', true, '5 KG', 'bag', 33.9, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0299', 'Sauce Tartare Squeeze Bottle Gluten Free', 'Menu Maker', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Tartare', 'sauce', 'g', 0.01035, '$/g', true, '1 KG', 'bottle', 10.35, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0300', 'Sauce Tomato Gluten Free', 'Caterers Choice', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Tomato', 'sauce', 'ml', 0.00241, '$/ml', true, '4 LT', 'bottle', 9.65, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0301', 'Sauce Tzatziki Squeeze Bottle Gluten Free', 'Casa De Mare', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauces/Jellies - Other', 'sauce', 'g', 0.01066, '$/g', true, '1 KG', 'bottle', 10.66, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0302', 'Sauce Worcestershire Gluten Free', 'Fountain', 'SAUCES  CONDIMENTS & DRESSINGS', 'Sauce Worcestershire', 'sauce', 'ml', 0.00382, '$/ml', true, '4 LT', 'bottle', 15.27, null, '["sauce"]'::jsonb, null, null, null, false),
  ('P0303', 'Sausages Crumbed', 'Keppel', 'SAUSAGES  HOT DOGS & PATTIES', 'Sausages - Precooked  Battered  Crumbed', 'sausage', 'g', 0.01218, '$/g', true, '53 X 76GR', 'carton', 49.06, null, '["sausage","snag"]'::jsonb, null, null, null, false),
  ('P0304', 'Sausages Crumbed Bacon & Cheese', 'Keiths', 'SAUSAGES  HOT DOGS & PATTIES', 'Sausages - Precooked  Battered  Crumbed', 'sausage', 'g', 0.01328, '$/g', true, '27 X 110GR', 'carton', 39.43, null, '["sausage","snag"]'::jsonb, null, null, null, false),
  ('P0305', 'Schnitzel Chicken Breast Panko Crumb', 'Farmyard Chicke', 'POULTRY FURTHER PROCESSED', 'Chicken Schnitzel', 'schnitzel', 'g', 0.01779, '$/g', true, '40 X 140GR', 'carton', 99.61, null, '["schnitzel"]'::jsonb, null, null, null, false),
  ('P0306', 'Schnitzel Chicken Crumbed Frz', null, 'POULTRY FURTHER PROCESSED', 'Chicken Schnitzel', 'schnitzel', 'g', 0.01487, '$/g', true, '25 X 200GR', 'box', 74.34, null, '["schnitzel"]'::jsonb, null, null, null, false),
  ('P0307', 'Scourer Stainless Steel 70Gr', 'Cater Clean', 'CLEANING & JANITORIAL', 'Scourers & Sponges', null, 'ea', 1.54, '$/unit', false, '6''S', 'packet', 9.24, null, '[]'::jsonb, null, null, null, false),
  ('P0308', 'Seafood Sticks Crumbed', 'Keppel', 'Surimi Products', 'Surimi Products', null, 'g', 0.01348, '$/g', true, '67 X 60GR', 'carton', 54.2, null, '[]'::jsonb, null, null, null, false),
  ('P0309', 'Seafood Sticks Crumbed (A)', 'Keppel', 'Surimi Products', 'Surimi Products', null, 'g', 0.01418, '$/g', true, '67 X 60GR', 'carton', 57.01, null, '[]'::jsonb, null, null, null, false),
  ('P0310', 'Seasoning All Purpose', 'Trumps', 'HERBS  SPICES & SEASONINGS', 'Seasonings & Sprinkles', null, 'g', 0.01389, '$/g', true, '1 KG', 'packet', 13.89, null, '[]'::jsonb, null, null, null, false),
  ('P0311', 'Seeds Poppy', 'Caterers Choice', 'BAKING SUPPLIES', 'Seeds & Kernels', null, 'g', 0.01147, '$/g', true, '1 KG', 'packet', 11.47, null, '[]'::jsonb, null, null, null, false),
  ('P0312', 'Seeds Sesame', 'Caterers Choice', 'BAKING SUPPLIES', 'Seeds & Kernels', null, 'g', 0.00858, '$/g', true, '1 KG', 'packet', 8.58, null, '[]'::jsonb, null, null, null, false),
  ('P0313', 'Slice Apple 1-215', 'Priestleys', 'DESSERTS', 'Slices', null, 'g', 0.02097, '$/g', true, '15 X 116GR', 'tray', 36.49, null, '[]'::jsonb, null, null, null, false),
  ('P0314', 'Slice Caramel Flourless', 'Spoon Wholesale', 'DESSERTS', 'Slices', 'flour', 'g', 0.02144, '$/g', true, '8 X 120GR', 'tray', 20.58, null, '["flour"]'::jsonb, null, null, null, false),
  ('P0315', 'Slice Caramel Gluten Free 1-136', 'Priestleys', 'DESSERTS', 'Slices', null, 'g', 0.02473, '$/g', true, '15 X 110GR', 'tray', 40.8, null, '[]'::jsonb, null, null, null, false),
  ('P0316', 'Slice Carrot Cake Large Flourless', 'Spoon Wholesale', 'DESSERTS', 'Slices', 'flour', 'g', 0.02172, '$/g', true, '12 X 145GR', 'tray', 37.8, null, '["flour"]'::jsonb, null, null, null, false),
  ('P0317', 'Slice Cherry 1-245', 'Priestleys', 'DESSERTS', 'Slices', null, 'g', 0.02397, '$/g', true, '18 X 85GR', 'tray', 36.67, null, '[]'::jsonb, null, null, null, false),
  ('P0318', 'Slice Hummingbird 1-262', 'Priestleys', 'DESSERTS', 'Slices', null, 'g', 0.02218, '$/g', true, '18 X 102GR', 'tray', 40.73, null, '[]'::jsonb, null, null, null, false),
  ('P0319', 'Slice Lemon Coconut Delicious Flourless', 'Spoon Wholesale', 'DESSERTS', 'Slices', 'flour', 'g', 0.02925, '$/g', true, '8 X 100GR', 'tray', 23.4, null, '["flour"]'::jsonb, null, null, null, false),
  ('P0320', 'Slice Mint Hedgehog Pre Cut 18''S 1-329', 'Priestleys', 'DESSERTS', 'Slices', null, 'g', 0.03046, '$/g', true, '18 X 84GR', 'tray', 46.05, null, '[]'::jsonb, null, null, null, false),
  ('P0321', 'Slice Rocky Road 1-216', 'Priestleys', 'DESSERTS', 'Slices', null, 'g', 0.02381, '$/g', true, '15 X 110GR', 'tray', 39.28, null, '[]'::jsonb, null, null, null, false),
  ('P0322', 'Smoked Salmon Sliced Atlantic', 'Seacrest', 'Fish', 'Salmon Smoked', null, 'g', 0.03855, '$/g', true, '1 KG', 'packet', 38.55, null, '[]'::jsonb, null, null, null, false),
  ('P0323', 'Smoked Salmon Sliced Atlantic (I)', 'Seacrest', 'Fish', 'Salmon Smoked', null, 'g', 0.03855, '$/g', true, '1 KG', 'packet', 38.55, null, '[]'::jsonb, null, null, null, false),
  ('P0324', 'Smoothie Ready To Blend Banana Cacao', 'Allies', 'BEVERAGES', 'Smoothies & Powders', null, 'g', 0.015, '$/g', true, '12 X 180GR', 'carton', 32.41, null, '[]'::jsonb, null, null, null, false),
  ('P0325', 'Smoothie Ready To Blend Green Delight', 'Allies', 'BEVERAGES', 'Smoothies & Powders', null, 'g', 0.01783, '$/g', true, '12 X 180GR', 'carton', 38.51, null, '[]'::jsonb, null, null, null, false),
  ('P0326', 'Smoothie Ready To Blend Summer Mango', 'Allies', 'BEVERAGES', 'Smoothies & Powders', null, 'g', 0.01783, '$/g', true, '12 X 180GR', 'carton', 38.51, null, '[]'::jsonb, null, null, null, false),
  ('P0327', 'Smoothie Ready To Blend Wild Berry', 'Allies', 'BEVERAGES', 'Smoothies & Powders', null, 'g', 0.01783, '$/g', true, '12 X 180GR', 'carton', 38.51, null, '[]'::jsonb, null, null, null, false),
  ('P0328', 'Snapper Goldband Flt S/On 200/300', 'South Pacific', 'Fish', 'Fish Fillets Skin On', 'fish', 'g', 0.0236, '$/g', true, '5 KG', 'carton', 118.01, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0329', 'Snapper King Goldband Flt 100/200', 'Pacific West', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.02516, '$/g', true, '5 KG', 'carton', 125.79, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0330', 'Snapper King S/Less B/Less 100/200 Wild', 'South Pacific', 'Fish', 'Fish Fillets Skinless', 'fish', 'g', 0.02198, '$/g', true, '5 KG', 'carton', 109.89, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0331', 'Spread Chocolate Hazelnut Piping Bag', 'Nutella', 'SPREADS', 'Spreads Sweet', null, 'g', 0.01645, '$/g', true, '1 KG', 'bag', 16.45, null, '[]'::jsonb, null, null, null, false),
  ('P0332', 'Spring Rolls Large 12''S', 'Marathon', 'FINGER & SNACK FOODS', 'Asian - Spring Rolls', 'spring roll', 'g', 0.00639, '$/g', true, '2 KG', 'packet', 12.79, null, '["spring roll"]'::jsonb, null, null, null, false),
  ('P0333', 'Spring Water Mini Flat Cap', 'Nu Pure', 'BEVERAGES', 'Water Still', null, 'ml', 0.00242, '$/ml', true, '20 X 250ML', 'carton', 12.11, null, '[]'::jsonb, null, null, null, false),
  ('P0334', 'Squid Rings Natural Crumbed', 'Pacific West', 'Value Added', 'Seafood Value Added', 'squid', 'g', 0.01492, '$/g', true, '1 KG', 'packet', 14.92, null, '["squid","calamari"]'::jsonb, null, null, null, false),
  ('P0335', 'Squid Rings Natural Crumbed (App 30-40 Rings)', 'Seafrost', 'Value Added', 'Seafood Value Added', 'squid', 'g', 0.01337, '$/g', true, '1 KG', 'packet', 13.37, null, '["squid","calamari"]'::jsonb, null, null, null, false),
  ('P0336', 'Squid Rings Natural Crumbed (App 30-40 Rings) (I)', 'Seafrost', 'Value Added', 'Seafood Value Added', 'squid', 'g', 0.01337, '$/g', true, '1 KG', 'packet', 13.37, null, '["squid","calamari"]'::jsonb, null, null, null, false),
  ('P0337', 'Squid Tubes U/5 Super Tender', 'Seafrost', 'Squid and Octopus', 'Squid & Octopus', 'squid', 'g', 0.01076, '$/g', true, '5 KG', 'carton', 53.79, null, '["squid","calamari"]'::jsonb, null, null, null, false),
  ('P0338', 'Squid Tubes U/5 Super Tender (I)', 'Seafrost', 'Squid and Octopus', 'Squid & Octopus', 'squid', 'g', 0.00895, '$/g', true, '5 KG', 'carton', 44.75, null, '["squid","calamari"]'::jsonb, null, null, null, false),
  ('P0339', 'Star Anise', 'Pandaroo', 'HERBS  SPICES & SEASONINGS', 'Herbs & Spices Dried', null, 'g', 0.049, '$/g', true, '100 GR', 'packet', 4.9, null, '[]'::jsonb, null, null, null, false),
  ('P0340', 'Stirrers Wooden Drink', 'Caterers Choice', 'MISCELLANEOUS', 'Stirrers', null, 'ea', 0.0056, '$/unit', true, '1000''S', 'packet', 5.6, null, '[]'::jsonb, null, null, null, false),
  ('P0341', 'Stock Vegetable Gourmet All Purpose', 'Vegeta', 'SOUPS & STOCKS', 'Stocks  Boullions & Boosters', null, 'g', 0.01408, '$/g', true, '1 KG', 'can', 14.08, null, '[]'::jsonb, null, null, null, false),
  ('P0342', 'Straws Paper Bamboo Patterned Jumbo Wrapped', 'Caterers Choice', 'MISCELLANEOUS', 'Straws', null, 'ea', 0.0348, '$/unit', true, '250''S', 'packet', 8.69, null, '[]'::jsonb, null, null, null, false),
  ('P0343', 'Straws Paper White Regular Wrapped', 'Caterers Choice', 'MISCELLANEOUS', 'Straws', null, 'ea', 0.0216, '$/unit', true, '250''S', 'packet', 5.41, null, '[]'::jsonb, null, null, null, false),
  ('P0344', 'Sugar Caster', 'Bundaberg', 'BAKING SUPPLIES', 'Sugar', 'sugar', 'g', 0.00228, '$/g', true, '15 KG', 'bag', 34.25, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0345', 'Sugar P/C Sticks Raw', 'Bundaberg', 'BAKING SUPPLIES', 'Sugar Portion Control', 'sugar', 'g', 0.00415, '$/g', true, '2000 X 3GR', 'carton', 24.89, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0346', 'Sugar P/C Sticks White', 'Bundaberg', 'BAKING SUPPLIES', 'Sugar Portion Control', 'sugar', 'g', 0.00501, '$/g', true, '2000 X 3GR', 'carton', 30.05, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0347', 'Sugar Raw', 'Bundaberg', 'BAKING SUPPLIES', 'Sugar', 'sugar', 'g', 0.0019, '$/g', true, '15 KG', 'bag', 28.43, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0348', 'Sugar White', 'Bundaberg', 'BAKING SUPPLIES', 'Sugar', 'sugar', 'g', 0.0027, '$/g', true, '1 KG', 'packet', 2.7, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0349', 'Sugarcote Cinnamon', 'Allied', 'BAKING SUPPLIES', 'Sugar', 'sugar', 'g', 0.00769, '$/g', true, '2 KG', 'packet', 15.38, null, '["sugar"]'::jsonb, null, null, null, false),
  ('P0350', 'Sweetener P/C Pencil Sticks', 'Equal', 'BAKING SUPPLIES', 'Sugar Substitutes', null, 'ea', 0.0604, '$/unit', true, '500''S', 'carton', 30.18, null, '[]'::jsonb, null, null, null, false),
  ('P0351', 'Syrup Butterscotch', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', 'butter', 'ml', 0.01532, '$/ml', true, '750 ML', 'bottle', 11.49, null, '["butter"]'::jsonb, null, null, null, false),
  ('P0352', 'Syrup Caramel', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.01175, '$/ml', true, '1.5 LT', 'bottle', 17.63, null, '[]'::jsonb, null, null, null, false),
  ('P0353', 'Syrup Golden Turmeric Elixir', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.02619, '$/ml', true, '750 ML', 'bottle', 19.64, null, '[]'::jsonb, null, null, null, false),
  ('P0354', 'Syrup Hazelnut', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.01536, '$/ml', true, '750 ML', 'bottle', 11.52, null, '[]'::jsonb, null, null, null, false),
  ('P0355', 'Syrup Matcha Concentrate', 'Perfect Matcha', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.03207, '$/ml', true, '750 ML', 'bottle', 24.05, null, '[]'::jsonb, null, null, null, false),
  ('P0356', 'Syrup Mumbai Chai Organic', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.02207, '$/ml', true, '750 ML', 'bottle', 16.55, null, '[]'::jsonb, null, null, null, false),
  ('P0357', 'Syrup Vanilla', 'Alchemy', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.01175, '$/ml', true, '1.5 LT', 'bottle', 17.63, null, '[]'::jsonb, null, null, null, false),
  ('P0358', 'Tart Blueberry & Almond Pre Cut 16''S 1-105', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', null, 'g', 0.0344, '$/g', true, '1.64 KG', 'each', 56.42, null, '[]'::jsonb, null, null, null, false),
  ('P0359', 'Tart Citrus 1-022', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', null, 'g', 0.02897, '$/g', true, '1.6 KG', 'each', 46.35, null, '[]'::jsonb, null, null, null, false),
  ('P0360', 'Tart Citrus Individual 1-224', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', null, 'g', 0.02929, '$/g', true, '6 X 125GR', 'tray', 21.97, null, '[]'::jsonb, null, null, null, false),
  ('P0361', 'Tart Lemon Meringue 1-720', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', null, 'g', 0.02891, '$/g', true, '1.75 KG', 'each', 50.59, null, '[]'::jsonb, null, null, null, false),
  ('P0362', 'Tart Lemon Meringue Individual 1-344', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', null, 'g', 0.0408, '$/g', true, '6 X 100GR', 'tray', 24.48, null, '[]'::jsonb, null, null, null, false),
  ('P0363', 'Tart P/C Banoffee', 'Spoon Wholesale', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.0266, '$/g', true, '8 X 135GR', 'tray', 28.73, null, '[]'::jsonb, null, null, null, false),
  ('P0364', 'Tart P/C Chocolate Salted Caramel 1-858', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', 'salt', 'g', 0.03582, '$/g', true, '6 X 108GR', 'tray', 23.21, null, '["salt"]'::jsonb, null, null, null, false),
  ('P0365', 'Tart P/C Citron', 'Spoon Wholesale', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.0263, '$/g', true, '8 X 135GR', 'tray', 28.4, null, '[]'::jsonb, null, null, null, false),
  ('P0366', 'Tart P/C Citrus Gluten Free 1-316', 'Priestleys', 'DESSERTS', 'Tarts  Crumbles & Pies', null, 'g', 0.02774, '$/g', true, '6 X 149GR', 'tray', 24.8, null, '[]'::jsonb, null, null, null, false),
  ('P0367', 'Tart P/C Passionfruit', 'Spoon Wholesale', 'DESSERTS', 'Cake Portions & Individuals', null, 'g', 0.0263, '$/g', true, '8 X 135GR', 'tray', 28.4, null, '[]'::jsonb, null, null, null, false),
  ('P0368', 'Tea Bags Env Earl Grey', 'Dilmah', 'BEVERAGES', 'Tea - Bags And Leaf', 'tea', 'ea', 0.1224, '$/unit', true, '500''S', 'carton', 61.21, null, '["tea"]'::jsonb, null, null, null, false),
  ('P0369', 'Tea Bags Env English Breakfast', 'Dilmah', 'BEVERAGES', 'Tea - Bags And Leaf', 'tea', 'ea', 0.1185, '$/unit', true, '500''S', 'carton', 59.26, null, '["tea"]'::jsonb, null, null, null, false),
  ('P0370', 'Tea Bags Env Peppermint', 'Dilmah', 'BEVERAGES', 'Tea - Bags And Leaf', 'pepper', 'ea', 0.1224, '$/unit', true, '500''S', 'carton', 61.21, null, '["pepper"]'::jsonb, null, null, null, false),
  ('P0371', 'Thermometer Probe Wipes', 'Fildes', 'MISCELLANEOUS', 'Thermometers', null, 'ea', 0.0985, '$/unit', true, '150''S', 'tub', 14.77, null, '[]'::jsonb, null, null, null, false),
  ('P0372', 'Topping Banana', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0373', 'Topping Blue Heaven', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00381, '$/ml', true, '3 LT', 'bottle', 11.44, null, '[]'::jsonb, null, null, null, false),
  ('P0374', 'Topping Caramel', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0375', 'Topping Chocolate', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0376', 'Topping Cookies & Cream', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', 'cream', 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '["cream"]'::jsonb, null, null, null, false),
  ('P0377', 'Topping Green Lime', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0378', 'Topping Honeycomb', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0379', 'Topping Mango', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0380', 'Topping Strawberry', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0381', 'Topping Vanilla', 'Edlyn', 'DESSERTS', 'Syrups & Toppings', null, 'ml', 0.00333, '$/ml', true, '3 LT', 'bottle', 9.99, null, '[]'::jsonb, null, null, null, false),
  ('P0382', 'Tortillas Flour 10', 'Caterers Choice', 'BREAD & PASTRY', 'Flat Breads And Wraps', 'tortilla', 'ea', 0.3633, '$/unit', true, '12''S', 'packet', 4.36, null, '["tortilla"]'::jsonb, null, null, null, false),
  ('P0383', 'Tortillas Flour 10"', 'Caterers Choice', 'BREAD & PASTRY', 'Flat Breads And Wraps', 'tortilla', 'ea', 0.3508, '$/unit', true, '12''S', 'packet', 4.21, null, '["tortilla"]'::jsonb, null, null, null, false),
  ('P0384', 'Tortillas Flour 5', 'Mission Foods', 'BREAD & PASTRY', 'Flat Breads And Wraps', 'tortilla', 'ea', 0.2183, '$/unit', true, '12''S', 'packet', 2.62, null, '["tortilla"]'::jsonb, null, null, null, false),
  ('P0385', 'Tortillas Flour 5"', 'Mission Foods', 'BREAD & PASTRY', 'Flat Breads And Wraps', 'tortilla', 'ea', 0.2183, '$/unit', true, '12''S', 'packet', 2.62, null, '["tortilla"]'::jsonb, null, null, null, false),
  ('P0386', 'Tortillas Pumpkin 12', 'Mission Foods', 'BREAD & PASTRY', 'Flat Breads And Wraps', 'tortilla', 'ea', 0.7, '$/unit', true, '12''S', 'packet', 8.4, null, '["tortilla"]'::jsonb, null, null, null, false),
  ('P0387', 'Tortillas Red Beet 12', 'Mission Foods', 'BREAD & PASTRY', 'Flat Breads And Wraps', 'tortilla', 'ea', 0.7, '$/unit', true, '12''S', 'packet', 8.4, null, '["tortilla"]'::jsonb, null, null, null, false),
  ('P0388', 'Vegemite P/C 4.8Gr (One Serve)', 'Vegemite', 'SPREADS', 'Vegemite', null, 'g', 0.04139, '$/g', true, '90 X 4.8GR', 'tray', 17.88, null, '[]'::jsonb, null, null, null, false),
  ('P0389', 'Vinegar White Imitation', 'Edlyn', 'VINEGAR', 'Vinegar Other', 'vinegar', 'ml', 0.00127, '$/ml', true, '4 LT', 'bottle', 5.07, null, '["vinegar"]'::jsonb, null, null, null, false),
  ('P0390', 'Water Coconut Natural', 'Coco Coast', 'BEVERAGES', 'Water Coconut', null, 'ml', 0.00275, '$/ml', true, '1.25 LT', 'bottle', 3.44, null, '[]'::jsonb, null, null, null, false),
  ('P0391', 'Whiting Crumbed Goujons (Msc) (I)', 'Seafrost', 'Fish', 'Crumbed Fish', 'fish', 'g', 0.01164, '$/g', true, '1 KG', 'packet', 11.64, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0392', 'Whiting Tempura Flt Lemon Aust (Seafrost)', 'Local Catch', 'Fish', 'Battered Fish', 'fish', 'g', 0.02428, '$/g', true, '3 KG', 'carton', 72.85, null, '["fish","fillet"]'::jsonb, null, null, null, false),
  ('P0393', 'Wipes Pieces Blue 60 X 60Cm Heavy Duty', 'Cater Clean', 'CLEANING & JANITORIAL', 'Wipes & Cloths', 'pie', 'ea', 0.4985, '$/unit', false, '20''S', 'packet', 9.97, null, '["pie"]'::jsonb, null, null, null, false)
on conflict (id) do nothing;

-- VERIFY AFTER RUNNING:
--
--   select count(*) from public.ingredients;
--     -> expect 413  (393 base + 20 custom; 120 of those ids were already present)
--
--   select count(*) from public.ingredients where is_custom = false;
--     -> expect 393
--
--   select count(*) from public.ingredients where is_custom = true;
--     -> expect 20
--
-- And the one that proves `do nothing` did its job — these two products were edited on
-- 31 Jul and must still carry Max's prices, NOT the literal's:
--
--   select id, description, cost_per_base_unit, updated_at
--     from public.ingredients where id in ('P0007','P0267');
--     -> updated_at must still read 2026-07-31, not today.
--
-- If either row's updated_at has moved to today, the insert overwrote real data: STOP, and
-- restore those two products from the stamped backup export before doing anything else.
