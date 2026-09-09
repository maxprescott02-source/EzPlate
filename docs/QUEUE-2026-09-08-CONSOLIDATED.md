# Consolidated queue, 8 Sep 2026

**One ordered backlog for a coding agent, numbered from 16 so it continues `docs/QUEUE.md`.** Nothing in `docs/QUEUE.md` or `docs/MAINTENANCE.md` was edited to produce it; the six open queue items (13, 14, 15, 5, 8, 2b) are placed in the order by reference and are not rewritten here.

**Sources read in full:** `docs/QUEUE.md` · `docs/MAINTENANCE.md` (every open C item; struck and done items grepped out) · `docs/ui-audit-2026-09-02.md` · `docs/PHONE.md` · `docs/GATE-REVIEW.md` · `docs/audits/BLIND-AUDIT-2026-09-05-code.md` · `docs/audits/PERSONA-AUDIT-2026-09-08.md` (all nine sections) · `docs/audits/PERSONA-AUDIT-2026-09-08-QUEUE.md` · `docs/audits/UX-AUDIT-2026-09-08.md` · `docs/audits/PARSER-AUDIT-2026-09-08.md` · `brain-ops/projects/ezplate/2026-09-08-queue-items.md` (MM-1 to MM-7). Handovers 236, 237 and 238 were read to strike what has shipped; the repo is at `e77c8fd` (batch 238, `ezplate-v196`).

**The owner's three overrides for this consolidation, which beat the queue header's "ambiguous is C":**

1. **The bar is Stripe-level polish.** Any visual or copy defect a user would notice is B, not C. A is reserved for wrong numbers, cross-tenant leaks, and anything that stops the practice offer.
2. **The parser region is no longer protected.** `CLAUDE.md`'s "Never edit anything inside it" is lifted for the region between `var INV_EXCLUDE=` and `function unitLabelFor(`. Parser defects are fixable items with tests, not harness-only notes. The four named functions (`resolveMatchedPrice`, `unitCatCategory`, `applySupplierMemory`, `packToUnitCost`) carry no finding and the patch leaves them byte-identical; they are not re-protected here either, but nothing below needs to touch them.
3. **Minor and major all go in.** Nothing is pushed down to maintenance by size. Grade says how much it matters; position says when.

**Two writing rules from the queue header, kept:** every item names its sites (file:line where measured, "unmeasured" where not; every line number is a pointer to grep, not a fact), and items are grouped by mechanism so a cause is fixed once with every instance listed under it.

**The cap.** `docs/QUEUE.md` is capped at 20 items. ⚠️ **The two figures in this paragraph are AS AT 8 SEP 2026 and are a record of what the consolidation produced, not a live count** — the queue held six that day and holds fourteen at v197; the backlog was **72 new items: 8 A, 34 B, 30 C** that day and gained item 88 on 9 Sep. **What is open now is the unstruck items, which is a grep.** (Dated 9 Sep 2026 by batch 240, AUDIT-v197 §2a.5: four files quoted the 72, in a system whose own rule is that a count in prose cannot be kept true.) The original figures, plus the six by reference: It cannot fit. The owner decides whether to raise the cap for this pass or work it in tranches; a natural cut is items 16 to 45 first (the mis-costing fixes and the path to the practice offer, 30 items), then 46 to 66 (the B polish, 21 items), then 67 to 87 (the C tail, 21 items). Either way `docs/MAINTENANCE.md`'s ride-along rule still applies to the C tail: a C item rides the batch that already opens its file.

**Grades used below:** A = a wrong number, a cross-tenant leak, or a blocker for the practice offer. B = a real person would see something wrong, half-finished, or off the polish bar. C = internal quality, records, tests, and defects with no reachable symptom today.

**`docs/QUEUE-GROUPS.md` groups these items by the context a batch loads**, so the cost of opening a region is paid once, and states the order and what is serial. It routes and does not restate: every mechanism, site, acceptance and test stays here. It also answers the parallel question with the measurement — a second worktree ran for seventeen batches and landed zero items — and corrects the assumption that the margin monitor is an independent track (it is file-independent and schedule-dependent, `17 → 30 → 31 → 32 → 33`).

---

# Tranche 0: clean-up only the owner can do

Not batches. Each is a dashboard click, a SQL statement on production, or a decision that is his. None of them is queued below; the items that depend on them say so.

- **Delete the `price_history` point written 2026-09-08 09:37 (value 354.4)**, and the `menu_price_history` rows for menu `MENUmtsh5o3t-1-9v3bvrqw`. It is the tallest point on the all-menus trend, the y-axis runs to 380%, and every real week since 24 Aug reads as a flat line. Nothing in the app can remove it (that is item 18's last requirement). Destructive on production, so his.
- **Delete the ZZ-AUDIT objects** left by the 8 Sep passes: menu `MENUmtsh5o3t-1-9v3bvrqw` (one dish on it), plates `SPmtsgl835-3-whbuaxv4` and `SPmtsgln1j-5-ccgyrir0`, ingredient `K0164` (in the `kitchen_ingredients` `app_settings` blob), products `Umtsgis3j-1-6db8oyfi` and `Umtsgitwu-2-r0gi6433`, and the `ing_price_history` rows for the second product. Until they go, the Dashboard's "Needs attention" insights and biggest movers are about fake plates (UX audit U5).
- **Create the staging test account.** A throwaway address, sign it up on `/?env=staging`, name a café. Credentials go into the local `.env` and Vercel's staging environment as `STAGING_TEST_EMAIL` / `STAGING_TEST_PASSWORD`, never into the repo. Two minutes; it unblocks items 27, 28, 29 and the 14 skipped screenshot tests.
- **Add `.env` to `.gitignore`.** It is not there today and the repo is public. Before adding it, confirm no `.env` was ever committed: `git log --all --diff-filter=A -- .env` should print nothing. A coding agent can write the line; only he can act if the history check finds something.
- **Confirm the `CLAUDE.md` reversal on the parser region in writing.** He lifted "Never edit anything inside it" on 8 Sep (parser audit §8 and §10). The edit to `CLAUDE.md`'s Tier 1 section, to `docs/QUEUE.md`'s "Standing rules" line ("protected parser region untouched"), and to the two `docs/MAINTENANCE.md` entries that hinge on the rule (the batch 197 ratification question; the region hash pin) rides item 17 under standing authority, and it should quote his words. What replaces the rule is the corpus test, the mutation targets, and the `--products` run in every parser batch's handover.
- **Supabase dashboard, two switches** (from batch 238 and `docs/MAINTENANCE.md`): Authentication → URL Configuration: Site URL `https://scoopyscosting.vercel.app`, Redirect URLs add `https://scoopyscosting.vercel.app/**` (production AND staging projects). Authentication → Policies: turn on leaked-password protection. Nothing in the repo can do either.

---

# A first: wrong numbers, then the multi-tenant gates

## ~~16 · Relinking an ingredient leaves every legacy bare-pid plate line on the old product~~  **SHIPPED, batch 239, `ezplate-v197`**

✅ The heal is in Settings → Data ("Fix older plate lines"), hidden once there is nothing to fix. It rewrites `{pid:P}` to `{kid:K}` only where `K.pid` is ALREADY `P`, so no cost moves and a later relink reaches the line; one `dbPushPlate` and one `plate_relinked` change-log entry per plate the server took, rolled back per plate when it refuses. Rehearsed offline against a read-only snapshot of production: **31 lines across 11 plates fixable, 13 across 9 not, zero of 103 plate costs moved.**
⚠️ **TWO PARTS OF THIS ITEM WERE WRONG AND ARE CORRECTED IN `docs/handovers/HANDOVER-239-relink-heal.md`:** the log entry cannot reach the Dashboard (Recent changes needs a cost delta and the heal has none, by construction), and `platesUsingKid` was deliberately NOT widened — the item allowed either arm of its own disjunction and the count is still exactly what a relink heals, with the other arm now named in the modal instead.
⚠️ **THE 13 LINES IT REFUSES ARE THE MEASURED MIS-COSTING AND ARE STILL OPEN** — see item 88.

**Mechanism.** A plate line is `{kid,qty}` (resolves through the kitchen ingredient to its current product) or legacy `{pid,qty}` (resolves straight to `byId`). `lineProduct` (`js/app.js:1610`) takes the `kid` arm when present and otherwise `byId[l.pid]`, so a relink that moves `k.pid` moves every kid line instantly and no bare-pid line ever. The three repoint sites write `k.pid` only: the Ingredients modal (`js/app.js:5269`), the invoice deferred repoint (`:12168`) and the guarded confirm (`:12213`). `platesUsingKid` (`:5299`) counts the kid arm only, so "Used in N plates" undercounts. The modal copy "changing the product updates all of them" (grep `updates all of them` in `js/app.js`) is true of one arm.

**Measured on production 8 Sep (persona audit §7):** 44 bare `{pid}` lines across 11 plates (down from 84 of 179 on 1 Aug; not gone). 13 of the 44 point at a product no ingredient uses any more. Bacon Bene, Ham Bene and Feta, Spinach & Mushroom Bene each under-cost two eggs by $0.27; Pancakes Plain over-costs syrup by $0.37; Feta Bene over-costs fetta by $0.16; Ham Bene under-costs ham by $0.05; Scoopy's Breakfast under-costs hash browns by $0.04. Bacon shows "used in 15 plates" and 18 plates cost bacon. All on Ethen's Menu Oct 2026.

**What must be true when fixed:** after a relink, every plate that used the ingredient, by kid or by bare pid, costs off the new product; "Used in" counts both arms or says which it counts; the modal copy is true. The fix is a one-off heal that rewrites a bare-pid line to `{kid,qty}` wherever exactly one kitchen ingredient owns that pid, one `dbPushPlate` per touched plate, logged as one `menu_change_log` entry per plate so the Dashboard can show it. Lines whose pid no ingredient owns stay bare and are listed for Max (they are the 13 stale ones; the heal must not guess). `loadPlateState` (`:9307` region, grep the name), draft resume and `saveCurrentPlate` (`:3139`) keep resolving legacy shapes, per Tier 2.

**Test that pins it:** extract `lineProduct`, `costDetail`, `costFromLines`; seed P1 cpbu 1, P2 cpbu 2, K1 owning P1; plates `[{kid:'K1',qty:10}]` and `[{pid:'P1',qty:10}]`; move K1 to P2; both cost 20 after the heal (today the second returns 10). `tests/king-rows.test.js:70-79` pins the opposite today and is rewritten, not deleted. Add `lineProduct` and the heal to `tests/mutation/targets.js`.

**Do after:** nothing. Step one is the repro on staging with the `03` seed. Rehearse the heal on staging against a real export before production; it writes `plates` rows, so it is Max's go on the day (a rewrite of production data).

## blocked  17 · The invoice parser prices by repetition and position, never by arithmetic, and is wrong on every Supplier B line  **[A, 36 of 41 real lines silently wrong, measured 8 Sep against six real invoices]**

⚠️ **Blocked on: MAX PUTTING THE PARSER-REGION REVERSAL IN WRITING — one sentence, either way.**
**The heading MOVED from `next` to `blocked` on 9 Sep 2026 by batch 240 (AUDIT-v197 finding C1), and which one moved is stated here because the queue's own header rule requires it: the SAFER of two disagreeing readings wins.**
Four documents held three positions. `CLAUDE.md` Tier 1 says *"never edit anything inside it"* and names four functions as never-touch; `docs/QUEUE.md`'s standing rules say *"protected parser region untouched"*; this file's owner-override block says the protection **is lifted**; this file's own Tranche 0 lists *getting that reversal in writing* as still outstanding; and `docs/QUEUE-GROUPS.md` blocks G2 on it, writing down the exact failure — *"`/batch` … takes an item whose entire premise is a reversal that may not have been written yet, and edits the protected parser region without authority"* — and then left the heading saying `next`, which is the one thing that would have prevented it.
**A heading is what `/batch` acts on, and the promotion rule copies headings VERBATIM.** So this item, graded A and marked ready, was one group-promotion away from having the loop edit the protected region on the strength of a chat summary nobody had written down. That is not a hypothetical: **the region has already been edited once**, in batch 197, and `docs/MAINTENANCE.md` has been asking whether that edit is ratified since 28 Aug 2026, through two audits.
**Why this one is Max's and cannot be taken under standing authority:** the protection is a decision he made himself, and `CLAUDE.md` reserves reversing his own calls to him however good the reason. Recording a reversal he has already made is documentation and would be mine — but the only evidence is a batch's summary of a chat, and *chat cannot see this repo* is this project's oldest rule about exactly that class of claim.
**What his sentence settles, in one go:** whether `CLAUDE.md` Tier 1 and `docs/QUEUE.md:35` get edited under standing authority, whether batch 197's edit is ratified, and whether G2 can be promoted at all. **If the answer is no, this item stays blocked and the parser fix needs a design that works from outside the region.**

**Source and evidence:** `docs/audits/PARSER-AUDIT-2026-09-08.md` (read §1, §5, §6, §7 before planning). `spike/parser-audit/proposed.patch` applies clean to `main` at the time of the audit and passed the suite at 1876 on the day it was generated (the suite is 1915 at v197, so regenerate rather than trusting that number); regenerate it with `spike/parser-audit/apply-patch.js` if `js/app.js` has moved. The harness `spike/parser-audit/run.js` scores 130 lines: shipped 53 right / 67 silent-wrong; patched 127 / 2.

**Mechanism, one cause with fourteen faces.** `firstPairPrice` (`js/app.js` ~10620, grep) takes the first adjacent pair of equal amounts as the pack price and `parsePdfLine` (~10768) falls back to the LAST amount, the line total; neither consults the quantity. Supplier B prints Ordered and Shipped as equal numbers, so the quantity becomes the price (chips at $0.25/kg for $2.46, and the stored price tracks the order size). Every template with a quantity column and no repeated price column (Xero, MYOB, Square, PFD-style, supermarket, market docket) is priced from the total.

**Instances, each with the fix in the patch and the test that pins it:**
- **D1 price by arithmetic.** New `lineColumns(line)`: for each amount P find a bare q to its left and T to its right with q x P = T (one cent per unit of q); prefer `$`-marked P, nearest q, rightmost P; skip `1 x 1.00 = 1.00`. Nothing adds up → the old pair rule, then a single amount, else `needManual` rather than the total. Test: `tests/parser-columns.test.js` (chips 29.50 qty 3 ctn; bacon 12.20 qty 25 kg, not 25.00; Supplier A buns 52.12 qty 4; the `$` preference and the degenerate skip; yoghurt discount line → null; end to end chips 2.4583/kg, bacon 12.20/kg, chicken 8.90/kg, flour 1.00/kg with `basis.kind==='columns'`; a two-amount line with no arithmetic is `needManual`, never priced from 152).
- **D2 kg quantity read as pack weight.** Pack weight and count are read from the NAME with the quantity removed, never the raw line; a kg or L quantity column returns the price per that unit. `invFixRow` reads `row.basis` and steps aside for column-priced rows.
- **D3 multiplier after the weight.** `packWeight` multiplies by an `x N` or `N units` immediately after the weight (`2.26KG X 6` = 13.56; `700G/UNIT 6 UNITS/CTN` = 4.2; a bare following number is not a multiplier). Test: `tests/parser-suffix.test.js`.
- **D4 wrapped descriptions.** `pdfTextToRows` splices one short money-less continuation (no summary word, no column word, no page marker) into the row's name ahead of the money and re-parses; `raw` stays the first line (it is the supplier-memory key), `cont` records the join. Test: `tests/parser-wrap.test.js` (patties → one row at 13.764/kg; banner, summary, `Page 2 of 3` and money lines are not joined; a continuation never joins a row that did not parse).
- **D5 negative lines priced as purchases.** `moneyMatches` records `dollar` and `neg`; any negative amount → `needManual:true, uncertain:true`, `unitPrice` null. Test: `tests/parser-credit.test.js`.
- **D6 stray `*` is a multiplier.** The multiplier in `packCount` must be followed by a digit; `pack`, `pk`, `pkt` become count words. Test: `tests/parser-count.test.js` (`6PK 1 @` = 6; `9.00 *` = null).
- **D7 dozen loses to a weight.** A dozen or pack count in the pack text is tried before the weight (eggs line 0.325/ea; `48 pack … 62.40` 1.30/ea). The bare `105S` form keeps today's precedence because `tests/inv-chain.test.js` pins it; see the residual below.
- **D8 "GST (included)" not detected** (`invGstDetect`, `js/app.js:10464`, outside the region). Accept `gst (incl…)`. Test: `tests/invoice-gst.test.js`.
- **D9 candidate ties go to catalogue order** (`rankCandidates`, ~10558). Break a coverage tie on overlap count, then product size. Test: `tests/inv-match.test.js`, with the wrong product listed FIRST in the fixture (roster 184(b)).
- **D10 supplier detection returns a field label** (`invSupplierDetect`, `js/app.js:4389`, outside the region, NOT in the patch): strip a trailing `TAX INVOICE` from a letterhead candidate before the 42-character test; skip any header line shaped `Label: value`. Test: `tests/inv-supplier-detect.test.js` (Supplier B letterhead → the business name; `Credit Terms: 7 Days` alone → `''`). Existing taught packs keyed under the wrong label need `tidySupplierMemMigration`'s re-key pattern.
- **D11 the 236/237 container list is narrower than the fold** (`invFixRow` anchor vs `packWeight` chain). Moot once the parser knows the quantity; keep the fixture (`4 BAG Pork Belly Sliced 2kg 31.00 31.00 124.00` → $15.50/kg).
- **D13 line discounts** become loud (`needManual`), not right. **D14 fuel levy** stays one review row per Supplier B import unless a name whose non-numeric tokens are all exclude words is dropped.

**Existing tests the patch rewrites, and why:** five in `tests/inv-row-fix.test.js` asserted a PRECONDITION of the old mechanism ("the parser alone is an order of magnitude out") rather than the outcome; each is rewritten to pin the price or the flag, with the reason at the site. One fixture (`Beef Mince 2 x 6 x 1kg 60.00 60.00 120.00`) contradicted itself and uses a 60.00 total. The two "real Bidfood fixtures" in `tests/inv-row-fix.test.js` and `tests/parser.test.js` carry the UOM mid-line, which is not where `extractPdfText` puts it; note that at the fixture rather than fixing it here.

**The mutation gate.** `invFixRow`'s A and B branches are unreachable for any column-priced row: 8 new survivors on the patched copy. Retire the branches honestly (`invFixRow` becomes "step aside when the parser knew the quantity, else the pair-path fold check") with pair-path fixtures that still reach the fold check (`2 CTN Beef Mince 6 x 1kg 60.00 60.00 130.00` must flag), or write allowances with reasons. Add `parsePdfLine`, `lineColumns`, `packWeight`, `packCount`, `moneyMatches`, `firstPairPrice` and `rankCandidates` to `tests/mutation/targets.js` with the files above. None has ever been asked the question.

**The regression net for the whole region:** `tests/parser-corpus.test.js` runs `run.js`'s `scoreCase` over `spike/parser-audit/fixtures` and asserts `silent-wrong === 0` and `leaksUnflagged === 0` per case, with the two known residuals allowed BY NAME (fake-04 units-vs-weight with no unit word; fake-06 line discount). Move `run.js` under `tests/` or require it from there. ~~Add `spike/` to `.vercelignore` in the same batch: it is not there today, so the spike directory is served from the production origin.~~ ✅ **ALREADY DONE, and the sentence was false when AUDIT-v197 checked it (9 Sep 2026).** `spike/` is TRACKED (`git ls-files spike/`) and `.vercelignore:33` lists it, with a comment dated the day of the commit that first tracked it. **The dangerous half was not the wasted work but the wrong conclusion it invites** — a batch reading this would believe the production origin is exposed and go looking for a leak that is not there.

**Behaviour changes a user will notice, stated so they are not filed as bugs:** a Supplier B import goes from zero pre-ticked rows and a wall of price-jump flags to mostly pre-ticked rows; a credit note shows every credited line as a review row with no price; a line the parser cannot add up says "type the price" instead of showing a wrong figure; Supplier B bread and patties show a joined name.

**Follow-up filed as item 37, not here:** `packPriceOf` (~10632) carries the same rule into `derivePackPrice`, `applySupplierMemory` and `resolveMatchedPrice`, so a taught pack still divides the parser's old price choice until it too reads `lineColumns`. That is the HANDOVER-197 "formula written four times" thread, now measurable.

**Do after:** nothing. Handover must carry the `--products` run: pre-tick count and pre-ticked-wrong count, before and after. Then `docs/PHONE.md`: import one real Supplier B PDF and read the review screen.

## next  18 · One mispriced dish rewrites every headline, rescales the chart, and leaves a permanent history point  **[A, a $0.01 typo took production to 354.4%, "324.4 pts over target", and a 380% axis, measured 8 Sep]**

**Mechanism.** `avgFoodCostForScope` (`js/app.js:4226`) is the mean of per-dish `cost/price` ratios with no bound; a dish at $0.01 contributes 30000% and one row moves the mean by hundreds of points. `logHistory` (`:4291`) appends that mean to `priceHistory` and `dbPushHistory`, and `logAllMenuPrices` appends per-menu points; nothing can delete either. `trendChart` (`:5724`) scales its y-domain to the data, so every real week flattens. `computeInsights` (`:6655`) feeds the same figures to `api/insight`, which then phrases "swings 20000-30000%" and "Uncategorised sits at 958%". The menu pill, the sidebar badge and the Dashboard headline all read the same number (consistent, and consistently wrong).

**Instances measured:** menu pill "30000.0%"; headline 354.4% and "324.4 pts over target"; sidebar badge 354.4%; chart axis to 380%; Gemini "Needs attention" copy; a `price_history` row at 354.4 (Tranche 0 deletes it).

**What must be true when fixed:** a dish whose food-cost ratio is over a sane bound (300% is the audit's suggestion; write the number once as a constant with the reason) is excluded from every mean, from the history point, from the insight facts and from the "over target" count, and is listed on its own Dashboard row as "check the price" naming the dish; the chart's y-domain never exceeds 100% (a point above it is clipped and marked, not scaled to); and a `price_history` / `menu_price_history` point can be deleted or re-written from the app by the owner (Settings → Data is the natural home; it is a Supabase write, so a `pushWrite` helper plus RLS already scopes it to the tenant). Keep the target-anchored colour rule (`CLAUDE.md` Tier 1) untouched.

**Test that pins it:** with the $0.01 dish present, the headline is within 0.5 pts of its value without the dish; the excluded dish appears in the "check the price" list; `logHistory` does not push a point whose value moved because of an excluded dish; the chart domain caps at 100. Add the bound to `tests/mutation/targets.js` alongside `avgFoodCostForScope`.

**Do after:** nothing. Item 23 (which average) rides this batch's file.

*(By reference: **13** and **14**, both A, stay next in `docs/QUEUE.md`'s order and are worked as written there. 14 is the only confirmed one. Item 40 rides 14's migration. Then **15**, B, as written; item 25 rides the same file.)*

## next  19 · A misc cost accepts a negative number and the plate saves at a negative cost  **[B, a plate at minus $2.00 persisted to production on 8 Sep and lowers every average it is in]**

**Mechanism.** `setMiscCost` (`js/app.js:1777`) is `parseFloat(v)||0` with no sign guard; the input at `:1767` carries `min="0"` which the browser does not enforce on typed values; `saveCurrentPlate` (`:3139`) writes whatever `plate` holds; `avgFoodCostForScope` (`:4226`) includes any `d.cost>0` plate, so a plate whose total is negative is excluded there but a plate whose misc line merely drags it down is not. Quantity is already clamped to 0 (keep that).

**What must be true:** a misc cost is `>= 0`, or is explicitly a credit and rendered as one; `saveCurrentPlate` refuses a negative plate cost with a message; nothing in the averages consumes a negative line. **Test:** `tests/plate-draft-save.test.js` gains the negative-misc case (extract the real function; the mutation target already exists for the draft contract).

## next  20 · A failed `menus` read is treated as a valid boot and mints a menu the server never had  **[B, unmeasured; presents as "my dishes disappeared", then as a failed publish]**

**Claim (blind audit #6, unverified):** `menus` is excluded from the fatal bootstrap-read check in `bootstrapSync` (`js/app.js:1174`, grep the fatal-read list); on a transient failure of that one request boot proceeds, `ensureDefaultMenu` (`:2840`) unshifts an in-memory "Original menu" with a fresh `uid('MENU')`, existing `menu_items` stop matching any menu, and the publish guard (grep `menusList.length` near `submitMenuItem` / `publishPlan`) sees a non-empty list, skips the create path, and a write with the fictional id hits the FK. The comment at the publish guard says a non-empty `menusList` means server menus, which is false on this path: **fix the comment in the same change as the behaviour.**

**This does not contradict the standing rule** that `ensureDefaultMenu`'s gate lives at its call site and a successful EMPTY read must be respected. It is the third case, a read that FAILED, which a two-valued gate cannot express (the 185 family).

**What must be true:** a failed `menus` read is a failed boot (join the fatal list) or is retried, never an empty menu list. **Test:** `boot-gate.test.js` gains `menus` as a bootstrap dependency; `menu-default.test.js` gains the failed-SELECT path it never exercised (the reviewer called it an expensive green test). Step one is the repro; "it does not reproduce" deletes the item and says so in the handover.

## next  21 · Success is announced, and history is logged, before the write that justifies it has settled  **[B, unmeasured; a false completion message and a history point for a price that never landed]**

**One mechanism, four instances.** A UI or a log commits to an outcome without awaiting the `pushWrite` promise that decides it. `pushWrite` returns its settled promise (`CLAUDE.md` Tier 2) precisely so that a dependent step can wait.

- **Invoice Apply** (`applyInvoice`, `js/app.js:12065`; blind audit #7): the applied count increments synchronously, bookkeeping is written, the dialog closes and "Invoice imported" renders without awaiting the product upserts. Later failures toast, so it is a false completion rather than silent loss. What must be true: the completion toast waits for the upserts and says how many landed; a rejected write leaves the row unticked with its error. Test: `inv-unit-rebase-apply.test.js` gains a case whose writes reject after Apply.
- **`logHistory` on dish and plate paths** (blind audit #8; dish mutation ~`:1751-1767`, plate save `:3167`, history persistence `:4291-4313`): the history point is pushed regardless of the entity write. The ingredient-price path already gates on the product write (PR #244) and is the pattern. What must be true: no `price_history` / `menu_price_history` / `menu_change_log` point describes a write that failed. Test: assert the point is pushed only after the entity write resolves without `{error}` (the existing tests prove the call happens, which is the weakness the reviewer named). `menu_change_log` records what MAX did and must not blur with supplier drift.
- **`doDeleteMenu`'s unawaited dish deletes** (`docs/MAINTENANCE.md`): the change-log entry chains off the write that decides the menu is gone; no FK to violate (SET NULL), same class as the v112 sequencing fixes.
- **`priceHistory` wholesale replace at boot** (`docs/MAINTENANCE.md`): an empty or filtered server response replaces local; `menuHistory` merges. A point logged offline is lost at next sync. Make it merge like its siblings or say at the site why not.

**Do after:** 20 (its fictional menu is the deterministic failure trigger for the dish path; reproduce that first and this may fall out of it).

## next  22 · Nothing records when or how a price last moved: "Last change" ignores relinks, `price_as_of` is never written, an import leaves no change-log event  **[B, the column reads a dash on 163 of 163 ingredients, including one whose unit cost doubled that minute]**

**Measured 8 Sep (persona §7, §9):** K0164 relinked from $10/kg to $20/kg and the Ingredients "Last change" column stayed a dash; a manual product price edit logs to `ingPriceLog` but leaves `price_as_of` empty; all 428 products have `price_as_of` null (`js/app.js:410` and `:439` round-trip it; nothing writes it); `menu_change_log` holds 0 invoice events while the Invoices screen prints "Prices last updated 29/08/2026", so the only record of that import is one date in `app_settings.last_invoice_import`.

**Sites:** the three repoint sites (`js/app.js:5269`, `:12168`, `:12213`), `setProducts` (`:1510`, the one writer of `ing_price_history`), `applyInvoice` (`:12065`), the two "Last change" column renderers (`:4638` Products, `:4884` Ingredients).

**What must be true:** the Ingredients "Last change" reflects the ingredient's unit cost changing by ANY route (relink included), or is renamed to say it is the product's invoice price; every price write stamps `price_as_of`; an applied invoice writes one `menu_change_log` event (supplier, line count, changed count) so the Dashboard's since-line and Recent changes can show it. Keep the five-series separation: an invoice event is a record of what Max did (applied), not a price series.

**Test:** relink K1 from P1 to P2 and assert the Ingredients row's change cell is non-empty; `setProducts` with a price patch sets `price_as_of`; `applyInvoice` with two accepted rows logs one change event. Add the writers to `tests/mutation/targets.js`.

**Do after:** 16 (the relink heal changes which plates a relink touches). MM-4's weekly page needs a date per price, which is this item.

## next  23 · The Dashboard headline does not say which average it is  **[B, 25.0% (mean of ratios) against 26.4% (ratio of sums) on the same data; "5.0 pts under" becomes 3.6]**

`avgFoodCostForScope` (`js/app.js:4226`) is the mean of per-dish ratios, and the tile, the Menu pills and the sidebar badge all agree, so this is an unstated method rather than a contradiction: a $0.36 Pineapple Fritter weighs the same as an $18.84 Ocean Bounty Box. **What must be true:** the tile names the method in a few words ("average of dish food costs"), the weekly page (MM-4) uses the same one, and the choice is written once in `CLAUDE.md` beside per-publication counting. **Test:** `tests/dashboard-*.test.js` asserts the label text is present in the hero and the KPI strip. **Do after:** 18 (same function).

## next  24 · The insight validator can be satisfied by the wrong sentence in three ways  **[B, a phrasing can drop the template's numbers, name a different product, or be about a word in the boilerplate]**

**Mechanism.** `api/_insight.js` compares a candidate against the deterministic template by figure order and symbol, and requires names to be present; it cannot see omission, and "present" is a substring-with-leading-boundary test.

**Instances:**
- **Numbers can be dropped** (blind audit #11, unmeasured): the number skeleton is only required to be a subsequence, so "Beef is the main pressure point" passes against "Beef, up 18% across 5 plates, is most of it". `tests/api-insight.test.js:89-94` checks the prohibition WORDING in the prompt, not the validator (roster 183(a)). The implementation's own comments admit omission is permitted, so this is also a comment/behaviour disagreement; the honest fix may be to require the full skeleton, or to correct the prompt and the test. Decide, and pin the decision.
- **A name that is a prefix of a longer name** (`docs/MAINTENANCE.md`, wider of the two): `Rice` matches inside "Rice Noodles", so a rephrasing can name a different real product. Not fixable by a trailing boundary ("Tomatoes" must still match `Tomato`; `tests/insight-parity.test.js` pins both halves).
- **A name that is an ordinary word in the family's fixed prose**: a plate named "Point" against "within half a point of your target". Same fix as above.
- The real fix for the last two is the same: builders publish WHERE a name sits (an offset or a marked slot) rather than only what it is, across all eight families. No denylist (roster 190).
- **Instrument the reject rate** (`docs/MAINTENANCE.md`): count validated vs rejected phrasings in `api/insight.js` over a period of real use before anyone argues from the hand-measured 4-of-10; a reject is not free, the POST has already left.
- **A plate name containing a digit** ("Pizza 4 Cheese") fails the number validator and never gets the warmer wording; safe, and worth one exemption for digits inside a name the facts already carry.

**What is deliberately NOT here:** the inverted RECOMMENDATION gap (`docs/MAINTENANCE.md`, blind audit #10) stays pinned as a known residual in `tests/insight-parity.test.js`; it needs intent comparison, which the app refuses to let a model decide.

**Test:** for each of the three, one case that today passes and must fail, in `tests/api-insight.test.js` / `tests/insight-parity.test.js`, run on the shared validator so client and server cannot drift.

## next  25 · The food-cost target is an integer in one place, a decimal in another, and a float in a third  **[C, a fractional target is loadable and renderable but not settable, and the first Settings touch silently rounds it]**

`setCogs` (`js/app.js:2936`) rounds to an integer; `bootstrapSync` (`:1174`, grep `food_cost_target`) accepts any `parseFloat` in `[1,99]`; `fmtTargetPct` renders one decimal. Decide which is right and make the three agree. **Rides 15** (same function, same batch); a test pins the chosen precision through all three.

## next  26 · A $0.00 invoice line means two different things to two functions on the same import  **[C, `invDerivePackQty` derives no pack from a freebie while `applySupplierMemory` stores a price of zero]**

From `docs/MAINTENANCE.md`; the pin in `tests/supplier-memory.test.js` is deliberate and is not the answer. Decide once whether a $0.00 line is price information; make both functions say it; rewrite the pin and the allowance in `tests/mutation/targets.js` to match. **Do after:** 17 (the patch makes negative lines manual; a zero line is the neighbouring case and should be decided in the same frame). `applySupplierMemory` is one of the four named functions the owner did not reopen; if the answer lands there, say so in the handover rather than editing around it.

---

# The path to the practice offer: harnesses and the margin monitor

## blocked  27 · A staging test account exists outside the repo, and anything that needs a signed-in session can run  **[B, 14 screenshot tests skipped since v162 and no persona journey can start]**

Blocked on: **Max creating the account** (Tranche 0). Then the batch: `tests/visual/_boot.js` reads `STAGING_TEST_EMAIL` / `STAGING_TEST_PASSWORD` from the environment (186 already added `auth` to it); `tests/visual/screenshots.spec.js:32` un-skips when both are present and stays skipped with its current message when they are not; `tests/persona/` is created with one smoke spec that signs in on `/?env=staging` and reads the café name. CI keeps running without the secrets (the spec must skip, not fail). Never a committed password; `.env` in `.gitignore` first.

## next  28 · Persona harness, café manager: relink, invoice rise, pack change, every affected plate re-costed  **[B, the margin monitor's promise pinned end to end]**

`tests/persona/manager.spec.js` against `/?env=staging` with the `03` seed. Journeys (persona audit §3): cost a new plate from the catalogue; add an ingredient and use it in three plates; relink it to a dearer product and assert all three moved; import an invoice with a price rise and a pack-size change and assert every affected plate; set a target and check suggested prices; delete a used product (refused); edit on the phone breakpoint with a draft open; go offline mid-save; refresh mid-import; GST-inclusive and exclusive prices for one supplier; a quantity-first carton line and a trailing net-weight line. Each journey ends in an arithmetic assertion over every plate touched, counted not sampled. **Do after:** 16, 27.

## next  29 · Persona harness, bookkeeper: two cafés, one login, nothing of A visible or written in B  **[A, the practice model is one login across several client cafés]**

`tests/persona/bookkeeper.spec.js`: create café A; be invited to café B; accept; nothing of A shows in B (13); hold two pending invitations and accept the intended one (14); process invoices for A then switch to B in one session, import one, read B's `supplier_phrases` (13, half two); try A's plate id in B's URL and A's draft in localStorage (item 39); have a cost write refused by the server and read what the client shows (15); revoke own membership mid-session. Pins 13, 14 and 15 from the outside whatever their inside fix was. Needs a second account; the invite flow can create it. **Do after:** 13, 14, 27.

## next  30 · Margin monitor MM-1: extraction spike  **[A for the practice offer; without it there is no sample page for any practice that replies]**

`spike/extract.py` + `spike/score.py` over `spike/invoices/` (20 mixed-supplier PDFs; a practice's forwarded bundle first, Scoopy's as fallback: the persona audit found zero invoice events on production, so the venue's own data cannot prove step 2), truth JSON for five, pytest asserts pass on the five, prints subtotal-reconciles count out of 20 and the three worst mismatches. Stops when the number is known. Spec: `brain-ops/projects/ezplate/2026-09-07-claude-code-handoff.md`. Kill line: 13 Sep, under 16 of 20 re-plans. The parser audit's six real invoices and their truth files (`spike/parser-audit/real-truth/`) are a head start of six. Python and pytest are new dependencies of the SPIKE, not of the app; say so in the handover. **Do after:** 17 (the app parser and the spike extractor should be scored against one truth format, or two parsers will disagree about the same invoice).

## next  31 · MM-2: intake  **[A, "forward invoices" is the offer and this is the forwarding]**

Gmail IMAP mailbox with an app password, `invoices+<client>@` plus-addressing per client, nightly GitHub Actions cron 01:30 AEST, attachments to Supabase storage `<practice>/<client>/<yyyy-mm>/`, dedupe on (supplier, invoice number), mark read. Credentials are Actions secrets, never the repo. **Do after:** 30.

## next  32 · MM-3: mapping with a confidence gate  **[A, a wrong link produces a wrong page to a bookkeeper]**

`invoice_lines` → ingredient per client; exact match auto-links; fuzzy proposes with a score; `unmatched` stays visible; nothing below threshold changes a price. D9's tie-break (item 17) is the same question one layer down. **Do after:** 31.

## next  33 · MM-4: recost and the weekly page  **[A, this is the product]**

Latest unit price via pack size → ingredient → every recipe recomputed → GP vs last week and vs target; one HTML page per client per week, five sections, an empty section prints one line, signed URL. Uses the average named in 23, a date per price from 22, and the bare-pid heal from 16, or it prints the wrong page. Misc lines: 62 plates carry an unlabelled fixed misc line ($0.50 x46, $0.20 x11, $0.10 x2); the page treats misc as fixed cost and says so, or item 69 labels the convention first. **Do after:** 32, and 16, 22, 23.

## next  34 · MM-5: Monday send  **[B, for one practice he can email the page by hand]**

Resend or Postmark, 06:00 AEST, body is the five sections plus the link, a `practices` table for name and logo, idempotent per (client, week). **Do after:** 33.

## next  35 · MM-6: watchman on the nightly output  **[B, a silent night must be red by morning]**

Point the existing watchman at the nightly output directory; a missing or empty output for a client with mail is an alert. **Do after:** 31.

## next  36 · MM-7: two-client isolation test  **[C until a second client exists, then A]**

Two clients, two mailboxes, one run, zero cross-contamination in storage paths, mapping rows and pages. Promote to A on the second client. **Do after:** 33.

## next  37 · The parser corpus becomes the standing eval: real corpus outside the repo, per-supplier onboarding, the second reader replayed offline, and `packPriceOf` on the same arithmetic  **[B, without it the next parser change is judged by one invoice looked at]**

- **Where the real corpus lives:** outside the repo in the owner's own folder (the extracted text carries the café's details); the truth files are committed (`spike/parser-audit/real-truth/`), the text is regenerated from the PDFs by `spike/parser-audit/extract-pdf.mjs` (needs `pdfjs-dist@4.10.38` from a directory outside the repo via `PDFJS_DIR`). Write the procedure into `docs/STAGING.md` or a `docs/PARSER-CORPUS.md`: each new supplier gets one invoice extracted, one hand-written truth file, and its score in the handover.
- **Two numbers per parser batch:** silent-wrong on the real corpus and on the synthetic set, before and after; a change that moves either the wrong way does not ship.
- **`packPriceOf` (`js/app.js` ~10632) routes through `lineColumns`** so a taught pack and supplier memory divide the price the parser chose (HANDOVER-197's four-copies thread; two of the four copies are `derivePackPrice` and `applySupplierMemory`). Measure that the four are identical before merging them.
- **D12, the extractor never sorts a line's items by x** (`extractPdfText`, `js/app.js:10214`): sorting by `transform[4]` within a y-group puts the UOM word where it prints; do it only with the corpus in place and show whether any real invoice changes.
- **The second reader:** store real Gemini responses for the corpus and replay them offline (the original `docs/MAINTENANCE.md` requirement), so the `--products` pre-tick numbers include what the referee does.
- **Residuals to decide, both in the fixtures:** units-vs-weight with no unit word (needs a header-driven column model; the next thing this harness should build) and a container capacity beside a bare count (`750ML 500S`; making the bare `NNNs` count beat the weight changes the `105S` reading `tests/inv-chain.test.js` pins).

**Do after:** 17.

## next  38 · A signed-in caller of the AI endpoints is still unbounded  **[B, C only while the tier is free; the practice offer is a paid tier]**

`docs/GATE-REVIEW.md` gate 5's named residual; `docs/MAINTENANCE.md` says staging is back so it is undone, not blocked. A per-account counter that survives between serverless invocations: a table with RLS like the others, a migration rehearsed on staging per `docs/STAGING.md`, `api/_auth.js` reads and increments it, a refusal returns the same "unavailable" the client already renders. Cheap half needs no code: the Google Cloud spend cap, set the day 2b is taken. **Test:** `tests/api-auth.test.js` gains the over-quota refusal. **Do after:** nothing; must land before 2b, and before MM-3 sends practice data through the same key.

## next  39 · `cafeDB_plateDraft` carries no tenant, so one device's unsaved plate belongs to whoever signed in last  **[B, two accounts CAN sign in on one device since invitations shipped, which is the condition the entry said makes this due]**

From `docs/MAINTENANCE.md`. The exposure is closed (186 asks and discards on switch); what is left is the wrong prompt for the common case. Stamp the draft with its author on write (the `envFence` pattern, one field); the switch keeps a draft whose author matches and ignores one that does not; an absent stamp is kept. **Test:** `tests/plate-draft.test.js` gains the two-account case. Item 29's bookkeeper journey reads it from outside.

## next  40 · `claim_business_invite()` and `business_team()` are callable by `anon`, and both files say otherwise  **[C, neither is a hole; the stated mechanism is wrong and the fix is two lines]**

```sql
revoke execute on function public.claim_business_invite() from anon;
revoke execute on function public.business_team()        from anon;
```

**Rides 14's migration** (it must replace `claim_business_invite` anyway; find the newest definition by listing the directory, never from a header). Verify from `pg_proc.proacl`, not the file; `get_advisors('security')` lint `0028` should stop naming both. `invite_pending`, `current_business_id`, `current_business_role`, `set_member_role` are NOT in scope, each for the reason `docs/MAINTENANCE.md` gives. **Test:** assert the revoke by name in the newest migration (roster 190).

## next  41 · Nothing records that a user accepted the privacy notice  **[C, becomes B the day 2b ships, because the notice reverses in the user's favour and nobody can be re-asked]**

From `docs/MAINTENANCE.md`: a `privacy_accepted` setting via `dbSetSetting` carrying version and ISO date, set on the first successful boot after sign-up (never at sign-up: no session exists); a version constant beside the notice; a re-prompt when the stored version is older. `app_settings` is a JSON blob so no migration, but read `CLAUDE.md`'s backup-format carve-out before adding the key. **Do after:** nothing; must precede 2b.

## next  42 · Drop `invite_pending` once no cached client calls it  **[C, the only deliberately unauthenticated endpoint, and its last caller is gone since v178]**

`docs/GATE-REVIEW.md` gate 6. The drop must follow the client, never lead it: a cached pre-v178 client refuses sign-up on an unreadable answer. Take it once v178 has been live long enough (measure: the service worker's `activate` has had weeks; the persona audit dates self-service signup at 30 Aug). One migration, with the grant reasoning in `20260814_invitations.sql`'s header struck rather than deleted. Could ride 14 or 40's migration if the date allows.

## next  43 · There is no inventory of the settings this app depends on that live outside the repo  **[C, the Site URL default cost a real stranger their sign-up and nothing in the repo could have seen it]**

From `docs/MAINTENANCE.md` (batch 238): one file, `docs/EXTERNAL-CONFIG.md`, listing every setting not in git: Site URL and Redirect URLs (both projects), leaked-password protection, `GEMINI_API_KEY` in Vercel, the staging env vars from 27, the Actions secrets from 31, the Google Cloud spend cap; for each, where it lives, what it should be, how to check it by hand, what breaks silently when wrong. A checklist, not a mechanism. Staging almost certainly carries the same Site URL default and nobody has looked.

## next  44 · Exploratory pass protocol  **[C unless a finding reproduces in a script]**

A `docs/briefs/` file with the two personas, the one instruction ("make a number wrong without the app telling you"), the persona audit §3 checklist, the ZZ-AUDIT write rule (writes only to objects so named, on staging never production), and the rule that a finding is C until a script reproduces it. Run by hand after each deploy version, not CI. The 8 Sep passes' "tried and held" list (persona queue) is the first appendix so nothing is re-tested next week.

## blocked  45 · Google sign-in  **[C, email and password work; it needs a credential no code can create]**

Blocked on: **Max pasting a Google Cloud OAuth client id and secret into the Supabase dashboard.** Then `signInWithOAuth({provider:'google'})` behind ONE shared handler on the boot gate's sign-in screen and the Account card (186's pattern for the password form). From `docs/MAINTENANCE.md`.

---

# B polish, grouped by mechanism

Every item here is something a person sees. Where Max deferred a row on 3 Sep (ui-audit R8, R10, R11, R13, R14, R15, R16), including it below is a re-ask under override 3, and it says so; his call stands until he changes it.

## next  46 · One verb per intent: five save verbs, three delete verbs, two import verbs, and a button whose label is a noun  **[B, a Stripe-grade app has one word per action]**

**Mechanism:** every modal footer and header action was labelled at the batch that built it; nothing shared the vocabulary. Decide the table once and apply it in one pass; keep commentary in the handover.

**Save / create verbs (UX U18), sites in `index.html`:** `#saveBtn` "Save plate" (`:448`) and `#bldSaveBar` "Save plate" (`:494`); `#mSave` "Add new product" (`:1215`); `#menuSave` "Add to menu" (`:1271`); `#addDishSave` "Add to menu" (`:1412`); `#newMenuSave` "Create menu" (`:1437`); `#editSave` "Save changes" (`:1471`); `#ingSave` "Save changes" (`:1526`); `#kingModalSave` "Save" (`:1555`). Proposed: create is "Add product", "Add ingredient", "Add menu", "Add to menu"; edit is "Save"; the builder keeps "Save plate" only if the two save controls agree.
**Destructive verbs (U18, U19):** `#bldDelete` "Delete plate" (`:474`); `#menuDelBtn` "Delete this menu" (`:612`); `#ed_delete` "Delete item" (`:1472`, an anchor, not a button); `#ingDelete` "Delete" (`:1526`); `#kingModalRemove` "Remove" (`:1555`); `.smem-del` "Remove" (`js/app.js:4380`); `.mm-remove` "Remove" (`:9861`, a dish leaving a menu, which is genuinely a remove). Proposed: "Delete" for the object, "Remove" only for taking a thing off a list it still exists outside of.
**Import verbs (U29):** Products header "Import invoice" (`index.html:672` region, grep `Import invoice`); Invoices header `#invUploadBtn` "Upload invoice" (`:763`) and the modal title `#invModalTitle` (`:1285`). One word.
**A noun for a button (U32):** `#menuAddDishBtn` "Existing plate" (`index.html:536`). Rename to what happens ("Add plate to menu"); placement is item 54.
**Two names for one modal (U8):** the filter's door "✎ Manage list…" (`js/app.js:4549`) opens "Tidy lists" (`:8326`). One name in both places; where the door lives is item 61.

**Test:** `tests/terminology.test.js` gains the verb table as data and asserts every `.mfoot .btn.primary` and every destructive control's text is in it; a new label outside the table fails by name.

## next  47 · One modal footer pattern: Delete left, Cancel and Save right, and the builder's two red verbs told apart  **[B, the same intent sits in three positions and two red-adjacent buttons on one screen mean different things]**

- **Footer placement (U19, ui-audit R11, deferred 3 Sep, re-asked):** Edit product has Delete left in the footer (`index.html:1526`); Edit ingredient has "Remove" left (`:1555`, hidden until editing); Edit menu item centres "Delete item" in `.edit-delete-row` below the footer (`:1472`). One pattern, left-in-footer, and `.edit-delete-row` and `.del-link` come out.
- **Done buttons disagree (U15):** the Manage menus modal's Done is plain while Tidy lists' Done is orange. Plain, since both only close.
- **"Clear plate" beside "Delete plate" (U11):** `#clearBtn` (`index.html:451`, `css/style.css:462` paints it `--bad`) empties the docket; `#bldDelete` (`:474`) removes the plate. Rename Clear to "Start over", move it into the docket header, drop its red, keep Delete alone at the bottom. `js/app.js:9645`'s comment records why Clear exists (the app's explicit discard); keep the behaviour.
- **Sub-44 touch targets on `.del-link` and `.use`** (`docs/MAINTENANCE.md`): the footer rewrite retires `.del-link`; `.use` gets the R5 padding treatment.

**Test:** `tests/visual/` spec asserting each edit modal's footer order and that no `.edit-delete-row` exists; `v192-touch-targets.spec.js` gains `.use`.

## next  48 · Fixed-position popovers inside modals: the supplier "Create new" list renders at the screen's left edge  **[B, 380px from its field at 1360, floating over the sidebar]**

**Measured 8 Sep (persona §8):** `#ig_supDrop` at x=20 while `#ig_sup` is at x=401 in the Edit product modal. **Mechanism unmeasured:** `makeInlineCombo` (`js/app.js:11177`) calls `anchorDrop(drop)` with no anchor and no `portal:true`, so the layer stays inside `.modal` and `fixedContainingBlock` (`:11076`) decides its offset; either the modal establishes a containing block the walk does not detect (`.modal-overlay.open .modal{animation:modalIn}` ends `transform:none`, so check `will-change`, `backdrop-filter` on the overlay, and whether the drop is measured mid-animation) or a stylesheet `left` on `.cat-drop` outranks the inline value. Measure inside the modal before fixing; the builder fix (batch 212/213) is the precedent and its `portal:true` path is the likely answer.

**Every combobox that uses this engine, so one fix covers all:** `#plateCatDrop` (builder, `index.html:464`); `#f_brandDrop`, `#f_supDrop`, `#f_categoryDrop` (New product, `:1206-1208`); `#mi_catDrop` (Edit menu item, `:1262`); `#cat_supDrop` (catalogue importer, `:1366`); `#ed_catDrop` (Edit menu item category, `:1462`); `#ig_brandDrop`, `#ig_catDrop`, `#ig_supDrop` (Edit product, `:1514-1516`); `#king_prodDrop` (New/Edit ingredient, `:1543`, rendered correctly on 8 Sep, from `:5190`'s own path); the per-row `ni_cat`/`ni_brand`/`ni_sup` combos the invoice review mints (`js/app.js:11351-11353`). `reanchorOpenLayers` (`:11168`) re-anchors every open `.cat-drop` on scroll and resize and must keep doing so.

**What must be true:** the popover's left edge equals its field's left edge, and its width the field's width, in every modal above, at 1360 and 390, light and dark. **Test:** a Playwright spec opening each modal, typing into each combobox, and asserting the two rects (no `not.toBe`; the equality is the assertion).

## next  49 · The builder between 768 and 1200 wide: side cards stack at half width, names truncate to seven characters, Save falls below the fold  **[B, the desktop band most laptops open the app in]**

**Measured 8 Sep (persona §7, §8, §9; UX U6):** at 1024 and 900 `.bld-body` wraps and the rail sits under the docket at `max-width:340px` (`css/style.css:937`, called deliberate for the 340 and silent about the empty right half); the wrap point is about 1120 viewport with the 230px sidebar (`flex:1 1 480px` + `1 1 280px` + gap); at 1100 `.bld-band`'s `minmax(0,1fr) 110px 110px 90px 40px` (`:945`) leaves the name about 130px so "Mushroo…", "Bread S…", "Hash Browns" on two lines while the chip keeps 110; at 900 Save plate is below the fold and the mobile save bar is hidden at this width; `.bld-sum{position:sticky}` (`:939`) does nothing once stacked.

**What must be true:** when the rail wraps it fills the row (drop the 340 cap when wrapped, or move the wrap point so 1024 stays two-column); the name track has a 140px floor and the fixed tracks shrink first; below 1024 the summary is full width and a slim sticky bar with Total and Save plate stays on screen (the phone already has one: `#bldSaveBar`, `index.html:494`; show it to 1023 rather than 767). The per-unit qty inputs sit further left than gram-line inputs (persona §9): right-align the input to one edge and let the unit label vary, in the same grid pass.

**Test:** `tests/visual/` spec at 900, 1024, 1100 and 1200: no empty band wider than the gap to the right of the rail; the longest fixture name shows at least 12 characters; the save control is inside the viewport at 900 with a costed plate. Extends `v190-tablet-band.spec.js` upward.

## next  50 · Toasts land on controls: "Loaded" on Clear plate and the misc input, any toast on the builder's Save, a toast on a bottom sheet  **[B, a toast for a non-event sitting on a control, and a real toast hiding the primary action]**

**One mechanism:** the toast docks at a fixed height and nothing else on the bottom stack knows about it. 226 built the answer for the install banner (`--install-banner-clear`, published by the element that knows its own height).

- **Remove the "Loaded: <plate>" toast** (`js/app.js:9475`, `loadPlate`; UX U12): it fires on every open, the breadcrumb already names the plate, and it sat over "Clear plate" at 1024, over "Duplicate" at 900, and over the misc row on desktop. The `loadMenuItem` sibling at `:9412` says something useful and stays.
- **A real-length toast covers `.bfs-save` at 380x800** (`docs/MAINTENANCE.md`, measured 2 Sep: toast x95-285 y617-708 over `.bld-bar` y636-736): `.bld-bar` publishes `--bld-bar-clear` from `renderBuilderCost` and the toast takes the max; never a third hardcoded constant.
- **Toast (z90) on bottom-sheet content and dropdown rows at ≤767** (ui-audit R13, deferred 3 Sep, re-asked): the same clearance variable, or a higher offset while an overlay is open.

**Test:** `tests/visual/226-bottom-stack.spec.js` gains the builder save case (toast rect does not intersect `.bfs-save`); a unit test asserts `loadPlate` no longer toasts.

## next  51 · Builder readiness and copy: Save is live on an empty plate, Print and Clear on an empty docket, an "Editing:" line in the accent colour, a lower-case helper, a grammar slip, and a duplicate line with no warning  **[B, the primary button says nothing about readiness and the screen disagrees with the New ingredient modal's rule]**

- **Save enabled on a brand-new plate with no name and no lines (U10):** `syncBuilderPlateActions` (`js/app.js:9650`) and `updateTotals` (`:1873`) are the two places that know; disable `#saveBtn` and `#bldSaveBar` until a name and one line exist, and disable Print and Clear on an empty docket. The New ingredient modal already disables Save until valid (`#kingModalSave disabled`), which is the rule.
- **"Editing: Big Breakfast" (U13; `docs/MAINTENANCE.md` "the plate name appears three times"):** `#editTag` via `updateEditTag` (`:9308`). Its real job is saved-vs-new; keep that state in a neutral pill and drop the name.
- **Helper "tap a unit cost to edit, the change applies everywhere" (U14):** `index.html:412`, lower case, a device-specific verb, and a dash joining two sentences in user copy. "Select a unit cost to edit it. The change applies to every plate."
- **"1 item have no cost data" (persona §7):** `js/app.js:1882` pluralises "item" and not "have".
- **The same ingredient added twice when the option click and Enter both fire (persona §7):** the add path from `#q` / `#drop` (`:1652-1670`); either merge into the existing line's quantity or warn.
- **The Cost card paints an empty 16px bordered box on the phone for an unpublished plate** (`docs/MAINTENANCE.md`): `#bCost` with all three children hidden below 768; hide the card when it has nothing to show, from JS.

**Test:** `tests/builder-page.test.js` gains the disabled-until-valid rule (extract `syncBuilderPlateActions`); `fresh-states.spec.js` asserts no `#editTag` text contains the plate name.

## next  52 · A missing ingredient in the builder sends the user to another screen instead of creating it in place  **[B, the primary task grows eight clicks and the no-match copy names a "tab" the sidebar does not have]**

`js/app.js:1684`: "No ingredient called “zzqx” yet. Add it on the Ingredients tab, then come back." (UX U3; flow count in that audit: eight extra clicks against one.) **What must be true:** a "Create ingredient “zzqx”" row at the foot of the dropdown opens the New ingredient modal (`#kingModal`) with the name prefilled, and on save returns to the docket with the new line added. The modal already stacks correctly over the builder page (it is later in the markup; `tests/visual/v137-modal-layer.spec.js` is the pattern). **Test:** a Playwright journey: type a name with no match, take the create row, save, assert the line is in the docket and the plate cost moved.

## next  53 · Edit modals hide the number the user is there to react to: the menu item form shows no cost, the product form changes the unit of thought, and money fields do not look like money  **[B, re-pricing is the second most common task and its modal is blind to the one number that decides it]**

- **Edit menu item (U1):** opened from a row showing cost $3.88, suggested $12.94 and 32.4% over, the modal (`#editModal`, `index.html:1440` region; `openEditModal`, grep) shows name, menu, category and price only. Show cost, suggested price and a live food-cost % under the price field, recoloured by the target rule as the user types. This is the same figure `publishPlan` and the Menu row already compute; render it, do not recompute it.
- **New product vs Edit product (U20):** New asks pack size, pack unit, pack price; Edit asks unit type, price per unit, pack size (optional), so 10 kg for $65 reopens as 6.5 per kg with an empty pack. Make Edit mirror New with the derived unit cost read-only beneath. `packToUnitCost` is one of the four untouched functions; the form calls it, it does not change it.
- **Inputs at 31 and 12 where every list shows $31.00 and $12.00 (U22):** `#ig_price`, `#ed_price`, the builder's misc input (0.5 against $0.46). Format to two decimals on open and on blur; store exact (Tier 2 rounding rule).
- **The publish dialog and the Menu row print the same ratio at different precision** (`docs/MAINTENANCE.md`, HANDOVER-125): whole % vs one decimal. Align in the same pass.

**Test:** unit test on the modal's render function that the three figures are present and equal `costDetail` / `publishPlan`'s outputs for the row; `fresh-states.spec.js` asserts the price input reads `31.00`.

## next  54 · The add-to-menu picker lists the 59 plates already on this menu ahead of the 40 that are not, is offered when there are no menus, and sits far from the menu it applies to  **[B, the modal exists to add what is missing and makes the user read past what is there]**

- **Ordering (U2):** `openAddDishModal` (`js/app.js:12559`) renders `#ad_list` alphabetically with the plate's current home as a subtitle. Put plates not on this menu first (or only), dim the rest with "Already on this menu".
- **Offered at zero menus** (`docs/MAINTENANCE.md`; `js/app.js:12509`'s comment covers zero plates, not zero menus): `#menuAddDishBtn` renders and `submitAddDish` would publish with `menuId:null`. Hide the BUTTON at zero menus (not the row; 179 moved that row off `hidden` because it hosts an action), or refuse with a message.
- **Placement (U32):** the control sits in the far header while the menu it applies to is chosen in the row below. Place it at the end of the menu switcher row (its `data-mobile-home="menuSwitchRow"` already puts it there on the phone).
- **"+ Add to another menu" on the builder cost card** (`docs/MAINTENANCE.md`, deferred out of Q6): re-read against F7's page; if it stacks the Manage menus modal over the builder and refreshes the cost panel, it is the same picker and rides here; otherwise record the decline at the site.

**Test:** unit test on the list builder: with plates A (on menu) and B (not), B sorts first and A carries the label; `fresh-states.spec.js` asserts the button is hidden at zero menus.

## next  55 · Recent changes colours a sell-price rise red and never says what changed  **[B, the colour language everywhere else is anchored to the target, so a red plus reads as bad news]**

`recentChangeRows` (`js/app.js:3802`) publishes `delta = costAfter - costBefore` and the renderer colours by sign; a price rise Max made shows "+$5.00" red and a price cut green, the opposite of its effect on food cost (UX U4). **Unmeasured which field the row reads for a `dish_price` entry; grep `costBefore` in `logChange`'s writers first.** **What must be true:** colour by effect on food cost (a sell-price rise is green), or leave deltas neutral; add a one-word kind from `detail` ("Price", "Menu", "Category"), read from `detail` never `kind` alone (Tier 1). **Test:** `tests/change-log.test.js` gains a `dish_price` rise asserting the row's class and kind word.

## next  56 · Dashboard polish: the tablet drops two of three headline figures, the scope button drops its % sign, two cards do not share a bottom edge, chart annotations collide and clip, and the chart does not re-measure on resize  **[B, the count of plates over target is the most actionable number on the screen and the tablet user never sees it]**

- **KPI strip hidden below 1024 (U7):** `.kpi-strip{display:none}` (`css/style.css:5213`) and the hero shows only Average food cost; "Plates over target 18 of 91" and "Not costed or priced" disappear. Show the three as a stacked list under the hero below 1024 (`js/app.js:7119` hero, `:7330` strip).
- **Scope button "25.1" with no % while its popover says "25.1%" (U31):** grep `dash-menus-btn` / the scope button renderer.
- **"What moved" and "Dig in" different heights in one row (persona §9):** align bottoms in the grid.
- **Two delta annotations print on top of each other when markers fall within days; a four-digit annotation ("−329.3 pts") clips at the SVG edge (persona §9):** `trendChart` (`js/app.js:5724`); collide-avoid or drop the second, and clamp the label inside the plot. (The four-digit case mostly goes with item 18.)
- **The chart does not re-measure on resize** (`docs/MAINTENANCE.md`): a debounced `resize` listener calling `repaintDashboardIfVisible()` only when the plot width changed, never mid-scrub, never while hidden; `trendPlotSize` (`:5659`) stays as pinned.
- **`.chart-hint` / `.scope-note` say overlapping things under one chart** (`docs/MAINTENANCE.md`): cut or merge.
- **Dig-in card labels truncate at 768 with free room** (ui-audit R16, deferred 3 Sep, re-asked): rebalance the dig-grid at 768.

**Test:** `tests/visual/` at 900 asserts the three figures are in the DOM and visible; a unit test on the scope button label asserts the `%`.

## next  57 · One casing system and one product identity line: forced capitals in the dropdown, category fields in capitals against title-case lists, placeholders in three styles, a double-spaced category, and a product written four ways  **[B, the same object in two typographic voices one click apart]**

- **Product identity (U17):** Ingredients shows Product, Brand, Supplier; the builder dropdown shows Product only in forced capitals; the docket shows Product, Brand; Products shows Product with Brand as a tag and supplier only through the filter. One line everywhere: Product, then Brand muted, Supplier where known. Sites: `renderKingRows` (`js/app.js:4884` region), the `#drop` option renderer (`:1652-1670`), the docket line (`:1767` region), `renderIngRows` (`:4638` region).
- **Uppercase transform on the dropdown product name (U16):** `css/style.css` (grep `text-transform:uppercase` near `#drop .opt` / `.sug-opt`); drop it for product names, keep it for labels.
- **Category shows DESSERTS / VEGETABLES in the field while lists show Desserts / Vegetables (U21, U39, U9):** title-case at the display boundary, store as-is (the naming inversion is about identifiers; supplier categories are data and a display transform is fine).
- **Placeholders "search suppliers…", "qty", "unit type…" lower case against "Search your products…" (U21):** `index.html:1206-1208`, `:1514-1516`, the builder qty input; capitalise every placeholder.
- **"PACK SIZE (OPTIONAL) E.G. A CARTON OF EGGS = 180" in capitals inside the label (U21):** move the example to helper text under the field.
- **"HERBS  SPICES" with a double space, and a category `<select>` mixing valued and valueless options (persona §7):** the Tidy lists data and `buildCatOptions` (grep); normalise whitespace on save and split option groups.
- **Tidy lists opened from Menu mixes product categories in capitals with plate categories in title case, sorted by product count (U9):** split into Plate categories and Product categories, open on the one matching the launching screen.

**Test:** `tests/terminology.test.js` gains a placeholder-casing assertion over `index.html`; a unit test on the identity-line builder asserts the three parts in order for a fixture product.

## next  58 · Screen subtitles and status copy: the subtitle slot means four things, the Invoices subtitle contradicts its own dropzone, "Recent imports" apologises for its absence, Account and Settings carry roadmap notes, and four copy slips  **[B, the eye learns to read the slot one way and is wrong on the next screen]**

- **The `.scr-sub` slot (U23):** Plates a count (`index.html:303`), Menu a name (`:522`), Ingredients (`:625`) and Products (`:670`) counts, Invoices a promise (`:761`), Settings a save rule (`:818`), Account a status note (`:1034`), Dashboard nothing. Rule: subtitle is scope or count only; sentences move into the body.
- **Invoices: "Imports update product prices automatically" against "Nothing changes without your review" (U24):** `:761` vs `:769`. Subtitle becomes "Imports update product prices after your review."
- **"Recent imports" heading over "EzPlate does not keep a list of past imports yet" (U27):** `:773`. Replace with one line "Prices last updated 29 Aug 2026" and drop the heading until the import-history feature exists (item 87).
- **Ingredients "164 of 399 products have an ingredient" floats detached between header and search (U37, persona §9):** move into `#kingHeadSub` as "164 ingredients, 235 products unlinked".
- **Account: "Sign-in and roles work; billing is still to come" (`:1034`) and the Plan card "EzPlate is not billed yet…" (`:1139`) (U43):** subtitle "Your profile and team"; remove the Plan card until there is a plan; one badge style for OWNER / invited / you.
- **Settings copy (U41):** "System follows your phone's setting" (`:886`) on a desktop → "your device"; "Off = imports stay fully offline" (`:860`) → "Off keeps imports fully offline"; "Version v196" doubles the v (`:989` prints "Version " before `APP_VERSION='v196'`, `js/app.js:7581`); "Account and team" promises billing.
- **`renderManageMenusZero` reports ("No menus yet.") where the written rule says invite** (`docs/MAINTENANCE.md`): one obvious action → invite. Copy is Max's; propose the line in the handover.

**Test:** `tests/terminology.test.js` asserts every `.scr-sub` literal in `index.html` is empty or matches a count/scope pattern; the version string is asserted to render once.

## next  59 · The Invoices screen has no page inset, its privacy line hangs 20px left of the column, and it has two identical doors with a third option hidden in one  **[B, the only screen whose dropzone touches the header bar and the sidebar]**

- **No inset (persona §9):** at 1100 and 1360 `.invz` (`css/style.css:1269`) runs edge to edge inside `#tab-invoices` (`index.html:754`); every other pane carries the 24px inset. Same container padding as `#tab-dashboard`.
- **`.inv-privacy` at x236 while the column starts at x256 (U26):** `css/style.css:3670`; bring it onto the column.
- **Two doors (U25):** the on-page dropzone (`index.html:766` region) and the header `#invUploadBtn` (`:763`) open a modal with the same dropzone plus the only route to "paste text manually". Keep the on-page dropzone, put the paste link under it, make the header button open the file picker directly.
- **`.invz-s` helper at 4.04:1 (ui-audit R9):** rides item 8's token answer (item 66), not a one-off hex.

**Test:** `tests/visual/` spec asserting `.invz`'s left edge equals `#tab-dashboard`'s content left edge at 1360, and `.inv-privacy`'s left equals the dropzone's.

## next  60 · Dates render three ways  **[B, one app, one date style]**

"29/08/2026" in monospace on Invoices (`updateLastImport`, grep), "today" and "6 days ago" on the Dashboard (`relDayLabel`, `js/app.js:3822`), "24 Aug" and "8 Sept" on the chart axis, "August" under What moved (UX U28). Rule: relative under seven days, then "29 Aug 2026" everywhere, one `fmtDate` helper. **Test:** unit test on the helper across the four thresholds; grep asserts no other `toLocaleDateString` call site remains.

## next  61 · Menu screen: chip words and row words disagree, pills wrap and do not truncate, the pill row and the search do not share a baseline, the sticky header has no divider, a command hides inside a filter, and two header buttons are two heights  **[B, the filter vocabulary and the row vocabulary should be the same three words]**

- **Chips "Healthy / Watch / Rework" (`index.html:586-588`) against row verdicts "18.8% ✓", "32.4% over", "41.1% well over" (U30):** `js/app.js:3425-3430` records the split as deliberate and it still leaves nothing on screen mapping Watch to over. Use the chip words in the pill or rename the chips ("Under / Over / Well over"). `marginLightWord` (`:9993`) is the third vocabulary and is answered (F8); do not reopen that one.
- **Menu switcher pills wrap to two or three lines for a long name (U31, persona §8, §9):** max-width plus ellipsis; the pinned header names the menu in full.
- **The pill row right-aligned and wrapping under itself while the search is left (persona §9):** share a baseline; the R4/R7 control-row work is the base.
- **The sticky header overlaps the top row with no divider, so "SNACKS" reads half-cut (persona §9):** a hairline or shadow under `.scr-head` when scrolled.
- **"✎ Manage list…" inside the category `<select>` (U8; `js/app.js:4549`, `TIDY_DOOR`):** a small link beside the filter instead of an option that is a command.
- **`#menuAddDishBtn` 38.5px with 1px border and weight 500 beside `#newMenuBtn` 36.5px with 1.5px border and weight 600 (U33):** one header-action height token.
- **The current menu's name unreadable in the scope select at ≤420 while the % pill has room (ui-audit R15, deferred 3 Sep, re-asked).**

**Test:** `v191-control-rows.spec.js` gains the pill-truncation and baseline assertions; `tests/terminology.test.js` asserts the chip words appear in the verdict renderer's vocabulary.

## next  62 · Plates and Products lists: the Published column wears the action colour on 87 of 103 rows, the subtitle names problems there is no filter for, a remembered search hides a hundred plates, and a long name plus brand truncates to three letters  **[B, colour should mean one thing and a screen that names a problem should give a way to act on it]**

- **Published column in orange accent (U34):** `renderPlatesTab` (`js/app.js:9530` region); default text with a tick or a neutral pill, Unpublished muted.
- **"4 not costed, 12 unpublished" with no filter (U35):** add Not costed and Unpublished chips beside the category filter, the Menu screen's `.mlf-chip` pattern.
- **Search persists across sessions with the header still saying "103 plates" (U36):** clear `#plateSearch` on reload, or show "Showing 3 of 103" whenever a filter is active. Check where the value survives (a `type=search` input's form restoration, or a stored preference; grep `plateSearch`).
- **Products: name and brand both ellipsise in one row (ui-audit R10, deferred 3 Sep, re-asked; persona §9 "acceptable"):** a brand min-width floor, or stack brand under name at 1024.
- **Last change column is a column of dashes, and "Used in" shows a dash for zero (U38):** hide Last change until item 22 gives it values; write "Not used" instead of a dash.

**Test:** `fresh-states.spec.js` asserts the published cell's computed colour equals `--text` (equality, not "not orange"); a unit test on the plates renderer asserts the chips filter.

## next  63 · Settings and Account chrome: a 720px column under a full-width header hairline, theme set in three places, a manifest naming a palette two redesigns old  **[B, the header line changes length between screens and one preference has three controls]**

- **Settings column 720px while list screens are 1084 (U40):** keep the header full width, constrain only the cards.
- **Theme in the sidebar (`#sideThemeToggle`, `index.html:1751`, a noun label with a moon icon and no visible state), in Settings (`:885`), and the system preference (U42):** drop the sidebar button or make it show the current mode as its label.
- **`manifest.json` `theme_color` / `background_color` `#3E2C26` / `#F7F3EC` match neither palette** (`docs/MAINTENANCE.md`): pick the light palette values as the install-time default.
- **Settings, Account and Invoices start flush under the header bar with no top gap; the other screens have one (persona §9):** one top-gap rule for every pane.

**Test:** `tests/visual/` asserts `.scr-head`'s hairline width equals the other screens' at 1360; `tests/settings-toggles.test.js` asserts the manifest colours are tokens' values.

## next  64 · Shell and navigation: the sidebar splits the data chain across a gap, the tablet rail hides four screens behind More with room for eight, the tablet shows a marketing tagline and two stacked headers, and 1920 leaves 500px of dead space  **[B, information architecture should group by kind, not by what fit above the fold on a phone]**

- **Sidebar groups (U44):** top Dashboard, Menu, Plates, Ingredients; bottom Products, Invoices, Settings, Account. Move Products and Invoices up; bottom becomes Settings, Account, Theme. Sites: the `.bottomnav` markup (`index.html:1700` region) and its `@media (min-width:1024px)` rules (`css/style.css:2261` region). Read `js/app.js`'s `TAB_PANES` and the More sub-screen `data-back` wiring first; nothing here renames a `data-tab`.
- **Tablet 768-1023 rail: four items plus More; More is four rows and 900px of empty space; on Products the rail highlights More (U45):** show all eight icons in the rail from 768 and drop the More hub at that width (More stays below 768). Item 70's boot-race entry says Invoices got its route from the More screen; keep the route.
- **Tablet top app bar carries "Plate costing made easy" (`index.html:147`) under the logo, page header beneath it (U46):** drop the tagline in the signed-in shell (`:1699`'s comment says it is already gone from the desktop header; `:141` is the splash and `:988` About, which can keep it); merge the app bar into the page header at that width.
- **1920: content left-anchored, ~500px dead space (ui-audit R14, deferred 3 Sep, re-asked):** `margin-inline:auto` above ~1600.

**Test:** `tests/visual/` at 900 asserts eight nav items visible and the active one matches the pane; `v190-sticky-header.spec.js` asserts one header box at 900.

## next  65 · Empty and zero states: two primary CTAs at once, two secondaries shortened for a constraint that moved, a search ✕ on every empty field  **[B, an always-visible clear control and two "New plate" buttons on one screen read as unfinished]**

- **Header "New plate" plus empty-card "New plate" (ui-audit R8, deferred 3 Sep: "only if CSS `:has()` reaches it with zero JS", re-asked):** demote the header action while the first-run card shows. Check `:has()` against the browsers the PWA runs in before choosing.
- **`.btn-noun` collapse turns "Set up from products" into "Set up" and "Import invoice" into "Import" at ≤639** (`docs/MAINTENANCE.md`): 179 moved both out of the header, so the constraint expired; scope the change to the rehomed actions (the "More" back chevron also wears `.btn-noun` and must keep collapsing). `fresh-states.spec.js` pins both short forms and is changed consciously.
- **The search ✕ shows on every search bar even when empty** (`docs/MAINTENANCE.md`; `.ms-clear`, `.plib-x`): one delegated input listener hides it while the field is empty, for all six bars.
- **Menu / empty-state centring, fixed four times with no root cause on record** (`docs/MAINTENANCE.md`): read v44, v49, v54, v70 together; name the cause or say there is none; write the trap.

**Test:** `fresh-states.spec.js` asserts one primary per screen in the empty state and that the clear control is hidden with an empty field.

## blocked  66 · Contrast, decided once in the tokens (item 8), plus the Invoices helper that rides it  **[B, three rendered options are with Max]**

Blocked on: **Max's answer to `docs/decisions/2026-09-02.html`** (queue item 8, as written). When it lands, `.invz-s` at 4.04:1 (ui-audit R9) takes the same token answer, and `tests/visual/200-pack-unit.spec.js`'s floor rises in the same change.

---

# The C tail

## next  67 · No length cap on product, menu or plate names, and Unicode bidi controls are stored and rendered  **[C, 233-character names save cleanly and one U+202E reversed a row's text]**

Persona §8: product 233 chars saved; menu 125 with emoji and tags; plate 207. XSS is escaped everywhere (held). Cap at the server (a `check` on `length()`, rehearsed on staging, with the client counting the same units: see the café-name entry in `docs/MAINTENANCE.md` for why `maxlength` and `length()` disagree on astral characters) and strip U+202A to U+202E and U+2066 to U+2069 on save. **Test:** `tests/cafe-create.test.js`'s pattern, for the three names.

## next  68 · Accessibility polish: product rows are buttons with no accessible name, and two touch targets sit under 44px  **[C, WCAG 2.5.8's 24px floor is met; this is the 44px bar]**

Persona §7: product rows are `<button>`s with no accessible name (`renderIngRows`, `js/app.js:4638` region; 225 gave the figures labels, the row itself needs one). `docs/MAINTENANCE.md`: `.use` at 36px and `.del-link` at ~37px (the latter retires with item 47); `.range-btn` visual size is a taste call Max deferred 31 Jul and is not re-asked. **Test:** `fresh-states.spec.js` asserts each product row's accessible name.

## next  69 · Small data-shape defects: `is_custom` is null in memory until reload, 62 plates carry an unlabelled fixed misc line, and the per-unit qty inputs are ragged  **[C, none moves a number today]**

- `is_custom` null on a freshly created product until reload while the DB holds true (persona §7): set it in the constructor (`js/app.js:419-423` shape).
- 62 plates with a misc line of exactly $0.50 / $0.20 / $0.10 and no label: either label the convention once ("packaging") in the builder's misc row, or MM-4 treats misc as fixed cost. Decide before 33.
- The qty-input alignment rides item 49.

## next  70 · The Invoices screen still has the boot-race priming gap F9 fixed for Settings  **[C, a refresh landing on Invoices renders `#lastImport3` against pre-boot state and repaints a hidden Plates library instead]**

`rerenderCurrentTab` (`js/app.js:3490`) names five panes and falls through to `renderPlatesTab()`. One screen-to-renderer map that `showTab` and `rerenderCurrentTab` both read, the way `TAB_PANES` ended the pane-list class. From `docs/MAINTENANCE.md`; reachable since the More screen gave Invoices a route.

## next  71 · "Try again" after a pdf.js load failure cannot work, for two independent reasons  **[C, the toast promises a retry only a reload delivers]**

`ensurePdfjs` memoises the rejection and a failed module fetch is sticky in the module map. Either a fresh cache-busting URL on retry with the SRI hash re-checked, or wording that does not promise a retry. **Do not clear the memo alone.** From `docs/MAINTENANCE.md`; `tests/third-party-pins.test.js` is the authority on the version.

## next  72 · The sync pill flickers between chunks on a large catalogue import  **[C, cosmetic, end state correct]**

`dbPushIngredients` / `dbPushIngPrices` chunk at 200 rows and each chunk is its own `pushWrite`. A `pushWrite` variant that brackets a sequence, or a caller-held busy the pill respects; not fewer chunks. From `docs/MAINTENANCE.md`.

## next  73 · `supplier_phrases.pid` never crosses the row boundary, so `syncMemoryToProduct` is dead after any reload  **[C, a guard that is present, documented and cannot fire]**

Two safe fixes remain: the column plus both mapper halves (nullable, no default, full `docs/STAGING.md` procedure, `restore_backup` inserts this table with `select *`), or delete the guard and say why. **Matching on the normalised phrase is UNSAFE** and is recorded as such. From `docs/MAINTENANCE.md`. Could ride 14's or 40's migration if the column route is chosen.

## next  74 · Nothing makes "a modal opened over another must be later in the markup" a rule  **[C, no such flow exists today; the day one does it renders behind and looks like a dead button]**

Fifteen of eighteen `.modal-overlay` share `z-index:80`. Either a test asserting every reachable modal-over-modal pair paints its child on top (`v137-modal-layer.spec.js` is the pattern) or an `.is-stacked` layer above 80. `topOverlay()` is not the defect. From `docs/MAINTENANCE.md`; item 52 adds a reachable stack (the ingredient modal over the builder page) and must check it.

## next  75 · Dead CSS: six selector families with no emitter, plus `.tipbox` / `.tip` with a wired handler and a document-wide click listener  **[C, a batch once spent time styling a rule that renders nowhere]**

`.ref-pill`, `.db-tools`, `.ing-empty`, `.an-empty`, `.plate-noresult`, `.king-tag` (grep both `index.html` and `js/app.js` per selector; `.an-empty` and `.an-empty-box` are different names) and `.tip`/`.tipbox` (§13 in `css/style.css`, the `querySelectorAll('.tip')` wiring and the document click listener in `js/app.js`). Verify the emitter, not the selector. From `docs/MAINTENANCE.md`. Rides the next batch opening `css/style.css` §13.

## next  76 · Dead code and small trims  **[C, each verified dead; none moves a number]**

`edDelArmed` (declared, written twice, read nowhere); `analyze().absPct` (no reader since v122); `avgFoodCostForScope` counts dishes whose `menuId` has no By-menu row (latent, zero today; item 18 opens the function); `verdictHtml`'s "Nothing costed and priced on this menu yet" branch unreachable for a named menu; `ingredients.updated_at` is not history (make it honest or drop it); `ing_price_history`'s `unique (product_id, recorded_at)` needs its own brief; the ~390KB of self-hosted fonts re-download on every deploy (a versionless font cache) and `cache.addAll`'s swallowed partial install. From `docs/MAINTENANCE.md`; each rides the batch that opens its function.

## next  77 · `isBuilderDirty` compares against raw saved lines, not what was loaded  **[C, held shut only by `productRefs`' delete guard]**

`loadPlateState` drops a `pid` line whose product is gone; `isBuilderDirty` compares against `sp.lines` unfiltered, so such a plate reads dirty on load. Decide: degrade the line like a `kid` line, or compare like with like. From `docs/MAINTENANCE.md`; item 16's heal changes which lines are bare and should re-check this.

## next  78 · Record corrections that were written down and never propagated  **[C, four stale facts a future audit will re-find]**

- "Abbreviation matching in search" is recorded as shipped by three audits and was explicitly declined (`js/app.js:701-704`); rename the closed thread to "product-text search (v55 §G)" everywhere it is cited, then decide separately whether synonym matching is wanted.
- `cafeCost_env` is a stamp and Tier 2 still says there is no third category: one clause in `CLAUDE.md`.
- HANDOVER-178's rule "a primary action must not live inside a node that re-renders" was parked and never applied: write it into `CLAUDE.md` Tier 1 (Save inside `#bFootSum` dropped a tap between touchstart and touchend).
- `ingredients_pkey` is `(id)` and only a migration header says why that is safe: two assertions in `tests/unique-ids.test.js` (every product-id mint goes through `uid(`; `01-schema.sql` still reads `id text primary key`) with the migration named in the failure message.
- The café-name limit counts UTF-16 units on the client and codepoints on the server; pinned, and the trade (drop `maxlength` or keep the false refusal) is made by whoever next touches `#bgCafeName`.

## next  79 · Tests and CI hygiene  **[C, none changes what ships]**

- The pre-push hook needs a manual `git config core.hooksPath .githooks` per clone: a guarded `prepare` script (`git rev-parse --git-dir >/dev/null 2>&1 || exit 0`), confirm `npm ci` in CI stays green; never remove the CI gates.
- Three `actions/*@v4` pins carry a Node 20 deprecation annotation on every green run: bump in one commit, confirm the annotation is gone.
- `tests/trend-reframe.test.js:133` fails for 60 seconds a day (fixtures built from `Date.now()` straddling local midnight): anchor to local noon two days ago; check the whole file.
- Four files read `js/app.js` by hand instead of `loadApp()`: `builder-nomatch.test.js`, `scroll-lock.test.js`, `terminology.test.js`, `smoke.js` (leave `smoke.js` if standalone; `extractfn.test.js` is by design).
- Handovers quote 288 Playwright where CI guarantees 274: quote CI's filter and say so.
- `layout-consistency.spec.js` never measures the list body: extend to each tab's list-body left edge at both sizes; decide the 4px at 561-1023.
From `docs/MAINTENANCE.md`.

## next  80 · Playwright meaning: the specs register a service worker they never test, the older specs were never audited for vacuity, `_boot.js`'s empty-table list is a list of features no spec can see, and v156 never had a second reader  **[C, a spec that cannot fail is this repo's most-recorded defect]**

- Stop the harness registering `sw.js` (abort `**/sw.js` or stub `navigator.serviceWorker` in `tests/visual/_boot.js`); acceptance is the PR #147 reproducer at 150+ tight cycles with zero crashes; if one spec should test registration, write one deliberately.
- Audit `screenshots.spec.js` (2 assertions) and `fresh-states.spec.js` (117, five `addProduct` sites): each asserts something a user would notice or is retired on purpose; `addProduct` is a Tier 1 trap kept alive only by that spec and must be closed in the same branch.
- Read `emptyOk` in `_boot.js` as the list of features no browser spec can exercise; serve each from localStorage in its row-mapper's shape or record at the site that nothing renders from it.
- Run the `code-review` agent retrospectively over `git diff 023e311..d1a8e53` (175+176) on a different model, blind to the brief; anything found is a new branch.
- Mutate one load-bearing thing per spec's stated subject across the 53 files and confirm the spec goes red (the never-run audit).
From `docs/MAINTENANCE.md`.

## next  81 · Two more mutation targets, and one magnitude check against real data  **[C, "a function that is not a target has never been asked the question"]**

- `saveCurrentPlate` leaves 12 survivors across six declared files (measured 29 Aug, batch 221); the honest close is twelve assertions, its own batch; do not add the target without doing the work.
- One magnitude check against a production snapshot: every plate cost, unit cost and food-cost % inside a sane band; state at the site that a band cannot catch a 10% error (the composition test is the complement). Item 18's bound is the runtime half of the same idea.
From `docs/MAINTENANCE.md`.

## next  82 · `docs/PHONE.md` needs a groom, and Max asked for it  **[C, 973 lines, 42 sections, one question asked five times, and no handover records the list catching anything]**

Sort every bullet: dead or superseded → delete with the reason; settled by a Playwright spec → strike and name the spec; a desktop browser can settle it → do it and record the answer (judged strictly; 380px Chromium is not an iPhone); genuinely needs a phone → keep. Merge the five header-wrap bullets into one. Pin a "Costs money if wrong" section at the top (v168 GST conversion, v169 importer GST, 193's carton-vs-pack question, 210's signed-in AI reader, v194/v195's real-PDF import, and item 17's Supplier B import when it ships). Cap the rest at the last three batches. Fix the ordering so it reads one direction. From `docs/MAINTENANCE.md`; the measured evidence is in that entry.

## blocked  83 · Three skills live outside the repo, so nothing can review or pin them  **[C, `new-branch` told every batch the wrong reviewer rule for three audits running]**

Blocked on: **Max deciding whether `new-branch`, `investigate` and `test-flows` move from `~/.claude/skills/` into the repo's `skills/`** (they are his global config and moving them changes what other projects see). If they move, `tools`-style symlinks like the existing `.claude/skills/*` entries make them reviewable. From `docs/MAINTENANCE.md`.

## next  84 · Two importer threads and one staging-seed assumption  **[C, speculative until someone imports twice; the seeds are only valid immediately after a wipe]**

- The catalogue importer does not remember its column mapping between imports (one `app_settings` key keyed by the header row's shape).
- Nothing shows a product's supplier code, so a wrong re-import match cannot be diagnosed; the likelier of the two to matter.
- `03-seed-realistic.sql` and `04-seed-scale.sql` self-check with `select … into` over a key that is unique per café since 183: filter on `business_id` or say at the site they are valid only after the wipe.
From `docs/MAINTENANCE.md`.

## blocked  85 · Token debt: ~95 off-scale font-size literals and nine breakpoint values  **[C, value-preserving, zero visual change, and Max said "reconsider only after the above ships", which it has]**

Blocked on: **Max's priority call** (ui-audit R20; Phase 2 completed with `ezplate-v193`). Fold onto the existing `--fs-*` / `--sp-*` scales (extend the scale where 12.5 / 13.5 are deliberate density values), rationalise breakpoints toward 640 / 768 / 1024, no pixel moves; the before/after capture harness in `~/Documents/EzPlate-ui-audit-2026-09-02/` is the proof.

## next  86 · The design's R4 absences recorded so they are decisions, not gaps  **[C, no work; a record]**

Business name and currency (currency has teeth: every money display hard-codes `$`, so a second café outside Australia is wrong everywhere; treat as a costing question), Notifications (server-side, reopens the privacy gate; never a UI shell), the Account screen and Delete-workspace modal (multi-tenant phase; the v3 mocks are their design). From `docs/MAINTENANCE.md` and `docs/QUEUE.md`'s closing note. Fold into `docs/EXTERNAL-CONFIG.md`'s neighbour or a short `docs/DECLINED.md` so the next audit does not rediscover them against the mock.

## blocked  87 · The feature backlog that was specced and declined, put to Max as one list  **[C, a free queue slot is not an approval]**

Blocked on: **Max's priority call.** From `docs/MAINTENANCE.md`'s "Displaced" section, all seven are features he never queued: a write queue with Retry (the mock's error banner's Retry is honest only with this); "Synced N min ago" (needs a last-sync timestamp and a placement answer); Recent range on the builder's cost card (the stated data source does not exist; reconstruct from `ing_price_history` per line); command palette (⌘K); invoice import history (a table with RLS; replaces item 58's one-line sentence); photographing an invoice (OCR or a vision model; reopens the privacy gate); CSV export (never an import path). Put to him as a list; nothing here is started on a free slot.

---

## next  88 · Thirteen plate lines cost off a product no ingredient uses, and only a person can say which ingredient they meant  **[B, the measured mis-costing item 16 named and could not fix: 13 lines across 9 plates on the live October menu, re-measured 9 Sep 2026]**

**Raised by batch 239, which shipped item 16's heal and refused to guess these.** The heal moves a bare `{pid,qty}` line onto its ingredient wherever **exactly one** ingredient owns that product. It cannot for these, and the reason is not a bug: **no ingredient owns the product at all.** Six products, all still in the catalogue — the ingredient was repointed away from them at some point and these lines stayed behind:

| product | plates |
|---|---|
| Bacon Middle Rindless Gas Flushed (Qld) | Bacon & Egg Roll, Bacon Bene, Scoopy's Breakfast |
| Eggs - Ctn 600g | Bacon Bene, Feta Spinach & Mushroom Bene, Ham Bene |
| Maple Syrup Flavoured | Pancakes — Cookies & Cream, Plain, Rainbow |
| Cheese Fetta Danish | Feta Spinach & Mushroom Bene, Scoopy's Staff Meal |
| Ham Leg Sliced | Ham Bene |
| Hash Browns Triangles Chunky | Scoopy's Breakfast |

**This is item 16's own measured harm** — its "seven named dishes mis-cost, all on Ethen's Menu Oct 2026" is these lines, and its stated remedy did not reach them. **The app already NAMES them**: the "Fix older plate lines" confirm lists every one, grouped by product with its plates, and Max can fix each by hand in the builder today (swap the line for the ingredient).

**What must be true when it is fixed:** the app ASKS rather than guesses — one choice per product, not per line ("which ingredient is this?"), applied to every line pointing at it, through the same write and rollback path the heal already uses. **Refusing is a legitimate answer and must stay one**; a plate line may genuinely be meant to cost off a product no ingredient owns.
⚠️ **Do NOT heal these by name-matching the product to an ingredient.** `CLAUDE.md` records the shape (batch 223): a name matched inside a longer one blames the wrong product, and the failure mode has no symptom.

# Dropped or merged

Every prior finding that is not an item above, with one line why, so nothing disappears silently.

**Already shipped (struck against the handovers and `docs/MAINTENANCE.md`'s done marks):**
- Blind audit #1 (quantity-first carton halves the unit cost): shipped as `ezplate-v194` (batch 236); queue item 12 deleted.
- Queue item 12b (trailing net-weight column): shipped as `ezplate-v195` (batch 237).
- Batch 238's confirmation-link redirect: shipped as `ezplate-v196`; only the dashboard click remains (Tranche 0).
- UI audit R1, R2, R3 (`v190`), R21 + R22 (`v190`), R4 + R7 (`v191`), R5 + R6 (`v192`), R17 + R18 (`v193`): fixed; R12 did not reproduce (batch 234); R19 wontfix agreed. The dark-theme re-run found no new rows.
- MAINTENANCE done marks: the `aria-hidden` column bands (225); `screenshots.spec.js` skip (200, and its third copy); CI minutes (expired); Stryker (shipped as the gate, 180); `gemApplyReadings` under the gate (206); more gate targets (205); the gate's "minutes not seconds" (measurements poisoned, re-measured 96s); `saveIngLog` buffer (premise falsified twice); `var catState` (200); the ISO-vs-number and `uid` width comments (200); retire the parallel track (22 Aug); the second PHONE.md copy (merged); `restore_backup` inert for anon (219); the six shipped comments X1 to X6 including `--bottomnav-h` (230); the two incident counts and "Four checks" (230); three handover gaps (218); `.king-link` clamp (232); "Three vocabularies" and its "Slightly under" residual (F8, 229); re-pin `claude-code-action` (moot, workflow deleted).

**False or already pinned:**
- Blind audit #9 ("bare English prose in app.js"): false; `node --check` parses clean; the reviewer read the file in slices.
- Blind audit #10 (inverted recommendation): real and deliberately pinned in `tests/insight-parity.test.js`; recorded inside item 24 as the residual that stays.

**Superseded by the owner's parser reversal (override 2):**
- Persona queue item 27 ("parser evaluation rows from the paste box, not a fix here"): its three paste-box rows (the `x 6` multiplier, the quantity swallowed into the name, the negative quantity) are D3, D1 and D5 in item 17 and fixtures in the corpus.
- MAINTENANCE "the protected parser region has no automated guard / ratify 197 / hash pin": the guard that should have existed was a corpus, not a hash; item 17's corpus test and mutation targets replace it, and Tranche 0 records his reversal.
- MAINTENANCE "an eval harness for the invoice reader": exists as `spike/parser-audit/run.js`; promotion is item 17 and its standing use is item 37.
- HANDOVER-197's "formula written four times" thread: item 37 (`packPriceOf` through `lineColumns`), measurable now.
- HANDOVER-175's "supplier FILTER over a 95% empty field": merged into item 62's Products list pass (decide once whether the filter shows when the field is empty).

**Merged into one item because they are one mechanism:**
- Persona queue 21 + UX U6 + persona §9's name truncation + qty-input raggedness → item 49 (builder 768-1200).
- Persona §7 "Loaded toast over Duplicate" + §8 "over Clear plate" + UX U12 + MAINTENANCE "toast covers `.bfs-save`" + ui-audit R13 → item 50.
- UX U13 + MAINTENANCE "the plate name appears three times" → item 51.
- Persona queue 23 + 24 (which average; Last change / `price_as_of`) → items 23 and 22, with the invoice change-log event folded into 22.
- UX U8 (Manage list… inside the select) split: the naming half is item 46, the placement half is item 61.
- UX U18 + U19 + U29 + U32 (label) + MAINTENANCE sub-44 `.del-link` → items 46 and 47.
- UX U16 + U17 + U21 + U39 + U9 + persona §7's category select and double space → item 57.
- UX U23, U24, U27, U37, U41, U43 + MAINTENANCE `renderManageMenusZero` → item 58.
- UX U26 + U25 + persona §9 inset + ui-audit R9 → item 59 (R9 rides 66).
- UX U30, U31, U33 + persona §8/§9 pills, baseline, sticky divider + ui-audit R15 → item 61.
- UX U34, U35, U36, U38 + ui-audit R10 + HANDOVER-175's supplier filter → item 62.
- UX U40, U42 + MAINTENANCE manifest colours + persona §9 top gap → item 63.
- UX U44, U45, U46 + ui-audit R14 → item 64.
- Ui-audit R8 + MAINTENANCE `.btn-noun`, search ✕, Cost card empty box, Menu centring root cause → item 65.
- Persona queue 25 + 26 + 17-19 harness lines → items 27, 28, 29 (the persona audit's own numbering 16-20 was superseded by its QUEUE file, which is superseded by this one).
- Blind audit #7 + #8 + MAINTENANCE `doDeleteMenu` + `priceHistory` wholesale replace → item 21 (success or history claimed before the write settles).
- Blind audit #6 + its publish-guard comment → item 20.
- Blind audit #11 + MAINTENANCE "two ways a name check can be satisfied by the wrong entity" + "a rejected phrasing is not free" + the digit-name validator → item 24.
- MAINTENANCE "comments that disagree with the code": two of three done (200); the third (`setCogs` vs boot vs `fmtTargetPct`) is item 25.
- MAINTENANCE "`claim_business_invite` and `business_team` callable by anon" and QUEUE 14's note about the same → item 40, riding 14.
- MAINTENANCE per-account rate limiting + GATE-REVIEW gate 5 residual → item 38.
- MAINTENANCE "no inventory of external settings" + the two dashboard switches → item 43 and Tranche 0.
- The MAINTENANCE "Displaced B items" section: the seven declined features → item 87 (Max's list), not queued; the five promoted defects it once held are already in `docs/QUEUE.md` or shipped.
- The UX audit's "What is already at the bar" and the persona queue's "tried and held" lists: kept as item 44's first appendix, so nothing is re-tested.

**Kept by reference, not rewritten:** `docs/QUEUE.md` items 13, 14, 15 (worked as written; 40 and 25 ride them), 5 (Max's go on the day; the relink heal in 16 is the same class of production rewrite and follows the same rule), 8 (item 66), 2b (deferred indefinitely; items 38 and 41 must land before it).

**Owner-only, so in Tranche 0 rather than the queue:** UX U5 (test fixtures live in production), the `price_history` spike, the staging account, `.env`, the two Supabase switches, and the written reversal on the parser region.
