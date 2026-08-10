# HANDOVER - 168 (F9, Settings becomes a screen)

**Branch:** `feature/f9-settings-screen` · **Scope:** queue item F9, Settings desktop §3.8 + mobile §6. **Ships `ezplate-v148`.**

## What changed

Settings is a screen, `#tab-settings`, with all eight sections visible at once instead of a modal you tapped into one section at a time.
The v81 `#settingsPanel` modal is deleted entire: its sidebar nav, its seven `.set-navitem` sections, the mobile list-to-detail drill, the Done footer, and every `.set-*` rule in the CSS.
Both routes in survive and both now navigate: the header gear below 1024, the sidebar entry at 1024 and above.
The controls regroup into Costing, AI features, Appearance, Lists, Data, Account, Team, About.
Tidy lists and Remembered packs open over the screen and close back onto it, so `reopenSettingsSection` and `backToSettingsSection` are gone rather than repointed.
The two AI switches shrink to the mock's 38x22 desktop and 44x26 mobile, and their labels keep a 44px tap height so the target does not shrink with the track.

The one real defect this batch fixed rather than created: a refresh landing on Settings would have rendered pre-boot values and never corrected them.
`restoreLastTab()` runs before `bootstrapSync()` resolves, so `rerenderCurrentTab` had to learn the screen as well as `showTab`.

## Into CLAUDE.md

Nothing proposed.
Everything found is an instance of a rule already there, or belongs to one screen.
The line about the builder being a full page already covers the shape this conversion took, and the priming problem is the "openSettings PRIMES the form on every open" warning the queue item itself carried, which was correct.

## New docs/QUEUE.md items

None, and F9 is deleted per the reset.
Two findings went to `docs/MAINTENANCE.md` by the tier test: the Invoices screen has the same boot-race priming gap this batch fixed for Settings and it becomes reachable when the More screen gives Invoices a phone route, and the mock's Business and Notifications sections are R4 with no spec written, of which currency is the one with teeth because every money display hard-codes a dollar sign.

Three corrections to existing items, none of them new work.
The More-screen item said the sidebar's bottom group had "no mobile counterpart at all", which flattened two entries that are not in the same position: Settings has the gear, Invoices has nothing.
The restore item was scheduled against "(items 1-5)", a position that had already drifted onto four unrelated items; it now names F10 and the More screen.
Two UI defects reported in chat and covered nowhere were folded into the items that own them: the main region's missing top padding, and the search clear button being drawn while the field is empty, which is three buttons sharing one always-on pattern rather than one.

## New docs/PHONE.md items

**There is no Done button any more, and that is the whole check.**
Change the target percent on the phone and see whether it feels saved without a button to press.
It was always written the moment you typed it and the old Done button never saved anything, but "always was" is not the same as "reads that way".
A failure looks like hesitating, or going back in to check it stuck.
Noted alongside it: the reassuring "Changes save as you make them" line is in the shared screen header, which hides its subtitle below 768, so the phone is exactly what does not get it, and that is a one-line fix if the first point bothers him.
Also listed: the smaller AI switches, both themes, and finding anything that moved between sections.

## Probe

**What did the queue item tell you to do that you would have done differently?**

**The item's own §5 contract said the GST control is a two-option select and the mock's Costing card wants a switch, and left the placement open. I moved it and would defend that, but it is a real change the item did not ask for.**
GST default lived under Invoices; it is now under Costing, where the mock puts it, keeping the select because R2 says the select's meaning cannot be expressed as a boolean.
The same reasoning moved the AI invoice check out of Invoices to sit beside AI suggestions, which left Invoices holding only Remembered packs, which then went under Lists.
So the section names in the shipped screen are not the section names the item enumerated.
Nothing was dropped and every id is unchanged, but if he goes looking for a control under its old heading he will not find it, which is why that is the first thing on the phone list.

**The item said "38x22 orange-on" of the GST switch. There is no GST switch.** The mock has one and this app has a select, which the item's own contract says two paragraphs later.
The 38x22 applies to the two AI switches, which is where I put it.

**What did you not propose because it was out of scope?**

The screen has no loading, empty or error state, and §4 asks for five.
I stated that at the site rather than inventing them: this screen performs no fetch, it renders settings already in memory, and the boot gate owns the only load this data has.
Building a skeleton for a form that cannot be waiting on anything would be decorative.

The `.scr-head` hairline spans the content column rather than the main area, so the new screen inherits the not-full-bleed header every other converted screen has.
That is the desktop shell polish item and it is shell work by construction, so it stayed out.

## Surprises

**`PRODUCTS` is declared `let` at top level, so it is not on `window`.**
Found when repointing the modal-layer spec at the product editor: `window.PRODUCTS` is undefined and `eval('PRODUCTS[0].id')` inside the same page context works.
The existing spec already used eval for that reason and did not say so; it says so now.

**The pre-push review disproved a comment I had written, and it was right.**
I claimed `currentTab()` needed a `'settings'` fallback entry because no `.navbtn` carries `data-tab="settings"` below 1024.
`#sideSettings` carries both `.navbtn` and the data-tab at every width; CSS only hides it, and `querySelectorAll` still matches a hidden element.
So the branch above already answers correctly and that whole fallback loop is unreachable today, for every tab and not just this one.
The entry is kept as a deliberate defensive listing, labelled as one, because the More-screen item rearranges exactly which nav button is lit.
The test asserting it now says it is pinning a list rather than a behaviour.

**One reported UI defect did not reproduce and one had its cause wrong**, which is the third batch running where that has been true of a chat-sourced report.
The 73 percent usable width measured 91, and the "Supplier column duplicates the supplier beside the name" defect is looking at the brand.
Both were already corrected in the queue by earlier batches; recorded here because the pattern is now consistent enough to expect.

**Chrome will not resize below about 500px wide**, so the real-browser 380px check ran through Chromium under Playwright instead, with screenshots read rather than assertions trusted.
The desktop half ran in Chrome against live production data.
