# Consolidated queue from the three 8 Sep passes, paste-ready

*Everything from `PERSONA-AUDIT-2026-09-08.md` §2, §7, §8 and §9 plus the margin-monitor items from `brain-ops/projects/ezplate/2026-09-08-queue-items.md`, graded on `docs/QUEUE.md`'s own test and ordered. The queue holds six items and is capped at twenty, so **the first block is thirteen A and B items for `QUEUE.md`** and the second is the C block for `docs/MAINTENANCE.md`. Max pastes; nothing here was written into either file. Every item names its sites or says the list is unmeasured, per the queue header's rule. Batch numbering continues from 238.*

## Before the queue: clean-up only Max can do (SQL, not a batch)

- Delete the `price_history` row at 2026-09-08 09:37 (value 354.4) and the `menu_price_history` rows for menu `MENUmtsh5o3t-1-9v3bvrqw`.
- Delete the ZZ-AUDIT objects: menu `MENUmtsh5o3t-1-9v3bvrqw`, plates `SPmtsgl835-3-whbuaxv4` and `SPmtsgln1j-5-ccgyrir0`, ingredient `K0164` (the `app_settings` blob), products `Umtsgis3j-1-6db8oyfi` and `Umtsgitwu-2-r0gi6433`, and the `ing_price_history` rows for the second.
- Add `.env` to `.gitignore`; it is not there today and the repo is public.

## Block 1: paste into `docs/QUEUE.md` under "next", in this order

```
## next  16 · Relinking an ingredient leaves every legacy bare-pid plate line on the old product  **[A — silent mis-costing, measured on the live Oct menu 8 Sep]**
Live count 8 Sep: 44 bare `{pid}` lines across 11 plates; 13 of them point at products no ingredient uses any more. Measured deltas today: Bacon Bene, Ham Bene and Feta, Spinach & Mushroom Bene each under-cost two eggs by $0.27; Pancakes — Plain over-costs syrup by $0.37; Feta Bene over-costs fetta by $0.16. All on Ethen's Menu Oct 2026. Mechanism: `lineProduct` (js/app.js:1517-1521) resolves a bare pid straight to `byId` and never consults the owning kid; the three repoint sites (:5176, :12007, :12052) move `k.pid` only; :4797 and :5207 say so; the :5141 modal copy promises the opposite; `platesUsingKid` (:5206) counts the kid arm only, so "Bacon: used in 15 plates" is 18. Eleven resolver sites counted in docs/audits/PERSONA-AUDIT-2026-09-08.md §2. What must be true: after a relink every plate that used the ingredient, by kid or by bare pid, costs off the new product; "Used in" counts both arms; the :5141 copy is true; a one-off heal rewrites bare-pid lines to `{kid}` where a kid owns that pid, with one `dbPushPlate` per touched plate. Regression test as in §2 (P1 cpbu 1, P2 cpbu 2, K1→P1, two plates, move K1, both cost 20).

## next  17 · One mispriced dish rewrites every headline and leaves a permanent spike  **[A — a $0.01 typo took the dashboard to 354.4% and the chart to a 380% axis, and the point is now in price_history for good]**
Measured 8 Sep on production with a ZZ-AUDIT dish at $0.01: menu pill 30000.0%, dashboard headline 354.4% and "324.4 pts over target", sidebar badge, the trend chart rescaled so every real week is a flat line, Gemini "Needs attention" phrasing "swings 20000–30000%" and "Uncategorised sits at 958%", and a `price_history` point at 354.4 that nothing in the app can remove. Sites: `avgFoodCostForScope` (mean of per-dish ratios, no bound), the trend writer that appends to `price_history` and `menu_price_history`, the chart's y-scale, the insight facts fed to `api/insight`. What must be true: a dish over a sane bound (300%) is listed on its own line as "check the price", excluded from every mean and from the history point; the chart never scales past 100%; and a history point can be deleted or re-written from the app. Test: the $0.01 dish leaves the headline within 0.5 pts of its value without it.

## next  18 · A misc cost accepts a negative number and the plate saves at a negative cost  **[B — a plate at −$2.00 persisted to the database on 8 Sep]**
Sites: the misc input in the builder (`#lines input[aria-label="misc cost amount"]`), `saveCurrentPlate` (:3062), and every averager that consumes plate cost. What must be true: misc is ≥ 0, or is explicitly a credit and rendered as one, and a negative plate cost cannot reach `plates`. Negative quantity is already clamped to 0 (keep that).

## next  19 · A staging test account exists, outside the repo, and anything that needs a signed-in session can run  **[B — 14 screenshot tests skipped since v162, and the persona harness cannot start]**
Blocked on: Max creating the account (throwaway address; credentials to local `.env` and Vercel's staging env as STAGING_TEST_EMAIL / STAGING_TEST_PASSWORD; never committed; `.env` is not in `.gitignore` today). Then `tests/visual/_boot.js` reads them, `screenshots.spec.js:32` un-skips, and `tests/persona/` gets its first spec.

## next  20 · The supplier "Create new" popover in Edit product renders at the screen's left edge  **[B — 380px from its field at 1360, floating over the sidebar]**
Measured 8 Sep: `.cat-drop` at x=20 while `#ig_sup` is at x=401. Same class as the builder's `fixedContainingBlock` fix (CLAUDE.md, batch 212): something between the modal and the root establishes a containing block. Sites: the supplier and brand comboboxes in the Edit product and New product modals; check the New ingredient modal's product combobox too (it rendered correctly, but from the same code path?). What must be true: the popover's left edge equals the field's left edge in every modal that uses `.cat-wrap`. Test: a Playwright assertion on the two rects.

## next  21 · Builder side cards stack at half width with the right half empty from 768 to ~1120 wide, and ingredient names truncate to seven characters from 1024 to ~1200  **[B — the desktop band most laptops open the app in]**
Measured 8 Sep: at 1024 and 900 the rail wraps under the docket at `max-width:340px` (`css/style.css:925-937`, called deliberate for the 340 but not for the empty half); at 1100 the docket's name column collapses to ~130px so "Mushroo…", "Bread S…", "Hash Browns" on two lines, while `.bld-band`'s 110px chip tracks hold. The "Loaded" toast covers Clear plate at 1024 and Duplicate at 900. What must be true: when the rail wraps it fills the row; the name track has a 140px floor and the fixed tracks shrink first; the toast never covers a control. Extends the 768–1023 item in ui-audit-2026-09-02.md upward.

## next  22 · The Invoices screen has no page inset  **[B — the only screen whose dropzone touches the header and the sidebar]**
Measured 8 Sep at 1100 and 1360: the dashed dropzone runs edge to edge, the privacy sentence and "Recent imports" start at the raw content edge; every other screen carries the 24px inset. Sites: `#tab-invoices` container and `.invz`. What must be true: same inset as `#tab-dashboard`.

## next  23 · The dashboard headline does not say which average it is  **[B — 25.0% (mean of ratios) vs 26.4% (ratio of sums) on the same data, and "5.0 pts under" becomes 3.6]**
`avgFoodCostForScope` is the mean of per-dish ratios, consistently on the tile, the Menu pills and the sidebar badge, so this is not a contradiction; it is an unstated method where a $0.36 Pineapple Fritter weighs the same as an $18.84 Ocean Bounty Box. What must be true: the tile names the method in four words, the weekly page uses the same one, and the choice is written down once in CLAUDE.md beside per-publication counting. Rides 17.

## next  24 · "Last change" ignores ingredient repoints, and nothing writes price_as_of  **[B — the column reads "—" on 163 of 163 ingredients, including one whose unit cost doubled by relink that minute]**
Measured 8 Sep: K0164 moved $10/kg → $20/kg by relink and the column stayed "—"; a manual product price edit logs to `ingPriceLog` but leaves `price_as_of` empty; all 428 products have `price_as_of` empty; the change log holds no invoice event though "Prices last updated: 29/08/2026" says one ran. What must be true: the column reflects the ingredient's unit cost changing by any route, or is renamed to say what it is; every price write stamps `price_as_of`; an import writes one change-log event. Sites: the three repoint sites, `setProducts`, `applyInvoice`.

## next  25 · Persona harness, cafe manager  **[B — the margin monitor's promise pinned end to end]**
Do after: 16, 19. `tests/persona/manager.spec.js` against `/?env=staging` with the 03 seed: the journeys in the audit §3 (new plate; ingredient in three plates; relink and every plate moves; invoice with a rise and a pack change; target change; delete a used product; offline mid-save), each ending in an arithmetic assertion over every plate touched, counted not sampled.

## next  26 · Persona harness, bookkeeper  **[A — the practice model is one login across several cafes]**
Do after: 13, 14, 19. `tests/persona/bookkeeper.spec.js`: two cafes one login, two pending invitations, same-session A→B then read B's supplier phrases, A's plate id in B's URL, a refused cost write. Pins 13 and 14 from the outside whatever their inside fix was.

## next  27 · Parser evaluation rows from the paste box  **[B — a 6 × 500g line at $33 was priced $16.50/kg, not $11.00/kg, with needManual false]**
Measured 8 Sep through "paste text manually": the `x 6` multiplier not applied; a `name, qty, price` line swallows the quantity into the name; a negative quantity is not a credit. The parser is the protected region, so this is not a fix here: it is three fixtures for the evaluation harness MAINTENANCE already asks for, and the reason MM-1 measures subtotal reconciliation. What must be true: the harness exists, these three rows are in it, and the multi-pack case is either handled by the taught-pack path or flagged `uncertain:true`.

## next  28 · Margin monitor MM-1: extraction spike  **[A for the practice offer, C030 in brain-ops]**
Do after: 16. `spike/extract.py` + `spike/score.py` over `spike/invoices/` (20 mixed-supplier PDFs; a practice's client bundle first, Scoopy's as fallback), truth JSON for five, pytest asserts pass on the five, prints subtotal-reconciles count out of 20 and three worst mismatches. Stops when the number is known. Spec: brain-ops `projects/ezplate/2026-09-07-claude-code-handoff.md`. MM-2 to MM-7 follow from `projects/ezplate/2026-09-08-queue-items.md` and are not queued until this number exists.
```

**Order, with the six already there:** 14 → 13 → 16 → 17 → 18 → 19 (Max) → 20 → 21 → 22 → 5 (Max's go) → 25, 26 → 24 → 23 → 27 → 28 → MM-2… ; 15 rides whichever batch touches the write path; 8 and 2b stay where they are. That is nineteen of twenty.

## Block 2: paste into `docs/MAINTENANCE.md` (C, ride along)

```
- Builder: the same ingredient can be added twice with no warning (option click and Enter both fire). Sites: the add path from `#q` / `#drop`.
- Builder: qty inputs for per-unit lines sit left of the gram lines' inputs; right-align the input, let the unit label vary.
- Builder: "1 item have no cost data" (grammar).
- Products: `is_custom` is null in memory on a freshly created product until reload (DB has true). Set it in the constructor.
- Products: the category `<select>` mixes valued and valueless options; "HERBS  SPICES" carries a double space; product rows are `<button>`s with no accessible name.
- Names: no length cap on product (233 chars saved), menu (125) or plate (207); strip Unicode bidi controls (U+202E was stored and rendered).
- Plates: 62 plates carry an unlabelled fixed misc line ($0.50 ×46, $0.20 ×11, $0.10 ×2). Label the convention once or have the weekly page treat misc as fixed cost.
- Dashboard: two delta annotations collide when change markers fall within days; four-digit annotation clipped by the SVG edge.
- Dashboard: "What moved" and "Dig in" cards do not share a bottom edge.
- Menu: pill row right-aligned and wrapping; a long name wraps the pill to three lines; sticky header has no divider so the top row reads half-cut when scrolled.
- Settings, Account, Invoices: no top gap under the header bar; the other screens have one.
- Ingredients: "164 of 399 products have an ingredient" floats detached between header and search.
- Set up from products: the page header shows a second "Close setup" control behind the modal scrim.
- Exploratory pass protocol: a `docs/briefs/` file with the two personas, the one instruction ("make a number wrong without the app telling you"), the §3 checklist, the ZZ-AUDIT write rule, and the rule that a finding is C until a script reproduces it. Run by hand after each deploy version.
```

## What was tried and held (so nobody re-tests it next week)

XSS through product name, supplier and menu name (escaped everywhere); negative pack size, price, dish price, target food cost (all refused, target has min 1 max 99); $0 dish price (rendered "—", excluded); triple-click Save (one plate); search with `(*[`; Esc on modals; light mode on every screen; long names truncate in every list; relink via kid arm, product price edit, and reload persistence all correct; tablet 900 Dashboard and Plates clean; no horizontal overflow at any width tested; automated overlap and clipping sweep clean on every screen at 1100 and 1360.
