# Independent code audit — EzPlate

You are the only reviewer this code will get. Be adversarial.

## What the app is

A plate- and menu-costing web app for a single small café. The owner
photographs or uploads supplier invoices, the app parses prices out of them,
and those prices flow through into the cost of each dish and each menu. The
owner then decides what to charge. **The numbers are real and they drive real
pricing decisions**, so a wrong figure that looks plausible is the worst
possible outcome — worse than a crash.

Supabase (Postgres) is the source of truth. The app is online-only. There is
one intermittent user, on a phone, who may go a week between uses.

## Fixed constraints — treat these as axioms, not as findings

These are settled product decisions. Do not recommend changing them, and do
not spend any of your report on them:

- **No build step.** The client is four hand-written files: `index.html`,
  `js/app.js`, `css/style.css`, `sw.js`. No bundler, no transpiler, no JSX.
- **No new dependencies.** Two third-party scripts ship, both pinned. Adding a
  third is out of scope. No TypeScript, no framework, no test-runner beyond
  what is already in `package.json`.
- **No analytics, no tracking.**
- `api/` is Vercel serverless Node. API keys live in env vars only.
- The repository is public.

"Rewrite it in X", "add types", "adopt a framework", "split app.js into
modules" are all known and rejected. A report containing them is a wasted
report.

## What you have

The full client, the serverless functions, the SQL migrations, and the entire
test suite. You do **not** have the project's internal rulebook, its backlog,
or its written history — that is deliberate. Everything you conclude must come
from the code in front of you.

## What I want

Defects, ranked by what they would actually cost. For each one:

1. **The claim** — one sentence.
2. **The failure scenario** — concrete inputs or sequence of events, and the
   wrong output or lost data that results. Not "this could be risky."
3. **Where** — file and line.
4. **Confidence** — and say plainly when you are guessing.

Weight your attention this way, highest first:

- **Silently wrong numbers.** A price, cost, or percentage that comes out
  wrong without anything erroring. This is the category that matters most.
- **Silent data loss.** A write that reports success and did not land; a
  restore or import that completes with rows present but not connected;
  anything that returns 200 and changed nothing.
- **State that survives when it should not**, or is discarded when it should
  not be — especially across offline/online transitions and re-syncs.
- **Auth and multi-tenancy.** The SQL is moving from one café to many. Can one
  tenant read or write another's rows? Can a non-owner change something only
  an owner should?
- **Test quality.** For every test file you assess, answer one question
  explicitly: *would this test fail if the behaviour it names were broken?*
  Name any test that would stay green against the defect it appears to exist
  to catch, and show why.

## Rules of engagement

- Read the code. Do not infer behaviour from a function's name or from a
  comment — several names and comments in this codebase are known to be
  misleading, and you are not being told which.
- Where a comment and the code disagree, the code is what runs. Report the
  disagreement as a finding in its own right.
- Do not pad. Ten real findings beat sixty with fifty maybes. If you are
  unsure whether something is a bug, say so and put it lower.
- If you conclude the code is sound in some area, say that too — a clean
  finding is information.

Start with `js/app.js` and `supabase/migrations/`. End with the test suite.
