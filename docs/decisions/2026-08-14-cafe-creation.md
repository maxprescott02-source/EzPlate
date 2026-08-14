> ## ✅ ANSWERED, 14 Aug 2026 — **1B, 2A.**
>
> **1 = B, self-service signup.** A stranger creates an account and names their own café, unattended. He was told in this file and in chat that B reverses his own "a self-service sign-up form is still NO" call of the same day, and chose it anyway. A and C are declined.
> **Consequence, recorded rather than re-argued:** B is now ordered behind the privacy gate and pdf.js 4.2.67+, because a stranger's café is a non-Scoopy's row and the privacy-gate rule is "before the first one exists, not after". That is a `Do after:` on the queue item, not a second question.
>
> **2 = A, CSV only.** No third dependency. The importer accepts CSV and says so.
>
> Both recorded in `CLAUDE.md`'s privacy-gate section and at their queue items. The questions below are kept verbatim as the record of what was asked.

---

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

---

# Question 2 — should the catalogue importer accept Excel files, or CSV only?

Different question, same reply. This one is only here because the rule says a new third-party script needs your yes rather than my judgement.

**The background.** The next item builds the importer that fills a new café's product list from a supplier export. The queue item says "CSV/XLSX". CSV is plain text and costs nothing to read. **An `.xlsx` is a zipped bundle of XML and cannot be read without adding a library** — EzPlate ships two third-party scripts today and adding a third is your call.

**A — CSV only.**
Every spreadsheet program and every supplier portal I have seen offers CSV, and "Save as CSV" is one menu item. No new dependency, no new thing to keep patched, and the file picker says plainly which formats it takes.

**B — CSV and Excel.**
Nobody has to think about file formats. Costs a new third-party library that parses zip archives and XML, permanently, in a page that holds your pricing — and every dependency here is pinned and hash-checked by hand, so it is a standing maintenance cost rather than a one-off.

**My recommendation: A**, and I would revisit it only if a real café actually hands us a workbook and cannot produce a CSV from it.

⚠️ **One thing to check before you even answer**: when you export "Previous purchases" from the supplier portal, **does it offer CSV?** Nobody wrote the format down — only the columns. If it gives you a CSV, question 2 barely matters and A is obviously right.

## To answer

Reply in chat with the letters, e.g. `1C 2A`.
