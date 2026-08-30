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
  /* 210 — the credential on our own api/ endpoints. It is here for 184's reason rather than because
     anything is suspected: this function decides whether Max's Gemini key is spendable by strangers,
     and a function that is not a target has never been asked the question. Its `if(tok)` and its 5s
     bound are both load-bearing, and both were confirmed red by hand before it was listed. */
  { fn: 'apiAuthHeaders', tests: ['api-auth.test.js'] },
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

  /* 212: the containing block a `position:fixed` layer resolves against. Listed for 184's reason —
     a function that is not a target has never been asked the question — and because its failure mode
     is the quietest one this app has: a dropdown that renders perfectly, in the wrong place, on a
     screen nobody changed. Both directions are load-bearing and both are cheap to get wrong. If the
     walk stops too EAGERLY (any `will-change`, any `contain`) layers anchor to arbitrary ancestors;
     if it stops too LATE the builder's ingredient list drops 198px below its own field, which is the
     measured defect this was written for. */
  { fn: 'fixedContainingBlock', tests: ['layer-anchor.test.js'] },

  /* 215 — the CLIENT half of the insight phrasing validator. It is listed for the reason this file
     keeps restating: a function that is not a target has never been asked the question, and this one
     decides whether a sentence about the café's money reaches the Dashboard.
     ⚠️ THE SERVER HALF (`api/_insight.js`) CANNOT BE LISTED — this gate mutates `js/app.js` only. So
     these four cover one of two copies, and what covers the OTHER one is `insight-parity.test.js`,
     which executes both against one table and fails if they ever disagree. Mutating the client and
     watching the parity test die is therefore also a check on the server's behaviour, indirectly.
     That is worth knowing rather than assuming, because "the gate is green" says nothing at all
     about `api/` and never has. */
  { fn: 'gemPhrasingOk', tests: ['insight-parity.test.js'] },
  { fn: 'gemNumberSkeleton', tests: ['insight-parity.test.js'] },
  { fn: 'gemSkeletonIsSubsequence', tests: ['insight-parity.test.js'] },
  { fn: 'gemPolarityOf', tests: ['insight-parity.test.js'] },
  { fn: 'gemSameNumber', tests: ['insight-parity.test.js'] },
  /* 220 — the NAME half, which had no target at all while the FIGURE half (gemSkeletonIsSubsequence)
     had one. That asymmetry is how the substituted-subject hole survived: nothing had ever asked the
     name walk a question. Both are listed now, not just the new one. */
  { fn: 'gemNamesAreSubsequence', tests: ['insight-parity.test.js'] },
  { fn: 'gemNamesAllPresent', tests: ['insight-parity.test.js'] },
  /* 223 — the word-boundary rule, and the two BUILDERS whose facts it defends. The helper is listed
     for the same reason 220 listed the name walk: it is the only thing standing between an
     ingredient named `Rice` and a swap hidden inside the template's own word "prices", and a
     function that is not a target has never been asked the question.
     The builders are listed because this item's defect was in the DATA, not the validator — a
     mutant that drops a facts key leaves every validator test green and re-opens the hole, which is
     exactly the shape 220's item proposed and measuring refused. */
  { fn: 'gemStartsAtWordBoundary', tests: ['insight-parity.test.js'] },
  { fn: 'insVolatility', tests: ['insight-real-templates.test.js', 'insights.test.js'] },
  { fn: 'insNearCluster', tests: ['insight-real-templates.test.js', 'insights.test.js'] },

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
  /* ⚠️ TWO TARGETS WERE DELETED HERE IN 209 AND THIS NOTE IS WHY, because a shorter list looks like
     a weakened gate. `authSignUpGated` and `authInvitePending` were the invitation gate on sign-up,
     described here as "the ONE thing standing between invited people may sign up and self-service
     sign-up, which Max declined". ⚠️ HE REVERSED THAT ON THE SAME DAY (14 Aug 2026), choosing shape
     B — self-service — so the functions are gone and nothing was loosened: what they gated is now
     the feature. `authSignUp` needs no entry of its own; it has no decision in it, and the one
     property worth keeping from the pair (a missing client RETURNS an error rather than throwing,
     which this gate found in the first place) is asserted in auth.test.js and cafe-create.test.js.
     `invite_pending` the SQL function is still deployed and still pinned by tests/invites.test.js —
     see the migration header for why it outlives its caller by a batch. */
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
  /* 219 — the EXPORT half, added the day it gained three groups, for 184's reason: this list's own
     sentence is "a function that is not a target has never been asked the question", and the item
     this batch ran is precisely a group that was missing from buildBackup for months with a green
     suite. It is mostly an object literal, so its mutant count is small — but `lastImportStamp()`
     and `kingWizSkipIds()` are real calls, and a deleted call here is a settings key silently
     exported as undefined. settings.test.js is the file that runs it with real globals. */
  { fn: 'buildBackup', tests: ['settings.test.js'] },

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
  /* 222 — costDetail is the real walk now (costFromLines is its cost accessor), so the target that
     mattered would have quietly become a one-line delegation with nothing behind it. lineCost is
     listed for the first time: `null * cost` is 0 rather than null, which is how a line with no
     quantity became a free ingredient, and nothing had ever asked that function a question. */
  { fn: 'costDetail', tests: ['plate-cost.test.js'] },
  { fn: 'lineCost', tests: ['plate-cost.test.js'] },
  { fn: 'plateFullyCosted', tests: ['plate-cost.test.js'] },
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
  /* 0c (batch 204). Measured at 24 survivors in 201 and held in `pending`; twenty-one are killed in
     matched-price.test.js and three are allowed below. The gate's own numbers, which are the ones
     that cannot drift: 55 mutants, 31 killed before this batch and 52 after. Unlike applySupplierMemory above, the four
     files already named here DO exercise it — 31 of its 55 mutants died against them before this
     batch — so the new file is ADDED rather than replacing them. What it reaches that they do not
     is the part no other subject leads through: the memory arm's unit spellings, the fall-through
     to manual, and the four provenance fields written at the end. */
  { fn: 'resolveMatchedPrice', tests: ['product-pack.test.js', 'pack-survives.test.js', 'ingredient-unit.test.js', 'invoice-gst.test.js', 'matched-price.test.js'] },
  /* 0c (batch 205) — THE LAST ONE IN THE ITEM, and the only impure builder on this list. Measured at
     39 survivors plus the mutant that HANGS; 34 killed in insight-coverage.test.js's BUILDER
     section, four allowed below, and the hang is counted as a kill by the gate's own rule.
     Its two declared files are kept and both are honest, but they are not equal: `insight-coverage`
     runs it, and `settings-toggles` greps its SOURCE for an ordering (the AI-suggestions gate must
     come BEFORE the call). The second contributes no kills and was never going to — it pins a
     property of the call site, not of the function. */
  { fn: 'computeInsights', tests: ['insight-coverage.test.js', 'settings-toggles.test.js'] },
  /* 0c2 (batch 206) — THE LAST LINE OF THE PENDING LIST, held out of targets since batch 180.
     Measured at 45 survivors here (the item said 44, from 180; it drifted by one). 52 killed in the
     new inv-referee.test.js, two allowed below.
     `invoice-gate.test.js` is KEPT and is not the file doing the work: it pins one property — a row
     the user has ruled on is skipped whole — through its own hand-built sandbox, and that sandbox
     stubs rankCandidates and packCount, which is correct there and is why 45 of 56 survived it. */
  { fn: 'gemApplyReadings', tests: ['invoice-gate.test.js', 'inv-referee.test.js'] },
  /* item 2 (batch 208): the privacy gate's decision. It exists as a function AT ALL because the
     three lines it replaced were inline in a DOM handler, invisible to this gate, and pinned by an
     order-only test that stayed green against an inverted guard — roster 167(a), caught by the
     pre-push review. A guard that decides whether a stranger is shown what leaves their café before
     it leaves belongs on this list. */
  { fn: 'privacyAcceptNeeded', tests: ['privacy-disclosure.test.js'] },
  /* 209 — the three decisions behind "name your own café", which is the ONLY way a café can now come
     into existence outside the Supabase dashboard.
     `createBusinessState` is `claimState`'s sibling and is on this list for the same recorded
     reason: a wrong 'made' boots the app as a member of a café that does not exist, and a wrong
     'unknown' leaves a person who HAS just made one staring at the screen that says they have not.
     `cafeNameProblem` and `cafeNameClean` are here because they are half of a rule the server
     states separately — the client cannot call the server's guard across a wire — and a boundary
     that drifts by one either refuses a name the server would take or sends one it will not. */
  { fn: 'createBusinessState', tests: ['cafe-create.test.js'] },
  { fn: 'cafeNameProblem', tests: ['cafe-create.test.js'] },
  { fn: 'cafeNameClean', tests: ['cafe-create.test.js'] },
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
  /* 215 — gemPhrasingOk's fact-set loop bound. `j < allowed.length` -> `j <= allowed.length` adds one
     iteration that reads `allowed[allowed.length]`, which is `undefined` for every input this
     function can receive: `allowed` is built immediately above by pushing only values for which
     `typeof facts[k] === 'number'`, so it is always dense and index `length` is always absent.
     The loop body then asks `gemSameNumber(v, undefined)`, which is `Math.abs(v - undefined) < eps`
     = `NaN < eps` = `false` for EVERY finite v — and v is always finite, because it came from
     `parseFloat` on a `/-?\d+(?:\.\d+)?/` match. So the extra iteration cannot set `ok`, cannot
     break, and cannot throw. It is a provable no-op rather than an unlikely one, which means no test
     can kill it: this is the case the list exists for. */
  {
    key: "gemPhrasingOk :: for(var j=0;j<allowed.length;j++){ if(gemSameNumber(v,allowed[j])){ ok=true; break; } } :: relational <><= #0",
    reason: 'The extra iteration reads allowed[allowed.length] === undefined; gemSameNumber(v, undefined) is '
      + 'NaN < eps = false for every finite v, and v is always finite (parseFloat of a digit match). The array '
      + 'is dense by construction — built by pushing only typeof-number values — so there is no input for which '
      + 'the mutant and the original differ. Provably a no-op, so unkillable by assertion.',
  },

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
  /* 0c2 (batch 206) — gemApplyReadings. TWO allowed out of forty-five, and neither is the
     `>` -> `>=` shape the rest of this list is full of. Both are a guard whose two operands cannot
     disagree, for two different reasons. */
  {
    key: 'gemApplyReadings :: var H=(r.bestId && byId[r.bestId])?gemHist(byId[r.bestId]):null; :: logical &&>|| #0',
    reason: 'The two differ only when exactly one operand is truthy, and in every such case the TRUE arm '
      + 'computes the same answer the false arm returns: a bestId naming a product that is not in byId '
      + 'makes the mutant call gemHist(undefined), and gemHist opens with `if(!prod) return null`. A falsy '
      + 'bestId makes byId[bestId] undefined, so both arms are false. PROVED by enumeration over ten '
      + 'bestId values — null, undefined, empty string, 0, false, a real id, a zero-priced id, a missing '
      + 'id, and two inherited Object.prototype keys — with the real and mutated expressions run side by '
      + 'side against the real gemHist: identical results on all ten, and no throw. ⚠️ It rests on '
      + 'gemHist\'s own null guard, which tests/inv-referee.test.js pins DIRECTLY, in a test that says at '
      + 'its own site that it exists for this allowance. The first draft of this reason named '
      + 'inv-gemini-merge.test.js instead, which imports three other functions and never mentions gemHist '
      + '— so the tripwire it advertised did not exist. Caught by the pre-push review. If that guard is '
      + 'ever removed this becomes a crash rather than an allowance, and now something goes red.',
  },
  {
    key: 'gemApplyReadings :: try{ if(window.console&&console.debug) console.debug(\'[inv AI] "\'+(r.name||\'\')+\'" check-match → \'+sus.suggestId+(sus.corroborated?\' (price-corroborated)\':\'\')); }catch(e){} :: logical &&>|| #0',
    reason: 'The two operands are the SAME OBJECT read two ways: `console` in a browser IS `window.console`, '
      + 'so `window.console && console.debug` and `window.console || console.debug` are true together and '
      + 'false together. There is no environment this code runs in where one is present and the other is '
      + 'not — and if there were, the whole statement is inside its own try/catch, so the mutant would '
      + 'throw into the catch and produce the same nothing. The guard is worth keeping as the statement '
      + 'that this is diagnostics and must never break the merge. Enumerated over both reachable shapes '
      + '(console present, console absent): the two operators agree on both. '
      + 'The `||` on the same line is a DIFFERENT mutant and is killed — inv-referee.test.js asserts the '
      + 'diagnostic names the row, which is what that operand decides.',
  },
  /* 223 — insNearCluster's PRICE guard, the one mutant of the eight that its first mutation run
     produced which no honest assertion can kill. The other seven are killed in insights.test.js;
     this one is allowed because it is equivalent, and the proof is arithmetic rather than an
     argument about likelihood. Contrast it with the COST guard on the same line, which IS killed:
     the two halves of one condition, one observable and one not, decided entirely by what the
     divisor does. */
  {
    key: 'insNearCluster :: if(!(d.cost>0)||!(d.menuPrice>0)) return; :: relational >>>= #1',
    reason: 'EQUIVALENT. The mutant newly admits exactly one value — menuPrice === 0 — because every other '
      + 'value answers `>` and `>=` alike, and a negative price answers both false. The FIRST clause is '
      + 'unmutated, so any plate reaching the divide has cost > 0, and `cost/0` is therefore +Infinity for '
      + 'every such plate. The window is `Math.abs(ratio - targetFrac)*100 <= 0.5`, and Infinity minus any '
      + 'finite target is Infinity, so the plate is never counted and never named — the two versions produce '
      + 'the same `n`, the same `named`, and the same sentence. PROVED by RUNNING it over the cross product '
      + 'of five costs spanning 0.0001 to 999999 and six targets from 0 to 1: zero cases counted. '
      + 'THE CONDITION THAT EXPIRES THIS: it holds only while the first clause guarantees a positive cost '
      + 'and the window compares against a FINITE target. If either changes — a target that can be Infinity '
      + 'or NaN, or a cost guard that admits zero — delete this allowance and re-run, because Infinity would '
      + 'then be comparable and the mutant becomes observable.',
  },
  /* 220 — gemNamesAreSubsequence, listed as a target for the first time. ONE allowed, and it is worth
     contrasting with its SIBLING: the identical mutation in gemSkeletonIsSubsequence is KILLED, because
     that walk dereferences `tpl[i].u` and an extra pass throws a TypeError. The name walk compares
     `tpl[i]!==cand[j]` instead, which on `undefined` is simply true — the same shape of line, one
     killed and one equivalent, decided entirely by whether the comparison dereferences. */
  {
    key: 'gemNamesAreSubsequence :: while(i<tpl.length && tpl[i]!==cand[j]) i++; :: relational <><= #0',
    reason: 'EQUIVALENT, and provably so. The extra pass can only occur at i === tpl.length, where tpl[i] is '
      + 'undefined; cand[j] is always a non-empty lowercased string (nameSequence filters blanks and returns '
      + 'match text), so `tpl[i]!==cand[j]` is unconditionally true, i advances to tpl.length+1, both bounds '
      + 'then fail, and the very next line `if(i>=tpl.length) return false` is true for tpl.length and for '
      + 'tpl.length+1 alike. The two versions therefore return the same value on every input and neither can '
      + 'throw. PROVED by RUNNING both: exhaustively over all 14,641 (candidate, template) pairs of sequences '
      + 'up to length 4 drawn from three distinct names — zero differences. '
      + '⚠️ This allowance expires if the comparison ever DEREFERENCES cand[j] or tpl[i] (`.name`, `.u`, a '
      + 'method call), because that is exactly what makes the sibling mutant fatal rather than harmless. '
      + 'The `<` is correct and conventional; there is simply no input that can tell them apart.',
  },
  /* 222 — computeInsights' null-line guard became UNREACHABLE, and it is allowed rather than deleted.
     This is the "a fallback that cannot fire reads as a safety net and is not one" shape this repo
     records, arriving from the opposite direction: the guard was live and a change elsewhere retired
     it. Keeping it is still right — it costs nothing, and the reasoning below is about the CALLER. */
  {
    key: 'computeInsights :: if(!l || l.misc) return; :: logical ||>&& #0',
    reason: 'UNREACHABLE, not equivalent — and it became so in the batch that wrote this allowance. The '
      + 'loop it guards only runs for plates that passed `!sp || !(cost>0)` a few lines above, where '
      + '`cost` is now `costDetail(sp.lines).miss ? 0 : cost`. A null line ALWAYS increments miss '
      + '(costDetail does `lineProduct(l)` and takes the `if(!p){miss++}` branch), so a plate carrying '
      + 'one can no longer reach this loop at all, and the mutant `!l && l.misc` — which throws a '
      + 'TypeError on null and empties the whole insight block through the try/catch — has no input '
      + 'that reaches it. Before 222 it was killed by insight-coverage.test.js pushing a null line onto '
      + 'a plate and asserting the family still fired; that test now asserts the plate is EXCLUDED, '
      + 'which is the corrected behaviour and is why the mutant survives. '
      + '⚠️ THE ALLOWANCE EXPIRES IF THAT EXCLUSION IS EVER RELAXED — if a partially-costed plate is '
      + 'admitted to computeInsights again, null lines reach this line and the guard is load-bearing. '
      + 'The SUPPLIER pass a few lines below walks savedPlates directly, is NOT narrowed by the '
      + 'exclusion, and its own null guard is still exercised by the same test.',
  },
  /* 0c (batch 205) — computeInsights. FOUR allowed out of thirty-nine, and all four are the same
     `>` -> `>=` shape this file now carries nine times over. Three of them are UNREACHABLE rather
     than merely harmless: the values on which the two operators differ are excluded by a guard
     further up, so no input can reach the line and tell them apart. That is a stronger claim than
     equivalence and a weaker piece of code — each is redundant with something else — and it is why
     each one names the guard it is redundant WITH, so a batch that loosens that guard knows the
     allowance has expired. */
  {
    key: 'computeInsights :: for(var w=0; w<INSIGHT_WINDOWS.length && !movement; w++){ :: relational <><= #0',
    reason: 'One extra pass reads INSIGHT_WINDOWS[4], which is undefined, so `now - undefined*86400000` is NaN '
      + 'and every price lookup at that moment returns null — costAtLines reports complete:false, `ok` stays '
      + 'empty, `ok.length<2` continues, and the loop ends. The pass can only happen at all when no window '
      + 'produced movement, which is the case where there is nothing to overwrite. PROVED by RUNNING it: the '
      + 'mutated loop bound was applied to a scratch copy of js/app.js and both versions were driven over 24 '
      + 'states (six history depths x four price moves, chosen so most produce no movement at all) — '
      + 'byte-identical insight lists on all 24. The `<` is correct and conventional; there is simply no '
      + 'input that can tell them apart.',
  },
  {
    key: 'computeInsights :: if(!c.complete || !(c.priced>0) || !(c.cost>0)) break;   // no LOGGED cost behind it → no run to report :: relational >>>= #1',
    reason: 'c.cost>0 -> c.cost>=0 differs only at 0 and -0, and the VERY NEXT LINE breaks on both: '
      + '`!(c.cost/d.price > tf)` is `!(0 > tf)`, and tf is foodTarget(), which is cogsPct/100 with cogsPct '
      + 'clamped to [1,99] and so is always greater than zero. The walk therefore stops at the same month k '
      + 'either way and the run length is identical. Enumerated over cost in [0,-0] x five plate prices '
      + 'spanning 0.01 to 1e6: zero differences. The guard still earns its place — it says "no LOGGED cost '
      + 'behind it" where a reader looks for that, rather than leaving it to a target comparison that exists '
      + 'for a different reason.',
  },
  {
    key: 'computeInsights :: if(!(price>0)) return; :: relational >>>= #0',
    reason: 'UNREACHABLE rather than equivalent. `price` is priceByPlate[sp.id], which is either undefined '
      + '(no publication of this plate was ever recorded) or a value that already passed `!m.price>0` in the '
      + 'MENU pass twenty lines above. The two operators differ only on values that coerce to zero — 0, -0, '
      + '"", null, false — and every one of those is excluded upstream; undefined fails both. Enumerated over '
      + 'the six values that can actually arrive: zero differences. ⚠️ This allowance expires if the MENU '
      + 'pass ever admits a non-positive price, which is what its own `>` is there to prevent — '
      + 'insight-coverage.test.js pins that guard directly.',
  },
  {
    key: 'computeInsights :: if(!(next.v>0)) return; :: relational >>>= #0',
    reason: 'UNREACHABLE for the same shape of reason. A row only enters a unit group through '
      + '`if(v==null || !(v>0)) return`, so every v in g.rows is strictly positive and next.v cannot be zero '
      + 'or negative. The two operators differ only at 0 and -0. ⚠️ It is redundant with that push guard '
      + 'rather than dead — the two are thirty lines apart and either could be edited alone — so if the push '
      + 'guard is ever loosened this must be re-judged. insight-coverage.test.js pins the push guard with a '
      + 'zero-priced product that must not pad a group to quorum.',
  },
  /* 0c (batch 204) — resolveMatchedPrice. THREE allowed out of twenty-four; the other twenty-one are
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
 * NOT YET A TARGET — and as of batch 206 this list is EMPTY, for the first time since it was created
 * in 180. Every function that has ever been held here is now in `targets` above at zero unallowed
 * survivors: `buildInvRows`, `resolveMatchedPrice`, `applySupplierMemory`, `computeInsights` and
 * `gemApplyReadings`, plus the six batch 202 cleared.
 *
 * ⚠️ AN EMPTY LIST IS NOT THE SAME CLAIM AS FULL COVERAGE, and the difference is worth stating
 * plainly because an empty array invites the wrong reading. It means every function ANYONE HAS
 * POINTED THE GATE AT is now pinned. It says nothing about the functions nobody has asked about —
 * and 184's lesson is exactly that: a function that is not a target has never been asked the
 * question, and adding one is two lines.
 *
 * WHAT THIS LIST IS FOR, and why it is kept rather than deleted. A function measured with survivors
 * cannot simply be added to `targets`: the gate would exit 1 on `main` and block every push, and a
 * gate nobody can satisfy gets disabled, which costs more than one missing target. So it is measured,
 * written down HERE with a count and the batch that measured it, and promoted when the coverage
 * lands. That is the whole mechanism, it worked five times, and the next function to need it should
 * use it rather than inventing something.
 *
 * The shape of an entry, kept as the example:
 *   { fn: 'someFunction', tests: ['its-declared-file.test.js'], survivors: 44, measured: '180' }
 *
 * ⚠️ Two kinds of function can NEVER be listed here or promoted, and both were learned by trying:
 * a one-expression function yields ZERO mutants, so a target on it reports nothing at all rather
 * than nothing wrong (`cpbu`, `fmtTargetPct`, and the setProducts delegate recorded above); and a
 * delegate that forwards to another function is measured through the function it forwards to.
 */
const pending = [];

module.exports = { targets, allowedSurvivors, pending };
