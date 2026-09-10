# HANDOVER - 258 (contrast tokens)

**Branch:** `fix/contrast-tokens` · **Scope:** queue item 8 / consolidated 66, answered by Max in chat on 10 Sep 2026. Shipped `ezplate-v212`.

## What changed

Three tokens, each decided once and applied everywhere, which is what the item asked for.

`--text-3` moves to light `#766A5B` / dark `#96938F`.
The old values cleared 4.5 on white and on `--surface-2` and had never been measured against a TINT, so the same token fell to 4.17 / 4.32 on a flagged invoice row.
That is the copy explaining why a row needs attention, which is the worst place in the app to be unreadable.
Now 4.563 light and 4.664 dark on that row, solved against every surface the token is painted on.

New `--sw-edge` puts a hairline on the switch track and knob, so an OFF switch is visible and you can tell which way it is set.
1.36 to 3.052 light, 1.52 to 3.100 dark.
The soft fill is kept: he chose "outline track and knob" over "darken the whole track".

New `--danger-ctl-br` raises the destructive button border to 3.027 light / 3.049 dark.
This is the option that costs the red, and the trade was written into the option he selected.
The button's own red label is untouched at 5.43.

`tests/visual/200-pack-unit.spec.js` raises its floor from 3.0 to 4.5 in the same change, as the item required.

## Review

`code-review` agent, Sonnet against Opus. `docs/reviews/REVIEW-258-contrast-tokens.md`, `Reviewed-commit: 66ec737`.
Three findings, all real, all fixed.

**The dark switch was not fine and this batch's own comment said it was.**
It claimed "dark was fixed in v136 and measures 7.87".
7.87 is the KNOB on the TRACK, which answers "can you tell which way it is set"; the boundary 1.4.11 asks about first is the TRACK on the CARD, and in dark that is 1.52, the same failure as light's 1.36.
Fixed with the same remedy, labelled at the site as an EXTENSION of his answer rather than his answer, because he was told dark was fine in the question he answered.

**A third destructive control**, `#kingModalRemove`, bordered itself with the tint at 1.16 light / 1.08 dark, under a v115 comment calling itself "a visible edge at rest".
Found in a comment that had just finished quoting the rule against fixing only the controls you measured.

**The Playwright comment still cited the rejected hex** `#776B5C` and "clears by 0.004", one file from the CSS comment warning about exactly that, written in the same change.
It is `#766A5B` and clears by about 0.06.

The agent also noted, without calling it a finding, that the gap between `--text-2` and `--text-3` narrowed.
That is the known cost recorded in the DEVIATIONS block since v132 and the shipped value is checked against it: 5.27 on white against `--text-2`'s 6.35, still clearly two levels.
Recorded in the artifact so the next reader knows it was weighed.

## Into CLAUDE.md

Nothing.
Every lesson here already has a rule: "a comment can record the defect CORRECTLY and file it under the wrong consequence" covers the 7.87, and "an exemption is scoped to the CLAIM that justified it" covers the third button.
`CLAUDE.md` says to stop writing about a rule that already exists, so the instances are recorded at their sites and in the review artifact instead.

## New docs/QUEUE.md items

None.
Item 8 is deleted from `docs/QUEUE.md` and consolidated 66 is struck, along with its routing entries in `docs/QUEUE-GROUPS.md`.
The Invoices helper that rode item 66 needed no change of its own: `.invz-s` is `--muted2`, which aliases to `--text-3`, so it moved from 4.506 to 4.931 on its resting surface.

## New docs/PHONE.md items

None, and that is the new entry test working rather than an omission.
Every figure here is measurable in Chromium and was measured there, so none of it passes the "is a phone the only thing that CAN check it" bar that batch 257 put at the top of that file.
The one thing a phone could add is whether the dark switch edge looks right on a real OLED, and that is a taste question about a shipped screen, which 257 also ruled out of that file.

## Probe

**What did the item tell you to do that you would have done differently?**

It said to fix this "in the token, not per control", and I would say that instruction is right and was still not enough.
It is what made me change a token rather than one button, and it is also what let me stop at the two buttons I had in front of me while a third read the same wrong value.
The instruction that would have worked is the one now written at the site: grep the token, not the screens you happen to be thinking about.

The item also said `--danger-br` was the failing token, and it is not the one to change.
Three tinted message boxes and the offline banner read it, none is a control, and 1.4.11 does not reach them.
Changing it as written would have put a grey-brown hairline round a pale pink message box, which is worse than the thing being fixed.

**What did you not propose because it was out of scope?**

The `--text-3` hover shortfall, still 4.416 after this change.
The DEVIATIONS block has recorded that as a deliberate limit since v132 and says outright not to finish the job, because a value dark enough to clear the transient hover collapses the hierarchy with `--text-2`.
I did not reopen it and I do not think it should be reopened without a reason that is not "the number is under 4.5".

## Surprises

**The two mistakes that mattered were both mine, and both were caught by measurement rather than by reading.**

I guessed the dark destructive border at `#7A6560`. It measured 2.82, under the floor this whole change exists to clear.

I set the light grey to `#776B5C` and recorded it as 4.50.
Its real value is 4.4961, and my probe printed `toFixed(2)`, which rounded it UP to the exact bound it was supposed to be clearing.
The token never cleared the floor; the display did.
`200-pack-unit.spec.js` caught it on the first run after its floor was raised, by measuring the real element rather than the palette, which is what that spec's own comment says it exists to do.
It was right about a value written by someone who had just finished reading that comment.

**And the third one is not about this batch at all: the question Max answered contained a wrong fact.**
The dark switch figure came from batch 229's decision file, was carried into this batch's comment, and was quoted confidently in both.
Nobody asked which two colours it measured.
A number carried forward from another document is a claim, and "which pair is this" is the question that was never put to it.
