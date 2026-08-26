/*
 * targets.js — WHAT the mutation gate mutates, and WHICH test files are supposed to notice.
 *
 * This is deliberately a short list rather than the whole of js/app.js. A repo-wide mutation score
 * is a number nobody acts on; the queue item that commissioned this gate scoped it away on purpose.
 * The list is the code this project has already been burned on: the guards, the persistence
 * sequencing, the row boundary and the invoice referee.
 *
 * `tests` is a CLAIM, and the gate exists to check it. A target's mutants are run against ONLY these
 * files, so "killed" means the file whose name says it pins this really does. If a mutant is killed
 * somewhere else in the suite that is not good enough — the day someone deletes the file named here,
 * the guard is unpinned and nothing says so.
 *
 * Adding a target is cheap and expected: any function whose correctness is load-bearing and whose
 * test file you would be uneasy to see deleted belongs here.
 */

const targets = [
  /* 197 — THE INVOICE PRICING CHAIN, and the reason it is at the top of this list rather than
     appended to it. Until this batch NOT ONE target computed a price, a cost, a food-cost
     percentage or a trend point; the list was "the code this project has already been burned on",
     which is a record of past burns and not a ranking of consequence. A blind code audit and a
     blind process audit, run the same day with no shared context, converged on exactly that gap:
     the process auditor predicted it from the shape of this file, and the code auditor walked into
     it and returned a GST defect storing every taught-pack line 10% high. This file's own sentence
     is the diagnosis — "a function that is not a target has never been asked the question."
     invGstAdjust owns the only divisor in the app; buildInvRows is the ASSEMBLY, and the assembly
     is where the defect lived while every part of it was individually correct and individually
     tested. Widening this to the rest of the pricing surface is QUEUE.md item 0c.
     0e: TWO test files now, and the second is not decoration. invGstAdjust took an optional `mode`
     when the catalogue importer turned out to be a fifth price path, and the two arms of that
     argument are pinned in different files — the invoice suite pins the OMITTED arm (fall back to
     the invGst global), the catalogue suite pins the EXPLICIT arm and, because it is extracted
     with no such global in scope, pins that the importer never reaches for it. Listing one file
     would leave whichever arm it does not cover unasked, which is this list's own stated failure
     mode one level down. */
  { fn: 'invGstAdjust', tests: ['invoice-gst.test.js', 'catalogue-import.test.js'] },
  /* Both extracted from inline code DURING this batch, and both are on this list for 195's reason:
     a function that is not a target has never been asked the question, and neither of these existed
     to be asked until the second review found the defects they now hold. invReResolve owns the
     convert-ONCE condition (dropping it re-creates a silent 9%-low price that PRICE_JUMP cannot
     see); invDerivePackQty owns the shared-tax-basis rule for deriving a pack SIZE. */
  /* 0b — THE UNIT GUARD, three functions, and they are targets from the hour they were written
     rather than after something got past them. That is 184's lesson: a function that is not a
     target has never been asked the question, and the cheapest moment to add one is the moment it
     acquires a test worth protecting.
     invPriceUnit is the load-bearing one and is the smallest. It answers "which unit does this row
     get STORED in", and applyInvoice's write and invUnitRebase's guard BOTH call it — that shared
     call is the whole reason a taught pack can no longer re-base a product behind the guard's back.
     Flip either arm of its ternary and the guard starts asking about a unit nobody writes. */
  { fn: 'invPriceUnit', tests: ['inv-unit-rebase.test.js', 'inv-unit-rebase-apply.test.js'] },
  { fn: 'invUnitRebase', tests: ['inv-unit-rebase.test.js', 'inv-unit-rebase-apply.test.js'] },
  { fn: 'invPackUnitOpts', tests: ['inv-unit-rebase.test.js', 'inv-rowmarkup.test.js'] },
  { fn: 'invReResolve', tests: ['invoice-gst.test.js'] },
  { fn: 'invDerivePackQty', tests: ['invoice-gst.test.js'] },
  // ── The guards. `isFinite('')` is TRUE, so these are the lines a blank field walks through. ──
  /* 193: this was `setProduct`, and it MOVED rather than gained a sibling. setProducts is the
     implementation and setProduct is now a one-line delegate to it — and a one-line delegate yields
     ZERO mutants, which this gate reports as nothing at all rather than as a problem. Leaving the
     target on the delegate would have silently unpinned the had==null guard, the samePrice call and
     the flush, which is the same shape as 188: an assertion that quietly stopped being able to fail
     because something else moved underneath it. */
  { fn: 'setProducts', tests: ['price-log-paths.test.js', 'pack-survives.test.js', 'cat-label.test.js', 'bulk-product-writes.test.js'] },
  /* 193: the writer the plural exists FOR. Its chunk boundary and its stop-at-the-first-failure fold
     are the difference between "the catalogue saved" and "some of the catalogue saved and nobody was
     told which" — and neither is visible to any test that stubs the network. */
  { fn: 'dbPushIngredients', tests: ['bulk-product-writes.test.js'] },
  { fn: 'logIngPrice', tests: ['price-log-paths.test.js'] },
  { fn: 'samePrice', tests: ['price-log-paths.test.js'] },

  /* 195: the pdf.js loader, added because its pre-push review found the batch's OWN new tests
     could not fail. Every assertion written for it was a source grep, so deleting `res()` from the
     import() success arm left all of them green — and the shipped result is worse than the error
     they did cover: the promise never settles, extractPdfText awaits it forever, and picking a PDF
     hangs the upload with no toast and nothing in the console. The fix was three tests that RUN the
     function; this target is what keeps them honest, since "a function that is not a target has
     never been asked the question". */
  { fn: 'ensurePdfjs', tests: ['third-party-pins.test.js'] },

  // ── The invoice referee. A late Gemini answer must not be merged over a ruling the user made. ──
  { fn: 'invConfirmState', tests: ['invoice-gate.test.js'] },
  { fn: 'invRowState', tests: ['invoice-gate.test.js', 'inv-rowmarkup.test.js'] },
  { fn: 'flagNeedsAttention', tests: ['inv-attention.test.js'] },

  // ── The publish decision and the delete guards. Two row-creating paths share publishPlan. ──
  // 185: the tenant gate. It fails OPEN on purpose — only an unambiguous null gates the app — so
  // both halves of that condition are exactly the kind a mutant flips into a false alarm that locks
  // a legitimate user out of a working café.
  { fn: 'tenantGateState', tests: ['tenant-gate.test.js'] },
  // 186: which SCREEN a null tenant gets. Once the anon fallback is gone, a signed-out visitor and
  // a signed-in non-member answer identically and only this tells them apart — so a mutant that
  // reads a user off a FAILED session read, or drops the error check, shows a stranger "ask the café
  // owner to add this account" and hands a non-member a form that cannot help them.
  { fn: 'sessionUser', tests: ['tenant-gate.test.js'] },
  // 186: the one sign-in sequence, worn by two forms. Its blank guard is what keeps an empty
  // password off the network, and its two settle paths are what keep the button alive on the one
  // screen with nothing else on it.
  { fn: 'authSubmit', tests: ['auth.test.js'] },
  // 188: the role. Every one of these defaults the OPPOSITE way to the tenant gate above — the
  // server refuses a non-owner regardless, so the client's job is to avoid offering a button that
  // fails, and being wrong toward "owner" costs a toast while being wrong toward "staff" hides four
  // controls from the person who owns the café with nothing on screen to explain it. A mutant that
  // flips `businessRole!=='staff'` into `==='staff'`, or turns roleState's strict equality into
  // something looser, does exactly that — and a single-tenant production database, where the one
  // account IS the owner, cannot tell the difference.
  { fn: 'roleState', tests: ['roles-client.test.js'] },
  { fn: 'isOwner', tests: ['roles-client.test.js'] },
  { fn: 'ownerOnly', tests: ['roles-client.test.js'] },
  { fn: 'applyRoleUi', tests: ['roles-client.test.js'] },
  // The two whose visibility is owned elsewhere, so the role condition lives inside THEM. Both
  // carry a second condition that predates this batch (a plate must be loaded; a menu must exist),
  // and a mutant that swaps the `&&` for an `||` restores the control for staff while leaving the
  // word `isOwner` sitting in the source, reading correctly.
  { fn: 'syncBuilderPlateActions', tests: ['roles-client.test.js', 'builder-page.test.js'] },
  { fn: 'updateMenuDelBtn', tests: ['roles-client.test.js'] },
  // The second door to a plate delete. Its guard is conditional on `sp` on purpose — with no plate
  // the same button only unpublishes a dish, which staff may do — so both halves need proving.
  { fn: 'openDelChoice', tests: ['roles-client.test.js'] },

  // 192: invitations. Every one of these decides whether somebody gets INTO a café or is kept out,
  // and all four failure modes are silent — which is why they are on the list rather than trusted.
  // claimState: a wrong 'joined' re-syncs forever behind a spinner, a wrong 'none' leaves an
  // invited person staring at "ask the café owner to add this account" after they were added.
  { fn: 'claimState', tests: ['invites-client.test.js'] },
  // teamWriteLanded: the measured silent no-op. A blocked DELETE on business_invites returns HTTP
  // 200 having changed NOTHING (191's rehearsal, as staff), so `!res.error` is not a landing — a
  // mutant that loosens this reports a revoke that did not happen, with the row still live.
  { fn: 'teamWriteLanded', tests: ['invites-client.test.js'] },
  // authSignUpGated: the ONE thing standing between "invited people may sign up" and self-service
  // sign-up, which Max declined. Flipping its `!g.data` opens the gate to every address.
  { fn: 'authSignUpGated', tests: ['auth.test.js'] },
  // authInvitePending: and the narrowing underneath it. `=== true` is what stops a truthy shape
  // change — a row object, a string — reading as an invitation.
  { fn: 'authInvitePending', tests: ['auth.test.js'] },
  // loadTeam: its owner check is what keeps a list read as owner from surviving into a staff
  // session, and its error branch is what stops half a card painting as "nobody is invited".
  { fn: 'loadTeam', tests: ['invites-client.test.js'] },
  // submitInvite: the two duplicate guards and the landed check, all of which fail quietly.
  { fn: 'submitInvite', tests: ['invites-client.test.js'] },

  // 193: the catalogue importer's decision layer. Every one of these fails by producing a PLAUSIBLE
  // WRONG NUMBER rather than by throwing, on the one path a new café takes before it knows enough to
  // doubt what it sees — a whole catalogue costed 6x out is indistinguishable, on screen, from a
  // catalogue costed correctly.
  // catImportPlan: the create-vs-update decision (a wrong answer duplicates a café's whole
  // catalogue on the second import), the refusals, and the fold of repeated lines.
  { fn: 'catImportPlan', tests: ['catalogue-import.test.js'] },
  // catNum: this batch's instance of isFinite('') — a catalogue CSV is mostly blank cells, and a
  // blank that became 0 is a free product AND a fabricated $0.00 point in ing_price_history.
  { fn: 'catNum', tests: ['catalogue-import.test.js'] },
  // catPackSize: "6X2.5KG". The x-multiplier branch was written wrong first and its own test caught
  // it within a minute; the branch is one regex and one multiplication, both silent when wrong.
  { fn: 'catPackSize', tests: ['catalogue-import.test.js'] },
  // parseCsvTable: the quote state machine. Getting it wrong splits a description on its own comma
  // and shifts every column after it — which imports prices into the wrong products.
  { fn: 'parseCsvTable', tests: ['catalogue-import.test.js'] },
  // catPresetFor: a false positive here maps the wrong columns onto the right-looking fields.
  { fn: 'catPresetFor', tests: ['catalogue-import.test.js'] },
  // Added on the pre-push review's prompting — it noted these three had example coverage but no
  // gate. They are simple, which is the usual reason a function is left off the list and is not a
  // reason: catUnit decides whether a price is per kilo or per unit, catGuessMap decides which
  // column an unrecognised file's price comes from, and csvSniffDelim decides whether the file
  // parses at all. All three fail silently and all three are two lines to add.
  { fn: 'catUnit', tests: ['catalogue-import.test.js'] },
  { fn: 'catGuessMap', tests: ['catalogue-import.test.js'] },
  { fn: 'csvSniffDelim', tests: ['catalogue-import.test.js'] },

  { fn: 'publishPlan', tests: ['publish-guard.test.js'] },
  { fn: 'productRefs', tests: ['product-delete-guard.test.js'] },
  { fn: 'canDeleteMenu', tests: ['menu-fallback.test.js'] },
  { fn: 'fallbackMenuId', tests: ['menu-fallback.test.js', 'menu-default.test.js'] },
  // 184: the OTHER axis' resolver. menuIdOf answers which menu a dish is on, and it used to answer
  // 'MENU_ORIGINAL' for a dish on none — a menu row only Scoopy's has. Twenty call sites read it.
  { fn: 'menuIdOf', tests: ['menu-default.test.js'] },

  // ── The write sequence. Dispatching in the right order is not sequencing; a test that records
  //    call ORDER passes against the broken code, which is exactly what a mutant can prove. ──
  //    push-write.test.js is NEW in 180: the gate's first run showed that every file naming
  //    pushWrite STUBS it — two of them stub it to throw — so nothing was running its body at all.
  { fn: 'pushWrite', tests: ['push-write.test.js'] },
  { fn: 'dbPushMenuAfterPlate', tests: ['publish-guard.test.js', 'menu-plate-order.test.js', 'plates-independence.test.js'] },
  { fn: 'dbDeletePlateAfterDishes', tests: ['delete-sequencing.test.js'] },
  // 184: the third sequenced write, and the newest. A cafe with no menu row cannot have a dish, so
  // the menu insert must be CONFIRMED before the dish write is issued — menu_items.menu_id is a FK.
  { fn: 'ensurePublishMenu', tests: ['menu-default.test.js'] },
  { fn: 'withPublishMenu', tests: ['menu-default.test.js'] },
  // 190: the THIRD caller of that machinery, and the one a brand-new cafe reaches first. It was
  // stubbed in three test files and pinned by none, which is 184's lesson restated: a function that
  // is not a target has never been asked the question. Two of its branches are the ones that matter
  // — a null id must open no dialog, and a confirmed id must repaint the Menu tab as well as this
  // modal — and both are invisible until the cafe has no menus, which production never has.
  { fn: 'renderManageMenusZero', tests: ['onboarding-zero.test.js'] },

  // ── The row boundary. camelCase in memory, snake_case in the schema; getting it wrong once cost
  //    76 of 77 dishes with no error raised. ──
  { fn: 'rowToMenu', tests: ['row-boundary.test.js', 'plates-independence.test.js'] },
  // 184: the WRITE half was the one that could raise 23503 — it fabricated a menu id out of a null
  // and sent it to a foreign key column. Added the day that was fixed; it was never targeted before.
  { fn: 'menuToRow', tests: ['row-boundary.test.js', 'plates-independence.test.js'] },
  { fn: 'plateToRow', tests: ['row-boundary.test.js', 'restore.test.js'] },
  { fn: 'parseBackupFile', tests: ['restore.test.js'] },
  { fn: 'backupToPayload', tests: ['restore.test.js'] },

  /* ── 0c: THE PRICING SURFACE. Four here, and the number is small ON PURPOSE — these are the ones
     that were ALREADY at zero survivors the moment they were measured. Their test files were doing
     the work all along; nothing had ever asked them the question.
     The rest of the surface is measured, not guessed, and it is written down in `pending` at the
     bottom of this file with a survivor count each. That is the honest state: this batch made the
     gate able to be pointed at the numbers and pointed it at everything, then promoted what was
     ready. Promoting the rest is test-writing, and a target promoted before its coverage exists
     makes the gate exit 1 on main and block every push — which gets the gate disabled, the failure
     mode this file has been avoiding since gemApplyReadings.
     `cpbu` and `fmtTargetPct` are deliberately NOT here and never can be: both are one-expression
     functions that yield ZERO mutants, so a target on them would report nothing at all rather than
     nothing wrong. Same shape as the setProducts delegate above. */
  { fn: 'packToUnitCost', tests: ['pricing.test.js', 'price-log-paths.test.js', 'catalogue-import.test.js'] },
  { fn: 'unitToBaseFields', tests: ['ingredient-unit.test.js', 'price-log-paths.test.js'] },
  { fn: 'packPriceOf', tests: ['pack-survives.test.js', 'invoice-gst.test.js'] },
  { fn: 'menuMarginPreview', tests: ['menu-margin.test.js'] },
  { fn: 'invGstDetect', tests: ['invoice-gst.test.js'] },
  { fn: 'costAtLines', tests: ['dash-digin.test.js'] },
  { fn: 'unitCatCategory', tests: ['ingredient-unit.test.js', 'king-repoint.test.js', 'product-pack.test.js'] },
  { fn: 'derivePackPrice', tests: ['product-pack.test.js', 'pack-survives.test.js', 'ingredient-unit.test.js'] },
  /* 0c (batch 202): `plate-cost.test.js` ALONE, and the four files first written here are the
     finding rather than an oversight. `kpi-strip`, `dash-digin`, `builder-page` and `publish-guard`
     all mention costFromLines and all four REPLACE IT WITH A STUB — none of them is about plate
     costing, so their stubs are correct where they are. A `tests:` list naming them would read as
     coverage while the function was executed by nothing, which is this file's own stated failure
     mode: "the day someone deletes the file named here, the guard is unpinned and nothing says so."
     A file that never ran it cannot be unpinned; it was never pinning anything. */
  { fn: 'costFromLines', tests: ['plate-cost.test.js'] },
  { fn: 'analyze', tests: ['menu-margin.test.js', 'kpi-strip.test.js', 'dash-digin.test.js'] },
  /* 0c (batch 203). buildInvRows was measured at 12 survivors in 201 and held in `pending`; the
     twelve are killed in inv-chain.test.js §5, and TWO of them were reachable only after the
     harness stopped stubbing flagNeedsAttention as a no-op. A no-op stub of a real, pure function
     makes "delete the call" and "keep the call" the same program — see the note in tests/_extract.js. */
  { fn: 'buildInvRows', tests: ['invoice-gst.test.js', 'inv-chain.test.js'] },
  /* 0c (batch 203): `supplier-memory.test.js` ALONE, and the two files this line USED to name are
     the finding rather than an oversight — the same shape as costFromLines above, on a second
     function. `invoice-gst.test.js` and `pack-survives.test.js` were the declared tests while the
     gate reported 24 mutants and ZERO kills, because neither one ever calls it. They mention it.
     A file that never ran it was never pinning it, so removing it unpins nothing. */
  { fn: 'applySupplierMemory', tests: ['supplier-memory.test.js'] },
  /* 0c (batch 204). Measured at 24 survivors in 201 and held in `pending`; twenty are killed in
     matched-price.test.js and four are allowed below. Unlike applySupplierMemory above, the four
     files already named here DO exercise it — 31 of its 55 mutants died against them before this
     batch — so the new file is ADDED rather than replacing them. What it reaches that they do not
     is the part no other subject leads through: the memory arm's unit spellings, the fall-through
     to manual, and the four provenance fields written at the end. */
  { fn: 'resolveMatchedPrice', tests: ['product-pack.test.js', 'pack-survives.test.js', 'ingredient-unit.test.js', 'invoice-gst.test.js', 'matched-price.test.js'] },
];

/*
 * Mutants that survive ON PURPOSE. Each needs a reason another person could disagree with — "it is
 * equivalent" is a claim, not a reason, so say WHY it is equivalent.
 *
 * `key` is `fn :: the source line, trimmed :: op from>to #nth-on-that-line`. It carries no line
 * number by design: line numbers in js/app.js drift every batch, and a stale allowance that quietly
 * matched a different mutant would be the same false green this gate exists to stop. Edit the line
 * and the allowance stops matching — the survivor comes back and gets re-judged.
 *
 * The gate also fails on a STALE allowance (its mutant is now killed, or gone). An allowance nobody
 * removes is how a list like this rots into permission to ignore everything.
 */
const allowedSurvivors = [
  /* 197 — invDerivePackQty. TWO allowed, and a third was NOT: `derived > 0` -> `>= 0` is a real
     distinction (a $0.00 invoice line is a freebie or a credit, and it must derive no pack size
     rather than a pack size of zero), so invoice-gst.test.js kills it with exactly that line.
     ⚠️ Read 193's note below before adding to this list. Both of these were reasoned to a specific
     reachable input and found unreachable; neither is "unlikely", which is not the bar. */
  /* 0c (batch 202) — analyze. TWO allowed out of five survivors; the other three are killed in
     menu-margin.test.js. Both of these were checked by ENUMERATION rather than by argument: the real
     function was compared against each mutant across every pairing of
     [0, -0, 1, 5, -1, -5, 0.001, 1e-9, NaN, Infinity, -Infinity, null, undefined] for both
     arguments — 169 cases each — and neither produced a single differing result. */
  {
    key: "analyze :: const suggested = cost>0 ? cost/foodTarget() : 0;   // sell price at the target food cost :: relational >>>= #0",
    reason: 'cost>0 -> cost>=0 changes only cost===0 and cost===-0, and for both the two branches compute the '
      + 'same value: 0/foodTarget() is 0, which is what the false branch returns anyway. foodTarget() cannot '
      + 'be 0 (cogsPct is clamped to [1,99]), so the quotient is never NaN. Zero differences across 169 '
      + 'enumerated pairs. The ternary is worth keeping as the statement that a plate with no cost has no '
      + 'suggested price, rather than as arithmetic that happens to agree.',
  },
  {
    key: "analyze :: if(!menuPrice || menuPrice<=0 || suggested<=0) :: relational <=>< #0",
    reason: 'menuPrice<=0 -> menuPrice<0 changes only menuPrice===0 and -0, and `!menuPrice` one clause earlier '
      + 'already catches both — as it catches NaN. For NUMBERS the clause is fully shadowed: no number is '
      + 'truthy and <= 0. It earns its place against a non-numeric price arriving from data (the string "0" '
      + 'is truthy), which is belt-and-braces on the money path rather than a reachable case today. Zero '
      + 'differences across 169 enumerated pairs. ⚠️ If menuPrice ever becomes a string anywhere, this stops '
      + 'being an allowance and becomes a test.',
  },
  /* 0c (batch 202) — derivePackPrice, and it is the SAME SHAPE as the invDerivePackQty allowance
     below, on the same kind of guard, which is why it is allowed rather than argued with. Eleven of
     this function's twelve survivors were killed by tests in this batch; this is the twelfth. */
  {
    key: "derivePackPrice :: var qty=parseFloat(packQty); if(!(qty>0)) return null; :: relational >>>= #0",
    reason: 'qty>0 -> qty>=0 is equivalent, proved by ENUMERATION rather than by argument: the only values '
      + 'where the two disagree are 0 and -0 (NaN is false under both), and for every unit and every pack '
      + 'price the arithmetic that follows divides by zero — pack/0 is Infinity, pack/-0 is -Infinity, 0/0 is '
      + 'NaN — so `!isFinite(unitPrice) || unitPrice<0` returns null one line later. Same return value, same '
      + 'caller behaviour, nothing observable to assert. The first guard is still worth keeping: it states the '
      + 'intent where a reader looks for it and refuses before doing arithmetic, rather than relying on a '
      + 'downstream check that exists for a different reason.',
  },
  /* 0c (batch 204) — resolveMatchedPrice. THREE allowed out of twenty-three; the other twenty are
     killed in matched-price.test.js. All three are the SAME `>` -> `>=` shape on a positive-quantity
     guard that this file now carries five times over (derivePackPrice, invDerivePackQty,
     applySupplierMemory and the two below), and the reason is the same every time: a later guard
     catches everything the first one lets past. That is worth naming as a pattern rather than
     re-arguing — the app is written defensively on the money path, and defence in depth is exactly
     what produces equivalent mutants on the outer layer. Each was still proved by ENUMERATION over
     the inputs where the two operators actually disagree, because the pattern is not the proof. */
  {
    key: "resolveMatchedPrice :: if(product && product.pack_qty>0 && product.pack_unit){        // 1) the product's taught pack wins :: relational >>>= #0",
    reason: 'pack_qty>0 -> pack_qty>=0 admits the values that coerce to zero — 0, -0, "", "0", null, false, '
      + 'an empty array — and derivePackPrice refuses every one of them on its own first line '
      + '(`var qty=parseFloat(packQty); if(!(qty>0)) return null`), so `if(d)` is false and no source is '
      + 'chosen either way. PROVED rather than argued: the ten coercing values x nine pack_unit '
      + 'spellings were filtered to the 90 pairs where the two operators genuinely disagree, and the '
      + 'resolved row was deep-compared against the same row resolved with no product at all — '
      + 'identical on all 90. The `>` still earns its place: it states the precondition where a reader '
      + 'looks for it, one line above the arithmetic, rather than in a callee.',
  },
  {
    key: 'resolveMatchedPrice :: if(!chosen && mem && parseFloat(mem.qty)>0){                    // 2) then supplier memory for this phrase :: relational >>>= #0',
    reason: 'parseFloat yields a number or NaN, and NaN is false under both operators, so the two differ '
      + 'only where mem.qty parses to 0 or -0. For those the mutant enters the memory block and the '
      + 'INNER `q>0` two lines down — the same expression again — turns it straight back, leaving '
      + 'chosen null. PROVED by enumeration: eight zero-parsing qty spellings x seven unit spellings x '
      + 'three raw lines (priced, unpriced, $0.00), filtered to the 168 that disagree, each compared '
      + 'against the same row resolved with no memory — identical every time.',
  },
  {
    key: 'resolveMatchedPrice :: if(pack!=null && q>0){ :: relational >>>= #0',
    reason: 'q IS parseFloat(mem.qty), and the guard two lines above has already required that exact '
      + 'expression to be > 0 — so the only inputs on which `q>0` and `q>=0` differ are inputs this '
      + 'block cannot be entered with. The mutant is unreachable rather than merely harmless, which is '
      + 'a stronger claim than the two above and a weaker piece of code: the inner test is fully '
      + 'redundant with the outer one. ⚠️ It is REDUNDANCY, not dead weight — the two guards are ten '
      + 'lines apart and either could be edited alone — but if the outer one is ever loosened, this '
      + 'allowance stops being true and the mutant must be re-judged rather than carried forward.',
  },
  /* 0c (batch 203) — buildInvRows and applySupplierMemory. THREE allowed out of thirty-six; the
     other thirty-three are killed in inv-chain.test.js §5 and supplier-memory.test.js. Every one of
     the three was proved by RUNNING the real and mutated forms side by side over an enumerated
     input set, not by arguing that a difference is unlikely — the bar this list sets for itself. */
  {
    key: 'applySupplierMemory :: if(pack==null || !(qty>0)) return row; :: relational >>>= #0',
    reason: 'qty>0 -> qty>=0 is equivalent, and it is the THIRD instance of the same shape in this file '
      + '(derivePackPrice and invDerivePackQty above) for the same reason: a later guard catches '
      + 'everything the first one now lets past. Only 0 and -0 can distinguish the two operators — for '
      + 'every other value, including NaN, the comparisons agree by definition — and for both of those '
      + 'the division that follows yields Infinity, -Infinity or NaN, so `!isFinite(unitPrice)` returns '
      + 'the row two lines later. PROVED rather than argued: the real and mutated guards were run over '
      + 'qty in [0, -0, NaN] x ten unit spellings x six pack prices (0, 0.01, 1, 21, 55, 1e308) — 180 '
      + 'cases, zero differing results. The first guard still earns its place: it states the intent '
      + 'where a reader looks for it, and refuses before doing arithmetic rather than after. '
      + 'tests/supplier-memory.test.js pins the OUTCOME (a zero or nonsense pack prices nothing) and '
      + 'says at its own site that it cannot discriminate which of the two guards produced it.',
  },
  {
    key: 'buildInvRows :: if(!row.addNew && row.bestId){                                // matched line: product pack > supplier memory > parser (+ unit guard) :: logical &&>|| #0',
    reason: 'The two operands cannot disagree, because the two lines immediately above compute them from '
      + 'the same number: addNew=(top<0.3), and bestId=(addNew?null:cands[0].id). So addNew===true '
      + 'implies bestId===null and addNew===false implies a real id — top>=0.3 is only possible with a '
      + 'non-empty candidate list. That leaves exactly two reachable pairs, (true,null) and (false,id), '
      + 'and && and || agree on both. PROVED by enumeration over the candidate lists the ranker can '
      + 'produce (empty, and coverage 0 / 0.29 / 0.3 / 0.6 / 1): two distinct pairs, zero differences. '
      + 'The && is worth keeping as the statement that this branch needs BOTH facts — it is one line '
      + 'away from the code that couples them, and a reader should not have to re-derive that. '
      + 'tests/inv-chain.test.js pins the coupling itself ("addNew and bestId move together"), which is '
      + 'the real invariant; if that ever breaks, this allowance is wrong and that test goes red first. '
      + '⚠️ It also rests on a product id never being FALSY — an id of \'\' or 0 would make bestId falsy '
      + 'with addNew false, which is the one pair the operators disagree on. True everywhere here (ids are '
      + 'uuids, or the CX/IMP-prefixed client mints) and not enforced by this function; noted because an '
      + 'allowance is only as wide as the case it reasons about.',
  },
  {
    key: 'buildInvRows :: } else if(row.needManual && mem){                            // no-match / manual line keeps v20 memory behaviour :: logical &&>|| #0',
    reason: 'Both operands are re-checked by the callee: applySupplierMemory opens with '
      + '`if(!row || !mem || !row.needManual) return row`, so calling it with either one falsy is a '
      + 'no-op. The mutant therefore makes the same call in more cases and every extra call does '
      + 'nothing. PROVED by running the REAL applySupplierMemory under both conditions across six mem '
      + 'shapes (null, undefined, two valid packs, a zero pack, an empty object) x needManual true and '
      + 'false x three incoming prices — 36 cases, deep-equal rows every time. '
      + '⚠️ THIS ALLOWANCE RESTS ON ANOTHER FUNCTION, which is the failure mode 193 recorded here when '
      + 'two setProduct allowances turned out to be reasoning about a case they had not checked. What '
      + 'holds it up is that those two guards are now PINNED — tests/supplier-memory.test.js asserts '
      + 'both directly ("a row that already parsed is NEVER re-priced", "no memory is a safe no-op"), '
      + 'so removing either one goes red there before this allowance can go quietly wrong.',
  },
  {
    key: "invDerivePackQty :: if(pack==null || !(typeof entered==='number' && isFinite(entered) && entered>0)) return null; :: relational >>>= #0",
    reason: 'entered>0 -> entered>=0 is equivalent because the NEXT guard catches everything it lets past: '
      + 'entered===0 makes derived = pack/0 = Infinity, and `!isFinite(derived)` returns null one line later. '
      + 'Same return value, same caller behaviour, no observable difference. Killing it would require deleting '
      + 'the second guard as well, and a branch only reachable once another branch is removed is redundancy '
      + 'rather than uncovered code — which is the belt-and-braces this function wants, now that it is '
      + 'exported and callable from a test and cannot assume its caller checked anything.',
  },
  {
    key: 'invDerivePackQty :: return (Math.abs(derived-Math.round(derived))<=0.02) ? Math.round(derived) : derived; :: relational <=>< #0',
    reason: 'The two differ only when |derived - round(derived)| is EXACTLY 0.02. derived is pack/entered, both '
      + 'read from money strings with two decimals, so hitting that boundary means landing on one representable '
      + 'double at the end of a division. A test pinning it would assert an IEEE-754 coincidence wearing this '
      + 'function as a costume — the same argument samePrice carries below, for the same reason.',
  },
  /* ⚠️ TWO `setProduct ::` ALLOWANCES WERE DELETED HERE IN 193, AND ONE OF THEM WAS WRONG — worth
     recording, because a wrong allowance is the quietest failure this gate has: it turns a mutant
     the gate DID catch into one nobody looks at again, and unlike a stale one it is never reported.

     The first claimed that `Object.assign({}, productsById[id]||{}, patch)` and `…&&{}` cannot be
     told apart, reasoning only about the case where the product is ABSENT. With the product
     PRESENT, `x&&{}` evaluates to `{}`, so the assign becomes `Object.assign({}, {}, patch)` and
     every field the patch does not mention is WIPED — a price-only invoice write erasing the
     description, supplier and taught pack of every product it touches. It was always killable; it
     just needed an assertion that a partial patch MERGES, which tests/bulk-product-writes.test.js
     now carries. The second is killed by that file too, by passing an entry with no patch at all.

     The transferable bit: an allowance's argument is only as wide as the case it reasons about, and
     "no input distinguishes them" is a claim about EVERY input. Neither had been re-checked since
     the day it was written. */
  /* The same equivalent-mutant shape as the parseCsvTable one below, twice more, and PROVED the
     same way rather than argued: real vs mutated run side by side over a spread of inputs, deep-equal
     every time. Reading one index past the end yields undefined (or '' for a string), which matches
     nothing and appends nothing, so the extra pass is a no-op before the loop ends. */
  {
    key: 'csvSniffDelim :: for(var i=0;i<firstLine.length;i++){ :: relational <><= #0',
    reason: 'One extra pass reads firstLine.charAt(length), which is the empty string — it equals none of the '
      + 'four candidate delimiters and is not a quote, so neither the count nor the quote state changes. '
      + 'Run against 11 header lines (empty, single-field, each delimiter, quoted separators, ties): identical '
      + 'answers on all 11.',
  },
  {
    key: 'catGuessMap :: for(var i=0;i<g.any.length;i++){ :: relational <><= #0',
    reason: 'One extra pass reads g.any[length] === undefined, and norm.indexOf(undefined) is -1, so the '
      + 'branch never fires and the loop falls out to the same blank assignment. Run against 8 header sets '
      + '(empty, no-match, full match, blanks, duplicates-competing): identical maps every time.',
  },
  {
    key: 'parseCsvTable :: while(i<s.length){ :: relational <><= #0',
    reason: 'One extra iteration reads `s.charAt(s.length)`, which is the empty string — it matches no branch '
      + '(not the delimiter, not a quote, not CR or LF), so it falls to `field+=\'\'` and appends nothing before '
      + 'the loop ends. The trailing endRow() then runs identically either way. PROVED rather than argued: the '
      + 'real and mutated functions were run against 12 inputs including an unterminated quote, a bare trailing '
      + 'CR, a BOM, a CRLF file with no final newline and a quoted embedded newline, and returned deep-equal '
      + 'results on all 12. The `<` is correct and conventional; there is simply no input that can tell them apart.',
  },
  {
    key: 'logIngPrice :: a.push({t:now, v:cpbuVal}); if(a.length>60) ingPriceLog[pid]=a.slice(-60); :: relational >>>= #0',
    reason: 'At exactly 60 points `a.slice(-60)` returns a copy of the whole array, and `a` IS `ingPriceLog[pid]` '
      + 'already, so the mutant re-assigns an identical series. Nothing holds a second reference to it: the only '
      + 'reader is ingPriceAt, which re-reads ingPriceLog[pid] each time. Truly equivalent, not merely unlikely.',
  },
  {
    key: 'samePrice :: function samePrice(a, b){ return a===b || Math.abs(a-b) < Math.abs(b)*1e-6; } :: relational <><= #0',
    reason: 'The two differ only when the gap between two prices is EXACTLY one part in a million of the second — '
      + 'one representable double out of the continuum, which no price the app computes lands on. A test pinning '
      + 'it would be a test of IEEE-754 arithmetic wearing this function as a costume.',
  },
];

/*
 * NOT YET A TARGET, and measured rather than guessed — 180's first run.
 *
 * `gemApplyReadings` is the invoice referee's merge orchestrator and belongs on the list by every
 * argument in this file. It is held back because the gate measured **44 surviving mutants against
 * `invoice-gate.test.js`**, which pins exactly one property of it (a row the user has already ruled
 * on is skipped) and nothing else. Closing that is a test-writing batch, not a line in this file,
 * and adding the target now would mean the gate exits 1 on `main` and blocks every push — a gate
 * nobody can satisfy gets disabled, which is worse than one target short.
 *
 * It is written down in `docs/MAINTENANCE.md` so this is a debt with an address, not a footnote.
 * When that coverage lands, move the line below up into `targets`.
 */
const pending = [
  /* 197: buildInvRows — ADDED AS A TARGET, MEASURED AT 14 SURVIVORS, AND HELD HERE RATHER THAN
     ALLOWED. Its GST behaviour is now killed dead by invoice-gst.test.js (that is the defect this
     batch shipped), but the same function also owns candidate ranking, the confidence tiers and the
     add-new threshold — js/app.js:9215-9221 — and nothing tests those. Writing fourteen allowances
     would have turned a measured coverage gap into fourteen sentences claiming it was fine.
     This is the gemApplyReadings decision below, taken again for the same reason and recorded the
     same way: promoting it now makes the gate exit 1 on main and block every push, and a gate
     nobody can satisfy gets disabled. Closing it is a test-writing batch — QUEUE.md item 0c, which
     owns widening this list across the whole pricing surface. */
  { fn: 'gemApplyReadings', tests: ['invoice-gate.test.js'], survivors: 44, measured: '180' },

  /* ── 0c, batch 201: THE REST OF THE PRICING SURFACE, MEASURED RATHER THAN ASSERTED TO BE ABSENT.
     The queue item said "not one target computes a price", which was true and is not a plan. Every
     candidate it named was run through the gate; these are the counts. Nothing here is a guess.
     Why they are not targets yet: promoting a function before its coverage exists makes the gate
     exit 1 on `main` and block every push, and a gate nobody can satisfy gets disabled — the reason
     gemApplyReadings has sat here since 180. What changed is that the debt is now SIZED, so the
     batches that close it can be scoped instead of discovered.
     ✅ SIX CLEARED IN BATCH 202 and their lines are gone from here: `invGstDetect`, `costAtLines`,
     `unitCatCategory`, `derivePackPrice`, `costFromLines` and `analyze` are now targets above.
     Twenty-two survivors, nineteen killed by assertion and three allowed with enumerated proofs.
     Read the rest as a work queue in cost order.
     `applySupplierMemory` is the alarming one — 24 mutants, 24 survivors, ZERO killed, on a function
     that re-derives a unit price from a remembered pack. Its declared test file mentions it and does
     not exercise it.
     `cpbu` and `fmtTargetPct` were candidates and are absent on purpose: both yield ZERO mutants
     (one-expression functions), so a target on either reports nothing at all rather than nothing
     wrong — the setProducts-delegate trap recorded above. */
  { fn: 'computeInsights', tests: ['insight-coverage.test.js', 'settings-toggles.test.js'], survivors: 39, measured: '201' },
];

module.exports = { targets, allowedSurvivors, pending };
