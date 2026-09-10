# Phone

**Five checks. Three to do once, two that wait for a thing you do anyway.**

✅ **IT WORKED. Max ran all five on 11 Sep 2026, the day after it was cut**, and four of the five turned up something real: a fuel levy imported as a product, an existing supplier offered back as a new one, a builder bar floating one home-indicator above the tab bar, and a confirmation link that never said it had worked. All four shipped as `ezplate-v213` the same day.
**Three of them were invisible to every harness in this repo** — one because `env(safe-area-inset-bottom)` is 0 on a desk, one because no desktop browser has a soft keyboard, and one because the success message paints on a screen that a success never shows. That is the entry test at the top of this file doing exactly what it was written for, on its first run.

⚠️ **This file was 1051 lines and 50 sections on 10 Sep 2026, and Max had never used it once.**
That is not laziness, it is the file being wrong: most of it was *"look at this redesigned screen and tell me how it feels"*, and by the time anyone read it those screens had been in daily use for a month.
**A taste question about a screen you use every day has already been answered by you not complaining about it.**
Keeping it on a list pretended it was open, and the length is what stopped the list being read at all - so the two genuinely dangerous checks buried at the bottom were never done either.

---

## What earns a place here, and it is a HARD test

A check belongs in this file only if **a browser agent driving Chromium could not settle it.**
That agent exists (`flow-tester`), it drives the real app at 380px in both themes, and it is free.
So the question is never "is this worth checking" - it is **"is a phone the only thing that CAN check it".**

**Only five things pass that test:**

| | |
|---|---|
| a real file | your invoices and price lists are not in this repo and cannot be |
| the soft keyboard | Chromium has none, so nothing about what the keyboard covers is testable |
| the installed PWA | standalone iOS Safari is a different engine from a browser tab |
| a real network drop, and iOS discarding the app | no harness reproduces the operating system |
| a real inbox | an email either arrives or it does not |

**Everything else goes to the agent.** Does a header wrap at 380px, does a button truncate, is a hit target 44px, does a pill overflow, does a dropdown clip, is the contrast AA - **all of that is measurable and none of it is yours.**
`docs/MAINTENANCE.md` carries the list that came off this file and what to do with it.

⚠️ **AND `/batch` MAY NOT APPEND HERE FREELY ANY MORE.** That rule is what produced 50 sections: every batch added its own, nothing ever removed one, and no batch is in a position to judge whether the list as a whole is still worth a person's time.
**A batch that wants to add a check must pass the table above and say which of the five rows it is, in the entry.** If it cannot name one, it is an agent check and it goes to `docs/MAINTENANCE.md`.
**Six is a smell.** If this file ever holds more than about five live checks, the oldest ones have expired and the fix is to delete them, not to add a sixth.

---

# The three to do

## 1. Import an invoice from EACH supplier · about ten minutes · **this is the one that matters**

**The parser was rewritten on 10 Sep 2026 (`ezplate-v211`) and one of your two suppliers was wrong on every line before it.**
Chips were being stored at $0.25/kg against a real $2.46, and the figure moved with how many cartons you happened to buy that week.

**Do the foodservice distributor FIRST.** It is the control: its invoices have always imported correctly, so nothing should change.
**Pass:** every price the same as last time.
**Fail:** any price different from the previous import of that product. Say which line.

**Then the poultry and smallgoods supplier.** This is where everything moves.
**Pass:** most rows arrive already ticked, and **each price matches the Item Price column on the paper in your hand** - per KG where the UOM says KG (bacon, chipolatas, chicken breast, smoked salmon), per carton or bag otherwise.
**Fail:** a ticked row whose price is not the number printed on the invoice. **Write the line down word for word** - the line text is the whole diagnosis.

**Four things that are NEW and are not faults:**

- **A credit note refuses.** Returned stock comes up asking for a price instead of importing as a purchase. ⚠️ **It explains itself badly** - it says *"unit mismatch"* when it means *"this is a refund"*. Known, filed. **Do not set a pack for a credit line.**
- **A line the parser cannot add up asks you to type the price** instead of showing a wrong one.
- **The bread and the beef patties show a longer name.** Their descriptions wrap onto two lines on the invoice and the second half is now joined on. That join is what makes their prices right.
- ~~**The fuel levy is still one row to dismiss** per import.~~ ✅ **FIXED in `ezplate-v213`** after you reported it. A charge whose every word is a charge word is no longer a product, however much it looks like one. **Fail: a real product goes MISSING** — which is the direction this fix can be wrong in, and it is visible, so say which line.

⚠️ **ONE CAVEAT ON "matches the paper", because it is only true of YOUR two suppliers.** Both of them print **ex-GST** prices, so the stored figure should equal the printed one. **If you ever import an invoice that says GST-inclusive**, a correct import stores about **9% BELOW** the printed per-unit figure, and the note above the table must say the prices were converted. **Matching the paper would then be the FAILURE.**
*(That was its own section on the old list — the v168 check, "costs money if wrong". It is folded in here rather than kept separate because you have no GST-inclusive supplier to run it against; the day you get one, this paragraph is the check. The wrong-answer symptom is the dangerous part: every cost 10% out, uniformly, on a screen of entirely plausible per-kg figures.)*

**While you are in there, three things that ride along** (each was its own entry on the old list):

- **The supplier name.** It should read as the supplier's trading name, not `Credit Terms: 7 Days` or `Document No:`.
  ⚠️ **AND ON AN ADD-NEW ROW, CHECK THE SUPPLIER FIELD.** You reported it offering to create **B&E Poultry** when you already have **B&E**. From `ezplate-v213` a prefill that starts with a supplier you already have snaps to YOURS. **Fail: two spellings of one supplier in the Products filter** — or the opposite, a genuinely new supplier being folded into an existing one, which is the direction worth watching.
- **The "AI checked" note** should appear as usual. If it says **"AI check unavailable"** on every invoice however good the signal, the AI second reader is being refused - not urgent, no wrong prices, but say so.
- **Change a row's match dropdown to another product and back.** The price must not move. *(A defect once divided it by 1.1 on every change - 9% lower each time, with nothing on screen to show it.)* **Do this on a line whose product has a taught pack** if you can: that is the path the defect lived on, and `ezplate-v211` changed what feeds it.

**Afterwards, look at the price history of two or three of the products you just imported.** It will show a jump the day you import this. **That jump is the fix landing, not a price rise.**

---

## 2. Save a plate with no signal, then background the app · five minutes

**Do this:** open the builder, change a plate (add a line or re-portion one), **turn the network off**, tap Save.
The toast must say it has **not** been saved and the "Saved just now" badge must stay down.
Then background the app, leave it long enough for iOS to throw the tab away, and reopen.

**Pass:** the next time you open the builder it offers *"You were building X. Resume it, or discard?"* and Resume brings your edit back.
**Fail:** no offer, and the plate is back to how it was before you edited it. That is lost work.

**Then do the same with the network ON**, where the right answer is the opposite: **no offer at all**, because the plate really did save.
**Fail:** being asked to "resume or discard" a plate that saved cleanly.

**Why a phone:** the failure is iOS discarding the app and the next boot overwriting your plates from the server. Nothing in this repo reproduces the operating system doing that.

---

## 3. The keyboard, and the app cold from the home screen · five minutes

Two things a desktop browser physically cannot show: it has no soft keyboard, and it is not the installed app.

**The keyboard.** Open the builder, tap the ingredient search, type two letters that match a lot of products (`ch`).
**Pass:** the list sits BELOW the field, you can still read what you typed, and you can scroll to the last row.
**Fail:** the list sits over the field and covers your own text.
⚠️ **RE-CHECK, and this is a fix that could not be tested here.** You reported exactly that on 11 Sep and `ezplate-v213` subscribes the floating layers to `visualViewport`, which is the only event an iOS keyboard produces — `window.resize` does not fire (the height does not shrink) and `scroll` does not fire when iOS pans rather than scrolls, so the list was anchored once when it opened and then the field moved out from under it. **No browser on a desk has a soft keyboard**, so the listeners are tested and the CAUSE is not. If it still covers the field, say so and it needs a different mechanism, not a bigger version of this one.
**Then the sign-in screen** (sign out, or just look at it): the keyboard must not cover the **Sign in** button with no way to scroll to it.

**Cold from the home screen, in dark.** Close the app completely, set the phone to dark, and open the installed icon - not Safari.
**Pass:** it opens straight into the app already dark, and the title bar at the very top matches.
**Fail:** a flash of white before dark appears, or a near-black title bar sitting above a white app. **Then scroll well down the Menu list:** the "Menu · *name*" bar should stay pinned at the top with rows sliding under it.

---

# The two that wait

## 4. The FIRST time you import a price list · **costs money if wrong**

Only relevant when you use **Settings → Import product catalogue**, which you have not yet.

**Stop at the mapping step and answer one question: is `LAST PRICE PAID` the price of ONE PACK, or of the WHOLE CARTON?**
The screen asks, and defaults to one pack.

**Check it against a price you already know before pressing Import.** If chips you know cost about $6.50/kg are showing about $1.08/kg, the answer is "the whole carton" and you switch the radio.
**Getting this wrong makes every cost in the app wrong by the carton size, and every figure will look completely plausible.** That is why it is asked rather than guessed.

**Same screen, same reason: "The price is" ex-GST or inclusive.** Switch the radio and watch the table - every unit cost must move by about 9%. Leave it on whichever is true of your file.

**Then import the same file a second time.** It must say *"0 new products"* and the product count must **not** double.

---

## 5. The FIRST time you invite someone · a real inbox

⚠️ **Do the Supabase dashboard setting first or this cannot pass.** Authentication → URL Configuration: **Site URL** `https://scoopyscosting.vercel.app`, and add `https://scoopyscosting.vercel.app/**` to **Redirect URLs**.

⚠️ **EzPlate does not email them.** You invite the address in Account → Team; **you** then tell them to open EzPlate, tap "Been invited?", and sign up with **that exact address**. Supabase sends them one confirmation email after they sign up, and they must click it before their first sign-in works.

**Pass:** the link opens `scoopyscosting.vercel.app` and lands on the "name your café" screen; they then land straight into your café with nothing to accept.
**Fail:** the link opens `localhost:3000`, or they see *"This account isn't linked to a café yet"* - which usually means a typo in the address you invited, not a bug.
⚠️ **RE-CHECK: it should now SAY that it worked.** You reported *"it just opens a site for like a sec and then it closes, its not abvious that the verifcation even worked."* From `ezplate-v213` a confirmed link raises **"Email confirmed. You're signed in."** The reason it said nothing before is that the failure message paints on the sign-in gate — which is exactly the screen a successful confirmation skips past. **Fail: it still says nothing**, or it says it on an ordinary launch when you have not clicked a link.

---

# What came off this file, and why

Nothing here was thrown away silently.

- **The v3 redesign blocks (v99 through v151, 179, 178, 175/176) are DELETED.** They asked how a redesigned screen *feels* - whether the More tab annoys you, whether you miss the floating "+", whether the new row wording is the more useful of the two. **Those screens have been in daily use since August. You not raising them IS the answer**, and a list that keeps asking is a list that has stopped meaning anything.
- **Every layout, truncation, wrap, hit-target and contrast check is DELETED from here and filed for the browser agent** in `docs/MAINTENANCE.md`. All of it is measurable at 380px in both themes and none of it needed you.
- **The VoiceOver check (batch 225) is filed, not deleted.** It is real and genuinely only a device settles it - but you do not use VoiceOver, so pretending it was on your list was the same lie as the rest. It goes on the accessibility item.
- **The "Carried v82–v98" inventory is DELETED.** It indexed item codes (B1–B9, C1–C8, D1–D2) against screens that have each been rebuilt twice since.
- **The old "Settled - no phone needed" heading is DELETED.** It sat above live work six times running because `/batch` appended past it, and it told a reader to stop seven sections early - including past two of the costs-money checks.

## One thing that is NOT a phone check and has been waiting five weeks

**Six remembered packs are keyed to a supplier called `Document No:`** - a parser bug fixed long ago left them behind, and they have sat there since 3 August 2026. Measured on production 10 Sep 2026, still six.
They match nothing and cost nothing; they are just wrong.
**Settings → Remembered packs → remove each row showing `Document No:`.** Two minutes, on the desktop, whenever. The seventh row (`The Fruit Wagon` / avocado tray) is genuine - leave it.
*(It sat on the phone list from v107 onward, which is the clearest single example of why that list stopped working: it was never a phone check at all.)*
