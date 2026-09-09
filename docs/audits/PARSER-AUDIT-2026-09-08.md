# PARSER-AUDIT-2026-09-08 - the invoice parser, measured against six real invoices and fourteen synthetic layouts

**Scope.** The contiguous region of `js/app.js` between `var INV_EXCLUDE=` (line 10533) and `function unitLabelFor(` (line 10783), the PDF text extractor above it (`extractPdfText`, 10214), the two corrections outside it (`invFixRow`, 10874) and the GST and supplier detectors it depends on. Nothing in `js/app.js` was edited by this audit. Everything proposed is in `spike/parser-audit/proposed.patch`, applied to a scratch copy and run against the full suite (1876 pass, 0 fail) and against the harness described at the end.

**The owner has today lifted `CLAUDE.md`'s "Never edit anything inside it" rule for the region.** Section 8 says what should replace it.

## 1. Verdict

The parser is right on exactly one layout and wrong on nearly everything else, and the wrongness is silent. On the Supplier A invoice (the foodservice distributor whose four PDFs every existing parser test was written against) it prices 23 of 23 lines correctly. On the five Supplier B invoices (the poultry and smallgoods distributor the cafe also buys from every week) it prices **36 of 41 lines wrong with no flag raised**, and the remaining 5 wrong with a flag. Not one Supplier B line comes out right. The wrong numbers are not near misses: chips at $0.25/kg for a $2.46/kg product, bacon at $10.00/kg for $12.20, flour at $0.08/kg for $1.00, and the chips price changes with how many cartons were bought that week (3 cartons gives $0.25, 6 gives $0.50, 11 gives $0.92).

The mechanism is one heuristic: the price of a pack is taken to be "the first adjacent pair of equal amounts, else the line total". Supplier B prints Ordered and Shipped as equal two-decimal numbers before the price, so the QUANTITY becomes the price. Every popular template that prints a quantity column with no repeated price column (Xero, MYOB, Square, a PFD-style distributor, a supermarket receipt, a fruit-and-veg market docket) falls to the second half of the same rule and is priced from the line total, which is the unit price times the quantity. Across the fourteen synthetic layouts the shipped parser gets 30 of 66 lines silently wrong.

Three things kept this off the catalogue until now. The Supplier A layout happens to repeat the unit price column, so the heuristic works there. The 12% price-jump flag against existing price history caught 34 of the 35 wrong Supplier B lines on this cafe's own catalogue and put them in review, which is a display flag a user can tick through and which does not exist for a new product, a new supplier or a new cafe. And the second reader (Gemini) may have been correcting some of it, which nothing measures.

The proposed patch replaces the heuristic with arithmetic (quantity x unit price = extension), reads pack sizes off the description rather than the whole line, treats a kilogram quantity column as a per-kilogram price, splices wrapped description lines back onto their row, refuses negative (credit) lines and refuses lines whose amounts do not add up rather than guessing. With it, the six real invoices score 64 of 64 right and the synthetic set 63 of 66, with 2 silent-wrong lines left (both named in section 9). All 1876 existing tests pass; five tests in `tests/inv-row-fix.test.js` are rewritten because they pinned the old mechanism's preconditions rather than its outcomes, and the patch says why at each one.

## 2. How the measurement was made

- **Text.** The app does not see `pdftotext` output. `extractPdfText` groups pdf.js text items by rounded y and joins them in content-stream order, so on the Supplier A PDF the unit-of-measure word lands at the START of every page-1 line and the END of every page-2 line, and Supplier B's two-line descriptions arrive as two lines. `spike/parser-audit/extract-pdf.mjs` mirrors that function exactly (same pdf.js version the app pins) and every real case was scored on ITS output. `pdftotext -layout` and plain `pdftotext` were also read, by hand, to write the truth.
- **Truth.** Every line of every real invoice was transcribed by hand (section 3), with the ex-GST unit price per stored unit the app should hold and, where two are defensible (buns per kg or per bun), both accepted.
- **Parser.** `spike/parser-audit/run.js` slices the real region and its neighbours out of `js/app.js` the way `tests/_extract.js` does and runs the real PDF path (`normPackNotation`, `invGstDetect`, `invSupplierDetect`, `pdfTextToRows`, `invFixRow`, `buildInvRows`) and the real CSV path. Nothing is stubbed except the painter and the debug logger.
- **Scoring.** Per truth line: right, noisy (right but flagged), silent-wrong (wrong and NOT flagged), loud-wrong (wrong but flagged), missed. "Flagged" is the parser's own `needManual || uncertain || unitMismatch`. With `--products tests/fixtures/base-products.json` the run also reports `invRowState`, the review screen's actual pre-tick decision, against this cafe's 393 real products.

## 3. The truth, per real invoice

Supplier names are replaced by roles. Cafe details are omitted. Line items and prices are as printed.

### Supplier A (foodservice distributor), invoice of 07/09/2026, 2 pages

Layout: `Code | Description | Brand | Pack Size | UOM | Qty | Unit Price | Price | Excl GST Value | GST Value | Total Value`. Ex-GST, GST per line (0.00 on GST-free food, 10% on ice cream and pancakes). The table breaks after 20 lines; page 2 repeats the column header, then a "Summary of Supplies" block, a "Carton Counts" block, and a balance-owing line. As the app extracts it, page-1 lines begin with the UOM word (`CTN 223576 #BREAD ...`) and page-2 lines end with it. Packs are written `48x85gr`, `8x1.2kg`, `8x6's`, `6.8kg`, `10lt`, `kg` (catch weight, qty `1.135`).

| Line | Qty | Pack | Unit price ex | Line total | Expected stored |
|---|---|---|---|---|---|
| BREAD BUNS MILK 4.5" | 4 CTN | 48x85g | 52.12 | 208.48 | 12.7745/kg or 1.0858/ea |
| BREAD SOURDOUGH SLICED CAFE STYLE | 3 CTN | 8x1.2kg | 45.70 | 137.10 | 4.7604/kg |
| HASH BROWNS TRIANGLES CHUNKY | 10 PKT | 1kg | 5.62 | 56.20 | 5.62/kg |
| HOKI S/F FLT S/ON 4/6 | 5 BLK | 6.8kg | 82.27 | 411.35 | 12.0985/kg |
| ICE CREAM VANILLA | 2 TUB | 10L | 29.49 | 58.98 (+5.90 GST) | 2.949/L |
| PANCAKES HOTCAKES PLAIN 100MM | 2 CTN | 8x6's | 30.25 | 60.50 (+6.05 GST) | 0.6302/ea |
| PORK PULLED FROZEN | 5 PKT | 1kg | 16.21 | 81.05 | 16.21/kg |
| SQUID RINGS NATURAL CRUMBED (APP 30-40 RINGS) | 15 PKT | 1kg | 13.37 | 200.55 | 13.37/kg |
| BEEF SANDWICH STEAK 100GR | 1 PKT | 1kg | 29.89 | 29.89 | 29.89/kg |
| BUTTER P/C | 2 TRAY | 100x8g | 18.05 | 36.10 | 22.5625/kg or 0.1805/ea |
| CHEESE FETTA DANISH | 1 BKT | 2kg | 21.96 | 21.96 | 10.98/kg |
| CHEESE MOZZARELLA SHREDDED | 2 PKT | 2kg | 23.00 | 46.00 | 11.50/kg |
| CREAM WHIPPED AEROSOL | 12 CAN | 400g | 8.94 | 107.28 | 22.35/kg |
| HAM LEG SLICED 2MM (APP 1KG) | 1.135 KG | per kg | 11.98 | 13.60 | 11.98/kg |
| MAYONNAISE AIOLI SQUEEZE BOTTLE | 2 BTL | 1L | 11.93 | 23.86 | 11.93/L |
| MAYONNAISE BASIL PESTO SQUEEZE GF | 1 BTL | 1kg | 10.23 | 10.23 | 10.23/kg |
| MAYONNAISE WHOLE EGG FREE RANGE | 1 BTL | 1L | 11.13 | 11.13 | 11.13/L |
| CUCUMBERS SANDWICH STACKERS | 1 JAR | 2.2kg | 9.98 | 9.98 | 4.5364/kg |
| GRAVY MIX RICH CLASSIC | 1 PAIL | 7.5kg | 100.12 | 100.12 | 13.3493/kg |
| JUICE CLEAR APPLE LONG LIFE 100% PET | 6 BTL | 2L | 3.84 | 23.04 | 1.92/L |
| SAUCE BARBEQUE GLUTEN FREE (page 2) | 2 BTL | 4L | 13.37 | 26.74 | 3.3425/L |
| SAUCE HOLLANDAISE GARDE DOR TETRA (page 2) | 6 EA | 1L | 12.41 | 74.46 | 12.41/L |
| SAUCE TOMATO GLUTEN FREE (page 2) | 3 BTL | 4L | 10.72 | 32.16 | 2.68/L |

Subtotal 1780.76, GST 11.95, total 1792.71. No freight line. Non-product lines: summary block, carton counts, a "Balance owing as at" line.

### Supplier B (poultry and smallgoods distributor), five invoices, 07/08 to 04/09/2026

Layout (all five): `Item Code | Item Description | Ordered | Shipped | UOM | Ship Doc + Unit UOM | Item Price | GST | Line Total`. Ex-GST. **Item Price is per UOM**: per KG when the UOM is KG (bacon, chipolatas, chicken breast, smoked salmon), per CTN, BAG, CAN, UNIT or BTL otherwise. Ordered and Shipped print as equal two-decimal numbers on every line (`3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50`). Prices carry a `$`; quantities do not. **Descriptions wrap**: the brand, a sub code, or the pack count lands on a second money-less line (`LAND`, `TIBALDI`, `60*120G ANGEL BAY 72361`, `UNITS/CTN TIP TOP 9323`, `(SUB 13917)`). A `FUEL LEVY` line carries the invoice's only GST ($0.30). The first invoice runs to three pages: items, an empty repeat of the header, then totals and the EFT block. The 25/08 invoice has a **credit note** as its third page, crediting two cartons of chips at `-2.00 -2.00 CTN $29.50 $-59.00` with an all-zero second row.

Invoice 07/08/2026 (Total Ex 974.70, GST 0.30, Total 975.00):

| Line | Qty | Pack | Unit price ex | Line total | Expected stored |
|---|---|---|---|---|---|
| FZ CHIPS - S/CUT 10MM GF 6X2KG | 3 CTN | 6x2kg | 29.50 | 88.50 | 2.4583/kg |
| BACON - RINDLESS MIDDLE 2.5KG(2) | 25 KG (5 ctn) | 2x2.5kg, priced per kg | 12.20 | 305.00 | 12.20/kg |
| FUEL LEVY | 1 EA | | 3.00 (+0.30 GST) | 3.30 | not a product |
| PORK CHIPOLATAS 1.5KG (3) | 3 KG (2 pk) | 1.5kg, priced per kg | 12.90 | 38.70 | 12.90/kg |
| VINEGAR - WHITE 20LTR CASK | 1 DRUM | 20L | 20.40 | 20.40 | 1.02/L |
| FZ CHICKEN BREAST SCHNITZEL 40 X 100G | 1 CTN | 40x100g | 55.70 | 55.70 | 13.925/kg or 1.3925/ea |
| CHICKEN 1/2 BREAST (F) S/OFF 5KG BAG | 5 KG (1 bag) | priced per kg | 8.90 | 44.50 | 8.90/kg |
| FZ BEEF BURGER PATTIES PART COOKED / 60*120G | 2 CTN | 60x120g (on line 2) | 99.10 | 198.20 | 13.764/kg or 1.6517/ea |
| FZ BREAD - WHITE SLICED 700G/UNIT 6 / UNITS/CTN | 1 CTN | 6x700g (split over 2 lines) | 25.00 | 25.00 | 5.952/kg or 4.1667/ea |
| FZ BREAD - RAISIN THICK 600G/UNIT / 6UNITS/CTN | 1 CTN | 6x600g | 38.00 | 38.00 | 10.556/kg or 6.333/ea |
| CHEESE - HALLOUMI PDO 750G (5) | 2 UNIT | 750g | 16.40 | 32.80 | 21.867/kg or 16.40/ea |
| VEGAN AIOLI 1KG BOTTLE (6) | 2 BTL | 1kg | 11.00 | 22.00 | 11.00/kg |
| FLOUR - PLAIN FLOUR 12.5KG | 1 BAG | 12.5kg | 12.50 | 12.50 | 1.00/kg |
| FLOUR - SELF RAISING FLOUR 12.5KG | 2 BAG | 12.5kg | 16.85 | 33.70 | 1.348/kg |
| CANNED - PINEAPPLE SLICES IN SYRUP 60-70 RINGS A10 (3) | 3 CAN | A10, no weight printed | 10.75 | 32.25 | 10.75/ea (or ask) |
| CANNED - BEETROOT SLICES 3KG (3) | 3 CAN | 3kg | 8.15 | 24.45 | 2.7167/kg |

Invoice 21/08/2026 (429.70 / 0.30 / 430.00): FZ HASH BROWN TRI PATTIES 2.26KG X 6, 1 CTN @ 72.85 (5.3724/kg) · FZ CHIPS 6 CTN @ 29.50 (2.4583/kg) · FUEL LEVY · BEEF PATTIES 1 CTN @ 99.10 · FZ SALMON - SMOKED SLICE 1KG (I), 1 KG @ 35.00 (35.00/kg) · OIL - CANOLA OIL SPRAY 450G(12), 1 UNIT @ 4.75 (10.556/kg or 4.75/ea) · BREAD RAISIN 1 CTN @ 38.00.

Invoice 25/08/2026 (1098.75 / 0.30 / 1099.05, then a credit note for -59.00): FZ CHIPS 11 CTN @ 29.50 · VINEGAR 20LTR 1 DRUM @ 20.40 · FUEL LEVY · BEEF PATTIES 1 CTN @ 99.10 · EGGS - 600G 15X1 DOZEN, 3 CTN @ 58.50 (0.325/ea) · BACON - RINDLESS MIDDLE 2X2.5KG PENDLE, 30 KG @ 11.00 (11.00/kg) · BREAD WHITE 1 CTN @ 25.00 · PORK CHIPOLATAS 1.5 KG @ 12.90 · BREAD RAISIN 1 CTN @ 38.00 · OIL CANOLA SPRAY 4 UNIT @ 4.75 · FLOUR PLAIN 1 BAG @ 12.50 · CHEESE - DANISH FETTA 2KG (4), 2 UNIT @ 16.20 (8.10/kg). Credit page: FZ CHIPS -2 CTN @ 29.50, $-59.00.

Invoice 01/09/2026 (211.15 / 0.30 / 211.45): FZ CHIPS 5 CTN @ 29.50 · BEETROOT 3KG (3) 3 CAN @ 8.15 · FUEL LEVY · PORK CHIPOLATAS 1.5 KG @ 12.90 · FLOUR SELF RAISING 12.5KG 1 BAG @ 16.85.

Invoice 04/09/2026 (512.60 / 0.30 / 512.90): FZ CHIPS 10 CTN @ 29.50 · BREAD WHITE 1 CTN @ 25.00 · FUEL LEVY · BREAD CRUMBS FINE WHITE 10KG (48), 1 BAG @ 30.40 (3.04/kg) · CHICKEN 1/2 BREAST 5KG BAG, 5 KG @ 8.90 (8.90/kg) · BEEF PATTIES 1 CTN @ 114.70 (15.93/kg or 1.9117/ea).

The complete machine-readable truth for all six is in `spike/parser-audit/real-truth/` (line items and prices only; the extracted text, which carries the cafe's details, stays outside the repo).

## 4. Results

Parser-level scoring (no catalogue). "Silent" is wrong and unflagged; "loud" is wrong but flagged; "leak" is a non-product line that became a priced row (count, and how many of those were unflagged).

| Case | Lines | Shipped: right / silent / loud / leaks(unflagged) | Patched: right / silent / loud / leaks(unflagged) |
|---|---|---|---|
| real-01 Supplier A, 2 pages | 23 | 23 / 0 / 0 / 0 | 23 / 0 / 0 / 0 |
| real-02 Supplier B, 3 pages | 15 | 0 / **13** / 2 / 1(0) | 15 / 0 / 0 / 1(0) |
| real-03 Supplier B | 6 | 0 / **5** / 1 / 1(0) | 6 / 0 / 0 / 1(0) |
| real-04 Supplier B + credit note | 11 | 0 / **10** / 1 / 2(**1**) | 11 / 0 / 0 / 2(0) |
| real-05 Supplier B | 4 | 0 / **4** / 0 / 1(0) | 4 / 0 / 0 / 1(0) |
| real-06 Supplier B | 5 | 0 / **4** / 1 / 1(0) | 5 / 0 / 0 / 1(0) |
| **Real six** | **64** | **23 / 36 / 5** | **64 / 0 / 0** |
| fake-01 foodservice A (Supplier A shape) | 7 | 7 / 0 / 0 | 7 / 0 / 0 |
| fake-02 foodservice B (PFD shape, qty ord/sup, no repeated price) | 7 | 3 / 4 / 0 | 7 / 0 / 0 |
| fake-03 fruit and veg (each, bunch, per kg, @ rates) | 8 | 6 / 1 / 1 | 8 / 0 / 0 |
| fake-04 smallgoods catch weight (units, actual kg, $/kg) | 5 | 0 / 5 / 0 | 4 / 1 / 0 |
| fake-05 Xero template | 4 | 0 / 1 / 3 | 4 / 0 / 0 |
| fake-06 MYOB template (with a 5% line discount) | 5 | 1 / 4 / 0 | 4 / 0 / 1 |
| fake-07 Square invoice (GST included) | 4 | 0 / 4 / 0 (GST read as ex) | 4 / 0 / 0 (GST inc) |
| fake-08 supermarket receipt (* markers, GST inclusive) | 6 | 1 / 5 / 0 | 6 / 0 / 0 |
| fake-09 credit note | 0 | leaks 2(**2**) | leaks 2(0) |
| fake-10 page break mid-table | 6 | 2 / 4 / 0 | 6 / 0 / 0 |
| fake-11 freight, discount, rounding lines | 4 | 2 / 2 / 0 | 3 / 1 / 0 |
| fake-12 quantity-first carton lines (the 236 shape) | 4 | 3 / 1 / 0 | 4 / 0 / 0 |
| fake-13 trailing net-weight columns (the 237 shape) | 4 | 3 / 0 / 1 | 4 / 0 / 0 |
| fake-14 CSV paste | 2 | 2 / 0 / 0 | 2 / 0 / 0 |
| **Synthetic fourteen** | **66** | **30 / 31 / 5** | **63 / 2 / 1** |
| **All twenty** | **130** | **53 / 67 / 10** | **127 / 2 / 1** |

With this cafe's catalogue (`--products tests/fixtures/base-products.json`), the shipped parser pre-ticks 30 rows of which 4 are wrong (one real: canola spray at $8.89/kg against $9.33 stored, inside the 12% jump threshold), and puts 34 of the 35 wrong real Supplier B prices into `review` only because `flagNeedsAttention` sees a price jump against history. The patched parser pre-ticks 45 rows, none wrong, and matches two products it previously got wrong (section 5, D9).

Run either table yourself: section 8.

## 5. Defects

Line numbers are in the shipped `js/app.js` at the time of writing; grep the name if they have moved. "Silent" means the row reaches the review screen with `needManual:false` and no `uncertain` or `unitMismatch`, so a matched product at high confidence is pre-ticked and the number is stored on Confirm.

**D1. The pack price is chosen by repetition or by position, never by arithmetic.** `firstPairPrice` (10620) returns the first adjacent pair of equal amounts; `parsePdfLine` (10768) falls back to the LAST amount, the line total. Neither consults the quantity.
- Input: `13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN 3.00 3.00 CTN 3.00 CTN $29.50 $0.00 $88.50`. Ordered and Shipped are an equal adjacent pair, so the pack price is $3.00 and the row is **$0.25/kg** for a $2.46/kg product; 6 cartons gives $0.50, 11 gives $0.92. Silent, and the stored price tracks the order size.
- Input: `20001 CHIPS STRAIGHT CUT 10MM EDGELL 6X2KG 2 2 38.20 76.40 N` (no repeated column). The pack price is the total, so **$6.37/kg** for $3.18, times the quantity. Same on Xero (`... 12.00 6.50 GST Free 78.00` gives $97.50/kg for a $6.50 loaf), MYOB (`10 MILK2L ... $3.20 $32.00` gives $16.00/L), Square (`4 x $38.00 $152.00` gives $152/kg), a supermarket receipt (`2 @ $4.80 9.60`), a market docket (`3 PUN Strawberries 250g $4.50 $13.50` gives $54/kg). Silent, every one.
- `packPriceOf` (10632) carries the identical rule into `derivePackPrice`, `applySupplierMemory` and `resolveMatchedPrice`, so a taught pack or supplier memory divides the same wrong figure.

**D2. A kilogram quantity column is read as the pack weight, and the price per kilogram becomes a price per pack.** `packWeight` (10724) takes the last `<number> <unit>` token in the WHOLE line, and `25.00 KG` is one; `invFixRow` (10894) then re-bases onto the 2.5kg in the name.
- Input: `70675 BACON - RINDLESS MIDDLE 2.5KG(2) # 35350 25.00 25.00 KG 5.00 CTN $12.20 $0.00 $305.00`, priced $12.20 per kg. Shipped: **$10.00/kg**. With D1 fixed and D2 not, it would be $12.20 / 2.5 = **$4.88/kg**. Chipolatas `3.00 3.00 KG ... $12.90` gives $2.00 shipped, $8.60 with D1 alone; chicken `5.00 5.00 KG` gives $1.00; smoked salmon `1.00 1.00 KG ... $35.00` gives $1.00. Silent.

**D3. A multiplier printed AFTER the weight is ignored.** `packWeight` multiplies only what precedes the last weight token (10733).
- Input: `FZ HASH BROWN TRI PATTIES 2.26KG X 6 ... $72.85`: 2.26kg, not 13.56kg, so **$32.23/kg** for $5.37 once D1 is fixed ($0.44 shipped). Same for `700G/UNIT 6 UNITS/CTN` and `600G/UNIT 6UNITS/CTN`: the six loaves are dropped, **$35.71/kg** and **$63.33/kg** for $5.95 and $10.56. Silent.

**D4. A wrapped description is a separate line and its pack size is lost.** `pdfTextToRows` (10779) parses each extracted line alone; a money-less continuation is discarded.
- Input: `12828 FZ BEEF BURGER PATTIES PART COOKED 2.00 2.00 CTN ... $99.10` followed by `60*120G ANGEL BAY 72361`. The row has no pack and goes manual (loud, at least). `FZ BREAD - WHITE SLICED 700G/UNIT 6` followed by `UNITS/CTN TIP TOP 9323` is D3's case: the 6 is on the first line but only readable once the second is joined. Both Supplier B bread lines are wrong on all five invoices.

**D5. A negative quantity or amount is priced as a purchase.** `moneyMatches` (10616) has no sign; `-2.00` matches as `2.00` and `$-59.00` as `59.00`.
- Input (the credit-note page): `13612 FZ CHIPS - S/CUT 10MM GF 6X2KG GARDEN LAND -2.00 -2.00 CTN $29.50 $-59.00` becomes a purchase at **$0.17/kg**, unflagged. On the synthetic credit note the lines price at the (correct) invoice rate but are still purchases. Silent.

**D6. A stray `*` after any number is a multiplier.** `packCount` (10741) accepts `N x`, `N *` or `N of` with nothing required after the symbol.
- Input: `PAPER TOWEL 6PK 1 @ $9.00 9.00 *` (a supermarket's taxable marker): `9.00 *` reads as "9 times", so **$0.91/ea** for $1.36. Silent. The same regex is why `hasProductStructure` (10540) is happy with `9.00 *`.

**D7. A dozen count loses to a weight on the same line.** `parsePdfLine` tries `packWeight` (10773) before `packCount` (10775).
- Input: `18599 EGGS - 600G 15X1 DOZEN 3.00 3.00 CTN ... $58.50`: 600g is the carton grade, 180 eggs is the pack. Shipped **$5.00/kg**; with D1 alone **$97.50/kg**; truth $0.325/ea. Silent at parser level (caught here only because the product is stored per egg and the unit guard fires).

**D8. "GST (included)" is not detected.** `invGstDetect` (10466) matches `gst\s*incl` and misses the bracket. A Square invoice is treated as ex-GST and every price stored 10% high. Silent; outside the region.

**D9. Candidate matching hands a tie to catalogue order.** `rankCandidates` (10558) normalises overlap by the SHORTER token set, so a one-word product scores 1.0 against every line containing that word and ties with the right product; the stable sort (10563) keeps the first one seen.
- Input: `MAYONNAISE AIOLI SQUEEZE BOTTLE JEFFERSONS 1lt` matches `Mayonnaise` (Kewpie, per g) at 1.0 ahead of `Mayonnaise Aioli Squeeze Bottle Gluten Free` (Jeffersons, per ml), also 1.0. `CHEESE - HALLOUMI PDO 750G` matches `Cheese Cream Express` ahead of `Cheese Halloumi Block`. Wrong product at `hi` tier; caught on this catalogue only by the unit guard or a price jump.

**D10. Supplier detection returns a field label.** `invSupplierDetect` (4425) skips the letterhead line because it is 45 characters with `TAX INVOICE` appended, then accepts `Credit Terms: 7 Days` as the business name. Every Supplier B pack the user teaches is remembered under that key; a second supplier printing the same label shares it. Outside the region.

**D11. The 236/237 correction uses a narrower container list than the fold it undoes.** `packWeight`'s multiplier chain (10733) folds `bags?`, `trays?`, `packe?t?s?`, `sleeves?`; `invFixRow`'s anchor (10896) recognises only `ctn|carton|case|box`.
- Input: `4 BAG Pork Belly Sliced 2kg 31.00 31.00 124.00` gives **$3.875/kg** for $15.50, unflagged. Silent. The patch makes the quantity known to the parser so neither list is load-bearing.

**D12. The extractor never sorts a line's items by x.** `extractPdfText` (10229) joins items in content-stream order. On Supplier A the UOM word moves from the start of the line (page 1) to the end (page 2); on other PDFs the price could precede the description. Not a wrong number today, but it is why the harness must score the app's own extraction rather than `pdftotext`, and why `tests/parser.test.js`'s fixtures (which have the UOM in the middle) no longer look like what the app receives.

**D13. Several amounts that neither pair nor add up are priced from the total.** The MYOB line `6 YOG1KG Yoghurt Greek 1kg $7.90 5.00% $45.03` (a 5% line discount) is stored at $45.03/kg. The patch makes this loud (manual) rather than right; getting it right needs the discount column.

**D14. A levy that carries a quantity survives as a row.** `S77 FUEL LEVY 1.00 1.00 EA 1.00 $3.00 $0.30 $3.30` matches `INV_EXCLUDE` but `hasProductStructure` sees `1.00 EA` and keeps it as `uncertain`. Noisy, not wrong; every Supplier B import shows one review row for the fuel levy.

## 6. Proposed fixes and the patch

`spike/parser-audit/proposed.patch` is a unified diff against `js/app.js` and `tests/inv-row-fix.test.js`; `git apply --check` passes on `main` as of today. It was produced by `spike/parser-audit/apply-patch.js` (string replacements against the shipped file, so the diff can be regenerated after `js/app.js` moves) and validated on a scratch copy: `npm test` 1876 pass, harness 127/130 right with 2 silent-wrong. Each change is small and independently testable.

| Defect | Fix in the patch |
|---|---|
| D1, D2, D11 | New `lineColumns(line)`: for every amount P, look for a bare number q to its LEFT and an amount T to its RIGHT with q x P = T (tolerance one cent per unit of q). A number is not a quantity candidate if it is glued to a unit (`2.5kg`), follows an `x`, wears a `$`, is negative or precedes `%`. Prefer a `$`-marked P, the nearest q, the rightmost P; skip the degenerate `1 x 1.00 = 1.00`. `parsePdfLine` uses its price, removes the quantity token from the pack text before any pack maths, and when the quantity's unit word is kg or L (or the quantity is fractional on a weighed line) returns the price per that unit directly. When nothing adds up: the old repeated-pair rule, then a single amount, else `needManual` rather than the total. |
| D2, D11, 237 | Pack weight and pack count are read from the NAME with the quantity removed (what `invPackWeight` already does for the correction), never from the raw line. `invFixRow` reads `row.basis` and steps aside for column-priced rows; the old path stays for hand-built rows and the pair fallback. |
| D3 | `packWeight` also multiplies by an `x N` or `N units` immediately after the weight (`2.26KG X 6`, `700G/UNIT 6 UNITS/CTN`), and by nothing else. |
| D4 | `pdfTextToRows` splices one short money-less line that directly follows a row, carries no summary word, no column word and no page marker, into that row's name AHEAD of the money columns and re-parses. `raw` stays the original line (it is the supplier-memory key); `cont` records the join. |
| D5 | `moneyMatches` records `dollar` and `neg`; a line with any negative amount returns `needManual:true, uncertain:true`. |
| D6 | The multiplier in `packCount` must be followed by a digit; `pack`, `pk`, `pkt` become count words (`48 pack`, `6PK`). |
| D7 | A dozen or pack count in the pack text is tried before the weight. The bare `105S` form keeps today's precedence (weight first) because `tests/inv-chain.test.js` pins that reading; see residuals. |
| D8 | `invGstDetect` accepts `gst (incl...)`. |
| D9 | `rankCandidates` breaks a coverage tie on overlap count, then product size. |
| D10 | Not in the patch (outside the region, two-line fix): strip a trailing `TAX INVOICE` from a letterhead candidate before the 42-character test, and skip any header line shaped `Label: value`. |
| D12 | Not in the patch. Sorting items by `transform[4]` within a y-group would put the UOM word where it prints; the harness would show whether any real invoice changes. Do it only with the corpus in place. |
| D13, D14 | Not fixed. D13 is now loud instead of silent. D14 could exclude a name whose non-numeric tokens are ALL exclude words. |

**What the patch does to existing tests.** All 1876 pass. Five in `tests/inv-row-fix.test.js` are rewritten in the diff, because each asserted a PRECONDITION of the old mechanism ("the parser alone is an order of magnitude out", "the parser did derive a weight price here") that is false once the defect is fixed at its source; the outcome each test exists for (the right price, or a flag) is what the rewritten test pins. One fixture (`Beef Mince 2 x 6 x 1kg 60.00 60.00 120.00`) contradicted itself, since 2 x 60 = 120 makes the leading 2 a quantity; the rewrite uses a 60.00 total.

**What it does to the mutation gate.** `invFixRow`'s A and B branches are unreachable for any row `lineColumns` prices, so `node tests/mutation/run.js --target=invFixRow` on the patched copy reports 8 new survivors (32 mutants, 23 killed) where the shipped code has 1 allowed. The batch that lands this must either retire those branches (the honest option: `invFixRow` becomes "step aside when the parser knew the quantity, else the pair-path fold check") with pair-path fixtures that still reach the fold check (`2 CTN Beef Mince 6 x 1kg 60.00 60.00 130.00` must flag), or write allowances with reasons. Neither `parsePdfLine`, `packWeight`, `packCount` nor `moneyMatches` is a mutation target today; section 7 adds them.

**Behaviour changes a user would notice, stated so they are not rediscovered as bugs.** A Supplier B import goes from 0 pre-ticked rows and a wall of price-jump flags to mostly pre-ticked rows. A credit note (or a credit page inside an invoice) shows every credited line as a review row with no price. A line the parser cannot add up shows as "type the price" instead of a wrong figure. Bread and patties from Supplier B show a joined name (`... PART COOKED 60*120G ANGEL BAY 72361`).

## 7. Tests that would pin each fix

Each is a `node:test` file or case using `tests/_extract.js` (the real functions), with the fixture line quoted from section 5 so a reader can see the arithmetic.

1. `tests/parser-columns.test.js` (new, D1/D2): `lineColumns` on the Supplier B chips line returns price 29.50, qty 3, unit `ctn`; on the bacon line returns 12.20 with qty 25 unit `kg` and NOT 25.00; on the Supplier A buns line returns 52.12 with qty 4; on `1.00 1.00 CTN 1.00 CTN $25.00 $0.00 $25.00` returns 25.00 (the $ preference) and on the same line without `$` still returns 25.00 (the degenerate-triple skip); on the yoghurt discount line returns null. Then `parsePdfLine` end to end: chips 2.4583/kg, bacon 12.20/kg, chicken 8.90/kg, flour 1.00/kg, each with `basis.kind === 'columns'`. Mutation: flip `q.end>P.idx` and `j=i+1` and the tolerance operator; each must go red.
2. `tests/parser-columns.test.js` (D1 fallback): a two-amount line with no pair and no arithmetic (`Espresso Blend 1kg $38.00 $152.00`) is `needManual`, never priced from 152.
3. `tests/parser-suffix.test.js` (D3): `packWeight('... 2.26KG X 6')` is 13.56; `packWeight('... 700G/UNIT 6 UNITS/CTN ...')` is 4.2; `packWeight('... 1kg 10 5.62 5.62 ...')` is still 1 (a bare following number is not a multiplier). Mutation: delete the suffix block; the first two go red.
4. `tests/parser-wrap.test.js` (D4): `pdfTextToRows` on the two-line patties fixture returns ONE row at 13.764/kg with `cont` set and `raw` equal to the first line; a banner (`***** CHILLER *****`), a summary line, a `Page 2 of 3` line and a line with money are each NOT joined; a continuation never joins to a row that did not parse. Mutation: drop `last=null`; the second-continuation case must go red.
5. `tests/parser-credit.test.js` (D5): `moneyMatches('$-59.00')[0].neg` and `moneyMatches('-2.00')[0].neg` are true, `moneyMatches('Bread - 4.50')[0].neg` is false; the real credit line is `needManual` and `uncertain` with `unitPrice` null.
6. `tests/parser-count.test.js` (D6/D7): `packCount('PAPER TOWEL 6PK 1 @')` is 6 and `packCount('... 9.00 *')` is null; `parsePdfLine` on the eggs line is 0.325/ea, on `Croissant butter 48 pack 2.00 62.40 GST Free 124.80` is 1.30/ea.
7. `tests/invoice-gst.test.js` (D8): `invGstDetect('GST (included) $31.44').mode === 'inc'`.
8. `tests/inv-match.test.js` (D9): with a catalogue of `Mayonnaise` (Kewpie) listed BEFORE `Mayonnaise Aioli Squeeze Bottle Gluten Free`, `rankCandidates('MAYONNAISE AIOLI SQUEEZE BOTTLE JEFFERSONS 1lt')[0]` is the aioli. The order in the fixture is the point (roster 184(b): a fixture whose candidates agree cannot tell you which one the code read).
9. `tests/inv-supplier-detect.test.js` (D10): the Supplier B letterhead block returns the business name, and a header whose only unfiltered line is `Credit Terms: 7 Days` returns `''`.
10. `tests/mutation/targets.js`: add `parsePdfLine`, `lineColumns`, `packWeight`, `packCount`, `moneyMatches`, `firstPairPrice` and `rankCandidates` with the files above. None has ever been asked the question; `CLAUDE.md` says what that means.
11. The harness itself (section 8) as a test: `tests/parser-corpus.test.js` runs `run.js`'s `scoreCase` over `spike/parser-audit/fixtures` and asserts `silent-wrong === 0` and `leaksUnflagged === 0` for every case, with the two known residuals listed by name as allowed until fixed. That is the regression net for the whole region.

## 8. The eval harness, and what replaces "never edit the region"

The rule was written because the parser had no way to be checked except by hand on one invoice, and it did its job: four batches wanted to edit the region and solved outside it instead (`normPackNotation`, `invFixRow`, `invPackWeight`). It also had a cost that this audit is the bill for: the region was tuned to one supplier's layout for months while the second supplier's invoices were coming out wrong on every line, and nothing could notice because nothing measured it. `docs/MAINTENANCE.md` already asks for "an eval harness for the invoice reader" and says "there is no way to tell whether a parser or prompt change made it better or worse". That is now `spike/parser-audit/run.js`.

**What exists today.**
- `spike/parser-audit/run.js`: slices the real parser out of `js/app.js`, runs the real PDF and CSV paths over a directory of cases, scores against truth, prints the table, `--verbose` prints every line, `--json` writes the result, `--products` runs the full review chain against a catalogue and reports the pre-tick state.
- `spike/parser-audit/extract-pdf.mjs`: the app's own extractor, for turning a real PDF into what the app would see. Needs `pdfjs-dist@4.10.38` from a directory outside the repo (`PDFJS_DIR`); the app pins that version and this repo takes no dependencies.
- `spike/parser-audit/make-fixtures.py` and `fixtures/`: fourteen invented layouts with truth; `fixtures/README.md` is the schema.
- `spike/parser-audit/real-truth/`: the six real invoices' truth (line items and prices only, supplier names as roles). The extracted text is not in the repo.

**How to run it.**
```
node spike/parser-audit/run.js                                        # the synthetic set
node spike/parser-audit/run.js --cases <dir with real NAME.txt + NAME.truth.json> --verbose
node spike/parser-audit/run.js --products tests/fixtures/base-products.json   # with the pre-tick column
PDFJS_DIR=/somewhere/with/node_modules node spike/parser-audit/extract-pdf.mjs in.pdf > NAME.txt
```

**Promotion.** Move `run.js` to `tests/parser-corpus/` (or keep the spike path and require it from a test), make the synthetic set a test that fails on any silent-wrong or unflagged leak (section 7, item 11), and keep the REAL corpus where the MAINTENANCE entry asked someone to decide: outside the repo, in the owner's own folder, with the truth files committed and the text regenerated from the PDFs by `extract-pdf.mjs`. Each new supplier the cafe adds gets one invoice extracted, one truth file written by hand, and the score recorded in the handover of the batch that touched the parser. A parser change is then judged by two numbers before and after: silent-wrong on the real corpus and silent-wrong on the synthetic set, and a change that moves either the wrong way does not ship.

**What replaces the protection.** Three mechanisms, none of which is a rule about not editing:
1. the corpus test above, in `npm test`, so every edit to the region is scored against 130 lines of known answers rather than one invoice looked at;
2. the mutation gate pointed at the region's functions (section 7, item 10), so a test that cannot fail is found the day it is written;
3. the `--products` run in the handover of any batch touching the region, so the pre-tick count and the pre-ticked-wrong count are on record per batch, where a human can see the number move.

The four "never touch" functions (`resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory`, `packToUnitCost`) are untouched by the patch and there is no finding against them; `packPriceOf`, which two of them call, inherits D1 and is corrected by the same `lineColumns` change through `parsePdfLine` only. A follow-up should route `packPriceOf` through `lineColumns` as well, so a taught pack divides the same price the parser chose; that is the "four copies of one formula" item HANDOVER-197 left unfiled, and it is now measurable.

## 9. Residuals, stated so they are not rediscovered

- **Units versus weight with no unit word** (fake-04 sausages, `1.5kg 2 3.00 9.80 29.40`): the 3.00 is kilograms and the 2 is packs, but only the header row says so. `lineColumns` picks 3 x 9.80 = 29.40, reads 3 as packs, and stores $6.53/kg for $9.80. The proper fix is a header-driven column model (read `Weight` and `$/kg` off the column header line and apply them to every row), which is the next thing this harness should be used to build. Silent, one synthetic line.
- **A container capacity beside a bare count** (`TAKEAWAY CONTAINER 750ML 500S`): the weight wins and the row is $117/L. Making the bare `NNNs` count beat the weight fixes it but changes the reading `tests/inv-chain.test.js` pins for `CHEESE SLICES TASTY 105S 1.5KG` (per kg, then the taught pack corrects it). Decide which precedence is wanted; both cases are in the fixtures.
- **A line discount** (D13) is loud, not right.
- **Fuel levy rows** (D14) remain a review row per Supplier B import.
- **Supplier memory keys.** Rows whose description was spliced (D4) keep `raw` as the first line, so keys taught before the patch still resolve. If a future change makes `raw` the joined line, `tidySupplierMemMigration` is the precedent for re-keying.
- **The second reader.** Nothing here measures what Gemini does to these rows; the harness runs the deterministic path only. The MAINTENANCE entry's requirement (stored model responses, replayed offline) still stands and this harness is the frame to hang it on.

## 10. For the record

- `CLAUDE.md`'s "Never edit anything inside it" and the four never-touch names are reversed for the region by the owner today; the four names carry no finding and the patch leaves them byte-identical. The MAINTENANCE entry about batch 197's edit inside the region is answered by this: the guard that should have existed was a corpus, not a hash.
- The two "real Bidfood fixtures" in `tests/inv-row-fix.test.js` and `tests/parser.test.js` carry the UOM word in the middle of the line, which is where `pdftotext` puts it and not where the app's extractor does. They still pass; they are not what the app sees.
- Numbers in this document were produced by the harness on 8 Sep 2026 against `main` and against the patched scratch copy; re-run it rather than trusting them.
