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
  // ── The guards. `isFinite('')` is TRUE, so these are the lines a blank field walks through. ──
  { fn: 'setProduct', tests: ['price-log-paths.test.js', 'pack-survives.test.js', 'cat-label.test.js'] },
  { fn: 'logIngPrice', tests: ['price-log-paths.test.js'] },
  { fn: 'samePrice', tests: ['price-log-paths.test.js'] },

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
  {
    key: 'setProduct :: productsById[id] = Object.assign({}, productsById[id]||{}, patch); :: logical ||>&& #0',
    reason: '`Object.assign` IGNORES a null or undefined source. With the product absent, `x||{}` gives `{}` '
      + 'and `x&&{}` gives undefined, and Object.assign treats the two identically — the `||{}` is there for '
      + 'readers, not for the runtime. No input distinguishes them, so no assertion can.',
  },
  {
    key: "setProduct :: if(patch && Object.prototype.hasOwnProperty.call(patch, 'cost_per_base_unit')){ :: logical &&>|| #0",
    reason: 'The two guards compose, and the second one absorbs this. With any object patch, `patch||hasOwn(…)` '
      + 'is true, the branch runs with `now === undefined`, and logIngPrice refuses it on `typeof` — the exact '
      + 'guard CLAUDE.md insists on, doing its job one layer down. The only input that tells them apart is a '
      + 'FALSY patch, where the mutant throws on hasOwnProperty.call(null) — and no caller passes one; the `&&` '
      + 'is defending against a shape the app does not produce. A test for it would pin the defence, not the app.',
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
  { fn: 'gemApplyReadings', tests: ['invoice-gate.test.js'], survivors: 44, measured: '180' },
];

module.exports = { targets, allowedSurvivors, pending };
