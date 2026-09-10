#!/usr/bin/env python3
"""Writes the synthetic invoice fixtures for the parser eval harness (PARSER-AUDIT-2026-09-08).

Every fixture is INVENTED: no real cafe, no real supplier, no real account. Layouts imitate the
document styles an Australian cafe actually receives. The .txt is the text the APP sees, i.e. what
extractPdfText() yields for a PDF (one visual line per row, single spaces) or a CSV paste.
Prices in truth are ex-GST per stored unit. Re-run this file to regenerate; edit here, not the output.
"""
import json, os
OUT = os.path.join(os.path.dirname(__file__), 'fixtures')
os.makedirs(OUT, exist_ok=True)
kg = lambda p: {"unit": "kg", "price": p}
L_ = lambda p: {"unit": "l", "price": p}
ea = lambda p: {"unit": "ea", "price": p}
def line(desc, match, qty, pack, up, per, tot, accept, note=None):
    d = {"desc": desc, "match": match, "qty": qty, "pack": pack, "unitPriceEx": up, "per": per, "lineTotal": tot, "accept": accept}
    if note: d["note"] = note
    return d
def write(name, style, text, truth):
    truth = dict(truth); truth.setdefault("style", style); truth.setdefault("source", "pdf")
    open(os.path.join(OUT, name + '.txt'), 'w').write(text.strip('\n') + '\n')
    json.dump(truth, open(os.path.join(OUT, name + '.truth.json'), 'w'), indent=1)

# 1 foodservice A: the distributor-A layout as the app extracts it (UOM word first on page 1)
write('fake-01-foodservice-A', 'Foodservice distributor A. Code | Description | Brand | Pack | UOM | Qty | Unit Price | Price | Excl GST | GST | Total; UOM extracted at line start. Ex-GST.', """
Document No:
I00000001.XXX
TAX INVOICE
NORTHERN FOODSERVICE a division of
Deliver To: Sold To:
THE CORNER CAFE
1 EXAMPLE STREET
Brand Pack Unit of Quantity Unit Excl. GST GST Total
Code Product Description
Size Measure Supplied Price Price Value Value Value
********************* FROZEN *********************
CTN 100001 #CHIPS 10MM STRAIGHT CUT SAFRIES 6x2.5kg 8 40.17 40.17 321.36 0.00 321.36
CTN 100002 #BREAD BUNS MILK 4.5" TIP TOP 48x85gr 2 52.12 52.12 104.24 0.00 104.24
PKT 100003 #CHEESE SLICES TASTY 105'S YARDE FARM 1.5kg 1 21.29 21.29 21.29 0.00 21.29
TUB 100004 #ICE CREAM VANILLA BULLA 10lt 1 29.49 29.49 29.49 2.95 32.44
KG 100005 #HAM LEG SLICED 2MM (APP 1KG) SUNVALLEY kg 2.31 11.98 11.98 27.67 0.00 27.67
CAN 100006 #BEETROOT SLICED DEWFRESH 3kg 2 9.32 9.32 18.64 0.00 18.64
CTN 100007 #PANCAKES HOTCAKES PLAIN 100MM MARCELS 8x6's 2 30.25 30.25 60.50 6.05 66.55
************** Summary of Supplies *************** Amount WET GST Total Nett Amt
GST Free Supplies 493.20 493.20 493.20
GST Supplies 89.99 9.00 98.99 89.99
Total 583.19 9.00 592.19 583.19
Totals 583.19 9.00 592.19
Balance owing as at 08/09/2026 $592.19
""", {"gst": "ex", "subtotal": 583.19, "gst_amount": 9.00, "total": 592.19, "lines": [
    line("CHIPS 6x2.5kg CTN", "chips 10mm", 8, "6x2.5kg", 40.17, "ctn", 321.36, [kg(40.17/15)]),
    line("BREAD BUNS 48x85gr CTN", "bread buns", 2, "48x85g", 52.12, "ctn", 104.24, [kg(52.12/4.08), ea(52.12/48)]),
    line("CHEESE SLICES 105'S 1.5kg PKT", "cheese slices", 1, "105 slices / 1.5kg", 21.29, "pkt", 21.29, [ea(21.29/105), kg(21.29/1.5)]),
    line("ICE CREAM 10lt TUB", "ice cream", 1, "10L", 29.49, "tub", 29.49, [L_(2.949)]),
    line("HAM LEG SLICED per kg 2.31kg", "ham leg", 2.31, "catch weight", 11.98, "kg", 27.67, [kg(11.98)]),
    line("BEETROOT 3kg CAN", "beetroot", 2, "3kg", 9.32, "can", 18.64, [kg(9.32/3)]),
    line("PANCAKES 8x6's CTN", "pancakes", 2, "48 ea", 30.25, "ctn", 60.50, [ea(30.25/48)]),
], "exclude": ["gst free supplies", "gst supplies 89.99", "total 583.19", "totals 583.19", "balance owing"]})

# 2 foodservice B (PFD-shaped): Code | Description | Pack | Ordered | Supplied | Unit Price | Ext Price | GST flag
write('fake-02-foodservice-B', 'Foodservice distributor B. Product Code | Description | Pack Size | Qty Ord | Qty Sup | Unit Price | Ext Price | GST (Y/N). Ex-GST, quantities printed as integers.', """
TAX INVOICE
SOUTHERN FOOD SERVICES PTY LTD
ABN 11 111 111 111
Customer: THE CORNER CAFE Invoice No: 448812 Date: 03/09/2026
Product Code Description Pack Size Qty Ord Qty Sup Unit Price Ext Price GST
20001 CHIPS STRAIGHT CUT 10MM EDGELL 6X2KG 2 2 38.20 76.40 N
20002 CHICKEN BREAST FILLET FRESH 2.5KG 4 4 24.75 99.00 N
20003 MILK FULL CREAM 10LT PAULS 1 1 16.90 16.90 N
20004 SERVIETTES DINNER 2PLY 1000S 1 1 42.00 42.00 Y
20005 EGGS FREE RANGE 700G 15 DOZEN 2 2 68.00 136.00 N
20006 BUTTER PORTIONS 100X10G 3 3 19.50 58.50 N
20007 OIL CANOLA 20LT DRUM 1 1 44.80 44.80 N
Sub Total 473.60
GST 4.20
Total Due 477.80
Please pay by EFT BSB 000-000 Account 00000000
""", {"gst": "ex", "subtotal": 473.60, "gst_amount": 4.20, "total": 477.80, "lines": [
    line("CHIPS 6X2KG", "chips straight", 2, "6x2kg", 38.20, "ctn", 76.40, [kg(38.20/12)]),
    line("CHICKEN BREAST 2.5KG", "chicken breast", 4, "2.5kg", 24.75, "pack", 99.00, [kg(24.75/2.5)]),
    line("MILK 10LT", "milk full cream", 1, "10L", 16.90, "ea", 16.90, [L_(1.69)]),
    line("SERVIETTES 1000S", "serviettes", 1, "1000", 42.00, "ctn", 42.00, [ea(0.042)]),
    line("EGGS 15 DOZEN", "eggs free range", 2, "15 dozen", 68.00, "ctn", 136.00, [ea(68.00/180)]),
    line("BUTTER PORTIONS 100X10G", "butter portions", 3, "100x10g", 19.50, "ctn", 58.50, [kg(19.50), ea(0.195)]),
    line("OIL CANOLA 20LT", "oil canola", 1, "20L", 44.80, "drum", 44.80, [L_(2.24)]),
], "exclude": ["sub total", "total due", "gst 4.20", "please pay"]})

# 3 fruit and veg market: per kg / bunch / each, explicit rates
write('fake-03-fruit-veg', 'Fruit and vegetable wholesaler. Qty | Unit | Description | Price per unit | Amount, with @ rates and per-kg weighed lines. Ex-GST (fresh produce is GST-free).', """
FRESH MARKET PRODUCE
TAX INVOICE 30991
Sold to: THE CORNER CAFE
Qty Unit Item Price Amount
24 EACH Avocado Hass $1.85 $44.40
6 BUNCH Coriander $2.50 $15.00
5.20 KG Tomatoes Gourmet @ $6.90/kg $35.88
1 BOX Mixed Lettuce 1.5kg $20.00 $20.00
12 KG Onions Brown 6.90 per kg $82.80 $82.80
2 BAG Potatoes Washed 20kg $28.00 $56.00
1 TRAY Mushrooms Cup 3kg $27.00 $27.00
3 PUN Strawberries 250g $4.50 $13.50
Subtotal $294.58
GST $0.00
Total $294.58
""", {"gst": "ex", "subtotal": 294.58, "gst_amount": 0.00, "total": 294.58, "lines": [
    line("Avocado 24 each", "avocado", 24, "each", 1.85, "ea", 44.40, [ea(1.85)]),
    line("Coriander 6 bunch", "coriander", 6, "bunch", 2.50, "bunch", 15.00, [ea(2.50)]),
    line("Tomatoes 5.20kg @ 6.90/kg", "tomatoes", 5.2, "per kg", 6.90, "kg", 35.88, [kg(6.90)]),
    line("Mixed Lettuce 1.5kg box", "mixed lettuce", 1, "1.5kg", 20.00, "box", 20.00, [kg(20.00/1.5)]),
    line("Onions 12kg at 6.90 per kg", "onions", 12, "per kg", 6.90, "kg", 82.80, [kg(6.90)]),
    line("Potatoes 20kg bag x2", "potatoes", 2, "20kg", 28.00, "bag", 56.00, [kg(1.40)]),
    line("Mushrooms 3kg tray", "mushrooms", 1, "3kg", 27.00, "tray", 27.00, [kg(9.00)]),
    line("Strawberries 250g punnet x3", "strawberries", 3, "250g", 4.50, "pun", 13.50, [kg(18.00), ea(4.50)]),
], "exclude": ["subtotal", "gst $0.00", "total $294.58"]})

# 4 smallgoods catch weight: nominal pack vs actual kg, priced per kg
write('fake-04-smallgoods-catch-weight', 'Smallgoods and meat supplier. Code | Description | Pack | Units | Weight kg | $/kg | Amount. Priced per actual kg; nominal pack in the description. Ex-GST.', """
HILLSIDE SMALLGOODS
TAX INVOICE No 88213 Date 02/09/2026
Customer THE CORNER CAFE
Code Description Pack Units Weight $/kg Amount
SG101 BACON MIDDLE RINDLESS 2 x 2.5kg 2 5.12 11.90 60.93
SG102 HAM LEG SHAVED 1kg 3 3.06 13.40 41.00
SG103 PORK SAUSAGES THICK 1.5kg 2 3.00 9.80 29.40
SG104 SALAMI MILD SLICED 500g 4 2.04 18.50 37.74
SG105 CHICKEN BREAST SKIN OFF 5kg 1 5.35 8.90 47.62
Total ex GST 216.69
GST 0.00
Invoice Total 216.69
""", {"gst": "ex", "subtotal": 216.69, "gst_amount": 0.00, "total": 216.69, "lines": [
    line("BACON 2x2.5kg nominal, 5.12kg actual, 11.90/kg", "bacon middle", 5.12, "2x2.5kg", 11.90, "kg", 60.93, [kg(11.90)]),
    line("HAM LEG SHAVED 1kg x3 = 3.06kg, 13.40/kg", "ham leg", 3.06, "1kg", 13.40, "kg", 41.00, [kg(13.40)]),
    line("PORK SAUSAGES 1.5kg x2 = 3.00kg, 9.80/kg", "pork sausages", 3.00, "1.5kg", 9.80, "kg", 29.40, [kg(9.80)]),
    line("SALAMI 500g x4 = 2.04kg, 18.50/kg", "salami", 2.04, "500g", 18.50, "kg", 37.74, [kg(18.50)]),
    line("CHICKEN BREAST 5kg = 5.35kg, 8.90/kg", "chicken breast", 5.35, "5kg", 8.90, "kg", 47.62, [kg(8.90)]),
], "exclude": ["total ex gst", "invoice total", "gst 0.00"]})

# 5 Xero template
write('fake-05-xero-template', 'Xero standard invoice template. Description | Quantity | Unit Price | GST | Amount AUD. GST column names the rate; ex-GST amounts with GST added at the foot.', """
TAX INVOICE
Riverbend Bakery
ABN 22 222 222 222
Invoice Date 05 Sep 2026
Invoice Number INV-0412
Reference Weekly
The Corner Cafe
Description Quantity Unit Price GST Amount AUD
Sourdough loaf 800g 12.00 6.50 GST Free 78.00
Croissant butter 48 pack 2.00 62.40 GST Free 124.80
Brioche buns 6 pack 10.00 7.20 GST Free 72.00
Cookies choc chip 12 pack 4.00 18.00 10% 72.00
Delivery 1.00 15.00 10% 15.00
Subtotal 361.80
TOTAL GST 10% 8.70
TOTAL AUD 370.50
Due Date 12 Sep 2026
""", {"gst": "ex", "subtotal": 361.80, "gst_amount": 8.70, "total": 370.50, "lines": [
    line("Sourdough loaf 800g x12 at 6.50", "sourdough loaf", 12, "800g loaf", 6.50, "ea", 78.00, [ea(6.50), kg(6.50/0.8)]),
    line("Croissant 48 pack x2 at 62.40", "croissant", 2, "48 pack", 62.40, "pack", 124.80, [ea(1.30)]),
    line("Brioche buns 6 pack x10 at 7.20", "brioche", 10, "6 pack", 7.20, "pack", 72.00, [ea(1.20)]),
    line("Cookies 12 pack x4 at 18.00", "cookies", 4, "12 pack", 18.00, "pack", 72.00, [ea(1.50)]),
], "exclude": ["delivery", "subtotal", "total gst", "total aud"]})

# 6 MYOB template
write('fake-06-myob-template', 'MYOB AccountRight item invoice. Item Number | Description | Ship Qty | Price | Disc% | Total | Tax code. Ex-GST with tax codes (GST / FRE).', """
Tax Invoice
COASTAL DAIRY SUPPLIES
A.B.N. 33 333 333 333
Invoice No. 00011234 Date 04/09/2026
Ship To: The Corner Cafe
Ship Qty Item Number Description Price Disc% Total Tax
10 MILK2L Milk Full Cream 2L $3.20 $32.00 FRE
4 CRM1L Cream Thickened 1L $5.60 $22.40 FRE
2 BUT5KG Butter Unsalted 5kg $52.00 $104.00 FRE
6 YOG1KG Yoghurt Greek 1kg $7.90 5.00% $45.03 FRE
1 CHS2KG Cheese Tasty Block 2kg $21.50 $21.50 FRE
Subtotal: $224.93
Freight: $12.00
Tax: $1.20
Total Amount: $238.13
""", {"gst": "ex", "subtotal": 224.93, "gst_amount": 1.20, "total": 238.13, "lines": [
    line("Milk 2L x10 at 3.20", "milk full cream", 10, "2L", 3.20, "ea", 32.00, [L_(1.60)]),
    line("Cream 1L x4 at 5.60", "cream thickened", 4, "1L", 5.60, "ea", 22.40, [L_(5.60)]),
    line("Butter 5kg x2 at 52.00", "butter unsalted", 2, "5kg", 52.00, "ea", 104.00, [kg(10.40)]),
    line("Yoghurt 1kg x6 at 7.90 less 5%", "yoghurt", 6, "1kg", 7.505, "ea", 45.03, [kg(7.505), kg(7.90)], "5% discount: 7.505 net is exact, 7.90 list is tolerable"),
    line("Cheese 2kg x1 at 21.50", "cheese tasty", 1, "2kg", 21.50, "ea", 21.50, [kg(10.75)]),
], "exclude": ["subtotal", "freight", "tax:", "total amount"]})

# 7 Square invoice
write('fake-07-square-invoice', 'Square invoice. Item name with quantity x price on one line and the amount at the end. Prices GST-inclusive with GST shown at the foot.', """
Invoice #000123
Bean Roasters Co.
Bill to The Corner Cafe
Due 15 Sep 2026
Item Quantity Price Amount
Espresso Blend 1kg 4 x $38.00 $152.00
Cold Brew Concentrate 1L 6 x $18.00 $108.00
Oat Milk Barista 1L 12 x $3.90 $46.80
Chai Powder 500g 2 x $19.50 $39.00
Subtotal $345.80
GST (included) $31.44
Total $345.80
Pay online
""", {"gst": "inc", "subtotal": 314.36, "gst_amount": 31.44, "total": 345.80, "lines": [
    line("Espresso 1kg x4 at 38.00 inc", "espresso", 4, "1kg", 34.545, "ea", 152.00, [kg(38.00/1.1)]),
    line("Cold brew 1L x6 at 18.00 inc", "cold brew", 6, "1L", 16.364, "ea", 108.00, [L_(18.00/1.1)]),
    line("Oat milk 1L x12 at 3.90 inc", "oat milk", 12, "1L", 3.545, "ea", 46.80, [L_(3.90/1.1)]),
    line("Chai 500g x2 at 19.50 inc", "chai", 2, "500g", 17.727, "ea", 39.00, [kg(19.50/1.1/0.5)]),
], "exclude": ["subtotal", "gst (included)", "total $345.80"]})

# 8 supermarket tax invoice, GST-inclusive with * markers
write('fake-08-supermarket-receipt', 'Supermarket tax invoice. Item | qty @ unit price | amount, taxable items marked with *, GST-inclusive with the GST included figure at the foot.', """
TAX INVOICE
METRO GROCER
ABN 44 444 444 444
Store 1234 08/09/2026
Description Qty Amount
FULL CREAM MILK 3L 2 @ $4.80 9.60
WHITE BREAD 700G 3 @ $4.20 12.60 *
FREE RANGE EGGS 12PK 700G 4 @ $6.50 26.00
TASTY CHEESE BLOCK 1KG 2 @ $11.00 22.00
DISHWASHING LIQUID 1L 1 @ $5.50 5.50 *
PAPER TOWEL 6PK 1 @ $9.00 9.00 *
TOTAL 84.70
* Taxable items
GST INCLUDED IN TOTAL 2.46
EFTPOS 84.70
""", {"gst": "inc", "subtotal": 82.24, "gst_amount": 2.46, "total": 84.70, "lines": [
    line("Milk 3L, GST-free", "full cream milk", 2, "3L", 4.80, "ea", 9.60, [L_(4.80/3), L_(4.80/1.1/3)], "GST-free line on a mixed receipt; either the raw or the divided figure is defensible until the parser reads the * marker"),
    line("Bread 700g taxable", "white bread", 3, "700g", 4.20/1.1, "ea", 12.60, [kg(4.20/1.1/0.7), ea(4.20/1.1)]),
    line("Eggs 12pk", "free range eggs", 4, "12", 6.50, "ea", 26.00, [ea(6.50/12), ea(6.50/1.1/12)]),
    line("Cheese 1kg", "tasty cheese", 2, "1kg", 11.00, "ea", 22.00, [kg(11.00), kg(10.00)]),
    line("Dishwashing 1L taxable", "dishwashing", 1, "1L", 5.00, "ea", 5.50, [L_(5.00)]),
    line("Paper towel 6pk taxable", "paper towel", 1, "6", 9.00/1.1, "ea", 9.00, [ea(9.00/1.1/6)]),
], "exclude": ["total 84.70", "gst included", "eftpos"]})

# 9 credit note
write('fake-09-credit-note', 'Credit note from a foodservice distributor: negative quantities and amounts, same columns as the invoice.', """
CREDIT NOTE
SOUTHERN FOOD SERVICES PTY LTD
Credit No: CN-2231 Against Invoice 448812
Customer: THE CORNER CAFE
Product Code Description Pack Size Qty Unit Price Ext Price GST
20001 CHIPS STRAIGHT CUT 10MM EDGELL 6X2KG -1 38.20 -38.20 N
20003 MILK FULL CREAM 10LT PAULS -1 16.90 -16.90 N
Sub Total -55.10
GST 0.00
Total Credit -55.10
""", {"gst": "ex", "subtotal": -55.10, "gst_amount": 0.00, "total": -55.10, "lines": [],
      "exclude": ["chips straight", "milk full cream", "sub total", "total credit"]})

# 10 page break mid table
write('fake-10-page-break', 'Foodservice invoice whose item table breaks across two pages: page footer, page header and column header repeat between two items, and one description wraps across the break.', """
TAX INVOICE
SOUTHERN FOOD SERVICES PTY LTD
Customer: THE CORNER CAFE Invoice No: 448900 Page 1 of 2
Product Code Description Pack Size Qty Unit Price Ext Price GST
20001 CHIPS STRAIGHT CUT 10MM EDGELL 6X2KG 3 38.20 114.60 N
20010 FLOUR PLAIN 12.5KG 2 14.20 28.40 N
20011 SUGAR WHITE 25KG 1 32.00 32.00 N
Continued on next page
Page 1 of 2
TAX INVOICE
SOUTHERN FOOD SERVICES PTY LTD
Customer: THE CORNER CAFE Invoice No: 448900 Page 2 of 2
Product Code Description Pack Size Qty Unit Price Ext Price GST
20012 RICE LONG GRAIN 20KG 1 41.50 41.50 N
20013 TOMATO CRUSHED A10 3KG 6 4.10 24.60 N
20014 COFFEE BEANS HOUSE BLEND 1KG 4 32.00 128.00 Y
Sub Total 369.10
GST 12.80
Total Due 381.90
Page 2 of 2
""", {"gst": "ex", "subtotal": 369.10, "gst_amount": 12.80, "total": 381.90, "lines": [
    line("CHIPS 6X2KG x3", "chips straight", 3, "6x2kg", 38.20, "ctn", 114.60, [kg(38.20/12)]),
    line("FLOUR 12.5KG x2", "flour plain", 2, "12.5kg", 14.20, "bag", 28.40, [kg(14.20/12.5)]),
    line("SUGAR 25KG x1", "sugar white", 1, "25kg", 32.00, "bag", 32.00, [kg(1.28)]),
    line("RICE 20KG x1 (page 2)", "rice long grain", 1, "20kg", 41.50, "bag", 41.50, [kg(2.075)]),
    line("TOMATO CRUSHED A10 3KG x6", "tomato crushed", 6, "3kg", 4.10, "can", 24.60, [kg(4.10/3)]),
    line("COFFEE BEANS 1KG x4", "coffee beans", 4, "1kg", 32.00, "bag", 128.00, [kg(32.00)]),
], "exclude": ["sub total", "total due", "continued", "page 1 of 2", "page 2 of 2"]})

# 11 freight + rounding + discount lines
write('fake-11-freight-rounding', 'Wholesaler invoice with a freight line, a settlement discount line and a cash rounding line among the totals.', """
TAX INVOICE 5521
WESTSIDE PACKAGING
Item Description Qty Unit Price Total
PK100 COFFEE CUPS 8OZ DOUBLE WALL 500S 2 68.00 136.00
PK101 LIDS 8OZ BLACK 1000S 1 52.00 52.00
PK102 NAPKINS COCKTAIL 2PLY 2000S 1 39.00 39.00
PK103 TAKEAWAY CONTAINER 750ML 500S 1 88.00 88.00
FREIGHT Delivery metro 1 15.00 15.00
DISCOUNT Settlement discount 2.5% -8.25
ROUNDING -0.01
Subtotal ex GST 321.74
GST 32.17
Total 353.91
""", {"gst": "ex", "subtotal": 321.74, "gst_amount": 32.17, "total": 353.91, "lines": [
    line("CUPS 500S x2 at 68.00", "coffee cups", 2, "500", 68.00, "ctn", 136.00, [ea(0.136)]),
    line("LIDS 1000S x1 at 52.00", "lids 8oz", 1, "1000", 52.00, "ctn", 52.00, [ea(0.052)]),
    line("NAPKINS 2000S x1 at 39.00", "napkins", 1, "2000", 39.00, "ctn", 39.00, [ea(0.0195)]),
    line("CONTAINER 750ML 500S x1 at 88.00", "takeaway container", 1, "500", 88.00, "ctn", 88.00, [ea(0.176)], "750ML is the container size, not a volume bought"),
], "exclude": ["freight", "discount", "rounding", "subtotal", "gst 32.17", "total 353.91"]})

# 12 quantity-first carton lines (the 236 shape)
write('fake-12-qty-first-cartons', 'Butcher/wholesaler with the quantity and container FIRST: "2 CTN Beef Mince 6 x 1kg", then unit price, unit price repeated, line total.', """
TAX INVOICE
VALLEY MEATS
Qty Description Unit Price Price Total
2 CTN Beef Mince Premium 6 x 1kg 60.00 60.00 120.00
3 CTN Chicken Thigh Fillet 4 x 2.5kg 85.00 85.00 255.00
1 CTN Lamb Shoulder Diced 5 x 1kg 92.50 92.50 92.50
4 BAG Pork Belly Sliced 2kg 31.00 31.00 124.00
Sub Total 591.50
GST 0.00
Total 591.50
""", {"gst": "ex", "subtotal": 591.50, "gst_amount": 0.00, "total": 591.50, "lines": [
    line("2 CTN Beef Mince 6x1kg at 60.00/ctn", "beef mince", 2, "6x1kg", 60.00, "ctn", 120.00, [kg(10.00)]),
    line("3 CTN Chicken Thigh 4x2.5kg at 85.00/ctn", "chicken thigh", 3, "4x2.5kg", 85.00, "ctn", 255.00, [kg(8.50)]),
    line("1 CTN Lamb Shoulder 5x1kg at 92.50", "lamb shoulder", 1, "5x1kg", 92.50, "ctn", 92.50, [kg(18.50)]),
    line("4 BAG Pork Belly 2kg at 31.00/bag", "pork belly", 4, "2kg", 31.00, "bag", 124.00, [kg(15.50)]),
], "exclude": ["sub total", "total 591.50"]})

# 13 trailing net-weight columns (the 237 shape)
write('fake-13-trailing-net-weight', 'Meat wholesaler printing a delivered net weight column AFTER the money columns: "... 6 x 1kg 60.00 60.00 120.00 12.0kg".', """
TAX INVOICE
VALLEY MEATS
Qty Description Unit Price Price Total Net Wt
2 CTN Beef Mince Premium 6 x 1kg 60.00 60.00 120.00 12.0kg
1 CTN Chicken Breast Fillet 5 x 2kg 95.00 95.00 95.00 10.3kg
1 Sauce Peri Peri 6 x 500ml 30.00 30.00 30.00 3.2kg
3 CTN Bacon Middle 2 x 2.5kg 55.00 55.00 165.00 15.4kg
Sub Total 410.00
GST 0.00
Total 410.00
""", {"gst": "ex", "subtotal": 410.00, "gst_amount": 0.00, "total": 410.00, "lines": [
    line("2 CTN Beef Mince 6x1kg at 60.00/ctn, 12.0kg delivered", "beef mince", 2, "6x1kg", 60.00, "ctn", 120.00, [kg(10.00)]),
    line("1 CTN Chicken Breast 5x2kg at 95.00, 10.3kg delivered", "chicken breast", 1, "5x2kg", 95.00, "ctn", 95.00, [kg(9.50)]),
    line("Sauce 6x500ml at 30.00, 3.2kg gross", "sauce peri", 1, "6x500ml", 30.00, "ctn", 30.00, [L_(10.00)]),
    line("3 CTN Bacon 2x2.5kg at 55.00/ctn, 15.4kg delivered", "bacon middle", 3, "2x2.5kg", 55.00, "ctn", 165.00, [kg(11.00)]),
], "exclude": ["sub total", "total 410.00"]})

# 14 CSV paste
write('fake-14-csv-paste', 'The paste-box / CSV path: "name, unit price" rows with a header.', """
Product, Unit price
Chips straight cut 6x2kg, 38.20
Milk full cream 2L, 3.20
Sub total, 41.40
GST, 0.00
""", {"source": "csv", "gst": "ex", "subtotal": 41.40, "gst_amount": 0.00, "total": 41.40, "lines": [
    line("Chips 6x2kg at 38.20 (CSV gives no pack maths, price is the typed price)", "chips straight", 1, "6x2kg", 38.20, "ctn", 38.20, [{"unit": "auto", "price": 38.20}], "the CSV path stores the typed price in unit auto by design; the unit is resolved against the matched product"),
    line("Milk 2L at 3.20", "milk full cream", 1, "2L", 3.20, "ea", 3.20, [{"unit": "auto", "price": 3.20}], "same"),
], "exclude": ["sub total", "gst"]})
print('wrote', len(os.listdir(OUT)), 'files to', OUT)
