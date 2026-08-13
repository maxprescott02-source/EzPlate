# HANDOVER - 185 (the non-member boot gate)

**Branch:** `185-nonmember-boot-gate` · **Scope:** queue item 1, Supabase Auth the REMAINDER, second bullet step 2.
**Deploy version shipped:** `ezplate-v161`.

## What changed

A signed-in account with no `business_members` row is now told so, instead of being shown an empty app.
Before this, every table read succeeded and returned nothing, so the app booted clean, raised no error and painted every screen at zero, which is indistinguishable from the cafe having been deleted.
The gate names the account, says no data has been lost, and offers Sign out; Try again is hidden, because retrying asks the same question and gets the same answer.
`setSync('none')` is new: the first build wore `setSync('error')` there, which prints "Can't reach server, working offline", both halves false, a pill's width from a message saying nothing was lost.

The signal is measured, not reasoned.
On staging over PostgREST: `anon` and a member both get the cafe's uuid from `rpc/current_business_id`, and only a signed-in non-member gets `null`, with HTTP 200 in every case.
That is why no session read is needed to interpret the answer.
The lookup rides bootstrapSync's existing `Promise.all`, so it costs no extra round trip.

`tenantGateState` answers THREE things, not two: `ok`, `nomember`, and `unknown`.
Fail-open is right with no prior information, because on a first boot the alternative is locking a legitimate user out of a working app, and RLS is the real control.
It is wrong as a recheck, and that distinction is the pre-push review's finding, below.
Only a definite uuid clears the latch, only a definite null sets it, and "could not tell" changes nothing either way.

## Into CLAUDE.md

One new Tier 1 trap, added under standing authority: **"fail open" is what you do with no information, and reusing it as the answer to a recheck reopens the hole.**
It earned its place by costing this batch a real defect that survived my own reasoning and was caught only by the review, and the tell generalises well beyond auth: a boolean guard whose branches are "definitely bad" and "everything else" needs a third value the moment a caller can already hold an answer.
It is also filed next to the existing empty-read ambiguity, because they are the same family: a successful-but-empty read, an RLS-blocked read and a failed read are three things that arrive looking like two.

Nothing else.
The other mechanisms here were already governed: the client-versus-MCP role distinction predicted the PostgREST measurement, and the "a test that greps source is searching PROSE" rule is what caught the auth test failing on this batch's own comment.

## New docs/QUEUE.md items

None new, but item 1's steps 2 and 3 were rewritten.
Step 2 is marked done, and step 3 carries a warning it must not re-derive: **when the anon branch is removed from `current_business_id()`, `anon` starts returning `null` too**, measured on staging.
Every signed-out visitor would then hit this gate reading "ask the cafe owner to add this account", which is right for a stranger and wrong for Max on a fresh browser.
Step 3 has to decide what a signed-out caller sees before it drops the branch, and the answer is a sign-in screen, not this gate.

## New docs/PHONE.md items

None.
The state was driven at 380px in both themes in Chrome and in Playwright, and the full round trip, sign in as a non-member, read the gate, sign out, land back in the app, was driven end to end against staging.
Nothing here needs a device to settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
Nothing on the substance.
One framing was worth correcting though: the item said the message was "item 5's empty-state work, not a migration's", which reads as though this is an empty-state problem.
It is not, and treating it as one would have produced the wrong fix.
An empty state describes a real cafe with no data yet; this is a caller who cannot see data that exists.
The two need opposite copy, and the gate deliberately does not reuse any empty-state component.

**What did you not propose because it was out of scope?**
Two things.
The gate leaves the nav visible, so a non-member can still tap through to Account and Settings and see the gate over each; that is the existing `#bootGate` design and changing it is a screen decision, not this one.
And the wording of the no-email fallback still asserts "You're signed in", which is true in every case reachable today but will stop being true the moment step 3 lands.
I left it alone rather than hedging today's message against a future migration, and wrote the consequence into step 3 instead.

## Surprises

**The mutation gate found nothing; reasoning found two things it could not.**
Deleting the early `return` in bootstrapSync left all 1138 tests green, and the consequence was severe: the run carries on, reaches its own `bootReady('ok')`, and that call hides the gate, restoring the silent empty app with the explanation flashing past for one frame.
The `_bootNoMember` latch makes that benign and an assertion now kills it.

**The latch I added to fix that then wedged the app, and no test would have caught it either.**
It survived into the next `bootstrapSync`, and the `online` listener re-runs that, so a user whose membership was granted between two runs would get a spinner and "Loading your data..." forever on a working account.
My fix was to scope it to one boot run by clearing it in the `loading` branch.
**That fix is itself wrong and was overturned by the review below; it is written down rather than tidied away, because the SEQUENCE is the actual lesson here, not any one of its steps.**
The clear now lives where the ANSWER is, in `bootstrapSync`, and only a definite uuid performs it.

**My own theme axis was vacuous on the first cut**, and `tests/visual/v142-menu.spec.js` already records the identical mistake on the identical key.
`THEME_KEY` is `cafeCost_theme`, not `cafeDB_theme`, so light and dark ran as two copies of one test.
The new spec now asserts the background luminance actually changed, so the axis cannot go quiet again, and that assertion was checked by reverting the key and watching two tests go red.

**The pre-push review found the batch's real defect, and my own fix was what created it.**
Recorded in full because the shape is general and I got it wrong twice in a row.
The latch was cleared at the top of every boot run, to stop the wedge above.
That reopened the hole from the other side: from an existing gate, the `online` listener re-runs `bootstrapSync`, and if the tenant lookup ALONE fails, one flaky request out of twelve, `tenantGateState` fell open to `ok`.
The four required reads still succeed with `[]`, because RLS filters rows rather than erroring, so nothing throws, every store is emptied, and `bootReady('ok')` hides the gate.
The silent empty app, restored by a network blip, on the exact path the latch was hardened for.

The general lesson is now a Tier 1 rule in `CLAUDE.md` and is not restated here.
What belongs here is the fix and its proof: a third answer, `unknown`, resolved by the caller against what it already knows.
`tests/visual/v161-nonmember.spec.js` reproduces it in a browser, and the spec fails against the reviewed code, which was checked by reverting.
The review's second finding, that the gate flickered its explanation away on every re-sync, is fixed by the same change.

**And that fix had a fourth defect in it, found by tracing rather than by a test.**
Four in a row on the same twenty lines, which is the honest count and the reason this section is long.
The early return that stops an automatic re-sync disturbing the gate also swallowed the `loading` produced by an explicit Try again tap, reachable once a real connection failure has taken over the screen.
That is the same "the button looks dead" bug v115 already fixed once, in the same function.
`!_bootRetrying` separates a tap from an automatic re-sync, and both mutants are killed.
**The pattern across all four: every one of them was a state machine gaining a state, and each fix was correct about the case in front of it and silent about the case behind it.**
A screen with four states and a latch is worth drawing out in full before editing, not reasoning about one transition at a time.

**The verification pass confirmed both findings closed, and independently found the fourth defect I had already fixed an hour earlier.**
Two readers reaching the same twenty lines by different routes is the useful part; it is not a third finding.

**One residual is accepted and named rather than fixed, because it cannot be fixed here.**
On a FIRST boot, if the tenant lookup errors while the four required reads succeed with `[]`, the latch has never been armed, so the app falls open and shows an empty café with no message.
That is the documented fail-open trade and it is not closable from the client: gating on "could not tell, and everything came back empty" would false-alarm on a genuinely brand-new cafe, which is exactly the zero state the onboarding item exists to build.
Distinguishing "a new cafe" from "no cafe" is precisely what the lookup answers, so when the lookup does not answer, the client has nothing left to reason from.
A miss costs the empty screen we already had; a false alarm locks a real user out of a working app.

**The Playwright shim had no `rpc` and no `auth`**, so the first version of the `Promise.all` entry threw while the array was still being built, inside the try, and reported "couldn't load your data" on a working database.
`softCall` guards that, and the shim now serves `rpc` so the specs exercise the real path rather than the degraded one.
`auth` is still deliberately absent, because `authInit` bails on it exactly as it does today.
