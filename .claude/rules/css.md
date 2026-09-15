---
paths:
  - "css/style.css"
  - "js/app.js"
---

# CSS - three ways a rule looks right in the file and does nothing on screen

Loaded whenever `css/style.css` **or `js/app.js`** is read. None of these is ever caught by reading; all were caught by measuring.

⚠️ **`js/app.js` is on that list for one of the four sections, and the pre-push review of the split is what put it there.** *"`position:fixed` IS NOT VIEWPORT-RELATIVE"* names its own tell as **`position:fixed` set from JS together with numbers out of `getBoundingClientRect()`** - which is `anchorDrop`, in `js/app.js` - and the whole point of the rule is that a property added to an UNRELATED element silently changes the coordinate space that arithmetic runs in. Scoping it to the stylesheet would have shown it only to the half of the pair that is never the one doing the arithmetic.

**Moved out of `CLAUDE.md` verbatim by batch 264** so it loads with the file it protects instead of on every turn of every session. The rule in `CLAUDE.md` is the one-line version; this is the evidence.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, another file in `.claude/rules/`, or `docs/rules/process.md`. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## A `@media` block does not win by being later

**Specificity is compared BEFORE source order**, so a multi-class selector written outside a media query beats a single-class rule written inside one.
Putting the narrow selector on the small screen and the plain one on the large screen inverts the cascade, and **the symptom is a rule that looks right in the file and does nothing on screen** - which is why this is never caught by reading, only by measuring.

**When a declaration appears at both breakpoints, give the two rules the SAME specificity.**

**Five instances in ONE screen in ONE batch** (F3/v139) - a cell thrown into the wrong column on broken rows; desktop `—` placeholders losing to a mobile `.is-nil` rule and rendering blank; a dead grid row under every healthy mobile name; a column headed "Used in" reading ", in —" on every row because the desktop cancel of a mobile `::before` could never win; and a header right-alignment keyed off one class of button.
Three were found by looking at the app and two by the review - **and the fourth was written INTO the fix for the third**, which is what makes this a rule and not a lesson.
F2/v138 hit the same class twice more, as `[hidden]` overrides: a single-class rule beats the UA's `[hidden]`, so an element told to hide stays visible.

**The `[hidden]` corollary is a DIFFERENT mechanism with the same symptom, and the specificity advice above does not fix it.**
An author rule beats the UA's `[hidden]{display:none}` because **author origin wins over UA origin, and origin is decided BEFORE specificity is even compared** - so `.thing{display:block}` overrides it no matter how the selectors measure. Matching specificity therefore achieves nothing here.
**The remedy is a selector guard, `.thing:not([hidden])`**, which stops the rule matching a hidden element at all. **It is an app-wide idiom, not a curiosity.** Every one was added after a renderer's hide was silently ignored and an element sat visible.
⚠️ **This paragraph used to ENUMERATE them and state a count, and the number has now been wrong three times running** - "twice" until 12 Aug 2026, then "ten" (AUDIT-v156's correction), then wrong again inside ten deploy versions because three more were added by batches that had no reason to open this file. ~~`css/style.css` itself still says "twelve" in two of its own comments.~~ ✅ **FIXED — `css/style.css` now carries ONE mention of "twelve" and it is the comment recording that the number was deleted** (grep `NO COUNT HERE ON PURPOSE` — **no line number here on purpose either; the one this sentence used to carry had already moved 82 lines by v197**). Corrected 28 Aug 2026 by AUDIT-v176, which found this line still citing as outstanding a thing that had been fixed. **Four places carried four different numbers, and every hand-correction bought about a week.** The enumeration is deleted rather than re-counted: it was never what made the rule work.
⚠️ **AND IF YOU GO AND COUNT THEM, READ THE HITS - DO NOT TRUST THE COUNT.** `grep -n ':not(\[hidden\])' css/style.css` returned **24** at v166 against **13** actual rules; narrowing it to lines with a brace still returns 14, because one comment contains the literal `[hidden]{display:none}` while explaining the mechanism. **This is roster entry 183(a) in miniature - a grep over a source file searches PROSE as well as CODE, and here the prose is this very idiom being described.** The first draft of this paragraph told you to grep for the live set and was caught by the pre-push review saying so; it is left written out because the trap bit inside the sentence warning about it.
**So: any `display` rule on an element the JS hides with `hidden` needs the guard** - by default, not on recall. That sentence is the whole rule and it never needed a number.

## `position:fixed` IS NOT VIEWPORT-RELATIVE, and this app's standard escape hatch assumes it is

(Batch 212, 28 Aug 2026, queue item 6. Measured, not reasoned.)

**A fixed element's containing block is the nearest ancestor carrying `transform`, `perspective`, `filter`, `backdrop-filter`, a layout/paint `contain`, or a `will-change` naming one of those — and only the VIEWPORT when there is no such ancestor.**

That matters here because "anchor it `position:fixed` to the input's viewport rect so it ESCAPES the scroll container" is the **app-wide idiom for floating layers**, written into `anchorDrop` since v59, and it writes coordinates straight from `getBoundingClientRect()`. The idiom is correct exactly while no ancestor establishes a containing block — a precondition nothing states and nothing checks.

`anchorDrop`'s own comment justified it: *"the modal's only transform is the open animation, long finished by interaction time, so fixed is viewport-relative."* **True of modals, which is all it had ever been asked to place.** Batch 177 then gave `.bld-docket` a `filter:drop-shadow` for an unrelated and correct reason — the tear-off edge is a zigzag, so a `box-shadow` would cast a straight rectangle under the teeth — and the builder's ingredient search sits inside it. Measured at 380px: a `position:fixed;left:0;top:0` probe inside `.bld-add .search-wrap` lands at **(12, 198)**, so handing that dropdown to the engine unchanged renders it **198px below its own field**.

⚠️ **THE REAL SHAPE IS NOT ABOUT CSS. A batch added a property for its own reason and silently changed the COORDINATE SPACE a mechanism in another file depends on.** Nothing connects the two: `.bld-docket`'s shadow and `anchorDrop`'s arithmetic are in different files, written months apart, and both are individually right. This is the same family as "an exemption is scoped to the CLAIM that justified it" — a claim about modals quietly became a claim about everything the function places.
**And the near-miss is the instructive part:** `tests/visual/v150-builder-order.spec.js` already had a comment saying the docket's filter *"creates a containing block but does NOT clip"*. The fact was recorded, correctly, and filed under the wrong consequence — the reader was thinking about clipping, so a note about containing blocks read as reassurance.

**The remedy is `fixedContainingBlock`, which ASKS instead of assuming**, and every coordinate `anchorDrop` writes is offset by it. **The tell to recognise: `position:fixed` set from JS together with numbers out of `getBoundingClientRect()`.** Before trusting that pair, ask what is between the element and the root — and if the answer is "nothing today", note that adding a shadow, a transform or a `contain` anywhere above it is enough to break it silently.

## Offsets on a `position:static` box are INERT, and everything around them can still read as deliberate

(Batch 212, same item. A third mechanism with the same symptom as the two sections below: a rule that looks right in the file and does nothing on screen.)

`.suggest-drop` — the builder's plate-name suggestion list — declared **no `position` at all**, so it was `static`. `.bld-namewrap .suggest-drop{left:0;right:0;top:calc(100% + 4px)}` wrote offsets that a static box ignores, and `.bld-namewrap{position:relative}` had been added as a containing block **for a child that never became absolute**. Three separate things all shaped like a floating layer, and not one of them made it float: it sat in the flow, and opening it pushed the ingredient search bar **389px down the page** — off the screen entirely on a phone with the keyboard up. That is what Max reported as *"dropdowns cover the search bar"*, and it is **displacement, not overlap**, which is why looking for an overlapping rect found nothing and the queue item's own guessed mechanism was wrong.

**The transferable rule: `position:relative` on a parent and offsets on a child are EVIDENCE OF INTENT, never evidence of effect.** They are valid CSS on a static box and cost nothing to write, so a layer can carry the full costume of being positioned without being positioned. **When a layer misbehaves, read its computed `position` FIRST** — before its offsets, its `z-index` or its specificity, all of which are downstream of a value that may not be what the file implies.

## A SLOT THAT DOES NOT EXIST AT EVERY WIDTH IS NOT A HOME - `.scr-sub` is `display:none` below 768

(Batch 268, 15 Sep 2026, queue item 58. Found by rendering the screen at 380; the whole suite was green with the defect in.)

**`.scr-sub` - the screen-header subtitle worn by seven screens - is `display:none` in its base rule and `display:block` only inside `@media (min-width:768px)`.** The §2 mobile header is deliberately compact, so **the subtitle slot does not exist on a phone at all.**

That is correct and is not the trap. The trap is what it does to any instruction of the form *"move this line into the header sub"*, which is how a tidy-up is naturally phrased and is what item 58 asked for in two places. **Moving content there DELETES it below 768**, silently:

- the Invoices last-import date was a `<p class="invz-last">` in the body, visible at 380. Moved into the sub, the phone loses the only import fact the app stores.
- the Ingredients setup count (`#kingProgress`) had its own `@media (max-width:560px)` gutter rule - direct evidence it was meant to be read on a phone. Moved into the sub, it is gone on the device the wizard is most used from.

**Nothing catches this.** Both moves render perfectly at 1360, no test asserted the mobile half, and the markup reads as a straight relocation. The item that asked for it was written from a desktop screenshot and could not see the breakpoint.

**The remedy when a fact genuinely belongs in the header on desktop: ONE source, TWO sinks, ONE breakpoint.** Compute the string once (`kingUnlinkedClause`), render it into both the sub and the body element, and write the body element's hide **into the same `@media` block that shows the sub** - so the pair that must stay opposite is one edit apart rather than three thousand lines apart. `#kingWizBtn`'s `data-mobile-home` is the same shape and was already on that screen.

⚠️ **AND THE VISIBILITY MUST BE A CLASS, NOT `el.style.display`.** The first fix toggled `pr.style.display='block'`, and **an inline style beats a stylesheet rule outright - regardless of specificity, regardless of source order, regardless of the media query** - so the desktop hide could never fire and the count rendered in BOTH places at 1360. **This is the third costume of "a declaration is not an enforcement"**, after `[hidden]` losing to an author rule and `min="0"` on an input nothing validates: here the two CSS rules were both correct and something else decided. **If a rule has to be able to LOSE at some width, the JS must not write that property inline.**

**The transferable question, and it is not about this one class: before moving anything into a shared slot, ask at which widths the slot is RENDERED.** A slot is a promise about layout, not a container. `tests/king-head-sub.test.js` pins the source/sink/breakpoint triple and the absence of an inline `display`.

## A CSS syntax error is SILENT, and it discards every rule after it

(Max's yes, 12 Aug 2026, after it cost batch 176 a full diagnose cycle.)

An edit inserted comment text **without its opening `/*`**.
The browser did exactly what the spec requires - discarded the malformed rule **and every rule after it** until it could resynchronise - so `.wrap{max-width:1200px}` and its followers were simply absent.

**There is no build step and nothing in this project parses `css/style.css`**, so this class of mistake has no way to surface on its own.
`npm test` was green, `node -c` was clean, the page rendered, and **the only symptom was one measurement coming back wrong.**
It was found by dumping which `.wrap` rules the CSSOM actually contained and seeing that the new one was not there at all.

**So a layout that measures wrong is not always a specificity problem - check the rule EXISTS before reasoning about why it loses.** That is the diagnostic order, and getting it backwards is what cost the cycle.
`tests/css-syntax.test.js` is the guard: it checks the comments and braces balance, which are the two failures that can silently swallow rules. It is deliberately structural rather than a real parser, because no dependency may be added here.
