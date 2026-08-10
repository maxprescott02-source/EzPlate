# HANDOVER - 169 (F10, a minimal Account screen)

**Branch:** `feature/f10-account` · **Scope:** queue item F10, Account desktop §3.9 + mobile §6. **Ships `ezplate-v149`.**

## What changed

Account is a screen, `#tab-account`, carrying the mock's three §3.9 sections in the mock's order: Profile, Team, Plan.
Each is a heading and one honest sentence, and the screen contains no control of any kind.
The Account and Team placeholder cards F9 parked on Settings moved onto it, and one Settings row replaced them, which is the only route to the screen at any width.

**One real bug fixed, and it was already shipping before this batch.**
`#builderPage` is a sibling of the `#tab-*` panes in normal flow rather than a positioned overlay, so any pane `openBuilder()` forgets to hide renders underneath the builder: two screens at once, no error, nothing in the console.
Four separate lists named the panes and `openBuilder`'s had never grown past the original five, so Invoices has been able to do this since F8 and Settings since F9.
It is one `TAB_PANES` constant now, read by all four.

## Into CLAUDE.md

Nothing proposed, and one thing worth flagging that I decided is not yet a rule.

Two batches running, the pre-push review has disproved a COMMENT I wrote while finding the code correct.
Both times the comment explained why a defensive line was necessary and got the mechanism wrong.
That is a real pattern but it is two instances of "I explained something I had not traced", which the file already covers under pushback and under the stub family.
If it happens a third time it is a rule.

## New docs/QUEUE.md items

F10 is deleted per the reset.

**The plate builder — restore the FILL ORDER the redesign lost**, added at Max's request and written from measurement rather than from the report.
The decided fill order is add ingredients, then name, then categorise, then save, and F7's own comment cites it; the page presents the reverse, with the name field and Save as the first two controls a user meets and the ingredient search at the bottom of the table.
The pre-F7 markup had two headed steps and put the search above the lines, and F7 kept every id while dropping both.
The item states explicitly that the page stays a page, because `CLAUDE.md` records that line being wrong in both directions at a cost of a batch each time.

Two UI defects reported in chat and covered nowhere were folded into the items that own them rather than getting a duplicate heading: the main region's missing top padding, and the search clear button being drawn while the field is empty, which is three buttons sharing one always-on pattern.

`docs/MAINTENANCE.md`'s Invoices priming item is now half fixed and says so: `currentTab`'s hole closed with `TAB_PANES`, and `rerenderCurrentTab`'s fallthrough to `renderPlatesTab()` survives.

## New docs/PHONE.md items

None.
The Account screen is three sentences with no control, and the route to it is a standard row already covered by the F9 entry's "find anything that moved between sections" check.

## Probe

**What did the queue item tell you to do that you would have done differently?**

**I recommended not building this screen at all, Max said build it, and I built it.**
The recommendation was that every row is a sentence saying the feature is coming and Settings already said that in the place a person looks.
He asked for the shell so the sections exist to be filled during multi-tenant, which is a reason the item did not consider, and it is a better one than mine: the mock's section order is banked in markup now rather than in a mock nobody opens.
What I did NOT concede is the controls.
"Ship the shell" would have licensed Edit profile, Invite a teammate, Manage billing and Sign out as disabled buttons, and none of them ships, because §R4 is about capability and not about polish.
A test asserts the screen has no interactive element at all, which is the line I would defend if it is ever questioned.

**What did you not propose because it was out of scope?**

The mock's §2 sidebar has an account row, avatar plus name, and the app has no sidebar entry for Account at all.
Adding one is shell work and the mock's version needs a name that does not exist, so the screen is reached only from Settings.
The consequence is visible and I am recording it rather than fixing it: on desktop, while Account is open, NOTHING in the sidebar is lit.
That is honest, because Account is not in the sidebar, but a desktop sidebar with no active item is unusual and the More-screen item should decide it.

## Surprises

**The bug the review found was not mine, and that is the point of it.**
`openBuilder`'s hide list has been short since F8 shipped Invoices, so a user who opened Invoices and then resumed a plate draft has been able to see both screens stacked for two versions.
Nothing caught it because every test that touches pane visibility went through `showTab`, which had the correct list.
The fix is one constant, and the regression test pins the markup and the list agreeing in BOTH directions, because a test that only checked `openBuilder` contained `account` would pass the day a ninth pane is added and forgotten, which is exactly how this got here.

**Three existing pins asserted a literal that is now an indirection.**
`inv-upload.test.js` matched the pane list inside `showTab`, and two in `settings-toggles.test.js` did the same.
They were correct when written and became wrong the moment the list moved, which is the ordinary cost of extracting a constant.
Updated to assert the shared constant rather than deleted.

**The builder investigation found more than Max reported.**
He named confusing ordering and a flow that does not match how the form is filled, both of which are exactly right.
Measuring it also turned up two different "no ingredients" messages rendering at once, an empty state whose copy says "below" only because the search is in the wrong place, and `Category` living under a card headed `Publishing` whose own first line says it is inert until save.
All are consequences of the same move and all are in the item.
