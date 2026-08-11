# HANDOVER - 174 (Supabase sign-in)

**Branch:** `auth-174` · **Scope:** `docs/QUEUE.md` item *Supabase Auth*. Ships `ezplate-v154`.

## What changed

The Account screen's Profile card was a placeholder sentence and is now a real sign-in.
Email and password, a real session that survives a reload, sign-out, and the server's actual error text when a sign-in fails.

**It gates nothing, and that is the design.** Every RLS policy is still `using (true)` for `public`, which covers `anon` and `authenticated` alike, so a signed-in session sees exactly what a signed-out one sees. Gating the app before isolation exists would lock the door on a building with no walls, and it could lock Max out of his own café's data for no gain. A test pins that nothing consults `authUser`, so a later batch cannot make it mandatory by accident.

**There is no sign-up path.** The anon key ships in `index.html`, so anyone who reads the page already has the access an account would grant. A sign-up form would not create that exposure, but it would advertise it.

A change of user purges local state through the same `purgeLocalState` the environment fence uses, lifted out of `envFence` rather than written a second time. A change of user and a change of environment are the same event as far as local state is concerned.

## Into CLAUDE.md

Nothing proposed. Every rule this batch leaned on was already there and none needed changing.

## New docs/QUEUE.md items

None added; the auth item was **rewritten** to the three pieces that remain. One of them is Max's and is in the decision file below rather than only here.

## New docs/PHONE.md items

None. The form was measured at 380 and 1360 in both themes and is pinned in `tests/visual/v154-account.spec.js`, so there is nothing left that only a device can settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
The item said "email/password, optional Google" as though they were one piece of work. Google is not code — it needs an OAuth client id and secret created in Google Cloud and pasted into the Supabase dashboard, which nobody but Max can do. Building the two-line client call for a provider that would fail on every attempt would have been worse than not building it, so the item now names it as his.

The larger judgement was **what "auth" should mean this batch**. The obvious reading is a login screen the app sits behind. I did not build that, and would push back on it: with every policy still `using (true)`, a gate would authenticate without isolating, and the failure mode of getting it wrong is Max unable to open his own café's pricing. Auth that proves the mechanism and gives the multi-tenant item a real `auth.uid()` to attach to is worth shipping; a gate is worth shipping the day it gates something.

**What did you not propose because it was out of scope?**
Supabase sign-ups are open at the API level by default, so anyone can create an account against this project right now. That is **not made worse** by this batch — the anon key already grants everything an account would — but it is real, and it belongs to the gate-review item rather than here. I did not turn it off, because that is a dashboard setting and because doing it quietly would hide a thing the gate review needs to see.

I also left password reset unbuilt. There is one account and it does not exist yet.

## Surprises

**Email confirmation is on, and it fails like a wrong password.** Creating an account and immediately signing in returns "Email not confirmed", which reads exactly like a credentials problem. Found by rehearsing on staging rather than by reading, and written into the queue item, because the first real sign-in Max attempts will hit it if he creates the account in the dashboard without confirming it.

**A flex basis silently became a height.** `.acct-in` is `flex:1 1 180px`, which is a width hint while the form is a row. The mobile breakpoint turns the form into a column, and a flex basis applies to the MAIN axis — so at 380 the phone shipped three 180px-tall text fields. The rule looks correct in the file at both breakpoints; **only measuring shows it**, which is the same lesson `CLAUDE.md` already records for `@media` specificity and which I now have a second, different mechanism for. The new spec fails without the fix; I checked by removing the fix rather than assuming.

**Two existing specs asserted the account screen carries NO control.** Both had to be rewritten, and the interesting part is that they were RIGHT when written: the rule is §R4, "a capability that does not exist is stated in a sentence, never mimed with a control that does nothing". Profile now has the capability, so a sentence there would have been the dishonest option. The assertions narrowed to Team and Plan, which still promise nothing, and gained a positive check that Profile's controls really exist — so the rewrite cannot pass by the form having vanished. "Sign out" left the forbidden-labels list for the same reason.

**The header subtitle became false the moment the form shipped.** It said "Arrives with EzPlate accounts". Nothing tests screen subtitles, and it would have sat there indefinitely under a working sign-in.

## Review findings, both fixed in this branch

**CRITICAL, and it was mine: signing in silently destroyed an unfinished plate.** `authSwitchUser` purged every `cafeDB_`/`cafeCost_` key, which by construction includes `cafeDB_plateDraft` — the one thing in local storage that is unsaved AUTHORED work rather than a preference, and which `CLAUDE.md` names as the standing exception for exactly this reason. Worse, my own copy said *"signing in changes nothing about what you can see or do"*, which was true of the database and false of the device, and the sign-out line called a destroyed plate a "preference". Worse again, an involuntary `SIGNED_OUT` from a failed token refresh went down the identical path, so it could fire with no user action at all.

Two fixes, and the shape of the first is the point: **the confirm sits on the button, not on the purge.** `CLAUDE.md` already records why — gating the last committing action is not a gate, because by the time `authApply` runs the session has changed and honouring a "no" would mean undoing it. Sign-in and sign-out now go through the app's own `unfinishedPlateWaiting()` and `askConfirm`, the same machinery every other destructive path in the builder uses. Second, an **involuntary** session change keeps the draft and purges only the preferences: nothing happened that the user could have consented to.

Driven live rather than argued: the confirm appears with the plate's name, "Keep editing" leaves the draft, the session and the screen exactly as they were, and a sign-in that then FAILS also leaves the draft alone, because no identity changed.

**A dead assertion in my own test.** `S.purges` was read but never incremented, so that line could not fail. The harness now wraps the real `purgeLocalState` to count calls and record what it was told to keep — which is what let the new involuntary-sign-out test assert the draft key is preserved deliberately rather than by luck.

## One limit, stated

The final end-to-end pass — confirm, then a SUCCESSFUL sign-in, then observe the draft gone — could not be re-run live: Supabase's free tier rate-limited confirmation emails after the earlier rehearsals, so the test account could not be recreated. What was verified live is the successful sign-in chain (purge, reload, `authenticated` JWT role, writes still working, symmetric sign-out) earlier in the batch, and both branches of the new guard afterwards. The join between them is covered by `tests/auth.test.js` against the real functions. Worth re-running on a device when the limit resets.
