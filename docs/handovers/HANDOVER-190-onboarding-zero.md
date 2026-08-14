# HANDOVER - 190 (onboarding, the first screens a new cafe sees)

**Branch:** `feature/onboarding-empty-states` · **Scope:** queue item 1, "Onboarding and empty states", delivered in part. Shipped `ezplate-v164`.

## What changed

**The zero state was MEASURED before anything was planned, and the item's headline claim was mostly already built.**
Booted through the Playwright shim at genuine zero (no products, no kitchen ingredients, no plates, no menus, no dishes, no `app_settings`), nine panes, 380 and 1280, light and dark.
The v58 empty-state system already gives Products, Ingredients, Plates, Menu, Dashboard and Invoices a real true-empty state with a CTA; Settings and Account render fine; at zero plates the Add-dish picker says "No costed plates found. Build and save a plate first."
So "every screen at zero" was not the work. Two real defects were, and the item named both.

**The one sentence offering a new cafe its first ingredient was an unstyled link.**
The app owns exactly three `<a>` elements; the other two carry a class that sets a colour, and `css/style.css` had no anchor rule at all, so `#bhGo` painted the UA blue in both themes.
Fixed with a base rule in section 2 BASE rather than an id rule, because the sheet had never spoken about anchors and an id rule would leave the next one blue.
Specificity 0-0-1, so `.linklike` and `.del-link` keep winning; both set `color` and a test asserts they still do.

**"Add to a menu" dead-ended for a brand-new cafe.**
There were THREE answers to "no menus yet": `withPublishMenu` creates the default menu at the point of need (184), `openPublishModal` diverts to the new-menu modal, and `renderManageMenus` rendered a sentence and returned with nothing to press.
A new cafe meets the third one first, and it told them to go to another screen while the Menu tab's own Existing-plate button silently made the menu for them.
`renderManageMenusZero` now offers a real control routed through `ensurePublishMenu`, so there is one answer and not a fourth.
Failure is reported in that box rather than by a toast, because `pushWrite` has already toasted the cause; the Menu tab is repainted as well as the modal, because `ensurePublishMenu` repaints the selector and not the tab.

**`renderManageMenus` was stubbed in three test files and pinned by none.** It has a test file and a mutation target now.

## Into CLAUDE.md

**Incident 20 on the tests-that-cannot-fail roster, added.**
A Playwright assertion checked the link was NOT the UA blue. Deleting the rule turned three of its four cases red and left the DARK one green, because Chromium picks a lighter default link colour under a dark `color-scheme` and the constant named only the light one.
A denylist assertion is weaker than an equality one and the gap is invisible until the environment varies.
The tell is `not.toBe` / `notStrictEqual` / `doesNotMatch` carrying a test's whole meaning.

**The header count was corrected from eighteen to twenty, and the reason is recorded:** 188 added its entry to the list and left the header reading eighteen, so the roster undercounted itself for two batches.

## New docs/QUEUE.md items

- **Bulk catalogue bootstrap** [A], split out as its own item. It was inside the onboarding item by implication only, it is a feature rather than an empty state, and every empty state verified this batch points at it: by-hand entry for 400 products is not an answer.
- **Onboarding, the empty-state decisions 190 did not take** [B], at the bottom with the other B. Two cosmetic judgement calls: the Menu screen offering "Existing plate" at zero plates, and the six empty states never having been read end to end as one sequence.

The finished item is deleted, and the remaining items were renumbered.

## New docs/MAINTENANCE.md items

- **`tests/visual/screenshots.spec.js` has been unable to pass since 186.** 13 specs fail, identically on unmodified `main` (verified by stashing). It is the one spec that talks to the live production database, and 186 made sign-in mandatory. CI filters it out, so nothing goes red and only `npm run shots` sees it. Deleting it is a real answer.

## New docs/PHONE.md items

None. Both fixes were driven and screenshotted at 380 and 1280 in both themes, so there is nothing left that only a device can settle.

## Probe

**What did the queue item tell you to do that you would have done differently?**
It framed itself as "every screen at zero, which production has never shown", which reads as a sweep across nine screens.
Measuring first turned it into two named defects plus a feature that had been hiding inside it, and the sweep was already done.
I would also not have folded the catalogue bootstrap into an empty-states item at all: it is the largest single thing standing between a second cafe and a usable app, and being a bullet inside another item is why nobody had built it.

**What did you not propose because it was out of scope?**
The Menu screen's orphaned "Existing plate" button at 380, and a read-through of all six empty states as one sequence. Both are in the queue as B rather than silently skipped.
I also left `openPublishModal`'s own zero-menus guard alone: it is now unreachable from the app, but CLAUDE.md's precedent at `withPublishMenu`/`ensurePublishMenu` is that the duplicate keeps the function total for a caller reaching it directly.

## Surprises

**Staging did not need wiping, and the sandbox refused to let me wipe it.**
Both the `02-seed-empty` run and the throwaway-password update were blocked by the permission classifier.
That turned out to be the better outcome: `Second Cafe (staging)` already holds zero rows on every table with `b@example.com` as its owner, so a real RLS-enforced zero state existed without deleting anything, and the boot shim is a better instrument than either.
`docs/STAGING.md` sends a reader to the seed for this; it is worth knowing the second cafe is already there.

**The first draft of the "other home" Playwright test was a test of nothing.**
`loadPlateState` keeps a legacy `{pid}` line only `else if(byId[l.pid])`, so booting with `noProducts` dropped the line, the plate loaded empty, and the OTHER home rendered instead.
The hint's two homes are chosen by `noCatalogue && plate.length`, and `noCatalogue` asks about kitchen ingredients, not products, which is the naming inversion being exactly as easy to get backwards as CLAUDE.md says.
The test now boots with products and asserts its own precondition.

**The mutation gate found a branch I had written and not covered.** Clearing the previous error on retry survived every assertion, because all of them pressed the button at most once.
