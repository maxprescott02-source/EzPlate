# HANDOVER - 186 (sign-in becomes mandatory)

**Branch:** `feature/186-mandatory-sign-in` · **Scope:** queue item 1, Supabase Auth the REMAINDER, step 3 - and the signed-out screen step 2 said had to exist first.
**Deploy version shipped:** `ezplate-v162`.

## What changed

The `auth.uid() is null` branch is gone from `current_business_id()`, so the anon key that ships in `index.html` no longer reads the cafe.
Anyone opening the app now sees a sign-in screen, and only an account with a `business_members` row sees anything at all.

A signed-out caller and a signed-in non-member answer the server IDENTICALLY after that change: a null tenant, empty reads, a clean 200.
They get opposite screens, chosen from the session that already rides bootstrapSync's `Promise.all`, so the distinction costs no round trip.
The sign-in screen is a fourth boot-gate state with its own form; 185's "ask the cafe owner" screen is unchanged in substance.

Both of those screens now cover the nav and the desktop rail, which 185 left showing only because it was out of that batch's scope.
The ERROR state deliberately still does not, because Try again and a reachable Settings are what help when data is merely missing.

`authSubmit` is extracted, so the two forms share one validate/disable/report sequence rather than a copy.
The gate's form does not set `authUserInitiated`, and that is the one line in this batch that guards data: the flag records whether the unfinished-plate question was PUT to the user, and this screen has not put it, so the draft is kept.

The Account card's copy said signing in "does not change what you can see or do".
True until this batch, false the moment the migration ran.

## The pre-push review found two, and both were real

**1. The gate's sign-in kept the plate draft, and that carries one café's unsaved work into another's session.**
I had written the opposite as a deliberate decision, with a comment arguing it: the screen asks nothing, so it may not destroy anything.
That holds for the same person coming back and for nobody else.
This is the ONLY sign-in a signed-out browser can reach, so it is also how a different account signs in on a device, and `cafeDB_plateDraft` is one global key with no tenant in it - the new session would be offered the previous account's plate BY NAME, with `{kid,qty}` lines pointing at ids that mean something else.
It now asks, exactly as the Account card does, which satisfies the same underlying rule (nothing goes without the user being told) on the correct side of it.
**The sharper half needed no account switch at all:** `offerPlateDraftResume`'s own comment says the confirm modal outranks the boot gate, so a stranger opening the URL on a device that once held a session was shown a dialog naming a plate, and could load it. Guarded now, before the dialog, with a return.
The test that pinned the old contract was INVERTED rather than deleted, with the reversal written into it, and both fixes were hand-mutated to confirm the assertions go red.

**2. The migration header claimed it had already been applied to production, and it had not.**
I drafted that paragraph ahead of time - date, method, "his 412 products" - and never removed it.
With `list_migrations` empty the file is the only audit trail these migrations have, so that is the trail lying, and it contradicted the sequencing rule this same diff adds.
Replaced with a NOT YET APPLIED note carrying the reason, and the general rule is now in `CLAUDE.md`.

Nothing was dismissed. The review's other four categories came back clean and I did not go looking for reasons to disagree with the two that did not.

## Into CLAUDE.md

Four edits, under standing authority.

**Tier 1, appended to 185's fail-open trap: a fail-open default is a decision about CONSEQUENCE, not about epistemics.**
A second unreadable answer landed one line from the first and is deliberately collapsed to two values.
Without this, 185's rule reads as "three values for every unknown", which is a tax; the real test is whether either branch does something you cannot take back.

**Tier 3, migrations: a client change and a migration are ONE change, and the order between them is an intermediate state the transaction cannot protect.**
The existing rule about ordering statements is the same law one level down.
Here the window is minutes with a phone in it, and the safe order was client first.

**Tier 3, migrations: a migration whose failure mode is a lockout can refuse to run.**
A `do $$ ... raise exception ... $$;` block asserting the precondition, and proved to FIRE rather than merely written.

**Tier 3, migrations: write the "applied to production" record WHEN IT HAPPENS, never ahead of it.**
From finding 2 above. A pre-written record reads exactly like a verified one, because that is the form the rule asks for.

## New docs/QUEUE.md items

None.
Item 1 is DONE and deleted; the file is renumbered and the two facts that outlived it were rehomed rather than dropped.
**Google sign-in went to `docs/MAINTENANCE.md`** - it was explicitly optional from the day it was written, it needs a credential only Max can create, and by the tier test nobody is blocked by its absence.
**How an account gets created went into the Roles item**, because the thing that replaces "make it in the dashboard" is an invitation, which is a role decision - with the two operational facts (email confirmation is ON; Supabase signups are open at the API level) written in beside it.

## New docs/PHONE.md items

One block, and it is the first thing he should read: **he will be signed out on every device.**
Sign in on the phone; check the on-screen keyboard does not cover the Sign in button, which is the one thing a desktop browser at 380px cannot reproduce; close and reopen to prove the session survives an installed-PWA relaunch; confirm a half-built plate survived.
A failure on the second reopen would mean the token is cleared on launch, which is a real bug rather than a preference.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing on the substance, and its warning was exactly right.
One thing it framed as smaller than it is: it called step 3 "a one-function change", which is true of the SQL and hid that the client work is the larger half.
The migration is nine lines; the screen it requires is a new gate state, a second form, a shared submit path, and the whole question of what a stranger sees.
Reading "one-function change" as the size of the batch would have produced a migration with no front door.

**What did you not propose because it was out of scope?**
Three.
The sign-in screen has no "forgot password" and no way to recover an account - there is no route at all today, and for a one-account cafe that is survivable, but it stops being survivable the moment a second real person has a login.
The boot gate is now three screens with a shared `.bg-inner`; a fourth would be the point to stop adding states to one function, which I would rather say now than discover later.
And `cafeDB_plateDraft` still has no tenant in it.
The review's finding is closed by asking, which is correct and cheap, but the underlying fact is that one localStorage key holds authored work belonging to whichever café was last signed in.
Stamping the draft with its author - the `envFence` pattern, one field - would let a switch keep the right draft and ignore the wrong one instead of discarding either.
I did not build it here because it changes the draft's shape for a case that cannot occur until a second account exists, which is the Roles item.

## Surprises

**The unit suite could not see an inverted screen choice.**
Flipping `if(_u)` to `if(!_u)` - which tells a stranger "you're signed in as , but that account isn't linked to a cafe" and hands a real non-member a form that cannot help - left all 1174 unit tests green.
Only the browser specs caught it, and those do not run in `npm test`.
A polarity assertion now kills it, and was checked by re-running the mutation and watching it go red.

**Nothing pinned the draft-keeping contract either.**
Adding `authUserInitiated=true` to the gate's handler - one plausible-looking line that destroys an unfinished plate on sign-in - also left the whole suite green.
That is now the assertion described above, with its mirror on the Account form so it cannot pass by the flag having been deleted everywhere.
Both were found by hand-mutating, not by the mechanised gate: neither `bootGate` nor `bootstrapSync` is a target, and a function that is not a target has never been asked the question.

**`extractFn` silently dropped `async`.**
It searches for `function <name>(`, so an async function was sliced from the `function` keyword and every `await` inside became a syntax error - reported against the extractor rather than the function.
No async function had ever been extracted before, so this surfaced the first time one was.
Fixed in `tests/_extractfn.js`, which every test harness in the repo shares.

**An anon INSERT is refused OUT LOUD, which contradicts what I expected from `docs/STAGING.md`.**
That file's warning - an empty array is the failure signal, not an error - is about UPDATE and DELETE.
An INSERT against a `with check` returns `42501` and HTTP 401.
Measured, and written into the migration header, because the expectation I had drafted there first said "comes back empty".

**The staging accounts' passwords were nowhere**, which is correct for a public repo and was still a dead end for half an hour.
`docs/STAGING.md` now records the one statement that sets a throwaway one through the MCP.
The method is the durable thing; the password deliberately is not.
