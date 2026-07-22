var loadedPlateId=null,invRows=[],dismissedMatch='',nameTimer=null,publishTargetId=null;
var gemToken=0,gemStatus=null,gemApplied=false,gemCheckStart=0;   // v62: AI second-reader — token discards late/stale responses, status drives the summary note, gemApplied freezes an applied import. v63: gemCheckStart timestamps the "checking" state so the flip to checked/unavailable never flickers (see gemSettle)
const BASE_PRODUCTS = [{"id":"P0001","description":"Apple Pie Grannys Pre Cut 16'S 1-003","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":"pie","search_aliases":["pie"],"base_unit":"g","cost_per_base_unit":0.02478,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"each","current_price_exgst":49.56},{"id":"P0002","description":"Apple Sliced Pie","brand":"Heinz Watties","category":"BAKING SUPPLIES","sub_category":"Fruit Pie Fillings","item_type":"pie","search_aliases":["pie"],"base_unit":"g","cost_per_base_unit":0.00564,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.7 KG","sold_by":"can","current_price_exgst":15.22},{"id":"P0003","description":"Apple Sliced Pie Granny Smith Bakers Choice","brand":"Spc","category":"BAKING SUPPLIES","sub_category":"Fruit Pie Fillings","item_type":"pie","search_aliases":["pie"],"base_unit":"g","cost_per_base_unit":0.00573,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.75 KG","sold_by":"can","current_price_exgst":15.75},{"id":"P0004","description":"Bacon Middle Rindless Gas Flushed (Qld)","brand":"Caterers Choice","category":"SMALLGOODS","sub_category":"Bacon Rashers","item_type":"bacon","search_aliases":["bacon","rasher"],"base_unit":"g","cost_per_base_unit":0.0122,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.5 KG","sold_by":"packet","current_price_exgst":30.5},{"id":"P0005","description":"Bags Garbage Prem 72-80Lt Black","brand":"Cater Clean","category":"CLEANING & JANITORIAL","sub_category":"Bins And Bin Liners","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.1984,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"25'S","sold_by":"packet","current_price_exgst":4.96},{"id":"P0006","description":"Bags Paper 4 Flat White","brand":"Ozbag","category":"PACKAGING","sub_category":"White Paper Bags","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0393,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"500'S","sold_by":"bundle","current_price_exgst":19.64},{"id":"P0007","description":"Baked Beans","brand":"Sandhurst","category":"READY MEALS","sub_category":"Baked Beans & Spaghetti","item_type":"baked beans","search_aliases":["baked beans"],"base_unit":"g","cost_per_base_unit":0.00333,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.7 KG","sold_by":"can","current_price_exgst":8.98},{"id":"P0008","description":"Baked Beans In Tomato Sauce","brand":"Alfinas","category":"READY MEALS","sub_category":"Baked Beans & Spaghetti","item_type":"baked beans","search_aliases":["baked beans"],"base_unit":"g","cost_per_base_unit":0.00305,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.7 KG","sold_by":"can","current_price_exgst":8.23},{"id":"P0009","description":"Baking Powder","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Baking Powder","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00978,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":19.55},{"id":"P0010","description":"Barramundi Flt 100/200 S/Less","brand":"Seacrest","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.01657,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":82.83},{"id":"P0011","description":"Barramundi Flt 100/200 S/Less (I)","brand":"Seacrest","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.01657,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":82.83},{"id":"P0012","description":"Basa Flt 140/170 Shatter Pack S&B (I)","brand":"Seafrost","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.00761,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":38.03},{"id":"P0013","description":"Bay Leaves","brand":"Caterers Choice","category":"HERBS  SPICES & SEASONINGS","sub_category":"Herbs & Spices Dried","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0518,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 GR","sold_by":"packet","current_price_exgst":5.18},{"id":"P0014","description":"Beef Cube Roll 100Gr","brand":"Choice Cut","category":"BEEF PORTIONED","sub_category":"Beef Cube/Scotch Fillet","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03086,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 X 100GR","sold_by":"packet","current_price_exgst":30.86},{"id":"P0015","description":"Beef Sandwich Steak 100Gr","brand":"Choice Cut","category":"BEEF PORTIONED","sub_category":"Beef Other","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02989,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":29.89},{"id":"P0016","description":"Beetroot Sliced","brand":"Dewfresh","category":"VEGETABLES","sub_category":"Vegetable Prepared","item_type":"vegetable","search_aliases":["vegetable"],"base_unit":"g","cost_per_base_unit":0.00311,"cost_basis":"$/g","is_food":true,"pack_size_raw":"3 KG","sold_by":"can","current_price_exgst":9.32},{"id":"P0017","description":"Berries Mixed Iqf","brand":"Caterers Choice","category":"FRUIT","sub_category":"Frozen Fruit","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01013,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bag","current_price_exgst":10.13},{"id":"P0018","description":"Biscuit Crumbs Oreo With Creme","brand":"Oreo","category":"BISCUITS","sub_category":"Biscuit Base & Crumbs","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00989,"cost_basis":"$/g","is_food":true,"pack_size_raw":"454 GR","sold_by":"packet","current_price_exgst":4.49},{"id":"P0019","description":"Biscuits Chocolate Ripple","brand":"Arnotts","category":"BISCUITS","sub_category":"Biscuits Sweet","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01204,"cost_basis":"$/g","is_food":true,"pack_size_raw":"250 GR","sold_by":"packet","current_price_exgst":3.01},{"id":"P0020","description":"Biscuits P/C Biscoff Classic Wrapped","brand":"Lotus","category":"BISCUITS","sub_category":"Biscuits Portion Control","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0998,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"50'S","sold_by":"packet","current_price_exgst":4.99},{"id":"P0021","description":"Biscuits P/C Caramelised Traditional Belgian","brand":"Little Bakes","category":"BISCUITS","sub_category":"Biscuits Portion Control","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01738,"cost_basis":"$/g","is_food":true,"pack_size_raw":"300 X 6GR","sold_by":"carton","current_price_exgst":31.29},{"id":"P0022","description":"Biscuits Vanilla Beans","brand":"Mother Meg'S","category":"BISCUITS","sub_category":"Biscuits Sweet","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02958,"cost_basis":"$/g","is_food":true,"pack_size_raw":"500 GR","sold_by":"packet","current_price_exgst":14.79},{"id":"P0023","description":"Bread Banana Pre Cut Gluten Free 1-171","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Sweet Bread/Rolls/Buns","item_type":"bread","search_aliases":["bread"],"base_unit":"ea","cost_per_base_unit":2.6467,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"each","current_price_exgst":31.76},{"id":"P0024","description":"Bread Buns Burger Large Gluten Free","brand":"Mission Foods","category":"BREAD & PASTRY","sub_category":"Rolls Buns & Sticks","item_type":"bun","search_aliases":["bun"],"base_unit":"g","cost_per_base_unit":0.02565,"cost_basis":"$/g","is_food":true,"pack_size_raw":"20 X 140GR","sold_by":"carton","current_price_exgst":71.81},{"id":"P0025","description":"Bread Buns Burger White Vegan Gluten Free","brand":"La'Bakehouse Ex","category":"BREAD & PASTRY","sub_category":"Rolls Buns & Sticks","item_type":"bun","search_aliases":["bun"],"base_unit":"g","cost_per_base_unit":0.02755,"cost_basis":"$/g","is_food":true,"pack_size_raw":"18 X 108GR","sold_by":"carton","current_price_exgst":53.55},{"id":"P0026","description":"Bread Buns Milk 4.5","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Rolls Buns & Sticks","item_type":"milk","search_aliases":["milk"],"base_unit":"g","cost_per_base_unit":0.01277,"cost_basis":"$/g","is_food":true,"pack_size_raw":"48 X 85GR","sold_by":"carton","current_price_exgst":52.12},{"id":"P0027","description":"Bread Rolls Hot Dog 7  (9611)","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Rolls Buns & Sticks","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.0121,"cost_basis":"$/g","is_food":true,"pack_size_raw":"54 X 75GR","sold_by":"carton","current_price_exgst":49.01},{"id":"P0028","description":"Bread Sliced Multigrain Foodservice","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Bread Loaves","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00657,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 700GR","sold_by":"carton","current_price_exgst":27.6},{"id":"P0029","description":"Bread Sliced Super Thick Raisin","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Sweet Bread/Rolls/Buns","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.01199,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 600GR","sold_by":"carton","current_price_exgst":43.16},{"id":"P0030","description":"Bread Sliced Super Thick White","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Bread Loaves","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00657,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 700GR","sold_by":"carton","current_price_exgst":27.6},{"id":"P0031","description":"Bread Sliced White Foodservice","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Bread Loaves","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00657,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 700GR","sold_by":"carton","current_price_exgst":27.58},{"id":"P0032","description":"Bread Sliced Wholemeal Foodservice","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Bread Loaves","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00633,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 700GR","sold_by":"carton","current_price_exgst":26.57},{"id":"P0033","description":"Bread Sourdough Endless Sliced Vegan","brand":"Flourshop","category":"BREAD & PASTRY","sub_category":"Bread Sourdough","item_type":"sourdough","search_aliases":["sourdough"],"base_unit":"g","cost_per_base_unit":0.00692,"cost_basis":"$/g","is_food":true,"pack_size_raw":"9 X 900GR","sold_by":"carton","current_price_exgst":56.09},{"id":"P0034","description":"Bread Sourdough Sliced Cafe Style","brand":"Bakers Maison","category":"BREAD & PASTRY","sub_category":"Bread Sourdough","item_type":"sourdough","search_aliases":["sourdough"],"base_unit":"g","cost_per_base_unit":0.00438,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 1.2KG","sold_by":"carton","current_price_exgst":42.0},{"id":"P0035","description":"Bread Turkish Long","brand":"Nomad Breads","category":"BREAD & PASTRY","sub_category":"Bread Turkish","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00668,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 450GR","sold_by":"carton","current_price_exgst":36.08},{"id":"P0036","description":"Bread White Gluten Free","brand":"Abbotts","category":"BREAD & PASTRY","sub_category":"Bread Loaves","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.02071,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 500GR","sold_by":"carton","current_price_exgst":62.12},{"id":"P0037","description":"Breadcrumbs Coarse","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Breadcrumbs","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00315,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 KG","sold_by":"bag","current_price_exgst":31.54},{"id":"P0038","description":"Breadcrumbs Fine","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Breadcrumbs","item_type":"bread","search_aliases":["bread"],"base_unit":"g","cost_per_base_unit":0.00317,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 KG","sold_by":"bag","current_price_exgst":31.72},{"id":"P0039","description":"Buns Burger Potato 4.5  Sliced","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Rolls Buns & Sticks","item_type":"bun","search_aliases":["bun"],"base_unit":"g","cost_per_base_unit":0.01307,"cost_basis":"$/g","is_food":true,"pack_size_raw":"48 X 85GR","sold_by":"carton","current_price_exgst":53.33},{"id":"P0040","description":"Burger Patties Beef Angus Frz","brand":"Bounty Premium","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Burger Patties - Beef","item_type":"patty","search_aliases":["patty","pattie","burger"],"base_unit":"g","cost_per_base_unit":0.01426,"cost_basis":"$/g","is_food":true,"pack_size_raw":"36 X 150GR","sold_by":"carton","current_price_exgst":76.99},{"id":"P0041","description":"Burger Patties Beef Gourmet Gluten Free","brand":"Angel Bay","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Burger Patties - Beef","item_type":"patty","search_aliases":["patty","pattie","burger"],"base_unit":"g","cost_per_base_unit":0.01443,"cost_basis":"$/g","is_food":true,"pack_size_raw":"60 X 120GR","sold_by":"carton","current_price_exgst":103.91},{"id":"P0042","description":"Burger Patties Beef Par Cooked Homestyle","brand":"Angel Bay","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Burger Patties - Beef","item_type":"patty","search_aliases":["patty","pattie","burger"],"base_unit":"g","cost_per_base_unit":0.01406,"cost_basis":"$/g","is_food":true,"pack_size_raw":"22 X 120GR","sold_by":"sleeve","current_price_exgst":37.12},{"id":"P0043","description":"Burger Patties Breakfast Beef Sausage Par Cook","brand":"Angel Bay","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Burger Patties - Beef","item_type":"patty","search_aliases":["patty","pattie","burger"],"base_unit":"g","cost_per_base_unit":0.01664,"cost_basis":"$/g","is_food":true,"pack_size_raw":"80 X 50GR","sold_by":"carton","current_price_exgst":66.55},{"id":"P0044","description":"Burger Patties Breakfast Sausage","brand":"Butlers","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Burger Patties - Beef","item_type":"patty","search_aliases":["patty","pattie","burger"],"base_unit":"g","cost_per_base_unit":0.01993,"cost_basis":"$/g","is_food":true,"pack_size_raw":"81 X 45GR","sold_by":"carton","current_price_exgst":72.65},{"id":"P0045","description":"Burger Patties Vegetable","brand":"I & J","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Burger Patties - Other","item_type":"patty","search_aliases":["patty","pattie","burger"],"base_unit":"g","cost_per_base_unit":0.01252,"cost_basis":"$/g","is_food":true,"pack_size_raw":"36 X 113.5GR","sold_by":"carton","current_price_exgst":51.17},{"id":"P0046","description":"Butter P/C","brand":"Lurpak","category":"DAIRY","sub_category":"Butter Portion Control","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.02256,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 8GR","sold_by":"tray","current_price_exgst":18.05},{"id":"P0047","description":"Butter Salted","brand":"Yarde Farm","category":"DAIRY","sub_category":"Butter","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.01548,"cost_basis":"$/g","is_food":true,"pack_size_raw":"500 GR","sold_by":"pat","current_price_exgst":7.74},{"id":"P0048","description":"Butter Unsalted","brand":"Yarde Farm","category":"DAIRY","sub_category":"Butter","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.01646,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"block","current_price_exgst":24.69},{"id":"P0049","description":"Cajun Spice","brand":"Caterers Choice","category":"HERBS  SPICES & SEASONINGS","sub_category":"Herbs & Spices Dried","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02351,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":23.51},{"id":"P0050","description":"Cake Caramel Sin Pre Cut 16'S 1-298","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0238,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.61 KG","sold_by":"each","current_price_exgst":62.13},{"id":"P0051","description":"Cake Celestial Mud Pre Cut 16'S Gluten Free 1-861","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02178,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.85 KG","sold_by":"each","current_price_exgst":62.06},{"id":"P0052","description":"Cake Chocolate Bavarian Tray","brand":"Sara Lee","category":"DESSERTS","sub_category":"Cheesecakes & Bavarians","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0202,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.15 KG","sold_by":"tray","current_price_exgst":23.23},{"id":"P0053","description":"Cake Hummingbird Pre Cut 16'S 1-238","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02234,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.65 KG","sold_by":"each","current_price_exgst":59.2},{"id":"P0054","description":"Cake Lemon Pistachio 1-750","brand":"Priestleys","category":"DESSERTS","sub_category":"Cakes - Whole & Gateau","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0234,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.24 KG","sold_by":"each","current_price_exgst":52.42},{"id":"P0055","description":"Cake Lemon Tray","brand":"Johnathon Jones","category":"DESSERTS","sub_category":"Cake Trays","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0163,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.8 KG","sold_by":"tray","current_price_exgst":29.34},{"id":"P0056","description":"Cake Nero Mud Pre Cut 16'S 1-208","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02317,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.274 KG","sold_by":"each","current_price_exgst":52.68},{"id":"P0057","description":"Cake Orange & Almond Pre Cut 16'S Gluten/Dairy Fre","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03015,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.05 KG","sold_by":"each","current_price_exgst":61.81},{"id":"P0058","description":"Cake P/C Caramel Sticky Date 1-152","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02634,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 120GR","sold_by":"tray","current_price_exgst":25.29},{"id":"P0059","description":"Cake P/C Caramel Sticky Date Gluten Free 1-614","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03077,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 113GR","sold_by":"tray","current_price_exgst":27.82},{"id":"P0060","description":"Cake P/C Carrot & Ginger Gluten Free","brand":"Scottish Baker","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0258,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 140GR","sold_by":"tray","current_price_exgst":43.34},{"id":"P0061","description":"Cake P/C Choc Brownie With Raspberry Frosting G/Fr","brand":"Scottish Baker","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02574,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 150GR","sold_by":"tray","current_price_exgst":46.34},{"id":"P0062","description":"Cake P/C Lemon With Blueberry Frosting Gluten Free","brand":"Scottish Baker","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02433,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 150GR","sold_by":"tray","current_price_exgst":43.8},{"id":"P0063","description":"Cake P/C Matcha Strawberry Gluten Free 1-619","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03622,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 96GR","sold_by":"tray","current_price_exgst":27.82},{"id":"P0064","description":"Cake P/C Orange & Almond Gluten & Dairy Free 1-662","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.04025,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 95GR","sold_by":"tray","current_price_exgst":30.59},{"id":"P0065","description":"Cake P/C Pear & Walnut Gluten & Dairy Free","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03311,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 115GR","sold_by":"tray","current_price_exgst":30.46},{"id":"P0066","description":"Cake P/C Sticky Date Individuals","brand":"Perfect Portion","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01597,"cost_basis":"$/g","is_food":true,"pack_size_raw":"40 X 80GR","sold_by":"tray","current_price_exgst":51.09},{"id":"P0067","description":"Cake Pear & Raspberry Pre Cut 16'S Gluten Free","brand":"Homebush Cakes","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03443,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"each","current_price_exgst":51.64},{"id":"P0068","description":"Cake Red Velvet Pre Cut 16'S 1-862","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.028,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.22 KG","sold_by":"each","current_price_exgst":62.17},{"id":"P0069","description":"Cake Tiramisu Slice 1-321","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Trays","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02237,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.9 KG","sold_by":"tray","current_price_exgst":42.5},{"id":"P0070","description":"Cake Toppings Non Pareils","brand":"Windsor Farm","category":"BAKING SUPPLIES","sub_category":"Cake Decorations","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01061,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bag","current_price_exgst":10.61},{"id":"P0071","description":"Cake White Chocolate & Raspberry Tray","brand":"Johnathon Jones","category":"DESSERTS","sub_category":"Cake Trays","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01554,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"tray","current_price_exgst":31.08},{"id":"P0072","description":"Cheese Cream Express Professional","brand":"Dairy Farmers","category":"DAIRY","sub_category":"Cheese Cream","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.00941,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":18.81},{"id":"P0073","description":"Cheese Fetta Danish","brand":"Wombat Valley","category":"DAIRY","sub_category":"Cheese Fetta","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01098,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"bucket","current_price_exgst":21.96},{"id":"P0074","description":"Cheese Halloumi Block Cyprus","brand":"Kalos","category":"DAIRY","sub_category":"Cheese Specialty","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02355,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":23.55},{"id":"P0075","description":"Cheese Haloumi Block Cyprus","brand":"Kalos","category":"DAIRY","sub_category":"Cheese Specialty","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02355,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":23.55},{"id":"P0076","description":"Cheese Mozzarella Shredded","brand":"Yarde Farm","category":"DAIRY","sub_category":"Cheese Mozzarella","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.0115,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":23.0},{"id":"P0077","description":"Cheese Mozzarella Shredded Pizza White","brand":"Alfinas","category":"DAIRY","sub_category":"Cheese Mozzarella","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01149,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":22.98},{"id":"P0078","description":"Cheese Slices Haloumi Block Cyprus","brand":"Kalos","category":"DAIRY","sub_category":"Cheese Specialty","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02654,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":26.54},{"id":"P0079","description":"Cheese Slices Tasty 105'S","brand":"Yarde Farm","category":"DAIRY","sub_category":"Cheese Slices & Cubes","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01419,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"packet","current_price_exgst":21.29},{"id":"P0080","description":"Cheese Slices Tasty 90'S","brand":"Yarde Farm","category":"DAIRY","sub_category":"Cheese Slices & Cubes","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01411,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"packet","current_price_exgst":21.17},{"id":"P0081","description":"Cheese Slices Tasty Natural 90'S","brand":"Mainland","category":"DAIRY","sub_category":"Cheese Slices & Cubes","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01547,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"packet","current_price_exgst":23.2},{"id":"P0082","description":"Cheesecake Caramel Swirl Pre Cut 16'S 1-736","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.0223,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.6 KG","sold_by":"each","current_price_exgst":57.97},{"id":"P0083","description":"Cheesecake Chunky Chocolate Pre Cut 16'S 1-293","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02536,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.18 KG","sold_by":"each","current_price_exgst":55.29},{"id":"P0084","description":"Cheesecake Lime Swirl Pre Cut 16'S 1-281","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.0263,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.16 KG","sold_by":"each","current_price_exgst":56.81},{"id":"P0085","description":"Cheesecake Mixed Berry Cream Tray","brand":"Sara Lee","category":"DESSERTS","sub_category":"Cheesecakes & Bavarians","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01784,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.35 KG","sold_by":"tray","current_price_exgst":24.08},{"id":"P0086","description":"Cheesecake P/C Blueberry 1-280","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.03791,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 100GR","sold_by":"tray","current_price_exgst":30.33},{"id":"P0087","description":"Cheesecake P/C Cookies & Cream 1-334","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.0321,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 120GR","sold_by":"tray","current_price_exgst":30.82},{"id":"P0088","description":"Cheesecake P/C Loaded Salted Caramel Flourless","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.0273,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 160GR","sold_by":"tray","current_price_exgst":34.95},{"id":"P0089","description":"Cheesecake P/C New York Vanilla Flourless","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02913,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 150GR","sold_by":"tray","current_price_exgst":34.95},{"id":"P0090","description":"Cheesecake P/C Strawberries & Cream Flourless","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02831,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 150GR","sold_by":"tray","current_price_exgst":33.97},{"id":"P0091","description":"Cheesecake P/C Strawberry Tart Gluten Free 1-840","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.03981,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 105GR","sold_by":"tray","current_price_exgst":25.08},{"id":"P0092","description":"Cheesecake Passionfruit Pre Cut 16'S 1-290","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02202,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.5 KG","sold_by":"each","current_price_exgst":55.04},{"id":"P0093","description":"Cheesecake Peach Mango Tray","brand":"Sara Lee","category":"DESSERTS","sub_category":"Cheesecakes & Bavarians","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01784,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.35 KG","sold_by":"tray","current_price_exgst":24.08},{"id":"P0094","description":"Cheesecake Raspberry New York Pre Cut 16'S 1-286","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecake Portioned","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.02455,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.5 KG","sold_by":"each","current_price_exgst":61.37},{"id":"P0095","description":"Cheesecake Strawberry Sponge Tray 1-176","brand":"Priestleys","category":"DESSERTS","sub_category":"Cheesecakes & Bavarians","item_type":"cheese","search_aliases":["cheese"],"base_unit":"g","cost_per_base_unit":0.01484,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.72 KG","sold_by":"tray","current_price_exgst":25.53},{"id":"P0096","description":"Chicken Breast Flts Raw Frozen","brand":"Farmyard Chicke","category":"POULTRY WHOLE & CUTS","sub_category":"Chicken Breast","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00775,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":15.5},{"id":"P0097","description":"Chicken Breast Oven Roasted Sliced","brand":"Carols","category":"POULTRY FURTHER PROCESSED","sub_category":"Cooked Meat","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01481,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":14.81},{"id":"P0098","description":"Chicken Meat Breast Cooked & Diced","brand":"Steggles","category":"POULTRY FURTHER PROCESSED","sub_category":"Breast Products","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0199,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":19.9},{"id":"P0099","description":"Chicken Meat Sliced Roasted (Strips)","brand":"Ingham","category":"POULTRY FURTHER PROCESSED","sub_category":"Cooked Meat","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01673,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":16.73},{"id":"P0100","description":"Chicken Nuggets Breast Tempura","brand":"Ingham","category":"FINGER & SNACK FOODS","sub_category":"Chicken Products","item_type":"nugget","search_aliases":["nugget"],"base_unit":"g","cost_per_base_unit":0.01228,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":12.28},{"id":"P0101","description":"Chicken Nuggets Breast Tempura Bulk","brand":"Ingham","category":"FINGER & SNACK FOODS","sub_category":"Chicken Products","item_type":"nugget","search_aliases":["nugget"],"base_unit":"g","cost_per_base_unit":0.01086,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 X 2.5KG","sold_by":"carton","current_price_exgst":54.3},{"id":"P0102","description":"Chicken Nuggets Gluten Free Coating","brand":"Ingham","category":"FINGER & SNACK FOODS","sub_category":"Chicken Products","item_type":"nugget","search_aliases":["nugget"],"base_unit":"g","cost_per_base_unit":0.01469,"cost_basis":"$/g","is_food":true,"pack_size_raw":"45 X 22GR","sold_by":"packet","current_price_exgst":14.54},{"id":"P0103","description":"Chicken Pulled Cooked Frz","brand":"Naturalaz","category":"POULTRY FURTHER PROCESSED","sub_category":"Cooked Meat","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01849,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":18.49},{"id":"P0104","description":"Chiko Rolls 170Gr","brand":"Chiko","category":"FINGER & SNACK FOODS","sub_category":"Snack Foods","item_type":"chiko roll","search_aliases":["chiko roll"],"base_unit":"g","cost_per_base_unit":0.00788,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":15.76},{"id":"P0105","description":"Chilli Con Carne","brand":"Hermans","category":"READY MEALS","sub_category":"Beef","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01172,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"bag","current_price_exgst":23.44},{"id":"P0106","description":"Chipolatas Pork","brand":"Primo","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Chipolatas","item_type":"sausage","search_aliases":["sausage","snag"],"base_unit":"g","cost_per_base_unit":0.01248,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"packet","current_price_exgst":18.72},{"id":"P0107","description":"Chips 10Mm Crispy Coated Fries","brand":"Farm Frites","category":"POTATO PRODUCTS","sub_category":"Chips Specialty","item_type":"chips","search_aliases":["chips","fries"],"base_unit":"g","cost_per_base_unit":0.00481,"cost_basis":"$/g","is_food":true,"pack_size_raw":"4 X 2.5KG","sold_by":"carton","current_price_exgst":48.13},{"id":"P0108","description":"Chips 10Mm Straight Cut","brand":"Safries","category":"POTATO PRODUCTS","sub_category":"Fries & Chips","item_type":"chips","search_aliases":["chips","fries"],"base_unit":"g","cost_per_base_unit":0.00263,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 2.5KG","sold_by":"carton","current_price_exgst":39.5},{"id":"P0109","description":"Chips 10Mm Supa Crunch Delivery","brand":"Edgell","category":"POTATO PRODUCTS","sub_category":"Chips Specialty","item_type":"chips","search_aliases":["chips","fries"],"base_unit":"g","cost_per_base_unit":0.00451,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 2KG","sold_by":"carton","current_price_exgst":54.06},{"id":"P0110","description":"Chips 12Mm Traditional Takeaway","brand":"Farm Frites","category":"POTATO PRODUCTS","sub_category":"Fries & Chips","item_type":"chips","search_aliases":["chips","fries"],"base_unit":"g","cost_per_base_unit":0.0026,"cost_basis":"$/g","is_food":true,"pack_size_raw":"4 X 2.5KG","sold_by":"carton","current_price_exgst":26.0},{"id":"P0111","description":"Chocolate Buttons Dark Compound","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Chocolate Cooking","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01529,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":15.29},{"id":"P0112","description":"Chocolate Buttons Milk Compound","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Chocolate Cooking","item_type":"milk","search_aliases":["milk"],"base_unit":"g","cost_per_base_unit":0.01529,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":15.29},{"id":"P0113","description":"Chocolate Buttons White","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Chocolate Cooking","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01589,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":15.89},{"id":"P0114","description":"Chocolate Drinking Cafe Blend","brand":"Cadbury","category":"BEVERAGES","sub_category":"Chocolate Drinking","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01226,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.75 KG","sold_by":"jar","current_price_exgst":21.45},{"id":"P0115","description":"Chorizo (App 2Kg)","brand":"Sunvalley Fine","category":"SMALLGOODS","sub_category":"Salami","item_type":"sausage","search_aliases":["sausage","snag"],"base_unit":"unknown","cost_per_base_unit":null,"cost_basis":"needs review","is_food":true,"pack_size_raw":"KG","sold_by":"kg","current_price_exgst":14.67},{"id":"P0116","description":"Chorizo Spanish","brand":"Hans","category":"SMALLGOODS","sub_category":"Salami","item_type":"sausage","search_aliases":["sausage","snag"],"base_unit":"g","cost_per_base_unit":0.01832,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":36.63},{"id":"P0117","description":"Cinnamon Ground","brand":"Caterers Choice","category":"HERBS  SPICES & SEASONINGS","sub_category":"Herbs & Spices Dried","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01494,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":14.94},{"id":"P0118","description":"Cinnamon Quills","brand":"Galaxy","category":"HERBS  SPICES & SEASONINGS","sub_category":"Herbs & Spices Dried","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.14327,"cost_basis":"$/g","is_food":true,"pack_size_raw":"150 GR","sold_by":"jar","current_price_exgst":21.49},{"id":"P0119","description":"Cleaner Coffee Espresso Machine Powder","brand":"Aurora","category":"CLEANING & JANITORIAL","sub_category":"Cleaners Coffee Espresso Machines","item_type":"coffee","search_aliases":["coffee"],"base_unit":"g","cost_per_base_unit":0.05464,"cost_basis":"$/g","is_food":false,"pack_size_raw":"1 KG","sold_by":"tub","current_price_exgst":54.64},{"id":"P0120","description":"Clingwrap Dispenser","brand":"Caterers Choice","category":"PACKAGING","sub_category":"Clingwrap","item_type":null,"search_aliases":[],"base_unit":"dim","cost_per_base_unit":null,"cost_basis":"needs review","is_food":false,"pack_size_raw":"600M X 45CM","sold_by":"roll","current_price_exgst":22.5},{"id":"P0121","description":"Cocoa Powder","brand":"Caterers Choice","category":"BEVERAGES","sub_category":"Cocoa","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02779,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":27.79},{"id":"P0122","description":"Container Food 3.15Lt Storage","brand":"Catermart","category":"PACKAGING","sub_category":"Food Containers","item_type":null,"search_aliases":[],"base_unit":"unknown","cost_per_base_unit":null,"cost_basis":"needs review","is_food":false,"pack_size_raw":"EA","sold_by":"each","current_price_exgst":1.41},{"id":"P0123","description":"Container Rectangle Rib 1000Ml T/Away Clear Frz Gd","brand":"Genfac","category":"PACKAGING","sub_category":"Rectangular Takeaway Containers","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.1548,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"50'S","sold_by":"sleeve","current_price_exgst":7.74},{"id":"P0124","description":"Cookies Choc Chip Double","brand":"Allied","category":"BISCUITS","sub_category":"Cookies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01411,"cost_basis":"$/g","is_food":true,"pack_size_raw":"56 X 50GR","sold_by":"carton","current_price_exgst":39.51},{"id":"P0125","description":"Cookies M & Ms","brand":"Allied","category":"BISCUITS","sub_category":"Cookies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01411,"cost_basis":"$/g","is_food":true,"pack_size_raw":"56 X 50GR","sold_by":"carton","current_price_exgst":39.51},{"id":"P0126","description":"Cornjacks 120Gr","brand":"Chiko","category":"FINGER & SNACK FOODS","sub_category":"Snack Foods","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01019,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.44 KG","sold_by":"packet","current_price_exgst":14.68},{"id":"P0127","description":"Crab Balls","brand":"Tasty","category":"Value Added","sub_category":"Seafood Value Added","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00972,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":9.72},{"id":"P0128","description":"Cream Culinary (Cooking)","brand":"Anchor","category":"DAIRY","sub_category":"Cream","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.00999,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":9.99},{"id":"P0129","description":"Cream Culinary Australian","brand":"Pauls","category":"DAIRY","sub_category":"Cream","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.00781,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":7.81},{"id":"P0130","description":"Cream Thickened Cooking","brand":"Dairy Farmers","category":"DAIRY","sub_category":"Cream","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.00682,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"2 LT","sold_by":"bottle","current_price_exgst":13.64},{"id":"P0131","description":"Cream Whipped Aerosol","brand":"Anchor","category":"DAIRY","sub_category":"Cream","item_type":"cream","search_aliases":["cream"],"base_unit":"g","cost_per_base_unit":0.02235,"cost_basis":"$/g","is_food":true,"pack_size_raw":"400 GR","sold_by":"can","current_price_exgst":8.94},{"id":"P0132","description":"Croissants Butter Extra Large F/B","brand":"Sara Lee","category":"BREAD & PASTRY","sub_category":"Croissants","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.01741,"cost_basis":"$/g","is_food":true,"pack_size_raw":"24 X 110GR","sold_by":"carton","current_price_exgst":45.95},{"id":"P0133","description":"Croissants Butter Large Bent F/B","brand":"Bakers Maison","category":"BREAD & PASTRY","sub_category":"Croissants","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.01303,"cost_basis":"$/g","is_food":true,"pack_size_raw":"40 X 95GR","sold_by":"carton","current_price_exgst":49.51},{"id":"P0134","description":"Croissants Large","brand":"Speedibake","category":"BREAD & PASTRY","sub_category":"Croissants","item_type":"croissant","search_aliases":["croissant"],"base_unit":"g","cost_per_base_unit":0.01629,"cost_basis":"$/g","is_food":true,"pack_size_raw":"50 X 100GR","sold_by":"carton","current_price_exgst":81.45},{"id":"P0135","description":"Cucumbers Sandwich Stackers","brand":"Riviana","category":"VEGETABLES","sub_category":"Vegetable Prepared","item_type":"vegetable","search_aliases":["vegetable"],"base_unit":"g","cost_per_base_unit":0.00436,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.2 KG","sold_by":"jar","current_price_exgst":9.6},{"id":"P0136","description":"Cupcakes Caramolo 1-787","brand":"Priestleys","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02788,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 104GR","sold_by":"tray","current_price_exgst":23.2},{"id":"P0137","description":"Cupcakes Chocolate Mint 1-789","brand":"Priestleys","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02589,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 112GR","sold_by":"tray","current_price_exgst":23.2},{"id":"P0138","description":"Cupcakes Chocolate Regular","brand":"The Country Che","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02109,"cost_basis":"$/g","is_food":true,"pack_size_raw":"16 X 72GR","sold_by":"carton","current_price_exgst":24.3},{"id":"P0139","description":"Cupcakes Freaky Face 1-786","brand":"Priestleys","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02988,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 86GR","sold_by":"tray","current_price_exgst":20.56},{"id":"P0140","description":"Cupcakes Red Velvet Regular","brand":"The Country Che","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02109,"cost_basis":"$/g","is_food":true,"pack_size_raw":"16 X 72GR","sold_by":"carton","current_price_exgst":24.3},{"id":"P0141","description":"Cupcakes Ultimate Chocolate 1-797","brand":"Priestleys","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02685,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 108GR","sold_by":"tray","current_price_exgst":23.2},{"id":"P0142","description":"Cupcakes White Chocolate 1-788","brand":"Priestleys","category":"DESSERTS","sub_category":"Cupcakes","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02613,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 111GR","sold_by":"tray","current_price_exgst":23.2},{"id":"P0143","description":"Cups 120Ml 4Oz 63Mm Single Wall White Biocup","brand":"Biopak","category":"PACKAGING","sub_category":"Cups Coffee","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0528,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"50'S","sold_by":"sleeve","current_price_exgst":2.64},{"id":"P0144","description":"Cutlery Pack Wooden","brand":"Caterers Choice","category":"PACKAGING","sub_category":"Disposable Cutlery","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.1226,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"packet","current_price_exgst":12.26},{"id":"P0145","description":"Dagwood Dogs","brand":"Keiths","category":"FINGER & SNACK FOODS","sub_category":"Snack Foods","item_type":"hot dog","search_aliases":["hot dog"],"base_unit":"g","cost_per_base_unit":0.013,"cost_basis":"$/g","is_food":true,"pack_size_raw":"20 X 125GR","sold_by":"carton","current_price_exgst":32.49},{"id":"P0146","description":"Detergent Dishwashing","brand":"Cater Clean","category":"CLEANING & JANITORIAL","sub_category":"Dishwashing Detergent","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00336,"cost_basis":"$/ml","is_food":false,"pack_size_raw":"5 LT","sold_by":"bottle","current_price_exgst":16.79},{"id":"P0147","description":"Donuts Jam Filled Christmas Red & Green Mixed","brand":"Gd Donuts","category":"DESSERTS","sub_category":"Donuts & Cronuts","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":2.175,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"24'S","sold_by":"carton","current_price_exgst":52.2},{"id":"P0148","description":"Dressing Greek Gluten Free","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Salad Dressings","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00933,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":28.0},{"id":"P0149","description":"Dressing Italian Gluten Free","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Salad Dressings","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00823,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":24.7},{"id":"P0150","description":"Dressing Ranch Squeeze Bottle Gluten Free","brand":"Jeffersons","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Salad Dressings","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.01154,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":11.54},{"id":"P0151","description":"Drink Blood Orange","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00444,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":19.99},{"id":"P0152","description":"Drink Creaming Soda Burgundee","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0153","description":"Drink Ginger Beer Glass Loose","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00502,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"24 X 375ML","sold_by":"carton","current_price_exgst":45.18},{"id":"P0154","description":"Drink Guava","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0155","description":"Drink Lemon Lime & Bitters","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0156","description":"Drink Passionfruit","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0157","description":"Drink Pineapple & Coconut","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":"pineapple","search_aliases":["pineapple"],"base_unit":"ml","cost_per_base_unit":0.00484,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":21.76},{"id":"P0158","description":"Drink Pink Grapefruit","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00512,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.02},{"id":"P0159","description":"Drink Sarsaparilla","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0160","description":"Drink Traditional Lemonade","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0161","description":"Drink Tropical Mango","brand":"Bundaberg","category":"BEVERAGES","sub_category":"Soft Drinks Carbonated","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.0053,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"12 X 375ML","sold_by":"carton","current_price_exgst":23.86},{"id":"P0162","description":"Dukkah","brand":"Krio Krush","category":"HERBS  SPICES & SEASONINGS","sub_category":"Seasonings & Sprinkles","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.05514,"cost_basis":"$/g","is_food":true,"pack_size_raw":"500 GR","sold_by":"each","current_price_exgst":27.57},{"id":"P0163","description":"Eggs Large Bulk (180 Eggs) 55-64Gr Filler","brand":"Daybreak","category":"EGGS","sub_category":"Eggs Whole","item_type":"egg","search_aliases":["egg"],"base_unit":"ea","cost_per_base_unit":0.3617,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"15 DOZ","sold_by":"carton","current_price_exgst":65.1},{"id":"P0164","description":"Essence Vanilla Imitation","brand":"Queen","category":"BAKING SUPPLIES","sub_category":"Essences","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00887,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"2 LT","sold_by":"bottle","current_price_exgst":17.75},{"id":"P0165","description":"Fish Cocktails Tempura S/Less","brand":"Pacific West","category":"Value Added","sub_category":"Seafood Value Added","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.01498,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":74.9},{"id":"P0166","description":"Fish Cocktails Tempura S/Less (I)","brand":"Pacific West","category":"Value Added","sub_category":"Seafood Value Added","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.01498,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":74.9},{"id":"P0167","description":"Flour Plain","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Flour","item_type":"flour","search_aliases":["flour"],"base_unit":"g","cost_per_base_unit":0.00139,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 KG","sold_by":"bag","current_price_exgst":13.95},{"id":"P0168","description":"Flour Self Raising","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Flour","item_type":"flour","search_aliases":["flour"],"base_unit":"g","cost_per_base_unit":0.00158,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 KG","sold_by":"bag","current_price_exgst":15.79},{"id":"P0169","description":"Foil All Purpose Dispenser","brand":"Caterers Choice","category":"PACKAGING","sub_category":"Alfoil","item_type":"oil","search_aliases":["oil"],"base_unit":"dim","cost_per_base_unit":null,"cost_basis":"needs review","is_food":false,"pack_size_raw":"150M X 44CM","sold_by":"roll","current_price_exgst":21.9},{"id":"P0170","description":"Garlic Crushed","brand":"Caterers Choice","category":"HERBS  SPICES & SEASONINGS","sub_category":"Garlic","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00435,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 KG","sold_by":"tub","current_price_exgst":43.49},{"id":"P0171","description":"Gateau Black Forest Pre Cut 14'S 1-860","brand":"Priestleys","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03287,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.73 KG","sold_by":"each","current_price_exgst":56.87},{"id":"P0172","description":"Gherkins Sandwich Stackers","brand":"Sandhurst","category":"VEGETABLES","sub_category":"Vegetable Prepared","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00471,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"jar","current_price_exgst":9.43},{"id":"P0173","description":"Gherkins Sandwich Stackers Sliced","brand":"Sandhurst","category":"VEGETABLES","sub_category":"Vegetable Prepared","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00449,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.2 KG","sold_by":"jar","current_price_exgst":9.87},{"id":"P0174","description":"Glaze Italian (With Balsamico)","brand":"Alfinas","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Bastes & Glazes","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.01372,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"500 ML","sold_by":"bottle","current_price_exgst":6.86},{"id":"P0175","description":"Gloves Nitrile Powder Free Black Large","brand":"Medi-Origin","category":"CLEANING & JANITORIAL","sub_category":"Gloves","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.075,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"packet","current_price_exgst":7.5},{"id":"P0176","description":"Gloves Premium Vinyl Clear Large Powdered","brand":"Capri","category":"CLEANING & JANITORIAL","sub_category":"Gloves","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0393,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"packet","current_price_exgst":3.93},{"id":"P0177","description":"Gloves Vinyl Blue Large Powder Free","brand":"Workplace","category":"CLEANING & JANITORIAL","sub_category":"Gloves","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0348,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"packet","current_price_exgst":3.48},{"id":"P0178","description":"Gloves Vinyl Blue Medium Powder Free","brand":"Workplace","category":"CLEANING & JANITORIAL","sub_category":"Gloves","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0331,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"packet","current_price_exgst":3.31},{"id":"P0179","description":"Gloves Vinyl Clear Medium Powder Free","brand":"Workplace","category":"CLEANING & JANITORIAL","sub_category":"Gloves","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0347,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"packet","current_price_exgst":3.47},{"id":"P0180","description":"Gravy Mix Rich Classic","brand":"Maggi","category":"SOUPS & STOCKS","sub_category":"Gravy Mixes","item_type":"gravy","search_aliases":["gravy"],"base_unit":"g","cost_per_base_unit":0.01325,"cost_basis":"$/g","is_food":true,"pack_size_raw":"7.5 KG","sold_by":"pail","current_price_exgst":99.35},{"id":"P0181","description":"Ham Leg Sliced","brand":"Caterers Choice","category":"SMALLGOODS","sub_category":"Ham Sliced  Diced And Shredded","item_type":"ham","search_aliases":["ham"],"base_unit":"g","cost_per_base_unit":0.0129,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":12.9},{"id":"P0182","description":"Ham Leg Sliced 2Mm (App 1Kg)","brand":"Sunvalley Fine","category":"SMALLGOODS","sub_category":"Ham Sliced  Diced And Shredded","item_type":"ham","search_aliases":["ham"],"base_unit":"unknown","cost_per_base_unit":null,"cost_basis":"needs review","is_food":true,"pack_size_raw":"KG","sold_by":"kg","current_price_exgst":11.98},{"id":"P0183","description":"Hash Browns Triangles (App 50'S)","brand":"Mccain","category":"POTATO PRODUCTS","sub_category":"Hash Browns & Potato Rostis","item_type":"hash brown","search_aliases":["hash brown"],"base_unit":"g","cost_per_base_unit":0.0063,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":12.6},{"id":"P0184","description":"Hash Browns Triangles Chunky","brand":"Farm Frites","category":"POTATO PRODUCTS","sub_category":"Hash Browns & Potato Rostis","item_type":"hash brown","search_aliases":["hash brown"],"base_unit":"g","cost_per_base_unit":0.00562,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":5.62},{"id":"P0185","description":"Hoki S/F Flt S/Less 4/6 (115-175Gr)","brand":"Amaltal","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.0117,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6.8 KG","sold_by":"block","current_price_exgst":79.59},{"id":"P0186","description":"Hoki S/F Flt S/Less 4/6 (115-175Gr) (I)","brand":"Amaltal","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.01286,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6.8 KG","sold_by":"block","current_price_exgst":87.47},{"id":"P0187","description":"Honey P/C","brand":"Kraft","category":"SPREADS","sub_category":"Honey Portion Control","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02321,"cost_basis":"$/g","is_food":true,"pack_size_raw":"50 X 14GR","sold_by":"tray","current_price_exgst":16.25},{"id":"P0188","description":"Honey Pure","brand":"Allowrie","category":"SPREADS","sub_category":"Honey","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00795,"cost_basis":"$/g","is_food":true,"pack_size_raw":"3 KG","sold_by":"can","current_price_exgst":23.84},{"id":"P0189","description":"Hot Dogs 190Mm 8  All American","brand":"Hans","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Frankfurts/Hotdogs","item_type":"hot dog","search_aliases":["hot dog"],"base_unit":"g","cost_per_base_unit":0.01417,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.5 KG","sold_by":"packet","current_price_exgst":35.43},{"id":"P0190","description":"Hot Dogs 8  97% Fat Free","brand":"Hans","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Frankfurts/Hotdogs","item_type":"hot dog","search_aliases":["hot dog"],"base_unit":"g","cost_per_base_unit":0.01396,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":27.92},{"id":"P0191","description":"Ice Cream Cones Double Premium","brand":"Altimate","category":"ICE & ICE CREAM","sub_category":"Cones  Wafers & Accessories","item_type":"cream","search_aliases":["cream"],"base_unit":"ea","cost_per_base_unit":0.1391,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"200'S","sold_by":"carton","current_price_exgst":27.82},{"id":"P0192","description":"Ice Cream Cones Single Superior","brand":"Altimate","category":"ICE & ICE CREAM","sub_category":"Cones  Wafers & Accessories","item_type":"cream","search_aliases":["cream"],"base_unit":"ea","cost_per_base_unit":0.0892,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"400'S","sold_by":"carton","current_price_exgst":35.68},{"id":"P0193","description":"Ice Cream Cones Small Cup","brand":"Altimate","category":"ICE & ICE CREAM","sub_category":"Cones  Wafers & Accessories","item_type":"cream","search_aliases":["cream"],"base_unit":"ea","cost_per_base_unit":0.1053,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"224'S","sold_by":"carton","current_price_exgst":23.58},{"id":"P0194","description":"Ice Cream Cones Waffle Natural B","brand":"Altimate","category":"ICE & ICE CREAM","sub_category":"Cones  Wafers & Accessories","item_type":"cream","search_aliases":["cream"],"base_unit":"ea","cost_per_base_unit":0.1588,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"312'S","sold_by":"carton","current_price_exgst":49.56},{"id":"P0195","description":"Ice Cream Vanilla","brand":"Bulla","category":"ICE & ICE CREAM","sub_category":"Ice Cream Tubs & Bulk","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.003,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"10 LT","sold_by":"tub","current_price_exgst":30.0},{"id":"P0196","description":"Icing Sugar Pure","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Icing Sugar & Mix","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.00408,"cost_basis":"$/g","is_food":true,"pack_size_raw":"3 KG","sold_by":"packet","current_price_exgst":12.23},{"id":"P0197","description":"Jam P/C Strawberry","brand":"Kraft","category":"SPREADS","sub_category":"Jam Portion Control","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0108,"cost_basis":"$/g","is_food":true,"pack_size_raw":"75 X 14GR","sold_by":"tray","current_price_exgst":11.34},{"id":"P0198","description":"Juice Apple Long Life 100%","brand":"Juicee Crush","category":"BEVERAGES","sub_category":"Fruit Juices","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00204,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"2 LT","sold_by":"bottle","current_price_exgst":4.07},{"id":"P0199","description":"Juice Clear Apple Long Life 100% Pet","brand":"Dewfresh","category":"BEVERAGES","sub_category":"Fruit Juices","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00192,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"2 LT","sold_by":"bottle","current_price_exgst":3.84},{"id":"P0200","description":"Labels Permanent 60 X 40Mm Hot Take-Out Foods","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0381,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"500'S","sold_by":"roll","current_price_exgst":19.06},{"id":"P0201","description":"Labels Removable 24Mm Round Friday","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.009,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"1000'S","sold_by":"packet","current_price_exgst":9.02},{"id":"P0202","description":"Labels Removable 24Mm Round Monday","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.009,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"1000'S","sold_by":"packet","current_price_exgst":9.02},{"id":"P0203","description":"Labels Removable 24Mm Round Saturday","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.009,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"1000'S","sold_by":"packet","current_price_exgst":9.02},{"id":"P0204","description":"Labels Removable 24Mm Round Thursday","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.009,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"1000'S","sold_by":"packet","current_price_exgst":9.02},{"id":"P0205","description":"Labels Removable 24Mm Round Wednesday","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.009,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"1000'S","sold_by":"packet","current_price_exgst":9.02},{"id":"P0206","description":"Labels Removable Shelf Life 102 X 47Mm","brand":"Fildes","category":"PACKAGING","sub_category":"Labels","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0345,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"500'S","sold_by":"roll","current_price_exgst":17.26},{"id":"P0207","description":"Lamb Kofta","brand":"Specialty Foods","category":"FINGER & SNACK FOODS","sub_category":"Finger Food Other","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02124,"cost_basis":"$/g","is_food":true,"pack_size_raw":"20 X 60GR","sold_by":"packet","current_price_exgst":25.49},{"id":"P0208","description":"Lids Round 120Mm To Suit 220/850Ml Container","brand":"Genfac","category":"PACKAGING","sub_category":"Lids","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0386,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"50'S","sold_by":"sleeve","current_price_exgst":1.93},{"id":"P0209","description":"Lids To Suit 118Ml 4Oz Portion Control Cups Pet","brand":"Beta Eco","category":"PACKAGING","sub_category":"Lids","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0479,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"100'S","sold_by":"sleeve","current_price_exgst":4.79},{"id":"P0210","description":"Lids To Suit 120Ml 4Oz Biocup Black Sipper Hole","brand":"Biopak","category":"PACKAGING","sub_category":"Lids","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0368,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"50'S","sold_by":"sleeve","current_price_exgst":1.84},{"id":"P0211","description":"Mango Cheeks","brand":"Sunshine Tropic","category":"FRUIT","sub_category":"Frozen Fruit","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01088,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":10.88},{"id":"P0212","description":"Mango Chunks Iqf","brand":"Entyce","category":"FRUIT","sub_category":"Frozen Fruit","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00658,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.5 KG","sold_by":"packet","current_price_exgst":16.45},{"id":"P0213","description":"Mango Sliced","brand":"Riviana","category":"FRUIT","sub_category":"Canned Fruit","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00373,"cost_basis":"$/g","is_food":true,"pack_size_raw":"3 KG","sold_by":"can","current_price_exgst":11.2},{"id":"P0214","description":"Maple Syrup Flavoured","brand":"Frenchmaid","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.01032,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":10.32},{"id":"P0215","description":"Maple Syrup Flavoured P/C","brand":"Frenchmaid","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01564,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 30GR","sold_by":"carton","current_price_exgst":46.93},{"id":"P0216","description":"Margarine Spread","brand":"Sunlit Plains","category":"DAIRY","sub_category":"Margarine And Spreads","item_type":"margarine","search_aliases":["margarine"],"base_unit":"g","cost_per_base_unit":0.00395,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"tub","current_price_exgst":3.95},{"id":"P0217","description":"Margarine Spread Catchoice","brand":"Sunlit Plains","category":"DAIRY","sub_category":"Margarine And Spreads","item_type":"margarine","search_aliases":["margarine"],"base_unit":"g","cost_per_base_unit":0.00395,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"tub","current_price_exgst":3.95},{"id":"P0218","description":"Margarine Spread Catering Catchoice","brand":"Sunlit Plains","category":"DAIRY","sub_category":"Margarine And Spreads","item_type":"margarine","search_aliases":["margarine"],"base_unit":"g","cost_per_base_unit":0.0049,"cost_basis":"$/g","is_food":true,"pack_size_raw":"10 KG","sold_by":"carton","current_price_exgst":48.97},{"id":"P0219","description":"Marshmallows Mini Pink & White","brand":"Trumps","category":"CONFECTIONERY","sub_category":"Lollies Bulk","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02939,"cost_basis":"$/g","is_food":true,"pack_size_raw":"375 GR","sold_by":"packet","current_price_exgst":11.02},{"id":"P0220","description":"Marshmallows Mixed Pink & White","brand":"Trumps","category":"CONFECTIONERY","sub_category":"Lollies Bulk","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0148,"cost_basis":"$/g","is_food":true,"pack_size_raw":"500 GR","sold_by":"packet","current_price_exgst":7.4},{"id":"P0221","description":"Marshmallows White","brand":"Pascall","category":"CONFECTIONERY","sub_category":"Lollies Bulk","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00765,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":38.25},{"id":"P0222","description":"Mayonnaise","brand":"Kewpie","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mayonnaise","item_type":"mayonnaise","search_aliases":["mayonnaise"],"base_unit":"g","cost_per_base_unit":0.01208,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bottle","current_price_exgst":12.08},{"id":"P0223","description":"Mayonnaise Aioli Gluten Free","brand":"Bright Side","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Aioli","item_type":"aioli","search_aliases":["aioli","garlic mayo"],"base_unit":"ml","cost_per_base_unit":0.0095,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":9.5},{"id":"P0224","description":"Mayonnaise Aioli Squeeze Bottle Gluten Free","brand":"Jeffersons","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Aioli","item_type":"aioli","search_aliases":["aioli","garlic mayo"],"base_unit":"ml","cost_per_base_unit":0.01134,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":11.34},{"id":"P0225","description":"Mayonnaise Basil Pesto Squeeze Gluten Free","brand":"Wombat Valley","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mayonnaise","item_type":"mayonnaise","search_aliases":["mayonnaise"],"base_unit":"g","cost_per_base_unit":0.01023,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bottle","current_price_exgst":10.23},{"id":"P0226","description":"Mayonnaise Fiery Chipotle Squeeze Bottle G/Free","brand":"Jeffersons","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mayonnaise","item_type":"mayonnaise","search_aliases":["mayonnaise"],"base_unit":"ml","cost_per_base_unit":0.01097,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":10.97},{"id":"P0227","description":"Mayonnaise Japanese Gluten Free","brand":"Akari","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mayonnaise","item_type":"mayonnaise","search_aliases":["mayonnaise"],"base_unit":"ml","cost_per_base_unit":0.01025,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":10.25},{"id":"P0228","description":"Mayonnaise P/C Squeeze On","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mayonnaise","item_type":"mayonnaise","search_aliases":["mayonnaise"],"base_unit":"g","cost_per_base_unit":0.01936,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 11GR","sold_by":"carton","current_price_exgst":21.3},{"id":"P0229","description":"Mayonnaise Whole Egg Free Range Gluten Free","brand":"Menu Maker","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mayonnaise","item_type":"mayonnaise","search_aliases":["mayonnaise"],"base_unit":"ml","cost_per_base_unit":0.01057,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":10.57},{"id":"P0230","description":"Milk Almond Uht Barista","brand":"Alternative Dai","category":"DAIRY","sub_category":"Milk Specialty","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00312,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":3.12},{"id":"P0231","description":"Milk Light Fresh (Low Fat)","brand":"Yarde Farm","category":"DAIRY","sub_category":"Milk","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00165,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"6 X 2LT","sold_by":"carton","current_price_exgst":19.8},{"id":"P0232","description":"Milk Oat Uht","brand":"Little Things","category":"DAIRY","sub_category":"Milk Specialty","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00286,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":2.86},{"id":"P0233","description":"Milk Powder Malted","brand":"Nestle","category":"BEVERAGES","sub_category":"Milk Powders","item_type":"milk","search_aliases":["milk"],"base_unit":"g","cost_per_base_unit":0.02101,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.5 KG","sold_by":"can","current_price_exgst":31.52},{"id":"P0234","description":"Milk Soya Uht","brand":"Little Things","category":"DAIRY","sub_category":"Milk Specialty","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00261,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":2.61},{"id":"P0235","description":"Milk Uht Almond Barista","brand":"Alternative Dai","category":"DAIRY","sub_category":"Milk Specialty","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00312,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":3.12},{"id":"P0236","description":"Milk Uht Full Cream Lactose Free","brand":"Little Things","category":"DAIRY","sub_category":"Milk Specialty","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.00303,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":3.03},{"id":"P0237","description":"Milk Uht Oat","brand":"Little Things","category":"DAIRY","sub_category":"Milk Specialty","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00304,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":3.04},{"id":"P0238","description":"Milk Uht Skim","brand":"Little Things","category":"DAIRY","sub_category":"Milk Uht","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.00224,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":2.24},{"id":"P0239","description":"Milk Uht Soya","brand":"Little Things","category":"DAIRY","sub_category":"Milk Specialty","item_type":"milk","search_aliases":["milk"],"base_unit":"ml","cost_per_base_unit":0.0028,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":2.8},{"id":"P0240","description":"Mixed Fruit Dried Standard","brand":"Trumps","category":"FRUIT","sub_category":"Dried Fruit","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01075,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":10.75},{"id":"P0241","description":"Muffins Apple 1-090","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01806,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 150GR","sold_by":"tray","current_price_exgst":16.25},{"id":"P0242","description":"Muffins Apple 1-816","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.02925,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 120GR","sold_by":"tray","current_price_exgst":21.06},{"id":"P0243","description":"Muffins Banana & Walnut 1-083","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01834,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 150GR","sold_by":"tray","current_price_exgst":16.51},{"id":"P0244","description":"Muffins Blueberry Gluten Free 1-367","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01948,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 150GR","sold_by":"tray","current_price_exgst":17.53},{"id":"P0245","description":"Muffins Butterscotch & White Chocolate","brand":"Helen'S","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.02008,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 120GR","sold_by":"tray","current_price_exgst":14.46},{"id":"P0246","description":"Muffins Cinnamon Donut Gluten Free Vegan 1-609","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.02628,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 150GR","sold_by":"tray","current_price_exgst":23.65},{"id":"P0247","description":"Muffins Double Chocolate 1-091","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01902,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 150GR","sold_by":"tray","current_price_exgst":17.12},{"id":"P0248","description":"Muffins English Traditional","brand":"Tip Top","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01194,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 400GR","sold_by":"carton","current_price_exgst":28.66},{"id":"P0249","description":"Muffins Raspberry & White Chocolate 1-081","brand":"Priestleys","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.02139,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 132GR","sold_by":"tray","current_price_exgst":16.94},{"id":"P0250","description":"Muffins Texas Blueberry & Custard","brand":"Helen'S","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01741,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 180GR","sold_by":"tray","current_price_exgst":18.8},{"id":"P0251","description":"Muffins Texas Triple Chocolate","brand":"Helen'S","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01741,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 180GR","sold_by":"tray","current_price_exgst":18.8},{"id":"P0252","description":"Muffins Texas Wildberry & White Chocolate","brand":"Helen'S","category":"BREAD & PASTRY","sub_category":"Muffins","item_type":"muffin","search_aliases":["muffin"],"base_unit":"g","cost_per_base_unit":0.01737,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 180GR","sold_by":"tray","current_price_exgst":18.76},{"id":"P0253","description":"Oil Canola Cooking Spray","brand":"Sandhurst","category":"OILS & FATS","sub_category":"Oil Spray","item_type":"oil","search_aliases":["oil"],"base_unit":"g","cost_per_base_unit":0.00933,"cost_basis":"$/g","is_food":true,"pack_size_raw":"450 GR","sold_by":"can","current_price_exgst":4.2},{"id":"P0254","description":"Olives Kalamata Sliced","brand":"Kalos","category":"VEGETABLES","sub_category":"Olives","item_type":"olive","search_aliases":["olive"],"base_unit":"g","cost_per_base_unit":0.00952,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"jar","current_price_exgst":19.03},{"id":"P0255","description":"Onion Rings Beer Battered","brand":"Big Country","category":"FINGER & SNACK FOODS","sub_category":"Snack Foods","item_type":"onion ring","search_aliases":["onion ring"],"base_unit":"g","cost_per_base_unit":0.01073,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":10.73},{"id":"P0256","description":"Onion Rings Beer Battered Iqf","brand":"Noys Kitchen","category":"FINGER & SNACK FOODS","sub_category":"Finger Food Other","item_type":"onion ring","search_aliases":["onion ring"],"base_unit":"g","cost_per_base_unit":0.01175,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":11.75},{"id":"P0257","description":"Onion Rings Beer Battered Natural","brand":"Jeffersons","category":"FINGER & SNACK FOODS","sub_category":"Snack Foods","item_type":"onion ring","search_aliases":["onion ring"],"base_unit":"g","cost_per_base_unit":0.01197,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":11.97},{"id":"P0258","description":"Pancakes 30'S","brand":"Golden","category":"DESSERTS","sub_category":"Pancakes","item_type":"pancake","search_aliases":["pancake"],"base_unit":"g","cost_per_base_unit":0.01492,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 X 360GR","sold_by":"carton","current_price_exgst":26.86},{"id":"P0259","description":"Pancakes Hotcakes Happy Plain 100Mm","brand":"Marcels","category":"DESSERTS","sub_category":"Pancakes","item_type":"pancake","search_aliases":["pancake"],"base_unit":"ea","cost_per_base_unit":0.6302,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"8 X 6'S","sold_by":"carton","current_price_exgst":30.25},{"id":"P0260","description":"Paper Baking Dispenser 30Cm X 120Mt","brand":"Caterers Choice","category":"PACKAGING","sub_category":"Baking Paper","item_type":null,"search_aliases":[],"base_unit":"dim","cost_per_base_unit":null,"cost_basis":"needs review","is_food":false,"pack_size_raw":"120M X 30CM","sold_by":"roll","current_price_exgst":32.75},{"id":"P0261","description":"Paper Baking Dispenser 45Cm X 120Mt","brand":"Caterers Choice","category":"PACKAGING","sub_category":"Baking Paper","item_type":null,"search_aliases":[],"base_unit":"dim","cost_per_base_unit":null,"cost_basis":"needs review","is_food":false,"pack_size_raw":"120M X 45CM","sold_by":"roll","current_price_exgst":41.28},{"id":"P0262","description":"Peanut Butter Smooth","brand":"Bega","category":"SPREADS","sub_category":"Peanut Butter","item_type":"butter","search_aliases":["butter"],"base_unit":"g","cost_per_base_unit":0.01265,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"bucket","current_price_exgst":25.3},{"id":"P0263","description":"Pepper P/C","brand":"Ism","category":"HERBS  SPICES & SEASONINGS","sub_category":"Pepper","item_type":"pepper","search_aliases":["pepper"],"base_unit":"ea","cost_per_base_unit":0.0227,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"2000'S","sold_by":"carton","current_price_exgst":45.34},{"id":"P0264","description":"Peppercorns Black Whole","brand":"Caterers Choice","category":"HERBS  SPICES & SEASONINGS","sub_category":"Pepper","item_type":"pepper","search_aliases":["pepper"],"base_unit":"g","cost_per_base_unit":0.03296,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":32.96},{"id":"P0265","description":"Pie P/C Lemon Meringue","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":"pie","search_aliases":["pie"],"base_unit":"g","cost_per_base_unit":0.03265,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 110GR","sold_by":"tray","current_price_exgst":28.73},{"id":"P0266","description":"Pie Pecan Pre Cut 16'S 1-062","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":"pie","search_aliases":["pie"],"base_unit":"g","cost_per_base_unit":0.03409,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.7 KG","sold_by":"each","current_price_exgst":57.95},{"id":"P0267","description":"Pineapple Thinly Sliced In Light Syrup","brand":"Dewfresh","category":"FRUIT","sub_category":"Canned Pineapple","item_type":"pineapple","search_aliases":["pineapple"],"base_unit":"g","cost_per_base_unit":0.00414,"cost_basis":"$/g","is_food":true,"pack_size_raw":"3.06 KG","sold_by":"can","current_price_exgst":12.67},{"id":"P0268","description":"Pluto Pups 20'S","brand":"Chiko","category":"FINGER & SNACK FOODS","sub_category":"Snack Foods","item_type":"hot dog","search_aliases":["hot dog"],"base_unit":"g","cost_per_base_unit":0.01718,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.25 KG","sold_by":"carton","current_price_exgst":38.66},{"id":"P0269","description":"Pork Pulled Plain Cooked Frz","brand":"Naturalaz","category":"PORK PORTIONED","sub_category":"Pork Cooked","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01395,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":13.95},{"id":"P0270","description":"Potato Cakes Scallops Extra Large","brand":"Sol'S Snax","category":"POTATO PRODUCTS","sub_category":"Potato Scallops & Cakes","item_type":"potato scallop","search_aliases":["potato scallop"],"base_unit":"g","cost_per_base_unit":0.00754,"cost_basis":"$/g","is_food":true,"pack_size_raw":"120 X 80GR","sold_by":"carton","current_price_exgst":72.43},{"id":"P0271","description":"Potato Cakes Scallops Formed Extra Large","brand":"Sol'S Snax","category":"POTATO PRODUCTS","sub_category":"Potato Scallops & Cakes","item_type":"potato scallop","search_aliases":["potato scallop"],"base_unit":"g","cost_per_base_unit":0.0068,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 90GR","sold_by":"carton","current_price_exgst":61.24},{"id":"P0272","description":"Potato Cakes Scallops Natural Slice Extra Large","brand":"Sol'S Snax","category":"POTATO PRODUCTS","sub_category":"Potato Scallops & Cakes","item_type":"potato scallop","search_aliases":["potato scallop"],"base_unit":"g","cost_per_base_unit":0.00735,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 90GR","sold_by":"carton","current_price_exgst":66.13},{"id":"P0273","description":"Potato Cakes Scallops Natural Slice Large","brand":"Sol'S Snax","category":"POTATO PRODUCTS","sub_category":"Potato Scallops & Cakes","item_type":"potato scallop","search_aliases":["potato scallop"],"base_unit":"g","cost_per_base_unit":0.00677,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 70GR","sold_by":"carton","current_price_exgst":47.36},{"id":"P0274","description":"Potato Gems","brand":"Edgell","category":"POTATO PRODUCTS","sub_category":"Hash Browns & Potato Rostis","item_type":"potato gem","search_aliases":["potato gem"],"base_unit":"g","cost_per_base_unit":0.00482,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":9.64},{"id":"P0275","description":"Prawn Cutlet Crumbed 10/15","brand":"Seafrost","category":"Value Added","sub_category":"Seafood Value Added","item_type":"prawn","search_aliases":["prawn"],"base_unit":"g","cost_per_base_unit":0.02065,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":41.29},{"id":"P0276","description":"Prawn Cutlet Crumbed 16/20","brand":"Seafrost","category":"Value Added","sub_category":"Seafood Value Added","item_type":"prawn","search_aliases":["prawn"],"base_unit":"g","cost_per_base_unit":0.02018,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":40.37},{"id":"P0277","description":"Prawn Cutlet Raw 10/15 Vannamei (Seafrost)","brand":"Seacrest","category":"Prawns","sub_category":"Prawn Cutlets Cooked & Raw","item_type":"prawn","search_aliases":["prawn"],"base_unit":"g","cost_per_base_unit":0.0,"cost_basis":"$/g","is_food":true,"pack_size_raw":"700 GR","sold_by":"packet","current_price_exgst":0.0},{"id":"P0278","description":"Prawn Cutlet Tempura 16/20 (I)","brand":"Seafrost","category":"Value Added","sub_category":"Seafood Value Added","item_type":"prawn","search_aliases":["prawn"],"base_unit":"g","cost_per_base_unit":0.02715,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":27.15},{"id":"P0279","description":"Pump Syrup To Suit 750Ml & 1Lt Bottle","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"unknown","cost_per_base_unit":null,"cost_basis":"needs review","is_food":true,"pack_size_raw":"EA","sold_by":"each","current_price_exgst":4.72},{"id":"P0280","description":"Relish Tomato","brand":"Woods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Chutneys & Relishes & Pickles","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01263,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.4 KG","sold_by":"tub","current_price_exgst":30.32},{"id":"P0281","description":"Salmon Portions S/On 125Gr Scaled (App 40/Ctn) (I)","brand":"Seafrost","category":"Fish","sub_category":"Salmon Fillets/Portions","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0296,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":148.0},{"id":"P0282","description":"Salt Chicken Gluten Free","brand":"Edlyn","category":"HERBS  SPICES & SEASONINGS","sub_category":"Salt","item_type":"salt","search_aliases":["salt"],"base_unit":"g","cost_per_base_unit":0.01003,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 KG","sold_by":"tub","current_price_exgst":80.2},{"id":"P0283","description":"Salt P/C","brand":"Ism","category":"HERBS  SPICES & SEASONINGS","sub_category":"Salt","item_type":"salt","search_aliases":["salt"],"base_unit":"ea","cost_per_base_unit":0.0082,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"2000'S","sold_by":"carton","current_price_exgst":16.49},{"id":"P0284","description":"Salt Table","brand":"Trumps","category":"HERBS  SPICES & SEASONINGS","sub_category":"Salt","item_type":"salt","search_aliases":["salt"],"base_unit":"g","cost_per_base_unit":0.00216,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2.5 KG","sold_by":"packet","current_price_exgst":5.41},{"id":"P0285","description":"Sauce Barbeque Gluten Free","brand":"Caterers Choice","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Bbq","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00296,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"4 LT","sold_by":"bottle","current_price_exgst":11.85},{"id":"P0286","description":"Sauce Cheese American (Liquid)","brand":"Wombat Valley","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Specialty","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01097,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bag","current_price_exgst":10.97},{"id":"P0287","description":"Sauce Cheese Cheddar (Liquid)","brand":"Jeffersons","category":"DAIRY","sub_category":"Cheese Liquid","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01083,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bag","current_price_exgst":10.83},{"id":"P0288","description":"Sauce Chocolate White Vegan Dairy & Gluten Free","brand":"Alchemy","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Sweet - Desert","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.0099,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1.47 LT","sold_by":"bottle","current_price_exgst":14.55},{"id":"P0289","description":"Sauce Dessert Raspberry Coulis Gluten Free","brand":"Priestleys","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Sweet - Desert","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.0339,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"500 ML","sold_by":"bottle","current_price_exgst":16.95},{"id":"P0290","description":"Sauce Dessert Salted Caramel Gluten Free","brand":"Wombat Valley","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Sweet - Desert","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.01011,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"bottle","current_price_exgst":10.11},{"id":"P0291","description":"Sauce Hollandaise Garde Dor Tetra","brand":"Knorr","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Specialty","item_type":"hollandaise","search_aliases":["hollandaise"],"base_unit":"ml","cost_per_base_unit":0.01161,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1 LT","sold_by":"each","current_price_exgst":11.61},{"id":"P0292","description":"Sauce Mustard American Squeeze","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Mustards","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00948,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"920 ML","sold_by":"bottle","current_price_exgst":8.72},{"id":"P0293","description":"Sauce P/C Barbecue Squeeze On","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Portion Control","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01926,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 14GR","sold_by":"carton","current_price_exgst":26.96},{"id":"P0294","description":"Sauce P/C Tartare","brand":"Zoosh","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Portion Control","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01527,"cost_basis":"$/g","is_food":true,"pack_size_raw":"50 X 11GR","sold_by":"tray","current_price_exgst":8.4},{"id":"P0295","description":"Sauce P/C Tartare Squeeze On","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Portion Control","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.02127,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 X 11GR","sold_by":"carton","current_price_exgst":23.4},{"id":"P0296","description":"Sauce P/C Tomato Squeeze On","brand":"Masterfoods","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Portion Control","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01211,"cost_basis":"$/g","is_food":true,"pack_size_raw":"300 X 14GR","sold_by":"carton","current_price_exgst":50.86},{"id":"P0297","description":"Sauce Sweet Chilli Gluten Free","brand":"Oriental Deligh","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Chilli","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00569,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":17.06},{"id":"P0298","description":"Sauce Tartare Pouch Gluten Free","brand":"Edlyn","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Tartare","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.00678,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"bag","current_price_exgst":33.9},{"id":"P0299","description":"Sauce Tartare Squeeze Bottle Gluten Free","brand":"Menu Maker","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Tartare","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01035,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bottle","current_price_exgst":10.35},{"id":"P0300","description":"Sauce Tomato Gluten Free","brand":"Caterers Choice","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Tomato","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00241,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"4 LT","sold_by":"bottle","current_price_exgst":9.65},{"id":"P0301","description":"Sauce Tzatziki Squeeze Bottle Gluten Free","brand":"Casa De Mare","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauces/Jellies - Other","item_type":"sauce","search_aliases":["sauce"],"base_unit":"g","cost_per_base_unit":0.01066,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bottle","current_price_exgst":10.66},{"id":"P0302","description":"Sauce Worcestershire Gluten Free","brand":"Fountain","category":"SAUCES  CONDIMENTS & DRESSINGS","sub_category":"Sauce Worcestershire","item_type":"sauce","search_aliases":["sauce"],"base_unit":"ml","cost_per_base_unit":0.00382,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"4 LT","sold_by":"bottle","current_price_exgst":15.27},{"id":"P0303","description":"Sausages Crumbed","brand":"Keppel","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Sausages - Precooked  Battered  Crumbed","item_type":"sausage","search_aliases":["sausage","snag"],"base_unit":"g","cost_per_base_unit":0.01218,"cost_basis":"$/g","is_food":true,"pack_size_raw":"53 X 76GR","sold_by":"carton","current_price_exgst":49.06},{"id":"P0304","description":"Sausages Crumbed Bacon & Cheese","brand":"Keiths","category":"SAUSAGES  HOT DOGS & PATTIES","sub_category":"Sausages - Precooked  Battered  Crumbed","item_type":"sausage","search_aliases":["sausage","snag"],"base_unit":"g","cost_per_base_unit":0.01328,"cost_basis":"$/g","is_food":true,"pack_size_raw":"27 X 110GR","sold_by":"carton","current_price_exgst":39.43},{"id":"P0305","description":"Schnitzel Chicken Breast Panko Crumb","brand":"Farmyard Chicke","category":"POULTRY FURTHER PROCESSED","sub_category":"Chicken Schnitzel","item_type":"schnitzel","search_aliases":["schnitzel"],"base_unit":"g","cost_per_base_unit":0.01779,"cost_basis":"$/g","is_food":true,"pack_size_raw":"40 X 140GR","sold_by":"carton","current_price_exgst":99.61},{"id":"P0306","description":"Schnitzel Chicken Crumbed Frz","brand":null,"category":"POULTRY FURTHER PROCESSED","sub_category":"Chicken Schnitzel","item_type":"schnitzel","search_aliases":["schnitzel"],"base_unit":"g","cost_per_base_unit":0.01487,"cost_basis":"$/g","is_food":true,"pack_size_raw":"25 X 200GR","sold_by":"box","current_price_exgst":74.34},{"id":"P0307","description":"Scourer Stainless Steel 70Gr","brand":"Cater Clean","category":"CLEANING & JANITORIAL","sub_category":"Scourers & Sponges","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":1.54,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"6'S","sold_by":"packet","current_price_exgst":9.24},{"id":"P0308","description":"Seafood Sticks Crumbed","brand":"Keppel","category":"Surimi Products","sub_category":"Surimi Products","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01348,"cost_basis":"$/g","is_food":true,"pack_size_raw":"67 X 60GR","sold_by":"carton","current_price_exgst":54.2},{"id":"P0309","description":"Seafood Sticks Crumbed (A)","brand":"Keppel","category":"Surimi Products","sub_category":"Surimi Products","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01418,"cost_basis":"$/g","is_food":true,"pack_size_raw":"67 X 60GR","sold_by":"carton","current_price_exgst":57.01},{"id":"P0310","description":"Seasoning All Purpose","brand":"Trumps","category":"HERBS  SPICES & SEASONINGS","sub_category":"Seasonings & Sprinkles","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01389,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":13.89},{"id":"P0311","description":"Seeds Poppy","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Seeds & Kernels","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01147,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":11.47},{"id":"P0312","description":"Seeds Sesame","brand":"Caterers Choice","category":"BAKING SUPPLIES","sub_category":"Seeds & Kernels","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.00858,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":8.58},{"id":"P0313","description":"Slice Apple 1-215","brand":"Priestleys","category":"DESSERTS","sub_category":"Slices","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02097,"cost_basis":"$/g","is_food":true,"pack_size_raw":"15 X 116GR","sold_by":"tray","current_price_exgst":36.49},{"id":"P0314","description":"Slice Caramel Flourless","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Slices","item_type":"flour","search_aliases":["flour"],"base_unit":"g","cost_per_base_unit":0.02144,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 120GR","sold_by":"tray","current_price_exgst":20.58},{"id":"P0315","description":"Slice Caramel Gluten Free 1-136","brand":"Priestleys","category":"DESSERTS","sub_category":"Slices","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02473,"cost_basis":"$/g","is_food":true,"pack_size_raw":"15 X 110GR","sold_by":"tray","current_price_exgst":40.8},{"id":"P0316","description":"Slice Carrot Cake Large Flourless","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Slices","item_type":"flour","search_aliases":["flour"],"base_unit":"g","cost_per_base_unit":0.02172,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 145GR","sold_by":"tray","current_price_exgst":37.8},{"id":"P0317","description":"Slice Cherry 1-245","brand":"Priestleys","category":"DESSERTS","sub_category":"Slices","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02397,"cost_basis":"$/g","is_food":true,"pack_size_raw":"18 X 85GR","sold_by":"tray","current_price_exgst":36.67},{"id":"P0318","description":"Slice Hummingbird 1-262","brand":"Priestleys","category":"DESSERTS","sub_category":"Slices","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02218,"cost_basis":"$/g","is_food":true,"pack_size_raw":"18 X 102GR","sold_by":"tray","current_price_exgst":40.73},{"id":"P0319","description":"Slice Lemon Coconut Delicious Flourless","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Slices","item_type":"flour","search_aliases":["flour"],"base_unit":"g","cost_per_base_unit":0.02925,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 100GR","sold_by":"tray","current_price_exgst":23.4},{"id":"P0320","description":"Slice Mint Hedgehog Pre Cut 18'S 1-329","brand":"Priestleys","category":"DESSERTS","sub_category":"Slices","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03046,"cost_basis":"$/g","is_food":true,"pack_size_raw":"18 X 84GR","sold_by":"tray","current_price_exgst":46.05},{"id":"P0321","description":"Slice Rocky Road 1-216","brand":"Priestleys","category":"DESSERTS","sub_category":"Slices","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02381,"cost_basis":"$/g","is_food":true,"pack_size_raw":"15 X 110GR","sold_by":"tray","current_price_exgst":39.28},{"id":"P0322","description":"Smoked Salmon Sliced Atlantic","brand":"Seacrest","category":"Fish","sub_category":"Salmon Smoked","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03855,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":38.55},{"id":"P0323","description":"Smoked Salmon Sliced Atlantic (I)","brand":"Seacrest","category":"Fish","sub_category":"Salmon Smoked","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.03855,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":38.55},{"id":"P0324","description":"Smoothie Ready To Blend Banana Cacao","brand":"Allies","category":"BEVERAGES","sub_category":"Smoothies & Powders","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.015,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 180GR","sold_by":"carton","current_price_exgst":32.41},{"id":"P0325","description":"Smoothie Ready To Blend Green Delight","brand":"Allies","category":"BEVERAGES","sub_category":"Smoothies & Powders","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01783,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 180GR","sold_by":"carton","current_price_exgst":38.51},{"id":"P0326","description":"Smoothie Ready To Blend Summer Mango","brand":"Allies","category":"BEVERAGES","sub_category":"Smoothies & Powders","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01783,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 180GR","sold_by":"carton","current_price_exgst":38.51},{"id":"P0327","description":"Smoothie Ready To Blend Wild Berry","brand":"Allies","category":"BEVERAGES","sub_category":"Smoothies & Powders","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01783,"cost_basis":"$/g","is_food":true,"pack_size_raw":"12 X 180GR","sold_by":"carton","current_price_exgst":38.51},{"id":"P0328","description":"Snapper Goldband Flt S/On 200/300","brand":"South Pacific","category":"Fish","sub_category":"Fish Fillets Skin On","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.0236,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":118.01},{"id":"P0329","description":"Snapper King Goldband Flt 100/200","brand":"Pacific West","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.02516,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":125.79},{"id":"P0330","description":"Snapper King S/Less B/Less 100/200 Wild","brand":"South Pacific","category":"Fish","sub_category":"Fish Fillets Skinless","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.02198,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":109.89},{"id":"P0331","description":"Spread Chocolate Hazelnut Piping Bag","brand":"Nutella","category":"SPREADS","sub_category":"Spreads Sweet","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01645,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"bag","current_price_exgst":16.45},{"id":"P0332","description":"Spring Rolls Large 12'S","brand":"Marathon","category":"FINGER & SNACK FOODS","sub_category":"Asian - Spring Rolls","item_type":"spring roll","search_aliases":["spring roll"],"base_unit":"g","cost_per_base_unit":0.00639,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":12.79},{"id":"P0333","description":"Spring Water Mini Flat Cap","brand":"Nu Pure","category":"BEVERAGES","sub_category":"Water Still","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00242,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"20 X 250ML","sold_by":"carton","current_price_exgst":12.11},{"id":"P0334","description":"Squid Rings Natural Crumbed","brand":"Pacific West","category":"Value Added","sub_category":"Seafood Value Added","item_type":"squid","search_aliases":["squid","calamari"],"base_unit":"g","cost_per_base_unit":0.01492,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":14.92},{"id":"P0335","description":"Squid Rings Natural Crumbed (App 30-40 Rings)","brand":"Seafrost","category":"Value Added","sub_category":"Seafood Value Added","item_type":"squid","search_aliases":["squid","calamari"],"base_unit":"g","cost_per_base_unit":0.01337,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":13.37},{"id":"P0336","description":"Squid Rings Natural Crumbed (App 30-40 Rings) (I)","brand":"Seafrost","category":"Value Added","sub_category":"Seafood Value Added","item_type":"squid","search_aliases":["squid","calamari"],"base_unit":"g","cost_per_base_unit":0.01337,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":13.37},{"id":"P0337","description":"Squid Tubes U/5 Super Tender","brand":"Seafrost","category":"Squid and Octopus","sub_category":"Squid & Octopus","item_type":"squid","search_aliases":["squid","calamari"],"base_unit":"g","cost_per_base_unit":0.01076,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":53.79},{"id":"P0338","description":"Squid Tubes U/5 Super Tender (I)","brand":"Seafrost","category":"Squid and Octopus","sub_category":"Squid & Octopus","item_type":"squid","search_aliases":["squid","calamari"],"base_unit":"g","cost_per_base_unit":0.00895,"cost_basis":"$/g","is_food":true,"pack_size_raw":"5 KG","sold_by":"carton","current_price_exgst":44.75},{"id":"P0339","description":"Star Anise","brand":"Pandaroo","category":"HERBS  SPICES & SEASONINGS","sub_category":"Herbs & Spices Dried","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.049,"cost_basis":"$/g","is_food":true,"pack_size_raw":"100 GR","sold_by":"packet","current_price_exgst":4.9},{"id":"P0340","description":"Stirrers Wooden Drink","brand":"Caterers Choice","category":"MISCELLANEOUS","sub_category":"Stirrers","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0056,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"1000'S","sold_by":"packet","current_price_exgst":5.6},{"id":"P0341","description":"Stock Vegetable Gourmet All Purpose","brand":"Vegeta","category":"SOUPS & STOCKS","sub_category":"Stocks  Boullions & Boosters","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.01408,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"can","current_price_exgst":14.08},{"id":"P0342","description":"Straws Paper Bamboo Patterned Jumbo Wrapped","brand":"Caterers Choice","category":"MISCELLANEOUS","sub_category":"Straws","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0348,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"250'S","sold_by":"packet","current_price_exgst":8.69},{"id":"P0343","description":"Straws Paper White Regular Wrapped","brand":"Caterers Choice","category":"MISCELLANEOUS","sub_category":"Straws","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0216,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"250'S","sold_by":"packet","current_price_exgst":5.41},{"id":"P0344","description":"Sugar Caster","brand":"Bundaberg","category":"BAKING SUPPLIES","sub_category":"Sugar","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.00228,"cost_basis":"$/g","is_food":true,"pack_size_raw":"15 KG","sold_by":"bag","current_price_exgst":34.25},{"id":"P0345","description":"Sugar P/C Sticks Raw","brand":"Bundaberg","category":"BAKING SUPPLIES","sub_category":"Sugar Portion Control","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.00415,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2000 X 3GR","sold_by":"carton","current_price_exgst":24.89},{"id":"P0346","description":"Sugar P/C Sticks White","brand":"Bundaberg","category":"BAKING SUPPLIES","sub_category":"Sugar Portion Control","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.00501,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2000 X 3GR","sold_by":"carton","current_price_exgst":30.05},{"id":"P0347","description":"Sugar Raw","brand":"Bundaberg","category":"BAKING SUPPLIES","sub_category":"Sugar","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.0019,"cost_basis":"$/g","is_food":true,"pack_size_raw":"15 KG","sold_by":"bag","current_price_exgst":28.43},{"id":"P0348","description":"Sugar White","brand":"Bundaberg","category":"BAKING SUPPLIES","sub_category":"Sugar","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.0027,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":2.7},{"id":"P0349","description":"Sugarcote Cinnamon","brand":"Allied","category":"BAKING SUPPLIES","sub_category":"Sugar","item_type":"sugar","search_aliases":["sugar"],"base_unit":"g","cost_per_base_unit":0.00769,"cost_basis":"$/g","is_food":true,"pack_size_raw":"2 KG","sold_by":"packet","current_price_exgst":15.38},{"id":"P0350","description":"Sweetener P/C Pencil Sticks","brand":"Equal","category":"BAKING SUPPLIES","sub_category":"Sugar Substitutes","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0604,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"500'S","sold_by":"carton","current_price_exgst":30.18},{"id":"P0351","description":"Syrup Butterscotch","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":"butter","search_aliases":["butter"],"base_unit":"ml","cost_per_base_unit":0.01532,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"750 ML","sold_by":"bottle","current_price_exgst":11.49},{"id":"P0352","description":"Syrup Caramel","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.01175,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1.5 LT","sold_by":"bottle","current_price_exgst":17.63},{"id":"P0353","description":"Syrup Golden Turmeric Elixir","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.02619,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"750 ML","sold_by":"bottle","current_price_exgst":19.64},{"id":"P0354","description":"Syrup Hazelnut","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.01536,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"750 ML","sold_by":"bottle","current_price_exgst":11.52},{"id":"P0355","description":"Syrup Matcha Concentrate","brand":"Perfect Matcha","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.03207,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"750 ML","sold_by":"bottle","current_price_exgst":24.05},{"id":"P0356","description":"Syrup Mumbai Chai Organic","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.02207,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"750 ML","sold_by":"bottle","current_price_exgst":16.55},{"id":"P0357","description":"Syrup Vanilla","brand":"Alchemy","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.01175,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1.5 LT","sold_by":"bottle","current_price_exgst":17.63},{"id":"P0358","description":"Tart Blueberry & Almond Pre Cut 16'S 1-105","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0344,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.64 KG","sold_by":"each","current_price_exgst":56.42},{"id":"P0359","description":"Tart Citrus 1-022","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02897,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.6 KG","sold_by":"each","current_price_exgst":46.35},{"id":"P0360","description":"Tart Citrus Individual 1-224","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02929,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 125GR","sold_by":"tray","current_price_exgst":21.97},{"id":"P0361","description":"Tart Lemon Meringue 1-720","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02891,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1.75 KG","sold_by":"each","current_price_exgst":50.59},{"id":"P0362","description":"Tart Lemon Meringue Individual 1-344","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0408,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 100GR","sold_by":"tray","current_price_exgst":24.48},{"id":"P0363","description":"Tart P/C Banoffee","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0266,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 135GR","sold_by":"tray","current_price_exgst":28.73},{"id":"P0364","description":"Tart P/C Chocolate Salted Caramel 1-858","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":"salt","search_aliases":["salt"],"base_unit":"g","cost_per_base_unit":0.03582,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 108GR","sold_by":"tray","current_price_exgst":23.21},{"id":"P0365","description":"Tart P/C Citron","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0263,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 135GR","sold_by":"tray","current_price_exgst":28.4},{"id":"P0366","description":"Tart P/C Citrus Gluten Free 1-316","brand":"Priestleys","category":"DESSERTS","sub_category":"Tarts  Crumbles & Pies","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.02774,"cost_basis":"$/g","is_food":true,"pack_size_raw":"6 X 149GR","sold_by":"tray","current_price_exgst":24.8},{"id":"P0367","description":"Tart P/C Passionfruit","brand":"Spoon Wholesale","category":"DESSERTS","sub_category":"Cake Portions & Individuals","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.0263,"cost_basis":"$/g","is_food":true,"pack_size_raw":"8 X 135GR","sold_by":"tray","current_price_exgst":28.4},{"id":"P0368","description":"Tea Bags Env Earl Grey","brand":"Dilmah","category":"BEVERAGES","sub_category":"Tea - Bags And Leaf","item_type":"tea","search_aliases":["tea"],"base_unit":"ea","cost_per_base_unit":0.1224,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"500'S","sold_by":"carton","current_price_exgst":61.21},{"id":"P0369","description":"Tea Bags Env English Breakfast","brand":"Dilmah","category":"BEVERAGES","sub_category":"Tea - Bags And Leaf","item_type":"tea","search_aliases":["tea"],"base_unit":"ea","cost_per_base_unit":0.1185,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"500'S","sold_by":"carton","current_price_exgst":59.26},{"id":"P0370","description":"Tea Bags Env Peppermint","brand":"Dilmah","category":"BEVERAGES","sub_category":"Tea - Bags And Leaf","item_type":"pepper","search_aliases":["pepper"],"base_unit":"ea","cost_per_base_unit":0.1224,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"500'S","sold_by":"carton","current_price_exgst":61.21},{"id":"P0371","description":"Thermometer Probe Wipes","brand":"Fildes","category":"MISCELLANEOUS","sub_category":"Thermometers","item_type":null,"search_aliases":[],"base_unit":"ea","cost_per_base_unit":0.0985,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"150'S","sold_by":"tub","current_price_exgst":14.77},{"id":"P0372","description":"Topping Banana","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0373","description":"Topping Blue Heaven","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00381,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":11.44},{"id":"P0374","description":"Topping Caramel","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0375","description":"Topping Chocolate","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0376","description":"Topping Cookies & Cream","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":"cream","search_aliases":["cream"],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0377","description":"Topping Green Lime","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0378","description":"Topping Honeycomb","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0379","description":"Topping Mango","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0380","description":"Topping Strawberry","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0381","description":"Topping Vanilla","brand":"Edlyn","category":"DESSERTS","sub_category":"Syrups & Toppings","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00333,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"3 LT","sold_by":"bottle","current_price_exgst":9.99},{"id":"P0382","description":"Tortillas Flour 10","brand":"Caterers Choice","category":"BREAD & PASTRY","sub_category":"Flat Breads And Wraps","item_type":"tortilla","search_aliases":["tortilla"],"base_unit":"ea","cost_per_base_unit":0.3633,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"packet","current_price_exgst":4.36},{"id":"P0383","description":"Tortillas Flour 10\"","brand":"Caterers Choice","category":"BREAD & PASTRY","sub_category":"Flat Breads And Wraps","item_type":"tortilla","search_aliases":["tortilla"],"base_unit":"ea","cost_per_base_unit":0.3508,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"packet","current_price_exgst":4.21},{"id":"P0384","description":"Tortillas Flour 5","brand":"Mission Foods","category":"BREAD & PASTRY","sub_category":"Flat Breads And Wraps","item_type":"tortilla","search_aliases":["tortilla"],"base_unit":"ea","cost_per_base_unit":0.2183,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"packet","current_price_exgst":2.62},{"id":"P0385","description":"Tortillas Flour 5\"","brand":"Mission Foods","category":"BREAD & PASTRY","sub_category":"Flat Breads And Wraps","item_type":"tortilla","search_aliases":["tortilla"],"base_unit":"ea","cost_per_base_unit":0.2183,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"packet","current_price_exgst":2.62},{"id":"P0386","description":"Tortillas Pumpkin 12","brand":"Mission Foods","category":"BREAD & PASTRY","sub_category":"Flat Breads And Wraps","item_type":"tortilla","search_aliases":["tortilla"],"base_unit":"ea","cost_per_base_unit":0.7,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"packet","current_price_exgst":8.4},{"id":"P0387","description":"Tortillas Red Beet 12","brand":"Mission Foods","category":"BREAD & PASTRY","sub_category":"Flat Breads And Wraps","item_type":"tortilla","search_aliases":["tortilla"],"base_unit":"ea","cost_per_base_unit":0.7,"cost_basis":"$/unit","is_food":true,"pack_size_raw":"12'S","sold_by":"packet","current_price_exgst":8.4},{"id":"P0388","description":"Vegemite P/C 4.8Gr (One Serve)","brand":"Vegemite","category":"SPREADS","sub_category":"Vegemite","item_type":null,"search_aliases":[],"base_unit":"g","cost_per_base_unit":0.04139,"cost_basis":"$/g","is_food":true,"pack_size_raw":"90 X 4.8GR","sold_by":"tray","current_price_exgst":17.88},{"id":"P0389","description":"Vinegar White Imitation","brand":"Edlyn","category":"VINEGAR","sub_category":"Vinegar Other","item_type":"vinegar","search_aliases":["vinegar"],"base_unit":"ml","cost_per_base_unit":0.00127,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"4 LT","sold_by":"bottle","current_price_exgst":5.07},{"id":"P0390","description":"Water Coconut Natural","brand":"Coco Coast","category":"BEVERAGES","sub_category":"Water Coconut","item_type":null,"search_aliases":[],"base_unit":"ml","cost_per_base_unit":0.00275,"cost_basis":"$/ml","is_food":true,"pack_size_raw":"1.25 LT","sold_by":"bottle","current_price_exgst":3.44},{"id":"P0391","description":"Whiting Crumbed Goujons (Msc) (I)","brand":"Seafrost","category":"Fish","sub_category":"Crumbed Fish","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.01164,"cost_basis":"$/g","is_food":true,"pack_size_raw":"1 KG","sold_by":"packet","current_price_exgst":11.64},{"id":"P0392","description":"Whiting Tempura Flt Lemon Aust (Seafrost)","brand":"Local Catch","category":"Fish","sub_category":"Battered Fish","item_type":"fish","search_aliases":["fish","fillet"],"base_unit":"g","cost_per_base_unit":0.02428,"cost_basis":"$/g","is_food":true,"pack_size_raw":"3 KG","sold_by":"carton","current_price_exgst":72.85},{"id":"P0393","description":"Wipes Pieces Blue 60 X 60Cm Heavy Duty","brand":"Cater Clean","category":"CLEANING & JANITORIAL","sub_category":"Wipes & Cloths","item_type":"pie","search_aliases":["pie"],"base_unit":"ea","cost_per_base_unit":0.4985,"cost_basis":"$/unit","is_food":false,"pack_size_raw":"20'S","sold_by":"packet","current_price_exgst":9.97}];
const BASE_IDS = new Set(BASE_PRODUCTS.map(p=>p.id));
const OVRKEY = "cafeDB_overrides";

/* ================== Supabase data layer (single source of truth) ==================
   Local storage is kept only as an OFFLINE MIRROR so the app still opens and search
   still works with no signal. On every load we replace the mirror with server data. */
var SUPA = (window.supabase && window.SUPA_URL) ? window.supabase.createClient(window.SUPA_URL, window.SUPA_KEY) : null;

function setSync(state){
  var el=document.getElementById('syncBanner'); if(!el) return;
  var map={loading:'Loading latest data\u2026', saving:'Saving\u2026', ok:'Saved',
           offline:"Offline \u2014 changes won't save", error:"Can't reach server \u2014 working offline"};
  el.textContent=map[state]||''; el.setAttribute('data-state',state||''); el.hidden=false;
  clearTimeout(el.__t);
  if(state==='ok'){ el.__t=setTimeout(function(){ el.hidden=true; }, 1400); }
}
function online(){ return !!SUPA && navigator.onLine; }
function errText(err){ return (err && (err.message||err.error_description||err.error||err.details||err.hint||err.code)) || 'unknown error'; }
function pushWrite(builder, label){
  if(!SUPA) return Promise.resolve(null);            // no client configured
  setSync('saving');
  // v40: do NOT pre-skip on navigator.onLine \u2014 it false-reports 'offline' in installed PWAs (caf\u00e9 phones),
  // which both showed a bogus "offline" banner AND silently dropped the write. A dropped menu-item write then
  // let a plate reference a row that was never sent (plates_menu_id_fkey). We ATTEMPT the write and judge by
  // the real outcome; a thrown error below is the genuine-offline / unreachable case.
  return Promise.resolve().then(builder).then(function(res){          // returns the settled result so ordered writes (menu -> plate) can chain
    if(res && res.error){ console.error('[sync] '+label+' failed:', res.error); setSync('error'); toast('Couldn\u2019t save '+label+': '+errText(res.error)); }
    else { setSync('ok'); }
    return res;
  }).catch(function(e){ console.error('[sync] '+label+' error:', e);
    if(!navigator.onLine){ setSync('offline'); }                      // genuinely offline: quiet banner, no scary toast \u2014 it's saved locally
    else { setSync('error'); toast('Couldn\u2019t save '+label+': '+errText(e)); }
    return {error:e};
  });
}

/* row mappers */
function ingredientToRow(p){ return {
  id:p.id, description:p.description, brand:p.brand||null, category:p.category||null,
  sub_category:p.sub_category||null, item_type:p.item_type||null, base_unit:p.base_unit||null,
  cost_per_base_unit:(p.cost_per_base_unit==null?null:p.cost_per_base_unit), cost_basis:p.cost_basis||null,
  is_food:(p.is_food!==false), pack_size_raw:p.pack_size_raw||null, sold_by:p.sold_by||null,
  current_price_exgst:(p.current_price_exgst==null?null:p.current_price_exgst),
  price_as_of:(p.price_as_of||null), search_aliases:(p.search_aliases||[]),
  supplier:p.supplier||null,
  pack_qty:(p.pack_qty==null?null:p.pack_qty), pack_unit:p.pack_unit||null,
  is_custom:!BASE_IDS.has(p.id) }; }
// v55: a dish links to its plate via menu_items.plate_id (canonical). source_plate_id is legacy — still
// READ as a fallback for rows not yet migrated, never relied on as the primary link.
function rowToMenu(r){ return {id:r.id, section:r.section, name:r.name, price:r.price, notes:r.notes||'', custom:!!r.is_custom, menuId:(r.menu_id||'MENU_ORIGINAL'), plateId:(r.plate_id||r.source_plate_id||null), sourcePlateId:(r.source_plate_id||null)}; }
// v55: plates.menu_id is legacy (a plate no longer belongs to one dish). Not read into the model anymore.
function rowToPlate(r){ return {id:r.id, name:r.name, lines:Array.isArray(r.lines)?r.lines:[], category:(r.category||null)}; }

/* writes */
function dbPushIngredient(id){ var p=byId[id]; if(!p) return; pushWrite(function(){ return SUPA.from('ingredients').upsert(ingredientToRow(p)); }, 'ingredient'); }
// v55: write plate_id (canonical) and MIRROR it to source_plate_id, so a device still running v54 keeps
// resolving the dish's plate during the rollout. Requires the plate_id migration applied first (v43 lesson).
function dbPushMenu(item){ var pid=(item.plateId||item.sourcePlateId||null); return pushWrite(function(){ return SUPA.from('menu_items').upsert({id:item.id, section:item.section, name:item.name, price:item.price, notes:item.notes||null, is_custom:true, menu_id:(item.menuId||'MENU_ORIGINAL'), plate_id:pid, source_plate_id:pid}); }, 'menu item'); }
function dbUpsertMenuRecord(m){ return pushWrite(function(){ return SUPA.from('menus').upsert({id:m.id, name:m.name, season:m.season||null}); }, 'menu'); }
// v55: a plate no longer carries a menu link (many-to-many lives on menu_items.plate_id). menu_id is left
// out of the write — the legacy column keeps whatever it had and is never read. category (§J) is the plate
// library's own grouping (independent of per-menu sections).
function dbPushPlate(sp){ if(!sp) return Promise.resolve(null); return pushWrite(function(){ return SUPA.from('plates').upsert({id:sp.id, name:sp.name, lines:sp.lines||[], category:(sp.category||null)}); }, 'plate'); }
function dbDeletePlate(id){ pushWrite(function(){ return SUPA.from('plates').delete().eq('id',id); }, 'plate delete'); }
function dbSetSetting(key,val){ pushWrite(function(){ return SUPA.from('app_settings').upsert({key:key, value:val}); }, 'setting'); }

/* first-run seed: push the built-in catalogue + menu if the tables are empty */
async function seedIfEmpty(){
  try{
    var ic=await SUPA.from('ingredients').select('id',{count:'exact',head:true});
    if(!ic.error && ic.count===0){ await SUPA.from('ingredients').upsert(BASE_PRODUCTS.map(ingredientToRow)); }
    var mc=await SUPA.from('menu_items').select('id',{count:'exact',head:true});
    if(!mc.error && mc.count===0){ await SUPA.from('menu_items').upsert(BASE_MENU.map(function(m){ return {id:m.id, section:m.section, name:m.name, price:m.price, notes:null, is_custom:false}; })); }
  }catch(e){ console.error('[sync] seed failed:', e); }
}

// v42 (Item 1): given the server snapshot and the local array, return the merged list (server rows PLUS any
// local rows the server doesn't have yet — a dropped offline write) and the list of those local-only rows to
// re-push. Tombstoned ids (deliberately deleted) are never resurrected. Pure + unit-tested (menu-plate-order).
// Idempotent: once the re-push lands, the next server snapshot contains those ids, so localOnly is empty and
// merged has no duplicates.
function reconcileLocalOnly(local, server, tombstones){
  var have={}; (server||[]).forEach(function(r){ if(r&&r.id!=null) have[r.id]=true; });
  var tomb={}; (tombstones||[]).forEach(function(id){ tomb[id]=true; });
  var localOnly=(local||[]).filter(function(r){ return r && r.id!=null && !have[r.id] && !tomb[r.id]; });
  return { merged:(server||[]).concat(localOnly), localOnly:localOnly };
}

/* pull everything from Supabase and refresh the UI */
async function bootstrapSync(){
  if(!SUPA){ setSync('offline'); window.__ezReady=true; return; }
  if(!navigator.onLine){ setSync('offline'); window.__ezReady=true; return; }
  setSync('loading');
  try{
    await seedIfEmpty();
    var results=await Promise.all([
      SUPA.from('ingredients').select('*'),
      SUPA.from('menu_items').select('*'),
      SUPA.from('plates').select('*'),
      SUPA.from('app_settings').select('*')
    ]);
    var ing=results[0], men=results[1], pla=results[2], setg=results[3];
    if(ing.error||men.error||pla.error) throw (ing.error||men.error||pla.error);
    var ov={}; (ing.data||[]).forEach(function(r){ ov[r.id]=r; }); overrides=ov; saveOverrides(); rebuild();
    var setRows=(setg&&setg.data)?setg.data:[];
    var delRow=setRows.filter(function(r){return r.key==='deleted_menu_ids';})[0];
    deletedMenuIds=(delRow&&Array.isArray(delRow.value))?delRow.value:[]; saveDeletedMenu();
    var delP=setRows.filter(function(r){return r.key==='deleted_prod_ids';})[0];
    if(delP&&Array.isArray(delP.value)){ deletedProdIds=delP.value; saveDeletedProds(); }
    var kiRow=setRows.filter(function(r){return r.key==='kitchen_ingredients';})[0];
    if(kiRow&&Array.isArray(kiRow.value)){ kitchenIngredients=kiRow.value; saveKitchenLS(); rebuildKById(); }
    var kwsRow=setRows.filter(function(r){return r.key==='king_wiz_skips';})[0];                 // ITEM 4 (v35): wizard skips are shared across staff devices
    if(kwsRow&&Array.isArray(kwsRow.value)){ setKingWizSkips(kwsRow.value); }
    // v42 (Item 1): HEAL, don't clobber. A dish created offline may never have reached the server (pushWrite
    // drops writes offline — the known gap). Blindly replacing local with the server snapshot would DESTROY it
    // on reload, and any plate referencing that dish would FK-fail forever. Keep local-only dishes, merge them,
    // and re-push them (idempotent) so the server catches up. deletedMenuIds tombstones are respected.
    var recMenu=reconcileLocalOnly(customMenu, (men.data||[]).map(rowToMenu), deletedMenuIds);
    customMenu=recMenu.merged; saveCustomMenu();
    try{ var mres=await SUPA.from('menus').select('*'); if(mres && !mres.error && Array.isArray(mres.data) && mres.data.length){ menusList=mres.data.map(function(r){return {id:r.id, name:r.name, season:r.season||null};}); } }catch(e){ /* menus table may not exist yet -> keep local/default */ }
    ensureDefaultMenu(); saveMenus();   // v54: seed Original only on a fresh install; a synced empty menus set is respected (zero menus is legitimate)
    if(!menusList.some(function(m){return m.id===currentMenuId;})) setCurrentMenuId(fallbackMenuId());
    // v42/v55 (HEAL, don't clobber): keep local-only rows and re-push them idempotently. v55 flips the FK
    // (menu_items.plate_id -> plates.id), so re-push local-only PLATES first, then re-push each local-only
    // DISH only AFTER the plate it references has landed — otherwise the dish orphans against a missing plate.
    var recPlate=reconcileLocalOnly(savedPlates, (pla.data||[]).map(rowToPlate), null);
    savedPlates=recPlate.merged; savePlatesLS(); rebuildMenu();
    var platePushById={};
    recPlate.localOnly.forEach(function(sp){ platePushById[sp.id]=dbPushPlate(sp); });
    recMenu.localOnly.filter(function(c){return c.custom;}).forEach(function(c){
      var pid=plateIdOf(c), pp=(pid&&platePushById[pid])?platePushById[pid]:null;
      if(!pp){ dbPushMenu(c); return; }                                       // its plate is already on the server -> push the dish now
      Promise.resolve(pp).then(function(res){ if(res && !res.error) dbPushMenu(c); });   // wait for the plate to land first
    });
    try{ var _h=await SUPA.from('price_history').select('*').order('recorded_at',{ascending:true}); if(_h && _h.data){ priceHistory=_h.data.map(function(r){return {t:new Date(r.recorded_at).getTime(), v:Number(r.avg_food_cost_pct)};}); saveHistory(); } }catch(e){}
    try{ var spr=await SUPA.from('supplier_phrases').select('*'); if(spr && !spr.error && Array.isArray(spr.data)){ var mm={}; spr.data.forEach(function(r){ mm[r.id]={id:r.id, supplier:r.supplier, phrase_norm:r.phrase_norm, qty:Number(r.qty), unit:r.unit}; }); supplierMem=mm; saveSupplierMem(); } }catch(e){ /* supplier_phrases table may not exist yet -> keep local */ }
    var impRow=setRows.filter(function(r){return r.key==='last_invoice_import';})[0];
    if(impRow && impRow.value){ try{ localStorage.setItem('cafeDB_lastImport', impRow.value); }catch(e){} }
    var cogsRow=setRows.filter(function(r){return r.key==='food_cost_target';})[0];
    if(cogsRow && cogsRow.value!=null){ var pv=parseFloat(cogsRow.value); if(pv>=1&&pv<=99){ cogsPct=pv; try{localStorage.setItem('cafeDB_cogsPct',String(pv));}catch(e){} if(typeof syncCogsRead==='function') syncCogsRead(); var ci2=document.getElementById('setCogsInput'); if(ci2)ci2.value=pv; } }
    var gstRow=setRows.filter(function(r){return r.key==='gst_default';})[0];                    // ITEM 6 (v35): brand-new accounts have no row -> loadGstDefault's 'ex' stands, preserving current behaviour
    if(gstRow && (gstRow.value==='inc'||gstRow.value==='ex')){ setGstDefault(gstRow.value,false); var gi=document.getElementById('setGstDefault'); if(gi)gi.value=gstRow.value; }
    buildMenuOptions(); buildMenuSelector(); renderPlate(); renderPlatesTab(); renderAnalysis(); updateLastImport(); updateEditTag();
    setSync('ok'); window.__ezReady=true;
  }catch(err){ console.error('[sync] load failed:', err); setSync('error'); window.__ezReady=true; }
}
/* ================== end Supabase data layer ================== */

/* ITEM 5 — pull-to-refresh entry point. bootstrapSync re-fetches all shared
   stores and repaints; it does NOT touch plate[] or the plate-name input, so
   an in-progress build survives a refresh. Safe to call repeatedly. */
function refreshFromCloud(){
  if(!SUPA || !navigator.onLine){ toast('Offline \u2014 showing saved data'); return Promise.resolve(); }
  return Promise.resolve(bootstrapSync()).then(function(){ rerenderCurrentTab(); }, function(){ rerenderCurrentTab(); });
}


function loadOverrides(){ try{ return JSON.parse(localStorage.getItem(OVRKEY)) || {}; }catch(e){ return {}; } }
function saveOverrides(){ try{ localStorage.setItem(OVRKEY, JSON.stringify(overrides)); }catch(e){ /* storage blocked: session-only */ } }
let overrides = loadOverrides();

let PRODUCTS, byId, SEARCHABLE;
var deletedProdIds=(function(){ try{ return JSON.parse(localStorage.getItem('cafeDB_deletedProds'))||[]; }catch(e){ return []; } })();
function saveDeletedProds(){ try{ localStorage.setItem('cafeDB_deletedProds', JSON.stringify(deletedProdIds)); }catch(e){} }
function rebuild(){
  const map = new Map(BASE_PRODUCTS.map(p=>[p.id, Object.assign({}, p)]));
  for(const id in overrides){
    const ov = overrides[id];
    map.set(id, map.has(id) ? Object.assign({}, map.get(id), ov) : Object.assign({}, ov));
  }
  (deletedProdIds||[]).forEach(function(id){ map.delete(id); });          // hidden/deleted ingredients never appear
  PRODUCTS = [...map.values()];
  byId = Object.fromEntries(PRODUCTS.map(p=>[p.id, p]));
  SEARCHABLE = PRODUCTS.filter(p=>p.is_food);
}
function setOverride(id, patch){ overrides[id] = Object.assign({}, overrides[id]||{}, patch); saveOverrides(); rebuild(); dbPushIngredient(id); }
rebuild();

function unitNoun(p){return p.base_unit==='g'?'g':p.base_unit==='ml'?'ml':p.base_unit==='ea'?'unit':'';}
function displayUnitWord(p){return p.base_unit==='g'?'kg':p.base_unit==='ml'?'L':'unit';}
function defaultQty(p){return null;}   // v60 (Max): new lines start EMPTY (blank field) — a quantity must be entered before the plate can be saved (see saveCurrentPlate)
function cpbu(p){return p.cost_per_base_unit;}
function perDisplayValue(p){const c=cpbu(p);if(c==null)return null;return (p.base_unit==='g'||p.base_unit==='ml')?c*1000:c;}
function unitCostStr(p){const c=cpbu(p);if(c==null)return '—';
  if(p.base_unit==='g')return '$'+(c*1000).toFixed(2)+'/kg';
  if(p.base_unit==='ml')return '$'+(c*1000).toFixed(2)+'/L';
  if(p.base_unit==='ea')return '$'+c.toFixed(2)+'/unit';return '—';}
function money(x){return '$'+x.toFixed(2);}
function lineCost(p,qty){if(!p)return null;const c=cpbu(p);return c==null?null:qty*c;}
function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

/* ============================================================
   Phase 2 — "kitchen words": a kitchen ingredient is a name that
   points at exactly one product. Recipes reference the ingredient;
   swapping its product re-prices every recipe with ZERO plate writes.
   Store: localStorage mirror + the app_settings row 'kitchen_ingredients'.
   ============================================================ */
var KINGKEY='cafeDB_kitchenIngredients';
function loadKitchenIngredients(){ try{ var a=JSON.parse(localStorage.getItem(KINGKEY)); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
var kitchenIngredients=loadKitchenIngredients();
var kById={};
function rebuildKById(){ kById={}; (kitchenIngredients||[]).forEach(function(k){ if(k&&k.id) kById[k.id]=k; }); }
rebuildKById();
function saveKitchenLS(){ try{ localStorage.setItem(KINGKEY, JSON.stringify(kitchenIngredients)); }catch(e){} }
function saveKitchenIngredients(){ saveKitchenLS(); rebuildKById(); if(typeof dbSetSetting==='function') dbSetSetting('kitchen_ingredients', kitchenIngredients); }
function nextKid(){                                                   // 'K0001' + zero-padded, stable across the store
  var max=0; (kitchenIngredients||[]).forEach(function(k){ var n=parseInt(String(k.id||'').replace(/^K/,''),10); if(isFinite(n)&&n>max)max=n; });
  return 'K'+String(max+1).padStart(4,'0');
}
/* the one resolver every plate-line consumer uses to find a line's product */
function lineProduct(l){
  if(!l || l.misc) return null;
  if(l.kid){ var k=kById[l.kid]; return (k && byId[k.pid]) || null; }
  return byId[l.pid] || null;
}
/* a stable line signature for dirty-detection (kid + misc aware) */
function lineSig(l){
  if(!l) return '';
  if(l.misc) return 'misc:'+(l.label||'')+':'+(Number(l.cost)||0);
  return (l.kid?('K'+l.kid):l.pid)+':'+l.qty;
}

/* ---------- search ---------- */
function subseq(q,t){let i=0;for(let k=0;k<t.length&&i<q.length;k++){if(t[k]===q[i])i++;}return i===q.length;}
/* v59: THE shared search matcher — token-order-independent, used by every list search bar
   (Products, Ingredients, Plates, Menu, builder #q). The query splits into whitespace tokens;
   EVERY token must appear as a substring of the (already-lowercased) haystack, in ANY order, so
   "gluten free bread" matches "Bread Gluten Free". Empty query matches everything. Callers build
   ONE lowercase haystack per item per render and reuse the tokenised query — no regex, no
   per-keystroke-per-row allocation. */
function searchTokens(q){ return String(q==null?'':q).toLowerCase().split(/\s+/).filter(Boolean); }
function matchTokens(tokens,hay){ for(var i=0;i<tokens.length;i++){ if(hay.indexOf(tokens[i])<0) return false; } return true; }
function runSearch(raw){
  const q=raw.trim().toLowerCase();
  if(!q) return SEARCHABLE.slice().sort((a,b)=>a.description.localeCompare(b.description)).slice(0,40);
  const out=[];
  for(const p of SEARCHABLE){
    const nm=p.description.toLowerCase(), cat=(p.category||'').toLowerCase(), ty=(p.item_type||'').toLowerCase(),
          al=(p.search_aliases||[]).join(' ').toLowerCase(), br=(p.brand||'').toLowerCase();
    let s=-1; const idx=nm.indexOf(q);
    if(idx>=0) s=1000-idx;
    else if(ty && (ty.includes(q)||q.includes(ty))) s=620;
    else if(al.includes(q)) s=560;
    else if(br.includes(q)) s=500;
    else if(cat.includes(q)) s=420;
    else if(subseq(q,nm)) s=200;
    if(s>=0) out.push([s,p]);
  }
  out.sort((a,b)=>b[0]-a[0]||a[1].description.localeCompare(b[1].description));
  return out.slice(0,40).map(x=>x[1]);
}
function hl(text,q){q=q.trim();if(!q)return esc(text);const i=text.toLowerCase().indexOf(q.toLowerCase());
  if(i<0)return esc(text);return esc(text.slice(0,i))+'<mark>'+esc(text.slice(i,i+q.length))+'</mark>'+esc(text.slice(i+q.length));}
const qEl=document.getElementById('q'), dropEl=document.getElementById('drop');
(function(){ var qc=document.getElementById('qClear'); if(qc&&qEl) qc.addEventListener('click',function(){ qEl.value=''; closeDrop(); qEl.focus(); }); })();   // v37: same clear affordance as every other search. v61 item 7 ROOT CAUSE: this used to hide the dropdown with an INLINE display none, which permanently beat .drop.open{display:block} — after one × clear, every later search rendered but stayed invisible (dead till reload). closeDrop() toggles the class only, so the dropdown re-opens normally.
let curList=[], hiIdx=-1;
function kitchenSearchMatches(q){                                     // v55 §G: match the kitchen word's name OR its linked product's description/brand (same as the pantry search, kingSearchFilter). Example: ingredient "Bread" -> product "Bread GF — TipTop" is found by "gf" or "tiptop".
  var list=kingSearchFilter(q, kitchenIngredients, byId).filter(function(k){ return k && k.name; });
  list.sort(function(a,b){ return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
  return list.slice(0,12).map(function(k){ return {__kid:true, id:k.id, name:k.name, pid:k.pid}; });
}
function pickListItem(it){ if(!it) return; if(it.__kid) addKitchenLine(it.id); }   // v59: create-from-search removed — ingredients are made on the Ingredients tab
function renderDrop(){
  const q=qEl.value;
  if(dropEl.style.display) dropEl.style.display='';                   // v61 item 7: never let an inline display override .drop.open — visibility is class-driven only
  curList=kitchenSearchMatches(q); hiIdx=-1;                          // BUILDER IS INGREDIENTS-ONLY: recipes are built from kitchen words, never raw supplier products
  if(!curList.length){
    const qt=(q||'').trim();
    // v59: the builder never creates ingredients \u2014 they're made on the Ingredients tab only.
    dropEl.innerHTML=qt
      ? '<div class="opt opt-msg" style="cursor:default">No ingredient called \u201c'+esc(qt)+'\u201d \u2014 add it on the Ingredients tab first.</div>'
      : '<div class="opt opt-msg" style="cursor:default">Type to find an ingredient, or add one on the Ingredients tab.</div>';
    dropEl.classList.add('open');return;
  }
  dropEl.innerHTML=curList.map((it,i)=>{
    const p=byId[it.pid];
    return `<div class="opt king-opt" role="option" data-i="${i}" data-kid="${esc(it.id)}">
       <span class="nm">${hl(it.name,q)} <span class="ca">${p?'\u2192 '+esc(p.description):'\u2192 (product missing)'}</span></span>
       <span class="uc">${p?unitCostStr(p):'\u2014'}</span></div>`;
  }).join('');
  dropEl.classList.add('open'); qEl.setAttribute('aria-expanded','true');
}
function closeDrop(){dropEl.classList.remove('open');qEl.setAttribute('aria-expanded','false');hiIdx=-1;}
qEl.addEventListener('input',renderDrop);
qEl.addEventListener('focus',renderDrop);
qEl.addEventListener('keydown',e=>{
  if(!dropEl.classList.contains('open'))return;
  if(e.key==='ArrowDown'){e.preventDefault();hiIdx=Math.min(hiIdx+1,curList.length-1);paintHi();}
  else if(e.key==='ArrowUp'){e.preventDefault();hiIdx=Math.max(hiIdx-1,0);paintHi();}
  else if(e.key==='Enter'){e.preventDefault();const pick=hiIdx>=0?curList[hiIdx]:curList[0];pickListItem(pick);}
  else if(e.key==='Escape'){closeDrop();}
});
function paintHi(){[...dropEl.children].filter(c=>c.hasAttribute('role')).forEach((c,i)=>c.classList.toggle('hi',i===hiIdx));const el=dropEl.querySelectorAll('[role="option"]')[hiIdx];if(el)el.scrollIntoView({block:'nearest'});}
dropEl.addEventListener('mousedown',e=>{const o=e.target.closest('.opt');if(!o)return;e.preventDefault();
  if(o.dataset.kid){ addKitchenLine(o.dataset.kid); }});   // v59: no create branch
document.addEventListener('click',e=>{if(!e.target.closest('.search-wrap'))closeDrop();});

/* ---------- alternatives ---------- */
function alternatives(p){
  if(cpbu(p)==null) return {alts:[],cheapest:true};
  const base=PRODUCTS.filter(x=>x.is_food&&cpbu(x)!=null&&x.base_unit===p.base_unit&&x.id!==p.id);
  let pool;
  if(p.item_type){const t=base.filter(x=>x.item_type===p.item_type);pool=t.length>=1?t:base.filter(x=>x.category===p.category);}
  else pool=base.filter(x=>x.category===p.category);
  pool.sort((a,b)=>cpbu(a)-cpbu(b));
  const cheaper=pool.filter(x=>cpbu(x)<cpbu(p));
  return {alts:pool.slice(0,3), cheapest:cheaper.length===0};
}
/* v69 (Max): the SUBSTITUTION insight must never cross distinct foodstuffs — it once suggested swapping
   Bacon for Ham because both share the coarse category "SMALLGOODS" (alternatives()'s category fallback).
   For a suggestion the app puts in a chef's face, matching must be CONSERVATIVE and fail closed:
   the cheaper product must be the SAME ingredient (finest grain first — sub_category, else the specific
   item_type; NEVER the coarse category) AND share the current product's leading noun as a name-safety net.
   No item_type and no sub_category → we can't be sure → suggest nothing. `list` is injectable for tests. */
function subCandidate(p, list){
  var C=function(x){ return x.cost_per_base_unit; };
  if(!p || C(p)==null) return null;
  var primary=(searchTokens(p.description||'')[0]||'');            // the leading word is the ingredient (bacon, cheese…)
  function sameKind(x){
    if(p.sub_category) return x.sub_category===p.sub_category;     // finest grain wins (e.g. "Bacon Rashers")
    if(p.item_type)   return x.item_type===p.item_type;           // else the specific type — never the coarse category
    return false;                                                  // nothing precise to match on → don't guess
  }
  var pool=(list||PRODUCTS).filter(function(x){
    if(!x || !x.is_food || C(x)==null || x.base_unit!==p.base_unit || x.id===p.id) return false;
    if(!(C(x)<C(p))) return false;                                 // cheaper only
    if(!sameKind(x)) return false;
    return primary && String(x.description||'').toLowerCase().indexOf(primary)>=0;   // must share the ingredient word
  });
  pool.sort(function(a,b){ return C(a)-C(b); });
  return pool[0]||null;
}

/* ---------- plate ---------- */
let plate=[], uidc=1;
const linesEl=document.getElementById('lines');
function addProduct(pid){const p=byId[pid];if(!p)return;plate.push({uid:uidc++,pid,qty:defaultQty(p)});qEl.value='';closeDrop();renderPlate();qEl.focus();}   /* legacy: no builder UI path in v31 (builder is ingredients-only); retained for programmatic use */
function addKitchenLine(kid){const k=kById[kid];if(!k)return;const p=byId[k.pid];plate.push({uid:uidc++,kid:kid,qty:p?defaultQty(p):null});qEl.value='';closeDrop();renderPlate();qEl.focus();}   /* v60: qty starts empty */
function removeLine(uid){plate=plate.filter(l=>l.uid!==uid);renderPlate();}
function swapLine(uid,newpid){const l=plate.find(x=>x.uid===uid);if(!l)return;l.pid=newpid;const np=byId[newpid];if(np.base_unit==='ea'&&l.qty>100)l.qty=defaultQty(np);renderPlate();}   /* legacy: alternatives moved to the ingredient popup in v31 */
function setQty(uid,v){const l=plate.find(x=>x.uid===uid);if(!l)return;const s=(v==null?'':String(v)).trim();const n=parseFloat(s);l.qty=(s===''||isNaN(n))?null:Math.max(0,n);updateLine(uid);updateTotals();}   // v60: a cleared field is null (empty), not 0 — save requires a real quantity
function toggleAlts(uid){const el=document.getElementById('alts-'+uid);if(el)el.classList.toggle('open');}

function editPrice(uid){
  const l=plate.find(x=>x.uid===uid);if(!l)return;const p=lineProduct(l);if(!p)return;
  if(!['g','ml','ea'].includes(p.base_unit))return;
  const chip=document.getElementById('pc-'+uid);if(!chip)return;
  const word=displayUnitWord(p), val=perDisplayValue(p);
  chip.innerHTML='$<input class="pin" type="number" min="0" step="0.01" value="'+(val!=null?val.toFixed(2):'')+'"> /'+word;   // v55 §E3: autofilled price shows 2dp (the stored cost_per_base_unit stays exact until the user commits an edit)
  const inp=chip.querySelector('input'); inp.focus(); inp.select();
  let cancelled=false;
  inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();inp.blur();}else if(e.key==='Escape'){cancelled=true;renderPlate();}});
  inp.addEventListener('blur',()=>{ if(!cancelled) commitPrice(uid,inp.value); },{once:true});
}
function commitPrice(uid,raw){
  const l=plate.find(x=>x.uid===uid);if(!l){renderPlate();return;}const p=lineProduct(l);if(!p){renderPlate();return;}
  const v=parseFloat(raw);
  if(!isNaN(v)&&v>=0){
    const base=(p.base_unit==='g'||p.base_unit==='ml')?v/1000:v;
    setOverride(p.id,{cost_per_base_unit:base});
    logHistory();
  }
  renderPlate();
}

function miscRowHtml(l){                                              // a removable non-ingredient cost line (spices, boxes, etc.)
  // v67 item 3: a misc line is a SIBLING of an ingredient line \u2014 it reuses the exact two-row .line
  // skeleton (.top = label + \u00d7, .costs = leader + amount) so row height and every column line up
  // pixel-wise. v69 (REVERSAL of the v60 "no name field" rule, Max's call): the name is EDITABLE again so
  // the user can label the line ("Packaging", "Spices"), occupying the ingredient row's name slot (.nm);
  // blank shows "Misc" as a placeholder. The $ input stays in the far-right total (.lc) slot; the leader
  // grows to push it there. The \u00d7 lands in the same top-right column as every ingredient row's \u00d7.
  // Same ids/handlers (setMiscLabel/setMiscCost/removeLine); the stored label now round-trips through save.
  return '<div class="line misc-line" data-uid="'+l.uid+'">'
    +'<div class="top">'
      +'<span class="nm"><input type="text" class="misc-name" value="'+esc(l.label||'')+'" placeholder="Misc" aria-label="misc cost label" oninput="setMiscLabel('+l.uid+',this.value)"></span>'
      +'<button class="x" type="button" title="Remove" aria-label="Remove" onclick="removeLine('+l.uid+')">\u00d7</button>'
    +'</div>'
    +'<div class="costs">'
      +'<span class="leader"></span>'
      +'<span class="qtybox misc-costbox"><span class="u">$</span><input type="number" min="0" step="0.01" value="'+(l.cost!=null?l.cost:0)+'" aria-label="misc cost amount" oninput="setMiscCost('+l.uid+',this.value)"></span>'
    +'</div>'
    +'</div>';
}
function addMiscCost(){                                               // Builder-only; never enters the ingredient DB
  plate.push({uid:uidc++, misc:true, label:'', cost:0});
  renderPlate();
  var rows=document.querySelectorAll('.misc-line .misc-name'); var last=rows[rows.length-1]; if(last) last.focus();   // v69: name field restored (reverses v60) — focus it so the line can be labelled
}
function setMiscLabel(uid,v){ var l=plate.find(function(x){return x.uid===uid;}); if(l) l.label=v; }
function setMiscCost(uid,v){ var l=plate.find(function(x){return x.uid===uid;}); if(l){ l.cost=parseFloat(v)||0; var lc=document.getElementById('lc-'+uid); if(lc) lc.innerHTML=money(l.cost); updateTotals(); } }
function renderPlate(){
  var nIng=plate.filter(function(l){return !l.misc;}).length;
  document.getElementById('dCount').textContent=nIng+(nIng===1?' item':' items');
  if(!plate.length){linesEl.innerHTML='<div class="empty">No ingredients yet.<br>Search above to add the first one.</div>';updateTotals();return;}
  linesEl.innerHTML=plate.map(l=>{
    if(l.misc){ return miscRowHtml(l); }
    const p=lineProduct(l);
    const isKid=!!l.kid;
    const kName=isKid?((kById[l.kid]&&kById[l.kid].name)||'Ingredient'):null;
    if(!p){                                                    // orphaned line: deleted product or broken kitchen link — greyed, still counted as missing
      const title=isKid?esc(kName):'Product';
      // v44 item 8: two rows per line — name row (.top) then costs row (.costs). Same inputs/ids/handlers, layout only.
      return `<div class="line missing-line" data-uid="${l.uid}">
      <div class="top">
        <span class="nm"><b>${title}</b><span class="sub warn">product missing</span></span>
        <button class="x" type="button" title="Remove" aria-label="Remove" onclick="removeLine(${l.uid})">×</button>
      </div>
      <div class="costs">
        <span class="qtybox"><input type="number" min="0" step="1" value="${l.qty==null?'':l.qty}" placeholder="qty" aria-label="quantity" oninput="setQty(${l.uid},this.value)"></span>
        <span class="leader"></span>
        <span class="lc"><span class=nocost>no cost</span></span>
      </div></div>`;
    }
    const lc=lineCost(p,l.qty);
    const editable = ['g','ml','ea'].includes(p.base_unit);
    const priceChip = editable
      ? `<span class="pchip" id="pc-${l.uid}" tabindex="0" role="button" title="Click to edit price" onclick="editPrice(${l.uid})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();editPrice(${l.uid})}">${unitCostStr(p)} <span class="pen">✎</span></span>`
      : `<span>${unitCostStr(p)}</span>`;
    let nameBlock, priceline;
    // v44 item 8 (Max's mockup): row 1 = name + meta, row 2 = qty + unit price + line cost,
    // left-aligned on their own line. Same inputs, ids and handlers — the nodes just moved.
    // v45 items 6/7 (declutter, Max's call): the "· new"/"· edited" badges, the category half of
    // the subtitle and the orange "ingredient" pill (.row2/.king-tag) are all REMOVED, not hidden.
    if(isKid){                                                  // kitchen word up top, linked product small underneath
      nameBlock=`<b>${esc(kName)}</b>
          <span class="sub">→ ${esc(p.description)}${p.brand?' · '+esc(p.brand):''}</span>`;
      priceline=`<span class="priceline" title="unit cost">@ ${priceChip}</span>`;   // v44 item 8: docket idiom "100 g @ $2.63/kg" — the words "Unit cost:" blew the 380px budget
    } else {                                                     // legacy direct-product line (pre-v31 saved plates): render + cost, no alternatives
      nameBlock=`<b>${esc(p.description)}</b>${p.brand?`
          <span class="sub">${esc(p.brand)}</span>`:''}`;
      priceline=`<span class="priceline" title="unit cost">@ ${priceChip}</span>`;
    }
    return `<div class="line" data-uid="${l.uid}">
      <div class="top">
        <span class="nm">
          ${nameBlock}
        </span>
        <button class="x" type="button" title="Remove" aria-label="Remove" onclick="removeLine(${l.uid})">×</button>
      </div>
      <div class="costs">
        <span class="qtybox"><input type="number" min="0" step="1" value="${l.qty==null?'':l.qty}" placeholder="qty" aria-label="quantity" oninput="setQty(${l.uid},this.value)"><span class="u">${unitNoun(p)}</span></span>
        ${priceline}
        <span class="leader"></span>
        <span class="lc" id="lc-${l.uid}">${lc==null?'<span class=nocost>no cost</span>':money(lc)}</span>
      </div>
    </div>`;}).join('');
  updateTotals();
  var bh=document.getElementById('builderHint');
  if(bh){
    if(!kitchenIngredients.length){ bh.innerHTML='No ingredients yet \u2014 <a href="#" id="bhGo">create your kitchen words</a> first, then build plates with them.'; var g=document.getElementById('bhGo'); if(g)g.onclick=function(e){e.preventDefault();showTab('pantry');}; }
    else bh.textContent='Build plates from your ingredients. New ones are added on the Ingredients tab.';   // v59: no create-on-the-spot
  }
}
function updateLine(uid){const l=plate.find(x=>x.uid===uid);const p=lineProduct(l);const lc=lineCost(p,l.qty);
  const el=document.getElementById('lc-'+uid);if(el)el.innerHTML=lc==null?'<span class=nocost>no cost</span>':money(lc);}
function updateTotals(){
  let tot=0,missing=0;
  plate.forEach(l=>{ if(l.misc){ tot+=Number(l.cost)||0; return; } const lc=lineCost(lineProduct(l),l.qty);if(lc==null)missing++;else tot+=lc;});
  document.getElementById('total').textContent=money(tot);
  const flag=document.getElementById('flag');
  if(missing){flag.style.display='block';flag.textContent='⚠ '+missing+' item'+(missing>1?'s':'')+' have no cost data and are not in the total.';}else flag.style.display='none';
}

document.getElementById('clearBtn').addEventListener('click',function(){plate=[];document.getElementById('plateName').value='';menuLinkEl.value='';loadedPlateId=null;menuTouched=false;hideMatchPrompt();updateEditTag();renderPlate();});
// v60 item 3: ONE docket renderer, shared by the builder's Print button and the plate card's Print
// docket action (load-then-print not needed \u2014 it prints straight from the passed lines). "lines" are
// the working/saved shape: {misc,label,cost} | {kid,qty} | {pid,qty}. Do not fork a second template.
function printDocketFor(name, lines){
  lines=lines||[];
  var pd=document.getElementById('printDocket'); if(!pd){ window.print(); return; }
  var rows=lines.map(function(l){
    if(l.misc){ return '<tr><td class="pd-q"></td><td class="pd-n">'+esc(l.label||'Misc cost')+'</td></tr>'; }
    var p=lineProduct(l);
    var nm=l.kid ? esc((kById[l.kid]&&kById[l.kid].name)||'Ingredient') : (p?esc(p.description||'Item'):'');
    if(!nm) return '';
    var u=p?unitNoun(p):''; var q=l.qty;
    return '<tr><td class="pd-q">'+esc(String(q))+(u?' '+esc(u):'')+'</td><td class="pd-n">'+nm+'</td></tr>';
  }).filter(Boolean).join('');
  pd.innerHTML='<div class="pd-card">'
    +'<div class="pd-logo">Ez<span>Plate</span></div>'
    +'<div class="pd-title">'+esc((name||'').trim()||'Recipe card')+'</div>'
    +'<div class="pd-meta">Recipe card \u00b7 '+lines.length+' item'+(lines.length===1?'':'s')+'</div>'
    +'<table class="pd-table"><tbody>'+rows+'</tbody></table>'
    +'</div>';
  window.print();
}
document.getElementById('printBtn').addEventListener('click',function(){
  printDocketFor((document.getElementById('plateName').value||''), plate);
});

/* ---------- add-ingredient modal ---------- */
const modal=document.getElementById('modal');
function val(id){return document.getElementById(id).value.trim();}
/* convert a pack size + unit + pack price into a base-unit cost, reusing the same weight/volume logic as the parser */
function packToUnitCost(num, unit, price){
  num=parseFloat(num); price=parseFloat(price);
  if(!(num>0)||isNaN(price)||price<0) return null;
  if(unit==='kg'||unit==='g'){ var grams=num*(unit==='kg'?1000:1); return {base_unit:'g',cost_per_base_unit:price/grams,cost_basis:'$/g',dispPer:price/(grams/1000),dispUnit:'kg'}; }
  if(unit==='l'||unit==='ml'){ var mls=num*(unit==='l'?1000:1); return {base_unit:'ml',cost_per_base_unit:price/mls,cost_basis:'$/ml',dispPer:price/(mls/1000),dispUnit:'L'}; }
  return {base_unit:'ea',cost_per_base_unit:price/num,cost_basis:'$/unit',dispPer:price/num,dispUnit:'unit'};   // count
}
function updateAddCalc(){
  var el=document.getElementById('f_calc'); if(!el) return;
  var r=packToUnitCost(document.getElementById('f_packsize').value, document.getElementById('f_packunit').value, document.getElementById('f_price').value);
  if(!r){ el.className='calc-line'; el.textContent='Enter pack size & price to see the unit cost.'; return; }
  el.className='calc-line ok'; el.textContent='= $'+r.dispPer.toFixed(2)+' / '+r.dispUnit;
}
var addBrandCombo,addSupCombo,addCatCombo;
function initAddCombos(){
  ['f_brand','f_sup','f_category'].forEach(function(x){ var d=document.getElementById(x+'Drop'); if(d)d.style.display='none'; });
  makeInlineCombo('f_brand','f_brandDrop',prodBrands);
  makeInlineCombo('f_sup','f_supDrop',prodSuppliers);
  makeInlineCombo('f_category','f_categoryDrop',prodCategories);
}
function openModal(){initAddCombos();updateAddCalc();modal.classList.add('open');modal.setAttribute('aria-hidden','false');}
function closeModal(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}
function clearForm(){['f_desc','f_brand','f_sup','f_category','f_packsize','f_price'].forEach(id=>{var e=document.getElementById(id);if(e)e.value='';});
  document.getElementById('f_food').checked=true;document.getElementById('f_packunit').value='kg';updateAddCalc();document.getElementById('ferr').style.display='none';}
function submitNew(){
  const desc=val('f_desc'), fe=document.getElementById('ferr');
  const catR=resolveCombo('f_category',prodCategories);
  const brR=resolveCombo('f_brand',prodBrands);
  const supR=resolveCombo('f_sup',prodSuppliers);
  const errs=[];
  if(!desc)errs.push('Product name');
  if(!catR.value)errs.push('Category');
  var calc=packToUnitCost(document.getElementById('f_packsize').value, document.getElementById('f_packunit').value, document.getElementById('f_price').value);
  if(!calc)errs.push('a valid Pack size and Pack price');
  if(errs.length){fe.textContent='Please complete: '+errs.join(', ')+'.';fe.style.display='block';return;}
  if(!brR.ok){ fe.textContent='\u201c'+brR.value+'\u201d is a new brand \u2014 pick \u201cCreate new\u201d from the list to confirm.'; fe.style.display='block'; return; }
  if(!supR.ok){ fe.textContent='\u201c'+supR.value+'\u201d is a new supplier \u2014 pick \u201cCreate new\u201d from the list to confirm.'; fe.style.display='block'; return; }
  const id='U'+Date.now().toString(36);
  var szNum=parseFloat(document.getElementById('f_packsize').value), szUnit=document.getElementById('f_packunit').value;
  const prod={id,description:desc,brand:brR.value||null,supplier:supR.value||null,category:catR.value,sub_category:'',
    item_type:null,search_aliases:[],base_unit:calc.base_unit,
    cost_per_base_unit:calc.cost_per_base_unit,cost_basis:calc.cost_basis,
    is_food:document.getElementById('f_food').checked,pack_size_raw:(szNum+' '+szUnit),sold_by:'',
    current_price_exgst:parseFloat(document.getElementById('f_price').value)};
  setOverride(id,prod);
  closeModal();clearForm();toast(desc+' added');qEl.focus();
}
document.getElementById('newBtn').addEventListener('click',openModal);
document.getElementById('mClose').addEventListener('click',closeModal);
document.getElementById('mCancel').addEventListener('click',closeModal);
document.getElementById('mSave').addEventListener('click',submitNew);
['f_packsize','f_price','f_packunit'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener('input',updateAddCalc);});
document.getElementById('f_packunit').addEventListener('change',updateAddCalc);
modal.addEventListener('mousedown',e=>{if(e.target===modal)closeModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))closeModal();});

let toastT;
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200);}


/* ===== Suggested pricing + Menu analysis ===== */
const BASE_MENU = [{"id":"m1","section":"Burgers","name":"Jetty Works Burger","price":24.0},{"id":"m2","section":"Burgers","name":"Traditional Steak Burger","price":19.0},{"id":"m3","section":"Burgers","name":"Steak Works Burger","price":25.0},{"id":"m4","section":"Burgers","name":"Chicken Stacker","price":24.0},{"id":"m5","section":"Burgers","name":"Hamburger","price":15.0},{"id":"m6","section":"Burgers","name":"The Usual Chicken","price":16.0},{"id":"m7","section":"Burgers","name":"Cheeseburger","price":13.0},{"id":"m8","section":"Burgers","name":"BBQ Bacon Cheeseburger","price":19.0},{"id":"m9","section":"Burgers","name":"Seaside Burger","price":15.0},{"id":"m10","section":"Burgers","name":"Vege Burger","price":14.0},{"id":"m11","section":"Fish & Chips","name":"Cod & Chips","price":16.0},{"id":"m12","section":"Fish & Chips","name":"Barra & Chips","price":18.0},{"id":"m13","section":"Fish & Chips","name":"Snapper & Chips","price":20.0},{"id":"m14","section":"Fish Packs","name":"Solo Seafood Delights","price":18.0},{"id":"m15","section":"Fish Packs","name":"Seaside Sweetheart","price":32.0},{"id":"m16","section":"Fish Packs","name":"Ocean Bounty Box","price":55.0},{"id":"m17","section":"Kids Meals","name":"Kids Calamari & Chips","price":12.0},{"id":"m18","section":"Kids Meals","name":"Kids Nuggets & Chips","price":12.0},{"id":"m19","section":"Kids Meals","name":"Kids Fish Bites & Chips","price":12.0},{"id":"m20","section":"Kids Meals","name":"Kids Hot Dog","price":12.0},{"id":"m21","section":"Salads","name":"Marinated Calamari Salad","price":25.0},{"id":"m22","section":"Salads","name":"Scoopy's Steak Salad","price":22.0},{"id":"m23","section":"Salads","name":"Greek Salad","price":14.0},{"id":"m24","section":"Sandwiches","name":"Ham, Cheese & Tomato","price":10.0},{"id":"m25","section":"Sandwiches","name":"Ham & Cheese","price":9.0},{"id":"m26","section":"Sandwiches","name":"Chicken & Cheese","price":9.0},{"id":"m27","section":"Sandwiches","name":"Salad Sandwich","price":9.0},{"id":"m28","section":"Sandwiches","name":"BLT","price":10.0},{"id":"m29","section":"Sandwiches","name":"Ham & Cheese Croissant","price":10.0},{"id":"m30","section":"Sandwiches","name":"Bacon Sandwich","price":7.0},{"id":"m31","section":"Loaded Chips","name":"Loaded Cheeseburger Chips","price":14.0},{"id":"m32","section":"Loaded Chips","name":"Loaded Bacon, Cheese & Gravy Chips","price":14.0},{"id":"m33","section":"Loaded Chips","name":"Chips, Cheese & Gravy (Small)","price":9.0},{"id":"m34","section":"Loaded Chips","name":"Chips, Cheese & Gravy (Large)","price":13.0},{"id":"m35","section":"Chips","name":"Small Chips","price":5.0},{"id":"m36","section":"Chips","name":"Medium Chips","price":7.0},{"id":"m37","section":"Chips","name":"Large Chips","price":10.0},{"id":"m38","section":"Chips","name":"Potato Gems","price":6.0},{"id":"m39","section":"Breakfast","name":"Mixed Grill","price":26.0},{"id":"m40","section":"Breakfast","name":"Scoopy's Breakfast","price":19.0},{"id":"m41","section":"Breakfast","name":"Vege Breakfast","price":24.0},{"id":"m42","section":"Breakfast","name":"Bacon / Ham Bene","price":18.0},{"id":"m43","section":"Breakfast","name":"Feta, Spinach & Mushroom Bene","price":19.0},{"id":"m44","section":"Breakfast","name":"Smoked Salmon & Spinach Bene","price":24.0},{"id":"m45","section":"Breakfast","name":"Waffles — Plain","price":11.0},{"id":"m46","section":"Breakfast","name":"Waffles — Berries","price":14.0},{"id":"m47","section":"Breakfast","name":"Pancakes — Plain","price":11.0},{"id":"m48","section":"Breakfast","name":"Pancakes — Berries","price":14.0},{"id":"m49","section":"Breakfast","name":"Scoopy's Staff Meal","price":14.0},{"id":"m50","section":"Breakfast","name":"Breakky Burger / Wrap","price":16.0},{"id":"m51","section":"Breakfast","name":"Bacon & Egg Roll / Muffin","price":12.0},{"id":"m52","section":"Breakfast","name":"Sausage & Egg Muffin","price":9.0},{"id":"m53","section":"Breakfast","name":"Vegetarian Wrap","price":13.0},{"id":"m54","section":"Snacks","name":"Crumbed Sausage","price":3.5},{"id":"m55","section":"Snacks","name":"Battered Onion Rings (6)","price":7.0},{"id":"m56","section":"Snacks","name":"Nuggets (6)","price":7.0},{"id":"m57","section":"Snacks","name":"Calamari (6)","price":8.0},{"id":"m58","section":"Snacks","name":"Fish Bites (6)","price":9.0},{"id":"m59","section":"Snacks","name":"Pluto Pup","price":5.0},{"id":"m60","section":"Snacks","name":"Potato Scallop","price":2.5},{"id":"m61","section":"Snacks","name":"Spring Roll","price":5.0},{"id":"m62","section":"Snacks","name":"Chiko Roll","price":5.0},{"id":"m63","section":"Snacks","name":"Prawn Cutlet","price":3.0},{"id":"m64","section":"Snacks","name":"Pineapple Fritter","price":2.0},{"id":"m65","section":"Snacks","name":"Seafood Stick","price":3.5},{"id":"m66","section":"Breakfast","name":"Waffles — Rainbow","price":14.0},{"id":"m67","section":"Breakfast","name":"Waffles — Cookies & Cream","price":14.0},{"id":"m68","section":"Breakfast","name":"Pancakes — Rainbow","price":14.0},{"id":"m69","section":"Breakfast","name":"Pancakes — Cookies & Cream","price":14.0}];
const MENUKEY='cafeDB_menu';
function loadCustomMenu(){try{return JSON.parse(localStorage.getItem(MENUKEY))||[];}catch(e){return [];}}
function saveCustomMenu(){try{localStorage.setItem(MENUKEY,JSON.stringify(customMenu));}catch(e){}}
let customMenu=loadCustomMenu();
/* ===== multiple menus ===== */
function loadMenus(){ try{ var a=JSON.parse(localStorage.getItem('cafeDB_menus')); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function saveMenus(){ try{ localStorage.setItem('cafeDB_menus', JSON.stringify(menusList)); }catch(e){} }
var menusList=loadMenus();
// v54: plates are an independent library, so the "Unassigned dishes" holding area (v40/v42) is GONE.
// Menus reference plates; deleting a menu deletes its dishes and UNLINKS (never deletes) their plates,
// which live on in the Plates tab. With plates able to stand alone, ZERO menus is a legitimate state.
function menusKeyExists(){ try{ return localStorage.getItem('cafeDB_menus')!=null; }catch(e){ return false; } }
// Seed "Original menu" only on a genuinely fresh install — i.e. the menus key was never written. Once the
// user has created OR deleted menus (either writes the key), we respect exactly what's there, including none.
function ensureDefaultMenu(){ if(!menusList.length && !menusKeyExists()) menusList.unshift({id:'MENU_ORIGINAL',name:'Original menu',season:null}); }
ensureDefaultMenu();
function fallbackMenuId(){                                          // v54: never a deleted id; null when no menu exists (a valid zero-menu state)
  if(menusList.some(function(m){return m.id==='MENU_ORIGINAL';})) return 'MENU_ORIGINAL';
  return (menusList[0] && menusList[0].id) || null;
}
function canDeleteMenu(id){ return menusList.some(function(m){return m.id===id;}); }   // v54: any existing menu may be deleted — deleting the last one is legitimate now
function loadCurrentMenuId(){ try{ return localStorage.getItem('cafeDB_currentMenuId')||'MENU_ORIGINAL'; }catch(e){ return 'MENU_ORIGINAL'; } }
var currentMenuId=loadCurrentMenuId();
function setCurrentMenuId(id){ currentMenuId=id||null; try{ localStorage.setItem('cafeDB_currentMenuId', currentMenuId||''); }catch(e){} }   // v54: null is valid (no menus)
function menuNameById(id){ var m=menusList.find(function(x){return x.id===(id||'MENU_ORIGINAL');}); return m?m.name:'Original menu'; }
let MENU=[],menuById={};
function rebuildMenu(){
  var map={},order=[];
  BASE_MENU.forEach(function(m){ if(!(m.id in map))order.push(m.id); map[m.id]=m; });
  customMenu.forEach(function(m){ if(!(m.id in map))order.push(m.id); map[m.id]=Object.assign({},map[m.id]||{},m); });
  var del=(typeof deletedMenuIds!=='undefined'&&deletedMenuIds)?deletedMenuIds:[];
  order=order.filter(function(k){return del.indexOf(k)<0;});   // drop deleted / split-away items
  MENU=order.map(function(k){return map[k];});
  menuById={}; order.forEach(function(k){ menuById[k]=map[k]; });
}
function upsertCustomMenu(item){
  var i=customMenu.findIndex(function(c){return c.id===item.id;});
  if(i>=0) customMenu[i]=item; else customMenu.push(item);
  saveCustomMenu(); return dbPushMenu(item);   // v42: return the push so a dependent plate write can be sequenced after this menu_items upsert confirms (heals an orphaned existing dish)
}
var deletedMenuIds=loadDeletedMenu();
rebuildMenu();
function loadCogs(){ try{ var v=parseFloat(localStorage.getItem('cafeDB_cogsPct')); if(v>=1&&v<=99) return v; }catch(e){} return 40; }
var cogsPct = loadCogs();                                  // target food cost, as a percent (e.g. 40)
function foodTarget(){ return cogsPct/100; }               // as a fraction for the maths
function setCogs(pct, persist){
  pct=Math.max(1,Math.min(99, Math.round(pct))); cogsPct=pct;
  try{ localStorage.setItem('cafeDB_cogsPct', String(pct)); }catch(e){}
  if(persist) dbSetSetting('food_cost_target', pct);       // shared across devices
  var th=document.getElementById('aSuggestedTh'); if(th) th.textContent='Suggested ('+pct+'%)';
  if(typeof syncCogsRead==='function') syncCogsRead();     // ITEM 6 (v35): the Menu tab's read-only display follows Settings
  renderAnalysis();
}
function fmt2(x){return '$'+Number(x).toFixed(2);}
function analyze(cost, menuPrice){
  const suggested = cost>0 ? cost/foodTarget() : 0;   // sell price at the target food cost
  if(!menuPrice || menuPrice<=0 || suggested<=0)
    return {cost,suggested,menuPrice:menuPrice||null,recommended:suggested,absPct:null,light:'none',state:'nomenu'};
  const shortfall=(suggested-menuPrice)/suggested;        // >0 => menu price is BELOW the suggested price
  const absPct=Math.round(Math.abs(shortfall)*100);
  let light,state,recommended;
  if(shortfall<=0){ light='green'; state='ok'; recommended=menuPrice; }            // at or above suggested = healthy
  else if(shortfall<=0.15){ light='amber'; state='under'; recommended=suggested; } // up to 15% below
  else { light='red'; state='under'; recommended=suggested; }                       // more than 15% below
  return {cost,suggested,menuPrice,recommended,absPct,light,state};
}
function tipText(a){
  const c=fmt2(a.cost), s=fmt2(a.suggested);
  if(a.state==='nomenu') return 'Ingredient cost is '+c+'. At a '+cogsPct+'% food cost target that points to a sell price of '+s+'. No menu price is linked, so '+s+' is the suggested starting point.';
  const m=fmt2(a.menuPrice);
  if(a.state==='ok') return 'Ingredient cost is '+c+'. At a '+cogsPct+'% food cost target the cost-justified price is '+s+'. Your menu price of '+m+' is at or above that \u2014 a healthy margin.';
  if(a.light==='amber') return 'Ingredient cost is '+c+', which suggests '+s+' at a '+cogsPct+'% food cost. Your menu price of '+m+' is about '+a.absPct+'% below that \u2014 slightly underpriced; consider lifting it toward '+s+'.';
  return 'Ingredient cost is '+c+', which suggests '+s+' at a '+cogsPct+'% food cost. Your menu price of '+m+' is about '+a.absPct+'% below that \u2014 significantly underpriced and worth attention. Aim toward '+s+'.';
}
function matchMenu(name){
  name=(name||'').toLowerCase().trim(); if(!name) return null;
  let best=null,bs=0;
  for(const m of MENU){
    const mn=m.name.toLowerCase(); let s=0;
    if(mn===name) s=100;
    else if(mn.includes(name)||name.includes(mn)) s=70;
    else{const A=new Set(name.split(/[^a-z0-9]+/).filter(Boolean)),B=new Set(mn.split(/[^a-z0-9]+/).filter(Boolean));let o=0;A.forEach(w=>{if(B.has(w))o++;});s=o*22;}
    if(s>bs){bs=s;best=m;}
  }
  return bs>=22?best:null;
}
/* builder pricing panel */
let menuTouched=false;
const menuLinkEl=document.getElementById('menuLink');
function buildMenuOptions(){
  const groups={}; MENU.forEach(m=>{(groups[m.section]=groups[m.section]||[]).push(m);});
  let html='<option value="">— none —</option>';
  for(const g in groups){html+='<optgroup label="'+esc(g)+'">'+groups[g].map(m=>'<option value="'+m.id+'">'+esc(m.name)+' ('+fmt2(m.price)+')</option>').join('')+'</optgroup>';}
  menuLinkEl.innerHTML=html;
}
function currentMenuPrice(){const v=menuLinkEl.value;return v&&menuById[v]?menuById[v].price:null;}
function plateCostNow(){let c=0;plate.forEach(l=>{const lc=lineCost(lineProduct(l),l.qty);if(lc!=null)c+=lc;});return c;}
function updatePricing(){}  /* pricing now lives only in Menu Analysis */
menuLinkEl.addEventListener('change',()=>{menuTouched=true;updatePricing();});
document.getElementById('plateName').addEventListener('input',function(e){
  renderPlateSuggest(e.target.value);   // live suggestions, every keystroke
  if(e.target.value.trim()){ var pe=document.getElementById('plateNameErr'); if(pe) pe.style.display='none'; }
});
/* saved plates */
const PLATEKEY='cafeDB_plates';
function loadPlates(){try{return JSON.parse(localStorage.getItem(PLATEKEY))||[];}catch(e){return [];}}
function savePlatesLS(){try{localStorage.setItem(PLATEKEY,JSON.stringify(savedPlates));}catch(e){}}
let savedPlates=loadPlates();
function plateNameVal(){return (document.getElementById('plateName').value.trim())||'Unnamed plate';}
// v55: the builder edits a PLATE only (name + lines + category). It carries NO menu link — publishing to
// menus is a separate action (Manage menus, from the card). Editing a plate's recipe automatically re-costs
// every menu entry backed by it (they resolve cost via plateForMenuItem). Returns true on success.
function saveCurrentPlate(asNew){
  if(!plate.length){toast('Add ingredients to the plate first');return false;}
  var rawName=(document.getElementById('plateName').value||'').trim();
  var pErr=document.getElementById('plateNameErr');
  if(!rawName){ if(pErr){ pErr.textContent='Give this plate a name before saving.'; pErr.style.display='block'; } var pn=document.getElementById('plateName'); if(pn){ pn.focus(); } return false; }
  if(pErr) pErr.style.display='none';
  // v60 (Max): every ingredient line needs a real quantity before the plate can be saved. New lines
  // start empty; a blank or 0 qty blocks the save and focuses the first offending line's field.
  var badLine=plate.find(function(l){ return !l.misc && !(l.qty>0); });
  if(badLine){
    toast('Enter a quantity for every ingredient');
    var qi=document.querySelector('.line[data-uid="'+badLine.uid+'"] .qtybox input'); if(qi){ qi.focus(); }
    return false;
  }
  var name=rawName;
  var cat=(typeof builderCategoryValue==='function')?builderCategoryValue():null;   // §J: category combo; null before §J
  var lines=plate.map(function(l){ return l.misc?{misc:true,label:l.label||'',cost:Number(l.cost)||0}:(l.kid?{kid:l.kid,qty:l.qty}:{pid:l.pid,qty:l.qty}); });
  var sp;
  if(!asNew && loadedPlateId){ sp=savedPlates.find(function(s){return s.id===loadedPlateId;}); if(sp){ sp.name=name; sp.lines=lines; if(cat!==null) sp.category=(cat||null); } else loadedPlateId=null; }
  if(asNew || !loadedPlateId){ var id='SP'+Date.now().toString(36); sp={id:id,name:name,lines:lines,category:(cat||null)}; savedPlates.push(sp); loadedPlateId=id; }
  savePlatesLS(); dbPushPlate(sp); updateEditTag(); toast(asNew?'Saved as a new plate':'Plate saved'); renderAnalysis(); if(typeof renderPlatesTab==='function') renderPlatesTab();
  logHistory();                                                       // v60 item 1a: a plate re-cost changes the menu average — refresh a visible dashboard
  return true;
}
// v54: the builder's one primary action. Save writes the plate to the library (menu link unchanged) and,
// on success, closes the popup and refreshes the Plates tab. Publishing is a separate action from a card.
function saveFromBuilder(){ if(saveCurrentPlate(false)) closeBuilder(); }
(function(){ var sb=document.getElementById('saveBtn'); if(sb) sb.addEventListener('click',saveFromBuilder); })();
(function(){ var amb=document.getElementById('addMiscBtn'); if(amb) amb.addEventListener('click',addMiscCost); })();
/* menu analysis */
function costFromLines(lines){let c=0,miss=0;(lines||[]).forEach(l=>{ if(l&&l.misc){ var mc=Number(l.cost); if(!isNaN(mc)) c+=mc; return; } const p=lineProduct(l);if(!p){miss++;return;}const lc=lineCost(p,l.qty);if(lc==null)miss++;else c+=lc;});return c;}
/* v55 (many-to-many): a dish links to its plate via dish.plateId; source_plate_id is a legacy fallback,
   and a stale local plate.menuId (pre-v55) is the last resort for un-synced local rows. One plate can back
   MANY dishes (one per menu it's published to). These helpers are the single resolution path — call sites
   never poke the raw fields. */
function plateIdOf(d){ if(!d) return null;
  if(d.plateId) return d.plateId;
  if(d.sourcePlateId) return d.sourcePlateId;
  var sp=savedPlates.find(function(s){return s.menuId===d.id;}); return sp?sp.id:null;   // legacy local-only fallback
}
function plateForMenuItem(m){ if(!m) return null; var pid=plateIdOf(m); return pid?(savedPlates.find(function(s){return s.id===pid;})||null):null; }
function dishesOfPlate(sp){ if(!sp) return []; return MENU.filter(function(d){ return plateIdOf(d)===sp.id; }); }   // every menu entry backed by this plate
function menusOfPlate(sp){ var seen={},out=[]; dishesOfPlate(sp).forEach(function(d){ var mid=d.menuId||'MENU_ORIGINAL'; if(seen[mid])return; seen[mid]=1; var m=menusList.find(function(x){return x.id===mid;}); if(m) out.push({menuId:m.id, name:m.name, dishId:d.id, price:d.price, section:d.section}); }); return out; }
function isPublishedPlate(sp){ return dishesOfPlate(sp).length>0; }
// v55: every dish should own a plate (its recipe). If one is missing (a pre-v55 uncosted dish, or a fresh
// legacy row), create an empty plate and link the dish to it via plateId. §B backfills this at the DB level;
// this is the app-side guarantee. The dish write is sequenced after the plate (menu_items.plate_id FK).
function ensurePlateForDish(m){
  if(!m) return null;
  var sp=plateForMenuItem(m); if(sp) return sp;
  var id='SP'+Date.now().toString(36); sp={id:id, name:m.name||'Plate', lines:[]};
  savedPlates.push(sp); savePlatesLS();
  m.plateId=id; var i=customMenu.findIndex(function(c){return c.id===m.id;}); if(i>=0) customMenu[i]=m; else customMenu.push(m); saveCustomMenu();
  dbPushMenuAfterPlate(m, sp);
  return sp;
}
// §J: plate categories are the library's own grouping. Suggest existing plate categories AND the per-menu
// sections already in use, so the vocabulary stays shared.
function plateCategories(){ var s={}; savedPlates.forEach(function(sp){ if(sp.category) s[sp.category]=1; }); (typeof MENU!=='undefined'?MENU:[]).forEach(function(m){ if(m&&m.section) s[m.section]=1; }); return Object.keys(s).sort(); }
function builderCategoryValue(){ var el=document.getElementById('plateCat'); return el?(el.value||'').trim():''; }
function vbadge(a){
  if(a.state==='ok')return '<span class="vbadge vgood">healthy</span>';
  if(a.state==='under')return '<span class="vbadge '+(a.light==='red'?'vbad':'vwarn')+'">'+a.absPct+'% under</span>';
  return '<span class="muted-dash">\u2014</span>';
}
function aRow(name,a){
  return '<tr><td>'+esc(name)+'</td>'+
    '<td class="num">'+(a.cost>0?fmt2(a.cost):'—')+'</td>'+
    '<td class="num"><span class="tip">'+(a.suggested>0?fmt2(a.suggested):'—')+'<span class="tipbox">'+esc(tipText(a))+'</span></span></td>'+
    '<td class="num">'+(a.menuPrice!=null?fmt2(a.menuPrice):'—')+'</td>'+
    '<td class="num">'+vbadge(a)+'</td>'+
    '<td><span class="dot '+a.light+'"></span></td></tr>';
}
function renderAnalysis(){
  const tb=document.getElementById('aBody'); const byMenu={}; const customs=[];
  savedPlates.forEach(sp=>{ if(sp.menuId)byMenu[sp.menuId]=sp; else customs.push(sp); });
  let html=''; let lastSec=null;
  MENU.forEach(m=>{
    if(m.section!==lastSec){html+='<tr class="sec"><td colspan="6">'+esc(m.section)+'</td></tr>';lastSec=m.section;}
    const sp=byMenu[m.id];
    if(sp){const a=analyze(costFromLines(sp.lines),m.price);html+=aRow(sp.name||m.name,a);}
    else{html+='<tr class="muted"><td>'+esc(m.name)+'</td><td class="num">—</td><td class="num">—</td><td class="num">'+fmt2(m.price)+'</td><td class="num">not costed</td><td><span class="dot none"></span></td></tr>';}
  });
  if(customs.length){
    html+='<tr class="sec"><td colspan="6">Custom plates (no menu link)</td></tr>';
    customs.forEach(sp=>{const a=analyze(costFromLines(sp.lines),null);html+=aRow(sp.name||'Custom plate',a);});
  }
  tb.innerHTML=html;
  bindTips();
}
/* tooltips: tap to toggle (touch) + hover (css) */
function bindTips(){
  document.querySelectorAll('.tip').forEach(t=>{
    t.onclick=function(e){e.stopPropagation();document.querySelectorAll('.tip.open').forEach(o=>{if(o!==t)o.classList.remove('open');});t.classList.toggle('open');};
  });
}
document.addEventListener('click',()=>document.querySelectorAll('.tip.open').forEach(o=>o.classList.remove('open')));
/* tabs */
function currentTab(){
  var b=document.querySelector('.navbtn.active'); if(b&&b.dataset.tab) return b.dataset.tab;
  var names=['builder','ingredients','analysis','dashboard','pantry'];
  for(var i=0;i<names.length;i++){ var el=document.getElementById('tab-'+names[i]); if(el&&el.style.display!=='none') return names[i]; }
  return 'builder';
}
function rerenderCurrentTab(){                                         // re-run the active tab's render (e.g. once boot data lands)
  var t=currentTab();
  try{ if(t==='analysis')renderAnalysis(); else if(t==='ingredients')renderIngredients(); else if(t==='dashboard')renderDashboard(); else if(t==='pantry')renderKitchenPanel(); else renderPlatesTab(); }catch(e){ console.error('[rerender]', e); }
}
function showTab(t){
  try{ localStorage.setItem('cafeDB_lastTab', t); }catch(e){}          // remember where the user was, for next refresh
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  ['builder','ingredients','analysis','dashboard','pantry'].forEach(function(name){ var el=document.getElementById('tab-'+name); if(el) el.style.display=(t===name)?'':'none'; });
  if(t==='analysis')renderAnalysis();
  if(t==='ingredients')renderIngredients();
  if(t==='dashboard')renderDashboard();
  if(t==='pantry')renderKitchenPanel();   // data-tab="pantry" is the user-invisible key; its LABEL is "Ingredients" (see glossary)
  if(t==='builder')renderPlatesTab();     // data-tab="builder" is unchanged; its LABEL is now "Plates" (v54)
  try{ window.scrollTo(0,0); }catch(e){}   // v60 item 5: switching tabs (or re-tapping the current one — showTab runs on every nav click) starts at the top
}
document.querySelectorAll('.navbtn').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
function restoreLastTab(){                                            // return to the last-viewed tab on refresh (Builder is the default)
  var VALID=['builder','ingredients','analysis','dashboard','pantry'];
  var lt=null; try{ lt=localStorage.getItem('cafeDB_lastTab'); }catch(e){}
  if(lt && VALID.indexOf(lt)>=0 && lt!=='builder') showTab(lt);        // Builder is already shown by default markup; only switch if different & valid
}
(function(){
  // ITEM 6 (v35): the Menu tab's #cogsTarget input is now a read-only display (#cogsTargetRead);
  // editing moved to Settings. Nothing to wire here beyond the search controls.
  var ms=document.getElementById('menuSearch'), msc=document.getElementById('menuSearchClear');
  if(ms){ ms.addEventListener('input',function(){ renderAnalysis(); }); ms.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ms.blur(); } }); }
  if(msc){ msc.addEventListener('click',function(){ ms.value=''; renderAnalysis(); ms.focus(); }); }
  var mcf=document.getElementById('menuCatFilter'); if(mcf) mcf.addEventListener('change',renderAnalysis);   // v59: category filter (dish sections)
  var mclf=document.getElementById('menuClearFilters'); if(mclf) mclf.addEventListener('click',clearMenuFilters);   // v59: shared clear behaviour
  var mlc=document.getElementById('menuLightChips');                 // v68: margin-light filter chips (multi-select) — delegated
  if(mlc) mlc.addEventListener('click',function(e){ var b=e.target.closest('.mlf-chip'); var lt=b&&b.getAttribute('data-light'); if(lt) toggleMenuLight(lt); });
})();
buildMenuOptions(); buildMenuSelector(); bindTips();

renderPlate(); renderPlatesTab();

/* ============================================================
   EzPlate — Ingredients page, Dashboard, supplier extraction
   ============================================================ */

/* ---------- price history (Supabase table: price_history) ---------- */
var HISTKEY='cafeDB_priceHistory';
function loadHistory(){ try{ return JSON.parse(localStorage.getItem(HISTKEY))||[]; }catch(e){ return []; } }
function saveHistory(){ try{ localStorage.setItem(HISTKEY, JSON.stringify(priceHistory)); }catch(e){} }
var priceHistory = loadHistory();
var dashRange=(function(){ try{ return localStorage.getItem('cafeDB_dashRange')||'3m'; }catch(e){ return '3m'; } })();
function setDashRange(rg){ dashRange=rg; try{ localStorage.setItem('cafeDB_dashRange',rg); }catch(e){} renderDashboard(); }
function dashRangePts(){                                           // the points inside the chosen window (capped for sanity)
  var days={'1w':7,'1m':30,'3m':91,'6m':183,'1y':365}[dashRange];
  var cutoff=Date.now()-days*86400000;
  var pts=days?priceHistory.filter(function(p){
    var tt=(typeof p.t==='string')?new Date(p.t).getTime():p.t;   // Supabase points arrive as ISO strings; a string is never >= a number
    return tt>=cutoff;
  }):priceHistory.slice();
  return pts.slice(-60);
}
function rangeBarHtml(){
  var os=[['1w','1W'],['1m','1M'],['3m','3M'],['6m','6M'],['1y','1Y'],['all','All']];
  return '<div class="range-bar">'+os.map(function(o){return '<button type="button" class="range-btn'+(dashRange===o[0]?' act':'')+'" data-rg="'+o[0]+'">'+o[1]+'</button>';}).join('')+'</div>';
}
/* ---- per-ingredient price log (local; powers price-change alerts + cost ranges). No new Supabase table. ---- */
var IPLKEY='cafeDB_ingPriceLog';
function loadIngLog(){ try{ return JSON.parse(localStorage.getItem(IPLKEY))||{}; }catch(e){ return {}; } }
function saveIngLog(){ try{ localStorage.setItem(IPLKEY, JSON.stringify(ingPriceLog)); }catch(e){} }
var ingPriceLog = loadIngLog();
function logIngPrice(pid, cpbuVal){                                  // record a per-base-unit price point for this product
  if(pid==null || cpbuVal==null || !isFinite(cpbuVal)) return;
  var a=ingPriceLog[pid]||(ingPriceLog[pid]=[]);
  var last=a.length?a[a.length-1].v:null;
  if(last!=null && Math.abs(last-cpbuVal) < Math.abs(cpbuVal)*1e-6) return;   // skip no-op repeats
  a.push({t:Date.now(), v:cpbuVal}); if(a.length>60) ingPriceLog[pid]=a.slice(-60);
}
function ingPriceBand(pid){                                          // {min,max} $/base-unit from logged history, or null
  var a=ingPriceLog[pid]; var p=byId[pid]; var cur=p?cpbu(p):null;
  var vals=(a||[]).map(function(x){return x.v;}); if(cur!=null) vals.push(cur);
  vals=vals.filter(function(v){return v!=null&&isFinite(v);}); if(!vals.length) return null;
  return {min:Math.min.apply(null,vals), max:Math.max.apply(null,vals)};
}
function costRangeForLines(lines){                                   // dish cost at each ingredient's lowest and highest logged price
  var lo=0, hi=0, any=false;
  (lines||[]).forEach(function(l){
    if(l&&l.misc){ var mc=Number(l.cost)||0; lo+=mc; hi+=mc; return; }
    var p=lineProduct(l); if(!p) return; var cur=cpbu(p); if(cur==null) return;
    var pid=l.kid?(kById[l.kid]&&kById[l.kid].pid):l.pid;
    var band=ingPriceBand(pid); var mn=band?band.min:cur, mx=band?band.max:cur;
    lo+=mn*l.qty; hi+=mx*l.qty; if(mx-mn>1e-9) any=true;
  });
  return {min:lo, max:hi, hasRange:any};
}
function dishesOverTarget(){                                         // dishes whose food cost sits above the target (margin under target)
  var over=0; MENU.forEach(function(m){ if(!(m.price>0)) return; var sp=plateForMenuItem(m); if(!sp) return;
    var c=costFromLines(sp.lines); if(!(c>0)) return; var a=analyze(c, m.price); if(a.state==='under') over++; });
  return over;
}
function dbPushHistory(iso, v){ pushWrite(function(){ return SUPA.from('price_history').insert({recorded_at:iso, avg_food_cost_pct:v}); }, 'price history'); }
function computeAvgFoodCost(){
  var vals=[];
  MENU.forEach(function(m){
    if(!(m.price>0)) return;
    var sp=plateForMenuItem(m);
    if(!sp) return;
    var c=costFromLines(sp.lines);
    if(c>0) vals.push(c/m.price);
  });
  if(!vals.length) return null;
  return vals.reduce(function(a,b){return a+b;},0)/vals.length*100;   // percent
}
function logHistory(){
  // v60 item 1a (LIVENESS): a data-changing event (price edit, invoice apply, plate save) must ALWAYS
  // refresh a visible dashboard — the header "% today" and stat cards are computed live in renderDashboard,
  // so the fix is simply to re-render. Logging a NEW trend point is separate and still deduped: two edits a
  // minute apart shouldn't stipple the line, but the today figure must still move. So the dedup guards only
  // the point push, NOT the re-render (the old code returned before re-rendering on a deduped change — that
  // was the staleness bug). Cheapest correct mechanism, no polling.
  var v=computeAvgFoodCost();
  if(v!=null){
    v=Math.round(v*10)/10;
    var iso=new Date().toISOString();
    var last=priceHistory[priceHistory.length-1];
    var dup = last && Math.abs(last.v-v)<0.05 && (Date.now()-new Date(last.t).getTime())<3600000;  // near-duplicate within the hour
    if(!dup){
      priceHistory.push({t:iso, v:v});
      if(priceHistory.length>500) priceHistory=priceHistory.slice(-500);
      saveHistory(); dbPushHistory(iso, v);
    }
  }
  var dash=document.getElementById('tab-dashboard');
  if(dash && dash.style.display!=='none') renderDashboard();
}

/* ---------- shared COGS editor (used by Menu Analysis + Dashboard) ---------- */

/* ---------- supplier extraction from invoice header (Feature 1) ---------- */
var invSupplier='';
/* ===== supplier memory: state + persistence ===== */
function loadSupplierMem(){ try{ var o=JSON.parse(localStorage.getItem('cafeDB_supplierMem')); return (o&&typeof o==='object')?o:{}; }catch(e){ return {}; } }
function saveSupplierMem(){ try{ localStorage.setItem('cafeDB_supplierMem', JSON.stringify(supplierMem)); }catch(e){} }
var supplierMem=loadSupplierMem();
function normSupplier(s){ return String(s||'').toLowerCase().replace(/\s+/g,' ').trim(); }
function memKey(supplier, phrase){ return normSupplier(supplier)+'|'+normalizePhrase(phrase); }
function dbPushSupplierPhrase(e){ pushWrite(function(){ return SUPA.from('supplier_phrases').upsert({id:e.id, supplier:e.supplier, phrase_norm:e.phrase_norm, qty:e.qty, unit:e.unit, updated_at:new Date().toISOString()}); }, 'supplier phrase'); }
function dbDeleteSupplierPhrase(id){ pushWrite(function(){ return SUPA.from('supplier_phrases').delete().eq('id',id); }, 'supplier phrase delete'); }
function rememberSupplierPhrase(supplier, phrase, qty, unit, pid){
  if(!normSupplier(supplier) || !(qty>0)) return;                 // no supplier -> never store
  var id=memKey(supplier, phrase);
  var e={id:id, supplier:supplier, phrase_norm:normalizePhrase(phrase), qty:qty, unit:unit, pid:(pid||(supplierMem[id]&&supplierMem[id].pid)||null)};
  supplierMem[id]=e; saveSupplierMem(); dbPushSupplierPhrase(e);  // same id => one entry, overwritten (never duplicated)
}
function syncMemoryToProduct(pid, qty, unit){                     // ITEM 1: keep Remembered items in step with the product's taught pack
  if(!pid || !(qty>0)) return; var changed=false;
  for(var id in supplierMem){ var e=supplierMem[id];
    if(e && e.pid===pid && (e.qty!==qty || (e.unit||'')!==(unit||''))){ e.qty=qty; e.unit=unit; dbPushSupplierPhrase(e); changed=true; }
  }
  if(changed) saveSupplierMem();
}
function renderSmemList(){
  var box=document.getElementById('smemList'); if(!box) return;
  var ids=Object.keys(supplierMem);
  if(!ids.length){ box.innerHTML='<div class="smem-empty">Nothing saved yet. When you tell EzPlate a pack size while importing an invoice, it\u2019ll be remembered here.</div>'; return; }
  ids.sort(function(a,b){ return (supplierMem[a].supplier+supplierMem[a].phrase_norm).localeCompare(supplierMem[b].supplier+supplierMem[b].phrase_norm); });
  function cap(s){ s=String(s||'').trim(); return s?s.charAt(0).toUpperCase()+s.slice(1):s; }
  box.innerHTML=ids.map(function(id){ var e=supplierMem[id]; var ul=e.unit==='ea'?'units':e.unit==='l'?'L':e.unit==='ml'?'mL':e.unit;
    return '<div class="smem-row" data-id="'+esc(id)+'"><div class="smem-main"><div class="smem-sentence">'+esc(cap(e.phrase_norm))+' \u2014 from '+esc(e.supplier)+'</div></div>'
      +'<span class="smem-eq">=</span><input type="number" class="invPackQty smem-qty" min="0" step="0.01" value="'+e.qty+'"><span class="smem-unit">'+esc(ul)+'</span>'
      +'<button type="button" class="smem-del">Remove</button></div>';
  }).join('');
  box.querySelectorAll('.smem-row').forEach(function(row){
    var id=row.getAttribute('data-id');
    row.querySelector('.smem-qty').addEventListener('change', function(e){ var q=parseFloat(e.target.value); var m=supplierMem[id]; if(m && q>0){ m.qty=q; saveSupplierMem(); dbPushSupplierPhrase(m); toast('Updated'); } });
    row.querySelector('.smem-del').addEventListener('click', function(){ delete supplierMem[id]; saveSupplierMem(); dbDeleteSupplierPhrase(id); renderSmemList(); toast('Removed'); });
  });
}
function openSmem(){ renderSmemList(); show('smemModal'); }
function closeSmem(){ hide('smemModal'); }
function invSupplierDetect(text){
  var lines=(text||'').split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean).slice(0,20);
  function clean(s){ return s.replace(/\s+/g,' ').replace(/\b(pty\.?\s*ltd\.?|p\/l|ltd\.?)\b\.?$/i,'').replace(/[|,;].*$/,'').trim(); }
  // 1) explicit "Supplier: X" style anywhere
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(/^(?:supplier|vendor|from|sold by|distributed by)\s*[:\-]\s*(.+)$/i);
    if(m && m[1].trim().length>=2){ invDbg('[supplier] explicit label:', m[1]); return clean(m[1]); }
  }
  // Header = the block before the first "Invoice"/"Tax Invoice"/"Statement" heading (the letterhead area).
  var stop=lines.length;
  for(var s=0;s<lines.length;s++){ if(/\b(?:tax\s+)?invoice\b|\bstatement\b/i.test(lines[s])){ stop=s; break; } }
  var header=lines.slice(0, stop>0?stop:Math.min(lines.length,8));
  // 2) a known supplier/brand appearing in the header
  var known=Array.from(new Set(PRODUCTS.map(function(p){return p.supplier;}).concat(PRODUCTS.map(function(p){return p.brand;})).filter(Boolean)));
  var head=header.join('\n').toLowerCase(), best=null;
  known.forEach(function(k){ if(k && k.length>=3 && head.indexOf(k.toLowerCase())>=0){ if(!best||k.length>best.length) best=k; } });
  if(best){ invDbg('[supplier] known match in header:', best); return best; }
  // 3) first business-name-looking line in the header (skip ABN/address/phone/date/number lines)
  for(var j=0;j<header.length;j++){
    var L=header[j];
    if(/\d{2}[\/\-.]\d{2}|\babn\b|\bacn\b|statement|street|\brd\b|\bst\b|road|p\.?\s*o\.?\s*box|phone|ph:|fax|email|www\.|@|\$|\d{3,}/i.test(L)) continue;
    if(/[A-Za-z]{3,}/.test(L) && L.length<=42){ invDbg('[supplier] header business name:', L); return clean(L); }
  }
  invDbg('[supplier] could not identify \u2014 left blank'); return '';   // no guess
}

/* ============================================================
   Feature 3 — Ingredients page
   ============================================================ */
/* Item 1C — shared empty-state (icons echo the nav tab icons at large size) */
var ICON_LEAF_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 12C12 8 9.2 5.5 5 5.5c0 4.2 2.8 6.5 7 6.5Z"/><path d="M12 9.5c0-3 2.4-4.5 6-4.5 0 3.2-2.4 4.7-6 4.7Z"/></svg>';   /* v36: tomato (was leaf) — matches the tab glyph */
var ICON_BOX_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
var ICON_MENU_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="20" x2="5" y2="12"/><line x1="12" y1="20" x2="12" y2="6"/><line x1="19" y1="20" x2="19" y2="14"/></svg>';   // v58: the Menu nav glyph (ascending bars)
/* ===== v58: THE empty-state system — ONE place every tab's empty state is built =====
   Two mutually-exclusive variants; NO inline empty-state markup lives anywhere else. The marker
   class `es-built` is emitted ONLY here — the route-through test asserts every tab goes through it.
   A: search/filter-empty (data exists, nothing matches) -> emptySearchState. B: true-empty (no data
   at all) -> emptyStateHtml. A tab renders exactly one, never both. */
function emptyStateHtml(icon,title,body,actionsHtml){   // variant B: true-empty
  return '<div class="empty-state es-built">'+icon+'<h3>'+esc(title)+'</h3>'
    +(body?'<p>'+esc(body)+'</p>':'')
    +(actionsHtml?'<div class="es-actions">'+actionsHtml+'</div>':'')+'</div>';
}
// variant A: ONE action, the SAME label on every tab; clearFn resets that tab's search AND any
// active filters, then rerenders. No getting-started guidance in this variant, ever.
function emptySearchState(icon,noun,clearFn){
  return emptyStateHtml(icon,'No '+noun+' match.','',
    '<button class="linklike es-clear" type="button" onclick="'+clearFn+'()">Clear search &amp; filters</button>');
}
// per-tab clear helpers — shared by the empty-state action AND the header "Clear filters" button.
function clearProductFilters(){ ['ingSearch','ingCatFilter','ingSupFilter'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; }); renderIngredients(); }
function clearIngredientFilters(){ var el=document.getElementById('kingSearch'); if(el) el.value=''; kingQuery=''; var c=document.getElementById('kingCatFilter'); if(c) c.value=''; renderKitchenPanel(); }
function clearPlateFilters(){ var s=document.getElementById('plateSearch'); if(s) s.value=''; var f=document.getElementById('plateCatFilter'); if(f) f.value=''; renderPlatesTab(); }
// v68: Menu tab margin-light filter — multi-select tappable chips (green/amber/red). Empty = show all;
// tapping red shows red only; tapping amber too shows amber+red (the "everything needing attention" case).
var menuLightFilter=[];
function lightFilterPass(active, light){                            // pure (tested): no active lights ⇒ everything; else only the active lights
  if(!active || !active.length) return true;
  return active.indexOf(light)>=0;
}
function toggleMenuLight(light){
  var i=menuLightFilter.indexOf(light);
  if(i>=0) menuLightFilter.splice(i,1); else menuLightFilter.push(light);
  syncMenuLightChips(); renderAnalysis();
}
function syncMenuLightChips(){                                      // reflect state on the chips (active vs inactive + aria-pressed)
  ['green','amber','red'].forEach(function(lt){
    var b=document.querySelector('.mlf-chip[data-light="'+lt+'"]'); if(!b) return;
    var on=menuLightFilter.indexOf(lt)>=0;
    b.classList.toggle('on',on); b.setAttribute('aria-pressed',on?'true':'false');
  });
}
function clearMenuFilters(){ var m=document.getElementById('menuSearch'); if(m) m.value=''; var c=document.getElementById('menuCatFilter'); if(c) c.value=''; menuLightFilter=[]; syncMenuLightChips(); renderAnalysis(); }
function ingUnitLabel(p){ return p.base_unit==='g'?'per kg':p.base_unit==='ml'?'per litre':p.base_unit==='ea'?'per unit':(p.base_unit||''); }
var TIDY_DOOR='__tidy__';   // v60 item 8: sentinel option value = "open the Tidy modal scoped to this field"
function fillFilter(sel, list, label){
  if(!sel) return; var cur=sel.value;
  var html='<option value="">'+label+'</option>'+list.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
  if(sel.dataset && sel.dataset.tidyField) html+='<option value="'+TIDY_DOOR+'">✎ Manage list…</option>';   // one door per category/supplier filter
  sel.innerHTML=html; if(cur && list.indexOf(cur)>=0) sel.value=cur;
}
function renderIngredients(){
  var wrap=document.getElementById('ingList'); if(!wrap) return;
  var cntEl=document.getElementById('ingCount');
  if(!PRODUCTS.length){                                               // brand-new user: no products at all -> full empty state (gate on the store, not the filtered rows)
    if(cntEl) cntEl.textContent='';
    wrap.innerHTML=emptyStateHtml(ICON_BOX_BIG,'No products yet.',"Import an invoice or tap '+ New product'.",
      '<button class="btn primary" type="button" onclick="document.getElementById(\'importBtn\').click()">Import invoice</button>'
      +'<button class="btn" type="button" onclick="openModal()">+ New product</button>');   // v45 item 4: "Add product" -> "New product" everywhere
    return;
  }
  fillFilter(document.getElementById('ingCatFilter'), prodCategories(), 'All categories');
  fillFilter(document.getElementById('ingSupFilter'), prodSuppliers(), 'All suppliers');
  var q=(document.getElementById('ingSearch')?document.getElementById('ingSearch').value:'').trim().toLowerCase();
  var toks=searchTokens(q);   // v59: shared token matcher
  var cat=(document.getElementById('ingCatFilter')||{}).value||'';
  var sup=(document.getElementById('ingSupFilter')||{}).value||'';
  var cf=document.getElementById('ingClearFilters'); if(cf) cf.style.display=(q||cat||sup)?'':'none';   // v54: hidden when nothing is active (matches the app's hide-inert pattern)
  var items=PRODUCTS.filter(function(p){
    if(cat && p.category!==cat) return false;
    if(sup && (p.supplier||'')!==sup) return false;
    if(toks.length){ var hay=((p.description||'')+' '+(p.brand||'')+' '+(p.category||'')+' '+(p.supplier||'')).toLowerCase(); if(!matchTokens(toks,hay)) return false; }
    return true;
  }).slice().sort(function(a,b){return (a.description||'').toLowerCase().localeCompare((b.description||'').toLowerCase());});
  if(cntEl) cntEl.textContent=items.length+' product'+(items.length===1?'':'s');
  if(!items.length){ wrap.innerHTML=emptySearchState(ICON_BOX_BIG,'products','clearProductFilters'); return; }   // v58: variant A via the shared helper
  wrap.innerHTML=items.map(function(p){
    return '<button class="ing-card" type="button" data-id="'+esc(p.id)+'">'
      +'<div class="ing-main"><span class="ing-name">'+esc(p.description)+'</span>'
      +(p.brand?'<span class="ing-brand">'+esc(p.brand)+'</span>':'')+'</div>'
      +'<div class="ing-meta">'
      +(p.category?'<span class="ing-tag">'+esc(p.category)+'</span>':'')
      +(p.supplier?'<span class="ing-tag sup">'+esc(p.supplier)+'</span>':'')
      +'</div>'
      +'<div class="ing-price"><b>'+dispPrice(p)+'</b><span class="ing-per">'+ingUnitLabel(p)+'</span></div>'
      +'</button>';
  }).join('');
  wrap.querySelectorAll('.ing-card').forEach(function(b){ b.onclick=function(){ openIngEdit(b.getAttribute('data-id')); }; });
}
var ingEditId=null;
function openIngEdit(id){
  var p=byId[id]; if(!p) return; ingEditId=id;
  document.getElementById('ingModalTitle').textContent='Edit product';
  document.getElementById('ig_name').value=p.description||'';
  document.getElementById('ig_brand').value=p.brand||'';
  document.getElementById('ig_cat').value=p.category||'';
  document.getElementById('ig_sup').value=p.supplier||'';
  var ut=p.base_unit==='g'?'kg':p.base_unit==='ml'?'litre':p.base_unit==='ea'?'unit':'kg';
  document.getElementById('ig_unit').value=ut;
  var pv=perDisplayValue(p); document.getElementById('ig_price').value=(pv==null?'':pv);
  document.getElementById('ig_packQty').value=(p.pack_qty==null?'':p.pack_qty);
  document.getElementById('ig_packUnit').value=(p.pack_unit||'');
  var e=document.getElementById('ig_err'); if(e)e.style.display='none';
  ['ig_brand','ig_cat','ig_sup'].forEach(function(x){ var d=document.getElementById(x+'Drop'); if(d)d.style.display='none'; });
  makeInlineCombo('ig_brand','ig_brandDrop',prodBrands);
  makeInlineCombo('ig_cat','ig_catDrop',prodCategories);
  makeInlineCombo('ig_sup','ig_supDrop',prodSuppliers);
  var puSel=document.getElementById('ig_packUnit');
  if(puSel && !puSel.__wired){ puSel.__wired=true; puSel.addEventListener('change', syncIgUnitFromPack); }
  var uSel=document.getElementById('ig_unit'); var lp=document.getElementById('ig_pricePer'); if(lp&&uSel) lp.textContent=igPriceSuffix();
  show('ingModal');
}
function packUnitToIgUnit(pu){ pu=(pu||'').toLowerCase(); return pu==='ea'?'unit':pu==='kg'?'kg':pu==='g'?'g':pu==='l'?'litre':pu==='ml'?'ml':null; }
function syncIgUnitFromPack(){                                        // when a pack unit is chosen, make the *displayed* unit match it
  var puSel=document.getElementById('ig_packUnit'); var uSel=document.getElementById('ig_unit'); if(!puSel||!uSel) return;
  if(uSel.disabled) return;                                          // v54: unit type is create-only on the EDIT form — never auto-change a product's base unit (it would corrupt saved plate costs)
  var want=packUnitToIgUnit(puSel.value); if(!want) return;
  if(uSel.value!==want){ uSel.value=want; var lp=document.getElementById('ig_pricePer'); if(lp) lp.textContent=igPriceSuffix(); }
}
function igPriceSuffix(){ var u=(document.getElementById('ig_unit')||{}).value; return u==='unit'?'/unit':u==='litre'?'/L':u==='ml'?'/mL':u==='g'?'/g':'/kg'; }
function deleteIngredient(){
  var id=ingEditId; if(!id||!byId[id]) return; var nm=byId[id].description||'this product';
  askConfirm('Delete product?', 'Remove \u201c'+nm+'\u201d from your products? It won\u2019t change plates you\u2019ve already saved.', 'Delete', function(){
    if(deletedProdIds.indexOf(id)<0){ deletedProdIds.push(id); saveDeletedProds(); }
    if(overrides[id]){ delete overrides[id]; saveOverrides(); }            // drop any custom/edited data too
    dbSetSetting('deleted_prod_ids', deletedProdIds);
    rebuild(); closeIngEdit(); renderIngredients(); toast('Product deleted');
  });
}
function closeIngEdit(){ hide('ingModal'); ingEditId=null; }
function saveIngEdit(){
  var id=ingEditId; if(!id||!byId[id]) return;
  var err=document.getElementById('ig_err'); function fail(m){ if(err){err.textContent=m;err.style.display='block';} }
  var name=document.getElementById('ig_name').value.trim();
  var price=parseFloat(document.getElementById('ig_price').value);
  // v54: unit type is create-only on the edit form. Derive it from the STORED product (same mapping
  // openIngEdit displays with), so an edit can never change base_unit/cost_basis — only the price does.
  var _bu=byId[id].base_unit;
  var unitType=_bu==='g'?'kg':_bu==='ml'?'litre':_bu==='ea'?'unit':'kg';
  if(!name) return fail('Enter a product name.');
  if(isNaN(price)||price<0) return fail('Enter a valid price per unit.');
  var cat=resolveCombo('ig_cat', prodCategories); if(!document.getElementById('ig_cat').value.trim()) cat={ok:true,value:''};
  if(!cat.ok) return fail('\u201c'+cat.value+'\u201d is a new category \u2014 pick \u201cCreate new\u201d to confirm.');
  var br=resolveCombo('ig_brand', prodBrands); if(!br.ok) return fail('\u201c'+br.value+'\u201d is a new brand \u2014 pick \u201cCreate new\u201d to confirm.');
  var sup=resolveCombo('ig_sup', prodSuppliers); if(!sup.ok) return fail('\u201c'+sup.value+'\u201d is a new supplier \u2014 pick \u201cCreate new\u201d to confirm.');
  var ub=invUnitToBase(unitType);
  var pq=parseFloat(document.getElementById('ig_packQty').value); var pu=document.getElementById('ig_packUnit').value;
  setOverride(id, {description:name, brand:br.value||null, category:cat.value||null, supplier:sup.value||null,
    base_unit:ub.base_unit, cost_basis:ub.cost_basis, cost_per_base_unit:price/ub.div,
    pack_qty:(isNaN(pq)?null:pq), pack_unit:(pu||null)});
  if(!isNaN(pq) && pq>0) syncMemoryToProduct(id, pq, (pu||'ea'));   // ITEM 1: no stale Remembered-items entry left behind
  logHistory();
  renderIngredients(); if(typeof renderPlate==='function') renderPlate(); if(typeof renderAnalysis==='function') renderAnalysis();
  closeIngEdit(); toast('Product updated');
}

/* ============================================================
   Feature 1 (Phase 2) — "My ingredients" panel + create/change/delete
   ============================================================ */
function kingProductLabel(k){                                        // "Chips 10mm Straight Cut — Safries · $2.68/kg" (v36: arrow dropped, the text is the link)
  var p=byId[k.pid];
  if(!p) return '(product missing)';
  return p.description+(p.brand?' \u2014 '+p.brand:'')+' \u00b7 '+unitCostStr(p);
}
// v59 item 6a: an ingredient's category is DERIVED, live, from its linked product \u2014 never stored on
// the ingredient. Repointing the link or editing the product's category changes it automatically.
function kingCategory(k){ var p=k&&byId[k.pid]; return (p&&p.category)||''; }
function kingCategories(){ var s={}; (kitchenIngredients||[]).forEach(function(k){ var c=kingCategory(k); if(c) s[c]=1; }); return Object.keys(s).sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase());}); }
/* ITEM 3 (v35): the pantry filter, kept pure (no DOM) so it can be tested directly.
   v59: routed through the shared token matcher (searchTokens/matchTokens) like every other search
   bar — matches the kitchen word's name, its linked product's description/brand, AND its DERIVED
   category (= the linked product's category, item 6a), in any token order. */
function kingSearchFilter(q, words, prods){
  var toks=searchTokens(q);
  if(!toks.length) return (words||[]).slice();
  return (words||[]).filter(function(k){
    if(!k) return false;
    var p=(prods||{})[k.pid];
    var hay=((k.name||'')+' '+(p?((p.description||'')+' '+(p.brand||'')+' '+(p.category||'')):'')).toLowerCase();
    return matchTokens(toks,hay);
  });
}
var kingQuery='';
function renderKitchenPanel(){
  var box=document.getElementById('kingList'); if(!box) return;
  var sw=document.getElementById('kingSearch'); if(sw) kingQuery=sw.value||'';
  if(!kitchenIngredients.length){
    box.innerHTML=emptyStateHtml(ICON_LEAF_BIG,'No ingredients yet.',"Tap '+ New ingredient' or set up from your products.",
      '<button class="btn primary" type="button" id="kingEmptyNew">+ New ingredient</button>');
    var b=document.getElementById('kingEmptyNew'); if(b) b.onclick=function(){ openKingModal(null); };
    renderKingProgress();                                            // zero kitchen words + many products is EXACTLY when the wizard matters
    return;
  }
  var kcat=(document.getElementById('kingCatFilter')||{}).value||'';   // v59 item 6a: filter by DERIVED category
  fillFilter(document.getElementById('kingCatFilter'), kingCategories(), 'All categories');
  var kcf=document.getElementById('kingClearFilters'); if(kcf) kcf.style.display=(kingQuery||kcat)?'':'none';
  var list=kingSearchFilter(kingQuery, kitchenIngredients, byId)
    .filter(function(k){ return !kcat || kingCategory(k)===kcat; })
    .sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!list.length){                                                  // ITEM 3 (v35): there ARE words, the filter/search just matched none of them
    box.innerHTML=emptySearchState(ICON_LEAF_BIG,'ingredients','clearIngredientFilters');   // v58: variant A via the shared helper
    renderKingProgress();                                            // progress counts PRODUCTS, not the filtered view — it stays true
    return;
  }
  // v44 item 6b: the whole card opens the Edit modal (Products pattern) — no visible Edit/Remove links.
  // Remove lives INSIDE the modal now, still going through deleteKitchenIngredient unchanged.
  box.innerHTML=list.map(function(k){
    var c=kingCategory(k);                                           // v59 item 6a: derived-category chip
    // v67 follow-up: category chip sits in a meta row at the BOTTOM of the card (name → linked product →
    // category), matching the Products card layout (.ing-main then .ing-meta), and reuses the same .ing-tag
    // chip so ingredient and product cards read identically. It used to sit inline between name and link.
    return '<div class="king-row" data-kid="'+esc(k.id)+'" role="button" tabindex="0" aria-label="Edit '+esc(k.name||'ingredient')+'">'
      +'<div class="king-main"><span class="king-name">'+esc(k.name||'Ingredient')+'</span>'
      +'<span class="king-link">'+esc(kingProductLabel(k))+'</span></div>'
      +(c?'<div class="king-meta"><span class="ing-tag">'+esc(c)+'</span></div>':'')
      +'</div>';
  }).join('');
  box.querySelectorAll('.king-row').forEach(function(row){
    var open=function(){ openKingModal(row.getAttribute('data-kid')); };
    row.onclick=open;
    row.onkeydown=function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); open(); } };   // keyboard parity for the button-role card
  });
  renderKingProgress();                                              // ITEM 2 (v34): setup progress + wizard entry stay current with the list
}
/* ===== ITEM 2 (v34): "Set up from products" — bulk-create kitchen words so setup is fast, incremental, never blocking ===== */
/* ITEM 4 (v35): skips are PERSISTED and SHARED. Deciding "we never cook with this"
   is a data decision about the café, not a per-device UI preference, so it rides
   the same setting + localStorage-mirror path as everything else and reaches every
   staff phone. The in-memory shape stays a map for O(1) lookups in kingWizGroups;
   only the stored shape is an array. There are no per-skip confirms by design —
   speed is the point, and a mis-skip costs two taps to undo. */
var kingWizOpen=false, kingWizSkip={}, kingWizLimit=40, kingWizShowSkipped=false;
var KWSKIPKEY='cafeDB_kingWizSkips';
function kingWizSkipIds(){ return Object.keys(kingWizSkip); }
// v55 §H: park a product the user just repointed AWAY from into the wizard's Skipped list, so it isn't
// re-proposed as "unlinked" and nag. Recoverable via Unskip. No-op for a falsy pid.
function parkRepointedProduct(pid){ if(pid){ kingWizSkip[pid]=true; saveKingWizSkips(); } }
function setKingWizSkips(ids){                                        // idempotent: same payload in, same state out
  var m={}; (ids||[]).forEach(function(id){ if(id) m[id]=1; });
  kingWizSkip=m;
  try{ localStorage.setItem(KWSKIPKEY, JSON.stringify(Object.keys(m))); }catch(e){}
}
function saveKingWizSkips(){
  var ids=kingWizSkipIds();
  try{ localStorage.setItem(KWSKIPKEY, JSON.stringify(ids)); }catch(e){}
  if(typeof dbSetSetting==='function') dbSetSetting('king_wiz_skips', ids);
}
(function(){ try{ var a=JSON.parse(localStorage.getItem(KWSKIPKEY)); if(Array.isArray(a)) setKingWizSkips(a); }catch(e){} })();
function kingLinkableProducts(){ return PRODUCTS.filter(function(p){ return p && p.description && p.is_food!==false; }); }
function kingUnlinkedProducts(){
  var linked={}; (kitchenIngredients||[]).forEach(function(k){ if(k&&k.pid) linked[k.pid]=1; });
  return kingLinkableProducts().filter(function(p){ return !linked[p.id]; });
}
function proposeKingName(p){                                          // supplier description -> friendly kitchen word ("Eggs Large Bulk (180)" -> "Eggs Large")
  var toks=coreTokens(p.description||'', p.brand||''), seen={}, out=[];
  toks.forEach(function(t){ if(!seen[t]){ seen[t]=1; out.push(t); } });
  if(!out.length){ var f=inorm(p.description||'').split(' ').filter(Boolean); out=f.length?[f[0]]:['item']; }
  return out.slice(0,3).map(function(t){ return t.charAt(0).toUpperCase()+t.slice(1); }).join(' ');
}
function kingNameExists(nm){ nm=(nm||'').trim().toLowerCase(); return (kitchenIngredients||[]).some(function(k){ return k && (k.name||'').trim().toLowerCase()===nm; }); }
/* ITEM 2 (v35): the rename decision, kept pure (no DOM) so it can be tested directly.
   Excludes the word being edited by id, so re-saving a word under its OWN current name
   is fine while landing on someone else's name is refused. A rename is never a copy:
   there is exactly one outcome — the same kid keeps its id and gains a new label. */
function kingRenameCheck(kid, name, words){
  name=(name||'').trim();
  if(!name) return {ok:false, reason:'empty', name:name};
  var clash=(words||[]).filter(function(k){ return k && k.id!==kid && (k.name||'').trim().toLowerCase()===name.toLowerCase(); })[0];
  if(clash) return {ok:false, reason:'duplicate', name:name};
  return {ok:true, name:name};
}
function kingWizOutstanding(){                                        // ITEM 4 (v35): what the wizard could still PROPOSE — a skipped product is decided, not outstanding
  return kingUnlinkedProducts().filter(function(p){ return !kingWizSkip[p.id]; }).length;
}
/* ITEM 5 (v35): what an invoice add-as-new line's Kitchen name field MEANS. Pure, so
   the decision is testable without a live import. v34 read this field as free text and
   SILENTLY skipped creation when the name already existed — which threw away the most
   valuable case: the brand swap. Now a name that already exists (typed OR picked from
   the list — same intent, same outcome) REPOINTS that word at the new product. */
function kingNameAction(nm, words){
  nm=(nm||'').trim();
  if(!nm) return {action:'none'};
  var hit=(words||[]).filter(function(k){ return k && (k.name||'').trim().toLowerCase()===nm.toLowerCase(); })[0];
  if(hit) return {action:'repoint', kid:hit.id, name:hit.name};
  return {action:'create', name:nm};
}
/* ITEM 5 (v35): the unit-category decision, extracted from saveKingModal so the modal
   path and the deferred invoice path cannot drift apart. Both now call this. */
function kingRepointGuard(oldBaseUnit, newBaseUnit){
  var oldCat=oldBaseUnit?unitCatCategory(oldBaseUnit):null, newCat=newBaseUnit?unitCatCategory(newBaseUnit):null;
  return {needsConfirm: !!(oldCat && newCat && oldCat!==newCat), oldCat:oldCat, newCat:newCat};
}
function unitCatWord(c){ return c==='kg'?'kg':c==='l'?'litre':'unit'; }
function renderKingProgress(){
  var pr=document.getElementById('kingProgress'), wb=document.getElementById('kingWizBtn'); if(!pr||!wb) return;
  var total=kingLinkableProducts().length, un=kingUnlinkedProducts().length, done=total-un;
  var todo=kingWizOutstanding(), skipped=kingWizSkipIds().length;
  // hide only when there is nothing left to propose AND nothing skipped to recover — otherwise skipping everything would strand the Unskip list behind a hidden button
  if(!total || (!todo && !skipped && !kingWizOpen)){ pr.style.display='none'; wb.style.display='none'; return; }
  pr.textContent=done+' of '+total+' products have a kitchen word';   // stays literal: a skipped product genuinely has no kitchen word, so it still counts as not-done here
  pr.style.display=un?'block':'none';
  wb.style.display='';                                              // stays visible while open so "Close setup" is always reachable
  wb.innerHTML=kingWizOpen?'Close<span class="btn-noun"> setup</span>':'Set up<span class="btn-noun"> from products</span>';   // v44 item 5: the noun span hides on phones so the pantry pair fits one line
}
function kingWizGroups(){                                             // proposal -> products[]; same cleaned name = one grouped choice, never silent duplicates
  var map={}, order=[];
  kingUnlinkedProducts().forEach(function(p){
    if(kingWizSkip[p.id]) return;
    var nm=proposeKingName(p), key=nm.toLowerCase();
    if(!map[key]){ map[key]={name:nm, products:[]}; order.push(key); }
    map[key].products.push(p);
  });
  order.sort(function(a,b){ return map[a].name.localeCompare(map[b].name); });
  return order.map(function(k){ return map[k]; });
}
function kingWizRowHtml(g,gi){
  var one=g.products.length===1, p0=g.products[0];
  var prodBit=one
    ? '<span class="kw-prod">'+esc(p0.description)+(p0.brand?' \u00b7 '+esc(p0.brand):'')+'</span>'
    : '<select class="kw-pick" aria-label="Which product">'+g.products.map(function(p,pi){ return '<option value="'+esc(p.id)+'"'+(pi?'':' selected')+'>'+esc(p.description)+(p.brand?' \u2014 '+esc(p.brand):'')+'</option>'; }).join('')+'</select>';
  return '<div class="kw-row" data-gi="'+gi+'">'
    +'<input class="kw-name" type="text" value="'+esc(g.name)+'" aria-label="Kitchen name">'
    +prodBit
    +'<button class="btn kw-add" type="button">Add</button>'
    +'<button class="linklike kw-skip" type="button">Skip</button>'
    +'</div>';
}
/* ITEM 4 (v35): the skipped list is always reachable while the wizard is open, so a
   mis-skip is never a dead end. Collapsed by default — it's recovery, not the job. */
function kingWizSkippedHtml(ids){
  if(!ids || !ids.length) return '';
  var html='<div class="kw-skipped"><button class="linklike kw-skiptoggle" type="button">Skipped ('+ids.length+') \u2014 '+(kingWizShowSkipped?'hide':'show')+'</button>';
  if(kingWizShowSkipped){
    html+=ids.map(function(id){
      var p=byId[id];
      var lbl=p ? (p.description+(p.brand?' \u00b7 '+p.brand:'')) : '(this product no longer exists)';
      return '<div class="kw-srow" data-pid="'+esc(id)+'"><span class="kw-prod">'+esc(lbl)+'</span>'
        +'<button class="linklike kw-unskip" type="button">Unskip</button></div>';
    }).join('');
  }
  return html+'</div>';
}
function wireKingWizSkipped(box){
  var t=box.querySelector('.kw-skiptoggle'); if(t) t.onclick=function(){ kingWizShowSkipped=!kingWizShowSkipped; renderKingWizard(); };
  box.querySelectorAll('.kw-unskip').forEach(function(b){ b.onclick=function(){
    var row=b.closest('.kw-srow'); if(!row) return;
    delete kingWizSkip[row.getAttribute('data-pid')];
    saveKingWizSkips(); renderKingWizard();                          // no confirm — two taps to undo is the whole design
  }; });
}
function renderKingWizard(){
  var box=document.getElementById('kingWiz'); if(!box) return;
  if(!kingWizOpen){ box.style.display='none'; box.innerHTML=''; hide('kingWizModal'); renderKingProgress(); return; }
  show('kingWizModal');                                               // v61 item 4: the wizard lives in its own modal now — opening is explicit, the × closes it
  var groups=kingWizGroups();
  var skipIds=kingWizSkipIds(), skipHtml=kingWizSkippedHtml(skipIds);
  if(!groups.length){
    box.innerHTML='<div class="kw-done">'+(skipIds.length
        ? '\u2713 Nothing left to set up \u2014 everything else is skipped.'   // "every product has a kitchen word" would be a lie here
        : '\u2713 Every product has a kitchen word \u2014 recipes can use all of them.')
      +'</div>'+skipHtml;
    box.style.display='block'; wireKingWizSkipped(box); renderKingProgress(); return;
  }
  var singles=groups.filter(function(g){return g.products.length===1;}).length;
  var head='<div class="kw-head"><span class="kw-explain">Tap Add to accept a name (edit it first if you like). Skip anything you\u2019d never cook with.</span>'
    +(singles>1?'<button class="btn ghost kw-all" type="button">Add all '+singles+' suggested</button>':'')+'</div>';
  var shown=groups.slice(0,kingWizLimit);
  box.innerHTML=head+shown.map(kingWizRowHtml).join('')
    +(groups.length>shown.length?'<button class="linklike kw-more" type="button">Show '+(groups.length-shown.length)+' more</button>':'')
    +skipHtml;
  box.style.display='block';
  var wireRow=function(row){
    var gi=parseInt(row.getAttribute('data-gi'),10), g=shown[gi]; if(!g) return;
    var pidOf=function(){ var s=row.querySelector('.kw-pick'); return s?s.value:g.products[0].id; };
    row.querySelector('.kw-add').onclick=function(){
      var nm=(row.querySelector('.kw-name').value||'').trim()||g.name;
      if(kingNameExists(nm)){ toast('\u201c'+nm+'\u201d already exists \u2014 edit the name first'); return; }
      kitchenIngredients.push({id:nextKid(), name:nm, pid:pidOf()});
      saveKitchenIngredients(); renderKitchenPanel(); renderKingWizard();
    };
    row.querySelector('.kw-skip').onclick=function(){ g.products.forEach(function(p){ kingWizSkip[p.id]=1; }); saveKingWizSkips(); renderKingWizard(); };   // ITEM 4 (v35): persists + syncs; no confirm by design
  };
  box.querySelectorAll('.kw-row').forEach(wireRow);
  var all=box.querySelector('.kw-all');
  if(all) all.onclick=function(){
    var gs=kingWizGroups().filter(function(g){return g.products.length===1;});
    askConfirm('Add '+gs.length+' ingredients?', 'One kitchen word per product, using the suggested names. You can rename or remove any of them later.', 'Add all', function(){
      var made=0, skipped=0, taken={};
      gs.forEach(function(g){
        var nm=g.name;
        if(kingNameExists(nm)||taken[nm.toLowerCase()]){ skipped++; return; }
        taken[nm.toLowerCase()]=1;
        kitchenIngredients.push({id:nextKid(), name:nm, pid:g.products[0].id}); made++;
      });
      if(made) saveKitchenIngredients();                             // one write for the whole batch
      renderKitchenPanel(); renderKingWizard();
      toast(made+' ingredient'+(made===1?'':'s')+' added'+(skipped?(' \u00b7 '+skipped+' skipped (name already used)'):''));
    });
  };
  var more=box.querySelector('.kw-more'); if(more) more.onclick=function(){ kingWizLimit+=40; renderKingWizard(); };
  wireKingWizSkipped(box);                                          // ITEM 4 (v35)
  renderKingProgress();
}
function toggleKingWizard(){ kingWizOpen=!kingWizOpen; if(kingWizOpen) kingWizLimit=40; renderKingWizard(); }
function closeKingWizard(){ if(!kingWizOpen) return; kingWizOpen=false; renderKingWizard(); }   // v61 item 4: the single close path — keeps kingWizOpen in sync with the modal (× / Escape / backdrop all route here)
/* ---- create / change-product modal (Name + product search-select) ---- */
var kingEditId=null, kingChosenPid=null, kingAddToPlateOnSave=false;
function renderKingAlts(){                                            // "Cheaper like-for-like" — only in change-product (edit) mode, compared vs the CURRENT link
  var box=document.getElementById('king_alts'); if(!box) return;
  if(!kingEditId){ renderKingCreateSuggest(); return; }              // ITEM 2b (v34): create mode reuses this box for name-based suggestions
  var k=kById[kingEditId]; var base=k?byId[k.pid]:null;
  if(!base){ box.style.display='none'; box.innerHTML=''; return; }
  var res=alternatives(base);
  if(res.cheapest || !res.alts.length){
    box.innerHTML='<div class="ka-head">Cheaper like-for-like</div><div class="ka-cheapest">\u2713 Already the cheapest of its type</div>';
    box.style.display='block'; return;
  }
  var rows=res.alts.map(function(a){
    var sv=(cpbu(base)!=null&&cpbu(a)<cpbu(base))?Math.round((1-cpbu(a)/cpbu(base))*100):0;
    return '<div class="ka-row"><span class="ka-name">'+esc(a.description)+(a.brand?' <span class="ca">'+esc(a.brand)+'</span>':'')+'</span>'
      +'<span class="ka-price">'+esc(unitCostStr(a))+'</span>'+(sv>0?'<span class="save">\u2212'+sv+'%</span>':'')
      +'<button class="use" type="button" data-pid="'+esc(a.id)+'">Use</button></div>';
  }).join('');
  box.innerHTML='<div class="ka-head">Cheaper like-for-like (by '+(base.base_unit==='ea'?'unit':base.base_unit==='ml'?'litre':'kg')+')</div>'+rows;
  box.style.display='block';
  box.querySelectorAll('.use').forEach(function(b){ b.addEventListener('click',function(){
    var pid=b.getAttribute('data-pid'); var p=byId[pid]; if(!p) return;
    kingChosenPid=pid;                                               // behaves exactly like picking from search — Save + unit guard still apply
    var inp=document.getElementById('king_prod'); if(inp) inp.value=p.description+(p.brand?' \u2014 '+p.brand:'');
    kingSyncSave();
  }); });
}
/* ITEM 2b (v34): create mode — typing "Chips" immediately offers the top product matches, one tap links it.
   Reuses rankCandidates (the invoice matcher) read-only; nothing in the protected region is modified. */
function renderKingCreateSuggest(){
  var box=document.getElementById('king_alts'); if(!box) return;
  if(kingEditId){ return; }                                          // edit mode is renderKingAlts' job
  var nm=(document.getElementById('king_name')?document.getElementById('king_name').value:'').trim();
  if(nm.length<2 || kingChosenPid){ box.style.display='none'; box.innerHTML=''; return; }
  var cands=(rankCandidates(nm)||[]).slice(0,3).map(function(c){ return byId[c.id]; }).filter(Boolean);
  if(!cands.length){ box.style.display='none'; box.innerHTML=''; return; }
  box.innerHTML='<div class="ka-head">Link to one of these?</div>'+cands.map(function(p){
    return '<div class="ka-row"><span class="ka-name">'+esc(p.description)+(p.brand?' <span class="ca">'+esc(p.brand)+'</span>':'')+'</span>'
      +'<span class="ka-price">'+esc(unitCostStr(p))+'</span>'
      +'<button class="use" type="button" data-pid="'+esc(p.id)+'">Use</button></div>';
  }).join('');
  box.style.display='block';
  box.querySelectorAll('.use').forEach(function(b){ b.addEventListener('click',function(){
    var pid=b.getAttribute('data-pid'); var p=byId[pid]; if(!p) return;
    kingChosenPid=pid;
    var inp=document.getElementById('king_prod'); if(inp) inp.value=p.description+(p.brand?' \u2014 '+p.brand:'');
    box.style.display='none'; box.innerHTML='';
    kingSyncSave();
  }); });
}
function kingValid(){
  var nm=(document.getElementById('king_name').value||'').trim();
  return !!nm && !!kingChosenPid && !!byId[kingChosenPid];
}
function kingSyncSave(){ var s=document.getElementById('kingModalSave'); if(s) s.disabled=!kingValid(); updateKingCat(); }
// v59 item 6a: reflect the DERIVED category live as the linked product changes (read-only display)
function updateKingCat(){
  var el=document.getElementById('king_cat'); if(!el) return;
  var pid=kingChosenPid || (kingEditId && kById[kingEditId] ? kById[kingEditId].pid : null);
  var p=pid!=null?byId[pid]:null; var c=p&&p.category;
  el.textContent=c?c:'—';
}
function renderKingProdDrop(){
  var inp=document.getElementById('king_prod'), drop=document.getElementById('king_prodDrop'); if(!inp||!drop) return;
  var q=(inp.value||'').trim().toLowerCase();
  var pool=PRODUCTS.filter(function(p){ return p && p.description; });
  var scored;
  if(!q){ scored=pool.slice().sort(function(a,b){return a.description.toLowerCase().localeCompare(b.description.toLowerCase());}).slice(0,8); }
  else{
    scored=pool.filter(function(p){ return ((p.description||'')+' '+(p.brand||'')).toLowerCase().indexOf(q)>=0; })
      .sort(function(a,b){ return a.description.toLowerCase().indexOf(q)-b.description.toLowerCase().indexOf(q) || a.description.localeCompare(b.description); })
      .slice(0,8);
  }
  if(!scored.length){ drop.innerHTML='<div class="opt muted">No products match</div>'; drop.style.display='block'; anchorDrop(drop); return; }
  drop.innerHTML=scored.map(function(p){
    return '<div class="opt cat-opt" data-pid="'+esc(p.id)+'">'+esc(p.description)+(p.brand?' <span class="ca">'+esc(p.brand)+'</span>':'')+' <span class="ca">'+esc(unitCostStr(p))+'</span></div>';
  }).join('');
  drop.style.display='block'; anchorDrop(drop);   // v59 item 2: escape the modal-body clip
  drop.querySelectorAll('.cat-opt').forEach(function(o){ o.addEventListener('mousedown',function(e){ e.preventDefault();
    var pid=o.getAttribute('data-pid'); var p=byId[pid]; if(!p) return;
    kingChosenPid=pid; inp.value=p.description+(p.brand?' \u2014 '+p.brand:''); drop.style.display='none'; resetDrop(drop); kingSyncSave();
  }); });
}
function openKingModal(kid){
  kingEditId=kid||null; kingChosenPid=null;
  if(!kid) kingAddToPlateOnSave=false;                               // create-from-search sets this true AFTER openKingModal returns
  var isEdit=!!kingEditId; var k=isEdit?kById[kingEditId]:null;
  document.getElementById('kingModalTitle').textContent=isEdit?'Edit ingredient':'New ingredient';
  var nameEl=document.getElementById('king_name'), prodEl=document.getElementById('king_prod');
  nameEl.value=isEdit?(k?k.name:''):''; nameEl.disabled=false;                 // ITEM 2 (v35): edit mode can rename. Plates persist {kid, qty} only (see the lines map in savePlate) and read the label live via kById, so a rename is display-only and cannot touch a recipe.
  prodEl.value=isEdit&&k&&byId[k.pid]?(byId[k.pid].description+(byId[k.pid].brand?' \u2014 '+byId[k.pid].brand:'')):'';
  kingChosenPid=isEdit&&k?k.pid:null;
  var err=document.getElementById('king_err'); if(err)err.style.display='none';
  document.getElementById('king_prodDrop').style.display='none';
  renderKingAlts();
  if(!prodEl.__wired){ prodEl.__wired=true;
    prodEl.addEventListener('input',function(){ kingChosenPid=null; kingSyncSave(); renderKingProdDrop(); });
    prodEl.addEventListener('focus',renderKingProdDrop);
    prodEl.addEventListener('blur',function(){ setTimeout(function(){ var d=document.getElementById('king_prodDrop'); if(d){ d.style.display='none'; resetDrop(d); } },150); });
  }
  if(!nameEl.__wired){ nameEl.__wired=true; nameEl.addEventListener('input',function(){
    var ke=document.getElementById('king_err'); if(ke) ke.style.display='none';   // ITEM 2 (v35): a rejected rename clears as soon as they start fixing it
    kingSyncSave(); renderKingCreateSuggest(); }); }
  var usedEl=document.getElementById('king_used');                   // ITEM 2d (v34): surface the model's payoff at the moment it matters
  if(usedEl){
    if(isEdit){
      var used=(savedPlates||[]).filter(function(sp){ return (sp.lines||[]).some(function(l){ return l&&l.kid===kingEditId; }); }).length;
      usedEl.textContent=used?('Used in '+used+' saved plate'+(used===1?'':'s')+' \u2014 changing the product updates all of them.')
                             :'Not used in any saved plates yet.';
      usedEl.style.display='block';
    } else usedEl.style.display='none';
  }
  var remEl=document.getElementById('kingModalRemove');              // v44 item 6b: Remove lives in the modal, edit mode only
  if(remEl) remEl.style.display=isEdit?'':'none';
  kingSyncSave();
  show('kingModal');
}
function closeKingModal(){ hide('kingModal'); kingEditId=null; kingChosenPid=null; kingAddToPlateOnSave=false; }
function saveKingModal(){
  if(!kingValid()) return;
  var name=(document.getElementById('king_name').value||'').trim();
  var pid=kingChosenPid, np=byId[pid];
  if(kingEditId){                                                    // ITEM 2 (v35): edit flow — rename, change product, or both
    var k=kById[kingEditId]; if(!k){ closeKingModal(); return; }
    var chk=kingRenameCheck(kingEditId, name, kitchenIngredients);
    if(!chk.ok){                                                    // rejected inline; the modal stays open on the offending field
      var ke=document.getElementById('king_err');
      if(ke){ ke.textContent=(chk.reason==='duplicate')
        ? ('\u201c'+chk.name+'\u201d is already an ingredient \u2014 pick another name.')
        : 'Enter an ingredient name.'; ke.style.display='block'; }
      return;
    }
    var renamed=(chk.name!==k.name), moved=(pid!==k.pid);
    if(!renamed && !moved){ closeKingModal(); return; }              // clean no-op: no write, no toast, no confirm
    var oldP=byId[k.pid];
    var g=kingRepointGuard(oldP?oldP.base_unit:null, np.base_unit);  // ITEM 5 (v35): one guard, shared with the invoice repoint path
    var commit=function(){ var oldPid=k.pid; k.name=chk.name; k.pid=pid;
      if(moved) parkRepointedProduct(oldPid);   // v55 §H: a repointed-away product is auto-parked in the wizard's "Skipped (N)" list, not re-proposed as unlinked
      saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab();
      toast(moved?(renamed?'Ingredient updated':'Product changed'):'Ingredient renamed'); };
    if(moved && g.needsConfirm){                                     // the guard belongs to the PRODUCT change — a rename alone can never change how anything is measured, so it must not fire here
      closeKingModal();                                             // close this modal first so the confirm sits cleanly on top
      askConfirm('Different unit type',
        '\u201c'+chk.name+'\u201d is measured per '+unitCatWord(g.oldCat)+' but the new product is per '+unitCatWord(g.newCat)+'. Recipe amounts keep their numbers but change meaning \u2014 check any recipe that uses it.',
        'Change anyway', commit);
      return;
    }
    commit(); closeKingModal(); return;
  }
  // create flow
  var id=nextKid();
  kitchenIngredients.push({id:id, name:name, pid:pid});
  saveKitchenIngredients(); renderKitchenPanel();
  var toPlate=kingAddToPlateOnSave; kingAddToPlateOnSave=false;
  closeKingModal(); toast('\u201c'+name+'\u201d added');
  if(toPlate && typeof addKitchenLine==='function'){ addKitchenLine(id); }   // create-from-builder: drop it straight onto the plate
  else rerenderCurrentTab();
}
function deleteKitchenIngredient(kid){
  var k=kById[kid]; if(!k) return;
  var used=(savedPlates||[]).filter(function(sp){ return (sp.lines||[]).some(function(l){ return l&&l.kid===kid; }); }).length;
  var msg='Remove \u201c'+(k.name||'this ingredient')+'\u201d?';
  if(used) msg+=' It\u2019s used in '+used+' saved plate'+(used===1?'':'s')+' \u2014 those lines will show as \u201cproduct missing\u201d until you point them somewhere else.';
  askConfirm('Remove ingredient?', msg, 'Remove', function(){
    kitchenIngredients=kitchenIngredients.filter(function(x){return x.id!==kid;});
    saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab(); toast('Ingredient removed');
  });
}
(function(){
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  on('kingNew',function(){ openKingModal(null); });
  on('kingWizBtn',toggleKingWizard);
  on('kingWizClose',closeKingWizard);                                // v61 item 4: the × closes the wizard modal
  (function(){ var kwm=document.getElementById('kingWizModal'); if(!kwm) return;
    kwm.addEventListener('mousedown',function(e){ if(e.target===kwm) closeKingWizard(); });   // backdrop tap closes (skips are already persisted — no data loss)
    document.addEventListener('keydown',function(e){ if(e.key==='Escape' && kwm.classList.contains('open')) closeKingWizard(); }); })();
  var _goHome=function(){ showTab('dashboard'); };   // v39: the logo is the way home
  ['brandHome','sideBrandHome'].forEach(function(id){   // header logo (mobile) + sidebar logo (desktop >=1024px) — one is always the visible one
    var el=document.getElementById(id); if(!el) return;
    el.addEventListener('click',_goHome);
    el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); _goHome(); } });
  });
  var ks=document.getElementById('kingSearch'), kc=document.getElementById('kingSearchClear');
  if(ks){ ks.addEventListener('input',function(){                     // ITEM 3 (v35)
    kingQuery=ks.value||'';
    // v61 item 4: the wizard is a modal takeover now — it can't coexist with the tab search behind it, so the old "searching closes the wizard" coupling is gone. Opening is explicit; the × closes it.
    renderKitchenPanel();
  });
  ks.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ks.blur(); } }); }   // v37: Enter commits the search (dismisses the keyboard)
  if(kc) kc.addEventListener('click',function(){ if(ks){ ks.value=''; } kingQuery=''; renderKitchenPanel(); if(ks) ks.focus(); });
  var kcf=document.getElementById('kingCatFilter'); if(kcf) kcf.addEventListener('change',renderKitchenPanel);   // v59 item 6a: category filter
  var kclf=document.getElementById('kingClearFilters'); if(kclf) kclf.addEventListener('click',clearIngredientFilters);   // v59: shared clear behaviour
  on('kingModalSave',saveKingModal); on('kingModalCancel',closeKingModal); on('kingModalClose',closeKingModal);
  on('kingModalRemove',function(){ var kid=kingEditId; if(!kid) return; closeKingModal(); deleteKitchenIngredient(kid); });   // v44 item 6b: close first so the used-in-N confirm sits cleanly on top (same pattern as the unit guard)
  var m=document.getElementById('kingModal'); if(m) m.addEventListener('click',function(ev){ if(ev.target===m) closeKingModal(); });
})();

// v60 item 6: ONE shared clear-× wiring pattern. The tab search bars already carry the always-visible ×
// (ms-clear markup); this reaches the two modal SEARCH boxes that lacked it — the product-link search
// and the dish picker. Clears the field, re-runs the search, refocuses. onClear carries the per-box redraw.
function wireSearchClear(inputId, clearId, onClear){
  var inp=document.getElementById(inputId), btn=document.getElementById(clearId);
  if(!inp||!btn) return;
  btn.addEventListener('click',function(){ inp.value=''; if(typeof onClear==='function') onClear(); inp.focus(); });
}
wireSearchClear('king_prod','king_prodClear',function(){ kingChosenPid=null; if(typeof kingSyncSave==='function') kingSyncSave(); if(typeof renderKingProdDrop==='function') renderKingProdDrop(); });
wireSearchClear('ad_search','ad_searchClear',function(){ if(typeof renderDishPicker==='function') renderDishPicker(''); });


/* ============================================================
   Feature 2 — Dashboard
   ============================================================ */
function monthKey(d){ d=new Date(d); return d.getFullYear()+'-'+(d.getMonth()+1); }
function avgOf(arr){ return arr.length? arr.reduce(function(a,b){return a+b;},0)/arr.length : null; }
function histInRange(fromTs, toTs){ return priceHistory.filter(function(h){ var t=new Date(h.t).getTime(); return t>=fromTs && t<toTs; }).map(function(h){return h.v;}); }
function dashComparisons(){
  var now=new Date();
  var current=computeAvgFoodCost();
  if(current==null && priceHistory.length) current=priceHistory[priceHistory.length-1].v;
  var startThisMonth=new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  var startLastMonth=new Date(now.getFullYear(), now.getMonth()-1, 1).getTime();
  var lastMonth=avgOf(histInRange(startLastMonth, startThisMonth));
  var lastWeek=avgOf(histInRange(Date.now()-7*86400000, Date.now()+1));
  var startYear=new Date(now.getFullYear(),0,1).getTime();
  var ytd=avgOf(histInRange(startYear, Date.now()+1));
  if(ytd==null) ytd=current;
  return {current:current, lastMonth:lastMonth, lastWeek:lastWeek, ytd:ytd};
}
function statCard(label, current, base){
  var cur=(current==null)?'\u2014':current.toFixed(1)+'%';
  var sub, nums='', cls='flat', arrow='\u2192';
  if(current==null||base==null){ sub='not enough history yet'; }
  else { var d=current-base;                                   // food cost down = good
    nums='Today '+current.toFixed(1)+'% \u00b7 '+label+' avg '+base.toFixed(1)+'%';
    if(Math.abs(d)<0.05){ sub='same \u2014 costs holding steady'; }
    else if(d<0){ cls='good'; arrow='\u2193'; sub=Math.abs(d).toFixed(1)+' pts lower \u2014 costs improving'; }
    else { cls='bad'; arrow='\u2191'; sub=d.toFixed(1)+' pts higher \u2014 costs creeping up'; }
  }
  return '<span class="stat-bit"><span class="stat-h">vs '+esc(label.toLowerCase())+'</span> <b class="stat-arrow '+cls+'">'+arrow+'</b> <span class="stat-sub '+cls+'">'+esc(sub)+'</span></span>';
}
/* ===== v47: trend-chart rebuild (Collectr feel, EzPlate skin) \u2014 helpers ===== */
/* Monotone cubic tangents (Fritsch\u2013Carlson). Clamped so the curve NEVER overshoots a real
   reading \u2014 between two points it stays inside their value range, so it can't dip below 0
   or invent peaks between readings. The SAME tangents feed the path builder AND the scrub
   evaluator, so the riding dot follows exactly the curve that is drawn. */
function tcTangents(xs,ys){
  var n=xs.length, m=new Array(n), d=new Array(Math.max(0,n-1)), i;
  if(n<2){ if(n) m[0]=0; return m; }
  for(i=0;i<n-1;i++) d[i]=(ys[i+1]-ys[i])/(xs[i+1]-xs[i]);
  m[0]=d[0]; m[n-1]=d[n-2];
  for(i=1;i<n-1;i++) m[i]=(d[i-1]*d[i]<=0)?0:(d[i-1]+d[i])/2;   // tangent 0 at local extrema
  for(i=0;i<n-1;i++){
    if(!d[i]){ m[i]=0; m[i+1]=0; continue; }
    var a=m[i]/d[i], b=m[i+1]/d[i], s=a*a+b*b;
    if(s>9){ var t=3/Math.sqrt(s); m[i]=t*a*d[i]; m[i+1]=t*b*d[i]; }   // the monotonicity clamp
  }
  return m;
}
function tcPath(xs,ys,m){                                        // Hermite -> cubic beziers (controls at +/- h/3 along tangents)
  var p='M'+xs[0].toFixed(1)+' '+ys[0].toFixed(1);
  for(var i=0;i<xs.length-1;i++){
    var h=xs[i+1]-xs[i];
    p+=' C'+(xs[i]+h/3).toFixed(1)+' '+(ys[i]+m[i]*h/3).toFixed(1)
      +' '+(xs[i+1]-h/3).toFixed(1)+' '+(ys[i+1]-m[i+1]*h/3).toFixed(1)
      +' '+xs[i+1].toFixed(1)+' '+ys[i+1].toFixed(1);
  }
  return p;
}
function tcYAt(xs,ys,m,px){                                      // cubic Hermite eval on the same tangents (the scrub dot rides THIS)
  var n=xs.length;
  if(px<=xs[0]) return ys[0];
  if(px>=xs[n-1]) return ys[n-1];
  var i=0; while(i<n-2 && px>xs[i+1]) i++;
  var h=xs[i+1]-xs[i], t=(px-xs[i])/h, t2=t*t, t3=t2*t;
  return (2*t3-3*t2+1)*ys[i]+(t3-2*t2+t)*h*m[i]+(3*t2-2*t3)*ys[i+1]+(t3-t2)*h*m[i+1];
}
function tcTicks(target,mn,mx){                                  // v48: 3\u20134 y-axis values ANCHORED ON the target
  /* HARD REQUIREMENT (v48 patch): the dashed target line must always sit on a labelled tick \u2014
     that's the entire basis for the line carrying no word of its own. So the sequence is built
     FROM the target (target \u00b1 k\u00b7step) and extended until it covers the data, never generated
     independently and hoped onto it. Integer-biased steps (no 0.5/2.5) keep labels 3\u20134 chars
     unless the user's own target is decimal. Assumes mn <= target <= mx (callers concat the
     target into the domain values first). */
  var steps=[1,2,5,10,20,50], si=0, i;
  var raw=(mx-mn)/3;
  for(i=0;i<steps.length;i++){ si=i; if(steps[i]>=raw) break; }
  var build=function(step){
    var lo=target-Math.ceil((target-mn)/step)*step;
    var hi=target+Math.ceil((mx-target)/step)*step;
    while(lo<0) lo+=step;                                        // %-of-sales axis: never label below zero
    var out=[]; for(var v=lo; v<=hi+1e-9; v+=step) out.push(+v.toFixed(1));
    return out;
  };
  var out=build(steps[si]);
  while(out.length>4 && si<steps.length-1){ si++; out=build(steps[si]); }   // widen the step, never thin \u2014 filtering could drop the target tick
  while(out.length<3){                                           // step bigger than the whole span: pad outward, target stays in the set
    var st=steps[si], lo2=out[0], hi2=out[out.length-1];
    if(lo2-st>=0) out.unshift(+(lo2-st).toFixed(1)); else out.push(+(hi2+st).toFixed(1));
  }
  return out;
}
/* v60 item 1b (ZOOM): the y-domain now fits the DATA, not the target. Margins move 1-2 pts at a time;
   a domain stretched to always reach a distant target flattened that movement into noise. niceStep/niceTicks
   generate 3-4 round ticks over the data extent WITHOUT anchoring on the target, so the visible band is only
   as tall as the readings need. The target line is drawn only when it falls inside the domain (or within one
   tick of it), and THEN tcTicks' "target sits on a labelled tick" rule still governs (see trendChart); when
   the target is far away it becomes a small edge annotation instead of dragging the whole axis to meet it.
   This SUPERSEDES v48's always-include-target domain rule (tcTicks itself is unchanged). */
var TICK_STEPS=[1,2,5,10,20,50];
function niceStep(raw){ for(var i=0;i<TICK_STEPS.length;i++){ if(TICK_STEPS[i]>=raw) return TICK_STEPS[i]; } return TICK_STEPS[TICK_STEPS.length-1]; }
function niceTicks(mn,mx){                                        // 3-4 round ticks covering [mn,mx], not anchored on any value
  var si=TICK_STEPS.indexOf(niceStep((mx-mn)/3));
  var build=function(step){ var lo=Math.floor(mn/step)*step; if(lo<0) lo=0; var hi=Math.ceil(mx/step)*step;
    var out=[]; for(var v=lo; v<=hi+1e-9; v+=step) out.push(+v.toFixed(1)); return out; };
  var out=build(TICK_STEPS[si]);
  while(out.length>4 && si<TICK_STEPS.length-1){ si++; out=build(TICK_STEPS[si]); }   // widen the step until 4 or fewer labels
  while(out.length<3){                                            // step bigger than the whole span: pad outward
    var st=TICK_STEPS[si], lo2=out[0], hi2=out[out.length-1];
    if(lo2-st>=0) out.unshift(+(lo2-st).toFixed(1)); else out.push(+(hi2+st).toFixed(1));
  }
  return out;
}
function targetInView(target,dmn,dmx,step){ return target>=dmn-step && target<=dmx+step; }   // shown when inside, or within one tick
var TREND_GEO=null;   // geometry handoff trendChart -> wireTrendScrub (same render pass; null when the chart is empty)
var AX_CHW=0;         // measured advance of one glyph of the 11px mono axis font (mono: all glyphs equal) — cached once
function axCharW(){
  if(AX_CHW) return AX_CHW;
  try{
    var mono=(getComputedStyle(document.documentElement).getPropertyValue('--mono')||'monospace').trim();
    var ctx=document.createElement('canvas').getContext('2d');
    ctx.font='11px '+mono;
    AX_CHW=ctx.measureText('0').width||6.6;
  }catch(e){ AX_CHW=6.6; }                                       // no canvas (jsdom): a Menlo-ish estimate
  return AX_CHW;
}
function trendChart(){
  var pts=dashRangePts();
  /* v52 GUTTER GEOMETRY — v51 removed the left gutter so the curve could start at the card's
     text column, but that drew the plot (fill dots, line) UNDERNEATH the y-axis labels (Max's
     screenshot: dots surrounding "10%"). The structural fix: ONE gutter constant that every
     plot element respects. plotLeft = padL = widest tick label (measured in the real 11px mono,
     axCharW) + 8px gap; labels sit INSIDE the gutter, right-aligned to plotLeft-8, so the widest
     label's LEFT edge lands at x=0 = the title/caption/stats column, digits sit flush as a
     column, and ZERO plot pixels (fill, line, dots, target line, crosshair) render left of
     plotLeft. v48 invariants preserved: geometry constant across ranges (labels are "NN%" =
     same glyph count for any 2-digit percent, so the measured gutter can't vary between
     ranges), labels vertically CENTRED on their value so the target tick sits exactly on the
     dashed rule (pinned by fresh-states.spec.js). */
  var W=320,H=210,padR=10,padT=14,padB=20;
  TREND_GEO=null;
  if(pts.length<2){                                              // 0 or 1 point: the empty-state card (unchanged); scrub wiring bails on TREND_GEO
    var emptyHint=(priceHistory.length>=2)
      ? 'No points in this range yet \u2014 try a longer range.'
      : 'The trend needs at least two logged points. A point is recorded only when a menu item is linked to a costed plate (so an average food cost exists) and a price then changes. Link a plate to a menu item, then update a price, to start the line.';
    return '<div class="dash-chart empty"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Food cost trend"></svg>'
      +'<p class="hint chart-hint">'+emptyHint+'</p></div>';
  }
  /* v60 item 1b: the DOMAIN fits the DATA (target excluded), so small margin moves read as movement.
     A minimum span (~5 pts, centred) stops a flat window from magnifying 0.x-pt noise. Ticks derive from
     the domain: when the target is in view we keep v48's target-on-a-tick generator (extended to cover
     both data and target); when it's far away we use plain round ticks over the data and annotate the
     target at the edge instead of stretching the axis to reach it. Domain = tick extent ± half a step,
     so headroom stays consistent in tick units and similar ranges can't jitter. */
  var dvals=pts.map(function(p){return p.v;});
  var dmn=Math.min.apply(null,dvals), dmx=Math.max.apply(null,dvals);
  var span=dmx-dmn;
  if(span<5){ var midY=(dmn+dmx)/2; dmn=midY-2.5; dmx=midY+2.5; }   // minimum ~5-pt window
  if(dmn<0) dmn=0;
  var probeStep=niceStep((dmx-dmn)/3);
  var targetShown=targetInView(cogsPct, dmn, dmx, probeStep);
  var ticks = targetShown ? tcTicks(cogsPct, Math.min(dmn,cogsPct), Math.max(dmx,cogsPct)) : niceTicks(dmn, dmx);
  var step=ticks.length>1?ticks[1]-ticks[0]:5;
  var mn=Math.max(0,ticks[0]-step/2), mx=ticks[ticks.length-1]+step/2;
  var fmtTick=function(v){ return (v%1?v.toFixed(1):v.toFixed(0))+'%'; };
  // v52: the label gutter — sized to the widest tick label so a wide label ("32.5%" from a
  // decimal target) widens the gutter instead of clipping at the svg edge (the v48 bug)
  var axGap=8, maxCh=Math.max.apply(null,ticks.map(function(v){ return fmtTick(v).length; }));
  var padL=Math.ceil(maxCh*axCharW()+axGap);
  var x=function(i){ return padL+(W-padL-padR)*(pts.length===1?0.5:i/(pts.length-1)); };
  var y=function(v){ return padT+(H-padT-padB)*(1-(v-mn)/(mx-mn)); };
  var xs=[], ys=[];
  pts.forEach(function(p,i){ xs.push(x(i)); ys.push(y(p.v)); });
  var tan=tcTangents(xs,ys);
  var d=tcPath(xs,ys,tan);                                       // v47: smooth monotone curve (was straight polyline segments)
  var trendUp=pts[pts.length-1].v > pts[0].v + 0.05;
  var trendDown=pts[pts.length-1].v < pts[0].v - 0.05;
  var stroke=trendUp?'var(--bad)':trendDown?'var(--good)':'var(--muted2)';   // semantic: green = improving, red = worsening — never change
  // v61 item 6 (SUPERSEDES v60's edge-annotation half): the dashed target rule renders only when the target
  // is inside the domain (or within one tick, per targetInView). When it's outside, NOTHING is drawn — no edge
  // marker, no arrow. The user knows their own target; the line's only job is to warn as costs approach it.
  var refLine='';
  if(targetShown){
    var refY=y(cogsPct).toFixed(1);
    refLine='<line class="ref-line" x1="'+padL+'" y1="'+refY+'" x2="'+(W-padR)+'" y2="'+refY+'" stroke="var(--muted2)" stroke-dasharray="4 4" stroke-width="1"/>';
  }
  var area=d+' L'+xs[xs.length-1].toFixed(1)+' '+(H-padB)+' L'+xs[0].toFixed(1)+' '+(H-padB)+' Z';
  var showPts=pts.length<=32;                                    // v47: reading dots on sparse data only — a real reading must be tellable from interpolation, but 60 dots is noise
  // the static drawing, duplicated into a bright and a dim group; scrubbing only moves the clip split
  var drawing='<path d="'+area+'" fill="url(#tcdots)"/>'
    +'<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    +(showPts?pts.map(function(p,i){ return '<circle class="tc-pt" cx="'+xs[i].toFixed(1)+'" cy="'+ys[i].toFixed(1)+'" r="2.6" fill="'+stroke+'"/>'; }).join(''):'');
  // v52: labels live INSIDE the gutter, right-aligned to plotLeft-8 so the digits sit flush as a
  // column whatever each label's width; the gutter is sized to the widest label (see padL above)
  // so the widest label's left edge = x0 = the title/caption column. Vertically CENTRED on their
  // value so the target tick sits exactly on the dashed rule (v48 invariant, pinned).
  var axis=ticks.map(function(v){ return '<text class="ax" x="'+(padL-axGap)+'" y="'+(y(v)+3.5).toFixed(1)+'" text-anchor="end">'+fmtTick(v)+'</text>'; }).join('');
  var trendWord=trendUp?'trending up (food cost rising)':trendDown?'trending down (margins improving)':'holding steady';
  var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" tabindex="0" aria-label="Average food cost trend, '+trendWord+'. Use the left and right arrow keys to step through readings.">'
    +'<defs>'
    +'<pattern id="tcdots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r="1.1" fill="'+stroke+'" opacity="0.28"/></pattern>'   // dotted fill inherits the semantic colour + both themes via the CSS var
    +'<clipPath id="tcClipB"><rect id="tcRectB" x="0" y="0" width="'+W+'" height="'+H+'"/></clipPath>'
    +'<clipPath id="tcClipD"><rect id="tcRectD" x="'+W+'" y="0" width="0" height="'+H+'"/></clipPath>'
    +'</defs>'
    +refLine   // v60 item 1b: present only when the target is inside the domain
    +'<g clip-path="url(#tcClipB)">'+drawing+'</g>'
    +'<g clip-path="url(#tcClipD)" opacity="0.35">'+drawing+'</g>'
    +axis   // v48: the "Target" word is gone (Max's call) — the dashed line lands exactly on the axis tick labelled with the user's own target number, so it explains itself
    +'<line id="tcCross" x1="0" x2="0" y1="'+padT+'" y2="'+(H-padB)+'" stroke="var(--muted2)" stroke-width="1" stroke-dasharray="2 3" visibility="hidden"/>'
    +'<circle id="tcDot" r="4" fill="'+stroke+'" stroke="var(--surface)" stroke-width="1.5" visibility="hidden"/>'
    +'</svg>';
  TREND_GEO={xs:xs, ys:ys, tan:tan, pts:pts, W:W, H:H, padL:padL, padR:padR, padT:padT, padB:padB};
  return '<div class="dash-chart" id="trendWrap">'+svg
    +'<div class="tp-tip" id="trendTip" aria-hidden="true"></div>'
    +'<p class="hint chart-hint">Average food cost across the menu \u2014 '+trendWord+'.</p></div>';   // v47: "Tap a point for its date" dropped — the scrub interaction teaches itself
}
function highlightData(kind){
  if(kind==='foodcost'){
    var rows=[];
    MENU.forEach(function(m){ if(!(m.price>0))return; var sp=plateForMenuItem(m); if(!sp)return; var c=costFromLines(sp.lines); if(c>0) rows.push({name:m.name, val:c/m.price*100, disp:(c/m.price*100).toFixed(1)+'%'}); });
    rows.sort(function(a,b){return b.val-a.val;}); return {title:'Highest food cost %', rows:rows};
  }
  if(kind==='portion'){
    var pr=[];
    savedPlates.forEach(function(sp){ var c=costFromLines(sp.lines); if(c>0){ pr.push({name:sp.name||'Plate', val:c, disp:fmt2(c)}); } });
    pr.sort(function(a,b){return b.val-a.val;}); return {title:'Highest portion cost', rows:pr};
  }
  var usedPids={};                                                  // only stock actually used in a saved plate/recipe
  (savedPlates||[]).forEach(function(sp){ (sp.lines||[]).forEach(function(l){ if(!l||l.misc) return; if(l.kid){ var k=kById[l.kid]; if(k&&k.pid!=null) usedPids[k.pid]=true; } else if(l.pid!=null) usedPids[l.pid]=true; }); });
  var st=PRODUCTS.filter(function(p){ return usedPids[p.id]; }).map(function(p){ var v=perDisplayValue(p); return v==null?null:{name:p.description+(p.brand?' \u2014 '+p.brand:''), val:v, disp:dispPrice(p)}; }).filter(Boolean);
  st.sort(function(a,b){return b.val-a.val;}); return {title:'Most expensive stock per unit', rows:st};
}
function highlightCard(kind, heading){
  var d=highlightData(kind), top=d.rows.slice(0,3);
  var body=top.length? top.map(function(r){return '<li><span class="hl-n">'+esc(r.name)+'</span><span class="hl-v">'+esc(r.disp)+'</span></li>';}).join('') : '<li class="muted">No costed items yet</li>';
  return '<button class="hl-card" type="button" data-kind="'+kind+'"><div class="hl-head">'+esc(heading)+'</div><ul class="hl-list">'+body+'</ul>'
    +(d.rows.length>3?'<div class="hl-more">Tap to see all '+d.rows.length+'</div>':'')+'</button>';
}
function openHighlight(kind){
  var d=highlightData(kind);
  document.getElementById('hlTitle').textContent=d.title;
  var body=document.getElementById('hlBody');
  body.innerHTML = d.rows.length? '<ol class="hl-full">'+d.rows.map(function(r){return '<li><span class="hl-n">'+esc(r.name)+'</span><span class="hl-v">'+esc(r.disp)+'</span></li>';}).join('')+'</ol>' : '<p class="muted" style="padding:12px">No costed items yet.</p>';
  show('hlModal');
}
/* =====================================================================================
   AI-assisted helper, built as GROUNDED INSIGHTS (not a chatbot). v63 shipped the first,
   single-shape version (over-target → reprice); v67 (item 5) BROADENS it into several
   insight TYPES so the list reads varied and smart, and MOVES it from the Dashboard onto
   the Menu tab (menu-specific — one menu's dishes at a time).
   Hard law unchanged: the app computes EVERY number deterministically here; the AI (optional
   layer below) may only rephrase the SAME sentence and is forbidden to produce a figure.
   The whole engine ships and is useful with NO API call.

   Each insight TYPE is a pure function (tests pin them) returning zero+ candidates of the
   shape {kind, facts, text, score}: `facts` holds every number, `text` is the ready template,
   `score` is how notable it is. selectInsights ranks by score, enforces type VARIETY (≤1 per
   kind in the diverse pass) and ROTATES the near-top group by a per-render seed so the list
   stops always leading with the same over-target dish. deriveInsights orchestrates; the impure
   computeInsights builds the data bundle from the CURRENT menu's live dishes.
   ===================================================================================== */
function insTargetPrice(cost, targetFrac){ return Math.ceil((cost/targetFrac)*2)/2; }   // price that hits target, rounded UP to the nearest $0.50
var CUT_PTS=12;   // v69: a dish this far over target is an insCut candidate (rework/drop), not a routine reprice

// TYPE: reprice — a dish over target where a price nudge closes the gap. v69: DEMOTED to the last-resort lever
// (Max reprices rarely — reprinting menus is expensive), so its score sits below the cheaper levers (portion,
// substitution, shared-ingredient) and its copy frames price as the fallback if a rework can't close the gap.
// Extreme dishes (>= CUT_PTS over) belong to insCut, not here.
function insReprice(dishes, targetFrac){
  var out=[], tp=Math.round(targetFrac*100);
  dishes.forEach(function(d){
    if(!(d.cost>0)||!(d.menuPrice>0)) return;
    var pts=Math.round((d.cost/d.menuPrice - targetFrac)*100);
    if(pts<1 || pts>=CUT_PTS) return;
    var target=insTargetPrice(d.cost, targetFrac);
    out.push({kind:'reprice', score:Math.min(60, 22+pts*2),
      facts:{name:d.name, pts:pts, menuPrice:d.menuPrice, targetPrice:target, targetPct:tp},
      text:d.name+' sits '+pts+' pt'+(pts===1?'':'s')+' over at $'+d.menuPrice.toFixed(2)+' — if a rework can’t close it, $'+target.toFixed(2)+' would bring it to '+tp+'%.'});
  });
  return out.sort(function(a,b){ return b.facts.pts-a.facts.pts; });
}
// TYPE: near-miss — a dish only ~1 pt over: a low-effort win worth calling out on its own.
function insNearMiss(dishes, targetFrac){
  var tp=Math.round(targetFrac*100), best=null;
  dishes.forEach(function(d){
    if(best || !(d.cost>0)||!(d.menuPrice>0)) return;
    var pts=Math.round((d.cost/d.menuPrice - targetFrac)*100);
    if(pts!==1) return;
    var target=insTargetPrice(d.cost, targetFrac);
    best={kind:'nearmiss', score:48,
      facts:{name:d.name, pts:pts, menuPrice:d.menuPrice, targetPrice:target, targetPct:tp},
      text:d.name+' is a whisker over — a nudge from $'+d.menuPrice.toFixed(2)+' to $'+target.toFixed(2)+' puts it on target.'};
  });
  return best?[best]:[];
}
// TYPE: volatility — a dish whose cost swings with a volatile ingredient (uses the logged price ranges).
function insVolatility(dishes){
  var best=null, bestSpread=0;
  dishes.forEach(function(d){
    if(!d.hasRange || !(d.cost>0)) return;
    var lo=d.costMin, hi=d.costMax; if(!(hi>lo)) return;
    var spreadPct=(hi-lo)/d.cost*100;
    if(spreadPct>bestSpread){ bestSpread=spreadPct;
      best={kind:'volatility', score:Math.min(92, 35+spreadPct),
        facts:{name:d.name, costMin:Math.round(lo*100)/100, costMax:Math.round(hi*100)/100},
        text:d.name+' cost has ranged $'+lo.toFixed(2)+'–$'+hi.toFixed(2)+' with '+(d.volatileIng||'ingredient')+' prices — watch it even when today looks fine.'};
    }
  });
  return best?[best]:[];
}
// TYPE: shared-ingredient leverage — an ingredient across many of this menu's dishes; a better price moves more than one reprice.
function insShared(shared){
  if(!shared || !shared.length) return [];
  var s=shared.slice().sort(function(a,b){ return b.dishCount-a.dishCount; })[0];
  if(!s || s.dishCount<2) return [];
  return [{kind:'shared', score:Math.min(80, 30+s.dishCount*5),
    facts:{name:s.name, dishCount:s.dishCount},
    text:s.name+' is in '+s.dishCount+' dishes here — a better price or supplier on it moves more than any single reprice.'}];
}
// TYPE: biggest mover — the ingredient whose logged price changed most, and how many of this menu's dishes it feeds.
function insMover(mover){
  if(!mover || !(Math.abs(mover.pct)>=3)) return [];
  var up=mover.pct>0, n=(mover.dishes&&mover.dishes.length)||0, pct=Math.abs(Math.round(mover.pct));
  return [{kind:'mover', score:Math.min(88, 40+Math.abs(mover.pct)),
    facts:{name:mover.name, pct:pct, dishCount:n},
    text:mover.name+' just '+(up?'rose':'fell')+' '+pct+'% — it feeds '+n+' dish'+(n===1?'':'es')+' on this menu'+(up?', so recheck their margins.':', a chance to bank the saving.')}];
}
// TYPE: best performer — a positive: a dish sitting comfortably under target (not everything is a warning).
function insBest(dishes, targetFrac){
  var tp=Math.round(targetFrac*100), best=null, bestUnder=0;
  dishes.forEach(function(d){
    if(!(d.cost>0)||!(d.menuPrice>0)) return;
    var pts=Math.round((d.cost/d.menuPrice - targetFrac)*100);       // negative = under target
    var under=-pts;
    if(under>=3 && under>bestUnder){ bestUnder=under;
      best={kind:'best', score:28+Math.min(18, under),
        facts:{name:d.name, pts:pts, menuPrice:d.menuPrice, targetPct:tp},
        text:d.name+' is pulling a strong margin — '+under+' pt'+(under===1?'':'s')+' under your '+tp+'% target at $'+d.menuPrice.toFixed(2)+'.'};
    }
  });
  return best?[best]:[];
}
// TYPE: summary — always-available filler so the panel never renders empty when there IS data: the over/under count.
function insSummary(dishes, targetFrac){
  var tp=Math.round(targetFrac*100), total=dishes.length;
  var over=dishes.filter(function(d){ return d.cost>0 && d.menuPrice>0 && Math.round((d.cost/d.menuPrice-targetFrac)*100)>=1; }).length;
  if(over) return [{kind:'count', score:22, facts:{over:over, total:total, targetPct:tp},
    text:over+' of '+total+' costed dish'+(total===1?'':'es')+' sit over your '+tp+'% target.'}];
  return [{kind:'allgood', score:26, facts:{total:total, targetPct:tp},
    text:'All '+total+' costed dish'+(total===1?'':'es')+' are at or under your '+tp+'% target — the menu’s healthy.'}];
}
// TYPE: portion / spec — a dish leaning heavily on ONE costly ingredient. Trimming that portion saves money
// with NO price change (Max's cheapest lever). Each dish carries `top` = {name, share, trimPct, saving},
// precomputed by computeInsights from the plate lines; this pure fn picks the most lopsided plate.
function insPortion(dishes){
  var best=null, bestShare=0;
  dishes.forEach(function(d){
    var t=d.top; if(!t || !(t.saving>0) || !(t.share>=0.45)) return;   // one ingredient must dominate the plate cost
    if(t.share>bestShare){ bestShare=t.share;
      var pct=Math.round(t.share*100), sv=Math.round(t.saving*100)/100;
      best={kind:'portion', score:Math.min(90, 50+Math.round((t.share-0.45)*100)),
        facts:{name:d.name, ing:t.name, sharePct:pct, saving:sv, trimPct:t.trimPct},
        text:t.name+' is '+pct+'% of '+d.name+'’s cost — a '+t.trimPct+'% smaller portion saves about $'+sv.toFixed(2)+' a plate, no price change.'};
    }
  });
  return best?[best]:[];
}
// TYPE: cheaper input / substitution — a same-category product in Products undercuts one this menu leans on.
// computeInsights builds `subs` (only where a real cheaper in-category product exists); this fn picks the
// biggest saving. Swapping the linked product once updates every recipe, so it beats any single reprice.
function insSub(subs){
  if(!subs || !subs.length) return [];
  var s=subs.slice().sort(function(a,b){ return b.saving-a.saving; })[0];
  if(!s || !(s.saving>0)) return [];
  var sv=Math.round(s.saving*100)/100;
  return [{kind:'sub', score:Math.min(92, 48+Math.round(sv*4)),
    facts:{ing:s.ing, curPer:s.curPer, altPer:s.altPer, plateCount:s.plateCount, saving:sv},
    text:'You buy '+s.ing+' at $'+s.curPer.toFixed(2)+'/'+s.unit+'; '+s.altName+' is $'+s.altPer.toFixed(2)+'/'+s.unit+' — swapping saves about $'+sv.toFixed(2)+' across '+s.plateCount+' plate'+(s.plateCount===1?'':'s')+'.'}];
}
// TYPE: cut — a dish so far over target that repricing alone is a hard ask (would need a big, menu-reprinting
// jump). Flag it to rework the spec or drop it, rather than pretend a price nudge fixes it.
function insCut(dishes, targetFrac){
  var best=null;
  dishes.forEach(function(d){
    if(!(d.cost>0)||!(d.menuPrice>0)) return;
    var pts=Math.round((d.cost/d.menuPrice - targetFrac)*100);
    if(pts<CUT_PTS) return;
    if(!best || pts>best.facts.pts){
      best={kind:'cut', score:Math.min(96, 58+pts), facts:{name:d.name, pts:pts},
        text:d.name+' runs '+pts+' pts over and is hard to reprice cleanly — worth reworking the spec or dropping it.'};
    }
  });
  return best?[best]:[];
}
// Rank by notability, keep type VARIETY (≤1 per kind first), and ROTATE the near-top group by seed
// so equally-notable insights take turns leading across renders/menu-switches. Pure + tested.
function selectInsights(cands, seed, max){
  max=max||3; seed=seed||0;
  var sorted=cands.map(function(c,i){ return {c:c,i:i}; })
    .sort(function(a,b){ return (b.c.score-a.c.score) || (a.i-b.i); })
    .map(function(x){ return x.c; });
  if(sorted.length>1){                                              // rotate only the near-top (similarly notable) group
    var BAND=12, top=sorted[0].score, g=0;
    while(g<sorted.length && sorted[g].score>=top-BAND) g++;
    if(g>1){ var off=((seed%g)+g)%g; sorted=sorted.slice(off,g).concat(sorted.slice(0,off)).concat(sorted.slice(g)); }
  }
  var out=[], kinds={};
  for(var i=0;i<sorted.length && out.length<max;i++){ var k=sorted[i].kind; if(kinds[k]) continue; kinds[k]=1; out.push(sorted[i]); }   // diverse pass: ≤1 per kind
  for(var j=0;j<sorted.length && out.length<max;j++){ if(out.indexOf(sorted[j])<0) out.push(sorted[j]); }                                // fill pass: only if still short
  return out;
}
/* PURE orchestrator (tests pin it). data = {dishes, shared, mover}; a bare array is treated as
   {dishes}. Returns the chosen 2–3 insights as {kind, facts, text} (internal score stripped). */
function deriveInsights(data, targetFrac, seed){
  if(Array.isArray(data)) data={dishes:data};
  data=data||{};
  var dishes=Array.isArray(data.dishes)?data.dishes:[];
  if(!(targetFrac>0)) return [];
  var costed=dishes.filter(function(d){ return d && d.cost>0 && d.menuPrice>0; });   // published + costed only
  if(!costed.length) return [];                                     // nothing useful to say → the area hides
  var cands=[]
    .concat(insPortion(costed))                                       // v69: cheaper levers first — Max reprices rarely
    .concat(insSub(data.subs||[]))
    .concat(insCut(costed, targetFrac))
    .concat(insReprice(costed, targetFrac))
    .concat(insNearMiss(costed, targetFrac))
    .concat(insVolatility(costed))
    .concat(insShared(data.shared||[]))
    .concat(insMover(data.mover||null))
    .concat(insBest(costed, targetFrac))
    .concat(insSummary(costed, targetFrac));
  return selectInsights(cands, seed||0, 3).map(function(c){ return {kind:c.kind, facts:c.facts, text:c.text}; });
}
/* Impure wrapper: build the data bundle from the CURRENTLY SELECTED menu's live dishes and derive.
   v67 item 5a: menu-scoped (was all-menus on the Dashboard). Draws cost ranges from costRangeForLines,
   shared-ingredient counts from kitchen-word usage, and the biggest mover from the per-ingredient price
   log (ingPriceLog) — all numbers the app already computes. */
var gemInsightPhrased=null;                                         // in-render guard: {key, lines:[text], refined} (key = menuId|sig)
/* v69 (Max): insights + their Gemini phrasing are CACHED per menu for a PERIOD, then rotate. This (a) saves
   the limited Gemini quota — no re-call on every reload/session within the period — and (b) refreshes what the
   user sees afterwards. The period index also seeds the selection (varied per menu), so each new period leads
   with a different insight. A price change mid-period changes the sig → a fresh call (the insight genuinely
   changed); otherwise one call per menu per period. */
var INSIGHT_PERIOD_MS=24*60*60*1000;                               // one day
function insightPeriod(){ return Math.floor(Date.now()/INSIGHT_PERIOD_MS); }
function menuSeedHash(id){ var h=0, s=String(id||''); for(var i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return h; }
function insightSeedFor(menuId){ return (insightPeriod()+menuSeedHash(menuId))|0; }   // stable within a period (so it caches), rotates across periods, varies per menu
function computeInsights(seed){
  var dishes=[], usage={}, nameByPid={}, dishNamesByPid={}, prodUse={};
  try{
    (typeof MENU!=='undefined'?MENU:[]).forEach(function(m){
      if(!m || !(m.price>0)) return;
      if((m.menuId||'MENU_ORIGINAL')!==currentMenuId) return;       // v67 5a: the SELECTED menu only
      var sp=plateForMenuItem(m); if(!sp) return;
      var cost=costFromLines(sp.lines); if(!(cost>0)) return;
      var range=costRangeForLines(sp.lines);
      var volName=null, volSpread=0, seen={};
      var topCost=0, topName=null;                                   // v69: costliest ingredient line → portion insight
      (sp.lines||[]).forEach(function(l){
        if(!l || l.misc) return;
        var p=lineProduct(l); if(!p) return;
        var pid=l.kid?(kById[l.kid]&&kById[l.kid].pid):l.pid;
        var nm=l.kid?((kById[l.kid]&&kById[l.kid].name)||p.description):p.description;
        if(nm && !seen[nm]){ seen[nm]=1; usage[nm]=(usage[nm]||0)+1; }   // distinct dishes per kitchen ingredient
        var lc=lineCost(p, l.qty); if(lc!=null && lc>topCost){ topCost=lc; topName=nm; }
        if(pid){
          nameByPid[pid]=nm;
          (dishNamesByPid[pid]||(dishNamesByPid[pid]=[])).push(m.name);
          var band=ingPriceBand(pid); if(band){ var s=(band.max-band.min)*(l.qty||0); if(s>volSpread){ volSpread=s; volName=nm; } }
          // v69: menu-wide product usage for the substitution insight (qty summed, distinct dishes counted)
          var pu=prodUse[pid]||(prodUse[pid]={prod:p, qty:0, dishes:{}, ing:nm});
          pu.qty+=(l.qty||0); pu.dishes[m.name]=1;
        }
      });
      var top=null;
      if(topName && topCost>0){ var share=topCost/cost; top={name:topName, share:share, trimPct:15, saving:topCost*0.15}; }   // trim ~15% of the costliest portion
      dishes.push({name:m.name, cost:cost, menuPrice:m.price, costMin:range.min, costMax:range.max, hasRange:range.hasRange, volatileIng:volName, top:top});
    });
  }catch(e){ return []; }
  var shared=Object.keys(usage).filter(function(n){ return usage[n]>=2; }).map(function(n){ return {name:n, dishCount:usage[n]}; });
  var subs=[];                                                       // v69: only a conservative same-ingredient cheaper product (subCandidate — never cross foodstuffs)
  try{
    Object.keys(prodUse).forEach(function(pid){
      var pu=prodUse[pid], p=pu.prod; if(!p || cpbu(p)==null) return;
      var alt; try{ alt=subCandidate(p); }catch(e){ return; }
      if(!alt || cpbu(alt)==null || !(cpbu(alt)<cpbu(p))) return;
      var saving=(cpbu(p)-cpbu(alt))*pu.qty; if(!(saving>0)) return;
      subs.push({ing:pu.ing, altName:alt.description, curPer:perDisplayValue(p), altPer:perDisplayValue(alt), unit:displayUnitWord(p), plateCount:Object.keys(pu.dishes).length, saving:saving});
    });
  }catch(e){}
  var mover=null;
  try{
    Object.keys(dishNamesByPid).forEach(function(pid){
      var a=ingPriceLog[pid]; if(!a || a.length<2) return;
      var prev=a[a.length-2].v, last=a[a.length-1].v; if(!(prev>0)) return;
      var pct=(last-prev)/prev*100;
      if(!mover || Math.abs(pct)>Math.abs(mover.pct)){
        var uniq=[], s2={}; dishNamesByPid[pid].forEach(function(dn){ if(!s2[dn]){ s2[dn]=1; uniq.push(dn); } });
        mover={name:nameByPid[pid]||pid, pct:pct, dishes:uniq};
      }
    });
  }catch(e){}
  return deriveInsights({dishes:dishes, shared:shared, mover:mover, subs:subs}, foodTarget(), (seed==null?insightSeedFor(currentMenuId):seed));
}
function insightSig(insights){ return insights.map(function(x){ return x.text; }).join('|'); }
/* Client re-check: the returned phrasing must not contain any number that isn't in the facts
   (defence-in-depth — the server validates too). Rejecting extra numbers is what stops the AI
   from ever presenting a figure the app didn't compute. */
function gemPhrasingOk(text, facts){
  var t=(text==null?'':String(text)).trim(); if(!t || t.length>240) return false;
  var allowed=[]; for(var k in facts){ if(typeof facts[k]==='number') allowed.push(facts[k]); }
  var re=/-?\d+(?:\.\d+)?/g, m;
  while((m=re.exec(t))){
    var v=parseFloat(m[0]), ok=false;
    for(var j=0;j<allowed.length;j++){ if(Math.abs(v-allowed[j])<0.005){ ok=true; break; } }
    if(!ok) return false;
  }
  return true;
}
/* v69: the per-menu, per-period phrasing cache (localStorage). Only SUCCESSFUL phrasings are stored, so
   offline/unavailable never poisons it; stale periods are pruned on write. */
function insightCacheRead(){ try{ return JSON.parse(localStorage.getItem('cafeDB_insightCache')||'{}')||{}; }catch(e){ return {}; } }
function insightCacheWrite(c){ try{ localStorage.setItem('cafeDB_insightCache', JSON.stringify(c)); }catch(e){} }
/* Optional warmer phrasing (degrades to templates). ONE background POST per menu per PERIOD (v69) — a
   cached phrasing for this menu+period+sig is reused with NO new call (saving the limited Gemini quota);
   offline / unavailable / invalid → the deterministic templates stand. Never blocks the render — it swaps
   text in place only if the Menu tab is still showing this set. */
function gemPhraseInsights(insights, menuId){
  if(!insights || !insights.length) return;
  var sig=insightSig(insights), period=insightPeriod(), mk=menuId||'', key=mk+'|'+sig;
  // 1) persistent cache hit: same menu + period + sig → reuse the stored phrasing, no API call
  var cache=insightCacheRead(), ce=cache[mk];
  if(ce && ce.period===period && ce.sig===sig && Array.isArray(ce.lines)){
    gemInsightPhrased={key:key, lines:ce.lines, refined:!!ce.refined};
    applyPhrasedInsights(ce.lines, insights, !!ce.refined); return;
  }
  // 2) in-render guard: don't fire a duplicate fetch before the cache write lands this session
  if(gemInsightPhrased && gemInsightPhrased.key===key){ applyPhrasedInsights(gemInsightPhrased.lines, insights, gemInsightPhrased.refined); return; }
  if(typeof fetch!=='function') return;
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=setTimeout(function(){ if(ctrl) ctrl.abort(); },20000);
  fetch('/api/insight',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({insights:insights.map(function(x){return {facts:x.facts, text:x.text};})}),signal:ctrl?ctrl.signal:undefined})
    .then(function(res){ return res.ok?res.json():null; })
    .then(function(payload){
      clearTimeout(timer);
      if(!payload || payload.status!=='ok' || !Array.isArray(payload.lines)) return;   // invalid → don't cache, retry next render
      var refined=false;                                             // v68: true only if ≥1 shown line is actually Gemini's phrasing (drives the honest credit)
      var lines=insights.map(function(ins,ix){                       // per line: accept the phrasing only if it passes the number check, else keep the template
        var cand=payload.lines[ix] && payload.lines[ix].text;
        if(cand && gemPhrasingOk(cand, ins.facts)){ refined=true; return String(cand).trim(); }
        return ins.text;
      });
      gemInsightPhrased={key:key, lines:lines, refined:refined};
      var c2=insightCacheRead();                                     // persist so reloads within this period don't re-hit Gemini
      c2[mk]={period:period, sig:sig, lines:lines, refined:refined};
      Object.keys(c2).forEach(function(k){ if(!c2[k] || c2[k].period<period-1) delete c2[k]; });   // prune stale periods
      insightCacheWrite(c2);
      applyPhrasedInsights(lines, insights, refined);
    })
    .catch(function(){ clearTimeout(timer); });                     // any failure → templates already shown, nothing to do
}
function applyPhrasedInsights(lines, insights, refined){
  try{
    var host=document.getElementById('menuInsightsPanel'); if(!host) return;
    if(insightSig(insights)!==host.getAttribute('data-sig')) return;   // menu moved on → don't overwrite
    lines.forEach(function(t,ix){ var el=host.querySelector('.mi-line[data-ix="'+ix+'"]'); if(el) el.textContent=t; });
    if(refined){ var c=host.querySelector('.mi-credit'); if(c) c.hidden=false; }   // v68: reveal the credit only when Gemini truly phrased a shown line
  }catch(e){}
}
/* v67 item 5a (redesign 2): quiet prose lines that read as a note jotted on the menu, not a dashboard
   widget. v69 item 1: the SAME content system now lives inside an on-demand floating panel (the rainbow
   FAB, bottom-left) rather than an always-visible inline block — this fn fills #menuInsights inside the
   panel and shows/hides the WHOLE FAB by whether there's anything worth saying. renderAnalysis calls it
   after painting the table; switching menus re-renders it (the panel reflects the selected menu). */
function renderMenuInsights(){
  var host=document.getElementById('menuInsights'); if(!host) return;
  var fab=document.getElementById('menuSuggestFab');
  var insights=[]; try{ insights=computeInsights(insightSeedFor(currentMenuId)); }catch(e){ insights=[]; }
  if(!insights.length){ host.innerHTML=''; if(fab) fab.hidden=true; menuSuggestClose(); return; }   // nothing to say → hide the whole FAB
  if(fab) fab.hidden=false;
  var sig=insightSig(insights);
  // v69 (Max): the panel title always reads "What stands out on this menu" — the selected menu is already
  // obvious from the picker, so naming it here is noise. The "Refined by Gemini" credit stays honest —
  // hidden while the template shows, revealed by applyPhrasedInsights only when Gemini phrased a shown line.
  host.innerHTML='<div class="menu-insights" id="menuInsightsPanel" data-sig="'+esc(sig)+'">'
    +'<p class="mi-intro">What stands out on this menu</p>'
    +insights.map(function(ins,ix){ return '<p class="mi-line" data-ix="'+ix+'">'+esc(ins.text)+'</p>'; }).join('')
    +'<span class="mi-credit" hidden>Refined by Gemini</span>'
    +'</div>';
  try{ gemPhraseInsights(insights, currentMenuId||''); }catch(e){}
}
/* v69 item 1: the floating Suggestions panel — expands from the bottom-right rainbow button, closes on the
   ×, a re-tap, an outside click or Escape. Content is filled by renderMenuInsights; the panel only exists
   while the FAB is shown (i.e. this menu has something to say). Focus moves INTO the panel on open and is
   RESTORED to the trigger on an explicit close (× / Escape / re-tap) so keyboard focus never lands on the
   now-hidden panel. Outside-click leaves focus wherever the click sent it (don't yank it back). */
function menuSuggestOpen(){
  var f=document.getElementById('menuSuggestFab'); if(!f||f.hidden) return;
  var p=document.getElementById('menuSuggestPanel'), b=document.getElementById('menuSuggestBtn');
  if(p) p.hidden=false; f.classList.add('open'); if(b) b.setAttribute('aria-expanded','true');
  if(p){ try{ p.focus(); }catch(e){} }                               // move focus into the now-visible dialog (announces it, reads from the top)
}
function menuSuggestClose(restoreFocus){
  var f=document.getElementById('menuSuggestFab'), p=document.getElementById('menuSuggestPanel'), b=document.getElementById('menuSuggestBtn');
  var wasOpen=p && !p.hidden;
  if(p) p.hidden=true; if(f) f.classList.remove('open'); if(b) b.setAttribute('aria-expanded','false');
  if(restoreFocus && wasOpen && b && f && !f.hidden){ try{ b.focus(); }catch(e){} }   // return focus to the trigger — never to now-hidden content
}
function menuSuggestToggle(){ var p=document.getElementById('menuSuggestPanel'); if(p&&p.hidden) menuSuggestOpen(); else menuSuggestClose(true); }
(function wireMenuSuggestFab(){
  var b=document.getElementById('menuSuggestBtn'); if(b) b.addEventListener('click', function(e){ e.stopPropagation(); menuSuggestToggle(); });
  var x=document.getElementById('menuSuggestClose'); if(x) x.addEventListener('click', function(e){ e.stopPropagation(); menuSuggestClose(true); });
  document.addEventListener('click', function(e){                       // outside-click closes it (focus follows the click)
    var f=document.getElementById('menuSuggestFab'); if(!f||f.hidden) return;
    var p=document.getElementById('menuSuggestPanel'); if(p&&!p.hidden && !f.contains(e.target)) menuSuggestClose(false);
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape'){ var p=document.getElementById('menuSuggestPanel'); if(p&&!p.hidden) menuSuggestClose(true); } });
})();
function menuNameFor(id){ var m=(typeof menusList!=='undefined'?menusList:[]).filter(function(x){return x.id===id;})[0]; return m?m.name:''; }
function renderDashboard(){
  var root=document.getElementById('dashBody'); if(!root) return;
  if(typeof priceHistory==='undefined' || typeof savedPlates==='undefined'){ return; }  // data not initialised yet; boot-ready will re-render
  var cmp;
  try{ cmp=dashComparisons(); }catch(e){ console.error('[dashboard] not ready:', e); return; }
  var html='<div class="panel dash-panel"><h2>Average food cost'+(cmp.current!=null?' <span class="h2-val">'+cmp.current.toFixed(1)+'% today</span>':'')+'</h2><div class="pad">'
    +'<div class="chart-controls"><span class="chart-title">Food cost trend</span>'+rangeBarHtml()+'</div>'
    +trendChart()
    +'<div class="stat-attach"><div class="stat-lead">How today\u2019s average compares</div>'
    +'<div class="stat-line">'+statCard('Last week', cmp.current, cmp.lastWeek)+statCard('Last month', cmp.current, cmp.lastMonth)+statCard('This year', cmp.current, cmp.ytd)+'</div></div>'
    +'</div></div>';
  html+='<div class="hl-row">'+highlightCard('foodcost','Highest food cost %')+highlightCard('portion','Highest portion cost')+highlightCard('stock','Most expensive stock per unit')+'</div>';
  // v67 item 5a: the grounded "Suggestions" panel MOVED off the Dashboard onto the Menu tab
  // (suggestions are menu-specific — one menu's dishes at a time — where the Dashboard averages all
  // menus). See renderMenuInsights / renderAnalysis.
  root.innerHTML=html;
  root.querySelectorAll('.range-btn').forEach(function(b){ b.onclick=function(){ setDashRange(b.getAttribute('data-rg')); }; });
  (function wireTrendScrub(){                                        // v47: free scrubbing — crosshair + curve-riding dot + snapping tooltip
    var wrap=document.getElementById('trendWrap'), tip=document.getElementById('trendTip'); if(!wrap||!tip) return;
    var svg=wrap.querySelector('svg'), g=TREND_GEO; if(!svg||!g) return;   // empty chart: TREND_GEO is null, no wiring
    var cross=svg.querySelector('#tcCross'), dot=svg.querySelector('#tcDot'),
        rb=svg.querySelector('#tcRectB'), rd=svg.querySelector('#tcRectD');
    if(!cross||!dot||!rb||!rd) return;
    var n=g.xs.length, stepW=(g.W-g.padL-g.padR)/(n-1), lastIdx=-1, raf=0, pending=null, active=false;
    function showAt(vx){                                             // vx in viewBox units, already clamped to the plot
      active=true;
      var vy=tcYAt(g.xs,g.ys,g.tan,vx);                              // the dot rides the RENDERED curve continuously…
      cross.setAttribute('x1',vx.toFixed(1)); cross.setAttribute('x2',vx.toFixed(1)); cross.setAttribute('visibility','visible');
      dot.setAttribute('cx',vx.toFixed(1)); dot.setAttribute('cy',vy.toFixed(1)); dot.setAttribute('visibility','visible');
      rb.setAttribute('width',Math.max(0,vx).toFixed(1));            // bright behind the cursor…
      rd.setAttribute('x',vx.toFixed(1)); rd.setAttribute('width',Math.max(0,g.W-vx).toFixed(1));   // …dimmed ahead of it
      var idx=Math.max(0,Math.min(n-1,Math.round((vx-g.padL)/stepW)));
      if(idx!==lastIdx){                                             // …but the REPORTED value snaps to the nearest real reading
        lastIdx=idx;
        var p=g.pts[idx];
        var when=p.t?new Date(p.t).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):('reading #'+(idx+1));
        tip.innerHTML='<span class="tp-d">'+esc(when)+'</span><b class="tp-v">'+p.v.toFixed(1)+'%</b>';
      }
      tip.classList.add('show'); tip.setAttribute('aria-hidden','false');
      var rect=svg.getBoundingClientRect(), sx=rect.width/g.W, sy=rect.height/g.H;
      var half=(tip.offsetWidth||70)/2, px=vx*sx, py=vy*sy;
      px=Math.max(half+2, Math.min(rect.width-half-2, px));          // clamped: the card never leaves the chart
      tip.classList.toggle('below', py<48);                          // flips under the dot near the top edge
      tip.style.left=px+'px'; tip.style.top=py+'px';
    }
    function rest(){                                                 // pointer-leave/up: no crosshair, full brightness
      active=false; lastIdx=-1;
      cross.setAttribute('visibility','hidden'); dot.setAttribute('visibility','hidden');
      rb.setAttribute('width',g.W); rd.setAttribute('x',g.W); rd.setAttribute('width',0);
      tip.classList.remove('show'); tip.setAttribute('aria-hidden','true');
    }
    function fromEvent(e){
      var rect=svg.getBoundingClientRect();
      var vx=(e.clientX-rect.left)/rect.width*g.W;
      return Math.max(g.padL, Math.min(g.W-g.padR, vx));
    }
    function queue(vx){                                              // rAF throttle: one geometry pass per frame (phone-friendly)
      pending=vx; if(raf) return;
      raf=requestAnimationFrame(function(){ raf=0; if(pending!=null && document.contains(svg)) showAt(pending); pending=null; });
    }
    svg.addEventListener('pointerdown', function(e){ try{ svg.setPointerCapture(e.pointerId); }catch(_){ } e.preventDefault(); queue(fromEvent(e)); });
    svg.addEventListener('pointermove', function(e){ if(e.pointerType==='touch' && !active) return; queue(fromEvent(e)); });   // mouse scrubs on hover; touch needs the press first
    svg.addEventListener('pointerleave', rest);
    ['pointerup','pointercancel'].forEach(function(ev){ svg.addEventListener(ev, function(e){ if(e.pointerType!=='mouse') rest(); }); });
    svg.addEventListener('keydown', function(e){                     // one focusable plot; arrows step the readings
      var idx=lastIdx;
      if(e.key==='ArrowLeft') idx=(idx<0? n-1 : Math.max(0,idx-1));
      else if(e.key==='ArrowRight') idx=(idx<0? 0 : Math.min(n-1,idx+1));
      else if(e.key==='Home') idx=0;
      else if(e.key==='End') idx=n-1;
      else if(e.key==='Escape'){ rest(); return; }
      else return;
      e.preventDefault(); showAt(g.xs[idx]);
    });
    svg.addEventListener('blur', rest);
  })();
  root.querySelectorAll('.hl-card').forEach(function(b){ b.onclick=function(){ openHighlight(b.getAttribute('data-kind')); }; });
}

/* ---------- wiring for new pages/modals ---------- */
(function(){
  var e=document.getElementById('ingSearch'); if(e) e.addEventListener('input',renderIngredients);
  ['ingCatFilter','ingSupFilter'].forEach(function(id){ var s=document.getElementById(id); if(s) s.addEventListener('change',renderIngredients); });
  var isc=document.getElementById('ingSearchClear'); if(isc) isc.addEventListener('click',function(){ var s=document.getElementById('ingSearch'); if(s){ s.value=''; renderIngredients(); s.focus(); } });
  var icf=document.getElementById('ingClearFilters'); if(icf) icf.addEventListener('click',clearProductFilters);   // v58: same helper the empty-state action uses
  var _is=document.getElementById('ingSearch'); if(_is) _is.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); _is.blur(); } });   // v37: Enter commits
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  on('ingSave',saveIngEdit); on('ingCancel',closeIngEdit); on('ingClose',closeIngEdit); on('ingDelete',deleteIngredient);
  on('hlClose',function(){hide('hlModal');}); on('hlDone',function(){hide('hlModal');});
  on('invIntroX',function(){ try{localStorage.setItem('ezInvIntroDismissed','1');}catch(e){} var el=document.getElementById('invIntro'); if(el)el.style.display='none'; });
  on('invManualToggle',toggleInvManual);   // v67 item 4: reveal/hide the collapsed raw-text paste box
  ['ingModal','hlModal'].forEach(function(id){ var m=document.getElementById(id); if(m) m.addEventListener('click',function(ev){ if(ev.target===m) hide(id); }); });
})();

restoreLastTab();                                          // safe now: all module data (priceHistory, savedPlates, MENU) is initialised
bootstrapSync().then(rerenderCurrentTab, rerenderCurrentTab); // once shared data lands, repaint whatever tab is showing (fixes blank dashboard on refresh)
window.addEventListener('online',  function(){ bootstrapSync(); });
window.addEventListener('offline', function(){ setSync('offline'); });


/* ============================================================
   ITEM 6 (v35) — Settings surface
   Entry is a header gear, not a sixth nav tab (five is the max at readable label
   sizes). The panel reuses the existing modal pattern; CSS makes it full-screen at
   mobile widths. Every setting here follows the house rule: one dbSetSetting write
   + a localStorage mirror, loaded idempotently in bootstrapSync.
   ============================================================ */
/* The version string. sw.js's CACHE constant is the source of truth; this is a mirror,
   NOT a second source — tests/version.test.js reads sw.js and fails the build if the two
   ever disagree. Chosen over fetching and regexing sw.js at runtime, which would add an
   async network read that breaks offline for the sake of a label. */
var APP_VERSION='v70';
function openSettings(){
  var c=document.getElementById('setCogsInput'); if(c) c.value=cogsPct;
  var g=document.getElementById('setGstDefault'); if(g) g.value=gstDefault;
  var v=document.getElementById('setVersion'); if(v) v.textContent=APP_VERSION;
  show('settingsPanel');
}
function closeSettings(){ hide('settingsPanel'); }
// v60 item 8: Tidy lists is a modal now (not an inline Settings section) so Settings stays short.
// One modal, multiple doors: the Settings row opens it on Category; a filter's "Manage list…" door
// opens it pre-scoped to that field. renderTidyValues reads the #tidyField select, so we set it first.
function openTidyManage(field){
  var sel=document.getElementById('tidyField'); if(sel && field) sel.value=field;
  renderTidyValues();
  show('tidyManageModal');
}
function closeTidyManage(){ hide('tidyManageModal'); }

/* ===== v59 item 6b: Tidy lists UI (Settings) — the Settings surface for the v40 pure core =====
   Category spans products + plate categories; Brand/Supplier are product-only. Every action goes
   through ONE blast-radius confirm and applies via the existing write helpers (setOverride ->
   dbPushIngredient for products, dbPushPlate for plates, plus tidySupplierMemMigration for a
   supplier rename/clear so taught invoice packs don't orphan). Ingredient categories mirror their
   product, so a category rename here flows to the Ingredients tab automatically. */
var tidyField='category', tidyAction=null, tidyFrom=null;
function tidyFieldLabel(){ return tidyField.charAt(0).toUpperCase()+tidyField.slice(1); }
function renderTidyValues(){
  var box=document.getElementById('tidyValues'); if(!box) return;
  var sel=document.getElementById('tidyField'); tidyField=(sel&&sel.value)||'category';
  var rows=tidyValuesCombined(PRODUCTS, savedPlates, tidyField);
  if(!rows.length){ box.innerHTML='<p class="hint tidy-empty">No '+esc(tidyField)+' values yet.</p>'; return; }
  box.innerHTML=rows.map(function(r){
    var meta=(tidyField==='category')
      ? (r.products+' product'+(r.products===1?'':'s')+(r.plates?(' · '+r.plates+' plate'+(r.plates===1?'':'s')):''))
      : (r.count+' product'+(r.count===1?'':'s'));
    return '<div class="tidy-row" data-v="'+esc(r.value)+'">'
      +'<span class="tidy-val">'+esc(r.value)+'</span><span class="tidy-count">'+esc(meta)+'</span>'
      +'<span class="tidy-acts">'
      +'<button type="button" class="linklike" data-act="rename">Rename</button>'
      +'<button type="button" class="linklike" data-act="merge">Merge</button>'
      +'<button type="button" class="linklike tidy-clear" data-act="clear">Clear</button>'
      +'</span></div>';
  }).join('');
  box.querySelectorAll('.tidy-row .linklike').forEach(function(b){
    b.addEventListener('click',function(){ openTidy(tidyField, b.getAttribute('data-act'), b.closest('.tidy-row').getAttribute('data-v')); });
  });
}
function tidyBlast(plan){                                            // "on 14 products and 3 plates"
  var parts=[]; var np=plan.productPatches.length, nl=plan.platePatches.length;
  if(np) parts.push(np+' product'+(np===1?'':'s'));
  if(nl) parts.push(nl+' plate'+(nl===1?'':'s'));
  return parts.length?('on '+parts.join(' and ')):'nothing';
}
function openTidy(field, action, from){
  tidyField=field; tidyAction=action; tidyFrom=from;
  var title=document.getElementById('tidyModalTitle'), warn=document.getElementById('tidyModalWarn');
  var rw=document.getElementById('tidyRenameWrap'), mw=document.getElementById('tidyMergeWrap');
  var ri=document.getElementById('tidyRenameInput'), ms=document.getElementById('tidyMergeSelect');
  rw.style.display='none'; mw.style.display='none';
  var others=tidyValuesCombined(PRODUCTS, savedPlates, field).map(function(x){return x.value;}).filter(function(v){return v!==from;});
  if(action==='rename'){ title.textContent='Rename '+field; rw.style.display=''; if(ri){ ri.value=from; } }
  else if(action==='merge'){ title.textContent='Merge '+field;
    mw.style.display=''; if(ms){ ms.innerHTML=others.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('')||'<option value="">(no other value to merge into)</option>'; } }
  else { title.textContent='Clear '+field; }
  updateTidyWarn();                                                  // live blast-radius preview
  show('tidyModal');
  if(action==='rename'&&ri){ ri.focus(); ri.select(); }
}
function tidyTarget(){                                               // the chosen "to" value for the current action
  if(tidyAction==='clear') return null;
  if(tidyAction==='rename'){ var ri=document.getElementById('tidyRenameInput'); return ri?ri.value.trim():tidyFrom; }
  var ms=document.getElementById('tidyMergeSelect'); return ms?ms.value:null;
}
function updateTidyWarn(){
  var warn=document.getElementById('tidyModalWarn'); if(!warn) return;
  var plan=tidyPlanAll(PRODUCTS, savedPlates, tidyField, tidyAction, tidyFrom, tidyTarget());
  var to=tidyTarget();
  warn.textContent=(tidyAction==='clear'?('Clear “'+tidyFrom+'” '+tidyBlast(plan)+'?')
                   :tidyAction==='merge'?('Merge “'+tidyFrom+'” into “'+(to||'…')+'” '+tidyBlast(plan)+'?')
                   :('Rename “'+tidyFrom+'” to “'+(to||'…')+'” '+tidyBlast(plan)+'?'))+' This can’t be undone.';
}
function applyTidy(){
  var field=tidyField, action=tidyAction, from=tidyFrom;
  var to=null;
  if(action==='rename'){ to=(document.getElementById('tidyRenameInput').value||'').trim(); if(!to){ toast('Enter a new name'); return; } }
  else if(action==='merge'){ to=(document.getElementById('tidyMergeSelect').value||''); if(!to){ toast('Pick a value to merge into'); return; } }
  var plan=tidyPlanAll(PRODUCTS, savedPlates, field, action, from, to);
  if(!plan.count){ hide('tidyModal'); toast('Nothing to change'); return; }
  var col=plan.field;   // 'category' | 'brand' | 'supplier'
  // products: write through overrides (rebuild once, then push each changed row)
  plan.productPatches.forEach(function(pt){ overrides[pt.id]=Object.assign({}, overrides[pt.id]||{}); overrides[pt.id][col]=pt.value; });
  if(plan.productPatches.length){ saveOverrides(); rebuild(); plan.productPatches.forEach(function(pt){ dbPushIngredient(pt.id); }); }
  // plates (category only)
  plan.platePatches.forEach(function(pt){ var sp=(savedPlates||[]).filter(function(s){return s.id===pt.id;})[0]; if(sp){ sp.category=pt.value; dbPushPlate(sp); } });
  if(plan.platePatches.length){ savePlatesLS(); }
  // supplier memory migration (rename/merge/clear a supplier)
  if(field==='supplier'){
    tidySupplierMemMigration(supplierMem, from, (action==='clear'?null:to)).forEach(function(mig){
      if(mig.drop){ delete supplierMem[mig.oldId]; if(typeof dbDeleteSupplierPhrase==='function') dbDeleteSupplierPhrase(mig.oldId); return; }
      delete supplierMem[mig.oldId]; if(mig.oldId!==mig.newId && typeof dbDeleteSupplierPhrase==='function') dbDeleteSupplierPhrase(mig.oldId);
      supplierMem[mig.newId]={id:mig.newId, supplier:mig.supplier, phrase_norm:mig.phrase_norm, qty:mig.qty, unit:mig.unit, pid:mig.pid};
      if(typeof dbPushSupplierPhrase==='function') dbPushSupplierPhrase(supplierMem[mig.newId]);
    });
    saveSupplierMem();
  }
  hide('tidyModal');
  if(typeof renderIngredients==='function') renderIngredients();
  if(typeof renderKitchenPanel==='function') renderKitchenPanel();
  if(typeof renderPlatesTab==='function') renderPlatesTab();
  if(typeof renderAnalysis==='function') renderAnalysis();
  renderTidyValues();
  toast((action==='clear'?'Cleared':action==='merge'?'Merged':'Renamed')+' '+field+' '+tidyBlast(plan));
}
function syncCogsRead(){                                              // the Menu tab's read-only mirror of the target
  var r=document.getElementById('cogsTargetRead'); if(r) r.textContent=cogsPct;
}
/* Export backup — client-side only, no server round-trip. Five data groups, matching
   what bootstrapSync pulls: products (overrides), kitchen words, plates, menu items,
   settings. Deliberately a plain JSON dump: it's a lifeboat, not an interchange format. */
function buildBackup(){
  return {
    app:'EzPlate', version:APP_VERSION, exported_at:new Date().toISOString(),
    products:overrides,
    kitchen_ingredients:kitchenIngredients,
    plates:savedPlates,
    menu_items:customMenu,
    settings:{
      food_cost_target:cogsPct,
      gst_default:gstDefault,
      king_wiz_skips:kingWizSkipIds(),
      deleted_menu_ids:deletedMenuIds,
      deleted_prod_ids:deletedProdIds,
      menus:menusList,
      current_menu_id:currentMenuId
    }
  };
}
function exportBackup(){
  try{
    var d=new Date(), pad=function(x){return (x<10?'0':'')+x;};
    var name='ezplate-backup-'+d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'.json';
    var blob=new Blob([JSON.stringify(buildBackup(),null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name; document.body.appendChild(a); a.click();
    a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); },1000);
    toast('Backup downloaded');
  }catch(e){ console.error('[settings] export failed:', e); toast('Couldn\u2019t build the backup'); }
}
/* Clear cache & refresh — deletes the service worker's copies of the app shell and
   reloads, so the newest build downloads. It touches NOTHING else: no localStorage, no
   Supabase. Blocked while offline: wiping the offline copy with no connection would
   leave the app dead until signal returns, with no way back. */
function clearCacheAndRefresh(){
  if(!navigator.onLine){ toast('You\u2019re offline \u2014 connect first, or the app can\u2019t download again'); return; }
  askConfirm('Clear cache & refresh',
    'This re-downloads the latest version of the app.\n\nYour products, ingredients, plates and menus are NOT touched \u2014 this only clears the offline copy of the app itself.',
    'Clear & refresh', function(){
      var done=function(){ location.reload(); };
      if(!(window.caches && caches.keys)){ done(); return; }
      caches.keys().then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
        .then(done, done);                                          // a failed delete must still reload, not strand the user
    });
}
(function(){
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  on('settingsBtn',openSettings); on('settingsClose',closeSettings); on('settingsDone',closeSettings);
  on('cogsToSettings',openSettings);                                // the Menu tab's "Change it in Settings"
  on('setExport',exportBackup); on('setClearCache',clearCacheAndRefresh);
  var sp=document.getElementById('settingsPanel');
  if(sp) sp.addEventListener('click',function(ev){ if(ev.target===sp) closeSettings(); });
  var ci=document.getElementById('setCogsInput');
  if(ci) ci.addEventListener('input',function(){ var v=parseFloat(ci.value); if(v>=1&&v<=99){ setCogs(v,true); syncCogsRead(); } });   // setCogs already re-renders every consumer
  var gs=document.getElementById('setGstDefault');
  if(gs) gs.addEventListener('change',function(){ setGstDefault(gs.value,true); });
  // Tidy lists wiring (v59 core; v60 item 8 moves it into a modal)
  var tf=document.getElementById('tidyField'); if(tf) tf.addEventListener('change',renderTidyValues);
  on('setTidyOpen',function(){ closeSettings(); openTidyManage('category'); });   // Settings' single door
  on('tidyManageDone',closeTidyManage); on('tidyManageClose',closeTidyManage);
  var tmm=document.getElementById('tidyManageModal'); if(tmm) tmm.addEventListener('click',function(ev){ if(ev.target===tmm) closeTidyManage(); });
  on('tidyModalConfirm',applyTidy); on('tidyModalCancel',function(){ hide('tidyModal'); }); on('tidyModalClose',function(){ hide('tidyModal'); });
  var tm=document.getElementById('tidyModal'); if(tm) tm.addEventListener('click',function(ev){ if(ev.target===tm) hide('tidyModal'); });
  var tms=document.getElementById('tidyMergeSelect'); if(tms) tms.addEventListener('change',updateTidyWarn);   // refresh the blast-radius line
  var tri=document.getElementById('tidyRenameInput'); if(tri) tri.addEventListener('input',updateTidyWarn);
  // v60 item 8: the "Manage list…" door on each category/supplier filter (data-tidy-field). Handled at the
  // DOCUMENT level in the CAPTURE phase so it runs BEFORE the filter's own change→render listener — that
  // listener rebuilds the <select> (fillFilter), which would clear the sentinel selection before a
  // per-element handler ever saw it. stopPropagation keeps the render from treating the door as a value;
  // we restore the previous value (recorded on focusin) and open the manager pre-scoped.
  document.addEventListener('focusin',function(ev){
    var s=ev.target; if(s&&s.matches&&s.matches('select[data-tidy-field]')&&s.value!==TIDY_DOOR) s.dataset.prevVal=s.value;
  });
  document.addEventListener('change',function(ev){
    var s=ev.target; if(!s||!s.matches||!s.matches('select[data-tidy-field]')) return;
    if(s.value!==TIDY_DOOR) return;
    ev.stopPropagation();
    s.value=s.dataset.prevVal||'';
    openTidyManage(s.dataset.tidyField||'category');
  }, true);
})();
syncCogsRead();

/* ===== PWA: service worker registration ===== */
if ('serviceWorker' in navigator) {
  // Register on window load, at root scope, and surface any failure (no silent catch).
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' })
      .then(function (reg) {
        console.log('[PWA] Service worker registered — scope:', reg.scope);
        if (reg.update) { reg.update(); }
      })
      .catch(function (err) {
        console.error('[PWA] Service worker registration FAILED:', err);
      });
  });
  // When a new worker takes over from an old one, reload once so fresh assets load.
  if (navigator.serviceWorker.controller) {
    var __swReloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (__swReloaded) { return; }
      __swReloaded = true;
      try { sessionStorage.setItem('ez_swReload', '1'); } catch (e) {}  // tell the reloaded page not to replay the splash
      window.location.reload();
    });
  }
}

/* ===== Install banner ===== */
(function(){
  var KEY='cafeCost_installDismissed';
  var banner=document.getElementById('installBanner');
  if(!banner) return;
  var iosHint=document.getElementById('iosHint');
  var deferred=null;
  function dismissed(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
  function setDismissed(){try{localStorage.setItem(KEY,'1');}catch(e){}}
  function standalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;}
  function isiOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent);}
  function show(){ if(!dismissed()&&!standalone()) banner.style.display='flex'; }
  function hide(){ banner.style.display='none'; }
  window.addEventListener('beforeinstallprompt',function(e){ e.preventDefault(); deferred=e; show(); });
  window.addEventListener('appinstalled',function(){ setDismissed(); hide(); });
  document.getElementById('installClose').addEventListener('click',function(){ setDismissed(); hide(); });
  document.getElementById('installBtn').addEventListener('click',function(){
    if(deferred){ deferred.prompt(); deferred.userChoice.then(function(){ deferred=null; setDismissed(); hide(); }); }
    else if(iosHint){ iosHint.style.display='block'; }   /* iOS Safari has no prompt API */
  });
  show();  /* first-visit guidance even where beforeinstallprompt never fires (e.g. iOS) */
})();


/* ====== v2 features: load/edit, promote-to-menu, invoice import, name match ====== */
function show(id){var el=document.getElementById(id);if(el){el.classList.add('open');el.setAttribute('aria-hidden','false');}}
function hide(id){var el=document.getElementById(id);if(el){el.classList.remove('open');el.setAttribute('aria-hidden','true');}}

function updateEditTag(){
  var t=document.getElementById('editTag');
  if(t){
    if(loadedPlateId){var sp=savedPlates.find(function(s){return s.id===loadedPlateId;});
      if(sp){t.textContent='Editing: '+(sp.name||'plate');t.style.display='inline';} else t.style.display='none';}
    else t.style.display='none';
  }
  updatePublishLabel();
}
function updatePublishLabel(){
  var t=document.getElementById('addMenuTitle'), s=document.getElementById('addMenuSub'); if(!t)return;
  var linkedId=(menuLinkEl&&menuLinkEl.value&&menuById[menuLinkEl.value])?menuLinkEl.value:'';
  if(linkedId){ t.textContent='Update Menu Item'; s.textContent='Updates “'+menuById[linkedId].name+'” on the menu'; }
  else { t.textContent='Publish to Menu'; s.textContent='Makes this a live menu item with pricing'; }
}

/* ---- plate-name -> menu match prompt ---- */
function menuScore(name,m){
  var a=name.toLowerCase().trim(), mn=m.name.toLowerCase();
  if(a===mn)return 100;
  if(mn.indexOf(a)>=0||a.indexOf(mn)>=0)return 70;
  var A=a.split(/[^a-z0-9]+/).filter(Boolean), B=new Set(mn.split(/[^a-z0-9]+/).filter(Boolean)), o=0;
  A.forEach(function(w){if(B.has(w))o++;}); return o*22;
}
function nameNorm(s){return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function bestNameMatch(name){
  var q=nameNorm(name); if(q.length<3)return null;
  var A=q.split(' ').filter(Boolean);
  var best=null,bs=0,bestExact=false;
  MENU.forEach(function(m){
    var mn=nameNorm(m.name); if(!mn)return;
    var exact=(mn===q), score;
    if(exact) score=1;
    else if(mn.indexOf(q)>=0||q.indexOf(mn)>=0) score=0.9;
    else{
      var B=mn.split(' ').filter(Boolean), sb=new Set(B), hit=0;
      A.forEach(function(t){
        if(sb.has(t))hit+=1;
        else if(t.length>=3 && B.some(function(x){return x.length>=3&&(x.indexOf(t)>=0||t.indexOf(x)>=0);}))hit+=0.7;
      });
      score=hit/Math.max(A.length,B.length);
    }
    if(score>bs){bs=score;best=m;bestExact=exact;}
  });
  if(best && (bs>=0.5||bestExact)) return {item:best,exact:bestExact,score:bs};
  return null;
}
/* ---- word-level fuzzy menu matcher + live suggestions dropdown ---- */
function nmNorm(s){return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function nmPrefix(a,b){var n=Math.min(a.length,b.length),i=0;while(i<n&&a[i]===b[i])i++;return i;}
function scoreMenuName(query,m){
  var q=nmNorm(query); if(!q)return 0;
  var name=nmNorm(m.name); if(!name)return 0;
  if(name===q) return 1000;
  if(name.indexOf(q)>=0) return 600+Math.round(q.length/name.length*100);   // typed phrase inside the name
  if(q.indexOf(name)>=0) return 500;                                          // name inside typed phrase
  var qw=q.split(' ').filter(Boolean), nw=name.split(' ').filter(Boolean);
  if(!qw.length||!nw.length) return 0;
  var total=0, matched=0;
  qw.forEach(function(t){
    var best=0;
    nw.forEach(function(w){
      var s=0;
      if(w===t) s=100;
      else if(w.indexOf(t)===0) s=82;              // prefix: "bene" -> "benedict"
      else if(w.indexOf(t)>=0) s=64;               // substring
      else if(t.indexOf(w)>=0) s=52;               // typed word contains the menu word
      else { var p=nmPrefix(w,t); if(p>=3) s=24+p*4; }   // light typo tolerance
      if(s>best) best=s;
    });
    if(best>0){matched++; total+=best;}
  });
  if(!matched) return 0;
  return total*(matched/qw.length);                // reward covering more of the typed words
}
function rankPlateMatches(query){
  var q=nmNorm(query); if(q.length<2) return [];
  var out=[];
  savedPlates.forEach(function(sp){ var s=scoreMenuName(query,sp); if(s>=50) out.push({item:sp,score:s}); });
  out.sort(function(a,b){ return b.score-a.score || (a.item.name||'').toLowerCase().localeCompare((b.item.name||'').toLowerCase()); });
  return out.slice(0,6);   // up to 6 saved-plate suggestions
}
function platesLinkedMenuIds(){ var s={}; MENU.forEach(function(d){ if(plateIdOf(d)) s[d.id]=true; }); return s; }   // v55: dishes that already have a plate (so the suggest list doesn't offer both)
function rankLoadMatches(query){
  var q=nmNorm(query); if(q.length<2) return [];
  var out=[];
  savedPlates.forEach(function(sp){ var s=scoreMenuName(query,sp); if(s>=50) out.push({kind:'plate',item:sp,score:s}); });
  var linked=platesLinkedMenuIds();
  MENU.forEach(function(m){ if(linked[m.id]) return; var s=scoreMenuName(query,m); if(s>=50) out.push({kind:'menu',item:m,score:s}); });
  out.sort(function(a,b){ return b.score-a.score || (a.item.name||'').toLowerCase().localeCompare((b.item.name||'').toLowerCase()); });
  return out.slice(0,8);
}
function renderPlateSuggest(query){
  var box=document.getElementById('plateSuggest'); if(!box) return;
  var matches=rankLoadMatches(query);
  if(!matches.length){ box.style.display='none'; box.innerHTML=''; return; }   // no match -> treated as a new plate name
  box.innerHTML=matches.map(function(r){
    var it=r.item;
    if(r.kind==='plate'){
      var mi=plateMenuSummary(it);
      var n=(it.lines?it.lines.length:0);
      var sub=mi?('\u2194 '+esc(mi)):(n+' item'+(n===1?'':'s'));
      return '<div class="opt sug-opt" role="option" data-kind="plate" data-id="'+esc(it.id)+'"><span class="nm">'+esc(it.name||'Unnamed plate')+'</span><span class="ca">'+sub+'</span></div>';
    }
    return '<div class="opt sug-opt" role="option" data-kind="menu" data-id="'+esc(it.id)+'"><span class="nm">'+esc(it.name)+'</span><span class="ca">menu item \u00b7 no plate yet \u00b7 '+esc(it.section||'Uncategorised')+'</span></div>';
  }).join('');
  box.querySelectorAll('.sug-opt').forEach(function(o){
    o.addEventListener('mousedown',function(e){ e.preventDefault(); var id=o.getAttribute('data-id'); if(o.getAttribute('data-kind')==='menu') requestLoadMenuItem(id); else requestLoadPlate(id); });
  });
  box.style.display='block';
}
function loadMenuItemBlank(id){                              // v55: cost an uncosted dish -> open its (created+linked) plate
  var m=menuById[id]; if(!m) return;
  var sp=ensurePlateForDish(m); if(!sp) return;
  loadPlateState(sp.id); openBuilder();
  toast('Loaded menu item \u201c'+(m.name||'item')+'\u201d \u2014 add ingredients to cost it');
}
function requestLoadMenuItem(id){
  var m=menuById[id]; if(!m) return;
  if(isBuilderDirty()){ askConfirm('Load menu item','Load '+m.name+'? Unsaved changes will be lost.','Load',function(){ loadMenuItemBlank(id); }); }
  else loadMenuItemBlank(id);
}
function hidePlateSuggest(){ var b=document.getElementById('plateSuggest'); if(b){ b.style.display='none'; b.innerHTML=''; } }
function currentLinesSig(){ return plate.map(lineSig).join('|'); }
function isBuilderDirty(){
  var name=(document.getElementById('plateName').value||'').trim();
  if(plate.length===0 && !name) return false;
  if(loadedPlateId){
    var sp=savedPlates.find(function(s){return s.id===loadedPlateId;});
    if(!sp) return plate.length>0;
    var savedSig=(sp.lines||[]).map(lineSig).join('|');
    return savedSig!==currentLinesSig() || (sp.name||'')!==name;
  }
  return plate.length>0;                                   // a new, unsaved plate with ingredients
}
function requestLoadPlate(id){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  if(isBuilderDirty()){
    askConfirm('Load plate', 'Load '+(sp.name||'plate')+'? Unsaved changes will be lost.', 'Load', function(){ loadPlate(id); });
  } else { loadPlate(id); }
}
function checkNameMatch(v){ renderPlateSuggest(v); }   /* kept for existing call sites */
(function(){var pn=document.getElementById('plateName'); if(!pn)return;
  pn.addEventListener('focus',function(){ renderPlateSuggest(pn.value); });
  pn.addEventListener('blur',function(){ setTimeout(hidePlateSuggest,150); });
})();
function showMatchPrompt(item,exact){
  var el=document.getElementById('matchPrompt'); if(!el)return;
  el.querySelector('.mp-text').innerHTML='Did you mean to update <b>'+esc(item.name)+'</b>?';
  el.dataset.mid=item.id; el.style.display='flex';
}
function hideMatchPrompt(){ hidePlateSuggest(); }
function linkMatch(){
  var el=document.getElementById('matchPrompt'); var id=el.dataset.mid; if(!id||!menuById[id])return;
  document.getElementById('plateName').value=menuById[id].name;   // prefill exactly as stored in Menu Analysis
  menuLinkEl.value=id; menuTouched=true; hideMatchPrompt(); updatePublishLabel();
  toast('Linked to '+menuById[id].name+' — saving will update it');
}
function dismissMatch(){ dismissedMatch=document.getElementById('plateName').value.trim().toLowerCase(); hideMatchPrompt(); }

/* ---- load saved plates (via the plate-name search field, or a plate card) ---- */
// v54: set the builder state from a saved plate WITHOUT navigating — used both by loadPlate (which then
// opens the popup) and by the publish-from-card flow (which opens the publish modal instead).
function loadPlateState(id){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return null;
  plate=[];                                                 // FULL clear first — never blend two plates
  sp.lines.forEach(function(l){ if(l&&l.misc){ plate.push({uid:uidc++,misc:true,label:l.label||'',cost:Number(l.cost)||0}); } else if(l&&l.kid){ plate.push({uid:uidc++,kid:l.kid,qty:l.qty}); } else if(byId[l.pid]) plate.push({uid:uidc++,pid:l.pid,qty:l.qty}); });
  document.getElementById('plateName').value=sp.name||'';
  var pc=document.getElementById('plateCat'); if(pc) pc.value=sp.category||'';   // §J
  menuTouched=false; if(typeof menuLinkEl!=='undefined'&&menuLinkEl) menuLinkEl.value=''; loadedPlateId=sp.id;   // v55: a plate carries no menu link
  hidePlateSuggest(); updateEditTag(); renderPlate();
  return sp;
}
function loadPlate(id){ var sp=loadPlateState(id); if(!sp) return; openBuilder(); toast('Loaded: '+(sp.name||'plate')); }

/* ===== v54: Plates tab (card library) + builder popup + card action menu ===== */
var ICON_PLATE_BIG='<svg class="es-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3v4"/><path d="M9 3v4"/><path d="M12 3v4"/><path d="M6 7h6"/><path d="M9 7v14"/><path d="M18 3v18"/><path d="M18 3c-2.2 0-3.5 3-3.5 6 0 1.5 1.3 2 3.5 2"/></svg>';   // v57: fork + knife (matches the Plates nav glyph)
// v55: a plate can be on MANY menus. The badge summarises them; the cost cell shows "not costed" for an
// empty plate (§B) rather than a misleading $0.00.
function plateMenuSummary(sp){ var on=menusOfPlate(sp); if(!on.length) return null; return on.length===1?on[0].name:(on.length+' menus'); }
function plateMenuBadge(sp){ var s=plateMenuSummary(sp); return s?('<span class="ing-tag pub-on">On '+esc(s)+'</span>'):'<span class="ing-tag pub-off">Unpublished</span>'; }
function plateIsCosted(sp){ return !!(sp && sp.lines && sp.lines.length); }
function plateCostCell(sp){ return plateIsCosted(sp)
  ? '<div class="ing-price"><b>'+fmt2(costFromLines(sp.lines))+'</b><span class="ing-per">plate cost</span></div>'
  : '<div class="ing-price notcosted"><b>—</b><span class="ing-per">not costed yet</span></div>'; }
function renderPlatesTab(){
  var wrap=document.getElementById('plateList'); if(!wrap) return;
  if(!savedPlates.length){
    wrap.innerHTML=emptyStateHtml(ICON_PLATE_BIG,'No plates yet.',"Tap '+ New plate' to cost your first dish.",
      '<button class="btn primary" type="button" onclick="openBuilderNew()">+ New plate</button>');
    return;
  }
  fillFilter(document.getElementById('plateCatFilter'), plateCategories(), 'All categories');   // §J
  var q=(document.getElementById('plateSearch')?document.getElementById('plateSearch').value:'').trim().toLowerCase();
  var toks=searchTokens(q);   // v59: shared token matcher
  var cat=(document.getElementById('plateCatFilter')||{}).value||'';   // §J
  var cf=document.getElementById('plateClearFilters'); if(cf) cf.style.display=(q||cat)?'':'none';
  var items=savedPlates.filter(function(sp){
    if(cat && (sp.category||'')!==cat) return false;
    if(!toks.length) return true;
    return matchTokens(toks, ((sp.name||'')+' '+(sp.category||'')+' '+(plateMenuSummary(sp)||'')).toLowerCase());
  }).slice().sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!items.length){ wrap.innerHTML=emptySearchState(ICON_PLATE_BIG,'plates','clearPlateFilters'); return; }   // v58: variant A via the shared helper
  wrap.innerHTML=items.map(function(sp){
    return '<button class="ing-card" type="button" data-pid="'+esc(sp.id)+'">'
      +'<div class="ing-main"><span class="ing-name">'+esc(sp.name||'Unnamed plate')+'</span>'+(sp.category?'<span class="ing-brand">'+esc(sp.category)+'</span>':'')+'</div>'
      +'<div class="ing-meta">'+plateMenuBadge(sp)+'</div>'
      +plateCostCell(sp)
      +'</button>';
  }).join('');
  wrap.querySelectorAll('.ing-card').forEach(function(b){ b.onclick=function(){ openPlateActions(b.getAttribute('data-pid')); }; });
}
/* ---- builder popup ---- */
function openBuilder(){ var t=document.getElementById('builderModalTitle'); if(t) t.textContent=loadedPlateId?'Edit plate':'New plate'; if(typeof makeInlineCombo==='function'){ var d=document.getElementById('plateCatDrop'); if(d)d.style.display='none'; makeInlineCombo('plateCat','plateCatDrop',plateCategories); } show('builderModal');
  // v61 item 2: every open (New AND Edit) starts at the top — the scroller (and the full-screen overlay at mobile widths) can otherwise retain the previous session's position
  var bm=document.getElementById('builderModal'); if(bm){ bm.scrollTop=0; var mb=bm.querySelector('.mbody'); if(mb) mb.scrollTop=0; }
}
function closeBuilder(){ hide('builderModal'); }
function openBuilderNew(){                                           // + New plate: open the popup on an empty, unlinked plate
  plate=[]; loadedPlateId=null; menuTouched=false;
  var pn=document.getElementById('plateName'); if(pn) pn.value='';
  var pc=document.getElementById('plateCat'); if(pc) pc.value='';   // §J
  var pe=document.getElementById('plateNameErr'); if(pe) pe.style.display='none';
  if(typeof menuLinkEl!=='undefined' && menuLinkEl) menuLinkEl.value='';
  var qq=document.getElementById('q'); if(qq) qq.value='';
  if(typeof hideMatchPrompt==='function') hideMatchPrompt();
  if(typeof hidePlateSuggest==='function') hidePlateSuggest();
  updateEditTag(); renderPlate(); openBuilder();
}
/* ---- plate card action menu ---- */
var paTargetId=null;
function openPlateActions(pid){
  var sp=savedPlates.find(function(s){return s.id===pid;}); if(!sp) return;
  paTargetId=pid;
  var s=plateMenuSummary(sp), cost=plateIsCosted(sp)?('cost '+fmt2(costFromLines(sp.lines))):'not costed';
  var title=document.getElementById('plateActionsTitle'); if(title) title.textContent=sp.name||'Plate';
  var sub=document.getElementById('plateActionsSub'); if(sub) sub.textContent=(s?('On '+s):'Unpublished')+' · '+cost;
  show('plateActionsModal');
}
function closePlateActions(){ hide('plateActionsModal'); }
function editPlateFromCard(pid){ loadPlate(pid); }                   // opens the builder popup pre-filled (existing clear-then-load path)
// v55: delete a plate AND every menu entry backed by it. Products/ingredients are untouched (§D1 copy).
function deletePlate(id){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  var nm=sp.name||'plate'; var on=menusOfPlate(sp);
  var msg=on.length
    ? ('Delete “'+nm+'”? It’s on '+on.map(function(o){return o.name;}).join(', ')+' — the plate and those menu entries are removed. Your products and ingredients are untouched.')
    : ('Delete “'+nm+'”? The plate is removed. Your products and ingredients are untouched.');
  askConfirm('Delete plate?', msg, 'Delete', function(){
    dishesOfPlate(sp).forEach(function(d){ removeMenuItem(d.id); });   // drop every menu entry that used this plate
    savedPlates=savedPlates.filter(function(s){return s.id!==id;});
    if(loadedPlateId===id) loadedPlateId=null;
    savePlatesLS(); dbDeletePlate(id);
    rebuildMenu(); buildMenuOptions(); buildMenuSelector(); updateEditTag(); renderPlate(); renderAnalysis(); renderPlatesTab();
    toast('“'+nm+'” deleted');
  });
}
/* ---- Manage menus: a plate can be published to any number of menus, each its own price/category ---- */
var manageMenusPid=null;
function openManageMenus(pid){
  var sp=savedPlates.find(function(s){return s.id===pid;}); if(!sp) return;
  manageMenusPid=pid;
  var t=document.getElementById('manageMenusTitle'); if(t) t.textContent=sp.name||'Plate';
  renderManageMenus(); show('manageMenusModal');
}
function closeManageMenus(){ hide('manageMenusModal'); manageMenusPid=null; }
function renderManageMenus(){
  var box=document.getElementById('mmList'); if(!box) return;
  var sp=savedPlates.find(function(s){return s.id===manageMenusPid;}); if(!sp){ box.innerHTML=''; return; }
  if(!menusList.length){ box.innerHTML='<div class="mm-empty">No menus yet — create one on the Menu tab first, then publish this plate to it.</div>'; return; }
  var onById={}; menusOfPlate(sp).forEach(function(o){ onById[o.menuId]=o; });
  box.innerHTML=menusList.map(function(m){
    var o=onById[m.id];
    return '<div class="mm-row"><span class="mm-name">'+esc(m.name)+'</span>'
      +(o ? '<span class="mm-price">'+fmt2(o.price)+'</span><button class="btn ghost mm-remove" type="button" data-dish="'+esc(o.dishId)+'">Remove</button>'
          : '<button class="btn mm-add" type="button" data-mid="'+esc(m.id)+'">Add</button>')
      +'</div>';
  }).join('');
  box.querySelectorAll('.mm-add').forEach(function(b){ b.onclick=function(){ openPublishModal(manageMenusPid, b.getAttribute('data-mid')); }; });
  box.querySelectorAll('.mm-remove').forEach(function(b){ b.onclick=function(){ mmRemove(b.getAttribute('data-dish')); }; });
}
function mmRemove(dishId){
  var m=menuById[dishId]; if(!m) return;
  removeMenuItem(dishId);
  rebuildMenu(); buildMenuOptions(); buildMenuSelector(); renderAnalysis(); renderPlatesTab(); renderManageMenus();
  toast('Removed from the menu — plate kept');
}
(function(){                                                         // Plates-tab + popup wiring
  var nb=document.getElementById('newPlateBtn'); if(nb) nb.addEventListener('click',openBuilderNew);
  var bc=document.getElementById('builderClose'); if(bc) bc.addEventListener('click',closeBuilder);
  var pac=document.getElementById('plateActionsClose'); if(pac) pac.addEventListener('click',closePlateActions);
  var ps=document.getElementById('plateSearch'); if(ps){ ps.addEventListener('input',renderPlatesTab); ps.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ps.blur(); } }); }
  var psc=document.getElementById('plateSearchClear'); if(psc) psc.addEventListener('click',function(){ if(ps){ ps.value=''; renderPlatesTab(); ps.focus(); } });
  var pcf=document.getElementById('plateCatFilter'); if(pcf) pcf.addEventListener('change',renderPlatesTab);   // §J category filter
  var pcc=document.getElementById('plateClearFilters'); if(pcc) pcc.addEventListener('click',clearPlateFilters);   // v58: same helper the empty-state action uses
  var pP=document.getElementById('paPublish'); if(pP) pP.addEventListener('click',function(){ var id=paTargetId; closePlateActions(); openManageMenus(id); });
  var pE=document.getElementById('paEdit'); if(pE) pE.addEventListener('click',function(){ var id=paTargetId; closePlateActions(); editPlateFromCard(id); });
  var pPr=document.getElementById('paPrint'); if(pPr) pPr.addEventListener('click',function(){ var sp=savedPlates.find(function(s){return s.id===paTargetId;}); closePlateActions(); if(sp) printDocketFor(sp.name, sp.lines); });   // v60 item 3: print straight from the saved plate
  var pD=document.getElementById('paDelete'); if(pD) pD.addEventListener('click',function(){ var id=paTargetId; closePlateActions(); deletePlate(id); });
  var mmc=document.getElementById('manageMenusClose'); if(mmc) mmc.addEventListener('click',closeManageMenus);
  var mmd=document.getElementById('manageMenusDone'); if(mmd) mmd.addEventListener('click',closeManageMenus);
})();

/* ---- publish a plate to a menu (create/update a menu_items entry pointing at the plate via plate_id) ---- */
// v55: the FK now runs menu_items.plate_id -> plates.id, so the DISH write must land AFTER the plate is on
// the server (the reverse of the old v40 sequencing). The plate is normally already synced; we re-push it
// (idempotent) and chain the dish after, so a plate whose offline push was dropped can't orphan the dish.
function dbPushMenuAfterPlate(item, sp){
  var platePush = sp ? dbPushPlate(sp) : null;
  if(!platePush) return dbPushMenu(item);
  return Promise.resolve(platePush).then(function(res){ if(!res || res.error){ return null; } return dbPushMenu(item); });
}
var pubPlateId=null;
function openPublishModal(plateId, presetMenuId){
  var sp=savedPlates.find(function(s){return s.id===plateId;}); if(!sp) return;
  if(!menusList.length){ toast('Create a menu first, then publish into it'); if(typeof openNewMenuModal==='function') openNewMenuModal(); return; }
  pubPlateId=plateId;
  document.getElementById('mi_name').value=sp.name||'';
  document.getElementById('mi_price').value='';
  document.getElementById('mi_notes').value='';
  document.getElementById('mi_cat').value=sp.category||'';
  buildMenuPickers(); var miMenu=document.getElementById('mi_menu'); if(miMenu){ var wantM=(presetMenuId&&menusList.some(function(m){return m.id===presetMenuId;}))?presetMenuId:currentMenuId; if(menusList.some(function(m){return m.id===wantM;})) miMenu.value=wantM; }
  catState.chosen=sp.category||null; catState.chosenIsNew=false;
  document.getElementById('mi_catDrop').style.display='none'; document.getElementById('mi_catNew').style.display='none';
  document.getElementById('mi_err').style.display='none';
  var titleEl=document.getElementById('menuModalTitle'), saveEl=document.getElementById('menuSave');
  if(titleEl) titleEl.textContent='Add to menu'; if(saveEl) saveEl.textContent='Add to menu';
  show('menuModal');
}
function closeMenuModal(){hide('menuModal');}
function submitMenuItem(){
  var sp=savedPlates.find(function(s){return s.id===pubPlateId;});
  var err=document.getElementById('mi_err');
  if(!sp){ if(err){err.textContent='That plate is no longer available.';err.style.display='block';} return; }
  var name=document.getElementById('mi_name').value.trim();
  var typedCat=document.getElementById('mi_cat').value.trim();
  var allCats=menuCats();
  var existCat=allCats.find(function(c){return c.toLowerCase()===typedCat.toLowerCase();});
  var cat;
  if(typedCat===''){cat='Uncategorised';}
  else if(existCat){cat=existCat;}
  else if(catState.chosen!==null && catState.chosenIsNew && catState.chosen.toLowerCase()===typedCat.toLowerCase()){cat=typedCat;}
  else{document.getElementById('mi_err').textContent='“'+typedCat+'” is a new category — pick “Create new category” from the list to confirm, or choose an existing one.';document.getElementById('mi_err').style.display='block';renderCatDrop();return;}
  var priceV=document.getElementById('mi_price').value;
  var notes=document.getElementById('mi_notes').value.trim();
  var miMenuEl=document.getElementById('mi_menu'); var chosenMenu=(miMenuEl&&miMenuEl.value)?miMenuEl.value:currentMenuId;
  if(!name){err.textContent='Enter a menu item name.';err.style.display='block';return;}
  if(priceV===''||isNaN(parseFloat(priceV))||parseFloat(priceV)<0){err.textContent='Enter a valid sell price.';err.style.display='block';return;}
  // one entry per (plate, menu): re-adding to a menu it's already on updates that entry rather than duplicating.
  var existing=dishesOfPlate(sp).find(function(d){ return (d.menuId||'MENU_ORIGINAL')===chosenMenu; });
  var targetId=existing?existing.id:('um'+Date.now().toString(36));
  var item={id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,custom:true,menuId:chosenMenu,plateId:sp.id};
  if(existing){ upsertCustomMenu(item); }
  else { customMenu.push(item); saveCustomMenu(); dbPushMenuAfterPlate({id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,menuId:chosenMenu,plateId:sp.id}, sp); }
  rebuildMenu(); buildMenuOptions(); setCurrentMenuId(chosenMenu); buildMenuSelector();
  renderAnalysis(); renderPlatesTab(); closeMenuModal();
  var mm=document.getElementById('manageMenusModal'); if(mm && mm.classList.contains('open')) renderManageMenus();
  toast('“'+name+'” '+(existing?'updated on':'added to')+' the menu');
}

/* ---- invoice import ---- */
/* ---- invoice file upload: PDF (via PDF.js) or CSV ---- */
var __pdfjsPromise=null;
function ensurePdfjs(){
  if(window.pdfjsLib) return Promise.resolve();
  if(__pdfjsPromise) return __pdfjsPromise;
  __pdfjsPromise=new Promise(function(res,rej){
    var s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js';
    s.onload=function(){ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js'; }catch(e){} res(); };
    s.onerror=function(){ rej(new Error('pdfjs-load')); };
    document.head.appendChild(s);
  });
  return __pdfjsPromise;
}
async function extractPdfText(file){
  await ensurePdfjs();
  var buf=await file.arrayBuffer();
  var pdf=await window.pdfjsLib.getDocument({data:buf}).promise;
  var out='';
  for(var p=1;p<=pdf.numPages;p++){
    var page=await pdf.getPage(p);
    var content=await page.getTextContent();
    var lines={}, order=[];
    content.items.forEach(function(it){
      if(!it.str) return;
      var y=Math.round(it.transform[5]);                 // group text items into visual lines by y-position
      if(!(y in lines)){ lines[y]=[]; order.push(y); }
      lines[y].push(it.str);
    });
    order.sort(function(a,b){ return b-a; });             // top -> bottom
    order.forEach(function(y){ out += lines[y].join(' ').replace(/\s+/g,' ').trim()+'\n'; });
  }
  return out;
}
function pdfTextToCsv(text){                              // turn extracted lines into "name,price" the CSV flow already understands
  var rows=[];
  (text||'').split(/\n/).forEach(function(raw){
    var line=raw.trim(); if(!line) return;
    if(!/[A-Za-z]{2,}/.test(line)) return;               // needs a product name
    var re=/\$?\s*\d{1,6}[.,]\d{2}\b/g, mtch, last=null;  // money = a number with 2 decimals (avoids matching pack sizes/qty)
    while((mtch=re.exec(line))!==null){ last=mtch; }
    if(!last) return;
    var price=parseFloat(last[0].replace(/[^0-9.]/g,'')); if(isNaN(price)) return;
    var name=line.slice(0,last.index).replace(/[\s,;:\-]+$/,'').trim();
    if(name.length<2) return;
    rows.push(name+','+price);
  });
  return rows.join('\n');
}
function showInvFileErr(msg){ var e=document.getElementById('invFileErr'); if(e){ e.textContent=msg; e.style.display='block'; } }
var IMG_PDF_MSG="This PDF appears to be image-based and can't be read automatically \u2014 please use the manual entry option instead";
function handleInvFile(file){
  if(!file) return;
  var nameEl=document.getElementById('invFileName'); if(nameEl) nameEl.textContent=file.name;
  var errEl=document.getElementById('invFileErr'); if(errEl) errEl.style.display='none';
  var isPdf=/\.pdf$/i.test(file.name)||file.type==='application/pdf';
  if(isPdf){
    if(nameEl) nameEl.textContent=file.name+' \u2014 reading\u2026';
    extractPdfText(file).then(function(text){
      var cleaned=(text||'').replace(/\s+/g,'');
      if(!cleaned || cleaned.length<15){               // no selectable text = scanned / image-only PDF
        if(nameEl) nameEl.textContent=file.name;
        showInvFileErr(IMG_PDF_MSG); return;
      }
      text=normPackNotation(text);                     // v55 §I: normalise "N x M's" -> "(N*M)'s" before parsing (and before it's shown in the textarea, so a manual re-parse stays consistent)
      invGst=invGstDetect(text); invSupplier=invSupplierDetect(text);
      var rows=pdfTextToRows(text), ta=document.getElementById('invCsv');
      // v63 fix: the PDF path builds rows DIRECTLY (it doesn't go through parseInvoice), so the AI
      // second reader was never firing and the status note never set for uploaded invoices \u2014 which is
      // how Max actually imports. Mirror parseInvoice here: stamp the status, then fire ONE reader.
      if(rows.length){ ta.value=text.trim(); if(nameEl) nameEl.textContent=''; gemStatus='checking'; gemApplied=false; gemCheckStart=Date.now(); buildInvRows(rows); gemFireSecondReader(text); }   // v67 follow-up: no "N lines read, review below" line \u2014 the "X matched \u00b7 X new" summary below already confirms it worked
      else { ta.value=text.trim(); if(nameEl) nameEl.textContent=file.name+' \u2014 review the extracted text'; toast('Couldn\u2019t auto-detect priced lines \u2014 review the text below or enter manually'); }
    }).catch(function(e){
      if(nameEl) nameEl.textContent=file.name;
      if(e && e.message==='pdfjs-load') toast('Could not load the PDF reader \u2014 check your connection and try again');
      else showInvFileErr(IMG_PDF_MSG);
    });
  } else {
    var r=new FileReader();
    r.onload=function(){ if(nameEl) nameEl.textContent=''; document.getElementById('invCsv').value=String(r.result||''); parseInvoice(); };   // v67 follow-up: no filename line — the "X matched · X new" summary confirms it worked
    r.onerror=function(){ toast('Could not read that file'); };
    r.readAsText(file);
  }
}
// v67 item 4: the raw-text paste box is collapsed by default. Toggle reveals it (power path) and
// focuses the textarea; setInvManual(false) re-collapses. openInv resets it closed on every open so
// a first-time user always sees the clean "upload → match → review" flow, never a wall of monospace.
function setInvManual(open){
  var box=document.getElementById('invManualBox'), tog=document.getElementById('invManualToggle');
  if(box) box.hidden=!open;
  if(tog){ tog.setAttribute('aria-expanded', open?'true':'false'); tog.textContent=open?'Hide paste box':'or paste text manually'; }
  if(open){ var ta=document.getElementById('invCsv'); if(ta) ta.focus(); }
}
function toggleInvManual(){ var box=document.getElementById('invManualBox'); setInvManual(!!(box&&box.hidden)); }
function openInv(){gemStatus=null;gemToken++;gemApplied=false;document.getElementById('invCsv').value='';setInvManual(false);var r=document.getElementById('invReview');r.style.display='none';r.innerHTML='';var fe=document.getElementById('invFileErr');if(fe)fe.style.display='none';var fn=document.getElementById('invFileName');if(fn)fn.textContent='';var fi=document.getElementById('invFile');if(fi)fi.value='';invSupplier='';var _in=document.getElementById('invIntro');if(_in){var _d='';try{_d=localStorage.getItem('ezInvIntroDismissed');}catch(e){}_in.style.display=_d?'none':'';}updateLastImport();show('invModal');}
function closeInv(){hide('invModal');}
function inorm(s){return (s||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function itoks(s){return inorm(s).split(' ').filter(Boolean);}
function simScore(a,b){
  var A=itoks(a),B=itoks(b); if(!A.length||!B.length)return 0;
  var sb=new Set(B),hit=0;
  A.forEach(function(t){
    if(sb.has(t))hit+=1;
    else if(t.length>=3 && B.some(function(x){return x.length>=3 && (x.indexOf(t)>=0||t.indexOf(x)>=0);}))hit+=0.7;
  });
  var coverage=hit/A.length;                 /* share of the invoice name found in the product */
  var na=inorm(a),nb=inorm(b), sub=(nb.indexOf(na)>=0)?0.15:0;
  return Math.min(1, coverage*0.9+sub);
}
var INV_STOP={kg:1,kgs:1,g:1,gr:1,gram:1,grams:1,l:1,lt:1,ltr:1,litre:1,liter:1,ml:1,ea:1,each:1,unit:1,units:1,pk:1,pack:1,packs:1,packet:1,ctn:1,carton:1,box:1,bag:1,btl:1,bottle:1,tray:1,tub:1,can:1,tin:1,jar:1,x:1,per:1,approx:1,app:1,pcs:1,pce:1,piece:1,pieces:1,portion:1,portions:1,sliced:1,sleeve:1,sleeves:1,case:1,value:1,added:1,premium:1,prem:1,select:1,choice:1,bulk:1,foodservice:1,catering:1,frozen:1,frz:1,fresh:1,raw:1,diced:1,whole:1,pkt:1,or:1,and:1,the:1,of:1,with:1,size:1,pre:1,cut:1,gluten:1,free:1,gf:1};
function coreTokens(s, brand){
  var toks=inorm(s).split(' ').filter(Boolean);
  var bt={}; if(brand){ inorm(brand).split(' ').filter(Boolean).forEach(function(t){bt[t]=1;}); }
  return toks.filter(function(t){
    if(/[0-9]/.test(t)) return false;                 // drop qty / pack size / dimension tokens
    if(t.length<2) return false;
    if(INV_STOP[t]) return false;                     // drop unit / packaging / filler words
    if(bt[t]) return false;                           // drop the supplier brand
    return true;
  });
}
function prodTokenSet(p){
  var set={};
  coreTokens(p.description, p.brand).forEach(function(t){set[t]=1;});
  (p.search_aliases||[]).forEach(function(a){ inorm(a).split(' ').forEach(function(t){ if(t&&!/[0-9]/.test(t)&&t.length>=2) set[t]=1; }); });
  if(p.item_type){ inorm(p.item_type).split(' ').forEach(function(t){ if(t&&t.length>=2) set[t]=1; }); }
  return set;
}
function matchScore(invName, p){                        // word-level match on the core product noun(s)
  var inv=coreTokens(invName,null); if(!inv.length) return 0;
  var prod=prodTokenSet(p), pk=Object.keys(prod);
  var total=0, hit=0;
  inv.forEach(function(t,idx){
    var w=(idx===0?1.6:1); total+=w;                    // first surviving word = the key noun
    if(prod[t]){ hit+=w; return; }
    var fz=pk.some(function(x){ return (t.length>=4&&x.length>=4)&&(x.indexOf(t)===0||t.indexOf(x)===0||x.indexOf(t)>=0||t.indexOf(x)>=0); });
    if(fz) hit+=w*0.6;
  });
  var score=hit/total;
  var first=inv[0], firstMatched=prod[first]||pk.some(function(x){ return first.length>=4&&(x.indexOf(first)===0||first.indexOf(x)===0); });
  if(!firstMatched) score*=0.5;                         // main noun must land for a strong score
  return Math.min(1, score);
}
var invGst={mode:'unknown', note:''};
/* ITEM 6 (v35): the GST DEFAULT. There is no invGst *control* in the build — invGst is
   derived from the invoice text by invGstDetect below — so a "default" can only mean one
   thing: what to assume when the invoice doesn't say. An explicit statement on the
   invoice still wins; this only replaces the hardcoded ex-GST assumption in the
   'unknown' branch. See the handover note. */
var GSTKEY='cafeDB_gstDefault';
function loadGstDefault(){ try{ var v=localStorage.getItem(GSTKEY); if(v==='inc'||v==='ex') return v; }catch(e){} return 'ex'; }   // 'ex' preserves the current behaviour for brand-new accounts
var gstDefault=loadGstDefault();
function setGstDefault(mode, persist){
  if(mode!=='inc'&&mode!=='ex') return;
  gstDefault=mode;
  try{ localStorage.setItem(GSTKEY, mode); }catch(e){}
  if(persist && typeof dbSetSetting==='function') dbSetSetting('gst_default', mode);
}
function invDbg(){ if(window.EZ_INV_DEBUG && window.console) try{console.log.apply(console, arguments);}catch(e){} }
function invGstDetect(text){
  var t=(text||'').toLowerCase();
  if(/gst\s*incl|incl[a-z]*\s*gst|inc\.?\s*gst|includes?\s+gst|inclusive of gst/.test(t)) return {mode:'inc', note:'GST-inclusive prices detected \u2014 converted to ex-GST (\u00f71.10) for storage.'};
  if(/gst\s*excl|excl[a-z]*\s*gst|ex\.?\s*gst|plus\s+gst|excludes?\s+gst|exclusive of gst/.test(t)) return {mode:'ex', note:'GST-exclusive prices detected.'};
  // ITEM 6 (v35): the invoice didn't say. Fall back to the Settings default rather than
  // silently assuming ex-GST. An explicit statement above always wins over the default.
  return (gstDefault==='inc')
    ? {mode:'inc', note:'GST status unclear \u2014 using your Settings default: prices treated as GST-inclusive and converted to ex-GST (\u00f71.10).'}
    : {mode:'ex',  note:'GST status unclear \u2014 using your Settings default: prices treated as GST-exclusive. Change the default in Settings.'};
}
/* ---- drop invoice totals / footer / summary lines ---- */
var INV_EXCLUDE=/\b(?:sub-?totals?|totals?|gst|balance|owing|due|account|acct|invoice|abn|acn|payments?|paid|remittances?|freight|delivery|surcharges?|discounts?|rounding|amounts?|eftpos|eft|tax|bsb|statements?|credit|charges?|levy|levies)\b/i;
/* A real product line has a quantity/unit/weight or a "N x N" pack pattern. */
function hasProductStructure(line){
  if(explicitUnitPrice(line)) return true;
  if(packWeight(line)) return true;
  if(packCount(line)) return true;
  if(/\d+(?:\.\d+)?\s*(?:kg|kgs|g|gr|gram|grams|ml|l|lt|ltr|litre|ea|each|unit|units|doz|dozen|pk|pkt|pack|packs|ctn|carton|case|box|sleeve|tray|bag)\b/i.test(line)) return true;
  if(/\d+\s*(?:x|\u00d7|\*)\s*\d/i.test(line)) return true;      // "6 x 2.5", "6 x 6 x ..."
  return false;
}
function invLineClass(name, fullLine){
  if(!INV_EXCLUDE.test(name||'')) return 'ok';                    // no summary keyword -> normal item
  return hasProductStructure(fullLine||name) ? 'uncertain' : 'exclude';  // keyword + no product shape -> drop
}
/* ---- candidate matching: token overlap, top 3 ---- */
function rankCandidates(invName){
  var inv=coreTokens(invName,null); if(!inv.length) return [];
  var scored=[];
  PRODUCTS.forEach(function(p){
    var ps=prodTokenSet(p), pk=Object.keys(ps), overlap=0;
    inv.forEach(function(t){
      if(ps[t]){ overlap++; return; }
      for(var k in ps){ if(t.length>=4&&k.length>=4&&(k.indexOf(t)===0||t.indexOf(k)===0)){ overlap+=0.75; break; } }
    });
    if(overlap<=0) return;
    var shorter=Math.min(inv.length, pk.length)||1;         // overlap / meaningful tokens in the shorter string
    var score=Math.min(1, overlap/shorter);
    if(inv[0] && ps[inv[0]] && inv[0].length>=4) score=Math.max(score,0.6);   // one strong content word (e.g. "hoki") is enough
    scored.push({id:p.id, coverage:score});
  });
  scored.sort(function(a,b){ return b.coverage-a.coverage; });
  return scored.slice(0,3);
}
function buildInvRows(rawRows){
  invRows=rawRows.map(function(r){
    var up=(r.unitPrice==null?null:r.unitPrice);
    if(up!=null && invGst.mode==='inc') up=up/1.1;                 // store ex-GST
    var cands=rankCandidates(r.name);
    var top=cands.length?cands[0].coverage:0;
    var addNew=(top<0.3);                                          // <0.3 -> no confident match -> Add New
    var tier=top>=0.6?'hi':(top>=0.3?'mid':'lo');                  // >=0.6 confident, 0.3-0.59 possible
    var row={name:r.name, raw:r.raw||r.name, unitPrice:up, unit:(r.unit||'auto'), rawUnit:(r.unit||'auto'),
            needManual:(!!r.needManual || up==null), uncertain:!!r.uncertain, cands:cands,
            bestId:(addNew?null:(cands.length?cands[0].id:null)),
            conf:top, tier:tier, addNew:addNew, newItem:null, remembered:false};
    var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, row.raw||row.name)]:null);
    if(!row.addNew && row.bestId){                                // matched line: product pack > supplier memory > parser (+ unit guard)
      var mp=byId[row.bestId];
      resolveMatchedPrice(row, mp?{pack_qty:mp.pack_qty, pack_unit:mp.pack_unit, base_unit:mp.base_unit}:null, mem);
    } else if(row.needManual && mem){                            // no-match / manual line keeps v20 memory behaviour
      applySupplierMemory(row, mem);
    }
    flagNeedsAttention(row);
    return row;
  });
  renderInvReview();
}
/* ---- structured price extraction ---- */
function moneyMatches(line){
  var re=/\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})\b/g, m, arr=[];
  while((m=re.exec(line))!==null){ arr.push({val:parseFloat(m[1].replace(/,/g,'')), idx:m.index, end:re.lastIndex}); }
  return arr;
}
function firstPairPrice(monies){   // first adjacent pair of equal money values = the per-pack (unit) price column, e.g. "52.12 52.12" or qty-1 "$20.00 $20.00"
  for(var i=0;i<monies.length-1;i++){ if(monies[i].val>0 && monies[i].val===monies[i+1].val) return monies[i].val; }
  return null;
}
/* --- supplier memory: pure helpers (kept in this region so tests can reach them) --- */
function normalizePhrase(s){       // stable key for "how this supplier writes this item", ignoring codes/prices/qty noise
  s=(' '+String(s||'')+' ').toLowerCase();
  s=s.replace(/\$?\d+(?:,\d{3})*(?:\.\d+)?/g,' ');   // drop money + any bare numbers (codes, qty, pack counts, prices)
  s=s.replace(/[#*|]/g,' ');                          // drop item-code / bullet punctuation
  s=s.replace(/[^a-z0-9]+/g,' ');                     // keep words only, spaces between
  return s.replace(/\s+/g,' ').trim();
}
function packPriceOf(raw){         // the price of one pack from a raw invoice line
  var m=moneyMatches(raw||''); if(!m.length) return null;
  var p=firstPairPrice(m); return (p!=null)?p:m[m.length-1].val;
}
function applySupplierMemory(row, mem){   // re-derive unit price from a remembered pack {qty, unit}; never touches a row that already parsed
  if(!row || !mem || !row.needManual) return row;
  var pack=packPriceOf(row.raw||row.name); var qty=parseFloat(mem.qty);
  if(pack==null || !(qty>0)) return row;
  var u=(mem.unit||'ea').toLowerCase(), unitPrice, unit;
  if(u==='kg'||u==='g'){ unit='kg'; unitPrice=pack/(qty*(u==='kg'?1:0.001)); }
  else if(u==='l'||u==='ml'){ unit='l'; unitPrice=pack/(qty*(u==='l'?1:0.001)); }
  else { unit='ea'; unitPrice=pack/qty; }
  if(!isFinite(unitPrice)||unitPrice<0) return row;
  row.unitPrice=unitPrice; row.unit=unit; row.needManual=false; row.remembered=true;
  return row;
}
/* --- Phase 1: product-pack pricing + precedence (product pack > supplier memory > parser) + unit guard --- */
function unitToBaseFields(u){ u=(u||'').toLowerCase();              // the unit a price is entered in -> how it's stored
  if(u==='kg') return {base_unit:'g', cost_basis:'$/g', div:1000};
  if(u==='l')  return {base_unit:'ml', cost_basis:'$/ml', div:1000};
  return {base_unit:'ea', cost_basis:'$/unit', div:1};
}
function unitCatCategory(u){ u=(u||'').toLowerCase();
  if(u==='kg'||u==='g'||u==='gr'||u==='gram'||u==='grams') return 'kg';
  if(u==='l'||u==='ml'||u==='lt'||u==='litre') return 'l';
  if(u==='ea'||u==='unit'||u==='units'||u==='each') return 'ea';
  return null;
}
function derivePackPrice(raw, packQty, packUnit){          // product's OWN pack: line pack-price / pack size
  var qty=parseFloat(packQty); if(!(qty>0)) return null;
  var pack=packPriceOf(raw); if(pack==null) return null;
  var u=(packUnit||'ea').toLowerCase(), unit, unitPrice;
  if(u==='kg'||u==='g'){ unit='kg'; unitPrice=pack/(qty*(u==='kg'?1:0.001)); }
  else if(u==='l'||u==='ml'){ unit='l'; unitPrice=pack/(qty*(u==='l'?1:0.001)); }
  else { unit='ea'; unitPrice=pack/qty; }
  if(!isFinite(unitPrice)||unitPrice<0) return null;
  return {unitPrice:unitPrice, unit:unit, source:'product-pack'};
}
function resolveMatchedPrice(row, product, mem){
  var chosen=null;
  if(product && product.pack_qty>0 && product.pack_unit){        // 1) the product's taught pack wins
    var d=derivePackPrice(row.raw||row.name, product.pack_qty, product.pack_unit);
    if(d) chosen={unitPrice:d.unitPrice, unit:d.unit, source:'product-pack', needManual:false};
  }
  if(!chosen && mem && parseFloat(mem.qty)>0){                    // 2) then supplier memory for this phrase
    var pack=packPriceOf(row.raw||row.name), q=parseFloat(mem.qty);
    if(pack!=null && q>0){
      var mu=(mem.unit||'ea').toLowerCase(), unit, up;
      if(mu==='kg'||mu==='g'){ unit='kg'; up=pack/(q*(mu==='kg'?1:0.001)); }
      else if(mu==='l'||mu==='ml'){ unit='l'; up=pack/(q*(mu==='l'?1:0.001)); }
      else { unit='ea'; up=pack/q; }
      if(isFinite(up)&&up>=0) chosen={unitPrice:up, unit:unit, source:'memory', needManual:false};
    }
  }
  if(!chosen){                                                   // 3) else the parser's own derivation, if any
    if(!row.needManual && row.unitPrice!=null) chosen={unitPrice:row.unitPrice, unit:row.unit, source:'parser', needManual:false};
    else chosen={unitPrice:null, unit:(row.unit||'auto'), source:'manual', needManual:true};
  }
  row.unitPrice=chosen.unitPrice; row.unit=chosen.unit; row.needManual=chosen.needManual;
  row.priceSource=chosen.source; row.remembered=(chosen.source==='memory'); row.fromProductPack=(chosen.source==='product-pack');
  if(chosen.source==='product-pack'&&product){ row.taughtQty=parseFloat(product.pack_qty); row.taughtUnit=(product.pack_unit||'ea'); }
  if(chosen.source==='memory'&&mem){ row.taughtQty=parseFloat(mem.qty); row.taughtUnit=(mem.unit||'ea'); }
  var baseCat=product?unitCatCategory(product.base_unit):null;
  row.unitMismatch=false;
  var taught=(chosen.source==='product-pack'||chosen.source==='memory');
  if(!taught && baseCat && chosen.unit && chosen.unit!=='auto' && chosen.unit!==baseCat && !chosen.needManual){
    row.unitMismatch=true; row.needManual=true;                  // a parser GUESS in the wrong unit is blocked; a pack the user taught is the truth
  }
  return row;
}
function unitCat(u){ u=u.toLowerCase();
  if(u==='kg'||u==='kgs') return {cat:'kg',f:1};
  if(u==='g'||u==='gr'||u==='gram'||u==='grams') return {cat:'kg',f:0.001};
  if(u==='l'||u==='lt'||u==='ltr'||u==='litre'||u==='liter') return {cat:'l',f:1};
  if(u==='ml') return {cat:'l',f:0.001};
  if(u==='ea'||u==='each'||u==='unit'||u==='units'||u==='pk'||u==='pack'||u==='ctn'||u==='carton'||u==='box') return {cat:'ea',f:1};
  return null;
}
function explicitUnitPrice(line){                                  // "$6.20/kg" or "6.20 per kg"
  var re=/\$?\s*(\d+(?:\.\d{1,2})?)\s*(?:\/|per\s*)(kg|kgs|g|gr|gram|l|lt|ltr|litre|ml|ea|each|unit)\b/i, m=line.match(re);
  if(!m) return null;
  var val=parseFloat(m[1]), u=m[2].toLowerCase(), cat, factor=1;
  if(u==='kg'||u==='kgs'){cat='kg';factor=1;}
  else if(u==='g'||u==='gr'||u==='gram'){cat='kg';factor=1000;}
  else if(u==='l'||u==='lt'||u==='ltr'||u==='litre'){cat='l';factor=1;}
  else if(u==='ml'){cat='l';factor=1000;}
  else {cat='ea';factor=1;}
  return {unitPrice:val*factor, unit:cat};
}
/* nested pack weight: "6 x (22 x 120g)" -> total kg/L. Multiplies every "N x"/"N of" before the final weight/volume unit. */
function packWeight(line){
  // Find the LAST weight/volume unit + its number = the per-unit weight (e.g. "2.5kg").
  var re=/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gr|gram|grams|l|lt|ltr|litre|liter|ml)\b/gi, m, last=null;
  while((m=re.exec(line))!==null){ last=m; }
  if(!last){ invDbg('[packWeight] no weight/volume unit in:', line); return null; }
  var u=unitCat(last[2]); if(!u||u.cat==='ea'){ return null; }
  var unitNum=parseFloat(last[1]);                                   // e.g. 2.5
  var prefix=line.slice(0,last.index);                              // everything before "2.5kg"
  // Every multiplier before it: a number followed by x / * / of / per / comma / a pack-noun.
  // Handles "6 x 6 x", "6 CTN x 6 x", "6 cartons, 6 per carton,".
  var mult=1, mm, factors=[],
      mr=/(\d+(?:\.\d+)?)\s*(?:x|\u00d7|\*|of\b|per\b|,|ctns?\b|cartons?\b|cases?\b|boxe?s?\b|packe?t?s?\b|sleeves?\b|trays?\b|bags?\b)/gi;
  while((mm=mr.exec(prefix))!==null){ var v=parseFloat(mm[1]); if(v>0){ mult*=v; factors.push(v); } }
  var qtyInCat=mult*unitNum*u.f;                                    // total weight in kg (or L)
  invDbg('[packWeight] structure:', {line:line, orderedX_packQty:factors, unitWeight:unitNum+last[2], multiplied:factors.concat([unitNum]).join(' x ')+' = '+(mult*unitNum)+' '+last[2], totalWeight:qtyInCat+(u.cat==='l'?' L':' kg')});
  return {qtyInCat:qtyInCat, cat:u.cat, factors:factors, unitNum:unitNum};
}
/* per-unit counts: dozen / each / portions, with optional "N x" multiplier chain */
function packCount(line){
  var mult=1, any=false, mm, mr=/(\d+(?:\.\d+)?)\s*[a-z]*\s*(?:x|\u00d7|\*|of)\s*/gi;
  while((mm=mr.exec(line))!==null){ mult*=parseFloat(mm[1]); any=true; }
  var doz=line.match(/(\d+(?:\.\d+)?)\s*(doz|dozen)\b/i);
  if(doz) return (any?mult:1)*parseFloat(doz[1])*12;
  var ct=line.match(/(\d+)\s*(ea|each|unit|units|pcs|pce|piece|pieces|portion|portions|sleeve|sleeves)\b/i);
  if(ct) return (any?mult:1)*parseFloat(ct[1]);
  var sc=line.match(/\b(\d{2,4})'?s\b/i);                          // shorthand pack count e.g. "400s" / "105s" (2-4 digits + optional apostrophe + s)
  if(sc) return (any?mult:1)*parseFloat(sc[1]);
  var ofc=line.match(/\bof\s+(\d+(?:\.\d+)?)\b/i);
  if(ofc) return (any?mult:1)*parseFloat(ofc[1]);
  if(any) return mult;
  return null;
}
function parsePdfLine(line){
  line=(line||'').trim(); if(!line) return null;
  if(!/[A-Za-z]{2,}/.test(line)) return null;
  var monies=moneyMatches(line); if(!monies.length) return null;
  var name=line.slice(0, monies[0].idx).replace(/[\s,;:@\-]+$/,'').trim();
  if(name.length<2) name=line.replace(/[\s,;:@\-]+$/,'').trim();   // qty-first layouts: keep the whole line as the name
  var cls=invLineClass(name, line); if(cls==='exclude'){ invDbg('[parsePdfLine] EXCLUDED (summary/footer line):', line); return null; }
  var unc=(cls==='uncertain');
  var ex=explicitUnitPrice(line);                                 // 1) explicit unit price wins
  if(ex){ invDbg('[parsePdfLine] explicit unit price:', {name:name, unitPrice:ex.unitPrice, unit:ex.unit}); return {name:name, unitPrice:ex.unitPrice, unit:ex.unit, needManual:false, uncertain:unc, raw:line}; }
  // Per-PACK price: columnar invoices repeat the Unit Price / Price columns ("52.12 52.12"); simple invoices
  // repeat the qty-1 unit price as the line total ("$20.00 $20.00"). The first adjacent equal pair is the price
  // of ONE pack. Using it (not the last money / line total) is what stops qty>1 lines being multiplied by qty.
  var total=monies[monies.length-1].val;                          // last money = line total
  var packPrice=firstPairPrice(monies); if(packPrice==null) packPrice=total;
  var aps=line.match(/\b(\d{2,4})'s\b/i);                          // 1b) explicit apostrophe-s pack count e.g. "105'S", "400'S" -> N pieces per pack
  if(aps){ var apc=parseFloat(aps[1]);
    if(apc>0){ invDbg('[parsePdfLine] APOSTROPHE-S count:', {name:name, count:apc, packPrice:packPrice, perUnit:'$'+(packPrice/apc).toFixed(4)+'/unit'});
      return {name:name, unitPrice:packPrice/apc, unit:'ea', needManual:false, uncertain:unc, raw:line}; } }
  var w=packWeight(line);                                         // 2) derive $/kg or $/L from the pack price and the pack's weight/volume
  if(w && w.qtyInCat>0){ var upw=packPrice/w.qtyInCat; invDbg('[parsePdfLine] WEIGHT calc:', {name:name, packPrice:packPrice, lineTotal:total, totalWeight:w.qtyInCat+(w.cat==='l'?' L':' kg'), pricePerUnit:'$'+upw.toFixed(4)+'/'+(w.cat==='l'?'L':'kg')}); return {name:name, unitPrice:upw, unit:w.cat, needManual:false, uncertain:unc, raw:line}; }
  var c=packCount(line);                                          //    or $/unit from the pack price and the per-pack count
  if(c && c>0) return {name:name, unitPrice:packPrice/c, unit:'ea', needManual:false, uncertain:unc, raw:line};
  return {name:name, unitPrice:null, unit:'auto', needManual:true, uncertain:unc, raw:line};   // 3) ambiguous
}
function pdfTextToRows(text){
  var rows=[]; (text||'').split(/\n/).forEach(function(raw){ var r=parsePdfLine(raw); if(r) rows.push(r); });
  return rows;
}
function unitLabelFor(row){
  var u=row&&row.unit;                                            // the resolved unit is the truth — it's what gets written on Apply
  if(u==='kg')return '/kg'; if(u==='l')return '/L'; if(u==='ea')return '/unit';
  var pid=row&&row.bestId;
  if(pid && byId[pid]){ var b=byId[pid].base_unit; return b==='g'?'/kg':b==='ml'?'/L':'/unit'; }
  return '';
}
function parseInvoiceCSV(text){
  var out=[]; text.split(/\r?\n/).forEach(function(line,i){
    line=line.trim(); if(!line)return;
    var parts=line.split(','); if(parts.length<2)return;
    var priceStr=parts[parts.length-1].replace(/[^0-9.\-]/g,''); var price=parseFloat(priceStr);
    var name=parts.slice(0,-1).join(',').trim();
    if(i===0 && /name|product|price|cost|item/i.test(line) && isNaN(price)) return;
    if(!name)return;
    var cls=invLineClass(name, line); if(cls==='exclude') return;
    out.push({name:name, unitPrice:isNaN(price)?null:price, unit:'auto', needManual:isNaN(price), uncertain:(cls==='uncertain'), raw:line});
  });
  return out;
}
// v55 §I: the protected parser's packCount reads "6x8's" as just the "6x" multiplier (6) — its
// shorthand-count regex needs 2-4 digits, so the single-digit "8's" is dropped. Rather than edit the
// protected region (CLAUDE.md rule 1), we normalise the RAW text here, OUTSIDE it: rewrite a compound
// "N x M's" into "(N*M)'s" (e.g. "6x8's" -> "48's") so the parser reads the true per-pack count. Only the
// apostrophe-s compound form is touched; weight packs ("6 x 2.5kg") and bare "6x8" are left alone.
// NOTE: this rewrites the displayed line text too (name shows "48's"); it does NOT add purchased-quantity
// capture — that column isn't parsed at all (see HANDOVER-v55 §I).
function normPackNotation(text){
  return (text||'').replace(/\b(\d+)\s*[x×*]\s*(\d+)(['’]?s)\b/gi, function(m, a, b){
    var n=parseInt(a,10)*parseInt(b,10); return (isFinite(n)&&n>0) ? (n+"'s") : m;
  });
}
function parseInvoice(){
  var txt=normPackNotation(document.getElementById('invCsv').value);
  invGst=invGstDetect(txt); invSupplier=invSupplierDetect(txt);
  var raw=parseInvoiceCSV(txt);
  if(!raw.length){toast('No valid rows. Use: product name, unit price per kg/unit');return;}
  // v62: Reader 1 (this parser) renders the review modal IMMEDIATELY below. Reader 2 (Gemini) then runs
  // ONE background request and merges when it lands — AI adds latency nowhere. gemStatus is set BEFORE
  // buildInvRows so the very first render already shows "AI double-checking…".
  gemStatus='checking'; gemApplied=false; gemCheckStart=Date.now();   // v63: stamp the start so gemSettle can keep "checking" visible long enough to read
  buildInvRows(raw);                                                 // <- renders now, exactly as today
  gemFireSecondReader(txt);
}
function prodOptions(selId){
  return PRODUCTS.slice().sort(function(a,b){return a.description.localeCompare(b.description);}).map(function(p){
    return '<option value="'+p.id+'"'+(p.id===selId?' selected':'')+'>'+esc(p.description)+(p.brand?' \u2014 '+esc(p.brand):'')+'</option>';
  }).join('');
}
function dispPrice(p){var c=cpbu(p);if(c==null)return '\u2014';if(p.base_unit==='g')return '$'+(c*1000).toFixed(2)+'/kg';if(p.base_unit==='ml')return '$'+(c*1000).toFixed(2)+'/L';return '$'+c.toFixed(2)+'/unit';}
/* ---- new-item inline panel ---- */
function prodCategories(){ return Array.from(new Set(PRODUCTS.map(function(p){return p.category;}).filter(Boolean))).sort(); }
function prodBrands(){ return Array.from(new Set(PRODUCTS.map(function(p){return p.brand;}).filter(Boolean))).sort(); }
function prodSuppliers(){ return Array.from(new Set(PRODUCTS.map(function(p){return p.supplier;}).filter(Boolean))).sort(); }

/* ===== v40 item 3: "Tidy lists" pure core =====
   Categories/brands/suppliers aren't their own tables — they're values on products, and the
   dropdowns derive from whatever exists. So "rename/merge/clear" all mean "edit that value across
   every product carrying it". These functions are pure (products array in, plan out) so the maths
   is unit-tested; the Settings UI (a follow-up) calls tidyPlan(), shows the blast-radius confirm,
   then applies plan.patches through the existing dbPushIngredient write path.
   TIDY_FIELDS keys the three managed fields to their product columns. */
var TIDY_FIELDS={ category:'category', brand:'brand', supplier:'supplier' };
function tidyFieldCol(field){ return TIDY_FIELDS[field]||field; }
function tidyFieldValues(products, field){                          // inventory: distinct non-empty values + usage counts, most-used first then A–Z
  var col=tidyFieldCol(field), counts={};
  (products||[]).forEach(function(p){ if(!p) return; var v=p[col]; if(v==null||v==='') return; counts[v]=(counts[v]||0)+1; });
  return Object.keys(counts).map(function(v){ return {value:v, count:counts[v]}; })
    .sort(function(a,b){ return b.count-a.count || a.value.toLowerCase().localeCompare(b.value.toLowerCase()); });
}
function tidyValueExists(products, field, value){                   // does another product already carry this value? (rename-onto-existing => a merge)
  if(value==null||value==='') return false;
  return tidyFieldValues(products, field).some(function(x){ return x.value===value; });
}
function tidyPlan(products, field, action, from, to){               // action: 'rename' | 'merge' | 'clear'. Returns the exact per-product patch list + whether it's a merge.
  var col=tidyFieldCol(field);
  var newVal=(action==='clear')?null:to;
  var isMerge=(action!=='clear') && to!=null && to!==from && tidyValueExists(products, field, to);
  var patches=[];
  (products||[]).forEach(function(p){
    if(!p) return;
    var cur=(p[col]==null?'':p[col]);
    if(cur!==(from==null?'':from)) return;                          // only products carrying `from` are touched
    patches.push({id:p.id, field:col, value:newVal});
  });
  return {action:action, field:col, from:from, to:newVal, isMerge:isMerge, patches:patches};
}
// Supplier memory (taught packs) keys off the supplier NAME via memKey(). Renaming/merging a supplier on products
// would orphan its taught packs unless the memory entries move too. This pure planner lists the re-keys needed;
// the entry's phrase_norm is already normalised, so the new id is memKey(to,·) == normSupplier(to)+'|'+phrase_norm
// — reconstructable WITHOUT re-entering the protected parser region. Clearing a supplier drops its memories.
// v59 item 6b: the Category picker spans BOTH product categories AND plate categories (Max's call).
// This pure planner returns the product patches (via dbPushIngredient) and, for category only, the
// plate patches (via dbPushPlate) — so one Rename/Merge/Clear flows to products, ingredients (which
// mirror their product), AND plates in a single confirmed action. Brand/Supplier are product-only.
function tidyValuesCombined(products, plates, field){
  var pv=tidyFieldValues(products, field);
  if(field!=='category') return pv.map(function(x){ return {value:x.value, count:x.count, products:x.count, plates:0}; });
  var byVal={}; pv.forEach(function(x){ byVal[x.value]={value:x.value, products:x.count, plates:0}; });
  tidyFieldValues(plates, 'category').forEach(function(x){ (byVal[x.value]||(byVal[x.value]={value:x.value,products:0,plates:0})).plates=x.count; });
  return Object.keys(byVal).map(function(v){ var o=byVal[v]; o.count=o.products+o.plates; return o; })
    .sort(function(a,b){ return b.count-a.count || a.value.toLowerCase().localeCompare(b.value.toLowerCase()); });
}
function tidyPlanAll(products, plates, field, action, from, to){
  var pp=tidyPlan(products, field, action, from, to);
  var pl=(field==='category') ? tidyPlan(plates, 'category', action, from, to) : {patches:[], isMerge:false};
  return { field:field, action:action, from:from, to:pp.to,
           productPatches:pp.patches, platePatches:pl.patches,
           isMerge:pp.isMerge||pl.isMerge, count:pp.patches.length+pl.patches.length };
}
function tidySupplierMemMigration(supplierMem, from, to){           // to===null => clear (drop the memories); else re-key onto `to`
  var nf=normSupplier(from), nt=(to==null?null:normSupplier(to)), out=[];
  for(var id in supplierMem){ var e=supplierMem[id]; if(!e) continue;
    if(normSupplier(e.supplier)!==nf) continue;
    out.push(nt==null
      ? {oldId:id, newId:null, drop:true}                          // supplier cleared -> forget its taught packs
      : {oldId:id, newId:nt+'|'+e.phrase_norm, supplier:to, phrase_norm:e.phrase_norm, qty:e.qty, unit:e.unit, pid:(e.pid||null)});
  }
  return out;
}
function kingNames(){ return (kitchenIngredients||[]).map(function(k){return k&&k.name;}).filter(Boolean).sort(); }   // ITEM 5 (v35): the combobox source for the invoice Kitchen name field
var niCombos={};
/* v59 item 2 ROOT CAUSE: modal comboboxes render `.cat-drop` as position:absolute inside `.mbody`,
   whose `overflow:auto` (needed so tall modals scroll) CLIPS the dropdown after ~1.5 rows — the
   Save bar then sits over it. Fix: on open, anchor the dropdown with position:FIXED to the input's
   viewport rect so it ESCAPES the scroll container entirely (the modal's only transform is the
   open animation, long finished by interaction time, so fixed is viewport-relative). The
   `.cat-drop`'s own max-height/overflow give the internal scroll for long lists; opens upward when
   the input sits low. Reposition on scroll/resize while open; clear the inline geometry on close. */
function anchorDrop(drop){
  if(!drop) return;
  var wrap=drop.closest('.cat-wrap'); var inp=wrap?wrap.querySelector('input'):null;
  if(!inp && drop.previousElementSibling && drop.previousElementSibling.tagName==='INPUT') inp=drop.previousElementSibling;
  if(!inp) return;
  var r=inp.getBoundingClientRect();
  drop.style.position='fixed'; drop.style.left=r.left+'px'; drop.style.width=r.width+'px'; drop.style.right='auto';
  var below=window.innerHeight-r.bottom-8, above=r.top-8;
  if(below>=160 || below>=above){ drop.style.top=(r.bottom+4)+'px'; drop.style.bottom='auto'; drop.style.maxHeight=Math.min(300,Math.max(140,below))+'px'; }
  else { drop.style.top='auto'; drop.style.bottom=(window.innerHeight-r.top+4)+'px'; drop.style.maxHeight=Math.min(300,Math.max(140,above))+'px'; }   // input low on screen -> open upward
}
function resetDrop(drop){ if(!drop) return; ['position','left','width','right','top','bottom','maxHeight'].forEach(function(p){ drop.style[p]=''; }); }
(function(){ var reflow=function(){ document.querySelectorAll('.cat-drop').forEach(function(d){ if(getComputedStyle(d).display!=='none') anchorDrop(d); }); };
  window.addEventListener('resize',reflow); window.addEventListener('scroll',reflow,true); })();   // scroll capture=true catches the modal body scroll
function makeInlineCombo(inpId, dropId, listFn){
  var inp=document.getElementById(inpId), drop=document.getElementById(dropId); if(!inp||!drop) return;
  var state={value:inp.value.trim(), isNew:false, confirmed:!!inp.value.trim()}; niCombos[inpId]=state;
  function render(){
    var q=inp.value.trim(), items=listFn();
    var scored=items.map(function(c){return {c:c,s:catScore(c,q)};}).filter(function(o){return o.s>=0;}).sort(function(a,b){return b.s-a.s;}).slice(0,6);
    var html=''; scored.forEach(function(o){var ex=o.c.toLowerCase()===q.toLowerCase();html+='<div class="opt cat-opt" data-v="'+esc(o.c)+'">'+esc(o.c)+(ex?' <span class="ca">exists</span>':'')+'</div>';});
    var hasExact=items.some(function(c){return c.toLowerCase()===q.toLowerCase();});
    if(q && !hasExact) html+='<div class="opt cat-opt cat-create" data-new="'+esc(q)+'">\u2795 Create new: \u201c'+esc(q)+'\u201d</div>';
    if(!html) html='<div class="opt muted">Type to search\u2026</div>';
    drop.innerHTML=html; drop.style.display='block'; anchorDrop(drop);   // v59 item 2: escape the modal-body clip
    drop.querySelectorAll('.cat-opt').forEach(function(o){ o.addEventListener('mousedown',function(e){e.preventDefault();
      var dn=o.getAttribute('data-new');
      if(dn!==null){ inp.value=dn; state.value=dn; state.isNew=true; state.confirmed=true; }
      else { var v=o.getAttribute('data-v'); inp.value=v; state.value=v; state.isNew=false; state.confirmed=true; }
      drop.style.display='none'; resetDrop(drop);
    }); });
  }
  inp.addEventListener('input',function(){ state.confirmed=false; state.isNew=false; state.value=inp.value.trim(); render(); });
  inp.addEventListener('focus',render);
  inp.addEventListener('blur',function(){ setTimeout(function(){ drop.style.display='none'; resetDrop(drop); },150); });
}
function resolveCombo(inpId, listFn){
  var inp=document.getElementById(inpId), st=niCombos[inpId]||{}; var v=(inp?inp.value.trim():'');
  if(!v) return {ok:true, value:''};
  var items=listFn(), exact=items.filter(function(c){return c.toLowerCase()===v.toLowerCase();})[0];
  if(exact) return {ok:true, value:exact};
  if(st.confirmed && st.isNew && (st.value||'').toLowerCase()===v.toLowerCase()) return {ok:true, value:v};
  return {ok:false, value:v};
}
function niLab(t, src){ return '<span class="ni-lab">'+t+'<span class="ni-af">'+(src==='ai'?'AI suggested':'auto-filled')+'</span></span>'; }   /* v37; v62: one chip SYSTEM, two labels — parser fill = "auto-filled", AI second-reader fill = "AI suggested" */
/* v50 item 1 ROOT CAUSE: the new-item form's values + Apply tick lived ONLY as uncontrolled DOM inputs.
   Any edit to another row calls renderInvReview() -> box.innerHTML=html, which destroyed the form and
   recomputed the tick from invRowState (='new' -> unticked) — so an in-progress new item silently
   cleared. Fix: the form state lives on invRows[i].newItem. niSnapshot reads the live form (fields +
   combo state + the row's Apply tick); niRehydrate writes it back after a rebuild. renderInvReview
   snapshots every OPEN form BEFORE the wipe, then rehydrates after — no per-cell poking (v33 holds). */
var NI_COMBOS=['brand','cat','sup','king'];
function niSnapshot(i){
  if(!document.getElementById('ni_name'+i)) return null;           // form not built for this row -> nothing to capture
  var g=function(id){ var e=document.getElementById(id); return e?e.value:''; };
  var combos={};
  NI_COMBOS.forEach(function(f){ var st=niCombos['ni_'+f+i]||{}; combos[f]={value:(st.value||''), isNew:!!st.isNew, confirmed:!!st.confirmed}; });
  var tr=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]'), ap=tr&&tr.querySelector('.invAppr');
  var prev=invRows[i]&&invRows[i].newItem;
  return { name:g('ni_name'+i), unit:g('ni_unit'+i), price:g('ni_price'+i), pack:g('ni_pack'+i),
           brand:g('ni_brand'+i), cat:g('ni_cat'+i), sup:g('ni_sup'+i), king:g('ni_king'+i),
           combos:combos, edited:Object.assign({}, prev&&prev.edited), approved:(ap?!!ap.checked:(prev?!!prev.approved:false)) };   // §F1: which parser-filled fields the user has since edited (so the "auto-filled" chip doesn't come back)
}
function niRehydrate(i){
  var s=invRows[i]&&invRows[i].newItem; if(!s) return;
  var set=function(id,v){ var e=document.getElementById(id); if(e&&v!=null) e.value=v; };
  set('ni_name'+i,s.name); set('ni_unit'+i,s.unit); set('ni_price'+i,s.price); set('ni_pack'+i,s.pack);
  NI_COMBOS.forEach(function(f){ var id='ni_'+f+i, e=document.getElementById(id), c=s.combos&&s.combos[f];
    if(c){ if(e) e.value=(c.value||''); niCombos[id]={value:(c.value||''), isNew:!!c.isNew, confirmed:!!c.confirmed}; } });
}
function expandNewItem(i){
  var nirow=document.querySelector('.ni-row[data-ni="'+i+'"]'); if(!nirow) return;
  var panel=nirow.querySelector('.ni-panel'), r=invRows[i];
  if(!panel.dataset.built){
    var ut=r.unit==='kg'?'kg':r.unit==='l'?'litre':r.unit==='ea'?'unit':'kg';
    var pv=(r.unitPrice!=null)?r.unitPrice:'';
    // v55 §F1: the "auto-filled" chip must key off fields the PARSER filled, not off emptiness (the old
    // :placeholder-shown CSS lit the chip on ANY typed value). Mark those fields with class "af" at build,
    // omit it for fields the user has already edited (tracked on r.newItem.edited so it survives re-renders),
    // and clear it live on first input below.
    var ed=(r.newItem&&r.newItem.edited)||{};
    function afA(f,filled){ return (filled && !ed[f]) ? ' class="af"' : ''; }
    var src=r.aiSource?'ai':'';                              // v62: an AI-appended row (rule 5) labels its prefilled fields "AI suggested"; a parser-built row keeps "auto-filled". Same chip system.
    panel.innerHTML=''
     +'<button type="button" class="x ni-close" aria-label="Close add-new-item form">\u00d7</button>'
     +'<div class="ni-head">Add new item from this invoice line</div>'
     +'<div class="ni-grid">'
     /* v37: every field is label-line + control-line; the auto-filled chip lives INLINE on the label — one place, every field, no overlap possible */
     +'<label class="ni-f">'+niLab('Name',src)+'<input id="ni_name'+i+'" type="text"'+afA('name',true)+' value="'+esc(r.name)+'"></label>'
     +'<label class="ni-f">'+niLab('Brand',src)+'<span class="cat-wrap"><input id="ni_brand'+i+'" type="text" autocomplete="off" placeholder="search brands\u2026"><span id="ni_brandDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Category',src)+'<span class="cat-wrap"><input id="ni_cat'+i+'" type="text" autocomplete="off" placeholder="search categories\u2026"><span id="ni_catDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Supplier',src)+'<span class="cat-wrap"><input id="ni_sup'+i+'" type="text"'+afA('sup',!!invSupplier)+' autocomplete="off" placeholder="search suppliers\u2026"><span id="ni_supDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Unit type',src)+'<select id="ni_unit'+i+'"'+afA('unit',!!r.unit)+'><option value="kg">per kg</option><option value="g">per g</option><option value="litre">per litre</option><option value="ml">per ml</option><option value="unit">per unit/each</option></select></label>'
     +'<label class="ni-f">'+niLab('Price per unit ($)',src)+'<input id="ni_price'+i+'" type="number" min="0" step="0.01"'+afA('price',pv!=='')+' value="'+pv+'"></label>'
     +'<label class="ni-f">'+niLab('Pack size (optional)',src)+'<input id="ni_pack'+i+'" type="text" placeholder="e.g. 6 x 2.5kg"></label>'
     +'<label class="ni-f ni-full">'+niLab('Kitchen name (optional)',src)+'<span class="cat-wrap"><input id="ni_king'+i+'" type="text" autocomplete="off" placeholder="what the kitchen calls it"><span id="ni_kingDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'</div><div class="ferr" id="ni_err'+i+'" style="display:none"></div>';
    panel.dataset.built='1';
    var _nc=panel.querySelector('.ni-close'); if(_nc){ _nc.onclick=function(ev){ ev.preventDefault(); closeNewItem(i); }; }
    var us=document.getElementById('ni_unit'+i); if(us) us.value=ut;
    makeInlineCombo('ni_brand'+i,'ni_brandDrop'+i,prodBrands);
    makeInlineCombo('ni_cat'+i,'ni_catDrop'+i,prodCategories);
    makeInlineCombo('ni_sup'+i,'ni_supDrop'+i,prodSuppliers);
    // ITEM 5 (v35): the kitchen-name field is now a combobox over EXISTING kitchen words.
    // Typing filters them; picking one re-points that word at this new product on save
    // (the brand-swap case). Typing something new still creates a new linked word.
    // v55 §F2: the kitchen-name field starts BLANK. The combo still suggests existing kitchen words as the
    // user types (rank + pick to repoint, or type a new one) — but nothing is auto-filled, so the form never
    // silently means "repoint this word" without the user choosing it.
    makeInlineCombo('ni_king'+i,'ni_kingDrop'+i,kingNames);
    if(invSupplier){ var _si=document.getElementById('ni_sup'+i); if(_si){ _si.value=invSupplier; var _st=niCombos['ni_sup'+i]; if(_st){ _st.value=invSupplier; _st.confirmed=true; _st.isNew=!prodSuppliers().some(function(x){return x.toLowerCase()===invSupplier.toLowerCase();}); } } }
    // v55 §F1: drop the "auto-filled" mark the instant the user edits a marked field, and remember it was
    // edited so a later re-render doesn't re-mark it (the mark lives on r.newItem.edited).
    var niClearAf=function(e){ var t=e.target; if(t&&t.classList&&t.classList.contains('af')){ t.classList.remove('af'); var f=(t.id||'').replace('ni_','').replace(new RegExp(i+'$'),''); if(f){ r.newItem=r.newItem||{}; r.newItem.edited=r.newItem.edited||{}; r.newItem.edited[f]=true; } } };
    panel.addEventListener('input', niClearAf, true);
    panel.addEventListener('change', niClearAf, true);
  }
  nirow.style.display='';
  // v50 item 1: first open -> snapshot the prefilled defaults onto the row; every later (re)build ->
  // rehydrate from what the user had typed, so an unrelated re-render can't wipe an in-progress item.
  if(r.newItem){ niRehydrate(i); } else { r.newItem=niSnapshot(i); }
}
function collapseNewItem(i){ var nirow=document.querySelector('.ni-row[data-ni="'+i+'"]'); if(nirow) nirow.style.display='none'; }
function closeNewItem(i){
  collapseNewItem(i);
  var r=invRows[i]; if(r){ r.addNew=false; r.bestId=null; r.manualPick=false; r.newItem=null; }   /* dismissing the form = this line is neither new nor matched (skip); drop its saved form state */
  renderInvReview();                                               /* ITEM 1 (v33): single render path rebuilds the row (dropdown back to "assign manually", labelled dashes, unticked) */
}
function invUnitToBase(unitType){
  if(unitType==='kg') return {base_unit:'g', cost_basis:'$/g', div:1000};
  if(unitType==='litre'||unitType==='l') return {base_unit:'ml', cost_basis:'$/ml', div:1000};
  if(unitType==='g') return {base_unit:'g', cost_basis:'$/g', div:1};
  if(unitType==='ml') return {base_unit:'ml', cost_basis:'$/ml', div:1};
  return {base_unit:'ea', cost_basis:'$/unit', div:1};
}
function collectNewItem(i){
  var g=function(id){var e=document.getElementById(id);return e?e.value.trim():'';};
  var errEl=document.getElementById('ni_err'+i); function fail(m){ if(errEl){errEl.textContent=m;errEl.style.display='block';} return null; }
  if(errEl) errEl.style.display='none';
  var name=g('ni_name'+i), price=parseFloat(g('ni_price'+i)), unitType=g('ni_unit'+i), pack=g('ni_pack'+i);
  if(!name) return fail('Enter a product name.');
  if(isNaN(price)||price<0) return fail('Enter a valid price per unit.');
  if(!unitType) return fail('Choose a unit type.');
  if(!g('ni_cat'+i)) return fail('Choose or create a category.');
  var cat=resolveCombo('ni_cat'+i, prodCategories); if(!cat.ok) return fail('\u201c'+cat.value+'\u201d is a new category \u2014 pick \u201cCreate new\u201d from the list to confirm.');
  var br=resolveCombo('ni_brand'+i, prodBrands); if(!br.ok) return fail('\u201c'+br.value+'\u201d is a new brand \u2014 pick \u201cCreate new\u201d to confirm.');
  var sup=resolveCombo('ni_sup'+i, prodSuppliers); if(!sup.ok) return fail('\u201c'+sup.value+'\u201d is a new supplier \u2014 pick \u201cCreate new\u201d to confirm.');
  var ub=invUnitToBase(unitType);
  return {name:name, brand:br.value||null, category:cat.value, supplier:sup.value||null,
          base_unit:ub.base_unit, cost_basis:ub.cost_basis, cpbu:price/ub.div, pack_size_raw:pack||null,
          kingName:(g('ni_king'+i)||null)};
}
/* ---- review table ---- */
function invMatchOptions(r){
  var html='<option value="skip"'+((!r.bestId&&!r.addNew)?' selected':'')+'>\u2014 assign manually \u2014</option>';
  if(r.cands && r.cands.length){
    html+='<optgroup label="Suggested matches">';
    r.cands.forEach(function(c){ var p=byId[c.id]; if(!p)return;
      html+='<option value="'+c.id+'"'+((!r.addNew&&r.bestId===c.id)?' selected':'')+'>'+esc(p.description)+(p.brand?' \u2014 '+esc(p.brand):'')+'  ('+Math.round(c.coverage*100)+'%)</option>'; });
    html+='</optgroup>';
  }
  html+='<optgroup label="All products">'+prodOptions(r.addNew?null:r.bestId)+'</optgroup>';
  return html;
}
function tierOf(cov){ return cov>=0.6?'hi':(cov>=0.3?'mid':'lo'); }  // same thresholds buildInvRows uses
/* ITEM 1 (v33): the Confidence cell's value. A manual pick is NOT missing data — if the chosen
   product is one of the ranked candidates we show its coverage; otherwise we show a labelled
   'manual' token. Never a bare, unexplained dash on a row that has a product. */
function invDisplayConf(r){
  if(r.addNew || !r.bestId) return {tier:'none', label:'\u2014', has:false};
  if(!r.manualPick) return {tier:(r.tier||'lo'), label:Math.round((r.conf||0)*100)+'%', has:true};
  var cand=(r.cands||[]).filter(function(c){return c.id===r.bestId;})[0];
  if(cand){ var pc=Math.round(cand.coverage*100); return {tier:tierOf(cand.coverage), label:pc+'%', has:true}; }
  return {tier:'manual', label:'manual', has:true};
}
function invRowState(r){                                            // ITEM 4: single source of truth — the summary and the cards must never disagree
  if(r.addNew) return 'new';
  if(r.uncertain) return 'review';
  if(!r.bestId) return 'review';                                     // no match / manually-skipped
  if(r.needManual || r.unitMismatch) return 'review';
  if(r.needsAttention) return 'review';                              // price jump etc.
  if(r.gemReview) return 'review';                                   // v62: AI second reader adopted a value P disagreed with + no history to arbitrate (rule 4) — a human confirms. Auto-tick stays pinned to 'matched' below, so this row waits for the user's tick.
  if(r.gemMatchReview) return 'review';                              // v63 item 2: AI suspects the parser matched the WRONG product — a human ticks the right one
  if(r.gemPriceReview) return 'review';                              // v66: AI + price history suggest the parser MISREAD the price — a human checks (price is NOT changed)
  if(r.tier!=='hi') return 'review';                                 // low-confidence match still wants a human tick
  return 'matched';
}
/* v45 item 1: ONE derive-preview formula — the render prefill and the live recompute must never
   disagree, so both read this. Returns '' when the pack maths can't run (no qty / no pack price). */
function invPackPreviewText(r, q, u){
  if(!(q>0)) return '';
  var pack=packPriceOf(r.raw||r.name); if(pack==null) return '';
  var up=(u==='kg'||u==='g') ? pack/(q*(u==='kg'?1:0.001)) : (u==='l'||u==='ml') ? pack/(q*(u==='l'?1:0.001)) : pack/q;
  if(!isFinite(up)||up<0) return '';
  var cat=(u==='kg'||u==='g')?'kg':(u==='l'||u==='ml')?'l':'ea';
  var old=(r.bestId&&byId[r.bestId]&&cpbu(byId[r.bestId])!=null)?dispPrice(byId[r.bestId]):null;
  return (old?('Was '+old+' → '):'')+'will be $'+up.toFixed(2)+(cat==='kg'?'/kg':cat==='l'?'/L':'/unit');
}
function renderInvReview(){
  invRows.forEach(function(r,i){ if(r&&r.addNew&&r.newItem){ var s=niSnapshot(i); if(s) r.newItem=s; } });   // v50 item 1: capture an OPEN new-item form before innerHTML wipes it. Guarded on r.newItem so a fresh addNew row (newItem:null) can't absorb a stale form left in the DOM by a previous invRows/import — only a form THIS row actually opened is re-captured.
  invRows.forEach(flagNeedsAttention);                              // ensure needsAttention is current for EVERY row before we count
  var states=invRows.map(invRowState);
  var matched=states.filter(function(s){return s==='matched';}).length;
  var newc=states.filter(function(s){return s==='new';}).length;
  var review=states.filter(function(s){return s==='review';}).length;
  var html='<div class="inv-sum">'+matched+' matched \u00b7 '+newc+' new \u00b7 '+review+' to review'+gemStatusHtml()+'</div>';
  if(invGst.note) html+='<div class="inv-gst">'+esc(invGst.note)+'</div>';
  html+='<div class="atable-wrap"><table class="invtable"><thead><tr><th>Invoice line</th><th>Unit price</th><th>Match to product</th><th>Old</th><th>Conf.</th><th>Apply</th></tr></thead><tbody>';
  invRows.forEach(function(r,i){
    var conf=Math.round(r.conf*100);
    // ITEM 1 (v35) ROOT CAUSE: style.css hid td4/td5 (Old price / Confidence) off .muted-row, which sits on EVERY non-matched row — so price-jump and low-confidence rows rendered both cells correctly and then had them hidden, exactly where the old price matters most. The hiding now keys off .is-new (add-new lines only); .muted-row keeps its opacity treatment alone.
    var rc=(invRowState(r)==='matched')?'':' muted-row';
    if(r.addNew) rc+=' is-new';
    var uLbl=unitLabelFor(r)||'/unit';
    var pv=(r.unitPrice!=null)?r.unitPrice.toFixed(2):'';
    var unitWordOf=function(u){return u==='ea'?'units':u==='l'?'L':u==='ml'?'mL':(u||'');};
    var upriceHtml='<div class="uprice-edit"><span class="dol">$</span><input type="number" class="invPrice" min="0" step="0.01" placeholder="unit price" value="'+pv+'"><span class="upu">'+uLbl+'</span></div>';
    // v44 item 1: ONE pack control, two moods. The "Pack: N units \u2014 change" chip is gone; every row
    // with pack context shows the same always-visible [qty][unit][\u2713] row, prefilled with the known pack.
    // A mismatch/unresolved row is the SAME control in its red required state (.pt-required) \u2014 no second
    // visual pattern. Resolution logic, precedence, invRowState and what \u2713 writes are all UNCHANGED.
    var teachHtml='';
    if(r.needManual || r.remembered || r.fromProductPack){
      var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, r.raw||r.name)]:null);
      var baseCat0=(r.bestId&&byId[r.bestId])?unitCatCategory(byId[r.bestId].base_unit):null;
      // ITEM 1 (v38): the prefill follows the SAME precedence as pricing — product pack > supplier memory > parser guess. r.taughtQty is only set when resolveMatchedPrice actually applied the product pack, so read the product directly as the next fallback: otherwise a product with a taught pack could still be prefilled with the parser's "1.5 kg" guess, and re-confirming that guess would overwrite the taught pack with it.
      var bprod=(r.bestId&&byId[r.bestId])?byId[r.bestId]:null;
      var prodPack=(bprod && bprod.pack_qty>0 && bprod.pack_unit)?bprod:null;
      var pq=(r.taughtQty!=null&&isFinite(r.taughtQty))?r.taughtQty:(prodPack?prodPack.pack_qty:(mem?mem.qty:''));
      var puNow=r.taughtUnit?r.taughtUnit:(prodPack?prodPack.pack_unit:(mem&&mem.unit?mem.unit:(packCount(r.raw||r.name)?'ea':(baseCat0==='kg'?'kg':baseCat0==='l'?'l':'ea'))));
      var required=(r.needManual && !r.remembered);                // unresolved -> the same control, red required mood
      teachHtml='<span class="pack-teach'+(required?' pt-required':'')+'" data-i="'+i+'">'
        +'<span class="pt-lbl sr-only">How many in one pack?</span>'
        +'<span class="pt-group">'
        +'<input type="number" class="invPackQty" inputmode="decimal" min="0" step="0.01" placeholder="qty" title="How many in one pack?" value="'+pq+'">'
        +'<select class="invPackUnit" aria-label="pack unit">'+['ea','kg','g','l','ml'].map(function(u){var lbl=unitWordOf(u); return '<option value="'+u+'"'+(u===puNow?' selected':'')+'>'+lbl+'</option>';}).join('')+'</select>'
        +'</span>'
        +'<button type="button" class="pt-done" title="Done" aria-label="Done">\u2713</button>'
        +'</span>';
    }
    // v45 item 1: the derive preview is its OWN line under the price+pack row (was an inline chip
    // inside .pack-teach), prefilled from the same precedence the inputs use so it shows before typing.
    // v62: rule-4 rows carry an "AI suggested" chip on the price field — the exact .ni-af chip system,
    // inline-flow (never absolutely positioned) so a wrapped price row pushes it to the next line rather
    // than overlapping. Only on matched (non-add-new) rows; the add-new form has its own label chips.
    var aiChip=(!r.addNew && r.aiSuggested)?'<span class="ai-sug" title="Suggested by the AI second reader">AI suggested</span>':'';
    var priceCell='<div class="price-row">'+upriceHtml+aiChip+teachHtml+'</div>'
      +(teachHtml?'<div class="pt-preview">'+esc(invPackPreviewText(r, parseFloat(pq), puNow))+'</div>':'');
    if(r.needManual && !r.remembered){
      var baseCat=(r.bestId&&byId[r.bestId])?unitCatCategory(byId[r.bestId].base_unit):null;
      var baseWord=baseCat==='kg'?'per kg':baseCat==='l'?'per litre':'per unit';
      var msg=r.unitMismatch ? ('This item was priced '+baseWord+' \u2014 edit the pack size to determine price per unit.') : 'Set the pack, or type the price.';   // v45 item 2 wording
      priceCell+='<div class="flag-review pt-explain">'+esc(msg)+'</div>';   // raw invoice line removed (was clutter); logged to console for debugging
      try{ if(window.console&&r.unitMismatch) console.debug('[inv mismatch]', r.raw||r.name); }catch(e){}
    }
    var dc=invDisplayConf(r);                                    // ITEM 1 (v35): hoisted — the DISPLAYED confidence drives the low-match cue, so the token and the % can never contradict each other
    var lowMatch=(dc.tier==='mid'||dc.tier==='lo');              // fires only when a % is shown and that % isn't high. Never on a hand-picked row ('manual') or one with no product ('none') — the user already made that call.
    var flag=r.uncertain?' <span class="flag-review">is this a product?</span>':(r.unitMismatch?' <span class="flag-mismatch">unit mismatch</span>':(r.bestId?(r.gemMatchReview?' <span class="flag-review">check match</span>':(r.gemPriceReview?' <span class="flag-review">check price</span>':(r.needsAttention?' <span class="flag-review">price change \u2014 check</span>':(lowMatch?' <span class="flag-review">low match \u2014 check</span>':'')))):(r.addNew?' <span class="flag-new">new item</span>':' <span class="flag-review">no match</span>')));   // ITEM 4 (v34): the red row treatment is never the only signal. Precedence: uncertain > mismatch > suspected wrong match (v63) > AI price-check (v66) > price jump > low match.
    var checked = (invRowState(r)==='matched') || !!(r.newItem && r.newItem.approved);  // only clean hi-confidence matches auto-apply; everything else waits for the user's tick. v50 item 1: once the user ticks a new-item row, that tick persists on r.newItem so a re-render can't drop it (v39 still holds — rows with no newItem never pre-tick)
    var chips='';
    if(!r.addNew && r.cands && r.cands.length>1){                 // multiple plausible matches: surface the real choices immediately
      chips='<div class="cand-chips">'+r.cands.slice(0,3).map(function(c){
        var p=byId[c.id]; if(!p) return '';
        var nm=p.description+(p.brand?' \u00b7 '+p.brand:''); if(nm.length>34) nm=nm.slice(0,32)+'\u2026';
        return '<button type="button" class="cand-chip'+((!r.addNew&&r.bestId===c.id)?' sel':'')+(c.ai?' ai':'')+'" data-i="'+i+'" data-cid="'+esc(c.id)+'">'+(c.ai?'<span class="cc-ai" title="Suggested by the AI second reader">AI</span> ':'')+esc(nm)+' <span class="cc-pct">'+Math.round(c.coverage*100)+'%</span></button>';   // v63 item 2: the AI-suspected product is ranked first and carries the same accent chip system (see .cc-ai)
      }).join('')+'</div>';
    }
    var matchCell = r.addNew
      ? '<button class="btn ni-add-btn" type="button" data-add="'+i+'">+ Add as New Item</button>'
      : '<div class="match-cell">'+chips+'<select class="invSel">'+invMatchOptions(r)+'</select>'
        +'<button class="btn ni-add-btn ni-add-alt" type="button" data-add="'+i+'">+ New</button></div>';
    // ITEM 1 (v33): a matched row — auto OR manual — always shows the linked product's current price and a real confidence.
    // Only a row with no product shows a dash, and it keeps its mobile label so the line never silently vanishes.
    var oldCell = (r.bestId && byId[r.bestId])
      ? '<td class="num invOld">'+dispPrice(byId[r.bestId])+'</td>'
      : '<td class="num invOld dash">\u2014</td>';
    var confCell = '<td class="num'+(dc.has?'':' dash')+'"><span class="conf '+dc.tier+'">'+dc.label+'</span></td>';
    html+='<tr class="inv-data'+rc+(r.needsAttention?' needs-attention':'')+' st-'+invRowState(r)+'" data-i="'+i+'">'+   // v37: the tint and the summary can never disagree — both read invRowState
      '<td>'+esc(r.name)+flag+'</td>'+
      '<td class="num">'+priceCell+'</td>'+
      '<td>'+matchCell+'</td>'+
      oldCell+
      confCell+
      '<td style="text-align:center"><input type="checkbox" class="invAppr"'+(checked?' checked':'')+'></td></tr>';
    html+='<tr class="ni-row" data-ni="'+i+'" style="display:none"><td colspan="6"><div class="ni-panel"></div></td></tr>';
  });
  html+='</tbody></table></div><div class="inv-actions"><button class="btn primary" id="invApply" type="button">Confirm All</button> <span class="hint">Only ticked rows are saved when you tap Confirm All.</span></div>';
  var box=document.getElementById('invReview'); box.innerHTML=html; box.style.display='block';
  box.querySelectorAll('.invSel').forEach(function(sel){ sel.onchange=function(){invSelChanged(sel.closest('tr'));}; });
  box.querySelectorAll('.invPrice').forEach(function(inp){                 // ITEM 7 root cause: editing the price never recomputed needs-attention, so a clearly-different price failed to turn red
    inp.addEventListener('change', function(){
      var tr=inp.closest('tr'); if(!tr) return; var i=parseInt(tr.dataset.i,10); var r=invRows[i]; if(!r) return;
      var v=parseFloat(inp.value); r.unitPrice=(!isNaN(v)&&v>=0)?v:null;
      if(r.bestId && byId[r.bestId] && (!r.unit || r.unit==='auto')){ var b=byId[r.bestId].base_unit; r.unit=(b==='g'?'kg':b==='ml'?'l':'ea'); }
      r.needManual=(r.unitPrice==null && !r.packTaught);
      r.gemPriceReview=false;                                              // v66: the human just set the price — the AI price-check is resolved
      renderInvReview();                                                   // full repaint so the red state, summary counts and Apply tick all stay consistent (fires on blur, not per keystroke)
    });
  });
  box.querySelectorAll('.pack-teach').forEach(function(pt){
    function recompute(){
      var tr=pt.closest('tr'); if(!tr) return; var i=parseInt(pt.getAttribute('data-i'),10); var r=invRows[i]; if(!r) return;
      var q=parseFloat(pt.querySelector('.invPackQty').value); var u=pt.querySelector('.invPackUnit').value;
      if(!(q>0)) return;
      var pack=packPriceOf(r.raw||r.name); if(pack==null) return;
      var up = (u==='kg'||u==='g') ? pack/(q*(u==='kg'?1:0.001)) : (u==='l'||u==='ml') ? pack/(q*(u==='l'?1:0.001)) : pack/q;
      var cat=(u==='kg'||u==='g')?'kg':(u==='l'||u==='ml')?'l':'ea';
      if(isFinite(up)&&up>=0){
        r.unitPrice=up; r.unit=cat; r.needManual=false; r.unitMismatch=false; r.packTaught=true; r.taughtQty=q; r.taughtUnit=u;   // the unit chosen HERE is the one that gets written — full stop
        var pin=tr.querySelector('.invPrice'); if(pin) pin.value=up.toFixed(2);
        var upu=tr.querySelector('.upu'); if(upu) upu.textContent=unitLabelFor(r);
        var badge=tr.querySelector('.flag-mismatch'); if(badge) badge.style.display='none';
        var pvEl=tr.querySelector('.pt-preview');                  // v45 item 1: the preview line lives under .price-row now, not inside .pack-teach
        if(pvEl){ pvEl.textContent=invPackPreviewText(r, q, u); }
        var ap=tr.querySelector('.invAppr'); if(ap)ap.checked=(invRowState(r)==='matched');   // v39: a flagged row never auto-ticks
      }
    }
    pt.querySelector('.invPackQty').addEventListener('input', recompute);
    pt.querySelector('.invPackUnit').addEventListener('change', recompute);
  });
  box.querySelectorAll('.pt-done').forEach(function(d){ d.onclick=function(){ renderInvReview(); }; });
  box.querySelectorAll('.cand-chip').forEach(function(ch){ ch.onclick=function(){
    var tr=ch.closest('tr'); if(!tr) return; var i=parseInt(tr.dataset.i,10);
    var sel=tr.querySelector('.invSel'); if(!sel) return;
    sel.value=ch.getAttribute('data-cid');
    invSelChanged(tr);                                             // updates row data + full re-render (this tr is now detached)
    var fresh=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]');   // re-query the rebuilt row; the selected chip's .sel + % come from render
    var ap=fresh&&fresh.querySelector('.invAppr'); if(ap) ap.checked=(invRowState(invRows[i])==='matched');
  }; });
  box.querySelectorAll('.ni-add-btn').forEach(function(b){ b.onclick=function(){
    var i=parseInt(b.getAttribute('data-add'),10), tr=b.closest('tr'), r=invRows[i];
    if(b.classList.contains('open')){ closeNewItem(i); return; }   /* second tap collapses */
    if(r){ r.addNew=true; r.bestId=null; r.manualPick=false; }      /* reject any prior match, this line becomes a new item */
    renderInvReview();                                              /* ITEM 1 (v33): single path — row becomes "new", Old/Conf render as labelled dashes */
    expandNewItem(i);                                              /* then open the form on the freshly-rendered row */
    var fresh=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]');
    var fb=fresh&&fresh.querySelector('.ni-add-btn'); if(fb){ fb.classList.add('open'); fb.textContent='Editing new item \u2193'; }
    var ap=fresh&&fresh.querySelector('.invAppr'); if(ap) ap.checked=false;   // v39: new items are ticked by the user once the form is filled
  }; });
  document.getElementById('invApply').addEventListener('click',confirmApplyInvoice);
  invRows.forEach(function(r,i){                                   // v50 item 1: re-open + rehydrate any new-item form that was open before this rebuild
    if(r&&r.addNew&&r.newItem){
      expandNewItem(i);
      var fresh=document.querySelector('#invReview tr.inv-data[data-i="'+i+'"]'), fb=fresh&&fresh.querySelector('.ni-add-btn');
      if(fb){ fb.classList.add('open'); fb.textContent='Editing new item ↓'; }
    }
  });
  updateLastImport();
}
var PRICE_JUMP=0.12;                                              // >12% move vs the stored price is worth a glance
function flagNeedsAttention(row){                                  // ITEM 4: one skimmable signal per row (display only)
  var priceJump=false;
  if(row.bestId && byId[row.bestId] && !row.unitMismatch && !row.needManual && row.unitPrice>0){
    var p=byId[row.bestId], cur=cpbu(p);
    if(cur!=null && cur>0){
      var curPerRowUnit = p.base_unit==='g'?cur*1000 : p.base_unit==='ml'?cur*1000 : cur;   // stored price expressed in the row's unit
      // v55 §E1: compare at CENT precision (CLAUDE.md rounding rule). Two prices that both DISPLAY as the
      // same $x.xx must never flag a "price change" — the old test ran on unrounded floats, so 0.01 vs 0.01
      // (differing only past the cent) tripped the alert.
      var sameAtCent = Math.round(row.unitPrice*100)===Math.round(curPerRowUnit*100);
      if(!sameAtCent && Math.abs(row.unitPrice-curPerRowUnit)/curPerRowUnit > PRICE_JUMP) priceJump=true;
    }
  }
  row.needsAttention = !!(row.unitMismatch || (row.needManual && !row.remembered) || priceJump);
  return row.needsAttention;
}
/* ===================================================================================
   v62: AI second reader (Reader 2 / Gemini) — request + merge. Everything here wraps
   AROUND the existing parser and review flow; it never edits the protected region and
   changes nothing when the network is absent. See handovers/HANDOVER-v62.md for the
   rule-by-rule rationale and the chosen plausibility band.
   =================================================================================== */
var GEM_BAND=0.5;                                                  // rule 3 plausibility band: adopt a reading only if within ±50% of price history H
var GEM_MIN_VISIBLE=900;                                           // v63: minimum ms the "AI double-checking…" note stays up before the result flips it — stops a fast/failed response from flickering the note past unread
/* v63: run a terminal status flip (checked/unavailable + render) but never before the
   "checking" note has been visible GEM_MIN_VISIBLE ms. Re-checks staleness INSIDE the delay
   so a fresh parse (gemToken bumped) or an applied import (gemApplied) still wins the ruling. */
function gemSettle(token, fn){
  var wait=GEM_MIN_VISIBLE-(Date.now()-gemCheckStart);
  var go=function(){ if(token!==gemToken || gemApplied) return; fn(); };
  if(wait<=0) go(); else setTimeout(go, wait);
}
function gemStatusHtml(){                                          // appended to the .inv-sum summary line
  if(gemStatus==='checking')    return ' <span class="ai-status ai-checking">AI double-checking…</span>';
  if(gemStatus==='checked')     return ' <span class="ai-status ai-ok">✓ AI checked</span>';   // CSS fades this out after a beat
  if(gemStatus==='unavailable') return ' <span class="ai-status ai-off">AI check unavailable</span>';
  return '';
}
/* Fire ONE background request. Offline / failed / slow / stale all degrade silently to
   today's app: no error modal, no retry — the summary note just reads "unavailable". */
function gemFireSecondReader(text){
  var token=(++gemToken);                                          // this request's identity; a newer parse/openInv invalidates it
  var ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
  var timer=setTimeout(function(){ if(ctrl) ctrl.abort(); },20000);   // client-side ~20s; late = discarded
  var done=function(payload){
    clearTimeout(timer);
    if(token!==gemToken || gemApplied) return;                    // late/stale response loses — human ruling & fresh parses win
    gemSettle(token, function(){                                  // v63: hold the "checking" note visible long enough to read before flipping
      if(payload && payload.status==='ok'){ gemApplyReadings(payload); }
      else { gemStatus='unavailable'; renderInvReview(); }
    });
  };
  try{
    if(typeof fetch!=='function'){ clearTimeout(timer); gemSettle(token, function(){ gemStatus='unavailable'; renderInvReview(); }); return; }
    fetch('/api/parse-invoice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text}),signal:ctrl?ctrl.signal:undefined})
      .then(function(res){ return res.ok?res.json():null; })
      .then(function(payload){ done(payload); })
      .catch(function(){ done(null); });                          // network error / abort / offline
  }catch(e){ done(null); }
}
/* Convert a (price, unit) reading to a canonical {cat, per} — per-kg / per-litre / per-each —
   so parser, Gemini and history compare on the same basis (mirrors flagNeedsAttention's curPerRowUnit). */
function gemCanon(price, unit){
  if(price==null || !isFinite(price) || price<=0) return null;
  unit=(unit||'').toString().toLowerCase();
  if(unit==='g')  return {cat:'kg', per:price*1000};
  if(unit==='kg') return {cat:'kg', per:price};
  if(unit==='ml') return {cat:'l',  per:price*1000};
  if(unit==='l')  return {cat:'l',  per:price};
  if(unit==='ea') return {cat:'ea', per:price};
  return null;                                                    // unknown/auto — not comparable
}
function gemHist(prod){                                            // price history H for a matched product, canonicalised
  if(!prod) return null; var c=cpbu(prod); if(c==null || !(c>0)) return null;
  if(prod.base_unit==='g')  return {cat:'kg', per:c*1000};
  if(prod.base_unit==='ml') return {cat:'l',  per:c*1000};
  return {cat:'ea', per:c};
}
function gemPackEq(a,b){                                           // pack counts equal, or both unknown
  var an=(a==null||a===''||!isFinite(a))?null:a, bn=(b==null||b===''||!isFinite(b))?null:b;
  if(an==null && bn==null) return true;
  if(an==null || bn==null) return false;
  return Math.round(an)===Math.round(bn);
}
/* PURE per-line merge — the whole rule table lives here so tests can pin it against canned
   Gemini readings with no DOM and no live API. Inputs are primitives; output is a decision the
   applier acts on. P=parser reading, G=Gemini reading, H=canonical price history|null, T=taught.
   Returns {rule, action:'keep'|'adopt', winner, unitPrice?, unit?, flagged?}. 'adopt' values are
   always canonical (per kg/l/ea) so the caller writes them straight onto the row. */
function gemMergeLine(P, G, H, T, opts){
  opts=opts||{}; var band=(opts.band!=null?opts.band:GEM_BAND);
  if(T) return {rule:1, action:'keep', winner:'T'};               // rule 1: a taught pack / supplier memory already resolved this line — no conflict ever shown
  var gc=gemCanon(G&&G.derivedUnitPrice, G&&G.unitType);
  if(!gc) return {rule:6, action:'keep', winner:'P'};             // Gemini gave no usable reading → parser stands (rule 6)
  var pc=gemCanon(P&&P.unitPrice, P&&P.unit);
  if(!pc) return {rule:4, action:'adopt', winner:'G', unitPrice:gc.per, unit:gc.cat, flagged:true};   // parser had nothing, Gemini does → adopt as a flagged review
  if(pc.cat===gc.cat && Math.round(pc.per*100)===Math.round(gc.per*100) && gemPackEq(P&&P.packCount, G&&G.packCount))
    return {rule:2, action:'keep', winner:'P=G'};                 // rule 2: P ≈ G at cent precision, same unit, packs agree → verified silently
  // v66: parser HAS a price and Gemini disagrees. MONEY STAYS DETERMINISTIC — the AI NEVER overrules the
  // parser's price (Gemini misreads/hallucinates). Only FLAG for a human when price HISTORY independently
  // shows the parser's number is off (parser out of the band, Gemini inside it). Otherwise the parser
  // stands, silently — we can't say who's right, and the deterministic reader is the backbone. (Pre-v66
  // this ADOPTED Gemini's price, which overruled correct parser readings once the API went live.)
  if(H && H.per>0){
    var lo=H.per*(1-band), hi=H.per*(1+band);
    var pIn=(pc.cat===H.cat && pc.per>=lo && pc.per<=hi);
    var gIn=(gc.cat===H.cat && gc.per>=lo && gc.per<=hi);
    if(!pIn && gIn) return {rule:3, action:'flag', winner:'review', gPer:gc.per, gCat:gc.cat, H:H.per};   // parser looks wrong per history → flag "check price"; the price is NOT changed
  }
  return {rule:7, action:'keep', winner:'P'};                    // can't adjudicate → parser stands, silent
}
/* v63 item 2 / v65 WIDENED — suspected WRONG MATCH. PURE (tests pin it): decide whether Gemini's
   line points at a DIFFERENT product than the parser's local match. Mirrors the price rules — never
   silent, never auto-applies; the caller only FLAGS the row "check match" and ranks the AI product
   first, the human ticks. All inputs are primitives so it needs no DOM/PRODUCTS: aiCands is
   rankCandidates(g.description) already computed by the caller; gCanon/localHist/suggHist are
   canonical {cat,per} readings.
   v65: DECOUPLED from the parser's own confidence. The old rule required Gemini's pick to beat the
   parser's CONFIDENCE (top.coverage >= localCov+0.15), so a wrong match the parser was SURE about —
   the common, painful case — never got flagged. Now the only comparison that matters is how the
   parser's product ranks against Gemini's OWN description (localInAi): if Gemini clearly prefers a
   different product (margin >= 0.15) and that product is a real match (>=0.45), flag it — however
   confident the parser was. A thinner name match (>=0.3) still needs price-history corroboration. */
function gemMatchSuspect(o){
  o=o||{}; var band=(o.band!=null?o.band:GEM_BAND);
  var cands=o.aiCands||[]; if(!cands.length) return {suspect:false};
  var top=cands[0]; if(!top || top.id==null) return {suspect:false};
  if(top.id===o.bestId) return {suspect:false};                   // Gemini agrees with the local match → nothing to flag
  // How strongly Gemini's OWN ranking of its description rates the parser's current match. If the
  // parser's pick is a near-tie for Gemini's pick, that's ambiguity (e.g. two similar chips), not a
  // wrong match — defer to the price merge. Absent from the list → Gemini truly points elsewhere.
  var localInAi=0;
  for(var ci=0;ci<cands.length;ci++){ if(cands[ci] && cands[ci].id===o.bestId){ localInAi=cands[ci].coverage||0; break; } }
  if(top.coverage-localInAi < 0.15) return {suspect:false};       // Gemini doesn't clearly prefer a different product
  var inBand=function(h){ return !!(h && o.gCanon && h.cat===o.gCanon.cat && o.gCanon.per>=h.per*(1-band) && o.gCanon.per<=h.per*(1+band)); };
  var suggPlausible=inBand(o.suggHist), localPlausible=inBand(o.localHist);
  var corroborated=!!(suggPlausible && !localPlausible);          // price fits the AI product, not the local one — the mis-match explains the "jump"
  var strongName=(top.coverage>=0.45);                            // Gemini names a real, clearly-better-matching product (no longer gated on parser confidence)
  var priceBacked=(top.coverage>=0.3 && corroborated);           // thinner name match, but price history backs the swap
  if(!(strongName || priceBacked)) return {suspect:false};
  return {suspect:true, suggestId:top.id, coverage:top.coverage, corroborated:corroborated};
}
/* A row the human has already ruled on is frozen — a late AI result never re-opens it. */
function gemRowLocked(r){
  if(!r) return true;
  if(r.manualPick) return true;                                   // user picked the match
  if(r.newItem && r.newItem.approved) return true;                // user ticked a new item
  return false;
}
function gemNormKey(s){ try{ return normalizePhrase(s||''); }catch(e){ return String(s||'').toLowerCase().trim(); } }
/* Apply a validated payload: reconcile each matched line, then append Gemini-only lines. Mutates
   invRows in place and does ONE full-row re-render (open new-item forms survive it, v50 fix). */
function gemApplyReadings(payload){
  if(!payload || payload.status!=='ok' || !Array.isArray(payload.lines)){ gemStatus='unavailable'; renderInvReview(); return; }
  // index Gemini lines by normalized rawText/description so a P row can find its G reading
  var gmap={};
  payload.lines.forEach(function(g,gi){
    [g.rawText, g.description].forEach(function(k){ var n=gemNormKey(k); if(n && gmap[n]==null) gmap[n]=gi; });
  });
  var usedG={};
  invRows.forEach(function(r){
    if(gemRowLocked(r) || r.addNew) return;                       // human-ruled or already an add-new line → leave it
    var n1=gemNormKey(r.raw||r.name), n2=gemNormKey(r.name);
    var gi=(gmap[n1]!=null)?gmap[n1]:(gmap[n2]!=null?gmap[n2]:null);
    if(gi==null) return;                                          // rule 6: parser found it, Gemini didn't — no flag from absence
    usedG[gi]=true;
    var g=payload.lines[gi];
    var T=!!(r.remembered || r.fromProductPack || r.packTaught || r.taughtQty!=null);
    var H=(r.bestId && byId[r.bestId])?gemHist(byId[r.bestId]):null;
    // v63 item 2: BEFORE reconciling price, ask whether Gemini's text points at a DIFFERENT product
    // than the parser's match. Only for an already-matched, non-taught row (a wrong match to override,
    // not an unmatched line the chips already surface). If suspected, flag "check match", rank the AI
    // product first, and SKIP the price merge — the mis-match, not a real rise, explains any price gap.
    if(r.bestId && !T){
      var aiCands=rankCandidates(g.description||g.rawText)||[];
      var gCanon=gemCanon(g.derivedUnitPrice, g.unitType);
      var suggHist=(aiCands[0] && byId[aiCands[0].id])?gemHist(byId[aiCands[0].id]):null;
      var sus=gemMatchSuspect({bestId:r.bestId, localCov:r.conf, aiCands:aiCands, gCanon:gCanon, localHist:H, suggHist:suggHist, band:GEM_BAND});
      if(sus.suspect){
        r.gemMatchReview=true; r.gemSuggestId=sus.suggestId; r.gemSuggestCorrob=sus.corroborated;
        r.cands=(r.cands||[]).filter(function(c){ return c.id!==sus.suggestId; });
        r.cands.unshift({id:sus.suggestId, coverage:sus.coverage, ai:true});   // AI product ranked first, marked for the chip
        r.cands=r.cands.slice(0,3);
        try{ if(window.console&&console.debug) console.debug('[inv AI] "'+(r.name||'')+'" check-match → '+sus.suggestId+(sus.corroborated?' (price-corroborated)':'')); }catch(e){}
        return;                                                     // do NOT also run the price merge / raise a price-change flag on this row
      }
    }
    var Pc=packCount(r.raw||r.name);
    var dec=gemMergeLine({unitPrice:r.unitPrice, unit:r.unit, packCount:Pc},
                         {derivedUnitPrice:g.derivedUnitPrice, unitType:g.unitType, packCount:g.packCount}, H, T, {band:GEM_BAND});
    gemDiag(r, dec, H);
    if(dec.action==='adopt'){                                      // ONLY when the parser had NO price (rule 4) — filling a blank, never overruling a reading
      r.unitPrice=dec.unitPrice; r.unit=dec.unit; r.needManual=false; r.unitMismatch=false;
      if(dec.flagged){ r.gemReview=true; r.aiSuggested=true; }     // flagged, unticked, AI-suggested chip on the price field
    } else if(dec.action==='flag'){                                // v66: rule 3 — history says the parser looks wrong. FLAG only; the parser's price is left untouched.
      r.gemPriceReview=true;
    }
  });
  // rule 5: lines Gemini found that the parser dropped entirely → append as unticked add-new cards,
  // prefilled with AI-suggested chips, run through the standard matching. Never auto-applied.
  payload.lines.forEach(function(g,gi){
    if(usedG[gi]) return;
    var name=g.description||g.rawText; if(!name) return;
    var already=invRows.some(function(r){ var n=gemNormKey(r.raw||r.name); return n && n===gemNormKey(g.rawText||g.description); });
    if(already) return;                                           // don't duplicate a P row we simply couldn't key-match
    var gc=gemCanon(g.derivedUnitPrice, g.unitType);
    var cands=rankCandidates(name); var top=cands.length?cands[0].coverage:0;
    invRows.push({ name:name, raw:g.rawText||name, unitPrice:(gc?gc.per:null), unit:(gc?gc.cat:'auto'), rawUnit:'auto',
      needManual:(gc==null), uncertain:false, cands:cands, bestId:null, conf:top,
      tier:(top>=0.6?'hi':(top>=0.3?'mid':'lo')), addNew:true, newItem:null, remembered:false,
      gemNew:true, aiSource:true });                              // aiSource → the new-item form labels its chips "AI suggested"
  });
  gemStatus='checked';
  renderInvReview();
}
function gemDiag(r, dec, H){                                       // diagnostics for Max — invisible to users
  try{ if(window.console&&console.debug&&dec&&dec.rule){
    console.debug('[inv AI] "'+(r.name||'')+'" rule '+dec.rule+' → '+dec.winner+(dec.action==='adopt'?' (adopted)':'')+(H?(' | H=$'+H.per.toFixed(2)+'/'+H.cat):''));
  } }catch(e){}
}
function invSelChanged(tr){
  var i=parseInt(tr.dataset.i,10), r=invRows[i]; if(!r) return;
  var sel=tr.querySelector('.invSel'), old=tr.querySelector('.invOld'), appr=tr.querySelector('.invAppr');
  r.addNew=false; r.newItem=null; collapseNewItem(i);   // v50 item 1: picking a real match abandons any in-progress new-item form
  r.gemMatchReview=false; r.gemSuggestId=null;          // v63 item 2: the human has now ruled on the match — the "check match" flag is spent
  r.gemPriceReview=false;                               // v66: a new match re-derives the price — any AI price-check is moot
  if(sel.value==='skip'){ r.bestId=null; r.manualPick=false; r.needsAttention=false; renderInvReview(); return; }  // one render path — no per-cell poking
  // switching the matched product: throw away any half-done pack-teach state and resolve cleanly for the NEW product
  r.remembered=false; r.unitMismatch=false; r.needManual=(r.unitPrice==null); r.taughtQty=null; r.taughtUnit=null; r.packTaught=false; r.unit=(r.rawUnit||r.unit||'auto');
  r.bestId=sel.value;
  r.manualPick=true;                                             // ITEM 1 (v33): flags the confidence SOURCE (show this pick's coverage, or "manual") — it no longer blanks anything
  var np=byId[sel.value];
  var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, r.raw||r.name)]:null);
  resolveMatchedPrice(r, np?{pack_qty:np.pack_qty, pack_unit:np.pack_unit, base_unit:np.base_unit}:null, mem);   // re-derive against the new match
  flagNeedsAttention(r);
  renderInvReview();                                              // repaint the row (and its pack-teach) fresh for the new product
}
function confirmApplyInvoice(){                                   // last chance: show what WON'T be applied before finishing
  var boxEl=document.getElementById('invReview'); if(!boxEl){ applyInvoice(); return; }
  var un=[];
  invRows.forEach(function(r,i){
    if(!(r&&(r.bestId||r.addNew))) return;
    var tr=boxEl.querySelector('tr.inv-data[data-i="'+i+'"]'); var cb=tr&&tr.querySelector('.invAppr');
    if(cb && !cb.checked) un.push(r.name||('line '+(i+1)));
  });
  if(!un.length){ applyInvoice(); return; }
  var list=un.slice(0,8).map(function(n){return '\u2022 '+n;}).join('\n')+(un.length>8?('\n\u2022 +'+(un.length-8)+' more'):'');
  askConfirm(un.length+' line'+(un.length===1?'':'s')+' won\u2019t be applied', list+'\n\nGo back to tick them, or finish without.', 'Finish import', applyInvoice);
}
function applyInvoice(){
  gemApplied=true;                                                // v62: the import is being applied — a late AI response must never re-open or alter it (human ruling is final)
  var specs={}, ok=true;                                          // validate all approved new items first (atomic)
  document.querySelectorAll('#invReview tbody tr.inv-data').forEach(function(tr){
    var i=parseInt(tr.dataset.i,10), r=invRows[i]; var appr=tr.querySelector('.invAppr');
    if(!r||!appr||!appr.checked) return;
    if(r.addNew){ var s=collectNewItem(i); if(!s){ ok=false; } else specs[i]=s; }
  });
  if(!ok){ toast('Fix the highlighted new item before confirming'); return; }
  var n=0, added=0, learned=[]; var priceChanges=[]; var overBefore=dishesOverTarget(); var kingsMade=0; var kingRepoints=[];
  document.querySelectorAll('#invReview tbody tr.inv-data').forEach(function(tr){
    var i=parseInt(tr.dataset.i,10), r=invRows[i]; var appr=tr.querySelector('.invAppr');
    if(!r||!appr||!appr.checked) return;
    if(r.addNew){
      var s=specs[i]; if(!s) return;
      var id='CX'+Date.now().toString(36)+i;
      setOverride(id, {id:id, description:s.name, brand:s.brand, category:s.category, sub_category:null,
        item_type:null, search_aliases:[], base_unit:s.base_unit, cost_per_base_unit:s.cpbu,
        cost_basis:s.cost_basis, is_food:true, pack_size_raw:s.pack_size_raw, sold_by:null,
        current_price_exgst:null, supplier:s.supplier});
      // ITEM 5 (v35): create, re-link, or nothing — never a silent skip. Creates are pushed
      // immediately so nextKid() can't collide; re-links are DEFERRED to after this loop
      // because they may need a confirm, and a confirm cannot block a write loop mid-flight.
      var kact=kingNameAction(s.kingName, kitchenIngredients);
      if(kact.action==='create'){ kitchenIngredients.push({id:nextKid(), name:kact.name, pid:id}); kingsMade++; }
      else if(kact.action==='repoint'){ kingRepoints.push({kid:kact.kid, name:kact.name, pid:id}); }
      added++;
    } else {
      var pid=r.bestId; if(!pid) return; var p=byId[pid]; if(!p) return;
      var up=r.unitPrice; var inp=tr.querySelector('.invPrice'); if(inp){ var v=parseFloat(inp.value); up=(!isNaN(v)&&v>=0)?v:null; }
      if(up==null||isNaN(up)) return;                              // never store without a real unit price
      var priceUnit=(r.unit==='kg'||r.unit==='l'||r.unit==='ea')?r.unit:(p.base_unit==='g'?'kg':p.base_unit==='ml'?'l':'ea');
      var ub2=unitToBaseFields(priceUnit);                         // the unit beside the input is the one and only unit written
      var oldC=cpbu(p); var newC=up/ub2.div;
      setOverride(pid,{cost_per_base_unit:newC, base_unit:ub2.base_unit, cost_basis:ub2.cost_basis}); n++;
      logIngPrice(pid, newC);                                       // record the new price point (builds cost-range history)
      if(oldC!=null && Math.abs(newC-oldC)>Math.abs(oldC)*0.005){ priceChanges.push({name:p.description||r.name, oldC:oldC, newC:newC, unit:ub2.base_unit, dir:(newC>oldC?1:-1), pctAbs:Math.abs((newC-oldC)/oldC)*100}); }
    }
    // ITEM 1 (v38) ROOT CAUSE: the product-pack write lived INSIDE this supplier-memory block, so it was gated on normSupplier(invSupplier). A pack belongs to the PRODUCT — 105 slices in a bag is 105 slices whoever invoiced it — but invSupplierDetect returns '' by design when it can't read the letterhead ("no guess"), which made the whole block skip and silently dropped the teach, while the price write above (ungated) still saved. That is why the old price survived as $0.200/unit but the pack vanished. The pack write is now unconditional; supplier memory keeps its own gate, which it genuinely needs because it is keyed supplier+phrase.
    if(r.needManual || r.remembered || r.packTaught){
      var pt=tr.querySelector('.pack-teach'); var qEl=pt?pt.querySelector('.invPackQty'):null; var uEl=pt?pt.querySelector('.invPackUnit'):null;
      var rUnit=(r.unit==='kg'||r.unit==='l'||r.unit==='ea')?r.unit:'ea';
      var q=qEl?parseFloat(qEl.value):NaN, u=(uEl&&uEl.value)?uEl.value:rUnit;
      if(!(q>0)){                                                   // fallback: derive qty from the entered unit price
        var pin2=tr.querySelector('.invPrice'); var entered=pin2?parseFloat(pin2.value):NaN; var pack=packPriceOf(r.raw||r.name);
        if(pack!=null && entered>0){ var derived=pack/entered; if(isFinite(derived)&&derived>0){ if(Math.abs(derived-Math.round(derived))<=0.02) derived=Math.round(derived); q=derived; u=rUnit; } }
      }
      if(q>0){
        if(r.bestId && byId[r.bestId]){                             // the product pack — written whoever the supplier is, or teach-once never survives
          var bp=byId[r.bestId];
          if(bp.pack_qty!==q || (bp.pack_unit||'')!==(u||'')) setOverride(r.bestId, {pack_qty:q, pack_unit:u});
        }
        if(normSupplier(invSupplier)){                              // supplier memory is keyed supplier+phrase — it cannot be stored without a supplier
          var key=memKey(invSupplier, r.raw||r.name); var before=supplierMem[key];
          rememberSupplierPhrase(invSupplier, r.raw||r.name, q, u, r.bestId||null);
          if(!before || before.qty!==q || before.unit!==u) learned.push({phrase:r.name, qty:q, unit:u});
          if(r.bestId && byId[r.bestId]) syncMemoryToProduct(r.bestId, q, u);   // keep memory and product in step
        }
      }
    }
  });
  if(priceChanges.length) saveIngLog();
  // ITEM 5 (v35): settle the deferred re-links. Clean ones commit now; ones where the
  // ingredient's unit category disagrees with the new product go through the SAME guard
  // saveKingModal uses. The ask is batched into one confirm rather than chained per-item:
  // askConfirm has no cancel hook, so a chain would silently drop everything after a
  // cancel — which is the exact failure this item exists to remove.
  var relinked=0, guarded=[];
  kingRepoints.forEach(function(rp){
    var k=kById[rp.kid]; if(!k) return;
    var oldP=byId[k.pid], newP=byId[rp.pid];
    if(kingRepointGuard(oldP?oldP.base_unit:null, newP?newP.base_unit:null).needsConfirm){ guarded.push(rp); return; }
    k.pid=rp.pid; relinked++;
  });
  var kingsTouched=(kingsMade||relinked);
  if(kingsTouched){ saveKitchenIngredients(); renderKitchenPanel(); }
  if(n||added){ var iso=new Date().toISOString(); try{localStorage.setItem('cafeDB_lastImport',iso);}catch(e){} dbSetSetting('last_invoice_import',iso); logHistory(); }
  renderPlate(); renderAnalysis(); updateLastImport();
  var overAfter=dishesOverTarget();
  if(learned.length){ var L=learned[0]; toast('EzPlate will remember: "'+L.phrase+'" = '+ (L.qty%1===0?L.qty:L.qty.toFixed(2)) +' '+(L.unit==='ea'?'units':L.unit)+(learned.length>1?(' (+'+(learned.length-1)+' more)'):'')); }
  closeInv();                                                     // stay on whatever tab the user imported from
  if(n||added){ showImportSummary(priceChanges, added, overBefore, overAfter, {made:kingsMade, relinked:relinked}); }
  else if(!guarded.length) toast('No changes to save');
  if(guarded.length) confirmGuardedRepoints(guarded);
}
/* ITEM 5 (v35): one confirm covering every re-link whose unit category changed. Confirm
   re-links them all; Cancel re-links none and says so — nothing is ever applied or
   dropped without the user seeing it. */
function confirmGuardedRepoints(list){
  var lines=list.map(function(rp){
    var k=kById[rp.kid]; var oldP=k?byId[k.pid]:null, newP=byId[rp.pid];
    var g=kingRepointGuard(oldP?oldP.base_unit:null, newP?newP.base_unit:null);
    return '\u2022 '+rp.name+': per '+unitCatWord(g.oldCat)+' \u2192 per '+unitCatWord(g.newCat);
  }).join('\n');
  askConfirm(list.length===1?'Different unit type':(list.length+' ingredients change unit type'),
    lines+'\n\nRecipe amounts keep their numbers but change meaning \u2014 check any recipe that uses '
      +(list.length===1?'it':'them')+'.\n\nThe new products were still added either way.',
    'Re-link anyway',
    function(){
      var done=0;
      list.forEach(function(rp){ var k=kById[rp.kid]; if(k){ k.pid=rp.pid; done++; } });
      if(done){ saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab(); }
      toast(done+' ingredient'+(done===1?'':'s')+' re-linked');
    });
}
function showImportSummary(changes, added, overBefore, overAfter, kings){   // corner toast: glance, don't study
  var stack=document.getElementById('cornerToasts');
  if(!stack){ stack=document.createElement('div'); stack.id='cornerToasts'; document.body.appendChild(stack); }
  var ups=changes.filter(function(c){return c.dir>0;}).length, downs=changes.length-((changes.filter(function(c){return c.dir>0;})).length);
  var bits=[];
  if(changes.length) bits.push(changes.length+' price'+(changes.length===1?'':'s')+(ups&&downs?' \u25b2\u25bc':ups?' \u25b2':' \u25bc'));
  if(added) bits.push(added+' new');
  // ITEM 5 (v35): kitchen-word outcomes are visible here. v34 built this string into a
  // local `parts` array that was never read — the summary has never actually shown them.
  if(kings && kings.made) bits.push(kings.made+' kitchen word'+(kings.made===1?'':'s')+' created');
  if(kings && kings.relinked) bits.push(kings.relinked+' re-linked');
  var newlyOver=overAfter-overBefore;
  var margin = newlyOver>0 ? '<div class="ct-margin is-warn">\u26a0 '+newlyOver+' dish'+(newlyOver===1?'':'es')+' now over '+cogsPct+'% target</div>'
             : (overAfter>0 ? '<div class="ct-margin is-muted">'+overAfter+' still over '+cogsPct+'% target</div>' : '');
  var top=changes.slice().sort(function(a,b){return b.pctAbs-a.pctAbs;})[0];   // ONE biggest mover, not three
  var mover='';
  if(top){ var u=top.unit==='g'?'/kg':top.unit==='ml'?'/L':'/unit'; var f=function(v){return '$'+(top.unit==='g'||top.unit==='ml'?(v*1000):v).toFixed(2);};
    mover='<div class="ct-mover is-mono">'+(top.dir>0?'\u25b2':'\u25bc')+' '+esc(top.name)+' '+f(top.oldC)+' \u2192 '+f(top.newC)+u+'</div>'; }
  var el=document.createElement('div'); el.className='corner-toast';
  el.innerHTML='<button class="is-x" type="button" aria-label="Dismiss">\u00d7</button>'
    +'<div class="ct-head">Invoice imported'+(bits.length?(' \u00b7 '+bits.join(' \u00b7 ')):'')+'</div>'
    +margin+mover;
  stack.appendChild(el);                                             // stacks cleanly; fixed overlay shifts no page content
  requestAnimationFrame(function(){ el.classList.add('show'); });
  var kill=function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 250); };
  el.querySelector('.is-x').onclick=kill;
  setTimeout(kill, 9000);
}
function updateLastImport(){
  var d=null; try{d=localStorage.getItem('cafeDB_lastImport');}catch(e){}
  var txt=d?('Prices last updated: '+new Date(d).toLocaleDateString()):'No invoice imported yet';
  ['lastImport','lastImport2'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=txt;});
}

/* ---- redefined analysis (groups custom menu items by section; shows notes) ---- */
function costRangeCell(m, cost){                                     // ITEM 3: min/max band beneath the headline cost
  if(!(cost>0)||!m) return '';
  var sp=plateForMenuItem(m); if(!sp) return '';
  var r=costRangeForLines(sp.lines); if(!r.hasRange) return '';
  if(r.max-r.min < 0.005) return '';
  return '<span class="cost-range" title="Cost at each ingredient\u2019s lowest and highest recorded price">'+fmt2(r.min)+'\u2013'+fmt2(r.max)+'</span>';
}
function aRow(name,a,m,actions,pid){
  // v52 (LIVE definition \u2014 the earlier aRow is dead): rows are tap-to-edit cards. The tr carries
  // data-mid/data-pid for the row-click delegate, an lt-* class for the margin stripe, and the
  // name is a real <button> so keyboard users get the same edit path the tap gives fingers.
  var note=(m&&m.notes)?' <span class="mi-note" title="'+esc(m.notes)+'">\u24d8</span>':'';
  var ref=m?(' data-mid="'+esc(m.id)+'"'):(pid?(' data-pid="'+esc(pid)+'"'):'');
  return '<tr class="mi-row lt-'+(a.light||'none')+'"'+ref+'><td><button type="button" class="mi-name">'+esc(name)+'</button>'+note+(actions!==undefined?actions:menuActions(m))+'</td>'+
    '<td class="num">'+(a.cost>0?fmt2(a.cost):'\u2014')+costRangeCell(m,a.cost)+'</td>'+
    '<td class="num">'+(a.suggested>0?fmt2(a.suggested):'\u2014')+'</td>'+
    '<td class="num">'+(a.menuPrice!=null?fmt2(a.menuPrice):'\u2014')+'</td>'+
    '<td class="num">'+vbadge(a)+'</td>'+
    '<td><span class="dot '+a.light+'"></span></td></tr>';
}
function renderAnalysis(){
  var tb=document.getElementById('aBody'); if(!tb) return;
  var th=document.getElementById('aSuggestedTh'); if(th) th.textContent='Suggested ('+cogsPct+'%)';
  var qEl=document.getElementById('menuSearch'); var q=(qEl?qEl.value:'').trim().toLowerCase();
  var toks=searchTokens(q);   // v59: shared token matcher
  var catSel=(document.getElementById('menuCatFilter')||{}).value||'';   // v59: category filter = dish section
  function hit(nm,sec){ if(!toks.length) return true; return matchTokens(toks,(String(nm||'')+' '+String(sec||'')).toLowerCase()); }
  var shown=0;
  var inMenu=function(m){ return (m.menuId||'MENU_ORIGINAL')===currentMenuId; };   // only show dishes belonging to the selected menu
  var secOf=function(m){var s=(m.section||'').trim(); return s?s:'Uncategorised';};
  var sections=[]; MENU.forEach(function(m){ if(!inMenu(m)) return; var s=secOf(m); if(sections.indexOf(s)<0)sections.push(s);});
  sections.sort(function(a,b){
    var au=a.toLowerCase()==='uncategorised', bu=b.toLowerCase()==='uncategorised';
    if(au&&!bu)return 1; if(bu&&!au)return -1;                 // Uncategorised always last
    return a.toLowerCase().localeCompare(b.toLowerCase());      // categories A–Z
  });
  fillFilter(document.getElementById('menuCatFilter'), sections, 'All categories');   // v59: options = this menu's dish sections
  var mcf=document.getElementById('menuClearFilters'); if(mcf) mcf.style.display=(q||catSel||menuLightFilter.length)?'':'none';
  var byName=function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());};
  var html='';
  sections.forEach(function(sec){
    if(catSel && sec!==catSel) return;   // v59: category filter narrows to one section
    var items=MENU.filter(function(m){return inMenu(m) && secOf(m)===sec && hit(m.name,sec);}).slice().sort(byName)
      .map(function(m){                                               // v68: precompute each dish's analysis so the margin-light chips can filter on it
        var sp=plateForMenuItem(m); var costed=!!(sp && sp.lines && sp.lines.length);   // v55: the dish's plate via plate_id
        return {m:m, sp:sp, costed:costed, a:costed?analyze(costFromLines(sp.lines),m.price):{light:'none'}};   // §B: an EMPTY plate is "not costed yet", not a $0.00 cost
      })
      .filter(function(it){ return lightFilterPass(menuLightFilter, it.a.light); });   // v68: active chips narrow to those margin lights
    if(!items.length) return;
    html+='<tr class="sec"><td colspan="6">'+esc(sec)+'</td></tr>';
    items.forEach(function(it){
      shown++;
      if(it.costed){ html+=aRow(it.m.name||it.sp.name, it.a, it.m); }
      else{ var note=it.m.notes?' <span class="mi-note" title="'+esc(it.m.notes)+'">ⓘ</span>':'';
        html+='<tr class="muted mi-row lt-none" data-mid="'+esc(it.m.id)+'"><td><button type="button" class="mi-name">'+esc(it.m.name)+'</button>'+note+menuActions(it.m)+'</td><td class="num">—</td><td class="num">—</td><td class="num">'+fmt2(it.m.price)+'</td><td class="num">not costed</td><td><span class="dot none"></span></td></tr>'; }
    });
  });
  // v55: unpublished plates are NOT dishes — they live only in the Plates tab, never on the Menu tab.
  if(!shown){                                                       // v58: routed through the shared empty-state system, wrapped in a table row
    var dishesOnMenu=MENU.filter(inMenu).length;                    // variant A only when the menu HAS dishes but the search matched none; else variant B (truly empty menu)
    var es=dishesOnMenu
      ? emptySearchState(ICON_MENU_BIG,'menu items','clearMenuFilters')
      : emptyStateHtml(ICON_MENU_BIG,'Nothing on this menu yet.','Publish a plate from the Plates tab to see it here.');
    html='<tr class="es-row"><td colspan="6">'+es+'</td></tr>';
  }
  tb.innerHTML=html; bindTips();
  // v58: the empty-state clear action routes through clearMenuFilters() via onclick — no per-render binding.
  // v55 (§D2): the "→ Builder" chip is gone — no handler to bind.
  // v52 tap-to-edit (replaces the per-card Edit button): the whole card/row opens the edit
  // modal; .tip and .mi-btn clicks stopPropagation so they never fall through to the row.
  tb.querySelectorAll('tr.mi-row').forEach(function(tr){
    tr.onclick=function(){ var pid=tr.getAttribute('data-pid'); if(pid){ openPlateEdit(pid); } else { var mid=tr.getAttribute('data-mid'); if(mid) openMenuEdit(mid); } };
  });
  try{ renderMenuInsights(); }catch(e){}   // v67 item 5a: menu-scoped Suggestions panel below the table
}

/* ===== multiple menus: selector, pickers, create modal ===== */
function buildMenuSelector(){
  var sel=document.getElementById('menuSelect');
  if(sel){
    if(menusList.length && !menusList.some(function(m){return m.id===currentMenuId;})) currentMenuId=fallbackMenuId();
    sel.innerHTML=menusList.map(function(m){ return '<option value="'+esc(m.id)+'"'+(m.id===currentMenuId?' selected':'')+'>'+esc(m.name)+(m.season?(' \u2014 '+esc(m.season)):'')+'</option>'; }).join('');
    if(currentMenuId) sel.value=currentMenuId;
  }
  updateMenuDelBtn();
  buildMenuPickers();
}
function buildMenuPickers(){                                   // fill the menu <select>s inside the Publish + Edit modals
  ['mi_menu','ed_menu'].forEach(function(id){
    var s=document.getElementById(id); if(!s) return;
    var cur=s.value||currentMenuId;
    s.innerHTML=menusList.map(function(m){ return '<option value="'+esc(m.id)+'">'+esc(m.name)+(m.season?(' \u2014 '+esc(m.season)):'')+'</option>'; }).join('');
    if(menusList.some(function(m){return m.id===cur;})) s.value=cur;
  });
}
function onMenuSelectChange(){
  var sel=document.getElementById('menuSelect'); if(!sel) return;
  // v69: the selection seed is now period+menu based (insightSeedFor) so it caches within a period and
  // varies per menu on its own — no per-switch bump needed (that would have defeated the cache).
  setCurrentMenuId(sel.value); updateMenuDelBtn(); renderAnalysis();
}
function dbDeleteMenuRecord(id){ pushWrite(function(){ return SUPA.from('menus').delete().eq('id',id); }, 'menu delete'); }
// v54: delete a menu \u2014 its dishes (menu_items rows) are removed and their plates are UNLINKED (menu_id \u2192 null),
// so every plate survives in the Plates library, just unpublished. No reassignment, no holding area. Dishes go
// first, then the menu row (dishes already gone, so the menu_items.menu_id FK can never be violated).
function doDeleteMenu(id, name){
  var affected=customMenu.filter(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});
  affected.forEach(function(c){ removeMenuItem(c.id); });           // v55: remove only THIS menu's entries; plates (and any other menus they're on) survive
  menusList=menusList.filter(function(x){return x.id!==id;}); saveMenus(); dbDeleteMenuRecord(id);
  setCurrentMenuId(fallbackMenuId());
  rebuildMenu(); buildMenuSelector(); renderAnalysis(); updateMenuDelBtn(); if(typeof renderPlatesTab==='function') renderPlatesTab();
  toast('\u201c'+name+'\u201d deleted'+(affected.length?(' \u2014 '+affected.length+' dish'+(affected.length===1?'':'es')+' removed; plates kept'):''));
}
// v55: single confirm. Deleting a menu removes only that menu's dishes; every plate stays in the Plates
// library (and on any other menus it was published to). Any menu may be deleted (incl. the last).
function deleteCurrentMenu(){
  var id=currentMenuId;
  if(!canDeleteMenu(id)){ toast('This menu can\u2019t be deleted'); return; }
  var m=menusList.find(function(x){return x.id===id;}); if(!m){ return; }
  var affected=customMenu.filter(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});
  var nm=m.name;
  var msg=affected.length
    ? ('Delete \u201c'+m.name+'\u201d? Its '+affected.length+' dish'+(affected.length===1?'':'es')+' come off this menu \u2014 the plates stay in your library (and on any other menus).')
    : ('Delete \u201c'+m.name+'\u201d? It has no dishes.');
  askConfirm('Delete menu?', msg, 'Delete menu', function(){ doDeleteMenu(id, nm); });
}
function updateMenuDelBtn(){ var b=document.getElementById('menuDelBtn'); if(b) b.style.display=canDeleteMenu(currentMenuId)?'':'none'; }

/* ---- reuse an existing costed dish on another menu (shares the source plate) ---- */
var adSelectedPlateId=null;
function eligibleDishes(){                                         // costed plates, most useful first
  return savedPlates.filter(function(sp){ return sp && sp.lines && sp.lines.length && costFromLines(sp.lines)>0; });
}
function renderDishPicker(filter){
  var box=document.getElementById('ad_list'); if(!box) return;
  var q=(filter||'').trim().toLowerCase();
  var list=eligibleDishes().filter(function(sp){ var nm=(menuNameForPlate(sp)+' '+(sp.name||'')).toLowerCase(); return !q||nm.indexOf(q)>=0; });
  list.sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!list.length){ box.innerHTML='<div class="ad-empty">No costed dishes found. Build and save a plate first.</div>'; return; }
  box.innerHTML=list.map(function(sp){
    var c=costFromLines(sp.lines); var on=plateMenuSummary(sp);
    var sel=(sp.id===adSelectedPlateId)?' sel':'';
    return '<button type="button" class="ad-item'+sel+'" data-pid="'+esc(sp.id)+'"><span class="ad-nm">'+esc(sp.name||'Plate')+'</span><span class="ad-meta">'+esc(on?('On '+on):'Library')+' · cost '+fmt2(c)+'</span></button>';
  }).join('');
  box.querySelectorAll('.ad-item').forEach(function(b){ b.onclick=function(){ adSelectedPlateId=b.getAttribute('data-pid'); renderDishPicker(document.getElementById('ad_search').value); }; });
}
function menuNameForPlate(sp){ return plateMenuSummary(sp)||(sp.name||''); }
function openAddDishModal(){
  adSelectedPlateId=null;
  var nm=document.getElementById('ad_menuName'); if(nm) nm.textContent=menuNameById(currentMenuId);
  var s=document.getElementById('ad_search'); if(s) s.value='';
  var p=document.getElementById('ad_price'); if(p) p.value='';
  var e=document.getElementById('ad_err'); if(e) e.style.display='none';
  renderDishPicker(''); show('addDishModal');
}
function closeAddDishModal(){ hide('addDishModal'); }
function submitAddDish(){
  var err=document.getElementById('ad_err');
  var sp=savedPlates.find(function(s){return s.id===adSelectedPlateId;});
  if(!sp){ if(err){err.textContent='Pick a dish from the list first.';err.style.display='block';} return; }
  var pv=document.getElementById('ad_price').value;
  if(pv===''||isNaN(parseFloat(pv))||parseFloat(pv)<0){ if(err){err.textContent='Enter a sell price for this menu.';err.style.display='block';} return; }
  if(dishesOfPlate(sp).some(function(d){return (d.menuId||'MENU_ORIGINAL')===currentMenuId;})){ if(err){err.textContent='That plate is already on this menu.';err.style.display='block';} return; }
  var id='um'+Date.now().toString(36);
  var item={id:id, section:(sp.category||'Uncategorised'), name:sp.name||'Dish', price:parseFloat(pv), notes:'', custom:true, menuId:currentMenuId, plateId:sp.id};
  customMenu.push(item); saveCustomMenu(); dbPushMenuAfterPlate(item, sp);
  rebuildMenu(); buildMenuOptions(); renderAnalysis(); renderPlatesTab(); closeAddDishModal();
  toast('\u201c'+item.name+'\u201d added to '+menuNameById(currentMenuId));
}
function openNewMenuModal(){
  var n=document.getElementById('nm_name'); if(n)n.value='';
  var s=document.getElementById('nm_season'); if(s)s.value='';
  var e=document.getElementById('nm_err'); if(e)e.style.display='none';
  show('newMenuModal');
}
function closeNewMenuModal(){ hide('newMenuModal'); }
function submitNewMenu(){
  var name=(document.getElementById('nm_name')||{}).value; name=(name||'').trim();
  var season=(document.getElementById('nm_season')||{}).value||''; season=season.trim();
  var err=document.getElementById('nm_err');
  if(!name){ if(err){ err.textContent='Enter a menu name.'; err.style.display='block'; } return; }
  var id='MENU'+Date.now().toString(36);
  var rec={id:id, name:name, season:season||null};
  menusList.push(rec); saveMenus(); dbUpsertMenuRecord(rec);
  setCurrentMenuId(id);
  buildMenuSelector(); renderAnalysis(); closeNewMenuModal();
  toast('\u201c'+name+'\u201d menu created');
}

/* ===== Menu Analysis: split "/" items + safe delete ===== */
function loadDeletedMenu(){ try{ return JSON.parse(localStorage.getItem('cafeDB_deletedMenu'))||[]; }catch(e){ return []; } }
function saveDeletedMenu(){ try{ localStorage.setItem('cafeDB_deletedMenu', JSON.stringify(deletedMenuIds)); }catch(e){} }
function dbDeleteMenu(id){ pushWrite(function(){ return SUPA.from('menu_items').delete().eq('id',id); }, 'menu delete'); }
function isBaseMenuId(id){ return BASE_MENU.some(function(m){ return m.id===id; }); }
function menuActions(m){
  if(!m) return '';
  // v55 (\u00a7D2): the "\u2192 Builder" chip is removed. A dish's recipe is edited from its plate in the Plates
  // tab (tap the card \u2192 Edit plate); the Menu-tab row stays tap-to-edit for price/category/menu only.
  return '';
}
function openMenuInBuilder(mid){                                      // jump from Menu Analysis straight into the Builder for this dish
  var m=menuById[mid]; if(!m) return;
  var sp=plateForMenuItem(m);                                        // respects reuse (menuId link OR sourcePlateId)
  if(sp){ loadPlate(sp.id); return; }                               // costed already -> load its recipe
  plate=[]; loadedPlateId=null;                                     // not costed -> start a fresh plate, pre-named + linked to this item
  var pn=document.getElementById('plateName'); if(pn) pn.value=m.name||'';
  if(typeof menuLinkEl!=='undefined' && menuLinkEl){ menuTouched=true; menuLinkEl.value=m.id; }
  hidePlateSuggest(); updateEditTag(); renderPlate(); openBuilder();
  toast('Start costing \u201c'+(m.name||'this dish')+'\u201d \u2014 add ingredients');
}
function removeMenuItem(id){
  var before=customMenu.length;
  customMenu=customMenu.filter(function(c){ return c.id!==id; });
  if(customMenu.length!==before) saveCustomMenu();
  dbDeleteMenu(id);                                   // remove server row (harmless if none)
  if(isBaseMenuId(id)){                               // built-in item -> tombstone so it stays gone everywhere
    if(deletedMenuIds.indexOf(id)<0){ deletedMenuIds.push(id); saveDeletedMenu(); }
    dbSetSetting('deleted_menu_ids', deletedMenuIds);
  }
}
/* two-tap confirm dialog */
var __confirmFn=null;
function askConfirm(title,msg,okLabel,fn){
  __confirmFn=fn;
  var t=document.getElementById('confirmTitle'); if(t)t.textContent=title;
  var mm=document.getElementById('confirmMsg'); if(mm)mm.textContent=msg;
  var ok=document.getElementById('confirmOk'); if(ok)ok.textContent=okLabel||'Confirm';
  show('confirmModal');
}
function closeConfirm(){ hide('confirmModal'); __confirmFn=null; }
/* safe delete (used by the edit modal) */
function doDeleteMenuItem(id){
  var m=menuById[id]; if(!m) return; var nm=m.name, touched=false;
  savedPlates.forEach(function(sp){ if(sp.menuId===id){ sp.menuId=null; dbPushPlate(sp); touched=true; } });  // unlink, keep the plate + its data
  if(touched) savePlatesLS();
  if(menuLinkEl.value===id){ menuLinkEl.value=''; menuTouched=false; if(typeof updatePublishLabel==='function')updatePublishLabel(); }
  if(loadedPlateId && !savedPlates.some(function(s){ return s.id===loadedPlateId; })) loadedPlateId=null;
  removeMenuItem(id);
  rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis();
  toast('Deleted '+nm);
}

/* ===== Menu item edit modal ===== */
var editTargetId=null, edDelArmed=false, edCatState={chosen:null,chosenIsNew:false}, edCat=null, editKind='menu', edRestoreMode=false, delChoiceId=null;
function makeCatCombo(inpId, dropId, newId, state){
  var inp=document.getElementById(inpId); if(!inp) return null;
  function render(){
    var q=inp.value.trim(), drop=document.getElementById(dropId), cats=menuCats();
    var scored=cats.map(function(c){return {c:c,s:catScore(c,q)};}).filter(function(o){return o.s>=0;}).sort(function(a,b){return b.s-a.s;});
    var html='';
    scored.forEach(function(o){var ex=o.c.toLowerCase()===q.toLowerCase();html+='<div class="opt cat-opt" data-cat="'+esc(o.c)+'">'+esc(o.c)+(ex?' <span class="ca">exists</span>':'')+'</div>';});
    var hasExact=cats.some(function(c){return c.toLowerCase()===q.toLowerCase();});
    if(q && !hasExact) html+='<div class="opt cat-opt cat-create" data-new="'+esc(q)+'">\u2795 Create new category \u201c'+esc(q)+'\u201d</div>';
    if(!html) html='<div class="opt muted">No categories yet</div>';
    drop.innerHTML=html; drop.style.display='block';
    drop.querySelectorAll('.cat-opt').forEach(function(o){o.addEventListener('mousedown',function(e){e.preventDefault();var dn=o.getAttribute('data-new');if(dn!==null)choose(dn,true);else choose(o.getAttribute('data-cat'),false);});});
  }
  function choose(name,isNew){
    inp.value=name; state.chosen=name; state.chosenIsNew=isNew;
    document.getElementById(dropId).style.display='none';
    var nw=document.getElementById(newId);
    if(nw){ if(isNew){nw.textContent='New category will be created: \u201c'+name+'\u201d';nw.style.display='block';}else{nw.style.display='none';} }
  }
  inp.addEventListener('input',function(){state.chosen=null;state.chosenIsNew=false;var n=document.getElementById(newId);if(n)n.style.display='none';render();});
  inp.addEventListener('focus',render);
  inp.addEventListener('blur',function(){setTimeout(function(){var d=document.getElementById(dropId);if(d)d.style.display='none';},150);});
  return {render:render, choose:choose};
}
function openMenuEdit(id){
  var m=menuById[id]; if(!m) return;
  editTargetId=id; edDelArmed=false; setEditMode('menu');
  document.getElementById('ed_name').value=m.name||'';
  document.getElementById('ed_price').value=(m.price!=null)?m.price:'';
  document.getElementById('ed_cat').value=m.section||'';
  buildMenuPickers(); var edMenu=document.getElementById('ed_menu'); if(edMenu){ var wm=m.menuId||'MENU_ORIGINAL'; if(menusList.some(function(x){return x.id===wm;})) edMenu.value=wm; }
  edCatState.chosen=m.section||null; edCatState.chosenIsNew=false;
  var d=document.getElementById('ed_catDrop'); if(d)d.style.display='none';
  var nn=document.getElementById('ed_catNew'); if(nn)nn.style.display='none';
  document.getElementById('ed_err').style.display='none';
  var del=document.getElementById('ed_delete'); if(del) del.textContent='Delete item';
  show('editModal');
}
function closeEdit(){ hide('editModal'); editTargetId=null; edDelArmed=false; edRestoreMode=false; editKind='menu'; }
function resolveEditCat(){
  var typedCat=document.getElementById('ed_cat').value.trim();
  var allCats=menuCats();
  var existCat=allCats.find(function(c){return c.toLowerCase()===typedCat.toLowerCase();});
  if(typedCat==='') return 'Uncategorised';
  if(existCat) return existCat;
  if(edCatState.chosen!==null && edCatState.chosenIsNew && edCatState.chosen.toLowerCase()===typedCat.toLowerCase()) return typedCat;
  return null;   // a new category that hasn't been confirmed
}
function saveMenuEdit(){
  var id=editTargetId; if(!id||!menuById[id]) return;
  var m=menuById[id], err=document.getElementById('ed_err');
  var name=document.getElementById('ed_name').value.trim();
  var priceV=document.getElementById('ed_price').value;
  if(!name){ err.textContent='Enter a menu item name.'; err.style.display='block'; return; }
  if(priceV===''||isNaN(parseFloat(priceV))||parseFloat(priceV)<0){ err.textContent='Enter a valid sell price.'; err.style.display='block'; return; }
  var cat=resolveEditCat();
  if(cat===null){ err.textContent='\u201c'+document.getElementById('ed_cat').value.trim()+'\u201d is a new category \u2014 pick \u201cCreate new category\u201d from the list to confirm, or choose an existing one.'; err.style.display='block'; if(edCat)edCat.render(); return; }
  var price=parseFloat(priceV);
  var edMenuEl=document.getElementById('ed_menu'); var chosenMenu=(edMenuEl&&edMenuEl.value)?edMenuEl.value:(m.menuId||'MENU_ORIGINAL');
  // v55: a dish keeps its own name/price/category per menu \u2014 editing it never renames the shared plate.
  upsertCustomMenu({id:id, section:cat, name:name, price:price, notes:(m.notes||''), custom:true, menuId:chosenMenu, plateId:(m.plateId||m.sourcePlateId||null)});   // saves all edits at once
  rebuildMenu(); buildMenuOptions();
  if(chosenMenu!==currentMenuId){ setCurrentMenuId(chosenMenu); buildMenuSelector(); }   // follow the dish if it was moved to another menu
  renderPlate(); renderAnalysis(); renderPlatesTab(); closeEdit();
  toast('\u201c'+name+'\u201d updated');
}
function editDeleteTap(){
  var id=editTargetId; if(!id||!menuById[id]) return;
  var nm=menuById[id].name; closeEdit(); openDelChoice(id, nm);
}
function editOpenInBuilder(){
  var id=editTargetId;
  if(editKind==='plate'){ closeEdit(); requestLoadPlate(id); return; }
  var m=menuById[id]; if(!m) return;
  closeEdit();
  var go=function(){ var sp=ensurePlateForDish(m); if(sp) requestLoadPlate(sp.id); };   // v55: edit the dish's plate (created+linked if it had none)
  if(isBuilderDirty()) askConfirm('Open in builder','Open '+m.name+'? Unsaved changes will be lost.','Open',go); else go();
}

/* ===== orphan-plate edit + delete-choice ===== */
function plateEditAction(sp){ return '<div class="mi-act"><button class="mi-btn tobuilder" type="button" data-pid="'+esc(sp.id)+'" title="Open in plate builder">\u2192 Builder</button></div>'; }   // v52: Edit retired \u2014 card tap edits
function setEditMode(mode){
  editKind=mode; edRestoreMode=false;
  var cf=document.getElementById('ed_catField'), pf=document.getElementById('ed_priceField');
  var mf=document.getElementById('ed_menuField');
  var pa=document.getElementById('ed_plateActions'), dr=document.getElementById('ed_deleteRow');
  var save=document.getElementById('editSave'), title=document.getElementById('editTitle');
  var nlab=document.querySelector('label[for="ed_name"]');
  if(mode==='menu'){
    if(cf)cf.style.display=''; if(pf)pf.style.display=''; if(mf)mf.style.display='';
    if(pa)pa.style.display='none'; if(dr)dr.style.display='';
    if(save)save.textContent='Save changes'; if(title)title.textContent='Edit menu item'; if(nlab)nlab.textContent='Menu item name *';
  } else {                                   // orphan custom plate
    if(cf)cf.style.display='none'; if(pf)pf.style.display='none'; if(mf)mf.style.display='none';
    if(pa)pa.style.display=''; if(dr)dr.style.display='none';
    if(save)save.textContent='Save name'; if(title)title.textContent='Edit plate'; if(nlab)nlab.textContent='Plate name *';
  }
}
function openPlateEdit(pid){
  var sp=savedPlates.find(function(s){return s.id===pid;}); if(!sp) return;
  editTargetId=pid; edDelArmed=false; setEditMode('plate');
  document.getElementById('ed_name').value=sp.name||'';
  document.getElementById('ed_price').value=''; document.getElementById('ed_cat').value='';
  edCatState.chosen=null; edCatState.chosenIsNew=false;
  var d=document.getElementById('ed_catDrop'); if(d)d.style.display='none';
  var nn=document.getElementById('ed_catNew'); if(nn)nn.style.display='none';
  document.getElementById('ed_err').style.display='none';
  show('editModal');
}
function onEditSave(){
  if(editKind==='plate'){ if(edRestoreMode) savePlateRestore(); else savePlateRename(); return; }
  saveMenuEdit();
}
function savePlateRename(){
  var id=editTargetId, err=document.getElementById('ed_err');
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  var name=document.getElementById('ed_name').value.trim();
  if(!name){ err.textContent='Enter a plate name.'; err.style.display='block'; return; }
  sp.name=name; savePlatesLS(); dbPushPlate(sp);
  if(loadedPlateId===id) document.getElementById('plateName').value=name;
  renderPlate(); renderAnalysis(); closeEdit(); toast('Plate renamed');
}
function editRestoreToMenu(){
  if(editKind!=='plate') return;
  edRestoreMode=true;
  var cf=document.getElementById('ed_catField'), pf=document.getElementById('ed_priceField');
  if(cf)cf.style.display=''; if(pf)pf.style.display='';
  var pa=document.getElementById('ed_plateActions'); if(pa)pa.style.display='none';
  var save=document.getElementById('editSave'); if(save)save.textContent='Restore to menu';
  var title=document.getElementById('editTitle'); if(title)title.textContent='Restore plate to menu';
  var err=document.getElementById('ed_err'); if(err){ err.textContent='Choose a category and sell price, then Restore to menu.'; err.style.display='block'; }
}
function savePlateRestore(){
  var id=editTargetId, err=document.getElementById('ed_err');
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  var name=document.getElementById('ed_name').value.trim();
  if(!name){ err.textContent='Enter a menu item name.'; err.style.display='block'; return; }
  var priceV=document.getElementById('ed_price').value;
  if(priceV===''||isNaN(parseFloat(priceV))||parseFloat(priceV)<0){ err.textContent='Enter a valid sell price.'; err.style.display='block'; return; }
  var cat=resolveEditCat();
  if(cat===null){ err.textContent='\u201c'+document.getElementById('ed_cat').value.trim()+'\u201d is a new category \u2014 pick \u201cCreate new category\u201d to confirm, or choose an existing one.'; err.style.display='block'; if(edCat)edCat.render(); return; }
  var newId='um'+Date.now().toString(36);
  upsertCustomMenu({id:newId, section:cat, name:name, price:parseFloat(priceV), notes:'', custom:true});
  sp.name=name; sp.menuId=newId; savePlatesLS(); dbPushPlate(sp);
  rebuildMenu(); buildMenuOptions(); renderPlate(); renderAnalysis(); closeEdit();
  toast('\u201c'+name+'\u201d restored to the menu');
}
function editPermDeletePlate(){
  var id=editTargetId; var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp) return;
  var nm=sp.name||'plate'; closeEdit();
  askConfirm('Permanently delete','Permanently delete \u201c'+nm+'\u201d? This removes the plate and its ingredients everywhere and cannot be undone.','Delete', function(){
    savedPlates=savedPlates.filter(function(s){return s.id!==id;});
    if(loadedPlateId===id){ loadedPlateId=null; }
    savePlatesLS(); dbDeletePlate(id);
    updateEditTag(); renderPlate(); renderAnalysis();
    toast('\u201c'+nm+'\u201d permanently deleted');
  });
}
function openDelChoice(id,nm){
  delChoiceId=id;
  var msg=document.getElementById('delChoiceMsg'); if(msg)msg.textContent='Delete \u201c'+nm+'\u201d from the menu. Keep its saved plate for reuse, or delete everything?';
  show('delChoiceModal');
}
function closeDelChoice(){ hide('delChoiceModal'); delChoiceId=null; }
// v55: "remove from menu" drops just this menu entry; the plate stays in the library (and on any other menus).
function doDeleteMenuOnly(){
  var id=delChoiceId; if(!id||!menuById[id]){ closeDelChoice(); return; }
  var nm=menuById[id].name;
  removeMenuItem(id);
  rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis(); renderPlatesTab(); closeDelChoice();
  toast('\u201c'+nm+'\u201d removed from this menu \u2014 plate kept');
}
// v55: "delete everything" deletes the plate AND every menu entry backed by it (across all menus).
function doDeleteEverything(){
  var id=delChoiceId; if(!id||!menuById[id]){ closeDelChoice(); return; }
  var nm=menuById[id].name; var sp=plateForMenuItem(menuById[id]);
  if(sp){ dishesOfPlate(sp).forEach(function(d){ removeMenuItem(d.id); }); savedPlates=savedPlates.filter(function(s){return s.id!==sp.id;}); if(loadedPlateId===sp.id) loadedPlateId=null; savePlatesLS(); dbDeletePlate(sp.id); }
  else { removeMenuItem(id); }
  rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis(); renderPlatesTab(); closeDelChoice();
  toast('\u201c'+nm+'\u201d and its plate deleted');
}

/* ---- wiring ---- */
document.getElementById('importBtn').addEventListener('click',openInv);
document.getElementById('invParse').addEventListener('click',parseInvoice);
(function(){var fb=document.getElementById('invFileBtn'), fi=document.getElementById('invFile');
 if(fb&&fi){ fb.addEventListener('click',function(){ fi.click(); });
   fi.addEventListener('change',function(){ if(fi.files&&fi.files[0]) handleInvFile(fi.files[0]); }); }})();
document.getElementById('invClose').addEventListener('click',closeInv);
document.getElementById('menuClose').addEventListener('click',closeMenuModal);
document.getElementById('menuCancel').addEventListener('click',closeMenuModal);
document.getElementById('menuSave').addEventListener('click',submitMenuItem);
(function(){
  var ms=document.getElementById('menuSelect'); if(ms) ms.addEventListener('change',onMenuSelectChange);
  var mnb=document.getElementById('menuNewBtn'); if(mnb) mnb.addEventListener('click',openNewMenuModal);
  var madb=document.getElementById('menuAddDishBtn'); if(madb) madb.addEventListener('click',openAddDishModal);
  var sml=document.getElementById('smemLink'); if(sml) sml.addEventListener('click',openSmem);
  var smc=document.getElementById('smemClose'); if(smc) smc.addEventListener('click',closeSmem);
  var smd=document.getElementById('smemDone'); if(smd) smd.addEventListener('click',closeSmem);
  var adc=document.getElementById('addDishClose'); if(adc) adc.addEventListener('click',closeAddDishModal);
  var adca=document.getElementById('addDishCancel'); if(adca) adca.addEventListener('click',closeAddDishModal);
  var ads=document.getElementById('addDishSave'); if(ads) ads.addEventListener('click',submitAddDish);
  var adsr=document.getElementById('ad_search'); if(adsr) adsr.addEventListener('input',function(e){ renderDishPicker(e.target.value); });
  var mdb=document.getElementById('menuDelBtn'); if(mdb) mdb.addEventListener('click',deleteCurrentMenu);
  var nmc=document.getElementById('newMenuClose'); if(nmc) nmc.addEventListener('click',closeNewMenuModal);
  var nmca=document.getElementById('newMenuCancel'); if(nmca) nmca.addEventListener('click',closeNewMenuModal);
  var nms=document.getElementById('newMenuSave'); if(nms) nms.addEventListener('click',submitNewMenu);
  var nmn=document.getElementById('nm_name'); if(nmn) nmn.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); submitNewMenu(); } });
})();
document.getElementById('editClose').addEventListener('click',closeEdit);
document.getElementById('editCancel').addEventListener('click',closeEdit);
document.getElementById('editSave').addEventListener('click',onEditSave);
/* §D2: ed_openBuilder removed — a dish's recipe is edited from its plate in the Plates tab. */
document.getElementById('ed_delete').addEventListener('click',function(e){e.preventDefault();editDeleteTap();});
document.getElementById('ed_restore').addEventListener('click',editRestoreToMenu);
document.getElementById('ed_permDelete').addEventListener('click',function(e){e.preventDefault();editPermDeletePlate();});
document.getElementById('delChoiceClose').addEventListener('click',closeDelChoice);
document.getElementById('delChoiceCancel').addEventListener('click',closeDelChoice);
document.getElementById('delChoiceMenuOnly').addEventListener('click',doDeleteMenuOnly);
document.getElementById('delChoiceAll').addEventListener('click',doDeleteEverything);
edCat=makeCatCombo('ed_cat','ed_catDrop','ed_catNew',edCatState);
(function(){var ok=document.getElementById('confirmOk'),ca=document.getElementById('confirmCancel'),cx=document.getElementById('confirmClose');
 if(ok)ok.addEventListener('click',function(){ var fn=__confirmFn; closeConfirm(); if(fn)fn(); });
 if(ca)ca.addEventListener('click',closeConfirm); if(cx)cx.addEventListener('click',closeConfirm);})();

// backdrop tap closes small dialogs; the builder popup is deliberately NOT backdrop-dismissable (an accidental
// tap must not throw away a plate in progress) — only its × / Escape close it.
['menuModal','invModal','confirmModal','editModal','delChoiceModal','plateActionsModal','manageMenusModal'].forEach(function(id){var m=document.getElementById(id);if(m)m.addEventListener('mousedown',function(e){if(e.target===m)hide(id);});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){['menuModal','invModal','confirmModal','editModal','delChoiceModal','builderModal','plateActionsModal','manageMenusModal'].forEach(function(id){var m=document.getElementById(id);if(m&&m.classList.contains('open'))hide(id);});}});
updateLastImport(); updateEditTag();


/* ===== category combobox (Add to menu) ===== */
var catState={chosen:null,chosenIsNew:false};
function menuCats(){var c=[];MENU.forEach(function(m){if(c.indexOf(m.section)<0)c.push(m.section);});return c;}
function catScore(cat,q){cat=cat.toLowerCase();q=q.toLowerCase();if(!q)return 1;if(cat===q)return 100;if(cat.indexOf(q)===0)return 80;if(cat.indexOf(q)>=0)return 60;var i=0;for(var j=0;j<cat.length&&i<q.length;j++){if(cat[j]===q[i])i++;}return i===q.length?30:-1;}
function renderCatDrop(){
  var inp=document.getElementById('mi_cat'); if(!inp)return;
  var q=inp.value.trim(), drop=document.getElementById('mi_catDrop'), cats=menuCats();
  var scored=cats.map(function(c){return {c:c,s:catScore(c,q)};}).filter(function(o){return o.s>=0;}).sort(function(a,b){return b.s-a.s;});
  var html='';
  scored.forEach(function(o){var ex=o.c.toLowerCase()===q.toLowerCase();html+='<div class="opt cat-opt" data-cat="'+esc(o.c)+'">'+esc(o.c)+(ex?' <span class="ca">exists</span>':'')+'</div>';});
  var hasExact=cats.some(function(c){return c.toLowerCase()===q.toLowerCase();});
  if(q && !hasExact) html+='<div class="opt cat-opt cat-create" data-new="'+esc(q)+'">\u2795 Create new category \u201c'+esc(q)+'\u201d</div>';
  if(!html) html='<div class="opt muted">No categories yet</div>';
  drop.innerHTML=html; drop.style.display='block';
  drop.querySelectorAll('.cat-opt').forEach(function(o){o.addEventListener('mousedown',function(e){e.preventDefault();var dn=o.getAttribute('data-new');if(dn!==null)chooseCat(dn,true);else chooseCat(o.getAttribute('data-cat'),false);});});
}
function chooseCat(name,isNew){
  var inp=document.getElementById('mi_cat'); inp.value=name;
  catState.chosen=name; catState.chosenIsNew=isNew;
  document.getElementById('mi_catDrop').style.display='none';
  var nw=document.getElementById('mi_catNew');
  if(isNew){nw.textContent='New category will be created: \u201c'+name+'\u201d';nw.style.display='block';}else{nw.style.display='none';}
}
(function(){
  var inp=document.getElementById('mi_cat'); if(!inp)return;
  inp.addEventListener('input',function(){catState.chosen=null;catState.chosenIsNew=false;var n=document.getElementById('mi_catNew');if(n)n.style.display='none';renderCatDrop();});
  inp.addEventListener('focus',renderCatDrop);
  inp.addEventListener('blur',function(){setTimeout(function(){var d=document.getElementById('mi_catDrop');if(d)d.style.display='none';},150);});
})();

/* ============================================================
   ITEM 5 — custom pull-to-refresh (mobile only).
   Native PTR is deliberately disabled ≤700px (overscroll-behavior),
   so this is our own. Arms only at scrollTop 0, off modals/tables/inputs,
   and never clobbers an in-progress plate (see refreshFromCloud).
   ============================================================ */
(function(){
  if(!('ontouchstart' in window)) return;                            // touch devices only
  var ind=document.createElement('div');
  ind.className='ptr-ind'; ind.setAttribute('aria-hidden','true');
  // two stacked layers: a static faint ring + the orange arc that spins on its own (Item 14)
  ind.innerHTML='<span class="ptr-spin">'
    +'<svg class="ptr-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="6" opacity="0.25"/></svg>'
    +'<svg class="ptr-arc" viewBox="0 0 64 64"><path d="M 32 17.5 A 14.5 14.5 0 0 1 40.52 43.73" fill="none" stroke-width="6" stroke-linecap="round"/></svg>'
    +'</span>';
  document.body.appendChild(ind);
  var arc=ind.querySelector('.ptr-arc');
  var main=document.getElementById('appMain');
  var startY=0, armed=false, pulling=false, raw=0, refreshing=false;
  var TRIGGER=130;          // RAW finger travel needed — a complete, deliberate drag, not a flick (Item 13)
  var TOP_ZONE=0.25;        // the gesture must START in the top quarter of the screen (Item 13)
  var HOLD=64;              // how far the content is held down while the refresh runs
  var MAXPULL=150;          // cap on raw travel we translate
  function scroller(){ return document.scrollingElement || document.documentElement; }
  function mobile(){ return window.matchMedia && window.matchMedia('(max-width:700px)').matches; }
  function blocked(t){
    if(refreshing) return true;
    if(document.querySelector('.modal-overlay.open, #modal.open')) return true;   // any modal open
    if(document.querySelector('.drop.open')) return true;                         // builder ingredient dropdown
    if(t && t.closest && t.closest('.atable-wrap, .drop, .cat-drop, select, input, textarea, [contenteditable]')) return true;
    return false;
  }
  function contentOffset(rawDy){ return Math.min(HOLD, rawDy*0.5); }  // content follows the finger at half-speed (rubber-band feel)
  function setContent(y, animate){
    if(main){ main.style.transition = animate?'transform .2s ease':''; main.style.transform = y?('translateY('+y+'px)'):''; }
  }
  function setInd(y, animate){
    ind.style.transition = animate?'transform .2s ease, opacity .2s ease':'';
    ind.style.transform='translateX(-50%) translateY('+y+'px)';
    ind.style.opacity=String(Math.min(1, y/HOLD));
  }
  function release(){                                                 // no trigger: ease everything back
    ind.classList.remove('ready');
    setInd(0,true); ind.style.opacity='0';
    setContent(0,true);
    if(main) setTimeout(function(){ main.style.willChange='auto'; main.style.transition=''; },220);
  }
  function finish(){                                                  // refresh done: unhold + spin down
    refreshing=false; document.body.classList.remove('ptr-active');
    ind.classList.remove('spinning','ready');
    setInd(0,true); ind.style.opacity='0';
    setContent(0,true);
    if(main) setTimeout(function(){ main.style.willChange='auto'; main.style.transition=''; },220);
  }
  function trigger(){
    if(refreshing) return; refreshing=true;
    document.body.classList.add('ptr-active');                        // Item 15: spinner owns the top-centre; sync banner hides
    if(navigator.vibrate){ try{ navigator.vibrate(10); }catch(e){} }
    ind.classList.add('spinning'); ind.classList.remove('ready');
    setInd(HOLD,true);                                                // hold the spinner down in the opened gap
    setContent(HOLD,true);                                            // and hold the content down until the data comes back
    Promise.resolve(refreshFromCloud()).then(finish, finish);
  }
  window.addEventListener('touchstart', function(e){
    armed=false; pulling=false; raw=0;
    if(e.touches.length!==1 || !mobile()) return;
    if(scroller().scrollTop>0) return;                                // must be at the very top
    if(e.touches[0].clientY > window.innerHeight*TOP_ZONE) return;    // …and the drag must START near the top of the screen (Item 13)
    if(blocked(e.target)) return;
    armed=true; startY=e.touches[0].clientY;
    if(main) main.style.willChange='transform';
  }, {passive:true});
  window.addEventListener('touchmove', function(e){
    if(!armed) return;
    if(scroller().scrollTop>0){ armed=false; release(); return; }
    var dy=e.touches[0].clientY-startY;
    if(dy>0){
      pulling=true;
      raw=Math.min(MAXPULL, dy);
      var y=contentOffset(raw);
      setContent(y,false); setInd(y,false);
      if(arc) arc.style.transform='rotate('+(Math.min(1, raw/TRIGGER)*300)+'deg)';
      ind.classList.toggle('ready', raw>=TRIGGER);
      if(e.cancelable) e.preventDefault();                            // suppress the page rubber-band while pulling
    }
  }, {passive:false});
  window.addEventListener('touchend', function(){
    if(!armed) return; armed=false;
    if(arc) arc.style.transform='';                                   // hand rotation back to the CSS spin animation
    if(pulling && raw>=TRIGGER) trigger(); else release();
    pulling=false;
  });
  // expose for headless tests
  window.__ptr={ trigger:trigger, blocked:blocked };
})();

/* ===== Item 9 — Enter in a single-line modal field commits + drops the keyboard ===== */
(function(){
  var EXCLUDE='#q, .invPrice, .invPackQty, [role="combobox"], .cat-wrap input, .search-wrap input';   // combos + inline price edits own their Enter/behaviour
  // hint the mobile keyboard's return key for the plain single-line fields
  document.querySelectorAll('.modal input').forEach(function(inp){
    var ty=(inp.getAttribute('type')||'text').toLowerCase();
    if(ty==='checkbox'||ty==='radio'||ty==='button'||ty==='submit') return;
    if(inp.matches(EXCLUDE)) return;
    if(!inp.hasAttribute('enterkeyhint')) inp.setAttribute('enterkeyhint','done');
  });
  // one delegated listener: Enter commits the field (blur) and dismisses the keyboard — never auto-submits the form
  document.addEventListener('keydown', function(e){
    if(e.key!=='Enter' || e.shiftKey) return;
    if(e.defaultPrevented) return;                                  // a field-specific handler already dealt with it (#q, nm_name…)
    var t=e.target;
    if(!t || t.tagName!=='INPUT') return;                           // textareas keep their normal newline
    var ty=(t.getAttribute('type')||'text').toLowerCase();
    if(ty==='checkbox'||ty==='radio'||ty==='button'||ty==='submit') return;
    if(!t.closest('.modal')) return;                                // only inside popups
    if(t.matches(EXCLUDE)) return;
    e.preventDefault();
    t.blur();
  });
})();
