# EzPlate — working rules for Claude Code

EzPlate is a plate/menu **costing** PWA for cafés (tagline: "Plate costing made
easy"). It's live and used daily on real café data across several staff phones.
Treat every change as shipping to production. This file is the source of truth for
how to work in this repo — read it before making changes.

## What this app is (and is NOT)
- It does ONE job well: tell the owner what each plate costs and what to charge to
  hit their margin. Keep it simple and cheap.
- Do NOT build: inventory, staff scheduling, compliance, ordering, POS/accounting
  integrations, or multi-tenant auth — those are deliberately out of scope for now.
- Single-tenant today. Multi-tenant (Supabase Auth + RLS + per-account data) is a
  FUTURE step, on hold until the current app is stable. Do not start it unasked.

## Tech
- Vanilla HTML/CSS/JS, no framework. Files: `index.html`, `css/style.css`,
  `js/app.js`, `sw.js`, `manifest.json`, `icons/`.
- Data: Supabase (single source of truth) with a localStorage override layer.
- Hosting: Vercel auto-deploys on push to the main branch.

## NON-NEGOTIABLE rules
1. **Run the tests before you finish.** `npm test` must be green. The suite in
   `tests/` locks in the invoice parser and the ingredient pricing maths — the two
   areas that have regressed most. Never hand back a change with a red suite.
2. **Bump the service-worker cache** in `sw.js` (`ezplate-vN` -> `vN+1`) whenever
   you change `app.js`, `style.css`, or `index.html`. Installed phones will NOT get
   the update otherwise. This is the #1 cause of "my fix didn't show up".
3. **Don't touch the invoice parser or the pricing calc without running the tests.**
   These live in `js/app.js` (`parsePdfLine`, `packWeight`, `packCount`,
   `firstPairPrice`, `INV_EXCLUDE`, `packToUnitCost`). Small regex tweaks here have
   repeatedly broken previously-correct cases. If you change them, add a test case.
4. **`js/app.js` has some duplicate function definitions** (e.g. two `aRow`, two
   `renderAnalysis`). In JS the LAST definition wins. Before editing such a
   function, confirm which copy is active (search for all definitions) — editing the
   dead copy silently does nothing.
5. **Supabase writes go through the existing helpers** (`dbPushIngredient`,
   `dbPushMenu`, `dbPushPlate`, `pushWrite`, etc). Keep the full-table sync lean:
   store URLs/strings, never image blobs, in the synced tables.
6. **Child-simple UX.** The user is a chef, not a coder. Prefer fewer fields, fuzzy
   dropdowns that reuse existing values (avoid duplicate brands/categories), and
   clear inline validation over silent defaults.

## When you change something visual (CSS/layout)
Static review does not catch overflow/spacing/centering bugs — the invoice cards,
print docket, and dropdowns have each regressed this way. After a visual change,
run the screenshot check (`npm run shots`, see `tests/visual/`) and actually LOOK at
the images at both mobile (~380px) and desktop widths before saying it's done.

## Known-good cases you must not break (the tests enforce these)
- Invoice: `CHIPS 6x2.5kg CTN 8 ...` -> ~$2.68/kg; `CHEESE ... 105'S ...` ->
  ~$0.2028/unit; `Fuel Levy` line -> excluded; qty>1 lines price per-pack, not the
  quantity-inflated line total.
- Pricing: 10 kg pack for $65 -> $6.50/kg (NOT $65/kg).

## How to finish a task
1. Make the change. 2. `npm test` (green). 3. If visual, `npm run shots` and review.
4. Bump the sw.js cache version. 5. Summarise what changed, what you verified, and
anything you could NOT verify (e.g. live Supabase round-trips).
