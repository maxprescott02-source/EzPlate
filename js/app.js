var loadedPlateId=null,invRows=[],dismissedMatch='',nameTimer=null,publishTargetId=null;
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
function rowToMenu(r){ return {id:r.id, section:r.section, name:r.name, price:r.price, notes:r.notes||'', custom:!!r.is_custom, menuId:(r.menu_id||'MENU_ORIGINAL'), sourcePlateId:(r.source_plate_id||null)}; }
function rowToPlate(r){ return {id:r.id, name:r.name, menuId:r.menu_id||null, lines:Array.isArray(r.lines)?r.lines:[]}; }

/* writes */
function dbPushIngredient(id){ var p=byId[id]; if(!p) return; pushWrite(function(){ return SUPA.from('ingredients').upsert(ingredientToRow(p)); }, 'ingredient'); }
function dbPushMenu(item){ return pushWrite(function(){ return SUPA.from('menu_items').upsert({id:item.id, section:item.section, name:item.name, price:item.price, notes:item.notes||null, is_custom:true, menu_id:(item.menuId||'MENU_ORIGINAL'), source_plate_id:(item.sourcePlateId||null)}); }, 'menu item'); }
function dbUpsertMenuRecord(m){ return pushWrite(function(){ return SUPA.from('menus').upsert({id:m.id, name:m.name, season:m.season||null}); }, 'menu'); }
function dbPushPlate(sp){ if(!sp) return Promise.resolve(null); return pushWrite(function(){ return SUPA.from('plates').upsert({id:sp.id, name:sp.name, menu_id:sp.menuId||null, lines:sp.lines||[]}); }, 'plate'); }
// v40 item 1: a plate references a menu_items row via plates.menu_id (FK plates_menu_id_fkey). When that row is
// brand new (just published), its insert and the plate insert both fire through pushWrite with no ordering, so the
// plate can reach Supabase first and violate the FK. Chain the plate push AFTER the menu-item push resolves, and
// abort (never write an orphan plate) if the menu-item push failed.
function dbPushPlateAfterMenu(sp, menuPushPromise){
  if(!sp) return Promise.resolve(null);
  if(!menuPushPromise) return dbPushPlate(sp);                        // no new menu-item dependency -> unchanged path
  return Promise.resolve(menuPushPromise).then(function(res){
    // Only push the plate once the menu item is CONFIRMED on the server (truthy result, no error). A null
    // (skipped/no client) or an error means the row isn't there — pushing the plate would orphan it and trip
    // plates_menu_id_fkey. It's saved locally either way and will sync with the item next time.
    if(!res || res.error){ return null; }   // v43: menu item not confirmed on the server -> don't orphan the plate. Do NOT toast here: pushWrite already surfaced the REAL error on a server rejection, or set the quiet 'offline' banner when genuinely offline. The old second toast overwrote that real error (single-element toast, last wins) and mislabeled a rejection as "offline" — the bug that hid a missing DB column for days.
    return dbPushPlate(sp);
  });
}
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
    customMenu=recMenu.merged; saveCustomMenu(); rebuildMenu();
    var menuPushById={};
    recMenu.localOnly.filter(function(c){return c.custom;}).forEach(function(c){ menuPushById[c.id]=dbPushMenu(c); });   // re-push orphaned dishes; their promises let dependent plate re-pushes wait
    try{ var mres=await SUPA.from('menus').select('*'); if(mres && !mres.error && Array.isArray(mres.data) && mres.data.length){ menusList=mres.data.map(function(r){return {id:r.id, name:r.name, season:r.season||null};}); } }catch(e){ /* menus table may not exist yet -> keep local/default */ }
    ensureDefaultMenu(); ensureUnassignedMenuIfReferenced(); saveMenus();   // v42: if the menus-table snapshot dropped the holding area but dishes still point at it, bring it back
    if(!menusList.some(function(m){return m.id===currentMenuId;})) setCurrentMenuId(fallbackMenuId());
    // v42 (Item 1): same heal for plates — a local-only plate (its push was dropped offline) must survive the
    // reload, not be clobbered. Re-push each AFTER its referenced dish's re-push (menuPushById) so we never
    // orphan the plate against a not-yet-landed menu_items row; a dish already on the server has no entry, so
    // dbPushPlateAfterMenu falls through to an immediate push.
    var recPlate=reconcileLocalOnly(savedPlates, (pla.data||[]).map(rowToPlate), null);
    savedPlates=recPlate.merged; savePlatesLS();
    recPlate.localOnly.forEach(function(s){ dbPushPlateAfterMenu(s, (s.menuId&&menuPushById[s.menuId])?menuPushById[s.menuId]:null); });
    try{ var _h=await SUPA.from('price_history').select('*').order('recorded_at',{ascending:true}); if(_h && _h.data){ priceHistory=_h.data.map(function(r){return {t:new Date(r.recorded_at).getTime(), v:Number(r.avg_food_cost_pct)};}); saveHistory(); } }catch(e){}
    try{ var spr=await SUPA.from('supplier_phrases').select('*'); if(spr && !spr.error && Array.isArray(spr.data)){ var mm={}; spr.data.forEach(function(r){ mm[r.id]={id:r.id, supplier:r.supplier, phrase_norm:r.phrase_norm, qty:Number(r.qty), unit:r.unit}; }); supplierMem=mm; saveSupplierMem(); } }catch(e){ /* supplier_phrases table may not exist yet -> keep local */ }
    var impRow=setRows.filter(function(r){return r.key==='last_invoice_import';})[0];
    if(impRow && impRow.value){ try{ localStorage.setItem('cafeDB_lastImport', impRow.value); }catch(e){} }
    var cogsRow=setRows.filter(function(r){return r.key==='food_cost_target';})[0];
    if(cogsRow && cogsRow.value!=null){ var pv=parseFloat(cogsRow.value); if(pv>=1&&pv<=99){ cogsPct=pv; try{localStorage.setItem('cafeDB_cogsPct',String(pv));}catch(e){} if(typeof syncCogsRead==='function') syncCogsRead(); var ci2=document.getElementById('setCogsInput'); if(ci2)ci2.value=pv; } }
    var gstRow=setRows.filter(function(r){return r.key==='gst_default';})[0];                    // ITEM 6 (v35): brand-new accounts have no row -> loadGstDefault's 'ex' stands, preserving current behaviour
    if(gstRow && (gstRow.value==='inc'||gstRow.value==='ex')){ setGstDefault(gstRow.value,false); var gi=document.getElementById('setGstDefault'); if(gi)gi.value=gstRow.value; }
    buildMenuOptions(); buildMenuSelector(); renderPlate(); renderAnalysis(); updateLastImport(); updateEditTag();
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
function defaultQty(p){return p.base_unit==='ea'?1:100;}
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
(function(){ var qc=document.getElementById('qClear'); if(qc&&qEl) qc.addEventListener('click',function(){ qEl.value=''; if(dropEl){dropEl.style.display='none';} qEl.setAttribute('aria-expanded','false'); qEl.focus(); }); })();   // v37: same clear affordance as every other search
let curList=[], hiIdx=-1;
function kitchenSearchMatches(q){                                     // kitchen ingredients matching the query (by name)
  q=(q||'').trim().toLowerCase();
  var list=kitchenIngredients.filter(function(k){ return k && k.name && (!q || k.name.toLowerCase().indexOf(q)>=0 || subseq(q,k.name.toLowerCase())); });
  list.sort(function(a,b){ return a.name.toLowerCase().localeCompare(b.name.toLowerCase()); });
  return list.slice(0,12).map(function(k){ return {__kid:true, id:k.id, name:k.name, pid:k.pid}; });
}
function pickListItem(it){ if(!it) return; if(it.__create){ createIngredientFromSearch(it.q); return; } if(it.__kid) addKitchenLine(it.id); }
function createIngredientFromSearch(q){                               // "+ Create 'x'": open the ingredient modal pre-filled, and add it to the plate on save
  closeDrop();
  openKingModal(null);
  var nameEl=document.getElementById('king_name'); if(nameEl){ nameEl.value=(q||'').trim(); nameEl.dispatchEvent(new Event('input')); }
  kingAddToPlateOnSave=true;                                          // consumed once by saveKingModal (create path)
}
function renderDrop(){
  const q=qEl.value;
  curList=kitchenSearchMatches(q); hiIdx=-1;                          // BUILDER IS INGREDIENTS-ONLY: recipes are built from kitchen words, never raw supplier products
  if(!curList.length){
    const qt=(q||'').trim();
    if(qt){
      dropEl.innerHTML='<div class="opt opt-msg" style="cursor:default">No ingredient called \u201c'+esc(qt)+'\u201d yet</div>'
        +'<div class="opt opt-create" role="option" data-create="1">+ Create \u201c'+esc(qt)+'\u201d</div>';
      curList=[{__create:true, q:qt}];
    } else {
      dropEl.innerHTML='<div class="opt opt-msg" style="cursor:default">Type to find an ingredient, or add one on the Ingredients tab</div>';
    }
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
  if(o.dataset.create){ createIngredientFromSearch((qEl.value||'').trim()); } else if(o.dataset.kid){ addKitchenLine(o.dataset.kid); }});
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

/* ---------- plate ---------- */
let plate=[], uidc=1;
const linesEl=document.getElementById('lines');
function addProduct(pid){const p=byId[pid];if(!p)return;plate.push({uid:uidc++,pid,qty:defaultQty(p)});qEl.value='';closeDrop();renderPlate();qEl.focus();}   /* legacy: no builder UI path in v31 (builder is ingredients-only); retained for programmatic use */
function addKitchenLine(kid){const k=kById[kid];if(!k)return;const p=byId[k.pid];plate.push({uid:uidc++,kid:kid,qty:p?defaultQty(p):100});qEl.value='';closeDrop();renderPlate();qEl.focus();}
function removeLine(uid){plate=plate.filter(l=>l.uid!==uid);renderPlate();}
function swapLine(uid,newpid){const l=plate.find(x=>x.uid===uid);if(!l)return;l.pid=newpid;const np=byId[newpid];if(np.base_unit==='ea'&&l.qty>100)l.qty=defaultQty(np);renderPlate();}   /* legacy: alternatives moved to the ingredient popup in v31 */
function setQty(uid,v){const l=plate.find(x=>x.uid===uid);if(!l)return;l.qty=Math.max(0,parseFloat(v)||0);updateLine(uid);updateTotals();}
function toggleAlts(uid){const el=document.getElementById('alts-'+uid);if(el)el.classList.toggle('open');}

function editPrice(uid){
  const l=plate.find(x=>x.uid===uid);if(!l)return;const p=lineProduct(l);if(!p)return;
  if(!['g','ml','ea'].includes(p.base_unit))return;
  const chip=document.getElementById('pc-'+uid);if(!chip)return;
  const word=displayUnitWord(p), val=perDisplayValue(p);
  chip.innerHTML='$<input class="pin" type="number" min="0" step="0.01" value="'+(val!=null?val.toFixed(p.base_unit==='ea'?3:2):'')+'"> /'+word;
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

function miscRowHtml(l){                                              // an editable, removable non-ingredient cost line (spices, boxes, etc.)
  return '<div class="line misc-line" data-uid="'+l.uid+'">'
    +'<div class="top">'
    +'<span class="nm"><input type="text" class="misc-label" placeholder="e.g. Packaging, spices" value="'+esc(l.label||'')+'" aria-label="misc cost label" oninput="setMiscLabel('+l.uid+',this.value)"><span class="sub">Misc cost \u00b7 not an ingredient</span></span>'
    +'<span class="qtybox misc-costbox"><span class="u">$</span><input type="number" min="0" step="0.01" value="'+(l.cost!=null?l.cost:0)+'" aria-label="misc cost amount" oninput="setMiscCost('+l.uid+',this.value)"></span>'
    +'<span class="leader"></span>'
    +'<span class="lc" id="lc-'+l.uid+'">'+money(Number(l.cost)||0)+'</span>'
    +'<button class="x" type="button" title="Remove" aria-label="Remove" onclick="removeLine('+l.uid+')">\u00d7</button>'
    +'</div></div>';
}
function addMiscCost(){                                               // Builder-only; never enters the ingredient DB
  plate.push({uid:uidc++, misc:true, label:'', cost:0});
  renderPlate();
  var rows=document.querySelectorAll('.misc-line .misc-label'); var last=rows[rows.length-1]; if(last) last.focus();
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
      return `<div class="line missing-line" data-uid="${l.uid}">
      <div class="top">
        <span class="nm"><b>${title}</b><span class="sub warn">product missing</span></span>
        <span class="qtybox"><input type="number" min="0" step="1" value="${l.qty}" aria-label="quantity" oninput="setQty(${l.uid},this.value)"></span>
        <span class="leader"></span>
        <span class="lc"><span class=nocost>no cost</span></span>
        <button class="x" type="button" title="Remove" aria-label="Remove" onclick="removeLine(${l.uid})">×</button>
      </div></div>`;
    }
    const lc=lineCost(p,l.qty);
    const editable = ['g','ml','ea'].includes(p.base_unit);
    const priceChip = editable
      ? `<span class="pchip" id="pc-${l.uid}" tabindex="0" role="button" title="Click to edit price" onclick="editPrice(${l.uid})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();editPrice(${l.uid})}">${unitCostStr(p)} <span class="pen">✎</span></span>`
      : `<span>${unitCostStr(p)}</span>`;
    let nameBlock, row2='';
    if(isKid){                                                  // kitchen word up top, linked product small underneath
      nameBlock=`<b>${esc(kName)}</b>
          <span class="sub">→ ${esc(p.description)}${p.brand?' · '+esc(p.brand):''}</span>
          <span class="priceline">Unit cost: ${priceChip}</span>`;
      row2=`<div class="row2"><span class="king-tag">ingredient</span></div>`;
    } else {                                                     // legacy direct-product line (pre-v31 saved plates): render + cost, no alternatives
      const tag = !BASE_IDS.has(p.id) ? '<span class="edited">· new</span>'
                : (overrides[p.id]&&overrides[p.id].cost_per_base_unit!=null?'<span class="edited">· edited</span>':'');
      nameBlock=`<b>${esc(p.description)}</b>
          <span class="sub">${p.brand?esc(p.brand)+' · ':''}${esc(p.category)}</span>
          <span class="priceline">Unit cost: ${priceChip}${tag}</span>`;
    }
    return `<div class="line" data-uid="${l.uid}">
      <div class="top">
        <span class="nm">
          ${nameBlock}
        </span>
        <span class="qtybox"><input type="number" min="0" step="1" value="${l.qty}" aria-label="quantity" oninput="setQty(${l.uid},this.value)"><span class="u">${unitNoun(p)}</span></span>
        <span class="leader"></span>
        <span class="lc" id="lc-${l.uid}">${lc==null?'<span class=nocost>no cost</span>':money(lc)}</span>
        <button class="x" type="button" title="Remove" aria-label="Remove" onclick="removeLine(${l.uid})">×</button>
      </div>
      ${row2}
    </div>`;}).join('');
  updateTotals();
  var bh=document.getElementById('builderHint');
  if(bh){
    if(!kitchenIngredients.length){ bh.innerHTML='No ingredients yet \u2014 <a href="#" id="bhGo">create your kitchen words</a> first, then build plates with them.'; var g=document.getElementById('bhGo'); if(g)g.onclick=function(e){e.preventDefault();showTab('pantry');}; }
    else bh.textContent='Build plates from your ingredients. Not there yet? Type a name and create it on the spot.';
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
document.getElementById('printBtn').addEventListener('click',function(){
  var n=(document.getElementById('plateName').value||'').trim();
  var pd=document.getElementById('printDocket'); if(!pd){ window.print(); return; }
  var rows=plate.map(function(l){
    if(l.misc){ return '<tr><td class="pd-q"></td><td class="pd-n">'+esc(l.label||'Misc cost')+'</td></tr>'; }
    var p=lineProduct(l);
    var nm=l.kid ? esc((kById[l.kid]&&kById[l.kid].name)||'Ingredient') : (p?esc(p.description||'Item'):'');
    if(!nm) return '';
    var u=p?unitNoun(p):''; var q=l.qty;
    return '<tr><td class="pd-q">'+esc(String(q))+(u?' '+esc(u):'')+'</td><td class="pd-n">'+nm+'</td></tr>';
  }).filter(Boolean).join('');
  pd.innerHTML='<div class="pd-card">'
    +'<div class="pd-logo">Ez<span>Plate</span></div>'
    +'<div class="pd-title">'+esc(n||'Recipe card')+'</div>'
    +'<div class="pd-meta">Recipe card \u00b7 '+plate.length+' item'+(plate.length===1?'':'s')+'</div>'
    +'<table class="pd-table"><tbody>'+rows+'</tbody></table>'
    +'</div>';
  window.print();
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
var MENU_UNASSIGNED='MENU_UNASSIGNED';                              // v42: reserved holding "menu" for dishes whose menu was deleted ("Unassigned dishes")
var UNASSIGNED_NAME='Unassigned dishes';
function realMenus(){ return menusList.filter(function(m){return m.id!==MENU_UNASSIGNED;}); }   // v42: the holding area is NOT a real menu — it never counts toward "how many menus exist"
function ensureDefaultMenu(){ if(!realMenus().length) menusList.unshift({id:'MENU_ORIGINAL',name:'Original menu',season:null}); }   // v40/v42: seed Original only when NO real menu exists (holding area alone doesn't count) — never resurrect a deliberately deleted Original
ensureDefaultMenu();
// v42: bring the holding area into existence on demand, pushing its record BEFORE any dish is reassigned into
// it (so if menu_items.menu_id is FK-enforced against a menus table, the row is already there). Returns the
// push promise (or null if it already existed / no client) so callers can sequence the reassignment.
function ensureUnassignedMenu(){
  if(menusList.some(function(m){return m.id===MENU_UNASSIGNED;})) return null;
  menusList.push({id:MENU_UNASSIGNED,name:UNASSIGNED_NAME,season:null}); saveMenus();
  return (typeof dbUpsertMenuRecord==='function')?dbUpsertMenuRecord({id:MENU_UNASSIGNED,name:UNASSIGNED_NAME,season:null}):null;
}
function holdingHasDishes(){ return (typeof customMenu!=='undefined') && customMenu.some(function(c){return (c.menuId||'MENU_ORIGINAL')===MENU_UNASSIGNED;}); }
function ensureUnassignedMenuIfReferenced(){ if(holdingHasDishes()) ensureUnassignedMenu(); }   // v42: self-heal — keep the holding area present locally whenever a dish still points at it
function fallbackMenuId(){                                          // v40/v42: a current-menu fallback that never returns a deleted id, and never the holding area while a real menu exists
  var real=realMenus();
  if(real.some(function(m){return m.id==='MENU_ORIGINAL';})) return 'MENU_ORIGINAL';
  if(real[0]) return real[0].id;
  return (menusList[0] && menusList[0].id) || 'MENU_ORIGINAL';     // only the holding area (or nothing) remains
}
function canDeleteMenu(id){                                         // v40/v42: the holding area is never deletable; a real menu is deletable unless that would leave NO selectable menu
  if(id===MENU_UNASSIGNED) return false;
  if(!menusList.some(function(m){return m.id===id;})) return false;
  if(realMenus().some(function(m){return m.id!==id;})) return true;                 // another real menu will remain
  if(menusList.some(function(m){return m.id===MENU_UNASSIGNED;})) return true;      // holding area already stands
  return (typeof customMenu!=='undefined') && customMenu.some(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});   // last real menu, but its dishes will spawn the holding area
}
function loadCurrentMenuId(){ try{ return localStorage.getItem('cafeDB_currentMenuId')||'MENU_ORIGINAL'; }catch(e){ return 'MENU_ORIGINAL'; } }
var currentMenuId=loadCurrentMenuId();
function setCurrentMenuId(id){ currentMenuId=id||'MENU_ORIGINAL'; try{ localStorage.setItem('cafeDB_currentMenuId', currentMenuId); }catch(e){} }
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
ensureUnassignedMenuIfReferenced();   // v42: on cold start, show the holding area if any saved dish already lives in it
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
function saveCurrentPlate(asNew, menuPushPromise){          // v40: menuPushPromise (from a just-published menu item) sequences the plate push after it
  if(!plate.length){toast('Add ingredients to the plate first');return;}
  var rawName=(document.getElementById('plateName').value||'').trim();
  var pErr=document.getElementById('plateNameErr');
  if(!rawName){ if(pErr){ pErr.textContent='Give this plate a name before saving.'; pErr.style.display='block'; } var pn=document.getElementById('plateName'); if(pn){ pn.focus(); } return; }
  if(pErr) pErr.style.display='none';
  var name=rawName;
  var menuId=menuLinkEl.value||null;
  var lines=plate.map(function(l){ return l.misc?{misc:true,label:l.label||'',cost:Number(l.cost)||0}:(l.kid?{kid:l.kid,qty:l.qty}:{pid:l.pid,qty:l.qty}); });
  if(!loadedPlateId && menuId){ var existLinked=savedPlates.find(function(s){return s.menuId===menuId;}); if(existLinked) loadedPlateId=existLinked.id; }
  if(!asNew && loadedPlateId){ var sp=savedPlates.find(function(s){return s.id===loadedPlateId;}); if(sp){sp.name=name;sp.menuId=menuId;sp.lines=lines;} else loadedPlateId=null; }
  if(asNew || !loadedPlateId){ var id='SP'+Date.now().toString(36); savedPlates.push({id:id,name:name,menuId:menuId,lines:lines}); loadedPlateId=id; }
  savePlatesLS(); dbPushPlateAfterMenu(savedPlates.find(function(s){return s.id===loadedPlateId;}), menuPushPromise); updateEditTag(); toast(asNew?'Saved as a new plate':'Plate saved'); renderAnalysis();
}
document.getElementById('saveBtn').addEventListener('click',function(){saveCurrentPlate(false);});
(function(){ var amb=document.getElementById('addMiscBtn'); if(amb) amb.addEventListener('click',addMiscCost); })();
document.getElementById('addMenuBtn').addEventListener('click',openMenuModal);
/* menu analysis */
function costFromLines(lines){let c=0,miss=0;(lines||[]).forEach(l=>{ if(l&&l.misc){ var mc=Number(l.cost); if(!isNaN(mc)) c+=mc; return; } const p=lineProduct(l);if(!p){miss++;return;}const lc=lineCost(p,l.qty);if(lc==null)miss++;else c+=lc;});return c;}
/* a menu item's recipe lives on its linked plate (plate.menuId === item.id); a "reused" item instead points at
   a shared plate via item.sourcePlateId. This resolves either kind to the plate holding the ingredient lines. */
function plateForMenuItem(m){ if(!m) return null;
  var sp=savedPlates.find(function(s){return s.menuId===m.id;}); if(sp) return sp;
  if(m.sourcePlateId){ return savedPlates.find(function(s){return s.id===m.sourcePlateId;})||null; }
  return null;
}
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
  try{ if(t==='analysis')renderAnalysis(); else if(t==='ingredients')renderIngredients(); else if(t==='dashboard')renderDashboard(); else if(t==='pantry')renderKitchenPanel(); else renderPlate(); }catch(e){ console.error('[rerender]', e); }
}
function showTab(t){
  try{ localStorage.setItem('cafeDB_lastTab', t); }catch(e){}          // remember where the user was, for next refresh
  document.querySelectorAll('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  ['builder','ingredients','analysis','dashboard','pantry'].forEach(function(name){ var el=document.getElementById('tab-'+name); if(el) el.style.display=(t===name)?'':'none'; });
  if(t==='analysis')renderAnalysis();
  if(t==='ingredients')renderIngredients();
  if(t==='dashboard')renderDashboard();
  if(t==='pantry')renderKitchenPanel();   // data-tab="pantry" is the user-invisible key; its LABEL is "Ingredients" (see glossary)
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
})();
buildMenuOptions(); buildMenuSelector(); bindTips();

renderPlate();

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
  var v=computeAvgFoodCost(); if(v==null) return;
  v=Math.round(v*10)/10;
  var iso=new Date().toISOString();
  var last=priceHistory[priceHistory.length-1];
  if(last && Math.abs(last.v-v)<0.05 && (Date.now()-new Date(last.t).getTime())<3600000) return;  // skip near-duplicate within the hour
  priceHistory.push({t:iso, v:v});
  if(priceHistory.length>500) priceHistory=priceHistory.slice(-500);
  saveHistory(); dbPushHistory(iso, v);
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
function emptyStateHtml(icon,title,body,actionsHtml){
  return '<div class="empty-state">'+icon+'<h3>'+esc(title)+'</h3><p>'+esc(body)+'</p>'+(actionsHtml?'<div class="es-actions">'+actionsHtml+'</div>':'')+'</div>';
}
function ingUnitLabel(p){ return p.base_unit==='g'?'per kg':p.base_unit==='ml'?'per litre':p.base_unit==='ea'?'per unit':(p.base_unit||''); }
function fillFilter(sel, list, label){
  if(!sel) return; var cur=sel.value;
  var html='<option value="">'+label+'</option>'+list.map(function(v){return '<option value="'+esc(v)+'">'+esc(v)+'</option>';}).join('');
  sel.innerHTML=html; if(cur && list.indexOf(cur)>=0) sel.value=cur;
}
function renderIngredients(){
  var wrap=document.getElementById('ingList'); if(!wrap) return;
  var cntEl=document.getElementById('ingCount');
  if(!PRODUCTS.length){                                               // brand-new user: no products at all -> full empty state (gate on the store, not the filtered rows)
    if(cntEl) cntEl.textContent='';
    wrap.innerHTML=emptyStateHtml(ICON_BOX_BIG,'No products yet','Products are the things you buy \u2014 import a supplier invoice and EzPlate reads them in, or add one by hand.',
      '<button class="btn primary" type="button" onclick="document.getElementById(\'importBtn\').click()">Import invoice</button>'
      +'<button class="btn" type="button" onclick="openModal()">+ Add product</button>');
    return;
  }
  fillFilter(document.getElementById('ingCatFilter'), prodCategories(), 'All categories');
  fillFilter(document.getElementById('ingSupFilter'), prodSuppliers(), 'All suppliers');
  var q=(document.getElementById('ingSearch')?document.getElementById('ingSearch').value:'').trim().toLowerCase();
  var cat=(document.getElementById('ingCatFilter')||{}).value||'';
  var sup=(document.getElementById('ingSupFilter')||{}).value||'';
  var items=PRODUCTS.filter(function(p){
    if(cat && p.category!==cat) return false;
    if(sup && (p.supplier||'')!==sup) return false;
    if(q){ var hay=((p.description||'')+' '+(p.brand||'')+' '+(p.category||'')+' '+(p.supplier||'')).toLowerCase(); if(hay.indexOf(q)<0) return false; }
    return true;
  }).slice().sort(function(a,b){return (a.description||'').toLowerCase().localeCompare((b.description||'').toLowerCase());});
  if(cntEl) cntEl.textContent=items.length+' product'+(items.length===1?'':'s');
  if(!items.length){ wrap.innerHTML='<div class="an-empty ing-empty">No products match your filters.</div>'; return; }
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
  var unitType=document.getElementById('ig_unit').value;
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
/* ITEM 3 (v35): the pantry filter, kept pure (no DOM) so it can be tested directly.
   Matches the kitchen word's own name — with the same subseq fallback the Builder
   search uses, so "chps" still finds "Chips" — OR the description/brand of the
   product behind it, so searching "safries" finds the word "Chips". */
function kingSearchFilter(q, words, prods){
  q=(q||'').trim().toLowerCase();
  if(!q) return (words||[]).slice();
  return (words||[]).filter(function(k){
    if(!k) return false;
    var nm=(k.name||'').toLowerCase();
    if(nm.indexOf(q)>=0 || subseq(q,nm)) return true;
    var p=(prods||{})[k.pid]; if(!p) return false;
    return (((p.description||'')+' '+(p.brand||'')).toLowerCase().indexOf(q)>=0);
  });
}
var kingQuery='';
function renderKitchenPanel(){
  var box=document.getElementById('kingList'); if(!box) return;
  var sw=document.getElementById('kingSearch'); if(sw) kingQuery=sw.value||'';
  if(!kitchenIngredients.length){
    box.innerHTML=emptyStateHtml(ICON_LEAF_BIG,'No ingredients yet','Ingredients are your kitchen words \u2014 \u201cChips\u201d, \u201cFish\u201d, \u201cTartare\u201d. Each one links to a product you buy, so recipes stay simple and brand swaps take one tap.',
      '<button class="btn primary" type="button" id="kingEmptyNew">+ New ingredient</button>');
    var b=document.getElementById('kingEmptyNew'); if(b) b.onclick=function(){ openKingModal(null); };
    renderKingProgress();                                            // zero kitchen words + many products is EXACTLY when the wizard matters
    return;
  }
  var list=kingSearchFilter(kingQuery, kitchenIngredients, byId).sort(function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());});
  if(!list.length){                                                  // ITEM 3 (v35): there ARE words, the filter just matched none of them
    box.innerHTML='<div class="empty">No ingredients match</div>';
    renderKingProgress();                                            // progress counts PRODUCTS, not the filtered view — it stays true
    return;
  }
  box.innerHTML=list.map(function(k){
    return '<div class="king-row" data-kid="'+esc(k.id)+'">'
      +'<div class="king-main"><span class="king-name">'+esc(k.name||'Ingredient')+'</span>'
      +'<span class="king-link">'+esc(kingProductLabel(k))+'</span></div>'
      +'<div class="king-acts">'
      +'<button class="linklike king-change" type="button">Edit</button>'
      +'<button class="linklike king-del" type="button">Remove</button>'
      +'</div></div>';
  }).join('');
  box.querySelectorAll('.king-change').forEach(function(b){ b.onclick=function(){ openKingModal(b.closest('.king-row').getAttribute('data-kid')); }; });
  box.querySelectorAll('.king-del').forEach(function(b){ b.onclick=function(){ deleteKitchenIngredient(b.closest('.king-row').getAttribute('data-kid')); }; });
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
  wb.textContent=kingWizOpen?'Close setup':'Set up from products';
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
  if(!kingWizOpen){ box.style.display='none'; box.innerHTML=''; renderKingProgress(); return; }
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
function kingSyncSave(){ var s=document.getElementById('kingModalSave'); if(s) s.disabled=!kingValid(); }
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
  if(!scored.length){ drop.innerHTML='<div class="opt muted">No products match</div>'; drop.style.display='block'; return; }
  drop.innerHTML=scored.map(function(p){
    return '<div class="opt cat-opt" data-pid="'+esc(p.id)+'">'+esc(p.description)+(p.brand?' <span class="ca">'+esc(p.brand)+'</span>':'')+' <span class="ca">'+esc(unitCostStr(p))+'</span></div>';
  }).join('');
  drop.style.display='block';
  drop.querySelectorAll('.cat-opt').forEach(function(o){ o.addEventListener('mousedown',function(e){ e.preventDefault();
    var pid=o.getAttribute('data-pid'); var p=byId[pid]; if(!p) return;
    kingChosenPid=pid; inp.value=p.description+(p.brand?' \u2014 '+p.brand:''); drop.style.display='none'; kingSyncSave();
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
    prodEl.addEventListener('blur',function(){ setTimeout(function(){ document.getElementById('king_prodDrop').style.display='none'; },150); });
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
    var commit=function(){ k.name=chk.name; k.pid=pid; saveKitchenIngredients(); renderKitchenPanel(); rerenderCurrentTab();
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
  var _goHome=function(){ showTab('dashboard'); };   // v39: the logo is the way home
  ['brandHome','sideBrandHome'].forEach(function(id){   // header logo (mobile) + sidebar logo (desktop >=1024px) — one is always the visible one
    var el=document.getElementById(id); if(!el) return;
    el.addEventListener('click',_goHome);
    el.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); _goHome(); } });
  });
  var ks=document.getElementById('kingSearch'), kc=document.getElementById('kingSearchClear');
  if(ks){ ks.addEventListener('input',function(){                     // ITEM 3 (v35)
    kingQuery=ks.value||'';
    if(kingQuery && kingWizOpen){ kingWizOpen=false; renderKingWizard(); }   // searching and the setup wizard are two different jobs — never both at once
    renderKitchenPanel();
  });
  ks.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); ks.blur(); } }); }   // v37: Enter commits the search (dismisses the keyboard)
  if(kc) kc.addEventListener('click',function(){ if(ks){ ks.value=''; } kingQuery=''; renderKitchenPanel(); if(ks) ks.focus(); });
  on('kingModalSave',saveKingModal); on('kingModalCancel',closeKingModal); on('kingModalClose',closeKingModal);
  var m=document.getElementById('kingModal'); if(m) m.addEventListener('click',function(ev){ if(ev.target===m) closeKingModal(); });
})();


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
function trendChart(){
  var pts=dashRangePts();
  var W=320,H=210,padL=40,padR=10,padT=14,padB=20;   /* v36: chart takes the space the stat cards gave back */
  if(pts.length<2){
    var emptyHint=(priceHistory.length>=2)
      ? 'No points in this range yet \u2014 try a longer range.'
      : 'The trend needs at least two logged points. A point is recorded only when a menu item is linked to a costed plate (so an average food cost exists) and a price then changes. Link a plate to a menu item, then update a price, to start the line.';
    return '<div class="dash-chart empty"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Food cost trend"></svg>'
      +'<p class="hint chart-hint">'+emptyHint+'</p></div>';
  }
  var vals=pts.map(function(p){return p.v;}).concat([cogsPct]);
  var mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals);
  if(mx-mn<4){ mn-=2; mx+=2; } mn=Math.max(0,mn-1); mx=mx+1;
  var x=function(i){ return padL+(W-padL-padR)*(pts.length===1?0.5:i/(pts.length-1)); };
  var y=function(v){ return padT+(H-padT-padB)*(1-(v-mn)/(mx-mn)); };
  var d=pts.map(function(p,i){ return (i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1); }).join(' ');
  var trendUp=pts[pts.length-1].v > pts[0].v + 0.05;
  var trendDown=pts[pts.length-1].v < pts[0].v - 0.05;
  var stroke=trendUp?'var(--bad)':trendDown?'var(--good)':'var(--muted2)';
  var refY=y(cogsPct).toFixed(1);
  var area=d+' L'+x(pts.length-1).toFixed(1)+' '+(H-padB)+' L'+x(0).toFixed(1)+' '+(H-padB)+' Z';
  var svg='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Average food cost trend">'
    +'<path d="'+area+'" fill="'+stroke+'" opacity="0.10"/>'
    +'<line class="ref-line" x1="'+padL+'" y1="'+refY+'" x2="'+(W-padR)+'" y2="'+refY+'" stroke="var(--muted2)" stroke-dasharray="4 4" stroke-width="1"/>'
    +'<path d="'+d+'" fill="none" stroke="'+stroke+'" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    +pts.map(function(p,i){ var lbl=(p.t?new Date(p.t).toLocaleDateString():('#'+(i+1)))+' \u00b7 '+p.v.toFixed(1)+'%';
        return '<circle class="tp-dot" cx="'+x(i).toFixed(1)+'" cy="'+y(p.v).toFixed(1)+'" r="3" fill="'+stroke+'" tabindex="0" role="button" data-lbl="'+esc(lbl)+'" data-x="'+x(i).toFixed(1)+'" data-y="'+y(p.v).toFixed(1)+'" aria-label="'+esc(lbl)+'"/>'; }).join('')
    +'<circle cx="'+x(pts.length-1).toFixed(1)+'" cy="'+y(pts[pts.length-1].v).toFixed(1)+'" r="3.5" fill="'+stroke+'" pointer-events="none"/>'
    +'<text x="'+(padL-7)+'" y="'+y(mx).toFixed(1)+'" text-anchor="end" class="ax">'+mx.toFixed(0)+'%</text>'
    +'<text x="'+(padL-7)+'" y="'+(H-padB+2).toFixed(1)+'" text-anchor="end" class="ax">'+mn.toFixed(0)+'%</text>'
    +'</svg>';
  var trendWord=trendUp?'trending up (food cost rising)':trendDown?'trending down (margins improving)':'holding steady';
  return '<div class="dash-chart" id="trendWrap">'+svg
    +'<div class="tp-tip" id="trendTip" aria-hidden="true"></div>'
    +'<span class="ref-pill ref-pill-static">Target '+cogsPct+'%</span>'   // ITEM 3 (v33): read-only marker; the target is edited in the Menu section
    +'<p class="hint chart-hint">Average food cost across the menu \u2014 '+trendWord+'. Tap a point for its date.</p></div>';
}
function highlightData(kind){
  if(kind==='foodcost'){
    var rows=[];
    MENU.forEach(function(m){ if(!(m.price>0))return; var sp=plateForMenuItem(m); if(!sp)return; var c=costFromLines(sp.lines); if(c>0) rows.push({name:m.name, val:c/m.price*100, disp:(c/m.price*100).toFixed(1)+'%'}); });
    rows.sort(function(a,b){return b.val-a.val;}); return {title:'Highest food cost %', rows:rows};
  }
  if(kind==='portion'){
    var pr=[];
    savedPlates.forEach(function(sp){ var c=costFromLines(sp.lines); if(c>0){ var nm=sp.name; if(sp.menuId&&menuById[sp.menuId])nm=menuById[sp.menuId].name; pr.push({name:nm||'Plate', val:c, disp:fmt2(c)}); } });
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
  root.innerHTML=html;
  root.querySelectorAll('.range-btn').forEach(function(b){ b.onclick=function(){ setDashRange(b.getAttribute('data-rg')); }; });
  (function wireTrendTip(){                                          // one tooltip at a time; tap point (mobile) or hover (desktop)
    var wrap=document.getElementById('trendWrap'), tip=document.getElementById('trendTip'); if(!wrap||!tip) return;
    var svg=wrap.querySelector('svg'); if(!svg) return;
    function showFor(dot){ var vb=svg.viewBox.baseVal, rect=svg.getBoundingClientRect();
      var px=parseFloat(dot.getAttribute('data-x')), py=parseFloat(dot.getAttribute('data-y'));
      var left=(px/vb.width)*rect.width, top=(py/vb.height)*rect.height;
      tip.textContent=dot.getAttribute('data-lbl'); tip.style.left=left+'px'; tip.style.top=top+'px';
      tip.classList.add('show'); tip.setAttribute('aria-hidden','false');
      wrap.querySelectorAll('.tp-dot.act').forEach(function(d){ d.classList.remove('act'); }); dot.classList.add('act');
    }
    function hideTip(){ tip.classList.remove('show'); tip.setAttribute('aria-hidden','true'); wrap.querySelectorAll('.tp-dot.act').forEach(function(d){ d.classList.remove('act'); }); }
    wrap.querySelectorAll('.tp-dot').forEach(function(dot){
      dot.addEventListener('mouseenter', function(){ showFor(dot); });
      dot.addEventListener('focus', function(){ showFor(dot); });
    });
    var dots=[].slice.call(wrap.querySelectorAll('.tp-dot'));
    function nearestDot(clientX){ var best=null,bd=1e9; dots.forEach(function(d){ var r=d.getBoundingClientRect(); var cx=r.left+r.width/2; var dd=Math.abs(cx-clientX); if(dd<bd){bd=dd;best=d;} }); return best; }
    var scrubbing=false;
    svg.addEventListener('pointerdown', function(e){                 // press anywhere on the chart, slide between points
      scrubbing=true; try{ svg.setPointerCapture(e.pointerId); }catch(_){ }
      e.preventDefault(); var d=nearestDot(e.clientX); if(d) showFor(d);
    });
    svg.addEventListener('pointermove', function(e){ if(!scrubbing) return; e.preventDefault(); var d=nearestDot(e.clientX); if(d) showFor(d); });
    ['pointerup','pointercancel'].forEach(function(ev){ svg.addEventListener(ev, function(){ scrubbing=false; }); });
    wrap.addEventListener('mouseleave', hideTip);
    document.addEventListener('click', function(e){ if(!wrap.contains(e.target)) hideTip(); });
  })();
  root.querySelectorAll('.hl-card').forEach(function(b){ b.onclick=function(){ openHighlight(b.getAttribute('data-kind')); }; });
}

/* ---------- wiring for new pages/modals ---------- */
(function(){
  var e=document.getElementById('ingSearch'); if(e) e.addEventListener('input',renderIngredients);
  ['ingCatFilter','ingSupFilter'].forEach(function(id){ var s=document.getElementById(id); if(s) s.addEventListener('change',renderIngredients); });
  var isc=document.getElementById('ingSearchClear'); if(isc) isc.addEventListener('click',function(){ var s=document.getElementById('ingSearch'); if(s){ s.value=''; renderIngredients(); s.focus(); } });
  var _is=document.getElementById('ingSearch'); if(_is) _is.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); _is.blur(); } });   // v37: Enter commits
  function on(id,fn){ var b=document.getElementById(id); if(b) b.addEventListener('click',fn); }
  on('ingSave',saveIngEdit); on('ingCancel',closeIngEdit); on('ingClose',closeIngEdit); on('ingDelete',deleteIngredient);
  on('hlClose',function(){hide('hlModal');}); on('hlDone',function(){hide('hlModal');});
  on('invIntroX',function(){ try{localStorage.setItem('ezInvIntroDismissed','1');}catch(e){} var el=document.getElementById('invIntro'); if(el)el.style.display='none'; });
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
var APP_VERSION='v43';
function openSettings(){
  var c=document.getElementById('setCogsInput'); if(c) c.value=cogsPct;
  var g=document.getElementById('setGstDefault'); if(g) g.value=gstDefault;
  var v=document.getElementById('setVersion'); if(v) v.textContent=APP_VERSION;
  show('settingsPanel');
}
function closeSettings(){ hide('settingsPanel'); }
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
function platesLinkedMenuIds(){ var s={}; savedPlates.forEach(function(sp){ if(sp.menuId) s[sp.menuId]=true; }); return s; }
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
      var mi=(it.menuId&&menuById[it.menuId])?menuById[it.menuId].name:null;
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
function loadMenuItemBlank(id){
  var m=menuById[id]; if(!m) return;
  plate=[];                                                 // an empty ingredient list is a valid starting state
  document.getElementById('plateName').value=m.name||'';
  menuTouched=true; menuLinkEl.value=id; loadedPlateId=null;
  hidePlateSuggest(); updateEditTag(); renderPlate(); showTab('builder');
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

/* ---- load saved plates (via the plate-name search field) ---- */
function loadPlate(id){
  var sp=savedPlates.find(function(s){return s.id===id;}); if(!sp)return;
  plate=[];                                                 // FULL clear first — never blend two plates
  sp.lines.forEach(function(l){ if(l&&l.misc){ plate.push({uid:uidc++,misc:true,label:l.label||'',cost:Number(l.cost)||0}); } else if(l&&l.kid){ plate.push({uid:uidc++,kid:l.kid,qty:l.qty}); } else if(byId[l.pid]) plate.push({uid:uidc++,pid:l.pid,qty:l.qty}); });
  document.getElementById('plateName').value=sp.name||'';
  menuTouched=true; menuLinkEl.value=sp.menuId||''; loadedPlateId=sp.id;
  hidePlateSuggest(); updateEditTag(); renderPlate(); showTab('builder'); toast('Loaded: '+(sp.name||'plate'));
}

/* ---- promote plate to a live menu item ---- */
function openMenuModal(){
  if(!plate.length){toast('Build or load a plate first');return;}
  var linkedId=(menuLinkEl.value && menuById[menuLinkEl.value])?menuLinkEl.value:null;
  publishTargetId=linkedId;
  var item=linkedId?menuById[linkedId]:null;
  var titleEl=document.getElementById('menuModalTitle'), saveEl=document.getElementById('menuSave');
  if(titleEl) titleEl.textContent=linkedId?'Update menu item':'Publish to menu';
  if(saveEl) saveEl.textContent=linkedId?'Update menu item':'Publish';
  var n=plateNameVal();
  document.getElementById('mi_name').value=item?item.name:((n==='Unnamed plate')?'':n);
  document.getElementById('mi_price').value=(item&&item.price!=null)?item.price:'';
  document.getElementById('mi_notes').value=(item&&item.notes)?item.notes:'';
  document.getElementById('mi_cat').value=item?item.section:'';
  buildMenuPickers(); var miMenu=document.getElementById('mi_menu'); if(miMenu){ var wantM=(item&&item.menuId)?item.menuId:currentMenuId; if(menusList.some(function(m){return m.id===wantM;})) miMenu.value=wantM; }
  catState.chosen=item?item.section:null; catState.chosenIsNew=false;
  document.getElementById('mi_catDrop').style.display='none'; document.getElementById('mi_catNew').style.display='none';
  document.getElementById('mi_err').style.display='none';
  show('menuModal');
}
function closeMenuModal(){hide('menuModal');}
function submitMenuItem(){
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
  var err=document.getElementById('mi_err');
  if(!name){err.textContent='Enter a menu item name.';err.style.display='block';return;}
  if(priceV===''||isNaN(parseFloat(priceV))||parseFloat(priceV)<0){err.textContent='Enter a valid sell price.';err.style.display='block';return;}
  var targetId, menuItemPush=null;
  if(publishTargetId){
    targetId=publishTargetId;
    var prevItem=menuById[targetId]||{};
    // v42 (Item 1): sequence the plate push after this menu_items upsert too, not just for brand-new dishes.
    // If the existing dish was an orphan (its original push was dropped offline), the upsert re-creates it and
    // the plate then references a row that's really on the server — no more plates_menu_id_fkey on re-publish.
    menuItemPush=upsertCustomMenu({id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,custom:true,menuId:chosenMenu,sourcePlateId:(prevItem.sourcePlateId||null)});
  } else {
    targetId='um'+Date.now().toString(36);
    customMenu.push({id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,custom:true,menuId:chosenMenu,sourcePlateId:null});
    saveCustomMenu(); menuItemPush=dbPushMenu({id:targetId,section:cat,name:name,price:parseFloat(priceV),notes:notes,menuId:chosenMenu,sourcePlateId:null});   // v40: this NEW menu_items row must land before the plate references it
  }
  rebuildMenu(); buildMenuOptions();
  setCurrentMenuId(chosenMenu); buildMenuSelector();          // show the menu this dish landed in
  menuLinkEl.value=targetId; menuTouched=true;
  saveCurrentPlate(false, menuItemPush);                      // sequence: plate push waits for the new menu-item push (no-op dependency when updating an existing item)
  renderAnalysis(); closeMenuModal(); updatePublishLabel();
  toast(publishTargetId?('"'+name+'" updated on the menu'):('"'+name+'" added to the menu'));
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
      invGst=invGstDetect(text); invSupplier=invSupplierDetect(text);
      var rows=pdfTextToRows(text), ta=document.getElementById('invCsv');
      if(rows.length){ ta.value=text.trim(); if(nameEl) nameEl.textContent=file.name+' \u2014 '+rows.length+' line'+(rows.length===1?'':'s')+' read, review below'; buildInvRows(rows); }
      else { ta.value=text.trim(); if(nameEl) nameEl.textContent=file.name+' \u2014 review the extracted text'; toast('Couldn\u2019t auto-detect priced lines \u2014 review the text below or enter manually'); }
    }).catch(function(e){
      if(nameEl) nameEl.textContent=file.name;
      if(e && e.message==='pdfjs-load') toast('Could not load the PDF reader \u2014 check your connection and try again');
      else showInvFileErr(IMG_PDF_MSG);
    });
  } else {
    var r=new FileReader();
    r.onload=function(){ document.getElementById('invCsv').value=String(r.result||''); parseInvoice(); };
    r.onerror=function(){ toast('Could not read that file'); };
    r.readAsText(file);
  }
}
function openInv(){document.getElementById('invCsv').value='';var r=document.getElementById('invReview');r.style.display='none';r.innerHTML='';var fe=document.getElementById('invFileErr');if(fe)fe.style.display='none';var fn=document.getElementById('invFileName');if(fn)fn.textContent='';var fi=document.getElementById('invFile');if(fi)fi.value='';invSupplier='';var _in=document.getElementById('invIntro');if(_in){var _d='';try{_d=localStorage.getItem('ezInvIntroDismissed');}catch(e){}_in.style.display=_d?'none':'';}updateLastImport();show('invModal');}
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
function parseInvoice(){
  var txt=document.getElementById('invCsv').value;
  invGst=invGstDetect(txt); invSupplier=invSupplierDetect(txt);
  var raw=parseInvoiceCSV(txt);
  if(!raw.length){toast('No valid rows. Use: product name, unit price per kg/unit');return;}
  buildInvRows(raw);
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
    drop.innerHTML=html; drop.style.display='block';
    drop.querySelectorAll('.cat-opt').forEach(function(o){ o.addEventListener('mousedown',function(e){e.preventDefault();
      var dn=o.getAttribute('data-new');
      if(dn!==null){ inp.value=dn; state.value=dn; state.isNew=true; state.confirmed=true; }
      else { var v=o.getAttribute('data-v'); inp.value=v; state.value=v; state.isNew=false; state.confirmed=true; }
      drop.style.display='none';
    }); });
  }
  inp.addEventListener('input',function(){ state.confirmed=false; state.isNew=false; state.value=inp.value.trim(); render(); });
  inp.addEventListener('focus',render);
  inp.addEventListener('blur',function(){ setTimeout(function(){ drop.style.display='none'; },150); });
}
function resolveCombo(inpId, listFn){
  var inp=document.getElementById(inpId), st=niCombos[inpId]||{}; var v=(inp?inp.value.trim():'');
  if(!v) return {ok:true, value:''};
  var items=listFn(), exact=items.filter(function(c){return c.toLowerCase()===v.toLowerCase();})[0];
  if(exact) return {ok:true, value:exact};
  if(st.confirmed && st.isNew && (st.value||'').toLowerCase()===v.toLowerCase()) return {ok:true, value:v};
  return {ok:false, value:v};
}
function niLab(t){ return '<span class="ni-lab">'+t+'<span class="ni-af">auto-filled</span></span>'; }   /* v37 */
function expandNewItem(i){
  var nirow=document.querySelector('.ni-row[data-ni="'+i+'"]'); if(!nirow) return;
  var panel=nirow.querySelector('.ni-panel'), r=invRows[i];
  if(!panel.dataset.built){
    var ut=r.unit==='kg'?'kg':r.unit==='l'?'litre':r.unit==='ea'?'unit':'kg';
    var pv=(r.unitPrice!=null)?r.unitPrice:'';
    panel.innerHTML=''
     +'<button type="button" class="x ni-close" aria-label="Close add-new-item form">\u00d7</button>'
     +'<div class="ni-head">Add new item from this invoice line</div>'
     +'<div class="ni-grid">'
     /* v37: every field is label-line + control-line; the auto-filled chip lives INLINE on the label — one place, every field, no overlap possible */
     +'<label class="ni-f">'+niLab('Name')+'<input id="ni_name'+i+'" type="text" value="'+esc(r.name)+'"></label>'
     +'<label class="ni-f">'+niLab('Brand')+'<span class="cat-wrap"><input id="ni_brand'+i+'" type="text" autocomplete="off" placeholder="search brands\u2026"><span id="ni_brandDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Category')+'<span class="cat-wrap"><input id="ni_cat'+i+'" type="text" autocomplete="off" placeholder="search categories\u2026"><span id="ni_catDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Supplier')+'<span class="cat-wrap"><input id="ni_sup'+i+'" type="text" autocomplete="off" placeholder="search suppliers\u2026"><span id="ni_supDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
     +'<label class="ni-f">'+niLab('Unit type')+'<select id="ni_unit'+i+'"><option value="kg">per kg</option><option value="g">per g</option><option value="litre">per litre</option><option value="ml">per ml</option><option value="unit">per unit/each</option></select></label>'
     +'<label class="ni-f">'+niLab('Price per unit ($)')+'<input id="ni_price'+i+'" type="number" min="0" step="0.01" value="'+pv+'"></label>'
     +'<label class="ni-f">'+niLab('Pack size (optional)')+'<input id="ni_pack'+i+'" type="text" placeholder="e.g. 6 x 2.5kg"></label>'
     +'<label class="ni-f ni-full">'+niLab('Kitchen name (optional)')+'<span class="cat-wrap"><input id="ni_king'+i+'" type="text" autocomplete="off" placeholder="what the kitchen calls it"><span id="ni_kingDrop'+i+'" class="cat-drop" style="display:none"></span></span></label>'
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
    makeInlineCombo('ni_king'+i,'ni_kingDrop'+i,kingNames);
    var _ki=document.getElementById('ni_king'+i);
    if(_ki){                                                         // keep v34's proposal as the prefill, but only when it isn't already a word — otherwise the field would silently mean "repoint" without the user asking for it
      var _prop=proposeKingName({description:r.name});
      if(_prop && !kingNameExists(_prop)){ _ki.value=_prop; var _kt=niCombos['ni_king'+i]; if(_kt){ _kt.value=_prop; _kt.isNew=true; _kt.confirmed=true; } }
    }
    if(invSupplier){ var _si=document.getElementById('ni_sup'+i); if(_si){ _si.value=invSupplier; var _st=niCombos['ni_sup'+i]; if(_st){ _st.value=invSupplier; _st.confirmed=true; _st.isNew=!prodSuppliers().some(function(x){return x.toLowerCase()===invSupplier.toLowerCase();}); } } }
  }
  nirow.style.display='';
}
function collapseNewItem(i){ var nirow=document.querySelector('.ni-row[data-ni="'+i+'"]'); if(nirow) nirow.style.display='none'; }
function closeNewItem(i){
  collapseNewItem(i);
  var r=invRows[i]; if(r){ r.addNew=false; r.bestId=null; r.manualPick=false; }   /* dismissing the form = this line is neither new nor matched (skip) */
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
  if(r.tier!=='hi') return 'review';                                 // low-confidence match still wants a human tick
  return 'matched';
}
function renderInvReview(){
  invRows.forEach(flagNeedsAttention);                              // ensure needsAttention is current for EVERY row before we count
  var states=invRows.map(invRowState);
  var matched=states.filter(function(s){return s==='matched';}).length;
  var newc=states.filter(function(s){return s==='new';}).length;
  var review=states.filter(function(s){return s==='review';}).length;
  var html='<div class="inv-sum">'+matched+' matched \u00b7 '+newc+' new \u00b7 '+review+' to review</div>';
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
    var chipHtml='', teachHtml='';
    if(r.remembered||r.fromProductPack) chipHtml='<button type="button" class="remembered-chip" data-i="'+i+'">Pack: '+(r.taughtQty!=null&&isFinite(r.taughtQty)?(r.taughtQty%1===0?r.taughtQty:r.taughtQty.toFixed(2)):'?')+' '+esc(unitWordOf(r.taughtUnit))+' \u2014 change</button>';
    if(r.needManual || r.remembered || r.fromProductPack){
      var mem=(normSupplier(invSupplier)?supplierMem[memKey(invSupplier, r.raw||r.name)]:null);
      var baseCat0=(r.bestId&&byId[r.bestId])?unitCatCategory(byId[r.bestId].base_unit):null;
      // ITEM 1 (v38): the prefill follows the SAME precedence as pricing — product pack > supplier memory > parser guess. r.taughtQty is only set when resolveMatchedPrice actually applied the product pack, so read the product directly as the next fallback: otherwise a product with a taught pack could still be prefilled with the parser's "1.5 kg" guess, and re-confirming that guess would overwrite the taught pack with it.
      var bprod=(r.bestId&&byId[r.bestId])?byId[r.bestId]:null;
      var prodPack=(bprod && bprod.pack_qty>0 && bprod.pack_unit)?bprod:null;
      var pq=(r.taughtQty!=null&&isFinite(r.taughtQty))?r.taughtQty:(prodPack?prodPack.pack_qty:(mem?mem.qty:''));
      var puNow=r.taughtUnit?r.taughtUnit:(prodPack?prodPack.pack_unit:(mem&&mem.unit?mem.unit:(packCount(r.raw||r.name)?'ea':(baseCat0==='kg'?'kg':baseCat0==='l'?'l':'ea'))));
      var open=(r.needManual && !r.remembered);                    // manual + unresolved -> the form IS the default state
      teachHtml='<span class="pack-teach'+(open?'':' hidden')+'" data-i="'+i+'">'
        +'<span class="pt-lbl sr-only">How many in one pack?</span>'
        +'<span class="pt-group">'
        +'<input type="number" class="invPackQty" inputmode="decimal" min="0" step="0.01" placeholder="qty" title="How many in one pack?" value="'+pq+'">'
        +'<select class="invPackUnit" aria-label="pack unit">'+['ea','kg','g','l','ml'].map(function(u){var lbl=unitWordOf(u); return '<option value="'+u+'"'+(u===puNow?' selected':'')+'>'+lbl+'</option>';}).join('')+'</select>'
        +'</span>'
        +'<span class="pt-preview"></span>'
        +(chipHtml?'<button type="button" class="pt-done" title="Done" aria-label="Done">\u2713</button>':'')
        +'</span>';
    }
    var priceCell='<div class="price-row">'+upriceHtml+chipHtml+teachHtml+'</div>';
    if(r.needManual && !r.remembered){
      var baseCat=(r.bestId&&byId[r.bestId])?unitCatCategory(byId[r.bestId].base_unit):null;
      var baseWord=baseCat==='kg'?'per kg':baseCat==='l'?'per litre':'per unit';
      var msg=r.unitMismatch ? ('Priced '+baseWord+' \u2014 set the pack.') : 'Set the pack, or type the price.';
      priceCell+='<div class="flag-review pt-explain">'+esc(msg)+'</div>';   // raw invoice line removed (was clutter); logged to console for debugging
      try{ if(window.console&&r.unitMismatch) console.debug('[inv mismatch]', r.raw||r.name); }catch(e){}
    }
    var dc=invDisplayConf(r);                                    // ITEM 1 (v35): hoisted — the DISPLAYED confidence drives the low-match cue, so the token and the % can never contradict each other
    var lowMatch=(dc.tier==='mid'||dc.tier==='lo');              // fires only when a % is shown and that % isn't high. Never on a hand-picked row ('manual') or one with no product ('none') — the user already made that call.
    var flag=r.uncertain?' <span class="flag-review">is this a product?</span>':(r.unitMismatch?' <span class="flag-mismatch">unit mismatch</span>':(r.bestId?(r.needsAttention?' <span class="flag-review">price jump \u2014 check</span>':(lowMatch?' <span class="flag-review">low match \u2014 check</span>':'')):(r.addNew?' <span class="flag-new">new item</span>':' <span class="flag-review">no match</span>')));   // ITEM 4 (v34): the red row treatment is never the only signal. Precedence: uncertain > mismatch > price jump > low match.
    var checked = (invRowState(r)==='matched');  // only clean hi-confidence matches auto-apply; everything else waits for the user's tick
    var chips='';
    if(!r.addNew && r.cands && r.cands.length>1){                 // multiple plausible matches: surface the real choices immediately
      chips='<div class="cand-chips">'+r.cands.slice(0,3).map(function(c){
        var p=byId[c.id]; if(!p) return '';
        var nm=p.description+(p.brand?' \u00b7 '+p.brand:''); if(nm.length>34) nm=nm.slice(0,32)+'\u2026';
        return '<button type="button" class="cand-chip'+((!r.addNew&&r.bestId===c.id)?' sel':'')+'" data-i="'+i+'" data-cid="'+esc(c.id)+'">'+esc(nm)+' <span class="cc-pct">'+Math.round(c.coverage*100)+'%</span></button>';
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
        var pvEl=pt.querySelector('.pt-preview');
        if(pvEl){ var old=(r.bestId&&byId[r.bestId]&&cpbu(byId[r.bestId])!=null)?dispPrice(byId[r.bestId]):null;
          pvEl.textContent=(old?('Was '+old+' \u2192 '):'')+'will be $'+up.toFixed(2)+(cat==='kg'?'/kg':cat==='l'?'/L':'/unit'); }
        var ap=tr.querySelector('.invAppr'); if(ap)ap.checked=(invRowState(r)==='matched');   // v39: a flagged row never auto-ticks
      }
    }
    pt.querySelector('.invPackQty').addEventListener('input', recompute);
    pt.querySelector('.invPackUnit').addEventListener('change', recompute);
  });
  box.querySelectorAll('.pt-done').forEach(function(d){ d.onclick=function(){ renderInvReview(); }; });
  box.querySelectorAll('.remembered-chip').forEach(function(ch){ ch.onclick=function(){
    var tr=ch.closest('tr'); if(!tr) return; var pt=tr.querySelector('.pack-teach'); if(!pt) return;
    ch.classList.add('hidden'); pt.classList.remove('hidden');       // the form REPLACES the chip — never both
    var q=pt.querySelector('.invPackQty'); if(q) q.focus();
  }; });
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
  updateLastImport();
}
var PRICE_JUMP=0.12;                                              // >12% move vs the stored price is worth a glance
function flagNeedsAttention(row){                                  // ITEM 4: one skimmable signal per row (display only)
  var priceJump=false;
  if(row.bestId && byId[row.bestId] && !row.unitMismatch && !row.needManual && row.unitPrice>0){
    var p=byId[row.bestId], cur=cpbu(p);
    if(cur!=null && cur>0){
      var curPerRowUnit = p.base_unit==='g'?cur*1000 : p.base_unit==='ml'?cur*1000 : cur;   // stored price expressed in the row's unit
      if(Math.abs(row.unitPrice-curPerRowUnit)/curPerRowUnit > PRICE_JUMP) priceJump=true;
    }
  }
  row.needsAttention = !!(row.unitMismatch || (row.needManual && !row.remembered) || priceJump);
  return row.needsAttention;
}
function invSelChanged(tr){
  var i=parseInt(tr.dataset.i,10), r=invRows[i]; if(!r) return;
  var sel=tr.querySelector('.invSel'), old=tr.querySelector('.invOld'), appr=tr.querySelector('.invAppr');
  r.addNew=false; collapseNewItem(i);
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
function aRow(name,a,m,actions){
  var note=(m&&m.notes)?' <span class="mi-note" title="'+esc(m.notes)+'">\u24d8</span>':'';
  return '<tr><td>'+esc(name)+note+(actions!==undefined?actions:menuActions(m))+'</td>'+
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
  function hit(nm,sec){ if(!q) return true; return (String(nm||'').toLowerCase().indexOf(q)>=0)||(String(sec||'').toLowerCase().indexOf(q)>=0); }
  var byMenu={},customsP=[]; var shown=0;
  savedPlates.forEach(function(sp){ if(sp.menuId&&menuById[sp.menuId])byMenu[sp.menuId]=sp; else customsP.push(sp); });
  var inMenu=function(m){ return (m.menuId||'MENU_ORIGINAL')===currentMenuId; };   // only show dishes belonging to the selected menu
  var secOf=function(m){var s=(m.section||'').trim(); return s?s:'Uncategorised';};
  var sections=[]; MENU.forEach(function(m){ if(!inMenu(m)) return; var s=secOf(m); if(sections.indexOf(s)<0)sections.push(s);});
  sections.sort(function(a,b){
    var au=a.toLowerCase()==='uncategorised', bu=b.toLowerCase()==='uncategorised';
    if(au&&!bu)return 1; if(bu&&!au)return -1;                 // Uncategorised always last
    return a.toLowerCase().localeCompare(b.toLowerCase());      // categories A–Z
  });
  var byName=function(a,b){return (a.name||'').toLowerCase().localeCompare((b.name||'').toLowerCase());};
  var html='';
  sections.forEach(function(sec){
    var items=MENU.filter(function(m){return inMenu(m) && secOf(m)===sec && hit(m.name,sec);}).slice().sort(byName);
    if(!items.length) return;
    html+='<tr class="sec"><td colspan="6">'+esc(sec)+'</td></tr>';
    items.forEach(function(m){
      shown++;
      var sp=byMenu[m.id]||(m.sourcePlateId?savedPlates.find(function(s){return s.id===m.sourcePlateId;}):null);
      if(sp){ html+=aRow(m.name||sp.name, analyze(costFromLines(sp.lines),m.price), m); }
      else{ var note=m.notes?' <span class="mi-note" title="'+esc(m.notes)+'">ⓘ</span>':'';
        html+='<tr class="muted"><td>'+esc(m.name)+note+menuActions(m)+'</td><td class="num">—</td><td class="num">—</td><td class="num">'+fmt2(m.price)+'</td><td class="num">not costed</td><td><span class="dot none"></span></td></tr>'; }
    });
  });
  var custShown=(currentMenuId==='MENU_ORIGINAL')?customsP.filter(function(sp){ return hit(sp.name||'Custom plate','Custom plates'); }):[];   // orphan plates live on the home menu
  if(custShown.length){
    html+='<tr class="sec"><td colspan="6">Custom plates (no menu link)</td></tr>';
    custShown.slice().sort(byName).forEach(function(sp){ shown++; html+=aRow(sp.name||'Custom plate', analyze(costFromLines(sp.lines),null), null, plateEditAction(sp)); });
  }
  if(!shown){ html='<tr class="an-empty"><td colspan="6"><div class="an-empty-box">'
    +'<svg class="an-empty-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 20V10M12 20V4M18 20v-6"/></svg>'
    +(q?('<b>No menu items match</b><button type="button" class="linklike" id="anClearSearch">Clear search</button>')
       :('<b>No menu items yet</b><span>Cost a plate in the Builder and publish it to see it here.</span>'))
    +'</div></td></tr>'; }
  tb.innerHTML=html; bindTips();
  var acs=document.getElementById('anClearSearch');
  if(acs) acs.onclick=function(){ var ms=document.getElementById('menuSearch'); if(ms) ms.value=''; renderAnalysis(); };
  tb.querySelectorAll('.mi-btn.edit').forEach(function(b){ b.onclick=function(){ var pid=b.getAttribute('data-pid'); if(pid) openPlateEdit(pid); else openMenuEdit(b.getAttribute('data-id')); }; });
  tb.querySelectorAll('.mi-btn.tobuilder').forEach(function(b){ b.onclick=function(){ var pid=b.getAttribute('data-pid'); if(pid){ loadPlate(pid); } else { openMenuInBuilder(b.getAttribute('data-id')); } }; });
}

/* ===== multiple menus: selector, pickers, create modal ===== */
function buildMenuSelector(){
  var sel=document.getElementById('menuSelect');
  if(sel){
    if(!menusList.some(function(m){return m.id===currentMenuId;})) currentMenuId=fallbackMenuId();
    var visible=menusList.filter(function(m){ return m.id!==MENU_UNASSIGNED || holdingHasDishes(); });   // v42: the holding area shows only while it holds dishes
    if(!visible.some(function(m){return m.id===currentMenuId;})) currentMenuId=fallbackMenuId();          // never leave the view on a now-hidden empty holding area
    sel.innerHTML=visible.map(function(m){ return '<option value="'+esc(m.id)+'"'+(m.id===currentMenuId?' selected':'')+(m.id===MENU_UNASSIGNED?' data-holding="1"':'')+'>'+esc(m.name)+(m.season?(' \u2014 '+esc(m.season)):'')+'</option>'; }).join('');
    sel.value=currentMenuId;
  }
  updateMenuDelBtn();
  buildMenuPickers();
}
function buildMenuPickers(){                                   // fill the menu <select>s inside the Publish + Edit modals
  var real=realMenus();
  var holdingOpt=holdingHasDishes()?menusList.filter(function(m){return m.id===MENU_UNASSIGNED;}):[];   // only surface the holding area where a dish already sits in it
  ['mi_menu','ed_menu'].forEach(function(id){
    var s=document.getElementById(id); if(!s) return;
    var cur=s.value||currentMenuId;
    var list=(id==='ed_menu')?real.concat(holdingOpt):real;    // v42: never publish a NEW dish into the holding area; editing can move one OUT of it
    s.innerHTML=list.map(function(m){ return '<option value="'+esc(m.id)+'">'+esc(m.name)+(m.season?(' \u2014 '+esc(m.season)):'')+'</option>'; }).join('');
    if(list.some(function(m){return m.id===cur;})) s.value=cur;
  });
}
function onMenuSelectChange(){
  var sel=document.getElementById('menuSelect'); if(!sel) return;
  setCurrentMenuId(sel.value); updateMenuDelBtn(); renderAnalysis();
}
function dbDeleteMenuRecord(id){ pushWrite(function(){ return SUPA.from('menus').delete().eq('id',id); }, 'menu delete'); }
// v42: delete a menu \u2014 its dishes are ALWAYS moved to `dest` (never deleted), the menu row is dropped, and the
// user lands on `dest`. When dest is the holding area, create+push it FIRST so no dish references a menus row
// that isn't there yet.
function doDeleteMenu(id, dest, name){
  if(dest===MENU_UNASSIGNED) ensureUnassignedMenu();
  var affected=customMenu.filter(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});
  affected.forEach(function(c){ c.menuId=dest; dbPushMenu(c); });   // reassign, never delete the dishes
  if(affected.length) saveCustomMenu();
  menusList=menusList.filter(function(x){return x.id!==id;}); saveMenus(); dbDeleteMenuRecord(id);
  setCurrentMenuId(dest);
  rebuildMenu(); buildMenuSelector(); renderAnalysis(); updateMenuDelBtn();
  toast('\u201c'+name+'\u201d deleted \u2014 '+(affected.length?('dishes moved to \u201c'+menuNameById(dest)+'\u201d'):'no dishes to move'));
}
// v42: single confirm, no picker. A menu with dishes always sends them to the "Unassigned dishes" holding area;
// an empty menu just lands the view on a surviving real menu.
function deleteCurrentMenu(){
  var id=currentMenuId;
  if(!canDeleteMenu(id)){ toast('This menu can\u2019t be deleted'); return; }
  var m=menusList.find(function(x){return x.id===id;}); if(!m){ return; }
  var affected=customMenu.filter(function(c){return (c.menuId||'MENU_ORIGINAL')===id;});
  var dest, nm=m.name;
  if(affected.length){ dest=MENU_UNASSIGNED; }
  else { var others=realMenus().filter(function(x){return x.id!==id;});
    dest=others.some(function(x){return x.id==='MENU_ORIGINAL';})?'MENU_ORIGINAL':(others[0]?others[0].id:MENU_UNASSIGNED); }
  var msg=affected.length
    ? ('Delete \u201c'+m.name+'\u201d? Its '+affected.length+' dish'+(affected.length===1?'':'es')+' move to \u201c'+UNASSIGNED_NAME+'\u201d \u2014 nothing is lost.')
    : ('Delete \u201c'+m.name+'\u201d? It has no dishes.');
  askConfirm('Delete menu?', msg, 'Delete menu', function(){ doDeleteMenu(id, dest, nm); });
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
    var c=costFromLines(sp.lines); var onMenu=sp.menuId&&menuById[sp.menuId]?menuById[sp.menuId].name:'Library';
    var sel=(sp.id===adSelectedPlateId)?' sel':'';
    return '<button type="button" class="ad-item'+sel+'" data-pid="'+esc(sp.id)+'"><span class="ad-nm">'+esc(sp.name||'Plate')+'</span><span class="ad-meta">'+esc(onMenu)+' · cost '+fmt2(c)+'</span></button>';
  }).join('');
  box.querySelectorAll('.ad-item').forEach(function(b){ b.onclick=function(){ adSelectedPlateId=b.getAttribute('data-pid'); renderDishPicker(document.getElementById('ad_search').value); }; });
}
function menuNameForPlate(sp){ return (sp.menuId&&menuById[sp.menuId])?menuById[sp.menuId].name:(sp.name||''); }
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
  var srcMi=(sp.menuId&&menuById[sp.menuId])?menuById[sp.menuId]:null;
  var section=srcMi&&srcMi.section?srcMi.section:'Uncategorised';
  var id='um'+Date.now().toString(36);
  var item={id:id, section:section, name:(srcMi?srcMi.name:sp.name)||'Dish', price:parseFloat(pv), notes:'', custom:true, menuId:currentMenuId, sourcePlateId:sp.id};
  customMenu.push(item); saveCustomMenu(); dbPushMenu(item);
  rebuildMenu(); buildMenuOptions(); renderAnalysis(); closeAddDishModal();
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
  return '<div class="mi-act"><button class="mi-btn tobuilder" type="button" data-id="'+esc(m.id)+'" title="Open in plate builder">\u2192 Builder</button><button class="mi-btn edit" type="button" data-id="'+esc(m.id)+'">Edit</button></div>';
}
function openMenuInBuilder(mid){                                      // jump from Menu Analysis straight into the Builder for this dish
  var m=menuById[mid]; if(!m) return;
  var sp=plateForMenuItem(m);                                        // respects reuse (menuId link OR sourcePlateId)
  if(sp){ loadPlate(sp.id); return; }                               // costed already -> load its recipe
  plate=[]; loadedPlateId=null;                                     // not costed -> start a fresh plate, pre-named + linked to this item
  var pn=document.getElementById('plateName'); if(pn) pn.value=m.name||'';
  if(typeof menuLinkEl!=='undefined' && menuLinkEl){ menuTouched=true; menuLinkEl.value=m.id; }
  hidePlateSuggest(); updateEditTag(); renderPlate(); showTab('builder');
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
  upsertCustomMenu({id:id, section:cat, name:name, price:price, notes:(m.notes||''), custom:true, menuId:chosenMenu, sourcePlateId:(m.sourcePlateId||null)});   // saves all edits at once
  var touched=false;                                                          // keep any linked plate's name in sync with the rename
  savedPlates.forEach(function(sp){ if(sp.menuId===id && sp.name!==name){ sp.name=name; dbPushPlate(sp); touched=true; } });
  if(touched) savePlatesLS();
  rebuildMenu(); buildMenuOptions();
  if(chosenMenu!==currentMenuId){ setCurrentMenuId(chosenMenu); buildMenuSelector(); }   // follow the dish if it was moved to another menu
  var loadedSp=loadedPlateId?savedPlates.find(function(s){return s.id===loadedPlateId;}):null;
  if(loadedSp && loadedSp.menuId===id){ document.getElementById('plateName').value=name; }   // reflect in the builder if open
  renderPlate(); renderAnalysis(); closeEdit();
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
  var sp=savedPlates.find(function(s){return s.menuId===id;});
  if(sp){ requestLoadPlate(sp.id); return; }
  var go=function(){                                          // no costed plate yet -> set builder up to create one linked here
    plate=[]; document.getElementById('plateName').value=m.name; menuLinkEl.value=id; menuTouched=true; loadedPlateId=null;
    hidePlateSuggest(); updateEditTag(); renderPlate(); showTab('builder');
    toast('Add ingredients, then Save \u2014 this will cost \u201c'+m.name+'\u201d');
  };
  if(isBuilderDirty()) askConfirm('Open in builder','Open '+m.name+'? Unsaved changes will be lost.','Open',go); else go();
}

/* ===== orphan-plate edit + delete-choice ===== */
function plateEditAction(sp){ return '<div class="mi-act"><button class="mi-btn tobuilder" type="button" data-pid="'+esc(sp.id)+'" title="Open in plate builder">\u2192 Builder</button><button class="mi-btn edit" type="button" data-pid="'+esc(sp.id)+'">Edit</button></div>'; }
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
function doDeleteMenuOnly(){
  var id=delChoiceId; if(!id||!menuById[id]){ closeDelChoice(); return; }
  var nm=menuById[id].name, touched=false;
  savedPlates.forEach(function(sp){ if(sp.menuId===id){ sp.menuId=null; dbPushPlate(sp); touched=true; } });  // unlink, KEEP the plate
  if(touched) savePlatesLS();
  if(menuLinkEl.value===id){ menuLinkEl.value=''; menuTouched=false; if(typeof updatePublishLabel==='function')updatePublishLabel(); }
  removeMenuItem(id);
  rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis(); closeDelChoice();
  toast('\u201c'+nm+'\u201d removed from menu \u2014 plate kept for reuse');
}
function doDeleteEverything(){
  var id=delChoiceId; if(!id||!menuById[id]){ closeDelChoice(); return; }
  var nm=menuById[id].name;
  savedPlates.filter(function(sp){return sp.menuId===id;}).forEach(function(sp){ dbDeletePlate(sp.id); });
  savedPlates=savedPlates.filter(function(sp){return sp.menuId!==id;});
  if(loadedPlateId && !savedPlates.some(function(s){return s.id===loadedPlateId;})) loadedPlateId=null;
  savePlatesLS();
  if(menuLinkEl.value===id){ menuLinkEl.value=''; menuTouched=false; if(typeof updatePublishLabel==='function')updatePublishLabel(); }
  removeMenuItem(id);
  rebuildMenu(); buildMenuOptions(); updateEditTag(); renderPlate(); renderAnalysis(); closeDelChoice();
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
document.getElementById('ed_openBuilder').addEventListener('click',editOpenInBuilder);
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

['menuModal','invModal','confirmModal','editModal','delChoiceModal'].forEach(function(id){var m=document.getElementById(id);if(m)m.addEventListener('mousedown',function(e){if(e.target===m)hide(id);});});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){['menuModal','invModal','confirmModal','editModal','delChoiceModal'].forEach(function(id){var m=document.getElementById(id);if(m&&m.classList.contains('open'))hide(id);});}});
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
