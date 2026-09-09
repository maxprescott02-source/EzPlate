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
  /* 242 — THE TENANT BOUNDARY. Four functions deciding whether one café's data is cleared before
     another café's rows are applied to memory, so a surviving mutant here is a cross-tenant
     disclosure rather than a wrong number. `supplierMemApply` is the one that WRITES: its rePush
     arm re-pushes held phrases into whichever café is loading, which is correct only because the
     boundary has already cleared memory that belongs to somebody else. All four were confirmed red
     by hand — ten mutants, ten kills — before being listed, per 184's rule that a function which is
     not a target has never been asked the question. */
  { fn: 'tenantIdOf', tests: ['tenant-switch.test.js'] },
  { fn: 'tenantChanged', tests: ['tenant-switch.test.js'] },
  { fn: 'applyTenantBoundary', tests: ['tenant-switch.test.js'] },
  /* Added by this batch's pre-push review, which pointed out that the ONE function whose whole job
     is the safety property was the one not listed. It carries no operators, so its mutants are all
     call deletions — and that is exactly the class that matters here: dropping `rebuild()` after
     `productsById={}` leaves PRODUCTS and byId still holding the previous café while the store they
     derive from reads empty. */
  { fn: 'resetTenantState', tests: ['tenant-switch.test.js'] },
  /* 243 — the invitation chooser. `invitesOf` decides which server rows become a button somebody
     can press, and `renderInviteChoices` decides what that button SAYS — the café name and the role
     being accepted, which is what the old server function chose silently. Both were confirmed red
     by hand (eight mutants, eight kills) before being listed. */
  { fn: 'invitesOf', tests: ['boot-gate.test.js'] },
  { fn: 'renderInviteChoices', tests: ['boot-gate.test.js'] },
  /* Added after the pre-push review, which found the defect this function now exists to prevent:
     `invitesOf` returned [] for both "no invitations" and "could not tell", so a recheck on a
     flaky connection emptied a chooser somebody was reading — and 187's one-café-per-person rule
     makes acting on that irreversible. This is the single writer that keeps the third value. */
  { fn: 'applyPendingInvites', tests: ['boot-gate.test.js'] },
  /* TWO files, and the second is not decoration: `smem-sync-guard.test.js` predates this batch and
     is where v107's keep-local-over-an-empty-read behaviour is pinned, against the real block that
     sequences the log, the pushes and the adopt. Listing only the new file would leave the older
     half of this function's contract unasked, which is this list's own stated failure mode. */
  { fn: 'supplierMemApply', tests: ['tenant-switch.test.js', 'smem-sync-guard.test.js'] },
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
  /* 236/237 — the two silent-wrong-price corrections on the PDF invoice path (queue items 12 and
     12b), and the pack-weight authority they share. Targets from the hour they were written, per
     184. Every gate is load-bearing in a different direction: the weight-category check (drop it
     and a name in ml is priced per kg), the qtyInCat comparison (drop it and a trailing net-weight
     column silently divides by 144kg), the anchored leading-k regex (drop it and every carton line
     rebases), and the k*P===T arithmetic (flip it and the unconfirmed shape silently keeps $5/kg).
     invPackWeight is one line and is listed anyway BECAUSE it is one line: it is the single
     sentence "the pack is described in the name" that the price, the guard and the arithmetic all
     depend on, and the defect this batch's review found was two of them disagreeing about it. */
  { fn: 'invFixRow', tests: ['inv-row-fix.test.js'] },
  { fn: 'invPackWeight', tests: ['inv-row-fix.test.js'] },
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
  /* 224: the gate that stops a price point being written for a product write the server refused,
     and the two functions it is made of. CLAUDE.md's roster keeps finding that "a function that is
     not a target has never been asked the question" — these three decide whether the log tells the
     truth after a failed save, and every one of their branches is on a path a green suite never
     takes. `unlogIngPrices` is the rollback, `confirmPrices` the baseline the retry is measured
     against, `confirmedPrice` the one-line read that chooses between them. */
  { fn: 'saveIngLog', tests: ['price-log-paths.test.js', 'bulk-product-writes.test.js'] },
  { fn: 'unlogIngPrices', tests: ['price-log-paths.test.js'] },
  { fn: 'confirmPrices', tests: ['price-log-paths.test.js', 'bulk-product-writes.test.js'] },
  { fn: 'confirmedPrice', tests: ['price-log-paths.test.js'] },
  { fn: 'writeSaved', tests: ['price-log-paths.test.js', 'bulk-product-writes.test.js'] },

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
  /* 228: the recipe heal. Max's answer has FOUR outcomes and the two dangerous mutants both collapse
     them — a relink that fires on several candidates hands a dish somebody else's recipe and costs it
     automatically, and a `create` that fires on one leaves the real recipe stranded, which is the
     defect this item exists to fix. The same-menu exclusion is here too: without it a relink puts two
     dishes of one plate on one menu, which v113's guard forbids and no screen would show. */
  /* 229: the verdict phrases. A mutant that swaps one for a subjectless word is the exact defect the
     item was about, and nothing pinned these strings before that batch. */
  { fn: 'marginLightWord', tests: ['verdict-subject.test.js'] },
  { fn: 'plateHealPlan', tests: ['plate-heal.test.js'] },
  { fn: 'normPlateName', tests: ['plate-heal.test.js'] },
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
  /* 238: THE CONFIRMATION LINK, both ends of it, and they are targets from the hour they were
     written for 184's reason — the cheapest moment to add one is the moment it acquires a test
     worth protecting. Every failure here is silent in the way this repo keeps being burned by:
     nothing on any screen can tell you the email pointed at the wrong machine, and nothing in the
     suite could, because the destination used to live in a Supabase dashboard field this repo
     cannot read. It took a real stranger's sign-up to surface it.
     authRedirectTo: its `file:`/non-http guard is the whole of the degraded arm. A mutant that
     lets a bad origin through sends the literal string "null" into a confirmation email; one that
     refuses a good one silently restores the pre-238 defect, with the new code sitting there
     reading correctly. Both arms are pinned, in two files on purpose.
     captureAuthUrlError: `inHash` decides WHICH URL half gets rewritten, and the mutant that
     matters strips `?env=staging` — returning a rehearsal to Max's real café, which is the exact
     accident the staging project exists to prevent. The `!hp.access_token` clause is the other
     one: dropping it rewrites a SUCCESSFUL confirmation out from under supabase-js.
     authUrlErrorMessage / paintAuthUrlError: the wording's `||` chain falls back to the server's
     own words, and the painter's one-shot latch is 209's defect on the branch next door — a
     mutant that flips it repaints a stale link complaint over a live sign-in error on every
     `online` blip, which is invisible until somebody mistypes a password on a train. */
  { fn: 'authRedirectTo', tests: ['auth-url-error.test.js', 'auth.test.js'] },
  { fn: 'authUrlParams', tests: ['auth-url-error.test.js'] },
  { fn: 'authUrlErrorMessage', tests: ['auth-url-error.test.js'] },
  { fn: 'captureAuthUrlError', tests: ['auth-url-error.test.js'] },
  { fn: 'paintAuthUrlError', tests: ['boot-gate.test.js'] },
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
  /* 239 (item 16) — the bare-pid heal, listed the hour it was written rather than after something
     gets past it. lineProduct is the resolver the whole item is about and had never been a target;
     barePidPlan decides which lines a BULK REWRITE of plate rows touches, and its `own.length===1`
     is the entire safety argument — widen it and the heal starts guessing which ingredient a line
     meant, which is a silently wrong cost. applyBarePidHeal owns the rollback. */
  { fn: 'lineProduct', tests: ['plate-cost.test.js', 'bare-pid-heal.test.js'] },
  { fn: 'barePidPlan', tests: ['bare-pid-heal.test.js'] },
  { fn: 'barePidSameProduct', tests: ['bare-pid-heal.test.js'] },
  { fn: 'barePidLinesFor', tests: ['bare-pid-heal.test.js'] },
  { fn: 'applyBarePidHeal', tests: ['bare-pid-heal.test.js'] },
  { fn: 'healBarePidPlate', tests: ['bare-pid-heal.test.js'] },
  { fn: 'syncHealRow', tests: ['bare-pid-heal.test.js'] },
  { fn: 'plateFullyCosted', tests: ['plate-cost.test.js'] },
  /* 241 (item 18) — the sanity bound. `dishRatios` is the ONE walk that decides which plates the
     café's headline figure is made of and which are named as typos, so every operator in it is a
     decision about a number on the Dashboard. `avgFoodCostForScope` is listed for the first time
     and had never been asked a question, which is 184's lesson: the mean the whole app reads was
     not a target. `kpiStripHtml` owns the over-target count the bound now steps around. */
  { fn: 'dishRatios', tests: ['food-cost-bound.test.js', 'dash-scope.test.js'] },
  /* The three the pre-push review found. `dishesOverTarget` is the SECOND over-target counter and
     the one an invoice import reads; `mcmpSparkSeries` had the chart's own unbounded-scale defect
     in a 54px glyph. Neither had ever been a target, which is why the bound could miss them both
     without a single test going red. */
  { fn: 'dishesOverTarget', tests: ['food-cost-bound.test.js'] },
  { fn: 'mcmpSparkSeries', tests: ['food-cost-bound.test.js'] },
  { fn: 'avgFoodCostForScope', tests: ['food-cost-bound.test.js', 'dash-scope.test.js'] },
  { fn: 'mispricedDishes', tests: ['food-cost-bound.test.js'] },
  { fn: 'mispricedHtml', tests: ['food-cost-bound.test.js'] },
  { fn: 'kpiStripHtml', tests: ['food-cost-bound.test.js', 'kpi-strip.test.js'] },
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
  /* 244 — THE FOOD-COST TARGET, which is the one number every suggested price and every good/bad
     colour in the app is divided by. It is here for 184's stated reason and not because anything
     else is suspected: `setCogs` had never been a target, so the question had never been asked, and
     what it was hiding was that a REFUSED write left the new number on screen — a $6 dish reading
     $20 against a 30% the server had rejected. Both guards in the rollback are load-bearing and
     both were confirmed red by hand before this was listed: which value it rolls back to (the last
     CONFIRMED one, not the previous client one) and whether a superseded refusal may move the
     screen at all. `cogsRound` is the precision the setter and the boot read now share; flipping
     either clamp silently widens the range the server is asked to store. */
  { fn: 'setCogs', tests: ['cogs-rollback.test.js'] },
  { fn: 'cogsRound', tests: ['cogs-rollback.test.js'] },
  /* 245 — the last unguarded number on the builder. Its two siblings were already effectively
     pinned through `costDetail`; this one had no clamp at all, so a typed "-2" put a $0.92 plate at
     $-1.08 and saved it there. Listed for 184's reason: `setQty` and `commitPrice` guard, this one
     did not, and nothing had ever asked the question of any of the three at this level. */
  { fn: 'setMiscCost', tests: ['misc-cost-sign.test.js'] },
  /* 253 — how many of an invoice's prices the SERVER kept, which is the whole of item 90's first
     instance: it is what turns "Invoice imported · 36 prices" from a claim about the screen into a
     report of what landed. Listed the moment it existed, because the gate had already proved the
     point while the logic was still inline in `applyInvoice` — flipping the tally to `oks.length`
     (attempted, not kept, the defect restored exactly) survived every test in the batch. Extracting
     it was the fix for that, and listing it is what keeps the fix honest. */
  { fn: 'importKeptCount', tests: ['import-summary.test.js'] },
  /* 254 - the menu delete's sequencing, and the merge that stops a re-sync deleting cost history.
     `dbDeleteMenuAfterDishes` is the menu twin of `dbDeletePlateAfterDishes`, and the reason it is
     listed separately from its sibling is that its failure mode is the opposite one: the plate FK is
     NO ACTION and fails LOUDLY with 23503, while `menu_items.menu_id` is ON DELETE SET NULL, so
     deleting the menus row early does not error - it silently detaches a dish that is still there.
     `mergeSeries` is now the ONE merge both history shapes call, so a mutation of it is a mutation of
     `mergeMenuHistory` too; that is the point of extracting it and it is why one entry covers both. */
  { fn: 'dbDeleteMenuAfterDishes', tests: ['delete-sequencing.test.js'] },
  { fn: 'rollbackMenuDelete', tests: ['delete-sequencing.test.js'] },
  { fn: 'mergeSeries', tests: ['dash-scope.test.js'] },
  /* 253's pre-push review — whether an import owes a trend point. Both of this batch's majors were
     decisions buried inside `applyInvoice` where nothing could run them, and both were wrong; this
     is the second one extracted. Its `relinked` arm is the whole reason it exists. */
  { fn: 'importMovedCost', tests: ['import-summary.test.js'] },
  /* 249 — the choice a person makes about a plate line the heal refused, and the arithmetic that
     tells them what it costs. `barePidPlan` is already a target through the heal; these two are its
     readers and neither had ever been asked the question. `orphanChoiceDelta` is the one that
     matters: it is the ONLY thing standing between the user and a committed cost change they were
     not shown, and its uncostable-line branch is the app's standing rule about never printing a
     confident figure over a line it cannot cost. */
  /* 251 — the word on a Recent-changes row. Listed because it is the live case of CLAUDE.md's
     "read `detail`, never `kind` alone": two different events share the kind `plate_edited` and only
     `detail.via` tells them apart, so a mutant that drops that branch mislabels 249's rows with no
     error anywhere. Confirmed red by hand before listing. */
  { fn: 'changeKindWord', tests: ['dash-recent.test.js'] },
  { fn: 'orphanPidGroups', tests: ['bare-pid-heal.test.js'] },
  { fn: 'orphanChoiceDelta', tests: ['bare-pid-heal.test.js'] },
  /* 247 — the gate that decides whether a food-cost trend point describes a write that landed.
     Neither this nor `logChangeIfSaved` had ever been a target, which is 184's rule again: the two
     functions that decide what goes into the app's permanent record had never been asked the
     question. `logHistory`'s branch is small and every arm of it matters — gating the repaint would
     make the dashboard stale for a round trip (v60 item 1a), and inverting the error test would log
     exactly the points that should not exist. Both were confirmed red by hand before listing. */
  { fn: 'logHistory', tests: ['history-paths.test.js'] },
  { fn: 'logChangeIfSaved', tests: ['history-paths.test.js', 'change-log.test.js'] },
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
  /* 241, the six on the two functions the PRE-PUSH REVIEW added to this list. Two families, and the
     first is worth reading because it is a shape rather than an accident: `dishesOverTarget`'s own
     guards are BACKED BY `analyze`, which refuses a zero price and a zero cost on its own. So the
     mutants that let a zero past the guard reach a function that turns it away anyway, and nothing
     observable changes. The guards are not redundant — they stop the work being done at all, and
     `analyze` returning 'nomenu' is a different statement from "this plate was never a candidate" —
     but they are, measured, unobservable through this function's return value.
     The other four are exact-boundary ties of the kind this file already carries several of: at the
     tie the two operators compute the same value, or the side it falls is arbitrary by construction.
     Every one of them has both sides away from the tie asserted in food-cost-bound.test.js §7. */
  {
    key: "dishesOverTarget :: var over=0; MENU.forEach(function(m){ if(!(m.price>0)) return; var sp=plateForMenuItem(m); if(!sp) return; :: relational >>>= #0",
    reason: 'Equivalent: at a price of exactly 0 the mutant lets the plate through, and analyze(cost, 0) returns '
      + "state 'nomenu' on its own `!menuPrice || menuPrice<=0` guard, so it is not counted either way. Measured — "
      + 'food-cost-bound.test.js asserts the zero-price plate is not over target, and it passes both ways.',
  },
  {
    key: "dishesOverTarget :: var d=costDetail(sp.lines); if(d.miss || !(d.cost>0)) return; :: relational >>>= #0",
    reason: 'The same equivalence at a cost of exactly 0: analyze(0, price) computes suggested=0 and returns '
      + "'nomenu' from its own guard, so the mutant counts nothing extra.",
  },
  {
    key: "mcmpSparkSeries :: if(mx-mn<0.2){ var mid=(mn+mx)/2; mn=mid-0.1; mx=mid+0.1; }        // a flat series draws centred, not glued to an edge :: relational <><= #0",
    reason: 'Exact-boundary tie at a spread of precisely 0.2, where widening the window to 0.2 and leaving it at '
      + '0.2 produce the same domain. Flat and clearly-not-flat are both asserted.',
  },
  {
    key: "mcmpSparkSeries :: var v=(p.v>mx?mx:(p.v<mn?mn:p.v));                              // clamped, exactly as the chart's y() is :: relational >>>= #0",
    reason: 'Provably equivalent, not merely untested: at v===mx the mutant clamps to mx and the original passes v '
      + 'through, and v IS mx. There is no input that distinguishes them.',
  },
  {
    key: "mcmpSparkSeries :: var v=(p.v>mx?mx:(p.v<mn?mn:p.v));                              // clamped, exactly as the chart's y() is :: relational <><= #0",
    reason: 'The mirror of the entry above, on the lower clamp: at v===mn both yield mn.',
  },
  {
    key: "mcmpSparkSeries :: var cls=(vs[vs.length-1]<=cogsPct+0.05)?'good':'bad'; :: relational <=>< #0",
    reason: 'The display-epsilon tie again, on the sparkline colour — the same one already allowed on kpiStripHtml, '
      + 'and it is the same 0.05 by design so the row and the strip cannot disagree on a rounding hair. Both sides '
      + 'away from the tie are asserted (40 then 25 is good, 25 then 40 is bad, exactly 30 is good).',
  },

  /* 241 — computeInsights' three, and TWO OF THEM WERE KILLED BEFORE THIS BATCH. That is the finding
     rather than a footnote: adding `if(cost/m.price*100 > FOOD_COST_SANE_MAX) return;` to this
     function made the price>0 guard above it unobservable at a price of exactly zero, because the
     mutant that lets a zero-price dish through now divides by zero, gets Infinity, and Infinity is
     over the bound — so it returns from the next line instead of the previous one. Same exit, no
     visible difference, mutant equivalent.
     ⚠️ **A NEW GUARD CAN RETIRE AN OLD ASSERTION WITHOUT ANYONE TOUCHING THE TEST**, which is the
     shape roster entry 188 records for a shared counter, arriving here through a shared code path.
     The guard above is NOT redundant and must not be deleted on the strength of this: it is what
     stops the division happening at all, and `Infinity` reaching a figure is exactly the class of
     value this app must never render. It is defence in depth that now has one observable layer.
     `dishRatios` carries the same pair of lines and its equivalent mutant IS killed, because there
     the zero-price dish lands in the "check the price" LIST rather than being dropped — the
     difference is observable there and is asserted in food-cost-bound.test.js. */
  {
    key: "computeInsights :: if(!m || !(m.price>0)) return; :: logical ||>&& #0",
    reason: 'Equivalent since 241 added the sanity bound to this function: the mutant lets a zero-price dish past '
      + 'this guard, the next lines compute Infinity%, and the bound returns. Same exit, nothing observable. '
      + 'Killed before 241; the guard stays because it is what prevents the division, not merely the outcome.',
  },
  {
    key: "computeInsights :: if(!m || !(m.price>0)) return; :: relational >>>= #0",
    reason: 'The same equivalence as the entry above, on the other operator of the same guard: price exactly 0 '
      + 'passes the mutated test, reaches the bound as Infinity%, and returns there instead.',
  },
  {
    key: "computeInsights :: if(cost/m.price*100 > FOOD_COST_SANE_MAX) return; :: relational >>>= #0",
    reason: 'Exact-boundary tie at precisely 300%. The bound is a typo detector and 300 is deliberately far above '
      + 'anything arguable, so which side an exact 300.000% falls is not a decision worth pinning — pinning it '
      + 'would state an arbitrary choice as though it were one. Both sides away from the tie are asserted in '
      + 'food-cost-bound.test.js (299 counts, 301 does not), and the same tie in dishRatios IS killed there, '
      + 'because the LIST makes it observable while this function only drops the dish.',
  },

  /* 241 — kpiStripHtml's four EXACT-BOUNDARY ties, added the batch this function first became a
     target. None is a defect and none is killable, and the reasons are two different kinds.

     ⚠️ THE FIRST ONE IS ONLY EQUIVALENT BECAUSE OF THIS BATCH'S OWN CHANGE, which is worth writing
     down: `m.price>0` -> `>=0` differs solely at a price of exactly 0, and there the mutant now
     falls into the branch, computes `cost/0*100` = Infinity, and Infinity is over FOOD_COST_SANE_MAX
     — so it lands in `unready`, which is precisely where the unmutated `else` puts it. The sanity
     bound closed the gap. Before this batch the mutant would have divided by zero and counted the
     plate as costed at Infinity%, and it WAS killable. If the bound is ever removed, this allowance
     is wrong and must go with it.

     The other three are DISPLAY-EPSILON ties, and the epsilon exists precisely so that no cell can
     contradict another on a rounding hair (the comment at the site says so). Each differs only when
     a figure sits EXACTLY on the boundary — 30.05 against a 30% target, or a gap of exactly ±0.05 —
     where which side it falls is arbitrary by construction and the design deliberately puts the tie
     on the calmer side. An assertion pinning the tie would pin an arbitrary choice as though it were
     a decision, which is this repo's "a title that names a property the assertions cannot see"
     failure wearing a different hat. The NON-tie behaviour on both sides is pinned in
     food-cost-bound.test.js §6. */
  {
    key: "kpiStripHtml :: if(m.price>0 && c>0){ :: relational >>>= #0",
    reason: 'Equivalent ONLY since 241 added FOOD_COST_SANE_MAX: at a price of exactly 0 the mutant enters the '
      + 'branch, computes Infinity%, and the new bound routes it to `unready` — the same cell the unmutated `else` '
      + 'uses. Measured, not argued (food-cost-bound.test.js pins the zero-price outcome from both sides). '
      + 'If the bound is removed this allowance must be removed with it: the mutant was killable before it.',
  },
  {
    key: "kpiStripHtml :: costed++; if(pct0 > cogsPct+0.05) over++; :: relational >>>= #0",
    reason: 'Display-epsilon tie. Differs only when a plate sits EXACTLY on target+0.05, where which side it falls '
      + 'is arbitrary and the epsilon exists to stop the cells disagreeing on a rounding hair. Both sides of the '
      + 'boundary are asserted (30.04 is not over, 31.0 is); the tie itself is not a decision to pin.',
  },
  {
    key: "kpiStripHtml :: var sub=(d>0.05) ? (d.toFixed(1)+' pts over your '+fmtTargetPct()+' target') :: relational >>>= #0",
    reason: 'Same display-epsilon tie, on the sub-line. A gap of exactly +0.05 reads as "at your target" either way '
      + 'once rounded, which is what the band is for. The over/under/at states are each asserted away from the tie.',
  },
  {
    key: "kpiStripHtml :: : (d<-0.05 ? (Math.abs(d).toFixed(1)+' pts under your '+fmtTargetPct()+' target') :: relational <><= #0",
    reason: 'The mirror of the entry above, on the under side. Same reason, same assertions.',
  },

  /* 238 — authUrlParams' VALUE ternary, `i<0` -> `i<=0`. The two ternaries on that line take the
     same test and only ONE of them is observable, which is why the key's `#1` matters: `#0` is the
     KEY ternary and is killed by an assertion (a `=foo` pair must not become the key `"=foo"`).
     `#1` is the value, and it is equivalent in every reachable state, measured rather than argued.
     The two differ only at `i === 0` — a pair whose `=` is the first character. At `i === 0` the
     key is `kv.slice(0, 0)`, the empty string, so the very next statement is `if(!k) return;` and
     the value is discarded before anything can read it. At `i < 0` (no `=` at all) both conditions
     are true and both yield `''`; at `i > 0` both are false and both slice from `i + 1`. There is
     no input that distinguishes them, so no assertion can kill it.
     ⚠️ IT IS NOT DELETED, because the ternary is what makes the `!k` guard SAFE rather than
     redundant: reordering so the value is computed after the guard would leave the same mutant and
     lose the property that this function never slices past the end of a pair it has rejected. */
  {
    key: "authUrlParams :: var i=kv.indexOf('='), k=(i<0?kv:kv.slice(0,i)), v=(i<0?'':kv.slice(i+1)); :: relational <><= #1",
    reason: 'Equivalent in every reachable state, measured: the two conditions differ only at i===0, where the key '
      + 'is the empty string and `if(!k) return;` discards the pair before the value is read. At i<0 both yield "" '
      + 'and at i>0 both slice from i+1. No input distinguishes them. The sibling #0, on the KEY, is killed by an '
      + 'assertion in auth-url-error.test.js.',
  },

  /* 237 — invPackWeight's null guard. `(row && row.name)` -> `(row || row.name)`. MEASURED
     equivalent in every reachable state rather than argued: with a truthy row the two agree by
     definition; with row null/undefined the mutant's `(null || undefined)` is falsy, so both
     yield null; and with a row whose `name` is missing or empty the mutant reaches
     `packWeight(undefined)` / `packWeight('')`, whose weight-token regex matches nothing on the
     coerced string and which therefore returns null — the same answer, by a different route.
     There is no input that distinguishes them, so no assertion can kill it. The guard stays
     because this function is the ONE place the rest of the invoice path asks "which string
     describes the pack", and it must answer null rather than throw for a row that has no name. */
  {
    key: "invPackWeight :: return (row && row.name) ? packWeight(row.name) : null;         // parsePdfLine slices `name` at the FIRST money, so it excludes exactly the money columns :: logical &&>|| #0",
    reason: 'Equivalent in every reachable state, measured: truthy row -> identical; null/undefined row -> both '
      + 'null (the mutant\'s || chain is falsy); row with missing/empty name -> the mutant calls packWeight on a '
      + 'coerced string whose regex matches no weight token, returning null anyway. No input distinguishes the two.',
  },

  /* 236/237 — invFixRow's fold check. `!w.factors || w.factors[0]!==k` -> `&&`. Both halves
     are unreachable by the time this line runs, MEASURED rather than argued:
       · `w.factors` is always an array — packWeight returns `{qtyInCat, cat, factors, unitNum}`
         with `factors` initialised to `[]` and only ever pushed to, so `!w.factors` is always
         false and the mutant's left operand can never rescue the guard;
       · `factors[0]!==k` cannot be true either, because this function's own entry regex is
         ANCHORED at position 0 and its container nouns (ctn/carton/case/box) are a SUBSET of
         packWeight's multiplier alternatives. So whenever the anchor matched "k <noun>" at the
         start, packWeight's first multiplier match is that same leading number, and factors[0]
         is k. Probed across spacing, plurals, leading zeros, 3-digit k and both weight orders:
         factors[0]===k in every case (the probe is in the batch's handover).
     So the line is a null-safety statement about packWeight's contract rather than a live gate,
     and no input can distinguish the mutant. Kept rather than deleted because packWeight lives
     inside the protected parser region: this function must not assume the shape of a return
     value it does not own. Delete the allowance the day the anchor or the noun list widens —
     a mid-line match WOULD make factors[0]!==k reachable, and then it is a real gate again. */
  {
    key: "invFixRow :: if(!w.factors || w.factors[0]!==k) return row;                  // k was not folded — nothing to undo :: logical ||>&& #0",
    reason: 'packWeight always returns a dense factors array (initialised [], only pushed to), so !w.factors is '
      + 'never true; and the entry regex is anchored at ^ with a container-noun list that is a subset of '
      + "packWeight's own multiplier alternatives, so a match at position 0 guarantees factors[0] === k. Measured "
      + 'across spacing, plurals, leading zeros, 3-digit k and both weight orders. No input distinguishes the '
      + 'mutant; the line is null-safety on a protected-region contract, not a live gate.',
  },

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
  /* 228 — plateHealPlan's `ask` guard. UNREACHABLE rather than equivalent-by-arithmetic, which is
     the stronger of the two reasons and is checkable by reading three consecutive lines. */
  {
    key: "plateHealPlan :: if(cands.length>1)   return {action:'ask',    plate:null,     candidates:cands}; :: relational >>>= #0",
    reason: 'cands.length>1 -> >=1 differs ONLY at length===1, and the line immediately above is '
      + '`if(cands.length===1) return {action:\'relink\'…}`, which has already returned for that value. '
      + 'Length cannot be negative and is an integer, so >=1 and >1 agree on every value that can reach '
      + 'this line. No assertion can kill it, because no input reaches the difference: a test written to '
      + 'try would have to construct a state the function returns from one line earlier. The ordering is '
      + 'load-bearing and is what makes this safe — if the two branches were ever swapped, this allowance '
      + 'stops being true and the gate would report it again.',
  },
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
  /* 224 — TWO EQUAL-SEQ BOUNDARIES IN confirmPrices, both genuinely unreachable rather than merely
     unlikely. `seq` is minted once per setProducts CALL, and every id in a call gets exactly one
     verdict (an id is either in the saved manifest or it is not), so two records for one id at the
     SAME seq can only come from that id appearing twice in one call's `entries`/`priced`. The two
     mutants below differ from the shipped code only at that equality, and in that case both arrive
     at the same stored record. The neighbouring boundaries that ARE reachable are killed by tests:
     "the SAME product patched twice in ONE refused call keeps the FIRST baseline" (the `<=` on the
     refusal arm) and "two refusals OVERLAPPING keep the OLDEST baseline" (the `!=null`). */
  {
    key: 'confirmPrices :: if(!s || s.seq<=seq) _priceSeen[e.id]={seq:seq, price:null}; :: relational <=>< #0',
    reason: 'The CONFIRM arm. At an equal seq the mutant skips the assignment and the shipped code performs '
      + 'it — and the value assigned, {seq, price:null}, is byte-identical to the record already there, '
      + 'because the only way to reach an equal seq is a second entry for the same id in the same call, '
      + 'which took this same branch a moment earlier. Nothing can observe the difference. The `<=` is kept '
      + 'because the guard it is half of ("do not overwrite something NEWER") reads correctly that way.',
  },
  {
    key: 'confirmPrices :: if(s && s.seq>seq) return;                                    // something newer already settled :: relational >>>= #0',
    reason: 'The REFUSAL arm. At an equal seq the mutant returns here; the shipped code falls through to the '
      + 'very next line, `if(s && s.price!=null && s.seq<=seq) return;`, which returns too — an equal seq '
      + 'only happens for a second entry of the same id in one call, and the first entry left a refusal '
      + 'record, so price is non-null. Same exit, same state, one line apart. The reachable half of this '
      + 'guard (a strictly NEWER record blocking a late refusal) is killed by "a refusal removes ITS OWN '
      + 'point, not whichever point happens to be last", which asserts confirmedPrice after a late refusal.',
  },
  {
    key: 'logIngPrice :: a.push({t:now, v:cpbuVal}); if(a.length>60) ingPriceLog[pid]=a.slice(-60); :: relational >>>= #0',
    reason: 'At exactly 60 points `a.slice(-60)` returns a copy of the whole array, and `a` IS `ingPriceLog[pid]` '
      + 'already, so the mutant re-assigns an identical series. Nothing holds a second reference to it: the only '
      + 'reader is ingPriceAt, which re-reads ingPriceLog[pid] each time. Truly equivalent, not merely unlikely.',
  },
  {
    key: 'setCogs :: if(seq>_cogsConfirmed){ _cogsConfirmed=seq; cogsServer=pct; }   // a late answer for an older write is not news :: relational >>>= #0',
    reason: '244. EQUALITY IS UNREACHABLE HERE, so `>=` and `>` cannot be told apart. A sequence is issued by '
      + '`++_cogsSeq` and therefore belongs to exactly one write, whose handler runs once — so `seq` can never '
      + 'already BE the confirmed one. The only other writer of `_cogsConfirmed` is `resetTenantState`, which '
      + 'sets it to a freshly incremented `_cogsSeq` that no write has been issued under, and which is by '
      + 'construction GREATER than every outstanding seq. So the two operators differ only on a state the '
      + 'counter cannot enter. The reachable half of this guard — a LATE answer for an OLDER write failing to '
      + 'overwrite a newer confirmed value — is killed by "two writes that both SUCCEED out of order leave the '
      + 'NEWER one confirmed", which is the defect the pre-push review measured and this line exists for.',
  },
  {
    key: 'orphanPidGroups :: if(!o || !o.pid) return; :: logical ||>&& #0',
    reason: '249. The guard defends against a value its own producer cannot make. `orphanPidGroups` builds its '
      + 'list by calling `barePidPlan` itself — the argument is plates and kings, not the orphan array — and that '
      + 'function only ever pushes well-formed `{plateId, plate, pid, why}` objects, never a null and never one '
      + 'without a pid. So no input to this function can reach the mutated branch, and the `&&` form differs only '
      + 'on a null entry, where it would throw rather than skip. Kept as written because the two readers of that '
      + 'array are in different parts of the file and a future third producer is not this test\'s to assume.',
  },
  {
    key: 'orphanChoiceDelta :: if(!l || l.misc || l.kid || l.pid!==pid) return; :: logical ||>&& #1',
    reason: '249. Occurrence #1 is `l.misc || l.kid`, and collapsing it to `&&` changes nothing REACHABLE because '
      + 'the third clause catches both shapes on its own: a misc line carries no `pid` and a kid line carries no '
      + '`pid`, so `l.pid!==pid` is true for each and the line is skipped either way. The only input that could '
      + 'tell them apart is a line that is BOTH misc and pointed at this product, which no writer in the app '
      + 'produces — `saveCurrentPlate` writes a misc line as `{misc,label,cost}`. The other three occurrences of '
      + 'this guard are killed by the malformed-shapes test.',
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
