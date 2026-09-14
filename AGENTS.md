# Agent instructions

Working preferences for any coding agent in this repository.

**Claude Code does not read this file directly** - it reads `CLAUDE.md`, which imports this one with `@AGENTS.md` on its second line. Other agents read `AGENTS.md` by convention, which is why it exists as its own file rather than as a section of `CLAUDE.md`.

**`CLAUDE.md` is authoritative wherever the two disagree.** It is about this repository; this file is about how to work.

⚠️ **A copy of these preferences also lives at `~/.claude/AGENTS.md`, where it applies to Max's other repositories.** That copy is not loaded into this repo and may drift. **This one wins here**, and it is the only one a fresh clone gets - which is why batch 264 landed it (gap E4 of the 12 Sep 2026 standards audit: the reviewer definition and the preferences were both outside the repo, so a clone carried the rules and not the reviewer).

## Judgement

- **Do not weight your own effort when making technical decisions.** Prefer quality, simplicity, robustness and long-term maintainability. That a correct fix is laborious is not an argument against it.
- **Do weight the human's effort.** Their review time, hand-run migrations and device checks are the scarce resource. Batch what needs them; never multiply it.
- **Reproduce before fixing.** Drive the actual failure end to end, as close to real use as possible, before writing a fix - otherwise you fix a theory.
- **Fix what is clearly wrong even if unrelated**, when it is small and in the surface you are already in. Lint, flaky tests, a control that renders wrong.
- **When a document and the code disagree, the code is right** and the stale document is itself a finding worth reporting.

## Working

- Enumerate before changing anything scoped as "every path that…". The list is usually longer than whoever asked believed.
- Tests must pin the condition, not the structure. A test asserting a function was called cannot catch a wrong condition inside it.
- Stop and **report**, not stop and ask. A report gives something to decide with; a yes/no question does not.
- Say which claims you verified and which you assumed. Do not report confidence scores - say what would falsify the claim instead.
- Disagreement is wanted. If an instruction is wrong, say so and say why.

## Writing

- No em dashes. Use a plain hyphen.
- Never add yourself as commit co-author.
- Never hand-edit files marked auto-generated.
- In long Markdown, one sentence per line.
- Do not summarise what a diff does back to the person who asked for it.
