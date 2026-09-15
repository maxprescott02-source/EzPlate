# HANDOVER - 274 (builder-tablet)

**Branch:** `274-builder-tablet` · **Scope:** `docs/QUEUE.md` item 49, the builder between 768 and 1200. Shipped deploy version **ezplate-v223**.

## What changed

Six changes on one screen, each measured before and after at 768, 900, 1024, 1075, 1076, 1100, 1200 and 1360.

**The wrapped rail fills its row.** `.bld-rail`'s 340px cap left **290 / 360 / 428px of nothing** beside it at 768 / 900 / 1024 - at 1024 more empty space than rail. It is now the flex gap, 20px.
**`.bld-main`'s flex basis goes 480 to 500**, which is not a tuning: 480 let the two columns split at a docket narrower than its own five-track row can draw, so the price chip collided with the unit noun. The basis is a container-relative floor, so the honest fix for "too narrow when two-column" is to raise the floor, and that moves the wrap point from 1056 to **1076**.
**Every grid track has a floor, and they are content widths rather than taste:** 140 name (it collapsed to **70px** and clipped a real name), 82 qty (a 44px input plus a 31px unit noun), 95 unit cost (**the price chip's own width** - the first cut used 70 and the chip overflowed its track), 60 cost.
**The qty inputs share one left edge.** They sat on three (363 / 378 / 386 at 1100) because `.bld-qty` packs right and the noun after the input is "g", "ml" or the word **"unit"**. `.bld-u` gets `min-width:2.5em`, measured: 1.7em was under "unit"'s natural width and clipped it.
**Save is reachable in the whole band.** `#bldSaveBar` now shows to 1075 instead of 767, with `#saveBtn` and `#saveHint` hidden to match - the stylesheet calls those three a pair and they moved as one. Before this, 768-1075 had **no commit control on screen at all** once the page was scrolled.
**And the bar clears the nav rail**, which is the review's finding below.

`tests/visual/274-builder-tablet.spec.js` is **new, not an extension** - item 49 said it extended `v190-tablet-band.spec.js`, which has no builder coverage at all. Every fix was reverted one at a time and each turns at least one assertion red.

## Review

Sonnet, overriding the definition's `opus` pin because this batch ran on Opus. Report: `docs/reviews/REVIEW-274-builder-tablet.md`. It checked out the branch and drove the app rather than reading the rules, which is what produced finding 1.

**1, CRITICAL, confirmed and fixed.** `.bld-bar` is `position:fixed;left:0` at `z-index:25`, and the nav becomes a **78px left rail at 640** (224px at 1024) at `z-index:75` - so the bar's figures render underneath it, at x=16 inside the strip.
⚠️ **Its one wrong claim is the one worth carrying: it said this batch introduced the collision.** Measured on an `origin/main` worktree at 640, 700, 760 and 767 - it is on `main` today, at every width where `main` already showed the bar. 274 **widened** it from 640-767 to 640-1023 and now fixes the whole of it, not just the part it widened. A finding's separable claims, landing in the direction that understates.
**The spec's own miss is the more useful half.** Assertion 6 ran at **1024 only** - the single width that already had a rule - so 13/13 was green while the bar sat under the rail everywhere else. It now runs at six widths, asserts the bar's left edge against the rail's *measured* right edge, and separately asserts the figures clear it.

**2, MINOR, confirmed; the comment was fixed, not the code.** "The desktop is unchanged" was measured at 1360 only. At 1200 the tracks are `140 107 110 85 40` against main's `132 110 110 90 40`. The trade is deliberate - at 1200 the docket cannot hold a 140px name *and* full chips, and item 49 is about the name - and nothing clips. The comment claimed it settled at the wrap boundary; it settles near 1250.

**3, NIT, confirmed and fixed.** Both queue files still said the wrap point was 1056, which was true of the 480 basis this batch replaced. They now say 1076/1075 with one line recording why the old number was also correct.

## Into CLAUDE.md

Nothing. All three findings are instances of rules that already exist - the separable claims of a finding, and an exemption scoped to the claim that justified it. They are recorded at their sites.

## New docs/QUEUE.md items

None. Item 49 is finished and deleted; item 96 from batch 273 is still open.

## New docs/PHONE.md items

None. The phone is untouched by this change and everything else was settled in a browser at eight widths.

## Probe

**What the item told you to do that you would have done differently:** its two offered mechanisms were "drop the 340 cap when wrapped, or move the wrap point so 1024 stays two-column". The second is not available - two-column at 1024 means a 748px container, and the docket would be under 450px, which is below what the row can draw. The first was taken, plus a third the item did not name: raising the basis so two-column never starts at a docket that cannot hold the row.

**What was not proposed because it was out of scope:** a `--sidebar-w` token. The 78 and 224 are now duplicated from `body{padding-left:...}` in a screen file, which is the drift class this repo records - but tokenising them is **shell** work and the Design law forbids mixing that with screen work. The spec asserts the relationship instead of the numbers, which is the better guard anyway.

**Was any rule missing when you needed it:** no, and one earned its keep loudly. `.claude/rules/css.md`'s `position:fixed` section is why a container query was rejected here on a measured risk rather than a preference - `container-type:inline-size` would have put a containing block over the ingredient dropdown `anchorDrop` places. And the same file's *"a CSS syntax error is SILENT"* section was proved by its own guard: rewriting a comment left a `*/` mid-block and `tests/css-syntax.test.js` went red. Nothing shipped.

## Surprises

**The site comment said the thing this batch did was impossible.** It reads *"a breakpoint cannot fix it, because the same viewport means two different container widths depending on whether the shell is drawn"*. True of one breakpoint. Measured, `.bld-body`'s inner width minus the viewport is a **constant -276 at every width from 1024 up**, and below 1024 it plateaus at 680 - so two breakpoints express it exactly. A correct observation with a conclusion drawn one case too wide, which is a shape this repo already has a name for.

**Item 49's own figures understated it in three places** - the band was 768-1075 rather than two widths, the empty space was larger than the rail rather than unmentioned, and the name track bottomed out at 70px rather than "about 130". The premise check found every *value* correct and every *line number* stale; the repro found the figures short. Both halves were worth running.

**The batch made the same mistake it was fixing.** Item 49's figures were measured on one state and generalised; so were mine, twice - "the desktop is unchanged" from 1360 alone, and the save bar's rail clearance from 1024 alone. Both were caught, neither by me.
