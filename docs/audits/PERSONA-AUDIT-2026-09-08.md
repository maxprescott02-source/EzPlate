# Persona audit, 8 Sep 2026: what must be finished before the margin-monitor queue starts

*Written by a Cowork session on Max's instruction: audit the repo's current state, build an agent that uses EzPlate the way a cafe manager or a bookkeeper would and tries to break it, and turn the result into a queue. Read-only against the repo at `2e9ad2e` (batch 237, `ezplate-v195`), plus one browser visit to staging. Per this repo's own law, `project-audit` reports and does not add queue items: **the proposed items are at the end, and Max pastes them.** Every line citation below is a pointer to check, not a fact (the 5 Sep audit's rule).*

## 1. Where the repo is

Six items open in `docs/QUEUE.md` under a 20 cap: **13** (A, unmeasured: tenant-scoped state survives an A → B move in one page, and A's supplier phrases get pushed into B), **14** (A, confirmed against the SQL: `claim_business_invite()` takes no argument and joins the oldest pending invitation, role included), **15** (B, unmeasured: a refused cost-affecting write leaves the client showing the wrong number), and three blocked on Max: **5** (restore full-wipe step 3, which the queue says gates any multi-tenant work), **8** (contrast decision), **2b** (Gemini paid tier, deferred indefinitely). Batches 235–237 shipped the UI audit's Phase 2 close and two silent mis-costing fixes from the 5 Sep blind audit (quantity-first carton lines, trailing net-weight columns), the second of which the pre-push review found while fixing the first. `sw.js` is `ezplate-v195`; 115 unit test files, 53 Playwright specs (439 green at 235), a 771-mutant gate, five harnesses in `skills/verify`. **`npm test` did not complete inside the Cowork sandbox in ten minutes and was killed; CI is the source of truth for green, and nothing here claims to have re-run it.**

Maintenance holds about 85 open C items; the ones that touch the margin-monitor's path are listed in §4.

## 2. The defect Max reported, traced

**Confirmed in the code, and it is worse than "some recipes": it is half the lines on production.**

A plate's `lines` is jsonb (`supabase/staging/01-schema.sql:134-141`), each line one of `{misc,label,cost}`, `{kid,qty}` or `{pid,qty}` (`js/app.js:2028`, single writer `:3062`). A `kid` is a kitchen ingredient `{id:'K0001', name, pid}` held as one `app_settings` blob (`:241`, `:1503`, `:1511`); a `pid` is `ingredients.id`. `lineProduct` (`:1517-1521`) resolves whichever arm the line carries.

Relinking an ingredient moves `k.pid` at three sites (`:5176` Ingredients modal, `:12007` invoice deferred repoint, `:12052` the guarded confirm) and pushes the blob. Nothing writes `plates`; every cost consumer resolves live (`:3186`, `:1739`, `:4095`, `:6511`, `:6545`, `:6580`), so a `{kid,qty}` line follows the relink instantly. **A `{pid,qty}` line resolves through `byId[l.pid]` and never consults the kitchen ingredient, so it keeps the old product forever.** The code knows: `:4797-4798` and `:5207-5212` say a relink "cannot heal a legacy bare-pid line", and `platesUsingKid` (`:5206`) deliberately counts only the kid arm. **Measured on production 1 Aug 2026 and recorded in the code: 84 of 179 lines are bare-pid** (`:1629-1633`, `:4629-4631`). The bare-pid constructor has had no UI path since v31; the lines are legacy rows that `loadPlateState` (`:9307`), draft resume (`:9552`) and `saveCurrentPlate` (`:3062`) preserve unchanged. No migration heals them. The Ingredients modal copy at `:5141` promises "changing the product updates all of them", which is true of the other half.

No test pins propagation; `tests/king-rows.test.js:70-79` pins the opposite. **Sites to change:** either a one-off heal pass rewriting bare-pid lines to `{kid,qty}` where a kid owns that pid (3 sites plus one `dbPushPlate` per touched plate), or teach `lineProduct` to prefer the owning kid (1 site, but it changes what `platesUsingKid` means). Eleven resolver sites in total, counted above. **Regression test:** extract `lineProduct`, `costDetail`, `costFromLines`; seed P1 cpbu 1, P2 cpbu 2, K1 → P1; two plates `[{kid:'K1',qty:10}]` and `[{pid:'P1',qty:10}]`; move K1 to P2; both must cost 20. Today the second returns 10.

**Why it is an A on the queue's own test:** the margin monitor's entire promise is "one price moves, every recipe recomputes". On half the production lines that is false today, silently, and a bookkeeper would put the wrong page in front of a client.

## 3. The persona agent: what it is, and why it cannot run yet

**What it is.** Two scripted people, run against staging, each a Playwright journey with invariants asserted at the end of every step, plus one exploratory pass by a model driving the real app with a checklist. Not a chatbot that "acts like" a manager; a set of journeys a manager or bookkeeper actually takes, with the arithmetic checked after each one.

**The cafe manager** (Scoopy's, one tenant): cost a new plate from the catalogue; add a kitchen ingredient and use it in three plates; relink that ingredient to a dearer product and check all three plates moved (§2); import an invoice with a price rise and a pack-size change and check every affected plate; set a food-cost target and check the suggested prices; delete a product that plates use; edit a plate on the phone breakpoint with a draft open on desktop; go offline mid-save; refresh mid-import; enter GST-inclusive and exclusive prices for the same supplier; a carton line with the quantity first (batch 236's case) and a trailing net weight (237's).

**The bookkeeper** (two cafes, one login): create cafe A, be invited to cafe B, accept, and check nothing of A shows in B (queue 13); hold two pending invitations and accept one (queue 14); process a month of invoices for A then switch to B in the same session and import one, then read B's supplier phrases (queue 13, half two); attempt to read A's plates from B by id in the URL or a draft in localStorage (`cafeDB_plateDraft` has no tenant stamp, MAINTENANCE); have a cost write refused by the server and read what the client shows (queue 15); revoke their own membership mid-session.

**The exploratory pass.** A model in the browser with the same two personas and one instruction: try to make a number wrong without the app telling you. Findings triaged by the tier test; a finding that does not reproduce in a script is C.

**Why it cannot run today.** Staging is up (`/?env=staging` shows the red pill, checked 8 Sep) and sign-in is mandatory since batch 186. **There is no test account.** `tests/visual/screenshots.spec.js:32` has been skipped since v162 for exactly this reason, with the rule that no real password is ever committed. A Cowork session will not create an account or enter a password. **So step zero is Max's, two minutes: create a staging-only account (a throwaway address), put its credentials in the local `.env` and in Vercel's staging env as `STAGING_TEST_EMAIL` / `STAGING_TEST_PASSWORD`, never in the repo.** That one act unblocks the persona journeys, the 14 skipped screenshot tests, and any future exploratory pass.

## 4. What is in the margin monitor's path, from the existing docs

Beyond §2, these existing items sit directly under the engine's seven steps and should ship or be measured first:

- **Queue 14** (A, confirmed): a practice's bookkeeper with two client invitations joins the wrong cafe. The practice model *is* one login across several cafes.
- **Queue 13** (A, unmeasured): tenant state and supplier phrases bleed across cafes in one session. Same reason.
- **Queue 5** (blocked on Max): the queue itself says it gates any multi-tenant work.
- **Queue 15** (B): a refused cost write shows the wrong number; the weekly page would print it.
- **MAINTENANCE, invoices:** no parser eval harness; the protected parser region has no automated guard and one unratified edit (batch 197); pack-to-unit arithmetic copied four times; Apply reports success before writes settle (5 Sep #7). The engine's step 2 is that parser.
- **MAINTENANCE, pricing:** `setCogs` rounds while boot accepts fractions; a failed `menus` read mints a fictional menu (5 Sep #6, "promote to B on reproduction").
- **GATE-REVIEW gate 5:** rate limits on the AI endpoints did not hold for Max's own key; must close before a paid tier, which the practice offer is.

## 5. Proposed queue block (Max pastes; nothing was added to QUEUE.md)

Ordered. The first four are prerequisites for MM-1 onward; the rest are the persona harness itself.

```
## next  16 · Relinking an ingredient leaves every legacy bare-pid plate line on the old product  **[A — silent mis-costing on 84 of 179 production lines, measured 1 Aug 2026 at js/app.js:1629-1633]**
Mechanism at js/app.js:1517-1521 (lineProduct) and the three repoint sites :5176, :12007, :12052; code admits it at :4797-4798 and :5207-5212; modal copy at :5141 promises the opposite. Eleven resolver sites counted in docs/audits/PERSONA-AUDIT-2026-09-08.md §2. What must be true: after a relink, every plate that used the ingredient, by kid or by bare pid, costs off the new product; platesUsingKid counts both arms or says which it counts; the :5141 copy is true. Regression test as specified in the audit §2. Step one is the repro on staging with the 03 seed.

## next  17 · A staging test account exists, outside the repo, and the persona harness can sign in  **[B — nothing that needs a signed-in session can run, including 14 skipped screenshot tests]**
Blocked on: Max creating the account (two minutes; credentials to local .env and Vercel staging env only). Then: tests/visual/_boot.js reads STAGING_TEST_EMAIL/PASSWORD, screenshots.spec.js un-skips, and tests/persona/ gets its first spec. Never a committed password (screenshots.spec.js:18-32).

## next  18 · Persona harness, cafe manager: the relink, invoice-rise and pack-change journeys assert every affected plate recosted  **[B — the margin monitor's promise, pinned end to end]**
Do after: 16, 17. tests/persona/manager.spec.js against /?env=staging with the 03 seed: journeys as listed in the audit §3, each ending in an arithmetic assertion over every plate touched. Counts the plates before and after, never "some".

## next  19 · Persona harness, bookkeeper: two cafes one login, and nothing of A is visible or written in B  **[A — the practice model is one login across several cafes]**
Do after: 13, 14, 17. tests/persona/bookkeeper.spec.js: the six journeys in the audit §3, including the two-invitation case and the same-session A→B supplier-phrase check. Pins 13 and 14 from the outside, whatever their inside fix was.

## next  20 · Exploratory pass protocol: a model drives staging as both personas once per deploy version and files findings through the tier test  **[C unless a finding reproduces]**
A docs/briefs/ file with the two personas, the one instruction ("make a number wrong without the app telling you"), the checklist from the audit §3, and the rule that a finding is C until a script reproduces it. Run by hand, not CI.
```

**Order of the whole thing, then:** 14 → 13 → 16 → 17 → 5 (Max's go) → 18, 19 → MM-1 … MM-7 (in `brain-ops/projects/ezplate/2026-09-08-queue-items.md`) → 15 rides whichever batch touches the write path. 20 runs once after each deploy from here on.

## 6. What this audit did not do

It did not run the suite to green (sandbox timeout), did not sign in to staging, did not read all 85 maintenance items, and did not verify the three unmeasured queue claims (13, 15, and the audit's own §4 pointers) beyond what the docs say. Each of those is a batch, not a paragraph.

---

# 7. The live pass, 8 Sep 2026, production, desktop and tablet

*Run the same day on `scoopyscosting.vercel.app` (production, his data) on his instruction, signed in by him in the Cowork browser pane. Rules he was given and that were kept: reads unrestricted; writes only to objects named `ZZ-AUDIT …`; nothing that existed before was edited, relinked or deleted. **Left behind for him to delete: products `ZZ-AUDIT Bacon A` and `ZZ-AUDIT Bacon B`, ingredient `ZZ-AUDIT Bacon` (K0164), plates `ZZ-AUDIT Plate 1` and `ZZ-AUDIT Plate 2`.** Viewport 1360×900 for desktop, 900×1180 for tablet. Every number below was read from the app's own state or recomputed from it in the page; nothing is estimated.*

## Measured on his real data (read-only)

- **101 plates, 428 products (26 flagged not food), 163 ingredients, 90 dishes on two menus.** Line arms: 281 `{kid}`, **44 bare `{pid}` across 11 plates**, 62 `{misc}`. No orphans (every kid and pid resolves). So the 1 Aug figure of 84/179 has been worked down by hand to 44/387; it is not gone.
- **13 of the 44 bare-pid lines point at a product no ingredient points at any more**, which is the stale case exactly. Recomputed against the ingredient that now carries the same thing: **Bacon Bene, Ham Bene and Feta, Spinach & Mushroom Bene each under-cost their two eggs by $0.27** (bare line reads $0.28/egg off "Eggs - Ctn 600g"; the Eggs ingredient now costs $0.42 off "Eggs - 600g 15x1 Dozen"); **Pancakes — Plain over-costs its syrup by $0.37**; Feta Bene over-costs fetta by $0.16; Ham Bene under-costs ham by $0.05; Scoopy's Breakfast under-costs hash browns by $0.04; the three bacon lines happen to match to the cent because both bacon products are $12.20/kg today. All of these plates are on Ethen's Menu Oct 2026. **This is queue item 16, measured on the live menu three weeks before the relaunch.**
- **"Used in N plates" counts the kid arm only:** Bacon shows 15, and 18 plates cost bacon (three through bare lines).
- **62 plates carry a hand-typed misc line, 46 of them exactly $0.50 with no label, 11 at $0.20, 2 at $0.10.** These never move with any invoice. If it is packaging, it is a fixed cost pretending to be an ingredient; the weekly page must say so or exclude it.
- **`price_as_of` is empty on all 428 products, and a manual price edit does not set it.** `ingPriceLog` holds a single point for 52 products and a second point for only two (Apple Pie, Mayonnaise, both August). The changeLog holds 10 `ingredient_repointed`, 130 `plate_edited`, 51 `plate_created`, 0 invoice events. **Nothing on production shows an invoice ever moving a product price; the "Last change" column reads "—" on 163 of 163 ingredients.** The margin monitor's premise (prices move via invoices) is unproven on this venue's own data, which is the strongest single argument for running the week-1 spike on a practice's client rather than Scoopy's.
- **Dashboard "Average food cost 25.0%" is the mean of the 90 per-dish ratios.** The ratio of sums (total plate cost ÷ total sell price) is **26.4%** (Oct menu 214.44/805.50 = 26.6%, Add Ons 23.57/97.50 = 24.2%). A $0.36 Pineapple Fritter weighs the same as an $18.84 Ocean Bounty Box. Neither is wrong; the tile does not say which it is, and "5.0 pts under target" becomes 3.6 by the other reading. The weekly page has to pick one and print the word.

## Journeys, with the arithmetic checked

| Journey | Result |
|---|---|
| New product, negative pack size and price | Refused with an inline message. |
| New product (2 kg at $20 and $40) | Created; unit costs $0.01/g and $0.02/g; category written uppercase; **`is_custom` is `null` in memory until reload, `true` after** (C). |
| New ingredient linked to A | Created K0164; the modal's "Link to one of these?" suggested the real Bacon Middle product by name, which is good. A programmatic option click did not register (harness limitation, not a finding); the Use button did. |
| Two plates, 100 g and 200 g | $1.00 and $2.00, correct. **The builder added the same ingredient twice when both the option and Enter fired** (C: no duplicate-line warning). |
| Relink the ingredient A → B in the Ingredients modal | **Both plates moved to $2.00 and $4.00, change logged (`ingredient_repointed`, plates: 2), list re-rendered, persisted across reload.** The kid arm works exactly as the modal copy promises. **"Last change" stayed "—" although the ingredient's unit cost went $10 → $20/kg** (B: repoints are invisible in that column). |
| Edit product B's price $20 → $30/kg | Both plates $3.00 and $6.00; `ingPriceLog` gained a point; product row shows +50.0%; dashboard "What moved" shows it. Correct. |
| Reload | Everything above persisted; server is truth. |
| Negative quantity | Clamped to 0; save refused with "Enter a quantity for every ingredient"; the warning line reads **"1 item have no cost data"** (C, grammar). |
| **Negative misc cost** | **Accepted. Plate cost rendered "$-5.00", suggested price "—", Save enabled, and it SAVED: plate cost −$2.00 persisted to the database** (B: a negative plate lowers the dashboard average and nothing says so). Restored to $3.00 afterwards. |
| Add to a menu | Only existing menus offered; not used, to keep the real menus untouched. |
| Tablet 900 px, Dashboard and Plates list | Rail plus list, no horizontal overflow, no control under 32 px. Fine. |
| Tablet 900 px, builder | **Side cards (Total, Menu & category, Duplicate/Delete) stack under the docket at about half width with the right half empty, and the "Loaded" toast sits over the Duplicate button.** The 768–1023 band defect, confirmed on a real plate (B, already in `ui-audit-2026-09-02.md`). |
| Settings at 900 px | Lives under More; not reached by the harness's nav helper; untested. |

**Not tested, and why:** invoice upload (no invoice file can reach the pane); offline save; roles and invitations (needs a second account); restore; phone width (his instruction: desktop and tablet first); GST default switch; export/backup (downloads are blocked in the pane).

## What this adds to the proposed queue

- **16 stands, now measured on the live Oct menu** (§2 plus the eggs, syrup and fetta figures above). Grade A, unchanged.
- **New, B: a misc cost accepts a negative number and a plate saves with a negative cost.** Sites: the misc input in the builder (`#lines input[aria-label="misc cost amount"]`), `saveCurrentPlate`, and whatever the dashboard averages. What must be true: a misc line is ≥ 0 or is explicitly a credit and rendered as one; the average excludes or labels it.
- **New, B: "Last change" ignores ingredient repoints.** After K0164 moved from $10/kg to $20/kg the column read "—". What must be true: the column reflects the ingredient's unit cost changing by any route, or is renamed to say it is the product's invoice price.
- **New, B: the dashboard headline does not say which average it is.** 25.0% (mean of ratios) vs 26.4% (ratio of sums) on the same data today. What must be true: the tile names its method in four words, and the weekly page uses the same one.
- **New, C: 62 plates carry an unlabelled fixed misc line ($0.50/$0.20/$0.10).** Either label the convention once ("packaging") or the page treats misc as fixed cost.
- **New, C: `price_as_of` is never written.** Manual edits and (by the evidence) imports leave it empty; the weekly page needs a date per price.
- **New, C:** duplicate ingredient lines without a warning; "1 item have"; category `<select>` mixes valued and valueless options with a double-spaced "HERBS  SPICES"; product rows are `<button>`s with no accessible name; `is_custom` null until reload.
- **Reprioritised: the invoice path is the least-evidenced part of the whole engine on production.** Zero invoice events in the changeLog and one price point per product say the venue's own data cannot prove step 2 of the engine. That is why MM-1 should run on a practice's forwarded bundle first, with Scoopy's as the fallback, which the roadmap now says.

---

# 8. The hostile pass, same day: edge cases and visual breakage

*His instruction after §7: "really try and break things everywhere, not just the day-to-day flow, and break things visually." Same rules (ZZ-AUDIT objects only). One thing did leak into real data and is named first.*

## Clean-up he has to do, because the harness cannot

- **`price_history` holds a point at 2026-09-08 09:37 of 354.4%**, written when a ZZ-AUDIT dish was priced at $0.01. It is now the tallest point on the all-menus trend chart, the y-axis runs to 380%, and every real week since 24 Aug is a flat line along the bottom. The next point (25.1) was written when the price went back to $10, but the spike stays. **Delete that one row** (and `menu_price_history` for menu `MENUmtsh5o3t-1-9v3bvrqw`). Nothing in the app can.
- Delete: menu `ZZ-AUDIT Menu 🍔 <i>x</i> long …` (one dish on it), plates `ZZ-AUDIT Plate 1` and `ZZ-AUDIT Plate 2 with an extremely long name…`, ingredient `ZZ-AUDIT Bacon`, products `ZZ-AUDIT Bacon B` and `ZZ-AUDIT <img src=x onerror=…> A ‮evilxxx…` (233 characters, supplier `<b>ZZ</b>`).

## What broke

| Attack | Result | Tier |
|---|---|---|
| **One dish priced $0.01** (a typo for $10) | Menu pill "30000.0%", **dashboard headline 354.4%, "324.4 pts over target", the chart re-scaled to 380% flattening all real history, the sidebar badge 354.4%, Gemini "Needs attention" writing "swings 20000–30000%… your least predictable plate" and "Uncategorised sits at 958%", and a permanent point in `price_history`.** Mean-of-ratios with no outlier guard, a chart with no cap, and an append-only history with no undo. One keystroke on one dish rewrites every headline. | **A** (embarrasses in front of anyone, and it is exactly what a bookkeeper's client would do first) |
| Dish priced $0 | Accepted, rendered "—", excluded from the average. Fine. | |
| Dish priced negative | Refused, modal stays open. Fine. | |
| **Supplier combobox "Create new" popover in the Edit product modal** | **Renders at x=20 while the field is at x=401** (1360 wide), floating over the sidebar. `.cat-drop` inside the modal: the fixed-position containing-block class already recorded for the builder docket, now in a modal. | **B** |
| Product name 233 chars with `<img onerror>`, RTL override, and supplier `<b>ZZ</b>` | **No XSS: everything escaped**, in the row, the confirm banner, the supplier filter. Lists truncate with an ellipsis. The RTL override character is stored and rendered (name reads backwards after it). No length cap anywhere. | C (cap and strip bidi controls) |
| Menu name 125 chars with emoji and tags | Saved; the pill wraps to two lines and pushes the pill row; the page header prints the whole name. No cap. | C |
| Plate name 207 chars | Saved; list truncates cleanly. | C (cap) |
| Triple-click Save | One plate. Idempotent. | |
| Search with `(*[` | No crash, empty result. | |
| Esc on the edit-dish modal | Closes. | |
| Target food cost 250 and −5 | Refused, input has min 1 max 99, `cogsPct` unchanged. | |
| Negative misc cost | See §7: accepted and saved. | B |

## Visual, by width

- **1360, dark and light:** clean on Dashboard, Plates, Menu, Products, Ingredients, Settings. Light mode holds contrast on every screen checked.
- **1280:** builder two-column, correct.
- **1024 (the desktop breakpoint):** **builder side cards stack under the docket at about 45% width with the right half of the page empty; the "Loaded" toast covers "Clear plate".** `.bld-body` wraps when 480 + 280 + gap exceeds the row (about 1120 viewport with the 230 sidebar), and `.bld-rail` is capped at 340 "by design" (`css/style.css:925-937`). The comment calls the 340 rail deliberate; the empty right half between 1024 and ~1120 is not something the comment considered. Many laptops open the app in exactly this range. | B, extends the 768–1023 item upward |
- **900:** as §7.
- **Menu screen, long menu name:** pill row wraps; header runs full width.
- **Dashboard chart after one bad point:** see the first row above; this is the visual break that matters.

## What this adds to the queue

- **New, A: one mispriced dish must not move the headline by hundreds of points.** Sites: `avgFoodCostForScope`, the trend writer that appends to `price_history`, the chart's y-scale, the Gemini insight input. What must be true: a dish whose food cost is over some sane bound (say 300%) is shown on its own row as "check the price", excluded from the mean and from the history point, and the chart never rescales past 100%. And **a history point can be deleted or re-written from the app**, because today the only remedy is SQL.
- **New, B: the supplier "Create new" popover in Edit product is positioned against the viewport, not the field.** Same fix as `fixedContainingBlock` in the builder; measure inside the modal.
- **New, B: builder stacks with an empty right half from 1024 to ~1120 wide.** Either let the rail grow to fill (drop the 340 cap when wrapped) or move the wrap point down so 1024 stays two-column.
- **New, C:** caps on product, menu and plate names; strip Unicode bidi controls on save.

Everything else tried held. The app is hard to break through its inputs; it is easy to break through its arithmetic, which is the more expensive kind.

---

# 9. The fine visual pass, and the parser through the paste box

*Desktop at 1100 and 1360, dark, every screen and every modal reachable without a file. An automated overlap and clipping sweep (leaf text boxes intersecting, `scrollWidth` past `clientWidth` without an ellipsis, children escaping an `overflow:hidden` parent) found nothing on any screen except SVG axis labels and the chart's own delta annotation; the rest is by eye.*

## Minor visual defects, by screen

| Where | What | Tier |
|---|---|---|
| Builder, 1024–1200 wide | **Ingredient names truncate to seven characters ("Mushroo…", "Bread S…", "Hash Browns" on two lines) while the unit-cost chip keeps 110px.** `.bld-band` gives the name `minmax(0,1fr)` after four fixed tracks (`css/style.css` ~945); at a 480px docket the name gets ~130px. Give the name a floor (140px) and let the chip shrink first. | B |
| Builder, all widths | The qty input for a per-unit line ("Eggs 2 unit") sits further left than the qty inputs on gram lines, so the column of inputs is ragged by the width of the unit label. Right-align the input to the same edge and let the unit label vary. | C |
| Builder, 1024 and 900 | Side cards stack at ~45% width; "Loaded" toast covers Clear plate or Duplicate (§7, §8). | B |
| Dashboard chart | Two delta annotations ("−2.7 pts", "−2.7 pts") print on top of each other when two change markers land within a few days; a four-digit annotation ("−329.3 pts") is clipped by the SVG edge. Collide-avoid or drop the second. | C |
| Dashboard | "What moved" and "Dig in" cards are different heights in the same row; bottoms do not align. | C |
| Menu | The pill row is right-aligned and wraps under itself, while the search box is left; with three menus the two halves no longer share a baseline. A long menu name wraps the pill to three lines (§8). | C |
| Menu, scrolled | The sticky header bar overlaps the top row with no divider or shadow beneath it, so "SNACKS" reads half-cut. | C |
| Invoices | **The dropzone runs edge to edge with no page padding, touching the header bar and the sidebar; the privacy sentence and "Recent imports" block start at the raw content edge.** Every other screen has the 24px inset. | B |
| Settings, Account, Invoices | Content starts flush under the header bar with no top gap; Dashboard, Menu, Plates and Products have one. | C |
| Products | A row with a long name and a long brand truncates both in one line ("Bacon Middle Rindless Gas Flushed (QL… Caterers Ch…"). Acceptable, noted. | C |
| Ingredients | The "164 of 399 products have an ingredient" line floats between the header and the search as small detached text. | C |
| Set up from products | While the modal is open the page header behind it changes to "Close setup", a second close control behind a scrim. | C |
| Edit product | Supplier "Create new" popover renders at the screen's left edge (§8). | B |

## The parser, through "paste text manually"

Three pasted lines, `name, qty, price`, matched but **not applied**:

- `ZZ-AUDIT Bacon B 2kg, 2, 90.00` → read as name "ZZ-AUDIT Bacon B 2kg, 2", unit price $45/kg. The quantity column was swallowed into the name; if 90.00 was the line total the true figure is $22.50/kg. Flagged "price change — check", so a human sees it.
- `ZZ-AUDIT Widget 500g x 6, 1, 33.00` → **$16.50/kg; the right answer for 6 × 500g at $33 is $11.00/kg.** The `x 6` multiplier was not applied. `needManual:false, uncertain:false`. It sat under "3 need your eye" only because it matched ZZ-AUDIT Bacon at 67%; a real new product with a clean match would have shown a wrong number pre-ticked.
- `ZZ-AUDIT Bacon B, -1, 10.00` → negative quantity swallowed into the name, $5/kg. No credit-line handling.

The paste box does not carry a quantity column and the parser is the protected region, so none of this is a fix here; it is three rows for the parser evaluation harness that MAINTENANCE already asks for, and the strongest argument yet for MM-1 measuring subtotal reconciliation rather than field accuracy. Also observed: "Prices last updated: 29/08/2026" on the Invoices screen, so an import did run on 29 Aug, while `price_as_of` is empty and the change log holds no invoice event; the record of that import lives only in that one date.
