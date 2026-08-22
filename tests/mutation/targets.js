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
     tested. Widening this to the rest of the pricing surface is QUEUE.md item 0c. */
  { fn: 'invGstAdjust', tests: ['invoice-gst.test.js'] },
  /* Both extracted from inline code DURING this batch, and both are on this list for 195's reason:
     a function that is not a target has never been asked the question, and neither of these existed
     to be asked until the second review found the defects they now hold. invReResolve owns the
     convert-ONCE condition (dropping it re-creates a silent 9%-low price that PRICE_JUMP cannot
     see); invDerivePackQty owns the shared-tax-basis rule for deriving a pack SIZE. */
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
  { fn: 'buildInvRows', tests: ['invoice-gst.test.js'], survivors: 14, measured: '197' },
  { fn: 'gemApplyReadings', tests: ['invoice-gate.test.js'], survivors: 44, measured: '180' },
];

module.exports = { targets, allowedSurvivors, pending };
