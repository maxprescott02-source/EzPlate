# Independent commercial review — EzPlate

*Reviewer: GPT-6 Astra, via ChatGPT. Companion to
`BLIND-AUDIT-2026-09-05-brief-code.md`, which is a separate pass. This one is
not about the code.*

**Repository: https://github.com/maxprescott02-source/EzPlate — public.
Look at it if it helps you judge what actually exists. It is not the subject.**

You are being asked one question, and only one:

> **Is there a paying customer for this, and what is the fastest credible path to
> the first one before 31 October 2026?**

Answer it adversarially. "Yes, and here is the path" and "no, and here is why"
are both acceptable and useful. What is not acceptable is a balanced overview.

## The product

A plate- and menu-costing web app for small hospitality venues. Supplier invoices
go in as photos or uploads, prices are parsed out of them, and those prices flow
into the cost of each dish and each menu. The operator sees food cost and gross
profit per dish, and decides what to charge. Multi-tenant, roles and invitations,
online-only, works on phone and desktop.

It is built and running against a real venue's real invoices. It is not a mockup.

## The builder, stated plainly because it constrains every recommendation

- One person. Builds it himself, evenings and days off.
- Operations Manager at a single family café in Brisbane, Australia, roughly 26
  hours a week on the floor, doing costing, ordering and rostering during service
  with no dedicated admin time. The app came out of that job.
- Finance degree, August 2026. Not a funded founder. **No marketing budget, no
  sales team, no runway, no ability to hire.** Any recommendation with a spend
  attached should say what the spend is and why it beats not spending it.
- Time is the scarce input, not money and not skill. A plan requiring twenty
  hours a week is not a plan he can run.

## What is true and unflattering

- **Zero customers. Zero revenue. Zero users other than the venue it was built in.**
- There is **one prospect**: the manager of another local venue, willing to be
  shown it. He has not been shown it. That has been true since 15 August. The
  stated reason was a bug; the operative reason is closer to the cost of hearing
  no.
- Nobody has ever opened the app on a tablet, which is the form factor most
  kitchens actually have.
- The venue it was built for does not produce a P&L at all. Its owner has been
  shown the food-cost numbers repeatedly and ignores them. **That is one data
  point about how much operators of this size want this.**
- Food cost at that venue currently runs about 22% against a 30% industry
  reference, across roughly 28 dishes.
- The category is not empty: MarketMan, Craftable, xtraCHEF, meez, Nutritics and
  a long tail of spreadsheets are all in it.

## What I want from you

1. **A verdict in one sentence**, at the top, before any reasoning.
2. **Who the buyer is, concretely.** Not "small restaurants". A describable
   operator with a describable amount of pain, and what they use today instead.
   If your honest answer is that the buyer is a segment nobody can reach cheaply,
   say that, because it is the answer that changes what he does next.
3. **What it would have to cost**, and whether that number multiplied by a
   plausible number of venues is a business or a side income. He has an open
   question he cannot answer: *what revenue would make this worth doing for a
   living?* Take a position on it.
4. **The fastest credible path to one paying customer inside eight weeks**, given
   the constraints above. Concrete sequence, first action nameable today. If the
   honest path is "charge the one prospect fifty dollars and see", say so.
5. **The strongest argument that this should be abandoned**, made properly rather
   than as a caveat. He is a competent builder and has already said the next thing
   after this is another build, so the opportunity cost of continuing is real and
   should be priced.
6. **What the incumbents do that this does not**, and whether any of it is the
   reason a venue would pay one of them and not him.

## Rules of engagement

- Do not be encouraging. Encouragement is the one thing he can get anywhere.
- Do not recommend raising money, hiring, or a twelve-month roadmap.
- Do not produce a lean-canvas, a persona document, or a go-to-market framework.
  A framework is what you write when you do not have an opinion.
- Where you are guessing about the Australian small-hospitality market, say so
  explicitly and separate it from what you know.
- Assume the code works. A second reviewer is auditing that separately.
