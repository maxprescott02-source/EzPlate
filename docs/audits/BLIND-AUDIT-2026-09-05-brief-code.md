# Independent code audit — EzPlate

*Second blind audit. The first was 22 Aug 2026 (`BLIND-AUDIT-2026-08-22-code.md`).
Reviewer: GPT-6 Astra, via ChatGPT, reading the public repository directly.*

**Repository: https://github.com/maxprescott02-source/EzPlate — public, branch `main`.
Read it. Do not ask for files to be pasted.**

You are the only reviewer this code will get. Be adversarial.

## What the app is

A plate- and menu-costing web app for small cafés. The operator photographs or
uploads supplier invoices, the app parses prices out of them, and those prices
flow through into the cost of each dish and each menu. The operator then decides
what to charge. **The numbers are real and they drive real pricing decisions**,
so a wrong figure that looks plausible is the worst possible outcome, worse than
a crash.

Supabase (Postgres) is the source of truth. The app is online-only. Today there
is one intermittent user, on a phone, who may go a week between uses. The SQL and
the auth layer have since been moved toward many cafés.

## Fixed constraints — treat these as axioms, not as findings

These are settled product decisions. Do not recommend changing them, and do not
spend any of your report on them:

- **No build step.** The client is four hand-written files: `index.html`,
  `js/app.js`, `css/style.css`, `sw.js`. No bundler, no transpiler, no JSX.
- **No new dependencies.** Two third-party scripts ship, both pinned. Adding a
  third is out of scope. No TypeScript, no framework, no test runner beyond what
  is already in `package.json`.
- **No analytics, no tracking.**
- `api/` is Vercel serverless Node. API keys live in env vars only.
- The repository is public.

"Rewrite it in X", "add types", "adopt a framework", "split `app.js` into modules"
are all known and rejected. A report containing them is a wasted report.

## What is new since the last audit, and what that means for you

Between 22 Aug and 5 Sep the following landed. It is the least-reviewed code in
the repository and it is where you should expect to find the most:

- **Multi-tenancy.** `business-id`, tenant gating, a non-member boot gate.
  The SQL moved from one café to many.
- **Roles and invitations.** Owner / member separation, client-side role checks,
  an invitations flow.
- **The insight layer.** `api/_insight.js` and `api/insight.js`, plus insight
  families that publish a subject and a validator that requires it.
- **A UI conversion phase that is finished**, followed by a UI audit whose
  Phase 2 is part-shipped. Presentation only. **Cosmetic UI findings are the
  lowest-value thing you can give me — that audit already exists. Do not repeat it.**

## What I want

Defects, ranked by what they would actually cost. For each one:

1. **The claim** — one sentence.
2. **The failure scenario** — concrete inputs or a sequence of events, and the
   wrong output or lost data that results. Not "this could be risky."
3. **Where** — file and line.
4. **Confidence** — and say plainly when you are guessing.

Weight your attention this way, highest first:

- **Silently wrong numbers.** A price, cost, or percentage that comes out wrong
  without anything erroring. This is the category that matters most.
- **Auth and multi-tenancy.** Can one tenant read or write another's rows? Can a
  non-owner change something only an owner should? Can an invitation be replayed,
  escalated, or accepted into the wrong business? Is any tenant check enforced
  **only** on the client?
- **Silent data loss.** A write that reports success and did not land; a restore
  or import that completes with rows present but not connected; anything that
  returns 200 and changed nothing.
- **State that survives when it should not**, or is discarded when it should not
  be, especially across offline/online transitions and re-syncs.
- **Test quality.** The suite is large (~130 files) and it is the thing I trust
  most, which makes a green test that cannot fail the most expensive defect here.
  For every test file you assess, answer one question explicitly: *would this test
  fail if the behaviour it names were broken?* Name any test that would stay green
  against the defect it appears to exist to catch, and show why.

## Rules of engagement

- Read the code. Do not infer behaviour from a function's name or from a comment.
  Several names and comments in this codebase are known to be misleading, and you
  are not being told which.
- Where a comment and the code disagree, the code is what runs. Report the
  disagreement as a finding in its own right.
- **`CLAUDE.md`, `docs/QUEUE.md`, `docs/MAINTENANCE.md` and `docs/handovers/` are
  the project's own internal rulebook and history. Do not read them.** Everything
  you conclude must come from the shipping code, the SQL and the tests. If a
  finding is already known and documented, I would rather hear it twice than have
  you calibrated by our own account of ourselves.
- Do not pad. Ten real findings beat sixty with fifty maybes. If you are unsure
  whether something is a bug, say so and put it lower.
- If you conclude the code is sound in some area, say that too. A clean finding
  is information.

Start with `js/app.js` and `supabase/migrations/`. Then `api/`. End with `tests/`.
