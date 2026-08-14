# Decision — 14 Aug 2026: how does a new café come into existence?

One question. It is prose rather than a rendered file because nothing here is visual — it is about who is allowed to do a thing, not what it looks like.

## Where this came from

Batch 192 shipped invitations. You can now add somebody to Scoopy's from Account → Team, and they can get in, without you opening the Supabase dashboard.

Going to build the next item — "a new café cannot be CREATED at all" — I hit something the queue had not noticed, because the two halves were decided a day apart:

- The sign-up form 192 shipped **only opens for an address you invited**. That was the point, and it is your call from 14 Aug: a self-service sign-up form is still no.
- An invitation joins somebody to **the café that sent it**.
- So there is no way to get an account that is not already destined for an existing café — which means **a second café still cannot come into existence without the Supabase dashboard**, and the queue item's requirement cannot be met without opening a second, ungated sign-up path.

That second path is self-service signup. It is the thing you said no to, so I stopped rather than build it.

**Nothing is broken and nothing is waiting on this for Scoopy's.** This only matters the day there is a second café.

## The question

**Does a café come into existence because YOU set it up, or because a stranger signed up for one?**

## The options

**A — you provision each café.**
I build a function you call to create a café and its owner in one step. You then invite the owner exactly as you would invite staff today.
- No sign-up form changes. Nothing new is exposed to strangers.
- You are in the loop for every café that will ever exist, which is more work per customer but also means you know every customer.
- Removes the dashboard, which is the actual pain in the queue item.

**B — a stranger signs up and names their café.**
Anyone can create an account, and the first thing they see is "name your café".
- This is EzPlate as a product people find and sign up for, unattended.
- **It is a reversal of your 14 Aug call**, which is why it is here rather than being built.
- ⚠️ **It cannot ship until two other launch blockers close** — the moment a stranger's café exists, their invoices go to Google's free AI tier, which the privacy-gate item forbids outright, and the pdf.js vulnerability stops being theoretical because strangers are uploading the PDFs. Those are already items 3 and 4 on the queue; B makes them urgent rather than scheduled.

**C — a "founder" invitation. ← my recommendation if you do not want B**
Same invite box you now have, with one extra choice: this address **starts a new café** rather than joining Scoopy's.
- Reuses everything 191 and 192 already built. Smallest build of the three.
- Sign-up stays invitation-only, so no reversal and nothing new exposed.
- You still decide every café that exists, but you do it from the app in about four taps instead of from the dashboard.
- The new café's owner then invites their own staff themselves, which is the part you should not have to do for them.

## What I would do

**C**, unless you actually want EzPlate to be something strangers can sign up for on their own — in which case the honest answer is **B**, and it should wait behind the privacy gate and the pdf.js upgrade rather than jumping them.

A and C solve the same problem; C is less work for you per café and reuses machinery that already exists and is tested.

## What would change my mind

If you want to be able to hand EzPlate to someone at a trade show and have them be using it that afternoon without you touching anything, that is B and only B, and the two blockers above need doing first.

## To answer

Reply in chat with the letter. `1C` is enough.
