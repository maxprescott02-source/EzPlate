---
name: decide
description: Generate a decision file for questions only Max can answer, instead of stopping the loop. Visual decisions must render the options, not describe them. Run when items are blocked on his judgement, or when he asks what is outstanding.
---

# Decide

Max's decisions are the loop's most common blocker. Batch them into a file he
can answer whenever, on whatever device he has.

**The loop does not wait.** Generate the file, mark the items blocked, take the
next unblocked item.

## What belongs here — and what does not

**The test: does the answer depend on the café, the trade, the customers, or
Max's history — rather than on the code?**

**His:** whether a screen reads right in his hand. Whether a control is missed.
What staff should be allowed to do. Whether a trade-off is worth it. Anything
that reverses a decision he made himself.

**Yours — decide these and do not ask:** documentation and `CLAUDE.md` in every
tier, new rules, corrections and strikes, which implementation is cleaner, what
a thing is called, how a test is structured, whether to split a batch, what goes
in `docs/MAINTENANCE.md`.

He does not want to make documentation decisions and has never once deviated
from a recommendation on one. A decision file containing a documentation
question trains him to skim it, and then the visual ones get skimmed too.

If the answer is already in `CLAUDE.md` or a prior handover, it is a lookup.

## Visual decisions RENDER the options

**If a decision has a visual answer, draw every option. Do not describe them.**

- Side by side in the same file, each fully rendered.
- **380px and dark mode** are the primary view, because that is where he uses
  the app. Add 1360 and light beneath if the decision differs across them.
- Real tokens from `css/style.css`. Real copy. Real figures from production
  where the decision turns on data — a layout judged against invented content is
  judged against the wrong thing.
- Label them A, B, C with the trade-off in one line beneath, not a paragraph
  above.

Three chat-sourced UI reports in a row did not reproduce, each time because a
description of a screen is not the screen. That gap runs in both directions: a
described option cannot be judged either.

**A visual decision does NOT wait for a second one.** `skills/batch` batches
non-visual decisions at three; a rendered one goes out at one. The reason is at
that site: batching protects his attention, and looking at three pictures and
replying `1B` barely spends any.

### Generating the options - `/design`, added 23 Aug 2026

**You do not have to hand-build the variants.** Claude Code's `/design` is a
research preview on Pro and Max: `/design a few options for <the decision>`
returns several screens as artboards, and it reads this codebase so they come
back in the app's own style rather than as something foreign.

Use it for the GENERATING and never for the delivering.

⚠️ **This paragraph ruled artboards out on 23 Aug 2026 and was overturned the
same day by measurement. Interactive delivery is allowed, in chat — see the
section below for exactly how far that goes and what is still untested.**

So: generate with `/design` if it is available, **publish the rendered options as
an ARTIFACT** (see below), and **write `docs/decisions/YYYY-MM-DD.md` flat** as
the record - real figures, real copy, the options as prose he could answer from
even with no picture. An artboard is a draft; the file is the record; the
artifact is the thing he actually looks at.

**If `/design` is not available in the session, hand-build them as before.** It
is a convenience on the generating side and nothing here depends on it.

**If an option cannot be rendered, say so at that option** rather than quietly
describing it and letting it lose to the two that were drawn.

⚠️ **A ONE-OPTION APPROVAL IS NOT A CHOICE, AND MUST NOT BE DRAWN LIKE ONE.**
(27 Aug 2026, the privacy notice.) Some decisions have a single candidate —
approve this wording, or say what to change. That one was rendered as two frames
side by side, dark and light, because both themes were worth seeing.
**He replied "i approve the light one".** There was no light-versus-dark choice;
it is the same words twice.

The mistake is this file's own grammar being worn by something that is not an
option set: side by side, same size, captioned, is exactly how A and B are
presented three paragraphs up — so two renders of one thing read as two things
to pick between. He answered the question the layout asked.

**So: draw a single-option approval ONCE, at the primary size** — 380 and dark —
**and if a second theme is worth showing, say in its caption that it is the same
words in the other theme.** Better still, ask it in words the layout cannot
contradict: "approve, or tell me what to change", never "which one".
**And when an answer does not map onto the question, say so before acting on
it.** It cost one sentence here, and the alternative was publishing a privacy
notice on a misunderstanding.

Non-visual decisions keep prose: question, why it matters now, two to four
options with what each costs, your recommendation marked as such, and what would
change it.

## The file — and how he actually answers

⚠️ **NEVER WRITE A `.html` DECISION FILE. HE CANNOT OPEN ONE.** (Max, 10 Sep 2026:
*"the decision file is not a html i cnat use it"*.) This section said `.html`
"when anything in it is rendered", and it produced `docs/decisions/2026-09-02.html`
- three contrast questions, correctly measured, properly rendered, and **sitting
unanswered for eight days because it is a file on a disk he does not browse.**

**The record is ALWAYS `docs/decisions/YYYY-MM-DD.md`.** Markdown, flat, prose,
no control - it has to be judgeable on its own and it has to be readable in the
terminal, in chat, and on GitHub, which is everywhere he actually is.

**The rendered options go to an ARTIFACT**, which is the channel a phone can
open: publish the page with the `Artifact` tool and **give him the URL in chat**.
That did not exist when this skill was written, and it is the missing half - a
visual decision needs somewhere to BE, and "a file in the repo" was never it.

⚠️ **PIN THE SPECIMENS TO LITERAL COLOURS, NOT TOKENS.** An artifact renders in
the *viewer's* theme, so a swatch built from `var(--x)` shows him whichever
palette his phone is in - which for a colour decision is the wrong palette half
the time. The light specimen must stay light on a dark phone. Say so on the page,
because it looks like a bug otherwise.

Match the app's palette for the page CHROME so it does not feel foreign; read the
real values out of `css/style.css` rather than approximating them.

**Five decisions or fewer.** Beyond that it is a document, not a task, and it
will sit unanswered.

⚠️ **He answers in CHAT, never in the file.** That half has not changed and is
not in question: 10 Aug 2026, *"let me answer decision in chat"*.

⚠️ **INTERACTIVE IS BACK, AND ONLY IN CHAT. Measured 23 Aug 2026 — he asked for
it, one was rendered in front of him, and he confirmed the controls responded
and it was legible.** His words on the format: *"this is exactly what i want out
of the skill."*

**This section said no interactive control had ever worked on his device.** That
was a capability claim from 9 Aug, tested once, on the app as it then was, and
it had been silently setting this rule ever since. It is retired, and the reason
matters more than the fact: **a "cannot" written down after one test outlives
the limitation and nothing re-tests it.**

**But read what was actually measured, because it is narrower than "interactive
works".** What worked is **a rendered widget inside the chat**, which is not the
same surface as a standalone `docs/decisions/*.html` opened in a phone browser —
and the 9 Aug failure was the file. **The file has NOT been re-tested.** So:

- **Render the interactive version INTO CHAT.** Options switchable, one tap each,
  the trade-off line updating with the selection. That is the format he endorsed
  and the channel that is proven.
- **The file stays flat, stays written, and is MARKDOWN.** It is the durable
  record the `Blocked on:` lines point at, and it must still be judgeable on its
  own — no control in it, nothing that has to work for the content to read.
- **The artifact URL goes in the chat message AND in the `Blocked on:` line**, so
  a later batch pointing at the decision points at something he can open.
- **Do not make opening the file the mechanism.** Post the questions in the same
  chat message: compact, option letters bold, one-line recommendation each, one
  line on what would change it. End with *"reply with the letters, e.g.
  `1A 2B 3C`"*.
- **If you want the file interactive too, TEST IT and record the result here.**
  Do not assume it inherits this.

**Render at the real aspect, not at content height.** The 23 Aug render came back
*"kinda a square"* because the frame took its height from its contents. **A phone
screen he is judging must be phone-shaped** — 380 wide with a realistic viewport
height, the nav where the nav is, the fold where the fold is. A layout judged at
the wrong aspect is judged against the wrong thing, which is the same error as
judging one against invented copy.

## After he answers

- Record each decision and its date in `CLAUDE.md`. A decision made twice was
  not recorded properly.
- Unblock the items and note which decision unblocked them.
- If an answer contradicts something already recorded, say so before acting —
  he may not have realised, or the record may be stale.

## Do not

- Ask what you can answer by reading the code.
- Ask a documentation question.
- Present an option you know to be bad to make another look good.
- Stop the loop waiting for an answer.
- Re-ask something already decided. Check the record first.
