---
paths:
  - "api/**"
---

# The server functions, and what may leave this app

Loaded whenever anything under `api/` is read.

**Moved out of `CLAUDE.md` verbatim by batch 264** so it loads with the file it protects instead of on every turn of every session. The rule in `CLAUDE.md` is the one-line version; this is the evidence.

⚠️ **Cross-references here were written before the split.** *"this file"*, *"Tier 1/2/3"* and *"the section above/below"* meant `CLAUDE.md` as it stood at 1,078 lines; the target is now `CLAUDE.md`, another file in `.claude/rules/`, or `docs/rules/process.md`. **The text is deliberately unedited - rewriting fifty pointers by hand is how a rule drifts from the one that was agreed.** Grep the phrase rather than following the direction.

## Server-side (`api/`)

Vercel zero-config Node serverless functions - the invoice AI second-reader and the Dashboard insight phrasing.
**This is not a build step** and does not touch the four client files.

- Files whose name starts with `_` (e.g. `api/_gemini.js`) are **ignored as routes** and hold pure, `require()`-able, unit-tested logic.
  Route handlers stay thin.
- **API keys live ONLY in Vercel env vars** (`GEMINI_API_KEY`) - never in the client, the repo, or logs.
- **Treat invoice text and any model output as untrusted data** - fence it, validate strictly.
  Never executed, never an instruction.
- **Money/number law:** an AI helper may only PHRASE numbers the app already computed deterministically.
  It never produces a figure.
  Server *and* client reject a phrasing containing a number not in the supplied facts.

## The privacy gate - before EzPlate serves anyone but Scoopy's

`api/parse-invoice` sends invoice text to Google's Gemini free tier, which **may use prompts for training**; `api/insight` sends plate names and costing numbers to the same tier.
**Max has accepted this for his own café only** - his call, made.

**BEFORE any multi-tenant customer's data flows through those endpoints or any future one that ships user data to a third-party model, revisit:** a paid-tier project that excludes training use, or a privacy-policy disclosure.
This is the single most important thing to reopen before EzPlate is used by anyone else.

✅ **THE DISCLOSURE SHIPPED ON 27 AUG 2026 as `ezplate-v171`, and Max approved the wording that day.** The notice names Google, the free Gemini tier, that submissions may be used to improve Google's products including training, and that human reviewers may read them. It is accepted at sign-up before an account exists, readable from the signed-out gate, restated at both invoice dropzones, and linked from the Settings toggle.
**So the gate below is DISCHARGED for the free tier as it stands** — a stranger is now told what leaves before it leaves. It is not deleted, because the paragraph is a standing precondition on a CLASS of work: **any future endpoint that ships user data to a third-party model reopens it**, and the notice has to grow to cover that endpoint before it ships.
⚠️ **What is NOT built is an acceptance RECORD.** The tick gates the form and is never persisted, so nothing knows who accepted which version. That is filed in `docs/MAINTENANCE.md` and it becomes B the moment the paid-tier item ships, because that reverses the notice in the user's favour and there is no way to re-ask anyone who accepted the old wording.

⚠️ **AND ON 14 AUG 2026 MAX SET A DATE ON IT WITHOUT NAMING ONE, which is why this paragraph now has teeth it did not have yesterday.**

**He chose SELF-SERVICE SIGNUP** - a stranger creates an account and names their own café, unattended - **reversing his own "a self-service sign-up form is still NO" call of the same day.** He was told in writing that it was a reversal, and told that it makes this gate urgent, and chose it anyway. So it is a decision, not an oversight, and it may not be re-litigated. (`docs/decisions/2026-08-14-cafe-creation.md`, question 1, answer B.)

**What that changes here: the trigger for this gate has FIRED.** Self-service signup shipped as `ezplate-v178` on 30 Aug 2026, so a stranger's café can exist, and *"before the first non-Scoopy's row exists, not after"* is this section's own wording - a standing precondition on a CLASS of work, which is why it belongs here and never expires.
The ordering it implied was honoured: the disclosure shipped as `v171` on 27 Aug, three days ahead of signup.
⚠️ **THE SENTENCE HERE USED TO POINT AT A `Do after:` LINE IN `docs/QUEUE.md`, AND THAT LINE IS GONE — CORRECTLY.** The queue deleted it the moment it was satisfied, which is the mechanism working; what rotted is the POINTER AT the mechanism, in a paragraph whose own parenthetical had predicted exactly that (*"the copy here rots with nothing able to notice"*). **So the rule survives one level up: do not restate a queue ordering here, and do not point at one either — a pointer at a self-deleting line is itself a claim that expires.** (Corrected 2 Sep 2026 by AUDIT-v186 C4, which found both the dead pointer and the future tense above.)
**Do not read the reversal as permission to ship signup first.** He reversed which mechanism creates a café; he did not reverse this.

**He also chose CSV-ONLY for the catalogue importer** (same file, question 2, answer A), which is a decision about the no-new-dependencies rule rather than about privacy: an `.xlsx` is a ZIP of XML and cannot be read without a third third-party script. **So the importer accepts CSV and says so; adding XLSX is a fresh yes, not an enhancement.**
